# FigurePlay 桌面版（Windows · WebView2 外壳 + 原生能力桥）

把网页版 FigurePlay（`E:\FigurePlay` 的 `index.html / assets / js / vendor`）打包成 Windows 桌面应用，
并提供浏览器做不到的四项原生能力：

1. **原生剪贴板读取（矢量保留）**：直接读取 MATLAB「Copy Figure」放进剪贴板的 **EMF（Enhanced Metafile）**，
   在 C# 侧渲染成宽约 **4400px（4000–4800px，约 650 DPI @170mm）** 的高清 PNG（单张 <8MB，超限自动缩小）；
   同时通过 `emfBase64` 把**真实 EMF 原始字节**交还网页端，供矢量 PDF 导出。也支持
   `MetafilePict`、`CF_BITMAP`、`CF_DIB`、PNG 等格式兜底；PNG 伪装的假 EMF 会被识别并拒绝。
2. **MATLAB `.fig` 直接导入**：上传/拖入 `.fig` 后，桌面版自动调用本机 MATLAB（`-batch`，无界面）
   用 `openfig` + `exportgraphics(..., 'Resolution', 600)` 导出 **600dpi PNG**（失败退回 `print -dpng -r600`），
   并尽量用 `print -dmeta` 同时导出真实 EMF 作为 `emfBase64`；MATLAB 路径自动探测/可配置，120 秒超时，临时文件自动清理。
3. **矢量 PDF 导出（PowerPoint 引擎，v1.3 新增）**：网页端把当前页排版 spec（EMF/PNG 面板、标签、边框、
   可选白边裁剪 `crop`）交给宿主，宿主用本机 **PowerPoint COM** 排版并导出**真正的矢量 PDF**
   （实测 `pdfimages` 无位图、`pdftotext` 可提取标签文字），放大不糊；无 PowerPoint 时前端自动回退位图 PDF。
   **v1.3.2 起**：开启 crop 时宿主用 PowerPoint 实际渲染的 PNG 探针做**二次墨迹校正**，并把页面收敛到
   “实际 ink bbox + `trimMarginMm` 安全边距”（应用默认至少 1mm）——不再裁到零白边，因此底部编号等
   贴边内容不会被裁，输出四边留白本机实测 ≈1.0mm（trim=0）与 ≈2.0mm（trim=2mm）。
   **v1.3.3 起**：PowerPoint 实例**持久复用**（应用启动后后台预热 1.5s，之后不再每次冷启动/退出），
   第二次导出从 ~27s 降到 **~0.53s**（-98%）；应用退出 / selftest 结束显式 shutdown 自己启动的实例，
   绝不关闭用户原有 PowerPoint；COM 断连自动重建会话。
4. **单文件发行版**：`FigurePlay.exe` 一个文件内嵌完整运行时与网页资源（主程序 exe、WebView2 托管 dll、
   `WebView2Loader.dll`、`wwwroot`），首次启动自解压到 `%LOCALAPPDATA%\FigurePlay\bin\app-<hash>`，
   从任意目录双击即可运行，不依赖旁边 dll/assets；仍依赖系统 **WebView2 Runtime**。

> 本候选包内嵌的是 **FigurePlay 应用 v1.5.2**（多页工程、子图分组、撤销/重做、autoPad、PDF trim 裁剪、
> ink 裁剪并入编号排版盒 + 至少 1mm 安全边距、行/列间距支持 -50～80mm、负间距下选中/悬停顶层描边、
> 界面外观（浅色/深色/跟随系统 + 7 种主题色）、配置模板（`js/config-profiles.js`）、
> 矢量 PDF + crop、saveAs 开关、`.fig` EMF 保留等；v1.4.1 起 spec 携带预览文字 bbox 用于编号 WYSIWYG；
> **v1.5.0 配置模板持久化到 `%APPDATA%\FigurePlay\configs\profiles.json`（宿主原子写 + 时间戳备份），
> 清除 WebView2 缓存/更新程序后仍可恢复**）；`dist\wwwroot` 与构建时 `E:\FigurePlay` 冻结源文件
> **逐字节一致**（24 个文件），桌面版桥协议见第 4 节。

技术栈：**.NET Framework 4.8**（Windows 10/11 自带运行时，最终用户无需安装 .NET）
\+ **Microsoft.Web.WebView2**（WinForms）。多文件版约 2.38 MB（dist 27 文件，wwwroot 20 + 7 运行文件），
单文件版约 **0.83 MB**（871,424 B）。

---

## 1. 目录结构

```
desktop\
├─ build.ps1                     ← 一键构建：多文件版 + 单文件版 + 双自测 + 双 zip
├─ README.md                     ← 本文件
├─ assets\
│   ├─ figureplay.ico            ← 应用图标（嵌入 exe）
│   ├─ figureplay-icon-256.png
│   └─ make_icon.py              ← 图标生成脚本（Pillow）
├─ src\
│   ├─ FigurePlay.Desktop\       ← 主程序（net48 WinForms + WebView2 外壳）
│   │   ├─ FigurePlay.Desktop.csproj
│   │   ├─ Program.cs / AppOptions.cs / AppPaths.cs / MainForm.cs
│   │   ├─ app.manifest / app.config
│   │   ├─ Bridge\
│   │   │   ├─ BridgeProtocol.cs        ← 桥协议常量与 JSON 构造
│   │   │   ├─ ClipboardImageReader.cs  ← 剪贴板格式识别与读取顺序（含 EMF 原始字节）
│   │   │   ├─ ClipboardService.cs      ← STA 后台线程、剪贴板占用重试
│   │   │   ├─ MetafileConverter.cs     ← EMF → 4400px PNG（~650dpi，≤6000px，<8MB）
│   │   │   ├─ RasterConverter.cs       ← Bitmap/PNG → 白底 PNG（限尺寸/限体积）
│   │   │   ├─ EmfValidator.cs          ← 真实 EMF 字节校验（拒绝 PNG 伪装/WMF）
│   │   │   ├─ DibDecoder.cs            ← CF_DIB 解码（1/4/8/16/24/32bpp）
│   │   │   ├─ NativeClipboard.cs       ← Win32 CF_ENHMETAFILE / CF_METAFILEPICT
│   │   │   ├─ MatlabLocator.cs         ← MATLAB 路径探测（环境变量/配置/注册表/目录）
│   │   │   ├─ MatlabRunner.cs          ← matlab.exe -batch 执行（超时/杀进程树/输出捕获）
│   │   │   ├─ FigImporter.cs           ← .fig → MATLAB → 600dpi PNG + EMF（120s 超时、清理临时文件）
│   │   │   ├─ VectorPdfModels.cs       ← 矢量 PDF spec 解析（面板/标签/crop/UNSUPPORTED_TRANSFORM）
│   │   │   ├─ PowerPointVectorExporter.cs ← PowerPoint COM 排版 + 矢量 PDF 导出
│   │   │   ├─ VectorPdfService.cs      ← STA 线程 + 60s 超时 + PowerPoint 进程清理
│   │   │   └─ ClipboardImageResult.cs
│   │   └─ SelfTest\
│   │       ├─ SelfTestRunner.cs        ← --selftest 全流程与 JSON 日志
│   │       ├─ SelfTestRunner.VectorPdf.cs     ← 宿主级矢量 PDF + crop 测试
│   │       ├─ SelfTestRunner.AppVectorE2E.cs  ← 应用级 E2E（注入 .fig → exportVectorPdfBase64）
│   │       ├─ SelfTestRunner.CropPdf.cs       ← crop 页面尺寸校验
│   │       ├─ TestFigureFactory.cs     ← 生成真实 EMF 并写入剪贴板
│   │       └─ MatlabFigSelfTest.cs     ← 调用 MATLAB 现场生成测试 .fig
│   └─ FigurePlay.SingleFile\    ← 单文件启动器（内嵌 payload.zip）
│       ├─ FigurePlay.SingleFile.csproj
│       ├─ Program.cs / app.manifest / app.config
│       └─ payload\               ← 构建时生成的 payload.zip（构建结束自动清理）
├─ dist\                         ← 多文件版（完整可运行目录，可整目录分发）
│   ├─ FigurePlay.exe（主程序）
│   ├─ FigurePlay.exe.config
│   ├─ Microsoft.Web.WebView2.Core.dll
│   ├─ Microsoft.Web.WebView2.WinForms.dll
│   ├─ WebView2Loader.dll
│   ├─ Newtonsoft.Json.dll
│   ├─ 使用说明.txt
│   └─ wwwroot\                  ← 构建时复制的最新网页应用（v1.5.0：多页/分组/撤销/矢量 PDF/crop/外观主题/配置模板/工程文件/预检/更新检查，24 个文件）
├─ dist-single\                  ← 单文件版（目录中只有 FigurePlay.exe）
│   └─ FigurePlay.exe
├─ selftest\                     ← 多文件版最近一次自测输出
├─ selftest-single\              ← 单文件版最近一次自测输出
├─ FigurePlay-desktop-1.3.2-win-x64.zip   ← 多文件版 zip
└─ FigurePlay-1.3.2-single-win-x64.zip    ← 单文件版 zip（只含一个 exe）
```

> `desktop\` 之外的应用文件（`index.html`、`js\`、`assets\`、`vendor\`）属于网页版源目录，
> **构建脚本只读取、不修改**；每次执行 `build.ps1` 都会重新复制最新文件到 `dist\wwwroot`。

---

## 2. 构建

### 2.1 构建机要求

| 项目 | 要求 |
| --- | --- |
| 操作系统 | Windows 10 / 11 x64 |
| .NET SDK | **8.0**（用于编译 net48 项目，`dotnet publish`） |
| NuGet | 能访问 `https://api.nuget.org/v3/index.json`（首次构建还原 WebView2 / Newtonsoft.Json / .NET Framework 引用程序集） |
| WebView2 Runtime | 构建时可缺省（脚本仅告警）；运行与自测必须已安装（本机 156.0.4314.58 已装） |
| MATLAB（可选） | `.fig` 导入功能需要 MATLAB R2020a+；构建机装了 MATLAB 时自测会做真实 `.fig` 往返（本机 R2024b 24.2） |
| PowerShell | Windows PowerShell 5.1 或 PowerShell 7 均可 |

### 2.2 一条命令构建（多文件版 + 单文件版）

```powershell
cd E:\FigurePlay\desktop
powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1
```

脚本依次完成：

