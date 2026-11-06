/**
 * FigurePlay v1.2 新功能 E2E 场景（M–O）
 *
 * M 多页工程 / N 撤销重做 / O 分组 + 多页导出 + MATLAB .fig
 *
 * 依赖 lib/app.mjs 中 v1.2 helper；应用未就绪时 ensureV12() 先失败快速返回。
 */
import fs from 'node:fs';
import path from 'node:path';

import * as app from './lib/app.mjs';
import { samplePath } from './lib/browser.mjs';
import { describeVerify, verifyExport } from './lib/verify.mjs';

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function writeJson(ctx, name, data) {
  const filePath = path.join(ctx.runDir, 'json', name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return filePath;
}

async function waitPreview(page, predicate, arg, label, timeout = 10000) {
  await app.waitFor(page, predicate, arg, { timeout, label });
}

async function blurFocus(page) {
  await page.evaluate(() => {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  });
}

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
  ctx.check(`${label}：文件生成（${String(format).toUpperCase()}，${exported.size} B）`, exported.size > 0,
    { path: exported.path, size: exported.size });
  ctx.check(`${label}：Python 校验通过`, verify.ok, describeVerify(verify));
  return { exported, verify };
}

function labelsMatch(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  return actual.every((item, i) => item.cellIndex === expected[i].cellIndex
    && item.text === expected[i].text);
}

