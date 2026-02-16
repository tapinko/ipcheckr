using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class QueryIDNetAGsReq : QueryAGsBaseReq
    {
    }

    public class QueryIDNetAGsRes : QueryAGsBaseRes
    {
        [Required]
        public required IDNetAGDto[] AssignmentGroups { get; set; }
    }

    public class IDNetAGDto : AGBaseDto
    {
        [Required]
        public double SuccessRate { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupIpCat IpCat { get; set; }

        public bool TestWildcard { get; set; }

        public bool TestFirstLastBr { get; set; }
    }
}