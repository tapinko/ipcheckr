using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentGroup;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentGroupController : ControllerBase
    {
        [HttpDelete("delete-assignment-groups")]
        [ProducesResponseType(typeof(void), StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DeleteAssignmentGroups([FromBody] DeleteAssignmentGroupsReq req)
        {
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            _ = int.TryParse(callerIdStr, out int callerId);

            var groupsToDelete = await _db.AssignmentGroups
                .Include(ag => ag.Class)
                .Where(ag => req.AssignmentGroupIds.Contains(ag.Id))
                .ToListAsync();

            if (groupsToDelete.Count != req.AssignmentGroupIds.Length)
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "One or more assignment groups do not exist.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "One or more assignment groups do not exist.",
                    MessageSk = "Jedna alebo viac skupín úloh neexistuje."
                });

            if (callerRole == "Teacher")
            {
                var teacherClassIds = await _db.Classes
                    .Include(c => c.Teachers)
                    .Where(c => c.Teachers!.Any(t => t.Id == callerId))
                    .Select(c => c.Id)
                    .ToListAsync();

                var allowedGroups = groupsToDelete.Where(ag => teacherClassIds.Contains(ag.Class.Id)).ToList();

                if (allowedGroups.Count == 0)
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You can only delete assignment groups in classes you are assigned to.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You can only delete assignment groups in classes you are assigned to.",
                        MessageSk = "Môžete odstrániť iba skupiny úloh v triedach, ku ktorým ste pridelení."
                    });

                groupsToDelete = allowedGroups;
            }
            else
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to delete assignment groups.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to delete assignment groups.",
                    MessageSk = "Nemáte oprávnenie na odstránenie skupín úloh."
                });
            }

            _db.AssignmentGroups.RemoveRange(groupsToDelete);

            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}