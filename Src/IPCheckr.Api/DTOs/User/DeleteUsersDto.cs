using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.User
{
    public class DeleteUsersReq
    {
        [Required(ErrorMessage = "At least one user ID is required.")]
        [MinLength(1, ErrorMessage = "At least one user ID is required.")]
        public required int[] UserIds { get; set; }
    }
}