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

namespace IPCheckr.Api
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // HTTPS + self-signed certificate
            builder.WebHost.ConfigureKestrel((ctx, kestrel) =>
            {
                static X509Certificate2 CreateEphemeralCert()
                {
                    using var rsa = RSA.Create(2048);
                    var cn = "CN=ipcheckr-" + Guid.NewGuid().ToString("N").Substring(0, 12);
                    var req = new CertificateRequest(cn, rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

                    var san = new SubjectAlternativeNameBuilder();
                    san.AddDnsName("localhost");
                    san.AddDnsName("ipcheckr.local");
                    san.AddDnsName(Environment.MachineName);
                    san.AddIpAddress(IPAddress.Loopback);
                    san.AddIpAddress(IPAddress.IPv6Loopback);
                    req.CertificateExtensions.Add(san.Build());
                    req.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, false));
                    req.CertificateExtensions.Add(new X509KeyUsageExtension(
                        X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment, false));
                    req.CertificateExtensions.Add(new X509SubjectKeyIdentifierExtension(req.PublicKey, false));

                    var notBefore = DateTimeOffset.UtcNow.AddMinutes(-5);
                    var notAfter = notBefore.AddDays(90);
                    return req.CreateSelfSigned(notBefore, notAfter);
                }

                var cert = CreateEphemeralCert();
                kestrel.ListenAnyIP(8081, o => o.UseHttps(cert));
            });

            // service registrations
            builder.Services.AddScoped<ITokenService, TokenService>();
            builder.Services.AddDatabase(builder.Configuration);
            builder.Services.AddJwtAuthentication();
            builder.Services.AddSwaggerDocumentation();
            builder.Services.AddControllers();
            builder.Services.AddCustomAuthorization();

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

            var app = builder.Build();

            // middlewares
            app.UseStaticFiles();
            app.UseRouting();

            if (app.Environment.IsDevelopment())
            {
                app.UseCors("AllowVite");
                app.UseSwaggerUi();
            }

            app.UseAuthentication();
            app.UseAuthorization();
            app.UseOpenApi();

            // app.UseHttpsRedirection();
            // app.UseHsts();

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
    }
}