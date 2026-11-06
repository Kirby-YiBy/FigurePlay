using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// v1.4.2 配置模板本机持久化：
    ///   - 正式路径 %APPDATA%\FigurePlay\configs\profiles.json（Roaming，绝不使用 WebView2 用户目录）；
    ///   - 保存：先写临时文件，File.Replace 原子替换；已有 profiles.json 时自动备份到 backups\profiles-yyyyMMdd-HHmmss.json；
    ///   - 备份最多保留 20 份；UTF-8；profiles 最多 100 个、JSON ≤2MB；
    ///   - selftest 模式使用 &lt;outDir&gt;\configs，绝不写真实 %APPDATA%。
    /// </summary>
    internal sealed class ConfigProfileStore
    {
        public const int MaxProfiles = 100;
        public const int MaxBytes = 2 * 1024 * 1024;
        public const int MaxBackups = 20;

        public ConfigProfileStore(bool selfTest, string outDir)
        {
            if (selfTest)
            {
                ConfigDir = Path.Combine(string.IsNullOrEmpty(outDir) ? AppPaths.ExeDir : outDir, "configs");
            }
            else
            {
                ConfigDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "FigurePlay",
                    "configs");
            }

            ProfilesPath = Path.Combine(ConfigDir, "profiles.json");
            BackupDir = Path.Combine(ConfigDir, "backups");
        }

        public string ConfigDir { get; private set; }

        public string ProfilesPath { get; private set; }

        public string BackupDir { get; private set; }

        /// <summary>读取配置；不存在返回空数组 + exists=false；损坏返回 ok=false（不崩溃）。</summary>
        public bool Load(out JArray profiles, out bool exists, out string error)
        {
            profiles = new JArray();
            exists = false;
            error = null;
            try
            {
                if (!File.Exists(ProfilesPath))
                {
                    return true;
                }

                exists = true;
                FileInfo info = new FileInfo(ProfilesPath);
                if (info.Length > MaxBytes)
                {
                    error = "本机配置文件过大（" + info.Length + " 字节，上限 2MB）。";
                    return false;
                }

                byte[] bytes = File.ReadAllBytes(ProfilesPath);
                string text = DecodeUtf8(bytes);
                JToken token;
                try
                {
                    token = JToken.Parse(text);
                }
                catch (JsonException ex)
                {
                    error = "本机配置文件 JSON 损坏：" + ex.Message;
                    return false;
                }

                JArray array = token as JArray;
                if (array == null)
                {
                    JObject obj = token as JObject;
                    if (obj != null)
                    {
                        array = obj["profiles"] as JArray;
                    }
                }

                if (array == null)
                {
                    error = "本机配置文件格式无效：缺少 profiles 数组。";
                    return false;
                }

                JArray result = new JArray();
                foreach (JToken item in array)
                {
                    if (item is JObject)
                    {
                        result.Add(item.DeepClone());
                    }

                    if (result.Count >= MaxProfiles)
                    {
                        break;
                    }
                }

                profiles = result;
                return true;
            }
            catch (Exception ex)
            {
                error = "读取本机配置文件失败：" + ex.Message;
                return false;
            }
        }

        /// <summary>保存配置（原子替换 + 时间戳备份）。</summary>
        public bool Save(
            JToken profilesToken,
            out string backupPath,
            out int bytes,
            out string error)
        {
            backupPath = null;
            bytes = 0;
            error = null;
            try
            {
                JArray array = profilesToken as JArray;
                if (array == null)
                {
                    error = "保存失败：profiles 必须是数组。";
                    return false;
                }

                if (array.Count > MaxProfiles)
                {
                    error = "保存失败：配置数量超过 " + MaxProfiles + " 个。";
                    return false;
                }

                JObject file = new JObject
                {
                    ["schema"] = "figureplay-config-profiles",
                    ["version"] = 1,
                    ["savedAt"] = DateTime.UtcNow.ToString("o"),
                    ["profiles"] = array.DeepClone(),
                };
                byte[] payload = new UTF8Encoding(false).GetBytes(file.ToString(Formatting.Indented));
                if (payload.Length > MaxBytes)
                {
                    error = "保存失败：配置 JSON 超过 2MB（" + payload.Length + " 字节）。";
                    return false;
                }

                Directory.CreateDirectory(ConfigDir);
                Directory.CreateDirectory(BackupDir);

                string tempPath = Path.Combine(
                    ConfigDir,
                    "profiles." + Guid.NewGuid().ToString("N") + ".tmp");
                File.WriteAllBytes(tempPath, payload);

                bool replaced = false;
                try
                {
                    if (File.Exists(ProfilesPath) && new FileInfo(ProfilesPath).Length > 0)
                    {
                        string stamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
                        backupPath = Path.Combine(BackupDir, "profiles-" + stamp + ".json");
                        int suffix = 1;
                        while (File.Exists(backupPath))
                        {
                            backupPath = Path.Combine(
                                BackupDir,
                                "profiles-" + stamp + "-" + suffix + ".json");
                            suffix++;
                        }

                        File.Replace(tempPath, ProfilesPath, backupPath, true);
                        replaced = true;
                    }
                    else
                    {
                        if (File.Exists(ProfilesPath))
                        {
                            File.Delete(ProfilesPath);
                        }

                        File.Move(tempPath, ProfilesPath);
                        replaced = true;
                    }
                }
                catch (Exception replaceException)
                {
                    // 某些文件系统不支持 File.Replace；退回“复制+覆盖”。
                    error = null;
                    try
                    {
                        if (File.Exists(ProfilesPath))
                        {
                            if (string.IsNullOrEmpty(backupPath))
                            {
                                string stamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
                                backupPath = Path.Combine(BackupDir, "profiles-" + stamp + ".json");
                            }

                            File.Copy(ProfilesPath, backupPath, true);
                        }

                        File.Copy(tempPath, ProfilesPath, true);
                        File.Delete(tempPath);
                        replaced = true;
                    }
                    catch (Exception copyException)
                    {
                        error = "保存本机配置文件失败：" + replaceException.Message +
                                "；回退复制也失败：" + copyException.Message;
                        TryDelete(tempPath);
                        return false;
                    }
                }

                if (!replaced)
                {
                    error = "保存本机配置文件失败（临时文件未替换）。";
                    TryDelete(tempPath);
                    return false;
                }

                bytes = payload.Length;
                CleanupBackups();
                return true;
            }
            catch (Exception ex)
            {
                error = "保存本机配置文件失败：" + ex.Message;
                return false;
            }
        }

        /// <summary>列出 backups 目录中的时间戳备份（新→旧）。</summary>
        public bool ListBackups(out JArray backups, out string error)
        {
            backups = new JArray();
            error = null;
            try
            {
                if (!Directory.Exists(BackupDir))
                {
                    return true;
                }

                string[] files = Directory.GetFiles(BackupDir, "profiles-*.json");
                Array.Sort(files, StringComparer.OrdinalIgnoreCase);
                Array.Reverse(files);
                foreach (string file in files)
                {
                    FileInfo info = new FileInfo(file);
                    backups.Add(new JObject
                    {
                        ["name"] = info.Name,
                        ["path"] = info.FullName,
                        ["bytes"] = info.Length,
                        ["modifiedAt"] = info.LastWriteTimeUtc.ToString("o"),
                    });
                }

                return true;
            }
            catch (Exception ex)
            {
                error = "读取配置备份列表失败：" + ex.Message;
                return false;
            }
        }

        /// <summary>读取指定备份（只允许 backups 目录内的文件名，防路径穿越）。</summary>
        public bool ReadBackup(string name, out JArray profiles, out string backupPath, out string error)
        {
            profiles = new JArray();
            backupPath = null;
            error = null;
            try
            {
                if (string.IsNullOrWhiteSpace(name))
                {
                    error = "备份文件名为空。";
                    return false;
                }

                name = name.Trim();
                if (name != Path.GetFileName(name) ||
                    name.IndexOfAny(new[] { '\\', '/', ':' }) >= 0 ||
                    name.IndexOf("..", StringComparison.Ordinal) >= 0 ||
                    !name.StartsWith("profiles-", StringComparison.OrdinalIgnoreCase) ||
                    !name.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
                {
                    error = "备份文件名无效（只允许 backups 目录内的 profiles-*.json）。";
                    return false;
                }

                string root = Path.GetFullPath(BackupDir);
                if (!root.EndsWith(Path.DirectorySeparatorChar.ToString(), StringComparison.Ordinal))
                {
                    root += Path.DirectorySeparatorChar;
                }

                string fullPath = Path.GetFullPath(Path.Combine(BackupDir, name));
                if (!fullPath.StartsWith(root, StringComparison.OrdinalIgnoreCase))
                {
                    error = "备份文件不在允许目录内。";
                    return false;
                }

                if (!File.Exists(fullPath))
                {
                    error = "备份文件不存在：" + name;
                    return false;
                }

                byte[] bytes = File.ReadAllBytes(fullPath);
                if (bytes.Length > MaxBytes)
                {
                    error = "备份文件过大（上限 2MB）。";
                    return false;
                }

                JToken token;
                try
                {
                    token = JToken.Parse(DecodeUtf8(bytes));
                }
                catch (JsonException ex)
                {
                    error = "备份文件 JSON 损坏：" + ex.Message;
                    return false;
                }

                JArray array = token as JArray;
                if (array == null)
                {
                    JObject obj = token as JObject;
                    if (obj != null)
                    {
                        array = obj["profiles"] as JArray;
                    }
                }

                if (array == null)
                {
                    error = "备份文件格式无效：缺少 profiles 数组。";
                    return false;
                }

                JArray result = new JArray();
                foreach (JToken item in array)
                {
                    if (item is JObject && result.Count < MaxProfiles)
                    {
                        result.Add(item.DeepClone());
                    }
                }

                profiles = result;
                backupPath = fullPath;
                return true;
            }
            catch (Exception ex)
            {
                error = "读取配置备份失败：" + ex.Message;
                return false;
            }
        }

        private void CleanupBackups()
        {
            try
            {
                if (!Directory.Exists(BackupDir))
                {
                    return;
                }

                string[] files = Directory.GetFiles(BackupDir, "profiles-*.json");
                Array.Sort(files, StringComparer.OrdinalIgnoreCase);
                Array.Reverse(files);
                for (int i = MaxBackups; i < files.Length; i++)
                {
                    TryDelete(files[i]);
                }
            }
            catch
            {
                // 备份清理失败不影响保存结果
            }
        }

        private static string DecodeUtf8(byte[] bytes)
        {
            if (bytes == null || bytes.Length == 0)
            {
                return string.Empty;
            }

            int offset = 0;
            if (bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF)
            {
                offset = 3;
            }

            return new UTF8Encoding(false).GetString(bytes, offset, bytes.Length - offset);
        }

        private static void TryDelete(string path)
        {
            try
            {
                if (!string.IsNullOrEmpty(path) && File.Exists(path))
                {
                    File.Delete(path);
                }
            }
            catch
            {
                // ignore
            }
        }
    }
}
