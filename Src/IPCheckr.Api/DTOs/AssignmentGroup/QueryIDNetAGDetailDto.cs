using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class QueryIDNetAGDetailReq
    {
        [Required(ErrorMessage = "Assignment Group ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "ID must be a positive integer.")]
        public int Id { get; set; }
    }

    public class QueryIDNetAGDetailRes : IDNetAGDto
    {
        [Required]
        public required IDNetAGSubmitDetailsDto[] Assignments { get; set; }
    }
    public class IDNetAGSubmitDetailsDto : AGSubmitDetailsBaseDto
    {
    }
}