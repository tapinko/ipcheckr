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
        [HttpPost("sessions/extend")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<Gns3SessionBase>> ExtendSession([FromBody] ExtendSessionReq req, CancellationToken ct)
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
                    MessageSk = "Používatel' neexistuje."
                });

            var accessResult = await Gns3AccessUtils.EnsureGns3AccessAsync(User, _db, user, ct);
            if (accessResult != null)
                return accessResult;

            var session = await _db.Gns3Sessions.FirstOrDefaultAsync(s => s.UserId == user.Id && s.Status == GNS3SessionStatus.RUNNING, ct);
            if (session == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Session not running.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Session is not running.",
                    MessageSk = "Relácia nie je spustená."
                });

            var minutes = await Gns3Config.GetExtensionMinutesAsync(HttpContext.RequestServices, ct);

            session.ExtendedDuration += minutes * 60;
            await _db.SaveChangesAsync(ct);

            logger.LogInformation("GNS3 session for user {User} extended by {Minutes} minutes", user.Username, minutes);

            return Ok(Gns3SessionHelpers.ToResponse(session, user.Username));
        }
    }
}