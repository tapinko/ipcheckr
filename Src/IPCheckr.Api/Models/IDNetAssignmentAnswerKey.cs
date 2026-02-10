using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPCheckr.Api.Models
{
    [Table("IDNetAssignmentAnswerKeys")]
    public class IDNetAssignmentAnswerKey : AssignmentAuditBase
    {
        public required IDNetAssignment Assignment { get; set; }

        public required string[] IDNet { get; set; }

        public required string[] Wildcards { get; set; }

        public required string[] FirstUsables { get; set; }

        public required string[] LastUsables { get; set; }

        public required string[] Broadcasts { get; set; }
    }
}