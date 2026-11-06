using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using FigurePlay.Desktop.Bridge;
using FigurePlay.Desktop.SelfTest;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop
{
    /// <summary>页面 console.error / 未捕获异常记录。</summary>
    internal sealed class ConsoleErrorRecord
    {
        public string Level { get; set; }

        public string Message { get; set; }

        public string Source { get; set; }
    }

    /// <summary>
    /// 主窗口：WebView2 外壳 + JS↔Host 桥。
    /// </summary>
    internal sealed class MainForm : Form
    {
        /// <summary>虚拟主机域名（映射到 dist\wwwroot）。</summary>
        internal const string VirtualHostName = "figureplay.local";

        /// <summary>虚拟主机 URL：安全上下文，利于 IndexedDB / Clipboard API。</summary>
        internal const string AppUrl = "https://figureplay.local/index.html";

        private readonly AppOptions _options;
        private readonly ClipboardService _clipboardService = new ClipboardService();
        private readonly FigImportService _figImportService = new FigImportService();
        private readonly VectorPdfService _vectorPdfService = new VectorPdfService();
        private readonly WebView2 _webView;
        private readonly string _wwwroot;
        private readonly string _userDataFolder;
        private readonly ConfigProfileStore _configProfileStore;
        private readonly List<ConsoleErrorRecord> _consoleErrors = new List<ConsoleErrorRecord>();
        private readonly List<string> _hostErrors = new List<string>();
        private readonly TaskCompletionSource<bool> _navigationTcs =
            new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);

        private SelfTestRunner _selfTest;
        private bool _selfTestStarted;
        private bool _hostReadySent;
        private bool _prewarmStarted;
        private bool _closing;
        private bool _startupFailed;

        public MainForm(AppOptions options)
        {
            _options = options ?? throw new ArgumentNullException("options");
            _wwwroot = AppPaths.WwwRoot;
            _userDataFolder = options.SelfTest ? AppPaths.SelfTestUserDataFolder : AppPaths.UserDataFolder;
            _configProfileStore = new ConfigProfileStore(options.SelfTest, options.OutDir);

            SuspendLayout();
            Text = Program.WindowTitle;
            Icon = AppPaths.LoadAppIcon();
            StartPosition = FormStartPosition.CenterScreen;
            // 1600x1000 物理像素：本机 150% 缩放下 CSS 视口约 1067x667，
            // 高于网页版 <=1100px 的三栏紧凑断点、低于 <=900px 的堆叠断点，保证桌面版默认三栏。
            ClientSize = new Size(1600, 1000);
            MinimumSize = new Size(1180, 700);
            BackColor = Color.FromArgb(244, 246, 250);
            AutoScaleMode = AutoScaleMode.Dpi;
            DoubleBuffered = true;
            KeyPreview = true;

            if (options.SelfTest)
            {
                // 自测模式：离屏启动，避免打扰使用者；截图前会临时移到屏幕内。
                ShowInTaskbar = false;
                StartPosition = FormStartPosition.Manual;
                Location = new Point(-32000, -32000);
            }

            _webView = new WebView2
            {
                Dock = DockStyle.Fill,
                DefaultBackgroundColor = Color.FromArgb(244, 246, 250),
            };
            Controls.Add(_webView);
            ResumeLayout(false);
            PerformLayout();

            Load += OnLoadAsync;
            FormClosing += OnFormClosing;
            FormClosed += OnFormClosed;
            KeyDown += OnKeyDown;
        }

        internal int ExitCode { get; private set; } = 1;

        internal AppOptions Options
        {
            get { return _options; }
        }

        internal WebView2 WebView
        {
            get { return _webView; }
        }

        internal string WwwRoot
        {
            get { return _wwwroot; }
        }

        internal string UserDataFolder
        {
            get { return _userDataFolder; }
        }

        internal IReadOnlyList<ConsoleErrorRecord> ConsoleErrors
        {
            get { return _consoleErrors; }
        }

        internal IReadOnlyList<string> HostErrors
        {
            get { return _hostErrors; }
        }

        internal bool HostReadySent
        {
            get { return _hostReadySent; }
        }

        internal string LastNavigationError { get; private set; }

        internal Task<bool> NavigationCompletion
        {
            get { return _navigationTcs.Task; }
        }

        internal void AddHostError(string message)
        {
            if (!string.IsNullOrEmpty(message))
            {
                _hostErrors.Add(message);
            }
        }

        // ---------------------------------------------------------------- 初始化

        private async void OnLoadAsync(object sender, EventArgs e)
        {
            try
            {
                if (_options.SelfTest)
                {
                    _selfTest = new SelfTestRunner(this);
                }

                await InitializeWebViewAsync();
            }
            catch (Exception ex)
            {
                LastNavigationError = ex.Message;
                _startupFailed = true;
                _navigationTcs.TrySetResult(false);
                AddHostError("启动失败：" + ex);

                if (_options.SelfTest)
                {
                    SelfTestRunner.WriteStartupFailure(_options, ex);
                    FinishSelfTest(1);
                }
                else
                {
                    MessageBox.Show(
                        this,
                        "FigurePlay 桌面版启动失败。\r\n\r\n" + ex.Message + "\r\n\r\n" +
                        "如果提示缺少 WebView2 Runtime，请先安装 Microsoft Edge WebView2 Runtime：\r\n" +
                        "https://go.microsoft.com/fwlink/p/?LinkId=2124703",
                        Program.WindowTitle,
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                    FinishSelfTest(1);
                }
            }
        }

        private async Task InitializeWebViewAsync()
        {
            if (!Directory.Exists(_wwwroot))
            {
                throw new DirectoryNotFoundException(
                    "找不到网页应用目录：" + _wwwroot + "\r\n" +
                    "请从 desktop\\dist 目录运行 FigurePlay.exe，或先重新执行 build.ps1。");
            }

            Directory.CreateDirectory(_userDataFolder);

            CoreWebView2EnvironmentOptions environmentOptions = new CoreWebView2EnvironmentOptions();
            if (_options.SelfTest)
            {
                // 离屏窗口可能被 Chromium 判定为被遮挡而暂停渲染，自测时关闭遮挡计算，
                // 保证 CapturePreview 能截到真实画面。
                environmentOptions.AdditionalBrowserArguments = "--disable-features=CalculateNativeWinOcclusion";
            }

            CoreWebView2Environment environment =
                await CoreWebView2Environment.CreateAsync(null, _userDataFolder, environmentOptions);
            await _webView.EnsureCoreWebView2Async(environment);

            CoreWebView2 core = _webView.CoreWebView2;
            if (core == null)
            {
                throw new InvalidOperationException("WebView2 初始化失败（CoreWebView2 为空）。");
            }

            core.Settings.AreDefaultContextMenusEnabled = true;
            core.Settings.AreDevToolsEnabled = true;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.IsZoomControlEnabled = false;
            core.Settings.AreBrowserAcceleratorKeysEnabled = true;
            core.Settings.IsPasswordAutosaveEnabled = false;
            core.Settings.IsGeneralAutofillEnabled = false;
            core.Settings.IsSwipeNavigationEnabled = false;
            core.Settings.IsPinchZoomEnabled = false;

            core.SetVirtualHostNameToFolderMapping(
                VirtualHostName,
                _wwwroot,
                CoreWebView2HostResourceAccessKind.Allow);

            core.WebMessageReceived += OnWebMessageReceived;
            core.NavigationCompleted += OnNavigationCompleted;
            core.NewWindowRequested += OnNewWindowRequested;
            core.ProcessFailed += OnProcessFailed;

            if (_options.SelfTest)
            {
                try
                {
                    await core.AddScriptToExecuteOnDocumentCreatedAsync(
                        SelfTestRunner.DocumentCreatedProbeScript);
                }
                catch (Exception ex)
                {
                    AddHostError("注入自测探针失败：" + ex.Message);
                }
            }

            core.Navigate(AppUrl);
        }

        // ---------------------------------------------------------------- 事件

        private async void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            if (_closing)
            {
                return;
            }

            JObject message = BridgeProtocol.ParseHostMessage(e.WebMessageAsJson);
            if (message == null)
            {
                return;
            }

            string type = message.Value<string>("type") ?? string.Empty;
            if (string.Equals(type, BridgeProtocol.TypeReadClipboardImage, StringComparison.Ordinal))
            {
                string requestId = message.Value<string>("requestId") ?? string.Empty;
                ClipboardImageResult result;
                try
                {
                    result = await ConvertClipboardImageAsync();
                }
                catch (Exception ex)
                {
                    result = ClipboardImageResult.Fail(ClipboardService.DescribeFailure(ex));
                }

                string json = result.Ok
                    ? BridgeProtocol.BuildClipboardImageSuccess(
                        requestId,
                        result.DataUrl,
                        result.Width,
                        result.Height,
                        result.SourceFormat,
                        result.EmfBytes != null && result.EmfBytes.Length > 0
                            ? Convert.ToBase64String(result.EmfBytes)
                            : null)
                    : BridgeProtocol.BuildClipboardImageError(requestId, result.Error);
                PostJsonToJs(json);
            }
            else if (string.Equals(type, BridgeProtocol.TypeImportFig, StringComparison.Ordinal))
            {
                string requestId = message.Value<string>("requestId") ?? string.Empty;
                string filename = message.Value<string>("filename") ?? string.Empty;
                string base64 = message.Value<string>("base64") ?? string.Empty;

                FigImportResult result;
                try
                {
                    result = await ImportFigAsync(base64, filename);
                }
                catch (Exception ex)
                {
                    result = FigImportResult.Fail(FigImportService.DescribeFailure(ex));
                }

                string json = result.Ok
                    ? BridgeProtocol.BuildFigImportedSuccess(
                        requestId,
                        result.DataUrl,
                        result.Width,
                        result.Height,
                        result.SourceFormat,
                        result.ConvertMs,
                        result.MatlabVersion,
                        result.EmfBytes != null && result.EmfBytes.Length > 0
                            ? Convert.ToBase64String(result.EmfBytes)
                            : null)
                    : BridgeProtocol.BuildFigImportedError(requestId, result.Error);
                PostJsonToJs(json);
            }
            else if (string.Equals(type, BridgeProtocol.TypeExportVectorPdf, StringComparison.Ordinal))
            {
                string requestId = message.Value<string>("requestId") ?? string.Empty;
                VectorPdfResult result;
                try
                {
                    result = await _vectorPdfService.ExportAsync(message["spec"] as JObject);
                }
                catch (Exception ex)
                {
                    result = VectorPdfResult.Fail("矢量 PDF 导出失败：" + ex.Message);
                }

                string json = result.Ok
                    ? BridgeProtocol.BuildVectorPdfSuccess(
                        requestId,
                        Convert.ToBase64String(result.PdfBytes),
                        result.PdfBytes.Length,
                        result.Engine,
                        result.VectorPanels,
                        result.RasterPanels,
                        result.Diagnostics)
                    : BridgeProtocol.BuildVectorPdfError(requestId, result.Error);
                PostJsonToJs(json);
            }
            else if (string.Equals(type, BridgeProtocol.TypeLoadConfigProfiles, StringComparison.Ordinal))
            {
                string requestId = message.Value<string>("requestId") ?? string.Empty;
                JArray profiles;
                bool exists;
                string error;
                bool ok = _configProfileStore.Load(out profiles, out exists, out error);
                string json = ok
                    ? BridgeProtocol.BuildConfigProfilesSuccess(
                        requestId,
                        profiles,
                        _configProfileStore.ProfilesPath,
                        exists)
                    : BridgeProtocol.BuildConfigProfilesError(requestId, error);
                PostJsonToJs(json);
            }
            else if (string.Equals(type, BridgeProtocol.TypeSaveConfigProfiles, StringComparison.Ordinal))
            {
                string requestId = message.Value<string>("requestId") ?? string.Empty;
                string backupPath;
                int bytes;
                string error;
                bool ok;
                try
                {
                    ok = _configProfileStore.Save(message["profiles"], out backupPath, out bytes, out error);
                }
                catch (Exception ex)
                {
                    ok = false;
                    backupPath = null;
                    bytes = 0;
                    error = "保存本机配置异常：" + ex.Message;
                }

                string json = ok
                    ? BridgeProtocol.BuildConfigProfilesSavedSuccess(
                        requestId,
                        _configProfileStore.ProfilesPath,
                        backupPath,
                        bytes)
                    : BridgeProtocol.BuildConfigProfilesSavedError(requestId, error);
                PostJsonToJs(json);
            }
            else if (string.Equals(type, "app-ready", StringComparison.Ordinal))
            {
                // 网页端桥（js/desktop.js）加载完成，立即回 host-ready，避免与轮询产生竞态。
                SendHostReady();
            }
            else
            {
                Debug.WriteLine("[FigurePlay] 未处理的宿主消息类型：" + type);
            }
        }

        private void OnNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            bool success = e.IsSuccess;
            _navigationTcs.TrySetResult(success);

            if (!success)
            {
                LastNavigationError = "导航失败：" + e.WebErrorStatus;
                AddHostError(LastNavigationError);
                if (_options.SelfTest)
                {
                    if (_selfTest != null && !_selfTestStarted)
                    {
                        _selfTestStarted = true;
                        _ = _selfTest.RunAsync();
                    }
                }
                else
                {
                    BeginInvoke(new Action(() =>
                    {
                        MessageBox.Show(
                            this,
                            "无法加载内置页面（" + e.WebErrorStatus + "）。\r\n" +
                            "请确认 dist\\wwwroot 目录完整，然后重新启动 FigurePlay。",
                            Program.WindowTitle,
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error);
                    }));
                }

                return;
            }

            _ = SendHostReadyWhenAppIsReadyAsync();

            if (_options.SelfTest && !_selfTestStarted && _selfTest != null)
            {
                _selfTestStarted = true;
                _ = _selfTest.RunAsync();
            }
        }

        private void OnNewWindowRequested(object sender, CoreWebView2NewWindowRequestedEventArgs e)
        {
            try
            {
                e.Handled = true;
                Uri uri = new Uri(e.Uri);
                if (string.Equals(uri.Host, VirtualHostName, StringComparison.OrdinalIgnoreCase))
                {
                    CoreWebView2 core = _webView.CoreWebView2;
                    if (core != null)
                    {
                        core.Navigate(e.Uri);
                    }

                    return;
                }

                if (uri.Scheme == Uri.UriSchemeHttp ||
                    uri.Scheme == Uri.UriSchemeHttps ||
                    string.Equals(uri.Scheme, "mailto", StringComparison.OrdinalIgnoreCase))
                {
                    Process.Start(new ProcessStartInfo(e.Uri) { UseShellExecute = true });
                }
            }
            catch (Exception ex)
            {
                AddHostError("处理新窗口请求失败：" + ex.Message);
            }
        }

        private void OnProcessFailed(object sender, CoreWebView2ProcessFailedEventArgs e)
        {
            string detail = "WebView2 进程异常：" + e.ProcessFailedKind + "，reason=" + e.Reason +
                            "，exitCode=" + e.ExitCode;
            AddHostError(detail);
            if (_options.SelfTest)
            {
                return;
            }

            try
            {
                BeginInvoke(new Action(() =>
                {
                    MessageBox.Show(
                        this,
                        "网页渲染进程异常退出，窗口可能需要重新打开。\r\n\r\n" + detail,
                        Program.WindowTitle,
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning);
                }));
            }
            catch
            {
                // ignore
            }
        }

        private void OnFormClosing(object sender, FormClosingEventArgs e)
        {
            _closing = true;
        }

        private void OnFormClosed(object sender, FormClosedEventArgs e)
        {
            _navigationTcs.TrySetResult(false);

            // 正常模式用户关闭窗口视为正常退出（exit code 0）；启动失败保持 1。
            if (!_options.SelfTest && !_startupFailed)
            {
                ExitCode = 0;
            }

            try
            {
                _webView.Dispose();
            }
            catch
            {
                // ignore
            }

            _clipboardService.Dispose();
            _figImportService.Dispose();
            _vectorPdfService.Dispose();
        }

        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.F5)
            {
                try
                {
                    CoreWebView2 core = _webView.CoreWebView2;
                    if (core != null)
                    {
                        core.Reload();
                    }
                }
                catch
                {
                    // ignore
                }

                e.Handled = true;
            }
        }

        // ---------------------------------------------------------------- host-ready

        private async Task SendHostReadyWhenAppIsReadyAsync()
        {
            Stopwatch stopwatch = Stopwatch.StartNew();
            while (!_closing && !_hostReadySent && stopwatch.Elapsed < TimeSpan.FromSeconds(20))
            {
                try
                {
                    bool ready = await EvalBoolAsync("!!(window.__FIGPLAY__ && window.__FIGPLAY__.ready)");
                    if (ready)
                    {
                        SendHostReady();
                        return;
                    }
                }
                catch
                {
                    // 页面可能仍在加载，继续轮询
                }

                await Task.Delay(200);
            }

            if (!_closing && !_hostReadySent)
            {
                SendHostReady();
            }
        }

        private void SendHostReady()
        {
            if (_hostReadySent)
            {
                return;
            }

            _hostReadySent = true;
            PostJsonToJs(BridgeProtocol.BuildHostReady());

            // v1.3.3：主窗口就绪后延迟 1.5s 后台预热 PowerPoint（不显示窗口、不创建演示文稿）。
            if (!_options.SelfTest && !_prewarmStarted)
            {
                _prewarmStarted = true;
                Task.Run(async () =>
                {
                    try
                    {
                        await Task.Delay(1500);
                        if (!_closing)
                        {
                            VectorPdfService.PrewarmSharedSession();
                        }
                    }
                    catch
                    {
                        // 预热失败静默
                    }
                });
            }
        }

        // ---------------------------------------------------------------- 能力方法

        /// <summary>Host→JS：发送 JSON 字符串（协议约定）。</summary>
        internal void PostJsonToJs(string json)
        {
            if (string.IsNullOrEmpty(json) || _closing)
            {
                return;
            }

            try
            {
                CoreWebView2 core = _webView.CoreWebView2;
                if (core == null)
                {
                    return;
                }

                core.PostWebMessageAsString(json);
            }
            catch (Exception ex)
            {
                AddHostError("向网页发送消息失败：" + ex.Message);
            }
        }

        internal Task<ClipboardImageResult> ConvertClipboardImageAsync()
        {
            return _clipboardService.ConvertAsync();
        }

        /// <summary>MATLAB .fig 导入（后台线程 + 串行化，MATLAB 启动可能需要 10–120s）。</summary>
        internal Task<FigImportResult> ImportFigAsync(string base64, string filename)
        {
            return _figImportService.ImportAsync(base64, filename);
        }

        internal async Task<string> EvalStringAsync(string script)
        {
            JToken token = await EvalJsonAsync(script);
            if (token == null || token.Type == JTokenType.Null)
            {
                return null;
            }

            if (token.Type == JTokenType.String)
            {
                return token.Value<string>();
            }

            return token.ToString();
        }

        internal async Task<bool> EvalBoolAsync(string script)
        {
            JToken token = await EvalJsonAsync(script);
            if (token == null)
            {
                return false;
            }

            try
            {
                return token.Value<bool>();
            }
            catch
            {
                return string.Equals(token.ToString(), "true", StringComparison.OrdinalIgnoreCase);
            }
        }

        internal async Task<JToken> EvalJsonAsync(string script)
        {
            CoreWebView2 core = _webView.CoreWebView2;
            if (core == null)
            {
                return null;
            }

            string raw;
            try
            {
                raw = await core.ExecuteScriptAsync(script);
            }
            catch (Exception ex)
            {
                AddHostError("执行网页脚本失败：" + ex.Message);
                return null;
            }

            if (string.IsNullOrEmpty(raw))
            {
                return null;
            }

            try
            {
                return JToken.Parse(raw);
            }
            catch
            {
                return null;
            }
        }

        /// <summary>自测截图前把离屏窗口临时移到屏幕内，确保渲染不被系统挂起。</summary>
        internal void PrepareForScreenshot()
        {
            if (!_options.SelfTest)
            {
                return;
            }

            try
            {
                Rectangle area = Screen.PrimaryScreen.WorkingArea;
                int width = Math.Min(Width, Math.Max(400, area.Width - 80));
                int height = Math.Min(Height, Math.Max(300, area.Height - 80));
                StartPosition = FormStartPosition.Manual;
                WindowState = FormWindowState.Normal;
                SetBounds(
                    area.Left + Math.Max(0, (area.Width - width) / 2),
                    area.Top + Math.Max(0, (area.Height - height) / 2),
                    width,
                    height);
                TopMost = true;
                Show();
                Activate();
                BringToFront();
            }
            catch
            {
                // ignore
            }
        }

        #region 未使用的 WebView2 console 事件占位（SDK 不提供 console 事件，自测用 JS 探针收集）
        // WebView2 SDK 1.0.4314.x 的 CoreWebView2 没有 ConsoleMessageReceived 事件，
        // 因此自测通过 AddScriptToExecuteOnDocumentCreatedAsync 注入
        // window.__figplayConsoleErrors 探针来收集 console.error / 未捕获异常。
        #endregion

        internal void FinishSelfTest(int exitCode)
        {
            ExitCode = exitCode;
            try
            {
                if (IsDisposed)
                {
                    return;
                }

                if (InvokeRequired)
                {
                    BeginInvoke(new Action(() =>
                    {
                        ExitCode = exitCode;
                        Close();
                    }));
                }
                else
                {
                    Close();
                }
            }
            catch
            {
                // ignore
            }
        }
    }
}
