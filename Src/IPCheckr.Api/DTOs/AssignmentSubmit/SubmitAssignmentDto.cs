using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class SubmitAssignmentReq
    {
        [Required(ErrorMessage = "Assignment ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Assignment ID must be a positive integer.")]
        public int AssignmentId { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupType? AssignmentGroupType { get; set; }

        public SubmitAssignmentField[]? SubnetData { get; set; }

        public SubmitIdNetAssignmentField[]? IdNetData { get; set; }
    }

    public class SubmitAssignmentField
    {
        public string? Network { get; set; } = null;

        public string? FirstUsable { get; set; } = null;

        public string? LastUsable { get; set; } = null;

        public string? Broadcast { get; set; } = null;
    }

    public class SubmitIdNetAssignmentField
    {
        public string? IDNet { get; set; } = null;

        public string? Wildcard { get; set; } = null;

        public string? FirstUsable { get; set; } = null;

        public string? LastUsable { get; set; } = null;

        public string? Broadcast { get; set; } = null;
    }

    public class SubmitAssignmentRes
    {
        [Required]
        public int AssignmentSubmitId { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupStatus Status { get; set; }
    }
}