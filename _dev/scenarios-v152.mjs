/**
 * FigurePlay v1.5.2 新功能 E2E 场景（AK–AM）
 *
 * AK 取消保存：stub FP.desktop.saveFile 返回 canceled → 工程/配置/日志均不下载/不弹 picker、状态提示、随后成功保存一次
 * AL 弹窗拖动/背景：配置/使用说明 .help-head 拖动、视口内、::backdrop 不虚化、深色配置弹窗背景非白且文字可读
 * AM 主题色精简：6 色 blue/indigo/emerald/pink/rose/amber；无 teal/violet；pink #db2777；旧值 teal→emerald、violet→pink 迁移
 */
import fs from 'node:fs';
import path from 'node:path';

import * as app from './lib/app.mjs';
import { samplePath } from './lib/browser.mjs';

function rgbLuminance(rgb) {
  const m = String(rgb || '').match(/\d+/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(fg, bg) {
  const l1 = rgbLuminance(fg);
  const l2 = rgbLuminance(bg);
  if (l1 == null || l2 == null) return null;
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/* ----------------------------- AK 取消保存 ----------------------------- */
const cancelSaveScenario = {
  code: 'AK',
  name: 'cancel-save',
  title: '取消保存',
  description: 'stub FP.desktop.saveFile 返回 canceled：保存工程/配置/诊断日志时不得 downloadBlob/弹 picker/显示成功，状态提示取消；随后可正常成功保存',
  async run(ctx) {
    const { page } = ctx;
    await app.installDesktopBridgeMock(page);
    await app.openAppReady(page);
    if (!(await app.ensureV151(ctx, page))) return;
    try {
      const load = await app.waitNewBridgeMessage(page, 'load-config-profiles', 1,
        { timeout: 8000, label: 'cancel save config load' });
      await app.sendBridgeMessage(page, {
        type: 'config-profiles', requestId: load.requestId, ok: true, profiles: [],
        path: 'C:\\Users\\E2E\\AppData\\Roaming\\FigurePlay\\configs\\profiles.json', exists: true,
      });
    } catch (err) { /* ignore */ }
    await app.stubSaveFile(page);
    await app.trackSaveSideEffects(page);
    await app.api.clearAll(page);
    await app.uploadFiles(page, [sample1()], null, 1);

    const toastText = async () => ((await app.getToast(page)).text || '');
    const saveCalls = async () => (await app.getSaveFileMock(page)).calls;
    const side = async () => app.getSaveSideEffects(page);

    // 工程取消
    await app.pushSaveFileResult(page, { ok: false, canceled: true, error: '已取消保存。' });
    await page.locator('#btn-project-save').click();
    await app.waitFor(page, () => {
      const node = document.getElementById('project-file-status');
      return !!node && /已取消保存工程/.test(node.textContent || '');
    }, null, { timeout: 8000, label: 'project cancel status' });
    await page.waitForTimeout(250);
    let effects = await side();
    let calls = await saveCalls();
    let toast = await toastText();
    ctx.check('保存工程取消：状态「已取消保存工程」，无 downloadBlob/无 picker/无成功 toast',
      calls.length === 1 && calls[0].filterExtensions.join(',') === '.figureplay-project'
      && effects.downloads.length === 0 && effects.dialogues === 0
      && !/已保存完整工程/.test(toast),
      { calls: calls.length, effects, toast });

    // 工程再次成功
    await app.pushSaveFileResult(page, {
      ok: true, path: 'C:\\Users\\E2E\\Documents\\cancel-success.figureplay-project', bytes: 100,
    });
    await page.locator('#btn-project-save').click();
    await app.waitFor(page, () => {
      const node = document.getElementById('project-file-status');
      return !!node && /已保存工程/.test(node.textContent || '')
        && /cancel-success\.figureplay-project/.test(node.textContent || '');
    }, null, { timeout: 8000, label: 'project save success after cancel' });
    ctx.check('取消后再保存工程成功（状态含 path，无下载）',
      /已保存工程/.test((await app.getProjectFileUiState(page)).status || '')
      && /cancel-success\.figureplay-project/.test((await app.getProjectFileUiState(page)).status || '')
      && (await side()).downloads.length === 0,
      { status: (await app.getProjectFileUiState(page)).status });

    // 配置导出取消
    await app.openConfigDialog(page, 'save');
    await app.setConfigForm(page, { name: '取消保存配置', description: 'cancel test' });
    await app.saveCurrentConfig(page);
    await app.closeConfigDialog(page);
    await app.openConfigDialog(page);
    await app.pushSaveFileResult(page, { ok: false, canceled: true, error: '已取消保存。' });
    const configCallsBefore = (await saveCalls()).length;
    await page.locator('#config-list .config-item').filter({ hasText: '取消保存配置' })
      .locator('[data-action="export"]').first().click();
    await page.waitForTimeout(600);
    effects = await side();
    calls = await saveCalls();
    toast = await toastText();
    ctx.check('配置导出取消：saveFile 被调用 1 次取消、不下载/不弹 picker、无成功 toast',
      calls.length === configCallsBefore + 1
      && calls[calls.length - 1].filterExtensions.join(',') === '.json'
      && effects.downloads.length === 0 && effects.dialogues === 0
      && !/已导出配置/.test(toast),
      { callsDelta: calls.length - configCallsBefore, effects, toast });

    // 配置再次成功
    await app.pushSaveFileResult(page, {
      ok: true, path: 'C:\\Users\\E2E\\Documents\\cancel-config.json', bytes: 100,
    });
    await page.locator('#config-list .config-item').filter({ hasText: '取消保存配置' })
      .locator('[data-action="export"]').first().click();
    await app.waitFor(page, () => {
      const node = document.getElementById('toast');
      return !!node && /已导出配置/.test(node.textContent || '');
    }, null, { timeout: 8000, label: 'config export success after cancel' });
    ctx.check('取消后再导出配置成功（toast 含路径）',
      /已导出配置/.test(await toastText()) && /cancel-config\.json/.test(await toastText()),
      { toast: await toastText() });
    await app.closeConfigDialog(page);

    // 日志导出取消
    await app.openHelpDialog(page);
    await app.pushSaveFileResult(page, { ok: false, canceled: true, error: '已取消保存。' });
    const logCallsBefore = (await saveCalls()).length;
    await page.locator('#diag-log-export').click();
    await page.waitForTimeout(600);
    effects = await side();
    calls = await saveCalls();
    toast = await toastText();
    ctx.check('诊断日志导出取消：saveFile 被调用 1 次取消、不下载/不弹 picker、无成功 toast',
      calls.length === logCallsBefore + 1
      && calls[calls.length - 1].filterExtensions.join(',') === '.log'
      && effects.downloads.length === 0 && effects.dialogues === 0
      && !/诊断日志已保存/.test(toast),
      { callsDelta: calls.length - logCallsBefore, effects, toast });

    // 日志再次成功
    await app.pushSaveFileResult(page, {
      ok: true, path: 'C:\\Users\\E2E\\Documents\\cancel-log.log', bytes: 100,
    });
    await page.locator('#diag-log-export').click();
    await app.waitFor(page, () => {
      const node = document.getElementById('toast');
      return !!node && /诊断日志已保存/.test(node.textContent || '');
    }, null, { timeout: 8000, label: 'log export success after cancel' });
    ctx.check('取消后再导出日志成功（toast 含路径）',
      /诊断日志已保存/.test(await toastText()) && /cancel-log\.log/.test(await toastText()),
      { toast: await toastText() });
    await app.closeHelpDialog(page);

    calls = await saveCalls();
    effects = await side();
    ctx.check('全流程汇总：6 次 saveFile（工程/配置/日志各取消+成功）、全程 0 下载/0 picker、取消不落盘',
      calls.length === 6 && effects.downloads.length === 0 && effects.dialogues === 0
      && calls.map((call) => call.filterExtensions.join(',')).join('|')
        === '.figureplay-project|.figureplay-project|.json|.json|.log|.log',
      { calls: calls.map((call) => call.filterExtensions), effects });

    ctx.evidence.cancelSave = {
      calls: calls.map((call) => ({ name: call.suggestedName, filter: call.filterExtensions })),
      downloads: effects.downloads, dialogues: effects.dialogues,
      projectCancelStatus: (await app.getProjectFileUiState(page)).status,
    };
    await ctx.screenshot('cancel-save');
    await app.api.clearAll(page);
  },
};

function sample1() {
  return samplePath('sample-1.png');
}

/* ----------------------------- AL 弹窗拖动/背景 ----------------------------- */
const dialogDragScenario = {
  code: 'AL',
  name: 'dialog-drag-backdrop',
  title: '弹窗拖动/背景',
  description: '配置/使用说明 .help-head 拖动后 left/top 改变且不超出视口；dialog 背景=panel；::backdrop backdrop-filter=none（浅/深色）；深色配置弹窗背景非白、文字可读；关闭后重开仍在可视范围',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV151(ctx, page))) return;
    await app.api.clearAll(page);
    const panelBg = await page.evaluate(() => {
      const card = document.querySelector('.card');
      return card ? getComputedStyle(card).backgroundColor : null;
    });

    await app.openHelpDialog(page);
    let help = await app.getDialogUiState(page, '#help-dialog');
    ctx.check('使用说明弹窗：.help-head 可拖动标记（dialog-drag-handle/title）',
      help.open === true && /dialog-drag-handle/.test(help.headClass || '')
      && /拖动/.test(help.headTitle || ''),
      { headClass: help.headClass, headTitle: help.headTitle });
    ctx.check('浅色 dialog 背景=panel，::backdrop backdrop-filter=none、背景半透明',
      help.background === panelBg && help.backdrop && help.backdrop.backdropFilter === 'none'
      && /rgba/.test(help.backdrop.background || ''),
      { background: help.background, panelBg, backdrop: help.backdrop });

    const draggedHelp = await app.dragDialogHead(page, '#help-dialog', 120, 70);
    help = draggedHelp.after;
    const moved = Math.abs(help.rect.left - draggedHelp.before.rect.left) > 40
      || Math.abs(help.rect.top - draggedHelp.before.rect.top) > 40;
    ctx.check('拖动使用说明 .help-head 后 left/top 改变且完整在视口内',
      moved && help.rect.left >= 0 && help.rect.top >= 0
      && help.rect.right <= help.viewport.width + 0.5
      && help.rect.bottom <= help.viewport.height + 0.5,
      { before: draggedHelp.before.rect, after: help.rect, viewport: help.viewport });
    await app.closeHelpDialog(page);
    await app.openHelpDialog(page);
    help = await app.getDialogUiState(page, '#help-dialog');
    ctx.check('关闭后重新打开：位置仍在可视范围内',
      help.open === true && help.rect.left >= 0 && help.rect.top >= 0
      && help.rect.right <= help.viewport.width + 0.5
      && help.rect.bottom <= help.viewport.height + 0.5,
      { rect: help.rect, viewport: help.viewport });
    await app.closeHelpDialog(page);

    // 配置弹窗（浅色）
    await app.openConfigDialog(page);
    let config = await app.getDialogUiState(page, '#config-dialog');
    ctx.check('配置弹窗：.help-head 可拖动、背景=panel、::backdrop 不虚化',
      /dialog-drag-handle/.test(config.headClass || '')
      && config.background === panelBg
      && config.backdrop && config.backdrop.backdropFilter === 'none',
      { headClass: config.headClass, background: config.background, backdrop: config.backdrop });
    const draggedConfig = await app.dragDialogHead(page, '#config-dialog', -90, 60);
    config = draggedConfig.after;
    ctx.check('拖动配置弹窗后位置改变且完整在视口内',
      (Math.abs(config.rect.left - draggedConfig.before.rect.left) > 30
        || Math.abs(config.rect.top - draggedConfig.before.rect.top) > 30)
      && config.rect.left >= 0 && config.rect.top >= 0
      && config.rect.right <= config.viewport.width + 0.5
      && config.rect.bottom <= config.viewport.height + 0.5,
      { before: draggedConfig.before.rect, after: config.rect });

    // 深色主题
    await page.evaluate(() => window.FP.appearance.setMode('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => window.FP.appearance.open());
    config = await app.getDialogUiState(page, '#config-dialog');
    const ratio = contrastRatio(config.color, config.background);
    const panelIsLight = (rgbLuminance(config.background) || 0) > 0.6;
    ctx.check('深色主题配置弹窗背景非白（=panel 深色）且文字对比度可读（≥4.5:1）',
      config.open === true && !panelIsLight && ratio != null && ratio >= 4.5,
      { background: config.background, color: config.color, ratio, panelIsLight });
    ctx.check('深色主题 ::backdrop backdrop-filter=none（背景更深、不虚化）',
      config.backdrop && config.backdrop.backdropFilter === 'none'
      && /rgba/.test(config.backdrop.background || ''),
      { backdrop: config.backdrop });
    const darkConfig = {
      background: config.background, color: config.color,
      ratio, backdrop: config.backdrop,
    };
    await app.closeConfigDialog(page);
    await app.openConfigDialog(page);
    config = await app.getDialogUiState(page, '#config-dialog');
    ctx.check('深色下关闭重开配置弹窗仍在可视范围且背景保持深色',
      config.open === true && config.rect.left >= 0 && config.rect.top >= 0
      && config.rect.right <= config.viewport.width + 0.5
      && config.rect.bottom <= config.viewport.height + 0.5
      && !((rgbLuminance(config.background) || 0) > 0.6),
      { rect: config.rect, background: config.background });
    await app.closeConfigDialog(page);
    await page.evaluate(() => window.FP.appearance.setMode('light'));
    await page.waitForTimeout(120);
    await app.openConfigDialog(page);
    config = await app.getDialogUiState(page, '#config-dialog');
    ctx.check('切回浅色后配置弹窗背景恢复 panel 且 ::backdrop 不虚化',
      config.background === panelBg && config.backdrop && config.backdrop.backdropFilter === 'none',
      { background: config.background, backdrop: config.backdrop });
    await app.closeConfigDialog(page);

    ctx.evidence.dialogDrag = {
      helpDrag: { before: draggedHelp.before.rect, after: draggedHelp.after.rect },
      configDrag: { before: draggedConfig.before.rect, after: draggedConfig.after.rect },
      darkConfig,
      lightPanel: panelBg,
    };
    await ctx.screenshot('dialog-drag');
  },
};

/* ----------------------------- AM 主题色精简/迁移 ----------------------------- */
const accentMigrationScenario = {
  code: 'AM',
  name: 'accent-palette',
  title: '主题色精简',
  description: '仅 6 色 blue/indigo/emerald/pink/rose/amber（无 teal/violet）；pink=#db2777；选 pink 后 data-accent/localStorage/active/aria 正确；旧值 teal→emerald、violet→pink 自动迁移；深浅主题无异常',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV151(ctx, page))) return;
    await app.clearAppearanceStorage(page);
    await app.reloadAppReady(page);
    await app.waitAppearanceState(page, (state) => !!state && state.html.accent === 'blue', null,
      { label: 'accent palette default blue' });
    let state = await app.getAppearanceState(page);
    const names = state.accents.map((item) => item.accent);
    ctx.check('主题色仅 6 个：blue/indigo/emerald/pink/rose/amber',
      names.length === 6 && names.join(',') === 'blue,indigo,emerald,pink,rose,amber',
      names);
    ctx.check('DOM 中无 teal/violet 色块（旧值已移除）',
      state.accents.every((item) => item.accent !== 'teal' && item.accent !== 'violet')
      && await page.evaluate(() => !document.querySelector('#accent-group [data-accent="teal"]')
        && !document.querySelector('#accent-group [data-accent="violet"]')),
      names);
    const pinkSwatch = state.accents.find((item) => item.accent === 'pink') || {};
    ctx.check('pink 色块 CSS=#db2777（rgb(219,39,119)）、label 粉色',
      /db2777|219,\s*39,\s*119/i.test(String(pinkSwatch.inlineBg || pinkSwatch.color || ''))
      && /粉/.test(String(pinkSwatch.label || '')),
      pinkSwatch);

    await app.setAppearance(page, 'light', 'pink');
    await app.waitAppearanceState(page, (s) => s.html.accent === 'pink', null,
      { label: 'pink selected' });
    state = await app.getAppearanceState(page);
    const pinkItem = state.accents.find((item) => item.accent === 'pink') || {};
    ctx.check('选择 pink：data-accent=pink、--accent=#db2777、localStorage=pink、swatch active/aria',
      state.html.accent === 'pink'
      && String(state.cssVars.accent || '').toLowerCase() === '#db2777'
      && state.localStorage.accent === 'pink'
      && pinkItem.active === true && pinkItem.ariaPressed === 'true',
      { html: state.html, accentVar: state.cssVars.accent, storage: state.localStorage.accent, pinkItem });

    // 旧 localStorage teal → emerald
    await page.evaluate(() => {
      localStorage.setItem('figureplay.themeMode', 'dark');
      localStorage.setItem('figureplay.accent', 'teal');
    });
    await app.reloadAppReady(page);
    await app.waitAppearanceState(page, (s) => s.html.accent === 'emerald', null,
      { label: 'legacy teal migrated' });
    state = await app.getAppearanceState(page);
    ctx.check('旧 accent=teal 自动迁移 emerald（data-accent/localStorage/active）',
      state.html.accent === 'emerald' && state.localStorage.accent === 'emerald'
      && state.html.theme === 'dark'
      && (state.accents.find((item) => item.accent === 'emerald') || {}).active === true,
      { html: state.html, storage: state.localStorage.accent });

    // 旧 localStorage violet → pink
    await page.evaluate(() => { localStorage.setItem('figureplay.accent', 'violet'); });
    await app.reloadAppReady(page);
    await app.waitAppearanceState(page, (s) => s.html.accent === 'pink', null,
      { label: 'legacy violet migrated' });
    state = await app.getAppearanceState(page);
    ctx.check('旧 accent=violet 自动迁移 pink（data-accent/localStorage）',
      state.html.accent === 'pink' && state.localStorage.accent === 'pink'
      && state.html.theme === 'dark',
      { html: state.html, storage: state.localStorage.accent });

    // 非法旧 API 值被忽略
    const beforeInvalid = (await app.getAppearanceState(page)).html.accent;
    await page.evaluate(() => window.FP.appearance.setAccent('teal'));
    await page.evaluate(() => window.FP.appearance.setAccent('violet'));
    state = await app.getAppearanceState(page);
    ctx.check('setAccent(teal/violet) 被忽略（保持 pink，不写非法 data-accent）',
      state.html.accent === 'pink' && state.html.accent === beforeInvalid,
      { before: beforeInvalid, after: state.html.accent });

    // 深/浅切换渲染无错误
    await app.setAppearance(page, 'light', 'pink');
    await app.setAppearance(page, 'dark', 'amber');
    state = await app.getAppearanceState(page);
    ctx.check('深浅主题切换 + 6 色渲染无页面异常（dark+amber 生效）',
      state.html.theme === 'dark' && state.html.accent === 'amber',
      state.html);
    await ctx.screenshot('accent-palette');
    await app.setAppearance(page, 'system', 'blue');
    ctx.evidence.accentPalette = {
      names, pinkHex: pinkSwatch.inlineBg, migrated: { teal: 'emerald', violet: 'pink' },
      final: state.html,
    };
  },
};

export const scenariosV152 = [
  cancelSaveScenario,
  dialogDragScenario,
  accentMigrationScenario,
];
