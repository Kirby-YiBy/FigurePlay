# FigurePlay v1.4.1 E2E 契约对齐记录（矢量 PDF label spec 预览 bbox）

> 状态：**v1.4.1 冻结源全量 E2E 已通过（0 失败）**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v141` →
> run `2026-11-06_13-10-06-625`，**25/25 场景 PASS，894/894 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.4.1.md`、`_dev/screens-v1.4.1/`（28 张关键截图）、
> `_dev/artifacts/e2e-v141/<run>/`（results.json + 21 个关键导出样例，整包 19.78MB，<20MB 预算）。

## 应用源冻结哈希（report-v1.4.1.md 快照已程序核对 ALL MATCH，13 个文件）

| 文件 | 字节 | sha256 |
| --- | ---: | --- |
| index.html | 44893 | `73f4001dbba6e15660c835e06e14375a583809b44231d7a3141d6f9ddb0f1c5d` |
| assets/styles.css | 40904 | `7a9c1b8a0bbe7ad4808c79f01584ac40149ed5086381efd7e2e1055f87db024d` |
| assets/theme.css | 6988 | `d23c9f653aa27e782629406676b4d0c3980f6a7f91b7657707dc51a63f0b05fe` |
| js/app.js | 162221 | `ba1049d6e5c549a46b9902a4dc69a968d0142e6ec645af6415cb3241c02573f4` |
| js/appearance.js | 5109 | `62093ae77a7a5770f0139c41a23004bc58f420384a3fe0df6b514642c1ef3ab2` |
| js/config-profiles.js | 18460 | `4c8ddd4afeb6140d86febd5f8ee0b58ec70a5b23636baa13c9c7fe6dd563b481` |
| js/layout.js | 18898 | `094eedc49361d43c9cf16cfbb556a2914c72ec846b48353f5f8bc6f497bb5c8f` |
| js/render-svg.js | 17116 | `6dba2ae85d3b9f83afd87bf967bece41cb14a92655089f60efadcd6aa21679e9` |
| js/desktop.js | 7012 | `1b26b2ecc64f220d318a546dbb8ea579bda902a0ab49d586d11da2e9f35c6a93` |
| js/pdf.js | 6260 | `f3b2b1fbcd31c7b2167843c34872697ff9adcd84a1db2ca552ffe5a15578d7a3` |
| js/zip.js | 3940 | `11c6d96644b1d15500f3e542a14a6d14314f97807dec7efa5c2a41b6daca644f` |
| js/export.js | 15133 | `c73bcbb7c1b70cce4613d67bebc030fa9bbe778de049b2971118dc1c19c1cf0d` |
| js/util.js | 17788 | `c53eb3b285b949c98722a839490cd36dd13860cdee1c96566ba529024c42c8f1` |

`FP.APP_VERSION='1.4.1'`。

## v1.4.1 新契约与实测（新增 Y 场景 29 断言）

### 新字段
`exportVectorPdfBase64` / `buildVectorPdfSpec` 的 `spec.labels[]` 新增 4 个字段：
`textLeftMm`、`textTopMm`、`textWmm`、`textHmm` —— 由预览 `.label-text` 的 `getBBox()` 直接测得（SVG 用户单位=mm），
用于桌面端垂直校正。导出前会 `await document.fonts.ready`（`doExport` 与 `exportVectorPdfBase64` 两处均等待）。

### 配置1（与桌面端约定一致）
2 行×3 列、170mm、4:3、`colGap=-4`、`rowGap=1`、autoPad=true；label `bc / inset1.5 / offsetX1 / offsetY4 / Times 9pt`；
6 张图 + 1 个 EMF 图（使矢量 PDF 可用），PDF 格式。

| 检查项 | 实测 |
| --- | --- |
| spec.labels 数量/字段 | 6 项，textLeftMm/textTopMm/textWmm/textHmm 均为有限数值 |
| 与预览 `.label-text` getBBox 对比 | 6 项全部满足 dx=dy=dw=dh=**0.000mm**（要求 ≤0.05mm） |
| `(c)` 位置/高度 | textTopMm=**43.507mm**（预期≈43.58，±0.15 内）、textHmm=**3.478mm**（预期≈3.44，±0.1 内）、宽度>0 |
| 原有字段保留 | fontSizePt=9、fontName=Times New Roman、align 等均存在 |
| 字体等待 | document.fonts.status=**loaded**；stub 捕获时刻字体状态=loaded；两次导出 spec.labels 完全一致、预览 getBBox 不变（无 fallback 抖动） |
| 截图 | `Y-01-label-spec-bbox.png` |

stub 方式：`FP.desktop.exportVectorPdf` 被替换为捕获 spec 的 async stub（不启动 PowerPoint），通过
`__FIGPLAY__.exportVectorPdfBase64()` 触发真实构建链路；桌面桥 mock 提供带 `emfBase64` 的 `.fig`。

## 回归
- 旧 v1.4.0 的 865 断言全部保留；新增 Y 29 → 总计 **894**，全通过（A–Y 共 25 场景）。
- 全量中 V 负间距测试增加「几何真正重排」等待守卫（避免状态已变、面板坐标读取过早的瞬时竞态，非应用 bug）。

## 自动化假设/说明
- bbox 对比基准为同一字体 ready 状态下的 preview `.label-text getBBox()`；`(c)` 期望值来自 E2E 契约（±0.15/±0.1 容差）。
- 字体 ready 等待用 `page.evaluate(() => document.fonts.ready)`，并在 stub 捕获时记录 `document.fonts.status` 作为证据。
- 配置模板 X 的 appVersion 断言改为动态读取 `__FIGPLAY__.version`（1.4.1），导入预览只要求本机配置数量与 localStorage 不变（不依赖 active 状态）。
- 本轮未发现新的真实应用 bug。

## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.4.1 全量 + 正式产物（report-v1.4.1.md / screens-v1.4.1 / artifacts/e2e-v141/<run>）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v141
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v13
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=Y
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
```
