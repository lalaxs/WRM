/*
 * original-event-texts.js —— 原版事件文案碎片（APK af 的 eventt{id}{variant}）
 * 仅构建 / 自测使用：tools/_build_event_slots.js → slots → event-templates。
 * 游戏运行时不加载；见闻文案走 content/event-templates.js。
 * 数据在 original-event-texts.json；Node 同步加载。
 */
(function (root, factory) {
  'use strict';
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(
    isNode ? require('fs') : null,
    isNode ? require('path') : null,
    isNode ? __dirname : null
  );
  if (isNode) module.exports = api;
  else if (root) root.OriginalEventTexts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  fs,
  pathModule,
  moduleDir
) {
  'use strict';

  let byId = Object.freeze({});
  let partsById = Object.freeze({});
  let ready = false;

  function ingest(payload) {
    if (!payload || typeof payload !== 'object') return false;
    byId = Object.freeze(
      payload.byId && typeof payload.byId === 'object' ? payload.byId : {}
    );
    partsById = Object.freeze(
      payload.partsById && typeof payload.partsById === 'object'
        ? payload.partsById
        : {}
    );
    ready = true;
    return true;
  }

  function isReady() {
    return ready;
  }

  function loadSyncNode() {
    if (ready || !fs || !pathModule || !moduleDir) return ready;
    const filePath = pathModule.join(moduleDir, 'original-event-texts.json');
    ingest(JSON.parse(fs.readFileSync(filePath, 'utf8')));
    return ready;
  }

  function browserUrl() {
    if (typeof document === 'undefined') return 'content/original-event-texts.json';
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].src || '';
      if (src.indexOf('original-event-texts.js') >= 0) {
        return src.replace(/[^/]*$/, 'original-event-texts.json');
      }
    }
    return 'content/original-event-texts.json';
  }

  function loadSyncBrowser() {
    if (ready) return true;
    if (typeof XMLHttpRequest === 'undefined') return false;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', browserUrl(), false);
    xhr.send(null);
    if (xhr.status !== 0 && (xhr.status < 200 || xhr.status >= 300)) {
      return false;
    }
    ingest(JSON.parse(xhr.responseText));
    return ready;
  }

  function ensureLoaded() {
    if (ready) return true;
    if (fs) return loadSyncNode();
    return loadSyncBrowser();
  }

  if (fs) {
    loadSyncNode();
  }

  function get(eventId) {
    ensureLoaded();
    if (eventId == null || eventId === '') return null;
    const text = byId[String(eventId | 0)];
    return typeof text === 'string' && text.length ? text : null;
  }

  function getParts(eventId) {
    ensureLoaded();
    if (eventId == null || eventId === '') return null;
    const parts = partsById[String(eventId | 0)];
    return Array.isArray(parts) ? parts.slice() : null;
  }

  return Object.freeze({
    get byId() {
      ensureLoaded();
      return byId;
    },
    get partsById() {
      ensureLoaded();
      return partsById;
    },
    get count() {
      ensureLoaded();
      return Object.keys(byId).length;
    },
    get: get,
    getParts: getParts,
    ingest: ingest,
    isReady: isReady,
    ensureLoaded: ensureLoaded
  });
});
