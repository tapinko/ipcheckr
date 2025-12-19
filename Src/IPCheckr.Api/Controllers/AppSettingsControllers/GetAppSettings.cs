using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.DTOs.AppSettings;
using IPCheckr.Api.DTOs;

namespace IPCheckr.Api.Controllers
{
    public partial class AppSettingsController : ControllerBase
    {
        [HttpGet("get-app-settings")]
        [ProducesResponseType(typeof(QueryAppSettingRes), StatusCodes.Status200OK)]
        public async Task<ActionResult<QueryAppSettingRes>> QueryAppSettings()
        {
            var appSettings = await _db.AppSettings.ToListAsync();

            var appSettingDtos = appSettings.Select(setting => new AppSettingDto
            {
                Id = setting.Id,
                Name = setting.Name,
                Value = setting.Value
            }).ToArray();

            var response = new QueryAppSettingRes
            {
                AppSettings = appSettingDtos,
                TotalCount = appSettingDtos.Length
            };

            return Ok(response);
        }
    }
}