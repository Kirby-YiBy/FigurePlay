#!/usr/bin/env node
/**
 * FigurePlay E2E Smoke：验证无头 Chrome + file:// 测试环境的四个关键假设
 *
 *   1) playwright-core 用本机 Chrome 能 headless 启动并截图（data: 页面）
 *   2) file:// 页面中 Playwright setInputFiles 注入的文件可被 FileReader 读取、
 *      图片可解码出正确尺寸、canvas 可读像素
 *   3) acceptDownloads 下载可保存到磁盘，并用 Python/Pillow 校验（PNG 640x360）
 *   4) file:// 下 IndexedDB / localStorage / fetch / 相对路径图片的实际行为
 *
 * 用法：
 *   node E:\FigurePlay\_dev\smoke\run-smoke.mjs                # 默认：不加任何放宽参数
 *   node E:\FigurePlay\_dev\smoke\run-smoke.mjs --allow-file-access  # 附加 --allow-file-access-from-files 复核
 *   node E:\FigurePlay\_dev\smoke\run-smoke.mjs --headed       # 有头调试
 *
 * 产物：_dev/artifacts/smoke-report.json、artifacts/screenshots/*.png、artifacts/downloads/*
 * 退出码：0=关键假设全部通过；1=有关键假设失败；2=脚本异常
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  APP_ROOT,
  ARTIFACTS_DIR,
  CHROME_EXECUTABLE,
  DEV_DIR,
  DOWNLOADS_DIR,
  FILE_URL_ACCESS_ARGS,
  SAMPLE_FILES,
  SCREENSHOTS_DIR,
  SMOKE_DIR,
  capturePageDiagnostics,
  diagnosticsSummary,
  ensureDir,
  fileUrl,
  launchBrowser,
  newPage,
  resolveChromeExecutable,
  samplePath,
  saveDownload,
  screenshot,
  setInputFiles,
  waitForDownload,
} from '../lib/browser.mjs';

const PYTHON =
  process.env.PYTHON_EXECUTABLE ||
  'C:\\Users\\DragonDance\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe';
const VERIFY_SCRIPT = path.join(DEV_DIR, 'tools', 'verify-artifacts.py');
const GENERATE_SCRIPT = path.join(DEV_DIR, 'tools', 'gen-samples.py');
const MANIFEST_PATH = path.join(DEV_DIR, 'samples', 'manifest.json');
const SMOKE_PAGE = path.join(SMOKE_DIR, 'upload-test.html');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'smoke-report.json');

const argv = process.argv.slice(2);
const allowFileAccess = argv.includes('--allow-file-access');
const headed = argv.includes('--headed');

const log = (...args) => console.log(...args);
const section = (title) => log(`\n=== ${title} ===`);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function statSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function ensureSamples() {
  const missing = SAMPLE_FILES.filter((name) => !fs.existsSync(samplePath(name)));
  if (missing.length === 0) return [];
  log(`samples 缺失 ${missing.length} 个，自动生成：${GENERATE_SCRIPT}`);
  const result = spawnSync(PYTHON, [GENERATE_SCRIPT], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(
      `生成示例素材失败 (exit=${result.status}): ${result.stderr || result.stdout || 'no output'}`
    );
  }
  log(result.stdout.trim());
  const stillMissing = SAMPLE_FILES.filter((name) => !fs.existsSync(samplePath(name)));
  if (stillMissing.length > 0) throw new Error(`示例素材仍缺失: ${stillMissing.join(', ')}`);
  return missing;
}

/** 调用 Python/PIL 校验产物，返回结果（失败不抛异常，记录到 report） */
function pilVerify(paths) {
  const existing = paths.filter((p) => fs.existsSync(p));
  const result = { python: PYTHON, script: VERIFY_SCRIPT, exitCode: null, files: [], raw: null };
  if (existing.length === 0) {
    result.error = '没有可校验的文件';
    return result;
  }
  const proc = spawnSync(PYTHON, [VERIFY_SCRIPT, '--json', ...existing], { encoding: 'utf8' });
  result.exitCode = proc.status;
  result.stderr = (proc.stderr || '').trim();
  try {
    result.raw = JSON.parse(proc.stdout);
    result.files = result.raw.files || [];
  } catch (err) {
    result.parseError = String(err);
    result.stdout = (proc.stdout || '').slice(0, 2000);
  }
  if (proc.error) result.error = String(proc.error);
  return result;
}

