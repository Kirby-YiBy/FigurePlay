using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop
{
    /// <summary>
    /// v1.5.0 关闭行为偏好（WinForms）：持久化到 %APPDATA%\FigurePlay\prefs.json；
    /// selftest 模式使用 &lt;outDir&gt;\prefs.json 隔离，不写真实 APPDATA。
    /// </summary>
    internal sealed class DesktopPrefsStore
    {
        public const string ActionMinimize = "minimize";
        public const string ActionExit = "exit";

        public DesktopPrefsStore(bool selfTest, string outDir)
        {
            PrefsPath = selfTest
                ? Path.Combine(string.IsNullOrEmpty(outDir) ? AppPaths.ExeDir : outDir, "prefs.json")
                : Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "FigurePlay",
                    "prefs.json");
        }

        public string PrefsPath { get; private set; }

        public bool TryGetCloseAction(out string action)
        {
            action = null;
            try
            {
                if (!File.Exists(PrefsPath))
                {
                    return false;
                }

                JObject json = JObject.Parse(File.ReadAllText(PrefsPath));
                string value = (json.Value<string>("closeAction") ?? string.Empty).ToLowerInvariant();
                if (value == ActionMinimize || value == ActionExit)
                {
                    action = value;
                    return true;
                }
            }
            catch
            {
                // 损坏时按未设置处理
            }

            return false;
        }

        public bool SaveCloseAction(string action)
        {
            try
            {
                if (action != ActionMinimize && action != ActionExit)
                {
                    return false;
                }

                string dir = Path.GetDirectoryName(PrefsPath);
                if (!string.IsNullOrEmpty(dir))
                {
                    Directory.CreateDirectory(dir);
                }

                JObject json = new JObject
                {
                    ["version"] = 1,
                    ["closeAction"] = action,
                    ["savedAt"] = DateTime.UtcNow.ToString("o"),
                };
                string tempPath = PrefsPath + "." + Guid.NewGuid().ToString("N") + ".tmp";
                File.WriteAllText(tempPath, json.ToString(Newtonsoft.Json.Formatting.Indented));
                if (File.Exists(PrefsPath))
                {
                    try
                    {
                        File.Replace(tempPath, PrefsPath, null, true);
                        return true;
                    }
                    catch
                    {
                        File.Copy(tempPath, PrefsPath, true);
                        try
                        {
                            File.Delete(tempPath);
                        }
                        catch
                        {
                            // ignore
                        }

                        return true;
                    }
                }

                File.Move(tempPath, PrefsPath);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }

    /// <summary>v1.5.0 自定义 X 关闭提示对话框（最小化 / 退出程序 / 取消 + 记住选择）。</summary>
    internal sealed class CloseConfirmDialog : Form
    {
        private readonly CheckBox _remember;

        public CloseConfirmDialog()
        {
            Result = "cancel";
            Text = "关闭 FigurePlay";
            FormBorderStyle = FormBorderStyle.FixedDialog;
            StartPosition = FormStartPosition.CenterParent;
            MaximizeBox = false;
            MinimizeBox = false;
            ShowInTaskbar = false;
            ClientSize = new Size(420, 190);
            Font = new Font("Microsoft YaHei UI", 9F);

            Label title = new Label
            {
                Text = "要关闭 FigurePlay 吗？",
                AutoSize = false,
                Location = new Point(22, 20),
                Size = new Size(376, 26),
                Font = new Font(Font.FontFamily, 11F, FontStyle.Bold),
            };
            Label description = new Label
            {
                Text = "最小化会保留任务栏窗口并继续运行；退出程序会关闭窗口并清理后台 PowerPoint 会话。",
                AutoSize = false,
                Location = new Point(22, 52),
                Size = new Size(376, 44),
            };
            _remember = new CheckBox
            {
                Text = "记住本次选择，不再提示",
                AutoSize = true,
                Location = new Point(22, 110),
            };

            Button btnMinimize = new Button
            {
                Text = "最小化(&M)",
                Size = new Size(112, 32),
                Location = new Point(22, 145),
                DialogResult = DialogResult.None,
            };
            Button btnExit = new Button
            {
                Text = "退出程序(&X)",
                Size = new Size(112, 32),
                Location = new Point(144, 145),
                DialogResult = DialogResult.None,
            };
            Button btnCancel = new Button
            {
                Text = "取消(&C)",
                Size = new Size(112, 32),
                Location = new Point(266, 145),
                DialogResult = DialogResult.Cancel,
            };

            btnMinimize.Click += (sender, e) =>
            {
                Result = DesktopPrefsStore.ActionMinimize;
                Remember = _remember.Checked;
                DialogResult = DialogResult.OK;
                Close();
            };
            btnExit.Click += (sender, e) =>
            {
                Result = DesktopPrefsStore.ActionExit;
                Remember = _remember.Checked;
                DialogResult = DialogResult.OK;
                Close();
            };

            AcceptButton = btnMinimize;
            CancelButton = btnCancel;
            Controls.Add(title);
            Controls.Add(description);
            Controls.Add(_remember);
            Controls.Add(btnMinimize);
            Controls.Add(btnExit);
            Controls.Add(btnCancel);
        }

        /// <summary>minimize / exit / cancel。</summary>
        public string Result { get; private set; }

        public bool Remember { get; private set; }
    }
}
