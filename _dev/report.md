# FigurePlay E2E 验证报告

- 生成时间：2026-11-05T17:46:12.537Z
- 运行 id：`2026-11-05_17-45-53-007`
- 应用：`E:\FigurePlay\index.html`
- 环境：Node v24.21.0；playwright-core 1.64.1；Chrome 156.0.8078.80；headless=true
- 启动参数：（无额外参数）
- 结论：**PASS** — 场景 6/6 通过；断言 229/229 通过

应用文件快照：

| 文件 | 字节 | mtime |
| --- | ---: | --- |
| index.html | 21045 | 2026-11-05T17:42:17.748Z |
| assets/styles.css | 24920 | 2026-11-05T17:40:46.064Z |
| js/app.js | 60959 | 2026-11-05T17:42:17.711Z |
| js/demo.js | 10054 | 2026-11-05T17:34:34.962Z |
| js/export.js | 4949 | 2026-11-05T17:43:13.148Z |
| js/layout.js | 7778 | 2026-11-05T17:30:57.688Z |
| js/pdf.js | 5103 | 2026-11-05T17:32:45.091Z |
| js/render-canvas.js | 4165 | 2026-11-05T17:32:44.946Z |
| js/render-svg.js | 12145 | 2026-11-05T17:34:34.907Z |
| js/storage.js | 3711 | 2026-11-05T17:32:16.518Z |
| js/util.js | 16763 | 2026-11-05T17:32:16.558Z |

## 场景结果

| 场景 | 标题 | 结果 | 断言 | 耗时 |
| --- | --- | --- | ---: | ---: |
| A | 首屏 | ✅ PASS | 26/26 | 1026 ms |
| B | 布局 | ✅ PASS | 34/34 | 1396 ms |
| C | 上传 | ✅ PASS | 28/28 | 1293 ms |
| D | 编号 | ✅ PASS | 79/79 | 2997 ms |
| E | 导出 | ✅ PASS | 43/43 | 7636 ms |
| F | 稳定性 | ✅ PASS | 19/19 | 3209 ms |

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
- ![A-01-first-screen.png](<shots/A-01-first-screen.png>)

关键证据：

```json
{
  "readyFlags": {
    "dataset": "1",
    "apiReady": true,
    "version": "1.0.0",
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
      "cellH": 63
    },
    "cells": [
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
    "cellCount": 6,
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
      "fit": "contain"
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
      "bg": "none",
      "bgColor": "#ffffff",
      "bgOpacity": 0.75
    },
    "export": {
      "filename": "figure",
      "format": "png",
      "dpi": 300,
      "jpgQuality": 0.95,
      "transparent": false
    },
    "selectedCell": null,
    "cells": [
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  "initialUi": {
    "rows": "3",
    "cols": "2",
    "width": "170",
    "aspectW": "4",
    "aspectH": "3",
    "colGap": "2",
    "rowGap": "2",
    "margin": "0",
    "bgMode": "white",
    "labelShow": true,
    "labelScheme": "alpha-paren",
    "labelStart": "1",
    "labelOrder": "row",
    "labelSkipEmpty": true,
    "labelInset": "1.5",
    "labelOffsetX": "0",
    "labelOffsetY": "0",
    "labelSize": "9",
    "labelBold": false,
    "labelItalic": false,
    "labelColor": "#000000",
    "filename": "figure",
    "dpi": "300",
    "jpgQuality": "95",
    "transparent": false,
    "activeFormat": {
      "format": "png"
    },
    "activePos": {
      "pos": "tl"
    },
    "activeMatrixCells": [
      {
        "r": 1,
        "c": 1
      },
      {
        "r": 1,
        "c": 2
      },
      {
        "r": 2,
        "c": 1
      },
      {
        "r": 2,
        "c": 2
      },
      {
        "r": 3,
        "c": 1
      },
      {
        "r": 3,
        "c": 2
      }
    ],
    "matrixCaption": "3 行 × 2 列",
    "activeDpiChip": {
      "dpi": "300"
    },
    "btnExportText": "导出 PNG",
    "statusText": "就绪"
  },
  "structure": {
    "matrixButtons": 36,
    "posButtons": 9,
    "fileInputMultiple": true,
    "fileInputHidden": true,
    "previewSvg": {
      "width": 522.328125,
      "height": 593
    },
    "exportButton": {
      "width": 275,
      "height": 40
    },
    "screenshotBackground": "#ffffff"
  }
}
```

