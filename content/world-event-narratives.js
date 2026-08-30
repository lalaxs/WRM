(function (root, factory) {
  'use strict';
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(
    isNode ? require('fs') : null,
    isNode ? require('path') : null,
    isNode ? __dirname : null
  );
  if (isNode) module.exports = api;
  else if (root) root.WorldEventNarrativeContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  fs,
  pathModule,
  moduleDir
) {
  'use strict';

  const DATA_DIR_NAME = 'world-event-narratives';
  const EMPTY = Object.freeze([]);

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  let BY_TYPE = Object.create(null);
  let NARRATIVES = EMPTY;
  let ALL_READY = false;
  let TYPE_INDEX = null;

  function rebuildAll() {
    const merged = [];
    Object.keys(BY_TYPE).sort().forEach(function (type) {
      const rows = BY_TYPE[type];
      for (let i = 0; i < rows.length; i++) merged.push(rows[i]);
    });
    NARRATIVES = Object.freeze(merged);
  }

  function ingestType(type, rows) {
    if (typeof type !== 'string' || !type) return false;
    const list = Array.isArray(rows) ? rows.slice() : [];
    BY_TYPE[type] = deepFreeze(list);
    rebuildAll();
    return true;
  }

  function ingestMany(byType) {
    if (!byType || typeof byType !== 'object') return false;
    Object.keys(byType).forEach(function (type) {
      const list = Array.isArray(byType[type]) ? byType[type].slice() : [];
      BY_TYPE[type] = deepFreeze(list);
    });
    rebuildAll();
    ALL_READY = true;
    return true;
  }

  function isTypeReady(type) {
    return typeof type === 'string' && Object.prototype.hasOwnProperty.call(BY_TYPE, type);
  }

  function isAllReady() {
    return ALL_READY;
  }

  function markAllReady() {
    ALL_READY = true;
  }

  function resolveDataDir() {
    if (!fs || !pathModule || !moduleDir) return null;
    return pathModule.join(moduleDir, DATA_DIR_NAME);
  }

  function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  function loadTypeIndexSync() {
    if (TYPE_INDEX) return TYPE_INDEX;
    const dataDir = resolveDataDir();
    if (!dataDir) {
      TYPE_INDEX = EMPTY;
      return TYPE_INDEX;
    }
    const indexPath = pathModule.join(dataDir, 'index.json');
    if (fs.existsSync(indexPath)) {
      const listed = readJsonFile(indexPath);
      TYPE_INDEX = Object.freeze(
        Array.isArray(listed) ? listed.slice().sort() : []
      );
      return TYPE_INDEX;
    }
    const names = fs.readdirSync(dataDir)
      .filter(function (name) {
        return name.slice(-5) === '.json' && name !== 'index.json';
      })
      .map(function (name) {
        return name.slice(0, -5);
      })
      .sort();
    TYPE_INDEX = Object.freeze(names);
    return TYPE_INDEX;
  }

  function loadTypeSync(type) {
    if (isTypeReady(type)) return true;
    const dataDir = resolveDataDir();
    if (!dataDir || typeof type !== 'string' || !type) return false;
    const filePath = pathModule.join(dataDir, type + '.json');
    if (!fs.existsSync(filePath)) {
      BY_TYPE[type] = EMPTY;
      rebuildAll();
      return true;
    }
    ingestType(type, readJsonFile(filePath));
    return true;
  }

  function loadAllSync() {
    if (ALL_READY) return true;
    const dataDir = resolveDataDir();
    if (!dataDir) return false;
    const types = loadTypeIndexSync();
    for (let i = 0; i < types.length; i++) {
      loadTypeSync(types[i]);
    }
    ALL_READY = true;
    return true;
  }

  function browserBaseUrl() {
    if (typeof document === 'undefined') return DATA_DIR_NAME + '/';
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].src || '';
      if (src.indexOf('world-event-narratives.js') >= 0) {
        return src.replace(/[^/]*$/, '') + DATA_DIR_NAME + '/';
      }
    }
    return 'content/' + DATA_DIR_NAME + '/';
  }

  function syncXhrJson(url) {
    if (typeof XMLHttpRequest === 'undefined') return null;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    if (xhr.status !== 0 && (xhr.status < 200 || xhr.status >= 300)) {
      return null;
    }
    return JSON.parse(xhr.responseText);
  }

  function ensureTypeBrowserSync(type) {
    if (isTypeReady(type)) return true;
    if (typeof type !== 'string' || !type) return false;
    const rows = syncXhrJson(browserBaseUrl() + encodeURIComponent(type) + '.json');
    if (!rows) {
      BY_TYPE[type] = EMPTY;
      rebuildAll();
      return false;
    }
    ingestType(type, rows);
    return true;
  }

  function ensureAllBrowserSync() {
    if (ALL_READY) return true;
    const index = syncXhrJson(browserBaseUrl() + 'index.json');
    if (!Array.isArray(index)) return false;
    TYPE_INDEX = Object.freeze(index.slice().sort());
    for (let i = 0; i < TYPE_INDEX.length; i++) {
      ensureTypeBrowserSync(TYPE_INDEX[i]);
    }
    ALL_READY = true;
    return true;
  }

  function ensureTypeLoaded(type) {
    if (isTypeReady(type)) return true;
    if (fs) return loadTypeSync(type);
    return ensureTypeBrowserSync(type);
  }

  function ensureAllLoaded() {
    if (ALL_READY) return true;
    if (fs) return loadAllSync();
    return ensureAllBrowserSync();
  }

  if (fs) {
    loadAllSync();
  }

  function list() {
    ensureAllLoaded();
    return NARRATIVES;
  }

  function listByType(type) {
    if (typeof type !== 'string') return EMPTY;
    ensureTypeLoaded(type);
    return BY_TYPE[type] || EMPTY;
  }

  function stats() {
    ensureAllLoaded();
    const byType = {};
    Object.keys(BY_TYPE).forEach(function (key) {
      byType[key] = BY_TYPE[key].length;
    });
    return {
      total: NARRATIVES.length,
      types: Object.keys(BY_TYPE).length,
      byType: byType
    };
  }

  function typeIndex() {
    if (TYPE_INDEX) return TYPE_INDEX;
    if (fs) return loadTypeIndexSync();
    ensureAllLoaded();
    return TYPE_INDEX || Object.freeze(Object.keys(BY_TYPE).sort());
  }

  return Object.freeze({
    list: list,
    listByType: listByType,
    stats: stats,
    typeIndex: typeIndex,
    ingestType: ingestType,
    ingestMany: ingestMany,
    isTypeReady: isTypeReady,
    isAllReady: isAllReady,
    markAllReady: markAllReady,
    ensureTypeLoaded: ensureTypeLoaded,
    ensureAllLoaded: ensureAllLoaded
  });
});
