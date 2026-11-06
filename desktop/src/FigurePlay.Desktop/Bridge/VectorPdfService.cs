using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// 在专用 STA 线程执行 PowerPoint COM 矢量 PDF 导出（串行化），120 秒超时兜底。
    /// </summary>
    internal sealed class VectorPdfService : IDisposable
    {
        public const int TimeoutMs = 120000;

        private readonly SemaphoreSlim _gate = new SemaphoreSlim(1, 1);
        private bool _disposed;

        public async Task<VectorPdfResult> ExportAsync(Newtonsoft.Json.Linq.JObject specJson)
        {
            if (_disposed)
            {
                return VectorPdfResult.Fail("矢量 PDF 导出服务已关闭。");
            }

            VectorPdfSpec spec;
            string parseError;
            if (!VectorPdfSpec.TryParse(specJson, out spec, out parseError))
            {
                return VectorPdfResult.Fail(parseError);
            }

            await _gate.WaitAsync().ConfigureAwait(false);
            try
            {
                TaskCompletionSource<VectorPdfResult> completion =
                    new TaskCompletionSource<VectorPdfResult>(TaskCreationOptions.RunContinuationsAsynchronously);
                int[] existingPids = PowerPointVectorExporter.SnapshotPowerPointPids();

                Thread thread = new Thread(() =>
                {
                    try
                    {
                        completion.SetResult(PowerPointVectorExporter.Export(spec));
                    }
                    catch (Exception ex)
                    {
                        completion.SetResult(VectorPdfResult.Fail(
                            "PowerPoint 矢量 PDF 导出异常：" + PowerPointVectorExporter.DescribeException(ex)));
                    }
                });

                thread.SetApartmentState(ApartmentState.STA);
                thread.IsBackground = true;
                thread.Name = "FigurePlay-VectorPdf";
                thread.Start();

                Task completed = await Task.WhenAny(
                    completion.Task,
                    Task.Delay(TimeoutMs)).ConfigureAwait(false);

                if (completed != completion.Task)
                {
                    // 超时：结束本次新启动的 PowerPoint 进程，避免残留
                    PowerPointVectorExporter.KillNewPowerPointProcesses(existingPids);
                    return VectorPdfResult.Fail(
                        "矢量 PDF 导出超时（超过 120 秒）。" +
                        "首次启动 PowerPoint 可能较慢，请稍后重试；若反复超时，请确认 PowerPoint 可正常启动。");
                }

                VectorPdfResult result = await completion.Task.ConfigureAwait(false);
                return result;
            }
            finally
            {
                _gate.Release();
            }
        }

        public void Dispose()
        {
            _disposed = true;
            _gate.Dispose();
        }
    }
}
