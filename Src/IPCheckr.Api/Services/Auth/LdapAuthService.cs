using System.DirectoryServices.Protocols;
using System.Net;
using System.Text;
using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Config;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using IPCheckr.Api.Services.Config;

namespace IPCheckr.Api.Services.Auth
{
    public interface ILdapAuthService
    {
        Task<LdapAuthResult> AuthenticateAsync(string username, string password, CancellationToken ct = default);
    }

    public class LdapAuthResult
    {
        public bool Succeeded { get; init; }
        public string? NormalizedUsername { get; init; }
        public IList<string> Roles { get; init; } = new List<string>();
        public string? FailureReason { get; init; }
    }

    public class LdapAuthService : ILdapAuthService
    {
        private readonly ILdapSettingsProvider _settingsProvider;
        private readonly ILogger<LdapAuthService> _logger;

        public LdapAuthService(IOptions<LdapSettings> options, ILdapSettingsProvider settingsProvider, ILogger<LdapAuthService> logger)
        {
            _settingsProvider = settingsProvider;
            _logger = logger;
        }

        public async Task<LdapAuthResult> AuthenticateAsync(string username, string password, CancellationToken ct = default)
        {
            var _settings = await _settingsProvider.GetCurrentAsync(ct);
            if (!_settings.Enabled)
                return new LdapAuthResult { Succeeded = false, FailureReason = "LDAP disabled" };

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
                return new LdapAuthResult { Succeeded = false, FailureReason = "Missing credentials" };

            try
            {
                return await Task.Run(() => AuthenticateInternal(username, password, _settings), ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "LDAP auth failed for {Username}", username);
                return new LdapAuthResult { Succeeded = false, FailureReason = ex.Message };
            }
        }

