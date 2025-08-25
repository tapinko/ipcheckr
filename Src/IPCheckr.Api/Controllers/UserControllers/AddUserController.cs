using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.User;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class UserController : ControllerBase
    {
        [HttpPost("add-user")]
        [ProducesResponseType(typeof(AddUserRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status409Conflict)]
        public async Task<ActionResult<AddUserRes>> AddUser([FromBody] AddUserReq req)
        {
            if (await _db.Users.AnyAsync(u => u.Username == req.Username))
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Conflict",
                    Detail = "A user with this username already exists.",
                    Status = StatusCodes.Status409Conflict,
                    MessageEn = "User with this username already exists.",
                    MessageSk = "Používateľ s týmto používateľským menom už existuje.",
                    Payload = new UserConflictInfoDto
                    {
                        ConflictField = "Username",
                        AttemptedValue = req.Username
                    }
                });

            var callerRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            _ = int.TryParse(callerIdStr, out int callerId);

            if (req.Role == "Teacher" && callerRole != "Admin")
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "Only Admin can create Teachers.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "Only Admin can create Teachers.",
                    MessageSk = "Iba administrátor môže vytvárať učiteľov."
                });

            if (req.Role == "Student" && callerRole == "Teacher" && (req.ClassIds == null || req.ClassIds.Length == 0))
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Teachers can only create students in specific classes.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "Teachers can only create students in specific classes.",
                    MessageSk = "Učitelia môžu vytvárať študentov iba v konkrétnych triedach."
                });

            List<Class> classes = [];
            if (req.ClassIds != null && req.ClassIds.Length > 0)
            {
                classes = await _db.Classes
                    .Include(c => c.Teachers)
                    .Include(c => c.Students)
                    .Where(c => req.ClassIds.Contains(c.Id))
                    .ToListAsync();

                if (classes.Count != req.ClassIds.Length)
                    return BadRequest(new ApiProblemDetails
                    {
                        Title = "Bad Request",
                        Detail = "Some classes do not exist.",
                        Status = StatusCodes.Status400BadRequest,
                        MessageEn = "Some classes do not exist.",
                        MessageSk = "Niektoré triedy neexistujú."
                    });
            }

            if (req.Role == "Student" && callerRole == "Teacher" && req.ClassIds != null && req.ClassIds.Length > 0)
            {
                if (classes.Any(c => c.Teachers == null || !c.Teachers.Any(t => t.Id == callerId)))
                    return BadRequest(new ApiProblemDetails
                    {
                        Title = "Bad Request",
                        Detail = "You can only create students in classes you teach.",
                        Status = StatusCodes.Status400BadRequest,
                        MessageEn = "You can only create students in classes you teach.",
                        MessageSk = "Môžete vytvárať študentov iba v triedach, ktoré učíte."
                    });
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);

            var newUser = new User
            {
                Username = req.Username,
                PasswordHash = passwordHash,
                Role = req.Role
            };

            _db.Users.Add(newUser);
            await _db.SaveChangesAsync();

            if (req.Role == "Teacher" && req.ClassIds != null && req.ClassIds.Length > 0)
            {
                foreach (var classObj in classes)
                {
                    if (classObj.Teachers == null)
                        classObj.Teachers = new List<User>();
                    if (!classObj.Teachers.Any(t => t.Id == newUser.Id))
                        classObj.Teachers.Add(newUser);
                }
                await _db.SaveChangesAsync();
            }

            if (req.Role == "Student" && req.ClassIds != null && req.ClassIds.Length > 0)
            {
                foreach (var classObj in classes)
                {
                    if (classObj.Students == null)
                        classObj.Students = new List<User>();
                    if (!classObj.Students.Any(s => s.Id == newUser.Id))
                        classObj.Students.Add(newUser);
                }
                await _db.SaveChangesAsync();
            }

            var res = new AddUserRes
            {
                UserId = newUser.Id
            };

            return Ok(res);
        }
    }
}