using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Route("api/app-config")]
    public partial class AppConfigController : ControllerBase
    {
        private readonly ApiDbContext _db;

        public AppConfigController(ApiDbContext db)
        {
            _db = db;
        }
    }
}