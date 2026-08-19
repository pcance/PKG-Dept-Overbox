using System.Text.Json;
using System.IO;
using OverboxFinder.Desktop.Models;

namespace OverboxFinder.Desktop.Services;

public sealed class AppSettingsService
{
    private readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };

    public string SettingsFilePath { get; }

    public AppSettingsService()
    {
        var appDataRoot = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var settingsDirectory = Path.Combine(appDataRoot, "OverboxFinder");
        SettingsFilePath = Path.Combine(settingsDirectory, "appsettings.json");
    }

    public AppSettings Load()
    {
        if (!File.Exists(SettingsFilePath))
        {
            var defaults = AppSettings.Default();
            Save(defaults);
            return defaults;
        }

        try
        {
            var json = File.ReadAllText(SettingsFilePath);
            var loaded = JsonSerializer.Deserialize<AppSettings>(json);
            if (loaded is null)
            {
                var defaults = AppSettings.Default();
                Save(defaults);
                return defaults;
            }

            return loaded;
        }
        catch
        {
            var defaults = AppSettings.Default();
            Save(defaults);
            return defaults;
        }
    }

    public void Save(AppSettings settings)
    {
        var settingsDirectory = Path.GetDirectoryName(SettingsFilePath);
        if (!string.IsNullOrWhiteSpace(settingsDirectory))
        {
            Directory.CreateDirectory(settingsDirectory);
        }

        var json = JsonSerializer.Serialize(settings, _jsonOptions);
        File.WriteAllText(SettingsFilePath, json);
    }
}
