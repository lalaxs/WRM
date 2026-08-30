(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.HerbloreParityContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return value;
  }

  let DATA = null;
  let ready = false;
  const readyWaiters = [];

  const api = {
    get SOURCE() { return DATA ? DATA.SOURCE : null; },
    get BASE_SECONDS() { return DATA ? DATA.BASE_SECONDS : 2; },
    get TIER_MASTERY() { return DATA ? DATA.TIER_MASTERY : Object.freeze({}); },
    get INGREDIENTS() { return DATA ? DATA.INGREDIENTS : emptyRows(); },
    get SERIES() { return DATA ? DATA.SERIES : emptyRows(); },
    get POTION_ITEMS() { return DATA ? DATA.POTION_ITEMS : emptyRows(); },
    get RECIPE_ROWS() { return DATA ? DATA.RECIPE_ROWS : emptyRows(); },
    loadFromData: loadFromData,
    isReady: isReady,
    whenReady: whenReady,
    source: source,
    tierMastery: tierMastery,
    ingredientRows: ingredientRows,
    seriesRows: seriesRows,
    potionRows: potionRows,
    recipeRows: recipeRows
  };

  function emptyRows() {
    return Object.freeze([]);
  }

  function cloneRows(value) {
    if (!value || !value.slice) return emptyRows();
    return Object.freeze(value.slice());
  }

  function notifyReady() {
    const waiters = readyWaiters.slice();
    readyWaiters.length = 0;
    waiters.forEach(function (resolve) {
      resolve(api);
    });
  }

  function loadFromData(data) {
    if (ready && DATA) return api;
    if (!data || typeof data !== 'object') {
      throw new Error('HerbloreParityContent.loadFromData requires a data object');
    }
    DATA = deepFreeze({
      SOURCE: data.SOURCE || null,
      BASE_SECONDS: data.BASE_SECONDS != null ? data.BASE_SECONDS : 2,
      TIER_MASTERY: data.TIER_MASTERY || {},
      INGREDIENTS: Array.isArray(data.INGREDIENTS) ? data.INGREDIENTS : [],
      SERIES: Array.isArray(data.SERIES) ? data.SERIES : [],
      POTION_ITEMS: Array.isArray(data.POTION_ITEMS) ? data.POTION_ITEMS : [],
      RECIPE_ROWS: Array.isArray(data.RECIPE_ROWS) ? data.RECIPE_ROWS : []
    });
    ready = true;
    notifyReady();
    return api;
  }

  function isReady() {
    return ready === true && !!DATA;
  }

  function whenReady() {
    if (isReady()) {
      return Promise.resolve(api);
    }
    return new Promise(function (resolve) {
      readyWaiters.push(resolve);
    });
  }

  function source() {
    return DATA ? DATA.SOURCE : null;
  }

  function tierMastery() {
    return DATA ? DATA.TIER_MASTERY : Object.freeze({});
  }

  function ingredientRows() {
    return DATA ? cloneRows(DATA.INGREDIENTS) : emptyRows();
  }

  function seriesRows() {
    return DATA ? cloneRows(DATA.SERIES) : emptyRows();
  }

  function potionRows() {
    return DATA ? cloneRows(DATA.POTION_ITEMS) : emptyRows();
  }

  function recipeRows() {
    return DATA ? cloneRows(DATA.RECIPE_ROWS) : emptyRows();
  }

  function trySyncLoadFromDisk() {
    if (typeof require !== 'function' || typeof __dirname !== 'string') {
      return null;
    }
    try {
      const fs = require('fs');
      const path = require('path');
      const jsonPath = path.join(__dirname, 'herblore-parity.json');
      return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (error) {
      return null;
    }
  }

  // Node: sync-load JSON next to this module. Browser: wait for loadFromData.
  if (typeof module === 'object' && module.exports) {
    const synced = trySyncLoadFromDisk();
    if (synced) loadFromData(synced);
  }

  return api;
});
