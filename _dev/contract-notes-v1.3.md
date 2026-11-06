# FigurePlay v1.3 E2E 契约对齐记录（最终版）

> 状态：**v1.3.0 冻结源全量 E2E 已通过（0 失败）**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v13` →
> run `2026-11-06_04-32-39-647`，**21/21 场景 PASS，685/685 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.3.md`、`_dev/screens-v1.3/`（24 张关键截图）、
> `_dev/artifacts/e2e-v13/<run>/`（results.json + 28 个关键导出样例，整包 17.72MB，<20MB 预算）。

## 应用源冻结哈希（测试时实际快照，report-v1.3.md 亦记录完整 sha256）

| 文件 | 字节 | sha256 |
| --- | ---: | --- |
| index.html | 37074 | `01d5c83c5755e8a39dd468d56abed0ad7f7294e4b2835b5fc56e51ce0b3f12a1` |
| assets/styles.css | 34975 | `60ab414184ae518b1534005e7e7fa512883c87fca5ae2279dd1dc3b760656010` |
| js/app.js | 155009 | `426d00dcde1059796e7a6f4a078796fd56d2123b61f67772fa32ddf484334665` |
| js/layout.js | 18879 | `605795cfaebcd50f03b9344478ab3720329bbdfe529b979f43c52f38eaea1285` |
| js/render-svg.js | 14395 | `ab398a94c3a5985422bc53bba27357e69d2b672f69eae61a092198d14b9de6c8` |
| js/desktop.js | 7012 | `1b26b2ecc64f220d318a546dbb8ea579bda902a0ab49d586d11da2e9f35c6a93` |
| js/pdf.js | 6260 | `f3b2b1fbcd31c7b2167843c34872697ff9adcd84a1db2ca552ffe5a15578d7a3` |
| js/zip.js | 3940 | `11c6d96644b1d15500f3e542a14a6d14314f97807dec7efa5c2a41b6daca644f` |
| js/export.js | 10742 | `54f592428888ee4f2b4d0ee34d45d61ede4d2f1b9dc329b8e1c3055f7cc73442` |
| js/util.js | 17788 | `9623fd268c9bc6d3155537f425e7a0725d27f023a97391a7c15ba39f1ed7d980` |

✅ 以上 10 个文件与 Lead 通知的冻结哈希**逐字节完全一致**；`FP.APP_VERSION='1.3.0'`。
（注：`js/demo.js`、`js/render-canvas.js`、`js/storage.js` 等未变更文件也在报告快照表中记录。）

## v1.3 最终确认契约（A–U 全量 685 断言）

### P 网格自定义（23 断言）
- `#rows-input/#cols-input` 的 `min=1 max=500`；API `setLayout(rows,cols)`。
- 单页总格数上限 `FP.MAX_CELLS=2500`：实测 8×8=64、1×20=20、50×50=2500 均可用；
  100×100=10000 被拒并弹出「单页最多 2500 个子图格」toast，旧布局保持 50×50，输入框恢复合法值；
  100×1=100 可用（仅总量超限才拒绝）；API 传 600 行被夹取到 500 行。
- 1000×640 视口下 50×50 仍无横向溢出（scrollWidth ≤ innerWidth+1），stage 可见。

### Q 导出保存位置（24 断言）
- `#save-as-row/#save-as-toggle` 默认可见且勾选，映射 `state.export.saveAs`；`setExportOptions({saveAs})` 双向同步。
- fake `window.showSaveFilePicker` 返回 handle：点 `#btn-export` 时调用一次，`suggestedName='<filename>.png'`，
  `types=[{accept:{'image/png':['.png']}}]`；`createWritable().write(blob)` 收到 PNG（PNG 魔数、size>0），`close()` 调用，未触发下载。
- fake picker 抛 `AbortError`：无头（navigator.webdriver）自动回退为下载，文件名/尺寸/PIL 校验通过。
- 无 `window.showSaveFilePicker`：直接下载且不卡住。
- API `exportBase64` 不触发 picker（纯内存返回 base64）。

### R 编号越界自动加页距（25 断言）
- layout 默认 `autoPad=true`、四边 pad=0；`setLabelConfig({position:'bc',offsetYmm:12})`（1×1+1 图）后
  `getPadInfo().bottom=11.4mm>0`，页面高度 127.5→138.9mm（=base+pad），`getLabelBoxes()` 所有 box 均在页内。
