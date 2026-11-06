using System;
using System.Drawing.Imaging;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// 真实 EMF（Enhanced Metafile）字节校验。
    /// 注意：GDI+ 的 Metafile.Save(path) 在本机实测会写成 PNG（文件头 89 50 4E 47），
    /// 因此保存/传递 EMF 必须使用 GetHenhmetafile + GetEnhMetaFileBits 的原始记录字节。
    /// </summary>
    internal static class EmfValidator
    {
        /// <summary>EMR_HEADER 最小长度。</summary>
        public const int MinEmfSize = 88;

        /// <summary>EMF 文件头是否为合法 EMF（iType=1，nSize 合理，且不是 PNG/WMF 伪装）。</summary>
        public static bool LooksLikeEmf(byte[] bytes)
        {
            if (bytes == null || bytes.Length < MinEmfSize)
            {
                return false;
            }

            // PNG 伪装（用户反馈过的问题）：89 50 4E 47
            if (bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)
            {
                return false;
            }

            // WMF placeable header：D7 CD C6 9A；旧式 WMF：01 00 09 00
            if (bytes[0] == 0xD7 && bytes[1] == 0xCD && bytes[2] == 0xC6 && bytes[3] == 0x9A)
            {
                return false;
            }

            if (bytes[0] == 0x01 && bytes[1] == 0x00 && bytes[2] == 0x09 && bytes[3] == 0x00)
            {
                return false;
            }

            int recordType = ReadInt32(bytes, 0);
            if (recordType != 1)
            {
                return false;
            }

            int recordSize = ReadInt32(bytes, 4);
            if (recordSize < MinEmfSize || recordSize > bytes.Length)
            {
                return false;
            }

            return true;
        }

        public static string DescribeHeader(byte[] bytes)
        {
            if (bytes == null || bytes.Length == 0)
            {
                return "(empty)";
            }

            int count = Math.Min(8, bytes.Length);
            string[] parts = new string[count];
            for (int i = 0; i < count; i++)
            {
                parts[i] = bytes[i].ToString("X2");
            }

            return string.Join(" ", parts);
        }

        /// <summary>
        /// 从 System.Drawing.Metafile 提取真实 EMF 记录字节（内部复制句柄，提取后释放）。
        /// 警告：DeleteEnhMetaFile 传入的句柄后，该 Metafile 对象会失效（再渲染/GetHenhmetafile/Clone 会抛“参数无效”），
        /// 因此只能在“已经完成渲染、不再使用该 Metafile”之后调用。
        /// </summary>
        public static bool TryGetEmfBytesFromMetafile(Metafile metafile, out byte[] emfBytes)
        {
            emfBytes = null;
            if (metafile == null)
            {
                return false;
            }

            IntPtr handle = IntPtr.Zero;
            try
            {
                handle = metafile.GetHenhmetafile();
                if (handle == IntPtr.Zero)
                {
                    return false;
                }

                emfBytes = NativeClipboard.GetEnhancedMetafileBitsFromHandle(handle);
                if (!LooksLikeEmf(emfBytes))
                {
                    emfBytes = null;
                    return false;
                }

                return true;
            }
            catch
            {
                emfBytes = null;
                return false;
            }
            finally
            {
                if (handle != IntPtr.Zero)
                {
                    NativeClipboard.DeleteHandle(handle);
                }
            }
        }

        private static int ReadInt32(byte[] buffer, int offset)
        {
            return buffer[offset]
                | (buffer[offset + 1] << 8)
                | (buffer[offset + 2] << 16)
                | (buffer[offset + 3] << 24);
        }
    }
}
