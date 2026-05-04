using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AGTemplate
{
    public class AGTemplateDto
    {
        public int Id { get; set; }

        public required string Name { get; set; }

        public string? AGName { get; set; }

        public string? AGDescription { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupType Type { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupIpCat IpCat { get; set; }

        public int NumberOfRecords { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupDifficulty? Difficulty { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public AssignmentGroupHostSortStrategy? HostSortStrategy { get; set; }

        public int? PossibleOctets { get; set; }

        public bool TestWildcard { get; set; }

        public bool TestFirstLastBr { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class QueryAGTemplatesRes
    {
        public required AGTemplateDto[] Templates { get; set; }
    }
}