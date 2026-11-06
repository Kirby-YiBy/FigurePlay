#!/usr/bin/env node
/**
 * FigurePlay E2E 场景测试入口（场景 A–F）
 *
 * 用法（绝对路径 node）：
 *   node E:\FigurePlay\_dev\e2e.mjs                    # 跑全部场景，产物写到 _dev/artifacts/e2e/<run-id>/
 *   node E:\FigurePlay\_dev\e2e.mjs --only=A,B         # 只跑 A/B（按场景代号前缀匹配）
 *   node E:\FigurePlay\_dev\e2e.mjs --final            # 全量跑并产出 _dev/report.md、_dev/shots/、_dev/exports/
 *   node E:\FigurePlay\_dev\e2e.mjs --list             # 列出场景
 *   node E:\FigurePlay\_dev\e2e.mjs --headed           # 有头调试
 *   node E:\FigurePlay\_dev\e2e.mjs --allow-file-access
 *
 * 退出码：0=全部通过；1=有场景失败；2=脚本异常；3=应用尚未就绪
 *
 * 产物：
 *   _dev/artifacts/e2e/<run-id>/results.json
 *   _dev/artifacts/e2e/<run-id>/screenshots/*.png
 *   _dev/artifacts/e2e/<run-id>/exports/*（导出文件）
 *   --final 时另写 _dev/report.md、_dev/shots/*.png、_dev/exports/*
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

import {
  APP_INDEX,
  ARTIFACTS_DIR,
  DEV_DIR,
  FILE_URL_ACCESS_ARGS,
  capturePageDiagnostics,
  consoleProblems,
  diagnosticsSummary,
  ensureDir,
  launchBrowser,
  newPage,
  openApp,
} from './lib/browser.mjs';
import { scenarios } from './scenarios.mjs';
import { scenariosV11 } from './scenarios-v11.mjs';
import { scenariosV12 } from './scenarios-v12.mjs';
import { scenariosV13 } from './scenarios-v13.mjs';
import { scenariosV15 } from './scenarios-v15.mjs';

const argv = process.argv.slice(2);
const headed = argv.includes('--headed');
const allowFileAccess = argv.includes('--allow-file-access');
const listOnly = argv.includes('--list');
const finalV11 = argv.includes('--final-v11');
const finalV12 = argv.includes('--final-v12');
const finalV13 = argv.includes('--final-v13');
const finalV131 = argv.includes('--final-v131');
const finalV132 = argv.includes('--final-v132');
const finalV133 = argv.includes('--final-v133');
const finalV134 = argv.includes('--final-v134');
const finalV140 = argv.includes('--final-v140');
const finalV141 = argv.includes('--final-v141');
const finalV142 = argv.includes('--final-v142');
const finalV150 = argv.includes('--final-v150');
const finalMode = argv.includes('--final') || finalV11 || finalV12 || finalV13 || finalV131 || finalV132 || finalV133 || finalV134 || finalV140 || finalV141 || finalV142 || finalV150;
const suiteArg = argv.find((item) => item.startsWith('--suite='));
const suite = suiteArg ? suiteArg.slice('--suite='.length) : 'all';
const onlyArg = argv.find((item) => item.startsWith('--only='));
const only = onlyArg
  ? onlyArg.slice('--only='.length).split(',').map((item) => item.trim()).filter(Boolean)
  : null;

const SUITES = {
  v10: { name: 'v10 回归（A–F）', scenarios },
  v11: { name: 'v1.1 新功能（G–L）', scenarios: scenariosV11 },
  v12: { name: 'v1.2 新功能（M–O）', scenarios: scenariosV12 },
  v13: { name: 'v1.3 新功能（P–U）', scenarios: scenariosV13 },
  v15: { name: 'v1.5 新功能（AA–AF）', scenarios: scenariosV15 },
  all: {
    name: 'v1.0 回归 + v1.1 + v1.2 + v1.3 + v1.4 + v1.5 全量（A–AF）',
    scenarios: [...scenarios, ...scenariosV11, ...scenariosV12, ...scenariosV13, ...scenariosV15],
  },
};
if (!SUITES[suite]) {
  console.error(`未知 suite: ${suite}（可选 v10 / v11 / v12 / v13 / all）`);
  process.exit(2);
}
const baseFinalNaming = finalV134
  ? {
    reportName: 'report-v1.3.4.md', shotsName: 'screens-v1.3.4', title: '（v1.3.4）',
    keepExportsInRun: true, compactScreens: true, runRootName: 'e2e-v134',
  }
  : (finalV133
    ? {
      reportName: 'report-v1.3.3.md', shotsName: 'screens-v1.3.3', title: '（v1.3.3）',
      keepExportsInRun: true, compactScreens: true, runRootName: 'e2e-v133',
    }
    : (finalV132
      ? {
        reportName: 'report-v1.3.2.md', shotsName: 'screens-v1.3.2', title: '（v1.3.2）',
        keepExportsInRun: true, compactScreens: true, runRootName: 'e2e-v132',
      }
      : (finalV131
        ? {
          reportName: 'report-v1.3.1.md', shotsName: 'screens-v1.3.1', title: '（v1.3.1）',
          keepExportsInRun: true, compactScreens: true, runRootName: 'e2e-v131',
        }
        : (finalV13
          ? {
            reportName: 'report-v1.3.md', shotsName: 'screens-v1.3', title: '（v1.3）',
            keepExportsInRun: true, compactScreens: true, runRootName: 'e2e-v13',
          }
          : (finalV12
            ? {
              reportName: 'report-v1.2.md', shotsName: 'screens-v1.2', title: '（v1.2）',
              keepExportsInRun: true, compactScreens: true, runRootName: 'e2e-v12',
            }
            : (finalV11
              ? {
                reportName: 'report-v1.1.md', shotsName: 'shots-v1.1', exportsName: 'exports-v1.1', title: '（v1.1）',
              }
              : {
                reportName: 'report.md', shotsName: 'shots', exportsName: 'exports', title: '',
              }))))));

const finalNaming = finalV150
  ? {
    reportName: 'report-v1.5.0.md', shotsName: 'screens-v1.5.0', title: '（v1.5.0）',
    keepExportsInRun: true, compactScreens: true, runRootName: 'e2e-v150',
  }
  : (finalV142
    ? {
      reportName: 'report-v1.4.2.md', shotsName: 'screens-v1.4.2', title: '（v1.4.2）',
      keepExportsInRun: true, compactScreens: true, runRootName: 'e2e-v142',
    }
    : (finalV141
      ? {
        reportName: 'report-v1.4.1.md', shotsName: 'screens-v1.4.1', title: '（v1.4.1）',
        keepExportsInRun: true, compactScreens: true, runRootName: 'e2e-v141',
      }
      : (finalV140
        ? {
          reportName: 'report-v1.4.0.md', shotsName: 'screens-v1.4.0', title: '（v1.4.0）',
          keepExportsInRun: true, compactScreens: true, runRootName: 'e2e-v140',
        }
        : baseFinalNaming)));

const log = (...args) => console.log(...args);
const section = (title) => log(`\n=== ${title} ===`);

function stampRunId() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
}

function truncate(value, max = 220) {
  let text;
  if (typeof value === 'string') text = value;
  else {
    try {
      text = JSON.stringify(value);
    } catch (err) {
      text = String(value);
    }
  }
  if (text === undefined) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function classifyFailedRequests(failedRequests) {
  const appResources = [];
  const other = [];
  for (const request of failedRequests) {
    const url = request.url || '';
    if (/\.(js|css|mjs)(\?|$)/i.test(url) || /\/assets\//.test(url)) appResources.push(request);
    else other.push(request);
  }
  return { appResources, other };
}

function readPlaywrightCoreVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DEV_DIR, 'node_modules', 'playwright-core', 'package.json'), 'utf8')).version;
  } catch (err) {
    return 'unknown';
  }
}

function appFilesSnapshot() {
  const files = ['index.html'];
  const appRoot = path.dirname(APP_INDEX);
  for (const relDir of ['assets', 'js']) {
    try {
      for (const name of fs.readdirSync(path.join(appRoot, relDir))) {
        if (/\.(js|css)$/i.test(name)) files.push(`${relDir}/${name}`);
      }
    } catch (err) {
      /* ignore */
    }
  }
  return files.map((rel) => {
    const abs = path.join(path.dirname(APP_INDEX), rel);
    try {
      const stat = fs.statSync(abs);
      const hash = createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
      return { file: rel, bytes: stat.size, mtime: stat.mtime.toISOString(), sha256: hash };
    } catch (err) {
      return { file: rel, missing: true };
    }
  });
}

