# FigurePlay `_dev` — 无头浏览器 E2E 测试环境

> 仅测试用途，不属于应用产物。应用本身（`index.html`、`js/`、`assets/`）由 Lead 交付，**不要在本目录之外读写**。

## 环境（全部绝对路径，不依赖 PATH）

| 项 | 路径 |
| --- | --- |
| Node | `C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe` (v24.21) |
| pnpm | `C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs`（用 node 执行） |
| Python + Pillow | `C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe` (Pillow 12.3) |
| Chrome | `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe` (156.0.8078.80) |
| Ghostscript（备用） | `D:\gmt\Ghostscript\gs10.04.0\bin\gswin64c.exe` |
| pdftoppm（备用） | `D:\texlive\2023\bin\windows\pdftoppm.exe` |

依赖：`playwright-core@1.64.1`（不带浏览器，使用本机 Chrome；`node_modules/` 在 `_dev/` 下）。

## 常用命令（可直接复制）

```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$py='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'

# 1) 生成/重建示例素材（_dev/samples）
& $py 'E:\FigurePlay\_dev\tools\gen-samples.py'

# 2) 环境 smoke：headless 启动、setInputFiles/FileReader、图片解码、下载+PIL、IndexedDB
& $node 'E:\FigurePlay\_dev\smoke\run-smoke.mjs'
& $node 'E:\FigurePlay\_dev\smoke\run-smoke.mjs' --allow-file-access   # 附加放宽参数复核
& $node 'E:\FigurePlay\_dev\smoke\run-smoke.mjs' --headed              # 有头调试

# 3) 任意产物校验（截图/下载）：PNG/JPEG/SVG/PDF/文本
& $py 'E:\FigurePlay\_dev\tools\verify-artifacts.py' --json `
  'E:\FigurePlay\_dev\artifacts\downloads\smoke-download.png'

# 4) E2E 场景测试
#    v1.0 → A–F；v1.1 → G–L（合并/模板/批量编号/粘贴弹窗/桌面桥/高DPI）；
#    v1.2 → M–O（多页/撤销重做/分组/多页导出/.fig）；v1.3 → P–U（网格/保存位置/加页距/PDF裁剪/数字输入/EMF矢量PDF）；
#    v1.3.1 → 同 P–U，S/U 改为按实际墨迹（ink）裁剪 PDF 白边；v1.3.2 → +V 负间距，S 增加编号防裁安全边距；
#    v1.3.3 → V 增加交互 overlay 顶层描边（负间距重叠下选中/悬停不被遮挡）；
#    v1.3.4 → +W 界面外观（浅/深/跟随系统 + 7 主题色，导出隔离）；v1.4.0 → +X 配置模板（保存/应用/JSON 导入导出）；
#    v1.4.1 → +Y 矢量 PDF label spec 预览 bbox（textLeftMm/textTopMm/textWmm/textHmm）；
#    v1.4.2 → +Z 配置模板宿主外部文件持久化（desktop load/saveConfigProfiles、迁移、路径提示）；
#    v1.5.0 → +AA–AF 工程文件/配置备份恢复/期刊库/图片预检/更新 UI/全页矢量；
#    v1.5.1 → +AG–AJ 页面自动编号/诊断日志/原生保存路径/真实桥回包；
#    v1.5.2 → +AK–AM 取消保存/弹窗拖动与背景/主题色精简（6 色+迁移）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v152 --only=AK   # 单场景（A..AM）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v152 # v1.5.2 正式：report-v1.5.2.md / screens-v1.5.2 / artifacts/e2e-v152/<run>
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v151 # v1.5.1 历史产物：report-v1.5.1.md / screens-v1.5.1 / artifacts/e2e-v151
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v140 # v1.4.0 历史产物：report-v1.4.0.md / screens-v1.4.0 / artifacts/e2e-v140
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v134 # v1.3.4 历史产物：report-v1.3.4.md / screens-v1.3.4 / artifacts/e2e-v134
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v133 # v1.3.3 历史产物：report-v1.3.3.md / screens-v1.3.3 / artifacts/e2e-v133
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v132 # v1.3.2 历史产物：report-v1.3.2.md / screens-v1.3.2 / artifacts/e2e-v132
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v131 # v1.3.1 历史产物：report-v1.3.1.md / screens-v1.3.1 / artifacts/e2e-v131
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v13  # v1.3 历史产物：report-v1.3.md / screens-v1.3 / artifacts/e2e-v13
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v12  # v1.2 历史产物：report-v1.2.md / screens-v1.2 / artifacts/e2e-v12
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v11  # v1.1 历史产物：report-v1.1.md / shots-v1.1 / exports-v1.1

