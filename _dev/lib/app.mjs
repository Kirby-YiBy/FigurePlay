/**
 * FigurePlay 应用测试 helper（基于 Lead 提供的测试契约 + 当前 app.js 实现细节）
 *
 * 契约要点：
 * - 就绪标志：document.documentElement.dataset.figplayReady === '1' && window.__FIGPLAY__.ready === true
 * - window.__FIGPLAY__: getState() / getPreviewInfo() / getLabels() / setLayout(rows,cols) /
 *   setUploadTarget(index|null) / loadDemo() / clearAll() / clearStorage() / exportBase64(format, overrides?)
 * - 上传：#file-input 是 multiple hidden input；先 setUploadTarget(i) 再 setInputFiles 可指定格子
 * - 预览 SVG：#preview-svg，格子命中区 .cell-hit[data-index]，图片 .cell-image，编号 .labels-layer text.label-text
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

import {
  APP_INDEX,
  DEV_DIR,
  DOWNLOADS_DIR,
  assertAppReady,
  ensureDir,
  fileUrl,
  openApp,
  samplePath,
  saveDownload,
  waitForDownload,
} from './browser.mjs';

/** 每个格子一条编号时的方案格式（与 js/util.js LABEL_SCHEMES 对齐） */
export const LABEL_SCHEMES = [
  'alpha-paren', 'alpha-rparen', 'alpha-dot', 'alpha-bare',
  'Alpha-paren', 'Alpha-rparen',
  'roman-paren', 'roman-rparen', 'Roman-paren', 'Roman-rparen',
  'number-paren', 'number-rparen', 'number-dot', 'number-bare',
];

const WRAPS = { paren: ['(', ')'], rparen: ['', ')'], dot: ['', '.'], bare: ['', ''] };
const KINDS = {
  'alpha-paren': ['alpha', 'paren'], 'alpha-rparen': ['alpha', 'rparen'],
  'alpha-dot': ['alpha', 'dot'], 'alpha-bare': ['alpha', 'bare'],
  'Alpha-paren': ['Alpha', 'paren'], 'Alpha-rparen': ['Alpha', 'rparen'],
  'roman-paren': ['roman', 'paren'], 'roman-rparen': ['roman', 'rparen'],
  'Roman-paren': ['Roman', 'paren'], 'Roman-rparen': ['Roman', 'rparen'],
  'number-paren': ['number', 'paren'], 'number-rparen': ['number', 'rparen'],
  'number-dot': ['number', 'dot'], 'number-bare': ['number', 'bare'],
};

function alphaLabel(n, upper) {
  n = Math.max(1, Math.floor(n));
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(97 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return upper ? s.toUpperCase() : s;
}

const ROMAN = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function toRoman(n) {
  n = Math.floor(n);
  if (n <= 0) return String(n);
  let out = '';
  for (const [value, glyph] of ROMAN) {
    while (n >= value) {
      out += glyph;
      n -= value;
    }
  }
  return out;
}

export function formatLabel(schemeId, n) {
  const [kind, wrap] = KINDS[schemeId] || KINDS['alpha-paren'];
  const core = kind === 'alpha' ? alphaLabel(n, false)
    : kind === 'Alpha' ? alphaLabel(n, true)
      : kind === 'roman' ? toRoman(n).toLowerCase()
        : kind === 'Roman' ? toRoman(n)
          : String(n);
  const pair = WRAPS[wrap] || WRAPS.paren;
  return pair[0] + core + pair[1];
}

/** 与 js/layout.js computeGeometry 一致（单位 mm） */
export function computeGeometryMm(layout) {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const toInt = (value, fallback) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? n : fallback;
  };
  const rows = clamp(toInt(layout.rows, 3), 1, 6);
  const cols = clamp(toInt(layout.cols, 2), 1, 6);
  const widthMm = clamp(layout.widthMm, 20, 500);
  const colGap = clamp(layout.colGap, 0, 80);
  const rowGap = clamp(layout.rowGap, 0, 80);
  const margin = clamp(layout.margin, 0, 80);
  const aspect = clamp(layout.aspectW, 0.2, 10) / clamp(layout.aspectH, 0.2, 10);
  const contentW = Math.max(1, widthMm - margin * 2);
  const cellW = Math.max(1, (contentW - colGap * (cols - 1)) / cols);
  const cellH = Math.max(0.5, cellW / aspect);
  const heightMm = margin * 2 + cellH * rows + rowGap * (rows - 1);
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        index: r * cols + c, row: r, col: c,
        x: margin + c * (cellW + colGap),
        y: margin + r * (cellH + rowGap),
        w: cellW, h: cellH,
      });
    }
  }
  return { rows, cols, widthMm, heightMm, contentW, margin, colGap, rowGap, cellW, cellH, aspect, cells };
}

/** 与 js/layout.js computeLabels 一致的期望编号 */
export function expectedLabels(state) {
  const label = state.label || {};
  if (!label.show) return [];
  const geom = computeGeometryMm(state.layout);
  const order = label.order === 'col' ? 'col' : 'row';
  const start = Math.max(1, Number(label.start) || 1);
  const skipEmpty = !!label.skipEmpty;
  const orderIndices = order === 'col'
    ? geom.cells.slice().sort((a, b) => (a.col - b.col) || (a.row - b.row)).map((cell) => cell.index)
    : geom.cells.map((cell) => cell.index);
  const labels = [];
  let counter = 0;
  for (const index of orderIndices) {
    const cell = state.cells[index];
    if (!cell && skipEmpty) continue;
    counter += 1;
    let text = formatLabel(label.scheme, start + counter - 1);
    const custom = cell && String(cell.customLabel || '').trim();
    if (custom) text = custom;
    labels.push({ cellIndex: index, text, isCustom: !!custom });
  }
  return labels;
}

export function expectedPixelSize(geom, dpi) {
  const pxPerMm = Math.min(2400, Math.max(36, dpi)) / 25.4;
  return { width: Math.round(geom.widthMm * pxPerMm), height: Math.round(geom.heightMm * pxPerMm) };
}

export const SAMPLES_MANIFEST = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DEV_DIR, 'samples', 'manifest.json'), 'utf8'));
  } catch (err) {
    return {};
  }
})();

/** 读取示例文件并构造与 FileReader.readAsDataURL 完全一致的 dataURL（用于 <image> href 比对） */
export function fileToDataUrl(filePath, mime) {
  const bytes = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const guessed = mime || (ext === '.png' ? 'image/png'
    : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg'
      : ext === '.svg' ? 'image/svg+xml'
        : ext === '.webp' ? 'image/webp' : 'application/octet-stream');
  return `data:${guessed};base64,${bytes.toString('base64')}`;
}

export function sampleFiles(names) {
  return (names || []).map((name) => samplePath(name));
}

/* ---------------- 页面启动与等待 ---------------- */

export async function waitForAppReady(page, timeout = 20000) {
  try {
    await page.waitForFunction(
      () => document.documentElement.dataset.figplayReady === '1'
        && window.__FIGPLAY__ && window.__FIGPLAY__.ready === true,
      null,
      { timeout, polling: 100 }
    );
  } catch (err) {
    throw new Error(`等待应用就绪超时（${timeout}ms）：${APP_INDEX}。${err && err.message ? err.message : ''}`);
  }
}

export async function openAppReady(page, options = {}) {
  assertAppReady();
  const result = await openApp(page, options);
  await waitForAppReady(page, options.readyTimeout || 20000);
  return result;
}

export async function reloadAppReady(page, options = {}) {
  await page.reload({ waitUntil: 'load', timeout: options.timeout || 30000 });
  await waitForAppReady(page, options.readyTimeout || 20000);
}

/** 通用等待：predicate 在页面内执行，arg 传入参数 */
export async function waitFor(page, predicate, arg, options = {}) {
  const { timeout = 10000, label = 'condition' } = options;
  try {
    await page.waitForFunction(predicate, arg, { timeout, polling: 100 });
  } catch (err) {
    throw new Error(`等待超时（${label}, ${timeout}ms）`);
  }
}

/* ---------------- __FIGPLAY__ API ---------------- */

export const api = {
  getState: (page) => page.evaluate(() => window.__FIGPLAY__.getState()),
  getPreviewInfo: (page) => page.evaluate(() => window.__FIGPLAY__.getPreviewInfo()),
  getLabels: (page) => page.evaluate(() => window.__FIGPLAY__.getLabels()),
  setLayout: (page, rows, cols) => page.evaluate(([r, c]) => window.__FIGPLAY__.setLayout(r, c), [rows, cols]),
  setUploadTarget: (page, index) => page.evaluate((i) => window.__FIGPLAY__.setUploadTarget(i), index),
  loadDemo: (page) => page.evaluate(async () => window.__FIGPLAY__.loadDemo()),
  clearAll: (page) => page.evaluate(() => window.__FIGPLAY__.clearAll()),
  clearStorage: (page) => page.evaluate(() => window.__FIGPLAY__.clearStorage()),
  exportBase64: (page, format, overrides) =>
    page.evaluate(([f, o]) => window.__FIGPLAY__.exportBase64(f, o), [format, overrides || null]),
};

export async function getPreviewDom(page) {
  return page.evaluate(() => {
    const svg = document.getElementById('preview-svg');
    if (!svg) return null;
    const hits = Array.from(svg.querySelectorAll('.cell-hit')).map((node) => {
      const box = node.getBBox();
      return {
        index: Number(node.dataset.index),
        x: box.x, y: box.y, w: box.width, h: box.height,
      };
    });
    const hrefOf = (el) => el.getAttribute('href')
      || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
    const images = Array.from(svg.querySelectorAll('.cell-image')).map((node) => {
      const group = node.closest('g[data-i]');
      return {
        cellIndex: group ? Number(group.dataset.i) : null,
        display: node.getAttribute('display'),
        width: Number(node.getAttribute('width')),
        height: Number(node.getAttribute('height')),
        transform: node.getAttribute('transform'),
        href: hrefOf(node),
      };
    });
    const labels = Array.from(svg.querySelectorAll('.labels-layer text.label-text')).map((node) => {
      let box = null;
      try {
        const b = node.getBBox();
        box = { x: b.x, y: b.y, w: b.width, h: b.height };
      } catch (err) {
        box = null;
      }
      return {
        text: node.textContent,
        x: Number(node.getAttribute('x')),
        y: Number(node.getAttribute('y')),
        fontSize: Number(node.getAttribute('font-size')),
        fontWeight: node.getAttribute('font-weight'),
        fontStyle: node.getAttribute('font-style'),
        fill: node.getAttribute('fill'),
        anchor: node.getAttribute('text-anchor'),
        bbox: box,
      };
    });
    const bg = svg.querySelector('.figure-bg');
    return {
      viewBox: svg.getAttribute('viewBox'),
      widthAttr: svg.getAttribute('width'),
      heightAttr: svg.getAttribute('height'),
      cellHitCount: hits.length,
      hits,
      images,
      labels,
      figureBgFill: bg ? bg.getAttribute('fill') : null,
      shellSize: {
        width: document.getElementById('figure-shell').offsetWidth,
        height: document.getElementById('figure-shell').offsetHeight,
      },
    };
  });
}

/** 读取当前 UI 控件值（用于断言 UI 与状态同步） */
export async function getUiValues(page) {
  return page.evaluate(() => {
    const value = (id) => {
      const node = document.getElementById(id);
      if (!node) return null;
      if (node.type === 'checkbox') return node.checked;
      return node.value;
    };
    const active = (selector) => {
      const node = document.querySelector(selector);
      return node ? node.dataset : null;
    };
    return {
      rows: value('rows-input'),
      cols: value('cols-input'),
      width: value('width-input'),
      aspectW: value('aspect-w'),
      aspectH: value('aspect-h'),
      colGap: value('col-gap'),
      rowGap: value('row-gap'),
      margin: value('margin-input'),
      bgMode: value('bg-mode'),
      labelShow: value('label-show'),
      labelScheme: value('label-scheme'),
      labelStart: value('label-start'),
      labelOrder: value('label-order'),
      labelSkipEmpty: value('label-skip-empty'),
      labelInset: value('label-inset'),
      labelOffsetX: value('label-offset-x'),
      labelOffsetY: value('label-offset-y'),
      labelSize: value('label-size'),
      labelBold: value('label-bold'),
      labelItalic: value('label-italic'),
      labelColor: value('label-color'),
      filename: value('filename-input'),
      dpi: value('dpi-input'),
      jpgQuality: value('jpg-quality'),
      transparent: value('transparent-toggle'),
      activeFormat: active('#format-buttons .is-active'),
      activePos: active('#pos-picker .is-active'),
      // 矩阵选中态是“r<=rows 且 c<=cols”的矩形高亮，取所有高亮格
      activeMatrixCells: Array.from(document.querySelectorAll('#matrix-picker .is-active'))
        .map((node) => ({ r: Number(node.dataset.r), c: Number(node.dataset.c) })),
      matrixCaption: (document.getElementById('matrix-caption') || {}).textContent,
      activeDpiChip: active('#dpi-chips .is-active'),
      btnExportText: (document.getElementById('btn-export-text') || {}).textContent,
      statusText: (document.getElementById('status-text') || {}).textContent,
    };
  });
}

export async function getActiveSelection(page) {
  return page.evaluate(() => ({
    selectedCell: window.__FIGPLAY__.getPreviewInfo().selectedCell,
    cellIndexLabel: (document.getElementById('cell-index-label') || {}).textContent,
    cellControlsHidden: (document.getElementById('cell-controls') || {}).hidden,
    cellMeta: (document.getElementById('cell-meta') || {}).textContent,
    rotationActive: (document.querySelector('#cell-rotation .is-active') || {}).dataset
      ? document.querySelector('#cell-rotation .is-active').dataset.rot : null,
  }));
}

/* ---------------- 表单操作 ---------------- */

