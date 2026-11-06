using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>MATLAB -batch 一次运行的结果。</summary>
    internal sealed class MatlabRunResult
    {
        public bool Started { get; set; }

        public bool TimedOut { get; set; }

        public int ExitCode { get; set; } = -1;

        public string StdOut { get; set; } = string.Empty;

        public string StdErr { get; set; } = string.Empty;

        public string MatlabPath { get; set; }

        public string Error { get; set; }
    }

    /// <summary>
    /// 以 `matlab.exe -batch "run('script.m')"` 方式运行 MATLAB 脚本：
    /// 不打开 MATLAB 桌面、不弹启动画面；捕获 stdout/stderr，支持超时与进程树结束。
    /// 用户可控的文件路径只通过环境变量传入，脚本内容为固定模板，避免路径注入。
    /// </summary>
    internal static class MatlabRunner
    {
        public static MatlabRunResult RunBatch(
            string batchCommand,
            string workingDirectory,
            IDictionary<string, string> environment,
            int timeoutMs)
        {
            MatlabRunResult result = new MatlabRunResult();

            string matlabPath;
            string locateSource;
            if (!MatlabLocator.TryFind(out matlabPath, out locateSource))
            {
                result.Error = MatlabLocator.NotFoundMessage;
                return result;
            }

            result.MatlabPath = matlabPath;

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = matlabPath,
                Arguments = "-batch " + QuoteWindowsArgument(batchCommand),
                WorkingDirectory = workingDirectory,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8,
            };

            if (environment != null)
            {
                foreach (KeyValuePair<string, string> pair in environment)
                {
                    psi.EnvironmentVariables[pair.Key] = pair.Value ?? string.Empty;
                }
            }

            Process process;
            try
            {
                process = Process.Start(psi);
            }
            catch (Exception ex)
            {
                result.Error = "无法启动 MATLAB（" + matlabPath + "）：" + ex.Message;
                return result;
            }

            if (process == null)
            {
                result.Error = "无法启动 MATLAB（" + matlabPath + "）：进程创建失败。";
                return result;
            }

            result.Started = true;

            Task<string> stdoutTask = process.StandardOutput.ReadToEndAsync();
            Task<string> stderrTask = process.StandardError.ReadToEndAsync();

            bool exited;
            try
            {
                exited = process.WaitForExit(timeoutMs);
            }
            catch (Exception ex)
            {
                result.Error = "等待 MATLAB 进程失败：" + ex.Message;
                KillProcessTree(process);
                exited = false;
            }

            if (!exited && process.HasExited)
            {
                exited = true;
            }

            if (!exited)
            {
                result.TimedOut = true;
                KillProcessTree(process);
            }

            try
            {
                Task.WaitAll(new Task[] { stdoutTask, stderrTask }, 15000);
            }
            catch
            {
                // ignore
            }

            result.StdOut = SafeTaskResult(stdoutTask);
            result.StdErr = SafeTaskResult(stderrTask);

            if (exited)
            {
                try
                {
                    result.ExitCode = process.ExitCode;
                }
                catch
                {
                    result.ExitCode = -1;
                }
            }

            process.Dispose();
            return result;
        }

        /// <summary>Windows 命令行参数转义（标准 MSVCRT 规则）。</summary>
        public static string QuoteWindowsArgument(string argument)
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

        private static void KillProcessTree(Process process)
        {
            if (process == null)
            {
                return;
            }

            try
            {
                ProcessStartInfo killPsi = new ProcessStartInfo("taskkill", "/PID " + process.Id + " /T /F")
                {
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                };
                using (Process killer = Process.Start(killPsi))
                {
                    if (killer != null)
                    {
                        try
                        {
                            killer.WaitForExit(10000);
                        }
                        catch
                        {
                            // ignore
                        }
                    }
                }
            }
            catch
            {
                // ignore
            }

            try
            {
                if (!process.HasExited)
                {
                    process.Kill();
                }
            }
            catch
            {
                // ignore
            }

            try
            {
                process.WaitForExit(5000);
            }
            catch
            {
                // ignore
            }
        }

        private static string SafeTaskResult(Task<string> task)
        {
            try
            {
                if (task != null && task.Wait(10000))
                {
                    return task.Result ?? string.Empty;
                }
            }
            catch
            {
                // ignore
            }

            return string.Empty;
        }
    }
}
