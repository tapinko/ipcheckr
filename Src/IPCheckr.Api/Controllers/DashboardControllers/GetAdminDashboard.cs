using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.DTOs.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
            var totalAssignmentGroups = await _db.AssignmentGroups.CountAsync();
            var totalSubmits = await _db.AssignmentSubmits.CountAsync();
            var lastSubmit = await _db.AssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .OrderByDescending(s => s.SubmittedAt)
                .ThenByDescending(s => s.Id)
                .FirstOrDefaultAsync();
            
            var totalUpcoming = await _db.AssignmentGroups
                .Where(ag => ag.StartDate > now)
                .CountAsync();

            var totalInProgress = await _db.AssignmentGroups
                .Where(ag => ag.StartDate <= now && ag.Deadline >= now)
                .CountAsync();

            var totalEnded = await _db.AssignmentGroups
                .Where(ag => ag.Deadline <= now)
                .CountAsync();

            var res = new QueryAdminDashboardRes
            {
                InstitutionName = institutionName,
                TotalClasses = totalClasses,
                TotalStudents = totalStudents,
                TotalAssignmentGroups = totalAssignmentGroups,
                TotalSubmits = totalSubmits,
                LastSubmitUsername = lastSubmit != null
                    ? UsernameUtils.ToDisplay(lastSubmit.Assignment.Student.Username) : null,
                LastSubmitAt = lastSubmit?.SubmittedAt,
                TotalUpcoming = totalUpcoming,
                TotalInProgress = totalInProgress,
                TotalEnded = totalEnded
            };

            return Ok(res);
        }
    }
}