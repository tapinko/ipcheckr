using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.User
{
    public class AddUserReq
    {
        [Required(ErrorMessage = "Username is required.")]
        [MinLength(1, ErrorMessage = "Username is required.")]
        [MaxLength(50, ErrorMessage = "Username cannot exceed 50 characters.")]
        public required string Username { get; set; }

        // [MinLength(5, ErrorMessage = "Password must be at least 5 characters long.")] // yep, because password "cisco" is 5 characters long
        [MaxLength(32, ErrorMessage = "Password cannot exceed 32 characters.")]
        public string? Password { get; set; }

        [Required(ErrorMessage = "Role is required.")]
        [MinLength(1, ErrorMessage = "Role is required.")]
        public required string Role { get; set; }

        public int[]? ClassIds { get; set; }
    }

    public class AddUserRes
    {
        [Required]
        public int UserId { get; set; }
    }
}