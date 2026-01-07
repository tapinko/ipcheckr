using System;
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
        [HttpPost("sessions/stop")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
        public async Task<ActionResult<Gns3SessionBase>> StopSession([FromBody] StopSessionReq req, CancellationToken ct)
        {
            var logger = HttpContext.RequestServices.GetRequiredService<ILogger<Gns3Controller>>();
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

            if (string.Equals(user.Username, "admin", StringComparison.OrdinalIgnoreCase))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "Admin user cannot stop sessions.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "Admin user cannot stop 'admin' GNS3 sessions.",
                    MessageSk = "Admin nemôže zastavovať 'admin' GNS3 relácie."
                });

            var session = await _db.Gns3Sessions.FirstOrDefaultAsync(s => s.UserId == user.Id && s.Status == GNS3SessionStatus.RUNNING, ct);
            if (session == null)
                return Ok(new Gns3SessionBase { UserId = user.Id, Username = user.Username, Status = GNS3SessionStatus.STOPPED, Port = 0 });

            var command = $"stop {user.Username}";
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

            session.Status = GNS3SessionStatus.STOPPED;
            session.SessionEnd = DateTime.UtcNow;
            session.ErrorMessage = null;
            await _db.SaveChangesAsync(ct);

            logger.LogInformation("GNS3 session stopped for user {User}", user.Username);

            return Ok(Gns3SessionHelpers.ToResponse(session, user.Username));
        }
    }
}