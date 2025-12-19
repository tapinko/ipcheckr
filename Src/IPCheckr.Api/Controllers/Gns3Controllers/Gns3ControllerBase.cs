using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Services.Auth;
using IPCheckr.Api.Services.Config;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Authorize(Policy = Roles.Teacher)]
    [Route("api/gns3")]
    public partial class Gns3Controller : ControllerBase
    {
        private readonly ApiDbContext _db;
        private readonly ILdapDirectoryService _ldapDirectory;
        private readonly ILdapSettingsProvider _ldapSettingsProvider;
        protected readonly ILdapAuthService _ldapAuth;

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