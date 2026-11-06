/**
 * FigurePlay v1.3 新功能 E2E 场景（P–U）
 *
 * P 网格自定义 / Q 导出保存位置 / R 编号越界自动加页距 /
 * S PDF 自动裁剪白边 / T 滑块数字输入 / U EMF 矢量 PDF（桌面桥 mock）
 *
 * 依赖 lib/app.mjs 中 v1.3 helper；应用未就绪时 ensureV13() 先失败快速返回。
 */
import fs from 'node:fs';
import path from 'node:path';

import * as app from './lib/app.mjs';
import {
  samplePath, saveDownload, waitForDownload,
} from './lib/browser.mjs';
import { describeVerify, verifyExport } from './lib/verify.mjs';

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

async function waitPreview(page, predicate, arg, label, timeout = 12000) {
  await app.waitFor(page, predicate, arg, { timeout, label });
}

async function blurFocus(page) {
  await page.evaluate(() => {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  });
}

function addExportEvidence(ctx, record) {
  ctx.evidence.exports = ctx.evidence.exports || [];
  ctx.evidence.exports.push(record);
}

async function exportAndVerify(ctx, page, options) {
  const {
    format, filename, overrides, kind, verifyOptions, label,
  } = options;
  const exported = await app.exportToFile(page, format, overrides || null, ctx.exportsDir, filename);
  const verify = verifyExport(kind, exported.path, verifyOptions || {});
  addExportEvidence(ctx, {
    label, format, filename: exported.filename, path: exported.path, size: exported.size,
    widthPx: exported.widthPx, heightPx: exported.heightPx,
    verifierOk: verify.ok, failedChecks: verify.failedChecks,
    verifier: verify.report ? { ok: verify.report.ok, checks: verify.report.checks, details: verify.report.details } : null,
  });
  ctx.check(`${label}：文件生成（${exported.size} B）`, exported.size > 0,
    { path: exported.path, size: exported.size });
  ctx.check(`${label}：Python 校验通过`, verify.ok, describeVerify(verify));
  return { exported, verify };
}

/* ----------------------------- P 网格自定义 ----------------------------- */
const gridCustomScenario = {
  code: 'P',
  name: 'grid-custom',
  title: '网格自定义',
  description: '行列输入 max=500；8×8、1×20、50×50=2500 可用；100×100 超限 toast 且保持旧布局；100×1 允许；600 行夹取到 500；1000×640 无横向溢出',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV13(ctx, page))) return;
    await app.api.clearAll(page);

    let grid = await app.getGridUiState(page);
    ctx.check('行列输入 min=1 / max=500',
      grid.rowsMin === '1' && grid.rowsMax === '500'
      && grid.colsMin === '1' && grid.colsMax === '500',
      { rows: [grid.rowsMin, grid.rowsMax], cols: [grid.colsMin, grid.colsMax] });

    // 8×8（UI 输入框）
    await app.setNumberInput(page, '#rows-input', 8);
    await app.setNumberInput(page, '#cols-input', 8);
    await waitPreview(page, () => window.__FIGPLAY__.getPreviewInfo().gridCellCount === 64, null, '8x8');
    grid = await app.getGridUiState(page);
    ctx.check('8×8=64 生效（layout/gridCellCount/panelCount）',
      grid.layout.rows === 8 && grid.layout.cols === 8
      && grid.gridCellCount === 64 && grid.geom.panelCount === 64,
      { layout: grid.layout, gridCellCount: grid.gridCellCount, panelCount: grid.geom.panelCount });
    ctx.check('8×8 时输入框同步为 8',
      grid.rowsInput === '8' && grid.colsInput === '8', { rows: grid.rowsInput, cols: grid.colsInput });
    await ctx.screenshot('grid-custom-8x8');

    // 1×20
    await app.api.setLayout(page, 1, 20);
    await waitPreview(page, () => window.__FIGPLAY__.getPreviewInfo().gridCellCount === 20, null, '1x20');
    grid = await app.getGridUiState(page);
    ctx.check('1×20=20 生效', grid.layout.rows === 1 && grid.layout.cols === 20
      && grid.gridCellCount === 20 && grid.geom.panelCount === 20,
    { layout: grid.layout, gridCellCount: grid.gridCellCount });

    // 50×50 = 2500（单页上限）
    await app.api.setLayout(page, 50, 50);
    await waitPreview(page, () => window.__FIGPLAY__.getPreviewInfo().gridCellCount === 2500, null, '50x50', 20000);
    grid = await app.getGridUiState(page);
    ctx.check('50×50=2500 生效（单页上限）',
      grid.layout.rows === 50 && grid.layout.cols === 50
      && grid.gridCellCount === 2500 && grid.geom.panelCount === 2500,
      { layout: grid.layout, gridCellCount: grid.gridCellCount, panelCount: grid.geom.panelCount });
    ctx.check('50×50 几何合法（cellW/cellH>0、stage 可见）',
      grid.geom.cellW > 0 && grid.geom.cellH > 0
      && !!grid.stage && grid.stage.visible && grid.stage.w > 100,
      { cellW: grid.geom.cellW, cellH: grid.geom.cellH, stage: grid.stage });

    // 高 DPI：50×50 时仍无横向溢出
    await page.setViewportSize({ width: 1000, height: 640 });
    await waitPreview(page, () => Math.round(window.innerWidth) === 1000, null, 'viewport 1000x640');
    const scroll = await page.evaluate(() => {
      const stage = document.getElementById('stage');
      const box = stage ? stage.getBoundingClientRect() : null;
      return {
        body: document.body.scrollWidth,
        doc: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
        inner: window.innerWidth,
        stage: box ? { w: Math.round(box.width), h: Math.round(box.height) } : null,
      };
    });
    ctx.check('1000×640 + 50×50：无横向溢出且 stage 可见',
      Math.max(scroll.body, scroll.doc) <= scroll.inner + 1
      && !!scroll.stage && scroll.stage.w > 0 && scroll.stage.h > 100,
      scroll);
    ctx.evidence['grid-1000x640-50x50'] = scroll;
    await ctx.screenshot('grid-1000x640');
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitPreview(page, () => Math.round(window.innerWidth) === 1440, null, 'viewport 1440x900');

    // 100×100 超限拒绝
    const beforeReject = await app.getGridUiState(page);
    await app.api.setLayout(page, 100, 100);
    await app.waitToastContains(page, '2500', { timeout: 5000 });
    const toast = await app.getToast(page);
    const afterReject = await app.getGridUiState(page);
    ctx.check('100×100=10000 被拒：toast 提示 2500 格',
      !!toast.text && /2500/.test(toast.text) && /100\s*×\s*100/.test(toast.text),
      toast);
    ctx.check('100×100 被拒后保持旧布局 50×50',
      afterReject.layout.rows === beforeReject.layout.rows
      && afterReject.layout.cols === beforeReject.layout.cols
      && afterReject.gridCellCount === beforeReject.gridCellCount,
      { before: beforeReject.layout, after: afterReject.layout });
    ctx.check('超限后行列输入恢复为合法值 50/50',
      afterReject.rowsInput === '50' && afterReject.colsInput === '50',
      { rows: afterReject.rowsInput, cols: afterReject.colsInput });

    // 100×1 允许；600 行夹取到 500
    await app.api.setLayout(page, 100, 1);
    await waitPreview(page, () => window.__FIGPLAY__.getPreviewInfo().gridCellCount === 100, null, '100x1');
    grid = await app.getGridUiState(page);
    ctx.check('100×1=100 可生效（仅总量超 2500 才拒绝）',
      grid.layout.rows === 100 && grid.layout.cols === 1 && grid.gridCellCount === 100,
      { layout: grid.layout, gridCellCount: grid.gridCellCount });
    await app.api.setLayout(page, 600, 1);
    await waitPreview(page, () => window.__FIGPLAY__.getState().layout.rows === 500, null, '600 rows clamp');
    grid = await app.getGridUiState(page);
    ctx.check('API 传 600 行夹取到 500（max=500）',
      grid.layout.rows === 500 && grid.layout.cols === 1,
      { layout: grid.layout, rowsInput: grid.rowsInput });

    await app.api.setLayout(page, 3, 2);
    await app.api.clearAll(page);
    ctx.evidence.gridSummary = {
      accepted: ['8x8', '1x20', '50x50', '100x1'],
      rejected: '100x100（10000 > 2500）',
      clamped: '600 rows -> 500',
    };
  },
};

