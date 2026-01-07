using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Gns3
{
    public class ExtendSessionReq
    {
        [Required]
        public int UserId { get; set; }

        public int? Minutes { get; set; }
    }
}