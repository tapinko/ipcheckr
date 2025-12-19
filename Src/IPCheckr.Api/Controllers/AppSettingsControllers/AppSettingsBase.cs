using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Services.Auth;
using IPCheckr.Api.Services.Config;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Authorize(Policy = Roles.Admin)]
    [Route("api/appsettings")]
    public partial class AppSettingsController : ControllerBase
    {
        private readonly ApiDbContext _db;
        private readonly ILdapSettingsProvider _ldapSettingsProvider;
        private readonly ILdapAuthService _ldapAuthService;

        public AppSettingsController(ApiDbContext db, ILdapSettingsProvider ldapSettingsProvider, ILdapAuthService ldapAuthService)
        {
            _db = db;
            _ldapSettingsProvider = ldapSettingsProvider;
            _ldapAuthService = ldapAuthService;
        }
    }
}