using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Models
{
    [Table("Gns3Sessions")]
    public class Gns3Session
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        public DateTime SessionStart { get; set; } = DateTime.UtcNow;

        public DateTime? SessionEnd { get; set; }

        public int Duration { get; set; }

        public int ExtendedDuration { get; set; } = 0;

        public int Port { get; set; }

        public int Pid { get; set; }

        public GNS3SessionStatus Status { get; set; }

        public string? ErrorMessage { get; set; }

        public bool KilledByAdmin { get; set; } = false;
    }
}