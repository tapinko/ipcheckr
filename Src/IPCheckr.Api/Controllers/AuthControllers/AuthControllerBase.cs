using Microsoft.AspNetCore.Mvc;
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

        public AuthController(ApiDbContext db, ITokenService tokenService, ILdapAuthService ldapAuth)
        {
            _db = db;
            _tokenService = tokenService;
            _ldapAuth = ldapAuth;
        }
    }
}