1. 检查 `dotnet`、网页源目录、WebView2 Runtime、MATLAB（缺省仅告警）；
2. 清理并重建 `dist\`；
3. `dotnet publish src\FigurePlay.Desktop`（net48，Release，x64）；
4. 把 `E:\FigurePlay` 下最新的 `index.html / assets / js / vendor` 等复制到 `dist\wwwroot`
   （自动排除 `_dev`、`docs`、`desktop`、`README.md`、`*.bat`）；
5. 精简依赖（去 pdb/xml/runtimes，保留 exe 同级的 `WebView2Loader.dll`），写 `dist\使用说明.txt`；
6. 运行 `dist\FigurePlay.exe --selftest`（布局三栏 / EMF / 桥 / 应用 JS 桥 / MATLAB `.fig` / 矢量 PDF + crop/trim 墨迹校正 / 截图 / console）；
7. 把整个 `dist` 压成 `payload.zip` 并构建单文件启动器，输出到 `dist-single\FigurePlay.exe`（目录中只保留一个 exe）；
8. 在 **%TEMP% 干净临时目录**（只放一个 exe）运行单文件版 `--selftest`，验证自解压、旧版本目录清理、
   干净目录无旁置依赖；同时检查一次正常启动路径；
9. 生成两个 zip（多文件版 / 单文件版）；
10. 打印两个 exe 的路径/大小/SHA256、`app.js` SHA256、dist 大小、zip 大小、自测结果与总耗时。

> 构建机会**串行**跑两次完整自测（先多文件、退出后再单文件；含两次 MATLAB 启动 + 首次 PowerPoint
> 冷启动，持久会话让后续导出 <1s，另含外观主题/编号中心/config1 WYSIWYG/配置持久化/reload 恢复校验），
> 总耗时约 **5–6 分钟**（本机实测 326.3s）。可用 `-SkipSingleFile` 只构建多文件版，或用 `-SkipSelfTest` 跳过自测。

### 2.3 常用参数

```powershell
# 只改了网页端文件（exe 未变）：跳过主程序编译，只重复制网页 + 重建单文件 payload + 自测 + 打包
.\build.ps1 -SkipBuild

# 跳过自测 / 跳过 zip / 只出多文件版
.\build.ps1 -SkipSelfTest
.\build.ps1 -SkipZip
.\build.ps1 -SkipSingleFile

# 指定网页源目录或 dotnet 路径
.\build.ps1 -AppSource 'D:\FigurePlay' -DotnetPath 'C:\Program Files\dotnet\dotnet.exe'
```

---

## 3. 运行与分发

### 3.1 多文件版

- 双击 `dist\FigurePlay.exe`（或使用根目录 `E:\FigurePlay\启动FigurePlay桌面版.bat`）；
- 目录里需要全部 dll 与 `wwwroot`，不可只拷贝 exe；
- 首次启动创建 WebView2 用户数据目录：`%LOCALAPPDATA%\FigurePlay\WebView2`；
- 窗口标题：`FigurePlay · 论文子图排版`；默认 **1600×1000 物理像素**（150% 缩放下 CSS 视口约 1067×667，
  保持三栏紧凑布局），最小 1180×700，居中，高 DPI（PerMonitorV2）；`F5` 重新加载页面。

### 3.2 单文件版（主交付）

- `dist-single\FigurePlay.exe` 或 `FigurePlay-1.3.2-single-win-x64.zip`；**只需这一个文件**，
  放到任意目录（U 盘、桌面、含中文/空格的路径均可）双击运行；
- 首次启动会把内嵌 payload（完整多文件版）解压到：
  `%LOCALAPPDATA%\FigurePlay\bin\app-<payload-sha16>\`，约 1 秒；之后启动直接复用；
- payload 变化（升级 exe）时自动换新目录，并尽量清理旧的 `app-*` 目录；同一时间只解压一次（互斥锁）；
- 启动日志：`%LOCALAPPDATA%\FigurePlay\bin\singlefile.log`（记录 payload 哈希、解压、子进程退出码）；
- 单文件启动器会等待主程序退出并透传退出码，支持 `--selftest` 等全部命令行参数；
- 卸载：删除单文件 exe 与 `%LOCALAPPDATA%\FigurePlay\` 目录即可。

### 3.3 分发要求 / SmartScreen

- 需要 **Windows 10 / 11 x64** 与 **Microsoft Edge WebView2 Runtime**
  （Win10/11 通常已自带；缺失时启动有中文提示，下载：<https://go.microsoft.com/fwlink/p/?LinkId=2124703>）；
- 最终用户**不需要**安装 .NET Framework（4.8 是 Win10/11 系统组件）；
- **SmartScreen**：未做商业代码签名，从浏览器下载的 zip 解压后首次运行可能提示
  「Windows 已保护你的电脑」→「更多信息」→「仍要运行」；企业内可用组策略/白名单或自行签名；
- 单文件版为自解压 exe，个别杀毒软件可能加严扫描，可把 `%LOCALAPPDATA%\FigurePlay\bin\` 加入信任；
- 程序不联网、不写系统目录，只写 `%LOCALAPPDATA%\FigurePlay\`（WebView2 数据、解压运行时、.fig 临时目录）。

---

## 4. JS ↔ Host 桥协议（与网页端精确约定）

网页端通过 `window.chrome.webview.postMessage(JSON.stringify(...))` 发送；宿主回传使用
JSON 字符串（`CoreWebView2.PostWebMessageAsString`），网页端 `JSON.parse(event.data)` 即可
（应用内 `js/desktop.js` 对字符串/对象两种形式都做了兼容）。未知 `type` 一律忽略，不会打断网页端。

### 4.1 读取剪贴板图像（MATLAB Copy Figure / EMF）

JS → Host：

```json
{"type":"read-clipboard-image","requestId":"<id>"}
```

Host → JS（成功）：

```json
{
  "type": "clipboard-image",
  "requestId": "<id>",
  "ok": true,
  "dataUrl": "data:image/png;base64,...",
  "width": 4400,
  "height": 2933,
  "sourceFormat": "EMF",
  "emfBase64": "<真实 EMF 原始字节 base64，可选>"
}
```

Host → JS（失败）：`{"type":"clipboard-image","requestId":"<id>","ok":false,"error":"中文失败原因"}`
`sourceFormat` 取值：`EMF` | `Metafile` | `Bitmap` | `DIB`。

- `emfBase64`：仅当能拿到**真实 EMF**（文件头 `01 00 00 00`）时返回，供前端保存后导出矢量 PDF；
  宿主会校验 EMF 记录头，**PNG 伪装/WMF 不会被当作 EMF 返回**；EMF 原始字节与渲染尺寸互相独立。
- PNG 为 4400px 宽（4000–4800px，约 650dpi），体积超过 8MB 时自动缩小重试。

### 4.2 导入 MATLAB .fig

JS → Host：

```json
{"type":"import-fig","requestId":"<id>","filename":"xxx.fig","base64":"<file bytes base64>"}
```

Host → JS（成功）：

```json
{
  "type": "fig-imported",
  "requestId": "<id>",
  "ok": true,
  "dataUrl": "data:image/png;base64,...",
  "width": 4004,
  "height": 2898,
  "sourceFormat": "MATLAB-FIG",
  "convertMs": 29631,
  "matlabVersion": "24.2.0.2712019 (R2024b)",
  "emfBase64": "<try print -dmeta 导出的真实 EMF，可选>"
}
```

Host → JS（失败）：`{"type":"fig-imported","requestId":"<id>","ok":false,"error":"中文原因"}`

- `filename` 仅用于错误提示，宿主不会把它当路径使用；
- base64 上限 100MB（原始 .fig），非法 base64/非 MAT 文件头会直接返回可读错误；
- 转换在后台线程串行执行（同时只跑一个 `matlab.exe`），不阻塞 UI；
- 导出 600dpi PNG（本机测试图 4004×2898、约 280KB），并尽量用 `print -dmeta` 同时导出真实 EMF 放入
  `emfBase64`（R2024b 实测可用），使 `.fig` 也能参与矢量 PDF；若 EMF 导出失败则仅返回 PNG，不视为失败；
- 首次 MATLAB 启动慢（10–40 秒，冷启动可能更久），网页端应显示“正在调用 MATLAB 转换 .fig…”状态。

### 4.3 矢量 PDF 导出（PowerPoint 引擎）

JS → Host：

```json
{"type":"export-vector-pdf","requestId":"<id>","spec":{ ... }}
```

`spec`（单页；所有长度单位 mm，颜色 `#RRGGBB`）：

```json
{
  "widthMm": 170,
  "heightMm": 193,
  "background": "#ffffff",
  "crop": {"xMm": 10, "yMm": 10, "wMm": 150, "hMm": 100},
  "panels": [
    {
      "xMm": 0, "yMm": 0, "wMm": 84, "hMm": 63,
      "image": {"kind": "emf", "base64": "<真实 EMF base64>"},
      "fit": "contain",
      "rotation": 0,
      "border": {"on": true, "widthMm": 0.25, "color": "#000000"}
    }
  ],
  "labels": [
    {
      "text": "(a)",
      "xMm": 1.5, "yMm": 1.5,
      "boxXmm": 1.5, "boxYmm": 1.2, "boxWmm": 20, "boxHmm": 4,
      "fontSizePt": 9,
      "fontName": "Times New Roman",
      "bold": false, "italic": false,
      "color": "#000000",
      "align": "left",
      "bg": "none", "bgColor": "#ffffff", "bgOpacity": 1
    }
  ]
}
```

Host → JS（成功）：

```json
{
  "type": "vector-pdf-export",
  "requestId": "<id>",
  "ok": true,
  "base64": "<PDF 文件 base64>",
  "bytes": 68989,
  "engine": "PowerPoint",
  "vectorPanels": 1,
  "rasterPanels": 0
}
```

Host → JS（失败）：`{"type":"vector-pdf-export","requestId":"<id>","ok":false,"error":"中文原因"}`

- `crop` 可选：有效时初始 PowerPoint 页面尺寸 = `crop.wMm × crop.hMm`，所有 panels/labels 坐标相对原页面
  左上角减去 `crop.xMm/crop.yMm`；`crop` 越界/过小等无效情况**静默忽略**（输出整页），不报错。
- `trimMarginMm` 可选（v1.3.2，0–20mm，默认 1）：开启 crop 时宿主二次墨迹校正的目标**安全边距**。
  应用会发送 `Math.max(1, 用户留边)`，所以即使用户 trim=0，也至少保留 1mm，避免底部编号等贴边内容被裁。
