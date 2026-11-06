using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>.fig 导入转换结果。</summary>
    internal sealed class FigImportResult
    {
        public bool Ok { get; set; }

        public string Error { get; set; }

        public byte[] PngBytes { get; set; }

        public int Width { get; set; }

        public int Height { get; set; }

        public string SourceFormat { get; set; } = "MATLAB-FIG";

        /// <summary>整个转换耗时（含 MATLAB 启动），毫秒。</summary>
        public long ConvertMs { get; set; }

        /// <summary>MATLAB 同时导出的真实 EMF 原始字节（供矢量 PDF）。</summary>
        public byte[] EmfBytes { get; set; }

        public string MatlabVersion { get; set; }

        public string MatlabPath { get; set; }

        public List<string> Diagnostics { get; } = new List<string>();

        public string DataUrl
        {
            get
            {
                if (!Ok || PngBytes == null || PngBytes.Length == 0)
                {
                    return null;
                }

                return "data:image/png;base64," + Convert.ToBase64String(PngBytes);
            }
        }

        public static FigImportResult Fail(string error)
        {
            return new FigImportResult
            {
                Ok = false,
                Error = error,
            };
        }
    }

    /// <summary>
    /// MATLAB .fig → PNG：
    ///   1) base64 解码校验 → 临时目录写 input.fig + 固定模板 figureplay_import.m；
    ///   2) `matlab.exe -batch "run('...')"`（无桌面，无交互）导出 600dpi PNG；
    ///   3) 读取 PNG → 白底/限尺寸统一处理 → dataUrl；
    ///   4) 无论成败清理临时目录；绝不修改用户文件、不打开 MATLAB 图形界面。
    /// </summary>
    internal static class FigImporter
    {
        public const int MatlabTimeoutMs = 120000;

        private const int MaxFigBytes = 100 * 1024 * 1024;

        /// <summary>固定模板：路径经环境变量传入，避免任何用户路径进入脚本文本。</summary>
        private const string ImportScript = @"
inFile = getenv('FIGPLAY_FIG_IN');
outFile = getenv('FIGPLAY_FIG_OUT');
emfFile = getenv('FIGPLAY_FIG_EMF');
fprintf('FIGUREPLAY_MATLAB_VERSION:%s\n', version);
close all force;
fig = openfig(inFile, 'invisible');
set(fig, 'Visible', 'off');
ok = false;
try
    exportgraphics(fig, outFile, 'Resolution', 600);
    ok = true;
catch err
    fprintf(2, 'FIGUREPLAY_EXPORTGRAPHICS_FAILED: %s\n', err.message);
end
if ~ok
    print(fig, outFile, '-dpng', '-r600');
end
if ~isempty(emfFile)
    try
        print(fig, emfFile, '-dmeta');
    catch err
        fprintf(2, 'FIGUREPLAY_EMF_EXPORT_FAILED: %s\n', err.message);
        if exist(emfFile, 'file') == 2
            delete(emfFile);
        end
    end
end
close(fig);
";

        public static FigImportResult Import(string base64, string filename)
        {
            Stopwatch totalWatch = Stopwatch.StartNew();
            string tempRoot = null;

            try
            {
                // 1) 校验 + 解码
                if (string.IsNullOrWhiteSpace(base64))
                {
                    return FigImportResult.Fail("导入失败：没有收到 .fig 文件内容（base64 为空）。");
                }

                byte[] figBytes;
                try
                {
                    figBytes = Convert.FromBase64String(base64.Trim());
                }
                catch (FormatException)
                {
                    return FigImportResult.Fail(
                        "导入失败：.fig 文件数据不是有效的 base64 编码，可能在上传过程中损坏，请重新选择文件。");
                }

                if (figBytes.Length < 64)
                {
                    return FigImportResult.Fail("导入失败：.fig 文件内容过小，不是有效的 MATLAB 图窗文件。");
                }

                if (figBytes.Length > MaxFigBytes)
                {
                    return FigImportResult.Fail("导入失败：.fig 文件超过 100MB，暂不支持。");
                }

                if (!LooksLikeMatFile(figBytes))
                {
                    return FigImportResult.Fail(
                        "导入失败：文件不是有效的 MATLAB .fig（缺少 MAT 文件头），可能已损坏，或实际是图片/其它格式。");
                }

                // 2) 定位 MATLAB（结果缓存）
                string matlabPath;
                string locateSource;
                if (!MatlabLocator.TryFind(out matlabPath, out locateSource))
                {
                    return FigImportResult.Fail(MatlabLocator.NotFoundMessage);
                }

                // 3) 临时目录（%LOCALAPPDATA%，避免系统 TEMP 权限问题）
                tempRoot = Path.Combine(AppPaths.TempRoot, "fig-" + Guid.NewGuid().ToString("N"));
                Directory.CreateDirectory(tempRoot);

                string figPath = Path.Combine(tempRoot, "input.fig");
                string scriptPath = Path.Combine(tempRoot, "figureplay_import.m");
                string pngPath = Path.Combine(tempRoot, "output.png");
                string emfPath = Path.Combine(tempRoot, "output.emf");

                File.WriteAllBytes(figPath, figBytes);
                File.WriteAllText(scriptPath, ImportScript, new UTF8Encoding(false));

                Dictionary<string, string> environment = new Dictionary<string, string>
                {
                    ["FIGPLAY_FIG_IN"] = figPath,
                    ["FIGPLAY_FIG_OUT"] = pngPath,
                    ["FIGPLAY_FIG_EMF"] = emfPath,
                };

                // 4) 运行 MATLAB（-batch，无桌面/无交互）
                string batchCommand = "run('" + EscapeMatlabString(scriptPath) + "')";
                Stopwatch matlabWatch = Stopwatch.StartNew();
                MatlabRunResult run = MatlabRunner.RunBatch(batchCommand, tempRoot, environment, MatlabTimeoutMs);
                matlabWatch.Stop();
                long matlabElapsed = matlabWatch.ElapsedMilliseconds;

                FigImportResult diagnosticsHolder = new FigImportResult();
                diagnosticsHolder.Diagnostics.Add(
                    string.Format(
                        "fig: name={0} bytes={1}; matlab: {2} ({3})",
                        SanitizeFileName(filename),
                        figBytes.Length,
                        matlabPath,
                        locateSource));
                diagnosticsHolder.Diagnostics.Add(
                    string.Format(
                        "matlab-run: started={0} exit={1} timedOut={2} elapsed={3}ms",
                        run.Started,
                        run.ExitCode,
                        run.TimedOut,
                        matlabElapsed));

                if (!string.IsNullOrEmpty(run.StdErr))
                {
                    diagnosticsHolder.Diagnostics.Add("stderr: " + Trim(run.StdErr, 3000));
                }

                string matlabVersion = ParseMatlabVersion(run.StdOut);
                if (string.IsNullOrEmpty(matlabVersion))
                {
                    matlabVersion = MatlabLocator.GetFileVersion(matlabPath);
                }

                if (!string.IsNullOrEmpty(matlabVersion))
                {
                    MatlabLocator.CacheVersion(matlabVersion);
                }

                if (!run.Started)
                {
                    return WithDiagnostics(
                        FigImportResult.Fail(run.Error ?? "无法启动 MATLAB。"),
                        diagnosticsHolder);
                }

                if (run.TimedOut)
                {
                    return WithDiagnostics(
                        FigImportResult.Fail(
                            "MATLAB 转换超时（超过 " + (MatlabTimeoutMs / 1000) +
                            " 秒）。首次启动 MATLAB 或网络许可检查可能较慢，请稍后重试。"),
                        diagnosticsHolder);
                }

                if (!File.Exists(pngPath) || new FileInfo(pngPath).Length < 32)
                {
                    return WithDiagnostics(
                        FigImportResult.Fail(BuildConversionError(run)),
                        diagnosticsHolder);
                }

                // 5) PNG → 白底统一 PNG（限制最大边 6000px）
                byte[] rawPng = File.ReadAllBytes(pngPath);
                if (!IsPng(rawPng))
                {
                    return WithDiagnostics(
                        FigImportResult.Fail("导入失败：MATLAB 输出的不是有效 PNG 文件。"),
                        diagnosticsHolder);
                }

                ClipboardImageResult raster;
                List<string> rasterDiagnostics = new List<string>();
                using (MemoryStream stream = new MemoryStream(rawPng, false))
                using (Bitmap bitmap = new Bitmap(stream))
                {
                    raster = RasterConverter.FromImage(bitmap, "MATLAB-FIG", rasterDiagnostics);
                    diagnosticsHolder.Diagnostics.Add(
                        string.Format("matlab-png: raw={0}x{1} {2}B", bitmap.Width, bitmap.Height, rawPng.Length));
                }

                diagnosticsHolder.Diagnostics.AddRange(rasterDiagnostics);

                // 6) MATLAB 同时导出的 EMF（用于矢量 PDF；失败不影响 PNG 导入结果）
                byte[] emfBytes = null;
                try
                {
                    if (File.Exists(emfPath))
                    {
                        byte[] candidate = File.ReadAllBytes(emfPath);
                        if (EmfValidator.LooksLikeEmf(candidate))
                        {
                            emfBytes = candidate;
                            diagnosticsHolder.Diagnostics.Add(
                                "matlab-emf: " + candidate.Length + " bytes header=" +
                                EmfValidator.DescribeHeader(candidate));
                        }
                        else
                        {
                            diagnosticsHolder.Diagnostics.Add(
                                "matlab-emf 被拒绝：header=" + EmfValidator.DescribeHeader(candidate));
                        }
                    }
                    else
                    {
                        diagnosticsHolder.Diagnostics.Add("matlab-emf：MATLAB 未生成 EMF（print -dmeta 可能不可用）。");
                    }
                }
                catch (Exception ex)
                {
                    diagnosticsHolder.Diagnostics.Add("matlab-emf 读取失败：" + ex.Message);
                }

                totalWatch.Stop();
                FigImportResult result = new FigImportResult
                {
                    Ok = true,
                    PngBytes = raster.PngBytes,
                    Width = raster.Width,
                    Height = raster.Height,
                    SourceFormat = "MATLAB-FIG",
                    ConvertMs = totalWatch.ElapsedMilliseconds,
                    MatlabVersion = matlabVersion,
                    MatlabPath = matlabPath,
                    EmfBytes = emfBytes,
                };
                result.Diagnostics.AddRange(diagnosticsHolder.Diagnostics);
                result.Diagnostics.Add(
                    string.Format("result: {0}x{1} {2}B convertMs={3}", result.Width, result.Height, result.PngBytes.Length, result.ConvertMs));
                return result;
            }
            catch (OutOfMemoryException)
            {
                return FigImportResult.Fail("导入失败：图像过大，内存不足。");
            }
            catch (Exception ex)
            {
                return FigImportResult.Fail("导入失败：" + ex.Message);
            }
            finally
            {
                if (tempRoot != null)
                {
                    TryDeleteDirectory(tempRoot);
                }
            }
        }

        public static bool LooksLikeMatFile(byte[] bytes)
        {
            if (bytes == null || bytes.Length < 16)
            {
                return false;
            }

            // HDF5（MAT v7.3）签名
            byte[] hdf5 = { 0x89, 0x48, 0x44, 0x46, 0x0D, 0x0A, 0x1A, 0x0A };
            bool isHdf5 = true;
            for (int i = 0; i < hdf5.Length; i++)
            {
                if (bytes[i] != hdf5[i])
                {
                    isHdf5 = false;
                    break;
                }
            }

            if (isHdf5)
            {
                return true;
            }

            // MAT v5/v7：前 128 字节里有 "MATLAB 5.0 MAT-file" / "MATLAB 7.0 MAT-file"
            int limit = Math.Min(bytes.Length, 128);
            string header = Encoding.ASCII.GetString(bytes, 0, limit);
            return header.IndexOf("MATLAB", StringComparison.Ordinal) >= 0 &&
                   header.IndexOf("MAT-file", StringComparison.Ordinal) >= 0;
        }

        public static string ParseMatlabVersion(string stdout)
        {
            if (string.IsNullOrEmpty(stdout))
            {
                return null;
            }

            const string marker = "FIGUREPLAY_MATLAB_VERSION:";
            int index = stdout.IndexOf(marker, StringComparison.Ordinal);
            if (index < 0)
            {
                return null;
            }

            int start = index + marker.Length;
            int end = stdout.IndexOf('\n', start);
            string version = end < 0 ? stdout.Substring(start) : stdout.Substring(start, end - start);
            return version.Trim();
        }

        private static string BuildConversionError(MatlabRunResult run)
        {
            string stderr = (run.StdErr ?? string.Empty).Trim();
            string lower = stderr.ToLowerInvariant();

            if (lower.Contains("license") || lower.Contains("licensing") || lower.Contains("checkout"))
            {
                return "MATLAB 许可校验失败，无法转换 .fig。请确认本机 MATLAB 能正常启动（许可证/网络许可可用）。";
            }

            if (lower.Contains("unable to open") ||
                lower.Contains("cannot open") ||
                lower.Contains("not a valid") ||
                lower.Contains("invalid") ||
                lower.Contains("corrupt") ||
                lower.Contains("undefined function 'openfig'"))
            {
                return "无法读取该 .fig 文件：文件可能已损坏，或由更高版本 MATLAB 保存（请用同版本或更新版本重新保存）。" +
                       Tail(stderr);
            }

            if (run.ExitCode != 0)
            {
                return "MATLAB 转换失败（退出码 " + run.ExitCode + "）。" + Tail(stderr);
            }

            return "MATLAB 已运行但没有生成 PNG 输出（图形可能为空或导出失败）。" + Tail(stderr);
        }

        private static string Tail(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                return string.Empty;
            }

            string trimmed = Trim(text.Trim(), 800);
            return " MATLAB 输出：" + trimmed.Replace("\r", " ").Replace("\n", " ");
        }

        private static string Trim(string text, int maxLength)
        {
            if (string.IsNullOrEmpty(text) || text.Length <= maxLength)
            {
                return text ?? string.Empty;
            }

            return "..." + text.Substring(text.Length - maxLength);
        }

        private static string EscapeMatlabString(string value)
        {
            // MATLAB 单引号字符串：单引号自身用两个单引号转义
            return (value ?? string.Empty).Replace("'", "''");
        }

        private static string SanitizeFileName(string filename)
        {
            if (string.IsNullOrEmpty(filename))
            {
                return "(未提供)";
            }

            try
            {
                return Path.GetFileName(filename);
            }
            catch
            {
                return "(无效文件名)";
            }
        }

        private static bool IsPng(byte[] bytes)
        {
            return bytes != null &&
                   bytes.Length > 8 &&
                   bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
        }

        private static FigImportResult WithDiagnostics(FigImportResult result, FigImportResult diagnostics)
        {
            if (diagnostics != null)
            {
                result.Diagnostics.AddRange(diagnostics.Diagnostics);
            }

            return result;
        }

        private static void TryDeleteDirectory(string path)
        {
            try
            {
                if (Directory.Exists(path))
                {
                    Directory.Delete(path, true);
                }
            }
            catch
            {
                // 临时目录清理失败不影响结果
            }
        }
    }

    /// <summary>串行化 MATLAB 转换（同一时间只跑一个 matlab.exe），并在后台线程执行。</summary>
    internal sealed class FigImportService : IDisposable
    {
        private readonly SemaphoreSlim _gate = new SemaphoreSlim(1, 1);
        private bool _disposed;

        public async Task<FigImportResult> ImportAsync(string base64, string filename)
        {
            if (_disposed)
            {
                return FigImportResult.Fail("导入服务已关闭。");
            }

            await _gate.WaitAsync().ConfigureAwait(false);
            try
            {
                return await Task.Run(() => FigImporter.Import(base64, filename)).ConfigureAwait(false);
            }
            catch (OutOfMemoryException)
            {
                return FigImportResult.Fail("导入失败：图像过大，内存不足。");
            }
            catch (Exception ex)
            {
                return FigImportResult.Fail("导入失败：" + ex.Message);
            }
            finally
            {
                _gate.Release();
            }
        }

        public static string DescribeFailure(Exception ex)
        {
            if (ex == null)
            {
                return "导入失败：未知错误。";
            }

            if (ex is OutOfMemoryException)
            {
                return "导入失败：图像过大，内存不足。";
            }

            return "导入失败：" + ex.Message;
        }

        public void Dispose()
        {
            _disposed = true;
            _gate.Dispose();
        }
    }
}
