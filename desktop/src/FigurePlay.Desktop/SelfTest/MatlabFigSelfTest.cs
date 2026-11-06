using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using FigurePlay.Desktop.Bridge;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>
    /// selftest 用：调用本机 MATLAB 现场生成一个临时 .fig（含中英文标题、两条曲线、图例），
    /// 供真实桥导入测试使用。
    /// </summary>
    internal static class MatlabFigSelfTest
    {
        private const string GenerateScript = @"
outFile = getenv('FIGPLAY_TEST_FIG_OUT');
f = figure('Visible', 'off', 'Color', 'w', 'Position', [100 100 760 500]);
x = linspace(0, 2*pi, 200);
plot(x, sin(x), '-', 'LineWidth', 2);
hold on;
plot(x, cos(x), '--', 'LineWidth', 2);
hold off;
grid on;
title('FigurePlay MATLAB .fig 导入测试');
xlabel('x / 横坐标');
ylabel('y / 纵坐标');
legend({'sin(x)', 'cos(x)'});
savefig(f, outFile);
close(f);
fprintf('FIGUREPLAY_FIG_GENERATED:%s\n', outFile);
";

        /// <summary>生成测试 .fig；成功返回 true 并输出文件路径。</summary>
        public static bool GenerateTestFigure(
            string outDir,
            out string figPath,
            out string error,
            out long generateMs)
        {
            figPath = null;
            error = null;
            generateMs = 0;

            string matlabPath;
            string locateSource;
            if (!MatlabLocator.TryFind(out matlabPath, out locateSource))
            {
                error = MatlabLocator.NotFoundMessage;
                return false;
            }

            string root = Path.Combine(AppPaths.TempRoot, "fig-selftest-" + Guid.NewGuid().ToString("N"));
            try
            {
                Directory.CreateDirectory(root);
                Directory.CreateDirectory(outDir);

                string scriptPath = Path.Combine(root, "generate_test_fig.m");
                File.WriteAllText(scriptPath, GenerateScript, new UTF8Encoding(false));

                string outputFig = Path.Combine(outDir, "matlab-test-figure.fig");
                Dictionary<string, string> environment = new Dictionary<string, string>
                {
                    ["FIGPLAY_TEST_FIG_OUT"] = outputFig,
                };

                string batchCommand = "run('" + scriptPath.Replace("'", "''") + "')";
                Stopwatch watch = Stopwatch.StartNew();
                MatlabRunResult run = MatlabRunner.RunBatch(batchCommand, root, environment, 180000);
                watch.Stop();
                generateMs = watch.ElapsedMilliseconds;

                if (!run.Started)
                {
                    error = run.Error ?? "无法启动 MATLAB。";
                    return false;
                }

                if (run.TimedOut)
                {
                    error = "MATLAB 生成测试 .fig 超时（超过 180 秒）。";
                    return false;
                }

                if (!File.Exists(outputFig) || new FileInfo(outputFig).Length < 64)
                {
                    error = "MATLAB 未生成有效的测试 .fig（退出码 " + run.ExitCode + "）。" +
                            Tail(run.StdErr);
                    return false;
                }

                figPath = outputFig;
                return true;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
            finally
            {
                try
                {
                    if (Directory.Exists(root))
                    {
                        Directory.Delete(root, true);
                    }
                }
                catch
                {
                    // ignore
                }
            }
        }

        private static string Tail(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                return string.Empty;
            }

            string trimmed = text.Trim();
            if (trimmed.Length > 600)
            {
                trimmed = "..." + trimmed.Substring(trimmed.Length - 600);
            }

            return " MATLAB 输出：" + trimmed.Replace("\r", " ").Replace("\n", " ");
        }
    }
}
