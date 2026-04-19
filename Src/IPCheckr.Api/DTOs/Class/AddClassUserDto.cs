using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Class
{
    public class AddStudentToClassReq
    {
        [Required(ErrorMessage = "Username is required.")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Class IDs are required.")]
        [MinLength(1, ErrorMessage = "At least one class must be provided.")]
        public int[] ClassIds { get; set; } = [];
    }

    public class AddTeacherToClassReq
    {
        [Required(ErrorMessage = "Username is required.")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Class IDs are required.")]
        [MinLength(1, ErrorMessage = "At least one class must be provided.")]
        public int[] ClassIds { get; set; } = [];
    }
}