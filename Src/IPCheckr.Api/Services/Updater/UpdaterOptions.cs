namespace IPCheckr.Api.Services.Updater;

public class UpdaterOptions
{
    public bool Enabled { get; set; } = false;
    public string Host { get; set; } = "host.docker.internal";
    public int Port { get; set; } = 6770;
    public int TimeoutSeconds { get; set; } = 300;
}