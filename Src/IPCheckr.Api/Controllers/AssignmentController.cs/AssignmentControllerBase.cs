using IPCheckr.Api.Common.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Authorize(Policy = Roles.Student)]
    [Route("api/assignment")]
    public partial class AssignmentController : ControllerBase
    {
        private readonly ApiDbContext _db;

        public AssignmentController(ApiDbContext db)
        {
            _db = db;
        }
    }
}