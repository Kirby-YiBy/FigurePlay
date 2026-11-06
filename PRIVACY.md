# 隐私说明

FigurePlay 默认**完全本地运行**：图片、工程文件、配置和日志都在本机处理，不会上传到服务器。

## 会写入本机的内容

| 内容 | 位置 |
| --- | --- |
| 浏览器版工程/配置 | 浏览器 `localStorage`（由浏览器管理） |
| 桌面版配置模板 | `%APPDATA%\FigurePlay\configs\profiles.json` |
| 配置自动备份 | `%APPDATA%\FigurePlay\configs\backups\`（最近 20 份） |
| 关闭行为偏好 | `%APPDATA%\FigurePlay\prefs.json` |
| 更新源配置 | `%APPDATA%\FigurePlay\update.json`（默认不存在） |
| 诊断日志 | 浏览器 `localStorage`，最多 300 条 |
| WebView2 用户数据 | `%LOCALAPPDATA%\FigurePlay\WebView2` |

## 联网行为

- 默认不联网；
- 只有配置了 `update.json` 并启用更新检查时，程序才会访问其中指定的 HTTPS manifest 地址；
- 不会发送图片、工程、配置或日志内容；
- 更新包必须通过 HTTPS 下载并校验 SHA256，默认不静默覆盖 exe。

## 用户控制

- 可通过「使用说明 → 诊断日志」清空本地日志；
- 可删除 `%APPDATA%\FigurePlay` 清除配置/偏好；
- 卸载器默认保留用户数据，只有显式 `-RemoveUserData` 才会删除。
