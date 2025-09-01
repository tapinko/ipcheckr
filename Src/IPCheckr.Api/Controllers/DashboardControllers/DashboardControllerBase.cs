using IPCheckr.Api.Common.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    public partial class DashboardController : ControllerBase
    {
        private readonly ApiDbContext _db;

        public DashboardController(ApiDbContext db)
        {
            _db = db;
        }
    }
}