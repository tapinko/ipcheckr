using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class CreateAGBaseReq
    {
        [Required(ErrorMessage = "Assignment group name is required.")]
        [MaxLength(100, ErrorMessage = "Assignment group name cannot exceed 100 characters.")]
        public required string Name { get; set; }

        [MaxLength(500, ErrorMessage = "Description cannot exceed 500 characters.")]
        public string? Description { get; set; }

        [Required(ErrorMessage = "Class ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Class ID must be a positive integer.")]
        public int ClassId { get; set; }

        public int[]? Students { get; set; } = null;

        [JsonConverter(typeof(JsonStringEnumConverter))]
        [Required(ErrorMessage = "Assignment group type is required.")]
        public required AssignmentGroupType Type { get; set; }

        [Required(ErrorMessage = "Start date is required.")]
        [DataType(DataType.Date, ErrorMessage = "Start date must be a valid date.")]
        [DisplayFormat(DataFormatString = "{0:yyyy-MM-dd}", ApplyFormatInEditMode = true)]
        public required DateTime StartDate { get; set; }

        [Required(ErrorMessage = "Deadline is required.")]
        [DataType(DataType.Date, ErrorMessage = "Deadline must be a valid date.")]
        [DisplayFormat(DataFormatString = "{0:yyyy-MM-dd}", ApplyFormatInEditMode = true)]
        public required DateTime Deadline { get; set; }
    }

    public class CreateAGBaseRes
    {
        [Required]
        public int AssignmentGroupId { get; set; }
    }
}