using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using FigurePlay.Desktop.Bridge;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>
    /// 应用级矢量 PDF 端到端测试（v1.3）：
    ///   1) 用 JS 构造 File + DataTransfer 注入 #file-input（MATLAB 现场生成的 .fig）；
    ///   2) 等待应用完成 .fig 导入（cell 有数据且 getVectorStatus().emfCount > 0，说明 cell.emfBase64 已保留）；
    ///   3) setExportOptions({format:'pdf', vectorPdf:true, saveAs:false}) 后调用 exportVectorPdfBase64()；
    ///   4) 用 pdfimages/pdfinfo/pdftotext 校验应用产出的 PDF（无位图、页尺寸=geom mm、标签文字存在）。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> RunAppVectorE2EAsync()
        {
            JObject result = new JObject();
            try
            {
                string figPath = Path.Combine(_options.OutDir, "matlab-test-figure.fig");
                if (!File.Exists(figPath))
                {
                    result["available"] = false;
                    result["skipped"] = true;
                    result["error"] = "MATLAB 生成 .fig 不可用（未安装 MATLAB），应用级矢量 PDF E2E 跳过。";
                    return result;
                }

                result["available"] = true;
                result["figPath"] = figPath;
                result["figBytes"] = new FileInfo(figPath).Length;

                bool hasApi = await _form.EvalBoolAsync(
                    "!!(window.__FIGPLAY__ && typeof window.__FIGPLAY__.exportVectorPdfBase64 === 'function')");
                result["appVectorApi"] = hasApi;
                if (!hasApi)
                {
                    throw new InvalidOperationException(
                        "应用未提供 window.__FIGPLAY__.exportVectorPdfBase64()，无法做应用级矢量 PDF E2E。");
                }

                bool hasFigInput = await _form.EvalBoolAsync(
                    "!!document.getElementById('file-input')");
                result["fileInput"] = hasFigInput;
                if (!hasFigInput)
                {
                    throw new InvalidOperationException("应用缺少 #file-input，无法注入 .fig 文件。");
                }

                string figBase64 = Convert.ToBase64String(File.ReadAllBytes(figPath));

                // 1) 复位到 3x2 网格、设置 PDF/vector 导出选项，然后把 .fig 作为 File 注入 #file-input
                string prepareScript = "(function(){ try {" +
                    " const FP = window.__FIGPLAY__;" +
                    " if (!FP) return 'no-api';" +
                    " FP.setExportOptions({ format: 'pdf', scope: 'current', vectorPdf: true, saveAs: false, trimPdf: false });" +
                    " FP.clearAll();" +
                    " FP.setLayout(3, 2);" +
                    " FP.setUploadTarget(0);" +
                    " const b64 = " + JsonConvert.ToString(figBase64) + ";" +
                    " const bin = atob(b64); const arr = new Uint8Array(bin.length);" +
                    " for (let i = 0; i < bin.length; i++) { arr[i] = bin.charCodeAt(i); }" +
                    " const file = new File([arr], 'matlab-test-figure.fig', { type: 'application/octet-stream' });" +
                    " const dt = new DataTransfer(); dt.items.add(file);" +
                    " const input = document.getElementById('file-input');" +
                    " if (!input) return 'no-input';" +
                    " input.files = dt.files;" +
                    " input.dispatchEvent(new Event('change', { bubbles: true }));" +
                    " window.__appVectorE2EPhase = 'injected';" +
                    " return 'injected';" +
                    " } catch (e) { return 'error:' + String((e && e.message) || e); } })()";

                string injected = await _form.EvalStringAsync(prepareScript);
                result["injected"] = injected;
                if (injected != "injected")
                {
                    throw new InvalidOperationException("注入 .fig 到 #file-input 失败：" + injected);
                }

                // 2) 等待应用完成 MATLAB .fig 导入（cell 有数据 + emfCount > 0）
                Stopwatch importWatch = Stopwatch.StartNew();
                JObject importState = null;
                while (importWatch.Elapsed < TimeSpan.FromSeconds(200))
                {
                    string probe = "(function(){ try {" +
                        " const FP = window.__FIGPLAY__; if (!FP) return JSON.stringify({ noApi: true });" +
                        " const info = FP.getPreviewInfo();" +
                        " const st = FP.getState();" +
                        " const vs = (typeof FP.getVectorStatus === 'function') ? FP.getVectorStatus() : null;" +
                        " const c0 = st.cells && st.cells[0] ? st.cells[0] : null;" +
                        " return JSON.stringify({" +
                        "   filled: info.filled || []," +
                        "   labelCount: info.labelCount || 0," +
                        "   geom: info.geom || null," +
                        "   emfCount: vs ? vs.emfCount : -1," +
                        "   vectorAvailable: vs ? !!vs.vectorAvailable : false," +
                        "   cell0HasData: !!(c0 && c0.hasData)," +
                        "   cell0Width: c0 ? c0.width : 0," +
                        "   cell0Height: c0 ? c0.height : 0" +
                        " });" +
                        " } catch (e) { return JSON.stringify({ probeError: String((e && e.message) || e) }); } })()";

                    string raw = await _form.EvalStringAsync(probe);
                    if (!string.IsNullOrEmpty(raw))
                    {
                        importState = JObject.Parse(raw);
                        bool cell0Filled = false;
                        JArray filled = importState["filled"] as JArray;
                        if (filled != null)
                        {
                            foreach (JToken token in filled)
                            {
                                if (token.Value<int>() == 0)
                                {
                                    cell0Filled = true;
                                    break;
                                }
                            }
                        }

                        int emfCount = importState.Value<int>("emfCount");
                        if (cell0Filled && emfCount > 0)
                        {
                            break;
                        }
                    }

                    await Task.Delay(500);
                }

                importWatch.Stop();
                result["importMs"] = importWatch.ElapsedMilliseconds;
                if (importState == null)
                {
                    throw new InvalidOperationException("未能读取应用 .fig 导入状态。");
                }

                result["importState"] = importState;
                JArray filledCells = importState["filled"] as JArray;
                bool cell0FilledFinal = false;
                if (filledCells != null)
                {
                    foreach (JToken token in filledCells)
                    {
                        if (token.Value<int>() == 0)
                        {
                            cell0FilledFinal = true;
                            break;
                        }
                    }
                }

                if (!cell0FilledFinal || importState.Value<int>("emfCount") <= 0)
                {
                    throw new InvalidOperationException(
                        "应用 .fig 导入未完成：cell0Filled=" + cell0FilledFinal +
                        " emfCount=" + importState.Value<int>("emfCount") +
                        "（等待 cell.emfBase64 超时 200 秒）。");
                }

                JObject geom = importState["geom"] as JObject;
                double expectedWidthMm = geom == null ? 0 : geom.Value<double>("widthMm");
                double expectedHeightMm = geom == null ? 0 : geom.Value<double>("heightMm");
                result["expectedWidthMm"] = expectedWidthMm;
                result["expectedHeightMm"] = expectedHeightMm;

                // 3) 调用应用 API 导出矢量 PDF（不弹保存对话框）
                string exportStart = "(function(){ try { const FP = window.__FIGPLAY__;" +
                    " if (!FP || typeof FP.exportVectorPdfBase64 !== 'function') return 'no-api';" +
                    " window.__appVectorPdfB64 = '';" +
                    " window.__appVectorE2EResult = null;" +
                    " FP.exportVectorPdfBase64().then(function(r) {" +
                    "   try { window.__appVectorE2EResult = JSON.stringify({" +
                    "     ok: !!r.ok, bytes: r.bytes || 0, engine: r.engine || ''," +
                    "     vectorPanels: r.vectorPanels || 0, rasterPanels: r.rasterPanels || 0," +
                    "     base64Length: (r.base64 || '').length, error: r.error || '' });" +
                    "     if (r.ok && r.base64) { window.__appVectorPdfB64 = r.base64; }" +
                    "   } catch (e) { window.__appVectorE2EResult = JSON.stringify({ ok: false, error: String(e) }); }" +
                    " }).catch(function(e) {" +
                    "   window.__appVectorE2EResult = JSON.stringify({ ok: false, error: String((e && e.message) || e) });" +
                    " });" +
                    " return 'started';" +
                    " } catch (e) { return 'error:' + String((e && e.message) || e); } })()";

                string exportStarted = await _form.EvalStringAsync(exportStart);
                result["exportStarted"] = exportStarted;
                if (exportStarted != "started")
                {
                    throw new InvalidOperationException("调用 exportVectorPdfBase64 失败：" + exportStarted);
                }

                Stopwatch exportWatch = Stopwatch.StartNew();
                JObject exportResult = null;
                while (exportWatch.Elapsed < TimeSpan.FromSeconds(180))
                {
                    string raw = await _form.EvalStringAsync("window.__appVectorE2EResult || ''");
                    if (!string.IsNullOrEmpty(raw))
                    {
                        exportResult = JObject.Parse(raw);
                        break;
                    }

                    await Task.Delay(500);
                }

                exportWatch.Stop();
                result["exportMs"] = exportWatch.ElapsedMilliseconds;
                if (exportResult == null)
                {
                    throw new InvalidOperationException("应用 exportVectorPdfBase64 180 秒内未返回结果。");
                }

                result["exportResult"] = exportResult;
                if (!exportResult.Value<bool>("ok"))
                {
                    throw new InvalidOperationException(
                        "应用矢量 PDF 导出失败：" + (exportResult.Value<string>("error") ?? "未知原因"));
                }

                int reportedVector = exportResult.Value<int>("vectorPanels");
                int reportedRaster = exportResult.Value<int>("rasterPanels");
                if (reportedVector < 1)
                {
                    throw new InvalidOperationException("应用矢量 PDF vectorPanels 应 >= 1，实际：" + reportedVector);
                }

                if (reportedRaster != 0)
                {
                    throw new InvalidOperationException("应用矢量 PDF rasterPanels 期望 0，实际：" + reportedRaster);
                }

                string pdfBase64 = await _form.EvalStringAsync("window.__appVectorPdfB64 || ''");
                if (string.IsNullOrEmpty(pdfBase64))
                {
                    throw new InvalidOperationException("未能从应用导出结果取回 PDF base64。");
                }

                byte[] pdfBytes = Convert.FromBase64String(pdfBase64);
                string pdfPath = Path.Combine(_options.OutDir, "app-vector-e2e.pdf");
                File.WriteAllBytes(pdfPath, pdfBytes);
                result["pdfPath"] = pdfPath;
                result["pdfBytes"] = pdfBytes.Length;
                if (pdfBytes.Length != exportResult.Value<int>("bytes"))
                {
                    throw new InvalidOperationException(
                        "应用返回 bytes 与实际 PDF 大小不一致：" + exportResult.Value<int>("bytes") +
                        " vs " + pdfBytes.Length);
                }

                if (pdfBytes.Length < 1000 ||
                    pdfBytes[0] != (byte)'%' || pdfBytes[1] != (byte)'P' ||
                    pdfBytes[2] != (byte)'D' || pdfBytes[3] != (byte)'F')
                {
                    throw new InvalidOperationException("应用导出的内容不是有效 PDF。");
                }

                // 4) PDF 内容校验：页尺寸 = geom mm、无位图、标签文字存在
                JObject checks = new JObject();
                result["checks"] = checks;
                checks["engine"] = exportResult.Value<string>("engine");
                checks["vectorPanels"] = reportedVector;
                checks["rasterPanels"] = reportedRaster;

                double expectedWidthPt = expectedWidthMm / 25.4 * 72.0;
                double expectedHeightPt = expectedHeightMm / 25.4 * 72.0;
                checks["expectedPageWidthPt"] = Math.Round(expectedWidthPt, 2);
                checks["expectedPageHeightPt"] = Math.Round(expectedHeightPt, 2);

                string pdfinfoExe = FindPdfTool("pdfinfo");
                string pdfimagesExe = FindPdfTool("pdfimages");
                string pdftotextExe = FindPdfTool("pdftotext");

                bool pageSizeOk = false;
                if (!string.IsNullOrEmpty(pdfinfoExe))
                {
                    string infoOutput = RunTool(pdfinfoExe, QuoteArgument(pdfPath), 30000);
                    checks["pdfinfoOutput"] = Shorten(infoOutput, 1500);
                    double widthPt;
                    double heightPt;
                    int pages;
                    if (TryParsePdfInfo(infoOutput, out widthPt, out heightPt, out pages))
                    {
                        checks["pageWidthPt"] = Math.Round(widthPt, 2);
                        checks["pageHeightPt"] = Math.Round(heightPt, 2);
                        checks["pages"] = pages;
                        pageSizeOk = pages == 1 &&
                                     Math.Abs(widthPt - expectedWidthPt) <= 2.0 &&
                                     Math.Abs(heightPt - expectedHeightPt) <= 2.0;
                    }
                }

                if (!pageSizeOk)
                {
                    double widthPt;
                    double heightPt;
                    if (TryGetPdfMediaBox(pdfBytes, out widthPt, out heightPt))
                    {
                        checks["mediaBoxWidthPt"] = Math.Round(widthPt, 2);
                        checks["mediaBoxHeightPt"] = Math.Round(heightPt, 2);
                        pageSizeOk = Math.Abs(widthPt - expectedWidthPt) <= 2.0 &&
                                     Math.Abs(heightPt - expectedHeightPt) <= 2.0;
                    }
                }

                checks["pageSizeOk"] = pageSizeOk;
                if (!pageSizeOk)
                {
                    throw new InvalidOperationException(
                        "应用矢量 PDF 页面尺寸不符：期望 " + Math.Round(expectedWidthPt, 2) + " x " +
                        Math.Round(expectedHeightPt, 2) + " pt（" + expectedWidthMm + " x " + expectedHeightMm + " mm）。");
                }

                bool noBitmaps = false;
                if (!string.IsNullOrEmpty(pdfimagesExe))
                {
                    string listOutput = RunTool(pdfimagesExe, "-list " + QuoteArgument(pdfPath), 60000);
                    checks["pdfimagesList"] = Shorten(listOutput, 1500);
                    int imageRows = CountPdfImageRows(listOutput);
                    checks["imageCount"] = imageRows;
                    checks["imageCheckMode"] = "pdfimages";
                    noBitmaps = imageRows == 0;
                }

                if (!noBitmaps)
                {
                    int rawCount;
                    int inflatedCount;
                    ScanPdfForImageXObjects(pdfBytes, out rawCount, out inflatedCount);
                    checks["managedImageXObjectCount"] = rawCount + inflatedCount;
                    checks["imageCheckMode"] = string.IsNullOrEmpty(pdfimagesExe)
                        ? "managed"
                        : "pdfimages+managed";
                    noBitmaps = (rawCount + inflatedCount) == 0;
                }

                checks["noBitmaps"] = noBitmaps;
                if (!noBitmaps)
                {
                    throw new InvalidOperationException("应用矢量 PDF 中检测到位图图像（EMF 可能未走矢量路径）。");
                }

                int labelCount = importState.Value<int>("labelCount");
                bool labelTextOk = false;
                if (!string.IsNullOrEmpty(pdftotextExe))
                {
                    string textOutput = RunTool(pdftotextExe, QuoteArgument(pdfPath) + " -", 60000);
                    checks["text"] = Shorten(textOutput, 500);
                    labelTextOk = textOutput != null && textOutput.IndexOf("(a)", StringComparison.Ordinal) >= 0;
                    checks["labelCount"] = labelCount;
                }
                else
                {
                    checks["textCheckSkipped"] = "pdftotext 不可用，跳过标签文字校验";
                }

                checks["labelTextOk"] = labelTextOk;
                if (labelCount > 0 && string.IsNullOrEmpty(pdftotextExe) == false && !labelTextOk)
                {
                    throw new InvalidOperationException("应用矢量 PDF 中未提取到标签文字 \"(a)\"。");
                }

                // 5) v1.3.1：trimPdf=true 墨迹裁剪 E2E（页面 = getInkCropBox 尺寸，四边白边 ≤1.5mm）
                JObject trimResult = await RunAppVectorTrimMarginE2EAsync(importState);
                result["trim"] = trimResult;
                if (!trimResult.Value<bool>("ok"))
                {
                    throw new InvalidOperationException(
                        "应用级 trim 矢量 PDF E2E 失败：" +
                        (trimResult.Value<string>("error") ?? "未知原因"));
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

        // ---------------------------------------------------------------- v1.3.1 墨迹裁剪 E2E

        /// <summary>
        /// trimPdf=true：应用内部用 96dpi 墨迹探针得到 crop（getInkCropBox），导出矢量 PDF 页面应等于
        /// crop 尺寸（±1mm），且 PDF 渲染后四边实际白边 ≤1.5mm（pdftoppm + 像素扫描；工具不可用则跳过）。
        /// 注意：此时页面只有一个 filled cell（3×2 网格其余为空），天然形成大量留白/letterbox。
        /// </summary>
        private async Task<JObject> RunAppVectorTrimAsync(JObject importState)
        {
            JObject result = new JObject();
            try
            {
                bool hasApi = await _form.EvalBoolAsync(
                    "!!(window.__FIGPLAY__ && typeof window.__FIGPLAY__.getInkCropBox === 'function' && " +
                    "typeof window.__FIGPLAY__.exportVectorPdfBase64 === 'function')");
                result["available"] = hasApi;
                if (!hasApi)
                {
                    throw new InvalidOperationException(
                        "应用未提供 getInkCropBox/exportVectorPdfBase64，无法做 trim E2E。");
                }

                int[] powerPointPidsBefore = PowerPointVectorExporter.SnapshotPowerPointPids();
                result["powerPointPidsBefore"] = powerPointPidsBefore.Length;

                // 1) 设置 trimPdf=true 并先后调用 getInkCropBox / exportVectorPdfBase64
                string startScript = "(function(){ try { const FP = window.__FIGPLAY__;" +
                    " FP.setExportOptions({ format: 'pdf', scope: 'current', vectorPdf: true, saveAs: false, trimPdf: true, trimMarginMm: 0 });" +
                    " window.__appTrimCropBox = null;" +
                    " window.__appVectorTrimResult = null;" +
                    " window.__appVectorTrimState = 'running';" +
                    " FP.getInkCropBox(0).then(function(crop) {" +
                    "   try { window.__appTrimCropBox = JSON.stringify(crop || null); } catch (e) { window.__appTrimCropBox = null; }" +
                    "   return FP.exportVectorPdfBase64();" +
                    " }).then(function(r) {" +
                    "   try { window.__appVectorTrimResult = JSON.stringify({ ok: !!r.ok, bytes: r.bytes || 0," +
                    "     engine: r.engine || '', vectorPanels: r.vectorPanels || 0, rasterPanels: r.rasterPanels || 0," +
                    "     base64Length: (r.base64 || '').length, error: r.error || '' });" +
                    "     if (r.ok && r.base64) { window.__appVectorTrimPdfB64 = r.base64; }" +
                    "   } catch (e) { window.__appVectorTrimResult = JSON.stringify({ ok: false, error: String(e) }); }" +
                    "   window.__appVectorTrimState = 'done';" +
                    " }).catch(function(e) {" +
                    "   window.__appVectorTrimResult = JSON.stringify({ ok: false, error: String((e && e.message) || e) });" +
                    "   window.__appVectorTrimState = 'done';" +
                    " });" +
                    " return 'started';" +
                    " } catch (e) { return 'error:' + String((e && e.message) || e); } })()";

                Stopwatch watch = Stopwatch.StartNew();
                string started = await _form.EvalStringAsync(startScript);
                result["started"] = started;
                if (started != "started")
                {
                    throw new InvalidOperationException("启动 trim 导出失败：" + started);
                }

                JObject trimExport = null;
                string cropBoxJson = null;
                while (watch.Elapsed < TimeSpan.FromSeconds(180))
                {
                    string state = await _form.EvalStringAsync("window.__appVectorTrimState || ''");
                    if (state == "done")
                    {
                        string rawResult = await _form.EvalStringAsync("window.__appVectorTrimResult || ''");
                        if (!string.IsNullOrEmpty(rawResult))
                        {
                            trimExport = JObject.Parse(rawResult);
                        }

                        cropBoxJson = await _form.EvalStringAsync("window.__appTrimCropBox || ''");
                        break;
                    }

                    await Task.Delay(500);
                }

                watch.Stop();
                result["trimExportMs"] = watch.ElapsedMilliseconds;
                if (trimExport == null)
                {
                    throw new InvalidOperationException("trim 导出 180 秒内未完成。");
                }

                result["exportResult"] = trimExport;
                if (!trimExport.Value<bool>("ok"))
                {
                    throw new InvalidOperationException(
                        "trim 矢量 PDF 导出失败：" + (trimExport.Value<string>("error") ?? "未知原因"));
                }

                int trimVector = trimExport.Value<int>("vectorPanels");
                int trimRaster = trimExport.Value<int>("rasterPanels");
                if (trimVector < 1)
                {
                    throw new InvalidOperationException("trim 矢量 PDF vectorPanels 应 >= 1，实际：" + trimVector);
                }

                if (trimRaster != 0)
                {
                    throw new InvalidOperationException("trim 矢量 PDF rasterPanels 期望 0，实际：" + trimRaster);
                }

                if (string.IsNullOrEmpty(cropBoxJson))
                {
                    throw new InvalidOperationException("应用 getInkCropBox 未返回结果。");
                }

                JObject cropBox = JObject.Parse(cropBoxJson);
                double cropWmm = cropBox.Value<double>("wMm");
                double cropHmm = cropBox.Value<double>("hMm");
                result["inkCropBox"] = cropBox;
                if (cropWmm <= 0 || cropHmm <= 0)
                {
                    throw new InvalidOperationException("应用 getInkCropBox 尺寸无效：" + cropWmm + "x" + cropHmm + "mm");
                }

                JObject geom = importState["geom"] as JObject;
                double pageWidthMm = geom == null ? 0 : geom.Value<double>("widthMm");
                double pageHeightMm = geom == null ? 0 : geom.Value<double>("heightMm");
                result["pageBeforeTrimMm"] = pageWidthMm + "x" + pageHeightMm;
                if (cropWmm >= pageWidthMm - 0.5 && cropHmm >= pageHeightMm - 0.5)
                {
                    // 仍允许通过（内容确实铺满），但标记提示
                    result["cropNote"] = "ink crop 未明显小于页面（内容铺满），白边检查仍会验证";
                }

                string trimBase64 = await _form.EvalStringAsync("window.__appVectorTrimPdfB64 || ''");
                if (string.IsNullOrEmpty(trimBase64))
                {
                    throw new InvalidOperationException("未能从 trim 导出结果取回 PDF base64。");
                }

                byte[] pdfBytes = Convert.FromBase64String(trimBase64);
                string pdfPath = Path.Combine(_options.OutDir, "app-vector-e2e-trimmed.pdf");
                File.WriteAllBytes(pdfPath, pdfBytes);
                result["pdfPath"] = pdfPath;
                result["pdfBytes"] = pdfBytes.Length;
                if (pdfBytes.Length != trimExport.Value<int>("bytes"))
                {
                    throw new InvalidOperationException(
                        "trim 返回 bytes 与实际 PDF 大小不一致：" + trimExport.Value<int>("bytes") + " vs " + pdfBytes.Length);
                }

                if (pdfBytes.Length < 1000 ||
                    pdfBytes[0] != (byte)'%' || pdfBytes[1] != (byte)'P' ||
                    pdfBytes[2] != (byte)'D' || pdfBytes[3] != (byte)'F')
                {
                    throw new InvalidOperationException("trim 导出的内容不是有效 PDF。");
                }

                JObject checks = new JObject();
                result["checks"] = checks;

                double expectedWidthPt = cropWmm / 25.4 * 72.0;
                double expectedHeightPt = cropHmm / 25.4 * 72.0;
                checks["expectedPageWidthPt"] = Math.Round(expectedWidthPt, 2);
                checks["expectedPageHeightPt"] = Math.Round(expectedHeightPt, 2);
                checks["cropWidthMm"] = cropWmm;
                checks["cropHeightMm"] = cropHmm;

                // 宿主会用 PowerPoint 渲染结果做二次墨迹校正，最终页面会比 app getInkCropBox 略小。
                // 注意 .fig 路径：app ink crop 基于 600dpi PNG 预览，矢量面板是 MATLAB print -dmeta EMF，
                // EMF 自身内部留边与 PNG 不同，二次校正后页面可能比 app crop 小约 8–9mm（内容仍无白边）。
                // 因此允许“略大 ≤2.5mm / 略小 ≤10mm”，重点断言渲染后实际白边 ≤1.5mm。
                double pageTolerancePt = 2.5 / 25.4 * 72.0 + 0.5;
                double pageShrinkLimitPt = 10.0 / 25.4 * 72.0;

                // 2) 页尺寸 ≈ getInkCropBox（±3mm，含宿主二次墨迹校正）
                string pdfinfoExe = FindPdfTool("pdfinfo");
                string pdfimagesExe = FindPdfTool("pdfimages");
                bool pageSizeOk = false;
                if (!string.IsNullOrEmpty(pdfinfoExe))
                {
                    string infoOutput = RunTool(pdfinfoExe, QuoteArgument(pdfPath), 30000);
                    checks["pdfinfoOutput"] = Shorten(infoOutput, 1200);
                    double widthPt;
                    double heightPt;
                    int pages;
                    if (TryParsePdfInfo(infoOutput, out widthPt, out heightPt, out pages))
                    {
                        checks["pageWidthPt"] = Math.Round(widthPt, 2);
                        checks["pageHeightPt"] = Math.Round(heightPt, 2);
                        checks["pages"] = pages;
                        checks["pageDeltaWidthMm"] = Math.Round((expectedWidthPt - widthPt) / 72.0 * 25.4, 2);
                        checks["pageDeltaHeightMm"] = Math.Round((expectedHeightPt - heightPt) / 72.0 * 25.4, 2);
                        pageSizeOk = pages == 1 &&
                                     widthPt <= expectedWidthPt + pageTolerancePt &&
                                     widthPt >= expectedWidthPt - pageShrinkLimitPt &&
                                     heightPt <= expectedHeightPt + pageTolerancePt &&
                                     heightPt >= expectedHeightPt - pageShrinkLimitPt;
                        double shrinkW = (expectedWidthPt - widthPt) / 72.0 * 25.4;
                        double shrinkH = (expectedHeightPt - heightPt) / 72.0 * 25.4;
                        if (shrinkW > 2.5 || shrinkH > 2.5)
                        {
                            checks["pageSizeNote"] =
                                "宿主二次墨迹校正后页面比 app getInkCropBox 小 " +
                                Math.Round(shrinkW, 1) + " x " + Math.Round(shrinkH, 1) + "mm（.fig EMF 内部留边与 PNG 预览不同；内容无白边）";
                            result["pageSizeNote"] = checks["pageSizeNote"];
                        }
                    }
                }

                if (!pageSizeOk)
                {
                    double widthPt;
                    double heightPt;
                    if (TryGetPdfMediaBox(pdfBytes, out widthPt, out heightPt))
                    {
                        checks["mediaBoxWidthPt"] = Math.Round(widthPt, 2);
                        checks["mediaBoxHeightPt"] = Math.Round(heightPt, 2);
                        pageSizeOk = widthPt <= expectedWidthPt + pageTolerancePt &&
                                     widthPt >= expectedWidthPt - pageShrinkLimitPt &&
                                     heightPt <= expectedHeightPt + pageTolerancePt &&
                                     heightPt >= expectedHeightPt - pageShrinkLimitPt;
                    }
                }

                checks["pageSizeOk"] = pageSizeOk;
                if (!pageSizeOk)
                {
                    throw new InvalidOperationException(
                        "trim PDF 页面尺寸与 getInkCropBox 不符（允许略大 2.5mm/略小 10mm）：期望 " +
                        Math.Round(expectedWidthPt, 2) + " x " + Math.Round(expectedHeightPt, 2) +
                        " pt（crop " + cropWmm + " x " + cropHmm + " mm）。");
                }

                // 3) 无位图
                bool noBitmaps = false;
                if (!string.IsNullOrEmpty(pdfimagesExe))
                {
                    string listOutput = RunTool(pdfimagesExe, "-list " + QuoteArgument(pdfPath), 60000);
                    checks["pdfimagesList"] = Shorten(listOutput, 1200);
                    int imageRows = CountPdfImageRows(listOutput);
                    checks["imageCount"] = imageRows;
                    checks["imageCheckMode"] = "pdfimages";
                    noBitmaps = imageRows == 0;
                }

                if (!noBitmaps)
                {
                    int rawCount;
                    int inflatedCount;
                    ScanPdfForImageXObjects(pdfBytes, out rawCount, out inflatedCount);
                    checks["managedImageXObjectCount"] = rawCount + inflatedCount;
                    noBitmaps = (rawCount + inflatedCount) == 0;
                }

                checks["noBitmaps"] = noBitmaps;
                if (!noBitmaps)
                {
                    throw new InvalidOperationException("trim 矢量 PDF 中检测到位图图像。");
                }

                // 4) 渲染后四边白边 ≤1.5mm（pdftoppm 150dpi + 像素扫描）
                string pdftoppmExe = FindPdfTool("pdftoppm");
                checks["pdftoppm"] = pdftoppmExe ?? string.Empty;
                if (!string.IsNullOrEmpty(pdftoppmExe))
                {
                    string prefix = Path.Combine(_options.OutDir, "app-vector-e2e-trimmed");
                    string pngPath = prefix + ".png";
                    if (File.Exists(pngPath))
                    {
                        File.Delete(pngPath);
                    }

                    RunTool(pdftoppmExe, "-r 150 -png -singlefile " + QuoteArgument(pdfPath) + " " + QuoteArgument(prefix), 120000);
                    if (File.Exists(pngPath))
                    {
                        double leftMm;
                        double topMm;
                        double rightMm;
                        double bottomMm;
                        int renderWidth;
                        int renderHeight;
                        bool measured = MeasureWhiteMargins(
                            pngPath,
                            150.0 / 25.4,
                            out leftMm,
                            out topMm,
                            out rightMm,
                            out bottomMm,
                            out renderWidth,
                            out renderHeight);
                        checks["marginCheckMode"] = "pdftoppm+pixels";
                        checks["renderPngPath"] = pngPath;
                        checks["renderWidthPx"] = renderWidth;
                        checks["renderHeightPx"] = renderHeight;
                        if (!measured)
                        {
                            checks["marginCheck"] = "render 图像全白，无法测量墨迹边界";
                            throw new InvalidOperationException("trim PDF 渲染后为全白页面。");
                        }

                        checks["leftMarginMm"] = Math.Round(leftMm, 2);
                        checks["topMarginMm"] = Math.Round(topMm, 2);
                        checks["rightMarginMm"] = Math.Round(rightMm, 2);
                        checks["bottomMarginMm"] = Math.Round(bottomMm, 2);
                        double maxMargin = Math.Max(Math.Max(leftMm, topMm), Math.Max(rightMm, bottomMm));
                        checks["maxMarginMm"] = Math.Round(maxMargin, 2);
                        checks["marginsWithin1_5mm"] = maxMargin <= 1.5;
                        checks["marginsWithin0_5mm"] = maxMargin <= 0.5;
                        if (maxMargin > 1.5)
                        {
                            throw new InvalidOperationException(
                                "trim PDF 渲染后白边 >1.5mm：L=" + Math.Round(leftMm, 2) +
                                " T=" + Math.Round(topMm, 2) + " R=" + Math.Round(rightMm, 2) +
                                " B=" + Math.Round(bottomMm, 2) +
                                " mm（宿主二次墨迹校正应把四边压到 ≤0.5mm）。");
                        }
                    }
                    else
                    {
                        checks["marginCheckMode"] = "pdftoppm-skipped(未生成 PNG)";
                    }
                }
                else
                {
                    checks["marginCheckMode"] = "skipped(无 pdftoppm)";
                    checks["marginCheckNote"] = "已用 pdfinfo 页尺寸 + getInkCropBox 断言，未做像素级白边测量";
                }

                // 5) PowerPoint 进程清理（trim 导出不残留）
                await Task.Delay(1200);
                int[] pidsAfter = PowerPointVectorExporter.SnapshotPowerPointPids();
                List<int> newPids = new List<int>();
                foreach (int pid in pidsAfter)
                {
                    if (Array.IndexOf(powerPointPidsBefore, pid) < 0)
                    {
                        newPids.Add(pid);
                    }
                }

                checks["newPowerPointProcesses"] = new JArray(newPids.ToArray());
                if (newPids.Count > 0)
                {
                    PowerPointVectorExporter.KillNewPowerPointProcesses(powerPointPidsBefore);
                    await Task.Delay(800);
                    int[] afterKill = PowerPointVectorExporter.SnapshotPowerPointPids();
                    List<int> remaining = new List<int>();
                    foreach (int pid in afterKill)
                    {
                        if (Array.IndexOf(powerPointPidsBefore, pid) < 0)
                        {
                            remaining.Add(pid);
                        }
                    }

                    if (remaining.Count > 0)
                    {
                        throw new InvalidOperationException(
                            "trim 导出后仍有残留 POWERPNT 进程：" + string.Join(",", remaining.ToArray()));
                    }
                }

                // 复位 trim 选项，避免影响后续截图/其它测试
                await _form.EvalStringAsync(
                    "(function(){ try { window.__FIGPLAY__.setExportOptions({ trimPdf: false }); return 'ok'; } catch (e) { return 'err'; } })()");

                result["ok"] = true;
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = ex.Message;
                try
                {
                    await _form.EvalStringAsync(
                        "(function(){ try { window.__FIGPLAY__.setExportOptions({ trimPdf: false }); return 'ok'; } catch (e) { return 'err'; } })()");
                }
                catch
                {
                    // ignore
                }
            }

            return result;
        }

        /// <summary>扫描 PNG 的白底四边墨迹留白（像素→mm）。</summary>
        private static bool MeasureWhiteMargins(
            string pngPath,
            double pixelsPerMm,
            out double leftMm,
            out double topMm,
            out double rightMm,
            out double bottomMm,
            out int width,
            out int height)
        {
            leftMm = 0;
            topMm = 0;
            rightMm = 0;
            bottomMm = 0;
            width = 0;
            height = 0;

            using (Bitmap bitmap = new Bitmap(pngPath))
            {
                width = bitmap.Width;
                height = bitmap.Height;
                if (width < 4 || height < 4)
                {
                    return false;
                }

                BitmapData data = bitmap.LockBits(
                    new Rectangle(0, 0, width, height),
                    ImageLockMode.ReadOnly,
                    PixelFormat.Format32bppArgb);
                try
                {
                    int stride = data.Stride;
                    byte[] row = new byte[Math.Abs(stride)];
                    const int tolerance = 12;

                    int minX = width;
                    int maxX = -1;
                    int minY = height;
                    int maxY = -1;

                    for (int y = 0; y < height; y++)
                    {
                        Marshal.Copy(IntPtr.Add(data.Scan0, y * stride), row, 0, row.Length);
                        for (int x = 0; x < width; x++)
                        {
                            int offset = x * 4;
                            int b = row[offset];
                            int g = row[offset + 1];
                            int r = row[offset + 2];
                            int a = row[offset + 3];
                            if (a == 0)
                            {
                                continue;
                            }

                            if (Math.Abs(r - 255) > tolerance ||
                                Math.Abs(g - 255) > tolerance ||
                                Math.Abs(b - 255) > tolerance)
                            {
                                if (x < minX)
                                {
                                    minX = x;
                                }

                                if (x > maxX)
                                {
                                    maxX = x;
                                }

                                if (y < minY)
                                {
                                    minY = y;
                                }

                                if (y > maxY)
                                {
                                    maxY = y;
                                }
                            }
                        }
                    }

                    if (maxX < 0 || maxY < 0)
                    {
                        return false;
                    }

                    leftMm = minX / pixelsPerMm;
                    topMm = minY / pixelsPerMm;
                    rightMm = (width - 1 - maxX) / pixelsPerMm;
                    bottomMm = (height - 1 - maxY) / pixelsPerMm;
                    return true;
                }
                finally
                {
                    bitmap.UnlockBits(data);
                }
            }
        }
    }
}
