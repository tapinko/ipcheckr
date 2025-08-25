using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class QueryAssignmentDataForSubmitReq
    {
        [Required(ErrorMessage = "Assignment ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Assignment ID must be a positive integer.")]
        public int AssignmentId { get; set; }
    }
    public class QueryAssignmentDataForSubmitRes
    {
        [Required]
        public required int[] HostsPerNetwork { get; set; }

        [Required]
        public required string Cidr { get; set; }

        [Required]
        public required bool IsAvailableForSubmission { get; set; }
    }
}