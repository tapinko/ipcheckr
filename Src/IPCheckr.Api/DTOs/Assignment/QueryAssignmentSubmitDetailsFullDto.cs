using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.Assignment
{
    public class QueryAssignmentSubmitDetailsFullReq
    {
        [Required(ErrorMessage = "Assignment ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Assignment ID must be a positive integer.")]
        public int AssignmentId { get; set; }

        [Required(ErrorMessage = "Attempt is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Attempt must be a positive integer.")]
        public int Attempt { get; set; }
    }

    public class QueryAssignmentSubmitDetailsFullRes
    {
        [Required]
        public required string AssignmentGroupName { get; set; }

        public string? Description { get; set; }

        [Required]
        public required QueryAssignmentSubmitDetailsFullRecordField[] Results { get; set; }

        [Required]
        public int NumberOfSubmits { get; set; }

        [Required]
        public DateTime SubmittedAt { get; set; }

        [Required]
        public required string StudentName { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public required AssignmentGroupIpCat AssignmentGroupIpCat { get; set; }

        [Required]
        public double SuccessRate { get; set; }
    }

    public class QueryAssignmentSubmitDetailsFullRecordField
    {
        [Required]
        public int Hosts { get; set; }

        [Required]
        public required QueryAssignmentSubmitDetailsFullAnswerField Network { get; set; }

        [Required]
        public required QueryAssignmentSubmitDetailsFullAnswerField FirstUsable { get; set; }

        [Required]
        public required QueryAssignmentSubmitDetailsFullAnswerField LastUsable { get; set; }

        [Required]
        public required QueryAssignmentSubmitDetailsFullAnswerField Broadcast { get; set; }
    }

    public class QueryAssignmentSubmitDetailsFullAnswerField
    {
        public string? Submitted { get; set; }
        
        [Required]
        public required string Correct { get; set; }
    }
}