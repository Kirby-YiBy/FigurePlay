/**
 * FigurePlay E2E 场景 A–F（真实断言）
 *
 * A 首屏 / B 布局 / C 上传 / D 编号 / E 导出 / F 稳定性
 * 依赖：lib/app.mjs（应用契约 helper）、lib/verify.mjs + tools/verify-exports.py（产物校验）
 *
 * 仅写 _dev/**，不修改应用文件。
 */
import fs from 'node:fs';
import path from 'node:path';

import * as app from './lib/app.mjs';
import { SAMPLE_FILES, samplePath } from './lib/browser.mjs';
import { describeVerify, verifyExport } from './lib/verify.mjs';

const TOL = 0.02;
const POSITIONS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];
const POSITION_QUADRANT = {
  tl: { x: 'left', y: 'top' }, tc: { x: 'center', y: 'top' }, tr: { x: 'right', y: 'top' },
  ml: { x: 'left', y: 'center' }, mc: { x: 'center', y: 'center' }, mr: { x: 'right', y: 'center' },
  bl: { x: 'left', y: 'bottom' }, bc: { x: 'center', y: 'bottom' }, br: { x: 'right', y: 'bottom' },
};
const SCHEME_CASES = [
  { id: 'alpha-paren', texts: ['(a)', '(b)', '(c)'] },
  { id: 'alpha-rparen', texts: ['a)', 'b)', 'c)'] },
  { id: 'alpha-dot', texts: ['a.', 'b.', 'c.'] },
  { id: 'alpha-bare', texts: ['a', 'b', 'c'] },
  { id: 'Alpha-paren', texts: ['(A)', '(B)', '(C)'] },
  { id: 'Alpha-rparen', texts: ['A)', 'B)', 'C)'] },
  { id: 'roman-paren', texts: ['(i)', '(ii)', '(iii)'] },
  { id: 'roman-rparen', texts: ['i)', 'ii)', 'iii)'] },
  { id: 'Roman-paren', texts: ['(I)', '(II)', '(III)'] },
  { id: 'Roman-rparen', texts: ['I)', 'II)', 'III)'] },
  { id: 'number-paren', texts: ['(1)', '(2)', '(3)'] },
  { id: 'number-rparen', texts: ['1)', '2)', '3)'] },
  { id: 'number-dot', texts: ['1.', '2.', '3.'] },
  { id: 'number-bare', texts: ['1', '2', '3'] },
];
const SIX_SAMPLES = ['sample-1.png', 'sample-2.png', 'sample-3.png', 'sample-4.png', 'sample-5.png', 'sample-6.png'];

/* ----------------------------- 小工具 ----------------------------- */

function approx(a, b, tol = TOL) {
  return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tol;
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

/** 预览 geom 与独立计算值比对 */
function geometryMismatches(infoGeom, expected) {
  const diffs = [];
  for (const key of ['rows', 'cols', 'widthMm', 'heightMm', 'cellW', 'cellH']) {
    if (!approx(infoGeom[key], expected[key], 0.011)) {
      diffs.push(`${key}: app=${infoGeom[key]} expected=${round(expected[key], 4)}`);
    }
  }
  return diffs;
}

/** 预览格子命中区应构成 rows×cols 网格（行主序，与状态中的几何计算一致） */
function gridMismatches(hits, expectedGeom) {
  const diffs = [];
  if (hits.length !== expectedGeom.cells.length) {
    return [`cell-hit 数量 ${hits.length} != ${expectedGeom.cells.length}`];
  }
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    const cell = expectedGeom.cells[i];
    if (hit.index !== cell.index) diffs.push(`hit[${i}].index=${hit.index} != ${cell.index}`);
    if (!approx(hit.x, cell.x, 0.02)) diffs.push(`cell ${i} x=${hit.x} expected=${round(cell.x, 3)}`);
    if (!approx(hit.y, cell.y, 0.02)) diffs.push(`cell ${i} y=${hit.y} expected=${round(cell.y, 3)}`);
    if (!approx(hit.w, cell.w, 0.02)) diffs.push(`cell ${i} w=${hit.w} expected=${round(cell.w, 3)}`);
    if (!approx(hit.h, cell.h, 0.02)) diffs.push(`cell ${i} h=${hit.h} expected=${round(cell.h, 3)}`);
  }
  return diffs;
}

async function waitPreview(page, predicate, arg, label) {
  await app.waitFor(page, predicate, arg, { timeout: 10000, label });
}

function labelsEqual(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  return actual.every((item, i) => item.cellIndex === expected[i].cellIndex && item.text === expected[i].text);
}

/** 断言编号：previewInfo.labels 与预期完全一致（数量/顺序/文字） */
async function checkLabels(ctx, page, label, expected, extra = {}) {
  const info = await app.api.getPreviewInfo(page);
  const dom = await app.getPreviewDom(page);
  const actual = info.labels.map((item) => ({ cellIndex: item.cellIndex, text: item.text }));
  ctx.check(`${label}：编号数量 = ${expected.length}`, actual.length === expected.length, actual.length);
  ctx.check(`${label}：编号内容/顺序正确`, labelsEqual(actual, expected),
    { actual, expected: expected.map((item) => `${item.cellIndex}:${item.text}`) });
  ctx.check(`${label}：DOM 编号文字一致`,
    JSON.stringify(dom.labels.map((item) => item.text)) === JSON.stringify(expected.map((item) => item.text)),
    dom.labels.map((item) => item.text));
  if (extra.expectEmptySkipped != null) {
    const labelsOnEmpty = actual.filter((item) => expected.every((e) => e.cellIndex !== item.cellIndex));
    ctx.check(`${label}：空子图不参与编号`, labelsOnEmpty.length === 0, labelsOnEmpty);
  }
  return info;
}

function activeImages(dom) {
  return dom.images.filter((image) => image.display !== 'none' && image.href);
}

