using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace IPCheckr.Api.Services.Realtime
{
    public class AttemptEventsPublisher : IAttemptEventsPublisher
    {
        private readonly IHubContext<AttemptEventsHub> _hubContext;

        public AttemptEventsPublisher(IHubContext<AttemptEventsHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task PublishAttemptChangedAsync(AssignmentGroupType assignmentGroupType, int assignmentGroupId, int assignmentId, int studentId, AssignmentSubmissionAttemptStatus status)
        {
            var payload = new
            {
                assignmentGroupType,
                assignmentGroupId,
                assignmentId,
                studentId,
                status,
                occurredAt = DateTime.UtcNow
            };

            var groupType = assignmentGroupType.ToString();
            var assignmentGroupChannel = $"assignment-group:{groupType}:{assignmentGroupId}";
            var assignmentChannel = $"assignment:{groupType}:{assignmentId}";

            await _hubContext.Clients.Group(assignmentGroupChannel).SendAsync("AttemptChanged", payload);
            await _hubContext.Clients.Group(assignmentChannel).SendAsync("AttemptChanged", payload);
        }
    }
}