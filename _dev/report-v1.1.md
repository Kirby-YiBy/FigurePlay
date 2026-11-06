# FigurePlay E2E 验证报告（v1.1）

- 生成时间：2026-11-05T18:42:24.349Z
- 运行 id：`2026-11-05_18-41-51-108`
- 应用：`E:\FigurePlay\index.html`
- 环境：Node v24.21.0；playwright-core 1.64.1；Chrome 156.0.8078.80；headless=true
- 应用版本（js/util.js APP_VERSION）：1.1.0；场景 suite：all
- 启动参数：（无额外参数）
- 结论：**PASS** — 场景 12/12 通过；断言 433/433 通过

应用文件快照：

| 文件 | 字节 | sha256（前 16） | mtime |
| --- | ---: | --- | --- |
| index.html | 28878 | 2a41a42d6a01da68 | 2026-11-05T18:17:00.815Z |
| assets/styles.css | 32062 | ab7565335aaa8199 | 2026-11-05T18:38:23.990Z |
| js/app.js | 94073 | b8f929ec4c1ebcfa | 2026-11-05T18:32:17.939Z |
| js/demo.js | 10054 | ebf2396eab23b038 | 2026-11-05T17:34:34.962Z |
| js/desktop.js | 3077 | 75b9c393d3df3ba4 | 2026-11-05T18:16:31.768Z |
| js/export.js | 4949 | 2d0e71c7d1528c8c | 2026-11-05T17:43:13.148Z |
| js/layout.js | 12934 | d75e5587349cb769 | 2026-11-05T18:14:25.639Z |
| js/pdf.js | 5103 | b9a80a8a969da79b | 2026-11-05T17:32:45.091Z |
| js/render-canvas.js | 4099 | 51e9717eec8b7755 | 2026-11-05T18:16:22.845Z |
| js/render-svg.js | 12343 | 90ecd286af4aad1f | 2026-11-05T18:16:22.742Z |
| js/storage.js | 3711 | 0f811cb4d463b9c8 | 2026-11-05T17:32:16.518Z |
| js/util.js | 16763 | 3ba57050cafe9c37 | 2026-11-05T18:19:35.462Z |

## 场景结果

| 场景 | 标题 | 结果 | 断言 | 耗时 |
| --- | --- | --- | ---: | ---: |
| A | 首屏 | ✅ PASS | 26/26 | 1104 ms |
| B | 布局 | ✅ PASS | 34/34 | 1643 ms |
| C | 上传 | ✅ PASS | 28/28 | 1390 ms |
| D | 编号 | ✅ PASS | 79/79 | 3439 ms |
| E | 导出 | ✅ PASS | 43/43 | 7468 ms |
| F | 稳定性 | ✅ PASS | 19/19 | 3090 ms |
| G | 合并单元格 | ✅ PASS | 36/36 | 2321 ms |
| H | 快捷模板 | ✅ PASS | 56/56 | 4041 ms |
| I | 批量编号 | ✅ PASS | 20/20 | 1854 ms |
| J | 粘贴画布 | ✅ PASS | 33/33 | 2600 ms |
| K | 桌面桥 | ✅ PASS | 22/22 | 1532 ms |
| L | 高DPI布局 | ✅ PASS | 37/37 | 984 ms |

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
| ✅ | 预览 SVG 与导出按钮可见 | {"previewSvg":{"width":522.328125,"height":593},"exportButton":{"width":275,"height":40}} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![A-01-first-screen.png](<shots-v1.1/A-01-first-screen.png>)

关键证据：

