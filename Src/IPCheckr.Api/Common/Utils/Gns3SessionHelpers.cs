using System.Net.Sockets;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.RegularExpressions;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Gns3;
using IPCheckr.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;

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

            var host = await db.AppSettings
                .Where(a => a.Name == "Gns3_RemoteServer")
                .Select(a => a.Value)
                .FirstOrDefaultAsync(ct)
                ?? config["Gns3:LauncherHost"]
                ?? "127.0.0.1";

            var portStr = await db.AppSettings
                .Where(a => a.Name == "Gns3_RemotePort")
                .Select(a => a.Value)
                .FirstOrDefaultAsync(ct)
                ?? config["Gns3:LauncherPort"];

            var port = int.TryParse(portStr, out var p) ? p : 6769;
            var timeoutSec = int.TryParse(config["Gns3:LauncherTimeoutSeconds"], out var t) ? t : 5;
            var retries = int.TryParse(config["Gns3:LauncherRetries"], out var r) ? r : 2;

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

                    await using var stream = client.GetStream();
                    using var writer = new StreamWriter(stream, Encoding.UTF8, leaveOpen: true) { AutoFlush = true };
                    using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);

                    await writer.WriteLineAsync(command);
                    var line = await reader.ReadLineAsync();

                    var (success, parsedPort, parsedPid) = ParseLauncherResponse(line);
                    return new LauncherResult(success, parsedPort, parsedPid, line ?? string.Empty);
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

        public record LauncherResult(bool Success, int? Port, int? Pid, string Response);
    }
}