using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class SubmitAssignmentBaseReq
    {
        [Required(ErrorMessage = "Assignment ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Assignment ID must be a positive integer.")]
        public int AssignmentId { get; set; }
    }

    public class SubmitAssignmentBaseRes
    {
        [Required]
        public int AssignmentSubmitId { get; set; }
    }
}