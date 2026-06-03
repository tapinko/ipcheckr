using System.Net.Sockets;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using IPCheckr.Api.DTOs.Updater;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace IPCheckr.Api.Services.Updater;

public interface IUpdaterService
{
    Task<UpdaterVersionInfoDto> GetVersionInfoAsync(CancellationToken ct);
    IAsyncEnumerable<string> StreamUpdateAsync(CancellationToken ct);
}

public class UpdaterService : IUpdaterService
{
    private const string GithubOwner = "tapinko";
    private const string GithubRepo = "ipcheckr";
    private const string CacheKey = "updater:latest-release";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    private readonly UpdaterOptions _options;
    private readonly IMemoryCache _cache;
    private readonly IHttpClientFactory _http;

    public UpdaterService(IOptions<UpdaterOptions> options, IMemoryCache cache, IHttpClientFactory http)
    {
        _options = options.Value;
        _cache = cache;
        _http = http;
    }

    public async Task<UpdaterVersionInfoDto> GetVersionInfoAsync(CancellationToken ct)
    {
        var current = Environment.GetEnvironmentVariable("APP_VERSION") ?? "dev";
        var currentBranch = VersionToBranch(current);

        string? latest = null;
        try
        {
            latest = await GetLatestReleaseTagAsync(ct);
        }
        catch
        {
        }

        var updateAvailable = latest != null
            && !string.Equals(current, latest, StringComparison.OrdinalIgnoreCase)
            && current != "dev";

        return new UpdaterVersionInfoDto
        {
            Current = new VersionEntry { Version = current, Branch = currentBranch },
            Latest  = latest != null ? new VersionEntry { Version = latest, Branch = VersionToBranch(latest) } : null,
            UpdateAvailable = updateAvailable,
            UpdaterEnabled = _options.Enabled,
        };
    }

    public async IAsyncEnumerable<string> StreamUpdateAsync([EnumeratorCancellation] CancellationToken ct)
    {
        if (!_options.Enabled)
        {
            yield return "ERR updater-disabled";
            yield break;
        }

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

        TcpClient? client = null;
        string? connectError = null;
        try
        {
            client = new TcpClient();
            await client.ConnectAsync(_options.Host, _options.Port, cts.Token);
        }
        catch (Exception ex)
        {
            client?.Dispose();
            connectError = ex.Message;
        }

        if (connectError != null)
        {
            yield return $"ERR connect-failed: {connectError}";
            yield break;
        }

        using (client!)
        using (var stream = client.GetStream())
        using (var writer = new StreamWriter(stream, Encoding.UTF8, leaveOpen: true) { AutoFlush = true })
        using (var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true))
        {
            await writer.WriteLineAsync("update");

            while (true)
            {
                string? line = null;
                bool timeout = false;
                bool connectionReset = false;

                try
                {
                    line = await reader.ReadLineAsync(cts.Token);
                }
                catch (OperationCanceledException)
                {
                    timeout = true;
                }
                catch (IOException)
                {
                    // container was killed mid-stream — expected during self-update
                    connectionReset = true;
                }

                if (timeout)
                {
                    yield return "ERR timeout";
                    yield break;
                }

                if (connectionReset || line == null)
                    yield break;

                yield return line;

                if (line.StartsWith("OK ", StringComparison.Ordinal) || line.StartsWith("ERR ", StringComparison.Ordinal))
                    yield break;
            }
        }
    }

    private async Task<string?> GetLatestReleaseTagAsync(CancellationToken ct)
    {
        if (_cache.TryGetValue(CacheKey, out string? cached))
            return cached;

        using var client = _http.CreateClient("github");
        using var resp = await client.GetAsync(
            $"https://api.github.com/repos/{GithubOwner}/{GithubRepo}/releases/latest", ct);

        if (!resp.IsSuccessStatusCode)
            return null;

        using var doc = await JsonDocument.ParseAsync(await resp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        var tag = doc.RootElement.GetProperty("tag_name").GetString();

        _cache.Set(CacheKey, tag, CacheTtl);
        return tag;
    }

    private static string VersionToBranch(string version)
    {
        if (string.IsNullOrWhiteSpace(version) || version == "dev")
            return "master";
        return $"release/{version}";
    }
}