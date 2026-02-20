using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using System.Text;
using System.IO;

namespace IPCheckr.Api.Config
{
    public static class AuthenticationConfig
    {
        public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            var jwtSection = configuration.GetSection("Jwt");
            var issuer = jwtSection["Issuer"] ?? "ipcheckr";
            var audience = jwtSection["Audience"] ?? issuer;
            var signingKey = CreateOrLoadSigningKey(jwtSection);
            var isDevelopment = string.Equals(configuration["ASPNETCORE_ENVIRONMENT"], "Development", StringComparison.OrdinalIgnoreCase);

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.RequireHttpsMetadata = !isDevelopment;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = issuer,
                        ValidAudience = audience,
                        IssuerSigningKey = signingKey
                    };
                });

            return services;
        }

        private static SymmetricSecurityKey CreateOrLoadSigningKey(IConfigurationSection jwtSection)
        {
            var configuredKey = jwtSection["Key"];
            var keyFilePath = jwtSection["KeyFile"] ?? "/etc/ipcheckr/jwt.key";

            if (string.IsNullOrWhiteSpace(configuredKey))
            {
                configuredKey = TryReadFromFile(keyFilePath);
            }

            if (string.IsNullOrWhiteSpace(configuredKey))
            {
                configuredKey = GenerateAndPersistKey(keyFilePath);
            }

            var keyBytes = DecodeKey(configuredKey!);
            if (keyBytes.Length < 32)
            {
                throw new InvalidOperationException("JWT signing key must be at least 256 bits long.");
            }

            return new SymmetricSecurityKey(keyBytes);
        }

        private static byte[] DecodeKey(string raw)
        {
            raw = raw.Trim();
            try
            {
                return Convert.FromBase64String(raw);
            }
            catch
            {
                return Encoding.UTF8.GetBytes(raw);
            }
        }

        private static string? TryReadFromFile(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    return File.ReadAllText(path).Trim();
                }
            }
            catch
            {
            }
            return null;
        }

        private static string GenerateAndPersistKey(string path)
        {
            var keyBytes = RandomNumberGenerator.GetBytes(32);
            var key = Convert.ToBase64String(keyBytes);

            try
            {
                var dir = Path.GetDirectoryName(path);
                if (!string.IsNullOrWhiteSpace(dir))
                {
                    Directory.CreateDirectory(dir);
                }

                File.WriteAllText(path, key);

                if (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS())
                {
                    try
                    {
                        File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);
                    }
                    catch
                    {
                    }
                }
            }
            catch
            {
            }

            return key;
        }
    }
}