(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.GameAppearance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Owns portrait composition and bitmap caches.
  // All game-specific dependencies are supplied by the composition root.
  function create(deps) {
    function migrateLegacyParts(raw) {
      const source = raw && typeof raw === 'object' && !Array.isArray(raw)
        ? Object.assign({}, raw)
        : {};
      if (Object.prototype.hasOwnProperty.call(source, 'hair') &&
          !Object.prototype.hasOwnProperty.call(source, 'hair_hou')) {
        source.hair_hou = source.hair;
        source.hair_qian = source.hair;
      }
      delete source.eyebrush;
      delete source.hair;
      return source;
    }

    function normalizeParts(raw, gender) {
      const g = gender === 'b' ? 'b' : 'g';
      const source = migrateLegacyParts(raw);
      const catalog = deps.NIE && deps.NIE[g] ? deps.NIE[g] : null;
      const normalized = {};
      for (const cat of deps.CATS) {
        const list = catalog && Array.isArray(catalog[cat]) ? catalog[cat] : [];
        const numeric = Number(source[cat]);
        const index = Number.isFinite(numeric) ? Math.floor(numeric) : 0;
        normalized[cat] = list.length > 0
          ? (index >= 0 && index < list.length ? index : 0)
          : 0;
      }
      if (deps.HairRules && typeof deps.HairRules.normalizeHairParts === 'function') {
        return deps.HairRules.normalizeHairParts(g, normalized);
      }
      return normalized;
    }

    function appearanceIndices() {
      const indices = normalizeParts(deps.state.parts, deps.state.gender);
      if (deps.HairRules && typeof deps.HairRules.styleIndex === 'function') {
        indices.hair_style = deps.HairRules.styleIndex(deps.state.gender, indices);
      }
      return indices;
    }

    function appearanceCounts() {
      const gender = deps.state.gender === 'b' ? 'b' : 'g';
      const catalog = deps.NIE && deps.NIE[gender] ? deps.NIE[gender] : null;
      const counts = {};
      for (let index = 0; index < deps.CATS.length; index++) {
        const cat = deps.CATS[index];
        const list = catalog && Array.isArray(catalog[cat]) ? catalog[cat] : [];
        counts[cat] = list.length;
      }
      return counts;
    }

    const imgCache = {};

    function nieAssetFolder(g) {
      return g === 'b' ? 'boy' : 'girl';
    }

    function assetRel(g, c, i) {
      const catalog = deps.NIE && deps.NIE[g] ? deps.NIE[g] : null;
      const list = catalog && Array.isArray(catalog[c]) ? catalog[c] : [];
      if (!list.length) return null;
      const name = list[i] || list[0];
      if (!name) return null;
      return 'NIE/' + nieAssetFolder(g) + '/' + name;
    }

    function assetPath(g, c, i) {
      const rel = assetRel(g, c, i);
      if (!rel) return '';
      const segments = rel.split('/');
      const fileName = segments.pop();
      return deps.ASSET_BASE + segments.join('/') + '/' + deps.encodeURIComponent(fileName);
    }

    function loadImg(g, c, i) {
      const key = g + '/' + c + '/' + i;
      if (imgCache[key]) return imgCache[key];
      const src = assetPath(g, c, i);
      if (!src) return null;
      const img = deps.Platform.createImage();
      img._ready = false;
      img.onload = () => {
        img._ready = true;
        // 仅当加载的是玩家当前装备部件时才脏化玩家合成；
        // NPC 立绘共用 loadImg，否则会在批量加载时每帧触发全量合成卡顿。
        if (deps.state.gender === g &&
            deps.state.parts &&
            Number(deps.state.parts[c]) === Number(i)) {
          deps.state.dirty = true;
          try {
            if (typeof deps.XiuxianUi !== 'undefined' &&
                deps.XiuxianUi &&
                deps.XiuxianUi.shell) {
              deps.XiuxianUi.shell._avatarDirty = true;
            }
          } catch (error) { /* ignore */ }
        }
      };
      img.onerror = () => { console.warn('[捏脸] 加载失败:', assetPath(g, c, i)); };
      img.src = assetPath(g, c, i);
      imgCache[key] = img;
      return img;
    }

    let off = null, offCtx = null;

    function ensureOff() {
      if (offCtx) return;
      off = deps.Platform.createCanvas();  // 离屏画布（合成用，不挂 DOM）
      off.width = 300; off.height = 300;
      offCtx = off.getContext('2d');
    }

    function composite() {
      ensureOff();
      offCtx.clearRect(0, 0, 300, 300);
      for (const c of deps.CATS) {
        const list = deps.NIE[deps.state.gender][c];
        if (!Array.isArray(list) || list.length === 0) continue;
        const i = deps.state.parts[c];
        const img = loadImg(deps.state.gender, c, i);
        if (img && (img._ready || img.complete)) {
          offCtx.drawImage(img, 0, 0, 300, 300);
        }
      }
      deps.state.cache = off;            // 缓存整张合成结果
      deps.state.dirty = false;
    }

    function getCharCache() { if (deps.state.dirty) composite(); return deps.state.cache; }

    function hashSeed(text) {
      const source = String(text || '');
      let hash = 2166136261;
      for (let index = 0; index < source.length; index++) {
        hash ^= source.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    }

    function nieGenderForPerson(genderId) {
      return genderId === 'male' ? 'b' : 'g';
    }

    function randomNieParts(seedText, genderId) {
      const gender = nieGenderForPerson(genderId);
      const catalog = deps.NIE && deps.NIE[gender] ? deps.NIE[gender] : null;
      const parts = {};
      let cursor = hashSeed(seedText + ':' + gender);
      deps.CATS.forEach(function (cat) {
        if (cat === 'hair_hou' || cat === 'hair_qian') return;
        const list = catalog && Array.isArray(catalog[cat]) ? catalog[cat] : [];
        const count = Math.max(1, list.length || 1);
        cursor = (Math.imul(cursor, 1664525) + 1013904223) >>> 0;
        parts[cat] = cursor % count;
      });
      parts.hair_hou = 0;
      parts.hair_qian = 0;
      if (deps.HairRules && typeof deps.HairRules.randomStyleIndex === 'function') {
        cursor = (Math.imul(cursor, 1664525) + 1013904223) >>> 0;
        const styled = deps.HairRules.applyStyleIndex(
          gender,
          parts,
          deps.HairRules.randomStyleIndex(gender, cursor)
        );
        parts.hair_hou = styled.hair_hou;
        parts.hair_qian = styled.hair_qian;
      }
      return { gender: gender, parts: parts };
    }

    const NIE_PORTRAIT_CACHE_LIMIT = 160;

    const niePortraitCache = Object.create(null);

    const niePortraitCacheOrder = [];

    function niePortraitCacheKey(appearance) {
      if (!appearance || !appearance.parts) return '';
      const gender = appearance.gender === 'b' ? 'b' : 'g';
      const parts = appearance.parts;
      let key = gender;
      for (let index = 0; index < deps.CATS.length; index++) {
        const cat = deps.CATS[index];
        key += ':' + (Number.isFinite(parts[cat]) ? parts[cat] : 0);
      }
      return key;
    }

    function rememberNiePortrait(key, canvas) {
      if (!key || !canvas) return;
      if (!Object.prototype.hasOwnProperty.call(niePortraitCache, key)) {
        niePortraitCacheOrder.push(key);
        while (niePortraitCacheOrder.length > NIE_PORTRAIT_CACHE_LIMIT) {
          const oldest = niePortraitCacheOrder.shift();
          delete niePortraitCache[oldest];
        }
      }
      niePortraitCache[key] = canvas;
    }

    function drawCharacterAppearance(targetCanvas, appearance, options) {
      if (!targetCanvas || typeof targetCanvas.getContext !== 'function') {
        return false;
      }
      if (!appearance || !appearance.parts) return false;
      const gender = appearance.gender === 'b' ? 'b' : 'g';
      const parts = appearance.parts;
      const cacheKey = niePortraitCacheKey(appearance);
      let scratch = cacheKey ? niePortraitCache[cacheKey] : null;
      let complete = !!scratch;
      if (!scratch) {
        scratch = deps.Platform.createCanvas();
        scratch.width = 300;
        scratch.height = 300;
        const scratchCtx = scratch.getContext('2d');
        if (!scratchCtx) return false;
        scratchCtx.clearRect(0, 0, 300, 300);
        let painted = 0;
        let expected = 0;
        for (let index = 0; index < deps.CATS.length; index++) {
          const cat = deps.CATS[index];
          const list = deps.NIE[gender] && deps.NIE[gender][cat];
          if (!Array.isArray(list) || list.length === 0) continue;
          expected++;
          const partIndex = Number.isFinite(parts[cat]) ? parts[cat] : 0;
          const img = loadImg(gender, cat, partIndex);
          if (img && (img._ready || img.complete)) {
            scratchCtx.drawImage(img, 0, 0, 300, 300);
            painted++;
          }
        }
        if (!painted) return false;
        complete = painted === expected;
        if (complete) rememberNiePortrait(cacheKey, scratch);
      }
      const target = targetCanvas.getContext('2d');
      if (!target) return false;
      const targetDpr = typeof window !== 'undefined' &&
        Number.isFinite(Number(window.devicePixelRatio))
        // 高 DPR 手机上 3x 立绘绘制成本过高；2x 观感足够。
        ? Math.max(1, Math.min(2, Number(window.devicePixelRatio)))
        : 1;
      const hintedWidth = options && Number(options.cssWidth);
      const hintedHeight = options && Number(options.cssHeight);
      const cssWidth = Math.max(
        1,
        (Number.isFinite(hintedWidth) && hintedWidth > 0
          ? hintedWidth
          : 0) ||
          Number(targetCanvas.clientWidth) ||
          Number(targetCanvas.width) / targetDpr ||
          1
      );
      const cssHeight = Math.max(
        1,
        (Number.isFinite(hintedHeight) && hintedHeight > 0
          ? hintedHeight
          : 0) ||
          Number(targetCanvas.clientHeight) ||
          Number(targetCanvas.height) / targetDpr ||
          1
      );
      const physicalWidth = Math.max(1, Math.round(cssWidth * targetDpr));
      const physicalHeight = Math.max(1, Math.round(cssHeight * targetDpr));
      if (targetCanvas.width !== physicalWidth) targetCanvas.width = physicalWidth;
      if (targetCanvas.height !== physicalHeight) {
        targetCanvas.height = physicalHeight;
      }
      if (typeof target.setTransform === 'function') {
        target.setTransform(targetDpr, 0, 0, targetDpr, 0, 0);
      }
      if (typeof target.clearRect === 'function') {
        target.clearRect(0, 0, cssWidth, cssHeight);
      }
      const size = Math.min(cssWidth, cssHeight);
      target.drawImage(
        scratch,
        (cssWidth - size) / 2,
        (cssHeight - size) / 2,
        size,
        size
      );
      return complete ? true : 'partial';
    }

    function drawCharacter(targetCanvas) {
      if (!targetCanvas || typeof targetCanvas.getContext !== 'function') {
        return false;
      }
      const source = getCharCache();
      if (!source) return false;
      const target = targetCanvas.getContext('2d');
      if (!target) return false;
      const targetDpr = typeof window !== 'undefined' &&
        Number.isFinite(Number(window.devicePixelRatio))
        // 高 DPR 手机上 3x 立绘绘制成本过高；2x 观感足够。
        ? Math.max(1, Math.min(2, Number(window.devicePixelRatio)))
        : 1;
      const cssWidth = Math.max(
        1,
        Number(targetCanvas.clientWidth) ||
          Number(targetCanvas.width) / targetDpr ||
          1
      );
      const cssHeight = Math.max(
        1,
        Number(targetCanvas.clientHeight) ||
          Number(targetCanvas.height) / targetDpr ||
          1
      );
      const physicalWidth = Math.max(1, Math.round(cssWidth * targetDpr));
      const physicalHeight = Math.max(1, Math.round(cssHeight * targetDpr));
      if (targetCanvas.width !== physicalWidth) targetCanvas.width = physicalWidth;
      if (targetCanvas.height !== physicalHeight) targetCanvas.height = physicalHeight;
      if (typeof target.setTransform === 'function') {
        target.setTransform(targetDpr, 0, 0, targetDpr, 0, 0);
      }
      if (typeof target.clearRect === 'function') {
        target.clearRect(0, 0, cssWidth, cssHeight);
      }
      const size = Math.min(cssWidth, cssHeight);
      target.drawImage(
        source,
        (cssWidth - size) / 2,
        (cssHeight - size) / 2,
        size,
        size
      );
      return true;
    }

    return Object.freeze({ normalizeParts, appearanceIndices, appearanceCounts, composite, randomNieParts, drawCharacterAppearance, drawCharacter });
  }

  return Object.freeze({ create: create });
});
