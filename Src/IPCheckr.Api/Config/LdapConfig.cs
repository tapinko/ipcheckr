using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace IPCheckr.Api.Config
{
    public static class LdapConfig
    {
        public static IServiceCollection AddLdapAuth(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<LdapSettings>(configuration.GetSection("Ldap"));
            services.AddScoped<Services.Config.ILdapSettingsProvider, Services.Config.LdapSettingsProvider>();
            services.AddScoped<Services.Auth.ILdapAuthService, Services.Auth.LdapAuthService>();
            return services;
        }
    }

    public class LdapSettings
    {
        public bool Enabled { get; set; } = false;

        [Required]
        public string Host { get; set; } = "localhost";

        public int Port { get; set; } = 389;

        public bool UseSsl { get; set; } = false;

        public bool StartTls { get; set; } = false;

        public string? Domain { get; set; }
        public string BindMode { get; set; } = "UpnOrDomain";

        public string? UserDnTemplate { get; set; }

        public string? SearchBase { get; set; }

        public string UsernameAttribute { get; set; } = "sAMAccountName";

        public string GroupMembershipAttribute { get; set; } = "memberOf";

        public string? StudentGroupDn { get; set; }
        
        public string? TeacherGroupDn { get; set; }

        public bool ValidateServerCertificate { get; set; } = true;
        
        public int ConnectTimeoutSeconds { get; set; } = 10;
    }
}
