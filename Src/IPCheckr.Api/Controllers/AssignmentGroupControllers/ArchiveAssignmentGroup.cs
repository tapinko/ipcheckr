using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Common.Enums;
using Microsoft.AspNetCore.Authorization;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentGroup;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentGroupController : ControllerBase
    {
        [Authorize(Policy = Roles.Teacher)]
        [HttpPut("archive-assignment-group")]
        [ProducesResponseType(typeof(void), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ArchiveAssignmentGroup([FromBody] ArchiveAGReq req)
        {
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
            _ = int.TryParse(callerIdStr, out int callerId);

            if (callerRole == Roles.Teacher && !req.IsArchived)
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "Teachers cannot unarchive assignment groups.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "Teachers cannot unarchive assignment groups.",
                    MessageSk = "Učitelia nemôžu odarchivovať skupiny zadaní."
                });

            if (req.Type == AssignmentGroupType.SUBNET)
            {
                var group = await _db.SubnetAGs
                    .Include(ag => ag.Class).ThenInclude(c => c.Teachers)
                    .FirstOrDefaultAsync(ag => ag.Id == req.AssignmentGroupId);

                if (group == null)
                    return NotFound(new ApiProblemDetails
                    {
                        Title = "Not Found",
                        Detail = "Assignment group not found.",
                        Status = StatusCodes.Status404NotFound,
                        MessageEn = "Assignment group not found.",
                        MessageSk = "Skupina zadania nebola nájdená."
                    });

                if (callerRole == Roles.Teacher && !(group.Class.Teachers?.Any(t => t.Id == callerId) ?? false))
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You can only archive assignment groups in classes you are assigned to.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You can only archive assignment groups in classes you are assigned to.",
                        MessageSk = "Môžete archivovať iba skupiny zadaní v triedach, ku ktorým ste pridelení."
                    });

                group.IsArchived = req.IsArchived;
            }
            else if (req.Type == AssignmentGroupType.IDNET)
            {
                var group = await _db.IDNetAGs
                    .Include(ag => ag.Class).ThenInclude(c => c.Teachers)
                    .FirstOrDefaultAsync(ag => ag.Id == req.AssignmentGroupId);

                if (group == null)
                    return NotFound(new ApiProblemDetails
                    {
                        Title = "Not Found",
                        Detail = "Assignment group not found.",
                        Status = StatusCodes.Status404NotFound,
                        MessageEn = "Assignment group not found.",
                        MessageSk = "Skupina zadania nebola nájdená."
                    });

                if (callerRole == Roles.Teacher && !(group.Class.Teachers?.Any(t => t.Id == callerId) ?? false))
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You can only archive assignment groups in classes you are assigned to.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You can only archive assignment groups in classes you are assigned to.",
                        MessageSk = "Môžete archivovať iba skupiny zadaní v triedach, ku ktorým ste pridelení."
                    });

                group.IsArchived = req.IsArchived;
            }
            else
            {
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Invalid assignment group type.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "Invalid assignment group type.",
                    MessageSk = "Neplatný typ skupiny zadania."
                });
            }

            await _db.SaveChangesAsync();
            return Ok();
        }
    }
}