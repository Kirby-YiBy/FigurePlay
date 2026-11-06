using System;
using System.IO;

namespace FigurePlay.Desktop
{
    /// <summary>命令行参数。</summary>
    internal sealed class AppOptions
    {
        public bool SelfTest { get; private set; }

        /// <summary>自测输出目录。</summary>
        public string OutDir { get; private set; }

        /// <summary>自测截图文件路径。</summary>
        public string ScreenshotPath { get; private set; }

        public static AppOptions Parse(string[] args)
        {
            AppOptions options = new AppOptions();
            if (args != null)
            {
                for (int i = 0; i < args.Length; i++)
                {
                    string arg = args[i] ?? string.Empty;
                    switch (arg.ToLowerInvariant())
                    {
                        case "--selftest":
                            options.SelfTest = true;
                            break;
                        case "--out":
                            if (i + 1 < args.Length)
                            {
                                options.OutDir = args[++i];
                            }
                            break;
                        case "--screenshot":
                            if (i + 1 < args.Length)
                            {
                                options.ScreenshotPath = args[++i];
                            }
                            break;
                        case "--help":
                        case "-h":
                        case "/?":
                            throw new OperationCanceledException(AppOptions.HelpText);
                    }
                }
            }

            if (options.SelfTest)
            {
                if (string.IsNullOrWhiteSpace(options.OutDir))
                {
                    options.OutDir = Path.Combine(AppPaths.ExeDir, "selftest");
                }

                options.OutDir = Path.GetFullPath(options.OutDir);
                if (string.IsNullOrWhiteSpace(options.ScreenshotPath))
                {
                    options.ScreenshotPath = Path.Combine(options.OutDir, "screenshot.png");
                }
                else
                {
                    options.ScreenshotPath = Path.GetFullPath(options.ScreenshotPath);
                }
            }

            return options;
        }

        public const string HelpText =
            "FigurePlay 桌面版\r\n" +
            "\r\n" +
            "用法：\r\n" +
            "  FigurePlay.exe                       正常启动桌面版\r\n" +
            "  FigurePlay.exe --selftest --out <目录> [--screenshot <文件>]\r\n" +
            "                                        无界面自测（加载应用、验证 EMF 剪贴板桥、截图）\r\n";
    }
}
