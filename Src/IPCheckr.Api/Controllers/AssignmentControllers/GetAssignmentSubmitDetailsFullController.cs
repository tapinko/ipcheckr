using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Assignment;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentController : ControllerBase
    {
        [HttpGet("get-subnet-assignment-submit-details-full")]
        [ProducesResponseType(typeof(QuerySubnetAssignmentSubmitDetailsFullRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QuerySubnetAssignmentSubmitDetailsFullRes>> QuerySubnetAssignmentSubmitDetailsFull([FromQuery] QuerySubnetAssignmentSubmitDetailsFullReq req)
        {
            int callerId = int.Parse(User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;

            var assignment = await _db.SubnetAssignments
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

            var submit = await _db.SubnetAssignmentSubmits
                .Where(s => s.Assignment.Id == assignment.Id)
                .OrderByDescending(s => s.SubmittedAt)
                .FirstOrDefaultAsync();

            if (!(isTeacherInClass || (isStudentOwner && submit != null)))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to access this assignment submit details.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to access this assignment submit details.",
                    MessageSk = "Nemáte oprávnenie na prístup k detailom odovzdania tohto zadania."
                });

            if (submit == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Submission not found for this assignment.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Submission not found for this assignment.",
                    MessageSk = "Pre toto zadanie nebolo nájdené žiadne odovzdanie."
                });

            var answerKey = await _db.SubnetAssignmentAnswerKeys
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

            int recordCount = answerKey.Networks.Length;
            var results = new List<QuerySubnetAssignmentSubmitDetailsFullRecordField>();

            for (int i = 0; i < recordCount; i++)
            {
                results.Add(new QuerySubnetAssignmentSubmitDetailsFullRecordField
                {
                    Hosts = assignment.Hosts.ElementAtOrDefault(i),
                    Network = new QuerySubnetAssignmentSubmitDetailsFullAnswerField
                    {
                        Submitted = submit.Networks?.ElementAtOrDefault(i),
                        Correct = answerKey.Networks.ElementAtOrDefault(i) ?? string.Empty
                    },
                    FirstUsable = new QuerySubnetAssignmentSubmitDetailsFullAnswerField
                    {
                        Submitted = submit.FirstUsables?.ElementAtOrDefault(i),
                        Correct = answerKey.FirstUsables.ElementAtOrDefault(i) ?? string.Empty
                    },
                    LastUsable = new QuerySubnetAssignmentSubmitDetailsFullAnswerField
                    {
                        Submitted = submit.LastUsables?.ElementAtOrDefault(i),
                        Correct = answerKey.LastUsables.ElementAtOrDefault(i) ?? string.Empty
                    },
                    Broadcast = new QuerySubnetAssignmentSubmitDetailsFullAnswerField
                    {
                        Submitted = submit.Broadcasts?.ElementAtOrDefault(i),
                        Correct = answerKey.Broadcasts.ElementAtOrDefault(i) ?? string.Empty
                    }
                });
            }

            var successRate = AssignmentEvaluationUtils.CalculateSubnetSuccessRate(answerKey, submit);
            var status = AssignmentEvaluationUtils.ResolveStatus(assignment.AssignmentGroup.StartDate, assignment.AssignmentGroup.Deadline, assignment.AssignmentGroup.CompletedAt);

            return Ok(new QuerySubnetAssignmentSubmitDetailsFullRes
            {
                Name = assignment.AssignmentGroup.Name,
                Description = assignment.AssignmentGroup.Description,
                Results = results.ToArray(),
                SubmittedAt = submit.SubmittedAt,
                StudentName = UsernameUtils.ToDisplay(assignment.Student.Username),
                SuccessRate = successRate,
                IpCat = assignment.AssignmentGroup.AssignmentIpCat,
                Status = status
            });
        }

        [HttpGet("get-idnet-assignment-submit-details-full")]
        [ProducesResponseType(typeof(QueryIDNetAssignmentSubmitDetailsFullRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QueryIDNetAssignmentSubmitDetailsFullRes>> QueryIdNetAssignmentSubmitDetailsFull([FromQuery] QueryIDNetAssignmentSubmitDetailsFullReq req)
        {
            int callerId = int.Parse(User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;

            var assignment = await _db.IDNetAssignments
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

            var submit = await _db.IDNetAssignmentSubmits
                .Where(s => s.Assignment.Id == assignment.Id)
                .OrderByDescending(s => s.SubmittedAt)
                .FirstOrDefaultAsync();

            if (!(isTeacherInClass || (isStudentOwner && submit != null)))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to access this assignment submit details.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to access this assignment submit details.",
                    MessageSk = "Nemáte oprávnenie na prístup k detailom odovzdania tohto zadania."
                });

            if (submit == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Submission not found for this assignment.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Submission not found for this assignment.",
                    MessageSk = "Pre toto zadanie nebolo nájdené žiadne odovzdanie."
                });

            var answerKey = await _db.IDNetAssignmentAnswerKeys
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

            int recordCount = answerKey.IDNet.Length;
            var results = new List<QueryIDNetAssignmentSubmitDetailsFullRecordField>();

            for (int i = 0; i < recordCount; i++)
            {
                results.Add(new QueryIDNetAssignmentSubmitDetailsFullRecordField
                {
                    Address = assignment.Addresses.ElementAtOrDefault(i) ?? string.Empty,
                    IDNet = new QueryIDNetAssignmentSubmitDetailsFullAnswerField
                    {
                        Submitted = submit.IDNet?.ElementAtOrDefault(i),
                        Correct = answerKey.IDNet.ElementAtOrDefault(i) ?? string.Empty
                    },
                    Wildcard = new QueryIDNetAssignmentSubmitDetailsFullAnswerField
                    {
                        Submitted = submit.Wildcard?.ElementAtOrDefault(i),
                        Correct = answerKey.Wildcards.ElementAtOrDefault(i) ?? string.Empty
                    },
                    FirstUsable = new QueryIDNetAssignmentSubmitDetailsFullAnswerField
                    {
                        Submitted = submit.FirstUsables?.ElementAtOrDefault(i),
                        Correct = answerKey.FirstUsables.ElementAtOrDefault(i) ?? string.Empty
                    },
                    LastUsable = new QueryIDNetAssignmentSubmitDetailsFullAnswerField
                    {
                        Submitted = submit.LastUsables?.ElementAtOrDefault(i),
                        Correct = answerKey.LastUsables.ElementAtOrDefault(i) ?? string.Empty
                    },
                    Broadcast = new QueryIDNetAssignmentSubmitDetailsFullAnswerField
                    {
                        Submitted = submit.Broadcasts?.ElementAtOrDefault(i),
                        Correct = answerKey.Broadcasts.ElementAtOrDefault(i) ?? string.Empty
                    }
                });
            }

            var successRate = AssignmentEvaluationUtils.CalculateIdNetSuccessRate(answerKey, submit, assignment.AssignmentGroup.TestWildcard, assignment.AssignmentGroup.TestFirstLastBr);
            var status = AssignmentEvaluationUtils.ResolveStatus(assignment.AssignmentGroup.StartDate, assignment.AssignmentGroup.Deadline, assignment.AssignmentGroup.CompletedAt);

            return Ok(new QueryIDNetAssignmentSubmitDetailsFullRes
            {
                Name = assignment.AssignmentGroup.Name,
                Description = assignment.AssignmentGroup.Description,
                Results = results.ToArray(),
                SubmittedAt = submit.SubmittedAt,
                StudentName = UsernameUtils.ToDisplay(assignment.Student.Username),
                SuccessRate = successRate,
                IpCat = assignment.AssignmentGroup.AssignmentIpCat,
                Status = status
            });
        }
    }
}