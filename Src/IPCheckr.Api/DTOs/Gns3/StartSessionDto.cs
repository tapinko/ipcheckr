using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Gns3
{
    public class StartSessionReq
    {
        [Required]
        public int UserId { get; set; }

        [Required]
        public int Duration { get; set; }
    }

    public class StartSessionRes
    {
        [Required]
        public required string SessionId { get; set; }

        public string? ErrorMessage { get; set; }
    }
}