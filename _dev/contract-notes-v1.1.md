# FigurePlay v1.1 E2E 契约对齐记录（最终版）

> 状态：**v1.1（APP_VERSION 1.1.0）全量 E2E 已通过**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v11` →
> run `2026-11-05_18-41-51-108`，**12/12 场景 PASS，433/433 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.1.md`、`_dev/shots-v1.1/`（32 张）、`_dev/artifacts/exports-v1.1/`（18 个导出样例）。
> 应用快照：styles.css 32062B / sha256 `ab7565335aaa81992660877856109201deb352e0b810233aca480fdbcf583f03`（高 DPI 断点修复版），其余应用文件与上一轮一致。

## 最终确认的 v1.1 契约

### 面板 / 合并
- `layout.merges: [{r,c,rs,cs}]`（0 基）；`getState().layout.merges` 深拷贝。
- `getPreviewInfo()`：`panels[]`（index/row/col/rowSpan/colSpan/x/y/w/h/merged，mm）、`cellCount`=面板数、
  `gridCellCount`=rows×cols、`merges`、`multiSelect`、`filled`、`labels`、`imageCount`。
- `js/layout.js`：`computeGeometry(layout)` 同时返回 `cells`（完整网格）与 `panels`（仅锚点），与测试侧
  `computePanelsMm()` 独立复算逐字段一致（容差 0.02mm）。
- `.cell-hit[data-index]` 只渲染面板 anchor；`.cell.selected` 高亮 **多选时 3 个面板均带 `.is-selected`**。
- 多选：plain click 已填=单选；plain click 空=打开粘贴弹窗；Ctrl/Shift+click=切换多选（空/已填均可），
  **必须从第一次点击就按住 Ctrl/Shift**。`#multi-controls` 内为 `#multi-merge` / `#multi-batch-label` / `#multi-cancel`；
  拆分按钮为 `#cell-split`（选中合并面板时可见）。
- `mergePanels(indices,{force})→{ok,error,info}`：不做完整矩形返回 `{ok:false,error:'所选子图需要组成完整矩形才能合并（当前不连续）'}`；
  选中有图面板未 force 返回 `{ok:false,error:'multiple-images'}`，`{force:true}` 保留首图合并。
  `splitPanel(index)→{ok,error,info}`。
- 导出 SVG：每面板一个 `<clipPath id="fp-clip-<anchor>"><rect x/y/w/h=面板几何(mm)>`；
  测试用 `verify-exports.py --expect-clip-rects-json/--expect-no-overlap` 校验 clip 几何与期望一致且互不重叠，
  `text.label-text` 位置与合并面板一致。

### 模板（8 个，`getTemplates()` API + `.template-card[data-template]`）
| id | rows×cols | widthMm | merges | fontSize |
| --- | --- | ---: | --- | ---: |
| single-1 | 1×1 | 85 | [] | 8 |
| single-2v | 2×1 | 85 | [] | 8 |
| single-15-2x2 | 2×2 | 120 | [] | 8.5 |
| double-2x3 | 2×3 | 170 | [] | 9 |
| double-3x2 | 3×2 | 170 | [] | 9 |
| double-2x2 | 2×2 | 170 | [] | 9 |
| double-1plus3 | 2×3 | 170 | [{r:0,c:0,rs:1,cs:3}]（4 面板） | 9 |
| double-left-big | 2×3 | 170 | [{r:0,c:0,rs:2,cs:1}]（5 面板） | 9 |

应用模板后已有图片按面板顺序重排、超出新面板丢弃并 toast（`（图片较多，丢弃了 N 张）`）；点击卡片即应用并关闭弹窗。

### 批量编号
- 多选后 `#multi-batch-label` → `#batch-label-dialog`（`#batch-scheme/#batch-start/#batch-preview/#batch-apply/#batch-clear/#batch-close`）。
- 套用后只对**所选有图面板**写 `cells[anchor].customLabel`（编号连续编号，空图跳过）；预览与导出 SVG 文字一致。
- `#batch-apply`、`#batch-clear` 点击后弹窗**自动关闭**（测试已按此断言，不再调 batchClose，否则等待超时）。

### 粘贴小画布
- 点击空面板 / 工具栏 `#btn-paste` / 双击已填面板（替换）/ 弹窗关闭时全局 Ctrl+V / 拖放到画面，
  均打开 `#paste-dialog`（浏览器模式不再直接弹文件选择器）。
- 输入路径：`#paste-zone` 合成 `ClipboardEvent('paste')`（DataTransfer File）、`#paste-zone` 拖放、
  `#paste-pick-file`+`#paste-file-input` 本地文件；预览 `#paste-preview-img`，确认 `#paste-confirm`、取消 `#paste-cancel`、重试 `#paste-retry`。
