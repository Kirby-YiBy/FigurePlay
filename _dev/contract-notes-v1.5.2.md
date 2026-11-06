# FigurePlay v1.5.2 E2E 契约对齐记录（取消保存 / 弹窗拖动背景 / 主题色精简）

> 状态：**v1.5.2 冻结源全量 E2E 已通过（0 失败）**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v152` →
> run `2026-11-06_16-30-00-591`，**39/39 场景 PASS，1105/1105 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.5.2.md`、`_dev/screens-v1.5.2/`（42 张关键截图）、
> `_dev/artifacts/e2e-v152/<run>/`（results.json + 17 个关键导出样例，整包 24.22MB，<25MB 预算）。

## 应用源冻结哈希（report-v1.5.2.md 快照已程序核对 ALL MATCH，19 个文件）

| 文件 | 字节 | sha256 |
| --- | ---: | --- |
| index.html | 47763 | `a6db57349abaf3d90bd201174dd3901cd94e6a5aa7b605d05e3477422803a569` |
| assets/styles.css | 42951 | `100542cb575a148ff68933e534972e0ce11e0304e939b9a393fbd3f5f7f386d4` |
| assets/theme.css | 7134 | `bbbc9f2dc337ac793e90957b4ca4df5164131d4724651bf11640b010c816c6a9` |
| js/app.js | 169700 | `9b0c9a3376af1c81e37506f3fd80e4cba833242811d6f94863c3eea861e37e48` |
| js/appearance.js | 5343 | `0c87287e01be837fa54163e2c4ad1905df31cc604f42b2a64ff04eece04c16a8` |
| js/config-profiles.js | 25023 | `8f72860e34b99483601e600b3fa0b07491a37dd2d3fc370f91b3c4b92d15021f` |
| js/desktop.js | 14779 | `33141c77960dbbe94e2ec96ea04af27602f520bee8de9ff77fb3e95d9ae9d080` |
| js/project-file.js | 7542 | `5e79313a528b90357e848db9e5696d00473f27b38c882a09272711dc309d24de` |
| js/journal-presets.js | 7642 | `a1f4cce6217fcfb356b0052d9aec824d60a4f99b73ba1153a40ebb60c9874616` |
| js/preflight.js | 3403 | `3fb9d4a1e7fe88f696b5ad5ac8e46cae1c31cab2cc8d030ea223f06a24c462ec` |
| js/updates.js | 4227 | `6d9833102f69ee5a8af6150cd6a68c45445219269d9dab5be8add1a7efcbb4b5` |
| js/logs.js | 5440 | `06dc11fce5bff103c18b34c6b03935ef28f86e48ad45669edc504649b74d4c9f` |
| js/dialog-drag.js | 3141 | `9cc812f90d4fc472183ae6b47b0d7d25fcf7cd1a92b9f923b55ce68dc4883bca` |
| js/layout.js | 18898 | `094eedc49361d43c9cf16cfbb556a2914c72ec846b48353f5f8bc6f497bb5c8f` |
| js/render-svg.js | 17116 | `6dba2ae85d3b9f83afd87bf967bece41cb14a92655089f60efadcd6aa21679e9` |
| js/pdf.js | 6260 | `f3b2b1fbcd31c7b2167843c34872697ff9adcd84a1db2ca552ffe5a15578d7a3` |
| js/zip.js | 3940 | `11c6d96644b1d15500f3e542a14a6d14314f97807dec7efa5c2a41b6daca644f` |
| js/export.js | 15133 | `c73bcbb7c1b70cce4613d67bebc030fa9bbe778de049b2971118dc1c19c1cf0d` |
| js/util.js | 17788 | `420a1b6886a278b9e1896308682ac845ebe6bcc29f6faf08b5d4be8c7f5c2270` |

`FP.APP_VERSION='1.5.2'`。

## v1.5.2 新契约与实测（新增 AK–AM 共 40 断言）

### AK 取消保存（12 断言）
- stub `FP.desktop.saveFile` 返回 `{ok:false,canceled:true,error:'已取消保存。'}`，同时跟踪 `FP.downloadBlob` 与 `showSaveFilePicker`。
- **工程**：取消后 `#project-file-status`=「已取消保存工程」，`downloadBlob` 0 次、picker 0 次、无成功 toast；随后成功回包 path → 状态含 `C:\Users\E2E\Documents\cancel-success.figureplay-project`。
- **配置**：列表「导出 JSON」取消 → 1 次 saveFile(.json)、不下载/不弹 picker、无「已导出配置」toast；成功回包后 toast 含 `cancel-config.json`。
- **诊断日志**：导出取消 → 1 次 saveFile(.log)、不下载/不弹 picker、无「诊断日志已保存」toast；成功回包后 toast 含 `cancel-log.log`。
- 汇总：6 次 saveFile（工程/配置/日志各取消+成功）、全程 0 下载/0 picker，取消不落盘。

### AL 弹窗拖动/背景（15 断言）
- 配置/使用说明 `.help-head` 均带 `dialog-drag-handle`（title「按住拖动窗口」）；真实鼠标拖动后 left/top 改变且完整位于视口内。
- 关闭后重新打开位置仍在可视范围（dialog open 事件 clamp）。
- dialog 背景 = `var(--panel)`（浅色 rgb(255,255,255)）；`::backdrop` `backdrop-filter: none`（浅/深色均验证）。
- 深色主题配置弹窗背景 = rgb(22,32,51)（非白），文字对比度 ≥4.5:1；深色下关闭重开仍为深色且视口内；切回浅色恢复 panel。
- 证据：`AL-01-dialog-drag.png`。

### AM 主题色精简/迁移（13 断言）
- 仅 6 个色块：`blue/indigo/emerald/pink/rose/amber`，DOM 无 teal/violet。
- pink 色块 `#db2777`（rgb(219,39,119)）、label 粉色；选择 pink 后 `data-accent=pink`、`--accent=#db2777`、localStorage=pink、active/aria 正确。
- 旧值迁移：localStorage accent=`teal` → **emerald**；accent=`violet` → **pink**（data-accent 与 localStorage 同步）；`setAccent('teal'/'violet')` 被忽略。
- 深浅主题切换 + 6 色渲染无页面异常。
- 证据：`AM-01-accent-palette.png`。

## 回归
- 旧 v1.5.1 的 1065 断言全部保留；新增 AK–AM 40 → 总计 **1105**，全通过（A–AM 共 39 场景）。
- 旧主题相关断言按新设计更新：W 主题色数量 7→6、去除 teal/violet、持久化/导出隔离示例改用 pink；X/Z 的 dark+violet 改为 dark+pink；W 的 45 条、X 46 条、Z 29 条计数保持不变。
- AI 诊断日志版本断言改为动态读取 `__FIGPLAY__.version`（1.5.2），避免版本升级硬编码。

## 自动化假设/说明
- 取消保存用 stub `FP.desktop.saveFile` 队列返回 canceled；通过包装 `downloadBlob`/`showSaveFilePicker` 证明取消路径无下载、无 picker、无成功提示。
- 弹窗拖动使用 Playwright 真实鼠标 pointer 事件；`::backdrop` 计算样式通过 `getComputedStyle(dialog,'::backdrop')` 读取。
- 主题色迁移在 reload 后由 appearance.js `readPrefs()` 自动映射并回写 localStorage。
- 本轮未发现新的真实应用 bug。

## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.5.2 全量 + 正式产物（report-v1.5.2.md / screens-v1.5.2 / artifacts/e2e-v152/<run>）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v152
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v152
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=AK
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
```
