using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Class
{
    public class CreateClassReq
    {
        [Required(ErrorMessage = "Class name is required.")]
        [MinLength(1, ErrorMessage = "Class name is required.")]
        [MaxLength(50, ErrorMessage = "Class name cannot exceed 50 characters.")]
        public required string ClassName { get; set; }

        public int[]? Teachers { get; set; }
    }

    public class CreateClassRes
    {
        [Required]
        public int ClassId { get; set; }
    }
}