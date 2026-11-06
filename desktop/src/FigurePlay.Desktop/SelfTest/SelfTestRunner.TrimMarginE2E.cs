using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.Globalization;
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
    /// v1.3.2 应用级 trimMargin E2E：
    ///   - 基础用例：用户 trim=0mm（应用实际发送 trimMarginMm=max(1,0)=1mm）；
    ///   - 用户场景：MATLAB .fig + 编号底部中间（inset 1.5、offsetX 1.2、offsetY 5、Times 9pt），
    ///     用户 trim=0mm（安全边距 1mm）与 trim=2mm 各一次；
    ///   - pdftoppm 渲染后四边墨迹余量应 ≈ 安全边距（±0.5mm），底部编号完整（底部条带存在墨迹 + pdftotext 文本）；
    ///   - pdfimages 0 位图。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> RunAppVectorTrimMarginE2EAsync(JObject importState)
        {
            JObject result = new JObject();
            try
            {
                bool hasApi = await _form.EvalBoolAsync(
                    "!!(window.__FIGPLAY__ && typeof window.__FIGPLAY__.exportVectorPdfBase64 === 'function' && " +
                    "typeof window.__FIGPLAY__.getInkCropBox === 'function' && typeof window.__FIGPLAY__.setLabelConfig === 'function')");
                result["available"] = hasApi;
                if (!hasApi)
                {
                    throw new InvalidOperationException(
                        "应用未提供 exportVectorPdfBase64/getInkCropBox/setLabelConfig，无法做 trimMargin E2E。");
                }

                string originalLabel = await _form.EvalStringAsync(
                    "(function(){ try { return JSON.stringify(window.__FIGPLAY__.getState().label || {}); } catch(e){ return '{}'; } })()");
                result["originalLabel"] = originalLabel;

                // 基础用例：默认（左上）编号，用户 trim=0 → 应用发送安全边距 1mm
                JObject basic = await RunTrimMarginCaseAsync(
                    importState,
                    "basic-default-label",
                    false,
                    0,
                    1.0,
                    "app-vector-e2e-trimmed");
                result["basic"] = basic;
                if (!basic.Value<bool>("ok"))
                {
                    throw new InvalidOperationException("基础 trim 用例失败：" + (basic.Value<string>("error") ?? "未知"));
                }

                // 用户场景：编号底部中间（与反馈用户参数一致）
                string setLabel = "(function(){ try { window.__FIGPLAY__.setLabelConfig({" +
                    " position: 'bc', insetMm: 1.5, offsetXmm: 1.2, offsetYmm: 5," +
                    " fontSizePt: 9, fontFamily: 'times', show: true, scheme: 'alpha-paren'," +
                    " bold: false, italic: false, align: 'center' }); return 'ok'; } catch(e){ return 'err:' + String(e); } })()";
                string labelApplied = await _form.EvalStringAsync(setLabel);
                result["bottomCenterLabelApplied"] = labelApplied;
                if (labelApplied != "ok")
                {
                    throw new InvalidOperationException("设置底部中间编号失败：" + labelApplied);
                }

                JObject labelTrim0 = await RunTrimMarginCaseAsync(
                    importState,
                    "label-bottom-center trim=0",
                    true,
                    0,
                    1.0,
                    "app-vector-trim-label-1mm");
                result["labelTrim0"] = labelTrim0;

                JObject labelTrim2 = await RunTrimMarginCaseAsync(
                    importState,
                    "label-bottom-center trim=2",
                    true,
                    2,
                    2.0,
                    "app-vector-trim-label-2mm");
                result["labelTrim2"] = labelTrim2;

                // 恢复编号配置
                string restore = "(function(){ try { window.__FIGPLAY__.setLabelConfig(" +
                                 (string.IsNullOrEmpty(originalLabel) ? "{}" : originalLabel) +
                                 "); return 'ok'; } catch(e){ return 'err'; } })()";
                await _form.EvalStringAsync(restore);
                await _form.EvalStringAsync(
                    "(function(){ try { window.__FIGPLAY__.setExportOptions({ trimPdf: false }); return 'ok'; } catch(e){ return 'err'; } })()");

                if (!labelTrim0.Value<bool>("ok"))
                {
                    throw new InvalidOperationException("底部编号 trim=0 用例失败：" +
                                                        (labelTrim0.Value<string>("error") ?? "未知"));
                }

                if (!labelTrim2.Value<bool>("ok"))
                {
                    throw new InvalidOperationException("底部编号 trim=2 用例失败：" +
                                                        (labelTrim2.Value<string>("error") ?? "未知"));
                }

                result["ok"] = true;
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = ex.Message;
                try
                {
                    await _form.EvalStringAsync(
                        "(function(){ try { window.__FIGPLAY__.setExportOptions({ trimPdf: false }); return 'ok'; } catch(e){ return 'err'; } })()");
                }
                catch
                {
                    // ignore
                }
            }

            return result;
        }

        private async Task<JObject> RunTrimMarginCaseAsync(
            JObject importState,
            string caseName,
            bool checkBottomLabel,
            double userTrimMm,
            double expectedMarginMm,
            string filePrefix)
        {
            JObject result = new JObject();
            result["case"] = caseName;
            result["userTrimMm"] = userTrimMm;
            result["expectedMarginMm"] = expectedMarginMm;
            try
            {
                string userTrim = userTrimMm.ToString("0.###", CultureInfo.InvariantCulture);
                string startScript = "(function(){ try { const FP = window.__FIGPLAY__;" +
                    " if (!FP) return 'no-api';" +
                    " FP.setExportOptions({ format: 'pdf', scope: 'current', vectorPdf: true, saveAs: false," +
                    " trimPdf: true, trimMarginMm: " + userTrim + " });" +
                    " window.__appTrimCaseCrop = null;" +
                    " window.__appTrimCaseResult = null;" +
                    " window.__appTrimCaseB64 = '';" +
                    " window.__appTrimCaseState = 'running';" +
                    " FP.getInkCropBox().then(function(c) {" +
                    "   try { window.__appTrimCaseCrop = JSON.stringify(c || null); } catch (e) {}" +
                    "   return FP.exportVectorPdfBase64();" +
                    " }).then(function(r) {" +
                    "   try { window.__appTrimCaseResult = JSON.stringify({ ok: !!r.ok, bytes: r.bytes || 0," +
                    "     engine: r.engine || '', vectorPanels: r.vectorPanels || 0," +
                    "     rasterPanels: r.rasterPanels || 0, error: r.error || '' });" +
                    "     if (r.ok && r.base64) { window.__appTrimCaseB64 = r.base64; }" +
                    "   } catch (e) { window.__appTrimCaseResult = JSON.stringify({ ok: false, error: String(e) }); }" +
                    "   window.__appTrimCaseState = 'done';" +
                    " }).catch(function(e) {" +
                    "   window.__appTrimCaseResult = JSON.stringify({ ok: false, error: String((e && e.message) || e) });" +
                    "   window.__appTrimCaseState = 'done';" +
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

                JObject exportResult = null;
                string cropBoxJson = null;
                while (watch.Elapsed < TimeSpan.FromSeconds(180))
                {
                    string state = await _form.EvalStringAsync("window.__appTrimCaseState || ''");
                    if (state == "done")
                    {
                        string rawResult = await _form.EvalStringAsync("window.__appTrimCaseResult || ''");
                        if (!string.IsNullOrEmpty(rawResult))
                        {
                            exportResult = JObject.Parse(rawResult);
                        }

                        cropBoxJson = await _form.EvalStringAsync("window.__appTrimCaseCrop || ''");
                        break;
                    }

                    await Task.Delay(500);
                }

                watch.Stop();
                result["trimExportMs"] = watch.ElapsedMilliseconds;
                if (exportResult == null)
                {
                    throw new InvalidOperationException("trim 导出 180 秒内未完成。");
                }

                result["exportResult"] = exportResult;
                if (!exportResult.Value<bool>("ok"))
                {
                    throw new InvalidOperationException(
                        "矢量 PDF 导出失败：" + (exportResult.Value<string>("error") ?? "未知原因"));
                }

                if (exportResult.Value<int>("rasterPanels") != 0)
                {
                    throw new InvalidOperationException(
                        "trim vector PDF rasterPanels 期望 0，实际 " + exportResult.Value<int>("rasterPanels"));
                }

                JObject cropBox = string.IsNullOrEmpty(cropBoxJson) ? null : JObject.Parse(cropBoxJson);
                if (cropBox != null)
                {
                    result["inkCropBox"] = cropBox;
                }

                string base64 = await _form.EvalStringAsync("window.__appTrimCaseB64 || ''");
                if (string.IsNullOrEmpty(base64))
                {
                    throw new InvalidOperationException("未能从应用导出结果取回 PDF base64。");
                }

                byte[] pdfBytes = Convert.FromBase64String(base64);
                string pdfPath = Path.Combine(_options.OutDir, filePrefix + ".pdf");
                File.WriteAllBytes(pdfPath, pdfBytes);
                result["pdfPath"] = pdfPath;
                result["pdfBytes"] = pdfBytes.Length;
                if (pdfBytes.Length != exportResult.Value<int>("bytes"))
                {
                    throw new InvalidOperationException("应用返回 bytes 与实际 PDF 大小不一致。");
                }

                if (pdfBytes.Length < 1000 ||
                    pdfBytes[0] != (byte)'%' || pdfBytes[1] != (byte)'P' ||
                    pdfBytes[2] != (byte)'D' || pdfBytes[3] != (byte)'F')
                {
                    throw new InvalidOperationException("应用导出的内容不是有效 PDF。");
                }

                JObject checks = new JObject();
                result["checks"] = checks;

                JObject geom = importState["geom"] as JObject;
                double pageWidthMm = geom == null ? 0 : geom.Value<double>("widthMm");
                double pageHeightMm = geom == null ? 0 : geom.Value<double>("heightMm");

                // 1) 页面尺寸合理且不超过原页面
                string pdfinfoExe = FindPdfTool("pdfinfo");
                string pdfimagesExe = FindPdfTool("pdfimages");
                string pdftotextExe = FindPdfTool("pdftotext");
                string pdftoppmExe = FindPdfTool("pdftoppm");

                bool pageOk = false;
                double pageWidthPt = 0;
                double pageHeightPt = 0;
                if (!string.IsNullOrEmpty(pdfinfoExe))
                {
                    string infoOutput = RunTool(pdfinfoExe, QuoteArgument(pdfPath), 30000);
                    checks["pdfinfoOutput"] = Shorten(infoOutput, 1400);
                    int pages;
                    if (TryParsePdfInfo(infoOutput, out pageWidthPt, out pageHeightPt, out pages))
                    {
                        checks["pageWidthPt"] = Math.Round(pageWidthPt, 2);
                        checks["pageHeightPt"] = Math.Round(pageHeightPt, 2);
                        checks["pages"] = pages;
                        double pageWidthMmActual = pageWidthPt / 72.0 * 25.4;
                        double pageHeightMmActual = pageHeightPt / 72.0 * 25.4;
                        checks["pageWidthMm"] = Math.Round(pageWidthMmActual, 2);
                        checks["pageHeightMm"] = Math.Round(pageHeightMmActual, 2);
                        pageOk = pages == 1 &&
                                 pageWidthMmActual > 20 && pageHeightMmActual > 20 &&
                                 (pageWidthMm <= 0 || pageWidthMmActual <= pageWidthMm + 2.0) &&
                                 (pageHeightMm <= 0 || pageHeightMmActual <= pageHeightMm + 2.0);
                    }
                }

                if (!pageOk)
                {
                    double mediaWidth;
                    double mediaHeight;
                    if (TryGetPdfMediaBox(pdfBytes, out mediaWidth, out mediaHeight))
                    {
                        checks["mediaBoxWidthPt"] = Math.Round(mediaWidth, 2);
                        checks["mediaBoxHeightPt"] = Math.Round(mediaHeight, 2);
                        double wMm = mediaWidth / 72.0 * 25.4;
                        double hMm = mediaHeight / 72.0 * 25.4;
                        pageOk = wMm > 20 && hMm > 20 &&
                                 (pageWidthMm <= 0 || wMm <= pageWidthMm + 2.0) &&
                                 (pageHeightMm <= 0 || hMm <= pageHeightMm + 2.0);
                    }
                }

                checks["pageOk"] = pageOk;
                if (!pageOk)
                {
                    throw new InvalidOperationException("trim PDF 页面尺寸异常（应不超过原页面 170×193mm）。");
                }

                // 2) 无位图
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
                    throw new InvalidOperationException("trim PDF 中检测到位图图像。");
                }

                // 3) 标签文字存在
                bool labelTextOk = false;
                if (!string.IsNullOrEmpty(pdftotextExe))
                {
                    string textOutput = RunTool(pdftotextExe, QuoteArgument(pdfPath) + " -", 60000);
                    checks["text"] = Shorten(textOutput, 400);
                    labelTextOk = textOutput != null && textOutput.IndexOf("(a)", StringComparison.Ordinal) >= 0;
                }

                checks["labelTextOk"] = labelTextOk;
                if (string.IsNullOrEmpty(pdftotextExe) == false && !labelTextOk)
                {
                    throw new InvalidOperationException("trim PDF 中未提取到编号文字 \"(a)\"。");
                }

                // 4) pdftoppm 渲染 → 四边墨迹余量 ≈ 安全边距（±0.5mm）
                if (string.IsNullOrEmpty(pdftoppmExe))
                {
                    throw new InvalidOperationException("缺少 pdftoppm，无法验证渲染后墨迹余量。");
                }

                string renderPrefix = Path.Combine(_options.OutDir, filePrefix);
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

                const int Dpi = 150;
                double leftMm;
                double topMm;
                double rightMm;
                double bottomMm;
                int renderWidth;
                int renderHeight;
                bool measured = MeasureWhiteMargins(
                    renderPng,
                    Dpi / 25.4,
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
                    throw new InvalidOperationException("trim PDF 渲染后为全白页面。");
                }

                checks["leftMarginMm"] = Math.Round(leftMm, 2);
                checks["topMarginMm"] = Math.Round(topMm, 2);
                checks["rightMarginMm"] = Math.Round(rightMm, 2);
                checks["bottomMarginMm"] = Math.Round(bottomMm, 2);

                double[] margins = { leftMm, topMm, rightMm, bottomMm };
                double maxDeviation = 0;
                foreach (double margin in margins)
                {
                    maxDeviation = Math.Max(maxDeviation, Math.Abs(margin - expectedMarginMm));
                }

                checks["marginDeviationMaxMm"] = Math.Round(maxDeviation, 2);
                checks["marginsOk"] = maxDeviation <= 0.55;
                if (maxDeviation > 0.55)
                {
                    throw new InvalidOperationException(
                        "trim 后四边墨迹余量偏离目标 " + expectedMarginMm + "mm 超过 0.5mm：L=" +
                        Math.Round(leftMm, 2) + " T=" + Math.Round(topMm, 2) + " R=" +
                        Math.Round(rightMm, 2) + " B=" + Math.Round(bottomMm, 2) + " mm。");
                }

                // 5) 底部编号完整性：底部条带存在墨迹，且最底墨迹距页底 ≈ 安全边距
                if (checkBottomLabel)
                {
                    int bottomInkPixels = CountBottomStripInkPixels(
                        renderPng,
                        renderWidth,
                        renderHeight,
                        Dpi / 25.4,
                        expectedMarginMm + 8.0);
                    checks["bottomLabelInkPixels"] = bottomInkPixels;
                    checks["bottomLabelWidthBandMm"] = expectedMarginMm + 8.0;
                    if (bottomInkPixels < 30)
                    {
                        throw new InvalidOperationException(
                            "trim PDF 底部 " + (expectedMarginMm + 8.0) + "mm 条带内墨迹像素过少（" +
                            bottomInkPixels + "）：编号可能被裁掉。");
                    }

                    checks["bottomLabelIntact"] = true;
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

        /// <summary>统计渲染图底部条带（距底 stripMm 内）的非白像素数量。</summary>
        private static int CountBottomStripInkPixels(
            string pngPath,
            int width,
            int height,
            double pixelsPerMm,
            double stripMm)
        {
            if (width <= 0 || height <= 0)
            {
                return 0;
            }

            int stripPx = Math.Max(1, (int)Math.Round(stripMm * pixelsPerMm));
            int startY = Math.Max(0, height - stripPx);
            int count = 0;

            using (Bitmap source = new Bitmap(pngPath))
            using (Bitmap bitmap = source.Clone(
                new Rectangle(0, 0, source.Width, source.Height),
                PixelFormat.Format32bppArgb))
            {
                BitmapData data = bitmap.LockBits(
                    new Rectangle(0, 0, bitmap.Width, bitmap.Height),
                    ImageLockMode.ReadOnly,
                    PixelFormat.Format32bppArgb);
                try
                {
                    byte[] row = new byte[Math.Abs(data.Stride)];
                    for (int y = startY; y < bitmap.Height; y++)
                    {
                        Marshal.Copy(IntPtr.Add(data.Scan0, y * data.Stride), row, 0, row.Length);
                        for (int x = 0; x < bitmap.Width; x++)
                        {
                            int offset = x * 4;
                            if (row[offset + 3] == 0)
                            {
                                continue;
                            }

                            int b = row[offset];
                            int g = row[offset + 1];
                            int r = row[offset + 2];
                            if (Math.Abs(r - 255) > 8 || Math.Abs(g - 255) > 8 || Math.Abs(b - 255) > 8)
                            {
                                count++;
                            }
                        }
                    }
                }
                finally
                {
                    bitmap.UnlockBits(data);
                }
            }

            return count;
        }
    }
}
