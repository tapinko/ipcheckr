using Microsoft.AspNetCore.Mvc;
using IPCheckr.Api.Services;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public partial class AuthController : ControllerBase
    {
        protected readonly ApiDbContext _db;
        protected readonly ITokenService _tokenService;

        public AuthController(ApiDbContext db, ITokenService tokenService)
        {
            _db = db;
            _tokenService = tokenService;
        }
    }
}