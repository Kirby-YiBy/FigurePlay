using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>
    /// v1.5.1 真实 WebView2 桥 E2E：直接调用冻结 desktop.js 的 FP.desktop.saveFile()，
    /// 覆盖工程(.figureplay-project)/配置(.json)/PNG(.png) 三种导出，验证 file-saved 回包让
    /// Promise 立即 resolve（不得落到 180s 超时）；selftest 模式下宿主自动写隔离 outDir\save-file。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> RunSaveFileBridgeE2ETestAsync()
        {
            JObject result = new JObject();
            try
            {
                string outDir = Path.GetFullPath(_options.OutDir);
                string saveDir = Path.Combine(outDir, "save-file");
                byte[] projectBytes = Encoding.UTF8.GetBytes("{\"schema\":\"figureplay-project\",\"version\":1,\"name\":\"bridge-project\",\"cells\":[]}");
                byte[] configBytes = Encoding.UTF8.GetBytes("{\"schema\":\"figureplay-config\",\"version\":1,\"name\":\"bridge-config\"}");
                byte[] pngBytes = Convert.FromBase64String(
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
                JArray cases = new JArray
                {
                    new JObject
                    {
                        ["key"] = "project",
                        ["suggestedName"] = "bridge-工程.figureplay-project",
                        ["filterName"] = "FigurePlay 工程",
                        ["filterExtensions"] = new JArray(".figureplay-project"),
                        ["base64"] = Convert.ToBase64String(projectBytes),
                        ["expectedBytes"] = projectBytes.Length,
                        ["expectedExt"] = ".figureplay-project",
                    },
                    new JObject
                    {
                        ["key"] = "config",
                        ["suggestedName"] = "bridge-配置.json",
                        ["filterName"] = "FigurePlay 配置",
                        ["filterExtensions"] = new JArray(".json"),
                        ["base64"] = Convert.ToBase64String(configBytes),
                        ["expectedBytes"] = configBytes.Length,
                        ["expectedExt"] = ".json",
                    },
                    new JObject
                    {
                        ["key"] = "png",
                        ["suggestedName"] = "bridge-图片.png",
                        ["filterName"] = "PNG 图片",
                        ["filterExtensions"] = new JArray(".png"),
                        ["base64"] = Convert.ToBase64String(pngBytes),
                        ["expectedBytes"] = pngBytes.Length,
                        ["expectedExt"] = ".png",
                    },
                };

                string casesJson = cases.ToString(Newtonsoft.Json.Formatting.None);
                string script = "(function(){ const d = window.FP && window.FP.desktop;" +
                    " if (!d || typeof d.saveFile !== 'function') return 'no-api';" +
                    " window.__saveFileBridge = { phase: 'running' };" +
                    " const cases = " + casesJson + ";" +
                    " (async function(){ try { const results = [];" +
                    "   for (const c of cases) {" +
                    "     const t0 = performance.now();" +
                    "     const r = await d.saveFile({ suggestedName: c.suggestedName, filterName: c.filterName, filterExtensions: c.filterExtensions, base64: c.base64 });" +
                    "     const elapsed = Math.round(performance.now() - t0);" +
                    "     results.push({ key: c.key, ok: !!(r && r.ok), canceled: !!(r && r.canceled)," +
                    "       path: (r && r.path) || '', bytes: (r && r.bytes) || 0, error: (r && r.error) || '', elapsedMs: elapsed });" +
                    "   }" +
                    "   window.__saveFileBridge = { phase: 'done', results: results };" +
                    " } catch (e) { window.__saveFileBridge = { phase: 'error', error: String((e && e.message) || e) }; } })();" +
                    " return 'started'; })()";

                Stopwatch watch = Stopwatch.StartNew();
                string started = await _form.EvalStringAsync(script);
                result["started"] = started;
                if (started != "started")
                {
                    throw new InvalidOperationException("启动 saveFile 桥 E2E 失败：" + started);
                }

                JObject state = null;
                while (watch.Elapsed < TimeSpan.FromSeconds(30))
                {
                    string raw = await _form.EvalStringAsync("window.__saveFileBridge ? JSON.stringify(window.__saveFileBridge) : ''");
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
                        "saveFile 桥 E2E 未完成：" + (state == null ? "30s 无结果" : (state.Value<string>("error") ?? state.Value<string>("phase"))));
                }

                JArray results = state["results"] as JArray;
                if (results == null || results.Count != 3)
                {
                    throw new InvalidOperationException("saveFile 桥 E2E 结果数量不是 3。");
                }

                JObject checks = new JObject();
                result["checks"] = checks;
                JArray detail = new JArray();
                bool ok = true;
                for (int i = 0; i < 3; i++)
                {
                    JObject item = results[i] as JObject;
                    JObject expected = cases[i] as JObject;
                    if (item == null || expected == null)
                    {
                        ok = false;
                        continue;
                    }

                    string key = expected.Value<string>("key");
                    string path = item.Value<string>("path") ?? string.Empty;
                    int expectedBytes = expected.Value<int>("expectedBytes");
                    string expectedExt = expected.Value<string>("expectedExt");
                    bool itemOk = item.Value<bool>("ok") &&
                                  !item.Value<bool>("canceled") &&
                                  item.Value<int?>("bytes") == expectedBytes &&
                                  (item.Value<int?>("elapsedMs") ?? 99999) < 5000 &&
                                  File.Exists(path) &&
                                  new FileInfo(path).Length == expectedBytes &&
                                  path.EndsWith(expectedExt, StringComparison.OrdinalIgnoreCase) &&
                                  path.StartsWith(Path.GetFullPath(saveDir) + Path.DirectorySeparatorChar,
                                      StringComparison.OrdinalIgnoreCase);
                    ok = ok && itemOk;
                    JObject entry = new JObject
                    {
                        ["key"] = key,
                        ["ok"] = itemOk,
                        ["path"] = path,
                        ["bytes"] = item.Value<int?>("bytes") ?? 0,
                        ["elapsedMs"] = item.Value<int?>("elapsedMs") ?? -1,
                        ["error"] = item.Value<string>("error") ?? string.Empty,
                    };
                    detail.Add(entry);
                    checks[key] = entry;
                }

                result["items"] = detail;
                result["ok"] = ok;
                if (!ok)
                {
                    result["error"] = "saveFile 桥 E2E 有用例失败（ok/canceled/bytes/elapsed<5s/path/extension）。";
                }
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = "saveFile 桥 E2E 异常：" + ex.Message;
            }

            return result;
        }
    }
}
