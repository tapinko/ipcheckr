using IPCheckr.Api.Common.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Authorize(Policy = Roles.Teacher)]
    [Route("api/classes")]
    public partial class ClassController : ControllerBase
    {
        private readonly ApiDbContext _db;

        public ClassController(ApiDbContext db)
        {
            _db = db;
        }
    }
}