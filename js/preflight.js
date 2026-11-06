/* FigurePlay 图片预检：导入/粘贴后提示有效 DPI、像素尺寸和拉伸变形风险。 */
(function () {
  'use strict';

  function api() { return window.__FIGPLAY__; }

  function preflightCell(cell, panel, layout) {
    if (!cell || !panel) return null;
    const iw = Math.max(1, Number(cell.width) || 0);
    const ih = Math.max(1, Number(cell.height) || 0);
    const pw = Math.max(0.1, Number(panel.w) || 0);
    const ph = Math.max(0.1, Number(panel.h) || 0);
    const fit = cell.fit && cell.fit !== 'inherit' ? cell.fit : (layout.fit || 'contain');
    const zoom = Math.max(0.05, Number(cell.zoom) || 1);
    let dpiX;
    let dpiY;
    if (fit === 'stretch') {
      dpiX = iw / (pw / 25.4);
      dpiY = ih / (ph / 25.4);
    } else {
      const scale = (fit === 'cover' ? Math.max : Math.min)(pw / iw, ph / ih) * zoom;
      dpiX = 25.4 / Math.max(0.0001, scale);
      dpiY = dpiX;
    }
    const dpi = Math.min(dpiX, dpiY);
    const warnings = [];
    if (dpi < 150) {
      warnings.push('有效分辨率约 ' + Math.round(dpi) + ' DPI，低于 150 DPI，打印可能模糊');
    } else if (dpi < 200) {
      warnings.push('有效分辨率约 ' + Math.round(dpi) + ' DPI，低于 200 DPI，建议换更高清的原图');
    }
    if (iw < 500 || ih < 400) {
      warnings.push('像素尺寸仅 ' + iw + '×' + ih + '，建议至少 500×400 px');
    }
    if (fit === 'stretch') {
      const imgAspect = iw / ih;
      const panelAspect = pw / ph;
      const mismatch = Math.abs(imgAspect - panelAspect) / Math.max(0.0001, panelAspect);
      if (mismatch > 0.08) {
        warnings.push('图片被拉伸：原图比例 ' + imgAspect.toFixed(2) + '，格子比例 ' + panelAspect.toFixed(2) + '（变形约 ' + Math.round(mismatch * 100) + '%）');
      }
    }
    return {
      index: panel.index, name: cell.name || '图片',
      width: iw, height: ih, dpiX: dpiX, dpiY: dpiY, dpi: dpi,
      fit: fit, warnings: warnings
    };
  }

  function preflightCells(indices, context) {
    if (!api()) return [];
    let info;
    let state;
    try {
      info = api().getPreviewInfo();
      state = api().getState();
    } catch (e) {
      return [];
    }
    const panels = info.panels || [];
    const cells = state.cells || [];
    const list = Array.isArray(indices) ? indices : panels.map(function (p) { return p.index; });
    const results = [];
    list.forEach(function (idx) {
      const panel = panels.find(function (p) { return p.index === idx; });
      const cell = cells[idx];
      if (!panel || !cell) return;
      const r = preflightCell(cell, panel, state.layout);
      if (r) results.push(r);
    });
    window.__PREFLIGHT_LAST__ = results;
    const warned = results.filter(function (r) { return r.warnings.length; });
    if (warned.length) {
      const first = warned[0];
      const extra = warned.length > 1 ? '；另有 ' + (warned.length - 1) + ' 张也有提示' : '';
      const msg = (context ? context + '：' : '') + '「' + first.name + '」' +
        first.warnings[0] + extra + '。建议调整格子大小或换用更高分辨率原图。';
      FP.toast(msg, 'error', 7000);
    }
    return results;
  }

  FP.preflightCell = preflightCell;
  FP.preflightCells = preflightCells;

  window.__PREFLIGHT__ = {
    run: preflightCells,
    last: function () { return window.__PREFLIGHT_LAST__ || []; }
  };
})();