/* ----------------------------- Q 导出保存位置 ----------------------------- */
const saveAsScenario = {
  code: 'Q',
  name: 'save-location',
  title: '导出保存位置',
  description: '#save-as-row/#save-as-toggle 默认勾选并映射 state.export.saveAs；fake showSaveFilePicker 验证 picker→write/close；AbortError 无头自动回退下载；无 picker 直接下载不卡住；API 导出不调用 picker',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV13(ctx, page))) return;
    await app.api.clearAll(page);
    await app.uploadFiles(page, [samplePath('sample-1.png')], 0, 1);

    let exp = await app.getExportUiState(page);
    ctx.check('#save-as-row 可见、默认勾选且 state.export.saveAs=true',
      exp.ui.saveAsRowVisible === true && exp.ui.saveAsChecked === true
      && exp.exportOptions.saveAs === true,
      { ui: exp.ui, saveAs: exp.exportOptions.saveAs });

    let toggled = await app.setExportOptions(page, { saveAs: false });
    exp = await app.getExportUiState(page);
    ctx.check('setExportOptions({saveAs:false}) 同步状态与勾选框',
      toggled.saveAs === false && exp.exportOptions.saveAs === false && exp.ui.saveAsChecked === false,
      { api: toggled, ui: exp.ui.saveAsChecked });
    await app.setExportOptions(page, { saveAs: true });
    exp = await app.getExportUiState(page);
    ctx.check('setExportOptions({saveAs:true}) 恢复勾选',
      exp.exportOptions.saveAs === true && exp.ui.saveAsChecked === true);

    await app.setNumberInput(page, '#filename-input', 'fp-v13-save');
    const geom = await app.getGeom(page);
    const expectPx = app.expectedPixelSize(geom, 300);
    let downloadCount = 0;
    const onDownload = () => { downloadCount += 1; };
    page.on('download', onDownload);

    // fake picker → handle 模式：调用 picker 并写入 blob（不触发下载）
    await app.installFakeSavePicker(page, { mode: 'handle' });
    await app.clickFormat(page, 'png');
    await page.locator('#btn-export').click();
    await app.waitFakeSaveWrites(page, 1, { label: 'fake picker write png' });
    const fake = await app.getFakeSaveState(page);
    ctx.check('点导出时调用 fake showSaveFilePicker 一次',
      fake.hasPicker === true && fake.fake.pickerInvocations === 1,
      { pickerInvocations: fake.fake && fake.fake.pickerInvocations });
    const call = (fake.fake.calls || [])[0] || {};
    const typeEntry = call.types && call.types[0] ? call.types[0] : null;
    ctx.check('picker suggestedName 使用当前文件名 + .png',
      call.suggestedName === 'fp-v13-save.png',
      call.suggestedName);
    ctx.check('picker types 声明 image/png + .png',
      !!typeEntry && typeEntry.accept && Array.isArray(typeEntry.accept['image/png'])
      && typeEntry.accept['image/png'].indexOf('.png') >= 0,
      typeEntry);
    const write = (fake.fake.writes || [])[0] || {};
    ctx.check('fake handle 写入 PNG 数据（size/type/头字节）',
      write.size > 0 && write.type === 'image/png'
        && Array.isArray(write.head) && write.head[0] === 137 && write.head[1] === 80
        && write.head[2] === 78 && write.head[3] === 71,
      { size: write.size, type: write.type, head: write.head });
    ctx.check('fake handle 关闭（close）且写入文件即成功、未触发下载',
      fake.fake.closes >= 1 && fake.fake.writes.length === 1 && downloadCount === 0,
      { closes: fake.fake.closes, writes: fake.fake.writes.length, downloadCount });
    const status = await app.getExportUiState(page);
    const toast = await app.getToast(page);
    ctx.check('保存到所选位置的状态/提示可读',
      /已保存到/.test(status.ui.statusText || '') || /已保存到所选位置/.test(toast.text || ''),
      { status: status.ui.statusText, toast: toast.text });

    // AbortError → 无头自动回退下载
    await app.installFakeSavePicker(page, { mode: 'abort' });
    await app.setExportOptions(page, { saveAs: true });
    await app.clickFormat(page, 'png');
    const abortDownload = await waitForDownload(page, () => page.locator('#btn-export').click(), { timeout: 60000 });
    const abortSaved = await saveDownload(abortDownload, 'fp-v13-abort-fallback.png', { dir: ctx.exportsDir });
    const abortVerify = verifyExport('image', abortSaved.path, {
      expectWidth: expectPx.width, expectHeight: expectPx.height, expectFormat: 'png',
    });
    const abortFake = await app.getFakeSaveState(page);
    ctx.check('fake picker 抛 AbortError 时自动回退下载（无头环境）',
      abortFake.fake.pickerInvocations === 1
      && /\.png$/i.test(abortSaved.suggestedFilename) && abortSaved.size > 0 && abortVerify.ok,
      { pickerInvocations: abortFake.fake.pickerInvocations, filename: abortSaved.suggestedFilename,
        size: abortSaved.size, verifier: describeVerify(abortVerify) });
    addExportEvidence(ctx, {
      label: '保存位置 AbortError 回退下载 PNG', format: 'image', filename: abortSaved.filename,
      path: abortSaved.path, size: abortSaved.size, widthPx: expectPx.width, heightPx: expectPx.height,
      verifierOk: abortVerify.ok, failedChecks: abortVerify.failedChecks,
      verifier: abortVerify.report,
    });

    // 无 picker → 直接下载
    await app.installFakeSavePicker(page, { mode: 'remove' });
    await app.setExportOptions(page, { saveAs: true });
    const noPickerState = await app.getFakeSaveState(page);
    ctx.check('fake 环境无 window.showSaveFilePicker', noPickerState.hasPicker === false);
    await app.clickFormat(page, 'png');
    const noPickerDownload = await waitForDownload(page, () => page.locator('#btn-export').click(), { timeout: 60000 });
    const noPickerSaved = await saveDownload(noPickerDownload, 'fp-v13-no-picker.png', { dir: ctx.exportsDir });
    ctx.check('无 picker 时直接下载且不卡住（文件名 .png）',
      /\.png$/i.test(noPickerSaved.suggestedFilename) && noPickerSaved.size > 0,
      { filename: noPickerSaved.suggestedFilename, size: noPickerSaved.size });

    // API exportBase64 不走 picker
    await app.restoreSavePicker(page);
    const apiResult = await app.api.exportBase64(page, 'png', { filename: 'fp-v13-api', dpi: 150 });
    ctx.check('API exportBase64 返回 base64 且不调用 showSaveFilePicker',
      !!apiResult && typeof apiResult.base64 === 'string' && apiResult.base64.length > 100
      && await page.evaluate(() => typeof window.showSaveFilePicker !== 'function'),
      apiResult && { filename: apiResult.filename, base64Length: apiResult.base64.length });

    page.off('download', onDownload);
    await ctx.screenshot('save-location');
    await app.api.clearAll(page);
  },
};

