# FigurePlay v1.3.2 E2E 契约对齐记录（编号防裁安全边距 + 负间距）

> 状态：**v1.3.2 冻结源全量 E2E 已通过（0 失败）**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v132` →
> run `2026-11-06_09-39-08-303`，**22/22 场景 PASS，755/755 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.3.2.md`、`_dev/screens-v1.3.2/`（25 张关键截图）、
> `_dev/artifacts/e2e-v132/<run>/`（results.json + 28 个关键导出样例，整包 18.70MB，<20MB 预算）。

## 应用源冻结哈希（report-v1.3.2.md 快照已程序核对 ALL MATCH）

| 文件 | 字节 | sha256 |
| --- | ---: | --- |
| index.html | 37575 | `986f0bda49a1eb9eb0399d70a75864f446872c1f6ea5a81e3941382044e73077` |
| assets/styles.css | 34975 | `60ab414184ae518b1534005e7e7fa512883c87fca5ae2279dd1dc3b760656010` |
| js/app.js | 158483 | `a5192d9487919d4748707a0ed7a68d3d74ebac3fd1e96b173f1788eed48bbed5` |
| js/layout.js | 18898 | `094eedc49361d43c9cf16cfbb556a2914c72ec846b48353f5f8bc6f497bb5c8f` |
| js/render-svg.js | 14395 | `ab398a94c3a5985422bc53bba27357e69d2b672f69eae61a092198d14b9de6c8` |
| js/desktop.js | 7012 | `1b26b2ecc64f220d318a546dbb8ea579bda902a0ab49d586d11da2e9f35c6a93` |
| js/pdf.js | 6260 | `f3b2b1fbcd31c7b2167843c34872697ff9adcd84a1db2ca552ffe5a15578d7a3` |
| js/zip.js | 3940 | `11c6d96644b1d15500f3e542a14a6d14314f97807dec7efa5c2a41b6daca644f` |
| js/export.js | 15133 | `c73bcbb7c1b70cce4613d67bebc030fa9bbe778de049b2971118dc1c19c1cf0d` |
| js/util.js | 17788 | `667f418f8b67b7af9540b544341c22a58006bb7155fcafd139c1999bb8911381` |

`FP.APP_VERSION='1.3.2'`。

## v1.3.2 新契约与验证

### 1) PDF trim 编号防裁安全边距（S 场景 56 断言）
- `getInkCropBox(marginMm)` / 导出 trim 的 crop 现在会**并入编号排版盒**并强制有效 margin `max(1, trimMarginMm)`（0→1mm）；返回 `marginMm`。
- UI 读数：「自动裁剪白边（按实际内容墨迹，保留 1 mm 安全边距）」；`#pdf-trim-safety-hint` 在 trim 开启时显示。
- **用户配置复现**（3×2、label bc、inset 1.5、offsetX 1.2、offsetY 5、Times 9pt、trim=0）：
  6 个编号盒全部在 crop 内；trim0 导出 PDF 渲染实测四边余量 **top/right/bottom/left = 0.794/0.794/0.794/1.058mm（均 0.7–1.6mm）**，
  **底部编号完整（底边余量 0.794mm，非贴边 0）**；trim=1mm 仍为约 1mm；trim=2mm 上/左/右 1.587–2.117mm，
  底部受页面边界 clamp（autoPad 仅留 0.6mm）为 0.794mm——这是实现按页面边界裁剪的几何结果，已记录在断言 detail 中。
- margin=10 + 2×2 场景：trim0 四边 0.794–1.058mm；trim2 四边约 1.85–2.12mm；letterbox（16:9 面板+4:3 图，编号关闭）
  ink 129.8×93.2mm，trim0 左右 1.058mm、上下因图片填满页高为 0；trim 关闭仍整页且保留白边。

### 2) 负间距（新增 V 场景 28 断言）
- `layout.colGap/rowGap` 支持 **-50～80mm**（`FP.LIMITS.gapMm=[-50,80]`）；UI `#col-gap/#row-gap` 的 `min=-50 max=80`。
- API `setLayoutOptions({colGap:-10,rowGap:-10})` 与 UI 输入生效：cellW 85→90mm（负列距使格宽增大），
  面板水平重叠 10mm、垂直重叠 10mm；页面宽度不变、页高随负行距减小；API `-100→-50`、`100→80` 夹取。
- 负间距下导出：PNG 像素尺寸=mm/25.4×DPI 且非空白；PDF 未裁剪整页尺寸正确；trimmed PDF MediaBox=ink bbox、四边余量 ≤1.6mm；无 pageerror。

### 3) U 矢量 PDF 增量
- trim 时 `export-vector-pdf` 的 `spec.crop≈getInkCropBox()`（±0.5mm），且 `spec.trimMarginMm` 已加入：
  trim 关闭=1（安全边距），trim=2 时=2（与 `getInkCropBox(2).marginMm` 一致）；其余 mock 成功/失败回退断言保留。

## 回归
- A–O 538 断言全部保留通过；P–V 新功能断言：P23/Q24/R25/**S56**/T22/**U39**/**V28** → 总计 **755**，全通过。
- v1.3.1 的 708 断言保留（S 旧「0mm 白边」改为约 1mm 安全边距；U 增加 trimMarginMm 断言）。
- 旧 PDF 尺寸/导出下载/自动保存等回归均不受影响。

## 自动化假设/说明
- 用户配置复现使用带白色外边的示例图（sample-1/sample-5 交替），以模拟 MATLAB 图窗白底；若图片内容紧贴面板边缘，crop 会被页面边界 clamp（边缘侧余量为 0），属几何边界而非裁切缺陷。
- 编号盒/96dpi 渲染测量阈值：trim0 断言 0.7–1.6mm，trim2 断言上/左/右 1.4–2.6mm、底部允许 0.7–2.6mm（页面 clamp）。
- letterbox 场景关闭编号以隔离墨迹白边；16:9 用 aspect=8/4.5（`#aspect-w` max=10）。
- 本轮未发现新的真实应用 bug；测试过程中唯一异常是 E 场景某次运行耗时 81s（其余 8–13s，属环境波动，PASS）。

## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.3.2 全量 + 正式产物（report-v1.3.2.md / screens-v1.3.2 / artifacts/e2e-v132/<run>）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v132
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v13
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=V
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
```
