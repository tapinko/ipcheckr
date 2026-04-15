using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentSubmit;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentSubmitController : ControllerBase
    {
        [HttpPut("save-assignment-attempt-draft")]
        [ProducesResponseType(typeof(SaveAssignmentSubmissionAttemptDraftRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<SaveAssignmentSubmissionAttemptDraftRes>> SaveAssignmentAttemptDraft([FromBody] SaveAssignmentSubmissionAttemptDraftReq req)
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

            if (attempt.Status is AssignmentSubmissionAttemptStatus.LOCKED or AssignmentSubmissionAttemptStatus.SUBMITTED)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "Assignment attempt is locked.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "Assignment attempt is locked.",
                    MessageSk = "Pokus o odovzdanie je uzamknutý."
                });
            }

            attempt.DraftJson = SerializeDraftPayload(req.SubnetData, req.IdNetData);
            attempt.LastActivityAt = DateTime.UtcNow;
            attempt.LastVisibleAt ??= DateTime.UtcNow;
            attempt.Status = AssignmentSubmissionAttemptStatus.ACTIVE;

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

            return Ok(new SaveAssignmentSubmissionAttemptDraftRes
            {
                AssignmentAttemptId = attempt.Id,
                LastActivityAt = attempt.LastActivityAt ?? DateTime.UtcNow
            });
        }
    }
}