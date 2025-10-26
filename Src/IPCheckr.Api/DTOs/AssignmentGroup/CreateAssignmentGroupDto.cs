using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class CreateAssignmentGroupReq
    {
        [Required(ErrorMessage = "Assignment group name is required.")]
        [MaxLength(100, ErrorMessage = "Assignment group name cannot exceed 100 characters.")]
        public required string AssignmentGroupName { get; set; }

        [MaxLength(500, ErrorMessage = "Description cannot exceed 500 characters.")]
        public string? Description { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Number of records must be a positive integer.")]
        [Required(ErrorMessage = "Number of records is required.")]
        public int NumberOfRecords { get; set; } = 1;

        [Required(ErrorMessage = "Possible attempts is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Possible attempts must be a positive integer.")]
        public int PossibleAttempts { get; set; } = 1;

        [Required(ErrorMessage = "Class ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Class ID must be a positive integer.")]
        public int ClassId { get; set; }

        public int[]? Students { get; set; } = null;

        [Required(ErrorMessage = "Start date is required.")]
        [DataType(DataType.Date, ErrorMessage = "Start date must be a valid date.")]
        [DisplayFormat(DataFormatString = "{0:yyyy-MM-dd}", ApplyFormatInEditMode = true)]
        public required DateTime StartDate { get; set; }

        [Required(ErrorMessage = "Deadline is required.")]
        [DataType(DataType.Date, ErrorMessage = "Deadline must be a valid date.")]
        [DisplayFormat(DataFormatString = "{0:yyyy-MM-dd}", ApplyFormatInEditMode = true)]
        public required DateTime Deadline { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        [Required(ErrorMessage = "Assignment IP category is required.")]
        public required AssignmentGroupIpCat AssignmentIpCat { get; set; }
    }

    public class CreateAssignmentGroupRes
    {
        [Required]
        public int AssignmentGroupId { get; set; }
    }
}