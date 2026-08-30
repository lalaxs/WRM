(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.RuntimeModules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * 权威运行时模块清单 + 依赖方向约定（单一真相源）。
   *
   * 依赖只允许向下：
   *   platform → content → core → game(GameAPI) → ui
   *
   * 禁止：
   *   - ui 直接 require/调用 core、content、platform 内部（只经 window.GameAPI）
   *   - content 依赖 core / game / ui
   *   - core 依赖 game / ui / platform 具体实现（可依赖其它 core/content）
   *   - game 直接操作 DOM（UI 层职责）
   *
   * index.html 首屏脚本顺序必须与 BOOT_SCRIPTS 一致（可带 ?v= 缓存戳）。
   * 延后模块只通过 LazyContent 加载，不要再写回 index 同步链。
   */

  const DEPENDENCY_LAYERS = Object.freeze([
    Object.freeze({
      id: 'platform',
      owns: Object.freeze(['platform.js', 'AdManager.js', 'nie-manifest.js']),
      mayDependOn: Object.freeze([])
    }),
    Object.freeze({
      id: 'content',
      owns: Object.freeze(['content/']),
      mayDependOn: Object.freeze(['content', 'platform'])
    }),
    Object.freeze({
      id: 'core',
      owns: Object.freeze(['core/']),
      mayDependOn: Object.freeze(['core', 'content'])
    }),
    Object.freeze({
      id: 'game',
      owns: Object.freeze([
        'game.js',
        'game-queries.js',
        'game-queries-social.js',
        'game-queries-combat.js',
        'game-commands.js',
        'game-api.js'
      ]),
      mayDependOn: Object.freeze(['game', 'core', 'content', 'platform'])
    }),
    Object.freeze({
      id: 'ui',
      owns: Object.freeze(['ui/', 'ui.js', 'styles-shell.css', 'styles-game.css', 'styles.css']),
      mayDependOn: Object.freeze(['ui', 'game']) // UI → GameAPI only in practice
    })
  ]);

  const BOOT_STYLES = Object.freeze(['styles-shell.css']);

  const GAME_STYLE_HREF = 'styles-game.css?v=20260826-equip8';

  /** 进游戏后再挂的样式（战斗/社交等）。 */
  const DEFERRED_STYLES = Object.freeze([GAME_STYLE_HREF]);

  /**
   * 首屏同步脚本（顺序即依赖顺序；不含 ?v=）。
   * 修改后请同步 index.html，并跑 selftest_runtime_modules。
   */
  const BOOT_SCRIPTS = Object.freeze([
    'nie-manifest.js',
    'platform.js',
    'AdManager.js',
    'content/fishing-parity.js',
    'content/item-art.js',
    'content/materials.js',
    'content/combat-lexicon.js',
    'content/equipment.js',
    'content/items.js',
    'content/life-skills.js',
    'content/gathering.js',
    'content/recipes.js',
    'content/homestead.js',
    'content/combat.js',
    'content/techniques.js',
    'content/basic-attacks.js',
    'content/realms.js',
    'content/regions.js',
    'content/sects.js',
    'core/dns.js',
    'content/sect-offices.js',
    'content/original-event-bindings.js',
    'content/event-templates.js',
    'content/sect-missions.js',
    'content/sect-pavilion.js',
    'content/world-event-narratives.js',
    'content/npc-generation.js',
    'content/social-interactions.js',
    'content/lifecycle.js',
    'core/random.js',
    'core/equipment.js',
    'core/stage2-state.js',
    'core/stage3-state.js',
    'core/npc-generator.js',
    'core/npc-roster.js',
    'core/person-factory.js',
    'core/relation-seed.js',
    'core/sect-offices.js',
    'core/sect-missions.js',
    'core/sect-pavilion.js',
    'core/world-event-picker.js',
    'core/stage4-state.js',
    'core/relationships.js',
    'core/person-graph.js',
    'core/event-core.js',
    'core/world-calendar.js',
    'core/world-narrative-fill.js',
    'core/world-romance.js',
    'core/world-event-gen.js',
    'core/world-month.js',
    'core/npc-combat-config.js',
    'core/combat-party.js',
    'core/inventory.js',
    'core/skill-progression.js',
    'core/social.js',
    'core/npc-simulation.js',
    'core/sect-simulation.js',
    'core/gathering.js',
    'core/fishing-loot.js',
    'core/production.js',
    'core/farm.js',
    'core/formations.js',
    'core/spirit-beasts.js',
    'core/combat-loadouts.js',
    'core/techniques.js',
    'core/breakthrough.js',
    'core/save-system.js',
    'core/simulation-report.js',
    'core/state-model.js',
    'core/simulation.js',
    'core/game-rules.js',
    'core/stage2-rules.js',
    'core/stage4-rules.js',
    'core/lineage.js',
    'core/inheritance-hall.js',
    'core/legacy-transition.js',
    'core/stage5-rules.js',
    'runtime-modules.js',
    'core/lazy-content.js',
    'game.js',
    'game-queries.js',
    'game-queries-social.js',
    'game-queries-combat.js',
    'game-commands.js',
    'game-api.js',
    'ui/ui-core.js',
    'ui/ui-modals.js',
    'ui.js'
  ]);

  /** 测试环境一次加载的 UI 全量（boot + pages）。 */
  const UI_BOOT_SCRIPTS = Object.freeze([
    'ui/ui-core.js',
    'ui/ui-modals.js',
    'ui.js'
  ]);

  const UI_PAGE_SCRIPTS = Object.freeze([
    'ui/ui-home.js',
    'ui/ui-skills.js',
    'ui/ui-social.js',
    'ui/ui-combat.js'
  ]);

  const UI_TEST_SCRIPTS = Object.freeze(
    UI_BOOT_SCRIPTS.concat(UI_PAGE_SCRIPTS)
  );

  const COMBAT_RUNTIME_SCRIPTS = Object.freeze([
    'core/combat-stats.js',
    'core/team-combat-snapshot.js',
    'core/team-combat-engine.js',
    'core/team-combat-consequences.js',
    'core/combat-engine.js',
    'core/combat-rewards.js',
    'core/combat-progress.js',
    'core/stage3-rules.js'
  ]);

  const COMBAT_RUNTIME_GLOBALS = Object.freeze([
    'CombatStats',
    'TeamCombatSnapshot',
    'TeamCombatEngine',
    'TeamCombatConsequences',
    'CombatEngine',
    'CombatRewards',
    'CombatProgress',
    'Stage3Rules'
  ]);

  /** 不进首屏同步链、由 LazyContent 拉取的数据资产。 */
  const DEFERRED_DATA = Object.freeze([
    'content/herblore-parity.js',
    'content/herblore-parity.json'
  ]);

  const PACKAGE_ROOT_FILES = Object.freeze([
    'index.html',
    'game.json',
    'project.config.json',
    'platform.js',
    'AdManager.js',
    'runtime-modules.js',
    'game.js',
    'game-queries.js',
    'game-queries-social.js',
    'game-queries-combat.js',
    'game-commands.js',
    'game-api.js',
    'ui/ui-core.js',
    'ui/ui-home.js',
    'ui/ui-skills.js',
    'ui/ui-social.js',
    'ui/ui-combat.js',
    'ui/ui-modals.js',
    'ui.js',
    'styles-shell.css',
    'styles-game.css',
    'styles.css',
    'nie-manifest.js',
    'content/herblore-parity.json',
    'content/herblore-parity.js',
    'content/fishing-parity.js',
    'content/item-art.js',
    'content/materials.js',
    'content/combat-lexicon.js',
    'content/equipment.js',
    'content/items.js',
    'content/life-skills.js',
    'content/gathering.js',
    'content/recipes.js',
    'content/homestead.js',
    'content/combat.js',
    'content/techniques.js',
    'content/basic-attacks.js',
    'content/realms.js',
    'content/regions.js',
    'content/sects.js',
    'content/sect-offices.js',
    'content/sect-missions.js',
    'content/sect-pavilion.js',
    'content/npc-generation.js',
    'content/social-interactions.js',
    'content/lifecycle.js',
    'content/world-event-narratives.js',
    'content/original-event-bindings.js',
    'content/event-templates.js',
    'core/stage2-state.js',
    'core/stage3-state.js',
    'core/npc-generator.js',
    'core/npc-roster.js',
    'core/person-factory.js',
    'core/relation-seed.js',
    'core/stage4-state.js',
    'core/relationships.js',
    'core/world-event-picker.js',
    'core/dns.js',
    'core/person-graph.js',
    'core/event-core.js',
    'core/world-calendar.js',
    'core/world-narrative-fill.js',
    'core/world-romance.js',
    'core/world-event-gen.js',
    'core/world-month.js',
    'core/npc-combat-config.js',
    'core/combat-party.js',
    'core/random.js',
    'core/equipment.js',
    'core/inventory.js',
    'core/skill-progression.js',
    'core/social.js',
    'core/npc-simulation.js',
    'core/sect-simulation.js',
    'core/sect-offices.js',
    'core/sect-missions.js',
    'core/sect-pavilion.js',
    'core/gathering.js',
    'core/fishing-loot.js',
    'core/production.js',
    'core/farm.js',
    'core/formations.js',
    'core/spirit-beasts.js',
    'core/combat-loadouts.js',
    'core/techniques.js',
    'core/combat-stats.js',
    'core/combat-engine.js',
    'core/team-combat-snapshot.js',
    'core/team-combat-engine.js',
    'core/team-combat-consequences.js',
    'core/combat-rewards.js',
    'core/combat-progress.js',
    'core/breakthrough.js',
    'core/save-system.js',
    'core/simulation-report.js',
    'core/state-model.js',
    'core/simulation.js',
    'core/game-rules.js',
    'core/stage2-rules.js',
    'core/stage3-rules.js',
    'core/stage4-rules.js',
    'core/lineage.js',
    'core/inheritance-hall.js',
    'core/legacy-transition.js',
    'core/stage5-rules.js',
    'core/lazy-content.js'
  ]);

  const PACKAGE_ASSET_DIRS = Object.freeze([
    'content/world-event-narratives',
    'NIE',
    'assets'
  ]);

  function stripQuery(src) {
    if (typeof src !== 'string') return '';
    const q = src.indexOf('?');
    return q < 0 ? src : src.slice(0, q);
  }

  function extractHtmlScripts(html) {
    const out = [];
    const re = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = re.exec(html))) {
      out.push(stripQuery(match[1]));
    }
    return out;
  }

  function extractHtmlStylesheets(html) {
    const out = [];
    const re = /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = re.exec(html))) {
      out.push(stripQuery(match[1]));
    }
    // also accept href before rel
    const re2 = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']stylesheet["'][^>]*>/gi;
    while ((match = re2.exec(html))) {
      const href = stripQuery(match[1]);
      if (out.indexOf(href) < 0) out.push(href);
    }
    return out;
  }

  function sameList(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i++) {
      if (left[i] !== right[i]) return false;
    }
    return true;
  }

  function validateBootHtml(html) {
    const errors = [];
    const scripts = extractHtmlScripts(html);
    const styles = extractHtmlStylesheets(html);

    if (!sameList(scripts, BOOT_SCRIPTS)) {
      errors.push(
        'index.html sync scripts drift from RuntimeModules.BOOT_SCRIPTS\n' +
        '  html: ' + JSON.stringify(scripts) + '\n' +
        '  manifest: ' + JSON.stringify(BOOT_SCRIPTS)
      );
    }

    BOOT_STYLES.forEach(function (href) {
      if (styles.indexOf(href) < 0) {
        errors.push('index.html missing boot stylesheet: ' + href);
      }
    });

    DEFERRED_STYLES.forEach(function (href) {
      if (styles.indexOf(href) >= 0) {
        errors.push(
          'index.html must not sync-load deferred stylesheet: ' + href
        );
      }
    });

    COMBAT_RUNTIME_SCRIPTS.forEach(function (src) {
      if (scripts.indexOf(src) >= 0) {
        errors.push(
          'index.html must not sync-load deferred combat runtime: ' + src
        );
      }
    });

    UI_PAGE_SCRIPTS.forEach(function (src) {
      if (scripts.indexOf(src) >= 0) {
        errors.push(
          'index.html must not sync-load deferred UI page: ' + src
        );
      }
    });

    if (scripts.indexOf('content/herblore-parity.js') >= 0) {
      errors.push(
        'index.html must not sync-load herblore-parity.js (use LazyContent.ensureHerblore)'
      );
    }

    return errors;
  }

  /**
   * 粗粒度静态门禁：扫描 UI 源码是否直接碰 core/content/platform。
   * 允许 LazyContent / GameAPI / document / window.XiuxianUi。
   */
  function validateUiIsolation(uiSourceTexts) {
    const errors = [];
    const forbidden = [
      { re: /require\s*\(\s*['"]\.\.\/core\//, msg: 'ui must not require(core/...)' },
      { re: /require\s*\(\s*['"]\.\.\/content\//, msg: 'ui must not require(content/...)' },
      { re: /\btap\./, msg: 'ui must not call tap.* (use Platform via GameAPI/game)' },
      { re: /SaveSystem\./, msg: 'ui must not call SaveSystem (use GameAPI)' },
      { re: /Stage[2-5](?:State|Rules)\./, msg: 'ui must not call Stage* domain APIs' }
    ];
    (uiSourceTexts || []).forEach(function (entry) {
      const name = entry.name || 'ui';
      const text = entry.source || '';
      forbidden.forEach(function (rule) {
        if (rule.re.test(text)) {
          errors.push(name + ': ' + rule.msg);
        }
      });
    });
    return errors;
  }

  function buildPackageFiles(listAssetFiles) {
    const files = PACKAGE_ROOT_FILES.slice();
    (PACKAGE_ASSET_DIRS || []).forEach(function (dir) {
      const listed = typeof listAssetFiles === 'function'
        ? listAssetFiles(dir)
        : [];
      listed.forEach(function (rel) {
        if (files.indexOf(rel) < 0) files.push(rel);
      });
    });
    return Object.freeze(files);
  }

  return Object.freeze({
    DEPENDENCY_LAYERS: DEPENDENCY_LAYERS,
    BOOT_STYLES: BOOT_STYLES,
    DEFERRED_STYLES: DEFERRED_STYLES,
    GAME_STYLE_HREF: GAME_STYLE_HREF,
    BOOT_SCRIPTS: BOOT_SCRIPTS,
    UI_BOOT_SCRIPTS: UI_BOOT_SCRIPTS,
    UI_PAGE_SCRIPTS: UI_PAGE_SCRIPTS,
    UI_TEST_SCRIPTS: UI_TEST_SCRIPTS,
    COMBAT_RUNTIME_SCRIPTS: COMBAT_RUNTIME_SCRIPTS,
    COMBAT_RUNTIME_GLOBALS: COMBAT_RUNTIME_GLOBALS,
    DEFERRED_DATA: DEFERRED_DATA,
    PACKAGE_ROOT_FILES: PACKAGE_ROOT_FILES,
    PACKAGE_ASSET_DIRS: PACKAGE_ASSET_DIRS,
    stripQuery: stripQuery,
    extractHtmlScripts: extractHtmlScripts,
    extractHtmlStylesheets: extractHtmlStylesheets,
    validateBootHtml: validateBootHtml,
    validateUiIsolation: validateUiIsolation,
    buildPackageFiles: buildPackageFiles
  });
});