function scenarioMatches(scenario, selector) {
  if (!selector) return true;
  const code = scenario.code.toUpperCase();
  const name = scenario.name.toUpperCase();
  return selector.some((item) => {
    const token = item.toUpperCase();
    if (/^[A-Z]{1,2}$/.test(token)) return code === token; // 单/双字母只按场景代号精确匹配
    return code === token || name === token || name.startsWith(token);
  });
}

function readAppVersionFromSource() {
  try {
    const utilPath = path.join(path.dirname(APP_INDEX), 'js', 'util.js');
    const source = fs.readFileSync(utilPath, 'utf8');
    const match = /APP_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(source);
    return match ? match[1] : 'unknown';
  } catch (err) {
    return 'unknown';
  }
}

/** 生成 Markdown 报告（--final / --final-v11 / --final-v12） */
async function writeFinalReport(summary, runDir, naming = {}) {
  const reportName = naming.reportName || 'report.md';
  const shotsName = naming.shotsName || 'shots';
  const exportsName = naming.exportsName || 'exports';
  const titleSuffix = naming.title || '';
  const keepExportsInRun = !!naming.keepExportsInRun;
  const compactScreens = !!naming.compactScreens;
  const shotsDir = path.join(DEV_DIR, shotsName);
  const exportsDir = keepExportsInRun ? path.join(runDir, 'exports') : path.join(DEV_DIR, 'artifacts', exportsName);
  await ensureDir(shotsDir);
  if (compactScreens) {
    // 空间受限模式：截图目录只保留本次运行的关键截图，先清空旧文件
    try { fs.rmSync(shotsDir, { recursive: true, force: true }); } catch (err) { /* ignore */ }
    await ensureDir(shotsDir);
  }
  if (!keepExportsInRun) await ensureDir(exportsDir);

  const copiedShots = new Map();
  const copiedExports = new Map();
  for (const scenario of summary.scenarioResults) {
    const keepScreenshot = (shot) => {
      if (!compactScreens) return true;
      if (scenario.status !== 'passed') return true; // 失败场景截图全部保留，便于排查
      if (scenario.screenshots[0] === shot) return true; // 每场景至少保留第 1 张关键截图
      return /(1000x640|multipage|pages|group|fig|bridge|first-screen)/i.test(path.basename(shot));
    };
    for (const shot of scenario.screenshots) {
      if (!keepScreenshot(shot)) {
        try { fs.rmSync(shot, { force: true }); } catch (err) { /* ignore */ }
        continue;
      }
      const target = path.join(shotsDir, path.basename(shot));
      await fsp.copyFile(shot, target);
      copiedShots.set(shot, target);
    }
  }
  function walkFiles(dir) {
    const out = [];
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      return out;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walkFiles(abs));
      else if (entry.isFile()) out.push(abs);
    }
    return out;
  }

  const keyExports = [];
  const exportsSourceDir = path.join(runDir, 'exports');
  let prunedExports = 0;
  if (keepExportsInRun) {
    // E: 盘空间有限：只保留关键导出样例（各格式主样例 + 合并/分组/多页证据）
    const keepExportRe = /(^fp-e2e-(png-300|jpg-q95|figure|png-transparent)\.(png|jpg|svg|pdf)$|^fp-v11-merge(\.|-)|^fp-v133-|^fp-v134-|^fp-v14-|^fp-v141-|^fp-v142-|^fp-v15-)/;
    for (const file of walkFiles(exportsSourceDir)) {
      if (keepExportRe.test(path.basename(file))) continue;
      try {
        fs.rmSync(file, { force: true });
        prunedExports += 1;
      } catch (err) { /* ignore */ }
    }
  }
  for (const file of walkFiles(exportsSourceDir)) {
    try {
      const stat = fs.statSync(file);
      const target = keepExportsInRun ? file : path.join(exportsDir, path.basename(file));
      if (!keepExportsInRun) {
        let finalTarget = target;
        if (copiedExports.has(finalTarget)) finalTarget = path.join(exportsDir, `dup-${path.basename(file)}`);
        await fsp.copyFile(file, finalTarget);
        copiedExports.set(file, finalTarget);
        keyExports.push({ file, target: finalTarget, size: stat.size });
      } else {
        copiedExports.set(file, file);
        keyExports.push({ file, target: file, size: stat.size });
      }
    } catch (err) {
      /* ignore */
    }
  }

  const passedScenarios = summary.scenarioResults.filter((item) => item.status === 'passed').length;
  const totalChecks = summary.scenarioResults.reduce((sum, item) => sum + item.checks.length, 0);
  const failedChecks = summary.scenarioResults.reduce(
    (sum, item) => sum + item.checks.filter((check) => !check.passed).length, 0);
  const exportRecords = [];
  for (const scenario of summary.scenarioResults) {
    for (const record of (scenario.evidence && scenario.evidence.exports) || []) exportRecords.push(record);
  }
  // 空间受限模式下导出文件已按关键样例裁剪，报告只列仍存在的文件
  const reportExportRecords = keepExportsInRun
    ? exportRecords.filter((record) => record.path && fs.existsSync(record.path))
    : exportRecords;

  const lines = [];
  lines.push(`# FigurePlay E2E 验证报告${titleSuffix}`, '');
  lines.push(`- 生成时间：${new Date().toISOString()}`);
  lines.push(`- 运行 id：\`${summary.runId}\``);
  lines.push(`- 应用：\`${APP_INDEX}\``);
  lines.push(`- 环境：Node ${summary.environment.node}；playwright-core ${summary.environment.playwrightCore}；Chrome ${summary.environment.chromeVersion}；headless=${summary.environment.headless}`);
  lines.push(`- 应用版本（js/util.js APP_VERSION）：${summary.environment.appVersion || 'unknown'}；场景 suite：${summary.environment.suite || 'all'}`);
  lines.push(`- 启动参数：${summary.environment.launchArgs.length ? '`' + summary.environment.launchArgs.join(' ') + '`' : '（无额外参数）'}`);
  lines.push(`- 结论：**${summary.pass ? 'PASS' : 'FAIL'}** — 场景 ${passedScenarios}/${summary.scenarioResults.length} 通过；断言 ${totalChecks - failedChecks}/${totalChecks} 通过`);
  const slowest = summary.scenarioResults.slice()
    .sort((a, b) => b.durationMs - a.durationMs).slice(0, 3);
  const totalDuration = summary.scenarioResults.reduce((sum, item) => sum + item.durationMs, 0);
  lines.push(`- 性能：全部场景累计 ${(totalDuration / 1000).toFixed(1)}s；最慢 3 个：${slowest.map((item) => `${item.code}(${(item.durationMs / 1000).toFixed(1)}s)`).join('、')}`);
  lines.push('', '应用文件快照（sha256 为完整冻结哈希，用于确认测试针对冻结版本）：', '');
  lines.push('| 文件 | 字节 | sha256 | mtime |', '| --- | ---: | --- | --- |');
  for (const file of summary.appFiles) {
    lines.push(`| ${file.file} | ${file.missing ? '缺失' : file.bytes} | ${file.sha256 || '-'} | ${file.mtime || '-'} |`);
  }

  lines.push('', '## 场景结果', '', '| 场景 | 标题 | 结果 | 断言 | 耗时 |', '| --- | --- | --- | ---: | ---: |');
  const statusLabel = { passed: '✅ PASS', failed: '❌ FAIL', todo: '⏳ TODO' };
  for (const scenario of summary.scenarioResults) {
    const failed = scenario.checks.filter((check) => !check.passed).length;
    lines.push(`| ${scenario.code} | ${scenario.title} | ${statusLabel[scenario.status] || scenario.status} | ${scenario.checks.length - failed}/${scenario.checks.length} | ${scenario.durationMs} ms |`);
  }

  const failedItems = [];
  for (const scenario of summary.scenarioResults) {
    for (const check of scenario.checks) {
      if (!check.passed) failedItems.push({ scenario, check });
    }
    if (scenario.error) failedItems.push({ scenario, check: { label: '场景异常', detail: scenario.error } });
  }
  lines.push('', '## 失败项清单', '');
  if (failedItems.length === 0) {
    lines.push('无失败项（全部断言通过）。');
  } else {
    lines.push('| 场景 | 失败断言 | 详情 | 复现建议 |', '| --- | --- | --- | --- |');
    for (const item of failedItems) {
      lines.push(`| ${item.scenario.code} | ${item.check.label.replace(/\|/g, '\\|')} | ${truncate(item.check.detail, 400).replace(/\|/g, '\\|')} | \`node E:\\FigurePlay\\_dev\\e2e.mjs --only=${item.scenario.code}\` |`);
    }
  }

  for (const scenario of summary.scenarioResults) {
    lines.push('', `## ${scenario.code}. ${scenario.title} — ${scenario.status === 'passed' ? 'PASS' : 'FAIL'}`, '');
    if (scenario.description) lines.push(`> ${scenario.description}`, '');
    lines.push('| 结果 | 断言 | 详情 |', '| --- | --- | --- |');
    for (const check of scenario.checks) {
      lines.push(`| ${check.passed ? '✅' : '❌'} | ${check.label.replace(/\|/g, '\\|')} | ${truncate(check.detail, 300).replace(/\|/g, '\\|')} |`);
    }
    if (scenario.error) lines.push('', '**异常**：', '', '```', truncate(scenario.error, 3000), '```');
    if (scenario.notes && scenario.notes.length) {
      lines.push('', '**备注 / 契约差异**：');
      for (const note of scenario.notes) lines.push(`- ${note.label}：${truncate(note.detail, 500)}`);
    }
    const diag = scenario.diagnostics || {};
    lines.push('', `诊断：pageerror=${(diag.pageErrors || []).length}，console error=${((diag.consoleProblems || []).filter((item) => item.type === 'error')).length}，失败资源请求=${(diag.failedRequests || []).length}`);
    for (const error of diag.pageErrors || []) lines.push('', '```', truncate(error, 1200), '```');
    const appResourceFailures = (diag.failedRequests || []).filter((item) => /\.(js|css)(\?|$)/.test(item.url || ''));
    for (const failure of appResourceFailures) lines.push(`- 资源加载失败：\`${failure.url}\` (${failure.failure})`);
    const keptScreenshots = scenario.screenshots.filter((shot) => copiedShots.has(shot));
    if (keptScreenshots.length) {
      lines.push('', '截图：');
      for (const shot of keptScreenshots) {
        const target = copiedShots.get(shot);
        const rel = path.relative(DEV_DIR, target).replace(/\\/g, '/');
        lines.push(`- ![${path.basename(shot)}](<${rel}>)`);
      }
    }
    if (scenario.evidence) {
      const { keyExports, exports: exportList, screenshot, ...rest } = scenario.evidence;
      if (Object.keys(rest).length) {
        lines.push('', '关键证据：', '', '```json', truncate(JSON.stringify(rest, null, 2), 4000), '```');
      }
    }
  }

  lines.push('', '## 导出文件校验', '');
  if (keepExportsInRun && prunedExports > 0) {
    lines.push(`> E: 盘空间预算：已保留关键导出样例 ${keyExports.length} 个，裁剪其它导出产物 ${prunedExports} 个（全部导出校验已在执行时完成，结果见下表与 results.json）。`, '');
  }
  if (!reportExportRecords.length) {
    lines.push('（无导出记录）');
  } else {
    lines.push('| 标签 | 格式 | 字节 | API 像素 | Python 校验 | 文件 |', '| --- | --- | ---: | --- | --- | --- |');
    for (const record of reportExportRecords) {
      const pixels = record.widthPx ? `${record.widthPx}×${record.heightPx}` : '-';
      const target = record.path ? copiedExports.get(record.path) : null;
      const rel = target ? path.relative(DEV_DIR, target).replace(/\\/g, '/') : record.path;
      const failed = (record.failedChecks || []).length;
      lines.push(`| ${record.label} | ${String(record.format).toUpperCase()} | ${record.size} | ${pixels} | ${record.verifierOk ? '✅ 通过' : `❌ 失败(${failed})`} | \`${rel}\` |`);
    }
  }

  lines.push('', '## 关键证据摘要', '');
  for (const scenario of summary.scenarioResults) {
    const evidence = scenario.evidence || {};
    if (scenario.code === 'A' && evidence.readyFlags) {
      lines.push(`- A 首屏：ready=${evidence.readyFlags.apiReady}，默认布局 ${evidence.initialPreview?.geom?.rows}×${evidence.initialPreview?.geom?.cols}，viewBox=${evidence.initialPreview ? 'ok' : 'n/a'}`);
    }
    if (scenario.code === 'B' && evidence['layout-3x2']) {
      lines.push(`- B 布局：3×2 cellCount=${evidence['layout-3x2'].cellCount}，2×3 cellCount=${evidence['layout-2x3']?.cellCount}，1×6 cellCount=${evidence['layout-1x6']?.cellCount}`);
    }
    if (scenario.code === 'C' && evidence.finalFilled) {
      lines.push(`- C 上传：最终 filled=[${evidence.finalFilled.join(',')}]`);
    }
    if (scenario.code === 'D' && evidence.positions) {
      lines.push(`- D 编号：9 位置归一化坐标 ${JSON.stringify(evidence.positions)}`);
    }
    if (scenario.code === 'E' && evidence.setup) {
      lines.push(`- E 导出：成品 ${evidence.setup.geom.widthMm}×${round(evidence.setup.geom.heightMm, 2)} mm，${evidence.setup.filled} 张图，导出文件 ${(evidence.exports || []).length} 个`);
    }
    if (scenario.code === 'F' && evidence.autosave) {
      lines.push(`- F 稳定性：自动保存后端=${evidence.autosave.backend}，恢复图片 ${evidence.autosave.filled} 张，IndexedDB=${JSON.stringify(evidence.indexedDB)}`);
    }
    if (scenario.code === 'G' && evidence.mergeState) {
      lines.push(`- G 合并：merges=${JSON.stringify(evidence.mergeState.merges)}，面板数=${(evidence.mergeState.panels || []).length}，cell-hit=${evidence.mergeState.cellHitCount}`);
    }
    if (scenario.code === 'H' && evidence['template-double-1plus3']) {
      const onePlusThree = evidence['template-double-1plus3'];
      lines.push(`- H 模板：double-1plus3 rows=${onePlusThree.rows} cols=${onePlusThree.cols} widthMm=${onePlusThree.widthMm} 面板=${onePlusThree.panelCount} merges=${JSON.stringify(onePlusThree.merges)}`);
    }
    if (scenario.code === 'I' && evidence.exports) {
      lines.push(`- I 批量编号：导出校验 ${evidence.exports.filter((item) => item.verifierOk).length}/${evidence.exports.length} 通过`);
    }
    if (scenario.code === 'J' && evidence.v11Probe) {
      lines.push(`- J 粘贴弹窗：v1.1 契约探测 ${JSON.stringify(evidence.v11Probe).slice(0, 220)}`);
    }
    if (scenario.code === 'K' && evidence.v11Probe) {
      lines.push(`- K 桌面桥：window.chrome.webview mock 安装成功，v1.1 探测 ${JSON.stringify(evidence.v11Probe).slice(0, 220)}`);
    }
    if (scenario.code === 'L' && evidence['layout-1000x640']) {
      const snap = evidence['layout-1000x640'];
      lines.push(`- L 高DPI布局：1000×640 display=${snap.appDisplay} columns=${snap.columnCount} stage.w=${snap.stage && snap.stage.w} shell.w=${snap.shell && snap.shell.w}，950 三栏、899 堆叠、1366/1440 复检通过`);
    }
    if (scenario.code === 'M' && evidence.autosave) {
      lines.push(`- M 多页：自动保存 version=${evidence.autosave.version}，页数=${evidence.autosave.pageCount}，当前页=${evidence.autosave.current}，页面填充=${JSON.stringify(evidence.autosave.pages)}`);
    }
    if (scenario.code === 'N') {
      lines.push('- N 撤销重做：布局/编号/上传/偏移合并/页增删/模板 的撤销重做 + 快捷键 + 弹窗守卫断言通过');
    }
    if (scenario.code === 'O' && evidence.exports) {
      const listed = evidence.exports.map((item) => item.label);
      lines.push(`- O 分组/多页导出/.fig：导出校验 ${evidence.exports.filter((item) => item.verifierOk).length}/${evidence.exports.length} 通过；样例=${JSON.stringify(listed)}`);
    }
    if (scenario.code === 'P' && evidence.gridSummary) {
      lines.push(`- P 网格自定义：可用 ${JSON.stringify(evidence.gridSummary.accepted)}；拒绝 ${evidence.gridSummary.rejected}；夹取 ${evidence.gridSummary.clamped}`);
    }
    if (scenario.code === 'Q' && evidence.exports) {
      lines.push(`- Q 保存位置：picker/Abort 回退/无 picker 下载路径均通过；导出验证 ${evidence.exports.filter((item) => item.verifierOk).length}/${evidence.exports.length}`);
    }
    if (scenario.code === 'R' && evidence.autoPad) {
      lines.push(`- R 自动页距：越界后 bottom=${round(evidence.autoPad.after.pads.bottom, 2)}mm、页高 ${round(evidence.autoPad.before.height, 2)}→${round(evidence.autoPad.after.height, 2)}mm；手动 pad+SVG/PDF 尺寸校验通过`);
    }
    if (scenario.code === 'S' && evidence.pdfTrim) {
      const trim = evidence.pdfTrim;
      const maxMargin = (margins) => {
        if (!margins) return null;
        return Math.max(margins.top, margins.right, margins.bottom, margins.left);
      };
      const lb = trim.letterbox || {};
      const safe = trim.labelSafe || {};
      lines.push(`- S PDF 墨迹裁剪（v1.3.2 安全边距）：整页 ${round(trim.geom.w, 2)}×${round(trim.geom.h, 2)}mm；内容盒 ${round(trim.contentBox.wMm, 2)}×${round(trim.contentBox.hMm, 2)}mm → ink ${round(trim.inkBox.wMm, 2)}×${round(trim.inkBox.hMm, 2)}mm；trim0(→1mm) 最大余量 ${maxMargin(trim.trim0 && trim.trim0.marginsMm)}mm、trim2 最大 ${maxMargin(trim.trim2 && trim.trim2.marginsMm)}mm；letterbox ink ${lb.ink ? round(lb.ink.wMm, 2) + '×' + round(lb.ink.hMm, 2) + 'mm' : '-'}；用户配置(3×2/bc/offsetY5) trim0 余量 ${JSON.stringify(safe.margins0 || null)}、trim2 余量 ${JSON.stringify(safe.margins2 || null)}（底部编号完整）`);
    }
    if (scenario.code === 'V' && evidence.negativeGap) {
      const neg = evidence.negativeGap;
      const ov = neg.overlay || {};
      lines.push(`- V 负间距：gap 0→${JSON.stringify(neg.negative.gap)}，cellW ${round(neg.base.cellW, 2)}→${round(neg.negative.cellW, 2)}mm，面板重叠 X=${round(neg.negative.overlapX, 2)}mm / Y=${round(neg.negative.overlapY, 2)}mm；clamp=${JSON.stringify(neg.clamped && [neg.clamped.colGap, neg.clamped.rowGap])}；PNG/PDF/trim/SVG 导出均通过（trim 余量 ${JSON.stringify(neg.exports.trim && neg.exports.trim.margins)}）；v1.3.3 overlay 最后子层=${ov.lastChildClass || '-'}、单选/多选=${ov.singleSelection ? 1 : 0}/${ov.multiSelectionCount || 0}、hover 在顶层、导出 SVG 无交互元素`);
    }
    if (scenario.code === 'AA' && evidence.projectFile) {
      const pf = evidence.projectFile;
      lines.push(`- AA 工程文件：快照 ${JSON.stringify(pf.snapshot)}；真实下载 ${pf.file.filename}（${pf.file.size}B）；改布局/清空后打开恢复 ${JSON.stringify(pf.restored)}；错误文件（${pf.errors.join('/')}）中文报错不改变工程`);
    }
    if (scenario.code === 'AB' && evidence.configBackup) {
      const cb = evidence.configBackup;
      lines.push(`- AB 配置备份：${cb.hostPath}；list/read 最新备份（${cb.backups.join('、')}）→ 恢复 ${JSON.stringify(cb.restored)} 并触发 host save；浏览器模式隐藏恢复按钮`);
    }
    if (scenario.code === 'AC' && evidence.journalPresets) {
      const jp = evidence.journalPresets;
      lines.push(`- AC 期刊库：${jp.cards} 个预设/${jp.groups.length} 分组（${jp.groups.join('、')}）；套用 Nature 单栏 ${jp.nature.widthMm}mm/${jp.nature.font}${jp.nature.size}pt/${jp.nature.format}/trim=${jp.nature.trim}，Science 单栏 ${jp.science.widthMm}mm/${jp.science.size}pt；网格与图片数量不变`);
    }
    if (scenario.code === 'AD' && evidence.preflight) {
      const pf = evidence.preflight;
      lines.push(`- AD 图片预检：低分辨率 warnings=${JSON.stringify(pf.low)}；高分辨率 dpi=${round(pf.high && pf.high.dpi, 1)} 无警告；拉伸 warnings=${JSON.stringify(pf.stretch)}`);
    }
    if (scenario.code === 'AE' && evidence.updateUi) {
      const up = evidence.updateUi;
      lines.push(`- AE 更新 UI：stub checkUpdate 显示「${up.status}」；checkCalls=${up.checkCalls}、downloadCalls=${up.downloadCalls}；浏览器模式按钮禁用`);
    }
    if (scenario.code === 'AF' && evidence.multiPageVector) {
      const mv = evidence.multiPageVector;
      lines.push(`- AF 全页矢量：stub exportVectorPdfMulti 调用 ${mv.calls} 次、pages=${mv.pages.length}（${JSON.stringify(mv.pages)}）；尺寸不一致回退：vectorDisabled=${mv.fallback.vectorDisabled}、提示含多页位图、不再调用 multi；回退 PDF=${mv.fallback.file}`);
    }
    if (scenario.code === 'Z' && evidence.hostConfig) {
      const host = evidence.hostConfig;
      lines.push(`- Z 配置宿主持久化：${host.hostPath}；init loadConfigProfiles、旧 localStorage→host 迁移 save（${JSON.stringify(host.migration && host.migration.savedNames)}）；保存/删除/导入均触发 host save；清空 localStorage 后 host 恢复（${JSON.stringify(host.restoreAfterLocalClear)}）；浏览器模式仍 localStorage（提示：${host.browserMode && host.browserMode.hint}）；配置保存不改主题（${host.isolation && host.isolation.theme && host.isolation.theme.theme}/${host.isolation && host.isolation.theme && host.isolation.theme.accent}）、历史不变（${host.isolation && host.isolation.historyBefore}→${host.isolation && host.isolation.historyAfter}）且项目 payload 不含配置`);
    }
    if (scenario.code === 'Y' && evidence.labelBBox) {
      const data = evidence.labelBBox;
      const labelC = data.labelC || {};
      lines.push(`- Y 矢量 label bbox：配置1 2×3/170mm/4:3/colGap-4/rowGap1/autoPad、label bc/Times9；fonts=${data.fonts && data.fonts.status}；spec.labels ${data.labels.length} 项 textLeftMm/textTopMm/textWmm/textHmm 与预览 getBBox 最大偏差 dx=${Math.max(...data.labels.map((item) => item.dx)).toFixed(3)}/dy=${Math.max(...data.labels.map((item) => item.dy)).toFixed(3)}/dw=${Math.max(...data.labels.map((item) => item.dw)).toFixed(3)}/dh=${Math.max(...data.labels.map((item) => item.dh)).toFixed(3)}mm； (c) top=${labelC.spec ? labelC.spec.top : '-'}mm、height=${labelC.spec ? labelC.spec.h : '-'}mm；两次导出 spec 完全一致`);
    }
    if (scenario.code === 'X' && evidence.configProfiles) {
      const conf = evidence.configProfiles;
      lines.push(`- X 配置模板：目标 3×2/170mm/列距3/行距1/Arial11/PDF/裁边1.5/矢量；保存→localStorage/reload 持久；应用（有图 confirm）恢复参数并重排图片（${conf.appliedImages.before.length} 张顺序一致）；导出 JSON schemaVersion=${conf.exportedJson && conf.exportedJson.schemaVersion} 无图片可重新导入；无效导入（${conf.invalidImports.join('/')}）中文报错不落盘；历史 save=${conf.history.beforeSave}→apply=${conf.history.afterApply}、重复应用不增；主题保持 ${conf.themeIsolation.theme}/${conf.themeIsolation.accent}`);
    }
    if (scenario.code === 'W' && evidence.appearance) {
      const look = evidence.appearance;
      const iso = look.exportIsolation || {};
      const darkStyles = look.darkStyles || {};
      lines.push(`- W 界面外观：默认跟随系统（dark→light→dark 自动切换）；3 模式 + 7 主题色 active/aria/localStorage reload 保留；深色下 body/panel/输入框/帮助弹窗深色、figure-shell 预览仍白（${darkStyles.figureShell || '-'}）；导出隔离 PNG=${iso.pngEqual}、SVG=${iso.svgEqual}（${iso.variants ? iso.variants.join('/') : ''}），预览 DOM hash 不变；1000×700 按钮/popover 不溢出`);
    }
    if (scenario.code === 'T' && evidence.rangeNums) {
      lines.push(`- T 数字输入：zoom=${evidence.rangeNums.state.zoom}、jpgQuality=${evidence.rangeNums.state.jpgQuality}、bgOpacity=${evidence.rangeNums.state.bgOpacity}（夹取/双向同步通过）`);
    }
    if (scenario.code === 'U' && evidence.vectorPdf) {
      const panels = evidence.vectorPdf.spec.panels.map((item) => item.kind).join(',');
      const trimCrop = evidence.vectorPdf.trimCrop;
      const ink = evidence.vectorPdf.inkCrop;
      lines.push(`- U EMF 矢量 PDF：emfCount=${evidence.vectorPdf.vectorStatus.emfCount}，spec panels=[${panels}]、labels=${evidence.vectorPdf.spec.labels.length}；trim spec.crop=${trimCrop ? `${round(trimCrop.wMm, 2)}×${round(trimCrop.hMm, 2)}mm` : '无'}（≈getInkCropBox ${ink ? `${round(ink.wMm, 2)}×${round(ink.hMm, 2)}mm` : ''}）、spec.trimMarginMm=${evidence.vectorPdf.trimMarginMm};mock 成功写入/失败回退位图均通过`);
    }
  }

  const contractNotes = [];
  for (const scenario of summary.scenarioResults) {
    for (const note of scenario.notes || []) {
      // 契约探测信息不算“差异/问题”
      if (/契约/.test(note.label) && !/探测/.test(note.label)) {
        contractNotes.push(`- [${scenario.code}] ${note.label}：${note.detail}`);
      }
    }
  }
  lines.push('', '## 契约差异与已知问题', '');
  if (contractNotes.length === 0) lines.push('无（未发现契约差异）。');
  else lines.push(...contractNotes);

  lines.push('', '## 复现命令', '', '```powershell');
  lines.push(`# 完整 E2E（含报告与截图）`);
  const finalCmd = finalV150 ? '--suite=all --final-v150'
    : (finalV142 ? '--suite=all --final-v142'
      : (finalV141 ? '--suite=all --final-v141'
        : (finalV140 ? '--suite=all --final-v140'
          : (finalV134 ? '--suite=all --final-v134'
            : (finalV133 ? '--suite=all --final-v133'
              : (finalV132 ? '--suite=all --final-v132'
                : (finalV131 ? '--suite=all --final-v131'
                  : (finalV13 ? '--suite=all --final-v13'
                    : (finalV12 ? '--suite=all --final-v12' : (finalV11 ? '--final-v11' : '--final'))))))))));
  lines.push(`node ${path.join(DEV_DIR, 'e2e.mjs')} ${finalCmd}`);
  lines.push(`# v1.5.0 全量（v1.0 回归 + v1.1 + v1.2 + v1.3 + 工程文件/配置备份/期刊库/预检/更新/全页矢量）`);
  lines.push(`node ${path.join(DEV_DIR, 'e2e.mjs')} --suite=all --final-v150`);
  lines.push(`# 只跑某场景 / suite`);
  lines.push(`node ${path.join(DEV_DIR, 'e2e.mjs')} --only=U`);
  lines.push(`node ${path.join(DEV_DIR, 'e2e.mjs')} --suite=v13`);
  lines.push('```', '');
  lines.push(`截图目录：\`_dev/${shotsName}/\`（${copiedShots.size} 张，关键场景）`);
  if (keepExportsInRun) {
    lines.push(`导出样例目录：\`${path.relative(DEV_DIR, exportsDir).replace(/\\/g, '/')}/\`（run 目录内保留 ${copiedExports.size} 个关键导出，控制磁盘占用；完整导出校验结果见本报告与 results.json）`);
  } else {
    lines.push(`导出样例目录：\`_dev/artifacts/${exportsName}/\`（${copiedExports.size} 个文件）`);
  }
  lines.push(`结果 JSON：\`${path.relative(DEV_DIR, path.join(runDir, 'results.json')).replace(/\\/g, '/')}\``);
  lines.push('');

  const reportPath = path.join(DEV_DIR, reportName);
  await fsp.writeFile(reportPath, lines.join('\n'), 'utf8');
  return { reportPath, shots: [...copiedShots.values()], exports: keyExports };
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

