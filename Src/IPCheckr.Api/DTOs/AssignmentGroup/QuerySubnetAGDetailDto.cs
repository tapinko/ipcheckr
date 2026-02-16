using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class QuerySubnetAGDetailReq
    {
        [Required(ErrorMessage = "Assignment Group ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "ID must be a positive integer.")]
        public int Id { get; set; }
    }

    public class QuerySubnetAGDetailRes : SubnetAGDto
    {
        [Required]
        public required SubnetAGSubmitDetailsDto[] Assignments { get; set; }
    }
    public class SubnetAGSubmitDetailsDto : AGSubmitDetailsBaseDto
    {
    }
}