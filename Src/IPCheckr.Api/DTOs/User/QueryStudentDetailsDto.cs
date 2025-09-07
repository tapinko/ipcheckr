using System.ComponentModel.DataAnnotations;
using IPCheckr.Api.DTOs.Dashboard;
using IPCheckr.Api.Interfaces;

namespace IPCheckr.Api.DTOs.User
{
    public class QueryStudentDetailsReq
    {
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "User ID must be a positive integer.")]
        public int? StudentId { get; set; }
    }

    public class QueryStudentDetailsRes
    {
        [Required]
        public required string Username { get; set; }

        [Required]
        public int TotalSubmits { get; set; }

        public int? LastSubmitGroupId { get; set; }

        public int? LastSubmitAssignmentId { get; set; }

        public int? LastSubmitAttempt { get; set; }

        public DateTime? LastSubmitAt { get; set; }

        public string? Classes { get; set; }

        public double? AverageNetwork { get; set; }

        public double? AverageFirst { get; set; }

        public double? AverageLast { get; set; }

        public double? AverageBroadcast { get; set; }

        [Required]
        public double AverageTotal { get; set; }

        [Required]
        public StudentDetailsSuccessRateDto[]? SuccessRate { get; set; }
    }

    public class StudentDetailsSuccessRateDto : ILinesChartData
    {
        [Required]
        public required string Date { get; set; }

        [Required]
        public double Percentage { get; set; }

        string IChartDataBase.Label
        {
            get => Date;
            set => Date = value;
        }

        double IChartDataBase.Value
        {
            get => Percentage;
            set => Percentage = value;
        }
    }
}