using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using FigurePlay.Desktop.Bridge;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>
    /// SelfTestRunner 的 v1.3 新增部分：
    ///  - PowerPoint 矢量 PDF 真实往返测试（真实 MATLAB EMF → 桥 → PDF，pdfimages 无位图 / pdfinfo 页尺寸 / pdftotext 标签文字）
    ///  - WebView2 showSaveFilePicker / isSecureContext 能力探测
    ///  - EMF 记录解析、PDF 托管校验、外部工具定位等辅助函数
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private byte[] _lastRealMatlabEmfBytes;
        private string _lastRealMatlabEmfSource;

        // ---------------------------------------------------------------- 矢量 PDF 测试

        private async Task<JObject> RunVectorPdfTestAsync()
        {
            JObject result = new JObject();
            try
            {
                bool powerPointAvailable = PowerPointVectorExporter.IsPowerPointAvailable();
                result["available"] = powerPointAvailable;
                if (!powerPointAvailable)
                {
                    result["skipped"] = true;
                    result["error"] = "未安装 PowerPoint（或 COM 不可用），矢量 PDF 导出测试跳过。";
                    return result;
                }

                result["engine"] = "PowerPoint";
                result["uiMode"] = "Presentations.Add(0)（无演示窗口，无模态对话框）";

                byte[] emfBytes = _lastRealMatlabEmfBytes;
                string emfSource = _lastRealMatlabEmfSource;
                if (!EmfValidator.LooksLikeEmf(emfBytes))
                {
                    string recordedPath = Path.Combine(_options.OutDir, "test-figure.emf");
                    if (File.Exists(recordedPath))
                    {
                        byte[] candidate = File.ReadAllBytes(recordedPath);
                        if (EmfValidator.LooksLikeEmf(candidate))
                        {
                            emfBytes = candidate;
                            emfSource = "C# Metafile 录制";
                        }
                    }
                }

                if (!EmfValidator.LooksLikeEmf(emfBytes))
                {
                    throw new InvalidOperationException("没有可用的真实 EMF 输入（MATLAB 现场 EMF 与 C# 录制 EMF 均不可用）。");
                }

                result["emfSource"] = emfSource ?? "unknown";
                result["emfBytes"] = emfBytes.Length;
                result["emfHeader"] = EmfValidator.DescribeHeader(emfBytes);

                // 页面 170 x 120 mm（与 170mm 成品宽度一致），一个 EMF 面板 + 一个标签
                const double widthMm = 170;
                const double heightMm = 120;
                string labelText = "(a) FigurePlay vector test / 矢量测试";

                JObject spec = new JObject
                {
                    ["widthMm"] = widthMm,
                    ["heightMm"] = heightMm,
                    ["background"] = "#ffffff",
                    ["panels"] = new JArray(
                        new JObject
                        {
                            ["xMm"] = 8,
                            ["yMm"] = 8,
                            ["wMm"] = 154,
                            ["hMm"] = 96,
                            ["image"] = new JObject
                            {
                                ["kind"] = "emf",
                                ["base64"] = Convert.ToBase64String(emfBytes),
                            },
                            ["fit"] = "contain",
                            ["rotation"] = 0,
                            ["border"] = new JObject
                            {
                                ["on"] = true,
                                ["widthMm"] = 0.25,
                                ["color"] = "#000000",
                            },
                        }),
                    ["labels"] = new JArray(
                        new JObject
                        {
                            ["text"] = labelText,
                            ["xMm"] = 8,
                            ["yMm"] = 106,
                            ["boxXmm"] = 8,
                            ["boxYmm"] = 106,
                            ["boxWmm"] = 154,
                            ["boxHmm"] = 9,
                            ["fontSizePt"] = 10,
                            ["fontName"] = "Times New Roman",
                            ["bold"] = true,
                            ["italic"] = false,
                            ["color"] = "#000000",
                            ["align"] = "left",
                            ["bg"] = "none",
                        }),
                };

                string specJson = spec.ToString(Formatting.None);
                string requestId = "selftest-vector-" + DateTime.Now.Ticks;
                result["requestId"] = requestId;

                int[] powerPointPidsBefore = PowerPointVectorExporter.SnapshotPowerPointPids();
                result["powerPointPidsBefore"] = powerPointPidsBefore.Length;

                string jsPost = "(function(){ if (!window.chrome || !window.chrome.webview) { return 'no-webview'; }" +
                                " window.__figplayVectorPdfB64 = '';" +
                                " window.chrome.webview.postMessage(JSON.stringify({ type: 'export-vector-pdf', requestId: " +
                                JsonConvert.ToString(requestId) + ", spec: " + specJson + " })); return 'sent'; })()";

                Stopwatch stopwatch = Stopwatch.StartNew();
                string sent = await _form.EvalStringAsync(jsPost);
                result["sent"] = sent;
                if (!string.Equals(sent, "sent", StringComparison.Ordinal))
                {
                    throw new InvalidOperationException("window.chrome.webview 不可用：" + sent);
                }

                string probe = "(function(){ var a = window.__figplayHostMessages || [];" +
                               " for (var i = 0; i < a.length; i++) { var d = a[i];" +
                               "   try { var o = (typeof d === 'string') ? JSON.parse(d) : d;" +
                               "     if (o && o.type === 'vector-pdf-export' && o.requestId === " +
                               JsonConvert.ToString(requestId) + ") {" +
                               "       if (o.ok && o.base64) { try { window.__figplayVectorPdfB64 = String(o.base64); } catch (e) {} }" +
                               "       return JSON.stringify({ found: true, ok: !!o.ok, bytes: o.bytes || 0," +
                               "         engine: o.engine || '', vectorPanels: o.vectorPanels || 0," +
                               "         rasterPanels: o.rasterPanels || 0, base64Length: (o.base64 || '').length," +
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

                    await Task.Delay(250);
                }

                stopwatch.Stop();
                result["latencyMs"] = stopwatch.ElapsedMilliseconds;

                if (found == null || !found.Value<bool>("found"))
                {
                    throw new InvalidOperationException("180 秒内未收到 vector-pdf-export 响应。");
                }

                result["response"] = found;
                if (!found.Value<bool>("ok"))
                {
                    throw new InvalidOperationException(
                        "矢量 PDF 桥返回失败：" + (found.Value<string>("error") ?? "未知原因"));
                }

                string pdfBase64 = await _form.EvalStringAsync("window.__figplayVectorPdfB64 || ''");
                if (string.IsNullOrEmpty(pdfBase64))
                {
                    throw new InvalidOperationException("未能从桥响应中取回 PDF base64。");
                }

                byte[] pdfBytes;
                try
                {
                    pdfBytes = Convert.FromBase64String(pdfBase64);
                }
                catch (FormatException)
                {
                    throw new InvalidOperationException("桥响应中的 PDF base64 解码失败。");
                }

                int reportedBytes = found.Value<int>("bytes");
                result["pdfBytes"] = pdfBytes.Length;
                result["reportedBytes"] = reportedBytes;
                if (reportedBytes != pdfBytes.Length)
                {
                    throw new InvalidOperationException(
                        "响应 bytes 字段与实际 PDF 大小不一致：" + reportedBytes + " vs " + pdfBytes.Length);
                }

                string pdfPath = Path.Combine(_options.OutDir, "vector-pdf-test.pdf");
                File.WriteAllBytes(pdfPath, pdfBytes);
                result["pdfPath"] = pdfPath;

                if (pdfBytes.Length < 1000 ||
                    pdfBytes[0] != (byte)'%' || pdfBytes[1] != (byte)'P' ||
                    pdfBytes[2] != (byte)'D' || pdfBytes[3] != (byte)'F')
                {
                    throw new InvalidOperationException("桥返回的内容不是有效 PDF。");
                }

                string engine = found.Value<string>("engine");
                int vectorPanels = found.Value<int>("vectorPanels");
                int rasterPanels = found.Value<int>("rasterPanels");
                result["engine"] = engine;
                result["vectorPanels"] = vectorPanels;
                result["rasterPanels"] = rasterPanels;
                if (!string.Equals(engine, "PowerPoint", StringComparison.Ordinal))
                {
                    throw new InvalidOperationException("engine 期望 PowerPoint，实际：" + engine);
                }

                if (vectorPanels < 1)
                {
                    throw new InvalidOperationException("vectorPanels 应 >= 1，实际：" + vectorPanels);
                }

                if (rasterPanels != 0)
                {
                    throw new InvalidOperationException("rasterPanels 期望 0（本测试只用 EMF），实际：" + rasterPanels);
                }

                // ---------------- PowerPoint 会话进程记录（v1.3.3 持久实例，不在此处强杀） ----------------
                // 持久会话会保留自己启动的 POWERPNT；selftest 结束前统一 Shutdown 再检查残留。
                await Task.Delay(300);
                int[] pidsAfter = PowerPointVectorExporter.SnapshotPowerPointPids();
                List<int> newPids = new List<int>();
                foreach (int pid in pidsAfter)
                {
                    if (Array.IndexOf(powerPointPidsBefore, pid) < 0)
                    {
                        newPids.Add(pid);
                    }
                }

                result["powerPointPidsAfter"] = pidsAfter.Length;
                result["newPowerPointProcesses"] = new JArray(newPids.ToArray());
                result["powerPointPidsNote"] = "持久会话保留，selftest 结束时统一 shutdown 后检查残留。";

                // ---------------- PDF 内容校验 ----------------
                JObject checks = new JObject();
                result["checks"] = checks;

                string pdfinfoExe = FindPdfTool("pdfinfo");
                string pdfimagesExe = FindPdfTool("pdfimages");
                string pdftotextExe = FindPdfTool("pdftotext");
                checks["pdfinfo"] = pdfinfoExe ?? string.Empty;
                checks["pdfimages"] = pdfimagesExe ?? string.Empty;
                checks["pdftotext"] = pdftotextExe ?? string.Empty;

                double expectedWidthPt = widthMm / 25.4 * 72.0;
                double expectedHeightPt = heightMm / 25.4 * 72.0;

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
                        pageSizeOk = pages == 1 &&
                                     Math.Abs(widthPt - expectedWidthPt) <= 1.5 &&
                                     Math.Abs(heightPt - expectedHeightPt) <= 1.5;
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

                checks["expectedPageWidthPt"] = Math.Round(expectedWidthPt, 2);
                checks["expectedPageHeightPt"] = Math.Round(expectedHeightPt, 2);
                checks["pageSizeOk"] = pageSizeOk;
                if (!pageSizeOk)
                {
                    throw new InvalidOperationException(
                        "矢量 PDF 页面尺寸不符：期望 " + Math.Round(expectedWidthPt, 2) + " x " +
                        Math.Round(expectedHeightPt, 2) + " pt（" + widthMm + " x " + heightMm + " mm）。");
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
                    if (!string.IsNullOrEmpty(pdfimagesExe))
                    {
                        checks["imageCheckMode"] = "pdfimages+managed";
                    }
                    else
                    {
                        checks["imageCheckMode"] = "managed";
                    }

                    noBitmaps = (rawCount + inflatedCount) == 0;
                }

                checks["noBitmaps"] = noBitmaps;
                if (!noBitmaps)
                {
                    throw new InvalidOperationException(
                        "矢量 PDF 中检测到位图图像（EMF 可能被 PowerPoint 栅格化了）。");
                }

                bool labelTextOk = false;
                if (!string.IsNullOrEmpty(pdftotextExe))
                {
                    string textOutput = RunTool(pdftotextExe, QuoteArgument(pdfPath) + " -", 60000);
                    checks["text"] = Shorten(textOutput, 500);
                    labelTextOk = textOutput != null && textOutput.IndexOf("(a)", StringComparison.Ordinal) >= 0;
                }
                else
                {
                    checks["textCheckSkipped"] = "pdftotext 不可用，跳过标签文字校验";
                }

                checks["labelTextOk"] = labelTextOk;
                if (string.IsNullOrEmpty(pdftotextExe) == false && !labelTextOk)
                {
                    throw new InvalidOperationException(
                        "矢量 PDF 中未提取到标签文字 \"(a)\"（PDF 文字可能被转曲或导出异常）。");
                }

                // ---------------- 可选白边裁剪（crop）测试 ----------------
                JObject cropResult = await RunVectorPdfCropChecksAsync(emfBytes, spec, requestId);
                result["crop"] = cropResult;
                if (!cropResult.Value<bool>("ok"))
                {
                    throw new InvalidOperationException(
                        "crop + trimMargin 测试失败：" +
                        (cropResult.Value<string>("error") ?? "未知原因"));
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

        // ---------------------------------------------------------------- WebView2 保存 API 探测

        private async Task<JObject> CheckSaveFilePickerAsync()
        {
            JObject result = new JObject();
            try
            {
                string script = "(function(){ try { return JSON.stringify({" +
                                " hasShowSaveFilePicker: typeof window.showSaveFilePicker === 'function'," +
                                " hasShowOpenFilePicker: typeof window.showOpenFilePicker === 'function'," +
                                " isSecureContext: !!window.isSecureContext," +
                                " origin: location.origin," +
                                " href: location.href," +
                                " userAgent: navigator.userAgent" +
                                " }); } catch (e) { return JSON.stringify({ probeError: String(e) }); } })()";
                string raw = await _form.EvalStringAsync(script);
                JObject parsed = string.IsNullOrEmpty(raw) ? null : JObject.Parse(raw);
                result["probe"] = parsed;
                if (parsed != null)
                {
                    bool hasPicker = parsed.Value<bool>("hasShowSaveFilePicker");
                    bool secure = parsed.Value<bool>("isSecureContext");
                    result["hasShowSaveFilePicker"] = hasPicker;
                    result["isSecureContext"] = secure;
                    result["supported"] = hasPicker && secure;
                    result["note"] =
                        "showSaveFilePicker 需要在用户手势中调用；selftest 仅检查 API 暴露与安全上下文，不弹系统保存对话框。";
                }
            }
            catch (Exception ex)
            {
                result["error"] = ex.Message;
            }

            return result;
        }

        // ---------------------------------------------------------------- 工具

        private static bool BytesEqual(byte[] left, byte[] right)
        {
            if (left == null || right == null || left.Length != right.Length)
            {
                return false;
            }

            for (int i = 0; i < left.Length; i++)
            {
                if (left[i] != right[i])
                {
                    return false;
                }
            }

            return true;
        }

        private static int CountEmfRecords(byte[] emfBytes)
        {
            if (!EmfValidator.LooksLikeEmf(emfBytes))
            {
                return 0;
            }

            int offset = 0;
            int count = 0;
            while (offset + 8 <= emfBytes.Length && count < 100000)
            {
                int size = emfBytes[offset + 4]
                           | (emfBytes[offset + 5] << 8)
                           | (emfBytes[offset + 6] << 16)
                           | (emfBytes[offset + 7] << 24);
                if (size < 8 || offset + size > emfBytes.Length)
                {
                    break;
                }

                count++;
                offset += size;
            }

            return count;
        }

        private static string FindPdfTool(string toolName)
        {
            string fileName = toolName.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)
                ? toolName
                : toolName + ".exe";

            try
            {
                string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
                foreach (string dir in pathEnv.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries))
                {
                    try
                    {
                        string candidate = Path.Combine(dir.Trim(), fileName);
                        if (File.Exists(candidate))
                        {
                            return candidate;
                        }
                    }
                    catch
                    {
                        // ignore
                    }
                }
            }
            catch
            {
                // ignore
            }

            string[] knownDirs =
            {
                @"D:\texlive\2023\bin\windows",
                @"C:\texlive\2023\bin\windows",
                @"D:\texlive\2024\bin\windows",
                @"C:\texlive\2024\bin\windows",
                @"C:\Program Files\poppler\bin",
                @"C:\Program Files (x86)\poppler\bin",
            };

            foreach (string dir in knownDirs)
            {
                try
                {
                    string candidate = Path.Combine(dir, fileName);
                    if (File.Exists(candidate))
                    {
                        return candidate;
                    }
                }
                catch
                {
                    // ignore
                }
            }

            return null;
        }

        private static string RunTool(string executable, string arguments, int timeoutMs)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo(executable, arguments)
                {
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8,
                };
                using (Process process = Process.Start(psi))
                {
                    if (process == null)
                    {
                        return string.Empty;
                    }

                    Task<string> stdoutTask = process.StandardOutput.ReadToEndAsync();
                    Task<string> stderrTask = process.StandardError.ReadToEndAsync();
                    if (!process.WaitForExit(timeoutMs))
                    {
                        try
                        {
                            process.Kill();
                        }
                        catch
                        {
                            // ignore
                        }

                        return string.Empty;
                    }

                    try
                    {
                        Task.WaitAll(new Task[] { stdoutTask, stderrTask }, 5000);
                    }
                    catch
                    {
                        // ignore
                    }

                    string output = stdoutTask.Status == TaskStatus.RanToCompletion
                        ? stdoutTask.Result
                        : string.Empty;
                    string error = stderrTask.Status == TaskStatus.RanToCompletion
                        ? stderrTask.Result
                        : string.Empty;
                    return (output ?? string.Empty) + (string.IsNullOrEmpty(error) ? string.Empty : "\n[stderr] " + error);
                }
            }
            catch (Exception ex)
            {
                return "[tool error] " + ex.Message;
            }
        }

        private static bool TryParsePdfInfo(string output, out double widthPt, out double heightPt, out int pages)
        {
            widthPt = 0;
            heightPt = 0;
            pages = 0;
            if (string.IsNullOrEmpty(output))
            {
                return false;
            }

            Match pagesMatch = Regex.Match(output, @"Pages:\s+(\d+)");
            if (pagesMatch.Success)
            {
                int.TryParse(pagesMatch.Groups[1].Value, out pages);
            }

            Match sizeMatch = Regex.Match(output, @"Page size:\s+([0-9.]+)\s+x\s+([0-9.]+)\s+pts");
            if (!sizeMatch.Success)
            {
                return false;
            }

            double.TryParse(sizeMatch.Groups[1].Value, System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out widthPt);
            double.TryParse(sizeMatch.Groups[2].Value, System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out heightPt);
            return widthPt > 0 && heightPt > 0;
        }

        private static bool TryGetPdfMediaBox(byte[] pdfBytes, out double widthPt, out double heightPt)
        {
            widthPt = 0;
            heightPt = 0;
            try
            {
                string text = Encoding.GetEncoding(28591).GetString(pdfBytes);
                Match match = Regex.Match(
                    text,
                    @"/MediaBox\s*\[\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\]");
                if (!match.Success)
                {
                    return false;
                }

                double x0 = double.Parse(match.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture);
                double y0 = double.Parse(match.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture);
                double x1 = double.Parse(match.Groups[3].Value, System.Globalization.CultureInfo.InvariantCulture);
                double y1 = double.Parse(match.Groups[4].Value, System.Globalization.CultureInfo.InvariantCulture);
                widthPt = Math.Abs(x1 - x0);
                heightPt = Math.Abs(y1 - y0);
                return widthPt > 0 && heightPt > 0;
            }
            catch
            {
                return false;
            }
        }

        private static int CountPdfImageRows(string pdfimagesListOutput)
        {
            if (string.IsNullOrEmpty(pdfimagesListOutput))
            {
                return -1;
            }

            int count = 0;
            foreach (string line in pdfimagesListOutput.Split('\n'))
            {
                string trimmed = line.Trim();
                if (trimmed.Length == 0)
                {
                    continue;
                }

                Match match = Regex.Match(trimmed, @"^(\d+)\s+(\d+)\s+");
                if (match.Success)
                {
                    count++;
                }
            }

            return count;
        }

        private static void ScanPdfForImageXObjects(byte[] pdfBytes, out int rawCount, out int inflatedCount)
        {
            rawCount = 0;
            inflatedCount = 0;
            if (pdfBytes == null || pdfBytes.Length == 0)
            {
                return;
            }

            string latin;
            try
            {
                latin = Encoding.GetEncoding(28591).GetString(pdfBytes);
            }
            catch
            {
                return;
            }

            rawCount += CountOccurrences(latin, "/Subtype /Image");
            rawCount += CountOccurrences(latin, "/Subtype/Image");

            int position = 0;
            int streamCount = 0;
            while (streamCount < 3000)
            {
                int index = latin.IndexOf("stream", position, StringComparison.Ordinal);
                if (index < 0)
                {
                    break;
                }

                bool isEndStream = index >= 3 &&
                                   string.Compare(latin, index - 3, "end", 0, 3, StringComparison.Ordinal) == 0;
                if (isEndStream)
                {
                    position = index + 6;
                    continue;
                }

                int end = latin.IndexOf("endstream", index + 6, StringComparison.Ordinal);
                if (end < 0)
                {
                    break;
                }

                int start = index + 6;
                if (start < pdfBytes.Length && pdfBytes[start] == 0x0D)
                {
                    start++;
                }

                if (start < pdfBytes.Length && pdfBytes[start] == 0x0A)
                {
                    start++;
                }

                int length = end - start;
                if (length > 0 && length < 8 * 1024 * 1024)
                {
                    string inflated = TryInflateZlib(pdfBytes, start, length);
                    if (!string.IsNullOrEmpty(inflated))
                    {
                        inflatedCount += CountOccurrences(inflated, "/Subtype /Image");
                        inflatedCount += CountOccurrences(inflated, "/Subtype/Image");
                    }
                }

                position = end + 9;
                streamCount++;
            }
        }

        private static string TryInflateZlib(byte[] data, int offset, int length)
        {
            try
            {
                if (length < 3 || ((data[offset] & 0x0F) != 8))
                {
                    return null;
                }

                byte[] compressed = new byte[length - 2];
                Array.Copy(data, offset + 2, compressed, 0, compressed.Length);
                using (MemoryStream input = new MemoryStream(compressed, false))
                using (System.IO.Compression.DeflateStream deflate =
                    new System.IO.Compression.DeflateStream(input, System.IO.Compression.CompressionMode.Decompress))
                using (MemoryStream output = new MemoryStream())
                {
                    byte[] buffer = new byte[8192];
                    int total = 0;
                    int read;
                    while ((read = deflate.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        total += read;
                        if (total > 8 * 1024 * 1024)
                        {
                            return null;
                        }

                        output.Write(buffer, 0, read);
                    }

                    return Encoding.GetEncoding(28591).GetString(output.ToArray());
                }
            }
            catch
            {
                return null;
            }
        }

        private static int CountOccurrences(string text, string needle)
        {
            if (string.IsNullOrEmpty(text) || string.IsNullOrEmpty(needle))
            {
                return 0;
            }

            int count = 0;
            int position = 0;
            while (true)
            {
                int index = text.IndexOf(needle, position, StringComparison.Ordinal);
                if (index < 0)
                {
                    break;
                }

                count++;
                position = index + needle.Length;
            }

            return count;
        }

        private static string QuoteArgument(string value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return "\"\"";
            }

            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }

        private static string Shorten(string value, int maxLength)
        {
            if (string.IsNullOrEmpty(value))
            {
                return string.Empty;
            }

            return value.Length <= maxLength ? value : value.Substring(0, maxLength) + "...";
        }
        // ---------------------------------------------------------------- v1.3.3 持久会话生命周期

        /// <summary>
        /// 冷/热导出耗时 + 显式 shutdown + 残留 POWERPNT 检查。
        /// 冷导出 = 本次 selftest 第一次 PowerPoint 导出（appVectorE2E 的普通导出）；
        /// 热导出 = 紧接其后的宿主级矢量 PDF 导出（复用同一 PowerPoint 实例）。
        /// </summary>
        private async Task<JObject> RunPowerPointLifecycleCheckAsync()
        {
            JObject result = new JObject();
            try
            {
                double coldMs = 0;
                double hotMs = 0;
                JObject appE2E = _report["appVectorE2E"] as JObject;
                if (appE2E != null)
                {
                    coldMs = appE2E.Value<double?>("exportMs") ?? 0;
                }

                JObject vectorPdf = _report["vectorPdf"] as JObject;
                if (vectorPdf != null)
                {
                    hotMs = vectorPdf.Value<double?>("latencyMs") ?? 0;
                }

                int instanceCreateMs = PowerPointHost.InstanceCreateMs;
                int sessionIndex = PowerPointHost.SessionIndex;
                int exportCount = PowerPointHost.ExportCount;
                bool ownsInstance = PowerPointHost.OwnsInstance;
                int[] ownedPids = PowerPointHost.OwnedPids;
                result["coldExportMs"] = Math.Round(coldMs, 1);
                result["hotExportMs"] = Math.Round(hotMs, 1);
                result["instanceCreateMs"] = instanceCreateMs;
                result["sessionIndex"] = sessionIndex;
                result["exportCount"] = exportCount;
                result["ownsInstance"] = ownsInstance;
                result["ownedPidsBeforeShutdown"] = new JArray(ownedPids);

                double speedup = 0;
                if (coldMs > 0)
                {
                    speedup = (coldMs - hotMs) / coldMs * 100.0;
                }

                result["speedupPercent"] = Math.Round(speedup, 1);

                // 显式关闭自己启动的 PowerPoint，再检查残留（不触碰用户原有实例）
                VectorPdfService.ShutdownSharedSession();
                await Task.Delay(1500);
                int[] pidsAfter = PowerPointVectorExporter.SnapshotPowerPointPids();
                List<int> residual = new List<int>();
                foreach (int pid in pidsAfter)
                {
                    if (Array.IndexOf(_powerPointPidsAtStart, pid) < 0)
                    {
                        residual.Add(pid);
                    }
                }

                List<int> userPidsMissing = new List<int>();
                foreach (int pid in _powerPointPidsAtStart)
                {
                    if (Array.IndexOf(pidsAfter, pid) < 0)
                    {
                        userPidsMissing.Add(pid);
                    }
                }

                bool shutdownOk = residual.Count == 0;
                result["powerPointPidsAtStart"] = new JArray(_powerPointPidsAtStart);
                result["powerPointPidsAfterShutdown"] = new JArray(pidsAfter);
                result["residualPids"] = new JArray(residual.ToArray());
                result["userPidsMissing"] = new JArray(userPidsMissing.ToArray());
                result["shutdownOk"] = shutdownOk;

                bool performanceOk = coldMs > 1000 && hotMs > 0 &&
                                     (hotMs <= coldMs - 3000 || hotMs <= coldMs * 0.75);
                result["performanceOk"] = performanceOk;
                if (!performanceOk)
                {
                    result["error"] = "热导出未明显快于冷导出：cold=" + Math.Round(coldMs, 1) +
                                      "ms hot=" + Math.Round(hotMs, 1) + "ms（应至少快 3s 或 ≤75%）。";
                }
                else if (!shutdownOk)
                {
                    result["error"] = "显式 shutdown 后仍有残留 POWERPNT：" +
                                      string.Join(",", residual.ToArray());
                }
                else if (userPidsMissing.Count > 0)
                {
                    result["error"] = "shutdown 误杀/关闭了用户原有 POWERPNT：" +
                                      string.Join(",", userPidsMissing.ToArray());
                }

                result["ok"] = performanceOk && shutdownOk && userPidsMissing.Count == 0;
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
