using IPCheckr.Api.DTOs.AssignmentGroup;
using IPCheckr.Api.Common.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.DTOs;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentGroupController : ControllerBase
    {
        [HttpGet("get-assignment-group-details")]
        [ProducesResponseType(typeof(QueryAssignmentGroupDetailsRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QueryAssignmentGroupDetailsRes>> QueryAssignmentGroupDetails([FromQuery] QueryAssignmentGroupDetailsReq req)
        {
            var ag = await _db.AssignmentGroups
                .Include(ag => ag.Class)
                .ThenInclude(c => c.Students)
                .FirstOrDefaultAsync(ag => ag.Id == req.AssignmentGroupId);

            if (ag == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Assignment group not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Assignment group not found.",
                    MessageSk = "Skupina úloh nebola nájdená."
                });

            // Determine state
            AssignmentGroupState state = DateTime.UtcNow < ag.StartDate
                ? AssignmentGroupState.UPCOMING
                : DateTime.UtcNow <= ag.Deadline
                    ? AssignmentGroupState.IN_PROGRESS
                    : AssignmentGroupState.ENDED;

            var assignmentGroupDto = new AssignmentGroupDto
            {
                AssignmentGroupId = ag.Id,
                AssignmentGroupName = ag.Name,
                AssignmentGroupDescription = ag.Description,
                ClassId = ag.Class.Id,
                ClassName = ag.Class.Name,
                StartDate = ag.StartDate,
                Deadline = ag.Deadline,
                SubmissionStatus = AssignmentGroupStatus.NOT_COMPLETED,
                SuccessRate = 0.0,
                State = state,
                Submitted = 0,
                Total = 0
            };

            var assignments = await _db.Assignments
                .Include(a => a.Student)
                .Where(a => a.AssignmentGroup.Id == ag.Id)
                .ToListAsync();

            var assignmentIds = assignments.Select(a => a.Id).ToArray();

            var submits = await _db.AssignmentSubmits
                .Where(s => assignmentIds.Contains(s.Assignment.Id))
                .ToListAsync();

            var answerKeys = await _db.AssignmentAnswerKeys
                .Where(ak => assignmentIds.Contains(ak.Assignment.Id))
                .ToListAsync();

            var assignmentStudentIds = assignments.Select(a => a.Student.Id).ToHashSet();
            var classStudentIds = ag.Class.Students?.Select(s => s.Id).ToHashSet() ?? new HashSet<int>();
            var newlyAddedStudentIds = classStudentIds.Except(assignmentStudentIds).ToArray();

            var assignmentDetails = new List<AssignmentGroupSubmitDetailsDto>();
            int totalAssignments = assignments.Count;

            int totalStudents = assignmentStudentIds.Count; // students already having assignments
            int submittedStudents = submits.Select(s => s.Assignment.Student.Id).Distinct().Count();

            double sumFirstAttemptPercentages = 0.0;

            foreach (var assignment in assignments)
            {
                var studentUsername = assignment.Student.Username;

                var assignmentSubmits = submits
                    .Where(s => s.Assignment.Id == assignment.Id)
                    .OrderBy(s => s.Attempt)
                    .ToList();

                var answerKey = answerKeys.FirstOrDefault(ak => ak.Assignment.Id == assignment.Id);

                DateTime? lastSubmit = null;
                int attemptCount = assignmentSubmits.Count;

                double firstAttemptSuccessRate = 0.0;
                if (answerKey != null && assignmentSubmits.Any())
                {
                    var firstAttempt = assignmentSubmits.FirstOrDefault(s => s.Attempt == 1) ?? assignmentSubmits.First();

                    if (firstAttempt != null)
                    {
                        int totalFields = 0;
                        int correctFields = 0;

                        string[][] answerArrays = {
                            answerKey.Networks ?? Array.Empty<string>(),
                            answerKey.FirstUsables ?? Array.Empty<string>(),
                            answerKey.LastUsables ?? Array.Empty<string>(),
                            answerKey.Broadcasts ?? Array.Empty<string>()
                        };
                        string[][] submitArrays = {
                            firstAttempt.Networks ?? Array.Empty<string>(),
                            firstAttempt.FirstUsables ?? Array.Empty<string>(),
                            firstAttempt.LastUsables ?? Array.Empty<string>(),
                            firstAttempt.Broadcasts ?? Array.Empty<string>()
                        };

                        totalFields = answerArrays.Sum(a => a.Length);
                        if (totalFields > 0)
                        {
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
                            firstAttemptSuccessRate = (double)correctFields / totalFields * 100.0;
                        }
                    }

                    var latestSubmit = assignmentSubmits.OrderByDescending(s => s.Attempt).First();
                    lastSubmit = assignmentSubmits.First().SubmittedAt;
                }

                sumFirstAttemptPercentages += firstAttemptSuccessRate;

                assignmentDetails.Add(new AssignmentGroupSubmitDetailsDto
                {
                    AssignmentId = assignment.Id,
                    StudentUsername = studentUsername,
                    StudentId = assignment.Student.Id,
                    SuccessRate = attemptCount > 0 ? firstAttemptSuccessRate : 0.0,
                    AttemptCount = attemptCount,
                    Status = assignment.IsCompleted ? AssignmentGroupStatus.COMPLETED : AssignmentGroupStatus.NOT_COMPLETED,
                    LastSubmit = attemptCount > 0 ? lastSubmit : null,
                    Students = newlyAddedStudentIds.Length > 0 ? newlyAddedStudentIds : null
                });
            }

            assignmentGroupDto.SuccessRate = totalAssignments > 0
                ? sumFirstAttemptPercentages / totalAssignments
                : 0.0;

            assignmentGroupDto.SubmissionStatus = assignments.Count == 0
                ? AssignmentGroupStatus.NOT_COMPLETED
                : assignments.All(a => a.IsCompleted) ? AssignmentGroupStatus.COMPLETED : AssignmentGroupStatus.NOT_COMPLETED;

            assignmentGroupDto.Submitted = submittedStudents;
            assignmentGroupDto.Total = totalStudents;

            var res = new QueryAssignmentGroupDetailsRes
            {
                AssignmentGroupId = assignmentGroupDto.AssignmentGroupId,
                AssignmentGroupName = assignmentGroupDto.AssignmentGroupName,
                AssignmentGroupDescription = assignmentGroupDto.AssignmentGroupDescription,
                ClassId = assignmentGroupDto.ClassId,
                ClassName = assignmentGroupDto.ClassName,
                StartDate = assignmentGroupDto.StartDate,
                Deadline = assignmentGroupDto.Deadline,
                SubmissionStatus = assignmentGroupDto.SubmissionStatus,
                SuccessRate = assignmentGroupDto.SuccessRate,
                State = assignmentGroupDto.State,
                NumberOfRecords = ag.NumberOfRecords,
                PossibleAttempts = ag.PossibleAttempts,
                Assignments = assignmentDetails.ToArray(),
                Submitted = assignmentGroupDto.Submitted,
                Total = assignmentGroupDto.Total
            };

            return Ok(res);
        }
    }
}