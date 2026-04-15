using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class ReopenAssignmentSubmissionAttemptReq
    {
        [Required]
        public int AssignmentAttemptId { get; set; }
    }

    public class ReopenAssignmentSubmissionAttemptRes : AssignmentSubmissionAttemptBaseRes
    {
    }
}