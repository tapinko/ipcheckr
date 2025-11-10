using System.DirectoryServices.Protocols;
using System.Net;
using IPCheckr.Api.Config;
using IPCheckr.Api.Services.Config;
using Microsoft.Extensions.Logging;

namespace IPCheckr.Api.Services.Auth
{
    public interface ILdapDirectoryService
    {
        Task<IReadOnlyList<LdapDirectoryUser>> SearchUsersAsync(string query, string? ouDn = null, string? groupDn = null, int limit = 20, CancellationToken ct = default);
    }

    public record LdapDirectoryUser(string Username, string? DisplayName, string DistinguishedName);

    public class LdapDirectoryService : ILdapDirectoryService
    {
        private readonly ILdapSettingsProvider _settingsProvider;
        private readonly ILogger<LdapDirectoryService> _logger;

        public LdapDirectoryService(ILdapSettingsProvider settingsProvider, ILogger<LdapDirectoryService> logger)
        {
            _settingsProvider = settingsProvider;
            _logger = logger;
        }

        public async Task<IReadOnlyList<LdapDirectoryUser>> SearchUsersAsync(string query, string? ouDn = null, string? groupDn = null, int limit = 20, CancellationToken ct = default)
        {
            var s = await _settingsProvider.GetCurrentAsync(ct);
            if (!s.Enabled)
                return Array.Empty<LdapDirectoryUser>();
            if (string.IsNullOrWhiteSpace(s.BindDn) || string.IsNullOrWhiteSpace(s.BindPassword))
                return Array.Empty<LdapDirectoryUser>();

            try
            {
                return await Task.Run(() => SearchInternal(query, ouDn, groupDn, limit, s), ct);
            }
            catch (LdapException lex)
            {
                _logger.LogWarning(lex, "LDAP directory search bind failed: {Message}", lex.Message);
                return Array.Empty<LdapDirectoryUser>();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "LDAP directory search failed");
                return Array.Empty<LdapDirectoryUser>();
            }
        }