export async function setNumberInput(page, selector, value) {
  await page.locator(selector).evaluate((node, v) => {
    node.value = String(v);
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

export async function setColorInput(page, selector, value) {
  await page.locator(selector).evaluate((node, v) => {
    node.value = String(v);
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

export async function setCheckbox(page, selector, checked) {
  await page.locator(selector).evaluate((node, value) => {
    if (node.checked !== value) {
      node.checked = value;
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, !!checked);
}

export async function setSelect(page, selector, value) {
  await page.locator(selector).selectOption(String(value));
}

export async function clickSelector(page, selector) {
  await page.locator(selector).click();
}

export async function clickMatrix(page, rows, cols) {
  await page.locator(`#matrix-picker .mx[data-r="${rows}"][data-c="${cols}"]`).click();
}

export async function clickPos(page, pos) {
  await page.locator(`#pos-picker [data-pos="${pos}"]`).click();
}

export async function clickFormat(page, format) {
  await page.locator(`#format-buttons [data-format="${format}"]`).click();
}

export async function clickDpiChip(page, dpi) {
  await page.locator(`#dpi-chips [data-dpi="${dpi}"]`).click();
}

export async function setLabelScheme(page, schemeId) {
  await setSelect(page, '#label-scheme', schemeId);
}

export async function selectCell(page, index) {
  await page.locator(`#preview-svg .cell-hit[data-index="${index}"]`).click();
  await waitFor(page, (i) => window.__FIGPLAY__.getPreviewInfo().selectedCell === i, index, {
    label: `selectCell(${index})`,
  });
}

export async function setCustomLabel(page, index, text) {
  await selectCell(page, index);
  await page.locator('#cell-custom-label').evaluate((node, value) => {
    node.value = String(value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }, text);
  await waitFor(page, ([i, expected]) => {
    const cell = window.__FIGPLAY__.getState().cells[i];
    return !!cell && cell.customLabel === expected;
  }, [index, text], { label: `customLabel(${index})` });
}

/* ---------------- 上传 / 拖放 ---------------- */

/** 指定目标格子上传（target=null 时批量填充空位） */
export async function uploadFiles(page, files, target, expectFilledCount) {
  const abs = files.map((file) => (path.isAbsolute(file) ? file : samplePath(file)));
  await api.setUploadTarget(page, target == null ? null : target);
  await page.locator('#file-input').setInputFiles(abs);
  if (expectFilledCount != null) {
    await waitFor(
      page,
      (count) => window.__FIGPLAY__.getPreviewInfo().filled.length >= count,
      expectFilledCount,
      { label: `upload -> filled>=${expectFilledCount}` }
    );
  }
  return api.getPreviewInfo(page);
}

/** 向预览舞台拖放一个真实文件（合成 DataTransfer + DragEvent，走应用 drop 逻辑） */
export async function dragDropFileToCell(page, index, filePath, position) {
  const bytes = fs.readFileSync(filePath);
  const base64 = bytes.toString('base64');
  const name = path.basename(filePath);
  const ext = path.extname(name).toLowerCase();
  const mime = ext === '.png' ? 'image/png'
    : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg'
      : ext === '.svg' ? 'image/svg+xml' : 'application/octet-stream';
  await page.evaluate(async (payload) => {
    const binary = atob(payload.base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
    const file = new File([buffer], payload.name, { type: payload.mime });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const hit = document.querySelector(`#preview-svg .cell-hit[data-index="${payload.index}"]`);
    if (!hit) throw new Error('找不到 cell-hit #' + payload.index);
    const rect = hit.getBoundingClientRect();
    const clientX = payload.position === 'center'
      ? rect.left + rect.width / 2 : rect.left + rect.width * 0.5;
    const clientY = rect.top + rect.height / 2;
    const stage = document.getElementById('stage');
    for (const type of ['dragenter', 'dragover', 'drop']) {
      stage.dispatchEvent(new DragEvent(type, {
        bubbles: true, cancelable: true, dataTransfer,
        clientX, clientY,
      }));
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, { base64, name, mime, index, position: position || 'center' });
}

/* ---------------- 自动保存（IndexedDB / localStorage 直接读取） ---------------- */

const DB_NAME = 'figureplay';
const STORE = 'session';
const KEY = 'figureplay:session';
const LS_KEY = 'figureplay.session.v1';

export async function readSavedSession(page) {
  const raw = await page.evaluate(({ dbName, storeName, key, lsKey }) => {
    const readLocal = () => {
      try {
        const value = localStorage.getItem(lsKey);
        return value ? JSON.parse(value) : null;
      } catch (err) {
        return null;
      }
    };
    const readIdb = () => new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      try {
        if (!('indexedDB' in window) || !window.indexedDB) return finish(null);
        const timer = setTimeout(() => finish(null), 1500);
        const request = window.indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
          try {
            const db = request.result;
            if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
          } catch (err) { /* ignore */ }
        };
        request.onsuccess = () => {
          clearTimeout(timer);
          const db = request.result;
          try {
            const tx = db.transaction(storeName, 'readonly');
            const get = tx.objectStore(storeName).get(key);
            get.onsuccess = () => {
              db.close();
              finish(get.result || null);
            };
            get.onerror = () => {
              db.close();
              finish(null);
            };
          } catch (err) {
            db.close();
            finish(null);
          }
        };
        request.onerror = () => {
          clearTimeout(timer);
          finish(null);
        };
      } catch (err) {
        finish(null);
      }
    });
    return readIdb().then((payload) => {
      if (payload) return { backend: 'indexeddb', payload };
      const local = readLocal();
      return local ? { backend: 'localstorage', payload: local } : null;
    });
  }, { dbName: DB_NAME, storeName: STORE, key: KEY, lsKey: LS_KEY });
  if (!raw) return null;
  return normalizeSavedSession(raw);
}

/**
 * 兼容 v1.1（payload.state 为 page 级 state）与 v1.2（payload.state={version:2,project}）的落盘结构。
 * 返回 { backend, payload, doc, project, pages, current, currentPage, legacyState }
 * 其中 currentPage = {layout,cells,label,groups}，legacyState 提供 v1.1 风格的 layout/cells/label。
 */
export function normalizeSavedSession(raw) {
  const payload = (raw && raw.payload) || {};
  const doc = payload.state || payload; // storage.save 把 snapshot 放在 state 字段
  const project = doc && doc.project ? doc.project : doc;
  const pages = project && Array.isArray(project.pages) ? project.pages : [];
  const currentRaw = project && project.current;
  const current = Number.isInteger(currentRaw) && currentRaw >= 0 && currentRaw < pages.length
    ? currentRaw : 0;
  const currentPage = pages[current] || null;
  return {
    backend: raw.backend || 'unknown',
    payload,
    doc,
    project,
    pages,
    current,
    currentPage,
    legacyState: currentPage ? {
      layout: currentPage.layout, cells: currentPage.cells, label: currentPage.label,
      groups: currentPage.groups || [], version: doc && doc.version,
    } : null,
    version: doc && doc.version,
  };
}

/**
 * 等待自动保存完成（应用 scheduleSave 延迟 900ms）。
 * predicate 接收 normalizeSavedSession 结果（含 currentPage.cells/currentPage.layout 等），返回 true 表示满足。
 */
export async function waitForAutosave(page, predicate, options = {}) {
  const { timeout = 8000, label = 'autosave' } = options;
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeout) {
    last = await readSavedSession(page);
    if (last && last.currentPage) {
      let ok = false;
      try {
        ok = predicate(last, last.legacyState);
      } catch (err) {
        ok = false;
      }
      if (ok) return last;
    }
    await page.waitForTimeout(150);
  }
  throw new Error(`等待自动保存超时（${label}, ${timeout}ms）`);
}

/** 删除应用存储（IndexedDB figureplay + localStorage），用于新场景隔离 */
export async function clearAppStorage(page) {
  await page.evaluate(({ dbName, lsKey }) => new Promise((resolve) => {
    try { localStorage.removeItem(lsKey); } catch (err) { /* ignore */ }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    try {
      const request = window.indexedDB.deleteDatabase(dbName);
      request.onsuccess = finish;
      request.onerror = finish;
      request.onblocked = finish;
      setTimeout(finish, 1500);
    } catch (err) {
      finish();
    }
  }), { dbName: DB_NAME, lsKey: LS_KEY });
}

/* ---------------- 导出 ---------------- */

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

export async function exportToFile(page, format, overrides, exportDir, fallbackName) {
  const apiResult = await api.exportBase64(page, format, overrides);
  if (!apiResult || typeof apiResult.base64 !== 'string') {
    throw new Error(`exportBase64(${format}) 返回格式异常: ${JSON.stringify(Object.keys(apiResult || {}))}`);
  }
  await ensureDir(exportDir);
  const filename = apiResult.filename || `${fallbackName || 'export'}.${format}`;
  const filePath = path.join(exportDir, filename);
  const bytes = Buffer.from(apiResult.base64, 'base64');
  await fsp.writeFile(filePath, bytes);
  const { base64, ...meta } = apiResult;
  return {
    ...meta,
    base64Length: base64.length,
    path: filePath,
    size: bytes.length,
    sha256: sha256(bytes),
  };
}

/** 通过 UI 的「导出」按钮下载文件 */
export async function uiDownload(page, formatButton, triggerSelector, dir = DOWNLOADS_DIR, filename) {
  await clickFormat(page, formatButton);
  const download = await waitForDownload(page, () => page.locator(triggerSelector).click(), { timeout: 60000 });
  return saveDownload(download, filename, { dir });
}

/* ==========================================================================
 * v1.1 新增：合并单元格 / 模板 / 多选批量编号 / 粘贴弹窗 / 桌面桥
 * 说明：应用未就绪（v1.0）时这些 API 不存在；场景里先用 ensureV11() 快速失败，
 *       避免点击空面板触发 v1.0 的文件选择器行为而挂起。
 * ========================================================================== */

export const V11_METHODS = [
  'mergePanels', 'splitPanel', 'setMultiSelect', 'applyTemplate',
  'getTemplates', 'openPasteDialog', 'getPasteState',
];

export async function getAppVersion(page) {
  return page.evaluate(() => {
    const api = window.__FIGPLAY__;
    return api ? api.version || null : null;
  });
}

export async function getPreviewInfoV11(page) {
  const info = await api.getPreviewInfo(page);
  const merges = (info && info.merges) || null;
  return {
    raw: info,
    version: await getAppVersion(page),
    panels: (info && info.panels) || null,
    cellCount: info ? info.cellCount : null,
    panelCount: info && Array.isArray(info.panels) ? info.panels.length : (info ? info.cellCount : null),
    gridCellCount: info && info.gridCellCount != null ? info.gridCellCount : (info ? info.cellCount : null),
    merges,
    multiSelect: (info && info.multiSelect) || [],
    filled: (info && info.filled) || [],
    labels: (info && info.labels) || [],
    imageCount: info ? info.imageCount : null,
  };
}

/**
 * 校验当前应用是否已具备 v1.1 契约。返回 {ok, version, missingMethods, missingFields, gridCellCount, panelCount}
 * 不会抛异常；场景应把 detail 放到断言里。
 */
export async function probeV11(page) {
  return page.evaluate((methodNames) => {
    const api = window.__FIGPLAY__;
    const version = api ? api.version || null : null;
    const missingMethods = methodNames.filter((name) => !api || typeof api[name] !== 'function');
    let info = null;
    try {
      info = api && typeof api.getPreviewInfo === 'function' ? api.getPreviewInfo() : null;
    } catch (err) {
      info = null;
    }
    const fields = info || {};
    const missingFields = ['panels', 'merges', 'multiSelect', 'gridCellCount']
      .filter((name) => !(name in fields));
    return {
      version,
      apiPresent: !!api,
      missingMethods,
      missingFields,
      gridCellCount: fields.gridCellCount != null ? fields.gridCellCount : (fields.cellCount != null ? fields.cellCount : null),
      cellCount: fields.cellCount != null ? fields.cellCount : null,
      panelCount: Array.isArray(fields.panels) ? fields.panels.length : null,
      hasLayoutMerges: !!(api && typeof api.getState === 'function' && api.getState().layout
        && Array.isArray(api.getState().layout.merges)),
    };
  }, V11_METHODS);
}

/**
 * 场景启动守卫：检查 v1.1 契约是否可用；不可用则记录失败断言并返回 false。
 * @returns {Promise<boolean>}
 */
export async function ensureV11(ctx, page, label = 'v1.1 契约') {
  const probe = await probeV11(page);
  ctx.evidence.v11Probe = probe;
  const appVersion = probe.version || 'unknown';
  ctx.check(`${label}：应用版本 >= 1.1（当前 ${appVersion}）`,
    /^1\.[1-9]|^[2-9]\./.test(String(appVersion)), appVersion);
  ctx.check(`${label}：API 方法齐全（${V11_METHODS.join('/')}）`,
    probe.missingMethods.length === 0, probe.missingMethods);
  ctx.check(`${label}：getPreviewInfo 含 panels/merges/multiSelect/gridCellCount`,
    probe.missingFields.length === 0, probe.missingFields);
  ctx.check(`${label}：getState().layout.merges 为数组`, probe.hasLayoutMerges === true);
  ctx.note('v1.1 契约探测（信息，非问题）', JSON.stringify(probe));
  return probe.missingMethods.length === 0 && probe.missingFields.length === 0 && probe.hasLayoutMerges === true;
}

/* ---------------- 面板几何（0 基 merges 的独立复算） ---------------- */

/**
 * 根据 state.layout（rows/cols/gaps/margin/merges）独立计算 v1.1 面板几何（mm）。
 * @returns {{geom:object, panels:Array<{index:number,row:number,col:number,rowSpan:number,colSpan:number,x:number,y:number,w:number,h:number,merged:boolean}>}}
 */
export function computePanelsMm(layout) {
  const geom = computeGeometryMm(layout);
  const cols = geom.cols;
  const merges = Array.isArray(layout.merges) ? layout.merges : [];
  const covered = new Set();
  const anchors = new Map();
  const mergeList = merges.map((merge) => {
    const r = Math.max(0, Math.min(geom.rows - 1, Number(merge.r) || 0));
    const c = Math.max(0, Math.min(cols - 1, Number(merge.c) || 0));
    const rs = Math.max(1, Math.min(geom.rows - r, Number(merge.rs) || 1));
    const cs = Math.max(1, Math.min(cols - c, Number(merge.cs) || 1));
    return { r, c, rs, cs };
  });
  for (const merge of mergeList) {
    anchors.set(merge.r * cols + merge.c, merge);
    for (let r = merge.r; r < merge.r + merge.rs; r++) {
      for (let c = merge.c; c < merge.c + merge.cs; c++) {
        if (r === merge.r && c === merge.c) continue;
        covered.add(r * cols + c);
      }
    }
  }
  const panels = [];
  for (let r = 0; r < geom.rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      if (covered.has(index)) continue;
      const merge = anchors.get(index);
      const rowSpan = merge ? merge.rs : 1;
      const colSpan = merge ? merge.cs : 1;
      panels.push({
        index,
        row: r,
        col: c,
        rowSpan,
        colSpan,
        x: geom.margin + c * (geom.cellW + geom.colGap),
        y: geom.margin + r * (geom.cellH + geom.rowGap),
        w: colSpan * geom.cellW + (colSpan - 1) * geom.colGap,
        h: rowSpan * geom.cellH + (rowSpan - 1) * geom.rowGap,
        merged: !!merge && (rowSpan > 1 || colSpan > 1),
      });
    }
  }
  return { geom, panels };
}

/** v1.1 期望编号：按面板顺序（面板 anchor index），skipEmpty 依据 anchor 是否有图 */
export function expectedLabelsV11(state) {
  const label = state.label || {};
  if (!label.show) return [];
  const { geom, panels } = computePanelsMm(state.layout);
  const order = label.order === 'col' ? 'col' : 'row';
  const ordered = order === 'col'
    ? panels.slice().sort((a, b) => (a.col - b.col) || (a.row - b.row))
    : panels.slice().sort((a, b) => (a.row - b.row) || (a.col - b.col));
  const start = Math.max(1, Number(label.start) || 1);
  const skipEmpty = !!label.skipEmpty;
  const labels = [];
  let counter = 0;
  for (const panel of ordered) {
    const cell = state.cells[panel.index];
    if (!cell && skipEmpty) continue;
    counter += 1;
    let text = formatLabel(label.scheme, start + counter - 1);
    const custom = cell && String(cell.customLabel || '').trim();
    if (custom) text = custom;
    labels.push({ cellIndex: panel.index, text, row: panel.row, col: panel.col });
  }
  return { labels, geom, panels };
}

/** 从 getPreviewInfo().panels 取面板（v1.1） */
export async function getPanels(page) {
  const info = await api.getPreviewInfo(page);
  return info && Array.isArray(info.panels) ? info.panels : null;
}

/* ---------------- v1.1 API ---------------- */

export async function mergePanels(page, indices, options = {}) {
  return page.evaluate(([idx, opts]) => window.__FIGPLAY__.mergePanels(idx, opts),
    [indices, { force: !!options.force }]);
}
export async function splitPanel(page, index) {
  return page.evaluate((i) => window.__FIGPLAY__.splitPanel(i), index);
}
export async function setMultiSelect(page, indices) {
  return page.evaluate((idx) => window.__FIGPLAY__.setMultiSelect(idx), indices);
}
export async function applyTemplate(page, templateId) {
  return page.evaluate((id) => window.__FIGPLAY__.applyTemplate(id), templateId);
}
export async function getTemplates(page) {
  return page.evaluate(() => window.__FIGPLAY__.getTemplates());
}
export async function openPasteDialogApi(page, index) {
  return page.evaluate((i) => window.__FIGPLAY__.openPasteDialog(i), index);
}
export async function getPasteState(page) {
  return page.evaluate(() => window.__FIGPLAY__.getPasteState());
}
export async function getMultiSelect(page) {
  const info = await api.getPreviewInfo(page);
  return (info && info.multiSelect) || [];
}

/* ---------------- 多选点击 ---------------- */

/** 点击面板：modifiers 可为 ['Control'] / ['Shift'] / []。index 为 .cell-hit[data-index] */
export async function clickPanel(page, index, modifiers = []) {
  await page.locator(`#preview-svg .cell-hit[data-index="${index}"]`).click({ modifiers });
}

/** 模拟 Ctrl/Shift 多选：按顺序点击（失败时抛错，调用方可记录证据） */
export async function multiSelectByClicks(page, indices, mode = 'Control') {
  for (let i = 0; i < indices.length; i++) {
    const modifiers = i === 0 ? [] : [mode];
    await clickPanel(page, indices[i], modifiers);
  }
}

/** #multi-controls 的可见性与按钮可用性 */
export async function getMultiControls(page) {
  return page.evaluate(() => {
    const container = document.getElementById('multi-controls');
    const btn = (id) => {
      const node = document.getElementById(id);
      if (!node) return null;
      return { present: true, disabled: !!node.disabled, text: (node.textContent || '').trim() };
    };
    const visible = !!container && !container.hidden
      && getComputedStyle(container).display !== 'none'
      && container.getBoundingClientRect().width > 0;
    return {
      visible,
      merge: btn('multi-merge'),
      split: btn('multi-split'),
      batchLabel: btn('multi-batch-label'),
      cancel: btn('multi-cancel'),
      countText: (document.getElementById('multi-count') || {}).textContent || '',
      mergeHint: (document.getElementById('multi-merge-hint') || {}).textContent || '',
      selectedCount: document.querySelectorAll('#preview-svg .cell.is-selected').length,
    };
  });
}

/* ---------------- 模板弹窗 ---------------- */

export async function dialogState(page, selector) {
  return page.evaluate((sel) => {
    const node = document.querySelector(sel);
    if (!node) return { present: false };
    const rect = node.getBoundingClientRect();
    return {
      present: true,
      open: 'open' in node ? node.open === true : true,
      visible: rect.width > 0 && rect.height > 0,
    };
  }, selector);
}

export async function waitForDialog(page, selector, options = {}) {
  const { timeout = 5000, open = true, label = selector } = options;
  await waitFor(page, ([sel, expected]) => {
    const node = document.querySelector(sel);
    if (!node) return false;
    const isOpen = 'open' in node ? node.open === true : true;
    return expected ? isOpen : !isOpen;
  }, [selector, open], { timeout, label: `dialog ${label}` });
}

export async function openTemplateDialog(page) {
  await page.locator('#btn-templates').click();
  await waitForDialog(page, '#template-dialog', { label: 'template-dialog' });
}

export async function listTemplateCards(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('#template-dialog .template-card[data-template]'))
    .map((node) => ({ template: node.dataset.template, title: (node.textContent || '').trim().slice(0, 60) })));
}

/**
 * 点击模板卡片并等待应用（模板可能点击即应用并关窗，也可能需再确认）。
 * @returns {{applied:boolean, dialogClosed:boolean}}
 */
export async function chooseTemplate(page, templateId, options = {}) {
  const { timeout = 8000 } = options;
  const card = page.locator(`#template-dialog .template-card[data-template="${templateId}"]`);
  await card.click();
  let dialogClosed = false;
  try {
    await waitFor(page, () => {
      const node = document.getElementById('template-dialog');
      return !node || node.open !== true;
    }, null, { timeout: 2500, label: 'template dialog closed' });
    dialogClosed = true;
  } catch (err) {
    dialogClosed = false;
  }
  if (!dialogClosed) {
    // 部分实现需要“应用”按钮；找不到就直接 Esc 关闭
    const applyButton = page.locator('#template-dialog #template-apply, #template-dialog [data-action="apply"], #template-dialog #apply-template');
    if (await applyButton.count() > 0) {
      await applyButton.first().click().catch(() => {});
    } else {
      await page.keyboard.press('Escape').catch(() => {});
    }
    await waitFor(page, () => {
      const node = document.getElementById('template-dialog');
      return !node || node.open !== true;
    }, null, { timeout: timeout, label: 'template dialog closed after apply' }).catch(() => {});
    dialogClosed = true;
  }
  return { dialogClosed, cards: await listTemplateCards(page).catch(() => []) };
}

/* ---------------- 批量编号弹窗 ---------------- */

export async function openBatchLabelDialog(page) {
  await page.locator('#multi-batch-label').click();
  await waitForDialog(page, '#batch-label-dialog', { label: 'batch-label-dialog' });
}

export async function getBatchDialogState(page) {
  return page.evaluate(() => {
    const dialog = document.getElementById('batch-label-dialog');
    const valueOf = (id) => {
      const node = document.getElementById(id);
      if (!node) return null;
      return node.type === 'checkbox' ? node.checked : node.value;
    };
    const text = (id) => {
      const node = document.getElementById(id);
      return node ? (node.textContent || '').trim() : null;
    };
    return {
      open: !!dialog && dialog.open === true,
      scheme: valueOf('batch-scheme'),
      start: valueOf('batch-start'),
      preview: text('batch-preview'),
      applyDisabled: (document.getElementById('batch-apply') || {}).disabled,
    };
  });
}

export async function batchSetScheme(page, schemeId) {
  await setSelect(page, '#batch-scheme', schemeId);
}
export async function batchSetStart(page, start) {
  await setNumberInput(page, '#batch-start', start);
}
export async function batchApply(page) {
  await page.locator('#batch-apply').click();
}
export async function batchClear(page) {
  await page.locator('#batch-clear').click();
}
export async function batchClose(page) {
  await page.locator('#batch-close').click();
  await waitForDialog(page, '#batch-label-dialog', { open: false, label: 'batch-label-dialog close' });
}

/* ---------------- 粘贴画布弹窗 ---------------- */

/** 点击空面板打开粘贴弹窗（v1.1）；v1.0 会走文件选择器，勿在 v1.0 下调用 */
export async function openPasteDialogByEmptyPanel(page, index) {
  await clickPanel(page, index);
  await waitForDialog(page, '#paste-dialog', { label: 'paste-dialog' });
}

export async function getPasteDialogState(page) {
  return page.evaluate(() => {
    const dialog = document.getElementById('paste-dialog');
    if (!dialog) return { present: false };
    const img = document.getElementById('paste-preview-img');
    const zone = document.getElementById('paste-zone');
    const confirm = document.getElementById('paste-confirm');
    const readButton = document.getElementById('paste-read-clipboard');
    const clipboardButtons = Array.from(dialog.querySelectorAll('button, [role="button"]'))
      .filter((node) => /剪贴板/.test(node.textContent || ''))
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    return {
      present: true,
      open: dialog.open === true,
      visible: dialog.getBoundingClientRect().width > 0,
      previewSrc: img ? String(img.getAttribute('src') || '') : null,
      previewVisible: !!img && img.getBoundingClientRect().width > 0,
      previewNatural: img ? { width: img.naturalWidth, height: img.naturalHeight } : null,
      confirmDisabled: confirm ? !!confirm.disabled : null,
      continueChecked: (document.getElementById('paste-continue') || {}).checked,
      zonePresent: !!zone,
      readClipboardPresent: !!readButton,
      readClipboardHidden: readButton ? !!readButton.hidden : null,
      clipboardButtonCount: clipboardButtons.length,
      statusText: (document.getElementById('paste-status') || {}).textContent || '',
      titleText: (document.getElementById('paste-title') || {}).textContent || '',
      targetText: (document.getElementById('paste-target-label') || {}).textContent || '',
      text: (dialog.textContent || '').trim().slice(0, 400),
    };
  });
}

function readSamplePayload(filePath) {
  const bytes = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png'
    : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg'
      : ext === '.svg' ? 'image/svg+xml' : 'application/octet-stream';
  return { base64: bytes.toString('base64'), name: path.basename(filePath), mime };
}

/** 在 #paste-zone 上派发合成 paste 事件（ClipboardEvent + DataTransfer File） */
export async function pasteDispatchClipboardFile(page, filePath, selector = '#paste-zone') {
  const payload = readSamplePayload(filePath);
  await page.evaluate(({ base64, name, mime, sel }) => {
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
    const file = new File([buffer], name, { type: mime });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const target = document.querySelector(sel) || document;
    let event;
    try {
      event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dataTransfer });
    } catch (err) {
      event = new Event('paste', { bubbles: true, cancelable: true });
    }
    if (!event.clipboardData) {
      Object.defineProperty(event, 'clipboardData', { value: dataTransfer, configurable: true });
    }
    target.dispatchEvent(event);
  }, { ...payload, sel: selector });
}

/** 在 #paste-zone 上派发合成拖放（dragenter/dragover/drop + DataTransfer File） */
export async function pasteDispatchDropFile(page, filePath, selector = '#paste-zone') {
  const payload = readSamplePayload(filePath);
  await page.evaluate(async ({ base64, name, mime, sel }) => {
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
    const file = new File([buffer], name, { type: mime });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const target = document.querySelector(sel) || document.body;
    for (const type of ['dragenter', 'dragover', 'drop']) {
      target.dispatchEvent(new DragEvent(type, {
        bubbles: true, cancelable: true, dataTransfer,
      }));
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }, { ...payload, sel: selector });
}

/** 通过弹窗内“选择本地图片”隐藏 input 注入文件（#paste-file-input） */
export async function pastePickLocalFile(page, filePath) {
  await page.locator('#paste-file-input').setInputFiles(filePath);
  await page.waitForTimeout(200);
}

export async function pasteConfirm(page) {
  await page.locator('#paste-confirm').click();
}

export async function pasteCancel(page) {
  await page.locator('#paste-cancel').click();
  await waitForDialog(page, '#paste-dialog', { open: false, label: 'paste-cancel' });
}

/** 等待粘贴弹窗出现 data:image/ 预览 */
export async function waitPastePreview(page, options = {}) {
  const { timeout = 8000, label = 'paste preview' } = options;
  await waitFor(page, () => {
    const img = document.getElementById('paste-preview-img');
    return !!img && /^data:image\//.test(String(img.getAttribute('src') || ''))
      && img.getBoundingClientRect().width > 0;
  }, null, { timeout, label });
  return getPasteDialogState(page);
}

/* ---------------- 桌面桥 mock（window.chrome.webview） ---------------- */

/** 必须在页面加载应用前调用（page.addInitScript） */
export async function installDesktopBridgeMock(page) {
  await page.addInitScript(() => {
    if (window.__figplayBridgeInstalled) return;
    window.__figplayBridgeInstalled = true;
    const sent = [];
    const listeners = [];
    const receiveListeners = [];
    const webview = {
      postMessage(message) {
        sent.push(message);
        window.__figplayBridgeLastMessage = message;
      },
      addEventListener(type, handler) {
        if (type === 'message' && typeof handler === 'function') listeners.push(handler);
      },
      removeEventListener(type, handler) {
        const index = listeners.indexOf(handler);
        if (index >= 0) listeners.splice(index, 1);
      },
      dispatchEvent() { return true; },
      hostObjects: {},
    };
    window.chrome = window.chrome || {};
    window.chrome.webview = webview;
    window.__figplayBridge = {
      sent,
      listeners,
      receive(data) {
        const event = new MessageEvent('message', { data });
        for (const handler of listeners.slice()) {
          try { handler(event); } catch (err) { /* 记录但不影响 mock */ }
        }
        return true;
      },
      lastMessage(type) {
        for (let i = sent.length - 1; i >= 0; i--) {
          if (sent[i] && sent[i].type === type) return sent[i];
        }
        return null;
      },
    };
  });
}

/** 桌面桥消息可能以 JSON 字符串或对象两种形式出现（desktop.js 实际 postMessage(JSON.stringify(...))） */
function normalizeBridgeMessage(raw) {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (err) {
      return { raw };
    }
  }
  return raw;
}

/** 取 mock 收到的 postMessage 列表（已把 JSON 字符串解析为对象；无 mock 返回 null） */
export async function getBridgeMessages(page) {
  const raw = await page.evaluate(() => (window.__figplayBridge ? window.__figplayBridge.sent.slice() : null));
  return raw ? raw.map(normalizeBridgeMessage) : null;
}

/** mock 向页面派发 host 回包（可传对象；若 app 期望字符串也会被 desktop.js 兼容解析） */
export async function sendBridgeMessage(page, data) {
  return page.evaluate((payload) => {
    if (!window.__figplayBridge) throw new Error('桌面桥 mock 未安装');
    return window.__figplayBridge.receive(payload);
  }, data);
}

/** 统计某 type 的 postMessage 数量（兼容 JSON 字符串） */
export async function bridgeMessageCount(page, type) {
  const messages = (await getBridgeMessages(page)) || [];
  return messages.filter((message) => message && message.type === type).length;
}

/**
 * 等待第 minCount 条指定 type 的新消息（避免匹配到历史消息），返回该条消息。
 * @param {import('playwright-core').Page} page
 * @param {string} type
 * @param {number} minCount 期望至少达到的消息条数
 */
export async function waitNewBridgeMessage(page, type, minCount, options = {}) {
  const { timeout = 8000, label = `new bridge message ${type}` } = options;
  await waitFor(page, ([expectedType, expectedCount]) => {
    const bridge = window.__figplayBridge;
    if (!bridge) return false;
    let count = 0;
    for (const raw of bridge.sent) {
      let message = raw;
      if (typeof message === 'string') {
        try { message = JSON.parse(message); } catch (err) { continue; }
      }
      if (message && message.type === expectedType) count += 1;
    }
    return count >= expectedCount;
  }, [type, minCount], { timeout, label });
  const messages = (await getBridgeMessages(page)) || [];
  const matches = messages.filter((message) => message && message.type === type);
  return matches[matches.length - 1] || null;
}

/** 等待 app 发出指定 type 的 postMessage（兼容 JSON 字符串），返回解析后的消息 */
export async function waitBridgeMessage(page, type, options = {}) {
  const { timeout = 8000, label = `bridge message ${type}` } = options;
  await waitFor(page, (expectedType) => {
    const bridge = window.__figplayBridge;
    if (!bridge) return false;
    return bridge.sent.some((raw) => {
      let message = raw;
      if (typeof message === 'string') {
        try { message = JSON.parse(message); } catch (err) { return false; }
      }
      return !!message && message.type === expectedType;
    });
  }, type, { timeout, label });
  const messages = await getBridgeMessages(page);
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i] && messages[i].type === type) return messages[i];
  }
  return null;
}

