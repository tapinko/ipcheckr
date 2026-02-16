using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentGroup;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Utils;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentGroupController : ControllerBase
    {
        [HttpPut("edit-subnet-assignment-group")]
        [ProducesResponseType(typeof(void), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> EditSubnetAssignmentGroup([FromBody] EditSubnetAGReq req)
        {
            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);

            var subnetGroup = await _db.SubnetAGs
                .Include(ag => ag.Class)
                    .ThenInclude(c => c.Teachers)
                .Include(ag => ag.Class)
                    .ThenInclude(c => c.Students)
                .FirstOrDefaultAsync(ag => ag.Id == req.Id);

            if (subnetGroup == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Assignment group not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Assignment group not found.",
                    MessageSk = "Skupina zadania nebola nájdená."
                });

            var groupClass = subnetGroup.Class;
            if (groupClass.Teachers == null || !groupClass.Teachers.Any(t => t.Id == callerId))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to edit this assignment group.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to edit this assignment group.",
                    MessageSk = "Nemáte oprávnenie upravovať túto skupinu zadania."
                });

            if (req.Name != null) subnetGroup.Name = req.Name;
            if (req.Description != null) subnetGroup.Description = req.Description;
            if (req.StartDate.HasValue) subnetGroup.StartDate = req.StartDate.Value;
            if (req.Deadline.HasValue) subnetGroup.Deadline = req.Deadline.Value;

            if (subnetGroup.StartDate > subnetGroup.Deadline)
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
                var classStudentIds = groupClass.Students?.Select(s => s.Id).ToHashSet() ?? new HashSet<int>();
                var desiredStudentIds = req.Students.Where(id => classStudentIds.Contains(id)).ToHashSet();

                var existingAssignments = await _db.SubnetAssignments
                    .Include(a => a.Student)
                    .Where(a => a.AssignmentGroup.Id == subnetGroup.Id)
                    .ToListAsync();

                var toRemove = existingAssignments.Where(a => !desiredStudentIds.Contains(a.Student.Id)).ToList();
                if (toRemove.Any())
                {
                    var removeIds = toRemove.Select(a => a.Id).ToArray();
                    var removeSubmits = await _db.SubnetAssignmentSubmits.Where(s => removeIds.Contains(s.Assignment.Id)).ToListAsync();
                    var removeAnswerKeys = await _db.SubnetAssignmentAnswerKeys.Where(k => removeIds.Contains(k.Assignment.Id)).ToListAsync();
                    _db.SubnetAssignmentSubmits.RemoveRange(removeSubmits);
                    _db.SubnetAssignmentAnswerKeys.RemoveRange(removeAnswerKeys);
                    _db.SubnetAssignments.RemoveRange(toRemove);
                }

                var existingMap = existingAssignments.ToDictionary(a => a.Student.Id, a => a);
                var newStudentIds = desiredStudentIds.Where(id => !existingMap.ContainsKey(id)).ToList();
                if (newStudentIds.Any())
                {
                    var studentsDict = groupClass.Students!
                        .Where(s => newStudentIds.Contains(s.Id))
                        .ToDictionary(s => s.Id, s => s);

                    foreach (var sid in newStudentIds)
                    {
                        if (!studentsDict.TryGetValue(sid, out var studentUser))
                            continue;

                        var assignmentData = TryGenerateAssignmentData(subnetGroup.NumberOfRecords, subnetGroup.AssignmentIpCat);
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
                        var answerKey = CalculateSubnettingAnswerKey(cidr, hosts);

                        var assignment = new SubnetAssignment
                        {
                            AssignmentGroup = subnetGroup,
                            Student = studentUser,
                            Cidr = cidr,
                            Hosts = hosts
                        };

                        _db.SubnetAssignments.Add(assignment);
                        _db.SubnetAssignmentAnswerKeys.Add(new SubnetAssignmentAnswerKey
                        {
                            Assignment = assignment,
                            Networks = answerKey.Networks,
                            FirstUsables = answerKey.FirstUsables,
                            LastUsables = answerKey.LastUsables,
                            Broadcasts = answerKey.Broadcasts
                        });
                    }
                }
            }

            subnetGroup.Status = AssignmentEvaluationUtils.ResolveStatus(subnetGroup.StartDate, subnetGroup.Deadline, subnetGroup.CompletedAt);
            await _db.SaveChangesAsync();
            return Ok();
        }

        [HttpPut("edit-idnet-assignment-group")]
        [ProducesResponseType(typeof(void), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> EditIdNetAssignmentGroup([FromBody] EditIDNetAGReq req)
        {
            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);

            var idnetGroup = await _db.IDNetAGs
                .Include(ag => ag.Class)
                    .ThenInclude(c => c.Teachers)
                .Include(ag => ag.Class)
                    .ThenInclude(c => c.Students)
                .FirstOrDefaultAsync(ag => ag.Id == req.Id);

            if (idnetGroup == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Assignment group not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Assignment group not found.",
                    MessageSk = "Skupina zadania nebola nájdená."
                });

            var groupClass = idnetGroup.Class;
            if (groupClass.Teachers == null || !groupClass.Teachers.Any(t => t.Id == callerId))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to edit this assignment group.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to edit this assignment group.",
                    MessageSk = "Nemáte oprávnenie upravovať túto skupinu zadania."
                });

            if (req.Name != null) idnetGroup.Name = req.Name;
            if (req.Description != null) idnetGroup.Description = req.Description;
            if (req.StartDate.HasValue) idnetGroup.StartDate = req.StartDate.Value;
            if (req.Deadline.HasValue) idnetGroup.Deadline = req.Deadline.Value;

            if (idnetGroup.StartDate > idnetGroup.Deadline)
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
                var classStudentIds = groupClass.Students?.Select(s => s.Id).ToHashSet() ?? new HashSet<int>();
                var desiredStudentIds = req.Students.Where(id => classStudentIds.Contains(id)).ToHashSet();

                var existingAssignments = await _db.IDNetAssignments
                    .Include(a => a.Student)
                    .Where(a => a.AssignmentGroup.Id == idnetGroup.Id)
                    .ToListAsync();

                var toRemove = existingAssignments.Where(a => !desiredStudentIds.Contains(a.Student.Id)).ToList();
                if (toRemove.Any())
                {
                    var removeIds = toRemove.Select(a => a.Id).ToArray();
                    var removeSubmits = await _db.IDNetAssignmentSubmits.Where(s => removeIds.Contains(s.Assignment.Id)).ToListAsync();
                    var removeAnswerKeys = await _db.IDNetAssignmentAnswerKeys.Where(k => removeIds.Contains(k.Assignment.Id)).ToListAsync();
                    _db.IDNetAssignmentSubmits.RemoveRange(removeSubmits);
                    _db.IDNetAssignmentAnswerKeys.RemoveRange(removeAnswerKeys);
                    _db.IDNetAssignments.RemoveRange(toRemove);
                }

                var existingMap = existingAssignments.ToDictionary(a => a.Student.Id, a => a);
                var newStudentIds = desiredStudentIds.Where(id => !existingMap.ContainsKey(id)).ToList();
                if (newStudentIds.Any())
                {
                    var studentsDict = groupClass.Students!
                        .Where(s => newStudentIds.Contains(s.Id))
                        .ToDictionary(s => s.Id, s => s);

                    foreach (var sid in newStudentIds)
                    {
                        if (!studentsDict.TryGetValue(sid, out var studentUser))
                            continue;

                        var data = GenerateIdNetAssignmentData(idnetGroup.NumberOfRecords, idnetGroup.AssignmentIpCat, idnetGroup.PossibleOctets);
                        var assignment = new IDNetAssignment
                        {
                            AssignmentGroup = idnetGroup,
                            Student = studentUser,
                            Addresses = data.Cidrs
                        };

                        _db.IDNetAssignments.Add(assignment);
                        _db.IDNetAssignmentAnswerKeys.Add(new IDNetAssignmentAnswerKey
                        {
                            Assignment = assignment,
                            IDNet = data.Networks,
                            Wildcards = data.Wildcards,
                            FirstUsables = data.FirstUsables,
                            LastUsables = data.LastUsables,
                            Broadcasts = data.Broadcasts
                        });
                    }
                }
            }

            idnetGroup.Status = AssignmentEvaluationUtils.ResolveStatus(idnetGroup.StartDate, idnetGroup.Deadline, idnetGroup.CompletedAt);
            await _db.SaveChangesAsync();
            return Ok();
        }
    }
}