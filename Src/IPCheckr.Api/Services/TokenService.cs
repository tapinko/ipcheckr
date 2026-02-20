using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using System.Security.Cryptography;
using System.IO;

namespace IPCheckr.Api.Services
{
    public interface ITokenService
    {
        string GenerateToken(string userId, string username, IList<string> roles);
        bool ValidateToken(string token, out ClaimsPrincipal principal);
    }

    public class TokenService : ITokenService
    {
        private readonly SymmetricSecurityKey _signingKey;
        private readonly string _issuer;
        private readonly string _audience;
        private readonly int _tokenLifetimeMinutes;

        public TokenService(IConfiguration configuration, IHostEnvironment environment)
        {
            var jwtSection = configuration.GetSection("Jwt");
            var isDevelopment = environment.IsDevelopment();
            _issuer = jwtSection["Issuer"] ?? "ipcheckr";
            _audience = jwtSection["Audience"] ?? _issuer;
            _tokenLifetimeMinutes = jwtSection.GetValue<int>("LifetimeMinutes", 120);
            _signingKey = CreateOrLoadSigningKey(jwtSection, isDevelopment);
        }

        public string GenerateToken(string userId, string username, IList<string> roles)
        {
            var creds = new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId),
                new Claim(JwtRegisteredClaimNames.Name, username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

            var token = new JwtSecurityToken(
                issuer: _issuer,
                audience: _audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_tokenLifetimeMinutes),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public bool ValidateToken(string token, out ClaimsPrincipal principal)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    ValidIssuer = _issuer,
                    ValidAudience = _audience,
                    IssuerSigningKey = _signingKey,
                    ClockSkew = TimeSpan.Zero
                }, out _);

                return true;
            }
            catch
            {
                principal = null!;
                return false;
            }
        }

        private static SymmetricSecurityKey CreateOrLoadSigningKey(IConfigurationSection jwtSection, bool isDevelopment)
        {
            var configuredKey = jwtSection["Key"];
            var keyFilePath = jwtSection["KeyFile"] ?? (isDevelopment
                ? Path.Combine(Path.GetTempPath(), "ipcheckr-jwt.key")
                : "/etc/ipcheckr/jwt.key");

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