        private LdapAuthResult AuthenticateInternal(string username, string password, LdapSettings _settings)
        {
            // Use fullyQualifiedDnsHostName=false to avoid extra reverse DNS validation which sometimes breaks with internal CA names.
            var identifier = new LdapDirectoryIdentifier(_settings.Host, _settings.Port, false, false);
            using var connection = new LdapConnection(identifier)
            {
                SessionOptions =
                {
                    ProtocolVersion = 3
                }
            };

            connection.AuthType = AuthType.Basic;

            if (!_settings.ValidateServerCertificate)
                connection.SessionOptions.VerifyServerCertificate += (_, _) => true;

            if (_settings.UseSsl)
            {
                _logger.LogInformation("LDAP auth: enabling LDAPS before bind");
                connection.SessionOptions.SecureSocketLayer = true;
            }

            if (_settings.StartTls)
                connection.SessionOptions.StartTransportLayerSecurity(null);

            if (_settings.ConnectTimeoutSeconds > 0)
                connection.Timeout = TimeSpan.FromSeconds(_settings.ConnectTimeoutSeconds);

            var candidates = BuildCandidateCredentials(username, password, _settings);
            LdapException? lastInvalidCredEx = null;
            var bound = false;
            _logger.LogInformation("LDAP auth: attempting bind. Host={Host} Port={Port} UseSsl={UseSsl} StartTls={StartTls} ValidateCert={ValidateCert} Candidates={CandidateCount}",
                _settings.Host, _settings.Port, _settings.UseSsl, _settings.StartTls, _settings.ValidateServerCertificate, candidates.Count);
            foreach (var cred in candidates)
            {
                try
                {
                    _logger.LogDebug("LDAP auth bind attempt with credential UserName={UserName}", cred.UserName);
                    connection.Bind(cred);
                    bound = true;
                    _logger.LogInformation("LDAP auth bind succeeded with UserName={UserName}", cred.UserName);
                    break;
                }
                catch (LdapException lex) when (lex.ErrorCode == (int)ResultCode.StrongAuthRequired && !_settings.UseSsl && !_settings.StartTls)
                {
                    _logger.LogInformation("LDAP server requires strong auth. Attempting StartTLS fallback before re-binding."); // the worst error :sob:
                    try
                    {
                        if (!_settings.ValidateServerCertificate)
                        {
                            connection.SessionOptions.VerifyServerCertificate += (_, _) => true;
                        }
                        connection.SessionOptions.StartTransportLayerSecurity(null);
                        _logger.LogInformation("StartTLS initiated. Retrying bind for UserName={UserName}", cred.UserName);
                        connection.Bind(cred);
                        bound = true;
                        _logger.LogInformation("LDAP auth bind succeeded after StartTLS with UserName={UserName}", cred.UserName);
                        break;
                    }
                    catch (LdapException innerLex) when (innerLex.ErrorCode == 49)
                    {
                        lastInvalidCredEx = innerLex;
                        _logger.LogDebug("LDAP auth invalid credentials after StartTLS attempt UserName={UserName} Code={Code} ServerMsg={ServerMsg}", cred.UserName, innerLex.ErrorCode, innerLex.ServerErrorMessage);
                        continue; // try next candidate
                    }
                }
                catch (LdapException lex) when (lex.ErrorCode == 49)
                {
                    lastInvalidCredEx = lex;
                    _logger.LogDebug("LDAP auth invalid credentials UserName={UserName} Code={Code} ServerMsg={ServerMsg}", cred.UserName, lex.ErrorCode, lex.ServerErrorMessage);
                    continue; // try next candidate as well
                }
                catch (LdapException lex)
                {
                    _logger.LogWarning(lex, "LDAP auth bind error UserName={UserName} Code={Code} ServerMsg={ServerMsg}", cred.UserName, lex.ErrorCode, lex.ServerErrorMessage);
                    LogTcpDiagnostics(_settings.Host, _settings.Port);
                    LogSslHandshakeAttempt(_settings.Host, _settings.Port);
                    throw; // non-credential related error
                }
            }

            if (!bound)
            {
                var reason = lastInvalidCredEx != null
                    ? ($"Invalid username/password or domain/UPN mismatch (Code={lastInvalidCredEx.ErrorCode} Msg={lastInvalidCredEx.ServerErrorMessage})")
                    : "Bind failed (no credential candidates succeeded)";
                return new LdapAuthResult { Succeeded = false, FailureReason = reason };
            }

            var (userDn, normUser) = ResolveUserDnAndCanonicalUsername(connection, username, _settings);

            var roles = new List<string>();
            try
            {
                var groups = GetUserGroups(connection, userDn, _settings);
                var groupsList = string.Join("; ", groups);
                var cfgTeacher = string.IsNullOrWhiteSpace(_settings.TeacherGroupDn) ? null : NormalizeDn(_settings.TeacherGroupDn!);
                var cfgStudent = string.IsNullOrWhiteSpace(_settings.StudentGroupDn) ? null : NormalizeDn(_settings.StudentGroupDn!);

                if (!string.IsNullOrWhiteSpace(cfgTeacher) && groups.Contains(cfgTeacher))
                    roles.Add(Roles.Teacher);

                if (!string.IsNullOrWhiteSpace(cfgStudent) && groups.Contains(cfgStudent))
                    roles.Add(Roles.Student);
            }
            catch (LdapException lex)
            {
                _logger.LogWarning(lex, "Group lookup LDAP error for {UserDn} Code={Code} ServerMsg={ServerMsg}", userDn, lex.ErrorCode, lex.ServerErrorMessage);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Group lookup failed for {UserDn}", userDn);
            }

            if (roles.Count == 0)
            {
                roles.Add(Roles.Student);
                _logger.LogWarning("Role defaulted to: Student");
            }

            _logger.LogInformation("LDAP auth success for {NormUser} Roles=[{Roles}]", normUser ?? username, string.Join(", ", roles));

            return new LdapAuthResult
            {
                Succeeded = true,
                NormalizedUsername = normUser ?? username,
                Roles = roles
            };
        }

        /// <summary>
        /// Builds a list of candidate credentials to try for binding, based on the configured bind mode and domain.
        /// If the user input appears to already be in UPN or DOMAIN\user format, it is tried first.
        /// The raw input is always added as a last resort.
        /// </summary>
        /// <param name="username"></param>
        /// <param name="password"></param>
        /// <param name="_settings"></param>
        /// <returns></returns>
        /// <exception cref="InvalidOperationException"></exception>
        private List<NetworkCredential> BuildCandidateCredentials(string username, string password, LdapSettings _settings)
        {
            var list = new List<NetworkCredential>();
            var mode = (_settings.BindMode ?? "UpnOrDomain").Trim();

            var input = (username ?? string.Empty).Trim();

            if (string.Equals(mode, "DistinguishedNameTemplate", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(_settings.UserDnTemplate))
                    throw new InvalidOperationException("UserDnTemplate must be set for DistinguishedNameTemplate bind mode.");
                var dn = string.Format(_settings.UserDnTemplate, EscapeDnValue(input));
                list.Add(new NetworkCredential(dn, password));
                return list;
            }

            if (input.Contains('@') || input.Contains('\\'))
            {
                list.Add(new NetworkCredential(input, password));
            }

            if (!string.IsNullOrWhiteSpace(_settings.Domain))
            {
                var dom = _settings.Domain.Trim();
                list.Add(new NetworkCredential(input + "@" + dom, password));

                var netbios = dom.Contains('.') ? dom.Split('.')[0] : dom;
                if (!string.IsNullOrWhiteSpace(netbios))
                {
                    list.Add(new NetworkCredential($"{netbios}\\{input}", password));
                }
            }

            if (!list.Any(c => string.Equals(c.UserName, input, StringComparison.OrdinalIgnoreCase)))
            {
                list.Add(new NetworkCredential(input, password));
            }

            return list;
        }

