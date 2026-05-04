using IPCheckr.Api.Common.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    [ApiController]
    [Authorize(Policy = Roles.Teacher)]
    [Route("api/ag-template")]
    public partial class AGTemplateController : ControllerBase
    {
        private readonly ApiDbContext _db;

        public AGTemplateController(ApiDbContext db)
        {
            _db = db;
        }
    }
}