/** 菜单/弹窗中“从系统剪贴板读取”类按钮的数量（浏览器模式应为 0；有桌面桥时应 > 0） */
export async function pasteClipboardButtonCount(page) {
  return page.evaluate(() => {
    const dialog = document.getElementById('paste-dialog');
    if (!dialog) return 0;
    return Array.from(dialog.querySelectorAll('button, [role="button"], [data-action]'))
      .filter((node) => /剪贴板|粘贴板|clipboard/i.test((node.textContent || '') + ' ' + (node.dataset ? Object.values(node.dataset).join(' ') : '')))
      .filter((node) => !/paste-zone|paste-preview/.test(node.id || ''))
      .length;
  });
}

/** 把合并面板几何转为「期望 clip rect 列表」（mm） */
export function expectedPanelRectsMm(state) {
  const { panels } = computePanelsMm(state.layout);
  return panels.map((panel) => ({
    index: panel.index, row: panel.row, col: panel.col,
    rowSpan: panel.rowSpan, colSpan: panel.colSpan,
    x: panel.x, y: panel.y, w: panel.w, h: panel.h, merged: panel.merged,
  }));
}

/* ==========================================================================
 * v1.2 新增：多页工程 / 撤销重做 / 分组 / 多页导出 / MATLAB .fig
 * ========================================================================== */

