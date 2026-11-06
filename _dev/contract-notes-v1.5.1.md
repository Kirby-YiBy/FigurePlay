# FigurePlay v1.5.1 E2E 契约对齐记录（页面自动编号 / 诊断日志 / 原生保存路径）

> 状态：**v1.5.1 冻结源全量 E2E 已通过（0 失败）**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v151` →
> run `2026-11-06_15-41-58-453`，**36/36 场景 PASS，1065/1065 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.5.1.md`、`_dev/screens-v1.5.1/`（39 张关键截图）、
> `_dev/artifacts/e2e-v151/<run>/`（results.json + 17 个关键导出样例，整包 23.43MB，<25MB 预算）。

## 应用源冻结哈希（report-v1.5.1.md 快照已程序核对 ALL MATCH，18 个文件）

| 文件 | 字节 | sha256 |
| --- | ---: | --- |
| index.html | 47871 | `ce10acaf59ebaad1ce7290dcc3b3085a3b81154ecbaabecaaea78e5e414ef562` |
| assets/styles.css | 42780 | `48ced2d68cabaaaa1c7dc43b67081ca2c850adbcaa7f51fc0c0fe9ce72ea5ceb` |
| assets/theme.css | 6988 | `d23c9f653aa27e782629406676b4d0c3980f6a7f91b7657707dc51a63f0b05fe` |
| js/app.js | 169700 | `9b0c9a3376af1c81e37506f3fd80e4cba833242811d6f94863c3eea861e37e48` |
| js/appearance.js | 5109 | `62093ae77a7a5770f0139c41a23004bc58f420384a3fe0df6b514642c1ef3ab2` |
| js/config-profiles.js | 24871 | `81def1647c94090ad79e123ea5795bd8614f0551b610ba3b552986fd610eb1c1` |
| js/desktop.js | 14779 | `33141c77960dbbe94e2ec96ea04af27602f520bee8de9ff77fb3e95d9ae9d080` |
| js/project-file.js | 7318 | `dd15025a49c815353b86a9cef4e9b53c441bea8986005d206e1531e66b4b4700` |
| js/journal-presets.js | 7642 | `a1f4cce6217fcfb356b0052d9aec824d60a4f99b73ba1153a40ebb60c9874616` |
| js/preflight.js | 3403 | `3fb9d4a1e7fe88f696b5ad5ac8e46cae1c31cab2cc8d030ea223f06a24c462ec` |
| js/updates.js | 4227 | `6d9833102f69ee5a8af6150cd6a68c45445219269d9dab5be8add1a7efcbb4b5` |
| js/logs.js | 5288 | `76d5411eb75ed7c05680b569140c64737d220a35f5b587de30b1915f12021025` |
| js/layout.js | 18898 | `094eedc49361d43c9cf16cfbb556a2914c72ec846b48353f5f8bc6f497bb5c8f` |
| js/render-svg.js | 17116 | `6dba2ae85d3b9f83afd87bf967bece41cb14a92655089f60efadcd6aa21679e9` |
| js/pdf.js | 6260 | `f3b2b1fbcd31c7b2167843c34872697ff9adcd84a1db2ca552ffe5a15578d7a3` |
| js/zip.js | 3940 | `11c6d96644b1d15500f3e542a14a6d14314f97807dec7efa5c2a41b6daca644f` |
| js/export.js | 15133 | `c73bcbb7c1b70cce4613d67bebc030fa9bbe778de049b2971118dc1c19c1cf0d` |
| js/util.js | 17788 | `8f979ca2adf62afda60b82cf05517a1545479bb0bc59be41175b67990e9c8631` |

`FP.APP_VERSION='1.5.1'`。

## v1.5.1 新契约与实测（新增 AG–AJ 共 62 断言）

### AG 页面自动编号（11 断言）
初始「图 1」→ 新建「图 1/图 2」→ 删除图 1 后剩余页自动变「图 1」→ 再新建恢复「图 1/图 2」→
复制图 1 得到「图 1 副本」，renumber 只处理 `/^图\s*\d+$/`，副本不被误编号（最终 `图 1 / 图 1 副本 / 图 2`）；
tab 标题与 `getPages()`/`getPreviewInfo().pageName` 完全同步。

### AH 原生保存路径（16 断言）
- 桌面 mock + stub `FP.desktop.saveFile`：工程保存 filter `.figureplay-project`（base64 JSON type=figureplay-project）；
  配置导出 filter `.json`（type=figureplay-config）；PNG filter `.png`（base64 头 `89504e47`）；PDF filter `.pdf`（`%PDF-`）。
