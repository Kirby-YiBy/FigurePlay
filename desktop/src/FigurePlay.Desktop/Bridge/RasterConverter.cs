using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>位图类剪贴板图像（CF_BITMAP / PNG / DIB / .fig）→ 白底 PNG，限尺寸、限体积。</summary>
    internal static class RasterConverter
    {
        /// <summary>单张 PNG 体积上限（避免桥消息/内存过大）。</summary>
        public const int MaxPngBytes = 8 * 1024 * 1024;

        /// <summary>单边最大像素。</summary>
        public const int MaxDimension = 6000;

        public static ClipboardImageResult FromImage(
            Image image,
            string sourceFormat,
            List<string> diagnostics)
        {
            if (image == null)
            {
                throw new ArgumentNullException("image");
            }

            if (diagnostics == null)
            {
                diagnostics = new List<string>();
            }

            // 个别程序把 EMF 以 Image 形式暴露出来，走矢量渲染路径（渲染后再提取 EMF 字节）。
            Metafile metafile = image as Metafile;
            if (metafile != null)
            {
                ClipboardImageResult rendered = MetafileConverter.Render(metafile, "Metafile", diagnostics);
                byte[] emfBytes;
                if (EmfValidator.TryGetEmfBytesFromMetafile(metafile, out emfBytes))
                {
                    rendered.EmfBytes = emfBytes;
                }

                return rendered;
            }

            int width = image.Width;
            int height = image.Height;
            if (width <= 0 || height <= 0)
            {
                throw new InvalidOperationException("剪贴板图像尺寸无效。");
            }

            diagnostics.Add("raster: " + width + "x" + height + " format=" + image.PixelFormat);

            float dpiX = 96f;
            float dpiY = 96f;
            try
            {
                dpiX = image.HorizontalResolution;
                dpiY = image.VerticalResolution;
            }
            catch
            {
                // ignore
            }

            using (Bitmap flattened = FlattenToWhite(image))
            {
                Bitmap final = flattened;
                bool needDispose = false;
                try
                {
                    if (flattened.Width > MaxDimension || flattened.Height > MaxDimension)
                    {
                        double factor = Math.Min(
                            MaxDimension / (double)flattened.Width,
                            MaxDimension / (double)flattened.Height);
                        int targetWidth = Math.Max(1, (int)Math.Round(flattened.Width * factor));
                        int targetHeight = Math.Max(1, (int)Math.Round(flattened.Height * factor));
                        diagnostics.Add("raster-scale: " + targetWidth + "x" + targetHeight);
                        final = Scale(flattened, targetWidth, targetHeight);
                        needDispose = true;
                    }

                    try
                    {
                        if (dpiX > 1 && dpiY > 1)
                        {
                            final.SetResolution(dpiX, dpiY);
                        }
                    }
                    catch
                    {
                        // ignore
                    }

                    ClipboardImageResult result = Encode(final, sourceFormat, diagnostics, MaxPngBytes);
                    return result;
                }
                finally
                {
                    if (needDispose)
                    {
                        final.Dispose();
                    }
                }
            }
        }

        /// <summary>编码为 PNG；若超过体积上限则等比缩小重试（最多 6 次）。</summary>
        public static ClipboardImageResult Encode(
            Bitmap bitmap,
            string sourceFormat,
            List<string> diagnostics,
            int maxPngBytes)
        {
            if (bitmap == null)
            {
                throw new ArgumentNullException("bitmap");
            }

            if (diagnostics == null)
            {
                diagnostics = new List<string>();
            }

            if (maxPngBytes <= 0)
            {
                maxPngBytes = MaxPngBytes;
            }

            Bitmap current = bitmap;
            bool ownsCurrent = false;
            try
            {
                for (int attempt = 0; attempt < 6; attempt++)
                {
                    ClipboardImageResult result = ClipboardImageResult.FromBitmap(current, sourceFormat);
                    if (result.PngBytes.Length <= maxPngBytes)
                    {
                        return result;
                    }

                    diagnostics.Add(string.Format(
                        "png 体积 {0:N0}B 超过上限 {1:N0}B，缩小后重试（{2}）",
                        result.PngBytes.Length,
                        maxPngBytes,
                        attempt + 1));

                    double factor = Math.Sqrt(maxPngBytes / (double)result.PngBytes.Length) * 0.97;
                    if (factor > 0.95)
                    {
                        factor = 0.9;
                    }

                    if (factor < 0.5)
                    {
                        factor = 0.5;
                    }

                    int newWidth = Math.Max(400, (int)Math.Round(current.Width * factor));
                    int newHeight = Math.Max(300, (int)Math.Round(current.Height * factor));
                    if (newWidth >= current.Width && newHeight >= current.Height)
                    {
                        newWidth = Math.Max(400, (int)Math.Round(current.Width * 0.85));
                        newHeight = Math.Max(300, (int)Math.Round(current.Height * 0.85));
                    }

                    Bitmap smaller = Scale(current, newWidth, newHeight);
                    if (ownsCurrent)
                    {
                        current.Dispose();
                    }

                    current = smaller;
                    ownsCurrent = true;
                }

                ClipboardImageResult last = ClipboardImageResult.FromBitmap(current, sourceFormat);
                diagnostics.Add("png 体积仍超过上限（" + last.PngBytes.Length + "B），保留最大可达尺寸。");
                return last;
            }
            finally
            {
                if (ownsCurrent && current != null)
                {
                    current.Dispose();
                }
            }
        }

        private static Bitmap FlattenToWhite(Image image)
        {
            Bitmap bitmap = new Bitmap(image.Width, image.Height, PixelFormat.Format32bppArgb);
            try
            {
                bitmap.SetResolution(96f, 96f);
            }
            catch
            {
                // ignore
            }

            using (Graphics graphics = Graphics.FromImage(bitmap))
            {
                graphics.CompositingMode = CompositingMode.SourceOver;
                graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                graphics.Clear(Color.White);
                graphics.DrawImage(image, new Rectangle(0, 0, image.Width, image.Height));
            }

            return bitmap;
        }

        private static Bitmap Scale(Bitmap source, int width, int height)
        {
            Bitmap scaled = new Bitmap(Math.Max(1, width), Math.Max(1, height), PixelFormat.Format32bppArgb);
            try
            {
                float dpiX = source.HorizontalResolution;
                float dpiY = source.VerticalResolution;
                if (dpiX > 1 && dpiY > 1)
                {
                    scaled.SetResolution(dpiX, dpiY);
                }
            }
            catch
            {
                // ignore
            }

            using (Graphics graphics = Graphics.FromImage(scaled))
            {
                graphics.CompositingMode = CompositingMode.SourceOver;
                graphics.SmoothingMode = SmoothingMode.AntiAlias;
                graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                graphics.CompositingQuality = CompositingQuality.HighQuality;
                graphics.Clear(Color.White);
                graphics.DrawImage(source, new Rectangle(0, 0, scaled.Width, scaled.Height));
            }

            return scaled;
        }
    }
}
