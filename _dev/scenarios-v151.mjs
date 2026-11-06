/**
 * FigurePlay v1.5.1 新功能 E2E 场景（AG–AI）
 *
 * AG 页面自动编号：图1→新建图2→删图1自动变图1→再新建图1/图2→复制“图1 副本”不重编号
 * AH 原生保存路径：stub FP.desktop.saveFile 捕获工程/配置/PNG/PDF；path 状态、取消、浏览器回退
 * AI 诊断日志：就绪/toast/error 记录；帮助弹窗刷新/导出（host save mock/下载）/清空；localStorage 上限
 */
import fs from 'node:fs';
import path from 'node:path';

import * as app from './lib/app.mjs';
import { samplePath, saveDownload, waitForDownload } from './lib/browser.mjs';

/* ----------------------------- AG 页面自动编号 ----------------------------- */
const pageAutoNumberScenario = {
  code: 'AG',
  name: 'page-auto-number',
  title: '页面自动编号',
  description: '初始图1；新建→图1/图2；删除图1后剩余页自动变图1；再新建→图1/图2；复制页“图1 副本”不被误编号；tab/API 同步',
  async run(ctx) {
    const { page } = ctx;
    const tabNames = (state) => state.tabs.map((tab) => String(tab.title || tab.text || '').replace(/（.*$/, '').trim());
    await app.openAppReady(page);
    if (!(await app.ensureV151(ctx, page))) return;
    await app.api.clearAll(page);
    await app.setPage(page, 0);

    let state = await app.getPageNameState(page);
    ctx.check('初始 1 页自动命名「图 1」（API/tab/当前页名一致）',
      state.pageCount === 1 && state.names[0] === '图 1'
      && state.currentName === '图 1'
      && state.tabs.length === 1 && tabNames(state)[0] === '图 1',
      { names: state.names, current: state.currentName, tabs: state.tabs });

    await app.clickPageAction(page, 'add');
    await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageCount === 2, null,
      { label: 'add page2' });
    state = await app.getPageNameState(page);
    ctx.check('新建第 2 页自动命名「图 1/图 2」且当前页=图 2',
      state.names.join(',') === '图 1,图 2' && state.current === 1 && state.currentName === '图 2'
      && tabNames(state).join(',') === '图 1,图 2',
      { names: state.names, currentName: state.currentName, tabs: tabNames(state) });

    await app.clickPageTab(page, 0);
    page.once('dialog', async (dialog) => { await dialog.accept(); });
    await app.clickPageAction(page, 'del');
    await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageCount === 1, null,
      { label: 'delete page1' });
    state = await app.getPageNameState(page);
    ctx.check('删除图 1 后剩余页自动变「图 1」（pageCount=1/当前名同步）',
      state.pageCount === 1 && state.names.join(',') === '图 1' && state.currentName === '图 1'
      && tabNames(state).join(',') === '图 1',
      { names: state.names, tabs: tabNames(state) });

    await app.clickPageAction(page, 'add');
    await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageCount === 2, null,
      { label: 'add page2 again' });
    state = await app.getPageNameState(page);
    ctx.check('再次新建后恢复「图 1/图 2」并自动切换当前页图 2',
      state.names.join(',') === '图 1,图 2' && state.currentName === '图 2',
      state.names);

    await app.clickPageTab(page, 0);
    await app.clickPageAction(page, 'dup');
    await app.waitPageState(page, () => window.__FIGPLAY__.getPreviewInfo().pageCount === 3, null,
      { label: 'duplicate page1' });
    state = await app.getPageNameState(page);
    ctx.check('复制图 1 后新页命名「图 1 副本」且默认页仍为图 1/图 2（不误编号）',
      state.names.join(',') === '图 1,图 1 副本,图 2'
      && state.currentName === '图 1 副本' && state.pageCount === 3,
      state.names);
    ctx.check('复制页不被 renumber：tab 文本与 API 名称完全同步',
      tabNames(state).join(',') === state.names.join(',')
      && state.tabs.length === 3,
      { tabs: tabNames(state), names: state.names });

    await ctx.screenshot('page-auto-number');
    ctx.evidence.pageAutoNumber = {
      initial: ['图 1'],
      afterAdd: ['图 1', '图 2'],
      afterDelete: ['图 1'],
      afterAddAgain: ['图 1', '图 2'],
      afterDuplicate: state.names,
      currentName: state.currentName,
    };
    await app.api.clearAll(page);
  },
};

