/**
 * FigurePlay v1.5.0 新功能 E2E 场景（AA–AF）
 *
 * AA 工程文件：真实下载 .figureplay-project + 改布局后打开恢复 + 错误文件
 * AB 配置备份恢复（宿主 mock list/read + 恢复后 host save + 浏览器隐藏）
 * AC 期刊配置库：11 预设/5 分组 + 套用 Nature 单栏参数
 * AD 图片预检：低分辨率/小像素/拉伸 warnings；高分辨率无警告
 * AE 更新 UI mock：检查更新/下载按钮 + 浏览器模式禁用
 * AF 全页矢量：2 页 EMF 工程 stub exportVectorPdfMulti 捕获 pages + 尺寸不一致回退提示
 */
import fs from 'node:fs';
import path from 'node:path';

import * as app from './lib/app.mjs';
import {
  samplePath, saveDownload, waitForDownload,
} from './lib/browser.mjs';

function addExportEvidence(ctx, record) {
  ctx.evidence.exports = ctx.evidence.exports || [];
  ctx.evidence.exports.push(record);
}

const emfBase64 = fs.readFileSync('E:\\FigurePlay\\desktop\\selftest\\test-figure.emf').toString('base64');

/* ----------------------------- AA 工程文件 ----------------------------- */
const projectFileScenario = {
  code: 'AA',
  name: 'project-file',
  title: '工程文件',
  description: '工程文件真实下载 .figureplay-project（API getProjectSnapshot 含 pages/dataURL/emfBase64/layout/label/groups/export）；改布局/清空后通过文件输入打开恢复页数/图片/配置/分组；错误 type/版本/JSON 中文报错',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV150(ctx, page))) return;
    await app.api.clearAll(page);

    await app.api.setLayout(page, 2, 2);
    await app.setNumberInput(page, '#width-input', 170);
    await app.setNumberInput(page, '#aspect-w', 4);
    await app.setNumberInput(page, '#aspect-h', 3);
    await app.setLayoutOptions(page, { margin: 0, colGap: 2, rowGap: 2 });
    await app.setSelect(page, '#label-font', 'arial');
    await app.setNumberInput(page, '#label-size', 8);
    await app.uploadFiles(page, [samplePath('sample-1.png'), samplePath('sample-2.png')], null, 2);
    const group = await app.createGroup(page, { panels: [0, 1], name: '工程组', scheme: 'alpha-paren', start: 1 });
    await app.clickFormat(page, 'pdf');
    await app.addPage(page, 'new');
    await app.uploadFiles(page, [samplePath('sample-3.png')], null, 1);
    await app.waitPageState(page, () => {
      const info = window.__FIGPLAY__.getPreviewInfo();
      return info.pageCount === 2 && info.pageIndex === 1;
    }, null, { label: 'two pages ready' });

    const snapshot = await app.getProjectSnapshot(page);
    const page1 = snapshot.project.pages[0];
    const page2 = snapshot.project.pages[1];
    ctx.check('getProjectSnapshot：type/schemaVersion/project.pages（2 页）',
      snapshot.type === 'figureplay-project' && snapshot.schemaVersion === 1
      && snapshot.appVersion === '1.5.0'
      && !!Date.parse(snapshot.savedAt || '')
      && snapshot.project.pages.length === 2,
      { type: snapshot.type, schema: snapshot.schemaVersion, pages: snapshot.project.pages.length });
    ctx.check('工程快照 page1 含图片 dataURL、layout/label/groups 与 export',
      page1.cells.filter(Boolean).length === 2
      && page1.cells.filter(Boolean).every((cell) => /^data:image\//.test(String(cell.dataUrl || '')))
      && page1.layout.rows === 2 && page1.layout.cols === 2
      && page1.layout.widthMm === 170
      && page1.label.fontFamily === 'arial' && page1.label.fontSizePt === 8
      && (page1.groups || []).length === 1 && page1.groups[0].name === '工程组'
      && snapshot.project.export.format === 'pdf',
      { cells: page1.cells.filter(Boolean).map((cell) => ({ name: cell.name, w: cell.width, h: cell.height })),
        groups: page1.groups, layout: page1.layout, label: page1.label });
    ctx.check('工程快照 page2 含 1 张图片与同尺寸布局',
      page2.cells.filter(Boolean).length === 1 && page2.layout.widthMm === 170
      && page2.layout.rows === 2 && page2.layout.cols === 2,
      { cells: page2.cells.filter(Boolean).length, layout: page2.layout });

    // 真实下载工程文件
    await app.installFakeSavePicker(page, { mode: 'remove' });
    const download = await waitForDownload(page, () => page.locator('#btn-project-save').click(), { timeout: 30000 });
    const projectFile = await saveDownload(download, 'fp-v15-project.figureplay-project', { dir: ctx.exportsDir });
    await app.restoreSavePicker(page);
    const projectText = fs.readFileSync(projectFile.path, 'utf8');
    let projectJson = null;
    try { projectJson = JSON.parse(projectText); } catch (err) { projectJson = null; }
    addExportEvidence(ctx, {
      label: '完整工程文件 .figureplay-project', format: 'json',
      filename: projectFile.filename, path: projectFile.path, size: projectFile.size,
      verifierOk: true, failedChecks: [],
      verifier: { ok: true, checks: [], details: { pages: projectJson && projectJson.project && projectJson.project.pages.length } },
    });
    ctx.check('真实下载 .figureplay-project（文件扩展名/JSON/2 页/含 dataURL）',
      /\.figureplay-project$/i.test(projectFile.suggestedFilename || '')
      && !!projectJson && projectJson.type === 'figureplay-project'
      && projectJson.project.pages.length === 2
      && /"dataUrl":"data:image\//.test(projectText),
      { filename: projectFile.suggestedFilename, size: projectFile.size });
    const statusAfterSave = (await app.getProjectFileUiState(page)).status || '';
    ctx.check('保存后 #project-file-status 提示已保存工程',
      /已保存工程/.test(statusAfterSave), statusAfterSave);

    // 改布局/清空当前页后打开工程恢复
    await app.setPage(page, 0);
    await app.api.setLayout(page, 3, 2);
    await app.api.clearAll(page);
    await app.waitPageState(page, () => {
      const info = window.__FIGPLAY__.getPreviewInfo();
      return info.pageIndex === 0 && info.imageCount === 0;
    }, null, { label: 'project cleared', timeout: 8000 });

    page.once('dialog', async (dialog) => { await dialog.accept(); });
    await page.locator('#project-file-input').setInputFiles([projectFile.path]);
    await app.waitPageState(page, () => {
      const info = window.__FIGPLAY__.getPreviewInfo();
      const pages = window.__FIGPLAY__.getPages();
      const total = pages.reduce((n, p) => n + p.filledCount, 0);
      return info.pageCount === 2 && total === 3;
    }, null, { label: 'project restored from file', timeout: 15000 });
    await app.setPage(page, 0);
    let projectUi = await app.getProjectFileUiState(page);
    ctx.check('打开工程恢复页数/图片/布局/编号/导出（2 页 3 图、2×2/170mm/Arial8/PDF）',
      projectUi.preview.pageCount === 2 && projectUi.snapshot.pages === 2
      && projectUi.snapshot.images === 3
      && projectUi.snapshot.pageSizes[0].rows === 2 && projectUi.snapshot.pageSizes[0].cols === 2
      && projectUi.snapshot.pageSizes[0].widthMm === 170
      && (await app.api.getState(page)).label.fontFamily === 'arial'
      && (await app.api.getState(page)).export.format === 'pdf',
      { preview: projectUi.preview, snapshot: projectUi.snapshot });
    const groupsRestored = await app.getGroups(page);
    ctx.check('打开工程恢复分组（工程组/面板[0,1]）',
      Array.isArray(groupsRestored) && groupsRestored.length === 1
      && groupsRestored[0].name === '工程组'
      && JSON.stringify(groupsRestored[0].panels) === JSON.stringify([0, 1]),
      groupsRestored);
    ctx.check('打开工程后 #project-file-meta/状态更新（2 页 · 3 图、已打开工程）',
      /2 页 · 3 图/.test(projectUi.meta || '') && /已打开工程/.test(projectUi.status || ''),
      { meta: projectUi.meta, status: projectUi.status });

    // 错误文件：type/未来版本/非法 JSON
    const tmpDir = path.join(ctx.runDir, 'tmp');
    const badType = await app.writeConfigJsonFile(tmpDir, 'bad-project-type.figureplay-project', {
      type: 'not-figureplay-project', schemaVersion: 1, project: { pages: [] },
    });
    const future = await app.writeConfigJsonFile(tmpDir, 'future-project.figureplay-project', {
      type: 'figureplay-project', schemaVersion: 99, project: { pages: [{ cells: [] }] },
    });
    const badJson = await app.writeConfigJsonFile(tmpDir, 'invalid-project.figureplay-project', '{bad json');
    const cases = [
      { label: '错误 type', file: badType, pattern: '不是 FigurePlay 工程文件' },
      { label: '未来 schemaVersion', file: future, pattern: '版本较新' },
      { label: '非法 JSON', file: badJson, pattern: '不是有效 JSON' },
    ];
    for (const item of cases) {
      const before = await app.getProjectFileUiState(page);
      await page.locator('#project-file-input').setInputFiles([item.file]);
      await page.waitForFunction((src) => {
        const node = document.getElementById('project-file-status');
        const toast = document.getElementById('toast');
        return (node && new RegExp(src).test(node.textContent || ''))
          || (toast && new RegExp(src).test(toast.textContent || ''));
      }, item.pattern, { timeout: 6000 }).catch(() => null);
      const after = await app.getProjectFileUiState(page);
      ctx.check(`打开工程错误文件（${item.label}）：中文报错且工程状态不变`,
        /[\u4e00-\u9fff]/.test(after.status || '')
        && after.preview.pageCount === before.preview.pageCount
        && after.preview.imageCount === before.preview.imageCount,
        { status: after.status, pages: after.preview.pageCount, images: after.preview.imageCount });
    }

    await app.api.clearAll(page);
    ctx.evidence.projectFile = {
      snapshot: {
        pages: snapshot.project.pages.length,
        page1Images: page1.cells.filter(Boolean).length,
        page2Images: page2.cells.filter(Boolean).length,
        groups: page1.groups.length,
      },
      file: { filename: projectFile.filename, size: projectFile.size },
      restored: projectUi.snapshot,
      errors: cases.map((item) => item.label),
    };
    await ctx.screenshot('project-file');
  },
};

