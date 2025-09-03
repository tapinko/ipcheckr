using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.DTOs.Dashboard;
using IPCheckr.Api.Services.Logging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace IPCheckr.Api.Controllers
{
    public partial class DashboardController : ControllerBase
    {
        [Authorize(Policy = Roles.Admin)]
        [HttpGet("stream-logs")]
        [Produces("text/event-stream")]
        public async Task StreamLogs([FromQuery] StreamLogsReq req, [FromServices] ILogStreamBroker broker)
        {
            Response.StatusCode = StatusCodes.Status200OK;
            Response.Headers["Content-Type"] = "text/event-stream";
            Response.Headers["Cache-Control"] = "no-cache";
            Response.Headers["Connection"] = "keep-alive";
            Response.Headers["X-Accel-Buffering"] = "no";

            var (id, reader) = broker.Subscribe();
            var ct = HttpContext.RequestAborted;

            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            };

            await Response.WriteAsync($": connected {DateTime.UtcNow:O}\n\n", ct);
            await Response.Body.FlushAsync(ct);

            try
            {
                while (await reader.WaitToReadAsync(ct))
                {
                    while (reader.TryRead(out var entry))
                    {
                        if (!PassesFilter(entry, req)) continue;

                        var payload = JsonSerializer.Serialize(entry, jsonOptions);
                        await Response.WriteAsync("event: log\n", ct);
                        await Response.WriteAsync($"data: {payload}\n\n", ct);
                        await Response.Body.FlushAsync(ct);
                    }
                }
            }
            catch (OperationCanceledException) { }
            catch (Exception ex)
            {
                var errorPayload = JsonSerializer.Serialize(new { Error = ex.Message }, jsonOptions);
                await Response.WriteAsync("event: error\n", ct);
                await Response.WriteAsync($"data: {errorPayload}\n\n", ct);
                await Response.Body.FlushAsync(ct);
            }
            finally
            {
                broker.Unsubscribe(id);
            }
        }

        private static bool PassesFilter(StreamLogsRes e, StreamLogsReq req)
        {
            if (!string.IsNullOrWhiteSpace(req.MinLevel))
            {
                if (!TryParseLevel(req.MinLevel!, out var min) || !TryParseLevel(e.Level, out var lvl))
                    return true;
                if (lvl < min) return false;
            }

            if (!string.IsNullOrWhiteSpace(req.CategoryStartsWith) &&
                !e.Category.StartsWith(req.CategoryStartsWith!, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (!string.IsNullOrWhiteSpace(req.Contains) &&
                (e.Message == null || e.Message.IndexOf(req.Contains!, StringComparison.OrdinalIgnoreCase) < 0))
            {
                return false;
            }

            return true;
        }

        private static bool TryParseLevel(string level, out int numeric)
        {
            switch (level.Trim())
            {
                case "Trace": numeric = 0; return true;
                case "Debug": numeric = 1; return true;
                case "Information": numeric = 2; return true;
                case "Warning": numeric = 3; return true;
                case "Error": numeric = 4; return true;
                case "Critical": numeric = 5; return true;
                default: numeric = -1; return false;
            }
        }
    }
}