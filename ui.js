// ============================================================
// ui.js — thin boot entry (implementation under ui/)
// Required load order before this file:
//   ui/ui-core.js → ui/ui-modals.js → (this file)
// Game pages load later via LazyContent.ensureUiPages():
//   ui/ui-home.js → ui/ui-skills.js → ui/ui-social.js → ui/ui-combat.js
// ============================================================
(function () {
  'use strict';
  if (!window.XiuxianUi) {
    console.error('[ui] XiuxianUi missing — load ui/ui-core.js before ui.js');
  }
  if (!window.UI) {
    console.warn('[ui] window.UI missing — load ui/ui-modals.js');
  }
})();
