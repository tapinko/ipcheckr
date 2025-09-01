using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPCheckr.Api.Models
{
    [Table("AssignmentSubmits")]
    public class AssignmentSubmit
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public required Assignment Assignment { get; set; }

        public int Attempt { get; set; }

        public required string[] Networks { get; set; }

        public required string[] FirstUsables { get; set; }

        public required string[] LastUsables { get; set; }

        public required string[] Broadcasts { get; set; }

        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public DateTime SubmittedAt { get; set; }
    }
}