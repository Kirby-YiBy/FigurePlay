# FigurePlay v1.5.3 E2E 验证记录（托盘修复版本回归）

> 状态：**v1.5.3 冻结源全量 E2E 已通过（0 失败）**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v153` →
> run `2026-11-07_03-56-41-814`，**39/39 场景 PASS，1105/1105 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.5.3.md`、`_dev/screens-v1.5.3/`（42 张关键截图）、
> `_dev/artifacts/e2e-v153/<run>/`（results.json + 17 个关键导出样例，整包 24.21MB，<25MB 预算）。

## 变更范围
- **仅 `js/util.js` 版本号**：`FP.APP_VERSION='1.5.3'`（17788B）；其余 18 个文件 hash 与 v1.5.2 完全一致。
- 桌面托盘修复在宿主侧（最大化→最小化到托盘同一 HWND、IsWindowVisible=False、IsZoomed=True、ShowInTaskbar=True、恢复后最大化）；本项目 E2E 仍覆盖冻结网页端全部契约。
- 所有版本相关断言动态读取（AI 诊断日志等不再硬编码），因此原有 39 场景 1105 断言直接全量复用并通过。

## 应用源冻结哈希（report-v1.5.3.md 快照已程序核对 ALL MATCH，19 个文件）

| 文件 | 字节 | sha256 |
| --- | ---: | --- |
| js/util.js | 17788 | `f53df8dabfc353f196454a2eacf6635c20c7155f3853ce0acbf6a58068fd0f5f` |
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

## 回归
- 旧 v1.5.2 的 1105 断言全部保留并通过（A–AM 共 39 场景）。
- 版本相关断言动态：AI 诊断日志「应用就绪 vX」、日志导出头「版本：X」、工程/配置 appVersion 等均读取 `__FIGPLAY__.version`。
- 无 pageerror / 无 console error（全部场景通过内置检查）。
- 本轮无应用行为变更、未发现新 bug。

## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.5.3 全量 + 正式产物
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v153
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v152
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=AI
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
```
