using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentGroup;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.Models;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentGroupController : ControllerBase
    {
        [HttpGet("get-subnet-assignment-groups")] 
        [ProducesResponseType(typeof(QuerySubnetAGsRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<QuerySubnetAGsRes>> QuerySubnetAssignmentGroups([FromQuery] QuerySubnetAGsReq req)
        {
            AssignmentGroupType? requestedType = null;
            if (!string.IsNullOrWhiteSpace(req.AssignmentGroupType))
            {
                if (!Enum.TryParse<AssignmentGroupType>(req.AssignmentGroupType, true, out var parsedType))
                {
                    return BadRequest(new ApiProblemDetails
                    {
                        Title = "Bad Request",
                        Detail = "Invalid assignment group type.",
                        Status = StatusCodes.Status400BadRequest,
                        MessageEn = "Invalid assignment group type.",
                        MessageSk = "Neplatný typ skupiny zadaní."
                    });
                }

                requestedType = parsedType;
            }

            if (requestedType.HasValue && requestedType != AssignmentGroupType.SUBNET)
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Invalid assignment group type for subnet assignment groups.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "Invalid assignment group type for subnet assignment groups.",
                    MessageSk = "Neplatný typ skupiny zadania pre subnet zadania."
                });

            AssignmentGroupStatus? requestedStatus = null;
            if (!string.IsNullOrWhiteSpace(req.Status))
            {
                if (!Enum.TryParse<AssignmentGroupStatus>(req.Status, true, out var parsedStatus))
                {
                    return BadRequest(new ApiProblemDetails
                    {
                        Title = "Bad Request",
                        Detail = "Invalid assignment group status.",
                        Status = StatusCodes.Status400BadRequest,
                        MessageEn = "Invalid assignment group status.",
                        MessageSk = "Neplatný status skupiny zadania."
                    });
                }

                requestedStatus = parsedStatus;
            }

            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);

            var teacherClasses = await _db.Classes
                .Include(c => c.Teachers)
                .Where(c => c.Teachers!.Any(t => t.Id == callerId))
                .ToListAsync();

            var allowedClassIds = teacherClasses.Select(c => c.Id).ToHashSet();

            var subnetQuery = _db.SubnetAGs
                .Include(ag => ag.Class)
                .ThenInclude(c => c.Teachers)
                .Where(ag => allowedClassIds.Contains(ag.Class.Id))
                .AsQueryable();

            if (!string.IsNullOrEmpty(req.Name))
                subnetQuery = subnetQuery.Where(ag => ag.Name.Contains(req.Name));

            if (req.ClassId.HasValue)
                subnetQuery = subnetQuery.Where(ag => ag.Class.Id == req.ClassId.Value);

            if (req.TeacherId.HasValue)
                subnetQuery = subnetQuery.Where(ag => ag.Class.Teachers!.Any(t => t.Id == req.TeacherId.Value));

            var subnetGroups = await subnetQuery.ToListAsync();

            var assignmentGroupDtos = new List<SubnetAGDto>();
            bool statusUpdated = false;

            foreach (var ag in subnetGroups)
            {
                var assignments = await _db.SubnetAssignments
                    .Include(a => a.Student)
                    .Where(a => a.AssignmentGroup.Id == ag.Id)
                    .ToListAsync();

                var assignmentIds = assignments.Select(a => a.Id).ToArray();

                var allSubmits = await _db.SubnetAssignmentSubmits
                    .Where(s => assignmentIds.Contains(s.Assignment.Id))
                    .ToListAsync();

                var allAnswerKeys = await _db.SubnetAssignmentAnswerKeys
                    .Where(ak => assignmentIds.Contains(ak.Assignment.Id))
                    .ToListAsync();

                int totalAssignments = assignments.Count;
                int submittedStudents = allSubmits.Select(s => s.Assignment.Student.Id).Distinct().Count();
                int totalStudents = assignments.Select(a => a.Student.Id).Distinct().Count();

                double sumSuccessRates = 0.0;

                foreach (var assignment in assignments)
                {
                    var answerKey = allAnswerKeys.FirstOrDefault(ak => ak.Assignment.Id == assignment.Id);
                    var submit = allSubmits
                        .Where(s => s.Assignment.Id == assignment.Id)
                        .OrderByDescending(s => s.SubmittedAt)
                        .FirstOrDefault();

                    sumSuccessRates += AssignmentEvaluationUtils.CalculateSubnetSuccessRate(answerKey, submit);
                }

                var status = AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt);
                if (totalAssignments > 0 && submittedStudents == totalAssignments && status != AssignmentGroupStatus.ENDED)
                {
                    status = AssignmentGroupStatus.ENDED;
                    ag.CompletedAt ??= DateTime.UtcNow;
                    ag.Status = status;
                    statusUpdated = true;
                }
                else
                {
                    ag.Status = status;
                }

                assignmentGroupDtos.Add(new SubnetAGDto
                {
                    AssignmentGroupId = ag.Id,
                    Name = ag.Name,
                    Description = ag.Description,
                    ClassId = ag.Class.Id,
                    ClassName = ag.Class.Name,
                    Submitted = submittedStudents,
                    Total = totalStudents,
                    StartDate = ag.StartDate,
                    Deadline = ag.Deadline,
                    SuccessRate = totalAssignments > 0 ? sumSuccessRates / totalAssignments : 0.0,
                    Status = status,
                    Type = AssignmentGroupType.SUBNET,
                    IpCat = ag.AssignmentIpCat
                });
            }

            if (requestedStatus.HasValue)
                assignmentGroupDtos = assignmentGroupDtos.Where(dto => dto.Status == requestedStatus.Value).ToList();

            if (statusUpdated)
                await _db.SaveChangesAsync();

            var res = new QuerySubnetAGsRes
            {
                AssignmentGroups = assignmentGroupDtos.ToArray(),
                TotalCount = assignmentGroupDtos.Count
            };

            return Ok(res);
        }

        [HttpGet("get-idnet-assignment-groups")] 
        [ProducesResponseType(typeof(QueryIDNetAGsRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<QueryIDNetAGsRes>> QueryIdNetAssignmentGroups([FromQuery] QueryIDNetAGsReq req)
        {
            AssignmentGroupType? requestedType = null;
            if (!string.IsNullOrWhiteSpace(req.AssignmentGroupType))
            {
                if (!Enum.TryParse<AssignmentGroupType>(req.AssignmentGroupType, true, out var parsedType))
                {
                    return BadRequest(new ApiProblemDetails
                    {
                        Title = "Bad Request",
                        Detail = "Invalid assignment group type.",
                        Status = StatusCodes.Status400BadRequest,
                        MessageEn = "Invalid assignment group type.",
                        MessageSk = "Neplatný typ skupiny zadania."
                    });
                }

                requestedType = parsedType;
            }

            if (requestedType.HasValue && requestedType != AssignmentGroupType.IDNET)
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Invalid assignment group type for IDNet assignment groups.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "Invalid assignment group type for IDNet assignment groups.",
                    MessageSk = "Neplatný typ skupiny zadania pre IDNet skupiny."
                });

            AssignmentGroupStatus? requestedStatus = null;
            if (!string.IsNullOrWhiteSpace(req.Status))
            {
                if (!Enum.TryParse<AssignmentGroupStatus>(req.Status, true, out var parsedStatus))
                {
                    return BadRequest(new ApiProblemDetails
                    {
                        Title = "Bad Request",
                        Detail = "Invalid assignment group status.",
                        Status = StatusCodes.Status400BadRequest,
                        MessageEn = "Invalid assignment group status.",
                        MessageSk = "Neplatný status skupiny zadania."
                    });
                }

                requestedStatus = parsedStatus;
            }

            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);

            var teacherClasses = await _db.Classes
                .Include(c => c.Teachers)
                .Where(c => c.Teachers!.Any(t => t.Id == callerId))
                .ToListAsync();

            var allowedClassIds = teacherClasses.Select(c => c.Id).ToHashSet();

            var idnetQuery = _db.IDNetAGs
                .Include(ag => ag.Class)
                .ThenInclude(c => c.Teachers)
                .Where(ag => allowedClassIds.Contains(ag.Class.Id))
                .AsQueryable();

            if (!string.IsNullOrEmpty(req.Name))
                idnetQuery = idnetQuery.Where(ag => ag.Name.Contains(req.Name));

            if (req.ClassId.HasValue)
                idnetQuery = idnetQuery.Where(ag => ag.Class.Id == req.ClassId.Value);

            if (req.TeacherId.HasValue)
                idnetQuery = idnetQuery.Where(ag => ag.Class.Teachers!.Any(t => t.Id == req.TeacherId.Value));

            var idnetGroups = await idnetQuery.ToListAsync();

            var assignmentGroupDtos = new List<IDNetAGDto>();
            bool statusUpdated = false;

            foreach (var ag in idnetGroups)
            {
                var assignments = await _db.IDNetAssignments
                    .Include(a => a.Student)
                    .Where(a => a.AssignmentGroup.Id == ag.Id)
                    .ToListAsync();

                var assignmentIds = assignments.Select(a => a.Id).ToArray();

                var allSubmits = await _db.IDNetAssignmentSubmits
                    .Where(s => assignmentIds.Contains(s.Assignment.Id))
                    .ToListAsync();

                var allAnswerKeys = await _db.IDNetAssignmentAnswerKeys
                    .Where(ak => assignmentIds.Contains(ak.Assignment.Id))
                    .ToListAsync();

                int totalAssignments = assignments.Count;
                int submittedStudents = allSubmits.Select(s => s.Assignment.Student.Id).Distinct().Count();
                int totalStudents = assignments.Select(a => a.Student.Id).Distinct().Count();

                double sumSuccessRates = 0.0;

                foreach (var assignment in assignments)
                {
                    var answerKey = allAnswerKeys.FirstOrDefault(ak => ak.Assignment.Id == assignment.Id);
                    var submit = allSubmits
                        .Where(s => s.Assignment.Id == assignment.Id)
                        .OrderByDescending(s => s.SubmittedAt)
                        .FirstOrDefault();

                    sumSuccessRates += AssignmentEvaluationUtils.CalculateIdNetSuccessRate(answerKey, submit, ag.TestWildcard, ag.TestFirstLastBr);
                }

                var status = AssignmentEvaluationUtils.ResolveStatus(ag.StartDate, ag.Deadline, ag.CompletedAt);
                if (totalAssignments > 0 && submittedStudents == totalAssignments && status != AssignmentGroupStatus.ENDED)
                {
                    status = AssignmentGroupStatus.ENDED;
                    ag.CompletedAt ??= DateTime.UtcNow;
                    ag.Status = status;
                    statusUpdated = true;
                }
                else
                {
                    ag.Status = status;
                }

                assignmentGroupDtos.Add(new IDNetAGDto
                {
                    AssignmentGroupId = ag.Id,
                    Name = ag.Name,
                    Description = ag.Description,
                    ClassId = ag.Class.Id,
                    ClassName = ag.Class.Name,
                    Submitted = submittedStudents,
                    Total = totalStudents,
                    StartDate = ag.StartDate,
                    Deadline = ag.Deadline,
                    SuccessRate = totalAssignments > 0 ? sumSuccessRates / totalAssignments : 0.0,
                    Status = status,
                    Type = AssignmentGroupType.IDNET,
                    IpCat = ag.AssignmentIpCat,
                    TestWildcard = ag.TestWildcard,
                    TestFirstLastBr = ag.TestFirstLastBr
                });
            }

            if (requestedStatus.HasValue)
                assignmentGroupDtos = assignmentGroupDtos.Where(dto => dto.Status == requestedStatus.Value).ToList();

            if (statusUpdated)
                await _db.SaveChangesAsync();

            var res = new QueryIDNetAGsRes
            {
                AssignmentGroups = assignmentGroupDtos.ToArray(),
                TotalCount = assignmentGroupDtos.Count
            };

            return Ok(res);
        }
    }
}