/* ----------------------------- AB 配置备份恢复 ----------------------------- */
const configBackupScenario = {
  code: 'AB',
  name: 'config-backup',
  title: '配置备份恢复',
  description: '宿主 mock 下配置备份按钮出现；listConfigBackups/readConfigBackup；恢复最新备份替换配置列表并触发 host save；浏览器模式隐藏按钮',
  async run(ctx) {
    const { page } = ctx;
    const hostPath = 'C:\\Users\\E2E\\AppData\\Roaming\\FigurePlay\\configs\\profiles.json';
    const profileA = {
      id: 'cfg-backup-a', type: 'figureplay-config', schemaVersion: 1,
      name: '当前配置 A', description: 'backup test', appVersion: '1.5.0',
      createdAt: '2026-11-06T11:00:00.000Z',
      layout: { rows: 2, cols: 2, widthMm: 170, colGap: 2, rowGap: 2 },
      label: { scheme: 'alpha-paren', position: 'tl', fontFamily: 'times', fontSizePt: 9 },
      export: { format: 'png', dpi: 300, trimPdf: false },
    };
    const backupProfiles = [
      Object.assign({}, profileA, { id: 'cfg-backup-b', name: '备份配置 B' }),
      Object.assign({}, profileA, { id: 'cfg-backup-c', name: '备份配置 C' }),
    ];
    await app.installDesktopBridgeMock(page);
    await app.openAppReady(page);
    if (!(await app.ensureV150(ctx, page))) return;
    const loadReq = await app.waitNewBridgeMessage(page, 'load-config-profiles', 1,
      { timeout: 12000, label: 'backup config load' });
    await app.sendBridgeMessage(page, {
      type: 'config-profiles', requestId: loadReq.requestId,
      ok: true, profiles: [profileA], path: hostPath, exists: true,
    });
    let cfg = await app.waitConfigState(page, (state) => state.storage.length === 1, null,
      { label: 'config backup initial load' });
    await app.openConfigDialog(page);
    const backupVisible = await page.evaluate(() => {
      const btn = document.getElementById('config-restore-backup');
      return !!btn && !btn.hidden;
    });
    ctx.check('桌面宿主下配置对话框显示「恢复上一份备份」按钮',
      backupVisible === true, backupVisible);

    let confirmMsg = null;
    page.once('dialog', async (dialog) => { confirmMsg = dialog.message(); await dialog.accept(); });
    const listBaseline = await app.bridgeMessageCount(page, 'list-config-backups');
    const saveBaseline = await app.bridgeMessageCount(page, 'save-config-profiles');
    await page.locator('#config-restore-backup').click();
    const listReq = await app.waitNewBridgeMessage(page, 'list-config-backups', listBaseline + 1,
      { timeout: 12000, label: 'list-config-backups' });
    await app.sendBridgeMessage(page, {
      type: 'config-backups', requestId: listReq.requestId, ok: true,
      backups: [
        { name: 'profiles-2026-11-06-1200.json', modifiedAt: '2026-11-06T12:00:00.000Z' },
        { name: 'profiles-2026-11-06-1100.json', modifiedAt: '2026-11-06T11:00:00.000Z' },
      ],
    });
    const readReq = await app.waitNewBridgeMessage(page, 'read-config-backup', 1,
      { timeout: 12000, label: 'read-config-backup' });
    ctx.check('恢复备份：先 listConfigBackups 再 readConfigBackup（最新备份名）',
      !!listReq && !!readReq && readReq.name === 'profiles-2026-11-06-1200.json'
      && /替换当前配置列表/.test(confirmMsg || ''),
      { readName: readReq && readReq.name, confirm: confirmMsg });
    await app.sendBridgeMessage(page, {
      type: 'config-backup', requestId: readReq.requestId, ok: true,
      profiles: backupProfiles, path: hostPath,
    });
    const saveReq = await app.waitNewBridgeMessage(page, 'save-config-profiles', saveBaseline + 1,
      { timeout: 12000, label: 'backup restore host save' });
    await app.sendBridgeMessage(page, {
      type: 'config-profiles-saved', requestId: saveReq.requestId, ok: true, path: hostPath,
    });
    cfg = await app.waitConfigState(page, (state) => state.storage.length === 2
      && state.storage.names.join(',') === '备份配置 B,备份配置 C', null,
    { label: 'backup restored profiles' });
    ctx.check('恢复后配置列表=备份内容（2 个：备份配置 B/C）并触发 host save',
      cfg.storage.length === 2 && cfg.storage.names.join(',') === '备份配置 B,备份配置 C'
      && (saveReq.profiles || []).length === 2,
      { names: cfg.storage.names, saved: (saveReq.profiles || []).map((p) => p.name) });
    ctx.check('恢复后状态文案显示已从备份恢复',
      /已从备份恢复\s*2\s*个配置/.test(cfg.ui.saveStatus || ''),
      cfg.ui.saveStatus);

    // 浏览器模式隐藏备份按钮
    const browser = page.context().browser();
    const plainContext = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const plainPage = await plainContext.newPage();
    try {
      await app.openAppReady(plainPage);
      await app.openConfigDialog(plainPage);
      const hidden = await plainPage.evaluate(() => {
        const btn = document.getElementById('config-restore-backup');
        return !!btn && !!btn.hidden;
      });
      ctx.check('浏览器模式隐藏「恢复上一份备份」按钮',
        hidden === true, hidden);
    } finally {
      await plainContext.close();
    }
    await app.closeConfigDialog(page);
    ctx.evidence.configBackup = {
      hostPath, confirm: confirmMsg, backups: ['profiles-2026-11-06-1200.json', 'profiles-2026-11-06-1100.json'],
      restored: cfg.storage.names,
    };
  },
};