/* ----------------------------- R 自动页距 ----------------------------- */
const autoPadScenario = {
  code: 'R',
  name: 'auto-pad',
  title: '编号越界自动加页距',
  description: '默认 autoPad=true；编号 bc+offsetY 12mm 后 getPadInfo().bottom>0、页面变高、getLabelBoxes 全部在页内；可关闭为 0；手动 pad 可填；SVG/PDF 导出尺寸含页距',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV13(ctx, page))) return;
    await app.api.clearAll(page);
    await app.api.setLayout(page, 1, 1);
    await app.uploadFiles(page, [samplePath('sample-1.png')], 0, 1);

    const geom0 = await app.getGeom(page);
    const pad0 = await app.getPadInfo(page);
    ctx.check('默认 autoPad=true 且无额外页距',
      pad0.autoPad === true && pad0.top === 0 && pad0.right === 0
      && pad0.bottom === 0 && pad0.left === 0,
      pad0);
    ctx.check('无页距时 pageHeight=baseHeight',
      Math.abs(geom0.heightMm - pad0.baseHeightMm) < 1e-6,
      { pageHeight: geom0.heightMm, baseHeight: pad0.baseHeightMm });

    // 编号移到页面底边外侧 → 自动加页距
    await app.setLabelConfig(page, { show: true, position: 'bc', offsetYmm: 12 });
    await page.waitForTimeout(200);
    const geom1 = await app.getGeom(page);
    const pad1 = await app.getPadInfo(page);
    const boxes = await app.getLabelBoxes(page);
    ctx.check('编号越界后自动加底部页距（bottom>0）',
      pad1.autoPad === true && pad1.bottom > 0,
      pad1);
    ctx.check('页面高度增大（= baseHeight + 页距）',
      geom1.heightMm > geom0.heightMm
      && Math.abs(geom1.heightMm - (pad1.baseHeightMm + pad1.top + pad1.bottom)) < 0.15,
      { before: geom0.heightMm, after: geom1.heightMm, base: pad1.baseHeightMm, pads: pad1 });
    ctx.check('getLabelBoxes 所有 box 在页面内（底 ≤ 页高、左右在页内）',
      boxes.length > 0 && boxes.every((item) => item.box
        && item.box.x >= -0.001 && item.box.y >= -0.001
        && item.box.x + item.box.w <= geom1.widthMm + 0.001
        && item.box.y + item.box.h <= geom1.heightMm + 0.001),
      { geom: { w: geom1.widthMm, h: geom1.heightMm }, boxes: boxes.map((b) => b.box) });
    const readout1 = await app.getGridUiState(page);
    ctx.check('页距读数与自动页距勾选同步',
      readout1.autoPadChecked === true && !!readout1.padReadout
      && readout1.padReadout.indexOf(String(Math.round(pad1.bottom * 10) / 10)) >= 0,
      { readout: readout1.padReadout, checked: readout1.autoPadChecked, bottom: pad1.bottom });

    // 关闭 autoPad → pads=0、页面回退、手动输入出现
    await app.setLayoutOptions(page, { autoPad: false });
    const geom2 = await app.getGeom(page);
    const pad2 = await app.getPadInfo(page);
    const ui2 = await app.getGridUiState(page);
    ctx.check('关闭 autoPad 后四边页距=0 且页面回退',
      pad2.autoPad === false && pad2.top === 0 && pad2.bottom === 0
      && pad2.left === 0 && pad2.right === 0
      && Math.abs(geom2.heightMm - pad2.baseHeightMm) < 1e-6,
      { pads: pad2, height: geom2.heightMm, base: pad2.baseHeightMm });
    ctx.check('关闭 autoPad 后手动页距输入可见、勾选框取消',
      ui2.padManualHidden === false && ui2.autoPadChecked === false, ui2);

    // 手动页距
    await app.setLayoutOptions(page, { autoPad: false, padBottomMm: 15 });
    const pad3 = await app.getPadInfo(page);
    const geom3 = await app.getGeom(page);
    ctx.check('手动 padBottomMm=15 生效',
      pad3.bottom === 15 && Math.abs(geom3.heightMm - (pad3.baseHeightMm + 15)) < 1e-6,
      { pads: pad3, height: geom3.heightMm, base: pad3.baseHeightMm });
    await app.setNumberInput(page, '#pad-bottom', 20);
    await waitPreview(page, () => Math.abs(window.__FIGPLAY__.getPadInfo().bottom - 20) < 1e-6, null, 'pad-bottom=20');
    const pad4 = await app.getPadInfo(page);
    const geom4 = await app.getGeom(page);
    ctx.check('手动输入 #pad-bottom=20 生效（页面高度同步）',
      pad4.bottom === 20 && Math.abs(geom4.heightMm - (pad4.baseHeightMm + 20)) < 1e-6,
      { pads: pad4, height: geom4.heightMm, base: pad4.baseHeightMm });

    // 重新启用自动页距
    await app.setLayoutOptions(page, { autoPad: true });
    const pad5 = await app.getPadInfo(page);
    const geom5 = await app.getGeom(page);
    ctx.check('重新启用 autoPad 后自动页距恢复',
      pad5.autoPad === true && pad5.bottom > 0
      && Math.abs(geom5.heightMm - (pad5.baseHeightMm + pad5.top + pad5.bottom)) < 0.15,
      { pads: pad5, height: geom5.heightMm, base: pad5.baseHeightMm });

    // SVG / PDF 导出尺寸包含页距
    const finalGeom = await app.getGeom(page);
    const svg = await app.exportToFile(page, 'svg', {
      filename: 'fp-v13-pad', transparent: false,
    }, ctx.exportsDir);
    const svgVerify = verifyExport('svg', svg.path, {
      expectWidthMm: round(finalGeom.widthMm), expectHeightMm: round(finalGeom.heightMm),
      expectCells: 1, expectImages: 1, expectLabels: 1, expectLabelTexts: '(a)',
      expectBg: 'white', tolerance: 0.02,
    });
    addExportEvidence(ctx, {
      label: '自动页距 SVG', format: 'svg', filename: svg.filename, path: svg.path, size: svg.size,
      verifierOk: svgVerify.ok, failedChecks: svgVerify.failedChecks, verifier: svgVerify.report,
    });
    ctx.check('SVG 导出尺寸包含页距（mm 与当前 geom 一致）', svgVerify.ok, describeVerify(svgVerify));

    const pdf = await app.exportToFile(page, 'pdf', {
      filename: 'fp-v13-pad', dpi: 150,
    }, ctx.exportsDir);
    const pdfVerify = verifyExport('pdf', pdf.path, {
      expectWidthMm: round(finalGeom.widthMm), expectHeightMm: round(finalGeom.heightMm),
      expectPages: 1,
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v13-pad', renderDpi: 72,
      tolerancePt: 0.8,
    });
    addExportEvidence(ctx, {
      label: '自动页距 PDF', format: 'pdf', filename: pdf.filename, path: pdf.path, size: pdf.size,
      verifierOk: pdfVerify.ok, failedChecks: pdfVerify.failedChecks, verifier: pdfVerify.report,
    });
    ctx.check('PDF 导出页面尺寸包含页距（MediaBox=当前 geom）', pdfVerify.ok, describeVerify(pdfVerify));
    const pdfDetails = pdfVerify.report && pdfVerify.report.details;
    ctx.check('自动页距 PDF 页数=1（pdfinfo）',
      !!pdfDetails && pdfDetails.pageCount === 1, pdfDetails && pdfDetails.pageCount);

    ctx.evidence.autoPad = {
      before: { height: geom0.heightMm, pads: pad0 },
      after: { height: geom1.heightMm, pads: pad1, boxes: boxes.map((b) => b.box) },
      manual: { height: geom4.heightMm, pads: pad4 },
      exports: { svg: finalGeom, pdf: pdfVerify.report && pdfVerify.report.details },
    };
    await ctx.screenshot('auto-pad');
  },
};