export const V12_METHODS = [
  'getPages', 'setPage', 'addPage', 'duplicatePage', 'deletePage', 'renamePage',
  'getGroups', 'createGroup', 'updateGroup', 'deleteGroup', 'selectGroup',
  'undo', 'redo', 'getHistoryState', 'exportAllBase64', 'setExportScope',
];

export const V12_PREVIEW_FIELDS = ['pages', 'groups', 'canUndo', 'canRedo', 'pageIndex', 'pageCount', 'pageName'];
export const V12_STATE_FIELDS = ['pages', 'pageIndex', 'groups', 'canUndo', 'canRedo'];

/** 探测 v1.2 契约（不抛异常） */
export async function probeV12(page) {
  return page.evaluate(([methods, previewFields, stateFields]) => {
    const api = window.__FIGPLAY__;
    const version = api ? api.version || null : null;
    const missingMethods = methods.filter((name) => !api || typeof api[name] !== 'function');
    let preview = null;
    let state = null;
    try {
      preview = api && typeof api.getPreviewInfo === 'function' ? api.getPreviewInfo() : null;
    } catch (err) { preview = null; }
    try {
      state = api && typeof api.getState === 'function' ? api.getState() : null;
    } catch (err) { state = null; }
    const previewObj = preview || {};
    const stateObj = state || {};
    return {
      version,
      apiPresent: !!api,
      missingMethods,
      missingPreviewFields: previewFields.filter((name) => !(name in previewObj)),
      missingStateFields: stateFields.filter((name) => !(name in stateObj)),
      preview: {
        pageIndex: previewObj.pageIndex, pageCount: previewObj.pageCount,
        pageName: previewObj.pageName,
        pages: Array.isArray(previewObj.pages) ? previewObj.pages.length : null,
        groups: Array.isArray(previewObj.groups) ? previewObj.groups.length : null,
        canUndo: previewObj.canUndo, canRedo: previewObj.canRedo,
      },
      statePageFields: {
        pageIndex: stateObj.pageIndex, pageCount: stateObj.pageCount,
        pages: Array.isArray(stateObj.pages) ? stateObj.pages.length : null,
        groups: Array.isArray(stateObj.groups) ? stateObj.groups.length : null,
      },
    };
  }, [V12_METHODS, V12_PREVIEW_FIELDS, V12_STATE_FIELDS]);
}

/** 场景启动守卫：检查 v1.2 契约；不可用时记录失败断言并返回 false */
export async function ensureV12(ctx, page, label = 'v1.2 契约') {
  const probe = await probeV12(page);
  ctx.evidence.v12Probe = probe;
  ctx.check(`${label}：应用版本 >= 1.2（当前 ${probe.version || 'unknown'}）`,
    /^1\.[2-9]|^[2-9]\./.test(String(probe.version || '')), probe.version);
  ctx.check(`${label}：API 方法齐全`, probe.missingMethods.length === 0, probe.missingMethods);
  ctx.check(`${label}：getPreviewInfo 含 pages/groups/canUndo/canRedo/pageIndex/pageCount/pageName`,
    probe.missingPreviewFields.length === 0, probe.missingPreviewFields);
  ctx.check(`${label}：getState 含 pages/pageIndex/groups/canUndo/canRedo`,
    probe.missingStateFields.length === 0, probe.missingStateFields);
  ctx.note('v1.2 契约探测（信息，非问题）', JSON.stringify(probe));
  return probe.missingMethods.length === 0
    && probe.missingPreviewFields.length === 0 && probe.missingStateFields.length === 0;
}

/* ---------------- 多页 API / UI ---------------- */

export async function getPages(page) { return page.evaluate(() => window.__FIGPLAY__.getPages()); }
export async function setPage(page, index) {
  return page.evaluate((i) => window.__FIGPLAY__.setPage(i), index);
}
export async function addPage(page, mode = 'new') {
  return page.evaluate((m) => window.__FIGPLAY__.addPage(m), mode);
}
export async function duplicatePage(page) {
  return page.evaluate(() => window.__FIGPLAY__.duplicatePage());
}
export async function deletePage(page, index) {
  return page.evaluate((i) => window.__FIGPLAY__.deletePage(i), index);
}
export async function renamePage(page, index, name) {
  return page.evaluate(([i, n]) => window.__FIGPLAY__.renamePage(i, n), [index, name]);
}
export async function waitPageState(page, predicate, arg, options = {}) {
  const { timeout = 8000, label = 'page state' } = options;
  await waitFor(page, predicate, arg, { timeout, label });
}

/** 页签 DOM：数量/名称/active/操作按钮禁用状态 */
export async function getPageTabs(page) {
  return page.evaluate(() => ({
    count: document.querySelectorAll('#page-tabs .page-tab').length,
    tabs: Array.from(document.querySelectorAll('#page-tabs .page-tab')).map((tab) => ({
      index: Number(tab.dataset.index),
      text: (tab.textContent || '').trim(),
      active: tab.classList.contains('is-active'),
      title: tab.title,
    })),
    addDisabled: !!(document.getElementById('btn-page-add') || {}).disabled,
    dupDisabled: !!(document.getElementById('btn-page-dup') || {}).disabled,
    delDisabled: !!(document.getElementById('btn-page-del') || {}).disabled,
    pageBarRect: (() => {
      const bar = document.querySelector('.page-bar');
      if (!bar) return null;
      const box = bar.getBoundingClientRect();
      return { w: Math.round(box.width), h: Math.round(box.height) };
    })(),
  }));
}

/** 点击页签并等待切换到该页 */
export async function clickPageTab(page, index) {
  await page.locator(`#page-tabs .page-tab[data-index="${index}"]`).click();
  await waitFor(page, (i) => window.__FIGPLAY__.getPreviewInfo().pageIndex === i, index,
    { label: `page tab click ${index}` });
}
export async function clickPageAction(page, action) {
  const map = { add: '#btn-page-add', dup: '#btn-page-dup', del: '#btn-page-del' };
  await page.locator(map[action]).click();
}

/* ---------------- 撤销 / 重做 ---------------- */

export async function getHistoryState(page) { return page.evaluate(() => window.__FIGPLAY__.getHistoryState()); }
export async function undo(page) { return page.evaluate(() => window.__FIGPLAY__.undo()); }
export async function redo(page) { return page.evaluate(() => window.__FIGPLAY__.redo()); }
/** 等待历史合并窗口（scheduleHistory 500ms）提交 */
export async function waitHistoryCommit(page, options = {}) {
  const { waitMs = 700 } = options;
  await page.waitForTimeout(waitMs);
}

/* ---------------- 分组 ---------------- */

export async function getGroups(page) { return page.evaluate(() => window.__FIGPLAY__.getGroups()); }
export async function createGroup(page, options = {}) {
  return page.evaluate((opts) => window.__FIGPLAY__.createGroup(opts), options);
}
export async function updateGroup(page, id, options = {}) {
  return page.evaluate(([groupId, opts]) => window.__FIGPLAY__.updateGroup(groupId, opts), [id, options]);
}
export async function deleteGroupApi(page, id) {
  return page.evaluate((groupId) => window.__FIGPLAY__.deleteGroup(groupId), id);
}
export async function selectGroupApi(page, id) {
  return page.evaluate((groupId) => window.__FIGPLAY__.selectGroup(groupId), id);
}
export async function openGroupDialogUi(page) {
  await page.locator('#btn-group-create').click();
  await waitForDialog(page, '#group-dialog', { label: 'group-dialog' });
}
export async function getGroupDialogState(page) {
  return page.evaluate(() => {
    const dialog = document.getElementById('group-dialog');
    const valueOf = (id) => {
      const node = document.getElementById(id);
      return node ? (node.type === 'checkbox' ? node.checked : node.value) : null;
    };
    const text = (id) => {
      const node = document.getElementById(id);
      return node ? (node.textContent || '').trim() : null;
    };
    return {
      open: !!dialog && dialog.open === true,
      name: valueOf('group-name'),
      scheme: valueOf('group-scheme'),
      start: valueOf('group-start'),
      preview: text('group-preview'),
      title: text('group-dialog-title'),
    };
  });
}
export async function setGroupForm(page, { name, scheme, start }) {
  if (name !== undefined) {
    await page.locator('#group-name').evaluate((node, value) => {
      node.value = String(value);
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }, name);
  }
  if (scheme !== undefined) await setSelect(page, '#group-scheme', scheme);
  if (start !== undefined) await setNumberInput(page, '#group-start', start);
}
export async function saveGroupUi(page) {
  await page.locator('#group-save').click();
  await waitForDialog(page, '#group-dialog', { open: false, label: 'group-dialog close' });
}
export async function getGroupListUi(page) {
  return page.evaluate(() => ({
    count: document.querySelectorAll('#group-list .group-chip').length,
    countText: (document.getElementById('group-count') || {}).textContent || '',
    chips: Array.from(document.querySelectorAll('#group-list .group-chip')).map((chip) => ({
      text: (chip.textContent || '').trim(),
      name: (chip.querySelector('.group-name-label') || {}).textContent || '',
      count: (chip.querySelector('.group-count-label') || {}).textContent || '',
    })),
    outlineCount: document.querySelectorAll('#preview-svg .group-outline').length,
    nameCount: document.querySelectorAll('#preview-svg .group-name').length,
  }));
}
/** 通过分组卡片删除按钮（调用方需自行处理 window.confirm 对话框） */
export async function clickGroupChipButton(page, groupName, buttonText) {
  const chip = page.locator('#group-list .group-chip', { hasText: groupName }).first();
  await chip.locator('button', { hasText: buttonText }).first().click();
}

/* ---------------- 多页导出 ---------------- */

export async function setExportScopeApi(page, scope) {
  return page.evaluate((value) => window.__FIGPLAY__.setExportScope(value), scope);
}
export async function clickExportScope(page, scope) {
  await page.locator(`#export-scope-seg [data-scope="${scope}"]`).click();
  await waitFor(page, (value) => {
    const active = document.querySelector('#export-scope-seg .is-active');
    return !!active && active.dataset.scope === value;
  }, scope, { label: `export scope ${scope}` });
}
export async function getExportScopeState(page) {
  return page.evaluate(() => {
    const row = document.getElementById('export-scope-row');
    const note = document.getElementById('export-scope-note');
    const active = document.querySelector('#export-scope-seg .is-active');
    const rect = row ? row.getBoundingClientRect() : null;
    return {
      rowHidden: row ? !!row.hidden : null,
      rowVisible: !!rect && rect.width > 0 && rect.height > 0,
      activeScope: active ? active.dataset.scope : null,
      noteHidden: note ? !!note.hidden : null,
      noteText: note ? (note.textContent || '').trim() : null,
    };
  });
}
export async function getExportState(page) {
  const state = await api.getState(page);
  return state && state.export ? state.export : null;
}

/** 多页导出（API，返回 base64/pageResults）并保存到 dir；返回带 path/size 的结果 */
export async function saveAllPagesExport(page, format, overrides, dir) {
  const result = await page.evaluate(([fmt, opts]) =>
    window.__FIGPLAY__.exportBase64(fmt, Object.assign({}, opts || {}, { allPages: true })),
    [format, overrides || null]);
  if (!result || typeof result.base64 !== 'string') {
    throw new Error(`exportBase64(${format}, allPages) 返回异常: ${JSON.stringify(Object.keys(result || {}))}`);
  }
  await ensureDir(dir);
  const filename = result.filename || `${format}-pages`;
  const filePath = path.join(dir, filename);
  const bytes = Buffer.from(result.base64, 'base64');
  await fsp.writeFile(filePath, bytes);
  const { base64, ...meta } = result;
  return { ...meta, base64Length: base64.length, path: filePath, size: bytes.length };
}

/* ---------------- MATLAB .fig ---------------- */

/** 生成一个可被 #file-input 接受的伪 .fig 文件（内容仅用于前端桥 mock） */
export async function createFakeFigFile(dir, name = 'mock-figure.fig') {
  await ensureDir(dir);
  const filePath = path.join(dir, name);
  const header = Buffer.from('MATLAB 5.0 MAT-file, Platform: PCWIN64, Created by: FigurePlay E2E mock');
  const body = Buffer.alloc(2048, 0x20);
  await fsp.writeFile(filePath, Buffer.concat([header, body]));
  return filePath;
}

/** 通过 #file-input 上传 .fig（先 setUploadTarget 可指定目标面板） */
export async function uploadFigFile(page, figPath, target) {
  if (target !== undefined) await api.setUploadTarget(page, target);
  await page.locator('#file-input').setInputFiles([figPath]);
}

