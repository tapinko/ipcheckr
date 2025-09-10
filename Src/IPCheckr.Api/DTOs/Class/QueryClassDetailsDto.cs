using System.ComponentModel.DataAnnotations;
using IPCheckr.Api.Interfaces;

namespace IPCheckr.Api.DTOs.Class
{
    public class QueryClassDetailsReq
    {
        [Required(ErrorMessage = "Class ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Class ID must be a positive integer.")]
        public int Id { get; set; }
    }

    public class QueryClassDetailsRes
    {
        [Required]
        public required string ClassName { get; set; }

        [Required]
        public int TotalSubmits { get; set; }

        [Required]
        public double AverageSuccessRate { get; set; }

        [Required]
        public int TotalAssignmentGroups { get; set; }

        [Required]
        public int TotalUpcoming { get; set; }

        [Required]
        public int TotalInProgress { get; set; }

        [Required]
        public int TotalEnded { get; set; }

        public ClassDetailsTeachersDto[]? Teachers { get; set; }

        public DateTime CreatedAt { get; set; }

        [Required]
        public ClassDetailsStudentsDto[]? Students { get; set; }

        public DateTime? LastSubmitAt { get; set; }

        public string? LastSubmitUsername { get; set; }

        public int? LastSubmitGroupId { get; set; }

        public int? LastSubmitAttempt { get; set; }

        public int? LastSubmitId { get; set; } 

        public AverageSuccessRateInStudentsDto[]? AverageSuccessRateInStudents { get; set; }

        public AverageSuccessRateInAssignmentGroupsDto[]? AverageSuccessRateInAssignmentGroups { get; set; }
    }

    public class ClassDetailsTeachersDto
    {
        [Required]
        public required int TeacherId { get; set; }

        [Required]
        public required string Username { get; set; }
    }

    public class AverageSuccessRateInStudentsDto : IBarChartData
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

    public class AverageSuccessRateInAssignmentGroupsDto : ILinesChartData
    {
        [Required]
        public required string AssignmentGroupName { get; set; }

        [Required]
        public double Percentage { get; set; }

        string IChartDataBase.Label
        {
            get => AssignmentGroupName;
            set => AssignmentGroupName = value;
        }

        double IChartDataBase.Value
        {
            get => Percentage;
            set => Percentage = value;
        }
    }

    public class ClassDetailsStudentsDto
    {
        [Required]
        public required int StudentId { get; set; }

        [Required]
        public required string Username { get; set; }
    }
}