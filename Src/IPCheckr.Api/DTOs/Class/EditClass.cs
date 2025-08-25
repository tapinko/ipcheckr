using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Class
{
    public class EditClassReq
    {
        [Required(ErrorMessage = "ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "ID must be a positive integer.")]
        public int Id { get; set; }

        public string? Classname { get; set; }
        
        
        public int[]? Teachers { get; set; }
    }
}