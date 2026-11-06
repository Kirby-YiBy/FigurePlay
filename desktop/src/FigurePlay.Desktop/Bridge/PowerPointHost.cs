using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// 持久化 PowerPoint 会话：专用 STA 线程 + 单个 PowerPoint.Application 复用。
    /// - 首次导出时启动（约 20–40s 冷启动），之后只 Presentations.Add/Close，导出明显更快；
    /// - 只退出自己启动的 POWERPNT，绝不 Quit 用户原有实例；
    /// - COM 断连/RPC 错误自动重建会话；超时由 VectorPdfService 控制并调用 ResetSession。
    /// </summary>
    internal static class PowerPointHost
    {
        private const int DefaultTimeoutMs = 120000;
        private const int InstanceCreateTimeoutMs = 20000;

        private sealed class WorkItem
        {
            public VectorPdfSpec Spec;
            public List<VectorPdfSpec> MultiSpecs;
            public bool IsMulti;
            public bool IsShutdown;
            public bool IsPrewarm;
            public VectorPdfResult Result;
            public readonly ManualResetEventSlim Done = new ManualResetEventSlim(false);
        }

        private static readonly object Sync = new object();
        private static BlockingCollection<WorkItem> _queue;
        private static Thread _thread;
        private static dynamic _app;
        private static bool _ownsInstance;
        private static int[] _preExistingPids = new int[0];
        private static List<int> _ownedPids = new List<int>();
        private static bool _shutdown;
        private static int _instanceCreateMs;
        private static int _sessionIndex;
        private static int _exportIndex;

        public static bool IsAvailable
        {
            get { return PowerPointVectorExporter.IsPowerPointAvailable(); }
        }

        public static int InstanceCreateMs
        {
            get { lock (Sync) { return _instanceCreateMs; } }
        }

        public static bool OwnsInstance
        {
            get { lock (Sync) { return _ownsInstance; } }
        }

        public static int SessionIndex
        {
            get { lock (Sync) { return _sessionIndex; } }
        }

        public static int ExportCount
        {
            get { lock (Sync) { return _exportIndex; } }
        }

        public static int[] OwnedPids
        {
            get { lock (Sync) { return _ownedPids.ToArray(); } }
        }

        public static int[] PreExistingPids
        {
            get { lock (Sync) { return (int[])_preExistingPids.Clone(); } }
        }

        /// <summary>同步执行一次导出（内部排队到专用 STA 线程）；超时返回可读错误。</summary>
        public static VectorPdfResult Export(VectorPdfSpec spec, int timeoutMs)
        {
            if (!IsAvailable)
            {
                return VectorPdfResult.Fail(
                    "未安装 Microsoft PowerPoint，无法导出矢量 PDF。" +
                    "矢量 PDF 导出需要桌面版 PowerPoint 2016 或更高版本；" +
                    "如未安装，请使用位图 PDF 导出（EMF 仍会以图片方式保留清晰度）。");
            }

            WorkItem item = new WorkItem { Spec = spec };
            if (!Enqueue(item))
            {
                return VectorPdfResult.Fail("矢量 PDF 导出服务已关闭。");
            }

            int waitMs = timeoutMs <= 0 ? DefaultTimeoutMs : timeoutMs;
            if (!item.Done.Wait(waitMs))
            {
                AbortAfterTimeout();
                return VectorPdfResult.Fail(
                    "矢量 PDF 导出超时（超过 " + (waitMs / 1000) + " 秒）。" +
                    "PowerPoint 可能无响应，已重置会话；请稍后重试。");
            }

            return item.Result ?? VectorPdfResult.Fail("PowerPoint 会话返回空结果。");
        }

        /// <summary>v1.5.0：多页矢量 PDF（同一 presentation 多幻灯片、一次 SaveAs）。</summary>
        public static VectorPdfResult ExportMulti(IList<VectorPdfSpec> specs, int timeoutMs)
        {
            if (!IsAvailable)
            {
                return VectorPdfResult.Fail(
                    "未安装 Microsoft PowerPoint，无法导出多页矢量 PDF。" +
                    "需要桌面版 PowerPoint 2016 或更高版本。");
            }

            WorkItem item = new WorkItem { MultiSpecs = new List<VectorPdfSpec>(specs), IsMulti = true };
            if (!Enqueue(item))
            {
                return VectorPdfResult.Fail("矢量 PDF 导出服务已关闭。");
            }

            int waitMs = timeoutMs <= 0 ? DefaultTimeoutMs : timeoutMs;
            if (!item.Done.Wait(waitMs))
            {
                AbortAfterTimeout();
                return VectorPdfResult.Fail(
                    "多页矢量 PDF 导出超时（超过 " + (waitMs / 1000) + " 秒）；已重置 PowerPoint 会话。");
            }

            return item.Result ?? VectorPdfResult.Fail("PowerPoint 会话返回空结果。");
        }

        /// <summary>后台预热：只启动 PowerPoint.Application，不创建演示文稿；失败静默。</summary>
        public static void Prewarm()
        {
            if (!IsAvailable)
            {
                return;
            }

            WorkItem item = new WorkItem { IsPrewarm = true };
            if (!Enqueue(item))
            {
                return;
            }

            item.Done.Wait(30000);
        }

        /// <summary>显式关闭自己启动的 PowerPoint 会话（应用退出 / selftest 结束时调用）。</summary>
        public static void Shutdown()
        {
            WorkItem item = null;
            BlockingCollection<WorkItem> queue;
            Thread thread;
            lock (Sync)
            {
                if (_shutdown)
                {
                    return;
                }

                _shutdown = true;
                queue = _queue;
                thread = _thread;
                if (queue != null && thread != null && thread.IsAlive)
                {
                    item = new WorkItem { IsShutdown = true };
                }
            }

            if (item != null)
            {
                try
                {
                    queue.Add(item);
                }
                catch
                {
                    // ignore
                }

                item.Done.Wait(15000);
                try
                {
                    queue.CompleteAdding();
                }
                catch
                {
                    // ignore
                }

                try
                {
                    thread.Join(10000);
                }
                catch
                {
                    // ignore
                }
            }

            CleanupOwnedProcesses();
        }

        public static void ResetSession()
        {
            AbortAfterTimeout();
        }

        private static bool Enqueue(WorkItem item)
        {
            EnsureThread();
            lock (Sync)
            {
                if (_shutdown)
                {
                    return false;
                }

                try
                {
                    _queue.Add(item);
                    return true;
                }
                catch
                {
                    return false;
                }
            }
        }

        private static void EnsureThread()
        {
            lock (Sync)
            {
                if (_thread != null && _thread.IsAlive)
                {
                    return;
                }

                _queue = new BlockingCollection<WorkItem>();
                _thread = new Thread(ThreadMain)
                {
                    IsBackground = true,
                    Name = "FigurePlay-PowerPointHost",
                };
                _thread.SetApartmentState(ApartmentState.STA);
                _thread.Start();
            }
        }

        private static void ThreadMain()
        {
            foreach (WorkItem item in _queue.GetConsumingEnumerable())
            {
                try
                {
                    if (item.IsShutdown)
                    {
                        ShutdownCore();
                        item.Result = new VectorPdfResult { Ok = true };
                    }
                    else if (item.IsMulti)
                    {
                        item.Result = ExportMultiCore(item.MultiSpecs);
                    }
                    else if (item.IsPrewarm)
                    {
                        EnsureApplication();
                        item.Result = new VectorPdfResult { Ok = true };
                    }
                    else
                    {
                        item.Result = ExportCore(item.Spec);
                    }
                }
                catch (Exception ex)
                {
                    item.Result = VectorPdfResult.Fail(
                        "PowerPoint 宿主异常：" + PowerPointVectorExporter.DescribeException(ex));
                }
                finally
                {
                    item.Done.Set();
                }

                if (item.IsShutdown)
                {
                    break;
                }
            }
        }

        private static VectorPdfResult ExportCore(VectorPdfSpec spec)
        {
            try
            {
                EnsureApplication();
                _exportIndex++;
                VectorPdfResult result = PowerPointVectorExporter.ComposeWithApplication(_app, spec);
                if (!result.Ok && PowerPointVectorExporter.LooksLikeComDisconnected(result.Error))
                {
                    RecreateApplication();
                    _exportIndex++;
                    result = PowerPointVectorExporter.ComposeWithApplication(_app, spec);
                }

                if (result.Ok)
                {
                    result.Diagnostics.Add(
                        "host: session#" + _sessionIndex + " export#" + _exportIndex +
                        " instanceCreateMs=" + _instanceCreateMs +
                        " reused=" + (_exportIndex > 1));
                }

                return result;
            }
            catch (Exception ex)
            {
                if (PowerPointVectorExporter.LooksLikeComDisconnected(ex))
                {
                    try
                    {
                        RecreateApplication();
                        _exportIndex++;
                        return PowerPointVectorExporter.ComposeWithApplication(_app, spec);
                    }
                    catch (Exception retryException)
                    {
                        return VectorPdfResult.Fail(
                            "PowerPoint 会话重建后仍失败：" + PowerPointVectorExporter.DescribeException(retryException));
                    }
                }

                return VectorPdfResult.Fail(
                    "PowerPoint 矢量 PDF 导出异常：" + PowerPointVectorExporter.DescribeException(ex));
            }
        }

        private static VectorPdfResult ExportMultiCore(IList<VectorPdfSpec> specs)
        {
            try
            {
                EnsureApplication();
                _exportIndex++;
                VectorPdfResult result = PowerPointVectorExporter.ComposeMultiWithApplication(_app, specs);
                if (!result.Ok && PowerPointVectorExporter.LooksLikeComDisconnected(result.Error))
                {
                    RecreateApplication();
                    _exportIndex++;
                    result = PowerPointVectorExporter.ComposeMultiWithApplication(_app, specs);
                }

                if (result.Ok)
                {
                    result.Diagnostics.Add(
                        "host: session#" + _sessionIndex + " multi-export#" + _exportIndex +
                        " instanceCreateMs=" + _instanceCreateMs +
                        " pages=" + result.Pages);
                }

                return result;
            }
            catch (Exception ex)
            {
                if (PowerPointVectorExporter.LooksLikeComDisconnected(ex))
                {
                    try
                    {
                        RecreateApplication();
                        _exportIndex++;
                        return PowerPointVectorExporter.ComposeMultiWithApplication(_app, specs);
                    }
                    catch (Exception retryException)
                    {
                        return VectorPdfResult.Fail(
                            "PowerPoint 会话重建后仍失败：" + PowerPointVectorExporter.DescribeException(retryException));
                    }
                }

                return VectorPdfResult.Fail(
                    "多页矢量 PDF 导出异常：" + PowerPointVectorExporter.DescribeException(ex));
            }
        }

        private static void EnsureApplication()
        {
            if (_app != null)
            {
                return;
            }

            Type powerpointType = Type.GetTypeFromProgID("PowerPoint.Application");
            if (powerpointType == null)
            {
                throw new InvalidOperationException("未安装 Microsoft PowerPoint（COM 不可用）。");
            }

            int[] before = PowerPointVectorExporter.SnapshotPowerPointPids();
            Stopwatch watch = Stopwatch.StartNew();
            object instance = Activator.CreateInstance(powerpointType);
            if (instance == null)
            {
                throw new InvalidOperationException("PowerPoint COM CreateInstance 返回空。");
            }

            dynamic app = instance;
            try
            {
                app.Visible = 0;
            }
            catch
            {
                // PowerPoint 2021 不允许隐藏，无窗口演示文稿仍可工作
            }

            // 注意：Activator.CreateInstance 本身可能耗时 20–40s（PowerPoint 冷启动），
            // 因此进程探测必须在实例创建完成之后单独计时，否则会因预算耗尽而漏记自己启动的 PID。
            List<int> owned = new List<int>();
            Stopwatch detectWatch = Stopwatch.StartNew();
            while (detectWatch.ElapsedMilliseconds < InstanceCreateTimeoutMs)
            {
                int[] now = PowerPointVectorExporter.SnapshotPowerPointPids();
                foreach (int pid in now)
                {
                    if (Array.IndexOf(before, pid) < 0 && !owned.Contains(pid))
                    {
                        owned.Add(pid);
                    }
                }

                if (owned.Count > 0)
                {
                    break;
                }

                Thread.Sleep(100);
            }

            _preExistingPids = before;
            _ownedPids = owned;
            _ownsInstance = owned.Count > 0;
            _app = app;
            _instanceCreateMs = (int)watch.ElapsedMilliseconds;
            _sessionIndex++;
            PowerPointVectorExporter.Trace(
                "host: application created session#" + _sessionIndex +
                " instanceCreateMs=" + _instanceCreateMs +
                " ownedPids=" + string.Join(",", owned.ToArray()));
        }

        private static void RecreateApplication()
        {
            dynamic app = _app;
            _app = null;
            if (app != null)
            {
                try
                {
                    Marshal.FinalReleaseComObject(app);
                }
                catch
                {
                    // ignore
                }
            }

            KillOwnedProcesses();
            _ownedPids = new List<int>();
            _ownsInstance = false;
            PowerPointVectorExporter.Trace("host: session reset");
        }

        private static void ShutdownCore()
        {
            dynamic app = _app;
            _app = null;
            if (app != null)
            {
                if (_ownsInstance)
                {
                    try
                    {
                        app.Quit();
                    }
                    catch
                    {
                        // ignore
                    }
                }

                try
                {
                    Marshal.FinalReleaseComObject(app);
                }
                catch
                {
                    // ignore
                }
            }

            GC.Collect();
            GC.WaitForPendingFinalizers();
            KillOwnedProcesses();
            _ownedPids = new List<int>();
            _ownsInstance = false;
            PowerPointVectorExporter.Trace("host: shutdown");
        }

        private static void AbortAfterTimeout()
        {
            dynamic app = _app;
            _app = null;
            if (app != null)
            {
                try
                {
                    Marshal.FinalReleaseComObject(app);
                }
                catch
                {
                    // ignore
                }
            }

            KillOwnedProcesses();
            _ownedPids = new List<int>();
            _ownsInstance = false;
            PowerPointVectorExporter.Trace("host: abort after timeout");
        }

        private static void KillOwnedProcesses()
        {
            List<int> pids;
            lock (Sync)
            {
                pids = new List<int>(_ownedPids);
            }

            foreach (int pid in pids)
            {
                try
                {
                    Process process = Process.GetProcessById(pid);
                    process.Kill();
                    process.WaitForExit(5000);
                    process.Dispose();
                }
                catch
                {
                    // already exited
                }
            }
        }

        private static void CleanupOwnedProcesses()
        {
            KillOwnedProcesses();
            lock (Sync)
            {
                _ownedPids = new List<int>();
                _ownsInstance = false;
            }
        }
    }
}
