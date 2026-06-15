using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers;

public partial class UpdaterController : ControllerBase
{
    [HttpGet("stream")]
    [Produces("text/event-stream")]
    public async Task StreamUpdate([FromQuery] string? tag)
    {
        Response.StatusCode = StatusCodes.Status200OK;
        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";

        var ct = HttpContext.RequestAborted;

        await Response.WriteAsync($": connected {DateTime.UtcNow:O}\n\n", ct);
        await Response.Body.FlushAsync(ct);

        try
        {
            await foreach (var line in _updater.StreamUpdateAsync(tag, ct))
            {
                await Response.WriteAsync($"data: {line}\n\n", ct);
                await Response.Body.FlushAsync(ct);
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            await Response.WriteAsync($"data: ERR {ex.Message}\n\n", ct);
            await Response.Body.FlushAsync(ct);
        }
    }
}