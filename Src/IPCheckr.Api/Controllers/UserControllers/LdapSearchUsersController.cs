using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.DTOs.User;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.Controllers
{
    public partial class UserController : ControllerBase
    {
        [HttpGet("ldap-search-users")]
        [Authorize(Policy = Roles.Teacher)]
        [ProducesResponseType(typeof(LdapUserSearchRes), StatusCodes.Status200OK)]
        public async Task<ActionResult<LdapUserSearchRes>> LdapSearchUsers([FromQuery] LdapUserSearchReq req)
        {
            var settings = await _ldapSettingsProvider.GetCurrentAsync();
            if (!settings.Enabled)
                return Ok(new LdapUserSearchRes { Users = Array.Empty<LdapUserDto>(), TotalCount = 0 });

            var users = await _ldapDirectory.SearchUsersAsync(req.Q ?? string.Empty, req.OuDn, req.GroupDn, Math.Clamp(req.Limit ?? 20, 1, 100));
            var dtos = users.Select(u => new LdapUserDto
            {
                Username = u.Username,
                DistinguishedName = u.DistinguishedName
            }).ToArray();

            return Ok(new LdapUserSearchRes { Users = dtos, TotalCount = dtos.Length });
        }
    }
}
