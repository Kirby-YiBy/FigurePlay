using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>
    /// v1.3.4 外观主题 WebView2 冒烟：
    ///   1) setAppearance('light','blue') → 浅色基准 + PNG 导出基准；
    ///   2) setAppearance('dark','blue') → html[data-theme=dark]/data-accent=violet、body 深色、
    ///      #figure-shell 仍为白色；PNG 导出与浅色逐字节一致（主题不影响导出）；
    ///   3) 恢复 light/blue，属性/背景/导出与基准一致；console error 不增加。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> RunAppearanceSmokeTestAsync()
        {
            JObject result = new JObject();
            try
            {
                bool hasApi = await _form.EvalBoolAsync(
                    "!!(window.__FIGPLAY__ && typeof window.__FIGPLAY__.setAppearance === 'function' && " +
                    "typeof window.__FIGPLAY__.exportBase64 === 'function')");
                result["available"] = hasApi;
                if (!hasApi)
                {
                    throw new InvalidOperationException(
                        "应用未提供 setAppearance/exportBase64，无法做主题冒烟。");
                }

                string startScript = "(function(){ try { const FP = window.__FIGPLAY__;" +
                    " if (!FP || typeof FP.setAppearance !== 'function') return 'no-api';" +
                    " if (typeof FP.exportBase64 !== 'function') return 'no-export';" +
                    " window.__appearanceSmoke = null;" +
                    " const collect = function() {" +
                    "   const html = document.documentElement;" +
                    "   const parse = function(v) {" +
                    "     const m = String(v || '').match(/rgba?\\(([^)]+)\\)/);" +
                    "     if (!m) return null;" +
                    "     const p = m[1].split(',').map(function(x){ return parseFloat(x); });" +
                    "     return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };" +
                    "   };" +
                    "   const bodyStyle = getComputedStyle(document.body);" +
                    "   const shell = document.getElementById('figure-shell');" +
                    "   const shellStyle = shell ? getComputedStyle(shell) : null;" +
                    "   return {" +
                    "     dataTheme: html.getAttribute('data-theme')," +
                    "     dataAccent: html.getAttribute('data-accent')," +
                    "     dataThemeMode: html.getAttribute('data-theme-mode')," +
                    "     bodyBg: parse(bodyStyle.backgroundColor)," +
                    "     bodyColor: parse(bodyStyle.color)," +
                    "     shellBg: shellStyle ? parse(shellStyle.backgroundColor) : null," +
                    "     shellExists: !!shell," +
                    "     appearance: (typeof FP.getAppearance === 'function') ? FP.getAppearance() : null" +
                    "   };" +
                    " };" +
                    " const errorsBefore = (window.__figplayConsoleErrors || []).length;" +
                    " FP.setAppearance('light', 'blue');" +
                    " setTimeout(function(){ try {" +
                    "   const out = {};" +
                    "   out.light = collect();" +
                    "   FP.exportBase64('png', { dpi: 200 }).then(function(light) {" +
                    "     out.lightPngLength = String(light.base64 || '').length;" +
                    "     const setReturn = FP.setAppearance('dark', 'blue');" +
                    "     out.setReturn = setReturn;" +
                    "     setTimeout(function(){ try {" +
                    "       out.dark = collect();" +
                    "       FP.exportBase64('png', { dpi: 200 }).then(function(dark) {" +
                    "         out.darkPngLength = String(dark.base64 || '').length;" +
                    "         out.pngEqualDark = String(light.base64 || '') === String(dark.base64 || '');" +
                    "         FP.setAppearance('light', 'blue');" +
                    "         setTimeout(function(){ try {" +
                    "           out.restored = collect();" +
                    "           FP.exportBase64('png', { dpi: 200 }).then(function(restored) {" +
                    "             out.restoredPngLength = String(restored.base64 || '').length;" +
                    "             out.pngEqualRestored = String(light.base64 || '') === String(restored.base64 || '');" +
                    "             out.consoleErrorDelta = (window.__figplayConsoleErrors || []).length - errorsBefore;" +
                    "             window.__appearanceSmoke = JSON.stringify(out);" +
                    "           }).catch(function(e){ window.__appearanceSmoke = JSON.stringify({ error: 'restored export: ' + String((e && e.message) || e) }); });" +
                    "         } catch (e) { window.__appearanceSmoke = JSON.stringify({ error: 'restore: ' + String(e) }); } }, 80);" +
                    "       }).catch(function(e){ window.__appearanceSmoke = JSON.stringify({ error: 'dark export: ' + String((e && e.message) || e) }); });" +
                    "     } catch (e) { window.__appearanceSmoke = JSON.stringify({ error: 'dark: ' + String(e) }); } }, 80);" +
                    "   }).catch(function(e){ window.__appearanceSmoke = JSON.stringify({ error: 'light export: ' + String((e && e.message) || e) }); });" +
                    " } catch (e) { window.__appearanceSmoke = JSON.stringify({ error: String((e && e.message) || e) }); } }, 80);" +
                    " return 'started';" +
                    " } catch (e) { return 'error:' + String((e && e.message) || e); } })()";

                Stopwatch watch = Stopwatch.StartNew();
                string started = await _form.EvalStringAsync(startScript);
                result["started"] = started;
                if (started != "started")
                {
                    throw new InvalidOperationException("启动主题冒烟失败：" + started);
                }

                string raw = null;
                while (watch.Elapsed < TimeSpan.FromSeconds(120))
                {
                    raw = await _form.EvalStringAsync("window.__appearanceSmoke || ''");
                    if (!string.IsNullOrEmpty(raw))
                    {
                        break;
                    }

                    await Task.Delay(150);
                }

                watch.Stop();
                result["elapsedMs"] = watch.ElapsedMilliseconds;
                if (string.IsNullOrEmpty(raw))
                {
                    throw new InvalidOperationException("主题冒烟 120 秒内未完成。");
                }

                JObject data = JObject.Parse(raw);
                result["data"] = data;
                if (data["error"] != null)
                {
                    throw new InvalidOperationException("主题冒烟 JS 异常：" + data.Value<string>("error"));
                }

                JObject light = data["light"] as JObject;
                JObject dark = data["dark"] as JObject;
                JObject restored = data["restored"] as JObject;
                JObject setReturn = data["setReturn"] as JObject;
                if (light == null || dark == null || restored == null)
                {
                    throw new InvalidOperationException("主题冒烟返回数据不完整。");
                }

                JObject checks = new JObject();
                result["checks"] = checks;

                JObject lightCheck = BuildAppearanceCheck(light, "light", "blue", true, "浅色基准");
                JObject darkCheck = BuildAppearanceCheck(dark, "dark", "blue", false, "深色+violet");
                JObject restoredCheck = BuildAppearanceCheck(restored, "light", "blue", true, "恢复浅色");
                checks["light"] = lightCheck;
                checks["dark"] = darkCheck;
                checks["restored"] = restoredCheck;

                if (!lightCheck.Value<bool>("ok"))
                {
                    throw new InvalidOperationException("浅色基准外观不符：" + (lightCheck.Value<string>("error") ?? "未知"));
                }

                if (!darkCheck.Value<bool>("ok"))
                {
                    throw new InvalidOperationException("深色外观不符：" + (darkCheck.Value<string>("error") ?? "未知"));
                }

                if (!restoredCheck.Value<bool>("ok"))
                {
                    throw new InvalidOperationException("恢复浅色外观不符：" + (restoredCheck.Value<string>("error") ?? "未知"));
                }

                checks["setReturn"] = setReturn;
                checks["setReturnTheme"] = setReturn == null ? string.Empty : setReturn.Value<string>("theme");
                checks["setReturnAccent"] = setReturn == null ? string.Empty : setReturn.Value<string>("accent");

                bool pngEqualDark = data.Value<bool>("pngEqualDark");
                bool pngEqualRestored = data.Value<bool>("pngEqualRestored");
                int consoleDelta = data.Value<int?>("consoleErrorDelta") ?? 0;
                checks["lightPngLength"] = data.Value<int?>("lightPngLength") ?? 0;
                checks["darkPngLength"] = data.Value<int?>("darkPngLength") ?? 0;
                checks["restoredPngLength"] = data.Value<int?>("restoredPngLength") ?? 0;
                checks["pngEqualDark"] = pngEqualDark;
                checks["pngEqualRestored"] = pngEqualRestored;
                checks["consoleErrorDelta"] = consoleDelta;

                if (!pngEqualDark)
                {
                    throw new InvalidOperationException("深色主题下 PNG 导出与浅色不一致（主题影响了导出）。");
                }

                if (!pngEqualRestored)
                {
                    throw new InvalidOperationException("恢复浅色后 PNG 导出与基准不一致。");
                }

                if (consoleDelta != 0)
                {
                    throw new InvalidOperationException("主题切换产生 " + consoleDelta + " 条 console error。");
                }

                result["ok"] = true;
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = ex.Message;
                try
                {
                    await _form.EvalStringAsync(
                        "(function(){ try { window.__FIGPLAY__.setAppearance('light','blue'); return 'ok'; } catch (e) { return 'err'; } })()");
                }
                catch
                {
                    // ignore
                }
            }

            return result;
        }

        private static JObject BuildAppearanceCheck(
            JObject info,
            string expectedTheme,
            string expectedAccent,
            bool expectLightBody,
            string label)
        {
            JObject check = new JObject();
            check["label"] = label;
            string dataTheme = info.Value<string>("dataTheme");
            string dataAccent = info.Value<string>("dataAccent");
            string dataThemeMode = info.Value<string>("dataThemeMode");
            JObject bodyBg = info["bodyBg"] as JObject;
            JObject shellBg = info["shellBg"] as JObject;
            bool shellExists = info.Value<bool>("shellExists");
            check["dataTheme"] = dataTheme;
            check["dataAccent"] = dataAccent;
            check["dataThemeMode"] = dataThemeMode;
            check["bodyBg"] = bodyBg;
            check["shellBg"] = shellBg;
            check["shellExists"] = shellExists;

            bool bodyLuminanceOk = false;
            double luminance = 0;
            if (bodyBg != null)
            {
                double r = bodyBg.Value<double>("r");
                double g = bodyBg.Value<double>("g");
                double b = bodyBg.Value<double>("b");
                luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                bodyLuminanceOk = expectLightBody ? luminance >= 180 : luminance <= 110;
            }

            check["bodyLuminance"] = Math.Round(luminance, 1);
            check["bodyLuminanceOk"] = bodyLuminanceOk;

            bool shellWhite = false;
            if (shellBg != null)
            {
                double r = shellBg.Value<double>("r");
                double g = shellBg.Value<double>("g");
                double b = shellBg.Value<double>("b");
                shellWhite = r >= 245 && g >= 245 && b >= 245;
            }

            check["shellWhite"] = shellWhite;

            bool themeOk = string.Equals(dataTheme, expectedTheme, StringComparison.Ordinal) &&
                           string.Equals(dataAccent, expectedAccent, StringComparison.Ordinal);
            check["themeOk"] = themeOk;
            bool ok = themeOk && bodyLuminanceOk && shellWhite && shellExists;
            check["ok"] = ok;
            if (!ok)
            {
                List<string> problems = new List<string>();
                if (!themeOk)
                {
                    problems.Add("data-theme/data-accent 期望 " + expectedTheme + "/" + expectedAccent +
                                 "，实际 " + dataTheme + "/" + dataAccent);
                }

                if (!bodyLuminanceOk)
                {
                    problems.Add("body 背景亮度不符（" + Math.Round(luminance, 1) + "）");
                }

                if (!shellWhite)
                {
                    problems.Add("figure-shell 背景不是白色");
                }

                if (!shellExists)
                {
                    problems.Add("#figure-shell 不存在");
                }

                check["error"] = string.Join("；", problems.ToArray());
            }

            return check;
        }
    }
}
