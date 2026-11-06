using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// 剪贴板图像读取与转换（必须在 STA 线程调用，由 ClipboardService 保证）。
    /// 读取顺序：EnhancedMetafile / MetafilePict / Clipboard image / DIB。
    /// </summary>
    internal static class ClipboardImageReader
    {
        private const int ClipboardRetryAttempts = 20;

        public static ClipboardImageResult ReadAndConvert()
        {
            ClipboardImageResult status = new ClipboardImageResult();
            IDataObject data = GetClipboardDataObject();
            if (data == null)
            {
                return ClipboardImageResult.Fail("剪贴板为空。");
            }

            string[] formats = SafeGetFormats(data);
            status.Diagnostics.Add("clipboard formats: " + string.Join(" | ", formats));

            bool hasEmf = HasFormat(data, formats, "EnhancedMetafile", "Enhanced Metafile");
            bool hasMetafilePict = HasFormat(data, formats, "MetaFilePict", "MetafilePict", "MetaFile", "Meta File");
            bool hasBitmap = HasFormat(data, formats, "Bitmap", "System.Drawing.Bitmap");
            bool hasPng = HasFormat(data, formats, "PNG");
            bool hasDib = HasFormat(data, formats, "DeviceIndependentBitmap");

            status.Diagnostics.Add(string.Format(
                "detect: emf={0} metafilePict={1} bitmap={2} png={3} dib={4}",
                hasEmf,
                hasMetafilePict,
                hasBitmap,
                hasPng,
                hasDib));

            // 1) Enhanced Metafile（MATLAB Copy Figure 默认格式）
            if (hasEmf)
            {
                ClipboardImageResult result = TryReadEnhancedMetafile(data, status.Diagnostics);
                if (result != null)
                {
                    return result;
                }
            }

            // 2) MetafilePict（部分软件/旧版 MATLAB 使用）
            if (hasMetafilePict)
            {
                ClipboardImageResult result = TryReadMetafilePict(data, status.Diagnostics);
                if (result != null)
                {
                    return result;
                }
            }

            // 3) Clipboard image（CF_BITMAP / PNG 等）
            if (hasBitmap || hasPng)
            {
                ClipboardImageResult result = TryReadClipboardImage(data, hasPng, status.Diagnostics);
                if (result != null)
                {
                    return result;
                }
            }

            // 4) CF_DIB
            if (hasDib)
            {
                ClipboardImageResult result = TryReadDib(data, status.Diagnostics);
                if (result != null)
                {
                    return result;
                }
            }

            // 5) 最后的系统级兜底
            try
            {
                using (Image image = Clipboard.GetImage())
                {
                    if (image != null)
                    {
                        return RasterConverter.FromImage(image, "Bitmap", status.Diagnostics);
                    }
                }
            }
            catch (Exception ex)
            {
                status.Diagnostics.Add("Clipboard.GetImage 兜底失败：" + ClipboardService.DescribeFailure(ex));
            }

            ClipboardImageResult fail = ClipboardImageResult.Fail(
                "剪贴板中没有可识别的图像。若正在从 MATLAB 复制，请先在图形窗口执行「编辑 → 复制图形（Copy Figure）」，再回到 FigurePlay 粘贴。");
            fail.Diagnostics.AddRange(status.Diagnostics);
            return fail;
        }

        private static ClipboardImageResult TryReadEnhancedMetafile(
            IDataObject data,
            List<string> diagnostics)
        {
            // 2.1 WinForms 托管读取
            try
            {
                object raw = data.GetData(DataFormats.EnhancedMetafile, true);
                ClipboardImageResult result = RenderMetafileObject(raw, "EMF", diagnostics);
                if (result != null)
                {
                    return result;
                }
            }
            catch (Exception ex)
            {
                diagnostics.Add("WinForms 读取 EMF 失败：" + ClipboardService.DescribeFailure(ex));
            }

            // 2.2 原生 CF_ENHMETAFILE 读取（不依赖 WinForms 转换）
            try
            {
                string error;
                byte[] bytes = NativeClipboard.GetEnhancedMetafileBits(out error);
                if (bytes != null && bytes.Length > 0)
                {
                    if (!EmfValidator.LooksLikeEmf(bytes))
                    {
                        diagnostics.Add("原生 EMF 数据不是有效 EMF（文件头 " + EmfValidator.DescribeHeader(bytes) + "）。");
                    }
                    else
                    {
                        using (MemoryStream ms = new MemoryStream(bytes, false))
                        using (Metafile metafile = new Metafile(ms))
                        {
                            return MetafileConverter.Render(metafile, "EMF", diagnostics, bytes);
                        }
                    }
                }

                diagnostics.Add("原生 EMF 读取失败：" + (error ?? "未知原因"));
            }
            catch (Exception ex)
            {
                diagnostics.Add("原生 EMF 读取异常：" + ClipboardService.DescribeFailure(ex));
            }

            return null;
        }

        private static ClipboardImageResult TryReadMetafilePict(
            IDataObject data,
            List<string> diagnostics)
        {
            string[] candidateFormats = { DataFormats.MetafilePict, "MetaFile" };
            foreach (string format in candidateFormats)
            {
                try
                {
                    if (!data.GetDataPresent(format, true))
                    {
                        continue;
                    }

                    object raw = data.GetData(format, true);
                    ClipboardImageResult result = RenderMetafileObject(raw, "Metafile", diagnostics);
                    if (result != null)
                    {
                        return result;
                    }
                }
                catch (Exception ex)
                {
                    diagnostics.Add("读取 " + format + " 失败：" + ClipboardService.DescribeFailure(ex));
                }
            }

            // 原生 CF_METAFILEPICT：WMF → EMF → 渲染
            try
            {
                string error;
                byte[] emfBytes = NativeClipboard.GetMetafilePictAsEmfBytes(out error);
                if (emfBytes != null && emfBytes.Length > 0)
                {
                    if (!EmfValidator.LooksLikeEmf(emfBytes))
                    {
                        diagnostics.Add("MetafilePict 转换出的数据不是有效 EMF（header=" +
                                        EmfValidator.DescribeHeader(emfBytes) + "）。");
                    }
                    else
                    {
                        using (MemoryStream ms = new MemoryStream(emfBytes, false))
                        using (Metafile metafile = new Metafile(ms))
                        {
                            return MetafileConverter.Render(metafile, "Metafile", diagnostics, emfBytes);
                        }
                    }
                }

                diagnostics.Add("原生 MetafilePict 读取失败：" + (error ?? "未知原因"));
            }
            catch (Exception ex)
            {
                diagnostics.Add("原生 MetafilePict 读取异常：" + ClipboardService.DescribeFailure(ex));
            }

            return null;
        }

        private static ClipboardImageResult TryReadClipboardImage(
            IDataObject data,
            bool hasPng,
            List<string> diagnostics)
        {
            if (hasPng)
            {
                try
                {
                    object raw = data.GetData("PNG", true);
                    byte[] bytes = ToBytes(raw);
                    if (bytes != null && bytes.Length > 8)
                    {
                        using (MemoryStream ms = new MemoryStream(bytes, false))
                        using (Bitmap bitmap = new Bitmap(ms))
                        {
                            return RasterConverter.FromImage(bitmap, "Bitmap", diagnostics);
                        }
                    }
                }
                catch (Exception ex)
                {
                    diagnostics.Add("读取 PNG 剪贴板数据失败：" + ClipboardService.DescribeFailure(ex));
                }
            }

            try
            {
                object raw = data.GetData(DataFormats.Bitmap, true);
                Image image = raw as Image;
                if (image != null)
                {
                    return RasterConverter.FromImage(image, "Bitmap", diagnostics);
                }

                byte[] bytes = ToBytes(raw);
                if (bytes != null && bytes.Length > 8)
                {
                    using (MemoryStream ms = new MemoryStream(bytes, false))
                    using (Bitmap bitmap = new Bitmap(ms))
                    {
                        return RasterConverter.FromImage(bitmap, "Bitmap", diagnostics);
                    }
                }
            }
            catch (Exception ex)
            {
                diagnostics.Add("读取 Bitmap 剪贴板数据失败：" + ClipboardService.DescribeFailure(ex));
            }

            try
            {
                using (Image image = Clipboard.GetImage())
                {
                    if (image != null)
                    {
                        return RasterConverter.FromImage(image, "Bitmap", diagnostics);
                    }
                }
            }
            catch (Exception ex)
            {
                diagnostics.Add("Clipboard.GetImage 读取失败：" + ClipboardService.DescribeFailure(ex));
            }

            return null;
        }

        private static ClipboardImageResult TryReadDib(IDataObject data, List<string> diagnostics)
        {
            string[] candidateFormats = { DataFormats.Dib, "DeviceIndependentBitmap" };
            foreach (string format in candidateFormats)
            {
                try
                {
                    object raw = null;
                    try
                    {
                        raw = data.GetData(format, false);
                    }
                    catch
                    {
                        // 某些实现不支持非自动转换读取，继续按自动转换重试
                    }

                    byte[] bytes = ToBytes(raw);
                    if (bytes == null || bytes.Length < 40)
                    {
                        try
                        {
                            raw = data.GetData(format, true);
                        }
                        catch
                        {
                            // ignore
                        }

                        bytes = ToBytes(raw);
                    }

                    if (bytes != null && bytes.Length >= 40)
                    {
                        return DibDecoder.Decode(bytes, diagnostics);
                    }
                }
                catch (Exception ex)
                {
                    diagnostics.Add("DIB 解码失败：" + ClipboardService.DescribeFailure(ex));
                }
            }

            return null;
        }

        private static ClipboardImageResult RenderMetafileObject(
            object raw,
            string sourceFormat,
            List<string> diagnostics)
        {
            if (raw == null)
            {
                diagnostics.Add(sourceFormat + "：DataObject 未返回数据。");
                return null;
            }

            try
            {
                Metafile metafile = raw as Metafile;
                if (metafile != null)
                {
                    // 先完成 PNG 渲染，再提取 EMF 字节（提取会使 Metafile 对象失效）
                    ClipboardImageResult rendered = MetafileConverter.Render(metafile, sourceFormat, diagnostics);
                    byte[] emfBytes;
                    if (EmfValidator.TryGetEmfBytesFromMetafile(metafile, out emfBytes))
                    {
                        rendered.EmfBytes = emfBytes;
                    }

                    return rendered;
                }

                Stream stream = raw as Stream;
                if (stream != null)
                {
                    using (MemoryStream memory = new MemoryStream())
                    {
                        stream.CopyTo(memory);
                        byte[] rawBytes = memory.ToArray();
                        bool rawIsEmf = EmfValidator.LooksLikeEmf(rawBytes);
                        memory.Position = 0;
                        using (Metafile fromStream = new Metafile(memory))
                        {
                            ClipboardImageResult rendered = MetafileConverter.Render(
                                fromStream,
                                sourceFormat,
                                diagnostics,
                                rawIsEmf ? rawBytes : null);
                            if (!rawIsEmf)
                            {
                                byte[] emfBytes;
                                if (EmfValidator.TryGetEmfBytesFromMetafile(fromStream, out emfBytes))
                                {
                                    rendered.EmfBytes = emfBytes;
                                }
                            }

                            return rendered;
                        }
                    }
                }

                byte[] bytes = raw as byte[];
                if (bytes != null)
                {
                    bool rawIsEmf = EmfValidator.LooksLikeEmf(bytes);
                    using (MemoryStream memory = new MemoryStream(bytes, false))
                    using (Metafile fromBytes = new Metafile(memory))
                    {
                        ClipboardImageResult rendered = MetafileConverter.Render(
                            fromBytes,
                            sourceFormat,
                            diagnostics,
                            rawIsEmf ? bytes : null);
                        if (!rawIsEmf)
                        {
                            byte[] emfBytes;
                            if (EmfValidator.TryGetEmfBytesFromMetafile(fromBytes, out emfBytes))
                            {
                                rendered.EmfBytes = emfBytes;
                            }
                        }

                        return rendered;
                    }
                }

                diagnostics.Add(sourceFormat + "：不支持的返回类型 " + raw.GetType().FullName);
            }
            catch (Exception ex)
            {
                diagnostics.Add(sourceFormat + " 渲染失败：" + ClipboardService.DescribeFailure(ex));
            }

            return null;
        }

        private static IDataObject GetClipboardDataObject()
        {
            Exception last = null;
            for (int attempt = 0; attempt < ClipboardRetryAttempts; attempt++)
            {
                try
                {
                    return Clipboard.GetDataObject();
                }
                catch (COMException ex)
                {
                    last = ex;
                }
                catch (ExternalException ex)
                {
                    last = ex;
                }
                catch (ThreadStateException)
                {
                    throw;
                }

                Thread.Sleep(attempt < 5 ? 40 : 120);
            }

            throw new ClipboardBusyException("剪贴板被其他程序占用，请稍后重试。", last);
        }

        private static string[] SafeGetFormats(IDataObject data)
        {
            try
            {
                string[] formats = data.GetFormats(false);
                if (formats != null && formats.Length > 0)
                {
                    return formats;
                }
            }
            catch
            {
                // ignore
            }

            try
            {
                string[] formats = data.GetFormats(true);
                if (formats != null)
                {
                    return formats;
                }
            }
            catch
            {
                // ignore
            }

            return new string[0];
        }

        private static bool HasFormat(IDataObject data, string[] formats, params string[] names)
        {
            foreach (string name in names)
            {
                string normalizedName = Normalize(name);
                foreach (string format in formats)
                {
                    if (string.Equals(Normalize(format), normalizedName, StringComparison.Ordinal))
                    {
                        return true;
                    }
                }
            }

            foreach (string name in names)
            {
                try
                {
                    if (data.GetDataPresent(name, true))
                    {
                        return true;
                    }
                }
                catch
                {
                    // ignore
                }
            }

            return false;
        }

        private static string Normalize(string value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return string.Empty;
            }

            return value.Replace(" ", string.Empty).ToLowerInvariant();
        }

        private static byte[] ToBytes(object raw)
        {
            if (raw == null)
            {
                return null;
            }

            byte[] bytes = raw as byte[];
            if (bytes != null)
            {
                return bytes;
            }

            MemoryStream memory = raw as MemoryStream;
            if (memory != null)
            {
                return memory.ToArray();
            }

            Stream stream = raw as Stream;
            if (stream != null)
            {
                using (MemoryStream copy = new MemoryStream())
                {
                    stream.CopyTo(copy);
                    return copy.ToArray();
                }
            }

            return null;
        }
    }
}
