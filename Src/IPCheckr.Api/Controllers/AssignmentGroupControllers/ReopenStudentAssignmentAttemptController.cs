using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentGroup;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentGroupController : ControllerBase
    {
        [HttpPost("reopen-student-assignment-attempt")]
        [ProducesResponseType(typeof(ReopenStudentAssignmentAttemptRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ReopenStudentAssignmentAttemptRes>> ReopenStudentAssignmentAttempt([FromBody] ReopenStudentAssignmentAttemptReq req)
        {
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(callerIdStr, out var callerId))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You must be logged in to reopen assignment attempts.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You must be logged in to reopen assignment attempts.",
                    MessageSk = "Musíte byť prihlásený, aby ste mohli znovu otvoriť pokusy."
                });

            if (req.AssignmentGroupType == AssignmentGroupType.SUBNET)
            {
                var assignment = await _db.SubnetAssignments
                    .Include(a => a.AssignmentGroup)
                    .ThenInclude(ag => ag.Class)
                    .ThenInclude(c => c.Teachers)
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

                var isTeacherInClass = assignment.AssignmentGroup.Class.Teachers?.Any(t => t.Id == callerId) == true;
                if (!isTeacherInClass)
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You do not have permission to reopen this assignment attempt.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You do not have permission to reopen this assignment attempt.",
                        MessageSk = "Nemáte oprávnenie znovu otvoriť tento pokus."
                    });

                var attempt = await _db.AssignmentSubmissionAttempts
                    .Where(a => a.AssignmentGroupType == AssignmentGroupType.SUBNET)
                    .Where(a => a.AssignmentId == assignment.Id)
                    .Where(a => a.StudentId == assignment.Student.Id)
                    .OrderByDescending(a => a.StartedAt)
                    .ThenByDescending(a => a.Id)
                    .FirstOrDefaultAsync();

                if (attempt == null)
                    return NotFound(new ApiProblemDetails
                    {
                        Title = "Not Found",
                        Detail = "Assignment attempt not found.",
                        Status = StatusCodes.Status404NotFound,
                        MessageEn = "Assignment attempt not found.",
                        MessageSk = "Pokus o odovzdanie nebol nájdený."
                    });

                if (attempt.Status == AssignmentSubmissionAttemptStatus.SUBMITTED)
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "Submitted attempts cannot be reopened.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "Submitted attempts cannot be reopened.",
                        MessageSk = "Odovzdaný pokus nie je možné znova otvoriť."
                    });

                attempt.Status = AssignmentSubmissionAttemptStatus.ACTIVE;
                attempt.ReopenCount += 1;
                attempt.LastReopenedAt = DateTime.UtcNow;
                attempt.LockedAt = null;
                attempt.LockReason = null;
                attempt.LastActivityAt = DateTime.UtcNow;

                await _db.SaveChangesAsync();
                await _attemptEventsPublisher.PublishAttemptChangedAsync(
                    AssignmentGroupType.SUBNET,
                    assignment.AssignmentGroup.Id,
                    assignment.Id,
                    assignment.Student.Id,
                    attempt.Status);

                return Ok(new ReopenStudentAssignmentAttemptRes
                {
                    AssignmentAttemptId = attempt.Id,
                    Status = attempt.Status,
                    ReopenCount = attempt.ReopenCount,
                    LastReopenedAt = attempt.LastReopenedAt
                });
            }

            var idNetAssignment = await _db.IDNetAssignments
                .Include(a => a.AssignmentGroup)
                .ThenInclude(ag => ag.Class)
                .ThenInclude(c => c.Teachers)
                .Include(a => a.Student)
                .FirstOrDefaultAsync(a => a.Id == req.AssignmentId);

            if (idNetAssignment == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Assignment not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Assignment not found.",
                    MessageSk = "Zadanie nebolo nájdené."
                });

            var teacherInClass = idNetAssignment.AssignmentGroup.Class.Teachers?.Any(t => t.Id == callerId) == true;
            if (!teacherInClass)
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to reopen this assignment attempt.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to reopen this assignment attempt.",
                    MessageSk = "Nemáte oprávnenie znovu otvoriť tento pokus."
                });

            var idNetAttempt = await _db.AssignmentSubmissionAttempts
                .Where(a => a.AssignmentGroupType == AssignmentGroupType.IDNET)
                .Where(a => a.AssignmentId == idNetAssignment.Id)
                .Where(a => a.StudentId == idNetAssignment.Student.Id)
                .OrderByDescending(a => a.StartedAt)
                .ThenByDescending(a => a.Id)
                .FirstOrDefaultAsync();

            if (idNetAttempt == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Assignment attempt not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Assignment attempt not found.",
                    MessageSk = "Pokus o odovzdanie nebol nájdený."
                });

            if (idNetAttempt.Status == AssignmentSubmissionAttemptStatus.SUBMITTED)
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "Submitted attempts cannot be reopened.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "Submitted attempts cannot be reopened.",
                    MessageSk = "Odovzdaný pokus nie je možné znova otvoriť."
                });

            idNetAttempt.Status = AssignmentSubmissionAttemptStatus.ACTIVE;
            idNetAttempt.ReopenCount += 1;
            idNetAttempt.LastReopenedAt = DateTime.UtcNow;
            idNetAttempt.LockedAt = null;
            idNetAttempt.LockReason = null;
            idNetAttempt.LastActivityAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await _attemptEventsPublisher.PublishAttemptChangedAsync(
                AssignmentGroupType.IDNET,
                idNetAssignment.AssignmentGroup.Id,
                idNetAssignment.Id,
                idNetAssignment.Student.Id,
                idNetAttempt.Status);

            return Ok(new ReopenStudentAssignmentAttemptRes
            {
                AssignmentAttemptId = idNetAttempt.Id,
                Status = idNetAttempt.Status,
                ReopenCount = idNetAttempt.ReopenCount,
                LastReopenedAt = idNetAttempt.LastReopenedAt
            });
        }
    }
}