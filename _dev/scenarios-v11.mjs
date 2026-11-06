/**
 * FigurePlay v1.1 新功能 E2E 场景（G–K）
 *
 * G 合并单元格 / H 模板 / I 多选批量编号 / J 粘贴小画布 / K 桌面桥 mock
 *
 * 依赖 lib/app.mjs 中的 v1.1 helper；应用未就绪时 ensureV11() 会先失败快速返回，
 * 不会点击空面板触发 v1.0 的文件选择器。
 */
import fs from 'node:fs';
import path from 'node:path';

import * as app from './lib/app.mjs';
import { samplePath } from './lib/browser.mjs';
import { describeVerify, verifyExport } from './lib/verify.mjs';

const TEMPLATE_IDS = [
  'single-1', 'single-2v', 'single-15-2x2',
  'double-2x3', 'double-3x2', 'double-2x2', 'double-1plus3', 'double-left-big',
];

/** v1.1 TEMPLATES 的期望配置（来自 app.js TEMPLATES，逐项精确断言） */
const EXPECTED_TEMPLATES = {
  'single-1': { rows: 1, cols: 1, widthMm: 85, merges: [], fontSize: 8 },
  'single-2v': { rows: 2, cols: 1, widthMm: 85, merges: [], fontSize: 8 },
  'single-15-2x2': { rows: 2, cols: 2, widthMm: 120, merges: [], fontSize: 8.5 },
  'double-2x3': { rows: 2, cols: 3, widthMm: 170, merges: [], fontSize: 9 },
  'double-3x2': { rows: 3, cols: 2, widthMm: 170, merges: [], fontSize: 9 },
  'double-2x2': { rows: 2, cols: 2, widthMm: 170, merges: [], fontSize: 9 },
  'double-1plus3': { rows: 2, cols: 3, widthMm: 170, merges: [{ r: 0, c: 0, rs: 1, cs: 3 }], fontSize: 9 },
  'double-left-big': { rows: 2, cols: 3, widthMm: 170, merges: [{ r: 0, c: 0, rs: 2, cs: 1 }], fontSize: 9 },
};

function normalizeMerges(merges) {
  return (merges || []).map((merge) => ({
    r: Number(merge.r), c: Number(merge.c), rs: Number(merge.rs), cs: Number(merge.cs),
  }));
}

function expectedTemplatePanels(template) {
  const merged = (template.merges || []).reduce((sum, merge) => sum + merge.rs * merge.cs - 1, 0);
  return template.rows * template.cols - merged;
}