# 5) 导出产物校验器自检（合成 PNG/JPG/SVG/PDF/ZIP + 多页 PDF）
& $py 'E:\FigurePlay\_dev\tools\verify-exports-selftest.py'
```

## 目录

```
_dev/
  package.json                 # type: module, playwright-core 依赖
  lib/browser.mjs              # 启动/页面/截图/下载/setInputFiles/诊断 helper
  lib/app.mjs                  # 应用契约 helper：__FIGPLAY__ API、预览 DOM、编号期望、自动保存、拖放；
                               #   v1.1：合并/模板/多选/批量编号/粘贴弹窗/桌面桥；v1.2：多页/撤销重做/分组/多页导出/.fig；
                               #   v1.3：网格上限/保存位置 fake picker/autoPad/PDF 裁剪/数字输入/EMF 矢量 PDF；v1.3.1：getInkCropBox；
                               #   v1.3.2：编号防裁安全边距/负间距；v1.3.3：交互 overlay 顶层描边；v1.3.4：界面外观；v1.4.0：配置模板；v1.4.1：label bbox；v1.4.2：配置宿主持久化；v1.5.0：工程/预检/期刊/更新/全页矢量；v1.5.1：页面编号/日志/saveFile；v1.5.2：取消/拖动/6 主题色
  lib/verify.mjs               # 调用 Python 校验器（PNG/JPG/SVG/PDF/ZIP；SVG clip/像素探针/pdfinfo 页数/PDF 墨迹四边余量）
  scenarios.mjs                # v1.0 场景 A–F
  scenarios-v11.mjs            # v1.1 场景 G–L
  scenarios-v12.mjs            # v1.2 场景 M–O（多页/撤销重做/分组/多页导出/.fig）
  scenarios-v13.mjs            # v1.3/1.3.1/1.3.2 场景 P–Z（S/U 按 ink 安全边距，V 负间距）
  scenarios-v15.mjs            # v1.5.0 场景 AA–AF（工程文件/配置备份/期刊库/预检/更新/全页矢量）
  scenarios-v151.mjs           # v1.5.1 场景 AG–AJ（页面自动编号/原生保存/诊断日志/真实桥回包）
  scenarios-v152.mjs           # v1.5.2 场景 AK–AM（取消保存/弹窗拖动背景/主题色精简）
  contract-notes-v1.1.md       # v1.1 契约与假设记录
  contract-notes-v1.2.md       # v1.2 契约、冻结哈希、自动化假设记录
  contract-notes-v1.3.md       # v1.3 契约、冻结哈希、自动化假设记录
  contract-notes-v1.3.1.md     # v1.3.1 ink 裁剪契约、冻结哈希与实测记录
  contract-notes-v1.3.2.md     # v1.3.2 安全边距/负间距契约、冻结哈希与实测记录
  contract-notes-v1.3.3.md     # v1.3.3 交互 overlay 契约、冻结哈希与实测记录
  contract-notes-v1.3.4.md     # v1.3.4 界面外观契约、冻结哈希与实测记录
  contract-notes-v1.4.0.md     # v1.4.0 配置模板契约、冻结哈希与实测记录
  contract-notes-v1.4.1.md     # v1.4.1 label spec bbox 契约、冻结哈希与实测记录
  contract-notes-v1.4.2.md     # v1.4.2 配置宿主外部文件持久化契约、冻结哈希与实测记录
  contract-notes-v1.5.0.md     # v1.5.0 工程文件/配置备份/期刊库/预检/更新/全页矢量契约与实测记录
  contract-notes-v1.5.1.md     # v1.5.1 页面自动编号/诊断日志/原生保存路径/真实桥回包契约与实测记录
  contract-notes-v1.5.2.md     # v1.5.2 取消保存/弹窗拖动背景/主题色精简契约与实测记录
  e2e.mjs                      # E2E 入口：--suite=v10|v11|v12|v13|v15|v151|v152|all，--only，--final/--final-v11…v150/v151/v152
  report.md / shots/           # v1.0 正式报告与截图
  report-v1.1.md / shots-v1.1/ # v1.1 正式报告与截图
  report-v1.2.md / screens-v1.2/  # v1.2 正式报告与 17 张关键截图（--final-v12）
  report-v1.3.md / screens-v1.3/  # v1.3 正式报告与 24 张关键截图（--final-v13）
  report-v1.3.1.md / screens-v1.3.1/  # v1.3.1 ink 裁剪正式报告与 24 张关键截图（--final-v131）
  report-v1.3.2.md / screens-v1.3.2/  # v1.3.2 安全边距/负间距正式报告与 25 张关键截图（--final-v132）
  report-v1.3.3.md / screens-v1.3.3/  # v1.3.3 交互 overlay 正式报告与 25 张关键截图（--final-v133）
  report-v1.3.4.md / screens-v1.3.4/  # v1.3.4 界面外观正式报告与 26 张关键截图（--final-v134）
  report-v1.4.0.md / screens-v1.4.0/  # v1.4.0 配置模板正式报告与 27 张关键截图（--final-v140）
  report-v1.4.1.md / screens-v1.4.1/  # v1.4.1 label bbox 正式报告与 28 张关键截图（--final-v141）
  report-v1.4.2.md / screens-v1.4.2/  # v1.4.2 配置宿主持久化正式报告与 29 张关键截图（--final-v142）
  report-v1.5.0.md / screens-v1.5.0/  # v1.5.0 六项新功能正式报告与 34 张关键截图（--final-v150）
  report-v1.5.1.md / screens-v1.5.1/  # v1.5.1 页面编号/日志/原生保存/真实桥回包正式报告与 39 张关键截图（--final-v151）
  report-v1.5.2.md / screens-v1.5.2/  # v1.5.2 取消保存/弹窗拖动/主题色正式报告与 42 张关键截图（--final-v152）
  smoke/upload-test.html       # file:// 能力验证页（window.smoke.*）
  smoke/run-smoke.mjs          # smoke 运行器 → artifacts/smoke-report.json
  tools/gen-samples.py         # 示例图片生成（samples/manifest.json 含尺寸/主色/缩略图/sha256）
  tools/verify-artifacts.py    # 通用产物校验（PIL/PDF/文本，--json）
  tools/verify-exports.py      # 导出专项校验：像素尺寸/非空/SVG 结构+clip/PDF MediaBox+pdfinfo+渲染/ZIP/像素探针
  tools/verify-exports-selftest.py  # 校验器自检（23 项）
  samples/                     # 9 个示例文件 + manifest.json
  artifacts/
    smoke-report.json
    screenshots/               # smoke 截图
    downloads/                 # smoke 下载
    fixtures/                  # 校验器自检合成产物
    exports/                   # 旧 v1.0 导出样例（历史证据已移到 C:\Users\DragonDance\FigurePlay-v1.1-evidence）
    exports-v1.1/              # 旧 v1.1 导出样例（历史证据已移出 E:）
    e2e-v12/<run>/             # v1.2 最终 run：results.json + exports/（18 个关键导出，空间受控）
    e2e-v13/<run>/             # v1.3 最终 run：results.json + exports/（28 个关键导出，空间受控）
    e2e-v131/<run>/            # v1.3.1 最终 run：results.json + exports/（35 个关键导出，空间受控）
    e2e-v132/<run>/            # v1.3.2 最终 run：results.json + exports/（28 个关键导出，空间受控）
    e2e-v133/<run>/            # v1.3.3 最终 run：results.json + exports/（29 个关键导出，空间受控）
    e2e-v134/<run>/            # v1.3.4 最终 run：results.json + exports/（29 个关键导出，空间受控）
    e2e-v140/<run>/            # v1.4.0 最终 run：results.json + exports/（21 个关键导出，空间受控）
    e2e-v141/<run>/            # v1.4.1 最终 run：results.json + exports/（21 个关键导出，空间受控）
    e2e-v142/<run>/            # v1.4.2 最终 run：results.json + exports/（配置宿主持久化证据，空间受控）
    e2e-v150/<run>/            # v1.5.0 最终 run：results.json + exports/（工程文件/全页矢量等证据，空间受控）
    e2e-v151/<run>/            # v1.5.1 最终 run：results.json + exports/（页面编号/日志/原生保存证据，空间受控）
    e2e-v152/<run>/            # v1.5.2 最终 run：results.json + exports/（取消/拖动/主题色证据，空间受控）