/* ----------------------------- 场景 A ----------------------------- */
const firstScreen = {
  code: 'A',
  name: 'first-screen',
  title: '首屏',
  description: '应用可加载、就绪标志正确、默认状态/UI 正确、无 JS 报错、截图',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);

    const readyFlags = await page.evaluate(() => ({
      dataset: document.documentElement.dataset.figplayReady,
      apiReady: !!(window.__FIGPLAY__ && window.__FIGPLAY__.ready === true),
      version: window.__FIGPLAY__ && window.__FIGPLAY__.version,
      apiMethods: window.__FIGPLAY__
        ? ['getState', 'setLayout', 'setUploadTarget', 'getPreviewInfo', 'loadDemo', 'clearAll', 'exportBase64']
          .filter((name) => typeof window.__FIGPLAY__[name] === 'function')
        : [],
    }));
    ctx.evidence.readyFlags = readyFlags;
    ctx.check('就绪标志 dataset.figplayReady === "1"', readyFlags.dataset === '1', readyFlags.dataset);
    ctx.check('window.__FIGPLAY__.ready === true', readyFlags.apiReady === true);
    ctx.check('测试 API 方法齐全', readyFlags.apiMethods.length === 7, readyFlags.apiMethods);

    const title = await page.title();
    ctx.check('页面 title 含 FigurePlay', /FigurePlay/.test(title), title);

    const preview = await app.api.getPreviewInfo(page);
    const state = await app.api.getState(page);
    const dom = await app.getPreviewDom(page);
    const ui = await app.getUiValues(page);
    ctx.evidence.initialPreview = preview;
    ctx.evidence.initialState = state;
    ctx.evidence.initialUi = ui;

    const expectedGeom = app.computeGeometryMm(state.layout);
    const geomDiffs = geometryMismatches(preview.geom, expectedGeom);
    ctx.check('默认布局 3 行 × 2 列', preview.geom.rows === 3 && preview.geom.cols === 2,
      `${preview.geom.rows}x${preview.geom.cols}`);
    ctx.check('默认格子数 = 6 且全部为空', preview.cellCount === 6 && preview.filled.length === 0
      && preview.imageCount === 0 && preview.labels.length === 0,
    { cellCount: preview.cellCount, filled: preview.filled, imageCount: preview.imageCount });
    ctx.check('几何计算与 js/layout.js 公式一致', geomDiffs.length === 0, geomDiffs);
    ctx.check('默认成品尺寸 170 × %.2f mm'.replace('%.2f', round(expectedGeom.heightMm, 2)),
      preview.geom.widthMm === 170 && approx(preview.geom.heightMm, expectedGeom.heightMm, 0.01),
      { widthMm: preview.geom.widthMm, heightMm: preview.geom.heightMm });
    ctx.check('预览 SVG 有 6 个 .cell-hit', dom.cellHitCount === 6, dom.cellHitCount);
    ctx.check('预览 viewBox "0 0 170 H"', dom.viewBox === `0 0 170 ${round(expectedGeom.heightMm, 4)}`,
      dom.viewBox);
    ctx.check('预览无图片、无编号文字', activeImages(dom).length === 0 && dom.labels.length === 0,
      { images: activeImages(dom).length, labels: dom.labels.length });

    // UI 默认值
    const uiChecks = [
      ['行数 = 3', ui.rows === '3', ui.rows],
      ['列数 = 2', ui.cols === '2', ui.cols],
      ['成品宽度 = 170', ui.width === '170', ui.width],
      ['矩阵选中 3×2（高亮 6 格）',
        ui.activeMatrixCells && ui.activeMatrixCells.length === 6
        && ui.activeMatrixCells.some((cell) => cell.r === 3 && cell.c === 2)
        && ui.matrixCaption === '3 行 × 2 列',
        { cells: ui.activeMatrixCells, caption: ui.matrixCaption }],
      ['编号默认开启、方案 (a)', ui.labelShow === true && ui.labelScheme === 'alpha-paren',
        { show: ui.labelShow, scheme: ui.labelScheme }],
      ['编号位置默认 tl', ui.activePos && ui.activePos.pos === 'tl', ui.activePos],
      ['导出格式默认 PNG、DPI=300', ui.activeFormat && ui.activeFormat.format === 'png' && ui.dpi === '300',
        { format: ui.activeFormat, dpi: ui.dpi }],
      ['导出按钮文字 = "导出 PNG"', ui.btnExportText === '导出 PNG', ui.btnExportText],
    ];
    for (const [label, condition, detail] of uiChecks) ctx.check(label, condition, detail);

    const structure = await page.evaluate(() => {
      const visible = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      };
      return {
        matrixButtons: document.querySelectorAll('#matrix-picker .mx').length,
        posButtons: document.querySelectorAll('#pos-picker .pos-btn').length,
        fileInputMultiple: !!document.getElementById('file-input').multiple,
        fileInputHidden: document.getElementById('file-input').hidden,
        previewSvg: visible('#preview-svg'),
        exportButton: visible('#btn-export'),
        screenshotBackground: document.querySelector('#preview-svg .figure-bg')?.getAttribute('fill'),
      };
    });
    ctx.evidence.structure = structure;
    ctx.check('矩阵选择器 36 个按钮', structure.matrixButtons === 36, structure.matrixButtons);
    ctx.check('编号位置 9 个按钮', structure.posButtons === 9, structure.posButtons);
    ctx.check('#file-input 为 multiple 且隐藏', structure.fileInputMultiple === true && structure.fileInputHidden === true);
    ctx.check('预览 SVG 与导出按钮可见', !!(structure.previewSvg && structure.previewSvg.width > 200
      && structure.exportButton && structure.exportButton.width > 100), {
      previewSvg: structure.previewSvg, exportButton: structure.exportButton,
    });

    ctx.evidence.screenshot = await ctx.screenshot('first-screen');
  },
};

/* ----------------------------- 场景 B ----------------------------- */
const layoutScenario = {
  code: 'B',
  name: 'layout',
  title: '布局',
  description: '矩阵/输入/API 三种方式改行列：格子数量、排列、几何正确；改行列后已有图片保留合理',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    await app.api.clearAll(page);

    const methods = [
      { rows: 3, cols: 2, method: 'matrix' },
      { rows: 2, cols: 3, method: 'inputs' },
      { rows: 1, cols: 6, method: 'api' },
    ];
    for (const { rows, cols, method } of methods) {
      if (method === 'matrix') await app.clickMatrix(page, rows, cols);
      else if (method === 'inputs') {
        await app.setNumberInput(page, '#rows-input', rows);
        await app.setNumberInput(page, '#cols-input', cols);
      } else {
        await app.api.setLayout(page, rows, cols);
      }
      await waitPreview(page,
        (target) => {
          const info = window.__FIGPLAY__.getPreviewInfo();
          return info.geom.rows === target[0] && info.geom.cols === target[1];
        }, [rows, cols], `layout ${rows}x${cols}`);

      const info = await app.api.getPreviewInfo(page);
      const state = await app.api.getState(page);
      const dom = await app.getPreviewDom(page);
      const expected = app.computeGeometryMm(state.layout);
      const geomDiffs = geometryMismatches(info.geom, expected);
      const gridDiffs = gridMismatches(dom.hits, expected);
      const tag = `[${rows}×${cols}]`;
      ctx.check(`${tag} 行列/格子数正确（方式:${method}）`,
        info.geom.rows === rows && info.geom.cols === cols && info.cellCount === rows * cols,
        { geom: info.geom, cellCount: info.cellCount });
      ctx.check(`${tag} 几何（cellW/cellH/heightMm）与公式一致`, geomDiffs.length === 0, geomDiffs);
      ctx.check(`${tag} 预览格子排列为 ${rows} 行 × ${cols} 列`, gridDiffs.length === 0, gridDiffs);
      ctx.check(`${tag} 预览 viewBox 与成品尺寸一致`,
        dom.viewBox === `0 0 ${round(expected.widthMm, 4)} ${round(expected.heightMm, 4)}`, dom.viewBox);
      ctx.evidence[`layout-${rows}x${cols}`] = {
        method, geom: info.geom, cellCount: info.cellCount, hits: dom.hits, viewBox: dom.viewBox,
      };
      await ctx.screenshot(`layout-${rows}x${cols}`);
    }

    // 改行列后已有图片保留：3×2 放 4 张，依次改 2×3 / 1×6 / 3×2
    await app.api.setLayout(page, 3, 2);
    await app.api.clearAll(page);
    const files = ['sample-1.png', 'sample-2.png', 'sample-3.png', 'sample-4.png'].map(samplePath);
    await app.uploadFiles(page, files, null, 4);
    const beforeState = await app.api.getState(page);
    const beforeNames = beforeState.cells.map((cell) => cell && cell.name);
    const beforeDom = await app.getPreviewDom(page);
    const beforeHrefs = activeImages(beforeDom).map((image) => `${image.cellIndex}:${image.href.slice(-32)}`);
    ctx.check('3×2 批量上传 4 张成功', beforeState.cells.filter(Boolean).length === 4,
      beforeState.cells.map((cell) => cell && cell.name));

    for (const [rows, cols] of [[2, 3], [1, 6], [3, 2]]) {
      await app.api.setLayout(page, rows, cols);
      const info = await app.api.getPreviewInfo(page);
      const state = await app.api.getState(page);
      const dom = await app.getPreviewDom(page);
      const names = state.cells.map((cell) => cell && cell.name);
      const tag = `改 ${rows}×${cols}`;
      ctx.check(`${tag} 后图片数量保留 4 张`, names.filter(Boolean).length === 4, names);
      ctx.check(`${tag} 后预览 imageCount = 4`, info.imageCount === 4, info.imageCount);
      ctx.check(`${tag} 后按原序号保留（前缀不变）`,
        names.slice(0, 4).every((name, i) => name === beforeNames[i]), { before: beforeNames, after: names });
      ctx.check(`${tag} 后格子数 = ${rows * cols}`, info.cellCount === rows * cols, info.cellCount);
      const hrefs = activeImages(dom).map((image) => `${image.cellIndex}:${image.href.slice(-32)}`);
      ctx.check(`${tag} 后图片数据未损坏（href 尾部不变）`,
        JSON.stringify(hrefs) === JSON.stringify(beforeHrefs), { before: beforeHrefs, after: hrefs });
    }

    // 缩小网格：3×2（4 张）→ 2×2 应保留前 4 张（超出丢弃会 toast，但这里不丢）
    await app.api.setLayout(page, 2, 2);
    const small = await app.api.getState(page);
    ctx.check('缩小到 2×2 后保留前 4 张（无丢失）',
      small.cells.filter(Boolean).length === 4, small.cells.map((cell) => cell && cell.name));

    // 6 张完整 → 2×2：应保留前 4 张、丢弃后 2 张且状态自洽
    await app.api.setLayout(page, 3, 2);
    await app.api.clearAll(page);
    await app.uploadFiles(page, SIX_SAMPLES.map(samplePath), null, 6);
    await app.api.setLayout(page, 2, 2);
    const shrunk = await app.api.getState(page);
    const shrunkInfo = await app.api.getPreviewInfo(page);
    const shrinkToast = await page.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    ctx.check('6 张 → 2×2：保留 4 张、丢弃 2 张且状态自洽',
      shrunk.cells.filter(Boolean).length === 4 && shrunkInfo.cellCount === 4 && shrunkInfo.imageCount === 4,
      { cells: shrunk.cells.filter(Boolean).length, imageCount: shrunkInfo.imageCount });
    ctx.check('缩小网格时弹出“移除超限图片”提示',
      /移除了?\s*2\s*张|超出网格/.test(shrinkToast), shrinkToast);

    await app.api.setLayout(page, 3, 2);
    ctx.evidence.screenshot = await ctx.screenshot('layout-final');
  },
};

