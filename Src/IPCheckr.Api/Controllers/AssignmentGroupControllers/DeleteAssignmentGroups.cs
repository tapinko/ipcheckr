using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentGroup;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentGroupController : ControllerBase
    {
        [HttpDelete("delete-subnet-assignment-groups")]
        [ProducesResponseType(typeof(void), StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DeleteSubnetAssignmentGroups([FromBody] DeleteSubnetAGsReq req)
        {
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
            _ = int.TryParse(callerIdStr, out int callerId);

            var subnetGroups = await _db.SubnetAGs
                .Include(ag => ag.Class)
                .Where(ag => req.AssignmentGroupIds.Contains(ag.Id))
                .ToListAsync();

            if (subnetGroups.Count != req.AssignmentGroupIds.Length)
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "One or more assignment groups do not exist.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "One or more assignment groups do not exist.",
                    MessageSk = "Jedna alebo viac skupín zadania neexistuje."
                });

            if (callerRole == "Teacher")
            {
                var teacherClassIds = await _db.Classes
                    .Include(c => c.Teachers)
                    .Where(c => c.Teachers!.Any(t => t.Id == callerId))
                    .Select(c => c.Id)
                    .ToListAsync();

                subnetGroups = subnetGroups.Where(ag => teacherClassIds.Contains(ag.Class.Id)).ToList();

                if (subnetGroups.Count == 0)
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You can only delete assignment groups in classes you are assigned to.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You can only delete assignment groups in classes you are assigned to.",
                        MessageSk = "Môžete odstrániť iba skupiny zadaní v triedach, ku ktorým ste pridelení."
                    });
            }
            else
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to delete assignment groups.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to delete assignment groups.",
                    MessageSk = "Nemáte oprávnenie na odstránenie skupín zadania."
                });
            }

            _db.SubnetAGs.RemoveRange(subnetGroups);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("delete-idnet-assignment-groups")]
        [ProducesResponseType(typeof(void), StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DeleteIdNetAssignmentGroups([FromBody] DeleteIDNetAGsReq req)
        {
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
            _ = int.TryParse(callerIdStr, out int callerId);

            var idnetGroups = await _db.IDNetAGs
                .Include(ag => ag.Class)
                .Where(ag => req.AssignmentGroupIds.Contains(ag.Id))
                .ToListAsync();

            if (idnetGroups.Count != req.AssignmentGroupIds.Length)
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "One or more assignment groups do not exist.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "One or more assignment groups do not exist.",
                    MessageSk = "Jedna alebo viac skupín zadania neexistuje."
                });

            if (callerRole == "Teacher")
            {
                var teacherClassIds = await _db.Classes
                    .Include(c => c.Teachers)
                    .Where(c => c.Teachers!.Any(t => t.Id == callerId))
                    .Select(c => c.Id)
                    .ToListAsync();

                idnetGroups = idnetGroups.Where(ag => teacherClassIds.Contains(ag.Class.Id)).ToList();

                if (idnetGroups.Count == 0)
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You can only delete assignment groups in classes you are assigned to.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You can only delete assignment groups in classes you are assigned to.",
                        MessageSk = "Môžete odstrániť iba skupiny zadania v triedach, ku ktorým ste pridelení."
                    });
            }
            else
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to delete assignment groups.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to delete assignment groups.",
                    MessageSk = "Nemáte oprávnenie na odstránenie skupín zadania."
                });
            }

            _db.IDNetAGs.RemoveRange(idnetGroups);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}