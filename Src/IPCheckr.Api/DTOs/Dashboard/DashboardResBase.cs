using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Dashboard
{
    public class DashboardResBase
    {
        public string? InstitutionName { get; set; }

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