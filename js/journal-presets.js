/* FigurePlay 期刊配置库：常见期刊版式尺寸。应用时保留当前网格/图片，只调整页面与导出参数。 */
(function () {
  'use strict';
  const PRESETS = [
    {
      id: 'nature-single', group: 'Nature', name: 'Nature 单栏',
      widthMm: 89, aspectW: 4, aspectH: 3, colGap: 2, rowGap: 2,
      label: { fontFamily: 'arial', fontSizePt: 8, insetMm: 1.2 },
      exportOpts: { format: 'pdf', dpi: 300, trimPdf: true, trimMarginMm: 0 },
      description: 'Nature 单栏图常见 89 mm 宽；Arial 8pt 编号，300 DPI PDF。'
    },
    {
      id: 'nature-double', group: 'Nature', name: 'Nature 双栏',
      widthMm: 183, aspectW: 4, aspectH: 3, colGap: 2, rowGap: 2,
      label: { fontFamily: 'arial', fontSizePt: 8, insetMm: 1.2 },
      exportOpts: { format: 'pdf', dpi: 300, trimPdf: true, trimMarginMm: 0 },
      description: 'Nature 双栏跨页图常见 183 mm 宽；Arial 8pt。'
    },
    {
      id: 'ieee-single', group: 'IEEE', name: 'IEEE 单栏',
      widthMm: 88.9, aspectW: 4, aspectH: 3, colGap: 2, rowGap: 2,
      label: { fontFamily: 'times', fontSizePt: 8, insetMm: 1.2 },
      exportOpts: { format: 'pdf', dpi: 300, trimPdf: true, trimMarginMm: 0 },
      description: 'IEEE 单栏 3.5 in（88.9 mm）；Times 8pt 编号。'
    },
    {
      id: 'ieee-double', group: 'IEEE', name: 'IEEE 双栏',
      widthMm: 181, aspectW: 4, aspectH: 3, colGap: 2, rowGap: 2,
      label: { fontFamily: 'times', fontSizePt: 8, insetMm: 1.2 },
      exportOpts: { format: 'pdf', dpi: 300, trimPdf: true, trimMarginMm: 0 },
      description: 'IEEE 双栏 7.16 in（181 mm）；Times 8pt。'
    },
    {
      id: 'elsevier-single', group: 'Elsevier', name: 'Elsevier 单栏',
      widthMm: 90, aspectW: 4, aspectH: 3, colGap: 2, rowGap: 2,
      label: { fontFamily: 'arial', fontSizePt: 8, insetMm: 1.2 },
      exportOpts: { format: 'pdf', dpi: 300, trimPdf: true, trimMarginMm: 0 },
      description: 'Elsevier 单栏约 90 mm；Arial 8pt。'
    },
    {
      id: 'elsevier-1.5', group: 'Elsevier', name: 'Elsevier 1.5 栏',
      widthMm: 140, aspectW: 4, aspectH: 3, colGap: 2, rowGap: 2,
      label: { fontFamily: 'arial', fontSizePt: 8, insetMm: 1.2 },
      exportOpts: { format: 'pdf', dpi: 300, trimPdf: true, trimMarginMm: 0 },
      description: 'Elsevier 1.5 栏约 140 mm；Arial 8pt。'
    },
    {
      id: 'elsevier-double', group: 'Elsevier', name: 'Elsevier 双栏',
      widthMm: 190, aspectW: 4, aspectH: 3, colGap: 2, rowGap: 2,
      label: { fontFamily: 'arial', fontSizePt: 8, insetMm: 1.2 },
      exportOpts: { format: 'pdf', dpi: 300, trimPdf: true, trimMarginMm: 0 },
      description: 'Elsevier 双栏约 190 mm；Arial 8pt。'
    },
    {
      id: 'science-single', group: 'Science', name: 'Science 单栏',
      widthMm: 55, aspectW: 4, aspectH: 3, colGap: 1.5, rowGap: 1.5,
      label: { fontFamily: 'arial', fontSizePt: 7, insetMm: 1 },
      exportOpts: { format: 'pdf', dpi: 300, trimPdf: true, trimMarginMm: 0 },
      description: 'Science 单栏窄图约 55 mm；Arial 7pt 编号。'
    },
    {
      id: 'science-double', group: 'Science', name: 'Science 双栏',
      widthMm: 183, aspectW: 4, aspectH: 3, colGap: 2, rowGap: 2,
      label: { fontFamily: 'arial', fontSizePt: 8, insetMm: 1.2 },
      exportOpts: { format: 'pdf', dpi: 300, trimPdf: true, trimMarginMm: 0 },
      description: 'Science 双栏跨页图约 183 mm；Arial 8pt。'
    },
    {
      id: 'thesis-170', group: '学位论文', name: '中文学位论文 170mm',
      widthMm: 170, aspectW: 4, aspectH: 3, colGap: 2, rowGap: 2,
      label: { fontFamily: 'times', fontSizePt: 9, insetMm: 1.5 },
      exportOpts: { format: 'pdf', dpi: 300, trimPdf: true, trimMarginMm: 0 },
      description: '常见中文学位论文双栏宽 170 mm；Times 9pt 编号。'
    },
    {
      id: 'thesis-120', group: '学位论文', name: '中文学位论文 120mm',
      widthMm: 120, aspectW: 4, aspectH: 3, colGap: 2, rowGap: 2,
      label: { fontFamily: 'times', fontSizePt: 8.5, insetMm: 1.4 },
      exportOpts: { format: 'pdf', dpi: 300, trimPdf: true, trimMarginMm: 0 },
      description: '单栏/1.5 栏论文常用 120 mm；Times 8.5pt。'
    }
  ];

  const el = {};
  function api() { return window.__FIGPLAY__; }
  function openDialog() {
    render();
    if (typeof el.dialog.showModal === 'function') el.dialog.showModal();
    else el.dialog.setAttribute('open', '');
  }
  function closeDialog() {
    if (typeof el.dialog.close === 'function') el.dialog.close();
    else el.dialog.removeAttribute('open');
  }
  function render() {
    if (!el.list) return;
    el.list.innerHTML = '';
    const groups = {};
    PRESETS.forEach(function (p) {
      if (!groups[p.group]) groups[p.group] = [];
      groups[p.group].push(p);
    });
    Object.keys(groups).forEach(function (groupName) {
      const title = document.createElement('div');
      title.className = 'journal-group-title';
      title.textContent = groupName;
      el.list.appendChild(title);
      const grid = document.createElement('div');
      grid.className = 'journal-grid';
      groups[groupName].forEach(function (preset) {
        const card = document.createElement('div');
        card.className = 'journal-card';
        const name = document.createElement('b');
        name.textContent = preset.name;
        const size = document.createElement('span');
        size.className = 'journal-size';
        size.textContent = preset.widthMm + ' mm · ' + preset.aspectW + ':' + preset.aspectH;
        const desc = document.createElement('p');
        desc.textContent = preset.description;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-primary';
        btn.textContent = '套用';
        btn.addEventListener('click', function () { apply(preset); });
        card.appendChild(name); card.appendChild(size); card.appendChild(desc); card.appendChild(btn);
        grid.appendChild(card);
      });
      el.list.appendChild(grid);
    });
  }
  function apply(preset) {
    if (!api()) return;
    try {
      const snap = api().getConfigSnapshot();
      const layout = Object.assign({}, snap.layout, {
        widthMm: preset.widthMm,
        aspectW: preset.aspectW,
        aspectH: preset.aspectH,
        colGap: preset.colGap,
        rowGap: preset.rowGap
      });
      const label = Object.assign({}, snap.label, preset.label, { show: true });
      const exp = Object.assign({}, snap.export, preset.exportOpts);
      api().applyConfigSnapshot({ layout: layout, label: label, export: exp });
      closeDialog();
      FP.toast('已套用 ' + preset.name + '（' + preset.widthMm + ' mm）', 'success', 3200);
    } catch (e) {
      FP.toast('套用期刊配置失败：' + (e.message || e), 'error', 5000);
    }
  }
  function init() {
    el.dialog = document.getElementById('journal-dialog');
    el.list = document.getElementById('journal-list');
    el.close = document.getElementById('journal-dialog-close');
    el.openBtn = document.getElementById('btn-journal-presets');
    if (!el.dialog || !el.list || !el.openBtn) return;
    el.openBtn.addEventListener('click', openDialog);
    if (el.close) el.close.addEventListener('click', closeDialog);
    el.dialog.addEventListener('click', function (e) { if (e.target === el.dialog) closeDialog(); });
  }
  window.__JOURNAL_PRESETS__ = { list: PRESETS, apply: apply, open: openDialog };
  function whenReady() {
    if (window.__FIGPLAY__ && window.FP) init();
    else setTimeout(whenReady, 100);
  }
  whenReady();
})();
