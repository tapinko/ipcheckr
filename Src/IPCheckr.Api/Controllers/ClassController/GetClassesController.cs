using IPCheckr.Api.DTOs.Class;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class ClassController : ControllerBase
    {
        [HttpGet("get-classes")]
        public async Task<ActionResult<QueryClassesRes>> QueryClasses([FromQuery] QueryClassesReq req)
        {
            var query = _db.Classes
                .Include(c => c.Teachers)
                .Include(c => c.Students)
                .AsQueryable();

            if (req.ClassId.HasValue)
                query = query.Where(c => c.Id == req.ClassId.Value);

            if (!string.IsNullOrEmpty(req.ClassName))
                query = query.Where(c => c.Name.Contains(req.ClassName));

            if (req.TeacherId.HasValue)
                query = query.Where(c => c.Teachers!.Any(t => t.Id == req.TeacherId.Value));

            if (!string.IsNullOrEmpty(req.TeacherUsername))
            {
                query = query.Where(c => c.Teachers!.Any(t => t.Username.Contains(req.TeacherUsername)));
            }

            if (req.Descending.GetValueOrDefault(true))
                query = query.OrderByDescending(c => c.Id);
            else
                query = query.OrderBy(c => c.Id);

            var classes = await query.ToListAsync();

            var classDtos = classes.Select(c => new ClassDto
            {
                ClassId = c.Id,
                ClassName = c.Name,
                Teachers = c.Teachers?.Select(t => t.Id).ToArray() ?? Array.Empty<int>(),
                TeacherUsernames = c.Teachers?.Select(t => t.Username).ToArray() ?? Array.Empty<string>()
            }).ToArray();

            var res = new QueryClassesRes
            {
                Classes = classDtos,
                TotalCount = classDtos.Length
            };

            return Ok(res);
        }
    }
}