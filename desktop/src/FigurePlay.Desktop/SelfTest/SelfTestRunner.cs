using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using FigurePlay.Desktop.Bridge;
using Microsoft.Web.WebView2.Core;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>
    /// --selftest 自测流程：
    ///   1. 离屏窗口加载应用，等待 window.__FIGPLAY__.ready（并收集 console error 探针数据）；
    ///   2. 生成测试 EMF 并按 MATLAB Copy Figure 的方式放入剪贴板；
    ///   3. 调用桥所用 C# 转换函数验证 PNG（尺寸 / 非空 / 签名 / sourceFormat）；
    ///   4. 用 JS↔Host 真实消息通道跑一遍端到端桥测试（验证 postMessage 收发与 host-ready）；
    ///   5. CapturePreview 截图；
    ///   6. 写 JSON 日志并以 0/1 退出。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private int[] _powerPointPidsAtStart = new int[0];

        /// <summary>
        /// 在页面创建时注入的探针：捕获宿主消息、console.error、未捕获异常、未处理的 Promise rejection。
        /// （WebView2 SDK 1.0.4314.x 的 CoreWebView2 未提供 ConsoleMessageReceived 事件，故用探针实现。）
        /// </summary>
        internal const string DocumentCreatedProbeScript = @"
(function () {
  try {
    window.__figplayHostMessages = [];
    window.__figplayConsoleErrors = [];
    window.__figplayCapture = function (data) {
      try { window.__figplayHostMessages.push(data); } catch (e) {}
    };
    if (window.chrome && window.chrome.webview && window.chrome.webview.addEventListener) {
      window.chrome.webview.addEventListener('message', function (ev) {
        window.__figplayCapture(ev.data);
      });
    }
    var push = function (level, args) {
      try {
        var parts = [];
        for (var i = 0; i < args.length; i++) {
          var a = args[i];
          parts.push(a && a.stack ? String(a.stack) : String(a));
        }
        window.__figplayConsoleErrors.push({ level: level, message: parts.join(' '), ts: Date.now() });
      } catch (e) {}
    };
    var originalError = console.error;
    console.error = function () {
      push('error', arguments);
      try { return originalError.apply(console, arguments); } catch (e) {}
    };
    window.addEventListener('error', function (ev) {
      try {
        window.__figplayConsoleErrors.push({
          level: 'uncaught',
          message: String(ev.message || ''),
          source: String(ev.filename || ''),
          line: ev.lineno || 0,
          ts: Date.now()
        });
      } catch (e) {}
    });
    window.addEventListener('unhandledrejection', function (ev) {
      try {
        var reason = ev.reason;
        window.__figplayConsoleErrors.push({
          level: 'unhandledrejection',
          message: String(reason && reason.stack ? reason.stack : reason),
          ts: Date.now()
        });
      } catch (e) {}
    });
  } catch (e) {}
})();
";

        private readonly MainForm _form;
        private readonly AppOptions _options;
        private readonly Stopwatch _clock = new Stopwatch();
        private readonly JObject _report = new JObject();
        private bool _started;

        internal SelfTestRunner(MainForm form)
        {
            _form = form ?? throw new ArgumentNullException("form");
            _options = form.Options;
        }

        // ---------------------------------------------------------------- 入口

        internal async Task RunAsync()
        {
            if (_started)
            {
                return;
            }

            _started = true;
            _clock.Start();
            int exitCode = 1;

            try
            {
                Directory.CreateDirectory(_options.OutDir);
                FillEnvironment();

                bool navigated = await WaitWithTimeout(
                    _form.NavigationCompletion,
                    TimeSpan.FromSeconds(60),
                    false);

                _report["navigation"] = new JObject
                {
                    ["url"] = MainForm.AppUrl,
                    ["completed"] = navigated,
                    ["error"] = _form.LastNavigationError,
                };

                if (!navigated)
                {
                    throw new InvalidOperationException(
                        "页面导航未完成或失败：" + (_form.LastNavigationError ?? "60 秒超时"));
                }

                // 1) 等待应用就绪
                JObject app = await WaitForAppReadyAsync(TimeSpan.FromSeconds(60));
                _report["app"] = app;
                if (!app.Value<bool>("ready"))
                {
                    // 应用未就绪时也收集 console 错误，便于区分“应用源正在编辑”与宿主问题
                    JObject earlyConsole = await CollectConsoleErrorsAsync();
                    _report["console"] = earlyConsole;
                    StringBuilder earlyErrors = new StringBuilder();
                    JArray earlyArray = earlyConsole["errors"] as JArray;
                    if (earlyArray != null)
                    {
                        for (int i = 0; i < earlyArray.Count; i++)
                        {
                            earlyErrors.Append(" [").Append(i + 1).Append("] ")
                                .Append(earlyArray[i].ToString());
                        }
                    }

                    throw new InvalidOperationException(
                        "应用未就绪：window.__FIGPLAY__.ready 在 60 秒内未变为 true。" +
                        (earlyErrors.Length > 0 ? " JS 错误：" + earlyErrors : string.Empty));
                }

                // 1.1) 桌面窗口布局回归：默认窗口下必须保持三栏（左设置栏 / 中间预览 / 右编号栏），
                //      不能因高 DPI 下 CSS 视口变窄而触发网页的移动端堆叠断点。
                JObject layout = await CheckDesktopLayoutAsync();
                _report["layout"] = layout;

                // 2) 剪贴板 EMF → PNG
                JObject clipboard = await RunClipboardConversionTestAsync();
                _report["clipboardEmf"] = clipboard;

                // 3) JS↔Host 端到端桥测试（原始 postMessage 通道）
                JObject bridge = await RunBridgeEndToEndTestAsync();
                _report["bridgeE2E"] = bridge;

                // 3.1) 应用自身 JS 桥（js/desktop.js 的 FP.desktop.readClipboardImage）端到端测试
                JObject appBridge = await RunAppDesktopApiTestAsync();
                _report["appDesktopApi"] = appBridge;

                // 3.2) MATLAB .fig 真实往返测试（MATLAB 不可用时记录 skipped，不视为失败）
                JObject matlabFig = await RunMatlabFigTestAsync();
                _report["matlabFig"] = matlabFig;

                // 3.2.5) 应用级矢量 PDF 端到端：JS 注入 .fig → cell.emfBase64 → exportVectorPdfBase64()
                JObject appVectorE2E = await RunAppVectorE2EAsync();
                _report["appVectorE2E"] = appVectorE2E;

                // 3.2.6) v1.3.4 外观主题冒烟（深色/主题色 + PNG 导出不受影响）
                JObject appearanceSmoke = await RunAppearanceSmokeTestAsync();
                _report["appearanceSmoke"] = appearanceSmoke;

                // 3.3) PowerPoint 矢量 PDF 真实往返测试（真实 MATLAB EMF 或真实 Metafile）
                JObject vectorPdf = await RunVectorPdfTestAsync();
                _report["vectorPdf"] = vectorPdf;

                // 3.4) WebView2 文件保存 API 能力探测（Lead 侧 showSaveFilePicker 兜底判断）
                JObject saveFilePicker = await CheckSaveFilePickerAsync();
                _report["saveFilePicker"] = saveFilePicker;

                // 4) host-ready 确认
                JObject hostReady = await CheckHostReadyAsync(TimeSpan.FromSeconds(10));
                _report["hostReady"] = hostReady;

                // 5) 截图
                JObject screenshot = await CaptureScreenshotAsync();
                _report["screenshot"] = screenshot;

                // 6) console error / 未捕获异常
                JObject console = await CollectConsoleErrorsAsync();
                _report["console"] = console;

                // 6.1) v1.4.1 用户 config1 场景：编号 WYSIWYG 垂直/水平位置
                JObject config1Label = await RunConfig1LabelWysiwygTestAsync();
                _report["config1Label"] = config1Label;

                // v1.3.3/1.4.1：所有 PowerPoint 用例（含 config1 编号导出）完成后再统一 shutdown 并检查残留
                JObject powerPointLifecycle = await RunPowerPointLifecycleCheckAsync();
                _report["powerPointLifecycle"] = powerPointLifecycle;

                // 7) 汇总
                List<string> failures = new List<string>();
                if (!clipboard.Value<bool>("ok"))
                {
                    failures.Add("剪贴板 EMF → PNG 转换失败：" + (clipboard.Value<string>("error") ?? "未知原因"));
                }

                if (!bridge.Value<bool>("ok"))
                {
                    failures.Add("JS↔Host 桥端到端测试失败：" + (bridge.Value<string>("error") ?? "未知原因"));
                }

                if (!appBridge.Value<bool>("ok"))
                {
                    failures.Add("应用 JS 桥（FP.desktop.readClipboardImage）测试失败：" +
                                 (appBridge.Value<string>("error") ?? "未知原因"));
                }

                if (!layout.Value<bool>("ok"))
                {
                    failures.Add("桌面窗口布局未保持三栏：" + (layout.Value<string>("error") ?? "未知原因"));
                }

                bool matlabFigAvailable = matlabFig.Value<bool>("available");
                if (matlabFigAvailable && !matlabFig.Value<bool>("ok"))
                {
                    failures.Add("MATLAB .fig 导入测试失败：" +
                                 (matlabFig.Value<string>("error") ?? "未知原因"));
                }

                bool vectorPdfAvailable = vectorPdf.Value<bool>("available");
                if (vectorPdfAvailable && !vectorPdf.Value<bool>("ok"))
                {
                    failures.Add("PowerPoint 矢量 PDF 导出测试失败：" +
                                 (vectorPdf.Value<string>("error") ?? "未知原因"));
                }

                bool powerPointLifecycleOk = _report["powerPointLifecycle"] is JObject &&
                                             ((JObject)_report["powerPointLifecycle"]).Value<bool>("ok");
                if (!powerPointLifecycleOk)
                {
                    JObject lifecycle = _report["powerPointLifecycle"] as JObject;
                    failures.Add("PowerPoint 持久会话生命周期检查失败：" +
                                 (lifecycle == null ? "未生成报告" : (lifecycle.Value<string>("error") ?? "未知原因")));
                }

                bool appearanceSmokeOk = _report["appearanceSmoke"] is JObject &&
                                              ((JObject)_report["appearanceSmoke"]).Value<bool>("ok");
                if (!appearanceSmokeOk)
                {
                    JObject smoke = _report["appearanceSmoke"] as JObject;
                    failures.Add("外观主题冒烟失败：" +
                                 (smoke == null ? "未生成报告" : (smoke.Value<string>("error") ?? "未知原因")));
                }

                bool appVectorAvailable = appVectorE2E.Value<bool>("available");
                if (appVectorAvailable && !appVectorE2E.Value<bool>("ok"))
                {
                    failures.Add("应用级矢量 PDF E2E 失败：" +
                                 (appVectorE2E.Value<string>("error") ?? "未知原因"));
                }

                if (!hostReady.Value<bool>("receivedByJs"))
                {
                    failures.Add("host-ready 未被网页端收到（JS 监听器未捕获到消息）。");
                }
                else
                {
                    string hostReadyVersion = hostReady.Value<string>("version");
                    if (!string.Equals(hostReadyVersion, BridgeProtocol.HostVersion, StringComparison.Ordinal))
                    {
                        failures.Add(
                            "host-ready 版本不匹配：期望 " + BridgeProtocol.HostVersion +
                            "，实际 " + (hostReadyVersion ?? "null") + "。");
                    }
                }

                if (!screenshot.Value<bool>("ok"))
                {
                    failures.Add("窗口截图失败：" + (screenshot.Value<string>("error") ?? "未知原因"));
                }

                bool config1LabelOk = _report["config1Label"] is JObject &&
                                      ((JObject)_report["config1Label"]).Value<bool>("ok");
                if (!config1LabelOk)
                {
                    JObject cfg = _report["config1Label"] as JObject;
                    failures.Add("config1 编号 WYSIWYG 测试失败：" +
                                 (cfg == null ? "未生成报告" : (cfg.Value<string>("error") ?? "未知原因")));
                }

                int consoleErrorCount = console.Value<int>("errorCount");
                if (consoleErrorCount > 0)
                {
                    failures.Add("页面存在 " + consoleErrorCount + " 条 console error / 未捕获异常。");
                }

                if (_form.HostErrors.Count > 0)
                {
                    failures.Add("宿主侧记录了 " + _form.HostErrors.Count + " 条错误。");
                }

                if (failures.Count == 0)
                {
                    exitCode = 0;
                }
                else
                {
                    _report["failures"] = new JArray(failures);
                }
            }
            catch (Exception ex)
            {
                _report["fatal"] = ex.ToString();
                _report["failures"] = new JArray(new object[] { "自测异常：" + ex.Message });
            }
            finally
            {
                // 兜底：即使中途失败也显式关闭自己启动的 PowerPoint，避免残留
                try
                {
                    VectorPdfService.ShutdownSharedSession();
                }
                catch
                {
                    // ignore
                }

                _clock.Stop();
                _report["success"] = exitCode == 0;
                _report["exitCode"] = exitCode;
                _report["durationMs"] = _clock.ElapsedMilliseconds;
                _report["finishedAt"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
                _report["hostErrors"] = new JArray(_form.HostErrors);

                string logPath = Path.Combine(_options.OutDir, "selftest-report.json");
                _report["logPath"] = logPath;
                try
                {
                    File.WriteAllText(logPath, _report.ToString(Formatting.Indented), new UTF8Encoding(false));
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine("写入自测日志失败：" + ex.Message);
                }

                WriteConsoleSummary(exitCode, logPath);
                _form.FinishSelfTest(exitCode);
            }
        }

        // ---------------------------------------------------------------- 各阶段

        private void FillEnvironment()
        {
            _powerPointPidsAtStart = PowerPointVectorExporter.SnapshotPowerPointPids();
            _report["tool"] = "FigurePlay Desktop selftest";
            _report["startedAt"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");

            JObject host = new JObject
            {
                ["hostVersion"] = BridgeProtocol.HostVersion,
                ["exePath"] = Application.ExecutablePath,
                ["exeFileVersion"] = Assembly.GetExecutingAssembly().GetName().Version.ToString(),
                ["processArch"] = Environment.Is64BitProcess ? "x64" : "x86",
                ["os"] = Environment.OSVersion.ToString(),
                ["clrVersion"] = Environment.Version.ToString(),
                ["is64BitOS"] = Environment.Is64BitOperatingSystem,
            };
            _report["host"] = host;

            JObject webview2 = new JObject();
            try
            {
                webview2["runtimeVersion"] = CoreWebView2Environment.GetAvailableBrowserVersionString();
            }
            catch (Exception ex)
            {
                webview2["runtimeVersionError"] = ex.Message;
            }

            webview2["userDataFolder"] = _form.UserDataFolder;
            webview2["wwwroot"] = _form.WwwRoot;
            _report["webview2"] = webview2;

            _report["options"] = new JObject
            {
                ["selfTest"] = true,
                ["outDir"] = _options.OutDir,
                ["screenshotPath"] = _options.ScreenshotPath,
            };
        }

        private async Task<JObject> WaitForAppReadyAsync(TimeSpan timeout)
        {
            Stopwatch stopwatch = Stopwatch.StartNew();
            bool ready = false;
            while (stopwatch.Elapsed < timeout)
            {
                try
                {
                    ready = await _form.EvalBoolAsync("!!(window.__FIGPLAY__ && window.__FIGPLAY__.ready)");
                }
                catch
                {
                    ready = false;
                }

                if (ready)
                {
                    break;
                }

                await Task.Delay(200);
            }

            JObject app = new JObject
            {
                ["ready"] = ready,
                ["readyWaitMs"] = stopwatch.ElapsedMilliseconds,
            };

            try
            {
                app["version"] = await _form.EvalStringAsync(
                    "(window.__FIGPLAY__ && window.__FIGPLAY__.version) || ''");
            }
            catch
            {
                app["version"] = null;
            }

            try
            {
                app["title"] = await _form.EvalStringAsync("document.title || ''");
            }
            catch
            {
                app["title"] = null;
            }

            try
            {
                app["location"] = await _form.EvalStringAsync("location.href || ''");
            }
            catch
            {
                app["location"] = null;
            }

            try
            {
                app["desktopBridge"] = await _form.EvalBoolAsync(
                    "!!(window.chrome && window.chrome.webview && window.chrome.webview.postMessage)");
            }
            catch
            {
                app["desktopBridge"] = false;
            }

            return app;
        }

        /// <summary>
        /// 桌面窗口布局回归检测。
        /// WebView2 的 CSS 视口 = 窗口物理像素 / 系统缩放，高 DPI 下可能变窄并触发网页的
        /// 移动端堆叠断点；这里在默认窗口尺寸下量测三栏几何，确保：
        ///   左设置栏 | 中间预览画布(#stage，宽 >= 250px) | 右编号栏 三栏并排、无横向溢出。
        /// </summary>
        private async Task<JObject> CheckDesktopLayoutAsync()
        {
            JObject result = new JObject();
            try
            {
                string script = "(function(){" +
                    " function rect(sel){ var el=document.querySelector(sel); if(!el) return null;" +
                    "   var r=el.getBoundingClientRect();" +
                    "   return {left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height}; }" +
                    " var app=document.querySelector('.app');" +
                    " var appStyle=app ? getComputedStyle(app) : null;" +
                    " return JSON.stringify({" +
                    "   viewport: { innerWidth: window.innerWidth, innerHeight: window.innerHeight," +
                    "     devicePixelRatio: window.devicePixelRatio," +
                    "     clientWidth: document.documentElement.clientWidth," +
                    "     scrollWidth: document.documentElement.scrollWidth }," +
                    "   appDisplay: appStyle ? appStyle.display : null," +
                    "   gridColumns: appStyle ? appStyle.gridTemplateColumns : null," +
                    "   left: rect('.panel-left'), stage: rect('#stage')," +
                    "   right: rect('.panel-right'), workspace: rect('.workspace')" +
                    " }); })()";

                string raw = await _form.EvalStringAsync(script);
                if (string.IsNullOrEmpty(raw))
                {
                    throw new InvalidOperationException("布局探针未返回数据。");
                }

                JObject metrics = JObject.Parse(raw);
                result["metrics"] = metrics;

                JObject viewport = metrics["viewport"] as JObject;
                JObject left = metrics["left"] as JObject;
                JObject stage = metrics["stage"] as JObject;
                JObject right = metrics["right"] as JObject;

                List<string> problems = new List<string>();
                if (left == null || stage == null || right == null)
                {
                    problems.Add("缺少三栏 DOM 节点（.panel-left / #stage / .panel-right）");
                }
                else
                {
                    double leftRight = left.Value<double>("right");
                    double leftBottom = left.Value<double>("bottom");
                    double stageLeft = stage.Value<double>("left");
                    double stageRight = stage.Value<double>("right");
                    double stageTop = stage.Value<double>("top");
                    double stageWidth = stage.Value<double>("width");
                    double rightLeft = right.Value<double>("left");

                    if (stageLeft < leftRight - 2)
                    {
                        problems.Add("预览区与左栏重叠");
                    }

                    if (rightLeft < stageRight - 2)
                    {
                        problems.Add("预览区与右栏重叠");
                    }

                    if (stageTop > leftBottom - 5)
                    {
                        problems.Add("预览区被堆叠到左栏下方（触发了网页移动端断点布局）");
                    }

                    if (stageWidth < 250)
                    {
                        problems.Add("中间预览画布宽度 " + Math.Round(stageWidth, 1) + "px < 250px");
                    }

                    if (left.Value<double>("width") < 100)
                    {
                        problems.Add("左栏宽度异常：" + Math.Round(left.Value<double>("width"), 1) + "px");
                    }

                    if (right.Value<double>("width") < 100)
                    {
                        problems.Add("右栏宽度异常：" + Math.Round(right.Value<double>("width"), 1) + "px");
                    }
                }

                if (viewport != null)
                {
                    double scrollWidth = viewport.Value<double>("scrollWidth");
                    double clientWidth = viewport.Value<double>("clientWidth");
                    if (scrollWidth > clientWidth + 2)
                    {
                        problems.Add("页面横向溢出（scrollWidth " + scrollWidth + " > clientWidth " + clientWidth + "）");
                    }
                }
                else
                {
                    problems.Add("布局探针未返回视口信息");
                }

                result["problems"] = new JArray(problems);
                result["ok"] = problems.Count == 0;
                if (problems.Count > 0)
                {
                    result["error"] = string.Join("；", problems);
                }
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = "布局检测失败：" + ex.Message;
            }

            return result;
        }

        /// <summary>
        /// 自测期间外部程序（用户复制等）可能覆盖剪贴板，导致后续桥测试误报“没有可识别的图像”。
        /// 在每次读剪贴板之前重新放置测试 EMF，保证 selftest 稳定。
        /// </summary>
        private bool RefreshTestEmfClipboard(out string error)
        {
            error = null;
            string emfPath = Path.Combine(_options.OutDir, "test-figure.emf");
            if (!File.Exists(emfPath))
            {
                error = "测试 EMF 文件不存在：" + emfPath;
                return false;
            }

            byte[] emfBytes = File.ReadAllBytes(emfPath);
            if (!EmfValidator.LooksLikeEmf(emfBytes))
            {
                error = "测试 EMF 文件不是真实 EMF。";
                return false;
            }

            return TestFigureFactory.PutEnhancedMetafileBytesOnClipboard(emfBytes, new List<string>(), out error);
        }

        private async Task<JObject> RunClipboardConversionTestAsync()
        {
            JObject result = new JObject();
            string emfPath = Path.Combine(_options.OutDir, "test-figure.emf");
            string pngPath = Path.Combine(_options.OutDir, "clipboard-test.png");
            List<string> diagnostics = new List<string>();
            Metafile metafile = null;

            try
            {
                // 1) 生成测试 EMF
                metafile = TestFigureFactory.CreateMetafile();
                long emfBytes = TestFigureFactory.SaveMetafile(metafile, emfPath);
                result["testEmfPath"] = emfPath;
                result["testEmfBytes"] = emfBytes;
                byte[] savedEmf = File.ReadAllBytes(emfPath);
                bool savedEmfReal = EmfValidator.LooksLikeEmf(savedEmf);
                result["testEmfIsRealEmf"] = savedEmfReal;
                result["testEmfHeader"] = EmfValidator.DescribeHeader(savedEmf);
                if (!savedEmfReal)
                {
                    throw new InvalidOperationException(
                        "测试 EMF 不是真正的 EMF（文件头 " + EmfValidator.DescribeHeader(savedEmf) +
                        "，应为 01 00 00 00；不能用 PNG 伪装）。");
                }
                diagnostics.Add("test-emf: " + emfBytes + " 字节 header=" + EmfValidator.DescribeHeader(savedEmf));

                // 2) 放到剪贴板（原生 CF_ENHMETAFILE；用字节重建句柄，避免 GetHenhmetafile 失效问题）
                string clipboardError;
                bool placed = TestFigureFactory.PutEnhancedMetafileBytesOnClipboard(
                    File.ReadAllBytes(emfPath),
                    diagnostics,
                    out clipboardError);
                result["placedOnClipboard"] = placed;
                if (!placed)
                {
                    throw new InvalidOperationException(clipboardError ?? "写入剪贴板失败。");
                }

                try
                {
                    result["clipboardFormats"] = new JArray(TestFigureFactory.GetClipboardFormats());
                }
                catch
                {
                    result["clipboardFormats"] = new JArray();
                }

                // 3) 走桥所使用的 C# 转换路径读取剪贴板并转 PNG
                Stopwatch stopwatch = Stopwatch.StartNew();
                ClipboardImageResult conversion = await _form.ConvertClipboardImageAsync();
                stopwatch.Stop();

                result["ok"] = conversion.Ok;
                result["sourceFormat"] = conversion.SourceFormat;
                result["width"] = conversion.Width;
                result["height"] = conversion.Height;
                result["pngBytes"] = conversion.PngBytes == null ? 0 : conversion.PngBytes.Length;
                result["dataUrlLength"] = conversion.DataUrl == null ? 0 : conversion.DataUrl.Length;
                result["convertMs"] = stopwatch.ElapsedMilliseconds;

                List<string> allDiagnostics = new List<string>(diagnostics);
                allDiagnostics.AddRange(conversion.Diagnostics);
                result["diagnostics"] = new JArray(allDiagnostics);

                if (!conversion.Ok)
                {
                    throw new InvalidOperationException(conversion.Error ?? "转换失败。");
                }

                // 4) 校验 PNG
                File.WriteAllBytes(pngPath, conversion.PngBytes);
                result["pngPath"] = pngPath;

                byte[] png = conversion.PngBytes;
                bool signatureOk = png.Length > 8 &&
                                   png[0] == 0x89 && png[1] == 0x50 && png[2] == 0x4E && png[3] == 0x47;
                result["pngSignatureOk"] = signatureOk;
                if (!signatureOk)
                {
                    throw new InvalidOperationException("生成的 PNG 签名不正确。");
                }

                if (conversion.Width < 4000 || conversion.Width > 5200)
                {
                    throw new InvalidOperationException(
                        "PNG 宽度不在要求的 4000–5200px 区间：" + conversion.Width + "px。");
                }

                if (conversion.Height < 100 || conversion.Height > 6000)
                {
                    throw new InvalidOperationException("PNG 高度异常：" + conversion.Height + "px。");
                }

                if (conversion.PngBytes.Length > 8 * 1024 * 1024)
                {
                    throw new InvalidOperationException(
                        "PNG 体积超过 8MB 上限：" + conversion.PngBytes.Length + " 字节。");
                }

                if (!string.Equals(conversion.SourceFormat, "EMF", StringComparison.Ordinal))
                {
                    throw new InvalidOperationException(
                        "sourceFormat 期望 EMF，实际为：" + conversion.SourceFormat);
                }

                using (Bitmap bitmap = new Bitmap(pngPath))
                {
                    using (MemoryStream pngStream = new MemoryStream(png))
                    using (Bitmap encoded = new Bitmap(pngStream))
                    {
                        if (encoded.Width != conversion.Width || encoded.Height != conversion.Height)
                        {
                            throw new InvalidOperationException(
                                "PNG 实际像素尺寸与返回字段不一致：" +
                                encoded.Width + "x" + encoded.Height + " vs " +
                                conversion.Width + "x" + conversion.Height);
                        }
                    }

                    result["pngNonBlank"] = IsNonBlank(bitmap);
                }

                result["ok"] = true;
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = ex.Message;
                result["diagnostics"] = new JArray(diagnostics);
            }
            finally
            {
                if (metafile != null)
                {
                    try
                    {
                        metafile.Dispose();
                    }
                    catch
                    {
                        // ignore
                    }
                }
            }

            return result;
        }

        private async Task<JObject> RunBridgeEndToEndTestAsync()
        {
            JObject result = new JObject();
            try
            {
                // 外部程序可能覆盖剪贴板：读之前重新放置测试 EMF
                string clipboardRefreshError;
                bool clipboardRefreshed = RefreshTestEmfClipboard(out clipboardRefreshError);
                result["clipboardRefreshed"] = clipboardRefreshed;
                if (!clipboardRefreshed)
                {
                    throw new InvalidOperationException(
                        "重新写入测试 EMF 到剪贴板失败：" + (clipboardRefreshError ?? "未知原因"));
                }

                string requestId = "selftest-e2e-" + DateTime.Now.Ticks;
                result["requestId"] = requestId;

                // 注意：不要清空 window.__figplayHostMessages —— host-ready 可能在更早时已经到达，
                // 端到端测试通过唯一的 requestId 定位本次响应即可。
                Stopwatch stopwatch = Stopwatch.StartNew();
                string jsPost = "(function(){ if (!window.chrome || !window.chrome.webview) { return 'no-webview'; }" +
                                " window.__figplayClipboardEmfB64 = '';" +
                                " window.chrome.webview.postMessage(JSON.stringify({ type: 'read-clipboard-image', requestId: " +
                                JsonConvert.ToString(requestId) + " })); return 'sent'; })()";
                string sent = await _form.EvalStringAsync(jsPost);
                result["sent"] = sent;
                if (!string.Equals(sent, "sent", StringComparison.Ordinal))
                {
                    throw new InvalidOperationException("window.chrome.webview 不可用：" + sent);
                }

                string probe = "(function(){ var a = window.__figplayHostMessages || [];" +
                               " for (var i = 0; i < a.length; i++) { var d = a[i];" +
                               "   try { var o = (typeof d === 'string') ? JSON.parse(d) : d;" +
                               "     if (o && o.type === 'clipboard-image' && o.requestId === " +
                               JsonConvert.ToString(requestId) + ") {" +
                               "       if (o.ok && o.emfBase64) { try { window.__figplayClipboardEmfB64 = String(o.emfBase64); } catch (e) {} }" +
                               "       return JSON.stringify({ found: true, ok: !!o.ok, width: o.width || 0," +
                               "         height: o.height || 0, sourceFormat: o.sourceFormat || ''," +
                               "         dataUrlLength: (o.dataUrl || '').length," +
                               "         dataUrlPrefix: String(o.dataUrl || '').substring(0, 30)," +
                               "         error: o.error || '', receivedType: typeof d," +
                               "         emfBase64Length: (o.emfBase64 || '').length }); } } catch (e) {} }" +
                               " return JSON.stringify({ found: false, count: a.length }); })()";

                JObject found = null;
                while (stopwatch.Elapsed < TimeSpan.FromSeconds(30))
                {
                    string raw = await _form.EvalStringAsync(probe);
                    if (!string.IsNullOrEmpty(raw))
                    {
                        found = JObject.Parse(raw);
                        if (found.Value<bool>("found"))
                        {
                            break;
                        }
                    }

                    await Task.Delay(100);
                }

                stopwatch.Stop();
                result["latencyMs"] = stopwatch.ElapsedMilliseconds;

                if (found == null || !found.Value<bool>("found"))
                {
                    throw new InvalidOperationException(
                        "网页端 30 秒内未收到 clipboard-image 响应（消息通道可能未工作）。");
                }

                result["response"] = found;
                bool ok = found.Value<bool>("ok");
                result["ok"] = ok;
                if (!ok)
                {
                    throw new InvalidOperationException("桥响应 ok=false：" + found.Value<string>("error"));
                }


                // 验证 emfBase64：必须是真实 EMF，能重新被 System.Drawing.Metafile 打开
                string emfBase64 = await _form.EvalStringAsync("window.__figplayClipboardEmfB64 || ''");
                result["emfBase64Length"] = string.IsNullOrEmpty(emfBase64) ? 0 : emfBase64.Length;
                if (string.IsNullOrEmpty(emfBase64))
                {
                    throw new InvalidOperationException("clipboard-image 响应缺少 emfBase64（真实 EMF 原始字节）。");
                }

                byte[] rawEmfBytes;
                try
                {
                    rawEmfBytes = Convert.FromBase64String(emfBase64);
                }
                catch (FormatException)
                {
                    throw new InvalidOperationException("clipboard-image 响应中的 emfBase64 不是有效 base64。");
                }

                bool emfHeaderOk = EmfValidator.LooksLikeEmf(rawEmfBytes);
                result["emfBytes"] = rawEmfBytes.Length;
                result["emfHeader"] = EmfValidator.DescribeHeader(rawEmfBytes);
                result["emfHeaderOk"] = emfHeaderOk;
                if (!emfHeaderOk)
                {
                    throw new InvalidOperationException(
                        "emfBase64 不是真实 EMF（文件头 " + EmfValidator.DescribeHeader(rawEmfBytes) +
                        "，应为 01 00 00 00）。");
                }

                string savedEmfPath = Path.Combine(_options.OutDir, "test-figure.emf");
                bool emfMatchesSaved = File.Exists(savedEmfPath) &&
                                       BytesEqual(rawEmfBytes, File.ReadAllBytes(savedEmfPath));
                result["emfMatchesSavedFile"] = emfMatchesSaved;

                int emfRecordCount = CountEmfRecords(rawEmfBytes);
                result["emfRecordCount"] = emfRecordCount;
                if (emfRecordCount < 3)
                {
                    throw new InvalidOperationException("emfBase64 的 EMF 记录数量异常：" + emfRecordCount);
                }

                using (MemoryStream emfStream = new MemoryStream(rawEmfBytes, false))
                using (Metafile emfMetafile = new Metafile(emfStream))
                {
                    MetafileHeader emfHeader = emfMetafile.GetMetafileHeader();
                    result["emfBounds"] = Math.Round((double)emfHeader.Bounds.Width, 1) + "x" +
                                          Math.Round((double)emfHeader.Bounds.Height, 1);
                    if (emfHeader.Bounds.Width <= 0 || emfHeader.Bounds.Height <= 0)
                    {
                        throw new InvalidOperationException("emfBase64 重新打开后边界无效。");
                    }
                }
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = ex.Message;
            }

            return result;
        }

        /// <summary>
        /// 走应用自身的 JS 桥（js/desktop.js 暴露的 FP.desktop.readClipboardImage）做端到端验证，
        /// 覆盖"网页端封装 → postMessage → 宿主转换 → Host→JS 回传 → 网页端 Promise resolve"完整链路。
        /// </summary>
        private async Task<JObject> RunAppDesktopApiTestAsync()
        {
            JObject result = new JObject();
            try
            {
                // 外部程序可能覆盖剪贴板：读之前重新放置测试 EMF
                string clipboardRefreshError;
                bool clipboardRefreshed = RefreshTestEmfClipboard(out clipboardRefreshError);
                result["clipboardRefreshed"] = clipboardRefreshed;
                if (!clipboardRefreshed)
                {
                    throw new InvalidOperationException(
                        "重新写入测试 EMF 到剪贴板失败：" + (clipboardRefreshError ?? "未知原因"));
                }

                string setup = "(function(){" +
                               " window.__fpDesktopTestResult = null;" +
                               " if (!window.FP || !FP.desktop || !FP.desktop.available) {" +
                               "   window.__fpDesktopTestResult = JSON.stringify({ ok: false, error: 'FP.desktop 不可用（desktop.js 未加载）' });" +
                               "   return 'no-api'; }" +
                               " try {" +
                               "   FP.desktop.readClipboardImage().then(function(r) {" +
                               "     try { window.__fpDesktopTestResult = JSON.stringify({" +
                               "       ok: true, width: r.width, height: r.height, sourceFormat: r.sourceFormat," +
                               "       bytes: r.bytes, dataUrlPrefix: String(r.dataUrl || '').substring(0, 30)," +
                               "       dataUrlLength: String(r.dataUrl || '').length }); }" +
                               "     catch (e) { window.__fpDesktopTestResult = JSON.stringify({ ok: false, error: String(e) }); }" +
                               "   }).catch(function(e) {" +
                               "     window.__fpDesktopTestResult = JSON.stringify({ ok: false, error: String((e && e.message) || e) });" +
                               "   });" +
                               "   return 'started';" +
                               " } catch (e) {" +
                               "   window.__fpDesktopTestResult = JSON.stringify({ ok: false, error: String(e) });" +
                               "   return 'error'; } })()";

                Stopwatch stopwatch = Stopwatch.StartNew();
                string started = await _form.EvalStringAsync(setup);
                result["started"] = started;
                if (!string.Equals(started, "started", StringComparison.Ordinal))
                {
                    throw new InvalidOperationException("FP.desktop.readClipboardImage 不可用：" + started);
                }

                JObject parsed = null;
                while (stopwatch.Elapsed < TimeSpan.FromSeconds(20))
                {
                    string raw = await _form.EvalStringAsync("window.__fpDesktopTestResult || ''");
                    if (!string.IsNullOrEmpty(raw))
                    {
                        parsed = JObject.Parse(raw);
                        break;
                    }

                    await Task.Delay(100);
                }

                stopwatch.Stop();
                result["latencyMs"] = stopwatch.ElapsedMilliseconds;

                if (parsed == null)
                {
                    throw new InvalidOperationException("应用 JS 桥 20 秒内未返回结果。");
                }

                result["result"] = parsed;
                if (!parsed.Value<bool>("ok"))
                {
                    throw new InvalidOperationException(
                        "应用 JS 桥返回失败：" + (parsed.Value<string>("error") ?? "未知原因"));
                }

                int width = parsed.Value<int>("width");
                int height = parsed.Value<int>("height");
                string sourceFormat = parsed.Value<string>("sourceFormat");
                if (width < 4000 || width > 5200)
                {
                    throw new InvalidOperationException("应用 JS 桥返回的图片宽度异常：" + width + "px。");
                }

                if (height <= 0)
                {
                    throw new InvalidOperationException("应用 JS 桥返回的图片高度异常：" + height + "px。");
                }

                if (!string.Equals(sourceFormat, "EMF", StringComparison.Ordinal))
                {
                    throw new InvalidOperationException("应用 JS 桥返回的 sourceFormat 期望 EMF，实际：" + sourceFormat);
                }

                result["ok"] = true;
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = ex.Message;
            }

            return result;
        }

        /// <summary>
        /// MATLAB .fig 真实往返测试：
        ///   1) 调用本机 MATLAB 现场生成临时 .fig；
        ///   2) 通过网页端真实 postMessage 发送 {"type":"import-fig",...}（含 base64）；
        ///   3) 从真实桥响应 {"type":"fig-imported",...} 验证 width/height/sourceFormat/convertMs/matlabVersion；
        ///   4) 取回 dataUrl 中的 PNG 落盘校验（签名/尺寸/非空白）。
        /// MATLAB 未安装时记录 skipped（不视为失败）。
        /// </summary>
        private async Task<JObject> RunMatlabFigTestAsync()
        {
            JObject result = new JObject();

            string matlabPath;
            string locateSource;
            if (!MatlabLocator.TryFind(out matlabPath, out locateSource))
            {
                result["available"] = false;
                result["skipped"] = true;
                result["error"] = MatlabLocator.NotFoundMessage;
                return result;
            }

            result["available"] = true;
            result["matlabPath"] = matlabPath;
            result["locateSource"] = locateSource;
            result["matlabFileVersion"] = MatlabLocator.GetFileVersion(matlabPath);

            try
            {
                // 1) MATLAB 现场生成测试 .fig
                string figPath;
                string generateError;
                long generateMs;
                if (!MatlabFigSelfTest.GenerateTestFigure(_options.OutDir, out figPath, out generateError, out generateMs))
                {
                    throw new InvalidOperationException("MATLAB 生成测试 .fig 失败：" + generateError);
                }

                result["generateMs"] = generateMs;
                byte[] figBytes = File.ReadAllBytes(figPath);
                result["figPath"] = figPath;
                result["figBytes"] = figBytes.Length;
                if (figBytes.Length < 64)
                {
                    throw new InvalidOperationException("MATLAB 生成的测试 .fig 为空。");
                }

                string base64 = Convert.ToBase64String(figBytes);
                result["base64Length"] = base64.Length;

                // 2) 真实 JS→Host 桥
                string requestId = "selftest-fig-" + DateTime.Now.Ticks;
                result["requestId"] = requestId;
                string jsPost = "(function(){ if (!window.chrome || !window.chrome.webview) { return 'no-webview'; }" +
                    " window.__figplayFigPngB64 = '';" +
                    " window.__figplayFigEmfB64 = '';" +
                    " window.chrome.webview.postMessage(JSON.stringify({" +
                    " type: 'import-fig', requestId: " + JsonConvert.ToString(requestId) +
                    ", filename: " + JsonConvert.ToString(Path.GetFileName(figPath)) +
                    ", base64: " + JsonConvert.ToString(base64) + " })); return 'sent'; })()";

                string sent = await _form.EvalStringAsync(jsPost);
                result["sent"] = sent;
                if (!string.Equals(sent, "sent", StringComparison.Ordinal))
                {
                    throw new InvalidOperationException("window.chrome.webview 不可用：" + sent);
                }

                Stopwatch stopwatch = Stopwatch.StartNew();
                string probe = "(function(){ var a = window.__figplayHostMessages || [];" +
                    " for (var i = 0; i < a.length; i++) { var d = a[i];" +
                    "   try { var o = (typeof d === 'string') ? JSON.parse(d) : d;" +
                    "     if (o && o.type === 'fig-imported' && o.requestId === " + JsonConvert.ToString(requestId) + ") {" +
                    "       if (o.ok && o.dataUrl) { try { window.__figplayFigPngB64 = String(o.dataUrl).split(',')[1] || ''; } catch (e) {} }" +
                    "       if (o.ok && o.emfBase64) { try { window.__figplayFigEmfB64 = String(o.emfBase64); } catch (e) {} }" +
                    "       return JSON.stringify({ found: true, ok: !!o.ok, width: o.width || 0, height: o.height || 0," +
                    "         sourceFormat: o.sourceFormat || '', convertMs: o.convertMs || 0," +
                    "         matlabVersion: o.matlabVersion || '', dataUrlLength: (o.dataUrl || '').length," +
                    "         emfBase64Length: (o.emfBase64 || '').length," +
                    "         error: o.error || '' }); } } catch (e) {} }" +
                    " return JSON.stringify({ found: false, count: a.length }); })()";

                JObject found = null;
                while (stopwatch.Elapsed < TimeSpan.FromSeconds(180))
                {
                    string raw = await _form.EvalStringAsync(probe);
                    if (!string.IsNullOrEmpty(raw))
                    {
                        found = JObject.Parse(raw);
                        if (found.Value<bool>("found"))
                        {
                            break;
                        }
                    }

                    await Task.Delay(500);
                }

                stopwatch.Stop();
                result["bridgeLatencyMs"] = stopwatch.ElapsedMilliseconds;

                if (found == null || !found.Value<bool>("found"))
                {
                    throw new InvalidOperationException(
                        "180 秒内未收到 fig-imported 响应（MATLAB 转换可能超时或桥未工作）。");
                }

                result["response"] = found;
                if (!found.Value<bool>("ok"))
                {
                    throw new InvalidOperationException(
                        "桥返回失败：" + (found.Value<string>("error") ?? "未知原因"));
                }

                // 3) 字段校验
                int width = found.Value<int>("width");
                int height = found.Value<int>("height");
                string sourceFormat = found.Value<string>("sourceFormat");
                long convertMs = found.Value<long>("convertMs");
                string responseMatlabVersion = found.Value<string>("matlabVersion");

                result["width"] = width;
                result["height"] = height;
                if (width <= 0 || height <= 0 || width > 6000 || height > 6000)
                {
                    throw new InvalidOperationException("导入 PNG 尺寸异常：" + width + "x" + height);
                }

                if (!string.Equals(sourceFormat, "MATLAB-FIG", StringComparison.Ordinal))
                {
                    throw new InvalidOperationException("sourceFormat 期望 MATLAB-FIG，实际：" + sourceFormat);
                }

                if (convertMs <= 0)
                {
                    throw new InvalidOperationException("convertMs 字段无效：" + convertMs);
                }

                if (string.IsNullOrWhiteSpace(responseMatlabVersion))
                {
                    throw new InvalidOperationException("响应缺少 matlabVersion 字段。");
                }

                result["matlabVersion"] = responseMatlabVersion;

                // 3.1) MATLAB 同时导出的真实 EMF（print -dmeta）→ 保存并供矢量 PDF 使用
                string figEmfBase64 = await _form.EvalStringAsync("window.__figplayFigEmfB64 || ''");
                result["emfBase64Length"] = string.IsNullOrEmpty(figEmfBase64) ? 0 : figEmfBase64.Length;
                if (!string.IsNullOrEmpty(figEmfBase64))
                {
                    byte[] figEmfBytes = Convert.FromBase64String(figEmfBase64);
                    if (EmfValidator.LooksLikeEmf(figEmfBytes))
                    {
                        string figEmfPath = Path.Combine(_options.OutDir, "matlab-source-figure.emf");
                        File.WriteAllBytes(figEmfPath, figEmfBytes);
                        result["emfBase64Available"] = true;
                        result["emfPath"] = figEmfPath;
                        result["emfBytes"] = figEmfBytes.Length;
                        result["emfHeader"] = EmfValidator.DescribeHeader(figEmfBytes);
                        _lastRealMatlabEmfBytes = figEmfBytes;
                        _lastRealMatlabEmfSource = "MATLAB print -dmeta（现场生成 .fig）";
                    }
                    else
                    {
                        result["emfBase64Available"] = false;
                        result["emfNote"] = "MATLAB 返回的 EMF 头无效：" + EmfValidator.DescribeHeader(figEmfBytes);
                    }
                }
                else
                {
                    result["emfBase64Available"] = false;
                    result["emfNote"] = "MATLAB 未能同时导出 EMF（print -dmeta 失败）；矢量 PDF 回退到 Copy Figure / C# 录制 EMF。";
                }

                // 4) 取回 PNG 落盘校验
                string pngBase64 = await _form.EvalStringAsync("window.__figplayFigPngB64 || ''");
                if (string.IsNullOrEmpty(pngBase64))
                {
                    throw new InvalidOperationException("未能从桥响应中取回 PNG 数据。");
                }

                byte[] pngBytes = Convert.FromBase64String(pngBase64);
                string pngPath = Path.Combine(_options.OutDir, "fig-import-test.png");
                File.WriteAllBytes(pngPath, pngBytes);
                result["pngPath"] = pngPath;
                result["pngBytes"] = pngBytes.Length;

                if (pngBytes.Length > 8 * 1024 * 1024)
                {
                    throw new InvalidOperationException(
                        "导入的 PNG 体积超过 8MB 上限：" + pngBytes.Length + " 字节。");
                }

                if (width < 3000 || width > 6000)
                {
                    throw new InvalidOperationException(
                        "MATLAB .fig 导出的 PNG 宽度不符合 600dpi 预期（3000–6000px）：" + width + "px。");
                }
                if (pngBytes.Length < 100)
                {
                    throw new InvalidOperationException("导入的 PNG 数据过小。");
                }

                bool signatureOk = pngBytes[0] == 0x89 && pngBytes[1] == 0x50 &&
                                   pngBytes[2] == 0x4E && pngBytes[3] == 0x47;
                result["pngSignatureOk"] = signatureOk;
                if (!signatureOk)
                {
                    throw new InvalidOperationException("导入的 PNG 签名不正确。");
                }

                using (MemoryStream stream = new MemoryStream(pngBytes, false))
                using (Bitmap bitmap = new Bitmap(stream))
                {
                    result["pngWidth"] = bitmap.Width;
                    result["pngHeight"] = bitmap.Height;
                    if (bitmap.Width != width || bitmap.Height != height)
                    {
                        throw new InvalidOperationException(
                            "PNG 实际像素尺寸与响应字段不一致：" + bitmap.Width + "x" + bitmap.Height +
                            " vs " + width + "x" + height);
                    }

                    bool nonBlank = IsNonBlank(bitmap);
                    result["pngNonBlank"] = nonBlank;
                    if (!nonBlank)
                    {
                        throw new InvalidOperationException("导入的 PNG 为空白图像。");
                    }
                }

                result["ok"] = true;
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = ex.Message;
            }

            return result;
        }

        private async Task<JObject> CheckHostReadyAsync(TimeSpan timeout)
        {
            JObject result = new JObject();
            result["sentByHost"] = _form.HostReadySent;
            Stopwatch stopwatch = Stopwatch.StartNew();
            string probe = "(function(){ var a = window.__figplayHostMessages || [];" +
                           " for (var i = 0; i < a.length; i++) { var d = a[i];" +
                           "   try { var o = (typeof d === 'string') ? JSON.parse(d) : d;" +
                           "     if (o && o.type === 'host-ready') {" +
                           "       return JSON.stringify({ found: true, version: o.version || '', receivedType: typeof d }); }" +
                           "   } catch (e) {} }" +
                           " return JSON.stringify({ found: false, count: a.length }); })()";

            JObject found = null;
            while (stopwatch.Elapsed < timeout)
            {
                try
                {
                    string raw = await _form.EvalStringAsync(probe);
                    if (!string.IsNullOrEmpty(raw))
                    {
                        found = JObject.Parse(raw);
                        if (found.Value<bool>("found"))
                        {
                            break;
                        }
                    }
                }
                catch
                {
                    // ignore
                }

                await Task.Delay(100);
            }

            result["receivedByJs"] = found != null && found.Value<bool>("found");
            result["version"] = found == null ? null : found.Value<string>("version");
            result["receivedType"] = found == null ? null : found.Value<string>("receivedType");
            return result;
        }

        private async Task<JObject> CaptureScreenshotAsync()
        {
            JObject result = new JObject();
            string screenshotPath = _options.ScreenshotPath;
            try
            {
                string directory = Path.GetDirectoryName(screenshotPath);
                if (!string.IsNullOrEmpty(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                _form.PrepareForScreenshot();
                await Task.Delay(900);

                bool captured = await CaptureOnceAsync(screenshotPath);
                if (!captured)
                {
                    await Task.Delay(1200);
                    captured = await CaptureOnceAsync(screenshotPath);
                }

                if (!captured)
                {
                    throw new InvalidOperationException("CapturePreview 未生成截图文件。");
                }

                using (Bitmap bitmap = new Bitmap(screenshotPath))
                {
                    bool nonBlank = IsNonBlank(bitmap);
                    result["ok"] = nonBlank;
                    result["path"] = screenshotPath;
                    result["bytes"] = new FileInfo(screenshotPath).Length;
                    result["width"] = bitmap.Width;
                    result["height"] = bitmap.Height;
                    result["nonBlank"] = nonBlank;
                    if (!nonBlank)
                    {
                        throw new InvalidOperationException("截图内容为空白（可能是窗口离屏导致未渲染）。");
                    }
                }
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = ex.Message;
            }

            return result;
        }

        private async Task<bool> CaptureOnceAsync(string path)
        {
            CoreWebView2 core = _form.WebView.CoreWebView2;
            if (core == null)
            {
                return false;
            }

            try
            {
                using (FileStream stream = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.Read))
                {
                    await core.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, stream);
                }

                return File.Exists(path) && new FileInfo(path).Length > 100;
            }
            catch (Exception ex)
            {
                _form.AddHostError("CapturePreview 失败：" + ex.Message);
                return false;
            }
        }

        private async Task<JObject> CollectConsoleErrorsAsync()
        {
            JObject console = new JObject();
            JArray errors = new JArray();
            try
            {
                JToken token = await _form.EvalJsonAsync("(window.__figplayConsoleErrors || []).slice(0, 50)");
                JArray array = token as JArray;
                if (array != null)
                {
                    foreach (JToken item in array)
                    {
                        errors.Add(item);
                    }
                }
            }
            catch (Exception ex)
            {
                console["probeError"] = ex.Message;
            }

            console["errorCount"] = errors.Count;
            console["errors"] = errors;
            console["hostErrors"] = new JArray(_form.HostErrors);
            return console;
        }

        // ---------------------------------------------------------------- 工具

        private static bool IsNonBlank(Bitmap bitmap)
        {
            if (bitmap == null || bitmap.Width < 4 || bitmap.Height < 4)
            {
                return false;
            }

            HashSet<int> colors = new HashSet<int>();
            int stepX = Math.Max(1, bitmap.Width / 80);
            int stepY = Math.Max(1, bitmap.Height / 50);
            for (int y = 0; y < bitmap.Height; y += stepY)
            {
                for (int x = 0; x < bitmap.Width; x += stepX)
                {
                    colors.Add(bitmap.GetPixel(x, y).ToArgb());
                    if (colors.Count >= 12)
                    {
                        return true;
                    }
                }
            }

            return colors.Count > 3;
        }

        private static async Task<bool> WaitWithTimeout(Task<bool> task, TimeSpan timeout, bool fallback)
        {
            if (task == null)
            {
                return fallback;
            }

            Task completed = await Task.WhenAny(task, Task.Delay(timeout));
            if (completed != task)
            {
                return fallback;
            }

            try
            {
                return await task;
            }
            catch
            {
                return fallback;
            }
        }

        private void WriteConsoleSummary(int exitCode, string logPath)
        {
            try
            {
                string summary =
                    "===== FigurePlay selftest =====\r\n" +
                    "exitCode      : " + exitCode + "\r\n" +
                    "success       : " + (exitCode == 0 ? "true" : "false") + "\r\n" +
                    "durationMs    : " + _clock.ElapsedMilliseconds + "\r\n" +
                    "log           : " + logPath + "\r\n" +
                    "screenshot    : " + _options.ScreenshotPath + "\r\n";
                Console.WriteLine(summary);
            }
            catch
            {
                // ignore
            }
        }

        /// <summary>启动阶段失败（WebView2 初始化失败等）也写出 JSON 日志，便于排查。</summary>
        internal static void WriteStartupFailure(AppOptions options, Exception exception)
        {
            if (options == null)
            {
                return;
            }

            try
            {
                Directory.CreateDirectory(options.OutDir);
                JObject report = new JObject
                {
                    ["tool"] = "FigurePlay Desktop selftest",
                    ["success"] = false,
                    ["exitCode"] = 1,
                    ["fatal"] = exception == null ? "未知错误" : exception.ToString(),
                    ["finishedAt"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"),
                };
                string path = Path.Combine(options.OutDir, "selftest-report.json");
                File.WriteAllText(path, report.ToString(Formatting.Indented), new UTF8Encoding(false));
                Console.Error.WriteLine("FigurePlay 自测启动失败，日志：" + path);
            }
            catch
            {
                // ignore
            }
        }
    }
}
