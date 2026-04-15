using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class SaveAssignmentSubmissionAttemptDraftReq
    {
        [Required]
        public int AssignmentAttemptId { get; set; }

        [Required]
        public required string LockToken { get; set; }

        public SubmitSubnetAssignmentField[]? SubnetData { get; set; }

        public SubmitIDNetAssignmentField[]? IdNetData { get; set; }
    }

    public class SaveAssignmentSubmissionAttemptDraftRes
    {
        [Required]
        public int AssignmentAttemptId { get; set; }

        [Required]
        public DateTime LastActivityAt { get; set; }
    }
}