using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// 使用 PowerPoint COM 把 EMF/PNG 面板与文本标签排版成单页矢量 PDF。
    ///
    /// 关键点：
    ///  - 只用 PowerPoint 的排版/导出能力，不保存 pptx，不改用户文件；
    ///  - EMF 面板保持矢量（实测 PowerPoint 导出的 PDF 中 pdfimages 无位图、pdftotext 可提取文字）；
    ///  - contain 等比缩放居中 / stretch 填满；rotation 通过 shape.Rotation；
    ///  - 复杂变换（cover / zoom / offset 或非法 fit）在 spec 解析阶段返回 UNSUPPORTED_TRANSFORM；
    ///  - PowerPoint 进程管理：若由本方法启动，退出时 Quit 并清理残留进程；若用户原本已打开 PowerPoint，
    ///    只关闭本次创建的 presentation，绝不 Quit 用户实例。
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

        /// <summary>在当前（STA）线程执行 PowerPoint 排版并导出 PDF。</summary>
        public static VectorPdfResult Export(VectorPdfSpec spec)
        {
            VectorPdfResult result = new VectorPdfResult();
            if (spec == null)
            {
                return VectorPdfResult.Fail("导出参数无效：spec 为空。");
            }

            string tempDir = Path.Combine(AppPaths.TempRoot, "vectorpdf-" + Guid.NewGuid().ToString("N"));
            string pdfPath = Path.Combine(tempDir, "output.pdf");
            object application = null;
            object presentation = null;
            int[] existingPowerPointPids = SnapshotPowerPointPids();
            bool startedByUs = existingPowerPointPids.Length == 0;
            Stopwatch watch = Stopwatch.StartNew();

            try
            {
                Directory.CreateDirectory(tempDir);

                Type powerpointType = Type.GetTypeFromProgID("PowerPoint.Application");
                if (powerpointType == null)
                {
                    return VectorPdfResult.Fail(
                        "未安装 Microsoft PowerPoint，无法导出矢量 PDF。" +
                        "矢量 PDF 导出需要桌面版 PowerPoint 2016 或更高版本；" +
                        "如未安装，请使用位图 PDF 导出（EMF 仍会以图片方式保留清晰度）。");
                }

                try
                {
                    application = Activator.CreateInstance(powerpointType);
                }
                catch (Exception ex)
                {
                    return VectorPdfResult.Fail(
                        "无法启动 PowerPoint COM 组件：" + DescribeException(ex) +
                        "。请确认已安装桌面版 PowerPoint（不是仅网页版/查看器）。");
                }

                if (application == null)
                {
                    return VectorPdfResult.Fail("无法启动 PowerPoint COM 组件（CreateInstance 返回空）。");
                }

                dynamic app = application;
                // PowerPoint 2021 不允许隐藏应用窗口（Visible=false 会抛异常），
                // 但 Presentations.Add(WithWindow=false) 不会显示演示文档窗口；此处尽力而为。
                try
                {
                    app.Visible = MsoFalse;
                }
                catch
                {
                    // ignore
                }

                presentation = app.Presentations.Add(MsoFalse);
                if (presentation == null)
                {
                    return VectorPdfResult.Fail("PowerPoint 创建演示文稿失败。");
                }

                dynamic pres = presentation;
                double pageWidthMm = spec.EffectiveWidthMm;
                double pageHeightMm = spec.EffectiveHeightMm;
                double offsetX = spec.HasCrop ? spec.CropXmm : 0;
                double offsetY = spec.HasCrop ? spec.CropYmm : 0;

                pres.PageSetup.SlideWidth = (float)(pageWidthMm * MmToPt);
                pres.PageSetup.SlideHeight = (float)(pageHeightMm * MmToPt);
                result.Diagnostics.Add(string.Format(
                    "slide: {0} x {1} pt ({2} x {3} mm); crop={4} offset={5},{6}mm",
                    pres.PageSetup.SlideWidth,
                    pres.PageSetup.SlideHeight,
                    pageWidthMm,
                    pageHeightMm,
                    spec.HasCrop,
                    offsetX,
                    offsetY));

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

                // ---------------- 面板 ----------------
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
                        return VectorPdfResult.Fail(
                            "第 " + (panelIndex + 1) + " 个面板插入 PowerPoint 失败：" +
                            DescribeException(ex) + "（EMF 可能已损坏或不受 PowerPoint 支持）。");
                    }

                    double naturalWidth = Convert.ToDouble(shape.Width);
                    double naturalHeight = Convert.ToDouble(shape.Height);
                    if (naturalWidth <= 0 || naturalHeight <= 0 || double.IsNaN(naturalWidth) || double.IsNaN(naturalHeight))
                    {
                        return VectorPdfResult.Fail(
                            "第 " + (panelIndex + 1) + " 个面板的图片尺寸无效（自然尺寸 " +
                            naturalWidth + " x " + naturalHeight + " pt）。");
                    }

                    double boxX = (panel.XMm - offsetX) * MmToPt;
                    double boxY = (panel.YMm - offsetY) * MmToPt;
                    double boxW = panel.WMm * MmToPt;
                    double boxH = panel.HMm * MmToPt;

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

                    result.Diagnostics.Add(string.Format(
                        "panel[{0}]: kind={1} fit={2} natural={3}x{4}pt placed={5},{6} {7}x{8}pt",
                        panelIndex,
                        panel.Kind,
                        panel.Fit,
                        Math.Round(naturalWidth, 2),
                        Math.Round(naturalHeight, 2),
                        Math.Round(left, 2),
                        Math.Round(top, 2),
                        Math.Round(width, 2),
                        Math.Round(height, 2)));

                    if (panel.Kind == "emf")
                    {
                        result.VectorPanels++;
                    }
                    else
                    {
                        result.RasterPanels++;
                    }

                    panelIndex++;
                }

                // ---------------- 标签 ----------------
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
                        return VectorPdfResult.Fail(
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

                        // wordwrap=false 时 PowerPoint 可能按框宽换行；这里尽量保证单行显示（溢出可见）
                        try
                        {
                            textFrame.WordWrap = MsoFalse;
                        }
                        catch
                        {
                            // ignore
                        }

                        result.Diagnostics.Add(string.Format(
                            "label[{0}]: \"{1}\" at {2},{3} box {4}x{5}mm font={6}pt {7}",
                            labelIndex,
                            label.Text,
                            Math.Round(label.BoxXmm, 2),
                            Math.Round(label.BoxYmm, 2),
                            Math.Round(label.BoxWmm, 2),
                            Math.Round(label.BoxHmm, 2),
                            label.FontSizePt,
                            label.FontName));
                    }
                    catch (Exception ex)
                    {
                        return VectorPdfResult.Fail(
                            "第 " + (labelIndex + 1) + " 个标签排版失败：" + DescribeException(ex));
                    }

                    labelIndex++;
                }

                // ---------------- 导出 PDF ----------------
                try
                {
                    pres.SaveAs(pdfPath, PpSaveAsPdf);
                }
                catch (Exception ex)
                {
                    return VectorPdfResult.Fail("PowerPoint 导出 PDF 失败：" + DescribeException(ex));
                }

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
                    "pdf: {0} bytes in {1}ms vectorPanels={2} rasterPanels={3}",
                    pdfBytes.Length,
                    watch.ElapsedMilliseconds,
                    result.VectorPanels,
                    result.RasterPanels));
                return result;
            }
            catch (Exception ex)
            {
                return VectorPdfResult.Fail("PowerPoint 矢量 PDF 导出失败：" + DescribeException(ex));
            }
            finally
            {
                try
                {
                    if (presentation != null)
                    {
                        ((dynamic)presentation).Close();
                    }
                }
                catch
                {
                    // ignore
                }

                if (startedByUs && application != null)
                {
                    try
                    {
                        ((dynamic)application).Quit();
                    }
                    catch
                    {
                        // ignore
                    }
                }

                try
                {
                    if (presentation != null)
                    {
                        Marshal.FinalReleaseComObject(presentation);
                    }
                }
                catch
                {
                    // ignore
                }

                try
                {
                    if (application != null)
                    {
                        Marshal.FinalReleaseComObject(application);
                    }
                }
                catch
                {
                    // ignore
                }

                GC.Collect();
                GC.WaitForPendingFinalizers();

                if (startedByUs)
                {
                    WaitAndKillNewPowerPointProcesses(existingPowerPointPids, 3000);
                }
                else
                {
                    // 用户原本可能已打开 PowerPoint：只清理本次自动化新起的进程，
                    // 绝不 Quit/Kill 用户已有实例。
                    WaitAndKillNewPowerPointProcesses(existingPowerPointPids, 1000);
                }

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