/* ----------------------------- AC 期刊配置库 ----------------------------- */
const journalPresetScenario = {
  code: 'AC',
  name: 'journal-presets',
  title: '期刊配置库',
  description: '期刊库 11 预设/5 分组卡片；套用 Nature 单栏后 width=89/Arial8/PDF/trim，网格与图片数量不变；再接 Science 单栏验证',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV150(ctx, page))) return;
    await app.api.clearAll(page);
    await app.api.setLayout(page, 2, 3);
    await app.setNumberInput(page, '#width-input', 140);
    await app.uploadFiles(page, [
      samplePath('sample-1.png'), samplePath('sample-2.png'), samplePath('sample-3.png'),
      samplePath('sample-4.png'), samplePath('sample-5.png'),
    ], null, 5);
    const before = await app.getJournalUiState(page);
    await app.openJournalDialog(page);
    let journal = await app.getJournalUiState(page);
    ctx.check('期刊库对话框：11 个预设卡片、5 个分组标题、免责说明',
      journal.open === true && journal.cards.length === 11 && journal.groups.length === 5
      && /Author Guidelines|最新/.test(journal.note || ''),
      { cards: journal.cards.length, groups: journal.groups, note: journal.note });
    ctx.check('11 预设 ID/名称/尺寸齐全且卡片有套用按钮',
      journal.presets.length === 11
      && new Set(journal.presets.map((preset) => preset.id)).size === 11
      && journal.presets.every((preset) => preset.name && preset.widthMm > 0
        && preset.aspectW === 4 && preset.aspectH === 3)
      && journal.cards.every((card) => card.button === '套用' && /mm · 4:3/.test(card.size || '')),
      journal.presets.map((preset) => ({ id: preset.id, name: preset.name, width: preset.widthMm })));
    ctx.check('期刊库包含 Nature/IEEE/Elsevier/Science/学位论文 分组',
      ['Nature', 'IEEE', 'Elsevier', 'Science', '学位论文'].every((group) => journal.groups.indexOf(group) >= 0),
      journal.groups);

    await app.clickJournalPreset(page, 'Nature 单栏');
    let state = await app.api.getState(page);
    ctx.check('套用 Nature 单栏：89mm/4:3/列距2/行距2、Arial 8pt/inset1.2、PDF 300DPI 裁边',
      state.layout.widthMm === 89 && state.layout.aspectW === 4 && state.layout.aspectH === 3
      && state.layout.colGap === 2 && state.layout.rowGap === 2
      && state.label.fontFamily === 'arial' && state.label.fontSizePt === 8
      && state.label.insetMm === 1.2 && state.label.show === true
      && state.export.format === 'pdf' && state.export.dpi === 300
      && state.export.trimPdf === true && state.export.trimMarginMm === 0,
      { layout: state.layout, label: state.label, export: state.export });
    ctx.check('套用期刊后当前网格/图片数量不变（2×3、5 图）',
      state.layout.rows === 2 && state.layout.cols === 3
      && (await app.api.getPreviewInfo(page)).imageCount === 5,
      { rows: state.layout.rows, cols: state.layout.cols });

    await app.openJournalDialog(page);
    await app.clickJournalPreset(page, 'Science 单栏');
    state = await app.api.getState(page);
    ctx.check('再套用 Science 单栏：55mm/间距1.5/Arial 7pt',
      state.layout.widthMm === 55 && state.layout.colGap === 1.5 && state.layout.rowGap === 1.5
      && state.label.fontSizePt === 7 && state.label.fontFamily === 'arial',
      { layout: state.layout, label: state.label });
    ctx.check('期刊库应用后图片数量仍为 5',
      (await app.api.getPreviewInfo(page)).imageCount === 5);
    await ctx.screenshot('journal-presets');
    await app.api.clearAll(page);
    ctx.evidence.journalPresets = {
      cards: journal.cards.length, groups: journal.groups,
      presets: journal.presets.map((preset) => `${preset.name} ${preset.widthMm}mm`),
      nature: { widthMm: 89, font: 'arial', size: 8, format: 'pdf', trim: true },
      science: { widthMm: 55, font: 'arial', size: 7 },
    };
  },
};

