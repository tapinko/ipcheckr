using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.User
{
    public class QueryUserDetailsReq
    {
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "User ID must be a positive integer.")]
        public int? UserId { get; set; }
    }

    public class QueryUserDetailsRes : QueryStudentDetailsRes
    {
        [Required]
        public required string Role { get; set; }

        [Required]
        public required DateTime CreatedAt { get; set; }

        
    }
}