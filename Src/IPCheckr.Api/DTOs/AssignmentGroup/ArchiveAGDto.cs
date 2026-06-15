using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class ArchiveAGReq
    {
        [Required(ErrorMessage = "Assignment Group ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "ID must be a positive integer.")]
        public int AssignmentGroupId { get; set; }

        [Required]
        public bool IsArchived { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupType Type { get; set; }

        public DateTime? NewStartDate { get; set; }

        public DateTime? NewDeadline { get; set; }
    }
}