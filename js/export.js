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
