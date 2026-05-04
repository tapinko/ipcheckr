using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Models
{
    [Table("AGTemplates")]
    public class AGTemplate
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public required string Name { get; set; }

        public string? AGName { get; set; }

        public string? AGDescription { get; set; }

        public required int OwnerId { get; set; }

        public User Owner { get; set; } = null!;

        public required AssignmentGroupType Type { get; set; }

        public required AssignmentGroupIpCat IpCat { get; set; }

        public required int NumberOfRecords { get; set; }

        public AssignmentGroupDifficulty? Difficulty { get; set; }

        public AssignmentGroupHostSortStrategy? HostSortStrategy { get; set; }

        public int? PossibleOctets { get; set; }

        public bool TestWildcard { get; set; }

        public bool TestFirstLastBr { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}