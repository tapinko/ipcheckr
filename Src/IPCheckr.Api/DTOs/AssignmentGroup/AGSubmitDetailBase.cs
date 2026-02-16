using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class AGSubmitDetailsBaseDto
    {
        [Required]
        public int AssignmentId { get; set; }

        [Required]
        public required string StudentUsername { get; set; }

        [Required]
        public int StudentId { get; set; }

        [Required]
        public double SuccessRate { get; set; }

        public DateTime? SubmittedAt { get; set; }
    }
}