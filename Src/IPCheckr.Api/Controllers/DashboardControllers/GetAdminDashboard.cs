using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.DTOs.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Controllers
{
    public partial class DashboardController : ControllerBase
    {
        [Authorize(Policy = Roles.Admin)]
        [HttpGet("get-admin-dashboard")]
        [ProducesResponseType(typeof(QueryAdminDashboardRes), StatusCodes.Status200OK)]
        public async Task<ActionResult<QueryAdminDashboardRes>> QueryAdminDashboard()
        {
            var institution = await _db.AppSettings.FirstOrDefaultAsync(a => a.Name == "InstitutionName");
            var institutionName = institution?.Value;

            var totalClasses = await _db.Classes.CountAsync();
            var totalStudents = await _db.Users.CountAsync(u => u.Role == Roles.Student);
            var totalAssignmentGroups = await _db.SubnetAGs.CountAsync() + await _db.IDNetAGs.CountAsync();

            var subnetGroups = await _db.SubnetAGs.AsNoTracking().ToListAsync();
            var idnetGroups = await _db.IDNetAGs.AsNoTracking().ToListAsync();

            int totalUpcoming = subnetGroups.Count(g => AssignmentEvaluationUtils.ResolveStatus(g.StartDate, g.Deadline, g.CompletedAt) == AssignmentGroupStatus.UPCOMING)
                + idnetGroups.Count(g => AssignmentEvaluationUtils.ResolveStatus(g.StartDate, g.Deadline, g.CompletedAt) == AssignmentGroupStatus.UPCOMING);

            int totalInProgress = subnetGroups.Count(g => AssignmentEvaluationUtils.ResolveStatus(g.StartDate, g.Deadline, g.CompletedAt) == AssignmentGroupStatus.IN_PROGRESS)
                + idnetGroups.Count(g => AssignmentEvaluationUtils.ResolveStatus(g.StartDate, g.Deadline, g.CompletedAt) == AssignmentGroupStatus.IN_PROGRESS);

            int totalEnded = subnetGroups.Count(g => AssignmentEvaluationUtils.ResolveStatus(g.StartDate, g.Deadline, g.CompletedAt) == AssignmentGroupStatus.ENDED)
                + idnetGroups.Count(g => AssignmentEvaluationUtils.ResolveStatus(g.StartDate, g.Deadline, g.CompletedAt) == AssignmentGroupStatus.ENDED);

            var subnetSubmits = await _db.SubnetAssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.AssignmentGroup)
                        .ThenInclude(ag => ag.Class)
                .ToListAsync();

            var idnetSubmits = await _db.IDNetAssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.AssignmentGroup)
                        .ThenInclude(ag => ag.Class)
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

            var combinedSubmits = new List<(int studentId, string studentUsername, int classId, string className, DateTime submittedAt, int id, int assignmentId, int groupId, double percentage, string type)>();

            foreach (var submit in subnetSubmits)
            {
                subnetAnswerKeyByAssignment.TryGetValue(submit.Assignment.Id, out var key);
                double pct = AssignmentEvaluationUtils.CalculateSubnetSuccessRate(key, submit);
                var ag = submit.Assignment.AssignmentGroup;
                combinedSubmits.Add((submit.Assignment.Student.Id, submit.Assignment.Student.Username, ag.Class.Id, ag.Class.Name, submit.SubmittedAt, submit.Id, submit.Assignment.Id, ag.Id, pct, "subnet"));
            }

            foreach (var submit in idnetSubmits)
            {
                idnetAnswerKeyByAssignment.TryGetValue(submit.Assignment.Id, out var key);
                double pct = AssignmentEvaluationUtils.CalculateIdNetSuccessRate(key, submit, submit.Assignment.AssignmentGroup.TestWildcard, submit.Assignment.AssignmentGroup.TestFirstLastBr);
                var ag = submit.Assignment.AssignmentGroup;
                combinedSubmits.Add((submit.Assignment.Student.Id, submit.Assignment.Student.Username, ag.Class.Id, ag.Class.Name, submit.SubmittedAt, submit.Id, submit.Assignment.Id, ag.Id, pct, "idnet"));
            }

            var lastSubmit = combinedSubmits
                .OrderByDescending(s => s.submittedAt)
                .ThenByDescending(s => s.id)
                .FirstOrDefault();

            var topStudentGroup = combinedSubmits
                .GroupBy(s => new { s.studentId, s.studentUsername })
                .Select(g => new { g.Key.studentId, g.Key.studentUsername, avg = g.Average(x => x.percentage) })
                .OrderByDescending(x => x.avg)
                .FirstOrDefault();

            var topClassGroup = combinedSubmits
                .GroupBy(s => new { s.classId, s.className })
                .Select(g => new { g.Key.classId, g.Key.className, avg = g.Average(x => x.percentage) })
                .OrderByDescending(x => x.avg)
                .FirstOrDefault();

            var res = new QueryAdminDashboardRes
            {
                InstitutionName = institutionName,
                TotalClasses = totalClasses,
                TotalStudents = totalStudents,
                TotalAssignmentGroups = totalAssignmentGroups,
                TotalSubmits = combinedSubmits.Count,
                LastSubmitUsername = combinedSubmits.Count > 0 ? UsernameUtils.ToDisplay(lastSubmit.studentUsername) : null,
                LastSubmitAt = combinedSubmits.Count > 0 ? lastSubmit.submittedAt : (DateTime?)null,
                LastSubmitGroupId = combinedSubmits.Count > 0 ? lastSubmit.groupId : (int?)null,
                LastSubmitId = combinedSubmits.Count > 0 ? lastSubmit.assignmentId : (int?)null,
                LastSubmitType = combinedSubmits.Count > 0 ? lastSubmit.type : null,
                MostSuccessfulClass = topClassGroup?.className,
                MostSuccessfulClassId = topClassGroup?.classId,
                MostSuccessfulStudent = topStudentGroup != null ? UsernameUtils.ToDisplay(topStudentGroup.studentUsername) : null,
                MostSuccessfulStudentId = topStudentGroup?.studentId,
                TotalUpcoming = totalUpcoming,
                TotalInProgress = totalInProgress,
                TotalEnded = totalEnded
            };

            return Ok(res);
        }
    }
}