/* ----------------------------- S PDF 自动裁剪白边 ----------------------------- */
const pdfTrimScenario = {
  code: 'S',
  name: 'pdf-trim',
  title: 'PDF自动裁剪白边',
  description: '默认 trimPdf=false；#pdf-trim-row/#pdf-trim-toggle/#pdf-trim-margin 只在 PDF 格式出现；getCropBox(margin) 含 margin 外扩；API 导出 PDF 的 MediaBox=内容 bbox（±1mm）；layout.margin=10 时裁剪后小于整页；UI 导出同样裁剪',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV13(ctx, page))) return;
    await app.api.clearAll(page);
    await app.api.setLayout(page, 2, 2);
    await app.setLayoutOptions(page, { margin: 10 });
    await app.uploadFiles(page, [
      samplePath('sample-1.png'), samplePath('sample-2.png'),
      samplePath('sample-3.png'), samplePath('sample-4.png'),
    ], null, 4);

    let exp = await app.getExportUiState(page);
    ctx.check('默认 format=png 时 PDF 裁剪行隐藏、trimPdf=false',
      exp.ui.pdfTrimRowVisible === false && exp.exportOptions.trimPdf === false,
      { rowVisible: exp.ui.pdfTrimRowVisible, trimPdf: exp.exportOptions.trimPdf });

    await app.clickFormat(page, 'pdf');
    exp = await app.getExportUiState(page);
    ctx.check('切到 PDF 后裁剪行显示、开关默认关闭、边距行隐藏',
      exp.ui.pdfTrimRowVisible === true && exp.ui.pdfTrimChecked === false
      && exp.ui.pdfTrimMarginRowVisible === false,
      exp.ui);

    const geom = await app.getGeom(page);
    const crop0 = await app.getCropBox(page, 0);
    const crop2 = await app.getCropBox(page, 2);
    ctx.check('layout.margin=10 时内容 bbox 小于整页（去掉 10mm 白边）',
      crop0.wMm < geom.widthMm - 15 && crop0.hMm < geom.heightMm - 15
      && crop0.xMm >= 9 && crop0.yMm >= 9,
      { geom: { w: geom.widthMm, h: geom.heightMm }, crop: crop0 });
    ctx.check('getCropBox(margin) 按 margin 向四周外扩（±2mm→+4mm）',
      Math.abs(crop2.wMm - (crop0.wMm + 4)) < 0.3
      && Math.abs(crop2.hMm - (crop0.hMm + 4)) < 0.3,
      { crop0, crop2 });

    await app.setExportOptions(page, { trimPdf: true, trimMarginMm: 2 });
    exp = await app.getExportUiState(page);
    ctx.check('setExportOptions({trimPdf:true,trimMarginMm:2}) 同步 UI',
      exp.exportOptions.trimPdf === true && exp.exportOptions.trimMarginMm === 2
      && exp.ui.pdfTrimChecked === true && exp.ui.pdfTrimMarginRowVisible === true
      && exp.ui.pdfTrimMargin && exp.ui.pdfTrimMargin.value === '2',
      { exportOptions: exp.exportOptions, ui: exp.ui });
    ctx.check('导出读数包含「裁剪后」提示',
      /裁剪后/.test(exp.ui.exportReadout || ''), exp.ui.exportReadout);

    const crop = await app.getCropBox(page);
    const trimPdf = await app.exportToFile(page, 'pdf', {
      trimPdf: true, trimMarginMm: 2, dpi: 150, filename: 'fp-v13-trim',
    }, ctx.exportsDir);
    const trimVerify = verifyExport('pdf', trimPdf.path, {
      expectWidthMm: round(crop.wMm), expectHeightMm: round(crop.hMm), expectPages: 1,
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v13-trim', renderDpi: 72,
      tolerancePt: 3,
    });
    addExportEvidence(ctx, {
      label: 'PDF 裁剪白边（API）', format: 'pdf', filename: trimPdf.filename, path: trimPdf.path,
      size: trimPdf.size, verifierOk: trimVerify.ok, failedChecks: trimVerify.failedChecks,
      verifier: trimVerify.report,
    });
    ctx.check('裁剪 PDF 的 MediaBox=内容 bbox（±1mm）', trimVerify.ok, describeVerify(trimVerify));
    ctx.check('裁剪后尺寸小于整页（宽/高都变小）',
      crop.wMm < geom.widthMm && crop.hMm < geom.heightMm,
      { page: [geom.widthMm, geom.heightMm], crop: [crop.wMm, crop.hMm] });
    const trimDetails = trimVerify.report && trimVerify.report.details;
    ctx.check('裁剪 PDF 页数=1（pdfinfo）',
      !!trimDetails && trimDetails.pageCount === 1 && trimDetails.pageCountSource === 'pdfinfo',
      trimDetails && { pageCount: trimDetails.pageCount, source: trimDetails.pageCountSource });

    // UI 导出（真实点击 #btn-export，下载回退或无头自动 fallback）也应裁剪
    const uiDownload = await waitForDownload(page, () => page.locator('#btn-export').click(), { timeout: 60000 });
    const uiSaved = await saveDownload(uiDownload, 'fp-v13-trim-ui.pdf', { dir: ctx.exportsDir });
    const uiVerify = verifyExport('pdf', uiSaved.path, {
      expectWidthMm: round(crop.wMm), expectHeightMm: round(crop.hMm), expectPages: 1,
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v13-trim-ui', renderDpi: 72,
      tolerancePt: 3,
    });
    ctx.check('UI 导出 PDF 也按裁剪尺寸（下载成功）',
      /\.pdf$/i.test(uiSaved.suggestedFilename) && uiSaved.size > 0 && uiVerify.ok,
      { filename: uiSaved.suggestedFilename, size: uiSaved.size, verifier: describeVerify(uiVerify) });
    addExportEvidence(ctx, {
      label: 'PDF 裁剪白边（UI）', format: 'pdf', filename: uiSaved.filename, path: uiSaved.path,
      size: uiSaved.size, verifierOk: uiVerify.ok, failedChecks: uiVerify.failedChecks,
      verifier: uiVerify.report,
    });

    // 关闭 trim → 恢复整页尺寸
    await app.setExportOptions(page, { trimPdf: false });
    const fullPdf = await app.exportToFile(page, 'pdf', {
      trimPdf: false, dpi: 150, filename: 'fp-v13-full',
    }, ctx.exportsDir);
    const fullVerify = verifyExport('pdf', fullPdf.path, {
      expectWidthMm: round(geom.widthMm), expectHeightMm: round(geom.heightMm), expectPages: 1,
      tolerancePt: 0.8,
    });
    addExportEvidence(ctx, {
      label: 'PDF 未裁剪（trim 关闭，整页尺寸）', format: 'pdf', filename: fullPdf.filename,
      path: fullPdf.path, size: fullPdf.size, verifierOk: fullVerify.ok,
      failedChecks: fullVerify.failedChecks, verifier: fullVerify.report,
    });
    ctx.check('trim 关闭时 PDF 保持原页面尺寸（v1.2 既有 PDF 尺寸测试不被破坏）',
      fullVerify.ok, describeVerify(fullVerify));

    await app.clickFormat(page, 'png');
    exp = await app.getExportUiState(page);
    ctx.check('切回 PNG 后 PDF 裁剪行隐藏', exp.ui.pdfTrimRowVisible === false, exp.ui);

    ctx.evidence.pdfTrim = {
      geom: { w: geom.widthMm, h: geom.heightMm },
      crop0, crop2, crop,
      apiPdf: trimVerify.report && trimVerify.report.details,
      uiPdf: uiVerify.report && uiVerify.report.details,
    };
    await ctx.screenshot('pdf-trim');
    await app.api.clearAll(page);
  },
};

