/* FigurePlay · 应用主逻辑（v1.1：合并单元格 / 模板 / 批量编号 / 粘贴小画布 / 桌面版桥） */
(function () {
  'use strict';
  const FP = window.FP;
  const $ = FP.$;
  const $$ = FP.$$;
  const MM_TO_CSS = FP.CSS_PX_PER_MM;
  const POSITIONS = [
    ['tl', '左上'], ['tc', '上中'], ['tr', '右上'],
    ['ml', '左中'], ['mc', '居中'], ['mr', '右中'],
    ['bl', '左下'], ['bc', '下中'], ['br', '右下']
  ];
  const PRESETS = [[1, 2], [1, 3], [1, 6], [2, 2], [2, 3], [3, 2], [2, 4], [3, 3], [2, 6]];
  const EXPORT_NOTES = {
    png: 'PNG 无损位图；勾选“透明背景”可导出透明底 PNG。',
    jpg: 'JPG 不支持透明，背景使用当前背景色（默认白色）；可用质量滑块控制体积。',
    svg: 'SVG 中的编号是可编辑矢量文字，图片以原始数据内嵌；可透明背景。',
    pdf: 'PDF 按成品毫米尺寸生成；桌面版检测到 MATLAB EMF 时会优先输出矢量 PDF。可选自动裁剪白边（类似 pdfcrop）。'
  };
  const TEMPLATES = [
    {
      id: 'single-1', name: '单栏 · 单图', desc: '85 mm 单栏 · 1 行 × 1 列',
      widthMm: 85, rows: 1, cols: 1, merges: [], colGap: 0, rowGap: 0, margin: 0,
      aspectW: 4, aspectH: 3, fontSizePt: 8, insetMm: 1.2
    },
    {
      id: 'single-2v', name: '单栏 · 上下两图', desc: '85 mm 单栏 · 2 行 × 1 列',
      widthMm: 85, rows: 2, cols: 1, merges: [], colGap: 0, rowGap: 2, margin: 0,
      aspectW: 4, aspectH: 3, fontSizePt: 8, insetMm: 1.2
    },
    {
      id: 'single-15-2x2', name: '1.5 栏 · 2×2', desc: '120 mm · 2 行 × 2 列',
      widthMm: 120, rows: 2, cols: 2, merges: [], colGap: 2, rowGap: 2, margin: 0,
      aspectW: 4, aspectH: 3, fontSizePt: 8.5, insetMm: 1.4
    },
    {
      id: 'double-2x3', name: '双栏 · 2×3', desc: '170 mm 双栏 · 2 行 × 3 列',
      widthMm: 170, rows: 2, cols: 3, merges: [], colGap: 2, rowGap: 2, margin: 0,
      aspectW: 4, aspectH: 3, fontSizePt: 9, insetMm: 1.5
    },
    {
      id: 'double-3x2', name: '双栏 · 3×2', desc: '170 mm 双栏 · 3 行 × 2 列',
      widthMm: 170, rows: 3, cols: 2, merges: [], colGap: 2, rowGap: 2, margin: 0,
      aspectW: 4, aspectH: 3, fontSizePt: 9, insetMm: 1.5
    },
    {
      id: 'double-2x2', name: '双栏 · 2×2', desc: '170 mm 双栏 · 2 行 × 2 列',
      widthMm: 170, rows: 2, cols: 2, merges: [], colGap: 2, rowGap: 2, margin: 0,
      aspectW: 4, aspectH: 3, fontSizePt: 9, insetMm: 1.5
    },
    {
      id: 'double-1plus3', name: '双栏 · 大图 + 三小图', desc: '170 mm · 2×3，首行跨 3 列',
      widthMm: 170, rows: 2, cols: 3, merges: [{ r: 0, c: 0, rs: 1, cs: 3 }],
      colGap: 2, rowGap: 2, margin: 0, aspectW: 4, aspectH: 3, fontSizePt: 9, insetMm: 1.5
    },
    {
      id: 'double-left-big', name: '双栏 · 左大图 + 右四图', desc: '170 mm · 2×3，左列跨 2 行',
      widthMm: 170, rows: 2, cols: 3, merges: [{ r: 0, c: 0, rs: 2, cs: 1 }],
      colGap: 2, rowGap: 2, margin: 0, aspectW: 4, aspectH: 3, fontSizePt: 9, insetMm: 1.5
    }
  ];

  /* ================= 状态 ================= */
  function defaultLayout() {
    return {
      rows: 3, cols: 2,
      widthMm: 170,
      aspectW: 4, aspectH: 3,
      colGap: 2, rowGap: 2, margin: 0,
      bgMode: 'white', bgColor: '#ffffff',
      borderOn: false, borderWidth: 0.25, borderColor: '#000000',
      fit: 'contain',
      merges: [],
      autoPad: true,
      padTopMm: 0, padRightMm: 0, padBottomMm: 0, padLeftMm: 0
    };
  }

  function defaultLabel() {
    return {
      show: true,
      scheme: 'alpha-paren',
      start: 1,
      order: 'row',
      skipEmpty: true,
      position: 'tl',
      insetMm: 1.5,
      offsetXmm: 0,
      offsetYmm: 0,
      fontFamily: 'times',
      fontSizePt: 9,
      bold: false,
      italic: false,
      color: '#000000',
      bg: 'none',
      bgColor: '#ffffff',
      bgOpacity: 0.75
    };
  }

  function defaultExport() {
    return {
      filename: 'figure',
      format: 'png',
      dpi: 300,
      jpgQuality: 0.95,
      transparent: false,
      scope: 'current',
      saveAs: true,
      vectorPdf: true,
      trimPdf: false,
      trimMarginMm: 0
    };
  }

  function defaultPage(name) {
    return {
      id: FP.uid('page'),
      name: name || '图 1',
      layout: defaultLayout(),
      cells: new Array(6).fill(null),
      label: defaultLabel(),
      groups: []
    };
  }

  function defaultProject() {
    return {
      version: 2,
      pages: [defaultPage('图 1')],
      current: 0,
      export: defaultExport()
    };
  }

  function pageState(page, exportSettings) {
    return {
      layout: page.layout,
      cells: page.cells,
      label: page.label,
      groups: page.groups || [],
      export: exportSettings,
      selectedCell: null
    };
  }

  function validColor(value, fallback) {
    return /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? String(value).toLowerCase() : fallback;
  }

  function normalizeCell(raw) {
    if (!raw || typeof raw !== 'object' || !raw.dataUrl) return null;
    const rotation = Number(raw.rotation);
    return {
      name: String(raw.name || 'image'),
      type: String(raw.type || 'image/png'),
      dataUrl: String(raw.dataUrl),
      width: FP.clamp(FP.toInt(raw.width, 1), 1, 200000),
      height: FP.clamp(FP.toInt(raw.height, 1), 1, 200000),
      bytes: Math.max(0, Number(raw.bytes) || 0),
      fit: ['inherit', 'contain', 'cover', 'stretch'].indexOf(raw.fit) >= 0 ? raw.fit : 'inherit',
      zoom: FP.clamp(Number(raw.zoom) || 1, 0.05, 20),
      offsetX: FP.clamp(Number(raw.offsetX) || 0, -2000, 2000),
      offsetY: FP.clamp(Number(raw.offsetY) || 0, -2000, 2000),
      rotation: [0, 90, 180, 270].indexOf(rotation) >= 0 ? rotation : 0,
      customLabel: String(raw.customLabel || '').slice(0, 24),
      emfBase64: typeof raw.emfBase64 === 'string' ? raw.emfBase64 : '',
      sourceFormat: String(raw.sourceFormat || '')
    };
  }

  function normalizeLayout(raw) {
    const layout = Object.assign({}, defaultLayout(), raw || {});
    layout.rows = FP.clamp(FP.toInt(layout.rows, 3), 1, 500);
    layout.cols = FP.clamp(FP.toInt(layout.cols, 2), 1, 500);
    if (layout.rows * layout.cols > FP.MAX_CELLS) {
      layout.cols = Math.max(1, Math.floor(FP.MAX_CELLS / layout.rows));
    }
    layout.widthMm = FP.clamp(layout.widthMm, 20, 500);
    layout.aspectW = FP.clamp(layout.aspectW, 0.2, 10);
    layout.aspectH = FP.clamp(layout.aspectH, 0.2, 10);
    layout.colGap = FP.clamp(layout.colGap, -50, 80);
    layout.rowGap = FP.clamp(layout.rowGap, -50, 80);
    layout.margin = FP.clamp(layout.margin, 0, 80);
    layout.bgMode = layout.bgMode === 'custom' ? 'custom' : 'white';
    layout.bgColor = validColor(layout.bgColor, '#ffffff');
    layout.borderOn = !!layout.borderOn;
    layout.borderWidth = FP.clamp(layout.borderWidth, 0.05, 2);
    layout.borderColor = validColor(layout.borderColor, '#000000');
    layout.fit = ['contain', 'cover', 'stretch'].indexOf(layout.fit) >= 0 ? layout.fit : 'contain';
    layout.autoPad = layout.autoPad !== false;
    layout.padTopMm = FP.clamp(Number(layout.padTopMm) || 0, 0, 200);
    layout.padRightMm = FP.clamp(Number(layout.padRightMm) || 0, 0, 200);
    layout.padBottomMm = FP.clamp(Number(layout.padBottomMm) || 0, 0, 200);
    layout.padLeftMm = FP.clamp(Number(layout.padLeftMm) || 0, 0, 200);
    layout.merges = FP.normalizeMerges(layout.merges, layout.rows, layout.cols);
    return layout;
  }

  function normalizeLabel(raw) {
    const label = Object.assign({}, defaultLabel(), raw || {});
    label.show = !!label.show;
    label.scheme = FP.schemeById(label.scheme).id;
    label.start = FP.clamp(FP.toInt(label.start, 1), 1, 999);
    label.order = label.order === 'col' ? 'col' : 'row';
    label.skipEmpty = !!label.skipEmpty;
    label.position = FP.POS_TO_ALIGN[label.position] ? label.position : 'tl';
    label.insetMm = FP.clamp(label.insetMm, 0, 20);
    label.offsetXmm = FP.clamp(label.offsetXmm, -100, 100);
    label.offsetYmm = FP.clamp(label.offsetYmm, -100, 100);
    label.fontFamily = FP.FONT_STACKS[label.fontFamily] ? label.fontFamily : 'times';
    label.fontSizePt = FP.clamp(label.fontSizePt, 4, 72);
    label.bold = !!label.bold;
    label.italic = !!label.italic;
    label.color = validColor(label.color, '#000000');
    label.bg = ['none', 'white', 'black', 'custom'].indexOf(label.bg) >= 0 ? label.bg : 'none';
    label.bgColor = validColor(label.bgColor, '#ffffff');
    label.bgOpacity = FP.clamp(label.bgOpacity, 0, 1);
    return label;
  }

  function normalizeExport(raw) {
    const exp = Object.assign({}, defaultExport(), raw || {});
    exp.format = FP.normalizeFormat(exp.format);
    exp.dpi = FP.clamp(FP.toInt(exp.dpi, 300), 36, 1200);
    exp.jpgQuality = FP.clamp(Number(exp.jpgQuality) || 0.95, 0.5, 1);
    exp.transparent = !!exp.transparent;
    exp.scope = exp.scope === 'all' ? 'all' : 'current';
    exp.saveAs = exp.saveAs !== false;
    exp.vectorPdf = exp.vectorPdf !== false;
    exp.trimPdf = !!exp.trimPdf;
    exp.trimMarginMm = FP.clamp(Number(exp.trimMarginMm) || 0, 0, 20);
    exp.filename = String(exp.filename || 'figure').slice(0, 80);
    return exp;
  }

  function normalizePage(raw, index) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const layout = normalizeLayout(raw.layout);
    const count = layout.rows * layout.cols;
    const rawCells = Array.isArray(raw.cells) ? raw.cells : [];
    const cells = new Array(count).fill(null);
    for (let i = 0; i < count; i++) cells[i] = normalizeCell(rawCells[i]);
    const label = normalizeLabel(raw.label);
    const groups = FP.sanitizeGroups(raw.groups, FP.computeGeometry(layout));
    return {
      id: String(raw.id || FP.uid('page')),
      name: String(raw.name || ('图 ' + (index + 1))).slice(0, 24),
      layout: layout,
      cells: cells,
      label: label,
      groups: groups
    };
  }

  function normalizeProject(raw) {
    const exp = normalizeExport(raw && raw.export);
    let rawPages = [];
    if (raw && Array.isArray(raw.pages) && raw.pages.length) rawPages = raw.pages;
    else if (raw && (raw.layout || raw.cells)) rawPages = [raw];
    else rawPages = [{}];
    const pages = rawPages.slice(0, 20).map(function (p, i) { return normalizePage(p, i); });
    if (!pages.length) pages.push(normalizePage({}, 0));
    return {
      version: 2,
      pages: pages,
      current: FP.clamp(FP.toInt(raw && raw.current, 0), 0, pages.length - 1),
      export: exp
    };
  }

  function syncPage() {
    const page = project.pages[project.current];
    if (!page) return;
    page.layout = state.layout;
    page.cells = state.cells;
    page.label = state.label;
    page.groups = state.groups || [];
    project.export = state.export;
  }

  function currentPage() {
    return project.pages[project.current];
  }

  /* ================= 运行时变量 ================= */
  let project = defaultProject();
  let state = pageState(project.pages[0], project.export);
  let geom = FP.computeGeometry(state.layout);
  let preview = null;
  let currentLabels = [];
  const el = {};
  let pendingTarget = null;
  let fitMode = true;
  let currentPct = 100;
  let previewScheduled = false;
  let fullRenderScheduled = false;
  let saveTimer = null;
  let saveWarned = false;
  let exportBusy = false;
  let pan = null;
  let suppressClick = false;
  let dragDepth = 0;
  let filmDragIndex = null;
  let ready = false;
  let api = null;
  let stageObserver = null;
  let multiSelect = [];
  let templatesBuilt = false;
  let pasteTargetIndex = null;
  let pendingPasteCell = null;
  let pasteBusy = false;
  let pasteRequestToken = 0;
  let batchTargets = [];
  let historyPast = [];
  let historyFuture = [];
  let historyLast = null;
  let historyLastSig = '';
  let historyTimer = null;
  let historySuspended = false;
  let groupDialogMode = 'create';
  let groupEditingId = null;
  let groupDraftPanels = [];

  /* ================= DOM 缓存 ================= */
  function cacheEls() {
    const byId = function (id) { return document.getElementById(id); };
    el.svg = byId('preview-svg');
    el.stage = byId('stage');
    el.shell = byId('figure-shell');
    el.filmstrip = byId('filmstrip');
    el.matrix = byId('matrix-picker');
    el.matrixCaption = byId('matrix-caption');
    el.preset = byId('preset-chips');
    el.mergeList = byId('merge-list');
    el.rows = byId('rows-input');
    el.cols = byId('cols-input');
    el.width = byId('width-input');
    el.aspectW = byId('aspect-w');
    el.aspectH = byId('aspect-h');
    el.colGap = byId('col-gap');
    el.rowGap = byId('row-gap');
    el.margin = byId('margin-input');
    el.bgMode = byId('bg-mode');
    el.bgColor = byId('bg-color');
    el.bgColorRow = byId('bg-color-row');
    el.bgColorHex = byId('bg-color-hex');
    el.borderOn = byId('border-on');
    el.borderWidth = byId('border-width');
    el.borderColor = byId('border-color');
    el.borderOptions = byId('border-options');
    el.globalFit = byId('global-fit');
    el.figHeight = byId('fig-height');
    el.cellSize = byId('cell-size');
    el.layoutBadge = byId('layout-badge');
    el.dimsBadge = byId('dims-badge');
    el.statusText = byId('status-text');
    el.statusDims = byId('status-dims');
    el.onboardHint = byId('onboard-hint');
    el.zoomOut = byId('zoom-out');
    el.zoomFit = byId('zoom-fit');
    el.zoom100 = byId('zoom-100');
    el.zoomIn = byId('zoom-in');
    el.zoomLabel = byId('zoom-label');
    el.btnUpload = byId('btn-upload');
    el.btnPaste = byId('btn-paste');
    el.btnDemo = byId('btn-demo');
    el.btnClear = byId('btn-clear');
    el.btnTemplates = byId('btn-templates');
    el.fileInput = byId('file-input');
    el.toast = byId('toast');
    el.dropOverlay = byId('drop-overlay');
    el.btnHelp = byId('btn-help');
    el.helpDialog = byId('help-dialog');
    el.helpClose = byId('help-close');
    el.btnExportTop = byId('btn-export-top');
    el.desktopBadge = byId('desktop-badge');

    el.labelShow = byId('label-show');
    el.labelOptions = byId('label-options');
    el.labelScheme = byId('label-scheme');
    el.schemePreview = byId('scheme-preview');
    el.labelStart = byId('label-start');
    el.labelOrder = byId('label-order');
    el.labelSkipEmpty = byId('label-skip-empty');
    el.posPicker = byId('pos-picker');
    el.labelInset = byId('label-inset');
    el.labelOffsetX = byId('label-offset-x');
    el.labelOffsetY = byId('label-offset-y');
    el.labelFont = byId('label-font');
    el.labelSize = byId('label-size');
    el.labelBold = byId('label-bold');
    el.labelItalic = byId('label-italic');
    el.labelColor = byId('label-color');
    el.labelBg = byId('label-bg');
    el.labelBgColorRow = byId('label-bg-color-row');
    el.labelBgColor = byId('label-bg-color');
    el.labelBgOpacityRow = byId('label-bg-opacity-row');
    el.labelBgOpacity = byId('label-bg-opacity');
    el.labelBgOpacityVal = byId('label-bg-opacity-num');

    el.cellIndexLabel = byId('cell-index-label');
    el.cellHint = byId('cell-hint');
    el.cellControls = byId('cell-controls');
    el.cellMeta = byId('cell-meta');
    el.cellFit = byId('cell-fit');
    el.cellZoom = byId('cell-zoom');
    el.cellZoomVal = byId('cell-zoom-num');
    el.cellOffsetX = byId('cell-offset-x');
    el.cellOffsetY = byId('cell-offset-y');
    el.cellRotation = byId('cell-rotation');
    el.cellCustomLabel = byId('cell-custom-label');
    el.cellPaste = byId('cell-paste');
    el.cellReplace = byId('cell-replace');
    el.cellSplit = byId('cell-split');
    el.cellClear = byId('cell-clear');
    el.cellPrev = byId('cell-prev');
    el.cellNext = byId('cell-next');
    el.multiControls = byId('multi-controls');
    el.multiCount = byId('multi-count');
    el.multiMergeHint = byId('multi-merge-hint');
    el.multiMerge = byId('multi-merge');
    el.multiBatchLabel = byId('multi-batch-label');
    el.multiCancel = byId('multi-cancel');

    el.filename = byId('filename-input');
    el.formatButtons = byId('format-buttons');
    el.dpiRow = byId('dpi-row');
    el.dpiInput = byId('dpi-input');
    el.dpiChips = byId('dpi-chips');
    el.jpgQuality = byId('jpg-quality');
    el.jpgQualityVal = byId('jpg-quality-num');
    el.transparentRow = byId('transparent-row');
    el.transparentToggle = byId('transparent-toggle');
    el.saveAsToggle = byId('save-as-toggle');
    el.vectorPdfRow = byId('vector-pdf-row');
    el.vectorPdfToggle = byId('vector-pdf-toggle');
    el.pdfTrimRow = byId('pdf-trim-row');
    el.pdfTrimToggle = byId('pdf-trim-toggle');
    el.pdfTrimMarginRow = byId('pdf-trim-margin-row');
    el.pdfTrimMargin = byId('pdf-trim-margin');
    el.pdfTrimSafetyHint = byId('pdf-trim-safety-hint');
    el.exportReadout = byId('export-readout');
    el.btnExport = byId('btn-export');
    el.btnExportText = byId('btn-export-text');
    el.exportNote = byId('export-note');

    el.templateDialog = byId('template-dialog');
    el.templateGrid = byId('template-grid');
    el.templateClose = byId('template-close');

    el.pasteDialog = byId('paste-dialog');
    el.pasteTitle = byId('paste-title');
    el.pasteTargetLabel = byId('paste-target-label');
    el.pasteZone = byId('paste-zone');
    el.pasteIdle = byId('paste-idle');
    el.pastePreview = byId('paste-preview');
    el.pasteFrame = byId('paste-frame');
    el.pastePreviewImg = byId('paste-preview-img');
    el.pasteMeta = byId('paste-meta');
    el.pasteStatus = byId('paste-status');
    el.pasteReadClipboard = byId('paste-read-clipboard');    el.pastePickFile = byId('paste-pick-file');
    el.pasteFileInput = byId('paste-file-input');
    el.pasteRetry = byId('paste-retry');
    el.pasteCancel = byId('paste-cancel');
    el.pasteConfirm = byId('paste-confirm');
    el.pasteContinue = byId('paste-continue');
    el.pasteClose = byId('paste-close');
    el.pasteTip = byId('paste-tip');

    el.batchDialog = byId('batch-label-dialog');
    el.batchScheme = byId('batch-scheme');
    el.batchStart = byId('batch-start');
    el.batchPreview = byId('batch-preview');
    el.batchApply = byId('batch-apply');
    el.batchClear = byId('batch-clear');
    el.batchClose = byId('batch-close');

    el.pageTabs = byId('page-tabs');    el.btnPageAdd = byId('btn-page-add');
    el.btnPageDup = byId('btn-page-dup');
    el.btnPageDel = byId('btn-page-del');
    el.btnUndo = byId('btn-undo');
    el.btnRedo = byId('btn-redo');
    el.exportScopeRow = byId('export-scope-row');
    el.exportScopeSeg = byId('export-scope-seg');
    el.exportScopeNote = byId('export-scope-note');
    el.groupCount = byId('group-count');
    el.groupList = byId('group-list');
    el.btnGroupCreate = byId('btn-group-create');
    el.groupDialog = byId('group-dialog');
    el.groupDialogTitle = byId('group-dialog-title');
    el.groupDialogDesc = byId('group-dialog-desc');
    el.groupName = byId('group-name');
    el.groupScheme = byId('group-scheme');
    el.groupStart = byId('group-start');
    el.groupPreview = byId('group-preview');
    el.groupSave = byId('group-save');
    el.groupCancel = byId('group-cancel');
    el.groupClose = byId('group-close');
    el.autoPadToggle = byId('auto-pad-toggle');
    el.padReadout = byId('pad-readout');
    el.padManual = byId('pad-manual');
    el.padTop = byId('pad-top');
    el.padRight = byId('pad-right');
    el.padBottom = byId('pad-bottom');
    el.padLeft = byId('pad-left');

    // 浏览器模式下移除“读取系统剪贴板”按钮，仅桌面版显示（避免误导）
    if (el.pasteReadClipboard) {
      if (FP.desktop && FP.desktop.available) {
        el.pasteReadClipboard.hidden = false;
      } else if (el.pasteReadClipboard.parentNode) {
        el.pasteReadClipboard.parentNode.removeChild(el.pasteReadClipboard);
      }
    }
  }

  /* ================= 工具方法 ================= */
  function panelAt(index) {
    return FP.getPanel(geom, index);
  }

  function panelOrder(order) {
    return FP.orderPanels(geom, order || 'row');
  }

  function anyFilled() {
    return geom.panels.some(function (p) { return !!state.cells[p.index]; });
  }

  function firstEmptyPanel() {
    const list = panelOrder('row');
    for (let i = 0; i < list.length; i++) {
      if (!state.cells[list[i].index]) return list[i].index;
    }
    return null;
  }

  function targetPanelForPaste() {
    if (multiSelect.length === 0 && state.selectedCell != null && panelAt(state.selectedCell)) {
      return state.selectedCell;
    }
    const empty = firstEmptyPanel();
    if (empty != null) return empty;
    const list = panelOrder('row');
    return list.length ? list[0].index : null;
  }

  function nextEmptyPanelAfter(anchor) {
    const list = panelOrder('row');
    const pos = list.findIndex(function (p) { return p.index === anchor; });
    if (pos < 0) return firstEmptyPanel();
    for (let k = 1; k < list.length; k++) {
      const p = list[(pos + k) % list.length];
      if (p.index !== anchor && !state.cells[p.index]) return p.index;
    }
    return null;
  }

  function setStatus(message) {
    el.statusText.textContent = message;
  }

  function setNodeValue(node, value) {
    if (!node) return;
    if (document.activeElement === node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA')) {
      if (node.type === 'text' || node.type === 'number' || node.tagName === 'TEXTAREA') return;
    }
    const str = String(value);
    if (node.value !== str) node.value = str;
  }

  function setChecked(node, value) {
    if (node) node.checked = !!value;
  }

  /* ================= 静态 UI 构建 ================= */
  function buildMatrix() {
    const frag = document.createDocumentFragment();
    for (let r = 1; r <= 6; r++) {
      for (let c = 1; c <= 6; c++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mx';
        b.dataset.r = String(r);
        b.dataset.c = String(c);
        b.title = r + ' 行 × ' + c + ' 列';
        b.setAttribute('aria-label', r + ' 行 ' + c + ' 列');
        frag.appendChild(b);
      }
    }
    el.matrix.innerHTML = '';
    el.matrix.appendChild(frag);
  }

  function buildPresets() {
    el.preset.innerHTML = '';
    PRESETS.forEach(function (pair) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.rows = String(pair[0]);
      b.dataset.cols = String(pair[1]);
      b.textContent = pair[0] + '×' + pair[1];
      b.title = pair[0] + ' 行 × ' + pair[1] + ' 列';
      el.preset.appendChild(b);
    });
  }

  function buildPosPicker() {
    el.posPicker.innerHTML = '';
    POSITIONS.forEach(function (pair) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pos-btn';
      b.dataset.pos = pair[0];
      b.title = '编号位置：' + pair[1];
      b.setAttribute('aria-label', pair[1]);
      const dot = document.createElement('span');
      dot.className = 'dot';
      b.appendChild(dot);
      el.posPicker.appendChild(b);
    });
  }

  function buildSchemeSelect() {
    el.labelScheme.innerHTML = '';
    FP.LABEL_SCHEMES.forEach(function (scheme) {
      const opt = document.createElement('option');
      opt.value = scheme.id;
      opt.textContent = scheme.name;
      el.labelScheme.appendChild(opt);
    });
  }

  function buildBatchSchemeSelect() {
    el.batchScheme.innerHTML = '';
    FP.LABEL_SCHEMES.forEach(function (scheme) {
      const opt = document.createElement('option');
      opt.value = scheme.id;
      opt.textContent = scheme.name;
      el.batchScheme.appendChild(opt);
    });
  }

  function buildGroupSchemeSelect() {
    el.groupScheme.innerHTML = '';
    FP.LABEL_SCHEMES.forEach(function (scheme) {
      const opt = document.createElement('option');
      opt.value = scheme.id;
      opt.textContent = scheme.name;
      el.groupScheme.appendChild(opt);
    });
  }

  function buildTemplateCards() {
    if (templatesBuilt) return;
    templatesBuilt = true;
    el.templateGrid.innerHTML = '';
    TEMPLATES.forEach(function (tpl) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'template-card';
      card.dataset.template = tpl.id;

      const preview = document.createElement('div');
      preview.className = 'tpl-preview';
      preview.style.gridTemplateColumns = 'repeat(' + tpl.cols + ', minmax(0, 1fr))';
      preview.style.gridTemplateRows = 'repeat(' + tpl.rows + ', minmax(0, 1fr))';
      const layout = {
        rows: tpl.rows, cols: tpl.cols, widthMm: 170,
        aspectW: tpl.aspectW, aspectH: tpl.aspectH,
        colGap: tpl.colGap, rowGap: tpl.rowGap, margin: 0, merges: tpl.merges
      };
      const panels = FP.computeGeometry(layout).panels;
      panels.forEach(function (p) {
        const cell = document.createElement('div');
        cell.className = 'tpl-cell' + (p.merged ? ' merged' : '');
        cell.style.gridArea = (p.row + 1) + ' / ' + (p.col + 1) +
          ' / span ' + p.rowSpan + ' / span ' + p.colSpan;
        preview.appendChild(cell);
      });

      const info = document.createElement('div');
      info.className = 'tpl-info';
      const title = document.createElement('b');
      title.textContent = tpl.name;
      if (tpl.merges.length) {
        const tag = document.createElement('span');
        tag.className = 'tpl-tag';
        tag.textContent = '跨列';
        title.appendChild(tag);
      }
      const desc = document.createElement('span');
      desc.textContent = tpl.desc;
      info.appendChild(title);
      info.appendChild(desc);

      card.appendChild(preview);
      card.appendChild(info);
      el.templateGrid.appendChild(card);
    });
  }

  /* ================= 项目 / 图页 / 历史 / 分组 ================= */
  function loadPageIntoState(index) {
    const idx = FP.clamp(FP.toInt(index, 0), 0, project.pages.length - 1);
    project.current = idx;
    const page = project.pages[idx];
    state.layout = page.layout;
    state.cells = page.cells;
    state.label = page.label;
    state.groups = page.groups || [];
    state.export = project.export;
    state.selectedCell = null;
    multiSelect = [];
  }

  function pageFilledCount(page) {
    const g = FP.computeGeometry(page.layout);
    let n = 0;
    g.panels.forEach(function (panel) { if (page.cells[panel.index]) n++; });
    return n;
  }

  function updatePageTabs() {
    if (!el.pageTabs) return;
    el.pageTabs.innerHTML = '';
    project.pages.forEach(function (page, index) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'page-tab' + (index === project.current ? ' is-active' : '');
      tab.dataset.index = String(index);
      tab.title = page.name + '（双击重命名）';
      tab.setAttribute('role', 'tab');
      const label = document.createElement('span');
      label.textContent = page.name;
      tab.appendChild(label);
      const count = document.createElement('span');
      count.className = 'page-tab-count';
      count.textContent = '· ' + pageFilledCount(page) + ' 图';
      tab.appendChild(count);
      tab.addEventListener('click', function () { switchPage(index); });
      tab.addEventListener('dblclick', function (e) {
        e.preventDefault();
        renamePage(index);
      });
      el.pageTabs.appendChild(tab);
    });
    if (el.btnPageDel) el.btnPageDel.disabled = project.pages.length <= 1;
    if (el.btnPageDup) el.btnPageDup.disabled = project.pages.length >= 20;
    if (el.btnPageAdd) el.btnPageAdd.disabled = project.pages.length >= 20;
  }

  function switchPage(index) {
    const idx = FP.clamp(FP.toInt(index, 0), 0, project.pages.length - 1);
    if (idx === project.current) return;
    commitHistoryNow();
    syncPage();
    loadPageIntoState(idx);
    geom = FP.computeGeometry(state.layout);
    renderAll();
    historyLast = snapshotProject();
    historyLastSig = projectSignature();
    updateUndoRedoButtons();
    scheduleSave();
  }

  function addPage(mode) {
    if (project.pages.length >= 20) {
      FP.toast('最多支持 20 个图页', 'error');
      return;
    }
    commitHistoryNow();
    syncPage();
    const current = project.pages[project.current];
    const newPage = mode === 'duplicate'
      ? normalizePage({
          id: FP.uid('page'),
          name: current.name + ' 副本',
          layout: FP.deepClone(current.layout),
          cells: current.cells.map(function (c) { return c ? Object.assign({}, c) : null; }),
          label: FP.deepClone(current.label),
          groups: FP.deepClone(current.groups)
        }, project.pages.length)
      : normalizePage({
          id: FP.uid('page'),
          name: '图 ' + (project.pages.length + 1),
          layout: FP.deepClone(current.layout),
          cells: new Array(current.layout.rows * current.layout.cols).fill(null),
          label: FP.deepClone(current.label),
          groups: []
        }, project.pages.length);
    project.pages.splice(project.current + 1, 0, newPage);
    project.current = project.current + 1;
    loadPageIntoState(project.current);
    geom = FP.computeGeometry(state.layout);
    renderAll();
    updateUndoRedoButtons();
    scheduleSave();
    FP.toast((mode === 'duplicate' ? '已复制图页：' : '已新建图页：') + newPage.name, 'success');
  }

  function deletePage() {
    if (project.pages.length <= 1) {
      FP.toast('至少需要保留一个图页', 'error');
      return;
    }
    const page = project.pages[project.current];
    if (!window.confirm('删除「' + page.name + '」及其所有子图？该操作可以撤销。')) return;
    commitHistoryNow();
    project.pages.splice(project.current, 1);
    project.current = FP.clamp(project.current, 0, project.pages.length - 1);
    loadPageIntoState(project.current);
    geom = FP.computeGeometry(state.layout);
    renderAll();
    updateUndoRedoButtons();
    scheduleSave();
    FP.toast('已删除图页：' + page.name);
  }

  function renamePage(index) {
    const i = FP.clamp(FP.toInt(index, project.current), 0, project.pages.length - 1);
    const page = project.pages[i];
    const value = window.prompt('图页名称', page.name);
    if (value == null) return;
    const name = String(value).trim().slice(0, 24);
    if (!name) { FP.toast('名称不能为空', 'error'); return; }
    commitHistoryNow();
    page.name = name;
    renderAll();
    FP.toast('已重命名为「' + name + '」');
  }

  /* ---------------- 撤销 / 重做 ---------------- */
  function snapshotPage(page) {
    return {
      id: page.id,
      name: page.name,
      layout: FP.deepClone(page.layout),
      label: FP.deepClone(page.label),
      groups: FP.deepClone(page.groups || []),
      cells: page.cells.map(function (c) { return c ? Object.assign({}, c) : null; })
    };
  }

  function snapshotProject() {
    syncPage();
    return {
      version: 2,
      current: project.current,
      pages: project.pages.map(snapshotPage),
      export: FP.deepClone(project.export)
    };
  }

  function cellSignature(cell) {
    if (!cell) return '';
    const url = String(cell.dataUrl || '');
    return [
      cell.name, cell.width, cell.height, cell.bytes, cell.fit, cell.zoom,
      cell.offsetX, cell.offsetY, cell.rotation, cell.customLabel,
      url.length, url.slice(0, 24), url.slice(-16)
    ].join('~');
  }

  function projectSignature() {
    const parts = [];
    project.pages.forEach(function (page) {
      parts.push(JSON.stringify(page.layout));
      parts.push(JSON.stringify(page.label));
      parts.push(JSON.stringify(page.groups || []));
      parts.push(page.cells.map(cellSignature).join(','));
      parts.push(page.id + '#' + page.name);
    });
    parts.push(JSON.stringify(project.export || {}));
    return parts.join('|');
  }

  function updateUndoRedoButtons() {
    if (el.btnUndo) el.btnUndo.disabled = historyPast.length === 0;
    if (el.btnRedo) el.btnRedo.disabled = historyFuture.length === 0;
  }

  function restoreProjectSnapshot(snapshot) {
    historySuspended = true;
    const pages = snapshot.pages.map(function (p, i) { return normalizePage(p, i); });
    project = {
      version: 2,
      pages: pages,
      current: FP.clamp(FP.toInt(snapshot.current, 0), 0, pages.length - 1),
      export: normalizeExport(snapshot.export)
    };
    loadPageIntoState(project.current);
    geom = FP.computeGeometry(state.layout);
    renderAll();
    historyLast = snapshotProject();
    historyLastSig = projectSignature();
    historySuspended = false;
    updateUndoRedoButtons();
    scheduleSave();
  }

  function commitHistoryNow() {
    clearTimeout(historyTimer);
    historyTimer = null;
    if (historySuspended) return;
    const sig = projectSignature();
    if (!historyLast) {
      historyLast = snapshotProject();
      historyLastSig = sig;
      updateUndoRedoButtons();
      return;
    }
    if (sig === historyLastSig) return;
    historyPast.push(historyLast);
    if (historyPast.length > 40) historyPast.shift();
    historyFuture = [];
    historyLast = snapshotProject();
    historyLastSig = sig;
    updateUndoRedoButtons();
  }

  function scheduleHistory() {
    if (historySuspended) return;
    clearTimeout(historyTimer);
    historyTimer = setTimeout(commitHistoryNow, 500);
  }

  function undo() {
    commitHistoryNow();
    if (!historyPast.length) {
      FP.toast('没有可撤销的操作');
      return false;
    }
    syncPage();
    historyFuture.push(snapshotProject());
    const snapshot = historyPast.pop();
    restoreProjectSnapshot(snapshot);
    FP.toast('已撤销');
    return true;
  }

  function redo() {
    commitHistoryNow();
    if (!historyFuture.length) {
      FP.toast('没有可重做的操作');
      return false;
    }
    syncPage();
    historyPast.push(snapshotProject());
    const snapshot = historyFuture.pop();
    restoreProjectSnapshot(snapshot);
    FP.toast('已重做');
    return true;
  }

  /* ---------------- 子图分组 ---------------- */
  function groupById(id) {
    return (state.groups || []).filter(function (g) { return g.id === id; })[0] || null;
  }

  function selectedPanelsForGroup() {
    if (multiSelect.length) return multiSelect.slice();
    if (state.selectedCell != null && panelAt(state.selectedCell)) return [state.selectedCell];
    return [];
  }

  function nextGroupColor() {
    const used = new Set((state.groups || []).map(function (g) { return g.color; }));
    for (let i = 0; i < FP.GROUP_COLORS.length; i++) {
      if (!used.has(FP.GROUP_COLORS[i])) return FP.GROUP_COLORS[i];
    }
    return FP.GROUP_COLORS[(state.groups || []).length % FP.GROUP_COLORS.length];
  }

  function openGroupDialog(mode, groupId) {
    if (mode === 'edit') {
      const group = groupById(groupId);
      if (!group) return;
      groupDialogMode = 'edit';
      groupEditingId = group.id;
      groupDraftPanels = group.panels.slice();
      el.groupDialogTitle.textContent = '编辑子图分组';
      el.groupDialogDesc.textContent = '修改组名、编号方案与起始编号；组内子图成员不变。';
      el.groupName.value = group.name;
      el.groupScheme.value = group.scheme;
      el.groupStart.value = String(group.start);
    } else {
      const panels = selectedPanelsForGroup();
      if (!panels.length) {
        FP.toast('请先选择要分组的子图（Ctrl/Shift 可多选）', 'error');
        return;
      }
      groupDialogMode = 'create';
      groupEditingId = null;
      groupDraftPanels = panels.slice();
      el.groupDialogTitle.textContent = '创建子图分组';
      el.groupDialogDesc.textContent = '为选中的 ' + panels.length + ' 个子图建立编号组，使用独立编号方案。';
      const letter = String.fromCharCode(65 + (state.groups || []).length % 26);
      el.groupName.value = '组 ' + letter;
      el.groupScheme.value = state.label.scheme;
      el.groupStart.value = String(state.label.start);
    }
    updateGroupPreview();
    if (typeof el.groupDialog.showModal === 'function') el.groupDialog.showModal();
    else el.groupDialog.setAttribute('open', '');
  }

  function computeGroupPreviewItems() {
    const scheme = FP.schemeById(el.groupScheme.value).id;
    const start = Math.max(1, parseInt(el.groupStart.value, 10) || 1);
    const skipEmpty = !!state.label.skipEmpty;
    const ordered = panelOrder(state.label.order).filter(function (p) {
      return groupDraftPanels.indexOf(p.index) >= 0;
    });
    let counter = 0;
    return ordered.map(function (panel) {
      const cell = state.cells[panel.index];
      if (!cell && skipEmpty) return { panel: panel, text: null };
      counter++;
      return { panel: panel, text: FP.formatLabel(scheme, start + counter - 1) };
    });
  }

  function updateGroupPreview() {
    const items = computeGroupPreviewItems();
    el.groupPreview.innerHTML = '';
    items.forEach(function (item) {
      const span = document.createElement('span');
      span.className = 'batch-preview-item' + (item.text ? '' : ' is-empty');
      if (item.text) span.innerHTML = '<b>#' + (item.panel.index + 1) + '</b>' + FP.escapeXml(item.text);
      else span.textContent = '#' + (item.panel.index + 1) + '（空，跳过）';
      el.groupPreview.appendChild(span);
    });
    if (!items.length) {
      const empty = document.createElement('span');
      empty.className = 'merge-empty';
      empty.textContent = '没有可编号的子图';
      el.groupPreview.appendChild(empty);
    }
  }

  function saveGroupDialog() {
    const name = String(el.groupName.value || '').trim().slice(0, 24) || ('组 ' + ((state.groups || []).length + 1));
    const scheme = FP.schemeById(el.groupScheme.value).id;
    const start = Math.max(1, FP.clamp(FP.toInt(el.groupStart.value, 1), 1, 999));
    commitHistoryNow();
    if (groupDialogMode === 'edit') {
      const group = groupById(groupEditingId);
      if (!group) return;
      group.name = name;
      group.scheme = scheme;
      group.start = start;
      group.panels = groupDraftPanels.slice();
    } else {
      (state.groups || []).forEach(function (g) {
        g.panels = (g.panels || []).filter(function (idx) { return groupDraftPanels.indexOf(idx) < 0; });
      });
      state.groups = (state.groups || []).filter(function (g) { return g.panels.length > 0; });
      state.groups.push({
        id: FP.uid('group'),
        name: name,
        color: nextGroupColor(),
        scheme: scheme,
        start: start,
        panels: groupDraftPanels.slice().sort(function (a, b) { return a - b; })
      });
    }
    state.groups = FP.sanitizeGroups(state.groups, geom);
    if (el.groupDialog.open) el.groupDialog.close();
    renderAll();
    FP.toast(groupDialogMode === 'edit' ? '已保存分组设置' : '已创建分组：' + name, 'success');
  }

  function deleteGroup(id) {
    const group = groupById(id);
    if (!group) return;
    if (!window.confirm('删除分组「' + group.name + '」？子图会恢复使用全局编号。')) return;
    commitHistoryNow();
    state.groups = (state.groups || []).filter(function (g) { return g.id !== id; });
    renderAll();
    FP.toast('已删除分组：' + group.name);
  }

  function selectGroup(id) {
    const group = groupById(id);
    if (!group) return;
    const ordered = panelOrder('row').filter(function (p) { return group.panels.indexOf(p.index) >= 0; });
    multiSelect = ordered.map(function (p) { return p.index; });
    if (multiSelect.length <= 1) {
      state.selectedCell = multiSelect.length ? multiSelect[0] : null;
      multiSelect = [];
    } else {
      state.selectedCell = multiSelect[multiSelect.length - 1];
    }
    renderAll();
  }

  function updateGroupList() {
    if (!el.groupList) return;
    const groups = state.groups || [];
    el.groupCount.textContent = groups.length + ' 组';
    el.groupList.innerHTML = '';
    if (!groups.length) {
      const empty = document.createElement('span');
      empty.className = 'merge-empty';
      empty.textContent = '暂无分组';
      el.groupList.appendChild(empty);
      return;
    }
    groups.forEach(function (group) {
      const chip = document.createElement('div');
      chip.className = 'group-chip';
      const dot = document.createElement('span');
      dot.className = 'group-dot';
      dot.style.background = group.color;
      const name = document.createElement('span');
      name.className = 'group-name-label';
      name.textContent = group.name;
      name.title = group.name;
      const count = document.createElement('span');
      count.className = 'group-count-label';
      count.textContent = group.panels.length + ' 图';
      const select = document.createElement('button');
      select.type = 'button';
      select.textContent = '选中';
      select.addEventListener('click', function () { selectGroup(group.id); });
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = '编辑';
      edit.addEventListener('click', function () { openGroupDialog('edit', group.id); });
      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = '删除';
      del.addEventListener('click', function () { deleteGroup(group.id); });
      chip.appendChild(dot);
      chip.appendChild(name);
      chip.appendChild(count);
      chip.appendChild(select);
      chip.appendChild(edit);
      chip.appendChild(del);
      el.groupList.appendChild(chip);
    });
  }

  /* ---------------- .fig 支持 ---------------- */
  function isFigName(name) {
    return /\.fig$/i.test(String(name || ''));
  }

  function figCellFromResult(name, result, bytes) {
    return FP.figCellFromResult(name, result, bytes);
  }

  function schedulePreview() {
    if (previewScheduled) return;
    previewScheduled = true;
    requestAnimationFrame(function () {
      previewScheduled = false;
      renderPreviewNow();
    });
  }

  function scheduleFullRender() {
    if (fullRenderScheduled) return;
    fullRenderScheduled = true;
    requestAnimationFrame(function () {
      fullRenderScheduled = false;
      renderAll();
    });
  }

  function renderPreviewNow() {
    syncPage();
    applyAutoPagePadding();
    geom = FP.computeGeometry(state.layout);
    currentLabels = FP.computeLabels(state, geom);
    state.multiSelect = multiSelect.slice();
    preview.render(state, geom);
    updateSizes();
    updateExportReadout();
    updateOnboard();
    applyZoom();
    scheduleSave();
    scheduleHistory();
  }

  function renderAll() {
    syncPage();
    applyAutoPagePadding();
    geom = FP.computeGeometry(state.layout);
    currentLabels = FP.computeLabels(state, geom);
    state.multiSelect = multiSelect.slice();
    preview.render(state, geom);
    syncAllControls();
    updateFilmstrip();
    updatePageTabs();
    updateGroupList();
    updateUndoRedoButtons();
    applyZoom();
    scheduleSave();
    scheduleHistory();
  }

  function applyAutoPagePadding() {
    const layout = state.layout;
    if (layout.autoPad === false) return;
    const saved = {
      top: layout.padTopMm, right: layout.padRightMm,
      bottom: layout.padBottomMm, left: layout.padLeftMm
    };
    layout.padTopMm = 0;
    layout.padRightMm = 0;
    layout.padBottomMm = 0;
    layout.padLeftMm = 0;
    const baseGeom = FP.computeGeometry(layout);
    const pads = FP.computeLabelOverflowPads(state, baseGeom, 0.6);
    layout.padTopMm = pads.top;
    layout.padRightMm = pads.right;
    layout.padBottomMm = pads.bottom;
    layout.padLeftMm = pads.left;
    if (saved.top !== pads.top || saved.right !== pads.right ||
      saved.bottom !== pads.bottom || saved.left !== pads.left) {
      // 只更新布局数值；页码/历史会在本轮渲染后统一处理
    }
  }

  /* ================= 同步控件 ================= */
  function syncAllControls() {
    setNodeValue(el.rows, state.layout.rows);
    setNodeValue(el.cols, state.layout.cols);
    setNodeValue(el.width, state.layout.widthMm);
    setNodeValue(el.aspectW, state.layout.aspectW);
    setNodeValue(el.aspectH, state.layout.aspectH);
    setNodeValue(el.colGap, state.layout.colGap);
    setNodeValue(el.rowGap, state.layout.rowGap);
    setNodeValue(el.margin, state.layout.margin);
    el.bgMode.value = state.layout.bgMode;
    el.bgColor.value = state.layout.bgColor;
    el.bgColorHex.textContent = state.layout.bgColor;
    el.bgColorRow.style.display = state.layout.bgMode === 'custom' ? '' : 'none';
    setChecked(el.borderOn, state.layout.borderOn);
    setNodeValue(el.borderWidth, state.layout.borderWidth);
    el.borderColor.value = state.layout.borderColor;
    el.globalFit.value = state.layout.fit;
    if (el.autoPadToggle) el.autoPadToggle.checked = state.layout.autoPad !== false;
    if (el.padManual) el.padManual.hidden = state.layout.autoPad !== false;
    if (el.padTop) el.padTop.value = String(state.layout.padTopMm);
    if (el.padRight) el.padRight.value = String(state.layout.padRightMm);
    if (el.padBottom) el.padBottom.value = String(state.layout.padBottomMm);
    if (el.padLeft) el.padLeft.value = String(state.layout.padLeftMm);
    if (el.padReadout) {
      el.padReadout.textContent = '额外页距：上 ' + FP.fmt(state.layout.padTopMm, 1) +
        ' / 右 ' + FP.fmt(state.layout.padRightMm, 1) +
        ' / 下 ' + FP.fmt(state.layout.padBottomMm, 1) +
        ' / 左 ' + FP.fmt(state.layout.padLeftMm, 1) + ' mm';
    }

    setChecked(el.labelShow, state.label.show);
    el.labelOptions.hidden = !state.label.show;
    el.labelScheme.value = state.label.scheme;
    setNodeValue(el.labelStart, state.label.start);
    el.labelOrder.value = state.label.order;
    setChecked(el.labelSkipEmpty, state.label.skipEmpty);
    setNodeValue(el.labelInset, state.label.insetMm);
    setNodeValue(el.labelOffsetX, state.label.offsetXmm);
    setNodeValue(el.labelOffsetY, state.label.offsetYmm);
    el.labelFont.value = state.label.fontFamily;
    setNodeValue(el.labelSize, state.label.fontSizePt);
    setChecked(el.labelBold, state.label.bold);
    setChecked(el.labelItalic, state.label.italic);
    el.labelColor.value = state.label.color;
    el.labelBg.value = state.label.bg;
    el.labelBgColor.value = state.label.bgColor;
    setNodeValue(el.labelBgOpacity, Math.round(state.label.bgOpacity * 100));
    el.labelBgOpacityVal.value = Math.round(state.label.bgOpacity * 100);
    el.labelBgColorRow.style.display = state.label.bg === 'custom' ? '' : 'none';
    el.labelBgOpacityRow.style.display = state.label.bg === 'none' ? 'none' : '';
    updatePositionActive();
    updateSchemePreview();

    updateMatrixActive();
    updatePresetActive();
    updateMergeList();
    updateBgUI();

    setNodeValue(el.filename, state.export.filename);
    setNodeValue(el.dpiInput, state.export.dpi);
    updateDpiChips();
    setNodeValue(el.jpgQuality, Math.round(state.export.jpgQuality * 100));
    el.jpgQualityVal.value = Math.round(state.export.jpgQuality * 100);
    el.transparentToggle.checked = !!state.export.transparent;
    if (el.saveAsToggle) el.saveAsToggle.checked = state.export.saveAs !== false;
    if (el.vectorPdfToggle) el.vectorPdfToggle.checked = state.export.vectorPdf !== false;
    if (el.pdfTrimToggle) el.pdfTrimToggle.checked = !!state.export.trimPdf;
    if (el.pdfTrimMargin) el.pdfTrimMargin.value = String(state.export.trimMarginMm);
    syncExportUI();
    updateSizes();
    updateOnboard();
    updateCellCard();
    syncZoomButtons();
  }

  function updateSizes() {
    el.figHeight.textContent = FP.fmt(geom.heightMm, 1);
    el.cellSize.textContent = FP.fmt(geom.cellW, 1) + ' × ' + FP.fmt(geom.cellH, 1);
    el.layoutBadge.textContent = geom.rows + ' × ' + geom.cols +
      (geom.merges.length ? ' · ' + geom.panels.length + ' 格' : '');
    el.dimsBadge.textContent = FP.fmt(geom.widthMm, 1) + ' × ' + FP.fmt(geom.heightMm, 1) + ' mm';
    updateStatusDims();
  }

  function getPadInfo() {
    return {
      top: Number(state.layout.padTopMm) || 0,
      right: Number(state.layout.padRightMm) || 0,
      bottom: Number(state.layout.padBottomMm) || 0,
      left: Number(state.layout.padLeftMm) || 0,
      autoPad: state.layout.autoPad !== false,
      pageWidthMm: geom.widthMm,
      pageHeightMm: geom.heightMm,
      baseWidthMm: geom.baseWidthMm,
      baseHeightMm: geom.baseHeightMm
    };
  }

  function updateStatusDims() {
    const format = state.export.format;
    const panelPart = geom.panels.length + ' 子图' +
      (geom.merges.length ? '（' + geom.merges.length + ' 个合并）' : '');
    const pagePart = '第 ' + (project.current + 1) + '/' + project.pages.length + ' 页';
    if (format === 'svg') {
      el.statusDims.textContent = pagePart + ' · ' + panelPart + ' · ' +
        FP.fmt(geom.widthMm, 1) + ' × ' + FP.fmt(geom.heightMm, 1) + ' mm · SVG 矢量';
    } else {
      const px = FP.pixelSize(geom, state.export.dpi);
      el.statusDims.textContent = pagePart + ' · ' + panelPart + ' · ' +
        FP.fmt(geom.widthMm, 1) + ' × ' + FP.fmt(geom.heightMm, 1) + ' mm · ' +
        state.export.dpi + ' DPI → ' + px.width + ' × ' + px.height + ' px';
    }
  }

  function emfVectorInfo() {
    let count = 0;
    let unsupported = false;
    let rasterCount = 0;
    (geom.panels || []).forEach(function (panel) {
      const cell = state.cells[panel.index];
      if (!cell) return;
      if (cell.emfBase64) {
        count++;
        const fit = cell.fit === 'inherit' ? state.layout.fit : cell.fit;
        if (fit === 'cover' || Math.abs((cell.zoom || 1) - 1) > 1e-6 ||
          Math.abs(cell.offsetX || 0) > 1e-6 || Math.abs(cell.offsetY || 0) > 1e-6 ||
          Math.abs(cell.rotation || 0) > 1e-6) {
          unsupported = true;
        }
      } else {
        rasterCount++;
      }
    });
    return { count: count, unsupported: unsupported, rasterCount: rasterCount };
  }

  function hasUsableVectorPdf() {
    const info = emfVectorInfo();
    return !!(FP.desktop && FP.desktop.available && typeof FP.desktop.exportVectorPdf === 'function') &&
      info.count > 0 && !info.unsupported &&
      state.export.format === 'pdf' && state.export.scope !== 'all' && state.export.vectorPdf !== false;
  }

  function updateExportReadout() {
    const format = state.export.format;
    const allPages = state.export.scope === 'all' && project.pages.length > 1;
    if (allPages) {
      const pageCount = project.pages.length;
      const target = format === 'pdf' ? '多页 PDF' : '打包 ZIP（每页一个 ' + FP.FORMATS[format].label + '）';
      el.exportReadout.innerHTML = '<b>全部 ' + pageCount + ' 页</b> · ' +
        state.export.dpi + ' DPI · ' + target +
        (format === 'pdf' && state.export.trimPdf ? ' · 逐页裁剪白边' : '');
      return;
    }
    if (format === 'svg') {
      el.exportReadout.innerHTML = '尺寸 <b>' + FP.fmt(geom.widthMm, 1) + ' × ' + FP.fmt(geom.heightMm, 1) +
        ' mm</b> · 矢量输出 · 编号为可编辑文字';
      return;
    }
    const px = FP.pixelSize(geom, state.export.dpi);
    const total = px.width * px.height;
    let extra = '';
    if (format === 'pdf') {
      const info = emfVectorInfo();
      if (info.count > 0 && FP.desktop && FP.desktop.available) {
        if (info.unsupported) {
          extra = ' · <span class="warn">EMF 当前变换含裁剪/偏移，矢量模式不可用，将用位图</span>';
        } else if (state.export.vectorPdf !== false) {
          extra = ' · <b>EMF 矢量 PDF</b>（' + info.count + ' 张 EMF）';
        } else {
          extra = ' · EMF 可用矢量（当前按位图导出）';
        }
      } else {
        extra = ' · PDF 页面 ' + FP.fmt(geom.widthMm, 1) + ' × ' + FP.fmt(geom.heightMm, 1) + ' mm';
      }
      if (state.export.trimPdf) {
        extra += ' · 自动裁剪白边（按实际内容墨迹，保留 ' +
          FP.fmt(Math.max(1, Number(state.export.trimMarginMm) || 0), 1) + ' mm 安全边距）';
      }
    }
    if (total > 80e6) extra += ' <span class="warn">（像素较多，导出可能较慢）</span>';
    el.exportReadout.innerHTML = '尺寸 <b>' + FP.fmt(geom.widthMm, 1) + ' × ' + FP.fmt(geom.heightMm, 1) +
      ' mm</b> · ' + state.export.dpi + ' DPI → <b>' + px.width + ' × ' + px.height + ' px</b>' + extra;
  }

  function updateExportScopeUI() {
    const multi = project.pages.length > 1;
    if (!multi && state.export.scope === 'all') state.export.scope = 'current';
    if (el.exportScopeRow) el.exportScopeRow.hidden = !multi;
    if (el.exportScopeSeg) {
      Array.prototype.forEach.call(el.exportScopeSeg.children, function (btn) {
        btn.classList.toggle('is-active', btn.dataset.scope === state.export.scope);
      });
    }
    if (el.exportScopeNote) {
      const all = multi && state.export.scope === 'all';
      el.exportScopeNote.hidden = !all;
      if (all) {
        el.exportScopeNote.textContent = state.export.format === 'pdf'
          ? '全部 ' + project.pages.length + ' 页将合成为一个多页 PDF。'
          : '全部 ' + project.pages.length + ' 页将分别导出并打包为 ZIP 下载。';
      }
    }
    updateExportReadout();
  }

  function updateOnboard() {
    el.onboardHint.style.display = anyFilled() ? 'none' : 'flex';
  }

  function updateBgUI() {
    el.bgMode.value = state.layout.bgMode;
    el.bgColor.value = state.layout.bgColor;
    el.bgColorHex.textContent = state.layout.bgColor;
    el.bgColorRow.style.display = state.layout.bgMode === 'custom' ? '' : 'none';
  }

  function updateSchemePreview() {
    el.schemePreview.textContent = FP.schemePreviewText(state.label.scheme, state.label.start, 3);
  }

  function updateMatrixActive() {
    const rows = state.layout.rows, cols = state.layout.cols;
    for (let i = 0; i < el.matrix.children.length; i++) {
      const b = el.matrix.children[i];
      const r = Number(b.dataset.r), c = Number(b.dataset.c);
      b.className = 'mx' + (r <= rows && c <= cols ? ' is-active' : '');
    }
    el.matrixCaption.textContent = rows + ' 行 × ' + cols + ' 列';
  }

  function updatePresetActive() {
    for (let i = 0; i < el.preset.children.length; i++) {
      const b = el.preset.children[i];
      const active = Number(b.dataset.rows) === state.layout.rows && Number(b.dataset.cols) === state.layout.cols;
      b.classList.toggle('is-active', active);
    }
  }

  function updatePositionActive() {
    for (let i = 0; i < el.posPicker.children.length; i++) {
      const b = el.posPicker.children[i];
      b.classList.toggle('is-active', b.dataset.pos === state.label.position);
    }
  }

  function updateDpiChips() {
    for (let i = 0; i < el.dpiChips.children.length; i++) {
      const b = el.dpiChips.children[i];
      b.classList.toggle('is-active', Number(b.dataset.dpi) === state.export.dpi);
    }
  }

  function syncExportUI() {
    const format = state.export.format;
    for (let i = 0; i < el.formatButtons.children.length; i++) {
      const b = el.formatButtons.children[i];
      b.classList.toggle('is-active', b.dataset.format === format);
    }
    document.body.setAttribute('data-format', format);
    el.dpiRow.style.display = format === 'svg' ? 'none' : '';
    el.transparentRow.style.display = (format === 'png' || format === 'svg') ? 'flex' : 'none';
    el.transparentToggle.checked = !!state.export.transparent;
    el.btnExportText.textContent = '导出 ' + FP.FORMATS[format].label;
    el.exportNote.textContent = EXPORT_NOTES[format];
    const vec = emfVectorInfo();
    const allPages = state.export.scope === 'all' && project.pages.length > 1;
    const showVector = format === 'pdf' && !allPages && !!(FP.desktop && FP.desktop.available) && vec.count > 0;
    const showTrim = format === 'pdf';
    if (el.pdfTrimRow) el.pdfTrimRow.hidden = !showTrim;
    if (el.pdfTrimToggle) el.pdfTrimToggle.checked = !!state.export.trimPdf;
    if (el.pdfTrimMarginRow) el.pdfTrimMarginRow.hidden = !showTrim || !state.export.trimPdf;
    if (el.pdfTrimSafetyHint) el.pdfTrimSafetyHint.hidden = !showTrim || !state.export.trimPdf;
    if (el.pdfTrimMargin) el.pdfTrimMargin.value = String(state.export.trimMarginMm);
    if (el.vectorPdfRow) el.vectorPdfRow.hidden = !showVector;
    if (el.vectorPdfToggle) el.vectorPdfToggle.disabled = !showVector || vec.unsupported;
    if (showVector) {
      el.exportNote.textContent = vec.unsupported
        ? '当前 EMF 子图使用了裁剪/旋转/偏移，无法走矢量模式；可恢复默认的“适应”显示后再导出。'
        : 'PDF 将优先使用矢量模式（保留 ' + vec.count + ' 张 EMF 的线条与文字），需桌面版 PowerPoint；首次启动较慢，之后会复用 PowerPoint 会话。失败会自动回退为高分辨率位图 PDF。';
    } else if (format === 'pdf' && allPages && vec.count > 0) {
      el.exportNote.textContent = '全部图页导出暂用多页位图 PDF（矢量模式先支持当前页）；如需矢量可逐页导出。';
    }
    updateExportScopeUI();
    updateDpiChips();
    updateStatusDims();
  }

  function syncZoomButtons() {
    el.zoomFit.classList.toggle('is-active', fitMode);
    el.zoom100.classList.toggle('is-active', !fitMode && Math.abs(currentPct - 100) < 0.5);
  }

  function updateMergeList() {
    el.mergeList.innerHTML = '';
    const merges = state.layout.merges;
    if (!merges.length) {
      const span = document.createElement('span');
      span.className = 'merge-empty';
      span.textContent = '暂无合并单元格（Ctrl/Shift 多选后可合并）';
      el.mergeList.appendChild(span);
      return;
    }
    merges.forEach(function (m, i) {
      const chip = document.createElement('div');
      chip.className = 'merge-chip';
      const label = document.createElement('span');
      label.textContent = '第 ' + (m.r + 1) + '–' + (m.r + m.rs) + ' 行 · 第 ' +
        (m.c + 1) + '–' + (m.c + m.cs) + ' 列';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '拆分';
      btn.addEventListener('click', function () { splitMergeAt(i); });
      chip.appendChild(label);
      chip.appendChild(btn);
      el.mergeList.appendChild(chip);
    });
    if (merges.length > 1) {
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'btn btn-sm btn-ghost';
      all.style.marginTop = '2px';
      all.textContent = '全部拆分';
      all.addEventListener('click', splitAllMerges);
      el.mergeList.appendChild(all);
    }
  }

  /* ================= 缩略图列表 / 选中卡片 ================= */
  function updateFilmstrip() {
    const labelsMap = new Map();
    currentLabels.forEach(function (l) { labelsMap.set(l.panel.index, l.text); });
    el.filmstrip.innerHTML = '';
    panelOrder('row').forEach(function (panel) {
      const index = panel.index;
      const cell = state.cells[index];
      const selected = multiSelect.length > 1
        ? multiSelect.indexOf(index) >= 0
        : state.selectedCell === index;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'film-item' + (selected ? ' is-selected' : '');
      item.dataset.index = String(index);
      if (cell) {
        item.title = '子图 #' + (index + 1) + (panel.merged ? '（跨列大图）' : '') +
          '：' + cell.name + '（双击替换 / 拖动交换）';
        item.draggable = true;
        const img = document.createElement('img');
        img.src = cell.dataUrl;
        img.alt = cell.name;
        img.draggable = false;
        item.appendChild(img);
        const badge = document.createElement('span');
        badge.className = 'film-badge';
        badge.textContent = labelsMap.get(index) || String(index + 1);
        item.appendChild(badge);
      } else {
        item.title = '子图 #' + (index + 1) + (panel.merged ? '（跨列大图）' : '') + '：点击粘贴 / 上传';
        item.draggable = false;
        const placeholder = document.createElement('span');
        placeholder.className = 'film-empty-content';
        placeholder.innerHTML = '<span class="plus">＋</span><span class="hint">点击粘贴</span>';
        item.appendChild(placeholder);
      }
      el.filmstrip.appendChild(item);
    });
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'film-add';
    add.textContent = '＋ 批量';
    add.title = '批量上传图片';
    add.dataset.action = 'batch-upload';
    el.filmstrip.appendChild(add);
  }

  function updateCellCard() {
    const multi = multiSelect.length > 1;
    el.multiControls.hidden = !multi;
    if (multi) {
      el.cellHint.hidden = true;
      el.cellControls.hidden = true;
      const validation = FP.validateMergeSelection(geom, multiSelect);
      el.cellIndexLabel.textContent = '已多选 ' + multiSelect.length + ' 个子图';
      el.multiCount.textContent = '已选 ' + multiSelect.length + ' 个子图';
      el.multiMergeHint.textContent = validation.message || '';
      el.multiMerge.disabled = !validation.ok;
      el.multiBatchLabel.disabled = !multiSelect.some(function (i) { return !!state.cells[i]; });
      return;
    }

    const idx = state.selectedCell;
    const cell = idx != null ? state.cells[idx] : null;
    const panel = idx != null ? panelAt(idx) : null;
    if (idx == null || !cell) {
      el.cellIndexLabel.textContent = idx != null ? '子图 #' + (idx + 1) : '未选中';
      el.cellHint.hidden = idx != null && !!panel && panel.merged ? false : false;
      el.cellHint.hidden = false;
      el.cellControls.hidden = true;
      return;
    }
    const labelEntry = currentLabels.find(function (l) { return l.panel.index === idx; });
    el.cellIndexLabel.textContent = '子图 #' + (idx + 1) +
      (panel && panel.merged ? ' · 跨 ' + panel.colSpan + ' 列 / ' + panel.rowSpan + ' 行' : '') +
      (labelEntry ? ' · ' + labelEntry.text : '');
    el.cellHint.hidden = true;
    el.cellControls.hidden = false;
    el.cellMeta.textContent = cell.name + ' · ' + cell.width + ' × ' + cell.height + ' px · ' +
      FP.formatBytes(cell.bytes) + (cell.convertedFromTiff ? ' · 由 TIFF 转换' : '');
    el.cellMeta.title = el.cellMeta.textContent;
    el.cellFit.value = cell.fit || 'inherit';
    setNodeValue(el.cellZoom, Math.round((cell.zoom || 1) * 100));
    el.cellZoomVal.value = Math.round((cell.zoom || 1) * 100);
    setNodeValue(el.cellOffsetX, FP.round(cell.offsetX || 0, 1));
    setNodeValue(el.cellOffsetY, FP.round(cell.offsetY || 0, 1));
    setNodeValue(el.cellCustomLabel, cell.customLabel || '');
    updateRotationButtons(cell);
    el.cellPrev.disabled = panelOrder('row').findIndex(function (p) { return p.index === idx; }) <= 0;
    el.cellNext.disabled = panelOrder('row').findIndex(function (p) { return p.index === idx; }) >= geom.panels.length - 1;
    if (el.cellSplit) el.cellSplit.hidden = !(panel && panel.merged);
  }

  function updateRotationButtons(cell) {
    for (let i = 0; i < el.cellRotation.children.length; i++) {
      const b = el.cellRotation.children[i];
      b.classList.toggle('is-active', Number(b.dataset.rot) === (cell.rotation || 0));
    }
  }

  /* ================= 缩放 ================= */
  function computeFitPercent() {
    const rect = el.stage.getBoundingClientRect();
    const availW = Math.max(100, rect.width - 56);
    const availH = Math.max(100, rect.height - 56);
    const baseW = geom.widthMm * MM_TO_CSS;
    const baseH = geom.heightMm * MM_TO_CSS;
    if (!baseW || !baseH) return 100;
    return FP.clamp(Math.min(availW / baseW, availH / baseH) * 100, 10, 400);
  }

  function applyZoom() {
    const pct = fitMode ? computeFitPercent() : currentPct;
    currentPct = pct;
    el.shell.style.width = Math.max(1, geom.widthMm * MM_TO_CSS * pct / 100) + 'px';
    el.shell.style.height = Math.max(1, geom.heightMm * MM_TO_CSS * pct / 100) + 'px';
    el.shell.classList.toggle('is-transparent', !!(FP.isTransparentOutput && FP.isTransparentOutput(state)));
    el.zoomLabel.textContent = Math.round(pct) + '%';
    syncZoomButtons();
  }

  function setFitMode(fit) {
    fitMode = !!fit;
    if (fitMode) currentPct = computeFitPercent();
    applyZoom();
  }

  function zoomBy(factor) {
    fitMode = false;
    currentPct = FP.clamp(currentPct * factor, 10, 800);
    applyZoom();
  }

  /* ================= 自动保存 ================= */
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 900);
    scheduleHistory();
  }

  async function saveNow() {
    syncPage();
    const snapshot = {
      version: 2,
      project: snapshotProject()
    };
    const result = await FP.storage.save(snapshot);
    if (!result.ok && !saveWarned) {
      saveWarned = true;
      FP.toast('自动保存不可用（浏览器存储受限或图片过大），请及时导出保存', 'error', 5000);
    }
  }

  /* ================= 选择 / 合并 ================= */
  function selectSingle(index) {
    state.selectedCell = index;
    multiSelect = [];
    renderAll();
  }

  function toggleMultiSelect(index) {
    if (!panelAt(index)) return;
    let list = multiSelect.slice();
    if (list.length === 0) {
      if (state.selectedCell != null && state.selectedCell !== index) list = [state.selectedCell, index];
      else list = [index];
    } else if (list.indexOf(index) >= 0) {
      list = list.filter(function (i) { return i !== index; });
    } else {
      list.push(index);
    }
    if (list.length <= 1) {
      state.selectedCell = list.length ? list[0] : null;
      multiSelect = [];
    } else {
      multiSelect = list;
      state.selectedCell = index;
    }
    renderAll();
  }

  function clearSelection() {
    state.selectedCell = null;
    multiSelect = [];
    renderAll();
  }

  function performMerge(indices, force) {
    const validation = FP.validateMergeSelection(geom, indices);
    if (!validation.ok) return { ok: false, error: validation.message };
    const ordered = panelOrder('row').filter(function (p) { return indices.indexOf(p.index) >= 0; });
    const images = ordered.map(function (p) { return state.cells[p.index]; }).filter(Boolean);
    if (images.length > 1 && !force) return { ok: false, error: 'multiple-images', count: images.length };
    const keeper = images.length ? images[0] : null;
    const selectedSet = new Set(ordered.map(function (p) { return p.index; }));
    let commonGroupId = null;
    let mixedGroups = false;
    ordered.forEach(function (p) {
      const group = (state.groups || []).filter(function (g) { return (g.panels || []).indexOf(p.index) >= 0; })[0];
      if (!group) { mixedGroups = true; return; }
      if (commonGroupId === null) commonGroupId = group.id;
      else if (commonGroupId !== group.id) mixedGroups = true;
    });
    (state.groups || []).forEach(function (g) {
      g.panels = (g.panels || []).filter(function (idx) { return !selectedSet.has(idx); });
    });
    if (commonGroupId && !mixedGroups) {
      const targetGroup = (state.groups || []).filter(function (g) { return g.id === commonGroupId; })[0];
      if (targetGroup) targetGroup.panels.push(validation.anchor);
    }
    state.groups = (state.groups || []).filter(function (g) { return (g.panels || []).length > 0; });
    state.groups = FP.sanitizeGroups(state.groups, geom);
    ordered.forEach(function (p) { state.cells[p.index] = null; });
    state.layout.merges.push(validation.merge);
    state.layout.merges = FP.normalizeMerges(state.layout.merges, state.layout.rows, state.layout.cols);
    if (keeper) state.cells[validation.anchor] = keeper;
    multiSelect = [];
    state.selectedCell = validation.anchor;
    renderAll();
    return { ok: true, merge: validation.merge, anchor: validation.anchor, dropped: Math.max(0, images.length - 1) };
  }

  function mergeSelectedPanels() {
    if (multiSelect.length < 2) {
      FP.toast('请先按住 Ctrl / Shift 多选至少两个子图', 'error');
      return;
    }
    const validation = FP.validateMergeSelection(geom, multiSelect);
    if (!validation.ok) {
      FP.toast(validation.message, 'error');
      return;
    }
    const ordered = panelOrder('row').filter(function (p) { return multiSelect.indexOf(p.index) >= 0; });
    const images = ordered.map(function (p) { return state.cells[p.index]; }).filter(Boolean);
    if (images.length > 1 && !window.confirm('合并后只保留左上角子图的图片，其余 ' + (images.length - 1) + ' 张图片会被移除。继续？')) {
      return;
    }
    const result = performMerge(multiSelect, true);
    if (result.ok) {
      FP.toast('已合并为 ' + result.merge.rs + ' 行 × ' + result.merge.cs + ' 列大图', 'success');
    }
  }

  function splitSelectedPanel() {
    const idx = state.selectedCell;
    const panel = idx != null ? panelAt(idx) : null;
    if (!panel || !panel.merged) return;
    const mi = state.layout.merges.findIndex(function (m) {
      return m.r === panel.row && m.c === panel.col;
    });
    if (mi < 0) return;
    state.layout.merges.splice(mi, 1);
    multiSelect = [];
    renderAll();
    FP.toast('已拆分为独立子图');
  }

  function splitMergeAt(index) {
    const merge = state.layout.merges[index];
    if (!merge) return;
    const anchor = FP.mergeAnchorIndex(merge, state.layout.cols);
    state.layout.merges.splice(index, 1);
    state.selectedCell = anchor;
    multiSelect = [];
    renderAll();
    FP.toast('已拆分合并单元格');
  }

  function splitAllMerges() {
    if (!state.layout.merges.length) return;
    state.layout.merges = [];
    multiSelect = [];
    renderAll();
    FP.toast('已拆分全部合并单元格');
  }

  /* ================= 模板 ================= */
  function openTemplateDialog() {
    buildTemplateCards();
    if (typeof el.templateDialog.showModal === 'function') el.templateDialog.showModal();
    else el.templateDialog.setAttribute('open', '');
  }

  function applyTemplate(id) {
    const tpl = TEMPLATES.filter(function (t) { return t.id === id; })[0];
    if (!tpl) return;
    const images = panelOrder('row').map(function (p) { return state.cells[p.index]; }).filter(Boolean);
    const layout = state.layout;
    layout.rows = tpl.rows;
    layout.cols = tpl.cols;
    layout.widthMm = tpl.widthMm;
    layout.aspectW = tpl.aspectW;
    layout.aspectH = tpl.aspectH;
    layout.colGap = tpl.colGap;
    layout.rowGap = tpl.rowGap;
    layout.margin = tpl.margin;
    layout.merges = FP.normalizeMerges(tpl.merges, tpl.rows, tpl.cols);
    state.label.fontSizePt = tpl.fontSizePt;
    state.label.insetMm = tpl.insetMm;

    const newGeom = FP.computeGeometry(layout);
    const anchors = FP.orderPanels(newGeom, 'row').map(function (p) { return p.index; });
    state.cells = new Array(tpl.rows * tpl.cols).fill(null);
    state.groups = [];
    let dropped = 0;
    for (let i = 0; i < images.length; i++) {
      if (i < anchors.length) state.cells[anchors[i]] = images[i];
      else dropped++;
    }
    state.selectedCell = null;
    multiSelect = [];
    if (el.templateDialog.open) el.templateDialog.close();
    renderAll();
    FP.toast('已套用模板：' + tpl.name +
      (dropped ? '（图片较多，丢弃了 ' + dropped + ' 张）' : ''), 'success', 3200);
  }

  /* ================= 批量编号 ================= */
  function openBatchLabelDialog() {
    if (multiSelect.length < 2) {
      FP.toast('请先按住 Ctrl / Shift 多选至少两个子图', 'error');
      return;
    }
    const ordered = panelOrder(state.label.order).filter(function (p) {
      return multiSelect.indexOf(p.index) >= 0;
    });
    batchTargets = ordered.map(function (p) { return p.index; });
    if (!batchTargets.some(function (i) { return !!state.cells[i]; })) {
      FP.toast('所选子图还没有图片，请先粘贴/上传图片', 'error');
      return;
    }
    el.batchScheme.value = state.label.scheme;
    el.batchStart.value = String(state.label.start);
    updateBatchPreview();
    if (typeof el.batchDialog.showModal === 'function') el.batchDialog.showModal();
    else el.batchDialog.setAttribute('open', '');
  }

  function computeBatchItems() {
    const scheme = el.batchScheme.value;
    const start = Math.max(1, parseInt(el.batchStart.value, 10) || 1);
    let counter = 0;
    return batchTargets.map(function (index) {
      const cell = state.cells[index];
      if (!cell) return { index: index, text: null };
      counter++;
      return { index: index, text: FP.formatLabel(scheme, start + counter - 1) };
    });
  }

  function updateBatchPreview() {
    const items = computeBatchItems();
    el.batchPreview.innerHTML = '';
    items.forEach(function (item) {
      const span = document.createElement('span');
      span.className = 'batch-preview-item' + (item.text ? '' : ' is-empty');
      if (item.text) {
        span.innerHTML = '<b>#' + (item.index + 1) + '</b>' + FP.escapeXml(item.text);
      } else {
        span.textContent = '#' + (item.index + 1) + '（空，跳过）';
      }
      el.batchPreview.appendChild(span);
    });
  }

  function applyBatchLabels() {
    const items = computeBatchItems();
    let count = 0;
    items.forEach(function (item) {
      if (item.text && state.cells[item.index]) {
        state.cells[item.index].customLabel = item.text;
        count++;
      }
    });
    if (el.batchDialog.open) el.batchDialog.close();
    renderAll();
    FP.toast('已为 ' + count + ' 个子图套用编号', 'success');
  }

  function clearBatchLabels() {
    let count = 0;
    batchTargets.forEach(function (index) {
      if (state.cells[index] && state.cells[index].customLabel) {
        state.cells[index].customLabel = '';
        count++;
      }
    });
    if (el.batchDialog.open) el.batchDialog.close();
    renderAll();
    FP.toast(count ? '已清除所选子图的自定义编号' : '所选子图没有自定义编号');
  }

  /* ================= 布局 / 单元格操作 ================= */
  function applyLayout(rows, cols, opts) {
    opts = opts || {};
    const r = FP.clamp(FP.toInt(rows, state.layout.rows), 1, 500);
    const c = FP.clamp(FP.toInt(cols, state.layout.cols), 1, 500);
    if (r * c > FP.MAX_CELLS) {
      FP.toast('单页最多 ' + FP.MAX_CELLS + ' 个子图格（当前 ' + r + ' × ' + c + ' = ' + (r * c) + '），请减小行列数', 'error', 5000);
      syncAllControls();
      return;
    }
    if (r === state.layout.rows && c === state.layout.cols) {
      syncAllControls();
      return;
    }
    const oldCells = state.cells;
    const oldMerges = state.layout.merges.length;
    const next = new Array(r * c).fill(null);
    for (let i = 0; i < next.length; i++) {
      if (oldCells[i]) next[i] = oldCells[i];
    }
    let dropped = 0;
    for (let i = next.length; i < oldCells.length; i++) {
      if (oldCells[i]) dropped++;
    }
    state.layout.rows = r;
    state.layout.cols = c;
    state.layout.merges = [];
    state.cells = next;
    state.groups = FP.sanitizeGroups(state.groups, FP.computeGeometry(state.layout));
    state.selectedCell = null;
    multiSelect = [];
    renderAll();
    if (oldMerges && !opts.quiet) {
      FP.toast('网格已改变，跨列合并已重置（图片保留在原单元格）', 'info', 3200);
    }
    if (dropped && !opts.quiet) {
      FP.toast('网格缩小：移除了 ' + dropped + ' 张超出网格的图片', 'error', 3800);
    }
  }

  function swapCells(i, j) {
    if (i === j) return;
    if (!panelAt(i) || !panelAt(j)) return;
    const tmp = state.cells[i];
    state.cells[i] = state.cells[j];
    state.cells[j] = tmp;
    multiSelect = [];
    if (state.selectedCell === i) state.selectedCell = j;
    else if (state.selectedCell === j) state.selectedCell = i;
    renderAll();
    FP.toast('已交换子图位置（#' + (i + 1) + ' ↔ #' + (j + 1) + '）', 'info', 2000);
  }

  function moveSelectedBy(delta) {
    const list = panelOrder('row');
    const pos = list.findIndex(function (p) { return p.index === state.selectedCell; });
    if (pos < 0) return;
    const target = list[pos + delta];
    if (target) swapCells(state.selectedCell, target.index);
  }

  function removeSelectedImage() {
    const idx = state.selectedCell;
    if (idx == null || !state.cells[idx]) return;
    state.cells[idx] = null;
    renderAll();
    FP.toast('已清除子图 #' + (idx + 1));
  }

  function clearAllCells(confirmFirst) {
    if (!anyFilled()) {
      FP.toast('当前没有图片');
      return;
    }
    if (confirmFirst && !window.confirm('确定清空所有子图图片吗？此操作不可撤销。')) return;
    state.cells = new Array(state.cells.length).fill(null);
    state.selectedCell = null;
    multiSelect = [];
    renderAll();
    FP.toast('已清空所有子图');
  }

  function openFilePicker(target) {
    pendingTarget = (target != null && panelAt(Number(target))) ? Number(target) : null;
    el.fileInput.value = '';
    el.fileInput.click();
  }

  function pickTargets(n, target) {
    const anchors = [];
    const list = panelOrder('row');
    if (target != null && panelAt(Number(target))) anchors.push(Number(target));
    for (let i = 0; i < list.length && anchors.length < n; i++) {
      const index = list[i].index;
      if (!state.cells[index] && anchors.indexOf(index) < 0) anchors.push(index);
    }
    if (anchors.length < n) {
      for (let i = 0; i < list.length && anchors.length < n; i++) {
        if (anchors.indexOf(list[i].index) < 0) anchors.push(list[i].index);
      }
    }
    return anchors.slice(0, n);
  }

  async function handleFiles(files, target) {
    const all = Array.from(files || []);
    const list = all.filter(FP.isSupportedFile);
    if (!list.length) {
      FP.toast('没有可用的图片文件（支持 PNG/JPG/SVG/TIFF 等，桌面版还支持 .fig）', 'error');
      return;
    }
    if (list.length !== all.length) {
      FP.toast('已忽略 ' + (all.length - list.length) + ' 个不支持的文件', 'error');
    }
    const targets = pickTargets(list.length, target);
    if (!targets.length) {
      FP.toast('没有可放置图片的子图', 'error');
      return;
    }
    setStatus('正在读取 ' + list.length + ' 个文件…');
    let success = 0;
    let firstIndex = null;
    for (let i = 0; i < list.length && i < targets.length; i++) {
      const idx = targets[i];
      try {
        let cell;
        if (FP.isFigFile(list[i])) {
          if (!(FP.desktop && FP.desktop.available)) {
            throw new Error('读取 .fig 需要桌面版并安装 MATLAB；请在 MATLAB 中复制图窗后粘贴，或另存为图片');
          }
          setStatus('正在调用 MATLAB 转换 ' + (list[i].name || '.fig') + '（首次可能需要 1–2 分钟）…');
          const imported = await FP.desktop.importFig(list[i]);
          cell = figCellFromResult(list[i].name, imported, list[i].size);
        } else {
          cell = await FP.decodeImageFile(list[i]);
        }
        state.cells[idx] = cell;
        if (firstIndex == null) firstIndex = idx;
        success++;
      } catch (err) {
        console.warn('[FigurePlay] 读取文件失败：', err && err.message ? err.message : err);
        FP.toast('无法读取「' + (list[i].name || '文件') + '」：' + (err.message || err), 'error', 6000);
      }
    }
    if (success) {
      state.selectedCell = firstIndex;
      multiSelect = [];
      renderAll();
      setStatus('已添加 ' + success + ' 个文件');
      if (list.length > targets.length) {
        FP.toast('网格已满，忽略了 ' + (list.length - targets.length) + ' 个文件', 'error');
      } else {
        FP.toast('已添加 ' + success + ' 个子图', 'success');
      }
    } else {
      setStatus('文件读取失败');
    }
  }

  /* ================= 粘贴小画布 ================= */
  function setPasteStatus(text, isError) {
    el.pasteStatus.textContent = text || '';
    el.pasteStatus.classList.toggle('is-error', !!isError);
  }

  function resetPastePreview() {
    pendingPasteCell = null;
    el.pasteIdle.hidden = false;
    el.pastePreview.hidden = true;
    el.pasteZone.classList.remove('has-image');
    el.pasteConfirm.disabled = true;
    el.pastePreviewImg.removeAttribute('src');
    el.pasteMeta.textContent = '';
  }

  function showPastePreview(cell, note) {
    pendingPasteCell = cell;
    el.pasteIdle.hidden = true;
    el.pastePreview.hidden = false;
    el.pasteZone.classList.add('has-image');
    el.pastePreviewImg.src = cell.dataUrl;
    el.pasteMeta.textContent = (cell.name || '剪贴板图片') + ' · ' +
      cell.width + ' × ' + cell.height + ' px · ' + FP.formatBytes(cell.bytes || 0);
    el.pasteConfirm.disabled = false;
    setPasteStatus(note || '预览确认无误后点「使用此图片」，或按 Enter。');
  }

  async function decodePasteFiles(files) {
    const list = Array.from(files || []).filter(FP.isSupportedFile);
    if (!list.length) {
      setPasteStatus('没有识别到图片，请重新复制或选择文件', true);
      return;
    }
    setPasteStatus('正在读取文件…');
    try {
      let cell;
      if (FP.isFigFile(list[0])) {
        if (!(FP.desktop && FP.desktop.available)) {
          throw new Error('读取 .fig 需要桌面版并安装 MATLAB；请在 MATLAB 中复制图窗后粘贴，或另存为图片');
        }
        setPasteStatus('正在调用 MATLAB 转换 .fig（首次可能需要 1–2 分钟）…');
        const imported = await FP.desktop.importFig(list[0]);
        cell = figCellFromResult(list[0].name, imported, list[0].size);
      } else {
        cell = await FP.decodeImageFile(list[0]);
      }
      if (!el.pasteDialog.open) return;
      showPastePreview(cell, list.length > 1 ? '已读取第一个文件（共 ' + list.length + ' 个）' : '');
    } catch (err) {
      console.warn('[FigurePlay] 读取粘贴文件失败：', err && err.message ? err.message : err);
      setPasteStatus('读取失败：' + (err.message || err), true);
    }
  }

  async function readNativeClipboard(auto) {
    if (!FP.desktop || !FP.desktop.available) {
      setPasteStatus('浏览器模式无法直接读取系统剪贴板，请按 Ctrl+V；或使用桌面版 FigurePlay.exe', true);
      return;
    }
    if (pasteBusy) return;
    pasteBusy = true;
    const token = ++pasteRequestToken;
    setPasteStatus('正在读取系统剪贴板…');
    try {
      const res = await FP.desktop.readClipboardImage();
      if (token !== pasteRequestToken || !el.pasteDialog.open) return;
      const cell = {
        name: '剪贴板图片.png',
        type: 'image/png',
        dataUrl: res.dataUrl,
        width: res.width || 1,
        height: res.height || 1,
        bytes: res.bytes || 0,
        fit: 'inherit',
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        customLabel: '',
        emfBase64: res.emfBase64 || '',
        sourceFormat: res.sourceFormat || ''
      };
      showPastePreview(cell, '已从系统剪贴板读取（' + (res.sourceFormat || 'Bitmap') + ' → PNG' +
        (res.emfBase64 ? ' · 已保留 EMF 矢量，可导出矢量 PDF' : '') + '）');
    } catch (err) {
      if (token !== pasteRequestToken) return;
      if (auto) setPasteStatus('系统剪贴板中没有图片：可按 Ctrl+V、选择本地文件，或重新复制图窗', false);
      else setPasteStatus('读取失败：' + (err.message || err), true);
    } finally {
      pasteBusy = false;
    }
  }

  function openPasteDialog(index, opts) {
    opts = opts || {};
    let target = index != null ? Number(index) : targetPanelForPaste();
    if (!panelAt(target)) target = targetPanelForPaste();
    if (target == null) {
      FP.toast('没有可用的子图', 'error');
      return;
    }
    pasteTargetIndex = target;
    pendingPasteCell = null;
    pasteRequestToken++;
    state.selectedCell = target;
    multiSelect = [];
    const panel = panelAt(target);
    const hasCell = !!state.cells[target];
    el.pasteTitle.textContent = hasCell ? ('替换子图 #' + (target + 1) + ' 的图片') : ('粘贴图片到子图 #' + (target + 1));
    el.pasteTargetLabel.textContent = '目标：子图 #' + (target + 1) +
      ' · ' + panel.rowSpan + ' 行 × ' + panel.colSpan + ' 列' +
      (panel.merged ? '（跨列大图）' : '') +
      ' · 宽高比 ' + FP.fmt(panel.w / panel.h, 2) + ' : 1';
    el.pasteFrame.style.aspectRatio = panel.w + ' / ' + panel.h;
    el.pasteContinue.checked = opts.continueChecked !== undefined ? !!opts.continueChecked : true;
    resetPastePreview();
    renderAll();
    if (el.pasteDialog.open) {
      // 对话框已打开（例如「继续下一格」）时不要重复 showModal
    } else if (typeof el.pasteDialog.showModal === 'function') {
      el.pasteDialog.showModal();
    } else {
      el.pasteDialog.setAttribute('open', '');
    }
    setTimeout(function () {
      try { el.pasteZone.focus(); } catch (err) { /* ignore */ }
    }, 30);
    if (opts.files && opts.files.length) {
      decodePasteFiles(opts.files);
    } else if (FP.desktop && FP.desktop.available && opts.autoRead !== false) {
      readNativeClipboard(true);
    } else {
      setPasteStatus('');
    }
  }

  function closePasteDialog() {
    pasteRequestToken++;
    pendingPasteCell = null;
    pasteTargetIndex = null;
    if (el.pasteDialog.open) el.pasteDialog.close();
    else el.pasteDialog.removeAttribute('open');
  }

  function confirmPaste() {
    if (!pendingPasteCell || pasteTargetIndex == null) return;
    const target = pasteTargetIndex;
    const next = el.pasteContinue.checked ? nextEmptyPanelAfter(target) : null;
    state.cells[target] = pendingPasteCell;
    state.selectedCell = target;
    multiSelect = [];
    renderAll();
    FP.toast('已粘贴到子图 #' + (target + 1), 'success', 2200);
    if (next != null) {
      // 对话框保持打开，直接切换到下一个空子图；不要自动读取旧剪贴板，避免重复粘贴同一张图
      openPasteDialog(next, { autoRead: false });
    } else {
      closePasteDialog();
    }
  }

  function collectClipboardFiles(clipboardData) {
    if (!clipboardData) return [];
    let files = [];
    if (clipboardData.files && clipboardData.files.length) {
      files = Array.from(clipboardData.files);
    } else if (clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    }
    return files.filter(FP.isImageFile);
  }

  /* ================= 演示 / 导出 ================= */
  async function loadDemo(skipConfirm) {
    if (!skipConfirm && anyFilled() && !window.confirm('载入示例会替换当前所有图片，是否继续？')) {
      return false;
    }
    el.btnDemo.disabled = true;
    setStatus('正在生成示例图片…');
    try {
      const demo = await FP.generateDemoCells(6);
      state.layout.rows = 3;
      state.layout.cols = 2;
      state.layout.merges = [];
      state.cells = new Array(6).fill(null);
      state.groups = [];
      for (let i = 0; i < demo.length && i < 6; i++) state.cells[i] = demo[i];
      state.selectedCell = null;
      multiSelect = [];
      renderAll();
      setStatus('已载入示例图片');
      FP.toast('已载入示例图片（3 行 × 2 列）', 'success');
      return true;
    } catch (err) {
      console.error(err);
      FP.toast('示例生成失败：' + (err.message || err), 'error', 5000);
      return false;
    } finally {
      el.btnDemo.disabled = false;
    }
  }

  const VECTOR_FONT_NAMES = {
    times: 'Times New Roman',
    arial: 'Arial',
    georgia: 'Georgia',
    calibri: 'Calibri',
    helvetica: 'Arial'
  };

  function mmToPt(mm) { return Number(mm) * 72 / 25.4; }

  function base64ToBytes(base64) {
    const bin = atob(String(base64 || ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function exportFileSpec(format, allPages) {
    if (allPages && format !== 'pdf') {
      return { ext: 'zip', mime: 'application/zip', label: 'ZIP 压缩包' };
    }
    if (format === 'pdf') return { ext: 'pdf', mime: 'application/pdf', label: 'PDF' };
    if (format === 'svg') return { ext: 'svg', mime: 'image/svg+xml', label: 'SVG' };
    if (format === 'jpg') return { ext: 'jpg', mime: 'image/jpeg', label: 'JPG' };
    return { ext: 'png', mime: 'image/png', label: 'PNG' };
  }

  function suggestedExportName(format, allPages) {
    let base = FP.safeFilename(state.export.filename || 'figure', 'figure');
    if (allPages && format !== 'pdf') base += '-pages';
    return base + '.' + exportFileSpec(format, allPages).ext;
  }

  async function pickExportFile(format, allPages) {
    if (state.export.saveAs === false || typeof window.showSaveFilePicker !== 'function') {
      return { mode: 'download' };
    }
    const spec = exportFileSpec(format, allPages);
    const accept = {};
    accept[spec.mime] = ['.' + spec.ext];
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: suggestedExportName(format, allPages),
        types: [{ description: spec.label, accept: accept }]
      });
      return { mode: 'handle', handle: handle };
    } catch (err) {
      if (err && err.name === 'AbortError') {
        // 无头浏览器自动化环境无法弹原生另存为窗口，自动回退为下载，避免测试/批处理卡住。
        if (navigator.webdriver) return { mode: 'download' };
        return { mode: 'canceled' };
      }
      console.warn('[FigurePlay] 另存为对话框不可用，改为下载', err);
      return { mode: 'download', error: err };
    }
  }

  async function writeBlobToHandle(handle, blob) {
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  /** 构造交给桌面版 PowerPoint 矢量排版引擎的当前页 spec。 */
  function buildVectorPdfSpec(cropOverride) {
    if (!(FP.desktop && FP.desktop.available)) return { ok: false, reason: '需要桌面版 FigurePlay' };
    if (state.export.vectorPdf === false) return { ok: false, reason: '已关闭矢量 PDF' };
    if (state.export.scope === 'all' && project.pages.length > 1) {
      return { ok: false, reason: '全部页暂不支持矢量模式，将使用多页位图 PDF' };
    }
    const info = emfVectorInfo();
    if (!info.count) return { ok: false, reason: '当前页没有 EMF 矢量图' };
    if (info.unsupported) return { ok: false, reason: '当前 EMF 子图含裁剪/旋转/偏移，暂不支持矢量排版' };
    const panels = [];
    for (let i = 0; i < geom.panels.length; i++) {
      const panel = geom.panels[i];
      const cell = state.cells[panel.index];
      if (!cell) continue;
      const fit = cell.fit === 'inherit' ? state.layout.fit : cell.fit;
      if (fit !== 'contain' && fit !== 'stretch') {
        return { ok: false, reason: '存在非“适应/拉伸”的图片显示方式' };
      }
      const base = {
        xMm: panel.x, yMm: panel.y, wMm: panel.w, hMm: panel.h,
        fit: fit, rotation: 0,
        border: {
          on: !!state.layout.borderOn,
          widthMm: state.layout.borderWidth,
          color: state.layout.borderColor
        }
      };
      if (cell.emfBase64) {
        base.image = {
          kind: 'emf', base64: cell.emfBase64,
          width: cell.width || 1, height: cell.height || 1,
          name: cell.name || 'figure.emf'
        };
      } else {
        const matches = /^data:(image\/(png|jpeg|jpg));base64,(.+)$/i.exec(String(cell.dataUrl || ''));
        if (!matches) {
          return { ok: false, reason: '当前页含 SVG/TIFF 等无法直接送入矢量排版引擎的图片' };
        }
        const subtype = matches[2].toLowerCase();
        base.image = {
          kind: subtype === 'png' ? 'png' : 'jpg',
          mime: 'image/' + (subtype === 'jpg' ? 'jpeg' : subtype),
          base64: matches[3],
          width: cell.width || 1,
          height: cell.height || 1,
          name: cell.name || ('image.' + subtype)
        };
      }
      panels.push(base);
    }
    const labels = [];
    for (let i = 0; i < currentLabels.length; i++) {
      const label = currentLabels[i];
      const panel = label.panel;
      if (!panel) continue;
      const placement = FP.getLabelPlacement(state.label, panel, label.text);
      const box = placement.box || { x: placement.x, y: placement.y - placement.ascentMm, w: 10, h: placement.fsMm };
      labels.push({
        text: label.text,
        xMm: placement.x,
        yMm: placement.y,
        boxXmm: box.x,
        boxYmm: box.y,
        boxWmm: Math.max(box.w, 0.5),
        boxHmm: Math.max(box.h, 0.5),
        fontSizePt: state.label.fontSizePt,
        fontName: VECTOR_FONT_NAMES[state.label.fontFamily] || 'Times New Roman',
        bold: !!state.label.bold,
        italic: !!state.label.italic,
        color: state.label.color,
        align: placement.ha === 'start' ? 'left' : (placement.ha === 'end' ? 'right' : 'center'),
        bg: state.label.bg,
        bgColor: state.label.bgColor,
        bgOpacity: state.label.bgOpacity
      });
    }
    return {
      ok: true,
      spec: {
        widthMm: geom.widthMm,
        heightMm: geom.heightMm,
        background: state.layout.bgMode === 'custom' ? state.layout.bgColor : '#ffffff',
        crop: cropOverride || (state.export.trimPdf ? FP.computeContentBBox(state, geom, state.export.trimMarginMm) : null),
        trimMarginMm: Math.max(1.0, Number(state.export.trimMarginMm) || 0),
        panels: panels,
        labels: labels
      },
      emfCount: info.count
    };
  }

  async function doExport() {
    if (exportBusy) return;
    const allPages = state.export.scope === 'all' && project.pages.length > 1;
    if (allPages) {
      syncPage();
      const hasAny = project.pages.some(function (page) {
        const g = FP.computeGeometry(page.layout);
        return g.panels.some(function (panel) { return !!page.cells[panel.index]; });
      });
      if (!hasAny) {
        FP.toast('所有图页都还没有图片', 'error');
        return;
      }
    } else if (!anyFilled()) {
      FP.toast('还没有添加任何图片', 'error');
      return;
    }
    const format = state.export.format;
    const target = await pickExportFile(format, allPages);
    if (target.mode === 'canceled') {
      setStatus('已取消导出');
      return;
    }
    if (target.mode === 'download' && target.error) {
      FP.toast('当前环境无法选择保存位置，已改为下载到默认目录', 'info', 3600);
    }
    exportBusy = true;
    el.btnExport.disabled = true;
    if (el.btnExportTop) el.btnExportTop.disabled = true;
    const originalText = el.btnExportText.textContent;
    el.btnExportText.textContent = '正在导出…';
    setStatus('正在导出 ' + FP.FORMATS[format].label + (allPages ? '（全部图页）' : '') + '…');
    try {
      const start = performance.now();
      let result = null;
      let vectorFallback = false;
      let trimCrop = null;
      let trimCrops = null;
      if (state.export.trimPdf && format === 'pdf') {
        setStatus('正在检测实际内容边界（白边裁剪）…');
        try {
          if (allPages) {
            trimCrops = await Promise.all(project.pages.map(function (page) {
              return FP.detectInkCrop(page, FP.computeGeometry(page.layout), {
                dpi: 96,
                marginMm: state.export.trimMarginMm
              });
            }));
            trimCrops = trimCrops.map(function (crop) {
              return crop && crop.wMm > 0 ? crop : null;
            });
          } else {
            trimCrop = await FP.detectInkCrop(state, geom, {
              dpi: 96,
              marginMm: state.export.trimMarginMm
            });
            if (!trimCrop || trimCrop.wMm <= 0) trimCrop = null;
          }
        } catch (trimErr) {
          console.warn('[FigurePlay] 墨迹边界检测失败，回退内容盒裁剪', trimErr);
        }
        if (!allPages && !trimCrop) {
          trimCrop = FP.computeContentBBox(state, geom, state.export.trimMarginMm);
        }
        if (allPages && !trimCrops) {
          trimCrops = project.pages.map(function (page) {
            return FP.computeContentBBox(page, FP.computeGeometry(page.layout), state.export.trimMarginMm);
          });
        }
      }
      if (hasUsableVectorPdf()) {
        setStatus('正在用 PowerPoint 生成矢量 PDF…');
        const vec = buildVectorPdfSpec(trimCrop);
        if (vec.ok) {
          try {
            const r = await FP.desktop.exportVectorPdf(vec.spec);
            const blob = new Blob([base64ToBytes(r.pdfBase64)], { type: 'application/pdf' });
            result = {
              blob: blob,
              filename: suggestedExportName('pdf', false),
              format: 'pdf',
              mime: 'application/pdf',
              bytes: r.bytes || blob.size,
              pageCount: 1,
              vector: true,
              engine: r.engine,
              vectorPanels: r.vectorPanels,
              rasterPanels: r.rasterPanels
            };
          } catch (err) {
            console.warn('[FigurePlay] 矢量 PDF 失败，回退位图', err);
            vectorFallback = true;
            FP.toast('矢量 PDF 生成失败，已自动回退为高分辨率位图 PDF：' + (err.message || err), 'error', 6000);
          }
        }
      }
      if (!result) {
        if (allPages) {
          syncPage();
          const pageStates = project.pages.map(function (page) {
            return {
              name: page.name,
              layout: page.layout,
              cells: page.cells,
              label: page.label,
              groups: page.groups,
              export: state.export
            };
          });
          const crops = state.export.trimPdf
            ? (trimCrops || project.pages.map(function (page) {
                return FP.computeContentBBox(page, FP.computeGeometry(page.layout), state.export.trimMarginMm);
              }))
            : null;
          result = await FP.buildAllPagesExport(pageStates, {
            format: format,
            dpi: state.export.dpi,
            quality: state.export.jpgQuality,
            transparent: state.export.transparent,
            filename: state.export.filename,
            crops: crops,
            onProgress: function (index, total) {
              setStatus('正在导出全部图页（' + (index + 1) + '/' + total + '）…');
            }
          });
        } else {
          const cropMm = state.export.trimPdf
            ? (trimCrop || FP.computeContentBBox(state, geom, state.export.trimMarginMm))
            : null;
          result = await FP.buildExport(state, geom, {
            format: format,
            dpi: state.export.dpi,
            quality: state.export.jpgQuality,
            transparent: state.export.transparent,
            filename: state.export.filename,
            cropMm: cropMm
          });
        }
      }
      const elapsed = Math.round(performance.now() - start);
      const extra = result.vector ? ' · 矢量 PDF' : (allPages ? '（' + result.pageCount + ' 页）' : '');
      if (target.mode === 'handle') {
        try {
          await writeBlobToHandle(target.handle, result.blob);
        } catch (writeErr) {
          throw new Error('写入所选文件失败：' + (writeErr.message || writeErr));
        }
        setStatus('已保存到 ' + target.handle.name + '（' + FP.formatBytes(result.bytes) + '，' + elapsed + ' ms）');
        FP.toast('已保存到所选位置：' + target.handle.name + extra, 'success', 3600);
      } else {
        FP.downloadBlob(result.blob, result.filename);
        setStatus('已导出 ' + result.filename + '（' + FP.formatBytes(result.bytes) + '，' + elapsed + ' ms）');
        FP.toast('已导出 ' + result.filename + extra + ' · ' + FP.formatBytes(result.bytes), 'success', 3600);
      }
      if (vectorFallback) setStatus('矢量模式失败，已回退位图 PDF（' + FP.formatBytes(result.bytes) + '）');
    } catch (err) {
      console.error(err);
      setStatus('导出失败');
      FP.toast('导出失败：' + (err.message || err), 'error', 6000);
    } finally {
      exportBusy = false;
      el.btnExport.disabled = false;
      if (el.btnExportTop) el.btnExportTop.disabled = false;
      el.btnExportText.textContent = originalText;
    }
  }

  /* ================= 预览交互 ================= */
  function cellIndexAtPoint(clientX, clientY) {
    try {
      const ctm = el.svg.getScreenCTM();
      if (!ctm) return null;
      const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      for (let i = 0; i < geom.panels.length; i++) {
        const panel = geom.panels[i];
        if (pt.x >= panel.x && pt.x <= panel.x + panel.w && pt.y >= panel.y && pt.y <= panel.y + panel.h) {
          return panel.index;
        }
      }
    } catch (err) { /* ignore */ }
    return null;
  }

  function hasFilePayload(e) {
    if (!e.dataTransfer) return false;
    const types = Array.from(e.dataTransfer.types || []);
    return types.indexOf('Files') >= 0;
  }

  function patchSelectedCell() {
    if (!preview || state.selectedCell == null) return;
    preview.patchCellTransform(state, geom, state.selectedCell);
    scheduleSave();
  }

  /* ================= 事件绑定 ================= */
  function bindEvents() {
    // 矩阵选择器
    el.matrix.addEventListener('mouseover', function (e) {
      const b = e.target.closest('.mx');
      if (!b) return;
      const hr = Number(b.dataset.r), hc = Number(b.dataset.c);
      for (let i = 0; i < el.matrix.children.length; i++) {
        const node = el.matrix.children[i];
        const r = Number(node.dataset.r), c = Number(node.dataset.c);
        node.className = 'mx' + (r <= hr && c <= hc ? ' is-hover' : '');
      }
      el.matrixCaption.textContent = hr + ' 行 × ' + hc + ' 列';
    });
    el.matrix.addEventListener('mouseleave', updateMatrixActive);
    el.matrix.addEventListener('click', function (e) {
      const b = e.target.closest('.mx');
      if (!b) return;
      applyLayout(Number(b.dataset.r), Number(b.dataset.c));
    });

    el.preset.addEventListener('click', function (e) {
      const b = e.target.closest('.chip');
      if (!b) return;
      applyLayout(Number(b.dataset.rows), Number(b.dataset.cols));
    });

    // 图页
    if (el.btnPageAdd) el.btnPageAdd.addEventListener('click', function () { addPage('new'); });
    if (el.btnPageDup) el.btnPageDup.addEventListener('click', function () { addPage('duplicate'); });
    if (el.btnPageDel) el.btnPageDel.addEventListener('click', deletePage);

    // 撤销 / 重做
    if (el.btnUndo) el.btnUndo.addEventListener('click', undo);
    if (el.btnRedo) el.btnRedo.addEventListener('click', redo);

    // 子图分组
    el.btnGroupCreate.addEventListener('click', function () { openGroupDialog('create'); });
    el.groupScheme.addEventListener('change', updateGroupPreview);
    el.groupStart.addEventListener('input', updateGroupPreview);
    el.groupSave.addEventListener('click', saveGroupDialog);
    el.groupCancel.addEventListener('click', function () { el.groupDialog.close(); });
    el.groupClose.addEventListener('click', function () { el.groupDialog.close(); });
    el.groupDialog.addEventListener('click', function (e) {
      if (e.target === el.groupDialog) el.groupDialog.close();
    });

    el.rows.addEventListener('change', function () { applyLayout(el.rows.value, state.layout.cols); });
    el.cols.addEventListener('change', function () { applyLayout(state.layout.rows, el.cols.value); });

    bindLayoutNumber(el.width, 'widthMm', 20, 500, 170);
    bindLayoutNumber(el.aspectW, 'aspectW', 0.2, 10, 4);
    bindLayoutNumber(el.aspectH, 'aspectH', 0.2, 10, 3);
    bindLayoutNumber(el.colGap, 'colGap', -50, 80, 2);
    bindLayoutNumber(el.rowGap, 'rowGap', -50, 80, 2);
    bindLayoutNumber(el.margin, 'margin', 0, 80, 0);

    el.bgMode.addEventListener('change', function () {
      state.layout.bgMode = el.bgMode.value;
      updateBgUI();
      schedulePreview();
    });
    el.bgColor.addEventListener('input', function () {
      state.layout.bgColor = el.bgColor.value;
      el.bgColorHex.textContent = state.layout.bgColor;
      schedulePreview();
    });
    el.borderOn.addEventListener('change', function () {
      state.layout.borderOn = el.borderOn.checked;
      schedulePreview();
    });
    el.borderWidth.addEventListener('input', function () {
      const v = parseFloat(el.borderWidth.value);
      if (!isFinite(v)) return;
      state.layout.borderWidth = FP.clamp(v, 0.05, 2);
      schedulePreview();
    });
    el.borderWidth.addEventListener('change', function () {
      state.layout.borderWidth = FP.clamp(parseFloat(el.borderWidth.value) || 0.25, 0.05, 2);
      el.borderWidth.value = String(state.layout.borderWidth);
      schedulePreview();
    });
    el.borderColor.addEventListener('input', function () {
      state.layout.borderColor = el.borderColor.value;
      schedulePreview();
    });
    el.globalFit.addEventListener('change', function () {
      state.layout.fit = el.globalFit.value;
      schedulePreview();
    });
    if (el.autoPadToggle) {
      el.autoPadToggle.addEventListener('change', function () {
        state.layout.autoPad = el.autoPadToggle.checked;
        if (!state.layout.autoPad) {
          state.layout.padTopMm = 0;
          state.layout.padRightMm = 0;
          state.layout.padBottomMm = 0;
          state.layout.padLeftMm = 0;
        }
        renderAll();
        scheduleSave();
      });
    }
    function bindPadInput(node, key) {
      if (!node) return;
      const apply = function (commit) {
        let v = parseFloat(node.value);
        if (!isFinite(v)) v = 0;
        v = FP.clamp(v, 0, 200);
        state.layout[key] = v;
        if (commit) node.value = String(v);
        renderAll();
        scheduleSave();
      };
      node.addEventListener('input', function () { apply(false); });
      node.addEventListener('change', function () { apply(true); });
    }
    bindPadInput(el.padTop, 'padTopMm');
    bindPadInput(el.padRight, 'padRightMm');
    bindPadInput(el.padBottom, 'padBottomMm');
    bindPadInput(el.padLeft, 'padLeftMm');

    // 编号
    el.labelShow.addEventListener('change', function () {
      state.label.show = el.labelShow.checked;
      el.labelOptions.hidden = !state.label.show;
      scheduleFullRender();
    });
    el.labelScheme.addEventListener('change', function () {
      state.label.scheme = FP.schemeById(el.labelScheme.value).id;
      updateSchemePreview();
      scheduleFullRender();
    });
    el.labelStart.addEventListener('input', function () {
      const v = parseInt(el.labelStart.value, 10);
      if (!isFinite(v)) return;
      state.label.start = FP.clamp(v, 1, 999);
      updateSchemePreview();
      scheduleFullRender();
    });
    el.labelStart.addEventListener('change', function () {
      state.label.start = FP.clamp(parseInt(el.labelStart.value, 10) || 1, 1, 999);
      el.labelStart.value = String(state.label.start);
      updateSchemePreview();
      scheduleFullRender();
    });
    el.labelOrder.addEventListener('change', function () {
      state.label.order = el.labelOrder.value === 'col' ? 'col' : 'row';
      scheduleFullRender();
    });
    el.labelSkipEmpty.addEventListener('change', function () {
      state.label.skipEmpty = el.labelSkipEmpty.checked;
      scheduleFullRender();
    });
    el.posPicker.addEventListener('click', function (e) {
      const b = e.target.closest('.pos-btn');
      if (!b) return;
      state.label.position = b.dataset.pos;
      updatePositionActive();
      schedulePreview();
    });
    bindLabelNumber(el.labelInset, 'insetMm', 0, 20, 1.5);
    bindLabelNumber(el.labelOffsetX, 'offsetXmm', -100, 100, 0);
    bindLabelNumber(el.labelOffsetY, 'offsetYmm', -100, 100, 0);
    el.labelFont.addEventListener('change', function () { state.label.fontFamily = el.labelFont.value; schedulePreview(); });
    el.labelSize.addEventListener('input', function () {
      const v = parseFloat(el.labelSize.value);
      if (!isFinite(v)) return;
      state.label.fontSizePt = FP.clamp(v, 4, 72);
      schedulePreview();
    });
    el.labelSize.addEventListener('change', function () {
      state.label.fontSizePt = FP.clamp(parseFloat(el.labelSize.value) || 9, 4, 72);
      el.labelSize.value = String(state.label.fontSizePt);
      schedulePreview();
    });
    el.labelBold.addEventListener('change', function () { state.label.bold = el.labelBold.checked; schedulePreview(); });
    el.labelItalic.addEventListener('change', function () { state.label.italic = el.labelItalic.checked; schedulePreview(); });
    el.labelColor.addEventListener('input', function () { state.label.color = el.labelColor.value; schedulePreview(); });
    el.labelBg.addEventListener('change', function () {
      state.label.bg = el.labelBg.value;
      const currentColor = String(state.label.color || '').toLowerCase();
      if (state.label.bg === 'black' && currentColor === '#000000') {
        state.label.color = '#ffffff';
        el.labelColor.value = '#ffffff';
      } else if (state.label.bg === 'white' && currentColor === '#ffffff') {
        state.label.color = '#000000';
        el.labelColor.value = '#000000';
      }
      el.labelBgColorRow.style.display = state.label.bg === 'custom' ? '' : 'none';
      el.labelBgOpacityRow.style.display = state.label.bg === 'none' ? 'none' : '';
      schedulePreview();
    });
    el.labelBgColor.addEventListener('input', function () { state.label.bgColor = el.labelBgColor.value; schedulePreview(); });
    el.labelBgOpacity.addEventListener('input', function () {
      state.label.bgOpacity = FP.clamp(parseInt(el.labelBgOpacity.value, 10) / 100, 0, 1);
      el.labelBgOpacityVal.value = Math.round(state.label.bgOpacity * 100);
      schedulePreview();
    });
    el.labelBgOpacityVal.addEventListener('input', function () {
      const v = parseInt(el.labelBgOpacityVal.value, 10);
      if (!isFinite(v)) return;
      state.label.bgOpacity = FP.clamp(v, 0, 100) / 100;
      el.labelBgOpacity.value = String(Math.round(state.label.bgOpacity * 100));
      schedulePreview();
    });
    el.labelBgOpacityVal.addEventListener('change', function () {
      state.label.bgOpacity = FP.clamp(parseInt(el.labelBgOpacityVal.value, 10) || 0, 0, 100) / 100;
      el.labelBgOpacityVal.value = Math.round(state.label.bgOpacity * 100);
      el.labelBgOpacity.value = String(Math.round(state.label.bgOpacity * 100));
      schedulePreview();
    });

    // 缩放
    el.zoomFit.addEventListener('click', function () { setFitMode(true); });
    el.zoom100.addEventListener('click', function () { fitMode = false; currentPct = 100; applyZoom(); });
    el.zoomOut.addEventListener('click', function () { zoomBy(0.85); });
    el.zoomIn.addEventListener('click', function () { zoomBy(1 / 0.85); });

    // 上传 / 粘贴 / 示例 / 清空 / 模板
    el.btnUpload.addEventListener('click', function () { openFilePicker(null); });
    el.btnPaste.addEventListener('click', function () {
      openPasteDialog(targetPanelForPaste());
    });
    el.btnDemo.addEventListener('click', function () { loadDemo(false); });
    el.btnClear.addEventListener('click', function () { clearAllCells(true); });
    el.btnTemplates.addEventListener('click', openTemplateDialog);
    el.fileInput.addEventListener('change', async function () {
      const files = Array.from(el.fileInput.files || []);
      const target = pendingTarget;
      pendingTarget = null;
      el.fileInput.value = '';
      if (files.length) await handleFiles(files, target);
    });

    // 模板弹窗
    el.templateGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.template-card');
      if (!card) return;
      applyTemplate(card.dataset.template);
    });
    el.templateClose.addEventListener('click', function () { el.templateDialog.close(); });
    el.templateDialog.addEventListener('click', function (e) {
      if (e.target === el.templateDialog) el.templateDialog.close();
    });

    // 多选 / 合并
    el.multiMerge.addEventListener('click', mergeSelectedPanels);
    el.multiBatchLabel.addEventListener('click', openBatchLabelDialog);
    el.multiCancel.addEventListener('click', clearSelection);

    // 子图卡片
    el.cellFit.addEventListener('change', function () {
      const idx = state.selectedCell;
      if (idx == null || !state.cells[idx]) return;
      state.cells[idx].fit = el.cellFit.value;
      patchSelectedCell();
    });
    el.cellZoom.addEventListener('input', function () {
      const idx = state.selectedCell;
      if (idx == null || !state.cells[idx]) return;
      const value = FP.clamp(parseInt(el.cellZoom.value, 10) / 100, 0.2, 4);
      state.cells[idx].zoom = value;
      el.cellZoomVal.value = Math.round(value * 100);
      patchSelectedCell();
    });
    el.cellZoomVal.addEventListener('input', function () {
      const idx = state.selectedCell;
      if (idx == null || !state.cells[idx]) return;
      const v = parseInt(el.cellZoomVal.value, 10);
      if (!isFinite(v)) return;
      const value = FP.clamp(v / 100, 0.2, 4);
      state.cells[idx].zoom = value;
      el.cellZoom.value = String(Math.round(value * 100));
      patchSelectedCell();
    });
    el.cellZoomVal.addEventListener('change', function () {
      const idx = state.selectedCell;
      if (idx == null || !state.cells[idx]) return;
      const value = FP.clamp((parseInt(el.cellZoomVal.value, 10) || 100) / 100, 0.2, 4);
      state.cells[idx].zoom = value;
      el.cellZoomVal.value = Math.round(value * 100);
      el.cellZoom.value = String(Math.round(value * 100));
      patchSelectedCell();
    });
    bindCellOffset(el.cellOffsetX, 'offsetX');
    bindCellOffset(el.cellOffsetY, 'offsetY');
    el.cellRotation.addEventListener('click', function (e) {
      const b = e.target.closest('[data-rot]');
      if (!b) return;
      const idx = state.selectedCell;
      if (idx == null || !state.cells[idx]) return;
      state.cells[idx].rotation = Number(b.dataset.rot) || 0;
      updateRotationButtons(state.cells[idx]);
      patchSelectedCell();
    });
    el.cellCustomLabel.addEventListener('input', function () {
      const idx = state.selectedCell;
      if (idx == null || !state.cells[idx]) return;
      state.cells[idx].customLabel = el.cellCustomLabel.value.slice(0, 24);
      scheduleFullRender();
    });
    el.cellPaste.addEventListener('click', function () {
      if (state.selectedCell != null) openPasteDialog(state.selectedCell);
    });
    el.cellReplace.addEventListener('click', function () {
      if (state.selectedCell != null) openFilePicker(state.selectedCell);
    });
    el.cellSplit.addEventListener('click', splitSelectedPanel);
    el.cellClear.addEventListener('click', removeSelectedImage);
    el.cellPrev.addEventListener('click', function () { moveSelectedBy(-1); });
    el.cellNext.addEventListener('click', function () { moveSelectedBy(1); });

    // 批量编号弹窗
    el.batchScheme.addEventListener('change', updateBatchPreview);
    el.batchStart.addEventListener('input', updateBatchPreview);
    el.batchApply.addEventListener('click', applyBatchLabels);
    el.batchClear.addEventListener('click', clearBatchLabels);
    el.batchClose.addEventListener('click', function () { el.batchDialog.close(); });
    el.batchDialog.addEventListener('click', function (e) {
      if (e.target === el.batchDialog) el.batchDialog.close();
    });

    // 粘贴弹窗
    el.pasteZone.addEventListener('click', function () {
      if (pendingPasteCell) return;
      if (FP.desktop && FP.desktop.available) readNativeClipboard(false);
      else {
        setPasteStatus('请按 Ctrl+V 粘贴；也可以点「选择本地图片」或把图片拖进此区域。');
        try { el.pasteZone.focus(); } catch (err) { /* ignore */ }
      }
    });
    el.pasteZone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && pendingPasteCell) {
        e.preventDefault();
        confirmPaste();
      }
    });
    el.pasteZone.addEventListener('dragover', function (e) {
      if (!hasFilePayload(e)) return;
      e.preventDefault();
      el.pasteZone.classList.add('is-dragover');
    });
    el.pasteZone.addEventListener('dragleave', function () { el.pasteZone.classList.remove('is-dragover'); });
    el.pasteZone.addEventListener('drop', function (e) {
      if (!hasFilePayload(e)) return;
      e.preventDefault();
      el.pasteZone.classList.remove('is-dragover');
      const files = Array.from(e.dataTransfer.files || []).filter(FP.isSupportedFile);
      if (files.length) decodePasteFiles(files);
    });
    el.pastePickFile.addEventListener('click', function () {
      el.pasteFileInput.value = '';
      el.pasteFileInput.click();
    });
    el.pasteFileInput.addEventListener('change', function () {
      const files = Array.from(el.pasteFileInput.files || []);
      el.pasteFileInput.value = '';
      if (files.length) decodePasteFiles(files);
    });
    el.pasteReadClipboard.addEventListener('click', function () { readNativeClipboard(false); });
    el.pasteRetry.addEventListener('click', function () {
      resetPastePreview();
      if (FP.desktop && FP.desktop.available) readNativeClipboard(false);
      else setPasteStatus('请按 Ctrl+V 重新粘贴');
    });
    el.pasteConfirm.addEventListener('click', confirmPaste);
    el.pasteCancel.addEventListener('click', closePasteDialog);
    el.pasteClose.addEventListener('click', closePasteDialog);
    el.pasteDialog.addEventListener('close', function () {
      pasteRequestToken++;
      pendingPasteCell = null;
      pasteTargetIndex = null;
    });
    el.pasteDialog.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'v' &&
        FP.desktop && FP.desktop.available && !FP.isTextInput(e.target)) {
        e.preventDefault();
        readNativeClipboard(false);
        return;
      }
      if (e.key === 'Enter' && pendingPasteCell && !FP.isTextInput(e.target) &&
        e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        confirmPaste();
      }
    });
    document.addEventListener('paste', function (e) {
      if (!el.pasteDialog.open) return;
      if (FP.desktop && FP.desktop.available && pendingPasteCell) return;
      const files = collectClipboardFiles(e.clipboardData);
      if (!files.length) return;
      e.preventDefault();
      decodePasteFiles(files);
    });

    // 导出设置
    el.filename.addEventListener('input', function () {
      state.export.filename = el.filename.value.slice(0, 80);
      scheduleSave();
    });
    el.formatButtons.addEventListener('click', function (e) {
      const b = e.target.closest('[data-format]');
      if (!b) return;
      state.export.format = FP.normalizeFormat(b.dataset.format);
      syncExportUI();
      renderPreviewNow();
      scheduleSave();
    });
    if (el.exportScopeSeg) {
      el.exportScopeSeg.addEventListener('click', function (e) {
        const b = e.target.closest('[data-scope]');
        if (!b) return;
        state.export.scope = b.dataset.scope === 'all' ? 'all' : 'current';
        updateExportScopeUI();
        scheduleSave();
      });
    }
    el.dpiInput.addEventListener('input', function () {
      const v = parseInt(el.dpiInput.value, 10);
      if (!isFinite(v)) return;
      state.export.dpi = FP.clamp(v, 36, 1200);
      updateExportReadout();
      updateStatusDims();
      updateDpiChips();
      scheduleSave();
    });
    el.dpiInput.addEventListener('change', function () {
      state.export.dpi = FP.clamp(parseInt(el.dpiInput.value, 10) || 300, 36, 1200);
      el.dpiInput.value = String(state.export.dpi);
      updateExportReadout();
      updateStatusDims();
      updateDpiChips();
      scheduleSave();
    });
    el.dpiChips.addEventListener('click', function (e) {
      const b = e.target.closest('[data-dpi]');
      if (!b) return;
      state.export.dpi = Number(b.dataset.dpi);
      el.dpiInput.value = String(state.export.dpi);
      updateExportReadout();
      updateStatusDims();
      updateDpiChips();
      scheduleSave();
    });
    el.jpgQuality.addEventListener('input', function () {
      state.export.jpgQuality = FP.clamp(parseInt(el.jpgQuality.value, 10) / 100, 0.5, 1);
      el.jpgQualityVal.value = Math.round(state.export.jpgQuality * 100);
      scheduleSave();
    });
    el.jpgQualityVal.addEventListener('input', function () {
      const v = parseInt(el.jpgQualityVal.value, 10);
      if (!isFinite(v)) return;
      state.export.jpgQuality = FP.clamp(v, 60, 100) / 100;
      el.jpgQuality.value = String(Math.round(state.export.jpgQuality * 100));
      scheduleSave();
    });
    el.jpgQualityVal.addEventListener('change', function () {
      state.export.jpgQuality = FP.clamp(parseInt(el.jpgQualityVal.value, 10) || 95, 60, 100) / 100;
      el.jpgQualityVal.value = Math.round(state.export.jpgQuality * 100);
      el.jpgQuality.value = String(Math.round(state.export.jpgQuality * 100));
      scheduleSave();
    });
    el.transparentToggle.addEventListener('change', function () {
      state.export.transparent = el.transparentToggle.checked;
      renderPreviewNow();
      scheduleSave();
    });
    if (el.saveAsToggle) {
      el.saveAsToggle.addEventListener('change', function () {
        state.export.saveAs = el.saveAsToggle.checked;
        scheduleSave();
      });
    }
    if (el.vectorPdfToggle) {
      el.vectorPdfToggle.addEventListener('change', function () {
        state.export.vectorPdf = el.vectorPdfToggle.checked;
        updateExportReadout();
        scheduleSave();
      });
    }
    if (el.pdfTrimToggle) {
      el.pdfTrimToggle.addEventListener('change', function () {
        state.export.trimPdf = el.pdfTrimToggle.checked;
        syncExportUI();
        updateExportReadout();
        scheduleSave();
      });
    }
    if (el.pdfTrimMargin) {
      el.pdfTrimMargin.addEventListener('input', function () {
        const v = parseFloat(el.pdfTrimMargin.value);
        if (!isFinite(v)) return;
        state.export.trimMarginMm = FP.clamp(v, 0, 20);
        updateExportReadout();
        scheduleSave();
      });
      el.pdfTrimMargin.addEventListener('change', function () {
        const v = FP.clamp(parseFloat(el.pdfTrimMargin.value) || 0, 0, 20);
        state.export.trimMarginMm = v;
        el.pdfTrimMargin.value = String(v);
        updateExportReadout();
        scheduleSave();
      });
    }
    el.btnExport.addEventListener('click', doExport);
    if (el.btnExportTop) el.btnExportTop.addEventListener('click', doExport);

    // 帮助弹窗
    el.btnHelp.addEventListener('click', function () {
      if (typeof el.helpDialog.showModal === 'function') el.helpDialog.showModal();
      else el.helpDialog.setAttribute('open', '');
    });
    el.helpClose.addEventListener('click', function () {
      if (typeof el.helpDialog.close === 'function') el.helpDialog.close();
      else el.helpDialog.removeAttribute('open');
    });
    el.helpDialog.addEventListener('click', function (e) {
      if (e.target === el.helpDialog) el.helpDialog.close();
    });

    // 预览：点击 / 双击 / 拖动平移 / 滚轮缩放
    el.svg.addEventListener('click', function (e) {
      const hit = e.target.closest ? e.target.closest('.cell-hit') : null;
      if (!hit) return;
      if (suppressClick) { suppressClick = false; return; }
      const idx = Number(hit.dataset.index);
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        toggleMultiSelect(idx);
      } else if (state.cells[idx]) {
        selectSingle(idx);
      } else {
        openPasteDialog(idx);
      }
    });
    el.svg.addEventListener('dblclick', function (e) {
      const hit = e.target.closest ? e.target.closest('.cell-hit') : null;
      if (!hit) return;
      const idx = Number(hit.dataset.index);
      openPasteDialog(idx);
    });
    el.svg.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      const hit = e.target.closest ? e.target.closest('.cell-hit') : null;
      if (!hit) return;
      const idx = Number(hit.dataset.index);
      const cell = state.cells[idx];
      if (!cell || state.selectedCell !== idx || multiSelect.length > 1) return;
      // 先不 capture / preventDefault，保证 click / dblclick 的目标仍是命中矩形
      pan = {
        idx: idx,
        startX: e.clientX,
        startY: e.clientY,
        baseX: cell.offsetX || 0,
        baseY: cell.offsetY || 0,
        moved: false,
        pointerId: e.pointerId,
        captured: false
      };
    });
    window.addEventListener('pointermove', function (e) {
      if (!pan) return;
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      if (!pan.moved && Math.sqrt(dx * dx + dy * dy) < 3) return;
      pan.moved = true;
      if (!pan.captured) {
        pan.captured = true;
        try { el.svg.setPointerCapture(pan.pointerId); } catch (err) { /* ignore */ }
      }
      const rect = el.svg.getBoundingClientRect();
      const pxPerMm = rect.width / geom.widthMm || 1;
      const cell = state.cells[pan.idx];
      if (!cell) return;
      cell.offsetX = pan.baseX + dx / pxPerMm;
      cell.offsetY = pan.baseY + dy / pxPerMm;
      preview.patchCellTransform(state, geom, pan.idx);
      setNodeValue(el.cellOffsetX, FP.round(cell.offsetX, 1));
      setNodeValue(el.cellOffsetY, FP.round(cell.offsetY, 1));
      scheduleSave();
    });
    function endPan() {
      if (!pan) return;
      const moved = pan.moved;
      if (pan.captured) {
        try { el.svg.releasePointerCapture(pan.pointerId); } catch (err) { /* ignore */ }
      }
      pan = null;
      if (moved) {
        suppressClick = true;
        renderPreviewNow();
      }
    }
    window.addEventListener('pointerup', endPan);
    window.addEventListener('pointercancel', endPan);

    el.svg.addEventListener('wheel', function (e) {
      const idx = state.selectedCell;
      if (idx == null || multiSelect.length > 1) return;
      const cell = state.cells[idx];
      if (!cell) return;
      const hit = e.target.closest ? e.target.closest('.cell-hit') : null;
      if (!hit || Number(hit.dataset.index) !== idx) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0012);
      cell.zoom = FP.clamp((cell.zoom || 1) * factor, 0.2, 4);
      preview.patchCellTransform(state, geom, idx);
      setNodeValue(el.cellZoom, Math.round(cell.zoom * 100));
      el.cellZoomVal.value = Math.round(cell.zoom * 100);
      scheduleSave();
    }, { passive: false });

    // 拖放文件
    el.stage.addEventListener('dragenter', function (e) {
      if (!hasFilePayload(e)) return;
      e.preventDefault();
      dragDepth++;
      el.stage.classList.add('is-dragover');
    });
    el.stage.addEventListener('dragover', function (e) {
      if (!hasFilePayload(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });
    el.stage.addEventListener('dragleave', function (e) {
      if (!hasFilePayload(e)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) el.stage.classList.remove('is-dragover');
    });
    el.stage.addEventListener('drop', async function (e) {
      if (!hasFilePayload(e)) return;
      e.preventDefault();
      dragDepth = 0;
      el.stage.classList.remove('is-dragover');
      const files = Array.from(e.dataTransfer.files || []);
      if (!files.length) return;
      const idx = cellIndexAtPoint(e.clientX, e.clientY);
      await handleFiles(files, idx);
    });
    window.addEventListener('dragover', function (e) {
      if (hasFilePayload(e)) e.preventDefault();
    });
    window.addEventListener('drop', function (e) {
      if (hasFilePayload(e)) e.preventDefault();
    });

    // 缩略图列表
    el.filmstrip.addEventListener('click', function (e) {
      const add = e.target.closest('[data-action="batch-upload"]');
      if (add) { openFilePicker(null); return; }
      const item = e.target.closest('.film-item');
      if (!item) return;
      const idx = Number(item.dataset.index);
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        toggleMultiSelect(idx);
      } else if (state.cells[idx]) {
        selectSingle(idx);
      } else {
        openPasteDialog(idx);
      }
    });
    el.filmstrip.addEventListener('dblclick', function (e) {
      const item = e.target.closest('.film-item');
      if (!item) return;
      openPasteDialog(Number(item.dataset.index));
    });
    el.filmstrip.addEventListener('dragstart', function (e) {
      const item = e.target.closest('.film-item');
      if (!item || !state.cells[Number(item.dataset.index)]) return;
      filmDragIndex = Number(item.dataset.index);
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(filmDragIndex)); } catch (err) { /* ignore */ }
      }
    });
    el.filmstrip.addEventListener('dragover', function (e) {
      if (filmDragIndex == null) return;
      const item = e.target.closest('.film-item');
      if (!item) return;
      e.preventDefault();
      for (let i = 0; i < el.filmstrip.children.length; i++) {
        el.filmstrip.children[i].classList.remove('is-drop-target');
      }
      item.classList.add('is-drop-target');
    });
    el.filmstrip.addEventListener('drop', function (e) {
      if (filmDragIndex == null) return;
      const item = e.target.closest('.film-item');
      if (!item) return;
      e.preventDefault();
      const target = Number(item.dataset.index);
      const from = filmDragIndex;
      filmDragIndex = null;
      for (let i = 0; i < el.filmstrip.children.length; i++) {
        el.filmstrip.children[i].classList.remove('is-drop-target');
      }
      if (from !== target) swapCells(from, target);
    });
    el.filmstrip.addEventListener('dragend', function () {
      filmDragIndex = null;
      for (let i = 0; i < el.filmstrip.children.length; i++) {
        el.filmstrip.children[i].classList.remove('is-drop-target');
      }
    });

    // 全局粘贴（非弹窗状态）
    document.addEventListener('paste', function (e) {
      if (el.pasteDialog.open) return;
      const files = collectClipboardFiles(e.clipboardData);
      if (!files.length) return;
      e.preventDefault();
      openPasteDialog(targetPanelForPaste(), { files: files });
    });

    // 键盘
    document.addEventListener('keydown', function (e) {
      const meta = e.ctrlKey || e.metaKey;
      const keyLower = String(e.key || '').toLowerCase();
      if (meta && !FP.isTextInput(e.target) && (keyLower === 'z' || keyLower === 'y')) {
        const dialogOpen = el.helpDialog.open || el.templateDialog.open || el.pasteDialog.open ||
          el.batchDialog.open || el.groupDialog.open;
        if (!dialogOpen) {
          e.preventDefault();
          if (keyLower === 'y' || e.shiftKey) redo();
          else undo();
          return;
        }
      }
      if (meta && (e.key === 'PageUp' || e.key === 'PageDown') && !FP.isTextInput(e.target)) {
        e.preventDefault();
        const delta = e.key === 'PageDown' ? 1 : -1;
        switchPage(project.current + delta);
        return;
      }
      const ctrlV = meta && keyLower === 'v';
      if (ctrlV && FP.desktop && FP.desktop.available && !FP.isTextInput(e.target)) {
        e.preventDefault();
        if (el.pasteDialog.open) readNativeClipboard(false);
        else openPasteDialog(targetPanelForPaste());
        return;
      }
      if (e.key === 'Escape') {
        if (el.helpDialog.open || el.templateDialog.open || el.pasteDialog.open ||
          el.batchDialog.open || el.groupDialog.open) return;
        if (state.selectedCell != null || multiSelect.length) clearSelection();
        return;
      }
      if (FP.isTextInput(e.target)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedCell != null) {
        e.preventDefault();
        removeSelectedImage();
        return;
      }
      if (state.selectedCell != null && state.cells[state.selectedCell] && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 1 : 0.2;
        const cell = state.cells[state.selectedCell];
        if (e.key === 'ArrowLeft') cell.offsetX -= step;
        else if (e.key === 'ArrowRight') cell.offsetX += step;
        else if (e.key === 'ArrowUp') cell.offsetY -= step;
        else cell.offsetY += step;
        preview.patchCellTransform(state, geom, state.selectedCell);
        setNodeValue(el.cellOffsetX, FP.round(cell.offsetX, 1));
        setNodeValue(el.cellOffsetY, FP.round(cell.offsetY, 1));
        scheduleSave();
      }
    });

    window.addEventListener('resize', function () {
      if (fitMode) applyZoom();
    });
  }

  function bindLayoutNumber(node, key, min, max, fallback) {
    node.addEventListener('input', function () {
      const v = parseFloat(node.value);
      if (!isFinite(v)) return;
      state.layout[key] = FP.clamp(v, min, max);
      schedulePreview();
    });
    node.addEventListener('change', function () {
      let v = parseFloat(node.value);
      if (!isFinite(v)) v = fallback;
      v = FP.clamp(v, min, max);
      state.layout[key] = v;
      node.value = String(v);
      schedulePreview();
    });
  }

  function bindLabelNumber(node, key, min, max, fallback) {
    node.addEventListener('input', function () {
      const v = parseFloat(node.value);
      if (!isFinite(v)) return;
      state.label[key] = FP.clamp(v, min, max);
      schedulePreview();
    });
    node.addEventListener('change', function () {
      let v = parseFloat(node.value);
      if (!isFinite(v)) v = fallback;
      v = FP.clamp(v, min, max);
      state.label[key] = v;
      node.value = String(v);
      schedulePreview();
    });
  }

  function bindCellOffset(node, key) {
    node.addEventListener('input', function () {
      const idx = state.selectedCell;
      if (idx == null || !state.cells[idx]) return;
      const v = parseFloat(node.value);
      if (!isFinite(v)) return;
      state.cells[idx][key] = FP.clamp(v, -2000, 2000);
      patchSelectedCell();
    });
    node.addEventListener('change', function () {
      const idx = state.selectedCell;
      if (idx == null || !state.cells[idx]) return;
      let v = parseFloat(node.value);
      if (!isFinite(v)) v = 0;
      v = FP.clamp(v, -2000, 2000);
      state.cells[idx][key] = v;
      node.value = String(v);
      patchSelectedCell();
    });
  }

  /* ================= 测试 & 高级 API ================= */
  function getPreviewInfo() {
    let imageCount = 0;
    el.svg.querySelectorAll('.cell-image').forEach(function (img) {
      if (img.getAttribute('display') !== 'none') imageCount++;
    });
    const panelsInfo = geom.panels.map(function (p) {
      return {
        index: p.index,
        row: p.row,
        col: p.col,
        rowSpan: p.rowSpan,
        colSpan: p.colSpan,
        x: FP.round(p.x, 2),
        y: FP.round(p.y, 2),
        w: FP.round(p.w, 2),
        h: FP.round(p.h, 2),
        merged: p.merged
      };
    });
    return {
      geom: {
        rows: geom.rows,
        cols: geom.cols,
        widthMm: geom.widthMm,
        heightMm: geom.heightMm,
        cellW: geom.cellW,
        cellH: geom.cellH,
        panelCount: geom.panels.length
      },
      cells: panelsInfo,
      panels: panelsInfo,
      cellCount: panelsInfo.length,
      gridCellCount: geom.rows * geom.cols,
      merges: FP.deepClone(state.layout.merges),
      multiSelect: multiSelect.slice(),
      filled: panelsInfo.map(function (p) { return state.cells[p.index] ? p.index : null; }).filter(function (i) { return i != null; }),
      labels: currentLabels.map(function (l) {
        return { cellIndex: l.panel.index, text: l.text, groupId: l.groupId || null };
      }),
      groups: FP.deepClone(state.groups || []),
      pageIndex: project.current,
      pageCount: project.pages.length,
      pageName: currentPage() ? currentPage().name : '',
      pages: project.pages.map(function (p, i) {
        return { index: i, name: p.name, filledCount: pageFilledCount(p) };
      }),
      canUndo: historyPast.length > 0,
      canRedo: historyFuture.length > 0,
      imageCount: imageCount,
      labelCount: el.svg.querySelectorAll('.label-text').length,
      selectedCell: state.selectedCell,
      sizeCssPx: {
        width: el.shell.offsetWidth,
        height: el.shell.offsetHeight
      }
    };
  }

  function getDebugState() {
    return {
      ready: ready,
      pageIndex: project.current,
      pageCount: project.pages.length,
      pageName: currentPage() ? currentPage().name : '',
      pages: project.pages.map(function (p, i) {
        return { index: i, name: p.name, filledCount: pageFilledCount(p) };
      }),
      layout: FP.deepClone(state.layout),
      label: FP.deepClone(state.label),
      groups: FP.deepClone(state.groups || []),
      export: FP.deepClone(state.export),
      selectedCell: state.selectedCell,
      multiSelect: multiSelect.slice(),
      canUndo: historyPast.length > 0,
      canRedo: historyFuture.length > 0,
      panels: geom.panels.map(function (p) {
        return { index: p.index, row: p.row, col: p.col, rowSpan: p.rowSpan, colSpan: p.colSpan, merged: p.merged };
      }),
      cells: state.cells.map(function (cell) {
        if (!cell) return null;
        return {
          name: cell.name,
          width: cell.width,
          height: cell.height,
          bytes: cell.bytes,
          fit: cell.fit,
          zoom: FP.round(cell.zoom || 1, 3),
          offsetX: FP.round(cell.offsetX || 0, 2),
          offsetY: FP.round(cell.offsetY || 0, 2),
          rotation: cell.rotation || 0,
          customLabel: cell.customLabel || '',
          hasData: !!cell.dataUrl
        };
      })
    };
  }

  function pageStatesForExport() {
    syncPage();
    return project.pages.map(function (page) {
      return {
        name: page.name,
        layout: page.layout,
        cells: page.cells,
        label: page.label,
        groups: page.groups,
        export: state.export
      };
    });
  }

  function createApi() {
    api = {
      version: FP.APP_VERSION,
      get ready() { return ready; },
      getState: getDebugState,
      getPreviewInfo: getPreviewInfo,
      getLabels: function () { return currentLabels.map(function (l) { return { cellIndex: l.panel.index, text: l.text }; }); },
      getLabelBoxes: function () {
        return currentLabels.map(function (l) {
          const p = FP.getLabelPlacement(state.label, l.panel, l.text);
          return {
            cellIndex: l.panel.index, text: l.text,
            x: p.x, y: p.y, box: p.box, anchor: p.anchor
          };
        });
      },
      getTemplates: function () { return TEMPLATES.map(function (t) { return { id: t.id, name: t.name, desc: t.desc }; }); },
      getPages: function () {
        syncPage();
        return project.pages.map(function (p, i) {
          return { index: i, name: p.name, filledCount: pageFilledCount(p), layout: FP.deepClone(p.layout) };
        });
      },
      setPage: function (index) { switchPage(index); return getPreviewInfo(); },
      addPage: function (mode) { addPage(mode === 'duplicate' ? 'duplicate' : 'new'); return getPreviewInfo(); },
      duplicatePage: function () { addPage('duplicate'); return getPreviewInfo(); },
      renamePage: function (index, name) {
        const i = FP.clamp(FP.toInt(index, project.current), 0, project.pages.length - 1);
        const value = String(name || '').trim().slice(0, 24);
        if (!value) return { ok: false, error: '名称不能为空', info: getPreviewInfo() };
        commitHistoryNow();
        project.pages[i].name = value;
        renderAll();
        return { ok: true, info: getPreviewInfo() };
      },
      deletePage: function (index) {
        if (project.pages.length <= 1) return { ok: false, error: '至少保留一页', info: getPreviewInfo() };
        const i = FP.clamp(FP.toInt(index, project.current), 0, project.pages.length - 1);
        commitHistoryNow();
        project.pages.splice(i, 1);
        project.current = FP.clamp(Math.min(i, project.pages.length - 1), 0, project.pages.length - 1);
        loadPageIntoState(project.current);
        geom = FP.computeGeometry(state.layout);
        renderAll();
        return { ok: true, info: getPreviewInfo() };
      },
      getGroups: function () { return FP.deepClone(state.groups || []); },
      createGroup: function (opts) {
        opts = opts || {};
        const panels = (opts.panels && opts.panels.length ? opts.panels : selectedPanelsForGroup())
          .map(Number).filter(function (i) { return !!panelAt(i); });
        if (!panels.length) return { ok: false, error: '请选择子图', info: getPreviewInfo() };
        commitHistoryNow();
        (state.groups || []).forEach(function (g) {
          g.panels = (g.panels || []).filter(function (idx) { return panels.indexOf(idx) < 0; });
        });
        state.groups = (state.groups || []).filter(function (g) { return g.panels.length > 0; });
        const group = {
          id: FP.uid('group'),
          name: String(opts.name || ('组 ' + (state.groups.length + 1))).slice(0, 24),
          color: nextGroupColor(),
          scheme: FP.schemeById(opts.scheme || state.label.scheme).id,
          start: Math.max(1, FP.clamp(FP.toInt(opts.start, state.label.start), 1, 999)),
          panels: panels.slice().sort(function (a, b) { return a - b; })
        };
        state.groups.push(group);
        state.groups = FP.sanitizeGroups(state.groups, geom);
        renderAll();
        return { ok: true, group: FP.deepClone(group), info: getPreviewInfo() };
      },
      updateGroup: function (id, opts) {
        const group = groupById(id);
        if (!group) return { ok: false, error: '分组不存在', info: getPreviewInfo() };
        opts = opts || {};
        commitHistoryNow();
        if (opts.name) group.name = String(opts.name).trim().slice(0, 24) || group.name;
        if (opts.scheme) group.scheme = FP.schemeById(opts.scheme).id;
        if (opts.start != null) group.start = Math.max(1, FP.clamp(FP.toInt(opts.start, group.start), 1, 999));
        renderAll();
        return { ok: true, group: FP.deepClone(group), info: getPreviewInfo() };
      },
      deleteGroup: function (id) {
        if (!groupById(id)) return { ok: false, error: '分组不存在', info: getPreviewInfo() };
        commitHistoryNow();
        state.groups = (state.groups || []).filter(function (g) { return g.id !== id; });
        renderAll();
        return { ok: true, info: getPreviewInfo() };
      },
      selectGroup: function (id) { selectGroup(id); return getPreviewInfo(); },
      undo: function () { undo(); return getPreviewInfo(); },
      redo: function () { redo(); return getPreviewInfo(); },
      getHistoryState: function () {
        return {
          canUndo: historyPast.length > 0,
          canRedo: historyFuture.length > 0,
          undoCount: historyPast.length,
          redoCount: historyFuture.length
        };
      },
      setExportScope: function (scope) {
        state.export.scope = scope === 'all' ? 'all' : 'current';
        updateExportScopeUI();
        scheduleSave();
        return getPreviewInfo();
      },
      setExportOptions: function (opts) {
        opts = opts || {};
        if (opts.saveAs !== undefined) state.export.saveAs = !!opts.saveAs;
        if (opts.vectorPdf !== undefined) state.export.vectorPdf = !!opts.vectorPdf;
        if (opts.trimPdf !== undefined) state.export.trimPdf = !!opts.trimPdf;
        if (opts.trimMarginMm !== undefined) state.export.trimMarginMm = FP.clamp(Number(opts.trimMarginMm) || 0, 0, 20);
        if (opts.format !== undefined) state.export.format = FP.normalizeFormat(opts.format);
        if (opts.scope !== undefined) state.export.scope = opts.scope === 'all' ? 'all' : 'current';
        if (opts.dpi !== undefined) state.export.dpi = FP.clamp(FP.toInt(opts.dpi, state.export.dpi), 36, 1200);
        if (el.saveAsToggle) el.saveAsToggle.checked = state.export.saveAs !== false;
        if (el.vectorPdfToggle) el.vectorPdfToggle.checked = state.export.vectorPdf !== false;
        if (el.pdfTrimToggle) el.pdfTrimToggle.checked = !!state.export.trimPdf;
        syncExportUI();
        scheduleSave();
        return {
          saveAs: state.export.saveAs, vectorPdf: state.export.vectorPdf,
          trimPdf: state.export.trimPdf, trimMarginMm: state.export.trimMarginMm,
          scope: state.export.scope, dpi: state.export.dpi, format: state.export.format
        };
      },
      getVectorStatus: function () {
        const info = emfVectorInfo();
        return {
          emfCount: info.count,
          unsupported: info.unsupported,
          desktop: !!(FP.desktop && FP.desktop.available),
          vectorAvailable: hasUsableVectorPdf(),
          vectorPdf: state.export.vectorPdf !== false
        };
      },
      exportVectorPdfBase64: async function () {
        let cropOverride = null;
        if (state.export.trimPdf && !(state.export.scope === 'all' && project.pages.length > 1)) {
          try {
            cropOverride = await FP.detectInkCrop(state, geom, {
              dpi: 96,
              marginMm: state.export.trimMarginMm
            });
            if (!cropOverride || cropOverride.wMm <= 0) cropOverride = null;
          } catch (err) {
            console.warn('[FigurePlay] 矢量 PDF 墨迹裁剪检测失败', err);
          }
        }
        const vec = buildVectorPdfSpec(cropOverride);
        if (!vec.ok) return { ok: false, error: vec.reason };
        const result = await FP.desktop.exportVectorPdf(vec.spec);
        return {
          ok: true,
          base64: result.pdfBase64,
          bytes: result.bytes,
          engine: result.engine,
          vectorPanels: result.vectorPanels,
          rasterPanels: result.rasterPanels
        };
      },
      setLayout: function (rows, cols) { applyLayout(rows, cols); return getPreviewInfo(); },
      setLayoutOptions: function (opts) {
        opts = opts || {};
        if (opts.margin !== undefined) state.layout.margin = FP.clamp(Number(opts.margin) || 0, 0, 80);
        if (opts.colGap !== undefined) state.layout.colGap = FP.clamp(Number(opts.colGap) || 0, -50, 80);
        if (opts.rowGap !== undefined) state.layout.rowGap = FP.clamp(Number(opts.rowGap) || 0, -50, 80);
        if (opts.autoPad !== undefined) {
          state.layout.autoPad = !!opts.autoPad;
          if (!state.layout.autoPad) {
            state.layout.padTopMm = 0;
            state.layout.padRightMm = 0;
            state.layout.padBottomMm = 0;
            state.layout.padLeftMm = 0;
          }
        }
        ['padTopMm', 'padRightMm', 'padBottomMm', 'padLeftMm'].forEach(function (k) {
          if (opts[k] !== undefined) state.layout[k] = FP.clamp(Number(opts[k]) || 0, 0, 200);
        });
        renderAll();
        return { layout: getPreviewInfo().geom, pads: getPadInfo() };
      },
      setLabelConfig: function (patch) {
        state.label = normalizeLabel(Object.assign({}, state.label, patch || {}));
        renderAll();
        return getPreviewInfo();
      },
      getPadInfo: getPadInfo,
      getCropBox: function (marginMm) {
        return FP.computeContentBBox(state, geom, marginMm === undefined ? state.export.trimMarginMm : marginMm);
      },
      getInkCropBox: async function (marginMm) {
        return FP.detectInkCrop(state, geom, {
          dpi: 96,
          marginMm: marginMm === undefined ? state.export.trimMarginMm : marginMm
        });
      },
      setUploadTarget: function (index) {
        pendingTarget = index == null ? null : (panelAt(FP.toInt(index, 0)) ? FP.toInt(index, 0) : null);
        return pendingTarget;
      },
      setMultiSelect: function (indices) {
        const list = [];
        (indices || []).forEach(function (i) {
          const n = Number(i);
          if (panelAt(n) && list.indexOf(n) < 0) list.push(n);
        });
        if (list.length > 1) {
          multiSelect = list;
          state.selectedCell = list[list.length - 1];
        } else {
          multiSelect = [];
          state.selectedCell = list.length ? list[0] : null;
        }
        renderAll();
        return getPreviewInfo();
      },
      mergePanels: function (indices, opts) {
        const list = (indices || []).map(Number).filter(function (i) { return !!panelAt(i); });
        const result = performMerge(list, !!(opts && opts.force));
        return { ok: result.ok, error: result.error || null, info: getPreviewInfo() };
      },
      splitPanel: function (index) {
        const panel = panelAt(Number(index));
        if (!panel || !panel.merged) return { ok: false, error: '该子图不是合并单元格', info: getPreviewInfo() };
        const mi = state.layout.merges.findIndex(function (m) {
          return m.r === panel.row && m.c === panel.col;
        });
        if (mi < 0) return { ok: false, error: '未找到合并信息', info: getPreviewInfo() };
        state.layout.merges.splice(mi, 1);
        multiSelect = [];
        state.selectedCell = panel.index;
        renderAll();
        return { ok: true, info: getPreviewInfo() };
      },
      applyTemplate: function (id) { applyTemplate(id); return getPreviewInfo(); },
      openPasteDialog: function (index) { openPasteDialog(index); return { open: el.pasteDialog.open, target: pasteTargetIndex }; },
      getPasteState: function () {
        return {
          open: el.pasteDialog.open,
          target: pasteTargetIndex,
          hasPreview: !!pendingPasteCell,
          desktopBridge: !!(FP.desktop && FP.desktop.available)
        };
      },
      loadDemo: async function () { await loadDemo(true); return getPreviewInfo(); },
      clearAll: function () {
        state.cells = new Array(state.cells.length).fill(null);
        state.selectedCell = null;
        multiSelect = [];
        renderAll();
        return getPreviewInfo();
      },
      clearStorage: function () { return FP.storage.clear(); },
      exportBase64: async function (format, overrides) {
        overrides = overrides || {};
        if (overrides.trimPdf && format === 'pdf' && !overrides.allPages) {
          let crop = null;
          try {
            crop = await FP.detectInkCrop(state, geom, {
              dpi: 96,
              marginMm: overrides.trimMarginMm !== undefined ? overrides.trimMarginMm : state.export.trimMarginMm
            });
          } catch (err) { console.warn('[FigurePlay] 墨迹裁剪检测失败', err); }
          if (!crop || crop.wMm <= 0) {
            crop = FP.computeContentBBox(state, geom, overrides.trimMarginMm !== undefined
              ? overrides.trimMarginMm : state.export.trimMarginMm);
          }
          overrides = Object.assign({}, overrides, { cropMm: crop });
          delete overrides.trimPdf;
          delete overrides.trimMarginMm;
        }
        if (overrides.allPages) {
          const crops = overrides.trimPdf && format === 'pdf'
            ? await Promise.all(project.pages.map(function (page) {
                return FP.detectInkCrop(page, FP.computeGeometry(page.layout), {
                  dpi: 96,
                  marginMm: overrides.trimMarginMm !== undefined ? overrides.trimMarginMm : state.export.trimMarginMm
                }).catch(function () { return null; });
              }))
            : null;
          const safeCrops = crops && crops.map(function (crop, i) {
            if (crop && crop.wMm > 0) return crop;
            return FP.computeContentBBox(project.pages[i], FP.computeGeometry(project.pages[i].layout),
              overrides.trimMarginMm !== undefined ? overrides.trimMarginMm : state.export.trimMarginMm);
          });
          const result = await FP.buildAllPagesExport(pageStatesForExport(), {
            format: format,
            dpi: overrides.dpi !== undefined ? overrides.dpi : state.export.dpi,
            quality: overrides.quality !== undefined ? overrides.quality : state.export.jpgQuality,
            transparent: overrides.transparent !== undefined ? overrides.transparent : state.export.transparent,
            filename: overrides.filename !== undefined ? overrides.filename : state.export.filename,
            crops: safeCrops
          });
          const base64 = await FP.blobToBase64(result.blob);
          return {
            base64: base64,
            filename: result.filename,
            mime: result.mime,
            format: result.format,
            pageCount: result.pageCount,
            pageResults: result.pageResults,
            bytes: result.bytes
          };
        }
        return FP.exportBase64(state, geom, Object.assign({}, overrides, { format: format }));
      },
      exportAllBase64: async function (format, overrides) {
        overrides = overrides || {};
        const result = await FP.buildAllPagesExport(pageStatesForExport(), {
          format: format,
          dpi: overrides.dpi !== undefined ? overrides.dpi : state.export.dpi,
          quality: overrides.quality !== undefined ? overrides.quality : state.export.jpgQuality,
          transparent: overrides.transparent !== undefined ? overrides.transparent : state.export.transparent,
          filename: overrides.filename !== undefined ? overrides.filename : state.export.filename
        });
        const base64 = await FP.blobToBase64(result.blob);
        return {
          base64: base64,
          filename: result.filename,
          mime: result.mime,
          format: result.format,
          pageCount: result.pageCount,
          pageResults: result.pageResults,
          bytes: result.bytes
        };
      },
      exportFigure: async function (format, overrides) {
        overrides = overrides || {};
        const opts = Object.assign({}, overrides, { format: format });
        let result;
        if (overrides.allPages) {
          result = await FP.buildAllPagesExport(pageStatesForExport(), {
            format: format,
            dpi: opts.dpi !== undefined ? opts.dpi : state.export.dpi,
            quality: opts.quality !== undefined ? opts.quality : state.export.jpgQuality,
            transparent: opts.transparent !== undefined ? opts.transparent : state.export.transparent,
            filename: opts.filename !== undefined ? opts.filename : state.export.filename
          });
          FP.downloadBlob(result.blob, result.filename);
          return {
            filename: result.filename,
            format: result.format,
            mime: result.mime,
            pageCount: result.pageCount,
            bytes: result.bytes
          };
        }
        result = await FP.buildExport(state, geom, opts);
        FP.downloadBlob(result.blob, result.filename);
        return {
          filename: result.filename,
          format: result.format,
          mime: result.mime,
          widthPx: result.widthPx,
          heightPx: result.heightPx,
          bytes: result.bytes
        };
      },
      setAppearance: function (mode, accent) {
        if (typeof accent === 'string') FP.appearance.setAccent(accent);
        if (typeof mode === 'string') FP.appearance.setMode(mode);
        return FP.appearance.get();
      },
      getAppearance: function () {
        return FP.appearance.get();
      }
    };
    window.__FIGPLAY__ = api;
  }

  /* ================= 初始化 ================= */
  function setReady() {
    ready = true;
    document.documentElement.dataset.figplayReady = '1';
    document.dispatchEvent(new CustomEvent('figplay-ready', { detail: { version: FP.APP_VERSION } }));
  }

  async function init() {
    cacheEls();
    buildMatrix();
    buildPresets();
    buildPosPicker();
    buildSchemeSelect();
    buildBatchSchemeSelect();
    buildGroupSchemeSelect();
    buildTemplateCards();
    createApi();
    preview = FP.createPreviewRenderer(el.svg);
    bindEvents();
    geom = FP.computeGeometry(state.layout);

    let saved = null;
    try { saved = await FP.storage.load(); } catch (err) { console.warn('[FigurePlay] 自动保存读取失败', err); }
    if (saved) {
      try {
        const rawProject = saved.project ? saved.project : saved;
        project = normalizeProject(rawProject);
        state = pageState(project.pages[project.current], project.export);
      } catch (err) {
        console.warn('[FigurePlay] 恢复上次内容失败', err);
        project = defaultProject();
        state = pageState(project.pages[0], project.export);
      }
    }
    geom = FP.computeGeometry(state.layout);
    historySuspended = true;
    renderAll();
    historySuspended = false;
    historyPast = [];
    historyFuture = [];
    historyLast = snapshotProject();
    historyLastSig = projectSignature();
    updateUndoRedoButtons();
    updateZoomAfterInit();

    project.pages.forEach(function (page) {
      page.cells.forEach(function (cell) {
        if (cell) FP.preloadImage(cell.dataUrl);
      });
    });

    if (window.ResizeObserver) {
      stageObserver = new ResizeObserver(FP.rafThrottle(function () {
        if (fitMode) applyZoom();
      }));
      stageObserver.observe(el.stage);
    }

    if (el.desktopBadge && FP.desktop && FP.desktop.available) el.desktopBadge.hidden = false;
    setReady();
    if (saved) setStatus('已恢复上次编辑内容');
    else if (FP.desktop && FP.desktop.available) setStatus('桌面版就绪 · 支持 EMF / MATLAB .fig');
    else setStatus('就绪');
  }

  function updateZoomAfterInit() {
    fitMode = true;
    currentPct = computeFitPercent();
    applyZoom();
  }

  init();
})();
