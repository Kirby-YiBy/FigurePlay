using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>
    /// v1.4.1 用户 config1 场景的编号 WYSIWYG 端到端校验：
    ///   2 行×3 列、width170、4:3、colGap=-4、rowGap=1、autoPad、
    ///   label bc/inset1.5/offsetX1/offsetY4/Times 9pt、PDF vector + trim0。
    /// 通过包装 FP.desktop.exportVectorPdf 捕获 app 发送的真实 spec（含 textLeftMm/textTopMm/textWmm/textHmm），
    /// 导出后 pdftotext -bbox 校验 PDF 文字 bbox 与 app 预览 bbox（扣除最终 crop）的误差。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> RunConfig1LabelWysiwygTestAsync()
        {
            JObject result = new JObject();
            try
            {
                bool hasApi = await _form.EvalBoolAsync(
                    "!!(window.__FIGPLAY__ && typeof window.__FIGPLAY__.exportVectorPdfBase64 === 'function' && " +
                    "window.FP && window.FP.desktop && typeof window.FP.desktop.exportVectorPdf === 'function')");
                result["available"] = hasApi;
                if (!hasApi)
                {
                    throw new InvalidOperationException(
                        "应用未提供 exportVectorPdfBase64 / FP.desktop.exportVectorPdf，无法做 config1 WYSIWYG 测试。");
                }

                string startScript = "(function(){ try { const FP = window.__FIGPLAY__;" +
                    " if (!FP || !window.FP || !window.FP.desktop) return 'no-api';" +
                    " const state = FP.getState();" +
                    " const saved = JSON.stringify({ layout: state.layout, label: state.label, export: state.export });" +
                    " window.__figplayConfig1 = { phase: 'running', saved: saved, spec: null, result: null, b64: '' };" +
                    " FP.setLayout(2, 3);" +
                    " FP.setLayoutOptions({ colGap: -4, rowGap: 1, autoPad: true });" +
                    " FP.setLabelConfig({ position: 'bc', insetMm: 1.5, offsetXmm: 1, offsetYmm: 4," +
                    "   fontFamily: 'times', fontSizePt: 9, bold: false, italic: false," +
                    "   show: true, scheme: 'alpha-paren', bg: 'none' });" +
                    " FP.setExportOptions({ format: 'pdf', scope: 'current', vectorPdf: true," +
                    "   saveAs: false, trimPdf: true, trimMarginMm: 0 });" +
                    " const bridge = window.FP.desktop;" +
                    " const originalExport = bridge.exportVectorPdf;" +
                    " bridge.exportVectorPdf = function(spec) {" +
                    "   try { window.__figplayConfig1.spec = JSON.stringify(spec); } catch (e) {}" +
                    "   return originalExport.apply(bridge, arguments);" +
                    " };" +
                    " const finish = function() { try { bridge.exportVectorPdf = originalExport; } catch (e) {} window.__figplayConfig1.phase = 'done'; };" +
                    " FP.exportVectorPdfBase64().then(function(r) {" +
                    "   try { window.__figplayConfig1.result = JSON.stringify({ ok: !!r.ok, bytes: r.bytes || 0, error: r.error || '' });" +
                    "     if (r.ok && r.base64) { window.__figplayConfig1.b64 = r.base64; } }" +
                    "   catch (e) { window.__figplayConfig1.result = JSON.stringify({ ok: false, error: String(e) }); }" +
                    "   finish();" +
                    " }).catch(function(e) {" +
                    "   window.__figplayConfig1.result = JSON.stringify({ ok: false, error: String((e && e.message) || e) });" +
                    "   finish();" +
                    " });" +
                    " return 'started'; } catch (e) { return 'error:' + String((e && e.message) || e); } })()";

                Stopwatch watch = Stopwatch.StartNew();
                string started = await _form.EvalStringAsync(startScript);
                result["started"] = started;
                if (started != "started")
                {
                    throw new InvalidOperationException("启动 config1 WYSIWYG 测试失败：" + started);
                }

                JObject exportResult = null;
                string specJson = null;
                string base64 = string.Empty;
                while (watch.Elapsed < TimeSpan.FromSeconds(180))
                {
                    string state = await _form.EvalStringAsync("window.__figplayConfig1 ? window.__figplayConfig1.phase : ''");
                    if (state == "done")
                    {
                        string rawResult = await _form.EvalStringAsync("window.__figplayConfig1.result || ''");
                        specJson = await _form.EvalStringAsync("window.__figplayConfig1.spec || ''");
                        base64 = await _form.EvalStringAsync("window.__figplayConfig1.b64 || ''");
                        if (!string.IsNullOrEmpty(rawResult))
                        {
                            exportResult = JObject.Parse(rawResult);
                        }

                        break;
                    }

                    await Task.Delay(150);
                }

                watch.Stop();
                result["exportMs"] = watch.ElapsedMilliseconds;
                if (exportResult == null)
                {
                    throw new InvalidOperationException("config1 导出 180 秒内未完成。");
                }

                result["exportResult"] = exportResult;
                if (!exportResult.Value<bool>("ok"))
                {
                    throw new InvalidOperationException(
                        "config1 矢量 PDF 导出失败：" + (exportResult.Value<string>("error") ?? "未知原因"));
                }

                if (string.IsNullOrEmpty(specJson))
                {
                    throw new InvalidOperationException("未捕获到 app 发送的矢量 PDF spec（无法校验 text bbox）。");
                }

                if (string.IsNullOrEmpty(base64))
                {
                    throw new InvalidOperationException("config1 导出未返回 PDF base64。");
                }

                JObject spec = JObject.Parse(specJson);
                result["spec"] = spec;
                JObject crop = spec["crop"] as JObject;
                double trimMarginMm = spec.Value<double?>("trimMarginMm") ?? 0;
                if (crop == null)
                {
                    throw new InvalidOperationException("config1 spec 缺少 crop。");
                }

                JArray labels = spec["labels"] as JArray;
                if (labels == null || labels.Count == 0)
                {
                    throw new InvalidOperationException("config1 spec 没有 labels。");
                }

                JObject label = labels[0] as JObject;
                if (label == null || label["textLeftMm"] == null || label["textTopMm"] == null ||
                    label["textWmm"] == null || label["textHmm"] == null)
                {
                    throw new InvalidOperationException(
                        "app v1.4.1 spec 缺少 textLeftMm/textTopMm/textWmm/textHmm（无法校验预览 bbox）。");
                }

                double textLeft = label.Value<double>("textLeftMm");
                double textTop = label.Value<double>("textTopMm");
                double textW = label.Value<double>("textWmm");
                double textH = label.Value<double>("textHmm");
                double cropX = crop.Value<double>("xMm");
                double cropY = crop.Value<double>("yMm");
                // 最终 crop 由宿主的墨迹探针决定（= ink bbox + margin），未必等于 app crop - margin；
                // 从宿主 trace 的最后一组版日志读取，保证与 PDF 页真实原点一致。
                double finalCropX = Math.Max(0, cropX - trimMarginMm);
                double finalCropY = Math.Max(0, cropY - trimMarginMm);
                string finalCropSource = "fallback(crop-margin)";
                try
                {
                    string tracePath = System.IO.Path.Combine(
                        FigurePlay.Desktop.AppPaths.TempRoot, "vectorpdf-trace.log");
                    if (System.IO.File.Exists(tracePath))
                    {
                        string[] traceLines = System.IO.File.ReadAllLines(tracePath);
                        for (int i = traceLines.Length - 1; i >= 0; i--)
                        {
                            string line = traceLines[i];
                            int at = line.IndexOf("final compose+pdf start crop=", StringComparison.Ordinal);
                            if (at < 0)
                            {
                                continue;
                            }

                            string cropText = line.Substring(at + "final compose+pdf start crop=".Length).Trim();
                            Match m = Regex.Match(cropText, @"^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)x(-?\d+(?:\.\d+)?)mm");
                            if (!m.Success)
                            {
                                continue;
                            }

                            finalCropX = double.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture);
                            finalCropY = double.Parse(m.Groups[2].Value, CultureInfo.InvariantCulture);
                            finalCropSource = "trace";
                            break;
                        }
                    }
                }
                catch
                {
                    // fallback
                }
                result["finalCropXmm"] = Math.Round(finalCropX, 3);
                result["finalCropSource"] = finalCropSource;
                result["finalCropYmm"] = Math.Round(finalCropY, 3);
                result["textBboxMm"] = new JObject
                {
                    ["left"] = Math.Round(textLeft, 3),
                    ["top"] = Math.Round(textTop, 3),
                    ["w"] = Math.Round(textW, 3),
                    ["h"] = Math.Round(textH, 3),
                    ["label"] = label.Value<string>("text"),
                    ["align"] = label.Value<string>("align"),
                };
                result["expectedPdfBboxMm"] = new JObject
                {
                    ["left"] = Math.Round(textLeft - finalCropX, 3),
                    ["top"] = Math.Round(textTop - finalCropY, 3),
                    ["right"] = Math.Round(textLeft + textW - finalCropX, 3),
                    ["bottom"] = Math.Round(textTop + textH - finalCropY, 3),
                    ["centerX"] = Math.Round(textLeft + textW / 2.0 - finalCropX, 3),
                    ["centerY"] = Math.Round(textTop + textH / 2.0 - finalCropY, 3),
                };

                byte[] pdfBytes = Convert.FromBase64String(base64);
                string pdfPath = Path.Combine(_options.OutDir, "config1-label-wysiwyg.pdf");
                File.WriteAllBytes(pdfPath, pdfBytes);
                result["pdfPath"] = pdfPath;
                result["pdfBytes"] = pdfBytes.Length;
                if (pdfBytes.Length != exportResult.Value<int>("bytes"))
                {
                    throw new InvalidOperationException("config1 返回 bytes 与实际 PDF 大小不一致。");
                }

                if (pdfBytes.Length < 1000 ||
                    pdfBytes[0] != (byte)'%' || pdfBytes[1] != (byte)'P' ||
                    pdfBytes[2] != (byte)'D' || pdfBytes[3] != (byte)'F')
                {
                    throw new InvalidOperationException("config1 导出的内容不是有效 PDF。");
                }

                JObject checks = new JObject();
                result["checks"] = checks;

                string pdftotextExe = FindPdfTool("pdftotext");
                string pdfimagesExe = FindPdfTool("pdfimages");
                if (string.IsNullOrEmpty(pdftotextExe))
                {
                    throw new InvalidOperationException("缺少 pdftotext，无法校验 config1 编号 bbox。");
                }

                string bboxOutput = RunTool(
                    pdftotextExe,
                    "-bbox " + QuoteArgument(pdfPath) + " -",
                    60000);
                checks["bboxSample"] = Shorten(bboxOutput, 1400);
                Dictionary<string, PointMm> words = ParseWordCenters(bboxOutput);
                // 取第一个与 label.text 对应的单词（如 (a) → a）
                string expectedWordKey = Regex.Replace(
                    label.Value<string>("text") ?? string.Empty, "[^0-9A-Za-z]", string.Empty);
                PointMm word;
                if (expectedWordKey.Length != 1 || !words.TryGetValue(expectedWordKey, out word))
                {
                    throw new InvalidOperationException(
                        "config1 PDF 中未找到标签文字 " + (label.Value<string>("text") ?? "?") +
                        " 的 bbox；已解析 words=" + string.Join(",", new List<string>(words.Keys).ToArray()));
                }

                double actualLeft = word.LeftMm;
                double actualRight = word.RightMm;
                double actualTop = word.TopMm;
                double actualBottom = word.BottomMm;
                double actualCenterX = (actualLeft + actualRight) / 2.0;
                double actualCenterY = (actualTop + actualBottom) / 2.0;
                checks["pdfBboxMm"] = new JObject
                {
                    ["left"] = Math.Round(actualLeft, 3),
                    ["top"] = Math.Round(actualTop, 3),
                    ["right"] = Math.Round(actualRight, 3),
                    ["bottom"] = Math.Round(actualBottom, 3),
                    ["centerX"] = Math.Round(actualCenterX, 3),
                    ["centerY"] = Math.Round(actualCenterY, 3),
                    ["width"] = Math.Round(actualRight - actualLeft, 3),
                    ["height"] = Math.Round(actualBottom - actualTop, 3),
                };
                double expectedTop = textTop - finalCropY;
                double expectedBottom = textTop + textH - finalCropY;
                double anchorX = label.Value<double?>("xMm") ?? (textLeft + textW / 2.0);
                double expectedCenterX = anchorX - finalCropX;
                double expectedCenterY = textTop + textH / 2.0 - finalCropY;
                checks["verticalTopErrorMm"] = Math.Round(actualTop - expectedTop, 3);
                checks["verticalBottomErrorMm"] = Math.Round(actualBottom - expectedBottom, 3);
                checks["verticalCenterErrorMm"] = Math.Round(actualCenterY - expectedCenterY, 3);
                checks["horizontalCenterErrorMm"] = Math.Round(actualCenterX - expectedCenterX, 3);
                checks["horizontalAnchorXmm"] = Math.Round(anchorX, 3);

                bool noBitmaps = false;
                if (!string.IsNullOrEmpty(pdfimagesExe))
                {
                    string list = RunTool(pdfimagesExe, "-list " + QuoteArgument(pdfPath), 60000);
                    checks["imageCount"] = CountPdfImageRows(list);
                    noBitmaps = checks.Value<int>("imageCount") == 0;
                    checks["noBitmaps"] = noBitmaps;
                }

                double verticalToleranceMm = 0.35;
                double horizontalToleranceMm = 0.05;
                checks["verticalToleranceMm"] = verticalToleranceMm;
                checks["horizontalToleranceMm"] = horizontalToleranceMm;
                bool verticalOk = Math.Abs(checks.Value<double>("verticalTopErrorMm")) <= verticalToleranceMm &&
                                  Math.Abs(checks.Value<double>("verticalBottomErrorMm")) <= verticalToleranceMm &&
                                  Math.Abs(checks.Value<double>("verticalCenterErrorMm")) <= verticalToleranceMm / 2.0;
                bool horizontalOk = Math.Abs(checks.Value<double>("horizontalCenterErrorMm")) <= horizontalToleranceMm;
                bool ok = verticalOk && horizontalOk && noBitmaps;
                checks["verticalOk"] = verticalOk;
                checks["horizontalOk"] = horizontalOk;
                checks["ok"] = ok;
                result["ok"] = ok;
                if (!ok)
                {
                    List<string> problems = new List<string>();
                    if (!verticalOk)
                    {
                        problems.Add("垂直误差超限：top=" + checks.Value<double>("verticalTopErrorMm") +
                                     "mm bottom=" + checks.Value<double>("verticalBottomErrorMm") +
                                     "mm center=" + checks.Value<double>("verticalCenterErrorMm") + "mm");
                    }

                    if (!horizontalOk)
                    {
                        problems.Add("水平中心误差 " + checks.Value<double>("horizontalCenterErrorMm") + "mm");
                    }

                    if (!noBitmaps)
                    {
                        problems.Add("检测到位图");
                    }

                    result["error"] = string.Join("；", problems.ToArray());
                }
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
