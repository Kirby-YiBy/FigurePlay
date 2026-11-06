/* FigurePlay · SVG 预览与 SVG 导出渲染（支持合并单元格面板） */
(function () {
  'use strict';
  const FP = (window.FP = window.FP || {});
  const NS = FP.SVG_NS;
  const round = FP.round;
  const clamp = FP.clamp;

  function r3(n) { return round(n, 3); }
  function r4(n) { return round(n, 4); }

  function figureBackgroundColor(state) {
    if (state.layout.bgMode === 'custom') return state.layout.bgColor || '#ffffff';
    if (state.layout.bgMode === 'transparent') return null;
    return '#ffffff';
  }
  FP.figureBackgroundColor = figureBackgroundColor;

  function isTransparentOutput(state) {
    const format = state.export && state.export.format;
    return !!(state.export && state.export.transparent && (format === 'png' || format === 'svg'));
  }
  FP.isTransparentOutput = isTransparentOutput;

  function resolveBackground(state) {
    if (isTransparentOutput(state)) return null;
    return figureBackgroundColor(state);
  }

  function resolveLabelBg(conf) {
    if (!conf || !conf.bg || conf.bg === 'none') return null;
    let color = '#ffffff';
    if (conf.bg === 'black') color = '#000000';
    else if (conf.bg === 'custom') color = conf.bgColor || '#ffffff';
    return { color: color, opacity: clamp(conf.bgOpacity, 0, 1) };
  }
  FP.resolveLabelBg = resolveLabelBg;

  function isSelected(state, index) {
    if (state.multiSelect && state.multiSelect.length > 1) {
      return state.multiSelect.indexOf(index) >= 0;
    }
    return state.selectedCell === index;
  }

  function makePlaceholder(rect) {
    // 预览用空面板占位 UI（不参与导出）
    const g = FP.svgEl('g', { 'class': 'cell-empty-ui' });
    const pad = Math.min(rect.w, rect.h) * 0.06;
    const rr = Math.min(2.4, Math.min(rect.w, rect.h) * 0.08);
    const box = FP.svgEl('rect', {
      x: r3(rect.x + pad), y: r3(rect.y + pad),
      width: r3(Math.max(0, rect.w - pad * 2)), height: r3(Math.max(0, rect.h - pad * 2)),
      rx: r3(rr), fill: 'rgba(248,250,252,0.86)', stroke: '#cbd5e1',
      'stroke-width': 0.3, 'stroke-dasharray': '1.8 1.4'
    });
    const fs = clamp(Math.min(rect.w, rect.h) * 0.062, 2.1, 4.6);
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2 - fs * 0.75;
    const L = clamp(Math.min(rect.w, rect.h) * 0.11, 1.4, 4.2);
    const icon = FP.svgEl('g', {
      stroke: '#93a4bb', 'stroke-width': r3(Math.max(0.35, fs * 0.13)),
      'stroke-linecap': 'round'
    });
    icon.appendChild(FP.svgEl('line', { x1: r3(cx - L), y1: r3(cy), x2: r3(cx + L), y2: r3(cy) }));
    icon.appendChild(FP.svgEl('line', { x1: r3(cx), y1: r3(cy - L), x2: r3(cx), y2: r3(cy + L) }));
    const text = FP.svgEl('text', {
      x: r3(cx), y: r3(cy + L + fs * 1.55),
      'text-anchor': 'middle', 'font-family': '"Segoe UI","Microsoft YaHei",sans-serif',
      'font-size': r3(fs), fill: '#94a3b8'
    });
    text.textContent = '点击上传 / 粘贴';
    g.appendChild(box);
    g.appendChild(icon);
    g.appendChild(text);
    return g;
  }

  function buildStructure(svg, state, geom, interactive) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + r4(geom.widthMm) + ' ' + r4(geom.heightMm));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const refs = { interactive: interactive, panels: [], byAnchor: new Map(), labelsGroup: null, bgRect: null };
    const bg = FP.svgEl('rect', {
      'class': 'figure-bg', x: '0', y: '0',
      width: r4(geom.widthMm), height: r4(geom.heightMm),
      fill: resolveBackground(state) || 'none'
    });
    svg.appendChild(bg);
    refs.bgRect = bg;

    const cellsLayer = FP.svgEl('g', { 'class': 'cells-layer' });
    svg.appendChild(cellsLayer);
    refs.cellsLayer = cellsLayer;

    for (let p = 0; p < geom.panels.length; p++) {
      const panel = geom.panels[p];
      const anchor = panel.index;
      const isMerged = !!panel.merged;
      const group = FP.svgEl('g', { 'class': isSelected(state, anchor) ? 'cell is-selected' : 'cell' });
      group.setAttribute('data-i', String(anchor));
      if (isMerged) group.setAttribute('data-merged', '1');
      cellsLayer.appendChild(group);

      const clipId = 'fp-clip-' + anchor;
      const clipPath = FP.svgEl('clipPath', { id: clipId });
      const clipRect = FP.svgEl('rect', {
        x: r3(panel.x), y: r3(panel.y), width: r3(panel.w), height: r3(panel.h)
      });
      clipPath.appendChild(clipRect);
      group.appendChild(clipPath);

      const imgWrap = FP.svgEl('g', { 'clip-path': 'url(#' + clipId + ')' });
      const image = FP.svgEl('image', {
        'class': 'cell-image',
        x: '0', y: '0', width: '1', height: '1',
        preserveAspectRatio: 'none', display: 'none'
      });
      image.setAttributeNS(FP.XLINK_NS, 'xlink:href', '');
      imgWrap.appendChild(image);
      group.appendChild(imgWrap);

      const borderRect = FP.svgEl('rect', {
        'class': 'cell-border', x: r3(panel.x), y: r3(panel.y),
        width: r3(panel.w), height: r3(panel.h),
        fill: 'none', stroke: 'none', 'stroke-width': 0.25
      });
      group.appendChild(borderRect);

      let placeholder = null;
      let outline = null;
      let hit = null;
      if (interactive) {
        outline = FP.svgEl('rect', {
          'class': 'cell-outline', x: r3(panel.x), y: r3(panel.y),
          width: r3(panel.w), height: r3(panel.h), rx: r3(Math.min(2, Math.min(panel.w, panel.h) * 0.05))
        });
        group.appendChild(outline);
        placeholder = makePlaceholder(panel);
        group.appendChild(placeholder);
        hit = FP.svgEl('rect', {
          'class': 'cell-hit', x: r3(panel.x), y: r3(panel.y),
          width: r3(panel.w), height: r3(panel.h)
        });
        hit.setAttribute('data-index', String(anchor));
        group.appendChild(hit);
      }

      const ref = {
        anchor: anchor,
        group: group, clipRect: clipRect, imgWrap: imgWrap, image: image,
        borderRect: borderRect, placeholder: placeholder, outline: outline, hit: hit,
        lastHref: ''
      };
      refs.panels.push(ref);
      refs.byAnchor.set(anchor, ref);
    }

    const labelsGroup = FP.svgEl('g', { 'class': 'labels-layer' });
    svg.appendChild(labelsGroup);
    refs.labelsGroup = labelsGroup;

    if (interactive) {
      const groupsLayer = FP.svgEl('g', { 'class': 'groups-layer' });
      // 分组描边放在子图之上、编号之下
      svg.insertBefore(groupsLayer, labelsGroup);
      refs.groupsLayer = groupsLayer;

      // 选中/悬停描边统一画在最上层，避免负间距重叠时被后面的子图盖住
      const overlayLayer = FP.svgEl('g', { 'class': 'interaction-overlay-layer' });
      svg.appendChild(overlayLayer);
      refs.overlayLayer = overlayLayer;
    }
    return refs;
  }

  function patchGroups(state, geom, refs) {
    if (!refs || !refs.interactive || !refs.groupsLayer) return;
    const layer = refs.groupsLayer;
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    const groups = state.groups || [];
    if (!groups.length) return;
    const panelMap = new Map();
    geom.panels.forEach(function (p) { panelMap.set(p.index, p); });
    groups.forEach(function (group) {
      const panels = [];
      (group.panels || []).forEach(function (idx) {
        const panel = panelMap.get(idx);
        if (panel) panels.push(panel);
      });
      if (!panels.length) return;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      panels.forEach(function (p) {
        x0 = Math.min(x0, p.x);
        y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x + p.w);
        y1 = Math.max(y1, p.y + p.h);
      });
      const pad = 1.3;
      const color = group.color || '#2563eb';
      layer.appendChild(FP.svgEl('rect', {
        'class': 'group-outline', x: r3(x0 - pad), y: r3(y0 - pad),
        width: r3(x1 - x0 + pad * 2), height: r3(y1 - y0 + pad * 2),
        rx: r3(1.8), fill: 'none', stroke: color, 'stroke-width': 0.45,
        'stroke-dasharray': '1.6 1.1', 'stroke-opacity': 0.9
      }));
      const nameText = FP.svgEl('text', {
        'class': 'group-name', x: r3(x1 + pad), y: r3(Math.max(2.5, y0 - pad - 1.2)),
        'text-anchor': 'end',
        'font-family': '"Segoe UI","Microsoft YaHei",sans-serif',
        'font-size': 2.6, 'font-weight': 600, fill: color,
        stroke: '#ffffff', 'stroke-width': 0.45, 'paint-order': 'stroke',
        'stroke-linejoin': 'round'
      });
      nameText.textContent = group.name || '组';
      layer.appendChild(nameText);
    });
  }

  function patchLabels(state, geom, refs) {
    const group = refs.labelsGroup;
    while (group.firstChild) group.removeChild(group.firstChild);
    if (!state.label || !state.label.show) return;
    const labels = FP.computeLabels(state, geom);
    const conf = state.label;
    const bgInfo = resolveLabelBg(conf);
    for (let i = 0; i < labels.length; i++) {
      const entry = labels[i];
      if (!entry.text) continue;
      const placement = FP.getLabelPlacement(conf, entry.panel, entry.text);
      if (bgInfo) {
        group.appendChild(FP.svgEl('rect', {
          x: r3(placement.box.x), y: r3(placement.box.y),
          width: r3(placement.box.w), height: r3(placement.box.h),
          rx: r3(placement.box.r),
          fill: bgInfo.color, 'fill-opacity': r3(bgInfo.opacity)
        }));
      }
      const textEl = FP.svgEl('text', {
        'class': 'label-text',
        x: r4(placement.x), y: r4(placement.baseline),
        'text-anchor': placement.anchor,
        'font-family': placement.fontStack,
        'font-size': r3(placement.fsMm),
        'font-weight': conf.bold ? '700' : '400',
        'font-style': conf.italic ? 'italic' : 'normal',
        fill: conf.color || '#000000'
      });
      textEl.textContent = entry.text;
      group.appendChild(textEl);
    }
  }

  function patchPanel(state, geom, refs, panel) {
    const anchor = panel.index;
    const cell = state.cells[anchor];
    const ref = refs.byAnchor.get(anchor);
    if (!ref) return;

    const x = r3(panel.x), y = r3(panel.y), w = r3(panel.w), h = r3(panel.h);
    if (ref.clipRect) {
      ref.clipRect.setAttribute('x', x);
      ref.clipRect.setAttribute('y', y);
      ref.clipRect.setAttribute('width', w);
      ref.clipRect.setAttribute('height', h);
    }
    if (ref.outline) {
      ref.outline.setAttribute('x', x);
      ref.outline.setAttribute('y', y);
      ref.outline.setAttribute('width', w);
      ref.outline.setAttribute('height', h);
    }
    if (ref.hit) {
      ref.hit.setAttribute('x', x);
      ref.hit.setAttribute('y', y);
      ref.hit.setAttribute('width', w);
      ref.hit.setAttribute('height', h);
    }

    if (ref.borderRect) {
      const on = !!state.layout.borderOn;
      const bw = clamp(state.layout.borderWidth, 0.01, 3);
      ref.borderRect.setAttribute('x', r3(panel.x + bw / 2));
      ref.borderRect.setAttribute('y', r3(panel.y + bw / 2));
      ref.borderRect.setAttribute('width', r3(Math.max(0.1, panel.w - bw)));
      ref.borderRect.setAttribute('height', r3(Math.max(0.1, panel.h - bw)));
      ref.borderRect.setAttribute('stroke', on ? (state.layout.borderColor || '#000000') : 'none');
      ref.borderRect.setAttribute('stroke-width', on ? r3(bw) : '0');
    }

    if (cell && ref.image) {
      ref.image.setAttribute('display', '');
      if (ref.lastHref !== cell.dataUrl) {
        FP.setSvgImageHref(ref.image, cell.dataUrl);
        ref.lastHref = cell.dataUrl;
      }
      ref.image.setAttribute('width', String(cell.width));
      ref.image.setAttribute('height', String(cell.height));
      const transform = FP.getImageTransform(cell, panel, state.layout.fit);
      ref.image.setAttribute('transform', FP.imageTransformString(transform));
    } else if (ref.image) {
      ref.image.setAttribute('display', 'none');
      ref.image.removeAttribute('transform');
      ref.lastHref = '';
    }

    if (ref.placeholder) ref.placeholder.setAttribute('display', cell ? 'none' : '');
    if (ref.group && refs.interactive) {
      ref.group.setAttribute('class', 'cell' + (isSelected(state, anchor) ? ' is-selected' : ''));
    }
  }

  function patchOverlay(state, geom, refs, hoverAnchor) {
    if (!refs || !refs.interactive || !refs.overlayLayer) return;
    const layer = refs.overlayLayer;
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    const selected = [];
    geom.panels.forEach(function (panel) {
      if (!isSelected(state, panel.index)) return;
      selected.push(panel.index);
      layer.appendChild(FP.svgEl('rect', {
        'class': 'cell-selection-outline',
        x: r3(panel.x), y: r3(panel.y), width: r3(panel.w), height: r3(panel.h),
        rx: r3(Math.min(2, Math.min(panel.w, panel.h) * 0.05)),
        fill: 'none', 'stroke-width': 0.5,
        'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none'
      }));
    });
    if (hoverAnchor != null && selected.indexOf(hoverAnchor) < 0) {
      const panel = FP.getPanel(geom, hoverAnchor);
      if (panel) {
        layer.appendChild(FP.svgEl('rect', {
          'class': 'cell-hover-outline',
          x: r3(panel.x), y: r3(panel.y), width: r3(panel.w), height: r3(panel.h),
          rx: r3(Math.min(2, Math.min(panel.w, panel.h) * 0.05)),
          fill: 'none', 'stroke-width': 0.35,
          'stroke-dasharray': '2.4 1.8', 'vector-effect': 'non-scaling-stroke',
          'pointer-events': 'none'
        }));
      }
    }
  }

  function patchAll(state, geom, refs, hoverAnchor) {
    const bg = refs.bgRect;
    if (bg) {
      const color = resolveBackground(state);
      bg.setAttribute('fill', color || 'none');
    }
    for (let i = 0; i < geom.panels.length; i++) patchPanel(state, geom, refs, geom.panels[i]);
    patchGroups(state, geom, refs);
    patchLabels(state, geom, refs);
    patchOverlay(state, geom, refs, hoverAnchor);
  }

  function buildRoot(state, geom) {
    return FP.svgEl('svg', {
      xmlns: NS,
      'xmlns:xlink': FP.XLINK_NS,
      version: '1.1',
      width: r3(geom.widthMm) + 'mm',
      height: r3(geom.heightMm) + 'mm'
    });
  }

  /** 构建独立的导出 SVG（不含交互元素与外部 CSS 依赖）。 */
  FP.buildExportSvg = function (state, geom) {
    const svg = buildRoot(state, geom);
    const title = FP.svgEl('title');
    title.textContent = (state.export && state.export.filename) || 'figure';
    svg.appendChild(title);
    const refs = buildStructure(svg, state, geom, false);
    patchAll(state, geom, refs);
    for (let i = 0; i < refs.panels.length; i++) refs.panels[i].group.removeAttribute('class');
    return svg;
  };

  FP.serializeSvg = function (svg) {
    const xml = new XMLSerializer().serializeToString(svg);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
  };

  /** 预览渲染器（结构复用 + 局部更新）。 */
  FP.createPreviewRenderer = function (svg) {
    let refs = null;
    let signature = '';
    let hoverAnchor = null;
    let hoverBound = false;
    let lastState = null;
    let lastGeom = null;

    function repaintOverlay() {
      if (refs && lastState && lastGeom) patchOverlay(lastState, lastGeom, refs, hoverAnchor);
    }

    function bindHover() {
      if (hoverBound) return;
      hoverBound = true;
      svg.addEventListener('pointermove', function (e) {
        const target = e.target;
        const cell = target && target.closest ? target.closest('.cell') : null;
        let idx = null;
        if (cell && cell.getAttribute('data-i') != null) {
          const n = Number(cell.getAttribute('data-i'));
          if (isFinite(n)) idx = n;
        }
        if (idx !== hoverAnchor) {
          hoverAnchor = idx;
          repaintOverlay();
        }
      });
      svg.addEventListener('pointerleave', function () {
        if (hoverAnchor !== null) {
          hoverAnchor = null;
          repaintOverlay();
        }
      });
    }

    function ensure(state, geom) {
      const sig = geom.rows + 'x' + geom.cols + '|' + FP.mergeKey(geom.merges);
      if (!refs || sig !== signature) {
        refs = buildStructure(svg, state, geom, true);
        signature = sig;
        hoverAnchor = null;
        bindHover();
      }
      svg.setAttribute('viewBox', '0 0 ' + r4(geom.widthMm) + ' ' + r4(geom.heightMm));
    }

    return {
      render: function (state, geom) {
        ensure(state, geom);
        lastState = state;
        lastGeom = geom;
        patchAll(state, geom, refs, hoverAnchor);
      },
      patchCellTransform: function (state, geom, anchorIndex) {
        if (!refs) return false;
        const ref = refs.byAnchor.get(anchorIndex);
        const panel = FP.getPanel(geom, anchorIndex);
        const cell = state.cells[anchorIndex];
        if (!ref || !ref.image || !panel || !cell) return false;
        const transform = FP.getImageTransform(cell, panel, state.layout.fit);
        ref.image.setAttribute('transform', FP.imageTransformString(transform));
        return true;
      },
      getRefs: function () { return refs; }
    };
  };
})();
