using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AGTemplate;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AGTemplateController : ControllerBase
    {
        [HttpDelete("delete")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult> DeleteAGTemplates([FromBody] DeleteAGTemplatesReq req)
        {
            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);
            var callerRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;

            var templates = await _db.AGTemplates
                .Where(t => req.TemplateIds.Contains(t.Id))
                .ToListAsync();

            if (templates.Count != req.TemplateIds.Length)
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "One or more templates do not exist.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "One or more templates do not exist.",
                    MessageSk = "Jedna alebo viac šablón neexistuje."
                });

            if (callerRole != Roles.Admin && templates.Any(t => t.OwnerId != callerId))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You can only delete your own templates.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You can only delete your own templates.",
                    MessageSk = "Môžete odstraňovať iba vlastné šablóny."
                });

            _db.AGTemplates.RemoveRange(templates);
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}