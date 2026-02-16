using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class EditAGBaseReq
    {
        [Required(ErrorMessage = "ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "ID must be a positive integer.")]
        public int Id { get; set; }

        [MaxLength(100, ErrorMessage = "Assignment group name cannot exceed 100 characters.")]
        public string? Name { get; set; }

        [MaxLength(500, ErrorMessage = "Description cannot exceed 500 characters.")]
        public string? Description { get; set; }

        public int[]? Students { get; set; }

        [DisplayFormat(DataFormatString = "{0:yyyy-MM-dd}", ApplyFormatInEditMode = true)]
        public DateTime? StartDate { get; set; }
        
        [DisplayFormat(DataFormatString = "{0:yyyy-MM-dd}", ApplyFormatInEditMode = true)]
        public DateTime? Deadline { get; set; }
    }
}