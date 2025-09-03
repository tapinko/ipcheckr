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
        [Authorize(Policy = Roles.Teacher)]
        [HttpGet("get-teacher-dashboard")]
        [ProducesResponseType(typeof(QueryTeacherDashboardRes), StatusCodes.Status200OK)]
        public async Task<ActionResult<QueryTeacherDashboardRes>> QueryTeacherDashboard([FromQuery] QueryTeacherDashboardReq req)
        {
            var callerId = int.Parse(User.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value);

            var classes = await _db.Classes
                .Include(c => c.Teachers)
                .Include(c => c.Students)
                .Where(c => c.Teachers!.Any(t => t.Id == callerId))
                .ToListAsync();

            var classIds = classes.Select(c => c.Id).ToHashSet();

            var assignments = await _db.Assignments
                .Include(a => a.Student)
                .Include(a => a.AssignmentGroup)
                    .ThenInclude(ag => ag.Class)
                .Where(a => classIds.Contains(a.AssignmentGroup.Class.Id))
                .ToListAsync();

            var assignmentIds = assignments.Select(a => a.Id).ToArray();

            var submits = await _db.AssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.AssignmentGroup)
                        .ThenInclude(ag => ag.Class)
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .Where(s => assignmentIds.Contains(s.Assignment.Id))
                .ToListAsync();

            var answerKeys = await _db.AssignmentAnswerKeys
                .Include(k => k.Assignment)
                .Where(k => assignmentIds.Contains(k.Assignment.Id))
                .ToListAsync();

            var answerKeyByAssignment = answerKeys.ToDictionary(k => k.Assignment.Id, k => k);

            static double ComputeSubmitPercent(Models.AssignmentAnswerKey answerKey, IPCheckr.Api.Models.AssignmentSubmit submit)
            {
                string[][] ans = {
                    answerKey.Networks ?? Array.Empty<string>(),
                    answerKey.FirstUsables ?? Array.Empty<string>(),
                    answerKey.LastUsables ?? Array.Empty<string>(),
                    answerKey.Broadcasts ?? Array.Empty<string>()
                };
                string[][] sub = {
                    submit.Networks ?? Array.Empty<string>(),
                    submit.FirstUsables ?? Array.Empty<string>(),
                    submit.LastUsables ?? Array.Empty<string>(),
                    submit.Broadcasts ?? Array.Empty<string>()
                };

                int total = ans.Sum(a => a.Length);
                if (total == 0) return 0.0;

                int correct = 0;
                for (int i = 0; i < ans.Length; i++)
                {
                    var aArr = ans[i];
                    var sArr = sub[i];
                    int len = Math.Min(aArr.Length, sArr.Length);
                    for (int j = 0; j < len; j++)
                    {
                        if (aArr[j] == sArr[j]) correct++;
                    }
                }

                return (double)correct / total * 100.0;
            }

            var studentAverages = submits
                .Where(s => answerKeyByAssignment.ContainsKey(s.Assignment.Id))
                .GroupBy(s => new { s.Assignment.Student.Id, s.Assignment.Student.Username })
                .Select(g =>
                {
                    var avg = g.Average(s => ComputeSubmitPercent(answerKeyByAssignment[s.Assignment.Id], s));
                    return new TeacherBarChartDataDto
                    {
                        Username = g.Key.Username,
                        Percentage = avg
                    };
                })
                .OrderByDescending(x => x.Percentage)
                .ToList();

            var classAverages = submits
                .Where(s => answerKeyByAssignment.ContainsKey(s.Assignment.Id))
                .GroupBy(s => new { ClassId = s.Assignment.AssignmentGroup.Class.Id, ClassName = s.Assignment.AssignmentGroup.Class.Name })
                .Select(g =>
                {
                    var avg = g.Average(s => ComputeSubmitPercent(answerKeyByAssignment[s.Assignment.Id], s));
                    return new TeacherBarChartDataDto
                    {
                        Username = g.Key.ClassName,
                        Percentage = avg
                    };
                })
                .OrderByDescending(x => x.Percentage)
                .ToList();

            var lastSubmit = submits
                .OrderByDescending(s => s.SubmittedAt)
                .ThenByDescending(s => s.Id)
                .FirstOrDefault();
            var lastSubmitUsername = lastSubmit?.Assignment.Student.Username;
            DateTime? lastSubmitAt = lastSubmit?.SubmittedAt;

            var institution = await _db.AppSettings.FirstOrDefaultAsync(a => a.Name == "InstitutionName");
            var institutionName = institution?.Value;

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

            var totalSubmits = submits.Count;

            var totalClasses = classes.Count;
            var totalStudents = classes
                .SelectMany(c => c.Students ?? Enumerable.Empty<Models.User>())
                .Select(s => s.Id)
                .Distinct()
                .Count();

            var mostSuccessfulStudent = studentAverages.FirstOrDefault()?.Username;
            var mostSuccessfulClass = classAverages.FirstOrDefault()?.Username;

            int take = req.BarChartLength > 0 ? req.BarChartLength : int.MaxValue;
            var studentBars = studentAverages.Take(take).ToArray();
            var classBars = classAverages.Take(take).ToArray();

            var res = new QueryTeacherDashboardRes
            {
                InstitutionName = institutionName,
                TotalAssignmentGroups = totalAssignmentGroups,
                TotalUpcoming = totalUpcoming,
                TotalInProgress = totalInProgress,
                TotalEnded = totalEnded,
                LastSubmitUsername = lastSubmitUsername,
                LastSubmitAt = lastSubmitAt,
                MostSuccessfulClass = mostSuccessfulClass,
                MostSuccessfulStudent = mostSuccessfulStudent,
                TotalClasses = totalClasses,
                TotalStudents = totalStudents,
                TotalSubmits = totalSubmits,
                AveragePercentageInStudents = studentBars,
                AveragePercentageInClasses = classBars
            };

            return Ok(res);
        }
    }
}