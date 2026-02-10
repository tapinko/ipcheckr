using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Models
{
    [Table("SubnetAGs")]
    public class SubnetAG : AssignmentGroupAuditBase
    {
        public required int NumberOfRecords { get; set; }
        public required AssignmentGroupIpCat AssignmentIpCat { get; set; }
    }
}