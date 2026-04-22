using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class EditSubnetAGReq : EditAGBaseReq
    {
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupHostSortStrategy? HostSortStrategy { get; set; }
    }
}