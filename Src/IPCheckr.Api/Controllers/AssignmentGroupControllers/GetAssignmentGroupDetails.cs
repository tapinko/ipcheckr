using IPCheckr.Api.DTOs.AssignmentGroup;
using IPCheckr.Api.Common.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.Common.Utils;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentGroupController : ControllerBase
    {
        [HttpGet("get-subnet-assignment-group-details")]
        [ProducesResponseType(typeof(QuerySubnetAGDetailRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QuerySubnetAGDetailRes>> QuerySubnetAssignmentGroupDetails([FromQuery] QuerySubnetAGDetailReq req)
        {
            var subnetGroup = await _db.SubnetAGs
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

            bool statusUpdated = false;

            var assignments = await _db.SubnetAssignments
                .Include(a => a.Student)
                .Where(a => a.AssignmentGroup.Id == subnetGroup.Id)
                .ToListAsync();

            var assignmentIds = assignments.Select(a => a.Id).ToArray();

            var submits = await _db.SubnetAssignmentSubmits
                .Where(s => assignmentIds.Contains(s.Assignment.Id))
                .ToListAsync();

            var answerKeys = await _db.SubnetAssignmentAnswerKeys
                .Where(ak => assignmentIds.Contains(ak.Assignment.Id))
                .ToListAsync();

            var assignmentDetails = new List<SubnetAGSubmitDetailsDto>();
            int submittedStudents = submits.Select(s => s.Assignment.Student.Id).Distinct().Count();
            int totalStudents = assignments.Count;
            double sumSuccessRates = 0.0;

            foreach (var assignment in assignments)
            {
                var submit = submits
                    .Where(s => s.Assignment.Id == assignment.Id)
                    .OrderByDescending(s => s.SubmittedAt)
                    .FirstOrDefault();

                var answerKey = answerKeys.FirstOrDefault(ak => ak.Assignment.Id == assignment.Id);
                var successRate = AssignmentEvaluationUtils.CalculateSubnetSuccessRate(answerKey, submit);
                sumSuccessRates += successRate;

                assignmentDetails.Add(new SubnetAGSubmitDetailsDto
                {
                    AssignmentId = assignment.Id,
                    StudentUsername = UsernameUtils.ToDisplay(assignment.Student.Username),
                    StudentId = assignment.Student.Id,
                    SuccessRate = submit != null ? successRate : 0.0,
                    SubmittedAt = submit?.SubmittedAt
                });
            }

            var status = AssignmentEvaluationUtils.ResolveStatus(subnetGroup.StartDate, subnetGroup.Deadline, subnetGroup.CompletedAt);
            if (totalStudents > 0 && submittedStudents == totalStudents && status != AssignmentGroupStatus.ENDED)
            {
                status = AssignmentGroupStatus.ENDED;
                subnetGroup.CompletedAt ??= DateTime.UtcNow;
                subnetGroup.Status = status;
                statusUpdated = true;
            }
            else
            {
                subnetGroup.Status = status;
            }

            var res = new QuerySubnetAGDetailRes
            {
                AssignmentGroupId = subnetGroup.Id,
                Name = subnetGroup.Name,
                Description = subnetGroup.Description,
                ClassId = subnetGroup.Class.Id,
                ClassName = subnetGroup.Class.Name,
                Submitted = submittedStudents,
                Total = totalStudents,
                StartDate = subnetGroup.StartDate,
                Deadline = subnetGroup.Deadline,
                SuccessRate = totalStudents > 0 ? sumSuccessRates / totalStudents : 0.0,
                Status = status,
                Type = AssignmentGroupType.SUBNET,
                IpCat = subnetGroup.AssignmentIpCat,
                Assignments = assignmentDetails.ToArray()
            };

            if (statusUpdated)
                await _db.SaveChangesAsync();

            return Ok(res);
        }

        [HttpGet("get-idnet-assignment-group-details")]
        [ProducesResponseType(typeof(QueryIDNetAGDetailRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<QueryIDNetAGDetailRes>> QueryIdNetAssignmentGroupDetails([FromQuery] QueryIDNetAGDetailReq req)
        {
            var idnetGroup = await _db.IDNetAGs
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

            bool statusUpdated = false;

            var assignments = await _db.IDNetAssignments
                .Include(a => a.Student)
                .Where(a => a.AssignmentGroup.Id == idnetGroup.Id)
                .ToListAsync();

            var assignmentIds = assignments.Select(a => a.Id).ToArray();

            var submits = await _db.IDNetAssignmentSubmits
                .Where(s => assignmentIds.Contains(s.Assignment.Id))
                .ToListAsync();

            var answerKeys = await _db.IDNetAssignmentAnswerKeys
                .Where(ak => assignmentIds.Contains(ak.Assignment.Id))
                .ToListAsync();

            var assignmentDetails = new List<IDNetAGSubmitDetailsDto>();
            int submittedStudents = submits.Select(s => s.Assignment.Student.Id).Distinct().Count();
            int totalStudents = assignments.Count;
            double sumSuccessRates = 0.0;

            foreach (var assignment in assignments)
            {
                var submit = submits
                    .Where(s => s.Assignment.Id == assignment.Id)
                    .OrderByDescending(s => s.SubmittedAt)
                    .FirstOrDefault();

                var answerKey = answerKeys.FirstOrDefault(ak => ak.Assignment.Id == assignment.Id);
                var successRate = AssignmentEvaluationUtils.CalculateIdNetSuccessRate(answerKey, submit, idnetGroup.TestWildcard, idnetGroup.TestFirstLastBr);
                sumSuccessRates += successRate;

                assignmentDetails.Add(new IDNetAGSubmitDetailsDto
                {
                    AssignmentId = assignment.Id,
                    StudentUsername = UsernameUtils.ToDisplay(assignment.Student.Username),
                    StudentId = assignment.Student.Id,
                    SuccessRate = submit != null ? successRate : 0.0,
                    SubmittedAt = submit?.SubmittedAt
                });
            }

            var status = AssignmentEvaluationUtils.ResolveStatus(idnetGroup.StartDate, idnetGroup.Deadline, idnetGroup.CompletedAt);
            if (totalStudents > 0 && submittedStudents == totalStudents && status != AssignmentGroupStatus.ENDED)
            {
                status = AssignmentGroupStatus.ENDED;
                idnetGroup.CompletedAt ??= DateTime.UtcNow;
                idnetGroup.Status = status;
                statusUpdated = true;
            }
            else
            {
                idnetGroup.Status = status;
            }

            var res = new QueryIDNetAGDetailRes
            {
                AssignmentGroupId = idnetGroup.Id,
                Name = idnetGroup.Name,
                Description = idnetGroup.Description,
                ClassId = idnetGroup.Class.Id,
                ClassName = idnetGroup.Class.Name,
                Submitted = submittedStudents,
                Total = totalStudents,
                StartDate = idnetGroup.StartDate,
                Deadline = idnetGroup.Deadline,
                SuccessRate = totalStudents > 0 ? sumSuccessRates / totalStudents : 0.0,
                Status = status,
                Type = AssignmentGroupType.IDNET,
                IpCat = idnetGroup.AssignmentIpCat,
                TestWildcard = idnetGroup.TestWildcard,
                TestFirstLastBr = idnetGroup.TestFirstLastBr,
                Assignments = assignmentDetails.ToArray()
            };

            if (statusUpdated)
                await _db.SaveChangesAsync();

            return Ok(res);
        }
    }
}