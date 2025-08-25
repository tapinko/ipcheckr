using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Auth
{
    public class ValidateTokenReq
    {
        [Required(ErrorMessage = "Token is required.")]
        [MinLength(1, ErrorMessage = "Token is required.")]
        public required string Token { get; set; }
    }

    public class ValidateTokenRes
    {
        [Required]
        public bool IsValid { get; set; }
        [Required]
        public required string Role { get; set; }
        [Required]
        public int UserId { get; set; }
        [Required]
        public required string Username { get; set; }
    }

}