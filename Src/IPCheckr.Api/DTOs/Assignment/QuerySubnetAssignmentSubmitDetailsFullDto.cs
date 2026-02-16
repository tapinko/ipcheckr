using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.Assignment
{
    public class QuerySubnetAssignmentSubmitDetailsFullReq : QueryAssignmentSubmitDetailsFullBaseReq
    {
    }

    public class QuerySubnetAssignmentSubmitDetailsFullRes : QueryAssignmentSubmitDetailsFullBaseRes
    {
        [Required]
        public required QuerySubnetAssignmentSubmitDetailsFullRecordField[] Results { get; set; }

        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public required AssignmentGroupIpCat IpCat { get; set; }

        [Required]
        public double SuccessRate { get; set; }
    }

    public class QuerySubnetAssignmentSubmitDetailsFullRecordField
    {
        [Required]
        public int Hosts { get; set; }

        [Required]
        public required QuerySubnetAssignmentSubmitDetailsFullAnswerField Network { get; set; }

        [Required]
        public required QuerySubnetAssignmentSubmitDetailsFullAnswerField FirstUsable { get; set; }

        [Required]
        public required QuerySubnetAssignmentSubmitDetailsFullAnswerField LastUsable { get; set; }

        [Required]
        public required QuerySubnetAssignmentSubmitDetailsFullAnswerField Broadcast { get; set; }
    }

    public class QuerySubnetAssignmentSubmitDetailsFullAnswerField
    {
        public string? Submitted { get; set; }
        
        [Required]
        public required string Correct { get; set; }
    }
}