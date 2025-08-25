using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Class
{
    public class DeleteClassesReq
    {
        [Required(ErrorMessage = "At least one class ID is required.")]
        [MinLength(1, ErrorMessage = "At least one class ID is required.")]
        [MaxLength(100, ErrorMessage = "A maximum of 100 class IDs can be specified.")]
        public required int[] ClassIds { get; set; }
    }
}