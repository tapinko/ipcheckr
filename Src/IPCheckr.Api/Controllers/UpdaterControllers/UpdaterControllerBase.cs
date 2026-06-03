using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Services.Updater;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers;

[ApiController]
[Authorize(Policy = Roles.Admin)]
[Route("api/updater")]
public partial class UpdaterController : ControllerBase
{
    private readonly IUpdaterService _updater;

    public UpdaterController(IUpdaterService updater)
    {
        _updater = updater;
    }
}