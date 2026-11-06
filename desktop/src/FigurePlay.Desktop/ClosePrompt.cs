using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop
{
    /// <summary>v1.5.0/1.5.1 关闭行为偏好：%APPDATA%\FigurePlay\prefs.json；selftest 隔离。</summary>
    internal sealed class DesktopPrefsStore
    {
        public const string ActionMinimize = "minimize";
        public const string ActionExit = "exit";

        public DesktopPrefsStore(bool selfTest, string outDir, string dataDirOverride = null)
        {
            if (selfTest)
            {
                PrefsPath = Path.Combine(string.IsNullOrEmpty(outDir) ? AppPaths.ExeDir : outDir, "prefs.json");
            }
            else if (!string.IsNullOrEmpty(dataDirOverride))
            {
                PrefsPath = Path.Combine(dataDirOverride, "prefs.json");
            }
            else
            {
                PrefsPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "FigurePlay",
                    "prefs.json");
            }
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
                // ignore
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

    /// <summary>v1.5.1 自定义 X 关闭提示对话框（按钮自适应宽度，避免中文末字被裁）。</summary>
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
            AutoSize = true;
            AutoSizeMode = AutoSizeMode.GrowAndShrink;
            MinimumSize = new Size(500, 210);
            Font = new Font("Microsoft YaHei UI", 9F);
            Padding = new Padding(20, 16, 20, 16);

            Label title = new Label
            {
                Text = "要关闭 FigurePlay 吗？",
                AutoSize = true,
                Font = new Font(Font.FontFamily, 11F, FontStyle.Bold),
                Margin = new Padding(0, 0, 0, 8),
            };
            Label description = new Label
            {
                Text = "「最小化到托盘」会隐藏窗口并继续运行（任务栏右下角托盘可恢复）；「退出程序」会关闭窗口并清理后台 PowerPoint 会话。",
                AutoSize = false,
                MaximumSize = new Size(440, 0),
                Size = new Size(440, 40),
                Margin = new Padding(0, 0, 0, 8),
            };
            _remember = new CheckBox
            {
                Text = "记住本次选择，不再提示",
                AutoSize = true,
                Margin = new Padding(0, 0, 0, 10),
            };

            Button btnMinimize = new Button
            {
                Text = "最小化到托盘(&M)",
                AutoSize = true,
                AutoSizeMode = AutoSizeMode.GrowAndShrink,
                Padding = new Padding(12, 4, 12, 4),
                MinimumSize = new Size(140, 32),
                Margin = new Padding(0, 0, 10, 0),
                DialogResult = DialogResult.None,
            };
            Button btnExit = new Button
            {
                Text = "退出程序(&X)",
                AutoSize = true,
                AutoSizeMode = AutoSizeMode.GrowAndShrink,
                Padding = new Padding(12, 4, 12, 4),
                MinimumSize = new Size(120, 32),
                Margin = new Padding(0, 0, 10, 0),
                DialogResult = DialogResult.None,
            };
            Button btnCancel = new Button
            {
                Text = "取消(&C)",
                AutoSize = true,
                AutoSizeMode = AutoSizeMode.GrowAndShrink,
                Padding = new Padding(12, 4, 12, 4),
                MinimumSize = new Size(100, 32),
                Margin = new Padding(0),
                DialogResult = DialogResult.Cancel,
            };

            FlowLayoutPanel buttons = new FlowLayoutPanel
            {
                FlowDirection = FlowDirection.LeftToRight,
                AutoSize = true,
                AutoSizeMode = AutoSizeMode.GrowAndShrink,
                WrapContents = false,
                Margin = new Padding(0, 6, 0, 0),
            };
            buttons.Controls.Add(btnMinimize);
            buttons.Controls.Add(btnExit);
            buttons.Controls.Add(btnCancel);

            FlowLayoutPanel root = new FlowLayoutPanel
            {
                FlowDirection = FlowDirection.TopDown,
                AutoSize = true,
                AutoSizeMode = AutoSizeMode.GrowAndShrink,
                WrapContents = false,
                Dock = DockStyle.Fill,
            };
            root.Controls.Add(title);
            root.Controls.Add(description);
            root.Controls.Add(_remember);
            root.Controls.Add(buttons);

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
            Controls.Add(root);
        }

        /// <summary>minimize / exit / cancel。</summary>
        public string Result { get; private set; }

        public bool Remember { get; private set; }
    }
}
