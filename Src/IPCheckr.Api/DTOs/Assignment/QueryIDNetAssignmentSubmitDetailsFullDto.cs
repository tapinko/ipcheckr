using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.Assignment
{
    public class QueryIDNetAssignmentSubmitDetailsFullReq : QueryAssignmentSubmitDetailsFullBaseReq
    {
    }

    public class QueryIDNetAssignmentSubmitDetailsFullRes : QueryAssignmentSubmitDetailsFullBaseRes
    {
        [Required]
        public required QueryIDNetAssignmentSubmitDetailsFullRecordField[] Results { get; set; }

        [Required]
        public bool TestWildcard { get; set; }

        [Required]
        public bool TestFirstLastBr { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public required AssignmentGroupIpCat IpCat { get; set; }

        [Required]
        public double SuccessRate { get; set; }
    }

    public class QueryIDNetAssignmentSubmitDetailsFullRecordField
    {
        [Required]
        public required string Address { get; set; }

        [Required]
        public required QueryIDNetAssignmentSubmitDetailsFullAnswerField IDNet { get; set; }

        [Required]
        public required QueryIDNetAssignmentSubmitDetailsFullAnswerField Wildcard { get; set; }
        
        [Required]
        public required QueryIDNetAssignmentSubmitDetailsFullAnswerField FirstUsable { get; set; }

        [Required]
        public required QueryIDNetAssignmentSubmitDetailsFullAnswerField LastUsable { get; set; }

        [Required]
        public required QueryIDNetAssignmentSubmitDetailsFullAnswerField Broadcast { get; set; }
    }

    public class QueryIDNetAssignmentSubmitDetailsFullAnswerField
    {
        public string? Submitted { get; set; }
        
        [Required]
        public required string Correct { get; set; }
    }
}