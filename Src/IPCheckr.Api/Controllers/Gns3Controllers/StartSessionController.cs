using System;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Gns3;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace IPCheckr.Api.Controllers
{
    public partial class Gns3Controller : ControllerBase
    {
        [HttpPost("sessions/start")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
        public async Task<ActionResult<Gns3SessionBase>> StartSession([FromBody] StartSessionReq req, CancellationToken ct)
        {
            var logger = HttpContext.RequestServices.GetRequiredService<ILogger<Gns3Controller>>();
            var enabled = await Gns3Config.IsEnabledAsync(HttpContext.RequestServices, ct);
            if (!enabled)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new ApiProblemDetails
                {
                    Title = "GNS3 disabled",
                    Detail = "GNS3 integration is disabled.",
                    Status = StatusCodes.Status503ServiceUnavailable,
                    MessageEn = "GNS3 integration is disabled.",
                    MessageSk = "GNS3 integrácia je vypnutá."
                });
            }

            if (!Gns3SessionHelpers.IsClientCertificateAllowed(HttpContext))
                return Forbid();

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == req.UserId, ct);
            if (user == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "User not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "User not found.",
                    MessageSk = "Používateľ neexistuje."
                });

            var accessResult = await Gns3AccessUtils.EnsureGns3AccessAsync(User, _db, user, ct);
            if (accessResult != null)
                return accessResult;

            if (string.Equals(user.Username, "admin", StringComparison.OrdinalIgnoreCase))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "Admin user cannot start sessions.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "Admin user cannot start 'admin' GNS3 sessions.",
                    MessageSk = "Admin nemôže spúšťať 'admin' GNS3 relácie."
                });

            if (!Gns3SessionHelpers.IsUsernameValid(user.Username))
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Invalid username",
                    Detail = "Username format is not allowed.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "Username format is not allowed.",
                    MessageSk = "Formát používateľského mena nie je povolený."
                });

            if (Gns3SessionHelpers.IsRateLimited(HttpContext, user.Id))
                return StatusCode(StatusCodes.Status429TooManyRequests);

            var existing = await _db.Gns3Sessions.FirstOrDefaultAsync(s => s.UserId == user.Id && s.Status == GNS3SessionStatus.RUNNING, ct);
            if (existing != null)
                return Conflict(new ApiProblemDetails
                {
                    Title = "Conflict",
                    Detail = "Session already running.",
                    Status = StatusCodes.Status409Conflict,
                    MessageEn = "Session already running.",
                    MessageSk = "Relácia už beží."
                });

            var command = $"start {user.Username}";
            var launcherResult = await Gns3SessionHelpers.SendCommandToLauncherAsync(HttpContext, command, ct);
            if (!launcherResult.Success)
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new ApiProblemDetails
                {
                    Title = "Launcher unavailable",
                    Detail = launcherResult.Response,
                    Status = StatusCodes.Status503ServiceUnavailable,
                    MessageEn = launcherResult.Response,
                    MessageSk = $"Spúšťač nedostupný: {launcherResult.Response}"
                });

            var durationSeconds = await Gns3Config.GetDefaultDurationSecondsAsync(HttpContext.RequestServices, ct);

            var session = new Gns3Session
            {
                UserId = user.Id,
                SessionStart = DateTime.UtcNow,
                Status = GNS3SessionStatus.RUNNING,
                Port = launcherResult.Port ?? 0,
                Pid = launcherResult.Pid ?? 0,
                Duration = durationSeconds,
                ExtendedDuration = 0,
                ErrorMessage = null
            };

            _db.Gns3Sessions.Add(session);
            await _db.SaveChangesAsync(ct);

            logger.LogInformation("GNS3 session started for user {User} on port {Port}", user.Username, launcherResult.Port);

            return Ok(Gns3SessionHelpers.ToResponse(session, user.Username));
        }
    }
}