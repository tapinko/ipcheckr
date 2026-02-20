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

            var subnetGroups = await _db.SubnetAGs.Where(ag => classIds.Contains(ag.Class.Id)).ToListAsync();
            var idnetGroups = await _db.IDNetAGs.Where(ag => classIds.Contains(ag.Class.Id)).ToListAsync();

            var totalAssignmentGroups = subnetGroups.Count + idnetGroups.Count;
            var totalUpcoming = subnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.UPCOMING)
                + idnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.UPCOMING);
            var totalInProgress = subnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.IN_PROGRESS)
                + idnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.IN_PROGRESS);
            var totalEnded = subnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.ENDED)
                + idnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.ENDED);

            var institution = await _db.AppSettings.FirstOrDefaultAsync(a => a.Name == "InstitutionName");
            var institutionName = institution?.Value;

            var subnetSubmits = await _db.SubnetAssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.AssignmentGroup)
                        .ThenInclude(ag => ag.Class)
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .Where(s => s.Assignment.Student.Id == callerId)
                .ToListAsync();

            var idnetSubmits = await _db.IDNetAssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.AssignmentGroup)
                        .ThenInclude(ag => ag.Class)
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .Where(s => s.Assignment.Student.Id == callerId)
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

            var combinedSubmits = new List<(DateTime submittedAt, int id, int assignmentId, int groupId, double percentage)>();

            foreach (var submit in subnetSubmits)
            {
                subnetAnswerKeyByAssignment.TryGetValue(submit.Assignment.Id, out var key);
                double pct = AssignmentEvaluationUtils.CalculateSubnetSuccessRate(key, submit);
                combinedSubmits.Add((submit.SubmittedAt, submit.Id, submit.Assignment.Id, submit.Assignment.AssignmentGroup.Id, pct));
            }

            foreach (var submit in idnetSubmits)
            {
                idnetAnswerKeyByAssignment.TryGetValue(submit.Assignment.Id, out var key);
                double pct = AssignmentEvaluationUtils.CalculateIdNetSuccessRate(key, submit, submit.Assignment.AssignmentGroup.TestWildcard, submit.Assignment.AssignmentGroup.TestFirstLastBr);
                combinedSubmits.Add((submit.SubmittedAt, submit.Id, submit.Assignment.Id, submit.Assignment.AssignmentGroup.Id, pct));
            }

            var successRate = combinedSubmits
                .OrderBy(s => s.submittedAt)
                .ThenBy(s => s.id)
                .Select(s => new StudentDashboardSuccessRateDto
                {
                    Date = s.submittedAt.ToString("yyyy-MM-dd"),
                    Percentage = s.percentage
                })
                .ToArray();

            var lastSubmit = combinedSubmits
                .OrderByDescending(s => s.submittedAt)
                .ThenByDescending(s => s.id)
                .FirstOrDefault();

            var lastSubmitAt = combinedSubmits.Count > 0 ? lastSubmit.submittedAt : (DateTime?)null;
            var lastSubmitId = combinedSubmits.Count > 0 ? lastSubmit.assignmentId : (int?)null;
            var lastSubmitGroupId = combinedSubmits.Count > 0 ? lastSubmit.groupId : (int?)null;

            var classesStr = string.Join(", ", classes.Select(c => c.Name).OrderBy(n => n));
            var teachersStr = string.Join(", ",
                classes
                    .SelectMany(c => c.Teachers ?? Enumerable.Empty<Models.User>())
                    .Select(t => UsernameUtils.ToDisplay(t.Username))
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
                TotalSubmits = combinedSubmits.Count,
                SuccessRate = successRate
            };

            return Ok(res);
        }
    }
}