        private IReadOnlyList<LdapDirectoryUser> SearchInternal(string query, string? ouDn, string? groupDn, int limit, LdapSettings s)
        {
            var identifier = new LdapDirectoryIdentifier(s.Host, s.Port, true, false);
            using var connection = new LdapConnection(identifier)
            {
                SessionOptions = { ProtocolVersion = 3 }
            };
            connection.AuthType = AuthType.Basic;
            if (!s.ValidateServerCertificate)
                connection.SessionOptions.VerifyServerCertificate += (_, _) => true;
            if (s.UseSsl) connection.SessionOptions.SecureSocketLayer = true;
            if (s.StartTls) connection.SessionOptions.StartTransportLayerSecurity(null);
            if (s.ConnectTimeoutSeconds > 0)
                connection.Timeout = TimeSpan.FromSeconds(s.ConnectTimeoutSeconds);

            var bindName = (s.BindDn ?? string.Empty).Trim();
            var bindPass = (s.BindPassword ?? string.Empty).Trim();

            // try DN, UPN, DOMAIN\user, raw
            var candidates = BuildBindCandidates(bindName, bindPass, s.Domain);
            LdapException? lastInvalidCred = null;
            var bound = false;
            foreach (var cred in candidates)
            {
                try
                {
                    connection.Bind(cred);
                    bound = true;
                    break;
                }
                catch (LdapException lex) when (lex.ErrorCode == (int)ResultCode.StrongAuthRequired && !s.UseSsl && !s.StartTls)
                {
                    // fallback startTLS
                    try
                    {
                        connection.SessionOptions.StartTransportLayerSecurity(null);
                        connection.Bind(cred);
                        bound = true;
                        break;
                    }
                    catch (LdapException inner) when (inner.ErrorCode == 49)
                    {
                        lastInvalidCred = inner;
                        continue;
                    }
                }
                catch (LdapException lex) when (lex.ErrorCode == 49)
                {
                    lastInvalidCred = lex;
                    continue;
                }
            }

            if (!bound)
            {
                var serverMsg = lastInvalidCred?.ServerErrorMessage;
                _logger.LogWarning("LDAP bind failed for service account. Details: {ServerMessage}", serverMsg);
                throw lastInvalidCred ?? new LdapException(49, "Bind failed");
            }

            var baseDn = !string.IsNullOrWhiteSpace(ouDn) ? ouDn! : (s.SearchBase ?? string.Empty);
            if (string.IsNullOrWhiteSpace(baseDn))
                return Array.Empty<LdapDirectoryUser>();

            string escaped = Escape(query);
            var userAttr = string.IsNullOrWhiteSpace(s.UsernameAttribute) ? "sAMAccountName" : s.UsernameAttribute;
            var baseFilter = $"(|({userAttr}=*{escaped}*)(cn=*{escaped}*)(displayName=*{escaped}*)(uid=*{escaped}*))";
            string filter;
            if (!string.IsNullOrWhiteSpace(groupDn))
            {
                // if memberOf is nested we need to do this shit -  LDAP_MATCHING_RULE_IN_CHAIN: 1.2.840.113556.1.4.1941
                var groupEsc = Escape(groupDn!);
                filter = $"(&{baseFilter}(|(memberOf={groupEsc})(memberOf:1.2.840.113556.1.4.1941:={groupEsc})))";
            }
            else
            {
                filter = baseFilter;
            }

            var attrs = new[] { "distinguishedName", userAttr, "cn", "displayName" };
            var req = new SearchRequest(baseDn, filter, SearchScope.Subtree, attrs);
            var res = (SearchResponse)connection.SendRequest(req);
            var list = new List<LdapDirectoryUser>();
            foreach (SearchResultEntry entry in res.Entries)
            {
                var dn = entry.DistinguishedName;
                var username = entry.Attributes[userAttr]?.GetValues(typeof(string))?.Cast<string>().FirstOrDefault()
                    ?? entry.Attributes["uid"]?.GetValues(typeof(string))?.Cast<string>().FirstOrDefault()
                    ?? entry.Attributes["cn"]?.GetValues(typeof(string))?.Cast<string>().FirstOrDefault()
                    ?? string.Empty;
                var displayName = entry.Attributes["displayName"]?.GetValues(typeof(string))?.Cast<string>().FirstOrDefault()
                    ?? entry.Attributes["cn"]?.GetValues(typeof(string))?.Cast<string>().FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(username))
                {
                    list.Add(new LdapDirectoryUser(username, displayName, dn));
                }
                if (list.Count >= limit) break;
            }
            return list;
        }

        private static List<NetworkCredential> BuildBindCandidates(string bindName, string password, string? domain)
        {
            var list = new List<NetworkCredential>();
            var input = bindName ?? string.Empty;

            if (!string.IsNullOrWhiteSpace(input))
                list.Add(new NetworkCredential(input, password));

            var isLikelyDn = input.Contains('=') && input.Contains(',');
            if (isLikelyDn) return list;

            if (!string.IsNullOrWhiteSpace(domain) && !input.Contains('@') && !input.Contains('\\'))
            {
                var dom = domain.Trim();
                list.Add(new NetworkCredential(input + "@" + dom, password));
                var netbios = dom.Contains('.') ? dom.Split('.')[0] : dom;
                if (!string.IsNullOrWhiteSpace(netbios))
                    list.Add(new NetworkCredential($"{netbios}\\{input}", password));
            }

            return list;
        }

        /// <summary>
        /// Escapes special characters in LDAP filter values.
        /// </summary>
        private static string Escape(string value)
        {
            return value
                .Replace("\\", "\\5c")
                .Replace("*", "\\2a")
                .Replace("(", "\\28")
                .Replace(")", "\\29")
                .Replace("\0", "\\00");
        }
    }
}