/* ----------------------------- AH 原生保存路径 ----------------------------- */
const nativeSaveScenario = {
  code: 'AH',
  name: 'native-save',
  title: '原生保存路径',
  description: 'stub FP.desktop.saveFile 捕获工程/配置/PNG/PDF 导出；path 状态、取消；浏览器回退 picker/download',
  async run(ctx) {
    const { page } = ctx;
    const hostPathPrefix = 'C:\\Users\\E2E\\Documents\\';
    await app.installDesktopBridgeMock(page);
    await app.openAppReady(page);
    if (!(await app.ensureV151(ctx, page))) return;
    // 配置模块 init 会先 loadConfigProfiles，响应空列表让配置 UI 完成初始化
    const loadReq = await app.waitNewBridgeMessage(page, 'load-config-profiles', 1,
      { timeout: 12000, label: 'native save config load' });
    await app.sendBridgeMessage(page, {
      type: 'config-profiles', requestId: loadReq.requestId, ok: true,
      profiles: [], path: 'C:\\Users\\E2E\\AppData\\Roaming\\FigurePlay\\configs\\profiles.json', exists: true,
    });
    await app.clearConfigProfiles(page).catch(() => null);
    await app.api.clearAll(page);
    await app.uploadFiles(page, [samplePath('sample-1.png')], null, 1);
    await app.stubSaveFile(page);
    const decode = (base64) => Buffer.from(String(base64 || ''), 'base64');
    const getCalls = async () => (await app.getSaveFileMock(page)).calls;

    // 工程保存
    await page.locator('#btn-project-save').click();
    await page.waitForFunction(() => window.__saveFileMock && window.__saveFileMock.calls.length >= 1,
      null, { timeout: 15000 });
    let calls = await getCalls();
    const projectCall = calls[0];
    const projectText = decode(projectCall && projectCall.base64).toString('utf8');
    let projectJson = null;
    try { projectJson = JSON.parse(projectText); } catch (err) { projectJson = null; }
    ctx.check('工程保存走 FP.desktop.saveFile（filter=.figureplay-project，base64 为工程 JSON）',
      !!projectCall && projectCall.filterExtensions.join(',') === '.figureplay-project'
      && /FigurePlay 工程文件/.test(projectCall.filterName || '')
      && !!projectJson && projectJson.type === 'figureplay-project'
      && projectJson.schemaVersion === 1,
      { call: projectCall && { name: projectCall.suggestedName, filter: projectCall.filterExtensions } });
    const projectUi = await app.getProjectFileUiState(page);
    ctx.check('工程保存后状态显示原生路径（已保存工程 → C:\\Users\\E2E\\Documents\\…）',
      /已保存工程/.test(projectUi.status || '') && /C:\\Users\\E2E\\Documents/.test(projectUi.status || ''),
      projectUi.status);

    // 配置导出
    await app.openConfigDialog(page, 'save');
    await app.setConfigForm(page, { name: '原生保存配置', description: 'native saveFile 测试' });
    await app.saveCurrentConfig(page);
    await app.closeConfigDialog(page);
    await app.openConfigDialog(page);
    await page.locator('#config-list .config-item').filter({ hasText: '原生保存配置' })
      .locator('[data-action="export"]').first().click();
    await page.waitForFunction(() => window.__saveFileMock.calls.length >= 2, null, { timeout: 15000 });
    calls = await getCalls();
    const configCall = calls[1];
    let configJson = null;
    try { configJson = JSON.parse(decode(configCall && configCall.base64).toString('utf8')); } catch (err) { configJson = null; }
    ctx.check('配置 JSON 导出走 saveFile（filter=.json，payload type=figureplay-config）',
      !!configCall && configCall.filterExtensions.join(',') === '.json'
      && /FigurePlay 配置/.test(configCall.filterName || '')
      && !!configJson && configJson.type === 'figureplay-config',
      { call: configCall && { name: configCall.suggestedName, filter: configCall.filterExtensions } });
    ctx.check('配置导出 toast/状态包含原生路径',
      /C:\\Users\\E2E\\Documents/.test((await app.getToast(page)).text || ''),
      (await app.getToast(page)).text);
    await app.closeConfigDialog(page);

    // PNG 导出
    await app.clickFormat(page, 'png');
    await page.locator('#btn-export-top').click();
    await page.waitForFunction(() => window.__saveFileMock.calls.length >= 3, null, { timeout: 30000 });
    calls = await getCalls();
    const pngCall = calls[2];
    const pngBytes = decode(pngCall && pngCall.base64);
    const pngSignature = pngBytes.slice(0, 4).toString('hex');
    ctx.check('PNG 导出走 saveFile（filter=.png，base64 为 PNG 文件头）',
      !!pngCall && pngCall.filterExtensions.join(',') === '.png'
      && pngSignature === '89504e47' && pngBytes.length > 1000,
      { call: pngCall && { name: pngCall.suggestedName, filter: pngCall.filterExtensions }, bytes: pngBytes.length });
    ctx.check('PNG 导出后状态显示“已保存到 …Documents…”',
      /已保存到 C:\\Users\\E2E\\Documents/.test((await app.getExportUiState(page)).ui.statusText || ''),
      (await app.getExportUiState(page)).ui.statusText);

    // PDF 导出
    await app.clickFormat(page, 'pdf');
    await page.locator('#btn-export-top').click();
    await page.waitForFunction(() => window.__saveFileMock.calls.length >= 4, null, { timeout: 30000 });
    calls = await getCalls();
    const pdfCall = calls[3];
    const pdfText = decode(pdfCall && pdfCall.base64).slice(0, 5).toString('latin1');
    ctx.check('PDF 导出走 saveFile（filter=.pdf，base64 以 %PDF- 开头）',
      !!pdfCall && pdfCall.filterExtensions.join(',') === '.pdf' && pdfText === '%PDF-',
      { call: pdfCall && { name: pdfCall.suggestedName, filter: pdfCall.filterExtensions }, head: pdfText });

    // 取消
    await app.pushSaveFileResult(page, { ok: true, canceled: true });
    await page.locator('#btn-export-top').click();
    await app.waitFor(page, () => {
      const status = document.getElementById('status-text');
      return !!status && /已取消导出/.test(status.textContent || '');
    }, null, { timeout: 15000, label: 'save canceled status' });
    calls = await getCalls();
    ctx.check('取消原生保存：状态=已取消导出、调用 saveFile 后不产生下载',
      calls.length === 5 && /已取消导出/.test((await app.getExportUiState(page)).ui.statusText || ''),
      { calls: calls.length, status: (await app.getExportUiState(page)).ui.statusText });

    // 浏览器回退：无宿主，移除 showSaveFilePicker → 下载
    const browser = page.context().browser();
    const plainContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const plainPage = await plainContext.newPage();
    try {
      await app.openAppReady(plainPage);
      await app.installFakeSavePicker(plainPage, { mode: 'remove' });
      await app.api.clearAll(plainPage);
      await app.uploadFiles(plainPage, [samplePath('sample-1.png')], null, 1);
      await app.clickFormat(plainPage, 'png');
      const download = await waitForDownload(plainPage, () => plainPage.locator('#btn-export-top').click(), { timeout: 30000 });
      const saved = await saveDownload(download, 'fp-v151-browser-fallback.png', { dir: ctx.exportsDir });
      await app.restoreSavePicker(plainPage);
      ctx.check('浏览器模式 PNG 导出回退为下载（无宿主、无 picker）',
        /\.png$/i.test(saved.suggestedFilename || '') && saved.size > 1000,
        { filename: saved.suggestedFilename, size: saved.size });
      ctx.check('浏览器回退后状态为“已导出”',
        /已导出/.test((await app.getExportUiState(plainPage)).ui.statusText || ''));
      await app.installFakeSavePicker(plainPage, { mode: 'remove' });
      const projectDownload = await waitForDownload(plainPage, () => plainPage.locator('#btn-project-save').click(), { timeout: 30000 });
      const projectSaved = await saveDownload(projectDownload, 'fp-v151-browser-project.figureplay-project', { dir: ctx.exportsDir });
      await app.restoreSavePicker(plainPage);
      const projectTextBrowser = fs.readFileSync(projectSaved.path, 'utf8');
      ctx.check('浏览器模式工程保存回退为下载 .figureplay-project',
        /\.figureplay-project$/i.test(projectSaved.suggestedFilename || '')
        && /"type":"figureplay-project"/.test(projectTextBrowser),
        { filename: projectSaved.suggestedFilename, size: projectSaved.size });
    } finally {
      await plainContext.close();
    }

    await ctx.screenshot('native-save');
    ctx.evidence.nativeSave = {
      calls: (await getCalls()).map((call) => ({ name: call.suggestedName, filters: call.filterExtensions, bytes: call.base64Length })),
      projectPathStatus: projectUi.status,
      canceledStatus: (await app.getExportUiState(page)).ui.statusText,
      hostPathPrefix,
    };
    await app.api.clearAll(page);
  },
};

