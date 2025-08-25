using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.User;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace IPCheckr.Api.Controllers
{
    public partial class UserController : ControllerBase
    {
        [HttpPut("edit-user")]
        [ProducesResponseType(typeof(void), StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> EditUser([FromBody] EditUserReq req)
        {
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
            _ = int.TryParse(callerIdStr, out int callerId);

            if (callerRole != "Admin" && callerRole != "Teacher")
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to edit users.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to edit users.",
                    MessageSk = "Nemáte oprávnenie upravovať používateľov."
                });
            }

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == req.Id);
            if (user == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "User not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "User not found.",
                    MessageSk = "Používateľ nebol nájdený."
                });

            if (callerRole == "Teacher")
            {
                if (user.Role != "Student")
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You can only edit students.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You can only edit students.",
                        MessageSk = "Môžete upravovať iba študentov."
                    });
                }

                var sharesClass = await _db.Classes
                    .Include(c => c.Teachers)
                    .Include(c => c.Students)
                    .AnyAsync(c => c.Teachers!.Any(t => t.Id == callerId) &&
                                   c.Students!.Any(s => s.Id == user.Id));

                if (!sharesClass)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You can only edit students in your classes.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You can only edit students in your classes.",
                        MessageSk = "Môžete upravovať iba študentov vo vašich triedach."
                    });
                }
            }

            if (!string.IsNullOrEmpty(req.Username))
            {
                if (await _db.Users.AnyAsync(u => u.Username == req.Username && u.Id != req.Id))
                    return BadRequest(new ApiProblemDetails
                    {
                        Title = "Bad Request",
                        Detail = "A user with this username already exists.",
                        Status = StatusCodes.Status400BadRequest,
                        MessageEn = "User with this username already exists.",
                        MessageSk = "Používateľ s týmto používateľským menom už existuje."
                    });

                user.Username = req.Username;
            }

            if (!string.IsNullOrEmpty(req.Password))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
            }

            if (req.ClassIds != null)
            {
                if (callerRole == "Teacher")
                {
                    var teacherClassIds = await _db.Classes
                        .Where(c => c.Teachers!.Any(t => t.Id == callerId))
                        .Select(c => c.Id)
                        .ToListAsync();

                    var disallowed = req.ClassIds.Except(teacherClassIds).ToArray();
                    if (disallowed.Length > 0)
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                        {
                            Title = "Forbidden",
                            Detail = "You can only assign classes you teach.",
                            Status = StatusCodes.Status403Forbidden,
                            MessageEn = "You can only assign classes you teach.",
                            MessageSk = "Môžete priraďovať len triedy, ktoré učíte."
                        });
                    }
                }

                var requestedClasses = await _db.Classes
                    .Include(c => c.Teachers)
                    .Include(c => c.Students)
                    .Where(c => req.ClassIds.Contains(c.Id))
                    .ToListAsync();

                if (requestedClasses.Count != req.ClassIds.Length)
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

                var currentClasses = await _db.Classes
                    .Include(c => c.Teachers)
                    .Include(c => c.Students)
                    .Where(c =>
                        (user.Role == "Teacher" && c.Teachers!.Any(t => t.Id == user.Id)) ||
                        (user.Role == "Student" && c.Students!.Any(s => s.Id == user.Id)))
                    .ToListAsync();

                var requestedIdsSet = req.ClassIds.ToHashSet();

                foreach (var cls in currentClasses)
                {
                    if (!requestedIdsSet.Contains(cls.Id))
                    {
                        if (user.Role == "Teacher" && cls.Teachers != null)
                        {
                            var rem = cls.Teachers.FirstOrDefault(t => t.Id == user.Id);
                            if (rem != null) cls.Teachers.Remove(rem);
                        }
                        if (user.Role == "Student" && cls.Students != null)
                        {
                            var rem = cls.Students.FirstOrDefault(s => s.Id == user.Id);
                            if (rem != null) cls.Students.Remove(rem);
                        }
                    }
                }

                foreach (var cls in requestedClasses)
                {
                    if (user.Role == "Teacher")
                    {
                        cls.Teachers ??= new List<User>();
                        if (!cls.Teachers.Any(t => t.Id == user.Id))
                            cls.Teachers.Add(user);
                    }
                    else if (user.Role == "Student")
                    {
                        cls.Students ??= new List<User>();
                        if (!cls.Students.Any(s => s.Id == user.Id))
                            cls.Students.Add(user);
                    }
                }
            }

            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}