# FigurePlay v1.3.4 E2E 契约对齐记录（界面外观：浅/深/跟随系统 + 7 主题色）

> 状态：**v1.3.4 冻结源全量 E2E 已通过（0 失败）**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v134` →
> run `2026-11-06_11-42-16-411`，**23/23 场景 PASS，819/819 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.3.4.md`、`_dev/screens-v1.3.4/`（26 张关键截图）、
> `_dev/artifacts/e2e-v134/<run>/`（results.json + 29 个关键导出样例，整包 19.66MB，<20MB 预算）。

## 应用源冻结哈希（report-v1.3.4.md 快照已程序核对 ALL MATCH）

| 文件 | 字节 | sha256 |
| --- | ---: | --- |
| index.html | 41452 | `6e9f62cfb6aae46db335818ff4a7d53fbfbf822db63cc22ea6feb30668f53c32` |
| assets/styles.css | 37342 | `f9f5464a813e9aa9f99cd5a81f1ffd9ba01f97a20f709519e44cecaeaf357a60` |
| assets/theme.css | 6988 | `d23c9f653aa27e782629406676b4d0c3980f6a7f91b7657707dc51a63f0b05fe` |
| js/app.js | 158852 | `49b61c57b01b49abe108d8deb005c769c5e23f39dca112ef40cc00eb5ac8a1b8` |
| js/appearance.js | 5109 | `62093ae77a7a5770f0139c41a23004bc58f420384a3fe0df6b514642c1ef3ab2` |
| js/layout.js | 18898 | `094eedc49361d43c9cf16cfbb556a2914c72ec846b48353f5f8bc6f497bb5c8f` |
| js/render-svg.js | 17116 | `6dba2ae85d3b9f83afd87bf967bece41cb14a92655089f60efadcd6aa21679e9` |
| js/desktop.js | 7012 | `1b26b2ecc64f220d318a546dbb8ea579bda902a0ab49d586d11da2e9f35c6a93` |
| js/pdf.js | 6260 | `f3b2b1fbcd31c7b2167843c34872697ff9adcd84a1db2ca552ffe5a15578d7a3` |
| js/zip.js | 3940 | `11c6d96644b1d15500f3e542a14a6d14314f97807dec7efa5c2a41b6daca644f` |
| js/export.js | 15133 | `c73bcbb7c1b70cce4613d67bebc030fa9bbe778de049b2971118dc1c19c1cf0d` |
| js/util.js | 17788 | `1a6a5f07ace93b61a0fa57efd1661800173de4acd40223d7901c51e7aa4a782c` |

`FP.APP_VERSION='1.3.4'`。本轮把 `assets/theme.css` / `js/appearance.js` 纳入 `appFilesSnapshot`，报告完整记录 12 个冻结文件哈希。

## v1.3.4 新契约与实测（新增 W 场景 45 断言）

### 1) 默认跟随系统（emulateMedia）
- 清空外观 localStorage 后加载、系统深色：`html[data-theme=dark]`、`html[data-theme-mode=system]`，`FP.appearance.get()={mode:'system',theme:'dark',accent:'blue'}`；body/panel/输入框计算背景均为深色，`#figure-shell` 背景 `rgb(255,255,255)`、`.figure-bg` 填充 `#ffffff`（图稿不变暗），`color-scheme:dark`。
- `emulateMedia({colorScheme:'light'})` → 自动切 `data-theme=light`（mode 仍 system）；再切回 dark 也自动跟随（双向监听 matchMedia）。

### 2) 外观菜单与持久化
- `#btn-appearance` 打开 `#appearance-popover`：可见、`aria-expanded=true`；3 模式按钮（浅色/深色/跟随系统）active/`aria-pressed` 正确；7 主题色 swatch active/aria 正确。
- 点击「浅色」→ mode/theme=light + `localStorage['figureplay.themeMode']=light`；系统 dark 下显式 light 不被覆盖；「深色」「跟随系统」同理。
- 关闭路径：`#appearance-close`、Escape、点击弹层外部均隐藏并恢复 `aria-expanded=false`。
- 7 种主题色逐个切换：`html[data-accent]`、`--accent`（#2563eb/#4f46e5/#0d9488/#059669/#7c3aed/#e11d48/#d97706）、swatch active/aria、localStorage 均正确；按钮主色渐变随 accent 变化（≥5 种不同值）。
- 深色 + 紫罗兰写入 localStorage 后 reload（并把系统改为浅色）：仍为 `data-theme=dark`/`data-accent=violet`、`--accent=#7c3aed`，弹层 active 状态一致（首屏 boot script 生效）。

### 3) 深色区域计算样式
- body/`.panel`/`#filename-input` 背景暗色；帮助弹窗（`#help-dialog`）背景 `rgb(22,32,51)`、文字 `rgb(230,237,247)`；`#figure-shell` 仍白。

### 4) 导出隔离与预览 DOM
- 同一 2×2 demo（2 图、PNG 150dpi / SVG 白底）在 4 种外观（light+blue / dark+blue / light+amber / dark+violet）下：
  **PNG base64 完全一致（长度 202616）、SVG base64 完全一致（长度 210152）**，文件名一致。
- `#preview-svg` innerHTML hash/长度/子层数/`.cell-hit` 数在 4 种外观下完全一致（主题切换不重绘图稿）。
- 项目签名（页数/页序/布局/填充/编号）与历史状态（canUndo/canRedo/undoCount）在切换前后一致；自动保存 payload 不含 `themeMode`/`accent` 字段。
- 外观设置不影响多页状态（pageCount/pageIndex/页面名不变）。

### 5) 小窗口 1000×700
- `#btn-appearance` 完整落在视口内（rect 849–884×15–43）；popover 264×238 完整在视口内（724–988×64–302）；页面无横向溢出（scrollWidth=innerWidth=1000）。

## 回归
- 旧 v1.3.3 的 774 断言全部保留；W 新增 45 → 总计 **819**，全通过。
- V 交互 overlay 断言适配 v1.3.4 的 CSS 变量化描边：`stroke` 不再写内联属性，改为校验 computed stroke 分别等于 `var(--accent)` / `var(--accent-hover)`、bbox 与 overlay 层级不变。

## 自动化假设/说明
- 系统跟随用 Playwright `page.emulateMedia({colorScheme})` 模拟；reload 前后 `emulateMedia` 均生效。
- 外观偏好与项目存储分离：`figureplay.themeMode` / `figureplay.accent` 两个 localStorage 键；项目 session 使用 `figureplay.session.v1`。
- 导出隔离比较 base64 全字符串（非 hash），确保逐字节一致。
- 本轮未发现新的真实应用 bug。

## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.3.4 全量 + 正式产物（report-v1.3.4.md / screens-v1.3.4 / artifacts/e2e-v134/<run>）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v134
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v13
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=W
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
```
