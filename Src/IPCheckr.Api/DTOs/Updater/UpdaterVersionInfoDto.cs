namespace IPCheckr.Api.DTOs.Updater;

public class VersionEntry
{
    public string? Version { get; set; }
    public string? Branch { get; set; }
}

public class UpdaterVersionInfoDto
{
    public VersionEntry? Current { get; set; }
    public VersionEntry? Latest { get; set; }
    public bool UpdateAvailable { get; set; }
    public bool UpdaterEnabled { get; set; }
}

public class UpdaterVersionInfoRes : UpdaterVersionInfoDto { }