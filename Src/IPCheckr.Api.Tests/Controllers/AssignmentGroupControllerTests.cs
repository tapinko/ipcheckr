using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Controllers;
using IPCheckr.Api.DTOs.AssignmentGroup;
using IPCheckr.Api.Models;
using IPCheckr.Api.Services.Realtime;
using Xunit;

namespace IPCheckr.Api.Tests.Controllers;

public class AssignmentGroupControllerTests
{
    private class DummyPublisher : IAttemptEventsPublisher
    {
        public Task PublishAttemptChangedAsync(AssignmentGroupType assignmentGroupType, int assignmentGroupId, int assignmentId, int studentId, AssignmentSubmissionAttemptStatus status)
        {
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task QueryAssignmentGroups_ReturnsCombinedGroups()
    {
        var options = new DbContextOptionsBuilder<ApiDbContext>()
            .UseInMemoryDatabase(databaseName: $"ag_test_{Guid.NewGuid()}")
            .Options;

        using (var db = new ApiDbContext(options))
        {
            // Seed user, class and two assignment groups
            var teacher = new User { Username = "teacher", PasswordHash = "x", Role = Roles.Teacher };
            db.Users.Add(teacher);

            var cls = new Class { Name = "Class 1", Teachers = new List<User> { teacher } };
            db.Classes.Add(cls);

            var now = DateTime.UtcNow;

            var subnet = new SubnetAG
            {
                Name = "Subnet AG",
                Status = AssignmentGroupStatus.UPCOMING,
                Class = cls,
                StartDate = now,
                Deadline = now.AddDays(1),
                AssignmentIpCat = AssignmentGroupIpCat.ABC,
                NumberOfRecords = 1
            };
            db.SubnetAGs.Add(subnet);

            var idnet = new IDNetAG
            {
                Name = "Idnet AG",
                Status = AssignmentGroupStatus.UPCOMING,
                Class = cls,
                StartDate = now,
                Deadline = now.AddDays(2),
                AssignmentIpCat = AssignmentGroupIpCat.LOCAL,
                NumberOfRecords = 1
            };
            db.IDNetAGs.Add(idnet);

            await db.SaveChangesAsync();
        }

        using (var db = new ApiDbContext(options))
        {
            var controller = new AssignmentGroupController(db, new DummyPublisher());

            var claims = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] {
                new Claim(ClaimTypes.NameIdentifier, "1"),
                new Claim(ClaimTypes.Role, Roles.Teacher)
            }, "test"));

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = claims }
            };

            var result = await controller.QueryAssignmentGroups(new QueryAssignmentGroupsReq());

            var ok = Assert.IsType<ActionResult<QueryAssignmentGroupsRes>>(result);
            var actionResult = Assert.IsType<OkObjectResult>(ok.Result!);
            var res = Assert.IsType<QueryAssignmentGroupsRes>(actionResult.Value!);

            Assert.Equal(2, res.TotalCount);
            Assert.Equal(2, res.AssignmentGroups.Length);
        }
    }
}