using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.DTOs.AssignmentGroup;

namespace IPCheckr.Api.DTOs.Assignment
{
    public class QueryAssignmentsBaseReq
    {
        [Required(ErrorMessage = "Student ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Student ID must be a positive integer.")]
        public int StudentId { get; set; }
    }

    public class QueryAssignmentsBaseRes
    {
        [Required]
        public int TotalCount { get; set; }
    }

    public class AssignmentDto
    {
        [Required]
        public required string Name { get; set; }

        public string? AssignmentGroupDescription { get; set; }
        
        [Required]
        public required DateTime StartDate { get; set; }

        [Required]
        public DateTime Deadline { get; set; }

        [Required]
        public required string TeacherUsername { get; set; }

        [Required]
        public required string ClassName { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupStatus Status { get; set; }
    }
}