async function main() {
  const startedAt = Date.now();
  const timings = {};
  const mark = (name, since) => {
    timings[name] = Date.now() - since;
  };

  await ensureDir(ARTIFACTS_DIR);
  await ensureDir(SCREENSHOTS_DIR);
  await ensureDir(DOWNLOADS_DIR);

  ensureSamples();

  const manifest = readJson(MANIFEST_PATH);
  const report = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    playwrightCore: (() => {
      try {
        return readJson(path.join(DEV_DIR, 'node_modules', 'playwright-core', 'package.json')).version;
      } catch {
        return 'unknown';
      }
    })(),
    appRoot: APP_ROOT,
    devRoot: DEV_DIR,
    smokePage: SMOKE_PAGE,
    launchArgs: allowFileAccess ? FILE_URL_ACCESS_ARGS : [],
    headed,
    samples: SAMPLE_FILES.map((name) => ({
      name,
      path: samplePath(name),
      bytes: statSize(samplePath(name)),
      manifest: manifest[name] || null,
    })),
    screenshots: [],
  };

  const critical = {};
  const screenshots = [];
  let browser;
  let session;
  try {
    // ---------- 1) headless 启动 + data: 页面截图 ----------
    section('1) headless 启动 + data: 页面截图');
    const chromeExecutable = resolveChromeExecutable();
    browser = await launchBrowser({
      headless: !headed,
      args: allowFileAccess ? FILE_URL_ACCESS_ARGS : [],
    });
    report.chrome = {
      executablePath: chromeExecutable,
      version: browser.version(),
      headless: !headed,
      args: allowFileAccess ? FILE_URL_ACCESS_ARGS : [],
    };
    log(`Chrome ${browser.version()} headless=${!headed} executable=${chromeExecutable}`);
    report.browserVersion = browser.version();

    session = await newPage(browser);
    const { page, diagnostics } = session;
    let markStart = Date.now();
    const dataHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;height:100%;font-family:Arial,sans-serif}
      body{display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#2f6fd0,#7b4bc4)}
      .card{background:#fff;border-radius:18px;padding:48px 64px;box-shadow:0 24px 60px rgba(0,0,0,.35);text-align:center}
      h1{margin:0 0 12px;font-size:42px;color:#1f2937}
      p{margin:0;font-size:20px;color:#475569}
    </style></head><body><div class="card"><h1>FigurePlay smoke</h1>
    <p>headless Chrome + data: URL screenshot OK</p>
    <p>${new Date().toISOString()}</p></div></body></html>`;
    await page.goto('data:text/html;charset=utf-8,' + encodeURIComponent(dataHtml), {
      waitUntil: 'load',
    });
    const dataShot = await screenshot(page, 'smoke-data-page');
    screenshots.push(dataShot);
    report.dataPage = { url: page.url(), title: await page.title(), screenshot: dataShot };
    report.dataPage.screenshotBytes = statSize(dataShot);
    critical.headlessLaunchAndScreenshot = statSize(dataShot) > 0;
    log(`[${critical.headlessLaunchAndScreenshot ? 'PASS' : 'FAIL'}] data: 页面截图 ${dataShot} (${statSize(dataShot)} bytes)`);
    mark('headlessAndScreenshotMs', markStart);

    // ---------- 2) 打开 file:// smoke 页面 ----------
    section('2) 打开 file:// smoke 页面');
    markStart = Date.now();
    await page.goto(fileUrl(SMOKE_PAGE), { waitUntil: 'load' });
    await page.waitForSelector('#file-input');
    report.smokePageState = {
      url: page.url(),
      title: await page.title(),
      protocol: await page.evaluate(() => location.protocol),
      origin: await page.evaluate(() => location.origin),
      isSecureContext: await page.evaluate(() => window.isSecureContext),
      ready: await page.evaluate(() => !!(window.smoke && window.smoke.processInputFiles)),
    };
    report.env = await page.evaluate(() => window.smoke.envInfo());
    const harnessShot = await screenshot(page, 'smoke-harness');
    screenshots.push(harnessShot);
    log(`url=${report.smokePageState.url}`);
    log(`chrome=${report.env.chromeVersion} secureContext=${report.env.isSecureContext} origin=${report.env.origin}`);
    mark('openSmokePageMs', markStart);

    // ---------- 3) setInputFiles -> FileReader -> 图片解码 ----------
    section('3) setInputFiles -> FileReader -> 图片解码');
    markStart = Date.now();
    const filePaths = SAMPLE_FILES.map(samplePath);
    await setInputFiles(page, '#file-input', filePaths);
    const inputInfo = await page.evaluate(() => ({
      count: document.querySelector('#file-input').files.length,
      names: Array.from(document.querySelector('#file-input').files).map((f) => f.name),
    }));
    report.inputFilesAfterSet = inputInfo;
    log(`setInputFiles: ${inputInfo.count} 个 -> ${inputInfo.names.join(', ')}`);

    const processed = await page.evaluate(async () => window.smoke.processInputFiles());
    report.setInputFilesResults = processed;

    const dimensionChecks = processed.files.map((file) => {
      const expected = manifest[file.name];
      const widthOk = !!expected && file.naturalWidth === expected.width;
      const heightOk = !!expected && file.naturalHeight === expected.height;
      return {
        name: file.name,
        decoded: file.decoded === true,
        expected: expected ? `${expected.width}x${expected.height}` : null,
        actual: file.decoded ? `${file.naturalWidth}x${file.naturalHeight}` : null,
        dimsMatch: !!(widthOk && heightOk),
        canvasReadable: file.canvasReadable === true,
        dataUrlLength: file.dataUrlLength || 0,
        size: file.size,
        type: file.type,
      };
    });
    report.dimensionChecks = dimensionChecks;
    const allDecoded = processed.count === SAMPLE_FILES.length && processed.files.every((f) => f.decoded);
    const allDimsMatch = dimensionChecks.every((c) => c.dimsMatch);
    const allCanvasReadable = dimensionChecks.every((c) => c.canvasReadable);
    critical.setInputFilesFileReader = allDecoded;
    critical.imageDimensionsMatchManifest = allDimsMatch;
    critical.canvasReadableFromDataUrl = allCanvasReadable;
    log(`[${allDecoded ? 'PASS' : 'FAIL'}] FileReader + 图片解码 ${processed.files.filter((f) => f.decoded).length}/${processed.count}`);
    for (const check of dimensionChecks) {
      log(
        `  ${check.decoded && check.dimsMatch ? 'OK  ' : 'FAIL'} ${check.name.padEnd(18)} ` +
          `expect=${check.expected} actual=${check.actual} canvasReadable=${check.canvasReadable} type=${check.type}`
      );
    }
    const fileReaderShot = await screenshot(page, 'smoke-file-reader');
    screenshots.push(fileReaderShot);
    report.env2 = await page.evaluate(() => window.smoke.envInfo());
    mark('setInputFilesAndDecodeMs', markStart);

    // ---------- 4) 下载保存 ----------
    section('4) 下载（acceptDownloads）保存 + PIL 校验');
    markStart = Date.now();
    const pngDownload = await waitForDownload(page, () =>
      page.evaluate(() => window.smoke.downloadPng('figureplay-smoke.png', 'download smoke 640x360'))
    );
    const pngSaved = await saveDownload(pngDownload, 'smoke-download.png');
    const txtContent = `FigurePlay E2E 下载测试\ntimestamp=${new Date().toISOString()}\n中文内容校验\n`;
    const txtDownload = await waitForDownload(page, () =>
      page.evaluate((content) => window.smoke.downloadText('figureplay-smoke.txt', content), txtContent)
    );
    const txtSaved = await saveDownload(txtDownload, 'smoke-download.txt');
    const txtActual = fs.readFileSync(txtSaved.path, 'utf8');
    report.downloads = {
      png: { ...pngSaved, exists: fs.existsSync(pngSaved.path) },
      txt: {
        ...txtSaved,
        exists: fs.existsSync(txtSaved.path),
        contentMatches: txtActual === txtContent,
        preview: txtActual.slice(0, 120),
      },
    };
    critical.downloadPngSaved = pngSaved.size > 0 && fs.existsSync(pngSaved.path);
    critical.downloadTextSaved = txtSaved.size > 0 && txtActual === txtContent;
    log(`[${critical.downloadPngSaved ? 'PASS' : 'FAIL'}] PNG 下载: ${pngSaved.path} (${pngSaved.size} bytes, suggested=${pngSaved.suggestedFilename})`);
    log(`[${critical.downloadTextSaved ? 'PASS' : 'FAIL'}] 文本下载: ${txtSaved.path} (${txtSaved.size} bytes, contentMatches=${report.downloads.txt.contentMatches})`);
    const downloadShot = await screenshot(page, 'smoke-downloads');
    screenshots.push(downloadShot);

    const pil = pilVerify([pngSaved.path, txtSaved.path, ...screenshots]);
    report.pilVerify = pil;
    const pilPng = (pil.files || []).find((f) => f.path && f.path.endsWith('smoke-download.png'));
    const pilPngOk = !!(
      pilPng &&
      pilPng.ok &&
      pilPng.image &&
      pilPng.image.format === 'PNG' &&
      pilPng.image.width === 640 &&
      pilPng.image.height === 360
    );
    const pilScreenshotsOk = screenshots.every((shot) => {
      const entry = (pil.files || []).find((f) => f.path === path.resolve(shot));
      return !!entry && entry.ok;
    });
    critical.downloadPilVerify = pilPngOk;
    critical.screenshotsPilVerify = pilScreenshotsOk;
    log(`[${pilPngOk ? 'PASS' : 'FAIL'}] PIL 校验下载 PNG: ${pilPng && pilPng.image ? `${pilPng.image.format} ${pilPng.image.width}x${pilPng.image.height}` : 'n/a'} (exit=${pil.exitCode})`);
    log(`[${pilScreenshotsOk ? 'PASS' : 'FAIL'}] PIL 校验 ${screenshots.length} 张截图`);
    mark('downloadAndVerifyMs', markStart);

    // ---------- 5) 存储/网络能力 ----------
    section('5) file:// 下的 IndexedDB / localStorage / 相对图片');
    markStart = Date.now();
    const idb = await page.evaluate(() => window.smoke.testIndexedDB());
    const localStorageResult = await page.evaluate(() => window.smoke.testLocalStorage());
    const localImage = await page.evaluate(() => window.smoke.testLocalImage());
    report.indexedDB = idb;
    report.localStorage = localStorageResult;
    report.localImage = localImage;
    const idbOk = !!(idb && idb.openOk && idb.putOk && idb.getOk);
    log(`[${idbOk ? 'PASS' : 'INFO'}] IndexedDB: open=${!!idb.openOk} put=${!!idb.putOk} get=${!!idb.getOk} ${idb.error ? 'error=' + idb.error : ''}`);
    log(`[${localStorageResult.available ? 'PASS' : 'INFO'}] localStorage: ${JSON.stringify(localStorageResult)}`);
    log(`[INFO] 相对路径图片: decoded=${localImage.decoded} ${localImage.naturalWidth || '?'}x${localImage.naturalHeight || '?'} canvasReadable=${localImage.canvasReadable}${localImage.canvasError ? ' canvasError=' + localImage.canvasError : ''}`);
    const capabilitiesShot = await screenshot(page, 'smoke-capabilities');
    screenshots.push(capabilitiesShot);
    report.env3 = await page.evaluate(() => window.smoke.envInfo());

    // fetch(file://) 在独立的页面里测，避免预期的 CORS 报错污染主页面 console 断言
    const fetchPage = await session.context.newPage();
    const fetchDiagnostics = capturePageDiagnostics(fetchPage);
    await fetchPage.goto(fileUrl(SMOKE_PAGE), { waitUntil: 'load' });
    const fetchResult = await fetchPage.evaluate(() => window.smoke.testFetch('../samples/manifest.json'));
    await fetchPage.close();
    report.fetchFileUrl = fetchResult;
    report.fetchPageDiagnostics = diagnosticsSummary(fetchDiagnostics);
    log(`[INFO] fetch(file://): ok=${fetchResult.ok} ${fetchResult.error ? 'error=' + fetchResult.error : 'status=' + fetchResult.status}`);
    mark('capabilitiesMs', markStart);

    // ---------- 6) 诊断汇总 ----------
    section('6) 诊断汇总');
    report.mainPageDiagnostics = diagnosticsSummary(diagnostics);
    report.consoleErrors = report.mainPageDiagnostics.consoleProblems.filter((m) => m.type === 'error');
    report.pageErrors = report.mainPageDiagnostics.pageErrors;
    critical.noPageErrors = report.pageErrors.length === 0;
    critical.noConsoleErrors = report.consoleErrors.length === 0;
    log(`[${critical.noPageErrors ? 'PASS' : 'FAIL'}] pageerrors: ${report.pageErrors.length}`);
    log(`[${critical.noConsoleErrors ? 'PASS' : 'FAIL'}] console errors: ${report.consoleErrors.length}`);
    if (report.pageErrors.length) for (const err of report.pageErrors) log(`  PAGEERROR: ${err}`);
    if (report.consoleErrors.length) for (const msg of report.consoleErrors) log(`  CONSOLE: ${msg.text}`);
  } finally {
    if (session) {
      try {
        await session.close();
      } catch {
        /* ignore */
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
  }

  // ---------- 结论 ----------
  const conclusions = {
    headlessLaunchAndScreenshot: critical.headlessLaunchAndScreenshot === true,
    setInputFilesFileReader: critical.setInputFilesFileReader === true,
    imageDimensionsMatchManifest: critical.imageDimensionsMatchManifest === true,
    canvasReadableFromDataUrl: critical.canvasReadableFromDataUrl === true,
    downloadPngSaved: critical.downloadPngSaved === true,
    downloadTextSaved: critical.downloadTextSaved === true,
    downloadPilVerify: critical.downloadPilVerify === true,
    screenshotsPilVerify: critical.screenshotsPilVerify === true,
    noPageErrors: critical.noPageErrors === true,
    noConsoleErrors: critical.noConsoleErrors === true,
    indexedDBOnFileProtocol: report.indexedDB && report.indexedDB.openOk && report.indexedDB.putOk && report.indexedDB.getOk
      ? 'available'
      : 'unavailable',
    localStorageOnFileProtocol: report.localStorage && report.localStorage.available ? 'available' : 'unavailable',
    fetchFileUrl: report.fetchFileUrl && report.fetchFileUrl.ok ? 'allowed' : 'blocked-by-cors',
    relativeFileUrlImageDecode: report.localImage && report.localImage.decoded ? 'available' : 'unavailable',
    canvasFromRelativeFileUrlImage: report.localImage && report.localImage.canvasReadable ? 'readable' : 'tainted',
  };
  report.conclusions = conclusions;
  report.criticalFailures = Object.entries(critical)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  report.pass = report.criticalFailures.length === 0;
  report.durationMs = Date.now() - startedAt;
  report.timings = timings;
  report.command =
    `node ${path.join(DEV_DIR, 'smoke', 'run-smoke.mjs')}${allowFileAccess ? ' --allow-file-access' : ''}${headed ? ' --headed' : ''}`;
  await fsp.writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

  section('结论');
  for (const [name, value] of Object.entries(conclusions)) {
    const kind = typeof value === 'boolean' ? (value ? 'PASS' : 'FAIL') : 'INFO';
    log(`[${kind}] ${name}: ${value}`);
  }
  log(`\nSMOKE ${report.pass ? 'PASS' : 'FAIL'}  (${report.durationMs} ms)`);
  log(`报告: ${REPORT_PATH}`);
  log(`截图: ${screenshots.join(', ')}`);
  if (report.criticalFailures.length) log(`关键失败项: ${report.criticalFailures.join(', ')}`);

  process.exitCode = report.pass ? 0 : 1;
  return report;
}

main().catch((err) => {
  console.error('\nSMOKE ERROR:', err && err.stack ? err.stack : err);
  process.exitCode = 2;
});
