# FigurePlay v1.4.0 E2E 契约对齐记录（配置模板：保存/应用/导入导出 JSON）

> 状态：**v1.4.0 冻结源全量 E2E 已通过（0 失败）**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v140` →
> run `2026-11-06_12-30-41-776`，**24/24 场景 PASS，865/865 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.4.0.md`、`_dev/screens-v1.4.0/`（27 张关键截图）、
> `_dev/artifacts/e2e-v140/<run>/`（results.json + 21 个关键导出样例，整包 19.18MB，<20MB 预算）。

## 应用源冻结哈希（report-v1.4.0.md 快照已程序核对 ALL MATCH，13 个文件）

| 文件 | 字节 | sha256 |
| --- | ---: | --- |
| index.html | 44893 | `73f4001dbba6e15660c835e06e14375a583809b44231d7a3141d6f9ddb0f1c5d` |
| assets/styles.css | 40904 | `7a9c1b8a0bbe7ad4808c79f01584ac40149ed5086381efd7e2e1055f87db024d` |
| assets/theme.css | 6988 | `d23c9f653aa27e782629406676b4d0c3980f6a7f91b7657707dc51a63f0b05fe` |
| js/app.js | 161160 | `89d147585ef7993eb9f380964e29446f72429c8cfca58db3853045d01cf130a7` |
| js/appearance.js | 5109 | `62093ae77a7a5770f0139c41a23004bc58f420384a3fe0df6b514642c1ef3ab2` |
| js/config-profiles.js | 18460 | `4c8ddd4afeb6140d86febd5f8ee0b58ec70a5b23636baa13c9c7fe6dd563b481` |
| js/layout.js | 18898 | `094eedc49361d43c9cf16cfbb556a2914c72ec846b48353f5f8bc6f497bb5c8f` |
| js/render-svg.js | 17116 | `6dba2ae85d3b9f83afd87bf967bece41cb14a92655089f60efadcd6aa21679e9` |
| js/desktop.js | 7012 | `1b26b2ecc64f220d318a546dbb8ea579bda902a0ab49d586d11da2e9f35c6a93` |
| js/pdf.js | 6260 | `f3b2b1fbcd31c7b2167843c34872697ff9adcd84a1db2ca552ffe5a15578d7a3` |
| js/zip.js | 3940 | `11c6d96644b1d15500f3e542a14a6d14314f97807dec7efa5c2a41b6daca644f` |
| js/export.js | 15133 | `c73bcbb7c1b70cce4613d67bebc030fa9bbe778de049b2971118dc1c19c1cf0d` |
| js/util.js | 17788 | `ee6040a4f5b7f4a26fae11b270cbb546ae627bde061839028939018935703e9f` |

`FP.APP_VERSION='1.4.0'`。

## v1.4.0 新契约与实测（新增 X 场景 46 断言）

### 1) 目标配置与保存（localStorage）
- 目标配置：3×2、170mm、列距3/行距1、编号 number-dot/start2/bc、Arial 11pt、PDF 300DPI、trim1.5mm、矢量。
- 左侧「保存当前配置…」打开 `#config-dialog`；`#config-save-summary` 显示「3 行 × 2 列 · 170 mm · 列距 3 / 行距 1 mm · 编号 底部中间 / Arial 11pt · PDF 300 DPI · 自动裁边1.5mm · 矢量」。
- 保存后 `#config-count=本机 1 个`，`localStorage['figureplay.configProfiles.v1']` 1 条；payload 含 `type/schemaVersion/name/description/appVersion/createdAt/layout/label/export`，不含图片/cells/dataURL；列表项显示名称/说明/摘要及 应用/导出 JSON/删除 按钮；reload 后配置仍在。

### 2) 应用配置
- 有图片（2 张）且网格从 2×2 → 3×2 时应用会 `window.confirm`（重排/可能丢弃提示），接受后：rows/cols/gaps/label（number-dot/Arial11/bc）/export（PDF/300/裁边1.5/矢量）全部恢复；图片 2 张数量与顺序保持不变（按行重排）；左侧「最近应用」显示名称与说明。
- 无图片时应用同一配置不弹 confirm，网格恢复 3×2。

### 3) 导出 JSON
- UI「导出 JSON」下载 `*.figureplay.json`（1286B 样例）。payload 结构严格：
  `type='figureplay-config'`、`schemaVersion=1`、`name/description/appVersion='1.4.0'/createdAt(ISO)`、`layout/label/export`；
  无 `cells`/`dataUrl`/`base64`/`image/`，可原文重新导入。

### 4) 导入 JSON
- 通过 `#config-file-input` 导入有效文件：先显示 `#config-import-preview`（名称/来源版本1.4.0/说明/参数摘要），配置数量不变；取消隐藏预览。
- 「应用此配置」→ 网格恢复 3×2、数量不变；「保存到本机」→ 数量 1→2、`#config-count=本机 2 个`。
- 无效导入三类均中文报错且不落盘（数量与 localStorage 原文不变、预览隐藏）：
  - 错误 type →「不是 FigurePlay 配置文件…」
  - 未来 schemaVersion=99 →「配置文件版本较新（v99），当前程序最高支持 v1…请升级 FigurePlay」
  - 非法 JSON →「JSON 解析失败…」

### 5) 配置 API 与隔离
- `getConfigSnapshot()` 仅含 layout/label/export（无 cells/filename）；`normalizeConfigSnapshot()` 合并/规范化；`applyConfigSnapshot()` 返回 `{ok,layoutChanged,dropped,...}`，重复应用同一配置 `layoutChanged=false/dropped=0`。
- 保存配置不改变主题（dark+violet 保持）、不新增项目历史（undoCount 不变）；应用配置后主题不变、历史最多 +1 步、重复应用同一配置不再新增历史；项目自动保存 payload 不含 configProfiles/figureplay-config；本机配置存于独立 key，与项目 session 分离。

## 回归
- 旧 v1.3.4 的 819 断言全部保留；新增 X 46 → 总计 **865**，全通过（A–X 共 24 场景）。
- 外观/导出隔离/负间距/ink 裁剪等旧断言在 v1.4.0 下继续通过。

## 自动化假设/说明
- 配置 JSON 导出在 headless 下用「移除 showSaveFilePicker」强制走下载回退，读取真实下载文件校验 payload。
- 有图片应用配置的 confirm 用 Playwright `dialog` 处理器 accept；无图片场景验证不弹 confirm。
- 对话框为 modal：应用/关闭后需等待 `dialog.open=false` 再继续其它 UI 操作。
- 报告快照由动态扫描 `index.html` + `assets/*.{css,js}` + `js/*.js` 生成，自动包含新文件 `config-profiles.js`。
- 本轮未发现新的真实应用 bug。

## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.4.0 全量 + 正式产物（report-v1.4.0.md / screens-v1.4.0 / artifacts/e2e-v140/<run>）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v140
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v13
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=X
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
```