/** 等待 .fig 转换结果填入指定面板（cell.name 应以 .png 结尾） */
export async function waitFigCell(page, index, options = {}) {
  const { timeout = 15000, expectedWidth, expectedHeight } = options;
  await waitFor(page, ([i, width, height]) => {
    const state = window.__FIGPLAY__.getState();
    const cell = state.cells[i];
    if (!cell) return false;
    if (!/\.png$/i.test(cell.name)) return false;
    if (width != null && cell.width !== width) return false;
    if (height != null && cell.height !== height) return false;
    return true;
  }, [index, expectedWidth, expectedHeight], { timeout, label: 'fig cell imported' });
  const state = await api.getState(page);
  return state.cells[index];
}

/** 等待新的 import-fig 请求并返回消息（figRequestCount 为点击上传前的 import-fig 消息数） */
export async function waitFigImportRequest(page, minCount, options = {}) {
  return waitNewBridgeMessage(page, 'import-fig', minCount, {
    timeout: options.timeout || 10000,
    label: options.label || 'import-fig request',
  });
}

/** 模拟桌面 host 返回 .fig 转换结果 */
export async function respondFigImported(page, request, options = {}) {
  const {
    dataUrl, width = 1200, height = 900, ok = true, error,
    sourceFormat = 'MATLAB-FIG', convertMs = 1200, matlabVersion = 'R2023b',
    emfBase64 = '',
  } = options;
  const payload = { type: 'fig-imported', requestId: request && request.requestId, ok };
  if (ok) {
    payload.dataUrl = dataUrl;
    payload.width = width;
    payload.height = height;
    payload.sourceFormat = sourceFormat;
    payload.convertMs = convertMs;
    payload.matlabVersion = matlabVersion;
    if (emfBase64) payload.emfBase64 = emfBase64;
  } else {
    payload.error = error || 'MATLAB .fig 转换失败（mock）';
  }
  await sendBridgeMessage(page, payload);
}

/* ---------------- 分组编号期望复算（v1.2 语义） ---------------- */

/** 与 js/layout.js computeLabels(v1.2 分组版) 一致，返回 [{cellIndex,text,groupId}] */
export function expectedLabelsV12(state) {
  const label = state.label || {};
  if (!label.show) return [];
  const { panels } = computePanelsMm(state.layout);
  const order = label.order === 'col' ? 'col' : 'row';
  const ordered = panels.slice().sort((a, b) => {
    if (order === 'col') return (a.col - b.col) || (a.row - b.row);
    return (a.row - b.row) || (a.col - b.col);
  });
  const skipEmpty = !!label.skipEmpty;
  const groups = Array.isArray(state.groups) ? state.groups : [];
  const panelGroup = new Map();
  for (const group of groups) {
    for (const index of group.panels || []) {
      if (!panelGroup.has(index)) panelGroup.set(index, group);
    }
  }
  const groupCounters = new Map();
  let globalCounter = 0;
  const labels = [];
  for (const panel of ordered) {
    const cell = state.cells[panel.index];
    if (!cell && skipEmpty) continue;
    const group = panelGroup.get(panel.index) || null;
    let counter;
    let scheme;
    let start;
    if (group) {
      counter = (groupCounters.get(group.id) || 0) + 1;
      groupCounters.set(group.id, counter);
      scheme = group.scheme || label.scheme;
      start = Math.max(1, Number(group.start) || 1);
    } else {
      counter = ++globalCounter;
      scheme = label.scheme;
      start = Math.max(1, Number(label.start) || 1);
    }
    let text = formatLabel(scheme, start + counter - 1);
    const custom = cell && String(cell.customLabel || '').trim();
    if (custom) text = custom;
    labels.push({ cellIndex: panel.index, text, groupId: group ? group.id : null });
  }
  return labels;
}

/* ==========================================================================
 * v1.3 新增：网格自定义 / 导出保存位置 / 自动页距 / PDF 裁剪 / 滑块数字输入 / EMF 矢量 PDF
 * ========================================================================== */

export const V13_METHODS = [
  'setExportOptions', 'setLayoutOptions', 'setLabelConfig',
  'getPadInfo', 'getLabelBoxes', 'getCropBox', 'getVectorStatus', 'exportVectorPdfBase64',
];
export const V13_EXPORT_FIELDS = ['saveAs', 'vectorPdf', 'trimPdf', 'trimMarginMm'];
export const V13_LAYOUT_FIELDS = ['autoPad', 'padTopMm', 'padRightMm', 'padBottomMm', 'padLeftMm'];
export const V13_NUMBER_INPUTS = [
  'cell-zoom-num', 'jpg-quality-num', 'label-bg-opacity-num',
];

/** 探测 v1.3 契约（不抛异常） */
export async function probeV13(page) {
  return page.evaluate(([methods, exportFields, layoutFields, numInputs]) => {
    const api = window.__FIGPLAY__;
    const version = api ? api.version || null : null;
    const missingMethods = methods.filter((name) => !api || typeof api[name] !== 'function');
    let state = null;
    try { state = api && typeof api.getState === 'function' ? api.getState() : null; } catch (err) { state = null; }
    const layout = (state && state.layout) || {};
    const exp = (state && state.export) || {};
    const visible = (id) => {
      const node = document.getElementById(id);
      return !!node && !node.hidden && node.getClientRects().length > 0;
    };
    const inputInfo = (id) => {
      const node = document.getElementById(id);
      if (!node) return null;
      const rangeId = id.replace(/-num$/, '');
      const range = document.getElementById(rangeId);
      return {
        present: true, min: node.min, max: node.max, step: node.step, value: node.value,
        rangePresent: !!range, rangeValue: range ? range.value : null,
      };
    };
    return {
      version,
      apiPresent: !!api,
      missingMethods,
      missingExportFields: exportFields.filter((name) => !(name in exp)),
      missingLayoutFields: layoutFields.filter((name) => !(name in layout)),
      exportValues: {
        saveAs: exp.saveAs, vectorPdf: exp.vectorPdf,
        trimPdf: exp.trimPdf, trimMarginMm: exp.trimMarginMm,
      },
      layoutValues: {
        autoPad: layout.autoPad, padTopMm: layout.padTopMm, padRightMm: layout.padRightMm,
        padBottomMm: layout.padBottomMm, padLeftMm: layout.padLeftMm,
      },
      ui: {
        rowsInput: (() => {
          const n = document.getElementById('rows-input');
          return n ? { max: n.max, min: n.min, value: n.value } : null;
        })(),
        colsInput: (() => {
          const n = document.getElementById('cols-input');
          return n ? { max: n.max, min: n.min, value: n.value } : null;
        })(),
        saveAsRow: visible('save-as-row'),
        saveAsChecked: !!(document.getElementById('save-as-toggle') || {}).checked,
        pdfTrimRowExists: !!document.getElementById('pdf-trim-row'),
        pdfTrimToggleExists: !!document.getElementById('pdf-trim-toggle'),
        pdfTrimMarginExists: !!document.getElementById('pdf-trim-margin'),
        vectorPdfRowExists: !!document.getElementById('vector-pdf-row'),
        autoPadToggleChecked: !!(document.getElementById('auto-pad-toggle') || {}).checked,
        padManualHidden: !!(document.getElementById('pad-manual') || {}).hidden,
        numberInputs: numInputs.map(inputInfo),
      },
    };
  }, [V13_METHODS, V13_EXPORT_FIELDS, V13_LAYOUT_FIELDS, V13_NUMBER_INPUTS]);
}

/** 场景启动守卫：检查 v1.3 契约；不可用时记录失败断言并返回 false */
export async function ensureV13(ctx, page, label = 'v1.3 契约') {
  const probe = await probeV13(page);
  ctx.evidence.v13Probe = probe;
  ctx.check(`${label}：应用版本 >= 1.3（当前 ${probe.version || 'unknown'}）`,
    /^1\.(?:[3-9]|[1-9]\d)|^[2-9]\./.test(String(probe.version || '')), probe.version);
  ctx.check(`${label}：API 方法齐全（${V13_METHODS.join('/')}）`,
    probe.missingMethods.length === 0, probe.missingMethods);
  ctx.check(`${label}：state.export 含 saveAs/vectorPdf/trimPdf/trimMarginMm`,
    probe.missingExportFields.length === 0, probe.missingExportFields);
  ctx.check(`${label}：state.layout 含 autoPad/padTopMm/padRightMm/padBottomMm/padLeftMm`,
    probe.missingLayoutFields.length === 0, probe.missingLayoutFields);
  ctx.check(`${label}：行/列输入 max=500`,
    !!probe.ui.rowsInput && probe.ui.rowsInput.max === '500'
      && !!probe.ui.colsInput && probe.ui.colsInput.max === '500',
    probe.ui.rowsInput && { rowsMax: probe.ui.rowsInput.max, colsMax: probe.ui.colsInput && probe.ui.colsInput.max });
  ctx.check(`${label}：保存位置行默认勾选`,
    probe.ui.saveAsRow === true && probe.ui.saveAsChecked === true && probe.exportValues.saveAs !== false,
    { rowVisible: probe.ui.saveAsRow, checked: probe.ui.saveAsChecked, saveAs: probe.exportValues.saveAs });
  ctx.check(`${label}：PDF 裁剪/矢量 PDF 控件存在`,
    probe.ui.pdfTrimRowExists && probe.ui.pdfTrimToggleExists && probe.ui.pdfTrimMarginExists
      && probe.ui.vectorPdfRowExists,
    { trimRow: probe.ui.pdfTrimRowExists, trimToggle: probe.ui.pdfTrimToggleExists,
      trimMargin: probe.ui.pdfTrimMarginExists, vectorRow: probe.ui.vectorPdfRowExists });
  ctx.check(`${label}：滑块数字输入存在（cell-zoom-num/jpg-quality-num/label-bg-opacity-num）`,
    probe.ui.numberInputs.every((item) => item && item.present),
    probe.ui.numberInputs);
  ctx.note('v1.3 契约探测（信息，非问题）', JSON.stringify(probe));
  return probe.missingMethods.length === 0
    && probe.missingExportFields.length === 0 && probe.missingLayoutFields.length === 0;
}

/* ---------------- 网格 ---------------- */

export async function getGridUiState(page) {
  return page.evaluate(() => {
    const val = (id) => (document.getElementById(id) || {}).value;
    const attr = (id, name) => (document.getElementById(id) || {}).getAttribute(name);
    const text = (id) => {
      const node = document.getElementById(id);
      return node ? (node.textContent || '').trim() : null;
    };
    const hidden = (id) => {
      const node = document.getElementById(id);
      return !node || node.hidden || node.getClientRects().length === 0;
    };
    const api = window.__FIGPLAY__;
    const state = api.getState();
    const preview = api.getPreviewInfo();
    return {
      rowsInput: val('rows-input'), colsInput: val('cols-input'),
      rowsMin: attr('rows-input', 'min'), rowsMax: attr('rows-input', 'max'),
      colsMin: attr('cols-input', 'min'), colsMax: attr('cols-input', 'max'),
      colGapInput: val('col-gap'), rowGapInput: val('row-gap'),
      colGapMin: attr('col-gap', 'min'), colGapMax: attr('col-gap', 'max'),
      rowGapMin: attr('row-gap', 'min'), rowGapMax: attr('row-gap', 'max'),
      layout: {
        rows: state.layout.rows, cols: state.layout.cols,
        margin: state.layout.margin, autoPad: state.layout.autoPad,
        colGap: state.layout.colGap, rowGap: state.layout.rowGap,
      },
      geom: preview.geom,
      gridCellCount: preview.gridCellCount,
      matrixCaption: text('matrix-caption'),
      layoutBadge: text('layout-badge'),
      padReadout: text('pad-readout'),
      padManualHidden: hidden('pad-manual'),
      autoPadChecked: !!(document.getElementById('auto-pad-toggle') || {}).checked,
      stage: (() => {
        const node = document.getElementById('stage');
        if (!node) return null;
        const box = node.getBoundingClientRect();
        return { visible: box.width > 0 && box.height > 0, w: Math.round(box.width), h: Math.round(box.height) };
      })(),
    };
  });
}

/** 100×100 超限拒绝时读取 toast 并等待渲染稳定 */
export async function waitToastContains(page, pattern, options = {}) {
  const { timeout = 5000, label = 'toast' } = options;
  await waitFor(page, (src) => {
    const node = document.getElementById('toast');
    if (!node || node.hidden) return false;
    const text = (node.textContent || '').trim();
    return text.length > 0 && new RegExp(src).test(text);
  }, pattern, { timeout, label });
}

export async function getToast(page) {
  return page.evaluate(() => {
    const node = document.getElementById('toast');
    return {
      visible: !!node && !node.hidden && node.getClientRects().length > 0,
      text: node ? (node.textContent || '').trim() : null,
    };
  });
}

/* ---------------- 导出选项 / 保存位置 ---------------- */

export async function setExportOptions(page, options) {
  return page.evaluate((opts) => window.__FIGPLAY__.setExportOptions(opts), options || {});
}
export async function setLayoutOptions(page, options) {
  return page.evaluate((opts) => window.__FIGPLAY__.setLayoutOptions(opts), options || {});
}
export async function setLabelConfig(page, patch) {
  return page.evaluate((value) => window.__FIGPLAY__.setLabelConfig(value), patch || {});
}

/** 导出相关状态 + UI（保存位置行/PDF 裁剪行/矢量 PDF 行/数字框） */
export async function getExportUiState(page) {
  return page.evaluate(() => {
    const api = window.__FIGPLAY__;
    const state = api.getState();
    const preview = api.getPreviewInfo();
    const visible = (id) => {
      const node = document.getElementById(id);
      return !!node && !node.hidden && node.getClientRects().length > 0;
    };
    const val = (id) => {
      const node = document.getElementById(id);
      return node ? node.value : null;
    };
    const num = (id) => {
      const node = document.getElementById(id);
      return node ? { value: node.value, min: node.min, max: node.max, step: node.step } : null;
    };
    return {
      exportOptions: {
        saveAs: state.export.saveAs,
        vectorPdf: state.export.vectorPdf,
        trimPdf: state.export.trimPdf,
        trimMarginMm: state.export.trimMarginMm,
        format: state.export.format,
        scope: state.export.scope,
        dpi: state.export.dpi,
        jpgQuality: state.export.jpgQuality,
        filename: state.export.filename,
      },
      geom: preview.geom,
      ui: {
        saveAsRowVisible: visible('save-as-row'),
        saveAsChecked: !!(document.getElementById('save-as-toggle') || {}).checked,
        pdfTrimRowVisible: visible('pdf-trim-row'),
        pdfTrimChecked: !!(document.getElementById('pdf-trim-toggle') || {}).checked,
        pdfTrimMarginRowVisible: visible('pdf-trim-margin-row'),
        pdfTrimMargin: num('pdf-trim-margin'),
        pdfTrimSafetyHintVisible: visible('pdf-trim-safety-hint'),
        pdfTrimSafetyHint: ((document.getElementById('pdf-trim-safety-hint') || {}).textContent || '').trim(),
        vectorPdfRowVisible: visible('vector-pdf-row'),
        vectorPdfChecked: !!(document.getElementById('vector-pdf-toggle') || {}).checked,
        vectorPdfDisabled: !!(document.getElementById('vector-pdf-toggle') || {}).disabled,
        exportNote: ((document.getElementById('export-note') || {}).textContent || '').trim(),
        exportReadout: ((document.getElementById('export-readout') || {}).textContent || '').trim(),
        statusText: ((document.getElementById('status-text') || {}).textContent || '').trim(),
      },
    };
  });
}

