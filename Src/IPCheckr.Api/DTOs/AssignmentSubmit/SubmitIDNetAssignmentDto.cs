using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class SubmitIDNetAssignmentReq : SubmitAssignmentBaseReq
    {
        public SubmitIDNetAssignmentField[]? Data { get; set; }
    }

    public class SubmitIDNetAssignmentField
    {
        public string? IDNet { get; set; }

        public string? Wildcard { get; set; }

        public string? FirstUsable { get; set; }

        public string? LastUsable { get; set; }

        public string? Broadcast { get; set; }
    }

    public class SubmitIDNetAssignmentRes : SubmitAssignmentBaseRes
    {
    }
}