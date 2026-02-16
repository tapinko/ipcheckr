using System.ComponentModel.DataAnnotations;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class QueryAGsBaseReq
    {
        public string? Name { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Class ID must be a positive integer.")]
        public int? ClassId { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "Teacher IDs must be a non-negative integer array.")]
        public int? TeacherId { get; set; }

        [EnumDataType(typeof(AssignmentGroupStatus))]
        public string? Status { get; set; }

        [EnumDataType(typeof(AssignmentGroupType))]
        public string? AssignmentGroupType { get; set; }
    }

    public class QueryAGsBaseRes
    {
        [Required]
        public int TotalCount { get; set; }
    }

    public class AGBaseDto
    {
        [Required]
        public int AssignmentGroupId { get; set; }

        [Required]
        public required string Name { get; set; }

        public string? Description { get; set; }

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
        public AssignmentGroupStatus Status { get; set; }

        [Required]
        public AssignmentGroupType Type { get; set; }
    }
}