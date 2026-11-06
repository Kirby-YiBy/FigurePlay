using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Xml.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>
    /// v1.4.0 修复：矢量 PDF 中编号文本框必须按真实锚点（label.XMm）定位，而不是 app 的 padded BoxXmm。
    /// 本测试构造 3×2 场景（列中心 42.5/127.5mm、crop.x=5.546mm、bottom-center Arial 11pt、trimMargin=1），
    /// 用 pdftotext -bbox 提取 PDF 中 (a)/(b) 文本中心，断言 = cellCenter - finalCrop.x（±0.5mm）。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> RunVectorPdfLabelCenterChecksAsync()
        {
            JObject result = new JObject();
            try
            {
                byte[] solidEmf = TestFigureFactory.CreateSolidEmfBytes();
                string requestId = "selftest-vector-label-center-" + DateTime.Now.Ticks;

                const double pageWidthMm = 170;
                const double pageHeightMm = 120;
                const double cropX = 5.546;
                const double cropY = 10;
                const double cropW = 150;
                const double cropH = 95;
                const double trimMarginMm = 1.0;
                const double cellCenterLeft = 42.5;
                const double cellCenterRight = 127.5;

                JObject spec = new JObject
                {
                    ["widthMm"] = pageWidthMm,
                    ["heightMm"] = pageHeightMm,
                    ["background"] = "#ffffff",
                    ["crop"] = new JObject
                    {
                        ["xMm"] = cropX,
                        ["yMm"] = cropY,
                        ["wMm"] = cropW,
                        ["hMm"] = cropH,
                    },
                    ["trimMarginMm"] = trimMarginMm,
                    ["panels"] = new JArray(
                        new JObject
                        {
                            ["xMm"] = cropX,
                            ["yMm"] = cropY,
                            ["wMm"] = cropW,
                            ["hMm"] = cropH,
                            ["image"] = new JObject
                            {
                                ["kind"] = "emf",
                                ["base64"] = Convert.ToBase64String(solidEmf),
                            },
                            ["fit"] = "stretch",
                        }),
                    ["labels"] = new JArray(
                        new JObject
                        {
                            ["text"] = "(a)",
                            ["xMm"] = cellCenterLeft,
                            ["yMm"] = 92,
                            ["boxXmm"] = cellCenterLeft - 5,
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
                        },
                        new JObject
                        {
                            ["text"] = "(b)",
                            ["xMm"] = cellCenterRight,
                            ["yMm"] = 92,
                            ["boxXmm"] = cellCenterRight - 5,
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

                result["requestId"] = requestId;
                result["specSummary"] = new JObject
                {
                    ["pageMm"] = pageWidthMm + "x" + pageHeightMm,
                    ["cropMm"] = cropX + "," + cropY + "," + cropW + "x" + cropH,
                    ["trimMarginMm"] = trimMarginMm,
                    ["cellCentersMm"] = new JArray(cellCenterLeft, cellCenterRight),
                };

                Stopwatch watch = Stopwatch.StartNew();
                byte[] pdfBytes = await SendVectorPdfRequestAsync(spec, requestId, 180);
                watch.Stop();
                result["latencyMs"] = watch.ElapsedMilliseconds;
                result["pdfBytes"] = pdfBytes.Length;
                if (pdfBytes.Length < 1000 ||
                    pdfBytes[0] != (byte)'%' || pdfBytes[1] != (byte)'P' ||
                    pdfBytes[2] != (byte)'D' || pdfBytes[3] != (byte)'F')
                {
                    throw new InvalidOperationException("label-center 矢量 PDF 不是有效 PDF。");
                }

                string pdfPath = Path.Combine(_options.OutDir, "vector-pdf-label-center.pdf");
                File.WriteAllBytes(pdfPath, pdfBytes);
                result["pdfPath"] = pdfPath;

                // 宿主会按 trimMargin 扩展 crop：ink 覆盖整个初始 crop → final crop.x = crop.x - margin。
                double expectedFinalCropX = Math.Max(0, cropX - trimMarginMm);
                double expectedCenterA = Math.Round(cellCenterLeft - expectedFinalCropX, 3);
                double expectedCenterB = Math.Round(cellCenterRight - expectedFinalCropX, 3);
                result["expectedFinalCropXmm"] = expectedFinalCropX;
                result["expectedCenterAMm"] = expectedCenterA;
                result["expectedCenterBMm"] = expectedCenterB;

                string pdfinfoExe = FindPdfTool("pdfinfo");
                string pdftotextExe = FindPdfTool("pdftotext");
                JObject checks = new JObject();
                result["checks"] = checks;

                if (!string.IsNullOrEmpty(pdfinfoExe))
                {
                    string info = RunTool(pdfinfoExe, QuoteArgument(pdfPath), 30000);
                    checks["pdfinfo"] = Shorten(info, 900);
                    double w;
                    double h;
                    int pages;
                    if (TryParsePdfInfo(info, out w, out h, out pages))
                    {
                        checks["pageWidthMm"] = Math.Round(w / 72.0 * 25.4, 2);
                        checks["pageHeightMm"] = Math.Round(h / 72.0 * 25.4, 2);
                        checks["pages"] = pages;
                    }
                }

                if (string.IsNullOrEmpty(pdftotextExe))
                {
                    throw new InvalidOperationException("缺少 pdftotext，无法校验编号文本中心。");
                }

                string bboxOutput = RunTool(
                    pdftotextExe,
                    "-bbox " + QuoteArgument(pdfPath) + " -",
                    60000);
                checks["bboxSample"] = Shorten(bboxOutput, 1200);
                if (string.IsNullOrEmpty(bboxOutput) || bboxOutput.IndexOf("<word", StringComparison.Ordinal) < 0)
                {
                    throw new InvalidOperationException("pdftotext -bbox 未返回 word 坐标。");
                }

                Dictionary<string, PointMm> centers = ParseWordCenters(bboxOutput);
                checks["words"] = new JArray(centers.Keys);
                double errorA = double.NaN;
                double errorB = double.NaN;
                PointMm centerA;
                PointMm centerB;
                bool hasA = centers.TryGetValue("a", out centerA);
                bool hasB = centers.TryGetValue("b", out centerB);
                if (hasA)
                {
                    errorA = centerA.X - expectedCenterA;
                    checks["centerAMm"] = Math.Round(centerA.X, 3);
                    checks["centerAErrorMm"] = Math.Round(errorA, 3);
                }

                if (hasB)
                {
                    errorB = centerB.X - expectedCenterB;
                    checks["centerBMm"] = Math.Round(centerB.X, 3);
                    checks["centerBErrorMm"] = Math.Round(errorB, 3);
                }

                bool noBitmaps = false;
                string pdfimagesExe = FindPdfTool("pdfimages");
                if (!string.IsNullOrEmpty(pdfimagesExe))
                {
                    string list = RunTool(pdfimagesExe, "-list " + QuoteArgument(pdfPath), 60000);
                    checks["imageCount"] = CountPdfImageRows(list);
                    noBitmaps = checks.Value<int>("imageCount") == 0;
                    checks["noBitmaps"] = noBitmaps;
                }

                double toleranceMm = 0.5;
                checks["toleranceMm"] = toleranceMm;
                bool ok = hasA && hasB &&
                          Math.Abs(errorA) <= toleranceMm &&
                          Math.Abs(errorB) <= toleranceMm &&
                          noBitmaps;
                checks["ok"] = ok;
                if (!ok)
                {
                    List<string> problems = new List<string>();
                    if (!hasA)
                    {
                        problems.Add("未提取到编号 (a)");
                    }
                    else if (Math.Abs(errorA) > toleranceMm)
                    {
                        problems.Add("(a) 中心误差 " + Math.Round(errorA, 3) + "mm");
                    }

                    if (!hasB)
                    {
                        problems.Add("未提取到编号 (b)");
                    }
                    else if (Math.Abs(errorB) > toleranceMm)
                    {
                        problems.Add("(b) 中心误差 " + Math.Round(errorB, 3) + "mm");
                    }

                    if (!noBitmaps)
                    {
                        problems.Add("检测到位图");
                    }

                    result["error"] = string.Join("；", problems.ToArray());
                }

                result["ok"] = ok;
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = ex.Message;
            }

            return result;
        }

        private sealed class PointMm
        {
            public double X;
            public double Y;
            public double LeftMm;
            public double RightMm;
            public double TopMm;
            public double BottomMm;
        }

        /// <summary>从 pdftotext -bbox 输出解析每个 word 的中心（pt → mm），key 为去掉括号/标点后的字母。</summary>
        private static Dictionary<string, PointMm> ParseWordCenters(string bboxXml)
        {
            Dictionary<string, PointMm> result = new Dictionary<string, PointMm>(StringComparer.OrdinalIgnoreCase);
            if (string.IsNullOrEmpty(bboxXml))
            {
                return result;
            }

            MatchCollection words = Regex.Matches(
                bboxXml,
                @"<word\b[^>]*>.*?</word>",
                RegexOptions.Singleline | RegexOptions.IgnoreCase);
            foreach (Match match in words)
            {
                string tag = match.Value;
                string inner = Regex.Replace(tag, @"^<word\b[^>]*>|</word>$", string.Empty,
                    RegexOptions.IgnoreCase);
                inner = Regex.Replace(inner, "<[^>]+>", string.Empty).Trim();
                string key = Regex.Replace(inner, "[^0-9A-Za-z]", string.Empty);
                if (key.Length != 1)
                {
                    continue;
                }

                double xMin;
                double xMax;
                double yMin;
                double yMax;
                if (!TryParseAttribute(tag, "xMin", out xMin) ||
                    !TryParseAttribute(tag, "xMax", out xMax) ||
                    !TryParseAttribute(tag, "yMin", out yMin) ||
                    !TryParseAttribute(tag, "yMax", out yMax))
                {
                    continue;
                }

                result[key] = new PointMm
                {
                    X = (xMin + xMax) / 2.0 / 72.0 * 25.4,
                    Y = (yMin + yMax) / 2.0 / 72.0 * 25.4,
                    LeftMm = xMin / 72.0 * 25.4,
                    RightMm = xMax / 72.0 * 25.4,
                    TopMm = yMin / 72.0 * 25.4,
                    BottomMm = yMax / 72.0 * 25.4,
                };
            }

            return result;
        }

        private static bool TryParseAttribute(string tag, string name, out double value)
        {
            value = 0;
            Match match = Regex.Match(
                tag,
                "\\b" + Regex.Escape(name) + "\\s*=\\s*\"([^\"]+)\"",
                RegexOptions.IgnoreCase);
            return match.Success &&
                   double.TryParse(match.Groups[1].Value, NumberStyles.Float,
                       CultureInfo.InvariantCulture, out value);
        }

    }
}
