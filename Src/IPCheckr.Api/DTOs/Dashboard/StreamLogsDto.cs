using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Dashboard
{
    public class StreamLogsReq
    {
        public string? MinLevel { get; set; } // Information", "Warning", "Error"

        public string? CategoryStartsWith { get; set; }// e.g. "Microsoft.EntityFrameworkCore"

        public string? Contains { get; set; }
    }

    public class StreamLogsRes
    {
        [Required]
        public DateTime TimestampUtc { get; set; }

        [Required]
        public string Category { get; set; } = "";

        [Required]
        public string Level { get; set; } = "";

        [Required]
        public int EventId { get; set; }

        [Required]
        public string Message { get; set; } = "";

        public string? Exception { get; set; }
    }
}