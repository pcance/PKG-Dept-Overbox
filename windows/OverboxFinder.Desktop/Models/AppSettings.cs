using System.IO;

namespace OverboxFinder.Desktop.Models;

public sealed record AppSettings(
    string SharePointFolderUrl,
    string CsvSourceFolder,
    string LocalCacheFolder)
{
    public static AppSettings Default()
    {
        var appDataRoot = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var defaultCache = Path.Combine(appDataRoot, "OverboxFinder", "csv-cache");

        return new AppSettings(
            "https://emerson.sharepoint.com/sites/TM-Packaging/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FTM%2DPackaging%2FShared%20Documents%2FReference%20Material%2FBox%20Dimensions&viewid=a9b76a31%2D3107%2D424f%2Dbc71%2D7020813488c8",
            string.Empty,
            defaultCache);
    }
}
