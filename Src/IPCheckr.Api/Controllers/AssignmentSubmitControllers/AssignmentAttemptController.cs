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
        [HttpPost("create-or-get-assignment-attempt")]
        [ProducesResponseType(typeof(CreateAssignmentSubmissionAttemptRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<CreateAssignmentSubmissionAttemptRes>> CreateOrGetAssignmentAttempt([FromBody] CreateAssignmentSubmissionAttemptReq req)
        {
            if (!TryGetCallerId(out var callerId, out var authError)) return authError!;

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

            var existingAttempt = await _db.AssignmentSubmissionAttempts
                .Where(a => a.AssignmentGroupType == req.AssignmentGroupType)
                .Where(a => a.AssignmentId == req.AssignmentId)
                .Where(a => a.StudentId == callerId)
                .OrderByDescending(a => a.StartedAt)
                .ThenByDescending(a => a.Id)
                .FirstOrDefaultAsync();

            if (existingAttempt == null)
            {
                var hasSubmit = await HasSubmitAsync(req.AssignmentId, req.AssignmentGroupType);
                if (hasSubmit)
                {
                    return ForbiddenAlreadySubmitted();
                }

                existingAttempt = new AssignmentSubmissionAttempt
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

                _db.AssignmentSubmissionAttempts.Add(existingAttempt);
                await _db.SaveChangesAsync();
            }

            return Ok(ToAttemptRes(existingAttempt));
        }
    }
}