function writeJson(ctx, name, data) {
  const filePath = path.join(ctx.runDir, 'json', name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return filePath;
}

function approx(a, b, tol = 0.02) {
  return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tol;
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function diffPanels(actualPanels, expectedPanels, tolerance = 0.02) {
  const diffs = [];
  if (!Array.isArray(actualPanels)) return ['panels 缺失'];
  if (actualPanels.length !== expectedPanels.length) {
    return [`面板数 ${actualPanels.length} != ${expectedPanels.length}`];
  }
  for (let i = 0; i < expectedPanels.length; i++) {
    const expected = expectedPanels[i];
    const actual = actualPanels.find((panel) => panel.index === expected.index)
      || actualPanels[i];
    for (const key of ['row', 'col', 'rowSpan', 'colSpan']) {
      if (Number(actual[key]) !== Number(expected[key])) {
        diffs.push(`panel ${expected.index} ${key}: ${actual[key]} != ${expected[key]}`);
      }
    }
    for (const key of ['x', 'y', 'w', 'h']) {
      if (!approx(Number(actual[key]), expected[key], tolerance)) {
        diffs.push(`panel ${expected.index} ${key}: ${actual[key]} != ${round(expected[key], 3)}`);
      }
    }
  }
  return diffs;
}

function expectedLabelsV11Texts(ctx, expectedLabels) {
  return expectedLabels.map((item) => item.text);
}

function labelsMatch(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  return actual.every((item, i) => item.cellIndex === expected[i].cellIndex && item.text === expected[i].text);
}

async function waitPreview(page, predicate, arg, label, timeout = 10000) {
  await app.waitFor(page, predicate, arg, { timeout, label });
}

/** 导出并通过 Python 校验器验证；返回 {exported, verify} */
async function exportAndVerify(ctx, page, options) {
  const {
    format, filename, overrides, kind, verifyOptions, label,
  } = options;
  const exported = await app.exportToFile(page, format, overrides || null, ctx.exportsDir, filename);
  const verify = verifyExport(kind, exported.path, verifyOptions || {});
  ctx.evidence.exports = ctx.evidence.exports || [];
  ctx.evidence.exports.push({
    label, format, filename: exported.filename, path: exported.path, size: exported.size,
    widthPx: exported.widthPx, heightPx: exported.heightPx,
    verifierOk: verify.ok, failedChecks: verify.failedChecks,
    verifier: verify.report ? { ok: verify.report.ok, checks: verify.report.checks, details: verify.report.details } : null,
  });
  ctx.check(`${label}：文件生成（${format.toUpperCase()}，${exported.size} B）`, exported.size > 0,
    { path: exported.path, size: exported.size });
  ctx.check(`${label}：Python 校验通过`, verify.ok, describeVerify(verify));
  return { exported, verify };
}

/** 预览 SVG 编号相对面板 bbox 的归一化位置 */
function labelNormalizedInPanel(label, panel) {
  const box = label && label.bbox;
  if (!box || !panel) return null;
  return {
    nx: (box.x + box.w / 2 - panel.x) / panel.w,
    ny: (box.y + box.h / 2 - panel.y) / panel.h,
  };
}

/* ----------------------------- G 合并单元格 ----------------------------- */
const mergeScenario = {
  code: 'G',
  name: 'merge-panels',
  title: '合并单元格',
  description: '多选合并/拆分、2×3 首行跨 3 列、合并面板几何/编号位置、导出 SVG clip 几何无重叠 + PNG/PDF 尺寸与像素探针',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV11(ctx, page))) return;

    await app.api.clearAll(page);
    await app.api.setLayout(page, 2, 3);
    await app.setNumberInput(page, '#margin-input', 5);
    await waitPreview(page, () => window.__FIGPLAY__.getState().layout.margin === 5, null, 'margin=5');

    // 1) Ctrl/Shift 点击多选 0,1,2（空面板 plain click 会打开粘贴弹窗，多选必须从第一个面板起按住 Ctrl/Shift）
    await app.clickPanel(page, 0, ['Control']);
    await app.clickPanel(page, 1, ['Control']);
    await app.clickPanel(page, 2, ['Shift']);
    const selected = await app.getMultiSelect(page);
    const controls = await app.getMultiControls(page);
    ctx.check('Ctrl/Shift 点击后 multiSelect = [0,1,2]', JSON.stringify(selected) === JSON.stringify([0, 1, 2]), selected);
    ctx.check('#multi-controls 可见，合并按钮可用',
      controls.visible && !!controls.merge && controls.merge.disabled === false, controls);
    ctx.check('选中面板渲染 .is-selected（3 个）', controls.selectedCount >= 3, controls.selectedCount);

    // 2) 合并 → 首行跨 3 列
    await page.locator('#multi-merge').click();
    await waitPreview(page, () => (window.__FIGPLAY__.getState().layout.merges || []).length === 1, null, 'merge applied');
    let state = await app.api.getState(page);
    let info = await app.getPreviewInfoV11(page);
    let expected = app.computePanelsMm(state.layout);
    ctx.check('layout.merges = [{r:0,c:0,rs:1,cs:3}]',
      JSON.stringify((state.layout.merges || []).map((m) => ({ r: m.r, c: m.c, rs: m.rs, cs: m.cs })))
        === JSON.stringify([{ r: 0, c: 0, rs: 1, cs: 3 }]),
      state.layout.merges);
    ctx.check('合并后面板数 cellCount=4、gridCellCount=6',
      info.panelCount === 4 && info.cellCount === 4 && info.gridCellCount === 6,
      { panelCount: info.panelCount, cellCount: info.cellCount, gridCellCount: info.gridCellCount });
    const panelDiffs = diffPanels(info.panels, expected.panels);
    ctx.check('面板几何与独立复算一致（合并面板宽 = 3 格 + 2 间距）',
      panelDiffs.length === 0 && info.panels[0].w > info.panels[1].w * 2, panelDiffs);
    const mergedPanel = info.panels.find((panel) => panel.index === 0);
    ctx.check('合并面板 rowSpan=1、colSpan=3、merged=true',
      mergedPanel && mergedPanel.rowSpan === 1 && mergedPanel.colSpan === 3 && mergedPanel.merged === true,
      mergedPanel);

    let dom = await app.getPreviewDom(page);
    const hitIndexes = dom.hits.map((hit) => hit.index).sort((a, b) => a - b);
    ctx.check('.cell-hit 只渲染 4 个面板且 data-index 为面板 anchor [0,3,4,5]',
      dom.cellHitCount === 4 && JSON.stringify(hitIndexes) === JSON.stringify([0, 3, 4, 5]),
      { cellHitCount: dom.cellHitCount, hitIndexes });
    ctx.evidence.mergeState = {
      merges: state.layout.merges, panels: info.panels, cellHitCount: dom.cellHitCount,
    };

    // 3) 上传 4 张图（合并面板放深色 sample-6 便于像素探针）
    await app.uploadFiles(page, [
      samplePath('sample-6.png'), samplePath('sample-1.png'),
      samplePath('sample-2.png'), samplePath('sample-3.png'),
    ], null, 4);
    state = await app.api.getState(page);
    info = await app.getPreviewInfoV11(page);
    const expectedLabels = app.expectedLabelsV11(state);
    ctx.check('上传后 4 个面板都有图', info.filled.length === 4, info.filled);
    ctx.check('合并后编号数量/顺序与面板顺序复算一致',
      labelsMatch(info.labels, expectedLabels.labels),
      { actual: info.labels, expected: expectedLabels.labels.map((item) => `${item.cellIndex}:${item.text}`) });

    dom = await app.getPreviewDom(page);
    const mergedLabel = dom.labels[0];
    const normalized = labelNormalizedInPanel(mergedLabel, mergedPanel);
    ctx.check('合并面板的编号位于面板左上区域（tl）',
      !!normalized && normalized.nx < 0.35 && normalized.ny < 0.35, normalized);

    await ctx.screenshot('merge-preview');

    // 4) 导出 SVG：clip 矩形 = 面板几何、互不重叠、编号文字一致
    const clipJson = writeJson(ctx, 'G-clip-rects.json', {
      tolerance: 0.05,
      rects: expected.panels.map((panel) => ({
        x: round(panel.x, 3), y: round(panel.y, 3), w: round(panel.w, 3), h: round(panel.h, 3),
      })),
    });
    const labelTexts = expectedLabels.labels.map((item) => item.text).join('|');
    const svg = await exportAndVerify(ctx, page, {
      format: 'svg', filename: 'fp-v11-merge', kind: 'svg',
      overrides: { transparent: false, filename: 'fp-v11-merge' },
      verifyOptions: {
        expectWidthMm: round(expected.geom.widthMm, 3),
        expectHeightMm: round(expected.geom.heightMm, 3),
        expectCells: 4, expectImages: 4, expectLabels: 4,
        expectLabelTexts: labelTexts,
        expectClipRectsCount: 4, expectNoOverlap: true, expectClipRectsJson: clipJson,
        expectBg: 'white', tolerance: 0.02,
      },
      label: '合并 SVG（2×3 首行跨 3 列）',
    });
    const svgDetails = svg.verify.report && svg.verify.report.details;
    const labelPositions = (svgDetails && svgDetails.labelPositions) || [];
    const firstLabel = labelPositions[0];
    ctx.check('导出 SVG 首条编号位于合并面板内左上',
      !!firstLabel && firstLabel.x >= mergedPanel.x - 0.1 && firstLabel.x <= mergedPanel.x + mergedPanel.w * 0.4
        && firstLabel.y >= mergedPanel.y - 0.1 && firstLabel.y <= mergedPanel.y + mergedPanel.h * 0.5,
      { label: firstLabel, panel: mergedPanel });

    // 5) 导出 PNG：尺寸 = mm/25.4×DPI、白底、像素探针（合并面板中心有图、行间距处白底）
    const geom = expected.geom;
    const dpi = 300;
    const px = (mm) => (mm / 25.4) * dpi;
    const expectedPx = app.expectedPixelSize(geom, dpi);
    const probeJson = writeJson(ctx, 'G-probe-points.json', {
      points: [
        {
          name: '合并面板中心（有图内容）',
          x: px(mergedPanel.x + mergedPanel.w / 2),
          y: px(mergedPanel.y + mergedPanel.h / 2),
          expect: 'nonwhite', tolerance: 15,
        },
        { name: '外边距左上角（白底）', x: 2, y: 2, expect: 'white', tolerance: 6 },
        {
          name: '第一行与第二行之间行间距（白底）',
          x: px(mergedPanel.x + mergedPanel.w / 2),
          y: px(geom.margin + geom.cellH + geom.rowGap / 2),
          expect: 'white', tolerance: 8,
        },
      ],
    });
    const png = await exportAndVerify(ctx, page, {
      format: 'png', filename: 'fp-v11-merge', kind: 'image',
      overrides: { dpi, transparent: false, filename: 'fp-v11-merge' },
      verifyOptions: {
        expectWidth: expectedPx.width, expectHeight: expectedPx.height,
        expectFormat: 'png', expectAlpha: false, expectWhiteCorners: true,
        probePointsJson: probeJson, tolerance: 1,
      },
      label: '合并 PNG 300DPI',
    });
    ctx.check('合并 PNG 像素尺寸 = mm/25.4×300',
      png.exported.widthPx === expectedPx.width && png.exported.heightPx === expectedPx.height,
      { api: [png.exported.widthPx, png.exported.heightPx], expected: [expectedPx.width, expectedPx.height] });

    // 6) 导出 PDF：页面尺寸不变、可渲染（渲染图单独登记并校验白底/非空白）
    const mergePdf = await exportAndVerify(ctx, page, {
      format: 'pdf', filename: 'fp-v11-merge', kind: 'pdf',
      overrides: { dpi: 200, filename: 'fp-v11-merge' },
      verifyOptions: {
        expectPages: 1,
        expectWidthMm: round(geom.widthMm, 3), expectHeightMm: round(geom.heightMm, 3),
        renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v11-merge-pdf',
        renderDpi: 72, tolerancePt: 0.6,
      },
      label: '合并 PDF 200DPI',
    });
    const mergePdfRenderPath = mergePdf.verify.report && mergePdf.verify.report.details
      && mergePdf.verify.report.details.render && mergePdf.verify.report.details.render.path;
    if (mergePdfRenderPath) {
      const renderVerify = verifyExport('image', mergePdfRenderPath, {
        expectFormat: 'png', expectWhiteCorners: true, minUniqueColors: 16, tolerance: 2,
      });
      ctx.evidence.exports.push({
        label: '合并 PDF 渲染图', format: 'png', filename: path.basename(mergePdfRenderPath),
        path: mergePdfRenderPath, size: fs.statSync(mergePdfRenderPath).size,
        verifierOk: renderVerify.ok, failedChecks: renderVerify.failedChecks,
        verifier: renderVerify.report,
      });
      ctx.check('合并 PDF 渲染图非空白且四角白底', renderVerify.ok, describeVerify(renderVerify));
    }

    // 7) 拆分（UI 路径：选中合并面板 → #cell-split）
    const splitButtonState = await page.evaluate(() => {
      const node = document.getElementById('cell-split');
      return node ? { present: true, hidden: node.hidden } : { present: false };
    });
    await app.selectCell(page, 0);
    const splitVisible = await page.evaluate(() => {
      const node = document.getElementById('cell-split');
      return !!node && !node.hidden && node.getBoundingClientRect().width > 0;
    });
    ctx.check('选中合并面板后 #cell-split 拆分按钮可见', splitVisible, splitButtonState);
    await page.locator('#cell-split').click();
    await waitPreview(page, () => (window.__FIGPLAY__.getState().layout.merges || []).length === 0, null, 'split applied');
    state = await app.api.getState(page);
    info = await app.getPreviewInfoV11(page);
    ctx.check('拆分后面板数恢复为 6、merges 清空',
      info.panelCount === 6 && (state.layout.merges || []).length === 0,
      { panelCount: info.panelCount, merges: state.layout.merges });
    ctx.check('拆分后已有 4 张图片保留', info.filled.length === 4, info.filled);
    dom = await app.getPreviewDom(page);
    ctx.check('拆分后 .cell-hit 恢复 6 个', dom.cellHitCount === 6, dom.cellHitCount);

    // 8) 非法合并（L 形）应禁止/提示
    await app.setMultiSelect(page, [0, 1, 3]);
    const invalidControls = await app.getMultiControls(page);
    let invalidToast = '';
    if (invalidControls.merge && invalidControls.merge.disabled === false) {
      try {
        await page.locator('#multi-merge').click({ timeout: 2000 });
      } catch (err) { /* ignore */ }
      invalidToast = await page.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    }
    const invalidMerges = (await app.api.getState(page)).layout.merges || [];
    ctx.check('L 形选择无法合并（按钮禁用或提示且 merges 不变）',
      (invalidControls.merge && invalidControls.merge.disabled === true)
        || /矩形|无法合并|不能合并|合并失败/.test(invalidToast)
        || invalidMerges.length === 0,
      { disabled: invalidControls.merge && invalidControls.merge.disabled, toast: invalidToast, merges: invalidMerges });

    // 9) API 契约：非法选择 / 多图合并 force 语义 / splitPanel 返回值
    const invalidApi = await app.mergePanels(page, [0, 1, 3], { force: true });
    ctx.check('API mergePanels 非法 L 形返回 {ok:false,error}',
      !!invalidApi && invalidApi.ok === false && typeof invalidApi.error === 'string' && invalidApi.error.length > 0,
      invalidApi && { ok: invalidApi.ok, error: invalidApi.error });
    const multiImageGuard = await app.mergePanels(page, [3, 4]);
    ctx.check('API 合并多个有图面板未 force 返回 multiple-images',
      !!multiImageGuard && multiImageGuard.ok === false && multiImageGuard.error === 'multiple-images',
      multiImageGuard && { ok: multiImageGuard.ok, error: multiImageGuard.error });
    const forcedMerge = await app.mergePanels(page, [3, 4], { force: true });
    const forcedInfo = await app.api.getPreviewInfo(page);
    ctx.check('API mergePanels(force:true) 合并成功且面板数=5、merges 含 1×2',
      !!forcedMerge && forcedMerge.ok === true && forcedInfo.cellCount === 5
        && normalizeMerges(forcedInfo.merges).length === 1,
      forcedMerge && { ok: forcedMerge.ok, panelCount: forcedInfo.cellCount, merges: forcedInfo.merges });
    const splitApi = await app.splitPanel(page, 3);
    const afterApiSplit = await app.api.getPreviewInfo(page);
    ctx.check('API splitPanel(3) 返回 ok:true 并恢复 6 面板',
      !!splitApi && splitApi.ok === true && afterApiSplit.cellCount === 6, splitApi && splitApi.ok);

    await app.setMultiSelect(page, []);
    ctx.evidence.screenshot = await ctx.screenshot('merge-final');
  },
};

