using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentGroup;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.Models;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentGroupController : ControllerBase
    {
        [HttpGet("get-assignment-groups")]
        [Authorize(Policy = Roles.Student)]
        [ProducesResponseType(typeof(QueryAssignmentGroupsRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<QueryAssignmentGroupsRes>> QueryAssignmentGroups([FromQuery] QueryAssignmentGroupsReq req)
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

            var requestedDifficulties = new List<AssignmentGroupDifficulty>();
            if (!string.IsNullOrWhiteSpace(req.Difficulty))
            {
                var parts = req.Difficulty.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                foreach (var part in parts)
                {
                    if (!Enum.TryParse<AssignmentGroupDifficulty>(part, true, out var parsedDifficulty))
                    {
                        return BadRequest(new ApiProblemDetails
                        {
                            Title = "Bad Request",
                            Detail = "Invalid assignment group difficulty.",
                            Status = StatusCodes.Status400BadRequest,
                            MessageEn = "Invalid assignment group difficulty.",
                            MessageSk = "Neplatná obtiažnosť skupiny zadania."
                        });
                    }

                    if (!requestedDifficulties.Contains(parsedDifficulty))
                        requestedDifficulties.Add(parsedDifficulty);
                }
            }

            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);
            var isAdmin = User.IsInRole(Roles.Admin);
            var isStudent = User.IsInRole(Roles.Student);

            var subnetQuery = _db.SubnetAGs
                .Include(ag => ag.Class)
                .ThenInclude(c => c.Teachers)
                .AsQueryable();

            var idnetQuery = _db.IDNetAGs
                .Include(ag => ag.Class)
                .ThenInclude(c => c.Teachers)
                .AsQueryable();

            if (!isAdmin && isStudent)
            {
                var allowedSubnetAgIds = (await _db.SubnetAssignments
                    .Where(a => a.Student.Id == callerId)
                    .Select(a => a.AssignmentGroup.Id)
                    .Distinct()
                    .ToListAsync()).ToHashSet();

                var allowedIdnetAgIds = (await _db.IDNetAssignments
                    .Where(a => a.Student.Id == callerId)
                    .Select(a => a.AssignmentGroup.Id)
                    .Distinct()
                    .ToListAsync()).ToHashSet();

                subnetQuery = subnetQuery.Where(ag => allowedSubnetAgIds.Contains(ag.Id));
                idnetQuery = idnetQuery.Where(ag => allowedIdnetAgIds.Contains(ag.Id));
            }
            else if (!isAdmin)
            {
                var allowedClassIds = (await _db.Classes
                    .Include(c => c.Teachers)
                    .Where(c => c.Teachers!.Any(t => t.Id == callerId))
                    .Select(c => c.Id)
                    .ToListAsync()).ToHashSet();

                subnetQuery = subnetQuery.Where(ag => allowedClassIds.Contains(ag.Class.Id));
                idnetQuery = idnetQuery.Where(ag => allowedClassIds.Contains(ag.Class.Id));
            }

            if (!string.IsNullOrEmpty(req.Name))
            {
                subnetQuery = subnetQuery.Where(ag => ag.Name.Contains(req.Name));
                idnetQuery = idnetQuery.Where(ag => ag.Name.Contains(req.Name));
            }

            if (req.ClassId.HasValue)
            {
                subnetQuery = subnetQuery.Where(ag => ag.Class.Id == req.ClassId.Value);
                idnetQuery = idnetQuery.Where(ag => ag.Class.Id == req.ClassId.Value);
            }

            if (req.TeacherId.HasValue)
            {
                subnetQuery = subnetQuery.Where(ag => ag.Class.Teachers!.Any(t => t.Id == req.TeacherId.Value));
                idnetQuery = idnetQuery.Where(ag => ag.Class.Teachers!.Any(t => t.Id == req.TeacherId.Value));
            }

            if (requestedDifficulties.Count > 0)
            {
                subnetQuery = subnetQuery.Where(ag => ag.Difficulty.HasValue && requestedDifficulties.Contains(ag.Difficulty.Value));
                idnetQuery = idnetQuery.Where(ag => ag.Difficulty.HasValue && requestedDifficulties.Contains(ag.Difficulty.Value));
            }

            var archiveThreshold = DateTime.UtcNow.AddDays(-7);
            var toAutoArchiveSubnet = await _db.SubnetAGs
                .Where(ag => !ag.IsArchived && ag.Deadline < archiveThreshold)
                .ToListAsync();
            if (toAutoArchiveSubnet.Count > 0)
            {
                toAutoArchiveSubnet.ForEach(ag => ag.IsArchived = true);
                await _db.SaveChangesAsync();
            }

            var toAutoArchiveIdnet = await _db.IDNetAGs
                .Where(ag => !ag.IsArchived && ag.Deadline < archiveThreshold)
                .ToListAsync();
            if (toAutoArchiveIdnet.Count > 0)
            {
                toAutoArchiveIdnet.ForEach(ag => ag.IsArchived = true);
                await _db.SaveChangesAsync();
            }

            subnetQuery = subnetQuery.Where(ag => ag.IsArchived == req.IsArchived);
            idnetQuery = idnetQuery.Where(ag => ag.IsArchived == req.IsArchived);

            var subnetGroups = await subnetQuery.ToListAsync();
            var idnetGroups = await idnetQuery.ToListAsync();

            var assignmentGroupDtos = new List<AssignmentGroupDto>();
            bool statusUpdated = false;

            // Map subnet groups
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

                    if (submit != null) sumSuccessRates += AssignmentEvaluationUtils.CalculateSubnetSuccessRate(answerKey, submit);
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

                assignmentGroupDtos.Add(new AssignmentGroupDto
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
                    SuccessRate = submittedStudents > 0 ? sumSuccessRates / submittedStudents : null,
                    Status = status,
                    Type = AssignmentGroupType.SUBNET,
                    IpCat = ag.AssignmentIpCat,
                    Difficulty = ag.Difficulty,
                    HostSortStrategy = ag.HostSortStrategy,
                    TestWildcard = null,
                    TestFirstLastBr = null,
                    IsArchived = ag.IsArchived
                });
            }

            // Map idnet groups
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

                    if (submit != null) sumSuccessRates += AssignmentEvaluationUtils.CalculateIdNetSuccessRate(answerKey, submit, ag.TestWildcard, ag.TestFirstLastBr);
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

                assignmentGroupDtos.Add(new AssignmentGroupDto
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
                    SuccessRate = submittedStudents > 0 ? sumSuccessRates / submittedStudents : null,
                    Status = status,
                    Type = AssignmentGroupType.IDNET,
                    IpCat = ag.AssignmentIpCat,
                    Difficulty = null,
                    HostSortStrategy = null,
                    TestWildcard = ag.TestWildcard,
                    TestFirstLastBr = ag.TestFirstLastBr,
                    IsArchived = ag.IsArchived
                });
            }

            if (requestedType.HasValue)
                assignmentGroupDtos = assignmentGroupDtos.Where(dto => dto.Type == requestedType.Value).ToList();

            if (requestedStatus.HasValue)
                assignmentGroupDtos = assignmentGroupDtos.Where(dto => dto.Status == requestedStatus.Value).ToList();

            if (statusUpdated)
                await _db.SaveChangesAsync();

            var res = new QueryAssignmentGroupsRes
            {
                AssignmentGroups = assignmentGroupDtos.ToArray(),
                TotalCount = assignmentGroupDtos.Count
            };

            return Ok(res);
        }
    }
}