```

## E2E 场景 A–F（应用 FigurePlay v1.0.0 已通过）

全量运行：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --final`（每次固定用全新 browser context 隔离状态）。

最近一次结果：**6/6 场景 PASS，229/229 断言 PASS，0 pageerror、0 console error、0 资源加载失败**。
产物：`_dev/report.md`（逐断言明细/失败清单/导出校验表）、`_dev/shots/`（17 张截图）、`_dev/artifacts/exports/`（13 个导出样例）。

| 场景 | 覆盖点 |
| --- | --- |
| A 首屏 | 就绪标志 `dataset.figplayReady`+`__FIGPLAY__.ready`、默认 3×2 状态与 UI、36 个矩阵格/9 个位置按钮、无 JS 报错 |
| B 布局 | 矩阵点击 / 行列输入 / `setLayout` API 三种方式设 3×2、2×3、1×6；cell-hit 排列与独立几何公式逐格比对；改行列图片按序号保留、缩小丢弃并 toast |
| C 上传 | 指定格子 `setUploadTarget(i)`+`setInputFiles`、批量填充空位、替换；预览 `<image>` href 与源文件 FileReader dataURL 完全一致；合成 DataTransfer 拖放到格子替换 |
| D 编号 | 14 种编号方案、起始编号、列优先、跳过空图开关、显示开关、9 个位置（按 bbox 归一化坐标断言）、字号/加粗/斜体/颜色、内边距/偏移 mm 增量、自定义编号 |
| E 导出 | PNG/JPG/SVG/PDF 全格式；PNG/JPG 像素=mm/25.4×DPI（150/300/600 三档）；PIL 校验非空白/白底/透明角 alpha=0；SVG XML 校验 mm 宽高、viewBox、cell 数、图数与编号文字；PDF 单页 MediaBox=mm×72/25.4pt + pdftoppm 渲染校验；JPG 质量生效；`#btn-export` 与 `#btn-export-top` 真实下载；`exportBase64` overrides |
| F 稳定性 | 1366×768 无横向溢出；改动后约 900ms 自动保存到 IndexedDB（含 dataUrl）；刷新后布局/图片（href 完全一致）/编号/导出设置/状态栏恢复；clearAll 后刷新为空 |

## E2E v1.1 新功能 G–K（应用 v1.1.0 已通过）

