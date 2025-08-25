using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class SubmitAssignmentReq
    {
        [Required(ErrorMessage = "Assignment ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Assignment ID must be a positive integer.")]
        public int AssignmentId { get; set; }

        public SubmitAssignmentField[]? Data { get; set; }
    }

    public class SubmitAssignmentField
    {
        public string? Network { get; set; } = null;

        public string? FirstUsable { get; set; } = null;

        public string? LastUsable { get; set; } = null;

        public string? Broadcast { get; set; } = null;
    }

    public class SubmitAssignmentRes
    {
        [Required]
        public int AssignmentSubmitId { get; set; }

        [Required]
        public int Attempt { get; set; }
    }
}