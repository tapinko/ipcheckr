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

        public UserController(ApiDbContext db)
        {
            _db = db;
        }
    }
}