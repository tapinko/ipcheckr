using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Dashboard
{
    public class QueryStudentDashboardRes : DashboardResBase
    {
        [Required]
        public required string Classes { get; set; }

        [Required]
        public required string Teachers { get; set; }

        public DateTime? LastSubmitAt { get; set; }

        public int? LastSubmitId { get; set; }

        public int? LastSubmitGroupId { get; set; }

        [Required]
        public int TotalSubmits { get; set; }

        [Required]
        public StudentLinesChartDataDto[]? SuccessRate { get; set; }
    }

    public class StudentLinesChartDataDto
    {
        [Required]
        public required string Date { get; set; }

        [Required]
        public double Percentage { get; set; }
    }
}