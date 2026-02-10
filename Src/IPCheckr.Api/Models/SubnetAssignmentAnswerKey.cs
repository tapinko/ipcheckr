using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPCheckr.Api.Models
{
    [Table("SubnetAssignmentAnswerKeys")]
    public class SubnetAssignmentAnswerKey : AssignmentAuditBase
    {
        public required SubnetAssignment Assignment { get; set; }

        public required string[] Networks { get; set; }

        public required string[] FirstUsables { get; set; }

        public required string[] LastUsables { get; set; }

        public required string[] Broadcasts { get; set; }
    }
}