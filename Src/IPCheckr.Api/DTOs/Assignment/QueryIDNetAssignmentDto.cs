using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.Assignment
{
    public class QueryIDNetAssignmentsReq : QueryAssignmentsBaseReq
    {
    }

    public class QueryIDNetAssignmentsRes : QueryAssignmentsBaseRes
    {
        [Required]
        public required IDNetAssignmentDto[] Assignments { get; set; }
    }

    public class IDNetAssignmentDto : AssignmentDto
    {
        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupIpCat IpCat { get; set; }

        public double? SuccessRate { get; set; }
    }
}