using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.User;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class UserController : ControllerBase
    {
        [HttpDelete("delete-users")]
        public async Task<ActionResult> DeleteUsers([FromBody] DeleteUsersReq req)
        {
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            _ = int.TryParse(callerIdStr, out int callerId);

            if (callerRole == "Admin" && req.UserIds.Contains(callerId))
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Admin cannot delete themselves.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "Admin cannot delete themselves.",
                    MessageSk = "Administrátor nemôže odstrániť samého seba."
                });

            if (callerRole == "Teacher" && req.UserIds.Contains(callerId))
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Teacher cannot delete themselves.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "Teacher cannot delete themselves.",
                    MessageSk = "Učiteľ nemôže odstrániť samého seba."
                });

            var usersToDelete = await _db.Users.Where(u => req.UserIds.Contains(u.Id)).ToListAsync();

            if (usersToDelete.Count != req.UserIds.Length)
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "One or more users do not exist.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "One or more users do not exist.",
                    MessageSk = "Jeden alebo viac používateľov neexistuje."
                });

            if (callerRole == "Admin")
            {
                usersToDelete = usersToDelete.Where(u => u.Id != callerId).ToList();
            }
            else if (callerRole == "Teacher")
            {
                var teacherClasses = await _db.Classes
                    .Include(c => c.Teachers)
                    .Include(c => c.Students)
                    .Where(c => c.Teachers!.Any(t => t.Id == callerId))
                    .ToListAsync();

                var allowedStudents = teacherClasses
                    .SelectMany(c => c.Students!.Select(s => s.Id))
                    .Distinct()
                    .ToHashSet();

                usersToDelete = usersToDelete
                    .Where(u => u.Role == "Student" && allowedStudents.Contains(u.Id))
                    .ToList();

                if (usersToDelete.Count == 0)
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You do not have permission to delete these users.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You do not have permission to delete these users.",
                        MessageSk = "Nemáte oprávnenie na odstránenie týchto používateľov."
                    });
            }
            else
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to delete users.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to delete users.",
                    MessageSk = "Nemáte oprávnenie na odstránenie používateľov."
                });
            }

            var allClasses = await _db.Classes
                .Include(c => c.Teachers)
                .Include(c => c.Students)
                .ToListAsync();

            foreach (var user in usersToDelete)
            {
                foreach (var classObj in allClasses)
                {
                    if (user.Role == "Teacher" && classObj.Teachers != null)
                    {
                        var teacher = classObj.Teachers.FirstOrDefault(t => t.Id == user.Id);
                        if (teacher != null)
                            classObj.Teachers.Remove(teacher);
                    }
                    if (user.Role == "Student" && classObj.Students != null)
                    {
                        var student = classObj.Students.FirstOrDefault(s => s.Id == user.Id);
                        if (student != null)
                            classObj.Students.Remove(student);
                    }
                }
            }

            _db.Users.RemoveRange(usersToDelete);
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}