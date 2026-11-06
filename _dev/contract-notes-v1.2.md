# FigurePlay v1.2 E2E 契约对齐记录（最终版）

> 状态：**v1.2.0 全量 E2E 已通过**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v12` →
> run `2026-11-06_02-13-19-851`，**15/15 场景 PASS，538/538 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.2.md`、`_dev/screens-v1.2/`（17 张关键截图）、
> `_dev/artifacts/e2e-v12/2026-11-06_02-13-19-851/`（results.json + 18 个关键导出样例，整包 12.27MB，<15MB 预算）。

## 应用源冻结哈希（测试时实际快照，report-v1.2.md 亦记录）

| 文件 | 字节 | sha256 |
| --- | ---: | --- |
| index.html | 34004 | `bdfd170f94a4bccd932624f56bc5ddbaa257c16d901a490c5d57ad4feef7cfad` |
| js/app.js | 129913 | `f0d058e362094d71b907317dd8a20f1e02e07a8c245a5bd083437f09b3b336b6` |
| js/layout.js | 15334 | `2cbc1043f7655564f1b77698d04ebb03a8573df6cdde036a4b47205c93aaaa3e` |
| js/render-svg.js | 14395 | `ab398a94c3a5985422bc53bba27357e69d2b672f69eae61a092198d14b9de6c8` ⚠️ |
| js/desktop.js | 5251 | `299855d22f69682fc422084c63fab19adcafe112c277ffa47a0c3fc9101d7222` |
| js/pdf.js | 6260 | `f3b2b1fbcd31c7b2167843c34872697ff9adcd84a1db2ca552ffe5a15578d7a3` |
| js/zip.js | 3940 | `11c6d96644b1d15500f3e542a14a6d14314f97807dec7efa5c2a41b6daca644f` |
| js/export.js | 8894 | `47a773cad4fae83d469cf82685014b30132bf2ab70cd204c3a482e83aae4476b` |
| js/util.js | 17690 | `9544173c00dd13de0853b41aa28e7370b77cacea513333dc52401e02358043ff` |
| assets/styles.css | 34553 | `11ba46e8d0de9b8f0358ce807af55f3868d647eebd9860000dec061dfa3e81d1` |

⚠️ **哈希差异提示**：Lead 通知里的 `render-svg.js` 冻结哈希为 `F22BDED0…14365B`，但当前磁盘文件为
14395B / `ab398a94…`（mtime 2026-11-06 09:57:34，晚于其余文件）。测试按**当前磁盘文件**执行并记录实际哈希；
其余 9 个文件与通知哈希完全一致。请 Lead 确认当前 `render-svg.js` 即最终版（本次全量基于它全绿）。

## v1.2 最终确认契约

### 1) 多页工程（场景 M，31 断言）
- DOM：`#page-tabs .page-tab`（含 active/名称/`X 图` 计数）、`#btn-page-add/#btn-page-dup/#btn-page-del`；双击页签 prompt 改名。
- API：`getPages()`（index/name/filledCount/layout）、`setPage(i)`、`addPage('new'|'duplicate')`、`duplicatePage()`、`deletePage(i)`、`renamePage(i,name)`；
  `getPreviewInfo()` 增加 `pageIndex/pageCount/pageName/pages`；`getState()` 增加 `pages/pageIndex`。
- 行为：新建页复制当前布局/编号设置（不复制图片）；duplicate 复制图片；各页 layout/cells/label/groups 独立；
  删除页有 confirm；切页不影响其它页。
- 自动保存：`storage.save({version:2, project:{version:2,pages:[...],current,export}})`（payload.state 为 snapshot）；
  reload 后页数/当前页/名称/图片 dataUrl 完全恢复。回归 F 的自动保存断言已改为读取 `saved.project.pages[0].cells` 兼容结构。

### 2) 撤销/重做（场景 N，30 断言）
- DOM：`#btn-undo/#btn-redo`（disabled 同步）；快捷键 Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y；弹窗打开或文本输入框聚焦时不触发。
- API：`undo()/redo()/getHistoryState()`（canUndo/canRedo/undoCount/redoCount）。
- 覆盖：布局、编号、上传、模板、页新增、分组创建、页改名、连续偏移（500ms 空闲合并为 1 步）、页切换不入历史；
  undo 后可 redo，新操作清空 redo。
- 实测：连续 3 次偏移只产生 1 步历史；undo 后 offsetX=0、redo 后 offsetX=15。

