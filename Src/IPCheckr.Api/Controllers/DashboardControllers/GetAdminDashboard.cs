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
            var now = DateTime.UtcNow;

            var institution = await _db.AppSettings.FirstOrDefaultAsync(a => a.Name == "InstitutionName");
            var institutionName = institution?.Value;

            var totalClasses = await _db.Classes.CountAsync();
            var totalStudents = await _db.Users.CountAsync(u => u.Role == Roles.Student);
            var totalAssignmentGroups = await _db.SubnetAGs.CountAsync() + await _db.IDNetAGs.CountAsync();
            var totalSubmits = await _db.SubnetAssignmentSubmits.CountAsync() + await _db.IDNetAssignmentSubmits.CountAsync();

            var subnetLastSubmit = await _db.SubnetAssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .OrderByDescending(s => s.SubmittedAt)
                .ThenByDescending(s => s.Id)
                .FirstOrDefaultAsync();

            var idnetLastSubmit = await _db.IDNetAssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .OrderByDescending(s => s.SubmittedAt)
                .ThenByDescending(s => s.Id)
                .FirstOrDefaultAsync();

            var subnetGroups = await _db.SubnetAGs.AsNoTracking().ToListAsync();
            var idnetGroups = await _db.IDNetAGs.AsNoTracking().ToListAsync();

            int totalUpcoming = subnetGroups.Count(g => AssignmentEvaluationUtils.ResolveStatus(g.StartDate, g.Deadline, g.CompletedAt) == AssignmentGroupStatus.UPCOMING)
                + idnetGroups.Count(g => AssignmentEvaluationUtils.ResolveStatus(g.StartDate, g.Deadline, g.CompletedAt) == AssignmentGroupStatus.UPCOMING);

            int totalInProgress = subnetGroups.Count(g => AssignmentEvaluationUtils.ResolveStatus(g.StartDate, g.Deadline, g.CompletedAt) == AssignmentGroupStatus.IN_PROGRESS)
                + idnetGroups.Count(g => AssignmentEvaluationUtils.ResolveStatus(g.StartDate, g.Deadline, g.CompletedAt) == AssignmentGroupStatus.IN_PROGRESS);

            int totalEnded = subnetGroups.Count(g => AssignmentEvaluationUtils.ResolveStatus(g.StartDate, g.Deadline, g.CompletedAt) == AssignmentGroupStatus.ENDED)
                + idnetGroups.Count(g => AssignmentEvaluationUtils.ResolveStatus(g.StartDate, g.Deadline, g.CompletedAt) == AssignmentGroupStatus.ENDED);

            var lastSubmitData = new List<(DateTime submittedAt, int id, string username)>();
            if (subnetLastSubmit != null)
            {
                lastSubmitData.Add((subnetLastSubmit.SubmittedAt, subnetLastSubmit.Id, subnetLastSubmit.Assignment.Student.Username));
            }

            if (idnetLastSubmit != null)
            {
                lastSubmitData.Add((idnetLastSubmit.SubmittedAt, idnetLastSubmit.Id, idnetLastSubmit.Assignment.Student.Username));
            }

            var lastSubmit = lastSubmitData
                .OrderByDescending(s => s.submittedAt)
                .ThenByDescending(s => s.id)
                .FirstOrDefault();

            var res = new QueryAdminDashboardRes
            {
                InstitutionName = institutionName,
                TotalClasses = totalClasses,
                TotalStudents = totalStudents,
                TotalAssignmentGroups = totalAssignmentGroups,
                TotalSubmits = totalSubmits,
                LastSubmitUsername = lastSubmitData.Count > 0
                    ? UsernameUtils.ToDisplay(lastSubmit.username) : null,
                LastSubmitAt = lastSubmitData.Count > 0 ? lastSubmit.submittedAt : (DateTime?)null,
                TotalUpcoming = totalUpcoming,
                TotalInProgress = totalInProgress,
                TotalEnded = totalEnded
            };

            return Ok(res);
        }
    }
}