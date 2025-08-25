using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.Models;
using Microsoft.Extensions.DependencyInjection;

namespace IPCheckr.Api.Config
{
    public static class AuthorizationConfig
    {
        public static IServiceCollection AddCustomAuthorization(this IServiceCollection services)
        {
            services.AddAuthorizationBuilder()
                .AddPolicy("Admin", policy => policy.RequireRole(Roles.Admin))
                .AddPolicy("Teacher", policy => policy.RequireRole(Roles.Teacher, Roles.Admin))
                .AddPolicy("Student", policy => policy.RequireRole(Roles.Student, Roles.Teacher, Roles.Admin));

            return services;
        }
    }
}
