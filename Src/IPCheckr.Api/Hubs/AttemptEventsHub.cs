using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace IPCheckr.Api.Hubs
{
    [Authorize]
    public class AttemptEventsHub : Hub
    {
        public Task SubscribeAssignmentGroup(string assignmentGroupType, int assignmentGroupId)
        {
            var groupName = $"assignment-group:{assignmentGroupType}:{assignmentGroupId}";
            return Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        }

        public Task UnsubscribeAssignmentGroup(string assignmentGroupType, int assignmentGroupId)
        {
            var groupName = $"assignment-group:{assignmentGroupType}:{assignmentGroupId}";
            return Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        }

        public Task SubscribeAssignment(string assignmentGroupType, int assignmentId)
        {
            var groupName = $"assignment:{assignmentGroupType}:{assignmentId}";
            return Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        }

        public Task UnsubscribeAssignment(string assignmentGroupType, int assignmentId)
        {
            var groupName = $"assignment:{assignmentGroupType}:{assignmentId}";
            return Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        }
    }
}