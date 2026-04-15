using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class ReopenStudentAssignmentAttemptReq
    {
        [Required(ErrorMessage = "Assignment ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Assignment ID must be a positive integer.")]
        public int AssignmentId { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupType AssignmentGroupType { get; set; }
    }

    public class ReopenStudentAssignmentAttemptRes
    {
        [Required]
        public int AssignmentAttemptId { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentSubmissionAttemptStatus Status { get; set; }

        [Required]
        public int ReopenCount { get; set; }

        public DateTime? LastReopenedAt { get; set; }
    }
}