using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>
    /// v1.5.0 X 关闭提示偏好：prefs.json 隔离路径、记住动作 round-trip、记住后下次启动直接执行；
    /// 并验证自定义对话框（3 按钮 + 记住复选框 + 默认最小化）可正常构造，不弹 UI。
    /// </summary>
    internal sealed partial class SelfTestRunner
    {
        private Task<JObject> RunClosePrefsTestAsync()
        {
            JObject result = new JObject();
            try
            {
                string outDir = Path.GetFullPath(_options.OutDir);
                string realPrefsPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "FigurePlay",
                    "prefs.json");
                string realBefore = SnapshotFile(realPrefsPath);

                DesktopPrefsStore store = new DesktopPrefsStore(true, outDir);
                string expectedPath = Path.Combine(outDir, "prefs.json");
                bool isolated = !string.Equals(
                    Path.GetFullPath(store.PrefsPath),
                    Path.GetFullPath(realPrefsPath),
                    StringComparison.OrdinalIgnoreCase);
                if (File.Exists(store.PrefsPath))
                {
                    File.Delete(store.PrefsPath);
                }

                bool saveMinimize = store.SaveCloseAction(DesktopPrefsStore.ActionMinimize);
                string minimizeAction;
                bool loadMinimize = store.TryGetCloseAction(out minimizeAction) &&
                                    minimizeAction == DesktopPrefsStore.ActionMinimize;
                DesktopPrefsStore secondLaunch = new DesktopPrefsStore(true, outDir);
                string secondAction;
                bool persistedMinimize = secondLaunch.TryGetCloseAction(out secondAction) &&
                                         secondAction == DesktopPrefsStore.ActionMinimize;

                bool saveExit = store.SaveCloseAction(DesktopPrefsStore.ActionExit);
                string exitAction;
                bool loadExit = store.TryGetCloseAction(out exitAction) &&
                                exitAction == DesktopPrefsStore.ActionExit;
                bool fileExists = File.Exists(store.PrefsPath);

                int buttonCount = 0;
                bool defaultMinimize = false;
                bool rememberCheckbox = false;
                List<string> buttonTexts = new List<string>();
                using (CloseConfirmDialog dialog = new CloseConfirmDialog())
                {
                    foreach (Control control in dialog.Controls)
                    {
                        Button button = control as Button;
                        if (button != null)
                        {
                            buttonCount++;
                            buttonTexts.Add(button.Text);
                        }

                        if (control is CheckBox)
                        {
                            rememberCheckbox = true;
                        }
                    }

                    defaultMinimize = dialog.AcceptButton is Button &&
                                      ((Button)dialog.AcceptButton).Text.IndexOf("最小化", StringComparison.Ordinal) >= 0;
                    result["dialogTitle"] = dialog.Text;
                }

                string realAfter = SnapshotFile(realPrefsPath);
                bool realUntouched = string.Equals(realBefore, realAfter, StringComparison.Ordinal);
                result["prefsPath"] = store.PrefsPath;
                result["expectedPath"] = expectedPath;
                result["realPrefsPath"] = realPrefsPath;
                result["isolated"] = isolated;
                result["saveMinimize"] = saveMinimize;
                result["loadMinimize"] = loadMinimize;
                result["persistedMinimize"] = persistedMinimize;
                result["saveExit"] = saveExit;
                result["loadExit"] = loadExit;
                result["fileExists"] = fileExists;
                result["buttonCount"] = buttonCount;
                result["buttonTexts"] = new JArray(buttonTexts.ToArray());
                result["defaultMinimize"] = defaultMinimize;
                result["rememberCheckbox"] = rememberCheckbox;
                result["realPrefsUntouched"] = realUntouched;

                bool ok = isolated &&
                          saveMinimize && loadMinimize && persistedMinimize &&
                          saveExit && loadExit && fileExists &&
                          buttonCount == 3 && defaultMinimize && rememberCheckbox &&
                          realUntouched;
                result["ok"] = ok;
                if (!ok)
                {
                    result["error"] = "关闭偏好/对话框校验失败：isolated=" + isolated +
                                      " saveMin=" + saveMinimize + " loadMin=" + loadMinimize +
                                      " persisted=" + persistedMinimize +
                                      " saveExit=" + saveExit + " loadExit=" + loadExit +
                                      " buttons=" + buttonCount + " defaultMin=" + defaultMinimize +
                                      " remember=" + rememberCheckbox + " realUntouched=" + realUntouched;
                }
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = "关闭提示偏好测试异常：" + ex.Message;
            }

            return Task.FromResult(result);
        }
    }
}