/* ----------------------------- AI 诊断日志 ----------------------------- */
const diagnosticsScenario = {
  code: 'AI',
  name: 'diagnostics-log',
  title: '诊断日志',
  description: '就绪/toast/error 进入日志；帮助弹窗刷新/导出/清空；导出 host save mock 与浏览器下载；localStorage 上限；不记录图片二进制',
  async run(ctx) {
    const { page } = ctx;
    await app.openAppReady(page);
    if (!(await app.ensureV151(ctx, page))) return;
    let diag = await app.getDiagnosticState(page);
    ctx.check('应用就绪写入诊断日志（info 级，含版本号）',
      diag.logCount >= 1 && diag.levels.info >= 1
      && diag.logs.some((entry) => /应用就绪 v1\.5\.1/.test(entry.message || '')),
      { count: diag.logCount, levels: diag.levels, first: diag.logs[0] });

    await page.evaluate(() => window.FP.toast('E2E 日志 toast 测试', 'info'));
    await page.evaluate(() => window.FP.logEvent('error', 'E2E 错误级日志', { code: 'E2E-ERR' }));
    diag = await app.getDiagnosticState(page);
    ctx.check('toast 与 error 事件进入日志（level=toast/error）',
      diag.logs.some((entry) => entry.level === 'toast' && /E2E 日志 toast 测试/.test(entry.message || ''))
      && diag.logs.some((entry) => entry.level === 'error' && /E2E 错误级日志/.test(entry.message || '')),
      { levels: diag.levels });

    await app.openHelpDialog(page);
    await page.locator('#diag-log-refresh').click();
    diag = await app.getDiagnosticState(page);
    ctx.check('帮助弹窗日志面板显示时间戳/级别/内容（刷新后同步）',
      diag.helpOpen === true && diag.textLines >= 3
      && /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/.test(diag.textValue || '')
      && /TOAST/.test(diag.textValue || '') && /ERROR/.test(diag.textValue || ''),
      { lines: diag.textLines, sample: String(diag.textValue || '').split('\n').slice(0, 3) });

    // 上传图片后日志不应包含图片二进制
    await app.closeHelpDialog(page);
    await app.api.clearAll(page);
    await app.uploadFiles(page, [samplePath('sample-1.png')], null, 1);
    await app.logEvents(page, 5, 'info', 'E2E 二进制检查');
    diag = await app.getDiagnosticState(page);
    ctx.check('日志不记录图片二进制/dataURL（无 data:image/base64 大段）',
      !/data:image|iVBORw0KGgo/.test(JSON.stringify(diag.logs)),
      { logCount: diag.logCount });

    // localStorage 上限 300
    await page.evaluate(() => {
      for (let i = 0; i < 350; i++) window.FP.logEvent('info', 'E2E 上限填充 #' + i);
    });
    diag = await app.getDiagnosticState(page);
    ctx.check('localStorage 诊断日志上限 300 条（超出裁剪旧记录）',
      diag.storage.length === 300 && diag.logCount === 300
      && diag.storage.size > 0 && diag.storage.size < 300 * 1024,
      { storage: diag.storage, count: diag.logCount });
    ctx.check('上限裁剪后仍保留最新日志（末条=#349）',
      /E2E 上限填充 #349/.test((diag.logs[diag.logs.length - 1] || {}).message || ''),
      (diag.logs[diag.logs.length - 1] || {}).message);

    // 浏览器导出下载
    await app.openHelpDialog(page);
    const download = await waitForDownload(page, () => page.locator('#diag-log-export').click(), { timeout: 20000 });
    const logFile = await saveDownload(download, 'fp-v151-diagnostics.log', { dir: ctx.exportsDir });
    const logText = fs.readFileSync(logFile.path, 'utf8');
    ctx.check('浏览器模式导出日志：下载 .log，含版本/生成时间/日志行',
      /\.log$/i.test(logFile.suggestedFilename || '') && /FigurePlay 诊断日志/.test(logText)
      && /版本：1\.5\.1/.test(logText) && /生成时间：/.test(logText)
      && /INFO/.test(logText),
      { filename: logFile.suggestedFilename, size: logFile.size });
    ctx.check('浏览器导出日志 toast 提示已下载',
      /诊断日志已下载/.test((await app.getToast(page)).text || ''),
      (await app.getToast(page)).text);

    // 清空（confirm accept）
    const diagBeforeClear = await app.getDiagnosticState(page);
    const beforeClear = diagBeforeClear.logCount;
    page.once('dialog', async (dialog) => { await dialog.accept(); });
    await page.locator('#diag-log-clear').click();
    diag = await app.getDiagnosticState(page);
    ctx.check('清空日志：旧条目全部删除（仅保留清空 toast 一条）且 textarea/localStorage 同步',
      beforeClear > 0 && diag.logCount === 1 && diag.storage.length === 1
      && /诊断日志已清空/.test((diag.logs[0] || {}).message || '')
      && /诊断日志已清空/.test(diag.textValue || ''),
      { beforeClear, after: diag.logCount, text: diag.textValue });
    ctx.check('清空日志 toast 提示「诊断日志已清空」',
      /诊断日志已清空/.test((await app.getToast(page)).text || ''));
    await app.closeHelpDialog(page);

    // 桌面 host save mock 导出
    const browser = page.context().browser();
    const hostContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const hostPage = await hostContext.newPage();
    try {
      await app.installDesktopBridgeMock(hostPage);
      await app.openAppReady(hostPage);
      await app.stubSaveFile(hostPage);
      await app.openHelpDialog(hostPage);
      await hostPage.evaluate(() => window.FP.logEvent('info', '宿主日志导出测试'));
      await hostPage.locator('#diag-log-export').click();
      await hostPage.waitForFunction(() => window.__saveFileMock && window.__saveFileMock.calls.length >= 1,
        null, { timeout: 15000 });
      const hostCalls = (await app.getSaveFileMock(hostPage)).calls;
      const call = hostCalls[0];
      const text = Buffer.from(call.base64 || '', 'base64').toString('utf8');
      ctx.check('桌面模式导出日志走 FP.desktop.saveFile（filter=.log，内容含宿主日志/版本）',
        !!call && call.filterExtensions.join(',') === '.log'
        && /FigurePlay 诊断日志/.test(text) && /版本：1\.5\.1/.test(text)
        && /宿主日志导出测试/.test(text),
        { call: call && { name: call.suggestedName, filter: call.filterExtensions }, bytes: call && call.base64Length });
      ctx.check('桌面导出日志 toast 包含原生保存路径',
        /诊断日志已保存/.test((await app.getToast(hostPage)).text || '')
        && /C:\\Users\\E2E\\Documents/.test((await app.getToast(hostPage)).text || ''),
        (await app.getToast(hostPage)).text);
    } finally {
      await hostContext.close();
    }

    await ctx.screenshot('diagnostics-log');
    ctx.evidence.diagnostics = {
      readyLogged: true, toastLogged: true, errorLogged: true,
      levels: diagBeforeClear.levels,
      limit: 300, exportBrowser: logFile.filename, exportHost: 'saveFile(.log)',
      cleared: true, noImageBinary: true,
    };
  },
};

