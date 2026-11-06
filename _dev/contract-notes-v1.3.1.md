# FigurePlay v1.3.1 E2E 契约对齐记录（按实际墨迹裁剪 PDF 白边）

> 状态：**v1.3.1 冻结源全量 E2E 已通过（0 失败）**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v131` →
> run `2026-11-06_05-30-11-336`，**21/21 场景 PASS，708/708 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.3.1.md`、`_dev/screens-v1.3.1/`（24 张关键截图）、
> `_dev/artifacts/e2e-v131/<run>/`（results.json + 35 个关键导出样例，整包 18.89MB，<20MB 预算）。

## 应用源冻结哈希（report-v1.3.1.md 快照已程序核对 ALL MATCH）

| 文件 | 字节 | sha256 |
| --- | ---: | --- |
| index.html | 37104 | `4e2ccedaa58efa429513de57e2b88fff7bb1a9250c4cfbc29ed2fe0479ae06fb` |
| assets/styles.css | 34975 | `60ab414184ae518b1534005e7e7fa512883c87fca5ae2279dd1dc3b760656010` |
| js/app.js | 157984 | `6464270df19243f1c1e157effe369d6e50a1145e707356d0dcbe5645670a2a8d` |
| js/layout.js | 18879 | `605795cfaebcd50f03b9344478ab3720329bbdfe529b979f43c52f38eaea1285` |
| js/render-svg.js | 14395 | `ab398a94c3a5985422bc53bba27357e69d2b672f69eae61a092198d14b9de6c8` |
| js/desktop.js | 7012 | `1b26b2ecc64f220d318a546dbb8ea579bda902a0ab49d586d11da2e9f35c6a93` |
| js/pdf.js | 6260 | `f3b2b1fbcd31c7b2167843c34872697ff9adcd84a1db2ca552ffe5a15578d7a3` |
| js/zip.js | 3940 | `11c6d96644b1d15500f3e542a14a6d14314f97807dec7efa5c2a41b6daca644f` |
| js/export.js | 13512 | `830ff97b3f55b89bcdc644e828d1aafff8744ccdc0c93b0d5bd951ea9847133a` |
| js/util.js | 17788 | `7ddb8ab366d289e8c10e8e9fac112af0f12b5ecb37a755444c298c53df634919` |

`FP.APP_VERSION='1.3.1'`。

## v1.3.1 ink 裁剪契约与验证结果

### 新 API / 行为
- `getInkCropBox(marginMm)`（async）：96dpi 渲染探针 canvas，扫描非背景像素，返回实际墨迹 bbox（含 `inkPx`/`pagePx`）；
  `getCropBox(marginMm)` 保留为内容盒对照。
- `exportBase64('pdf',{trimPdf:true,trimMarginMm})` 与 UI 导出：单页/多页均先 `FP.detectInkCrop`，PDF MediaBox=ink bbox（+保留边距）；检测失败时回退内容盒。
- UI 读数改为「自动裁剪白边（按实际内容墨迹，保留 x mm）」，不再使用旧「裁剪后」文案。
- 矢量 PDF（桌面桥）：trim 时 `export-vector-pdf` 的 `spec.crop` 使用 ink bbox。
- trim 默认仍为 false；trim 关闭时 PDF 保持原页面尺寸（旧 685 回归的 PDF 尺寸断言仅 S 尺寸/U crop 期望改为 ink）。

### 本次 E2E 实测（S 场景 42 断言，U 场景 34 断言）
- **margin=10 + 2×2 四图**：整页 170×133mm；内容盒 150×113mm；ink 150.3×113.2mm（≈内容盒，图片铺满面板时）；留边 0 的裁剪 PDF：
  MediaBox=ink（±1mm），pdftoppm 96dpi 渲染后**四边非白墨迹余量 = 0/0/0/0 mm（均 ≤1.5mm）**；
  留边 2mm：四边余量 1.852–2.117mm；trim 关闭：整页 170×133mm，四边保留 ≥5mm 白边；trim on/off 文件与页面显著变小。
- **letterbox（16:9 面板 + 4:3 图，layout aspect=8/4.5）**：内容盒=170×95.6mm，**ink=127.8×92.1mm**（左右白边被墨迹检测去掉）；
  ink 裁剪 PDF MediaBox=127.8×92.1mm，渲染四边余量 0/0/0/0mm（均 ≤1.5mm）；trim 关闭时左/右保留 21.2/20.9mm 白边；
  裁剪后页宽比整页小 42.2mm。
- **UI 导出**：下载 PDF 尺寸=ink(2mm)，渲染四边余量 1.852–2.117mm；UI 读数包含「按实际内容墨迹」。
- **矢量 mock U**：trim 时 `spec.crop`=170.1×63mm，与 `getInkCropBox()` 一致（±0.5mm），且包含 inkPx/pagePx 证明来自 ink 检测
  （非内容盒）；mock 成功写 PDF、错误回退位图 PDF、状态栏提示均通过。

### 验证器新增能力
- `tools/verify-exports.py --kind pdf --max-ink-margin-mm X --ink-tolerance 14 --render-dpi 96`：
  用 pdftoppm 渲染 + PIL 扫描非背景像素，输出 `details.inkMarginsMm`（top/right/bottom/left）并逐边断言 ≤X；
  selftest 新增 3 项（ink 余量结构/数值/过严阈值失败），**总计 26 checks PASS**。
- 新增 `--max-ink-margin-mm` 参数经 `lib/verify.mjs` 透传。

## 回归
- A–O 旧 538 断言全部保留通过（A–F 229、G–L 208、M–O 101）；
- P–U 更新后：P 23、Q 24、R 25、**S 42**、T 22、**U 34**；合计 685 → **708 断言**全部通过。
- 版本 1.3.1；trim 关闭时旧 PDF 尺寸（170×133mm 等）与旧导出下载测试不受影响。

## 自动化假设/说明
- “四边白边 ≤1.5mm”用 96dpi 实时渲染测量（1px≈0.265mm），阈值吸收 JPEG/抗锯齿误差；留边 0 时实测为 0mm。
- letterbox 场景使用 layout aspect=8/4.5（等价 16:9；`#aspect-w` 输入 max=10，不能直接填 16）；并关闭编号避免标签墨迹影响白边测量。
- margin 场景下 ink 可能比内容盒大 0.2–0.3mm（标签/抗锯齿），属正常；ink 紧凑性由 letterbox 场景验证（ink 比内容盒小 42.2mm）。
- 未发现新的真实应用 bug。测试侧修正：旧 S 的「内容 bbox=MediaBox」与「裁剪后」文案断言已改为 ink 断言；U 的 spec.crop 断言改为 ≈getInkCropBox。

## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.3.1 全量 + 正式产物（report-v1.3.1.md / screens-v1.3.1 / artifacts/e2e-v131/<run>）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v131
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v13
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=S
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
```