/* ----------------------------- H 模板 ----------------------------- */
const templateScenario = {
  code: 'H',
  name: 'templates',
  title: '快捷模板',
  description: '一键单栏/双栏 8 个模板：卡片齐全、应用后 rows/cols/widthMm/merges/fontSize 精确一致、已有图片重排/超限丢弃 toast',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV11(ctx, page))) return;

    await app.api.clearAll(page);

    // getTemplates() API 应返回 8 个模板
    const apiTemplates = await app.getTemplates(page);
    const apiIds = (apiTemplates || []).map((item) => item.id);
    ctx.check('getTemplates() API 返回 8 个模板 id',
      apiIds.length === 8 && TEMPLATE_IDS.every((id) => apiIds.indexOf(id) >= 0), apiIds);
    ctx.evidence.templatesApi = apiTemplates;

    await app.openTemplateDialog(page);
    const cards = await app.listTemplateCards(page);
    ctx.check('模板弹窗含 8 个模板卡片',
      cards.length === 8 && TEMPLATE_IDS.every((id) => cards.some((card) => card.template === id)),
      cards);
    await page.keyboard.press('Escape').catch(() => {});
    await app.waitForDialog(page, '#template-dialog', { open: false, label: 'template close' }).catch(() => {});

    const behaviors = {};
    for (const templateId of TEMPLATE_IDS) {
      const expectedTemplate = EXPECTED_TEMPLATES[templateId];
      await app.openTemplateDialog(page);
      const chooseResult = await app.chooseTemplate(page, templateId);
      ctx.check(`${templateId}：模板应用后弹窗关闭`, chooseResult.dialogClosed === true, chooseResult);
      await page.waitForTimeout(250);
      const state = await app.api.getState(page);
      const info = await app.getPreviewInfoV11(page);
      const expected = app.computePanelsMm(state.layout);
      const panelDiffs = diffPanels(info.panels, expected.panels);
      const gridCount = state.layout.rows * state.layout.cols;
      behaviors[templateId] = {
        rows: state.layout.rows, cols: state.layout.cols, widthMm: state.layout.widthMm,
        merges: normalizeMerges(state.layout.merges), panelCount: info.panelCount,
        gridCellCount: info.gridCellCount, fontSize: state.label.fontSizePt,
      };
      ctx.check(`${templateId}：rows/cols/widthMm 精确一致（${expectedTemplate.rows}×${expectedTemplate.cols}, ${expectedTemplate.widthMm}mm）`,
        state.layout.rows === expectedTemplate.rows
          && state.layout.cols === expectedTemplate.cols
          && state.layout.widthMm === expectedTemplate.widthMm,
        { rows: state.layout.rows, cols: state.layout.cols, widthMm: state.layout.widthMm });
      ctx.check(`${templateId}：merges 精确一致`,
        JSON.stringify(normalizeMerges(state.layout.merges))
          === JSON.stringify(expectedTemplate.merges),
        normalizeMerges(state.layout.merges));
      ctx.check(`${templateId}：fontSize = ${expectedTemplate.fontSize}pt`,
        Number(state.label.fontSizePt) === expectedTemplate.fontSize, state.label.fontSizePt);
      ctx.check(`${templateId}：状态自洽（gridCellCount=${gridCount}、面板数=${info.panelCount}）`,
        info.gridCellCount === gridCount && info.panelCount === expectedTemplatePanels(expectedTemplate)
          && panelDiffs.length === 0,
        { layout: { rows: state.layout.rows, cols: state.layout.cols, widthMm: state.layout.widthMm },
          merges: state.layout.merges, panelDiffs });
      if (templateId === 'double-1plus3') {
        const merges = state.layout.merges || [];
        ctx.check('double-1plus3：2×3 网格 + 首行跨 3 列 + 4 个面板',
          state.layout.rows === 2 && state.layout.cols === 3
            && info.panelCount === 4
            && merges.some((merge) => Number(merge.rs) === 1 && Number(merge.cs) === 3),
          { rows: state.layout.rows, cols: state.layout.cols, merges, panelCount: info.panelCount });
      }
      if (templateId === 'double-left-big') {
        const merges = state.layout.merges || [];
        ctx.check('double-left-big：2×3 网格 + 左列跨 2 行 + 5 个面板',
          state.layout.rows === 2 && state.layout.cols === 3
            && info.panelCount === 5
            && merges.some((merge) => Number(merge.rs) === 2 && Number(merge.cs) === 1),
          { rows: state.layout.rows, cols: state.layout.cols, merges, panelCount: info.panelCount });
      }
      ctx.evidence[`template-${templateId}`] = behaviors[templateId];
    }
    ctx.check('单栏模板宽度明显小于双栏模板',
      behaviors['single-1'].widthMm < behaviors['double-2x3'].widthMm,
      { single: behaviors['single-1'].widthMm, double: behaviors['double-2x3'].widthMm });
    ctx.check('single-15-2x2 宽度介于单栏与双栏之间',
      behaviors['single-15-2x2'].widthMm > behaviors['single-1'].widthMm
        && behaviors['single-15-2x2'].widthMm < behaviors['double-2x3'].widthMm,
      { single: behaviors['single-1'].widthMm, oneHalf: behaviors['single-15-2x2'].widthMm,
        double: behaviors['double-2x3'].widthMm });
    await ctx.screenshot('templates-double-1plus3');

    // 已有图片按面板顺序重排；图片多于新面板时丢弃并 toast
    await app.applyTemplate(page, 'double-2x3');
    await app.api.setLayout(page, 3, 2);
    await app.uploadFiles(page, [
      samplePath('sample-1.png'), samplePath('sample-2.png'), samplePath('sample-3.png'),
      samplePath('sample-4.png'), samplePath('sample-5.png'), samplePath('sample-6.png'),
    ], null, 6);
    await app.applyTemplate(page, 'double-1plus3');
    await page.waitForTimeout(300);
    let state = await app.api.getState(page);
    let info = await app.getPreviewInfoV11(page);
    const toastText = await page.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    ctx.check('6 张图 → 4 面板模板：保留 4 张、丢弃 2 张并有 toast 提示',
      info.filled.length === 4 && state.cells.filter(Boolean).length === 4
        && /丢弃|忽略|移除|最多/.test(toastText),
      { filled: info.filled, toast: toastText });
    ctx.check('重排后保留的图片为原顺序前 4 张（按面板顺序）',
      info.filled.map((index) => state.cells[index] && state.cells[index].name)
        .join(',') === 'sample-1.png,sample-2.png,sample-3.png,sample-4.png',
      info.filled.map((index) => state.cells[index] && state.cells[index].name));
    await app.applyTemplate(page, 'single-1');
    await page.waitForTimeout(300);
    info = await app.getPreviewInfoV11(page);
    ctx.check('6 张图 → single-1（1 面板）：只保留 1 张图',
      info.panelCount === 1 && info.filled.length === 1, { panelCount: info.panelCount, filled: info.filled });
    await ctx.screenshot('templates-image-reflow');
  },
};

