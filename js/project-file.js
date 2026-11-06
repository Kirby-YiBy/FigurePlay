/* FigurePlay 完整工程文件：保存/打开 .figureplay-project（含图片、页面、编号、配置、分组）。
   图片以 dataURL/base64 内嵌，因此文件通常较大但完全可迁移。 */
(function () {
  'use strict';
  const TYPE = 'figureplay-project';
  const SCHEMA_VERSION = 1;
  const MAX_PROJECT_BYTES = 300 * 1024 * 1024;
  const el = {};
  let busy = false;

  function byId(id) { return document.getElementById(id); }
  function api() { return window.__FIGPLAY__; }
  function safeName(name) {
    return String(name || 'figureplay-project').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').slice(0, 80);
  }
  function defaultFilename() {
    const d = new Date();
    const p = function (n) { return n < 10 ? '0' + n : String(n); };
    return 'figureplay-project-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.figureplay-project';
  }
  function setStatus(text, error) {
    if (!el.status) return;
    el.status.textContent = text || '';
    el.status.style.color = error ? 'var(--danger)' : 'var(--faint)';
  }
  function updateMeta() {
    if (!api() || !api().getProjectSnapshot) return;
    try {
      const snap = api().getProjectSnapshot();
      const pages = snap.project.pages || [];
      let images = 0;
      pages.forEach(function (page) {
        (page.cells || []).forEach(function (cell) { if (cell) images++; });
      });
      if (el.meta) el.meta.textContent = pages.length + ' 页 · ' + images + ' 图';
    } catch (e) { /* ignore */ }
  }

  async function saveProject() {
    if (busy) return false;
    if (!api() || !api().getProjectSnapshot) { FP.toast('应用尚未就绪', 'error'); return false; }
    busy = true;
    try {
      const snapshot = api().getProjectSnapshot();
      const text = JSON.stringify(snapshot);
      const bytes = new Blob([text]).size;
      if (bytes > MAX_PROJECT_BYTES) {
        FP.toast('工程文件超过 300MB，暂时无法保存；请减少图片数量或分辨率', 'error', 6000);
        return false;
      }
      const filename = defaultFilename();
      let saved = false;
      let savedPath = '';
      if (FP.desktop && FP.desktop.available && typeof FP.desktop.saveFile === 'function') {
        try {
          const b64 = await FP.blobToBase64(new Blob([text], { type: 'application/json' }));
          const res = await FP.desktop.saveFile({
            suggestedName: filename,
            filterName: 'FigurePlay 工程文件',
            filterExtensions: ['.figureplay-project'],
            base64: b64
          });
          if (res) {
            if (res.canceled) { setStatus('已取消保存工程', false); return false; }
            if (res.ok) {
              saved = true;
              savedPath = res.path || '';
            } else {
              setStatus('保存工程失败：' + (res.error || '原生保存失败'), true);
              return false;
            }
          }
        } catch (e) {
          // 原生保存不可用时继续走浏览器 picker/下载
        }
      }
      if (!saved && typeof window.showSaveFilePicker === 'function') {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: 'FigurePlay 工程文件', accept: { 'application/json': ['.figureplay-project'] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(text);
          await writable.close();
          saved = true;
        } catch (err) {
          if (err && err.name === 'AbortError') return false;
          // 不支持/权限问题：回退下载
        }
      }
      if (!saved) {
        FP.downloadBlob(new Blob([text], { type: 'application/json' }), filename);
      }
      setStatus('已保存工程：' + FP.formatBytes(bytes) + (savedPath ? ' → ' + savedPath : ''), false);
      FP.toast('已保存完整工程（' + snapshot.project.pages.length + ' 页）', 'success', 3200);
      updateMeta();
      return true;
    } catch (e) {
      setStatus('保存工程失败：' + (e.message || e), true);
      FP.toast('保存工程失败：' + (e.message || e), 'error', 6000);
      return false;
    } finally {
      busy = false;
    }
  }

  async function openProjectFile(file) {
    if (!file) return false;
    if (file.size > MAX_PROJECT_BYTES) {
      setStatus('工程文件超过 300MB，无法打开', true);
      return false;
    }
    let raw;
    try {
      const text = await file.text();
      raw = JSON.parse(text);
    } catch (e) {
      setStatus('工程文件不是有效 JSON', true);
      FP.toast('打开工程失败：' + (e.message || e), 'error', 6000);
      return false;
    }
    try {
      if (!raw || raw.type !== TYPE) throw new Error('不是 FigurePlay 工程文件（缺少 type=figureplay-project）');
      const ver = Number(raw.schemaVersion);
      if (!isFinite(ver) || ver < 1) throw new Error('工程文件版本无效');
      if (ver > SCHEMA_VERSION) throw new Error('工程文件版本较新（v' + ver + '），当前程序最高支持 v' + SCHEMA_VERSION + '，请升级 FigurePlay');
      if (!raw.project || !Array.isArray(raw.project.pages) || !raw.project.pages.length) throw new Error('工程文件中没有图页');
      const info = api().getPreviewInfo();
      if (info && (info.imageCount > 0 || info.pageCount > 1) &&
          !window.confirm('打开工程会替换当前的 ' + info.pageCount + ' 页、' + info.imageCount + ' 张图片，且不可撤销。继续？')) {
        return false;
      }
      const result = api().loadProjectSnapshot(raw);
      setStatus('已打开工程：' + file.name, false);
      FP.toast('已打开工程（' + result.pages + ' 页 / ' + result.images + ' 图）', 'success', 3600);
      updateMeta();
      return true;
    } catch (e) {
      setStatus('打开工程失败：' + (e.message || e), true);
      FP.toast('打开工程失败：' + (e.message || e), 'error', 6500);
      return false;
    }
  }

  function init() {
    el.meta = byId('project-file-meta');
    el.status = byId('project-file-status');
    el.save = byId('btn-project-save');
    el.open = byId('btn-project-open');
    el.input = byId('project-file-input');
    if (!el.save || !el.open || !el.input) return;
    el.save.addEventListener('click', saveProject);
    el.open.addEventListener('click', function () { el.input.click(); });
    el.input.addEventListener('change', function () {
      const file = el.input.files && el.input.files[0];
      el.input.value = '';
      openProjectFile(file);
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 's') {
        // 只在应用区域/非输入框时拦截，避免影响浏览器保存页面
        const tag = (e.target && e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
        e.preventDefault();
        saveProject();
      }
    });
    updateMeta();
    setStatus('建议定期保存工程文件到本机或网盘。', false);
  }

  FP.updateProjectMeta = updateMeta;
  window.__PROJECT_FILES__ = {
    save: saveProject,
    open: openProjectFile,
    updateMeta: updateMeta
  };

  function whenReady() {
    if (window.__FIGPLAY__ && window.FP && window.FP.toast) init();
    else setTimeout(whenReady, 100);
  }
  whenReady();
})();
