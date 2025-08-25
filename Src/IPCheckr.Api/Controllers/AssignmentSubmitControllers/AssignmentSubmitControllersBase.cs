using IPCheckr.Api.Common.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Authorize(Policy = Roles.Student)]
    [Route("api/assignment")]
    public partial class AssignmentSubmitController : ControllerBase
    {
        private readonly ApiDbContext _db;

        public AssignmentSubmitController(ApiDbContext db)
        {
            _db = db;
        }
    }
}