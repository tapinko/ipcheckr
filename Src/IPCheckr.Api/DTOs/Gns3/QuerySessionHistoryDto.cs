using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Gns3
{
    public class QuerySessionHistoryRes
    {
        [Required]
        public List<Gns3SessionBase> Sessions { get; set; } = new();
    }
}