- **v1.3.2 二次墨迹校正**：宿主先按 `crop` 组版，再用 PowerPoint `slide.Export` 的 PNG 探针扫描实际
  ink bbox，由“整页 ink bbox + trimMarginMm”重新计算页面并组版（最多 2 次迭代）。
  最终页面 = ink bbox 四周各留 ≈trimMarginMm；渲染后四边墨迹余量应在 trimMargin±0.5mm 内。
  探针失败时保留原 crop 导出、不阻塞。
- `fit`：`contain`（等比缩放居中，默认）/ `stretch`（填满）；`rotation` 通过 `shape.Rotation`；
  `cover` / `zoom` / `offset` 等复杂变换返回 `ok:false,error:"UNSUPPORTED_TRANSFORM"`，由前端回退位图 PDF。
- 超时 **120 秒**（首次冷启动 PowerPoint 可能较慢；v1.3.2 的墨迹校正会多组版 1–2 次，故放宽）；
  转换在专用 STA 线程串行执行，不阻塞 UI；`vectorPanels`/`rasterPanels` 为送入引擎的 EMF / 位图面板数量。
- 成功响应可能附带 `diagnostics` 字符串数组（宿主墨迹校正/迭代日志，前端可忽略）。
- **v1.3.3 会话生命周期**：宿主首次导出（或启动后后台预热）时创建 PowerPoint.Application 并保持存活，
  后续导出只 `Presentations.Add/Close`；应用退出/selftest 结束时显式 Shutdown 自己启动的实例；
  只 Quit/Kill 自己创建的新 POWERPNT 进程，绝不关闭用户原有实例；COM 断连/RPC 错误自动重建。

### 4.4 启动握手

```json
{"type":"host-ready","version":"1.3.2"}
```

宿主在收到网页端 `{"type":"app-ready","version":"..."}` 后立即回发（推荐路径），
或轮询到 `window.__FIGPLAY__.ready === true` 后回发（兜底），只发一次。

### 4.5 配置模板持久化（v1.4.2）

配置模板不再只存在 WebView2 的 localStorage，而是由宿主写到 `%APPDATA%\FigurePlay\configs\profiles.json`
（Roaming，**不在 WebView2 用户目录**）；清除 WebView2 缓存、更新 exe 后仍可恢复。

JS → Host（读取）：

```json
{"type":"load-config-profiles","requestId":"<id>"}
```

Host → JS：

```json
{
  "type": "config-profiles",
  "requestId": "<id>",
  "ok": true,
  "profiles": [ ... ],
  "path": "%APPDATA%\FigurePlay\configs\profiles.json",
  "exists": true
}
```

失败：`{"type":"config-profiles","requestId":"<id>","ok":false,"error":"中文原因"}`

JS → Host（保存）：

```json
{"type":"save-config-profiles","requestId":"<id>","profiles":[ ... ]}
```

Host → JS：

```json
{
  "type": "config-profiles-saved",
  "requestId": "<id>",
  "ok": true,
  "path": "%APPDATA%\FigurePlay\configs\profiles.json",
  "backupPath": "%APPDATA%\FigurePlay\configs\backups\profiles-20261106-135520.json",
  "bytes": 1527
}
```

失败：`{"type":"config-profiles-saved","requestId":"<id>","ok":false,"error":"中文原因"}`

实现约束：
- 保存先写 `profiles.<guid>.tmp` 再 `File.Replace` 原子替换；已有 `profiles.json` 时自动复制到
  `backups\profiles-<UTC yyyyMMdd-HHmmss>.json`，最多保留 **20** 份；
- UTF-8；profiles 最多 **100** 个、原始 JSON ≤ **2MB**；读取不存在返回空数组 + `exists:false`；
  JSON 损坏返回可读错误（不崩溃），前端回退 localStorage；
- `--selftest` 使用 `<outDir>\configs` 隔离目录，**绝不写真实 %APPDATA%**；正常模式使用
  `%APPDATA%\FigurePlay\configs`；
- `profiles.json` 文件结构：`{"schema":"figureplay-config-profiles","version":1,"savedAt":"<UTC ISO>","profiles":[...]}`，
  读取兼容纯数组。

---

## 5. 原生 EMF 剪贴板转换（核心实现）

### 5.1 读取顺序

1. **`EnhancedMetafile`（CF_ENHMETAFILE）** —— MATLAB「Copy Figure」默认格式。
   先用 WinForms `DataObject` 读取；失败时走 **Win32 `GetClipboardData(CF_ENHMETAFILE)` +
   `GetEnhMetaFileBits`** 直接取 EMF 字节（实测本机必用此兜底，WinForms 对原生 CF_ENHMETAFILE 有时返回空）；
2. **`MetafilePict`（CF_METAFILEPICT）** —— DataObject 失败后用 Win32 读 `METAFILEPICT`，
   `GetMetaFileBitsEx` 取 WMF → `SetWinMetaFileBits` 转 EMF → 渲染；
3. **Clipboard image** —— `CF_BITMAP` / `PNG` 等；
4. **`CF_DIB`（DeviceIndependentBitmap）** —— 自实现解码器：1/4/8/16/24/32bpp、
   BI_RGB / BI_BITFIELDS、自底向上/自顶向下、调色板、5-5-5 与位域掩码；
5. 最后兜底 `Clipboard.GetImage()`。

### 5.2 EMF → PNG

- 目标宽度 **4400px**（要求 4000–4800px，170mm 图上约 650 DPI），按 EMF 边界等比计算高度；
  任一边超过 **6000px** 时等比缩到上限；PNG 体积超过 **8MB** 时自动缩小重试（最多 6 次）；
- 以 657 DPI 元数据保存（`SetResolution`），白底 + GDI+ 抗锯齿 / 高质量插值 / AntiAliasGridFit 文字；
- 先尝试「目标矩形重放」，失败再退回「世界变换缩放」；PNG 编码后校验签名与尺寸；
- 真实 EMF 记录字节同时保留为 `emfBase64`（不经过 PNG 转存），供矢量 PDF 使用；
- 位图类兜底同样白底扁平化、限制最大边 6000px、体积 <8MB。

### 5.3 剪贴板占用 / 异常兜底

- DataObject 读取失败按 40→120ms 退避重试，累计约 2–3 秒；
- 原生句柄读取失败回退下一格式；`OutOfMemory` / `ExternalException` / `COMException` 统一翻译为中文；
- 自测日志会带 `diagnostics`（识别到的格式、EMF 头、渲染方式、PNG 尺寸等）。

---

## 6. MATLAB .fig 导入实现

### 6.1 流程

