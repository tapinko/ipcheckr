using IPCheckr.Api.DTOs.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AuthController : ControllerBase
    {
        [HttpGet("prefetch-role")]
        [EnableRateLimiting("prefetch-role")]
        [ProducesResponseType(typeof(PrefetchRoleRes), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        public async Task<ActionResult<PrefetchRoleRes>> PrefetchRole([FromQuery] string username)
        {
            var trimmed = (username ?? string.Empty).Trim();
            var role = await _db.Users
                .AsNoTracking()
                .Where(u => u.Username == trimmed)
                .Select(u => u.Role)
                .FirstOrDefaultAsync();

            return Ok(new PrefetchRoleRes { Role = role });
        }
    }
}