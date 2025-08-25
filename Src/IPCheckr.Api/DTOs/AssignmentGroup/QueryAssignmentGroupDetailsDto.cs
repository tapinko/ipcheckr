using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class QueryAssignmentGroupDetailsReq
    {
        [Required(ErrorMessage = "Assignment Group ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "ID must be a positive integer.")]
        public int AssignmentGroupId { get; set; }
    }

    public class QueryAssignmentGroupDetailsRes : AssignmentGroupDto
    {
        [Required]
        public int NumberOfRecords { get; set; }

        [Required]
        public int PossibleAttempts { get; set; }

        [Required]
        public required AssignmentGroupSubmitDetailsDto[] Assignments { get; set; }
    }
    public class AssignmentGroupSubmitDetailsDto
    {
        [Required]
        public int AssignmentId { get; set; }

        [Required]
        public required string StudentUsername { get; set; }

        [Required]
        public int StudentId { get; set; }

        [Required]
        public double SuccessRate { get; set; }

        [Required]
        public int AttemptCount { get; set; }

        public int[]? Students { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public required AssignmentGroupStatus Status { get; set; }

        public DateTime? LastSubmit { get; set; }
    }
}