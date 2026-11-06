/* FigurePlay 界面外观：浅色 / 深色 / 跟随系统 + 主题色。
   性能：仅修改 <html> 的 data-* 属性与 CSS 变量，不重绘图稿、不触发应用 renderAll。 */
(function () {
  'use strict';
  const MODE_KEY = 'figureplay.themeMode';
  const ACCENT_KEY = 'figureplay.accent';
  const MODES = ['light', 'dark', 'system'];
  const ACCENTS = ['blue', 'indigo', 'emerald', 'pink', 'rose', 'amber'];
  const LEGACY_ACCENTS = { teal: 'emerald', violet: 'pink' };
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let mode = 'system';
  let accent = 'blue';
  let initialized = false;

  function readPrefs() {
    try {
      const m = localStorage.getItem(MODE_KEY);
      const a = localStorage.getItem(ACCENT_KEY);
      if (MODES.indexOf(m) >= 0) mode = m;
      if (a && LEGACY_ACCENTS[a]) {
        accent = LEGACY_ACCENTS[a];
        try { localStorage.setItem(ACCENT_KEY, accent); } catch (e) { /* ignore */ }
      } else if (ACCENTS.indexOf(a) >= 0) {
        accent = a;
      }
    } catch (e) { /* ignore */ }
  }

  function savePrefs() {
    try {
      localStorage.setItem(MODE_KEY, mode);
      localStorage.setItem(ACCENT_KEY, accent);
    } catch (e) { /* ignore */ }
  }

  function systemDark() {
    return !!(media && media.matches);
  }

  function resolvedTheme() {
    if (mode === 'system') return systemDark() ? 'dark' : 'light';
    return mode;
  }

  function syncUI() {
    const modeGroup = document.getElementById('theme-mode-group');
    if (modeGroup) {
      for (const btn of modeGroup.querySelectorAll('[data-theme-mode]')) {
        const active = btn.getAttribute('data-theme-mode') === mode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    }
    const accentGroup = document.getElementById('accent-group');
    if (accentGroup) {
      for (const btn of accentGroup.querySelectorAll('[data-accent]')) {
        const active = btn.getAttribute('data-accent') === accent;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    }
  }

  function apply() {
    const root = document.documentElement;
    root.setAttribute('data-theme-mode', mode);
    root.setAttribute('data-theme', resolvedTheme());
    root.setAttribute('data-accent', accent);
    syncUI();
  }

  function setMode(next, persist) {
    if (MODES.indexOf(next) < 0) return;
    mode = next;
    if (persist) savePrefs();
    apply();
  }

  function setAccent(next, persist) {
    if (ACCENTS.indexOf(next) < 0) return;
    accent = next;
    if (persist) savePrefs();
    apply();
  }

  function openPopover(open) {
    const pop = document.getElementById('appearance-popover');
    const btn = document.getElementById('btn-appearance');
    if (!pop || !btn) return;
    pop.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function init() {
    if (initialized) return;
    initialized = true;
    readPrefs();
    apply();

    const btn = document.getElementById('btn-appearance');
    const pop = document.getElementById('appearance-popover');
    if (!btn || !pop) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      openPopover(pop.hidden);
    });
    const close = document.getElementById('appearance-close');
    if (close) close.addEventListener('click', function () { openPopover(false); });

    const modeGroup = document.getElementById('theme-mode-group');
    if (modeGroup) {
      modeGroup.addEventListener('click', function (e) {
        const target = e.target && e.target.closest ? e.target.closest('[data-theme-mode]') : null;
        if (!target) return;
        setMode(target.getAttribute('data-theme-mode'), true);
      });
    }
    const accentGroup = document.getElementById('accent-group');
    if (accentGroup) {
      accentGroup.addEventListener('click', function (e) {
        const target = e.target && e.target.closest ? e.target.closest('[data-accent]') : null;
        if (!target) return;
        setAccent(target.getAttribute('data-accent'), true);
      });
    }

    document.addEventListener('pointerdown', function (e) {
      if (pop.hidden) return;
      const t = e.target;
      if (t && (pop.contains(t) || btn.contains(t))) return;
      openPopover(false);
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !pop.hidden) {
        openPopover(false);
        btn.focus();
      }
    });

    if (media) {
      const onSystemChange = function () {
        if (mode === 'system') apply();
      };
      if (media.addEventListener) media.addEventListener('change', onSystemChange);
      else if (media.addListener) media.addListener(onSystemChange);
    }
  }

  FP.appearance = {
    init: init,
    get: function () { return { mode: mode, theme: resolvedTheme(), accent: accent }; },
    setMode: function (m) { setMode(m, true); },
    setAccent: function (a) { setAccent(a, true); },
    open: function () { openPopover(true); },
    close: function () { openPopover(false); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
