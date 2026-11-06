using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// 定位本机 MATLAB（matlab.exe）。用于 .fig 导入转换。
    /// 查找顺序：环境变量 FIGPLAY_MATLAB_PATH → %LOCALAPPDATA%\FigurePlay\matlab-path.txt
    /// → 注册表 HKLM/HKCU MathWorks\MATLAB\&lt;ver&gt; MATLABROOT → 常见安装目录 R20* → PATH → App Paths。
    /// 结果缓存，避免每次导入重复探测。
    /// </summary>
    internal static class MatlabLocator
    {
        public const string NotFoundMessage =
            "未找到 MATLAB。桌面版导入 .fig 需要本机安装 MATLAB R2020a 或更高版本；" +
            "如已安装但未探测到，可设置环境变量 FIGPLAY_MATLAB_PATH 指向 matlab.exe，" +
            "或把 matlab.exe 的完整路径写入 %LOCALAPPDATA%\\FigurePlay\\matlab-path.txt。";

        private static readonly object SyncRoot = new object();
        private static bool _resolved;
        private static string _matlabPath;
        private static string _locateSource;
        private static string _cachedVersion;

        /// <summary>查找 matlab.exe；找到返回 true 并输出路径与来源。</summary>
        public static bool TryFind(out string path, out string source)
        {
            lock (SyncRoot)
            {
                EnsureResolved();
                path = _matlabPath;
                source = _locateSource;
                return !string.IsNullOrEmpty(path);
            }
        }

        /// <summary>MATLAB 版本字符串缓存（由转换脚本输出，如 "24.2.0.2712019 (R2024b)"）。</summary>
        public static string CachedVersion
        {
            get
            {
                lock (SyncRoot)
                {
                    return _cachedVersion;
                }
            }
        }

        public static void CacheVersion(string version)
        {
            if (string.IsNullOrWhiteSpace(version))
            {
                return;
            }

            lock (SyncRoot)
            {
                _cachedVersion = version.Trim();
            }
        }

        /// <summary>matlab.exe 文件版本（不需要启动 MATLAB，作为版本兜底）。</summary>
        public static string GetFileVersion(string matlabPath)
        {
            try
            {
                FileVersionInfo info = FileVersionInfo.GetVersionInfo(matlabPath);
                return info.ProductVersion ?? info.FileVersion ?? string.Empty;
            }
            catch
            {
                return string.Empty;
            }
        }

        private static void EnsureResolved()
        {
            if (_resolved)
            {
                return;
            }

            _resolved = true;

            // 1) 环境变量（显式指定优先）
            try
            {
                string envPath = Environment.GetEnvironmentVariable("FIGPLAY_MATLAB_PATH");
                if (!string.IsNullOrWhiteSpace(envPath) && File.Exists(envPath))
                {
                    SetFound(envPath, "环境变量 FIGPLAY_MATLAB_PATH");
                    return;
                }
            }
            catch
            {
                // ignore
            }

            // 2) 用户配置文件 %LOCALAPPDATA%\FigurePlay\matlab-path.txt
            try
            {
                string configured = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "FigurePlay",
                    "matlab-path.txt");
                if (File.Exists(configured))
                {
                    string configuredPath = File.ReadAllText(configured, Encoding.UTF8).Trim();
                    if (configuredPath.Length > 0 && File.Exists(configuredPath))
                    {
                        SetFound(configuredPath, "配置文件 %LOCALAPPDATA%\\FigurePlay\\matlab-path.txt");
                        return;
                    }
                }
            }
            catch
            {
                // ignore
            }

            // 3) 注册表 MathWorks\MATLAB\<version>\MATLABROOT
            foreach (string hive in new[] { "LocalMachine", "CurrentUser" })
            {
                foreach (string view in new[] { "Registry64", "Registry32" })
                {
                    try
                    {
                        Microsoft.Win32.RegistryHive registryHive =
                            string.Equals(hive, "CurrentUser", StringComparison.Ordinal)
                                ? Microsoft.Win32.RegistryHive.CurrentUser
                                : Microsoft.Win32.RegistryHive.LocalMachine;
                        Microsoft.Win32.RegistryView registryView =
                            string.Equals(view, "Registry32", StringComparison.Ordinal)
                                ? Microsoft.Win32.RegistryView.Registry32
                                : Microsoft.Win32.RegistryView.Registry64;

                        using (Microsoft.Win32.RegistryKey baseKey =
                            Microsoft.Win32.RegistryKey.OpenBaseKey(registryHive, registryView))
                        using (Microsoft.Win32.RegistryKey matlabKey =
                            baseKey.OpenSubKey(@"SOFTWARE\MathWorks\MATLAB"))
                        {
                            if (matlabKey == null)
                            {
                                continue;
                            }

                            string[] versions = matlabKey.GetSubKeyNames();
                            Array.Sort(versions, StringComparer.OrdinalIgnoreCase);
                            Array.Reverse(versions);
                            foreach (string version in versions)
                            {
                                using (Microsoft.Win32.RegistryKey versionKey = matlabKey.OpenSubKey(version))
                                {
                                    string root = versionKey == null
                                        ? null
                                        : versionKey.GetValue("MATLABROOT") as string;
                                    if (string.IsNullOrEmpty(root))
                                    {
                                        continue;
                                    }

                                    string candidate = Path.Combine(root, "bin", "matlab.exe");
                                    if (File.Exists(candidate))
                                    {
                                        SetFound(candidate, "注册表 MathWorks\\MATLAB\\" + version);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                    catch
                    {
                        // 某些注册表视图可能不存在，继续
                    }
                }
            }

            // 4) 常见安装目录（R20* 版本倒序）
            string[] commonRoots =
            {
                @"D:\Program Files\MATLAB",
                @"C:\Program Files\MATLAB",
                @"C:\Program Files (x86)\MATLAB",
                @"D:\MATLAB",
                @"C:\MATLAB",
            };

            foreach (string commonRoot in commonRoots)
            {
                try
                {
                    if (!Directory.Exists(commonRoot))
                    {
                        continue;
                    }

                    string[] versionDirs = Directory.GetDirectories(commonRoot, "R*");
                    Array.Sort(versionDirs, StringComparer.OrdinalIgnoreCase);
                    Array.Reverse(versionDirs);
                    foreach (string versionDir in versionDirs)
                    {
                        string candidate = Path.Combine(versionDir, "bin", "matlab.exe");
                        if (File.Exists(candidate))
                        {
                            SetFound(candidate, "常见安装目录 " + commonRoot);
                            return;
                        }
                    }
                }
                catch
                {
                    // ignore
                }
            }

            // 5) PATH
            try
            {
                string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
                foreach (string dir in pathEnv.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries))
                {
                    try
                    {
                        string candidate = Path.Combine(dir.Trim(), "matlab.exe");
                        if (File.Exists(candidate))
                        {
                            SetFound(candidate, "PATH 环境变量");
                            return;
                        }
                    }
                    catch
                    {
                        // ignore
                    }
                }
            }
            catch
            {
                // ignore
            }

            // 6) App Paths
            try
            {
                using (Microsoft.Win32.RegistryKey baseKey = Microsoft.Win32.RegistryKey.OpenBaseKey(
                    Microsoft.Win32.RegistryHive.LocalMachine,
                    Microsoft.Win32.RegistryView.Registry64))
                using (Microsoft.Win32.RegistryKey appPathKey = baseKey.OpenSubKey(
                    @"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\matlab.exe"))
                {
                    string appPath = appPathKey == null ? null : appPathKey.GetValue(null) as string;
                    if (!string.IsNullOrEmpty(appPath) && File.Exists(appPath))
                    {
                        SetFound(appPath, "注册表 App Paths");
                        return;
                    }
                }
            }
            catch
            {
                // ignore
            }

            _matlabPath = null;
            _locateSource = null;
        }

        private static void SetFound(string path, string source)
        {
            _matlabPath = path;
            _locateSource = source;
        }
    }
}
