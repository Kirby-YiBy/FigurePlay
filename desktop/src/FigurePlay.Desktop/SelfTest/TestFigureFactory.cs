using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;
using System.Windows.Forms;
using FigurePlay.Desktop.Bridge;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>生成自测用的 EMF 测试图，并按 MATLAB Copy Figure 的方式放入剪贴板。</summary>
    internal static class TestFigureFactory
    {
        /// <summary>录制一张 900x600 逻辑像素的 EMF（含文字、线、矩形、圆、折线、填充）。</summary>
        public static Metafile CreateMetafile()
        {
            using (Graphics reference = Graphics.FromHwnd(IntPtr.Zero))
            {
                IntPtr hdc = reference.GetHdc();
                try
                {
                    Rectangle frame = new Rectangle(0, 0, 900, 600);
                    Metafile metafile = new Metafile(
                        hdc,
                        frame,
                        MetafileFrameUnit.Pixel,
                        EmfType.EmfOnly,
                        "FigurePlay selftest figure");

                    using (Graphics graphics = Graphics.FromImage(metafile))
                    {
                        graphics.SmoothingMode = SmoothingMode.AntiAlias;
                        graphics.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
                        graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        graphics.FillRectangle(Brushes.White, frame);

                        using (Pen bluePen = new Pen(Color.FromArgb(37, 99, 235), 6f))
                        {
                            graphics.DrawLine(bluePen, 70f, 520f, 840f, 90f);
                            graphics.DrawRectangle(bluePen, 55f, 55f, 310f, 190f);
                        }

                        using (SolidBrush greenBrush = new SolidBrush(Color.FromArgb(22, 163, 74)))
                        {
                            graphics.FillEllipse(greenBrush, 500f, 200f, 260f, 210f);
                        }

                        using (Pen redPen = new Pen(Color.FromArgb(220, 38, 38), 2.5f))
                        {
                            graphics.DrawLine(redPen, 500f, 470f, 620f, 430f);
                            graphics.DrawLine(redPen, 620f, 430f, 760f, 500f);
                            graphics.DrawLine(redPen, 760f, 500f, 860f, 420f);
                        }

                        using (SolidBrush textBrush = new SolidBrush(Color.FromArgb(20, 30, 48)))
                        using (Font titleFont = new Font("Microsoft YaHei", 40f, FontStyle.Bold, GraphicsUnit.Point))
                        using (Font smallFont = new Font("Segoe UI", 17f, FontStyle.Regular, GraphicsUnit.Point))
                        {
                            graphics.DrawString("FigurePlay EMF 测试图", titleFont, textBrush, 70f, 320f);
                            graphics.DrawString(
                                "EMF selftest / 2600px @ 300dpi / " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                                smallFont,
                                textBrush,
                                72f,
                                400f);
                        }
                    }

                    return metafile;
                }
                finally
                {
                    reference.ReleaseHdc(hdc);
                }
            }
        }

        /// <summary>
        /// 把真实 EMF 字节放入剪贴板（优先原生 CF_ENHMETAFILE）。
        /// 使用字节而非 Metafile 对象，避免 GetHenhmetafile/DeleteEnhMetaFile 使对象失效。
        /// </summary>
        public static bool PutEnhancedMetafileBytesOnClipboard(
            byte[] emfBytes,
            List<string> diagnostics,
            out string error)
        {
            error = null;
            if (diagnostics == null)
            {
                diagnostics = new List<string>();
            }

            if (!EmfValidator.LooksLikeEmf(emfBytes))
            {
                error = "测试 EMF 不是真实 EMF（文件头 " + EmfValidator.DescribeHeader(emfBytes) +
                        "，应为 01 00 00 00）。";
                diagnostics.Add(error);
                return false;
            }

            string nativeError;
            if (NativeClipboard.TrySetClipboardEnhancedMetafileBytes(emfBytes, out nativeError))
            {
                diagnostics.Add(
                    "clipboard: 已写入原生 CF_ENHMETAFILE（真实 EMF " + emfBytes.Length + " 字节）");
                return true;
            }

            error = "写入测试 EMF 到剪贴板失败：" + (nativeError ?? "未知原因");
            diagnostics.Add(error);
            return false;
        }

        /// <summary>读取当前剪贴板格式列表（用于日志）。</summary>
        public static string[] GetClipboardFormats()
        {
            try
            {
                IDataObject data = Clipboard.GetDataObject();
                if (data == null)
                {
                    return new string[0];
                }

                string[] formats = data.GetFormats(false);
                return formats ?? new string[0];
            }
            catch
            {
                return new string[0];
            }
        }

        /// <summary>把测试 EMF 保存到磁盘（必须写原始 EMF 记录字节，GDI+ 的 Save 会误写成 PNG）。</summary>
        public static long SaveMetafile(Metafile metafile, string path)
        {
            string directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            byte[] emfBytes;
            if (!EmfValidator.TryGetEmfBytesFromMetafile(metafile, out emfBytes))
            {
                throw new InvalidOperationException("无法从测试 Metafile 提取真实 EMF 字节。");
            }

            File.WriteAllBytes(path, emfBytes);
            return emfBytes.Length;
        }

        /// <summary>提取真实 EMF 记录字节。</summary>
        public static byte[] GetEmfBytes(Metafile metafile)
        {
            byte[] emfBytes;
            if (!EmfValidator.TryGetEmfBytesFromMetafile(metafile, out emfBytes))
            {
                throw new InvalidOperationException("无法从 Metafile 提取真实 EMF 字节。");
            }

            return emfBytes;
        }
    }
}
