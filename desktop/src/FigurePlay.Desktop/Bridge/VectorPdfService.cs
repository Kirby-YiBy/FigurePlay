using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// 矢量 PDF 导出服务：把请求串行提交给持久化 PowerPointHost。
    /// v1.3.3 起 PowerPoint 实例在首次导出/预热后保持存活，后续导出只组版，不再每次冷启动。
    /// </summary>
    internal sealed class VectorPdfService : IDisposable
    {
        public const int TimeoutMs = 120000;

        private bool _disposed;

        public async Task<VectorPdfResult> ExportAsync(JObject specJson)
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

            return await Task.Run(() => PowerPointHost.Export(spec, TimeoutMs)).ConfigureAwait(false);
        }

        /// <summary>v1.5.0：多页矢量 PDF（pages 数组，一次性多页 PDF）。</summary>
        public async Task<VectorPdfResult> ExportMultiAsync(JObject requestJson)
        {
            if (_disposed)
            {
                return VectorPdfResult.Fail("矢量 PDF 导出服务已关闭。");
            }

            JArray pages = requestJson == null ? null : requestJson["pages"] as JArray;
            if (pages == null || pages.Count == 0)
            {
                return VectorPdfResult.Fail("多页矢量 PDF 参数无效：缺少 pages 数组。");
            }

            List<VectorPdfSpec> specs = new List<VectorPdfSpec>();
            for (int i = 0; i < pages.Count; i++)
            {
                JObject pageJson = pages[i] as JObject;
                if (pageJson == null)
                {
                    return VectorPdfResult.Fail("多页矢量 PDF 参数无效：第 " + (i + 1) + " 页 spec 不是对象。");
                }

                VectorPdfSpec spec;
                string parseError;
                if (!VectorPdfSpec.TryParse(pageJson, out spec, out parseError))
                {
                    return VectorPdfResult.Fail("第 " + (i + 1) + " 页 spec 无效：" + parseError);
                }

                specs.Add(spec);
            }

            return await Task.Run(() => PowerPointHost.ExportMulti(specs, TimeoutMs)).ConfigureAwait(false);
        }

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }

            _disposed = true;
            PowerPointHost.Shutdown();
        }

        /// <summary>桌面主窗口就绪后的后台预热（不创建演示文稿）。</summary>
        public static void PrewarmSharedSession()
        {
            Task.Run(() => PowerPointHost.Prewarm());
        }

        /// <summary>应用退出 / selftest 结束时显式关闭自己启动的 PowerPoint 实例。</summary>
        public static void ShutdownSharedSession()
        {
            PowerPointHost.Shutdown();
        }
    }
}
