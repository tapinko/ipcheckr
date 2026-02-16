using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentSubmit;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentSubmitController : ControllerBase
    {
        [HttpGet("get-subnet-assignment-data-for-submit")]
        [ProducesResponseType(typeof(QuerySubnetAssignmentDataForSubmitRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QuerySubnetAssignmentDataForSubmitRes>> QuerySubnetAssignmentDataForSubmit([FromQuery] QuerySubnetAssignmentDataForSubmitReq req)
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

            var assignment = await _db.SubnetAssignments
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

            var status = AssignmentEvaluationUtils.ResolveStatus(assignment.AssignmentGroup.StartDate, assignment.AssignmentGroup.Deadline, assignment.AssignmentGroup.CompletedAt);
            var hasSubmit = await _db.SubnetAssignmentSubmits.AnyAsync(s => s.Assignment.Id == assignment.Id);
            var isAvailable = status == AssignmentGroupStatus.IN_PROGRESS && !hasSubmit;

            return Ok(new QuerySubnetAssignmentDataForSubmitRes
            {
                HostsPerNetwork = assignment.Hosts,
                Cidr = assignment.Cidr,
                IsAvailableForSubmission = isAvailable,
                Deadline = assignment.AssignmentGroup.Deadline
            });
        }

        [HttpGet("get-idnet-assignment-data-for-submit")]
        [ProducesResponseType(typeof(QueryIDNetAssignmentDataForSubmitRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QueryIDNetAssignmentDataForSubmitRes>> QueryIdNetAssignmentDataForSubmit([FromQuery] QueryIDNetAssignmentDataForSubmitReq req)
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

            var assignment = await _db.IDNetAssignments
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

            var status = AssignmentEvaluationUtils.ResolveStatus(assignment.AssignmentGroup.StartDate, assignment.AssignmentGroup.Deadline, assignment.AssignmentGroup.CompletedAt);
            var hasSubmit = await _db.IDNetAssignmentSubmits.AnyAsync(s => s.Assignment.Id == assignment.Id);
            var isAvailable = status == AssignmentGroupStatus.IN_PROGRESS && !hasSubmit;

            return Ok(new QueryIDNetAssignmentDataForSubmitRes
            {
                Addresses = assignment.Addresses,
                TestWildcard = assignment.AssignmentGroup.TestWildcard,
                TestFirstLastBr = assignment.AssignmentGroup.TestFirstLastBr,
                IsAvailableForSubmission = isAvailable,
                Deadline = assignment.AssignmentGroup.Deadline
            });
        }
    }
}