using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.DTOs.User;

namespace IPCheckr.Api.Controllers
{
    public partial class UserController : ControllerBase
    {
        [HttpGet("is-ldap-auth")]
        [ProducesResponseType(typeof(IsLdapAuthRes), StatusCodes.Status200OK)]
        public async Task<ActionResult<IsLdapAuthRes>> IsLdapAuth()
        {
            var authTypeSetting = await _db.AppSettings.FirstOrDefaultAsync(a => a.Name == "AuthType");
            var raw = (authTypeSetting?.Value ?? "LOCAL").Trim().ToUpperInvariant();
            return Ok(new IsLdapAuthRes { IsLdapAuth = raw == "LDAP" });
        }
    }
}