/* ----------------------------- T 滑块数字输入 ----------------------------- */
const rangeNumberScenario = {
  code: 'T',
  name: 'range-num',
  title: '滑块数字输入',
  description: '#cell-zoom-num（20–400%）、#jpg-quality-num（60–100%）、#label-bg-opacity-num（0–100%）直接输入同步滑块与状态；范围夹取；滑块反向同步数字框',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV13(ctx, page))) return;
    await app.api.clearAll(page);
    await app.api.setLayout(page, 3, 2);
    await app.uploadFiles(page, [samplePath('sample-1.png')], 0, 1);
    await app.selectCell(page, 0);

    let state = await app.getNumberInputsState(page);
    ctx.check('三个数字输入存在且 min/max 正确',
      !!state.inputs['cell-zoom-num'] && state.inputs['cell-zoom-num'].min === '20'
      && state.inputs['cell-zoom-num'].max === '400'
      && !!state.inputs['jpg-quality-num'] && state.inputs['jpg-quality-num'].min === '60'
      && state.inputs['jpg-quality-num'].max === '100'
      && !!state.inputs['label-bg-opacity-num'] && state.inputs['label-bg-opacity-num'].min === '0'
      && state.inputs['label-bg-opacity-num'].max === '100',
      state.inputs);

    // 子图缩放数字输入
    await app.setNumberInput(page, '#cell-zoom-num', 250);
    await waitPreview(page, () => window.__FIGPLAY__.getState().cells[0].zoom === 2.5, null, 'zoom 250');
    state = await app.getNumberInputsState(page);
    ctx.check('输入缩放 250% → state.cells[0].zoom=2.5 且滑块同步 250',
      state.state.selectedZoom === 2.5 && state.inputs['cell-zoom'].value === '250'
      && state.inputs['cell-zoom-num'].value === '250',
      { zoom: state.state.selectedZoom, range: state.inputs['cell-zoom'].value });
    await app.setNumberInput(page, '#cell-zoom-num', 999);
    await waitPreview(page, () => window.__FIGPLAY__.getState().cells[0].zoom === 4, null, 'zoom clamp high');
    state = await app.getNumberInputsState(page);
    ctx.check('缩放输入 999% 夹取到 400%（0.2–4）',
      state.state.selectedZoom === 4 && state.inputs['cell-zoom-num'].value === '400'
      && state.inputs['cell-zoom'].value === '400',
      { zoom: state.state.selectedZoom, num: state.inputs['cell-zoom-num'].value });
    await app.setNumberInput(page, '#cell-zoom-num', 5);
    await waitPreview(page, () => Math.abs(window.__FIGPLAY__.getState().cells[0].zoom - 0.2) < 1e-9, null, 'zoom clamp low');
    state = await app.getNumberInputsState(page);
    ctx.check('缩放输入 5% 夹取到 20%',
      Math.abs(state.state.selectedZoom - 0.2) < 1e-9
      && state.inputs['cell-zoom-num'].value === '20',
      { zoom: state.state.selectedZoom, num: state.inputs['cell-zoom-num'].value });

    // JPG 质量数字输入
    await app.setNumberInput(page, '#jpg-quality-num', 75);
    await waitPreview(page, () => Math.abs(window.__FIGPLAY__.getState().export.jpgQuality - 0.75) < 1e-9, null, 'jpg 75');
    state = await app.getNumberInputsState(page);
    ctx.check('输入 JPG 质量 75 → jpgQuality=0.75 且滑块同步 75',
      Math.abs(state.state.jpgQuality - 0.75) < 1e-9
      && state.inputs['jpg-quality'].value === '75' && state.inputs['jpg-quality-num'].value === '75',
      { quality: state.state.jpgQuality, range: state.inputs['jpg-quality'].value });
    await app.setNumberInput(page, '#jpg-quality-num', 10);
    await waitPreview(page, () => Math.abs(window.__FIGPLAY__.getState().export.jpgQuality - 0.6) < 1e-9, null, 'jpg low');
    state = await app.getNumberInputsState(page);
    ctx.check('JPG 质量 10 夹取到 60', Math.abs(state.state.jpgQuality - 0.6) < 1e-9
      && state.inputs['jpg-quality-num'].value === '60', state.state.jpgQuality);
    await app.setNumberInput(page, '#jpg-quality-num', 120);
    await waitPreview(page, () => Math.abs(window.__FIGPLAY__.getState().export.jpgQuality - 1) < 1e-9, null, 'jpg high');
    state = await app.getNumberInputsState(page);
    ctx.check('JPG 质量 120 夹取到 100', Math.abs(state.state.jpgQuality - 1) < 1e-9
      && state.inputs['jpg-quality-num'].value === '100', state.state.jpgQuality);

    // 编号底色不透明度数字输入
    await app.setSelect(page, '#label-bg', 'white');
    await waitPreview(page, () => window.__FIGPLAY__.getState().label.bg === 'white', null, 'label bg white');
    await app.setNumberInput(page, '#label-bg-opacity-num', 40);
    await waitPreview(page, () => Math.abs(window.__FIGPLAY__.getState().label.bgOpacity - 0.4) < 1e-9, null, 'opacity 40');
    state = await app.getNumberInputsState(page);
    ctx.check('输入底色不透明度 40 → bgOpacity=0.4 且滑块同步 40',
      Math.abs(state.state.bgOpacity - 0.4) < 1e-9
      && state.inputs['label-bg-opacity'].value === '40'
      && state.inputs['label-bg-opacity-num'].value === '40',
      { opacity: state.state.bgOpacity, range: state.inputs['label-bg-opacity'].value });
    await app.setNumberInput(page, '#label-bg-opacity-num', -5);
    await waitPreview(page, () => window.__FIGPLAY__.getState().label.bgOpacity === 0, null, 'opacity low');
    state = await app.getNumberInputsState(page);
    ctx.check('不透明度 -5 夹取到 0', state.state.bgOpacity === 0
      && state.inputs['label-bg-opacity-num'].value === '0', state.state.bgOpacity);
    await app.setNumberInput(page, '#label-bg-opacity-num', 150);
    await waitPreview(page, () => window.__FIGPLAY__.getState().label.bgOpacity === 1, null, 'opacity high');
    state = await app.getNumberInputsState(page);
    ctx.check('不透明度 150 夹取到 100', state.state.bgOpacity === 1
      && state.inputs['label-bg-opacity-num'].value === '100', state.state.bgOpacity);

    // 滑块 → 数字框反向同步
    await page.locator('#label-bg-opacity').evaluate((node) => {
      node.value = '30';
      node.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await waitPreview(page, () => Math.abs(window.__FIGPLAY__.getState().label.bgOpacity - 0.3) < 1e-9, null, 'range -> num');
    state = await app.getNumberInputsState(page);
    ctx.check('拖动滑块后数字框反向同步（30）',
      Math.abs(state.state.bgOpacity - 0.3) < 1e-9
      && state.inputs['label-bg-opacity-num'].value === '30',
      { opacity: state.state.bgOpacity, num: state.inputs['label-bg-opacity-num'].value });

    ctx.evidence.rangeNums = {
      state: await page.evaluate(() => {
        const s = window.__FIGPLAY__.getState();
        return {
          zoom: s.cells[0] ? s.cells[0].zoom : null,
          jpgQuality: s.export.jpgQuality,
          bgOpacity: s.label.bgOpacity,
        };
      }),
    };
    await ctx.screenshot('range-number-inputs');
  },
};

