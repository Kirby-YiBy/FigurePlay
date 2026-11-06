using System.Collections.Generic;
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
    ///   启动后 Host 可发 {"type":"host-ready","version":"1.5.1"}
    /// </summary>
    internal static class BridgeProtocol
    {
        public const string HostVersion = "1.5.1";

        public const string TypeReadClipboardImage = "read-clipboard-image";
        public const string TypeClipboardImage = "clipboard-image";
        public const string TypeHostReady = "host-ready";
        public const string TypeImportFig = "import-fig";
        public const string TypeFigImported = "fig-imported";
        public const string TypeExportVectorPdf = "export-vector-pdf";
        public const string TypeVectorPdfExport = "vector-pdf-export";
        public const string TypeLoadConfigProfiles = "load-config-profiles";
        public const string TypeConfigProfiles = "config-profiles";
        public const string TypeSaveConfigProfiles = "save-config-profiles";
        public const string TypeConfigProfilesSaved = "config-profiles-saved";
        public const string TypeExportVectorPdfMulti = "export-vector-pdf-multi";
        public const string TypeVectorPdfExportMulti = "vector-pdf-export-multi";
        public const string TypeListConfigBackups = "list-config-backups";
        public const string TypeConfigBackups = "config-backups";
        public const string TypeReadConfigBackup = "read-config-backup";
        public const string TypeConfigBackup = "config-backup";
        public const string TypeCheckUpdate = "check-update";
        public const string TypeUpdateCheck = "update-info";
        public const string TypeDownloadUpdate = "download-update";
        public const string TypeUpdateDownload = "update-downloaded";
        public const string TypeSaveFile = "save-file";
        public const string TypeFileSaved = "file-saved";

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
            int rasterPanels,
            List<string> diagnostics = null)
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
            if (diagnostics != null && diagnostics.Count > 0)
            {
                payload["diagnostics"] = new JArray(diagnostics);
            }

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

        // ---------------------------------------------------------------- v1.4.2 配置模板持久化

        public static string BuildConfigProfilesSuccess(
            string requestId,
            JArray profiles,
            string path,
            bool exists)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeConfigProfiles,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = true,
                ["profiles"] = profiles == null ? new JArray() : profiles.DeepClone(),
                ["path"] = path ?? string.Empty,
                ["exists"] = exists,
            };
            return payload.ToString(Formatting.None);
        }

        public static string BuildConfigProfilesError(string requestId, string error)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeConfigProfiles,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = false,
                ["error"] = string.IsNullOrEmpty(error) ? "读取本机配置失败。" : error,
            };
            return payload.ToString(Formatting.None);
        }

        public static string BuildConfigProfilesSavedSuccess(
            string requestId,
            string path,
            string backupPath,
            int bytes)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeConfigProfilesSaved,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = true,
                ["path"] = path ?? string.Empty,
                ["backupPath"] = backupPath ?? string.Empty,
                ["bytes"] = bytes,
            };
            return payload.ToString(Formatting.None);
        }

        public static string BuildConfigProfilesSavedError(string requestId, string error)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeConfigProfilesSaved,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = false,
                ["error"] = string.IsNullOrEmpty(error) ? "写入本机配置失败。" : error,
            };
            return payload.ToString(Formatting.None);
        }


        // ---------------------------------------------------------------- v1.5.0 多页矢量 / 配置备份

        public static string BuildVectorPdfMultiSuccess(
            string requestId,
            string base64,
            int bytes,
            int pages,
            string engine,
            int vectorPanels,
            int rasterPanels,
            List<string> diagnostics = null)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeVectorPdfExportMulti,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = true,
                ["base64"] = base64 ?? string.Empty,
                ["bytes"] = bytes,
                ["pages"] = pages,
                ["engine"] = string.IsNullOrEmpty(engine) ? "PowerPoint" : engine,
                ["vectorPanels"] = vectorPanels,
                ["rasterPanels"] = rasterPanels,
            };
            if (diagnostics != null && diagnostics.Count > 0)
            {
                payload["diagnostics"] = new JArray(diagnostics);
            }

            return payload.ToString(Formatting.None);
        }

        public static string BuildVectorPdfMultiError(string requestId, string error)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeVectorPdfExportMulti,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = false,
                ["error"] = string.IsNullOrEmpty(error) ? "多页矢量 PDF 导出失败。" : error,
            };
            return payload.ToString(Formatting.None);
        }

        public static string BuildConfigBackupsSuccess(string requestId, JArray backups, string backupDir)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeConfigBackups,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = true,
                ["backups"] = backups == null ? new JArray() : backups.DeepClone(),
                ["backupDir"] = backupDir ?? string.Empty,
            };
            return payload.ToString(Formatting.None);
        }

        public static string BuildConfigBackupsError(string requestId, string error)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeConfigBackups,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = false,
                ["error"] = string.IsNullOrEmpty(error) ? "读取配置备份列表失败。" : error,
            };
            return payload.ToString(Formatting.None);
        }

        public static string BuildConfigBackupSuccess(
            string requestId,
            string name,
            string path,
            JArray profiles)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeConfigBackup,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = true,
                ["name"] = name ?? string.Empty,
                ["path"] = path ?? string.Empty,
                ["profiles"] = profiles == null ? new JArray() : profiles.DeepClone(),
            };
            return payload.ToString(Formatting.None);
        }

        public static string BuildConfigBackupError(string requestId, string error)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeConfigBackup,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = false,
                ["error"] = string.IsNullOrEmpty(error) ? "读取配置备份失败。" : error,
            };
            return payload.ToString(Formatting.None);
        }


        public static string BuildFileSaved(
            string requestId,
            bool ok,
            string path,
            int bytes,
            bool canceled,
            string error)
        {
            JObject payload = new JObject
            {
                ["type"] = TypeFileSaved,
                ["requestId"] = requestId ?? string.Empty,
                ["ok"] = ok,
                ["path"] = path ?? string.Empty,
                ["bytes"] = bytes,
                ["canceled"] = canceled,
                ["error"] = error ?? string.Empty,
            };
            return payload.ToString(Formatting.None);
        }

    }
}
