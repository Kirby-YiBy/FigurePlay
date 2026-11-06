using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// 使用 PowerPoint COM 把 EMF/PNG 面板与文本标签排版成单页矢量 PDF。
    ///
    /// v1.3.1 增强：当 spec 带 crop（应用按 PNG 预览算出的墨迹边界）时，PowerPoint 实际渲染出的
    /// EMF 内容留边可能与前端坐标有 1–2mm 偏差。这里用 PowerPoint 自己导出 PNG 探针（slide.Export），
    /// 扫描非背景像素得到真实 ink bbox，再用余量修正 crop 并重新组版（最多 2 次迭代），
    /// 使最终 PDF 渲染后四边白边尽可能 ≤0.5mm。探针失败时保留原 crop 导出，不阻塞。
    ///
    /// 关键点：只做排版/导出，不保存 pptx、不改用户文件；只清理本次自动化新启动的 POWERPNT；
    /// 60 秒超时由 VectorPdfService 兜底。
    /// </summary>
    internal static class PowerPointVectorExporter
    {
        private const int MsoFalse = 0;
        private const int MsoTrue = -1;
        private const int PpLayoutBlank = 12;
        private const int PpSaveAsPdf = 32;
        private const int MsoTextOrientationHorizontal = 1;
        private const int MsoAnchorTop = 1;
        private const int PpAlignLeft = 1;
        private const int PpAlignCenter = 2;
        private const int PpAlignRight = 3;
        private const float MmToPt = 72f / 25.4f;

        /// <summary>探针宽度（像素）。Probe 高度按页面比例计算。</summary>
        private const int ProbeWidthPx = 1400;

        /// <summary>探针最大高度，避免极端长页面内存过大。</summary>
        private const int ProbeMaxHeightPx = 4000;

        /// <summary>四边墨迹余量相对目标 trimMargin 的允许误差（mm）。</summary>
        private const double MarginToleranceMm = 0.5;

        /// <summary>最多修正次数（每次修正后重新探测）。</summary>
        private const int MaxCorrectionIterations = 2;

        /// <summary>PowerPoint 幻灯片最小尺寸约 1 英寸（25.4mm），留一点余量。</summary>
        private const double MinPowerPointPageMm = 26.0;

        private sealed class CropBox
        {
            public double X;
            public double Y;
            public double W;
            public double H;

            public CropBox Clone()
            {
                return new CropBox { X = X, Y = Y, W = W, H = H };
            }

            public override string ToString()
            {
                return string.Format(
                    System.Globalization.CultureInfo.InvariantCulture,
                    "{0:0.###},{1:0.###},{2:0.###}x{3:0.###}mm",
                    X,
                    Y,
                    W,
                    H);
            }
        }

        internal static void Trace(string message)
        {
            try
            {
                string path = Path.Combine(AppPaths.TempRoot, "vectorpdf-trace.log");
                File.AppendAllText(
                    path,
                    DateTime.Now.ToString("HH:mm:ss.fff") + " " + message + Environment.NewLine);
            }
            catch
            {
                // ignore
            }
        }

        public static bool IsPowerPointAvailable()
        {
            try
            {
                return Type.GetTypeFromProgID("PowerPoint.Application") != null;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// 在调用方（持久化宿主 STA 线程）提供的 PowerPoint 实例上完成一次排版 + PDF 导出。
        /// 不创建/退出 PowerPoint，实例生命周期由 PowerPointHost 统一管理。
        /// </summary>
        internal static VectorPdfResult ComposeWithApplication(dynamic app, VectorPdfSpec spec)
        {
            VectorPdfResult result = new VectorPdfResult();
            Trace("export start hasCrop=" + (spec == null ? "null" : spec.HasCrop.ToString()) + " page=" + (spec == null ? "" : (spec.WidthMm + "x" + spec.HeightMm)));
            if (spec == null)
            {
                return VectorPdfResult.Fail("导出参数无效：spec 为空。");
            }

            if (app == null)
            {
                return VectorPdfResult.Fail("PowerPoint 会话不可用（可能已断开），请重试。");
            }

            string tempDir = Path.Combine(AppPaths.TempRoot, "vectorpdf-" + Guid.NewGuid().ToString("N"));
            string pdfPath = Path.Combine(tempDir, "output.pdf");
            Stopwatch watch = Stopwatch.StartNew();
            try
            {
                Directory.CreateDirectory(tempDir);

                CropBox crop = spec.HasCrop
                    ? new CropBox
                    {
                        X = spec.CropXmm,
                        Y = spec.CropYmm,
                        W = spec.CropWmm,
                        H = spec.CropHmm,
                    }
                    : new CropBox { X = 0, Y = 0, W = spec.WidthMm, H = spec.HeightMm };

                result.Diagnostics.Add(string.Format(
                    "compose: page={0}x{1}mm specCrop={2} crop={3}",
                    spec.WidthMm,
                    spec.HeightMm,
                    spec.HasCrop,
                    crop));

                // 只有显式 crop（trim 模式）才做二次墨迹校正；整页导出保持原坐标。
                // v1.3.2：目标不是“零白边”，而是“实际 ink bbox 四周保留 spec.trimMarginMm 安全边距”，
                // 避免把底部编号等贴边内容裁掉（用户 trim=0 时应用会发送 max(1, 0)=1mm）。
                if (spec.HasCrop)
                {
                    double targetMargin = spec.TrimMarginMm;
                    result.Diagnostics.Add(string.Format(
                        "trim target margin={0:0.##}mm",
                        targetMargin));

                    for (int iteration = 0; iteration <= MaxCorrectionIterations; iteration++)
                    {
                        string probePath = Path.Combine(tempDir, "probe-" + iteration + ".png");
                        Trace("iter" + iteration + " compose+probe start crop=" + crop);
                        Compose(app, spec, crop, tempDir, probePath, null, false, result);
                        Trace("iter" + iteration + " compose+probe done");

                        double leftMm;
                        double topMm;
                        double rightMm;
                        double bottomMm;
                        bool measured = TryMeasureInkMargins(
                            probePath,
                            spec.Background,
                            crop,
                            result,
                            out leftMm,
                            out topMm,
                            out rightMm,
                            out bottomMm);

                        if (!measured)
                        {
                            result.Diagnostics.Add("ink 探针不可用，保留当前 crop 直接导出 PDF。");
                            break;
                        }

                        result.Diagnostics.Add(string.Format(
                            "ink-probe iter{0}: crop={1} margins L={2:0.##} T={3:0.##} R={4:0.##} B={5:0.##}mm (target {6:0.##}mm)",
                            iteration,
                            crop,
                            leftMm,
                            topMm,
                            rightMm,
                            bottomMm,
                            targetMargin));

                        bool marginsOk =
                            Math.Abs(leftMm - targetMargin) <= MarginToleranceMm &&
                            Math.Abs(topMm - targetMargin) <= MarginToleranceMm &&
                            Math.Abs(rightMm - targetMargin) <= MarginToleranceMm &&
                            Math.Abs(bottomMm - targetMargin) <= MarginToleranceMm;
                        if (marginsOk)
                        {
                            result.Diagnostics.Add("四边墨迹余量已在目标 trimMargin ±0.5mm 内，停止修正。");
                            break;
                        }

                        if (iteration == MaxCorrectionIterations)
                        {
                            result.Diagnostics.Add("达到最大修正次数，保留当前 crop。");
                            break;
                        }

                        CropBox adjusted = AdjustCrop(
                            crop,
                            spec,
                            leftMm,
                            topMm,
                            rightMm,
                            bottomMm,
                            targetMargin);
                        if (adjusted == null)
                        {
                            result.Diagnostics.Add("修正后页面过小/越界，停止修正并保留当前 crop。");
                            break;
                        }

                        if (CropEquals(crop, adjusted, 0.02))
                        {
                            result.Diagnostics.Add("crop 已收敛/受页面边界限制，停止修正。");
                            break;
                        }

                        result.Diagnostics.Add("crop 修正：" + crop + " -> " + adjusted);
                        crop = adjusted;
                    }
                }

                if (crop.W < MinPowerPointPageMm || crop.H < MinPowerPointPageMm)
                {
                    return VectorPdfResult.Fail(
                        "矢量 PDF 页面过小：PowerPoint 幻灯片最小为 1 英寸（25.4mm），当前 " +
                        Math.Round(crop.W, 1) + " x " + Math.Round(crop.H, 1) + " mm。");
                }

                // 最终组版并导出 PDF（同时重新统计 vectorPanels / rasterPanels）
                Trace("final compose+pdf start crop=" + crop);
                Compose(app, spec, crop, tempDir, null, pdfPath, true, result);
                Trace("final compose+pdf done");

                if (!File.Exists(pdfPath) || new FileInfo(pdfPath).Length < 100)
                {
                    return VectorPdfResult.Fail("PowerPoint 未生成有效的 PDF 文件。");
                }

                byte[] pdfBytes = File.ReadAllBytes(pdfPath);
                if (pdfBytes.Length < 5 ||
                    pdfBytes[0] != (byte)'%' ||
                    pdfBytes[1] != (byte)'P' ||
                    pdfBytes[2] != (byte)'D' ||
                    pdfBytes[3] != (byte)'F')
                {
                    return VectorPdfResult.Fail("PowerPoint 导出的文件不是有效 PDF。");
                }

                watch.Stop();
                result.Ok = true;
                result.PdfBytes = pdfBytes;
                result.Engine = "PowerPoint";
                result.Diagnostics.Add(string.Format(
                    "pdf: {0} bytes in {1}ms finalCrop={2} vectorPanels={3} rasterPanels={4}",
                    pdfBytes.Length,
                    watch.ElapsedMilliseconds,
                    crop,
                    result.VectorPanels,
                    result.RasterPanels));
                return result;
            }
            catch (Exception ex)
            {
                Trace("export failed: " + DescribeException(ex));
                return VectorPdfResult.Fail("PowerPoint 矢量 PDF 导出失败：" + DescribeException(ex));
            }
            finally
            {
                try
                {
                    if (Directory.Exists(tempDir))
                    {
                        Directory.Delete(tempDir, true);
                    }
                }
                catch
                {
                    // ignore
                }
            }
        }

        /// <summary>判断异常是否属于 COM 断连（RPC server unavailable 等），用于自动重建会话。</summary>
        internal static bool LooksLikeComDisconnected(Exception exception)
        {
            for (Exception current = exception; current != null; current = current.InnerException)
            {
                COMException comException = current as COMException;
                if (comException != null)
                {
                    int hr = comException.HResult;
                    if (hr == unchecked((int)0x80010108) ||
                        hr == unchecked((int)0x800706BA) ||
                        hr == unchecked((int)0x800706BE) ||
                        hr == unchecked((int)0x80010007) ||
                        hr == unchecked((int)0x800401FD))
                    {
                        return true;
                    }
                }

                string message = current.Message ?? string.Empty;
                if (message.IndexOf("RPC", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    message.IndexOf("远程过程调用", StringComparison.Ordinal) >= 0 ||
                    message.IndexOf("0x80010108", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    message.IndexOf("被调用方", StringComparison.Ordinal) >= 0)
                {
                    return true;
                }
            }

            return false;
        }

        /// <summary>判断错误消息是否属于 COM 断连。</summary>
        internal static bool LooksLikeComDisconnected(string message)
        {
            if (string.IsNullOrEmpty(message))
            {
                return false;
            }

            return message.IndexOf("RPC", StringComparison.OrdinalIgnoreCase) >= 0 ||
                   message.IndexOf("远程过程调用", StringComparison.Ordinal) >= 0 ||
                   message.IndexOf("0x80010108", StringComparison.OrdinalIgnoreCase) >= 0 ||
                   message.IndexOf("被调用方", StringComparison.Ordinal) >= 0;
        }

        // ---------------------------------------------------------------- 组版

        // ---------------------------------------------------------------- 组版

        /// <summary>
        /// 按给定 crop 组一页内容到新 presentation；可选导出探针 PNG / 保存 PDF。
        /// 探针导出失败只记录诊断，不抛异常（便于回退旧行为）。
        /// </summary>
        private static void Compose(
            dynamic app,
            VectorPdfSpec spec,
            CropBox crop,
            string tempDir,
            string probePath,
            string pdfPath,
            bool countStats,
            VectorPdfResult result)
        {
            dynamic pres = app.Presentations.Add(MsoFalse);
            Trace("  compose: presentation added crop=" + crop);
            try
            {
                pres.PageSetup.SlideWidth = (float)(crop.W * MmToPt);
                pres.PageSetup.SlideHeight = (float)(crop.H * MmToPt);
                dynamic slide = pres.Slides.Add(1, PpLayoutBlank);

                int backgroundRgb;
                if (TryParseColor(spec.Background, out backgroundRgb))
                {
                    try
                    {
                        slide.FollowMasterBackground = MsoFalse;
                        slide.Background.Fill.ForeColor.RGB = backgroundRgb;
                        slide.Background.Fill.Solid();
                    }
                    catch (Exception ex)
                    {
                        result.Diagnostics.Add("设置背景失败（忽略）：" + ex.Message);
                    }
                }

                if (countStats)
                {
                    result.VectorPanels = 0;
                    result.RasterPanels = 0;
                }

                double offsetX = crop.X;
                double offsetY = crop.Y;

                int panelIndex = 0;
                foreach (VectorPdfPanel panel in spec.Panels)
                {
                    string extension = panel.Kind == "emf" ? ".emf" : (panel.Kind == "jpg" ? ".jpg" : ".png");
                    string imagePath = Path.Combine(tempDir, "panel-" + panelIndex + extension);
                    File.WriteAllBytes(imagePath, panel.ImageBytes);

                    dynamic shape;
                    try
                    {
                        shape = slide.Shapes.AddPicture(imagePath, MsoFalse, MsoTrue, 0f, 0f);
                    }
                    catch (Exception ex)
                    {
                        throw new InvalidOperationException(
                            "第 " + (panelIndex + 1) + " 个面板插入 PowerPoint 失败：" +
                            DescribeException(ex) + "（EMF 可能已损坏或不受 PowerPoint 支持）。");
                    }

                    double naturalWidth = Convert.ToDouble(shape.Width);
                    double naturalHeight = Convert.ToDouble(shape.Height);
                    if (naturalWidth <= 0 || naturalHeight <= 0 ||
                        double.IsNaN(naturalWidth) || double.IsNaN(naturalHeight))
                    {
                        throw new InvalidOperationException(
                            "第 " + (panelIndex + 1) + " 个面板的图片尺寸无效（自然尺寸 " +
                            naturalWidth + " x " + naturalHeight + " pt）。");
                    }

                    double boxX = (panel.XMm - offsetX) * MmToPt;
                    double boxY = (panel.YMm - offsetY) * MmToPt;
                    double boxW = panel.WMm * MmToPt;
                    double boxH = panel.HMm * MmToPt;

                    // PowerPoint 图片默认可能锁定纵横比：stretch 时必须先关闭，否则宽高会被互相牵制，
                    // 实际形状变成 contain（这是 v1.3.1 墨迹探针发现白边残差的根因之一）。
                    try
                    {
                        shape.LockAspectRatio = MsoFalse;
                    }
                    catch (Exception ex)
                    {
                        result.Diagnostics.Add("设置 LockAspectRatio=false 失败（忽略）：" + ex.Message);
                    }

                    double left;
                    double top;
                    double width;
                    double height;

                    if (string.Equals(panel.Fit, "stretch", StringComparison.OrdinalIgnoreCase))
                    {
                        left = boxX;
                        top = boxY;
                        width = boxW;
                        height = boxH;
                    }
                    else if (panel.ImageWidthPx > 0 && panel.ImageHeightPx > 0)
                    {
                        // 应用 spec 带前端显示像素宽高：按该比例 contain，保证与预览/墨迹裁剪坐标一致
                        double displayAspect = panel.ImageWidthPx / panel.ImageHeightPx;
                        if (double.IsNaN(displayAspect) || double.IsInfinity(displayAspect) || displayAspect <= 0)
                        {
                            displayAspect = naturalWidth / naturalHeight;
                        }

                        if (boxW / displayAspect <= boxH)
                        {
                            width = boxW;
                            height = boxW / displayAspect;
                        }
                        else
                        {
                            height = boxH;
                            width = boxH * displayAspect;
                        }

                        left = boxX + (boxW - width) / 2.0;
                        top = boxY + (boxH - height) / 2.0;
                    }
                    else
                    {
                        double scale = Math.Min(boxW / naturalWidth, boxH / naturalHeight);
                        width = naturalWidth * scale;
                        height = naturalHeight * scale;
                        left = boxX + (boxW - width) / 2.0;
                        top = boxY + (boxH - height) / 2.0;
                    }

                    shape.Left = (float)left;
                    shape.Top = (float)top;
                    shape.Width = (float)width;
                    shape.Height = (float)height;

                    if (Math.Abs(panel.Rotation) > 0.0001)
                    {
                        try
                        {
                            shape.Rotation = (float)panel.Rotation;
                        }
                        catch (Exception ex)
                        {
                            result.Diagnostics.Add("设置 rotation 失败（忽略）：" + ex.Message);
                        }
                    }

                    if (panel.BorderOn)
                    {
                        int borderRgb;
                        if (!TryParseColor(panel.BorderColor, out borderRgb))
                        {
                            borderRgb = 0;
                        }

                        try
                        {
                            shape.Line.Visible = MsoTrue;
                            shape.Line.ForeColor.RGB = borderRgb;
                            shape.Line.Weight = (float)Math.Max(0.01, panel.BorderWidthMm * MmToPt);
                        }
                        catch (Exception ex)
                        {
                            result.Diagnostics.Add("设置面板边框失败（忽略）：" + ex.Message);
                        }
                    }
                    else
                    {
                        try
                        {
                            shape.Line.Visible = MsoFalse;
                        }
                        catch
                        {
                            // ignore
                        }
                    }

                    if (countStats)
                    {
                        if (panel.Kind == "emf")
                        {
                            result.VectorPanels++;
                        }
                        else
                        {
                            result.RasterPanels++;
                        }
                    }

                    panelIndex++;
                }

                int labelIndex = 0;
                foreach (VectorPdfLabel label in spec.Labels)
                {
                    double left = (label.BoxXmm - offsetX) * MmToPt;
                    double top = (label.BoxYmm - offsetY) * MmToPt;
                    double width = Math.Max(1.0, label.BoxWmm * MmToPt);
                    double height = Math.Max(1.0, label.BoxHmm * MmToPt);

                    dynamic textbox;
                    try
                    {
                        textbox = slide.Shapes.AddTextbox(
                            MsoTextOrientationHorizontal,
                            (float)left,
                            (float)top,
                            (float)width,
                            (float)height);
                    }
                    catch (Exception ex)
                    {
                        throw new InvalidOperationException(
                            "第 " + (labelIndex + 1) + " 个标签创建文本框失败：" + DescribeException(ex));
                    }

                    try
                    {
                        dynamic textFrame = textbox.TextFrame;
                        textFrame.MarginLeft = 0f;
                        textFrame.MarginRight = 0f;
                        textFrame.MarginTop = 0f;
                        textFrame.MarginBottom = 0f;
                        textFrame.WordWrap = MsoFalse;
                        try
                        {
                            textFrame.AutoSize = 0; // ppAutoSizeNone
                        }
                        catch
                        {
                            // ignore
                        }

                        try
                        {
                            textFrame.VerticalAnchor = MsoAnchorTop;
                        }
                        catch
                        {
                            // ignore
                        }

                        dynamic textRange = textFrame.TextRange;
                        textRange.Text = label.Text;
                        textRange.Font.Name = string.IsNullOrEmpty(label.FontName) ? "Times New Roman" : label.FontName;
                        try
                        {
                            textRange.Font.NameFarEast =
                                string.IsNullOrEmpty(label.FontName) ? "SimSun" : label.FontName;
                        }
                        catch
                        {
                            // ignore
                        }

                        textRange.Font.Size = (float)label.FontSizePt;
                        textRange.Font.Bold = label.Bold ? MsoTrue : MsoFalse;
                        textRange.Font.Italic = label.Italic ? MsoTrue : MsoFalse;

                        int textRgb;
                        if (!TryParseColor(label.Color, out textRgb))
                        {
                            textRgb = 0;
                        }

                        textRange.Font.Color.RGB = textRgb;
                        textRange.ParagraphFormat.Alignment = AlignToPowerPoint(label.Align);

                        if (string.Equals(label.Bg, "none", StringComparison.OrdinalIgnoreCase) ||
                            string.IsNullOrEmpty(label.Bg))
                        {
                            textbox.Fill.Visible = MsoFalse;
                        }
                        else
                        {
                            int bgRgb;
                            if (!TryParseColor(label.BgColor, out bgRgb))
                            {
                                bgRgb = 0xFFFFFF;
                            }

                            textbox.Fill.Visible = MsoTrue;
                            textbox.Fill.Solid();
                            textbox.Fill.ForeColor.RGB = bgRgb;
                            try
                            {
                                double opacity = Math.Max(0, Math.Min(1, label.BgOpacity));
                                textbox.Fill.Transparency = (float)(1.0 - opacity);
                            }
                            catch
                            {
                                // ignore
                            }
                        }

                        textbox.Line.Visible = MsoFalse;
                    }
                    catch (Exception ex)
                    {
                        throw new InvalidOperationException(
                            "第 " + (labelIndex + 1) + " 个标签排版失败：" + DescribeException(ex));
                    }

                    labelIndex++;
                }

                if (!string.IsNullOrEmpty(probePath))
                {
                    try
                    {
                        int probeWidth = ProbeWidthPx;
                        int probeHeight = (int)Math.Round(probeWidth * (crop.H / crop.W));
                        if (probeHeight < 100)
                        {
                            probeHeight = 100;
                        }

                        if (probeHeight > ProbeMaxHeightPx)
                        {
                            probeHeight = ProbeMaxHeightPx;
                            probeWidth = Math.Max(100, (int)Math.Round(probeHeight * (crop.W / crop.H)));
                        }

                        Trace("  compose: slide.Export probe " + probeWidth + "x" + probeHeight + " start");
                        slide.Export(probePath, "PNG", probeWidth, probeHeight);
                        Trace("  compose: slide.Export probe done");
                    }
                    catch (Exception ex)
                    {
                        result.Diagnostics.Add(
                            "slide.Export 墨迹探针失败（将回退为不校正）：" + DescribeException(ex));
                    }
                }

                if (!string.IsNullOrEmpty(pdfPath))
                {
                    Trace("  compose: SaveAs PDF start");
                    pres.SaveAs(pdfPath, PpSaveAsPdf);
                    Trace("  compose: SaveAs PDF done");
                }
            }
            finally
            {
                try
                {
                    pres.Close();
                }
                catch
                {
                    // ignore
                }

                try
                {
                    Marshal.FinalReleaseComObject(pres);
                }
                catch
                {
                    // ignore
                }
            }
        }

        // ---------------------------------------------------------------- 墨迹探针

        private static bool TryMeasureInkMargins(
            string probePath,
            string backgroundHex,
            CropBox crop,
            VectorPdfResult result,
            out double leftMm,
            out double topMm,
            out double rightMm,
            out double bottomMm)
        {
            leftMm = 0;
            topMm = 0;
            rightMm = 0;
            bottomMm = 0;

            try
            {
                if (!File.Exists(probePath))
                {
                    result.Diagnostics.Add("墨迹探针文件不存在：" + probePath);
                    return false;
                }

                int backgroundR = 255;
                int backgroundG = 255;
                int backgroundB = 255;
                int oleRgb;
                if (TryParseColor(backgroundHex, out oleRgb))
                {
                    backgroundB = oleRgb & 0xFF;
                    backgroundG = (oleRgb >> 8) & 0xFF;
                    backgroundR = (oleRgb >> 16) & 0xFF;
                }

                using (Bitmap source = new Bitmap(probePath))
                using (Bitmap bitmap = source.Clone(
                    new Rectangle(0, 0, source.Width, source.Height),
                    PixelFormat.Format32bppArgb))
                {
                    int width = bitmap.Width;
                    int height = bitmap.Height;
                    if (width < 8 || height < 8)
                    {
                        result.Diagnostics.Add("墨迹探针尺寸过小。");
                        return false;
                    }

                    BitmapData data = bitmap.LockBits(
                        new Rectangle(0, 0, width, height),
                        ImageLockMode.ReadOnly,
                        PixelFormat.Format32bppArgb);
                    try
                    {
                        const int tolerance = 8;
                        int minX = width;
                        int maxX = -1;
                        int minY = height;
                        int maxY = -1;
                        byte[] row = new byte[Math.Abs(data.Stride)];

                        for (int y = 0; y < height; y++)
                        {
                            Marshal.Copy(IntPtr.Add(data.Scan0, y * data.Stride), row, 0, row.Length);
                            for (int x = 0; x < width; x++)
                            {
                                int offset = x * 4;
                                if (row[offset + 3] == 0)
                                {
                                    continue;
                                }

                                int b = row[offset];
                                int g = row[offset + 1];
                                int r = row[offset + 2];
                                if (Math.Abs(r - backgroundR) > tolerance ||
                                    Math.Abs(g - backgroundG) > tolerance ||
                                    Math.Abs(b - backgroundB) > tolerance)
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
                            result.Diagnostics.Add("墨迹探针图像全为背景色，无法测量。");
                            return false;
                        }

                        double pxPerMmX = crop.W / width;
                        double pxPerMmY = crop.H / height;
                        leftMm = minX * pxPerMmX;
                        topMm = minY * pxPerMmY;
                        rightMm = (width - 1 - maxX) * pxPerMmX;
                        bottomMm = (height - 1 - maxY) * pxPerMmY;
                        result.Diagnostics.Add(string.Format(
                            "ink-probe: {0}x{1}px bbox=({2},{3})-({4},{5})",
                            width,
                            height,
                            minX,
                            minY,
                            maxX,
                            maxY));
                        return true;
                    }
                    finally
                    {
                        bitmap.UnlockBits(data);
                    }
                }
            }
            catch (Exception ex)
            {
                result.Diagnostics.Add("墨迹探针测量失败：" + ex.Message);
                return false;
            }
        }

        /// <summary>
        /// v1.3.2：由“当前 crop + 探针测得的四边白边”还原整页实际 ink bbox，再向四周扩展
        /// trimMargin 安全边距（而不是裁到零白边）。超出原页面边界时按页面裁切，保证编号等贴边内容完整。
        /// </summary>
        private static CropBox AdjustCrop(
            CropBox crop,
            VectorPdfSpec spec,
            double leftMm,
            double topMm,
            double rightMm,
            double bottomMm,
            double marginMm)
        {
            double inkX = crop.X + leftMm;
            double inkY = crop.Y + topMm;
            double inkW = crop.W - leftMm - rightMm;
            double inkH = crop.H - topMm - bottomMm;
            if (inkW <= 0.05 || inkH <= 0.05 ||
                double.IsNaN(inkW) || double.IsNaN(inkH) ||
                double.IsInfinity(inkW) || double.IsInfinity(inkH))
            {
                return null;
            }

            double newX = Math.Max(0, inkX - marginMm);
            double newY = Math.Max(0, inkY - marginMm);
            double newRight = Math.Min(spec.WidthMm, inkX + inkW + marginMm);
            double newBottom = Math.Min(spec.HeightMm, inkY + inkH + marginMm);
            double newW = newRight - newX;
            double newH = newBottom - newY;

            if (newW < MinPowerPointPageMm || newH < MinPowerPointPageMm)
            {
                return null;
            }

            if (double.IsNaN(newW) || double.IsNaN(newH) ||
                double.IsInfinity(newW) || double.IsInfinity(newH))
            {
                return null;
            }

            return new CropBox { X = newX, Y = newY, W = newW, H = newH };
        }

        private static bool CropEquals(CropBox a, CropBox b, double epsilonMm)
        {
            return Math.Abs(a.X - b.X) <= epsilonMm &&
                   Math.Abs(a.Y - b.Y) <= epsilonMm &&
                   Math.Abs(a.W - b.W) <= epsilonMm &&
                   Math.Abs(a.H - b.H) <= epsilonMm;
        }

        // ---------------------------------------------------------------- 进程管理

        public static int[] SnapshotPowerPointPids()
        {
            try
            {
                Process[] processes = Process.GetProcessesByName("POWERPNT");
                int[] pids = new int[processes.Length];
                for (int i = 0; i < processes.Length; i++)
                {
                    pids[i] = processes[i].Id;
                    processes[i].Dispose();
                }

                return pids;
            }
            catch
            {
                return new int[0];
            }
        }

        /// <summary>超时兜底：结束本次新启动的 POWERPNT 进程（不影响用户原本打开实例）。</summary>
        public static void KillNewPowerPointProcesses(int[] existingPids)
        {
            WaitAndKillNewPowerPointProcesses(existingPids, 0);
        }

        private static void WaitAndKillNewPowerPointProcesses(int[] existingPids, int waitMilliseconds)
        {
            if (waitMilliseconds > 0)
            {
                try
                {
                    Thread.Sleep(waitMilliseconds);
                }
                catch
                {
                    // ignore
                }
            }

            HashSet<int> known = new HashSet<int>(existingPids ?? new int[0]);
            try
            {
                foreach (Process process in Process.GetProcessesByName("POWERPNT"))
                {
                    try
                    {
                        if (!known.Contains(process.Id))
                        {
                            process.Kill();
                        }
                    }
                    catch
                    {
                        // ignore
                    }
                    finally
                    {
                        process.Dispose();
                    }
                }
            }
            catch
            {
                // ignore
            }
        }

        // ---------------------------------------------------------------- 工具

        private static int AlignToPowerPoint(string align)
        {
            if (string.Equals(align, "center", StringComparison.OrdinalIgnoreCase))
            {
                return PpAlignCenter;
            }

            if (string.Equals(align, "right", StringComparison.OrdinalIgnoreCase))
            {
                return PpAlignRight;
            }

            return PpAlignLeft;
        }

        /// <summary>#RRGGBB → OLE_COLOR（0xBBGGRR）。</summary>
        internal static bool TryParseColor(string color, out int oleRgb)
        {
            oleRgb = 0;
            if (string.IsNullOrWhiteSpace(color))
            {
                return false;
            }

            string value = color.Trim();
            if (value.StartsWith("#", StringComparison.Ordinal))
            {
                value = value.Substring(1);
            }

            if (value.Length != 6)
            {
                return false;
            }

            int r;
            int g;
            int b;
            if (!int.TryParse(value.Substring(0, 2), System.Globalization.NumberStyles.HexNumber, null, out r) ||
                !int.TryParse(value.Substring(2, 2), System.Globalization.NumberStyles.HexNumber, null, out g) ||
                !int.TryParse(value.Substring(4, 2), System.Globalization.NumberStyles.HexNumber, null, out b))
            {
                return false;
            }

            oleRgb = r | (g << 8) | (b << 16);
            return true;
        }

        internal static string DescribeException(Exception exception)
        {
            if (exception == null)
            {
                return "未知错误";
            }

            List<string> messages = new List<string>();
            for (Exception current = exception; current != null; current = current.InnerException)
            {
                string message = current.Message;
                if (!string.IsNullOrEmpty(message) && !messages.Contains(message))
                {
                    messages.Add(message);
                }
            }

            COMException comException = exception as COMException;
            if (comException != null)
            {
                messages.Add("HRESULT=0x" + comException.HResult.ToString("X8"));
            }

            return string.Join(" → ", messages.ToArray());
        }
    }
}