- `#paste-continue` 默认勾选；确认后**弹窗保持打开**并切到下一个空面板（`getPasteState().target` 可观测），
  且不自动重读旧剪贴板；取消勾选则确认后关闭。`getPasteState()` 返回 `{open,target,hasPreview,desktopBridge}`。
- 浏览器模式（无 `window.chrome.webview`）：`#paste-read-clipboard` 从 DOM 移除；桌面模式可见。

### 高 DPI / 响应式断点（最后一轮 CSS 修复）
- 背景：桌面版 150% Windows 缩放下 WebView2 CSS 视口≈1000px，曾命中旧 `@media(max-width:1060px)` 堆叠布局导致预览消失。
- 修复后断点：≤1100px 三栏紧凑布局（244px / 1fr / 296px）；≤900px 堆叠（`display:block`）；1440/1240 为常规三栏。
- 新增场景 **L 高DPI布局**（`contextOptions.viewport={1000,640}`）断言：
  - **1000×640**：`.app` computed `display=grid`、`gridTemplateColumns` 三列（实测 `244px 460px 296px`）、
    `scrollWidth<=innerWidth+1`、`#stage` 宽 460 可见、`#figure-shell` 宽 268>250、左右面板均可见；
  - **950×640**：仍三栏（244/410/296）、无横向溢出；
  - **899×640**：命中堆叠断点（`display=block`）、无横向溢出、预览仍可见；
  - **1366×768 / 1440×900**：三栏、无横向溢出、预览可见（保留 1366 检查）。
- 测试只依赖运行时 computed style 与几何，不硬编码 1060 等旧断点假设。

### 桌面桥（`window.chrome.webview` mock）
- app 启动发 `webview.postMessage(JSON.stringify({type:'app-ready',version}))`；
  `FP.desktop.readClipboardImage()` 发 `read-clipboard-image`（JSON 字符串，`requestId` 形如 `fp-<seq>-<ts36>`），
  host 回 `{type:'clipboard-image',requestId,ok:true,dataUrl,width,height,sourceFormat:'EMF'}` 后预览可确认填入；
  `ok:false` → 错误提示，点击 `#paste-retry` 重发新 `requestId`。
- 测试 mock 见 `lib/app.mjs#installDesktopBridgeMock`（兼容 JSON 字符串消息；`window.__figplayBridge.sent/.receive`），
  真实 EMF 由桌面版助手验证，本测试只覆盖前端桥接。

## 本轮测试发现并由 Lead 修复的应用 bug（回归已覆盖）
1. 多选高亮只显示 1 个（render-svg 的 isSelected 读 `state.multiSelect`，app 未同步）→ 已修复；测试断言 `.is-selected=3`。
2. 真实鼠标双击已填面板无法打开替换弹窗（pointerdown 立即 setPointerCapture 导致 click/dblclick target 变 `<svg>`）→ 已修复；J 场景保留双击路径断言。
3. 工具栏 `#btn-paste` / 全局 Ctrl+V 抛 `TypeError: Cannot read properties of undefined (reading 'length')`（`targetPanelForPaste` 读不存在的 `state.multiSelect`）→ 已修复；J 场景保留两条路径断言。
4. 桌面桥模式 `#paste-read-clipboard` 仍带 hidden → 已修复（桌面可见、浏览器移除）；K 场景断言 DOM+可见性。
5. 高 DPI 断点回归：旧 `@media(max-width:1060px)` 在 1000px CSS 视口误触发堆叠 → Lead 改为 ≤1100 三栏紧凑、≤900 堆叠；新增 L 场景锁定（1000/950 三栏、899 堆叠、1366/1440 复检）。
6. 测试侧修正（非应用 bug）：D 场景编号颜色断言加入“fill=#ff0000”的显式等待，消除 setColorInput 后单帧渲染时序偶发（连续 3 次单跑 + 全量均稳定）。

## 自动化假设/限制（记录备查）
- 模板点击即应用并关窗（若未来改为“选中+确认”，`chooseTemplate()` 有 `#template-apply`/Esc 兜底）。
- 合并非法选择：UI 禁用或 toast 或 merges 不变三者之一视为通过，另用 API 校验具体 error 文案。
- 合并 PNG 像素探针：合并面板中心放深色 sample-6 → 中心非白；外边距/行间距白底。未覆盖 cover/stretch 下的跨列铺满像素分析（SVG clip 几何已覆盖"无重叠/跨列"）。
- K 场景用 JPEG dataURL 模拟“EMF 已由 host 转 PNG”的回包（host 转换本身不在前端范围）。
- v1.0 回归 A–F 全部保留并通过（229 断言），空面板 plain click 行为变化不影响 A–F（上传走 `setUploadTarget + #file-input`）。

## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.1 全量（v1.0 回归 A–F + v1.1 新功能 G–K）+ 正式产物
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v11
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v10
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v11
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=G
```
