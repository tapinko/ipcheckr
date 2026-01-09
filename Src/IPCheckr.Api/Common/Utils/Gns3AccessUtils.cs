using System.Linq;
using System.Security.Claims;
using IPCheckr.Api;
using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPCheckr.Api.Common.Utils
{
    /// <summary>
    /// Helper for repetitive gns3 access checks in controllers.
    /// </summary>
    public static class Gns3AccessUtils
    {
        public static (int CallerId, string? CallerRole) GetCallerInfo(ClaimsPrincipal user)
        {
            var role = user.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
            var idStr = user.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
            _ = int.TryParse(idStr, out var callerId);
            return (callerId, role);
        }

        public static ActionResult ApiForbidden(string detail, string messageEn, string messageSk)
        {
            return new ObjectResult(new ApiProblemDetails
            {
                Title = "Forbidden 403",
                Detail = detail,
                Status = StatusCodes.Status403Forbidden,
                MessageEn = messageEn,
                MessageSk = messageSk
            })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }

        public static async Task<ActionResult?> EnsureGns3AccessAsync(ClaimsPrincipal caller, ApiDbContext db, User targetUser, CancellationToken ct)
        {
            var (callerId, callerRole) = GetCallerInfo(caller);

            if (string.Equals(callerRole, Roles.Admin, StringComparison.OrdinalIgnoreCase))
                return null;

            if (string.Equals(callerRole, Roles.Teacher, StringComparison.OrdinalIgnoreCase))
            {
                if (!string.Equals(targetUser.Role, Roles.Student, StringComparison.OrdinalIgnoreCase))
                {
                    return ApiForbidden(
                        "Teachers can manage only students in their classes.",
                        "Teachers can manage only students in their classes.",
                        "Učitelia môžu spravovať iba študentov vo svojich triedach."
                    );
                }

                var isInClass = await db.Classes
                    .Where(c => c.Teachers.Any(t => t.Id == callerId))
                    .Where(c => c.Students.Any(s => s.Id == targetUser.Id))
                    .AnyAsync(ct);

                if (!isInClass)
                {
                    return ApiForbidden(
                        "Teachers can manage only students in their classes.",
                        "Teachers can manage only students in their classes.",
                        "Učitelia môžu spravovať iba študentov vo svojich triedach."
                    );
                }

                return null;
            }

            if (string.Equals(callerRole, Roles.Student, StringComparison.OrdinalIgnoreCase))
            {
                if (callerId != targetUser.Id)
                {
                    return ApiForbidden(
                        "Students can manage only their own sessions.",
                        "Students can manage only their own sessions.",
                        "Študenti môžu spravovať iba svoje vlastné relácie."
                    );
                }

                return null;
            }

            return ApiForbidden(
                "You do not have permission to manage sessions.",
                "You do not have permission to manage sessions.",
                "Nemáte oprávnenie spravovať relácie."
            );
        }
    }
}