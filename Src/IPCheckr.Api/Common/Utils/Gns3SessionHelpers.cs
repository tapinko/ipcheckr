using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.RegularExpressions;
using IPCheckr.Api.DTOs.Gns3;
using IPCheckr.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace IPCheckr.Api.Common.Utils
{
    public static class Gns3SessionHelpers
    {
        private const string RateCachePrefix = "gns3-rate-";

        public static bool IsClientCertificateAllowed(HttpContext httpContext)
        {
            var config = httpContext.RequestServices.GetRequiredService<IConfiguration>();
            var requireClientCert = config.GetValue("Gns3:RequireClientCertificate", false);

            if (!requireClientCert)
                return true;

            var cert = httpContext.Connection.ClientCertificate;
            if (cert == null)
                return false;

            var allowedCn = config["Gns3:AllowedClientCn"];
            var allowedThumbprints = (config.GetSection("Gns3:AllowedClientThumbprints").Get<string[]>() ?? Array.Empty<string>())
                .Select(t => t?.Replace(":", string.Empty, StringComparison.OrdinalIgnoreCase))
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .ToArray();

            var cnOk = !string.IsNullOrWhiteSpace(allowedCn) &&
                       string.Equals(cert.GetNameInfo(X509NameType.SimpleName, false), allowedCn, StringComparison.OrdinalIgnoreCase);

            var thumbprint = cert.Thumbprint?.Replace(":", string.Empty, StringComparison.OrdinalIgnoreCase);
            var thumbOk = thumbprint != null && allowedThumbprints.Any(t => string.Equals(t, thumbprint, StringComparison.OrdinalIgnoreCase));

            return cnOk || thumbOk;
        }

        public static bool IsRateLimited(HttpContext httpContext, int userId)
        {
            var cache = httpContext.RequestServices.GetRequiredService<IMemoryCache>();
            var key = $"{RateCachePrefix}{userId}";
            var now = DateTimeOffset.UtcNow;
            var limit = 5;
            var window = TimeSpan.FromMinutes(1);

            if (!cache.TryGetValue(key, out (int Count, DateTimeOffset WindowStart) entry))
            {
                cache.Set(key, (1, now), now.Add(window));
                return false;
            }

            if (now - entry.WindowStart > window)
            {
                cache.Set(key, (1, now), now.Add(window));
                return false;
            }

            var updated = (Count: entry.Count + 1, WindowStart: entry.WindowStart);
            cache.Set(key, updated, entry.WindowStart.Add(window));
            return updated.Count > limit;
        }

        public static bool IsUsernameValid(string username)
        {
            var regex = new Regex("^[A-Za-z0-9._-]{3,64}(@[A-Za-z0-9.-]+)?$", RegexOptions.Compiled | RegexOptions.CultureInvariant);
            return regex.IsMatch(username ?? string.Empty);
        }

        public static Gns3SessionBase ToResponse(Gns3Session session, string username)
        {
            return new Gns3SessionBase
            {
                UserId = session.UserId,
                Username = username,
                Status = session.Status,
                Port = session.Port,
                SessionStart = session.SessionStart,
                SessionEnd = session.SessionEnd,
                ErrorMessage = session.ErrorMessage,
                Pid = session.Pid,
                Duration = session.Duration,
                ExtendedDuration = session.ExtendedDuration
            };
        }

        public static async Task<LauncherResult> SendCommandToLauncherAsync(HttpContext httpContext, string command, CancellationToken ct)
        {
            var config = httpContext.RequestServices.GetRequiredService<IConfiguration>();
            var db = httpContext.RequestServices.GetRequiredService<ApiDbContext>();

            var host = config["Gns3:LauncherHost"]
                ?? await db.AppSettings
                    .Where(a => a.Name == "Gns3_RemoteServer")
                    .Select(a => a.Value)
                    .FirstOrDefaultAsync(ct)
                ?? "127.0.0.1";

            var portStr = config["Gns3:LauncherPort"]
                ?? await db.AppSettings
                    .Where(a => a.Name == "Gns3_RemotePort")
                    .Select(a => a.Value)
                    .FirstOrDefaultAsync(ct);

            var port = int.TryParse(portStr, out var p) ? p : 6769;
            var timeoutSec = int.TryParse(config["Gns3:LauncherTimeoutSeconds"], out var t) ? t : 5;
            var retries = int.TryParse(config["Gns3:LauncherRetries"], out var r) ? r : 2;
            var useTls = config.GetValue("Gns3:UseTls", true);
            var caPath = config["Gns3:LauncherCaPath"] ?? "/etc/ipcheckr/gns3/ca.crt";
            var serverName = config["Gns3:LauncherServerName"] ?? host;
            var allowNameMismatch = config.GetValue("Gns3:LauncherAllowNameMismatch", false);

            Exception? last = null;
            string? lastMessage = null;
            for (var attempt = 0; attempt <= retries; attempt++)
            {
                try
                {
                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    cts.CancelAfter(TimeSpan.FromSeconds(timeoutSec));

                    using var client = new TcpClient();
                    await client.ConnectAsync(host, port, cts.Token);

                    Stream stream = client.GetStream();
                    if (useTls)
                    {
                        var sslStream = new SslStream(stream, leaveInnerStreamOpen: false, (sender, cert, chain, errors) =>
                            ValidateServerCertificate(cert, caPath, serverName, allowNameMismatch));

                        var authOptions = new SslClientAuthenticationOptions
                        {
                            TargetHost = serverName,
                            EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13,
                            CertificateRevocationCheckMode = X509RevocationMode.NoCheck
                        };

                        await sslStream.AuthenticateAsClientAsync(authOptions, cts.Token);
                        stream = sslStream;
                    }

                    using var writer = new StreamWriter(stream, Encoding.UTF8, leaveOpen: true) { AutoFlush = true };
                    using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);

                    await writer.WriteLineAsync(command);
                    var line = await reader.ReadLineAsync();

                    var (success, parsedPort, parsedPid) = ParseLauncherResponse(line);
                    return new LauncherResult(success, parsedPort, parsedPid, line ?? string.Empty);
                }
                catch (AuthenticationException ex)
                {
                    last = ex;
                    lastMessage = $"TLS handshake failed: {ex.Message}";
                    if (attempt >= retries)
                        break;
                    await Task.Delay(TimeSpan.FromMilliseconds(200), ct);
                }
                catch (Exception ex)
                {
                    last = ex;
                    if (ex is SocketException)
                        lastMessage = $"Connect to {host}:{port} failed: {ex.Message}";
                    else
                        lastMessage = ex.Message;
                    if (attempt >= retries)
                        break;
                    await Task.Delay(TimeSpan.FromMilliseconds(200), ct);
                }
            }

            return new LauncherResult(false, null, null, lastMessage ?? last?.Message ?? "Unknown launcher error");
        }

        private static (bool Success, int? Port, int? Pid) ParseLauncherResponse(string? line)
        {
            if (string.IsNullOrWhiteSpace(line))
                return (false, null, null);

            var success = line.StartsWith("OK", StringComparison.OrdinalIgnoreCase);
            var portMatch = Regex.Match(line, "(?<port>\\d{2,5})");
            int? port = portMatch.Success && int.TryParse(portMatch.Groups["port"].Value, out var p) ? p : null;
            var pidMatch = Regex.Match(line, "PID=(?<pid>\\d+)", RegexOptions.IgnoreCase);
            int? pid = pidMatch.Success && int.TryParse(pidMatch.Groups["pid"].Value, out var pidVal) ? pidVal : null;
            return (success, port, pid);
        }

        private static bool ValidateServerCertificate(X509Certificate? certificate, string? caPath, string expectedName, bool allowNameMismatch)
        {
            if (certificate == null)
                return false;

            var serverCert = new X509Certificate2(certificate);

            using var chain = new X509Chain
            {
                ChainPolicy =
                {
                    RevocationMode = X509RevocationMode.NoCheck,
                    VerificationFlags = X509VerificationFlags.IgnoreEndRevocationUnknown | X509VerificationFlags.IgnoreCertificateAuthorityRevocationUnknown
                }
            };

            if (!string.IsNullOrWhiteSpace(caPath) && File.Exists(caPath))
            {
                try
                {
                    var caCert = new X509Certificate2(caPath);
                    chain.ChainPolicy.TrustMode = X509ChainTrustMode.CustomRootTrust;
                    chain.ChainPolicy.CustomTrustStore.Add(caCert);
                }
                catch
                {
                    return false;
                }
            }

            var chainOk = chain.Build(serverCert);
            if (!chainOk)
                return false;

            if (allowNameMismatch)
                return true;

            return CertificateNameMatches(serverCert, expectedName);
        }

        private static bool CertificateNameMatches(X509Certificate2 cert, string expected)
        {
            if (string.IsNullOrWhiteSpace(expected))
                return true;

            if (IPAddress.TryParse(expected, out var expectedIp))
            {
                var sanIps = GetSubjectAltNames(cert).IpAddresses;
                return sanIps.Any(ip => ip.Equals(expectedIp));
            }

            var sanNames = GetSubjectAltNames(cert).DnsNames;
            if (sanNames.Any(n => string.Equals(n, expected, StringComparison.OrdinalIgnoreCase)))
                return true;

            var dnsName = cert.GetNameInfo(X509NameType.DnsName, false);
            return !string.IsNullOrWhiteSpace(dnsName) && string.Equals(dnsName, expected, StringComparison.OrdinalIgnoreCase);
        }

        private static (string[] DnsNames, IPAddress[] IpAddresses) GetSubjectAltNames(X509Certificate2 cert)
        {
            try
            {
                var ext = cert.Extensions["2.5.29.17"];
                if (ext == null)
                    return (Array.Empty<string>(), Array.Empty<IPAddress>());

                var formatted = ext.Format(false);
                var parts = formatted.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                var dns = new List<string>();
                var ips = new List<IPAddress>();

                foreach (var part in parts)
                {
                    if (part.StartsWith("DNS Name=", StringComparison.OrdinalIgnoreCase))
                    {
                        dns.Add(part.Substring("DNS Name=".Length));
                    }
                    else if (part.StartsWith("IP Address=", StringComparison.OrdinalIgnoreCase))
                    {
                        var raw = part.Substring("IP Address=".Length);
                        if (IPAddress.TryParse(raw, out var ip))
                            ips.Add(ip);
                    }
                }

                return (dns.ToArray(), ips.ToArray());
            }
            catch
            {
                return (Array.Empty<string>(), Array.Empty<IPAddress>());
            }
        }

        public record LauncherResult(bool Success, int? Port, int? Pid, string Response);
    }
}