/* ----------------------------- I 多选批量编号 ----------------------------- */
const batchLabelScenario = {
  code: 'I',
  name: 'batch-label',
  title: '批量编号',
  description: '多选面板批量套用编号（customLabel）：对话框控件/预览、应用到选中面板、预览与 SVG 一致、清除恢复自动',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV11(ctx, page))) return;

    await app.api.clearAll(page);
    await app.api.setLayout(page, 2, 3);
    await app.uploadFiles(page, [
      samplePath('sample-1.png'), samplePath('sample-2.png'), samplePath('sample-3.png'),
    ], null, 3);

    // 多选面板 0,1,2（API 路径 + 控件）
    await app.setMultiSelect(page, [0, 1, 2]);
    const selected = await app.getMultiSelect(page);
    const controls = await app.getMultiControls(page);
    ctx.check('API setMultiSelect([0,1,2]) 生效', JSON.stringify(selected) === JSON.stringify([0, 1, 2]), selected);
    ctx.check('多选后 #multi-controls 可见且批量编号按钮可用',
      controls.visible && !!controls.batchLabel && controls.batchLabel.disabled === false, controls);

    await app.openBatchLabelDialog(page);
    let dialog = await app.getBatchDialogState(page);
    ctx.check('批量编号弹窗打开且控件齐全',
      dialog.open && dialog.scheme != null && dialog.start != null && dialog.preview != null,
      dialog);

    await app.batchSetScheme(page, 'roman-paren');
    await app.batchSetStart(page, 2);
    await page.waitForTimeout(200);
    dialog = await app.getBatchDialogState(page);
    ctx.check('批量编号预览包含起始编号 (ii)',
      /\(ii\)/.test(dialog.preview || ''), dialog.preview);

    await app.batchApply(page);
    await page.waitForTimeout(300);
    const applyDialogState = await app.dialogState(page, '#batch-label-dialog');
    ctx.check('套用编号后弹窗自动关闭', applyDialogState.open !== true, applyDialogState);
    let state = await app.api.getState(page);
    let info = await app.getPreviewInfoV11(page);
    const appliedLabels = [0, 1, 2].map((index) => (state.cells[index] && state.cells[index].customLabel) || '');
    ctx.check('套用后选中面板 customLabel = (ii)/(iii)/(iv)',
      JSON.stringify(appliedLabels) === JSON.stringify(['(ii)', '(iii)', '(iv)']), appliedLabels);
    const expectedLabels = app.expectedLabelsV11(state).labels;
    ctx.check('套用后预览编号与状态一致',
      labelsMatch(info.labels, expectedLabels), { actual: info.labels, expected: expectedLabels });
    let dom = await app.getPreviewDom(page);
    ctx.check('套用后预览 label-text 文字一致',
      JSON.stringify(dom.labels.map((item) => item.text))
        === JSON.stringify(expectedLabels.map((item) => item.text)),
      dom.labels.map((item) => item.text));
    await ctx.screenshot('batch-label-applied');

    // SVG 导出文字与预览一致
    await exportAndVerify(ctx, page, {
      format: 'svg', filename: 'fp-v11-batch-label', kind: 'svg',
      overrides: { transparent: false, filename: 'fp-v11-batch-label' },
      verifyOptions: {
        expectCells: 6, expectImages: 3, expectLabels: expectedLabels.length,
        expectLabelTexts: expectedLabels.map((item) => item.text).join('|'),
        expectBg: 'white', tolerance: 0.02,
      },
      label: '批量编号 SVG',
    });

    // 清除自定义 → 恢复自动编号（#batch-clear 后弹窗会自动关闭）
    await app.openBatchLabelDialog(page);
    await app.batchClear(page);
    await page.waitForTimeout(300);
    const clearDialogState = await app.dialogState(page, '#batch-label-dialog');
    ctx.check('清除自定义编号后弹窗自动关闭', clearDialogState.open !== true, clearDialogState);
    state = await app.api.getState(page);
    info = await app.getPreviewInfoV11(page);
    const clearedLabels = [0, 1, 2].map((index) => (state.cells[index] && state.cells[index].customLabel) || '');
    ctx.check('批量清除后 customLabel 为空',
      clearedLabels.every((value) => String(value).trim() === ''), clearedLabels);
    const autoLabels = app.expectedLabelsV11(state).labels;
    ctx.check('批量清除后恢复自动编号（(a)/(b)/(c)）',
      labelsMatch(info.labels, autoLabels)
        && JSON.stringify(autoLabels.map((item) => item.text)) === JSON.stringify(['(a)', '(b)', '(c)']),
      { labels: info.labels, expected: autoLabels });
    await ctx.screenshot('batch-label-cleared');
  },
};

