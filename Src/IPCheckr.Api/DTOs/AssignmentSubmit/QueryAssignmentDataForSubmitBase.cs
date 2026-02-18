using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class QueryAssignmentDataForSubmitBaseReq
    {
        [Required(ErrorMessage = "Assignment ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Assignment ID must be a positive integer.")]
        public int AssignmentId { get; set; }
    }
    public class QueryAssignmentDataForSubmitBaseRes
    {
        [Required]
        public required string AssignmentName { get; set; }

        [Required]
        public required string TeacherUsername { get; set; }

        [Required]
        public required string ClassName { get; set; }

        [Required]
        public required bool IsAvailableForSubmission { get; set; }

        [Required]
        public required DateTime Deadline { get; set; }
    }
}