/* ---------------- 自动页距 / 标号盒 ---------------- */

export async function getPadInfo(page) {
  return page.evaluate(() => window.__FIGPLAY__.getPadInfo());
}
export async function getLabelBoxes(page) {
  return page.evaluate(() => window.__FIGPLAY__.getLabelBoxes());
}
export async function getCropBox(page, marginMm) {
  return page.evaluate((m) => window.__FIGPLAY__.getCropBox(m), marginMm);
}
export async function getGeom(page) {
  return page.evaluate(() => window.__FIGPLAY__.getPreviewInfo().geom);
}
export async function getVectorStatus(page) {
  return page.evaluate(() => window.__FIGPLAY__.getVectorStatus());
}

/* ---------------- 滑块数字输入 ---------------- */

export async function getNumberInputsState(page) {
  return page.evaluate(() => {
    const ids = ['cell-zoom', 'cell-zoom-num', 'jpg-quality', 'jpg-quality-num',
      'label-bg-opacity', 'label-bg-opacity-num'];
    const out = {};
    for (const id of ids) {
      const node = document.getElementById(id);
      out[id] = node ? {
        value: node.value, min: node.min, max: node.max, step: node.step,
      } : null;
    }
    const state = window.__FIGPLAY__.getState();
    return {
      inputs: out,
      state: {
        selectedCell: state.selectedCell,
        selectedZoom: state.selectedCell != null && state.cells[state.selectedCell]
          ? state.cells[state.selectedCell].zoom : null,
        jpgQuality: state.export.jpgQuality,
        bgOpacity: state.label.bgOpacity,
        labelBg: state.label.bg,
      },
    };
  });
}

/* ---------------- fake showSaveFilePicker ---------------- */

/**
 * 注入 fake File System Access API。
 * mode:
 *  - 'handle'：showSaveFilePicker 返回 handle，createWritable().write(blob) 记录写入内容头
 *  - 'abort'：抛 AbortError（验证无头环境自动回退下载）
 *  - 'remove'：删除 window.showSaveFilePicker（验证无 picker 时直接下载）
 */
export async function installFakeSavePicker(page, options = {}) {
  const { mode = 'handle', throwName = 'AbortError' } = options;
  await page.evaluate(({ mode: fakeMode, throwName: fakeThrow }) => {
    window.__fakeSave = { mode: fakeMode, calls: [], writes: [], closes: 0, pickerInvocations: 0 };
    const recordCall = (opts) => {
      window.__fakeSave.pickerInvocations += 1;
      window.__fakeSave.calls.push({
        suggestedName: opts && opts.suggestedName,
        types: opts && opts.types,
      });
    };
    if (fakeMode === 'remove') {
      try { delete window.showSaveFilePicker; } catch (err) { window.showSaveFilePicker = undefined; }
      return;
    }
    if (fakeMode === 'abort') {
      window.showSaveFilePicker = async function (opts) {
        recordCall(opts);
        throw new DOMException('The user aborted a request.', fakeThrow);
      };
      return;
    }
    window.showSaveFilePicker = async function (opts) {
      recordCall(opts);
      const filename = (opts && opts.suggestedName) || 'fake-export.bin';
      return {
        name: filename,
        createWritable: async function () {
          return {
            write: async function (blob) {
              const buffer = await blob.arrayBuffer();
              const head = Array.from(new Uint8Array(buffer.slice(0, 8)));
              window.__fakeSave.writes.push({
                size: blob.size, type: blob.type, bytes: buffer.byteLength, head,
              });
            },
            close: async function () { window.__fakeSave.closes += 1; },
            abort: async function () {},
          };
        },
      };
    };
  }, { mode, throwName });
}

export async function getFakeSaveState(page) {
  return page.evaluate(() => ({
    hasPicker: typeof window.showSaveFilePicker === 'function',
    fake: window.__fakeSave || null,
  }));
}

export async function waitFakeSave(page, predicate, arg, options = {}) {
  const { timeout = 20000, label = 'fake save picker' } = options;
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const state = await getFakeSaveState(page);
    if (state.fake) {
      try {
        if (predicate(state.fake, arg)) return state.fake;
      } catch (err) { /* ignore */ }
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`等待超时（${label}, ${timeout}ms）`);
}

/** 等待 fake picker 完成写入（writes 数量） */
export async function waitFakeSaveWrites(page, count, options = {}) {
  await waitFor(page, (expected) => {
    const fake = window.__fakeSave;
    return !!fake && fake.writes.length >= expected;
  }, count, { timeout: options.timeout || 30000, label: options.label || `fake save writes>=${count}` });
}

/* ---------------- EMF 矢量 PDF（桌面桥 mock） ---------------- */

export async function waitVectorExportRequest(page, minCount, options = {}) {
  return waitNewBridgeMessage(page, 'export-vector-pdf', minCount, {
    timeout: options.timeout || 15000,
    label: options.label || 'export-vector-pdf request',
  });
}

export async function respondVectorPdf(page, request, options = {}) {
  const {
    ok = true, base64, bytes, engine = 'PowerPoint',
    vectorPanels = 1, rasterPanels = 0, error,
  } = options;
  const payload = {
    type: 'vector-pdf-export',
    requestId: request && request.requestId,
    ok,
  };
  if (ok) {
    payload.base64 = base64;
    payload.bytes = bytes || Math.round(String(base64 || '').length * 0.75);
    payload.engine = engine;
    payload.vectorPanels = vectorPanels;
    payload.rasterPanels = rasterPanels;
  } else {
    payload.error = error || 'mock 矢量 PDF 生成失败';
  }
  await sendBridgeMessage(page, payload);
}

/** 关闭 fake picker / 还原环境 */
export async function restoreSavePicker(page) {
  await page.evaluate(() => {
    try { delete window.showSaveFilePicker; } catch (err) { window.showSaveFilePicker = undefined; }
    window.__fakeSave = null;
  });
}

/* ==========================================================================
 * v1.3.1 新增：按实际墨迹裁剪 PDF 白边（getInkCropBox）
 * ========================================================================== */

export const V131_METHODS = ['getInkCropBox'];

export async function probeV131(page) {
  return page.evaluate((methods) => {
    const api = window.__FIGPLAY__;
    const version = api ? api.version || null : null;
    return {
      version,
      apiPresent: !!api,
      missingMethods: methods.filter((name) => !api || typeof api[name] !== 'function'),
      hasGetCropBox: !!(api && typeof api.getCropBox === 'function'),
      hasInkApi: !!(api && typeof api.getInkCropBox === 'function'),
    };
  }, V131_METHODS);
}

/** 场景启动守卫：v1.3.1 墨迹裁剪契约（getInkCropBox 为 async API） */
export async function ensureV131(ctx, page, label = 'v1.3.1 ink 契约') {
  const probe = await probeV131(page);
  ctx.evidence.v131Probe = probe;
  ctx.check(`${label}：应用版本 >= 1.3.1（当前 ${probe.version || 'unknown'}）`,
    /^1\.(?:3\.[1-9]|[4-9]\.|[1-9]\d)|^[2-9]\./.test(String(probe.version || '')), probe.version);
  ctx.check(`${label}：getInkCropBox 可用（async ink bbox）`,
    probe.missingMethods.length === 0, probe.missingMethods);
  ctx.check(`${label}：getCropBox 保留（内容盒对照）`, probe.hasGetCropBox === true);
  ctx.note('v1.3.1 墨迹裁剪契约探测（信息，非问题）', JSON.stringify(probe));
  return probe.missingMethods.length === 0 && probe.hasGetCropBox === true;
}

/** 按实际墨迹检测 PDF 裁剪框（前端 96dpi 探针渲染 + 像素扫描），返回 {xMm,yMm,wMm,hMm,marginMm,inkPx,pagePx} */
export async function getInkCropBox(page, marginMm) {
  return page.evaluate(async (margin) => window.__FIGPLAY__.getInkCropBox(margin), marginMm);
}

/* ==========================================================================
 * v1.3.2 新增：编号防裁安全边距（trim 0→1mm）+ 负间距（-50～80mm）
 * ========================================================================== */

export const V132_METHODS = ['getInkCropBox', 'setLayoutOptions'];

/** 探测 v1.3.2 契约：版本、ink crop 安全边距、负间距 UI、trim 安全提示 */
export async function probeV132(page) {
  return page.evaluate(async (methods) => {
    const api = window.__FIGPLAY__;
    const version = api ? api.version || null : null;
    const result = {
      version,
      apiPresent: !!api,
      missingMethods: methods.filter((name) => !api || typeof api[name] !== 'function'),
      inkMargin0: null,
      inkError: null,
      gapInputs: {},
      safetyHintExists: !!document.getElementById('pdf-trim-safety-hint'),
    };
    try {
      const ink = await api.getInkCropBox(0);
      result.inkMargin0 = ink ? ink.marginMm : null;
      result.inkBox0 = ink ? { xMm: ink.xMm, yMm: ink.yMm, wMm: ink.wMm, hMm: ink.hMm } : null;
    } catch (err) {
      result.inkError = String(err && err.message ? err.message : err);
    }
    for (const [key, id] of [['colGap', 'col-gap'], ['rowGap', 'row-gap']]) {
      const node = document.getElementById(id);
      result.gapInputs[key] = node ? { min: node.min, max: node.max, value: node.value } : null;
    }
    return result;
  }, V132_METHODS);
}

/** 场景启动守卫：v1.3.2 安全边距 + 负间距契约 */
export async function ensureV132(ctx, page, label = 'v1.3.2 契约') {
  const probe = await probeV132(page);
  ctx.evidence.v132Probe = probe;
  ctx.check(`${label}：应用版本 >= 1.3.2（当前 ${probe.version || 'unknown'}）`,
    /^1\.(?:3\.[2-9]|[4-9]\.|[1-9]\d)|^[2-9]\./.test(String(probe.version || '')), probe.version);
  ctx.check(`${label}：getInkCropBox(0) 可调用（空页返回整页几何；有内容时 marginMm=1 由 S 场景验证）`,
    probe.missingMethods.indexOf('getInkCropBox') < 0 && !probe.inkError && !!probe.inkBox0,
    { inkMargin0: probe.inkMargin0, inkBox0: probe.inkBox0, inkError: probe.inkError });
  ctx.check(`${label}：行/列间距输入 min=-50 max=80`,
    !!probe.gapInputs.colGap && probe.gapInputs.colGap.min === '-50'
      && probe.gapInputs.colGap.max === '80'
      && !!probe.gapInputs.rowGap && probe.gapInputs.rowGap.min === '-50'
      && probe.gapInputs.rowGap.max === '80',
    probe.gapInputs);
  ctx.check(`${label}：trim 安全边距提示元素存在（#pdf-trim-safety-hint）`,
    probe.safetyHintExists === true);
  ctx.note('v1.3.2 安全边距/负间距契约探测（信息，非问题）', JSON.stringify(probe));
  return probe.missingMethods.length === 0 && !probe.inkError
    && probe.safetyHintExists === true;
}

/* ==========================================================================
 * v1.3.3 新增：交互描边顶层 overlay（负间距重叠下选中/悬停不被遮挡）
 * ========================================================================== */

export const V133_METHODS = ['getInkCropBox'];

/** 读取 #preview-svg 子层顺序与 interaction-overlay-layer 内容 */
export async function getOverlayState(page) {
  return page.evaluate(() => {
    const svg = document.getElementById('preview-svg');
    if (!svg) return null;
    const classesOf = (node) => (node && node.getAttribute) ? (node.getAttribute('class') || '') : '';
    const children = Array.from(svg.children).map((node, i) => ({
      index: i, tag: node.tagName.toLowerCase(), class: classesOf(node),
    }));
    const overlay = svg.querySelector(':scope > .interaction-overlay-layer');
    const outlines = (selector) => Array.from(svg.querySelectorAll(selector)).map((node) => {
      const box = node.getBBox ? node.getBBox() : { x: 0, y: 0, width: 0, height: 0 };
      const style = window.getComputedStyle(node);
      return {
        class: classesOf(node),
        x: Number(node.getAttribute('x')),
        y: Number(node.getAttribute('y')),
        w: Number(node.getAttribute('width')),
        h: Number(node.getAttribute('height')),
        bbox: { x: box.x, y: box.y, w: box.width, h: box.height },
        stroke: node.getAttribute('stroke'),
        computedStroke: style ? style.stroke : null,
        strokeWidth: node.getAttribute('stroke-width'),
        computedStrokeWidth: style ? style.strokeWidth : null,
        strokeDasharray: style ? style.strokeDasharray : null,
        pointerEvents: style ? style.pointerEvents : null,
        inOverlay: !!node.closest('.interaction-overlay-layer'),
      };
    });
    const info = window.__FIGPLAY__.getPreviewInfo();
    return {
      children,
      lastChildClass: classesOf(svg.lastElementChild),
      lastChildIndex: svg.lastElementChild ? children.length - 1 : null,
      overlayIndex: overlay ? children.findIndex((item) => /interaction-overlay-layer/.test(item.class)) : -1,
      overlayPointerEvents: overlay ? window.getComputedStyle(overlay).pointerEvents : null,
      groupsIndex: children.findIndex((item) => /groups-layer/.test(item.class)),
      labelsIndex: children.findIndex((item) => /labels-layer/.test(item.class)),
      cellsIndex: children.findIndex((item) => /cells-layer/.test(item.class)),
      selectionOutlines: outlines('.cell-selection-outline'),
      hoverOutlines: outlines('.cell-hover-outline'),
      cellHits: svg.querySelectorAll('.cell-hit').length,
      selectedCell: info.selectedCell,
      multiSelect: info.multiSelect || [],
      cells: (info.panels || []).map((panel) => ({ index: panel.index, x: panel.x, y: panel.y, w: panel.w, h: panel.h })),
    };
  });
}