/* ----------------------------- AD 图片预检 ----------------------------- */
const preflightScenario = {
  code: 'AD',
  name: 'image-preflight',
  title: '图片预检',
  description: '低分辨率/小像素图片预检返回中文 warnings；高分辨率无警告；拉伸 fake cell 返回拉伸警告',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV150(ctx, page))) return;
    await app.api.clearAll(page);
    await app.api.setLayout(page, 2, 2);
    await app.setNumberInput(page, '#width-input', 170);
    await app.setNumberInput(page, '#aspect-w', 4);
    await app.setNumberInput(page, '#aspect-h', 3);
    const tmpDir = path.join(ctx.runDir, 'tmp');
    const low = await app.createSolidPngFile(page, tmpDir, 'low-res-120x90.png', 120, 90, '#3b6d8f');
    await app.uploadFiles(page, [low.path], null, 1);
    const lowResults = await app.runPreflight(page, [0]);
    const lowWarnings = (lowResults[0] && lowResults[0].warnings) || [];
    ctx.check('低分辨率/小像素图片预检返回中文 DPI/像素 warnings',
      lowWarnings.length >= 2
      && lowWarnings.some((warning) => /低于 150 DPI/.test(warning))
      && lowWarnings.some((warning) => /像素尺寸仅 120×90/.test(warning))
      && lowWarnings.every((warning) => /[\u4e00-\u9fff]/.test(warning)),
      lowWarnings);
    const lowState = await app.getPreflightState(page);
    ctx.check('预检结果写入 __PREFLIGHT_LAST__ 且 toast 提示中文警告',
      lowState.last.length === 1 && /低于 150 DPI|分辨率/.test(lowState.toast || ''),
      { last: lowState.last.length, toast: lowState.toast });

    await app.uploadFiles(page, [samplePath('sample-1.png')], null, 1);
    const highResults = await app.runPreflight(page, [1]);
    ctx.check('高分辨率图片（1200×900）预检无警告',
      highResults.length === 1 && highResults[0].warnings.length === 0
      && highResults[0].dpi >= 200,
      highResults);

    const wide = await app.createSolidPngFile(page, tmpDir, 'wide-800x100.png', 800, 100, '#8f6b3b');
    await app.uploadFiles(page, [wide.path], null, 1);
    await app.setCellFitUi(page, 2, 'stretch');
    const stretchResults = await app.runPreflight(page, [2]);
    const stretchWarnings = (stretchResults[0] && stretchResults[0].warnings) || [];
    ctx.check('拉伸显示 fake cell 预检返回“图片被拉伸/比例”中文 warning',
      stretchWarnings.some((warning) => /图片被拉伸/.test(warning) && /变形约/.test(warning)),
      stretchWarnings);
    ctx.check('拉伸预检结果包含 fit=stretch、宽高与原图比例',
      stretchResults[0] && stretchResults[0].fit === 'stretch'
      && stretchResults[0].width === 800 && stretchResults[0].height === 100,
      stretchResults[0]);
    await ctx.screenshot('image-preflight');
    await app.api.clearAll(page);
    ctx.evidence.preflight = {
      low: lowWarnings, high: highResults[0], stretch: stretchWarnings,
    };
  },
};

