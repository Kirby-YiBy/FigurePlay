/* FigurePlay · 导出编排（PNG / JPG / SVG / PDF） */
(function () {
  'use strict';
  const FP = (window.FP = window.FP || {});

  const FORMATS = {
    png: { ext: 'png', mime: 'image/png', label: 'PNG', supportsTransparent: true, raster: true },
    jpg: { ext: 'jpg', mime: 'image/jpeg', label: 'JPG', supportsTransparent: false, raster: true },
    svg: { ext: 'svg', mime: 'image/svg+xml', label: 'SVG', supportsTransparent: true, raster: false },
    pdf: { ext: 'pdf', mime: 'application/pdf', label: 'PDF', supportsTransparent: false, raster: true }
  };
  FP.FORMATS = FORMATS;

  FP.normalizeFormat = function (format) {
    return FORMATS[format] ? format : 'png';
  };

  FP.blobToBase64 = function (blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        const result = String(reader.result || '');
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = function () { reject(new Error('无法读取导出数据')); };
      reader.readAsDataURL(blob);
    });
  };

  /**
   * 生成导出文件（不触发下载）。
   */
  FP.buildExport = async function (state, geom, opts) {
    opts = opts || {};
    const format = FP.normalizeFormat(opts.format || state.export.format);
    const info = FORMATS[format];
    const dpi = FP.clamp(opts.dpi !== undefined ? opts.dpi : state.export.dpi, 36, 1200);
    const quality = FP.clamp(opts.quality !== undefined ? opts.quality : state.export.jpgQuality, 0.5, 1);
    const transparent = info.supportsTransparent &&
      (opts.transparent !== undefined ? !!opts.transparent : !!state.export.transparent);
    const baseName = FP.safeFilename(opts.filename !== undefined ? opts.filename : state.export.filename, 'figure');
    const result = {
      format: format,
      filename: baseName + '.' + info.ext,
      mime: info.mime,
      dpi: dpi,
      transparent: transparent,
      widthPx: null,
      heightPx: null,
      widthMm: geom.widthMm,
      heightMm: geom.heightMm
    };

    if (format === 'svg') {
      const svgState = Object.assign({}, state, {
        export: Object.assign({}, state.export, { transparent: transparent, format: 'svg' })
      });
      const svg = FP.buildExportSvg(svgState, geom);
      const xml = FP.serializeSvg(svg);
      result.blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      result.widthPx = Math.round(geom.widthMm * 96 / 25.4);
      result.heightPx = Math.round(geom.heightMm * 96 / 25.4);
    } else if (format === 'png') {
      const canvas = await FP.renderCanvas(state, geom, dpi, {
        transparent: transparent,
        background: transparent ? null : (FP.figureBackgroundColor(state) || '#ffffff')
      });
      result.blob = await FP.canvasToBlob(canvas, 'image/png');
      result.widthPx = canvas.width;
      result.heightPx = canvas.height;
    } else if (format === 'jpg') {
      const canvas = await FP.renderCanvas(state, geom, dpi, {
        transparent: false,
        background: FP.figureBackgroundColor(state) || '#ffffff'
      });
      result.blob = await FP.canvasToBlob(canvas, 'image/jpeg', quality);
      result.widthPx = canvas.width;
      result.heightPx = canvas.height;
    } else {
      // PDF：按毫米尺寸生成单页，内嵌高分辨率 JPEG 位图；可选裁剪白边
      const canvas = await FP.renderCanvas(state, geom, dpi, {
        transparent: false,
        background: FP.figureBackgroundColor(state) || '#ffffff'
      });
      let outCanvas = canvas;
      let pageGeom = geom;
      const crop = opts.cropMm;
      if (crop && crop.wMm > 0 && crop.hMm > 0) {
        const pxPerMm = dpi / 25.4;
        const sx = Math.max(0, Math.round(crop.xMm * pxPerMm));
        const sy = Math.max(0, Math.round(crop.yMm * pxPerMm));
        const sw = Math.max(1, Math.min(canvas.width - sx, Math.round(crop.wMm * pxPerMm)));
        const sh = Math.max(1, Math.min(canvas.height - sy, Math.round(crop.hMm * pxPerMm)));
        outCanvas = document.createElement('canvas');
        outCanvas.width = sw;
        outCanvas.height = sh;
        const ctx = outCanvas.getContext('2d');
        ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
        pageGeom = { widthMm: crop.wMm, heightMm: crop.hMm };
      }
      const jpegBlob = await FP.canvasToBlob(outCanvas, 'image/jpeg', Math.max(0.8, quality));
      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
      const pdfBytes = FP.buildPdfFromJpeg(jpegBytes, pageGeom, { title: baseName });
      result.blob = new Blob([pdfBytes], { type: 'application/pdf' });
      result.widthPx = outCanvas.width;
      result.heightPx = outCanvas.height;
      result.widthMm = pageGeom.widthMm;
      result.heightMm = pageGeom.heightMm;
      if (crop) result.cropped = true;
      const pt = FP.pdfPointSize(pageGeom);
      result.pdfWidthPt = pt.width;
      result.pdfHeightPt = pt.height;
    }

    result.bytes = result.blob.size;
    return result;
  };

  /**
   * 多页导出：PDF 生成多页 PDF；PNG/JPG/SVG 打成 ZIP。
   * @param {Array<{name?:string,layout:object,cells:Array,label:object,groups?:Array}>} pageStates
   * @param {object} opts { format, dpi, quality, transparent, filename, onProgress }
   */
  FP.buildAllPagesExport = async function (pageStates, opts) {
    opts = opts || {};
    const format = FP.normalizeFormat(opts.format);
    const info = FORMATS[format];
    const dpi = FP.clamp(opts.dpi !== undefined ? opts.dpi : 300, 36, 1200);
    const quality = FP.clamp(opts.quality !== undefined ? opts.quality : 0.95, 0.5, 1);
    const transparent = info.supportsTransparent && !!opts.transparent;
    const baseName = FP.safeFilename(opts.filename, 'figure');
    const total = pageStates.length;
    if (!total) throw new Error('没有可导出的页面');
    const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
    const pageResults = [];
    const loop = async function (fn) {
      for (let i = 0; i < pageStates.length; i++) {
        if (onProgress) onProgress(i, total, pageStates[i]);
        await fn(pageStates[i], i);
      }
    };

    if (format === 'pdf') {
      const pdfPages = [];
      const crops = Array.isArray(opts.crops) ? opts.crops : [];
      await loop(async function (page, i) {
        const geom = FP.computeGeometry(page.layout);
        const pageState = Object.assign({}, page, {
          export: Object.assign({}, page.export || {}, {
            format: 'pdf', dpi: dpi, jpgQuality: quality, transparent: false,
            filename: baseName + '-p' + String(i + 1).padStart(2, '0')
          })
        });
        const canvas = await FP.renderCanvas(pageState, geom, dpi, {
          transparent: false,
          background: FP.figureBackgroundColor(pageState) || '#ffffff'
        });
        let outCanvas = canvas;
        let pageGeom = geom;
        const crop = crops[i];
        if (crop && crop.wMm > 0 && crop.hMm > 0) {
          const pxPerMm = dpi / 25.4;
          const sx = Math.max(0, Math.round(crop.xMm * pxPerMm));
          const sy = Math.max(0, Math.round(crop.yMm * pxPerMm));
          const sw = Math.max(1, Math.min(canvas.width - sx, Math.round(crop.wMm * pxPerMm)));
          const sh = Math.max(1, Math.min(canvas.height - sy, Math.round(crop.hMm * pxPerMm)));
          outCanvas = document.createElement('canvas');
          outCanvas.width = sw;
          outCanvas.height = sh;
          outCanvas.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
          pageGeom = { widthMm: crop.wMm, heightMm: crop.hMm };
        }
        const jpegBlob = await FP.canvasToBlob(outCanvas, 'image/jpeg', Math.max(0.8, quality));
        const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
        pdfPages.push({ jpegBytes: jpegBytes, widthMm: pageGeom.widthMm, heightMm: pageGeom.heightMm });
        pageResults.push({
          index: i, widthPx: outCanvas.width, heightPx: outCanvas.height,
          widthMm: pageGeom.widthMm, heightMm: pageGeom.heightMm,
          cropped: !!crop
        });
      });
      const pdfBytes = FP.buildPdfFromImages(pdfPages, { title: baseName });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      return {
        format: format,
        filename: baseName + '.pdf',
        mime: 'application/pdf',
        pageCount: total,
        pageResults: pageResults,
        blob: blob,
        bytes: blob.size
      };
    }

    const files = [];
    await loop(async function (page, i) {
      const geom = FP.computeGeometry(page.layout);
      const pageBase = baseName + '-p' + String(i + 1).padStart(2, '0');
      const pageState = Object.assign({}, page, {
        export: Object.assign({}, page.export || {}, {
          format: format, dpi: dpi, jpgQuality: quality, transparent: transparent,
          filename: pageBase
        })
      });
      const result = await FP.buildExport(pageState, geom, {
        format: format,
        dpi: dpi,
        quality: quality,
        transparent: transparent,
        filename: pageBase
      });
      const bytes = new Uint8Array(await result.blob.arrayBuffer());
      files.push({ name: pageBase + '.' + info.ext, bytes: bytes });
      pageResults.push({
        index: i,
        filename: pageBase + '.' + info.ext,
        widthPx: result.widthPx,
        heightPx: result.heightPx,
        widthMm: geom.widthMm,
        heightMm: geom.heightMm,
        bytes: bytes.length
      });
    });
    const zipBytes = FP.buildZip(files);
    const blob = new Blob([zipBytes], { type: 'application/zip' });
    return {
      format: format,
      filename: baseName + '-pages.zip',
      mime: 'application/zip',
      pageCount: total,
      pageResults: pageResults,
      blob: blob,
      bytes: blob.size
    };
  };

  /**
   * 按实际像素墨迹测量内容包围盒，用于真正裁掉图片内部的白色留边
   * （仅按面板矩形裁剪会保留 MATLAB 图自身的白底/坐标区留白）。
   */
  FP.measureInkBox = function (canvas, background, marginMm, dpi, tolerance) {
    const w = canvas.width;
    const h = canvas.height;
    const full = { xMm: 0, yMm: 0, wMm: 0, hMm: 0 };
    if (!w || !h) return full;
    const bg = (function parse(value) {
      const s = String(value || '#ffffff').replace('#', '');
      if (s.length !== 6) return { r: 255, g: 255, b: 255 };
      return {
        r: parseInt(s.slice(0, 2), 16),
        g: parseInt(s.slice(2, 4), 16),
        b: parseInt(s.slice(4, 6), 16)
      };
    })(background);
    const tol = Math.max(2, Number(tolerance) || 12);
    let data;
    try {
      data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    } catch (err) {
      return full;
    }
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        const i = row + x * 4;
        if (data[i + 3] === 0) continue;
        if (Math.abs(data[i] - bg.r) > tol ||
          Math.abs(data[i + 1] - bg.g) > tol ||
          Math.abs(data[i + 2] - bg.b) > tol) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) {
      return { xMm: 0, yMm: 0, wMm: 0, hMm: 0 };
    }
    const pxPerMm = Math.max(1, Number(dpi) || 96) / 25.4;
    const pad = Math.max(0, Number(marginMm) || 0) * pxPerMm;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);
    const r = function (v) { return Math.round(v * 10) / 10; };
    return {
      xMm: r(minX / pxPerMm),
      yMm: r(minY / pxPerMm),
      wMm: r((maxX - minX + 1) / pxPerMm),
      hMm: r((maxY - minY + 1) / pxPerMm),
      inkPx: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
      pagePx: { w: w, h: h }
    };
  };

  /**
   * 渲染低分辨率探针图，按墨迹检测实际内容边界（用于 PDF 白边裁剪）。
   */
  FP.detectInkCrop = async function (state, geom, opts) {
    opts = opts || {};
    const dpi = Math.max(48, Math.min(300, Number(opts.dpi) || 96));
    const background = opts.background || FP.figureBackgroundColor(state) || '#ffffff';
    const canvas = await FP.renderCanvas(state, geom, dpi, {
      transparent: false,
      background: background
    });
    return FP.measureInkBox(canvas, background, opts.marginMm || 0, dpi, opts.tolerance);
  };

  /** 构建并立即下载。 */
  FP.exportFigure = async function (state, geom, opts) {
    const result = await FP.buildExport(state, geom, opts);
    FP.downloadBlob(result.blob, result.filename);
    return result;
  };

  /** 供自动化测试/高级用户使用：直接返回 base64 数据。 */
  FP.exportBase64 = async function (state, geom, opts) {
    const result = await FP.buildExport(state, geom, opts);
    const base64 = await FP.blobToBase64(result.blob);
    return {
      base64: base64,
      filename: result.filename,
      mime: result.mime,
      format: result.format,
      widthPx: result.widthPx,
      heightPx: result.heightPx,
      widthMm: result.widthMm,
      heightMm: result.heightMm,
      dpi: result.dpi,
      bytes: result.bytes
    };
  };
})();
