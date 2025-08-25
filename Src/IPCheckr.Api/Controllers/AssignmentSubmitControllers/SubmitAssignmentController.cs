using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentSubmit;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentSubmitController : ControllerBase
    {
        [HttpPost("submit-assignment")]
        [ProducesResponseType(typeof(SubmitAssignmentRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<SubmitAssignmentRes>> SubmitAssignment([FromBody] SubmitAssignmentReq req)
        {
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(callerIdStr, out int callerId))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You must be logged in to submit assignments.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You must be logged in to submit assignments.",
                    MessageSk = "Musíte byť prihlásený, aby ste mohli odovzdávať zadania."
                });

            var assignment = await _db.Assignments
                .Include(a => a.Student)
                .Include(a => a.AssignmentGroup)
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

            if (assignment.Student.Id != callerId)
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to access this assignment.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to access this assignment.",
                    MessageSk = "Nemáte oprávnenie na prístup k tomuto zadaniu."
                });

            var possibleAttempts = assignment.AssignmentGroup.PossibleAttempts;
            var previousSubmits = await _db.AssignmentSubmits
                .Where(s => s.Assignment.Id == assignment.Id)
                .OrderByDescending(s => s.Attempt)
                .ToListAsync();

            int currentAttempt = previousSubmits.Count + 1;
            if (previousSubmits.Count >= possibleAttempts)
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You have reached the maximum number of attempts for this assignment.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You have reached the maximum number of attempts for this assignment.",
                    MessageSk = "Dosiahli ste maximálny počet pokusov pre toto zadanie."
                });

            var data = req.Data ?? Array.Empty<SubmitAssignmentField>();
            var networks = data.Select(d => d.Network ?? "").ToArray();
            var firstUsables = data.Select(d => d.FirstUsable ?? "").ToArray();
            var lastUsables = data.Select(d => d.LastUsable ?? "").ToArray();
            var broadcasts = data.Select(d => d.Broadcast ?? "").ToArray();

            var submit = new AssignmentSubmit
            {
                Assignment = assignment,
                Attempt = currentAttempt,
                Networks = networks,
                FirstUsables = firstUsables,
                LastUsables = lastUsables,
                Broadcasts = broadcasts
            };
            _db.AssignmentSubmits.Add(submit);
            await _db.SaveChangesAsync();

            var answerKey = await _db.AssignmentAnswerKeys
                .FirstOrDefaultAsync(ak => ak.Assignment.Id == assignment.Id);

            bool isCorrect = false;
            if (answerKey != null)
            {
                string[][] answerArrays = { answerKey.Networks, answerKey.FirstUsables, answerKey.LastUsables, answerKey.Broadcasts };
                string[][] submitArrays = { networks, firstUsables, lastUsables, broadcasts };

                int totalFields = answerArrays.Sum(arr => arr.Length);
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
                isCorrect = totalFields > 0 && correctFields == totalFields;
            }

            if (isCorrect)
            {
                assignment.IsCompleted = true;
                assignment.CompletedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
            else if (currentAttempt == possibleAttempts)
            {
                assignment.IsCompleted = true;
                assignment.CompletedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }

            return Ok(new SubmitAssignmentRes
            {
                AssignmentSubmitId = submit.Id,
                Attempt = submit.Attempt
            });
        }
    }
}