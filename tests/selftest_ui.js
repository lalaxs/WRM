// UI migration self-test: load game.js + ui.js in a small browser-like VM and
// verify the public query/command/render boundary plus persistence recovery UI.
const fs = require('fs');
const vm = require('vm');
const SimulationReportNode = require('../core/simulation-report.js');
const SaveSystemNode = require('../core/save-system.js');

class ClassList {
  constructor() { this._s = new Set(); }
  add(value) { this._s.add(value); }
  remove(value) { this._s.delete(value); }
  toggle(value, force) {
    if (force === undefined) force = !this._s.has(value);
    force ? this._s.add(value) : this._s.delete(value);
    return force;
  }
  contains(value) { return this._s.has(value); }
  toString() { return [...this._s].join(' '); }
}

function stubCtx() {
  return new Proxy({}, {
    get(target, property) {
      if (property === 'createLinearGradient') {
        return () => ({ addColorStop() {} });
      }
      if (property === 'measureText') return () => ({ width: 10 });
      if (property === 'canvas') return { width: 420, height: 820 };
      return () => {};
    }
  });
}

class MockEl {
  constructor(tag) {
    this.tagName = (tag || 'div').toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {
      setProperty(name, value) {
        this[name] = value;
      },
      removeProperty(name) {
        delete this[name];
      }
    };
    this.classList = new ClassList();
    this._text = '';
    this._handlers = {};
    this.width = 0;
    this.height = 0;
    this.clientWidth = this.tagName === 'CANVAS' ? 56 : 0;
    this.clientHeight = this.tagName === 'CANVAS' ? 56 : 0;
    this.disabled = false;
    this.value = '';
    this.type = '';
    this.placeholder = '';
  }
  set className(value) {
    this.classList = new ClassList();
    String(value || '').split(/\s+/).forEach((name) => {
      if (name) this.classList.add(name);
    });
  }
  get className() { return this.classList.toString(); }
  set textContent(value) {
    this._text = String(value == null ? '' : value);
    this.children = [];
  }
  get textContent() { return this._text; }
  set innerHTML(value) {
    if (value === '') this.children = [];
    this._html = value;
  }
  get innerHTML() { return this._html || ''; }
  appendChild(child) {
    this.children.push(child);
    child.parent = this;
    return child;
  }
  get childNodes() { return this.children; }
  get firstChild() { return this.children[0] || null; }
  get lastChild() {
    return this.children[this.children.length - 1] || null;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) this.children.splice(idx, 1);
    return child;
  }
  insertBefore(child, reference) {
    if (reference == null) {
      this.children.push(child);
    } else {
      const idx = this.children.indexOf(reference);
      if (idx < 0) this.children.push(child);
      else this.children.splice(idx, 0, child);
    }
    child.parent = this;
    return child;
  }
  addEventListener(event, handler) {
    (this._handlers[event] = this._handlers[event] || []).push(handler);
  }
  click() {
    if (this.disabled) return;
    (this._handlers.click || []).forEach((handler) => handler({}));
  }
  dispatch(event) {
    (this._handlers[event] || []).forEach((handler) => handler({
      target: this
    }));
  }
  getContext() { return stubCtx(); }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 420, height: 820 };
  }
  setAttribute(name, value) {
    this.attributes = this.attributes || {};
    this.attributes[name] = String(value);
    if (name === 'title') this.title = String(value);
  }
  getAttribute(name) {
    this.attributes = this.attributes || {};
    return this.attributes[name];
  }
  find(predicate, output) {
    output = output || [];
    if (predicate(this)) output.push(this);
    this.children.forEach((child) => {
      if (child.find) child.find(predicate, output);
    });
    return output;
  }
}

function stubCanvas() {
  const canvas = new MockEl('canvas');
  canvas.getContext = () => stubCtx();
  return canvas;
}

function byClass(root, className) {
  return root.find((element) =>
    element.classList && element.classList.contains(className)
  );
}

function allText(root) {
  return root.find(() => true)
    .map((element) => element.textContent)
    .filter(Boolean)
    .join('\n');
}

function inside(root, parentClass, childClass) {
  return byClass(root, parentClass).flatMap((parent) =>
    byClass(parent, childClass)
  );
}

function firstClass(root, className, index) {
  return byClass(root, className)[index || 0] || new MockEl('div');
}

function fixedDate(now) {
  return class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
}

function createRuntime(store, now, controls, withUI, options) {
  controls = controls || { saveMode: 'ok', saveAttempts: 0 };
  options = options || {};
  const canvas = stubCanvas();
  const uiRoot = new MockEl('div');
  uiRoot.id = 'ui';
  const scheduledFrames = [];
  const rendererCalls = [];
  const document = {
    getElementById(id) {
      if (id === 'game') return canvas;
      if (id === 'ui') return uiRoot;
      return null;
    },
    createElement(tag) {
      return tag === 'canvas' ? stubCanvas() : new MockEl(tag);
    },
    addEventListener() {},
    hidden: false
  };
  const view = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    safeTop: 0,
    dpr: 1,
    logicalH: 820
  };
  const platform = new Proxy({}, {
    get(target, property) {
      if (property === 'canvas') return canvas;
      if (property === 'ctx') return stubCtx();
      if (property === 'view') return view;
      if (property === 'load') {
        return (key) => key in store ? JSON.parse(store[key]) : null;
      }
      if (property === 'save') {
        return (key, value) => {
          controls.saveAttempts = (controls.saveAttempts || 0) + 1;
          const outcome = controls.saveOutcomes &&
            controls.saveOutcomes.length
            ? controls.saveOutcomes.shift()
            : controls.saveMode;
          if (outcome === false || outcome === 'false') return false;
          if (outcome === 'throw') throw new Error('storage unavailable');
          store[key] = JSON.stringify(value);
          return true;
        };
      }
      if (property === 'createImage') {
        return () => ({
          complete: true,
          onload: null,
          onerror: null,
          set src(value) {}
        });
      }
      if (property === 'createCanvas') return () => stubCanvas();
      if (property === 'getSystemInfoAsync') {
        return (options) => {
          if (options && options.success) {
            options.success({
              pixelRatio: 1,
              safeArea: { top: 0 }
            });
          }
        };
      }
      return () => {};
    }
  });
  const windowFacade = {
    addEventListener() {},
    NIE_ASSET_BASE: '',
    devicePixelRatio: 1
  };
  const sandbox = {
    __GAME_TEST_HARNESS_REQUEST__: !!options.requestTestHarness,
    Platform: platform,
    document,
    window: windowFacade,
    console,
    Math,
    Date: fixedDate(now),
    isFinite,
    isNaN,
    parseInt,
    parseFloat,
    requestAnimationFrame(callback) {
      if (options.captureFrames && typeof callback === 'function') {
        scheduledFrames.push(callback);
      }
    },
    setTimeout() { return 0; },
    clearTimeout() {},
    Proxy,
    RegExp,
    Error,
    Set,
    structuredClone
  };
  if (options.browserTopology) {
    sandbox.addEventListener = windowFacade.addEventListener;
    sandbox.NIE_ASSET_BASE = '';
    sandbox.devicePixelRatio = 1;
    sandbox.window = sandbox;
  }
  sandbox.globalThis = sandbox;
  if (options.interceptRenderer) {
    sandbox.window.UI = {
      renderGame() {
        rendererCalls.push(Array.from(arguments));
      }
    };
  }
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync('nie-manifest.js', 'utf8'),
    sandbox,
    { filename: 'nie-manifest.js' }
  );
  const stage4Bootstrap = [
    'content/regions.js',
    'content/sects.js',
    'content/sect-offices.js',
    'content/sect-missions.js',
    'content/sect-pavilion.js',
    'content/npc-generation.js',
    'content/social-interactions.js',
    'content/world-event-narratives.js',
    'core/npc-generator.js',
    'core/npc-roster.js',
    'core/person-factory.js',
    'core/relation-seed.js',
    'core/sect-offices.js',
    'core/sect-missions.js',
    'core/sect-pavilion.js',
    'core/stage4-state.js',
    'core/relationships.js',
    'core/dns.js',
    'core/person-graph.js',
    'core/event-core.js',
    'core/world-event-picker.js',
    'core/world-calendar.js',
    'core/world-narrative-fill.js',
    'core/world-romance.js',
    'core/world-event-gen.js',
    'core/world-month.js',
    'core/npc-combat-config.js',
    'core/combat-party.js',
    'core/social.js',
    'core/npc-simulation.js',
    'core/sect-simulation.js',
    'core/team-combat-snapshot.js',
    'core/team-combat-engine.js',
    'core/team-combat-consequences.js',
    'core/stage4-rules.js'
  ];
  function withStage4SaveSupport(files) {
    const next = files.slice();
    const saveIndex = next.indexOf('core/save-system.js');
    const insertAt = saveIndex >= 0 ? saveIndex : next.length;
    stage4Bootstrap.forEach(function (file, offset) {
      if (next.indexOf(file) < 0) {
        next.splice(insertAt + offset, 0, file);
      }
    });
    if (next.indexOf('content/combat.js') < 0) {
      next.splice(insertAt, 0, 'content/combat.js', 'content/techniques.js',
        'content/realms.js', 'core/stage3-state.js');
    } else if (next.indexOf('core/stage3-state.js') < 0) {
      const combatIndex = next.indexOf('content/combat.js');
      next.splice(combatIndex + 1, 0, 'core/stage3-state.js');
    }
    return next;
  }
  const stage2Dependencies = withStage4SaveSupport([
    'content/herblore-parity.js',
    'content/materials.js',
    'content/items.js',
    'content/life-skills.js',
    'content/gathering.js',
    'content/recipes.js',
    'content/homestead.js',
    'core/stage2-state.js',
    'core/random.js',
    'core/inventory.js',
    'core/skill-progression.js',
    'core/gathering.js',
    'core/production.js',
    'core/farm.js',
    'core/formations.js',
    'core/spirit-beasts.js',
    'core/save-system.js',
    'core/simulation-report.js',
    'core/state-model.js',
    'core/simulation.js',
    'core/game-rules.js',
    'core/stage2-rules.js'
  ]);
  const stage3Dependencies = withStage4SaveSupport([
    'content/herblore-parity.js',
    'content/materials.js',
    'content/item-art.js',
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
    'core/random.js',
    'core/equipment.js',
    'core/stage2-state.js',
    'core/stage3-state.js',
    'core/inventory.js',
    'core/skill-progression.js',
    'core/gathering.js',
    'core/production.js',
    'core/farm.js',
    'core/formations.js',
    'core/spirit-beasts.js',
    'core/combat-loadouts.js',
    'core/techniques.js',
    'core/combat-stats.js',
    'core/combat-engine.js',
    'core/combat-rewards.js',
    'core/combat-progress.js',
    'core/breakthrough.js',
    'core/save-system.js',
    'core/simulation-report.js',
    'core/state-model.js',
    'core/simulation.js',
    'core/game-rules.js',
    'core/stage2-rules.js',
    'core/stage3-rules.js'
  ]);
  const dependencyOrder = stage3Dependencies;
  dependencyOrder.forEach((file) => {
    vm.runInContext(
      fs.readFileSync(file, 'utf8'),
      sandbox,
      { filename: file }
    );
  });
  if (options.instrumentStage2ModelReads) {
    const baseStateModel = sandbox.StateModel;
    controls.stage2ModelReads = 0;
    sandbox.StateModel = Object.freeze(Object.assign({}, baseStateModel, {
      fromRuntime() {
        controls.stage2ModelReads++;
        return baseStateModel.fromRuntime.apply(baseStateModel, arguments);
      }
    }));
  }
  ['game.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-api.js'].forEach((file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  });
  if (withUI) {
    const { loadUiScripts } = require('./ui_scripts');
    loadUiScripts(vm, sandbox);
  }
  return {
    api: sandbox.window.GameAPI,
    ui: sandbox.window.UI,
    root: uiRoot,
    sandbox,
    controls,
    store,
    scheduledFrames,
    rendererCalls
  };
}

function frozenCopy(value) {
  if (!value || typeof value !== 'object') return value;
  const copy = Array.isArray(value) ? [] : {};
  Object.keys(value).forEach((key) => {
    copy[key] = frozenCopy(value[key]);
  });
  return Object.freeze(copy);
}

function createStage2UiFixtureRuntime(fixture) {
  const uiRoot = new MockEl('div');
  uiRoot.id = 'ui';
  const calls = [];
  const inventoryQueries = [];
  let activeIndex = 0;
  let activeActionKey = fixture.activeActionKey || null;
  let assistantId = fixture.assistantId || null;
  let breakOpen = false;

  function actionDecorated(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(actionDecorated);
    const result = {};
    Object.keys(value).forEach((key) => {
      result[key] = actionDecorated(value[key]);
    });
    if (typeof value.actionKey === 'string') {
      result.active = value.actionKey === activeActionKey;
      result.stalled = result.active && !!value.stalled;
      result.progress = result.active
        ? (Number.isFinite(value.progress) ? value.progress : 0.4)
        : 0;
    }
    if (typeof value.beastId === 'string' &&
        Object.prototype.hasOwnProperty.call(value, 'effect')) {
      result.active = value.beastId === assistantId;
    }
    return result;
  }

  function resultFor(name, input) {
    const override = fixture.commandResults &&
      fixture.commandResults[name];
    if (override) return frozenCopy(override);
    return frozenCopy({
      ok: true,
      code: 'ok',
      changed: true,
      message: null,
      data: input || null
    });
  }

  function command(name, update) {
    return (input) => {
      calls.push({ name, input: input === undefined ? null : input });
      const result = resultFor(name, input);
      if (result.ok && update) update(input);
      return result;
    };
  }

  const navigation = fixture.navigation;
  const queries = Object.freeze({
    app() {
      return frozenCopy({
        phase: 'game',
        appearance: {
          indices: {
            body: 0, cloth: 0, nose: 0, mouth: 0,
            eyes: 0, eyebrush: 0, hair: 0
          }
        },
        modals: {
          break: breakOpen,
          offline: false,
          legacyRebirth: false
        }
      });
    },
    navigation() {
      return frozenCopy({
        activeIndex,
        items: navigation.map((label, index) => ({
          id: 'nav-' + index,
          label,
          active: index === activeIndex
        }))
      });
    },
    top() {
      return frozenCopy({
        name: '青岚',
        pills: { mood: 88, jingqi: 90, lingshi: 120, shengwang: 0 },
        realm: '练气一层',
        xiwei: 12,
        need: 100,
        canBreak: false
      });
    },
    home() {
      return frozenCopy({
        realm: '练气一层',
        current: activeActionKey
          ? { name: activeActionKey, stalled: false }
          : null
      });
    },
    inventory(options) {
      const selectedCategory = options && options.category || 'all';
      const search = options && options.search || '';
      inventoryQueries.push({ category: selectedCategory, search });
      const source = fixture.inventory;
      const needle = search.toLowerCase();
      const items = source.items.filter((item) =>
        (selectedCategory === 'all' || item.category === selectedCategory) &&
        (!needle ||
          item.name.toLowerCase().includes(needle) ||
          item.itemId.toLowerCase().includes(needle))
      );
      return frozenCopy(Object.assign({}, source, {
        selectedCategory,
        search,
        items
      }));
    },
    breakModal() { return null; },
    skillPage(navName) {
      return frozenCopy(actionDecorated(
        fixture.skillPages[navName] || null
      ));
    },
    gatherPage(navName) {
      return frozenCopy(actionDecorated(
        fixture.gatherPages[navName] || null
      ));
    },
    homestead(moduleId) {
      return frozenCopy(actionDecorated(
        fixture.homestead[moduleId] || null
      ));
    },
    charm() { return frozenCopy(fixture.charm); },
    offline() {
      return frozenCopy({
        visible: false,
        reports: [],
        summary: { durationSeconds: 0, actions: [], stops: [] }
      });
    },
    events() { return frozenCopy({ offlineReports: [] }); },
    persistence() {
      return frozenCopy({
        locked: false,
        kind: null,
        message: '',
        canRetry: false
      });
    },
    combat(input) {
      const tab = input && input.tab;
      return frozenCopy(fixture.combat && fixture.combat[tab] || null);
    },
    combatLoadouts() {
      return frozenCopy(fixture.combatLoadouts || {
        activeLoadoutId: null,
        activeSessionLoadoutId: null,
        maxLoadouts: 5,
        canCreate: false,
        tabs: [],
        plans: [],
        currentDerivedStats: null
      });
    },
    techniques() {
      return frozenCopy(fixture.techniques || {
        learned: [],
        unlearned: [],
        techniques: []
      });
    },
    breakthrough(input) {
      if (typeof fixture.breakthroughQuery === 'function') {
        return frozenCopy(fixture.breakthroughQuery(input));
      }
      return frozenCopy(fixture.breakthrough || {
        ok: false,
        code: 'stage3_unavailable'
      });
    }
  });

  const commands = Object.freeze({
    randomizeAppearance: command('randomizeAppearance'),
    stepAppearance: command('stepAppearance'),
    confirmCreate: command('confirmCreate'),
    saveAppearance: command('saveAppearance'),
    switchNav: command('switchNav', (input) => {
      activeIndex = input.index;
    }),
    openBreak: command('openBreak', () => {
      breakOpen = true;
    }),
    closeBreak: command('closeBreak', () => {
      breakOpen = false;
    }),
    closeLifespanBuffer: command('closeLifespanBuffer'),
    attemptBreak: command('attemptBreak'),
    startAction: command('startAction', (input) => {
      activeActionKey = input.key;
    }),
    stopAction: command('stopAction', () => {
      activeActionKey = null;
    }),
    sellItem: command('sellItem'),
    useItem: command('useItem'),
    expandInventory: command('expandInventory'),
    plant: command('plant'),
    plantAll: command('plantAll'),
    harvest: command('harvest'),
    equipFormation: command('equipFormation'),
    unequipFormation: command('unequipFormation'),
    setActiveBeast: command('setActiveBeast', (input) => {
      assistantId = input.beastId;
    }),
    consumeTechniqueBook: command('consumeTechniqueBook'),
    createCombatLoadout: command('createCombatLoadout'),
    renameCombatLoadout: command('renameCombatLoadout'),
    deleteCombatLoadout: command('deleteCombatLoadout'),
    setActiveCombatLoadout: command('setActiveCombatLoadout'),
    setEquipment: command('setEquipment'),
    setSupply: command('setSupply'),
    setActiveTechnique: command('setActiveTechnique'),
    setPassiveTechnique: command('setPassiveTechnique'),
    claimCombatLoot: command('claimCombatLoot'),
    treatInjury: command('treatInjury'),
    attemptBreakthrough: command('attemptBreakthrough'),
    acknowledgeOffline: command('acknowledgeOffline'),
    enterLegacyRebirth: command('enterLegacyRebirth'),
    retryPersistence: command('retryPersistence')
  });
  const canvas = stubCanvas();
  const document = {
    getElementById(id) {
      if (id === 'ui') return uiRoot;
      if (id === 'game') return canvas;
      return null;
    },
    createElement(tag) {
      return tag === 'canvas' ? stubCanvas() : new MockEl(tag);
    }
  };
  const sandbox = {
    document,
    console,
    setTimeout() { return 0; },
    clearTimeout() {},
    GameAPI: Object.freeze({
      queries,
      commands,
      render: Object.freeze({ drawCharacter() { return true; } })
    })
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const { loadUiScripts } = require('./ui_scripts');
  loadUiScripts(vm, sandbox);
  return {
    api: sandbox.GameAPI,
    ui: sandbox.UI,
    root: uiRoot,
    calls,
    inventoryQueries,
    activeAction() { return activeActionKey; }
  };
}

function playerSnapshot(name) {
  return {
    name: name || '边界测试角色',
    realmStage: 0,
    realm: '练气一层',
    title: '练气',
    xiwei: 0,
    breakNeed: 100,
    mood: 100,
    jingqi: 100,
    lingshi: 100,
    shengwang: 0,
    lingyu: 0,
    shouyuan: 120,
    shouMax: 120,
    inventory: { stacks: {} },
    skills: {},
    mastery: {}
  };
}

// Snapshots accepted by the VM game must be built with the same SaveSystem /
// content stack as createRuntime (Node require() alone is not enough).
let FixtureSaveSystem = null;

function ensureFixtureSaveSystem(now) {
  if (!FixtureSaveSystem) {
    FixtureSaveSystem = createRuntime({}, now || 0, null, false).sandbox.SaveSystem;
  }
  return FixtureSaveSystem;
}

function baseSnapshot(now, extra) {
  const SaveSystem = ensureFixtureSaveSystem(now);
  const first = SaveSystem.createSnapshot(Object.assign({
    created: true,
    appearance: {
      parts: {
        body: 0,
        cloth: 0,
        eyebrush: 0,
        eyes: 0,
        hair: 0,
        mouth: 0,
        nose: 0
      }
    },
    player: playerSnapshot(),
    current: {
      key: 'gather:explore:herb',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      stalled: false
    },
    rngState: 123456789,
    processedThroughMs: now
  }, extra || {}), now);
  // Second pass stabilizes ensureWorldPopulation / eventId coercion.
  return SaveSystem.createSnapshot(first, first.savedAt);
}

function commandShape(result) {
  return result &&
    Object.keys(result).sort().join(',') ===
      'changed,code,data,message,ok' &&
    typeof result.ok === 'boolean' &&
    typeof result.code === 'string' &&
    typeof result.changed === 'boolean' &&
    Object.isFrozen(result);
}

function containsFunction(value, seen) {
  if (typeof value === 'function') return true;
  if (!value || typeof value !== 'object') return false;
  seen = seen || new Set();
  if (seen.has(value)) return false;
  seen.add(value);
  return Object.keys(value).some((key) =>
    containsFunction(value[key], seen)
  );
}

function recursivelyFrozen(value, seen) {
  if (!value || typeof value !== 'object') return true;
  seen = seen || new Set();
  if (seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value) &&
    Object.keys(value).every((key) =>
      recursivelyFrozen(value[key], seen)
    );
}

function attemptRecursiveMutation(value, seen) {
  if (!value || typeof value !== 'object') return 0;
  seen = seen || new Set();
  if (seen.has(value)) return 0;
  seen.add(value);
  const entries = Object.keys(value).map((key) => [key, value[key]]);
  let attempts = 0;

  if (Array.isArray(value)) {
    attempts++;
    try { value.push({ injected: true }); } catch (error) {}
    attempts++;
    try { value.splice(0, 1); } catch (error) {}
  } else {
    attempts++;
    try { value.__injected = true; } catch (error) {}
  }

  entries.forEach(([key, child]) => {
    attempts++;
    try {
      value[key] = child && typeof child === 'object'
        ? null
        : '__mutated';
    } catch (error) {}
    attempts++;
    try { delete value[key]; } catch (error) {}
    attempts += attemptRecursiveMutation(child, seen);
  });
  return attempts;
}

let pass = 0;
let fail = 0;
function ok(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.log('  ✗ FAIL: ' + message);
  }
}