/* ----------------------------- M 多页工程 ----------------------------- */
const multiPageScenario = {
  code: 'M',
  name: 'multi-page',
  title: '多页工程',
  description: '页签/新建/复制/删除/双击改名；每页独立 layout/cells/label；API getPages/setPage/addPage/duplicatePage/deletePage/renamePage；自动保存 version 2 project 并 reload 恢复',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV12(ctx, page))) return;
    await app.api.clearAll(page);

    // 1) 初始单页
    let tabs = await app.getPageTabs(page);
    let history = await app.getHistoryState(page);
    let info = await app.api.getPreviewInfo(page);
    const initialPages = await app.getPages(page);
    ctx.check('初始 pageCount=1、pageIndex=0', info.pageCount === 1 && info.pageIndex === 0,
      { pageCount: info.pageCount, pageIndex: info.pageIndex });
    ctx.check('初始页签 1 个且 active', tabs.count === 1 && tabs.tabs[0].active, tabs.tabs);
    ctx.check('初始撤销/重做按钮禁用且历史为空',
      history.canUndo === false && history.canRedo === false && tabs.addDisabled === false,
      { history, addDisabled: tabs.addDisabled });
    ctx.check('getPages() 返回 1 页、filledCount=0',
      initialPages.length === 1 && initialPages[0].filledCount === 0, initialPages);

    // 2) 第 1 页独立状态：2×3 + 2 图 + roman start2 + margin4
    await app.api.setLayout(page, 2, 3);
    await app.uploadFiles(page, [samplePath('sample-1.png'), samplePath('sample-2.png')], null, 2);
    await app.setLabelScheme(page, 'roman-paren');
    await app.setNumberInput(page, '#label-start', 2);
    await app.setNumberInput(page, '#margin-input', 4);
    await waitPreview(page, () => window.__FIGPLAY__.getState().layout.margin === 4, null, 'page1 margin');
    const page1State = await app.api.getState(page);
    ctx.check('第 1 页设置生效（2×3、margin4、roman start2、2 图）',
      page1State.layout.rows === 2 && page1State.layout.cols === 3 && page1State.layout.margin === 4
        && page1State.label.scheme === 'roman-paren' && page1State.label.start === 2
        && page1State.cells.filter(Boolean).length === 2,
      { layout: page1State.layout, label: page1State.label, cells: page1State.cells.filter(Boolean).length });

    // 3) UI 新建页：复制布局/编号设置，不复制图片
    await app.clickPageAction(page, 'add');
    await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageCount === 2, null,
      { label: 'page count 2' });
    tabs = await app.getPageTabs(page);
    info = await app.api.getPreviewInfo(page);
    let pages = await app.getPages(page);
    let state = await app.api.getState(page);
    ctx.check('点「新页」后 pageCount=2、当前页=1', info.pageCount === 2 && info.pageIndex === 1,
      { pageCount: info.pageCount, pageIndex: info.pageIndex });
    ctx.check('页签 2 个且第 2 个 active', tabs.count === 2 && tabs.tabs[1].active, tabs.tabs);
    ctx.check('新页复制布局/编号设置（2×3、margin4、roman start2）',
      state.layout.rows === 2 && state.layout.cols === 3 && state.layout.margin === 4
        && state.label.scheme === 'roman-paren' && state.label.start === 2,
      { layout: state.layout, label: state.label });
    ctx.check('新页不复制图片（filledCount=0）',
      pages[1].filledCount === 0 && state.cells.filter(Boolean).length === 0, pages[1]);

    // 各页布局独立
    await app.api.setLayout(page, 3, 2);
    await app.setPage(page, 0);
    await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageIndex === 0, null,
      { label: 'back to page 0' });
    state = await app.api.getState(page);
    pages = await app.getPages(page);
    ctx.check('切回第 1 页：2 图与 2×3 布局独立保留',
      state.cells.filter(Boolean).length === 2 && state.layout.rows === 2 && state.layout.cols === 3,
      { cells: state.cells.filter(Boolean).length, layout: state.layout });
    ctx.check('第 2 页布局独立（3×2）',
      pages[1].layout.rows === 3 && pages[1].layout.cols === 2, pages[1].layout);

    // 4) duplicatePage：复制当前页图片
    await app.duplicatePage(page);
    await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageCount === 3, null,
      { label: 'page count 3' });
    info = await app.api.getPreviewInfo(page);
    pages = await app.getPages(page);
    state = await app.api.getState(page);
    ctx.check('duplicatePage 后 pageCount=3、当前页=1',
      info.pageCount === 3 && info.pageIndex === 1, { pageCount: info.pageCount, pageIndex: info.pageIndex });
    ctx.check('副本页复制 2 张图片', pages[1].filledCount === 2 && state.cells.filter(Boolean).length === 2,
      { filledCount: pages[1].filledCount, cells: state.cells.filter(Boolean).length });
    ctx.check('副本页名称含「副本」', /副本/.test(pages[1].name), pages[1].name);

    // 5) API 改名
    await app.renamePage(page, 1, '实验组');
    await app.waitPageState(page, () => window.__FIGPLAY__.getPages()[1].name === '实验组', null,
      { label: 'rename api' });
    ctx.check('API renamePage(1,"实验组") 生效',
      (await app.getPages(page))[1].name === '实验组');

    // 6) 双击页签改名（prompt）
    page.once('dialog', async (dialog) => { await dialog.accept('图 B'); });
    await page.locator('#page-tabs .page-tab[data-index="1"]').dblclick();
    await app.waitPageState(page, () => window.__FIGPLAY__.getPages()[1].name === '图 B', null,
      { label: 'rename by dblclick' });
    ctx.check('双击页签 + prompt 改名生效',
      (await app.getPages(page))[1].name === '图 B');

    // 7) UI 删除当前页（window.confirm）
    const namesBeforeDelete = (await app.getPages(page)).map((item) => item.name);
    page.once('dialog', async (dialog) => { await dialog.accept(); });
    await app.clickPageAction(page, 'del');
    await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageCount === 2, null,
      { label: 'page deleted' });
    info = await app.api.getPreviewInfo(page);
    const namesAfterDelete = (await app.getPages(page)).map((item) => item.name);
    ctx.check('删除当前页后 pageCount=2、当前页有效',
      info.pageCount === 2 && info.pageIndex >= 0 && info.pageIndex < 2,
      { pageCount: info.pageCount, pageIndex: info.pageIndex });
    ctx.check('删除的是当前页「图 B」',
      namesBeforeDelete.indexOf('图 B') >= 0 && namesAfterDelete.indexOf('图 B') < 0,
      { before: namesBeforeDelete, after: namesAfterDelete });

    // 8) 自动保存 version 2 project + reload 恢复
    await app.setPage(page, 0);
    await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageIndex === 0, null,
      { label: 'page 0 before save' });
    const beforeDom = await app.getPreviewDom(page);
    const beforeHrefs = {};
    for (const image of beforeDom.images.filter((item) => item.display !== 'none')) {
      beforeHrefs[image.cellIndex] = image.href;
    }
    const pagesBeforeReload = (await app.getPages(page)).map((item) => item.name);
    const saved = await app.waitForAutosave(page, (savedDoc) => savedDoc.version === 2
      && Array.isArray(savedDoc.pages) && savedDoc.pages.length === 2
      && savedDoc.current === 0
      && savedDoc.currentPage && Array.isArray(savedDoc.currentPage.cells)
      && savedDoc.currentPage.cells.filter(Boolean).length === 2,
    { timeout: 12000, label: 'v2 project autosave' });
    ctx.check('自动保存为 version 2 project（pages 数组、当前页 0）',
      saved.version === 2 && saved.payload.state && saved.payload.state.project
        && saved.pages.length === 2 && saved.current === 0,
      { version: saved.version, pages: saved.pages.length, current: saved.current });
    ctx.check('saved.project.pages[0].cells 含 2 张图 dataUrl',
      saved.pages[0].cells.filter(Boolean).length === 2
        && saved.pages[0].cells.filter(Boolean).every((cell) => /^data:image\//.test(String(cell.dataUrl))),
      saved.pages[0].cells.filter(Boolean).map((cell) => String(cell.dataUrl).slice(0, 30)));
    ctx.evidence.autosave = {
      backend: saved.backend, version: saved.version, pageCount: saved.pages.length,
      current: saved.current, pages: saved.pages.map((item) => ({ name: item.name, filled: item.cells.filter(Boolean).length })),
    };

    await app.reloadAppReady(page);
    info = await app.api.getPreviewInfo(page);
    const restoredPages = await app.getPages(page);
    const restoredDom = await app.getPreviewDom(page);
    const restoredHrefs = {};
    for (const image of restoredDom.images.filter((item) => item.display !== 'none')) {
      restoredHrefs[image.cellIndex] = image.href;
    }
    ctx.check('reload 后恢复页数/当前页', info.pageCount === 2 && info.pageIndex === 0,
      { pageCount: info.pageCount, pageIndex: info.pageIndex });
    ctx.check('reload 后页面名称恢复',
      JSON.stringify(restoredPages.map((item) => item.name)) === JSON.stringify(pagesBeforeReload),
      { before: pagesBeforeReload, after: restoredPages.map((item) => item.name) });
    ctx.check('reload 后当前页图片 dataUrl 完全恢复（预览 href 一致）',
      JSON.stringify(restoredHrefs) === JSON.stringify(beforeHrefs), {
        before: Object.keys(beforeHrefs), after: Object.keys(restoredHrefs),
        same: JSON.stringify(restoredHrefs) === JSON.stringify(beforeHrefs),
      });
    ctx.check('getPreviewInfo 含 pageIndex/pageCount/pageName/pages',
      typeof info.pageName === 'string' && info.pageName.length > 0
        && Array.isArray(info.pages) && info.pages.length === 2,
      { pageName: info.pageName, pages: info.pages });

    tabs = await app.getPageTabs(page);
    await ctx.screenshot('multi-page-tabs');
  },
};

