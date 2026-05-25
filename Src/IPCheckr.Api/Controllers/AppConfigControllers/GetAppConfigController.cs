using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs.AppConfig;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AppConfigController : ControllerBase
    {
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(AppConfigDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<AppConfigDto>> GetAppConfig()
        {
            var settings = await _db.AppSettings
                .Where(s => s.Name == "DefaultLanguage" || s.Name == "Language" ||
                            s.Name == "AuthType" || s.Name == "InstitutionName")
                .ToListAsync();

            string? getValue(string key) => settings.FirstOrDefault(s => s.Name == key)?.Value;

            var rawLang = getValue("DefaultLanguage") ?? getValue("Language");
            var language = Enum.TryParse<Language>(rawLang?.Trim(), true, out var parsedLang)
                ? parsedLang
                : Language.EN;

            var rawAuthType = getValue("AuthType");
            var authType = Enum.TryParse<AuthType>(rawAuthType?.Trim(), true, out var parsedAuthType)
                ? parsedAuthType
                : AuthType.LOCAL;

            return Ok(new AppConfigDto
            {
                DefaultLanguage = language,
                AuthType = authType,
                InstitutionName = getValue("InstitutionName"),
            });
        }
    }
}