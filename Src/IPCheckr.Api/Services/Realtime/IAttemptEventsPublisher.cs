using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Services.Realtime
{
    public interface IAttemptEventsPublisher
    {
        Task PublishAttemptChangedAsync(
            AssignmentGroupType assignmentGroupType,
            int assignmentGroupId,
            int assignmentId,
            int studentId,
            AssignmentSubmissionAttemptStatus status
        );
    }
}