命令：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v11`（单独跑）或 `--suite=all --final-v11`（v1.0 回归 + v1.1，正式产物
`_dev/report-v1.1.md`、`_dev/shots-v1.1/`、`_dev/artifacts/exports-v1.1/`）。

最终状态（2026-11-06，run `2026-11-05_18-41-51-108`）：**12/12 场景 PASS，433/433 断言 PASS，0 失败项**；
v1.0 回归 A–F 229 断言全部保留通过。测试过程中发现 3 个应用 bug + 1 个 UI 问题 + 1 个高 DPI 断点问题
（多选高亮/真实双击替换/工具栏与全局粘贴 TypeError/桌面剪贴板按钮 hidden/1000px 视口误堆叠），
Lead 修复后均已回归覆盖。契约细节与假设见 [`contract-notes-v1.1.md`](contract-notes-v1.1.md)。

| 场景 | 覆盖点 |
| --- | --- |
| G 合并单元格 | Ctrl/Shift 多选（首次即按住）→ `#multi-merge` 合并（2×3 首行跨 3 列）、3 个面板 `.is-selected`、面板几何独立复算、`.cell-hit` 仅渲染面板 anchor、编号位置、`#cell-split` 拆分、L 形非法选择；API `mergePanels` force/multiple-images/splitPanel 返回值；导出 SVG clip 矩形与期望几何一致且互不重叠、PNG 像素探针（合并中心有图/白底）、PDF 页面尺寸+渲染白底 |
| H 快捷模板 | 8 个 `.template-card[data-template]` + `getTemplates()`；逐个精确校验 rows/cols/widthMm/merges/fontSize（`double-1plus3` 4 面板、`double-left-big` 5 面板）；图片按面板重排/超限丢弃 toast |
| I 批量编号 | 多选 → `#multi-batch-label` 弹窗；套用后 `cells[].customLabel`、预览与 SVG 导出文字一致；apply/clear 后弹窗自动关闭；清除恢复自动编号 |
| J 粘贴画布 | 点击空面板开 `#paste-dialog`（不再开文件选择器，默认勾选“继续”）；合成 ClipboardEvent/拖放/本地文件、预览/确认/取消、继续模式跳下一空面板（getPasteState.target）、真实双击替换、工具栏 `#btn-paste`、全局 Ctrl+V、Esc；浏览器模式 DOM 无剪贴板按钮 |
| K 桌面桥 | mock `window.chrome.webview`（JSON 字符串消息）：app-ready、自动 read-clipboard-image{requestId}、成功回包 EMF→预览/填入、失败回包错误提示、`#paste-retry` 重发新 requestId；桌面模式剪贴板按钮可见 |
| L 高DPI布局 | 1000×640 CSS 视口（150% 缩放/WebView2）三栏 grid、无横向溢出、stage 460px 可见、figure-shell>200（v1.2 页面栏使 fit 略小）；950 三栏（页签栏可换行）；899 堆叠；1366×768 / 1440×900 复检；不硬编码旧 1060 断点 |

## E2E v1.2 新功能 M–O（应用 v1.2.0 已通过）

命令：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v12`（v1.0 回归 + v1.1 + v1.2 全量，正式产物
`_dev/report-v1.2.md`、`_dev/screens-v1.2/`、`_dev/artifacts/e2e-v12/<run>/`）。

最终状态（2026-11-06，run `2026-11-06_02-13-19-851`）：**15/15 场景 PASS，538/538 断言 PASS，0 失败项**；
A–F 229 + G–L 226 + M–O 101 断言。产物整包 12.27MB（<15MB 预算），截图仅 17 张关键场景。
应用源冻结哈希（完整 sha256）与 `render-svg.js` 哈希差异说明见 [`contract-notes-v1.2.md`](contract-notes-v1.2.md)。

| 场景 | 覆盖点 |
| --- | --- |
| M 多页工程 | 页签 UI（新建/复制/删除/双击 prompt 改名）；`getPages/setPage/addPage/duplicatePage/deletePage/renamePage`；每页独立 layout/cells/label；自动保存 version 2 project（`saved.project.pages[0].cells`）与 reload 恢复（href 完全一致） |
| N 撤销重做 | `#btn-undo/#btn-redo`、Ctrl+Z/Ctrl+Shift+Z/Ctrl+Y、`undo/redo/getHistoryState`；布局/编号/上传/模板/页新增/分组创建/页改名撤销重做；连续偏移 500ms 合并 1 步；页切换不入历史；弹窗与文本框聚焦时快捷键不触发；新操作清空 redo |
| O 分组/多页导出/.fig | UI+API 分组（独立编号、组框仅预览、导出 SVG 不含组框、合并保组、模板清理失效组）；多页导出（PDF 多页 pdfinfo 校验、PNG/JPG/SVG ZIP zipfile+解码校验、UI 全页下载）；桌面桥 mock `.fig` 导入（cell.name→.png、尺寸、dataURL）与浏览器模式可读报错 |

## E2E v1.3 新功能 P–U（应用 v1.3.0 已通过）

命令：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v13`（v1.0 回归 + v1.1 + v1.2 + v1.3 全量，正式产物
`_dev/report-v1.3.md`、`_dev/screens-v1.3/`、`_dev/artifacts/e2e-v13/<run>/`）。

最终状态（2026-11-06，run `2026-11-06_04-32-39-647`）：**21/21 场景 PASS，685/685 断言 PASS，0 失败项**；
A–F 229 + G–L 208 + M–O 101 + P–U 147 断言（合计 685）。产物整包约 17.7MB（<20MB 预算），截图 24 张关键场景。
应用源冻结哈希（完整 sha256）逐字节一致，见 [`contract-notes-v1.3.md`](contract-notes-v1.3.md)。

| 场景 | 覆盖点 |
| --- | --- |
| P 网格自定义 | `#rows-input/#cols-input` max=500；8×8=64、1×20=20、50×50=2500 可用；100×100=10000 超限 toast 且保持旧布局；100×1 可用；600 行夹取到 500；1000×640 下 50×50 无横向溢出 |
| Q 导出保存位置 | `#save-as-toggle` 默认勾选；fake `showSaveFilePicker` 验证 picker→write(blob)/close、suggestedName/type 正确、未触发下载；AbortError 无头自动回退下载；无 picker 直接下载；API 导出不调用 picker |
| R 自动加页距 | 默认 `autoPad=true`；`setLabelConfig({position:'bc',offsetYmm:12})` 后 `getPadInfo().bottom=11.4mm`、页面高度增大、`getLabelBoxes()` 全在页内；关闭 autoPad→0；手动 `#pad-bottom`；重新启用恢复；SVG/PDF 导出尺寸含页距 |
| S PDF 自动裁剪 | 默认 `trimPdf=false`；裁剪/边距控件仅 PDF 显示；`getCropBox(margin)` 内容 bbox；API+UI 导出 PDF MediaBox=bbox（±1mm、pdfinfo 1 页）；layout.margin=10 时裁剪后小于整页；trim 关闭保持整页尺寸 |
| T 滑块数字输入 | `#cell-zoom-num`（20–400%）、`#jpg-quality-num`（60–100%）、`#label-bg-opacity-num`（0–100%）数字输入同步滑块与状态、越界夹取、滑块反向同步数字框 |
| U EMF 矢量 PDF | 桌面桥 mock `.fig` 带 `emfBase64`→`getVectorStatus().emfCount=1`；PDF 下 `#vector-pdf-row` 显示；`export-vector-pdf` spec 含 crop/panels（image.kind='emf'）/labels；mock 回 base64 PDF 写 fake 文件；mock 错误回退位图 PDF、状态栏提示，0 pageerror |

