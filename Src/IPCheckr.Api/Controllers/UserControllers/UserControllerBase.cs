using IPCheckr.Api.Common.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Authorize(Policy = Roles.Teacher)]
    [Route("api/users")]
    public partial class UserController : ControllerBase
    {
        private readonly ApiDbContext _db;
        private readonly Services.Auth.ILdapDirectoryService _ldapDirectory;
        private readonly Services.Config.ILdapSettingsProvider _ldapSettingsProvider;

        public UserController(ApiDbContext db, Services.Auth.ILdapDirectoryService ldapDirectory, Services.Config.ILdapSettingsProvider ldapSettingsProvider)
        {
            _db = db;
            _ldapDirectory = ldapDirectory;
            _ldapSettingsProvider = ldapSettingsProvider;
        }
    }
}