using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.User
{
    public class EditUserReq
    {
        [Required(ErrorMessage = "ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "ID must be a positive integer.")]
        public int Id { get; set; }

        public string? Username { get; set; }

        public string? Password { get; set; }

        public int[]? ClassIds { get; set; }
    }
}