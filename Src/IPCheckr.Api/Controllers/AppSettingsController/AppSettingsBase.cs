using IPCheckr.Api.Common.Constants;
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

        public AppSettingsController(ApiDbContext db)
        {
            _db = db;
        }
    }
}