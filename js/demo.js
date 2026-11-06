/* FigurePlay · 演示图片生成（纯 Canvas 绘制，无外部素材） */
(function () {
  'use strict';
  const FP = (window.FP = window.FP || {});
  const W = 1200;
  const H = 900;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    return canvas;
  }

  function base(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  function plotRect() {
    return { x0: 128, y0: 72, x1: 1136, y1: 790, w: 1008, h: 718 };
  }

  function drawFrame(ctx, palette) {
    const p = plotRect();
    ctx.save();
    ctx.strokeStyle = '#e6ebf2';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      const y = p.y0 + (p.h / 4) * i;
      ctx.beginPath(); ctx.moveTo(p.x0, y); ctx.lineTo(p.x1, y); ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const x = p.x0 + (p.w / 5) * i;
      ctx.beginPath(); ctx.moveTo(x, p.y0); ctx.lineTo(x, p.y1); ctx.stroke();
    }
    ctx.strokeStyle = '#c6d0de';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x0, p.y0); ctx.lineTo(p.x0, p.y1); ctx.lineTo(p.x1, p.y1);
    ctx.stroke();
    // 坐标轴箭头
    ctx.fillStyle = '#c6d0de';
    ctx.beginPath();
    ctx.moveTo(p.x0, p.y0 - 12); ctx.lineTo(p.x0 - 8, p.y0 + 6); ctx.lineTo(p.x0 + 8, p.y0 + 6);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x1 + 12, p.y1); ctx.lineTo(p.x1 - 6, p.y1 - 8); ctx.lineTo(p.x1 - 6, p.y1 + 8);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    return p;
  }

  function roundedBar(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, [rr, rr, 0, 0]);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  function linePanel(ctx, seed) {
    const rng = mulberry32(seed);
    const p = drawFrame(ctx);
    const n = 84;
    const primary = [];
    const secondary = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      primary.push(0.52 + 0.24 * Math.sin(t * 5.1 + 0.5) + 0.10 * Math.sin(t * 13.0) + (rng() - 0.5) * 0.045 + t * 0.06);
      secondary.push(0.38 + 0.16 * Math.cos(t * 4.2 + 1.1) + 0.06 * Math.sin(t * 9.0) + (rng() - 0.5) * 0.04);
    }
    const X = function (i) { return p.x0 + (i / (n - 1)) * p.w; };
    const Y = function (v) { return p.y0 + (1 - v) * p.h; };

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(X(0), Y(primary[0]));
    for (let i = 1; i < n; i++) ctx.lineTo(X(i), Y(primary[i]));
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(X(i), Y(primary[i] + 0.075));
    ctx.closePath();
    ctx.fillStyle = 'rgba(37, 99, 235, 0.13)';
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (i === 0) ctx.moveTo(X(i), Y(primary[i]));
      else ctx.lineTo(X(i), Y(primary[i]));
    }
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (i === 0) ctx.moveTo(X(i), Y(secondary[i]));
      else ctx.lineTo(X(i), Y(secondary[i]));
    }
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 10]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#2563eb';
    for (let i = 0; i < n; i += 7) {
      ctx.beginPath();
      ctx.arc(X(i), Y(primary[i]), 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function scatterPanel(ctx, seed) {
    const rng = mulberry32(seed);
    const p = drawFrame(ctx);
    const pts = [];
    for (let i = 0; i < 110; i++) {
      const x = rng();
      const y = 0.22 + 0.56 * x + (rng() - 0.5) * 0.22;
      pts.push([x, Math.max(0.05, Math.min(0.95, y))]);
    }
    ctx.save();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.62)';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    for (let i = 0; i < pts.length; i++) {
      ctx.beginPath();
      ctx.arc(p.x0 + pts[i][0] * p.w, p.y0 + (1 - pts[i][1]) * p.h, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(p.x0, p.y0 + (1 - 0.18) * p.h);
    ctx.lineTo(p.x1, p.y0 + (1 - 0.84) * p.h);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }

  function barPanel(ctx, seed) {
    const rng = mulberry32(seed);
    const p = drawFrame(ctx);
    const n = 8;
    const gap = 26;
    const barW = (p.w - gap * (n + 1)) / n;
    const colors = ['#6ee7b7', '#34d399', '#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#10b981'];
    ctx.save();
    for (let i = 0; i < n; i++) {
      const v = 0.18 + rng() * 0.72;
      const h = v * p.h * 0.94;
      const x = p.x0 + gap + i * (barW + gap);
      const y = p.y1 - h;
      const grad = ctx.createLinearGradient(0, y, 0, p.y1);
      grad.addColorStop(0, colors[i]);
      grad.addColorStop(1, '#d1fae5');
      ctx.fillStyle = grad;
      roundedBar(ctx, x, y, barW, h, 14);
      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.arc(x + barW / 2, y - 16, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function heatPanel(ctx, seed) {
    const rng = mulberry32(seed);
    const p = drawFrame(ctx);
    const cols = 13, rows = 8;
    const gap = 5;
    const cw = (p.w - gap * (cols - 1)) / cols;
    const ch = (p.h - gap * (rows - 1)) / rows;
    function lerpColor(a, b, t) {
      return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
        Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
        Math.round(a[2] + (b[2] - a[2]) * t) + ')';
    }
    const from = [237, 233, 254];
    const to = [109, 40, 217];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = Math.max(0, Math.min(1, 0.5 + 0.5 * Math.sin(c * 0.7 + r * 0.5) * rng() + 0.28 * Math.cos((c - 6) * 0.4) * Math.cos((r - 4) * 0.5)));
        ctx.fillStyle = lerpColor(from, to, Math.pow(t, 1.6));
        ctx.fillRect(p.x0 + c * (cw + gap), p.y0 + r * (ch + gap), cw, ch);
      }
    }
  }

  function histPanel(ctx, seed) {
    const rng = mulberry32(seed);
    const p = drawFrame(ctx);
    const bins = 15;
    const gap = 10;
    const bw = (p.w - gap * (bins - 1)) / bins;
    const vals = [];
    for (let i = 0; i < bins; i++) {
      const x = (i - (bins - 1) / 2) / (bins * 0.22);
      vals.push(Math.exp(-0.5 * x * x) * (0.82 + rng() * 0.22));
    }
    const max = Math.max.apply(null, vals);
    ctx.save();
    for (let i = 0; i < bins; i++) {
      const h = (vals[i] / max) * p.h * 0.82;
      const x = p.x0 + i * (bw + gap);
      const grad = ctx.createLinearGradient(0, p.y1 - h, 0, p.y1);
      grad.addColorStop(0, 'rgba(244, 63, 94, 0.9)');
      grad.addColorStop(1, 'rgba(254, 205, 211, 0.92)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, p.y1 - h, bw, h, [8, 8, 0, 0]);
      else ctx.rect(x, p.y1 - h, bw, h);
      ctx.fill();
    }
    // 平滑曲线
    ctx.beginPath();
    for (let i = 0; i < 160; i++) {
      const t = i / 159;
      const x = (t * bins - (bins - 1) / 2) / (bins * 0.22);
      const yv = Math.exp(-0.5 * x * x) / Math.exp(-0.5 * 0);
      const px = p.x0 + t * p.w;
      const py = p.y1 - yv * p.h * 0.82;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#be123c';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }

  function donutPanel(ctx) {
    base(ctx);
    const cx = W / 2, cy = H / 2 + 8;
    const R = 292, inner = 158;
    const segments = [
      { v: 0.37, color: '#0d9488' },
      { v: 0.27, color: '#f59e0b' },
      { v: 0.21, color: '#6366f1' },
      { v: 0.15, color: '#f43f5e' }
    ];
    let angle = -Math.PI / 2;
    const gap = 0.025;
    ctx.save();
    for (let i = 0; i < segments.length; i++) {
      const sweep = segments[i].v * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, angle + gap / 2, angle + sweep - gap / 2);
      ctx.arc(cx, cy, inner, angle + sweep - gap / 2, angle + gap / 2, true);
      ctx.closePath();
      ctx.fillStyle = segments[i].color;
      ctx.fill();
      angle += sweep;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, inner - 18, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    // 中心数值
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 104px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('4', cx, cy - 8);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 30px "Segoe UI", Arial, sans-serif';
    ctx.fillText('GROUPS', cx, cy + 64);
    ctx.restore();
  }

  FP.generateDemoCells = async function (count) {
    const makers = [
      function (ctx) { base(ctx); linePanel(ctx, 11); },
      function (ctx) { base(ctx); scatterPanel(ctx, 23); },
      function (ctx) { base(ctx); barPanel(ctx, 37); },
      function (ctx) { base(ctx); heatPanel(ctx, 41); },
      function (ctx) { base(ctx); histPanel(ctx, 59); },
      function (ctx) { donutPanel(ctx); }
    ];
    const cells = [];
    for (let i = 0; i < makers.length; i++) {
      const canvas = makeCanvas();
      const ctx = canvas.getContext('2d');
      makers[i](ctx);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      await FP.getImage(dataUrl).catch(function () { return null; });
      cells.push({
        name: '示例图-' + (i + 1) + '.jpg',
        type: 'image/jpeg',
        dataUrl: dataUrl,
        width: W,
        height: H,
        bytes: Math.round(dataUrl.length * 0.75),
        fit: 'inherit',
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        customLabel: ''
      });
    }
    return cells.slice(0, Math.max(1, Math.min(6, count || 6)));
  };
})();
