/**
 * 调用 Python 校验器（tools/verify-exports.py）的 Node 封装。
 * 由 e2e.mjs / scenarios.mjs 使用；校验逻辑都在 Python 侧（PIL、SVG 解析、Ghostscript/pdftoppm）。
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { DEV_DIR } from './browser.mjs';

export const PYTHON =
  process.env.PYTHON_EXECUTABLE ||
  'C:\\Users\\DragonDance\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe';
export const VERIFY_SCRIPT = path.join(DEV_DIR, 'tools', 'verify-exports.py');

function pushFlag(args, flag, value) {
  if (value === undefined || value === null) return;
  if (typeof value === 'boolean') {
    if (value) args.push(flag);
    return;
  }
  args.push(flag, String(value));
}

/**
 * @param {'image'|'svg'|'pdf'} kind
 * @param {string} file
 * @param {object} [options]
 * @returns {{ok:boolean, exitCode:number|null, report:object|null, failedChecks:string[], stderr:string, command:string}}
 */
export function verifyExport(kind, file, options = {}) {
  const args = ['--json', '--kind', kind, '--file', file];
  if (options.tolerance !== undefined) pushFlag(args, '--tolerance', options.tolerance);
  if (options.tolerancePt !== undefined) pushFlag(args, '--tolerance-pt', options.tolerancePt);
  if (kind === 'image') {
    pushFlag(args, '--expect-width', options.expectWidth);
    pushFlag(args, '--expect-height', options.expectHeight);
    pushFlag(args, '--expect-format', options.expectFormat);
    if (options.expectAlpha !== undefined) {
      args.push('--expect-alpha', options.expectAlpha ? 'true' : 'false');
    }
    pushFlag(args, '--expect-corner-alpha', options.expectCornerAlpha);
    pushFlag(args, '--expect-white-corners', options.expectWhiteCorners);
    pushFlag(args, '--min-unique-colors', options.minUniqueColors);
    pushFlag(args, '--probe-points-json', options.probePointsJson);
  } else if (kind === 'svg') {
    pushFlag(args, '--expect-width-mm', options.expectWidthMm);
    pushFlag(args, '--expect-height-mm', options.expectHeightMm);
    pushFlag(args, '--expect-cells', options.expectCells);
    pushFlag(args, '--expect-images', options.expectImages);
    pushFlag(args, '--expect-labels', options.expectLabels);
    pushFlag(args, '--expect-label-texts', options.expectLabelTexts);
    pushFlag(args, '--expect-bg', options.expectBg);
    pushFlag(args, '--expect-clip-rects-json', options.expectClipRectsJson);
    pushFlag(args, '--expect-clip-rects-count', options.expectClipRectsCount);
    pushFlag(args, '--expect-no-overlap', options.expectNoOverlap);
  } else if (kind === 'pdf') {
    pushFlag(args, '--expect-width-mm', options.expectWidthMm);
    pushFlag(args, '--expect-height-mm', options.expectHeightMm);
    pushFlag(args, '--expect-pages', options.expectPages);
    pushFlag(args, '--render-dir', options.renderDir);
    pushFlag(args, '--render-prefix', options.renderPrefix);
    pushFlag(args, '--render-dpi', options.renderDpi);
    pushFlag(args, '--max-ink-margin-mm', options.maxInkMarginMm);
    pushFlag(args, '--ink-tolerance', options.inkTolerance);
  } else if (kind === 'zip') {
    pushFlag(args, '--expect-entries', options.expectEntries);
    pushFlag(args, '--expect-ext', options.expectExt);
    // 正则可能以 '-' 开头，必须用 --flag=value 形式
    if (options.expectNamePattern !== undefined) {
      args.push(`--expect-name-pattern=${options.expectNamePattern}`);
    }
    pushFlag(args, '--expect-image-width', options.expectImageWidth);
    pushFlag(args, '--expect-image-height', options.expectImageHeight);
  }

  const proc = spawnSync(PYTHON, [VERIFY_SCRIPT, ...args], {
    encoding: 'utf8',
    timeout: options.timeout || 120000,
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });

  let report = null;
  try {
    report = JSON.parse(proc.stdout || '');
  } catch (err) {
    report = null;
  }
  const failedChecks = report && Array.isArray(report.failedChecks) ? report.failedChecks : [];
  const ok = proc.status === 0 && !!report && report.ok === true;
  return {
    ok,
    exitCode: proc.status,
    report,
    failedChecks,
    stderr: (proc.stderr || '').trim(),
    stdoutTail: (proc.stdout || '').slice(-2000),
    command: `python verify-exports.py ${args.join(' ')}`,
    kind,
    file,
  };
}

/** 校验结果转成 e2e check 的简短 detail */
export function describeVerify(result) {
  if (result.ok) return 'OK';
  const parts = [];
  if (result.report && result.report.details) {
    const details = result.report.details;
    if (details.image) parts.push(`${details.image.format} ${details.image.width}x${details.image.height}`);
    if (details.entryCount != null) parts.push(`zip entries=${details.entryCount}`);
    if (details.pageCount != null) parts.push(`pages=${details.pageCount}(${details.pageCountSource || ''})`);
    if (details.sizePt) parts.push(`sizePt=${JSON.stringify(details.sizePt)}`);
    if (details.labelTexts) parts.push(`labels=${JSON.stringify(details.labelTexts)}`);
    if (details.gsError) parts.push(`gsError=${details.gsError}`);
  }
  if (result.failedChecks.length) parts.push(`failed: ${result.failedChecks.join(' / ')}`);
  if (result.stderr) parts.push(`stderr=${result.stderr.slice(0, 300)}`);
  return parts.join('; ') || `exitCode=${result.exitCode}`;
}
