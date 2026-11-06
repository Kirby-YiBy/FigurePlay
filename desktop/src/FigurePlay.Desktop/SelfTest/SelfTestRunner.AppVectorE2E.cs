using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
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

                result["ok"] = true;
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = ex.Message;
            }

            return result;
        }
    }
}
