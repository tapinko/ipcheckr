using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Assignment;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            if (!int.TryParse(callerIdStr, out int callerId))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You must be logged in to access assignment submit details.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You must be logged in to access assignment submit details.",
                    MessageSk = "Musíte byť prihlásený, aby ste mohli pristupovať k detailom odovzdania zadania."
                });

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

            return Ok(new QueryAssignmentSubmitDetailsFullRes
            {
                AssignmentGroupName = assignment.AssignmentGroup.Name,
                Results = results.ToArray(),
                NumberOfSubmits = numberOfSubmits
            });
        }
    }
}