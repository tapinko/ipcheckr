using IPCheckr.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace IPCheckr.Api.Common.Utils
{
    public static class Gns3Config
    {
        public const string DefaultDurationSettingName = "Gns3_DefaultSessionMinutes";
        public const string ExtensionMinutesSettingName = "Gns3_ExtendedMinutes";
        public const string EnabledSettingName = "Gns3_Enabled";

        public static async Task<int> GetDefaultDurationSecondsAsync(IServiceProvider services, CancellationToken ct)
        {
            var minutes = await GetIntSettingAsync(services, DefaultDurationSettingName, "Gns3:DefaultSessionMinutes", 120, ct);
            return Math.Max(1, minutes) * 60;
        }

        public static async Task<int> GetExtensionMinutesAsync(IServiceProvider services, CancellationToken ct)
        {
            var minutes = await GetIntSettingAsync(services, ExtensionMinutesSettingName, "Gns3:ExtendedMinutes", 30, ct);
            return Math.Max(1, minutes);
        }

        public static async Task<bool> IsEnabledAsync(IServiceProvider services, CancellationToken ct)
        {
            var db = services.GetRequiredService<ApiDbContext>();
            var config = services.GetRequiredService<IConfiguration>();

            var appSettingValue = await db.AppSettings
                .Where(a => a.Name == EnabledSettingName)
                .Select(a => a.Value)
                .FirstOrDefaultAsync(ct);

            var configValue = config["Gns3:Enabled"];
            var candidate = (appSettingValue ?? configValue ?? "false").Trim();

                 return candidate.Equals("true", StringComparison.OrdinalIgnoreCase);
        }

        private static async Task<int> GetIntSettingAsync(IServiceProvider services, string appSettingName, string configKey, int fallback, CancellationToken ct)
        {
            var db = services.GetRequiredService<ApiDbContext>();
            var config = services.GetRequiredService<IConfiguration>();

            var appSettingValue = await db.AppSettings
                .Where(a => a.Name == appSettingName)
                .Select(a => a.Value)
                .FirstOrDefaultAsync(ct);

            var configValue = config[configKey];
            var candidate = appSettingValue ?? configValue;

            if (int.TryParse(candidate, out var parsed) && parsed > 0)
                return parsed;

            return fallback;
        }
    }
}