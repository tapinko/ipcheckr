using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.DTOs
{
    public class ApiProblemDetails : ProblemDetails
    {
        public required string MessageEn { get; set; }
        public required string MessageSk { get; set; }
        public UserConflictInfoDto? Payload { get; set; }
    }

    public class UserConflictInfoDto
    {
        public string? ConflictField { get; set; }
        public string? AttemptedValue { get; set; }
    }
}