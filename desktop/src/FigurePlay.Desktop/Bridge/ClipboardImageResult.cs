using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Text;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>剪贴板图像转换结果（C# 侧内部表示）。</summary>
    internal sealed class ClipboardImageResult
    {
        public bool Ok { get; set; }

        public string Error { get; set; }

        /// <summary>EMF / Metafile / Bitmap / DIB。</summary>
        public string SourceFormat { get; set; }

        public int Width { get; set; }

        public int Height { get; set; }

        public byte[] PngBytes { get; set; }

        /// <summary>真实 EMF 原始字节（sourceFormat=EMF/Metafile 且成功提取时），供前端导出矢量 PDF。</summary>
        public byte[] EmfBytes { get; set; }

        public List<string> Diagnostics { get; } = new List<string>();

        public string DataUrl
        {
            get
            {
                if (!Ok || PngBytes == null || PngBytes.Length == 0)
                {
                    return null;
                }

                return "data:image/png;base64," + Convert.ToBase64String(PngBytes);
            }
        }

        public static ClipboardImageResult Fail(string error)
        {
            return new ClipboardImageResult
            {
                Ok = false,
                Error = error,
            };
        }

        public static ClipboardImageResult Success(
            byte[] pngBytes,
            int width,
            int height,
            string sourceFormat)
        {
            return new ClipboardImageResult
            {
                Ok = true,
                PngBytes = pngBytes,
                Width = width,
                Height = height,
                SourceFormat = sourceFormat,
            };
        }

        /// <summary>从 Bitmap 编码为 PNG（统一出口，保证 PNG 签名正确）。</summary>
        public static ClipboardImageResult FromBitmap(Bitmap bitmap, string sourceFormat)
        {
            if (bitmap == null)
            {
                throw new ArgumentNullException("bitmap");
            }

            using (MemoryStream ms = new MemoryStream())
            {
                bitmap.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                byte[] png = ms.ToArray();
                if (png.Length < 8 ||
                    png[0] != 0x89 || png[1] != 0x50 || png[2] != 0x4E || png[3] != 0x47)
                {
                    throw new InvalidOperationException("PNG 编码失败（输出为空或签名不正确）。");
                }

                ClipboardImageResult result = Success(png, bitmap.Width, bitmap.Height, sourceFormat);
                return result;
            }
        }

        public string Describe()
        {
            if (!Ok)
            {
                return "失败：" + Error;
            }

            return string.Format(
                "成功 sourceFormat={0} 尺寸={1}x{2} PNG={3} 字节 dataUrl={4} 字符 EMF={5} 字节",
                SourceFormat,
                Width,
                Height,
                PngBytes == null ? 0 : PngBytes.Length,
                DataUrl == null ? 0 : DataUrl.Length,
                EmfBytes == null ? 0 : EmfBytes.Length);
        }

        public string FormatDiagnostics()
        {
            if (Diagnostics.Count == 0)
            {
                return string.Empty;
            }

            StringBuilder sb = new StringBuilder();
            foreach (string line in Diagnostics)
            {
                sb.AppendLine(line);
            }

            return sb.ToString().TrimEnd();
        }
    }
}
