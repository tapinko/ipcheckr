using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentSubmit;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentSubmitController : ControllerBase
    {
        [HttpPost("submit-idnet-assignment")]
        [ProducesResponseType(typeof(SubmitIDNetAssignmentRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<SubmitIDNetAssignmentRes>> SubmitIdNetAssignment([FromBody] SubmitIDNetAssignmentReq req)
        {
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(callerIdStr, out int callerId))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You must be logged in to submit assignments.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You must be logged in to submit assignments.",
                    MessageSk = "Musíte byť prihlásený, aby ste mohli odovzdávať zadania."
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

            var now = DateTime.Now;
            var startUtc = AssignmentEvaluationUtils.NormalizeToLocalComparison(assignment.AssignmentGroup.StartDate);
            var deadlineUtc = AssignmentEvaluationUtils.NormalizeToLocalComparison(assignment.AssignmentGroup.Deadline);
            var isInSubmissionWindow =
                now >= startUtc &&
                now <= deadlineUtc &&
                assignment.AssignmentGroup.CompletedAt == null;
            if (!isInSubmissionWindow)
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "Assignment is not available for submission.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "Assignment is not available for submission.",
                    MessageSk = "Zadanie nie je dostupné na odovzdanie."
                });

            AssignmentSubmissionAttempt? attempt = null;
            if (req.AssignmentAttemptId.HasValue)
            {
                attempt = await _db.AssignmentSubmissionAttempts
                    .FirstOrDefaultAsync(a => a.Id == req.AssignmentAttemptId.Value);

                if (attempt == null)
                    return NotFound(new ApiProblemDetails
                    {
                        Title = "Not Found",
                        Detail = "Assignment attempt not found.",
                        Status = StatusCodes.Status404NotFound,
                        MessageEn = "Assignment attempt not found.",
                        MessageSk = "Pokus o odovzdanie nebol nájdený."
                    });

                if (attempt.StudentId != callerId || attempt.AssignmentGroupType != AssignmentGroupType.IDNET || attempt.AssignmentId != assignment.Id)
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You do not have permission to access this assignment attempt.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You do not have permission to access this assignment attempt.",
                        MessageSk = "Nemáte oprávnenie na prístup k tomuto pokusu."
                    });

                if (!string.Equals(attempt.LockToken, req.AssignmentAttemptLockToken, StringComparison.Ordinal))
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "Invalid assignment attempt lock token.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "Invalid assignment attempt lock token.",
                        MessageSk = "Neplatný token pre pokus o odovzdanie."
                    });

                if (attempt.Status is AssignmentSubmissionAttemptStatus.LOCKED or AssignmentSubmissionAttemptStatus.SUBMITTED)
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "Assignment attempt is locked.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "Assignment attempt is locked.",
                        MessageSk = "Pokus o odovzdanie je uzamknutý."
                    });
            }

            var alreadySubmitted = await _db.IDNetAssignmentSubmits.AnyAsync(s => s.Assignment.Id == assignment.Id);
            if (alreadySubmitted)
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "Assignment has already been submitted.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "Assignment has already been submitted.",
                    MessageSk = "Zadanie už bolo odovzdané."
                });

            var data = req.Data ?? Array.Empty<SubmitIDNetAssignmentField>();
            var idnets = data.Select(d => d.IDNet ?? string.Empty).ToArray();
            var wildcards = data.Select(d => d.Wildcard ?? string.Empty).ToArray();
            var firstUsables = data.Select(d => d.FirstUsable ?? string.Empty).ToArray();
            var lastUsables = data.Select(d => d.LastUsable ?? string.Empty).ToArray();
            var broadcasts = data.Select(d => d.Broadcast ?? string.Empty).ToArray();

            if (attempt != null)
            {
                attempt.DraftJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    IdNetData = data

                });
                attempt.Status = AssignmentSubmissionAttemptStatus.SUBMITTED;
                attempt.SubmittedAt = DateTime.UtcNow;
                attempt.LastActivityAt = DateTime.UtcNow;
            }

            var submit = new IDNetAssignmentSubmit
            {
                Assignment = assignment,
                Attempt = attempt,
                IDNet = idnets,
                Wildcard = wildcards,
                FirstUsables = firstUsables,
                LastUsables = lastUsables,
                Broadcasts = broadcasts,
                SubmittedAt = DateTime.UtcNow
            };

            _db.IDNetAssignmentSubmits.Add(submit);

            var answerKey = await _db.IDNetAssignmentAnswerKeys
                .FirstOrDefaultAsync(ak => ak.Assignment.Id == assignment.Id);

            if (answerKey == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Answer key not found for this assignment.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Answer key not found for this assignment.",
                    MessageSk = "Kľúč odpovedí pre toto zadanie nebol nájdený."
                });

            assignment.CompletedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            var groupAssignmentIds = await _db.IDNetAssignments
                .Where(a => a.AssignmentGroup.Id == assignment.AssignmentGroup.Id)
                .Select(a => a.Id)
                .ToListAsync();

            var submittedCount = await _db.IDNetAssignmentSubmits
                .CountAsync(s => groupAssignmentIds.Contains(s.Assignment.Id));

            var totalAssignments = groupAssignmentIds.Count;
            if (totalAssignments > 0 && submittedCount >= totalAssignments)
            {
                assignment.AssignmentGroup.CompletedAt = DateTime.UtcNow;
                assignment.AssignmentGroup.Status = AssignmentGroupStatus.ENDED;
                await _db.SaveChangesAsync();
            }

            return Ok(new SubmitIDNetAssignmentRes
            {
                AssignmentSubmitId = submit.Id
            });
        }
    }
}