using Microsoft.Extensions.DependencyInjection;

namespace IPCheckr.Api.Config
{
    public static class CorsConfig
    {
        public static IServiceCollection AddCustomCors(this IServiceCollection services)
        {
            services.AddCors(options =>
            {
                options.AddPolicy("AllowVite", policy =>
                    policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
                          .AllowAnyMethod()
                          .AllowAnyHeader());
            });

            return services;
        }
    }
}