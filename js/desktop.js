/* FigurePlay · 桌面版（WebView2）原生能力桥 */
(function () {
  'use strict';
  const FP = (window.FP = window.FP || {});
  const webview = (window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === 'function')
    ? window.chrome.webview : null;
  const available = !!webview;
  const pending = new Map();
  let seq = 0;
  let hostVersion = null;

  function notifyDesktopFlag() {
    if (!available) return;
    document.documentElement.classList.add('is-desktop');
    const badge = document.getElementById('desktop-badge');
    if (badge) badge.hidden = false;
  }

  function handleMessage(event) {
    let data = event.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (err) { return; }
    }
    if (!data || typeof data !== 'object') return;
    if (data.type === 'host-ready') {
      hostVersion = data.version || null;
      notifyDesktopFlag();
      document.dispatchEvent(new CustomEvent('figplay-host-ready', { detail: { version: hostVersion } }));
      return;
    }
    if ((data.type === 'vector-pdf-export' || data.type === 'vector-pdf-export-multi') && data.requestId) {
      const entry = pending.get(data.requestId);
      if (!entry) return;
      pending.delete(data.requestId);
      clearTimeout(entry.timer);
      if (data.ok && data.base64) {
        entry.resolve({
          pdfBase64: data.base64,
          bytes: Math.max(0, Number(data.bytes) || Math.round(String(data.base64).length * 0.75)),
          engine: data.engine || 'PowerPoint',
          vectorPanels: Number(data.vectorPanels) || 0,
          rasterPanels: Number(data.rasterPanels) || 0
        });
      } else {
        entry.reject(new Error(data.error || '矢量 PDF 生成失败'));
      }
      return;
    }
    if ((data.type === 'config-profiles' || data.type === 'config-profiles-saved' || data.type === 'config-backups' || data.type === 'config-backup') && data.requestId) {
      const entry = pending.get(data.requestId);
      if (!entry) return;
      pending.delete(data.requestId);
      clearTimeout(entry.timer);
      entry.resolve(data);
      return;
    }
    if ((data.type === 'clipboard-image' || data.type === 'fig-imported') && data.requestId) {
      const entry = pending.get(data.requestId);
      if (!entry) return;
      pending.delete(data.requestId);
      clearTimeout(entry.timer);
      if (data.ok && data.dataUrl) {
        const comma = String(data.dataUrl).indexOf(',');
        const b64 = comma >= 0 ? data.dataUrl.slice(comma + 1) : '';
        entry.resolve({
          dataUrl: data.dataUrl,
          width: Math.max(1, Number(data.width) || 0),
          height: Math.max(1, Number(data.height) || 0),
          sourceFormat: data.sourceFormat || (data.type === 'fig-imported' ? 'MATLAB-FIG' : 'Bitmap'),
          convertMs: Number(data.convertMs) || 0,
          matlabVersion: data.matlabVersion || null,
          emfBase64: data.emfBase64 || '',
          bytes: Math.round(b64.length * 0.75)
        });
      } else {
        entry.reject(new Error(data.error || (data.type === 'fig-imported'
          ? 'MATLAB .fig 转换失败' : '系统剪贴板中没有可用的图片')));
      }
    }
  }

  if (available) {
    try { webview.addEventListener('message', handleMessage); } catch (err) { /* ignore */ }
    notifyDesktopFlag();
    try {
      webview.postMessage(JSON.stringify({ type: 'app-ready', version: FP.APP_VERSION }));
    } catch (err) { /* ignore */ }
  }

  FP.desktop = {
    available: available,
    get hostVersion() { return hostVersion; },
    readClipboardImage: function () {
      if (!available) {
        return Promise.reject(new Error('当前为浏览器模式，无法读取系统剪贴板；请直接按 Ctrl+V，或使用桌面版'));
      }
      return new Promise(function (resolve, reject) {
        const requestId = 'fp-' + (++seq) + '-' + Date.now().toString(36);
        const timer = setTimeout(function () {
          pending.delete(requestId);
          reject(new Error('读取系统剪贴板超时，请重试'));
        }, 15000);
        pending.set(requestId, { resolve: resolve, reject: reject, timer: timer });
        try {
          webview.postMessage(JSON.stringify({ type: 'read-clipboard-image', requestId: requestId }));
        } catch (err) {
          pending.delete(requestId);
          clearTimeout(timer);
          reject(err);
        }
      });
    },
    /**
     * 读取 MATLAB .fig：把文件字节发送给桌面宿主，由宿主调用本机 MATLAB 转成 PNG。
     * @param {File} file
     */
    importFig: function (file) {
      if (!available) {
        return Promise.reject(new Error('读取 .fig 需要桌面版并安装 MATLAB；请在 MATLAB 中复制图窗后粘贴，或另存为图片'));
      }
      if (!file) return Promise.reject(new Error('没有选择 .fig 文件'));
      if (file.size > 60 * 1024 * 1024) {
        return Promise.reject(new Error('.fig 文件过大（超过 60 MB），请先在 MATLAB 中精简或另存图片'));
      }
      return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onerror = function () { reject(new Error('无法读取 .fig 文件')); };
        reader.onload = function () {
          const dataUrl = String(reader.result || '');
          const comma = dataUrl.indexOf(',');
          const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : '';
          if (!base64) { reject(new Error('无法读取 .fig 文件内容')); return; }
          const requestId = 'fig-' + (++seq) + '-' + Date.now().toString(36);
          const timer = setTimeout(function () {
            pending.delete(requestId);
            reject(new Error('MATLAB 转换 .fig 超时（首次启动 MATLAB 可能较慢，请重试）'));
          }, 180000);
          pending.set(requestId, { resolve: resolve, reject: reject, timer: timer });
          try {
            webview.postMessage(JSON.stringify({
              type: 'import-fig',
              requestId: requestId,
              filename: file.name || 'figure.fig',
              base64: base64
            }));
          } catch (err) {
            pending.delete(requestId);
            clearTimeout(timer);
            reject(err);
          }
        };
        reader.readAsDataURL(file);
      });
    },
    /**
     * 由桌面宿主用 PowerPoint COM 将当前页排版为矢量 PDF。
     * @param {object} spec
     * @returns {Promise<{pdfBase64:string,bytes:number,engine:string,vectorPanels:number,rasterPanels:number}>}
     */
    exportVectorPdfMulti: function (pages) {
      if (!available) {
        return Promise.reject(new Error('全页矢量 PDF 需要桌面版 FigurePlay'));
      }
      if (!Array.isArray(pages) || pages.length < 1) {
        return Promise.reject(new Error('没有可导出的图页'));
      }
      return new Promise(function (resolve, reject) {
        const requestId = 'vecmulti-' + (++seq) + '-' + Date.now().toString(36);
        const timer = setTimeout(function () {
          pending.delete(requestId);
          reject(new Error('全页矢量 PDF 生成超时'));
        }, 180000);
        pending.set(requestId, { resolve: resolve, reject: reject, timer: timer });
        try {
          webview.postMessage(JSON.stringify({ type: 'export-vector-pdf-multi', requestId: requestId, pages: pages }));
        } catch (err) {
          pending.delete(requestId);
          clearTimeout(timer);
          reject(err);
        }
      });
    },
    exportVectorPdf: function (spec) {
      if (!available) {
        return Promise.reject(new Error('矢量 PDF 需要桌面版 FigurePlay'));
      }
      return new Promise(function (resolve, reject) {
        const requestId = 'vec-' + (++seq) + '-' + Date.now().toString(36);
        const timer = setTimeout(function () {
          pending.delete(requestId);
          reject(new Error('矢量 PDF 生成超时'));
        }, 120000);
        pending.set(requestId, { resolve: resolve, reject: reject, timer: timer });
        try {
          webview.postMessage(JSON.stringify({ type: 'export-vector-pdf', requestId: requestId, spec: spec }));
        } catch (err) {
          pending.delete(requestId);
          clearTimeout(timer);
          reject(err);
        }
      });
    },
    /**
     * 从桌面宿主读取持久化配置模板（%APPDATA%\FigurePlay\configs）。
     * @returns {Promise<{ok:boolean,profiles:Array,path:string,exists:boolean}>}
     */
    loadConfigProfiles: function () {
      if (!available) return Promise.reject(new Error('当前为浏览器模式，配置保存在浏览器本地'));
      return new Promise(function (resolve, reject) {
        const requestId = 'cfgload-' + (++seq) + '-' + Date.now().toString(36);
        const timer = setTimeout(function () {
          pending.delete(requestId);
          reject(new Error('读取本机配置文件超时'));
        }, 12000);
        pending.set(requestId, { resolve: resolve, reject: reject, timer: timer });
        try {
          webview.postMessage(JSON.stringify({ type: 'load-config-profiles', requestId: requestId }));
        } catch (err) {
          pending.delete(requestId);
          clearTimeout(timer);
          reject(err);
        }
      });
    },
    /**
     * 把配置模板写回桌面宿主的持久化目录（带时间戳备份）。
     * @param {Array} profiles
     */
    saveConfigProfiles: function (profiles) {
      if (!available) return Promise.reject(new Error('当前为浏览器模式，配置保存在浏览器本地'));
      return new Promise(function (resolve, reject) {
        const requestId = 'cfgsave-' + (++seq) + '-' + Date.now().toString(36);
        const timer = setTimeout(function () {
          pending.delete(requestId);
          reject(new Error('写入本机配置文件超时'));
        }, 15000);
        pending.set(requestId, { resolve: resolve, reject: reject, timer: timer });
        try {
          webview.postMessage(JSON.stringify({
            type: 'save-config-profiles', requestId: requestId,
            profiles: Array.isArray(profiles) ? profiles : []
          }));
        } catch (err) {
          pending.delete(requestId);
          clearTimeout(timer);
          reject(err);
        }
      });
    },
    /** 列出宿主配置模板备份文件。 */
    listConfigBackups: function () {
      if (!available) return Promise.reject(new Error('当前为浏览器模式，没有本机配置备份'));
      return new Promise(function (resolve, reject) {
        const requestId = 'cfglist-' + (++seq) + '-' + Date.now().toString(36);
        const timer = setTimeout(function () {
          pending.delete(requestId);
          reject(new Error('读取配置备份列表超时'));
        }, 12000);
        pending.set(requestId, { resolve: resolve, reject: reject, timer: timer });
        try {
          webview.postMessage(JSON.stringify({ type: 'list-config-backups', requestId: requestId }));
        } catch (err) {
          pending.delete(requestId);
          clearTimeout(timer);
          reject(err);
        }
      });
    },
    /** 读取一个宿主配置模板备份。 */
    readConfigBackup: function (name) {
      if (!available) return Promise.reject(new Error('当前为浏览器模式，没有本机配置备份'));
      return new Promise(function (resolve, reject) {
        const requestId = 'cfgread-' + (++seq) + '-' + Date.now().toString(36);
        const timer = setTimeout(function () {
          pending.delete(requestId);
          reject(new Error('读取配置备份超时'));
        }, 12000);
        pending.set(requestId, { resolve: resolve, reject: reject, timer: timer });
        try {
          webview.postMessage(JSON.stringify({ type: 'read-config-backup', requestId: requestId, name: name }));
        } catch (err) {
          pending.delete(requestId);
          clearTimeout(timer);
          reject(err);
        }
      });
    }
  };
})();
