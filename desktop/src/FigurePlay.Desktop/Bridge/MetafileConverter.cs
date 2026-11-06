using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// 把 EMF / Metafile 渲染成论文级 PNG。
    /// 清晰度：目标宽度 4400px（要求 4000–4800px；170mm 图上约 650 DPI），
    /// 保持宽高比、单边不超过 6000px、PNG 体积尽量小于 8MB（超限自动缩小重试）。
    /// </summary>
    internal static class MetafileConverter
    {
        /// <summary>目标宽度（像素）：4000–4800 区间取中值。</summary>
        public const int TargetWidth = 4400;

        /// <summary>单边最大像素。</summary>
        public const int MaxDimension = 6000;

        /// <summary>渲染时保存的 DPI（4400px / 170mm ≈ 657 DPI）。</summary>
        public const float TargetDpi = 657f;

        /// <summary>PNG 体积上限。</summary>
        public const int MaxPngBytes = RasterConverter.MaxPngBytes;

        public static ClipboardImageResult Render(
            Metafile metafile,
            string sourceFormat,
            List<string> diagnostics,
            byte[] emfBytes = null)
        {
            if (metafile == null)
            {
                throw new ArgumentNullException("metafile");
            }

            if (diagnostics == null)
            {
                diagnostics = new List<string>();
            }

            MetafileHeader header;
            try
            {
                header = metafile.GetMetafileHeader();
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("EMF 文件头无效，无法解析该图元文件。", ex);
            }

            RectangleF frame = header.Bounds;
            diagnostics.Add(string.Format(
                "metafile: type={0} bounds={1}x{2}@{3},{4} dpi={5}x{6} size={7}B",
                header.Type,
                frame.Width,
                frame.Height,
                frame.X,
                frame.Y,
                header.DpiX,
                header.DpiY,
                header.MetafileSize));

            double logicalWidth = frame.Width;
            double logicalHeight = frame.Height;

            if (logicalWidth <= 0 || logicalHeight <= 0)
            {
                try
                {
                    logicalWidth = metafile.Width;
                    logicalHeight = metafile.Height;
                }
                catch
                {
                    // ignore
                }
            }

            if (logicalWidth <= 0 || logicalHeight <= 0 ||
                double.IsNaN(logicalWidth) || double.IsNaN(logicalHeight))
            {
                throw new InvalidOperationException("EMF 尺寸无效，无法转换为 PNG。");
            }

            int targetWidth = TargetWidth;
            int targetHeight = (int)Math.Round(targetWidth * (logicalHeight / logicalWidth));
            if (targetHeight < 1)
            {
                targetHeight = 1;
            }

            if (targetWidth > MaxDimension || targetHeight > MaxDimension)
            {
                double factor = Math.Min(
                    MaxDimension / (double)targetWidth,
                    MaxDimension / (double)targetHeight);
                targetWidth = Math.Max(1, (int)Math.Floor(targetWidth * factor));
                targetHeight = Math.Max(1, (int)Math.Floor(targetHeight * factor));
            }

            diagnostics.Add(string.Format(
                "render: target={0}x{1} dpi={2}",
                targetWidth,
                targetHeight,
                TargetDpi));

            using (Bitmap bitmap = new Bitmap(targetWidth, targetHeight, PixelFormat.Format32bppArgb))
            {
                try
                {
                    bitmap.SetResolution(TargetDpi, TargetDpi);
                }
                catch
                {
                    // 某些环境下设置 DPI 可能失败，不影响像素结果
                }

                using (Graphics graphics = Graphics.FromImage(bitmap))
                {
                    ConfigureGraphics(graphics);
                    graphics.Clear(Color.White);

                    bool drawn = false;
                    Exception firstError = null;

                    // 方案 A：直接把元文件映射到目标矩形（GDI+ 会按目标尺寸重放记录）。
                    try
                    {
                        graphics.DrawImage(metafile, new RectangleF(0, 0, targetWidth, targetHeight));
                        drawn = true;
                        diagnostics.Add("render-method: destination-rect");
                    }
                    catch (Exception ex)
                    {
                        firstError = ex;
                        diagnostics.Add("render-method destination-rect 失败：" + ex.Message);
                    }

                    // 方案 B：显式世界变换缩放（兼容个别 GDI+ 不按目标矩形缩放的重放器）。
                    if (!drawn)
                    {
                        try
                        {
                            graphics.ResetTransform();
                            graphics.Clear(Color.White);
                            float scaleX = (float)(targetWidth / logicalWidth);
                            float scaleY = (float)(targetHeight / logicalHeight);
                            graphics.ScaleTransform(scaleX, scaleY);
                            graphics.TranslateTransform(-frame.X, -frame.Y);
                            graphics.DrawImage(metafile, 0f, 0f, (float)logicalWidth, (float)logicalHeight);
                            drawn = true;
                            diagnostics.Add("render-method: world-transform");
                        }
                        catch (Exception ex)
                        {
                            diagnostics.Add("render-method world-transform 失败：" + ex.Message);
                            if (firstError != null)
                            {
                                throw new InvalidOperationException(
                                    "EMF 渲染失败：" + firstError.Message,
                                    new AggregateException(firstError, ex));
                            }

                            throw new InvalidOperationException("EMF 渲染失败：" + ex.Message, ex);
                        }
                    }
                }

                ClipboardImageResult result = RasterConverter.Encode(bitmap, sourceFormat, diagnostics, MaxPngBytes);
                if (EmfValidator.LooksLikeEmf(emfBytes))
                {
                    result.EmfBytes = emfBytes;
                    diagnostics.Add("emf-raw: " + emfBytes.Length + " bytes header=" + EmfValidator.DescribeHeader(emfBytes));
                }
                else if (emfBytes != null && emfBytes.Length > 0)
                {
                    diagnostics.Add("emf-raw 被拒绝（非真实 EMF，header=" + EmfValidator.DescribeHeader(emfBytes) + "）。");
                }

                diagnostics.Add("png: " + result.Width + "x" + result.Height + " " + result.PngBytes.Length + "B");
                result.Diagnostics.AddRange(diagnostics);
                return result;
            }
        }

        private static void ConfigureGraphics(Graphics graphics)
        {
            graphics.SmoothingMode = SmoothingMode.AntiAlias;
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
            graphics.CompositingQuality = CompositingQuality.HighQuality;
            graphics.CompositingMode = CompositingMode.SourceOver;
            graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;
        }
    }
}
