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
  title: 'PDF按墨迹裁剪白边',
  description: '默认 trimPdf=false；trim 按实际墨迹+编号排版盒裁剪，trim=0 保留约 1mm 防裁字安全边距；用户配置 3×2/bc/inset1.5/offsetX1.2/offsetY5/Times9 复现并验证底部编号完整（0.7–1.6mm）；margin/letterbox/trim 0/1/2mm 对比；UI 读数“保留 x mm 安全边距”',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV13(ctx, page))) return;
    if (!(await app.ensureV131(ctx, page))) return;
    if (!(await app.ensureV132(ctx, page))) return;
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
    const content0 = await app.getCropBox(page, 0);
    const content2 = await app.getCropBox(page, 2);
    const ink0 = await app.getInkCropBox(page, 0);
    const ink2 = await app.getInkCropBox(page, 2);
    ctx.evidence.pdfTrim = {
      mode: 'ink', geom: { w: geom.widthMm, h: geom.heightMm },
      contentBox: content0, contentBox2: content2, inkBox: ink0, inkBox2: ink2,
    };

    // 内容盒（旧逻辑）作为对照
    ctx.check('layout.margin=10 时内容 bbox 小于整页（去掉 10mm 白边）',
      content0.wMm < geom.widthMm - 15 && content0.hMm < geom.heightMm - 15
      && content0.xMm >= 9 && content0.yMm >= 9,
      { geom: { w: geom.widthMm, h: geom.heightMm }, content: content0 });
    ctx.check('getCropBox(margin) 按 margin 向四周外扩（±2mm→+4mm）',
      Math.abs(content2.wMm - (content0.wMm + 4)) < 0.3
      && Math.abs(content2.hMm - (content0.hMm + 4)) < 0.3,
      { content0, content2 });

    // v1.3.2：ink crop 已并入编号排版盒并强制 ≥1mm 安全边距（0→1mm）
    ctx.check('trim=0 时 getInkCropBox().marginMm=1（安全边距）',
      ink0.marginMm === 1 && ink2.marginMm === 2,
      { ink0Margin: ink0.marginMm, ink2Margin: ink2.marginMm });
    ctx.check('getInkCropBox 与 getCropBox 并存且 ink 在整页内（含编号盒/安全边距）',
      !!ink0 && ink0.wMm > 0 && ink0.hMm > 0
      && ink0.xMm >= 0 && ink0.yMm >= 0
      && ink0.xMm + ink0.wMm <= geom.widthMm + 0.1
      && ink0.yMm + ink0.hMm <= geom.heightMm + 0.1,
      { geom: { w: geom.widthMm, h: geom.heightMm }, ink: ink0 });
    ctx.check('margin 场景 ink 与内容盒接近（±3mm，含编号盒与 1mm 安全边距）',
      Math.abs(ink0.wMm - content0.wMm) <= 3 && Math.abs(ink0.hMm - content0.hMm) <= 3,
      { content: [content0.wMm, content0.hMm], ink: [ink0.wMm, ink0.hMm] });
    ctx.check('ink margin 0→2mm 时裁剪框每边约扩 1mm（宽高各 +2mm 左右）',
      Math.abs(ink2.wMm - (ink0.wMm + 2)) < 1.0
      && Math.abs(ink2.hMm - (ink0.hMm + 2)) < 1.0,
      { ink0: [ink0.wMm, ink0.hMm], ink2: [ink2.wMm, ink2.hMm] });
    ctx.check('getInkCropBox 返回像素探针信息（inkPx/pagePx）',
      !!ink0.inkPx && !!ink0.pagePx && ink0.inkPx.w > 0 && ink0.pagePx.w > 0,
      { inkPx: ink0.inkPx, pagePx: ink0.pagePx });

    // trim 留边 0：API 导出，PDF MediaBox=ink bbox，四边实际墨迹 ≤1.5mm
    await app.setExportOptions(page, { trimPdf: true, trimMarginMm: 0 });
    exp = await app.getExportUiState(page);
    ctx.check('trim 开关/边距 UI 同步（trimPdf=true, margin=0）',
      exp.exportOptions.trimPdf === true && exp.exportOptions.trimMarginMm === 0
      && exp.ui.pdfTrimChecked === true && exp.ui.pdfTrimMarginRowVisible === true,
      { exportOptions: exp.exportOptions, ui: exp.ui });
    ctx.check('trim=0 显示安全边距提示（#pdf-trim-safety-hint）',
      exp.ui.pdfTrimSafetyHintVisible === true
      && /1\s*mm|安全边距/.test(exp.ui.pdfTrimSafetyHint || ''),
      { visible: exp.ui.pdfTrimSafetyHintVisible, hint: exp.ui.pdfTrimSafetyHint });
    ctx.check('UI 读数按实际内容墨迹 + 保留 1 mm 安全边距',
      /按实际内容墨迹/.test(exp.ui.exportReadout || '')
      && /保留\s*1(?:\.0)?\s*mm\s*安全边距/.test(exp.ui.exportReadout || ''),
      exp.ui.exportReadout);

    const trim0 = await app.exportToFile(page, 'pdf', {
      trimPdf: true, trimMarginMm: 0, dpi: 150, filename: 'fp-v131-margin-trim',
    }, ctx.exportsDir);
    const trim0Verify = verifyExport('pdf', trim0.path, {
      expectWidthMm: round(ink0.wMm), expectHeightMm: round(ink0.hMm), expectPages: 1,
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v131-margin-trim',
      renderDpi: 96, tolerancePt: 3, maxInkMarginMm: 1.6, inkTolerance: 14,
    });
    const trim0Details = (trim0Verify.report && trim0Verify.report.details) || {};
    const trim0Margins = trim0Details.inkMarginsMm || null;
    addExportEvidence(ctx, {
      label: 'PDF 墨迹裁剪（margin=10，留边0→1mm安全边距）', format: 'pdf', filename: trim0.filename,
      path: trim0.path, size: trim0.size, verifierOk: trim0Verify.ok,
      failedChecks: trim0Verify.failedChecks, verifier: trim0Verify.report,
    });
    ctx.check('墨迹裁剪 PDF：MediaBox=ink bbox（±1mm）且四边墨迹 ≤1.6mm',
      trim0Verify.ok, describeVerify(trim0Verify));
    ctx.check('墨迹裁剪 PDF 页数=1（pdfinfo）',
      trim0Details.pageCount === 1 && trim0Details.pageCountSource === 'pdfinfo',
      trim0Details && { pageCount: trim0Details.pageCount, source: trim0Details.pageCountSource });
    ctx.check('trim=0 渲染四边墨迹余量约 1mm（0.7–1.6mm 安全边距）',
      !!trim0Margins && ['top', 'right', 'bottom', 'left']
        .every((side) => trim0Margins[side] >= 0.7 && trim0Margins[side] <= 1.6),
      trim0Margins);
    ctx.check('留边 0 时 ink 尺寸明显小于整页（宽高都变小）',
      ink0.wMm < geom.widthMm - 10 && ink0.hMm < geom.heightMm - 10,
      { page: [geom.widthMm, geom.heightMm], ink: [ink0.wMm, ink0.hMm] });

    // trim 留边 2mm：PDF 尺寸=ink(2mm)，渲染四边余量 ≈2mm（1.2–3.2mm）
    await app.setExportOptions(page, { trimPdf: true, trimMarginMm: 2 });
    const trim2 = await app.exportToFile(page, 'pdf', {
      trimPdf: true, trimMarginMm: 2, dpi: 150, filename: 'fp-v131-margin-trim2',
    }, ctx.exportsDir);
    const trim2Verify = verifyExport('pdf', trim2.path, {
      expectWidthMm: round(ink2.wMm), expectHeightMm: round(ink2.hMm), expectPages: 1,
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v131-margin-trim2',
      renderDpi: 96, tolerancePt: 3, maxInkMarginMm: 2.8, inkTolerance: 14,
    });
    const trim2Details = (trim2Verify.report && trim2Verify.report.details) || {};
    const trim2Margins = trim2Details.inkMarginsMm || null;
    addExportEvidence(ctx, {
      label: 'PDF 墨迹裁剪（margin=10，留边2mm）', format: 'pdf', filename: trim2.filename,
      path: trim2.path, size: trim2.size, verifierOk: trim2Verify.ok,
      failedChecks: trim2Verify.failedChecks, verifier: trim2Verify.report,
    });
    ctx.check('留边 2mm：MediaBox=ink(2)（±1mm）且四边余量 ≤2.8mm',
      trim2Verify.ok, describeVerify(trim2Verify));
    ctx.check('留边 2mm：渲染四边余量约 2mm（1.4–2.6mm）',
      !!trim2Margins && ['top', 'right', 'bottom', 'left'].every((side) =>
        trim2Margins[side] >= 1.4 && trim2Margins[side] <= 2.6),
      trim2Margins);

    // UI 导出同样按 ink（下载路径）
    await app.clickFormat(page, 'pdf');
    await app.setExportOptions(page, { trimPdf: true, trimMarginMm: 2 });
    const uiDownload = await waitForDownload(page, () => page.locator('#btn-export').click(), { timeout: 60000 });
    const uiSaved = await saveDownload(uiDownload, 'fp-v131-ui-trim.pdf', { dir: ctx.exportsDir });
    const uiVerify = verifyExport('pdf', uiSaved.path, {
      expectWidthMm: round(ink2.wMm), expectHeightMm: round(ink2.hMm), expectPages: 1,
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v131-ui-trim',
      renderDpi: 96, tolerancePt: 3, maxInkMarginMm: 2.8, inkTolerance: 14,
    });
    const uiMargins = ((uiVerify.report && uiVerify.report.details) || {}).inkMarginsMm || null;
    addExportEvidence(ctx, {
      label: 'PDF 墨迹裁剪（UI）', format: 'pdf', filename: uiSaved.filename, path: uiSaved.path,
      size: uiSaved.size, verifierOk: uiVerify.ok, failedChecks: uiVerify.failedChecks,
      verifier: uiVerify.report,
    });
    ctx.check('UI 导出 PDF 同样按 ink 裁剪（下载成功、尺寸/余量正确）',
      /\.pdf$/i.test(uiSaved.suggestedFilename) && uiSaved.size > 0 && uiVerify.ok,
      { filename: uiSaved.suggestedFilename, size: uiSaved.size, verifier: describeVerify(uiVerify) });
    ctx.check('UI 裁剪 PDF 四边实测余量约 2mm（1.4–2.6mm）',
      !!uiMargins && ['top', 'right', 'bottom', 'left'].every((side) =>
        uiMargins[side] >= 1.4 && uiMargins[side] <= 2.6),
      uiMargins);

    // trim 关闭：整页尺寸 + 白边保留（margin=10 → 四边余量 ≥5mm）
    await app.setExportOptions(page, { trimPdf: false });
    const fullPdf = await app.exportToFile(page, 'pdf', {
      trimPdf: false, dpi: 150, filename: 'fp-v131-margin-full',
    }, ctx.exportsDir);
    const fullVerify = verifyExport('pdf', fullPdf.path, {
      expectWidthMm: round(geom.widthMm), expectHeightMm: round(geom.heightMm), expectPages: 1,
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v131-margin-full',
      renderDpi: 96, tolerancePt: 0.8, maxInkMarginMm: 100, inkTolerance: 14,
    });
    const fullDetails = (fullVerify.report && fullVerify.report.details) || {};
    const fullMargins = fullDetails.inkMarginsMm || null;
    addExportEvidence(ctx, {
      label: 'PDF 未裁剪（trim 关闭，整页）', format: 'pdf', filename: fullPdf.filename,
      path: fullPdf.path, size: fullPdf.size, verifierOk: fullVerify.ok,
      failedChecks: fullVerify.failedChecks, verifier: fullVerify.report,
    });
    ctx.check('trim 关闭时 PDF 保持原页面尺寸（170×133mm）',
      fullVerify.ok, describeVerify(fullVerify));
    ctx.check('trim 关闭时渲染四边保留 ≥5mm 白边（未裁剪）',
      !!fullMargins && ['top', 'right', 'bottom', 'left']
        .every((side) => fullMargins[side] >= 5),
      fullMargins);
    ctx.check('trim on/off：裁剪后文件与页面显著小于整页（宽高各小 >10mm）',
      trim0.size < fullPdf.size
      && ink0.wMm < geom.widthMm - 10 && ink0.hMm < geom.heightMm - 10,
      { ink: [ink0.wMm, ink0.hMm], page: [geom.widthMm, geom.heightMm],
        sizeBytes: [trim0.size, fullPdf.size] });

    // ---------- letterbox：16:9 面板内放 4:3 图（左右白边；aspect = 8/4.5） ----------
    await app.api.clearAll(page);
    await app.api.setLayout(page, 1, 1);
    await app.setLayoutOptions(page, { margin: 0 });
    await app.setLabelConfig(page, { show: false });
    await app.setNumberInput(page, '#aspect-w', 8);
    await app.setNumberInput(page, '#aspect-h', 4.5);
    await app.waitFor(page, () => {
      const layout = window.__FIGPLAY__.getState().layout;
      return layout.aspectW === 8 && layout.aspectH === 4.5;
    }, null, { timeout: 5000, label: 'aspect 16:9 (8/4.5)' });
    await app.uploadFiles(page, [samplePath('sample-1.png')], 0, 1);
    const geomL = await app.getGeom(page);
    const contentL = await app.getCropBox(page, 0);
    const inkL = await app.getInkCropBox(page, 0);
    ctx.check('letterbox：内容盒≈整页（1 面板铺满）', Math.abs(contentL.wMm - geomL.widthMm) < 0.6
      && Math.abs(contentL.hMm - geomL.heightMm) < 0.6,
    { geom: { w: geomL.widthMm, h: geomL.heightMm }, content: contentL });
    ctx.check('letterbox：ink bbox 去掉左右白边（宽度明显更小 ≥5mm）',
      inkL.wMm < contentL.wMm - 5 && inkL.hMm <= contentL.hMm + 0.05,
      { content: [contentL.wMm, contentL.hMm], ink: [inkL.wMm, inkL.hMm] });

    const lbTrim = await app.exportToFile(page, 'pdf', {
      trimPdf: true, trimMarginMm: 0, dpi: 150, filename: 'fp-v131-letterbox-trim',
    }, ctx.exportsDir);
    const lbTrimVerify = verifyExport('pdf', lbTrim.path, {
      expectWidthMm: round(inkL.wMm), expectHeightMm: round(inkL.hMm), expectPages: 1,
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v131-letterbox-trim',
      renderDpi: 96, tolerancePt: 3, maxInkMarginMm: 1.6, inkTolerance: 14,
    });
    const lbTrimDetails = (lbTrimVerify.report && lbTrimVerify.report.details) || {};
    const lbTrimMargins = lbTrimDetails.inkMarginsMm || null;
    addExportEvidence(ctx, {
      label: 'PDF 墨迹裁剪（letterbox 16:9+4:3）', format: 'pdf', filename: lbTrim.filename,
      path: lbTrim.path, size: lbTrim.size, verifierOk: lbTrimVerify.ok,
      failedChecks: lbTrimVerify.failedChecks, verifier: lbTrimVerify.report,
    });
    ctx.check('letterbox trim：MediaBox=ink bbox（±1mm）且四边墨迹 ≤1.6mm',
      lbTrimVerify.ok, describeVerify(lbTrimVerify));
    ctx.check('letterbox trim：渲染四边余量 ≤1.6mm（左右约 1mm；上下因图片填满页高可为 0）',
      !!lbTrimMargins && ['top', 'right', 'bottom', 'left']
        .every((side) => lbTrimMargins[side] <= 1.6)
      && lbTrimMargins.left >= 0.7 && lbTrimMargins.right >= 0.7,
      lbTrimMargins);

    const lbFull = await app.exportToFile(page, 'pdf', {
      trimPdf: false, dpi: 150, filename: 'fp-v131-letterbox-full',
    }, ctx.exportsDir);
    const lbFullVerify = verifyExport('pdf', lbFull.path, {
      expectWidthMm: round(geomL.widthMm), expectHeightMm: round(geomL.heightMm), expectPages: 1,
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v131-letterbox-full',
      renderDpi: 96, tolerancePt: 0.8, maxInkMarginMm: 100, inkTolerance: 14,
    });
    const lbFullMargins = ((lbFullVerify.report && lbFullVerify.report.details) || {}).inkMarginsMm || null;
    addExportEvidence(ctx, {
      label: 'PDF 未裁剪（letterbox 整页）', format: 'pdf', filename: lbFull.filename,
      path: lbFull.path, size: lbFull.size, verifierOk: lbFullVerify.ok,
      failedChecks: lbFullVerify.failedChecks, verifier: lbFullVerify.report,
    });
    ctx.check('letterbox trim off：整页尺寸且左右保留白边 ≥5mm',
      lbFullVerify.ok && !!lbFullMargins
      && lbFullMargins.left >= 5 && lbFullMargins.right >= 5,
      { margins: lbFullMargins, verifier: describeVerify(lbFullVerify) });
    ctx.check('letterbox trim on/off：裁剪后页面宽度明显更小（>10mm）',
      inkL.wMm < geomL.widthMm - 10 && lbTrim.size < lbFull.size,
      { ink: inkL.wMm, page: geomL.widthMm, sizeBytes: [lbTrim.size, lbFull.size] });

    // ---------- v1.3.2 用户场景：3×2 + 底部编号 bc（防裁 1mm 安全边距） ----------
    await app.api.clearAll(page);
    await app.api.setLayout(page, 3, 2);
    await app.setLayoutOptions(page, { margin: 0, colGap: 2, rowGap: 2 });
    await app.uploadFiles(page, [
      samplePath('sample-1.png'), samplePath('sample-5.png'), samplePath('sample-1.png'),
      samplePath('sample-5.png'), samplePath('sample-1.png'), samplePath('sample-5.png'),
    ], null, 6);
    await app.setLabelConfig(page, {
      show: true, position: 'bc', insetMm: 1.5, offsetXmm: 1.2, offsetYmm: 5,
      fontFamily: 'times', fontSizePt: 9, bg: 'none',
    });
    await page.waitForTimeout(250);
    const geomSafe = await app.getGeom(page);
    const boxesSafe = await app.getLabelBoxes(page);
    const inkSafe0 = await app.getInkCropBox(page, 0);
    const contentSafe = await app.getCropBox(page, 0);
    const boxesInCrop = boxesSafe.every((item) => item.box
      && item.box.x >= inkSafe0.xMm - 0.1
      && item.box.x + item.box.w <= inkSafe0.xMm + inkSafe0.wMm + 0.1
      && item.box.y >= inkSafe0.yMm - 0.1
      && item.box.y + item.box.h <= inkSafe0.yMm + inkSafe0.hMm + 0.1);
    ctx.check('用户配置生效：3×2 六图 + 编号 bc/inset1.5/offsetX1.2/offsetY5/Times9',
      geomSafe.rows === 3 && geomSafe.cols === 2 && boxesSafe.length === 6,
      { geom: geomSafe, labels: boxesSafe.length });
    ctx.check('编号排版盒并入 ink crop（6 个编号 box 全部在 crop 内）',
      boxesInCrop, { crop: inkSafe0, boxes: boxesSafe.map((item) => item.box) });
    ctx.check('trim=0 时安全边距强制为 1mm（getInkCropBox().marginMm=1）',
      inkSafe0.marginMm === 1 && inkSafe0.wMm > 0 && inkSafe0.hMm > 0,
      { marginMm: inkSafe0.marginMm, ink: [inkSafe0.wMm, inkSafe0.hMm], content: contentSafe });

    await app.clickFormat(page, 'pdf');
    await app.setExportOptions(page, { trimPdf: true, trimMarginMm: 0 });
    const safeTrim0 = await app.exportToFile(page, 'pdf', {
      trimPdf: true, trimMarginMm: 0, dpi: 150, filename: 'fp-v132-label-safe-trim0',
    }, ctx.exportsDir);
    const safeTrim0Verify = verifyExport('pdf', safeTrim0.path, {
      expectWidthMm: round(inkSafe0.wMm), expectHeightMm: round(inkSafe0.hMm), expectPages: 1,
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v132-label-safe-trim0',
      renderDpi: 96, tolerancePt: 3, maxInkMarginMm: 1.6, inkTolerance: 14,
    });
    const safeTrim0Details = (safeTrim0Verify.report && safeTrim0Verify.report.details) || {};
    const safeTrim0Margins = safeTrim0Details.inkMarginsMm || null;
    addExportEvidence(ctx, {
      label: 'PDF 编号防裁（用户配置，trim=0→1mm）', format: 'pdf', filename: safeTrim0.filename,
      path: safeTrim0.path, size: safeTrim0.size, verifierOk: safeTrim0Verify.ok,
      failedChecks: safeTrim0Verify.failedChecks, verifier: safeTrim0Verify.report,
    });
    ctx.check('用户配置 trim=0 PDF：MediaBox=ink bbox（±1mm）且四边 ≤1.6mm',
      safeTrim0Verify.ok, describeVerify(safeTrim0Verify));
    ctx.check('用户配置 trim=0：四边墨迹余量 0.7–1.6mm',
      !!safeTrim0Margins && ['top', 'right', 'bottom', 'left']
        .every((side) => safeTrim0Margins[side] >= 0.7 && safeTrim0Margins[side] <= 1.6),
      safeTrim0Margins);
    ctx.check('用户配置 trim=0：底部编号完整（底边余量 ≥0.7mm，非贴边 0）',
      !!safeTrim0Margins && safeTrim0Margins.bottom >= 0.7
      && safeTrim0Details.pageCount === 1,
      { bottom: safeTrim0Margins && safeTrim0Margins.bottom, pageCount: safeTrim0Details.pageCount });

    const inkSafe1 = await app.getInkCropBox(page, 1);
    const safeTrim1 = await app.exportToFile(page, 'pdf', {
      trimPdf: true, trimMarginMm: 1, dpi: 150, filename: 'fp-v132-label-safe-trim1',
    }, ctx.exportsDir);
    const safeTrim1Verify = verifyExport('pdf', safeTrim1.path, {
      expectWidthMm: round(inkSafe1.wMm), expectHeightMm: round(inkSafe1.hMm), expectPages: 1,
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v132-label-safe-trim1',
      renderDpi: 96, tolerancePt: 3, maxInkMarginMm: 1.6, inkTolerance: 14,
    });
    const safeTrim1Margins = ((safeTrim1Verify.report && safeTrim1Verify.report.details) || {}).inkMarginsMm || null;
    addExportEvidence(ctx, {
      label: 'PDF 编号防裁（用户配置，trim=1mm）', format: 'pdf', filename: safeTrim1.filename,
      path: safeTrim1.path, size: safeTrim1.size, verifierOk: safeTrim1Verify.ok,
      failedChecks: safeTrim1Verify.failedChecks, verifier: safeTrim1Verify.report,
    });
    ctx.check('用户配置 trim=1mm：边距仍约 1mm（1mm 即最小值）',
      inkSafe1.marginMm === 1 && safeTrim1Verify.ok
      && !!safeTrim1Margins && ['top', 'right', 'bottom', 'left']
        .every((side) => safeTrim1Margins[side] >= 0.7 && safeTrim1Margins[side] <= 1.6),
      { marginMm: inkSafe1.marginMm, margins: safeTrim1Margins });

    const inkSafe2 = await app.getInkCropBox(page, 2);
    const safeTrim2 = await app.exportToFile(page, 'pdf', {
      trimPdf: true, trimMarginMm: 2, dpi: 150, filename: 'fp-v132-label-safe-trim2',
    }, ctx.exportsDir);
    const safeTrim2Verify = verifyExport('pdf', safeTrim2.path, {
      expectWidthMm: round(inkSafe2.wMm), expectHeightMm: round(inkSafe2.hMm), expectPages: 1,
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v132-label-safe-trim2',
      renderDpi: 96, tolerancePt: 3, maxInkMarginMm: 2.8, inkTolerance: 14,
    });
    const safeTrim2Margins = ((safeTrim2Verify.report && safeTrim2Verify.report.details) || {}).inkMarginsMm || null;
    addExportEvidence(ctx, {
      label: 'PDF 编号防裁（用户配置，trim=2mm）', format: 'pdf', filename: safeTrim2.filename,
      path: safeTrim2.path, size: safeTrim2.size, verifierOk: safeTrim2Verify.ok,
      failedChecks: safeTrim2Verify.failedChecks, verifier: safeTrim2Verify.report,
    });
    ctx.check('用户配置 trim=2mm：上/左/右约 2mm，底部受页面边界最多约 0.8–2.6mm',
      inkSafe2.marginMm === 2 && safeTrim2Verify.ok
      && !!safeTrim2Margins
      && ['top', 'left', 'right'].every((side) =>
        safeTrim2Margins[side] >= 1.4 && safeTrim2Margins[side] <= 2.6)
      && safeTrim2Margins.bottom >= 0.7 && safeTrim2Margins.bottom <= 2.6,
      { marginMm: inkSafe2.marginMm, margins: safeTrim2Margins,
        note: '底部编号排版盒紧贴页面（autoPad 仅留 0.6mm），crop 被页面边界 clamp' });

    await app.clickFormat(page, 'png');
    exp = await app.getExportUiState(page);
    ctx.check('切回 PNG 后 PDF 裁剪行隐藏', exp.ui.pdfTrimRowVisible === false, exp.ui);

    ctx.evidence.pdfTrim = {
      mode: 'ink',
      geom: { w: geom.widthMm, h: geom.heightMm },
      contentBox: content0, contentBox2: content2, inkBox: ink0, inkBox2: ink2,
      trim0: { sizeMm: { w: ink0.wMm, h: ink0.hMm }, marginsMm: trim0Margins, bytes: trim0.size },
      trim2: { sizeMm: { w: ink2.wMm, h: ink2.hMm }, marginsMm: trim2Margins, bytes: trim2.size },
      uiTrim: { marginsMm: uiMargins, bytes: uiSaved.size },
      full: { sizeMm: { w: geom.widthMm, h: geom.heightMm }, marginsMm: fullMargins, bytes: fullPdf.size },
      letterbox: {
        geom: { w: geomL.widthMm, h: geomL.heightMm },
        content: contentL, ink: inkL,
        trim: { marginsMm: lbTrimMargins, bytes: lbTrim.size },
        full: { marginsMm: lbFullMargins, bytes: lbFull.size },
      },
      labelSafe: {
        geom: geomSafe,
        boxes: boxesSafe.map((item) => item.box),
        content: contentSafe,
        ink0: inkSafe0, ink1: inkSafe1, ink2: inkSafe2,
        margins0: safeTrim0Margins, margins1: safeTrim1Margins, margins2: safeTrim2Margins,
        bytes: [safeTrim0.size, safeTrim1.size, safeTrim2.size],
      },
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
    if (!(await app.ensureV131(ctx, page))) return;
    if (!(await app.ensureV132(ctx, page))) return;
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
    ctx.check('trim 关闭时 spec.crop=null 且 spec.trimMarginMm=1（v1.3.2 安全边距）',
      (spec.crop === null || spec.crop === undefined) && spec.trimMarginMm === 1,
      { crop: spec.crop, trimMarginMm: spec.trimMarginMm });

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

    // 第三次导出：trim 开启 → spec.crop 为实际墨迹 bbox（getInkCropBox）
    await app.setExportOptions(page, { trimPdf: true, trimMarginMm: 2 });
    const inkCrop = await app.getInkCropBox(page);
    const contentCrop = await app.getCropBox(page);
    vecCount = await app.bridgeMessageCount(page, 'export-vector-pdf');
    await page.locator('#btn-export').click();
    const trimRequest = await app.waitVectorExportRequest(page, vecCount + 1);
    const trimSpec = (trimRequest && trimRequest.spec) || {};
    ctx.check('trim 开启时矢量 spec.crop≈getInkCropBox（±0.5mm，按实际墨迹）',
      !!trimSpec.crop && Math.abs(trimSpec.crop.wMm - inkCrop.wMm) < 0.5
      && Math.abs(trimSpec.crop.hMm - inkCrop.hMm) < 0.5
      && Math.abs(trimSpec.crop.xMm - inkCrop.xMm) < 0.5
      && Math.abs(trimSpec.crop.yMm - inkCrop.yMm) < 0.5,
      { spec: trimSpec.crop, inkCrop });
    ctx.check('trim=2 时矢量 spec.trimMarginMm=2（与 getInkCropBox(2) 一致）',
      trimSpec.trimMarginMm === 2 && inkCrop.marginMm === 2,
      { specMarginMm: trimSpec.trimMarginMm, inkMarginMm: inkCrop.marginMm });
    ctx.check('trim 开启时矢量 spec.crop 来自 ink 检测（含 inkPx/pagePx，而非内容盒）',
      !!trimSpec.crop && !!trimSpec.crop.inkPx && !!trimSpec.crop.pagePx
      && trimSpec.crop.inkPx.w > 0 && trimSpec.crop.inkPx.h > 0
      && Math.abs(trimSpec.crop.pagePx.w - Math.round(trimSpec.widthMm * 96 / 25.4)) <= 2
      && Math.abs(trimSpec.crop.pagePx.h - Math.round(trimSpec.heightMm * 96 / 25.4)) <= 2,
      { specCrop: trimSpec.crop, contentCrop });
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
      trimMarginMm: trimSpec.trimMarginMm,
      inkCrop,
      contentCrop,
      fallbackToast: fallbackToast.text,
      fallbackStatus: fallbackStatus.ui.statusText,
    };
    await ctx.screenshot('vector-pdf');
    await app.restoreSavePicker(page);
  },
};

