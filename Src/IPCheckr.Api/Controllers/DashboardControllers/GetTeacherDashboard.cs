using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Common.Utils;
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
            var subnetSubmits = await _db.SubnetAssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.AssignmentGroup)
                        .ThenInclude(ag => ag.Class)
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .Where(s => classIds.Contains(s.Assignment.AssignmentGroup.Class.Id))
                .ToListAsync();

            var idnetSubmits = await _db.IDNetAssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.AssignmentGroup)
                        .ThenInclude(ag => ag.Class)
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .Where(s => classIds.Contains(s.Assignment.AssignmentGroup.Class.Id))
                .ToListAsync();

            var subnetAssignmentIds = subnetSubmits.Select(s => s.Assignment.Id).Distinct().ToArray();
            var idnetAssignmentIds = idnetSubmits.Select(s => s.Assignment.Id).Distinct().ToArray();

            var subnetAnswerKeys = await _db.SubnetAssignmentAnswerKeys
                .Include(k => k.Assignment)
                .Where(k => subnetAssignmentIds.Contains(k.Assignment.Id))
                .ToListAsync();

            var idnetAnswerKeys = await _db.IDNetAssignmentAnswerKeys
                .Include(k => k.Assignment)
                .Where(k => idnetAssignmentIds.Contains(k.Assignment.Id))
                .ToListAsync();

            var subnetAnswerKeyByAssignment = subnetAnswerKeys.ToDictionary(k => k.Assignment.Id, k => k);
            var idnetAnswerKeyByAssignment = idnetAnswerKeys.ToDictionary(k => k.Assignment.Id, k => k);

            var combinedSubmits = new List<(int studentId, string studentUsername, int classId, string className, DateTime submittedAt, int id, int assignmentId, int groupId, double percentage)>();

            foreach (var submit in subnetSubmits)
            {
                subnetAnswerKeyByAssignment.TryGetValue(submit.Assignment.Id, out var key);
                double pct = AssignmentEvaluationUtils.CalculateSubnetSuccessRate(key, submit);
                var ag = submit.Assignment.AssignmentGroup;
                combinedSubmits.Add((submit.Assignment.Student.Id, submit.Assignment.Student.Username, ag.Class.Id, ag.Class.Name, submit.SubmittedAt, submit.Id, submit.Assignment.Id, ag.Id, pct));
            }

            foreach (var submit in idnetSubmits)
            {
                idnetAnswerKeyByAssignment.TryGetValue(submit.Assignment.Id, out var key);
                double pct = AssignmentEvaluationUtils.CalculateIdNetSuccessRate(key, submit, submit.Assignment.AssignmentGroup.TestWildcard, submit.Assignment.AssignmentGroup.TestFirstLastBr);
                var ag = submit.Assignment.AssignmentGroup;
                combinedSubmits.Add((submit.Assignment.Student.Id, submit.Assignment.Student.Username, ag.Class.Id, ag.Class.Name, submit.SubmittedAt, submit.Id, submit.Assignment.Id, ag.Id, pct));
            }

            var studentAverages = combinedSubmits
                .GroupBy(s => new { s.studentId, s.studentUsername })
                .Select(g => new AveragePercentageInStudentsDto
                {
                    Username = UsernameUtils.ToDisplay(g.Key.studentUsername),
                    Percentage = g.Average(x => x.percentage)
                })
                .OrderByDescending(x => x.Percentage)
                .ToList();

            var classAverages = combinedSubmits
                .GroupBy(s => new { s.classId, s.className })
                .Select(g => new AveragePercentageInClassesDto
                {
                    ClassName = g.Key.className,
                    Percentage = g.Average(x => x.percentage)
                })
                .OrderByDescending(x => x.Percentage)
                .ToList();

            var lastSubmit = combinedSubmits
                .OrderByDescending(s => s.submittedAt)
                .ThenByDescending(s => s.id)
                .FirstOrDefault();
            var lastSubmitUsername = combinedSubmits.Count > 0 ? UsernameUtils.ToDisplay(lastSubmit.studentUsername) : null;
            DateTime? lastSubmitAt = combinedSubmits.Count > 0 ? lastSubmit.submittedAt : (DateTime?)null;

            int? lastSubmitId = combinedSubmits.Count > 0 ? lastSubmit.assignmentId : (int?)null;
            int? lastSubmitGroupId = combinedSubmits.Count > 0 ? lastSubmit.groupId : (int?)null;

            var institution = await _db.AppSettings.FirstOrDefaultAsync(a => a.Name == "InstitutionName");
            var institutionName = institution?.Value;

            var now = DateTime.UtcNow;

            var subnetGroups = await _db.SubnetAGs.Where(ag => classIds.Contains(ag.Class.Id)).ToListAsync();
            var idnetGroups = await _db.IDNetAGs.Where(ag => classIds.Contains(ag.Class.Id)).ToListAsync();

            var totalAssignmentGroups = subnetGroups.Count + idnetGroups.Count;
            var totalUpcoming = subnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.UPCOMING)
                + idnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.UPCOMING);
            var totalInProgress = subnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.IN_PROGRESS)
                + idnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.IN_PROGRESS);
            var totalEnded = subnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.ENDED)
                + idnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.ENDED);

            var totalSubmits = combinedSubmits.Count;

            var totalClasses = classes.Count;
            var totalStudents = classes
                .SelectMany(c => c.Students ?? Enumerable.Empty<Models.User>())
                .Select(s => s.Id)
                .Distinct()
                .Count();

            var mostSuccessfulStudent = studentAverages.FirstOrDefault()?.Username;
            if (!string.IsNullOrEmpty(mostSuccessfulStudent))
                mostSuccessfulStudent = UsernameUtils.ToDisplay(mostSuccessfulStudent);
            var mostSuccessfulClass = classAverages.FirstOrDefault()?.ClassName;

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
                LastSubmitGroupId = lastSubmitGroupId,
                LastSubmitId = lastSubmitId,
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