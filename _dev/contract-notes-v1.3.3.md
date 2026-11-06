# FigurePlay v1.3.3 E2E 契约对齐记录（交互描边顶层 overlay）

> 状态：**v1.3.3 冻结源全量 E2E 已通过（0 失败）**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v133` →
> run `2026-11-06_10-35-17-771`，**22/22 场景 PASS，774/774 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.3.3.md`、`_dev/screens-v1.3.3/`（25 张关键截图）、
> `_dev/artifacts/e2e-v133/<run>/`（results.json + 29 个关键导出样例，整包 19.04MB，<20MB 预算）。

## 应用源冻结哈希（report-v1.3.3.md 快照已程序核对 ALL MATCH）

| 文件 | 字节 | sha256 |
| --- | ---: | --- |
| index.html | 37665 | `ba67ee93339d2d23a9bab1652d5929c528268c21224163872b3e8ccd69128583` |
| assets/styles.css | 35192 | `77cf92394936a469305b56f84e98b88ec472b82f21005ad9fdfb8b61ea04480c` |
| js/app.js | 158540 | `89a2980c6141fda4e2008a57ec3adfa0402ce1a608039f1629fc637c74cce210` |
| js/layout.js | 18898 | `094eedc49361d43c9cf16cfbb556a2914c72ec846b48353f5f8bc6f497bb5c8f` |
| js/render-svg.js | 17154 | `96213c74ee38e1990f25ac9bfdcc9f2d3bfab9b07cd150173cf6be444faa30ec` |
| js/desktop.js | 7012 | `1b26b2ecc64f220d318a546dbb8ea579bda902a0ab49d586d11da2e9f35c6a93` |
| js/pdf.js | 6260 | `f3b2b1fbcd31c7b2167843c34872697ff9adcd84a1db2ca552ffe5a15578d7a3` |
| js/zip.js | 3940 | `11c6d96644b1d15500f3e542a14a6d14314f97807dec7efa5c2a41b6daca644f` |
| js/export.js | 15133 | `c73bcbb7c1b70cce4613d67bebc030fa9bbe778de049b2971118dc1c19c1cf0d` |
| js/util.js | 17788 | `7ec0388340c51504baf54af67aaca7633950e3b822f4dd4c7a825982b776760b` |

`FP.APP_VERSION='1.3.3'`。

## v1.3.3 新契约与实测

### 交互 overlay 顶层结构（V 场景扩展，47 断言）
- `#preview-svg` 子层顺序实测：`figure-bg`(rect) → `cells-layer` → `groups-layer` → `labels-layer` → **`interaction-overlay-layer`（最后子元素）**。
- `.interaction-overlay-layer` 的 computed `pointer-events:none`，不拦截子图交互；选中/悬停 rect 也 pointer-events:none。
- 负间距 -10/-10（面板重叠 10mm）下：
  - 选中 panel0 → `.cell-selection-outline`（bbox `{x:0,y:0,w:90,h:67.5}` 与 panel0 一致，stroke `#2563eb`，位于 overlay 内）；
  - 鼠标移到 panel0∩panel1 重叠区 → 出现 `.cell-hover-outline`（bbox=`{x:80,y:0,w:90,h:67.5}`=panel1，stroke `#60a5fa` 虚线），选中描边与悬停描边**同时在顶层 overlay、互不遮挡**；
  - 多选（Ctrl+点击 panel2）→ overlay 内 2 个 `.cell-selection-outline`，bbox 与 panel0/panel2 匹配；
  - 切换单选 panel3 → 仅 1 个 outline（旧描边清理）；鼠标离开 SVG → hover outline 消失、selection 保留；
  - 切换模板（double-2x3）与切换图页后 overlay 重建仍为最后子层，无陈旧描边；
  - **导出 SVG 不含** `interaction-overlay-layer`/`cell-selection-outline`/`cell-hover-outline`/`cell-hit`/`cell-outline`/`is-selected`，但结构/尺寸/4 cells/4 images/4 labels 仍通过校验（导出 SVG 323731B）。
- 旧 v1.3.2 755 断言全部保留（A–O 538、P–U 217），总计 **774** 全通过；S 安全边距、U trimMarginMm、V 负间距导出等回归继续通过。

## 自动化假设/说明
- 悬停用真实 `page.mouse.move` 到面板/重叠区中心的屏幕坐标（`getScreenCTM()` 换算），避免合成事件差异；两面板重叠中心由几何计算。
- DOM 顺序/overlay 内容通过 `getOverlayState()` 读取（子层 class 列表、outline bbox/stroke/pointer-events/inOverlay）。
- 导出 SVG 文本中检查交互 class 不存在，并用 verifier 校验导出结构，确保“去掉交互元素但内容完整”。
- 本轮未发现新的真实应用 bug；E 场景耗时在 8–16s 波动属环境。

## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.3.3 全量 + 正式产物（report-v1.3.3.md / screens-v1.3.3 / artifacts/e2e-v133/<run>）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v133
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v13
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=V
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
```
