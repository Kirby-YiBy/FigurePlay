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
    /// v1.3.2 宿主级 crop + trimMargin（安全边距）测试：
    /// 实心填满画布的真实 EMF + stretch，crop=150×100mm；宿主会按 trimMargin 向四周扩展页面，
    /// 因此输出页应为 (150+2m)×(100+2m) mm，且 pdftoppm 渲染后四边墨迹余量 ≈ m（±0.5mm）。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> RunVectorPdfCropChecksAsync(
            byte[] emfBytes,
            JObject baseSpec,
            string parentRequestId)
        {
            JObject result = new JObject();

            const double cropX = 10;
            const double cropY = 10;
            const double cropW = 150;
            const double cropH = 100;

            byte[] solidEmf = TestFigureFactory.CreateSolidEmfBytes();
            result["emfSource"] = "C# Metafile 录制（实心填满画布）";
            result["emfBytes"] = solidEmf.Length;
            result["parentRequestId"] = parentRequestId;
            result["cropMm"] = new JObject
            {
                ["xMm"] = cropX,
                ["yMm"] = cropY,
                ["wMm"] = cropW,
                ["hMm"] = cropH,
            };

            JArray cases = new JArray();
            result["cases"] = cases;
            bool allOk = true;
            string lastError = null;

            foreach (double marginMm in new[] { 1.0, 2.0 })
            {
                JObject one = new JObject();
                one["trimMarginMm"] = marginMm;
                JObject checks = new JObject();
                one["checks"] = checks;
                try
                {
                    JObject cropSpec = (JObject)baseSpec.DeepClone();
                    cropSpec["crop"] = new JObject
                    {
                        ["xMm"] = cropX,
                        ["yMm"] = cropY,
                        ["wMm"] = cropW,
                        ["hMm"] = cropH,
                    };
                    cropSpec["trimMarginMm"] = marginMm;
                    // 精确页尺寸测试不放标签，避免标签墨迹影响 ink bbox 断言
                    cropSpec["labels"] = new JArray();

                    JArray panels = cropSpec["panels"] as JArray;
                    if (panels == null || panels.Count == 0)
                    {
                        throw new InvalidOperationException("baseSpec 缺少 panels。");
                    }

                    JObject panel = (JObject)panels[0];
                    panel["xMm"] = cropX;
                    panel["yMm"] = cropY;
                    panel["wMm"] = cropW;
                    panel["hMm"] = cropH;
                    panel["fit"] = "stretch";
                    panel["image"] = new JObject
                    {
                        ["kind"] = "emf",
                        ["base64"] = Convert.ToBase64String(solidEmf),
                    };

                    string requestId = "selftest-vector-crop-m" + marginMm.ToString("0") + "-" + DateTime.Now.Ticks;
                    one["requestId"] = requestId;

                    Stopwatch stopwatch = Stopwatch.StartNew();
                    byte[] pdfBytes = await SendVectorPdfRequestAsync(cropSpec, requestId, 180);
                    stopwatch.Stop();
                    one["latencyMs"] = stopwatch.ElapsedMilliseconds;
                    one["pdfBytes"] = pdfBytes.Length;

                    if (pdfBytes.Length < 1000 ||
                        pdfBytes[0] != (byte)'%' || pdfBytes[1] != (byte)'P' ||
                        pdfBytes[2] != (byte)'D' || pdfBytes[3] != (byte)'F')
                    {
                        throw new InvalidOperationException("crop 矢量 PDF 不是有效 PDF。");
                    }

                    string pdfPath = Path.Combine(
                        _options.OutDir,
                        "vector-pdf-crop-trim" + marginMm.ToString("0") + "mm.pdf");
                    File.WriteAllBytes(pdfPath, pdfBytes);
                    one["pdfPath"] = pdfPath;

                    double expectedWidthMm = cropW + 2.0 * marginMm;
                    double expectedHeightMm = cropH + 2.0 * marginMm;
                    checks["expectedPageWidthMm"] = expectedWidthMm;
                    checks["expectedPageHeightMm"] = expectedHeightMm;

                    string pdfinfoExe = FindPdfTool("pdfinfo");
                    string pdfimagesExe = FindPdfTool("pdfimages");
                    string pdftoppmExe = FindPdfTool("pdftoppm");

                    // 页面尺寸 = crop + 2*trimMargin（±0.5mm）
                    bool pageSizeOk = false;
                    if (!string.IsNullOrEmpty(pdfinfoExe))
                    {
                        string infoOutput = RunTool(pdfinfoExe, QuoteArgument(pdfPath), 30000);
                        checks["pdfinfoOutput"] = Shorten(infoOutput, 1400);
                        double widthPt;
                        double heightPt;
                        int pages;
                        if (TryParsePdfInfo(infoOutput, out widthPt, out heightPt, out pages))
                        {
                            double widthMm = widthPt / 72.0 * 25.4;
                            double heightMm = heightPt / 72.0 * 25.4;
                            checks["pageWidthPt"] = Math.Round(widthPt, 2);
                            checks["pageHeightPt"] = Math.Round(heightPt, 2);
                            checks["pageWidthMm"] = Math.Round(widthMm, 2);
                            checks["pageHeightMm"] = Math.Round(heightMm, 2);
                            checks["pages"] = pages;
                            pageSizeOk = pages == 1 &&
                                         Math.Abs(widthMm - expectedWidthMm) <= 0.8 &&
                                         Math.Abs(heightMm - expectedHeightMm) <= 0.8;
                        }
                    }

                    checks["pageSizeOk"] = pageSizeOk;
                    if (!pageSizeOk)
                    {
                        throw new InvalidOperationException(
                            "crop+trimMargin 页面尺寸不符：期望 " + expectedWidthMm + "×" +
                            expectedHeightMm + "mm。");
                    }

                    // 无位图
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
                        throw new InvalidOperationException("crop+trimMargin PDF 中检测到位图图像。");
                    }

                    // pdftoppm 渲染后四边余量 ≈ trimMargin
                    if (string.IsNullOrEmpty(pdftoppmExe))
                    {
                        throw new InvalidOperationException("缺少 pdftoppm，无法验证渲染后墨迹余量。");
                    }

                    string renderPrefix = Path.Combine(
                        _options.OutDir,
                        "vector-pdf-crop-trim" + marginMm.ToString("0") + "mm");
                    string renderPng = renderPrefix + ".png";
                    if (File.Exists(renderPng))
                    {
                        File.Delete(renderPng);
                    }

                    RunTool(pdftoppmExe, "-r 150 -png -singlefile " + QuoteArgument(pdfPath) + " " + QuoteArgument(renderPrefix), 120000);
                    if (!File.Exists(renderPng))
                    {
                        throw new InvalidOperationException("pdftoppm 未生成渲染 PNG。");
                    }

                    double leftMm;
                    double topMm;
                    double rightMm;
                    double bottomMm;
                    int renderWidth;
                    int renderHeight;
                    bool measured = MeasureWhiteMargins(
                        renderPng,
                        150.0 / 25.4,
                        out leftMm,
                        out topMm,
                        out rightMm,
                        out bottomMm,
                        out renderWidth,
                        out renderHeight);
                    checks["marginCheckMode"] = "pdftoppm+pixels";
                    checks["renderPngPath"] = renderPng;
                    if (!measured)
                    {
                        throw new InvalidOperationException("crop+trimMargin 渲染后为全白页面。");
                    }

                    checks["leftMarginMm"] = Math.Round(leftMm, 2);
                    checks["topMarginMm"] = Math.Round(topMm, 2);
                    checks["rightMarginMm"] = Math.Round(rightMm, 2);
                    checks["bottomMarginMm"] = Math.Round(bottomMm, 2);
                    double maxDeviation = Math.Max(
                        Math.Max(Math.Abs(leftMm - marginMm), Math.Abs(topMm - marginMm)),
                        Math.Max(Math.Abs(rightMm - marginMm), Math.Abs(bottomMm - marginMm)));
                    checks["marginDeviationMaxMm"] = Math.Round(maxDeviation, 2);
                    if (maxDeviation > 0.55)
                    {
                        throw new InvalidOperationException(
                            "crop+trimMargin 渲染余量偏离 " + marginMm + "mm 超过 0.5mm。");
                    }

                    one["ok"] = true;
                }
                catch (Exception ex)
                {
                    one["ok"] = false;
                    one["error"] = ex.Message;
                    allOk = false;
                    lastError = ex.Message;
                }

                cases.Add(one);
            }

            result["ok"] = allOk;
            if (!allOk)
            {
                result["error"] = lastError;
            }

            return result;
        }

        /// <summary>通过真实 JS↔Host 桥发送 export-vector-pdf 并取回 PDF bytes。</summary>
        private async Task<byte[]> SendVectorPdfRequestAsync(JObject spec, string requestId, int timeoutSeconds)
        {
            string specJson = spec.ToString(Formatting.None);
            string jsPost = "(function(){ if (!window.chrome || !window.chrome.webview) { return 'no-webview'; }" +
                            " window.__figplayVectorPdfCropB64 = '';" +
                            " window.chrome.webview.postMessage(JSON.stringify({ type: 'export-vector-pdf', requestId: " +
                            JsonConvert.ToString(requestId) + ", spec: " + specJson + " })); return 'sent'; })()";

            string sent = await _form.EvalStringAsync(jsPost);
            if (!string.Equals(sent, "sent", StringComparison.Ordinal))
            {
                throw new InvalidOperationException("window.chrome.webview 不可用：" + sent);
            }

            string probe = "(function(){ var a = window.__figplayHostMessages || [];" +
                           " for (var i = 0; i < a.length; i++) { var d = a[i];" +
                           "   try { var o = (typeof d === 'string') ? JSON.parse(d) : d;" +
                           "     if (o && o.type === 'vector-pdf-export' && o.requestId === " +
                           JsonConvert.ToString(requestId) + ") {" +
                           "       if (o.ok && o.base64) { try { window.__figplayVectorPdfCropB64 = String(o.base64); } catch (e) {} }" +
                           "       return JSON.stringify({ found: true, ok: !!o.ok, bytes: o.bytes || 0," +
                           "         error: o.error || '', diagnostics: o.diagnostics || [] }); } } catch (e) {} }" +
                           " return JSON.stringify({ found: false, count: a.length }); })()";

            JObject found = null;
            Stopwatch stopwatch = Stopwatch.StartNew();
            while (stopwatch.Elapsed < TimeSpan.FromSeconds(timeoutSeconds))
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

                await Task.Delay(250);
            }

            if (found == null || !found.Value<bool>("found"))
            {
                throw new InvalidOperationException(timeoutSeconds + " 秒内未收到 crop 矢量 PDF 响应。");
            }

            if (!found.Value<bool>("ok"))
            {
                throw new InvalidOperationException(
                    "crop 矢量 PDF 桥返回失败：" + (found.Value<string>("error") ?? "未知原因"));
            }

            string pdfBase64 = await _form.EvalStringAsync("window.__figplayVectorPdfCropB64 || ''");
            if (string.IsNullOrEmpty(pdfBase64))
            {
                throw new InvalidOperationException("未能从 crop 桥响应中取回 PDF base64。");
            }

            return Convert.FromBase64String(pdfBase64);
        }
    }
}