> v1.3.1 已将 S/U 的 PDF 裁剪从「内容盒」改为「实际墨迹 bbox（getInkCropBox）」，旧 S/U 尺寸/crop 期望已更新；见下节。

## E2E v1.3.1 按实际墨迹裁剪 PDF 白边（应用 v1.3.1 已通过）

命令：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v131`（v1.0 回归 + v1.1 + v1.2 + v1.3 + v1.3.1 全量，正式产物
`_dev/report-v1.3.1.md`、`_dev/screens-v1.3.1/`、`_dev/artifacts/e2e-v131/<run>/`）。

最终状态（2026-11-06，run `2026-11-06_05-30-11-336`）：**21/21 场景 PASS，708/708 断言 PASS，0 失败项**；
A–F 229 + G–L 208 + M–O 101 + P–U 170（P23/Q24/R25/**S42**/T22/**U34**）合计 708。产物整包 18.89MB（<20MB 预算），截图 24 张。
应用源冻结哈希（完整 sha256）程序核对 ALL MATCH，见 [`contract-notes-v1.3.1.md`](contract-notes-v1.3.1.md)。

| 场景 | v1.3.1 覆盖点 |
| --- | --- |
| S PDF 墨迹裁剪 | `getInkCropBox`（96dpi 探针扫描）与 `getCropBox` 内容盒并存对照；margin=10：整页 170×133→ink 150.3×113.2mm，留边0 裁剪 PDF 的 pdftoppm 渲染**四边非白余量 0/0/0/0mm（≤1.5mm）**；留边2mm 余量 1.85–2.12mm；UI 导出同样按 ink；trim 关闭保留整页与 ≥5mm 白边；**letterbox（16:9 面板+4:3 图）** ink 127.8×92.1mm，裁剪后四边 ≤1.5mm、未裁剪左右保留 21mm 白边 |
| U EMF 矢量 PDF | trim 时 `export-vector-pdf` 的 `spec.crop≈getInkCropBox`（±0.5mm，含 inkPx/pagePx 证明来自 ink 检测）；其余 mock 成功/失败回退断言保留 |
| 验证器 | `verify-exports.py --kind pdf --max-ink-margin-mm 1.5 --render-dpi 96` 用 pdftoppm+PIL 实测四边墨迹余量并逐边断言；selftest 26 项 PASS |

## E2E v1.3.2 编号防裁安全边距 + 负间距（应用 v1.3.2 已通过）

命令：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v132`（v1.0 回归 + v1.1 + v1.2 + v1.3 + v1.3.1 + v1.3.2 全量，正式产物
`_dev/report-v1.3.2.md`、`_dev/screens-v1.3.2/`、`_dev/artifacts/e2e-v132/<run>/`）。

最终状态（2026-11-06，run `2026-11-06_09-39-08-303`）：**22/22 场景 PASS，755/755 断言 PASS，0 失败项**；
A–F 229 + G–L 208 + M–O 101 + P–V 217（P23/Q24/R25/**S56**/T22/**U39**/**V28**）合计 755。产物整包 18.70MB（<20MB 预算），截图 25 张。
应用源冻结哈希（完整 sha256）程序核对 ALL MATCH，见 [`contract-notes-v1.3.2.md`](contract-notes-v1.3.2.md)。

| 场景 | v1.3.2 覆盖点 |
| --- | --- |
| S PDF 安全边距 | trim 0→1mm 安全边距（编号排版盒并入 crop）：用户配置 3×2/bc/inset1.5/offsetX1.2/offsetY5/Times9 的 trimmed PDF 渲染四边余量 0.794–1.058mm（0.7–1.6mm），**底部编号完整**；trim=1 仍约 1mm；trim=2 上/左/右约 1.6–2.1mm、底部受页面边界 clamp 0.794mm；`getInkCropBox().marginMm`、`#pdf-trim-safety-hint`、UI「保留 1 mm 安全边距」均校验 |
| V 负间距 | `layout.colGap/rowGap` -50～80；UI `#col-gap/#row-gap min=-50`；API -10/-10 与夹取 -100→-50、100→80；cellW 85→90mm、面板重叠 X/Y=10mm、页宽不变/页高减小；负间距 PNG/PDF/trim 导出正常、无 pageerror |
| U 矢量 PDF | trim 时 `spec.crop≈getInkCropBox`（±0.5mm）且新增 `spec.trimMarginMm`（trim 关=1、trim=2 时=2） |

## E2E v1.3.3 交互描边顶层 overlay（应用 v1.3.3 已通过）