```json
{
  "readyFlags": {
    "dataset": "1",
    "apiReady": true,
    "version": "1.1.0",
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
    "imageCount": 0,
    "labelCount": 0,
    "selectedCell": null,
    "sizeCssPx": {
      "width": 522,
      "height": 593
    }
  },
  "initialState": {
    "ready": true,
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
      "fit": "contain",
      "merges": []
    },
    "label": {
      "show": true,
      "scheme": "alpha-paren",
      "start": 1,
      "order": "row",
      "skipEmpty": true,
      "position": "tl",
      "insetMm": 1.5,
      "offsetXmm": 0,
      "offsetYmm": 0,
      "fontFamily": "times",
      "fontSizePt": 9,
      "bold": false,
      "italic": false,
      "color": "#000000",
      "bg": "non…
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
- ![B-01-layout-3x2.png](<shots-v1.1/B-01-layout-3x2.png>)
- ![B-02-layout-2x3.png](<shots-v1.1/B-02-layout-2x3.png>)
- ![B-03-layout-1x6.png](<shots-v1.1/B-03-layout-1x6.png>)
- ![B-04-layout-final.png](<shots-v1.1/B-04-layout-final.png>)

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
| ✅ | #file-input 支持 multiple 且 accept 含 image/* | {"multiple":true,"hidden":true,"accept":"image/*,.tif,.tiff"} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![C-01-upload-batch.png](<shots-v1.1/C-01-upload-batch.png>)
- ![C-02-upload-final.png](<shots-v1.1/C-02-upload-final.png>)

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
| ✅ | 位置 tl 编号位于格子上左 | {"nx":0.03993040465173267,"ny":0.041316149726746576,"anchor":"start"} |
| ✅ | 位置 tc 编号位于格子上中 | {"nx":0.5010876598812285,"ny":0.041316149726746576,"anchor":"middle"} |
| ✅ | 位置 tr 编号位于格子上右 | {"nx":0.9622449420747303,"ny":0.041316149726746576,"anchor":"end"} |
| ✅ | 位置 ml 编号位于格子中左 | {"nx":0.03993040465173267,"ny":0.49482882779742043,"anchor":"start"} |
| ✅ | 位置 mc 编号位于格子中中 | {"nx":0.5010876598812285,"ny":0.49482882779742043,"anchor":"middle"} |
| ✅ | 位置 mr 编号位于格子中右 | {"nx":0.9622449420747303,"ny":0.49482882779742043,"anchor":"end"} |
| ✅ | 位置 bl 编号位于格子下左 | {"nx":0.03993040465173267,"ny":0.9483415342512584,"anchor":"start"} |
| ✅ | 位置 bc 编号位于格子下中 | {"nx":0.5010876598812285,"ny":0.9483415342512584,"anchor":"middle"} |
| ✅ | 位置 br 编号位于格子下右 | {"nx":0.9622449420747303,"ny":0.9483415342512584,"anchor":"end"} |
| ✅ | 字号 18pt 渲染为 6.35mm | 6.35 |
| ✅ | 加粗 font-weight=700 | 700 |
| ✅ | 斜体 font-style=italic | italic |
| ✅ | 编号颜色 #ff0000 | #ff0000 |
| ✅ | 内边距 1.5→5mm 时编号 x 增加 3.5mm | {"from":1.5,"to":5} |
| ✅ | 水平偏移 +4mm 时编号 x 再 +4mm | {"from":5,"to":9} |
| ✅ | 垂直偏移 +3mm 时编号 y 增加 3mm | {"from":7.1908,"to":10.1908} |
| ✅ | 自定义编号 X1 覆盖格子 1 自动编号 | [{"cellIndex":0,"text":"(a)"},{"cellIndex":1,"text":"X1"},{"cellIndex":2,"text":"(c)"},{"cellIndex":3,"text":"(d)"},{"cellIndex":4,"text":"(e)"},{"cellIndex":5,"text":"(f)"}] |
| ✅ | 自定义编号不影响其它格子编号 | [{"cellIndex":0,"text":"(a)"},{"cellIndex":1,"text":"X1"},{"cellIndex":2,"text":"(c)"},{"cellIndex":3,"text":"(d)"},{"cellIndex":4,"text":"(e)"},{"cellIndex":5,"text":"(f)"}] |
| ✅ | 清除自定义编号后恢复自动编号 (b) | null |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![D-01-labels-positions.png](<shots-v1.1/D-01-labels-positions.png>)
- ![D-02-labels-font.png](<shots-v1.1/D-02-labels-font.png>)
- ![D-03-labels-final.png](<shots-v1.1/D-03-labels-final.png>)

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
      "ny": 0.041,
      "anchor": "start"
    },
    "tc": {
      "nx": 0.501,
      "ny": 0.041,
      "anchor": "middle"
    },
    "tr": {
      "nx": 0.962,
      "ny": 0.041,
      "anchor": "end"
    },
    "ml": {
      "nx": 0.04,
      "ny": 0.495,
      "anchor": "start"
    },
    "mc": {
      "nx": 0.501,
      "ny": 0.495,
      "anchor": "middle"
    },
    "mr": {
      "nx": 0.962,
      "ny": 0.495,
      "anchor": "end"
    },
    "bl": {
      "nx": 0.04,
      "ny": 0.948,
      "anchor": "start"
    },
    "bc": {
      "nx": 0.501,
      "ny": 0.948,
      "anchor": "middle"
    },
    "br": {
      "nx": 0.962,
      "ny": 0.948,
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
| ✅ | PNG 300DPI 白底：文件生成（PNG，515386 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-e2e-png-300.png","size":515386} |
| ✅ | PNG 300DPI 白底：Python 校验通过 | OK |
| ✅ | PNG 300DPI 返回 widthPx/heightPx 符合 mm/25.4×DPI | {"api":[2008,2265],"expected":[2008,2265]} |
| ✅ | PNG 透明背景：文件生成（PNG，513700 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-e2e-png-transparent.png","size":513700} |
| ✅ | PNG 透明背景：Python 校验通过 | OK |
| ✅ | 透明 PNG 文件名 = fp-e2e-png-transparent.png | fp-e2e-png-transparent.png |
| ✅ | JPG 300DPI 质量95：文件生成（JPG，494724 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-e2e-jpg-q95.jpg","size":494724} |
| ✅ | JPG 300DPI 质量95：Python 校验通过 | OK |
| ✅ | JPG 300DPI 质量60：文件生成（JPG，211206 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-e2e-jpg-q60.jpg","size":211206} |
| ✅ | JPG 300DPI 质量60：Python 校验通过 | OK |
| ✅ | JPG 质量 95 文件体积 > 质量 60（质量参数生效） | {"q95":494724,"q60":211206} |
| ✅ | SVG 白底：文件生成（SVG，495235 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-e2e-figure.svg","size":495235} |
| ✅ | SVG 白底：Python 校验通过 | OK |
| ✅ | SVG 返回 mime=image/svg+xml | image/svg+xml |
| ✅ | SVG 透明背景：文件生成（SVG，495232 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-e2e-figure-transparent.svg","size":495232} |
| ✅ | SVG 透明背景：Python 校验通过 | OK |
| ✅ | SVG 透明导出文件名 = fp-e2e-figure-transparent.svg | fp-e2e-figure-transparent.svg |
| ✅ | PDF 300DPI：文件生成（PDF，495620 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-e2e-figure.pdf","size":495620} |
| ✅ | PDF 300DPI：Python 校验通过 | OK |
| ✅ | PDF 渲染图非空白且四角为白底 | OK |
| ✅ | PDF 返回 mime=application/pdf 且页数校验通过 | {"mime":"application/pdf","pageCount":1} |
| ✅ | PNG 150DPI：文件生成（PNG，229655 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-e2e-png-150dpi.png","size":229655} |
| ✅ | PNG 150DPI：Python 校验通过 | OK |
| ✅ | PNG 150DPI 像素尺寸 = mm/25.4×150 | {"api":[1004,1132],"expected":[1004,1132]} |
| ✅ | PNG 300DPI：文件生成（PNG，515386 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-e2e-png-300dpi.png","size":515386} |
| ✅ | PNG 300DPI：Python 校验通过 | OK |
| ✅ | PNG 300DPI 像素尺寸 = mm/25.4×300 | {"api":[2008,2265],"expected":[2008,2265]} |
| ✅ | PNG 600DPI：文件生成（PNG，1676353 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-e2e-png-600dpi.png","size":1676353} |
| ✅ | PNG 600DPI：Python 校验通过 | OK |
| ✅ | PNG 600DPI 像素尺寸 = mm/25.4×600 | {"api":[4016,4530],"expected":[4016,4530]} |
| ✅ | UI 导出按钮触发下载且文件已保存 | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-e2e-ui.png","size":515386} |
| ✅ | UI 下载文件名 = fp-e2e-ui.png | fp-e2e-ui.png |
| ✅ | UI 下载 PNG 尺寸/内容正确 | OK |
| ✅ | 顶栏导出按钮 #btn-export-top 触发下载并保存 | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-e2e-top.png","size":515386} |
| ✅ | 顶栏导出文件名 = fp-e2e-top.png | fp-e2e-top.png |
| ✅ | 顶栏导出 PNG 尺寸/内容正确 | OK |
| ✅ | exportBase64 overrides（dpi/filename）生效 | {"widthPx":1004,"filename":"fp-e2e-override.png"} |
| ✅ | 导出过程中/后状态栏提示已导出 | 已导出 fp-e2e-top.png（503.3 KB，110 ms） |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![E-01-export-setup.png](<shots-v1.1/E-01-export-setup.png>)
- ![E-02-transparent-preview.png](<shots-v1.1/E-02-transparent-preview.png>)
- ![E-03-export-final.png](<shots-v1.1/E-03-export-final.png>)

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
  "transparentPreviewScreenshot": "E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\screenshots\\E-02-transparent-preview.png",
  "uiStatusAfterExport": "已导出 fp-e2e-top.png（503.3 KB，110 ms）"
}
```

