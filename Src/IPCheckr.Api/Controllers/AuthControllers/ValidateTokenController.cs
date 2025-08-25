using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Auth;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    public partial class AuthController : ControllerBase
    {
        [HttpPost("validate-token")]
        [ProducesResponseType(typeof(ValidateTokenRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
        public ActionResult<ValidateTokenRes> ValidateToken([FromBody] ValidateTokenReq req)
        {
            if (!_tokenService.ValidateToken(req.Token, out var principal))
            {
                return Unauthorized(new ApiProblemDetails
                {
                    Title = "Unauthorized",
                    Detail = "Invalid token.",
                    Status = StatusCodes.Status401Unauthorized,
                    MessageEn = "Invalid token.",
                    MessageSk = "Neplatný token."
                });
            }

            var role = principal.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();

            var allowedRoles = new[] { "Admin", "Teacher", "Student" };
            if (!allowedRoles.Contains(role.First()))
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Invalid role in token.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "Invalid role in token.",
                    MessageSk = "Neplatná rola v tokene."
                });

            return Ok(new ValidateTokenRes
            {
                IsValid = true,
                Role = role.First(),
                UserId = int.Parse(principal.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"),
                Username = principal.FindFirst(JwtRegisteredClaimNames.Name)?.Value ?? string.Empty,
            });
        }
    }
}