/* ----------------------------- AE 更新 UI ----------------------------- */
const updateUiScenario = {
  code: 'AE',
  name: 'update-ui',
  title: '更新 UI',
  description: '桌面 mock 下帮助弹窗检查更新：stub checkUpdate 返回新版本+notes → 显示版本/说明/下载按钮；downloadUpdate 被调用；浏览器模式禁用',
  async run(ctx) {
    const { page } = ctx;
    await app.installDesktopBridgeMock(page);
    await app.installUpdateMock(page, {
      latestVersion: '1.5.1', currentVersion: '1.5.0', notes: 'E2E 更新说明：修复若干问题',
    });
    await app.openAppReady(page);
    if (!(await app.ensureV150(ctx, page))) return;
    await app.waitFor(page, () => {
      const btn = document.getElementById('btn-check-update');
      return !!btn && !btn.disabled;
    }, null, { timeout: 10000, label: 'update UI initialized' });
    await app.openHelpDialog(page);
    await page.locator('#btn-check-update').click();
    await app.waitFor(page, () => {
      const status = document.getElementById('update-status');
      return !!status && /发现新版本\s*1\.5\.1/.test(status.textContent || '');
    }, null, { timeout: 8000, label: 'update found' });
    let ui = await app.getUpdateUiState(page);
    let mockState = await app.getUpdateMock(page);
    ctx.check('检查更新：显示新版本 1.5.1（当前 1.5.0）与更新说明',
      ui.helpOpen === true && /发现新版本\s*1\.5\.1/.test(ui.status || '')
      && /E2E 更新说明/.test(ui.status || '')
      && ui.downloadVisible === true && mockState.checkCalls >= 1,
      { status: ui.status, downloadVisible: ui.downloadVisible, checkCalls: mockState.checkCalls });

    page.once('dialog', async (dialog) => { await dialog.accept(); });
    await page.locator('#btn-download-update').click();
    await app.waitFor(page, () => {
      const status = document.getElementById('update-status');
      return !!status && /更新已下载/.test(status.textContent || '');
    }, null, { timeout: 8000, label: 'update downloaded' });
    ui = await app.getUpdateUiState(page);
    mockState = await app.getUpdateMock(page);
    ctx.check('点击下载并更新：downloadUpdate 被调用且显示完成提示',
      mockState.downloadCalls === 1 && /更新已下载/.test(ui.status || ''),
      { downloadCalls: mockState.downloadCalls, status: ui.status });
    await app.closeHelpDialog(page);

    // 浏览器模式：禁用检查更新
    const browser = page.context().browser();
    const plainContext = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const plainPage = await plainContext.newPage();
    try {
      await app.openAppReady(plainPage);
      await app.openHelpDialog(plainPage);
      const browserUi = await app.getUpdateUiState(plainPage);
      ctx.check('浏览器模式检查更新按钮禁用、下载按钮隐藏、提示浏览器更新',
        browserUi.checkDisabled === true && browserUi.downloadHidden === true
        && /浏览器/.test(browserUi.status || ''),
        browserUi);
    } finally {
      await plainContext.close();
    }
    await ctx.screenshot('update-ui');
    ctx.evidence.updateUi = {
      status: ui.status, checkCalls: mockState.checkCalls, downloadCalls: mockState.downloadCalls,
      browserDisabled: true,
    };
  },
};

