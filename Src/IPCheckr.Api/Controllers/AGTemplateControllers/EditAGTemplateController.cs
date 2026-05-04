using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AGTemplate;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AGTemplateController : ControllerBase
    {
        [HttpPatch("edit/{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> EditAGTemplate(int id, [FromBody] EditAGTemplateReq req)
        {
            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;

            var template = await _db.AGTemplates.FirstOrDefaultAsync(t => t.Id == id);

            if (template == null)
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Template not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "Template not found.",
                    MessageSk = "Šablóna nebola nájdená."
                });

            if (callerRole != Roles.Admin && template.OwnerId != callerId)
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You can only edit your own templates.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You can only edit your own templates.",
                    MessageSk = "Môžete upravovať iba vlastné šablóny."
                });

            template.Name = req.Name;
            template.AGName = req.AGName;
            template.AGDescription = req.AGDescription;
            template.Type = req.Type;
            template.IpCat = req.IpCat;
            template.NumberOfRecords = req.NumberOfRecords;
            template.Difficulty = req.Difficulty;
            template.HostSortStrategy = req.HostSortStrategy;
            template.PossibleOctets = req.PossibleOctets;
            template.TestWildcard = req.TestWildcard;
            template.TestFirstLastBr = req.TestFirstLastBr;

            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}