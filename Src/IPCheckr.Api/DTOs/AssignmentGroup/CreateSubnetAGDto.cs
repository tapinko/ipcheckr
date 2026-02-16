using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class CreateSubnetAGReq : CreateAGBaseReq
    {

        [Range(1, int.MaxValue, ErrorMessage = "Number of records must be a positive integer.")]
        [Required(ErrorMessage = "Number of records is required.")]
        public int NumberOfRecords { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        [Required(ErrorMessage = "Assignment IP category is required.")]
        public required AssignmentGroupIpCat IpCat { get; set; }
    }

    public class CreateSubnetAGRes : CreateAGBaseRes
    {
    }
}