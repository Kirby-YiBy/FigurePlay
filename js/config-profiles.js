/* FigurePlay 配置模板：保存/应用/导入/导出基础拼图配置。
   配置只含网格、编号、字体、间距和导出设置，不含图片；保存于 localStorage，
   也可导出为可移植的 .figureplay.json 文件。 */
(function () {
  'use strict';
  const KEY = 'figureplay.configProfiles.v1';
  const SCHEMA = 'figureplay-config';
  const SCHEMA_VERSION = 1;
  const MAX_PROFILES = 100;
  const POS_NAMES = {
    tl: '左上', tc: '顶部中间', tr: '右上',
    ml: '左侧中间', mc: '正中', mr: '右侧中间',
    bl: '左下', bc: '底部中间', br: '右下'
  };
  let profiles = [];
  let importDraft = null;
  let ready = false;
  let hostPath = '';
  let hostSaveChain = Promise.resolve();
  let hostSaveWarned = false;
  const el = {};

  function byId(id) { return document.getElementById(id); }
  function api() { return window.__FIGPLAY__; }
  function uid() { return 'cfg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function cleanName(v) { return String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60); }
  function cleanDesc(v) { return String(v || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').trim().slice(0, 500); }
  function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function safeFilename(name) {
    return String(name || 'config').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').slice(0, 50) + '.figureplay.json';
  }

  function sanitizeList(arr) {
    return Array.isArray(arr) ? arr.filter(function (p) {
      return p && p.type === SCHEMA && p.schemaVersion <= SCHEMA_VERSION;
    }).slice(0, MAX_PROFILES) : [];
  }

  function readLocalProfiles() {
    try {
      const raw = localStorage.getItem(KEY);
      return sanitizeList(raw ? JSON.parse(raw) : []);
    } catch (e) {
      return [];
    }
  }

  function writeLocalProfiles() {
    try {
      localStorage.setItem(KEY, JSON.stringify(profiles.slice(0, MAX_PROFILES)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function desktopStore() {
    const d = window.FP && window.FP.desktop;
    if (d && d.available && typeof d.loadConfigProfiles === 'function' && typeof d.saveConfigProfiles === 'function') {
      return d;
    }
    return null;
  }

  function updateStorageHint() {
    if (!el.storageHint) return;
    if (hostPath) {
      el.storageHint.textContent = '桌面版本机配置：' + hostPath + '（每次保存自动生成时间戳备份）';
    } else if (desktopStore()) {
      el.storageHint.textContent = '桌面版配置会写入本机文件并自动备份；浏览器版保存在浏览器本地。';
    } else {
      el.storageHint.textContent = '配置保存在当前浏览器本地；换电脑请用“导出 JSON”迁移。';
    }
  }

  async function loadProfiles() {
    profiles = readLocalProfiles();
    const store = desktopStore();
    if (!store) {
      updateStorageHint();
      return;
    }
    try {
      const res = await store.loadConfigProfiles();
      if (!res || !res.ok) throw new Error((res && res.error) || '本机配置文件读取失败');
      if (res.path) hostPath = String(res.path);
      const hostProfiles = sanitizeList(res.profiles || []);
      const hostIds = {};
      hostProfiles.forEach(function (p) { hostIds[p.id] = true; });
      const extraLocal = profiles.filter(function (p) { return !hostIds[p.id]; });
      if (!res.exists && profiles.length) {
        // 旧版 localStorage → 新版本机文件迁移
        profiles = profiles.slice(0, MAX_PROFILES);
        await store.saveConfigProfiles(profiles.slice());
      } else if (res.exists || hostProfiles.length) {
        profiles = hostProfiles.concat(extraLocal).slice(0, MAX_PROFILES);
        if (extraLocal.length) await store.saveConfigProfiles(profiles.slice());
      } else {
        profiles = hostProfiles;
      }
      writeLocalProfiles();
    } catch (e) {
      // 保留 localStorage 作为回退，不阻塞使用
      if (!hostSaveWarned) {
        hostSaveWarned = true;
        setTimeout(function () {
          FP.toast('本机配置文件读取失败，已使用浏览器本地备份：' + (e.message || e), 'error', 6000);
        }, 0);
      }
    }
    updateStorageHint();
  }

  function persistProfiles() {
    const localOk = writeLocalProfiles();
    const store = desktopStore();
    if (store) {
      hostSaveChain = hostSaveChain.then(function () {
        return store.saveConfigProfiles(profiles.slice());
      }).then(function (res) {
        if (res && res.path) hostPath = String(res.path);
        updateStorageHint();
      }).catch(function (e) {
        if (!hostSaveWarned) {
          hostSaveWarned = true;
          FP.toast('本机配置文件写入失败（浏览器本地备份仍保留）：' + (e.message || e), 'error', 6000);
        }
      });
    }
    if (!localOk && !store) {
      FP.toast('配置保存失败：本机存储空间不足或不可用', 'error', 5000);
    }
    return localOk || !!store;
  }

  function normalizeStoredProfile(raw, forceNewId) {
    if (!raw || typeof raw !== 'object') throw new Error('配置文件内容不是对象');
    if (raw.type !== SCHEMA) throw new Error('不是 FigurePlay 配置文件（缺少 type=figureplay-config）');
    const ver = Number(raw.schemaVersion);
    if (!isFinite(ver) || ver < 1) throw new Error('配置文件版本无效');
    if (ver > SCHEMA_VERSION) throw new Error('配置文件版本较新（v' + ver + '），当前程序最高支持 v' + SCHEMA_VERSION + '，请升级 FigurePlay');
    if (!raw.layout && !raw.label && !raw.export) throw new Error('配置文件中没有可应用的内容');
    const name = cleanName(raw.name) || '未命名配置';
    return {
      id: (!forceNewId && raw.id && /^cfg-/.test(String(raw.id))) ? String(raw.id) : uid(),
      type: SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      name: name,
      description: cleanDesc(raw.description),
      appVersion: String(raw.appVersion || ''),
      createdAt: raw.createdAt || new Date().toISOString(),
      layout: raw.layout || null,
      label: raw.label || null,
      export: raw.export || null
    };
  }

  function payload(profile) {
    return {
      type: SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      name: profile.name,
      description: profile.description,
      appVersion: FP.APP_VERSION,
      createdAt: profile.createdAt,
      layout: profile.layout,
      label: profile.label,
      export: profile.export
    };
  }

  function profileSnapshot(profile) {
    if (!api()) throw new Error('应用尚未就绪');
    return api().normalizeConfigSnapshot({
      layout: profile.layout || undefined,
      label: profile.label || undefined,
      export: profile.export || undefined
    });
  }

  function summary(snapshot) {
    const l = snapshot.layout || {};
    const lb = snapshot.label || {};
    const ex = snapshot.export || {};
    const gap = '列距 ' + FP.fmt(Number(l.colGap) || 0, 1) + ' / 行距 ' + FP.fmt(Number(l.rowGap) || 0, 1) + ' mm';
    const merges = (l.merges && l.merges.length) ? ' · ' + l.merges.length + ' 个合并' : '';
    const pos = POS_NAMES[lb.position] || lb.position || '';
    const font = (lb.fontFamily === 'arial' ? 'Arial' : lb.fontFamily === 'times' ? 'Times' : (lb.fontFamily || '字体')) +
      ' ' + FP.fmt(Number(lb.fontSizePt) || 9, 0) + 'pt';
    const f = String(ex.format || 'pdf').toUpperCase();
    const trim = ex.trimPdf ? ' · 自动裁边' + FP.fmt(Math.max(1, Number(ex.trimMarginMm) || 0), 1) + 'mm' : '';
    const vec = (ex.vectorPdf !== false && f === 'PDF') ? ' · 矢量' : '';
    return l.rows + ' 行 × ' + l.cols + ' 列 · ' + FP.fmt(Number(l.widthMm) || 0, 1) + ' mm · ' + gap + merges +
      ' · 编号 ' + pos + ' / ' + font + ' · ' + f + ' ' + (Number(ex.dpi) || 300) + ' DPI' + trim + vec;
  }

  function setStatus(text, isError) {
    if (!el.saveStatus) return;
    el.saveStatus.textContent = text || '';
    el.saveStatus.style.color = isError ? 'var(--danger)' : 'var(--muted)';
  }

  function updateCount() {
    if (el.count) el.count.textContent = '本机 ' + profiles.length + ' 个';
  }

  function fillSaveSummary() {
    if (!el.saveSummary || !api()) return;
    try {
      const snap = api().getConfigSnapshot();
      el.saveSummary.textContent = '将保存：' + summary(snap);
    } catch (e) {
      el.saveSummary.textContent = '';
    }
  }

  function setActive(profile) {
    if (!el.active || !profile) return;
    el.active.hidden = false;
    el.activeName.textContent = profile.name;
    el.activeDesc.textContent = profile.description || '';
    el.active.title = profile.description || '';
  }

  function renderList() {
    if (!el.list) return;
    el.list.innerHTML = '';
    if (!profiles.length) {
      const empty = document.createElement('div');
      empty.className = 'config-empty';
      empty.textContent = '还没有保存的配置。先设置好网格、编号、字体和导出选项，再点上方“保存到本机”。';
      el.list.appendChild(empty);
      return;
    }
    profiles.forEach(function (p) {
      let snap;
      try { snap = profileSnapshot(p); } catch (e) { return; }
      const item = document.createElement('div');
      item.className = 'config-item';
      const head = document.createElement('div');
      head.className = 'config-item-head';
      const name = document.createElement('b');
      name.textContent = p.name;
      const date = document.createElement('span');
      date.textContent = fmtDate(p.createdAt);
      head.appendChild(name); head.appendChild(date);
      const desc = document.createElement('p');
      desc.className = 'config-item-desc';
      desc.textContent = p.description || '无说明';
      const sum = document.createElement('p');
      sum.className = 'config-item-summary';
      sum.textContent = summary(snap);
      const actions = document.createElement('div');
      actions.className = 'config-item-actions';
      const mk = function (label, action) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-sm' + (action === 'apply' ? ' btn-primary' : '');
        b.textContent = label;
        b.setAttribute('data-action', action);
        b.setAttribute('data-id', p.id);
        actions.appendChild(b);
      };
      mk('应用', 'apply');
      mk('导出 JSON', 'export');
      mk('删除', 'delete');
      item.appendChild(head); item.appendChild(desc); item.appendChild(sum); item.appendChild(actions);
      el.list.appendChild(item);
    });
  }

  function openDialog(focusSave) {
    if (!el.dialog) return;
    if (focusSave && el.name && !el.name.value.trim()) {
      el.name.value = '配置 ' + (profiles.length + 1);
    }
    if (el.restoreBackup) {
      const store = desktopStore();
      el.restoreBackup.hidden = !(store && typeof store.listConfigBackups === 'function' && typeof store.readConfigBackup === 'function');
    }
    fillSaveSummary();
    renderList();
    hideImportPreview();
    setStatus('');
    if (typeof el.dialog.showModal === 'function') el.dialog.showModal();
    else el.dialog.setAttribute('open', '');
    if (focusSave && el.name) {
      setTimeout(function () { el.name.focus(); el.name.select(); }, 30);
    }
  }

  function closeDialog() {
    if (!el.dialog) return;
    if (typeof el.dialog.close === 'function') el.dialog.close();
    else el.dialog.removeAttribute('open');
  }

  function applyProfile(profile, skipConfirm) {
    if (!api()) { FP.toast('应用尚未就绪，请稍后再试', 'error'); return false; }
    let snap;
    try { snap = profileSnapshot(profile); } catch (e) { FP.toast('配置无效：' + e.message, 'error', 5000); return false; }
    let current;
    try { current = api().getConfigSnapshot(); } catch (e) { current = null; }
    const info = api().getPreviewInfo();
    const merges = function (l) { return JSON.stringify((l && l.merges) || []); };
    const layoutChanged = !current || current.layout.rows !== snap.layout.rows ||
      current.layout.cols !== snap.layout.cols || merges(current.layout) !== merges(snap.layout);
    if (!skipConfirm && info && info.imageCount > 0 && layoutChanged) {
      if (!window.confirm('应用配置会按当前顺序把已有图片重排到 ' + snap.layout.rows + ' 行 × ' +
        snap.layout.cols + ' 列网格；配置本身不包含图片，可能移动或丢弃超出网格的图片。继续？')) {
        return false;
      }
    }
    let result;
    try { result = api().applyConfigSnapshot(profile); } catch (e) {
      FP.toast('应用配置失败：' + (e && e.message ? e.message : e), 'error', 5000);
      return false;
    }
    if (result && result.dropped) {
      FP.toast('配置已应用，但当前页有 ' + result.dropped + ' 张图片因网格缩小被移除', 'error', 5000);
    } else if (result && result.layoutChanged) {
      FP.toast('已应用配置「' + profile.name + '」，图片已按顺序重排', 'success', 3200);
    } else {
      FP.toast('已应用配置「' + profile.name + '」', 'success', 3200);
    }
    setActive(profile);
    closeDialog();
    return true;
  }

  async function exportProfile(profile) {
    const text = JSON.stringify(payload(profile), null, 2);
    const filename = safeFilename(profile.name);
    const blob = new Blob([text], { type: 'application/json' });
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'FigurePlay 配置', accept: { 'application/json': ['.json'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        FP.toast('已导出配置「' + profile.name + '」', 'success', 3000);
        return true;
      } catch (err) {
        if (err && err.name === 'AbortError') return false;
        // 不支持或权限失败时回退下载
      }
    }
    FP.downloadBlob(blob, filename);
    FP.toast('已导出配置「' + profile.name + '」', 'success', 3000);
    return true;
  }

  function saveCurrentProfile() {
    if (!api()) { setStatus('应用尚未就绪', true); return null; }
    const name = cleanName(el.name ? el.name.value : '');
    if (!name) {
      setStatus('请先填写配置名称', true);
      if (el.name) el.name.focus();
      return null;
    }
    let snap;
    try { snap = api().getConfigSnapshot(); } catch (e) {
      setStatus('读取当前配置失败：' + (e.message || e), true);
      return null;
    }
    const profile = {
      id: uid(), type: SCHEMA, schemaVersion: SCHEMA_VERSION,
      name: name,
      description: cleanDesc(el.desc ? el.desc.value : ''),
      appVersion: FP.APP_VERSION,
      createdAt: new Date().toISOString(),
      layout: snap.layout,
      label: snap.label,
      export: snap.export
    };
    profiles.unshift(profile);
    profiles = profiles.slice(0, MAX_PROFILES);
    if (!persistProfiles()) return null;
    updateCount(); renderList();
    setStatus('已保存「' + name + '」到本机', false);
    if (el.name) el.name.value = '';
    if (el.desc) el.desc.value = '';
    fillSaveSummary();
    FP.toast('已保存配置「' + name + '」到本机', 'success', 3000);
    return profile;
  }

  function deleteProfile(id) {
    const p = profiles.find(function (x) { return x.id === id; });
    if (!p) return;
    if (!window.confirm('删除本机配置「' + p.name + '」？此操作不可撤销。')) return;
    profiles = profiles.filter(function (x) { return x.id !== id; });
    persistProfiles(); updateCount(); renderList();
    FP.toast('已删除配置「' + p.name + '」', 'info', 2500);
  }

  function hideImportPreview() {
    importDraft = null;
    if (el.importPreview) el.importPreview.hidden = true;
  }

  function showImportPreview(profile, normalized) {
    importDraft = { profile: profile, snapshot: normalized };
    if (!el.importPreview) return;
    el.importName.textContent = profile.name;
    el.importMeta.textContent = profile.appVersion ? '来源版本 ' + profile.appVersion + ' · ' + fmtDate(profile.createdAt) : fmtDate(profile.createdAt);
    el.importDesc.textContent = profile.description || '（此配置没有说明）';
    el.importSummary.textContent = summary(normalized);
    el.importPreview.hidden = false;
  }

  function importJsonText(text) {
    let raw;
    try { raw = JSON.parse(text); } catch (e) { throw new Error('JSON 解析失败：' + e.message); }
    const profile = normalizeStoredProfile(raw, true);
    const normalized = profileSnapshot(profile);
    return { profile: profile, snapshot: normalized };
  }

  async function handleImportFile(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { FP.toast('配置文件过大（>2MB）', 'error', 5000); return; }
    try {
      const text = await file.text();
      const imported = importJsonText(text);
      showImportPreview(imported.profile, imported.snapshot);
      setStatus('已读取配置文件，请确认说明后应用或保存', false);
    } catch (e) {
      hideImportPreview();
      setStatus(e.message || '导入失败', true);
      FP.toast('导入失败：' + (e.message || e), 'error', 6000);
    }
  }

  function saveImported() {
    if (!importDraft) return;
    const p = importDraft.profile;
    profiles.unshift(p);
    profiles = profiles.slice(0, MAX_PROFILES);
    if (!persistProfiles()) return;
    updateCount(); renderList();
    setStatus('已导入并保存「' + p.name + '」到本机', false);
    hideImportPreview();
    FP.toast('已导入配置「' + p.name + '」', 'success', 3200);
  }

  function applyImported() {
    if (!importDraft) return;
    applyProfile(importDraft.profile, false);
  }

  async function restoreLatestBackup() {
    const store = desktopStore();
    if (!store || typeof store.listConfigBackups !== 'function' || typeof store.readConfigBackup !== 'function') {
      FP.toast('当前为浏览器模式，没有本机配置备份；请用 JSON 导入', 'error', 4000);
      return false;
    }
    try {
      const res = await store.listConfigBackups();
      if (!res || !res.ok) throw new Error((res && res.error) || '读取备份列表失败');
      const backups = (res.backups || []).slice().sort(function (a, b) {
        return String(b.modifiedAt || '').localeCompare(String(a.modifiedAt || '')) || String(b.name).localeCompare(String(a.name));
      });
      if (!backups.length) {
        FP.toast('还没有可恢复的本机配置备份', 'info', 3500);
        return false;
      }
      const latest = backups[0];
      const when = latest.modifiedAt ? fmtDate(latest.modifiedAt) : latest.name;
      if (!window.confirm('用本机备份「' + latest.name + '」（' + when + '）替换当前配置列表？\n当前列表会先自动保存为一份新备份。')) {
        return false;
      }
      const read = await store.readConfigBackup(latest.name);
      if (!read || !read.ok) throw new Error((read && read.error) || '读取备份失败');
      const restored = sanitizeList(read.profiles || []);
      if (!restored.length) throw new Error('备份中没有有效配置');
      profiles = restored;
      writeLocalProfiles();
      persistProfiles();
      updateCount();
      renderList();
      updateStorageHint();
      setStatus('已从备份恢复 ' + restored.length + ' 个配置（' + latest.name + '）', false);
      FP.toast('已恢复 ' + restored.length + ' 个配置；当前列表已另存为新备份', 'success', 4200);
      return true;
    } catch (e) {
      setStatus('恢复备份失败：' + (e.message || e), true);
      FP.toast('恢复备份失败：' + (e.message || e), 'error', 5500);
      return false;
    }
  }

  async function init() {
    if (ready) return;
    ready = true;
    el.count = byId('config-count');
    el.active = byId('config-active');
    el.activeName = byId('config-active-name');
    el.activeDesc = byId('config-active-desc');
    el.storageHint = byId('config-storage-hint');
    el.btnSave = byId('btn-config-save');
    el.btnManage = byId('btn-config-manage');
    el.dialog = byId('config-dialog');
    el.dialogClose = byId('config-dialog-close');
    el.name = byId('config-name');
    el.desc = byId('config-desc');
    el.saveSummary = byId('config-save-summary');
    el.saveStatus = byId('config-save-status');
    el.saveCurrent = byId('config-save-current');
    el.list = byId('config-list');
    el.importBtn = byId('config-import-btn');
    el.fileInput = byId('config-file-input');
    el.importPreview = byId('config-import-preview');
    el.importName = byId('config-import-name');
    el.importMeta = byId('config-import-meta');
    el.importDesc = byId('config-import-desc');
    el.importSummary = byId('config-import-summary');
    el.importApply = byId('config-import-apply');
    el.importSave = byId('config-import-save');
    el.importCancel = byId('config-import-cancel');
    el.restoreBackup = byId('config-restore-backup');

    await loadProfiles();
    updateCount();
    renderList();
    fillSaveSummary();

    if (el.btnSave) el.btnSave.addEventListener('click', function () { openDialog(true); });
    if (el.btnManage) el.btnManage.addEventListener('click', function () { openDialog(false); });
    if (el.dialogClose) el.dialogClose.addEventListener('click', closeDialog);
    if (el.saveCurrent) el.saveCurrent.addEventListener('click', saveCurrentProfile);
    if (el.importBtn && el.fileInput) {
      el.importBtn.addEventListener('click', function () { el.fileInput.click(); });
      el.fileInput.addEventListener('change', function () {
        const file = el.fileInput.files && el.fileInput.files[0];
        el.fileInput.value = '';
        handleImportFile(file);
      });
    }
    if (el.importApply) el.importApply.addEventListener('click', applyImported);
    if (el.importSave) el.importSave.addEventListener('click', saveImported);
    if (el.importCancel) el.importCancel.addEventListener('click', hideImportPreview);
    if (el.restoreBackup) {
      const store = desktopStore();
      el.restoreBackup.hidden = !(store && typeof store.listConfigBackups === 'function' && typeof store.readConfigBackup === 'function');
      el.restoreBackup.addEventListener('click', restoreLatestBackup);
    }
    if (el.list) {
      el.list.addEventListener('click', function (e) {
        const btn = e.target && e.target.closest ? e.target.closest('[data-action][data-id]') : null;
        if (!btn) return;
        const profile = profiles.find(function (p) { return p.id === btn.getAttribute('data-id'); });
        if (!profile) return;
        const action = btn.getAttribute('data-action');
        if (action === 'apply') applyProfile(profile, false);
        else if (action === 'export') exportProfile(profile);
        else if (action === 'delete') deleteProfile(profile.id);
      });
    }
    if (el.dialog) {
      el.dialog.addEventListener('click', function (e) {
        if (e.target === el.dialog) closeDialog();
      });
    }
  }

  function whenReady() {
    if (window.__FIGPLAY__ && window.FP && window.FP.toast) init();
    else setTimeout(whenReady, 100);
  }

  window.__CONFIG_PROFILES__ = {
    list: function () { return profiles.map(function (p) { return payload(p); }); },
    saveCurrent: saveCurrentProfile,
    apply: applyProfile,
    importJson: importJsonText,
    exportProfile: exportProfile,
    openDialog: openDialog,
    restoreLatestBackup: restoreLatestBackup,
    reload: async function () { await loadProfiles(); updateCount(); renderList(); },
    clear: function () { profiles = []; persistProfiles(); updateCount(); renderList(); }
  };

  whenReady();
})();
