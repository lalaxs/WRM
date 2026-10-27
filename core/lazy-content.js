(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.LazyContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  let herblorePromise = null;
  const narrativePromises = Object.create(null);
  let narrativesAllPromise = null;
  let uiPagesPromise = null;
  let combatRuntimePromise = null;
  let gameStylesPromise = null;
  const scriptPromises = Object.create(null);
  const Runtime = (root && root.RuntimeModules) ||
    (typeof RuntimeModules !== 'undefined' ? RuntimeModules : null) ||
    (typeof require === 'function'
      ? (function () {
        try { return require('../runtime-modules.js'); }
        catch (error) { return null; }
      })()
      : null);
  const UI_PAGE_SCRIPTS = Object.freeze(
    (Runtime && Runtime.UI_PAGE_SCRIPTS) || [
      'ui/ui-home.js',
      'ui/ui-skills.js',
      'ui/ui-social.js',
      'ui/ui-combat.js'
    ]
  );
  const GAME_STYLE_HREF = (Runtime && Runtime.GAME_STYLE_HREF) ||
    'styles-game.css';
  const COMBAT_RUNTIME_SCRIPTS = Object.freeze(
    (Runtime && Runtime.COMBAT_RUNTIME_SCRIPTS) || [
      'core/combat-stats.js',
      'core/team-combat-snapshot.js',
      'core/team-combat-engine.js',
      'core/team-combat-consequences.js',
      'core/combat-engine.js',
      'core/combat-rewards.js',
      'core/combat-progress.js',
      'core/stage3-rules.js'
    ]
  );
  const COMBAT_RUNTIME_GLOBALS = Object.freeze(
    (Runtime && Runtime.COMBAT_RUNTIME_GLOBALS) || [
      'CombatStats',
      'TeamCombatSnapshot',
      'TeamCombatEngine',
      'TeamCombatConsequences',
      'CombatEngine',
      'CombatRewards',
      'CombatProgress',
      'Stage3Rules'
    ]
  );
  const moduleBaseUrl = (typeof document !== 'undefined' &&
    document.currentScript && document.currentScript.src)
    ? document.currentScript.src
    : '';

  function resolveHerbloreApi() {
    if (root && root.HerbloreParityContent) return root.HerbloreParityContent;
    if (typeof HerbloreParityContent !== 'undefined') return HerbloreParityContent;
    if (typeof require === 'function') {
      try {
        return require('../content/herblore-parity.js');
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function resolveMaterialApi() {
    if (root && root.MaterialContent) return root.MaterialContent;
    if (typeof MaterialContent !== 'undefined') return MaterialContent;
    if (typeof require === 'function') {
      try {
        return require('../content/materials.js');
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function resolveItemApi() {
    if (root && root.ItemContent) return root.ItemContent;
    if (typeof ItemContent !== 'undefined') return ItemContent;
    if (typeof require === 'function') {
      try {
        return require('../content/items.js');
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function resolveRecipeApi() {
    if (root && root.RecipeContent) return root.RecipeContent;
    if (typeof RecipeContent !== 'undefined') return RecipeContent;
    if (typeof require === 'function') {
      try {
        return require('../content/recipes.js');
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function resolveNarrativeApi() {
    if (root && root.WorldEventNarrativeContent) return root.WorldEventNarrativeContent;
    if (typeof WorldEventNarrativeContent !== 'undefined') {
      return WorldEventNarrativeContent;
    }
    if (typeof require === 'function') {
      try {
        return require('../content/world-event-narratives.js');
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function absorbIntoCatalogs(parity) {
    const materials = resolveMaterialApi();
    if (materials && typeof materials.absorbHerbloreParity === 'function') {
      materials.absorbHerbloreParity(parity);
    }
    const items = resolveItemApi();
    if (items && typeof items.syncFromMaterials === 'function') {
      items.syncFromMaterials();
    }
    const recipes = resolveRecipeApi();
    if (recipes && typeof recipes.syncFromMaterials === 'function') {
      recipes.syncFromMaterials();
    }
  }

  function assetUrl(relativePath) {
    const mapped = root && root.__H5_ASSETS__ &&
      root.__H5_ASSETS__[relativePath.split('?')[0]];
    if (mapped) relativePath = mapped;
    if (moduleBaseUrl) {
      try {
        return new URL('../' + relativePath, moduleBaseUrl).href;
      } catch (error) { /* fall through */ }
    }
    return relativePath;
  }

  function loadScript(src, marker) {
    if (scriptPromises[src]) return scriptPromises[src];
    const promise = new Promise(function (resolve, reject) {
      if (typeof document === 'undefined') {
        reject(new Error('document unavailable for script load'));
        return;
      }
      const attr = marker || ('data-lazy-src');
      let existing = document.querySelector(
        'script[' + attr + '="' + src + '"]'
      ) || (marker === 'data-lazy-herblore'
        ? document.querySelector('script[data-lazy-herblore="1"]')
        : null);
      if (existing && existing.getAttribute('data-lazy-failed') === '1') {
        if (existing.parentNode) existing.parentNode.removeChild(existing);
        existing = null;
      }
      let settled = false;
      let timeout = null;
      function finish(error, node) {
        if (settled) return;
        settled = true;
        if (timeout != null && typeof clearTimeout === 'function') clearTimeout(timeout);
        if (error) {
          node.setAttribute('data-lazy-failed', '1');
          if (node.parentNode) node.parentNode.removeChild(node);
          reject(error);
        } else {
          node.setAttribute('data-lazy-loaded', '1');
          resolve();
        }
      }
      function watch(node) {
        if (typeof setTimeout === 'function') {
          timeout = setTimeout(function () {
            finish(new Error('Timed out loading ' + src), node);
          }, 15000);
        }
      }
      if (existing) {
        if (existing.getAttribute('data-lazy-loaded') === '1') {
          resolve();
          return;
        }
        watch(existing);
        existing.addEventListener('load', function () { finish(null, existing); });
        existing.addEventListener('error', function () {
          finish(new Error('Failed to load ' + src), existing);
        });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      if (marker === 'data-lazy-herblore') {
        script.setAttribute('data-lazy-herblore', '1');
      } else {
        script.setAttribute(attr, src);
      }
      script.onload = function () {
        finish(null, script);
      };
      script.onerror = function () {
        finish(new Error('Failed to load ' + src), script);
      };
      watch(script);
      (document.head || document.documentElement).appendChild(script);
    });
    scriptPromises[src] = promise.catch(function (error) {
      delete scriptPromises[src];
      throw error;
    });
    return scriptPromises[src];
  }

  function loadScriptWithRetry(src, attempt) {
    return loadScript(src, 'data-lazy-src').catch(function (error) {
      if (attempt >= 2 || typeof setTimeout !== 'function') throw error;
      return new Promise(function (resolve) {
        setTimeout(resolve, 250 * Math.pow(2, attempt));
      }).then(function () { return loadScriptWithRetry(src, attempt + 1); });
    });
  }

  function loadScriptSequence(urls) {
    let chain = Promise.resolve();
    urls.forEach(function (url) {
      chain = chain.then(function () {
        return loadScriptWithRetry(url, 0);
      });
    });
    return chain;
  }

  function uiPagesAlreadyPresent() {
    if (typeof document === 'undefined') return true;
    // Tests / full sync index may already include page modules.
    const Ui = root && root.XiuxianUi;
    return !!(Ui && Ui.getPage && Ui.getPage('home') && Ui.getPage('combat'));
  }

  function markUiPagesReady() {
    const Ui = root && root.XiuxianUi;
    if (Ui) {
      Ui.__pagesReady = true;
      Ui.__pagesLoading = false;
    }
  }

  function ensureUiPages() {
    if (uiPagesPromise) return uiPagesPromise;
    if (uiPagesAlreadyPresent()) {
      markUiPagesReady();
      uiPagesPromise = Promise.resolve(true);
      return uiPagesPromise;
    }
    if (typeof require === 'function' &&
        typeof process !== 'undefined' &&
        process.versions && process.versions.node) {
      // Node harnesses load UI scripts explicitly via tests/ui_scripts.js.
      markUiPagesReady();
      uiPagesPromise = Promise.resolve(true);
      return uiPagesPromise;
    }
    const urls = UI_PAGE_SCRIPTS.map(function (rel) {
      const mapped = root && root.__H5_ASSETS__ && root.__H5_ASSETS__[rel];
      const bust = !mapped && rel.indexOf('ui-social') >= 0 ? '?v=20260816-month1' : '';
      return assetUrl(rel) + bust;
    });
    uiPagesPromise = loadScriptSequence(Array.from(new Set(urls))).then(function () {
      markUiPagesReady();
      return true;
    }).catch(function (error) {
      uiPagesPromise = null;
      throw error;
    });
    return uiPagesPromise;
  }

  function combatRuntimeAlreadyPresent() {
    // Core Stage-3 engines are required; team-combat modules ship in the same
    // deferred batch but older harnesses may omit them.
    const required = [
      'CombatStats',
      'CombatEngine',
      'CombatRewards',
      'CombatProgress',
      'Stage3Rules'
    ];
    for (let i = 0; i < required.length; i++) {
      const value = root && root[required[i]];
      if (value == null) return false;
    }
    return true;
  }

  function callCombatRuntimeRefresh() {
    const refresh = root && root.refreshStage3CombatRuntime;
    if (typeof refresh === 'function') {
      try {
        refresh();
      } catch (error) {
        /* refresh failures surface on next combat use */
      }
    }
  }

  function requireCombatRuntimeModules() {
    for (let i = 0; i < COMBAT_RUNTIME_SCRIPTS.length; i++) {
      const rel = COMBAT_RUNTIME_SCRIPTS[i];
      // lazy-content.js lives in core/; scripts are siblings.
      const mod = require('./' + rel.replace(/^core\//, ''));
      const globalName = COMBAT_RUNTIME_GLOBALS[i];
      if (root && globalName && mod) {
        root[globalName] = mod;
      }
    }
  }

  function ensureCombatRuntime() {
    if (combatRuntimePromise) return combatRuntimePromise;
    if (combatRuntimeAlreadyPresent()) {
      callCombatRuntimeRefresh();
      combatRuntimePromise = Promise.resolve(true);
      return combatRuntimePromise;
    }
    if (typeof require === 'function' &&
        typeof process !== 'undefined' &&
        process.versions && process.versions.node) {
      combatRuntimePromise = new Promise(function (resolve, reject) {
        try {
          requireCombatRuntimeModules();
          callCombatRuntimeRefresh();
          resolve(true);
        } catch (error) {
          combatRuntimePromise = null;
          reject(error);
        }
      });
      return combatRuntimePromise;
    }
    const urls = COMBAT_RUNTIME_SCRIPTS.map(function (rel) {
      return assetUrl(rel);
    });
    combatRuntimePromise = loadScriptSequence(Array.from(new Set(urls))).then(function () {
      callCombatRuntimeRefresh();
      if (!combatRuntimeAlreadyPresent()) {
        throw new Error('Combat runtime globals missing after script load');
      }
      return true;
    }).catch(function (error) {
      combatRuntimePromise = null;
      throw error;
    });
    return combatRuntimePromise;
  }

  function gameStylesAlreadyPresent() {
    if (typeof document === 'undefined') return true;
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    for (let i = 0; i < links.length; i++) {
      const href = links[i].getAttribute('href') || '';
      if (href.indexOf('styles-game.css') >= 0) return true;
      // Full bundle (tests / legacy), not styles-shell.css
      if (/(?:^|\/)styles\.css(?:\?|$)/.test(href)) return true;
    }
    return false;
  }

  function ensureGameStyles() {
    if (gameStylesPromise) return gameStylesPromise;
    if (gameStylesAlreadyPresent()) {
      gameStylesPromise = Promise.resolve(true);
      return gameStylesPromise;
    }
    if (typeof document === 'undefined' ||
        (typeof require === 'function' &&
         typeof process !== 'undefined' &&
         process.versions && process.versions.node)) {
      gameStylesPromise = Promise.resolve(true);
      return gameStylesPromise;
    }
    gameStylesPromise = new Promise(function (resolve, reject) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = assetUrl(GAME_STYLE_HREF);
      link.setAttribute('data-lazy-styles-game', '1');
      link.onload = function () { resolve(true); };
      link.onerror = function () {
        gameStylesPromise = null;
        if (link.parentNode) link.parentNode.removeChild(link);
        reject(new Error('Failed to load styles-game.css'));
      };
      (document.head || document.documentElement).appendChild(link);
    });
    return gameStylesPromise;
  }

  function fetchJson(url) {
    if (typeof fetch !== 'function') {
      return Promise.reject(new Error('fetch is unavailable'));
    }
    return fetch(url).then(function (response) {
      if (!response || !response.ok) {
        throw new Error('Failed to fetch ' + url);
      }
      return response.json();
    });
  }

  function ensureHerblore() {
    if (herblorePromise) return herblorePromise;

    herblorePromise = new Promise(function (resolve, reject) {
      try {
        function finish(parity) {
          absorbIntoCatalogs(parity);
          resolve(parity);
        }

        let parity = resolveHerbloreApi();
        if (parity && typeof parity.isReady === 'function' && parity.isReady()) {
          finish(parity);
          return;
        }

        // Node: thin module sync-reads JSON beside itself.
        if (typeof require === 'function' &&
            typeof process !== 'undefined' &&
            process.versions && process.versions.node) {
          parity = require('../content/herblore-parity.js');
          if (root) root.HerbloreParityContent = parity;
          finish(parity);
          return;
        }

        const scriptUrl = assetUrl('content/herblore-parity.js');
        const jsonUrl = assetUrl('content/herblore-parity.json');

        Promise.all([
          parity ? Promise.resolve() : loadScript(scriptUrl, 'data-lazy-herblore'),
          fetchJson(jsonUrl)
        ]).then(function (parts) {
          const data = parts[1];
          const loaded = resolveHerbloreApi();
          if (!loaded || typeof loaded.loadFromData !== 'function') {
            throw new Error('HerbloreParityContent loader is unavailable');
          }
          loaded.loadFromData(data);
          finish(loaded);
        }).catch(reject);
      } catch (error) {
        reject(error);
      }
    });

    herblorePromise = herblorePromise.catch(function (error) {
      herblorePromise = null;
      throw error;
    });
    return herblorePromise;
  }

  function ensureWorldNarrativeType(type) {
    const content = resolveNarrativeApi();
    if (!content) {
      return Promise.reject(new Error('WorldEventNarrativeContent missing'));
    }
    if (typeof type !== 'string' || !type) {
      return Promise.resolve([]);
    }
    if (typeof content.isTypeReady === 'function' && content.isTypeReady(type)) {
      return Promise.resolve(content.listByType(type));
    }
    if (typeof content.ensureTypeLoaded === 'function' &&
        content.ensureTypeLoaded(type)) {
      return Promise.resolve(content.listByType(type));
    }
    if (narrativePromises[type]) return narrativePromises[type];
    const url = assetUrl(
      'content/world-event-narratives/' + encodeURIComponent(type) + '.json'
    );
    narrativePromises[type] = fetchJson(url).then(function (rows) {
      if (typeof content.ingestType === 'function') {
        content.ingestType(type, rows);
      }
      return content.listByType(type);
    });
    return narrativePromises[type];
  }

  function ensureWorldNarratives() {
    const content = resolveNarrativeApi();
    if (!content) {
      return Promise.reject(new Error('WorldEventNarrativeContent missing'));
    }
    if (typeof content.isAllReady === 'function' && content.isAllReady()) {
      return Promise.resolve(content.list());
    }
    if (typeof content.ensureAllLoaded === 'function' &&
        content.ensureAllLoaded()) {
      return Promise.resolve(content.list());
    }
    if (narrativesAllPromise) return narrativesAllPromise;
    const indexUrl = assetUrl('content/world-event-narratives/index.json');
    narrativesAllPromise = fetchJson(indexUrl).then(function (types) {
      const list = Array.isArray(types) ? types : [];
      return Promise.all(list.map(function (type) {
        return ensureWorldNarrativeType(type);
      })).then(function () {
        if (typeof content.markAllReady === 'function') {
          content.markAllReady();
        }
        return content.list();
      });
    });
    return narrativesAllPromise;
  }

  return Object.freeze({
    ensureHerblore: ensureHerblore,
    ensureWorldNarratives: ensureWorldNarratives,
    ensureWorldNarrativeType: ensureWorldNarrativeType,
    ensureUiPages: ensureUiPages,
    ensureCombatRuntime: ensureCombatRuntime,
    ensureGameStyles: ensureGameStyles,
    UI_PAGE_SCRIPTS: UI_PAGE_SCRIPTS,
    COMBAT_RUNTIME_SCRIPTS: COMBAT_RUNTIME_SCRIPTS
  });
});
