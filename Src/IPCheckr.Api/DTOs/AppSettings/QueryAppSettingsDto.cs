using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AppSettings
{
    public class QueryAppSettingRes
    {
        [Required]
        public required AppSettingDto[] AppSettings { get; set; }

        [Required]
        public int TotalCount { get; set; }
    }

    public class AppSettingDto
    {
        [Required]
        public int Id { get; set; }

        [Required]
        public required string Name { get; set; }

        public string? Value { get; set; }
    }
}