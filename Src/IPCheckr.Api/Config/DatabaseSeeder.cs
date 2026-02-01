using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace IPCheckr.Api.Config
{
    public static class DatabaseSeeder
    {
        public static async Task SeedDatabaseAsync(this WebApplication app)
        {
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApiDbContext>();
            var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

            var launcherPortDefault = config["Gns3:LauncherPort"] ?? "6769";
            var launcherHostDefault = config["Gns3:LauncherHost"] ?? "host.docker.internal";
            var gns3EnabledDefault = config["Gns3:Enabled"] ?? "false";

            await db.Database.MigrateAsync();

            if (!db.Users.Any())
            {
                db.Users.Add(new User
                {
                    Username = "admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin"),
                    Role = Roles.Admin
                });
                await db.SaveChangesAsync();
            }

            await EnsureAppSettingAsync(db, "Language", "EN");
            await EnsureAppSettingAsync(db, "InstitutionName", "");
            await EnsureAppSettingAsync(db, "AuthType", AuthType.LOCAL.ToString());

            await EnsureAppSettingAsync(db, "Gns3_Enabled", gns3EnabledDefault);
            await EnsureAppSettingAsync(db, "Gns3_RemoteServer", launcherHostDefault);
            await EnsureAppSettingAsync(db, "Gns3_RemotePort", launcherPortDefault);
            await EnsureAppSettingAsync(db, "Gns3_DefaultSessionMinutes", "120");
            await EnsureAppSettingAsync(db, "Gns3_ExtendedMinutes", "30");

            await UpsertAppSettingAsync(db, "Gns3_RemoteServer", config["Gns3:LauncherHost"]);
            await UpsertAppSettingAsync(db, "Gns3_RemotePort", config["Gns3:LauncherPort"]);
            await UpsertAppSettingAsync(db, "Gns3_Enabled", config["Gns3:Enabled"]);

            await UpsertAppSettingAsync(db, "Ldap_Host", config["LDAP_HOST"]);
            await UpsertAppSettingAsync(db, "Ldap_Port", config["LDAP_PORT"]);
            await UpsertAppSettingAsync(db, "Ldap_StartTls", config["LDAP_STARTTLS"]);
            await UpsertAppSettingAsync(db, "Ldap_FetchCert", config["LDAP_FETCH_CERT"]);

            await EnsureAppSettingAsync(db, "Ldap_Enabled", "false");
            await EnsureAppSettingAsync(db, "Ldap_Host", "server.ldap.example.local");
            await EnsureAppSettingAsync(db, "Ldap_Port", "636");
            await EnsureAppSettingAsync(db, "Ldap_AllowSelfSignUp", "false");
            await EnsureAppSettingAsync(db, "Ldap_UseSsl", "true");
            await EnsureAppSettingAsync(db, "Ldap_StartTls", "false");
            await EnsureAppSettingAsync(db, "Ldap_Domain", "ldap.example.local");
            await EnsureAppSettingAsync(db, "Ldap_BindMode", "UpnOrDomain");
            await EnsureAppSettingAsync(db, "Ldap_UserDnTemplate", "uid={0},ou=Users,dc=ldap,dc=example,dc=local");
            await EnsureAppSettingAsync(db, "Ldap_SearchBase", "dc=ldap,dc=example,dc=local");
            await EnsureAppSettingAsync(db, "Ldap_UsernameAttribute", "sAMAccountName");
            await EnsureAppSettingAsync(db, "Ldap_GroupMembershipAttribute", "memberOf");
            await EnsureAppSettingAsync(db, "Ldap_StudentGroupDn", "cn=students,ou=Groups,dc=ldap,dc=example,dc=local");
            await EnsureAppSettingAsync(db, "Ldap_TeacherGroupDn", "cn=teachers,ou=Groups,dc=ldap,dc=example,dc=local");
            await EnsureAppSettingAsync(db, "Ldap_ConnectTimeoutSeconds", "10");
            await EnsureAppSettingAsync(db, "Ldap_BindDn", "");
            await EnsureAppSettingAsync(db, "Ldap_BindPassword", "");
        }

        private static async Task EnsureAppSettingAsync(ApiDbContext db, string name, string defaultValue)
        {
            if (!await db.AppSettings.AnyAsync(a => a.Name == name))
            {
                db.AppSettings.Add(new AppSettings
                {
                    Name = name,
                    Value = defaultValue
                });
                await db.SaveChangesAsync();
            }
        }

        private static async Task UpsertAppSettingAsync(ApiDbContext db, string name, string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return;

            var existing = await db.AppSettings.FirstOrDefaultAsync(a => a.Name == name);
            if (existing == null)
            {
                db.AppSettings.Add(new AppSettings { Name = name, Value = value });
                await db.SaveChangesAsync();
                return;
            }

            if (!string.Equals(existing.Value, value, StringComparison.Ordinal))
            {
                existing.Value = value;
                await db.SaveChangesAsync();
            }
        }
    }
}