命令：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v133`（v1.0 回归 + v1.1 + v1.2 + v1.3 + v1.3.1/1.3.2 全量，正式产物
`_dev/report-v1.3.3.md`、`_dev/screens-v1.3.3/`、`_dev/artifacts/e2e-v133/<run>/`）。

最终状态（2026-11-06，run `2026-11-06_10-35-17-771`）：**22/22 场景 PASS，774/774 断言 PASS，0 失败项**；
v1.3.2 的 755 断言保留 + V 新增 19 条 overlay 断言。产物整包 19.04MB（<20MB 预算），截图 25 张。
应用源冻结哈希（完整 sha256）程序核对 ALL MATCH，见 [`contract-notes-v1.3.3.md`](contract-notes-v1.3.3.md)。

| 场景 | v1.3.3 覆盖点 |
| --- | --- |
| V 负间距（扩展） | `#preview-svg` 最后子元素=`interaction-overlay-layer`（cells/groups/labels 均在其下，pointer-events:none）；-10/-10 重叠下选中 panel0 的 `.cell-selection-outline` bbox=panel0，重叠区悬停 panel1 出现 `.cell-hover-outline`，两者均在顶层；Ctrl 多选 2 个 outline；切换选择/模板/页后 overlay 重建无陈旧描边；离开 SVG hover 消失；导出 SVG 不含 overlay/selection/hover/cell-hit/cell-outline/is-selected 且结构校验通过 |

## E2E v1.3.4 界面外观（浅色/深色/跟随系统 + 7 主题色，应用 v1.3.4 已通过）

命令：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v134`（v1.0 回归 + v1.1 + v1.2 + v1.3 + v1.3.1/1.3.2/1.3.3 全量，正式产物
`_dev/report-v1.3.4.md`、`_dev/screens-v1.3.4/`、`_dev/artifacts/e2e-v134/<run>/`）。

最终状态（2026-11-06，run `2026-11-06_11-42-16-411`）：**23/23 场景 PASS，819/819 断言 PASS，0 失败项**；
v1.3.3 的 774 断言保留 + W 新增 45 条外观断言。产物整包 19.66MB（<20MB 预算），截图 26 张。
应用源冻结哈希（12 个文件完整 sha256，含 `assets/theme.css`/`js/appearance.js`）程序核对 ALL MATCH，见 [`contract-notes-v1.3.4.md`](contract-notes-v1.3.4.md)。

| 场景 | v1.3.4 覆盖点 |
| --- | --- |
| W 界面外观 | 默认跟随系统（emulateMedia dark→light→dark 双向自动）；`#btn-appearance` 弹层 3 模式 + 7 主题色 active/aria/`--accent`/按钮渐变；localStorage `figureplay.themeMode/accent` + reload 保留（含 boot script）；深色下 body/panel/帮助弹窗/输入框深色、`#figure-shell` 仍白；light/dark/accent 四组合导出 PNG（202616B）/SVG（210152B）base64 完全一致、`#preview-svg` innerHTML hash 不变；项目/历史/多页状态不受影响；1000×700 顶栏按钮与 popover 不溢出 |

## E2E v1.4.0 配置模板（保存/应用/导入导出 JSON，应用 v1.4.0 已通过）

命令：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v140`（v1.0 回归 + v1.1 + v1.2 + v1.3 + 外观 + 配置模板全量，正式产物
`_dev/report-v1.4.0.md`、`_dev/screens-v1.4.0/`、`_dev/artifacts/e2e-v140/<run>/`）。

最终状态（2026-11-06，run `2026-11-06_12-30-41-776`）：**24/24 场景 PASS，865/865 断言 PASS，0 失败项**；
v1.3.4 的 819 断言保留 + X 新增 46 条配置模板断言。产物整包 19.18MB（<20MB 预算），截图 27 张。
应用源冻结哈希（13 个文件完整 sha256，含 `js/config-profiles.js`）程序核对 ALL MATCH，见 [`contract-notes-v1.4.0.md`](contract-notes-v1.4.0.md)。

| 场景 | v1.4.0 覆盖点 |
| --- | --- |
| X 配置模板 | 目标配置 3×2/170mm/列距3/行距1/Arial11/PDF/裁边1.5/矢量 → 保存到 localStorage（名称/说明/摘要/`#config-count`/reload 持久）；有图片应用配置 confirm 接受后恢复全部参数并保持图片数量/顺序（最近应用提示）；无图片不弹 confirm；导出 JSON `type=figureplay-config/schemaVersion=1/name/description/appVersion/createdAt/layout/label/export`（无 cells/dataURL，1286B 样例）可重新导入；导入先预览（名称/说明/摘要），可应用/保存；错误 type、未来 schemaVersion、非法 JSON 均中文报错且不落盘；`getConfigSnapshot/normalizeConfigSnapshot/applyConfigSnapshot` API；配置保存不增历史/不改主题，应用历史 ≤+1、重复应用去重，项目自动保存不含配置列表 |

## E2E v1.4.1 矢量 PDF label spec 预览 bbox（应用 v1.4.1 已通过）

