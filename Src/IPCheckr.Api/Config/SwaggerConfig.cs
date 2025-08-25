using Microsoft.Extensions.DependencyInjection;
using NSwag;
using NSwag.Generation.Processors.Security;

namespace IPCheckr.Api.Config
{
    public static class SwaggerConfig
    {
        public static IServiceCollection AddSwaggerDocumentation(this IServiceCollection services)
        {
            services.AddOpenApiDocument(config =>
            {
                config.AddSecurity("JWT", [], new OpenApiSecurityScheme
                {
                    Type = OpenApiSecuritySchemeType.ApiKey,
                    Name = "Authorization",
                    In = OpenApiSecurityApiKeyLocation.Header,
                    Description = "Type into the textbox: Bearer {your JWT token}."
                });
                config.OperationProcessors.Add(new AspNetCoreOperationSecurityScopeProcessor("JWT"));

                var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
                var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);

                config.PostProcess = document =>
                {
                    document.Info.Title = "IPCheckr API";
                    if (File.Exists(xmlPath))
                    {
                        document.Info.Description += $"\n\nXML comments loaded from: {xmlFile}";
                    }
                };
            });

            return services;
        }
    }
}