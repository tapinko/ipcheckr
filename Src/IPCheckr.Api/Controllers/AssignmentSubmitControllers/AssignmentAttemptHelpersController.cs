using System.Text.Json;
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
        private static readonly JsonSerializerOptions DraftJsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        private bool TryGetCallerId(out int callerId, out ActionResult? error)
        {
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(callerIdStr, out callerId))
            {
                error = StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You must be logged in to access assignment attempts.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You must be logged in to access assignment attempts.",
                    MessageSk = "Musíte byť prihlásený, aby ste mohli pristupovať k pokusom."
                });
                return false;
            }

            error = null;
            return true;
        }

        private async Task<(SubnetAssignment? Assignment, ActionResult? Error)> LoadSubnetAssignmentForStudentAsync(int assignmentId, int callerId)
        {
            var assignment = await _db.SubnetAssignments
                .Include(a => a.AssignmentGroup)
                .ThenInclude(ag => ag.Class)
                .ThenInclude(c => c.Teachers)
                .Include(a => a.Student)
                .FirstOrDefaultAsync(a => a.Id == assignmentId);

            if (assignment == null)
            {
                return (null, NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Assignment not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Assignment not found.",
                    MessageSk = "Zadanie nebolo nájdené."
                }));
            }

            if (assignment.Student.Id != callerId)
            {
                return (null, StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to access this assignment.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to access this assignment.",
                    MessageSk = "Nemáte oprávnenie na prístup k tomuto zadaniu."
                }));
            }

            return (assignment, null);
        }

        private async Task<(IDNetAssignment? Assignment, ActionResult? Error)> LoadIDNetAssignmentForStudentAsync(int assignmentId, int callerId)
        {
            var assignment = await _db.IDNetAssignments
                .Include(a => a.AssignmentGroup)
                .ThenInclude(ag => ag.Class)
                .ThenInclude(c => c.Teachers)
                .Include(a => a.Student)
                .FirstOrDefaultAsync(a => a.Id == assignmentId);

            if (assignment == null)
            {
                return (null, NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Assignment not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Assignment not found.",
                    MessageSk = "Zadanie nebolo nájdené."
                }));
            }

            if (assignment.Student.Id != callerId)
            {
                return (null, StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to access this assignment.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to access this assignment.",
                    MessageSk = "Nemáte oprávnenie na prístup k tomuto zadaniu."
                }));
            }

            return (assignment, null);
        }

        private async Task<(AssignmentSubmissionAttempt? Attempt, ActionResult? Error)> LoadOwnedAttemptAsync(int attemptId, int callerId)
        {
            var attempt = await _db.AssignmentSubmissionAttempts
                .FirstOrDefaultAsync(a => a.Id == attemptId);

            if (attempt == null)
            {
                return (null, NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Assignment attempt not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Assignment attempt not found.",
                    MessageSk = "Pokus o odovzdanie nebol nájdený."
                }));
            }

            if (attempt.StudentId != callerId)
            {
                return (null, StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to access this assignment attempt.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to access this assignment attempt.",
                    MessageSk = "Nemáte oprávnenie na prístup k tomuto pokusu."
                }));
            }

            return (attempt, null);
        }

        private async Task<(AssignmentSubmissionAttempt? Attempt, ActionResult? Error)> LoadAttemptAsync(int attemptId)
        {
            var attempt = await _db.AssignmentSubmissionAttempts
                .FirstOrDefaultAsync(a => a.Id == attemptId);

            if (attempt == null)
            {
                return (null, NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Assignment attempt not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Assignment attempt not found.",
                    MessageSk = "Pokus o odovzdanie nebol nájdený."
                }));
            }

            return (attempt, null);
        }

        private async Task<(AssignmentSubmissionAttempt? Attempt, ActionResult? Error)> IsTeacherInAssignmentClassAsync(AssignmentSubmissionAttempt attempt, int callerId)
        {
            if (attempt.AssignmentGroupType == AssignmentGroupType.SUBNET)
            {
                var assignment = await _db.SubnetAssignments
                    .Include(a => a.AssignmentGroup)
                        .ThenInclude(ag => ag.Class)
                            .ThenInclude(c => c.Teachers)
                    .FirstOrDefaultAsync(a => a.Id == attempt.AssignmentId);

                if (assignment == null)
                {
                    return (null, NotFound(new ApiProblemDetails
                    {
                        Title = "Not Found",
                        Detail = "Assignment not found.",
                        Status = StatusCodes.Status404NotFound,
                        MessageEn = "Assignment not found.",
                        MessageSk = "Zadanie nebolo nájdené."
                    }));
                }

                var isTeacherInClass = assignment.AssignmentGroup.Class.Teachers?.Any(t => t.Id == callerId) == true;
                if (!isTeacherInClass)
                {
                    return (null, StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You do not have permission to reopen this assignment attempt.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You do not have permission to reopen this assignment attempt.",
                        MessageSk = "Nemáte oprávnenie znovu otvoriť tento pokus."
                    }));
                }

                return (attempt, null);
            }

            var idNetAssignment = await _db.IDNetAssignments
                .Include(a => a.AssignmentGroup)
                    .ThenInclude(ag => ag.Class)
                        .ThenInclude(c => c.Teachers)
                .FirstOrDefaultAsync(a => a.Id == attempt.AssignmentId);

            if (idNetAssignment == null)
            {
                return (null, NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Assignment not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Assignment not found.",
                    MessageSk = "Zadanie nebolo nájdené."
                }));
            }

            var teacherInClass = idNetAssignment.AssignmentGroup.Class.Teachers?.Any(t => t.Id == callerId) == true;
            if (!teacherInClass)
            {
                return (null, StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to reopen this assignment attempt.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to reopen this assignment attempt.",
                    MessageSk = "Nemáte oprávnenie znovu otvoriť tento pokus."
                }));
            }

            return (attempt, null);
        }

        private async Task<bool> HasSubmitAsync(int assignmentId, AssignmentGroupType type)
        {
            return type == AssignmentGroupType.SUBNET
                ? await _db.SubnetAssignmentSubmits.AnyAsync(s => s.Assignment.Id == assignmentId)
                : await _db.IDNetAssignmentSubmits.AnyAsync(s => s.Assignment.Id == assignmentId);
        }

        private async Task<int?> ResolveAssignmentGroupIdAsync(AssignmentSubmissionAttempt attempt)
        {
            if (attempt.AssignmentGroupType == AssignmentGroupType.SUBNET)
            {
                return await _db.SubnetAssignments
                    .Where(a => a.Id == attempt.AssignmentId)
                    .Select(a => (int?)a.AssignmentGroup.Id)
                    .FirstOrDefaultAsync();
            }

            return await _db.IDNetAssignments
                .Where(a => a.Id == attempt.AssignmentId)
                .Select(a => (int?)a.AssignmentGroup.Id)
                .FirstOrDefaultAsync();
        }

        private static bool IsWithinSubmissionWindow(DateTime startDate, DateTime deadline, DateTime? completedAt)
        {
            var now = DateTime.Now;
            var startUtc = AssignmentEvaluationUtils.NormalizeToLocalComparison(startDate);
            var deadlineUtc = AssignmentEvaluationUtils.NormalizeToLocalComparison(deadline);
            return now >= startUtc && now <= deadlineUtc && completedAt == null;
        }

        private ActionResult ForbiddenAssignmentUnavailable()
        {
            return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
            {
                Title = "Forbidden",
                Detail = "Assignment is not available for submission.",
                Status = StatusCodes.Status403Forbidden,
                MessageEn = "Assignment is not available for submission.",
                MessageSk = "Zadanie nie je dostupné na odovzdanie."
            });
        }

        private ActionResult ForbiddenAlreadySubmitted()
        {
            return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
            {
                Title = "Forbidden",
                Detail = "Assignment has already been submitted.",
                Status = StatusCodes.Status403Forbidden,
                MessageEn = "Assignment has already been submitted.",
                MessageSk = "Zadanie už bolo odovzdané."
            });
        }

        private async Task<int> GetNextAttemptNumberAsync(int assignmentId, AssignmentGroupType type, int callerId)
        {
            return (await _db.AssignmentSubmissionAttempts
                .Where(a => a.AssignmentGroupType == type && a.AssignmentId == assignmentId && a.StudentId == callerId)
                .MaxAsync(a => (int?)a.AttemptNumber) ?? 0) + 1;
        }

        private static string SerializeDraftPayload(SubmitSubnetAssignmentField[]? subnetData, SubmitIDNetAssignmentField[]? idNetData)
        {
            return JsonSerializer.Serialize(new AssignmentSubmissionDraftPayload
            {
                SubnetData = subnetData,
                IdNetData = idNetData
            }, DraftJsonOptions);
        }

        private static AssignmentSubmissionDraftPayload? DeserializeDraftPayload(string? draftJson)
        {
            if (string.IsNullOrWhiteSpace(draftJson))
                return null;

            return JsonSerializer.Deserialize<AssignmentSubmissionDraftPayload>(draftJson, DraftJsonOptions);
        }

        private static CreateAssignmentSubmissionAttemptRes ToAttemptRes(AssignmentSubmissionAttempt attempt)
        {
            var draft = DeserializeDraftPayload(attempt.DraftJson);
            return new CreateAssignmentSubmissionAttemptRes
            {
                AssignmentAttemptId = attempt.Id,
                AssignmentId = attempt.AssignmentId,
                AssignmentGroupType = attempt.AssignmentGroupType,
                Status = attempt.Status,
                AttemptNumber = attempt.AttemptNumber,
                LockToken = attempt.LockToken,
                StartedAt = attempt.StartedAt,
                LastActivityAt = attempt.LastActivityAt,
                LastVisibleAt = attempt.LastVisibleAt,
                LockedAt = attempt.LockedAt,
                LastReopenedAt = attempt.LastReopenedAt,
                SubmittedAt = attempt.SubmittedAt,
                VisibilityIncidentCount = attempt.VisibilityIncidentCount,
                ReopenCount = attempt.ReopenCount,
                DraftJson = attempt.DraftJson,
                SubnetData = draft?.SubnetData,
                IdNetData = draft?.IdNetData
            };
        }

        private sealed class AssignmentSubmissionDraftPayload
        {
            public SubmitSubnetAssignmentField[]? SubnetData { get; set; }

            public SubmitIDNetAssignmentField[]? IdNetData { get; set; }
        }
    }
}