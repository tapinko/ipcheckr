using IPCheckr.Api.DTOs.Updater;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers;

public partial class UpdaterController : ControllerBase
{
    [HttpGet("version-info")]
    [ProducesResponseType(typeof(UpdaterVersionInfoRes), StatusCodes.Status200OK)]
    public async Task<ActionResult<UpdaterVersionInfoRes>> GetVersionInfo(CancellationToken ct)
    {
        var info = await _updater.GetVersionInfoAsync(ct);
        return Ok(info);
    }
}