/* ----------------------------- 场景 C ----------------------------- */
const uploadScenario = {
  code: 'C',
  name: 'upload',
  title: '上传',
  description: '指定格子/批量 setInputFiles 上传，预览 <image> 数量与内容正确；拖放到格子可替换',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    await app.api.clearAll(page);
    await app.api.setLayout(page, 3, 2);
    const manifest = app.SAMPLES_MANIFEST;

    // 1) 指定 target=2 上传 sample-1
    const sample1Url = app.fileToDataUrl(samplePath('sample-1.png'));
    await app.uploadFiles(page, [samplePath('sample-1.png')], 2, 1);
    let info = await app.api.getPreviewInfo(page);
    let state = await app.api.getState(page);
    let dom = await app.getPreviewDom(page);
    let images = activeImages(dom);
    ctx.check('指定 target=2 上传后 filled = [2]', JSON.stringify(info.filled) === '[2]', info.filled);
    ctx.check('imageCount = 1', info.imageCount === 1, info.imageCount);
    ctx.check('预览有效 <image> 数量 = 1', images.length === 1, images.length);
    ctx.check('预览 <image> href = 源文件 FileReader dataURL',
      images[0] && images[0].href === sample1Url,
      images[0] ? { hrefLength: images[0].href.length, expectedLength: sample1Url.length } : null);
    ctx.check('预览 <image> 所在格子 = 2', images[0] && images[0].cellIndex === 2, images[0] && images[0].cellIndex);
    ctx.check('state.cells[2] 名称/尺寸正确',
      !!(state.cells[2] && state.cells[2].name === 'sample-1.png'
        && state.cells[2].width === manifest['sample-1.png'].width
        && state.cells[2].height === manifest['sample-1.png'].height),
      state.cells[2]);
    ctx.check('其余格子仍为空', state.cells.filter(Boolean).length === 1,
      state.cells.map((cell) => cell && cell.name));
    ctx.evidence.uploadSingle = { filled: info.filled, imageCount: info.imageCount };

    // 2) 批量上传：target=null 应填入最前面的空位（0,1,3）
    const batchFiles = ['sample-2.png', 'sample-3.png', 'sample-4.png'];
    await app.uploadFiles(page, batchFiles.map(samplePath), null, 4);
    info = await app.api.getPreviewInfo(page);
    state = await app.api.getState(page);
    dom = await app.getPreviewDom(page);
    images = activeImages(dom);
    ctx.check('批量上传后 filled = [0,1,2,3]', JSON.stringify(info.filled) === '[0,1,2,3]', info.filled);
    ctx.check('批量上传后 imageCount = 4', info.imageCount === 4, info.imageCount);
    ctx.check('批量上传后预览 <image> 数量 = 4', images.length === 4, images.length);
    const expectedBatch = [
      { index: 0, name: 'sample-2.png' },
      { index: 1, name: 'sample-3.png' },
      { index: 2, name: 'sample-1.png' },
      { index: 3, name: 'sample-4.png' },
    ];
    for (const expect of expectedBatch) {
      const image = images.find((item) => item.cellIndex === expect.index);
      const expectedUrl = app.fileToDataUrl(samplePath(expect.name));
      const cellState = state.cells[expect.index];
      const dims = manifest[expect.name] || {};
      ctx.check(`格子 ${expect.index} 显示 ${expect.name}（dataURL 完全一致）`,
        !!(image && image.href === expectedUrl),
        image ? { hrefLength: image.href.length, expectedLength: expectedUrl.length } : null);
      ctx.check(`格子 ${expect.index} state 名称/尺寸正确`,
        !!(cellState && cellState.name === expect.name
          && cellState.width === dims.width && cellState.height === dims.height),
        cellState ? { name: cellState.name, width: cellState.width, height: cellState.height } : null);
    }
    ctx.evidence.uploadBatch = { filled: info.filled, names: state.cells.map((cell) => cell && cell.name) };
    await ctx.screenshot('upload-batch');

    // 3) 替换已填格子：target=2 上传 sample-5
    const sample5Url = app.fileToDataUrl(samplePath('sample-5.png'));
    await app.uploadFiles(page, [samplePath('sample-5.png')], 2, 4);
    state = await app.api.getState(page);
    dom = await app.getPreviewDom(page);
    images = activeImages(dom);
    const replaced = images.find((image) => image.cellIndex === 2);
    ctx.check('替换格子 2 后图片数量仍为 4',
      state.cells.filter(Boolean).length === 4, state.cells.filter(Boolean).length);
    ctx.check('替换格子 2 后显示 sample-5（dataURL 一致）', !!(replaced && replaced.href === sample5Url));
    ctx.check('替换格子 2 后 state 名称为 sample-5.png',
      state.cells[2] && state.cells[2].name === 'sample-5.png', state.cells[2] && state.cells[2].name);

    // 4) 拖放文件到格子 0（合成 DataTransfer，触发应用真实 drop 处理）
    const sample6Url = app.fileToDataUrl(samplePath('sample-6.png'));
    await app.dragDropFileToCell(page, 0, samplePath('sample-6.png'));
    try {
      await app.waitFor(page,
        () => {
          const value = window.__FIGPLAY__.getState().cells[0];
          return value && value.name === 'sample-6.png';
        }, null, { timeout: 10000, label: 'drop sample-6 on cell 0' });
      ctx.dropApplied = true;
    } catch (err) {
      ctx.dropApplied = false;
    }
    state = await app.api.getState(page);
    dom = await app.getPreviewDom(page);
    images = activeImages(dom);
    const dropped = images.find((image) => image.cellIndex === 0);
    ctx.check('拖放文件到格子 0 后替换为 sample-6.png',
      !!(state.cells[0] && state.cells[0].name === 'sample-6.png'),
      state.cells[0] && state.cells[0].name);
    ctx.check('拖放后格子 0 <image> dataURL 正确', !!(dropped && dropped.href === sample6Url));
    ctx.check('拖放后图片总数仍为 4', state.cells.filter(Boolean).length === 4,
      state.cells.filter(Boolean).length);

    // 5) input 属性
    const inputAttrs = await page.locator('#file-input').evaluate((node) => ({
      multiple: node.multiple, hidden: node.hidden, accept: node.getAttribute('accept'),
    }));
    ctx.check('#file-input 支持 multiple 且 accept 含 image/*', inputAttrs.multiple === true
      && /image/.test(inputAttrs.accept || ''), inputAttrs);

    ctx.evidence.finalFilled = (await app.api.getPreviewInfo(page)).filled;
    ctx.evidence.screenshot = await ctx.screenshot('upload-final');
  },
};

