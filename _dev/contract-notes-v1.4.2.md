# FigurePlay v1.4.2 E2E 契约对齐记录（配置模板改为宿主外部文件持久化）

> 状态：**v1.4.2 冻结源全量 E2E 已通过（0 失败）**。
> 最终运行：`node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v142` →
> run `2026-11-06_13-51-37-999`，**26/26 场景 PASS，923/923 断言 PASS，0 失败项**。
> 产物：`_dev/report-v1.4.2.md`、`_dev/screens-v1.4.2/`（29 张关键截图）、
> `_dev/artifacts/e2e-v142/<run>/`（results.json + 10 个关键导出样例，整包 18.24MB，<20MB 预算）。

## 应用源冻结哈希（report-v1.4.2.md 快照已程序核对 ALL MATCH，13 个文件）

| 文件 | 字节 | sha256 |
| --- | ---: | --- |
| index.html | 44960 | `1596d3bab17ffd0a37917e1a4cb7f73c7a7c5e455498d5f7ed251af343394334` |
| assets/styles.css | 41031 | `7ce9d1c382a4ba4f069c6e94ad6bf97f6e20fb36a1239803a61206f6f36fa86e` |
| assets/theme.css | 6988 | `d23c9f653aa27e782629406676b4d0c3980f6a7f91b7657707dc51a63f0b05fe` |
| js/app.js | 162221 | `ba1049d6e5c549a46b9902a4dc69a968d0142e6ec645af6415cb3241c02573f4` |
| js/appearance.js | 5109 | `62093ae77a7a5770f0139c41a23004bc58f420384a3fe0df6b514642c1ef3ab2` |
| js/config-profiles.js | 21576 | `45d3f12a8671352de3b6653ede1951bbffa55c443d4be7be009ae7171393fdbf` |
| js/layout.js | 18898 | `094eedc49361d43c9cf16cfbb556a2914c72ec846b48353f5f8bc6f497bb5c8f` |
| js/render-svg.js | 17116 | `6dba2ae85d3b9f83afd87bf967bece41cb14a92655089f60efadcd6aa21679e9` |
| js/desktop.js | 9316 | `960c4f3a5741df48cb3cd2a93bf32499e2502e5a2de357dc38b8728f04f89041` |
| js/pdf.js | 6260 | `f3b2b1fbcd31c7b2167843c34872697ff9adcd84a1db2ca552ffe5a15578d7a3` |
| js/zip.js | 3940 | `11c6d96644b1d15500f3e542a14a6d14314f97807dec7efa5c2a41b6daca644f` |
| js/export.js | 15133 | `c73bcbb7c1b70cce4613d67bebc030fa9bbe778de049b2971118dc1c19c1cf0d` |
| js/util.js | 17788 | `273ace1040431da93812ce3e5a740e47debe5aeae7874d02c0c0b485cb493b93` |

`FP.APP_VERSION='1.4.2'`。

## v1.4.2 新契约与实测（新增 Z 场景 29 断言）

### 宿主协议（WebView2 mock）
- `FP.desktop.loadConfigProfiles()`：页面发 `{type:'load-config-profiles', requestId}`，宿主回
  `{type:'config-profiles', requestId, ok, profiles, path, exists}`。
- `FP.desktop.saveConfigProfiles(profiles)`：页面发 `{type:'save-config-profiles', requestId, profiles}`，宿主回
  `{type:'config-profiles-saved', requestId, ok, path}`。
- 桌面 mock 下 `FP.desktop.available=true`；配置模块 init 时调用 load（Z 实测首个请求即 `load-config-profiles`）。

### 迁移 / 加载 / 路径提示
| 场景 | 实测 |
| --- | --- |
| 宿主无文件 + localStorage 有旧配置 | 首次 load 返回 `exists:false, profiles:[]` → 自动调用 `saveConfigProfiles` 迁移（宿主收到旧配置 id/name）；迁移后 localStorage **不清空**；`#config-storage-hint` 显示 `C:\Users\E2E\AppData\Roaming\FigurePlay\configs\profiles.json` |
| 宿主已有文件（reload） | 从 host profiles 恢复（数量/名称一致）；不再重复迁移 save |
| 保存配置 | 触发 host save（宿主收到旧配置+新配置 2 条）；`#config-count=2`、提示保持宿主路径 |
| 删除配置（confirm 接受） | 触发 host save（宿主只剩「宿主新配置」） |
| 导入 JSON → 保存到本机 | 触发 host save（宿主 2 条，含导入名称） |
| 清空 localStorage 后 reload | 从 host mock 恢复 2 条配置（名称一致、宿主路径提示）；恢复后重新写入 localStorage 缓存 |
| 浏览器模式（独立 context，无桥） | 配置仅写 localStorage；`#config-storage-hint` 为浏览器提示（无宿主路径）；无宿主消息 |

### 隔离
- 宿主配置保存不改变主题/外观（dark+violet 保持）；不新增项目历史（0→0）。
- 项目自动保存 payload 不含 `configProfiles` / `figureplay-config` / `AppData` 路径。
- 配置 HTTP 与 UI 列表/摘要/计数与 v1.4.0 X 契约一致（X 46/46 继续通过）。

## 回归
- 旧 v1.4.1 的 894 断言全部保留；新增 Z 29 → 总计 **923**，全通过（A–Z 共 26 场景）。
- label spec bbox（Y）、配置模板（X）、主题/导出隔离/负间距/裁剪等旧断言在 v1.4.2 下继续通过。

## 自动化假设/说明
- 桌面宿主 mock 由 `_dev/lib` 的 WebView2 bridge mock 提供；Z 场景内按 requestId 手动响应 load/save，并记录宿主 profiles/path。
- 迁移前置的 localStorage 旧配置通过 `addInitScript` 注入，用 `sessionStorage` 标记避免 reload 时重复注入。
- 浏览器模式用独立 `browser.newContext()`（无 bridge）验证仅 localStorage 路径。
- 报告快照动态扫描 `index.html` + `assets/*.{css,js}` + `js/*.js`，自动包含本轮更新的 `desktop.js` / `config-profiles.js`。
- 本轮未发现新的真实应用 bug。

## 运行命令
```powershell
$node='C:\Users\DragonDance\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
# v1.4.2 全量 + 正式产物（report-v1.4.2.md / screens-v1.4.2 / artifacts/e2e-v142/<run>）
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=all --final-v142
# 分 suite / 单场景
& $node 'E:\FigurePlay\_dev\e2e.mjs' --suite=v13
& $node 'E:\FigurePlay\_dev\e2e.mjs' --only=Z
& $node 'E:\FigurePlay\_dev\e2e.mjs' --list
```
