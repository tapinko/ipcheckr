using IPCheckr.Api.Common.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Authorize(Policy = Roles.Teacher)]
    [Route("api/assignment-group")]
    public partial class AssignmentGroupController : ControllerBase
    {
        private readonly ApiDbContext _db;

        public AssignmentGroupController(ApiDbContext db)
        {
            _db = db;
        }
    }
}