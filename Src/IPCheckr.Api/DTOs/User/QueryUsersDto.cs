using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.User
{
    public class QueryUsersReq
    {
        [Range(1, int.MaxValue, ErrorMessage = "User ID must be a positive integer.")]
        public int? UserId { get; set; }

        public string? Username { get; set; }

        public string? Role { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Class ID must be a positive integer.")]
        public int? ClassId { get; set; }

        public string? ClassName { get; set; }

        public bool? Descending { get; set; } = true;
    }

    public class QueryUsersRes
    {
        [Required]
        public required UserDto[] Users { get; set; }

        [Required]
        public int TotalCount { get; set; }
    }

    public class UserDto
    {
        [Required]
        public int Id { get; set; }

        [Required]
        public required string Username { get; set; }

        [Required]
        public required string Role { get; set; }

        public int[]? ClassIds { get; set; }

        public string[]? ClassNames { get; set; }
    }
}