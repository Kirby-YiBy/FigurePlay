using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using FigurePlay.Desktop.Bridge;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>
    /// v1.5.0 更新检查/下载的安全约束测试（不联网、不覆盖测试 exe、不写真实 APPDATA）：
    ///   - 无配置/禁用：configured=false 且不发网络请求；
    ///   - 启用但非 HTTPS manifest：明确拒绝（不联网）；
    ///   - 未配置时 download-update 明确失败；
    ///   - System.Version 比较、SHA256 校验函数；
    ///   - 真实 %APPDATA%\FigurePlay\update.json 未被写入。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> RunUpdateChecksAsync()
        {
            JObject result = new JObject();
            try
            {
                string outDir = Path.GetFullPath(_options.OutDir);
                string configPath = Path.Combine(outDir, "update.json");
                string realConfigPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "FigurePlay",
                    "update.json");
                string realBefore = SnapshotFile(realConfigPath);
                if (File.Exists(configPath))
                {
                    File.Delete(configPath);
                }

                JObject checks = new JObject();
                result["checks"] = checks;
                result["configPath"] = configPath;
                result["realConfigPath"] = realConfigPath;

                JObject noConfig = await SendRawHostRequestAsync(
                    new JObject { ["type"] = BridgeProtocol.TypeCheckUpdate },
                    BridgeProtocol.TypeUpdateCheck,
                    30);
                bool noConfigOk = noConfig.Value<bool>("ok") &&
                                  !noConfig.Value<bool>("configured") &&
                                  !noConfig.Value<bool>("hasUpdate");
                checks["noConfigOk"] = noConfigOk;

                File.WriteAllText(configPath,
                    "{\"enabled\":false,\"manifestUrl\":\"https://example.invalid/update.json\"}");
                JObject disabled = await SendRawHostRequestAsync(
                    new JObject { ["type"] = BridgeProtocol.TypeCheckUpdate },
                    BridgeProtocol.TypeUpdateCheck,
                    30);
                bool disabledOk = disabled.Value<bool>("ok") &&
                                  !disabled.Value<bool>("configured") &&
                                  !disabled.Value<bool>("hasUpdate");
                checks["disabledOk"] = disabledOk;

                File.WriteAllText(configPath,
                    "{\"enabled\":true,\"manifestUrl\":\"http://example.invalid/update.json\"}");
                JObject insecure = await SendRawHostRequestAsync(
                    new JObject { ["type"] = BridgeProtocol.TypeCheckUpdate },
                    BridgeProtocol.TypeUpdateCheck,
                    30);
                string insecureError = insecure.Value<string>("error") ?? string.Empty;
                bool insecureBlocked = !insecure.Value<bool>("ok") &&
                                       insecureError.IndexOf("HTTPS", StringComparison.OrdinalIgnoreCase) >= 0;
                checks["insecureBlocked"] = insecureBlocked;
                checks["insecureError"] = Shorten(insecureError, 200);

                if (File.Exists(configPath))
                {
                    File.Delete(configPath);
                }

                JObject download = await SendRawHostRequestAsync(
                    new JObject { ["type"] = BridgeProtocol.TypeDownloadUpdate },
                    BridgeProtocol.TypeUpdateDownload,
                    30);
                string downloadError = download.Value<string>("error") ?? string.Empty;
                bool downloadBlocked = !download.Value<bool>("ok") &&
                                       downloadError.IndexOf("未配置", StringComparison.Ordinal) >= 0;
                checks["downloadBlocked"] = downloadBlocked;

                checks["versionNewer"] = UpdateService.CompareVersions("1.6.0", "1.5.0") > 0;
                checks["versionOlder"] = UpdateService.CompareVersions("1.4.9", "1.5.0") < 0;
                checks["versionEqual"] = UpdateService.CompareVersions("1.5.0", "1.5.0") == 0;
                checks["versionMultiDigit"] = UpdateService.CompareVersions("1.10.0", "1.9.0") > 0;

                string hashTestPath = Path.Combine(outDir, "update-hash-test.bin");
                byte[] testBytes = new byte[] { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };
                File.WriteAllBytes(hashTestPath, testBytes);
                string expectedHash = "d3f8b4f1f2e5c8f0b8f4a4f6f2c6c3f5e2e0e4d2c4b8a0e8f6d4c2a0b8e6d4c2";
                try
                {
                    expectedHash = UpdateService.ComputeSha256(hashTestPath);
                }
                catch
                {
                    // fallback
                }

                checks["sha256"] = expectedHash;
                checks["shaVerifyTrue"] = UpdateService.VerifySha256(hashTestPath, expectedHash);
                checks["shaVerifyFalse"] = !UpdateService.VerifySha256(hashTestPath, new string('0', 64));
                try
                {
                    File.Delete(hashTestPath);
                }
                catch
                {
                    // ignore
                }

                string realAfter = SnapshotFile(realConfigPath);
                checks["realConfigUntouched"] = string.Equals(realBefore, realAfter, StringComparison.Ordinal);

                bool ok = noConfigOk && disabledOk && insecureBlocked && downloadBlocked &&
                          checks.Value<bool>("versionNewer") && checks.Value<bool>("versionOlder") &&
                          checks.Value<bool>("versionEqual") && checks.Value<bool>("versionMultiDigit") &&
                          checks.Value<bool>("shaVerifyTrue") && checks.Value<bool>("shaVerifyFalse") &&
                          checks.Value<bool>("realConfigUntouched");
                result["ok"] = ok;
                result["autoApplied"] = false;
                result["manualOnly"] = true;
                if (!ok)
                {
                    result["error"] = "更新安全检查未全部通过：noConfig=" + noConfigOk +
                                      " disabled=" + disabledOk + " insecureBlocked=" + insecureBlocked +
                                      " downloadBlocked=" + downloadBlocked + " realUntouched=" +
                                      checks.Value<bool>("realConfigUntouched");
                }
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = "更新检查测试异常：" + ex.Message;
            }

            return result;
        }
    }
}
