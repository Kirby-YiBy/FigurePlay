/* FigurePlay · 本地自动保存（IndexedDB，失败时回退 localStorage） */
(function () {
  'use strict';
  const FP = (window.FP = window.FP || {});
  const DB_NAME = 'figureplay';
  const DB_VERSION = 1;
  const STORE = 'session';
  const KEY = 'figureplay:session';
  const LS_KEY = 'figureplay.session.v1';
  const LS_LIMIT = 4 * 1024 * 1024; // 字符数上限，避免 localStorage 超限

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      let settled = false;
      const timer = setTimeout(function () { fail(new Error('IndexedDB 打开超时')); }, 2500);
      function fail(err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        dbPromise = null;
        reject(err);
      }
      try {
        if (!('indexedDB' in window) || !window.indexedDB) throw new Error('浏览器不支持 IndexedDB');
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function () {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = function () {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(req.result);
        };
        req.onerror = function () { fail(req.error || new Error('IndexedDB 打开失败')); };
        req.onblocked = function () { fail(new Error('IndexedDB 被阻塞')); };
      } catch (err) { fail(err); }
    });
    return dbPromise;
  }

  function idbRequest(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let result;
        try { result = fn(store); } catch (err) { reject(err); return; }
        tx.oncomplete = function () { resolve(result && result.result !== undefined ? result.result : result); };
        tx.onerror = function () { reject(tx.error || new Error('IndexedDB 事务失败')); };
        tx.onabort = function () { reject(tx.error || new Error('IndexedDB 事务中止')); };
      });
    });
  }

  function localGet() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) { return null; }
  }

  function localSet(snapshot) {
    try {
      const raw = JSON.stringify(snapshot);
      if (raw.length > LS_LIMIT) return false;
      localStorage.setItem(LS_KEY, raw);
      return true;
    } catch (err) { return false; }
  }

  FP.storage = {
    supported: !!(window.indexedDB || window.localStorage),

    async save(snapshot) {
      const payload = { savedAt: Date.now(), version: snapshot.version || 1, state: snapshot };
      try {
        await idbRequest('readwrite', function (store) { store.put(payload, KEY); });
        return { ok: true, backend: 'indexeddb' };
      } catch (err) {
        const ok = localSet(payload);
        return { ok: ok, backend: ok ? 'localstorage' : 'none' };
      }
    },

    async load() {
      try {
        const payload = await idbRequest('readonly', function (store) { return store.get(KEY); });
        if (payload && payload.state) return payload.state;
      } catch (err) { /* 回退 localStorage */ }
      const local = localGet();
      if (local && local.state) return local.state;
      return null;
    },

    async clear() {
      try { await idbRequest('readwrite', function (store) { store.clear(); }); } catch (err) { /* ignore */ }
      try { localStorage.removeItem(LS_KEY); } catch (err) { /* ignore */ }
    }
  };
})();