## B. 布局 — PASS

> 矩阵/输入/API 三种方式改行列：格子数量、排列、几何正确；改行列后已有图片保留合理

| 结果 | 断言 | 详情 |
| --- | --- | --- |
| ✅ | [3×2] 行列/格子数正确（方式:matrix） | {"geom":{"rows":3,"cols":2,"widthMm":170,"heightMm":193,"cellW":84,"cellH":63},"cellCount":6} |
| ✅ | [3×2] 几何（cellW/cellH/heightMm）与公式一致 | [] |
| ✅ | [3×2] 预览格子排列为 3 行 × 2 列 | [] |
| ✅ | [3×2] 预览 viewBox 与成品尺寸一致 | 0 0 170 193 |
| ✅ | [2×3] 行列/格子数正确（方式:inputs） | {"geom":{"rows":2,"cols":3,"widthMm":170,"heightMm":85.00000000000001,"cellW":55.333333333333336,"cellH":41.50000000000001},"cellCount":6} |
| ✅ | [2×3] 几何（cellW/cellH/heightMm）与公式一致 | [] |
| ✅ | [2×3] 预览格子排列为 2 行 × 3 列 | [] |
| ✅ | [2×3] 预览 viewBox 与成品尺寸一致 | 0 0 170 85 |
| ✅ | [1×6] 行列/格子数正确（方式:api） | {"geom":{"rows":1,"cols":6,"widthMm":170,"heightMm":20.000000000000004,"cellW":26.666666666666668,"cellH":20.000000000000004},"cellCount":6} |
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
- ![B-01-layout-3x2.png](<shots/B-01-layout-3x2.png>)
- ![B-02-layout-2x3.png](<shots/B-02-layout-2x3.png>)
- ![B-03-layout-1x6.png](<shots/B-03-layout-1x6.png>)
- ![B-04-layout-final.png](<shots/B-04-layout-final.png>)

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
      "cellH": 63
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
      "cellH": 41.50000000000001
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
      "cellH": 20.000000000000004
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
- ![C-01-upload-batch.png](<shots/C-01-upload-batch.png>)
- ![C-02-upload-final.png](<shots/C-02-upload-final.png>)

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
- ![D-01-labels-positions.png](<shots/D-01-labels-positions.png>)
- ![D-02-labels-font.png](<shots/D-02-labels-font.png>)
- ![D-03-labels-final.png](<shots/D-03-labels-final.png>)

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
| ✅ | PNG 300DPI 白底：文件生成（PNG，515386 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_17-45-53-007\\exports\\fp-e2e-png-300.png","size":515386} |
| ✅ | PNG 300DPI 白底：Python 校验通过 | OK |
| ✅ | PNG 300DPI 返回 widthPx/heightPx 符合 mm/25.4×DPI | {"api":[2008,2265],"expected":[2008,2265]} |
| ✅ | PNG 透明背景：文件生成（PNG，513700 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_17-45-53-007\\exports\\fp-e2e-png-transparent.png","size":513700} |
| ✅ | PNG 透明背景：Python 校验通过 | OK |
| ✅ | 透明 PNG 文件名 = fp-e2e-png-transparent.png | fp-e2e-png-transparent.png |
| ✅ | JPG 300DPI 质量95：文件生成（JPG，494724 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_17-45-53-007\\exports\\fp-e2e-jpg-q95.jpg","size":494724} |
| ✅ | JPG 300DPI 质量95：Python 校验通过 | OK |
| ✅ | JPG 300DPI 质量60：文件生成（JPG，211206 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_17-45-53-007\\exports\\fp-e2e-jpg-q60.jpg","size":211206} |
| ✅ | JPG 300DPI 质量60：Python 校验通过 | OK |
| ✅ | JPG 质量 95 文件体积 > 质量 60（质量参数生效） | {"q95":494724,"q60":211206} |
| ✅ | SVG 白底：文件生成（SVG，495235 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_17-45-53-007\\exports\\fp-e2e-figure.svg","size":495235} |
| ✅ | SVG 白底：Python 校验通过 | OK |
| ✅ | SVG 返回 mime=image/svg+xml | image/svg+xml |
| ✅ | SVG 透明背景：文件生成（SVG，495232 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_17-45-53-007\\exports\\fp-e2e-figure-transparent.svg","size":495232} |
| ✅ | SVG 透明背景：Python 校验通过 | OK |
| ✅ | SVG 透明导出文件名 = fp-e2e-figure-transparent.svg | fp-e2e-figure-transparent.svg |
| ✅ | PDF 300DPI：文件生成（PDF，495620 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_17-45-53-007\\exports\\fp-e2e-figure.pdf","size":495620} |
| ✅ | PDF 300DPI：Python 校验通过 | OK |
| ✅ | PDF 渲染图非空白且四角为白底 | OK |
| ✅ | PDF 返回 mime=application/pdf 且页数校验通过 | {"mime":"application/pdf","pageCount":1} |
| ✅ | PNG 150DPI：文件生成（PNG，229655 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_17-45-53-007\\exports\\fp-e2e-png-150dpi.png","size":229655} |
| ✅ | PNG 150DPI：Python 校验通过 | OK |
| ✅ | PNG 150DPI 像素尺寸 = mm/25.4×150 | {"api":[1004,1132],"expected":[1004,1132]} |
| ✅ | PNG 300DPI：文件生成（PNG，515386 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_17-45-53-007\\exports\\fp-e2e-png-300dpi.png","size":515386} |
| ✅ | PNG 300DPI：Python 校验通过 | OK |
| ✅ | PNG 300DPI 像素尺寸 = mm/25.4×300 | {"api":[2008,2265],"expected":[2008,2265]} |
| ✅ | PNG 600DPI：文件生成（PNG，1676353 B） | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_17-45-53-007\\exports\\fp-e2e-png-600dpi.png","size":1676353} |
| ✅ | PNG 600DPI：Python 校验通过 | OK |
| ✅ | PNG 600DPI 像素尺寸 = mm/25.4×600 | {"api":[4016,4530],"expected":[4016,4530]} |
| ✅ | UI 导出按钮触发下载且文件已保存 | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_17-45-53-007\\exports\\fp-e2e-ui.png","size":515386} |
| ✅ | UI 下载文件名 = fp-e2e-ui.png | fp-e2e-ui.png |
| ✅ | UI 下载 PNG 尺寸/内容正确 | OK |
| ✅ | 顶栏导出按钮 #btn-export-top 触发下载并保存 | {"path":"E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_17-45-53-007\\exports\\fp-e2e-top.png","size":515386} |
| ✅ | 顶栏导出文件名 = fp-e2e-top.png | fp-e2e-top.png |
| ✅ | 顶栏导出 PNG 尺寸/内容正确 | OK |
| ✅ | exportBase64 overrides（dpi/filename）生效 | {"widthPx":1004,"filename":"fp-e2e-override.png"} |
| ✅ | 导出过程中/后状态栏提示已导出 | 已导出 fp-e2e-top.png（503.3 KB，71 ms） |
| ✅ | 无页面 JS 异常（pageerror） | [] |
| ✅ | 无控制台 error | [] |
| ✅ | 无应用资源加载失败（js/css/assets） | [] |

