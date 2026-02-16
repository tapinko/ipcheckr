using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class QueryIDNetAssignmentDataForSubmitReq : QueryAssignmentDataForSubmitBaseReq
    {
    }
    
    public class QueryIDNetAssignmentDataForSubmitRes : QueryAssignmentDataForSubmitBaseRes
    {
        [Required]
        public required string[] Addresses { get; set; }

        [Required]
        public required bool TestWildcard { get; set; }

        [Required]
        public required bool TestFirstLastBr { get; set; }
    }
}