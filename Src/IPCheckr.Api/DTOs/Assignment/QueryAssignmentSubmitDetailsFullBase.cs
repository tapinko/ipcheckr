using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.Assignment
{
    public class QueryAssignmentSubmitDetailsFullBaseReq
    {
        [Required(ErrorMessage = "Assignment ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Assignment ID must be a positive integer.")]
        public int AssignmentId { get; set; }
    }

    public class QueryAssignmentSubmitDetailsFullBaseRes
    {
        [Required]
        public required string Name { get; set; }

        public string? Description { get; set; }

        [Required]
        public DateTime SubmittedAt { get; set; }

        [Required]
        public required string StudentName { get; set; }
        
        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupStatus Status { get; set; }
    }
}