using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Auth
{
    public class LoginReq
    {
        [Required(ErrorMessage = "Username is required.")]
        [MinLength(1, ErrorMessage = "Username is required.")]
        [MaxLength(50, ErrorMessage = "Username cannot exceed 50 characters.")]
        public required string Username { get; set; }

        [Required(ErrorMessage = "Password is required.")]
        [MinLength(5, ErrorMessage = "Password must be at least 5 characters long.")]
        [MaxLength(100, ErrorMessage = "Password cannot exceed 100 characters.")]
        public required string Password { get; set; }
    }

    public class LoginRes
    {

        [Required]
        public required string Token { get; set; }

        [Required]
        public required string Role { get; set; }
    }
}