/** 计算某个面板/两面板重叠中心在屏幕坐标的位置（用于真实鼠标移动触发 hover） */
export async function getPanelScreenPoint(page, panelIndex, overlapWithIndex) {
  return page.evaluate(([idx, overlapIdx]) => {
    const svg = document.getElementById('preview-svg');
    const info = window.__FIGPLAY__.getPreviewInfo();
    const panels = info.panels || [];
    const panel = panels.find((item) => item.index === idx);
    if (!svg || !panel) return null;
    let px = panel.x + panel.w / 2;
    let py = panel.y + panel.h / 2;
    if (overlapIdx != null) {
      const other = panels.find((item) => item.index === overlapIdx);
      if (other) {
        const x0 = Math.max(panel.x, other.x);
        const y0 = Math.max(panel.y, other.y);
        const x1 = Math.min(panel.x + panel.w, other.x + other.w);
        const y1 = Math.min(panel.y + panel.h, other.y + other.h);
        if (x1 > x0 && y1 > y0) {
          px = (x0 + x1) / 2;
          py = (y0 + y1) / 2;
        }
      }
    }
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = new DOMPoint(px, py).matrixTransform(ctm);
    return { x: point.x, y: point.y, panel: { x: panel.x, y: panel.y, w: panel.w, h: panel.h } };
  }, [panelIndex, overlapWithIndex]);
}

/** 将真实鼠标移到某面板中心/两面板重叠区中心 */
export async function hoverPanel(page, panelIndex, overlapWithIndex) {
  const point = await getPanelScreenPoint(page, panelIndex, overlapWithIndex);
  if (!point) throw new Error(`hoverPanel 找不到屏幕坐标（panel ${panelIndex}）`);
  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(80);
  return point;
}

/** 把鼠标移出预览 SVG（触发 pointerleave → hover outline 消失） */
export async function clearPreviewHover(page) {
  await page.mouse.move(4, 4);
  await page.waitForTimeout(120);
}

/** 按指定顺序等待 overlay 内容变化（Node 侧轮询，避免页面闭包） */
export async function waitOverlayState(page, predicate, arg, options = {}) {
  const { timeout = 6000, label = 'overlay state' } = options;
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const state = await getOverlayState(page);
    try {
      if (state && predicate(state, arg)) return state;
    } catch (err) { /* ignore */ }
    await page.waitForTimeout(80);
  }
  throw new Error(`等待超时（${label}, ${timeout}ms）`);
}

/** 导出 SVG 并返回文本（用于断言交互元素不进入导出） */
export async function exportSvgString(page, overrides, exportDir) {
  const result = await page.evaluate((opts) => window.__FIGPLAY__.exportBase64('svg', opts), overrides || null);
  const text = Buffer.from(String(result.base64 || ''), 'base64').toString('utf8');
  let filePath = null;
  if (exportDir) {
    await ensureDir(exportDir);
    filePath = path.join(exportDir, result.filename || 'export.svg');
    await fsp.writeFile(filePath, Buffer.from(String(result.base64 || ''), 'base64'));
  }
  return {
    filename: result.filename, size: Buffer.byteLength(text, 'utf8'),
    text, path: filePath,
  };
}

/** 探测 v1.3.3 契约：版本 + 交互 overlay 顶层结构 */
export async function probeV133(page) {
  const state = await getOverlayState(page);
  return page.evaluate(([methods, overlayState]) => {
    const api = window.__FIGPLAY__;
    return {
      version: api ? api.version || null : null,
      apiPresent: !!api,
      missingMethods: methods.filter((name) => !api || typeof api[name] !== 'function'),
      lastChildClass: overlayState ? overlayState.lastChildClass : null,
      overlayIndex: overlayState ? overlayState.overlayIndex : null,
      groupsIndex: overlayState ? overlayState.groupsIndex : null,
      labelsIndex: overlayState ? overlayState.labelsIndex : null,
      cellsIndex: overlayState ? overlayState.cellsIndex : null,
      overlayPointerEvents: overlayState ? overlayState.overlayPointerEvents : null,
      children: overlayState ? overlayState.children : null,
    };
  }, [V133_METHODS, state]);
}

/** 场景启动守卫：v1.3.3 交互 overlay 最上层契约 */
export async function ensureV133(ctx, page, label = 'v1.3.3 契约') {
  const probe = await probeV133(page);
  ctx.evidence.v133Probe = probe;
  const childCount = (probe.children || []).length;
  ctx.check(`${label}：应用版本 >= 1.3.3（当前 ${probe.version || 'unknown'}）`,
    /^1\.(?:3\.[3-9]|[4-9]\.|[1-9]\d)|^[2-9]\./.test(String(probe.version || '')), probe.version);
  ctx.check(`${label}：#preview-svg 最后子元素是 .interaction-overlay-layer`,
    /interaction-overlay-layer/.test(String(probe.lastChildClass || ''))
      && probe.overlayIndex === childCount - 1,
    { lastChildClass: probe.lastChildClass, overlayIndex: probe.overlayIndex, childCount });
  ctx.check(`${label}：groups-layer / labels-layer / cells-layer 均在 overlay 之下`,
    probe.cellsIndex >= 0 && probe.groupsIndex >= 0 && probe.labelsIndex >= 0
      && probe.overlayIndex > probe.groupsIndex
      && probe.overlayIndex > probe.labelsIndex
      && probe.overlayIndex > probe.cellsIndex,
    { children: probe.children });
  ctx.check(`${label}：overlay 层 pointer-events=none（不拦截子图交互）`,
    probe.overlayPointerEvents === 'none', probe.overlayPointerEvents);
  ctx.note('v1.3.3 交互 overlay 契约探测（信息，非问题）', JSON.stringify(probe));
  return probe.overlayIndex === childCount - 1 && probe.overlayPointerEvents === 'none';
}

/* ==========================================================================
 * v1.3.4 新增：界面外观（浅色/深色/跟随系统 + 7 主题色）
 * ========================================================================== */

export const V134_MODES = ['light', 'dark', 'system'];
export const V134_ACCENTS = ['blue', 'indigo', 'teal', 'emerald', 'violet', 'rose', 'amber'];
export const V134_ACCENT_HEX = {
  blue: '#2563eb', indigo: '#4f46e5', teal: '#0d9488', emerald: '#059669',
  violet: '#7c3aed', rose: '#e11d48', amber: '#d97706',
};
export const APPEARANCE_MODE_KEY = 'figureplay.themeMode';
export const APPEARANCE_ACCENT_KEY = 'figureplay.accent';

/** 读取外观状态：html data-*、CSS 变量、关键区域计算样式、菜单/主题色、localStorage、预览 DOM 摘要 */
export async function getAppearanceState(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const api = window.__FIGPLAY__;
    const getStyle = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const style = window.getComputedStyle(node);
      return {
        background: style.backgroundColor,
        color: style.color,
        display: style.display,
        visible: node.getClientRects().length > 0,
      };
    };
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return {
        left: Math.round(box.left), top: Math.round(box.top),
        right: Math.round(box.right), bottom: Math.round(box.bottom),
        width: Math.round(box.width), height: Math.round(box.height),
        visible: box.width > 0 && box.height > 0,
      };
    };
    const styleOf = (id) => getStyle('#' + id);
    const modeButtons = Array.from(document.querySelectorAll('#theme-mode-group [data-theme-mode]')).map((btn) => ({
      mode: btn.getAttribute('data-theme-mode'),
      text: (btn.textContent || '').trim(),
      active: btn.classList.contains('is-active'),
      ariaPressed: btn.getAttribute('aria-pressed'),
    }));
    const accentButtons = Array.from(document.querySelectorAll('#accent-group [data-accent]')).map((btn) => ({
      accent: btn.getAttribute('data-accent'),
      label: btn.getAttribute('aria-label'),
      active: btn.classList.contains('is-active'),
      ariaPressed: btn.getAttribute('aria-pressed'),
      inlineBg: btn.style.background,
    }));
    const svg = document.getElementById('preview-svg');
    const svgHtml = svg ? svg.innerHTML : null;
    let hash = 5381;
    if (svgHtml) {
      for (let i = 0; i < svgHtml.length; i++) hash = ((hash << 5) + hash + svgHtml.charCodeAt(i)) | 0;
    }
    let project = null;
    let history = null;
    try {
      const state = api.getState();
      const info = api.getPreviewInfo();
      project = {
        pageCount: state.pageCount,
        pageIndex: state.pageIndex,
        pages: (state.pages || []).map((page) => page.name),
        rows: state.layout.rows,
        cols: state.layout.cols,
        colGap: state.layout.colGap,
        rowGap: state.layout.rowGap,
        filled: (state.cells || []).filter(Boolean).length,
        labels: (info.labels || []).map((label) => label.text).join('|'),
      };
      history = api.getHistoryState ? api.getHistoryState() : null;
    } catch (err) { project = null; }
    const appearanceApi = (api && typeof api.getAppearance === 'function') ? api.getAppearance() : null;
    const popover = document.getElementById('appearance-popover');
    const btn = document.getElementById('btn-appearance');
    return {
      html: {
        theme: root.getAttribute('data-theme'),
        mode: root.getAttribute('data-theme-mode'),
        accent: root.getAttribute('data-accent'),
        colorScheme: window.getComputedStyle(root).colorScheme,
      },
      appearanceApi,
      mediaDark: !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches),
      cssVars: {
        accent: window.getComputedStyle(root).getPropertyValue('--accent').trim(),
        bg: window.getComputedStyle(root).getPropertyValue('--bg').trim(),
        panel: window.getComputedStyle(root).getPropertyValue('--panel').trim(),
        text: window.getComputedStyle(root).getPropertyValue('--text').trim(),
      },
      styles: {
        body: getStyle('body'),
        panel: getStyle('.panel'),
        figureShell: getStyle('#figure-shell'),
        input: styleOf('filename-input'),
        helpDialog: styleOf('help-dialog'),
        topbar: getStyle('.topbar'),
      },
      figureBgFill: (() => {
        const node = document.querySelector('#preview-svg .figure-bg');
        return node ? node.getAttribute('fill') : null;
      })(),
      localStorage: {
        mode: localStorage.getItem('figureplay.themeMode'),
        accent: localStorage.getItem('figureplay.accent'),
        session: localStorage.getItem('figureplay.session.v1') ? 'present' : null,
      },
      popover: {
        hidden: popover ? popover.hidden : null,
        rect: rect('#appearance-popover'),
      },
      button: {
        ariaExpanded: btn ? btn.getAttribute('aria-expanded') : null,
        rect: rect('#btn-appearance'),
        visible: !!rect('#btn-appearance') && rect('#btn-appearance').visible,
      },
      modes: modeButtons,
      accents: accentButtons,
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        bodyScrollWidth: document.body.scrollWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
      },
      preview: {
        hash, length: svgHtml ? svgHtml.length : 0,
        childCount: svg ? svg.children.length : 0,
        cellHits: svg ? svg.querySelectorAll('.cell-hit').length : 0,
      },
      project,
      history,
    };
  });
}

/** API/FP.appearance 设置模式与主题色 */
export async function setAppearance(page, mode, accent) {
  return page.evaluate(([m, a]) => {
    const api = window.__FIGPLAY__;
    if (api && typeof api.setAppearance === 'function') return api.setAppearance(m, a);
    if (window.FP && FP.appearance) {
      if (typeof a === 'string') FP.appearance.setAccent(a);
      if (typeof m === 'string') FP.appearance.setMode(m);
      return FP.appearance.get();
    }
    throw new Error('外观 API 不存在');
  }, [mode, accent]);
}

export async function waitAppearanceState(page, predicate, arg, options = {}) {
  const { timeout = 6000, label = 'appearance state' } = options;
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const state = await getAppearanceState(page);
    try {
      if (state && predicate(state, arg)) return state;
    } catch (err) { /* ignore */ }
    await page.waitForTimeout(80);
  }
  throw new Error(`等待超时（${label}, ${timeout}ms）`);
}

export async function openAppearanceMenu(page) {
  await page.locator('#btn-appearance').click();
  await waitFor(page, () => {
    const pop = document.getElementById('appearance-popover');
    const btn = document.getElementById('btn-appearance');
    return !!pop && !pop.hidden && btn.getAttribute('aria-expanded') === 'true';
  }, null, { timeout: 5000, label: 'appearance menu open' });
}
export async function closeAppearanceMenu(page) {
  await page.locator('#appearance-close').click();
  await waitFor(page, () => {
    const pop = document.getElementById('appearance-popover');
    return !!pop && pop.hidden;
  }, null, { timeout: 5000, label: 'appearance menu close' });
}
export async function clickAppearanceMode(page, mode) {
  await page.locator(`#theme-mode-group [data-theme-mode="${mode}"]`).click();
  await waitFor(page, (m) => document.documentElement.getAttribute('data-theme-mode') === m, mode,
    { timeout: 5000, label: `appearance mode ${mode}` });
}
export async function clickAccent(page, accent) {
  await page.locator(`#accent-group [data-accent="${accent}"]`).click();
  await waitFor(page, (a) => document.documentElement.getAttribute('data-accent') === a, accent,
    { timeout: 5000, label: `appearance accent ${accent}` });
}

/** 清除外观偏好（不动项目 session） */
export async function clearAppearanceStorage(page) {
  await page.evaluate(({ modeKey, accentKey }) => {
    try {
      localStorage.removeItem(modeKey);
      localStorage.removeItem(accentKey);
    } catch (err) { /* ignore */ }
  }, { modeKey: APPEARANCE_MODE_KEY, accentKey: APPEARANCE_ACCENT_KEY });
}

/** 系统颜色方案模拟（dark/light） */
export async function emulateColorScheme(page, scheme) {
  await page.emulateMedia({ colorScheme: scheme });
}

/** 导出后用于“外观隔离”对比的 base64 + 文件名 */
export async function getExportBase64(page, format, overrides) {
  const result = await page.evaluate(([fmt, opts]) => window.__FIGPLAY__.exportBase64(fmt, opts),
    [format, overrides || null]);
  return {
    base64: result.base64,
    filename: result.filename,
    mime: result.mime,
    pageCount: result.pageCount,
    bytes: result.bytes,
  };
}

/** 探测 v1.3.4 契约（版本 + 外观 UI/API/CSS 变量） */
export async function probeV134(page) {
  return page.evaluate(() => {
    const api = window.__FIGPLAY__;
    const root = document.documentElement;
    const modes = Array.from(document.querySelectorAll('#theme-mode-group [data-theme-mode]'))
      .map((btn) => btn.getAttribute('data-theme-mode'));
    const accents = Array.from(document.querySelectorAll('#accent-group [data-accent]'))
      .map((btn) => btn.getAttribute('data-accent'));
    return {
      version: api ? api.version || null : null,
      apiPresent: !!api,
      hasSetAppearance: !!(api && typeof api.setAppearance === 'function'),
      hasGetAppearance: !!(api && typeof api.getAppearance === 'function'),
      hasFpAppearance: !!(window.FP && FP.appearance && typeof FP.appearance.get === 'function'),
      themeCssLoaded: !!window.getComputedStyle(root).getPropertyValue('--accent').trim(),
      buttonExists: !!document.getElementById('btn-appearance'),
      popoverExists: !!document.getElementById('appearance-popover'),
      modes,
      accents,
      accentLabels: Array.from(document.querySelectorAll('#accent-group [data-accent]'))
        .map((btn) => btn.getAttribute('aria-label')),
      html: {
        theme: root.getAttribute('data-theme'),
        mode: root.getAttribute('data-theme-mode'),
        accent: root.getAttribute('data-accent'),
      },
      mediaDark: !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches),
    };
  });
}

