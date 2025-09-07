using IPCheckr.Api.DTOs.User;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Dashboard;

namespace IPCheckr.Api.Controllers
{
    public partial class UserController : ControllerBase
    {
        [HttpGet("get-student-details")]
        [ProducesResponseType(typeof(QueryStudentDetailsRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QueryStudentDetailsRes>> QueryStudentDetails([FromQuery] QueryStudentDetailsReq req)
        {
            var student = await _db.Users.FirstOrDefaultAsync(u => u.Id == req.StudentId!.Value);
            if (student == null)
                return StatusCode(StatusCodes.Status404NotFound, new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "User not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "User not found.",
                    MessageSk = "Používateľ nebol nájdený."
                });

            var classNames = await _db.Classes
                .AsNoTracking()
                .Where(c => c.Students!.Any(s => s.Id == student.Id) || c.Teachers!.Any(t => t.Id == student.Id))
                .Select(c => c.Name)
                .OrderBy(n => n)
                .ToListAsync();

            var classesStr = string.Join(", ", classNames);

            var submits = await _db.AssignmentSubmits
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.AssignmentGroup)
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Student)
                .Where(s => s.Assignment.Student.Id == student.Id)
                .ToListAsync();

            var totalSubmits = submits.Count;

            var lastSubmit = submits
                .OrderByDescending(s => s.SubmittedAt)
                .ThenByDescending(s => s.Id)
                .FirstOrDefault();

            int? lastSubmitGroupId = lastSubmit?.Assignment.AssignmentGroup.Id;
            int? lastSubmitAssignmentId = lastSubmit?.Assignment.Id;
            int? lastSubmitAttempt = lastSubmit?.Attempt;
            DateTime? lastSubmitAt = lastSubmit?.SubmittedAt;

            if (totalSubmits == 0)
            {
                var resNoSubmits = new QueryStudentDetailsRes
                {
                    Username = student.Username,
                    TotalSubmits = 0,
                    LastSubmitGroupId = null,
                    LastSubmitAssignmentId = null,
                    LastSubmitAttempt = null,
                    LastSubmitAt = null,
                    Classes = classesStr,
                    AverageNetwork = null,
                    AverageFirst = null,
                    AverageLast = null,
                    AverageBroadcast = null,
                    AverageTotal = 0.0,
                    SuccessRate = Array.Empty<StudentLinesChartDataDto>()
                };

                return Ok(resNoSubmits);
            }

            var assignmentIds = submits.Select(s => s.Assignment.Id).Distinct().ToArray();
            var answerKeys = await _db.AssignmentAnswerKeys
                .Include(k => k.Assignment)
                .Where(k => assignmentIds.Contains(k.Assignment.Id))
                .ToListAsync();

            var answerKeyByAssignment = answerKeys.ToDictionary(k => k.Assignment.Id, k => k);

            var networkPercents = new List<double>();
            var firstPercents = new List<double>();
            var lastPercents = new List<double>();
            var broadcastPercents = new List<double>();
            var totalPercents = new List<double>();

            foreach (var submit in submits)
            {
                if (!answerKeyByAssignment.TryGetValue(submit.Assignment.Id, out var key))
                    continue;

                string[][] ans =
                {
                    key.Networks ?? Array.Empty<string>(),
                    key.FirstUsables ?? Array.Empty<string>(),
                    key.LastUsables ?? Array.Empty<string>(),
                    key.Broadcasts ?? Array.Empty<string>()
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
            }

            double? avgNetwork = networkPercents.Count > 0 ? networkPercents.Average() : (double?)null;
            double? avgFirst = firstPercents.Count > 0 ? firstPercents.Average() : (double?)null;
            double? avgLast = lastPercents.Count > 0 ? lastPercents.Average() : (double?)null;
            double? avgBroadcast = broadcastPercents.Count > 0 ? broadcastPercents.Average() : (double?)null;
            double avgTotal = totalPercents.Count > 0 ? totalPercents.Average() : 0.0;

            var successRate = new List<StudentLinesChartDataDto>();
            foreach (var submit in submits.OrderBy(s => s.SubmittedAt).ThenBy(s => s.Id))
            {
                if (!answerKeyByAssignment.TryGetValue(submit.Assignment.Id, out var key))
                    continue;

                string[][] answer =
                {
                    key.Networks ?? Array.Empty<string>(),
                    key.FirstUsables ?? Array.Empty<string>(),
                    key.LastUsables ?? Array.Empty<string>(),
                    key.Broadcasts ?? Array.Empty<string>()
                };
                string[][] submission =
                {
                    submit.Networks ?? Array.Empty<string>(),
                    submit.FirstUsables ?? Array.Empty<string>(),
                    submit.LastUsables ?? Array.Empty<string>(),
                    submit.Broadcasts ?? Array.Empty<string>()
                };

                int total = answer.Sum(a => a.Length);
                int correct = 0;
                for (int i = 0; i < answer.Length; i++)
                {
                    int len = Math.Min(answer[i].Length, submission[i].Length);
                    for (int j = 0; j < len; j++)
                    {
                        if (answer[i][j] == submission[i][j]) correct++;
                    }
                }
                double percentage = total == 0 ? 0.0 : (double)correct / total * 100.0;

                successRate.Add(new StudentLinesChartDataDto
                {
                    Date = submit.SubmittedAt.ToString("yyyy-MM-dd"),
                    Percentage = percentage
                });
            }

            var res = new QueryStudentDetailsRes
            {
                Username = student.Username,
                TotalSubmits = totalSubmits,
                LastSubmitGroupId = lastSubmitGroupId,
                LastSubmitAssignmentId = lastSubmitAssignmentId,
                LastSubmitAttempt = lastSubmitAttempt,
                LastSubmitAt = lastSubmitAt,
                Classes = classesStr,
                AverageNetwork = avgNetwork,
                AverageFirst = avgFirst,
                AverageLast = avgLast,
                AverageBroadcast = avgBroadcast,
                AverageTotal = avgTotal,
                SuccessRate = successRate.ToArray()
            };

            return Ok(res);
        }
    }
}