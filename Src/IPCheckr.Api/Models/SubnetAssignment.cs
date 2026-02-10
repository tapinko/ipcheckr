using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPCheckr.Api.Models
{
    [Table("SubnetAssignments")]
    public class SubnetAssignment : AssignmentAuditBase
    {
        public required SubnetAG AssignmentGroup { get; set; }

        public required User Student { get; set; }

        public required string Cidr { get; set; }

        public required int[] Hosts { get; set; }
    }
}