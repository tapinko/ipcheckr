using System.Linq;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Gns3;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class Gns3Controller : ControllerBase
    {
        [HttpGet("sessions/{userId:int}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QuerySessionRes>> QuerySession([FromRoute] QuerySessionReq req, CancellationToken ct)
        {
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

            var session = await _db.Gns3Sessions
                .OrderByDescending(s => s.SessionStart)
                .FirstOrDefaultAsync(s => s.UserId == user.Id, ct);

            if (session == null)
                return Ok(new QuerySessionRes { UserId = user.Id, Username = user.Username, Status = GNS3SessionStatus.STOPPED, Port = 0 });

            return Ok(Gns3SessionHelpers.ToResponse(session, user.Username));
        }

        [HttpGet("sessions/{userId:int}/history")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QuerySessionHistoryRes>> QuerySessionHistory([FromRoute] QuerySessionReq req, CancellationToken ct)
        {
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

            var sessions = await _db.Gns3Sessions
                .Where(s => s.UserId == user.Id)
                .OrderByDescending(s => s.SessionStart)
                .ToListAsync(ct);

            var response = new QuerySessionHistoryRes
            {
                Sessions = sessions.Select(s => Gns3SessionHelpers.ToResponse(s, user.Username)).ToList()
            };

            return Ok(response);
        }
    }
}