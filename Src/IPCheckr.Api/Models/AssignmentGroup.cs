using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPCheckr.Api.Models
{
    [Table("AssignmentGroups")]
    public class AssignmentGroup
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public required string Name { get; set; }
        public string? Description { get; set; }
        /// <summary>
        /// Number of generated records for the assignment group.
        /// If 5, then the student have to calculate network, first usable, last usable and broadcast for 5 host groups.
        /// </summary>
        public int NumberOfRecords { get; set; }
        /// <summary>
        /// Number of attempts allowed for the assignment group.
        /// If 1, then the student can only submit once.
        /// </summary>
        public int PossibleAttempts { get; set; }
        public bool IsCompleted { get; set; } = false;
        public required Class Class { get; set; }

        [DataType(DataType.Date)]
        [DisplayFormat(DataFormatString = "{0:yyyy-MM-dd}", ApplyFormatInEditMode = true)]
        [Required(ErrorMessage = "Start Date is required.")]
        public DateTime StartDate { get; set; }

        [DataType(DataType.Date)]
        [DisplayFormat(DataFormatString = "{0:yyyy-MM-dd}", ApplyFormatInEditMode = true)]
        [Required(ErrorMessage = "Deadline is required.")]
        public DateTime Deadline { get; set; }

        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}