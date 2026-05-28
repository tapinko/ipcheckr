using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Services.Auth;
using IPCheckr.Api.Services.Config;
using IPCheckr.Api.Services.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Route("api/appsettings")]
    public partial class AppSettingsController : ControllerBase
    {
        private readonly ApiDbContext _db;
        private readonly ILdapSettingsProvider _ldapSettingsProvider;
        private readonly ILdapAuthService _ldapAuthService;
        private readonly ILdapPasswordProtector _passwordProtector;

        public AppSettingsController(ApiDbContext db, ILdapSettingsProvider ldapSettingsProvider, ILdapAuthService ldapAuthService, ILdapPasswordProtector passwordProtector)
        {
            _db = db;
            _ldapSettingsProvider = ldapSettingsProvider;
            _ldapAuthService = ldapAuthService;
            _passwordProtector = passwordProtector;
        }
    }
}