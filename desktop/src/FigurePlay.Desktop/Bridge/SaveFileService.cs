using System;
using System.IO;
using System.Linq;
using System.Windows.Forms;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// v1.5.1 原生保存路径桥：JS 传 {suggestedName,filterName,filterExtensions,base64}，
    /// 宿主弹 SaveFileDialog 并写文件；selftest 不弹窗，写 &lt;outDir&gt;\\save-file 隔离目录。
    /// </summary>
    internal static class SaveFileService
    {
        public const long MaxBytes = 512L * 1024 * 1024;

        public static JObject Save(IWin32Window owner, bool selfTest, string outDir, JObject message)
        {
            JObject result = new JObject
            {
                ["ok"] = false,
                ["path"] = string.Empty,
                ["bytes"] = 0,
                ["canceled"] = false,
                ["error"] = string.Empty,
            };
            try
            {
                string base64 = message == null ? string.Empty : (message.Value<string>("base64") ?? string.Empty);
                if (base64.Length == 0)
                {
                    result["error"] = "保存失败：文件内容为空。";
                    return result;
                }

                long estimated = (long)base64.Length * 3L / 4L;
                if (estimated > MaxBytes)
                {
                    result["error"] = "保存失败：文件过大（上限 512MB）。";
                    return result;
                }

                byte[] bytes;
                try
                {
                    bytes = Convert.FromBase64String(base64);
                }
                catch
                {
                    // 兼容 data URL / 空白
                    string cleaned = new string(base64.Where(c => !char.IsWhiteSpace(c)).ToArray());
                    int comma = cleaned.IndexOf(',');
                    if (cleaned.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && comma >= 0)
                    {
                        cleaned = cleaned.Substring(comma + 1);
                    }

                    bytes = Convert.FromBase64String(cleaned);
                }

                if (bytes.LongLength > MaxBytes)
                {
                    result["error"] = "保存失败：文件过大（上限 512MB）。";
                    return result;
                }

                string suggestedName = SanitizeName(message.Value<string>("suggestedName"));
                string filterName = message.Value<string>("filterName") ?? "FigurePlay 文件";
                string filter = BuildFilter(filterName, message["filterExtensions"]);

                string targetPath;
                if (selfTest)
                {
                    string dir = Path.Combine(string.IsNullOrEmpty(outDir) ? AppPaths.ExeDir : outDir, "save-file");
                    Directory.CreateDirectory(dir);
                    targetPath = Path.GetFullPath(Path.Combine(dir, suggestedName));
                    string root = Path.GetFullPath(dir) + Path.DirectorySeparatorChar;
                    if (!targetPath.StartsWith(root, StringComparison.OrdinalIgnoreCase))
                    {
                        result["error"] = "保存失败：目标路径越界。";
                        return result;
                    }
                }
                else
                {
                    using (SaveFileDialog dialog = new SaveFileDialog())
                    {
                        dialog.Title = filterName;
                        dialog.FileName = suggestedName;
                        dialog.Filter = filter;
                        dialog.AddExtension = true;
                        dialog.OverwritePrompt = true;
                        dialog.RestoreDirectory = true;
                        try
                        {
                            dialog.InitialDirectory = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
                        }
                        catch
                        {
                            // ignore
                        }

                        if (owner == null)
                        {
                            if (dialog.ShowDialog() != DialogResult.OK)
                            {
                                result["canceled"] = true;
                                result["error"] = "已取消保存。";
                                return result;
                            }
                        }
                        else if (dialog.ShowDialog(owner) != DialogResult.OK)
                        {
                            result["canceled"] = true;
                            result["error"] = "已取消保存。";
                            return result;
                        }

                        targetPath = dialog.FileName;
                    }
                }

                if (string.IsNullOrWhiteSpace(targetPath) || Directory.Exists(targetPath))
                {
                    result["error"] = "保存失败：目标路径无效。";
                    return result;
                }

                string parent = Path.GetDirectoryName(targetPath);
                if (!string.IsNullOrEmpty(parent) && !Directory.Exists(parent))
                {
                    Directory.CreateDirectory(parent);
                }

                File.WriteAllBytes(targetPath, bytes);
                result["ok"] = true;
                result["path"] = targetPath;
                result["bytes"] = bytes.Length;
                result["canceled"] = false;
                result["error"] = string.Empty;
                return result;
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = "保存失败：" + ex.Message;
                return result;
            }
        }

        internal static string SanitizeName(string suggestedName)
        {
            string name = (suggestedName ?? string.Empty).Trim();
            if (name.Length == 0)
            {
                return "figureplay-file.figureplay.json";
            }

            name = Path.GetFileName(name);
            foreach (char invalid in Path.GetInvalidFileNameChars())
            {
                name = name.Replace(invalid, '_');
            }

            name = name.Replace("..", "_");
            if (name.Length == 0 || name == "." || name == "..")
            {
                return "figureplay-file.figureplay.json";
            }

            return name.Length > 120 ? name.Substring(0, 120) : name;
        }

        private static string BuildFilter(string filterName, JToken extensionsToken)
        {
            string[] extensions = null;
            JArray array = extensionsToken as JArray;
            if (array != null)
            {
                extensions = array.Select(t => t == null ? string.Empty : t.ToString()).ToArray();
            }
            else if (extensionsToken != null)
            {
                extensions = extensionsToken.ToString().Split(new[] { ';', ',' }, StringSplitOptions.RemoveEmptyEntries);
            }

            string patterns = string.Empty;
            if (extensions != null)
            {
                foreach (string raw in extensions)
                {
                    string ext = (raw ?? string.Empty).Trim().TrimStart('*', ';', ',');
                    if (ext.Length == 0)
                    {
                        continue;
                    }

                    if (!ext.StartsWith(".", StringComparison.Ordinal))
                    {
                        ext = "." + ext;
                    }

                    foreach (char c in ext)
                    {
                        if (!char.IsLetterOrDigit(c) && c != '.' && c != '_' && c != '-')
                        {
                            ext = string.Empty;
                            break;
                        }
                    }

                    if (ext.Length == 0)
                    {
                        continue;
                    }

                    if (patterns.Length > 0)
                    {
                        patterns += ";";
                    }

                    patterns += "*" + ext;
                }
            }

            if (patterns.Length == 0)
            {
                patterns = "*.*";
            }

            return (filterName ?? "文件") + "|" + patterns + "|所有文件|*.*";
        }
    }
}
