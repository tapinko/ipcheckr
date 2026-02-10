using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Models
{
    public class AssignmentGroupAuditBase
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public required string Name { get; set; }

        public string? Description { get; set; }

        public DateTime? CompletedAt { get; set; }

        public required AssignmentGroupStatus Status { get; set; }
        
        public required Class Class { get; set; }

        public DateTime StartDate { get; set; }

        public DateTime Deadline { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}