using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Class;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class ClassController : ControllerBase
    {
        [HttpPut("edit-class")]
        [ProducesResponseType(typeof(void), StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> EditClass([FromBody] EditClassReq req)
        {
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            _ = int.TryParse(callerIdStr, out int callerId);

            var cls = await _db.Classes
                .Include(c => c.Teachers)
                .FirstOrDefaultAsync(c => c.Id == req.Id);

            if (cls == null)
            {
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Class does not exist.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Class does not exist.",
                    MessageSk = "Trieda neexistuje."
                });
            }

            if (callerRole == "Teacher")
            {
                var isAssigned = cls.Teachers != null && cls.Teachers.Any(t => t.Id == callerId);
                if (!isAssigned)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You can only edit classes you are assigned to.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You can only edit classes you are assigned to.",
                        MessageSk = "Môžete upravovať iba triedy, ku ktorým ste pridelení."
                    });
                }
            }
            else if (callerRole != "Admin")
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to edit classes.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to edit classes.",
                    MessageSk = "Nemáte oprávnenie upravovať triedy."
                });
            }

            var anyChange = false;

            if (!string.IsNullOrWhiteSpace(req.Classname) && req.Classname != cls.Name)
            {
                var nameExists = await _db.Classes.AnyAsync(c => c.Name == req.Classname && c.Id != cls.Id);
                if (nameExists)
                {
                    return BadRequest(new ApiProblemDetails
                    {
                        Title = "Bad Request",
                        Detail = "A class with this name already exists.",
                        Status = StatusCodes.Status400BadRequest,
                        MessageEn = "Class with this name already exists.",
                        MessageSk = "Trieda s týmto názvom už existuje."
                    });
                }
                cls.Name = req.Classname;
                anyChange = true;
            }

            if (req.Teachers != null)
            {
                var teacherUsers = await _db.Users
                    .Where(u => req.Teachers.Contains(u.Id) && u.Role == "Teacher")
                    .ToListAsync();

                if (teacherUsers.Count != req.Teachers.Length)
                {
                    return BadRequest(new ApiProblemDetails
                    {
                        Title = "Bad Request",
                        Detail = "One or more teachers do not exist or are not valid.",
                        Status = StatusCodes.Status400BadRequest,
                        MessageEn = "One or more teachers do not exist or are not valid.",
                        MessageSk = "Jeden alebo viac učiteľov neexistuje alebo nie je platných."
                    });
                }

                cls.Teachers = teacherUsers;
                anyChange = true;
            }

            if (!anyChange)
            {
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "No changes were provided.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "No changes were provided.",
                    MessageSk = "Neboli poskytnuté žiadne zmeny."
                });
            }

            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}