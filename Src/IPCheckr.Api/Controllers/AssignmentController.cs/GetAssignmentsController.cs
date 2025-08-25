using IPCheckr.Api.DTOs.Assignment;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentController : ControllerBase
    {
        [HttpGet("get-assignments")]
        [ProducesResponseType(typeof(QueryAssignmentsRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<QueryAssignmentsRes>> QueryAssignments([FromQuery] QueryAssignmentsReq req)
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

            var assignments = await _db.Assignments
                .Where(a => a.Student.Id == req.StudentId)
                .Include(a => a.Student)
                .Include(a => a.AssignmentGroup)
                    .ThenInclude(ag => ag.Class)
                        .ThenInclude(c => c.Teachers)
                .ToListAsync();

            var assignmentIds = assignments.Select(a => a.Id).ToArray();

            var submitsList = await _db.AssignmentSubmits
                .Where(s => assignmentIds.Contains(s.Assignment.Id))
                .Include(s => s.Assignment)
                .ToListAsync();

            var submitsByAssignment = submitsList
                .GroupBy(s => s.Assignment.Id)
                .ToDictionary(g => g.Key, g => g.ToList());

            var answerKeysList = await _db.AssignmentAnswerKeys
                .Where(answerKey => assignmentIds.Contains(answerKey.Assignment.Id))
                .Include(answerKey => answerKey.Assignment)
                .ToListAsync();

            var answerKeyByAssignment = answerKeysList
                .ToDictionary(answerKey => answerKey.Assignment.Id, answerKey => answerKey);

            static double ComputeSuccessRate(AssignmentAnswerKey answerKey, AssignmentSubmit submit)
            {
                string[][] answerArrays = {
                    answerKey.Networks ?? Array.Empty<string>(),
                    answerKey.FirstUsables ?? Array.Empty<string>(),
                    answerKey.LastUsables ?? Array.Empty<string>(),
                    answerKey.Broadcasts ?? Array.Empty<string>()
                };
                string[][] submitArrays = {
                    submit.Networks ?? Array.Empty<string>(),
                    submit.FirstUsables ?? Array.Empty<string>(),
                    submit.LastUsables ?? Array.Empty<string>(),
                    submit.Broadcasts ?? Array.Empty<string>()
                };

                int totalFields = answerArrays.Sum(arr => arr.Length);
                if (totalFields == 0) return 0;

                int correctFields = 0;
                for (int i = 0; i < answerArrays.Length; i++)
                {
                    var ansArr = answerArrays[i];
                    var subArr = submitArrays[i];
                    int len = Math.Min(ansArr.Length, subArr.Length);
                    for (int j = 0; j < len; j++)
                    {
                        if (ansArr[j] == subArr[j])
                            correctFields++;
                    }
                }

                return (double)correctFields / totalFields;
            }

            var now = DateTime.UtcNow;

            var resultAssignments = assignments.Select(a =>
            {
                var teacherUsername = a.AssignmentGroup.Class.Teachers?.FirstOrDefault()?.Username ?? "Unknown";

                var start = a.AssignmentGroup.StartDate;
                var deadline = a.AssignmentGroup.Deadline;
                AssignmentGroupState state =
                    now < start ? AssignmentGroupState.UPCOMING :
                    (now > deadline || a.IsCompleted) ? AssignmentGroupState.ENDED :
                    AssignmentGroupState.IN_PROGRESS;

                double maxSuccessRate = 0.0;
                if (answerKeyByAssignment.TryGetValue(a.Id, out var answerKey) &&
                    submitsByAssignment.TryGetValue(a.Id, out var assignmentSubmits) &&
                    assignmentSubmits.Count > 0)
                {
                    foreach (var s in assignmentSubmits)
                        maxSuccessRate = Math.Max(maxSuccessRate, ComputeSuccessRate(answerKey, s)) * 100;
                }

                return new AssignmentDto
                {
                    AssignmentId = a.Id,
                    TeacherUsername = teacherUsername,
                    ClassName = a.AssignmentGroup.Class.Name,
                    AssignmentGroupDescription = a.AssignmentGroup.Description,
                    AssignmentGroupName = a.AssignmentGroup.Name,
                    MaxSuccessRate = maxSuccessRate,
                    MaxAttempts = a.AssignmentGroup.PossibleAttempts,
                    AttemptCount = submitsByAssignment.TryGetValue(a.Id, out var assignmentSubmitsForCount) ? assignmentSubmitsForCount.Count : 0,
                    State = state,
                    StartDate = start,
                    Deadline = deadline,
                    StudentUsername = a.Student.Username,
                    Status = (AssignmentGroupStatus)state
                };
            }).ToArray();

            return Ok(new QueryAssignmentsRes
            {
                Assignments = resultAssignments,
                TotalCount = resultAssignments.Length
            });
        }
    }
}