/** 场景启动守卫：v1.3.4 界面外观契约 */
export async function ensureV134(ctx, page, label = 'v1.3.4 契约') {
  const probe = await probeV134(page);
  ctx.evidence.v134Probe = probe;
  ctx.check(`${label}：应用版本 >= 1.3.4（当前 ${probe.version || 'unknown'}）`,
    /^1\.(?:3\.[4-9]|[4-9]\.|[1-9]\d)|^[2-9]\./.test(String(probe.version || '')), probe.version);
  ctx.check(`${label}：外观 API 齐全（setAppearance/getAppearance/FP.appearance）`,
    probe.hasSetAppearance && probe.hasGetAppearance && probe.hasFpAppearance,
    { set: probe.hasSetAppearance, get: probe.hasGetAppearance, fp: probe.hasFpAppearance });
  ctx.check(`${label}：theme.css 已加载（--accent CSS 变量存在）`,
    probe.themeCssLoaded, probe.themeCssLoaded);
  ctx.check(`${label}：#btn-appearance 与 #appearance-popover 存在`,
    probe.buttonExists && probe.popoverExists,
    { button: probe.buttonExists, popover: probe.popoverExists });
  ctx.check(`${label}：模式按钮 3 个（light/dark/system）`,
    JSON.stringify(probe.modes) === JSON.stringify(V134_MODES), probe.modes);
  ctx.check(`${label}：主题色 7 个（blue..amber）且均有 aria-label`,
    JSON.stringify(probe.accents) === JSON.stringify(V134_ACCENTS)
      && probe.accentLabels.every((text) => !!text),
    probe.accents);
  ctx.check(`${label}：html 上 data-theme/data-theme-mode/data-accent 已设置`,
    !!probe.html.theme && !!probe.html.mode && !!probe.html.accent, probe.html);
  ctx.note('v1.3.4 界面外观契约探测（信息，非问题）', JSON.stringify(probe));
  return probe.hasSetAppearance && probe.hasGetAppearance && probe.hasFpAppearance
    && probe.themeCssLoaded && probe.buttonExists && probe.popoverExists
    && probe.modes.length === 3 && probe.accents.length === 7;
}

/* ==========================================================================
 * v1.4.0 新增：配置模板（保存/应用/导入/导出 JSON）
 * ========================================================================== */

export const CONFIG_PROFILES_KEY = 'figureplay.configProfiles.v1';
export const V140_METHODS = ['getConfigSnapshot', 'normalizeConfigSnapshot', 'applyConfigSnapshot'];

/** 读取配置模板 UI/存储/当前快照状态 */
export async function getConfigUiState(page) {
  return page.evaluate((key) => {
    const api = window.__FIGPLAY__;
    const cfg = window.__CONFIG_PROFILES__;
    const text = (id) => {
      const node = document.getElementById(id);
      return node ? (node.textContent || '').trim() : null;
    };
    const val = (id) => {
      const node = document.getElementById(id);
      return node ? node.value : null;
    };
    const visible = (id) => {
      const node = document.getElementById(id);
      return !!node && !node.hidden && node.getClientRects().length > 0;
    };
    const listItems = Array.from(document.querySelectorAll('#config-list .config-item')).map((item) => ({
      name: (item.querySelector('.config-item-head b') || {}).textContent || '',
      desc: (item.querySelector('.config-item-desc') || {}).textContent || '',
      summary: (item.querySelector('.config-item-summary') || {}).textContent || '',
      date: (item.querySelector('.config-item-head span') || {}).textContent || '',
      actions: Array.from(item.querySelectorAll('[data-action]')).map((btn) => ({
        action: btn.getAttribute('data-action'),
        id: btn.getAttribute('data-id'),
      })),
    }));
    let stored = [];
    let storedRaw = null;
    try {
      storedRaw = localStorage.getItem(key);
      const parsed = storedRaw ? JSON.parse(storedRaw) : [];
      stored = Array.isArray(parsed) ? parsed : [];
    } catch (err) { stored = []; }
    let snapshot = null;
    let imageCount = null;
    let history = null;
    let project = null;
    try {
      snapshot = api.getConfigSnapshot();
      const info = api.getPreviewInfo();
      imageCount = info.imageCount;
      history = api.getHistoryState ? api.getHistoryState() : null;
      const state = api.getState();
      project = {
        pageCount: state.pageCount, pageIndex: state.pageIndex,
        rows: state.layout.rows, cols: state.layout.cols,
        filled: (state.cells || []).filter(Boolean).length,
        cellNames: (state.cells || []).map((cell) => (cell ? cell.name : null)),
      };
    } catch (err) { snapshot = null; }
    const sessionRaw = localStorage.getItem('figureplay.session.v1');
    const dialog = document.getElementById('config-dialog');
    let profilesPayload = [];
    try { profilesPayload = cfg && typeof cfg.list === 'function' ? cfg.list() : []; } catch (err) { profilesPayload = []; }
    return {
      version: api ? api.version || null : null,
      runtime: {
        present: !!cfg,
        hasList: !!(cfg && typeof cfg.list === 'function'),
        hasSaveCurrent: !!(cfg && typeof cfg.saveCurrent === 'function'),
        hasApply: !!(cfg && typeof cfg.apply === 'function'),
        hasImportJson: !!(cfg && typeof cfg.importJson === 'function'),
        hasClear: !!(cfg && typeof cfg.clear === 'function'),
      },
      ui: {
        countText: text('config-count'),
        activeVisible: visible('config-active'),
        activeName: text('config-active-name'),
        activeDesc: text('config-active-desc'),
        dialogOpen: !!dialog && dialog.open === true,
        nameValue: val('config-name'),
        descValue: val('config-desc'),
        saveSummary: text('config-save-summary'),
        saveStatus: text('config-save-status'),
        listItems,
        importPreviewVisible: visible('config-import-preview'),
        importName: text('config-import-name'),
        importMeta: text('config-import-meta'),
        importDesc: text('config-import-desc'),
        importSummary: text('config-import-summary'),
        importApplyVisible: visible('config-import-apply'),
        importSaveVisible: visible('config-import-save'),
        fileInputPresent: !!document.getElementById('config-file-input'),
      },
      storage: {
        key,
        raw: storedRaw,
        length: stored.length,
        names: stored.map((item) => item && item.name),
        profilesPayload,
        sessionPresent: !!sessionRaw,
        sessionHasConfigKey: /configProfiles|figureplay-config/.test(String(sessionRaw || '')),
      },
      snapshot,
      imageCount,
      history,
      project,
      appearance: (window.FP && FP.appearance) ? FP.appearance.get() : null,
      htmlTheme: document.documentElement.getAttribute('data-theme'),
      htmlAccent: document.documentElement.getAttribute('data-accent'),
    };
  }, CONFIG_PROFILES_KEY);
}

export async function waitConfigState(page, predicate, arg, options = {}) {
  const { timeout = 8000, label = 'config state' } = options;
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const state = await getConfigUiState(page);
    try {
      if (state && predicate(state, arg)) return state;
    } catch (err) { /* ignore */ }
    await page.waitForTimeout(100);
  }
  throw new Error(`等待超时（${label}, ${timeout}ms）`);
}

export async function openConfigDialog(page, mode = 'manage') {
  const selector = mode === 'save' ? '#btn-config-save' : '#btn-config-manage';
  await page.locator(selector).click();
  await waitFor(page, () => {
    const dialog = document.getElementById('config-dialog');
    return !!dialog && dialog.open === true;
  }, null, { timeout: 6000, label: 'config dialog open' });
}
export async function closeConfigDialog(page) {
  await page.locator('#config-dialog-close').click();
  await waitFor(page, () => {
    const dialog = document.getElementById('config-dialog');
    return !!dialog && dialog.open === false;
  }, null, { timeout: 6000, label: 'config dialog close' });
}

export async function setConfigForm(page, { name, description }) {
  if (name !== undefined) {
    await page.locator('#config-name').evaluate((node, value) => {
      node.value = String(value);
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }, name);
  }
  if (description !== undefined) {
    await page.locator('#config-desc').evaluate((node, value) => {
      node.value = String(value);
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }, description);
  }
}

/** 在已打开的配置对话框内点击“保存到本机”，等待配置数量增加 */
export async function saveCurrentConfig(page) {
  const before = await getConfigUiState(page);
  await page.locator('#config-save-current').click();
  const expected = (before.storage.length || 0) + 1;
  return waitConfigState(page, (state, count) => state.storage.length >= count,
    expected, { label: 'config saved' });
}

export async function clickConfigItemAction(page, name, action, options = {}) {
  const item = page.locator('#config-list .config-item', { has: page.locator(`.config-item-head b`, { hasText: name }) }).first();
  await item.locator(`[data-action="${action}"]`).click();
  return options;
}

/** 点击已保存配置的“应用”（自动 accept confirm） */
export async function applyConfigItem(page, name, options = {}) {
  const { accept = true, timeout = 8000 } = options;
  if (accept) page.once('dialog', async (dialog) => { await dialog.accept(); });
  await clickConfigItemAction(page, name, 'apply');
  return waitConfigState(page, (state) => state.ui.activeName === name, null,
    { timeout, label: `config apply ${name}` });
}

/** 导出已保存配置的 JSON（下载文件）；返回 {path,filename,size,json,text} */
export async function exportConfigItem(page, name, dir, filename) {
  const download = await waitForDownload(page, async () => {
    await clickConfigItemAction(page, name, 'export');
  }, { timeout: 30000 });
  const saved = await saveDownload(download, filename, { dir });
  const text = fs.readFileSync(saved.path, 'utf8');
  let json = null;
  let parseError = null;
  try { json = JSON.parse(text); } catch (err) { parseError = String(err && err.message ? err.message : err); }
  return { ...saved, text, json, parseError };
}

/** 通过隐藏 file input 导入配置 JSON 文件 */
export async function importConfigFile(page, filePath) {
  await page.locator('#config-file-input').setInputFiles([filePath]);
  await page.waitForTimeout(150);
}

export async function clearConfigProfiles(page) {
  await page.evaluate(() => {
    if (window.__CONFIG_PROFILES__ && typeof window.__CONFIG_PROFILES__.clear === 'function') {
      window.__CONFIG_PROFILES__.clear();
    }
  });
  await page.waitForTimeout(150);
}

export async function getConfigSnapshot(page) {
  return page.evaluate(() => window.__FIGPLAY__.getConfigSnapshot());
}
export async function normalizeConfigSnapshot(page, raw) {
  return page.evaluate((value) => window.__FIGPLAY__.normalizeConfigSnapshot(value), raw);
}
export async function applyConfigSnapshot(page, raw) {
  return page.evaluate((value) => window.__FIGPLAY__.applyConfigSnapshot(value), raw);
}

/** 生成测试用配置文件 */
export async function writeConfigJsonFile(dir, name, data) {
  await ensureDir(dir);
  const filePath = path.join(dir, name);
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  await fsp.writeFile(filePath, text, 'utf8');
  return filePath;
}

/** 探测 v1.4.0 契约 */
export async function probeV140(page) {
  return page.evaluate((methods) => {
    const api = window.__FIGPLAY__;
    const cfg = window.__CONFIG_PROFILES__;
    const ids = [
      'config-card', 'config-count', 'btn-config-save', 'btn-config-manage',
      'config-dialog', 'config-name', 'config-desc', 'config-save-summary',
      'config-save-current', 'config-list', 'config-import-btn', 'config-file-input',
      'config-import-preview', 'config-import-name', 'config-import-meta',
      'config-import-desc', 'config-import-summary', 'config-import-apply',
      'config-import-save', 'config-import-cancel', 'config-active',
    ];
    let snapshot = null;
    try { snapshot = api && api.getConfigSnapshot ? api.getConfigSnapshot() : null; } catch (err) { snapshot = null; }
    return {
      version: api ? api.version || null : null,
      apiPresent: !!api,
      missingMethods: methods.filter((name) => !api || typeof api[name] !== 'function'),
      runtime: {
        present: !!cfg,
        list: !!(cfg && typeof cfg.list === 'function'),
        saveCurrent: !!(cfg && typeof cfg.saveCurrent === 'function'),
        apply: !!(cfg && typeof cfg.apply === 'function'),
        importJson: !!(cfg && typeof cfg.importJson === 'function'),
      },
      missingIds: ids.filter((id) => !document.getElementById(id)),
      snapshotKeys: snapshot ? Object.keys(snapshot) : null,
      snapshotShape: snapshot ? {
        rows: snapshot.layout && snapshot.layout.rows,
        cols: snapshot.layout && snapshot.layout.cols,
        font: snapshot.label && snapshot.label.fontFamily,
        format: snapshot.export && snapshot.export.format,
        hasFilename: !!(snapshot.export && 'filename' in snapshot.export),
        hasCells: !!(snapshot && 'cells' in snapshot),
      } : null,
      countText: (document.getElementById('config-count') || {}).textContent || '',
    };
  }, V140_METHODS);
}

/** 场景启动守卫：v1.4.0 配置模板契约 */
export async function ensureV140(ctx, page, label = 'v1.4.0 契约') {
  const probe = await probeV140(page);
  ctx.evidence.v140Probe = probe;
  ctx.check(`${label}：应用版本 >= 1.4.0（当前 ${probe.version || 'unknown'}）`,
    /^1\.(?:[4-9]\.|[1-9]\d\.)|^[2-9]\./.test(String(probe.version || '')), probe.version);
  ctx.check(`${label}：配置 API 齐全（getConfigSnapshot/normalizeConfigSnapshot/applyConfigSnapshot）`,
    probe.missingMethods.length === 0, probe.missingMethods);
  ctx.check(`${label}：__CONFIG_PROFILES__ 运行时提供 list/saveCurrent/apply/importJson`,
    probe.runtime.present && probe.runtime.list && probe.runtime.saveCurrent
      && probe.runtime.apply && probe.runtime.importJson, probe.runtime);
  ctx.check(`${label}：左侧配置卡/对话框/导入预览等 DOM 齐全`,
    probe.missingIds.length === 0, probe.missingIds);
  ctx.check(`${label}：getConfigSnapshot 含 layout/label/export 且不含 cells/filename`,
    !!probe.snapshotKeys
      && JSON.stringify(probe.snapshotKeys) === JSON.stringify(['layout', 'label', 'export'])
      && !!probe.snapshotShape && !probe.snapshotShape.hasCells
      && !probe.snapshotShape.hasFilename,
    { keys: probe.snapshotKeys, shape: probe.snapshotShape });
  ctx.check(`${label}：#config-count 初始文案可读（${probe.countText.trim()}）`,
    /本机\s*\d+\s*个/.test(probe.countText), probe.countText);
  ctx.note('v1.4.0 配置模板契约探测（信息，非问题）', JSON.stringify(probe));
  return probe.missingMethods.length === 0 && probe.runtime.present
    && probe.missingIds.length === 0 && !!probe.snapshotKeys;
}