/* ----------------------------- J 粘贴小画布 ----------------------------- */
const pasteScenario = {
  code: 'J',
  name: 'paste-dialog',
  title: '粘贴画布',
  description: '点击空面板打开 #paste-dialog（不再直接开文件选择器）；合成 paste/拖放/本地文件三种输入、确认填入、继续模式跳下一空面板、双击替换、Esc、全局 Ctrl+V、浏览器模式无剪贴板按钮',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV11(ctx, page))) return;

    await app.api.clearAll(page);
    await app.api.setLayout(page, 2, 3);

    let fileChooserCount = 0;
    page.on('filechooser', () => { fileChooserCount += 1; });

    // 1) 点击空面板 → 打开粘贴弹窗，而不是文件选择器；默认勾选“继续下一个空子图”
    await app.openPasteDialogByEmptyPanel(page, 0);
    let dialog = await app.getPasteDialogState(page);
    ctx.check('点击空面板打开 #paste-dialog（可见、含 #paste-zone）',
      dialog.present && dialog.open && dialog.visible && dialog.zonePresent, {
        open: dialog.open, visible: dialog.visible, zonePresent: dialog.zonePresent,
      });
    ctx.check('点击空面板不再直接触发文件选择器', fileChooserCount === 0, fileChooserCount);
    ctx.check('浏览器模式：DOM 中不存在 #paste-read-clipboard',
      dialog.readClipboardPresent === false, dialog.readClipboardPresent);
    ctx.check('浏览器模式无剪贴板读取按钮', dialog.clipboardButtonCount === 0, dialog.clipboardButtonCount);
    ctx.check('初始状态确认按钮禁用/无预览',
      dialog.confirmDisabled !== false && !dialog.previewSrc, {
        confirmDisabled: dialog.confirmDisabled, hasPreview: !!dialog.previewSrc,
      });
    ctx.check('默认勾选“确认后自动跳到下一个空子图”', dialog.continueChecked === true, dialog.continueChecked);

    // 2) 合成 paste 事件 → 预览；取消“继续”后确认，弹窗应关闭
    await app.setCheckbox(page, '#paste-continue', false);
    await app.pasteDispatchClipboardFile(page, samplePath('sample-3.png'));
    dialog = await app.waitPastePreview(page, { label: 'paste clipboard file preview' });
    const manifest = app.SAMPLES_MANIFEST['sample-3.png'];
    ctx.check('合成 paste 后 #paste-preview-img 显示 data URL',
      /^data:image\/(png|jpeg|webp)/.test(String(dialog.previewSrc || '')), String(dialog.previewSrc).slice(0, 40));
    ctx.check('粘贴预览图片尺寸 = 1200×900', !!dialog.previewNatural
      && dialog.previewNatural.width === manifest.width && dialog.previewNatural.height === manifest.height,
    dialog.previewNatural);
    await ctx.screenshot('paste-preview');
    await app.pasteConfirm(page);
    await waitPreview(page, () => window.__FIGPLAY__.getPreviewInfo().imageCount >= 1, null, 'paste confirm fill');
    let state = await app.api.getState(page);
    const afterConfirmPaste = await app.getPasteState(page);
    ctx.check('确认后图片填入目标面板 0（sample-3.png / 1200×900）',
      !!(state.cells[0] && state.cells[0].name === 'sample-3.png'
        && state.cells[0].width === manifest.width && state.cells[0].height === manifest.height),
      state.cells[0]);
    ctx.check('取消“继续”后确认会关闭弹窗（getPasteState.open=false）',
      afterConfirmPaste.open === false, afterConfirmPaste);

    // 3) 取消：预览后取消不写入
    await app.openPasteDialogByEmptyPanel(page, 1);
    await app.setCheckbox(page, '#paste-continue', false);
    await app.pasteDispatchClipboardFile(page, samplePath('sample-2.png'));
    await app.waitPastePreview(page);
    await app.pasteCancel(page);
    state = await app.api.getState(page);
    ctx.check('取消粘贴后目标面板仍为空', !state.cells[1], state.cells[1] && state.cells[1].name);

    // 4) “选择本地图片”按钮路径（#paste-file-input）
    await app.openPasteDialogByEmptyPanel(page, 1);
    await app.setCheckbox(page, '#paste-continue', false);
    await app.pastePickLocalFile(page, samplePath('sample-1.png'));
    dialog = await app.waitPastePreview(page, { label: 'paste local file preview' });
    ctx.check('本地文件按钮选择后出现预览（sample-1）', !!dialog.previewSrc);
    await app.pasteConfirm(page);
    await waitPreview(page, () => window.__FIGPLAY__.getPreviewInfo().imageCount >= 2, null, 'paste local confirm');
    state = await app.api.getState(page);
    ctx.check('本地文件确认后填入面板 1（sample-1.png）',
      !!(state.cells[1] && state.cells[1].name === 'sample-1.png'), state.cells[1]);

    // 5) 拖放路径
    await app.openPasteDialogByEmptyPanel(page, 2);
    await app.setCheckbox(page, '#paste-continue', false);
    await app.pasteDispatchDropFile(page, samplePath('sample-4.png'));
    await app.waitPastePreview(page, { label: 'paste drop preview' });
    await app.pasteConfirm(page);
    await waitPreview(page, () => window.__FIGPLAY__.getPreviewInfo().imageCount >= 3, null, 'paste drop confirm');
    state = await app.api.getState(page);
    ctx.check('拖放确认后填入面板 2（sample-4.png）',
      !!(state.cells[2] && state.cells[2].name === 'sample-4.png'), state.cells[2]);

    // 6) 继续模式：勾选 #paste-continue 后确认，弹窗保持打开并切到下一个空面板
    await app.openPasteDialogByEmptyPanel(page, 3);
    const continueBefore = await app.getPasteDialogState(page);
    ctx.check('新开弹窗默认勾选继续模式', continueBefore.continueChecked === true, continueBefore.continueChecked);
    await app.pasteDispatchClipboardFile(page, samplePath('sample-5.png'));
    await app.waitPastePreview(page);
    await app.pasteConfirm(page);
    await waitPreview(page, () => window.__FIGPLAY__.getPreviewInfo().imageCount >= 4, null, 'paste continue fill');
    await page.waitForTimeout(400);
    const continueState = await app.getPasteState(page);
    const continueDialog = await app.getPasteDialogState(page);
    ctx.check('继续模式：确认后弹窗保持打开且无预览残留',
      continueDialog.open === true && continueState.hasPreview === false,
      { open: continueDialog.open, hasPreview: continueState.hasPreview });
    ctx.check('继续模式：自动切换到下一个空面板（target=4）',
      continueState.target === 4, continueState);
    state = await app.api.getState(page);
    ctx.check('继续模式：panel 3 已填入 sample-5.png',
      !!(state.cells[3] && state.cells[3].name === 'sample-5.png'), state.cells[3] && state.cells[3].name);
    await app.pasteCancel(page);

    // 7) 双击已填面板进入替换模式（真实鼠标双击；若因 app pointer capture 导致 target 变 svg 则记录失败并继续）
    let dblclickError = null;
    try {
      await page.locator('#preview-svg .cell-hit[data-index="0"]').dblclick({ timeout: 5000 });
      await app.waitForDialog(page, '#paste-dialog', { label: 'paste replace dialog', timeout: 5000 });
    } catch (err) {
      dblclickError = String(err && err.message ? err.message : err);
    }
    let replaceDialog = dblclickError ? null : await app.getPasteDialogState(page);
    ctx.check('双击已填面板打开替换弹窗', !!replaceDialog && replaceDialog.open === true,
      dblclickError || (replaceDialog && { open: replaceDialog.open, targetText: replaceDialog.targetText }));
    if (!replaceDialog || replaceDialog.open !== true) {
      // 兜底：用 API 打开替换弹窗，继续验证“确认替换”链路
      await app.openPasteDialogApi(page, 0);
      await app.waitForDialog(page, '#paste-dialog', { label: 'paste replace fallback' });
      replaceDialog = await app.getPasteDialogState(page);
    }
    ctx.check('替换模式弹窗标题含“替换”',
      !!replaceDialog && /替换/.test(replaceDialog.titleText || replaceDialog.text || ''),
      replaceDialog && replaceDialog.titleText);
    await app.setCheckbox(page, '#paste-continue', false);
    await app.pasteDispatchClipboardFile(page, samplePath('sample-6.png'));
    await app.waitPastePreview(page, { label: 'replace preview' });
    await app.pasteConfirm(page);
    await waitPreview(page, () => {
      const cell = window.__FIGPLAY__.getState().cells[0];
      return cell && cell.name === 'sample-6.png';
    }, null, 'replace confirmed');
    state = await app.api.getState(page);
    ctx.check('双击/替换确认后替换为 sample-6.png',
      !!(state.cells[0] && state.cells[0].name === 'sample-6.png'), state.cells[0] && state.cells[0].name);
    ctx.check('替换确认后弹窗关闭', (await app.getPasteState(page)).open === false);

    // 8) Esc 关闭
    await app.openPasteDialogByEmptyPanel(page, 4);
    await page.keyboard.press('Escape');
    await app.waitForDialog(page, '#paste-dialog', { open: false, label: 'paste esc' });
    ctx.check('Esc 可关闭粘贴弹窗', (await app.dialogState(page, '#paste-dialog')).open !== true);

    // 8b) 工具栏「粘贴图片」按钮（#btn-paste）路径
    let toolbarError = null;
    try {
      await page.locator('#btn-paste').click({ timeout: 5000 });
      await app.waitForDialog(page, '#paste-dialog', { label: 'toolbar paste dialog', timeout: 4000 });
    } catch (err) {
      toolbarError = String(err && err.message ? err.message : err);
    }
    ctx.check('工具栏「粘贴图片」#btn-paste 打开粘贴弹窗', !toolbarError,
      toolbarError || 'opened');
    if (!toolbarError) await app.pasteCancel(page).catch(() => {});

    // 9) 全局 Ctrl+V：弹窗关闭时 paste 事件应直接打开弹窗并显示预览
    await app.setMultiSelect(page, []);
    await page.waitForTimeout(100);
    let globalPasteError = null;
    try {
      await app.pasteDispatchClipboardFile(page, samplePath('sample-1.png'), 'body');
      await app.waitForDialog(page, '#paste-dialog', { label: 'global paste dialog', timeout: 4000 });
    } catch (err) {
      globalPasteError = String(err && err.message ? err.message : err);
    }
    let globalState = null;
    let globalDialog = null;
    if (!globalPasteError) {
      globalDialog = await app.waitPastePreview(page, { label: 'global paste preview' });
      globalState = await app.getPasteState(page);
    }
    ctx.check('全局 Ctrl+V（弹窗关闭时）自动打开粘贴弹窗并显示预览',
      !globalPasteError && !!globalDialog && globalDialog.open === true && !!globalDialog.previewSrc,
      globalPasteError || (globalDialog && { open: globalDialog.open, target: globalState && globalState.target }));
    if (!globalPasteError) {
      ctx.check('全局 Ctrl+V 打开的目标为第一个空面板（4 或 5）',
        !!globalState && (globalState.target === 4 || globalState.target === 5), globalState && globalState.target);
      await app.pasteCancel(page);
    }

    await ctx.screenshot('paste-final');
  },
};

