using System.ComponentModel.DataAnnotations;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AppConfig
{
    public class AppConfigDto
    {
        [Required]
        public Language DefaultLanguage { get; set; }

        [Required]
        public AuthType AuthType { get; set; }

        public string? InstitutionName { get; set; }
    }
}