using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.AssignmentSubmit
{
    public class SubmitSubnetAssignmentReq : SubmitAssignmentBaseReq
    {
        public SubmitSubnetAssignmentField[]? Data { get; set; }
    }

    public class SubmitSubnetAssignmentField
    {
        public string? Network { get; set; } = null;

        public string? FirstUsable { get; set; } = null;

        public string? LastUsable { get; set; } = null;

        public string? Broadcast { get; set; } = null;
    }

    public class SubmitSubnetAssignmentRes : SubmitAssignmentBaseRes
    {
    }
}