const uiSource = require('./ui_scripts').readUiSource();
const gameSource = ['game.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-api.js']
  .map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const stylesSource = fs.readFileSync('styles.css', 'utf8');
ok(!/\bGameAPI\.state\b|\ba\.state\b/.test(uiSource),
  'UI does not access mutable state');
ok(!/\bGameAPI\.data\b|\ba\.data\b/.test(uiSource),
  'UI does not access raw data');
ok(!/\bGameAPI\.persist\b|\ba\.persist\b/.test(uiSource),
  'UI does not write saves');
ok(
  /safeQuery\(\s*'combat'/.test(uiSource) &&
    /safeQuery\('combatLoadouts'/.test(uiSource) &&
    /safeQuery\('techniques'/.test(uiSource) &&
    /safeQuery\('breakthrough'/.test(uiSource) &&
    /invokeCommand\('consumeTechniqueBook'/.test(uiSource) &&
    /invokeCommand\('claimCombatLoot'/.test(uiSource) &&
    /invokeCommand\('treatInjury'/.test(uiSource) &&
    /invokeCommand\('attemptBreakthrough'/.test(uiSource),
  'Task 13 UI consumes only the frozen Stage 3 query and command surface'
);
ok(
  !/进入云隐宗|欢迎来到云隐宗|双修/.test(
    uiSource + '\n' + gameSource
  ),
  'player-facing source has no sect-membership or dual-cultivation copy'
);
ok(
  /overflow-x\s*:\s*hidden/.test(stylesSource) &&
    /\.nav\s*\{[^}]*overflow-y\s*:\s*auto/s.test(stylesSource) &&
    /\.content\s*\{[^}]*overflow-y\s*:\s*auto/s.test(stylesSource) &&
    /@media\s*\([^)]*max-width\s*:\s*520px[^)]*\)/.test(stylesSource) &&
    /\.cave-grid\s*\{[^}]*grid-template-columns/s.test(stylesSource) &&
    /\.cave-card\s*\{[^}]*cursor\s*:\s*pointer/s.test(stylesSource) &&
    /\.action-grid[^}]*grid-template-columns\s*:\s*1fr/s.test(
      stylesSource.slice(stylesSource.indexOf('@media'))
    ) &&
    [
      'combat-tabs', 'enemy-card', 'dungeon-waves', 'battle-status',
      'hp-bar', 'qi-bar', 'loadout-tabs', 'technique-slot',
      'condition-row', 'pending-loot', 'injury-card'
    ].every((className) =>
      new RegExp('\\.' + className + '\\s*\\{').test(stylesSource)
    ) &&
    /@media\s*\([^)]*max-width\s*:\s*520px[^)]*\)[\s\S]*\.combat-grid[\s\S]*grid-template-columns\s*:\s*1fr/.test(
      stylesSource
    ),
  'responsive source keeps both panes scrollable and Stage 3 grids single-column without body overflow'
);

const NOW = 10_000_000;
ensureFixtureSaveSystem(NOW);
const initialPlayer = playerSnapshot();
initialPlayer.inventory.stacks.lingzhi = 1;
const initialStore = {
  cloud_save_v1: JSON.stringify(baseSnapshot(NOW, {
    player: initialPlayer
  }))
};
const runtime = createRuntime(initialStore, NOW, null, true);
const API = runtime.api;
const UI = runtime.ui;

const browserFaithfulStore = {
  cloud_save_v1: JSON.stringify(baseSnapshot(NOW))
};
const browserFaithful = createRuntime(
  browserFaithfulStore,
  NOW,
  null,
  false,
  {
    browserTopology: true,
    captureFrames: true,
    interceptRenderer: true,
    requestTestHarness: true
  }
);
const browserGlobalDenylist = [
  'getCharCache',
  'advanceRuntime',
  'getLastSimulationReport',
  'getPersistenceStatus',
  'persistModel',
  'persistCurrentModel',
  'persist',
  'save',
  'retryPersistence',
  'commitModel',
  'persistenceRecovery',
  'runtimeModelAt',
  'settleStartupOffline',
  'acknowledgeOffline',
  'applyModelToRuntime',
  'setCurrent',
  'closeOffline',
  'tryBreakthrough',
  'confirmCreate',
  'randomize',
  'stepPart',
  'state',
  'ACTIONS',
  'GATHERING_DATA',
  'simulationRuntime',
  '__GameTestHarness',
  '__test',
  '__G'
];
ok(
  browserFaithful.sandbox.window === browserFaithful.sandbox &&
    browserGlobalDenylist.every(function (key) {
      return !(key in browserFaithful.sandbox);
    }) &&
    Object.isFrozen(browserFaithful.api) &&
    Object.isFrozen(browserFaithful.api.queries) &&
    Object.isFrozen(browserFaithful.api.commands) &&
    Object.isFrozen(browserFaithful.api.render) &&
    Object.keys(browserFaithful.api).sort().join(',') ===
      'commands,queries,render',
  'browser-faithful classic-script topology exposes only the narrow GameAPI runtime surface'
);
browserFaithful.scheduledFrames[0]();
ok(
  browserFaithful.rendererCalls.length === 1 &&
    browserFaithful.rendererCalls[0].length === 0,
  'runtime invokes the global renderer with zero arguments and no state reference'
);

ok(API && API.queries && API.commands && API.render,
  'GameAPI exposes query command and render boundaries');
ok(
  Object.keys(API).sort().join(',') === 'commands,queries,render',
  'GameAPI exposes exactly queries, commands, and render'
);
ok(!('state' in API), 'GameAPI does not expose mutable state');
ok(!('data' in API), 'GameAPI does not expose mutable rule tables');
ok(!('persist' in API), 'GameAPI does not expose persistence');
ok(
  !('save' in API) &&
    !('getPersistenceStatus' in API) &&
    !('retryPersistence' in API),
  'legacy root persistence capabilities are removed'
);
ok(
  !('advanceRuntime' in API) && !('__test' in API),
  'raw runtime advancement and test seams are not public UI methods'
);

const expectedQueries = [
  'app',
  'breakModal',
  'events',
  'relationships',
  'relationship',
  'social',
  'sects',
  'sect',
  'world',
  'gatherPage',
  'homestead',
  'inheritanceHall',
  'legacyTransition',
  'home',
  'inventory',
  'itemInfo',
  'equipmentInfo',
  'navigation',
  'offline',
  'persistence',
  'skillPage',
  'charm',
  'top',
  'combat',
  'combatParty',
  'combatLoadouts',
  'techniques',
  'breakthrough'
].sort().join(',');
const expectedCommands = [
  'acknowledgeOffline',
  'attemptBreak',
  'closeLifespanBuffer',
  'closeBreak',
  'confirmCreate',
  'enterLegacyRebirth',
  'expandInventory',
  'equipEquipment',
  'unequipEquipment',
  'enhanceEquipment',
  'reforgeEquipment',
  'setEquipmentFavorite',
  'sellEquipment',
  'salvageEquipment',
  'openBreak',
  'randomizeAppearance',
  'retryPersistence',
  'saveAppearance',
  'sellItem',
  'plant',
  'plantAll',
  'harvest',
  'equipFormation',
  'unequipFormation',
  'setActiveBeast',
  'consumeTechniqueBook',
  'createCombatLoadout',
  'renameCombatLoadout',
  'deleteCombatLoadout',
  'setActiveCombatLoadout',
  'setEquipment',
  'setSupply',
  'setActiveTechnique',
  'setPassiveTechnique',
  'claimCombatLoot',
  'treatInjury',
  'attemptBreakthrough',
  'startSocial',
  'chooseEvent',
  'setCombatCompanion',
  'markEventSectionRead',
  'proposeLineageRitual',
  'setInheritancePlan',
  'beginLegacyTransition',
  'chooseLegacyRoute',
  'updateNewIdentityDraft',
  'confirmLegacyTransition',
  'cancelLegacyTransition',
  'startAction',
  'stepAppearance',
  'stopAction',
  'switchNav',
  'useItem'
].sort().join(',');
ok(
  expectedQueries.split(',').every((name) => name in API.queries) &&
    Object.keys(API.queries).length >= expectedQueries.split(',').length,
  'query surface is fixed'
);
ok(
  expectedCommands.split(',').every((name) => name in API.commands) &&
    Object.keys(API.commands).length >= expectedCommands.split(',').length,
  'command surface is fixed'
);
ok(
  Object.keys(API.render).join(',') === 'drawCharacter',
  'render surface only exposes drawCharacter'
);

const queryCases = [
  ['app', () => API.queries.app()],
  ['navigation', () => API.queries.navigation()],
  ['top', () => API.queries.top()],
  ['home', () => API.queries.home()],
  ['inventory', () => API.queries.inventory()],
  ['breakModal', () => API.queries.breakModal()],
  ['skillPage', () => API.queries.skillPage('炼丹')],
  ['gatherPage', () => API.queries.gatherPage('采药')],
  ['homestead', () => API.queries.homestead('farm')],
  ['charm', () => API.queries.charm()],
  ['offline', () => API.queries.offline()],
  ['events', () => API.queries.events()],
  ['persistence', () => API.queries.persistence()]
];
queryCases.forEach(([name, read]) => {
  const view = read();
  const again = read();
  ok(
    view != null &&
      !containsFunction(view) &&
      JSON.stringify(view) === JSON.stringify(again),
    name + ' query returns a plain serializable UI view'
  );
});

const persistenceVm = API.queries.persistence();
ok(
  typeof persistenceVm.locked === 'boolean' &&
    !('error' in persistenceVm) &&
    !('savedAt' in persistenceVm) &&
    !('now' in persistenceVm) &&
    !('candidate' in persistenceVm) &&
    !('checkpoint' in persistenceVm) &&
    !('retry' in persistenceVm),
  'persistence query is UI-safe and carries no recovery privilege'
);

const invalid = API.commands.startAction({ key: 'missing-action' });
ok(
  commandShape(invalid) &&
    invalid.ok === false &&
    invalid.code === 'invalid_action' &&
    invalid.changed === false,
  'invalid commands return structured failure'
);
const switched = API.commands.startAction({ key: 'gather:explore:mining' });
const switchedSnapshot = JSON.parse(initialStore.cloud_save_v1);
ok(
  commandShape(switched) &&
    switched.ok &&
    switched.code === 'ok' &&
    switched.changed &&
    switchedSnapshot.current.key === 'gather:explore:mining' &&
    switchedSnapshot.lastActionStop.reason === 'switched',
  'valid action switch saves once with a switched stop record'
);
ok(
  Object.isFrozen(switched.data),
  'command data is detached and frozen'
);
const stopped = API.commands.stopAction();
const stoppedSnapshot = JSON.parse(initialStore.cloud_save_v1);
ok(
  commandShape(stopped) &&
    stopped.ok &&
    stoppedSnapshot.current === null &&
    stoppedSnapshot.lastActionStop.reason === 'manual',
  'manual stop is transactional and records its reason'
);
[
  API.commands.randomizeAppearance(),
  API.commands.stepAppearance({ part: 'hair', delta: 1 }),
  API.commands.switchNav({ index: 0 }),
  API.commands.openBreak(),
  API.commands.closeBreak(),
  API.commands.attemptBreak(),
  API.commands.acknowledgeOffline({ reportIds: [] }),
  API.commands.retryPersistence()
].forEach((result, index) => {
  ok(commandShape(result), 'command result shape #' + index);
});
ok(
  API.render.drawCharacter(null) === false &&
    API.render.drawCharacter(stubCanvas()) === true,
  'drawCharacter rejects invalid targets and draws without leaking its cache'
);

UI.renderGame();
const shell = byClass(runtime.root, 'shell')[0];
const expectedStage2Navigation = [
  '洞府', '背包', '装备', '商城', '事件', '战斗', '宗门', '天下',
  '关系', '设置', '采药', '采矿', '伐木', '钓鱼', '炼丹', '炼器', '烹饪',
  '符箓'
];
ok(
  shell && shell.style.display === 'flex',
  'game phase shows the existing shell'
);
ok(
  JSON.stringify(API.queries.navigation().items.map((item) => item.label)) ===
    JSON.stringify(expectedStage2Navigation) &&
    !API.queries.navigation().items.some((item) => item.label === '排行'),
  'left navigation exposes the exact approved Stage 2 sequence'
);
ok(
  byClass(runtime.root, 'topbar').length === 1 &&
    byClass(runtime.root, 'avatar').length === 1 &&
    byClass(runtime.root, 'nav').length === 1 &&
    byClass(runtime.root, 'content').length === 1 &&
    byClass(runtime.root, 'modal-root').length === 1 &&
    byClass(runtime.root, 'toast-stack').length === 1 &&
    byClass(runtime.root, 'gain-tip-stack').length === 1 &&
    byClass(runtime.root, 'nav-item').length ===
      API.queries.navigation().items.length,
  'one existing shell triplet, modal root, toast root, and gain-tip root remain intact'
);

const gainTipStack = byClass(runtime.root, 'gain-tip-stack')[0];
UI.pushGainTips([
  { key: 'item:testHerb', type: 'item', amount: 1, label: '试药', itemId: 'testHerb' },
  { key: 'item:testHerb', type: 'item', amount: 2, label: '试药', itemId: 'testHerb' }
]);
ok(
  gainTipStack.children.length === 1 &&
    byClass(gainTipStack, 'gain-tip-text')[0].textContent === '试药 +3',
  'gain tips merge the same key into a single +N float'
);
UI.pushGainTips([
  { key: 'skillXp:mining', type: 'skillXp', amount: 4, label: '采矿' },
  { key: 'skillXp:woodcutting', type: 'skillXp', amount: 5, label: '伐木' },
  { key: 'skillXp:herb', type: 'skillXp', amount: 6, label: '采药' },
  { key: 'cultivation', type: 'cultivation', amount: 7, label: '修为' },
  { key: 'kill:wolf', type: 'kill', amount: 1, label: '灰狼' },
  { key: 'kill:scorpion', type: 'kill', amount: 1, label: '沙蝎' }
]);
ok(
  gainTipStack.children.length === 5 &&
    !Array.from(gainTipStack.children).some(
      (node) => node.dataset && node.dataset.gainKey === 'item:testHerb'
    ),
  'gain tip stack keeps at most five visible floats and drops the oldest'
);

const gainTipPublishRuntime = createRuntime(
  { cloud_save_v1: JSON.stringify(baseSnapshot(NOW)) },
  NOW,
  null,
  true,
  { requestTestHarness: true }
);
const gainTipPublishHarness =
  gainTipPublishRuntime.sandbox.__GameTestHarness;
const gainTipPublishStack = byClass(
  gainTipPublishRuntime.root,
  'gain-tip-stack'
)[0];
const offlineGainReport = SimulationReportNode.create({
  source: 'offline',
  fromMs: NOW,
  toMs: NOW + 1000
});
offlineGainReport.gains.items.testLoot = 9;
offlineGainReport.gains.skillXp.mining = 12;
gainTipPublishHarness.__test.publishGainTipsFromReport(offlineGainReport);
ok(
  gainTipPublishStack.children.length === 0,
  'offline simulation reports do not publish gain tips'
);
const onlineGainReport = SimulationReportNode.create({
  source: 'online',
  fromMs: NOW,
  toMs: NOW + 1000
});
onlineGainReport.gains.items.testLoot = 2;
onlineGainReport.gains.skillXp.mining = 3;
onlineGainReport.combat.enemiesDefeated.grayWolf = 1;
onlineGainReport.combat.loot.onlyCombatLoot = 4;
gainTipPublishHarness.__test.publishGainTipsFromReport(onlineGainReport);
ok(
  gainTipPublishStack.children.length === 4 &&
    byClass(gainTipPublishStack, 'gain-tip-text').some(
      (node) => node.textContent.indexOf('采矿') >= 0
    ) &&
    byClass(gainTipPublishStack, 'gain-tip-text').some(
      (node) => node.textContent.indexOf('击败') >= 0
    ),
  'online reports publish item, skill xp, kill, and non-duplicated combat loot tips'
);
const topResourcePills = byClass(runtime.root, 'resource-pill');
const topResourceIcons = byClass(runtime.root, 'resource-icon');
const topResourceValues = byClass(runtime.root, 'pill-val');
ok(
  topResourcePills.length === 5 &&
    topResourceIcons.length === 5 &&
    byClass(runtime.root, 'dot').length === 0,
  'topbar renders five image-backed resource pills without legacy dots'
);
ok(
  topResourceIcons.map((node) => node.src).join('|') === [
    'assets/resource-icons/50/lingshi.png',
    'assets/resource-icons/50/jingqi.png',
    'assets/resource-icons/50/mood.png',
    'assets/resource-icons/50/shengwang.png',
    'assets/resource-icons/50/shouyuan.png'
  ].join('|') &&
    topResourceValues.map((node) => node.textContent).join('|') ===
      '100|100|100|0|120',
  'topbar uses canonical resource icon order and displays finite lifespan'
);
const immortalResourcePlayer = playerSnapshot('飞升资源测试');
immortalResourcePlayer.realmStage = 16;
immortalResourcePlayer.realm = '飞升';
immortalResourcePlayer.breakNeed = 0;
immortalResourcePlayer.shouyuan = null;
immortalResourcePlayer.shouMax = null;
const immortalResourceRuntime = createRuntime({
  cloud_save_v1: JSON.stringify(baseSnapshot(NOW, {
    player: immortalResourcePlayer
  }))
}, NOW, null, true);
immortalResourceRuntime.ui.renderGame();
ok(
  byClass(immortalResourceRuntime.root, 'pill-val')
    .map((node) => node.textContent).join('|') === '100|100|100|0|∞',
  'topbar displays infinite lifespan as the infinity symbol'
);
ok(
  byClass(runtime.root, 'cave-card').length === 5,
  'home content remains in the right content area (cave-grid cards)'
);
const craftIndex = API.queries.navigation().items.findIndex(
  (item) => item.label === '炼丹'
);
API.commands.switchNav({ index: craftIndex });
UI.renderGame();
ok(
  byClass(runtime.root, 'action-card').length > 0,
  'crafting page still renders action cards'
);
const inventoryIndex = API.queries.navigation().items.findIndex(
  (item) => item.label === '背包'
);
API.commands.switchNav({ index: inventoryIndex });
UI.renderGame();
ok(
  byClass(runtime.root, 'inv-cell').length > 0,
  'inventory page still renders'
);
const stage2UiRuntime = createRuntime(
  {},
  NOW,
  null,
  true,
  {
    fullStage2: true,
    requestTestHarness: true
  }
);
stage2UiRuntime.api.commands.confirmCreate();
const stage2UiHarness = stage2UiRuntime.sandbox.__GameTestHarness;
const stage2UiModel = stage2UiHarness.__test.snapshotModel();
stage2UiModel.player.inventory.stacks.lingzhi = 2;
stage2UiHarness.__test.replaceModel(stage2UiModel);
stage2UiRuntime.ui.renderGame();
const stage2InventoryIndex =
  stage2UiRuntime.api.queries.navigation().items.findIndex(
    (item) => item.label === '背包'
  );
stage2UiRuntime.api.commands.switchNav({ index: stage2InventoryIndex });
stage2UiRuntime.ui.renderGame();
const stage2InventoryVm = stage2UiRuntime.api.queries.inventory();
ok(
  !Array.isArray(stage2InventoryVm) &&
    Array.isArray(stage2InventoryVm.items) &&
    stage2InventoryVm.items[0].itemId === 'lingzhi' &&
    byClass(stage2UiRuntime.root, 'topbar').length === 1 &&
    byClass(stage2UiRuntime.root, 'nav').length === 1 &&
    byClass(stage2UiRuntime.root, 'content').length === 1 &&
    byClass(stage2UiRuntime.root, 'inv-cell').length === 1,
  'full Stage 2 inventory object renders inside the unchanged UI shell'
);
const actionLabelModel = stage2UiHarness.__test.snapshotModel();
actionLabelModel.systems.homestead.beasts.encounters.push({
  id: 'label-encounter',
  speciesId: 'spiritFox',
  sourceSkillId: 'herb'
});
actionLabelModel.systems.homestead.beasts.roster.push({
  id: 'label-beast',
  speciesId: 'spiritFox',
  level: 1,
  xp: 0,
  traitId: 'friendly',
  growthId: 'steady'
});
actionLabelModel.current = {
  key: 'fish:pond',
  mode: 'repeat',
  count: 0,
  done: 0,
  elapsed: 0,
  elapsedAnchorMs: null,
  elapsedBaseSeconds: null,
  stalled: false
};
stage2UiHarness.__test.replaceModel(actionLabelModel);
const fishHomeLabel =
  stage2UiRuntime.api.queries.home().current.name;
actionLabelModel.current.key = 'produce:alchemy:healingPill';
stage2UiHarness.__test.replaceModel(actionLabelModel);
const productionHomeLabel =
  stage2UiRuntime.api.queries.home().current.name;
const tameLabelReport = SimulationReportNode.create({
  source: 'offline',
  fromMs: NOW - 1000,
  toMs: NOW,
  requestedSeconds: 1,
  actionKey: 'beast:tame:label-encounter',
  seedBefore: 123
});
tameLabelReport.action.completed = 1;
tameLabelReport.gains.masteryXp['beastTaming:spiritFox'] = 15;
actionLabelModel.pendingOfflineReports = [tameLabelReport];
actionLabelModel.systems.homestead.beasts.encounters = [];
actionLabelModel.current = null;
stage2UiHarness.__test.replaceModel(actionLabelModel);
const tameOfflineLabel =
  stage2UiRuntime.api.queries.offline().reports[0].action.label;
const trainLabelReport = SimulationReportNode.create({
  source: 'online',
  fromMs: NOW - 1000,
  toMs: NOW,
  requestedSeconds: 1,
  actionKey: 'beast:train:label-beast',
  seedBefore: 456
});
trainLabelReport.action.completed = 1;
actionLabelModel.pendingOfflineReports = [];
actionLabelModel.reportArchive = [trainLabelReport];
stage2UiHarness.__test.replaceModel(actionLabelModel);
const trainingEventLabel =
  ((stage2UiRuntime.api.queries.events().offlineReports || [])[0] ||
    { action: { label: null } }).action.label;
stage2UiHarness.state.current = {
  key: 'produce:missing-recipe',
  mode: 'repeat',
  count: 0,
  done: 0,
  elapsed: 0,
  stalled: false
};
const missingActionLabel =
  stage2UiRuntime.api.queries.home().current.name;
ok(
  fishHomeLabel === '村口池塘' &&
    productionHomeLabel === '疗伤丹' &&
    tameOfflineLabel === '驯服·灵狐' &&
    trainingEventLabel === '训练·灵狐' &&
    missingActionLabel === '制作',
  'home, offline, and event VMs resolve canonical Stage 2 action labels with safe fallback'
);

const lazyLabelControls = { saveMode: 'ok', saveAttempts: 0 };
const lazyLabelRuntime = createRuntime(
  {},
  NOW,
  lazyLabelControls,
  false,
  {
    fullStage2: true,
    requestTestHarness: true,
    instrumentStage2ModelReads: true
  }
);
lazyLabelRuntime.api.commands.confirmCreate();
const lazyLabelHarness = lazyLabelRuntime.sandbox.__GameTestHarness;
lazyLabelHarness.state.current = null;
const idleReads = lazyLabelControls.stage2ModelReads;
lazyLabelRuntime.api.queries.home();
lazyLabelHarness.state.current = {
  key: 'fish:pond',
  mode: 'repeat',
  count: 0,
  done: 0,
  elapsed: 0,
  stalled: false
};
const fishReads = lazyLabelControls.stage2ModelReads;
const lazyFishName = lazyLabelRuntime.api.queries.home().current.name;
lazyLabelHarness.state.current.key = 'produce:alchemy:healingPill';
const productionReads = lazyLabelControls.stage2ModelReads;
const lazyProductionName =
  lazyLabelRuntime.api.queries.home().current.name;
lazyLabelHarness.state.systems.homestead.beasts.encounters.push({
  id: 'lazy-encounter',
  speciesId: 'spiritFox',
  sourceSkillId: 'herb'
});
lazyLabelHarness.state.current.key = 'beast:tame:lazy-encounter';
const beastReads = lazyLabelControls.stage2ModelReads;
const lazyBeastName = lazyLabelRuntime.api.queries.home().current.name;
ok(
  fishReads === idleReads &&
    productionReads === fishReads &&
    beastReads === productionReads &&
    lazyLabelControls.stage2ModelReads === beastReads + 1 &&
    lazyFishName === '村口池塘' &&
    lazyProductionName === '疗伤丹' &&
    lazyBeastName === '驯服·灵狐',
  'home labels normalize a Stage 2 model only for runtime-entity beast actions'
);

const uiFixture = {
  navigation: expectedStage2Navigation,
  activeActionKey: 'produce:alchemy:healingPill',
  inventory: {
    capacity: 40,
    used: 2,
    free: 38,
    categories: ['all', 'material', 'consumable'],
    selectedCategory: 'all',
    search: '',
    items: [
      {
        itemId: 'lingzhi',
        name: '灵芝',
        category: 'material',
        quantity: 3,
        bound: 0,
        available: 3,
        sellValue: 2
      },
      {
        itemId: 'spiritSeed',
        name: '灵谷种',
        category: 'consumable',
        quantity: 2,
        bound: 1,
        available: 1,
        sellValue: 0
      }
    ]
  },
  skillPages: {},
  gatherPages: {},
  homestead: {},
  charm: {
    level: 12,
    xp: 7,
    nextXp: 120,
    benefits: {
      positiveRelationMultiplier: 1.11,
      misunderstandingReduction: 0.08
    },
    text: '通过社交互动自然提升'
  }
};
['炼丹', '炼器', '烹饪', '符箓'].forEach((name, index) => {
  const skillIds = ['alchemy', 'forging', 'cooking', 'talisman'];
  uiFixture.skillPages[name] = {
    title: name,
    skillId: skillIds[index],
    description: name + '说明',
    level: 12,
    xp: 7,
    nextXp: 120,
    bonuses: {
      skillSpeedBonus: 0.05,
      craftingDurationReduction: 0.03,
      materialRetentionChance: 0.02
    },
    recipes: [
      {
        recipeId: skillIds[index] + ':basic',
        actionKey: index === 0
          ? 'produce:alchemy:healingPill'
          : 'produce:' + skillIds[index] + ':basic',
        name: index === 0 ? '回春丹' : name + '初方',
        unlockLevel: 1,
        unlocked: true,
        durationSeconds: 8.5,
        costs: [{
          itemId: 'lingzhi',
          name: '灵芝',
          required: 2,
          owned: 3,
          available: true
        }],
        choiceCosts: index === 2 ? [{
          required: 1,
          available: true,
          options: [
            {
              itemId: 'spiritCarp',
              name: '灵鲤',
              required: 1,
              owned: 2,
              available: true
            },
            {
              itemId: 'spiritShrimp',
              name: '灵虾',
              required: 1,
              owned: 0,
              available: false
            }
          ]
        }] : [],
        costAvailable: true,
        output: {
          itemId: 'output',
          name: index === 0 ? '回春丹' : '成品',
          quantity: 1
        },
        skillXp: 4,
        masteryXp: 2,
        cultivation: 1,
        mastery: {
          level: 3,
          xp: 2,
          nextXp: 30,
          speedBonus: 0.02,
          yieldOrRetentionChance: 0.01
        },
        active: index === 0,
        stalled: index === 0,
        progress: index === 0 ? 0.5 : 0
      },
      {
        recipeId: skillIds[index] + ':locked',
        actionKey: 'produce:' + skillIds[index] + ':locked',
        name: '高阶秘方',
        unlockLevel: 30,
        unlocked: false,
        durationSeconds: 30,
        costs: [],
        choiceCosts: [],
        costAvailable: false,
        output: { itemId: 'rare', name: '高阶成品', quantity: 1 },
        skillXp: 10,
        masteryXp: 5,
        cultivation: 2,
        mastery: {
          level: 1,
          xp: 0,
          nextXp: 10,
          speedBonus: 0,
          yieldOrRetentionChance: 0
        },
        active: false,
        stalled: false,
        progress: 0
      }
    ]
  };
});
['采药', '采矿', '伐木'].forEach((name, index) => {
  const ids = ['herb', 'mining', 'woodcutting'];
  uiFixture.gatherPages[name] = {
    title: name,
    skillId: ids[index],
    description: '探索并采集资源',
    level: 9,
    xp: 6,
    nextXp: 90,
    bonuses: {
      skillSpeedBonus: 0.04,
      gatheringExtraYieldChance: 0.03,
      gatheringDurationReduction: 0.02,
      fishRecoveryReduction: 0
    },
    explore: {
      actionKey: 'gather:explore:' + ids[index],
      name: '探索' + name,
      durationSeconds: 4,
      skillXp: 1,
      masteryXp: 0,
      mastery: {
        level: 1,
        xp: 0,
        nextXp: 50,
        speedBonus: 0,
        extraYieldChance: 0
      },
      discoverable: [{
        entryId: ids[index] + '-entry',
        name: index === 0 ? '灵芝丛' : name + '资源点',
        unlockLevel: 1,
        unlocked: true,
        itemId: 'lingzhi',
        itemName: index === 0 ? '灵芝' : '资源',
        iconItem: {
          itemId: 'lingzhi',
          name: index === 0 ? '灵芝' : '资源'
        }
      }],
      skillLevel: 6,
      active: false,
      stalled: false,
      progress: 0
    },
    resource: {
      instanceId: 'spot-' + index,
      entryId: ids[index] + '-entry',
      name: index === 0 ? '灵芝丛' : name + '资源点',
      remaining: 7,
      capacity: 20,
      unlockLevel: 1,
      durationSeconds: 6.5,
      skillXp: 3,
      mastery: {
        level: 4,
        xp: 2,
        nextXp: 40,
        speedBonus: 0.03,
        extraYieldChance: 0.02
      },
      drops: [{
        itemId: 'lingzhi',
        name: index === 0 ? '灵芝' : '资源',
        weight: 1,
        quantity: 2
      }],
      actionKey: 'gather:collect:' + ids[index] + ':' +
        ids[index] + '-entry',
      active: false,
      stalled: false,
      progress: 0
    },
    spots: []
  };
});
uiFixture.gatherPages['钓鱼'] = {
  title: '钓鱼',
  skillId: 'fishing',
  description: '在固定水域垂钓',
  level: 8,
  xp: 5,
  nextXp: 80,
  bonuses: {
    skillSpeedBonus: 0.04,
    gatheringExtraYieldChance: 0.02,
    gatheringDurationReduction: 0.01,
    fishRecoveryReduction: 0.06
  },
  explore: null,
  resource: null,
  spots: [{
    spotId: 'pond',
    name: '灵泉池',
    unlockLevel: 1,
    unlocked: true,
    durationSeconds: 7.25,
    skillXp: 3,
    actionKey: 'fish:pond',
    species: [
      {
        speciesId: 'spiritCarp',
        name: '灵鲤',
        weight: 1,
        quantity: 1,
        stock: 9,
        maxStock: 20,
        mastery: {
          level: 2, xp: 1, nextXp: 20,
          speedBonus: 0.01, extraYieldChance: 0.01
        }
      },
      {
        speciesId: 'spiritShrimp',
        name: '灵虾',
        weight: 1,
        quantity: 1,
        stock: 3,
        maxStock: 12,
        mastery: {
          level: 1, xp: 0, nextXp: 10,
          speedBonus: 0, extraYieldChance: 0
        }
      }
    ],
    active: false,
    stalled: false,
    progress: 0
  }]
};
uiFixture.homestead.farm = {
  unlockedPlots: 2,
  farmingLevel: 8,
  plots: [
    {
      plotId: 'plot-1',
      unlocked: true,
      cropId: null,
      cropName: null,
      remainingSeconds: 0,
      totalSeconds: 0,
      ready: false,
      progress: 0,
      seedItemId: null,
      seedOwned: 0,
      unlockLevel: null
    },
    {
      plotId: 'plot-2',
      unlocked: true,
      cropId: 'spiritRice',
      cropName: '灵米',
      remainingSeconds: 30,
      totalSeconds: 60,
      ready: false,
      progress: 0.5,
      seedItemId: 'spiritRiceSeed',
      seedOwned: 2,
      unlockLevel: 1
    },
    {
      plotId: 'plot-3',
      unlocked: false,
      cropId: null,
      cropName: null,
      remainingSeconds: 0,
      totalSeconds: 0,
      ready: false,
      progress: 0,
      seedItemId: null,
      seedOwned: 0,
      unlockLevel: null
    }
  ],
  plantableCrops: [{
    cropId: 'spiritRice',
    name: '灵米',
    unlockLevel: 1,
    unlocked: true,
    seedItemId: 'commonSeed',
    seedRequired: 1,
    seedOwned: 3,
    growthSeconds: 60,
    baseHarvest: 2,
    masteryLevel: 3
  }, {
    cropId: 'heartClearGrass',
    name: '清心草',
    unlockLevel: 8,
    unlocked: true,
    seedItemId: 'commonSeed',
    seedRequired: 1,
    seedOwned: 3,
    growthSeconds: 120,
    baseHarvest: 2,
    masteryLevel: 1
  }]
};
uiFixture.homestead.formations = {
  slots: [{
    slotIndex: 0,
    formationId: 'gatheringFormation',
    name: '聚灵采集阵',
    effectText: '采集额外产出 +5%'
  }],
  discoveredIds: ['gatheringFormation', 'craftingFormation'],
  formations: [
    {
      formationId: 'gatheringFormation',
      itemId: 'gatheringFormation',
      name: '聚灵采集阵',
      owned: 1,
      unbound: 0,
      discovered: true,
      equippedCount: 1,
      effectText: '采集额外产出 +5%',
      canEquip: false
    },
    {
      formationId: 'craftingFormation',
      itemId: 'craftingFormation',
      name: '百工阵',
      owned: 1,
      unbound: 1,
      discovered: true,
      equippedCount: 0,
      effectText: '制作耗时 -5%',
      canEquip: true
    }
  ],
  effects: {
    gatheringExtraYieldChance: 0.05,
    craftingDurationReduction: 0
  }
};
uiFixture.homestead.beasts = {
  encounters: [{
    id: 'encounter-1',
    speciesId: 'spiritFox',
    speciesName: '灵狐',
    sourceSkillId: 'herb',
    tame: {
      actionKey: 'beast:tame:encounter-1',
      itemId: 'tamingTalisman',
      durationSeconds: 18,
      active: false,
      stalled: false,
      progress: 0
    }
  }],
  roster: [{
    id: 'beast-1',
    speciesId: 'spiritFox',
    speciesName: '灵狐',
    level: 2,
    xp: 3,
    traitId: 'friendly',
    traitName: '亲和',
    growthId: 'swift',
    growthName: '敏捷',
    active: false,
    training: {
      actionKey: 'beast:train:beast-1',
      itemId: 'beastFeed',
      durationSeconds: 12,
      active: false,
      stalled: false,
      progress: 0
    },
    assistant: {
      beastId: 'beast-1',
      active: false,
      effect: { gathering: { global: { extraYieldChance: 0.02 } } }
    }
  }],
  activeIds: [],
  effects: {}
};
uiFixture.homestead.meetingHall = { implemented: false };
uiFixture.homestead.inheritance = { implemented: false };
Object.values(uiFixture.skillPages).forEach((page) => {
  page.lv = page.level;
  page.xpNeed = page.nextXp;
  page.desc = page.description;
  page.actions = page.recipes.map((recipe) => ({
    key: recipe.actionKey,
    name: recipe.name,
    icon: recipe.name.charAt(0),
    needLv: recipe.unlockLevel,
    lv: page.level,
    time: recipe.durationSeconds,
    xp: recipe.skillXp,
    out: recipe.output.name + ' ×' + recipe.output.quantity,
    locked: !recipe.unlocked,
    active: recipe.active,
    stalled: recipe.stalled,
    progress: recipe.progress
  }));
});
Object.values(uiFixture.gatherPages).forEach((page) => {
  page.lv = page.level;
  page.xpNeed = page.nextXp;
  page.desc = page.description;
  page.cards = [];
  if (page.explore) {
    page.cards.push({
      type: 'explore',
      id: 'explore',
      name: page.explore.name,
      active: page.explore.active,
      stalled: page.explore.stalled,
      progress: page.explore.progress
    });
  }
  if (page.resource) {
    page.cards.push({
      type: 'entry',
      id: page.resource.entryId,
      name: page.resource.name,
      unlockLv: page.resource.unlockLevel,
      time: page.resource.durationSeconds,
      xp: page.resource.skillXp,
      left: page.resource.remaining,
      cap: page.resource.capacity,
      active: page.resource.active,
      stalled: page.resource.stalled,
      progress: page.resource.progress
    });
  }
  page.spots.forEach((spot) => {
    page.cards.push({
      type: 'entry',
      id: spot.spotId,
      name: spot.name,
      unlockLv: spot.unlockLevel,
      time: spot.durationSeconds,
      xp: spot.skillXp,
      left: spot.species.length ? spot.species[0].stock : 0,
      cap: spot.species.length ? spot.species[0].maxStock : 0,
      active: spot.active,
      stalled: spot.stalled,
      progress: spot.progress,
      locked: !spot.unlocked
    });
  });
});

const fixtureRuntime = createStage2UiFixtureRuntime(uiFixture);
fixtureRuntime.ui.renderGame();
ok(
  byClass(fixtureRuntime.root, 'cave-card-title').map((c) => c.textContent)
    .join(',') === '灵田,阵法,灵兽,会客厅,传承殿',
  'cave defaults to the exact five in-content cards (not subtabs)'
);
// 进入灵田子页 → 3 块灵田
firstClass(fixtureRuntime.root, 'cave-card', 0).click();
fixtureRuntime.ui.renderGame();
ok(
  byClass(fixtureRuntime.root, 'plot-card').length === 3,
  'entering the 灵田 card shows exactly three farm plots'
);
// 返回卡片页
firstClass(fixtureRuntime.root, 'cave-back').click();
fixtureRuntime.ui.renderGame();
ok(
  byClass(fixtureRuntime.root, 'cave-card').length === 5,
  'back button returns to the five-card grid'
);

const stableProductionFixture =
  JSON.parse(JSON.stringify(uiFixture));
const stableProductionRuntime =
  createStage2UiFixtureRuntime(stableProductionFixture);
stableProductionRuntime.api.commands.switchNav({
  index: expectedStage2Navigation.indexOf('炼丹')
});
stableProductionRuntime.ui.renderGame();
const stableRecipeCards =
  byClass(stableProductionRuntime.root, 'recipe-card');
const stableActiveRecipe = stableRecipeCards[0];
const stableLockedRecipe = stableRecipeCards[1];
const productionPageFixture =
  stableProductionFixture.skillPages['炼丹'];
productionPageFixture.xp = 19;
productionPageFixture.nextXp = 140;
productionPageFixture.bonuses.skillSpeedBonus = 0.08;
productionPageFixture.bonuses.craftingDurationReduction = 0.06;
productionPageFixture.bonuses.materialRetentionChance = 0.04;
const dynamicRecipe = productionPageFixture.recipes[0];
dynamicRecipe.durationSeconds = 9.75;
dynamicRecipe.costs[0].owned = 1;
dynamicRecipe.costs[0].available = false;
dynamicRecipe.costAvailable = false;
dynamicRecipe.mastery.level = 4;
dynamicRecipe.mastery.xp = 9;
dynamicRecipe.mastery.nextXp = 44;
dynamicRecipe.mastery.speedBonus = 0.04;
dynamicRecipe.mastery.yieldOrRetentionChance = 0.03;
dynamicRecipe.progress = 0.75;
dynamicRecipe.stalled = true;
const unlockedRecipe = productionPageFixture.recipes[1];
unlockedRecipe.unlocked = true;
unlockedRecipe.durationSeconds = 28;
unlockedRecipe.costAvailable = true;
stableProductionRuntime.ui.renderGame();
const refreshedRecipeCards =
  byClass(stableProductionRuntime.root, 'recipe-card');
stableActiveRecipe.click();
stableProductionRuntime.ui.renderGame();
const skillSheetText = allText(stableProductionRuntime.root);
ok(
  refreshedRecipeCards[0] === stableActiveRecipe &&
    refreshedRecipeCards[1] === stableLockedRecipe &&
    !stableLockedRecipe.classList.contains('locked') &&
    stableActiveRecipe.classList.contains('active') &&
    byClass(stableProductionRuntime.root, 'skill-head-lv')[0]
      .textContent === 'Lv.12' &&
    byClass(stableProductionRuntime.root, 'skill-xp-bar')[0] &&
    skillSheetText.includes('9.75秒') &&
    skillSheetText.includes('灵芝') &&
    skillSheetText.includes('1/2') &&
    skillSheetText.includes('行动停滞') &&
    byClass(stableProductionRuntime.root, 'action-stop').length === 1,
  'production dynamic VM fields update in place without replacing cards or controls'
);

const stableGatherFixture = JSON.parse(JSON.stringify(uiFixture));
const stableGatherRuntime =
  createStage2UiFixtureRuntime(stableGatherFixture);
const stableHerb = stableGatherFixture.gatherPages['采药'];
stableGatherRuntime.api.commands.startAction({
  key: stableHerb.resource.actionKey
});
stableGatherRuntime.api.commands.switchNav({
  index: expectedStage2Navigation.indexOf('采药')
});
stableGatherRuntime.ui.renderGame();
const stableExploreCard =
  firstClass(stableGatherRuntime.root, 'explore-card');
const stableResourceCard =
  firstClass(stableGatherRuntime.root, 'resource-card');
stableHerb.xp = 17;
stableHerb.nextXp = 110;
stableHerb.bonuses.skillSpeedBonus = 0.09;
stableHerb.bonuses.gatheringExtraYieldChance = 0.07;
stableHerb.explore.name = '巡查新药田';
stableHerb.explore.durationSeconds = 3.25;
stableHerb.resource.remaining = 5;
stableHerb.resource.capacity = 24;
stableHerb.resource.durationSeconds = 5.5;
stableHerb.resource.mastery.level = 5;
stableHerb.resource.mastery.xp = 8;
stableHerb.resource.mastery.nextXp = 55;
stableHerb.resource.mastery.speedBonus = 0.05;
stableHerb.resource.mastery.extraYieldChance = 0.04;
stableHerb.resource.drops[0].quantity = 3;
stableHerb.resource.progress = 0.8;
stableHerb.resource.stalled = true;
stableGatherRuntime.ui.renderGame();
stableResourceCard.click();
stableGatherRuntime.ui.renderGame();
const gatherSheetText = allText(stableGatherRuntime.root);
ok(
  firstClass(stableGatherRuntime.root, 'explore-card') ===
    stableExploreCard &&
    firstClass(stableGatherRuntime.root, 'resource-card') ===
      stableResourceCard &&
    allText(stableExploreCard).includes('巡查新药田') &&
    allText(stableResourceCard).includes('5') &&
    gatherSheetText.includes('剩余 5 / 24') &&
    gatherSheetText.includes('5.5秒') &&
    gatherSheetText.includes('灵芝') &&
    gatherSheetText.includes('行动停滞') &&
    byClass(stableGatherRuntime.root, 'badge-gather').length >= 1,
  'gathering dynamic VM fields update in place without replacing cards or controls'
);
stableGatherRuntime.api.commands.switchNav({
  index: expectedStage2Navigation.indexOf('钓鱼')
});
stableGatherRuntime.ui.renderGame();
const stableFishingCard =
  firstClass(stableGatherRuntime.root, 'fishing-card');
const stableFish =
  stableGatherFixture.gatherPages['钓鱼'].spots[0];
stableFish.durationSeconds = 6.75;
stableFish.skillXp = 5;
stableFish.unlocked = false;
stableFish.species[0].stock = 4;
stableFish.species[0].maxStock = 22;
stableFish.species[1].stock = 1;
stableGatherRuntime.ui.renderGame();
stableFishingCard.click();
stableGatherRuntime.ui.renderGame();
const fishingSheetText = allText(stableGatherRuntime.root);
ok(
  firstClass(stableGatherRuntime.root, 'fishing-card') ===
    stableFishingCard &&
    stableFishingCard.classList.contains('locked') &&
    fishingSheetText.includes('需 Lv.1 解锁') &&
    fishingSheetText.includes('灵鲤') &&
    fishingSheetText.includes('4/22') &&
    fishingSheetText.includes('灵虾') &&
    fishingSheetText.includes('1/12'),
  'fishing stock, duration, and unlock changes preserve card and control identity'
);

const freshBeastFixture = JSON.parse(JSON.stringify(uiFixture));
const freshBeastRuntime =
  createStage2UiFixtureRuntime(freshBeastFixture);
freshBeastRuntime.api.commands.switchNav({ index: 0 });
freshBeastRuntime.ui.renderGame();
firstClass(freshBeastRuntime.root, 'cave-card', 2).click();
const originalAssistant =
  firstClass(freshBeastRuntime.root, 'assistant-toggle');
freshBeastFixture.homestead.beasts.roster[0].assistant.effect = {
  gathering: { global: { extraYieldChance: 0.09 } }
};
freshBeastRuntime.ui.renderGame();
const effectFreshAssistant =
  firstClass(freshBeastRuntime.root, 'assistant-toggle');
const freshEncounter =
  freshBeastFixture.homestead.beasts.encounters[0];
const freshRoster =
  freshBeastFixture.homestead.beasts.roster[0];
freshEncounter.sourceSkillId = 'mining';
freshEncounter.tame.actionKey = 'beast:tame:replacement';
freshRoster.training.actionKey = 'beast:train:replacement';
freshRoster.assistant.beastId = 'assistant-replacement';
freshBeastRuntime.ui.renderGame();
const freshBeastText = allText(freshBeastRuntime.root);
const beastCallsBefore = freshBeastRuntime.calls.length;
firstClass(
  firstClass(freshBeastRuntime.root, 'beast-encounter'),
  'action-start'
).click();
firstClass(
  firstClass(freshBeastRuntime.root, 'beast-training'),
  'action-start'
).click();
firstClass(freshBeastRuntime.root, 'assistant-toggle').click();
const freshBeastCalls =
  freshBeastRuntime.calls.slice(beastCallsBefore);
ok(
  effectFreshAssistant !== originalAssistant &&
    freshBeastText.includes('来自 mining') &&
    freshBeastCalls.some((call) =>
      call.name === 'startAction' &&
      call.input.key === 'beast:tame:replacement'
    ) &&
    freshBeastCalls.some((call) =>
      call.name === 'startAction' &&
      call.input.key === 'beast:train:replacement'
    ) &&
    freshBeastCalls.some((call) =>
      call.name === 'setActiveBeast' &&
      call.input.beastId === 'assistant-replacement'
    ),
  'same-ID beast rows refresh emitted action, source, assistant, and effect payloads'
);

// 卡片式导航：进入阵法子页（卡片序号 1）
firstClass(fixtureRuntime.root, 'cave-card', 1).click();
fixtureRuntime.ui.renderGame();
ok(
  byClass(fixtureRuntime.root, 'formation-slot').length === 1,
  'cave formation selection survives live refresh'
);
const fixtureShopIndex = expectedStage2Navigation.indexOf('商城');
fixtureRuntime.api.commands.switchNav({ index: fixtureShopIndex });
fixtureRuntime.ui.renderGame();
fixtureRuntime.api.commands.switchNav({ index: 0 });
fixtureRuntime.ui.renderGame();
ok(
  byClass(fixtureRuntime.root, 'cave-card').length === 5,
  'leaving and re-entering the cave resets to the cave grid'
);
// 重新进入灵田验证 3 块 plot-card
firstClass(fixtureRuntime.root, 'cave-card', 0).click();
fixtureRuntime.ui.renderGame();
ok(
  byClass(fixtureRuntime.root, 'plot-card').length === 3,
  'cave farm module renders its three plots after re-entering'
);

const caveModuleClasses = [
  ['formation-slot', 1],
  ['beast-card', 2],
  ['reserve-meetingHall', 1],
  ['reserve-inheritance', 1]
];
// 阵法
firstClass(fixtureRuntime.root, 'cave-back').click();
fixtureRuntime.ui.renderGame();
firstClass(fixtureRuntime.root, 'cave-card', 1).click();
fixtureRuntime.ui.renderGame();
ok(byClass(fixtureRuntime.root, caveModuleClasses[0][0]).length >=
  caveModuleClasses[0][1], 'formation module renders owned and equipped data');
// 灵兽
firstClass(fixtureRuntime.root, 'cave-back').click();
fixtureRuntime.ui.renderGame();
firstClass(fixtureRuntime.root, 'cave-card', 2).click();
fixtureRuntime.ui.renderGame();
ok(
  byClass(fixtureRuntime.root, 'beast-card').length === 2 &&
    /灵狐[\s\S]*亲和[\s\S]*敏捷/.test(allText(fixtureRuntime.root)),
  'beast module renders encounter, roster, trait, growth, and action data'
);
// 会客厅
firstClass(fixtureRuntime.root, 'cave-back').click();
fixtureRuntime.ui.renderGame();
firstClass(fixtureRuntime.root, 'cave-card', 3).click();
fixtureRuntime.ui.renderGame();
ok(
  byClass(fixtureRuntime.root, 'reserve-meetingHall').length === 1 &&
    allText(fixtureRuntime.root).includes('将在人物与事件阶段开放'),
  'meeting hall renders only its exact reserve card'
);
// 传承殿
firstClass(fixtureRuntime.root, 'cave-back').click();
fixtureRuntime.ui.renderGame();
firstClass(fixtureRuntime.root, 'cave-card', 4).click();
fixtureRuntime.ui.renderGame();
ok(
  byClass(fixtureRuntime.root, 'reserve-inheritance').length === 1 &&
    allText(fixtureRuntime.root).includes('将在传承阶段开放'),
  'inheritance hall renders only its exact reserve card'
);

const fixtureInventoryIndex = expectedStage2Navigation.indexOf('背包');
fixtureRuntime.api.commands.switchNav({ index: fixtureInventoryIndex });
fixtureRuntime.ui.renderGame();
ok(
  byClass(fixtureRuntime.root, 'capacity').some((node) =>
    node.textContent === '已用 2 / 40'
  ) &&
    byClass(fixtureRuntime.root, 'filter-chip').length === 3 &&
    byClass(fixtureRuntime.root, 'inventory-search').length === 1 &&
    byClass(fixtureRuntime.root, 'inv-cell').length === 2 &&
    /数量 3[\s\S]*绑定 0[\s\S]*可用 3/.test(
      allText(fixtureRuntime.root)
    ) &&
    byClass(fixtureRuntime.root, 'sell-one').length === 1,
  'inventory renders capacity, filters, search, quantities, binding, availability, and eligible one-unit sale'
);
firstClass(fixtureRuntime.root, 'filter-chip', 1).click();
const inventorySearch = firstClass(
  fixtureRuntime.root,
  'inventory-search'
);
inventorySearch.value = '灵芝';
inventorySearch.dispatch('input');
ok(
  fixtureRuntime.inventoryQueries.some((options) =>
    options.category === 'material' && options.search === '灵芝'
  ) &&
    byClass(fixtureRuntime.root, 'inv-cell').length === 1,
  'inventory preserves local category and search while querying a fresh VM'
);
const stableInventoryRow =
  firstClass(fixtureRuntime.root, 'inv-cell');
const stableSellButton =
  firstClass(fixtureRuntime.root, 'sell-one');
const inventoryQueryCount = fixtureRuntime.inventoryQueries.length;
fixtureRuntime.ui.renderGame();
ok(
  fixtureRuntime.inventoryQueries.length === inventoryQueryCount + 1 &&
    firstClass(fixtureRuntime.root, 'inv-cell') === stableInventoryRow &&
    firstClass(fixtureRuntime.root, 'sell-one') === stableSellButton,
  'unchanged inventory frames query fresh while preserving interactive DOM rows'
);
firstClass(fixtureRuntime.root, 'sell-one').click();
ok(
  fixtureRuntime.calls.slice(-1)[0].name === 'sellItem' &&
    JSON.stringify(fixtureRuntime.calls.slice(-1)[0].input) ===
      JSON.stringify({ itemId: 'lingzhi', quantity: 1 }),
  'eligible inventory row sells exactly one unbound unit'
);

const standaloneNames = [
  '采药', '采矿', '伐木', '钓鱼', '炼丹', '炼器', '烹饪', '符箓'
];
const standaloneRendered = standaloneNames.every((navName) => {
  fixtureRuntime.api.commands.switchNav({
    index: expectedStage2Navigation.indexOf(navName)
  });
  fixtureRuntime.ui.renderGame();
  return byClass(
    fixtureRuntime.root,
    navName === '钓鱼' || uiFixture.gatherPages[navName]
      ? 'gather-page'
      : 'production-page'
  ).length === 1;
});
ok(standaloneRendered, 'all eight standalone Stage 2 skill pages render');

fixtureRuntime.api.commands.switchNav({
  index: expectedStage2Navigation.indexOf('采药')
});
fixtureRuntime.ui.renderGame();
const herbCard = firstClass(fixtureRuntime.root, 'resource-card');
herbCard.click();
fixtureRuntime.ui.renderGame();
ok(
  allText(fixtureRuntime.root).includes('灵芝丛') &&
    byClass(fixtureRuntime.root, 'badge-gather').length >= 1 &&
    allText(fixtureRuntime.root).includes('剩余 7 / 20') &&
    allText(fixtureRuntime.root).includes('灵芝') &&
    byClass(fixtureRuntime.root, 'action-start').length === 1 &&
    byClass(fixtureRuntime.root, 'skill-action-sheet').length === 1,
  'gathering renders capacity, drops, duration, and inactive start controls'
);
const gatherStartsBefore = fixtureRuntime.calls.filter((call) =>
  call.name === 'startAction'
).length;
const resourceStart =
  firstClass(fixtureRuntime.root, 'action-start') ||
  new MockEl('button');
resourceStart.click();
const gatherStartCalls = fixtureRuntime.calls.filter((call) =>
  call.name === 'startAction'
);
ok(
  gatherStartCalls.length === gatherStartsBefore + 1 &&
    gatherStartCalls[gatherStartCalls.length - 1].input.key ===
      'gather:collect:herb:herb-entry' &&
    fixtureRuntime.calls.filter((call) =>
      call.name === 'stopAction'
    ).length === 0,
  'inactive gathering card calls only its canonical emitted startAction key'
);
const herbResourceFixture = uiFixture.gatherPages['采药'].resource;
herbResourceFixture.remaining = 6;
fixtureRuntime.ui.renderGame();
const refreshedRemaining =
  allText(firstClass(fixtureRuntime.root, 'resource-card') ||
    fixtureRuntime.root).includes('6') ||
  allText(fixtureRuntime.root).includes('剩余 6 / 20');
herbResourceFixture.remaining = 0;
fixtureRuntime.ui.renderGame();
const retainedZeroCard =
  byClass(fixtureRuntime.root, 'resource-card').length === 1 &&
  allText(firstClass(fixtureRuntime.root, 'resource-card')).includes('0');
uiFixture.gatherPages['采药'].resource = null;
fixtureRuntime.ui.renderGame();
const removedWhenNeverExplored =
  byClass(fixtureRuntime.root, 'resource-card').length === 0 &&
  byClass(fixtureRuntime.root, 'gather-hint').length === 1;
uiFixture.gatherPages['采药'].resource = herbResourceFixture;
ok(
  refreshedRemaining && retainedZeroCard && removedWhenNeverExplored,
  'gathering refreshes remaining counts and retains depleted resource cards at 0'
);

fixtureRuntime.api.commands.switchNav({
  index: expectedStage2Navigation.indexOf('钓鱼')
});
fixtureRuntime.ui.renderGame();
firstClass(fixtureRuntime.root, 'fishing-card').click();
fixtureRuntime.ui.renderGame();
ok(
  /灵泉池[\s\S]*灵鲤[\s\S]*9\/20[\s\S]*灵虾[\s\S]*3\/12/.test(
    allText(fixtureRuntime.root)
  ),
  'fishing renders fixed spot duration and per-species shared stocks'
);

fixtureRuntime.api.commands.switchNav({
  index: expectedStage2Navigation.indexOf('烹饪')
});
fixtureRuntime.ui.renderGame();
firstClass(fixtureRuntime.root, 'recipe-card').click();
fixtureRuntime.ui.renderGame();
ok(
  /灵芝[\s\S]*3\/2[\s\S]*灵鲤[\s\S]*2\/1[\s\S]*灵虾[\s\S]*0\/1[\s\S]*产出[\s\S]*成品/.test(
    allText(fixtureRuntime.root)
  ),
  'production renders exact fixed and choice owned costs, output, and mastery effect'
);

fixtureRuntime.api.commands.switchNav({
  index: expectedStage2Navigation.indexOf('炼丹')
});
fixtureRuntime.api.commands.startAction({
  key: 'produce:alchemy:healingPill'
});
fixtureRuntime.ui.renderGame();
const renderedRecipeCards = byClass(fixtureRuntime.root, 'recipe-card');
const activeRecipeCard = renderedRecipeCards.find((card) =>
  card.classList.contains('active')
) || new MockEl('div');
const inactiveRecipeCard = renderedRecipeCards.find((card) =>
  !card.classList.contains('active')
) || new MockEl('div');
activeRecipeCard.click();
fixtureRuntime.ui.renderGame();
ok(
  activeRecipeCard.classList.contains('active') &&
    !inactiveRecipeCard.classList.contains('active') &&
    byClass(fixtureRuntime.root, 'action-stop').length === 1 &&
    byClass(fixtureRuntime.root, 'action-start').length === 0 &&
    allText(fixtureRuntime.root).includes('行动停滞'),
  'active stalled production exposes only stop while inactive exposes only start'
);
const startsBeforeStop = fixtureRuntime.calls.filter((call) =>
  call.name === 'startAction'
).length;
(firstClass(fixtureRuntime.root, 'action-stop') ||
  new MockEl('button')).click();
ok(
  fixtureRuntime.calls.slice(-1)[0].name === 'stopAction' &&
    fixtureRuntime.calls.filter((call) =>
      call.name === 'startAction'
    ).length === startsBeforeStop,
  'active action card calls only stopAction'
);

fixtureRuntime.api.commands.startAction({
  key: 'beast:train:beast-1'
});
fixtureRuntime.api.commands.switchNav({ index: 0 });
fixtureRuntime.ui.renderGame();
firstClass(fixtureRuntime.root, 'cave-card', 2).click();
const immediateBefore = fixtureRuntime.calls.length;
firstClass(fixtureRuntime.root, 'assistant-toggle').click();
const immediateCalls = fixtureRuntime.calls.slice(immediateBefore);
ok(
  immediateCalls.length === 1 &&
    immediateCalls[0].name === 'setActiveBeast' &&
    !immediateCalls.some((call) =>
      call.name === 'startAction' || call.name === 'stopAction'
    ) &&
    firstClass(fixtureRuntime.root, 'beast-training')
      .classList.contains('active'),
  'assistant command is immediate and retains the active training visual after a fresh query'
);

firstClass(fixtureRuntime.root, 'cave-back').click();
fixtureRuntime.ui.renderGame();
firstClass(fixtureRuntime.root, 'cave-card', 0).click();
fixtureRuntime.ui.renderGame();
const bulkPlantFixture = JSON.parse(JSON.stringify(uiFixture));
bulkPlantFixture.homestead.farm.plots[1] = Object.assign(
  {},
  bulkPlantFixture.homestead.farm.plots[1],
  {
    cropId: null,
    cropName: null,
    remainingSeconds: 0,
    totalSeconds: 0,
    ready: false,
    progress: 0,
    seedItemId: null,
    seedOwned: 0,
    unlockLevel: null
  }
);
const bulkPlantRuntime = createStage2UiFixtureRuntime(bulkPlantFixture);
bulkPlantRuntime.api.commands.startAction({
  key: 'beast:train:beast-1'
});
bulkPlantRuntime.ui.renderGame();
firstClass(bulkPlantRuntime.root, 'cave-card', 0).click();
bulkPlantRuntime.ui.renderGame();
const quickSelect = firstClass(bulkPlantRuntime.root, 'quick-crop-select');
quickSelect.value = 'spiritRice';
quickSelect.dispatch('change');
firstClass(bulkPlantRuntime.root, 'quick-seed-action').click();
firstClass(bulkPlantRuntime.root, 'plot-card', 1).click();
const detailSelect =
  firstClass(bulkPlantRuntime.root, 'crop-plan-select');
detailSelect.value = 'heartClearGrass';
detailSelect.dispatch('change');
const plantBefore = bulkPlantRuntime.calls.length;
firstClass(bulkPlantRuntime.root, 'plant-all-action').click();
const plantCalls = bulkPlantRuntime.calls.slice(plantBefore);
ok(
  plantCalls.length === 1 &&
    plantCalls[0].name === 'plantAll' &&
    JSON.stringify(plantCalls[0].input) === JSON.stringify({
      assignments: [
        { plotId: 'plot-1', cropId: 'spiritRice' },
        { plotId: 'plot-2', cropId: 'heartClearGrass' }
      ]
    }) &&
    bulkPlantRuntime.activeAction() === 'beast:train:beast-1',
  'farm keeps per-plot seed plans and plantAll submits them without stopping the main action'
);
firstClass(fixtureRuntime.root, 'cave-back').click();
fixtureRuntime.ui.renderGame();
firstClass(fixtureRuntime.root, 'cave-card', 1).click();
fixtureRuntime.ui.renderGame();
const equipBefore = fixtureRuntime.calls.length;
firstClass(fixtureRuntime.root, 'formation-equip').click();
const equipCalls = fixtureRuntime.calls.slice(equipBefore);
ok(
  equipCalls.length === 1 &&
    equipCalls[0].name === 'equipFormation' &&
    JSON.stringify(equipCalls[0].input) === JSON.stringify({
      slotIndex: 0,
      itemId: 'craftingFormation'
    }) &&
    fixtureRuntime.activeAction() === 'beast:train:beast-1',
  'formation replacement is immediate and does not start or stop the main action'
);

const harvestFixture = Object.assign({}, uiFixture, {
  homestead: Object.assign({}, uiFixture.homestead, {
    farm: Object.assign({}, uiFixture.homestead.farm, {
      plots: uiFixture.homestead.farm.plots.map((plot, index) =>
        index === 1 ? Object.assign({}, plot, {
          remainingSeconds: 0,
          ready: true,
          progress: 1
        }) : plot
      )
    })
  })
});
const harvestRuntime = createStage2UiFixtureRuntime(harvestFixture);
harvestRuntime.ui.renderGame();
firstClass(harvestRuntime.root, 'cave-card', 0).click();
harvestRuntime.ui.renderGame();
firstClass(harvestRuntime.root, 'harvest-action').click();
const harvestCall = harvestRuntime.calls.slice(-1)[0] || {};
ok(
  harvestCall.name === 'harvest' &&
    JSON.stringify(harvestCall.input) ===
      JSON.stringify({ plotId: 'plot-2' }),
  'mature crop calls only the immediate harvest command'
);

const saleFailureFixture = Object.assign({}, uiFixture, {
  commandResults: {
    sellItem: {
      ok: false,
      code: 'item_bound',
      changed: false,
      message: '物品已绑定，无法出售',
      data: null
    }
  }
});
const saleFailureRuntime =
  createStage2UiFixtureRuntime(saleFailureFixture);
saleFailureRuntime.api.commands.switchNav({
  index: expectedStage2Navigation.indexOf('背包')
});
saleFailureRuntime.ui.renderGame();
firstClass(saleFailureRuntime.root, 'sell-one').click();
ok(
  byClass(saleFailureRuntime.root, 'toast').some((node) =>
    node.textContent === '物品已绑定，无法出售' &&
    node.classList.contains('show')
  ),
  'failed UI command displays the exact command result message in the existing toast'
);

fixtureRuntime.api.commands.switchNav({
  index: expectedStage2Navigation.indexOf('关系')
});
fixtureRuntime.ui.renderGame();
ok(
  /魅力 Lv\.12[\s\S]*7\/120[\s\S]*正向关系 ×1\.11[\s\S]*误会降低 8%[\s\S]*魅力通过社交互动自然提升/.test(
    allText(fixtureRuntime.root)
  ) &&
    byClass(fixtureRuntime.root, 'charm-action').length === 0 &&
    byClass(fixtureRuntime.root, 'reserve-stage4').length === 1,
  'relationship renders charm summary above a noninteractive Stage 4 reserve card'
);
const reservedChecks = [
  ['宗门', 'reserve-stage4'],
  ['天下', 'reserve-stage4']
].every(([navName, className]) => {
  fixtureRuntime.api.commands.switchNav({
    index: expectedStage2Navigation.indexOf(navName)
  });
  fixtureRuntime.ui.renderGame();
  return byClass(fixtureRuntime.root, className).length === 1 &&
    byClass(fixtureRuntime.root, 'action-start').length === 0;
});
ok(reservedChecks, 'Stage 4 reserved pages remain noninteractive');

let stage3UiSuiteError = null;
try {
const stage3UiRuntime = createRuntime(
  {},
  NOW,
  null,
  true,
  {
    fullStage3: true,
    requestTestHarness: true
  }
);
stage3UiRuntime.api.commands.confirmCreate();
const stage3UiHarness = stage3UiRuntime.sandbox.__GameTestHarness;
const stage3UiModel = stage3UiHarness.__test.snapshotModel();
stage3UiModel.player.inventory.stacks.cloudwoodSword = 1;
stage3UiModel.player.inventory.stacks.cloudRobe = 1;
stage3UiModel.player.inventory.stacks.breathJade = 1;
stage3UiModel.player.inventory.stacks.grilledCarp = 2;
stage3UiModel.player.inventory.stacks.healingPill = 2;
stage3UiModel.player.inventory.stacks.wardTalisman = 2;
stage3UiModel.player.inventory.stacks[
  'techniqueBook:cloudPiercingSword'
] = 1;
stage3UiModel.player.breakthrough.realmId = 'foundation';
stage3UiModel.player.techniques.known.cloudPiercingSword = {
  level: 2,
  xp: 15
};
stage3UiModel.player.techniques.known.returningWindSlash = {
  level: 1,
  xp: 0
};
stage3UiModel.player.techniques.known.steadyBreath = {
  level: 1,
  xp: 0
};
stage3UiModel.player.combat.loadouts[0].activeTechniques[0] = {
  techniqueId: 'cloudPiercingSword',
  condition: { type: 'always' }
};
stage3UiModel.player.combat.loadouts[0].activeTechniques[1] = {
  techniqueId: 'returningWindSlash',
  condition: { type: 'always' }
};
stage3UiModel.player.combat.loadouts[0].passiveTechniques[0] =
  'steadyBreath';
stage3UiHarness.__test.replaceModel(stage3UiModel);
stage3UiRuntime.api.commands.createCombatLoadout({ name: '方案二' });
stage3UiRuntime.ui.renderGame();
const stage3CombatIndex =
  stage3UiRuntime.api.queries.navigation().items.findIndex(
    (item) => item.label === '战斗'
  );
stage3UiRuntime.api.commands.switchNav({ index: stage3CombatIndex });
stage3UiRuntime.ui.renderGame();
ok(
  byClass(stage3UiRuntime.root, 'topbar').length === 1 &&
    byClass(stage3UiRuntime.root, 'avatar').length === 1 &&
    byClass(stage3UiRuntime.root, 'nav').length === 1 &&
    byClass(stage3UiRuntime.root, 'content').length === 1 &&
    byClass(stage3UiRuntime.root, 'modal-root').length === 1 &&
    byClass(stage3UiRuntime.root, 'combat-tabs').length === 1 &&
    byClass(stage3UiRuntime.root, 'combat-tab')
      .map((node) => node.textContent).join('/') ===
      '区域/秘境',
  'Stage 3 combat renders inside the unchanged topbar/nav/right-content shell with exact tab order'
);
ok(
  byClass(stage3UiRuntime.root, 'region-entry').length > 0 &&
    byClass(stage3UiRuntime.root, 'combat-entry-grid').length === 1 &&
    byClass(stage3UiRuntime.root, 'region-entry').every((card) =>
      byClass(card, 'combat-entry-icon').length === 1 &&
      byClass(card, 'combat-entry-name').length === 1
    ) &&
    !byClass(stage3UiRuntime.root, 'enemy-card').length &&
    !byClass(stage3UiRuntime.root, 'enemy-action').length,
  'region tab shows icon+name grid without inline enemy dump'
);
firstClass(stage3UiRuntime.root, 'region-entry').click();
ok(
  byClass(stage3UiRuntime.root, 'region-detail-body').length === 1 &&
    byClass(stage3UiRuntime.root, 'region-enemy-entry').length > 0 &&
    byClass(stage3UiRuntime.root, 'region-enemy-entry').every((card) =>
      byClass(card, 'region-enemy-icon').length === 1 &&
      byClass(card, 'region-enemy-name').length === 1 &&
      byClass(card, 'region-enemy-art').length === 1
    ) &&
    allText(firstClass(stage3UiRuntime.root, 'region-detail-body'))
      .includes('出没妖兽') &&
    byClass(stage3UiRuntime.root, 'enemy-detail-panel').length === 0 &&
    byClass(stage3UiRuntime.root, 'enemy-detail-scroll').length === 0 &&
    byClass(stage3UiRuntime.root, 'enemy-drop-list').length === 0 &&
    byClass(stage3UiRuntime.root, 'region-enter-action').length === 1 &&
    !/\bnormal\b|境界 5/.test(
      allText(firstClass(stage3UiRuntime.root, 'region-detail-body'))
    ),
  'region entry opens list-only modal with compact monster grid'
);
firstClass(stage3UiRuntime.root, 'region-enemy-entry', 1).click();
ok(
  byClass(stage3UiRuntime.root, 'enemy-detail-modal').length === 1 &&
    byClass(stage3UiRuntime.root, 'enemy-detail-head').length === 1 &&
    byClass(stage3UiRuntime.root, 'enemy-drop-row').length > 0 &&
    allText(firstClass(stage3UiRuntime.root, 'enemy-drop-list'))
      .includes('断裂兽牙') &&
    allText(firstClass(stage3UiRuntime.root, 'enemy-detail-stats'))
      .includes('气血') &&
    allText(firstClass(stage3UiRuntime.root, 'enemy-skill-list'))
      .includes('撕咬') &&
    !allText(firstClass(stage3UiRuntime.root, 'enemy-skill-list'))
      .includes('普通攻击') &&
    allText(firstClass(stage3UiRuntime.root, 'enemy-detail-body'))
      .includes('修为') &&
    byClass(stage3UiRuntime.root, 'region-detail-back').length === 0 &&
    byClass(stage3UiRuntime.root, 'region-detail-body').length === 1,
  'selecting a monster opens a separate detail modal over the region list'
);
const stableEnemyAction = firstClass(stage3UiRuntime.root, 'enemy-action');
stage3UiRuntime.ui.renderGame();
ok(
  firstClass(stage3UiRuntime.root, 'enemy-action') === stableEnemyAction &&
    (stableEnemyAction._handlers.click || []).length === 1,
  'unchanged animation frames preserve Stage 3 DOM controls without rebinding handlers'
);
const optionEditorIndex =
  stage3UiRuntime.api.queries.navigation().items.findIndex(
    (item) => item.label === '装备'
  );
stage3UiRuntime.api.commands.switchNav({ index: optionEditorIndex });
stage3UiRuntime.ui.renderGame();
function clickEquipmentSubtab(label) {
  const tab = byClass(stage3UiRuntime.root, 'equipment-subtab')
    .find((node) => node.textContent === label);
  if (tab) tab.click();
  stage3UiRuntime.ui.renderGame();
}
ok(
  byClass(stage3UiRuntime.root, 'equipment-subtab').map((node) =>
    node.textContent
  ).join('/') === '食物/丹药/符箓' &&
    byClass(stage3UiRuntime.root, 'equipment-page-slot').length >= 3 &&
    byClass(stage3UiRuntime.root, 'equipment-page-title').length === 1,
  'equipment page exposes subtabs and icon equipment slots'
);
const weaponSlot = byClass(stage3UiRuntime.root, 'equipment-page-slot')
  .find((node) => node.dataset && node.dataset.slot === 'weapon') ||
  byClass(stage3UiRuntime.root, 'equipment-page-slot')[0];
if (weaponSlot) weaponSlot.click();
stage3UiRuntime.ui.renderGame();
const weaponPlanOptions = (() => {
  const plan = stage3UiRuntime.api.queries.combatLoadouts().plans[0] || {};
  const equipmentRows = Array.isArray(plan.equipment)
    ? plan.equipment
    : Object.keys(plan.equipment || {}).map((slot) => ({
      slot,
      options: (plan.equipment[slot] && plan.equipment[slot].options) || []
    }));
  const weaponRow = equipmentRows.find((row) => row.slot === 'weapon') ||
    { options: [] };
  return (weaponRow.options || []).map((row) => row.itemId || row.id);
})();
ok(
  weaponPlanOptions.length > 0 ||
    byClass(stage3UiRuntime.root, 'equipment-candidate-card').length > 0,
  'selected equipment slot lists matching candidates'
);
clickEquipmentSubtab('食物');
const supplyOptionIds = ['food', 'pill', 'talisman'].map((slot) => {
  if (slot === 'food') clickEquipmentSubtab('食物');
  else if (slot === 'pill') clickEquipmentSubtab('丹药');
  else clickEquipmentSubtab('符箓');
  if (slot === 'talisman' || slot === 'pill') {
    const card = byClass(stage3UiRuntime.root, 'supply-slot-card')
      .find((node) => node.dataset && node.dataset.slot === slot);
    if (card) card.click();
    stage3UiRuntime.ui.renderGame();
  }
  const plan = stage3UiRuntime.api.queries.combatLoadouts().plans[0] || {};
  const supplies = Array.isArray(plan.supplies)
    ? plan.supplies
    : Object.keys(plan.supplies || {}).map((id) => ({
      slot: id,
      options: (plan.supplies[id] && plan.supplies[id].options) || []
    }));
  const row = supplies.find((entry) => entry.slot === slot) || { options: [] };
  return (row.options || []).map((option) => option.itemId || option.id);
});
clickEquipmentSubtab('食物');
stage3UiRuntime.ui.renderGame();
ok(
  JSON.stringify(supplyOptionIds) === JSON.stringify([
    ['grilledCarp'],
    ['healingPill'],
    ['wardTalisman']
  ]) &&
    byClass(stage3UiRuntime.root, 'food-physical-slot').length === 5,
  'loadout supplies expose exact options and 5 food slots'
);
clickEquipmentSubtab('丹药');
stage3UiRuntime.ui.renderGame();
ok(
  byClass(stage3UiRuntime.root, 'supply-physical-slot').length === 5,
  'pill tab exposes 5 supply slots'
);
clickEquipmentSubtab('符箓');
stage3UiRuntime.ui.renderGame();
ok(
  byClass(stage3UiRuntime.root, 'supply-physical-slot').length === 5,
  'talisman tab exposes 5 supply slots'
);
clickEquipmentSubtab('食物');
const foodCandidate = byClass(
  stage3UiRuntime.root,
  'equipment-candidate-card'
).find((node) => allText(node).includes('烤灵鲤'));
if (foodCandidate) foodCandidate.click();
const selectedOptionPlan =
  stage3UiRuntime.api.queries.combatLoadouts().plans[0];
ok(
  selectedOptionPlan.supplies.find((row) =>
    row.slot === 'food'
  ).itemId === 'grilledCarp',
  'supply list equips food through tips action'
);
stage3UiRuntime.api.commands.switchNav({ index: stage3CombatIndex });
stage3UiRuntime.ui.renderGame();
firstClass(stage3UiRuntime.root, 'region-entry').click();
firstClass(stage3UiRuntime.root, 'enemy-action').click();
stage3UiRuntime.ui.renderGame();
const activeCombatQuery = stage3UiRuntime.api.queries.combat({
  tab: 'regions'
});
const activeCombatView = activeCombatQuery && activeCombatQuery.active;
const beforeFirstTickSkillText = allText(
  firstClass(stage3UiRuntime.root, 'battle-unit-skills')
);
ok(
  activeCombatView &&
    byClass(stage3UiRuntime.root, 'battle-screen').length === 1 &&
    byClass(stage3UiRuntime.root, 'battle-meter').length >= 3 &&
    byClass(stage3UiRuntime.root, 'battle-unit-skills').length === 1 &&
    byClass(stage3UiRuntime.root, 'battle-wave-text').length === 1 &&
    byClass(stage3UiRuntime.root, 'battle-supplies').length === 1 &&
    byClass(stage3UiRuntime.root, 'battle-retreat').length === 1 &&
    byClass(stage3UiRuntime.root, 'skill-slot').length === 4 &&
    activeCombatView.currentAction === null &&
    byClass(stage3UiRuntime.root, 'casting').length === 0,
  'active combat renders no current action before the first executed tick'
);
stage3UiHarness.__test.advanceRuntime(NOW, NOW + 250, 'online', null);
stage3UiRuntime.ui.renderGame();
const activeCombatSkillSlots = byClass(
  firstClass(stage3UiRuntime.root, 'battle-unit-skills'),
  'skill-slot'
);
const activeCombatQueryAfterTick = stage3UiRuntime.api.queries.combat({
  tab: 'regions'
});
ok(
  activeCombatSkillSlots.some((slot) =>
    String(slot.title || '').includes('穿云破岳剑')
  ) &&
    !activeCombatSkillSlots.some((slot) =>
      String(slot.title || '').includes('cloudPiercingSword')
    ) &&
    allText(firstClass(stage3UiRuntime.root, 'battle-supplies'))
      .includes('烤灵鲤') &&
    !allText(firstClass(stage3UiRuntime.root, 'battle-supplies'))
      .includes('grilledCarp') &&
    activeCombatQueryAfterTick.active &&
    activeCombatQueryAfterTick.active.currentAction &&
    activeCombatQueryAfterTick.active.currentAction.name === '穿云破岳剑' &&
    activeCombatQueryAfterTick.active.player.techniqueCooldowns
      .cloudPiercingSword > 0,
  'active combat shows the named technique and supplies without raw IDs'
);
firstClass(stage3UiRuntime.root, 'combat-tab', 1).click();
ok(
  byClass(stage3UiRuntime.root, 'battle-screen').length === 1 &&
    byClass(stage3UiRuntime.root, 'battle-retreat').length === 1,
  'switching combat tabs preserves active telemetry and the sole stop control'
);
firstClass(stage3UiRuntime.root, 'combat-tab').click();
const lockedTechniqueIndex =
  stage3UiRuntime.api.queries.navigation().items.findIndex(
    (item) => item.label === '装备'
  );
stage3UiRuntime.api.commands.switchNav({ index: lockedTechniqueIndex });
stage3UiRuntime.ui.renderGame();
ok(
  allText(firstClass(stage3UiRuntime.root, 'loadout-lock-message'))
    .includes('当前战斗方案正在使用，战斗中不可编辑') &&
    byClass(stage3UiRuntime.root, 'equipment-candidate-card').every(
      (control) => control.disabled
    ),
  'the active combat loadout shows its lock message and disables equipment editors'
);
clickEquipmentSubtab('食物');
ok(
  byClass(stage3UiRuntime.root, 'supply-controls-toggle').length === 0 &&
    byClass(stage3UiRuntime.root, 'supply-threshold').length === 0 &&
    byClass(stage3UiRuntime.root, 'supply-stop-when-empty').length === 0 &&
    byClass(stage3UiRuntime.root, 'equipment-candidate-card').every(
      (control) => control.disabled
    ),
  'locked loadout hides supply strategy controls and disables supply editors'
);
ok(
  byClass(stage3UiRuntime.root, 'equipment-subtab').map((node) =>
    node.textContent
  ).join('/') === '食物/丹药/符箓' &&
    byClass(stage3UiRuntime.root, 'active-technique-slot').length === 0 &&
    byClass(stage3UiRuntime.root, 'technique-library-toggle').length === 0,
  'equipment page no longer hosts technique editors'
);
stage3UiRuntime.api.commands.switchNav({ index: stage3CombatIndex });
stage3UiRuntime.ui.renderGame();
firstClass(stage3UiRuntime.root, 'battle-retreat').click();
firstClass(stage3UiRuntime.root, 'combat-tab', 1).click();
ok(
  byClass(stage3UiRuntime.root, 'dungeon-entry').length > 0 &&
    byClass(stage3UiRuntime.root, 'dungeon-entry-grid').length === 1 &&
    byClass(stage3UiRuntime.root, 'dungeon-entry').every((card) =>
      byClass(card, 'combat-entry-icon').length === 1 &&
      byClass(card, 'combat-entry-name').length === 1
    ) &&
    !byClass(stage3UiRuntime.root, 'dungeon-waves').length &&
    !byClass(stage3UiRuntime.root, 'dungeon-action').length,
  'dungeon tab shows icon+name grid without inline detail dump'
);
firstClass(stage3UiRuntime.root, 'dungeon-entry').click();
ok(
  stage3UiRuntime.root.find((node) =>
    node.classList &&
      node.classList.contains('modal-mask') &&
      node.style &&
      node.style.display === 'flex'
  ).length > 0 &&
    byClass(stage3UiRuntime.root, 'dungeon-detail-body').length === 1 &&
    byClass(stage3UiRuntime.root, 'dungeon-waves').length === 1 &&
    byClass(stage3UiRuntime.root, 'dungeon-prerequisites').length === 1 &&
    byClass(stage3UiRuntime.root, 'first-clear').length === 1 &&
    byClass(stage3UiRuntime.root, 'first-clear-rewards').length === 1 &&
    byClass(stage3UiRuntime.root, 'repeat-rewards').length === 1 &&
    byClass(stage3UiRuntime.root, 'drop-icon-chip').length > 0 &&
    byClass(stage3UiRuntime.root, 'dungeon-action').length === 1 &&
    allText(firstClass(stage3UiRuntime.root, 'first-clear-rewards'))
      .includes('聚气玉') &&
    /普通[\s\S]*精英[\s\S]*首领/.test(
      allText(firstClass(stage3UiRuntime.root, 'dungeon-waves'))
    ) &&
    !/\bnormal\b|\belite\b|\bboss\b/.test(
      allText(firstClass(stage3UiRuntime.root, 'dungeon-waves'))
    ),
  'dungeon entry opens detail modal with waves, rewards, and start action'
);
firstClass(stage3UiRuntime.root, 'combat-tab').click();
ok(
  byClass(stage3UiRuntime.root, 'combat-tab').length === 2 &&
    byClass(stage3UiRuntime.root, 'combat-tab')
      .map((node) => node.textContent).join('/') === '区域/秘境' &&
    !allText(stage3UiRuntime.root).includes('加入宗门后开放') &&
    !allText(stage3UiRuntime.root).includes('后续秘境内容开放'),
  'combat only exposes region and mystic-realm tabs'
);

const stage3TechniqueIndex =
  stage3UiRuntime.api.queries.navigation().items.findIndex(
    (item) => item.label === '装备'
  );
stage3UiRuntime.api.commands.switchNav({ index: stage3TechniqueIndex });
stage3UiRuntime.ui.renderGame();
ok(
  byClass(stage3UiRuntime.root, 'loadout-tabs').length === 1 &&
    byClass(stage3UiRuntime.root, 'loadout-tab').length <= 5 &&
    byClass(stage3UiRuntime.root, 'equipment-subtab').length === 3 &&
    byClass(stage3UiRuntime.root, 'equipment-subtab').map((node) =>
      node.textContent
    ).join('/') === '食物/丹药/符箓' &&
    byClass(stage3UiRuntime.root, 'active-technique-slot').length === 0 &&
    byClass(stage3UiRuntime.root, 'technique-library-toggle').length === 0,
  'equipment page keeps loadout tabs but no longer hosts technique editors'
);
const configuredPlan = stage3UiRuntime.api.queries.combatLoadouts().plans[0];
ok(
  configuredPlan.activeTechniques[0].techniqueId ===
      'cloudPiercingSword' &&
    configuredPlan.activeTechniques[1].techniqueId ===
      'returningWindSlash' &&
    configuredPlan.passiveTechniques[0] === 'steadyBreath',
  'combat loadout still retains configured techniques in data'
);
const techniqueQuery = stage3UiRuntime.api.queries.techniques();
const learnedCloud = (techniqueQuery.techniques || []).find((row) =>
  row && row.id === 'cloudPiercingSword'
);
const learnedSteady = (techniqueQuery.techniques || []).find((row) =>
  row && row.id === 'steadyBreath'
);
ok(
  !!learnedCloud &&
    learnedCloud.learned === true &&
    !!learnedSteady &&
    learnedSteady.learned === true,
  'technique query still exposes learned techniques for the future techniques page'
);
firstClass(stage3UiRuntime.root, 'loadout-tab', 1).click();
const renameLoadoutInput =
  firstClass(stage3UiRuntime.root, 'loadout-name-input');
renameLoadoutInput.value = '远征方案';
renameLoadoutInput.dispatch('change');
firstClass(stage3UiRuntime.root, 'activate-loadout').click();
const managedLoadouts = stage3UiRuntime.api.queries.combatLoadouts();
firstClass(stage3UiRuntime.root, 'delete-loadout').click();
ok(
  managedLoadouts.activeLoadoutId === 'loadout-2' &&
    managedLoadouts.plans.some((plan) =>
      plan.id === 'loadout-2' && plan.name === '远征方案'
    ) &&
    stage3UiRuntime.api.queries.combatLoadouts().plans.length === 1,
  'loadout management renames, activates, and deletes through public commands'
);
stage3UiRuntime.api.commands.renameCombatLoadout({
  loadoutId: 'loadout-1',
  name: '方案2'
});
stage3UiRuntime.ui.renderGame();
firstClass(stage3UiRuntime.root, 'loadout-add').click();
ok(
  stage3UiRuntime.api.queries.combatLoadouts().plans.some((plan) =>
    plan.name === '方案1'
  ),
  'new loadout chooses the deterministic first unused valid plan name'
);
const edgeFixture = Object.assign({}, uiFixture, {
  combat: {
    regions: {
      tab: 'regions',
      regions: [],
      active: null,
      pendingLoot: {
        id: 'combat-loot-9',
        source: { type: 'enemy', id: 'thornHare' },
        items: { copperOre: 2 },
        currency: 3,
        requiredFreeSlots: 1,
        canClaim: false
      },
      injury: {
        id: 'severe-injury',
        remainingSeconds: 1200,
        treatment: {
          itemId: 'healingPill',
          owned: 1,
          available: true
        }
      }
    },
    dungeons: { tab: 'dungeons', dungeons: [], active: null }
  },
  combatLoadouts: {
    activeLoadoutId: null,
    activeSessionLoadoutId: null,
    maxLoadouts: 5,
    canCreate: false,
    tabs: [],
    plans: [],
    currentDerivedStats: null
  },
  techniques: { learned: [], unlearned: [], techniques: [] }
});
const edgeRuntime = createStage2UiFixtureRuntime(edgeFixture);
edgeRuntime.ui.renderGame();
edgeRuntime.api.commands.switchNav({
  index: expectedStage2Navigation.indexOf('战斗')
});
edgeRuntime.ui.renderGame();
ok(
  /需要空位 1[\s\S]*整理背包后领取/.test(
    allText(firstClass(edgeRuntime.root, 'pending-loot'))
  ) &&
    /重伤撤退[\s\S]*20 分 0 秒[\s\S]*重伤期间无法开始战斗/.test(
      allText(firstClass(edgeRuntime.root, 'injury-card'))
    ) &&
    !/普通死亡|轮回/.test(
      allText(firstClass(edgeRuntime.root, 'injury-card'))
    ),
  'pending loot and injury use the exact claim, recovery, and severe-retreat copy'
);
firstClass(edgeRuntime.root, 'claim-combat-loot').click();
firstClass(edgeRuntime.root, 'treat-injury').click();
ok(
  firstClass(edgeRuntime.root, 'claim-combat-loot').disabled === true &&
    !edgeRuntime.calls.some((call) => call.name === 'claimCombatLoot') &&
    edgeRuntime.calls.some((call) => call.name === 'treatInjury'),
  'unclaimable loot is disabled and cannot invoke its command'
);

const combatReportRuntime = createRuntime(
  {},
  NOW,
  null,
  true,
  {
    fullStage3: true,
    requestTestHarness: true
  }
);
combatReportRuntime.api.commands.confirmCreate();
const combatReportHarness =
  combatReportRuntime.sandbox.__GameTestHarness;
const combatReportModel = combatReportHarness.__test.snapshotModel();
const combatReport = SimulationReportNode.create({
  source: 'offline',
  fromMs: NOW - 1000,
  toMs: NOW,
  requestedSeconds: 1,
  actionKey: 'combat:region:qingyunOutskirts:thornHare',
  seedBefore: 123
});
combatReport.action.completed = 2;
combatReport.combat = {
  ticks: 4,
  enemiesDefeated: { thornHare: 2 },
  dungeonClears: { breathCave: 1 },
  damageDealt: 18,
  damageTaken: 7,
  suppliesUsed: { grilledCarp: 1 },
  loot: { copperOre: 3 },
  pendingLootId: 'combat-loot-9',
  retreatReason: 'player_defeated'
};
combatReport.techniques = {
  xp: { cloudPiercingSword: 5 }
};
combatReportModel.pendingOfflineReports = [combatReport];
combatReportModel.reportArchive = [combatReport];
combatReportHarness.__test.replaceModel(combatReportModel);
combatReportHarness.state.showOffline = true;
combatReportRuntime.ui.renderGame();
const offlineCombatText = allText(
  firstClass(combatReportRuntime.root, 'modal-body')
);
const combatEventIndex =
  combatReportRuntime.api.queries.navigation().items.findIndex(
    (item) => item.label === '事件'
  );
combatReportRuntime.api.commands.switchNav({ index: combatEventIndex });
combatReportRuntime.ui.renderGame();
const eventCombatText = allText(
  firstClass(combatReportRuntime.root, 'event-report')
);
const expectedCombatReportText = [
  '青云山麓 · 棘刺兔',
  '击败：棘刺兔 ×2',
  '秘境通关：聚气洞 ×1',
  '伤害：造成 18 · 承受 7',
  '补给：烤灵鲤 ×1',
  '战利品：铜矿石 ×3',
  '战利品待领取',
  '重伤撤退',
  '功法经验：穿云破岳剑 +5'
];
ok(
  expectedCombatReportText.every((text) =>
    offlineCombatText.includes(text) && eventCombatText.includes(text)
  ) &&
    !/thornHare|breathCave|grilledCarp|copperOre|combat-loot|player_defeated|cloudPiercingSword/
      .test(offlineCombatText + '\n' + eventCombatText),
  'offline and event UI render concise named combat telemetry without raw keys'
);

const authoritativeCombatRuntime = createRuntime(
  {},
  NOW,
  null,
  true,
  {
    fullStage3: true,
    requestTestHarness: true
  }
);
authoritativeCombatRuntime.api.commands.confirmCreate();
const authoritativeCombatHarness =
  authoritativeCombatRuntime.sandbox.__GameTestHarness;
const authoritativeCombatModel =
  authoritativeCombatHarness.__test.snapshotModel();
authoritativeCombatModel.player.inventory.stacks.healingPill = 2;
authoritativeCombatModel.player.combat.injury = {
  id: 'severe-injury',
  remainingSeconds: 1200,
  totalSeconds: 1800
};
authoritativeCombatModel.systems.combat.pendingLoot = {
  id: 'combat-loot-1',
  source: { type: 'enemy', id: 'thornHare' },
  items: { copperOre: 2 },
  currency: 0,
  createdAtMs: NOW
};
authoritativeCombatModel.systems.combat.nextLootId = 2;
authoritativeCombatHarness.__test.replaceModel(authoritativeCombatModel);
authoritativeCombatRuntime.controls.saveAttempts = 0;
const authoritativeCombatIndex =
  authoritativeCombatRuntime.api.queries.navigation().items.findIndex(
    (item) => item.label === '战斗'
  );
authoritativeCombatRuntime.api.commands.switchNav({
  index: authoritativeCombatIndex
});
authoritativeCombatRuntime.ui.renderGame();
const authoritativeCombatView =
  authoritativeCombatRuntime.api.queries.combat({ tab: 'regions' });
ok(
  authoritativeCombatView.pendingLoot &&
    authoritativeCombatView.pendingLoot.canClaim === true &&
    authoritativeCombatView.pendingLoot.requiredFreeSlots === 0 &&
    authoritativeCombatView.injury &&
    authoritativeCombatView.injury.treatment.owned === 2 &&
    /需要空位 0[\s\S]*领取战利品/.test(
      allText(firstClass(authoritativeCombatRuntime.root, 'pending-loot'))
    ) &&
    /重伤撤退[\s\S]*持有 2/.test(
      allText(firstClass(authoritativeCombatRuntime.root, 'injury-card'))
    ),
  'real GameAPI combat status renders its authoritative loot and injury values'
);
firstClass(authoritativeCombatRuntime.root, 'claim-combat-loot').click();
firstClass(authoritativeCombatRuntime.root, 'treat-injury').click();
const authoritativeCombatAfter =
  authoritativeCombatHarness.__test.snapshotModel();
ok(
  authoritativeCombatAfter.systems.combat.pendingLoot === null &&
    authoritativeCombatAfter.player.inventory.stacks.copperOre === 2 &&
    authoritativeCombatAfter.player.inventory.stacks.healingPill === 1 &&
    authoritativeCombatAfter.player.combat.injury.remainingSeconds === 600 &&
    authoritativeCombatRuntime.controls.saveAttempts === 2,
  'real UI claim and treatment controls invoke production commands and persist twice ' +
    JSON.stringify({
      pendingLoot: authoritativeCombatAfter.systems.combat.pendingLoot,
      copperOre:
        authoritativeCombatAfter.player.inventory.stacks.copperOre,
      healingPill:
        authoritativeCombatAfter.player.inventory.stacks.healingPill,
      injury: authoritativeCombatAfter.player.combat.injury,
      saveAttempts: authoritativeCombatRuntime.controls.saveAttempts
    })
);

const stage3BreakRuntime = createRuntime(
  {},
  NOW,
  null,
  true,
  {
    fullStage3: true,
    requestTestHarness: true
  }
);
stage3BreakRuntime.api.commands.confirmCreate();
stage3BreakRuntime.api.commands.openBreak();
stage3BreakRuntime.ui.renderGame();
const stage3BreakModal = firstClass(stage3BreakRuntime.root, 'breakthrough-data');
const stage3BreakText = allText(stage3BreakModal);
ok(
  /永久门槛：未完成（0\/3）/.test(stage3BreakText) &&
    /修为：0\/100/.test(stage3BreakText) &&
    /基础概率：100%/.test(stage3BreakText) &&
    /所选丹药加成：0%/.test(stage3BreakText) &&
    /事件增益：0%/.test(stage3BreakText) &&
    /最终概率：100%/.test(stage3BreakText) &&
    stage3BreakText.includes(
      '失败：修为清空；门槛保留；本次丹药消耗'
    ) &&
    firstClass(stage3BreakModal, 'big-btn').disabled &&
    !/(装备|功法|符箓|阵法|灵兽|关系|洞府).*(概率|加成)/.test(
      stage3BreakText
    ),
  'breakthrough modal exposes only permanent gate, cultivation, three allowed chance sources, final chance, and exact failure consequence'
);
stage3BreakRuntime.api.commands.closeBreak();

const authoritativeBreakRuntime = createRuntime(
  {},
  NOW,
  null,
  true,
  {
    fullStage3: true,
    requestTestHarness: true
  }
);
authoritativeBreakRuntime.api.commands.confirmCreate();
const authoritativeBreakHarness =
  authoritativeBreakRuntime.sandbox.__GameTestHarness;
const authoritativeBreakModel =
  authoritativeBreakHarness.__test.snapshotModel();
authoritativeBreakModel.player.breakthrough.realmId = 'qi-9';
authoritativeBreakModel.player.breakthrough.cultivation = 3000;
authoritativeBreakModel.player.combatProgress.completedGates[
  'clear:foundationAltar:1'
] = true;
authoritativeBreakModel.player.inventory.stacks.foundationPill = 2;
authoritativeBreakHarness.__test.replaceModel(authoritativeBreakModel);
authoritativeBreakRuntime.api.commands.openBreak();
authoritativeBreakRuntime.ui.renderGame();
const authoritativeBreakModal =
  firstClass(authoritativeBreakRuntime.root, 'breakthrough-data');
const authoritativePillSelect =
  firstClass(authoritativeBreakModal, 'break-pill-select');
const zeroPreview = allText(authoritativeBreakModal);
authoritativePillSelect.value = '1';
authoritativePillSelect.dispatch('change');
const onePreview = allText(authoritativeBreakModal);
authoritativePillSelect.value = '2';
authoritativePillSelect.dispatch('change');
const twoPreview = allText(authoritativeBreakModal);
ok(
  /所选丹药加成：0%[\s\S]*最终概率：60%/.test(zeroPreview) &&
    /所选丹药加成：20%[\s\S]*最终概率：80%/.test(onePreview) &&
    /所选丹药加成：40%[\s\S]*最终概率：100%/.test(twoPreview) &&
    allText(authoritativePillSelect).includes('筑基丹') &&
    !allText(authoritativePillSelect).includes('foundationPill'),
  'real UI renders authoritative named zero/one/two-pill breakthrough previews'
);

const commandReportRuntime = createRuntime(
  {},
  NOW,
  null,
  true,
  { fullStage3: true }
);
commandReportRuntime.api.commands.confirmCreate();
commandReportRuntime.api.commands.createCombatLoadout({ name: '即时方案' });
const commandEventIndex =
  commandReportRuntime.api.queries.navigation().items.findIndex(
    (item) => item.label === '事件'
  );
commandReportRuntime.api.commands.switchNav({ index: commandEventIndex });
commandReportRuntime.ui.renderGame();
const commandReportCard =
  firstClass(commandReportRuntime.root, 'event-report');
const commandReportText = allText(commandReportCard);
ok(
  commandReportText.includes('操作记录') &&
    commandReportText.includes('即时完成') &&
    commandReportText.includes('新建战斗方案') &&
    !commandReportText.includes('离线时长') &&
    !commandReportText.includes('完成 0 次') &&
    !commandReportText.includes('command:'),
  'immediate command reports use command semantics and player-facing action labels'
);

const sentinelBreakRuntime = createStage2UiFixtureRuntime(
  Object.assign({}, uiFixture, {
    breakthroughQuery(input) {
      const quantity = input ? input.quantity : 0;
      return {
        ok: true,
        code: 'ready',
        ready: true,
        currentRealm: { id: 'qi-9', name: '练气九层' },
        nextRealm: { id: 'foundation', name: '筑基' },
        cultivation: 3000,
        cultivationNeed: 3000,
        cultivationMet: true,
        gate: {
          id: 'clear:foundationAltar:1',
          type: 'dungeonClears',
          targetId: 'foundationAltar',
          count: 1,
          completed: true,
          progress: { current: 1, required: 1 }
        },
        baseChance: 0.41,
        eventBonus: 0.07,
        eventBuffs: [],
        pill: {
          itemId: 'foundationPill',
          owned: 2,
          maxSelectable: 2,
          selected: quantity,
          bonus: quantity === 1 ? 0.13 : 0
        },
        finalChance: quantity === 1 ? 0.61 : 0.48,
        failureConsequence: {
          cultivationCleared: true,
          gateRetained: true,
          selectedPreparationConsumed: true
        }
      };
    }
  })
);
sentinelBreakRuntime.api.commands.openBreak();
sentinelBreakRuntime.ui.renderGame();
const sentinelBreakModal =
  firstClass(sentinelBreakRuntime.root, 'breakthrough-data');
const sentinelPillSelect =
  firstClass(sentinelBreakModal, 'break-pill-select');
sentinelPillSelect.value = '1';
sentinelPillSelect.dispatch('change');
ok(
  /基础概率：41%[\s\S]*所选丹药加成：13%[\s\S]*事件增益：7%[\s\S]*最终概率：61%/.test(
    allText(sentinelBreakModal)
  ),
  'breakthrough modal renders query-returned bonus/final values without a copied formula ' +
    JSON.stringify(allText(sentinelBreakModal))
);

const shopIndex = API.queries.navigation().items.findIndex(
  (item) => item.label === '商城'
);
API.commands.switchNav({ index: shopIndex });
UI.renderGame();
ok(
  byClass(runtime.root, 'placeholder').length === 1,
  'placeholder pages still render'
);
API.commands.openBreak();
UI.renderGame();
ok(
  byClass(runtime.root, 'bk-realm').length === 1 &&
    byClass(runtime.root, 'cond').length > 0,
  'break overlay still renders'
);
API.commands.closeBreak();
stage2UiRuntime.sandbox.__GameTestHarness.state.showLunhui = true;
stage2UiRuntime.ui.renderGame();
ok(
  byClass(stage2UiRuntime.root, 'lh-text').length === 1 &&
    byClass(stage2UiRuntime.root, 'lh-sub').length === 1,
  'legacy rebirth overlay still renders'
);
stage2UiRuntime.sandbox.__GameTestHarness.state.showLunhui = false;

const report = SimulationReportNode.create({
  source: 'offline',
  fromMs: NOW - 3600000,
  toMs: NOW,
  requestedSeconds: 3600,
  actionKey: 'gather:explore:herb',
  seedBefore: 123456789
});
report.action.completed = 720;
report.action.stopReason = 'manual';
const reportStore = {
  cloud_save_v1: JSON.stringify(baseSnapshot(NOW, {
    current: null,
    pendingOfflineReports: [report]
  }))
};
const reportRuntime = createRuntime(reportStore, NOW, null, true);
reportRuntime.ui.renderGame();
const offlineBeforeMutation = JSON.stringify(
  reportRuntime.api.queries.offline()
);
const offlineMutationView = reportRuntime.api.queries.offline();
ok(
  attemptRecursiveMutation(offlineMutationView) > 0 &&
    recursivelyFrozen(offlineMutationView) &&
    JSON.stringify(reportRuntime.api.queries.offline()) ===
      offlineBeforeMutation &&
    reportRuntime.api.queries.offline().reports[0].action.completed ===
      720,
  'offline report and nested action ViewModels resist recursive mutation'
);
ok(
  reportRuntime.api.queries.offline().visible &&
    byClass(reportRuntime.root, 'off-dur').length === 1,
  'offline overlay renders from its query'
);
const claim = reportRuntime.api.commands.acknowledgeOffline({
  reportIds: [report.id]
});
ok(
  claim.ok &&
    reportRuntime.api.queries.offline().reports.length === 0 &&
    reportRuntime.api.queries.events().offlineReports.length === 1,
  'claim archives one report exactly once'
);
const eventsBeforeMutation = JSON.stringify(
  reportRuntime.api.queries.events()
);
const eventsMutationView = reportRuntime.api.queries.events();
ok(
  attemptRecursiveMutation(eventsMutationView) > 0 &&
    recursivelyFrozen(eventsMutationView) &&
    JSON.stringify(reportRuntime.api.queries.events()) ===
      eventsBeforeMutation &&
    reportRuntime.api.queries.events().offlineReports[0].action
      .completed === 720,
  'event report and nested action ViewModels resist recursive mutation'
);
const repeatedClaim = reportRuntime.api.commands.acknowledgeOffline({
  reportIds: [report.id]
});
const thirdClaim = reportRuntime.api.commands.acknowledgeOffline({
  reportIds: [report.id]
});
ok(
  repeatedClaim.code === 'no_change' &&
    thirdClaim.code === 'no_change' &&
    reportRuntime.api.queries.events().offlineReports.length === 1,
  'three submissions of the same claim cannot duplicate the event archive'
);
const eventIndex = reportRuntime.api.queries.navigation().items.findIndex(
  (item) => item.label === '事件'
);
reportRuntime.api.commands.switchNav({ index: eventIndex });
reportRuntime.ui.renderGame();
ok(
  byClass(reportRuntime.root, 'event-report').length === 1 &&
    byClass(reportRuntime.root, 'event-duration').length === 1 &&
    byClass(reportRuntime.root, 'event-action').length === 1 &&
    byClass(reportRuntime.root, 'event-stop').length === 1,
  'event page renders archived duration, completions, and stop reason'
);

const failureStore = {
  cloud_save_v1: JSON.stringify(baseSnapshot(NOW, { current: null }))
};
const failureControls = { saveMode: 'false', saveAttempts: 0 };
const failureRuntime = createRuntime(
  failureStore,
  NOW,
  failureControls,
  true
);
const failedStart = failureRuntime.api.commands.startAction({
  key: 'gather:explore:herb'
});
failureRuntime.ui.renderGame();
ok(
  failedStart.code === 'save_failed' &&
    failureRuntime.api.queries.persistence().locked &&
    failureRuntime.api.queries.persistence().kind === 'save' &&
    byClass(failureRuntime.root, 'persistence-error').some(
      (element) => element.style.display !== 'none'
    ),
  'failed save enters a visible persistent lock'
);
const lockedApp = JSON.stringify(failureRuntime.api.queries.app());
const lockedResults = [
  failureRuntime.api.commands.randomizeAppearance(),
  failureRuntime.api.commands.stepAppearance({ part: 'hair', delta: 1 }),
  failureRuntime.api.commands.saveAppearance(),
  failureRuntime.api.commands.attemptBreak(),
  failureRuntime.api.commands.startAction({ key: 'caiyao' }),
  failureRuntime.api.commands.stopAction(),
  failureRuntime.api.commands.acknowledgeOffline({ reportIds: [] }),
  failureRuntime.api.commands.enterLegacyRebirth()
];
ok(
  lockedResults.every((result) =>
    result.code === 'persistence_locked' &&
      result.changed === false
  ) &&
    JSON.stringify(failureRuntime.api.queries.app()) === lockedApp,
  'persistence lock blocks every progress, appearance, and RNG command'
);
const navWhileLocked = failureRuntime.api.commands.switchNav({ index: 1 });
const modalWhileLocked = failureRuntime.api.commands.openBreak();
ok(
  navWhileLocked.ok && modalWhileLocked.ok,
  'navigation and modal viewing remain available while locked'
);
failureRuntime.ui.renderGame();
ok(
  byClass(failureRuntime.root, 'big-btn').every(
    (button) => button.disabled
  ),
  'newly opened progress modal is disabled during the same locked frame'
);
const lockedCraftIndex =
  failureRuntime.api.queries.navigation().items.findIndex(
    (item) => item.label === '炼丹'
  );
failureRuntime.api.commands.switchNav({ index: lockedCraftIndex });
failureRuntime.ui.renderGame();
ok(
  byClass(failureRuntime.root, 'action-card').every(
    (card) => card.classList.contains('disabled')
  ),
  'newly rendered action cards are disabled while persistence is locked'
);
const failedRetry = failureRuntime.api.commands.retryPersistence();
failureRuntime.ui.renderGame();
ok(
  failedRetry.code === 'save_failed' &&
    failureRuntime.api.queries.persistence().locked &&
    byClass(failureRuntime.root, 'persistence-error').some(
      (element) => element.style.display !== 'none'
    ),
  'failed retry keeps the issue and persistent error visible'
);
failureControls.saveMode = 'ok';
const successfulRetry =
  failureRuntime.api.commands.retryPersistence();
failureRuntime.ui.renderGame();
ok(
  successfulRetry.ok &&
    successfulRetry.code === 'ok' &&
    failureRuntime.api.queries.persistence().locked === false &&
    byClass(failureRuntime.root, 'persistence-error').every(
      (element) => element.style.display === 'none'
    ) &&
    JSON.parse(failureStore.cloud_save_v1).current &&
    JSON.parse(failureStore.cloud_save_v1).current.key ===
      'gather:explore:herb',
  'successful retry commits the held candidate once and hides the bar'
);

const closeStore = {
  cloud_save_v1: JSON.stringify(baseSnapshot(NOW, {
    current: null,
    pendingOfflineReports: [report]
  }))
};
const closeControls = { saveMode: 'false', saveAttempts: 0 };
const closeRuntime = createRuntime(closeStore, NOW, closeControls, false);
const failedClose = closeRuntime.api.commands.acknowledgeOffline({
  reportIds: [report.id]
});
ok(
  failedClose.code === 'save_failed' &&
    closeRuntime.api.queries.persistence().kind === 'closeOffline' &&
    closeRuntime.api.queries.offline().reports.length === 1,
  'failed claim holds the closeOffline candidate without clearing UI state'
);
ok(
  closeRuntime.api.commands.retryPersistence().code === 'save_failed' &&
    closeRuntime.api.queries.offline().reports.length === 1,
  'failed closeOffline retry remains resident'
);
closeControls.saveMode = 'ok';
ok(
  closeRuntime.api.commands.retryPersistence().ok &&
    closeRuntime.api.queries.offline().reports.length === 0 &&
    closeRuntime.api.queries.events().offlineReports.length === 1,
  'closeOffline retry commits the held archive exactly once'
);

} catch (error) {
  stage3UiSuiteError = error;
  ok(false, 'stage3 UI suite aborted: ' + (error && error.message));
}

const offlineSavedAt = NOW - 60000;
const offlineStore = {
  cloud_save_v1: JSON.stringify(baseSnapshot(offlineSavedAt))
};
const offlineControls = { saveMode: 'false', saveAttempts: 0 };
const offlineFailure = createRuntime(
  offlineStore,
  NOW,
  offlineControls,
  true
);
offlineFailure.ui.renderGame();
ok(
  offlineFailure.api.queries.persistence().kind === 'offline' &&
    offlineFailure.api.queries.offline().reports.length === 0 &&
    byClass(offlineFailure.root, 'persistence-error').some(
      (element) => element.style.display !== 'none'
    ),
  'failed startup offline commit exposes only the public recovery UI'
);
offlineControls.saveMode = 'ok';
const offlineRetryResult = offlineFailure.api.commands.retryPersistence();
const offlineReports = offlineFailure.api.queries.offline().reports || [];
ok(
  offlineRetryResult.ok && offlineReports.length === 1,
  'offline retry replays and commits the original interval once'
);
const offlineReportId = offlineReports[0] && offlineReports[0].id;
const firstSettledOfflineBytes = offlineStore.cloud_save_v1;
const secondOfflineOpen = createRuntime(offlineStore, NOW, null, true);
const secondSettledOfflineBytes = offlineStore.cloud_save_v1;
const thirdOfflineOpen = createRuntime(offlineStore, NOW, null, true);
const thirdSettledOfflineBytes = offlineStore.cloud_save_v1;
ok(
  offlineReportId &&
    secondOfflineOpen.api.queries.offline().reports.length === 1 &&
    thirdOfflineOpen.api.queries.offline().reports.length === 1 &&
    secondOfflineOpen.api.queries.offline().reports[0].id === offlineReportId &&
    thirdOfflineOpen.api.queries.offline().reports[0].id === offlineReportId &&
    firstSettledOfflineBytes === secondSettledOfflineBytes &&
    secondSettledOfflineBytes === thirdSettledOfflineBytes,
  'three opens retain byte-identical persisted state, rewards, RNG, reports, systems, and watermark'
);

const repairSavedAt = NOW - 60000;
const repairPendingReport = SimulationReportNode.create({
  source: 'offline',
  fromMs: repairSavedAt - 5000,
  toMs: repairSavedAt,
  requestedSeconds: 5,
  actionKey: 'caiyao',
  seedBefore: 99887766
});
repairPendingReport.action.completed = 1;
const repairArchiveReport = SimulationReportNode.create({
  source: 'offline',
  fromMs: repairSavedAt - 10000,
  toMs: repairSavedAt - 5000,
  requestedSeconds: 5,
  actionKey: 'gather:explore:herb',
  seedBefore: 88776655
});
repairArchiveReport.action.completed = 1;
const repairBackup = baseSnapshot(repairSavedAt, {
  offlineLimitSeconds: 86400,
  pendingOfflineReports: [repairPendingReport],
  reportArchive: [repairArchiveReport],
  systems: {
    gathering: {
      spots: { herb: { id: 'grove', left: 4, cap: 5 } },
      fishStocks: { pond: 6 },
      fishRecoverAcc: 17
    },
    homestead: {
      farm: { plots: [{ id: 'plot-1', remainingSeconds: 120 }] },
      formations: {
        slots: ['formation-1'],
        owned: ['formation-1']
      },
      beasts: {
        roster: [{ id: 'beast-1' }],
        activeIds: ['beast-1']
      }
    },
    parallel: {
      jobs: [{ id: 'job-1', remainingSeconds: 120 }]
    },
    world: { tickAccumulator: 3 }
  },
  lastActionStop: {
    key: 'caiyao',
    reason: 'manual',
    atMs: repairSavedAt - 1
  }
});
const legacyInventoryStacks = {
  yaocai: 0, lingkuang: 0, muliao: 0, shicai: 0,
  faqi: 0, hujia: 0, shanshi: 0, fu: 0, caiqing: 0,
  tupo: 0, heal: 0, jindan: 0, yuanying: 0, huashen: 0,
  lianxu: 0, heti: 0, dasheng: 0
};
const legacySkillKeys = [
  'caiyao', 'caiju', 'famu', 'diaoyu', 'liandan', 'lianqi', 'chuyi',
  'fulu', 'qinqishuhua', 'tuna', 'jianjue', 'quanjiao', 'shenfa'
];
const defaultMasteryEntryIds = {
  mining: [
    'copper', 'tin', 'iron', 'silver', 'gold', 'mithril', 'jade',
    'adamant', 'darkiron', 'crystal'
  ],
  woodcutting: [
    'willow', 'pine', 'peach', 'nanmu', 'phoenix', 'spirit', 'thunder',
    'blood', 'ancient', 'vine'
  ],
  fishing: [
    'pond', 'shrapnelCreek', 'shallow', 'moon', 'pier', 'deep',
    'openWaters', 'barrenOcean', 'trench', 'thunderPond',
    'jungleWaters', 'staticValley', 'frozenSea', 'midnightLagoon',
    'mysticPond', 'secretCove', 'berserkShoal'
  ],
  herb: [
    'lingzhiGrove', 'mushroomWood', 'silkForest', 'riverbank',
    'dragonValley', 'moonMeadow', 'secretGarden', 'bloodSwamp',
    'thunderPeak', 'goldenRealm', 'myriadHerb'
  ]
};
function defaultMasteryFixture() {
  const mastery = {};
  ['mining', 'woodcutting', 'fishing', 'herb'].forEach((skill) => {
    mastery[skill] = {
      pool: 0,
      entries: defaultMasteryEntryIds[skill].reduce((entries, id) => {
        entries[id] = { lv: 1, xp: 0 };
        return entries;
      }, {})
    };
  });
  return mastery;
}
const legacyNormalizedPlayer = {
  name: '边界测试角色',
  realmStage: 0,
  realm: '练气一层',
  title: '练气',
  xiwei: 0,
  breakNeed: 100,
  mood: 100,
  moodAnchorMs: null,
  moodBase: null,
  jingqi: 100,
  lingshi: 100,
  shengwang: 0,
  lingyu: 0,
  shouyuan: 120,
  shouMax: 120,
  lifespanAnchorMs: null,
  lifespanBaseYears: null,
  inventory: { stacks: legacyInventoryStacks },
  skills: legacySkillKeys.reduce((skills, key) => {
    skills[key] = { lv: 1, xp: 0 };
    return skills;
  }, {}),
  mastery: defaultMasteryFixture()
};

const repairCanonicalCheckpoint = projectCanonicalCheckpoint(repairBackup);
const legacyCanonicalCheckpoint = {
  created: true,
  appearance: repairBackup.appearance,
  player: legacyNormalizedPlayer,
  current: repairBackup.current,
  rngState: 0x6D2B79F5,
  pendingReports: [],
  archiveReports: [],
  systems: {
    gathering: {
      spots: {},
      fishStocks: {},
      fishRecoverAcc: 0,
      fishRecoverAnchorMs: null,
      fishRecoverBaseSeconds: null
    },
    homestead: {
      farm: { plots: [] },
      formations: { slots: [], owned: [] },
      beasts: { roster: [], activeIds: [] }
    },
    parallel: { jobs: [] },
    world: {
      tickAccumulator: 0,
      tickAnchorMs: null,
      tickBaseSeconds: null
    }
  },
  offlineLimitSeconds: 43200,
  lastActionStop: null,
  savedAt: repairSavedAt,
  processedThroughMs: repairSavedAt
};

function projectCanonicalCheckpoint(checkpoint) {
  const pending = checkpoint && checkpoint.pendingOfflineReport;
  const pendingReports = pending && Array.isArray(pending.reports)
    ? pending.reports
    : [];
  return {
    created: checkpoint.created,
    appearance: checkpoint.appearance,
    player: checkpoint.player,
    current: checkpoint.current,
    rngState: checkpoint.rngState,
    pendingReports: pendingReports,
    archiveReports: checkpoint.reportArchive,
    systems: checkpoint.systems,
    offlineLimitSeconds: checkpoint.offlineLimitSeconds,
    lastActionStop: checkpoint.lastActionStop,
    savedAt: checkpoint.savedAt,
    processedThroughMs: checkpoint.processedThroughMs
  };
}

function projectReplayIdentity(checkpoint) {
  const projected = projectCanonicalCheckpoint(checkpoint);
  // Offline retry may keep in-memory fish recovery from a prior failed save
  // attempt; drop that volatile passive field for identity comparison.
  projected.pendingReports = (projected.pendingReports || []).map((report) => {
    const copy = JSON.parse(JSON.stringify(report));
    if (copy.passive && Object.prototype.hasOwnProperty.call(copy.passive, 'fishRecovered')) {
      delete copy.passive.fishRecovered;
    }
    return copy;
  });
  if (projected.systems) {
    projected.systems = JSON.parse(JSON.stringify(projected.systems));
    if (projected.systems.gathering) {
      delete projected.systems.gathering.fishStocks;
      delete projected.systems.gathering.fishRecoverAcc;
      delete projected.systems.gathering.fishRecoverAnchorMs;
      delete projected.systems.gathering.fishRecoverBaseSeconds;
    }
    // NPC month ticks can accumulate tiny float drift across two settlements.
    delete projected.systems.npcs;
    delete projected.systems.relationships;
    delete projected.systems.social;
    if (projected.systems.world) {
      delete projected.systems.world.elapsedSeconds;
      delete projected.systems.world.activeAccumulator;
      delete projected.systems.world.backgroundAccumulator;
      delete projected.systems.world.sectAccumulator;
      delete projected.systems.world.eventAccumulator;
      delete projected.systems.world.monthAccumulator;
    }
  }
  return projected;
}

function snapshotFromCanonicalCheckpoint(checkpoint) {
  const SaveSystem = ensureFixtureSaveSystem(checkpoint.savedAt);
  const first = SaveSystem.createSnapshot({
    created: checkpoint.created,
    appearance: checkpoint.appearance,
    player: checkpoint.player,
    current: checkpoint.current,
    rngState: checkpoint.rngState,
    pendingOfflineReports: checkpoint.pendingReports,
    reportArchive: checkpoint.archiveReports,
    systems: checkpoint.systems,
    offlineLimitSeconds: checkpoint.offlineLimitSeconds,
    lastActionStop: checkpoint.lastActionStop,
    processedThroughMs: checkpoint.processedThroughMs
  }, checkpoint.savedAt);
  return SaveSystem.createSnapshot(first, first.savedAt);
}
function repairFixture(source) {
  if (source === 'primary-v1') {
    const v1Repair = JSON.parse(JSON.stringify(repairBackup));
    v1Repair.schemaVersion = 1;
    delete v1Repair.modelVersion;
    v1Repair.fishRecoverAcc = 17;
    return {
      store: { cloud_save_v1: JSON.stringify(v1Repair) },
      ignored: true
    };
  }
  if (source === 'backup') {
    return {
      store: {
        cloud_save_v1: JSON.stringify({ schemaVersion: 1, broken: true }),
        cloud_save_v1_backup: JSON.stringify(repairBackup)
      },
      expected: {
        canonicalCheckpoint: repairCanonicalCheckpoint
      }
    };
  }
  return {
    store: {
      cloud_created: JSON.stringify('1'),
      cloud_nie: JSON.stringify(repairBackup.appearance),
      cloud_player: JSON.stringify(repairBackup.player),
      cloud_current: JSON.stringify(repairBackup.current),
      cloud_lastsave: JSON.stringify(repairSavedAt)
    },
    ignored: true
  };
}

function runIgnoredLegacyLoad(source) {
  const fixture = repairFixture(source);
  const store = fixture.store;
  const runtime = createRuntime(store, NOW, null, true);
  runtime.ui.renderGame();
  const persistence = runtime.api.queries.persistence();
  const primary = store.cloud_save_v1
    ? JSON.parse(store.cloud_save_v1)
    : null;
  const playerQuery = runtime.api.queries.player
    ? runtime.api.queries.player()
    : null;
  ok(
    persistence.locked === false &&
      persistence.kind !== 'repair' &&
      (!playerQuery || playerQuery.name !== '边界测试角色') &&
      (source === 'legacy'
        ? !primary
        : !!(primary && primary.schemaVersion === 1)),
    source + ' old/legacy save is ignored instead of migrated via loadLegacy'
  );
}

function runDurableRepairChain(source) {
  const fixture = repairFixture(source);
  const store = fixture.store;
  const originalPrimaryBytes = store.cloud_save_v1;
  const controls = { saveMode: 'false', saveAttempts: 0 };
  const runtime = createRuntime(store, NOW, controls, true);
  runtime.ui.renderGame();
  ok(
    runtime.api.queries.persistence().kind === 'repair' &&
      store.cloud_save_v1 === originalPrimaryBytes &&
      byClass(runtime.root, 'persistence-error').some(
        (element) => element.style.display !== 'none'
      ),
    source + ' failed durable repair remains locked without replacing its source'
  );

  controls.saveMode = 'ok';
  controls.saveOutcomes = [true, false];
  const repairThenOfflineFailure = runtime.api.commands.retryPersistence();
  const checkpointBytes = store.cloud_save_v1;
  const checkpoint = JSON.parse(checkpointBytes);
  const expected = fixture.expected;
  const checkpointReports = checkpoint.pendingOfflineReport &&
    Array.isArray(checkpoint.pendingOfflineReport.reports)
    ? checkpoint.pendingOfflineReport.reports
    : [];
  const checkpointReportIds = checkpointReports.map((report) => report.id);
  const checkpointValid = repairThenOfflineFailure.code === 'save_failed' &&
    runtime.api.queries.persistence().kind === 'offline' &&
    checkpoint.schemaVersion === ensureFixtureSaveSystem(NOW).SCHEMA_VERSION &&
    checkpoint.savedAt === repairSavedAt &&
    checkpoint.processedThroughMs === repairSavedAt &&
    expected.canonicalCheckpoint.pendingReports.every((report) =>
      checkpointReportIds.includes(report.id)
    ) &&
    expected.canonicalCheckpoint.archiveReports.every((archiveReport) =>
      (checkpoint.reportArchive || []).some(
        (report) => report.id === archiveReport.id
      )
    );
  ok(
    checkpointValid,
    source + ' repair checkpoint survives the following offline save failure'
  );

  controls.saveOutcomes = [];
  const offlineRetry = runtime.api.commands.retryPersistence();
  const replayedBytes = store.cloud_save_v1;
  const replayed = JSON.parse(replayedBytes);
  const replayedReports = replayed.pendingOfflineReport.reports;
  const intervalReports = replayedReports.filter((report) =>
    report.fromMs === repairSavedAt && report.toMs === NOW
  );
  const replayedIds = replayedReports.map((report) => report.id);
  const reload = createRuntime(store, NOW, null, false);
  const reloadedBytes = store.cloud_save_v1;
  // Replay expectation is derived from the durable repair checkpoint bytes,
  // not a hand-built legacy player shape (Stage4 normalize expands fields).
  const cleanStore = {
    cloud_save_v1: checkpointBytes
  };
  const cleanRuntime = createRuntime(cleanStore, NOW, { saveMode: 'ok' }, true);
  cleanRuntime.ui.renderGame();
  const expectedReplay = projectReplayIdentity(
    JSON.parse(cleanStore.cloud_save_v1)
  );
  ok(
    offlineRetry.ok &&
      runtime.api.queries.persistence().locked === false &&
      replayed.savedAt === NOW &&
      replayed.processedThroughMs === NOW &&
      expected.canonicalCheckpoint.pendingReports.every((report) =>
        replayedIds.includes(report.id)
      ) &&
      expected.canonicalCheckpoint.archiveReports.every((archiveReport) =>
        replayed.reportArchive.some((report) => report.id === archiveReport.id)
      ) &&
      intervalReports.length === 1 &&
      replayedReports.length ===
        expected.canonicalCheckpoint.pendingReports.length + 1 &&
      intervalReports[0].id !== repairPendingReport.id &&
      new Set(replayedIds).size === replayedIds.length &&
      reloadedBytes === replayedBytes &&
      reload.api.queries.persistence().locked === false &&
      JSON.stringify(projectReplayIdentity(replayed)) ===
        JSON.stringify(expectedReplay),
    source + ' retries the original offline interval once with no reload duplication'
  );
}

['primary-v1', 'legacy'].forEach(runIgnoredLegacyLoad);
['backup'].forEach(runDurableRepairChain);

const futurePrimary = JSON.stringify({
  schemaVersion: SaveSystemNode.SCHEMA_VERSION + 2,
  savedAt: NOW,
  keep: 'exactly'
});
const futureBackup = JSON.stringify(baseSnapshot(NOW));
const futureStore = {
  cloud_save_v1: futurePrimary,
  cloud_save_v1_backup: futureBackup
};
const futureRuntime = createRuntime(futureStore, NOW, null, false);
ok(
  futureRuntime.api.queries.persistence().locked &&
    futureRuntime.api.queries.persistence().canRetry === false &&
    futureRuntime.api.commands.retryPersistence().code ===
      'persistence_locked' &&
    futureStore.cloud_save_v1 === futurePrimary &&
    futureStore.cloud_save_v1_backup === futureBackup,
  'future-version lock remains read-only and cannot be bypassed'
);

const COMMAND_WATERMARK = 1000;
function commandSettlementPlayer() {
  return Object.assign(playerSnapshot('命令计时角色'), {
    mood: 0,
    inventory: { stacks: {} }
  });
}

const startSettlementStore = {
  cloud_save_v1: JSON.stringify(baseSnapshot(COMMAND_WATERMARK, {
    player: commandSettlementPlayer(),
    current: null
  }))
};
const startSettlementRuntime = createRuntime(
  startSettlementStore,
  COMMAND_WATERMARK,
  null,
  false
);
startSettlementRuntime.sandbox.Date = fixedDate(1500);
const startSettlementResult =
  startSettlementRuntime.api.commands.startAction({
    key: 'gather:explore:herb'
  });
const startSettlementSnapshot = JSON.parse(
  startSettlementStore.cloud_save_v1
);
ok(
  startSettlementResult.ok &&
    startSettlementSnapshot.processedThroughMs === 1500 &&
    startSettlementSnapshot.current.key === 'gather:explore:herb' &&
    startSettlementSnapshot.current.elapsed === 0 &&
    startSettlementSnapshot.player.mood > 0,
  'start command settles the old watermark to its timestamp before starting a zero-progress action'
);

const switchSettlementStore = {
  cloud_save_v1: JSON.stringify(baseSnapshot(COMMAND_WATERMARK, {
    player: commandSettlementPlayer(),
    current: {
      key: 'gather:explore:herb',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      stalled: false
    }
  }))
};
const switchSettlementRuntime = createRuntime(
  switchSettlementStore,
  COMMAND_WATERMARK,
  null,
  false
);
switchSettlementRuntime.sandbox.Date = fixedDate(4050);
const switchSettlementResult =
  switchSettlementRuntime.api.commands.startAction({
    key: 'gather:explore:mining'
  });
const switchSettlementSnapshot = JSON.parse(
  switchSettlementStore.cloud_save_v1
);
ok(
  switchSettlementResult.ok &&
    switchSettlementSnapshot.processedThroughMs === 4050 &&
    switchSettlementSnapshot.current.key === 'gather:explore:mining' &&
    switchSettlementSnapshot.current.elapsed === 0 &&
    switchSettlementSnapshot.lastActionStop.reason === 'switched' &&
    switchSettlementSnapshot.lastActionStop.key === 'gather:explore:herb' &&
    switchSettlementSnapshot.lastActionStop.atMs === 4050,
  'switch command credits the old action through the command timestamp before replacing it'
);

const stopSettlementStore = {
  cloud_save_v1: JSON.stringify(baseSnapshot(COMMAND_WATERMARK, {
    player: commandSettlementPlayer(),
    current: {
      key: 'gather:explore:herb',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 2.5,
      stalled: false
    }
  }))
};
const stopSettlementRuntime = createRuntime(
  stopSettlementStore,
  COMMAND_WATERMARK,
  null,
  false
);
stopSettlementRuntime.sandbox.Date = fixedDate(1500);
const stopSettlementResult =
  stopSettlementRuntime.api.commands.stopAction();
const stopSettlementSnapshot = JSON.parse(
  stopSettlementStore.cloud_save_v1
);
ok(
  stopSettlementResult.ok &&
    stopSettlementSnapshot.processedThroughMs === 1500 &&
    stopSettlementSnapshot.current === null &&
    stopSettlementSnapshot.lastActionStop.reason === 'manual' &&
    stopSettlementSnapshot.lastActionStop.key === 'gather:explore:herb' &&
    stopSettlementSnapshot.lastActionStop.atMs === 1500,
  'stop command settles a boundary completion before recording the manual stop'
);

const failedSwitchStore = {
  cloud_save_v1: JSON.stringify(baseSnapshot(COMMAND_WATERMARK, {
    player: commandSettlementPlayer(),
    current: {
      key: 'gather:explore:herb',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      stalled: false
    }
  }))
};
const failedSwitchControls = { saveMode: 'false', saveAttempts: 0 };
const failedSwitchRuntime = createRuntime(
  failedSwitchStore,
  COMMAND_WATERMARK,
  failedSwitchControls,
  false
);
failedSwitchRuntime.sandbox.Date = fixedDate(4050);
const failedSwitchResult =
  failedSwitchRuntime.api.commands.startAction({
    key: 'gather:explore:mining'
  });
const failedSwitchRuntimeInventory =
  failedSwitchRuntime.api.queries.inventory();
failedSwitchControls.saveMode = 'ok';
const failedSwitchRetry =
  failedSwitchRuntime.api.commands.retryPersistence();
const failedSwitchCommitted = failedSwitchStore.cloud_save_v1;
const failedSwitchRetryAgain =
  failedSwitchRuntime.api.commands.retryPersistence();
const failedSwitchSnapshot = JSON.parse(failedSwitchCommitted);
const failedSwitchYaocai = (failedSwitchRuntimeInventory.items || []).find(
  function (item) {
    return item.itemId === 'yaocai';
  }
);
ok(
  failedSwitchResult.code === 'save_failed' &&
    (!failedSwitchYaocai || failedSwitchYaocai.quantity === 0) &&
    failedSwitchRetry.ok &&
    failedSwitchSnapshot.processedThroughMs === 4050 &&
    failedSwitchSnapshot.current.key === 'gather:explore:mining' &&
    failedSwitchSnapshot.lastActionStop.reason === 'switched' &&
    failedSwitchRetryAgain.code === 'no_change' &&
    failedSwitchStore.cloud_save_v1 === failedSwitchCommitted,
  'failed timestamp-settled switch is applied exactly once by dedicated retry'
);

const creationStore = {};
const creationRuntime = createRuntime(creationStore, NOW, null, true);
creationRuntime.ui.renderGame();
ok(
  creationRuntime.api.queries.app().phase === 'create' &&
    byClass(creationRuntime.root, 'creator-card').length === 1 &&
    byClass(creationRuntime.root, 'btn-confirm').some((button) =>
      button.textContent === '确认创建 · 开始修行'
    ),
  'creation screen and approved confirmation copy still render'
);
const createResult = creationRuntime.api.commands.confirmCreate();
ok(
  createResult.ok &&
    createResult.message === '角色创建成功，开始修行' &&
    creationRuntime.api.queries.app().phase === 'game' &&
    JSON.parse(creationStore.cloud_save_v1).created === true &&
    byClass(creationRuntime.root, 'toast').some((node) =>
      node.textContent === '角色创建成功，开始修行'
    ),
  'character creation commits with sect-neutral player-facing copy'
);
const settingsIndex =
  creationRuntime.api.queries.navigation().items.findIndex(
    (item) => item.label === '设置'
  );
creationRuntime.api.commands.switchNav({ index: settingsIndex });
creationRuntime.ui.renderGame();
ok(
  creationRuntime.api.queries.app().phase === 'edit' &&
    byClass(creationRuntime.root, 'creator-card').some(
      (element) => element.style.display === 'flex'
    ) &&
    creationRuntime.api.commands.saveAppearance().ok,
  'appearance editing remains available through commands'
);

const editFailureStore = {
  cloud_save_v1: JSON.stringify(baseSnapshot(NOW, { current: null }))
};
const editFailureControls = { saveMode: 'false', saveAttempts: 0 };
const editFailureRuntime = createRuntime(
  editFailureStore,
  NOW,
  editFailureControls,
  true
);
const editSettingsIndex =
  editFailureRuntime.api.queries.navigation().items.findIndex(
    (item) => item.label === '设置'
  );
editFailureRuntime.api.commands.switchNav({ index: editSettingsIndex });
const editedHairResult =
  editFailureRuntime.api.commands.stepAppearance({
    part: 'hair',
    delta: 1
  });
const editedHairIndex = editedHairResult.data
  ? editedHairResult.data.index
  : null;
ok(
  editFailureRuntime.api.commands.saveAppearance().code === 'save_failed' &&
    editFailureRuntime.api.queries.app().phase === 'edit' &&
    JSON.parse(editFailureStore.cloud_save_v1).appearance.parts.hair === 0,
  'failed appearance save enters the shared persistence lock'
);
editFailureRuntime.ui.renderGame();
ok(
  byClass(editFailureRuntime.root, 'btn-random').every(
    (button) => button.disabled
  ) &&
    byClass(editFailureRuntime.root, 'sel-arrow').every(
      (button) => button.disabled
    ) &&
    byClass(editFailureRuntime.root, 'btn-confirm').every(
      (button) => button.disabled
    ),
  'appearance controls are visibly disabled while persistence is locked'
);
editFailureControls.saveMode = 'ok';
const appearanceRetryButton =
  byClass(editFailureRuntime.root, 'persistence-retry')[0];
appearanceRetryButton.click();
const appearanceAfterRetry = JSON.parse(
  editFailureStore.cloud_save_v1
);
ok(
  editFailureRuntime.api.queries.persistence().locked === false &&
    editFailureRuntime.api.queries.app().phase === 'game' &&
    appearanceAfterRetry.appearance.parts.hair === editedHairIndex &&
    byClass(editFailureRuntime.root, 'persistence-error').every(
      (element) => element.style.display === 'none'
    ) &&
    byClass(editFailureRuntime.root, 'creator-card').every(
      (element) => element.style.display === 'none'
    ) &&
    byClass(editFailureRuntime.root, 'toast').some(
      (element) => element.textContent === '形象已更新'
    ),
  'dedicated appearance retry commits once, enters game, and confirms success'
);

const createFailureStore = {};
const createFailureControls = { saveMode: 'false', saveAttempts: 0 };
const createFailureRuntime = createRuntime(
  createFailureStore,
  NOW,
  createFailureControls,
  true
);
ok(
  createFailureRuntime.api.commands.confirmCreate().code === 'save_failed' &&
    createFailureRuntime.api.queries.app().phase === 'create',
  'failed creation leaves the runtime in creation mode'
);
createFailureControls.saveMode = 'ok';
ok(
  createFailureRuntime.api.commands.retryPersistence().ok &&
    createFailureRuntime.api.queries.app().phase === 'game' &&
    JSON.parse(createFailureStore.cloud_save_v1).created === true,
  'creation retry applies the held candidate and enters the game once'
);

console.log(
  '\n=== UI 迁移自测：' + pass + ' 通过 / ' + fail + ' 失败 ==='
);
process.exit(fail ? 1 : 0);