/* ----------------------------- N 撤销 / 重做 ----------------------------- */
const undoRedoScenario = {
  code: 'N',
  name: 'undo-redo',
  title: '撤销重做',
  description: '按钮/快捷键/API：布局、编号、上传、模板、分组、页增删的撤销重做；拖动缩放 500ms 合并；弹窗打开不触发；切页不入历史',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV12(ctx, page))) return;
    await app.api.clearAll(page);
    await app.waitHistoryCommit(page);

    // 1) 布局修改 → undo/redo（API）
    await app.api.setLayout(page, 2, 3);
    await app.waitHistoryCommit(page);
    let history = await app.getHistoryState(page);
    ctx.check('布局修改后 canUndo=true', history.canUndo === true, history);
    await app.undo(page);
    await waitPreview(page, () => window.__FIGPLAY__.getState().layout.rows === 3
      && window.__FIGPLAY__.getState().layout.cols === 2, null, 'undo layout');
    ctx.check('undo 回退布局到 3×2',
      (await app.api.getState(page)).layout.rows === 3);
    history = await app.getHistoryState(page);
    ctx.check('undo 后 canRedo=true', history.canRedo === true, history);
    await app.redo(page);
    await waitPreview(page, () => window.__FIGPLAY__.getState().layout.rows === 2
      && window.__FIGPLAY__.getState().layout.cols === 3, null, 'redo layout');
    ctx.check('redo 恢复布局 2×3',
      (await app.api.getState(page)).layout.cols === 3);

    // 2) 键盘快捷键 Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
    await app.setLabelScheme(page, 'number-paren');
    await app.waitHistoryCommit(page);
    await blurFocus(page);
    await page.keyboard.press('Control+z');
    await waitPreview(page, () => window.__FIGPLAY__.getState().label.scheme === 'alpha-paren', null, 'ctrl+z label');
    ctx.check('Ctrl+Z 撤销编号方案', (await app.api.getState(page)).label.scheme === 'alpha-paren');
    await page.keyboard.press('Control+Shift+z');
    await waitPreview(page, () => window.__FIGPLAY__.getState().label.scheme === 'number-paren', null, 'ctrl+shift+z');
    ctx.check('Ctrl+Shift+Z 重做编号方案', (await app.api.getState(page)).label.scheme === 'number-paren');
    await page.keyboard.press('Control+z');
    await waitPreview(page, () => window.__FIGPLAY__.getState().label.scheme === 'alpha-paren', null, 'ctrl+z again');
    await page.keyboard.press('Control+y');
    await waitPreview(page, () => window.__FIGPLAY__.getState().label.scheme === 'number-paren', null, 'ctrl+y');
    ctx.check('Ctrl+Y 重做编号方案', (await app.api.getState(page)).label.scheme === 'number-paren');

    // 3) 上传撤销/重做
    await app.uploadFiles(page, [samplePath('sample-1.png')], null, 1);
    await app.waitHistoryCommit(page);
    await app.undo(page);
    await waitPreview(page, () => window.__FIGPLAY__.getPreviewInfo().imageCount === 0, null, 'undo upload');
    ctx.check('undo 撤销上传（图片数 0）', (await app.getPreviewInfoV11(page)).imageCount === 0);
    await app.redo(page);
    await waitPreview(page, () => window.__FIGPLAY__.getPreviewInfo().imageCount === 1, null, 'redo upload');
    ctx.check('redo 恢复上传（图片数 1）', (await app.getPreviewInfoV11(page)).imageCount === 1);

    // 4) 连续偏移（500ms 空闲合并为一步）
    await app.selectCell(page, 0);
    const historyBeforeDrag = await app.getHistoryState(page);
    await page.locator('#cell-offset-x').evaluate((node) => {
      [5, 10, 15].forEach((value) => {
        node.value = String(value);
        node.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    await app.waitHistoryCommit(page);
    const historyAfterDrag = await app.getHistoryState(page);
    ctx.check('连续 3 次偏移只产生 1 步历史',
      historyAfterDrag.undoCount === historyBeforeDrag.undoCount + 1,
      { before: historyBeforeDrag.undoCount, after: historyAfterDrag.undoCount });
    await app.undo(page);
    await waitPreview(page, () => {
      const cell = window.__FIGPLAY__.getState().cells[0];
      return !!cell && Math.abs(cell.offsetX) < 0.001;
    }, null, 'undo offset');
    ctx.check('undo 一次性恢复偏移到 0',
      (await app.api.getState(page)).cells[0].offsetX === 0,
      (await app.api.getState(page)).cells[0].offsetX);
    await app.redo(page);
    await waitPreview(page, () => window.__FIGPLAY__.getState().cells[0].offsetX === 15, null, 'redo offset');
    ctx.check('redo 恢复偏移 15mm', (await app.api.getState(page)).cells[0].offsetX === 15);

    // 5) 页新增撤销/重做 + 切页不入历史
    const pageCountBefore = (await app.api.getPreviewInfo(page)).pageCount;
    await app.addPage(page, 'new');
    await app.waitPageState(page, (expected) => window.__FIGPLAY__.getPreviewInfo().pageCount === expected,
      pageCountBefore + 1, { label: 'page added' });
    await app.waitHistoryCommit(page);
    await app.undo(page);
    await app.waitPageState(page, (expected) => window.__FIGPLAY__.getPreviewInfo().pageCount === expected,
      pageCountBefore, { label: 'undo page add' });
    ctx.check('等待 >600ms 后 undo 撤销新建页',
      (await app.api.getPreviewInfo(page)).pageCount === pageCountBefore);
    await app.redo(page);
    await app.waitPageState(page, (expected) => window.__FIGPLAY__.getPreviewInfo().pageCount === expected,
      pageCountBefore + 1, { label: 'redo page add' });
    ctx.check('redo 重新加入新页',
      (await app.api.getPreviewInfo(page)).pageCount === pageCountBefore + 1);
    const undoCountBeforeSwitch = (await app.getHistoryState(page)).undoCount;
    await app.setPage(page, 0);
    await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageIndex === 0, null,
      { label: 'page switch' });
    const undoCountAfterSwitch = (await app.getHistoryState(page)).undoCount;
    ctx.check('页切换本身不入历史（undoCount 不变）',
      undoCountAfterSwitch === undoCountBeforeSwitch,
      { before: undoCountBeforeSwitch, after: undoCountAfterSwitch });

    // 6) 模板撤销
    const layoutBeforeTemplate = await app.api.getState(page);
    await app.applyTemplate(page, 'double-2x3');
    await app.waitHistoryCommit(page);
    await app.undo(page);
    await app.waitPageState(page, (expected) => {
      const state = window.__FIGPLAY__.getState();
      return state.layout.rows === expected[0] && state.layout.cols === expected[1];
    }, [layoutBeforeTemplate.layout.rows, layoutBeforeTemplate.layout.cols], { label: 'undo template' });
    ctx.check('undo 撤销模板应用',
      (await app.api.getState(page)).layout.cols === layoutBeforeTemplate.layout.cols,
      { now: (await app.api.getState(page)).layout, before: layoutBeforeTemplate.layout });

    // 7) 弹窗打开时快捷键不触发撤销
    await app.openPasteDialogByEmptyPanel(page, 1);
    const undoCountBeforeDialog = (await app.getHistoryState(page)).undoCount;
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    ctx.check('粘贴弹窗打开时 Ctrl+Z 不触发撤销',
      (await app.getHistoryState(page)).undoCount === undoCountBeforeDialog,
      (await app.getHistoryState(page)).undoCount);
    await app.pasteCancel(page);

    // 8) 新操作清空 redo
    await app.undo(page);
    await app.api.setLayout(page, 2, 2);
    await app.waitHistoryCommit(page);
    ctx.check('新操作后 redo 不可用',
      (await app.getHistoryState(page)).canRedo === false,
      await app.getHistoryState(page));

    // 9) 分组创建可撤销 / 可重做
    await app.setMultiSelect(page, [0, 1]);
    const groupRes = await app.createGroup(page, { panels: [0, 1], name: '撤销组', scheme: 'alpha-paren', start: 1 });
    await app.waitHistoryCommit(page);
    const groupsBeforeUndo = (await app.getGroups(page)).length;
    await app.undo(page);
    const groupsAfterUndo = (await app.getGroups(page)).length;
    ctx.check('分组创建可撤销',
      groupRes.ok === true && groupsAfterUndo === groupsBeforeUndo - 1,
      { before: groupsBeforeUndo, after: groupsAfterUndo });
    await app.redo(page);
    ctx.check('分组创建可重做', (await app.getGroups(page)).length === groupsBeforeUndo,
      (await app.getGroups(page)).length);

    // 10) 页改名可撤销
    const nameBeforeRename = (await app.getPages(page))[0].name;
    await app.renamePage(page, 0, '改名测试页');
    await app.waitHistoryCommit(page);
    await app.undo(page);
    ctx.check('页改名可撤销',
      (await app.getPages(page))[0].name === nameBeforeRename,
      { before: nameBeforeRename, after: (await app.getPages(page))[0].name });
    await app.redo(page);
    ctx.check('页改名可重做',
      (await app.getPages(page))[0].name === '改名测试页', (await app.getPages(page))[0].name);

    // 11) 文本输入框聚焦时 Ctrl+Z 不触发全局撤销
    await page.locator('#filename-input').click();
    const undoCountBeforeInput = (await app.getHistoryState(page)).undoCount;
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(250);
    ctx.check('文本输入框聚焦时 Ctrl+Z 不触发撤销',
      (await app.getHistoryState(page)).undoCount === undoCountBeforeInput,
      (await app.getHistoryState(page)).undoCount);
    await blurFocus(page);

    await ctx.screenshot('undo-redo-final');
  },
};

/* ----------------------------- O 分组 + 多页导出 + .fig ----------------------------- */
const groupsExportFigScenario = {
  code: 'O',
  name: 'groups-export-fig',
  title: '分组/多页导出/.fig',
  description: '分组独立编号与虚线框（仅预览）、合并保留组、模板清理失效组；多页 PDF/ZIP 导出（API+UI）与 pdfinfo/zipfile 校验；桌面桥 .fig 导入与浏览器模式可读报错',
  async run(ctx) {
    const { page } = ctx;
    await app.installDesktopBridgeMock(page);
    await app.openAppReady(page);
    if (!(await app.ensureV12(ctx, page))) return;
    await app.api.clearAll(page);

    /* ---------- A. 分组 ---------- */
    await app.api.setLayout(page, 2, 2);
    await app.uploadFiles(page, [
      samplePath('sample-1.png'), samplePath('sample-2.png'), samplePath('sample-3.png'),
    ], null, 3);
    await app.setLabelScheme(page, 'alpha-paren');
    await app.setNumberInput(page, '#label-start', 1);

    // UI 创建分组：选中面板 0 与 2
    await app.clickPanel(page, 0, ['Control']);
    await app.clickPanel(page, 2, ['Control']);
    await app.openGroupDialogUi(page);
    let groupDialog = await app.getGroupDialogState(page);
    ctx.check('分组弹窗打开且默认值可用',
      groupDialog.open && typeof groupDialog.name === 'string' && groupDialog.scheme != null,
      groupDialog);
    await app.setGroupForm(page, { name: '组 A', scheme: 'roman-paren', start: 3 });
    await page.waitForTimeout(200);
    groupDialog = await app.getGroupDialogState(page);
    ctx.check('分组预览包含组内独立编号 (iii)/(iv)',
      /\(iii\)/.test(groupDialog.preview || '') && /\(iv\)/.test(groupDialog.preview || ''),
      groupDialog.preview);
    await app.saveGroupUi(page);
    let groups = await app.getGroups(page);
    let groupList = await app.getGroupListUi(page);
    ctx.check('UI 保存分组成功（1 组、名称/方案/起始正确）',
      groups.length === 1 && groups[0].name === '组 A'
        && groups[0].scheme === 'roman-paren' && groups[0].start === 3,
      groups);
    ctx.check('分组面板为 [0,2]',
      JSON.stringify((groups[0].panels || []).slice().sort((a, b) => a - b)) === '[0,2]', groups[0].panels);
    ctx.check('分组列表 UI 显示 1 个 chip 且预览出现组框',
      groupList.count === 1 && groupList.outlineCount >= 1, groupList);

    // 分组编号：组内 (iii)(iv)，其它全局 (a)(b)
    let state = await app.api.getState(page);
    let expectedLabels = app.expectedLabelsV12(state);
    let info = await app.api.getPreviewInfo(page);
    ctx.check('分组编号：组内 (iii)(iv)、全局 (a)（空面板跳过）',
      labelsMatch(info.labels, expectedLabels)
        && JSON.stringify(expectedLabels.map((item) => `${item.cellIndex}:${item.text}`))
          === JSON.stringify(['0:(iii)', '1:(a)', '2:(iv)']),
      { actual: info.labels, expected: expectedLabels });
    let dom = await app.getPreviewDom(page);
    ctx.check('预览 label-text 与期望一致',
      JSON.stringify(dom.labels.map((item) => item.text))
        === JSON.stringify(expectedLabels.map((item) => item.text)),
      dom.labels.map((item) => item.text));

    // 导出 SVG：编号文字一致，组框仅预览不应出现在导出中
    const groupSvg = await exportAndVerify(ctx, page, {
      format: 'svg', filename: 'fp-v12-groups', kind: 'svg',
      overrides: { transparent: false, filename: 'fp-v12-groups' },
      verifyOptions: {
        expectCells: 4, expectImages: 3, expectLabels: expectedLabels.length,
        expectLabelTexts: expectedLabels.map((item) => item.text).join('|'),
        expectBg: 'white', tolerance: 0.02,
      },
      label: '分组 SVG（导出不含组框）',
    });
    const svgText = fs.readFileSync(groupSvg.exported.path, 'utf8');
    ctx.check('导出 SVG 不含预览专用组框元素（group-outline/group-name）',
      !/group-outline|group-name/.test(svgText), {
        hasGroupOutline: /group-outline/.test(svgText),
        hasGroupName: /group-name/.test(svgText),
      });

    // API 更新分组编号
    const updateRes = await app.updateGroup(page, groups[0].id, { scheme: 'number-dot', start: 1 });
    await page.waitForTimeout(150);
    state = await app.api.getState(page);
    expectedLabels = app.expectedLabelsV12(state);
    info = await app.api.getPreviewInfo(page);
    ctx.check('updateGroup 修改组方案后编号更新（1./2.）',
      updateRes.ok === true
        && expectedLabels.filter((item) => item.groupId).map((item) => item.text).join(',') === '1.,2.'
        && labelsMatch(info.labels, expectedLabels),
      { expected: expectedLabels, actual: info.labels });

    // 第二组 + 删除组 API
    const groupB = await app.createGroup(page, { panels: [1], name: '组 B', scheme: 'alpha-paren', start: 5 });
    await page.waitForTimeout(150);
    state = await app.api.getState(page);
    expectedLabels = app.expectedLabelsV12(state);
    ctx.check('createGroup(组 B, 面板 1) 后组 B 编号为 (e)',
      groupB.ok === true
        && expectedLabels.find((item) => item.cellIndex === 1 && item.text === '(e)') !== undefined,
      expectedLabels);
    const deleteB = await app.deleteGroupApi(page, groupB.group.id);
    await page.waitForTimeout(150);
    ctx.check('deleteGroup 删除组 B 后恢复全局编号 (a)',
      deleteB.ok === true && (await app.getGroups(page)).length === 1
        && (await app.api.getPreviewInfo(page)).labels.some((item) => item.cellIndex === 1 && item.text === '(a)'),
      await app.getGroups(page));

    // 合并保留组：清空分组后给 0,1 建组再合并
    for (const group of await app.getGroups(page)) await app.deleteGroupApi(page, group.id);
    const mergedGroup = await app.createGroup(page, { panels: [0, 1], name: '合并组', scheme: 'number-paren', start: 1 });
    await page.waitForTimeout(150);
    const mergeRes = await app.mergePanels(page, [0, 1], { force: true });
    await page.waitForTimeout(200);
    const groupsAfterMerge = await app.getGroups(page);
    ctx.check('合并同组面板后锚点保留该组',
      mergeRes.ok === true && groupsAfterMerge.length === 1
        && groupsAfterMerge[0].panels.indexOf(mergeRes.info.cells[0].index) >= 0,
      { merge: mergeRes.ok, groups: groupsAfterMerge });
    await app.splitPanel(page, 0);
    await app.api.setLayout(page, 2, 2);
    await app.api.clearAll(page);

    // 模板清理失效分组：先建组在面板 3，再切到 single-1
    await app.uploadFiles(page, [samplePath('sample-1.png')], null, 1);
    const cleanupGroup = await app.createGroup(page, { panels: [3], name: '待清理组' });
    ctx.check('创建待清理分组成功', cleanupGroup.ok === true, cleanupGroup);
    await app.applyTemplate(page, 'single-1');
    await page.waitForTimeout(200);
    ctx.check('模板切换到 1 面板后失效分组被清理',
      (await app.getGroups(page)).length === 0, await app.getGroups(page));

    /* ---------- B. 多页导出 ---------- */
    await app.api.clearAll(page);
    await app.api.setLayout(page, 2, 2);
    await app.uploadFiles(page, [samplePath('sample-1.png'), samplePath('sample-2.png')], null, 2);
    await app.addPage(page, 'new');
    await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageCount === 2, null,
      { label: 'export page2' });
    await app.api.setLayout(page, 2, 2);
    await app.uploadFiles(page, [samplePath('sample-3.png'), samplePath('sample-4.png')], null, 2);
    await app.setPage(page, 0);
    await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageIndex === 0, null,
      { label: 'back page1 for export' });
    const scopeState = await app.getExportScopeState(page);
    ctx.check('pageCount>1 时显示导出范围控件',
      scopeState.rowHidden === false && scopeState.activeScope === 'current', scopeState);
    await app.clickExportScope(page, 'all');
    const scopeAll = await app.getExportScopeState(page);
    const exportState = await app.getExportState(page);
    ctx.check('切换「全部页」后 scope=all 且有提示文案',
      scopeAll.activeScope === 'all' && exportState.scope === 'all'
        && scopeAll.noteHidden === false && /页|PDF|ZIP/i.test(scopeAll.noteText || ''),
      { scopeAll, export: exportState });

    const pageGeom = app.computeGeometryMm((await app.api.getState(page)).layout);
    const expectedPx = app.expectedPixelSize(pageGeom, 150);

    // 多页 PDF（API）
    const pdfPages = await app.saveAllPagesExport(page, 'pdf',
      { dpi: 150, filename: 'fp-v12-pdf', quality: 0.92 }, ctx.exportsDir);
    const pdfVerify = verifyExport('pdf', pdfPages.path, {
      expectPages: 2,
      expectWidthMm: round(pageGeom.widthMm, 3), expectHeightMm: round(pageGeom.heightMm, 3),
      renderDir: path.join(ctx.exportsDir, 'pdf-render'), renderPrefix: 'fp-v12-pages',
      renderDpi: 72, tolerancePt: 0.6,
    });
    ctx.evidence.exports.push({
      label: '多页 PDF（2 页）', format: 'pdf', filename: pdfPages.filename, path: pdfPages.path,
      size: pdfPages.size, verifierOk: pdfVerify.ok, failedChecks: pdfVerify.failedChecks,
      verifier: pdfVerify.report,
    });
    ctx.check('多页 PDF：pageCount=2 且文件生成', pdfPages.pageCount === 2 && pdfPages.size > 0,
      { pageCount: pdfPages.pageCount, size: pdfPages.size });
    ctx.check('多页 PDF：pdfinfo 页数=2、渲染 2 页、MediaBox 正确', pdfVerify.ok,
      describeVerify(pdfVerify));
    const pdfDetails = pdfVerify.report && pdfVerify.report.details;
    ctx.check('多页 PDF：页数来源 pdfinfo 且 =2',
      !!pdfDetails && pdfDetails.pageCountSource === 'pdfinfo' && pdfDetails.pdfinfoPages === 2,
      pdfDetails && { source: pdfDetails.pageCountSource, pdfinfoPages: pdfDetails.pdfinfoPages,
        renderPageCount: pdfDetails.renderPageCount });

    // 多页 PNG ZIP（API）
    const pngZip = await app.saveAllPagesExport(page, 'png',
      { dpi: 150, transparent: false, filename: 'fp-v12-png' }, ctx.exportsDir);
    const pngZipVerify = verifyExport('zip', pngZip.path, {
      expectEntries: 2, expectExt: 'png',
      expectNamePattern: '-p\\d{2}\\.png$',
      expectImageWidth: expectedPx.width, expectImageHeight: expectedPx.height,
    });
    ctx.evidence.exports.push({
      label: '多页 PNG ZIP（2 页）', format: 'zip', filename: pngZip.filename, path: pngZip.path,
      size: pngZip.size, verifierOk: pngZipVerify.ok, failedChecks: pngZipVerify.failedChecks,
      verifier: pngZipVerify.report,
    });
    ctx.check('多页 PNG ZIP：2 个条目且均为可解码 PNG',
      pngZip.pageCount === 2 && pngZipVerify.ok, describeVerify(pngZipVerify));
    ctx.check('多页 PNG ZIP：条目命名 -p01/-p02、尺寸=mm/25.4×150',
      !!pngZipVerify.report && JSON.stringify(pngZipVerify.report.details.names)
        === JSON.stringify(['fp-v12-png-p01.png', 'fp-v12-png-p02.png']),
      pngZipVerify.report && pngZipVerify.report.details.names);

    // 多页 SVG ZIP（API）
    const svgZip = await app.saveAllPagesExport(page, 'svg',
      { transparent: false, filename: 'fp-v12-svg' }, ctx.exportsDir);
    const svgZipVerify = verifyExport('zip', svgZip.path, {
      expectEntries: 2, expectExt: 'svg', expectNamePattern: '-p\\d{2}\\.svg$',
    });
    ctx.evidence.exports.push({
      label: '多页 SVG ZIP（2 页）', format: 'zip', filename: svgZip.filename, path: svgZip.path,
      size: svgZip.size, verifierOk: svgZipVerify.ok, failedChecks: svgZipVerify.failedChecks,
      verifier: svgZipVerify.report,
    });
    ctx.check('多页 SVG ZIP：2 个条目且均为合法 SVG 且含 label-text',
      svgZip.pageCount === 2 && svgZipVerify.ok, describeVerify(svgZipVerify));

    // 多页 JPG ZIP（API）
    const jpgZip = await app.saveAllPagesExport(page, 'jpg',
      { dpi: 150, quality: 0.9, filename: 'fp-v12-jpg' }, ctx.exportsDir);
    const jpgZipVerify = verifyExport('zip', jpgZip.path, {
      expectEntries: 2, expectExt: 'jpg', expectNamePattern: '-p\\d{2}\\.jpg$',
    });
    ctx.evidence.exports.push({
      label: '多页 JPG ZIP（2 页）', format: 'zip', filename: jpgZip.filename, path: jpgZip.path,
      size: jpgZip.size, verifierOk: jpgZipVerify.ok, failedChecks: jpgZipVerify.failedChecks,
      verifier: jpgZipVerify.report,
    });
    ctx.check('多页 JPG ZIP：2 个条目且均可解码',
      jpgZip.pageCount === 2 && jpgZipVerify.ok, describeVerify(jpgZipVerify));

    // UI 全页导出：PDF 下载
    await app.clickFormat(page, 'pdf');
    await app.setNumberInput(page, '#dpi-input', 150);
    await app.setNumberInput(page, '#filename-input', 'fp-v12-ui');
    const uiPdf = await app.uiDownload(page, 'pdf', '#btn-export', ctx.exportsDir, 'fp-v12-ui-pages.pdf');
    const uiPdfVerify = verifyExport('pdf', uiPdf.path, {
      expectPages: 2, renderDir: path.join(ctx.exportsDir, 'pdf-render'),
      renderPrefix: 'fp-v12-ui', renderDpi: 72,
    });
    ctx.check('UI 全页导出 PDF：下载成功、文件名 .pdf、页数=2',
      uiPdf.suggestedFilename.endsWith('.pdf') && uiPdf.size > 0 && uiPdfVerify.ok,
      { filename: uiPdf.suggestedFilename, size: uiPdf.size, verifier: describeVerify(uiPdfVerify) });
    ctx.evidence.exports.push({
      label: 'UI 全页 PDF', format: 'pdf', filename: uiPdf.filename, path: uiPdf.path,
      size: uiPdf.size, verifierOk: uiPdfVerify.ok, failedChecks: uiPdfVerify.failedChecks,
      verifier: uiPdfVerify.report,
    });

    // UI 全页导出：PNG ZIP 下载
    await app.clickFormat(page, 'png');
    await app.setNumberInput(page, '#filename-input', 'fp-v12-uipng');
    const uiZip = await app.uiDownload(page, 'png', '#btn-export', ctx.exportsDir, 'fp-v12-uipng-pages.zip');
    const uiZipVerify = verifyExport('zip', uiZip.path, {
      expectEntries: 2, expectExt: 'png', expectNamePattern: '-p\\d{2}\\.png$',
    });
    ctx.check('UI 全页导出 PNG：下载 ZIP、2 个条目且可解码',
      /\.zip$/.test(uiZip.suggestedFilename) && uiZipVerify.ok,
      { filename: uiZip.suggestedFilename, size: uiZip.size, verifier: describeVerify(uiZipVerify) });
    ctx.evidence.exports.push({
      label: 'UI 全页 PNG ZIP', format: 'zip', filename: uiZip.filename, path: uiZip.path,
      size: uiZip.size, verifierOk: uiZipVerify.ok, failedChecks: uiZipVerify.failedChecks,
      verifier: uiZipVerify.report,
    });
    await ctx.screenshot('multipage-export');

    /* ---------- C. MATLAB .fig（桌面桥 mock） ---------- */
    const figCountBefore = await app.bridgeMessageCount(page, 'import-fig');
    const fakeFig = await app.createFakeFigFile(path.join(ctx.runDir, 'tmp'), 'mock-figure.fig');
    const targetPanel = 0;
    await app.uploadFigFile(page, fakeFig, targetPanel);
    const figRequest = await app.waitFigImportRequest(page, figCountBefore + 1, { timeout: 10000 })
      .catch(() => null);
    ctx.check('上传 .fig 后 app 向桌面 host 发送 import-fig 请求',
      !!figRequest && figRequest.type === 'import-fig', figRequest);
    ctx.check('import-fig 请求含 requestId/filename/base64',
      !!figRequest && String(figRequest.requestId || '').length > 0
        && /\.fig$/i.test(String(figRequest.filename || ''))
        && typeof figRequest.base64 === 'string' && figRequest.base64.length > 10,
      figRequest && {
        requestId: figRequest.requestId, filename: figRequest.filename,
        base64Length: figRequest.base64 && figRequest.base64.length,
      });
    const figDataUrl = app.fileToDataUrl(samplePath('sample-1.png'), 'image/png');
    await app.respondFigImported(page, figRequest, {
      dataUrl: figDataUrl, width: 1200, height: 900, sourceFormat: 'MATLAB-FIG',
    });
    let figCell = null;
    try {
      figCell = await app.waitFigCell(page, targetPanel, { expectedWidth: 1200, expectedHeight: 900, timeout: 15000 });
    } catch (err) {
      figCell = null;
    }
    ctx.check('桌面桥回包后 .fig 成功插入（cell.name 变为 .png）',
      !!figCell && /^mock-figure\.png$/i.test(figCell.name),
      figCell);
    ctx.check('.fig 导入结果尺寸/数据正确（1200×900）',
      !!figCell && figCell.width === 1200 && figCell.height === 900, figCell && { w: figCell.width, h: figCell.height });
    dom = await app.getPreviewDom(page);
    const figImage = dom.images.find((item) => item.cellIndex === targetPanel && item.display !== 'none');
    ctx.check('.fig 导入后预览图片 dataURL 与回包一致',
      !!figImage && figImage.href === figDataUrl,
      figImage && { hrefLength: figImage.href.length, expectedLength: figDataUrl.length });
    fs.rmSync(fakeFig, { force: true });

    // 浏览器模式 .fig：可读错误提示、无页面错误
    const browser0 = page.context().browser();
    const plainContext = await browser0.newContext({ viewport: { width: 1440, height: 900 } });
    const plainPage = await plainContext.newPage();
    let plainDiagnostics = null;
    let plainToast = '';
    try {
      await app.openAppReady(plainPage);
      const plainFig = await app.createFakeFigFile(path.join(ctx.runDir, 'tmp'), 'browser-mode.fig');
      const toastPromise = plainPage.waitForFunction(() => {
        const toast = document.getElementById('toast');
        return toast && /\.fig|MATLAB|桌面版/.test(toast.textContent || '') ? toast.textContent : null;
      }, null, { timeout: 8000 }).catch(() => null);
      await app.api.setUploadTarget(plainPage, 0);
      await plainPage.locator('#file-input').setInputFiles([plainFig]);
      await toastPromise;
      plainToast = await plainPage.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
      const plainInfo = await app.api.getPreviewInfo(plainPage);
      fs.rmSync(plainFig, { force: true });
      ctx.check('浏览器模式上传 .fig 给出可读错误提示（无 webview）',
        /\.fig|MATLAB|桌面版/.test(plainToast) && plainInfo.imageCount === 0,
        { toast: plainToast, imageCount: plainInfo.imageCount });
    } finally {
      plainDiagnostics = { pageErrors: [] };
      await plainContext.close();
    }

    ctx.evidence.keyExports = [
      pdfPages.path, pngZip.path, svgZip.path, jpgZip.path, groupSvg.exported.path,
      uiPdf.path, uiZip.path,
    ];
    await ctx.screenshot('fig-import');
  },
};

export const scenariosV12 = [
  multiPageScenario,
  undoRedoScenario,
  groupsExportFigScenario,
];
