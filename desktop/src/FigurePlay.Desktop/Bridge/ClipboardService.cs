using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>剪贴板被其它程序占用（可重试）。</summary>
    internal sealed class ClipboardBusyException : Exception
    {
        public ClipboardBusyException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }

    /// <summary>
    /// 在专用 STA 线程上读取并转换剪贴板图像。
    /// 剪贴板 / OLE 访问要求 STA，且不能阻塞 UI 线程，因此每次请求都起一个后台 STA 线程，
    /// 并用 SemaphoreSlim 串行化，避免多个请求同时抢占剪贴板。
    /// </summary>
    internal sealed class ClipboardService : IDisposable
    {
        private readonly SemaphoreSlim _gate = new SemaphoreSlim(1, 1);
        private bool _disposed;

        public async Task<ClipboardImageResult> ConvertAsync()
        {
            if (_disposed)
            {
                return ClipboardImageResult.Fail("剪贴板服务已关闭。");
            }

            await _gate.WaitAsync().ConfigureAwait(false);
            try
            {
                TaskCompletionSource<ClipboardImageResult> tcs =
                    new TaskCompletionSource<ClipboardImageResult>(TaskCreationOptions.RunContinuationsAsynchronously);

                Thread thread = new Thread(() =>
                {
                    try
                    {
                        tcs.SetResult(ClipboardImageReader.ReadAndConvert());
                    }
                    catch (ClipboardBusyException ex)
                    {
                        tcs.SetResult(ClipboardImageResult.Fail(ex.Message));
                    }
                    catch (OutOfMemoryException)
                    {
                        tcs.SetResult(ClipboardImageResult.Fail(
                            "剪贴板图像过大，内存不足，无法完成转换。请尝试复制尺寸更小的图像。"));
                    }
                    catch (Exception ex)
                    {
                        tcs.SetResult(ClipboardImageResult.Fail(DescribeFailure(ex)));
                    }
                });

                thread.SetApartmentState(ApartmentState.STA);
                thread.IsBackground = true;
                thread.Name = "FigurePlay-Clipboard";
                thread.Start();

                return await tcs.Task.ConfigureAwait(false);
            }
            finally
            {
                _gate.Release();
            }
        }

        /// <summary>把底层异常翻译成给用户看的中文原因。</summary>
        internal static string DescribeFailure(Exception ex)
        {
            if (ex == null)
            {
                return "读取剪贴板图像失败：未知错误。";
            }

            if (ex is ClipboardBusyException)
            {
                return ex.Message;
            }

            if (ex is ExternalException || ex is COMException)
            {
                int hr = ex.HResult;
                // CLIPBRD_E_CANT_OPEN / CLIPBRD_E_CANT_SET / 一般 OLE 剪贴板错误
                if (hr == unchecked((int)0x800401D0) || hr == unchecked((int)0x800401D1))
                {
                    return "剪贴板被其他程序占用，请关闭占用剪贴板的程序后重试。";
                }

                if (hr == unchecked((int)0x80040064) || hr == unchecked((int)0x8004006A))
                {
                    return "剪贴板内容无法读取（格式不受支持），请重新复制后再试。";
                }

                return "读取剪贴板图像失败（系统错误 0x" + hr.ToString("X8") + "）：" + ex.Message;
            }

            if (ex is InvalidOperationException)
            {
                return ex.Message;
            }

            return "读取剪贴板图像失败：" + ex.Message;
        }

        public void Dispose()
        {
            _disposed = true;
            _gate.Dispose();
        }
    }
}