1. 校验 base64（非法编码 / 过小 / 超过 100MB / 缺少 MAT 文件头 → 直接返回中文错误）；
2. 在 `%LOCALAPPDATA%\FigurePlay\temp\fig-<guid>\` 写 `input.fig` 与固定模板 `figureplay_import.m`；
3. 以 `matlab.exe -batch "run('...')"` 运行（`-batch` 不打开 MATLAB 桌面/启动画面，无交互）；
   - 脚本固定：`openfig(inFile,'invisible')` → `exportgraphics(fig, outFile, 'Resolution', 600)`
     → 失败时 `print(fig, outFile, '-dpng', '-r600')`；随后 `print(fig, emfFile, '-dmeta')` 尝试导出真实 EMF；
   - 用户文件名不进入脚本，文件路径只通过环境变量 `FIGPLAY_FIG_IN/OUT/EMF` 传入，避免路径注入；
4. 读取输出 PNG（600dpi，如 4004×2898），白底扁平化、限制最大边 6000px / 体积 <8MB，返回 `MATLAB-FIG` PNG；
   若 `print -dmeta` 产出真实 EMF（文件头 `01 00 00 00`），一并放入 `emfBase64` 用于矢量 PDF；
5. 无论成功失败，**清理临时目录**；不修改用户文件，不打开 MATLAB 图形界面。

超时 120 秒；超时/许可失败/文件损坏/`.fig` 由更高版本保存 等均有可读中文错误。
MATLAB 路径与版本会缓存（`MatlabLocator`），避免重复探测。

### 6.2 MATLAB 路径探测顺序

1. 环境变量 `FIGPLAY_MATLAB_PATH`（显式指定，优先）；
2. `%LOCALAPPDATA%\FigurePlay\matlab-path.txt`（一行写 matlab.exe 完整路径）；
3. 注册表 `HKLM/HKCU\SOFTWARE\MathWorks\MATLAB\<ver>\MATLABROOT`（本机即通过此方式找到 R2024b）；
4. 常见安装目录 `D:\Program Files\MATLAB\R*`、`C:\Program Files\MATLAB\R*` 等；
5. `PATH` 环境变量、注册表 `App Paths\matlab.exe`。

---

## 7. 矢量 PDF 导出引擎（PowerPoint，v1.3 新增）

### 7.1 前置要求

- 本机需安装 **桌面版 Microsoft PowerPoint 2016 或更高版本**（Office COM 自动化；本机 Office 2021 16.0.20527 实测通过）。
  未安装/COM 失败时返回可读错误，网页端会自动回退到高分辨率位图 PDF；
- 首次导出约 20–40 秒（PowerPoint 冷启动），超时上限 **120 秒**；
- WebView2 / .NET Framework 要求与其它功能相同。

### 7.2 实现与行为

- 在专用 **STA 线程**创建 PowerPoint 应用：`Presentations.Add(WithWindow=false)` 创建**无窗口**演示文稿，
  按 `mm/25.4*72` 设置页面尺寸；白/自定义背景；
- 每个面板写临时 EMF/PNG 文件后 `Shapes.AddPicture`：contain 等比缩放居中 / stretch 填满（先
  `shape.LockAspectRatio=false`，否则 PowerPoint 会保持图片纵横比导致 stretch 失效）；rotation 用
  `shape.Rotation`；border 用 `shape.Line`；标签 `AddTextbox`（margin=0、wordwrap=false、字体/字号/粗斜/颜色/对齐、背景填充）；
- `SaveAs(pdfPath, 32 /*ppSaveAsPDF*/)` 导出 PDF，读 bytes 返回 base64；随后关闭 presentation；
- **不弹 UI**：不显示演示窗口、无模态对话框（PowerPoint 2021 不允许 `Visible=false`，但 `WithWindow=false`
  不会显示文档窗口）；不保存 pptx、不修改用户文件；临时图片/PDF 全部清理；
- **安全边距 + 二次墨迹校正（v1.3.2）**：`spec.crop` 存在时，先组版并以
  `slide.Export(png, "PNG", 1400, 等比高)` 导出探针，用 System.Drawing 扫描非背景色像素（阈值 8/255）
  得到实际 ink bbox；目标页面 = ink bbox 向四周扩展 `trimMarginMm`（再按原页面边界裁切），
  若四边余量不在 `trimMarginMm ± 0.5mm` 内则重新组版，最多 2 次；探针异常时保留原 crop 导出
  并在 diagnostics 记录。见 7.4。
- **持久会话（v1.3.3）**：`PowerPointHost` 在专用 STA 线程持有单个 `PowerPoint.Application`；创建前记录
  已有 `POWERPNT.EXE` PID，只把自己新建的进程记为 owned；应用退出 / selftest 结束时 Quit owned 实例并
  仅 kill owned PID，**绝不关闭用户原有 PowerPoint**；COM 断连/RPC 错误自动重建会话；120 秒超时兜底
  重置会话。主窗口就绪后延迟 1.5s 后台预热（只启动 Application，不创建演示文稿；selftest 不预热）；
- 坐标/单位：所有 mm → pt（×72/25.4）；crop 平移规则见 4.3。见 7.5。

### 7.3 实测结果（本机，v1.4.1）

- 170×120mm 页面：**481.92×340.08 pt**、`pdfimages` 0 位图、`pdftotext` 可提取标签文字 `(a)`；
- 宿主级 crop 150×100mm（实心 EMF，stretch）+ trimMargin：
  - trimMargin=**1mm** → 页 **152.02×101.98mm**，渲染四边余量 **0.68/0.68/0.85/0.85mm**；
  - trimMargin=**2mm** → 页 **154.01×103.97mm**，渲染四边余量 **1.69/1.69/1.86/1.69mm**；
  - 均 `pdfimages` 0 位图；页面 = crop + 2×trimMargin，误差 <0.05mm；
- 应用级 E2E（3×2 网格、170mm 成品宽）：**481.92×547.08 pt**、0 位图、标签文字存在；
- **应用级 trim 基础用例**（默认编号，用户 trim=0 → 安全边距 1mm）：页 **77.39×60.11mm**，
  渲染余量 **0.85/0.85/1.02/1.02mm**，0 位图；
- **用户场景：编号底部中间**（inset 1.5、offsetX 1.2、offsetY 5、Times New Roman 9pt）：
  - trim=0（安全边距 1mm）→ 页 **72.94×65.53mm**，四边余量 **1.02/1.02/1.02/1.02mm**，
    底部 9mm 条带编号墨迹 **279px**、`pdftotext` 提取到 `(a)`，编号完整不裁；
  - trim=2mm → 页 **74.93×67.56mm**，四边余量 **2.03/2.03/2.20/2.20mm**，底部编号墨迹 **275px**、文本正常；
- **持久会话冷/热导出（v1.4.2 实测）**：多文件版首次导出 **26.9s**（含 PowerPoint 冷启动 24.8s）→ 第二次 **0.55s**
  （提速 97.9%）；单文件版 **27.9s**（冷启动 23.2s）→ **0.79s**（提速 97.2%）；selftest 中连续导出 7 次复用
  同一实例；结束显式 shutdown 后 `POWERPNT` 残留数为 **0**（用户原有实例不受影响）。

### 7.4 安全边距 + 二次墨迹校正（v1.3.2，解决“trim=0 时底部编号被裁”）

用户反馈：v1.3.1 trim=0 时 PDF 底部编号可能被裁掉，设 trim=1mm 才正常。根因：
1. 应用 ink bbox 基于 PNG 预览，矢量面板却是 EMF，两者内部留边不同；宿主若按“零白边”裁，会把编号等
   贴边内容一起裁掉；
2. PowerPoint 图片默认锁定纵横比，`stretch` 会被悄悄变成 contain，留下边条。

v1.3.2 修复：
- 应用侧（Lead 处理）：ink crop 并入编号排版盒，并发送 `trimMarginMm = max(1, 用户值)`；
- 宿主（`PowerPointVectorExporter`）：
  1. 只有 `spec.crop` 存在（trim 模式）才启用；先按 app crop 组版并导出 PNG 探针；
  2. 扫描实际 ink bbox：`inkX=crop.X+left, inkY=crop.Y+top, inkW=crop.W-left-right, inkH=crop.H-top-bottom`；
  3. 目标页面 = ink bbox 向四周扩展 `trimMarginMm`，再按原页面 `spec.WidthMm/HeightMm` 边界裁切
     （`newX=max(0, inkX-margin)` 等），保证页面 ≥26mm；
  4. 收敛判据：四边渲染余量均在 `trimMarginMm ± 0.5mm`；否则重新组版，最多 2 次；
  5. 最终组版 + `SaveAs PDF`；探针失败/页面过小等异常保留原 crop 导出并在 diagnostics 记录；
  6. 日志：`%LOCALAPPDATA%\FigurePlay\temp\vectorpdf-trace.log`（组版/探针/裁剪迭代时间线）。

> 效果：trim=0 时输出四边留白 ≈1.0mm（本机 1.02mm），编号完整；trim=2mm 时 ≈2.0–2.2mm；
> 不再出现“裁到零白边把编号裁掉”的问题。selftest 以“四边余量 = trimMargin ±0.5mm + 底部编号墨迹/文本存在”为硬判据。

### 7.5 PowerPoint 持久会话与预热（v1.3.3）

用户反馈：每次矢量 PDF 导出约 20–30s，疑似每次启动/退出 PowerPoint。实测确认冷启动占 ~25s，
组版+导出本身仅 ~0.5–2s。v1.3.3 改为持久会话：

1. `PowerPointHost`：单例 + 专用 STA 线程 + 阻塞队列；首次请求（或后台预热）创建
   `PowerPoint.Application` 并保持存活，后续请求在同一线程复用该实例，每次只 `Presentations.Add` →
   组版/导出 → `presentation.Close`，不 Quit Application。
2. **进程所有权**：创建前快照已有 `POWERPNT.EXE` PID；创建后只把新增 PID 记为 owned。
   Shutdown/超时兜底仅 Quit/kill owned 实例，用户原本打开的 PowerPoint 绝不被关闭（若检测不到新 PID，
   视为非自己实例，永不 Quit）。
3. **显式 Shutdown**：主窗口 `FormClosed`、`Program` 退出兜底、selftest 结束时都会调用
   `PowerPointHost.Shutdown()`（Quit owned + kill owned + 释放 COM）；selftest 在 shutdown 后才断言
   `POWERPNT` 残留为 0。
4. **预热**：主窗口就绪后延迟 1.5s 在后台启动 Application（不创建演示文稿、失败静默），让用户第一次
   导出尽量走热路径；`--selftest` 模式跳过预热，便于测量真实冷/热耗时。
5. **断连重建**：`Presentations.Add`/组版/导出抛 RPC 断连类 COM 异常时，自动释放旧会话、重建新实例并
   重试一次；仍失败返回可读错误，不崩溃。
6. **超时**：单次导出仍由 `VectorPdfService` 120s 兜底；超时会重置会话（仅清理自己启动的实例），
   下次导出自动重建。

> 实测：首次导出 26.9s（冷启动 24.9s）→ 后续 0.53s（-98%）；selftest 连续 7 次导出均复用同一实例，
> 结束后 POWERPNT 残留 0。应用正常退出/关闭窗口同样会清理自己启动的 PowerPoint。

### 7.6 编号锚点与垂直 WYSIWYG 修复（v1.4.0 / v1.4.1）

用户反馈 Test5.pdf 中 (a)/(b) 编号整体左偏约 3.19mm。排查确认是宿主标签文本框放置问题：
1. 旧实现直接把 app 的 padded `BoxXmm` 当文本框左边界，带来 padX 量级偏移；
2. 更关键：PowerPoint 在 `TextFrame.WordWrap=false` 时会把新建文本框宽度压缩到 **0.005pt**（COM 实测），
   于是 `ParagraphFormat.Alignment=center` 退化为“以文本框左边界为中心”，造成 15mm 量级左偏。

v1.4.0 修复（`PowerPointVectorExporter.Compose`）：
1. 无背景标签按真实锚点 `label.XMm` 定位：
   - center：`width=max(BoxW+10,30)mm, left=XMm-width/2`；
   - left：`left=XMm`；right：`left=XMm-width`；
   - top 用 `BoxYmm`，height=max(BoxH,5)；保留 `Margin*=0`、`WordWrap=false`、`AutoSize=0`、Alignment；
2. 文本/格式设置完成后**重新写回 `textbox.Width/Height/Left/Top` 并重设 Alignment**（修复宽度压缩）；
3. 背景非 none 时仍使用 app 原有 box（不扩成 30mm）。

selftest 新增 `labelCenter`（宿主级 3×2 场景：page 170×120、crop={5.546,10,150×95}、trimMargin=1、
bottom-center Arial 11、锚点 42.5/127.5mm；宿主扩展后 final crop.x=4.546mm）：
- 期望编号中心 **37.954 / 122.954mm**；`pdftotext -bbox` 实测 **37.928 / 122.951mm**
  → 误差 **-0.026mm / -0.003mm**（≤0.5mm，通过）；
- trim=0 四边余量仍 **1.02mm**（trim=2 为 2.03–2.20mm）、底部编号墨迹 278px（不裁）、**0 位图**；
- 样例：`selftest\vector-pdf-label-center.pdf`。

#### v1.4.1：编号垂直位置 WYSIWYG（Test6/config1 场景）

用户 Test6 中 (c) 在 PDF 里比预览下移约 0.48mm。应用 v1.4.1 在 label spec 中新增预览 SVG
`getBBox` 的实际文字边界 `textLeftMm/textTopMm/textWmm/textHmm`。宿主改为：

1. **水平保持 v1.4.0 已验证的锚点方案**（`label.XMm`+对齐方式，不用 BoundLeft 改水平位置）；
2. **垂直用 `TextFrame2.TextRange.BoundTop/BoundHeight`** 读取 PowerPoint 实际文字 bbox 中心，
   把 `textTopMm+textHmm/2-crop.y` 作为目标，写回 `shape.Top` 并重设 Alignment；
3. 文本/字体/对齐设置完成后重新写回 `shape.Width/Height/Left/Top`（修复 WordWrap=false 压缩宽度问题）；
4. Bound 不可用时按 `0.15 × fontSizePt` 做 leading 兜底补偿，并写 diagnostics；
5. 背景非 none 的标签仍保留 app 原背景 box。

config1 精确场景（2 行×3 列 / 170mm / 4:3 / colGap=-4 / rowGap=1 / autoPad、bc/inset1.5/
offsetX1/offsetY4/Times 9pt、trim=0）selftest 通过捕获 app 实际 spec + 宿主 trace 最终 crop 后校验：
- 垂直误差：top **0.154mm**、bottom **0.072mm**、center **0.113mm**（判据 ≤0.35mm）；
- 水平中心误差 **-0.011mm**（判据 ≤0.05mm）；
- PDF 0 位图；trim 四边余量仍 ≈1–1.2mm、底部编号墨迹 328px 不裁；
- 样例：`selftest\config1-label-wysiwyg.pdf`。

### 7.7 配置模板外部持久化（v1.4.2）

用户反馈“更新后配置模板丢失”。根因是测试清理时删掉了 `%LOCALAPPDATA%\FigurePlay\WebView2`（WebView2 用户数据），
而不是正常升级逻辑；但为发布质量，v1.4.2 把配置模板迁到宿主本机文件并自动备份：

- 正式路径：`%APPDATA%\FigurePlay\configs\profiles.json`（Roaming，与 WebView2 缓存解耦）；
- 每次保存：临时文件 → `File.Replace` 原子替换 → 旧文件进入 `backups\profiles-<UTC时间戳>.json`，
  最多保留 20 份；UTF-8；最多 100 个配置、JSON ≤2MB；
- 配置模块启动时通过 `FP.desktop.loadConfigProfiles()` 从宿主读取，并与 localStorage 合并迁移；
  每次保存/删除/导入调用 `saveConfigProfiles(profiles)` 写回；
- `--selftest` 使用 `<outDir>\configs` 隔离目录（本机为 `desktop\selftest\configs`、`desktop\selftest-single\configs`），
  真实 `%APPDATA%\FigurePlay\configs` 在自测期间**不存在/未被写入**；selftest 的 WebView2 使用独立
  `WebView2-selftest` 用户目录，清 localStorage 不会碰用户数据。

selftest（`configPersistence`）实测（多文件 / 单文件一致）：
- 保存 2 个配置 → `selftest\configs\profiles.json`（829B，1 个配置）+ `backups\profiles-20261106-135520.json`（1527B）存在；
- `loadConfigProfiles` 回读 2 个 → 删除后保存 1 个 → 文件同步 1 个、备份保留；
- 清空 WebView2 selftest localStorage + `location.reload()` → 宿主文件恢复配置（reloadRecovered=True，
  页面存储提示显示本机路径）；新 store 实例重新 Load 也可读（模拟重启/升级）；
- 真实 APPDATA 路径检查：`%APPDATA%\FigurePlay\configs` 自测前后均不存在/未变化（realAppDataUntouched=True）。

### 7.8 v1.5.0 桌面发布基础设施

- **X 关闭提示**：`ClosePrompt.cs` 自定义 WinForms 对话框（最小化/退出程序/取消 + “记住本次选择”），
  默认选中最小化；记住值写入 `%APPDATA%\FigurePlay\prefs.json`，下次直接执行；最小化不关闭
  WebView2/PowerPoint；`--selftest` 不弹 UI（隔离 `<outDir>\prefs.json`）。
- **配置备份 API**：`list-config-backups`→`config-backups`、`read-config-backup`→`config-backup`；
  仅允许 backups 目录内 `profiles-*.json`，路径穿越被拒绝；应用侧“恢复上一份备份”按钮可用。
- **全页矢量 PDF**：`export-vector-pdf-multi`→`vector-pdf-export-multi`；同一 PowerPoint presentation
  多张幻灯片、一次 SaveAs 多页 PDF；每页复用单页 FillSlide（标签/trim/背景一致）；页面尺寸不一致返回中文错误。
- **安装器/卸载器**：`desktop\installer\install.ps1` 无管理员安装到
  `%LOCALAPPDATA%\Programs\FigurePlay`（开始菜单快捷方式，可选桌面）；`uninstall.ps1` 默认保留
  `%APPDATA%\FigurePlay` 与 `%LOCALAPPDATA%\FigurePlay`（仅 `-RemoveUserData` + 输入 DELETE 才删）。
- **可配置更新**：`%APPDATA%\FigurePlay\update.json`（`{enabled,manifestUrl}`，默认不存在=不联网）；
  `check-update`→`update-info`（currentVersion/latestVersion/hasUpdate/notes/url/configured），
  `download-update`→`update-downloaded`；强制 HTTPS + SHA256 校验，校验通过后下载到临时目录并提示手动替换
  （不做无校验自动替换），失败清理并中文报错。

v1.5.0 selftest 新增证据：`updateChecks`（无配置不联网/HTTPS 强制/版本比较/SHA256）、`closePrefs`
（记住最小化 round-trip、真实 APPDATA 未写）、`vectorPdfMulti`（2 页、0 位图、(a)/(b) 标签、
页面尺寸不一致报错）、`configPersistence` 扩展 list/read/防穿越。

### 7.9 v1.5.0 产物

| 文件 | 大小 | SHA256 |
| --- | --- | --- |
| `dist\FigurePlay.exe` | 398,336 B | `1ED3A8E2BA489F8C24C74B36B37DE19CF21F1D4A7871A101EFF2682C355F8277` |
| `dist-single\FigurePlay.exe` | 901,632 B | `AE1869D7E8B3258C066CD70EDBAD94FF57E96DCE5029E230758D1CA91CFF3926` |
| `FigurePlay-desktop-1.5.0-win-x64.zip` | 862,139 B | `97269D5C7DB59FA4CDF3F70409AB1880E2F9735CB32D7CB5952BB51890878358` |
| `FigurePlay-1.5.0-single-win-x64.zip` | 890,997 B | `BC11C13CC725098C6E32F35AC3C230209A7D0C170F9623E53E855899E6183846` |

`dist\wwwroot` 24/24 与冻结源逐字节一致；app.js 168,367B `2B200B6B…`、config-profiles 24,175B
`10221EDD…`、desktop.js 12,078B `08D6915E…`、updates.js 4,227B `6D983310…`、util 17,788B `58227AEC…`。
双 selftest 均 exit 0（多文件 136.6s / 单文件 180.5s），冷导出 29.1s→0.78s，POWERPNT 残留 0。

### 7.10 v1.5.1 关闭提示/托盘/原生保存

- X 关闭提示改为自适应布局：按钮 AutoSize + 最小宽度，**「退出程序」完整显示**（selftest 校验按钮宽度/文字）；
  最小化文案改为「最小化到托盘」，默认按钮仍是最小化。
- 正常模式 NotifyIcon 托盘：右键菜单「显示主窗口 / 退出程序」、双击恢复、Hide/Show、首次最小化气泡提示；
  selftest 不创建托盘、不弹 UI；prefs 仍写 `%APPDATA%\FigurePlay\prefs.json`。
- `save-file` 原生保存桥：JS → Host `{type:'save-file',suggestedName,filterName,filterExtensions,base64}`，
  宿主 SaveFileDialog 写文件 → `file-saved {ok,path,bytes,canceled,error}`；selftest 自动写隔离
  `<outDir>\save-file`，校验路径安全/非法 base64 拒绝，不弹真实对话框；允许大工程文件（上限 512MB）。
- 隔离正常模式实测（single exe + `--data-dir/--webview-data-dir` 指向临时目录）：
  记住退出 → 启动器 exit 0；记住最小化到托盘 → 窗口隐藏、进程存活、无对话框；真实 APPDATA/WebView2 未写。
  工程/配置/PNG 的正常保存均由 App 调用 `saveFile` 弹出选择框（对话框交互需人工确认，selftest 覆盖桥写文件逻辑）。

### 7.11 v1.5.1 产物

| 文件 | 大小 | SHA256 |
| --- | --- | --- |
| `dist\FigurePlay.exe` | 425,472 B | `FEF7834F9CA415D9CC89BB70CE43FB54C4A6D283E12A7A28B666DB1D02AFA01F` |
| `dist-single\FigurePlay.exe` | 915,968 B | `7B68CF595563AFECDFFA5C35298AFC69E426E07A4E1E5B9BC6754978D712E26A` |
| `FigurePlay-desktop-1.5.1-win-x64.zip` | 876,462 B | `D3E41B1BED808BC13316AFA9DAF406712CC2E7CF88DF64694F3BD7B15BF254BC` |
| `FigurePlay-1.5.1-single-win-x64.zip` | 905,294 B | `D0DAFF2BB79A83654195DA34CF826B75F099A2D9C4F9801C95158E6D7707A4EF` |

`dist\wwwroot` 25/25 逐字节一致；app.js 169,700B `9B0C9A33…`、desktop.js 14,779B `33141C77…`、
config-profiles 24,871B `81DEF164…`、project-file 7,318B `DD15025A…`、logs 5,288B `76D5411E…`、util `8F979CA2…`。
双 selftest exit 0（多文件 128.8s / 单文件 169.9s）；两个 zip 解压复跑 exit 0。
真实 WebView2 桥 E2E：`__UPDATES__.check()` → update-info 21ms（latest=1.5.2），`downloadUpdate()` → update-downloaded
13ms（SHA256 校验、manual=True、不覆盖测试 exe）；`FP.desktop.saveFile()` 工程/配置/PNG 分别 9/2/2ms 立即 resolve。

### 7.12 v1.5.2 保存取消修复与界面反馈

- 应用修复：工程/配置/日志在原生保存对话框**取消后不再回退** showSaveFilePicker/download，不写文件；
  dialog 可拖动、背景虚化（新增 `js/dialog-drag.js`）；主题色精简（selftest 改为 dark/blue）。
- 真实 WebView2 E2E（`saveCancelE2E`）：stub 宿主返回 canceled 后调用冻结 app 的
  `__PROJECT_FILES__.save` / `__CONFIG_PROFILES__.exportProfile` / `__DIAG_LOGS__.export`：
  **picker 调用 0、download 调用 0、工程/配置/日志均不落盘**；恢复真实宿主 saveFile 后三条成功路径均写文件
  （工程/配置/日志 file=True）。真实更新 UI E2E 同时保持：`__UPDATES__.check()` 18ms、`downloadUpdate()` 15ms。
- 正常模式隔离 X/托盘回归：prefs 隔离；记住退出→exit 0、记住最小化→窗口隐藏进程存活；真实 APPDATA 未写。

### 7.13 v1.5.2 产物

| 文件 | 大小 | SHA256 |
| --- | --- | --- |
| `dist\FigurePlay.exe` | 434,688 B | `9AD6FE426BC04EC8F6898BD09EFCD0A58610D51C58ACD47F43E096A68D502C91` |
| `dist-single\FigurePlay.exe` | 920,064 B | `1108C89D62555771D1863338655A424AA67148E110AF603B4B4BB92F2F0AD6D1` |
| `FigurePlay-desktop-1.5.2-win-x64.zip` | 880,508 B | `F6E786644A7D4E2A052728A182852024ECC1C4A026919FBD253FF255A625FE8D` |
| `FigurePlay-1.5.2-single-win-x64.zip` | 909,246 B | `93574AFA990134CCA03746577CDA60D2DCE550DB59EF10757F949ED1F395BED5` |

`dist\wwwroot` 26/26 逐字节一致（含 dialog-drag.js）；双 selftest exit 0（多文件 133.7s / 单文件 135.2s）；
两个 zip 解压复跑 exit 0（saveCancelE2E/updateE2E/saveFileE2E/closePrefs/appearance 全 True）。

---

## 8. `--selftest` 自测

### 8.1 用法

```powershell
dist\FigurePlay.exe --selftest --out E:\FigurePlay\desktop\selftest
dist\FigurePlay.exe --selftest --out .\selftest --screenshot .\selftest\my-shot.png
```

- 未指定 `--out` 时默认写到 exe 同级 `selftest\`；`--screenshot` 可单独指定截图路径；
- 退出码：**0 = 全部通过，1 = 失败**（构建脚本据此判断）；
- 单文件版同样支持：`FigurePlay.exe --selftest --out ...`（启动器自解压后透传参数并回传退出码）。

### 8.2 自测步骤与判据

| 步骤 | 内容 | 通过判据 |
| --- | --- | --- |
| 启动 | 离屏窗口加载 `https://figureplay.local/index.html` | `NavigationCompleted` 成功 |
| 应用就绪 | 轮询 `window.__FIGPLAY__.ready`（上限 60 s） | 为 `true` |
| 桌面布局（三栏回归） | 默认窗口下量测 `.panel-left` / `#stage` / `.panel-right` | 三栏并排不堆叠、`#stage` 宽 ≥250px、无横向溢出 |
| 外观主题冒烟（v1.3.4） | WebView2 内 `__FIGPLAY__.setAppearance('dark','violet')` → 校验 html data-*、body 深色、`#figure-shell` 白；再恢复 `light/blue`；深/浅/恢复各导出一次 PNG 做逐字节比对 | `html[data-theme=dark]`/`data-accent=violet`、body 亮度 <110、figure-shell 白；深色与恢复后 PNG 均与浅色基准**逐字节一致**；console error 增量 0 |
| 编号中心/锚点（v1.4.0） | 宿主级 3×2、bottom-center Arial 11、crop.x=5.546mm、trimMargin=1；`pdftotext -bbox` 提取 (a)/(b) 文本中心 | 文本中心 = cellCenter - finalCrop.x（±0.5mm；本机误差 -0.026/-0.003mm）；四边余量 1.02mm、底部编号墨迹 278px、0 位图 |
| config1 编号 WYSIWYG（v1.4.1） | 应用内恢复 config1：2行×3列/170/4:3/colGap-4/rowGap1/autoPad、label bc/inset1.5/offsetX1/offsetY4/Times9、trim0；包装 `exportVectorPdf` 捕获 spec（含 text bbox），宿主 trace 取最终 crop，`pdftotext -bbox` 对 (a) 校验 | 垂直 top/bottom/center 误差 ≤0.35mm（本机 0.154/0.072/0.113mm）、水平中心 ≤0.05mm（本机 -0.011mm）、0 位图 |
| 配置持久化（v1.4.2） | JS 桥保存 2 个配置 → 文件/备份 → 删除后保存 1 个 → 清 selftest WebView2 localStorage + reload → 从宿主文件恢复；检查真实 APPDATA 未写 | `<outDir>\configs\profiles.json` 存在且配置数同步（2→1）、backups 时间戳文件存在、reload 后恢复 ≥1 个、真实 `%APPDATA%\FigurePlay\configs` 未被写入；失败项不通过 |
| 测试 EMF | `Metafile` 录制 900×600 EMF，保存为**真实 EMF**（文件头 01 00 00 00），以字节重建原生 `CF_ENHMETAFILE` 放入剪贴板 | 写入成功且 EMF 头校验通过 |
| C# 转换 | 调用桥同一转换函数读取剪贴板 → PNG | `ok=true`、`sourceFormat=EMF`、宽度 4000–5200、PNG 签名正确、非空白、体积 <8MB |
| 桥端到端 | 网页端真实 `postMessage` 发 `read-clipboard-image`，探针捕获宿主响应 | 收到且 `ok=true`；`emfBase64` 为真实 EMF、可被 `System.Drawing.Metafile` 重新打开、记录数/边界合法、与写入剪贴板的文件一致 |
| 应用 JS 桥 | 直接调用应用 `FP.desktop.readClipboardImage()` | Promise resolve，返回 4400px EMF PNG |
| MATLAB .fig | 调用 MATLAB 现场生成临时 `.fig`，通过真实 `import-fig` 桥导入 | 收到 `fig-imported ok=true`、600dpi 尺寸（4000±）、`sourceFormat=MATLAB-FIG`、PNG 非空白、`emfBase64` 为真实 EMF；MATLAB 不可用时记 skipped |
| 宿主矢量 PDF | 宿主级 spec（170×120mm、1 个真实 EMF 面板、标签）→ `export-vector-pdf` | PDF 页尺寸 481.92×340.08pt、`pdfimages` 无位图、`pdftotext` 有标签文字、`vectorPanels=1`/`rasterPanels=0` |
| crop+trimMargin 矢量 PDF | 实心 EMF + `crop {10,10,150,100}` + stretch，`trimMarginMm` 分别 1/2mm | 页尺寸 = (150+2m)×(100+2m)mm（本机 152.02×101.98 / 154.01×103.97mm）、渲染四边余量 ≈m（±0.5mm）、0 位图 |
| 应用矢量 E2E | JS 构造 File 注入 `#file-input` 导入 `.fig` → 等 cell 有数据且 `getVectorStatus().emfCount>0` → `setExportOptions({format:'pdf',vectorPdf:true,saveAs:false})` → `exportVectorPdfBase64()` | 应用生成的 PDF 页尺寸=geom（170×193mm → 481.92×547.08pt）、无位图、标签文字存在、`vectorPanels≥1`/`rasterPanels=0` |
| 应用矢量 trim E2E（v1.3.2） | 同一页面 `setExportOptions({trimPdf:true,trimMarginMm:0})` → `getInkCropBox()` + `exportVectorPdfBase64()`；再做底部中间编号 trim=0/2mm 两个用例 | 四边渲染余量 = max(1,trim)±0.5mm（本机 1.02/1.02/1.02/1.02mm 与 2.03/2.03/2.20/2.20mm）、0 位图、`rasterPanels=0`；底部编号条带存在墨迹 + `pdftotext` 提取到 `(a)`；无残留 POWERPNT |
| PowerPoint 持久会话（v1.3.3） | 连续多次导出复用同一 `PowerPoint.Application`；记录冷/热 exportMs；结束显式 shutdown | 热导出至少比冷导出快 3s 或 ≤75%（本机 26.9s → 0.53s，-98%）；shutdown 后**残留 POWERPNT=0**；用户原有实例不受影响 |
| PowerPoint 进程 | 导出前后快照 `POWERPNT.EXE` | 只记录 owned PID，不在单次导出后强杀（持久会话）；selftest 结束 shutdown 后断言残留 0 |
| 保存 API | 在 WebView2 中探测 `typeof window.showSaveFilePicker` 与 `isSecureContext` | 报告探测结果（不弹系统对话框；本机实测均支持） |
| host-ready | 网页端探针捕获 `host-ready` | 收到且 version=1.3.2（与 BridgeProtocol.HostVersion 一致） |
| 截图 | `CoreWebView2.CapturePreviewAsync`（离屏加载后临时移到屏幕内） | 生成非空白 PNG（1601×1001） |
| console | 页面探针（`console.error` / `window.onerror` / `unhandledrejection`） | 0 条 |
| 日志 | 写 `<out>\selftest-report.json` | 成功时 `success=true` |

