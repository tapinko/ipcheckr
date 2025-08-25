using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPCheckr.Api.Models
{
    /// <summary>
    /// Represents an assignment created different for every student under assignment group.
    /// </summary>
    /// <remarks>
    /// Contains generated CIDR and number of hosts for every network.
    /// Each assignment is linked to a specific student and an assignment group.
    /// </remarks>
    [Table("Assignments")]
    public class Assignment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public required AssignmentGroup AssignmentGroup { get; set; }
        public required User Student { get; set; }
        [RegularExpression(@"^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$", ErrorMessage = "Invalid CIDR format. Use x.x.x.x/y.")]
        public required string Cidr { get; set; }

        public required int[] Hosts { get; set; }

        public bool IsCompleted { get; set; } = false;

        [DataType(DataType.Date)]
        [DisplayFormat(DataFormatString = "{0:yyyy-MM-dd}", ApplyFormatInEditMode = true)]
        public DateTime? CompletedAt { get; set; }
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}