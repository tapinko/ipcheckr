using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Assignment;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Utils;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentController : ControllerBase
    {
        [HttpGet("get-assignment-submit-details-full")]
        [ProducesResponseType(typeof(QueryAssignmentSubmitDetailsFullRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QueryAssignmentSubmitDetailsFullRes>> QueryAssignmentSubmitDetailsFull([FromQuery] QueryAssignmentSubmitDetailsFullReq req)
        {
            int callerId = int.Parse(User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;

            var assignment = await _db.Assignments
                .Include(a => a.AssignmentGroup)
                    .ThenInclude(ag => ag.Class)
                        .ThenInclude(c => c.Teachers)
                .Include(a => a.Student)
                .FirstOrDefaultAsync(a => a.Id == req.AssignmentId);

            if (assignment == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Assignment not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Assignment not found.",
                    MessageSk = "Zadanie nebolo nájdené."
                });

            var classTeachers = assignment.AssignmentGroup.Class.Teachers?.Select(t => t.Id).ToList() ?? new List<int>();
            bool isTeacherInClass = callerRole == "Teacher" && classTeachers.Contains(callerId);
            bool isStudentOwner = callerRole == "Student" && assignment.Student.Id == callerId;

            bool studentHasSubmitted = false;
            if (isStudentOwner)
            {
                studentHasSubmitted = await _db.AssignmentSubmits
                    .AnyAsync(s => s.Assignment.Id == assignment.Id && s.Assignment.Student.Id == callerId);
            }

            if (!(isTeacherInClass || (isStudentOwner && studentHasSubmitted)))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to access this assignment submit details.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to access this assignment submit details.",
                    MessageSk = "Nemáte oprávnenie na prístup k detailom odovzdania tohto zadania."
                });

            var answerKey = await _db.AssignmentAnswerKeys
                .FirstOrDefaultAsync(ak => ak.Assignment.Id == assignment.Id);

            if (answerKey == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Answer key not found for this assignment.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Answer key not found for this assignment.",
                    MessageSk = "Kľúč odpovedí pre toto zadanie nebol nájdený."
                });

            var submit = await _db.AssignmentSubmits
                .Where(s => s.Assignment.Id == assignment.Id && s.Attempt == req.Attempt)
                .FirstOrDefaultAsync();

            if (submit == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "This attempt does not exist.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "This attempt does not exist.",
                    MessageSk = "Tento pokus neexistuje."
                });

            var numberOfSubmits = await _db.AssignmentSubmits
                .CountAsync(s => s.Assignment.Id == assignment.Id);

            int recordCount = answerKey.Networks.Length;
            var results = new List<QueryAssignmentSubmitDetailsFullRecordField>();

            for (int i = 0; i < recordCount; i++)
            {
                results.Add(new QueryAssignmentSubmitDetailsFullRecordField
                {
                    Hosts = answerKey.Assignment.Hosts[i],
                    Network = new QueryAssignmentSubmitDetailsFullAnswerField
                    {
                        Submitted = submit?.Networks.ElementAtOrDefault(i),
                        Correct = answerKey.Networks.ElementAtOrDefault(i) ?? ""
                    },
                    FirstUsable = new QueryAssignmentSubmitDetailsFullAnswerField
                    {
                        Submitted = submit?.FirstUsables.ElementAtOrDefault(i),
                        Correct = answerKey.FirstUsables.ElementAtOrDefault(i) ?? ""
                    },
                    LastUsable = new QueryAssignmentSubmitDetailsFullAnswerField
                    {
                        Submitted = submit?.LastUsables.ElementAtOrDefault(i),
                        Correct = answerKey.LastUsables.ElementAtOrDefault(i) ?? ""
                    },
                    Broadcast = new QueryAssignmentSubmitDetailsFullAnswerField
                    {
                        Submitted = submit?.Broadcasts.ElementAtOrDefault(i),
                        Correct = answerKey.Broadcasts.ElementAtOrDefault(i) ?? ""
                    }
                });
            }

            double successRate = 0.0;
            if (submit != null)
            {
                string[][] answerArrays =
                {
                    answerKey.Networks ?? Array.Empty<string>(),
                    answerKey.FirstUsables ?? Array.Empty<string>(),
                    answerKey.LastUsables ?? Array.Empty<string>(),
                    answerKey.Broadcasts ?? Array.Empty<string>()
                };
                string[][] submitArrays =
                {
                    submit.Networks ?? Array.Empty<string>(),
                    submit.FirstUsables ?? Array.Empty<string>(),
                    submit.LastUsables ?? Array.Empty<string>(),
                    submit.Broadcasts ?? Array.Empty<string>()
                };

                int totalFields = answerArrays.Sum(a => a.Length);
                if (totalFields > 0)
                {
                    int correctFields = 0;
                    for (int i = 0; i < answerArrays.Length; i++)
                    {
                        var ansArr = answerArrays[i];
                        var subArr = submitArrays[i];
                        int len = Math.Min(ansArr.Length, subArr.Length);
                        for (int j = 0; j < len; j++)
                        {
                            if (ansArr[j] == subArr[j])
                                correctFields++;
                        }
                    }
                    successRate = (double)correctFields / totalFields * 100.0;
                }
            }

            return Ok(new QueryAssignmentSubmitDetailsFullRes
            {
                AssignmentGroupName = assignment.AssignmentGroup.Name,
                Description = assignment.AssignmentGroup.Description,
                Results = results.ToArray(),
                NumberOfSubmits = numberOfSubmits,
                SubmittedAt = submit?.SubmittedAt ?? DateTime.MinValue,
                StudentName = UsernameUtils.ToDisplay(assignment.Student.Username),
                SuccessRate = successRate,
                AssignmentGroupIpCat = assignment.AssignmentGroup.AssignmentIpCat
            });
        }
    }
}