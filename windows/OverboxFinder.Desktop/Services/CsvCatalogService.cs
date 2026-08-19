using System.IO;
using System.Linq;
using OverboxFinder.Desktop.Models;

namespace OverboxFinder.Desktop.Services;

public sealed class CsvCatalogService
{
    private sealed record CsvFileDefinition(string LogicalName, string CacheFileName, params string[] SourceCandidates);

    private static readonly IReadOnlyList<CsvFileDefinition> CatalogFiles =
    [
        new("Outside Dimensions", "Outside_Dimensions.csv", "Outside_Dimensions.csv"),
        new("Penang Cartons", "Penang_Cartons.csv", "Penang_Cartons.csv"),
        new("Debrecen Cartons", "debrecen_cartons.csv", "debrecen_cartons.csv", "Debrecen_Cartons.csv"),
        new("Global Cartons", "Global_Cartons.csv", "Global_Cartons.csv", "Global_Cartons.CSV")
    ];

    private readonly AppSettings _settings;

    public CsvCatalogService(AppSettings settings)
    {
        _settings = settings;
    }

    public IReadOnlyList<CsvFileStatus> GetStatus()
    {
        return CatalogFiles.Select(GetStatusForFile).ToList();
    }

    public IReadOnlyList<CsvFileStatus> RefreshLocalCache()
    {
        var statuses = new List<CsvFileStatus>();
        Directory.CreateDirectory(_settings.LocalCacheFolder);

        foreach (var file in CatalogFiles)
        {
            var sourcePath = ResolveSourcePath(file);
            var cachePath = Path.Combine(_settings.LocalCacheFolder, file.CacheFileName);

            if (sourcePath is null)
            {
                statuses.Add(new CsvFileStatus
                {
                    LogicalFile = file.LogicalName,
                    Status = "Missing source",
                    SourcePath = "(not found)",
                    CachePath = cachePath,
                    CacheModifiedUtc = GetCacheLastWrite(cachePath)
                });
                continue;
            }

            var shouldCopy = ShouldCopy(sourcePath, cachePath);
            if (shouldCopy)
            {
                File.Copy(sourcePath, cachePath, overwrite: true);
            }

            statuses.Add(new CsvFileStatus
            {
                LogicalFile = file.LogicalName,
                Status = shouldCopy ? "Updated cache" : "Up to date",
                SourcePath = sourcePath,
                CachePath = cachePath,
                CacheModifiedUtc = GetCacheLastWrite(cachePath)
            });
        }

        return statuses;
    }

    private CsvFileStatus GetStatusForFile(CsvFileDefinition file)
    {
        var sourcePath = ResolveSourcePath(file);
        var cachePath = Path.Combine(_settings.LocalCacheFolder, file.CacheFileName);

        string status;
        if (sourcePath is null)
        {
            status = File.Exists(cachePath) ? "Using cached copy" : "Missing source";
        }
        else if (!File.Exists(cachePath))
        {
            status = "Cache missing (refresh needed)";
        }
        else
        {
            status = ShouldCopy(sourcePath, cachePath)
                ? "Source newer (refresh needed)"
                : "Up to date";
        }

        return new CsvFileStatus
        {
            LogicalFile = file.LogicalName,
            Status = status,
            SourcePath = sourcePath ?? "(not found)",
            CachePath = cachePath,
            CacheModifiedUtc = GetCacheLastWrite(cachePath)
        };
    }

    private string? ResolveSourcePath(CsvFileDefinition file)
    {
        if (string.IsNullOrWhiteSpace(_settings.CsvSourceFolder) || !Directory.Exists(_settings.CsvSourceFolder))
        {
            return null;
        }

        foreach (var candidate in file.SourceCandidates)
        {
            var fullPath = Path.Combine(_settings.CsvSourceFolder, candidate);
            if (File.Exists(fullPath))
            {
                return fullPath;
            }
        }

        return null;
    }

    private static bool ShouldCopy(string sourcePath, string cachePath)
    {
        if (!File.Exists(cachePath))
        {
            return true;
        }

        var sourceInfo = new FileInfo(sourcePath);
        var cacheInfo = new FileInfo(cachePath);

        return sourceInfo.Length != cacheInfo.Length
            || sourceInfo.LastWriteTimeUtc > cacheInfo.LastWriteTimeUtc;
    }

    private static string GetCacheLastWrite(string cachePath)
    {
        if (!File.Exists(cachePath))
        {
            return "-";
        }

        var utc = File.GetLastWriteTimeUtc(cachePath);
        return utc.ToString("yyyy-MM-dd HH:mm:ss 'UTC'");
    }
}
