using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Models
{
    [Table("IDNetAGs")]
    public class IDNetAG : AssignmentGroupAuditBase
    {
        public required AssignmentGroupIpCat AssignmentIpCat { get; set; }

        public required int NumberOfRecords { get; set; }

        public int PossibleOctets { get; set; }

        public bool TestWildcard { get; set; }

        public bool TestFirstLastBr { get; set; }
    }
}