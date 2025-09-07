using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.DTOs.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace IPCheckr.Api.Controllers
{
    public partial class DashboardController : ControllerBase
    {
        [Authorize(Policy = Roles.Student)]
        [HttpGet("get-student-dashboard")]
        [ProducesResponseType(typeof(QueryStudentDashboardRes), StatusCodes.Status200OK)]
        public async Task<ActionResult<QueryStudentDashboardRes>> QueryStudentDashboard()
        {
            var callerId = int.Parse(User.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value);

            var classes = await _db.Classes
                .Include(c => c.Students)
                .Include(c => c.Teachers)
                .Where(c => c.Students!.Any(s => s.Id == callerId))
                .ToListAsync();

            var classIds = classes.Select(c => c.Id).ToHashSet();

            var now = DateTime.UtcNow;

            var totalAssignmentGroups = await _db.AssignmentGroups
                .Where(ag => classIds.Contains(ag.Class.Id))
                .CountAsync();

            var totalUpcoming = await _db.AssignmentGroups
                .Where(ag => classIds.Contains(ag.Class.Id) && ag.StartDate > now)
                .CountAsync();

            var totalInProgress = await _db.AssignmentGroups
                .Where(ag => classIds.Contains(ag.Class.Id) && ag.StartDate <= now && ag.Deadline >= now)
                .CountAsync();

            var totalEnded = await _db.AssignmentGroups
                .Where(ag => classIds.Contains(ag.Class.Id) && ag.Deadline <= now)
                .CountAsync();

            var institution = await _db.AppSettings.FirstOrDefaultAsync(a => a.Name == "InstitutionName");
            var institutionName = institution?.Value;

            var studentSubmits = await _db.AssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.AssignmentGroup)
                        .ThenInclude(ag => ag.Class)
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .Where(s => s.Assignment.Student.Id == callerId)
                .OrderBy(s => s.SubmittedAt)
                .ThenBy(s => s.Id)
                .ToListAsync();

            var assignmentIds = studentSubmits.Select(s => s.Assignment.Id).Distinct().ToArray();

            var answerKeys = await _db.AssignmentAnswerKeys
                .Include(k => k.Assignment)
                .Where(k => assignmentIds.Contains(k.Assignment.Id))
                .ToListAsync();

            var answerKeyByAssignment = answerKeys.ToDictionary(k => k.Assignment.Id, k => k);

            double ComputeSubmitPercent(Models.AssignmentAnswerKey answerKey, Models.AssignmentSubmit submit)
            {
                string[][] _answer = {
                    answerKey.Networks ?? Array.Empty<string>(),
                    answerKey.FirstUsables ?? Array.Empty<string>(),
                    answerKey.LastUsables ?? Array.Empty<string>(),
                    answerKey.Broadcasts ?? Array.Empty<string>()
                };
                string[][] _submit = {
                    submit.Networks ?? Array.Empty<string>(),
                    submit.FirstUsables ?? Array.Empty<string>(),
                    submit.LastUsables ?? Array.Empty<string>(),
                    submit.Broadcasts ?? Array.Empty<string>()
                };

                int total = _answer.Sum(a => a.Length);
                if (total == 0) return 0.0;

                int correct = 0;
                for (int i = 0; i < _answer.Length; i++)
                {
                    var answerArray = _answer[i];
                    var submitArray = _submit[i];
                    int len = Math.Min(answerArray.Length, submitArray.Length);
                    for (int j = 0; j < len; j++)
                    {
                        if (answerArray[j] == submitArray[j]) correct++;
                    }
                }

                return (double)correct / total * 100.0;
            }

            var successRate = new List<StudentDashboardSuccessRateDto>();
            foreach (var submit in studentSubmits)
            {
                if (!answerKeyByAssignment.TryGetValue(submit.Assignment.Id, out var key))
                    continue;

                var percentage = ComputeSubmitPercent(key, submit);
                successRate.Add(new StudentDashboardSuccessRateDto
                {
                    Date = submit.SubmittedAt.ToString("yyyy-MM-dd"),
                    Percentage = percentage
                });
            }

            var lastSubmit = studentSubmits
                .OrderByDescending(s => s.SubmittedAt)
                .ThenByDescending(s => s.Id)
                .FirstOrDefault();

            var lastSubmitAt = lastSubmit?.SubmittedAt;
            var lastSubmitId = lastSubmit?.Assignment.Id;
            var lastSubmitGroupId = lastSubmit?.Assignment.AssignmentGroup.Id;

            var classesStr = string.Join(", ", classes.Select(c => c.Name).OrderBy(n => n));
            var teachersStr = string.Join(", ",
                classes
                    .SelectMany(c => c.Teachers ?? Enumerable.Empty<Models.User>())
                    .Select(t => t.Username)
                    .Distinct()
                    .OrderBy(n => n));

            var res = new QueryStudentDashboardRes
            {
                InstitutionName = institutionName,
                TotalAssignmentGroups = totalAssignmentGroups,
                TotalUpcoming = totalUpcoming,
                TotalInProgress = totalInProgress,
                TotalEnded = totalEnded,
                Classes = classesStr,
                Teachers = teachersStr,
                LastSubmitAt = lastSubmitAt,
                LastSubmitId = lastSubmitId,
                LastSubmitGroupId = lastSubmitGroupId,
                TotalSubmits = studentSubmits.Count,
                SuccessRate = successRate.ToArray()
            };

            return Ok(res);
        }
    }
}