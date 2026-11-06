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
4. **单文件发行版**：`FigurePlay.exe` 一个文件内嵌完整运行时与网页资源（主程序 exe、WebView2 托管 dll、
   `WebView2Loader.dll`、`wwwroot`），首次启动自解压到 `%LOCALAPPDATA%\FigurePlay\bin\app-<hash>`，
   从任意目录双击即可运行，不依赖旁边 dll/assets；仍依赖系统 **WebView2 Runtime**。

> 本候选包内嵌的是 **FigurePlay 应用 v1.3.0**（多页工程、子图分组、撤销/重做、autoPad、PDF trim 裁剪、
> 矢量 PDF + crop、saveAs 开关、`.fig` EMF 保留等）；`dist\wwwroot` 与构建时 `E:\FigurePlay` 源文件
> **逐字节一致**（17 个文件），桌面版桥协议见第 4 节。

技术栈：**.NET Framework 4.8**（Windows 10/11 自带运行时，最终用户无需安装 .NET）
\+ **Microsoft.Web.WebView2**（WinForms）。多文件版约 2.2 MB（dist 24 文件），单文件版约 **0.79 MB**（811,520 B）。

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
│   └─ wwwroot\                  ← 构建时从 E:\FigurePlay 复制的最新网页应用（v1.3：多页/分组/撤销/矢量 PDF/crop）
├─ dist-single\                  ← 单文件版（目录中只有 FigurePlay.exe）
│   └─ FigurePlay.exe
├─ selftest\                     ← 多文件版最近一次自测输出
├─ selftest-single\              ← 单文件版最近一次自测输出
├─ FigurePlay-desktop-1.3.0-win-x64.zip   ← 多文件版 zip
└─ FigurePlay-1.3.0-single-win-x64.zip    ← 单文件版 zip（只含一个 exe）
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
6. 运行 `dist\FigurePlay.exe --selftest`（布局三栏 / EMF / 桥 / 应用 JS 桥 / MATLAB `.fig` / 截图 / console）；
7. 把整个 `dist` 压成 `payload.zip` 并构建单文件启动器，输出到 `dist-single\FigurePlay.exe`（目录中只保留一个 exe）；
8. 在 **%TEMP% 干净临时目录**（只放一个 exe）运行单文件版 `--selftest`，验证自解压、旧版本目录清理、
   干净目录无旁置依赖；同时检查一次正常启动路径；
9. 生成两个 zip（多文件版 / 单文件版）；
10. 打印两个 exe 的路径/大小/SHA256、`app.js` SHA256、dist 大小、zip 大小、自测结果与总耗时。

> 构建机会跑两次完整自测（含两次 MATLAB 启动 + 两次 PowerPoint 矢量导出），总耗时约 **5–6 分钟**
> （本机实测 324.5s）。可用 `-SkipSingleFile` 只构建多文件版，或用 `-SkipSelfTest` 跳过自测。

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

- `dist-single\FigurePlay.exe` 或 `FigurePlay-1.3.0-single-win-x64.zip`；**只需这一个文件**，
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

- `crop` 可选：有效时 PowerPoint 页面尺寸 = `crop.wMm × crop.hMm`，所有 panels/labels 坐标相对原页面
  左上角减去 `crop.xMm/crop.yMm`；`crop` 越界/过小等无效情况**静默忽略**（输出整页），不报错。
- `fit`：`contain`（等比缩放居中，默认）/ `stretch`（填满）；`rotation` 通过 `shape.Rotation`；
  `cover` / `zoom` / `offset` 等复杂变换返回 `ok:false,error:"UNSUPPORTED_TRANSFORM"`，由前端回退位图 PDF。
- 超时 60 秒；转换在专用 STA 线程串行执行，不阻塞 UI；`vectorPanels`/`rasterPanels` 为送入引擎的
  EMF 面板 / 位图面板数量。

### 4.4 启动握手

```json
{"type":"host-ready","version":"1.3.0"}
```

宿主在收到网页端 `{"type":"app-ready","version":"..."}` 后立即回发（推荐路径），
或轮询到 `window.__FIGPLAY__.ready === true` 后回发（兜底），只发一次。

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
- WebView2 / .NET Framework 要求与其它功能相同。

### 7.2 实现与行为

- 在专用 **STA 线程**创建 PowerPoint 应用：`Presentations.Add(WithWindow=false)` 创建**无窗口**演示文稿，
  按 `mm/25.4*72` 设置页面尺寸；白/自定义背景；
