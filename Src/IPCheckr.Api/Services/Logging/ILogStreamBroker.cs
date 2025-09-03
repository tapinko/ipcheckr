using System.Threading.Channels;
using IPCheckr.Api.DTOs.Dashboard;

namespace IPCheckr.Api.Services.Logging
{
    public interface ILogStreamBroker
    {
        (Guid Id, ChannelReader<StreamLogsRes> Reader) Subscribe();
        void Unsubscribe(Guid id);
        void Publish(StreamLogsRes entry);
    }
}