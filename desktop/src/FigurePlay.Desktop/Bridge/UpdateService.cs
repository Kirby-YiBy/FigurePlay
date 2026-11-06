using System;
using System.Globalization;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// v1.5.0 更新检查/下载（默认安全关闭，不自动静默替换）：
    ///   - 配置：正常模式 %APPDATA%\FigurePlay\update.json（优先），否则 exe 同目录 update.json；
    ///     selftest 只用 &lt;outDir&gt;\update.json 隔离，不读真实 APPDATA / 不联网；
    ///   - check-update：仅当 enabled=true 且 manifestUrl 为 HTTPS 才 GET；版本用 System.Version 比较；
    ///   - download-update：HTTPS 下载 → 校验 SHA256 → 保存到临时目录并给出“手动替换”提示；
    ///     不做无校验自动替换，不覆盖测试 exe。
    /// </summary>
    internal sealed class UpdateService
    {
        private static readonly HttpClient Http = CreateHttpClient();

        public UpdateService(bool selfTest, string outDir)
        {
            IsSelfTest = selfTest;
            ConfigPath = selfTest
                ? Path.Combine(string.IsNullOrEmpty(outDir) ? AppPaths.ExeDir : outDir, "update.json")
                : Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "FigurePlay",
                    "update.json");
            DownloadDir = Path.Combine(Path.GetTempPath(), "FigurePlay-update");
        }

        public bool IsSelfTest { get; private set; }

        public string ConfigPath { get; private set; }

        public string DownloadDir { get; private set; }

        private static HttpClient CreateHttpClient()
        {
            HttpClient client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("FigurePlay/" + BridgeProtocol.HostVersion);
            return client;
        }

        public async Task<JObject> CheckAsync()
        {
            JObject config = LoadConfig();
            JObject result = new JObject
            {
                ["ok"] = true,
                ["configured"] = false,
                ["enabled"] = false,
                ["currentVersion"] = BridgeProtocol.HostVersion,
                ["latestVersion"] = BridgeProtocol.HostVersion,
                ["hasUpdate"] = false,
                ["notes"] = string.Empty,
                ["url"] = string.Empty,
                ["sha256"] = string.Empty,
                ["publishedAt"] = string.Empty,
                ["configPath"] = ConfigPath,
            };
            if (config == null || !(config.Value<bool?>("enabled") ?? false))
            {
                return result;
            }

            result["enabled"] = true;
            string manifestUrl = config.Value<string>("manifestUrl") ?? string.Empty;
            if (!IsHttpsUrl(manifestUrl))
            {
                result["ok"] = false;
                result["error"] = "更新源 manifestUrl 必须是 HTTPS 地址（默认不联网）。";
                return result;
            }

            try
            {
                string manifestText = await Http.GetStringAsync(manifestUrl).ConfigureAwait(false);
                JObject manifest = JObject.Parse(manifestText);
                string latest = manifest.Value<string>("version") ?? string.Empty;
                if (!IsValidVersion(latest))
                {
                    result["ok"] = false;
                    result["error"] = "更新 manifest 缺少有效 version。";
                    return result;
                }

                result["configured"] = true;
                result["latestVersion"] = latest;
                result["notes"] = manifest.Value<string>("notes") ?? string.Empty;
                result["url"] = manifest.Value<string>("url") ?? string.Empty;
                result["sha256"] = manifest.Value<string>("sha256") ?? string.Empty;
                result["publishedAt"] = manifest.Value<string>("publishedAt") ?? string.Empty;
                result["hasUpdate"] = CompareVersions(latest, BridgeProtocol.HostVersion) > 0;
                return result;
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = "检查更新失败（网络或 manifest 错误）：" + ex.Message;
                return result;
            }
        }

        public async Task<JObject> DownloadAsync()
        {
            JObject config = LoadConfig();
            JObject result = new JObject
            {
                ["ok"] = false,
                ["message"] = string.Empty,
                ["path"] = string.Empty,
                ["bytes"] = 0,
                ["sha256"] = string.Empty,
                ["autoApplied"] = false,
                ["manual"] = true,
            };
            if (config == null || !(config.Value<bool?>("enabled") ?? false))
            {
                result["error"] = "未配置更新源（update.json enabled=false 或不存在），不下载。";
                return result;
            }

            string manifestUrl = config.Value<string>("manifestUrl") ?? string.Empty;
            if (!IsHttpsUrl(manifestUrl))
            {
                result["error"] = "更新源 manifestUrl 必须是 HTTPS 地址。";
                return result;
            }

            try
            {
                string manifestText = await Http.GetStringAsync(manifestUrl).ConfigureAwait(false);
                JObject manifest = JObject.Parse(manifestText);
                string version = manifest.Value<string>("version") ?? string.Empty;
                string url = manifest.Value<string>("url") ?? string.Empty;
                string sha256 = (manifest.Value<string>("sha256") ?? string.Empty).Trim().ToLowerInvariant();
                if (!IsValidVersion(version))
                {
                    result["error"] = "更新 manifest 缺少有效 version。";
                    return result;
                }

                if (!IsHttpsUrl(url))
                {
                    result["error"] = "更新下载地址必须是 HTTPS。";
                    return result;
                }

                if (sha256.Length != 64 || !IsHex(sha256))
                {
                    result["error"] = "更新 manifest 的 sha256 无效（需要 64 位十六进制）。";
                    return result;
                }

                byte[] bytes = await Http.GetByteArrayAsync(url).ConfigureAwait(false);
                if (bytes.Length < 1024)
                {
                    result["error"] = "下载的更新文件过小，已拒绝。";
                    return result;
                }

                Directory.CreateDirectory(DownloadDir);
                string target = Path.Combine(DownloadDir, "FigurePlay-" + version + ".exe");
                if (IsSelfTest)
                {
                    target = Path.Combine(Path.GetDirectoryName(ConfigPath) ?? AppPaths.ExeDir,
                        "update-download-" + version + ".exe");
                    Directory.CreateDirectory(Path.GetDirectoryName(target) ?? AppPaths.ExeDir);
                }

                File.WriteAllBytes(target, bytes);
                string actual = ComputeSha256(target);
                if (!string.Equals(actual, sha256, StringComparison.OrdinalIgnoreCase))
                {
                    TryDelete(target);
                    result["error"] = "更新文件 SHA256 校验失败（期望 " + sha256 + "，实际 " + actual + "），已删除。";
                    return result;
                }

                result["ok"] = true;
                result["path"] = target;
                result["bytes"] = bytes.Length;
                result["sha256"] = actual;
                result["latestVersion"] = version;
                result["url"] = url;
                result["message"] =
                    "已下载并校验 FigurePlay " + version + "（SHA256 匹配）。当前运行中的程序不会被覆盖；" +
                    "请关闭 FigurePlay 后用该文件手动替换安装目录中的 FigurePlay.exe（配置与 WebView2 数据保留）。" +
                    (IsSelfTest ? "（selftest：已禁用自动替换）" : "");
                return result;
            }
            catch (Exception ex)
            {
                result["error"] = "下载更新失败：" + ex.Message;
                return result;
            }
        }

        private JObject LoadConfig()
        {
            try
            {
                if (File.Exists(ConfigPath))
                {
                    return JObject.Parse(File.ReadAllText(ConfigPath));
                }

                if (!IsSelfTest)
                {
                    string besideExe = Path.Combine(AppPaths.ExeDir, "update.json");
                    if (File.Exists(besideExe))
                    {
                        return JObject.Parse(File.ReadAllText(besideExe));
                    }
                }
            }
            catch
            {
                // 配置损坏按未配置处理
            }

            return null;
        }

        internal static int CompareVersions(string left, string right)
        {
            Version a;
            Version b;
            if (!Version.TryParse(NormalizeVersion(left), out a))
            {
                return 1;
            }

            if (!Version.TryParse(NormalizeVersion(right), out b))
            {
                return -1;
            }

            return a.CompareTo(b);
        }

        internal static bool VerifySha256(string path, string expectedHex)
        {
            try
            {
                if (string.IsNullOrEmpty(expectedHex) || expectedHex.Length != 64 || !File.Exists(path))
                {
                    return false;
                }

                return string.Equals(ComputeSha256(path), expectedHex, StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        internal static string ComputeSha256(string path)
        {
            using (SHA256 sha = SHA256.Create())
            using (FileStream stream = File.OpenRead(path))
            {
                byte[] hash = sha.ComputeHash(stream);
                StringBuilder builder = new StringBuilder(hash.Length * 2);
                foreach (byte value in hash)
                {
                    builder.Append(value.ToString("x2", CultureInfo.InvariantCulture));
                }

                return builder.ToString();
            }
        }

        private static string NormalizeVersion(string version)
        {
            string value = (version ?? string.Empty).Trim();
            if (value.StartsWith("v", StringComparison.OrdinalIgnoreCase))
            {
                value = value.Substring(1);
            }

            int dash = value.IndexOfAny(new[] { '-', '+' });
            if (dash >= 0)
            {
                value = value.Substring(0, dash);
            }

            return value;
        }

        private static bool IsValidVersion(string version)
        {
            Version parsed;
            return Version.TryParse(NormalizeVersion(version), out parsed);
        }

        private static bool IsHttpsUrl(string url)
        {
            Uri uri;
            return Uri.TryCreate(url, UriKind.Absolute, out uri) &&
                   string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsHex(string value)
        {
            foreach (char c in value)
            {
                if (!Uri.IsHexDigit(c))
                {
                    return false;
                }
            }

            return true;
        }

        private static void TryDelete(string path)
        {
            try
            {
                if (!string.IsNullOrEmpty(path) && File.Exists(path))
                {
                    File.Delete(path);
                }
            }
            catch
            {
                // ignore
            }
        }
    }
}
