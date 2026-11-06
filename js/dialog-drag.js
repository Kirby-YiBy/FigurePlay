/* FigurePlay 弹窗拖动：让配置/使用说明/模板等 dialog 可以通过标题栏移动。 */
(function () {
  'use strict';
  let initialized = false;

  function clamp(v, min, max) { return Math.min(Math.max(v, min), Math.max(min, max)); }

  function makeDraggable(dialog) {
    if (!dialog || dialog.dataset.dragReady === '1') return;
    const head = dialog.querySelector('.help-head');
    if (!head) return;
    dialog.dataset.dragReady = '1';
    head.classList.add('dialog-drag-handle');
    head.title = head.title || '按住拖动窗口';

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let width = 0;
    let height = 0;

    head.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('button, input, select, textarea, a')) return;
      if (!dialog.open) return;
      const rect = dialog.getBoundingClientRect();
      dialog.style.position = 'fixed';
      dialog.style.margin = '0';
      dialog.style.right = 'auto';
      dialog.style.bottom = 'auto';
      dialog.style.left = rect.left + 'px';
      dialog.style.top = rect.top + 'px';
      dialog.style.transform = 'none';
      width = rect.width;
      height = rect.height;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      pointerId = e.pointerId;
      try { head.setPointerCapture(pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
    });

    head.addEventListener('pointermove', function (e) {
      if (pointerId == null || e.pointerId !== pointerId) return;
      const left = clamp(startLeft + e.clientX - startX, 0, window.innerWidth - width);
      const top = clamp(startTop + e.clientY - startY, 0, window.innerHeight - height);
      dialog.style.left = left + 'px';
      dialog.style.top = top + 'px';
    });

    function endDrag(e) {
      if (pointerId == null) return;
      if (e && e.pointerId != null && e.pointerId !== pointerId) return;
      try { head.releasePointerCapture(pointerId); } catch (err) { /* ignore */ }
      pointerId = null;
    }
    head.addEventListener('pointerup', endDrag);
    head.addEventListener('pointercancel', endDrag);

    // 重新打开时如果窗口尺寸变化，限制在可视区域内
    dialog.addEventListener('open', function () {
      if (!dialog.style.left) return;
      const rect = dialog.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      dialog.style.left = clamp(rect.left, 0, window.innerWidth - rect.width) + 'px';
      dialog.style.top = clamp(rect.top, 0, window.innerHeight - rect.height) + 'px';
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    const dialogs = document.querySelectorAll('dialog.help-dialog');
    for (let i = 0; i < dialogs.length; i++) makeDraggable(dialogs[i]);
  }

  window.__DIALOG_DRAG__ = { init: init, make: makeDraggable };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