- 每个面板写临时 EMF/PNG 文件后 `Shapes.AddPicture`：contain 等比缩放居中 / stretch 填满；rotation 用
  `shape.Rotation`；border 用 `shape.Line`；标签 `AddTextbox`（margin=0、wordwrap=false、字体/字号/粗斜/颜色/对齐、背景填充）；
- `SaveAs(pdfPath, 32 /*ppSaveAsPDF*/)` 导出 PDF，读 bytes 返回 base64；随后关闭 presentation；
- **不弹 UI**：不显示演示窗口、无模态对话框（PowerPoint 2021 不允许 `Visible=false`，但 `WithWindow=false`
  不会显示文档窗口）；不保存 pptx、不修改用户文件；临时图片/PDF 全部清理；
- **进程清理**：记录调用前的 `POWERPNT.EXE` PID；只 Quit/Kill **本次新启动**的实例，绝不关闭用户已打开的 PowerPoint；
  60 秒超时兜底同样只清理新进程；
- 坐标/单位：所有 mm → pt（×72/25.4）；crop 平移规则见 4.3。

### 7.3 实测结果（本机）

- 170×120mm 页面：**481.92×340.08 pt**、`pdfimages` 0 位图、`pdftotext` 可提取标签文字 `(a)`；
- crop 150×100mm：**425.28×283.56 pt**（期望 425.20×283.46 pt，偏差 <0.5mm）；
- 应用级 E2E（3×2 网格、170mm 成品宽）：**481.92×547.08 pt**、0 位图、标签文字存在；
- PowerPoint 单次导出耗时约 **23–27 秒**（含启动），进程退出后 `POWERPNT` 残留数为 0。

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
| 测试 EMF | `Metafile` 录制 900×600 EMF，保存为**真实 EMF**（文件头 01 00 00 00），以字节重建原生 `CF_ENHMETAFILE` 放入剪贴板 | 写入成功且 EMF 头校验通过 |
| C# 转换 | 调用桥同一转换函数读取剪贴板 → PNG | `ok=true`、`sourceFormat=EMF`、宽度 4000–5200、PNG 签名正确、非空白、体积 <8MB |
| 桥端到端 | 网页端真实 `postMessage` 发 `read-clipboard-image`，探针捕获宿主响应 | 收到且 `ok=true`；`emfBase64` 为真实 EMF、可被 `System.Drawing.Metafile` 重新打开、记录数/边界合法、与写入剪贴板的文件一致 |
| 应用 JS 桥 | 直接调用应用 `FP.desktop.readClipboardImage()` | Promise resolve，返回 4400px EMF PNG |
| MATLAB .fig | 调用 MATLAB 现场生成临时 `.fig`，通过真实 `import-fig` 桥导入 | 收到 `fig-imported ok=true`、600dpi 尺寸（4000±）、`sourceFormat=MATLAB-FIG`、PNG 非空白、`emfBase64` 为真实 EMF；MATLAB 不可用时记 skipped |
| 宿主矢量 PDF | 宿主级 spec（170×120mm、1 个真实 EMF 面板、标签）→ `export-vector-pdf` | PDF 页尺寸 481.92×340.08pt、`pdfimages` 无位图、`pdftotext` 有标签文字、`vectorPanels=1`/`rasterPanels=0` |
| crop 矢量 PDF | 同一 spec 加 `crop {10,10,150,100}` | PDF 页尺寸 ≈150×100mm（425.28×283.56pt）、无位图 |
| 应用矢量 E2E | JS 构造 File 注入 `#file-input` 导入 `.fig` → 等 cell 有数据且 `getVectorStatus().emfCount>0` → `setExportOptions({format:'pdf',vectorPdf:true,saveAs:false})` → `exportVectorPdfBase64()` | 应用生成的 PDF 页尺寸=geom（170×193mm → 481.92×547.08pt）、无位图、标签文字存在、`vectorPanels≥1`/`rasterPanels=0` |
| PowerPoint 进程 | 导出前后快照 `POWERPNT.EXE` | 不残留本次新启动的 PowerPoint（用户原有实例不处理） |
| 保存 API | 在 WebView2 中探测 `typeof window.showSaveFilePicker` 与 `isSecureContext` | 报告探测结果（不弹系统对话框；本机实测均支持） |
| host-ready | 网页端探针捕获 `host-ready` | 收到且 version=1.3.0（与 BridgeProtocol.HostVersion 一致） |
| 截图 | `CoreWebView2.CapturePreviewAsync`（离屏加载后临时移到屏幕内） | 生成非空白 PNG（1601×1001） |
| console | 页面探针（`console.error` / `window.onerror` / `unhandledrejection`） | 0 条 |
| 日志 | 写 `<out>\selftest-report.json` | 成功时 `success=true` |

