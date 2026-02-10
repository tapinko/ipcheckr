using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPCheckr.Api.Models
{
    [Table("IDNetAssignmentSubmits")]
    public class IDNetAssignmentSubmit
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public required IDNetAssignment Assignment { get; set; }

        public string[]? IDNet { get; set; }

        public string[]? Wildcard { get; set; }

        public string[]? FirstUsables { get; set; }

        public string[]? LastUsables { get; set; }

        public string[]? Broadcasts { get; set; }
        public DateTime SubmittedAt { get; set; }
    }
}