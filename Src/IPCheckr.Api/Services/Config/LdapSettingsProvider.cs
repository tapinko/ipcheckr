using IPCheckr.Api.Config;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace IPCheckr.Api.Services.Config
{
    public interface ILdapSettingsProvider
    {
        Task<LdapSettings> GetCurrentAsync(CancellationToken ct = default);
    }

    public class LdapSettingsProvider : ILdapSettingsProvider
    {
        private readonly ApiDbContext _db;
        private readonly IOptions<LdapSettings> _options;

        public LdapSettingsProvider(ApiDbContext db, IOptions<LdapSettings> options)
        {
            _db = db;
            _options = options;
        }

        public async Task<LdapSettings> GetCurrentAsync(CancellationToken ct = default)
        {
            var s = new LdapSettings
            {
                Enabled = _options.Value.Enabled,
                Host = _options.Value.Host,
                Port = _options.Value.Port,
                UseSsl = _options.Value.UseSsl,
                StartTls = _options.Value.StartTls,
                Domain = _options.Value.Domain,
                BindMode = _options.Value.BindMode,
                UserDnTemplate = _options.Value.UserDnTemplate,
                SearchBase = _options.Value.SearchBase,
                UsernameAttribute = _options.Value.UsernameAttribute,
                GroupMembershipAttribute = _options.Value.GroupMembershipAttribute,
                StudentGroupDn = _options.Value.StudentGroupDn,
                TeacherGroupDn = _options.Value.TeacherGroupDn,
                ValidateServerCertificate = _options.Value.ValidateServerCertificate,
                ConnectTimeoutSeconds = _options.Value.ConnectTimeoutSeconds,
                BindDn = _options.Value.BindDn,
                BindPassword = _options.Value.BindPassword
            };

            var settings = await _db.AppSettings
                .Where(a => a.Name.StartsWith("Ldap_"))
                .ToListAsync(ct);

            foreach (var a in settings)
            {
                var name = a.Name;
                var val = a.Value ?? string.Empty;
                switch (name)
                {
                    case "Ldap_Enabled": s.Enabled = ParseBool(val, s.Enabled); break;
                    case "Ldap_Host": if (!string.IsNullOrWhiteSpace(val)) s.Host = val; break;
                    case "Ldap_Port": s.Port = ParseInt(val, s.Port); break;
                    case "Ldap_UseSsl": s.UseSsl = ParseBool(val, s.UseSsl); break;
                    case "Ldap_StartTls": s.StartTls = ParseBool(val, s.StartTls); break;
                    case "Ldap_Domain": s.Domain = string.IsNullOrWhiteSpace(val) ? null : val; break;
                    case "Ldap_BindMode": if (!string.IsNullOrWhiteSpace(val)) s.BindMode = val; break;
                    case "Ldap_UserDnTemplate": s.UserDnTemplate = string.IsNullOrWhiteSpace(val) ? null : val; break;
                    case "Ldap_SearchBase": s.SearchBase = string.IsNullOrWhiteSpace(val) ? null : val; break;
                    case "Ldap_UsernameAttribute": if (!string.IsNullOrWhiteSpace(val)) s.UsernameAttribute = val; break;
                    case "Ldap_GroupMembershipAttribute": if (!string.IsNullOrWhiteSpace(val)) s.GroupMembershipAttribute = val; break;
                    case "Ldap_StudentGroupDn": s.StudentGroupDn = string.IsNullOrWhiteSpace(val) ? null : val; break;
                    case "Ldap_TeacherGroupDn": s.TeacherGroupDn = string.IsNullOrWhiteSpace(val) ? null : val; break;
                    case "Ldap_ValidateServerCertificate": s.ValidateServerCertificate = ParseBool(val, s.ValidateServerCertificate); break;
                    case "Ldap_ConnectTimeoutSeconds": s.ConnectTimeoutSeconds = ParseInt(val, s.ConnectTimeoutSeconds); break;
                    case "Ldap_BindDn": s.BindDn = string.IsNullOrWhiteSpace(val) ? null : val; break;
                    case "Ldap_BindPassword": s.BindPassword = string.IsNullOrWhiteSpace(val) ? null : val; break;
                }
            }

            return s;
        }

        private static bool ParseBool(string value, bool fallback)
        {
            return bool.TryParse(value, out var b) ? b : fallback;
        }

        private static int ParseInt(string value, int fallback)
        {
            return int.TryParse(value, out var n) ? n : fallback;
        }
    }
}
