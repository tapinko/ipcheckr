using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Class
{
    public class QueryClassesReq
    {
        [Range(1, int.MaxValue, ErrorMessage = "Class ID must be a positive integer.")]
        public int? ClassId { get; set; }

        public string? ClassName { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Teacher ID must be a positive integer.")]
        public int? TeacherId { get; set; }

        public string? TeacherUsername { get; set; }

        public bool? Descending { get; set; } = true;
    }

    public class QueryClassesRes
    {

        [Required]
        public required ClassDto[] Classes { get; set; }

        [Required]
        public int TotalCount { get; set; }
    }

    public class ClassDto
    {
        [Required]
        public int ClassId { get; set; }

        [Required]
        public required string ClassName { get; set; }

        [Required]
        public required int[] Teachers { get; set; }

        [Required]
        public required string[] TeacherUsernames { get; set; }
    }
}