using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Config
{
    public static class DatabaseSeeder
    {
        public static async Task SeedDatabaseAsync(this WebApplication app)
        {
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApiDbContext>();

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

            await EnsureAppSettingAsync(db, "Ldap_Enabled", "false");
            await EnsureAppSettingAsync(db, "Ldap_Host", "server.ldap.example.local");
            await EnsureAppSettingAsync(db, "Ldap_Port", "636");
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
    }
}
