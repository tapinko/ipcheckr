using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.Assignment
{
    public class QuerySubnetAssignmentsReq : QueryAssignmentsBaseReq
    {
    }

    public class QuerySubnetAssignmentsRes : QueryAssignmentsBaseRes
    {
        [Required]
        public required SubnetAssignmentDto[] Assignments { get; set; }
    }

    public class SubnetAssignmentDto : AssignmentDto
    {
        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupIpCat IpCat { get; set; }

        public double? SuccessRate { get; set; }
    }
}