## F. 稳定性 — PASS

> 1366×768 视口可用；改动后自动保存（IndexedDB），刷新后布局/图片/编号/导出设置恢复，无控制台错误

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | 1366×768 下无横向溢出 | {"scrollWidth":1366,"innerWidth":1366} |
| ✅ | 1366×768 下预览画布区域可用（宽 > 400px） | {"x":276,"y":137,"w":764,"h":517} |
| ✅ | 1366×768 下预览 SVG 与导出按钮可见 | {"previewSvg":{"x":455,"y":167,"w":406,"h":461},"exportButton":{"x":1066,"y":945,"w":275,"h":40}} |
| ✅ | 编辑后状态：2×3、2 张图、编号起始 2、roman-paren | {"layout":[2,3],"cells":2,"label":{"start":2,"scheme":"roman-paren"}} |
| ✅ | 改动后自动保存写入成功 | {"backend":"indexeddb","savedAt":1793904128761} |
| ✅ | 自动保存快照包含图片 dataUrl（可恢复） | [{"name":"sample-1.png","dataUrlPrefix":"data:image/png;base64,iVBORw0K"},{"name":"sample-4.png","dataUrlPrefix":"data:image/png;base64,iVBORw0K"}] |
| ✅ | IndexedDB 中存在 figureplay 数据库（file:// 可用） | ["figureplay"] |
| ✅ | 刷新后布局恢复（2×3） | [2,3] |
| ✅ | 刷新后图片恢复（2 张、名称一致） | ["sample-1.png","sample-4.png",null,null,null,null] |
| ✅ | 刷新后图片 dataUrl 完全恢复（预览 href 与刷新前一致） | {"before":["0","1"],"after":["0","1"],"same":true} |
| ✅ | 刷新后编号设置恢复（start=2, roman-paren） | {"start":2,"scheme":"roman-paren"} |
| ✅ | 刷新后边距/字号恢复（margin=4, size=12） | {"margin":4,"size":12} |
| ✅ | 刷新后导出设置恢复（jpg/150DPI/filename） | {"filename":"fp-e2e-restore","format":"jpg","dpi":150,"jpgQuality":0.95,"transparent":false} |
| ✅ | 刷新后预览图片数/编号与状态一致 | {"imageCount":2,"labels":[{"cellIndex":0,"text":"(ii)"},{"cellIndex":1,"text":"(iii)"}]} |
| ✅ | 刷新后状态栏提示已恢复上次编辑内容 | 已恢复上次编辑内容 |
| ✅ | clearAll 后刷新：图片清空且状态同步 | {"imageCount":0,"filled":[]} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![F-01-viewport-1366x768.png](<shots-v1.1/F-01-viewport-1366x768.png>)
- ![F-02-before-reload.png](<shots-v1.1/F-02-before-reload.png>)
- ![F-03-after-reload.png](<shots-v1.1/F-03-after-reload.png>)
- ![F-04-stability-final.png](<shots-v1.1/F-04-stability-final.png>)

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
      "y": 137,
      "w": 764,
      "h": 517
    },
    "previewSvg": {
      "x": 455,
      "y": 167,
      "w": 406,
      "h": 461
    },
    "exportButton": {
      "x": 1066,
      "y": 945,
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
      "merges": []
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
      "transparent": false
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
    "savedAt": 1793904128761,
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
      "merges": []
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
      "transparent": false
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
| ✅ | v1.1 契约：应用版本 >= 1.1（当前 1.1.0） | 1.1.0 |
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
| ✅ | 合并后编号数量/顺序与面板顺序复算一致 | {"actual":[{"cellIndex":0,"text":"(a)"},{"cellIndex":3,"text":"(b)"},{"cellIndex":4,"text":"(c)"},{"cellIndex":5,"text":"(d)"}],"expected":["0:(a)","3:(b)","4:(c)","5:(d)"]} |
| ✅ | 合并面板的编号位于面板左上区域（tl） | {"nx":0.02047695219516754,"ny":0.06676519834078275} |
| ✅ | 合并 SVG（2×3 首行跨 3 列）：文件生成（SVG，318062 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-v11-merge.svg","size":318062} |
| ✅ | 合并 SVG（2×3 首行跨 3 列）：Python 校验通过 | OK |
| ✅ | 导出 SVG 首条编号位于合并面板内左上 | {"label":{"text":"(a)","x":6.5,"y":8.6908,"anchor":"start"},"panel":{"index":0,"row":0,"col":0,"rowSpan":1,"colSpan":3,"x":5,"y":5,"w":160,"h":39,"merged":true}} |
| ✅ | 合并 PNG 300DPI：文件生成（PNG，276870 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-v11-merge.png","size":276870} |
| ✅ | 合并 PNG 300DPI：Python 校验通过 | OK |
| ✅ | 合并 PNG 像素尺寸 = mm/25.4×300 | {"api":[2008,1063],"expected":[2008,1063]} |
| ✅ | 合并 PDF 200DPI：文件生成（PDF，147516 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-v11-merge.pdf","size":147516} |
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
- v1.1 契约探测（信息，非问题）：{"version":"1.1.0","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![G-01-merge-preview.png](<shots-v1.1/G-01-merge-preview.png>)
- ![G-02-merge-final.png](<shots-v1.1/G-02-merge-final.png>)

关键证据：

```json
{
  "v11Probe": {
    "version": "1.1.0",
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
| ✅ | v1.1 契约：应用版本 >= 1.1（当前 1.1.0） | 1.1.0 |
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
- v1.1 契约探测（信息，非问题）：{"version":"1.1.0","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![H-01-templates-double-1plus3.png](<shots-v1.1/H-01-templates-double-1plus3.png>)
- ![H-02-templates-image-reflow.png](<shots-v1.1/H-02-templates-image-reflow.png>)

关键证据：

```json
{
  "v11Probe": {
    "version": "1.1.0",
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
| ✅ | v1.1 契约：应用版本 >= 1.1（当前 1.1.0） | 1.1.0 |
| ✅ | v1.1 契约：API 方法齐全（mergePanels/splitPanel/setMultiSelect/applyTemplate/getTemplates/openPasteDialog/getPasteState） | [] |
| ✅ | v1.1 契约：getPreviewInfo 含 panels/merges/multiSelect/gridCellCount | [] |
| ✅ | v1.1 契约：getState().layout.merges 为数组 | null |
| ✅ | API setMultiSelect([0,1,2]) 生效 | [0,1,2] |
| ✅ | 多选后 #multi-controls 可见且批量编号按钮可用 | {"visible":true,"merge":{"present":true,"disabled":false,"text":"合并为跨列大图"},"split":null,"batchLabel":{"present":true,"disabled":false,"text":"批量编号…"},"cancel":{"present":true,"disabled":false,"text":"取消多选"},"countText":"已选 3 个子图","mergeHint":"可合并为 1 行 × 3 列的大图","selectedCount":3} |
| ✅ | 批量编号弹窗打开且控件齐全 | {"open":true,"scheme":"alpha-paren","start":"1","preview":"#1(a)#2(b)#3(c)","applyDisabled":false} |
| ✅ | 批量编号预览包含起始编号 (ii) | #1(ii)#2(iii)#3(iv) |
| ✅ | 套用编号后弹窗自动关闭 | {"present":true,"open":false,"visible":false} |
| ✅ | 套用后选中面板 customLabel = (ii)/(iii)/(iv) | ["(ii)","(iii)","(iv)"] |
| ✅ | 套用后预览编号与状态一致 | {"actual":[{"cellIndex":0,"text":"(ii)"},{"cellIndex":1,"text":"(iii)"},{"cellIndex":2,"text":"(iv)"}],"expected":[{"cellIndex":0,"text":"(ii)","row":0,"col":0},{"cellIndex":1,"text":"(iii)","row":0,"col":1},{"cellIndex":2,"text":"(iv)","row":0,"col":2}]} |
| ✅ | 套用后预览 label-text 文字一致 | ["(ii)","(iii)","(iv)"] |
| ✅ | 批量编号 SVG：文件生成（SVG，237378 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_18-41-51-108\\exports\\fp-v11-batch-label.svg","size":237378} |
| ✅ | 批量编号 SVG：Python 校验通过 | OK |
| ✅ | 清除自定义编号后弹窗自动关闭 | {"present":true,"open":false,"visible":false} |
| ✅ | 批量清除后 customLabel 为空 | ["","",""] |
| ✅ | 批量清除后恢复自动编号（(a)/(b)/(c)） | {"labels":[{"cellIndex":0,"text":"(a)"},{"cellIndex":1,"text":"(b)"},{"cellIndex":2,"text":"(c)"}],"expected":[{"cellIndex":0,"text":"(a)","row":0,"col":0},{"cellIndex":1,"text":"(b)","row":0,"col":1},{"cellIndex":2,"text":"(c)","row":0,"col":2}]} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.1 契约探测（信息，非问题）：{"version":"1.1.0","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![I-01-batch-label-applied.png](<shots-v1.1/I-01-batch-label-applied.png>)
- ![I-02-batch-label-cleared.png](<shots-v1.1/I-02-batch-label-cleared.png>)

关键证据：

```json
{
  "v11Probe": {
    "version": "1.1.0",
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
| ✅ | v1.1 契约：应用版本 >= 1.1（当前 1.1.0） | 1.1.0 |
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
- v1.1 契约探测（信息，非问题）：{"version":"1.1.0","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![J-01-paste-preview.png](<shots-v1.1/J-01-paste-preview.png>)
- ![J-02-paste-final.png](<shots-v1.1/J-02-paste-final.png>)

关键证据：

```json
{
  "v11Probe": {
    "version": "1.1.0",
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
| ✅ | v1.1 契约：应用版本 >= 1.1（当前 1.1.0） | 1.1.0 |
| ✅ | v1.1 契约：API 方法齐全（mergePanels/splitPanel/setMultiSelect/applyTemplate/getTemplates/openPasteDialog/getPasteState） | [] |
| ✅ | v1.1 契约：getPreviewInfo 含 panels/merges/multiSelect/gridCellCount | [] |
| ✅ | v1.1 契约：getState().layout.merges 为数组 | null |
| ✅ | 桌面桥：应用启动后发送 app-ready 消息（含 version） | {"type":"app-ready","version":"1.1.0"} |
| ✅ | 桌面桥模式 getPasteState().desktopBridge = true | {"open":true,"target":0,"hasPreview":false,"desktopBridge":true} |
| ✅ | 桌面桥模式 #paste-read-clipboard 保留在 DOM 且可见 | {"present":true,"hidden":false,"visibleButtons":2} |
| ✅ | 打开粘贴弹窗自动向 host 发送 read-clipboard-image | {"type":"read-clipboard-image","requestId":"fp-1-mw3w7ih3"} |
| ✅ | read-clipboard-image 带非空 requestId | fp-1-mw3w7ih3 |
| ✅ | 成功回包后粘贴弹窗出现预览 data URL | data:image/jpeg;base64,/9j/4AAQSkZJRgABA |
| ✅ | 成功回包后预览图片尺寸 = 1600×1200（EMF 转换后尺寸） | {"width":1600,"height":1200} |
| ✅ | 成功回包后状态文本提示来自系统剪贴板 | 已从系统剪贴板读取（EMF → PNG） |
| ✅ | 桌面桥回包确认后填入面板 0（1600×1200） | {"name":"剪贴板图片.png","width":1600,"height":1200,"bytes":88320,"fit":"inherit","zoom":1,"offsetX":0,"offsetY":0,"rotation":0,"customLabel":"","hasData":true} |
| ✅ | 桌面桥确认后弹窗关闭（继续模式已取消） | null |
| ✅ | 打开第二个弹窗再次发送 read-clipboard-image | {"type":"read-clipboard-image","requestId":"fp-2-mw3w7ipx"} |
| ✅ | 失败回包后显示错误/无图片提示 | 系统剪贴板中没有图片：可按 Ctrl+V、选择本地文件，或重新复制图窗 |
| ✅ | 失败回包后 #paste-retry 可用 | null |
| ✅ | #paste-retry 重发 read-clipboard-image 且 requestId 更新 | fp-3-mw3w7j21 |
| ✅ | 重试成功后图片填入面板 1 | {"name":"剪贴板图片.png","width":1600,"height":1200,"bytes":88320,"fit":"inherit","zoom":1,"offsetX":0,"offsetY":0,"rotation":0,"customLabel":"","hasData":true} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

**备注 / 契约差异**：
- v1.1 契约探测（信息，非问题）：{"version":"1.1.0","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![K-01-bridge-preview.png](<shots-v1.1/K-01-bridge-preview.png>)
- ![K-02-desktop-bridge-final.png](<shots-v1.1/K-02-desktop-bridge-final.png>)

关键证据：

```json
{
  "v11Probe": {
    "version": "1.1.0",
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
| ✅ | 1000×640：预览 stage 可见（宽 460px） | {"x":244,"y":166,"w":460,"h":360,"visible":true} |
| ✅ | 1000×640：#figure-shell 宽 268px > 250 | {"x":340,"y":196,"w":268,"h":304,"visible":true} |
| ✅ | 1000×640：预览 SVG 可见 | {"x":340,"y":196,"w":268,"h":304,"visible":true} |
| ✅ | 1000×640：左右面板均可视（三栏未被堆叠） | {"left":{"x":0,"y":58,"w":244,"h":582,"visible":true},"right":{"x":704,"y":58,"w":296,"h":582,"visible":true}} |
| ✅ | 1000×640：三栏列宽为紧凑布局（244 / 1fr / 296） | ["244px","460px","296px"] |
| ✅ | 950×640：.app display = grid | grid |
| ✅ | 950×640：grid 三列（实际 3 列） | {"tracks":["244px","410px","296px"],"gridTemplateColumns":"244px 410px 296px"} |
| ✅ | 950×640：无横向溢出（scrollWidth 950 <= 951） | {"bodyScrollWidth":950,"docScrollWidth":950,"innerWidth":950} |
| ✅ | 950×640：预览 stage 可见（宽 410px） | {"x":244,"y":189,"w":410,"h":337,"visible":true} |
| ✅ | 950×640：#figure-shell 宽 248px > 200 | {"x":325,"y":219,"w":248,"h":281,"visible":true} |
| ✅ | 950×640：预览 SVG 可见 | {"x":325,"y":219,"w":248,"h":281,"visible":true} |
| ✅ | 950×640：左右面板均可视（三栏未被堆叠） | {"left":{"x":0,"y":58,"w":244,"h":582,"visible":true},"right":{"x":654,"y":58,"w":296,"h":582,"visible":true}} |
| ✅ | 899×640（堆叠断点）：.app display = block | block |
| ✅ | 899×640（堆叠断点）：无横向溢出（scrollWidth 899 <= 900） | {"bodyScrollWidth":899,"docScrollWidth":899,"innerWidth":899} |
| ✅ | 899×640（堆叠断点）：预览 stage 可见（宽 899px） | {"x":0,"y":881,"w":899,"h":369,"visible":true} |
| ✅ | 899×640（堆叠断点）：#figure-shell 宽 276px > 200 | {"x":312,"y":911,"w":276,"h":313,"visible":true} |
| ✅ | 899×640（堆叠断点）：预览 SVG 可见 | {"x":312,"y":911,"w":276,"h":313,"visible":true} |
| ✅ | 1366×768：.app display = grid | grid |
| ✅ | 1366×768：grid 三列（实际 3 列） | {"tracks":["276px","764px","326px"],"gridTemplateColumns":"276px 764px 326px"} |
| ✅ | 1366×768：无横向溢出（scrollWidth 1366 <= 1367） | {"bodyScrollWidth":1366,"docScrollWidth":1366,"innerWidth":1366} |
| ✅ | 1366×768：预览 stage 可见（宽 764px） | {"x":276,"y":137,"w":764,"h":517,"visible":true} |
| ✅ | 1366×768：#figure-shell 宽 406px > 250 | {"x":455,"y":167,"w":406,"h":461,"visible":true} |
| ✅ | 1366×768：预览 SVG 可见 | {"x":455,"y":167,"w":406,"h":461,"visible":true} |
| ✅ | 1366×768：左右面板均可视（三栏未被堆叠） | {"left":{"x":0,"y":58,"w":276,"h":710,"visible":true},"right":{"x":1040,"y":58,"w":326,"h":710,"visible":true}} |
| ✅ | 1440×900：.app display = grid | grid |
| ✅ | 1440×900：grid 三列（实际 3 列） | {"tracks":["276px","838px","326px"],"gridTemplateColumns":"276px 838px 326px"} |
| ✅ | 1440×900：无横向溢出（scrollWidth 1440 <= 1441） | {"bodyScrollWidth":1440,"docScrollWidth":1440,"innerWidth":1440} |
| ✅ | 1440×900：预览 stage 可见（宽 838px） | {"x":276,"y":137,"w":838,"h":649,"visible":true} |
| ✅ | 1440×900：#figure-shell 宽 522px > 250 | {"x":434,"y":167,"w":522,"h":593,"visible":true} |
| ✅ | 1440×900：预览 SVG 可见 | {"x":434,"y":167,"w":522,"h":593,"visible":true} |
| ✅ | 1440×900：左右面板均可视（三栏未被堆叠） | {"left":{"x":0,"y":58,"w":276,"h":842,"visible":true},"right":{"x":1114,"y":58,"w":326,"h":842,"visible":true}} |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![L-01-layout-1000x640.png](<shots-v1.1/L-01-layout-1000x640.png>)
- ![L-02-layout-950x640.png](<shots-v1.1/L-02-layout-950x640.png>)
- ![L-03-layout-899x640-stacked.png](<shots-v1.1/L-03-layout-899x640-stacked.png>)
- ![L-04-layout-1366x768.png](<shots-v1.1/L-04-layout-1366x768.png>)
- ![L-05-layout-1440x900.png](<shots-v1.1/L-05-layout-1440x900.png>)

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
      "y": 166,
      "w": 460,
      "h": 360,
      "visible": true
    },
    "shell": {
      "x": 340,
      "y": 196,
      "w": 268,
      "h": 304,
      "visible": true
    },
    "previewSvg": {
      "x": 340,
      "y": 196,
      "w": 268,
      "h": 304,
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
      "width": 268,
      "height": 304
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
      "y": 189,
      "w": 410,
      "h": 337,
      "visible": true
    },
    "shell": {
      "x": 325,
      "y": 219,
      "w": 248,
      "h": 281,
      "visible": true
    },
    "previewSvg": {
      "x": 325,
      "y": 219,
      "w": 248,
      "h": 281,
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
      "width": 248,
      "height": 281
    }
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
      "h": 2181,
      "visible": true
    },
    "stage": {
      "x": 0,
      "y": 881,
      "w": 899,
      "h": 369,
      "visible": true
    },
    "shell": {
      "x": 312,
      "y": 911,
      "w": 276,
      "h": 313,
      "visible": true
    },
    "previewSvg": {
      "x": 312,
      "y": 911,
      "w": 276,
      "h": 313,
      "visible": true
    },
    "leftPanel": {
      "x": 0,
      "y": 58,
      "w": 899,
      "h": 746,
      "visible": true
    },
    "rightPanel": {
      "x": 0,
      "y": 1364,
      "w": 899,
      "h": 876,
      "visible": true
    },
    "workspace": {
      "x": 0,
      "y": 804,
      "w": 899,
      "h": 560,
      "visible": true
    },
    "shellSizeCss": {
      "width": 276,
      "height": 313
    }
  },
  "layout-1366x768": {
    "innerWidth": 1366,
    "innerHeight": 768,
    "appDisplay": "grid",
    "gridTemplateColumns": "276px 764px 326px",
    "columnCount": 3,
    "columnTracks": [
      "276px",
      "764px",
      "326px"
    ],
    "bodyScrollWidth": 1366,
    "docScrollWidth": 1366,
    "app": {
      "x": 0,
      "y": 58,
      "w": 1366,
      "h": 710,
      "visible": true
    },
    "stage": {
      "x": 276,
      "y": 137,
      "w": 764,
      "h": 517,
      "visible": true
    },
    "shell": {
      "x": 455,
      "y": 167,
      "w": 406,
 …
```

## 导出文件校验

| 标签 | 格式 | 字节 | API 像素 | Python 校验 | 文件 |
| --- | --- | ---: | --- | --- | --- |
| PNG 300DPI 白底 | PNG | 515386 | 2008×2265 | ✅ 通过 | `artifacts/exports-v1.1/fp-e2e-png-300.png` |
| PNG 透明背景 | PNG | 513700 | 2008×2265 | ✅ 通过 | `artifacts/exports-v1.1/fp-e2e-png-transparent.png` |
| JPG 300DPI 质量95 | JPG | 494724 | 2008×2265 | ✅ 通过 | `artifacts/exports-v1.1/fp-e2e-jpg-q95.jpg` |
| JPG 300DPI 质量60 | JPG | 211206 | 2008×2265 | ✅ 通过 | `artifacts/exports-v1.1/fp-e2e-jpg-q60.jpg` |
| SVG 白底 | SVG | 495235 | 643×725 | ✅ 通过 | `artifacts/exports-v1.1/fp-e2e-figure.svg` |
| SVG 透明背景 | SVG | 495232 | 643×725 | ✅ 通过 | `artifacts/exports-v1.1/fp-e2e-figure-transparent.svg` |
| PDF 300DPI | PDF | 495620 | 2008×2265 | ✅ 通过 | `artifacts/exports-v1.1/fp-e2e-figure.pdf` |
| PDF 渲染图 | PNG | 135552 | - | ✅ 通过 | `artifacts/exports-v1.1/fp-e2e-pdf.png` |
| PNG 150DPI | PNG | 229655 | 1004×1132 | ✅ 通过 | `artifacts/exports-v1.1/fp-e2e-png-150dpi.png` |
| PNG 300DPI | PNG | 515386 | 2008×2265 | ✅ 通过 | `artifacts/exports-v1.1/fp-e2e-png-300dpi.png` |
| PNG 600DPI | PNG | 1676353 | 4016×4530 | ✅ 通过 | `artifacts/exports-v1.1/fp-e2e-png-600dpi.png` |
| UI 下载 PNG | PNG | 515386 | 2008×2265 | ✅ 通过 | `artifacts/exports-v1.1/fp-e2e-ui.png` |
| 顶栏 UI 下载 PNG | PNG | 515386 | 2008×2265 | ✅ 通过 | `artifacts/exports-v1.1/fp-e2e-top.png` |
| 合并 SVG（2×3 首行跨 3 列） | SVG | 318062 | 643×340 | ✅ 通过 | `artifacts/exports-v1.1/fp-v11-merge.svg` |
| 合并 PNG 300DPI | PNG | 276870 | 2008×1063 | ✅ 通过 | `artifacts/exports-v1.1/fp-v11-merge.png` |
| 合并 PDF 200DPI | PDF | 147516 | 1339×709 | ✅ 通过 | `artifacts/exports-v1.1/fp-v11-merge.pdf` |
| 合并 PDF 渲染图 | PNG | 78135 | - | ✅ 通过 | `artifacts/exports-v1.1/fp-v11-merge-pdf.png` |
| 批量编号 SVG | SVG | 237378 | 643×321 | ✅ 通过 | `artifacts/exports-v1.1/fp-v11-batch-label.svg` |

## 关键证据摘要

- A 首屏：ready=true，默认布局 3×2，viewBox=ok
- B 布局：3×2 cellCount=6，2×3 cellCount=6，1×6 cellCount=6
- C 上传：最终 filled=[0,1,2,3]
- D 编号：9 位置归一化坐标 {"tl":{"nx":0.04,"ny":0.041,"anchor":"start"},"tc":{"nx":0.501,"ny":0.041,"anchor":"middle"},"tr":{"nx":0.962,"ny":0.041,"anchor":"end"},"ml":{"nx":0.04,"ny":0.495,"anchor":"start"},"mc":{"nx":0.501,"ny":0.495,"anchor":"middle"},"mr":{"nx":0.962,"ny":0.495,"anchor":"end"},"bl":{"nx":0.04,"ny":0.948,"anchor":"start"},"bc":{"nx":0.501,"ny":0.948,"anchor":"middle"},"br":{"nx":0.962,"ny":0.948,"anchor":"end"}}
- E 导出：成品 170×191.75 mm，6 张图，导出文件 13 个
- F 稳定性：自动保存后端=indexeddb，恢复图片 2 张，IndexedDB={"databases":["figureplay"],"hasFigureplay":true}
- G 合并：merges=[{"r":0,"c":0,"rs":1,"cs":3}]，面板数=4，cell-hit=4
- H 模板：double-1plus3 rows=2 cols=3 widthMm=170 面板=4 merges=[{"r":0,"c":0,"rs":1,"cs":3}]
- I 批量编号：导出校验 1/1 通过
- J 粘贴弹窗：v1.1 契约探测 {"version":"1.1.0","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}
- K 桌面桥：window.chrome.webview mock 安装成功，v1.1 探测 {"version":"1.1.0","apiPresent":true,"missingMethods":[],"missingFields":[],"gridCellCount":6,"cellCount":6,"panelCount":6,"hasLayoutMerges":true}
- L 高DPI布局：1000×640 display=grid columns=3 stage.w=460 shell.w=268，950 三栏、899 堆叠、1366/1440 复检通过

## 契约差异与已知问题

无（未发现契约差异）。

## 复现命令

```powershell
# 完整 E2E（含报告与截图）
node E:\FigurePlay\_dev\e2e.mjs --final-v11
# 全量（v1.0 回归 + v1.1 新功能）
node E:\FigurePlay\_dev\e2e.mjs --suite=all --final-v11
# 只跑某场景 / suite
node E:\FigurePlay\_dev\e2e.mjs --only=G
node E:\FigurePlay\_dev\e2e.mjs --suite=v11
```

shots 目录：`_dev/shots-v1.1/`（32 张）；exports 目录：`_dev/artifacts/exports-v1.1/`（18 个文件）
