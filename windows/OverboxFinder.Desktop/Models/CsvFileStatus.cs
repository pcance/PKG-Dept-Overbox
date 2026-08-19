namespace OverboxFinder.Desktop.Models;

public sealed class CsvFileStatus
{
    public required string LogicalFile { get; init; }
    public required string Status { get; init; }
    public required string SourcePath { get; init; }
    public required string CachePath { get; init; }
    public string CacheModifiedUtc { get; init; } = "-";
}
