using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class AssignmentSubmissionAttemptBaseRes
    {
        [Required]
        public int AssignmentAttemptId { get; set; }

        [Required]
        public int AssignmentId { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupType AssignmentGroupType { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentSubmissionAttemptStatus Status { get; set; }

        [Required]
        public int AttemptNumber { get; set; }

        [Required]
        public required string LockToken { get; set; }

        [Required]
        public DateTime StartedAt { get; set; }

        public DateTime? LastActivityAt { get; set; }

        public DateTime? LastVisibleAt { get; set; }

        public DateTime? LockedAt { get; set; }

        public DateTime? LastReopenedAt { get; set; }

        public DateTime? SubmittedAt { get; set; }

        [Required]
        public int VisibilityIncidentCount { get; set; }

        [Required]
        public int ReopenCount { get; set; }

        public string? DraftJson { get; set; }

        public SubmitSubnetAssignmentField[]? SubnetData { get; set; }

        public SubmitIDNetAssignmentField[]? IdNetData { get; set; }
    }
}