# FigurePlay v1.5.0 E2E 契约对齐记录（工程文件/配置备份/期刊库/图片预检/更新 UI/全页矢量）

> 状态：**v1.5.0 冻结源全量 E2E 已通过（0 失败）**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v150` →
> run `2026-11-06_14-33-21-004`，**32/32 场景 PASS，1003/1003 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.5.0.md`、`_dev/screens-v1.5.0/`（34 张关键截图）、
> `_dev/artifacts/e2e-v150/<run>/`（results.json + 14 个关键导出样例，整包 20.86MB，<25MB 预算）。

## 应用源冻结哈希（report-v1.5.0.md 快照已程序核对 ALL MATCH，17 个文件）

| 文件 | 字节 | sha256 |
| --- | ---: | --- |
| index.html | 47343 | `ecf5a727c98bcb59e6451120de9205b54a668a78426a73b31331ed67d920208a` |
| assets/styles.css | 42373 | `4253798fafa15d25d90513b09d73833cb3385384342be7670813bc6923348f21` |
| assets/theme.css | 6988 | `d23c9f653aa27e782629406676b4d0c3980f6a7f91b7657707dc51a63f0b05fe` |
| js/app.js | 168367 | `2b200b6bfbfacc058f6404a8b8d506970399fdce27c1fa745255dd583ec9cfde` |
| js/appearance.js | 5109 | `62093ae77a7a5770f0139c41a23004bc58f420384a3fe0df6b514642c1ef3ab2` |
| js/config-profiles.js | 24175 | `10221edd07e31abb06b2c2adace6af24aa227bfba2f546e5c9ec708e3ae00c86` |
| js/desktop.js | 12078 | `08d6915e3ffd3cf455882952261f682b3bb1d4338625454f5529bc1914d93534` |
| js/project-file.js | 6547 | `d7ea32582ce42ded09da3e057ad1539b81b0bcd8deb1a37db3cd71d50e6ba8ac` |
| js/journal-presets.js | 7642 | `a1f4cce6217fcfb356b0052d9aec824d60a4f99b73ba1153a40ebb60c9874616` |
| js/preflight.js | 3403 | `3fb9d4a1e7fe88f696b5ad5ac8e46cae1c31cab2cc8d030ea223f06a24c462ec` |
| js/updates.js | 4227 | `6d9833102f69ee5a8af6150cd6a68c45445219269d9dab5be8add1a7efcbb4b5` |
| js/layout.js | 18898 | `094eedc49361d43c9cf16cfbb556a2914c72ec846b48353f5f8bc6f497bb5c8f` |
| js/render-svg.js | 17116 | `6dba2ae85d3b9f83afd87bf967bece41cb14a92655089f60efadcd6aa21679e9` |
| js/pdf.js | 6260 | `f3b2b1fbcd31c7b2167843c34872697ff9adcd84a1db2ca552ffe5a15578d7a3` |
| js/zip.js | 3940 | `11c6d96644b1d15500f3e542a14a6d14314f97807dec7efa5c2a41b6daca644f` |
| js/export.js | 15133 | `c73bcbb7c1b70cce4613d67bebc030fa9bbe778de049b2971118dc1c19c1cf0d` |
| js/util.js | 17788 | `58227aeced3fb1a14117641826a78249558ac1e7a487c9244ce70d50cc105b44` |

`FP.APP_VERSION='1.5.0'`。

## v1.5.0 新契约与实测（新增 AA–AF 共 80 断言）

### AA 工程文件（18 断言）
- `getProjectSnapshot()` 返回 `type=figureplay-project`、`schemaVersion=1`、`appVersion=1.5.0`、`savedAt`、`project.pages[]`；快照含图片 `dataURL`、`layout/label/groups/export`（2 页，page1 2 图 + 1 分组，page2 1 图；同尺寸 170mm）。
- 禁用 `showSaveFilePicker` 后点「保存工程…」**真实下载** `.figureplay-project`（118,986B）；文件为合法 JSON 且含 `"dataUrl":"data:image/`。
- 改布局（2×2→3×2）并清空当前页后通过 `#project-file-input` 打开工程（confirm 接受）：恢复 2 页/3 图、2×2/170mm、Arial 8、PDF、分组「工程组」；`#project-file-meta`=「2 页 · 3 图」、状态「已打开工程」。
- 错误文件（错误 type / 未来 schemaVersion=99 / 非法 JSON）均中文报错且不改变当前工程。

