using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using FigurePlay.Desktop.Bridge;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>
    /// v1.5.1 真实 WebView2 更新 UI E2E：调用冻结 updates.js 的 __UPDATES__.check() 与
    /// FP.desktop.downloadUpdate()，验证 check-update→update-info、download-update→update-downloaded
    /// 回包让 Promise 立即 resolve（不落 20s/180s 超时）；selftest 使用本地 file:// manifest，不联网。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> RunUpdateBridgeE2ETestAsync()
        {
            JObject result = new JObject();
            string outDir = Path.GetFullPath(_options.OutDir);
            string manifestPath = Path.Combine(outDir, "update-e2e-manifest.json");
            string payloadPath = Path.Combine(outDir, "update-e2e-payload.exe");
            string configPath = Path.Combine(outDir, "update.json");
            try
            {
                byte[] payload = new byte[4096];
                new Random(42).NextBytes(payload);
                File.WriteAllBytes(payloadPath, payload);
                string sha256;
                using (SHA256 sha = SHA256.Create())
                {
                    StringBuilder sb = new StringBuilder();
                    foreach (byte b in sha.ComputeHash(payload))
                    {
                        sb.Append(b.ToString("x2"));
                    }

                    sha256 = sb.ToString();
                }

                string payloadUrl = new Uri(payloadPath).AbsoluteUri;
                JObject manifest = new JObject
                {
                    ["version"] = "1.5.3",
                    ["url"] = payloadUrl,
                    ["sha256"] = sha256,
                    ["notes"] = "update-e2e-selftest",
                    ["publishedAt"] = DateTime.UtcNow.ToString("o"),
                };
                File.WriteAllText(manifestPath, manifest.ToString());
                File.WriteAllText(configPath, new JObject
                {
                    ["enabled"] = true,
                    ["manifestUrl"] = new Uri(manifestPath).AbsoluteUri,
                }.ToString());

                string script = "(function(){ try { const d = window.FP && window.FP.desktop;" +
                    " if (!d || typeof d.checkUpdate !== 'function' || typeof d.downloadUpdate !== 'function') return 'no-api';" +
                    " if (!window.__UPDATES__ || typeof window.__UPDATES__.check !== 'function') return 'no-updates-ui';" +
                    " window.__updateBridge = { phase: 'running' };" +
                    " window.confirm = function(){ return true; };" +
                    " (async function(){ try {" +
                    "   const t0 = performance.now();" +
                    "   const check = await window.__UPDATES__.check(true);" +
                    "   const checkMs = Math.round(performance.now() - t0);" +
                    "   const t1 = performance.now();" +
                    "   const download = await d.downloadUpdate();" +
                    "   const downloadMs = Math.round(performance.now() - t1);" +
                    "   window.__updateBridge = { phase: 'done', check: check, checkMs: checkMs, download: download, downloadMs: downloadMs };" +
                    " } catch (e) { window.__updateBridge = { phase: 'error', error: String((e && e.message) || e) }; } })();" +
                    " return 'started'; } catch (e) { return 'error:' + String((e && e.message) || e); } })()";
                var watch = System.Diagnostics.Stopwatch.StartNew();
                string started = await _form.EvalStringAsync(script);
                result["started"] = started;
                if (started != "started")
                {
                    throw new InvalidOperationException("启动更新 UI E2E 失败：" + started);
                }

                JObject state = null;
                while (watch.Elapsed < TimeSpan.FromSeconds(40))
                {
                    string raw = await _form.EvalStringAsync("window.__updateBridge ? JSON.stringify(window.__updateBridge) : ''");
                    if (!string.IsNullOrEmpty(raw))
                    {
                        state = JObject.Parse(raw);
                        string phase = state.Value<string>("phase");
                        if (phase == "done" || phase == "error")
                        {
                            break;
                        }
                    }

                    await Task.Delay(100);
                }

                watch.Stop();
                result["totalMs"] = watch.ElapsedMilliseconds;
                result["state"] = state;
                if (state == null || state.Value<string>("phase") != "done")
                {
                    throw new InvalidOperationException(
                        "更新 UI E2E 未完成：" + (state == null ? "40s 无结果" : (state.Value<string>("error") ?? state.Value<string>("phase"))));
                }

                JObject check = state["check"] as JObject;
                JObject download = state["download"] as JObject;
                int checkMs = state.Value<int?>("checkMs") ?? -1;
                int downloadMs = state.Value<int?>("downloadMs") ?? -1;
                bool checkOk = check != null && check.Value<bool>("ok") && check.Value<bool>("configured") &&
                               check.Value<bool>("hasUpdate") &&
                               (check.Value<string>("latestVersion") == "1.5.3") &&
                               checkMs >= 0 && checkMs < 5000;
                string downloadPath = download == null ? string.Empty : (download.Value<string>("path") ?? string.Empty);
                bool downloadOk = download != null && download.Value<bool>("ok") &&
                                  !download.Value<bool>("autoApplied") &&
                                  downloadMs >= 0 && downloadMs < 5000 &&
                                  File.Exists(downloadPath) &&
                                  new FileInfo(downloadPath).Length == payload.Length;
                JObject checks = new JObject
                {
                    ["checkOk"] = checkOk,
                    ["checkMs"] = checkMs,
                    ["checkConfigured"] = check != null && check.Value<bool>("configured"),
                    ["checkHasUpdate"] = check != null && check.Value<bool>("hasUpdate"),
                    ["checkLatest"] = check == null ? string.Empty : (check.Value<string>("latestVersion") ?? string.Empty),
                    ["downloadOk"] = downloadOk,
                    ["downloadMs"] = downloadMs,
                    ["downloadPath"] = downloadPath,
                    ["downloadBytes"] = download == null ? 0 : (download.Value<int?>("bytes") ?? 0),
                    ["downloadAutoApplied"] = download != null && download.Value<bool>("autoApplied"),
                    ["manual"] = download != null && download.Value<bool>("manual"),
                };
                result["checks"] = checks;
                bool ok = checkOk && downloadOk;
                result["ok"] = ok;
                if (!ok)
                {
                    result["error"] = "更新 UI E2E 校验失败：checkOk=" + checkOk + " downloadOk=" + downloadOk +
                                      " checkMs=" + checkMs + " downloadMs=" + downloadMs;
                }
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = "更新 UI E2E 异常：" + ex.Message;
            }
            finally
            {
                try
                {
                    if (File.Exists(configPath))
                    {
                        File.Delete(configPath);
                    }

                    if (File.Exists(manifestPath))
                    {
                        File.Delete(manifestPath);
                    }

                    if (File.Exists(payloadPath))
                    {
                        File.Delete(payloadPath);
                    }
                }
                catch
                {
                    // ignore
                }
            }

            return result;
        }
    }
}