> 说明：WebView2 SDK 1.0.4314.x 的 `CoreWebView2` 没有 `ConsoleMessageReceived` 事件，
> 因此宿主在 `AddScriptToExecuteOnDocumentCreatedAsync` 中注入 `window.__figplayConsoleErrors`
> 探针来收集 console error 与未捕获异常（效果等价且能捕获 `window.onerror`）。

### 8.3 自测输出文件

```
selftest\
├─ selftest-report.json      ← 完整 JSON 日志（环境、layout、剪贴板/EMF、桥、MATLAB .fig、矢量 PDF/crop/trim、PowerPoint 冷热会话、应用 E2E、截图、console、耗时）
├─ test-figure.emf           ← C# 录制的真实 EMF（文件头 01 00 00 00）
├─ clipboard-test.png        ← 经 C# 转换得到的 4400px PNG（可人工检查清晰度）
├─ matlab-test-figure.fig    ← MATLAB 现场生成的测试 .fig
├─ matlab-source-figure.emf  ← MATLAB `print -dmeta` 导出的真实 EMF
├─ fig-import-test.png       ← 经真实 import-fig 桥导入的 600dpi PNG
├─ vector-pdf-test.pdf       ← 宿主级矢量 PDF 样张（170×120mm，0 位图）
├─ vector-pdf-crop-trim1mm.pdf / .png ← crop+1mm 安全边距样张（152×102mm，渲染余量 ≈0.7–0.85mm）
├─ vector-pdf-crop-trim2mm.pdf / .png ← crop+2mm 安全边距样张（154×104mm，渲染余量 ≈1.7–1.9mm）
├─ vector-pdf-label-center.pdf ← 编号锚点/中心样张（3×2 bottom-center，crop.x=5.546mm）
├─ config1-label-wysiwyg.pdf ← config1（2×3/负间距/底部编号）WYSIWYG 样张
├─ app-vector-e2e.pdf        ← 应用级 E2E 样张（JS 注入 .fig → exportVectorPdfBase64，170×193mm）
├─ app-vector-e2e-trimmed.pdf / .png    ← 应用级 trim 基础用例（77.39×60.11mm，余量 ≈0.85–1.02mm）
├─ app-vector-trim-label-1mm.pdf / .png ← 底部中间编号 + trim=0 安全边距 1mm 样张（72.94×65.53mm，余量 1.02mm）
├─ app-vector-trim-label-2mm.pdf / .png ← 底部中间编号 + trim=2mm 样张（74.93×67.56mm，余量 2.03–2.20mm）
├─ configs\profiles.json    ← selftest 隔离的配置持久化文件（正常模式在 %APPDATA%\FigurePlay\configs）
└─ configs\backups\profiles-*.json ← 保存时自动生成的时间戳备份（selftest 隔离样本）
└─ screenshot.png            ← 应用窗口截图（上传 .fig + 底部编号后）
```