### AB 配置备份恢复（12 断言）
- 桌面宿主 mock：配置 init `loadConfigProfiles`、`#config-restore-backup` 可见。
- 点「恢复上一份备份」：先 `list-config-backups`（2 个备份，按 modifiedAt 取最新 `profiles-2026-11-06-1200.json`）→ confirm「替换当前配置列表」→ `read-config-backup` 返回 `[备份配置 B, 备份配置 C]` → 替换列表并调用 `saveConfigProfiles` 触发 host save；UI 计数=2、状态「已从备份恢复 2 个配置」。
- 浏览器模式（独立 context）隐藏「恢复上一份备份」按钮。

### AC 期刊配置库（14 断言）
- 对话框 11 张预设卡片、5 个分组（Nature/IEEE/Elsevier/Science/学位论文）、含 Author Guidelines 免责提示；11 个预设 id 唯一、均 4:3、有套用按钮。
- 套用 **Nature 单栏**：width=89、4:3、列距2/行距2、Arial 8pt/inset1.2/编号显示、PDF 300DPI 自动裁边；当前网格（2×3）与 5 张图片不变。
- 再套用 **Science 单栏**：55mm、间距1.5、Arial 7pt；图片数量仍 5。

### AD 图片预检（12 断言）
- 低分辨率 120×90：warnings=`["有效分辨率约 36 DPI，低于 150 DPI…","像素尺寸仅 120×90，建议至少 500×400 px"]`，写入 `__PREFLIGHT_LAST__` 且中文 toast。
- 高分辨率 1200×900（2×2/170mm）：DPI≈362.9、无警告。
- 拉伸 fake cell（800×100，fit=stretch）：warnings 含「图片被拉伸：原图比例 8.00，格子比例 1.33（变形约 500%）」等中文提示。

### AE 更新 UI（10 断言）
- 桌面 mock + 预注入 `checkUpdate/downloadUpdate` stub：帮助弹窗点「检查更新」→ 显示「发现新版本 1.5.1（当前 1.5.0）…更新说明」、下载按钮可见，checkCalls=1。
- 点「下载并更新」（confirm 接受）→ downloadUpdate 调用 1 次，状态「更新已下载并通过 SHA256 校验，准备安装」。
- 浏览器模式：检查更新按钮禁用、下载按钮隐藏、提示浏览器更新方式。

### AF 全页矢量（14 断言）
- 2 页同尺寸（2×2/170mm）工程，每页 1 个 EMF（`desktop\selftest\test-figure.emf`）+ PDF/全部页。
- 提示「全部 2 页将合并为一个矢量 PDF」；stub `exportVectorPdfMulti` 被调用 **1 次**，捕获 `pages.length=2`，每页 spec 含 `panels/labels`（本例各 1）、宽 170mm、两页高度一致（128mm）；下载 `.pdf`。
- 尺寸不一致（page2 改 120mm）：矢量勾选禁用、提示回退多页位图 PDF，导出不再调用 `exportVectorPdfMulti`（仍为 1 次），回退 PDF 生成成功。

## 回归
- 旧 v1.4.2 的 923 断言全部保留；新增 AA–AF 80 → 总计 **1003**，全通过（A–AF 共 32 场景）。
- v1.4 宿主持久化、v1.4.1 label bbox、v1.3 外观/导出隔离/负间距/裁剪等旧断言在 v1.5.0 下继续通过。

## 自动化假设/说明
- 更新 UI mock 在页面加载前用 init script 轮询给 `FP.desktop` 挂 `checkUpdate/downloadUpdate`（真实桌面宿主才提供这两个方法）。
- 配置备份使用 WebView2 bridge mock 的 `list-config-backups`/`read-config-backup` 消息按 requestId 响应。
- 全页矢量 stub 捕获 `exportVectorPdfMulti(pages)`；不启动 PowerPoint。回退场景真实走应用多页位图 PDF 路径。
- 工程文件下载通过临时移除 `showSaveFilePicker` 强制走下载回退，读取真实下载文件。
- 期刊库运行时 `window.__JOURNAL_PRESETS__.list` 是数组（不是函数），测试 helper 已兼容。
- 本轮未发现新的真实应用 bug。

## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.5.0 全量 + 正式产物（report-v1.5.0.md / screens-v1.5.0 / artifacts/e2e-v150/<run>）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v150
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v15
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=AA
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
```
