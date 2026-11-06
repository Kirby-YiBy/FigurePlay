using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace FigurePlay.SingleFile
{
    /// <summary>
    /// 单文件版 FigurePlay.exe：
    ///   1) 读取内嵌的 payload.zip（完整 dist：主程序 exe、WebView2 托管 dll、WebView2Loader.dll、wwwroot 网页资源）；
    ///   2) 计算 payload SHA256，首次运行时解压到 %LOCALAPPDATA%\FigurePlay\bin\app-&lt;sha16&gt;；
    ///   3) 清理其它旧版本解压目录；
    ///   4) 启动解压目录中的主程序 FigurePlay.exe（透传命令行参数，等待其退出并返回同一退出码）。
    ///
    /// 系统仍只需要 Microsoft Edge WebView2 Runtime；本 exe 之外不需要任何 dll / assets。
    /// 不写系统目录、不修改用户数据；仅写 %LOCALAPPDATA%\FigurePlay。
    /// </summary>
    internal static class Program
    {
        private const string PayloadResourceName = "FigurePlay.Payload.zip";
        private const string PayloadMarkerName = ".figureplay-payload.sha256";
        private const string ExtractedExeName = "FigurePlay.exe";
        private const string LogFileName = "singlefile.log";

        [STAThread]
        private static int Main(string[] args)
        {
            try
            {
                WriteLog("start: args=" + (args == null ? string.Empty : string.Join(" ", args)));

                byte[] payload = ReadPayload();
                string payloadHash = ComputeSha256(payload);
                string binRoot = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "FigurePlay",
                    "bin");
                string runtimeDirName = "app-" + payloadHash.Substring(0, 16);
                string runtimeDir = Path.Combine(binRoot, runtimeDirName);

                WriteLog("payload: " + payload.Length + " bytes sha256=" + payloadHash);
                WriteLog("runtime: " + runtimeDir);

                EnsureExtracted(payload, payloadHash, runtimeDir, runtimeDirName, binRoot);
                CleanupOldRuntimes(binRoot, runtimeDirName);

                string exePath = Path.Combine(runtimeDir, ExtractedExeName);
                if (!File.Exists(exePath))
                {
                    throw new FileNotFoundException("解压后的主程序不存在：" + exePath);
                }

                WriteLog("launch: " + exePath);
                return Launch(exePath, args);
            }
            catch (Exception ex)
            {
                WriteLog("fatal: " + ex);
                MessageBox.Show(
                    "FigurePlay 单文件版启动失败：\r\n\r\n" + ex.Message +
                    "\r\n\r\n日志：" + GetLogPath(),
                    "FigurePlay · 论文子图排版",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                return 1;
            }
        }

        // ---------------------------------------------------------------- payload

        private static byte[] ReadPayload()
        {
            Assembly assembly = Assembly.GetExecutingAssembly();
            using (Stream stream = assembly.GetManifestResourceStream(PayloadResourceName))
            {
                if (stream == null)
                {
                    throw new InvalidOperationException(
                        "程序内部缺少打包资源（" + PayloadResourceName +
                        "）。请使用 desktop\\build.ps1 重新构建单文件版。");
                }

                using (MemoryStream memory = new MemoryStream())
                {
                    stream.CopyTo(memory);
                    return memory.ToArray();
                }
            }
        }

        private static string ComputeSha256(byte[] data)
        {
            using (SHA256 sha = SHA256.Create())
            {
                byte[] hash = sha.ComputeHash(data);
                StringBuilder builder = new StringBuilder(hash.Length * 2);
                foreach (byte b in hash)
                {
                    builder.Append(b.ToString("x2"));
                }

                return builder.ToString();
            }
        }

        // ---------------------------------------------------------------- 解压 / 清理

        private static void EnsureExtracted(
            byte[] payload,
            string payloadHash,
            string runtimeDir,
            string runtimeDirName,
            string binRoot)
        {
            if (IsRuntimeReady(runtimeDir, payloadHash))
            {
                return;
            }

            Directory.CreateDirectory(binRoot);

            using (Mutex mutex = new Mutex(false, "FigurePlay.SingleFile.Extract." + runtimeDirName))
            {
                bool acquired = false;
                try
                {
                    try
                    {
                        acquired = mutex.WaitOne(TimeSpan.FromMinutes(2));
                    }
                    catch (AbandonedMutexException)
                    {
                        acquired = true;
                    }

                    // 双重检查：其它实例可能已经完成解压
                    if (IsRuntimeReady(runtimeDir, payloadHash))
                    {
                        return;
                    }

                    string tempDir = runtimeDir + ".tmp-" + Process.GetCurrentProcess().Id;
                    TryDeleteDirectory(tempDir);
                    ExtractPayload(payload, tempDir);
                    File.WriteAllText(
                        Path.Combine(tempDir, PayloadMarkerName),
                        payloadHash,
                        new UTF8Encoding(false));

                    TryDeleteDirectory(runtimeDir);
                    try
                    {
                        Directory.Move(tempDir, runtimeDir);
                    }
                    catch (IOException)
                    {
                        // 可能被其它实例抢先创建；能读出 marker 且合法则接受
                        if (IsRuntimeReady(runtimeDir, payloadHash))
                        {
                            TryDeleteDirectory(tempDir);
                            return;
                        }

                        throw;
                    }

                    WriteLog("extracted: " + runtimeDir);
                }
                finally
                {
                    if (acquired)
                    {
                        try
                        {
                            mutex.ReleaseMutex();
                        }
                        catch
                        {
                            // ignore
                        }
                    }
                }
            }
        }

        private static bool IsRuntimeReady(string runtimeDir, string payloadHash)
        {
            try
            {
                string exePath = Path.Combine(runtimeDir, ExtractedExeName);
                string markerPath = Path.Combine(runtimeDir, PayloadMarkerName);
                if (!File.Exists(exePath) || !File.Exists(markerPath))
                {
                    return false;
                }

                string marker = File.ReadAllText(markerPath, Encoding.UTF8).Trim();
                return string.Equals(marker, payloadHash, StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        private static void ExtractPayload(byte[] payload, string targetDir)
        {
            string rootFull = Path.GetFullPath(targetDir);
            string rootWithSeparator = rootFull.EndsWith(Path.DirectorySeparatorChar.ToString(), StringComparison.Ordinal)
                ? rootFull
                : rootFull + Path.DirectorySeparatorChar;

            Directory.CreateDirectory(rootFull);

            using (MemoryStream memory = new MemoryStream(payload, false))
            using (ZipArchive archive = new ZipArchive(memory, ZipArchiveMode.Read))
            {
                foreach (ZipArchiveEntry entry in archive.Entries)
                {
                    string destination = Path.GetFullPath(Path.Combine(rootFull, entry.FullName));
                    if (!destination.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidDataException("内嵌打包资源包含非法路径：" + entry.FullName);
                    }

                    if (string.IsNullOrEmpty(entry.Name))
                    {
                        Directory.CreateDirectory(destination);
                        continue;
                    }

                    string directory = Path.GetDirectoryName(destination);
                    if (!string.IsNullOrEmpty(directory))
                    {
                        Directory.CreateDirectory(directory);
                    }

                    entry.ExtractToFile(destination, true);
                }
            }
        }

        private static void CleanupOldRuntimes(string binRoot, string currentRuntimeDirName)
        {
            try
            {
                if (!Directory.Exists(binRoot))
                {
                    return;
                }

                foreach (string directory in Directory.GetDirectories(binRoot, "app-*"))
                {
                    string name = Path.GetFileName(directory);
                    if (string.Equals(name, currentRuntimeDirName, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    try
                    {
                        Directory.Delete(directory, true);
                        WriteLog("cleaned old runtime: " + name);
                    }
                    catch
                    {
                        // 旧版本可能正在运行，跳过
                    }
                }
            }
            catch
            {
                // ignore
            }
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
                // ignore
            }
        }

        // ---------------------------------------------------------------- 启动子进程

        private static int Launch(string exePath, string[] args)
        {
            ProcessStartInfo psi = new ProcessStartInfo(exePath)
            {
                UseShellExecute = false,
                // 保持调用者工作目录，便于相对路径参数（如 --out .\selftest）
                WorkingDirectory = Environment.CurrentDirectory,
            };

            if (args != null && args.Length > 0)
            {
                StringBuilder builder = new StringBuilder();
                foreach (string arg in args)
                {
                    if (builder.Length > 0)
                    {
                        builder.Append(' ');
                    }

                    builder.Append(QuoteWindowsArgument(arg));
                }

                psi.Arguments = builder.ToString();
            }

            using (Process child = Process.Start(psi))
            {
                if (child == null)
                {
                    throw new InvalidOperationException("无法启动主程序：" + exePath);
                }

                child.WaitForExit();
                WriteLog("child exited: " + child.ExitCode);
                return child.ExitCode;
            }
        }

        private static string QuoteWindowsArgument(string argument)
        {
            if (argument == null)
            {
                return "\"\"";
            }

            if (argument.Length > 0 &&
                argument.IndexOf('"') < 0 &&
                argument.IndexOf(' ') < 0 &&
                argument.IndexOf('\t') < 0)
            {
                return argument;
            }

            StringBuilder builder = new StringBuilder();
            builder.Append('"');
            int backslashes = 0;
            foreach (char c in argument)
            {
                if (c == '\\')
                {
                    backslashes++;
                }
                else if (c == '"')
                {
                    builder.Append('\\', backslashes * 2 + 1);
                    builder.Append('"');
                    backslashes = 0;
                }
                else
                {
                    if (backslashes > 0)
                    {
                        builder.Append('\\', backslashes);
                        backslashes = 0;
                    }

                    builder.Append(c);
                }
            }

            if (backslashes > 0)
            {
                builder.Append('\\', backslashes * 2);
            }

            builder.Append('"');
            return builder.ToString();
        }

        // ---------------------------------------------------------------- 日志

        private static string GetLogPath()
        {
            try
            {
                return Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "FigurePlay",
                    "bin",
                    LogFileName);
            }
            catch
            {
                return "singlefile.log";
            }
        }

        private static void WriteLog(string message)
        {
            try
            {
                string path = GetLogPath();
                string directory = Path.GetDirectoryName(path);
                if (!string.IsNullOrEmpty(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                File.AppendAllText(
                    path,
                    DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + "  " + message + Environment.NewLine,
                    new UTF8Encoding(false));
            }
            catch
            {
                // 日志失败不影响启动
            }
        }
    }
}
