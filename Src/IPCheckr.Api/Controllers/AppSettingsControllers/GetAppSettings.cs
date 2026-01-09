using System.Linq;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.DTOs.AppSettings;
using IPCheckr.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using IPCheckr.Api.Common.Constants;

namespace IPCheckr.Api.Controllers
{
    public partial class AppSettingsController : ControllerBase
    {
        [HttpGet("get-app-settings")]
        [Authorize(Policy = Roles.Student)]
        [ProducesResponseType(typeof(QueryAppSettingRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<QueryAppSettingRes>> QueryAppSettings()
        {
            var appSettings = await _db.AppSettings.ToListAsync();

            var isAdmin = User.IsInRole(Roles.Admin);

            if (!isAdmin)
            {
                var allowedNames = new[] {
                    "Gns3_DefaultSessionMinutes",
                    "Gns3_ExtendedMinutes"
                };
                appSettings = appSettings.Where(s => allowedNames.Contains(s.Name)).ToList();
            }

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