/* ----------------------------- AF 全页矢量 ----------------------------- */
const multiPageVectorScenario = {
  code: 'AF',
  name: 'multi-page-vector',
  title: '全页矢量',
  description: '2 页同尺寸 EMF 工程：stub exportVectorPdfMulti 捕获 pages（每页 spec panels/labels，pageCount2）；尺寸不一致时禁用矢量并提示回退多页位图',
  async run(ctx) {
    const { page } = ctx;
    await app.installDesktopBridgeMock(page);
    await app.openAppReady(page);
    if (!(await app.ensureV150(ctx, page))) return;
    await app.api.clearAll(page);
    await app.api.setLayout(page, 2, 2);
    await app.setNumberInput(page, '#width-input', 170);
    await app.setNumberInput(page, '#aspect-w', 4);
    await app.setNumberInput(page, '#aspect-h', 3);
    await app.setLayoutOptions(page, { margin: 0, colGap: 2, rowGap: 2 });

    // page1: 图片 + EMF
    await app.uploadFiles(page, [samplePath('sample-1.png')], null, 1);
    let figCount = await app.bridgeMessageCount(page, 'import-fig');
    let fakeFig = await app.createFakeFigFile(path.join(ctx.runDir, 'tmp'), 'vector-p1.fig');
    await app.uploadFigFile(page, fakeFig, 0);
    let figReq = await app.waitFigImportRequest(page, figCount + 1);
    await app.respondFigImported(page, figReq, {
      dataUrl: app.fileToDataUrl(samplePath('sample-1.png'), 'image/png'),
      width: 1200, height: 900, sourceFormat: 'MATLAB-FIG', emfBase64,
    });
    await app.waitFigCell(page, 0, { expectedWidth: 1200, expectedHeight: 900, timeout: 15000 });
    fs.rmSync(fakeFig, { force: true });

    // page2: 图片 + EMF，继承相同布局
    await app.addPage(page, 'new');
    await app.uploadFiles(page, [samplePath('sample-2.png')], null, 1);
    figCount = await app.bridgeMessageCount(page, 'import-fig');
    fakeFig = await app.createFakeFigFile(path.join(ctx.runDir, 'tmp'), 'vector-p2.fig');
    await app.uploadFigFile(page, fakeFig, 0);
    figReq = await app.waitFigImportRequest(page, figCount + 1);
    await app.respondFigImported(page, figReq, {
      dataUrl: app.fileToDataUrl(samplePath('sample-2.png'), 'image/png'),
      width: 1200, height: 900, sourceFormat: 'MATLAB-FIG', emfBase64,
    });
    await app.waitFigCell(page, 0, { expectedWidth: 1200, expectedHeight: 900, timeout: 15000 });
    fs.rmSync(fakeFig, { force: true });
    const pagesInfo = await app.getPages(page);
    ctx.check('两页工程就绪：2 页、同尺寸、每页有 EMF',
      pagesInfo.length === 2
      && pagesInfo.every((p) => p.layout.widthMm === 170 && p.layout.rows === 2 && p.layout.cols === 2)
      && (await app.getVectorStatus(page)).emfCount === 1
      && (await app.api.getPreviewInfo(page)).pageCount === 2,
      { pages: pagesInfo.map((p) => ({ w: p.layout.widthMm, rows: p.layout.rows, cols: p.layout.cols })) });
    await app.clickFormat(page, 'pdf');
    await app.setExportScopeApi(page, 'all');
    await app.setPage(page, 0);
    await page.waitForTimeout(300);
    const scopeState = await app.getExportScopeState(page);
    const scopeUi = await app.getExportUiState(page);
    ctx.check('全部页 + PDF：全页矢量提示显示（合并 2 页矢量 PDF）',
      scopeState.activeScope === 'all' && /全部 2 页/.test(scopeUi.ui.exportNote || ''),
      { scope: scopeState.activeScope, note: scopeUi.ui.exportNote });

    await page.evaluate(() => {
      window.__vectorMultiStub = { count: 0, pages: null };
      window.FP.desktop.exportVectorPdfMulti = async function (pages) {
        window.__vectorMultiStub.count += 1;
        window.__vectorMultiStub.pages = JSON.parse(JSON.stringify(pages));
        return {
          pdfBase64: 'JVBERi0xLjQKJcfsj6IKJSVFT0YK', bytes: 20, engine: 'Stub-PowerPoint',
          vectorPanels: pages.length, rasterPanels: 0,
        };
      };
    });
    await app.installFakeSavePicker(page, { mode: 'remove' });
    const download = await waitForDownload(page, () => page.locator('#btn-export-top').click(), { timeout: 30000 });
    const pdfFile = await saveDownload(download, 'fp-v15-allpages-vector.pdf', { dir: ctx.exportsDir });
    await app.restoreSavePicker(page);
    const multiStub = await page.evaluate(() => (window.__vectorMultiStub ? JSON.parse(JSON.stringify(window.__vectorMultiStub)) : null));
    ctx.check('导出全部页调用一次 exportVectorPdfMulti，pages.length=2',
      !!multiStub && multiStub.count === 1 && Array.isArray(multiStub.pages) && multiStub.pages.length === 2,
      { count: multiStub && multiStub.count, pages: multiStub && multiStub.pages && multiStub.pages.length });
    ctx.check('每页 spec 含 panels/labels 且尺寸一致（170mm/宽高一致）',
      !!multiStub && multiStub.pages.every((spec) => Array.isArray(spec.panels) && spec.panels.length >= 1
        && Array.isArray(spec.labels) && spec.labels.length >= 1
        && Math.abs(spec.widthMm - 170) < 0.01
        && Math.abs(multiStub.pages[0].heightMm - spec.heightMm) < 0.01),
      multiStub && multiStub.pages.map((spec) => ({
        panels: spec.panels.length, labels: spec.labels.length,
        w: spec.widthMm, h: spec.heightMm,
      })));
    ctx.check('全页矢量 PDF 下载文件生成（.pdf、非空）',
      /\.pdf$/i.test(pdfFile.suggestedFilename || '') && pdfFile.size > 0,
      { filename: pdfFile.suggestedFilename, size: pdfFile.size });

    // 尺寸不一致：禁用矢量 + 提示回退多页位图，且不再调用 multi
    await app.setPage(page, 1);
    await app.setNumberInput(page, '#width-input', 120);
    await app.setPage(page, 0);
    await app.setExportScopeApi(page, 'all');
    await page.waitForTimeout(300);
    const fallbackUi = await app.getExportUiState(page);
    const multiCallsBefore = (await page.evaluate(() => window.__vectorMultiStub.count || 0));
    ctx.check('尺寸不一致：矢量勾选禁用且导出提示回退多页位图 PDF',
      fallbackUi.ui.vectorPdfDisabled === true
      && /全页矢量 PDF 要求每页都有 EMF|多页位图/.test(fallbackUi.ui.exportNote || ''),
      { disabled: fallbackUi.ui.vectorPdfDisabled, note: fallbackUi.ui.exportNote });
    await app.installFakeSavePicker(page, { mode: 'remove' });
    const fallbackDownload = await waitForDownload(page, () => page.locator('#btn-export-top').click(), { timeout: 30000 });
    const fallbackFile = await saveDownload(fallbackDownload, 'fp-v15-allpages-fallback.pdf', { dir: ctx.exportsDir });
    await app.restoreSavePicker(page);
    const multiCallsAfter = await page.evaluate(() => window.__vectorMultiStub.count || 0);
    ctx.check('尺寸不一致导出走多页位图（未再调用 exportVectorPdfMulti）且文件生成',
      multiCallsAfter === multiCallsBefore && fallbackFile.size > 0 && multiCallsBefore === 1,
      { before: multiCallsBefore, after: multiCallsAfter, size: fallbackFile.size });

    await ctx.screenshot('multi-page-vector');
    await app.api.clearAll(page);
    ctx.evidence.multiPageVector = {
      pages: multiStub && multiStub.pages && multiStub.pages.map((spec) => ({
        panels: spec.panels.length, labels: spec.labels.length, w: spec.widthMm, h: spec.heightMm,
      })),
      calls: multiStub && multiStub.count,
      fallback: { vectorDisabled: fallbackUi.ui.vectorPdfDisabled, note: fallbackUi.ui.exportNote, file: fallbackFile.filename },
    };
  },
};

export const scenariosV15 = [
  projectFileScenario,
  configBackupScenario,
  journalPresetScenario,
  preflightScenario,
  updateUiScenario,
  multiPageVectorScenario,
];