本机（Windows 10.0.26200 / WebView2 156.0.4314.58 / MATLAB R2024b / PowerPoint 2021）v1.4.2 候选包结果：
**多文件版与单文件版均 exitCode 0**（串行执行）。应用版本 1.4.2、host-ready 版本 1.4.2、exe FileVersion 1.4.2.0；
应用就绪 ~22–46 ms；三栏布局 CSS 视口 1067×667、grid 244+527+296 px；EMF→PNG 4400×2933（~164 KB）；
桥端到端 ~367–539 ms；应用 JS 桥 ~350–356 ms；MATLAB `.fig` 转换 ~34–42s；
PowerPoint 首次导出 26.9s / 27.9s（冷启动 ~23.2–24.8s）→ 后续 0.55s / 0.79s（提速 97.2–97.9%），连续 7 次复用；
**配置模板持久化（v1.4.2）**：保存 2 个→`<outDir>\configs\profiles.json`（829B）+ 时间戳备份（1527B）；
删除后同步 1 个；清 WebView2 selftest localStorage + reload 后从宿主文件恢复；真实 APPDATA 未被写入；
**config1 编号 WYSIWYG**：垂直 top/bottom/center 0.154/0.072/0.113mm（≤0.35mm）、水平 -0.011mm（≤0.05mm）；
编号中心锚点 -0.026/-0.003mm；trim=0 四边 1.02/0.85/1.19/1.19mm、底部编号墨迹 328px；trim=2 四边 2.03–2.20mm；
外观主题冒烟通过；selftest 结束显式 shutdown 后 POWERPNT 残留=0；console error 0；截图 1601×1001。
整轮自测：多文件版 **166.5 s**、单文件版 **145.3 s**；完整构建（含双自测）**326.3 s**。

