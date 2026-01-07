using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace IPCheckr.Api.DTOs.Gns3
{
    public class QuerySessionReq
    {
        [Required]
        [FromRoute(Name = "userId")]
        public int UserId { get; set; }
    }

    public class QuerySessionRes : Gns3SessionBase
    {
    }
}