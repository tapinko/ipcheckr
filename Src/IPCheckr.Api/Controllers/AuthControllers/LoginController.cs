using System.Security.Claims;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Auth;
using IPCheckr.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class AuthController : ControllerBase
    {
        [HttpPost("login")]
        [ProducesResponseType(typeof(LoginRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<LoginRes>> Login([FromBody] LoginReq req)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);

            if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                return StatusCode(StatusCodes.Status401Unauthorized, new ApiProblemDetails
                {
                    Title = "Unauthorized",
                    Detail = "Invalid username or password.",
                    Status = StatusCodes.Status401Unauthorized,
                    MessageEn = "Invalid username or password.",
                    MessageSk = "Neplatné používateľské meno alebo heslo.",
                });

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var token = _tokenService.GenerateToken(user.Id.ToString(), user.Username, [user.Role]);

            return Ok(new LoginRes
            {
                Token = token,
                Role = user.Role
            });
        }
    }
}