> 说明：WebView2 SDK 1.0.4314.x 的 `CoreWebView2` 没有 `ConsoleMessageReceived` 事件，
> 因此宿主在 `AddScriptToExecuteOnDocumentCreatedAsync` 中注入 `window.__figplayConsoleErrors`
> 探针来收集 console error 与未捕获异常（效果等价且能捕获 `window.onerror`）。

### 8.3 自测输出文件

```
selftest\
├─ selftest-report.json      ← 完整 JSON 日志（环境、layout、剪贴板/EMF、桥、MATLAB .fig、矢量 PDF/crop、应用 E2E、截图、console、耗时）
├─ test-figure.emf           ← C# 录制的真实 EMF（文件头 01 00 00 00）
├─ clipboard-test.png        ← 经 C# 转换得到的 4400px PNG（可人工检查清晰度）
├─ matlab-test-figure.fig    ← MATLAB 现场生成的测试 .fig
├─ matlab-source-figure.emf  ← MATLAB `print -dmeta` 导出的真实 EMF
├─ fig-import-test.png       ← 经真实 import-fig 桥导入的 600dpi PNG
├─ vector-pdf-test.pdf       ← 宿主级矢量 PDF 样张（170×120mm，0 位图）
├─ vector-pdf-crop-test.pdf  ← 带 crop 的矢量 PDF 样张（150×100mm）
├─ app-vector-e2e.pdf        ← 应用级 E2E 样张（JS 注入 .fig → exportVectorPdfBase64，170×193mm）
└─ screenshot.png            ← 应用窗口截图（上传 .fig 后）
```

本机（Windows 10.0.26200 / WebView2 156.0.4314.58 / MATLAB R2024b / PowerPoint 2021，150% 缩放）v1.3.0 候选包结果：
**多文件版与单文件版均 exitCode 0**。应用版本 1.3.0、host-ready 版本 1.3.0、exe FileVersion 1.3.0.0；
应用就绪 ~215–230 ms；三栏布局 CSS 视口 1067×667、grid 244+527+296 px；
EMF→PNG **4400×2933**（~164 KB，约 650dpi）；桥端到端 ~220–240 ms（含 `emfBase64` 校验，3420B/99 条记录）；
应用 JS 桥 ~220–235 ms；MATLAB `.fig` 生成 ~18–21 s、导入转换 ~29–30 s（**4004×2898**、`MATLAB-FIG`、约 280 KB，
同时返回 50,068B 真实 EMF）；宿主矢量 PDF ~23.6–24.0 s（页 481.92×340.08pt、0 位图、标签文字 OK）；
crop 页 425.28×283.56pt；应用级 E2E 导入 ~29–32 s、导出 ~23–24 s（页 481.92×547.08pt、0 位图、标签 OK）；
`showSaveFilePicker` 与 `isSecureContext` 均 true；PowerPoint 残留进程 0；console error 0；截图 1601×1001 非空白。
整轮自测：多文件版 **154.0 s**、单文件版 **157.3 s**（含两次 MATLAB + 两次 PowerPoint 导出）；
完整构建（含双自测）**324.5 s**。

### 8.4 v1.3.0 候选包核对

