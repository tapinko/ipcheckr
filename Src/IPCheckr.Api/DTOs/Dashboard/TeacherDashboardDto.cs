using System.ComponentModel.DataAnnotations;
using IPCheckr.Api.Interfaces;

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

        public int? LastSubmitGroupId { get; set; }

        public int? LastSubmitId { get; set; }

        public string? MostSuccessfulClass { get; set; }

        public string? MostSuccessfulStudent { get; set; }

        [Required]
        public int TotalClasses { get; set; }

        [Required]
        public int TotalStudents { get; set; }

        [Required]
        public int TotalSubmits { get; set; }

        public AveragePercentageInStudentsDto[]? AveragePercentageInStudents { get; set; }

        public AveragePercentageInClassesDto[]? AveragePercentageInClasses { get; set; }
    }

    public class AveragePercentageInStudentsDto : IBarChartData
    {
        [Required]
        public required string Username { get; set; }

        [Required]
        public double Percentage { get; set; }

        string IChartDataBase.Label
        {
            get => Username;
            set => Username = value;
        }

        double IChartDataBase.Value
        {
            get => Percentage;
            set => Percentage = value;
        }
    }

    public class AveragePercentageInClassesDto : IBarChartData
    {
        [Required]
        public required string ClassName { get; set; }

        [Required]
        public double Percentage { get; set; }

        string IChartDataBase.Label
        {
            get => ClassName;
            set => ClassName = value;
        }

        double IChartDataBase.Value
        {
            get => Percentage;
            set => Percentage = value;
        }
    }
}