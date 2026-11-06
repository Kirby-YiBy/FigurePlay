/* FigurePlay · 通用工具函数 */
(function () {
  'use strict';
  const FP = (window.FP = window.FP || {});

  /* ---------------- 常量 ---------------- */
  FP.MM_PER_INCH = 25.4;
  FP.CSS_PX_PER_MM = 96 / 25.4;
  FP.PT_PER_INCH = 72;
  FP.APP_VERSION = '1.3.3';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';
  FP.SVG_NS = SVG_NS;
  FP.XLINK_NS = XLINK_NS;

  /* ---------------- DOM ---------------- */
  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.from((root || document).querySelectorAll(selector)); }
  FP.$ = $;
  FP.$$ = $$;

  FP.svgEl = function (tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) FP.setAttrs(el, attrs);
    return el;
  };

  FP.setAttrs = function (el, attrs) {
    for (const key in attrs) {
      const value = attrs[key];
      if (value === null || value === undefined || value === false) continue;
      el.setAttribute(key, String(value));
    }
    return el;
  };

  FP.setSvgImageHref = function (imageEl, href) {
    imageEl.setAttribute('href', href);
    imageEl.setAttributeNS(XLINK_NS, 'xlink:href', href);
  };

  /* ---------------- 数值 ---------------- */
  function clamp(value, min, max) {
    value = Number(value);
    if (!isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
  }
  function round(value, digits) {
    const m = Math.pow(10, digits === undefined ? 2 : digits);
    return Math.round((Number(value) + Number.EPSILON) * m) / m;
  }
  function toInt(value, fallback) {
    const n = Math.round(Number(value));
    return isFinite(n) ? n : fallback;
  }
  function fmt(value, digits) {
    const d = digits === undefined ? 1 : digits;
    if (!isFinite(Number(value))) return '—';
    return String(round(value, d));
  }
  FP.clamp = clamp;
  FP.round = round;
  FP.toInt = toInt;
  FP.fmt = fmt;
  FP.fmtMm = function (value, digits) { return fmt(value, digits === undefined ? 1 : digits) + ' mm'; };

  FP.debounce = function (fn, wait) {
    let timer = null;
    return function () {
      const args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { timer = null; fn.apply(self, args); }, wait);
    };
  };

  FP.rafThrottle = function (fn) {
    let scheduled = false;
    return function () {
      const args = arguments, self = this;
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        fn.apply(self, args);
      });
    };
  };

  /* ---------------- 文件名 / 下载 ---------------- */
  FP.safeFilename = function (name, fallback) {
    let s = String(name == null ? '' : name).trim();
    s = s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-');
    s = s.replace(/^\.+/, '').replace(/[. ]+$/g, '');
    if (!s) s = fallback || 'figure';
    if (s.length > 120) s = s.slice(0, 120);
    return s;
  };

  FP.downloadBlob = function (blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 8000);
  };

  FP.canvasToBlob = function (canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      try {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('浏览器无法生成该格式的图片'));
        }, type, quality);
      } catch (err) { reject(err); }
    });
  };

  FP.formatBytes = function (bytes) {
    if (!isFinite(bytes) || bytes <= 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  /* ---------------- 提示条 ---------------- */
  let toastTimer = null;
  FP.toast = function (message, type, duration) {
    const el = document.getElementById('toast');
    if (!el) { console.log('[FigurePlay]', message); return; }
    el.textContent = message;
    el.className = 'toast show' + (type === 'error' ? ' is-error' : type === 'success' ? ' is-success' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, duration || (type === 'error' ? 4200 : 2600));
  };

  /* ---------------- 图片读取 ---------------- */
  const imageCache = new Map();

  FP.getImage = function (src) {
    if (imageCache.has(src)) return Promise.resolve(imageCache.get(src));
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = function () { reject(new Error('图片加载失败')); };
      img.src = src;
    });
  };

  FP.preloadImage = function (src) {
    return FP.getImage(src).catch(function () { return null; });
  };

  FP.clearImageCache = function (src) {
    if (src) imageCache.delete(src);
    else imageCache.clear();
  };

  FP.readFileAsDataURL = function (file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('文件读取失败：' + (file && file.name ? file.name : ''))); };
      reader.readAsDataURL(file);
    });
  };

  const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|svg|tiff?|avif|ico)$/i;

  FP.isImageFile = function (file) {
    if (!file) return false;
    if (file.type && /^image\//i.test(file.type)) return true;
    return IMAGE_EXT_RE.test(file.name || '');
  };

  FP.isFigFile = function (file) {
    if (!file) return false;
    return /\.fig$/i.test(file.name || '') ||
      /fig/i.test(file.type || '') ||
      /matlab/i.test(file.type || '');
  };

  FP.isSupportedFile = function (file) {
    return FP.isImageFile(file) || FP.isFigFile(file);
  };

  /** 把桌面版 .fig 导入结果转换为内部 cell 对象 */
  FP.figCellFromResult = function (name, result, bytes) {
    const base = String(name || 'figure.fig').replace(/\.fig$/i, '');
    return {
      name: base + '.png',
      type: 'image/png',
      dataUrl: result.dataUrl,
      width: Math.max(1, result.width || 1),
      height: Math.max(1, result.height || 1),
      bytes: bytes || result.bytes || 0,
      fit: 'inherit',
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      customLabel: '',
      convertedFromFig: true,
      matlabVersion: result.matlabVersion || null,
      emfBase64: result.emfBase64 || '',
      sourceFormat: result.sourceFormat || 'MATLAB-FIG'
    };
  };

  function guessMime(file) {
    const name = (file.name || '').toLowerCase();
    if (/\.png$/.test(name)) return 'image/png';
    if (/\.jpe?g$/.test(name)) return 'image/jpeg';
    if (/\.webp$/.test(name)) return 'image/webp';
    if (/\.gif$/.test(name)) return 'image/gif';
    if (/\.bmp$/.test(name)) return 'image/bmp';
    if (/\.svg$/.test(name)) return 'image/svg+xml';
    if (/\.avif$/.test(name)) return 'image/avif';
    if (/\.tiff?$/.test(name)) return 'image/tiff';
    return file.type || 'image/png';
  }
  FP.guessImageMime = guessMime;

  function parseSvgLength(value) {
    if (!value) return 0;
    const m = /^\s*([\d.]+)\s*(px|mm|cm|in|pt|pc)?\s*$/i.exec(String(value));
    if (!m) return 0;
    const v = parseFloat(m[1]);
    if (!isFinite(v)) return 0;
    const unit = (m[2] || 'px').toLowerCase();
    const k = { px: 1, pt: 96 / 72, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96 }[unit] || 1;
    return v * k;
  }

  async function decodeSvg(file) {
    const text = await file.text();
    let width = 0, height = 0;
    try {
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      const root = doc.documentElement;
      if (root && root.tagName.toLowerCase() === 'svg') {
        width = parseSvgLength(root.getAttribute('width'));
        height = parseSvgLength(root.getAttribute('height'));
        if (!width || !height) {
          const vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
          if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
            width = width || vb[2];
            height = height || vb[3];
          }
        }
      }
    } catch (err) { /* 交给 <img> 兜底 */ }
    const blob = new Blob([text], { type: 'image/svg+xml' });
    const dataUrl = await FP.readFileAsDataURL(blob);
    const img = await FP.getImage(dataUrl).catch(function () { return null; });
    if (img && img.naturalWidth) {
      width = width || img.naturalWidth;
      height = height || img.naturalHeight;
    }
    if (!width || !height) { width = 300; height = 200; }
    return { width: Math.round(width), height: Math.round(height), dataUrl: dataUrl, type: 'image/svg+xml' };
  }

  async function decodeTiff(file) {
    const UTIF = window.UTIF;
    if (!UTIF) throw new Error('TIFF 解码组件未加载，请把图片转换为 PNG/JPG 后重试');
    const buffer = await file.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    if (!ifds || !ifds.length) throw new Error('无法解析 TIFF 文件：' + file.name);
    let best = null, bestArea = 0;
    const limit = Math.min(ifds.length, 12);
    for (let i = 0; i < limit; i++) {
      try {
        UTIF.decodeImage(buffer, ifds[i]);
        const w = ifds[i].width || 0, h = ifds[i].height || 0;
        if (w > 0 && h > 0 && w * h >= bestArea) { best = ifds[i]; bestArea = w * h; }
      } catch (err) { /* 跳过损坏的 IFD */ }
    }
    if (!best) throw new Error('无法解析 TIFF 图像数据：' + file.name);
    const rgba = UTIF.toRGBA8(best);
    const canvas = document.createElement('canvas');
    canvas.width = best.width;
    canvas.height = best.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(best.width, best.height);
    imageData.data.set(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength));
    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    return { width: canvas.width, height: canvas.height, dataUrl: dataUrl, type: 'image/png', convertedFromTiff: true };
  }

  function baseCell(name, type, dataUrl, width, height, bytes) {
    return {
      name: name || 'image',
      type: type || 'image/png',
      dataUrl: dataUrl,
      width: Math.max(1, Math.round(width || 1)),
      height: Math.max(1, Math.round(height || 1)),
      bytes: bytes || 0,
      fit: 'inherit',
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      customLabel: ''
    };
  }

  FP.decodeImageFile = async function (file) {
    if (!file) throw new Error('没有选择文件');
    const name = file.name || 'image';
    const lower = name.toLowerCase();
    const type = file.type || guessMime(file);
    let meta;
    if (/\.tiff?$/.test(lower) || /tiff/i.test(type)) {
      meta = await decodeTiff(file);
    } else if (/\.svg$/.test(lower) || type === 'image/svg+xml') {
      meta = await decodeSvg(file);
    } else {
      const dataUrl = await FP.readFileAsDataURL(file);
      const img = await FP.getImage(dataUrl);
      meta = { width: img.naturalWidth, height: img.naturalHeight, dataUrl: dataUrl, type: type };
    }
    if (!meta.width || !meta.height) throw new Error('无法识别图片尺寸：' + name);
    const cell = baseCell(name, meta.type, meta.dataUrl, meta.width, meta.height, file.size);
    if (meta.convertedFromTiff) cell.convertedFromTiff = true;
    return cell;
  };

  FP.imageFileIcon = function (file) {
    const name = (file.name || '').toLowerCase();
    if (/\.svg$/.test(name)) return 'SVG';
    if (/\.tiff?$/.test(name) || /tiff/i.test(file.type || '')) return 'TIF';
    return 'IMG';
  };

  /* ---------------- 编号方案 ---------------- */
  function alphaLabel(n, upper) {
    n = Math.max(1, Math.floor(n));
    let s = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      s = String.fromCharCode(97 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return upper ? s.toUpperCase() : s;
  }

  const ROMAN = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  function toRoman(n) {
    n = Math.floor(n);
    if (n <= 0) return String(n);
    if (n > 3999) return String(n);
    let out = '';
    for (let i = 0; i < ROMAN.length; i++) {
      while (n >= ROMAN[i][0]) { out += ROMAN[i][1]; n -= ROMAN[i][0]; }
    }
    return out;
  }
  FP.toRoman = toRoman;
  FP.alphaLabel = alphaLabel;

  const WRAPS = {
    paren: ['(', ')'],
    rparen: ['', ')'],
    dot: ['', '.'],
    bare: ['', '']
  };

  FP.LABEL_SCHEMES = [
    { id: 'alpha-paren', kind: 'alpha', wrap: 'paren', name: '(a)  小写字母（括号）' },
    { id: 'alpha-rparen', kind: 'alpha', wrap: 'rparen', name: 'a)  小写字母（右括号）' },
    { id: 'alpha-dot', kind: 'alpha', wrap: 'dot', name: 'a.  小写字母（点）' },
    { id: 'alpha-bare', kind: 'alpha', wrap: 'bare', name: 'a  小写字母（无符号）' },
    { id: 'Alpha-paren', kind: 'Alpha', wrap: 'paren', name: '(A)  大写字母（括号）' },
    { id: 'Alpha-rparen', kind: 'Alpha', wrap: 'rparen', name: 'A)  大写字母（右括号）' },
    { id: 'roman-paren', kind: 'roman', wrap: 'paren', name: '(i)  罗马数字小写（括号）' },
    { id: 'roman-rparen', kind: 'roman', wrap: 'rparen', name: 'i)  罗马数字小写（右括号）' },
    { id: 'Roman-paren', kind: 'Roman', wrap: 'paren', name: '(I)  罗马数字大写（括号）' },
    { id: 'Roman-rparen', kind: 'Roman', wrap: 'rparen', name: 'I)  罗马数字大写（右括号）' },
    { id: 'number-paren', kind: 'number', wrap: 'paren', name: '(1)  阿拉伯数字（括号）' },
    { id: 'number-rparen', kind: 'number', wrap: 'rparen', name: '1)  阿拉伯数字（右括号）' },
    { id: 'number-dot', kind: 'number', wrap: 'dot', name: '1.  阿拉伯数字（点）' },
    { id: 'number-bare', kind: 'number', wrap: 'bare', name: '1  阿拉伯数字（无符号）' }
  ];

  function schemeById(id) {
    for (let i = 0; i < FP.LABEL_SCHEMES.length; i++) {
      if (FP.LABEL_SCHEMES[i].id === id) return FP.LABEL_SCHEMES[i];
    }
    return FP.LABEL_SCHEMES[0];
  }
  FP.schemeById = schemeById;

  function coreLabel(kind, n) {
    switch (kind) {
      case 'alpha': return alphaLabel(n, false);
      case 'Alpha': return alphaLabel(n, true);
      case 'roman': return toRoman(n).toLowerCase();
      case 'Roman': return toRoman(n);
      default: return String(n);
    }
  }

  FP.formatLabel = function (schemeId, n) {
    const scheme = schemeById(schemeId);
    const wrap = WRAPS[scheme.wrap] || WRAPS.paren;
    return wrap[0] + coreLabel(scheme.kind, Math.max(1, Math.floor(n))) + wrap[1];
  };

  FP.schemePreviewText = function (schemeId, start, count) {
    const s = Math.max(1, Math.floor(start || 1));
    const n = count || 3;
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(FP.formatLabel(schemeId, s + i));
    return parts.join('  ');
  };

  /* ---------------- 字体与文本测量 ---------------- */
  FP.FONT_STACKS = {
    times: '"Times New Roman", Times, "Liberation Serif", serif',
    arial: 'Arial, Helvetica, "Liberation Sans", sans-serif',
    georgia: 'Georgia, "Times New Roman", serif',
    calibri: 'Calibri, "Segoe UI", Arial, sans-serif',
    helvetica: 'Helvetica, Arial, sans-serif'
  };

  let measureCtx = null;
  function getMeasureCtx() {
    if (!measureCtx) {
      const canvas = document.createElement('canvas');
      canvas.width = 8;
      canvas.height = 8;
      measureCtx = canvas.getContext('2d');
    }
    return measureCtx;
  }

  /**
   * 返回相对字号（em）的文本尺寸：
   * { width, ascent, descent }，其中 ascent/descent 为字形实际上下高度。
   */
  FP.textMetrics = function (text, fontKey, bold, italic) {
    const stack = FP.FONT_STACKS[fontKey] || FP.FONT_STACKS.times;
    const ctx = getMeasureCtx();
    const size = 100;
    ctx.font = (italic ? 'italic ' : '') + (bold ? '700 ' : '') + size + 'px ' + stack;
    const m = ctx.measureText(text && text.length ? text : 'Mg');
    let ascent = m.actualBoundingBoxAscent;
    let descent = m.actualBoundingBoxDescent;
    if (!isFinite(ascent)) ascent = size * 0.72;
    if (!isFinite(descent)) descent = size * 0.20;
    return { width: m.width / size, ascent: ascent / size, descent: descent / size };
  };

  /* ---------------- 其它 ---------------- */
  FP.escapeXml = function (str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  FP.nextFrame = function () {
    return new Promise(function (resolve) { requestAnimationFrame(function () { resolve(); }); });
  };

  FP.sleep = function (ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  };

  FP.uid = function (prefix) {
    return (prefix || 'fp') + '-' + Math.random().toString(36).slice(2, 9);
  };

  FP.deepClone = function (obj) {
    return JSON.parse(JSON.stringify(obj));
  };

  FP.isTextInput = function (el) {
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  };
})();