### 8.4 v1.4.2 候选包核对

| 文件 | 大小 | SHA256 |
| --- | --- | --- |
| `dist\FigurePlay.exe` | 352,768 B | `C44C9AE96A7DCDBE0363B2460D04CF4BA74FEC9565247F0432C7CE12B33DE46B` |
| `dist-single\FigurePlay.exe` | 871,424 B | `5301FFB930E5EA9017E60585D0FE03093B7D8D7856804183AEC4F8FEFA579B05` |
| `FigurePlay-desktop-1.4.2-win-x64.zip` | 832,152 B | `C0D9FB54485B7999AA2EBDC1ADE7E2538DA4112CEA2EC4CD86498C4A7B7FD675` |
| `FigurePlay-1.4.2-single-win-x64.zip` | 861,214 B | `901DD188F77612C503BF0063CDE275252EDEB3E19C7DA877F48FC39476E1926E` |
| `wwwroot\index.html` | 44,960 B | `1596D3BAB17FFD0A37917E1A4CB7F73C7A7C5E455498D5F7ED251AF343394334` |
| `wwwroot\assets\styles.css` | 41,031 B | `7CE9D1C382A4BA4F069C6E94AD6BF97F6E20FB36A1239803A61206F6F36FA86E` |
| `wwwroot\assets\theme.css` | 6,988 B | `D23C9F653AA27E782629406676B4D0C3980F6A7F91B7657707DC51A63F0B05FE` |
| `wwwroot\js\app.js` | 162,221 B | `BA1049D6E5C549A46B9902A4DC69A968D0142E6EC645AF6415CB3241C02573F4` |
| `wwwroot\js\appearance.js` | 5,109 B | `62093AE77A7A5770F0139C41A23004BC58F420384A3FE0DF6B514642C1EF3AB2` |
| `wwwroot\js\config-profiles.js` | 21,576 B | `45D3F12A8671352DE3B6653EDE1951BBFFA55C443D4BE7BE009AE7171393FDBF` |
| `wwwroot\js\desktop.js` | 9,316 B | `960C4F3A5741DF48CB3CD2A93BF32499E2502E5A2DE357DC38B8728F04F89041` |
| `wwwroot\js\layout.js` | 18,898 B | `094EEDC49361D43C9CF16CFBB556A2914C72EC846B48353F5F8BC6F497BB5C8F` |
| `wwwroot\js\render-svg.js` | 17,116 B | `6DBA2AE85D3B9F83AFD87BF967BECE41CB14A92655089F60EFADCD6AA21679E9` |
| `wwwroot\js\util.js` | 17,788 B | `273ACE1040431DA93812CE3E5A740E47DEBE5AEAE7874D02C0C0B485CB493B93` |
| `wwwroot\js\export.js` | 15,133 B | `C73BCBB7C1B70CCE4613D67BEBC030FA9BBE778DE049B2971118DC1C19C1CF0D` |
| `wwwroot\js\pdf.js` | 6,260 B | `F3B2B1FBCD31C7B2167843C34872697FF9ADCD84A1DB2CA552FFE5A15578D7A3` |
| `wwwroot\js\zip.js` | 3,940 B | `11C6D96644B1D15500F3E542A14A6D14314F97807DEC7EFA5C2A41B6DACA644F` |

> 校验：`dist\wwwroot` 共 **20 个文件**（v1.3.4 新增 `assets\theme.css`、`js\appearance.js`；v1.4.0 新增
> `js\config-profiles.js`）与构建时 `E:\FigurePlay` 冻结源逐一哈希一致（应用源已冻结）；
> 两个 zip 均已解压到干净目录复跑 `--selftest`（exit 0，串行）；`dist-single\` 与单文件 zip 内均
> **只有 1 个 `FigurePlay.exe`**；正常模式启动/关闭退出码 0。`wwwroot` 不包含 `.gitattributes`/`.gitignore` 等开发文件。
> selftest 在桥测试前会重新写入测试 EMF（防止外部程序复制导致剪贴板被覆盖而偶发失败）。

### 8.5 外观主题冒烟（v1.3.4，WebView2）

应用 v1.3.4 新增界面外观（浅色/深色/跟随系统 + blue/indigo/teal/emerald/violet/rose/amber 7 种主题色），
实现上只改 `<html>` 的 `data-theme`/`data-theme-mode`/`data-accent` 与 CSS 变量，不重绘图稿、不影响导出。
桌面 selftest 在 WebView2 内做冒烟：

1. `__FIGPLAY__.setAppearance('light','blue')` 记录浅色基准（body 亮度、`#figure-shell` 背景）并导出一次 PNG；
2. `setAppearance('dark','violet')` 后校验 `html[data-theme=dark]`、`data-accent=violet`、body 深色
   （本机亮度 17.5）、`#figure-shell` 仍为白色；再导出 PNG 与浅色**逐字节比对**；
3. 恢复 `setAppearance('light','blue')`，校验属性/背景恢复、PNG 仍与基准一致；
4. 全程 console error 增量为 0。

本机结果：深色/violet 冒烟通过；深色与恢复后 PNG base64 长度均 156,472 且与浅色完全一致（True/True）；
恢复后 body 亮度 245.9；`consoleErrorDelta=0`。说明主题切换只影响界面 CSS，不会改变 figure 内容与导出结果。

---

## 9. MATLAB 使用提示

1. **矢量剪贴板**：MATLAB 图形窗口菜单 **编辑 → 复制图形（Copy Figure）**，回 FigurePlay 点粘贴
   （或 `Ctrl+V`）；默认 EMF 会插入 4400px/~650dpi 的高清 PNG，并保留真实 EMF 供矢量 PDF。
   旧版本也可 `print(gcf, '-clipboard', '-dmeta')`。
2. **.fig 文件**：直接在 FigurePlay 里上传/拖入 `.fig`，桌面版自动调 MATLAB 转换（需要本机 MATLAB R2020a+）；
   输出 600dpi PNG（如 4004×2898），并尽量同时保留真实 EMF，随后可直接导出矢量 PDF。
   转换较慢（首次 10–40 s）时网页端会显示“正在调用 MATLAB 转换 .fig…”。
3. **矢量 PDF**：导出格式选 PDF 且页面含 EMF/.fig 子图时，桌面版会用本机 PowerPoint 生成矢量 PDF
   （需 PowerPoint 2016+，首次约 20–40 s）；可勾选“裁剪白边”（crop，v1.3.2 起自动做二次墨迹校正并
   保留至少 1mm 安全边距，底部编号不会被裁；trim=0 时四边约 1mm）。没有 PowerPoint 时自动回退位图 PDF。
4. 若粘贴提示「剪贴板中没有可识别的图像」：确认复制的是图形而非文本/表格；剪贴板管理器/远程桌面
   可能占用剪贴板，重试或关闭占用程序。
5. `.fig` 失败排查：
   - 提示“未找到 MATLAB”：按第 6.2 节配置路径；
   - 提示“许可校验失败”：先手动打开 MATLAB 确认许可证正常；
   - 提示“无法读取该 .fig”：文件可能损坏或由更高版本 MATLAB 保存，请用同版本/更新版本重新保存。

---

## 10. 已知限制 / 排障

