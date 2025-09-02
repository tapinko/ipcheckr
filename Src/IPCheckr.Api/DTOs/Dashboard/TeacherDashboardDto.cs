using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Dashboard
{
    public class QueryTeacherDashboardReq
    {
        [Required]
        [Range(1, 10)]
        public int BarChartLength { get; set; }
    }

    public class QueryTeacherDashboardRes : DashboardResBase
    {
        public string? LastSubmitUsername { get; set; }

        public DateTime? LastSubmitAt { get; set; }

        public string? MostSuccessfulClass { get; set; }

        public string? MostSuccessfulStudent { get; set; }

        [Required]
        public int TotalClasses { get; set; }

        [Required]
        public int TotalStudents { get; set; }

        public TeacherBarChartDataDto[]? AveragePercentageInStudents { get; set; }

        public TeacherBarChartDataDto[]? AveragePercentageInClasses { get; set; }
    }

    public class TeacherBarChartDataDto
    {
        [Required]
        public required string Username { get; set; }
        [Required]
        public double Percentage { get; set; }
    }
}