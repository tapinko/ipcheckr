using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs.AssignmentGroup;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentGroupController : ControllerBase
    {
        [HttpGet("get-assignment-groups")] 
        [ProducesResponseType(typeof(QueryAssignmentGroupsRes), StatusCodes.Status200OK)]
        public async Task<ActionResult<QueryAssignmentGroupsRes>> QueryAssignmentGroups([FromQuery] QueryAssignmentGroupsReq req)
        {
            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);

            var teacherClasses = await _db.Classes
                .Include(c => c.Teachers)
                .Where(c => c.Teachers!.Any(t => t.Id == callerId))
                .ToListAsync();

            var allowedClassIds = teacherClasses.Select(c => c.Id).ToHashSet();

            var query = _db.AssignmentGroups
                .Include(ag => ag.Class)
                .Include(ag => ag.Class.Teachers)
                .Where(ag => allowedClassIds.Contains(ag.Class.Id))
                .AsQueryable();

            if (!string.IsNullOrEmpty(req.AssignmentGroupName))
                query = query.Where(ag => ag.Name.Contains(req.AssignmentGroupName));

            if (req.ClassId.HasValue)
                query = query.Where(ag => ag.Class.Id == req.ClassId.Value);

            if (req.TeacherId.HasValue)
                query = query.Where(ag => ag.Class.Teachers!.Any(t => t.Id == req.TeacherId.Value));

            var assignmentGroups = await query.ToListAsync();

            var assignmentGroupDtos = new List<AssignmentGroupDto>();

            foreach (var ag in assignmentGroups)
            {
                var assignments = await _db.Assignments
                    .Include(a => a.Student)
                    .Where(a => a.AssignmentGroup.Id == ag.Id)
                    .ToListAsync();

                var assignmentIds = assignments.Select(a => a.Id).ToArray();

                var allSubmits = await _db.AssignmentSubmits
                    .Where(s => assignmentIds.Contains(s.Assignment.Id))
                    .ToListAsync();

                var allAnswerKeys = await _db.AssignmentAnswerKeys
                    .Where(ak => assignmentIds.Contains(ak.Assignment.Id))
                    .ToListAsync();

                int totalAssignments = assignments.Count;

                int totalStudents = assignments.Select(a => a.Student.Id).Distinct().Count();
                int submittedStudents = allSubmits.Select(s => s.Assignment.Student.Id).Distinct().Count();

                double sumFirstAttemptPercentages = 0.0;

                foreach (var assignment in assignments)
                {
                    var answerKey = allAnswerKeys.FirstOrDefault(ak => ak.Assignment.Id == assignment.Id);
                    var assignmentSubmits = allSubmits
                        .Where(s => s.Assignment.Id == assignment.Id)
                        .OrderBy(s => s.Attempt)
                        .ToList();

                    double firstAttemptSuccessRate = 0.0;

                    if (answerKey != null && assignmentSubmits.Any())
                    {
                        var firstAttempt = assignmentSubmits.FirstOrDefault(s => s.Attempt == 1) ?? assignmentSubmits.First();

                        int faTotalFields = 0;
                        int faCorrectFields = 0;

                        string[][] ansArraysFA = { answerKey.Networks, answerKey.FirstUsables, answerKey.LastUsables, answerKey.Broadcasts };
                        string[][] subArraysFA = { firstAttempt.Networks, firstAttempt.FirstUsables, firstAttempt.LastUsables, firstAttempt.Broadcasts };

                        for (int i = 0; i < ansArraysFA.Length; i++)
                        {
                            var ansArr = ansArraysFA[i];
                            var subArr = subArraysFA[i];
                            int len = Math.Min(ansArr.Length, subArr.Length);
                            faTotalFields += ansArr.Length;
                            for (int j = 0; j < len; j++)
                            {
                                if (ansArr[j] == subArr[j])
                                    faCorrectFields++;
                            }
                        }

                        if (faTotalFields > 0)
                            firstAttemptSuccessRate = (double)faCorrectFields / faTotalFields * 100.0;
                    }

                    sumFirstAttemptPercentages += firstAttemptSuccessRate;
                }

                double successRate = totalAssignments > 0
                    ? sumFirstAttemptPercentages / totalAssignments
                    : 0.0;

                AssignmentGroupState state;
                var now = DateTime.UtcNow;
                if (now < ag.StartDate)
                    state = AssignmentGroupState.UPCOMING;
                else if (now <= ag.Deadline)
                    state = AssignmentGroupState.IN_PROGRESS;
                else
                    state = AssignmentGroupState.ENDED;

                AssignmentGroupStatus submissionStatus = assignments.Count == 0
                    ? AssignmentGroupStatus.NOT_COMPLETED
                    : assignments.All(a => a.IsCompleted) ? AssignmentGroupStatus.COMPLETED : AssignmentGroupStatus.NOT_COMPLETED;

                assignmentGroupDtos.Add(new AssignmentGroupDto
                {
                    AssignmentGroupId = ag.Id,
                    AssignmentGroupName = ag.Name,
                    AssignmentGroupDescription = ag.Description,
                    ClassId = ag.Class.Id,
                    ClassName = ag.Class.Name,
                    Submitted = submittedStudents,
                    Total = totalStudents,
                    StartDate = ag.StartDate,
                    Deadline = ag.Deadline,
                    SubmissionStatus = submissionStatus,
                    SuccessRate = successRate,
                    State = state
                });
            }

            if (req.State != default)
            {
                if (Enum.TryParse<AssignmentGroupState>(req.State.ToString(), true, out var parsedState))
                    assignmentGroupDtos = assignmentGroupDtos.Where(dto => dto.State == parsedState).ToList();
                else
                    assignmentGroupDtos = new List<AssignmentGroupDto>();
            }

            var res = new QueryAssignmentGroupsRes
            {
                AssignmentGroups = assignmentGroupDtos.ToArray(),
                TotalCount = assignmentGroupDtos.Count
            };

            return Ok(res);
        }
    }
}