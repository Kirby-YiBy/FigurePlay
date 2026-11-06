/**
 * FigurePlay 无头浏览器测试 helper（仅限 _dev 使用，不属于应用产物）
 *
 * 约定：
 * - 一律使用绝对路径；所有浏览器下载/截图落到 _dev/artifacts 下。
 * - Chrome 使用本机安装的 Chrome（playwright-core 不带浏览器），路径可用环境变量覆盖：
 *     CHROME_EXECUTABLE=C:\path\to\chrome.exe
 * - 默认 headless、acceptDownloads: true、file:// 页面直接打开，不使用任何放宽安全性的启动参数。
 *   如确需 file:// 跨目录读取，可显式传入 args: FILE_URL_ACCESS_ARGS。
 */
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

/** _dev 目录（本文件上一级） */
export const DEV_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** 应用根目录 E:\FigurePlay */
export const APP_ROOT = path.resolve(DEV_DIR, '..');
export const APP_INDEX = path.join(APP_ROOT, 'index.html');
export const SAMPLES_DIR = path.join(DEV_DIR, 'samples');
export const ARTIFACTS_DIR = path.join(DEV_DIR, 'artifacts');
export const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, 'screenshots');
export const DOWNLOADS_DIR = path.join(ARTIFACTS_DIR, 'downloads');
export const SMOKE_DIR = path.join(DEV_DIR, 'smoke');

export const CHROME_EXECUTABLE =
  process.env.CHROME_EXECUTABLE || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

/**
 * 放宽 file:// 读取权限的启动参数。
 * 默认不启用；仅在默认配置下 file:// 行为被拦截、且确实需要时显式传入。
 */
export const FILE_URL_ACCESS_ARGS = ['--allow-file-access-from-files'];

/** 根据文件名取 _dev/samples 下的绝对路径 */
export function samplePath(name) {
  return path.join(SAMPLES_DIR, name);
}

export function appUrl() {
  return pathToFileURL(APP_INDEX).href;
}

export function fileUrl(p) {
  return pathToFileURL(path.resolve(p)).href;
}

export function ensureDirSync(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

/** 校验 Chrome 存在，返回路径；不存在则抛出可读错误 */
export function resolveChromeExecutable(executablePath = CHROME_EXECUTABLE) {
  if (!executablePath || !fs.existsSync(executablePath)) {
    throw new Error(
      `找不到 Chrome 可执行文件: ${executablePath}\n` +
        `请设置环境变量 CHROME_EXECUTABLE 指向 chrome.exe`
    );
  }
  return executablePath;
}

/**
 * 启动 headless Chrome。
 * @param {object} [options]
 * @param {boolean} [options.headless=true]
 * @param {string[]} [options.args=[]] 额外启动参数，例如 FILE_URL_ACCESS_ARGS
 * @param {string} [options.executablePath] 默认本机 Chrome
 * @returns {Promise<import('playwright-core').Browser>}
 */
export async function launchBrowser(options = {}) {
  const {
    executablePath = resolveChromeExecutable(),
    headless = true,
    args = [],
    timeout = 30000,
    ...rest
  } = options;
  const browser = await chromium.launch({
    executablePath,
    headless,
    timeout,
    args: ['--hide-scrollbars', '--mute-audio', '--no-first-run', ...args],
    ...rest,
  });
  return browser;
}

/**
 * 新建带下载能力的 context + page，并挂上诊断收集。
 * @param {import('playwright-core').Browser} browser
 * @param {object} [contextOptions] 覆盖默认 context 配置（viewport/locale/acceptDownloads 等）
 */
export async function newPage(browser, contextOptions = {}) {
  const defaults = {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
    locale: 'zh-CN',
    colorScheme: 'light',
  };
  const context = await browser.newContext({ ...defaults, ...contextOptions });
  const page = await context.newPage();
  const diagnostics = capturePageDiagnostics(page);
  return {
    context,
    page,
    diagnostics,
    close: () => context.close(),
  };
}

/**
 * 收集页面 console/pageerror/requestfailed，便于断言"无报错"。
 * 返回值是实时填充的数组，测试结束时可直接检查。
 */
export function capturePageDiagnostics(page) {
  const diagnostics = { console: [], pageErrors: [], failedRequests: [] };
  page.on('console', (msg) => {
    diagnostics.console.push({ type: msg.type(), text: msg.text(), location: msg.location() });
  });
  page.on('pageerror', (error) => {
    diagnostics.pageErrors.push(String(error && error.stack ? error.stack : error));
  });
  page.on('requestfailed', (request) => {
    diagnostics.failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure() ? request.failure().errorText : null,
    });
  });
  return diagnostics;
}

/** 只保留 error/warning 级别的 console，便于断言 */
export function consoleProblems(diagnostics) {
  return diagnostics.console.filter((m) => m.type === 'error' || m.type === 'warning');
}

/** 检查应用是否已由 Lead 交付；未就绪时给出清晰错误而不是神秘失败 */
export function assertAppReady() {
  if (!fs.existsSync(APP_INDEX)) {
    throw new Error(
      `应用尚未就绪：${APP_INDEX} 不存在。\n` +
        `请先让 Lead 交付 index.html，再运行 E2E 场景测试。`
    );
  }
  return APP_INDEX;
}

