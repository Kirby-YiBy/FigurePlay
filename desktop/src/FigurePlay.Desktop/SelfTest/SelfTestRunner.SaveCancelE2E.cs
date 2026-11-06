using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>
    /// v1.5.2 真实 WebView2 保存取消 E2E：用冻结 app 的 __PROJECT_FILES__.save / __CONFIG_PROFILES__.exportProfile /
    /// __DIAG_LOGS__.export，先 stub FP.desktop.saveFile 返回 canceled，验证绝不回退 showSaveFilePicker/download；
    /// 再恢复真实宿主桥，验证成功路径写入隔离 outDir\save-file（工程/配置/日志各一次）。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> RunSaveCancelBridgeE2ETestAsync()
        {
            JObject result = new JObject();
            string outDir = Path.GetFullPath(_options.OutDir);
            string saveDir = Path.Combine(outDir, "save-file");
            try
            {
                Directory.CreateDirectory(saveDir);
                string script = @"(function(){ try {
  const d = window.FP && window.FP.desktop;
  if (!d || typeof d.saveFile !== 'function') return 'no-api';
  if (!window.__PROJECT_FILES__ || !window.__CONFIG_PROFILES__ || !window.__DIAG_LOGS__) return 'no-app-api';
  window.__saveCancelE2E = { phase: 'running' };
  const origSaveFile = d.saveFile;
  const origPicker = window.showSaveFilePicker;
  const origDownload = window.FP.downloadBlob;
  const counts = { picker: 0, download: 0 };
  (async function(){ try {
    // ---- 取消路径：宿主回 canceled，App 不得回退 picker/download ----
    d.saveFile = function () { return Promise.resolve({ ok: false, canceled: true, path: '', bytes: 0, error: '已取消保存。' }); };
    window.showSaveFilePicker = function () { counts.picker++; return Promise.reject(new Error('cancel')); };
    window.FP.downloadBlob = function () { counts.download++; };
    const projectCancel = await window.__PROJECT_FILES__.save();
    await window.__DIAG_LOGS__.export();
    let configCancel = null;
    let profile = null;
    try {
      const nameEl = document.getElementById('config-name');
      const descEl = document.getElementById('config-desc');
      if (nameEl) nameEl.value = 'E2E 取消测试配置';
      if (descEl) descEl.value = 'save cancel e2e';
      await window.__CONFIG_PROFILES__.saveCurrent();
      const list = window.__CONFIG_PROFILES__.list();
      profile = list && list.length ? list[list.length - 1] : null;
      if (profile) configCancel = await window.__CONFIG_PROFILES__.exportProfile(profile);
    } catch (e) { configCancel = 'error:' + String((e && e.message) || e); }
    const cancelCounts = { picker: counts.picker, download: counts.download };

    // ---- 成功路径：恢复真实宿主 saveFile，写隔离目录 ----
    d.saveFile = origSaveFile;
    window.showSaveFilePicker = origPicker;
    window.FP.downloadBlob = origDownload;
    const projectOk = await window.__PROJECT_FILES__.save();
    await window.__DIAG_LOGS__.export();
    let configOk = null;
    if (profile) configOk = await window.__CONFIG_PROFILES__.exportProfile(profile);
    window.__saveCancelE2E = { phase: 'done', projectCancel: projectCancel === false,
      cancelCounts: cancelCounts, projectOk: !!projectOk, configCancel: configCancel,
      configOk: !!configOk, hasProfile: !!profile };
  } catch (e) { window.__saveCancelE2E = { phase: 'error', error: String((e && e.message) || e) }; } })();
  return 'started'; } catch (e) { return 'error:' + String((e && e.message) || e); } })()";
                string started = await _form.EvalStringAsync(script);
                result["started"] = started;
                if (started != "started")
                {
                    throw new InvalidOperationException("启动保存取消 E2E 失败：" + started);
                }

                JObject state = null;
                for (int i = 0; i < 300; i++)
                {
                    string raw = await _form.EvalStringAsync("window.__saveCancelE2E ? JSON.stringify(window.__saveCancelE2E) : ''");
                    if (!string.IsNullOrEmpty(raw))
                    {
                        state = JObject.Parse(raw);
                        string phase = state.Value<string>("phase") ?? string.Empty;
                        if (phase == "done" || phase == "error")
                        {
                            break;
                        }
                    }

                    await Task.Delay(100);
                }

                result["state"] = state;
                if (state == null || state.Value<string>("phase") != "done")
                {
                    throw new InvalidOperationException(
                        "保存取消 E2E 未完成：" + (state == null ? "30s 无结果" : (state.Value<string>("error") ?? state.Value<string>("phase"))));
                }

                JObject counts = state["cancelCounts"] as JObject ?? new JObject();
                bool projectCancel = state.Value<bool>("projectCancel");
                JToken configCancelToken = state["configCancel"];
                bool configCancelOk = configCancelToken == null ||
                                      configCancelToken.Type == JTokenType.Null ||
                                      (configCancelToken.Type == JTokenType.Boolean && configCancelToken.Value<bool>() == false);
                bool cancelNoFallback = counts.Value<int?>("picker") == 0 && counts.Value<int?>("download") == 0;
                bool successOk = state.Value<bool>("projectOk") && state.Value<bool>("configOk");

                string[] files = Directory.Exists(saveDir)
                    ? Directory.GetFiles(saveDir)
                    : new string[0];
                bool projectFile = files.Any(f => f.EndsWith(".figureplay-project", StringComparison.OrdinalIgnoreCase));
                bool configFile = files.Any(f => f.EndsWith(".json", StringComparison.OrdinalIgnoreCase));
                bool logFile = files.Any(f => f.EndsWith(".log", StringComparison.OrdinalIgnoreCase));

                JObject checks = new JObject
                {
                    ["projectCancel"] = projectCancel,
                    ["configCancelOk"] = configCancelOk,
                    ["cancelPickerCalls"] = counts.Value<int?>("picker") ?? -1,
                    ["cancelDownloadCalls"] = counts.Value<int?>("download") ?? -1,
                    ["cancelNoFallback"] = cancelNoFallback,
                    ["projectSuccess"] = state.Value<bool>("projectOk"),
                    ["configSuccess"] = state.Value<bool>("configOk"),
                    ["hasProfile"] = state.Value<bool>("hasProfile"),
                    ["projectFile"] = projectFile,
                    ["configFile"] = configFile,
                    ["logFile"] = logFile,
                    ["saveDir"] = saveDir,
                };
                result["checks"] = checks;
                bool ok = projectCancel && configCancelOk && cancelNoFallback &&
                          state.Value<bool>("projectOk") &&
                          (state.Value<bool>("hasProfile") ? state.Value<bool>("configOk") : true) &&
                          projectFile &&
                          (state.Value<bool>("hasProfile") ? configFile : true) &&
                          logFile;
                result["ok"] = ok;
                if (!ok)
                {
                    result["error"] = "保存取消/成功 E2E 校验失败：" + checks.ToString(Newtonsoft.Json.Formatting.None);
                }
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = "保存取消 E2E 异常：" + ex.Message;
            }

            return result;
        }
    }
}