/* ----------------------------- V 负间距 ----------------------------- */
const negativeGapScenario = {
  code: 'V',
  name: 'negative-gap',
  title: '负间距',
  description: '行/列间距支持 -50～80mm：UI #col-gap/#row-gap min=-50；API setLayoutOptions({colGap,rowGap}) 负值生效/夹取；面板重叠、cellW/页高变化；负间距下 PNG/PDF/trim 导出正常；v1.3.3 选中/悬停描边在 interaction-overlay-layer 最上层不被重叠遮挡，导出 SVG 不含交互元素',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV13(ctx, page))) return;
    if (!(await app.ensureV132(ctx, page))) return;
    if (!(await app.ensureV133(ctx, page))) return;
    await app.api.clearAll(page);
    await app.api.setLayout(page, 2, 2);
    await app.setLayoutOptions(page, { margin: 0, colGap: 0, rowGap: 0 });
    await page.waitForTimeout(150);

    const grid0 = await app.getGridUiState(page);
    const info0 = await app.api.getPreviewInfo(page);
    const geom0 = info0.geom;
    ctx.check('间距输入 min=-50 / max=80（列与行）',
      grid0.colGapMin === '-50' && grid0.colGapMax === '80'
      && grid0.rowGapMin === '-50' && grid0.rowGapMax === '80',
      { col: [grid0.colGapMin, grid0.colGapMax], row: [grid0.rowGapMin, grid0.rowGapMax] });
    ctx.check('初始间距 0：cellW/cellH 基线记录',
      grid0.layout.colGap === 0 && grid0.layout.rowGap === 0
      && geom0.cellW > 0 && geom0.cellH > 0,
      { layout: grid0.layout, cellW: geom0.cellW, cellH: geom0.cellH });

    // UI 输入 -10
    await app.setNumberInput(page, '#col-gap', -10);
    await app.setNumberInput(page, '#row-gap', -10);
    await app.waitFor(page, () => {
      const layout = window.__FIGPLAY__.getState().layout;
      return layout.colGap === -10 && layout.rowGap === -10;
    }, null, { timeout: 5000, label: 'negative gaps -10' });
    const grid1 = await app.getGridUiState(page);
    const info1 = await app.api.getPreviewInfo(page);
    const geom1 = info1.geom;
    const panels1 = info1.panels;
    const p0 = panels1.find((panel) => panel.row === 0 && panel.col === 0);
    const p1 = panels1.find((panel) => panel.row === 0 && panel.col === 1);
    const p2 = panels1.find((panel) => panel.row === 1 && panel.col === 0);
    const overlapX = p0.x + p0.w - p1.x;
    const overlapY = p0.y + p0.h - p2.y;
    ctx.check('UI 输入 -10 同步到 layout 与状态',
      grid1.layout.colGap === -10 && grid1.layout.rowGap === -10
      && grid1.colGapInput === '-10' && grid1.rowGapInput === '-10',
      grid1.layout);
    ctx.check('负列间距使 cellW 增大（0→-10：cellW 85→90 左右）',
      geom1.cellW > geom0.cellW + 3,
      { gap0: geom0.cellW, gapNeg10: geom1.cellW });
    ctx.check('负列间距导致面板水平重叠（≈10mm）',
      overlapX >= 8,
      { overlapX, p0: { x: p0.x, w: p0.w }, p1: { x: p1.x, w: p1.w } });
    ctx.check('负行间距导致面板垂直重叠（≈10mm）',
      overlapY >= 8,
      { overlapY, p0: { y: p0.y, h: p0.h }, p2: { y: p2.y, h: p2.h } });
    ctx.check('页面宽度不变、页高随负行距减小',
      Math.abs(geom1.widthMm - geom0.widthMm) < 1e-6 && geom1.heightMm < geom0.heightMm - 1,
      { w0: geom0.widthMm, w1: geom1.widthMm, h0: geom0.heightMm, h1: geom1.heightMm });

    // API 夹取 -100 → -50；100 → 80
    await app.setLayoutOptions(page, { colGap: -100, rowGap: 100 });
    await page.waitForTimeout(150);
    const grid2 = await app.getGridUiState(page);
    ctx.check('API 间距夹取：-100→-50、100→80',
      grid2.layout.colGap === -50 && grid2.layout.rowGap === 80,
      grid2.layout);
    ctx.check('负间距夹取后 pageerror 仍为 0（诊断见场景诊断）', true);

    // 恢复 -10 并上传图片（导出）
    await app.setLayoutOptions(page, { colGap: -10, rowGap: -10 });
    await page.waitForTimeout(150);
    await app.uploadFiles(page, [
      samplePath('sample-1.png'), samplePath('sample-2.png'),
      samplePath('sample-3.png'), samplePath('sample-4.png'),
    ], null, 4);
    const infoExport = await app.api.getPreviewInfo(page);
    const geomExp = infoExport.geom;
    const px = app.expectedPixelSize(geomExp, 150);

    // ---------- v1.3.3 交互 overlay：负间距重叠下选中/悬停描边在顶层 ----------
    await app.setMultiSelect(page, []);
    await app.clearPreviewHover(page);
    let overlay = await app.getOverlayState(page);
    const overlayChildCount = overlay.children.length;
    ctx.check('v1.3.3：#preview-svg 最后一个子元素是 .interaction-overlay-layer',
      /interaction-overlay-layer/.test(overlay.lastChildClass)
      && overlay.overlayIndex === overlayChildCount - 1
      && overlay.overlayIndex > overlay.cellsIndex
      && overlay.overlayIndex > overlay.groupsIndex
      && overlay.overlayIndex > overlay.labelsIndex,
      { children: overlay.children, lastChildClass: overlay.lastChildClass });
    ctx.check('v1.3.3：overlay 层 pointer-events=none（不拦截交互）',
      overlay.overlayPointerEvents === 'none', overlay.overlayPointerEvents);
    ctx.check('v1.3.3：初始无选中/悬停描边（切换选择前）',
      overlay.selectionOutlines.length === 0 && overlay.hoverOutlines.length === 0,
      { selection: overlay.selectionOutlines.length, hover: overlay.hoverOutlines.length });

    // 选中 panel0：描边在 overlay 层
    await app.selectCell(page, 0);
    overlay = await app.waitOverlayState(page, (state) => state.selectionOutlines.length === 1,
      null, { label: 'selection outline panel0' });
    const panel0Info = panels1.find((panel) => panel.index === 0);
    const selection0 = overlay.selectionOutlines[0];
    const outlineColors = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.display = 'none';
      document.body.appendChild(probe);
      const resolve = (value) => {
        probe.style.color = value;
        return getComputedStyle(probe).color;
      };
      const colors = { selection: resolve('var(--accent)'), hover: resolve('var(--accent-hover)') };
      probe.remove();
      return colors;
    });
    ctx.check('负间距下选中 panel0：.cell-selection-outline 位置/尺寸=panel0 且 stroke 跟随 --accent',
      !!selection0 && Math.abs(selection0.x - panel0Info.x) < 0.05
      && Math.abs(selection0.y - panel0Info.y) < 0.05
      && Math.abs(selection0.w - panel0Info.w) < 0.05
      && Math.abs(selection0.h - panel0Info.h) < 0.05
      && selection0.computedStroke === outlineColors.selection,
      { outline: selection0, panel: panel0Info, expectedStroke: outlineColors.selection });
    ctx.check('选中描边位于顶层 overlay 层内（最后一层，不被重叠子图遮挡）',
      selection0.inOverlay === true && overlay.overlayIndex === overlay.children.length - 1,
      { inOverlay: selection0.inOverlay, overlayIndex: overlay.overlayIndex, childCount: overlay.children.length });

    // 悬停重叠区（panel0∩panel1）→ hover outline 出现且选中描边仍在
    const hoverPoint = await app.hoverPanel(page, 0, 1);
    overlay = await app.waitOverlayState(page,
      (state) => state.selectionOutlines.length === 1 && state.hoverOutlines.length === 1,
      null, { label: 'hover outline overlap' });
    const panel1Info = panels1.find((panel) => panel.index === 1);
    const hover0 = overlay.hoverOutlines[0];
    ctx.check('重叠区悬停产生 .cell-hover-outline（bbox=可见 panel1，虚线 stroke 跟随 --accent-hover）',
      !!hover0 && Math.abs(hover0.x - panel1Info.x) < 0.05
      && Math.abs(hover0.y - panel1Info.y) < 0.05
      && Math.abs(hover0.w - panel1Info.w) < 0.05
      && Math.abs(hover0.h - panel1Info.h) < 0.05
      && hover0.computedStroke === outlineColors.hover
      && String(hover0.strokeDasharray || 'none') !== 'none',
      { hover: hover0, panel: panel1Info, point: hoverPoint, expectedStroke: outlineColors.hover });
    ctx.check('选中+悬停描边同时在 overlay 顶层（互不遮挡）',
      overlay.selectionOutlines.every((outline) => outline.inOverlay)
      && overlay.hoverOutlines.every((outline) => outline.inOverlay)
      && overlay.overlayIndex === overlay.children.length - 1,
      { selection: overlay.selectionOutlines.length, hover: overlay.hoverOutlines.length });

    // 多选：Ctrl+点击 panel2 → 两个 selection outline
    await page.keyboard.down('Control');
    await page.locator('#preview-svg .cell-hit[data-index="2"]').click();
    await page.keyboard.up('Control');
    overlay = await app.waitOverlayState(page, (state) => state.selectionOutlines.length === 2,
      null, { label: 'multi selection outlines' });
    const multiPanels = [0, 2].map((index) => panels1.find((panel) => panel.index === index));
    const multiMatch = multiPanels.every((panel) => overlay.selectionOutlines.some((outline) =>
      Math.abs(outline.x - panel.x) < 0.05 && Math.abs(outline.y - panel.y) < 0.05
      && Math.abs(outline.w - panel.w) < 0.05 && Math.abs(outline.h - panel.h) < 0.05));
    ctx.check('多选 panel0+panel2：overlay 生成 2 个 selection outline 且 bbox 匹配',
      overlay.selectionOutlines.length === 2 && multiMatch,
      { outlines: overlay.selectionOutlines.map((o) => ({ x: o.x, y: o.y, w: o.w, h: o.h })) });
    const overlayEvidence = {
      childClasses: overlay.children.map((item) => item.class),
      lastChildClass: overlay.lastChildClass,
      overlayIndex: overlay.overlayIndex,
      overlayPointerEvents: overlay.overlayPointerEvents,
      singleSelection: selection0,
      hover: hover0,
      multiSelectionCount: overlay.selectionOutlines.length,
    };

    // 切换单选 panel3：只保留 1 个 outline
    await app.selectCell(page, 3);
    overlay = await app.waitOverlayState(page, (state) => state.selectionOutlines.length === 1
      && state.selectedCell === 3, null, { label: 'selection switch panel3' });
    ctx.check('切换选择到 panel3：overlay 仅 1 个 selection outline（旧描边清理）',
      overlay.selectionOutlines.length === 1 && overlay.selectedCell === 3,
      { selectedCell: overlay.selectedCell, outlines: overlay.selectionOutlines.length });

    // 鼠标离开预览 SVG：hover outline 消失、选中描边保留
    await app.clearPreviewHover(page);
    overlay = await app.waitOverlayState(page, (state) => state.hoverOutlines.length === 0,
      null, { label: 'hover cleared' });
    ctx.check('hover 离开 SVG 后 hover outline 消失，selection outline 保留',
      overlay.hoverOutlines.length === 0 && overlay.selectionOutlines.length === 1,
      { hover: overlay.hoverOutlines.length, selection: overlay.selectionOutlines.length });

    // 导出 SVG：交互元素不进入导出（当前有选中+悬停状态）
    await app.selectCell(page, 0);
    await app.hoverPanel(page, 0, 1);
    await app.waitOverlayState(page, (state) => state.hoverOutlines.length === 1,
      null, { label: 'hover before export' });
    await app.waitOverlayState(page, (state) => state.selectionOutlines.length === 1,
      null, { label: 'selection before export' });
    const exportSvg = await app.exportSvgString(page, {
      filename: 'fp-v133-neg-gap-overlay', transparent: false,
    }, ctx.exportsDir);
    const svgText = exportSvg.text || '';
    ctx.check('导出 SVG 不含交互 overlay/选中/悬停元素',
      !/interaction-overlay-layer/.test(svgText)
      && !/cell-selection-outline/.test(svgText)
      && !/cell-hover-outline/.test(svgText)
      && !/class="cell-hit"/.test(svgText)
      && !/class="cell-outline"/.test(svgText)
      && !/is-selected/.test(svgText),
      {
        overlay: /interaction-overlay-layer/.test(svgText),
        selection: /cell-selection-outline/.test(svgText),
        hover: /cell-hover-outline/.test(svgText),
        textLength: svgText.length,
      });
    const exportSvgVerify = verifyExport('svg', exportSvg.path, {
      expectWidthMm: round(geomExp.widthMm), expectHeightMm: round(geomExp.heightMm),
      expectCells: 4, expectImages: 4, expectLabels: 4, expectBg: 'white', tolerance: 0.02,
    });
    addExportEvidence(ctx, {
      label: '负间距+选中/悬停导出 SVG（无交互层）', format: 'svg', filename: exportSvg.filename,
      path: exportSvg.path, size: exportSvg.size, verifierOk: exportSvgVerify.ok,
      failedChecks: exportSvgVerify.failedChecks, verifier: exportSvgVerify.report,
    });
    ctx.check('导出 SVG 结构有效（尺寸/4 cells/4 images/4 labels）',
      exportSvgVerify.ok, describeVerify(exportSvgVerify));
    await ctx.screenshot('negative-gap-overlay');

    const png = await app.exportToFile(page, 'png', { dpi: 150, filename: 'fp-v132-neg-gap' }, ctx.exportsDir);
    const pngVerify = verifyExport('image', png.path, {
      expectWidth: px.width, expectHeight: px.height, expectFormat: 'png', minUniqueColors: 16,
    });
    addExportEvidence(ctx, {
      label: '负间距 PNG（-10/-10）', format: 'image', filename: png.filename, path: png.path,
      size: png.size, widthPx: px.width, heightPx: px.height,
      verifierOk: pngVerify.ok, failedChecks: pngVerify.failedChecks, verifier: pngVerify.report,
    });
    ctx.check('负间距 PNG：像素尺寸=mm/25.4×150 且非空白',
      pngVerify.ok, describeVerify(pngVerify));

    const pdf = await app.exportToFile(page, 'pdf', {
      trimPdf: false, dpi: 150, filename: 'fp-v132-neg-gap',
    }, ctx.exportsDir);
    const pdfVerify = verifyExport('pdf', pdf.path, {
      expectWidthMm: round(geomExp.widthMm), expectHeightMm: round(geomExp.heightMm),
      expectPages: 1, tolerancePt: 0.8,
    });
    addExportEvidence(ctx, {
      label: '负间距 PDF（未裁剪）', format: 'pdf', filename: pdf.filename, path: pdf.path,
      size: pdf.size, verifierOk: pdfVerify.ok, failedChecks: pdfVerify.failedChecks,
      verifier: pdfVerify.report,
    });
    ctx.check('负间距 PDF：整页尺寸正确、页数=1', pdfVerify.ok, describeVerify(pdfVerify));

    const ink = await app.getInkCropBox(page, 0);
    const trim = await app.exportToFile(page, 'pdf', {
      trimPdf: true, trimMarginMm: 0, dpi: 150, filename: 'fp-v132-neg-gap-trim',
    }, ctx.exportsDir);
    const trimVerify = verifyExport('pdf', trim.path, {
      expectWidthMm: round(ink.wMm), expectHeightMm: round(ink.hMm), expectPages: 1,
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v132-neg-gap-trim',
      renderDpi: 96, tolerancePt: 3, maxInkMarginMm: 1.6, inkTolerance: 14,
    });
    const trimDetails = (trimVerify.report && trimVerify.report.details) || {};
    const trimMargins = trimDetails.inkMarginsMm || null;
    addExportEvidence(ctx, {
      label: '负间距 PDF（trim→1mm）', format: 'pdf', filename: trim.filename, path: trim.path,
      size: trim.size, verifierOk: trimVerify.ok, failedChecks: trimVerify.failedChecks,
      verifier: trimVerify.report,
    });
    ctx.check('负间距 trim PDF：MediaBox=ink bbox（±1mm）且四边 ≤1.6mm',
      ink.marginMm === 1 && trimVerify.ok, describeVerify(trimVerify));
    ctx.check('负间距 trim PDF：四边墨迹余量 ≤1.6mm（贴边侧允许 0）',
      !!trimMargins && ['top', 'right', 'bottom', 'left']
        .every((side) => trimMargins[side] <= 1.6),
      trimMargins);

    // 切换模板 / 页后 overlay 重建，不残留过期描边
    await app.applyTemplate(page, 'double-2x3');
    await app.waitFor(page, () => {
      const geom = window.__FIGPLAY__.getPreviewInfo().geom;
      return geom.rows === 2 && geom.cols === 3;
    }, null, { timeout: 6000, label: 'template double-2x3' });
    overlay = await app.getOverlayState(page);
    const livePanels = overlay.cells;
    const outlinesLive = overlay.selectionOutlines.concat(overlay.hoverOutlines);
    ctx.check('切换模板后 overlay 重建仍为 #preview-svg 最后子层',
      /interaction-overlay-layer/.test(overlay.lastChildClass)
      && overlay.overlayIndex === overlay.children.length - 1,
      { lastChildClass: overlay.lastChildClass, childCount: overlay.children.length });
    ctx.check('切换模板后无陈旧描边（outline 均对应现存面板）',
      outlinesLive.every((outline) => livePanels.some((panel) =>
        Math.abs(outline.x - panel.x) < 0.05 && Math.abs(outline.y - panel.y) < 0.05
        && Math.abs(outline.w - panel.w) < 0.05 && Math.abs(outline.h - panel.h) < 0.05)),
      { outlines: outlinesLive.length, panels: livePanels.length });
    await app.addPage(page, 'new');
    await app.setPage(page, 1);
    await app.setPage(page, 0);
    await page.waitForTimeout(150);
    overlay = await app.getOverlayState(page);
    ctx.check('切换页后 overlay 仍为最后子层，描边不残留过期面板',
      /interaction-overlay-layer/.test(overlay.lastChildClass)
      && overlay.overlayIndex === overlay.children.length - 1
      && overlay.selectionOutlines.concat(overlay.hoverOutlines).every((outline) => outline.inOverlay),
      { lastChildClass: overlay.lastChildClass, selection: overlay.selectionOutlines.length });

    ctx.evidence.negativeGap = {
      base: { gap: [0, 0], geom: geom0, cellW: geom0.cellW, cellH: geom0.cellH },
      negative: {
        gap: [-10, -10], geom: geom1, cellW: geom1.cellW, cellH: geom1.cellH,
        overlapX, overlapY, panels: panels1.map((panel) => ({
          index: panel.index, x: panel.x, y: panel.y, w: panel.w, h: panel.h,
        })),
      },
      clamped: grid2.layout,
      exports: {
        png: { size: png.size, px: [px.width, px.height], ok: pngVerify.ok },
        pdf: { size: pdf.size, ok: pdfVerify.ok },
        trim: { size: trim.size, ink, margins: trimMargins, ok: trimVerify.ok },
        overlaySvg: { size: exportSvg.size, ok: exportSvgVerify.ok, textLength: exportSvg.text.length },
      },
      overlay: overlayEvidence,
    };
    await ctx.screenshot('negative-gap');
    await app.api.clearAll(page);
  },
};

