using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentSubmit;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentSubmitController : ControllerBase
    {
        [HttpGet("get-assignment-data-for-submit")]
        [ProducesResponseType(typeof(QueryAssignmentDataForSubmitRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QueryAssignmentDataForSubmitRes>> QueryAssignmentDataForSubmit([FromQuery] QueryAssignmentDataForSubmitReq req)
        {
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(callerIdStr, out int callerId))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You must be logged in to access assignment data.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You must be logged in to access assignment data.",
                    MessageSk = "Musíte byť prihlásený, aby ste mohli pristupovať k údajom o zadaní."
                });

            var assignment = await _db.Assignments
                .Include(a => a.AssignmentGroup)
                .Include(a => a.Student)
                .FirstOrDefaultAsync(a => a.Id == req.AssignmentId);

            if (assignment == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Assignment not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Assignment not found.",
                    MessageSk = "Zadanie nebolo nájdené."
                });

            if (assignment.Student.Id != callerId)
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to access this assignment.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to access this assignment.",
                    MessageSk = "Nemáte oprávnenie na prístup k tomuto zadaniu."
                });

            var now = DateTime.UtcNow;
            bool isAvailable = now >= assignment.AssignmentGroup.StartDate
                && now <= assignment.AssignmentGroup.Deadline;

            var submitCount = await _db.AssignmentSubmits
                .Where(s => s.Assignment.Id == assignment.Id)
                .CountAsync();

            if (submitCount >= assignment.AssignmentGroup.PossibleAttempts)
                isAvailable = false;

            var res = new QueryAssignmentDataForSubmitRes
            {
                HostsPerNetwork = assignment.Hosts,
                Cidr = assignment.Cidr,
                IsAvailableForSubmission = isAvailable
            };

            return Ok(res);
        }
    }
}