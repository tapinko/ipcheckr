using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Services.Realtime;
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
        private readonly IAttemptEventsPublisher _attemptEventsPublisher;

        public AssignmentGroupController(ApiDbContext db, IAttemptEventsPublisher attemptEventsPublisher)
        {
            _db = db;
            _attemptEventsPublisher = attemptEventsPublisher;
        }
    }
}