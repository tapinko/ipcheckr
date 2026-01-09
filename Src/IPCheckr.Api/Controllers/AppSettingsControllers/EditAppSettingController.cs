using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AppSettings;
using Microsoft.AspNetCore.Authorization;
using IPCheckr.Api.Common.Constants;

namespace IPCheckr.Api.Controllers
{
    public partial class AppSettingsController : ControllerBase
    {
        [HttpPut("edit-app-setting")]
        [Authorize(Policy = Roles.Admin)]
        [ProducesResponseType(typeof(void), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> EditAppSetting([FromBody] EditAppSettinReq req)
        {
            var appSetting = await _db.AppSettings.FirstOrDefaultAsync(a => a.Id == req.Id);

            if (appSetting == null)
            {
                return NotFound(new ApiProblemDetails
                {
                    Title = "Not Found",
                    Detail = "App setting not found.",
                    Status = StatusCodes.Status404NotFound,
                    MessageEn = "App setting not found.",
                    MessageSk = "Nastavenie aplikácie nebolo nájdené."
                });
            }

            appSetting.Name = req.Name;
            appSetting.Value = req.Value;

            await _db.SaveChangesAsync();

            return Ok();
        }
    }
}