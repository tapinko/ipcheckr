using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class QuerySubnetAGsReq : QueryAGsBaseReq
    {
    }

    public class QuerySubnetAGsRes : QueryAGsBaseRes
    {
        [Required]
        public required SubnetAGDto[] AssignmentGroups { get; set; }
    }

    public class SubnetAGDto : AGBaseDto
    {
        [Required]
        public double SuccessRate { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupIpCat IpCat { get; set; }
    }
}