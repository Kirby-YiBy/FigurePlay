# FigurePlay E2E 验证报告（v1.5.1）

- 生成时间：2026-11-06T15:44:28.846Z
- 运行 id：`2026-11-06_15-41-58-453`
- 应用：`E:\FigurePlay\index.html`
- 环境：Node v24.21.0；playwright-core 1.64.1；Chrome 156.0.8078.80；headless=true
- 应用版本（js/util.js APP_VERSION）：1.5.1；场景 suite：all
- 启动参数：（无额外参数）
- 结论：**PASS** — 场景 36/36 通过；断言 1065/1065 通过
- 性能：全部场景累计 147.5s；最慢 3 个：S(16.0s)、W(14.4s)、E(12.7s)

应用文件快照（sha256 为完整冻结哈希，用于确认测试针对冻结版本）：

| 文件 | 字节 | sha256 | mtime |
| --- | ---: | --- | --- |
| index.html | 47871 | ce10acaf59ebaad1ce7290dcc3b3085a3b81154ecbaabecaaea78e5e414ef562 | 2026-11-06T15:08:00.587Z |
| assets/styles.css | 42780 | 48ced2d68cabaaaa1c7dc43b67081ca2c850adbcaa7f51fc0c0fe9ce72ea5ceb | 2026-11-06T15:08:00.589Z |
| assets/theme.css | 6988 | d23c9f653aa27e782629406676b4d0c3980f6a7f91b7657707dc51a63f0b05fe | 2026-11-06T11:32:39.984Z |
| js/app.js | 169700 | 9b0c9a3376af1c81e37506f3fd80e4cba833242811d6f94863c3eea861e37e48 | 2026-11-06T15:08:30.116Z |
| js/appearance.js | 5109 | 62093ae77a7a5770f0139c41a23004bc58f420384a3fe0df6b514642c1ef3ab2 | 2026-11-06T11:30:56.877Z |
| js/config-profiles.js | 24871 | 81def1647c94090ad79e123ea5795bd8614f0551b610ba3b552986fd610eb1c1 | 2026-11-06T15:07:48.787Z |
| js/demo.js | 10054 | ebf2396eab23b038f934b9eb8411bccddedb8a605b50e300966849af20735e52 | 2026-11-05T17:34:34.962Z |
| js/desktop.js | 14779 | 33141c77960dbbe94e2ec96ea04af27602f520bee8de9ff77fb3e95d9ae9d080 | 2026-11-06T15:37:07.966Z |
| js/export.js | 15133 | c73bcbb7c1b70cce4613d67bebc030fa9bbe778de049b2971118dc1c19c1cf0d | 2026-11-06T09:28:35.328Z |
| js/journal-presets.js | 7642 | a1f4cce6217fcfb356b0052d9aec824d60a4f99b73ba1153a40ebb60c9874616 | 2026-11-06T14:13:10.955Z |
| js/layout.js | 18898 | 094eedc49361d43c9cf16cfbb556a2914c72ec846b48353f5f8bc6f497bb5c8f | 2026-11-06T09:29:11.828Z |
| js/logs.js | 5288 | 76d5411eb75ed7c05680b569140c64737d220a35f5b587de30b1915f12021025 | 2026-11-06T15:08:11.485Z |
| js/pdf.js | 6260 | f3b2b1fbcd31c7b2167843c34872697ff9adcd84a1db2ca552ffe5a15578d7a3 | 2026-11-06T01:45:00.241Z |
| js/preflight.js | 3403 | 3fb9d4a1e7fe88f696b5ad5ac8e46cae1c31cab2cc8d030ea223f06a24c462ec | 2026-11-06T14:15:00.207Z |
| js/project-file.js | 7318 | dd15025a49c815353b86a9cef4e9b53c441bea8986005d206e1531e66b4b4700 | 2026-11-06T15:07:48.786Z |
| js/render-canvas.js | 4099 | 51e9717eec8b7755ca6ba768c65bcf4419e586f0ee696d6b38f3302a7f4baa37 | 2026-11-05T18:16:22.845Z |
| js/render-svg.js | 17116 | 6dba2ae85d3b9f83afd87bf967bece41cb14a92655089f60efadcd6aa21679e9 | 2026-11-06T11:32:02.732Z |
| js/storage.js | 3711 | 0f811cb4d463b9c8f98924d30c160c13b4255073ccee4a248caa261a5639f6a1 | 2026-11-05T17:32:16.518Z |
| js/updates.js | 4227 | 6d9833102f69ee5a8af6150cd6a68c45445219269d9dab5be8add1a7efcbb4b5 | 2026-11-06T14:18:00.562Z |
| js/util.js | 17788 | 8f979ca2adf62afda60b82cf05517a1545479bb0bc59be41175b67990e9c8631 | 2026-11-06T15:13:56.550Z |
| js/zip.js | 3940 | 11c6d96644b1d15500f3e542a14a6d14314f97807dec7efa5c2a41b6daca644f | 2026-11-06T01:45:14.431Z |

## 场景结果

| 场景 | 标题 | 结果 | 断言 | 耗时 |
| --- | --- | --- | ---: | ---: |
| A | 首屏 | ✅ PASS | 26/26 | 1132 ms |
| B | 布局 | ✅ PASS | 34/34 | 1619 ms |
| C | 上传 | ✅ PASS | 28/28 | 1595 ms |
| D | 编号 | ✅ PASS | 79/79 | 3615 ms |
| E | 导出 | ✅ PASS | 43/43 | 12727 ms |
| F | 稳定性 | ✅ PASS | 19/19 | 3638 ms |
| G | 合并单元格 | ✅ PASS | 36/36 | 4851 ms |
| H | 快捷模板 | ✅ PASS | 56/56 | 4563 ms |
| I | 批量编号 | ✅ PASS | 20/20 | 2515 ms |
| J | 粘贴画布 | ✅ PASS | 33/33 | 2985 ms |
| K | 桌面桥 | ✅ PASS | 22/22 | 2049 ms |
| L | 高DPI布局 | ✅ PASS | 41/41 | 1493 ms |
| M | 多页工程 | ✅ PASS | 31/31 | 2517 ms |
| N | 撤销重做 | ✅ PASS | 30/30 | 9231 ms |
| O | 分组/多页导出/.fig | ✅ PASS | 40/40 | 10071 ms |
| P | 网格自定义 | ✅ PASS | 23/23 | 2735 ms |
| Q | 导出保存位置 | ✅ PASS | 24/24 | 2352 ms |
| R | 编号越界自动加页距 | ✅ PASS | 25/25 | 3289 ms |
| S | PDF按墨迹裁剪白边 | ✅ PASS | 56/56 | 15960 ms |
| T | 滑块数字输入 | ✅ PASS | 22/22 | 1283 ms |
| U | EMF矢量PDF | ✅ PASS | 39/39 | 2178 ms |
| V | 负间距 | ✅ PASS | 47/47 | 6209 ms |
| W | 界面外观 | ✅ PASS | 45/45 | 14382 ms |
| X | 配置模板 | ✅ PASS | 46/46 | 7288 ms |
| Y | 矢量标签bbox | ✅ PASS | 29/29 | 1172 ms |
| Z | 配置宿主持久化 | ✅ PASS | 29/29 | 4124 ms |
| AA | 工程文件 | ✅ PASS | 18/18 | 1839 ms |
| AB | 配置备份恢复 | ✅ PASS | 12/12 | 1752 ms |
| AC | 期刊配置库 | ✅ PASS | 14/14 | 1183 ms |
| AD | 图片预检 | ✅ PASS | 12/12 | 1076 ms |
| AE | 更新 UI | ✅ PASS | 10/10 | 1869 ms |
| AF | 全页矢量 | ✅ PASS | 14/14 | 2941 ms |
| AG | 页面自动编号 | ✅ PASS | 11/11 | 924 ms |
| AH | 原生保存路径 | ✅ PASS | 16/16 | 3847 ms |
| AI | 诊断日志 | ✅ PASS | 17/17 | 2862 ms |
| AJ | 真实桥回包 | ✅ PASS | 18/18 | 3640 ms |

## 失败项清单

无失败项（全部断言通过）。

## A. 首屏 — PASS

> 应用可加载、就绪标志正确、默认状态/UI 正确、无 JS 报错、截图

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | 就绪标志 dataset.figplayReady === "1" | 1 |
| ✅ | window.__FIGPLAY__.ready === true | null |
| ✅ | 测试 API 方法齐全 | ["getState","setLayout","setUploadTarget","getPreviewInfo","loadDemo","clearAll","exportBase64"] |
| ✅ | 页面 title 含 FigurePlay | FigurePlay · 论文子图排版工具 |
| ✅ | 默认布局 3 行 × 2 列 | 3x2 |
| ✅ | 默认格子数 = 6 且全部为空 | {"cellCount":6,"filled":[],"imageCount":0} |
| ✅ | 几何计算与 js/layout.js 公式一致 | [] |
| ✅ | 默认成品尺寸 170 × 193 mm | {"widthMm":170,"heightMm":193} |
| ✅ | 预览 SVG 有 6 个 .cell-hit | 6 |
| ✅ | 预览 viewBox "0 0 170 H" | 0 0 170 193 |
| ✅ | 预览无图片、无编号文字 | {"images":0,"labels":0} |
| ✅ | 行数 = 3 | 3 |
| ✅ | 列数 = 2 | 2 |
| ✅ | 成品宽度 = 170 | 170 |
| ✅ | 矩阵选中 3×2（高亮 6 格） | {"cells":[{"r":1,"c":1},{"r":1,"c":2},{"r":2,"c":1},{"r":2,"c":2},{"r":3,"c":1},{"r":3,"c":2}],"caption":"3 行 × 2 列"} |
| ✅ | 编号默认开启、方案 (a) | {"show":true,"scheme":"alpha-paren"} |
| ✅ | 编号位置默认 tl | {"pos":"tl"} |
| ✅ | 导出格式默认 PNG、DPI=300 | {"format":{"format":"png"},"dpi":"300"} |
| ✅ | 导出按钮文字 = "导出 PNG" | 导出 PNG |
| ✅ | 矩阵选择器 36 个按钮 | 36 |
| ✅ | 编号位置 9 个按钮 | 9 |
| ✅ | #file-input 为 multiple 且隐藏 | null |
| ✅ | 预览 SVG 与导出按钮可见 | {"previewSvg":{"width":488.859375,"height":555},"exportButton":{"width":275,"height":40}} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![A-01-first-screen.png](<screens-v1.5.1/A-01-first-screen.png>)

关键证据：

```json
{
  "readyFlags": {
    "dataset": "1",
    "apiReady": true,
    "version": "1.5.1",
    "apiMethods": [
      "getState",
      "setLayout",
      "setUploadTarget",
      "getPreviewInfo",
      "loadDemo",
      "clearAll",
      "exportBase64"
    ]
  },
  "initialPreview": {
    "geom": {
      "rows": 3,
      "cols": 2,
      "widthMm": 170,
      "heightMm": 193,
      "cellW": 84,
      "cellH": 63,
      "panelCount": 6
    },
    "cells": [
      {
        "index": 0,
        "row": 0,
        "col": 0,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 0,
        "y": 0,
        "w": 84,
        "h": 63,
        "merged": false
      },
      {
        "index": 1,
        "row": 0,
        "col": 1,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 86,
        "y": 0,
        "w": 84,
        "h": 63,
        "merged": false
      },
      {
        "index": 2,
        "row": 1,
        "col": 0,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 0,
        "y": 65,
        "w": 84,
        "h": 63,
        "merged": false
      },
      {
        "index": 3,
        "row": 1,
        "col": 1,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 86,
        "y": 65,
        "w": 84,
        "h": 63,
        "merged": false
      },
      {
        "index": 4,
        "row": 2,
        "col": 0,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 0,
        "y": 130,
        "w": 84,
        "h": 63,
        "merged": false
      },
      {
        "index": 5,
        "row": 2,
        "col": 1,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 86,
        "y": 130,
        "w": 84,
        "h": 63,
        "merged": false
      }
    ],
    "panels": [
      {
        "index": 0,
        "row": 0,
        "col": 0,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 0,
        "y": 0,
        "w": 84,
        "h": 63,
        "merged": false
      },
      {
        "index": 1,
        "row": 0,
        "col": 1,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 86,
        "y": 0,
        "w": 84,
        "h": 63,
        "merged": false
      },
      {
        "index": 2,
        "row": 1,
        "col": 0,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 0,
        "y": 65,
        "w": 84,
        "h": 63,
        "merged": false
      },
      {
        "index": 3,
        "row": 1,
        "col": 1,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 86,
        "y": 65,
        "w": 84,
        "h": 63,
        "merged": false
      },
      {
        "index": 4,
        "row": 2,
        "col": 0,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 0,
        "y": 130,
        "w": 84,
        "h": 63,
        "merged": false
      },
      {
        "index": 5,
        "row": 2,
        "col": 1,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 86,
        "y": 130,
        "w": 84,
        "h": 63,
        "merged": false
      }
    ],
    "cellCount": 6,
    "gridCellCount": 6,
    "merges": [],
    "multiSelect": [],
    "filled": [],
    "labels": [],
    "groups": [],
    "pageIndex": 0,
    "pageCount": 1,
    "pageName": "图 1",
    "pages": [
      {
        "index": 0,
        "name": "图 1",
        "filledCount": 0
      }
    ],
    "canUndo": false,
    "canRedo": false,
    "imageCount": 0,
    "labelCount": 0,
    "selectedCell": null,
    "sizeCssPx": {
      "width": 489,
      "height": 555
    }
  },
  "initialState": {
    "ready": true,
    "pageIndex": 0,
    "pageCount": 1,
    "pageName": "图 1",
    "pages": [
      {
        "index": 0,
        "name": "图 1",
        "filledCount": 0
      }
    ],
    "layout": {
      "rows": 3,
      "cols": 2,
      "widthMm": 170,
      "aspectW": 4,
      "aspectH": 3,
      "colGap": 2,
      "rowGap": 2,
      "margin": 0,
      "bgMode": "white",
      "bgColor": "#ffffff",
      "borderOn": false,
      "borderWidth": 0.25,
      "borderColor": "#000000",
      "fi…
```

## B. 布局 — PASS

> 矩阵/输入/API 三种方式改行列：格子数量、排列、几何正确；改行列后已有图片保留合理

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | [3×2] 行列/格子数正确（方式:matrix） | {"geom":{"rows":3,"cols":2,"widthMm":170,"heightMm":193,"cellW":84,"cellH":63,"panelCount":6},"cellCount":6} |
| ✅ | [3×2] 几何（cellW/cellH/heightMm）与公式一致 | [] |
| ✅ | [3×2] 预览格子排列为 3 行 × 2 列 | [] |
| ✅ | [3×2] 预览 viewBox 与成品尺寸一致 | 0 0 170 193 |
| ✅ | [2×3] 行列/格子数正确（方式:inputs） | {"geom":{"rows":2,"cols":3,"widthMm":170,"heightMm":85.00000000000001,"cellW":55.333333333333336,"cellH":41.50000000000001,"panelCount":6},"cellCount":6} |
| ✅ | [2×3] 几何（cellW/cellH/heightMm）与公式一致 | [] |
| ✅ | [2×3] 预览格子排列为 2 行 × 3 列 | [] |
| ✅ | [2×3] 预览 viewBox 与成品尺寸一致 | 0 0 170 85 |
| ✅ | [1×6] 行列/格子数正确（方式:api） | {"geom":{"rows":1,"cols":6,"widthMm":170,"heightMm":20.000000000000004,"cellW":26.666666666666668,"cellH":20.000000000000004,"panelCount":6},"cellCount":6} |
| ✅ | [1×6] 几何（cellW/cellH/heightMm）与公式一致 | [] |
| ✅ | [1×6] 预览格子排列为 1 行 × 6 列 | [] |
| ✅ | [1×6] 预览 viewBox 与成品尺寸一致 | 0 0 170 20 |
| ✅ | 3×2 批量上传 4 张成功 | ["sample-1.png","sample-2.png","sample-3.png","sample-4.png",null,null] |
| ✅ | 改 2×3 后图片数量保留 4 张 | ["sample-1.png","sample-2.png","sample-3.png","sample-4.png",null,null] |
| ✅ | 改 2×3 后预览 imageCount = 4 | 4 |
| ✅ | 改 2×3 后按原序号保留（前缀不变） | {"before":["sample-1.png","sample-2.png","sample-3.png","sample-4.png",null,null],"after":["sample-1.png","sample-2.png","sample-3.png","sample-4.png",null,null]} |
| ✅ | 改 2×3 后格子数 = 6 | 6 |
| ✅ | 改 2×3 后图片数据未损坏（href 尾部不变） | {"before":["0:FF3/D9Wh6TU6QyXzAAAAAElFTkSuQmCC","1:kHT+P9SrVdlIwJMuAAAAAElFTkSuQmCC","2:mPP/AYDKVLHwGhZ2AAAAAElFTkSuQmCC","3:/z8YFBaKU8PVEgAAAABJRU5ErkJggg=="],"after":["0:FF3/D9Wh6TU6QyXzAAAAAElFTkSuQmCC","1:kHT+P9SrVdlIwJMuAAAAAElFTkSuQmCC","2:mPP/AYDKVLHwGhZ2AAAAAElFTkSuQmCC","3:/z8YFBaKU8PVEgAAA… |
| ✅ | 改 1×6 后图片数量保留 4 张 | ["sample-1.png","sample-2.png","sample-3.png","sample-4.png",null,null] |
| ✅ | 改 1×6 后预览 imageCount = 4 | 4 |
| ✅ | 改 1×6 后按原序号保留（前缀不变） | {"before":["sample-1.png","sample-2.png","sample-3.png","sample-4.png",null,null],"after":["sample-1.png","sample-2.png","sample-3.png","sample-4.png",null,null]} |
| ✅ | 改 1×6 后格子数 = 6 | 6 |
| ✅ | 改 1×6 后图片数据未损坏（href 尾部不变） | {"before":["0:FF3/D9Wh6TU6QyXzAAAAAElFTkSuQmCC","1:kHT+P9SrVdlIwJMuAAAAAElFTkSuQmCC","2:mPP/AYDKVLHwGhZ2AAAAAElFTkSuQmCC","3:/z8YFBaKU8PVEgAAAABJRU5ErkJggg=="],"after":["0:FF3/D9Wh6TU6QyXzAAAAAElFTkSuQmCC","1:kHT+P9SrVdlIwJMuAAAAAElFTkSuQmCC","2:mPP/AYDKVLHwGhZ2AAAAAElFTkSuQmCC","3:/z8YFBaKU8PVEgAAA… |
| ✅ | 改 3×2 后图片数量保留 4 张 | ["sample-1.png","sample-2.png","sample-3.png","sample-4.png",null,null] |
| ✅ | 改 3×2 后预览 imageCount = 4 | 4 |
| ✅ | 改 3×2 后按原序号保留（前缀不变） | {"before":["sample-1.png","sample-2.png","sample-3.png","sample-4.png",null,null],"after":["sample-1.png","sample-2.png","sample-3.png","sample-4.png",null,null]} |
| ✅ | 改 3×2 后格子数 = 6 | 6 |
| ✅ | 改 3×2 后图片数据未损坏（href 尾部不变） | {"before":["0:FF3/D9Wh6TU6QyXzAAAAAElFTkSuQmCC","1:kHT+P9SrVdlIwJMuAAAAAElFTkSuQmCC","2:mPP/AYDKVLHwGhZ2AAAAAElFTkSuQmCC","3:/z8YFBaKU8PVEgAAAABJRU5ErkJggg=="],"after":["0:FF3/D9Wh6TU6QyXzAAAAAElFTkSuQmCC","1:kHT+P9SrVdlIwJMuAAAAAElFTkSuQmCC","2:mPP/AYDKVLHwGhZ2AAAAAElFTkSuQmCC","3:/z8YFBaKU8PVEgAAA… |
| ✅ | 缩小到 2×2 后保留前 4 张（无丢失） | ["sample-1.png","sample-2.png","sample-3.png","sample-4.png"] |
| ✅ | 6 张 → 2×2：保留 4 张、丢弃 2 张且状态自洽 | {"cells":4,"imageCount":4} |
| ✅ | 缩小网格时弹出“移除超限图片”提示 | 网格缩小：移除了 2 张超出网格的图片 |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![B-01-layout-3x2.png](<screens-v1.5.1/B-01-layout-3x2.png>)

关键证据：

```json
{
  "layout-3x2": {
    "method": "matrix",
    "geom": {
      "rows": 3,
      "cols": 2,
      "widthMm": 170,
      "heightMm": 193,
      "cellW": 84,
      "cellH": 63,
      "panelCount": 6
    },
    "cellCount": 6,
    "hits": [
      {
        "index": 0,
        "x": 0,
        "y": 0,
        "w": 84,
        "h": 63
      },
      {
        "index": 1,
        "x": 86,
        "y": 0,
        "w": 84,
        "h": 63
      },
      {
        "index": 2,
        "x": 0,
        "y": 65,
        "w": 84,
        "h": 63
      },
      {
        "index": 3,
        "x": 86,
        "y": 65,
        "w": 84,
        "h": 63
      },
      {
        "index": 4,
        "x": 0,
        "y": 130,
        "w": 84,
        "h": 63
      },
      {
        "index": 5,
        "x": 86,
        "y": 130,
        "w": 84,
        "h": 63
      }
    ],
    "viewBox": "0 0 170 193"
  },
  "layout-2x3": {
    "method": "inputs",
    "geom": {
      "rows": 2,
      "cols": 3,
      "widthMm": 170,
      "heightMm": 85.00000000000001,
      "cellW": 55.333333333333336,
      "cellH": 41.50000000000001,
      "panelCount": 6
    },
    "cellCount": 6,
    "hits": [
      {
        "index": 0,
        "x": 0,
        "y": 0,
        "w": 55.33300018310547,
        "h": 41.5
      },
      {
        "index": 1,
        "x": 57.33300018310547,
        "y": 0,
        "w": 55.33300018310547,
        "h": 41.5
      },
      {
        "index": 2,
        "x": 114.66699981689453,
        "y": 0,
        "w": 55.33300018310547,
        "h": 41.5
      },
      {
        "index": 3,
        "x": 0,
        "y": 43.5,
        "w": 55.33300018310547,
        "h": 41.5
      },
      {
        "index": 4,
        "x": 57.33300018310547,
        "y": 43.5,
        "w": 55.33300018310547,
        "h": 41.5
      },
      {
        "index": 5,
        "x": 114.66699981689453,
        "y": 43.5,
        "w": 55.33300018310547,
        "h": 41.5
      }
    ],
    "viewBox": "0 0 170 85"
  },
  "layout-1x6": {
    "method": "api",
    "geom": {
      "rows": 1,
      "cols": 6,
      "widthMm": 170,
      "heightMm": 20.000000000000004,
      "cellW": 26.666666666666668,
      "cellH": 20.000000000000004,
      "panelCount": 6
    },
    "cellCount": 6,
    "hits": [
      {
        "index": 0,
        "x": 0,
        "y": 0,
        "w": 26.66699981689453,
        "h": 20
      },
      {
        "index": 1,
        "x": 28.66699981689453,
        "y": 0,
        "w": 26.66699981689453,
        "h": 20
      },
      {
        "index": 2,
        "x": 57.33300018310547,
        "y": 0,
        "w": 26.66699981689453,
        "h": 20
      },
      {
        "index": 3,
        "x": 86,
        "y": 0,
        "w": 26.66699981689453,
        "h": 20
      },
      {
        "index": 4,
        "x": 114.66699981689453,
        "y": 0,
        "w": 26.66699981689453,
        "h": 20
      },
      {
        "index": 5,
        "x": 143.33299255371094,
        "y": 0,
        "w": 26.66699981689453,
        "h": 20
      }
    ],
    "viewBox": "0 0 170 20"
  }
}
```

## C. 上传 — PASS

> 指定格子/批量 setInputFiles 上传，预览 <image> 数量与内容正确；拖放到格子可替换

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | 指定 target=2 上传后 filled = [2] | [2] |
| ✅ | imageCount = 1 | 1 |
| ✅ | 预览有效 <image> 数量 = 1 | 1 |
| ✅ | 预览 <image> href = 源文件 FileReader dataURL | {"hrefLength":38498,"expectedLength":38498} |
| ✅ | 预览 <image> 所在格子 = 2 | 2 |
| ✅ | state.cells[2] 名称/尺寸正确 | {"name":"sample-1.png","width":1200,"height":900,"bytes":28857,"fit":"inherit","zoom":1,"offsetX":0,"offsetY":0,"rotation":0,"customLabel":"","hasData":true} |
| ✅ | 其余格子仍为空 | [null,null,"sample-1.png",null,null,null] |
| ✅ | 批量上传后 filled = [0,1,2,3] | [0,1,2,3] |
| ✅ | 批量上传后 imageCount = 4 | 4 |
| ✅ | 批量上传后预览 <image> 数量 = 4 | 4 |
| ✅ | 格子 0 显示 sample-2.png（dataURL 完全一致） | {"hrefLength":38986,"expectedLength":38986} |
| ✅ | 格子 0 state 名称/尺寸正确 | {"name":"sample-2.png","width":1200,"height":900} |
| ✅ | 格子 1 显示 sample-3.png（dataURL 完全一致） | {"hrefLength":39254,"expectedLength":39254} |
| ✅ | 格子 1 state 名称/尺寸正确 | {"name":"sample-3.png","width":1200,"height":900} |
| ✅ | 格子 2 显示 sample-1.png（dataURL 完全一致） | {"hrefLength":38498,"expectedLength":38498} |
| ✅ | 格子 2 state 名称/尺寸正确 | {"name":"sample-1.png","width":1200,"height":900} |
| ✅ | 格子 3 显示 sample-4.png（dataURL 完全一致） | {"hrefLength":43470,"expectedLength":43470} |
| ✅ | 格子 3 state 名称/尺寸正确 | {"name":"sample-4.png","width":900,"height":1200} |
| ✅ | 替换格子 2 后图片数量仍为 4 | 4 |
| ✅ | 替换格子 2 后显示 sample-5（dataURL 一致） | null |
| ✅ | 替换格子 2 后 state 名称为 sample-5.png | sample-5.png |
| ✅ | 拖放文件到格子 0 后替换为 sample-6.png | sample-6.png |
| ✅ | 拖放后格子 0 <image> dataURL 正确 | null |
| ✅ | 拖放后图片总数仍为 4 | 4 |
| ✅ | #file-input 支持 multiple 且 accept 含 image/* | {"multiple":true,"hidden":true,"accept":"image/*,.tif,.tiff,.fig"} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![C-01-upload-batch.png](<screens-v1.5.1/C-01-upload-batch.png>)

关键证据：

```json
{
  "uploadSingle": {
    "filled": [
      2
    ],
    "imageCount": 1
  },
  "uploadBatch": {
    "filled": [
      0,
      1,
      2,
      3
    ],
    "names": [
      "sample-2.png",
      "sample-3.png",
      "sample-1.png",
      "sample-4.png",
      null,
      null
    ]
  },
  "finalFilled": [
    0,
    1,
    2,
    3
  ]
}
```

## D. 编号 — PASS

> 编号方案/起始/顺序/跳过空图/9 个位置/字号加粗斜体颜色/自定义编号，预览文字与位置正确

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | 准备：3×2 布局、图片位于格子 0/2/4 | [0,2,4] |
| ✅ | 默认编号（skipEmpty）：编号数量 = 3 | 3 |
| ✅ | 默认编号（skipEmpty）：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"(a)"},{"cellIndex":2,"text":"(b)"},{"cellIndex":4,"text":"(c)"}],"expected":["0:(a)","2:(b)","4:(c)"]} |
| ✅ | 默认编号（skipEmpty）：DOM 编号文字一致 | ["(a)","(b)","(c)"] |
| ✅ | 默认编号（skipEmpty）：空子图不参与编号 | [] |
| ✅ | 方案 alpha-paren：编号数量 = 3 | 3 |
| ✅ | 方案 alpha-paren：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"(a)"},{"cellIndex":2,"text":"(b)"},{"cellIndex":4,"text":"(c)"}],"expected":["0:(a)","2:(b)","4:(c)"]} |
| ✅ | 方案 alpha-paren：DOM 编号文字一致 | ["(a)","(b)","(c)"] |
| ✅ | 方案 alpha-rparen：编号数量 = 3 | 3 |
| ✅ | 方案 alpha-rparen：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"a)"},{"cellIndex":2,"text":"b)"},{"cellIndex":4,"text":"c)"}],"expected":["0:a)","2:b)","4:c)"]} |
| ✅ | 方案 alpha-rparen：DOM 编号文字一致 | ["a)","b)","c)"] |
| ✅ | 方案 alpha-dot：编号数量 = 3 | 3 |
| ✅ | 方案 alpha-dot：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"a."},{"cellIndex":2,"text":"b."},{"cellIndex":4,"text":"c."}],"expected":["0:a.","2:b.","4:c."]} |
| ✅ | 方案 alpha-dot：DOM 编号文字一致 | ["a.","b.","c."] |
| ✅ | 方案 alpha-bare：编号数量 = 3 | 3 |
| ✅ | 方案 alpha-bare：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"a"},{"cellIndex":2,"text":"b"},{"cellIndex":4,"text":"c"}],"expected":["0:a","2:b","4:c"]} |
| ✅ | 方案 alpha-bare：DOM 编号文字一致 | ["a","b","c"] |
| ✅ | 方案 Alpha-paren：编号数量 = 3 | 3 |
| ✅ | 方案 Alpha-paren：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"(A)"},{"cellIndex":2,"text":"(B)"},{"cellIndex":4,"text":"(C)"}],"expected":["0:(A)","2:(B)","4:(C)"]} |
| ✅ | 方案 Alpha-paren：DOM 编号文字一致 | ["(A)","(B)","(C)"] |
| ✅ | 方案 Alpha-rparen：编号数量 = 3 | 3 |
| ✅ | 方案 Alpha-rparen：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"A)"},{"cellIndex":2,"text":"B)"},{"cellIndex":4,"text":"C)"}],"expected":["0:A)","2:B)","4:C)"]} |
| ✅ | 方案 Alpha-rparen：DOM 编号文字一致 | ["A)","B)","C)"] |
| ✅ | 方案 roman-paren：编号数量 = 3 | 3 |
| ✅ | 方案 roman-paren：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"(i)"},{"cellIndex":2,"text":"(ii)"},{"cellIndex":4,"text":"(iii)"}],"expected":["0:(i)","2:(ii)","4:(iii)"]} |
| ✅ | 方案 roman-paren：DOM 编号文字一致 | ["(i)","(ii)","(iii)"] |
| ✅ | 方案 roman-rparen：编号数量 = 3 | 3 |
| ✅ | 方案 roman-rparen：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"i)"},{"cellIndex":2,"text":"ii)"},{"cellIndex":4,"text":"iii)"}],"expected":["0:i)","2:ii)","4:iii)"]} |
| ✅ | 方案 roman-rparen：DOM 编号文字一致 | ["i)","ii)","iii)"] |
| ✅ | 方案 Roman-paren：编号数量 = 3 | 3 |
| ✅ | 方案 Roman-paren：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"(I)"},{"cellIndex":2,"text":"(II)"},{"cellIndex":4,"text":"(III)"}],"expected":["0:(I)","2:(II)","4:(III)"]} |
| ✅ | 方案 Roman-paren：DOM 编号文字一致 | ["(I)","(II)","(III)"] |
| ✅ | 方案 Roman-rparen：编号数量 = 3 | 3 |
| ✅ | 方案 Roman-rparen：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"I)"},{"cellIndex":2,"text":"II)"},{"cellIndex":4,"text":"III)"}],"expected":["0:I)","2:II)","4:III)"]} |
| ✅ | 方案 Roman-rparen：DOM 编号文字一致 | ["I)","II)","III)"] |
| ✅ | 方案 number-paren：编号数量 = 3 | 3 |
| ✅ | 方案 number-paren：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"(1)"},{"cellIndex":2,"text":"(2)"},{"cellIndex":4,"text":"(3)"}],"expected":["0:(1)","2:(2)","4:(3)"]} |
| ✅ | 方案 number-paren：DOM 编号文字一致 | ["(1)","(2)","(3)"] |
| ✅ | 方案 number-rparen：编号数量 = 3 | 3 |
| ✅ | 方案 number-rparen：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"1)"},{"cellIndex":2,"text":"2)"},{"cellIndex":4,"text":"3)"}],"expected":["0:1)","2:2)","4:3)"]} |
| ✅ | 方案 number-rparen：DOM 编号文字一致 | ["1)","2)","3)"] |
| ✅ | 方案 number-dot：编号数量 = 3 | 3 |
| ✅ | 方案 number-dot：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"1."},{"cellIndex":2,"text":"2."},{"cellIndex":4,"text":"3."}],"expected":["0:1.","2:2.","4:3."]} |
| ✅ | 方案 number-dot：DOM 编号文字一致 | ["1.","2.","3."] |
| ✅ | 方案 number-bare：编号数量 = 3 | 3 |
| ✅ | 方案 number-bare：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"1"},{"cellIndex":2,"text":"2"},{"cellIndex":4,"text":"3"}],"expected":["0:1","2:2","4:3"]} |
| ✅ | 方案 number-bare：DOM 编号文字一致 | ["1","2","3"] |
| ✅ | 起始编号=3（number-paren）：编号数量 = 3 | 3 |
| ✅ | 起始编号=3（number-paren）：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"(3)"},{"cellIndex":2,"text":"(4)"},{"cellIndex":4,"text":"(5)"}],"expected":["0:(3)","2:(4)","4:(5)"]} |
| ✅ | 起始编号=3（number-paren）：DOM 编号文字一致 | ["(3)","(4)","(5)"] |
| ✅ | 关闭“空子图不参与编号”：编号数量 = 6 | 6 |
| ✅ | 关闭“空子图不参与编号”：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"(1)"},{"cellIndex":1,"text":"(2)"},{"cellIndex":2,"text":"(3)"},{"cellIndex":3,"text":"(4)"},{"cellIndex":4,"text":"(5)"},{"cellIndex":5,"text":"(6)"}],"expected":["0:(1)","1:(2)","2:(3)","3:(4)","4:(5)","5:(6)"]} |
| ✅ | 关闭“空子图不参与编号”：DOM 编号文字一致 | ["(1)","(2)","(3)","(4)","(5)","(6)"] |
| ✅ | 关闭编号后预览无 label-text | 0 |
| ✅ | 列优先顺序（先行后列→先列后行）：编号数量 = 6 | 6 |
| ✅ | 列优先顺序（先行后列→先列后行）：编号内容/顺序正确 | {"actual":[{"cellIndex":0,"text":"(a)"},{"cellIndex":2,"text":"(b)"},{"cellIndex":4,"text":"(c)"},{"cellIndex":1,"text":"(d)"},{"cellIndex":3,"text":"(e)"},{"cellIndex":5,"text":"(f)"}],"expected":["0:(a)","2:(b)","4:(c)","1:(d)","3:(e)","5:(f)"]} |
| ✅ | 列优先顺序（先行后列→先列后行）：DOM 编号文字一致 | ["(a)","(b)","(c)","(d)","(e)","(f)"] |
| ✅ | 位置 tl 编号位于格子上左 | {"nx":0.04041991489274161,"ny":0.04019080078791058,"anchor":"start"} |
| ✅ | 位置 tc 编号位于格子上中 | {"nx":0.5015641819863093,"ny":0.04019080078791058,"anchor":"middle"} |
| ✅ | 位置 tr 编号位于格子上右 | {"nx":0.9627084476607186,"ny":0.04019080078791058,"anchor":"end"} |
| ✅ | 位置 ml 编号位于格子中左 | {"nx":0.04041991489274161,"ny":0.49370351291838144,"anchor":"start"} |
| ✅ | 位置 mc 编号位于格子中中 | {"nx":0.5015641819863093,"ny":0.49370351291838144,"anchor":"middle"} |
| ✅ | 位置 mr 编号位于格子中右 | {"nx":0.9627084476607186,"ny":0.49370351291838144,"anchor":"end"} |
| ✅ | 位置 bl 编号位于格子下左 | {"nx":0.04041991489274161,"ny":0.9472162193722196,"anchor":"start"} |
| ✅ | 位置 bc 编号位于格子下中 | {"nx":0.5015641819863093,"ny":0.9472162193722196,"anchor":"middle"} |
| ✅ | 位置 br 编号位于格子下右 | {"nx":0.9627084476607186,"ny":0.9472162193722196,"anchor":"end"} |
| ✅ | 字号 18pt 渲染为 6.35mm | 6.35 |
| ✅ | 加粗 font-weight=700 | 700 |
| ✅ | 斜体 font-style=italic | italic |
| ✅ | 编号颜色 #ff0000 | #ff0000 |
| ✅ | 内边距 1.5→5mm 时编号 x 增加 3.5mm | {"from":1.5,"to":5} |
| ✅ | 水平偏移 +4mm 时编号 x 再 +4mm | {"from":5,"to":9} |
| ✅ | 垂直偏移 +3mm 时编号 y 增加 3mm | {"from":7.1908,"to":10.1908} |
| ✅ | 自定义编号 X1 覆盖格子 1 自动编号 | [{"cellIndex":0,"text":"(a)","groupId":null},{"cellIndex":1,"text":"X1","groupId":null},{"cellIndex":2,"text":"(c)","groupId":null},{"cellIndex":3,"text":"(d)","groupId":null},{"cellIndex":4,"text":"(e)","groupId":null},{"cellIndex":5,"text":"(f)","groupId":null}] |
| ✅ | 自定义编号不影响其它格子编号 | [{"cellIndex":0,"text":"(a)","groupId":null},{"cellIndex":1,"text":"X1","groupId":null},{"cellIndex":2,"text":"(c)","groupId":null},{"cellIndex":3,"text":"(d)","groupId":null},{"cellIndex":4,"text":"(e)","groupId":null},{"cellIndex":5,"text":"(f)","groupId":null}] |
| ✅ | 清除自定义编号后恢复自动编号 (b) | null |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![D-01-labels-positions.png](<screens-v1.5.1/D-01-labels-positions.png>)

