using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class QueryAssignmentGroupsReq
    {
        public string? AssignmentGroupName { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Class ID must be a positive integer.")]
        public int? ClassId { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "Teacher IDs must be a non-negative integer array.")]
        public int? TeacherId { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupState State { get; set; }
    }

    public class QueryAssignmentGroupsRes
    {
        [Required]
        public required AssignmentGroupDto[] AssignmentGroups { get; set; }

        [Required]
        public int TotalCount { get; set; }
    }
    public class AssignmentGroupDto
    {
        [Required]
        public int AssignmentGroupId { get; set; }

        [Required]
        public required string AssignmentGroupName { get; set; }

        public string? AssignmentGroupDescription { get; set; }

        [Required]
        public int ClassId { get; set; }

        [Required]
        public required string ClassName { get; set; }

        [Required]
        public int Submitted { get; set; }

        [Required]
        public int Total { get; set; }

        [Required]
        public required DateTime StartDate { get; set; }

        [Required]
        public required DateTime Deadline { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupStatus SubmissionStatus { get; set; }

        [Required]
        public required double SuccessRate { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupState State { get; set; }
    }
}