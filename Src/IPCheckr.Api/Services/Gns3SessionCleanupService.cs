using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace IPCheckr.Api.Services
{
    public class Gns3SessionCleanupService : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<Gns3SessionCleanupService> _logger;

        public Gns3SessionCleanupService(IServiceProvider services, ILogger<Gns3SessionCleanupService> logger)
        {
            _services = services;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

                    using var scope = _services.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<ApiDbContext>();

                    var enabledSetting = await db.AppSettings
                        .Where(a => a.Name == "Gns3_Enabled")
                        .Select(a => a.Value)
                        .FirstOrDefaultAsync(stoppingToken);

                    var gns3Enabled = string.Equals(enabledSetting, "true", StringComparison.OrdinalIgnoreCase);
                    if (!gns3Enabled)
                        continue;

                    var now = DateTime.UtcNow;
                    var expired = await db.Gns3Sessions
                        .Include(s => s.User)
                        .Where(s => s.Status == GNS3SessionStatus.RUNNING)
                        .Where(s => s.SessionStart.AddSeconds(s.Duration + s.ExtendedDuration) <= now)
                        .ToListAsync(stoppingToken);

                    if (expired.Count == 0)
                        continue;

                    foreach (var session in expired)
                    {
                        var username = session.User?.Username ?? $"user#{session.UserId}";
                        try
                        {
                            var context = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
                            var command = $"stop {username}";
                            var result = await Gns3SessionHelpers.SendCommandToLauncherAsync(context, command, stoppingToken);

                            if (!result.Success)
                            {
                                session.ErrorMessage = result.Response;
                                _logger.LogWarning("Failed to stop GNS3 session for {User}: {Reason}", username, result.Response);
                                continue;
                            }

                            session.Status = GNS3SessionStatus.STOPPED;
                            session.SessionEnd = DateTime.UtcNow;
                            session.ErrorMessage = null;
                            _logger.LogInformation("Auto-stopped GNS3 session for {User}", username);
                        }
                        catch (Exception ex) when (ex is not OperationCanceledException)
                        {
                            _logger.LogError(ex, "Error while stopping GNS3 session for {User}", username);
                        }
                    }

                    await db.SaveChangesAsync(stoppingToken);
                }
                catch (OperationCanceledException)
                {
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in GNS3 session cleanup");
                }
            }
        }
    }
}