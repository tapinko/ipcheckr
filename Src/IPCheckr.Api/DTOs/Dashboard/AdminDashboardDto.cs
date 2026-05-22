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

        public int? LastSubmitGroupId { get; set; }

        public int? LastSubmitId { get; set; }

        public string? LastSubmitType { get; set; }

        public string? MostSuccessfulClass { get; set; }

        public int? MostSuccessfulClassId { get; set; }

        public string? MostSuccessfulStudent { get; set; }

        public int? MostSuccessfulStudentId { get; set; }

        [Required]
        public int TotalSubmits { get; set; }
    }
}