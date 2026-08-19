using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Windows;
using OverboxFinder.Desktop.Models;
using OverboxFinder.Desktop.Services;

namespace OverboxFinder.Desktop;

public partial class MainWindow : Window
{
    private readonly AppSettingsService _settingsService;
    private AppSettings _settings;
    private CsvCatalogService _csvCatalogService;

    public ObservableCollection<CsvFileStatus> CsvStatuses { get; } = [];

    public MainWindow()
    {
        InitializeComponent();

        DataContext = this;

        _settingsService = new AppSettingsService();
        _settings = _settingsService.Load();
        _csvCatalogService = new CsvCatalogService(_settings);

        LoadSettingsIntoFields();
        RefreshStatusGrid();
        StatusTextBlock.Text = "WPF preview ready. Configure source folder and refresh local cache.";
    }

    private void SaveSettings_Click(object sender, RoutedEventArgs e)
    {
        ApplyFieldValuesToSettings();
        _settingsService.Save(_settings);
        _csvCatalogService = new CsvCatalogService(_settings);
        RefreshStatusGrid();
        StatusTextBlock.Text = "Settings saved.";
    }

    private void RefreshCache_Click(object sender, RoutedEventArgs e)
    {
        ApplyFieldValuesToSettings();
        _settingsService.Save(_settings);
        _csvCatalogService = new CsvCatalogService(_settings);

        var refreshed = _csvCatalogService.RefreshLocalCache();
        ReplaceStatuses(refreshed);

        var updated = refreshed.Count(x => x.Status == "Updated cache");
        var missing = refreshed.Count(x => x.Status == "Missing source");
        StatusTextBlock.Text = $"Cache refresh complete. Updated: {updated}, Missing source: {missing}.";
    }

    private void OpenCacheFolder_Click(object sender, RoutedEventArgs e)
    {
        ApplyFieldValuesToSettings();

        try
        {
            Directory.CreateDirectory(_settings.LocalCacheFolder);
            Process.Start(new ProcessStartInfo
            {
                FileName = _settings.LocalCacheFolder,
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            StatusTextBlock.Text = $"Unable to open cache folder: {ex.Message}";
        }
    }

    private void LoadSettingsIntoFields()
    {
        SharePointUrlTextBox.Text = _settings.SharePointFolderUrl;
        SourceFolderTextBox.Text = _settings.CsvSourceFolder;
        CacheFolderTextBox.Text = _settings.LocalCacheFolder;
    }

    private void ApplyFieldValuesToSettings()
    {
        _settings = _settings with
        {
            SharePointFolderUrl = SharePointUrlTextBox.Text.Trim(),
            CsvSourceFolder = SourceFolderTextBox.Text.Trim(),
            LocalCacheFolder = CacheFolderTextBox.Text.Trim()
        };
    }

    private void RefreshStatusGrid()
    {
        ReplaceStatuses(_csvCatalogService.GetStatus());
    }

    private void ReplaceStatuses(IEnumerable<CsvFileStatus> statuses)
    {
        CsvStatuses.Clear();
        foreach (var status in statuses)
        {
            CsvStatuses.Add(status);
        }
    }
}
