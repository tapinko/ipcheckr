using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentSubmit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentSubmitController : ControllerBase
    {
        [HttpPost("reopen-assignment-attempt")]
        [Authorize(Policy = Roles.Teacher)]
        [ProducesResponseType(typeof(ReopenAssignmentSubmissionAttemptRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ReopenAssignmentSubmissionAttemptRes>> ReopenAssignmentAttempt([FromBody] ReopenAssignmentSubmissionAttemptReq req)
        {
            if (!TryGetCallerId(out var callerId, out var authError)) return authError!;
            var attemptResult = await LoadAttemptAsync(req.AssignmentAttemptId);
            if (attemptResult.Error != null) return attemptResult.Error;
            var attempt = attemptResult.Attempt!;
            var assignmentCheck = await IsTeacherInAssignmentClassAsync(attempt, callerId);
            if (assignmentCheck.Error != null) return assignmentCheck.Error;
            if (attempt.Status == AssignmentSubmissionAttemptStatus.SUBMITTED)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "Submitted attempts cannot be reopened.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "Submitted attempts cannot be reopened.",
                    MessageSk = "Odovzdaný pokus nie je možné znova otvoriť."
                });
            }

            attempt.Status = AssignmentSubmissionAttemptStatus.ACTIVE;
            attempt.ReopenCount += 1;
            attempt.LastReopenedAt = DateTime.UtcNow;
            attempt.LockedAt = null;
            attempt.LockReason = null;
            attempt.LastActivityAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            var reopenedGroupId = await ResolveAssignmentGroupIdAsync(attempt);
            if (reopenedGroupId.HasValue)
            {
                await _attemptEventsPublisher.PublishAttemptChangedAsync(
                    attempt.AssignmentGroupType,
                    reopenedGroupId.Value,
                    attempt.AssignmentId,
                    attempt.StudentId,
                    attempt.Status);
            }

            return Ok(ToAttemptRes(attempt));
        }
    }
}