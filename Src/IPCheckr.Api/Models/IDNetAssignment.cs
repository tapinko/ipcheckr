using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPCheckr.Api.Models
{
    [Table("IDNetAssignments")]
    public class IDNetAssignment : AssignmentAuditBase
    {
        public required IDNetAG AssignmentGroup { get; set; }

        public required User Student { get; set; }

        public required string[] Addresses { get; set; }
    }
}