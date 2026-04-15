using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Models
{
    [Table("AssignmentSubmissionAttempts")]
    public class AssignmentSubmissionAttempt
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public AssignmentGroupType AssignmentGroupType { get; set; }

        public int AssignmentId { get; set; }

        public int StudentId { get; set; }

        public User? Student { get; set; }

        public int AttemptNumber { get; set; }

        public AssignmentSubmissionAttemptStatus Status { get; set; } = AssignmentSubmissionAttemptStatus.ACTIVE;

        public string LockToken { get; set; } = Guid.NewGuid().ToString("N");

        public string? DraftJson { get; set; }

        public int VisibilityIncidentCount { get; set; }

        public int ReopenCount { get; set; }

        public DateTime StartedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastActivityAt { get; set; }

        public DateTime? LastVisibleAt { get; set; }

        public DateTime? LockedAt { get; set; }

        public DateTime? LastReopenedAt { get; set; }

        public DateTime? SubmittedAt { get; set; }

        public string? LockReason { get; set; }
    }
}