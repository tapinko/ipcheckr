using IPCheckr.Api;
using IPCheckr.Api.Config;
using IPCheckr.Api.Models;
using IPCheckr.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Services.Logging;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Net;
using System.Text.Json.Serialization;
using System.IO;
using System.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.HttpOverrides;

namespace IPCheckr.Api
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            var env = builder.Environment;
            var config = builder.Configuration;

            if (!env.IsDevelopment())
            {
                builder.WebHost.ConfigureKestrel((ctx, kestrel) =>
                {
                    var cert = LoadOrCreateCertificate(ctx.Configuration);
                    kestrel.ListenAnyIP(8081, o => o.UseHttps(cert));
                });
            }

            // service registrations
            builder.Services.AddScoped<ITokenService, TokenService>();
            builder.Services.AddDatabase(builder.Configuration);
            builder.Services.AddJwtAuthentication(config);
            builder.Services.AddLdapAuth(builder.Configuration);
            builder.Services.AddSwaggerDocumentation();
            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                });
            builder.Services.AddCustomAuthorization();
            builder.Services.AddMemoryCache();
            builder.Services.AddHostedService<Gns3SessionCleanupService>();

            builder.Services.AddSingleton<ILogStreamBroker, LogStreamBroker>();
            builder.Logging.Services.AddSingleton<ILoggerProvider, BroadcastLoggerProvider>();

            builder.Services.Configure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.Events ??= new JwtBearerEvents();
                var prev = options.Events.OnMessageReceived;
                options.Events.OnMessageReceived = async context =>
                {
                    var path = context.HttpContext.Request.Path;
                    if (path.StartsWithSegments("/api/dashboard/stream-logs"))
                    {
                        var accessToken = context.Request.Query["access_token"];
                        if (!string.IsNullOrEmpty(accessToken))
                        {
                            context.Token = accessToken!;
                        }
                    }
                    if (prev != null) await prev(context);
                };
            });

            if (builder.Environment.IsDevelopment())
            {
                builder.Services.AddCustomCors();
            }

            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                options.KnownNetworks.Clear();
                options.KnownProxies.Clear();
            });

            var app = builder.Build();

            // middlewares
            app.UseForwardedHeaders();
            app.UseStaticFiles();
            app.UseRouting();

            if (!app.Environment.IsDevelopment())
            {
                app.UseHsts();
            }

            app.UseHttpsRedirection();

            if (app.Environment.IsDevelopment())
            {
                app.UseCors("AllowVite");
                app.UseSwaggerUi();
            }

            app.UseAuthentication();
            app.UseAuthorization();
            app.UseOpenApi();

            app.MapControllers();
            app.MapFallbackToFile("index.html");

            // creating admin user, setting the language and institution name empty string
            await app.SeedDatabaseAsync();

            // suply the client with the default language from the server settings
            app.MapGet("/lang.js", async (HttpContext context) =>
            {
                using var scope = app.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApiDbContext>();

                var rawLang = await db.AppSettings
                    .Where(s => s.Name == "DefaultLanguage" || s.Name == "Language")
                    .Select(s => s.Value)
                    .FirstOrDefaultAsync();

                var normalized = (rawLang ?? string.Empty).Trim().ToUpperInvariant();
                var clientLang = normalized == Common.Constants.Languages.Sk
                    ? Common.Constants.Languages.Sk
                    : Common.Constants.Languages.En;

                var js = $"window.__IPCHECKR_DEFAULT_LANGUAGE__ = '{clientLang}';";

                context.Response.ContentType = "application/javascript; charset=utf-8";
                context.Response.Headers["Cache-Control"] = "no-store, must-revalidate";
                await context.Response.WriteAsync(js);
            });

            app.Run();
        }

        private static X509Certificate2 LoadOrCreateCertificate(IConfiguration configuration)
        {
            var path = "/etc/ipcheckr/tls/ipcheckr.pfx";
            var password = configuration["Tls:CertificatePassword"] ?? string.Empty;

            if (File.Exists(path))
            {
                return new X509Certificate2(path, password, X509KeyStorageFlags.MachineKeySet);
            }

            var subject = configuration["Tls:Subject"] ?? "CN=ipcheckr";
            var altNamesRaw = configuration["Tls:SubjectAltNames"];
            var altNames = (altNamesRaw ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .ToList();

            if (altNames.Count == 0)
            {
                altNames.AddRange(new[] { "localhost", "ipcheckr.local", Environment.MachineName });
            }

            using var rsa = RSA.Create(2048);
            var req = new CertificateRequest(subject, rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

            var san = new SubjectAlternativeNameBuilder();
            foreach (var name in altNames.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                san.AddDnsName(name);
            }
            san.AddIpAddress(IPAddress.Loopback);
            san.AddIpAddress(IPAddress.IPv6Loopback);

            req.CertificateExtensions.Add(san.Build());
            req.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, false));
            req.CertificateExtensions.Add(new X509KeyUsageExtension(
                X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment, false));
            req.CertificateExtensions.Add(new X509SubjectKeyIdentifierExtension(req.PublicKey, false));

            var notBefore = DateTimeOffset.UtcNow.AddMinutes(-5);
            var validDays = configuration.GetValue<int>("Tls:ValidDays", 365);
            var notAfter = notBefore.AddDays(validDays);
            var cert = req.CreateSelfSigned(notBefore, notAfter);

            var pfxBytes = cert.Export(X509ContentType.Pfx, password);
            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrWhiteSpace(dir))
            {
                Directory.CreateDirectory(dir);
            }
            File.WriteAllBytes(path, pfxBytes);

            if ((OperatingSystem.IsLinux() || OperatingSystem.IsMacOS()) && File.Exists(path))
            {
                try
                {
                    File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);
                }
                catch
                {
                }
            }

            return new X509Certificate2(pfxBytes, password, X509KeyStorageFlags.MachineKeySet);
        }
    }
}