        /// <summary>
        /// Resolves the user's distinguished name (DN) and a canonical username by searching the LDAP directory.
        /// If a DN template is configured, it is used directly. Otherwise, a search is performed under the configured search base.
        /// If no search base is set, the input username is returned as-is.
        /// </summary>
        /// <param name="connection"></param>
        /// <param name="inputUsername"></param>
        /// <param name="_settings"></param>
        /// <returns></returns>
        private (string userDn, string? normalizedUsername) ResolveUserDnAndCanonicalUsername(LdapConnection connection, string inputUsername, LdapSettings _settings)
        {
            var mode = (_settings.BindMode ?? "UpnOrDomain").Trim();
            if (string.Equals(mode, "DistinguishedNameTemplate", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(_settings.UserDnTemplate))
            {
                var dn = string.Format(_settings.UserDnTemplate, EscapeDnValue(inputUsername));
                return (dn, inputUsername);
            }

            if (string.IsNullOrWhiteSpace(_settings.SearchBase))
            {
                return (inputUsername, inputUsername);
            }

            string provided = (inputUsername ?? string.Empty).Trim();
            string shortName = provided;
            // extract short username from DOMAIN\user or user@domain formats
            if (provided.Contains('\\')) shortName = provided.Split('\\', 2)[1];
            if (shortName.Contains('@')) shortName = shortName.Split('@', 2)[0];

            string? upnCandidate = null;
            if (provided.Contains('@')) upnCandidate = provided;
            else if (!string.IsNullOrWhiteSpace(_settings.Domain)) upnCandidate = shortName + "@" + _settings.Domain.Trim();

            var candidates = new List<(string attr, string value)>();
            var userAttr = (_settings.UsernameAttribute ?? "sAMAccountName").Trim();

            if (!string.IsNullOrWhiteSpace(userAttr))
            {
                string primaryVal = userAttr.Equals("userPrincipalName", StringComparison.OrdinalIgnoreCase)
                    ? (upnCandidate ?? provided)
                    : shortName;
                candidates.Add((userAttr, primaryVal));
            }

            if (!string.IsNullOrWhiteSpace(upnCandidate)) candidates.Add(("userPrincipalName", upnCandidate));
            candidates.Add(("sAMAccountName", shortName));
            candidates.Add(("uid", shortName));

            foreach (var (attr, value) in candidates)
            {
                var escapedVal = EscapeLdapFilterValue(value);
                var filter = $"({attr}={escapedVal})";
                var req = new SearchRequest(_settings.SearchBase, filter, SearchScope.Subtree, new[] { "distinguishedName", attr });
                var res = (SearchResponse)connection.SendRequest(req);
                var entry = res.Entries.Cast<SearchResultEntry>().FirstOrDefault();
                if (entry != null)
                {
                    var distinguishedName = entry.DistinguishedName;
                    var normUser = entry.Attributes[attr]?.GetValues(typeof(string))?.Cast<string>().FirstOrDefault() ?? value;
                    return (distinguishedName, normUser);
                }
            }

            return (inputUsername ?? string.Empty, inputUsername);
        }

        private ISet<string> GetUserGroups(LdapConnection connection, string userDn, LdapSettings _settings)
        {
            var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (string.IsNullOrWhiteSpace(userDn)) return result;

            var attrs = new[] { _settings.GroupMembershipAttribute };
            var req = new SearchRequest(userDn, "(objectClass=*)", SearchScope.Base, attrs);
            var res = (SearchResponse)connection.SendRequest(req);
            var entry = res.Entries.Cast<SearchResultEntry>().FirstOrDefault();
            if (entry == null) return result;

            var attr = entry.Attributes[_settings.GroupMembershipAttribute];
            if (attr == null) return result;

            foreach (var v in attr.GetValues(typeof(string)).Cast<string>())
            {
                result.Add(NormalizeDn(v));
            }
            return result;
        }

        private static string NormalizeDn(string dn)
        {
            if (string.IsNullOrWhiteSpace(dn)) return string.Empty;
            var parts = dn.Split(',').Select(p => p.Trim()).Where(p => p.Length > 0).Select(p =>
            {
                var idx = p.IndexOf('=');
                if (idx <= 0) return p.ToLowerInvariant();
                var key = p.Substring(0, idx).Trim().ToLowerInvariant();
                var val = p.Substring(idx + 1).Trim().ToLowerInvariant();
                return key + "=" + val;
            });
            return string.Join(",", parts);
        }

        private static string EscapeLdapFilterValue(string value)
        {
            var sb = new StringBuilder();
            foreach (var c in value)
            {
                switch (c)
                {
                    case '\\': sb.Append("\\5c"); break;
                    case '*': sb.Append("\\2a"); break;
                    case '(': sb.Append("\\28"); break;
                    case ')': sb.Append("\\29"); break;
                    case '\0': sb.Append("\\00"); break;
                    default: sb.Append(c); break;
                }
            }
            return sb.ToString();
        }

        private static string EscapeDnValue(string value)
        {
            var sb = new StringBuilder();
            foreach (var c in value)
            {
                switch (c)
                {
                    case ',':
                    case '+':
                    case '"':
                    case '\\':
                    case '<':
                    case '>':
                    case ';':
                        sb.Append('\\').Append(c);
                        break;
                    default:
                        sb.Append(c);
                        break;
                }
            }
            return sb.ToString();
        }

        private void LogTcpDiagnostics(string host, int port)
        {
            try
            {
                using var client = new System.Net.Sockets.TcpClient();
                var sw = System.Diagnostics.Stopwatch.StartNew();
                var connectTask = client.ConnectAsync(host, port);
                if (!connectTask.Wait(TimeSpan.FromSeconds(5)))
                {
                    _logger.LogWarning("LDAP diag: TCP connect timeout after 5s host={Host} port={Port}", host, port);
                    return;
                }
                sw.Stop();
                if (client.Connected)
                {
                    _logger.LogInformation("LDAP diag: TCP connected host={Host} port={Port} latency={LatencyMs}ms local={Local} remote={Remote}", host, port, sw.ElapsedMilliseconds, client.Client.LocalEndPoint, client.Client.RemoteEndPoint);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "LDAP diag: TCP connect failed host={Host} port={Port}", host, port);
            }
        }

        private void LogSslHandshakeAttempt(string host, int port)
        {
            try
            {
                using var client = new System.Net.Sockets.TcpClient();
                var connectTask = client.ConnectAsync(host, port);
                if (!connectTask.Wait(TimeSpan.FromSeconds(5)) || !client.Connected)
                {
                    _logger.LogWarning("LDAP diag: cannot initiate SSL handshake (no TCP connection) host={Host} port={Port}", host, port);
                    return;
                }
                using var ssl = new System.Net.Security.SslStream(client.GetStream(), false, (sender, cert, chain, errors) => {
                    _logger.LogInformation("LDAP diag: SSL cert subject={Subject} issuer={Issuer} errors={Errors}", cert?.Subject, cert?.Issuer, errors);
                    if (chain != null)
                    {
                        for (int i = 0; i < chain.ChainElements.Count; i++)
                        {
                            var ce = chain.ChainElements[i];
                            _logger.LogInformation("LDAP diag: chain[{Index}] subject={Subject} issuer={Issuer} status={Status}", i, ce.Certificate.Subject, ce.Certificate.Issuer, string.Join(";", ce.ChainElementStatus.Select(s => s.StatusInformation.Trim())));
                        }
                    }
                    return true; // allow handshake to proceed for diagnostics
                });
                var authTask = ssl.AuthenticateAsClientAsync(host);
                if (!authTask.Wait(TimeSpan.FromSeconds(8)))
                {
                    _logger.LogWarning("LDAP diag: SSL handshake timeout host={Host} port={Port}", host, port);
                    return;
                }
                _logger.LogInformation("LDAP diag: SSL handshake succeeded host={Host} port={Port} protocol={Protocol} cipher={CipherAlgorithm} strength={Strength}", host, port, ssl.SslProtocol, ssl.CipherAlgorithm, ssl.CipherStrength);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "LDAP diag: SSL handshake failed host={Host} port={Port}", host, port);
            }
        }
    }
}
