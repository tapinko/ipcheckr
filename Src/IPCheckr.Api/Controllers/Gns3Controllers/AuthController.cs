using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Gns3;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Controllers
{
    public partial class Gns3Controller : ControllerBase
    {
        // this route has to be GET for GNS3 compatibility
        // nginx auth_request always makes a subrequest as GET (no body) and runs without credentials
        // so we must expose an anonymous GET endpoint and pull credentials from Basic auth header when needed
        [HttpGet("auth")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult> Auth([FromBody] AuthReq? req = null)
        {
            var enabled = await Gns3Config.IsEnabledAsync(HttpContext.RequestServices, HttpContext.RequestAborted);
            if (!enabled)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new ApiProblemDetails
                {
                    Title = "GNS3 disabled",
                    Detail = "GNS3 integration is disabled.",
                    Status = StatusCodes.Status503ServiceUnavailable,
                    MessageEn = "GNS3 integration is disabled.",
                    MessageSk = "GNS3 integrácia je vypnutá."
                });
            }

            var creds = req ?? new AuthReq { Username = string.Empty, Password = string.Empty };
            if (string.IsNullOrWhiteSpace(creds.Username) || string.IsNullOrWhiteSpace(creds.Password))
                creds = ReadBasicAuthOrFallback();

            var username = (creds.Username ?? string.Empty).Trim();
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (string.Equals(username, "admin", StringComparison.OrdinalIgnoreCase) || user?.Role == Roles.Admin)
                return StatusCode(StatusCodes.Status401Unauthorized);

            var authTypeSetting = await _db.AppSettings.FirstOrDefaultAsync(a => a.Name == "AuthType");
            var authTypeRaw = (authTypeSetting?.Value ?? nameof(AuthType.LOCAL)).Trim();

            var parsed = Enum.TryParse<AuthType>(authTypeRaw, true, out var authTypeEnum);
            if (!parsed)
                authTypeEnum = AuthType.LOCAL;

            if (user != null && user.Role != Roles.Admin && BCrypt.Net.BCrypt.Verify(creds.Password ?? string.Empty, user.PasswordHash))
            {
                var port = await GetActivePortAsync(user.Id);
                if (port == null)
                    return StatusCode(StatusCodes.Status401Unauthorized);

                Response.Headers["X-Gns3-Port"] = port.Value.ToString();
                Response.Headers["X-User"] = username;
                return Ok();
            }

            if (authTypeEnum == AuthType.LDAP || authTypeEnum == AuthType.LOCAL)
            {
                var ldapResult = await _ldapAuth.AuthenticateAsync(username, creds.Password ?? string.Empty);
                if (ldapResult.Succeeded)
                {
                    var roles = ldapResult.Roles?.Count > 0 ? ldapResult.Roles : new List<string> { Roles.Student };
                    if (roles.Contains(Roles.Admin))
                        return StatusCode(StatusCodes.Status401Unauthorized);

                    var dbUser = user ?? await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
                    if (dbUser == null)
                        return StatusCode(StatusCodes.Status401Unauthorized);

                    var port = await GetActivePortAsync(dbUser.Id);
                    if (port == null)
                        return StatusCode(StatusCodes.Status401Unauthorized);

                    Response.Headers["X-Gns3-Port"] = port.Value.ToString();
                    Response.Headers["X-User"] = username;
                    return Ok();
                }
            }

            return StatusCode(StatusCodes.Status401Unauthorized);
        }

        private AuthReq ReadBasicAuthOrFallback()
        {
            var basicAuth = Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(basicAuth) && basicAuth.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var payload = basicAuth[6..].Trim();
                    var decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(payload));
                    var parts = decoded.Split(':', 2);
                    if (parts.Length == 2)
                        return new AuthReq { Username = parts[0], Password = parts[1] };
                }
                catch
                {
                }
            }

            return new AuthReq { Username = string.Empty, Password = string.Empty };
        }

        private async Task<int?> GetActivePortAsync(int userId)
        {
            var session = await _db.Gns3Sessions
                .Where(s => s.UserId == userId && s.Status == GNS3SessionStatus.RUNNING)
                .OrderByDescending(s => s.SessionStart)
                .FirstOrDefaultAsync();

            return session?.Port > 0 ? session.Port : null;
        }
    }
}