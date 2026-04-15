using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class CreateAssignmentSubmissionAttemptReq
    {
        [Required(ErrorMessage = "Assignment ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Assignment ID must be a positive integer.")]
        public int AssignmentId { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupType AssignmentGroupType { get; set; }
    }

    public class CreateAssignmentSubmissionAttemptRes : AssignmentSubmissionAttemptBaseRes
    {
    }
}