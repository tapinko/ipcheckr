using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class QuerySubnetAssignmentDataForSubmitReq : QueryAssignmentDataForSubmitBaseReq
    {
    }

    public class QuerySubnetAssignmentDataForSubmitRes : QueryAssignmentDataForSubmitBaseRes
    {
        [Required]
        public required int[] HostsPerNetwork { get; set; }

        [Required]
        public required string Cidr { get; set; }
    }
}