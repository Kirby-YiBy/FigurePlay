using System;
using System.IO;
using System.Text;
using System.Windows.Forms;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop
{
    internal static class Program
    {
        internal const string WindowTitle = "FigurePlay · 论文子图排版";

        [STAThread]
        private static int Main(string[] args)
        {
            AppOptions options;
            try
            {
                options = AppOptions.Parse(args);
            }
            catch (OperationCanceledException)
            {
                MessageBox.Show(
                    AppOptions.HelpText,
                    WindowTitle,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
                return 0;
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "命令行参数解析失败：" + ex.Message,
                    WindowTitle,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                return 2;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            int exitCode = 1;
            Application.ThreadException += (sender, e) => ReportFatal(options, e.Exception);
            AppDomain.CurrentDomain.UnhandledException += (sender, e) =>
                ReportFatal(options, e.ExceptionObject as Exception);

            try
            {
                using (MainForm form = new MainForm(options))
                {
                    Application.Run(form);
                    exitCode = form.ExitCode;
                }
            }
            catch (Exception ex)
            {
                exitCode = 1;
                ReportFatal(options, ex);
            }

            Environment.ExitCode = exitCode;
            return exitCode;
        }

        private static void ReportFatal(AppOptions options, Exception exception)
        {
            string message = exception == null ? "未知异常" : exception.ToString();
            try
            {
                if (options != null && options.SelfTest)
                {
                    WriteCrashLog(options, message);
                }
                else
                {
                    MessageBox.Show(
                        "FigurePlay 遇到未处理的异常：\r\n\r\n" + message,
                        WindowTitle,
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                }
            }
            catch
            {
                // 最后一道防线，避免错误处理本身再次抛异常
            }
        }

        private static void WriteCrashLog(AppOptions options, string message)
        {
            try
            {
                Directory.CreateDirectory(options.OutDir);
                JObject crash = new JObject
                {
                    ["success"] = false,
                    ["exitCode"] = 1,
                    ["fatal"] = message,
                    ["timestamp"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"),
                };
                string path = Path.Combine(options.OutDir, "selftest-crash.json");
                File.WriteAllText(path, crash.ToString(), new UTF8Encoding(false));
                Console.Error.WriteLine("FigurePlay 自测崩溃，日志：" + path);
            }
            catch
            {
                // ignore
            }
        }
    }
}
