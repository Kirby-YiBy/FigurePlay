using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// Win32 剪贴板兜底读取：原生 CF_ENHMETAFILE 与 CF_METAFILEPICT。
    /// WinForms 的 DataObject 对个别格式（尤其 METAFILEPICT）支持不完整，这里直接走 Win32 API。
    /// </summary>
    internal static class NativeClipboard
    {
        private const uint CF_METAFILEPICT = 3;
        private const uint CF_ENHMETAFILE = 14;

        [StructLayout(LayoutKind.Sequential)]
        private struct METAFILEPICT
        {
            public int mm;
            public int xExt;
            public int yExt;
            public IntPtr hMF;
        }

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool OpenClipboard(IntPtr hWndNewOwner);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool CloseClipboard();

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool EmptyClipboard();

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr GetClipboardData(uint uFormat);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr SetClipboardData(uint uFormat, IntPtr hMem);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GlobalLock(IntPtr hMem);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool GlobalUnlock(IntPtr hMem);

        [DllImport("gdi32.dll", SetLastError = true)]
        private static extern int GetMetaFileBitsEx(IntPtr hmf, int nSize, [Out] byte[] lpData);

        [DllImport("gdi32.dll", SetLastError = true)]
        private static extern IntPtr SetWinMetaFileBits(
            int nSize,
            [In] byte[] lpMeta16Data,
            IntPtr hdcRef,
            IntPtr lpmfp);

        [DllImport("gdi32.dll", SetLastError = true)]
        private static extern int GetEnhMetaFileBits(IntPtr hemf, int nSize, [Out] byte[] lpData);

        [DllImport("gdi32.dll", SetLastError = true)]
        private static extern bool DeleteEnhMetaFile(IntPtr hemf);

        [DllImport("gdi32.dll", SetLastError = true)]
        private static extern IntPtr SetEnhMetaFileBits(int nSize, [In] byte[] lpData);

        /// <summary>打开剪贴板（带重试）。调用方负责 CloseClipboard。</summary>
        internal static bool OpenClipboardWithRetry(int attempts = 20)
        {
            for (int i = 0; i < attempts; i++)
            {
                try
                {
                    if (OpenClipboard(IntPtr.Zero))
                    {
                        return true;
                    }
                }
                catch
                {
                    // ignore
                }

                Thread.Sleep(i < 5 ? 30 : 80);
            }

            return false;
        }

        /// <summary>读取原生 CF_ENHMETAFILE 的 EMF 字节。失败返回 null 并通过 error 说明。</summary>
        public static byte[] GetEnhancedMetafileBits(out string error)
        {
            error = null;
            if (!OpenClipboardWithRetry())
            {
                error = "剪贴板被其它程序占用，无法读取 EMF。";
                return null;
            }

            try
            {
                IntPtr handle = GetClipboardData(CF_ENHMETAFILE);
                if (handle == IntPtr.Zero)
                {
                    error = "剪贴板中没有原生 EMF（CF_ENHMETAFILE）。";
                    return null;
                }

                byte[] buffer = GetEnhancedMetafileBitsFromHandle(handle);
                if (buffer == null || buffer.Length == 0)
                {
                    error = "读取 EMF 数据失败（GetEnhMetaFileBits 返回空）。";
                    return null;
                }

                return buffer;
            }
            catch (Exception ex)
            {
                error = "读取原生 EMF 失败：" + ex.Message;
                return null;
            }
            finally
            {
                CloseClipboard();
            }
        }

        /// <summary>从 HENHMETAFILE 句柄提取 EMF 原始字节（不打开剪贴板）。调用方负责句柄生命周期。</summary>
        public static byte[] GetEnhancedMetafileBitsFromHandle(IntPtr handle)
        {
            if (handle == IntPtr.Zero)
            {
                return null;
            }

            int size = GetEnhMetaFileBits(handle, 0, null);
            if (size <= 0)
            {
                return null;
            }

            byte[] buffer = new byte[size];
            int written = GetEnhMetaFileBits(handle, size, buffer);
            if (written <= 0)
            {
                return null;
            }

            if (written != size)
            {
                Array.Resize(ref buffer, written);
            }

            return buffer;
        }

        /// <summary>读取 CF_METAFILEPICT，先取 WMF 字节再转成 EMF 字节。失败返回 null。</summary>
        public static byte[] GetMetafilePictAsEmfBytes(out string error)
        {
            error = null;
            if (!OpenClipboardWithRetry())
            {
                error = "剪贴板被其它程序占用，无法读取 MetafilePict。";
                return null;
            }

            try
            {
                IntPtr clipboardData = GetClipboardData(CF_METAFILEPICT);
                if (clipboardData == IntPtr.Zero)
                {
                    error = "剪贴板中没有 MetafilePict 数据。";
                    return null;
                }

                IntPtr pointer = GlobalLock(clipboardData);
                if (pointer == IntPtr.Zero)
                {
                    error = "锁定 MetafilePict 数据失败。";
                    return null;
                }

                try
                {
                    METAFILEPICT pict = (METAFILEPICT)Marshal.PtrToStructure(pointer, typeof(METAFILEPICT));
                    if (pict.hMF == IntPtr.Zero)
                    {
                        error = "MetafilePict 不包含有效的 WMF 句柄。";
                        return null;
                    }

                    int wmfSize = GetMetaFileBitsEx(pict.hMF, 0, null);
                    if (wmfSize <= 0)
                    {
                        error = "读取 WMF 数据失败。";
                        return null;
                    }

                    byte[] wmf = new byte[wmfSize];
                    int wmfWritten = GetMetaFileBitsEx(pict.hMF, wmfSize, wmf);
                    if (wmfWritten <= 0)
                    {
                        error = "读取 WMF 数据失败。";
                        return null;
                    }

                    if (wmfWritten != wmfSize)
                    {
                        Array.Resize(ref wmf, wmfWritten);
                    }

                    IntPtr enhanced = SetWinMetaFileBits(wmf.Length, wmf, IntPtr.Zero, IntPtr.Zero);
                    if (enhanced == IntPtr.Zero)
                    {
                        error = "WMF 转 EMF 失败（SetWinMetaFileBits）。";
                        return null;
                    }

                    try
                    {
                        int emfSize = GetEnhMetaFileBits(enhanced, 0, null);
                        if (emfSize <= 0)
                        {
                            error = "读取转换后的 EMF 数据失败。";
                            return null;
                        }

                        byte[] emf = new byte[emfSize];
                        int emfWritten = GetEnhMetaFileBits(enhanced, emfSize, emf);
                        if (emfWritten <= 0)
                        {
                            error = "读取转换后的 EMF 数据失败。";
                            return null;
                        }

                        if (emfWritten != emfSize)
                        {
                            Array.Resize(ref emf, emfWritten);
                        }

                        return emf;
                    }
                    finally
                    {
                        DeleteEnhMetaFile(enhanced);
                    }
                }
                finally
                {
                    GlobalUnlock(clipboardData);
                }
            }
            catch (Exception ex)
            {
                error = "读取 MetafilePict 失败：" + ex.Message;
                return null;
            }
            finally
            {
                CloseClipboard();
            }
        }

        /// <summary>
        /// 以真实 EMF 原始字节写入剪贴板（CF_ENHMETAFILE）。
        /// 注意：GDI+ Metafile.GetHenhmetafile + DeleteEnhMetaFile 会使 Metafile 对象失效，
        /// 因此测试/导出场景优先用本方法从字节重建句柄，避免破坏原 Metafile。
        /// </summary>
        public static bool TrySetClipboardEnhancedMetafileBytes(byte[] emfBytes, out string error)
        {
            error = null;
            if (!EmfValidator.LooksLikeEmf(emfBytes))
            {
                error = "EMF 数据无效（文件头 " + EmfValidator.DescribeHeader(emfBytes) + "，应为 01 00 00 00）。";
                return false;
            }

            IntPtr handle = SetEnhMetaFileBits(emfBytes.Length, emfBytes);
            if (handle == IntPtr.Zero)
            {
                error = "创建 EMF 句柄失败（SetEnhMetaFileBits，错误码 " +
                        Marshal.GetLastWin32Error() + "）。";
                return false;
            }

            return TrySetClipboardEnhancedMetafile(handle, out error);
        }

        /// <summary>
        /// 以原生 CF_ENHMETAFILE 写入剪贴板（供 --selftest 生成与 MATLAB 一致的剪贴板内容）。
        /// 成功时句柄所有权转移给剪贴板；失败时本方法负责释放句柄。
        /// </summary>
        public static bool TrySetClipboardEnhancedMetafile(IntPtr hEmf, out string error)
        {
            error = null;
            bool transferred = false;

            if (hEmf == IntPtr.Zero)
            {
                error = "EMF 句柄为空。";
                return false;
            }

            if (!OpenClipboardWithRetry())
            {
                error = "剪贴板被其它程序占用，无法写入测试 EMF。";
                DeleteEnhMetaFile(hEmf);
                return false;
            }

            try
            {
                if (!EmptyClipboard())
                {
                    error = "清空剪贴板失败（" + Marshal.GetLastWin32Error() + "）。";
                    return false;
                }

                if (SetClipboardData(CF_ENHMETAFILE, hEmf) == IntPtr.Zero)
                {
                    error = "写入 EMF 到剪贴板失败（" + Marshal.GetLastWin32Error() + "）。";
                    return false;
                }

                transferred = true;
                return true;
            }
            finally
            {
                CloseClipboard();
                if (!transferred)
                {
                    DeleteEnhMetaFile(hEmf);
                }
            }
        }

        /// <summary>释放一个 HENHMETAFILE 句柄（仅用于未被剪贴板接管时）。</summary>
        public static void DeleteHandle(IntPtr hEmf)
        {
            if (hEmf != IntPtr.Zero)
            {
                DeleteEnhMetaFile(hEmf);
            }
        }
    }
}
