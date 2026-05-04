using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AGTemplate;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    public partial class AGTemplateController : ControllerBase
    {
        [HttpPost("create")]
        [ProducesResponseType(typeof(CreateAGTemplateRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<CreateAGTemplateRes>> CreateAGTemplate([FromBody] CreateAGTemplateReq req)
        {
            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);

            var owner = await _db.Users.FindAsync(callerId);
            if (owner == null)
                return Unauthorized();

            var template = new AGTemplate
            {
                Name = req.Name,
                AGName = req.AGName,
                AGDescription = req.AGDescription,
                OwnerId = callerId,
                Owner = owner,
                Type = req.Type,
                IpCat = req.IpCat,
                NumberOfRecords = req.NumberOfRecords,
                Difficulty = req.Difficulty,
                HostSortStrategy = req.HostSortStrategy,
                PossibleOctets = req.PossibleOctets,
                TestWildcard = req.TestWildcard,
                TestFirstLastBr = req.TestFirstLastBr
            };

            _db.AGTemplates.Add(template);
            await _db.SaveChangesAsync();

            return Ok(new CreateAGTemplateRes { TemplateId = template.Id });
        }
    }
}