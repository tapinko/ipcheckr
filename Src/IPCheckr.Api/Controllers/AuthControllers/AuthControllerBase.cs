using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using IPCheckr.Api.Services;
using IPCheckr.Api.Services.Auth;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public partial class AuthController : ControllerBase
    {
        protected readonly ApiDbContext _db;
        protected readonly ITokenService _tokenService;
        protected readonly ILdapAuthService _ldapAuth;
        protected readonly ILogger<AuthController> _logger;

        public AuthController(ApiDbContext db, ITokenService tokenService, ILdapAuthService ldapAuth, ILogger<AuthController> logger)
        {
            _db = db;
            _tokenService = tokenService;
            _ldapAuth = ldapAuth;
            _logger = logger;
        }
    }
}