关键证据：

```json
{
  "scheme-alpha-paren": [
    "(a)",
    "(b)",
    "(c)"
  ],
  "scheme-alpha-rparen": [
    "a)",
    "b)",
    "c)"
  ],
  "scheme-alpha-dot": [
    "a.",
    "b.",
    "c."
  ],
  "scheme-alpha-bare": [
    "a",
    "b",
    "c"
  ],
  "scheme-Alpha-paren": [
    "(A)",
    "(B)",
    "(C)"
  ],
  "scheme-Alpha-rparen": [
    "A)",
    "B)",
    "C)"
  ],
  "scheme-roman-paren": [
    "(i)",
    "(ii)",
    "(iii)"
  ],
  "scheme-roman-rparen": [
    "i)",
    "ii)",
    "iii)"
  ],
  "scheme-Roman-paren": [
    "(I)",
    "(II)",
    "(III)"
  ],
  "scheme-Roman-rparen": [
    "I)",
    "II)",
    "III)"
  ],
  "scheme-number-paren": [
    "(1)",
    "(2)",
    "(3)"
  ],
  "scheme-number-rparen": [
    "1)",
    "2)",
    "3)"
  ],
  "scheme-number-dot": [
    "1.",
    "2.",
    "3."
  ],
  "scheme-number-bare": [
    "1",
    "2",
    "3"
  ],
  "positions": {
    "tl": {
      "nx": 0.04,
      "ny": 0.04,
      "anchor": "start"
    },
    "tc": {
      "nx": 0.502,
      "ny": 0.04,
      "anchor": "middle"
    },
    "tr": {
      "nx": 0.963,
      "ny": 0.04,
      "anchor": "end"
    },
    "ml": {
      "nx": 0.04,
      "ny": 0.494,
      "anchor": "start"
    },
    "mc": {
      "nx": 0.502,
      "ny": 0.494,
      "anchor": "middle"
    },
    "mr": {
      "nx": 0.963,
      "ny": 0.494,
      "anchor": "end"
    },
    "bl": {
      "nx": 0.04,
      "ny": 0.947,
      "anchor": "start"
    },
    "bc": {
      "nx": 0.502,
      "ny": 0.947,
      "anchor": "middle"
    },
    "br": {
      "nx": 0.963,
      "ny": 0.947,
      "anchor": "end"
    }
  }
}
```

## E. 导出 — PASS

> PNG/JPG/SVG/PDF 导出：像素尺寸=mm/25.4×DPI、非空白、SVG 结构、PDF MediaBox/渲染；150/300/600DPI、JPG 质量、透明背景、UI 下载

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | 导出准备：6 张图、外边距 5mm、3×2 布局 | {"filled":6,"margin":5} |
| ✅ | 导出准备：期望编号 (a)…(f) | ["(a)","(b)","(c)","(d)","(e)","(f)"] |
| ✅ | PNG 300DPI 白底：文件生成（PNG，515386 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-e2e-png-300.png","size":515386} |
| ✅ | PNG 300DPI 白底：Python 校验通过 | OK |
| ✅ | PNG 300DPI 返回 widthPx/heightPx 符合 mm/25.4×DPI | {"api":[2008,2265],"expected":[2008,2265]} |
| ✅ | PNG 透明背景：文件生成（PNG，513700 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-e2e-png-transparent.png","size":513700} |
| ✅ | PNG 透明背景：Python 校验通过 | OK |
| ✅ | 透明 PNG 文件名 = fp-e2e-png-transparent.png | fp-e2e-png-transparent.png |
| ✅ | JPG 300DPI 质量95：文件生成（JPG，494724 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-e2e-jpg-q95.jpg","size":494724} |
| ✅ | JPG 300DPI 质量95：Python 校验通过 | OK |
| ✅ | JPG 300DPI 质量60：文件生成（JPG，211206 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-e2e-jpg-q60.jpg","size":211206} |
| ✅ | JPG 300DPI 质量60：Python 校验通过 | OK |
| ✅ | JPG 质量 95 文件体积 > 质量 60（质量参数生效） | {"q95":494724,"q60":211206} |
| ✅ | SVG 白底：文件生成（SVG，495235 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-e2e-figure.svg","size":495235} |
| ✅ | SVG 白底：Python 校验通过 | OK |
| ✅ | SVG 返回 mime=image/svg+xml | image/svg+xml |
| ✅ | SVG 透明背景：文件生成（SVG，495232 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-e2e-figure-transparent.svg","size":495232} |
| ✅ | SVG 透明背景：Python 校验通过 | OK |
| ✅ | SVG 透明导出文件名 = fp-e2e-figure-transparent.svg | fp-e2e-figure-transparent.svg |
| ✅ | PDF 300DPI：文件生成（PDF，495620 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-e2e-figure.pdf","size":495620} |
| ✅ | PDF 300DPI：Python 校验通过 | OK |
| ✅ | PDF 渲染图非空白且四角为白底 | OK |
| ✅ | PDF 返回 mime=application/pdf 且页数校验通过 | {"mime":"application/pdf","pageCount":1} |
| ✅ | PNG 150DPI：文件生成（PNG，229655 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-e2e-png-150dpi.png","size":229655} |
| ✅ | PNG 150DPI：Python 校验通过 | OK |
| ✅ | PNG 150DPI 像素尺寸 = mm/25.4×150 | {"api":[1004,1132],"expected":[1004,1132]} |
| ✅ | PNG 300DPI：文件生成（PNG，515386 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-e2e-png-300dpi.png","size":515386} |
| ✅ | PNG 300DPI：Python 校验通过 | OK |
| ✅ | PNG 300DPI 像素尺寸 = mm/25.4×300 | {"api":[2008,2265],"expected":[2008,2265]} |
| ✅ | PNG 600DPI：文件生成（PNG，1676353 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-e2e-png-600dpi.png","size":1676353} |
| ✅ | PNG 600DPI：Python 校验通过 | OK |
| ✅ | PNG 600DPI 像素尺寸 = mm/25.4×600 | {"api":[4016,4530],"expected":[4016,4530]} |
| ✅ | UI 导出按钮触发下载且文件已保存 | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-e2e-ui.png","size":515386} |
| ✅ | UI 下载文件名 = fp-e2e-ui.png | fp-e2e-ui.png |
| ✅ | UI 下载 PNG 尺寸/内容正确 | OK |
| ✅ | 顶栏导出按钮 #btn-export-top 触发下载并保存 | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-e2e-top.png","size":515386} |
| ✅ | 顶栏导出文件名 = fp-e2e-top.png | fp-e2e-top.png |
| ✅ | 顶栏导出 PNG 尺寸/内容正确 | OK |
| ✅ | exportBase64 overrides（dpi/filename）生效 | {"widthPx":1004,"filename":"fp-e2e-override.png"} |
| ✅ | 导出过程中/后状态栏提示已导出 | 已导出 fp-e2e-top.png（503.3 KB，155 ms） |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![E-01-export-setup.png](<screens-v1.5.1/E-01-export-setup.png>)

关键证据：

```json
{
  "setup": {
    "geom": {
      "rows": 3,
      "cols": 2,
      "widthMm": 170,
      "heightMm": 191.75,
      "contentW": 160,
      "margin": 5,
      "colGap": 2,
      "rowGap": 2,
      "cellW": 79,
      "cellH": 59.25,
      "aspect": 1.3333333333333333,
      "cells": [
        {
          "index": 0,
          "row": 0,
          "col": 0,
          "x": 5,
          "y": 5,
          "w": 79,
          "h": 59.25
        },
        {
          "index": 1,
          "row": 0,
          "col": 1,
          "x": 86,
          "y": 5,
          "w": 79,
          "h": 59.25
        },
        {
          "index": 2,
          "row": 1,
          "col": 0,
          "x": 5,
          "y": 66.25,
          "w": 79,
          "h": 59.25
        },
        {
          "index": 3,
          "row": 1,
          "col": 1,
          "x": 86,
          "y": 66.25,
          "w": 79,
          "h": 59.25
        },
        {
          "index": 4,
          "row": 2,
          "col": 0,
          "x": 5,
          "y": 127.5,
          "w": 79,
          "h": 59.25
        },
        {
          "index": 5,
          "row": 2,
          "col": 1,
          "x": 86,
          "y": 127.5,
          "w": 79,
          "h": 59.25
        }
      ]
    },
    "filled": 6,
    "labels": [
      "(a)",
      "(b)",
      "(c)",
      "(d)",
      "(e)",
      "(f)"
    ],
    "margin": 5,
    "layout": {
      "rows": 3,
      "cols": 2
    }
  },
  "transparentPreviewScreenshot": "E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\screenshots\\E-02-transparent-preview.png",
  "uiStatusAfterExport": "已导出 fp-e2e-top.png（503.3 KB，155 ms）"
}
```

## F. 稳定性 — PASS

> 1366×768 视口可用；改动后自动保存（IndexedDB），刷新后布局/图片/编号/导出设置恢复，无控制台错误

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | 1366×768 下无横向溢出 | {"scrollWidth":1366,"innerWidth":1366} |
| ✅ | 1366×768 下预览画布区域可用（宽 > 400px） | {"x":276,"y":208,"w":764,"h":446} |
| ✅ | 1366×768 下预览 SVG 与导出按钮可见 | {"previewSvg":{"x":486,"y":238,"w":344,"h":390},"exportButton":{"x":1066,"y":986,"w":275,"h":40}} |
| ✅ | 编辑后状态：2×3、2 张图、编号起始 2、roman-paren | {"layout":[2,3],"cells":2,"label":{"start":2,"scheme":"roman-paren"}} |
| ✅ | 改动后自动保存写入成功 | {"backend":"indexeddb","savedAt":1793979742347,"version":2} |
| ✅ | 自动保存为 version 2 project 且含当前页图片 dataUrl | {"version":2,"pages":1,"dataUrls":[{"name":"sample-1.png","dataUrlPrefix":"data:image/png;base64,iVBORw0K"},{"name":"sample-4.png","dataUrlPrefix":"data:image/png;base64,iVBORw0K"}]} |
| ✅ | IndexedDB 中存在 figureplay 数据库（file:// 可用） | ["figureplay"] |
| ✅ | 刷新后布局恢复（2×3） | [2,3] |
| ✅ | 刷新后图片恢复（2 张、名称一致） | ["sample-1.png","sample-4.png",null,null,null,null] |
| ✅ | 刷新后图片 dataUrl 完全恢复（预览 href 与刷新前一致） | {"before":["0","1"],"after":["0","1"],"same":true} |
| ✅ | 刷新后编号设置恢复（start=2, roman-paren） | {"start":2,"scheme":"roman-paren"} |
| ✅ | 刷新后边距/字号恢复（margin=4, size=12） | {"margin":4,"size":12} |
| ✅ | 刷新后导出设置恢复（jpg/150DPI/filename） | {"filename":"fp-e2e-restore","format":"jpg","dpi":150,"jpgQuality":0.95,"transparent":false,"scope":"current","saveAs":true,"vectorPdf":true,"trimPdf":false,"trimMarginMm":0} |
| ✅ | 刷新后预览图片数/编号与状态一致 | {"imageCount":2,"labels":[{"cellIndex":0,"text":"(ii)","groupId":null},{"cellIndex":1,"text":"(iii)","groupId":null}]} |
| ✅ | 刷新后状态栏提示已恢复上次编辑内容 | 已恢复上次编辑内容 |
| ✅ | clearAll 后刷新：图片清空且状态同步 | {"imageCount":0,"filled":[]} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![F-01-viewport-1366x768.png](<screens-v1.5.1/F-01-viewport-1366x768.png>)

关键证据：

```json
{
  "viewport": {
    "innerWidth": 1366,
    "innerHeight": 768,
    "scrollWidth": 1366,
    "scrollHeight": 768,
    "stage": {
      "x": 276,
      "y": 208,
      "w": 764,
      "h": 446
    },
    "previewSvg": {
      "x": 486,
      "y": 238,
      "w": 344,
      "h": 390
    },
    "exportButton": {
      "x": 1066,
      "y": 986,
      "w": 275,
      "h": 40
    },
    "leftPanel": {
      "x": 0,
      "y": 58,
      "w": 276,
      "h": 710
    },
    "rightPanel": {
      "x": 1040,
      "y": 58,
      "w": 326,
      "h": 710
    }
  },
  "editedState": {
    "layout": {
      "rows": 2,
      "cols": 3,
      "widthMm": 170,
      "aspectW": 4,
      "aspectH": 3,
      "colGap": 2,
      "rowGap": 2,
      "margin": 4,
      "bgMode": "white",
      "bgColor": "#ffffff",
      "borderOn": false,
      "borderWidth": 0.25,
      "borderColor": "#000000",
      "fit": "contain",
      "merges": [],
      "autoPad": true,
      "padTopMm": 0,
      "padRightMm": 0,
      "padBottomMm": 0,
      "padLeftMm": 0
    },
    "label": {
      "show": true,
      "scheme": "roman-paren",
      "start": 2,
      "order": "row",
      "skipEmpty": true,
      "position": "tl",
      "insetMm": 1.5,
      "offsetXmm": 0,
      "offsetYmm": 0,
      "fontFamily": "times",
      "fontSizePt": 12,
      "bold": false,
      "italic": false,
      "color": "#000000",
      "bg": "none",
      "bgColor": "#ffffff",
      "bgOpacity": 0.75
    },
    "export": {
      "filename": "fp-e2e-restore",
      "format": "jpg",
      "dpi": 150,
      "jpgQuality": 0.95,
      "transparent": false,
      "scope": "current",
      "saveAs": true,
      "vectorPdf": true,
      "trimPdf": false,
      "trimMarginMm": 0
    },
    "cells": [
      {
        "name": "sample-1.png",
        "hasData": true
      },
      {
        "name": "sample-4.png",
        "hasData": true
      },
      null,
      null,
      null,
      null
    ]
  },
  "autosave": {
    "backend": "indexeddb",
    "savedAt": 1793979742347,
    "version": 2,
    "pageCount": 1,
    "current": 0,
    "filled": 2,
    "names": [
      "sample-1.png",
      "sample-4.png"
    ],
    "hasDataUrl": true
  },
  "indexedDB": {
    "databases": [
      "figureplay"
    ],
    "hasFigureplay": true
  },
  "restoredState": {
    "layout": {
      "rows": 2,
      "cols": 3,
      "widthMm": 170,
      "aspectW": 4,
      "aspectH": 3,
      "colGap": 2,
      "rowGap": 2,
      "margin": 4,
      "bgMode": "white",
      "bgColor": "#ffffff",
      "borderOn": false,
      "borderWidth": 0.25,
      "borderColor": "#000000",
      "fit": "contain",
      "merges": [],
      "autoPad": true,
      "padTopMm": 0,
      "padRightMm": 0,
      "padBottomMm": 0,
      "padLeftMm": 0
    },
    "label": {
      "show": true,
      "scheme": "roman-paren",
      "start": 2,
      "order": "row",
      "skipEmpty": true,
      "position": "tl",
      "insetMm": 1.5,
      "offsetXmm": 0,
      "offsetYmm": 0,
      "fontFamily": "times",
      "fontSizePt": 12,
      "bold": false,
      "italic": false,
      "color": "#000000",
      "bg": "none",
      "bgColor": "#ffffff",
      "bgOpacity": 0.75
    },
    "export": {
      "filename": "fp-e2e-restore",
      "format": "jpg",
      "dpi": 150,
      "jpgQuality": 0.95,
      "transparent": false,
      "scope": "current",
      "saveAs": true,
      "vectorPdf": true,
      "trimPdf": false,
      "trimMarginMm": 0
    },
    "cells": [
      {
        "name": "sample-1.png",
        "hasData": true
      },
      {
        "name": "sample-4.png",
        "hasData": true
      },
      null,
      null,
      null,
      null
    ]
  }
}
```

## G. 合并单元格 — PASS

> 多选合并/拆分、2×3 首行跨 3 列、合并面板几何/编号位置、导出 SVG clip 几何无重叠 + PNG/PDF 尺寸与像素探针

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.1 契约：应用版本 >= 1.1（当前 1.5.1） | 1.5.1 |
| ✅ | v1.1 契约：API 方法齐全（mergePanels/splitPanel/setMultiSelect/applyTemplate/getTemplates/openPasteDialog/getPasteState） | [] |
| ✅ | v1.1 契约：getPreviewInfo 含 panels/merges/multiSelect/gridCellCount | [] |
| ✅ | v1.1 契约：getState().layout.merges 为数组 | null |
| ✅ | Ctrl/Shift 点击后 multiSelect = [0,1,2] | [0,1,2] |
| ✅ | #multi-controls 可见，合并按钮可用 | {"visible":true,"merge":{"present":true,"disabled":false,"text":"合并为跨列大图"},"split":null,"batchLabel":{"present":true,"disabled":true,"text":"批量编号…"},"cancel":{"present":true,"disabled":false,"text":"取消多选"},"countText":"已选 3 个子图","mergeHint":"可合并为 1 行 × 3 列的大图","selectedCount":3} |
| ✅ | 选中面板渲染 .is-selected（3 个） | 3 |
| ✅ | layout.merges = [{r:0,c:0,rs:1,cs:3}] | [{"r":0,"c":0,"rs":1,"cs":3}] |
| ✅ | 合并后面板数 cellCount=4、gridCellCount=6 | {"panelCount":4,"cellCount":4,"gridCellCount":6} |
| ✅ | 面板几何与独立复算一致（合并面板宽 = 3 格 + 2 间距） | [] |
| ✅ | 合并面板 rowSpan=1、colSpan=3、merged=true | {"index":0,"row":0,"col":0,"rowSpan":1,"colSpan":3,"x":5,"y":5,"w":160,"h":39,"merged":true} |
| ✅ | .cell-hit 只渲染 4 个面板且 data-index 为面板 anchor [0,3,4,5] | {"cellHitCount":4,"hitIndexes":[0,3,4,5]} |
| ✅ | 上传后 4 个面板都有图 | [0,3,4,5] |
| ✅ | 合并后编号数量/顺序与面板顺序复算一致 | {"actual":[{"cellIndex":0,"text":"(a)","groupId":null},{"cellIndex":3,"text":"(b)","groupId":null},{"cellIndex":4,"text":"(c)","groupId":null},{"cellIndex":5,"text":"(d)","groupId":null}],"expected":["0:(a)","3:(b)","4:(c)","5:(d)"]} |
| ✅ | 合并面板的编号位于面板左上区域（tl） | {"nx":0.02047695219516754,"ny":0.06676519834078275} |
| ✅ | 合并 SVG（2×3 首行跨 3 列）：文件生成（SVG，318062 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-v11-merge.svg","size":318062} |
| ✅ | 合并 SVG（2×3 首行跨 3 列）：Python 校验通过 | OK |
| ✅ | 导出 SVG 首条编号位于合并面板内左上 | {"label":{"text":"(a)","x":6.5,"y":8.6908,"anchor":"start"},"panel":{"index":0,"row":0,"col":0,"rowSpan":1,"colSpan":3,"x":5,"y":5,"w":160,"h":39,"merged":true}} |
| ✅ | 合并 PNG 300DPI：文件生成（PNG，276870 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-v11-merge.png","size":276870} |
| ✅ | 合并 PNG 300DPI：Python 校验通过 | OK |
| ✅ | 合并 PNG 像素尺寸 = mm/25.4×300 | {"api":[2008,1063],"expected":[2008,1063]} |
| ✅ | 合并 PDF 200DPI：文件生成（PDF，147516 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-v11-merge.pdf","size":147516} |
| ✅ | 合并 PDF 200DPI：Python 校验通过 | OK |
| ✅ | 合并 PDF 渲染图非空白且四角白底 | OK |
| ✅ | 选中合并面板后 #cell-split 拆分按钮可见 | {"present":true,"hidden":false} |
| ✅ | 拆分后面板数恢复为 6、merges 清空 | {"panelCount":6,"merges":[]} |
| ✅ | 拆分后已有 4 张图片保留 | [0,3,4,5] |
| ✅ | 拆分后 .cell-hit 恢复 6 个 | 6 |
| ✅ | L 形选择无法合并（按钮禁用或提示且 merges 不变） | {"disabled":true,"toast":"","merges":[]} |
| ✅ | API mergePanels 非法 L 形返回 {ok:false,error} | {"ok":false,"error":"所选子图需要组成完整矩形才能合并（当前不连续）"} |
| ✅ | API 合并多个有图面板未 force 返回 multiple-images | {"ok":false,"error":"multiple-images"} |
| ✅ | API mergePanels(force:true) 合并成功且面板数=5、merges 含 1×2 | {"ok":true,"panelCount":5,"merges":[{"r":1,"c":0,"rs":1,"cs":2}]} |
| ✅ | API splitPanel(3) 返回 ok:true 并恢复 6 面板 | true |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.1 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![G-01-merge-preview.png](<screens-v1.5.1/G-01-merge-preview.png>)

关键证据：

```json
{
  "v11Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingFields": [],
    "gridCellCount": 6,
    "cellCount": 6,
    "panelCount": 6,
    "hasLayoutMerges": true
  },
  "mergeState": {
    "merges": [
      {
        "r": 0,
        "c": 0,
        "rs": 1,
        "cs": 3
      }
    ],
    "panels": [
      {
        "index": 0,
        "row": 0,
        "col": 0,
        "rowSpan": 1,
        "colSpan": 3,
        "x": 5,
        "y": 5,
        "w": 160,
        "h": 39,
        "merged": true
      },
      {
        "index": 3,
        "row": 1,
        "col": 0,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 5,
        "y": 46,
        "w": 52,
        "h": 39,
        "merged": false
      },
      {
        "index": 4,
        "row": 1,
        "col": 1,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 59,
        "y": 46,
        "w": 52,
        "h": 39,
        "merged": false
      },
      {
        "index": 5,
        "row": 1,
        "col": 2,
        "rowSpan": 1,
        "colSpan": 1,
        "x": 113,
        "y": 46,
        "w": 52,
        "h": 39,
        "merged": false
      }
    ],
    "cellHitCount": 4
  }
}
```

## H. 快捷模板 — PASS