命令：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v141`（v1.0 回归 + v1.1 + v1.2 + v1.3 + 外观 + 配置模板 + label bbox 全量，正式产物
`_dev/report-v1.4.1.md`、`_dev/screens-v1.4.1/`、`_dev/artifacts/e2e-v141/<run>/`）。

最终状态（2026-11-06，run `2026-11-06_13-10-06-625`）：**25/25 场景 PASS，894/894 断言 PASS，0 失败项**；
v1.4.0 的 865 断言保留 + Y 新增 29 条 label bbox 断言。产物整包 19.78MB（<20MB 预算），截图 28 张。
应用源冻结哈希（13 个文件完整 sha256）程序核对 ALL MATCH，见 [`contract-notes-v1.4.1.md`](contract-notes-v1.4.1.md)。

| 场景 | v1.4.1 覆盖点 |
| --- | --- |
| Y 矢量标签bbox | 配置1（2×3/170mm/4:3/colGap-4/rowGap1/autoPad，label bc/inset1.5/offsetX1/offsetY4/Times9）下 stub `FP.desktop.exportVectorPdf` 捕获 spec：labels 含 `textLeftMm/textTopMm/textWmm/textHmm`，6 项与预览 `.label-text getBBox` 偏差 0.000mm（≤0.05mm）；`(c)` top=43.507mm（≈43.58）、h=3.478mm（≈3.44）；导出前 document.fonts.ready=loaded 且 stub 记录字体状态 loaded；两次导出 spec 完全一致（无字体 fallback 抖动） |

## E2E v1.4.2 配置模板宿主外部文件持久化（应用 v1.4.2 已通过）

命令：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v142`（v1.0 回归 + v1.1 + v1.2 + v1.3 + 外观 + 配置模板 + label bbox + 宿主持久化全量，正式产物
`_dev/report-v1.4.2.md`、`_dev/screens-v1.4.2/`、`_dev/artifacts/e2e-v142/<run>/`）。

最终状态（2026-11-06，run `2026-11-06_13-51-37-999`）：**26/26 场景 PASS，923/923 断言 PASS，0 失败项**；
v1.4.1 的 894 断言保留 + Z 新增 29 条宿主持久化断言。产物整包 18.24MB（<20MB 预算），截图 29 张。
应用源冻结哈希（13 个文件完整 sha256）程序核对 ALL MATCH，见 [`contract-notes-v1.4.2.md`](contract-notes-v1.4.2.md)。

| 场景 | v1.4.2 覆盖点 |
| --- | --- |
| Z 配置宿主持久化 | 桌面 mock `FP.desktop.available=true`，配置 init 发 `load-config-profiles`；宿主无文件 + localStorage 有旧配置 → 调用 `saveConfigProfiles` 迁移（不清空本地）；`#config-storage-hint` 显示宿主 `%APPDATA%\FigurePlay\configs\profiles.json`；保存/删除/导入均触发 host save；清空 localStorage 后 reload 从 host 恢复并回写本地缓存；浏览器模式仍仅 localStorage 且提示不同；配置保存不改主题/历史、项目自动保存 payload 不含配置/宿主路径 |

## E2E v1.5.0 工程文件/配置备份/期刊库/图片预检/更新 UI/全页矢量（应用 v1.5.0 已通过）

命令：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v150`（v1.0–v1.5 全量，正式产物
`_dev/report-v1.5.0.md`、`_dev/screens-v1.5.0/`、`_dev/artifacts/e2e-v150/<run>/`）。

最终状态（2026-11-06，run `2026-11-06_14-33-21-004`）：**32/32 场景 PASS，1003/1003 断言 PASS，0 失败项**；
v1.4.2 的 923 断言保留 + AA–AF 新增 80 条。产物整包 20.86MB（<25MB 预算），截图 34 张。
应用源冻结哈希（17 个文件完整 sha256）程序核对 ALL MATCH，见 [`contract-notes-v1.5.0.md`](contract-notes-v1.5.0.md)。

| 场景 | v1.5.0 覆盖点 |
| --- | --- |
| AA 工程文件 | `getProjectSnapshot` 含 type/schema/pages（图片 dataURL、layout/label/groups/export）；真实下载 `.figureplay-project`（118,986B）；改布局/清空后打开恢复 2 页 3 图/分组/参数；错误 type/版本/JSON 中文报错 |
| AB 配置备份恢复 | 桌面 mock list/read 最新备份 → 恢复 2 条配置并 host save；`#config-restore-backup` 桌面可见、浏览器隐藏 |
| AC 期刊配置库 | 11 预设/5 分组；Nature 单栏 89mm/Arial8/PDF/trim；Science 单栏 55mm/Arial7；网格/图片数量不变 |
| AD 图片预检 | 120×90 低分辨率 warnings（<150 DPI、<500×400）；1200×900 高分辨率无警告；800×100 stretch 返回拉伸 500% 警告 |
| AE 更新 UI | mock checkUpdate 显示新版本 1.5.1+notes、下载按钮；downloadUpdate 被调用；浏览器模式禁用 |
| AF 全页矢量 | 2 页同尺寸 EMF 工程 stub `exportVectorPdfMulti(pages)` 捕获 2 页 spec（panels/labels）；尺寸不一致回退多页位图且提示、不再调用 multi |

## E2E v1.5.1 页面自动编号/诊断日志/原生保存路径（应用 v1.5.1 已通过）

