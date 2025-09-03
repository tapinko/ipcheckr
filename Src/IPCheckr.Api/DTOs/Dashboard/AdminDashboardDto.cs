using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Dashboard
{
    public class QueryAdminDashboardRes : DashboardResBase
    {
        [Required]
        public int TotalClasses { get; set; }

        [Required]
        public int TotalStudents { get; set; }

        public string? LastSubmitUsername { get; set; }

        public DateTime? LastSubmitAt { get; set; }

        [Required]
        public int TotalSubmits { get; set; }

        [Required]
        public int TotalAssignmentGroups { get; set; }

        [Required]
        public int TotalUpcoming { get; set; }

        [Required]
        public int TotalInProgress { get; set; }
        
        [Required]
        public int TotalEnded { get; set; }
    }
}