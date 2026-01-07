using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Gns3
{
    public class StopSessionReq
    {
        [Required]
        public int UserId { get; set; }
    }
}