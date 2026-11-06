# 安全说明

## 下载与运行

- 本仓库提供的 exe 为**未签名**构建，Windows SmartScreen 可能提示未知发布者；请核对 Release 页面给出的 SHA256 后再运行。
- 仓库不提交 exe/zip 等构建产物，Release 资产由维护者在本地构建并上传。
- 桌面版安装器不写系统目录、不需要管理员权限。

## 更新安全

- 更新默认关闭，不联网；
- 只在 `%APPDATA%\FigurePlay\update.json` 或 exe 同目录 `update.json` 显式配置 `manifestUrl` 后才检查；
- manifest 必须为 HTTPS；
- 下载后强制校验 SHA256，失败会删除临时文件；
- 默认不静默替换 exe；请使用安装器或确认后手动替换。

## 报告问题

如果发现安全问题，请不要在公开 Issue 中粘贴 token、完整工程或未公开论文图片。可通过 GitHub Security Advisory 或维护者邮箱私下联系，并附上复现步骤与版本信息。
