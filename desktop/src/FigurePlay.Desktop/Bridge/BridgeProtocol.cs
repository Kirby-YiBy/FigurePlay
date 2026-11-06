using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// JS ↔ Host 桥协议常量与消息构造。
    /// 协议（与网页端约定，必须保持一致）：
    ///   JS→Host : {"type":"read-clipboard-image","requestId":"&lt;id&gt;"}
    ///   Host→JS : {"type":"clipboard-image","requestId":"&lt;id&gt;","ok":true,"dataUrl":"data:image/png;base64,...","width":W,"height":H,"sourceFormat":"EMF|Metafile|Bitmap|DIB"}
    ///             失败时 {"type":"clipboard-image","requestId":"&lt;id&gt;","ok":false,"error":"中文原因"}
    ///   启动后 Host 可发 {"type":"host-ready","version":"1.3.0"}
    /// </summary>
    internal static class BridgeProtocol
    {
        public const string HostVersion = "1.3.0";

        public const string TypeReadClipboardImage = "read-clipboard-image";
        public const string TypeClipboardImage = "clipboard-image";
        public const string TypeHostReady = "host-ready";
        public const string TypeImportFig = "import-fig";
        public const string TypeFigImported = "fig-imported";
        public const string TypeExportVectorPdf = "export-vector-pdf";
        public const string TypeVectorPdfExport = "vector-pdf-export";

        /// <summary>
        /// 解析 WebView2 的 WebMessageAsJson。JS 端既可能发送字符串化的 JSON
        /// （e.WebMessageAsJson 形如 "\"{...}\""），也可能直接发送对象，两种都兼容。
        /// </summary>
        public static JObject ParseHostMessage(string webMessageAsJson)
        {
            if (string.IsNullOrWhiteSpace(webMessageAsJson))
            {
                return null;
            }

            JToken token;
            try
            {
                token = JToken.Parse(webMessageAsJson);
            }
            catch (JsonException)
            {
                return null;
            }

            if (token.Type == JTokenType.String)
            {
                try
                {
                    token = JToken.Parse((string)token);
                }
                catch (JsonException)
                {
                    return null;
                }
            }

            return token as JObject;
        }

        public static string BuildHostReady()
        {
            JObject payload = new JObject
            {
                ["type"] = TypeHostReady,
                ["version"] = HostVersion,
            };
            return payload.ToString(Formatting.None);
        }

        public static string BuildClipboardImageSuccess(
            string requestId,
            string dataUrl,
            int width,
            int height,
            string sourceFormat,
            string emfBase64 = null)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeClipboardImage,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = true,
                ["dataUrl"] = dataUrl ?? string.Empty,
                ["width"] = width,
                ["height"] = height,
                ["sourceFormat"] = string.IsNullOrEmpty(sourceFormat) ? "Bitmap" : sourceFormat,
            };
            if (!string.IsNullOrEmpty(emfBase64))
            {
                payload["emfBase64"] = emfBase64;
            }

            return payload.ToString(Formatting.None);
        }

        public static string BuildClipboardImageError(string requestId, string error)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeClipboardImage,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = false,
                ["error"] = string.IsNullOrEmpty(error) ? "读取剪贴板图像失败。" : error,
            };
            return payload.ToString(Formatting.None);
        }

        /// <summary>MATLAB .fig 导入成功（协议由网页端约定）。</summary>
        public static string BuildFigImportedSuccess(
            string requestId,
            string dataUrl,
            int width,
            int height,
            string sourceFormat,
            long convertMs,
            string matlabVersion,
            string emfBase64 = null)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeFigImported,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = true,
                ["dataUrl"] = dataUrl ?? string.Empty,
                ["width"] = width,
                ["height"] = height,
                ["sourceFormat"] = string.IsNullOrEmpty(sourceFormat) ? "MATLAB-FIG" : sourceFormat,
                ["convertMs"] = convertMs,
                ["matlabVersion"] = matlabVersion ?? string.Empty,
            };
            if (!string.IsNullOrEmpty(emfBase64))
            {
                payload["emfBase64"] = emfBase64;
            }

            return payload.ToString(Formatting.None);
        }

        /// <summary>MATLAB .fig 导入失败。</summary>
        public static string BuildFigImportedError(string requestId, string error)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeFigImported,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = false,
                ["error"] = string.IsNullOrEmpty(error) ? "MATLAB .fig 导入失败。" : error,
            };
            return payload.ToString(Formatting.None);
        }

        /// <summary>PowerPoint 矢量 PDF 导出成功。</summary>
        public static string BuildVectorPdfSuccess(
            string requestId,
            string base64,
            int bytes,
            string engine,
            int vectorPanels,
            int rasterPanels)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeVectorPdfExport,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = true,
                ["base64"] = base64 ?? string.Empty,
                ["bytes"] = bytes,
                ["engine"] = string.IsNullOrEmpty(engine) ? "PowerPoint" : engine,
                ["vectorPanels"] = vectorPanels,
                ["rasterPanels"] = rasterPanels,
            };
            return payload.ToString(Formatting.None);
        }

        /// <summary>PowerPoint 矢量 PDF 导出失败（error 可能是 UNSUPPORTED_TRANSFORM）。</summary>
        public static string BuildVectorPdfError(string requestId, string error)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeVectorPdfExport,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = false,
                ["error"] = string.IsNullOrEmpty(error) ? "矢量 PDF 导出失败。" : error,
            };
            return payload.ToString(Formatting.None);
        }
    }
}
