using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Class;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class ClassController : ControllerBase
    {
        [HttpDelete("delete-classes")]
        public async Task<ActionResult> DeleteClasses([FromBody] DeleteClassesReq req)
        {
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            var callerIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            _ = int.TryParse(callerIdStr, out int callerId);

            var classesToDelete = await _db.Classes
                .Include(c => c.Teachers)
                .Where(c => req.ClassIds.Contains(c.Id))
                .ToListAsync();

            if (classesToDelete.Count != req.ClassIds.Length)
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "One or more classes do not exist.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "One or more classes do not exist.",
                    MessageSk = "Jedna alebo viac tried neexistuje."
                });

            if (callerRole == "Admin")
            {
                _db.Classes.RemoveRange(classesToDelete);
            }
            else if (callerRole == "Teacher")
            {
                var teacherClasses = classesToDelete.Where(c => c.Teachers!.Any(t => t.Id == callerId)).ToList();
                if (teacherClasses.Count == 0)
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                    {
                        Title = "Forbidden",
                        Detail = "You can only delete classes you are assigned to.",
                        Status = StatusCodes.Status403Forbidden,
                        MessageEn = "You can only delete classes you are assigned to.",
                        MessageSk = "Môžete odstrániť iba triedy, ku ktorým ste pridelení."
                    });
                _db.Classes.RemoveRange(teacherClasses);
            }
            else
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to delete classes.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to delete classes.",
                    MessageSk = "Nemáte oprávnenie na odstránenie tried."
                });
            }

            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}