/* ----------------------------- K 桌面桥 mock ----------------------------- */
const desktopBridgeScenario = {
  code: 'K',
  name: 'desktop-bridge',
  title: '桌面桥',
  description: 'mock window.chrome.webview：app-ready、打开弹窗自动 read-clipboard-image{requestId}、回包 clipboard-image{ok,dataUrl,sourceFormat:EMF} 后预览/填入；失败回包后 #paste-retry 重发新 requestId',
  async run(ctx) {
    const { page } = ctx;
    await app.installDesktopBridgeMock(page);
    await app.openAppReady(page);
    if (!(await app.ensureV11(ctx, page))) return;

    await app.api.clearAll(page);
    await app.api.setLayout(page, 2, 2);

    // 0) 应用启动即应向桌面 host 发送 app-ready（desktop.js 以 JSON 字符串发送）
    const appReadyMessage = await app.waitBridgeMessage(page, 'app-ready', { timeout: 3000 }).catch(() => null);
    ctx.check('桌面桥：应用启动后发送 app-ready 消息（含 version）',
      !!appReadyMessage && appReadyMessage.version !== undefined, appReadyMessage);

    // 1) 打开粘贴弹窗：desktopBridge=true；#paste-read-clipboard 可见
    const baseRequestCount = await app.bridgeMessageCount(page, 'read-clipboard-image');
    await app.openPasteDialogByEmptyPanel(page, 0);
    let dialog = await app.getPasteDialogState(page);
    const pasteState = await app.getPasteState(page);
    ctx.check('桌面桥模式 getPasteState().desktopBridge = true',
      pasteState.desktopBridge === true, pasteState);
    ctx.check('桌面桥模式 #paste-read-clipboard 保留在 DOM 且可见',
      dialog.readClipboardPresent === true && dialog.readClipboardHidden === false
        && dialog.clipboardButtonCount > 0,
      { present: dialog.readClipboardPresent, hidden: dialog.readClipboardHidden,
        visibleButtons: dialog.clipboardButtonCount });

    // 2) 打开弹窗应自动发送 read-clipboard-image{requestId}
    let request = await app.waitNewBridgeMessage(page, 'read-clipboard-image', baseRequestCount + 1, { timeout: 5000 })
      .catch(() => null);
    if (!request) {
      // 兜底：直接触发隐藏按钮的 click（若实现改为手动触发）
      await page.evaluate(() => {
        const button = document.getElementById('paste-read-clipboard');
        if (button) button.click();
      });
      request = await app.waitNewBridgeMessage(page, 'read-clipboard-image', baseRequestCount + 1, { timeout: 5000 })
        .catch(() => null);
    }
    ctx.check('打开粘贴弹窗自动向 host 发送 read-clipboard-image',
      !!request && request.type === 'read-clipboard-image', request);
    ctx.check('read-clipboard-image 带非空 requestId',
      !!request && request.requestId !== undefined && request.requestId !== null
        && String(request.requestId).length > 0, request && request.requestId);
    if (!request) return;

    // 3) 模拟 host 成功回包（EMF → PNG/JPEG dataURL）→ 预览 → 取消继续 → 确认关闭并填入面板 0
    const dataUrl = app.fileToDataUrl(samplePath('sample-photo.jpg'), 'image/jpeg');
    await app.sendBridgeMessage(page, {
      type: 'clipboard-image',
      requestId: request.requestId,
      ok: true,
      dataUrl,
      width: 1600,
      height: 1200,
      sourceFormat: 'EMF',
    });
    dialog = await app.waitPastePreview(page, { label: 'bridge clipboard preview' });
    ctx.check('成功回包后粘贴弹窗出现预览 data URL',
      /^data:image\//.test(String(dialog.previewSrc || '')), String(dialog.previewSrc).slice(0, 40));
    ctx.check('成功回包后预览图片尺寸 = 1600×1200（EMF 转换后尺寸）',
      !!dialog.previewNatural && dialog.previewNatural.width === 1600 && dialog.previewNatural.height === 1200,
      dialog.previewNatural);
    ctx.check('成功回包后状态文本提示来自系统剪贴板',
      /剪贴板/.test(dialog.statusText || ''), dialog.statusText);
    await ctx.screenshot('bridge-preview');
    await app.setCheckbox(page, '#paste-continue', false);
    await app.pasteConfirm(page);
    await waitPreview(page, () => window.__FIGPLAY__.getPreviewInfo().imageCount >= 1, null, 'bridge confirm');
    let state = await app.api.getState(page);
    ctx.check('桌面桥回包确认后填入面板 0（1600×1200）',
      !!(state.cells[0] && state.cells[0].width === 1600 && state.cells[0].height === 1200),
      state.cells[0]);
    ctx.check('桌面桥确认后弹窗关闭（继续模式已取消）',
      (await app.getPasteState(page)).open === false);

    // 4) 失败回包 → 错误提示；#paste-retry 重发新 requestId；再次失败/成功验证
    const baseRequestCount2 = await app.bridgeMessageCount(page, 'read-clipboard-image');
    await app.openPasteDialogByEmptyPanel(page, 1);
    const request2 = await app.waitNewBridgeMessage(page, 'read-clipboard-image', baseRequestCount2 + 1, { timeout: 5000 })
      .catch(() => null);
    ctx.check('打开第二个弹窗再次发送 read-clipboard-image', !!request2, request2);
    if (!request2) return;
    await app.sendBridgeMessage(page, {
      type: 'clipboard-image', requestId: request2.requestId, ok: false, error: 'EMF 解析失败（mock）',
    });
    await page.waitForTimeout(400);
    const failDialog = await app.getPasteDialogState(page);
    ctx.check('失败回包后显示错误/无图片提示', /读取失败|没有图片|失败|重试/.test(failDialog.statusText || ''), failDialog.statusText);
    ctx.check('失败回包后 #paste-retry 可用', await page.evaluate(() => {
      const node = document.getElementById('paste-retry');
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }));
    // 点击 #paste-retry → 发送新的 requestId
    await page.locator('#paste-retry').click();
    const retryRequest = await app.waitNewBridgeMessage(page, 'read-clipboard-image', baseRequestCount2 + 2, { timeout: 6000 })
      .catch(() => null);
    ctx.check('#paste-retry 重发 read-clipboard-image 且 requestId 更新',
      !!retryRequest && retryRequest.requestId !== request2.requestId,
      retryRequest && retryRequest.requestId);
    if (retryRequest) {
      await app.sendBridgeMessage(page, {
        type: 'clipboard-image',
        requestId: retryRequest.requestId,
        ok: true,
        dataUrl,
        width: 1600,
        height: 1200,
        sourceFormat: 'EMF',
      });
      await app.waitPastePreview(page, { label: 'retry success preview' });
      await app.setCheckbox(page, '#paste-continue', false);
      await app.pasteConfirm(page);
      await waitPreview(page, () => window.__FIGPLAY__.getPreviewInfo().imageCount >= 2, null, 'retry confirm');
      state = await app.api.getState(page);
      ctx.check('重试成功后图片填入面板 1', !!(state.cells[1] && state.cells[1].width === 1600), state.cells[1]);
    }
    if ((await app.getPasteState(page)).open) {
      await app.pasteCancel(page).catch(() => {});
    }
    await ctx.screenshot('desktop-bridge-final');
  },
};

/* ----------------------------- L 高 DPI 布局 ----------------------------- */
async function layoutSnapshot(page) {
  return page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        x: Math.round(box.x), y: Math.round(box.y),
        w: Math.round(box.width), h: Math.round(box.height),
        visible: style.display !== 'none' && style.visibility !== 'hidden'
          && box.width > 0 && box.height > 0,
      };
    };
    const appEl = document.querySelector('.app');
    const styles = appEl ? getComputedStyle(appEl) : null;
    const tracks = styles && styles.gridTemplateColumns && styles.gridTemplateColumns !== 'none'
      ? styles.gridTemplateColumns.trim().split(/\s+/).filter(Boolean)
      : [];
    let shellSizeCss = null;
    try {
      shellSizeCss = window.__FIGPLAY__.getPreviewInfo().sizeCssPx;
    } catch (err) {
      shellSizeCss = null;
    }
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      appDisplay: styles ? styles.display : null,
      gridTemplateColumns: styles ? styles.gridTemplateColumns : null,
      columnCount: tracks.length,
      columnTracks: tracks,
      bodyScrollWidth: document.body.scrollWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      app: rect(appEl),
      stage: rect(document.getElementById('stage')),
      shell: rect(document.getElementById('figure-shell')),
      previewSvg: rect(document.getElementById('preview-svg')),
      leftPanel: rect(document.querySelector('.panel-left')),
      rightPanel: rect(document.querySelector('.panel-right')),
      workspace: rect(document.querySelector('.workspace')),
      shellSizeCss,
    };
  });
}