/* ----------------------------- W 界面外观 ----------------------------- */
function rgbOf(value) {
  const match = /rgba?\(([^)]+)\)/.exec(String(value || ''));
  if (!match) return null;
  const parts = match[1].split(',').map((item) => parseFloat(item));
  if (parts.length < 3 || parts.slice(0, 3).some((item) => !isFinite(item))) return null;
  return parts.slice(0, 3);
}
function luminanceOf(value) {
  const rgb = rgbOf(value);
  if (!rgb) return null;
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function isDarkBg(value) {
  const luminance = luminanceOf(value);
  return luminance !== null && luminance < 110;
}
function isLightBg(value) {
  const luminance = luminanceOf(value);
  return luminance !== null && luminance > 180;
}

const appearanceScenario = {
  code: 'W',
  name: 'appearance',
  title: '界面外观',
  description: '默认跟随系统（emulateMedia dark/light 自动切换）；#btn-appearance 弹层 3 模式 + 7 主题色 active/aria + localStorage reload 保留；深色下 body/panel/帮助弹窗/输入框深色、figure-shell 预览仍白；浅/深/主题色切换导出 PNG/SVG base64 完全一致、#preview-svg DOM 不变；1000×700 顶栏按钮/popover 不溢出',
  async run(ctx) {
    const { page } = ctx;

    // 1) 默认跟随系统：先模拟系统深色再加载（无 localStorage 偏好）
    await app.emulateColorScheme(page, 'dark');
    await app.openAppReady(page);
    if (!(await app.ensureV134(ctx, page))) return;
    await app.clearAppearanceStorage(page);
    await app.reloadAppReady(page);

    let state = await app.getAppearanceState(page);
    ctx.check('默认无偏好：mode=system、系统深色时 theme=dark',
      state.html.mode === 'system' && state.html.theme === 'dark' && state.mediaDark === true
      && !!state.appearanceApi && state.appearanceApi.mode === 'system'
      && state.appearanceApi.theme === 'dark',
      { html: state.html, api: state.appearanceApi, mediaDark: state.mediaDark });
    ctx.check('默认无外观偏好写入 localStorage',
      state.localStorage.mode === null && state.localStorage.accent === null,
      state.localStorage);
    ctx.check('系统深色下：body/panel/输入框计算背景为深色',
      isDarkBg(state.styles.body && state.styles.body.background)
      && isDarkBg(state.styles.panel && state.styles.panel.background)
      && isDarkBg(state.styles.input && state.styles.input.background),
      {
        body: state.styles.body && state.styles.body.background,
        panel: state.styles.panel && state.styles.panel.background,
        input: state.styles.input && state.styles.input.background,
      });
    ctx.check('系统深色下：预览图稿仍白（figure-shell 背景 + figure-bg 填充）',
      isLightBg(state.styles.figureShell && state.styles.figureShell.background)
      && String(state.figureBgFill || '').toLowerCase() === '#ffffff',
      {
        figureShell: state.styles.figureShell && state.styles.figureShell.background,
        figureBgFill: state.figureBgFill,
      });
    ctx.check('系统深色下 color-scheme=dark',
      /dark/.test(String(state.html.colorScheme || '')), state.html.colorScheme);

    // 2) 系统浅色 → 自动跟随（light）
    await app.emulateColorScheme(page, 'light');
    state = await app.waitAppearanceState(page,
      (value) => value.html.theme === 'light' && value.html.mode === 'system' && value.mediaDark === false,
      null, { label: 'system -> light' });
    ctx.check('系统媒体变浅色时自动跟随：theme=light、mode 仍 system',
      state.html.theme === 'light' && state.html.mode === 'system'
      && state.mediaDark === false && state.appearanceApi.theme === 'light',
      { html: state.html, api: state.appearanceApi });
    ctx.check('浅色下 body/panel/输入框计算背景不是深色',
      isLightBg(state.styles.body && state.styles.body.background)
      && !isDarkBg(state.styles.panel && state.styles.panel.background)
      && !isDarkBg(state.styles.input && state.styles.input.background),
      {
        body: state.styles.body && state.styles.body.background,
        panel: state.styles.panel && state.styles.panel.background,
        input: state.styles.input && state.styles.input.background,
      });

    // 3) 系统再切回深色 → 自动跟随（双向）
    await app.emulateColorScheme(page, 'dark');
    state = await app.waitAppearanceState(page,
      (value) => value.html.theme === 'dark' && value.html.mode === 'system',
      null, { label: 'system -> dark (again)' });
    ctx.check('系统媒体变深色时再次自动跟随（双向）',
      state.html.theme === 'dark' && state.html.mode === 'system' && state.mediaDark === true,
      state.html);

    // 4) 外观菜单 UI
    await app.openAppearanceMenu(page);
    state = await app.getAppearanceState(page);
    ctx.check('#btn-appearance 打开弹层：可见、aria-expanded=true',
      state.popover.hidden === false && state.button.ariaExpanded === 'true'
      && !!state.popover.rect && state.popover.rect.visible === true,
      { popover: state.popover, ariaExpanded: state.button.ariaExpanded });
    ctx.check('弹层 3 个模式按钮（浅色/深色/跟随系统）且 system active/aria-pressed',
      state.modes.length === 3
      && state.modes.map((item) => item.mode).join(',') === 'light,dark,system'
      && state.modes[2].active === true && state.modes[2].ariaPressed === 'true'
      && state.modes[0].active === false && state.modes[1].active === false,
      state.modes);
    ctx.check('弹层 7 个主题色 swatch，默认 blue active/aria-pressed',
      state.accents.length === 7
      && state.accents.map((item) => item.accent).join(',') === 'blue,indigo,teal,emerald,violet,rose,amber'
      && state.accents[0].active === true && state.accents[0].ariaPressed === 'true',
      state.accents);

    // 显式浅色：即使系统深色也保持 light
    await app.clickAppearanceMode(page, 'light');
    state = await app.waitAppearanceState(page, (value) => value.html.mode === 'light'
      && value.html.theme === 'light', null, { label: 'explicit light' });
    ctx.check('点击「浅色」：mode/theme=light 且 active/aria 同步、localStorage 写入 light',
      state.html.mode === 'light' && state.html.theme === 'light'
      && state.modes[0].active === true && state.modes[0].ariaPressed === 'true'
      && state.localStorage.mode === 'light',
      { html: state.html, modes: state.modes, storage: state.localStorage.mode });
    await page.waitForTimeout(200);
    const explicitLight = await app.getAppearanceState(page);
    ctx.check('显式浅色不随系统切换（系统 dark 下仍 light）',
      explicitLight.html.theme === 'light' && explicitLight.html.mode === 'light'
      && explicitLight.mediaDark === true,
      { theme: explicitLight.html.theme, mode: explicitLight.html.mode, mediaDark: explicitLight.mediaDark });

    // 显式深色
    await app.clickAppearanceMode(page, 'dark');
    state = await app.waitAppearanceState(page, (value) => value.html.mode === 'dark'
      && value.html.theme === 'dark', null, { label: 'explicit dark' });
    ctx.check('点击「深色」：mode/theme=dark 且 active/aria 同步',
      state.html.mode === 'dark' && state.html.theme === 'dark'
      && state.modes[1].active === true && state.modes[1].ariaPressed === 'true',
      { html: state.html, modes: state.modes });

    // 切回跟随系统
    await app.clickAppearanceMode(page, 'system');
    state = await app.waitAppearanceState(page, (value) => value.html.mode === 'system',
      null, { label: 'back to system' });
    ctx.check('点击「跟随系统」：mode=system 并解析当前系统深色',
      state.html.mode === 'system'
      && state.html.theme === (state.mediaDark ? 'dark' : 'light'),
      state.html);

    // 关闭弹层（按钮 / Escape / 外部点击）
    await app.closeAppearanceMenu(page);
    state = await app.getAppearanceState(page);
    ctx.check('点击关闭按钮：弹层隐藏、aria-expanded=false',
      state.popover.hidden === true && state.button.ariaExpanded === 'false', state.button);
    await app.openAppearanceMenu(page);
    await page.keyboard.press('Escape');
    await app.waitAppearanceState(page, (value) => value.popover.hidden === true,
      null, { label: 'escape close' });
    ctx.check('按 Escape 关闭弹层', true);
    await app.openAppearanceMenu(page);
    await page.locator('#stage').click({ position: { x: 6, y: 6 } });
    await app.waitAppearanceState(page, (value) => value.popover.hidden === true,
      null, { label: 'outside close' });
    ctx.check('点击弹层外部关闭', true);

    // 5) 7 种主题色
    await app.openAppearanceMenu(page);
    const accentResults = [];
    for (const accent of app.V134_ACCENTS) {
      await app.clickAccent(page, accent);
      state = await app.waitAppearanceState(page, (value, expected) => value.html.accent === expected,
        accent, { label: `accent ${accent}` });
      const active = state.accents.find((item) => item.accent === accent) || {};
      const primaryBg = await page.evaluate(() => {
        const node = document.getElementById('btn-export-top');
        if (!node) return null;
        const style = getComputedStyle(node);
        return style.backgroundImage !== 'none' ? style.backgroundImage : style.backgroundColor;
      });
      accentResults.push({
        accent,
        htmlAccent: state.html.accent,
        cssVar: String(state.cssVars.accent || '').toLowerCase(),
        active: active.active,
        ariaPressed: active.ariaPressed,
        storage: state.localStorage.accent,
        primaryBg,
      });
    }
    const accentsOk = accentResults.every((item) => item.htmlAccent === item.accent
      && item.cssVar === app.V134_ACCENT_HEX[item.accent]
      && item.active === true && item.ariaPressed === 'true'
      && item.storage === item.accent);
    ctx.check('7 种主题色逐个切换：data-accent/--accent/swatch active/aria/localStorage 均正确',
      accentsOk, accentResults);
    ctx.check('主题色变化影响按钮主色（--accent 生效于 UI）',
      new Set(accentResults.map((item) => item.primaryBg)).size >= 5,
      accentResults.map((item) => ({ accent: item.accent, primaryBg: item.primaryBg })));

    // 保留深色 + 紫罗兰，测试 reload 持久化
    await app.clickAppearanceMode(page, 'dark');
    await app.clickAccent(page, 'violet');
    state = await app.waitAppearanceState(page,
      (value) => value.html.theme === 'dark' && value.html.accent === 'violet',
      null, { label: 'dark violet persisted' });
    ctx.check('设置深色+紫罗兰写入 localStorage（themeMode/accent 两个键）',
      state.localStorage.mode === 'dark' && state.localStorage.accent === 'violet',
      state.localStorage);
    await app.closeAppearanceMenu(page);

    // 6) reload 保留（系统改为浅色也不影响显式深色）
    await app.emulateColorScheme(page, 'light');
    await app.reloadAppReady(page);
    state = await app.getAppearanceState(page);
    ctx.check('reload 后保留 mode=dark/accent=violet（系统浅色不覆盖显式深色）',
      state.html.mode === 'dark' && state.html.theme === 'dark' && state.html.accent === 'violet'
      && state.mediaDark === false
      && String(state.cssVars.accent || '').toLowerCase() === app.V134_ACCENT_HEX.violet,
      { html: state.html, mediaDark: state.mediaDark, accentVar: state.cssVars.accent });
    await app.openAppearanceMenu(page);
    state = await app.getAppearanceState(page);
    ctx.check('reload 后弹层 active 状态与持久化一致（深色/紫罗兰）',
      state.modes[1].active === true && state.modes[1].ariaPressed === 'true'
      && state.accents.find((item) => item.accent === 'violet').active === true,
      { modes: state.modes, accents: state.accents.filter((item) => item.active) });

    // 7) 深色下帮助弹窗/输入框/预览
    await page.locator('#btn-help').click();
    await app.waitForDialog(page, '#help-dialog', { open: true, label: 'help-dialog' });
    state = await app.getAppearanceState(page);
    ctx.check('深色下帮助弹窗计算背景为深色、文字为浅色',
      isDarkBg(state.styles.helpDialog && state.styles.helpDialog.background)
      && luminanceOf(state.styles.helpDialog && state.styles.helpDialog.color) > 150,
      state.styles.helpDialog);
    await page.locator('#help-close').click();
    await app.waitForDialog(page, '#help-dialog', { open: false, label: 'help-dialog close' });
    state = await app.getAppearanceState(page);
    ctx.check('深色下输入框/面板背景为深色且预览图稿仍白',
      isDarkBg(state.styles.input && state.styles.input.background)
      && isDarkBg(state.styles.panel && state.styles.panel.background)
      && isLightBg(state.styles.figureShell && state.styles.figureShell.background)
      && String(state.figureBgFill || '').toLowerCase() === '#ffffff',
      {
        input: state.styles.input && state.styles.input.background,
        panel: state.styles.panel && state.styles.panel.background,
        figureShell: state.styles.figureShell && state.styles.figureShell.background,
        figureBg: state.figureBgFill,
      });

    // 8) 1000×700 顶栏按钮/弹层不溢出
    await page.setViewportSize({ width: 1000, height: 700 });
    await app.waitFor(page, () => Math.round(window.innerWidth) === 1000 && Math.round(window.innerHeight) === 700,
      null, { timeout: 6000, label: 'viewport 1000x700' });
    await app.openAppearanceMenu(page);
    state = await app.getAppearanceState(page);
    const btnRect = state.button.rect;
    const popRect = state.popover.rect;
    ctx.check('1000×700：外观按钮可见且完整落在视口内',
      !!btnRect && btnRect.visible && btnRect.left >= 0 && btnRect.top >= 0
      && btnRect.right <= 1000 && btnRect.bottom <= 700,
      btnRect);
    ctx.check('1000×700：popover 完整落在视口内（不溢出）',
      !!popRect && popRect.visible && popRect.left >= 0 && popRect.top >= 0
      && popRect.right <= 1000 && popRect.bottom <= 700,
      popRect);
    ctx.check('1000×700：页面无横向溢出',
      Math.max(state.viewport.bodyScrollWidth, state.viewport.docScrollWidth)
        <= state.viewport.innerWidth + 1,
      state.viewport);
    await app.closeAppearanceMenu(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await app.waitFor(page, () => Math.round(window.innerWidth) === 1440, null,
      { timeout: 6000, label: 'viewport 1440x900' });

    // 9) 导出隔离 + 预览 DOM 不变
    await app.api.clearAll(page);
    await app.api.setLayout(page, 2, 2);
    await app.uploadFiles(page, [samplePath('sample-1.png'), samplePath('sample-2.png')], null, 2);
    await app.setNumberInput(page, '#filename-input', 'appearance-isolation');
    await app.waitHistoryCommit(page);
    await app.clearPreviewHover(page);

    async function captureAppearance(label) {
      await app.clearPreviewHover(page);
      const snapshot = await app.getAppearanceState(page);
      const png = await app.getExportBase64(page, 'png', { dpi: 150, filename: 'appearance-isolation' });
      const svg = await app.getExportBase64(page, 'svg', { filename: 'appearance-isolation', transparent: false });
      return {
        label, html: snapshot.html, preview: snapshot.preview, project: snapshot.project,
        history: snapshot.history,
        png: { base64: png.base64, filename: png.filename },
        svg: { base64: svg.base64, filename: svg.filename },
      };
    }

    await app.setAppearance(page, 'light', 'blue');
    await app.waitAppearanceState(page, (value) => value.html.theme === 'light'
      && value.html.accent === 'blue', null, { label: 'export light blue' });
    const baseCapture = await captureAppearance('light-blue');
    await app.setAppearance(page, 'dark', 'blue');
    await app.waitAppearanceState(page, (value) => value.html.theme === 'dark',
      null, { label: 'export dark blue' });
    const darkCapture = await captureAppearance('dark-blue');
    await app.setAppearance(page, 'light', 'amber');
    await app.waitAppearanceState(page, (value) => value.html.accent === 'amber',
      null, { label: 'export light amber' });
    const amberCapture = await captureAppearance('light-amber');
    await app.setAppearance(page, 'dark', 'violet');
    await app.waitAppearanceState(page, (value) => value.html.accent === 'violet',
      null, { label: 'export dark violet' });
    const violetCapture = await captureAppearance('dark-violet');

    const captures = [baseCapture, darkCapture, amberCapture, violetCapture];
    const pngEqual = captures.every((item) => item.png.base64 === baseCapture.png.base64
      && item.png.filename === baseCapture.png.filename);
    const svgEqual = captures.every((item) => item.svg.base64 === baseCapture.svg.base64
      && item.svg.filename === baseCapture.svg.filename);
    ctx.check('导出隔离：light/dark/amber/violet 下 PNG base64 完全一致',
      pngEqual, captures.map((item) => ({ label: item.label, filename: item.png.filename, length: item.png.base64.length })));
    ctx.check('导出隔离：light/dark/amber/violet 下 SVG base64 完全一致',
      svgEqual, captures.map((item) => ({ label: item.label, filename: item.svg.filename, length: item.svg.base64.length })));
    ctx.check('外观切换不改变 #preview-svg DOM（innerHTML hash/长度/子层/命中区一致）',
      captures.every((item) => item.preview.hash === baseCapture.preview.hash
        && item.preview.length === baseCapture.preview.length
        && item.preview.childCount === baseCapture.preview.childCount
        && item.preview.cellHits === baseCapture.preview.cellHits),
      captures.map((item) => ({ label: item.label, preview: item.preview })));
    ctx.check('外观切换不改变项目/几何数据（project 签名一致）',
      captures.every((item) => JSON.stringify(item.project) === JSON.stringify(baseCapture.project)),
      captures.map((item) => ({ label: item.label, project: item.project })));
    ctx.check('外观切换不触发历史记录变化（canUndo/canRedo/undoCount 一致）',
      captures.every((item) => JSON.stringify(item.history) === JSON.stringify(baseCapture.history)),
      captures.map((item) => ({ label: item.label, history: item.history })));

    // 外观偏好不写入项目 session
    await page.waitForTimeout(1000);
    const savedProject = await app.readSavedSession(page);
    const savedRaw = JSON.stringify(savedProject && savedProject.payload);
    ctx.check('外观设置不写入项目自动保存（saved payload 无 themeMode/accent 字段）',
      !!savedProject && !/themeMode|"accent"|figureplay\.accent/.test(savedRaw)
      && (savedProject.pages || []).length >= 1,
      { pages: savedProject && savedProject.pages && savedProject.pages.length,
        hasThemeKeys: /themeMode|"accent"/.test(savedRaw) });

    // 多页状态不受外观影响
    await app.addPage(page, 'new');
    await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageCount === 2,
      null, { label: 'appearance pages 2' });
    const pagesBefore = await app.api.getState(page);
    await app.setAppearance(page, 'light', 'rose');
    await app.setAppearance(page, 'dark', 'teal');
    const pagesAfter = await app.api.getState(page);
    ctx.check('外观设置不影响多页状态（pageCount/pageIndex/页面名不变）',
      pagesBefore.pageCount === pagesAfter.pageCount
      && pagesBefore.pageIndex === pagesAfter.pageIndex
      && JSON.stringify((pagesBefore.pages || []).map((p) => p.name))
        === JSON.stringify((pagesAfter.pages || []).map((p) => p.name)),
      { before: { pageCount: pagesBefore.pageCount, pageIndex: pagesBefore.pageIndex },
        after: { pageCount: pagesAfter.pageCount, pageIndex: pagesAfter.pageIndex } });

    // 最终深色+紫罗兰截图（含内容与弹层）
    await app.setPage(page, 0);
    await app.setAppearance(page, 'dark', 'violet');
    await app.openAppearanceMenu(page);
    await ctx.screenshot('appearance-dark');

    ctx.evidence.appearance = {
      systemFollow: {
        darkInitial: { mode: 'system', theme: 'dark', mediaDark: true },
        light: { mode: 'system', theme: 'light', mediaDark: false },
        darkAgain: { mode: 'system', theme: 'dark', mediaDark: true },
      },
      modes: state.modes,
      accents: accentResults,
      persistence: { mode: 'dark', accent: 'violet', afterReload: state.html },
      darkStyles: {
        body: state.styles.body && state.styles.body.background,
        panel: state.styles.panel && state.styles.panel.background,
        input: state.styles.input && state.styles.input.background,
        helpDialog: state.styles.helpDialog && state.styles.helpDialog.background,
        figureShell: state.styles.figureShell && state.styles.figureShell.background,
        figureBgFill: state.figureBgFill,
      },
      viewport: state.viewport,
      exportIsolation: {
        pngEqual, svgEqual,
        pngFilename: baseCapture.png.filename,
        pngBase64Length: baseCapture.png.base64.length,
        svgBase64Length: baseCapture.svg.base64.length,
        previewHash: baseCapture.preview.hash,
        variants: captures.map((item) => item.label),
      },
      pagesUnaffected: { count: pagesAfter.pageCount, index: pagesAfter.pageIndex },
    };
    await app.api.clearAll(page);
  },
};

/* ----------------------------- X 配置模板 ----------------------------- */
const configProfileScenario = {
  code: 'X',
  name: 'config-profiles',
  title: '配置模板',
  description: '保存当前配置（名称/说明/参数摘要）到 localStorage 并持久；应用配置（有图片 confirm）恢复网格/编号/字体/导出并重排图片；导出 JSON payload（type/schemaVersion/name/description/appVersion/createdAt/layout/label/export，无 cells/dataURL）可重新导入；错误 type/未来 schemaVersion/非法 JSON 中文报错不落盘；API 与主题/历史/自动保存隔离',
  async run(ctx) {
    const { page } = ctx;
    const configItem = (name) => page.locator('#config-list .config-item').filter({ hasText: name }).first();
    const configAction = async (name, action) => {
      await configItem(name).locator(`[data-action="${action}"]`).click();
    };
    const waitDialogClosed = async () => {
      await app.waitFor(page, () => {
        const dialog = document.getElementById('config-dialog');
        return !!dialog && dialog.open === false;
      }, null, { timeout: 6000, label: 'config dialog closed' });
    };
    const waitErrorToast = async (pattern) => {
      await page.waitForFunction((src) => {
        const toast = document.getElementById('toast');
        return !!toast && new RegExp(src).test(toast.textContent || '');
      }, pattern, { timeout: 6000 });
      return app.getToast(page);
    };

    await app.openAppReady(page);
    if (!(await app.ensureV140(ctx, page))) return;
    await app.clearConfigProfiles(page);
    await app.api.clearAll(page);

    // 1) 目标配置：3×2 / 170mm / 列距3 行距1 / 底部编号 Arial 11pt / PDF 300DPI 裁边 1.5mm 矢量
    await app.api.setLayout(page, 3, 2);
    await app.setLayoutOptions(page, { margin: 0, colGap: 3, rowGap: 1 });
    await app.setLabelScheme(page, 'number-dot');
    await app.setNumberInput(page, '#label-start', 2);
    await app.setSelect(page, '#label-font', 'arial');
    await app.setNumberInput(page, '#label-size', 11);
    await app.clickPos(page, 'bc');
    await app.clickFormat(page, 'pdf');
    await app.setNumberInput(page, '#dpi-input', 300);
    await app.setCheckbox(page, '#pdf-trim-toggle', true);
    await app.setNumberInput(page, '#pdf-trim-margin', 1.5);
    await app.setCheckbox(page, '#vector-pdf-toggle', true);
    await page.waitForTimeout(200);

    const target = await app.getConfigSnapshot(page);
    ctx.check('当前配置快照：3×2、170mm、列距3/行距1、Arial 11pt、PDF 300DPI 裁边1.5 矢量',
      target.layout.rows === 3 && target.layout.cols === 2
      && target.layout.widthMm === 170 && target.layout.colGap === 3 && target.layout.rowGap === 1
      && target.label.fontFamily === 'arial' && target.label.fontSizePt === 11
      && target.label.scheme === 'number-dot' && target.label.position === 'bc'
      && target.export.format === 'pdf' && target.export.dpi === 300
      && target.export.trimPdf === true && target.export.trimMarginMm === 1.5
      && target.export.vectorPdf === true,
      { layout: target.layout, label: target.label, export: target.export });

    // 2) 保存当前配置到本机
    await app.openConfigDialog(page, 'save');
    let cfg = await app.getConfigUiState(page);
    ctx.check('配置对话框打开，保存摘要包含当前参数（3 行×2 列/170mm/列距/行距/Arial/PDF/裁边/矢量）',
      cfg.ui.dialogOpen === true
      && /3 行 × 2 列/.test(cfg.ui.saveSummary || '')
      && /170\s*mm/.test(cfg.ui.saveSummary || '')
      && /列距 3 \/ 行距 1 mm/.test(cfg.ui.saveSummary || '')
      && /Arial 11pt/.test(cfg.ui.saveSummary || '')
      && /PDF 300 DPI/.test(cfg.ui.saveSummary || '')
      && /自动裁边\s*1\.5mm/.test(cfg.ui.saveSummary || '')
      && /矢量/.test(cfg.ui.saveSummary || ''),
      cfg.ui.saveSummary);
    await app.setConfigForm(page, {
      name: '3×2 论文模板',
      description: 'Arial 11pt · 底部编号 · 列距3 行距1 · PDF 300DPI 自动裁边1.5mm 矢量',
    });
    cfg = await app.saveCurrentConfig(page);
    ctx.check('保存到本机：#config-count=本机 1 个、localStorage 1 条配置',
      /本机\s*1\s*个/.test(cfg.ui.countText || '') && cfg.storage.length === 1
      && cfg.storage.names[0] === '3×2 论文模板',
      { countText: cfg.ui.countText, storage: cfg.storage.names });
    ctx.check('保存后列表项显示名称/说明/参数摘要',
      cfg.ui.listItems.length === 1
      && cfg.ui.listItems[0].name === '3×2 论文模板'
      && /Arial 11pt/.test(cfg.ui.listItems[0].desc || '')
      && /3 行 × 2 列/.test(cfg.ui.listItems[0].summary || '')
      && cfg.ui.listItems[0].actions.map((item) => item.action).join(',') === 'apply,export,delete',
      cfg.ui.listItems[0]);
    ctx.check('保存状态/提示为「已保存」',
      /已保存/.test(cfg.ui.saveStatus || ''), cfg.ui.saveStatus);
    const storedProfile = cfg.storage.profilesPayload[0] || {};
    ctx.check('localStorage 配置结构完整（type/schemaVersion/name/description/appVersion/createdAt/layout/label/export）',
      storedProfile.type === 'figureplay-config' && storedProfile.schemaVersion === 1
      && storedProfile.name === '3×2 论文模板' && /Arial 11pt/.test(storedProfile.description || '')
      && storedProfile.appVersion === '1.4.0' && !!Date.parse(storedProfile.createdAt || '')
      && storedProfile.layout.rows === 3 && storedProfile.layout.cols === 2
      && storedProfile.label.fontFamily === 'arial'
      && storedProfile.export.format === 'pdf',
      storedProfile);
    ctx.check('本机配置存储不含图片/cells/dataURL',
      !/dataUrl|dataURL|cells|base64|image\//.test(String(cfg.storage.raw || '')),
      { length: String(cfg.storage.raw || '').length });
    await app.closeConfigDialog(page);
    await waitDialogClosed();

    // 3) reload 后本机配置仍在（localStorage 持久）
    await app.reloadAppReady(page);
    cfg = await app.getConfigUiState(page);
    ctx.check('reload 后本机配置持久（count=1、名称仍为 3×2 论文模板）',
      /本机\s*1\s*个/.test(cfg.ui.countText || '') && cfg.storage.length === 1
      && cfg.storage.names[0] === '3×2 论文模板',
      { countText: cfg.ui.countText, storage: cfg.storage.names });
    await app.openConfigDialog(page);
    cfg = await app.getConfigUiState(page);
    ctx.check('reload 后列表项/摘要仍可读',
      cfg.ui.listItems.length === 1 && /Arial 11pt/.test(cfg.ui.listItems[0].summary || ''),
      cfg.ui.listItems[0] && cfg.ui.listItems[0].summary);
    await app.closeConfigDialog(page);
    await waitDialogClosed();

    // 4) 修改当前配置 → 有图片时应用保存配置（confirm accept）
    await app.api.clearAll(page);
    await app.api.setLayout(page, 3, 2);
    await app.uploadFiles(page, [samplePath('sample-1.png'), samplePath('sample-2.png')], null, 2);
    const namesBefore = (await app.api.getState(page)).cells.filter(Boolean).map((cell) => cell.name);
    await app.api.setLayout(page, 2, 2);
    await app.setLayoutOptions(page, { colGap: 0, rowGap: 0 });
    await app.setLabelScheme(page, 'alpha-paren');
    await app.clickFormat(page, 'png');
    const confirmMessages = [];
    page.once('dialog', async (dialog) => {
      confirmMessages.push(dialog.message());
      await dialog.accept();
    });
    await app.openConfigDialog(page);
    await configAction('3×2 论文模板', 'apply');
    await waitDialogClosed();
    cfg = await app.waitConfigState(page, (state) => state.ui.activeName === '3×2 论文模板'
      && state.project && state.project.rows === 3 && state.project.cols === 2,
    null, { label: 'apply saved config with confirm' });
    const appliedState = await app.api.getState(page);
    ctx.check('应用配置时有图片且网格变化 → 出现 confirm（重排/可能丢弃提示）并被接受',
      confirmMessages.length === 1 && /重排|丢弃/.test(confirmMessages[0] || ''),
      confirmMessages);
    ctx.check('应用后网格/间距/编号/字体恢复（3×2、列距3、行距1、number-dot、Arial 11pt、bc）',
      appliedState.layout.rows === 3 && appliedState.layout.cols === 2
      && appliedState.layout.colGap === 3 && appliedState.layout.rowGap === 1
      && appliedState.label.scheme === 'number-dot' && appliedState.label.fontFamily === 'arial'
      && appliedState.label.fontSizePt === 11 && appliedState.label.position === 'bc',
      { layout: appliedState.layout, label: appliedState.label });
    ctx.check('应用后导出设置恢复（PDF/300DPI/裁边1.5/矢量）',
      appliedState.export.format === 'pdf' && appliedState.export.dpi === 300
      && appliedState.export.trimPdf === true && appliedState.export.trimMarginMm === 1.5
      && appliedState.export.vectorPdf === true,
      appliedState.export);
    const namesAfter = appliedState.cells.filter(Boolean).map((cell) => cell.name);
    ctx.check('应用配置后图片数量与顺序保持（2 张、按行重排顺序不变）',
      namesAfter.length === 2 && JSON.stringify(namesAfter) === JSON.stringify(namesBefore),
      { before: namesBefore, after: namesAfter });
    ctx.check('应用后左侧「最近应用」显示配置名称/说明',
      cfg.ui.activeVisible === true && cfg.ui.activeName === '3×2 论文模板'
      && /Arial 11pt/.test(cfg.ui.activeDesc || ''),
      { active: cfg.ui.activeName, desc: cfg.ui.activeDesc });

    // 5) 无图片时应用配置不需要 confirm
    await app.api.clearAll(page);
    await app.api.setLayout(page, 2, 2);
    let noConfirmCount = 0;
    page.once('dialog', async (dialog) => { noConfirmCount += 1; await dialog.dismiss(); });
    await app.openConfigDialog(page);
    await configAction('3×2 论文模板', 'apply');
    await waitDialogClosed();
    cfg = await app.waitConfigState(page, (state) => state.project && state.project.rows === 3,
      null, { label: 'apply config without images' });
    ctx.check('无图片时应用配置不弹 confirm 且网格恢复 3×2',
      noConfirmCount === 0 && cfg.project.rows === 3 && cfg.project.cols === 2,
      { noConfirmCount, rows: cfg.project.rows });

    // 6) 导出配置 JSON（UI 下载；关闭原生 picker 以走下载回退）
    await app.openConfigDialog(page);
    cfg = await app.getConfigUiState(page);
    await app.installFakeSavePicker(page, { mode: 'remove' });
    const exportButton = configItem('3×2 论文模板').locator('[data-action="export"]');
    const download = await waitForDownload(page, () => exportButton.click(), { timeout: 30000 });
    const configFile = await saveDownload(download, 'fp-v14-config-export.figureplay.json', { dir: ctx.exportsDir });
    await app.restoreSavePicker(page);
    const configText = fs.readFileSync(configFile.path, 'utf8');
    let configJson = null;
    try { configJson = JSON.parse(configText); } catch (err) { configJson = null; }
    addExportEvidence(ctx, {
      label: '配置模板 JSON（导出）', format: 'json', filename: configFile.filename,
      path: configFile.path, size: configFile.size, verifierOk: true, failedChecks: [],
      verifier: { ok: true, checks: [], details: { schemaVersion: configJson && configJson.schemaVersion } },
    });
    ctx.check('导出 JSON 文件名 .figureplay.json 且为合法 JSON',
      /\.figureplay\.json$/i.test(configFile.suggestedFilename || '') && !!configJson,
      { filename: configFile.suggestedFilename, size: configFile.size });
    ctx.check('导出 payload：type/schemaVersion/name/description/appVersion/createdAt/layout/label/export 完整',
      !!configJson && configJson.type === 'figureplay-config' && configJson.schemaVersion === 1
      && configJson.name === '3×2 论文模板' && /Arial 11pt/.test(configJson.description || '')
      && configJson.appVersion === '1.4.0' && !!Date.parse(configJson.createdAt || '')
      && configJson.layout.rows === 3 && configJson.layout.cols === 2
      && configJson.label.fontFamily === 'arial' && configJson.export.format === 'pdf'
      && Object.keys(configJson).sort().join(',') === 'appVersion,createdAt,description,export,label,layout,name,schemaVersion,type',
      configJson && Object.keys(configJson));
    ctx.check('导出 JSON 不含图片/cells/dataURL/base64',
      !/dataUrl|dataURL|cells|base64|image\//.test(configText),
      { length: configText.length });
    await app.closeConfigDialog(page);
    await waitDialogClosed();

    // 7) 导入 JSON：先显示名称/说明/摘要预览；保存/应用
    await app.api.setLayout(page, 2, 2);
    await app.openConfigDialog(page);
    await app.importConfigFile(page, configFile.path);
    cfg = await app.waitConfigState(page, (state) => state.ui.importPreviewVisible === true,
      null, { label: 'config import preview' });
    ctx.check('导入有效 JSON：先显示预览（名称/说明/参数摘要）且不立即落盘',
      cfg.ui.importName === '3×2 论文模板'
      && /Arial 11pt/.test(cfg.ui.importDesc || '')
      && /3 行 × 2 列/.test(cfg.ui.importSummary || '')
      && /来源版本 1\.4\.0/.test(cfg.ui.importMeta || '')
      && cfg.storage.length === 1 && cfg.ui.importApplyVisible === true
      && cfg.ui.importSaveVisible === true,
      { preview: cfg.ui, storage: cfg.storage.names });
    await page.locator('#config-import-cancel').click();
    cfg = await app.waitConfigState(page, (state) => state.ui.importPreviewVisible === false,
      null, { label: 'import preview cancel' });
    ctx.check('取消导入：预览隐藏、本机配置数量不变',
      cfg.ui.importPreviewVisible === false && cfg.storage.length === 1);

    // 导入后应用
    await app.importConfigFile(page, configFile.path);
    await app.waitConfigState(page, (state) => state.ui.importPreviewVisible === true, null,
      { label: 'import preview again' });
    await page.locator('#config-import-apply').click();
    await waitDialogClosed();
    cfg = await app.waitConfigState(page, (state) => state.project && state.project.rows === 3
      && state.project.cols === 2, null, { label: 'apply imported config' });
    ctx.check('导入预览点「应用此配置」：网格恢复 3×2、配置数量不变',
      cfg.project.rows === 3 && cfg.project.cols === 2 && cfg.storage.length === 1,
      { project: cfg.project, count: cfg.storage.length });

    // 导入后保存到本机
    await app.openConfigDialog(page);
    await app.importConfigFile(page, configFile.path);
    await app.waitConfigState(page, (state) => state.ui.importPreviewVisible === true, null,
      { label: 'import preview for save' });
    await page.locator('#config-import-save').click();
    cfg = await app.waitConfigState(page, (state) => state.storage.length === 2,
      null, { label: 'import save to local' });
    ctx.check('导入后点「保存到本机」：数量 1→2 且 localStorage 持久',
      cfg.storage.length === 2 && /本机\s*2\s*个/.test(cfg.ui.countText || ''),
      { countText: cfg.ui.countText, names: cfg.storage.names });

    // 8) 无效导入：错误 type / 未来 schemaVersion / 非法 JSON
    const invalidDir = path.join(ctx.runDir, 'tmp');
    const badTypeFile = await app.writeConfigJsonFile(invalidDir, 'bad-type.figureplay.json', {
      type: 'not-figureplay', schemaVersion: 1, layout: { rows: 2, cols: 2 },
    });
    const futureFile = await app.writeConfigJsonFile(invalidDir, 'future-version.figureplay.json', {
      type: 'figureplay-config', schemaVersion: 99, layout: { rows: 2, cols: 2 },
    });
    const badJsonFile = await app.writeConfigJsonFile(invalidDir, 'invalid.figureplay.json', '{bad json');
    const invalidCases = [
      { label: '错误 type', file: badTypeFile, pattern: '不是 FigurePlay 配置文件|type' },
      { label: '未来 schemaVersion', file: futureFile, pattern: '版本较新|升级 FigurePlay' },
      { label: '非法 JSON', file: badJsonFile, pattern: 'JSON 解析失败' },
    ];
    const storageBeforeErrors = cfg.storage.raw;
    for (const item of invalidCases) {
      await app.importConfigFile(page, item.file);
      const toast = await waitErrorToast(item.pattern);
      const afterError = await app.getConfigUiState(page);
      ctx.check(`无效导入（${item.label}）：中文错误提示且不落盘`,
        /[\u4e00-\u9fff]/.test(toast.text || '')
        && afterError.storage.length === 2
        && afterError.storage.raw === storageBeforeErrors
        && afterError.ui.importPreviewVisible === false,
        { toast: toast.text, count: afterError.storage.length });
    }
    await app.closeConfigDialog(page);
    await waitDialogClosed();
    await app.clearConfigProfiles(page);

    // 9) 配置 API：getConfigSnapshot / normalizeConfigSnapshot / applyConfigSnapshot
    const apiSnap = await app.getConfigSnapshot(page);
    ctx.check('API getConfigSnapshot 返回 layout/label/export（无 cells/filename）',
      !!apiSnap && JSON.stringify(Object.keys(apiSnap)) === JSON.stringify(['layout', 'label', 'export'])
      && !('cells' in apiSnap) && !('filename' in (apiSnap.export || {})),
      { keys: apiSnap && Object.keys(apiSnap) });
    const normalized = await app.normalizeConfigSnapshot(page, {
      layout: { rows: 2, cols: 2, widthMm: 120, colGap: 0, rowGap: 0 },
      label: { scheme: 'alpha-paren', fontFamily: 'times' },
      export: { format: 'png', dpi: 150, trimPdf: false },
    });
    ctx.check('API normalizeConfigSnapshot：补全/规范化 layout/label/export',
      normalized.layout.rows === 2 && normalized.layout.cols === 2
      && normalized.layout.widthMm === 120 && normalized.label.scheme === 'alpha-paren'
      && normalized.label.fontFamily === 'times' && normalized.export.format === 'png'
      && normalized.export.dpi === 150,
      { layout: normalized.layout, label: normalized.label, export: normalized.export });
    const applied = await app.applyConfigSnapshot(page, {
      layout: { rows: 2, cols: 2, widthMm: 120, colGap: 0, rowGap: 0 },
      label: { scheme: 'alpha-paren', fontFamily: 'times' },
      export: { format: 'png', dpi: 150, trimPdf: false },
    });
    ctx.check('API applyConfigSnapshot：返回 ok/layoutChanged 且网格/编号/导出生效',
      applied.ok === true && applied.layoutChanged === true
      && applied.layout.rows === 2 && applied.label.scheme === 'alpha-paren'
      && applied.export.format === 'png',
      { result: applied });
    const appliedAgain = await app.applyConfigSnapshot(page, {
      layout: { rows: 2, cols: 2, widthMm: 120, colGap: 0, rowGap: 0 },
      label: { scheme: 'alpha-paren', fontFamily: 'times' },
      export: { format: 'png', dpi: 150, trimPdf: false },
    });
    ctx.check('API 重复应用同一配置：layoutChanged=false、dropped=0（无脏变化）',
      appliedAgain.ok === true && appliedAgain.layoutChanged === false
      && appliedAgain.dropped === 0,
      appliedAgain);

    // 10) 配置保存/应用不改变主题/外观；不写入项目自动保存；历史无脏记录
    await app.setAppearance(page, 'dark', 'violet');
    await app.api.clearAll(page);
    await app.api.setLayout(page, 3, 2);
    await app.waitHistoryCommit(page);
    const historyBeforeSave = await app.getHistoryState(page);
    await app.openConfigDialog(page, 'save');
    await app.setConfigForm(page, { name: '主题隔离配置', description: '深色主题下保存' });
    await app.saveCurrentConfig(page);
    await app.closeConfigDialog(page);
    await waitDialogClosed();
    cfg = await app.getConfigUiState(page);
    ctx.check('保存配置不改变主题/外观（仍为 dark + violet）',
      cfg.appearance && cfg.appearance.mode === 'dark' && cfg.appearance.theme === 'dark'
      && cfg.appearance.accent === 'violet' && cfg.htmlTheme === 'dark'
      && cfg.htmlAccent === 'violet',
      { appearance: cfg.appearance, theme: cfg.htmlTheme, accent: cfg.htmlAccent });
    ctx.check('保存配置不新增项目历史记录（undoCount 不变）',
      JSON.stringify(cfg.history) === JSON.stringify(historyBeforeSave),
      { before: historyBeforeSave, after: cfg.history });
    await app.waitForAutosave(page, (saved) => !!saved.currentPage && Array.isArray(saved.pages),
      { timeout: 12000, label: 'project autosave after config save' }).catch(() => null);
    const savedProject = await app.readSavedSession(page);
    const savedRaw = JSON.stringify(savedProject && savedProject.payload);
    ctx.check('项目自动保存 payload 不含配置列表（configProfiles/figureplay-config）',
      !!savedProject && !/configProfiles|figureplay-config/.test(savedRaw)
      && (savedProject.pages || []).length >= 1,
      { pages: savedProject && savedProject.pages && savedProject.pages.length,
        hasConfig: /configProfiles|figureplay-config/.test(savedRaw) });

    // 应用配置：主题不变，历史最多新增 1 步；重复应用同一配置不再新增历史
    await app.setLabelScheme(page, 'number-dot');
    await app.setSelect(page, '#label-font', 'calibri');
    await app.clickFormat(page, 'png');
    await app.waitHistoryCommit(page);
    const historyBeforeApply = await app.getHistoryState(page);
    await app.openConfigDialog(page);
    await configAction('主题隔离配置', 'apply');
    await waitDialogClosed();
    await app.waitHistoryCommit(page);
    let histAfterApply = await app.getHistoryState(page);
    let lookAfterApply = await app.getAppearanceState(page);
    const stateAfterApply = await app.api.getState(page);
    ctx.check('应用配置后主题仍为 dark + violet',
      lookAfterApply.html.theme === 'dark' && lookAfterApply.html.accent === 'violet',
      lookAfterApply.html);
    ctx.check('应用配置恢复保存时参数（3×2 / 编号 alpha-paren / Times / PNG）',
      stateAfterApply.layout.rows === 3 && stateAfterApply.layout.cols === 2
      && stateAfterApply.label.scheme === 'alpha-paren'
      && stateAfterApply.label.fontFamily === 'times'
      && stateAfterApply.export.format === 'png',
      { layout: stateAfterApply.layout, label: stateAfterApply.label, export: stateAfterApply.export });
    ctx.check('应用配置产生的历史记录不超过 1 步（非多步脏记录）',
      histAfterApply.undoCount <= historyBeforeApply.undoCount + 1,
      { before: historyBeforeApply.undoCount, after: histAfterApply.undoCount });
    await app.openConfigDialog(page);
    await configAction('主题隔离配置', 'apply');
    await waitDialogClosed();
    await app.waitHistoryCommit(page);
    const histAfterSame = await app.getHistoryState(page);
    ctx.check('重复应用同一配置不再新增历史（历史去重）',
      histAfterSame.undoCount === histAfterApply.undoCount,
      { first: histAfterApply.undoCount, second: histAfterSame.undoCount });
    const finalCfg = await app.getConfigUiState(page);
    ctx.check('本机配置存储独立于项目（config key 有 1 条、session 不含配置）',
      finalCfg.storage.length === 1 && finalCfg.storage.raw
      && finalCfg.storage.sessionHasConfigKey === false,
      { count: finalCfg.storage.length, sessionHasConfigKey: finalCfg.storage.sessionHasConfigKey });

    // 11) 截图（对话框 + 导入预览）
    await app.openConfigDialog(page);
    await app.importConfigFile(page, configFile.path);
    await app.waitConfigState(page, (state) => state.ui.importPreviewVisible === true, null,
      { label: 'import preview for screenshot' });
    await ctx.screenshot('config-profiles');
    await page.locator('#config-import-cancel').click();
    await app.closeConfigDialog(page);
    await waitDialogClosed();

    ctx.evidence.configProfiles = {
      targetSnapshot: {
        rows: target.layout.rows, cols: target.layout.cols, widthMm: target.layout.widthMm,
        colGap: target.layout.colGap, rowGap: target.layout.rowGap,
        font: target.label.fontFamily, fontSizePt: target.label.fontSizePt,
        scheme: target.label.scheme, position: target.label.position,
        format: target.export.format, dpi: target.export.dpi,
        trimPdf: target.export.trimPdf, trimMarginMm: target.export.trimMarginMm,
        vectorPdf: target.export.vectorPdf,
      },
      exportedJson: configJson
        ? {
          type: configJson.type, schemaVersion: configJson.schemaVersion,
          name: configJson.name, appVersion: configJson.appVersion,
          createdAt: configJson.createdAt, keys: Object.keys(configJson),
        }
        : null,
      importPreview: { name: '3×2 论文模板', summary: /3 行 × 2 列/.test(cfg.ui.importSummary || '') },
      invalidImports: invalidCases.map((item) => item.label),
      history: {
        beforeSave: historyBeforeSave.undoCount,
        afterApply: histAfterApply.undoCount,
        afterSameApply: histAfterSame.undoCount,
      },
      themeIsolation: { theme: 'dark', accent: 'violet' },
      autosaveNoConfig: true,
      appliedImages: { before: namesBefore, after: namesAfter },
    };
    await app.api.clearAll(page);
  },
};

export const scenariosV13 = [
  gridCustomScenario,
  saveAsScenario,
  autoPadScenario,
  pdfTrimScenario,
  rangeNumberScenario,
  vectorPdfScenario,
  negativeGapScenario,
  appearanceScenario,
  configProfileScenario,
];