| 文件 | 大小 | SHA256 |
| --- | --- | --- |
| `dist\FigurePlay.exe` | 240,128 B | `7FDD15826F72D780D885A359E77A20CC0DD32FA0AEFF2E646B2FC38E81B6C2E0` |
| `dist-single\FigurePlay.exe` | 811,520 B | `4AC6CA1F0ADEF0CEC938FF8C10CF67E9C75584ECD5A24444C123628607B3CB57` |
| `FigurePlay-desktop-1.3.0-win-x64.zip` | 773,088 B | `AA7743675AB749CCB62B9065C0BFD4FA1C20D2EC5EECAAF1B5F26119F21D2EA0` |
| `FigurePlay-1.3.0-single-win-x64.zip` | 801,457 B | `FCAA051408BDF73DEB0FC61A08F068AE1F8B737FEDA1FED5F09A8C05320C35EC` |
| `wwwroot\index.html` | 37,074 B | `01D5C83C5755E8A39DD468D56ABED0AD7F7294E4B2835B5FC56E51CE0B3F12A1` |
| `wwwroot\assets\styles.css` | 34,975 B | `60AB414184AE518B1534005E7E7FA512883C87FCA5AE2279DD1DC3B760656010` |
| `wwwroot\js\app.js` | 155,009 B | `426D00DCDE1059796E7A6F4A078796FD56D2123B61F67772FA32DDF484334665` |
| `wwwroot\js\layout.js` | 18,879 B | `605795CFAEBCD50F03B9344478AB3720329BBDFE529B979F43C52F38EAEA1285` |
| `wwwroot\js\render-svg.js` | 14,395 B | `AB398A94C3A5985422BC53BBA27357E69D2B672F69EAE61A092198D14B9DE6C8` |
| `wwwroot\js\desktop.js` | 7,012 B | `1B26B2ECC64F220D318A546DBB8EA579BDA902A0AB49D586D11DA2E9F35C6A93` |
| `wwwroot\js\pdf.js` | 6,260 B | `F3B2B1FBCD31C7B2167843C34872697FF9ADCD84A1DB2CA552FFE5A15578D7A3` |
| `wwwroot\js\zip.js` | 3,940 B | `11C6D96644B1D15500F3E542A14A6D14314F97807DEC7EFA5C2A41B6DACA644F` |
| `wwwroot\js\export.js` | 10,742 B | `54F592428888EE4F2B4D0EE34D45D61EDE4D2F1B9DC329B8E1C3055F7CC73442` |
| `wwwroot\js\util.js` | 17,788 B | `9623FD268C9BC6D3155537F425E7A0725D27F023A97391A7C15BA39F1ED7D980` |

> 校验：`dist\wwwroot` 共 **17 个文件**与构建时 `E:\FigurePlay` 冻结源逐一哈希一致（应用源已冻结）；
> 两个 zip 均已解压到干净目录复跑 `--selftest`（exit 0）；`dist-single\` 与单文件 zip 内均**只有 1 个 `FigurePlay.exe`**；
> 正常模式启动/关闭退出码 0。

---

## 9. MATLAB 使用提示

1. **矢量剪贴板**：MATLAB 图形窗口菜单 **编辑 → 复制图形（Copy Figure）**，回 FigurePlay 点粘贴
   （或 `Ctrl+V`）；默认 EMF 会插入 4400px/~650dpi 的高清 PNG，并保留真实 EMF 供矢量 PDF。
   旧版本也可 `print(gcf, '-clipboard', '-dmeta')`。
2. **.fig 文件**：直接在 FigurePlay 里上传/拖入 `.fig`，桌面版自动调 MATLAB 转换（需要本机 MATLAB R2020a+）；
   输出 600dpi PNG（如 4004×2898），并尽量同时保留真实 EMF，随后可直接导出矢量 PDF。
   转换较慢（首次 10–40 s）时网页端会显示“正在调用 MATLAB 转换 .fig…”。
3. **矢量 PDF**：导出格式选 PDF 且页面含 EMF/.fig 子图时，桌面版会用本机 PowerPoint 生成矢量 PDF
   （需 PowerPoint 2016+，首次约 20–40 s）；可勾选“裁剪白边”（crop）。没有 PowerPoint 时自动回退位图 PDF。
3. 若粘贴提示「剪贴板中没有可识别的图像」：确认复制的是图形而非文本/表格；剪贴板管理器/远程桌面
   可能占用剪贴板，重试或关闭占用程序。
4. `.fig` 失败排查：
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
| 矢量 PDF 需要 PowerPoint | 需要本机桌面版 PowerPoint 2016+（COM）；未安装/COM 失败会返回可读错误，应用自动回退位图 PDF。首次导出约 20–40 s 启动 PowerPoint，60 s 超时 |
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
- 修改 C# 后：`build.ps1` 自动编译 + 双自测 + 双 zip（双自测含 MATLAB 与 PowerPoint，约 5–6 分钟）；
- 只改网页端（`E:\FigurePlay`）后：`build.ps1 -SkipBuild` 快速重打包（payload 会重新生成，单文件版随之更新）；
- 修改桥协议时同步改：`BridgeProtocol.cs` ↔ `E:\FigurePlay\js\desktop.js` ↔ 本文档第 4 节；
- `--selftest` 是回归基线，任何改动都应保持多文件版与单文件版退出码均为 0。
- 构建中间文件 `src\FigurePlay.SingleFile\payload\payload.zip` 由脚本生成、构建结束自动删除；
  `src\*\bin`、`obj` 为普通编译中间目录，可随时删除。