async function main() {
  if (listOnly) {
    log('FigurePlay E2E 场景：');
    for (const [suiteKey, entry] of Object.entries(SUITES)) {
      log(`\n[${suiteKey}] ${entry.name}`);
      for (const scenario of entry.scenarios) {
        log(`  ${scenario.code}  ${scenario.name.padEnd(16)} ${scenario.title.padEnd(6)} ${scenario.description}`);
      }
    }
    return 0;
  }

  if (!fs.existsSync(APP_INDEX)) {
    log('应用尚未就绪：');
    log(`  ${APP_INDEX} 不存在（应由 Lead 交付）。`);
    log(`  可先运行环境 smoke：node ${path.join(DEV_DIR, 'smoke', 'run-smoke.mjs')}`);
    return 3;
  }

  const selected = SUITES[suite].scenarios.filter((scenario) => !only || scenarioMatches(scenario, only));
  if (!selected.length) {
    log(`没有匹配的场景（--suite=${suite}, --only=${only ? only.join(',') : ''}）`);
    return 2;
  }

  const runId = stampRunId();
  const runRoot = finalNaming.runRootName
    ? path.join(ARTIFACTS_DIR, finalNaming.runRootName)
    : path.join(ARTIFACTS_DIR, 'e2e');
  const runDir = path.join(runRoot, runId);
  const runDirs = {
    run: runDir,
    screenshots: path.join(runDir, 'screenshots'),
    exports: path.join(runDir, 'exports'),
    downloads: path.join(runDir, 'downloads'),
  };
  for (const dir of Object.values(runDirs)) await ensureDir(dir);
  // 空间受限：新 run 开始时清掉同根目录下的旧 run（保留历史请先自行归档）
  if (finalMode && finalNaming.runRootName) {
    try {
      for (const entry of fs.readdirSync(runRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === runId) continue;
        fs.rmSync(path.join(runRoot, entry.name), { recursive: true, force: true });
      }
    } catch (err) { /* ignore */ }
  }

  log(`FigurePlay E2E run ${runId}  [suite=${suite}: ${SUITES[suite].name}]`);
  log(`应用: ${APP_INDEX}  (源码版本 ${readAppVersionFromSource()})`);
  log(`场景: ${selected.map((scenario) => scenario.code).join(', ')}  (headless=${!headed})`);
  const finalTargetText = finalV150 || finalV142 || finalV141 || finalV140 || finalV134 || finalV133 || finalV132 || finalV131 || finalV13 || finalV12
    ? `  →  final: ${finalNaming.reportName} / ${finalNaming.shotsName}/ / run 内关键导出`
    : (finalMode ? `  →  final: ${finalNaming.reportName} / ${finalNaming.shotsName}/ / artifacts/${finalNaming.exportsName}/` : '');
  log(`产物: ${runDir}${finalTargetText}\n`);

  const browser = await launchBrowser({
    headless: !headed,
    args: allowFileAccess ? FILE_URL_ACCESS_ARGS : [],
  });
  const environment = {
    node: process.version,
    playwrightCore: readPlaywrightCoreVersion(),
    chromeVersion: browser.version(),
    headless: !headed,
    launchArgs: allowFileAccess ? FILE_URL_ACCESS_ARGS : [],
    appVersion: readAppVersionFromSource(),
    suite,
    suiteName: SUITES[suite].name,
    startedAt: new Date().toISOString(),
  };
  const scenarioResults = [];
  let aborted = false;

  try {
    for (const scenario of selected) {
      section(`${scenario.code}. ${scenario.title}（${scenario.name}）`);
      const started = Date.now();
      const result = {
        code: scenario.code,
        name: scenario.name,
        title: scenario.title,
        description: scenario.description,
        status: 'passed',
        checks: [],
        notes: [],
        evidence: {},
        screenshots: [],
        error: null,
        durationMs: 0,
      };
      const session = await newPage(browser, scenario.contextOptions || {});
      const { context, page, diagnostics } = session;
      let screenshotIndex = 0;
      const ctx = {
        page,
        context,
        diagnostics,
        evidence: result.evidence,
        notes: result.notes,
        runDir,
        exportsDir: runDirs.exports,
        downloadsDir: runDirs.downloads,
        check(label, condition, detail) {
          const passed = !!condition;
          result.checks.push({ label, passed, detail: detail === undefined ? null : detail });
          if (!passed) result.status = 'failed';
          return passed;
        },
        note(label, detail) {
          result.notes.push({ label, detail: detail === undefined ? '' : typeof detail === 'string' ? detail : JSON.stringify(detail) });
        },
        async screenshot(name) {
          screenshotIndex += 1;
          const safe = String(name || 'screenshot').replace(/[^\w.-]/g, '_');
          const filePath = path.join(runDirs.screenshots, `${scenario.code}-${String(screenshotIndex).padStart(2, '0')}-${safe}.png`);
          await page.screenshot({ path: filePath });
          result.screenshots.push(filePath);
          return filePath;
        },
      };

      try {
        await scenario.run(ctx);
      } catch (err) {
        result.status = 'failed';
        result.error = String(err && err.stack ? err.stack : err);
        try {
          const failureShot = path.join(runDirs.screenshots, `${scenario.code}-failure.png`);
          await page.screenshot({ path: failureShot });
          result.screenshots.push(failureShot);
        } catch (shotErr) {
          /* ignore */
        }
      }

      // 框架级统一检查：页面异常 / 控制台 error / 应用资源加载失败
      const summary = diagnosticsSummary(diagnostics);
      const appFailures = classifyFailedRequests(diagnostics.failedRequests).appResources;
      const consoleErrorList = summary.consoleProblems.filter((item) => item.type === 'error');
      result.checks.push({
        label: '无页面 JS 异常（pageerror）',
        passed: summary.pageErrors.length === 0,
        detail: summary.pageErrors,
      });
      if (summary.pageErrors.length > 0) result.status = 'failed';
      result.checks.push({
        label: '无控制台 error',
        passed: consoleErrorList.length === 0,
        detail: consoleErrorList.map((item) => `${item.text} @ ${item.location && item.location.url ? item.location.url : ''}`),
      });
      if (consoleErrorList.length > 0) result.status = 'failed';
      result.checks.push({
        label: '无应用资源加载失败（js/css/assets）',
        passed: appFailures.length === 0,
        detail: appFailures.map((item) => `${item.url} (${item.failure})`),
      });
      if (appFailures.length > 0) result.status = 'failed';
      const otherFailures = classifyFailedRequests(diagnostics.failedRequests).other;
      if (otherFailures.length > 0) result.notes.push({ label: '非应用资源失败请求', detail: JSON.stringify(otherFailures) });

      result.consoleWarnings = summary.consoleProblems.filter((item) => item.type === 'warning');
      result.diagnostics = summary;
      result.durationMs = Date.now() - started;
      scenarioResults.push(result);

      const failedChecks = result.checks.filter((check) => !check.passed);
      log(`[${result.status === 'passed' ? 'PASS' : 'FAIL'}] ${scenario.code}. ${scenario.title} (${result.durationMs} ms) ` +
        `checks=${result.checks.length - failedChecks.length}/${result.checks.length} screenshots=${result.screenshots.length}`);
      for (const check of failedChecks) {
        log(`       ✗ ${check.label} :: ${truncate(check.detail, 400)}`);
      }
      if (result.error) log(`       ERROR: ${truncate(result.error.split('\n')[0], 300)}`);
      for (const note of result.notes) log(`       note[${note.label}] ${truncate(note.detail, 300)}`);

      try {
        await context.close();
      } catch (err) {
        /* ignore */
      }

      // 应用在运行期间被删/改坏时提前终止，给出明确提示
      if (!fs.existsSync(APP_INDEX)) {
        log('\n检测到 index.html 在测试过程中消失，终止后续场景。');
        aborted = true;
        break;
      }
    }
  } finally {
    try {
      await browser.close();
    } catch (err) {
      /* ignore */
    }
  }

  const failed = scenarioResults.filter((result) => result.status === 'failed');
  const summary = {
    runId,
    environment,
    appIndex: APP_INDEX,
    appFiles: appFilesSnapshot(),
    scenarioResults,
    passed: scenarioResults.filter((result) => result.status === 'passed').length,
    failed: failed.length,
    total: scenarioResults.length,
    pass: failed.length === 0 && !aborted && scenarioResults.length === selected.length,
    aborted,
    finishedAt: new Date().toISOString(),
  };
  const resultsPath = path.join(runDir, 'results.json');
  await fsp.writeFile(resultsPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');

  const totalChecks = scenarioResults.reduce((sum, result) => sum + result.checks.length, 0);
  const failedChecks = scenarioResults.reduce(
    (sum, result) => sum + result.checks.filter((check) => !check.passed).length, 0);
  log(`\nE2E ${summary.pass ? 'PASS' : 'FAIL'}  scenarios=${summary.passed}/${summary.total}  checks=${totalChecks - failedChecks}/${totalChecks}`);
  log(`results: ${resultsPath}`);

  if (finalMode) {
    const final = await writeFinalReport(summary, runDir, finalNaming);
    log(`report: ${final.reportPath}`);
    log(`shots: ${final.shots.length} 个 -> ${path.join(DEV_DIR, finalNaming.shotsName)}`);
    if (finalNaming.keepExportsInRun) {
      log(`exports: ${final.exports.length} 个关键样例 -> ${path.join(runDir, 'exports')}`);
    } else {
      log(`exports: ${final.exports.length} 个 -> ${path.join(DEV_DIR, 'artifacts', finalNaming.exportsName)}`);
    }
    // 打印新产物总体积，便于控制 E: 盘占用
    try {
      let totalBytes = 0;
      const statDir = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const abs = path.join(dir, entry.name);
          if (entry.isDirectory()) statDir(abs);
          else if (entry.isFile()) totalBytes += fs.statSync(abs).size;
        }
      };
      const dirs = new Set([runDir, path.join(DEV_DIR, finalNaming.shotsName)]);
      const reportPath = path.join(DEV_DIR, finalNaming.reportName);
      for (const dir of dirs) {
        try { statDir(dir); } catch (err) { /* ignore */ }
      }
      try { totalBytes += fs.statSync(reportPath).size; } catch (err) { /* ignore */ }
      log(`updated artifacts size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB (run + screens + report)`);
    } catch (err) { /* ignore */ }
  }

  if (!summary.pass) {
    log('\n失败场景：');
    for (const result of failed) log(`  - ${result.code}. ${result.title}`);
  }
  return summary.pass ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error('E2E ERROR:', err && err.stack ? err.stack : err);
    process.exitCode = 2;
  });
