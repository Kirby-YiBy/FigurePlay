using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using FigurePlay.Desktop.Bridge;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>
    /// v1.4.2 配置模板外部持久化测试：
    ///   1) JS 桥保存 2 个配置 → 宿主 %OUTDIR%\configs\profiles.json + backups 存在，load 能回读；
    ///   2) 删除（第二次保存只留 1 个）→ 文件同步更新；
    ///   3) 清空 WebView2（selftest 隔离 profile）localStorage 后 reload → 仍从宿主文件恢复；
    ///   4) 新 store 实例重新 Load（模拟重启）可读；
    ///   5) 真实 %APPDATA%\FigurePlay\configs 未被 selftest 写入。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> RunConfigPersistenceTestAsync()
        {
            JObject result = new JObject();
            try
            {
                bool hasApi = await _form.EvalBoolAsync(
                    "!!(window.FP && window.FP.desktop && " +
                    "typeof window.FP.desktop.loadConfigProfiles === 'function' && " +
                    "typeof window.FP.desktop.saveConfigProfiles === 'function')");
                result["available"] = hasApi;
                if (!hasApi)
                {
                    throw new InvalidOperationException(
                        "应用/桥未提供 loadConfigProfiles/saveConfigProfiles，无法测试配置持久化。");
                }

                string outDir = Path.GetFullPath(_options.OutDir);
                string configDir = Path.Combine(outDir, "configs");
                string profilesPath = Path.Combine(configDir, "profiles.json");
                string backupDir = Path.Combine(configDir, "backups");
                string realProfilesPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "FigurePlay",
                    "configs",
                    "profiles.json");
                string realConfigDir = Path.GetDirectoryName(realProfilesPath);
                result["configDir"] = configDir;
                result["profilesPath"] = profilesPath;
                result["backupDir"] = backupDir;
                result["realAppDataProfilesPath"] = realProfilesPath;
                result["configDirIsolated"] =
                    !string.Equals(Path.GetFullPath(configDir), Path.GetFullPath(realConfigDir),
                        StringComparison.OrdinalIgnoreCase);
                string realBefore = SnapshotFile(realProfilesPath);
                result["realAppDataBefore"] = realBefore;

                // 干净的 selftest 配置目录（只删 outDir 自己的 configs，不碰真实 APPDATA）
                if (Directory.Exists(configDir))
                {
                    Directory.Delete(configDir, true);
                }

                string startScript = "(function(){ try { const store = window.FP && window.FP.desktop;" +
                    " if (!store) return 'no-store';" +
                    " window.__cfgPersist = { phase: 'running' };" +
                    " const now = new Date().toISOString();" +
                    " const base = { type: 'figureplay-config', schemaVersion: 1, appVersion: '1.4.2'," +
                    "   createdAt: now, layout: { rows: 2, cols: 3, widthMm: 170, aspectW: 4, aspectH: 3," +
                    "     colGap: -4, rowGap: 1, margin: 0, merges: [] }," +
                    "   label: { position: 'bc', insetMm: 1.5, offsetXmm: 1, offsetYmm: 4 }," +
                    "   export: { format: 'pdf', dpi: 300 } };" +
                    " const profiles = [" +
                    "   Object.assign({}, base, { id: 'cfg-selftest-a', name: 'Selftest 配置 A', description: '持久化自测 A' })," +
                    "   Object.assign({}, base, { id: 'cfg-selftest-b', name: 'Selftest 配置 B', description: '持久化自测 B' })" +
                    " ];" +
                    " (async function(){ try {" +
                    "   const save1 = await store.saveConfigProfiles(profiles);" +
                    "   const load1 = await store.loadConfigProfiles();" +
                    "   const save2 = await store.saveConfigProfiles([profiles[0]]);" +
                    "   const load2 = await store.loadConfigProfiles();" +
                    "   let cleared = false; try { localStorage.clear(); cleared = true; } catch (e) {}" +
                    "   window.__cfgPersist = { phase: 'saved', save1: save1, load1: load1, save2: save2," +
                    "     load2: load2, cleared: cleared, count1: (load1.profiles || []).length," +
                    "     count2: (load2.profiles || []).length };" +
                    " } catch (e) { window.__cfgPersist = { phase: 'error', error: String((e && e.message) || e) }; } })();" +
                    " return 'started'; } catch (e) { return 'error:' + String((e && e.message) || e); } })()";

                Stopwatch watch = Stopwatch.StartNew();
                string started = await _form.EvalStringAsync(startScript);
                result["started"] = started;
                if (started != "started")
                {
                    throw new InvalidOperationException("启动配置持久化测试失败：" + started);
                }

                JObject persist = null;
                while (watch.Elapsed < TimeSpan.FromSeconds(60))
                {
                    string raw = await _form.EvalStringAsync("window.__cfgPersist ? JSON.stringify(window.__cfgPersist) : ''");
                    if (!string.IsNullOrEmpty(raw))
                    {
                        persist = JObject.Parse(raw);
                        string phase = persist.Value<string>("phase");
                        if (phase == "saved" || phase == "error")
                        {
                            break;
                        }
                    }

                    await Task.Delay(100);
                }

                watch.Stop();
                result["saveMs"] = watch.ElapsedMilliseconds;
                if (persist == null)
                {
                    throw new InvalidOperationException("配置保存/读取 60 秒内未完成。");
                }

                result["persist"] = persist;
                if (persist.Value<string>("phase") != "saved")
                {
                    throw new InvalidOperationException(
                        "配置持久化 JS 失败：" + (persist.Value<string>("error") ?? "未知"));
                }

                JObject save1 = persist["save1"] as JObject;
                JObject save2 = persist["save2"] as JObject;
                JObject load1 = persist["load1"] as JObject;
                JObject load2 = persist["load2"] as JObject;
                JObject checks = new JObject();
                result["checks"] = checks;
                bool save1Ok = save1 != null && save1.Value<bool>("ok");
                bool save2Ok = save2 != null && save2.Value<bool>("ok");
                bool load1Ok = load1 != null && load1.Value<bool>("ok");
                bool load2Ok = load2 != null && load2.Value<bool>("ok");
                int count1 = persist.Value<int?>("count1") ?? 0;
                int count2 = persist.Value<int?>("count2") ?? 0;
                string responsePath = save1 == null ? string.Empty : (save1.Value<string>("path") ?? string.Empty);
                string responseBackup = save2 == null ? string.Empty : (save2.Value<string>("backupPath") ?? string.Empty);
                checks["saveFirstOk"] = save1Ok;
                checks["saveSecondOk"] = save2Ok;
                checks["loadFirstOk"] = load1Ok;
                checks["loadSecondOk"] = load2Ok;
                checks["loadFirstCount"] = count1;
                checks["loadSecondCount"] = count2;
                checks["responsePath"] = responsePath;
                checks["responseBackupPath"] = responseBackup;
                checks["localStorageCleared"] = persist.Value<bool>("cleared");

                if (!save1Ok || !load1Ok || count1 != 2)
                {
                    throw new InvalidOperationException(
                        "首次保存/读取失败：save1=" + save1Ok + " load1=" + load1Ok + " count1=" + count1);
                }

                if (!save2Ok || !load2Ok || count2 != 1)
                {
                    throw new InvalidOperationException(
                        "删除后的保存/读取失败：save2=" + save2Ok + " load2=" + load2Ok + " count2=" + count2);
                }

                if (!string.Equals(Path.GetFullPath(responsePath), Path.GetFullPath(profilesPath),
                        StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("保存响应 path 与隔离目录不一致：" + responsePath);
                }

                bool fileExists = File.Exists(profilesPath);
                int fileProfileCount = -1;
                string fileError;
                JArray fileProfiles;
                bool fileLoadOk = new ConfigProfileStore(true, outDir).Load(out fileProfiles, out bool existsFlag, out fileError);
                if (fileLoadOk)
                {
                    fileProfileCount = fileProfiles.Count;
                }

                checks["fileExists"] = fileExists;
                checks["fileLoadOk"] = fileLoadOk;
                checks["fileProfileCount"] = fileProfileCount;
                checks["fileError"] = fileError ?? string.Empty;
                string[] backups = Directory.Exists(backupDir)
                    ? Directory.GetFiles(backupDir, "profiles-*.json")
                    : new string[0];
                checks["backupCount"] = backups.Length;
                checks["backupFirst"] = backups.Length > 0 ? Path.GetFileName(backups[0]) : string.Empty;
                bool backupExists = backups.Length > 0;
                bool backupResponseExists = !string.IsNullOrEmpty(responseBackup) && File.Exists(responseBackup);

                if (!fileExists || !fileLoadOk || fileProfileCount != 1)
                {
                    throw new InvalidOperationException(
                        "宿主 profiles.json 校验失败：exists=" + fileExists + " loadOk=" + fileLoadOk +
                        " count=" + fileProfileCount + " error=" + (fileError ?? "无"));
                }

                if (!backupExists)
                {
                    throw new InvalidOperationException("保存第二次后 backups 目录没有时间戳备份文件。");
                }

                checks["backupResponseExists"] = backupResponseExists;
                checks["backupResponseMatches"] = string.IsNullOrEmpty(responseBackup) ||
                                                  string.Equals(Path.GetFullPath(responseBackup),
                                                      Path.GetFullPath(backups[0]), StringComparison.OrdinalIgnoreCase) ||
                                                  backupResponseExists;

                // 模拟升级/重启：清 WebView2 selftest localStorage 后 reload，再从宿主文件恢复
                await _form.EvalStringAsync("location.reload()");
                bool reloaded = await WaitForAppReadyAfterReloadAsync(TimeSpan.FromSeconds(60));
                checks["reloaded"] = reloaded;
                if (!reloaded)
                {
                    throw new InvalidOperationException("reload 后 60 秒内应用未就绪。");
                }

                await Task.Delay(1500);
                string afterReloadScript = "(function(){ try { const store = window.FP && window.FP.desktop;" +
                    " if (!store) return 'no-store';" +
                    " window.__cfgAfterReload = { phase: 'running' };" +
                    " (async function(){ try {" +
                    "   const res = await store.loadConfigProfiles();" +
                    "   const hint = document.getElementById('config-storage-hint');" +
                    "   window.__cfgAfterReload = { phase: 'done', ok: !!(res && res.ok)," +
                    "     count: (res && res.profiles ? res.profiles.length : 0)," +
                    "     ids: (res && res.profiles ? res.profiles.map(function(p){ return p.id; }) : [])," +
                    "     path: (res && res.path) || '', hint: hint ? String(hint.textContent || '') : '' };" +
                    " } catch (e) { window.__cfgAfterReload = { phase: 'error', error: String((e && e.message) || e) }; } })();" +
                    " return 'started'; } catch (e) { return 'error:' + String((e && e.message) || e); } })()";
                string afterStarted = await _form.EvalStringAsync(afterReloadScript);
                JObject afterReload = null;
                Stopwatch afterWatch = Stopwatch.StartNew();
                while (afterWatch.Elapsed < TimeSpan.FromSeconds(30))
                {
                    string raw = await _form.EvalStringAsync("window.__cfgAfterReload ? JSON.stringify(window.__cfgAfterReload) : ''");
                    if (!string.IsNullOrEmpty(raw))
                    {
                        afterReload = JObject.Parse(raw);
                        if (afterReload.Value<string>("phase") == "done" ||
                            afterReload.Value<string>("phase") == "error")
                        {
                            break;
                        }
                    }

                    await Task.Delay(100);
                }

                checks["afterReloadStarted"] = afterStarted;
                checks["afterReload"] = afterReload;
                bool recovered = afterReload != null &&
                                 afterReload.Value<string>("phase") == "done" &&
                                 afterReload.Value<bool>("ok") &&
                                 afterReload.Value<int?>("count") >= 1;
                checks["reloadRecovered"] = recovered;
                if (!recovered)
                {
                    throw new InvalidOperationException("reload 后未能从宿主文件恢复配置。");
                }

                string hintText = afterReload.Value<string>("hint") ?? string.Empty;
                checks["appStorageHint"] = Shorten(hintText, 300);
                bool hintOk = hintText.IndexOf("configs", StringComparison.OrdinalIgnoreCase) >= 0 ||
                              hintText.IndexOf("本机配置", StringComparison.Ordinal) >= 0;
                checks["appStorageHintOk"] = hintOk;

                // 真实 APPDATA 未被写入
                string realAfter = SnapshotFile(realProfilesPath);
                checks["realAppDataAfter"] = realAfter;
                bool realUntouched = string.Equals(realBefore, realAfter, StringComparison.Ordinal);
                checks["realAppDataUntouched"] = realUntouched;

                bool ok = result.Value<bool>("configDirIsolated") &&
                          save1Ok && save2Ok && load1Ok && load2Ok &&
                          count1 == 2 && count2 == 1 &&
                          fileExists && fileLoadOk && fileProfileCount == 1 &&
                          backupExists && recovered && hintOk && realUntouched;
                result["ok"] = ok;
                if (!ok)
                {
                    List<string> problems = new List<string>();
                    if (!result.Value<bool>("configDirIsolated"))
                    {
                        problems.Add("selftest 未使用隔离目录");
                    }

                    if (!backupExists)
                    {
                        problems.Add("缺少备份文件");
                    }

                    if (!recovered)
                    {
                        problems.Add("reload 后未恢复");
                    }

                    if (!hintOk)
                    {
                        problems.Add("应用配置模块未显示本机路径");
                    }

                    if (!realUntouched)
                    {
                        problems.Add("真实 APPDATA 被测试写入");
                    }

                    result["error"] = string.Join("；", problems.ToArray());
                }
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = ex.Message;
            }

            return result;
        }

        private async Task<bool> WaitForAppReadyAfterReloadAsync(TimeSpan timeout)
        {
            Stopwatch watch = Stopwatch.StartNew();
            while (watch.Elapsed < timeout)
            {
                try
                {
                    bool ready = await _form.EvalBoolAsync(
                        "!!(window.__FIGPLAY__ && window.__FIGPLAY__.ready === true && window.FP && window.FP.desktop)");
                    if (ready)
                    {
                        return true;
                    }
                }
                catch
                {
                    // 导航过程中 Eval 可能失败，继续等待
                }

                await Task.Delay(250);
            }

            return false;
        }

        private static string SnapshotFile(string path)
        {
            try
            {
                if (!File.Exists(path))
                {
                    return "absent";
                }

                FileInfo info = new FileInfo(path);
                return "exists:" + info.Length + ":" + info.LastWriteTimeUtc.ToString("o");
            }
            catch (Exception ex)
            {
                return "error:" + ex.Message;
            }
        }
    }
}