命令：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v151`（v1.0–v1.5.1 全量，正式产物
`_dev/report-v1.5.1.md`、`_dev/screens-v1.5.1/`、`_dev/artifacts/e2e-v151/<run>/`）。

最终状态（2026-11-06，run `2026-11-06_15-41-58-453`）：**36/36 场景 PASS，1065/1065 断言 PASS，0 失败项**；
v1.5.0 的 1003 断言保留 + AG–AJ 新增 62 条。产物整包 23.43MB（<25MB 预算），截图 39 张。
应用源冻结哈希（18 个文件完整 sha256）程序核对 ALL MATCH，见 [`contract-notes-v1.5.1.md`](contract-notes-v1.5.1.md)。

| 场景 | v1.5.1 覆盖点 |
| --- | --- |
| AG 页面自动编号 | 初始图1→新建图1/图2→删图1自动变图1→再新建图1/图2→复制「图1 副本」不重编号；tab/API 同步 |
| AH 原生保存路径 | stub `FP.desktop.saveFile` 捕获工程(.figureplay-project)/配置(.json)/PNG/PDF；返回 path 状态、取消「已取消导出」；浏览器回退真实下载 |
| AI 诊断日志 | 就绪/toast/error 记录；帮助弹窗刷新/导出（浏览器下载 + 桌面 saveFile .log）/清空；localStorage 上限 300；不含图片二进制 |
| AJ 真实桥回包 | window.chrome.webview mock、不 stub 任何 FP.desktop 方法：saveFile→file-saved 480ms resolve（requestId 匹配/错误 id 忽略/path 正确）、工程保存 UI path；`__UPDATES__.check()`→update-info 9ms resolve（1.5.2/1.5.1/notes、按钮启用）；`__UPDATES__.download()`→update-downloaded（状态含完成+下载路径、按钮恢复） |

旧场景适配：O/U/AF 在桌面桥 mock 下导出前显式移除 `FP.desktop.saveFile`（恢复 download/fake-picker 断言）；AA 动态读取 appVersion；AE 更新 mock 改为在 init script 属性 setter 中打桩避免初始化时序竞态。

## E2E v1.5.2 取消保存/弹窗拖动背景/主题色精简（应用 v1.5.2 已通过）

命令：`& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v152`（v1.0–v1.5.2 全量，正式产物
`_dev/report-v1.5.2.md`、`_dev/screens-v1.5.2/`、`_dev/artifacts/e2e-v152/<run>/`）。

最终状态（2026-11-06，run `2026-11-06_16-30-00-591`）：**39/39 场景 PASS，1105/1105 断言 PASS，0 失败项**；
v1.5.1 的 1065 断言保留 + AK–AM 新增 40 条。产物整包 24.22MB（<25MB 预算），截图 42 张。
应用源冻结哈希（19 个文件完整 sha256，含新增 `js/dialog-drag.js`）程序核对 ALL MATCH，见 [`contract-notes-v1.5.2.md`](contract-notes-v1.5.2.md)。

| 场景 | v1.5.2 覆盖点 |
| --- | --- |
| AK 取消保存 | stub saveFile 返回 canceled：工程/配置/诊断日志取消均不 downloadBlob、不弹 picker、无成功提示、状态「已取消保存工程」；随后各成功保存一次（6 次 saveFile：工程/配置/日志×取消+成功） |
| AL 弹窗拖动/背景 | 配置/使用说明 `.help-head` 拖动后坐标改变且视口内、关闭重开仍可视；dialog 背景=panel；`::backdrop` backdrop-filter=none（浅/深）；深色配置弹窗背景 rgb(22,32,51) 非白、文字对比度 ≥4.5 |
| AM 主题色精简 | 仅 6 色 blue/indigo/emerald/pink/rose/amber（无 teal/violet）；pink=#db2777；旧 localStorage teal→emerald、violet→pink 自动迁移；非法 setAccent 被忽略 |

## smoke 已验证结论（Chrome 156 headless，file:// 无任何放宽启动参数）

| 关键假设 | 结论 | 备注 |
| --- | --- | --- |
| playwright-core + 本机 Chrome headless 启动、截图 | ✅ 通过 | `executablePath` 指向本机 Chrome，未下载浏览器 |
| file:// 页面 `setInputFiles` → `FileReader` 读取 | ✅ 通过 | 9/9 文件可读，`dataURL`/`arrayBuffer`/`text` 全部可用 |
| 注入图片解码尺寸 | ✅ 通过 | 9/9 与 `samples/manifest.json` 完全一致（含 SVG 400x240、JPG 1600x1200、alpha PNG 800x600） |
| data URL 图片画进 canvas 后读像素 | ✅ 通过 | 不污染画布，`toDataURL`/`toBlob` 正常 |
| `acceptDownloads` 下载保存 | ✅ 通过 | PNG 235 KB + 文本均保存成功 |
| 下载文件用 Python/PIL 校验 | ✅ 通过 | PIL 打开为 `PNG 640x360`；4 张截图全部可打开 |
| file:// 下 IndexedDB | ✅ **可用** | open/put/get 全部成功，可用于自动保存 |
| file:// 下 localStorage | ✅ 可用 | 读写正常 |
| `fetch('file://…')` 读本地资源 | ❌ 被 CORS 拦截 | `TypeError: Failed to fetch`；**应用不要用 fetch 加载本地资源，改用 FileReader / data URL** |
| `<img src="相对路径">` 显示 file:// 图片 | ✅ 可解码 | 但 ①画入 canvas 后 `getImageData` 抛 `SecurityError`（画布被污染）。要读像素/导出，必须先经 FileReader 转 data URL 再绘制 |

对应用的直接启示：
- 上传/拖放必须走 FileReader（或 `URL.createObjectURL` 后注意 canvas 污染问题；data URL 最稳）。
- 导出下载用 `Blob` + `<a download>`，Playwright `acceptDownloads` 能正常接住。
- IndexedDB 在 `file://` 下可用，自动保存方案可行。
- 若资源需要 fetch，需内嵌（data URI）或改用 `<img>`/`<script>`。

## 示例素材命名

`sample-1..3.png` 1200×900 横图（红/绿/蓝）、`sample-4..5.png` 900×1200 竖图（紫/青）、
`sample-6.png` 1000×1000 方图（深底琥珀）、`sample-alpha.png` 800×600 RGBA（含透明区）、
`sample-logo.svg` 400×240、`sample-photo.jpg` 1600×1200。
每张图带超大编号、图案差异、四角定位标记与 (40,40) 像素探针；`manifest.json` 记录
尺寸/模式/`dominantColor`/`probeOuterColor`/`probeCenterColor`/白底平均色/4×4 缩略图/`sha256`，
可用于 E2E 断言"显示的是哪张图"。
