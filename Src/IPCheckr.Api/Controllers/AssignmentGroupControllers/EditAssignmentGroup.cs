using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentGroup;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentGroupController : ControllerBase
    {
        [HttpPut("edit-assignment-group")]
        [ProducesResponseType(typeof(void), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> EditAssignmentGroups([FromBody] EditAssignmentGroupsReq req)
        {
            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);

            var assignmentGroup = await _db.AssignmentGroups
                .Include(ag => ag.Class)
                    .ThenInclude(c => c.Teachers)
                .Include(ag => ag.Class)
                    .ThenInclude(c => c.Students)
                .FirstOrDefaultAsync(ag => ag.Id == req.Id);

            if (assignmentGroup == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Assignment group not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Assignment group not found.",
                    MessageSk = "Skupina úloh nebola nájdená."
                });

            if (assignmentGroup.Class.Teachers == null || !assignmentGroup.Class.Teachers.Any(t => t.Id == callerId))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to edit this assignment group.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to edit this assignment group.",
                    MessageSk = "Nemáte oprávnenie upravovať túto skupinu úloh."
                });

            if (req.AssignmentGroupName != null)
                assignmentGroup.Name = req.AssignmentGroupName;

            if (req.Description != null)
                assignmentGroup.Description = req.Description;

            if (req.PossibleAttempts.HasValue)
            {
                if (req.PossibleAttempts.Value <= 0)
                    return BadRequest(new ApiProblemDetails
                    {
                        Title = "Bad Request",
                        Detail = "PossibleAttempts must be greater than 0.",
                        Status = StatusCodes.Status400BadRequest,
                        MessageEn = "PossibleAttempts must be greater than 0.",
                        MessageSk = "Možný počet pokusov musí byť väčší ako 0."
                    });
                assignmentGroup.PossibleAttempts = req.PossibleAttempts.Value;
            }

            if (req.StartDate.HasValue)
                assignmentGroup.StartDate = req.StartDate.Value;

            if (req.Deadline.HasValue)
                assignmentGroup.Deadline = req.Deadline.Value;

            if (assignmentGroup.StartDate > assignmentGroup.Deadline)
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "StartDate cannot be after Deadline.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "StartDate cannot be after Deadline.",
                    MessageSk = "Dátum začiatku nemôže byť po termíne ukončenia."
                });

            if (req.Students != null)
            {
                var classStudentIds = assignmentGroup.Class.Students?.Select(s => s.Id).ToHashSet() ?? new HashSet<int>();
                var desiredStudentIds = req.Students.Where(id => classStudentIds.Contains(id)).ToHashSet();

                var existingAssignments = await _db.Assignments
                    .Include(a => a.Student)
                    .Where(a => a.AssignmentGroup.Id == assignmentGroup.Id)
                    .ToListAsync();

                var existingMap = existingAssignments.ToDictionary(a => a.Student.Id, a => a);

                var toRemove = existingAssignments
                    .Where(a => !desiredStudentIds.Contains(a.Student.Id))
                    .ToList();

                if (toRemove.Any())
                {
                    var removeIds = toRemove.Select(a => a.Id).ToArray();

                    var removeSubmits = await _db.AssignmentSubmits
                        .Where(s => removeIds.Contains(s.Assignment.Id))
                        .ToListAsync();

                    var removeAnswerKeys = await _db.AssignmentAnswerKeys
                        .Where(k => removeIds.Contains(k.Assignment.Id))
                        .ToListAsync();

                    _db.AssignmentSubmits.RemoveRange(removeSubmits);
                    _db.AssignmentAnswerKeys.RemoveRange(removeAnswerKeys);
                    _db.Assignments.RemoveRange(toRemove);
                }

                var newStudentIds = desiredStudentIds
                    .Where(id => !existingMap.ContainsKey(id))
                    .ToList();

                if (newStudentIds.Any())
                {
                    var studentsDict = assignmentGroup.Class.Students!
                        .Where(s => newStudentIds.Contains(s.Id))
                        .ToDictionary(s => s.Id, s => s);

                    foreach (var sid in newStudentIds)
                    {
                        if (!studentsDict.TryGetValue(sid, out var studentUser))
                            continue;

                        var assignmentData = TryGenerateAssignmentData(assignmentGroup.NumberOfRecords);
                        if (assignmentData == null)
                            return StatusCode(StatusCodes.Status500InternalServerError, new ApiProblemDetails
                            {
                                Title = "Internal Server Error",
                                Detail = "Failed to generate assignment data.",
                                Status = StatusCodes.Status500InternalServerError,
                                MessageEn = "Failed to generate assignment data.",
                                MessageSk = "Nepodarilo sa vygenerovať údaje pre zadanie."
                            });

                        var (cidr, hosts) = assignmentData.Value;

                        var assignment = new Assignment
                        {
                            AssignmentGroup = assignmentGroup,
                            Student = studentUser,
                            Cidr = cidr,
                            Hosts = hosts,
                            IsCompleted = false
                        };
                        _db.Assignments.Add(assignment);

                        var answerKey = CalculateSubnettingAnswerKey(cidr, hosts);
                        var answerKeyEntity = new AssignmentAnswerKey
                        {
                            Assignment = assignment,
                            Networks = answerKey.Networks,
                            FirstUsables = answerKey.FirstUsables,
                            LastUsables = answerKey.LastUsables,
                            Broadcasts = answerKey.Broadcasts
                        };
                        _db.AssignmentAnswerKeys.Add(answerKeyEntity);
                    }
                }
            }

            await _db.SaveChangesAsync();

            return Ok();
        }
    }
}