using IPCheckr.Api.DTOs.Class;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Controllers
{
    public partial class ClassController : ControllerBase
    {
        [HttpGet("get-class-details")]
        [ProducesResponseType(typeof(QueryClassDetailsRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QueryClassDetailsRes>> QueryClassDetails([FromQuery] QueryClassDetailsReq req)
        {
            var @class = await _db.Classes
                .Include(c => c.Teachers)
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.Id == req.Id);

            if (@class == null)
                return StatusCode(StatusCodes.Status404NotFound, new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Class not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Class not found.",
                    MessageSk = "Trieda nebola nájdená."
                });

            var now = DateTime.UtcNow;
            var subnetGroups = await _db.SubnetAGs
                .Include(ag => ag.Class)
                .Where(ag => ag.Class.Id == @class.Id)
                .ToListAsync();

            var idnetGroups = await _db.IDNetAGs
                .Include(ag => ag.Class)
                .Where(ag => ag.Class.Id == @class.Id)
                .ToListAsync();

            var subnetGroupIds = subnetGroups.Select(ag => ag.Id).ToArray();
            var idnetGroupIds = idnetGroups.Select(ag => ag.Id).ToArray();

            var subnetSubmits = await _db.SubnetAssignmentSubmits
                .Include(s => s.Assignment)
                .ThenInclude(a => a.AssignmentGroup)
                .ThenInclude(ag => ag.Class)
                .Include(s => s.Assignment)
                .ThenInclude(a => a.Student)
                .Where(s => subnetGroupIds.Contains(s.Assignment.AssignmentGroup.Id))
                .ToListAsync();

            var idnetSubmits = await _db.IDNetAssignmentSubmits
                .Include(s => s.Assignment)
                .ThenInclude(a => a.AssignmentGroup)
                .ThenInclude(ag => ag.Class)
                .Include(s => s.Assignment)
                .ThenInclude(a => a.Student)
                .Where(s => idnetGroupIds.Contains(s.Assignment.AssignmentGroup.Id))
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

            var combinedSubmits = new List<(DateTime submittedAt, int submitId, int assignmentId, int groupId, int studentId, string studentUsername, double percentage)>();

            foreach (var submit in subnetSubmits)
            {
                subnetAnswerKeyByAssignment.TryGetValue(submit.Assignment.Id, out var key);
                double pct = AssignmentEvaluationUtils.CalculateSubnetSuccessRate(key, submit);
                combinedSubmits.Add((submit.SubmittedAt, submit.Id, submit.Assignment.Id, submit.Assignment.AssignmentGroup.Id, submit.Assignment.Student.Id, submit.Assignment.Student.Username, pct));
            }

            foreach (var submit in idnetSubmits)
            {
                idnetAnswerKeyByAssignment.TryGetValue(submit.Assignment.Id, out var key);
                double pct = AssignmentEvaluationUtils.CalculateIdNetSuccessRate(key, submit, submit.Assignment.AssignmentGroup.TestWildcard, submit.Assignment.AssignmentGroup.TestFirstLastBr);
                combinedSubmits.Add((submit.SubmittedAt, submit.Id, submit.Assignment.Id, submit.Assignment.AssignmentGroup.Id, submit.Assignment.Student.Id, submit.Assignment.Student.Username, pct));
            }

            double averageSuccessRate = combinedSubmits.Count > 0 ? combinedSubmits.Average(s => s.percentage) : 0.0;

            int totalAssignmentGroups = subnetGroups.Count + idnetGroups.Count;
            int totalUpcoming = subnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.UPCOMING)
                + idnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.UPCOMING);
            int totalInProgress = subnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.IN_PROGRESS)
                + idnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.IN_PROGRESS);
            int totalEnded = subnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.ENDED)
                + idnetGroups.Count(ag => AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt) == AssignmentGroupStatus.ENDED);

            var teachers = Array.Empty<ClassDetailsTeachersDto>();
            for (int i = 0; i < (@class.Teachers ?? Enumerable.Empty<Models.User>()).Count(); i++)
            {
                var t = (@class.Teachers ?? Enumerable.Empty<Models.User>()).ElementAt(i);
                teachers = teachers.Append(new ClassDetailsTeachersDto
                {
                    TeacherId = t.Id,
                    Username = UsernameUtils.ToDisplay(t.Username)
                }).ToArray();
            }

            var studentsArr = (@class.Students ?? Enumerable.Empty<Models.User>())
                .Select(s => new ClassDetailsStudentsDto
                {
                    StudentId = s.Id,
                    Username = UsernameUtils.ToDisplay(s.Username)
                })
                .OrderBy(s => s.Username)
                .ToArray();

            var avgInStudents = combinedSubmits
                .GroupBy(s => new { s.studentId, s.studentUsername })
                .Select(g =>
                {
                    var avg = g.Average(s => s.percentage);
                    return new AverageSuccessRateInStudentsDto
                    {
                        Username = UsernameUtils.ToDisplay(g.Key.studentUsername),
                        Percentage = avg
                    };
                })
                .OrderByDescending(x => x.Percentage)
                .ToArray();

            var allGroups = subnetGroups.Select(g => new { g.Id, g.Name, g.StartDate })
                .Concat(idnetGroups.Select(g => new { g.Id, g.Name, g.StartDate }))
                .ToList();

            var avgInAssignmentGroups = allGroups
                .Select(g =>
                {
                    var gSubmits = combinedSubmits.Where(s => s.groupId == g.Id).ToList();
                    if (gSubmits.Count == 0) return null;

                    double avg = gSubmits.Average(s => s.percentage);
                    return new { g.Name, g.StartDate, Avg = avg };
                })
                .Where(x => x != null)
                .Select(x => x!)
                .OrderBy(x => x.StartDate)
                .Select(x => new AverageSuccessRateInAssignmentGroupsDto
                {
                    AssignmentGroupName = x.Name,
                    Percentage = x.Avg
                })
                .ToArray();

            var lastSubmit = combinedSubmits
                .OrderByDescending(s => s.submittedAt)
                .ThenByDescending(s => s.submitId)
                .FirstOrDefault();
            var lastSubmitUsername = combinedSubmits.Count > 0 ? UsernameUtils.ToDisplay(lastSubmit.studentUsername) : null;
            int? lastSubmitId = combinedSubmits.Count > 0 ? lastSubmit.assignmentId : (int?)null;
            int? lastSubmitGroupId = combinedSubmits.Count > 0 ? lastSubmit.groupId : (int?)null;
            int? lastSubmitAttempt = null;

            var res = new QueryClassDetailsRes
            {
                ClassName = @class.Name,
                TotalSubmits = combinedSubmits.Count,
                AverageSuccessRate = averageSuccessRate,
                TotalAssignmentGroups = totalAssignmentGroups,
                TotalUpcoming = totalUpcoming,
                TotalInProgress = totalInProgress,
                TotalEnded = totalEnded,
                Teachers = teachers,
                CreatedAt = @class.CreatedAt,
                Students = studentsArr,
                LastSubmitAt = combinedSubmits.Count > 0 ? lastSubmit.submittedAt : (DateTime?)null,
                LastSubmitUsername = lastSubmitUsername,
                LastSubmitId = lastSubmitId,
                LastSubmitGroupId = lastSubmitGroupId,
                LastSubmitAttempt = lastSubmitAttempt,
                AverageSuccessRateInStudents = avgInStudents,
                AverageSuccessRateInAssignmentGroups = avgInAssignmentGroups
            };

            return Ok(res);
        }
    }
}