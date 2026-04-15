using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentSubmit;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentSubmitController : ControllerBase
    {
        [HttpPost("lock-assignment-attempt")]
        [ProducesResponseType(typeof(GetAssignmentSubmissionAttemptRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<GetAssignmentSubmissionAttemptRes>> LockAssignmentAttempt([FromBody] SaveAssignmentSubmissionAttemptDraftReq req)
        {
            if (!TryGetCallerId(out var callerId, out var authError)) return authError!;

            var attemptResult = await LoadOwnedAttemptAsync(req.AssignmentAttemptId, callerId);
            if (attemptResult.Error != null) return attemptResult.Error;

            var attempt = attemptResult.Attempt!;
            if (!string.Equals(attempt.LockToken, req.LockToken, StringComparison.Ordinal))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "Invalid assignment attempt lock token.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "Invalid assignment attempt lock token.",
                    MessageSk = "Neplatný token pre pokus o odovzdanie."
                });
            }

            if (attempt.Status != AssignmentSubmissionAttemptStatus.SUBMITTED)
            {
                attempt.DraftJson = SerializeDraftPayload(req.SubnetData, req.IdNetData);
                attempt.Status = AssignmentSubmissionAttemptStatus.LOCKED;
                attempt.LockedAt = DateTime.UtcNow;
                attempt.VisibilityIncidentCount += 1;
                attempt.LastVisibleAt = DateTime.UtcNow;
                attempt.LastActivityAt = DateTime.UtcNow;
                attempt.LockReason = "VISIBILITY_CHANGE";
                await _db.SaveChangesAsync();

                var assignmentGroupId = await ResolveAssignmentGroupIdAsync(attempt);
                if (assignmentGroupId.HasValue)
                {
                    await _attemptEventsPublisher.PublishAttemptChangedAsync(
                        attempt.AssignmentGroupType,
                        assignmentGroupId.Value,
                        attempt.AssignmentId,
                        attempt.StudentId,
                        attempt.Status);
                }
            }

            return Ok(ToAttemptRes(attempt));
        }
    }
}