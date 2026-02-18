using IPCheckr.Api.DTOs.Assignment;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.Common.Utils;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentController : ControllerBase
    {
        [HttpGet("get-subnet-assignments")]
        [ProducesResponseType(typeof(QuerySubnetAssignmentsRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<QuerySubnetAssignmentsRes>> QuerySubnetAssignments([FromQuery] QuerySubnetAssignmentsReq req)
        {
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(callerIdStr, out int callerId))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You must be logged in to access assignments.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You must be logged in to access assignments.",
                    MessageSk = "Musíte byť prihlásený, aby ste mohli pristupovať k zadaním."
                });

            if (callerId != req.StudentId)
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to access assignments for this student.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to access assignments for this student.",
                    MessageSk = "Nemáte oprávnenie na prístup k zadaním tohto študenta."
                });

            var subnetAssignments = await _db.SubnetAssignments
                .Where(a => a.Student.Id == req.StudentId)
                .Include(a => a.Student)
                .Include(a => a.AssignmentGroup)
                    .ThenInclude(ag => ag.Class)
                        .ThenInclude(c => c.Teachers)
                .ToListAsync();

            var subnetIds = subnetAssignments.Select(a => a.Id).ToArray();
            var subnetSubmits = subnetIds.Length > 0
                ? await _db.SubnetAssignmentSubmits.Where(s => subnetIds.Contains(s.Assignment.Id)).ToListAsync()
                : new List<SubnetAssignmentSubmit>();
            var subnetAnswerKeys = subnetIds.Length > 0
                ? await _db.SubnetAssignmentAnswerKeys.Where(ak => subnetIds.Contains(ak.Assignment.Id)).ToListAsync()
                : new List<SubnetAssignmentAnswerKey>();

            var assignmentDtos = new List<SubnetAssignmentDto>();

            foreach (var assignment in subnetAssignments)
            {
                var group = assignment.AssignmentGroup;
                var submit = subnetSubmits
                    .Where(s => s.Assignment.Id == assignment.Id)
                    .OrderByDescending(s => s.SubmittedAt)
                    .FirstOrDefault();
                var answerKey = subnetAnswerKeys.FirstOrDefault(ak => ak.Assignment.Id == assignment.Id);
                var successRate = AssignmentEvaluationUtils.CalculateSubnetSuccessRate(answerKey, submit);

                var status = AssignmentEvaluationUtils.ResolveStatus(group.StartDate, group.Deadline, group.CompletedAt);
                var teacherUsernameRaw = group.Class.Teachers?.FirstOrDefault()?.Username ?? "Unknown";
                var teacherUsername = UsernameUtils.ToDisplay(teacherUsernameRaw);

                assignmentDtos.Add(new SubnetAssignmentDto
                {
                    AssignmentId = assignment.Id,
                    Name = group.Name,
                    AssignmentGroupDescription = group.Description,
                    StartDate = group.StartDate,
                    Deadline = group.Deadline,
                    TeacherUsername = teacherUsername,
                    ClassName = group.Class.Name,
                    Status = status,
                    IpCat = group.AssignmentIpCat,
                    SuccessRate = submit != null ? successRate : null
                });
            }

            return Ok(new QuerySubnetAssignmentsRes
            {
                Assignments = assignmentDtos.ToArray(),
                TotalCount = assignmentDtos.Count
            });
        }

        [HttpGet("get-idnet-assignments")]
        [ProducesResponseType(typeof(QueryIDNetAssignmentsRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<QueryIDNetAssignmentsRes>> QueryIdNetAssignments([FromQuery] QueryIDNetAssignmentsReq req)
        {
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(callerIdStr, out int callerId))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You must be logged in to access assignments.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You must be logged in to access assignments.",
                    MessageSk = "Musíte byť prihlásený, aby ste mohli pristupovať k zadaním."
                });

            if (callerId != req.StudentId)
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to access assignments for this student.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to access assignments for this student.",
                    MessageSk = "Nemáte oprávnenie na prístup k zadaním tohto študenta."
                });

            var idnetAssignments = await _db.IDNetAssignments
                .Where(a => a.Student.Id == req.StudentId)
                .Include(a => a.Student)
                .Include(a => a.AssignmentGroup)
                    .ThenInclude(ag => ag.Class)
                        .ThenInclude(c => c.Teachers)
                .ToListAsync();

            var idnetIds = idnetAssignments.Select(a => a.Id).ToArray();
            var idnetSubmits = idnetIds.Length > 0
                ? await _db.IDNetAssignmentSubmits.Where(s => idnetIds.Contains(s.Assignment.Id)).ToListAsync()
                : new List<IDNetAssignmentSubmit>();
            var idnetAnswerKeys = idnetIds.Length > 0
                ? await _db.IDNetAssignmentAnswerKeys.Where(ak => idnetIds.Contains(ak.Assignment.Id)).ToListAsync()
                : new List<IDNetAssignmentAnswerKey>();

            var assignmentDtos = new List<IDNetAssignmentDto>();

            foreach (var assignment in idnetAssignments)
            {
                var group = assignment.AssignmentGroup;
                var submit = idnetSubmits
                    .Where(s => s.Assignment.Id == assignment.Id)
                    .OrderByDescending(s => s.SubmittedAt)
                    .FirstOrDefault();
                var answerKey = idnetAnswerKeys.FirstOrDefault(ak => ak.Assignment.Id == assignment.Id);
                var successRate = AssignmentEvaluationUtils.CalculateIdNetSuccessRate(answerKey, submit, group.TestWildcard, group.TestFirstLastBr);

                var status = AssignmentEvaluationUtils.ResolveStatus(group.StartDate, group.Deadline, group.CompletedAt);
                var teacherUsernameRaw = group.Class.Teachers?.FirstOrDefault()?.Username ?? "Unknown";
                var teacherUsername = UsernameUtils.ToDisplay(teacherUsernameRaw);

                assignmentDtos.Add(new IDNetAssignmentDto
                {
                    AssignmentId = assignment.Id,
                    Name = group.Name,
                    AssignmentGroupDescription = group.Description,
                    StartDate = group.StartDate,
                    Deadline = group.Deadline,
                    TeacherUsername = teacherUsername,
                    ClassName = group.Class.Name,
                    Status = status,
                    IpCat = group.AssignmentIpCat,
                    SuccessRate = submit != null ? successRate : null
                });
            }

            return Ok(new QueryIDNetAssignmentsRes
            {
                Assignments = assignmentDtos.ToArray(),
                TotalCount = assignmentDtos.Count
            });
        }
    }
}