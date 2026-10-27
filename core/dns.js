(function (root) {
  'use strict';
  // Compatibility name for core callers; configuration belongs to content.
  const api = typeof module === 'object' && module.exports
    ? require('../content/game-config.js') : root.GameConfig;
  if (!api) throw new Error('GameConfig must load before Dns');
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Dns = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