诊断：pageerror=0，console error=0，失败资源请求=0

截图：
- ![E-01-export-setup.png](<shots/E-01-export-setup.png>)
- ![E-02-transparent-preview.png](<shots/E-02-transparent-preview.png>)
- ![E-03-export-final.png](<shots/E-03-export-final.png>)

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
  "transparentPreviewScreenshot": "E:\\FigurePlay\\_dev\\artifacts\\e2e\\2026-11-05_17-45-53-007\\screenshots\\E-02-transparent-preview.png",
  "uiStatusAfterExport": "已导出 fp-e2e-top.png（503.3 KB，71 ms）"
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
| ✅ | 改动后自动保存写入成功 | {"backend":"indexeddb","savedAt":1793900770251} |
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
- ![F-01-viewport-1366x768.png](<shots/F-01-viewport-1366x768.png>)
- ![F-02-before-reload.png](<shots/F-02-before-reload.png>)
- ![F-03-after-reload.png](<shots/F-03-after-reload.png>)
- ![F-04-stability-final.png](<shots/F-04-stability-final.png>)

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
      "fit": "contain"
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
    "savedAt": 1793900770251,
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
      "fit": "contain"
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

## 导出文件校验

| 标签 | 格式 | 字节 | API 像素 | Python 校验 | 文件 |
| --- | --- | ---: | --- | --- | --- |
| PNG 300DPI 白底 | PNG | 515386 | 2008×2265 | ✅ 通过 | `artifacts/exports/fp-e2e-png-300.png` |
| PNG 透明背景 | PNG | 513700 | 2008×2265 | ✅ 通过 | `artifacts/exports/fp-e2e-png-transparent.png` |
| JPG 300DPI 质量95 | JPG | 494724 | 2008×2265 | ✅ 通过 | `artifacts/exports/fp-e2e-jpg-q95.jpg` |
| JPG 300DPI 质量60 | JPG | 211206 | 2008×2265 | ✅ 通过 | `artifacts/exports/fp-e2e-jpg-q60.jpg` |
| SVG 白底 | SVG | 495235 | 643×725 | ✅ 通过 | `artifacts/exports/fp-e2e-figure.svg` |
| SVG 透明背景 | SVG | 495232 | 643×725 | ✅ 通过 | `artifacts/exports/fp-e2e-figure-transparent.svg` |
| PDF 300DPI | PDF | 495620 | 2008×2265 | ✅ 通过 | `artifacts/exports/fp-e2e-figure.pdf` |
| PDF 渲染图 | PNG | 135552 | - | ✅ 通过 | `artifacts/exports/fp-e2e-pdf.png` |
| PNG 150DPI | PNG | 229655 | 1004×1132 | ✅ 通过 | `artifacts/exports/fp-e2e-png-150dpi.png` |
| PNG 300DPI | PNG | 515386 | 2008×2265 | ✅ 通过 | `artifacts/exports/fp-e2e-png-300dpi.png` |
| PNG 600DPI | PNG | 1676353 | 4016×4530 | ✅ 通过 | `artifacts/exports/fp-e2e-png-600dpi.png` |
| UI 下载 PNG | PNG | 515386 | 2008×2265 | ✅ 通过 | `artifacts/exports/fp-e2e-ui.png` |
| 顶栏 UI 下载 PNG | PNG | 515386 | 2008×2265 | ✅ 通过 | `artifacts/exports/fp-e2e-top.png` |

