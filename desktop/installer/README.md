# FigurePlay 安装器 / 卸载器（v1.5.0）

无需管理员权限；安装到用户目录，不写系统目录/注册表。

## 安装

先构建单文件版（`desktop\build.ps1`，产物 `desktop\dist-single\FigurePlay.exe`），然后：

```powershell
powershell -ExecutionPolicy Bypass -File desktop\installer\install.ps1
# 或指定 exe / 创建桌面快捷方式：
powershell -ExecutionPolicy Bypass -File desktop\installer\install.ps1 -ExePath .\FigurePlay.exe -DesktopShortcut
```

安装结果：
- 程序：`%LOCALAPPDATA%\Programs\FigurePlay\FigurePlay.exe`；
- 开始菜单快捷方式 `FigurePlay`（可选桌面快捷方式）；
- `install-info.json`、`uninstall.ps1` 随程序安装。

升级：关闭 FigurePlay 后重新运行 `install.ps1`（覆盖 exe，不动用户数据）。

## 卸载

```powershell
powershell -ExecutionPolicy Bypass -File "%LOCALAPPDATA%\Programs\FigurePlay\uninstall.ps1"
```

默认**保留**：
- `%APPDATA%\FigurePlay`（配置模板、备份、prefs.json、update.json、项目数据）；
- `%LOCALAPPDATA%\FigurePlay`（WebView2 用户数据、单文件解压缓存）。

只有显式加 `-RemoveUserData` 并在提示中输入 `DELETE` 才会删除用户数据（绝不静默删除）。

## 自动更新（默认关闭，不联网）

宿主仅在 `update.json` 显式配置时才联网：

```json
{
  "enabled": true,
  "manifestUrl": "https://raw.githubusercontent.com/OWNER/REPO/main/update.json"
}
```

配置位置：`%APPDATA%\FigurePlay\update.json`（优先）或 exe 同目录 `update.json`。

远程 manifest 示例：

```json
{
  "version": "1.5.1",
  "url": "https://github.com/OWNER/REPO/releases/download/v1.5.1/FigurePlay.exe",
  "sha256": "<64 位十六进制 SHA256>",
  "notes": "修复若干问题",
  "publishedAt": "2026-11-06T12:00:00Z"
}
```

安全约束：
- `enabled=false`/无配置：不联网，仅提示“尚未配置更新源”；
- check-update 只比较版本（System.Version），不自动下载；
- download-update 必须 HTTPS，下载后强制校验 SHA256；校验失败删除临时文件并中文报错；
- 不自动静默替换 exe：校验通过后提示手动替换安装目录中的 `FigurePlay.exe`（配置/WebView2 数据保留）；
- selftest 隔离 `<outDir>\update.json`，不覆盖测试 exe，不写真实 APPDATA。
