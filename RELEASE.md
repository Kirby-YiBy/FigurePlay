# 发布流程

## 1. 版本号

- 网页入口 `js/util.js` 的 `FP.APP_VERSION`；
- 桌面 csproj/程序集版本需要与网页版本一致；
- 更新 `CHANGELOG.md`、`README.md` 的版本说明；
- Git 提交并打标签：`git tag -a vX.Y.Z -m "FigurePlay vX.Y.Z ..."`。

## 2. 构建与测试

```powershell
# 网页 E2E
node _dev/e2e.mjs --suite=all

# 桌面四件套 + 双 selftest + zip
powershell -ExecutionPolicy Bypass -File desktop/build.ps1
```

构建产物在：

- `desktop\dist\FigurePlay.exe`（多文件版）
- `desktop\dist-single\FigurePlay.exe`（单文件版）
- `desktop\FigurePlay-desktop-X.Y.Z-win-x64.zip`
- `desktop\FigurePlay-X.Y.Z-single-win-x64.zip`

构建产物、selftest 目录和 zip 不提交到 Git。

## 3. GitHub Release

1. 推 tag：`git push origin main --tags`；
2. 在 GitHub 创建 Release，tag 选择 `vX.Y.Z`；
3. 上传四个产物：两个 exe、两个 zip；
4. 在描述中贴出每个产物的 SHA256：

```powershell
Get-FileHash desktop\dist\FigurePlay.exe -Algorithm SHA256
Get-FileHash desktop\dist-single\FigurePlay.exe -Algorithm SHA256
Get-FileHash desktop\FigurePlay-desktop-X.Y.Z-win-x64.zip -Algorithm SHA256
Get-FileHash desktop\FigurePlay-X.Y.Z-single-win-x64.zip -Algorithm SHA256
```

5. 把 `update.example.json` 中的 `Kirby-YiBy/FigurePlay` 替换为真实仓库，更新版本、下载 URL、SHA256 和 notes，上传为 `update.json`（或放在 raw 地址）；
6. 用户可以把它保存为 `%APPDATA%\FigurePlay\update.json` 或在 exe 同目录放 `update.json`。

## 4. 自动更新（安全模式）

- 默认不联网；
- manifest 必须 HTTPS；
- 下载后校验 SHA256；
- 不静默覆盖 exe；校验通过后提示手动替换；
- 如果后续配置签名/证书，可再启用全自动替换。

## 5. 安装器

安装器不随 zip 打包，使用仓库中的 `desktop/installer/install.ps1`，或把脚本与 exe 一起作为额外 Release 附件。默认安装到：

```text
%LOCALAPPDATA%\Programs\FigurePlay
```

卸载默认保留 `%APPDATA%\FigurePlay` 与 WebView2 用户数据。
