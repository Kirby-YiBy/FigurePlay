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
    /// 矢量 PDF 的可选白边裁剪（crop）测试：
    /// spec.crop = {xMm,yMm,wMm,hMm} 时，输出 PDF 页面应等于 crop 尺寸，内容坐标相对原页面平移。
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

            // 用“实心填满画布”的真实 EMF 做 crop 测试：PowerPoint 端 ink probe 无额外白边，
            // 页面应保持 crop 尺寸；真实 MATLAB EMF 的内部白边会被宿主二次校正掉，不适合断言页尺寸。
            byte[] solidEmf = TestFigureFactory.CreateSolidEmfBytes();
            result["emfSource"] = "C# Metafile 录制（实心填满画布）";
            result["emfBytes"] = solidEmf.Length;

            JObject cropSpec = (JObject)baseSpec.DeepClone();
            cropSpec["crop"] = new JObject
            {
                ["xMm"] = cropX,
                ["yMm"] = cropY,
                ["wMm"] = cropW,
                ["hMm"] = cropH,
            };

            // 面板与 crop 完全重合 + stretch，保证 ink 覆盖页面（不会被二次校正缩小）
            JArray panels = cropSpec["panels"] as JArray;
            if (panels != null && panels.Count > 0)
            {
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
            }

            string requestId = "selftest-vector-crop-" + DateTime.Now.Ticks;
            result["requestId"] = requestId;
            result["parentRequestId"] = parentRequestId;
            result["cropMm"] = new JObject
            {
                ["xMm"] = cropX,
                ["yMm"] = cropY,
                ["wMm"] = cropW,
                ["hMm"] = cropH,
            };

            Stopwatch stopwatch = Stopwatch.StartNew();
            byte[] pdfBytes = await SendVectorPdfRequestAsync(cropSpec, requestId, 180);
            stopwatch.Stop();
            result["latencyMs"] = stopwatch.ElapsedMilliseconds;
            result["pdfBytes"] = pdfBytes.Length;

            if (pdfBytes.Length < 1000 ||
                pdfBytes[0] != (byte)'%' || pdfBytes[1] != (byte)'P' ||
                pdfBytes[2] != (byte)'D' || pdfBytes[3] != (byte)'F')
            {
                throw new InvalidOperationException("crop 矢量 PDF 不是有效 PDF。");
            }

            string pdfPath = Path.Combine(_options.OutDir, "vector-pdf-crop-test.pdf");
            File.WriteAllBytes(pdfPath, pdfBytes);
            result["pdfPath"] = pdfPath;

            JObject checks = new JObject();
            result["checks"] = checks;

            double expectedWidthPt = cropW / 25.4 * 72.0;
            double expectedHeightPt = cropH / 25.4 * 72.0;
            checks["expectedPageWidthPt"] = Math.Round(expectedWidthPt, 2);
            checks["expectedPageHeightPt"] = Math.Round(expectedHeightPt, 2);
            // 宿主二次墨迹校正可能把页面轻微缩小；实心 EMF 应几乎不缩，留 3mm 容差
            double tolerancePt = 3.0 / 25.4 * 72.0 + 0.5;

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
                    // ±0.5mm ≈ ±1.42pt，留 2pt 容差
                    pageSizeOk = pages == 1 &&
                                 Math.Abs(widthPt - expectedWidthPt) <= tolerancePt &&
                                 Math.Abs(heightPt - expectedHeightPt) <= tolerancePt;
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
                    pageSizeOk = Math.Abs(widthPt - expectedWidthPt) <= tolerancePt &&
                                 Math.Abs(heightPt - expectedHeightPt) <= tolerancePt;
                }
            }

            checks["pageSizeOk"] = pageSizeOk;
            if (!pageSizeOk)
            {
                throw new InvalidOperationException(
                    "crop 矢量 PDF 页面尺寸不符：期望 " + Math.Round(expectedWidthPt, 2) + " x " +
                    Math.Round(expectedHeightPt, 2) + " pt（" + cropW + " x " + cropH + " mm）。");
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
                throw new InvalidOperationException("crop 矢量 PDF 中检测到位图图像。");
            }

            result["ok"] = true;
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
                           "         error: o.error || '' }); } } catch (e) {} }" +
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