| 现象 | 说明与处理 |
| --- | --- |
| 启动提示缺少 WebView2 Runtime | 安装 <https://go.microsoft.com/fwlink/p/?LinkId=2124703>，Win10/11 一般已自带 |
| 窗口白屏 / 加载失败 | 确认 `dist\wwwroot\index.html` 存在且完整；重新运行 `build.ps1` |
| SmartScreen 提示 | 无代码签名证书；「更多信息 → 仍要运行」；企业可自行签名 |
| 单文件版首次启动稍慢 | 首次需解压内嵌 payload（约 1 秒）；之后复用 `%LOCALAPPDATA%\FigurePlay\bin\app-<hash>` |
| 单文件版杀软误报 | 自解压 exe 较易被扫描；可把 `%LOCALAPPDATA%\FigurePlay\bin\` 加入信任或改用多文件版 |
| 剪贴板读取失败 | 已在代码内重试 2–3 s；仍失败时关闭剪贴板管理器/远程桌面剪贴板同步后重试 |
| EMF 个别记录渲染异常 | GDI+ 播放器对极端 EMF（EMF+ 部分记录、超大图）存在兼容差异；可改用 MATLAB `exportgraphics` 输出 PNG 后粘贴 |
| .fig 转换慢 / 超时 | MATLAB 冷启动可能接近 100 s；已设 120 s 超时。超时后重试通常第二次更快；长期在网络许可环境请先确认 MATLAB 可独立启动 |
| .fig 版本不兼容 | `.fig` 由更高版本 MATLAB 保存时可能无法用低版本打开；用对应/更新版本 MATLAB 另存为 PNG 或 EMF 再粘贴 |
| 矢量 PDF 需要 PowerPoint | 需要本机桌面版 PowerPoint 2016+（COM）；未安装/COM 失败会返回可读错误，应用自动回退位图 PDF。首次导出约 20–40 s 启动 PowerPoint，超时 120 s（含二次墨迹校正组版） |
| 矢量 trim 安全边距 | v1.3.2 起 trim 输出页 = 实际 ink bbox + `trimMarginMm`（应用发送 max(1, 用户留边)）；trim=0 时四边约 1mm、trim=2mm 时约 2mm，编号等贴边内容不会被裁；页面可能比 app 预览 crop 略小/略大（EMF 与 PNG 基准差） |
| 墨迹校正探针失败回退 | PowerPoint 的 PNG 探针导出失败时，会保留 app 传入 crop 直接导出（可能仍有 1–2mm 白边或边界偏差），diagnostics 记录原因，不阻塞导出 |
| PowerPoint 常驻后台（v1.3.3） | 首次导出/预热后 POWERPNT 会保留在后台以加速后续导出；应用正常退出/关闭窗口、selftest 结束会显式关闭自己启动的实例。若应用被强杀可能残留，重新打开应用或任务管理器结束即可；用户原本打开的 PowerPoint 不会被关闭 |
| PowerPoint 预热 | 主窗口就绪后延迟 1.5s 后台启动 PowerPoint（不显示窗口、不创建演示文稿），失败静默；`--selftest` 不预热以便测冷启动 |
| 界面主题不影响导出 | v1.3.4 外观（深色/主题色）只改 CSS 变量与 data-* 属性，不重绘图稿；selftest 已逐字节比对深色/浅色 PNG 一致，`#figure-shell` 在深色下仍为白色 |
| 编号位置一致性（v1.4.0） | 矢量 PDF 标签按真实锚点 `label.XMm` 定位并写回文本框几何（PowerPoint WordWrap=false 会压缩文本框）；selftest 3×2 bottom-center 编号中心误差 ≤0.03mm；与预览/裁边后的位置一致 |
| 编号垂直 WYSIWYG（v1.4.1） | app 发送预览文字 bbox（textLeftMm/textTopMm/textWmm/textHmm）；宿主水平保持锚点方案、垂直用 TextFrame2 BoundTop/BoundHeight 对齐文字 bbox 垂直中心；config1 实测垂直误差 0.072–0.154mm、水平 -0.011mm；Bound 不可用时按 0.15×字号 leading 兜底 |
| 配置模板持久化（v1.4.2） | 配置写 `%APPDATA%\FigurePlay\configs\profiles.json`（与 WebView2 缓存解耦），保存自动备份到 `backups\`（最多 20 份）；`--selftest` 用 outDir\configs 隔离且不写真实 APPDATA；浏览器模式仍用 localStorage |
| 配置 JSON 损坏 | 宿主返回可读错误（ok:false），不崩溃；前端回退 localStorage，旧配置不会被清空 |
| 矢量 PDF 复杂变换回退 | `cover` / `zoom` / `offset` 等非 contain/stretch 变换返回 `UNSUPPORTED_TRANSFORM`，前端回退位图 PDF；rotation 支持 |
| crop 无效时忽略 | crop 越界/过小会静默忽略，输出整页（不报错） |
| 高分辨率 PNG 体积 | EMF→PNG 目标 4400px；单张 PNG 超过 8MB 时会自动缩小重试，避免桥消息/内存过大 |
| PNG 伪装的假 EMF | 宿主只接受文件头为 `01 00 00 00` 的真实 EMF；PNG 改名/WMF 会被拒绝（`emfBase64` 不返回） |
| 剪贴板被 selftest 覆盖 | `--selftest` 会把剪贴板换成测试 EMF 且不恢复；MATLAB Copy Figure 联调前请重新复制图窗 |
| 高 DPI 下窗口缩得很小 | 可缩到最小 1180×700；150% 缩放下 CSS 视口约 787×467，会触发网页自身 ≤900px 堆叠布局（预期行为）；默认 1600×1000 下保持三栏 |
| 只支持 Windows x64 | 本版本固定 x64；32 位系统不适用 |
| 网页数据 | 存于 `%LOCALAPPDATA%\FigurePlay\WebView2`；卸载 = 删除 dist/单文件 exe 与该目录 |

---

## 11. 开发说明

- 主程序目标框架 `net48`，`PlatformTarget=x64`；`Microsoft.Web.WebView2 1.0.4314.35`（与已装 Runtime 156 对齐）、
  `Newtonsoft.Json 13.0.3`、`Microsoft.NETFramework.ReferenceAssemblies 1.0.3`（构建机无 VS 也能编译 net48）。
- 单文件版 `src\FigurePlay.SingleFile` 不引用 WebView2/Newtonsoft；它只负责：读取内嵌 `payload.zip` →
  SHA256 命名解压到 `%LOCALAPPDATA%\FigurePlay\bin\app-<hash>` → 启动其中主程序并等待退出/透传退出码。
- v1.3 新增：`EmfValidator.cs`（EMF 真伪校验）、`VectorPdfModels.cs` / `PowerPointVectorExporter.cs` /
  `VectorPdfService.cs`（PowerPoint 矢量 PDF + crop）、`SelfTestRunner.VectorPdf.cs` /
  `SelfTestRunner.CropPdf.cs` / `SelfTestRunner.AppVectorE2E.cs`（矢量 PDF、crop、应用级 E2E 自测）。
- v1.3.1：`PowerPointVectorExporter` 二次墨迹校正（slide.Export PNG 探针 + ink bbox，`LockAspectRatio=false`）、
  超时 120s、`SelfTestRunner.AppVectorE2E` trim E2E、宿主级 crop 自测改用心录制实心 EMF、
  排障日志 `%LOCALAPPDATA%\FigurePlay\temp\vectorpdf-trace.log`。
- v1.3.2：`VectorPdfModels.TrimMarginMm`（spec.trimMarginMm，0–20 默认 1）+ `AdjustCrop` 改为
  “整页 ink bbox + 安全边距”扩展（而非裁到零），收敛 ±0.5mm、最多 2 次；新增
  `SelfTestRunner.TrimMarginE2E.cs`（基础 trim + 编号底部中间 trim=0/2mm 用例，pdftoppm 像素级余量
  + 底部编号墨迹/文本完整性）；`SelfTestRunner.CropPdf.cs` 改为 trimMargin 1/2mm 宿主级用例。
- v1.3.3：新增 `Bridge\PowerPointHost.cs`（专用 STA 线程 + 持久 Application + owned PID 所有权 +
  预热/Shutdown/断连重建/超时重置）；`PowerPointVectorExporter` 拆出 `ComposeWithApplication`
  （不创建/退出 PowerPoint）；`VectorPdfService` 改为提交到 PowerPointHost；MainForm 就绪后后台预热、
  FormClosed 时 Shutdown；Program 退出兜底 Shutdown；selftest 新增 `powerPointLifecycle`
  （冷/热 exportMs、实例创建耗时、显式 shutdown、残留 POWERPNT 断言）。
- v1.3.4：应用新增 `assets\theme.css`/`js\appearance.js` 外观主题（宿主无代码依赖，仅 wwwroot 多 2 文件）；
  selftest 新增 `SelfTestRunner.Appearance.cs`（`setAppearance('dark','violet')` → data-theme/accent、body 深色、
  `#figure-shell` 白、PNG 导出与浅色逐字节一致、恢复 light/blue、console error 增量 0），并在生命周期报告外
  新增 `appearanceSmoke` 节点。
- v1.4.0：修复矢量 PDF 编号锚点——`Compose` 不再用 padded `BoxXmm` 当左边界，改按 `label.XMm`+对齐方式
  计算文本框（center/left/right），并在 WordWrap=false 压缩宽度后写回 `Width/Height/Left/Top`+Alignment；
  背景标签仍用 app box。新增 `SelfTestRunner.LabelCenter.cs`（宿主级 3×2 bottom-center + crop 偏移，
  `pdftotext -bbox` 校验编号中心误差 ≤0.5mm）；应用侧新增配置模板 `js\config-profiles.js`（wwwroot 20 文件）。
- v1.4.1：应用 label spec 新增 `textLeftMm/textTopMm/textWmm/textHmm`（预览 SVG 实际 getBBox）；
  宿主 `VectorPdfModels` 解析（可选字段）并在 `Compose` 中仅做**垂直** WYSIWYG 校正
  （`TextFrame2.TextRange.BoundTop/BoundHeight` 中心对齐 `textTopMm+textHmm/2-crop.y`；水平保持 v1.4.0
  锚点方案），Bound 不可用时按 `0.15×fontSizePt` leading 兜底；新增 `SelfTestRunner.Config1Label.cs`
  （包装 `FP.desktop.exportVectorPdf` 捕获真实 spec + 宿主 trace 最终 crop，`pdftotext -bbox` 校验
  config1 垂直/水平误差）；主流程把 lifecycle shutdown 移到所有 PowerPoint 用例之后。
- v1.4.2：新增 `Bridge\ConfigProfileStore.cs`（%APPDATA%\FigurePlay\configs\profiles.json，
  临时文件+File.Replace 原子写、时间戳备份最多 20、UTF-8、100 个/2MB 限制；selftest 用 outDir\configs）；
  `BridgeProtocol` 新增 load-config-profiles/save-config-profiles 协议与构造器；MainForm 接入并回包；
  `SelfTestRunner.ConfigPersistence.cs` 覆盖保存/回读/删除同步/清 localStorage+reload 恢复/真实 APPDATA 未写；
  selftest 的 WebView2 使用独立 `WebView2-selftest` 用户目录（不碰用户数据）。
- 修改 C# 后：`build.ps1` 自动编译 + 双自测 + 双 zip（双自测含 MATLAB 与多次 PowerPoint 导出，约 13–15 分钟）；
- 只改网页端（`E:\FigurePlay`）后：`build.ps1 -SkipBuild` 快速重打包（payload 会重新生成，单文件版随之更新）；
- 修改桥协议时同步改：`BridgeProtocol.cs` ↔ `E:\FigurePlay\js\desktop.js` ↔ 本文档第 4 节；
- `--selftest` 是回归基线，任何改动都应保持多文件版与单文件版退出码均为 0。
- 构建中间文件 `src\FigurePlay.SingleFile\payload\payload.zip` 由脚本生成、构建结束自动删除；
  `src\*\bin`、`obj` 为普通编译中间目录，可随时删除。