> 一键单栏/双栏 8 个模板：卡片齐全、应用后 rows/cols/widthMm/merges/fontSize 精确一致、已有图片重排/超限丢弃 toast

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.1 契约：应用版本 >= 1.1（当前 1.5.1） | 1.5.1 |
| ✅ | v1.1 契约：API 方法齐全（mergePanels/splitPanel/setMultiSelect/applyTemplate/getTemplates/openPasteDialog/getPasteState） | [] |
| ✅ | v1.1 契约：getPreviewInfo 含 panels/merges/multiSelect/gridCellCount | [] |
| ✅ | v1.1 契约：getState().layout.merges 为数组 | null |
| ✅ | getTemplates() API 返回 8 个模板 id | ["single-1","single-2v","single-15-2x2","double-2x3","double-3x2","double-2x2","double-1plus3","double-left-big"] |
| ✅ | 模板弹窗含 8 个模板卡片 | [{"template":"single-1","title":"单栏 · 单图85 mm 单栏 · 1 行 × 1 列"},{"template":"single-2v","title":"单栏 · 上下两图85 mm 单栏 · 2 行 × 1 列"},{"template":"single-15-2x2","title":"1.5 栏 · 2×2120 mm · 2 行 × 2 列"},{"template":"double-2x3","title":"双栏 · 2×3170 mm 双栏 · 2 行 × 3 列"},{"template":"double-3x2","title":"双栏 … |
| ✅ | single-1：模板应用后弹窗关闭 | {"dialogClosed":true,"cards":[{"template":"single-1","title":"单栏 · 单图85 mm 单栏 · 1 行 × 1 列"},{"template":"single-2v","title":"单栏 · 上下两图85 mm 单栏 · 2 行 × 1 列"},{"template":"single-15-2x2","title":"1.5 栏 · 2×2120 mm · 2 行 × 2 列"},{"template":"double-2x3","title":"双栏 · 2×3170 mm 双栏 · 2 行 × 3 列"},{"templa… |
| ✅ | single-1：rows/cols/widthMm 精确一致（1×1, 85mm） | {"rows":1,"cols":1,"widthMm":85} |
| ✅ | single-1：merges 精确一致 | [] |
| ✅ | single-1：fontSize = 8pt | 8 |
| ✅ | single-1：状态自洽（gridCellCount=1、面板数=1） | {"layout":{"rows":1,"cols":1,"widthMm":85},"merges":[],"panelDiffs":[]} |
| ✅ | single-2v：模板应用后弹窗关闭 | {"dialogClosed":true,"cards":[{"template":"single-1","title":"单栏 · 单图85 mm 单栏 · 1 行 × 1 列"},{"template":"single-2v","title":"单栏 · 上下两图85 mm 单栏 · 2 行 × 1 列"},{"template":"single-15-2x2","title":"1.5 栏 · 2×2120 mm · 2 行 × 2 列"},{"template":"double-2x3","title":"双栏 · 2×3170 mm 双栏 · 2 行 × 3 列"},{"templa… |
| ✅ | single-2v：rows/cols/widthMm 精确一致（2×1, 85mm） | {"rows":2,"cols":1,"widthMm":85} |
| ✅ | single-2v：merges 精确一致 | [] |
| ✅ | single-2v：fontSize = 8pt | 8 |
| ✅ | single-2v：状态自洽（gridCellCount=2、面板数=2） | {"layout":{"rows":2,"cols":1,"widthMm":85},"merges":[],"panelDiffs":[]} |
| ✅ | single-15-2x2：模板应用后弹窗关闭 | {"dialogClosed":true,"cards":[{"template":"single-1","title":"单栏 · 单图85 mm 单栏 · 1 行 × 1 列"},{"template":"single-2v","title":"单栏 · 上下两图85 mm 单栏 · 2 行 × 1 列"},{"template":"single-15-2x2","title":"1.5 栏 · 2×2120 mm · 2 行 × 2 列"},{"template":"double-2x3","title":"双栏 · 2×3170 mm 双栏 · 2 行 × 3 列"},{"templa… |
| ✅ | single-15-2x2：rows/cols/widthMm 精确一致（2×2, 120mm） | {"rows":2,"cols":2,"widthMm":120} |
| ✅ | single-15-2x2：merges 精确一致 | [] |
| ✅ | single-15-2x2：fontSize = 8.5pt | 8.5 |
| ✅ | single-15-2x2：状态自洽（gridCellCount=4、面板数=4） | {"layout":{"rows":2,"cols":2,"widthMm":120},"merges":[],"panelDiffs":[]} |
| ✅ | double-2x3：模板应用后弹窗关闭 | {"dialogClosed":true,"cards":[{"template":"single-1","title":"单栏 · 单图85 mm 单栏 · 1 行 × 1 列"},{"template":"single-2v","title":"单栏 · 上下两图85 mm 单栏 · 2 行 × 1 列"},{"template":"single-15-2x2","title":"1.5 栏 · 2×2120 mm · 2 行 × 2 列"},{"template":"double-2x3","title":"双栏 · 2×3170 mm 双栏 · 2 行 × 3 列"},{"templa… |
| ✅ | double-2x3：rows/cols/widthMm 精确一致（2×3, 170mm） | {"rows":2,"cols":3,"widthMm":170} |
| ✅ | double-2x3：merges 精确一致 | [] |
| ✅ | double-2x3：fontSize = 9pt | 9 |
| ✅ | double-2x3：状态自洽（gridCellCount=6、面板数=6） | {"layout":{"rows":2,"cols":3,"widthMm":170},"merges":[],"panelDiffs":[]} |
| ✅ | double-3x2：模板应用后弹窗关闭 | {"dialogClosed":true,"cards":[{"template":"single-1","title":"单栏 · 单图85 mm 单栏 · 1 行 × 1 列"},{"template":"single-2v","title":"单栏 · 上下两图85 mm 单栏 · 2 行 × 1 列"},{"template":"single-15-2x2","title":"1.5 栏 · 2×2120 mm · 2 行 × 2 列"},{"template":"double-2x3","title":"双栏 · 2×3170 mm 双栏 · 2 行 × 3 列"},{"templa… |
| ✅ | double-3x2：rows/cols/widthMm 精确一致（3×2, 170mm） | {"rows":3,"cols":2,"widthMm":170} |
| ✅ | double-3x2：merges 精确一致 | [] |
| ✅ | double-3x2：fontSize = 9pt | 9 |
| ✅ | double-3x2：状态自洽（gridCellCount=6、面板数=6） | {"layout":{"rows":3,"cols":2,"widthMm":170},"merges":[],"panelDiffs":[]} |
| ✅ | double-2x2：模板应用后弹窗关闭 | {"dialogClosed":true,"cards":[{"template":"single-1","title":"单栏 · 单图85 mm 单栏 · 1 行 × 1 列"},{"template":"single-2v","title":"单栏 · 上下两图85 mm 单栏 · 2 行 × 1 列"},{"template":"single-15-2x2","title":"1.5 栏 · 2×2120 mm · 2 行 × 2 列"},{"template":"double-2x3","title":"双栏 · 2×3170 mm 双栏 · 2 行 × 3 列"},{"templa… |
| ✅ | double-2x2：rows/cols/widthMm 精确一致（2×2, 170mm） | {"rows":2,"cols":2,"widthMm":170} |
| ✅ | double-2x2：merges 精确一致 | [] |
| ✅ | double-2x2：fontSize = 9pt | 9 |
| ✅ | double-2x2：状态自洽（gridCellCount=4、面板数=4） | {"layout":{"rows":2,"cols":2,"widthMm":170},"merges":[],"panelDiffs":[]} |
| ✅ | double-1plus3：模板应用后弹窗关闭 | {"dialogClosed":true,"cards":[{"template":"single-1","title":"单栏 · 单图85 mm 单栏 · 1 行 × 1 列"},{"template":"single-2v","title":"单栏 · 上下两图85 mm 单栏 · 2 行 × 1 列"},{"template":"single-15-2x2","title":"1.5 栏 · 2×2120 mm · 2 行 × 2 列"},{"template":"double-2x3","title":"双栏 · 2×3170 mm 双栏 · 2 行 × 3 列"},{"templa… |
| ✅ | double-1plus3：rows/cols/widthMm 精确一致（2×3, 170mm） | {"rows":2,"cols":3,"widthMm":170} |
| ✅ | double-1plus3：merges 精确一致 | [{"r":0,"c":0,"rs":1,"cs":3}] |
| ✅ | double-1plus3：fontSize = 9pt | 9 |
| ✅ | double-1plus3：状态自洽（gridCellCount=6、面板数=4） | {"layout":{"rows":2,"cols":3,"widthMm":170},"merges":[{"r":0,"c":0,"rs":1,"cs":3}],"panelDiffs":[]} |
| ✅ | double-1plus3：2×3 网格 + 首行跨 3 列 + 4 个面板 | {"rows":2,"cols":3,"merges":[{"r":0,"c":0,"rs":1,"cs":3}],"panelCount":4} |
| ✅ | double-left-big：模板应用后弹窗关闭 | {"dialogClosed":true,"cards":[{"template":"single-1","title":"单栏 · 单图85 mm 单栏 · 1 行 × 1 列"},{"template":"single-2v","title":"单栏 · 上下两图85 mm 单栏 · 2 行 × 1 列"},{"template":"single-15-2x2","title":"1.5 栏 · 2×2120 mm · 2 行 × 2 列"},{"template":"double-2x3","title":"双栏 · 2×3170 mm 双栏 · 2 行 × 3 列"},{"templa… |
| ✅ | double-left-big：rows/cols/widthMm 精确一致（2×3, 170mm） | {"rows":2,"cols":3,"widthMm":170} |
| ✅ | double-left-big：merges 精确一致 | [{"r":0,"c":0,"rs":2,"cs":1}] |
| ✅ | double-left-big：fontSize = 9pt | 9 |
| ✅ | double-left-big：状态自洽（gridCellCount=6、面板数=5） | {"layout":{"rows":2,"cols":3,"widthMm":170},"merges":[{"r":0,"c":0,"rs":2,"cs":1}],"panelDiffs":[]} |
| ✅ | double-left-big：2×3 网格 + 左列跨 2 行 + 5 个面板 | {"rows":2,"cols":3,"merges":[{"r":0,"c":0,"rs":2,"cs":1}],"panelCount":5} |
| ✅ | 单栏模板宽度明显小于双栏模板 | {"single":85,"double":170} |
| ✅ | single-15-2x2 宽度介于单栏与双栏之间 | {"single":85,"oneHalf":120,"double":170} |
| ✅ | 6 张图 → 4 面板模板：保留 4 张、丢弃 2 张并有 toast 提示 | {"filled":[0,3,4,5],"toast":"已套用模板：双栏 · 大图 + 三小图（图片较多，丢弃了 2 张）"} |
| ✅ | 重排后保留的图片为原顺序前 4 张（按面板顺序） | ["sample-1.png","sample-2.png","sample-3.png","sample-4.png"] |
| ✅ | 6 张图 → single-1（1 面板）：只保留 1 张图 | {"panelCount":1,"filled":[0]} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.1 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![H-01-templates-double-1plus3.png](<screens-v1.5.1/H-01-templates-double-1plus3.png>)

关键证据：

```json
{
  "v11Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingFields": [],
    "gridCellCount": 6,
    "cellCount": 6,
    "panelCount": 6,
    "hasLayoutMerges": true
  },
  "templatesApi": [
    {
      "id": "single-1",
      "name": "单栏 · 单图",
      "desc": "85 mm 单栏 · 1 行 × 1 列"
    },
    {
      "id": "single-2v",
      "name": "单栏 · 上下两图",
      "desc": "85 mm 单栏 · 2 行 × 1 列"
    },
    {
      "id": "single-15-2x2",
      "name": "1.5 栏 · 2×2",
      "desc": "120 mm · 2 行 × 2 列"
    },
    {
      "id": "double-2x3",
      "name": "双栏 · 2×3",
      "desc": "170 mm 双栏 · 2 行 × 3 列"
    },
    {
      "id": "double-3x2",
      "name": "双栏 · 3×2",
      "desc": "170 mm 双栏 · 3 行 × 2 列"
    },
    {
      "id": "double-2x2",
      "name": "双栏 · 2×2",
      "desc": "170 mm 双栏 · 2 行 × 2 列"
    },
    {
      "id": "double-1plus3",
      "name": "双栏 · 大图 + 三小图",
      "desc": "170 mm · 2×3，首行跨 3 列"
    },
    {
      "id": "double-left-big",
      "name": "双栏 · 左大图 + 右四图",
      "desc": "170 mm · 2×3，左列跨 2 行"
    }
  ],
  "template-single-1": {
    "rows": 1,
    "cols": 1,
    "widthMm": 85,
    "merges": [],
    "panelCount": 1,
    "gridCellCount": 1,
    "fontSize": 8
  },
  "template-single-2v": {
    "rows": 2,
    "cols": 1,
    "widthMm": 85,
    "merges": [],
    "panelCount": 2,
    "gridCellCount": 2,
    "fontSize": 8
  },
  "template-single-15-2x2": {
    "rows": 2,
    "cols": 2,
    "widthMm": 120,
    "merges": [],
    "panelCount": 4,
    "gridCellCount": 4,
    "fontSize": 8.5
  },
  "template-double-2x3": {
    "rows": 2,
    "cols": 3,
    "widthMm": 170,
    "merges": [],
    "panelCount": 6,
    "gridCellCount": 6,
    "fontSize": 9
  },
  "template-double-3x2": {
    "rows": 3,
    "cols": 2,
    "widthMm": 170,
    "merges": [],
    "panelCount": 6,
    "gridCellCount": 6,
    "fontSize": 9
  },
  "template-double-2x2": {
    "rows": 2,
    "cols": 2,
    "widthMm": 170,
    "merges": [],
    "panelCount": 4,
    "gridCellCount": 4,
    "fontSize": 9
  },
  "template-double-1plus3": {
    "rows": 2,
    "cols": 3,
    "widthMm": 170,
    "merges": [
      {
        "r": 0,
        "c": 0,
        "rs": 1,
        "cs": 3
      }
    ],
    "panelCount": 4,
    "gridCellCount": 6,
    "fontSize": 9
  },
  "template-double-left-big": {
    "rows": 2,
    "cols": 3,
    "widthMm": 170,
    "merges": [
      {
        "r": 0,
        "c": 0,
        "rs": 2,
        "cs": 1
      }
    ],
    "panelCount": 5,
    "gridCellCount": 6,
    "fontSize": 9
  }
}
```

## I. 批量编号 — PASS

> 多选面板批量套用编号（customLabel）：对话框控件/预览、应用到选中面板、预览与 SVG 一致、清除恢复自动

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.1 契约：应用版本 >= 1.1（当前 1.5.1） | 1.5.1 |
| ✅ | v1.1 契约：API 方法齐全（mergePanels/splitPanel/setMultiSelect/applyTemplate/getTemplates/openPasteDialog/getPasteState） | [] |
| ✅ | v1.1 契约：getPreviewInfo 含 panels/merges/multiSelect/gridCellCount | [] |
| ✅ | v1.1 契约：getState().layout.merges 为数组 | null |
| ✅ | API setMultiSelect([0,1,2]) 生效 | [0,1,2] |
| ✅ | 多选后 #multi-controls 可见且批量编号按钮可用 | {"visible":true,"merge":{"present":true,"disabled":false,"text":"合并为跨列大图"},"split":null,"batchLabel":{"present":true,"disabled":false,"text":"批量编号…"},"cancel":{"present":true,"disabled":false,"text":"取消多选"},"countText":"已选 3 个子图","mergeHint":"可合并为 1 行 × 3 列的大图","selectedCount":3} |
| ✅ | 批量编号弹窗打开且控件齐全 | {"open":true,"scheme":"alpha-paren","start":"1","preview":"#1(a)#2(b)#3(c)","applyDisabled":false} |
| ✅ | 批量编号预览包含起始编号 (ii) | #1(ii)#2(iii)#3(iv) |
| ✅ | 套用编号后弹窗自动关闭 | {"present":true,"open":false,"visible":false} |
| ✅ | 套用后选中面板 customLabel = (ii)/(iii)/(iv) | ["(ii)","(iii)","(iv)"] |
| ✅ | 套用后预览编号与状态一致 | {"actual":[{"cellIndex":0,"text":"(ii)","groupId":null},{"cellIndex":1,"text":"(iii)","groupId":null},{"cellIndex":2,"text":"(iv)","groupId":null}],"expected":[{"cellIndex":0,"text":"(ii)","row":0,"col":0},{"cellIndex":1,"text":"(iii)","row":0,"col":1},{"cellIndex":2,"text":"(iv)","row":0,"col":2}]} |
| ✅ | 套用后预览 label-text 文字一致 | ["(ii)","(iii)","(iv)"] |
| ✅ | 批量编号 SVG：文件生成（SVG，237378 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-v11-batch-label.svg","size":237378} |
| ✅ | 批量编号 SVG：Python 校验通过 | OK |
| ✅ | 清除自定义编号后弹窗自动关闭 | {"present":true,"open":false,"visible":false} |
| ✅ | 批量清除后 customLabel 为空 | ["","",""] |
| ✅ | 批量清除后恢复自动编号（(a)/(b)/(c)） | {"labels":[{"cellIndex":0,"text":"(a)","groupId":null},{"cellIndex":1,"text":"(b)","groupId":null},{"cellIndex":2,"text":"(c)","groupId":null}],"expected":[{"cellIndex":0,"text":"(a)","row":0,"col":0},{"cellIndex":1,"text":"(b)","row":0,"col":1},{"cellIndex":2,"text":"(c)","row":0,"col":2}]} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.1 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![I-01-batch-label-applied.png](<screens-v1.5.1/I-01-batch-label-applied.png>)

关键证据：

```json
{
  "v11Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingFields": [],
    "gridCellCount": 6,
    "cellCount": 6,
    "panelCount": 6,
    "hasLayoutMerges": true
  }
}
```

## J. 粘贴画布 — PASS

> 点击空面板打开 #paste-dialog（不再直接开文件选择器）；合成 paste/拖放/本地文件三种输入、确认填入、继续模式跳下一空面板、双击替换、Esc、全局 Ctrl+V、浏览器模式无剪贴板按钮

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.1 契约：应用版本 >= 1.1（当前 1.5.1） | 1.5.1 |
| ✅ | v1.1 契约：API 方法齐全（mergePanels/splitPanel/setMultiSelect/applyTemplate/getTemplates/openPasteDialog/getPasteState） | [] |
| ✅ | v1.1 契约：getPreviewInfo 含 panels/merges/multiSelect/gridCellCount | [] |
| ✅ | v1.1 契约：getState().layout.merges 为数组 | null |
| ✅ | 点击空面板打开 #paste-dialog（可见、含 #paste-zone） | {"open":true,"visible":true,"zonePresent":true} |
| ✅ | 点击空面板不再直接触发文件选择器 | 0 |
| ✅ | 浏览器模式：DOM 中不存在 #paste-read-clipboard | false |
| ✅ | 浏览器模式无剪贴板读取按钮 | 0 |
| ✅ | 初始状态确认按钮禁用/无预览 | {"confirmDisabled":true,"hasPreview":false} |
| ✅ | 默认勾选“确认后自动跳到下一个空子图” | true |
| ✅ | 合成 paste 后 #paste-preview-img 显示 data URL | data:image/png;base64,iVBORw0KGgoAAAANSU |
| ✅ | 粘贴预览图片尺寸 = 1200×900 | {"width":1200,"height":900} |
| ✅ | 确认后图片填入目标面板 0（sample-3.png / 1200×900） | {"name":"sample-3.png","width":1200,"height":900,"bytes":29424,"fit":"inherit","zoom":1,"offsetX":0,"offsetY":0,"rotation":0,"customLabel":"","hasData":true} |
| ✅ | 取消“继续”后确认会关闭弹窗（getPasteState.open=false） | {"open":false,"target":null,"hasPreview":false,"desktopBridge":false} |
| ✅ | 取消粘贴后目标面板仍为空 | null |
| ✅ | 本地文件按钮选择后出现预览（sample-1） | null |
| ✅ | 本地文件确认后填入面板 1（sample-1.png） | {"name":"sample-1.png","width":1200,"height":900,"bytes":28857,"fit":"inherit","zoom":1,"offsetX":0,"offsetY":0,"rotation":0,"customLabel":"","hasData":true} |
| ✅ | 拖放确认后填入面板 2（sample-4.png） | {"name":"sample-4.png","width":900,"height":1200,"bytes":32584,"fit":"inherit","zoom":1,"offsetX":0,"offsetY":0,"rotation":0,"customLabel":"","hasData":true} |
| ✅ | 新开弹窗默认勾选继续模式 | true |
| ✅ | 继续模式：确认后弹窗保持打开且无预览残留 | {"open":true,"hasPreview":false} |
| ✅ | 继续模式：自动切换到下一个空面板（target=4） | {"open":true,"target":4,"hasPreview":false,"desktopBridge":false} |
| ✅ | 继续模式：panel 3 已填入 sample-5.png | sample-5.png |
| ✅ | 双击已填面板打开替换弹窗 | {"open":true,"targetText":"目标：子图 #1 · 1 行 × 1 列 · 宽高比 1.33 : 1"} |
| ✅ | 替换模式弹窗标题含“替换” | 替换子图 #1 的图片 |
| ✅ | 双击/替换确认后替换为 sample-6.png | sample-6.png |
| ✅ | 替换确认后弹窗关闭 | null |
| ✅ | Esc 可关闭粘贴弹窗 | null |
| ✅ | 工具栏「粘贴图片」#btn-paste 打开粘贴弹窗 | opened |
| ✅ | 全局 Ctrl+V（弹窗关闭时）自动打开粘贴弹窗并显示预览 | {"open":true,"target":4} |
| ✅ | 全局 Ctrl+V 打开的目标为第一个空面板（4 或 5） | 4 |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.1 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![J-01-paste-preview.png](<screens-v1.5.1/J-01-paste-preview.png>)

关键证据：

```json
{
  "v11Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingFields": [],
    "gridCellCount": 6,
    "cellCount": 6,
    "panelCount": 6,
    "hasLayoutMerges": true
  }
}
```

## K. 桌面桥 — PASS

> mock window.chrome.webview：app-ready、打开弹窗自动 read-clipboard-image{requestId}、回包 clipboard-image{ok,dataUrl,sourceFormat:EMF} 后预览/填入；失败回包后 #paste-retry 重发新 requestId

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.1 契约：应用版本 >= 1.1（当前 1.5.1） | 1.5.1 |
| ✅ | v1.1 契约：API 方法齐全（mergePanels/splitPanel/setMultiSelect/applyTemplate/getTemplates/openPasteDialog/getPasteState） | [] |
| ✅ | v1.1 契约：getPreviewInfo 含 panels/merges/multiSelect/gridCellCount | [] |
| ✅ | v1.1 契约：getState().layout.merges 为数组 | null |
| ✅ | 桌面桥：应用启动后发送 app-ready 消息（含 version） | {"type":"app-ready","version":"1.5.1"} |
| ✅ | 桌面桥模式 getPasteState().desktopBridge = true | {"open":true,"target":0,"hasPreview":false,"desktopBridge":true} |
| ✅ | 桌面桥模式 #paste-read-clipboard 保留在 DOM 且可见 | {"present":true,"hidden":false,"visibleButtons":2} |
| ✅ | 打开粘贴弹窗自动向 host 发送 read-clipboard-image | {"type":"read-clipboard-image","requestId":"fp-2-mw5589s3"} |
| ✅ | read-clipboard-image 带非空 requestId | fp-2-mw5589s3 |
| ✅ | 成功回包后粘贴弹窗出现预览 data URL | data:image/jpeg;base64,/9j/4AAQSkZJRgABA |
| ✅ | 成功回包后预览图片尺寸 = 1600×1200（EMF 转换后尺寸） | {"width":1600,"height":1200} |
| ✅ | 成功回包后状态文本提示来自系统剪贴板 | 已从系统剪贴板读取（EMF → PNG） |
| ✅ | 桌面桥回包确认后填入面板 0（1600×1200） | {"name":"剪贴板图片.png","width":1600,"height":1200,"bytes":88320,"fit":"inherit","zoom":1,"offsetX":0,"offsetY":0,"rotation":0,"customLabel":"","hasData":true} |
| ✅ | 桌面桥确认后弹窗关闭（继续模式已取消） | null |
| ✅ | 打开第二个弹窗再次发送 read-clipboard-image | {"type":"read-clipboard-image","requestId":"fp-3-mw558a41"} |
| ✅ | 失败回包后显示错误/无图片提示 | 系统剪贴板中没有图片：可按 Ctrl+V、选择本地文件，或重新复制图窗 |
| ✅ | 失败回包后 #paste-retry 可用 | null |
| ✅ | #paste-retry 重发 read-clipboard-image 且 requestId 更新 | fp-4-mw558ah1 |
| ✅ | 重试成功后图片填入面板 1 | {"name":"剪贴板图片.png","width":1600,"height":1200,"bytes":88320,"fit":"inherit","zoom":1,"offsetX":0,"offsetY":0,"rotation":0,"customLabel":"","hasData":true} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.1 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![K-01-bridge-preview.png](<screens-v1.5.1/K-01-bridge-preview.png>)
- ![K-02-desktop-bridge-final.png](<screens-v1.5.1/K-02-desktop-bridge-final.png>)

关键证据：

```json
{
  "v11Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingFields": [],
    "gridCellCount": 6,
    "cellCount": 6,
    "panelCount": 6,
    "hasLayoutMerges": true
  }
}
```

## L. 高DPI布局 — PASS

> 1000×640 CSS 视口（150% 缩放/WebView2）三栏 grid、无横向溢出、预览可见；950 三栏；899 堆叠；1366×768 / 1440×900 复检

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | 1000×640：.app display = grid | grid |
| ✅ | 1000×640：grid 三列（实际 3 列） | {"tracks":["244px","460px","296px"],"gridTemplateColumns":"244px 460px 296px"} |
| ✅ | 1000×640：无横向溢出（scrollWidth 1000 <= 1001） | {"bodyScrollWidth":1000,"docScrollWidth":1000,"innerWidth":1000} |
| ✅ | 1000×640：预览 stage 可见（宽 460px） | {"x":244,"y":204,"w":460,"h":322,"visible":true} |
| ✅ | 1000×640：#figure-shell 宽 234px > 200 | {"x":357,"y":234,"w":234,"h":266,"visible":true} |
| ✅ | 1000×640：预览 SVG 可见 | {"x":357,"y":234,"w":234,"h":266,"visible":true} |
| ✅ | 1000×640：左右面板均可视（三栏未被堆叠） | {"left":{"x":0,"y":58,"w":244,"h":582,"visible":true},"right":{"x":704,"y":58,"w":296,"h":582,"visible":true}} |
| ✅ | 1000×640：三栏列宽为紧凑布局（244 / 1fr / 296） | ["244px","460px","296px"] |
| ✅ | 1000×640：页签栏可见且 3 个页签（新增多页 UI 不溢出） | {"tabs":[{"index":0,"text":"图 1· 0 图","active":true,"title":"图 1（双击重命名）"},{"index":1,"text":"图 2· 0 图","active":false,"title":"图 2（双击重命名）"},{"index":2,"text":"图 3· 0 图","active":false,"title":"图 3（双击重命名）"}],"pageBarRect":{"w":460,"h":38}} |
| ✅ | 1000×640：pageCount>1 时导出范围控件显示 | {"rowHidden":false,"rowVisible":true,"activeScope":"current","noteHidden":true,"noteText":""} |
| ✅ | 1000×640：3 个页签下仍无横向溢出 | {"bodyScrollWidth":1000,"innerWidth":1000} |
| ✅ | 950×640：.app display = grid | grid |
| ✅ | 950×640：grid 三列（实际 3 列） | {"tracks":["244px","410px","296px"],"gridTemplateColumns":"244px 410px 296px"} |
| ✅ | 950×640：无横向溢出（scrollWidth 950 <= 951） | {"bodyScrollWidth":950,"docScrollWidth":950,"innerWidth":950} |
| ✅ | 950×640：预览 stage 可见（宽 410px） | {"x":244,"y":263,"w":410,"h":263,"visible":true} |
| ✅ | 950×640：#figure-shell 宽 182px > 150 | {"x":358,"y":293,"w":182,"h":207,"visible":true} |
| ✅ | 950×640：预览 SVG 可见 | {"x":358,"y":293,"w":182,"h":207,"visible":true} |
| ✅ | 950×640：左右面板均可视（三栏未被堆叠） | {"left":{"x":0,"y":58,"w":244,"h":582,"visible":true},"right":{"x":654,"y":58,"w":296,"h":582,"visible":true}} |
| ✅ | 950×640：页签栏可换行且不造成横向溢出 | {"pageBarRect":{"w":410,"h":72},"scroll":950} |
| ✅ | 899×640（堆叠断点）：.app display = block | block |
| ✅ | 899×640（堆叠断点）：无横向溢出（scrollWidth 899 <= 900） | {"bodyScrollWidth":899,"docScrollWidth":899,"innerWidth":899} |
| ✅ | 899×640（堆叠断点）：预览 stage 可见（宽 899px） | {"x":0,"y":1260,"w":899,"h":331,"visible":true} |
| ✅ | 899×640（堆叠断点）：#figure-shell 宽 242px > 180 | {"x":328,"y":1290,"w":242,"h":275,"visible":true} |
| ✅ | 899×640（堆叠断点）：预览 SVG 可见 | {"x":328,"y":1290,"w":242,"h":275,"visible":true} |
| ✅ | 1366×768：.app display = grid | grid |
| ✅ | 1366×768：grid 三列（实际 3 列） | {"tracks":["276px","764px","326px"],"gridTemplateColumns":"276px 764px 326px"} |
| ✅ | 1366×768：无横向溢出（scrollWidth 1366 <= 1367） | {"bodyScrollWidth":1366,"docScrollWidth":1366,"innerWidth":1366} |
| ✅ | 1366×768：预览 stage 可见（宽 764px） | {"x":276,"y":208,"w":764,"h":446,"visible":true} |
| ✅ | 1366×768：#figure-shell 宽 344px > 250 | {"x":486,"y":238,"w":344,"h":390,"visible":true} |
| ✅ | 1366×768：预览 SVG 可见 | {"x":486,"y":238,"w":344,"h":390,"visible":true} |
| ✅ | 1366×768：左右面板均可视（三栏未被堆叠） | {"left":{"x":0,"y":58,"w":276,"h":710,"visible":true},"right":{"x":1040,"y":58,"w":326,"h":710,"visible":true}} |
| ✅ | 1440×900：.app display = grid | grid |
| ✅ | 1440×900：grid 三列（实际 3 列） | {"tracks":["276px","838px","326px"],"gridTemplateColumns":"276px 838px 326px"} |
| ✅ | 1440×900：无横向溢出（scrollWidth 1440 <= 1441） | {"bodyScrollWidth":1440,"docScrollWidth":1440,"innerWidth":1440} |
| ✅ | 1440×900：预览 stage 可见（宽 838px） | {"x":276,"y":175,"w":838,"h":611,"visible":true} |
| ✅ | 1440×900：#figure-shell 宽 489px > 250 | {"x":451,"y":205,"w":489,"h":555,"visible":true} |
| ✅ | 1440×900：预览 SVG 可见 | {"x":451,"y":205,"w":489,"h":555,"visible":true} |
| ✅ | 1440×900：左右面板均可视（三栏未被堆叠） | {"left":{"x":0,"y":58,"w":276,"h":842,"visible":true},"right":{"x":1114,"y":58,"w":326,"h":842,"visible":true}} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![L-01-layout-1000x640.png](<screens-v1.5.1/L-01-layout-1000x640.png>)

关键证据：

```json
{
  "layout-1000x640": {
    "innerWidth": 1000,
    "innerHeight": 640,
    "appDisplay": "grid",
    "gridTemplateColumns": "244px 460px 296px",
    "columnCount": 3,
    "columnTracks": [
      "244px",
      "460px",
      "296px"
    ],
    "bodyScrollWidth": 1000,
    "docScrollWidth": 1000,
    "app": {
      "x": 0,
      "y": 58,
      "w": 1000,
      "h": 582,
      "visible": true
    },
    "stage": {
      "x": 244,
      "y": 204,
      "w": 460,
      "h": 322,
      "visible": true
    },
    "shell": {
      "x": 357,
      "y": 234,
      "w": 234,
      "h": 266,
      "visible": true
    },
    "previewSvg": {
      "x": 357,
      "y": 234,
      "w": 234,
      "h": 266,
      "visible": true
    },
    "leftPanel": {
      "x": 0,
      "y": 58,
      "w": 244,
      "h": 582,
      "visible": true
    },
    "rightPanel": {
      "x": 704,
      "y": 58,
      "w": 296,
      "h": 582,
      "visible": true
    },
    "workspace": {
      "x": 244,
      "y": 58,
      "w": 460,
      "h": 582,
      "visible": true
    },
    "shellSizeCss": {
      "width": 234,
      "height": 266
    }
  },
  "layout-1000x640-pages": {
    "tabs": [
      {
        "index": 0,
        "text": "图 1· 0 图",
        "active": true,
        "title": "图 1（双击重命名）"
      },
      {
        "index": 1,
        "text": "图 2· 0 图",
        "active": false,
        "title": "图 2（双击重命名）"
      },
      {
        "index": 2,
        "text": "图 3· 0 图",
        "active": false,
        "title": "图 3（双击重命名）"
      }
    ],
    "pageBarRect": {
      "w": 460,
      "h": 38
    },
    "exportScope": {
      "rowHidden": false,
      "rowVisible": true,
      "activeScope": "current",
      "noteHidden": true,
      "noteText": ""
    }
  },
  "layout-950x640": {
    "innerWidth": 950,
    "innerHeight": 640,
    "appDisplay": "grid",
    "gridTemplateColumns": "244px 410px 296px",
    "columnCount": 3,
    "columnTracks": [
      "244px",
      "410px",
      "296px"
    ],
    "bodyScrollWidth": 950,
    "docScrollWidth": 950,
    "app": {
      "x": 0,
      "y": 58,
      "w": 950,
      "h": 582,
      "visible": true
    },
    "stage": {
      "x": 244,
      "y": 263,
      "w": 410,
      "h": 263,
      "visible": true
    },
    "shell": {
      "x": 358,
      "y": 293,
      "w": 182,
      "h": 207,
      "visible": true
    },
    "previewSvg": {
      "x": 358,
      "y": 293,
      "w": 182,
      "h": 207,
      "visible": true
    },
    "leftPanel": {
      "x": 0,
      "y": 58,
      "w": 244,
      "h": 582,
      "visible": true
    },
    "rightPanel": {
      "x": 654,
      "y": 58,
      "w": 296,
      "h": 582,
      "visible": true
    },
    "workspace": {
      "x": 244,
      "y": 58,
      "w": 410,
      "h": 582,
      "visible": true
    },
    "shellSizeCss": {
      "width": 182,
      "height": 207
    }
  },
  "layout-950x640-pages": {
    "pageBarRect": {
      "w": 410,
      "h": 72
    },
    "tabs": [
      {
        "index": 0,
        "text": "图 1· 0 图",
        "active": true,
        "title": "图 1（双击重命名）"
      },
      {
        "index": 1,
        "text": "图 2· 0 图",
        "active": false,
        "title": "图 2（双击重命名）"
      },
      {
        "index": 2,
        "text": "图 3· 0 图",
        "active": false,
        "title": "图 3（双击重命名）"
      }
    ]
  },
  "layout-899x640": {
    "innerWidth": 899,
    "innerHeight": 640,
    "appDisplay": "block",
    "gridTemplateColumns": "244px minmax(0px, 1fr) 296px",
    "columnCount": 4,
    "columnTracks": [
      "244px",
      "minmax(0px,",
      "1fr)",
      "296px"
    ],
    "bodyScrollWidth": 899,
    "docScrollWidth": 899,
    "app": {
      "x": 0,
      "y": 58,
      "w": 899,
      "h": 2588,
      "visible": true
    },
    "stage": {
      "x": 0,
      "y": 1260,
      "w": 899,
      "h": 331,
      "visible": true
    },
    "shell": {
      "x": 328,
      "y": 1290,
      "w": 242,
      "h": 275,
      "visible": tr…
```

## M. 多页工程 — PASS

> 页签/新建/复制/删除/双击改名；每页独立 layout/cells/label；API getPages/setPage/addPage/duplicatePage/deletePage/renamePage；自动保存 version 2 project 并 reload 恢复

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.2 契约：应用版本 >= 1.2（当前 1.5.1） | 1.5.1 |
| ✅ | v1.2 契约：API 方法齐全 | [] |
| ✅ | v1.2 契约：getPreviewInfo 含 pages/groups/canUndo/canRedo/pageIndex/pageCount/pageName | [] |
| ✅ | v1.2 契约：getState 含 pages/pageIndex/groups/canUndo/canRedo | [] |
| ✅ | 初始 pageCount=1、pageIndex=0 | {"pageCount":1,"pageIndex":0} |
| ✅ | 初始页签 1 个且 active | [{"index":0,"text":"图 1· 0 图","active":true,"title":"图 1（双击重命名）"}] |
| ✅ | 初始撤销/重做按钮禁用且历史为空 | {"history":{"canUndo":false,"canRedo":false,"undoCount":0,"redoCount":0},"addDisabled":false} |
| ✅ | getPages() 返回 1 页、filledCount=0 | [{"index":0,"name":"图 1","filledCount":0,"layout":{"rows":3,"cols":2,"widthMm":170,"aspectW":4,"aspectH":3,"colGap":2,"rowGap":2,"margin":0,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRig… |
| ✅ | 第 1 页设置生效（2×3、margin4、roman start2、2 图） | {"layout":{"rows":2,"cols":3,"widthMm":170,"aspectW":4,"aspectH":3,"colGap":2,"rowGap":2,"margin":4,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"… |
| ✅ | 点「新页」后 pageCount=2、当前页=1 | {"pageCount":2,"pageIndex":1} |
| ✅ | 页签 2 个且第 2 个 active | [{"index":0,"text":"图 1· 2 图","active":false,"title":"图 1（双击重命名）"},{"index":1,"text":"图 2· 0 图","active":true,"title":"图 2（双击重命名）"}] |
| ✅ | 新页复制布局/编号设置（2×3、margin4、roman start2） | {"layout":{"rows":2,"cols":3,"widthMm":170,"aspectW":4,"aspectH":3,"colGap":2,"rowGap":2,"margin":4,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"… |
| ✅ | 新页不复制图片（filledCount=0） | {"index":1,"name":"图 2","filledCount":0,"layout":{"rows":2,"cols":3,"widthMm":170,"aspectW":4,"aspectH":3,"colGap":2,"rowGap":2,"margin":4,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRigh… |
| ✅ | 切回第 1 页：2 图与 2×3 布局独立保留 | {"cells":2,"layout":{"rows":2,"cols":3,"widthMm":170,"aspectW":4,"aspectH":3,"colGap":2,"rowGap":2,"margin":4,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLe… |
| ✅ | 第 2 页布局独立（3×2） | {"rows":3,"cols":2,"widthMm":170,"aspectW":4,"aspectH":3,"colGap":2,"rowGap":2,"margin":4,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0} |
| ✅ | duplicatePage 后 pageCount=3、当前页=1 | {"pageCount":3,"pageIndex":1} |
| ✅ | 副本页复制 2 张图片 | {"filledCount":2,"cells":2} |
| ✅ | 副本页名称含「副本」 | 图 1 副本 |
| ✅ | API renamePage(1,"实验组") 生效 | null |
| ✅ | 双击页签 + prompt 改名生效 | null |
| ✅ | 删除当前页后 pageCount=2、当前页有效 | {"pageCount":2,"pageIndex":1} |
| ✅ | 删除的是当前页「图 B」 | {"before":["图 1","图 B","图 2"],"after":["图 1","图 2"]} |
| ✅ | 自动保存为 version 2 project（pages 数组、当前页 0） | {"version":2,"pages":2,"current":0} |
| ✅ | saved.project.pages[0].cells 含 2 张图 dataUrl | ["data:image/png;base64,iVBORw0K","data:image/png;base64,iVBORw0K"] |
| ✅ | reload 后恢复页数/当前页 | {"pageCount":2,"pageIndex":0} |
| ✅ | reload 后页面名称恢复 | {"before":["图 1","图 2"],"after":["图 1","图 2"]} |
| ✅ | reload 后当前页图片 dataUrl 完全恢复（预览 href 一致） | {"before":["0","1"],"after":["0","1"],"same":true} |
| ✅ | getPreviewInfo 含 pageIndex/pageCount/pageName/pages | {"pageName":"图 1","pages":[{"index":0,"name":"图 1","filledCount":2},{"index":1,"name":"图 2","filledCount":0}]} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.2 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingPreviewFields":[],"missingStateFields":[],"preview":{"pageIndex":0,"pageCount":1,"pageName":"图 1","pages":1,"groups":0,"canUndo":false,"canRedo":false},"statePageFields":{"pageIndex":0,"pageCount":1,"pages":1,"groups":0}}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![M-01-multi-page-tabs.png](<screens-v1.5.1/M-01-multi-page-tabs.png>)

关键证据：

```json
{
  "v12Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingPreviewFields": [],
    "missingStateFields": [],
    "preview": {
      "pageIndex": 0,
      "pageCount": 1,
      "pageName": "图 1",
      "pages": 1,
      "groups": 0,
      "canUndo": false,
      "canRedo": false
    },
    "statePageFields": {
      "pageIndex": 0,
      "pageCount": 1,
      "pages": 1,
      "groups": 0
    }
  },
  "autosave": {
    "backend": "indexeddb",
    "version": 2,
    "pageCount": 2,
    "current": 0,
    "pages": [
      {
        "name": "图 1",
        "filled": 2
      },
      {
        "name": "图 2",
        "filled": 0
      }
    ]
  }
}
```

## N. 撤销重做 — PASS

> 按钮/快捷键/API：布局、编号、上传、模板、分组、页增删的撤销重做；拖动缩放 500ms 合并；弹窗打开不触发；切页不入历史

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.2 契约：应用版本 >= 1.2（当前 1.5.1） | 1.5.1 |
| ✅ | v1.2 契约：API 方法齐全 | [] |
| ✅ | v1.2 契约：getPreviewInfo 含 pages/groups/canUndo/canRedo/pageIndex/pageCount/pageName | [] |
| ✅ | v1.2 契约：getState 含 pages/pageIndex/groups/canUndo/canRedo | [] |
| ✅ | 布局修改后 canUndo=true | {"canUndo":true,"canRedo":false,"undoCount":1,"redoCount":0} |
| ✅ | undo 回退布局到 3×2 | null |
| ✅ | undo 后 canRedo=true | {"canUndo":false,"canRedo":true,"undoCount":0,"redoCount":1} |
| ✅ | redo 恢复布局 2×3 | null |
| ✅ | Ctrl+Z 撤销编号方案 | null |
| ✅ | Ctrl+Shift+Z 重做编号方案 | null |
| ✅ | Ctrl+Y 重做编号方案 | null |
| ✅ | undo 撤销上传（图片数 0） | null |
| ✅ | redo 恢复上传（图片数 1） | null |
| ✅ | 连续 3 次偏移只产生 1 步历史 | {"before":3,"after":4} |
| ✅ | undo 一次性恢复偏移到 0 | 0 |
| ✅ | redo 恢复偏移 15mm | null |
| ✅ | 等待 >600ms 后 undo 撤销新建页 | null |
| ✅ | redo 重新加入新页 | null |
| ✅ | 页切换本身不入历史（undoCount 不变） | {"before":5,"after":5} |
| ✅ | undo 撤销模板应用 | {"now":{"rows":2,"cols":3,"widthMm":170,"aspectW":4,"aspectH":3,"colGap":2,"rowGap":2,"margin":0,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"bef… |
| ✅ | 粘贴弹窗打开时 Ctrl+Z 不触发撤销 | 4 |
| ✅ | 新操作后 redo 不可用 | {"canUndo":true,"canRedo":false,"undoCount":4,"redoCount":0} |
| ✅ | 分组创建可撤销 | {"before":1,"after":0} |
| ✅ | 分组创建可重做 | 1 |
| ✅ | 页改名可撤销 | {"before":"图 1","after":"图 1"} |
| ✅ | 页改名可重做 | 改名测试页 |
| ✅ | 文本输入框聚焦时 Ctrl+Z 不触发撤销 | 6 |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.2 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingPreviewFields":[],"missingStateFields":[],"preview":{"pageIndex":0,"pageCount":1,"pageName":"图 1","pages":1,"groups":0,"canUndo":false,"canRedo":false},"statePageFields":{"pageIndex":0,"pageCount":1,"pages":1,"groups":0}}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![N-01-undo-redo-final.png](<screens-v1.5.1/N-01-undo-redo-final.png>)

关键证据：

```json
{
  "v12Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingPreviewFields": [],
    "missingStateFields": [],
    "preview": {
      "pageIndex": 0,
      "pageCount": 1,
      "pageName": "图 1",
      "pages": 1,
      "groups": 0,
      "canUndo": false,
      "canRedo": false
    },
    "statePageFields": {
      "pageIndex": 0,
      "pageCount": 1,
      "pages": 1,
      "groups": 0
    }
  }
}
```

## O. 分组/多页导出/.fig — PASS

> 分组独立编号与虚线框（仅预览）、合并保留组、模板清理失效组；多页 PDF/ZIP 导出（API+UI）与 pdfinfo/zipfile 校验；桌面桥 .fig 导入与浏览器模式可读报错

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.2 契约：应用版本 >= 1.2（当前 1.5.1） | 1.5.1 |
| ✅ | v1.2 契约：API 方法齐全 | [] |
| ✅ | v1.2 契约：getPreviewInfo 含 pages/groups/canUndo/canRedo/pageIndex/pageCount/pageName | [] |
| ✅ | v1.2 契约：getState 含 pages/pageIndex/groups/canUndo/canRedo | [] |
| ✅ | 分组弹窗打开且默认值可用 | {"open":true,"name":"组 A","scheme":"alpha-paren","start":"1","preview":"#1(a)#3(b)","title":"创建子图分组"} |
| ✅ | 分组预览包含组内独立编号 (iii)/(iv) | #1(iii)#3(iv) |
| ✅ | UI 保存分组成功（1 组、名称/方案/起始正确） | [{"id":"group-4vrvgdi","name":"组 A","color":"#2563eb","scheme":"roman-paren","start":3,"panels":[0,2]}] |
| ✅ | 分组面板为 [0,2] | [0,2] |
| ✅ | 分组列表 UI 显示 1 个 chip 且预览出现组框 | {"count":1,"countText":"1 组","chips":[{"text":"组 A2 图选中编辑删除","name":"组 A","count":"2 图"}],"outlineCount":1,"nameCount":1} |
| ✅ | 分组编号：组内 (iii)(iv)、全局 (a)（空面板跳过） | {"actual":[{"cellIndex":0,"text":"(iii)","groupId":"group-4vrvgdi"},{"cellIndex":1,"text":"(a)","groupId":null},{"cellIndex":2,"text":"(iv)","groupId":"group-4vrvgdi"}],"expected":[{"cellIndex":0,"text":"(iii)","groupId":"group-4vrvgdi"},{"cellIndex":1,"text":"(a)","groupId":null},{"cellIndex":2,"te… |
| ✅ | 预览 label-text 与期望一致 | ["(iii)","(a)","(iv)"] |
| ✅ | 分组 SVG（导出不含组框）：文件生成（SVG，236444 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-v12-groups.svg","size":236444} |
| ✅ | 分组 SVG（导出不含组框）：Python 校验通过 | OK |
| ✅ | 导出 SVG 不含预览专用组框元素（group-outline/group-name） | {"hasGroupOutline":false,"hasGroupName":false} |
| ✅ | updateGroup 修改组方案后编号更新（1./2.） | {"expected":[{"cellIndex":0,"text":"1.","groupId":"group-4vrvgdi"},{"cellIndex":1,"text":"(a)","groupId":null},{"cellIndex":2,"text":"2.","groupId":"group-4vrvgdi"}],"actual":[{"cellIndex":0,"text":"1.","groupId":"group-4vrvgdi"},{"cellIndex":1,"text":"(a)","groupId":null},{"cellIndex":2,"text":"2."… |
| ✅ | createGroup(组 B, 面板 1) 后组 B 编号为 (e) | [{"cellIndex":0,"text":"1.","groupId":"group-4vrvgdi"},{"cellIndex":1,"text":"(e)","groupId":"group-sdbs5xl"},{"cellIndex":2,"text":"2.","groupId":"group-4vrvgdi"}] |
| ✅ | deleteGroup 删除组 B 后恢复全局编号 (a) | [{"id":"group-4vrvgdi","name":"组 A","color":"#2563eb","scheme":"number-dot","start":1,"panels":[0,2]}] |
| ✅ | 合并同组面板后锚点保留该组 | {"merge":true,"groups":[{"id":"group-hihks2m","name":"合并组","color":"#2563eb","scheme":"number-paren","start":1,"panels":[0]}]} |
| ✅ | 创建待清理分组成功 | {"ok":true,"group":{"id":"group-e1bap85","name":"待清理组","color":"#db2777","scheme":"alpha-paren","start":1,"panels":[3]},"info":{"geom":{"rows":2,"cols":2,"widthMm":170,"heightMm":128,"cellW":84,"cellH":63,"panelCount":4},"cells":[{"index":0,"row":0,"col":0,"rowSpan":1,"colSpan":1,"x":0,"y":0,"w":84,… |
| ✅ | 模板切换到 1 面板后失效分组被清理 | [] |
| ✅ | pageCount>1 时显示导出范围控件 | {"rowHidden":false,"rowVisible":true,"activeScope":"current","noteHidden":true,"noteText":""} |
| ✅ | 切换「全部页」后 scope=all 且有提示文案 | {"scopeAll":{"rowHidden":false,"rowVisible":true,"activeScope":"all","noteHidden":false,"noteText":"全部 2 页将分别导出并打包为 ZIP 下载。"},"export":{"filename":"figure","format":"png","dpi":300,"jpgQuality":0.95,"transparent":false,"scope":"all","saveAs":true,"vectorPdf":true,"trimPdf":false,"trimMarginMm":0}} |
| ✅ | 多页 PDF：pageCount=2 且文件生成 | {"pageCount":2,"size":58223} |
| ✅ | 多页 PDF：pdfinfo 页数=2、渲染 2 页、MediaBox 正确 | OK |
| ✅ | 多页 PDF：页数来源 pdfinfo 且 =2 | {"source":"pdfinfo","pdfinfoPages":2,"renderPageCount":2} |
| ✅ | 多页 PNG ZIP：2 个条目且均为可解码 PNG | OK |
| ✅ | 多页 PNG ZIP：条目命名 -p01/-p02、尺寸=mm/25.4×150 | ["fp-v12-png-p01.png","fp-v12-png-p02.png"] |
| ✅ | 多页 SVG ZIP：2 个条目且均为合法 SVG 且含 label-text | OK |
| ✅ | 多页 JPG ZIP：2 个条目且均可解码 | OK |
| ✅ | UI 全页导出 PDF：下载成功、文件名 .pdf、页数=2 | {"filename":"fp-v12-ui.pdf","size":71103,"verifier":"OK"} |
| ✅ | UI 全页导出 PNG：下载 ZIP、2 个条目且可解码 | {"filename":"fp-v12-uipng-pages.zip","size":110145,"verifier":"OK"} |
| ✅ | 上传 .fig 后 app 向桌面 host 发送 import-fig 请求 | {"type":"import-fig","requestId":"fig-3-mw558s1x","filename":"mock-figure.fig","base64":"TUFUTEFCIDUuMCBNQVQtZmlsZSwgUGxhdGZvcm06IFBDV0lONjQsIENyZWF0ZWQgYnk6IEZpZ3VyZVBsYXkgRTJFIG1vY2sgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA… |
| ✅ | import-fig 请求含 requestId/filename/base64 | {"requestId":"fig-3-mw558s1x","filename":"mock-figure.fig","base64Length":2828} |
| ✅ | 桌面桥回包后 .fig 成功插入（cell.name 变为 .png） | {"name":"mock-figure.png","width":1200,"height":900,"bytes":2119,"fit":"inherit","zoom":1,"offsetX":0,"offsetY":0,"rotation":0,"customLabel":"","hasData":true} |
| ✅ | .fig 导入结果尺寸/数据正确（1200×900） | {"w":1200,"h":900} |
| ✅ | .fig 导入后预览图片 dataURL 与回包一致 | {"hrefLength":38498,"expectedLength":38498} |
| ✅ | 浏览器模式上传 .fig 给出可读错误提示（无 webview） | {"toast":"无法读取「browser-mode.fig」：读取 .fig 需要桌面版并安装 MATLAB；请在 MATLAB 中复制图窗后粘贴，或另存为图片","imageCount":0} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.2 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingPreviewFields":[],"missingStateFields":[],"preview":{"pageIndex":0,"pageCount":1,"pageName":"图 1","pages":1,"groups":0,"canUndo":false,"canRedo":false},"statePageFields":{"pageIndex":0,"pageCount":1,"pages":1,"groups":0}}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![O-01-multipage-export.png](<screens-v1.5.1/O-01-multipage-export.png>)
- ![O-02-fig-import.png](<screens-v1.5.1/O-02-fig-import.png>)

关键证据：

```json
{
  "v12Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingPreviewFields": [],
    "missingStateFields": [],
    "preview": {
      "pageIndex": 0,
      "pageCount": 1,
      "pageName": "图 1",
      "pages": 1,
      "groups": 0,
      "canUndo": false,
      "canRedo": false
    },
    "statePageFields": {
      "pageIndex": 0,
      "pageCount": 1,
      "pages": 1,
      "groups": 0
    }
  }
}
```

## P. 网格自定义 — PASS

> 行列输入 max=500；8×8、1×20、50×50=2500 可用；100×100 超限 toast 且保持旧布局；100×1 允许；600 行夹取到 500；1000×640 无横向溢出

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.3 契约：应用版本 >= 1.3（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3 契约：API 方法齐全（setExportOptions/setLayoutOptions/setLabelConfig/getPadInfo/getLabelBoxes/getCropBox/getVectorStatus/exportVectorPdfBase64） | [] |
| ✅ | v1.3 契约：state.export 含 saveAs/vectorPdf/trimPdf/trimMarginMm | [] |
| ✅ | v1.3 契约：state.layout 含 autoPad/padTopMm/padRightMm/padBottomMm/padLeftMm | [] |
| ✅ | v1.3 契约：行/列输入 max=500 | {"rowsMax":"500","colsMax":"500"} |
| ✅ | v1.3 契约：保存位置行默认勾选 | {"rowVisible":true,"checked":true,"saveAs":true} |
| ✅ | v1.3 契约：PDF 裁剪/矢量 PDF 控件存在 | {"trimRow":true,"trimToggle":true,"trimMargin":true,"vectorRow":true} |
| ✅ | v1.3 契约：滑块数字输入存在（cell-zoom-num/jpg-quality-num/label-bg-opacity-num） | [{"present":true,"min":"20","max":"400","step":"1","value":"100","rangePresent":true,"rangeValue":"100"},{"present":true,"min":"60","max":"100","step":"1","value":"95","rangePresent":true,"rangeValue":"95"},{"present":true,"min":"0","max":"100","step":"1","value":"75","rangePresent":true,"rangeValue… |
| ✅ | 行列输入 min=1 / max=500 | {"rows":["1","500"],"cols":["1","500"]} |
| ✅ | 8×8=64 生效（layout/gridCellCount/panelCount） | {"layout":{"rows":8,"cols":8,"margin":0,"autoPad":true,"colGap":2,"rowGap":2},"gridCellCount":64,"panelCount":64} |
| ✅ | 8×8 时输入框同步为 8 | {"rows":"8","cols":"8"} |
| ✅ | 1×20=20 生效 | {"layout":{"rows":1,"cols":20,"margin":0,"autoPad":true,"colGap":2,"rowGap":2},"gridCellCount":20} |
| ✅ | 50×50=2500 生效（单页上限） | {"layout":{"rows":50,"cols":50,"margin":0,"autoPad":true,"colGap":2,"rowGap":2},"gridCellCount":2500,"panelCount":2500} |
| ✅ | 50×50 几何合法（cellW/cellH>0、stage 可见） | {"cellW":1.44,"cellH":1.08,"stage":{"visible":true,"w":838,"h":611}} |
| ✅ | 1000×640 + 50×50：无横向溢出且 stage 可见 | {"body":1000,"doc":1000,"client":1000,"inner":1000,"stage":{"w":460,"h":322}} |
| ✅ | 100×100=10000 被拒：toast 提示 2500 格 | {"visible":true,"text":"单页最多 2500 个子图格（当前 100 × 100 = 10000），请减小行列数"} |
| ✅ | 100×100 被拒后保持旧布局 50×50 | {"before":{"rows":50,"cols":50,"margin":0,"autoPad":true,"colGap":2,"rowGap":2},"after":{"rows":50,"cols":50,"margin":0,"autoPad":true,"colGap":2,"rowGap":2}} |
| ✅ | 超限后行列输入恢复为合法值 50/50 | {"rows":"50","cols":"50"} |
| ✅ | 100×1=100 可生效（仅总量超 2500 才拒绝） | {"layout":{"rows":100,"cols":1,"margin":0,"autoPad":true,"colGap":2,"rowGap":2},"gridCellCount":100} |
| ✅ | API 传 600 行夹取到 500（max=500） | {"layout":{"rows":500,"cols":1,"margin":0,"autoPad":true,"colGap":2,"rowGap":2},"rowsInput":"500"} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.3 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingExportFields":[],"missingLayoutFields":[],"exportValues":{"saveAs":true,"vectorPdf":true,"trimPdf":false,"trimMarginMm":0},"layoutValues":{"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"ui":{"rowsInput":{"max":"500","min":"1","value":"3"},"colsInput":{"max":"500","min":"1","value":"2"},"saveAsRow":true,"saveAsChecked":true,"pdfTrimRowExists":true,"pdfTrimToggleExists":true,"pdfTrimMarginExists":true,"vec…

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![P-01-grid-custom-8x8.png](<screens-v1.5.1/P-01-grid-custom-8x8.png>)
- ![P-02-grid-1000x640.png](<screens-v1.5.1/P-02-grid-1000x640.png>)

关键证据：

```json
{
  "v13Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingExportFields": [],
    "missingLayoutFields": [],
    "exportValues": {
      "saveAs": true,
      "vectorPdf": true,
      "trimPdf": false,
      "trimMarginMm": 0
    },
    "layoutValues": {
      "autoPad": true,
      "padTopMm": 0,
      "padRightMm": 0,
      "padBottomMm": 0,
      "padLeftMm": 0
    },
    "ui": {
      "rowsInput": {
        "max": "500",
        "min": "1",
        "value": "3"
      },
      "colsInput": {
        "max": "500",
        "min": "1",
        "value": "2"
      },
      "saveAsRow": true,
      "saveAsChecked": true,
      "pdfTrimRowExists": true,
      "pdfTrimToggleExists": true,
      "pdfTrimMarginExists": true,
      "vectorPdfRowExists": true,
      "autoPadToggleChecked": true,
      "padManualHidden": true,
      "numberInputs": [
        {
          "present": true,
          "min": "20",
          "max": "400",
          "step": "1",
          "value": "100",
          "rangePresent": true,
          "rangeValue": "100"
        },
        {
          "present": true,
          "min": "60",
          "max": "100",
          "step": "1",
          "value": "95",
          "rangePresent": true,
          "rangeValue": "95"
        },
        {
          "present": true,
          "min": "0",
          "max": "100",
          "step": "1",
          "value": "75",
          "rangePresent": true,
          "rangeValue": "75"
        }
      ]
    }
  },
  "grid-1000x640-50x50": {
    "body": 1000,
    "doc": 1000,
    "client": 1000,
    "inner": 1000,
    "stage": {
      "w": 460,
      "h": 322
    }
  },
  "gridSummary": {
    "accepted": [
      "8x8",
      "1x20",
      "50x50",
      "100x1"
    ],
    "rejected": "100x100（10000 > 2500）",
    "clamped": "600 rows -> 500"
  }
}
```

## Q. 导出保存位置 — PASS

> #save-as-row/#save-as-toggle 默认勾选并映射 state.export.saveAs；fake showSaveFilePicker 验证 picker→write/close；AbortError 无头自动回退下载；无 picker 直接下载不卡住；API 导出不调用 picker

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.3 契约：应用版本 >= 1.3（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3 契约：API 方法齐全（setExportOptions/setLayoutOptions/setLabelConfig/getPadInfo/getLabelBoxes/getCropBox/getVectorStatus/exportVectorPdfBase64） | [] |
| ✅ | v1.3 契约：state.export 含 saveAs/vectorPdf/trimPdf/trimMarginMm | [] |
| ✅ | v1.3 契约：state.layout 含 autoPad/padTopMm/padRightMm/padBottomMm/padLeftMm | [] |
| ✅ | v1.3 契约：行/列输入 max=500 | {"rowsMax":"500","colsMax":"500"} |
| ✅ | v1.3 契约：保存位置行默认勾选 | {"rowVisible":true,"checked":true,"saveAs":true} |
| ✅ | v1.3 契约：PDF 裁剪/矢量 PDF 控件存在 | {"trimRow":true,"trimToggle":true,"trimMargin":true,"vectorRow":true} |
| ✅ | v1.3 契约：滑块数字输入存在（cell-zoom-num/jpg-quality-num/label-bg-opacity-num） | [{"present":true,"min":"20","max":"400","step":"1","value":"100","rangePresent":true,"rangeValue":"100"},{"present":true,"min":"60","max":"100","step":"1","value":"95","rangePresent":true,"rangeValue":"95"},{"present":true,"min":"0","max":"100","step":"1","value":"75","rangePresent":true,"rangeValue… |
| ✅ | #save-as-row 可见、默认勾选且 state.export.saveAs=true | {"ui":{"saveAsRowVisible":true,"saveAsChecked":true,"pdfTrimRowVisible":false,"pdfTrimChecked":false,"pdfTrimMarginRowVisible":false,"pdfTrimMargin":{"value":"0","min":"0","max":"20","step":"0.5"},"pdfTrimSafetyHintVisible":false,"pdfTrimSafetyHint":"0 mm 会保留约 1 mm 的防裁字安全边距，避免底部编号边缘被裁掉；需要更紧可先试 1 mm … |
| ✅ | setExportOptions({saveAs:false}) 同步状态与勾选框 | {"api":{"saveAs":false,"vectorPdf":true,"trimPdf":false,"trimMarginMm":0,"scope":"current","dpi":300,"format":"png"},"ui":false} |
| ✅ | setExportOptions({saveAs:true}) 恢复勾选 | null |
| ✅ | 点导出时调用 fake showSaveFilePicker 一次 | {"pickerInvocations":1} |
| ✅ | picker suggestedName 使用当前文件名 + .png | fp-v13-save.png |
| ✅ | picker types 声明 image/png + .png | {"description":"PNG","accept":{"image/png":[".png"]}} |
| ✅ | fake handle 写入 PNG 数据（size/type/头字节） | {"size":270817,"type":"image/png","head":[137,80,78,71,13,10,26,10]} |
| ✅ | fake handle 关闭（close）且写入文件即成功、未触发下载 | {"closes":1,"writes":1,"downloadCount":0} |
| ✅ | 保存到所选位置的状态/提示可读 | {"status":"已保存到 fp-v13-save.png（264.5 KB，99 ms）","toast":"已保存到所选位置：fp-v13-save.png"} |
| ✅ | fake picker 抛 AbortError 时自动回退下载（无头环境） | {"pickerInvocations":1,"filename":"fp-v13-save.png","size":270817,"verifier":"OK"} |
| ✅ | fake 环境无 window.showSaveFilePicker | null |
| ✅ | 无 picker 时直接下载且不卡住（文件名 .png） | {"filename":"fp-v13-save.png","size":270817} |
| ✅ | API exportBase64 返回 base64 且不调用 showSaveFilePicker | {"filename":"fp-v13-api.png","base64Length":150452} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.3 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingExportFields":[],"missingLayoutFields":[],"exportValues":{"saveAs":true,"vectorPdf":true,"trimPdf":false,"trimMarginMm":0},"layoutValues":{"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"ui":{"rowsInput":{"max":"500","min":"1","value":"3"},"colsInput":{"max":"500","min":"1","value":"2"},"saveAsRow":true,"saveAsChecked":true,"pdfTrimRowExists":true,"pdfTrimToggleExists":true,"pdfTrimMarginExists":true,"vec…

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![Q-01-save-location.png](<screens-v1.5.1/Q-01-save-location.png>)

关键证据：

```json
{
  "v13Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingExportFields": [],
    "missingLayoutFields": [],
    "exportValues": {
      "saveAs": true,
      "vectorPdf": true,
      "trimPdf": false,
      "trimMarginMm": 0
    },
    "layoutValues": {
      "autoPad": true,
      "padTopMm": 0,
      "padRightMm": 0,
      "padBottomMm": 0,
      "padLeftMm": 0
    },
    "ui": {
      "rowsInput": {
        "max": "500",
        "min": "1",
        "value": "3"
      },
      "colsInput": {
        "max": "500",
        "min": "1",
        "value": "2"
      },
      "saveAsRow": true,
      "saveAsChecked": true,
      "pdfTrimRowExists": true,
      "pdfTrimToggleExists": true,
      "pdfTrimMarginExists": true,
      "vectorPdfRowExists": true,
      "autoPadToggleChecked": true,
      "padManualHidden": true,
      "numberInputs": [
        {
          "present": true,
          "min": "20",
          "max": "400",
          "step": "1",
          "value": "100",
          "rangePresent": true,
          "rangeValue": "100"
        },
        {
          "present": true,
          "min": "60",
          "max": "100",
          "step": "1",
          "value": "95",
          "rangePresent": true,
          "rangeValue": "95"
        },
        {
          "present": true,
          "min": "0",
          "max": "100",
          "step": "1",
          "value": "75",
          "rangePresent": true,
          "rangeValue": "75"
        }
      ]
    }
  }
}
```

## R. 编号越界自动加页距 — PASS

> 默认 autoPad=true；编号 bc+offsetY 12mm 后 getPadInfo().bottom>0、页面变高、getLabelBoxes 全部在页内；可关闭为 0；手动 pad 可填；SVG/PDF 导出尺寸含页距

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.3 契约：应用版本 >= 1.3（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3 契约：API 方法齐全（setExportOptions/setLayoutOptions/setLabelConfig/getPadInfo/getLabelBoxes/getCropBox/getVectorStatus/exportVectorPdfBase64） | [] |
| ✅ | v1.3 契约：state.export 含 saveAs/vectorPdf/trimPdf/trimMarginMm | [] |
| ✅ | v1.3 契约：state.layout 含 autoPad/padTopMm/padRightMm/padBottomMm/padLeftMm | [] |
| ✅ | v1.3 契约：行/列输入 max=500 | {"rowsMax":"500","colsMax":"500"} |
| ✅ | v1.3 契约：保存位置行默认勾选 | {"rowVisible":true,"checked":true,"saveAs":true} |
| ✅ | v1.3 契约：PDF 裁剪/矢量 PDF 控件存在 | {"trimRow":true,"trimToggle":true,"trimMargin":true,"vectorRow":true} |
| ✅ | v1.3 契约：滑块数字输入存在（cell-zoom-num/jpg-quality-num/label-bg-opacity-num） | [{"present":true,"min":"20","max":"400","step":"1","value":"100","rangePresent":true,"rangeValue":"100"},{"present":true,"min":"60","max":"100","step":"1","value":"95","rangePresent":true,"rangeValue":"95"},{"present":true,"min":"0","max":"100","step":"1","value":"75","rangePresent":true,"rangeValue… |
| ✅ | 默认 autoPad=true 且无额外页距 | {"top":0,"right":0,"bottom":0,"left":0,"autoPad":true,"pageWidthMm":170,"pageHeightMm":127.5,"baseWidthMm":170,"baseHeightMm":127.5} |
| ✅ | 无页距时 pageHeight=baseHeight | {"pageHeight":127.5,"baseHeight":127.5} |
| ✅ | 编号越界后自动加底部页距（bottom>0） | {"top":0,"right":0,"bottom":11.4,"left":0,"autoPad":true,"pageWidthMm":170,"pageHeightMm":138.9,"baseWidthMm":170,"baseHeightMm":127.5} |
| ✅ | 页面高度增大（= baseHeight + 页距） | {"before":127.5,"after":138.9,"base":127.5,"pads":{"top":0,"right":0,"bottom":11.4,"left":0,"autoPad":true,"pageWidthMm":170,"pageHeightMm":138.9,"baseWidthMm":170,"baseHeightMm":127.5}} |
| ✅ | getLabelBoxes 所有 box 在页面内（底 ≤ 页高、左右在页内） | {"geom":{"w":170,"h":138.9},"boxes":[{"x":82.53959204101562,"y":134.82500000000002,"w":4.92081591796875,"h":3.4924999999999997,"r":0.79375}]} |
| ✅ | 页距读数与自动页距勾选同步 | {"readout":"额外页距：上 0 / 右 0 / 下 11.4 / 左 0 mm","checked":true,"bottom":11.4} |
| ✅ | 关闭 autoPad 后四边页距=0 且页面回退 | {"pads":{"top":0,"right":0,"bottom":0,"left":0,"autoPad":false,"pageWidthMm":170,"pageHeightMm":127.5,"baseWidthMm":170,"baseHeightMm":127.5},"height":127.5,"base":127.5} |
| ✅ | 关闭 autoPad 后手动页距输入可见、勾选框取消 | {"rowsInput":"1","colsInput":"1","rowsMin":"1","rowsMax":"500","colsMin":"1","colsMax":"500","colGapInput":"2","rowGapInput":"2","colGapMin":"-50","colGapMax":"80","rowGapMin":"-50","rowGapMax":"80","layout":{"rows":1,"cols":1,"margin":0,"autoPad":false,"colGap":2,"rowGap":2},"geom":{"rows":1,"cols"… |
| ✅ | 手动 padBottomMm=15 生效 | {"pads":{"top":0,"right":0,"bottom":15,"left":0,"autoPad":false,"pageWidthMm":170,"pageHeightMm":142.5,"baseWidthMm":170,"baseHeightMm":127.5},"height":142.5,"base":127.5} |
| ✅ | 手动输入 #pad-bottom=20 生效（页面高度同步） | {"pads":{"top":0,"right":0,"bottom":20,"left":0,"autoPad":false,"pageWidthMm":170,"pageHeightMm":147.5,"baseWidthMm":170,"baseHeightMm":127.5},"height":147.5,"base":127.5} |
| ✅ | 重新启用 autoPad 后自动页距恢复 | {"pads":{"top":0,"right":0,"bottom":11.4,"left":0,"autoPad":true,"pageWidthMm":170,"pageHeightMm":138.9,"baseWidthMm":170,"baseHeightMm":127.5},"height":138.9,"base":127.5} |
| ✅ | SVG 导出尺寸包含页距（mm 与当前 geom 一致） | OK |
| ✅ | PDF 导出页面尺寸包含页距（MediaBox=当前 geom） | OK |
| ✅ | 自动页距 PDF 页数=1（pdfinfo） | 1 |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.3 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingExportFields":[],"missingLayoutFields":[],"exportValues":{"saveAs":true,"vectorPdf":true,"trimPdf":false,"trimMarginMm":0},"layoutValues":{"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"ui":{"rowsInput":{"max":"500","min":"1","value":"3"},"colsInput":{"max":"500","min":"1","value":"2"},"saveAsRow":true,"saveAsChecked":true,"pdfTrimRowExists":true,"pdfTrimToggleExists":true,"pdfTrimMarginExists":true,"vec…

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![R-01-auto-pad.png](<screens-v1.5.1/R-01-auto-pad.png>)

关键证据：

```json
{
  "v13Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingExportFields": [],
    "missingLayoutFields": [],
    "exportValues": {
      "saveAs": true,
      "vectorPdf": true,
      "trimPdf": false,
      "trimMarginMm": 0
    },
    "layoutValues": {
      "autoPad": true,
      "padTopMm": 0,
      "padRightMm": 0,
      "padBottomMm": 0,
      "padLeftMm": 0
    },
    "ui": {
      "rowsInput": {
        "max": "500",
        "min": "1",
        "value": "3"
      },
      "colsInput": {
        "max": "500",
        "min": "1",
        "value": "2"
      },
      "saveAsRow": true,
      "saveAsChecked": true,
      "pdfTrimRowExists": true,
      "pdfTrimToggleExists": true,
      "pdfTrimMarginExists": true,
      "vectorPdfRowExists": true,
      "autoPadToggleChecked": true,
      "padManualHidden": true,
      "numberInputs": [
        {
          "present": true,
          "min": "20",
          "max": "400",
          "step": "1",
          "value": "100",
          "rangePresent": true,
          "rangeValue": "100"
        },
        {
          "present": true,
          "min": "60",
          "max": "100",
          "step": "1",
          "value": "95",
          "rangePresent": true,
          "rangeValue": "95"
        },
        {
          "present": true,
          "min": "0",
          "max": "100",
          "step": "1",
          "value": "75",
          "rangePresent": true,
          "rangeValue": "75"
        }
      ]
    }
  },
  "autoPad": {
    "before": {
      "height": 127.5,
      "pads": {
        "top": 0,
        "right": 0,
        "bottom": 0,
        "left": 0,
        "autoPad": true,
        "pageWidthMm": 170,
        "pageHeightMm": 127.5,
        "baseWidthMm": 170,
        "baseHeightMm": 127.5
      }
    },
    "after": {
      "height": 138.9,
      "pads": {
        "top": 0,
        "right": 0,
        "bottom": 11.4,
        "left": 0,
        "autoPad": true,
        "pageWidthMm": 170,
        "pageHeightMm": 138.9,
        "baseWidthMm": 170,
        "baseHeightMm": 127.5
      },
      "boxes": [
        {
          "x": 82.53959204101562,
          "y": 134.82500000000002,
          "w": 4.92081591796875,
          "h": 3.4924999999999997,
          "r": 0.79375
        }
      ]
    },
    "manual": {
      "height": 147.5,
      "pads": {
        "top": 0,
        "right": 0,
        "bottom": 20,
        "left": 0,
        "autoPad": false,
        "pageWidthMm": 170,
        "pageHeightMm": 147.5,
        "baseWidthMm": 170,
        "baseHeightMm": 127.5
      }
    },
    "exports": {
      "svg": {
        "rows": 1,
        "cols": 1,
        "widthMm": 170,
        "heightMm": 138.9,
        "cellW": 170,
        "cellH": 127.5,
        "panelCount": 1
      },
      "pdf": {
        "pageCount": 1,
        "pageCountSource": "pdfinfo",
        "pdfinfoPages": 1,
        "pdfinfoError": null,
        "gsPages": 1,
        "mediaBox": [
          0,
          0,
          481.89,
          393.732
        ],
        "gsError": null,
        "mediaBoxSource": "ghostscript",
        "expectedSizePt": [
          481.89,
          393.732
        ],
        "sizePt": [
          481.89,
          393.732
        ],
        "render": {
          "command": "D:\\texlive\\2023\\bin\\windows\\pdftoppm.exe -png -r 72 -f 1 -l 1 -singlefile E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\fp-v13-pad.pdf E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\pdf-render\\fp-v13-pad",
          "returncode": 0,
          "stdout": "",
          "stderr": "",
          "path": "E:\\FigurePlay\\_dev\\artifacts\\e2e-v151\\2026-11-06_15-41-58-453\\exports\\pdf-render\\fp-v13-pad.png"
        },
        "renderImage": {
          "format": "PNG",
          "width": 482,
          "height": 394,
          "mode": "RGB",
          "stddev": [
            58.488,
            76.036,
    …
```

## S. PDF按墨迹裁剪白边 — PASS

> 默认 trimPdf=false；trim 按实际墨迹+编号排版盒裁剪，trim=0 保留约 1mm 防裁字安全边距；用户配置 3×2/bc/inset1.5/offsetX1.2/offsetY5/Times9 复现并验证底部编号完整（0.7–1.6mm）；margin/letterbox/trim 0/1/2mm 对比；UI 读数“保留 x mm 安全边距”

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.3 契约：应用版本 >= 1.3（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3 契约：API 方法齐全（setExportOptions/setLayoutOptions/setLabelConfig/getPadInfo/getLabelBoxes/getCropBox/getVectorStatus/exportVectorPdfBase64） | [] |
| ✅ | v1.3 契约：state.export 含 saveAs/vectorPdf/trimPdf/trimMarginMm | [] |
| ✅ | v1.3 契约：state.layout 含 autoPad/padTopMm/padRightMm/padBottomMm/padLeftMm | [] |
| ✅ | v1.3 契约：行/列输入 max=500 | {"rowsMax":"500","colsMax":"500"} |
| ✅ | v1.3 契约：保存位置行默认勾选 | {"rowVisible":true,"checked":true,"saveAs":true} |
| ✅ | v1.3 契约：PDF 裁剪/矢量 PDF 控件存在 | {"trimRow":true,"trimToggle":true,"trimMargin":true,"vectorRow":true} |
| ✅ | v1.3 契约：滑块数字输入存在（cell-zoom-num/jpg-quality-num/label-bg-opacity-num） | [{"present":true,"min":"20","max":"400","step":"1","value":"100","rangePresent":true,"rangeValue":"100"},{"present":true,"min":"60","max":"100","step":"1","value":"95","rangePresent":true,"rangeValue":"95"},{"present":true,"min":"0","max":"100","step":"1","value":"75","rangePresent":true,"rangeValue… |
| ✅ | v1.3.1 ink 契约：应用版本 >= 1.3.1（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3.1 ink 契约：getInkCropBox 可用（async ink bbox） | [] |
| ✅ | v1.3.1 ink 契约：getCropBox 保留（内容盒对照） | null |
| ✅ | v1.3.2 契约：应用版本 >= 1.3.2（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3.2 契约：getInkCropBox(0) 可调用（空页返回整页几何；有内容时 marginMm=1 由 S 场景验证） | {"inkBox0":{"xMm":0,"yMm":0,"wMm":170,"hMm":193},"inkError":null} |
| ✅ | v1.3.2 契约：行/列间距输入 min=-50 max=80 | {"colGap":{"min":"-50","max":"80","value":"2"},"rowGap":{"min":"-50","max":"80","value":"2"}} |
| ✅ | v1.3.2 契约：trim 安全边距提示元素存在（#pdf-trim-safety-hint） | null |
| ✅ | 默认 format=png 时 PDF 裁剪行隐藏、trimPdf=false | {"rowVisible":false,"trimPdf":false} |
| ✅ | 切到 PDF 后裁剪行显示、开关默认关闭、边距行隐藏 | {"saveAsRowVisible":true,"saveAsChecked":true,"pdfTrimRowVisible":true,"pdfTrimChecked":false,"pdfTrimMarginRowVisible":false,"pdfTrimMargin":{"value":"0","min":"0","max":"20","step":"0.5"},"pdfTrimSafetyHintVisible":false,"pdfTrimSafetyHint":"0 mm 会保留约 1 mm 的防裁字安全边距，避免底部编号边缘被裁掉；需要更紧可先试 1 mm 以外的自定义值… |
| ✅ | layout.margin=10 时内容 bbox 小于整页（去掉 10mm 白边） | {"geom":{"w":170,"h":133},"content":{"xMm":10,"yMm":10,"wMm":150,"hMm":113}} |
| ✅ | getCropBox(margin) 按 margin 向四周外扩（±2mm→+4mm） | {"content0":{"xMm":10,"yMm":10,"wMm":150,"hMm":113},"content2":{"xMm":8,"yMm":8,"wMm":154,"hMm":117}} |
| ✅ | trim=0 时 getInkCropBox().marginMm=1（安全边距） | {"ink0Margin":1,"ink2Margin":2} |
| ✅ | getInkCropBox 与 getCropBox 并存且 ink 在整页内（含编号盒/安全边距） | {"geom":{"w":170,"h":133},"ink":{"xMm":8.8,"yMm":8.8,"wMm":152.3,"hMm":115.2,"marginMm":1,"inkPx":{"x":37,"y":37,"w":568,"h":428},"pagePx":{"w":643,"h":503}}} |
| ✅ | margin 场景 ink 与内容盒接近（±3mm，含编号盒与 1mm 安全边距） | {"content":[150,113],"ink":[152.3,115.2]} |
| ✅ | ink margin 0→2mm 时裁剪框每边约扩 1mm（宽高各 +2mm 左右） | {"ink0":[152.3,115.2],"ink2":[154.3,117.2]} |
| ✅ | getInkCropBox 返回像素探针信息（inkPx/pagePx） | {"inkPx":{"x":37,"y":37,"w":568,"h":428},"pagePx":{"w":643,"h":503}} |
| ✅ | trim 开关/边距 UI 同步（trimPdf=true, margin=0） | {"exportOptions":{"saveAs":true,"vectorPdf":true,"trimPdf":true,"trimMarginMm":0,"format":"pdf","scope":"current","dpi":300,"jpgQuality":0.95,"filename":"figure"},"ui":{"saveAsRowVisible":true,"saveAsChecked":true,"pdfTrimRowVisible":true,"pdfTrimChecked":true,"pdfTrimMarginRowVisible":true,"pdfTrim… |
| ✅ | trim=0 显示安全边距提示（#pdf-trim-safety-hint） | {"visible":true,"hint":"0 mm 会保留约 1 mm 的防裁字安全边距，避免底部编号边缘被裁掉；需要更紧可先试 1 mm 以外的自定义值。"} |
| ✅ | UI 读数按实际内容墨迹 + 保留 1 mm 安全边距 | 尺寸 170 × 133 mm · 300 DPI → 2008 × 1571 px · PDF 页面 170 × 133 mm · 自动裁剪白边（按实际内容墨迹，保留 1 mm 安全边距） |
| ✅ | 墨迹裁剪 PDF：MediaBox=ink bbox（±1mm）且四边墨迹 ≤1.6mm | OK |
| ✅ | 墨迹裁剪 PDF 页数=1（pdfinfo） | {"pageCount":1,"source":"pdfinfo"} |
| ✅ | trim=0 渲染四边墨迹余量约 1mm（0.7–1.6mm 安全边距） | {"top":1.058,"right":0.794,"bottom":0.794,"left":1.058} |
| ✅ | 留边 0 时 ink 尺寸明显小于整页（宽高都变小） | {"page":[170,133],"ink":[152.3,115.2]} |
| ✅ | 留边 2mm：MediaBox=ink(2)（±1mm）且四边余量 ≤2.8mm | OK |
| ✅ | 留边 2mm：渲染四边余量约 2mm（1.4–2.6mm） | {"top":2.117,"right":1.852,"bottom":1.852,"left":2.117} |
| ✅ | UI 导出 PDF 同样按 ink 裁剪（下载成功、尺寸/余量正确） | {"filename":"figure.pdf","size":342900,"verifier":"OK"} |
| ✅ | UI 裁剪 PDF 四边实测余量约 2mm（1.4–2.6mm） | {"top":2.117,"right":1.852,"bottom":1.852,"left":2.117} |
| ✅ | trim 关闭时 PDF 保持原页面尺寸（170×133mm） | OK |
| ✅ | trim 关闭时渲染四边保留 ≥5mm 白边（未裁剪） | {"top":9.79,"right":9.79,"bottom":9.79,"left":9.79} |
| ✅ | trim on/off：裁剪后文件与页面显著小于整页（宽高各小 >10mm） | {"ink":[152.3,115.2],"page":[170,133],"sizeBytes":[148681,151908]} |
| ✅ | letterbox：内容盒≈整页（1 面板铺满） | {"geom":{"w":170,"h":95.625},"content":{"xMm":0,"yMm":0,"wMm":170,"hMm":95.6}} |
| ✅ | letterbox：ink bbox 去掉左右白边（宽度明显更小 ≥5mm） | {"content":[170,95.6],"ink":[129.8,93.2]} |
| ✅ | letterbox trim：MediaBox=ink bbox（±1mm）且四边墨迹 ≤1.6mm | OK |
| ✅ | letterbox trim：渲染四边余量 ≤1.6mm（左右约 1mm；上下因图片填满页高可为 0） | {"top":1.058,"right":1.058,"bottom":0,"left":1.058} |
| ✅ | letterbox trim off：整页尺寸且左右保留白边 ≥5mm | {"margins":{"top":3.44,"right":20.902,"bottom":0,"left":21.167},"verifier":"OK"} |
| ✅ | letterbox trim on/off：裁剪后页面宽度明显更小（>10mm） | {"ink":129.8,"page":170,"sizeBytes":[108512,112028]} |
| ✅ | 用户配置生效：3×2 六图 + 编号 bc/inset1.5/offsetX1.2/offsetY5/Times9 | {"geom":{"rows":3,"cols":2,"widthMm":170,"heightMm":150.15,"cellW":84,"cellH":47.25,"panelCount":6},"labels":6} |
| ✅ | 编号排版盒并入 ink crop（6 个编号 box 全部在 crop 内） | {"crop":{"xMm":9.3,"yMm":0.6,"wMm":137.5,"hMm":149.6,"marginMm":1,"inkPx":{"x":39,"y":6,"w":512,"h":558},"pagePx":{"w":643,"h":567}},"boxes":[{"x":40.73959204101563,"y":47.574999999999996,"w":4.92081591796875,"h":3.4924999999999997,"r":0.79375},{"x":126.65045019531249,"y":47.54325,"w":5.099099609375… |
| ✅ | trim=0 时安全边距强制为 1mm（getInkCropBox().marginMm=1） | {"marginMm":1,"ink":[137.5,149.6],"content":{"xMm":0,"yMm":0,"wMm":170,"hMm":149.6}} |
| ✅ | 用户配置 trim=0 PDF：MediaBox=ink bbox（±1mm）且四边 ≤1.6mm | OK |
| ✅ | 用户配置 trim=0：四边墨迹余量 0.7–1.6mm | {"top":0.794,"right":0.794,"bottom":0.794,"left":1.058} |
| ✅ | 用户配置 trim=0：底部编号完整（底边余量 ≥0.7mm，非贴边 0） | {"bottom":0.794,"pageCount":1} |
| ✅ | 用户配置 trim=1mm：边距仍约 1mm（1mm 即最小值） | {"marginMm":1,"margins":{"top":0.794,"right":0.794,"bottom":0.794,"left":1.058}} |
| ✅ | 用户配置 trim=2mm：上/左/右约 2mm，底部受页面边界最多约 0.8–2.6mm | {"marginMm":2,"margins":{"top":1.587,"right":1.852,"bottom":0.794,"left":2.117},"note":"底部编号排版盒紧贴页面（autoPad 仅留 0.6mm），crop 被页面边界 clamp"} |
| ✅ | 切回 PNG 后 PDF 裁剪行隐藏 | {"saveAsRowVisible":true,"saveAsChecked":true,"pdfTrimRowVisible":false,"pdfTrimChecked":true,"pdfTrimMarginRowVisible":false,"pdfTrimMargin":{"value":"0","min":"0","max":"20","step":"0.5"},"pdfTrimSafetyHintVisible":false,"pdfTrimSafetyHint":"0 mm 会保留约 1 mm 的防裁字安全边距，避免底部编号边缘被裁掉；需要更紧可先试 1 mm 以外的自定义值… |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.3 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingExportFields":[],"missingLayoutFields":[],"exportValues":{"saveAs":true,"vectorPdf":true,"trimPdf":false,"trimMarginMm":0},"layoutValues":{"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"ui":{"rowsInput":{"max":"500","min":"1","value":"3"},"colsInput":{"max":"500","min":"1","value":"2"},"saveAsRow":true,"saveAsChecked":true,"pdfTrimRowExists":true,"pdfTrimToggleExists":true,"pdfTrimMarginExists":true,"vec…
- v1.3.1 墨迹裁剪契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"hasGetCropBox":true,"hasInkApi":true}
- v1.3.2 安全边距/负间距契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"inkError":null,"gapInputs":{"colGap":{"min":"-50","max":"80","value":"2"},"rowGap":{"min":"-50","max":"80","value":"2"}},"safetyHintExists":true,"inkBox0":{"xMm":0,"yMm":0,"wMm":170,"hMm":193}}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![S-01-pdf-trim.png](<screens-v1.5.1/S-01-pdf-trim.png>)

关键证据：

```json
{
  "v13Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingExportFields": [],
    "missingLayoutFields": [],
    "exportValues": {
      "saveAs": true,
      "vectorPdf": true,
      "trimPdf": false,
      "trimMarginMm": 0
    },
    "layoutValues": {
      "autoPad": true,
      "padTopMm": 0,
      "padRightMm": 0,
      "padBottomMm": 0,
      "padLeftMm": 0
    },
    "ui": {
      "rowsInput": {
        "max": "500",
        "min": "1",
        "value": "3"
      },
      "colsInput": {
        "max": "500",
        "min": "1",
        "value": "2"
      },
      "saveAsRow": true,
      "saveAsChecked": true,
      "pdfTrimRowExists": true,
      "pdfTrimToggleExists": true,
      "pdfTrimMarginExists": true,
      "vectorPdfRowExists": true,
      "autoPadToggleChecked": true,
      "padManualHidden": true,
      "numberInputs": [
        {
          "present": true,
          "min": "20",
          "max": "400",
          "step": "1",
          "value": "100",
          "rangePresent": true,
          "rangeValue": "100"
        },
        {
          "present": true,
          "min": "60",
          "max": "100",
          "step": "1",
          "value": "95",
          "rangePresent": true,
          "rangeValue": "95"
        },
        {
          "present": true,
          "min": "0",
          "max": "100",
          "step": "1",
          "value": "75",
          "rangePresent": true,
          "rangeValue": "75"
        }
      ]
    }
  },
  "v131Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "hasGetCropBox": true,
    "hasInkApi": true
  },
  "v132Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "inkError": null,
    "gapInputs": {
      "colGap": {
        "min": "-50",
        "max": "80",
        "value": "2"
      },
      "rowGap": {
        "min": "-50",
        "max": "80",
        "value": "2"
      }
    },
    "safetyHintExists": true,
    "inkBox0": {
      "xMm": 0,
      "yMm": 0,
      "wMm": 170,
      "hMm": 193
    }
  },
  "pdfTrim": {
    "mode": "ink",
    "geom": {
      "w": 170,
      "h": 133
    },
    "contentBox": {
      "xMm": 10,
      "yMm": 10,
      "wMm": 150,
      "hMm": 113
    },
    "contentBox2": {
      "xMm": 8,
      "yMm": 8,
      "wMm": 154,
      "hMm": 117
    },
    "inkBox": {
      "xMm": 8.8,
      "yMm": 8.8,
      "wMm": 152.3,
      "hMm": 115.2,
      "marginMm": 1,
      "inkPx": {
        "x": 37,
        "y": 37,
        "w": 568,
        "h": 428
      },
      "pagePx": {
        "w": 643,
        "h": 503
      }
    },
    "inkBox2": {
      "xMm": 7.8,
      "yMm": 7.8,
      "wMm": 154.3,
      "hMm": 117.2,
      "marginMm": 2,
      "inkPx": {
        "x": 37,
        "y": 37,
        "w": 568,
        "h": 428
      },
      "pagePx": {
        "w": 643,
        "h": 503
      }
    },
    "trim0": {
      "sizeMm": {
        "w": 152.3,
        "h": 115.2
      },
      "marginsMm": {
        "top": 1.058,
        "right": 0.794,
        "bottom": 0.794,
        "left": 1.058
      },
      "bytes": 148681
    },
    "trim2": {
      "sizeMm": {
        "w": 154.3,
        "h": 117.2
      },
      "marginsMm": {
        "top": 2.117,
        "right": 1.852,
        "bottom": 1.852,
        "left": 2.117
      },
      "bytes": 150293
    },
    "uiTrim": {
      "marginsMm": {
        "top": 2.117,
        "right": 1.852,
        "bottom": 1.852,
        "left": 2.117
      },
      "bytes": 342900
    },
    "full": {
      "sizeMm": {
        "w": 170,
        "h": 133
      },
      "marginsMm": {
        "top": 9.79,
        "right": 9.79,
        "bottom": 9.79,
        "left": 9.79
      },
      "bytes": 151908
    },
    "letterbox": {
      "geom": {
        "w": 170,
        "h": 95.625
      },
      "content": {
        "xMm": 0,
        "yMm": 0,
        "wMm": 170,
        "hMm": 95.6
      },
      "…
```

## T. 滑块数字输入 — PASS

> #cell-zoom-num（20–400%）、#jpg-quality-num（60–100%）、#label-bg-opacity-num（0–100%）直接输入同步滑块与状态；范围夹取；滑块反向同步数字框

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.3 契约：应用版本 >= 1.3（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3 契约：API 方法齐全（setExportOptions/setLayoutOptions/setLabelConfig/getPadInfo/getLabelBoxes/getCropBox/getVectorStatus/exportVectorPdfBase64） | [] |
| ✅ | v1.3 契约：state.export 含 saveAs/vectorPdf/trimPdf/trimMarginMm | [] |
| ✅ | v1.3 契约：state.layout 含 autoPad/padTopMm/padRightMm/padBottomMm/padLeftMm | [] |
| ✅ | v1.3 契约：行/列输入 max=500 | {"rowsMax":"500","colsMax":"500"} |
| ✅ | v1.3 契约：保存位置行默认勾选 | {"rowVisible":true,"checked":true,"saveAs":true} |
| ✅ | v1.3 契约：PDF 裁剪/矢量 PDF 控件存在 | {"trimRow":true,"trimToggle":true,"trimMargin":true,"vectorRow":true} |
| ✅ | v1.3 契约：滑块数字输入存在（cell-zoom-num/jpg-quality-num/label-bg-opacity-num） | [{"present":true,"min":"20","max":"400","step":"1","value":"100","rangePresent":true,"rangeValue":"100"},{"present":true,"min":"60","max":"100","step":"1","value":"95","rangePresent":true,"rangeValue":"95"},{"present":true,"min":"0","max":"100","step":"1","value":"75","rangePresent":true,"rangeValue… |
| ✅ | 三个数字输入存在且 min/max 正确 | {"cell-zoom":{"value":"100","min":"20","max":"400","step":"1"},"cell-zoom-num":{"value":"100","min":"20","max":"400","step":"1"},"jpg-quality":{"value":"95","min":"60","max":"100","step":"1"},"jpg-quality-num":{"value":"95","min":"60","max":"100","step":"1"},"label-bg-opacity":{"value":"75","min":"0… |
| ✅ | 输入缩放 250% → state.cells[0].zoom=2.5 且滑块同步 250 | {"zoom":2.5,"range":"250"} |
| ✅ | 缩放输入 999% 夹取到 400%（0.2–4） | {"zoom":4,"num":"400"} |
| ✅ | 缩放输入 5% 夹取到 20% | {"zoom":0.2,"num":"20"} |
| ✅ | 输入 JPG 质量 75 → jpgQuality=0.75 且滑块同步 75 | {"quality":0.75,"range":"75"} |
| ✅ | JPG 质量 10 夹取到 60 | 0.6 |
| ✅ | JPG 质量 120 夹取到 100 | 1 |
| ✅ | 输入底色不透明度 40 → bgOpacity=0.4 且滑块同步 40 | {"opacity":0.4,"range":"40"} |
| ✅ | 不透明度 -5 夹取到 0 | 0 |
| ✅ | 不透明度 150 夹取到 100 | 1 |
| ✅ | 拖动滑块后数字框反向同步（30） | {"opacity":0.3,"num":"30"} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.3 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingExportFields":[],"missingLayoutFields":[],"exportValues":{"saveAs":true,"vectorPdf":true,"trimPdf":false,"trimMarginMm":0},"layoutValues":{"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"ui":{"rowsInput":{"max":"500","min":"1","value":"3"},"colsInput":{"max":"500","min":"1","value":"2"},"saveAsRow":true,"saveAsChecked":true,"pdfTrimRowExists":true,"pdfTrimToggleExists":true,"pdfTrimMarginExists":true,"vec…

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![T-01-range-number-inputs.png](<screens-v1.5.1/T-01-range-number-inputs.png>)

关键证据：

```json
{
  "v13Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingExportFields": [],
    "missingLayoutFields": [],
    "exportValues": {
      "saveAs": true,
      "vectorPdf": true,
      "trimPdf": false,
      "trimMarginMm": 0
    },
    "layoutValues": {
      "autoPad": true,
      "padTopMm": 0,
      "padRightMm": 0,
      "padBottomMm": 0,
      "padLeftMm": 0
    },
    "ui": {
      "rowsInput": {
        "max": "500",
        "min": "1",
        "value": "3"
      },
      "colsInput": {
        "max": "500",
        "min": "1",
        "value": "2"
      },
      "saveAsRow": true,
      "saveAsChecked": true,
      "pdfTrimRowExists": true,
      "pdfTrimToggleExists": true,
      "pdfTrimMarginExists": true,
      "vectorPdfRowExists": true,
      "autoPadToggleChecked": true,
      "padManualHidden": true,
      "numberInputs": [
        {
          "present": true,
          "min": "20",
          "max": "400",
          "step": "1",
          "value": "100",
          "rangePresent": true,
          "rangeValue": "100"
        },
        {
          "present": true,
          "min": "60",
          "max": "100",
          "step": "1",
          "value": "95",
          "rangePresent": true,
          "rangeValue": "95"
        },
        {
          "present": true,
          "min": "0",
          "max": "100",
          "step": "1",
          "value": "75",
          "rangePresent": true,
          "rangeValue": "75"
        }
      ]
    }
  },
  "rangeNums": {
    "state": {
      "zoom": 0.2,
      "jpgQuality": 1,
      "bgOpacity": 0.3
    }
  }
}
```

## U. EMF矢量PDF — PASS

> 桌面桥 mock fig-imported 带 emfBase64；PDF 下 #vector-pdf-row 显示、getVectorStatus emfCount>0；点导出发送 export-vector-pdf spec（crop/panels[].image.kind=emf/labels）；mock 回 base64 PDF 写入 fake handle；mock 错误回退位图 PDF 且无 pageerror

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.3 契约：应用版本 >= 1.3（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3 契约：API 方法齐全（setExportOptions/setLayoutOptions/setLabelConfig/getPadInfo/getLabelBoxes/getCropBox/getVectorStatus/exportVectorPdfBase64） | [] |
| ✅ | v1.3 契约：state.export 含 saveAs/vectorPdf/trimPdf/trimMarginMm | [] |
| ✅ | v1.3 契约：state.layout 含 autoPad/padTopMm/padRightMm/padBottomMm/padLeftMm | [] |
| ✅ | v1.3 契约：行/列输入 max=500 | {"rowsMax":"500","colsMax":"500"} |
| ✅ | v1.3 契约：保存位置行默认勾选 | {"rowVisible":true,"checked":true,"saveAs":true} |
| ✅ | v1.3 契约：PDF 裁剪/矢量 PDF 控件存在 | {"trimRow":true,"trimToggle":true,"trimMargin":true,"vectorRow":true} |
| ✅ | v1.3 契约：滑块数字输入存在（cell-zoom-num/jpg-quality-num/label-bg-opacity-num） | [{"present":true,"min":"20","max":"400","step":"1","value":"100","rangePresent":true,"rangeValue":"100"},{"present":true,"min":"60","max":"100","step":"1","value":"95","rangePresent":true,"rangeValue":"95"},{"present":true,"min":"0","max":"100","step":"1","value":"75","rangePresent":true,"rangeValue… |
| ✅ | v1.3.1 ink 契约：应用版本 >= 1.3.1（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3.1 ink 契约：getInkCropBox 可用（async ink bbox） | [] |
| ✅ | v1.3.1 ink 契约：getCropBox 保留（内容盒对照） | null |
| ✅ | v1.3.2 契约：应用版本 >= 1.3.2（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3.2 契约：getInkCropBox(0) 可调用（空页返回整页几何；有内容时 marginMm=1 由 S 场景验证） | {"inkBox0":{"xMm":0,"yMm":0,"wMm":170,"hMm":193},"inkError":null} |
| ✅ | v1.3.2 契约：行/列间距输入 min=-50 max=80 | {"colGap":{"min":"-50","max":"80","value":"2"},"rowGap":{"min":"-50","max":"80","value":"2"}} |
| ✅ | v1.3.2 契约：trim 安全边距提示元素存在（#pdf-trim-safety-hint） | null |
| ✅ | 上传 .fig 后 app 发出 import-fig 请求 | {"requestId":"fig-2-mw559dbf","filename":"emf-figure.fig"} |
| ✅ | 桌面桥回包后 .fig 成功插入（name→.png、dataUrl 可用） | {"name":"emf-figure.png","hasData":true} |
| ✅ | getVectorStatus：emfCount=1（EMF 已进入单元格）、桌面桥可用、矢量可用 | {"emfCount":1,"unsupported":false,"desktop":true,"vectorAvailable":false,"vectorPdf":true} |
| ✅ | 切到 PDF 后 #vector-pdf-row 显示且开关默认勾选 | {"saveAsRowVisible":true,"saveAsChecked":true,"pdfTrimRowVisible":true,"pdfTrimChecked":false,"pdfTrimMarginRowVisible":false,"pdfTrimMargin":{"value":"0","min":"0","max":"20","step":"0.5"},"pdfTrimSafetyHintVisible":false,"pdfTrimSafetyHint":"0 mm 会保留约 1 mm 的防裁字安全边距，避免底部编号边缘被裁掉；需要更紧可先试 1 mm 以外的自定义值… |
| ✅ | 矢量 PDF 说明文案可读 | PDF 将优先使用矢量模式（保留 1 张 EMF 的线条与文字），需桌面版 PowerPoint；首次启动较慢，之后会复用 PowerPoint 会话。失败会自动回退为高分辨率位图 PDF。 |
| ✅ | 生成用于 mock 回包的合法 PDF base64 | {"filename":"fp-v13-vector-mock.pdf","base64Length":136788} |
| ✅ | 点导出后桌面桥收到 export-vector-pdf 请求 | null |
| ✅ | 矢量 spec 含 crop/panels/labels 结构 | {"keys":["widthMm","heightMm","background","crop","trimMarginMm","panels","labels"],"widthMm":170,"panels":2} |
| ✅ | 矢量 spec：EMF 面板 image.kind=emf 且 base64 一致 | ["png","emf"] |
| ✅ | 矢量 spec：非 EMF 面板仍以图片进入排版 | ["png","emf"] |
| ✅ | 矢量 spec：labels 与当前页编号一致 | {"spec":["(a)","(b)"],"preview":["(a)","(b)"]} |
| ✅ | trim 关闭时 spec.crop=null 且 spec.trimMarginMm=1（v1.3.2 安全边距） | {"crop":null,"trimMarginMm":1} |
| ✅ | mock 回 base64 PDF 后写入 fake handle（.pdf、%PDF 头、大小=回包） | {"suggestedName":"fp-v13-vector.pdf","size":102591,"expected":102591,"head":[37,80,68,70,45,49,46,52]} |
| ✅ | 矢量 PDF 保存状态可读（包含「矢量 PDF」/已保存） | 已保存到 fp-v13-vector.pdf（100.2 KB，28 ms） |
| ✅ | 矢量失败后自动回退位图 PDF 并写入成功 | {"writes":2,"fallback":{"size":238832,"type":"application/pdf","bytes":238832,"head":[37,80,68,70,45,49,46,52]}} |
| ✅ | 矢量失败回退提示可读（状态栏/toast 提示回退，无 pageerror） | {"status":"矢量模式失败，已回退位图 PDF（233.2 KB）","toast":"已保存到所选位置：fp-v13-vector.pdf"} |
| ✅ | trim 开启时矢量 spec.crop≈getInkCropBox（±0.5mm，按实际墨迹） | {"spec":{"xMm":0,"yMm":0,"wMm":170,"hMm":63,"marginMm":2,"inkPx":{"x":0,"y":0,"w":643,"h":238},"pagePx":{"w":643,"h":238}},"inkCrop":{"xMm":0,"yMm":0,"wMm":170,"hMm":63,"marginMm":2,"inkPx":{"x":0,"y":0,"w":643,"h":238},"pagePx":{"w":643,"h":238}}} |
| ✅ | trim=2 时矢量 spec.trimMarginMm=2（与 getInkCropBox(2) 一致） | {"specMarginMm":2,"inkMarginMm":2} |
| ✅ | trim 开启时矢量 spec.crop 来自 ink 检测（含 inkPx/pagePx，而非内容盒） | {"specCrop":{"xMm":0,"yMm":0,"wMm":170,"hMm":63,"marginMm":2,"inkPx":{"x":0,"y":0,"w":643,"h":238},"pagePx":{"w":643,"h":238}},"contentCrop":{"xMm":0,"yMm":0,"wMm":170,"hMm":63}} |
| ✅ | 关闭 #vector-pdf-toggle 后 vectorPdf=false、矢量不可用 | {"emfCount":1,"unsupported":false,"desktop":true,"vectorAvailable":false,"vectorPdf":false} |
| ✅ | 切回 PNG 后 #vector-pdf-row 隐藏 | {"saveAsRowVisible":true,"saveAsChecked":true,"pdfTrimRowVisible":false,"pdfTrimChecked":false,"pdfTrimMarginRowVisible":false,"pdfTrimMargin":{"value":"2","min":"0","max":"20","step":"0.5"},"pdfTrimSafetyHintVisible":false,"pdfTrimSafetyHint":"0 mm 会保留约 1 mm 的防裁字安全边距，避免底部编号边缘被裁掉；需要更紧可先试 1 mm 以外的自定义… |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.3 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingExportFields":[],"missingLayoutFields":[],"exportValues":{"saveAs":true,"vectorPdf":true,"trimPdf":false,"trimMarginMm":0},"layoutValues":{"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"ui":{"rowsInput":{"max":"500","min":"1","value":"3"},"colsInput":{"max":"500","min":"1","value":"2"},"saveAsRow":true,"saveAsChecked":true,"pdfTrimRowExists":true,"pdfTrimToggleExists":true,"pdfTrimMarginExists":true,"vec…
- v1.3.1 墨迹裁剪契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"hasGetCropBox":true,"hasInkApi":true}
- v1.3.2 安全边距/负间距契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"inkError":null,"gapInputs":{"colGap":{"min":"-50","max":"80","value":"2"},"rowGap":{"min":"-50","max":"80","value":"2"}},"safetyHintExists":true,"inkBox0":{"xMm":0,"yMm":0,"wMm":170,"hMm":193}}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![U-01-vector-pdf.png](<screens-v1.5.1/U-01-vector-pdf.png>)

关键证据：

```json
{
  "v13Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingExportFields": [],
    "missingLayoutFields": [],
    "exportValues": {
      "saveAs": true,
      "vectorPdf": true,
      "trimPdf": false,
      "trimMarginMm": 0
    },
    "layoutValues": {
      "autoPad": true,
      "padTopMm": 0,
      "padRightMm": 0,
      "padBottomMm": 0,
      "padLeftMm": 0
    },
    "ui": {
      "rowsInput": {
        "max": "500",
        "min": "1",
        "value": "3"
      },
      "colsInput": {
        "max": "500",
        "min": "1",
        "value": "2"
      },
      "saveAsRow": true,
      "saveAsChecked": true,
      "pdfTrimRowExists": true,
      "pdfTrimToggleExists": true,
      "pdfTrimMarginExists": true,
      "vectorPdfRowExists": true,
      "autoPadToggleChecked": true,
      "padManualHidden": true,
      "numberInputs": [
        {
          "present": true,
          "min": "20",
          "max": "400",
          "step": "1",
          "value": "100",
          "rangePresent": true,
          "rangeValue": "100"
        },
        {
          "present": true,
          "min": "60",
          "max": "100",
          "step": "1",
          "value": "95",
          "rangePresent": true,
          "rangeValue": "95"
        },
        {
          "present": true,
          "min": "0",
          "max": "100",
          "step": "1",
          "value": "75",
          "rangePresent": true,
          "rangeValue": "75"
        }
      ]
    }
  },
  "v131Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "hasGetCropBox": true,
    "hasInkApi": true
  },
  "v132Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "inkError": null,
    "gapInputs": {
      "colGap": {
        "min": "-50",
        "max": "80",
        "value": "2"
      },
      "rowGap": {
        "min": "-50",
        "max": "80",
        "value": "2"
      }
    },
    "safetyHintExists": true,
    "inkBox0": {
      "xMm": 0,
      "yMm": 0,
      "wMm": 170,
      "hMm": 193
    }
  },
  "vectorPdf": {
    "vectorStatus": {
      "emfCount": 1,
      "unsupported": false,
      "desktop": true,
      "vectorAvailable": false,
      "vectorPdf": true
    },
    "emfBase64Length": 376,
    "spec": {
      "widthMm": 170,
      "heightMm": 63,
      "panels": [
        {
          "xMm": 0,
          "yMm": 0,
          "wMm": 84,
          "hMm": 63,
          "kind": "png"
        },
        {
          "xMm": 86,
          "yMm": 0,
          "wMm": 84,
          "hMm": 63,
          "kind": "emf"
        }
      ],
      "labels": [
        {
          "text": "(a)",
          "xMm": 1.5,
          "yMm": 3.6907499999999995,
          "boxXmm": 0.8015,
          "boxYmm": 1.1825,
          "boxWmm": 4.92081591796875,
          "boxHmm": 3.4924999999999997,
          "textLeftMm": 1.5,
          "textTopMm": 0.8645827174186707,
          "textWmm": 3.5526626110076904,
          "textHmm": 3.4782984256744385,
          "fontSizePt": 9,
          "fontName": "Times New Roman",
          "bold": false,
          "italic": false,
          "color": "#000000",
          "align": "left",
          "bg": "none",
          "bgColor": "#ffffff",
          "bgOpacity": 0.75
        },
        {
          "text": "(b)",
          "xMm": 87.5,
          "yMm": 3.7224999999999997,
          "boxXmm": 86.8015,
          "boxYmm": 1.1825,
          "boxWmm": 5.099099609375,
          "boxHmm": 3.5242499999999994,
          "textLeftMm": 87.5,
          "textTopMm": 0.8963826894760132,
          "textWmm": 3.7308871746063232,
          "textHmm": 3.4782984256744385,
          "fontSizePt": 9,
          "fontName": "Times New Roman",
          "bold": false,
          "italic": false,
          "color": "#000000",
          "align": "left",
          "bg": "none",
          "bgColor": "#ffffff",
          "bgOpacity": 0.75
        }
      ],
     …
```

## V. 负间距 — PASS

> 行/列间距支持 -50～80mm：UI #col-gap/#row-gap min=-50；API setLayoutOptions({colGap,rowGap}) 负值生效/夹取；面板重叠、cellW/页高变化；负间距下 PNG/PDF/trim 导出正常；v1.3.3 选中/悬停描边在 interaction-overlay-layer 最上层不被重叠遮挡，导出 SVG 不含交互元素

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.3 契约：应用版本 >= 1.3（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3 契约：API 方法齐全（setExportOptions/setLayoutOptions/setLabelConfig/getPadInfo/getLabelBoxes/getCropBox/getVectorStatus/exportVectorPdfBase64） | [] |
| ✅ | v1.3 契约：state.export 含 saveAs/vectorPdf/trimPdf/trimMarginMm | [] |
| ✅ | v1.3 契约：state.layout 含 autoPad/padTopMm/padRightMm/padBottomMm/padLeftMm | [] |
| ✅ | v1.3 契约：行/列输入 max=500 | {"rowsMax":"500","colsMax":"500"} |
| ✅ | v1.3 契约：保存位置行默认勾选 | {"rowVisible":true,"checked":true,"saveAs":true} |
| ✅ | v1.3 契约：PDF 裁剪/矢量 PDF 控件存在 | {"trimRow":true,"trimToggle":true,"trimMargin":true,"vectorRow":true} |
| ✅ | v1.3 契约：滑块数字输入存在（cell-zoom-num/jpg-quality-num/label-bg-opacity-num） | [{"present":true,"min":"20","max":"400","step":"1","value":"100","rangePresent":true,"rangeValue":"100"},{"present":true,"min":"60","max":"100","step":"1","value":"95","rangePresent":true,"rangeValue":"95"},{"present":true,"min":"0","max":"100","step":"1","value":"75","rangePresent":true,"rangeValue… |
| ✅ | v1.3.2 契约：应用版本 >= 1.3.2（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3.2 契约：getInkCropBox(0) 可调用（空页返回整页几何；有内容时 marginMm=1 由 S 场景验证） | {"inkBox0":{"xMm":0,"yMm":0,"wMm":170,"hMm":193},"inkError":null} |
| ✅ | v1.3.2 契约：行/列间距输入 min=-50 max=80 | {"colGap":{"min":"-50","max":"80","value":"2"},"rowGap":{"min":"-50","max":"80","value":"2"}} |
| ✅ | v1.3.2 契约：trim 安全边距提示元素存在（#pdf-trim-safety-hint） | null |
| ✅ | v1.3.3 契约：应用版本 >= 1.3.3（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3.3 契约：#preview-svg 最后子元素是 .interaction-overlay-layer | {"lastChildClass":"interaction-overlay-layer","overlayIndex":4,"childCount":5} |
| ✅ | v1.3.3 契约：groups-layer / labels-layer / cells-layer 均在 overlay 之下 | {"children":[{"index":0,"tag":"rect","class":"figure-bg"},{"index":1,"tag":"g","class":"cells-layer"},{"index":2,"tag":"g","class":"groups-layer"},{"index":3,"tag":"g","class":"labels-layer"},{"index":4,"tag":"g","class":"interaction-overlay-layer"}]} |
| ✅ | v1.3.3 契约：overlay 层 pointer-events=none（不拦截子图交互） | none |
| ✅ | 间距输入 min=-50 / max=80（列与行） | {"col":["-50","80"],"row":["-50","80"]} |
| ✅ | 初始间距 0：cellW/cellH 基线记录 | {"layout":{"rows":2,"cols":2,"margin":0,"autoPad":true,"colGap":0,"rowGap":0},"cellW":85,"cellH":63.75} |
| ✅ | UI 输入 -10 同步到 layout 与状态 | {"rows":2,"cols":2,"margin":0,"autoPad":true,"colGap":-10,"rowGap":-10} |
| ✅ | 负列间距使 cellW 增大（0→-10：cellW 85→90 左右） | {"gap0":85,"gapNeg10":90} |
| ✅ | 负列间距导致面板水平重叠（≈10mm） | {"overlapX":10,"p0":{"x":0,"w":90},"p1":{"x":80,"w":90}} |
| ✅ | 负行间距导致面板垂直重叠（≈10mm） | {"overlapY":10,"p0":{"y":0,"h":67.5},"p2":{"y":57.5,"h":67.5}} |
| ✅ | 页面宽度不变、页高随负行距减小 | {"w0":170,"w1":170,"h0":127.5,"h1":125} |
| ✅ | API 间距夹取：-100→-50、100→80 | {"rows":2,"cols":2,"margin":0,"autoPad":true,"colGap":-50,"rowGap":80} |
| ✅ | 负间距夹取后 pageerror 仍为 0（诊断见场景诊断） | null |
| ✅ | v1.3.3：#preview-svg 最后一个子元素是 .interaction-overlay-layer | {"children":[{"index":0,"tag":"rect","class":"figure-bg"},{"index":1,"tag":"g","class":"cells-layer"},{"index":2,"tag":"g","class":"groups-layer"},{"index":3,"tag":"g","class":"labels-layer"},{"index":4,"tag":"g","class":"interaction-overlay-layer"}],"lastChildClass":"interaction-overlay-layer"} |
| ✅ | v1.3.3：overlay 层 pointer-events=none（不拦截交互） | none |
| ✅ | v1.3.3：初始无选中/悬停描边（切换选择前） | {"selection":0,"hover":0} |
| ✅ | 负间距下选中 panel0：.cell-selection-outline 位置/尺寸=panel0 且 stroke 跟随 --accent | {"outline":{"class":"cell-selection-outline","x":0,"y":0,"w":90,"h":67.5,"bbox":{"x":0,"y":0,"w":90,"h":67.5},"stroke":null,"computedStroke":"rgb(37, 99, 235)","strokeWidth":"0.5","computedStrokeWidth":"0.5px","strokeDasharray":"none","pointerEvents":"none","inOverlay":true},"panel":{"index":0,"row"… |
| ✅ | 选中描边位于顶层 overlay 层内（最后一层，不被重叠子图遮挡） | {"inOverlay":true,"overlayIndex":4,"childCount":5} |
| ✅ | 重叠区悬停产生 .cell-hover-outline（bbox=可见 panel1，虚线 stroke 跟随 --accent-hover） | {"hover":{"class":"cell-hover-outline","x":80,"y":0,"w":90,"h":67.5,"bbox":{"x":80,"y":0,"w":90,"h":67.5},"stroke":null,"computedStroke":"color(srgb 0.469961 0.620706 0.951373)","strokeWidth":"0.35","computedStrokeWidth":"0.35px","strokeDasharray":"2.4px, 1.8px","pointerEvents":"none","inOverlay":tr… |
| ✅ | 选中+悬停描边同时在 overlay 顶层（互不遮挡） | {"selection":1,"hover":1} |
| ✅ | 多选 panel0+panel2：overlay 生成 2 个 selection outline 且 bbox 匹配 | {"outlines":[{"x":0,"y":0,"w":90,"h":67.5},{"x":0,"y":57.5,"w":90,"h":67.5}]} |
| ✅ | 切换选择到 panel3：overlay 仅 1 个 selection outline（旧描边清理） | {"selectedCell":3,"outlines":1} |
| ✅ | hover 离开 SVG 后 hover outline 消失，selection outline 保留 | {"hover":0,"selection":1} |
| ✅ | 导出 SVG 不含交互 overlay/选中/悬停元素 | {"overlay":false,"selection":false,"hover":false,"textLength":323731} |
| ✅ | 导出 SVG 结构有效（尺寸/4 cells/4 images/4 labels） | OK |
| ✅ | 负间距 PNG：像素尺寸=mm/25.4×150 且非空白 | OK |
| ✅ | 负间距 PDF：整页尺寸正确、页数=1 | OK |
| ✅ | 负间距 trim PDF：MediaBox=ink bbox（±1mm）且四边 ≤1.6mm | OK |
| ✅ | 负间距 trim PDF：四边墨迹余量 ≤1.6mm（贴边侧允许 0） | {"top":0,"right":0,"bottom":0,"left":0} |
| ✅ | 切换模板后 overlay 重建仍为 #preview-svg 最后子层 | {"lastChildClass":"interaction-overlay-layer","childCount":5} |
| ✅ | 切换模板后无陈旧描边（outline 均对应现存面板） | {"outlines":0,"panels":6} |
| ✅ | 切换页后 overlay 仍为最后子层，描边不残留过期面板 | {"lastChildClass":"interaction-overlay-layer","selection":0} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.3 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingExportFields":[],"missingLayoutFields":[],"exportValues":{"saveAs":true,"vectorPdf":true,"trimPdf":false,"trimMarginMm":0},"layoutValues":{"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"ui":{"rowsInput":{"max":"500","min":"1","value":"3"},"colsInput":{"max":"500","min":"1","value":"2"},"saveAsRow":true,"saveAsChecked":true,"pdfTrimRowExists":true,"pdfTrimToggleExists":true,"pdfTrimMarginExists":true,"vec…
- v1.3.2 安全边距/负间距契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"inkError":null,"gapInputs":{"colGap":{"min":"-50","max":"80","value":"2"},"rowGap":{"min":"-50","max":"80","value":"2"}},"safetyHintExists":true,"inkBox0":{"xMm":0,"yMm":0,"wMm":170,"hMm":193}}
- v1.3.3 交互 overlay 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"lastChildClass":"interaction-overlay-layer","overlayIndex":4,"groupsIndex":2,"labelsIndex":3,"cellsIndex":1,"overlayPointerEvents":"none","children":[{"index":0,"tag":"rect","class":"figure-bg"},{"index":1,"tag":"g","class":"cells-layer"},{"index":2,"tag":"g","class":"groups-layer"},{"index":3,"tag":"g","class":"labels-layer"},{"index":4,"tag":"g","class":"interaction-overlay-layer"}]}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![V-01-negative-gap-overlay.png](<screens-v1.5.1/V-01-negative-gap-overlay.png>)

关键证据：

```json
{
  "v13Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingExportFields": [],
    "missingLayoutFields": [],
    "exportValues": {
      "saveAs": true,
      "vectorPdf": true,
      "trimPdf": false,
      "trimMarginMm": 0
    },
    "layoutValues": {
      "autoPad": true,
      "padTopMm": 0,
      "padRightMm": 0,
      "padBottomMm": 0,
      "padLeftMm": 0
    },
    "ui": {
      "rowsInput": {
        "max": "500",
        "min": "1",
        "value": "3"
      },
      "colsInput": {
        "max": "500",
        "min": "1",
        "value": "2"
      },
      "saveAsRow": true,
      "saveAsChecked": true,
      "pdfTrimRowExists": true,
      "pdfTrimToggleExists": true,
      "pdfTrimMarginExists": true,
      "vectorPdfRowExists": true,
      "autoPadToggleChecked": true,
      "padManualHidden": true,
      "numberInputs": [
        {
          "present": true,
          "min": "20",
          "max": "400",
          "step": "1",
          "value": "100",
          "rangePresent": true,
          "rangeValue": "100"
        },
        {
          "present": true,
          "min": "60",
          "max": "100",
          "step": "1",
          "value": "95",
          "rangePresent": true,
          "rangeValue": "95"
        },
        {
          "present": true,
          "min": "0",
          "max": "100",
          "step": "1",
          "value": "75",
          "rangePresent": true,
          "rangeValue": "75"
        }
      ]
    }
  },
  "v132Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "inkError": null,
    "gapInputs": {
      "colGap": {
        "min": "-50",
        "max": "80",
        "value": "2"
      },
      "rowGap": {
        "min": "-50",
        "max": "80",
        "value": "2"
      }
    },
    "safetyHintExists": true,
    "inkBox0": {
      "xMm": 0,
      "yMm": 0,
      "wMm": 170,
      "hMm": 193
    }
  },
  "v133Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "lastChildClass": "interaction-overlay-layer",
    "overlayIndex": 4,
    "groupsIndex": 2,
    "labelsIndex": 3,
    "cellsIndex": 1,
    "overlayPointerEvents": "none",
    "children": [
      {
        "index": 0,
        "tag": "rect",
        "class": "figure-bg"
      },
      {
        "index": 1,
        "tag": "g",
        "class": "cells-layer"
      },
      {
        "index": 2,
        "tag": "g",
        "class": "groups-layer"
      },
      {
        "index": 3,
        "tag": "g",
        "class": "labels-layer"
      },
      {
        "index": 4,
        "tag": "g",
        "class": "interaction-overlay-layer"
      }
    ]
  },
  "negativeGap": {
    "base": {
      "gap": [
        0,
        0
      ],
      "geom": {
        "rows": 2,
        "cols": 2,
        "widthMm": 170,
        "heightMm": 127.5,
        "cellW": 85,
        "cellH": 63.75,
        "panelCount": 4
      },
      "cellW": 85,
      "cellH": 63.75
    },
    "negative": {
      "gap": [
        -10,
        -10
      ],
      "geom": {
        "rows": 2,
        "cols": 2,
        "widthMm": 170,
        "heightMm": 125,
        "cellW": 90,
        "cellH": 67.5,
        "panelCount": 4
      },
      "cellW": 90,
      "cellH": 67.5,
      "overlapX": 10,
      "overlapY": 10,
      "panels": [
        {
          "index": 0,
          "x": 0,
          "y": 0,
          "w": 90,
          "h": 67.5
        },
        {
          "index": 1,
          "x": 80,
          "y": 0,
          "w": 90,
          "h": 67.5
        },
        {
          "index": 2,
          "x": 0,
          "y": 57.5,
          "w": 90,
          "h": 67.5
        },
        {
          "index": 3,
          "x": 80,
          "y": 57.5,
          "w": 90,
          "h": 67.5
        }
      ]
    },
    "clamped": {
      "rows": 2,
      "cols": 2,
      "margin": 0,
      "autoPad": true,
      "colGap": -50,
      "row…
```

## W. 界面外观 — PASS

> 默认跟随系统（emulateMedia dark/light 自动切换）；#btn-appearance 弹层 3 模式 + 7 主题色 active/aria + localStorage reload 保留；深色下 body/panel/帮助弹窗/输入框深色、figure-shell 预览仍白；浅/深/主题色切换导出 PNG/SVG base64 完全一致、#preview-svg DOM 不变；1000×700 顶栏按钮/popover 不溢出

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.3.4 契约：应用版本 >= 1.3.4（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3.4 契约：外观 API 齐全（setAppearance/getAppearance/FP.appearance） | {"set":true,"get":true,"fp":true} |
| ✅ | v1.3.4 契约：theme.css 已加载（--accent CSS 变量存在） | true |
| ✅ | v1.3.4 契约：#btn-appearance 与 #appearance-popover 存在 | {"button":true,"popover":true} |
| ✅ | v1.3.4 契约：模式按钮 3 个（light/dark/system） | ["light","dark","system"] |
| ✅ | v1.3.4 契约：主题色 7 个（blue..amber）且均有 aria-label | ["blue","indigo","teal","emerald","violet","rose","amber"] |
| ✅ | v1.3.4 契约：html 上 data-theme/data-theme-mode/data-accent 已设置 | {"theme":"dark","mode":"system","accent":"blue"} |
| ✅ | 默认无偏好：mode=system、系统深色时 theme=dark | {"html":{"theme":"dark","mode":"system","accent":"blue","colorScheme":"dark"},"api":{"mode":"system","theme":"dark","accent":"blue"},"mediaDark":true} |
| ✅ | 默认无外观偏好写入 localStorage | {"mode":null,"accent":null,"session":null} |
| ✅ | 系统深色下：body/panel/输入框计算背景为深色 | {"body":"rgb(11, 18, 32)","panel":"rgb(15, 23, 42)","input":"rgb(22, 32, 51)"} |
| ✅ | 系统深色下：预览图稿仍白（figure-shell 背景 + figure-bg 填充） | {"figureShell":"rgb(255, 255, 255)","figureBgFill":"#ffffff"} |
| ✅ | 系统深色下 color-scheme=dark | dark |
| ✅ | 系统媒体变浅色时自动跟随：theme=light、mode 仍 system | {"html":{"theme":"light","mode":"system","accent":"blue","colorScheme":"light"},"api":{"mode":"system","theme":"light","accent":"blue"}} |
| ✅ | 浅色下 body/panel/输入框计算背景不是深色 | {"body":"rgb(244, 246, 250)","panel":"rgb(248, 250, 252)","input":"rgb(255, 255, 255)"} |
| ✅ | 系统媒体变深色时再次自动跟随（双向） | {"theme":"dark","mode":"system","accent":"blue","colorScheme":"dark"} |
| ✅ | #btn-appearance 打开弹层：可见、aria-expanded=true | {"popover":{"hidden":false,"rect":{"left":1158,"top":64,"right":1422,"bottom":302,"width":264,"height":238,"visible":true}},"ariaExpanded":"true"} |
| ✅ | 弹层 3 个模式按钮（浅色/深色/跟随系统）且 system active/aria-pressed | [{"mode":"light","text":"浅色","active":false,"ariaPressed":"false"},{"mode":"dark","text":"深色","active":false,"ariaPressed":"false"},{"mode":"system","text":"跟随系统","active":true,"ariaPressed":"true"}] |
| ✅ | 弹层 7 个主题色 swatch，默认 blue active/aria-pressed | [{"accent":"blue","label":"蓝色","active":true,"ariaPressed":"true","inlineBg":"rgb(37, 99, 235)"},{"accent":"indigo","label":"靛蓝","active":false,"ariaPressed":"false","inlineBg":"rgb(79, 70, 229)"},{"accent":"teal","label":"青绿","active":false,"ariaPressed":"false","inlineBg":"rgb(13, 148, 136)"},{"ac… |
| ✅ | 点击「浅色」：mode/theme=light 且 active/aria 同步、localStorage 写入 light | {"html":{"theme":"light","mode":"light","accent":"blue","colorScheme":"light"},"modes":[{"mode":"light","text":"浅色","active":true,"ariaPressed":"true"},{"mode":"dark","text":"深色","active":false,"ariaPressed":"false"},{"mode":"system","text":"跟随系统","active":false,"ariaPressed":"false"}],"storage":"li… |
| ✅ | 显式浅色不随系统切换（系统 dark 下仍 light） | {"theme":"light","mode":"light","mediaDark":true} |
| ✅ | 点击「深色」：mode/theme=dark 且 active/aria 同步 | {"html":{"theme":"dark","mode":"dark","accent":"blue","colorScheme":"dark"},"modes":[{"mode":"light","text":"浅色","active":false,"ariaPressed":"false"},{"mode":"dark","text":"深色","active":true,"ariaPressed":"true"},{"mode":"system","text":"跟随系统","active":false,"ariaPressed":"false"}]} |
| ✅ | 点击「跟随系统」：mode=system 并解析当前系统深色 | {"theme":"dark","mode":"system","accent":"blue","colorScheme":"dark"} |
| ✅ | 点击关闭按钮：弹层隐藏、aria-expanded=false | {"ariaExpanded":"false","rect":{"left":1289,"top":15,"right":1324,"bottom":43,"width":35,"height":28,"visible":true},"visible":true} |
| ✅ | 按 Escape 关闭弹层 | null |
| ✅ | 点击弹层外部关闭 | null |
| ✅ | 7 种主题色逐个切换：data-accent/--accent/swatch active/aria/localStorage 均正确 | [{"accent":"blue","htmlAccent":"blue","cssVar":"#2563eb","active":true,"ariaPressed":"true","storage":"blue","primaryBg":"linear-gradient(color(srgb 0.29898 0.498353 0.935686) 0%, rgb(37, 99, 235) 100%)"},{"accent":"indigo","htmlAccent":"indigo","cssVar":"#4f46e5","active":true,"ariaPressed":"true",… |
| ✅ | 主题色变化影响按钮主色（--accent 生效于 UI） | [{"accent":"blue","primaryBg":"linear-gradient(color(srgb 0.29898 0.498353 0.935686) 0%, rgb(37, 99, 235) 100%)"},{"accent":"indigo","primaryBg":"linear-gradient(color(srgb 0.434039 0.405098 0.916392) 0%, rgb(79, 70, 229) 100%)"},{"accent":"teal","primaryBg":"linear-gradient(color(srgb 0.221804 0.65… |
| ✅ | 设置深色+紫罗兰写入 localStorage（themeMode/accent 两个键） | {"mode":"dark","accent":"violet","session":null} |
| ✅ | reload 后保留 mode=dark/accent=violet（系统浅色不覆盖显式深色） | {"html":{"theme":"dark","mode":"dark","accent":"violet","colorScheme":"dark"},"mediaDark":false,"accentVar":"#7c3aed"} |
| ✅ | reload 后弹层 active 状态与持久化一致（深色/紫罗兰） | {"modes":[{"mode":"light","text":"浅色","active":false,"ariaPressed":"false"},{"mode":"dark","text":"深色","active":true,"ariaPressed":"true"},{"mode":"system","text":"跟随系统","active":false,"ariaPressed":"false"}],"accents":[{"accent":"violet","label":"紫罗兰","active":true,"ariaPressed":"true","inlineBg":"… |
| ✅ | 深色下帮助弹窗计算背景为深色、文字为浅色 | {"background":"rgb(22, 32, 51)","color":"rgb(230, 237, 247)","display":"block","visible":true} |
| ✅ | 深色下输入框/面板背景为深色且预览图稿仍白 | {"input":"rgb(22, 32, 51)","panel":"rgb(15, 23, 42)","figureShell":"rgb(255, 255, 255)","figureBg":"#ffffff"} |
| ✅ | 1000×700：外观按钮可见且完整落在视口内 | {"left":849,"top":15,"right":884,"bottom":43,"width":35,"height":28,"visible":true} |
| ✅ | 1000×700：popover 完整落在视口内（不溢出） | {"left":724,"top":64,"right":988,"bottom":302,"width":264,"height":238,"visible":true} |
| ✅ | 1000×700：页面无横向溢出 | {"innerWidth":1000,"innerHeight":700,"bodyScrollWidth":1000,"docScrollWidth":1000,"bodyClientWidth":1000} |
| ✅ | 导出隔离：light/dark/amber/violet 下 PNG base64 完全一致 | [{"label":"light-blue","filename":"appearance-isolation.png","length":202616},{"label":"dark-blue","filename":"appearance-isolation.png","length":202616},{"label":"light-amber","filename":"appearance-isolation.png","length":202616},{"label":"dark-violet","filename":"appearance-isolation.png","length… |
| ✅ | 导出隔离：light/dark/amber/violet 下 SVG base64 完全一致 | [{"label":"light-blue","filename":"appearance-isolation.svg","length":210152},{"label":"dark-blue","filename":"appearance-isolation.svg","length":210152},{"label":"light-amber","filename":"appearance-isolation.svg","length":210152},{"label":"dark-violet","filename":"appearance-isolation.svg","length… |
| ✅ | 外观切换不改变 #preview-svg DOM（innerHTML hash/长度/子层/命中区一致） | [{"label":"light-blue","preview":{"hash":369227617,"length":160449,"childCount":5,"cellHits":4}},{"label":"dark-blue","preview":{"hash":369227617,"length":160449,"childCount":5,"cellHits":4}},{"label":"light-amber","preview":{"hash":369227617,"length":160449,"childCount":5,"cellHits":4}},{"label":"d… |
| ✅ | 外观切换不改变项目/几何数据（project 签名一致） | [{"label":"light-blue","project":{"pageCount":1,"pageIndex":0,"pages":["图 1"],"rows":2,"cols":2,"colGap":2,"rowGap":2,"filled":2,"labels":"(a)\|(b)"}},{"label":"dark-blue","project":{"pageCount":1,"pageIndex":0,"pages":["图 1"],"rows":2,"cols":2,"colGap":2,"rowGap":2,"filled":2,"labels":"(a)\|(b)"}},{"… |
| ✅ | 外观切换不触发历史记录变化（canUndo/canRedo/undoCount 一致） | [{"label":"light-blue","history":{"canUndo":true,"canRedo":false,"undoCount":1,"redoCount":0}},{"label":"dark-blue","history":{"canUndo":true,"canRedo":false,"undoCount":1,"redoCount":0}},{"label":"light-amber","history":{"canUndo":true,"canRedo":false,"undoCount":1,"redoCount":0}},{"label":"dark-vi… |
| ✅ | 外观设置不写入项目自动保存（saved payload 无 themeMode/accent 字段） | {"pages":1,"hasThemeKeys":false} |
| ✅ | 外观设置不影响多页状态（pageCount/pageIndex/页面名不变） | {"before":{"pageCount":2,"pageIndex":1},"after":{"pageCount":2,"pageIndex":1}} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.3.4 界面外观契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"hasSetAppearance":true,"hasGetAppearance":true,"hasFpAppearance":true,"themeCssLoaded":true,"buttonExists":true,"popoverExists":true,"modes":["light","dark","system"],"accents":["blue","indigo","teal","emerald","violet","rose","amber"],"accentLabels":["蓝色","靛蓝","青绿","翠绿","紫罗兰","玫红","琥珀"],"html":{"theme":"dark","mode":"system","accent":"blue"},"mediaDark":true}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![W-01-appearance-dark.png](<screens-v1.5.1/W-01-appearance-dark.png>)

关键证据：

```json
{
  "v134Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "hasSetAppearance": true,
    "hasGetAppearance": true,
    "hasFpAppearance": true,
    "themeCssLoaded": true,
    "buttonExists": true,
    "popoverExists": true,
    "modes": [
      "light",
      "dark",
      "system"
    ],
    "accents": [
      "blue",
      "indigo",
      "teal",
      "emerald",
      "violet",
      "rose",
      "amber"
    ],
    "accentLabels": [
      "蓝色",
      "靛蓝",
      "青绿",
      "翠绿",
      "紫罗兰",
      "玫红",
      "琥珀"
    ],
    "html": {
      "theme": "dark",
      "mode": "system",
      "accent": "blue"
    },
    "mediaDark": true
  },
  "appearance": {
    "systemFollow": {
      "darkInitial": {
        "mode": "system",
        "theme": "dark",
        "mediaDark": true
      },
      "light": {
        "mode": "system",
        "theme": "light",
        "mediaDark": false
      },
      "darkAgain": {
        "mode": "system",
        "theme": "dark",
        "mediaDark": true
      }
    },
    "modes": [
      {
        "mode": "light",
        "text": "浅色",
        "active": false,
        "ariaPressed": "false"
      },
      {
        "mode": "dark",
        "text": "深色",
        "active": true,
        "ariaPressed": "true"
      },
      {
        "mode": "system",
        "text": "跟随系统",
        "active": false,
        "ariaPressed": "false"
      }
    ],
    "accents": [
      {
        "accent": "blue",
        "htmlAccent": "blue",
        "cssVar": "#2563eb",
        "active": true,
        "ariaPressed": "true",
        "storage": "blue",
        "primaryBg": "linear-gradient(color(srgb 0.29898 0.498353 0.935686) 0%, rgb(37, 99, 235) 100%)"
      },
      {
        "accent": "indigo",
        "htmlAccent": "indigo",
        "cssVar": "#4f46e5",
        "active": true,
        "ariaPressed": "true",
        "storage": "indigo",
        "primaryBg": "linear-gradient(color(srgb 0.434039 0.405098 0.916392) 0%, rgb(79, 70, 229) 100%)"
      },
      {
        "accent": "teal",
        "htmlAccent": "teal",
        "cssVar": "#0d9488",
        "active": true,
        "ariaPressed": "true",
        "storage": "teal",
        "primaryBg": "linear-gradient(color(srgb 0.221804 0.655922 0.617333) 0%, rgb(13, 148, 136) 100%)"
      },
      {
        "accent": "emerald",
        "htmlAccent": "emerald",
        "cssVar": "#059669",
        "active": true,
        "ariaPressed": "true",
        "storage": "emerald",
        "primaryBg": "linear-gradient(color(srgb 0.196078 0.662353 0.517647) 0%, rgb(5, 150, 105) 100%)"
      },
      {
        "accent": "violet",
        "htmlAccent": "violet",
        "cssVar": "#7c3aed",
        "active": true,
        "ariaPressed": "true",
        "storage": "violet",
        "primaryBg": "linear-gradient(color(srgb 0.578745 0.36651 0.942118) 0%, rgb(124, 58, 237) 100%)"
      },
      {
        "accent": "rose",
        "htmlAccent": "rose",
        "cssVar": "#e11d48",
        "active": true,
        "ariaPressed": "true",
        "storage": "rose",
        "primaryBg": "linear-gradient(color(srgb 0.903529 0.273255 0.411529) 0%, rgb(225, 29, 72) 100%)"
      },
      {
        "accent": "amber",
        "htmlAccent": "amber",
        "cssVar": "#d97706",
        "active": true,
        "ariaPressed": "true",
        "storage": "amber",
        "primaryBg": "linear-gradient(color(srgb 0.877804 0.562667 0.199294) 0%, rgb(217, 119, 6) 100%)"
      }
    ],
    "persistence": {
      "mode": "dark",
      "accent": "violet",
      "afterReload": {
        "theme": "dark",
        "mode": "dark",
        "accent": "violet",
        "colorScheme": "dark"
      }
    },
    "darkStyles": {
      "body": "rgb(11, 18, 32)",
      "panel": "rgb(15, 23, 42)",
      "input": "rgb(22, 32, 51)",
      "helpDialog": "rgb(22, 32, 51)",
      "figureShell": "rgb(255, 255, 255)",
      "figureBgFill": "#ffffff"
    },
    "viewport": {
      "innerWidth": 1000,
      "innerHeight"…
```

## X. 配置模板 — PASS

> 保存当前配置（名称/说明/参数摘要）到 localStorage 并持久；应用配置（有图片 confirm）恢复网格/编号/字体/导出并重排图片；导出 JSON payload（type/schemaVersion/name/description/appVersion/createdAt/layout/label/export，无 cells/dataURL）可重新导入；错误 type/未来 schemaVersion/非法 JSON 中文报错不落盘；API 与主题/历史/自动保存隔离

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.4.0 契约：应用版本 >= 1.4.0（当前 1.5.1） | 1.5.1 |
| ✅ | v1.4.0 契约：配置 API 齐全（getConfigSnapshot/normalizeConfigSnapshot/applyConfigSnapshot） | [] |
| ✅ | v1.4.0 契约：__CONFIG_PROFILES__ 运行时提供 list/saveCurrent/apply/importJson | {"present":true,"list":true,"saveCurrent":true,"apply":true,"importJson":true} |
| ✅ | v1.4.0 契约：左侧配置卡/对话框/导入预览等 DOM 齐全 | [] |
| ✅ | v1.4.0 契约：getConfigSnapshot 含 layout/label/export 且不含 cells/filename | {"keys":["layout","label","export"],"shape":{"rows":3,"cols":2,"font":"times","format":"png","hasFilename":false,"hasCells":false}} |
| ✅ | v1.4.0 契约：#config-count 初始文案可读（本机 0 个） | 本机 0 个 |
| ✅ | 当前配置快照：3×2、170mm、列距3/行距1、Arial 11pt、PDF 300DPI 裁边1.5 矢量 | {"layout":{"rows":3,"cols":2,"widthMm":170,"aspectW":4,"aspectH":3,"colGap":3,"rowGap":1,"margin":0,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"… |
| ✅ | 配置对话框打开，保存摘要包含当前参数（3 行×2 列/170mm/列距/行距/Arial/PDF/裁边/矢量） | 将保存：3 行 × 2 列 · 170 mm · 列距 3 / 行距 1 mm · 编号 底部中间 / Arial 11pt · PDF 300 DPI · 自动裁边1.5mm · 矢量 |
| ✅ | 保存到本机：#config-count=本机 1 个、localStorage 1 条配置 | {"countText":"本机 1 个","storage":["3×2 论文模板"]} |
| ✅ | 保存后列表项显示名称/说明/参数摘要 | {"name":"3×2 论文模板","desc":"Arial 11pt · 底部编号 · 列距3 行距1 · PDF 300DPI 自动裁边1.5mm 矢量","summary":"3 行 × 2 列 · 170 mm · 列距 3 / 行距 1 mm · 编号 底部中间 / Arial 11pt · PDF 300 DPI · 自动裁边1.5mm · 矢量","date":"2026-11-06 23:43","actions":[{"action":"apply","id":"cfg-mw559v3s-ws2338"},{"action":"export","id":"cfg-mw55… |
| ✅ | 保存状态/提示为「已保存」 | 已保存「3×2 论文模板」到本机 |
| ✅ | localStorage 配置结构完整（type/schemaVersion/name/description/appVersion/createdAt/layout/label/export） | {"type":"figureplay-config","schemaVersion":1,"name":"3×2 论文模板","description":"Arial 11pt · 底部编号 · 列距3 行距1 · PDF 300DPI 自动裁边1.5mm 矢量","appVersion":"1.5.1","createdAt":"2026-11-06T15:43:54.041Z","layout":{"rows":3,"cols":2,"widthMm":170,"aspectW":4,"aspectH":3,"colGap":3,"rowGap":1,"margin":0,"bgMode… |
| ✅ | 本机配置存储不含图片/cells/dataURL | {"length":953} |
| ✅ | reload 后本机配置持久（count=1、名称仍为 3×2 论文模板） | {"countText":"本机 1 个","storage":["3×2 论文模板"]} |
| ✅ | reload 后列表项/摘要仍可读 | 3 行 × 2 列 · 170 mm · 列距 3 / 行距 1 mm · 编号 底部中间 / Arial 11pt · PDF 300 DPI · 自动裁边1.5mm · 矢量 |
| ✅ | 应用配置时有图片且网格变化 → 出现 confirm（重排/可能丢弃提示）并被接受 | ["应用配置会按当前顺序把已有图片重排到 3 行 × 2 列网格；配置本身不包含图片，可能移动或丢弃超出网格的图片。继续？"] |
| ✅ | 应用后网格/间距/编号/字体恢复（3×2、列距3、行距1、number-dot、Arial 11pt、bc） | {"layout":{"rows":3,"cols":2,"widthMm":170,"aspectW":4,"aspectH":3,"colGap":3,"rowGap":1,"margin":0,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"… |
| ✅ | 应用后导出设置恢复（PDF/300DPI/裁边1.5/矢量） | {"format":"pdf","dpi":300,"jpgQuality":0.95,"transparent":false,"scope":"current","saveAs":true,"vectorPdf":true,"trimPdf":true,"trimMarginMm":1.5} |
| ✅ | 应用配置后图片数量与顺序保持（2 张、按行重排顺序不变） | {"before":["sample-1.png","sample-2.png"],"after":["sample-1.png","sample-2.png"]} |
| ✅ | 应用后左侧「最近应用」显示配置名称/说明 | {"active":"3×2 论文模板","desc":"Arial 11pt · 底部编号 · 列距3 行距1 · PDF 300DPI 自动裁边1.5mm 矢量"} |
| ✅ | 无图片时应用配置不弹 confirm 且网格恢复 3×2 | {"noConfirmCount":0,"rows":3} |
| ✅ | 导出 JSON 文件名 .figureplay.json 且为合法 JSON | {"filename":"3×2_论文模板.figureplay.json","size":1286} |
| ✅ | 导出 payload：type/schemaVersion/name/description/appVersion/createdAt/layout/label/export 完整 | ["type","schemaVersion","name","description","appVersion","createdAt","layout","label","export"] |
| ✅ | 导出 JSON 不含图片/cells/dataURL/base64 | {"length":1246} |
| ✅ | 导入有效 JSON：先显示预览（名称/说明/参数摘要）且不立即落盘 | {"preview":{"countText":"本机 1 个","activeVisible":true,"activeName":"3×2 论文模板","activeDesc":"Arial 11pt · 底部编号 · 列距3 行距1 · PDF 300DPI 自动裁边1.5mm 矢量","storageHintText":"配置保存在当前浏览器本地；换电脑请用“导出 JSON”迁移。","storageHintVisible":true,"dialogOpen":true,"nameValue":"","descValue":"","saveSummary":"将保存：2 行 × 2 列… |
| ✅ | 取消导入：预览隐藏、本机配置数量不变 | null |
| ✅ | 导入预览点「应用此配置」：网格恢复 3×2、配置数量不变 | {"project":{"pageCount":1,"pageIndex":0,"rows":3,"cols":2,"filled":0,"cellNames":[null,null,null,null,null,null]},"count":1} |
| ✅ | 导入后点「保存到本机」：数量 1→2 且 localStorage 持久 | {"countText":"本机 2 个","names":["3×2 论文模板","3×2 论文模板"]} |
| ✅ | 无效导入（错误 type）：中文错误提示且不落盘 | {"toast":"导入失败：不是 FigurePlay 配置文件（缺少 type=figureplay-config）","count":2} |
| ✅ | 无效导入（未来 schemaVersion）：中文错误提示且不落盘 | {"toast":"导入失败：配置文件版本较新（v99），当前程序最高支持 v1，请升级 FigurePlay","count":2} |
| ✅ | 无效导入（非法 JSON）：中文错误提示且不落盘 | {"toast":"导入失败：JSON 解析失败：Expected property name or '}' in JSON at position 1 (line 1 column 2)","count":2} |
| ✅ | API getConfigSnapshot 返回 layout/label/export（无 cells/filename） | {"keys":["layout","label","export"]} |
| ✅ | API normalizeConfigSnapshot：补全/规范化 layout/label/export | {"layout":{"rows":2,"cols":2,"widthMm":120,"aspectW":4,"aspectH":3,"colGap":0,"rowGap":0,"margin":0,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"… |
| ✅ | API applyConfigSnapshot：返回 ok/layoutChanged 且网格/编号/导出生效 | {"result":{"ok":true,"layoutChanged":true,"dropped":0,"layout":{"rows":2,"cols":2,"widthMm":120,"aspectW":4,"aspectH":3,"colGap":0,"rowGap":0,"margin":0,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTop… |
| ✅ | API 重复应用同一配置：layoutChanged=false、dropped=0（无脏变化） | {"ok":true,"layoutChanged":false,"dropped":0,"layout":{"rows":2,"cols":2,"widthMm":120,"aspectW":4,"aspectH":3,"colGap":0,"rowGap":0,"margin":0,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"pa… |
| ✅ | 保存配置不改变主题/外观（仍为 dark + violet） | {"appearance":{"mode":"dark","theme":"dark","accent":"violet"},"theme":"dark","accent":"violet"} |
| ✅ | 保存配置不新增项目历史记录（undoCount 不变） | {"before":{"canUndo":true,"canRedo":false,"undoCount":2,"redoCount":0},"after":{"canUndo":true,"canRedo":false,"undoCount":2,"redoCount":0}} |
| ✅ | 项目自动保存 payload 不含配置列表（configProfiles/figureplay-config） | {"pages":1,"hasConfig":false} |
| ✅ | 应用配置后主题仍为 dark + violet | {"theme":"dark","mode":"dark","accent":"violet","colorScheme":"dark"} |
| ✅ | 应用配置恢复保存时参数（3×2 / 编号 alpha-paren / Times / PNG） | {"layout":{"rows":3,"cols":2,"widthMm":120,"aspectW":4,"aspectH":3,"colGap":0,"rowGap":0,"margin":0,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"… |
| ✅ | 应用配置产生的历史记录不超过 1 步（非多步脏记录） | {"before":3,"after":4} |
| ✅ | 重复应用同一配置不再新增历史（历史去重） | {"first":4,"second":4} |
| ✅ | 本机配置存储独立于项目（config key 有 1 条、session 不含配置） | {"count":1,"sessionHasConfigKey":false} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.4.0 配置模板契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"runtime":{"present":true,"list":true,"saveCurrent":true,"apply":true,"importJson":true},"missingIds":[],"snapshotKeys":["layout","label","export"],"snapshotShape":{"rows":3,"cols":2,"font":"times","format":"png","hasFilename":false,"hasCells":false},"countText":"本机 0 个"}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![X-01-config-profiles.png](<screens-v1.5.1/X-01-config-profiles.png>)

关键证据：

```json
{
  "v140Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "runtime": {
      "present": true,
      "list": true,
      "saveCurrent": true,
      "apply": true,
      "importJson": true
    },
    "missingIds": [],
    "snapshotKeys": [
      "layout",
      "label",
      "export"
    ],
    "snapshotShape": {
      "rows": 3,
      "cols": 2,
      "font": "times",
      "format": "png",
      "hasFilename": false,
      "hasCells": false
    },
    "countText": "本机 0 个"
  },
  "configProfiles": {
    "targetSnapshot": {
      "rows": 3,
      "cols": 2,
      "widthMm": 170,
      "colGap": 3,
      "rowGap": 1,
      "font": "arial",
      "fontSizePt": 11,
      "scheme": "number-dot",
      "position": "bc",
      "format": "pdf",
      "dpi": 300,
      "trimPdf": true,
      "trimMarginMm": 1.5,
      "vectorPdf": true
    },
    "exportedJson": {
      "type": "figureplay-config",
      "schemaVersion": 1,
      "name": "3×2 论文模板",
      "appVersion": "1.5.1",
      "createdAt": "2026-11-06T15:43:54.041Z",
      "keys": [
        "type",
        "schemaVersion",
        "name",
        "description",
        "appVersion",
        "createdAt",
        "layout",
        "label",
        "export"
      ]
    },
    "importPreview": {
      "name": "3×2 论文模板",
      "summary": true
    },
    "invalidImports": [
      "错误 type",
      "未来 schemaVersion",
      "非法 JSON"
    ],
    "history": {
      "beforeSave": 2,
      "afterApply": 4,
      "afterSameApply": 4
    },
    "themeIsolation": {
      "theme": "dark",
      "accent": "violet"
    },
    "autosaveNoConfig": true,
    "appliedImages": {
      "before": [
        "sample-1.png",
        "sample-2.png"
      ],
      "after": [
        "sample-1.png",
        "sample-2.png"
      ]
    }
  }
}
```

## Y. 矢量标签bbox — PASS

> 配置1（2×3/170mm/4:3/colGap-4/rowGap1/autoPad，label bc/inset1.5/offsetX1/offsetY4/Times9）下 stub FP.desktop.exportVectorPdf 捕获 spec：labels 含 textLeftMm/textTopMm/textWmm/textHmm，与预览 .label-text getBBox 一致（±0.05mm）；(c) top≈43.58/height≈3.44；导出前 await document.fonts.ready 且 bbox 稳定

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.3 契约：应用版本 >= 1.3（当前 1.5.1） | 1.5.1 |
| ✅ | v1.3 契约：API 方法齐全（setExportOptions/setLayoutOptions/setLabelConfig/getPadInfo/getLabelBoxes/getCropBox/getVectorStatus/exportVectorPdfBase64） | [] |
| ✅ | v1.3 契约：state.export 含 saveAs/vectorPdf/trimPdf/trimMarginMm | [] |
| ✅ | v1.3 契约：state.layout 含 autoPad/padTopMm/padRightMm/padBottomMm/padLeftMm | [] |
| ✅ | v1.3 契约：行/列输入 max=500 | {"rowsMax":"500","colsMax":"500"} |
| ✅ | v1.3 契约：保存位置行默认勾选 | {"rowVisible":true,"checked":true,"saveAs":true} |
| ✅ | v1.3 契约：PDF 裁剪/矢量 PDF 控件存在 | {"trimRow":true,"trimToggle":true,"trimMargin":true,"vectorRow":true} |
| ✅ | v1.3 契约：滑块数字输入存在（cell-zoom-num/jpg-quality-num/label-bg-opacity-num） | [{"present":true,"min":"20","max":"400","step":"1","value":"100","rangePresent":true,"rangeValue":"100"},{"present":true,"min":"60","max":"100","step":"1","value":"95","rangePresent":true,"rangeValue":"95"},{"present":true,"min":"0","max":"100","step":"1","value":"75","rangePresent":true,"rangeValue… |
| ✅ | v1.4.1 契约：应用版本 >= 1.4.1（当前 1.5.1） | 1.5.1 |
| ✅ | v1.4.1 契约：exportVectorPdfBase64 API 可用 | null |
| ✅ | v1.4.1 契约：document.fonts 可用（字体度量稳定） | {"fontsStatus":"loaded"} |
| ✅ | 配置1就绪：6 子图/编号（EMF 矢量图可用、PDF 格式） | {"vectorStatus":{"emfCount":1,"unsupported":false,"desktop":true,"vectorAvailable":true,"vectorPdf":true},"imageCount":6} |
| ✅ | 字体已 ready（document.fonts.status=loaded） | {"status":"loaded","hasFonts":true,"checkTimes9":true} |
| ✅ | 配置1 预览编号 6 个且文本为 (a)…(f) | ["(a)","(b)","(c)","(d)","(e)","(f)"] |
| ✅ | 配置1 autoPad 生效（页面高度=base+底部页距、标签在页内） | {"geom":{"rows":2,"cols":3,"widthMm":170,"heightMm":93.40000000000002,"cellW":59.333333333333336,"cellH":44.50000000000001,"panelCount":6},"pads":{"top":0,"right":0,"bottom":3.4,"left":0,"autoPad":true,"pageWidthMm":170,"pageHeightMm":93.40000000000002,"baseWidthMm":170,"baseHeightMm":90.00000000000… |
| ✅ | 预览 label-text 使用 Times 字体（9pt 字号见 spec 断言） | {"fontFamily":"\"Times New Roman\", Times, \"Liberation Serif\", serif","textAnchor":"middle"} |
| ✅ | stub 捕获矢量导出成功（exportVectorPdfBase64.ok=true，调用 1 次） | {"exportResult":{"ok":true,"base64":"JVBERi0xLjQKJcfsj6IKJSVFT0YK","bytes":20,"engine":"Stub-PowerPoint","vectorPanels":1,"rasterPanels":5},"stubCount":1} |
| ✅ | spec.labels 6 项且每项含 textLeftMm/textTopMm/textWmm/textHmm（有限数值） | [{"text":"(a)","xMm":30.666666666666668,"yMm":46.33325000000001,"boxXmm":28.206258707682295,"boxYmm":43.825,"boxWmm":4.92081591796875,"boxHmm":3.4924999999999997,"textLeftMm":28.903730392456055,"textTopMm":43.50711441040039,"textWmm":3.552748441696167,"textHmm":3.4783823490142822,"fontSizePt":9,"fon… |
| ✅ | spec.labels text 与预览编号顺序/文本一致 | [{"spec":"(a)","dom":"(a)"},{"spec":"(b)","dom":"(b)"},{"spec":"(c)","dom":"(c)"},{"spec":"(d)","dom":"(d)"},{"spec":"(e)","dom":"(e)"},{"spec":"(f)","dom":"(f)"}] |
| ✅ | spec bbox 四字段与预览 .label-text getBBox 一致（±0.05mm） | [{"text":"(a)","domText":"(a)","dx":0,"dy":0,"dw":0,"dh":0,"spec":{"left":28.903730392456055,"top":43.50711441040039,"w":3.552748441696167,"h":3.4783823490142822},"dom":{"x":28.903730392456055,"y":43.50711441040039,"w":3.552748441696167,"h":3.4783823490142822}},{"text":"(b)","domText":"(b)","dx":0,"… |
| ✅ | 配置1 (c) 的 textTopMm≈43.58、textHmm≈3.44（±0.15/±0.1） | {"text":"(c)","domText":"(c)","dx":0,"dy":0,"dw":0,"dh":0,"spec":{"left":139.57032775878906,"top":43.50711441040039,"w":3.552741765975952,"h":3.4783823490142822},"dom":{"x":139.57032775878906,"y":43.50711441040039,"w":3.552741765975952,"h":3.4783823490142822}} |
| ✅ | spec 同时保留字号/字体/对齐等原有 label 字段 | [{"size":9,"font":"Times New Roman","align":"center"},{"size":9,"font":"Times New Roman","align":"center"},{"size":9,"font":"Times New Roman","align":"center"},{"size":9,"font":"Times New Roman","align":"center"},{"size":9,"font":"Times New Roman","align":"center"},{"size":9,"font":"Times New Roman"… |
| ✅ | stub 捕获时字体状态已 loaded（导出路径 await document.fonts.ready） | loaded |
| ✅ | 第二次导出 spec.labels bbox 与第一次完全一致（字体 ready 后无抖动） | {"count":2,"fontStatusAgain":"loaded"} |
| ✅ | 两次导出间预览 getBBox 不变（字体度量稳定） | {"fontsAgain":{"status":"loaded","hasFonts":true,"checkTimes9":true},"before":["(a)","(b)","(c)","(d)","(e)","(f)"],"after":["(a)","(b)","(c)","(d)","(e)","(f)"]} |
| ✅ | 第二次导出在字体 ready 后捕获（fontStatus=loaded） | loaded |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.3 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingExportFields":[],"missingLayoutFields":[],"exportValues":{"saveAs":true,"vectorPdf":true,"trimPdf":false,"trimMarginMm":0},"layoutValues":{"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"ui":{"rowsInput":{"max":"500","min":"1","value":"3"},"colsInput":{"max":"500","min":"1","value":"2"},"saveAsRow":true,"saveAsChecked":true,"pdfTrimRowExists":true,"pdfTrimToggleExists":true,"pdfTrimMarginExists":true,"vec…
- v1.4.1 label bbox 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"hasExportVectorPdfBase64":true,"hasDesktop":true,"hasFonts":true,"fontsStatus":"loaded","labelTextCount":0}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![Y-01-label-spec-bbox.png](<screens-v1.5.1/Y-01-label-spec-bbox.png>)

关键证据：

```json
{
  "v13Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "missingExportFields": [],
    "missingLayoutFields": [],
    "exportValues": {
      "saveAs": true,
      "vectorPdf": true,
      "trimPdf": false,
      "trimMarginMm": 0
    },
    "layoutValues": {
      "autoPad": true,
      "padTopMm": 0,
      "padRightMm": 0,
      "padBottomMm": 0,
      "padLeftMm": 0
    },
    "ui": {
      "rowsInput": {
        "max": "500",
        "min": "1",
        "value": "3"
      },
      "colsInput": {
        "max": "500",
        "min": "1",
        "value": "2"
      },
      "saveAsRow": true,
      "saveAsChecked": true,
      "pdfTrimRowExists": true,
      "pdfTrimToggleExists": true,
      "pdfTrimMarginExists": true,
      "vectorPdfRowExists": true,
      "autoPadToggleChecked": true,
      "padManualHidden": true,
      "numberInputs": [
        {
          "present": true,
          "min": "20",
          "max": "400",
          "step": "1",
          "value": "100",
          "rangePresent": true,
          "rangeValue": "100"
        },
        {
          "present": true,
          "min": "60",
          "max": "100",
          "step": "1",
          "value": "95",
          "rangePresent": true,
          "rangeValue": "95"
        },
        {
          "present": true,
          "min": "0",
          "max": "100",
          "step": "1",
          "value": "75",
          "rangePresent": true,
          "rangeValue": "75"
        }
      ]
    }
  },
  "v141Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "hasExportVectorPdfBase64": true,
    "hasDesktop": true,
    "hasFonts": true,
    "fontsStatus": "loaded",
    "labelTextCount": 0
  },
  "labelBBox": {
    "fonts": {
      "status": "loaded",
      "statusAgain": "loaded",
      "checkTimes9": true
    },
    "geom": {
      "rows": 2,
      "cols": 3,
      "widthMm": 170,
      "heightMm": 93.40000000000002,
      "cellW": 59.333333333333336,
      "cellH": 44.50000000000001
    },
    "pads": {
      "top": 0,
      "right": 0,
      "bottom": 3.4,
      "left": 0,
      "autoPad": true,
      "pageWidthMm": 170,
      "pageHeightMm": 93.40000000000002,
      "baseWidthMm": 170,
      "baseHeightMm": 90.00000000000001
    },
    "vectorStatus": {
      "emfCount": 1,
      "unsupported": false,
      "desktop": true,
      "vectorAvailable": true,
      "vectorPdf": true
    },
    "labels": [
      {
        "text": "(a)",
        "domText": "(a)",
        "dx": 0,
        "dy": 0,
        "dw": 0,
        "dh": 0,
        "spec": {
          "left": 28.903730392456055,
          "top": 43.50711441040039,
          "w": 3.552748441696167,
          "h": 3.4783823490142822
        },
        "dom": {
          "x": 28.903730392456055,
          "y": 43.50711441040039,
          "w": 3.552748441696167,
          "h": 3.4783823490142822
        }
      },
      {
        "text": "(b)",
        "domText": "(b)",
        "dx": 0,
        "dy": 0,
        "dw": 0,
        "dh": 0,
        "spec": {
          "left": 84.14871215820312,
          "top": 43.50711441040039,
          "w": 3.7309772968292236,
          "h": 3.4783823490142822
        },
        "dom": {
          "x": 84.14871215820312,
          "y": 43.50711441040039,
          "w": 3.7309772968292236,
          "h": 3.4783823490142822
        }
      },
      {
        "text": "(c)",
        "domText": "(c)",
        "dx": 0,
        "dy": 0,
        "dw": 0,
        "dh": 0,
        "spec": {
          "left": 139.57032775878906,
          "top": 43.50711441040039,
          "w": 3.552741765975952,
          "h": 3.4783823490142822
        },
        "dom": {
          "x": 139.57032775878906,
          "y": 43.50711441040039,
          "w": 3.552741765975952,
          "h": 3.4783823490142822
        }
      },
      {
        "text": "(d)",
        "domText": "(d)",
        "dx": 0,
        "dy": 0,
        "dw": 0,
        "dh": 0,
       …
```

## Z. 配置宿主持久化 — PASS

> 桌面宿主 mock：配置模块 init 调 FP.desktop.loadConfigProfiles；宿主无文件但 localStorage 有配置→迁移并调 save；#config-storage-hint 显示宿主路径；保存/删除/导入触发 host save；清空 localStorage 后从 host 恢复；浏览器模式仍仅 localStorage

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.4.0 契约：应用版本 >= 1.4.0（当前 1.5.1） | 1.5.1 |
| ✅ | v1.4.0 契约：配置 API 齐全（getConfigSnapshot/normalizeConfigSnapshot/applyConfigSnapshot） | [] |
| ✅ | v1.4.0 契约：__CONFIG_PROFILES__ 运行时提供 list/saveCurrent/apply/importJson | {"present":true,"list":true,"saveCurrent":true,"apply":true,"importJson":true} |
| ✅ | v1.4.0 契约：左侧配置卡/对话框/导入预览等 DOM 齐全 | [] |
| ✅ | v1.4.0 契约：getConfigSnapshot 含 layout/label/export 且不含 cells/filename | {"keys":["layout","label","export"],"shape":{"rows":3,"cols":2,"font":"times","format":"png","hasFilename":false,"hasCells":false}} |
| ✅ | v1.4.0 契约：#config-count 初始文案可读（本机 0 个） | 本机 0 个 |
| ✅ | 桌面宿主可用：配置模块 init 调用 FP.desktop.loadConfigProfiles() | {"requestType":"load-config-profiles"} |
| ✅ | 宿主初始无文件但 localStorage 有旧配置（迁移前置条件） | {"hostExists":false,"localCount":1} |
| ✅ | 宿主无文件 + localStorage 有配置 → 迁移并调用 saveConfigProfiles（含旧配置 id） | {"names":["旧版本地配置"],"ids":["cfg-old-local-1"]} |
| ✅ | #config-storage-hint 显示宿主路径（迁移后） | 桌面版本机配置：C:\Users\E2E\AppData\Roaming\FigurePlay\configs\profiles.json（每次保存自动生成时间戳备份） |
| ✅ | 迁移后旧配置仍保留在 localStorage（不清空） | {"local":["旧版本地配置"]} |
| ✅ | 迁移后列表显示旧配置（1 个） | ["旧版本地配置"] |
| ✅ | reload 后从宿主加载配置（数量/名称/路径提示正确） | {"count":1,"hint":"桌面版本机配置：C:\\Users\\E2E\\AppData\\Roaming\\FigurePlay\\configs\\profiles.json（每次保存自动生成时间戳备份）","saveCalls":0} |
| ✅ | 宿主已有文件且无额外本地配置时不再触发迁移 save | {"saveCalls":0,"saveBaseline":1} |
| ✅ | 保存配置触发 saveConfigProfiles（宿主收到 2 条：旧配置+新配置） | {"names":["宿主新配置","旧版本地配置"]} |
| ✅ | 宿主保存后 #config-count=2、路径提示保持宿主路径 | {"count":"本机 2 个","hint":"桌面版本机配置：C:\\Users\\E2E\\AppData\\Roaming\\FigurePlay\\configs\\profiles.json（每次保存自动生成时间戳备份）"} |
| ✅ | 删除配置触发 host save（宿主仅剩「宿主新配置」） | {"names":["宿主新配置"]} |
| ✅ | 导入配置点“保存到本机”触发 host save（宿主 2 条，含导入名称） | {"names":["导入到宿主配置","宿主新配置"]} |
| ✅ | 清空 localStorage 后从宿主文件恢复配置（数量/名称一致） | {"count":2,"names":["导入到宿主配置","宿主新配置"],"hint":"桌面版本机配置：C:\\Users\\E2E\\AppData\\Roaming\\FigurePlay\\configs\\profiles.json（每次保存自动生成时间戳备份）"} |
| ✅ | 恢复后重新写入 localStorage（宿主 → 本地缓存） | null |
| ✅ | 宿主配置保存不改变主题/外观（dark+violet） | {"theme":"dark","mode":"dark","accent":"violet","colorScheme":"dark"} |
| ✅ | 宿主配置保存不新增项目历史记录 | {"before":{"canUndo":false,"canRedo":false,"undoCount":0,"redoCount":0},"after":{"canUndo":false,"canRedo":false,"undoCount":0,"redoCount":0}} |
| ✅ | 项目自动保存 payload 不含配置/宿主路径（configProfiles/figureplay-config/AppData） | {"hasConfig":false} |
| ✅ | 浏览器模式：无桌面桥/配置初始为空，提示为浏览器本地存储 | {"hint":"配置保存在当前浏览器本地；换电脑请用“导出 JSON”迁移。"} |
| ✅ | 浏览器模式保存配置写入 localStorage（无 host 消息） | {"names":["浏览器本地配置"]} |
| ✅ | 浏览器模式 #config-storage-hint 为非宿主提示 | null |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.4.0 配置模板契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"runtime":{"present":true,"list":true,"saveCurrent":true,"apply":true,"importJson":true},"missingIds":[],"snapshotKeys":["layout","label","export"],"snapshotShape":{"rows":3,"cols":2,"font":"times","format":"png","hasFilename":false,"hasCells":false},"countText":"本机 0 个"}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![Z-01-config-host-persistence.png](<screens-v1.5.1/Z-01-config-host-persistence.png>)

关键证据：

```json
{
  "v140Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "runtime": {
      "present": true,
      "list": true,
      "saveCurrent": true,
      "apply": true,
      "importJson": true
    },
    "missingIds": [],
    "snapshotKeys": [
      "layout",
      "label",
      "export"
    ],
    "snapshotShape": {
      "rows": 3,
      "cols": 2,
      "font": "times",
      "format": "png",
      "hasFilename": false,
      "hasCells": false
    },
    "countText": "本机 0 个"
  },
  "hostConfig": {
    "hostPath": "C:\\Users\\E2E\\AppData\\Roaming\\FigurePlay\\configs\\profiles.json",
    "migration": {
      "fromLocal": "旧版本地配置",
      "savedNames": [
        "旧版本地配置"
      ]
    },
    "reloadFromHost": {
      "names": [
        "导入到宿主配置",
        "宿主新配置"
      ],
      "saveCalls": 1
    },
    "saveNew": [
      "宿主新配置",
      "旧版本地配置"
    ],
    "deleteSave": [
      "宿主新配置"
    ],
    "importSave": [
      "导入到宿主配置",
      "宿主新配置"
    ],
    "restoreAfterLocalClear": [
      "导入到宿主配置",
      "宿主新配置"
    ],
    "browserMode": {
      "localStorage": "浏览器本地配置",
      "hint": "配置保存在当前浏览器本地；换电脑请用“导出 JSON”迁移。"
    },
    "isolation": {
      "theme": {
        "theme": "dark",
        "mode": "dark",
        "accent": "violet",
        "colorScheme": "dark"
      },
      "historyBefore": 0,
      "historyAfter": 0
    }
  }
}
```

## AA. 工程文件 — PASS

> 工程文件真实下载 .figureplay-project（API getProjectSnapshot 含 pages/dataURL/emfBase64/layout/label/groups/export）；改布局/清空后通过文件输入打开恢复页数/图片/配置/分组；错误 type/版本/JSON 中文报错

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.5.0 契约：应用版本 >= 1.5.0（当前 1.5.1） | 1.5.1 |
| ✅ | v1.5.0 契约：工程文件 API 齐全（getProjectSnapshot/loadProjectSnapshot） | [] |
| ✅ | v1.5.0 契约：工程/期刊/预检/更新模块运行时齐全 | {"projectFiles":true,"journal":true,"preflight":true,"updates":true} |
| ✅ | v1.5.0 契约：新增 UI（工程卡/期刊库/更新/备份/矢量）DOM 齐全 | [] |
| ✅ | getProjectSnapshot：type/schemaVersion/project.pages（2 页） | {"type":"figureplay-project","schema":1,"pages":2} |
| ✅ | 工程快照 page1 含图片 dataURL、layout/label/groups 与 export | {"cells":[{"name":"sample-1.png","w":1200,"h":900},{"name":"sample-2.png","w":1200,"h":900}],"groups":[{"id":"group-vgvvksd","name":"工程组","color":"#2563eb","scheme":"alpha-paren","start":1,"panels":[0,1]}],"layout":{"rows":2,"cols":2,"widthMm":170,"aspectW":4,"aspectH":3,"colGap":2,"rowGap":2,"margi… |
| ✅ | 工程快照 page2 含 1 张图片与同尺寸布局 | {"cells":1,"layout":{"rows":2,"cols":2,"widthMm":170,"aspectW":4,"aspectH":3,"colGap":2,"rowGap":2,"margin":0,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLe… |
| ✅ | 真实下载 .figureplay-project（文件扩展名/JSON/2 页/含 dataURL） | {"filename":"figureplay-project-20261106-2344.figureplay-project","size":118986} |
| ✅ | 保存后 #project-file-status 提示已保存工程 | 已保存工程：116.2 KB |
| ✅ | 打开工程恢复页数/图片/布局/编号/导出（2 页 3 图、2×2/170mm/Arial8/PDF） | {"preview":{"pageCount":2,"pageIndex":0,"imageCount":2},"snapshot":{"type":"figureplay-project","schemaVersion":1,"appVersion":"1.5.1","savedAt":"2026-11-06T15:44:07.118Z","pages":2,"images":3,"groups":1,"pageSizes":[{"rows":2,"cols":2,"widthMm":170},{"rows":2,"cols":2,"widthMm":170}]}} |
| ✅ | 打开工程恢复分组（工程组/面板[0,1]） | [{"id":"group-vgvvksd","name":"工程组","color":"#2563eb","scheme":"alpha-paren","start":1,"panels":[0,1]}] |
| ✅ | 打开工程后 #project-file-meta/状态更新（2 页 · 3 图、已打开工程） | {"meta":"2 页 · 3 图","status":"已打开工程：fp-v15-project.figureplay-project"} |
| ✅ | 打开工程错误文件（错误 type）：中文报错且工程状态不变 | {"status":"打开工程失败：不是 FigurePlay 工程文件（缺少 type=figureplay-project）","pages":2,"images":2} |
| ✅ | 打开工程错误文件（未来 schemaVersion）：中文报错且工程状态不变 | {"status":"打开工程失败：工程文件版本较新（v99），当前程序最高支持 v1，请升级 FigurePlay","pages":2,"images":2} |
| ✅ | 打开工程错误文件（非法 JSON）：中文报错且工程状态不变 | {"status":"工程文件不是有效 JSON","pages":2,"images":2} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.5.0 新功能契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"globals":{"projectFiles":true,"journal":true,"preflight":true,"updates":true},"desktop":{"available":false,"exportVectorPdfMulti":true,"listConfigBackups":true,"readConfigBackup":true,"checkUpdate":true,"downloadUpdate":true},"missingIds":[],"projectMeta":"1 页 · 0 图","journalCards":0}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![AA-01-project-file.png](<screens-v1.5.1/AA-01-project-file.png>)

关键证据：

```json
{
  "v150Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "globals": {
      "projectFiles": true,
      "journal": true,
      "preflight": true,
      "updates": true
    },
    "desktop": {
      "available": false,
      "exportVectorPdfMulti": true,
      "listConfigBackups": true,
      "readConfigBackup": true,
      "checkUpdate": true,
      "downloadUpdate": true
    },
    "missingIds": [],
    "projectMeta": "1 页 · 0 图",
    "journalCards": 0
  },
  "projectFile": {
    "snapshot": {
      "pages": 2,
      "page1Images": 2,
      "page2Images": 1,
      "groups": 1
    },
    "file": {
      "filename": "fp-v15-project.figureplay-project",
      "size": 118986
    },
    "restored": {
      "type": "figureplay-project",
      "schemaVersion": 1,
      "appVersion": "1.5.1",
      "savedAt": "2026-11-06T15:44:07.118Z",
      "pages": 2,
      "images": 3,
      "groups": 1,
      "pageSizes": [
        {
          "rows": 2,
          "cols": 2,
          "widthMm": 170
        },
        {
          "rows": 2,
          "cols": 2,
          "widthMm": 170
        }
      ]
    },
    "errors": [
      "错误 type",
      "未来 schemaVersion",
      "非法 JSON"
    ]
  }
}
```

## AB. 配置备份恢复 — PASS

> 宿主 mock 下配置备份按钮出现；listConfigBackups/readConfigBackup；恢复最新备份替换配置列表并触发 host save；浏览器模式隐藏按钮

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.5.0 契约：应用版本 >= 1.5.0（当前 1.5.1） | 1.5.1 |
| ✅ | v1.5.0 契约：工程文件 API 齐全（getProjectSnapshot/loadProjectSnapshot） | [] |
| ✅ | v1.5.0 契约：工程/期刊/预检/更新模块运行时齐全 | {"projectFiles":true,"journal":true,"preflight":true,"updates":true} |
| ✅ | v1.5.0 契约：新增 UI（工程卡/期刊库/更新/备份/矢量）DOM 齐全 | [] |
| ✅ | 桌面宿主下配置对话框显示「恢复上一份备份」按钮 | true |
| ✅ | 恢复备份：先 listConfigBackups 再 readConfigBackup（最新备份名） | {"readName":"profiles-2026-11-06-1200.json","confirm":"用本机备份「profiles-2026-11-06-1200.json」（2026-11-06 20:00）替换当前配置列表？\n当前列表会先自动保存为一份新备份。"} |
| ✅ | 恢复后配置列表=备份内容（2 个：备份配置 B/C）并触发 host save | {"names":["备份配置 B","备份配置 C"],"saved":["备份配置 B","备份配置 C"]} |
| ✅ | 恢复后状态文案显示已从备份恢复 | 已从备份恢复 2 个配置（profiles-2026-11-06-1200.json） |
| ✅ | 浏览器模式隐藏「恢复上一份备份」按钮 | true |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.5.0 新功能契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"globals":{"projectFiles":true,"journal":true,"preflight":true,"updates":true},"desktop":{"available":true,"exportVectorPdfMulti":true,"listConfigBackups":true,"readConfigBackup":true,"checkUpdate":true,"downloadUpdate":true},"missingIds":[],"projectMeta":"1 页 · 0 图","journalCards":0}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![AB-01-config-backup.png](<screens-v1.5.1/AB-01-config-backup.png>)

关键证据：

```json
{
  "v150Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "globals": {
      "projectFiles": true,
      "journal": true,
      "preflight": true,
      "updates": true
    },
    "desktop": {
      "available": true,
      "exportVectorPdfMulti": true,
      "listConfigBackups": true,
      "readConfigBackup": true,
      "checkUpdate": true,
      "downloadUpdate": true
    },
    "missingIds": [],
    "projectMeta": "1 页 · 0 图",
    "journalCards": 0
  },
  "configBackup": {
    "hostPath": "C:\\Users\\E2E\\AppData\\Roaming\\FigurePlay\\configs\\profiles.json",
    "confirm": "用本机备份「profiles-2026-11-06-1200.json」（2026-11-06 20:00）替换当前配置列表？\n当前列表会先自动保存为一份新备份。",
    "backups": [
      "profiles-2026-11-06-1200.json",
      "profiles-2026-11-06-1100.json"
    ],
    "restored": [
      "备份配置 B",
      "备份配置 C"
    ]
  }
}
```

## AC. 期刊配置库 — PASS

> 期刊库 11 预设/5 分组卡片；套用 Nature 单栏后 width=89/Arial8/PDF/trim，网格与图片数量不变；再接 Science 单栏验证

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.5.0 契约：应用版本 >= 1.5.0（当前 1.5.1） | 1.5.1 |
| ✅ | v1.5.0 契约：工程文件 API 齐全（getProjectSnapshot/loadProjectSnapshot） | [] |
| ✅ | v1.5.0 契约：工程/期刊/预检/更新模块运行时齐全 | {"projectFiles":true,"journal":true,"preflight":true,"updates":true} |
| ✅ | v1.5.0 契约：新增 UI（工程卡/期刊库/更新/备份/矢量）DOM 齐全 | [] |
| ✅ | 期刊库对话框：11 个预设卡片、5 个分组标题、免责说明 | {"cards":11,"groups":["Nature","IEEE","Elsevier","Science","学位论文"],"note":"不同期刊/年份的投稿要求可能变化，正式投稿前请以目标期刊最新 Author Guidelines 为准。"} |
| ✅ | 11 预设 ID/名称/尺寸齐全且卡片有套用按钮 | [{"id":"nature-single","name":"Nature 单栏","width":89},{"id":"nature-double","name":"Nature 双栏","width":183},{"id":"ieee-single","name":"IEEE 单栏","width":88.9},{"id":"ieee-double","name":"IEEE 双栏","width":181},{"id":"elsevier-single","name":"Elsevier 单栏","width":90},{"id":"elsevier-1.5","name":"Elsev… |
| ✅ | 期刊库包含 Nature/IEEE/Elsevier/Science/学位论文 分组 | ["Nature","IEEE","Elsevier","Science","学位论文"] |
| ✅ | 套用 Nature 单栏：89mm/4:3/列距2/行距2、Arial 8pt/inset1.2、PDF 300DPI 裁边 | {"layout":{"rows":2,"cols":3,"widthMm":89,"aspectW":4,"aspectH":3,"colGap":2,"rowGap":2,"margin":0,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0},"l… |
| ✅ | 套用期刊后当前网格/图片数量不变（2×3、5 图） | {"rows":2,"cols":3} |
| ✅ | 再套用 Science 单栏：55mm/间距1.5/Arial 7pt | {"layout":{"rows":2,"cols":3,"widthMm":55,"aspectW":4,"aspectH":3,"colGap":1.5,"rowGap":1.5,"margin":0,"bgMode":"white","bgColor":"#ffffff","borderOn":false,"borderWidth":0.25,"borderColor":"#000000","fit":"contain","merges":[],"autoPad":true,"padTopMm":0,"padRightMm":0,"padBottomMm":0,"padLeftMm":0… |
| ✅ | 期刊库应用后图片数量仍为 5 | null |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.5.0 新功能契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"globals":{"projectFiles":true,"journal":true,"preflight":true,"updates":true},"desktop":{"available":false,"exportVectorPdfMulti":true,"listConfigBackups":true,"readConfigBackup":true,"checkUpdate":true,"downloadUpdate":true},"missingIds":[],"projectMeta":"1 页 · 0 图","journalCards":0}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![AC-01-journal-presets.png](<screens-v1.5.1/AC-01-journal-presets.png>)

关键证据：

```json
{
  "v150Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "globals": {
      "projectFiles": true,
      "journal": true,
      "preflight": true,
      "updates": true
    },
    "desktop": {
      "available": false,
      "exportVectorPdfMulti": true,
      "listConfigBackups": true,
      "readConfigBackup": true,
      "checkUpdate": true,
      "downloadUpdate": true
    },
    "missingIds": [],
    "projectMeta": "1 页 · 0 图",
    "journalCards": 0
  },
  "journalPresets": {
    "cards": 11,
    "groups": [
      "Nature",
      "IEEE",
      "Elsevier",
      "Science",
      "学位论文"
    ],
    "presets": [
      "Nature 单栏 89mm",
      "Nature 双栏 183mm",
      "IEEE 单栏 88.9mm",
      "IEEE 双栏 181mm",
      "Elsevier 单栏 90mm",
      "Elsevier 1.5 栏 140mm",
      "Elsevier 双栏 190mm",
      "Science 单栏 55mm",
      "Science 双栏 183mm",
      "中文学位论文 170mm 170mm",
      "中文学位论文 120mm 120mm"
    ],
    "nature": {
      "widthMm": 89,
      "font": "arial",
      "size": 8,
      "format": "pdf",
      "trim": true
    },
    "science": {
      "widthMm": 55,
      "font": "arial",
      "size": 7
    }
  }
}
```

## AD. 图片预检 — PASS

> 低分辨率/小像素图片预检返回中文 warnings；高分辨率无警告；拉伸 fake cell 返回拉伸警告

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.5.0 契约：应用版本 >= 1.5.0（当前 1.5.1） | 1.5.1 |
| ✅ | v1.5.0 契约：工程文件 API 齐全（getProjectSnapshot/loadProjectSnapshot） | [] |
| ✅ | v1.5.0 契约：工程/期刊/预检/更新模块运行时齐全 | {"projectFiles":true,"journal":true,"preflight":true,"updates":true} |
| ✅ | v1.5.0 契约：新增 UI（工程卡/期刊库/更新/备份/矢量）DOM 齐全 | [] |
| ✅ | 低分辨率/小像素图片预检返回中文 DPI/像素 warnings | ["有效分辨率约 36 DPI，低于 150 DPI，打印可能模糊","像素尺寸仅 120×90，建议至少 500×400 px"] |
| ✅ | 预检结果写入 __PREFLIGHT_LAST__ 且 toast 提示中文警告 | {"last":1,"toast":"「low-res-120x90.png」有效分辨率约 36 DPI，低于 150 DPI，打印可能模糊。建议调整格子大小或换用更高分辨率原图。"} |
| ✅ | 高分辨率图片（1200×900）预检无警告 | [{"index":1,"name":"sample-1.png","width":1200,"height":900,"dpiX":362.8571428571428,"dpiY":362.8571428571428,"dpi":362.8571428571428,"fit":"contain","warnings":[]}] |
| ✅ | 拉伸显示 fake cell 预检返回“图片被拉伸/比例”中文 warning | ["有效分辨率约 40 DPI，低于 150 DPI，打印可能模糊","像素尺寸仅 800×100，建议至少 500×400 px","图片被拉伸：原图比例 8.00，格子比例 1.33（变形约 500%）"] |
| ✅ | 拉伸预检结果包含 fit=stretch、宽高与原图比例 | {"index":2,"name":"wide-800x100.png","width":800,"height":100,"dpiX":241.90476190476187,"dpiY":40.317460317460316,"dpi":40.317460317460316,"fit":"stretch","warnings":["有效分辨率约 40 DPI，低于 150 DPI，打印可能模糊","像素尺寸仅 800×100，建议至少 500×400 px","图片被拉伸：原图比例 8.00，格子比例 1.33（变形约 500%）"]} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.5.0 新功能契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"globals":{"projectFiles":true,"journal":true,"preflight":true,"updates":true},"desktop":{"available":false,"exportVectorPdfMulti":true,"listConfigBackups":true,"readConfigBackup":true,"checkUpdate":true,"downloadUpdate":true},"missingIds":[],"projectMeta":"1 页 · 0 图","journalCards":0}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![AD-01-image-preflight.png](<screens-v1.5.1/AD-01-image-preflight.png>)

关键证据：

```json
{
  "v150Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "globals": {
      "projectFiles": true,
      "journal": true,
      "preflight": true,
      "updates": true
    },
    "desktop": {
      "available": false,
      "exportVectorPdfMulti": true,
      "listConfigBackups": true,
      "readConfigBackup": true,
      "checkUpdate": true,
      "downloadUpdate": true
    },
    "missingIds": [],
    "projectMeta": "1 页 · 0 图",
    "journalCards": 0
  },
  "preflight": {
    "low": [
      "有效分辨率约 36 DPI，低于 150 DPI，打印可能模糊",
      "像素尺寸仅 120×90，建议至少 500×400 px"
    ],
    "high": {
      "index": 1,
      "name": "sample-1.png",
      "width": 1200,
      "height": 900,
      "dpiX": 362.8571428571428,
      "dpiY": 362.8571428571428,
      "dpi": 362.8571428571428,
      "fit": "contain",
      "warnings": []
    },
    "stretch": [
      "有效分辨率约 40 DPI，低于 150 DPI，打印可能模糊",
      "像素尺寸仅 800×100，建议至少 500×400 px",
      "图片被拉伸：原图比例 8.00，格子比例 1.33（变形约 500%）"
    ]
  }
}
```

## AE. 更新 UI — PASS

> 桌面 mock 下帮助弹窗检查更新：stub checkUpdate 返回新版本+notes → 显示版本/说明/下载按钮；downloadUpdate 被调用；浏览器模式禁用

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.5.0 契约：应用版本 >= 1.5.0（当前 1.5.1） | 1.5.1 |
| ✅ | v1.5.0 契约：工程文件 API 齐全（getProjectSnapshot/loadProjectSnapshot） | [] |
| ✅ | v1.5.0 契约：工程/期刊/预检/更新模块运行时齐全 | {"projectFiles":true,"journal":true,"preflight":true,"updates":true} |
| ✅ | v1.5.0 契约：新增 UI（工程卡/期刊库/更新/备份/矢量）DOM 齐全 | [] |
| ✅ | 检查更新：显示新版本 1.5.1（当前 1.5.0）与更新说明 | {"status":"发现新版本 1.5.1（当前 1.5.0）。 更新说明：E2E 更新说明：修复若干问题","downloadVisible":true,"checkCalls":1} |
| ✅ | 点击下载并更新：downloadUpdate 被调用且显示完成提示 | {"downloadCalls":1,"status":"更新已下载并通过 SHA256 校验，准备安装"} |
| ✅ | 浏览器模式检查更新按钮禁用、下载按钮隐藏、提示浏览器更新 | {"helpOpen":true,"status":"浏览器版请直接替换 index.html / js / assets；桌面版支持检查更新。","checkDisabled":true,"downloadHidden":true,"downloadDisabled":false,"downloadVisible":false} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.5.0 新功能契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"globals":{"projectFiles":true,"journal":true,"preflight":true,"updates":true},"desktop":{"available":true,"exportVectorPdfMulti":true,"listConfigBackups":true,"readConfigBackup":true,"checkUpdate":true,"downloadUpdate":true},"missingIds":[],"projectMeta":"1 页 · 0 图","journalCards":0}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![AE-01-update-ui.png](<screens-v1.5.1/AE-01-update-ui.png>)

关键证据：

```json
{
  "v150Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "globals": {
      "projectFiles": true,
      "journal": true,
      "preflight": true,
      "updates": true
    },
    "desktop": {
      "available": true,
      "exportVectorPdfMulti": true,
      "listConfigBackups": true,
      "readConfigBackup": true,
      "checkUpdate": true,
      "downloadUpdate": true
    },
    "missingIds": [],
    "projectMeta": "1 页 · 0 图",
    "journalCards": 0
  },
  "updateUi": {
    "status": "更新已下载并通过 SHA256 校验，准备安装",
    "checkCalls": 1,
    "downloadCalls": 1,
    "browserDisabled": true
  }
}
```

## AF. 全页矢量 — PASS

> 2 页同尺寸 EMF 工程：stub exportVectorPdfMulti 捕获 pages（每页 spec panels/labels，pageCount2）；尺寸不一致时禁用矢量并提示回退多页位图

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.5.0 契约：应用版本 >= 1.5.0（当前 1.5.1） | 1.5.1 |
| ✅ | v1.5.0 契约：工程文件 API 齐全（getProjectSnapshot/loadProjectSnapshot） | [] |
| ✅ | v1.5.0 契约：工程/期刊/预检/更新模块运行时齐全 | {"projectFiles":true,"journal":true,"preflight":true,"updates":true} |
| ✅ | v1.5.0 契约：新增 UI（工程卡/期刊库/更新/备份/矢量）DOM 齐全 | [] |
| ✅ | 两页工程就绪：2 页、同尺寸、每页有 EMF | {"pages":[{"w":170,"rows":2,"cols":2},{"w":170,"rows":2,"cols":2}]} |
| ✅ | 全部页 + PDF：全页矢量提示显示（合并 2 页矢量 PDF） | {"scope":"all","note":"全部 2 页将合并为一个矢量 PDF；需桌面版 PowerPoint，首次会启动较慢，失败自动回退多页位图。"} |
| ✅ | 导出全部页调用一次 exportVectorPdfMulti，pages.length=2 | {"count":1,"pages":2} |
| ✅ | 每页 spec 含 panels/labels 且尺寸一致（170mm/宽高一致） | [{"panels":1,"labels":1,"w":170,"h":128},{"panels":1,"labels":1,"w":170,"h":128}] |
| ✅ | 全页矢量 PDF 下载文件生成（.pdf、非空） | {"filename":"figure.pdf","size":21} |
| ✅ | 尺寸不一致：矢量勾选禁用且导出提示回退多页位图 PDF | {"disabled":true,"note":"全页矢量 PDF 要求每页都有 EMF、没有裁剪/旋转/偏移且各页尺寸一致；当前将使用多页位图 PDF。"} |
| ✅ | 尺寸不一致导出走多页位图（未再调用 exportVectorPdfMulti）且文件生成 | {"before":1,"after":1,"size":245358} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.5.0 新功能契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"missingMethods":[],"globals":{"projectFiles":true,"journal":true,"preflight":true,"updates":true},"desktop":{"available":true,"exportVectorPdfMulti":true,"listConfigBackups":true,"readConfigBackup":true,"checkUpdate":true,"downloadUpdate":true},"missingIds":[],"projectMeta":"1 页 · 0 图","journalCards":0}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![AF-01-multi-page-vector.png](<screens-v1.5.1/AF-01-multi-page-vector.png>)

关键证据：

```json
{
  "v150Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "missingMethods": [],
    "globals": {
      "projectFiles": true,
      "journal": true,
      "preflight": true,
      "updates": true
    },
    "desktop": {
      "available": true,
      "exportVectorPdfMulti": true,
      "listConfigBackups": true,
      "readConfigBackup": true,
      "checkUpdate": true,
      "downloadUpdate": true
    },
    "missingIds": [],
    "projectMeta": "1 页 · 0 图",
    "journalCards": 0
  },
  "multiPageVector": {
    "pages": [
      {
        "panels": 1,
        "labels": 1,
        "w": 170,
        "h": 128
      },
      {
        "panels": 1,
        "labels": 1,
        "w": 170,
        "h": 128
      }
    ],
    "calls": 1,
    "fallback": {
      "vectorDisabled": true,
      "note": "全页矢量 PDF 要求每页都有 EMF、没有裁剪/旋转/偏移且各页尺寸一致；当前将使用多页位图 PDF。",
      "file": "fp-v15-allpages-fallback.pdf"
    }
  }
}
```

## AG. 页面自动编号 — PASS

> 初始图1；新建→图1/图2；删除图1后剩余页自动变图1；再新建→图1/图2；复制页“图1 副本”不被误编号；tab/API 同步

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.5.1 契约：应用版本 >= 1.5.1（当前 1.5.1） | 1.5.1 |
| ✅ | v1.5.1 契约：诊断日志运行时/日志 UI 齐全 | {"hasDiag":true,"hasLogEvent":true,"missingIds":[]} |
| ✅ | 初始 1 页自动命名「图 1」（API/tab/当前页名一致） | {"names":["图 1"],"current":"图 1","tabs":[{"index":0,"text":"图 1· 0 图","active":true,"title":"图 1（双击重命名）"}]} |
| ✅ | 新建第 2 页自动命名「图 1/图 2」且当前页=图 2 | {"names":["图 1","图 2"],"currentName":"图 2","tabs":["图 1","图 2"]} |
| ✅ | 删除图 1 后剩余页自动变「图 1」（pageCount=1/当前名同步） | {"names":["图 1"],"tabs":["图 1"]} |
| ✅ | 再次新建后恢复「图 1/图 2」并自动切换当前页图 2 | ["图 1","图 2"] |
| ✅ | 复制图 1 后新页命名「图 1 副本」且默认页仍为图 1/图 2（不误编号） | ["图 1","图 1 副本","图 2"] |
| ✅ | 复制页不被 renumber：tab 文本与 API 名称完全同步 | {"tabs":["图 1","图 1 副本","图 2"],"names":["图 1","图 1 副本","图 2"]} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.5.1 页面编号/日志/saveFile 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"hasDiag":true,"hasLogEvent":true,"missingIds":[],"desktopSaveFile":true,"pages":["图 1"],"logsCount":1}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![AG-01-page-auto-number.png](<screens-v1.5.1/AG-01-page-auto-number.png>)

关键证据：

```json
{
  "v151Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "hasDiag": true,
    "hasLogEvent": true,
    "missingIds": [],
    "desktopSaveFile": true,
    "pages": [
      "图 1"
    ],
    "logsCount": 1
  },
  "pageAutoNumber": {
    "initial": [
      "图 1"
    ],
    "afterAdd": [
      "图 1",
      "图 2"
    ],
    "afterDelete": [
      "图 1"
    ],
    "afterAddAgain": [
      "图 1",
      "图 2"
    ],
    "afterDuplicate": [
      "图 1",
      "图 1 副本",
      "图 2"
    ],
    "currentName": "图 1 副本"
  }
}
```

## AH. 原生保存路径 — PASS

> stub FP.desktop.saveFile 捕获工程/配置/PNG/PDF 导出；path 状态、取消；浏览器回退 picker/download

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.5.1 契约：应用版本 >= 1.5.1（当前 1.5.1） | 1.5.1 |
| ✅ | v1.5.1 契约：诊断日志运行时/日志 UI 齐全 | {"hasDiag":true,"hasLogEvent":true,"missingIds":[]} |
| ✅ | 工程保存走 FP.desktop.saveFile（filter=.figureplay-project，base64 为工程 JSON） | {"call":{"name":"figureplay-project-20261106-2344.figureplay-project","filter":[".figureplay-project"]}} |
| ✅ | 工程保存后状态显示原生路径（已保存工程 → C:\Users\E2E\Documents\…） | 已保存工程：38.7 KB → C:\Users\E2E\Documents\figureplay-project-20261106-2344.figureplay-project |
| ✅ | 配置 JSON 导出走 saveFile（filter=.json，payload type=figureplay-config） | {"call":{"name":"原生保存配置.figureplay.json","filter":[".json"]}} |
| ✅ | 配置导出 toast/状态包含原生路径 | 已导出配置「原生保存配置」：C:\Users\E2E\Documents\原生保存配置.figureplay.json |
| ✅ | PNG 导出走 saveFile（filter=.png，base64 为 PNG 文件头） | {"call":{"name":"figure.png","filter":[".png"]},"bytes":270817} |
| ✅ | PNG 导出后状态显示“已保存到 …Documents…” | 已保存到 C:\Users\E2E\Documents\figure.png（264.5 KB，134 ms） |
| ✅ | PDF 导出走 saveFile（filter=.pdf，base64 以 %PDF- 开头） | {"call":{"name":"figure.pdf","filter":[".pdf"]},"head":"%PDF-"} |
| ✅ | 取消原生保存：状态=已取消导出、调用 saveFile 后不产生下载 | {"calls":5,"status":"已取消导出"} |
| ✅ | 浏览器模式 PNG 导出回退为下载（无宿主、无 picker） | {"filename":"figure.png","size":270817} |
| ✅ | 浏览器回退后状态为“已导出” | null |
| ✅ | 浏览器模式工程保存回退为下载 .figureplay-project | {"filename":"figureplay-project-20261106-2344.figureplay-project","size":39657} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.5.1 页面编号/日志/saveFile 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"hasDiag":true,"hasLogEvent":true,"missingIds":[],"desktopSaveFile":true,"pages":["图 1"],"logsCount":1}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![AH-01-native-save.png](<screens-v1.5.1/AH-01-native-save.png>)

关键证据：

```json
{
  "v151Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "hasDiag": true,
    "hasLogEvent": true,
    "missingIds": [],
    "desktopSaveFile": true,
    "pages": [
      "图 1"
    ],
    "logsCount": 1
  },
  "nativeSave": {
    "calls": [
      {
        "name": "figureplay-project-20261106-2344.figureplay-project",
        "filters": [
          ".figureplay-project"
        ],
        "bytes": 52876
      },
      {
        "name": "原生保存配置.figureplay.json",
        "filters": [
          ".json"
        ],
        "bytes": 1632
      },
      {
        "name": "figure.png",
        "filters": [
          ".png"
        ],
        "bytes": 361092
      },
      {
        "name": "figure.pdf",
        "filters": [
          ".pdf"
        ],
        "bytes": 244216
      },
      {
        "name": "figure.pdf",
        "filters": [
          ".pdf"
        ],
        "bytes": 244216
      }
    ],
    "projectPathStatus": "已保存工程：38.7 KB → C:\\Users\\E2E\\Documents\\figureplay-project-20261106-2344.figureplay-project",
    "canceledStatus": "已取消导出",
    "hostPathPrefix": "C:\\Users\\E2E\\Documents\\"
  }
}
```

## AI. 诊断日志 — PASS

> 就绪/toast/error 进入日志；帮助弹窗刷新/导出/清空；导出 host save mock 与浏览器下载；localStorage 上限；不记录图片二进制

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.5.1 契约：应用版本 >= 1.5.1（当前 1.5.1） | 1.5.1 |
| ✅ | v1.5.1 契约：诊断日志运行时/日志 UI 齐全 | {"hasDiag":true,"hasLogEvent":true,"missingIds":[]} |
| ✅ | 应用就绪写入诊断日志（info 级，含版本号） | {"count":1,"levels":{"info":1},"first":{"t":"2026-11-06T15:44:21.713Z","level":"info","message":"应用就绪 v1.5.1"}} |
| ✅ | toast 与 error 事件进入日志（level=toast/error） | {"levels":{"info":1,"toast":1,"error":1}} |
| ✅ | 帮助弹窗日志面板显示时间戳/级别/内容（刷新后同步） | {"lines":3,"sample":["[2026-11-06 23:44:21] INFO  应用就绪 v1.5.1","[2026-11-06 23:44:21] TOAST  info: E2E 日志 toast 测试","[2026-11-06 23:44:21] ERROR  E2E 错误级日志 {\"code\":\"E2E-ERR\"}"]} |
| ✅ | 日志不记录图片二进制/dataURL（无 data:image/base64 大段） | {"logCount":9} |
| ✅ | localStorage 诊断日志上限 300 条（超出裁剪旧记录） | {"storage":{"size":22151,"length":300},"count":300} |
| ✅ | 上限裁剪后仍保留最新日志（末条=#349） | E2E 上限填充 #349 |
| ✅ | 浏览器模式导出日志：下载 .log，含版本/生成时间/日志行 | {"filename":"figureplay-diagnostics-2026-11-06.log","size":16834} |
| ✅ | 浏览器导出日志 toast 提示已下载 | 诊断日志已下载 |
| ✅ | 清空日志：旧条目全部删除（仅保留清空 toast 一条）且 textarea/localStorage 同步 | {"beforeClear":300,"after":1,"text":"[2026-11-06 23:44:22] TOAST  info: 诊断日志已清空"} |
| ✅ | 清空日志 toast 提示「诊断日志已清空」 | null |
| ✅ | 桌面模式导出日志走 FP.desktop.saveFile（filter=.log，内容含宿主日志/版本） | {"call":{"name":"figureplay-diagnostics-2026-11-06.log","filter":[".log"]},"bytes":264} |
| ✅ | 桌面导出日志 toast 包含原生保存路径 | 诊断日志已保存：C:\Users\E2E\Documents\figureplay-diagnostics-2026-11-06.log |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.5.1 页面编号/日志/saveFile 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"hasDiag":true,"hasLogEvent":true,"missingIds":[],"desktopSaveFile":true,"pages":["图 1"],"logsCount":1}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![AI-01-diagnostics-log.png](<screens-v1.5.1/AI-01-diagnostics-log.png>)

关键证据：

```json
{
  "v151Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "hasDiag": true,
    "hasLogEvent": true,
    "missingIds": [],
    "desktopSaveFile": true,
    "pages": [
      "图 1"
    ],
    "logsCount": 1
  },
  "diagnostics": {
    "readyLogged": true,
    "toastLogged": true,
    "errorLogged": true,
    "levels": {
      "info": 299,
      "toast": 1
    },
    "limit": 300,
    "exportBrowser": "fp-v151-diagnostics.log",
    "exportHost": "saveFile(.log)",
    "cleared": true,
    "noImageBinary": true
  }
}
```

## AJ. 真实桥回包 — PASS

> 注入 window.chrome.webview mock（不 stub FP.desktop.saveFile/checkUpdate）：真实 saveFile 请求 file-saved 回包立即 resolve、requestId 匹配（错误 id 忽略）、path 正确；工程保存 UI 全链路；update-info/update-downloaded 回包经同一 pending 机制解析并带版本字段

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | v1.5.1 契约：应用版本 >= 1.5.1（当前 1.5.1） | 1.5.1 |
| ✅ | v1.5.1 契约：诊断日志运行时/日志 UI 齐全 | {"hasDiag":true,"hasLogEvent":true,"missingIds":[]} |
| ✅ | 真实桥模式：FP.desktop.saveFile 为原生实现（未 stub/未替换） | {"saveFileType":"function","checkUpdateType":"function","downloadUpdateType":"function","saveFileMockFlag":false,"saveFileMockGlobal":false,"updatesApi":true} |
| ✅ | 真实桥请求：type=save-file、requestId=savefile-*、suggestedName/filter/base64 正确 | {"type":"save-file","requestId":"savefile-2-mw55aish","suggestedName":"bridge-payload.figureplay.json","base64Length":48} |
| ✅ | 回包前 Promise 仍 pending（不超时、不提前 resolve） | {"state":"pending","started":389.39999997615814} |
| ✅ | 错误 requestId 的回包被忽略（Promise 仍 pending） | {"state":"pending","started":389.39999997615814} |
| ✅ | 正确 file-saved 回包：Promise 立即 resolve（<3s），path/ok/canceled 字段正确 | {"state":"resolved","result":{"type":"file-saved","requestId":"savefile-2-mw55aish","ok":true,"path":"C:\\Users\\E2E\\Documents\\bridge-payload.figureplay.json","bytes":27,"canceled":false},"elapsed":480} |
| ✅ | canceled=true 回包：Promise resolve canceled=true、无错误 | {"state":"resolved","result":{"type":"file-saved","requestId":"savefile-3-mw55aj5y","ok":true,"canceled":true,"path":""},"elapsed":7.199999988079071} |
| ✅ | 工程保存 UI：真实桥 file-saved 回包后状态立即显示原生 path（不超时） | {"request":{"filter":[".figureplay-project"]},"status":"已保存工程：989 B → C:\\Users\\E2E\\Documents\\bridge-project.figureplay-project"} |
| ✅ | updates.js 桌面初始化：检查更新按钮启用，静默 check-update 回包后显示未配置 | {"requestId":"updcheck-5-mw55akms","ui":{"helpOpen":false,"status":"尚未配置更新源（可在 %APPDATA%\\FigurePlay\\update.json 中配置）。","checkDisabled":false,"downloadHidden":true,"downloadDisabled":false,"downloadVisible":false}} |
| ✅ | __UPDATES__.check() 全链路：check-update→update-info 立即 resolve，requestId 匹配，返回版本/说明 | {"requestId":"updcheck-6-mw55aksk","entry":{"state":"resolved","res":{"type":"update-info","requestId":"updcheck-6-mw55aksk","ok":true,"configured":true,"hasUpdate":true,"latestVersion":"1.5.2","currentVersion":"1.5.1","notes":"真实桥更新说明"},"elapsed":9.300000011920929}} |
| ✅ | 更新 UI 显示发现新版本 1.5.2（当前 1.5.1）+ 更新说明，下载按钮可见 | {"status":"发现新版本 1.5.2（当前 1.5.1）。 更新说明：真实桥更新说明","downloadVisible":true,"helpOpen":true} |
| ✅ | __UPDATES__.download() 全链路：download-update requestId=updload-*，回包后状态含下载完成+路径 | {"requestId":"updload-7-mw55aktu","status":"更新已下载（真实桥）：C:\\Users\\E2E\\Downloads\\FigurePlay-1.5.2.exe"} |
| ✅ | 更新全链路未 stub：checkUpdate/downloadUpdate 均为原生实现 | {"saveFileType":"function","checkUpdateType":"function","downloadUpdateType":"function","saveFileMockFlag":false,"saveFileMockGlobal":false,"updatesApi":true} |
| ✅ | 真实桥全程未出现超时/未 stub（save/check/download 关键 Promise 均 <3s） | {"elapsed":[480,7.199999988079071,9.300000011920929]} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.5.1 页面编号/日志/saveFile 契约探测（信息，非问题）：{"version":"1.5.1","apiPresent":true,"hasDiag":true,"hasLogEvent":true,"missingIds":[],"desktopSaveFile":true,"pages":["图 1"],"logsCount":1}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![AJ-01-real-bridge-protocol.png](<screens-v1.5.1/AJ-01-real-bridge-protocol.png>)

关键证据：

```json
{
  "v151Probe": {
    "version": "1.5.1",
    "apiPresent": true,
    "hasDiag": true,
    "hasLogEvent": true,
    "missingIds": [],
    "desktopSaveFile": true,
    "pages": [
      "图 1"
    ],
    "logsCount": 1
  },
  "realBridge": {
    "nativeSaveFile": "function",
    "stubbed": false,
    "requestId": "savefile-2-mw55aish",
    "resolvedPath": "C:\\Users\\E2E\\Documents\\bridge-payload.figureplay.json",
    "elapsedMs": 480,
    "wrongIdIgnored": true,
    "canceled": true,
    "projectSave": {
      "filter": [
        ".figureplay-project"
      ],
      "status": "已保存工程：989 B → C:\\Users\\E2E\\Documents\\bridge-project.figureplay-project"
    },
    "updateCheck": {
      "requestId": "updcheck-6-mw55aksk",
      "elapsedMs": 9,
      "latestVersion": "1.5.2",
      "currentVersion": "1.5.1",
      "notes": "真实桥更新说明",
      "status": "更新已下载（真实桥）：C:\\Users\\E2E\\Downloads\\FigurePlay-1.5.2.exe"
    },
    "updateDownload": {
      "requestId": "updload-7-mw55aktu",
      "message": "更新已下载（真实桥）：C:\\Users\\E2E\\Downloads\\FigurePlay-1.5.2.exe",
      "path": "C:\\Users\\E2E\\Downloads\\FigurePlay-1.5.2.exe",
      "status": "更新已下载（真实桥）：C:\\Users\\E2E\\Downloads\\FigurePlay-1.5.2.exe"
    },
    "fullChain": true
  }
}
```

## 导出文件校验

> E: 盘空间预算：已保留关键导出样例 17 个，裁剪其它导出产物 45 个（全部导出校验已在执行时完成，结果见下表与 results.json）。

| 标签 | 格式 | 字节 | API 像素 | Python 校验 | 文件 |
| --- | --- | ---: | --- | --- | --- |
| PNG 300DPI 白底 | PNG | 515386 | 2008×2265 | ✅ 通过 | `artifacts/e2e-v151/2026-11-06_15-41-58-453/exports/fp-e2e-png-300.png` |
| PNG 透明背景 | PNG | 513700 | 2008×2265 | ✅ 通过 | `artifacts/e2e-v151/2026-11-06_15-41-58-453/exports/fp-e2e-png-transparent.png` |
| JPG 300DPI 质量95 | JPG | 494724 | 2008×2265 | ✅ 通过 | `artifacts/e2e-v151/2026-11-06_15-41-58-453/exports/fp-e2e-jpg-q95.jpg` |
| SVG 白底 | SVG | 495235 | 643×725 | ✅ 通过 | `artifacts/e2e-v151/2026-11-06_15-41-58-453/exports/fp-e2e-figure.svg` |
| PDF 300DPI | PDF | 495620 | 2008×2265 | ✅ 通过 | `artifacts/e2e-v151/2026-11-06_15-41-58-453/exports/fp-e2e-figure.pdf` |
| 合并 SVG（2×3 首行跨 3 列） | SVG | 318062 | 643×340 | ✅ 通过 | `artifacts/e2e-v151/2026-11-06_15-41-58-453/exports/fp-v11-merge.svg` |
| 合并 PNG 300DPI | PNG | 276870 | 2008×1063 | ✅ 通过 | `artifacts/e2e-v151/2026-11-06_15-41-58-453/exports/fp-v11-merge.png` |
| 合并 PDF 200DPI | PDF | 147516 | 1339×709 | ✅ 通过 | `artifacts/e2e-v151/2026-11-06_15-41-58-453/exports/fp-v11-merge.pdf` |
| 合并 PDF 渲染图 | PNG | 78135 | - | ✅ 通过 | `artifacts/e2e-v151/2026-11-06_15-41-58-453/exports/pdf-render/fp-v11-merge-pdf.png` |
| 负间距+选中/悬停导出 SVG（无交互层） | SVG | 323731 | - | ✅ 通过 | `artifacts/e2e-v151/2026-11-06_15-41-58-453/exports/fp-v133-neg-gap-overlay.svg` |
| 配置模板 JSON（导出） | JSON | 1286 | - | ✅ 通过 | `artifacts/e2e-v151/2026-11-06_15-41-58-453/exports/fp-v14-config-export.figureplay.json` |
| 完整工程文件 .figureplay-project | JSON | 118986 | - | ✅ 通过 | `artifacts/e2e-v151/2026-11-06_15-41-58-453/exports/fp-v15-project.figureplay-project` |

## 关键证据摘要

- A 首屏：ready=true，默认布局 3×2，viewBox=ok
- B 布局：3×2 cellCount=6，2×3 cellCount=6，1×6 cellCount=6
- C 上传：最终 filled=[0,1,2,3]
- D 编号：9 位置归一化坐标 {"tl":{"nx":0.04,"ny":0.04,"anchor":"start"},"tc":{"nx":0.502,"ny":0.04,"anchor":"middle"},"tr":{"nx":0.963,"ny":0.04,"anchor":"end"},"ml":{"nx":0.04,"ny":0.494,"anchor":"start"},"mc":{"nx":0.502,"ny":0.494,"anchor":"middle"},"mr":{"nx":0.963,"ny":0.494,"anchor":"end"},"bl":{"nx":0.04,"ny":0.947,"anchor":"start"},"bc":{"nx":0.502,"ny":0.947,"anchor":"middle"},"br":{"nx":0.963,"ny":0.947,"anchor":"end"}}
- E 导出：成品 170×191.75 mm，6 张图，导出文件 13 个
- F 稳定性：自动保存后端=indexeddb，恢复图片 2 张，IndexedDB={"databases":["figureplay"],"hasFigureplay":true}
- G 合并：merges=[{"r":0,"c":0,"rs":1,"cs":3}]，面板数=4，cell-hit=4
- H 模板：double-1plus3 rows=2 cols=3 widthMm=170 面板=4 merges=[{"r":0,"c":0,"rs":1,"cs":3}]
- I 批量编号：导出校验 1/1 通过
- J 粘贴弹窗：v1.1 契约探测 {"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}
- K 桌面桥：window.chrome.webview mock 安装成功，v1.1 探测 {"version":"1.5.1","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}
- L 高DPI布局：1000×640 display=grid columns=3 stage.w=460 shell.w=234，950 三栏、899 堆叠、1366/1440 复检通过
- M 多页：自动保存 version=2，页数=2，当前页=0，页面填充=[{"name":"图 1","filled":2},{"name":"图 2","filled":0}]
- N 撤销重做：布局/编号/上传/偏移合并/页增删/模板 的撤销重做 + 快捷键 + 弹窗守卫断言通过
- O 分组/多页导出/.fig：导出校验 7/7 通过；样例=["分组 SVG（导出不含组框）","多页 PDF（2 页）","多页 PNG ZIP（2 页）","多页 SVG ZIP（2 页）","多页 JPG ZIP（2 页）","UI 全页 PDF","UI 全页 PNG ZIP"]
- P 网格自定义：可用 ["8x8","1x20","50x50","100x1"]；拒绝 100x100（10000 > 2500）；夹取 600 rows -> 500
- Q 保存位置：picker/Abort 回退/无 picker 下载路径均通过；导出验证 1/1
- R 自动页距：越界后 bottom=11.4mm、页高 127.5→138.9mm；手动 pad+SVG/PDF 尺寸校验通过
- S PDF 墨迹裁剪（v1.3.2 安全边距）：整页 170×133mm；内容盒 150×113mm → ink 152.3×115.2mm；trim0(→1mm) 最大余量 1.058mm、trim2 最大 2.117mm；letterbox ink 129.8×93.2mm；用户配置(3×2/bc/offsetY5) trim0 余量 {"top":0.794,"right":0.794,"bottom":0.794,"left":1.058}、trim2 余量 {"top":1.587,"right":1.852,"bottom":0.794,"left":2.117}（底部编号完整）
- T 数字输入：zoom=0.2、jpgQuality=1、bgOpacity=0.3（夹取/双向同步通过）
- U EMF 矢量 PDF：emfCount=1，spec panels=[png,emf]、labels=2；trim spec.crop=170×63mm（≈getInkCropBox 170×63mm）、spec.trimMarginMm=2;mock 成功写入/失败回退位图均通过
- V 负间距：gap 0→[-10,-10]，cellW 85→90mm，面板重叠 X=10mm / Y=10mm；clamp=[-50,80]；PNG/PDF/trim/SVG 导出均通过（trim 余量 {"top":0,"right":0,"bottom":0,"left":0}）；v1.3.3 overlay 最后子层=interaction-overlay-layer、单选/多选=1/2、hover 在顶层、导出 SVG 无交互元素
- W 界面外观：默认跟随系统（dark→light→dark 自动切换）；3 模式 + 7 主题色 active/aria/localStorage reload 保留；深色下 body/panel/输入框/帮助弹窗深色、figure-shell 预览仍白（rgb(255, 255, 255)）；导出隔离 PNG=true、SVG=true（light-blue/dark-blue/light-amber/dark-violet），预览 DOM hash 不变；1000×700 按钮/popover 不溢出
- X 配置模板：目标 3×2/170mm/列距3/行距1/Arial11/PDF/裁边1.5/矢量；保存→localStorage/reload 持久；应用（有图 confirm）恢复参数并重排图片（2 张顺序一致）；导出 JSON schemaVersion=1 无图片可重新导入；无效导入（错误 type/未来 schemaVersion/非法 JSON）中文报错不落盘；历史 save=2→apply=4、重复应用不增；主题保持 dark/violet
- Y 矢量 label bbox：配置1 2×3/170mm/4:3/colGap-4/rowGap1/autoPad、label bc/Times9；fonts=loaded；spec.labels 6 项 textLeftMm/textTopMm/textWmm/textHmm 与预览 getBBox 最大偏差 dx=0.000/dy=0.000/dw=0.000/dh=0.000mm； (c) top=43.50711441040039mm、height=3.4783823490142822mm；两次导出 spec 完全一致
- Z 配置宿主持久化：C:\Users\E2E\AppData\Roaming\FigurePlay\configs\profiles.json；init loadConfigProfiles、旧 localStorage→host 迁移 save（["旧版本地配置"]）；保存/删除/导入均触发 host save；清空 localStorage 后 host 恢复（["导入到宿主配置","宿主新配置"]）；浏览器模式仍 localStorage（提示：配置保存在当前浏览器本地；换电脑请用“导出 JSON”迁移。）；配置保存不改主题（dark/violet）、历史不变（0→0）且项目 payload 不含配置
- AA 工程文件：快照 {"pages":2,"page1Images":2,"page2Images":1,"groups":1}；真实下载 fp-v15-project.figureplay-project（118986B）；改布局/清空后打开恢复 {"type":"figureplay-project","schemaVersion":1,"appVersion":"1.5.1","savedAt":"2026-11-06T15:44:07.118Z","pages":2,"images":3,"groups":1,"pageSizes":[{"rows":2,"cols":2,"widthMm":170},{"rows":2,"cols":2,"widthMm":170}]}；错误文件（错误 type/未来 schemaVersion/非法 JSON）中文报错不改变工程
- AB 配置备份：C:\Users\E2E\AppData\Roaming\FigurePlay\configs\profiles.json；list/read 最新备份（profiles-2026-11-06-1200.json、profiles-2026-11-06-1100.json）→ 恢复 ["备份配置 B","备份配置 C"] 并触发 host save；浏览器模式隐藏恢复按钮
- AC 期刊库：11 个预设/5 分组（Nature、IEEE、Elsevier、Science、学位论文）；套用 Nature 单栏 89mm/arial8pt/pdf/trim=true，Science 单栏 55mm/7pt；网格与图片数量不变
- AD 图片预检：低分辨率 warnings=["有效分辨率约 36 DPI，低于 150 DPI，打印可能模糊","像素尺寸仅 120×90，建议至少 500×400 px"]；高分辨率 dpi=362.9 无警告；拉伸 warnings=["有效分辨率约 40 DPI，低于 150 DPI，打印可能模糊","像素尺寸仅 800×100，建议至少 500×400 px","图片被拉伸：原图比例 8.00，格子比例 1.33（变形约 500%）"]
- AE 更新 UI：stub checkUpdate 显示「更新已下载并通过 SHA256 校验，准备安装」；checkCalls=1、downloadCalls=1；浏览器模式按钮禁用
- AF 全页矢量：stub exportVectorPdfMulti 调用 1 次、pages=2（[{"panels":1,"labels":1,"w":170,"h":128},{"panels":1,"labels":1,"w":170,"h":128}]）；尺寸不一致回退：vectorDisabled=true、提示含多页位图、不再调用 multi；回退 PDF=fp-v15-allpages-fallback.pdf
- AG 页面自动编号：初始 ["图 1"] → 新建 ["图 1","图 2"] → 删图1后 ["图 1"] → 再新建 ["图 1","图 2"] → 复制 ["图 1","图 1 副本","图 2"]（“图 1 副本”不重编号，当前=图 1 副本，tab/API 同步）
- AH 原生保存路径：stub FP.desktop.saveFile 捕获 [{"name":"figureplay-project-20261106-2344.figureplay-project","filters":[".figureplay-project"],"bytes":52876},{"name":"原生保存配置.figureplay.json","filters":[".json"],"bytes":1632},{"name":"figure.png","filters":[".png"],"bytes":361092},{"name":"figure.pdf","filters":[".pdf"],"bytes":244216},{"name":"figure.pdf","filters":[".pdf"],"bytes":244216}]；工程状态「已保存工程：38.7 KB → C:\Users\E2E\Documents\figureplay-project-20261106-2344.figureplay-project」；取消后「已取消导出」；浏览器模式回退下载 PNG/.figureplay-project
- AI 诊断日志：就绪/toast/error 均记录（levels={"info":299,"toast":1}）；帮助弹窗刷新/导出（浏览器下载 fp-v151-diagnostics.log、桌面 saveFile .log）/清空；localStorage 上限 300 条；不记录图片二进制
- AJ 真实桥回包：window.chrome.webview mock，未 stub FP.desktop.saveFile/checkUpdate/downloadUpdate；save-file→file-saved 480ms resolve、requestId 匹配（错误 id 忽略）、path=C:\Users\E2E\Documents\bridge-payload.figureplay.json；取消=true；工程保存 UI 状态=「已保存工程：989 B → C:\Users\E2E\Documents\bridge-project.figureplay-project」；__UPDATES__.check() 全链路 update-info→1.5.2/1.5.1 note「真实桥更新说明」(9ms，requestId=updcheck-6-mw55aksk)；__UPDATES__.download() 全链路 update-downloaded→「更新已下载（真实桥）：C:\Users\E2E\Downloads\FigurePlay-1.5.2.exe」path=C:\Users\E2E\Downloads\FigurePlay-1.5.2.exe（requestId=updload-7-mw55aktu）；完整链路=true

## 契约差异与已知问题

无（未发现契约差异）。

## 复现命令

```powershell
# 完整 E2E（含报告与截图）
node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v151
# v1.5.1 全量（v1.0 回归 + v1.1 + v1.2 + v1.3 + v1.4 + v1.5 + 页面编号/日志/原生保存路径）
node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v151
# 只跑某场景 / suite
node E:\FigurePlay\_dev\e2e.mjs --only=U
node E:\FigurePlay\_dev\e2e.mjs --suite=v13
```

截图目录：`_dev/screens-v1.5.1/`（39 张，关键场景）
导出样例目录：`artifacts/e2e-v151/2026-11-06_15-41-58-453/exports/`（run 目录内保留 17 个关键导出，控制磁盘占用；完整导出校验结果见本报告与 results.json）
结果 JSON：`artifacts/e2e-v151/2026-11-06_15-41-58-453/results.json`
