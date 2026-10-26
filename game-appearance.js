'use strict';

// game-appearance.js — split placeholder.
// Portrait / NIE helpers currently still live in game.js (NIE, CATS, normalizeParts,
// appearanceIndices, appearanceCounts, drawCharacterAppearance, …).
//
// IMPORTANT: do not redeclare top-level const NIE / CATS / ASSET_BASE / …
// here. game.js already binds them; a second `const` aborts this entire script
// in the browser, which previously left `appearanceCounts` undefined and made
// every renderGame frame throw → white screen.

(function ensureAppearanceCounts() {
  if (typeof appearanceCounts === 'function') return;
  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  root.appearanceCounts = function appearanceCountsFallback() {
    const gender = state.gender === 'b' ? 'b' : 'g';
    const catalog = typeof NIE !== 'undefined' && NIE && NIE[gender]
      ? NIE[gender]
      : null;
    const cats = typeof CATS !== 'undefined' && Array.isArray(CATS)
      ? CATS
      : ['hair_hou', 'cloth', 'body', 'mouth', 'nose', 'eyes', 'hair_qian', 'deco'];
    const counts = {};
    for (let index = 0; index < cats.length; index++) {
      const cat = cats[index];
      const list = catalog && Array.isArray(catalog[cat]) ? catalog[cat] : [];
      counts[cat] = list.length;
    }
    return counts;
  };
})();
