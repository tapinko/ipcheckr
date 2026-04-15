using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPCheckr.Api.Models
{
    [Table("SubnetAssignmentSubmits")]
    public class SubnetAssignmentSubmit
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public required SubnetAssignment Assignment { get; set; }

        public int? AttemptId { get; set; }

        public AssignmentSubmissionAttempt? Attempt { get; set; }

        public string[]? Networks { get; set; }

        public string[]? FirstUsables { get; set; }

        public string[]? LastUsables { get; set; }
        
        public string[]? Broadcasts { get; set; }

        public DateTime SubmittedAt { get; set; }
    }
}