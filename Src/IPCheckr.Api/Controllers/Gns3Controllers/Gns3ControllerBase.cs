using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.Services.Auth;
using IPCheckr.Api.Services.Config;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Authorize(Policy = Roles.Student)]
    [Route("api/gns3")]
    public partial class Gns3Controller : ControllerBase
    {
        private readonly ApiDbContext _db;
        private readonly ILdapDirectoryService _ldapDirectory;
        private readonly ILdapSettingsProvider _ldapSettingsProvider;
        protected readonly ILdapAuthService _ldapAuth;

        protected async Task<ActionResult?> EnsureGns3EnabledAsync(CancellationToken ct)
        {
            var enabled = await Gns3Config.IsEnabledAsync(HttpContext.RequestServices, ct);
            if (enabled)
                return null;

            return StatusCode(StatusCodes.Status503ServiceUnavailable, new DTOs.ApiProblemDetails
            {
                Title = "GNS3 disabled",
                Detail = "GNS3 integration is disabled.",
                Status = StatusCodes.Status503ServiceUnavailable,
                MessageEn = "GNS3 integration is disabled.",
                MessageSk = "GNS3 integrácia je vypnutá."
            });
        }

        public Gns3Controller(ApiDbContext db, ILdapDirectoryService ldapDirectory,
            ILdapSettingsProvider ldapSettingsProvider, ILdapAuthService ldapAuth)
        {
            _db = db;
            _ldapDirectory = ldapDirectory;
            _ldapSettingsProvider = ldapSettingsProvider;
            _ldapAuth = ldapAuth;
        }
    }
}