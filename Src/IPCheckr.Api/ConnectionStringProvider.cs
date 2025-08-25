using Microsoft.Extensions.Configuration;
using System;

namespace IPCheckr.Api
{
    public static class ConnectionStringProvider
    {
        public static string GetConnectionString(IConfiguration? configuration = null)
        {
            var config = configuration ?? new ConfigurationBuilder()
                .AddJsonFile("appsettings.json", optional: true)
                .AddEnvironmentVariables()
                .Build();

            string host = Environment.GetEnvironmentVariable("DB_HOST") ?? config["DB:Host"];
            string port = Environment.GetEnvironmentVariable("DB_PORT") ?? config["DB:Port"] ?? "3306";
            string db = Environment.GetEnvironmentVariable("DB_NAME") ?? config["DB:Name"];
            string user = Environment.GetEnvironmentVariable("DB_USER") ?? config["DB:User"];
            string password = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? config["DB:Password"];

            if (!string.IsNullOrWhiteSpace(host) && !string.IsNullOrWhiteSpace(db) && !string.IsNullOrWhiteSpace(user))
            {
                return $"Server={host};Port={port};Database={db};User={user};Password={password};";
            }

            var fallback = config.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(fallback))
                throw new InvalidOperationException("No database connection configuration found (DB_* env vars or ConnectionStrings:DefaultConnection).");

            return fallback;
        }
    }
}