### 3) 子图分组（场景 O 前半，含导出验证）
- DOM：`#group-list`、`#btn-group-create`、`#group-dialog`（`#group-name/#group-scheme/#group-start/#group-preview/#group-save`）、`.group-chip`（选中/编辑/删除）。
- API：`getGroups()/createGroup({panels,name,scheme,start})/updateGroup(id,opts)/deleteGroup(id)/selectGroup(id)`；
  `getPreviewInfo().groups`、`getState().groups`。
- 编号：组内用组 scheme/start 独立编号，其他面板继续全局编号（实测 2×2：组 A [0,2] roman start3 → `(iii)/(iv)`，面板 1 → `(a)`，空面板跳过）；
  `labels[]` 增加 `groupId`。
- 组框虚线/组名只存在于预览 SVG（`.group-outline/.group-name`），导出 SVG 不包含（测试读取导出文件断言无这些 class）。
- 合并同组面板时锚点保留该组；`deleteGroup` 后恢复全局编号；模板/改网格后 `FP.sanitizeGroups` 清理失效分组。

### 4) 多页导出（场景 O 中段）
- DOM：`#export-scope-row` 仅 pageCount>1 显示；`#export-scope-seg [data-scope=all]`；`#export-scope-note`。
- API：`setExportScope(scope)`；`exportBase64(format,{allPages:true})` / `exportAllBase64(format,overrides)` →
  `{base64,filename,mime,format,pageCount,pageResults,bytes}`。
- PDF：全部页生成多页 PDF（Ghostscript `pdfpagecount` + **pdfinfo `Pages`** 校验；实测 2 页、2 页均可渲染、MediaBox=mm×72/25.4pt）。
- PNG/JPG/SVG：全部页打包 ZIP（store 方式），Python `zipfile` 校验 2 个条目、命名 `*-p01/-p02`、每个文件可解码（PNG/JPG 尺寸=mm/25.4×DPI，SVG XML 合法）。
- UI 全页导出：点击 `#btn-export` 下载 `*-pages.zip` / 多页 PDF（Playwright download 事件接住并再次校验）。
- 导出文件名由 `overrides.filename` 决定（baseName + `-pages.zip`）；测试用不同 baseName 避免不同格式 ZIP 同名覆盖。

### 5) MATLAB .fig（场景 O 后段）
- 桌面桥 mock：`window.chrome.webview`（JSON 字符串消息）。通过 `#file-input` 传 `.fig` 后 app 发
  `{type:'import-fig', requestId, filename, base64}`；host 回 `{type:'fig-imported', requestId, ok:true, dataUrl, width, height,
  sourceFormat:'MATLAB-FIG', convertMs, matlabVersion}` → 单元格插入且 `cell.name` 由 `.fig` 改为 `.png`、尺寸正确、预览 dataURL 与回包一致。
- 浏览器模式（无 webview）：上传 `.fig` 给出可读 toast（含 `.fig/MATLAB/桌面版`），不插入图片，且仅 `console.warn`（不算 console error）。
- 测试 mock 用 PNG dataURL 模拟“宿主已转换”结果；真实 MATLAB 转换属桌面版范围。

## 自动化假设/说明
- v1.2 页面栏使 1000×640 下 stage 高度变矮：预览 shell 宽度由 v1.1 的 268px 降为 234px（fit 缩放），L 场景阈值相应调整为 >200px；
  仍断言三栏 grid、stage 宽 460px、无横向溢出、950 三栏/899 堆叠、1366/1440 复检。
- 回归 A–L 全部保留并适配 v1.2：A–F 229 断言；G–L 226 断言（L 41）；v1.2 M–O 101 断言（M31/N30/O40）；总计 538。
- 磁盘控制：v1.2 模式（`--final-v12`）只复制「每场景首张 + 关键命名（1000x640/multipage/group/fig/bridge/pages/first-screen）」截图到 `screens-v1.2`，
  导出只保留关键样例（e2e 主样例/合并/分组/多页），其余产物在完成校验后裁剪；整包 12.27MB。
- 未发现新的应用真实 bug；仅记录 `render-svg.js` 哈希与通知不一致（见上），以及测试侧修正（多页 ZIP 同名覆盖、`app.api.setPage/setMultiSelect/setLayout` 调用错误、Playwright 页面函数闭包变量等）。

## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.2 全量 + 正式产物（report-v1.2.md / screens-v1.2 / artifacts/e2e-v12/<run>）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v12
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v12
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=O
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
```
