using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class QueryAssignmentDataForSubmitReq
    {
        [Required(ErrorMessage = "Assignment ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Assignment ID must be a positive integer.")]
        public int AssignmentId { get; set; }
    }
    public class QueryAssignmentDataForSubmitRes
    {
        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public required AssignmentGroupType AssignmentGroupType { get; set; }

        [Required]
        public int[]? HostsPerNetwork { get; set; }

        public string? Cidr { get; set; }

        public string[]? Cidrs { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupIpCat AssignmentGroupIpCat { get; set; }

        public bool TestWildcard { get; set; }

        public bool TestFirstLastBr { get; set; }

        public int? PossibleOctets { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupStatus Status { get; set; }

        public DateTime StartDate { get; set; }

        public DateTime Deadline { get; set; }

        [Required]
        public required bool IsAvailableForSubmission { get; set; }
    }
}