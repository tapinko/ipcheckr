using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class QueryAssignmentGroupsReq : QueryAGsBaseReq
    {
    }

    public class QueryAssignmentGroupsRes : QueryAGsBaseRes
    {
        [Required]
        public required AssignmentGroupDto[] AssignmentGroups { get; set; }
    }

    public class AssignmentGroupDto : AGBaseDto
    {
        [Required]
        public double? SuccessRate { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupIpCat? IpCat { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupHostSortStrategy? HostSortStrategy { get; set; }

        public bool? TestWildcard { get; set; }

        public bool? TestFirstLastBr { get; set; }
    }
}