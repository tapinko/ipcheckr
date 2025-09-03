using System.Collections.Concurrent;
using System.Threading.Channels;
using IPCheckr.Api.DTOs.Dashboard;

namespace IPCheckr.Api.Services.Logging
{
    public class LogStreamBroker : ILogStreamBroker
    {
        private readonly ConcurrentDictionary<Guid, Channel<StreamLogsRes>> _subscribers = new();

        public (Guid Id, ChannelReader<StreamLogsRes> Reader) Subscribe()
        {
            var id = Guid.NewGuid();
            var channel = Channel.CreateUnbounded<StreamLogsRes>(new UnboundedChannelOptions
            {
                SingleReader = false,
                SingleWriter = false,
                AllowSynchronousContinuations = false
            });

            _subscribers[id] = channel;
            return (id, channel.Reader);
        }

        public void Unsubscribe(Guid id)
        {
            if (_subscribers.TryRemove(id, out var channel))
            {
                channel.Writer.TryComplete();
            }
        }

        public void Publish(StreamLogsRes entry)
        {
            foreach (var kvp in _subscribers)
            {
                kvp.Value.Writer.TryWrite(entry);
            }
        }
    }
}