/* FigurePlay · 版面几何、面板（含合并单元格）、图片变换与编号定位计算 */
(function () {
  'use strict';
  const FP = (window.FP = window.FP || {});
  const clamp = FP.clamp;
  const round = FP.round;

  FP.MAX_CELLS = 2500;
  FP.LIMITS = {
    rows: [1, 500],
    cols: [1, 500],
    widthMm: [20, 500],
    gapMm: [-50, 80],
    marginMm: [0, 80],
    aspect: [0.2, 10]
  };

  /**
   * 规范化合并单元格列表：去掉越界、1×1、互相重叠的项。
   * 合并项使用 { r, c, rs, cs }（r/c 从 0 开始）。
   */
  FP.normalizeMerges = function (merges, rows, cols) {
    const raw = Array.isArray(merges) ? merges : [];
    const occupied = new Uint8Array(rows * cols);
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      const m = raw[i];
      if (!m || typeof m !== 'object') continue;
      const r = clamp(FP.toInt(m.r, 0), 0, rows - 1);
      const c = clamp(FP.toInt(m.c, 0), 0, cols - 1);
      const rs = clamp(FP.toInt(m.rs, 1), 1, rows - r);
      const cs = clamp(FP.toInt(m.cs, 1), 1, cols - c);
      if (rs <= 1 && cs <= 1) continue;
      let ok = true;
      for (let rr = r; rr < r + rs && ok; rr++) {
        for (let cc = c; cc < c + cs; cc++) {
          if (occupied[rr * cols + cc]) { ok = false; break; }
        }
      }
      if (!ok) continue;
      for (let rr = r; rr < r + rs; rr++) {
        for (let cc = c; cc < c + cs; cc++) occupied[rr * cols + cc] = 1;
      }
      out.push({ r: r, c: c, rs: rs, cs: cs });
    }
    out.sort(function (a, b) { return a.r - b.r || a.c - b.c; });
    return out;
  };

  FP.mergeKey = function (merges) {
    const list = Array.isArray(merges) ? merges : [];
    return list.map(function (m) { return m.r + ':' + m.c + ':' + m.rs + ':' + m.cs; }).join(';');
  };

  /** 找到某个合并项对应的锚点行号/列号 */
  FP.mergeAnchorIndex = function (merge, cols) {
    return merge.r * cols + merge.c;
  };

  /** 生成网格中每个格子到面板锚点的覆盖映射；非面板格返回 -1。 */
  FP.buildCoverage = function (rows, cols, merges) {
    const coverage = new Int32Array(rows * cols).fill(-1);
    for (let i = 0; i < merges.length; i++) {
      const m = merges[i];
      const anchor = m.r * cols + m.c;
      for (let rr = m.r; rr < m.r + m.rs; rr++) {
        for (let cc = m.c; cc < m.c + m.cs; cc++) coverage[rr * cols + cc] = anchor;
      }
    }
    return coverage;
  };

  /**
   * 计算整个版面的几何信息（单位：毫米）。
   * cells 为完整网格；panels 为参与排版的面板（合并单元格只保留锚点面板）。
   */
  FP.computeGeometry = function (layout) {
    layout = layout || {};
    const rows = clamp(FP.toInt(layout.rows, 3), FP.LIMITS.rows[0], FP.LIMITS.rows[1]);
    let cols = clamp(FP.toInt(layout.cols, 2), FP.LIMITS.cols[0], FP.LIMITS.cols[1]);
    if (rows * cols > FP.MAX_CELLS) cols = Math.max(1, Math.floor(FP.MAX_CELLS / rows));
    const widthMm = clamp(layout.widthMm, 20, 1400);
    const colGap = clamp(layout.colGap, -50, 80);
    const rowGap = clamp(layout.rowGap, -50, 80);
    const margin = clamp(layout.margin, 0, 80);
    const aspectW = clamp(layout.aspectW, 0.2, 10);
    const aspectH = clamp(layout.aspectH, 0.2, 10);
    const aspect = aspectW / aspectH;
    const padTop = clamp(Number(layout.padTopMm) || 0, 0, 200);
    const padRight = clamp(Number(layout.padRightMm) || 0, 0, 200);
    const padBottom = clamp(Number(layout.padBottomMm) || 0, 0, 200);
    const padLeft = clamp(Number(layout.padLeftMm) || 0, 0, 200);
    const merges = FP.normalizeMerges(layout.merges, rows, cols);

    const contentW = Math.max(1, widthMm - margin * 2);
    const cellW = Math.max(1, (contentW - colGap * (cols - 1)) / cols);
    const cellH = Math.max(0.5, cellW / aspect);
    const baseHeightMm = Math.max(1, margin * 2 + cellH * rows + rowGap * (rows - 1));
    const pageWidthMm = widthMm + padLeft + padRight;
    const pageHeightMm = baseHeightMm + padTop + padBottom;

    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({
          index: r * cols + c,
          row: r,
          col: c,
          x: padLeft + margin + c * (cellW + colGap),
          y: padTop + margin + r * (cellH + rowGap),
          w: cellW,
          h: cellH
        });
      }
    }

    const coverage = FP.buildCoverage(rows, cols, merges);
    const mergeByAnchor = new Map();
    merges.forEach(function (m) { mergeByAnchor.set(m.r * cols + m.c, m); });
    const panels = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const anchor = coverage[idx];
        if (anchor !== -1 && anchor !== idx) continue; // 被合并覆盖的非锚点格
        const base = cells[idx];
        const m = mergeByAnchor.get(idx);
        const rs = m ? m.rs : 1;
        const cs = m ? m.cs : 1;
        panels.push({
          index: idx,
          row: r,
          col: c,
          rowSpan: rs,
          colSpan: cs,
          x: base.x,
          y: base.y,
          w: cs * cellW + (cs - 1) * colGap,
          h: rs * cellH + (rs - 1) * rowGap,
          merged: rs > 1 || cs > 1
        });
      }
    }

    return {
      rows: rows,
      cols: cols,
      widthMm: pageWidthMm,
      heightMm: pageHeightMm,
      baseWidthMm: widthMm,
      baseHeightMm: baseHeightMm,
      padTopMm: padTop,
      padRightMm: padRight,
      padBottomMm: padBottom,
      padLeftMm: padLeft,
      contentW: contentW,
      margin: margin,
      colGap: colGap,
      rowGap: rowGap,
      cellW: cellW,
      cellH: cellH,
      aspect: aspect,
      merges: merges,
      cells: cells,
      panels: panels
    };
  };

  /**
   * 检测编号是否超出当前页面；返回需要在四边增加的页距（mm）。
   * 传baseGeom（四边pad为0）计算；自动加页距时使用。
   */
  FP.computeLabelOverflowPads = function (state, geom, safetyMm) {
    const safety = clamp(Number(safetyMm) || 0, 0, 20);
    const out = { top: 0, right: 0, bottom: 0, left: 0 };
    if (!state || !geom || !state.label || !state.label.show) return out;
    const labels = FP.computeLabels(state, geom);
    labels.forEach(function (label) {
      if (!label.panel) return;
      const placement = FP.getLabelPlacement(state.label, label.panel, label.text);
      const box = placement.box;
      if (!box) return;
      const left = Math.max(0, -(box.x - safety));
      const top = Math.max(0, -(box.y - safety));
      const right = Math.max(0, (box.x + box.w + safety) - geom.widthMm);
      const bottom = Math.max(0, (box.y + box.h + safety) - geom.heightMm);
      out.left = Math.max(out.left, left);
      out.top = Math.max(out.top, top);
      out.right = Math.max(out.right, right);
      out.bottom = Math.max(out.bottom, bottom);
    });
    function round(v) { return Math.round(v * 10) / 10; }
    out.left = round(out.left);
    out.top = round(out.top);
    out.right = round(out.right);
    out.bottom = round(out.bottom);
    return out;
  };

  /** 计算 PDF 裁剪白边用的内容包围盒（含图片面板与编号，单位 mm）。 */
  FP.computeContentBBox = function (state, geom, padMm) {
    const pad = clamp(Number(padMm) || 0, 0, 50);
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    (geom.panels || []).forEach(function (panel) {
      const cell = state.cells[panel.index];
      if (!cell) return;
      x0 = Math.min(x0, panel.x);
      y0 = Math.min(y0, panel.y);
      x1 = Math.max(x1, panel.x + panel.w);
      y1 = Math.max(y1, panel.y + panel.h);
    });
    if (state.label && state.label.show) {
      const labels = FP.computeLabels(state, geom);
      labels.forEach(function (label) {
        if (!label.panel) return;
        const placement = FP.getLabelPlacement(state.label, label.panel, label.text);
        const box = placement.box;
        if (!box) return;
        x0 = Math.min(x0, box.x);
        y0 = Math.min(y0, box.y);
        x1 = Math.max(x1, box.x + box.w);
        y1 = Math.max(y1, box.y + box.h);
      });
    }
    if (!isFinite(x0) || x1 <= x0 || y1 <= y0) {
      return { xMm: 0, yMm: 0, wMm: geom.widthMm, hMm: geom.heightMm };
    }
    x0 = Math.max(0, x0 - pad);
    y0 = Math.max(0, y0 - pad);
    x1 = Math.min(geom.widthMm, x1 + pad);
    y1 = Math.min(geom.heightMm, y1 + pad);
    function r(v) { return Math.round(v * 10) / 10; }
    return { xMm: r(x0), yMm: r(y0), wMm: Math.max(1, r(x1 - x0)), hMm: Math.max(1, r(y1 - y0)) };
  };

  FP.getPanel = function (geom, index) {    if (index === null || index === undefined) return null;
    const panels = geom.panels || [];
    for (let i = 0; i < panels.length; i++) {
      if (panels[i].index === index) return panels[i];
    }
    return null;
  };

  FP.getPanelByRowCol = function (geom, row, col) {
    const panels = geom.panels || [];
    for (let i = 0; i < panels.length; i++) {
      if (panels[i].row === row && panels[i].col === col) return panels[i];
    }
    return null;
  };

  FP.isPanelIndex = function (geom, index) {
    return !!FP.getPanel(geom, index);
  };

  /** 导出像素尺寸（四舍五入）。 */
  FP.pixelSize = function (geom, dpi) {
    const pxPerMm = clamp(dpi, 36, 2400) / 25.4;
    return {
      width: Math.max(1, Math.round(geom.widthMm * pxPerMm)),
      height: Math.max(1, Math.round(geom.heightMm * pxPerMm)),
      pxPerMm: pxPerMm
    };
  };

  /**
   * 计算面板内图片的变换。
   * 返回 { cx, cy, rot, sx, sy, iw, ih, fit }
   * 坐标系为毫米；sx/sy 为 图片自然像素 -> 毫米 的比例。
   */
  FP.getImageTransform = function (cell, rect, globalFit) {
    const fit = cell.fit && cell.fit !== 'inherit' ? cell.fit : (globalFit || 'contain');
    const iw = Math.max(1, cell.width || 1);
    const ih = Math.max(1, cell.height || 1);
    const rot = ((Math.round((cell.rotation || 0) / 90) * 90) % 360 + 360) % 360;
    const zoom = clamp(cell.zoom || 1, 0.05, 20);
    const w = rect.w;
    const h = rect.h;
    let sx, sy;

    const swapped = (rot === 90 || rot === 270);
    const effW = swapped ? ih : iw;
    const effH = swapped ? iw : ih;

    if (fit === 'stretch') {
      if (swapped) {
        // 旋转 90/270 后，图片横向尺寸来自 ih，纵向尺寸来自 iw
        sy = (w / ih) * zoom;
        sx = (h / iw) * zoom;
      } else {
        sx = (w / iw) * zoom;
        sy = (h / ih) * zoom;
      }
    } else {
      let s;
      if (fit === 'cover') {
        s = Math.max(w / effW, h / effH);
      } else {
        s = Math.min(w / effW, h / effH);
      }
      s *= zoom;
      sx = s;
      sy = s;
    }

    return {
      fit: fit,
      rot: rot,
      sx: sx,
      sy: sy,
      iw: iw,
      ih: ih,
      cx: rect.x + rect.w / 2 + (cell.offsetX || 0),
      cy: rect.y + rect.h / 2 + (cell.offsetY || 0)
    };
  };

  FP.imageTransformString = function (t) {
    return 'translate(' + round(t.cx, 4) + ' ' + round(t.cy, 4) + ')' +
      ' rotate(' + t.rot + ')' +
      ' scale(' + round(t.sx, 6) + ' ' + round(t.sy, 6) + ')' +
      ' translate(' + round(-t.iw / 2, 3) + ' ' + round(-t.ih / 2, 3) + ')';
  };

  /** 按行/列顺序返回面板。 */
  FP.orderPanels = function (geom, order) {
    const list = (geom.panels || []).slice();
    if (order === 'col') {
      list.sort(function (a, b) { return a.col - b.col || a.row - b.row; });
    } else {
      list.sort(function (a, b) { return a.row - b.row || a.col - b.col; });
    }
    return list;
  };

  /** 兼容旧名：按顺序返回面板。 */
  FP.orderCells = function (geom, order) {
    return FP.orderPanels(geom, order);
  };

  /**
   * 计算每个面板的编号文本。
   * 支持子图分组：属于某个分组的子图使用该分组自己的编号方案与起始编号。
   * 返回 [{ panel, text, counter, groupId }]
   */
  FP.computeLabels = function (state, geom) {
    const label = state.label || {};
    if (!label.show) return [];
    const order = label.order === 'col' ? 'col' : 'row';
    const skipEmpty = !!label.skipEmpty;
    const out = [];
    let globalCounter = 0;
    const groupCounters = new Map();
    const panelGroup = new Map();
    (state.groups || []).forEach(function (group) {
      if (!group || !Array.isArray(group.panels)) return;
      group.panels.forEach(function (idx) {
        if (!panelGroup.has(idx)) panelGroup.set(idx, group);
      });
    });
    const panels = FP.orderPanels(geom, order);
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const cell = state.cells[panel.index];
      if (!cell && skipEmpty) continue;
      const group = panelGroup.get(panel.index) || null;
      let counter;
      let scheme;
      let start;
      if (group) {
        counter = (groupCounters.get(group.id) || 0) + 1;
        groupCounters.set(group.id, counter);
        scheme = group.scheme || label.scheme;
        start = Math.max(1, FP.toInt(group.start, 1));
      } else {
        counter = ++globalCounter;
        scheme = label.scheme;
        start = Math.max(1, FP.toInt(label.start, 1));
      }
      let text = FP.formatLabel(scheme, start + counter - 1);
      if (cell && cell.customLabel && String(cell.customLabel).trim()) {
        text = String(cell.customLabel).trim();
      }
      out.push({
        panel: panel,
        cell: panel,
        text: text,
        counter: counter,
        groupId: group ? group.id : null
      });
    }
    return out;
  };

  /** 子图分组配色（按创建顺序循环使用）。 */
  FP.GROUP_COLORS = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#4d7c0f'];

  /**
   * 清理分组：只保留当前几何中有效的面板，每个面板最多属于一个组，空组丢弃。
   */
  FP.sanitizeGroups = function (groups, geom) {
    const valid = new Set((geom.panels || []).map(function (p) { return p.index; }));
    const used = new Set();
    const out = [];
    (Array.isArray(groups) ? groups : []).forEach(function (group, groupIndex) {
      if (!group || typeof group !== 'object') return;
      const panels = [];
      (Array.isArray(group.panels) ? group.panels : []).forEach(function (raw) {
        const idx = Number(raw);
        if (valid.has(idx) && !used.has(idx) && panels.indexOf(idx) < 0) panels.push(idx);
      });
      if (!panels.length) return;
      panels.sort(function (a, b) { return a - b; });
      panels.forEach(function (idx) { used.add(idx); });
      out.push({
        id: String(group.id || FP.uid('group')),
        name: String(group.name || ('组 ' + (groupIndex + 1))).slice(0, 24),
        color: /^#[0-9a-fA-F]{6}$/.test(String(group.color || ''))
          ? String(group.color).toLowerCase()
          : FP.GROUP_COLORS[out.length % FP.GROUP_COLORS.length],
        scheme: FP.schemeById(group.scheme).id,
        start: Math.max(1, FP.toInt(group.start, 1)),
        panels: panels
      });
    });
    return out;
  };

  /**
   * 校验多选面板是否可合并为矩形。
   * 返回 { ok, message, merge?, anchor? }
   */
  FP.validateMergeSelection = function (geom, indices) {
    const unique = [];
    (indices || []).forEach(function (idx) {
      const n = Number(idx);
      if (unique.indexOf(n) < 0) unique.push(n);
    });
    if (unique.length < 2) return { ok: false, message: '请至少选择两个子图' };
    const panels = [];
    for (let i = 0; i < unique.length; i++) {
      const p = FP.getPanel(geom, unique[i]);
      if (!p) return { ok: false, message: '选区中有无效子图' };
      if (p.merged) return { ok: false, message: '已合并的子图不能再次参与合并，请先拆分' };
      panels.push(p);
    }
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    panels.forEach(function (p) {
      minR = Math.min(minR, p.row);
      maxR = Math.max(maxR, p.row);
      minC = Math.min(minC, p.col);
      maxC = Math.max(maxC, p.col);
    });
    const area = (maxR - minR + 1) * (maxC - minC + 1);
    if (area !== panels.length) {
      return { ok: false, message: '所选子图需要组成完整矩形才能合并（当前不连续）' };
    }
    const merge = { r: minR, c: minC, rs: maxR - minR + 1, cs: maxC - minC + 1 };
    return {
      ok: true,
      merge: merge,
      anchor: merge.r * geom.cols + merge.c,
      message: '可合并为 ' + merge.rs + ' 行 × ' + merge.cs + ' 列的大图'
    };
  };

  /**
   * 计算单个编号的排版位置与字号信息。
   */
  const POS_TO_ALIGN = {
    tl: ['start', 'top'], tc: ['middle', 'top'], tr: ['end', 'top'],
    ml: ['start', 'middle'], mc: ['middle', 'middle'], mr: ['end', 'middle'],
    bl: ['start', 'bottom'], bc: ['middle', 'bottom'], br: ['end', 'bottom']
  };
  FP.POS_TO_ALIGN = POS_TO_ALIGN;

  FP.getLabelPlacement = function (labelConf, rect, text) {
    const conf = labelConf || {};
    const fontSizePt = clamp(conf.fontSizePt, 4, 72);
    const fsMm = fontSizePt * 25.4 / 72;
    const fontKey = conf.fontFamily || 'times';
    const stack = FP.FONT_STACKS[fontKey] || FP.FONT_STACKS.times;
    const metrics = FP.textMetrics(text, fontKey, !!conf.bold, !!conf.italic);
    const widthMm = metrics.width * fsMm;
    const ascentMm = metrics.ascent * fsMm;
    const descentMm = metrics.descent * fsMm;
    const inset = clamp(conf.insetMm, 0, 20);
    const offsetX = Number(conf.offsetXmm) || 0;
    const offsetY = Number(conf.offsetYmm) || 0;
    const align = POS_TO_ALIGN[conf.position] || POS_TO_ALIGN.tl;
    const ha = align[0];
    const va = align[1];

    let anchorX;
    if (ha === 'start') anchorX = rect.x + inset;
    else if (ha === 'end') anchorX = rect.x + rect.w - inset;
    else anchorX = rect.x + rect.w / 2;

    let baseline;
    if (va === 'top') baseline = rect.y + inset + ascentMm;
    else if (va === 'bottom') baseline = rect.y + rect.h - inset - descentMm;
    else baseline = rect.y + rect.h / 2 + (ascentMm - descentMm) / 2;

    const x = anchorX + offsetX;
    const y = baseline + offsetY;

    const padX = fsMm * 0.22;
    const padY = fsMm * 0.10;
    let boxX = x;
    if (ha === 'middle') boxX = x - widthMm / 2;
    else if (ha === 'end') boxX = x - widthMm;
    const boxY = y - ascentMm;
    const box = {
      x: boxX - padX,
      y: boxY - padY,
      w: widthMm + padX * 2,
      h: ascentMm + descentMm + padY * 2,
      r: Math.min(fsMm * 0.25, 1.2)
    };

    return {
      x: x,
      y: y,
      baseline: y,
      anchor: ha === 'start' ? 'start' : ha === 'end' ? 'end' : 'middle',
      ha: ha,
      va: va,
      fsMm: fsMm,
      ascentMm: ascentMm,
      descentMm: descentMm,
      widthMm: widthMm,
      fontStack: stack,
      fontKey: fontKey,
      box: box
    };
  };
})();