/**
 * 打开应用页面（file://）。
 * @param {import('playwright-core').Page} page
 * @param {object} [options]
 * @param {string} [options.waitForSelector='body']
 * @param {boolean} [options.waitUntilNetworkIdle=false]
 */
export async function openApp(page, options = {}) {
  const { waitForSelector = 'body', waitUntil = 'load', timeout = 30000 } = options;
  assertAppReady();
  const response = await page.goto(appUrl(), { waitUntil, timeout });
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { timeout });
  }
  return { response, url: page.url() };
}

/** 打开任意本地 HTML（file://），用于 smoke 页面 */
export async function openLocalFile(page, filePath, options = {}) {
  const { waitForSelector = null, waitUntil = 'load', timeout = 30000 } = options;
  const response = await page.goto(fileUrl(filePath), { waitUntil, timeout });
  if (waitForSelector) await page.waitForSelector(waitForSelector, { timeout });
  return { response, url: page.url() };
}

/**
 * 截图并保存到 _dev/artifacts/screenshots/<name>.png
 * @param {import('playwright-core').Page} page
 * @param {string} name 文件名或带 .png 的名字
 * @param {object} [options] playwright screenshot 参数（fullPage 等）
 * @returns {Promise<string>} 绝对路径
 */
export async function screenshot(page, name, options = {}) {
  const filename = name.endsWith('.png') ? name : `${name}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, filename);
  await ensureDir(path.dirname(filePath));
  await page.screenshot({ path: filePath, ...options });
  return filePath;
}

/**
 * 等待下载事件。
 * @param {import('playwright-core').Page} page
 * @param {Function|Promise} trigger 触发下载的动作
 * @param {{timeout?:number}} [options]
 * @returns {Promise<import('playwright-core').Download>}
 */
export async function waitForDownload(page, trigger, options = {}) {
  const { timeout = 30000 } = options;
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout }),
    typeof trigger === 'function' ? trigger() : Promise.resolve(trigger),
  ]);
  return download;
}

/**
 * 保存下载到 _dev/artifacts/downloads/<filename> 并返回文件信息。
 * @param {import('playwright-core').Download} download
 * @param {string} [filename] 默认使用浏览器建议的文件名
 * @param {{dir?:string}} [options]
 */
export async function saveDownload(download, filename, options = {}) {
  const dir = options.dir || DOWNLOADS_DIR;
  await ensureDir(dir);
  const suggested = download.suggestedFilename() || 'download.bin';
  const target = path.join(dir, filename || suggested);
  await download.saveAs(target);
  const stat = await fsp.stat(target);
  let failure = null;
  try {
    failure = await download.failure();
  } catch {
    failure = null;
  }
  return {
    path: target,
    filename: path.basename(target),
    size: stat.size,
    suggestedFilename: suggested,
    url: download.url(),
    failure,
  };
}

/** 等待下载 + 保存，一步到位 */
export async function downloadToFile(page, trigger, filename, options = {}) {
  const download = await waitForDownload(page, trigger, options);
  return saveDownload(download, filename, options);
}

/**
 * 给 <input type=file> 注入文件（Playwright setInputFiles，走 CDP）。
 * @param {import('playwright-core').Page} page
 * @param {string} selector
 * @param {string|string[]} files 绝对路径或 {name,mimeType,buffer}
 */
export async function setInputFiles(page, selector, files) {
  await page.locator(selector).setInputFiles(files);
}

/** 读取页面上图片元素的 naturalWidth/naturalHeight（通过 selector） */
export async function imageElementSize(page, selector) {
  return page.$eval(selector, (img) => ({
    complete: img.complete,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    srcPrefix: String(img.currentSrc || img.src).slice(0, 64),
  }));
}

/** 页面渲染稳定后截图：等待字体/动画等一个 rAF 双帧 */
export async function nextFrames(page, count = 2) {
  await page.evaluate(
    (n) =>
      new Promise((resolve) => {
        let left = n;
        const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      }),
    count
  );
}

/** 收集当前页面断言相关的诊断摘要 */
export function diagnosticsSummary(diagnostics) {
  return {
    pageErrors: diagnostics.pageErrors,
    consoleProblems: consoleProblems(diagnostics),
    failedRequests: diagnostics.failedRequests,
  };
}

/**
 * 一站式运行：启动浏览器 → 新页面 → 执行 fn → 关闭。
 * fn 收到 { browser, context, page, diagnostics }。
 */
export async function withBrowser(fn, { launch = {}, context = {} } = {}) {
  const browser = await launchBrowser(launch);
  try {
    const session = await newPage(browser, context);
    try {
      return await fn({ browser, ...session });
    } finally {
      await session.close();
    }
  } finally {
    await browser.close();
  }
}

/** smoke 用示例文件清单（由 tools/gen-samples.py 生成） */
export const SAMPLE_FILES = [
  'sample-1.png',
  'sample-2.png',
  'sample-3.png',
  'sample-4.png',
  'sample-5.png',
  'sample-6.png',
  'sample-alpha.png',
  'sample-logo.svg',
  'sample-photo.jpg',
];
