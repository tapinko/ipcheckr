using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Gns3;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace IPCheckr.Api.Controllers
{
    public partial class Gns3Controller : ControllerBase
    {
        [HttpPost("sessions/force-stop-all")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ForceStopAllRes>> ForceStopAll(CancellationToken ct)
        {
            var logger = HttpContext.RequestServices.GetRequiredService<ILogger<Gns3Controller>>();
            if (!Gns3SessionHelpers.IsClientCertificateAllowed(HttpContext))
                return Forbid();

            var running = await _db.Gns3Sessions
                .Include(s => s.User)
                .Where(s => s.Status == GNS3SessionStatus.RUNNING)
                .ToListAsync(ct);

            var stoppedCount = 0;
            var failedUsers = new List<string>();
            var failedReasons = new List<string>();
            foreach (var session in running)
            {
                var username = session.User?.Username ?? $"user#{session.UserId}";
                var command = $"stop {username}";
                var result = await Gns3SessionHelpers.SendCommandToLauncherAsync(HttpContext, command, ct);

                if (!result.Success)
                {
                    logger.LogWarning("Force stop failed for {User}: {Reason}", username, result.Response);
                    session.ErrorMessage = result.Response;
                    failedUsers.Add(username);
                    failedReasons.Add(result.Response);
                    continue;
                }

                session.Status = GNS3SessionStatus.STOPPED;
                session.SessionEnd = DateTime.UtcNow;
                session.KilledByAdmin = true;
                session.ErrorMessage = null;
                stoppedCount++;
                logger.LogInformation("Force stopped GNS3 session for {User}", username);
            }

            await _db.SaveChangesAsync(ct);

            var response = new ForceStopAllRes
            {
                StoppedCount = stoppedCount,
                FailedCount = failedUsers.Count,
                FailedUsers = failedUsers.ToArray(),
                FailedReasons = failedReasons.ToArray(),
            };

            return Ok(response);
        }
    }
}