/* ----------------------------- U EMF 矢量 PDF（桌面桥 mock） ----------------------------- */
const vectorPdfScenario = {
  code: 'U',
  name: 'vector-pdf',
  title: 'EMF矢量PDF',
  description: '桌面桥 mock fig-imported 带 emfBase64；PDF 下 #vector-pdf-row 显示、getVectorStatus emfCount>0；点导出发送 export-vector-pdf spec（crop/panels[].image.kind=emf/labels）；mock 回 base64 PDF 写入 fake handle；mock 错误回退位图 PDF 且无 pageerror',
  async run(ctx) {
    const { page } = ctx;
    await app.installDesktopBridgeMock(page);
    await app.openAppReady(page);
    if (!(await app.ensureV13(ctx, page))) return;
    await app.api.clearAll(page);
    await app.api.setLayout(page, 1, 2);
    await app.uploadFiles(page, [samplePath('sample-1.png')], 0, 1);

    // 通过桌面桥导入带 EMF 的 .fig
    const figCountBefore = await app.bridgeMessageCount(page, 'import-fig');
    const fakeFig = await app.createFakeFigFile(path.join(ctx.runDir, 'tmp'), 'emf-figure.fig');
    await app.uploadFigFile(page, fakeFig, 1);
    const figRequest = await app.waitFigImportRequest(page, figCountBefore + 1);
    ctx.check('上传 .fig 后 app 发出 import-fig 请求',
      !!figRequest && figRequest.type === 'import-fig',
      figRequest && { requestId: figRequest.requestId, filename: figRequest.filename });
    const emfBase64 = Buffer.from(`FigurePlay-E2E-EMF-MOCK-${'A'.repeat(256)}`).toString('base64');
    const figDataUrl = app.fileToDataUrl(samplePath('sample-2.png'), 'image/png');
    await app.respondFigImported(page, figRequest, {
      dataUrl: figDataUrl, width: 1600, height: 1200,
      sourceFormat: 'MATLAB-FIG', convertMs: 900, matlabVersion: 'R2023b',
      emfBase64,
    });
    try {
      await app.waitFigCell(page, 1, { expectedWidth: 1600, expectedHeight: 1200, timeout: 15000 });
    } catch (err) { /* 断言在下面统一给出 */ }
    const state = await app.api.getState(page);
    const figCell = state.cells[1];
    ctx.check('桌面桥回包后 .fig 成功插入（name→.png、dataUrl 可用）',
      !!figCell && /\.png$/i.test(figCell.name) && figCell.hasData === true,
      figCell && { name: figCell.name, hasData: figCell.hasData });
    fs.rmSync(fakeFig, { force: true });

    const vectorStatus = await app.getVectorStatus(page);
    ctx.check('getVectorStatus：emfCount=1（EMF 已进入单元格）、桌面桥可用、矢量可用',
      vectorStatus.emfCount === 1 && vectorStatus.desktop === true
      && vectorStatus.unsupported === false && vectorStatus.vectorPdf === true,
      vectorStatus);

    await app.clickFormat(page, 'pdf');
    let exp = await app.getExportUiState(page);
    ctx.check('切到 PDF 后 #vector-pdf-row 显示且开关默认勾选',
      exp.ui.vectorPdfRowVisible === true && exp.ui.vectorPdfChecked === true
      && exp.ui.vectorPdfDisabled === false,
      exp.ui);
    ctx.check('矢量 PDF 说明文案可读',
      /矢量/.test(exp.ui.exportNote || ''), exp.ui.exportNote);

    // 生成一个真实 PDF 作为 mock 回包
    const mockPdf = await app.api.exportBase64(page, 'pdf', { dpi: 150, filename: 'fp-v13-vector-mock' });
    ctx.check('生成用于 mock 回包的合法 PDF base64',
      !!mockPdf && typeof mockPdf.base64 === 'string' && /^JVBERi0/.test(mockPdf.base64),
      mockPdf && { filename: mockPdf.filename, base64Length: mockPdf.base64.length });
    const mockPdfBytes = Buffer.from(mockPdf.base64, 'base64').length;

    await app.setNumberInput(page, '#filename-input', 'fp-v13-vector');
    await app.installFakeSavePicker(page, { mode: 'handle' });

    // 第一次导出：矢量成功
    let vecCount = await app.bridgeMessageCount(page, 'export-vector-pdf');
    await page.locator('#btn-export').click();
    const vecRequest = await app.waitVectorExportRequest(page, vecCount + 1);
    ctx.check('点导出后桌面桥收到 export-vector-pdf 请求',
      !!vecRequest && vecRequest.type === 'export-vector-pdf');
    const spec = (vecRequest && vecRequest.spec) || {};
    ctx.check('矢量 spec 含 crop/panels/labels 结构',
      typeof spec.widthMm === 'number' && spec.heightMm > 0
      && Array.isArray(spec.panels) && spec.panels.length >= 1 && Array.isArray(spec.labels),
      { keys: Object.keys(spec || {}), widthMm: spec.widthMm, panels: spec.panels && spec.panels.length });
    const imageKinds = (spec.panels || []).map((panel) => panel.image && panel.image.kind);
    ctx.check('矢量 spec：EMF 面板 image.kind=emf 且 base64 一致',
      imageKinds.indexOf('emf') >= 0
      && (spec.panels || []).some((panel) => panel.image && panel.image.kind === 'emf'
        && panel.image.base64 === emfBase64),
      imageKinds);
    ctx.check('矢量 spec：非 EMF 面板仍以图片进入排版',
      (spec.panels || []).some((panel) => panel.image && panel.image.kind === 'png'
        || (panel.image && panel.image.kind === 'jpeg')),
      imageKinds);
    const previewLabels = (await app.api.getPreviewInfo(page)).labels.map((item) => item.text);
    ctx.check('矢量 spec：labels 与当前页编号一致',
      Array.isArray(spec.labels) && spec.labels.length === previewLabels.length
      && spec.labels.every((label, i) => label.text === previewLabels[i]),
      { spec: (spec.labels || []).map((label) => label.text), preview: previewLabels });
    ctx.check('trim 关闭时 spec.crop=null',
      spec.crop === null || spec.crop === undefined, spec.crop);

    await app.respondVectorPdf(page, vecRequest, {
      ok: true, base64: mockPdf.base64, bytes: mockPdfBytes,
      engine: 'PowerPoint', vectorPanels: 1, rasterPanels: 1,
    });
    await app.waitFakeSaveWrites(page, 1, { label: 'vector save write' });
    let fake = await app.getFakeSaveState(page);
    let write = (fake.fake.writes || [])[0] || {};
    const call = (fake.fake.calls || [])[0] || {};
    ctx.check('mock 回 base64 PDF 后写入 fake handle（.pdf、%PDF 头、大小=回包）',
      call.suggestedName === 'fp-v13-vector.pdf'
      && write.size === mockPdfBytes
      && Array.isArray(write.head) && write.head.slice(0, 4).join(',') === '37,80,68,70',
      { suggestedName: call.suggestedName, size: write.size, expected: mockPdfBytes, head: write.head });
    const savedStatus = await app.getExportUiState(page);
    ctx.check('矢量 PDF 保存状态可读（包含「矢量 PDF」/已保存）',
      /矢量 PDF|已保存/.test(savedStatus.ui.statusText || ''), savedStatus.ui.statusText);

    // 第二次导出：mock 错误 → 回退位图 PDF 且写入成功
    vecCount = await app.bridgeMessageCount(page, 'export-vector-pdf');
    await page.locator('#btn-export').click();
    const failRequest = await app.waitVectorExportRequest(page, vecCount + 1);
    await app.respondVectorPdf(page, failRequest, { ok: false, error: 'mock 矢量引擎失败' });
    await app.waitFakeSaveWrites(page, 2, { label: 'vector fallback raster write' });
    fake = await app.getFakeSaveState(page);
    write = (fake.fake.writes || [])[1] || {};
    ctx.check('矢量失败后自动回退位图 PDF 并写入成功',
      fake.fake.writes.length >= 2 && write.head && write.head.slice(0, 4).join(',') === '37,80,68,70'
      && write.size > 0,
      { writes: fake.fake.writes.length, fallback: write });
    await page.waitForTimeout(400);
    const fallbackStatus = await app.getExportUiState(page);
    const fallbackToast = await app.getToast(page);
    ctx.check('矢量失败回退提示可读（状态栏/toast 提示回退，无 pageerror）',
      /回退/.test(fallbackStatus.ui.statusText || '') || /回退/.test(fallbackToast.text || ''),
      { status: fallbackStatus.ui.statusText, toast: fallbackToast.text });

    // 第三次导出：trim 开启 → spec.crop 为内容 bbox
    await app.setExportOptions(page, { trimPdf: true, trimMarginMm: 2 });
    const crop = await app.getCropBox(page);
    vecCount = await app.bridgeMessageCount(page, 'export-vector-pdf');
    await page.locator('#btn-export').click();
    const trimRequest = await app.waitVectorExportRequest(page, vecCount + 1);
    const trimSpec = (trimRequest && trimRequest.spec) || {};
    ctx.check('trim 开启时矢量 spec.crop=内容 bbox（±0.2mm）',
      !!trimSpec.crop && Math.abs(trimSpec.crop.wMm - crop.wMm) < 0.2
      && Math.abs(trimSpec.crop.hMm - crop.hMm) < 0.2,
      { spec: trimSpec.crop, crop });
    await app.respondVectorPdf(page, trimRequest, {
      ok: true, base64: mockPdf.base64, bytes: mockPdfBytes, engine: 'PowerPoint',
    });
    await app.waitFakeSaveWrites(page, 3, { label: 'vector trim write' });
    await app.setExportOptions(page, { trimPdf: false });

    // 关闭矢量开关 / 切回 PNG 后矢量行隐藏
    await app.setCheckbox(page, '#vector-pdf-toggle', false);
    const offStatus = await app.getVectorStatus(page);
    ctx.check('关闭 #vector-pdf-toggle 后 vectorPdf=false、矢量不可用',
      offStatus.vectorPdf === false && offStatus.vectorAvailable === false, offStatus);
    await app.setCheckbox(page, '#vector-pdf-toggle', true);
    await app.clickFormat(page, 'png');
    exp = await app.getExportUiState(page);
    ctx.check('切回 PNG 后 #vector-pdf-row 隐藏', exp.ui.vectorPdfRowVisible === false, exp.ui);

    ctx.evidence.vectorPdf = {
      vectorStatus,
      emfBase64Length: emfBase64.length,
      spec: {
        widthMm: spec.widthMm, heightMm: spec.heightMm,
        panels: (spec.panels || []).map((panel) => ({
          xMm: panel.xMm, yMm: panel.yMm, wMm: panel.wMm, hMm: panel.hMm,
          kind: panel.image && panel.image.kind,
        })),
        labels: spec.labels,
        crop: spec.crop,
      },
      trimCrop: trimSpec.crop || null,
      fallbackToast: fallbackToast.text,
      fallbackStatus: fallbackStatus.ui.statusText,
    };
    await ctx.screenshot('vector-pdf');
    await app.restoreSavePicker(page);
  },
};

export const scenariosV13 = [
  gridCustomScenario,
  saveAsScenario,
  autoPadScenario,
  pdfTrimScenario,
  rangeNumberScenario,
  vectorPdfScenario,
];
