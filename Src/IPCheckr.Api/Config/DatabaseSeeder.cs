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

            if (!db.AppSettings.Any(a => a.Name == "Language"))
            {
                db.AppSettings.Add(new AppSettings
                {
                    Name = "Language",
                    Value = "EN"
                });
                await db.SaveChangesAsync();
            }

            if (!db.AppSettings.Any(a => a.Name == "InstitutionName"))
            {
                db.AppSettings.Add(new AppSettings
                {
                    Name = "InstitutionName",
                    Value = ""
                });
                await db.SaveChangesAsync();
            }
        }
    }
}