- `setLayoutOptions({autoPad:false})` → 四边 pad=0、页面回退 baseHeight、手动页距输入显示；
  `padBottomMm=15` 与 `#pad-bottom=20` 均生效；重新 `autoPad:true` 自动页距恢复。
- 导出 SVG 宽高与当前 geom 一致；PDF MediaBox=带页距页面尺寸（pdfinfo 页数=1）。

### S PDF 自动裁剪白边（23 断言）
- 默认 `trimPdf=false`；裁剪行仅在 PDF 格式显示，边距行仅在开关打开后显示。
- `getCropBox(margin)` 返回内容 bbox（2×2、layout.margin=10、4 图）：crop=150×113mm（整页 170×133mm）；
  `getCropBox(2)` 外扩到 154×117mm。
- `exportBase64('pdf',{trimPdf:true,trimMarginMm:2})` 的 PDF MediaBox=bbox（±1mm，pdfinfo=1 页）；
  UI 点导出同样裁剪并下载成功；trim 关闭时 PDF 仍为整页 170×133mm（不破坏既有 PDF 尺寸测试）。

### T 滑块数字输入（22 断言）
- `#cell-zoom-num`（20–400%）：250→zoom 2.5、999→400%、5→20%，同步 `#cell-zoom` 与状态。
- `#jpg-quality-num`（60–100%）：75→0.75、10→60%、120→100%，同步 `#jpg-quality`。
- `#label-bg-opacity-num`（0–100%）：40→0.4、-5→0、150→100%；拖 `#label-bg-opacity` 到 30 后数字框反向同步 30。

### U EMF 矢量 PDF（桌面桥 mock，30 断言）
- 桌面桥 mock + `.fig`（`fig-imported` 带 `emfBase64`）导入后 cell.name→`.png`，`getVectorStatus().emfCount=1`。
- 切 PDF 后 `#vector-pdf-row` 显示且开关默认勾选；点导出发送 `export-vector-pdf`，spec 含：
  `widthMm/heightMm`、`crop=null`（trim 关闭）；`panels` 含 `image.kind='emf'`（base64 与回包一致）与普通 `png`；
  `labels` 与当前页编号一致（(a),(b)）。
- mock 回 base64 PDF（真实 PDF）→ fake handle 写入 `.pdf`（`%PDF` 头、字节数一致）。
- mock 回 `ok:false` → console.warn + 自动回退位图 PDF 写入成功，状态栏提示「已回退位图 PDF」，0 pageerror。
- trim 开启后 spec.crop=内容 bbox（与 getCropBox 一致 ±0.2mm）；关闭矢量开关后 vectorAvailable=false；切回 PNG 后矢量行隐藏。

## 回归（A–O 538 断言）
- A–F 229、G–L 226（L 高 DPI 41）、M–O 101 全部保留通过；版本 1.3.0。
- 旧 PDF 尺寸测试在 trim 默认关闭下保持原页面尺寸；旧 UI 下载测试在保存位置默认勾选 + 无头 AbortError fallback 下仍正常下载（E/O 全通过）。
- 自动保存仍为 version 2 project；M/F 的 `saved.project.pages[...]` 兼容读取正常。

## 自动化假设/说明
- 保存位置 fake picker 为测试注入；真实 Chrome/Edge 原生另存为窗口由桌面/人工路径验证。无头 Chrome 的 `AbortError` 回退依赖 `navigator.webdriver` 标志（Playwright 默认设置）。
- PDF 裁剪校验用 Ghostscript + pdfinfo，page MediaBox 容差 ±1mm（3pt）。
- 矢量 PDF 仅覆盖前端集成与协议 mock；真实 PowerPoint COM/EMF 转换由桌面助手验证。
- 网格 50×50 的 DOM 渲染在 headless 下仍可接受（场景约 2.5s）；未做 2500 格导出压力测试。
- 测试侧修正（非应用 bug）：`getState()` 不暴露 cell.emfBase64（改用 `getVectorStatus` 与 `export-vector-pdf` spec 验证）；
  矢量失败提示 toast 会被随后的「已保存」toast 覆盖（改用状态栏验证）；fake handle `head` 只比对前 4 字节。
- 未发现新的真实应用 bug。

## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.3 全量 + 正式产物（report-v1.3.md / screens-v1.3 / artifacts/e2e-v13/<run>）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v13
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v13
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=U
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
```
