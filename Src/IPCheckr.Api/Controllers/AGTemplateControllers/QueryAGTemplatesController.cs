using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.DTOs.AGTemplate;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AGTemplateController : ControllerBase
    {
        [HttpGet("query")]
        [ProducesResponseType(typeof(QueryAGTemplatesRes), StatusCodes.Status200OK)]
        public async Task<ActionResult<QueryAGTemplatesRes>> QueryAGTemplates()
        {
            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;

            var query = _db.AGTemplates.AsQueryable();

            if (callerRole != Roles.Admin)
                query = query.Where(t => t.OwnerId == callerId);

            var templates = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new AGTemplateDto
                {
                    Id = t.Id,
                    Name = t.Name,
                    AGName = t.AGName,
                    AGDescription = t.AGDescription,
                    Type = t.Type,
                    IpCat = t.IpCat,
                    NumberOfRecords = t.NumberOfRecords,
                    Difficulty = t.Difficulty,
                    HostSortStrategy = t.HostSortStrategy,
                    PossibleOctets = t.PossibleOctets,
                    TestWildcard = t.TestWildcard,
                    TestFirstLastBr = t.TestFirstLastBr,
                    CreatedAt = t.CreatedAt
                })
                .ToListAsync();

            return Ok(new QueryAGTemplatesRes { Templates = templates.ToArray() });
        }
    }
}