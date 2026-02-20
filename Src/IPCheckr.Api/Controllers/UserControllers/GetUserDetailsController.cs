using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.User;
using IPCheckr.Api.Common.Utils;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Controllers
{
    public partial class UserController : ControllerBase
    {
        [HttpGet("get-user-details")]
        [ProducesResponseType(typeof(QueryUserDetailsRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QueryUserDetailsRes>> QueryUserDetails([FromQuery] QueryUserDetailsReq req)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == req.Id!.Value);
            if (user == null)
                return StatusCode(StatusCodes.Status404NotFound, new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "User not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "User not found.",
                    MessageSk = "Používateľ nebol nájdený."
                });

            var classes = await _db.Classes
                .AsNoTracking()
                .Where(c => c.Students!.Any(s => s.Id == user.Id) || c.Teachers!.Any(t => t.Id == user.Id))
                .Select(c => new { c.Id, c.Name })
                .OrderBy(c => c.Name)
                .ToListAsync();

            var classesDto = Array.Empty<UserDetailsClassesDto>();

            for (int i = 0; i < classes.Count; i++)
            {
                classesDto = classesDto.Append(new UserDetailsClassesDto
                {
                    Id = classes[i].Id,
                    Name = classes[i].Name
                }).ToArray();
            }

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

            var subnetSubmits = await _db.SubnetAssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.AssignmentGroup)
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .Where(s => s.Assignment.Student.Id == user.Id)
                .ToListAsync();

            var idnetSubmits = await _db.IDNetAssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.AssignmentGroup)
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .Where(s => s.Assignment.Student.Id == user.Id)
                .ToListAsync();

            var totalSubmits = subnetSubmits.Count + idnetSubmits.Count;

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

            if (totalSubmits == 0)
            {
                var resNoSubmits = new QueryUserDetailsRes
                {
                    Username = UsernameUtils.ToDisplay(user.Username),
                    TotalSubmits = 0,
                    LastSubmitGroupId = null,
                    LastSubmitAssignmentId = null,
                    LastSubmitAttempt = null,
                    LastSubmitAt = null,
                    Classes = classesDto,
                    AverageNetwork = null,
                    AverageFirst = null,
                    AverageLast = null,
                    AverageBroadcast = null,
                    AverageTotal = 0.0,
                    SuccessRate = Array.Empty<UserDetailsSuccessRateDto>(),
                    TotalAssignmentGroups = totalAssignmentGroups,
                    TotalUpcoming = totalUpcoming,
                    TotalInProgress = totalInProgress,
                    TotalEnded = totalEnded,
                    Role = user.Role,
                    CreatedAt = user.CreatedAt
                };

                return Ok(resNoSubmits);
            }

            var networkPercents = new List<double>();
            var firstPercents = new List<double>();
            var lastPercents = new List<double>();
            var broadcastPercents = new List<double>();
            var totalPercents = new List<double>();

            foreach (var submit in subnetSubmits)
            {
                subnetAnswerKeyByAssignment.TryGetValue(submit.Assignment.Id, out var key);
                string[][] ans =
                {
                    key?.Networks ?? Array.Empty<string>(),
                    key?.FirstUsables ?? Array.Empty<string>(),
                    key?.LastUsables ?? Array.Empty<string>(),
                    key?.Broadcasts ?? Array.Empty<string>()
                };
                string[][] sub =
                {
                    submit.Networks ?? Array.Empty<string>(),
                    submit.FirstUsables ?? Array.Empty<string>(),
                    submit.LastUsables ?? Array.Empty<string>(),
                    submit.Broadcasts ?? Array.Empty<string>()
                };

                int[] ansLens = ans.Select(a => a.Length).ToArray();
                int[] correct = new int[4];

                for (int i = 0; i < 4; i++)
                {
                    int len = Math.Min(ans[i].Length, sub[i].Length);
                    int corr = 0;
                    for (int j = 0; j < len; j++)
                    {
                        if (ans[i][j] == sub[i][j]) corr++;
                    }
                    correct[i] = corr;
                }

                int totalFields = ansLens.Sum();
                int totalCorrect = correct.Sum();

                double pctNet = ansLens[0] > 0 ? (double)correct[0] / ansLens[0] * 100.0 : 0.0;
                double pctFirst = ansLens[1] > 0 ? (double)correct[1] / ansLens[1] * 100.0 : 0.0;
                double pctLast = ansLens[2] > 0 ? (double)correct[2] / ansLens[2] * 100.0 : 0.0;
                double pctBroad = ansLens[3] > 0 ? (double)correct[3] / ansLens[3] * 100.0 : 0.0;
                double pctTotal = totalFields > 0 ? (double)totalCorrect / totalFields * 100.0 : 0.0;

                networkPercents.Add(pctNet);
                firstPercents.Add(pctFirst);
                lastPercents.Add(pctLast);
                broadcastPercents.Add(pctBroad);
                totalPercents.Add(pctTotal);

                combinedSubmits.Add((submit.SubmittedAt, submit.Id, submit.Assignment.Id, submit.Assignment.AssignmentGroup.Id, pctTotal));
            }

            foreach (var submit in idnetSubmits)
            {
                idnetAnswerKeyByAssignment.TryGetValue(submit.Assignment.Id, out var key);
                double pctTotal = AssignmentEvaluationUtils.CalculateIdNetSuccessRate(key, submit, submit.Assignment.AssignmentGroup.TestWildcard, submit.Assignment.AssignmentGroup.TestFirstLastBr);
                totalPercents.Add(pctTotal);
                combinedSubmits.Add((submit.SubmittedAt, submit.Id, submit.Assignment.Id, submit.Assignment.AssignmentGroup.Id, pctTotal));
            }

            double? avgNetwork = networkPercents.Count > 0 ? networkPercents.Average() : (double?)null;
            double? avgFirst = firstPercents.Count > 0 ? firstPercents.Average() : (double?)null;
            double? avgLast = lastPercents.Count > 0 ? lastPercents.Average() : (double?)null;
            double? avgBroadcast = broadcastPercents.Count > 0 ? broadcastPercents.Average() : (double?)null;
            double avgTotal = totalPercents.Count > 0 ? totalPercents.Average() : 0.0;

            var successRate = combinedSubmits
                .OrderBy(s => s.submittedAt)
                .ThenBy(s => s.id)
                .Select(s => new UserDetailsSuccessRateDto
                {
                    Date = s.submittedAt.ToString("yyyy-MM-dd"),
                    Percentage = s.percentage
                })
                .ToArray();

            var latest = combinedSubmits
                .OrderByDescending(s => s.submittedAt)
                .ThenByDescending(s => s.id)
                .FirstOrDefault();

            int? lastSubmitGroupId = combinedSubmits.Count > 0 ? latest.groupId : (int?)null;
            int? lastSubmitAssignmentId = combinedSubmits.Count > 0 ? latest.assignmentId : (int?)null;
            int? lastSubmitAttempt = null;
            DateTime? lastSubmitAt = combinedSubmits.Count > 0 ? latest.submittedAt : (DateTime?)null;

            var res = new QueryUserDetailsRes
            {
                Username = UsernameUtils.ToDisplay(user.Username),
                TotalSubmits = totalSubmits,
                LastSubmitGroupId = lastSubmitGroupId,
                LastSubmitAssignmentId = lastSubmitAssignmentId,
                LastSubmitAttempt = lastSubmitAttempt,
                LastSubmitAt = lastSubmitAt,
                Classes = classesDto,
                AverageNetwork = avgNetwork,
                AverageFirst = avgFirst,
                AverageLast = avgLast,
                AverageBroadcast = avgBroadcast,
                AverageTotal = avgTotal,
                SuccessRate = successRate,
                TotalAssignmentGroups = totalAssignmentGroups,
                TotalUpcoming = totalUpcoming,
                TotalInProgress = totalInProgress,
                TotalEnded = totalEnded,
                Role = user.Role,
                CreatedAt = user.CreatedAt
            };

            return Ok(res);
        }
    }
}