## 关键证据摘要

- A 首屏：ready=true，默认布局 3×2，viewBox=ok
- B 布局：3×2 cellCount=6，2×3 cellCount=6，1×6 cellCount=6
- C 上传：最终 filled=[0,1,2,3]
- D 编号：9 位置归一化坐标 {"tl":{"nx":0.04,"ny":0.041,"anchor":"start"},"tc":{"nx":0.501,"ny":0.041,"anchor":"middle"},"tr":{"nx":0.962,"ny":0.041,"anchor":"end"},"ml":{"nx":0.04,"ny":0.495,"anchor":"start"},"mc":{"nx":0.501,"ny":0.495,"anchor":"middle"},"mr":{"nx":0.962,"ny":0.495,"anchor":"end"},"bl":{"nx":0.04,"ny":0.948,"anchor":"start"},"bc":{"nx":0.501,"ny":0.948,"anchor":"middle"},"br":{"nx":0.962,"ny":0.948,"anchor":"end"}}
- E 导出：成品 170×191.75 mm，6 张图，导出文件 13 个
- F 稳定性：自动保存后端=indexeddb，恢复图片 2 张，IndexedDB={"databases":["figureplay"],"hasFigureplay":true}

## 契约差异与已知问题

无（未发现契约差异）。

## 复现命令

```powershell
# 完整 E2E（含报告与截图）
node E:\FigurePlay\_dev\e2e.mjs --final
# 只跑某场景
node E:\FigurePlay\_dev\e2e.mjs --only=A
```

shots 目录：`_dev/shots/`（17 张）；exports 目录：`_dev/artifacts/exports/`（13 个文件）