const highDpiLayoutScenario = {
  code: 'L',
  name: 'layout-highdpi',
  title: '高DPI布局',
  description: '1000×640 CSS 视口（150% 缩放/WebView2）三栏 grid、无横向溢出、预览可见；950 三栏；899 堆叠；1366×768 / 1440×900 复检',
  contextOptions: { viewport: { width: 1000, height: 640 } },
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    await app.api.clearAll(page);

    // v1.2：创建 3 个图页，验证新增页面栏在高 DPI 视口下不破坏三栏布局
    const hasPageApi = await page.evaluate(() => typeof (window.__FIGPLAY__ || {}).addPage === 'function');
    if (hasPageApi) {
      await app.addPage(page, 'new');
      await app.addPage(page, 'new');
      await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageCount === 3, null,
        { label: 'L: create 3 pages' });
      await app.setPage(page, 0);
      await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageIndex === 0, null,
        { label: 'L: back to page 0' });
    } else {
      ctx.note('高DPI页面栏检查', '当前应用无多页 API（v1.1），跳过页面栏断言');
    }

    async function waitViewport(width, height) {
      await app.waitFor(page, ([w, h]) => Math.round(window.innerWidth) === w && Math.round(window.innerHeight) === h,
        [width, height], { timeout: 8000, label: `viewport ${width}x${height}` });
    }
    async function waitShellWidth(minWidth, label) {
      await app.waitFor(page, (min) => {
        const node = document.getElementById('figure-shell');
        if (!node) return false;
        return node.getBoundingClientRect().width > min;
      }, minWidth, { timeout: 8000, label: `figure-shell width > ${minWidth} (${label})` });
    }
    function checkResponsive(label, snapshot, options) {
      const {
        expectDisplay, expectColumns, minStageWidth, minShellWidth,
      } = options;
      const scrollWidth = Math.max(snapshot.bodyScrollWidth, snapshot.docScrollWidth);
      ctx.check(`${label}：.app display = ${expectDisplay}`,
        snapshot.appDisplay === expectDisplay, snapshot.appDisplay);
      if (expectColumns != null) {
        ctx.check(`${label}：grid 三列（实际 ${snapshot.columnCount} 列）`,
          snapshot.columnCount === expectColumns, {
            tracks: snapshot.columnTracks, gridTemplateColumns: snapshot.gridTemplateColumns,
          });
      }
      ctx.check(`${label}：无横向溢出（scrollWidth ${scrollWidth} <= ${snapshot.innerWidth + 1}）`,
        scrollWidth <= snapshot.innerWidth + 1, {
          bodyScrollWidth: snapshot.bodyScrollWidth,
          docScrollWidth: snapshot.docScrollWidth, innerWidth: snapshot.innerWidth,
        });
      ctx.check(`${label}：预览 stage 可见（宽 ${snapshot.stage && snapshot.stage.w}px）`,
        !!snapshot.stage && snapshot.stage.visible && snapshot.stage.w >= minStageWidth
          && snapshot.stage.h > 150, snapshot.stage);
      ctx.check(`${label}：#figure-shell 宽 ${snapshot.shell && snapshot.shell.w}px > ${minShellWidth}`,
        !!snapshot.shell && snapshot.shell.w > minShellWidth, snapshot.shell);
      ctx.check(`${label}：预览 SVG 可见`,
        !!snapshot.previewSvg && snapshot.previewSvg.visible
          && snapshot.previewSvg.w > 150 && snapshot.previewSvg.h > 150, snapshot.previewSvg);
      if (expectColumns === 3) {
        ctx.check(`${label}：左右面板均可视（三栏未被堆叠）`,
          !!snapshot.leftPanel && snapshot.leftPanel.visible && snapshot.leftPanel.w >= 150
            && !!snapshot.rightPanel && snapshot.rightPanel.visible && snapshot.rightPanel.w >= 150,
          { left: snapshot.leftPanel, right: snapshot.rightPanel });
      }
    }

    // v1.2 页面栏使 stage 高度变矮，预览 shell 宽度随 fit 缩放相应变小（1000px 约 234px）
    await waitViewport(1000, 640);
    await waitShellWidth(200, '1000x640');
    const snapshot1000 = await layoutSnapshot(page);
    ctx.evidence['layout-1000x640'] = snapshot1000;
    checkResponsive('1000×640', snapshot1000, {
      expectDisplay: 'grid', expectColumns: 3, minStageWidth: 400, minShellWidth: 200,
    });
    ctx.check('1000×640：三栏列宽为紧凑布局（244 / 1fr / 296）',
      snapshot1000.columnTracks.length === 3
        && /244/.test(snapshot1000.columnTracks[0]) && /296/.test(snapshot1000.columnTracks[2]),
      snapshot1000.columnTracks);
    if (hasPageApi) {
      const pageTabs = await app.getPageTabs(page);
      const scopeState = await app.getExportScopeState(page);
      ctx.evidence['layout-1000x640-pages'] = {
        tabs: pageTabs.tabs, pageBarRect: pageTabs.pageBarRect, exportScope: scopeState,
      };
      ctx.check('1000×640：页签栏可见且 3 个页签（新增多页 UI 不溢出）',
        pageTabs.count === 3 && !!pageTabs.pageBarRect && pageTabs.pageBarRect.w > 0
          && pageTabs.tabs.some((tab) => tab.active),
        { tabs: pageTabs.tabs, pageBarRect: pageTabs.pageBarRect });
      ctx.check('1000×640：pageCount>1 时导出范围控件显示',
        scopeState.rowHidden === false, scopeState);
      ctx.check('1000×640：3 个页签下仍无横向溢出',
        Math.max(snapshot1000.bodyScrollWidth, snapshot1000.docScrollWidth)
          <= snapshot1000.innerWidth + 1,
        { bodyScrollWidth: snapshot1000.bodyScrollWidth, innerWidth: snapshot1000.innerWidth });
    }
    await ctx.screenshot('layout-1000x640');

    // 2) 950×640：仍为三栏（≤1100 紧凑布局）；页签栏允许换行
    await page.setViewportSize({ width: 950, height: 640 });
    await waitViewport(950, 640);
    await waitShellWidth(150, '950x640');
    const snapshot950 = await layoutSnapshot(page);
    ctx.evidence['layout-950x640'] = snapshot950;
    checkResponsive('950×640', snapshot950, {
      expectDisplay: 'grid', expectColumns: 3, minStageWidth: 350, minShellWidth: 150,
    });
    if (hasPageApi) {
      const tabs950 = await app.getPageTabs(page);
      ctx.evidence['layout-950x640-pages'] = { pageBarRect: tabs950.pageBarRect, tabs: tabs950.tabs };
      ctx.check('950×640：页签栏可换行且不造成横向溢出',
        !!tabs950.pageBarRect && tabs950.pageBarRect.w <= 950
          && Math.max(snapshot950.bodyScrollWidth, snapshot950.docScrollWidth) <= 951,
        { pageBarRect: tabs950.pageBarRect, scroll: snapshot950.bodyScrollWidth });
    }
    await ctx.screenshot('layout-950x640');

    // 3) 899×640：命中 ≤900 堆叠断点（display:block，非 grid）
    await page.setViewportSize({ width: 899, height: 640 });
    await waitViewport(899, 640);
    await waitShellWidth(180, '899x640 stacked');
    const snapshot899 = await layoutSnapshot(page);
    ctx.evidence['layout-899x640'] = snapshot899;
    checkResponsive('899×640（堆叠断点）', snapshot899, {
      expectDisplay: 'block', expectColumns: null, minStageWidth: 300, minShellWidth: 180,
    });
    await ctx.screenshot('layout-899x640-stacked');

    // 4) 1366×768 与 1440×900 复检（三栏、无横向溢出）
    await page.setViewportSize({ width: 1366, height: 768 });
    await waitViewport(1366, 768);
    await waitShellWidth(250, '1366x768');
    const snapshot1366 = await layoutSnapshot(page);
    ctx.evidence['layout-1366x768'] = snapshot1366;
    checkResponsive('1366×768', snapshot1366, {
      expectDisplay: 'grid', expectColumns: 3, minStageWidth: 300, minShellWidth: 250,
    });
    await ctx.screenshot('layout-1366x768');

    await page.setViewportSize({ width: 1440, height: 900 });
    await waitViewport(1440, 900);
    await waitShellWidth(250, '1440x900');
    const snapshot1440 = await layoutSnapshot(page);
    ctx.evidence['layout-1440x900'] = snapshot1440;
    checkResponsive('1440×900', snapshot1440, {
      expectDisplay: 'grid', expectColumns: 3, minStageWidth: 300, minShellWidth: 250,
    });
    await ctx.screenshot('layout-1440x900');
  },
};

export const scenariosV11 = [
  mergeScenario,
  templateScenario,
  batchLabelScenario,
  pasteScenario,
  desktopBridgeScenario,
  highDpiLayoutScenario,
];
