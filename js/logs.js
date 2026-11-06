/* FigurePlay 诊断日志：错误/关键操作/ toast 的轻量本地记录，便于发布后反馈问题。 */
(function () {
  'use strict';
  const KEY = 'figureplay.diagnostics.v1';
  const MAX = 300;
  const el = {};
  let entries = [];
  let initialized = false;

  function nowIso() { return new Date().toISOString(); }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function stamp(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      entries = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(entries)) entries = [];
    } catch (e) { entries = []; }
    entries = entries.slice(-MAX);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX))); } catch (e) { /* ignore */ }
  }
  function append(level, message, detail) {
    let text = String(message == null ? '' : message);
    if (detail !== undefined && detail !== null && detail !== '') {
      try { text += ' ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)); } catch (e) { /* ignore */ }
    }
    entries.push({ t: nowIso(), level: String(level || 'info'), message: text.slice(0, 4000) });
    if (entries.length > MAX) entries = entries.slice(-MAX);
    save();
    if (el.text) render();
  }
  function render() {
    if (!el.text) return;
    if (!entries.length) { el.text.value = ''; return; }
    el.text.value = entries.slice(-120).map(function (e) {
      return '[' + stamp(e.t) + '] ' + e.level.toUpperCase() + '  ' + e.message;
    }).join('\n');
    el.text.scrollTop = el.text.scrollHeight;
  }
  function clear() {
    if (!window.confirm('清空本机诊断日志？')) return;
    entries = [];
    save();
    render();
    FP.toast('诊断日志已清空', 'info', 2200);
  }
  async function exportLog() {
    const text = entries.map(function (e) {
      return '[' + e.t + '] ' + e.level.toUpperCase() + '  ' + e.message;
    }).join('\r\n');
    const content = 'FigurePlay 诊断日志\r\n版本：' + FP.APP_VERSION + '\r\n生成时间：' + nowIso() + '\r\n\r\n' + text + '\r\n';
    const name = 'figureplay-diagnostics-' + nowIso().slice(0, 10) + '.log';
    if (window.FP && FP.desktop && FP.desktop.available && typeof FP.desktop.saveFile === 'function') {
      try {
        const blob = new Blob([content], { type: 'text/plain' });
        const b64 = await FP.blobToBase64(blob);
        const res = await FP.desktop.saveFile({
          suggestedName: name, filterName: 'FigurePlay 诊断日志', filterExtensions: ['.log'], base64: b64
        });
        if (res) {
          if (res.canceled) return;
          if (res.ok) {
            FP.toast('诊断日志已保存' + (res.path ? '：' + res.path : ''), 'success', 3500);
            return;
          }
          FP.toast('诊断日志保存失败：' + (res.error || '原生保存失败'), 'error', 5000);
          return;
        }
      } catch (e) { /* fallback */ }
    }
    FP.downloadBlob(new Blob([content], { type: 'text/plain' }), name);
    FP.toast('诊断日志已下载', 'success', 3000);
  }
  function init() {
    if (initialized) return;
    initialized = true;
    el.text = document.getElementById('diag-log-text');
    el.refresh = document.getElementById('diag-log-refresh');
    el.export = document.getElementById('diag-log-export');
    el.clear = document.getElementById('diag-log-clear');
    if (el.refresh) el.refresh.addEventListener('click', render);
    if (el.export) el.export.addEventListener('click', exportLog);
    if (el.clear) el.clear.addEventListener('click', clear);
    render();
    window.addEventListener('error', function (e) {
      append('error', e.message || '脚本错误', (e.filename || '') + ':' + (e.lineno || ''));
    });
    window.addEventListener('unhandledrejection', function (e) {
      const r = e.reason;
      append('error', '未处理的 Promise 拒绝', r && r.message ? r.message : String(r || ''));
    });
    const origError = console.error;
    console.error = function () {
      try {
        append('console', Array.prototype.map.call(arguments, function (a) {
          return a && a.message ? a.message : String(a);
        }).join(' '));
      } catch (e) { /* ignore */ }
      try { return origError.apply(console, arguments); } catch (e) { /* ignore */ }
    };
    const origToast = FP.toast;
    if (typeof origToast === 'function' && !origToast.__logged) {
      FP.toast = function (text, type, dur) {
        append('toast', (type ? type + ': ' : '') + text);
        return origToast.call(FP, text, type, dur);
      };
      FP.toast.__logged = true;
    }
    if (window.__FIGPLAY__ && window.__FIGPLAY__.version) append('info', '应用就绪 v' + window.__FIGPLAY__.version);
  }
  FP.logEvent = function (type, message, detail) { append(type || 'info', message, detail); };
  window.__DIAG_LOGS__ = {
    list: function () { return entries.slice(); },
    refresh: render,
    clear: function () { entries = []; save(); render(); },
    export: exportLog
  };
  function whenReady() {
    if (window.__FIGPLAY__ && window.FP && window.FP.toast) { load(); init(); }
    else setTimeout(whenReady, 100);
  }
  whenReady();
})();