/* ----------------------------- AJ 真实桥回包协议 ----------------------------- */
const realBridgeProtocolScenario = {
  code: 'AJ',
  name: 'real-bridge-protocol',
  title: '真实桥回包',
  description: '注入 window.chrome.webview mock（不 stub FP.desktop.saveFile/checkUpdate）：真实 saveFile 请求 file-saved 回包立即 resolve、requestId 匹配（错误 id 忽略）、path 正确；工程保存 UI 全链路；update-info/update-downloaded 回包经同一 pending 机制解析并带版本字段',
  async run(ctx) {
    const { page } = ctx;
    const base64 = (text) => Buffer.from(text, 'utf8').toString('base64');
    await app.installDesktopBridgeMock(page);
    await app.openAppReady(page);
    if (!(await app.ensureV151(ctx, page))) return;
    // 配置模块 init 请求：正常回应，避免影响后续
    try {
      const load = await app.waitNewBridgeMessage(page, 'load-config-profiles', 1,
        { timeout: 8000, label: 'bridge config load' });
      await app.sendBridgeMessage(page, {
        type: 'config-profiles', requestId: load.requestId, ok: true, profiles: [], path: 'C:\\Users\\E2E\\AppData\\Roaming\\FigurePlay\\configs\\profiles.json', exists: true,
      });
    } catch (err) { /* ignore */ }

    const flags = await page.evaluate(() => ({
      saveFileType: typeof (window.FP && window.FP.desktop && window.FP.desktop.saveFile),
      checkUpdateType: typeof (window.FP && window.FP.desktop && window.FP.desktop.checkUpdate),
      downloadUpdateType: typeof (window.FP && window.FP.desktop && window.FP.desktop.downloadUpdate),
      saveFileMockFlag: !!(window.FP && window.FP.desktop && window.FP.desktop.__e2eMock),
      saveFileMockGlobal: !!window.__saveFileMock,
      updatesApi: !!window.__UPDATES__,
    }));
    ctx.check('真实桥模式：FP.desktop.saveFile 为原生实现（未 stub/未替换）',
      flags.saveFileType === 'function' && flags.saveFileMockFlag === false
      && flags.saveFileMockGlobal === false,
      flags);

    // 1) 真实 saveFile：错误 requestId 忽略，正确回包立即 resolve
    const saveBase64 = base64('{"marker":"figureplay-real-bridge"}');
    await app.startNativeBridgeCall(page, 'save-ok', {
      suggestedName: 'bridge-payload.figureplay.json',
      filterName: 'FigurePlay 桥接测试',
      filterExtensions: ['.json'],
      base64: saveBase64,
    });
    const saveCount = await app.bridgeMessageCount(page, 'save-file');
    const saveReq = await app.waitNewBridgeMessage(page, 'save-file', saveCount,
      { timeout: 8000, label: 'save-file request' });
    ctx.check('真实桥请求：type=save-file、requestId=savefile-*、suggestedName/filter/base64 正确',
      !!saveReq && saveReq.type === 'save-file' && /^savefile-/.test(String(saveReq.requestId || ''))
      && saveReq.suggestedName === 'bridge-payload.figureplay.json'
      && saveReq.filterExtensions.join(',') === '.json'
      && saveReq.base64 === saveBase64,
      { type: saveReq && saveReq.type, requestId: saveReq && saveReq.requestId,
        suggestedName: saveReq && saveReq.suggestedName, base64Length: saveReq && String(saveReq.base64 || '').length });

    await page.waitForTimeout(200);
    let pendingState = await app.getNativeBridgeResult(page, 'save-ok');
    ctx.check('回包前 Promise 仍 pending（不超时、不提前 resolve）',
      !!pendingState && pendingState.state === 'pending', pendingState);
    await app.sendBridgeMessage(page, {
      type: 'file-saved', requestId: String(saveReq.requestId) + '-wrong',
      ok: true, path: 'C:\\WRONG\\path.json', bytes: 1,
    });
    await page.waitForTimeout(250);
    pendingState = await app.getNativeBridgeResult(page, 'save-ok');
    ctx.check('错误 requestId 的回包被忽略（Promise 仍 pending）',
      !!pendingState && pendingState.state === 'pending', pendingState);

    const expectedPath = 'C:\\Users\\E2E\\Documents\\bridge-payload.figureplay.json';
    await app.sendBridgeMessage(page, {
      type: 'file-saved', requestId: saveReq.requestId,
      ok: true, path: expectedPath, bytes: 27, canceled: false,
    });
    const saved = await app.waitNativeBridgeResult(page, 'save-ok');
    ctx.check('正确 file-saved 回包：Promise 立即 resolve（<3s），path/ok/canceled 字段正确',
      !!saved && saved.state === 'resolved' && saved.elapsed < 3000
      && saved.result && saved.result.ok === true && saved.result.canceled === false
      && saved.result.path === expectedPath,
      saved);

    // 2) 取消回包
    await app.startNativeBridgeCall(page, 'save-cancel', {
      suggestedName: 'bridge-cancel.json', filterExtensions: ['.json'], base64: base64('{}'),
    });
    const cancelCount = await app.bridgeMessageCount(page, 'save-file');
    const cancelReq = await app.waitNewBridgeMessage(page, 'save-file', cancelCount,
      { timeout: 8000, label: 'cancel save-file request' });
    await app.sendBridgeMessage(page, {
      type: 'file-saved', requestId: cancelReq.requestId,
      ok: true, canceled: true, path: '',
    });
    const canceled = await app.waitNativeBridgeResult(page, 'save-cancel');
    ctx.check('canceled=true 回包：Promise resolve canceled=true、无错误',
      !!canceled && canceled.state === 'resolved' && canceled.result
      && canceled.result.canceled === true && canceled.result.ok === true,
      canceled);

    // 3) 工程保存 UI 全链路走真实桥回包
    const projectCount = await app.bridgeMessageCount(page, 'save-file');
    await page.locator('#btn-project-save').click();
    const projectReq = await app.waitNewBridgeMessage(page, 'save-file', projectCount + 1,
      { timeout: 10000, label: 'project save bridge request' });
    const projectPath = 'C:\\Users\\E2E\\Documents\\bridge-project.figureplay-project';
    await app.sendBridgeMessage(page, {
      type: 'file-saved', requestId: projectReq.requestId,
      ok: true, path: projectPath, bytes: 40000, canceled: false,
    });
    await page.waitForFunction((expected) => {
      const node = document.getElementById('project-file-status');
      return !!node && (node.textContent || '').indexOf(expected) >= 0;
    }, projectPath, { timeout: 8000 });
    const projectStatus = (await app.getProjectFileUiState(page)).status || '';
    ctx.check('工程保存 UI：真实桥 file-saved 回包后状态立即显示原生 path（不超时）',
      projectReq.filterExtensions.join(',') === '.figureplay-project'
      && projectStatus.indexOf('已保存工程') >= 0 && projectStatus.indexOf(projectPath) >= 0,
      { request: projectReq && { filter: projectReq.filterExtensions }, status: projectStatus });

    // 4) 真实更新全链路：updates.js init 静默 check → __UPDATES__.check() → download()
    const autoReq = await app.waitNewBridgeMessage(page, 'check-update', 1,
      { timeout: 8000, label: 'updates init auto check-update' });
    await app.sendBridgeMessage(page, {
      type: 'update-info', requestId: autoReq.requestId, ok: true,
      configured: false, hasUpdate: false, currentVersion: '1.5.1',
    });
    await app.waitFor(page, () => {
      const node = document.getElementById('update-status');
      return !!node && /尚未配置更新源/.test(node.textContent || '');
    }, null, { timeout: 8000, label: 'updates init configured=false' });
    let updateUi = await app.getUpdateUiState(page);
    ctx.check('updates.js 桌面初始化：检查更新按钮启用，静默 check-update 回包后显示未配置',
      updateUi.checkDisabled === false
      && /^updcheck-/.test(String(autoReq.requestId || ''))
      && /尚未配置更新源/.test(updateUi.status || ''),
      { requestId: autoReq.requestId, ui: updateUi });

    // 打开帮助弹窗（更新 UI 在其中），再手动检查更新
    await app.openHelpDialog(page);

    // 手动 __UPDATES__.check()
    await page.evaluate(() => {
      window.__e2eUpdatesCheck = { state: 'pending', started: performance.now() };
      window.__UPDATES__.check(false).then((res) => {
        window.__e2eUpdatesCheck = { state: 'resolved', res, elapsed: performance.now() - window.__e2eUpdatesCheck.started };
      }).catch((err) => {
        window.__e2eUpdatesCheck = { state: 'rejected', error: String(err && err.message ? err.message : err) };
      });
    });
    const checkReq = await app.waitNewBridgeMessage(page, 'check-update', 2,
      { timeout: 8000, label: 'manual check-update' });
    await app.sendBridgeMessage(page, {
      type: 'update-info', requestId: checkReq.requestId, ok: true,
      configured: true, hasUpdate: true, latestVersion: '1.5.2', currentVersion: '1.5.1',
      notes: '真实桥更新说明',
    });
    await app.waitFor(page, () => {
      const entry = window.__e2eUpdatesCheck;
      return !!entry && entry.state === 'resolved';
    }, null, { timeout: 8000, label: 'manual check resolved' });
    const checkEntry = await page.evaluate(() => window.__e2eUpdatesCheck);
    await app.waitFor(page, () => {
      const node = document.getElementById('update-status');
      return !!node && /发现新版本\s*1\.5\.2/.test(node.textContent || '');
    }, null, { timeout: 8000, label: 'update found UI' });
    updateUi = await app.getUpdateUiState(page);
    ctx.check('__UPDATES__.check() 全链路：check-update→update-info 立即 resolve，requestId 匹配，返回版本/说明',
      !!checkEntry && checkEntry.state === 'resolved' && checkEntry.elapsed < 3000
      && checkEntry.res && checkEntry.res.requestId === checkReq.requestId
      && checkEntry.res.latestVersion === '1.5.2' && checkEntry.res.currentVersion === '1.5.1'
      && checkEntry.res.notes === '真实桥更新说明',
      { requestId: checkReq.requestId, entry: checkEntry });
    ctx.check('更新 UI 显示发现新版本 1.5.2（当前 1.5.1）+ 更新说明，下载按钮可见',
      updateUi.helpOpen === true
      && /发现新版本\s*1\.5\.2/.test(updateUi.status || '')
      && /真实桥更新说明/.test(updateUi.status || '')
      && updateUi.downloadVisible === true,
      { status: updateUi.status, downloadVisible: updateUi.downloadVisible, helpOpen: updateUi.helpOpen });

    // 点击“下载并更新” → 真实 downloadUpdate → download-update → update-downloaded
    const downloadPath = 'C:\\Users\\E2E\\Downloads\\FigurePlay-1.5.2.exe';
    const downloadMessage = '更新已下载（真实桥）：' + downloadPath;
    const downloadBaseline = await app.bridgeMessageCount(page, 'download-update');
    page.once('dialog', async (dialog) => { await dialog.accept(); });
    await page.locator('#btn-download-update').click();
    const dlReq = await app.waitNewBridgeMessage(page, 'download-update', downloadBaseline + 1,
      { timeout: 8000, label: 'download-update request' });
    await app.sendBridgeMessage(page, {
      type: 'update-downloaded', requestId: dlReq.requestId, ok: true,
      latestVersion: '1.5.2', message: downloadMessage, path: downloadPath,
    });
    await app.waitFor(page, () => {
      const status = document.getElementById('update-status');
      const toast = document.getElementById('toast');
      return (!!status && /更新已下载/.test(status.textContent || ''))
        || (!!toast && /更新已下载/.test(toast.textContent || ''));
    }, null, { timeout: 8000, label: 'update downloaded UI' });
    updateUi = await app.getUpdateUiState(page);
    ctx.check('__UPDATES__.download() 全链路：download-update requestId=updload-*，回包后状态含下载完成+路径',
      /^updload-/.test(String(dlReq.requestId || ''))
      && /更新已下载/.test(updateUi.status || '')
      && (updateUi.status || '').indexOf(downloadPath) >= 0
      && updateUi.downloadDisabled === false,
      { requestId: dlReq.requestId, status: updateUi.status });
    ctx.check('更新全链路未 stub：checkUpdate/downloadUpdate 均为原生实现',
      flags.checkUpdateType === 'function' && flags.downloadUpdateType === 'function'
      && flags.saveFileMockFlag === false && flags.saveFileMockGlobal === false,
      flags);
    ctx.check('真实桥全程未出现超时/未 stub（save/check/download 关键 Promise 均 <3s）',
      [saved, canceled, checkEntry].every((item) => item && item.elapsed < 3000),
      { elapsed: [saved.elapsed, canceled.elapsed, checkEntry.elapsed] });

    ctx.evidence.realBridge = {
      nativeSaveFile: flags.saveFileType, stubbed: flags.saveFileMockFlag || flags.saveFileMockGlobal,
      requestId: saveReq.requestId, resolvedPath: saved.result.path,
      elapsedMs: Math.round(saved.elapsed),
      wrongIdIgnored: true,
      canceled: canceled.result.canceled,
      projectSave: { filter: projectReq.filterExtensions, status: projectStatus },
      updateCheck: {
        requestId: checkReq.requestId, elapsedMs: Math.round(checkEntry.elapsed),
        latestVersion: checkEntry.res.latestVersion, currentVersion: checkEntry.res.currentVersion,
        notes: checkEntry.res.notes, status: updateUi.status,
      },
      updateDownload: { requestId: dlReq.requestId, message: downloadMessage, path: downloadPath, status: updateUi.status },
      fullChain: true,
    };    await ctx.screenshot('real-bridge-protocol');
  },
};

export const scenariosV151 = [
  pageAutoNumberScenario,
  nativeSaveScenario,
  diagnosticsScenario,
  realBridgeProtocolScenario,
];
