using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AGTemplate
{
    public class CreateAGTemplateReq
    {
        [Required(ErrorMessage = "Template name is required.")]
        [MaxLength(100, ErrorMessage = "Template name cannot exceed 100 characters.")]
        public required string Name { get; set; }

        [MaxLength(100, ErrorMessage = "AG name cannot exceed 100 characters.")]
        public string? AGName { get; set; }

        [MaxLength(500, ErrorMessage = "AG description cannot exceed 500 characters.")]
        public string? AGDescription { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        [Required(ErrorMessage = "Type is required.")]
        public required AssignmentGroupType Type { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        [Required(ErrorMessage = "IP category is required.")]
        public required AssignmentGroupIpCat IpCat { get; set; }

        [Range(1, 12, ErrorMessage = "Number of records must be between 1 and 12.")]
        [Required(ErrorMessage = "Number of records is required.")]
        public int NumberOfRecords { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupDifficulty? Difficulty { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupHostSortStrategy? HostSortStrategy { get; set; }

        [Range(1, 4, ErrorMessage = "Possible octets must be between 1 and 4.")]
        public int? PossibleOctets { get; set; }

        public bool TestWildcard { get; set; }

        public bool TestFirstLastBr { get; set; }
    }

    public class CreateAGTemplateRes
    {
        public int TemplateId { get; set; }
    }
}