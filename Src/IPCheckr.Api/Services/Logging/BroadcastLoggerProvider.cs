using IPCheckr.Api.DTOs.Dashboard;
using Microsoft.Extensions.Logging;

namespace IPCheckr.Api.Services.Logging
{
    public class BroadcastLoggerProvider : ILoggerProvider
    {
        private readonly ILogStreamBroker _broker;

        public BroadcastLoggerProvider(ILogStreamBroker broker)
        {
            _broker = broker;
        }

        public ILogger CreateLogger(string categoryName) => new BroadcastLogger(categoryName, _broker);

        public void Dispose() { }

        private sealed class BroadcastLogger : ILogger
        {
            private readonly string _categoryName;
            private readonly ILogStreamBroker _broker;

            public BroadcastLogger(string categoryName, ILogStreamBroker broker)
            {
                _categoryName = categoryName;
                _broker = broker;
            }

            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => default!;

            public bool IsEnabled(LogLevel logLevel) => logLevel != LogLevel.None;

            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            {
                if (!IsEnabled(logLevel)) return;

                var message = formatter(state, exception);

                var entry = new StreamLogsRes
                {
                    TimestampUtc = DateTime.UtcNow,
                    Category = _categoryName,
                    Level = logLevel.ToString(),
                    EventId = eventId.Id,
                    Message = message,
                    Exception = exception?.ToString()
                };

                _broker.Publish(entry);
            }
        }
    }
}