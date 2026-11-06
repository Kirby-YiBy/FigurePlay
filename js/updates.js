/* FigurePlay 更新检查/下载：宿主配置了 update.json 时才联网；默认不检查。 */
(function () {
  'use strict';
  const el = {};
  let latest = null;
  let busy = false;
  let initialized = false;

  function byId(id) { return document.getElementById(id); }
  function api() { return window.FP; }
  function desktopUpdate() {
    const d = window.FP && window.FP.desktop;
    return d && d.available && typeof d.checkUpdate === 'function' ? d : null;
  }
  function setStatus(text, error) {
    if (!el.status) return;
    el.status.textContent = text || '';
    el.status.style.color = error ? 'var(--danger)' : 'var(--muted)';
  }
  function showUpdate(info) {
    latest = info;
    if (!el.download) return;
    el.download.hidden = !(info && info.hasUpdate);
  }

  async function check(silent) {
    const d = desktopUpdate();
    if (!d) {
      setStatus('检查更新仅支持桌面版；浏览器版请直接更新程序文件。', false);
      return null;
    }
    if (busy) return null;
    busy = true;
    if (!silent) setStatus('正在检查更新…', false);
    try {
      const res = await d.checkUpdate();
      if (!res || !res.ok) {
        if (!silent) setStatus('检查更新失败：' + ((res && res.error) || '未知错误'), true);
        return null;
      }
      if (!res.configured) {
        setStatus('尚未配置更新源（可在 %APPDATA%\\FigurePlay\\update.json 中配置）。', false);
        showUpdate(null);
        return res;
      }
      if (res.hasUpdate) {
        const notes = res.notes ? ' 更新说明：' + res.notes : '';
        setStatus('发现新版本 ' + res.latestVersion + '（当前 ' + res.currentVersion + '）。' + notes, false);
        showUpdate(res);
        FP.toast('发现 FigurePlay 新版本 ' + res.latestVersion + '，可在「使用说明 → 更新」中下载。', 'info', 6000);
      } else {
        setStatus('当前已是最新版本 ' + (res.currentVersion || ''), false);
        showUpdate(null);
      }
      return res;
    } catch (e) {
      if (!silent) setStatus('检查更新失败：' + (e.message || e), true);
      return null;
    } finally {
      busy = false;
    }
  }

  async function download() {
    if (!latest || !latest.hasUpdate) return;
    const d = desktopUpdate();
    if (!d || typeof d.downloadUpdate !== 'function') return;
    if (!window.confirm('下载并安装 FigurePlay ' + latest.latestVersion + '？\\n安装前会校验 SHA256；程序会退出并由更新器替换 exe，配置/项目数据会保留。')) {
      return;
    }
    busy = true;
    if (el.download) el.download.disabled = true;
    setStatus('正在下载并校验更新…', false);
    try {
      const res = await d.downloadUpdate();
      if (!res || !res.ok) throw new Error((res && res.error) || '下载更新失败');
      setStatus(res.message || '更新已准备完成，程序将自动退出并更新。', false);
      FP.toast(res.message || '更新已准备完成，正在重启…', 'success', 6000);
    } catch (e) {
      setStatus('下载更新失败：' + (e.message || e), true);
      FP.toast('下载更新失败：' + (e.message || e), 'error', 7000);
    } finally {
      busy = false;
      if (el.download) el.download.disabled = false;
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    el.status = byId('update-status');
    el.check = byId('btn-check-update');
    el.download = byId('btn-download-update');
    if (!el.check || !el.download) return;
    if (desktopUpdate()) {
      el.check.addEventListener('click', function () { check(false); });
      el.download.addEventListener('click', download);
      // 启动后静默检查，宿主未配置更新源时不会联网
      setTimeout(function () { check(true); }, 2500);
    } else {
      el.check.disabled = true;
      el.download.hidden = true;
      setStatus('浏览器版请直接替换 index.html / js / assets；桌面版支持检查更新。', false);
    }
  }

  window.__UPDATES__ = { check: check, download: download };
  function whenReady() {
    if (window.__FIGPLAY__ && window.FP) init();
    else setTimeout(whenReady, 100);
  }
  whenReady();
})();