- 返回 path 后：工程状态「已保存工程：38.7 KB → C:\Users\E2E\Documents\…」、导出状态「已保存到 …Documents…」、配置 toast 含路径。
- 取消：宿主返回 `{ok:true,canceled:true}` → 状态「已取消导出」，不产生下载。
- 浏览器回退：无宿主 + 禁用 picker → PNG / `.figureplay-project` 走真实下载（`fp-v151-browser-fallback.png` / `fp-v151-browser-project.figureplay-project`）。
- 旧场景适配：O/U/AF 等桌面桥 mock 场景在导出前显式移除 `FP.desktop.saveFile`（或改 stub），恢复原先 download/fake-picker 断言；`uiDownload` helper 也自动移除宿主方法。

### AI 诊断日志（17 断言）
- 就绪写入 `info`「应用就绪 v1.5.1」；`FP.toast` 记录 `toast` 级；`FP.logEvent('error',...)` 记录 `error` 级。
- 帮助弹窗日志面板含 `[YYYY-MM-DD HH:mm:ss] LEVEL message`，刷新按钮同步；日志不含 `data:image/base64` 图片二进制。
- localStorage `figureplay.diagnostics.v1` 上限 300 条（写入 350 条后仅保留最新 300，末条=#349，存储 <300KB）。
- 浏览器模式导出：真实下载 `fp-v151-diagnostics.log`（含版本/生成时间/日志行），toast「诊断日志已下载」。
- 桌面 mock 导出：走 `FP.desktop.saveFile`（filter `.log`，内容含宿主日志/版本），toast 含原生路径。
- 清空（confirm accept）：旧条目全部删除，仅保留「诊断日志已清空」toast 一条，textarea/localStorage 同步。


### AJ 真实桥回包协议（18 断言）
- 注入 `window.chrome.webview` mock（`installDesktopBridgeMock`），**不** stub `FP.desktop.saveFile` / `checkUpdate` / `downloadUpdate`（三者均为冻结 desktop.js 原生实现）。
- save-file 请求 → `file-saved` 回包：回包前 Promise pending；错误 requestId 被忽略；正确回包 **480ms 内 resolve**，`path='C:\Users\E2E\Documents\bridge-payload.figureplay.json'`、ok=true、canceled=false；canceled=true 回包 resolve canceled=true。
- 工程保存 UI 全链路：点「保存工程…」→ 真实桥请求（filter `.figureplay-project`）→ `file-saved` → `#project-file-status` 立即显示「已保存工程：… → C:\Users\E2E\Documents\bridge-project.figureplay-project」。
- **`__UPDATES__.check()` 全链路**：updates.js 桌面初始化静默 `check-update`（requestId `updcheck-*`，回 `configured:false` → 按钮启用/显示尚未配置）；手动 check → 新 `check-update` requestId 匹配 → `update-info` 回包（latestVersion=1.5.2/currentVersion=1.5.1/notes）**9ms resolve**；界面显示「发现新版本 1.5.2（当前 1.5.1）+ 更新说明」、下载按钮可见。
- **`__UPDATES__.download()` 全链路**：点击「下载并更新」（confirm accept）→ `download-update` requestId `updload-*` → `update-downloaded` 回包 → 状态显示「更新已下载（真实桥）：C:\Users\E2E\Downloads\FigurePlay-1.5.2.exe」，下载按钮恢复可用；message/path/latestVersion 字段正确、无超时。
- 证据：`AJ-01-real-bridge-protocol.png`。
## 回归
- 旧 v1.5.0 的 1003 断言全部保留；新增 AG–AJ 62 → 总计 **1065**，全通过（A–AJ 共 36 场景）。
- 全量中旧场景修复/适配：AA 的 appVersion 改为动态读取；AE `installUpdateMock` 改为在 `addInitScript` 中通过 `window.FP` 的 desktop 属性 setter 打桩，确保 updates.js init 前生效；O/U/AF 明确关闭宿主 saveFile 后验证下载/fake picker。

## 自动化假设/说明
- 原生保存路径用 stub `FP.desktop.saveFile` 捕获（不弹真实 SaveFileDialog），字段包含 suggestedName/filterName/filterExtensions/base64。
- 诊断日志导出双路径：浏览器下载、桌面 saveFile；清空后的 toast 本身也会进入日志（因此清空后保留 1 条 toast 记录，属预期行为）。
- 更新 UI mock 采用属性拦截，避免 updates.js 初始化时序竞态。
- 页面默认名为「图 1」（含空格），tab 文本含「· N 图」后缀，断言使用 tab title 对齐。
- **真实桥回包（AJ）**：Lead 已补齐 `js/desktop.js`（14779B `33141c77…`）的 `checkUpdate`/`downloadUpdate` 请求方法（20s/180s）与 `handleMessage` 的 `file-saved`/`update-info`/`update-downloaded` 回包处理。AJ 注入 `window.chrome.webview` mock、不 stub 任何 FP.desktop 方法，验证了 saveFile、`__UPDATES__.check()`、`__UPDATES__.download()` 三条真实全链路；更新按钮启用、状态/说明/下载路径均正确。
## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.5.1 全量 + 正式产物（report-v1.5.1.md / screens-v1.5.1 / artifacts/e2e-v151/<run>）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v151
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v151
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=AG
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
```
