using System.Security.Claims;
using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.Auth;
using IPCheckr.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Controllers
{
    public partial class AuthController : ControllerBase
    {
        [HttpPost("login")]
        [ProducesResponseType(typeof(LoginRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<LoginRes>> Login([FromBody] LoginReq req)
        {
            var username = (req.Username ?? string.Empty).Trim();
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
            var authTypeSetting = await _db.AppSettings.FirstOrDefaultAsync(a => a.Name == "AuthType");
            var authTypeRaw = (authTypeSetting?.Value ?? nameof(AuthType.LOCAL)).Trim();
            var parsed = Enum.TryParse<AuthType>(authTypeRaw, true, out var authTypeEnum);

            if (!parsed)
                authTypeEnum = AuthType.LOCAL;

            if (authTypeEnum == AuthType.LDAP)
            {
                // allow only local admin login
                if (string.Equals(username, "admin", StringComparison.OrdinalIgnoreCase))
                {
                    if (user != null && string.Equals(user.Username, "admin", StringComparison.OrdinalIgnoreCase)
                        && !string.IsNullOrWhiteSpace(user.PasswordHash)
                        && BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                    {
                        var tokenLocalAdmin = _tokenService.GenerateToken(user.Id.ToString(), user.Username, [user.Role]);
                        return Ok(new LoginRes { Token = tokenLocalAdmin, Role = user.Role });
                    }

                    return StatusCode(StatusCodes.Status401Unauthorized, new ApiProblemDetails
                    {
                        Title = "Unauthorized",
                        Detail = "Invalid username or password.",
                        Status = StatusCodes.Status401Unauthorized,
                        MessageEn = "Invalid username or password.",
                        MessageSk = "Neplatné používateľské heslo.",
                    });
                }

                var ldapFirst = await _ldapAuth.AuthenticateAsync(username, req.Password);
                if (ldapFirst.Succeeded)
                {
                    var roles = ldapFirst.Roles?.Count > 0 ? ldapFirst.Roles : new List<string> { Roles.Student };
                    var roleForResponse = roles.Contains(Roles.Teacher) ? Roles.Teacher : roles[0];
                    var localUser = await EnsureLocalUserForExternalAsync(ldapFirst.NormalizedUsername ?? username, roleForResponse);
                    var token = _tokenService.GenerateToken(localUser.Id.ToString(), localUser.Username, roles);
                    return Ok(new LoginRes { Token = token, Role = roleForResponse });
                }
            }
            else
            {
                if (user != null && BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                {
                    var tokenLocal = _tokenService.GenerateToken(user.Id.ToString(), user.Username, [user.Role]);
                    return Ok(new LoginRes { Token = tokenLocal, Role = user.Role });
                }

                var ldapResult = await _ldapAuth.AuthenticateAsync(username, req.Password);
                if (ldapResult.Succeeded)
                {
                    var roles = ldapResult.Roles?.Count > 0 ? ldapResult.Roles : new List<string> { Roles.Student };
                    var roleForResponse = roles.Contains(Roles.Teacher) ? Roles.Teacher : roles[0];
                    var localUser = await EnsureLocalUserForExternalAsync(ldapResult.NormalizedUsername ?? username, roleForResponse);
                    var token = _tokenService.GenerateToken(localUser.Id.ToString(), localUser.Username, roles);
                    return Ok(new LoginRes { Token = token, Role = roleForResponse });
                }
            }

            return StatusCode(StatusCodes.Status401Unauthorized, new ApiProblemDetails
            {
                Title = "Unauthorized",
                Detail = "Invalid username or password.",
                Status = StatusCodes.Status401Unauthorized,
                MessageEn = "Invalid username or password.",
                MessageSk = "Neplatné používateľské meno alebo heslo.",
            });


        }

        private async Task<Models.User> EnsureLocalUserForExternalAsync(string username, string role)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null)
            {
                user = new Models.User
                {
                    Username = username,
                    PasswordHash = "LDAP",
                    Role = role
                };
                _db.Users.Add(user);
            }
            else
            {
                var desired = role;
                if (user.Role != desired && (desired == Roles.Teacher || user.Role == Roles.Student))
                    user.Role = desired;
            }

            await _db.SaveChangesAsync();
            return user;
        }
    }
}