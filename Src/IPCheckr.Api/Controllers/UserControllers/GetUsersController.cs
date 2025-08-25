using IPCheckr.Api.DTOs.User;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class UserController : ControllerBase
    {
        [HttpGet("get-users")]
        public async Task<ActionResult<QueryUsersRes>> QueryUsers([FromQuery] QueryUsersReq req)
        {
            var query = _db.Users.AsQueryable();

            if (!string.IsNullOrEmpty(req.Username))
                query = query.Where(u => u.Username.Contains(req.Username));

            if (!string.IsNullOrEmpty(req.Role))
                query = query.Where(u => u.Role == req.Role);

            if (req.Descending.GetValueOrDefault(true))
                query = query.OrderByDescending(u => u.Id);
            else
                query = query.OrderBy(u => u.Id);

            var users = await query.ToListAsync();

            var allClasses = await _db.Classes
                .Include(c => c.Teachers)
                .Include(c => c.Students)
                .ToListAsync();

            var userDtos = users.Select(u =>
            {
                var userClasses = allClasses.Where(c =>
                    (c.Teachers != null && c.Teachers.Any(t => t.Id == u.Id)) ||
                    (c.Students != null && c.Students.Any(s => s.Id == u.Id))
                ).ToList();

                return new UserDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    Role = u.Role,
                    ClassIds = userClasses.Select(c => c.Id).ToArray(),
                    ClassNames = userClasses.Select(c => c.Name).ToArray()
                };
            }).ToArray();

            if (req.ClassId.HasValue)
            {
                userDtos = userDtos.Where(ud => ud.ClassIds != null && ud.ClassIds.Contains(req.ClassId.Value)).ToArray();
            }
            if (!string.IsNullOrEmpty(req.ClassName))
            {
                userDtos = userDtos.Where(ud => ud.ClassNames != null && ud.ClassNames.Any(name => name.Contains(req.ClassName))).ToArray();
            }

            var res = new QueryUsersRes
            {
                Users = userDtos,
                TotalCount = userDtos.Length
            };

            return Ok(res);
        }
    }
}