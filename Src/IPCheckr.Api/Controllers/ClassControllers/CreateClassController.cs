using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Class;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class ClassController : ControllerBase
    {
        [HttpPost("create-class")]
        public async Task<ActionResult<CreateClassRes>> CreateClass([FromBody] CreateClassReq req)
        {
            if (await _db.Classes.AnyAsync(c => c.Name == req.ClassName))
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "A class with this name already exists.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "Class with this name already exists.",
                    MessageSk = "Trieda s týmto názvom už existuje."
                });

            List<User>? teachers = null;
            if (req.Teachers != null && req.Teachers.Length > 0)
            {
                teachers = await _db.Users
                    .Where(u => req.Teachers.Contains(u.Id) && u.Role == "Teacher")
                    .ToListAsync();

                if (teachers.Count != req.Teachers.Length)
                    return BadRequest(new ApiProblemDetails
                    {
                        Title = "Bad Request",
                        Detail = "One or more teachers do not exist or are not valid.",
                        Status = StatusCodes.Status400BadRequest,
                        MessageEn = "One or more teachers do not exist or are not valid.",
                        MessageSk = "Jeden alebo viac učiteľov neexistuje alebo nie je platných."
                    });
            }

            var newClass = new Class
            {
                Name = req.ClassName,
                Teachers = teachers // yes can be null
            };

            _db.Classes.Add(newClass);
            await _db.SaveChangesAsync();

            var res = new CreateClassRes
            {
                ClassId = newClass.Id
            };

            return Ok(res);
        }
    }
}