using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace FigurePlay.Desktop
{
    /// <summary>应用运行期使用到的路径与图标。</summary>
    internal static class AppPaths
    {
        /// <summary>exe 所在目录（分发时即 dist 目录；单文件版为 %LOCALAPPDATA%\FigurePlay\bin\app-<hash>）。</summary>
        public static string ExeDir
        {
            get { return AppDomain.CurrentDomain.BaseDirectory; }
        }

        /// <summary>打包进 dist 的网页应用目录。</summary>
        public static string WwwRoot
        {
            get { return Path.Combine(ExeDir, "wwwroot"); }
        }

        /// <summary>正常模式的 WebView2 用户数据目录（IndexedDB / localStorage 都落在这里）。</summary>
        public static string UserDataFolder
        {
            get
            {
                return Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "FigurePlay",
                    "WebView2");
            }
        }

        /// <summary>自测模式使用独立的 WebView2 用户数据目录，避免污染用户数据。</summary>
        public static string SelfTestUserDataFolder
        {
            get
            {
                return Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "FigurePlay",
                    "WebView2-selftest");
            }
        }

        /// <summary>桌面版临时工作目录（.fig 导入等），位于 LOCALAPPDATA 下，避免系统 TEMP 权限问题。</summary>
        public static string TempRoot
        {
            get
            {
                return Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "FigurePlay",
                    "temp");
            }
        }

        /// <summary>从 exe 资源里取嵌入的应用图标。</summary>
        public static Icon LoadAppIcon()
        {
            try
            {
                Icon icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                if (icon != null)
                {
                    return icon;
                }
            }
            catch
            {
                // 图标缺失不影响运行
            }

            try
            {
                return Icon.ExtractAssociatedIcon(Path.Combine(ExeDir, "FigurePlay.exe"));
            }
            catch
            {
                return null;
            }
        }
    }
}
