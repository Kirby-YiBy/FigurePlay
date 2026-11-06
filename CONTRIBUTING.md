# 参与开发

FigurePlay 是本地优先的论文子图排版工具：网页版直接打开 `index.html`，桌面版为 .NET Framework 4.8 + WebView2。

## 本地运行

- 网页版：用 Chrome/Edge 打开 `index.html`（`file://` 即可，无需构建）；
- 桌面版：安装 .NET Framework 4.8 SDK、WebView2 Runtime，执行 `desktop/build.ps1`；
- 矢量 PDF 与 MATLAB `.fig` 导入需要 Windows 桌面版、PowerPoint（矢量 PDF）和 MATLAB（`.fig`）。

## 提交前检查

```powershell
# JavaScript 语法
Get-ChildItem js -Filter *.js | ForEach-Object { node --check $_.FullName }

# 网页 E2E（需要本机 Playwright Chromium 环境）
node _dev/e2e.mjs --suite=all

# 桌面版构建 + selftest
powershell -ExecutionPolicy Bypass -File desktop/build.ps1
```

## 约定

- 不提交 `desktop/dist*`、`desktop/selftest*`、`_dev/artifacts`、`_dev/screens*` 等构建/测试产物；
- 不提交真实用户配置、WebView2 数据、论文图片或 `.figureplay-project` 工程；
- 修改导出/编号/矢量相关逻辑时请同时更新对应 E2E 或 selftest；
- 提交信息使用清晰的 `feat:` / `fix:` / `docs:` 前缀。
