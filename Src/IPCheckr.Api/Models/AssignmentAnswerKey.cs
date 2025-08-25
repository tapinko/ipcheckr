using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPCheckr.Api.Models
{
    [Table("AssignmentAnswerKeys")]
    public class AssignmentAnswerKey
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public required Assignment Assignment { get; set; }

        public required string[] Networks { get; set; }

        public required string[] FirstUsables { get; set; }

        public required string[] LastUsables { get; set; }

        public required string[] Broadcasts { get; set; }

        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}