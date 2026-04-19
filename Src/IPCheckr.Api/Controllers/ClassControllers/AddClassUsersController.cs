using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Class;
using IPCheckr.Api.DTOs.User;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class ClassController : ControllerBase
    {
        [HttpPost("add-student")]
        [ProducesResponseType(typeof(AddUserRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<AddUserRes>> AddStudentToClass([FromBody] AddStudentToClassReq req)
        {
            return await AddUserToClasses(req.Username, req.ClassIds, "Student");
        }

        [HttpPost("add-teacher")]
        [ProducesResponseType(typeof(AddUserRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<AddUserRes>> AddTeacherToClass([FromBody] AddTeacherToClassReq req)
        {
            return await AddUserToClasses(req.Username, req.ClassIds, "Teacher");
        }

        private async Task<ActionResult<AddUserRes>> AddUserToClasses(string username, int[] classIds, string targetRole)
        {
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            _ = int.TryParse(callerIdStr, out int callerId);

            if (string.IsNullOrWhiteSpace(username))
            {
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Username is required.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "Username is required.",
                    MessageSk = "Používateľské meno je povinné."
                });
            }

            if (classIds == null || classIds.Length == 0)
            {
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "At least one class is required.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "At least one class is required.",
                    MessageSk = "Musí byť zvolená aspoň jedna trieda."
                });
            }

            var targetUser = await _db.Users.FirstOrDefaultAsync(u => u.Username == username && u.Role == targetRole);
            if (targetUser == null)
            {
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = $"{targetRole} does not exist.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = $"{targetRole} does not exist.",
                    MessageSk = targetRole == "Teacher"
                        ? "Učiteľ neexistuje."
                        : "Študent neexistuje."
                });
            }

            var classes = await _db.Classes
                .Include(c => c.Teachers)
                .Include(c => c.Students)
                .Where(c => classIds.Contains(c.Id))
                .ToListAsync();

            if (classes.Count != classIds.Length)
            {
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Some classes do not exist.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "Some classes do not exist.",
                    MessageSk = "Niektoré triedy neexistujú."
                });
            }

            if (callerRole == "Teacher")
            {
                var unauthorizedClass = classes.Any(c => c.Teachers == null || !c.Teachers.Any(t => t.Id == callerId));
                if (unauthorizedClass)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You can only manage users in classes you teach.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You can only manage users in classes you teach.",
                        MessageSk = "Môžete spravovať používateľov iba v triedach, ktoré učíte."
                    });
                }
            }

            foreach (var classObj in classes)
            {
                if (targetRole == "Student")
                {
                    classObj.Students ??= new List<User>();
                    if (!classObj.Students.Any(s => s.Id == targetUser.Id))
                    {
                        classObj.Students.Add(targetUser);
                    }
                }
                else
                {
                    classObj.Teachers ??= new List<User>();
                    if (!classObj.Teachers.Any(t => t.Id == targetUser.Id))
                    {
                        classObj.Teachers.Add(targetUser);
                    }
                }
            }

            await _db.SaveChangesAsync();

            return Ok(new AddUserRes { UserId = targetUser.Id });
        }
    }
}