using IPCheckr.Api.DTOs.Class;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.DTOs;

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

            var assignmentGroups = await _db.AssignmentGroups
                .Include(ag => ag.Class)
                .Where(ag => ag.Class.Id == @class.Id)
                .ToListAsync();

            var groupIds = assignmentGroups.Select(ag => ag.Id).ToArray();

            var assignments = await _db.Assignments
                .Include(a => a.Student)
                .Include(a => a.AssignmentGroup)
                    .ThenInclude(ag => ag.Class)
                .Where(a => groupIds.Contains(a.AssignmentGroup.Id))
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

            static double ComputeSubmitPercent(Models.AssignmentAnswerKey answerKey, Models.AssignmentSubmit submit)
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

            var submitPercents = submits
                .Where(s => answerKeyByAssignment.ContainsKey(s.Assignment.Id))
                .Select(s => ComputeSubmitPercent(answerKeyByAssignment[s.Assignment.Id], s))
                .ToList();

            double averageSuccessRate = submitPercents.Count > 0 ? submitPercents.Average() : 0.0;

            int totalAssignmentGroups = assignmentGroups.Count;
            int totalUpcoming = assignmentGroups.Count(ag => ag.StartDate > now);
            int totalInProgress = assignmentGroups.Count(ag => ag.StartDate <= now && ag.Deadline >= now);
            int totalEnded = assignmentGroups.Count(ag => ag.Deadline <= now);

            var teachers = Array.Empty<ClassDetailsTeachersDto>();
            for (int i = 0; i < (@class.Teachers ?? Enumerable.Empty<Models.User>()).Count(); i++)
            {
                var t = (@class.Teachers ?? Enumerable.Empty<Models.User>()).ElementAt(i);
                teachers = teachers.Append(new ClassDetailsTeachersDto
                {
                    TeacherId = t.Id,
                    Username = t.Username
                }).ToArray();
            }

            var studentsArr = (@class.Students ?? Enumerable.Empty<Models.User>())
                .Select(s => new ClassDetailsStudentsDto
                {
                    StudentId = s.Id,
                    Username = s.Username
                })
                .OrderBy(s => s.Username)
                .ToArray();

            var avgInStudents = submits
                .Where(s => answerKeyByAssignment.ContainsKey(s.Assignment.Id))
                .GroupBy(s => new { s.Assignment.Student.Id, s.Assignment.Student.Username })
                .Select(g =>
                {
                    var avg = g.Average(s => ComputeSubmitPercent(answerKeyByAssignment[s.Assignment.Id], s));
                    return new AverageSuccessRateInStudentsDto
                    {
                        Username = g.Key.Username,
                        Percentage = avg
                    };
                })
                .OrderByDescending(x => x.Percentage)
                .ToArray();

            var avgInAssignmentGroups = assignmentGroups
                .Select(ag =>
                {
                    var gSubmits = submits
                        .Where(s => s.Assignment.AssignmentGroup.Id == ag.Id && answerKeyByAssignment.ContainsKey(s.Assignment.Id))
                        .ToList();

                    double avg = gSubmits.Count > 0
                        ? gSubmits.Average(s => ComputeSubmitPercent(answerKeyByAssignment[s.Assignment.Id], s))
                        : 0.0;

                    return new
                    {
                        ag.Name,
                        ag.StartDate,
                        Avg = avg
                    };
                })
                .OrderBy(x => x.StartDate)
                .Select(x => new AverageSuccessRateInAssignmentGroupsDto
                {
                    AssignmentGroupName = x.Name,
                    Percentage = x.Avg
                })
                .ToArray();

            var lastSubmit = submits
                .OrderByDescending(s => s.SubmittedAt)
                .ThenByDescending(s => s.Id)
                .FirstOrDefault();
            var lastSubmitUsername = lastSubmit?.Assignment.Student.Username;
            int? lastSubmitId = lastSubmit?.Assignment.Id;
            int? lastSubmitGroupId = lastSubmit?.Assignment.AssignmentGroup.Id;
            int? lastSubmitAttempt = lastSubmit?.Attempt;

            var res = new QueryClassDetailsRes
            {
                ClassName = @class.Name,
                TotalSubmits = submits.Count,
                AverageSuccessRate = averageSuccessRate,
                TotalAssignmentGroups = totalAssignmentGroups,
                TotalUpcoming = totalUpcoming,
                TotalInProgress = totalInProgress,
                TotalEnded = totalEnded,
                Teachers = teachers,
                CreatedAt = @class.CreatedAt,
                Students = studentsArr,
                LastSubmitAt = lastSubmit?.SubmittedAt,
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