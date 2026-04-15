using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentSubmit;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentSubmitController : ControllerBase
    {
        [HttpGet("get-current-assignment-attempt")]
        [ProducesResponseType(typeof(GetAssignmentSubmissionAttemptRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<GetAssignmentSubmissionAttemptRes>> GetCurrentAssignmentAttempt([FromQuery] CreateAssignmentSubmissionAttemptReq req)
        {
            if (!TryGetCallerId(out var callerId, out var authError))
                return authError!;

            if (req.AssignmentGroupType == AssignmentGroupType.SUBNET)
            {
                var loadedAssignment = await LoadSubnetAssignmentForStudentAsync(req.AssignmentId, callerId);
                if (loadedAssignment.Error != null) return loadedAssignment.Error;
                if (!IsWithinSubmissionWindow(
                    loadedAssignment.Assignment!.AssignmentGroup.StartDate,
                    loadedAssignment.Assignment!.AssignmentGroup.Deadline,
                    loadedAssignment.Assignment!.AssignmentGroup.CompletedAt
                )) return ForbiddenAssignmentUnavailable();
            }
            else
            {
                var loadedAssignment = await LoadIDNetAssignmentForStudentAsync(req.AssignmentId, callerId);
                if (loadedAssignment.Error != null) return loadedAssignment.Error;
                if (!IsWithinSubmissionWindow(
                    loadedAssignment.Assignment!.AssignmentGroup.StartDate,
                    loadedAssignment.Assignment!.AssignmentGroup.Deadline,
                    loadedAssignment.Assignment!.AssignmentGroup.CompletedAt
                )) return ForbiddenAssignmentUnavailable();
            }

            var hasSubmit = await HasSubmitAsync(req.AssignmentId, req.AssignmentGroupType);
            var attempt = await _db.AssignmentSubmissionAttempts
                .Where(a => a.AssignmentGroupType == req.AssignmentGroupType)
                .Where(a => a.AssignmentId == req.AssignmentId)
                .Where(a => a.StudentId == callerId)
                .OrderByDescending(a => a.StartedAt)
                .ThenByDescending(a => a.Id)
                .FirstOrDefaultAsync();

            if (attempt == null)
            {
                if (hasSubmit) return ForbiddenAlreadySubmitted();

                attempt = new AssignmentSubmissionAttempt
                {
                    AssignmentGroupType = req.AssignmentGroupType,
                    AssignmentId = req.AssignmentId,
                    StudentId = callerId,
                    AttemptNumber = await GetNextAttemptNumberAsync(req.AssignmentId, req.AssignmentGroupType, callerId),
                    Status = AssignmentSubmissionAttemptStatus.ACTIVE,
                    StartedAt = DateTime.UtcNow,
                    LastActivityAt = DateTime.UtcNow,
                    LastVisibleAt = DateTime.UtcNow
                };

                _db.AssignmentSubmissionAttempts.Add(attempt);
                await _db.SaveChangesAsync();
            }

            if (attempt.Status == AssignmentSubmissionAttemptStatus.SUBMITTED && !hasSubmit)
            {
                attempt.Status = AssignmentSubmissionAttemptStatus.ACTIVE;
                await _db.SaveChangesAsync();
            }

            if (attempt.Status == AssignmentSubmissionAttemptStatus.SUBMITTED && hasSubmit)
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

            return Ok(ToAttemptRes(attempt));
        }
    }
}