/* ----------------------------- 场景 D ----------------------------- */
const labelScenario = {
  code: 'D',
  name: 'labels',
  title: '编号',
  description: '编号方案/起始/顺序/跳过空图/9 个位置/字号加粗斜体颜色/自定义编号，预览文字与位置正确',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    await app.api.clearAll(page);
    await app.api.setLayout(page, 3, 2);

    // 0,2,4 三个格子有图 → 默认 skipEmpty 时编号 (a)(b)(c) 对应 0,2,4
    await app.uploadFiles(page, [samplePath('sample-1.png')], 0, 1);
    await app.uploadFiles(page, [samplePath('sample-2.png')], 2, 2);
    await app.uploadFiles(page, [samplePath('sample-3.png')], 4, 3);
    const filled = (await app.api.getPreviewInfo(page)).filled;
    ctx.check('准备：3×2 布局、图片位于格子 0/2/4', JSON.stringify(filled) === '[0,2,4]', filled);
    await checkLabels(ctx, page, '默认编号（skipEmpty）',
      [{ cellIndex: 0, text: '(a)' }, { cellIndex: 2, text: '(b)' }, { cellIndex: 4, text: '(c)' }],
      { expectEmptySkipped: true });

    // 6 种编号方案
    for (const testCase of SCHEME_CASES) {
      await app.setLabelScheme(page, testCase.id);
      const expected = testCase.texts.map((text, i) => ({ cellIndex: [0, 2, 4][i], text }));
      await waitPreview(page,
        (texts) => JSON.stringify(window.__FIGPLAY__.getLabels().map((item) => item.text)) === JSON.stringify(texts),
        testCase.texts, `scheme ${testCase.id}`);
      await checkLabels(ctx, page, `方案 ${testCase.id}`, expected);
      ctx.evidence[`scheme-${testCase.id}`] = testCase.texts;
    }

    // 起始编号
    await app.setLabelScheme(page, 'number-paren');
    await app.setNumberInput(page, '#label-start', 3);
    await waitPreview(page, () => JSON.stringify(window.__FIGPLAY__.getLabels()) === JSON.stringify([
      { cellIndex: 0, text: '(3)' }, { cellIndex: 2, text: '(4)' }, { cellIndex: 4, text: '(5)' },
    ]), null, 'label start=3');
    await checkLabels(ctx, page, '起始编号=3（number-paren）', [
      { cellIndex: 0, text: '(3)' }, { cellIndex: 2, text: '(4)' }, { cellIndex: 4, text: '(5)' },
    ]);

    // skipEmpty 关闭 → 6 个格子都编号（先恢复起始编号为 1）
    await app.setNumberInput(page, '#label-start', 1);
    await waitPreview(page, () => {
      const labels = window.__FIGPLAY__.getLabels();
      return labels.length === 3 && labels[0].text === '(1)';
    }, null, 'label start reset');
    await app.setCheckbox(page, '#label-skip-empty', false);
    await waitPreview(page, () => window.__FIGPLAY__.getLabels().length === 6, null, 'skipEmpty=false');
    await checkLabels(ctx, page, '关闭“空子图不参与编号”', [
      { cellIndex: 0, text: '(1)' }, { cellIndex: 1, text: '(2)' }, { cellIndex: 2, text: '(3)' },
      { cellIndex: 3, text: '(4)' }, { cellIndex: 4, text: '(5)' }, { cellIndex: 5, text: '(6)' },
    ]);
    await app.setCheckbox(page, '#label-skip-empty', true);
    await app.setNumberInput(page, '#label-start', 1);

    // 编号显示开关
    await app.setCheckbox(page, '#label-show', false);
    await waitPreview(page, () => window.__FIGPLAY__.getLabels().length === 0, null, 'labelShow=false');
    const hiddenDom = await app.getPreviewDom(page);
    ctx.check('关闭编号后预览无 label-text', hiddenDom.labels.length === 0, hiddenDom.labels.length);
    await app.setCheckbox(page, '#label-show', true);
    await waitPreview(page, () => window.__FIGPLAY__.getLabels().length === 3, null, 'labelShow=true');

    // 列优先顺序：载入示例（3×2、6 张）
    await app.api.loadDemo(page);
    await waitPreview(page, () => window.__FIGPLAY__.getPreviewInfo().imageCount === 6, null, 'demo loaded');
    await app.setLabelScheme(page, 'alpha-paren');
    await app.setSelect(page, '#label-order', 'col');
    await waitPreview(page, () => {
      const labels = window.__FIGPLAY__.getLabels();
      return labels.length === 6 && labels[0].text === '(a)' && labels[1].cellIndex === 2;
    }, null, 'label order col');
    // 3 行 × 2 列、列优先：cell 0,2,4,1,3,5 → (a)…(f)
    await checkLabels(ctx, page, '列优先顺序（先行后列→先列后行）', [
      { cellIndex: 0, text: '(a)' }, { cellIndex: 2, text: '(b)' }, { cellIndex: 4, text: '(c)' },
      { cellIndex: 1, text: '(d)' }, { cellIndex: 3, text: '(e)' }, { cellIndex: 5, text: '(f)' },
    ]);
    await app.setSelect(page, '#label-order', 'row');

    // 9 个位置：比较编号 bbox 相对所属格子的归一化位置
    const positionResults = {};
    for (const pos of POSITIONS) {
      await app.clickPos(page, pos);
      await waitPreview(page, (target) => {
        const active = document.querySelector('#pos-picker .is-active');
        return active && active.dataset.pos === target;
      }, pos, `pos ${pos}`);
      const dom = await app.getPreviewDom(page);
      const label = dom.labels[0];
      const hit = dom.hits[0];
      if (!label || !label.bbox || !hit) {
        ctx.check(`位置 ${pos}：编号存在且可测量`, false, { label, hit });
        continue;
      }
      const centerX = label.bbox.x + label.bbox.w / 2;
      const centerY = label.bbox.y + label.bbox.h / 2;
      const nx = (centerX - hit.x) / hit.w;
      const ny = (centerY - hit.y) / hit.h;
      positionResults[pos] = { nx: round(nx, 3), ny: round(ny, 3), anchor: label.anchor };
      const quadrant = POSITION_QUADRANT[pos];
      const xOk = quadrant.x === 'left' ? nx < 0.35 : quadrant.x === 'right' ? nx > 0.65 : nx > 0.35 && nx < 0.65;
      const yOk = quadrant.y === 'top' ? ny < 0.35 : quadrant.y === 'bottom' ? ny > 0.65 : ny > 0.35 && ny < 0.65;
      ctx.check(`位置 ${pos} 编号位于格子${quadrant.y === 'top' ? '上' : quadrant.y === 'bottom' ? '下' : '中'}${quadrant.x === 'left' ? '左' : quadrant.x === 'right' ? '右' : '中'}`,
        xOk && yOk, { nx, ny, anchor: label.anchor });
    }
    ctx.evidence.positions = positionResults;
    await ctx.screenshot('labels-positions');

    // 字体字号加粗斜体颜色
    await app.clickPos(page, 'tl');
    await app.setNumberInput(page, '#label-size', 18);
    await app.setCheckbox(page, '#label-bold', true);
    await app.setCheckbox(page, '#label-italic', true);
    await app.setColorInput(page, '#label-color', '#ff0000');
    const expectedFontSize = 18 * 25.4 / 72;
    await waitPreview(page, (size) => {
      const node = document.querySelector('#preview-svg .label-text');
      return node && Math.abs(Number(node.getAttribute('font-size')) - size) < 0.01
        && node.getAttribute('font-weight') === '700' && node.getAttribute('font-style') === 'italic'
        && String(node.getAttribute('fill')).toLowerCase() === '#ff0000';
    }, expectedFontSize, 'label font style + color');
    const styledDom = await app.getPreviewDom(page);
    const styledLabel = styledDom.labels[0];
    ctx.check('字号 18pt 渲染为 %.3fmm'.replace('%.3f', round(expectedFontSize, 3)),
      approx(styledLabel.fontSize, expectedFontSize, 0.01), styledLabel.fontSize);
    ctx.check('加粗 font-weight=700', styledLabel.fontWeight === '700', styledLabel.fontWeight);
    ctx.check('斜体 font-style=italic', styledLabel.fontStyle === 'italic', styledLabel.fontStyle);
    ctx.check('编号颜色 #ff0000', String(styledLabel.fill).toLowerCase() === '#ff0000', styledLabel.fill);
    await ctx.screenshot('labels-font');
    await app.setCheckbox(page, '#label-bold', false);
    await app.setCheckbox(page, '#label-italic', false);
    await app.setNumberInput(page, '#label-size', 9);

    // 内边距/偏移：相对增量应为 mm 值
    await app.setNumberInput(page, '#label-inset', 1.5);
    await app.setNumberInput(page, '#label-offset-x', 0);
    await app.setNumberInput(page, '#label-offset-y', 0);
    await waitPreview(page, () => {
      const node = document.querySelector('#preview-svg .label-text');
      return node && Math.abs(Number(node.getAttribute('x')) - 1.5) < 0.05;
    }, null, 'label inset reset');
    let base = (await app.getPreviewDom(page)).labels[0];
    await app.setNumberInput(page, '#label-inset', 5);
    await waitPreview(page, () => {
      const node = document.querySelector('#preview-svg .label-text');
      return node && Math.abs(Number(node.getAttribute('x')) - 5) < 0.05;
    }, null, 'label inset 5');
    let insetDom = (await app.getPreviewDom(page)).labels[0];
    ctx.check('内边距 1.5→5mm 时编号 x 增加 3.5mm',
      approx(insetDom.x - base.x, 3.5, 0.05), { from: base.x, to: insetDom.x });
    await app.setNumberInput(page, '#label-offset-x', 4);
    await waitPreview(page, () => {
      const node = document.querySelector('#preview-svg .label-text');
      return node && Math.abs(Number(node.getAttribute('x')) - 9) < 0.05;
    }, null, 'label offset x');
    const offsetDom = (await app.getPreviewDom(page)).labels[0];
    ctx.check('水平偏移 +4mm 时编号 x 再 +4mm',
      approx(offsetDom.x - insetDom.x, 4, 0.05), { from: insetDom.x, to: offsetDom.x });
    await app.setNumberInput(page, '#label-offset-y', 3);
    await waitPreview(page, (baseY) => {
      const node = document.querySelector('#preview-svg .label-text');
      return node && Number(node.getAttribute('y')) >= baseY + 2.5;
    }, offsetDom.y, 'label offset y');
    const offsetYDom = (await app.getPreviewDom(page)).labels[0];
    ctx.check('垂直偏移 +3mm 时编号 y 增加 3mm',
      approx(offsetYDom.y - offsetDom.y, 3, 0.05), { from: offsetDom.y, to: offsetYDom.y });
    await app.setNumberInput(page, '#label-inset', 1.5);
    await app.setNumberInput(page, '#label-offset-x', 0);
    await app.setNumberInput(page, '#label-offset-y', 0);

    // 自定义编号覆盖自动编号
    await app.setCustomLabel(page, 1, 'X1');
    await waitPreview(page, () => {
      const labels = window.__FIGPLAY__.getLabels();
      return labels.some((item) => item.cellIndex === 1 && item.text === 'X1');
    }, null, 'custom label X1');
    const customLabels = (await app.api.getPreviewInfo(page)).labels;
    ctx.check('自定义编号 X1 覆盖格子 1 自动编号',
      (() => {
        const item = customLabels.find((entry) => entry.cellIndex === 1);
        return !!item && item.cellIndex === 1 && item.text === 'X1';
      })(),
      customLabels);
    ctx.check('自定义编号不影响其它格子编号',
      labelsEqual(customLabels.filter((item) => item.cellIndex !== 1),
        app.expectedLabels(await app.api.getState(page)).filter((item) => item.cellIndex !== 1)),
      customLabels);
    // 清除自定义编号
    await app.selectCell(page, 1);
    await page.locator('#cell-custom-label').evaluate((node) => {
      node.value = '';
      node.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await waitPreview(page, () => {
      const labels = window.__FIGPLAY__.getLabels();
      return labels.some((item) => item.cellIndex === 1 && item.text === '(b)');
    }, null, 'custom label cleared');
    ctx.check('清除自定义编号后恢复自动编号 (b)',
      (await app.api.getPreviewInfo(page)).labels.some((item) => item.cellIndex === 1 && item.text === '(b)'));

    ctx.evidence.screenshot = await ctx.screenshot('labels-final');
  },
};

/* ----------------------------- 场景 E ----------------------------- */
const exportScenario = {
  code: 'E',
  name: 'export',
  title: '导出',
  description: 'PNG/JPG/SVG/PDF 导出：像素尺寸=mm/25.4×DPI、非空白、SVG 结构、PDF MediaBox/渲染；150/300/600DPI、JPG 质量、透明背景、UI 下载',
  async run(ctx) {
    const { page } = ctx;
    const exportDir = ctx.exportsDir;
    await app.openAppReady(page);
    await app.api.clearAll(page);
    await app.api.setLayout(page, 3, 2);

    // 6 张示例图片 + 外边距 5mm（用于白底/透明角落检查）
    await app.uploadFiles(page, SIX_SAMPLES.map(samplePath), null, 6);
    await app.setNumberInput(page, '#width-input', 170);
    await app.setNumberInput(page, '#margin-input', 5);
    await app.setNumberInput(page, '#filename-input', 'fp-e2e');
    await app.setNumberInput(page, '#label-size', 9);
    await app.setLabelScheme(page, 'alpha-paren');
    await waitPreview(page, () => window.__FIGPLAY__.getState().layout.margin === 5, null, 'margin state applied');
    const state = await app.api.getState(page);
    const geom = app.computeGeometryMm(state.layout);
    await waitPreview(page, (height) =>
      Math.abs(window.__FIGPLAY__.getPreviewInfo().geom.heightMm - height) < 0.01,
    geom.heightMm, 'margin geometry applied');
    const filled = state.cells.filter(Boolean).length;
    const labels = app.expectedLabels(state);
    ctx.evidence.setup = {
      geom, filled, labels: labels.map((item) => item.text),
      margin: state.layout.margin, layout: { rows: state.layout.rows, cols: state.layout.cols },
    };
    ctx.check('导出准备：6 张图、外边距 5mm、3×2 布局',
      filled === 6 && state.layout.margin === 5 && state.layout.rows === 3 && state.layout.cols === 2,
      { filled, margin: state.layout.margin });
    ctx.check('导出准备：期望编号 (a)…(f)',
      JSON.stringify(labels.map((item) => item.text)) === JSON.stringify(['(a)', '(b)', '(c)', '(d)', '(e)', '(f)']),
      labels.map((item) => item.text));
    await ctx.screenshot('export-setup');

    const exports = [];
    const register = (record) => {
      exports.push(record);
      ctx.evidence.exports = exports;
    };

    /** 导出并校验（PNG/JPG/SVG/PDF），返回 {exported, verify} */
    async function exportAndVerify({ format, filename, overrides, verifyOptions, label, uiDriven = false }) {
      if (uiDriven) {
        await app.clickFormat(page, format);
        if (overrides && overrides.dpi !== undefined) await app.setNumberInput(page, '#dpi-input', overrides.dpi);
        if (overrides && filename) await app.setNumberInput(page, '#filename-input', filename);
        if (overrides && overrides.transparent !== undefined) {
          await app.setCheckbox(page, '#transparent-toggle', overrides.transparent);
        }
      }
      const exported = await app.exportToFile(page, format, overrides || null, exportDir, filename);
      const kind = format === 'svg' ? 'svg' : format === 'pdf' ? 'pdf' : 'image';
      const verify = verifyExport(kind, exported.path, verifyOptions || {});
      register({
        label,
        format,
        filename: exported.filename,
        path: exported.path,
        size: exported.size,
        widthPx: exported.widthPx,
        heightPx: exported.heightPx,
        widthMm: exported.widthMm,
        heightMm: exported.heightMm,
        mime: exported.mime,
        verifier: verify.report ? {
          ok: verify.report.ok,
          checks: verify.report.checks,
          details: verify.report.details,
        } : null,
        verifierOk: verify.ok,
        failedChecks: verify.failedChecks,
      });
      ctx.check(`${label}：文件生成（${format.toUpperCase()}，${exported.size} B）`,
        exported.size > 0, { path: exported.path, size: exported.size });
      ctx.check(`${label}：Python 校验通过`, verify.ok, describeVerify(verify));
      return { exported, verify };
    }

    // 1) PNG 300DPI 白底
    const expected300 = app.expectedPixelSize(geom, 300);
    const png = await exportAndVerify({
      format: 'png', filename: 'fp-e2e-png-300',
      overrides: { dpi: 300, quality: 0.95, transparent: false, filename: 'fp-e2e-png-300' },
      verifyOptions: {
        expectWidth: expected300.width, expectHeight: expected300.height,
        expectFormat: 'png', expectAlpha: false, expectWhiteCorners: true, tolerance: 1,
      },
      label: 'PNG 300DPI 白底',
    });
    ctx.check('PNG 300DPI 返回 widthPx/heightPx 符合 mm/25.4×DPI',
      png.exported.widthPx === expected300.width && png.exported.heightPx === expected300.height,
      { api: [png.exported.widthPx, png.exported.heightPx], expected: [expected300.width, expected300.height] });

    // 2) PNG 透明背景
    const pngTransparent = await exportAndVerify({
      format: 'png', filename: 'fp-e2e-png-transparent',
      overrides: { dpi: 300, transparent: true, filename: 'fp-e2e-png-transparent' },
      verifyOptions: {
        expectWidth: expected300.width, expectHeight: expected300.height,
        expectFormat: 'png', expectAlpha: true, expectCornerAlpha: 0, tolerance: 1,
      },
      label: 'PNG 透明背景',
    });
    ctx.check('透明 PNG 文件名 = fp-e2e-png-transparent.png',
      pngTransparent.exported.filename === 'fp-e2e-png-transparent.png', pngTransparent.exported.filename);

    // 2b) 透明背景预览（棋盘格）截图
    await app.clickFormat(page, 'png');
    await app.setCheckbox(page, '#transparent-toggle', true);
    await waitPreview(page, () => document.getElementById('figure-shell').classList.contains('is-transparent'),
      null, 'transparent preview');
    ctx.evidence.transparentPreviewScreenshot = await ctx.screenshot('transparent-preview');
    await app.setCheckbox(page, '#transparent-toggle', false);

    // 3) JPG 300DPI + 质量对比
    const expectedJpg = app.expectedPixelSize(geom, 300);
    const jpgHigh = await exportAndVerify({
      format: 'jpg', filename: 'fp-e2e-jpg-q95',
      overrides: { dpi: 300, quality: 0.95, filename: 'fp-e2e-jpg-q95' },
      verifyOptions: {
        expectWidth: expectedJpg.width, expectHeight: expectedJpg.height,
        expectFormat: 'jpeg', expectAlpha: false, expectWhiteCorners: true, tolerance: 1,
      },
      label: 'JPG 300DPI 质量95',
    });
    const jpgLow = await exportAndVerify({
      format: 'jpg', filename: 'fp-e2e-jpg-q60',
      overrides: { dpi: 300, quality: 0.6, filename: 'fp-e2e-jpg-q60' },
      verifyOptions: {
        expectWidth: expectedJpg.width, expectHeight: expectedJpg.height, expectFormat: 'jpeg',
        expectAlpha: false, tolerance: 1,
      },
      label: 'JPG 300DPI 质量60',
    });
    ctx.check('JPG 质量 95 文件体积 > 质量 60（质量参数生效）',
      jpgHigh.exported.size > jpgLow.exported.size,
      { q95: jpgHigh.exported.size, q60: jpgLow.exported.size });

    // 4) SVG（白底）：宽高 mm、viewBox、6 图 6 编号文字
    const svg = await exportAndVerify({
      format: 'svg', filename: 'fp-e2e-figure',
      overrides: { transparent: false, filename: 'fp-e2e-figure' },
      verifyOptions: {
        expectWidthMm: round(geom.widthMm, 3), expectHeightMm: round(geom.heightMm, 3),
        expectCells: 6, expectImages: 6, expectLabels: 6,
        expectLabelTexts: labels.map((item) => item.text).join('|'),
        expectBg: 'white', tolerance: 0.02,
      },
      label: 'SVG 白底',
    });
    ctx.check('SVG 返回 mime=image/svg+xml',
      svg.exported.mime === 'image/svg+xml', svg.exported.mime);

    // 5) SVG 透明背景
    const svgTransparent = await exportAndVerify({
      format: 'svg', filename: 'fp-e2e-figure-transparent',
      overrides: { transparent: true, filename: 'fp-e2e-figure-transparent' },
      verifyOptions: {
        expectWidthMm: round(geom.widthMm, 3), expectHeightMm: round(geom.heightMm, 3),
        expectCells: 6, expectImages: 6, expectLabels: 6,
        expectBg: 'transparent', tolerance: 0.02,
      },
      label: 'SVG 透明背景',
    });
    ctx.check('SVG 透明导出文件名 = fp-e2e-figure-transparent.svg',
      svgTransparent.exported.filename === 'fp-e2e-figure-transparent.svg', svgTransparent.exported.filename);

    // 6) PDF：单页、MediaBox=mm×72/25.4、可渲染、渲染图白角
    const pdf = await exportAndVerify({
      format: 'pdf', filename: 'fp-e2e-figure',
      overrides: { dpi: 300, quality: 0.95, filename: 'fp-e2e-figure' },
      verifyOptions: {
        expectPages: 1,
        expectWidthMm: round(geom.widthMm, 3), expectHeightMm: round(geom.heightMm, 3),
        renderDir: path.join(exportDir, 'pdf-render'), renderPrefix: 'fp-e2e-pdf',
        renderDpi: 72, tolerancePt: 0.6,
      },
      label: 'PDF 300DPI',
    });
    const pdfRenderPath = pdf.verify.report && pdf.verify.report.details
      && pdf.verify.report.details.render && pdf.verify.report.details.render.path;
    if (pdfRenderPath) {
      const renderCheck = verifyExport('image', pdfRenderPath, {
        expectFormat: 'png', expectWhiteCorners: true, minUniqueColors: 16,
        tolerance: 2,
      });
      register({
        label: 'PDF 渲染图', format: 'png', filename: path.basename(pdfRenderPath),
        path: pdfRenderPath, size: fs.statSync(pdfRenderPath).size,
        verifier: renderCheck.report, verifierOk: renderCheck.ok,
        failedChecks: renderCheck.failedChecks,
      });
      ctx.check('PDF 渲染图非空白且四角为白底', renderCheck.ok, describeVerify(renderCheck));
    } else {
      ctx.check('PDF 渲染图存在', false, 'pdftoppm 未产出渲染图');
    }
    ctx.check('PDF 返回 mime=application/pdf 且页数校验通过',
      pdf.exported.mime === 'application/pdf'
      && !!(pdf.verify.report && pdf.verify.report.details && pdf.verify.report.details.pageCount === 1),
      { mime: pdf.exported.mime, pageCount: pdf.verify.report && pdf.verify.report.details
        && pdf.verify.report.details.pageCount });

    // 7) DPI 矩阵 150/300/600（PNG）
    await app.clickFormat(page, 'png');
    const dpiCases = [150, 300, 600];
    for (const dpi of dpiCases) {
      await app.setNumberInput(page, '#dpi-input', dpi);
      const expected = app.expectedPixelSize(geom, dpi);
      const record = await exportAndVerify({
        format: 'png', filename: `fp-e2e-png-${dpi}dpi`,
        overrides: { dpi, transparent: false, filename: `fp-e2e-png-${dpi}dpi` },
        verifyOptions: {
          expectWidth: expected.width, expectHeight: expected.height,
          expectFormat: 'png', expectAlpha: false, tolerance: 1,
        },
        label: `PNG ${dpi}DPI`,
      });
      ctx.check(`PNG ${dpi}DPI 像素尺寸 = mm/25.4×${dpi}`,
        record.exported.widthPx === expected.width && record.exported.heightPx === expected.height,
        { api: [record.exported.widthPx, record.exported.heightPx], expected: [expected.width, expected.height] });
    }

    // 8) UI「导出」按钮真实下载（PNG @300）
    await app.clickFormat(page, 'png');
    await app.setNumberInput(page, '#dpi-input', 300);
    await app.setCheckbox(page, '#transparent-toggle', false);
    await app.setNumberInput(page, '#filename-input', 'fp-e2e-ui');
    const savedUi = await app.uiDownload(page, 'png', '#btn-export', exportDir, 'fp-e2e-ui.png');
    const uiVerify = verifyExport('image', savedUi.path, {
      expectWidth: expected300.width, expectHeight: expected300.height,
      expectFormat: 'png', expectAlpha: false, tolerance: 1,
    });
    ctx.check('UI 导出按钮触发下载且文件已保存', fs.existsSync(savedUi.path) && savedUi.size > 0,
      { path: savedUi.path, size: savedUi.size });
    ctx.check('UI 下载文件名 = fp-e2e-ui.png', savedUi.suggestedFilename === 'fp-e2e-ui.png',
      savedUi.suggestedFilename);
    ctx.check('UI 下载 PNG 尺寸/内容正确', uiVerify.ok, describeVerify(uiVerify));
    register({
      label: 'UI 下载 PNG', format: 'png', filename: savedUi.filename, path: savedUi.path,
      size: savedUi.size, widthPx: expected300.width, heightPx: expected300.height, mime: 'image/png',
      verifier: uiVerify.report, verifierOk: uiVerify.ok, failedChecks: uiVerify.failedChecks,
    });
    await waitPreview(page, () => !document.getElementById('btn-export').disabled, null, 'export idle');

    // 8b) 顶栏导出按钮 #btn-export-top 真实下载
    await app.setNumberInput(page, '#filename-input', 'fp-e2e-top');
    const savedTop = await app.uiDownload(page, 'png', '#btn-export-top', exportDir, 'fp-e2e-top.png');
    const topVerify = verifyExport('image', savedTop.path, {
      expectWidth: expected300.width, expectHeight: expected300.height,
      expectFormat: 'png', expectAlpha: false, tolerance: 1,
    });
    ctx.check('顶栏导出按钮 #btn-export-top 触发下载并保存',
      fs.existsSync(savedTop.path) && savedTop.size > 0, { path: savedTop.path, size: savedTop.size });
    ctx.check('顶栏导出文件名 = fp-e2e-top.png',
      savedTop.suggestedFilename === 'fp-e2e-top.png', savedTop.suggestedFilename);
    ctx.check('顶栏导出 PNG 尺寸/内容正确', topVerify.ok, describeVerify(topVerify));
    register({
      label: '顶栏 UI 下载 PNG', format: 'png', filename: savedTop.filename, path: savedTop.path,
      size: savedTop.size, widthPx: expected300.width, heightPx: expected300.height, mime: 'image/png',
      verifier: topVerify.report, verifierOk: topVerify.ok, failedChecks: topVerify.failedChecks,
    });
    await waitPreview(page, () => !document.getElementById('btn-export').disabled, null, 'export idle top');

    // 9) exportBase64 overrides（dpi/filename）是否生效
    const overrideResult = await app.api.exportBase64(page, 'png', { dpi: 150, filename: 'fp-e2e-override' });
    const expected150 = app.expectedPixelSize(geom, 150);
    const overrideOk = overrideResult
      && overrideResult.widthPx === expected150.width
      && overrideResult.heightPx === expected150.height
      && overrideResult.filename === 'fp-e2e-override.png';
    if (overrideOk) {
      ctx.check('exportBase64 overrides（dpi/filename）生效', true,
        { widthPx: overrideResult.widthPx, filename: overrideResult.filename });
    } else {
      ctx.note('契约差异', `exportBase64 overrides 未完全生效：${JSON.stringify({
        widthPx: overrideResult && overrideResult.widthPx,
        expectedWidth: expected150.width,
        filename: overrideResult && overrideResult.filename,
      })}`);
      ctx.check('exportBase64 overrides（dpi/filename）生效', false,
        { widthPx: overrideResult && overrideResult.widthPx, expectedWidth: expected150.width,
          filename: overrideResult && overrideResult.filename });
    }

    // 关键导出文件供最终报告/样例目录使用
    ctx.evidence.keyExports = [
      png.exported.path,
      pngTransparent.exported.path,
      jpgHigh.exported.path,
      svg.exported.path,
      svgTransparent.exported.path,
      pdf.exported.path,
      pdfRenderPath,
      savedUi.path,
      savedTop.path,
    ].filter(Boolean);
    const firstUiStatus = await app.getUiValues(page);
    ctx.evidence.uiStatusAfterExport = firstUiStatus.statusText;
    ctx.check('导出过程中/后状态栏提示已导出', /已导出|就绪/.test(firstUiStatus.statusText || ''),
      firstUiStatus.statusText);
    ctx.evidence.screenshot = await ctx.screenshot('export-final');
  },
};

/* ----------------------------- 场景 F ----------------------------- */
const stabilityScenario = {
  code: 'F',
  name: 'stability',
  title: '稳定性',
  description: '1366×768 视口可用；改动后自动保存（IndexedDB），刷新后布局/图片/编号/导出设置恢复，无控制台错误',
  contextOptions: { viewport: { width: 1366, height: 768 } },
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);

    // 1) 视口可用性
    const viewport = await page.evaluate(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const box = node.getBoundingClientRect();
        return { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) };
      };
      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        stage: rect('#stage'),
        previewSvg: rect('#preview-svg'),
        exportButton: rect('#btn-export'),
        leftPanel: rect('.panel-left'),
        rightPanel: rect('.panel-right'),
      };
    });
    ctx.evidence.viewport = viewport;
    ctx.check('1366×768 下无横向溢出', viewport.scrollWidth <= viewport.innerWidth + 2,
      { scrollWidth: viewport.scrollWidth, innerWidth: viewport.innerWidth });
    ctx.check('1366×768 下预览画布区域可用（宽 > 400px）',
      !!(viewport.stage && viewport.stage.w > 400 && viewport.stage.h > 300), viewport.stage);
    ctx.check('1366×768 下预览 SVG 与导出按钮可见',
      !!(viewport.previewSvg && viewport.previewSvg.w > 300 && viewport.exportButton
        && viewport.exportButton.w > 100 && viewport.exportButton.h > 20),
      { previewSvg: viewport.previewSvg, exportButton: viewport.exportButton });
    await ctx.screenshot('viewport-1366x768');

    // 2) 修改状态：2×3 布局 + 2 张图 + 编号样式 + 导出设置
    await app.api.clearAll(page);
    await app.api.setLayout(page, 2, 3);
    const uploadFiles = [samplePath('sample-1.png'), samplePath('sample-4.png')];
    await app.uploadFiles(page, uploadFiles, null, 2);
    await app.setNumberInput(page, '#label-start', 2);
    await app.setLabelScheme(page, 'roman-paren');
    await app.setNumberInput(page, '#margin-input', 4);
    await app.setNumberInput(page, '#label-size', 12);
    await app.setNumberInput(page, '#filename-input', 'fp-e2e-restore');
    await app.clickFormat(page, 'jpg');
    await app.clickDpiChip(page, 150);

    const editedState = await app.api.getState(page);
    const editedPreview = await app.api.getPreviewInfo(page);
    const editedDom = await app.getPreviewDom(page);
    const editedHrefs = {};
    for (const image of activeImages(editedDom)) editedHrefs[image.cellIndex] = image.href;
    ctx.check('编辑后状态：2×3、2 张图、编号起始 2、roman-paren',
      editedState.layout.rows === 2 && editedState.layout.cols === 3
      && editedState.cells.filter(Boolean).length === 2
      && editedState.label.start === 2 && editedState.label.scheme === 'roman-paren',
      { layout: [editedState.layout.rows, editedState.layout.cols],
        cells: editedState.cells.filter(Boolean).length,
        label: { start: editedState.label.start, scheme: editedState.label.scheme } });
    ctx.evidence.editedState = {
      layout: editedState.layout,
      label: editedState.label,
      export: editedState.export,
      cells: editedState.cells.map((cell) => (cell ? { name: cell.name, hasData: cell.hasData } : null)),
    };
    await ctx.screenshot('before-reload');

    // 3) 等待自动保存（应用 debounce 900ms；v1.2 落盘为 version 2 project）
    let saved = null;
    try {
      saved = await app.waitForAutosave(page, (savedDoc) => {
        const pageState = savedDoc.currentPage;
        if (!pageState) return false;
        const filled = (pageState.cells || []).filter(Boolean).length;
        return savedDoc.version === 2 && filled === 2
          && pageState.layout && pageState.layout.rows === 2 && pageState.layout.cols === 3
          && pageState.label && pageState.label.scheme === 'roman-paren'
          && pageState.label.start === 2
          && pageState.cells.some((cell) => cell && typeof cell.dataUrl === 'string'
            && cell.dataUrl.startsWith('data:image/'));
      }, { timeout: 10000, label: 'autosave edited state' });
    } catch (err) {
      ctx.note('自动保存', String(err && err.message ? err.message : err));
    }
    ctx.check('改动后自动保存写入成功', !!saved,
      saved ? { backend: saved.backend, savedAt: saved.payload.savedAt, version: saved.version } : null);
    if (saved) {
      const savedFilled = saved.currentPage.cells.filter(Boolean);
      ctx.evidence.autosave = {
        backend: saved.backend,
        savedAt: saved.payload.savedAt,
        version: saved.version,
        pageCount: saved.pages.length,
        current: saved.current,
        filled: savedFilled.length,
        names: savedFilled.map((cell) => cell.name),
        hasDataUrl: savedFilled.every((cell) => typeof cell.dataUrl === 'string' && cell.dataUrl.startsWith('data:image/')),
      };
      ctx.check('自动保存为 version 2 project 且含当前页图片 dataUrl',
        saved.version === 2 && Array.isArray(saved.pages) && saved.pages.length >= 1
        && savedFilled.length === 2
        && savedFilled.every((cell) => typeof cell.dataUrl === 'string' && cell.dataUrl.startsWith('data:image/')),
        { version: saved.version, pages: saved.pages.length,
          dataUrls: savedFilled.map((cell) => ({ name: cell.name, dataUrlPrefix: String(cell.dataUrl).slice(0, 30) })) });
    }

    const dbs = await page.evaluate(() => (window.indexedDB && indexedDB.databases
      ? indexedDB.databases().then((list) => list.map((item) => item.name))
      : Promise.resolve([])));
    ctx.evidence.indexedDB = { databases: dbs, hasFigureplay: dbs.indexOf('figureplay') >= 0 };
    ctx.check('IndexedDB 中存在 figureplay 数据库（file:// 可用）',
      dbs.indexOf('figureplay') >= 0, dbs);

    // 4) 刷新页面并等待就绪 → 状态应恢复
    await app.reloadAppReady(page);
    const restoredState = await app.api.getState(page);
    const restoredPreview = await app.api.getPreviewInfo(page);
    const restoredDom = await app.getPreviewDom(page);
    const restoredHrefs = {};
    for (const image of activeImages(restoredDom)) restoredHrefs[image.cellIndex] = image.href;
    ctx.evidence.restoredState = {
      layout: restoredState.layout,
      label: restoredState.label,
      export: restoredState.export,
      cells: restoredState.cells.map((cell) => (cell ? { name: cell.name, hasData: cell.hasData } : null)),
    };
    ctx.check('刷新后布局恢复（2×3）',
      restoredState.layout.rows === 2 && restoredState.layout.cols === 3,
      [restoredState.layout.rows, restoredState.layout.cols]);
    ctx.check('刷新后图片恢复（2 张、名称一致）',
      restoredState.cells.filter(Boolean).length === 2
      && restoredState.cells.filter(Boolean).every((cell, i) =>
        cell.name === editedState.cells.filter(Boolean)[i].name),
      restoredState.cells.map((cell) => cell && cell.name));
    ctx.check('刷新后图片 dataUrl 完全恢复（预览 href 与刷新前一致）',
      JSON.stringify(restoredHrefs) === JSON.stringify(editedHrefs),
      { before: Object.keys(editedHrefs), after: Object.keys(restoredHrefs),
        same: JSON.stringify(restoredHrefs) === JSON.stringify(editedHrefs) });
    ctx.check('刷新后编号设置恢复（start=2, roman-paren）',
      restoredState.label.start === 2 && restoredState.label.scheme === 'roman-paren',
      { start: restoredState.label.start, scheme: restoredState.label.scheme });
    ctx.check('刷新后边距/字号恢复（margin=4, size=12）',
      restoredState.layout.margin === 4 && restoredState.label.fontSizePt === 12,
      { margin: restoredState.layout.margin, size: restoredState.label.fontSizePt });
    ctx.check('刷新后导出设置恢复（jpg/150DPI/filename）',
      restoredState.export.format === 'jpg' && restoredState.export.dpi === 150
      && restoredState.export.filename === 'fp-e2e-restore',
      restoredState.export);
    ctx.check('刷新后预览图片数/编号与状态一致',
      restoredPreview.imageCount === 2
      && JSON.stringify(restoredPreview.labels.map((item) => ({ cellIndex: item.cellIndex, text: item.text })))
        === JSON.stringify(app.expectedLabels(restoredState).map((item) => ({ cellIndex: item.cellIndex, text: item.text }))),
      { imageCount: restoredPreview.imageCount, labels: restoredPreview.labels });
    const statusText = await page.evaluate(() => (document.getElementById('status-text') || {}).textContent);
    ctx.check('刷新后状态栏提示已恢复上次编辑内容', /已恢复/.test(statusText || ''), statusText);
    await ctx.screenshot('after-reload');

    // 5) clearAll 后自动保存并刷新 → 恢复为空
    await app.api.clearAll(page);
    await app.waitForAutosave(page, (savedDoc) => !!savedDoc.currentPage
      && (savedDoc.currentPage.cells || []).filter(Boolean).length === 0,
      { timeout: 10000, label: 'autosave cleared state' });
    await app.reloadAppReady(page);
    const clearedPreview = await app.api.getPreviewInfo(page);
    ctx.check('clearAll 后刷新：图片清空且状态同步',
      clearedPreview.imageCount === 0 && clearedPreview.filled.length === 0,
      { imageCount: clearedPreview.imageCount, filled: clearedPreview.filled });
    ctx.evidence.screenshot = await ctx.screenshot('stability-final');
  },
};

export const scenarios = [
  firstScreen,
  layoutScenario,
  uploadScenario,
  labelScenario,
  exportScenario,
  stabilityScenario,
];
