/* FigurePlay · Canvas 光栅渲染（PNG/JPG/PDF 共用，支持合并单元格面板） */
(function () {
  'use strict';
  const FP = (window.FP = window.FP || {});
  const MAX_CANVAS_PIXELS = 140 * 1000 * 1000;

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    if (!rr || !ctx.roundRect) {
      ctx.rect(x, y, w, h);
      return;
    }
    ctx.roundRect(x, y, w, h, rr);
  }

  /**
   * 把整个版式渲染到 canvas。
   */
  FP.renderCanvas = async function (state, geom, dpi, opts) {
    opts = opts || {};
    const pixels = FP.pixelSize(geom, dpi);
    if (pixels.width * pixels.height > MAX_CANVAS_PIXELS) {
      throw new Error('导出尺寸过大（' + pixels.width + '×' + pixels.height + ' 像素），请降低 DPI 或减小成品宽度');
    }
    if (pixels.width > 32767 || pixels.height > 32767) {
      throw new Error('导出尺寸超过浏览器画布上限，请降低 DPI');
    }

    const canvas = document.createElement('canvas');
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const transparent = opts.transparent !== undefined ? !!opts.transparent
      : !!(state.export && state.export.transparent);
    let bgColor = opts.background;
    if (!bgColor) bgColor = transparent ? null : FP.figureBackgroundColor(state);

    if (!transparent && bgColor) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const panels = geom.panels;
    const images = await Promise.all(panels.map(function (panel) {
      const cell = state.cells[panel.index];
      if (!cell || !cell.dataUrl) return Promise.resolve(null);
      return FP.getImage(cell.dataUrl).catch(function () { return null; });
    }));

    ctx.save();
    ctx.scale(pixels.pxPerMm, pixels.pxPerMm);

    // 图片
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const cell = state.cells[panel.index];
      const img = images[i];
      if (!cell || !img) continue;
      const t = FP.getImageTransform(cell, panel, state.layout.fit);
      ctx.save();
      ctx.beginPath();
      ctx.rect(panel.x, panel.y, panel.w, panel.h);
      ctx.clip();
      ctx.translate(t.cx, t.cy);
      ctx.rotate(t.rot * Math.PI / 180);
      ctx.scale(t.sx, t.sy);
      ctx.drawImage(img, -t.iw / 2, -t.ih / 2, t.iw, t.ih);
      ctx.restore();
    }

    // 子图边框
    if (state.layout.borderOn) {
      const bw = FP.clamp(state.layout.borderWidth, 0.01, 3);
      ctx.strokeStyle = state.layout.borderColor || '#000000';
      ctx.lineWidth = bw;
      for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];
        ctx.strokeRect(panel.x + bw / 2, panel.y + bw / 2,
          Math.max(0.1, panel.w - bw), Math.max(0.1, panel.h - bw));
      }
    }

    // 编号
    if (state.label && state.label.show) {
      const conf = state.label;
      const labels = FP.computeLabels(state, geom);
      const bgInfo = FP.resolveLabelBg ? FP.resolveLabelBg(conf) : null;
      for (let i = 0; i < labels.length; i++) {
        const entry = labels[i];
        if (!entry.text) continue;
        const p = FP.getLabelPlacement(conf, entry.panel, entry.text);
        if (bgInfo) {
          ctx.save();
          ctx.globalAlpha = bgInfo.opacity;
          ctx.fillStyle = bgInfo.color;
          ctx.beginPath();
          roundRect(ctx, p.box.x, p.box.y, p.box.w, p.box.h, p.box.r);
          ctx.fill();
          ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = conf.color || '#000000';
        ctx.font = (conf.italic ? 'italic ' : '') + (conf.bold ? '700 ' : '') +
          p.fsMm + 'px ' + p.fontStack;
        ctx.textAlign = p.anchor === 'middle' ? 'center' : p.anchor === 'end' ? 'right' : 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(entry.text, p.x, p.baseline);
        ctx.restore();
      }
    }

    ctx.restore();
    return canvas;
  };
})();
