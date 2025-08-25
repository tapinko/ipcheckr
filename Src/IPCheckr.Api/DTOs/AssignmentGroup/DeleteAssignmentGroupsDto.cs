using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.AssignmentGroup
{
    public class DeleteAssignmentGroupsReq
    {
        [Required(ErrorMessage = "Assignment Group IDs are required.")]
        [MinLength(1, ErrorMessage = "At least one Assignment Group ID is required.")]
        [MaxLength(100, ErrorMessage = "Cannot delete more than 100 assignment groups at once.")]
        public required int[] AssignmentGroupIds { get; set; }
    }
}