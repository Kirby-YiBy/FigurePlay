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
    /// v1.5.0 多页矢量 PDF：同一 PowerPoint presentation 多幻灯片 → 一次 SaveAs 多页 PDF。
    /// 校验 Pages=2、页尺寸一致、0 位图、标签文字存在；并校验页面尺寸不一致时返回明确错误。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> RunVectorPdfMultiChecksAsync()
        {
            JObject result = new JObject();
            try
            {
                byte[] solidEmf = TestFigureFactory.CreateSolidEmfBytes();
                string emfBase64 = Convert.ToBase64String(solidEmf);

                const double pageW = 170;
                const double pageH = 120;
                const double cropX = 5.546;
                const double cropY = 10;
                const double cropW = 150;
                const double cropH = 95;
                const double margin = 1.0;

                JObject MakePage(string text, double labelX, bool smaller)
                {
                    JObject page = new JObject
                    {
                        ["widthMm"] = smaller ? 160 : pageW,
                        ["heightMm"] = pageH,
                        ["background"] = "#ffffff",
                        ["crop"] = new JObject
                        {
                            ["xMm"] = cropX,
                            ["yMm"] = cropY,
                            // 不一致用例用不同 crop 宽度，验证宿主的多页尺寸校验
                            ["wMm"] = smaller ? 140 : cropW,
                            ["hMm"] = cropH,
                        },
                        ["trimMarginMm"] = margin,
                        ["panels"] = new JArray(
                            new JObject
                            {
                                ["xMm"] = cropX,
                                ["yMm"] = cropY,
                                ["wMm"] = smaller ? 140 : cropW,
                                ["hMm"] = cropH,
                                ["image"] = new JObject
                                {
                                    ["kind"] = "emf",
                                    ["base64"] = emfBase64,
                                },
                                ["fit"] = "stretch",
                            }),
                        ["labels"] = new JArray(
                            new JObject
                            {
                                ["text"] = text,
                                ["xMm"] = labelX,
                                ["yMm"] = 92,
                                ["boxXmm"] = labelX - 5,
                                ["boxYmm"] = 92,
                                ["boxWmm"] = 10,
                                ["boxHmm"] = 5,
                                ["fontSizePt"] = 11,
                                ["fontName"] = "Arial",
                                ["bold"] = false,
                                ["italic"] = false,
                                ["color"] = "#000000",
                                ["align"] = "center",
                                ["bg"] = "none",
                            }),
                    };
                    return page;
                }

                JObject request = new JObject
                {
                    ["type"] = BridgeProtocol.TypeExportVectorPdfMulti,
                    ["pages"] = new JArray(MakePage("(a)", 42.5, false), MakePage("(b)", 127.5, false)),
                };

                Stopwatch watch = Stopwatch.StartNew();
                JObject response = await SendRawHostRequestAsync(
                    request,
                    BridgeProtocol.TypeVectorPdfExportMulti,
                    240);
                watch.Stop();
                result["latencyMs"] = watch.ElapsedMilliseconds;
                result["response"] = response;
                if (!response.Value<bool>("ok"))
                {
                    throw new InvalidOperationException(
                        "多页矢量 PDF 导出失败：" + (response.Value<string>("error") ?? "未知原因"));
                }

                int pages = response.Value<int?>("pages") ?? 0;
                if (pages != 2)
                {
                    throw new InvalidOperationException("多页矢量 PDF pages 期望 2，实际 " + pages);
                }

                if (response.Value<int>("rasterPanels") != 0)
                {
                    throw new InvalidOperationException("多页矢量 PDF rasterPanels 期望 0。");
                }

                string base64 = response.Value<string>("base64") ?? string.Empty;
                if (string.IsNullOrEmpty(base64))
                {
                    throw new InvalidOperationException("多页矢量 PDF 未返回 base64。");
                }

                byte[] pdfBytes = Convert.FromBase64String(base64);
                string pdfPath = Path.Combine(_options.OutDir, "vector-pdf-multi-test.pdf");
                File.WriteAllBytes(pdfPath, pdfBytes);
                result["pdfPath"] = pdfPath;
                result["pdfBytes"] = pdfBytes.Length;
                if (pdfBytes.Length != (response.Value<int?>("bytes") ?? 0))
                {
                    throw new InvalidOperationException("多页矢量 PDF bytes 与实际大小不一致。");
                }

                if (pdfBytes.Length < 1000 ||
                    pdfBytes[0] != (byte)'%' || pdfBytes[1] != (byte)'P' ||
                    pdfBytes[2] != (byte)'D' || pdfBytes[3] != (byte)'F')
                {
                    throw new InvalidOperationException("多页矢量 PDF 不是有效 PDF。");
                }

                JObject checks = new JObject();
                result["checks"] = checks;

                string pdfinfoExe = FindPdfTool("pdfinfo");
                string pdfimagesExe = FindPdfTool("pdfimages");
                string pdftotextExe = FindPdfTool("pdftotext");
                bool pdfinfoOk = false;
                if (!string.IsNullOrEmpty(pdfinfoExe))
                {
                    string info = RunTool(pdfinfoExe, QuoteArgument(pdfPath), 30000);
                    checks["pdfinfo"] = Shorten(info, 1000);
                    int pageCount;
                    double widthPt;
                    double heightPt;
                    if (TryParsePdfInfo(info, out widthPt, out heightPt, out pageCount))
                    {
                        checks["pages"] = pageCount;
                        checks["pageWidthPt"] = Math.Round(widthPt, 2);
                        checks["pageHeightPt"] = Math.Round(heightPt, 2);
                        // trim 墨迹校正可能在左/上扩边；页面尺寸应略大于原始 crop（150×95mm）
                        double minWidthPt = (cropW + margin) / 25.4 * 72.0;
                        double maxWidthPt = (cropW + 4 * margin) / 25.4 * 72.0;
                        double minHeightPt = (cropH + margin) / 25.4 * 72.0;
                        double maxHeightPt = (cropH + 4 * margin) / 25.4 * 72.0;
                        checks["expectedPageWidthPtRange"] = Math.Round(minWidthPt, 2) + "-" + Math.Round(maxWidthPt, 2);
                        checks["expectedPageHeightPtRange"] = Math.Round(minHeightPt, 2) + "-" + Math.Round(maxHeightPt, 2);
                        pdfinfoOk = pageCount == 2 &&
                                    widthPt >= minWidthPt && widthPt <= maxWidthPt &&
                                    heightPt >= minHeightPt && heightPt <= maxHeightPt;
                    }
                }

                checks["pdfinfoOk"] = pdfinfoOk;
                if (!pdfinfoOk)
                {
                    throw new InvalidOperationException("多页矢量 PDF 页数/页面尺寸不符（期望 2 页且尺寸略大于 150×95mm 的 trim 校正页面）。");
                }

                bool noBitmaps = false;
                if (!string.IsNullOrEmpty(pdfimagesExe))
                {
                    string list = RunTool(pdfimagesExe, "-list " + QuoteArgument(pdfPath), 60000);
                    checks["pdfimagesList"] = Shorten(list, 1000);
                    int imageRows = CountPdfImageRows(list);
                    checks["imageCount"] = imageRows;
                    noBitmaps = imageRows == 0;
                }

                checks["noBitmaps"] = noBitmaps;
                if (!noBitmaps)
                {
                    throw new InvalidOperationException("多页矢量 PDF 中检测到位图。");
                }

                bool labelsOk = false;
                if (!string.IsNullOrEmpty(pdftotextExe))
                {
                    string text = RunTool(pdftotextExe, QuoteArgument(pdfPath) + " -", 60000);
                    checks["textSample"] = Shorten(text, 300);
                    labelsOk = text != null &&
                               text.IndexOf("(a)", StringComparison.Ordinal) >= 0 &&
                               text.IndexOf("(b)", StringComparison.Ordinal) >= 0;
                }

                checks["labelsOk"] = labelsOk;
                if (!labelsOk)
                {
                    throw new InvalidOperationException("多页矢量 PDF 中未同时提取到 (a)/(b) 标签。");
                }

                // 页面尺寸不一致 → 明确错误
                JObject mismatchRequest = new JObject
                {
                    ["type"] = BridgeProtocol.TypeExportVectorPdfMulti,
                    ["pages"] = new JArray(MakePage("(a)", 42.5, false), MakePage("(b)", 127.5, true)),
                };
                JObject mismatch = await SendRawHostRequestAsync(
                    mismatchRequest,
                    BridgeProtocol.TypeVectorPdfExportMulti,
                    120);
                bool mismatchOk = !mismatch.Value<bool>("ok") &&
                                  (mismatch.Value<string>("error") ?? string.Empty).IndexOf("尺寸", StringComparison.Ordinal) >= 0;
                checks["mismatchOk"] = mismatchOk;
                checks["mismatchError"] = Shorten(mismatch.Value<string>("error") ?? string.Empty, 200);
                if (!mismatchOk)
                {
                    throw new InvalidOperationException("多页页面尺寸不一致时未返回明确的尺寸错误。");
                }

                result["vectorPanels"] = response.Value<int?>("vectorPanels") ?? 0;
                result["rasterPanels"] = response.Value<int?>("rasterPanels") ?? 0;
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
