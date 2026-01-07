using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.Gns3
{
    public class Gns3SessionBase
    {
        [Required]
        public int UserId { get; set; }

        [Required]
        public required string Username { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public GNS3SessionStatus Status { get; set; }

        [Required]
        public int Port { get; set; }

        public DateTime? SessionStart { get; set; }

        public DateTime? SessionEnd { get; set; }

        public string? ErrorMessage { get; set; }

        public int? Pid { get; set; }

        [Required]
        public int Duration { get; set; }

        [Required]
        public int ExtendedDuration { get; set; }
    }
}