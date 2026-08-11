'use strict';

const fs = require('fs');
const vm = require('vm');

let pass = 0;
let fail = 0;

function ok(condition, message) {
  if (condition) {
    pass++;
  } else {
    fail++;
    console.error('  ✗ FAIL: ' + message);
  }
}

function same(actual, expected, message) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), message +
    (JSON.stringify(actual) === JSON.stringify(expected)
      ? ''
      : '\n    actual: ' + JSON.stringify(actual) +
        '\n  expected: ' + JSON.stringify(expected)));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function bytes(value) {
  return JSON.stringify(value);
}

function deeplyFrozen(value, seen) {
  if (!value || typeof value !== 'object') return true;
  seen = seen || new Set();
  if (seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value) &&
    Object.keys(value).every((key) => deeplyFrozen(value[key], seen));
}

function containsForbiddenValue(value, seen) {
  if (typeof value === 'function') return true;
  if (!value || typeof value !== 'object') return false;
  seen = seen || new Set();
  if (seen.has(value)) return false;
  seen.add(value);
  const forbidden = [
    'state', 'model', 'persist', 'save', 'raw', 'content',
    'registry', 'rules', 'lanes'
  ];
  return Object.keys(value).some((key) =>
    forbidden.indexOf(key) >= 0 ||
    containsForbiddenValue(value[key], seen)
  );
}

function stubContext() {
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

function stubCanvas() {
  return {
    width: 420,
    height: 820,
    clientWidth: 420,
    clientHeight: 820,
    getContext() { return stubContext(); },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 420, height: 820 };
    }
  };
}

function fixedDate(now) {
  return class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() { return now; }
  };
}

const SCRIPT_ORDER = [
  'content/herblore-parity.js',
  'content/materials.js',
  'content/item-art.js',
  'content/items.js',
  'content/life-skills.js',
  'content/gathering.js',
  'content/recipes.js',
  'content/homestead.js',
  'content/combat.js',
  'content/techniques.js',
  'content/realms.js',
  'content/equipment.js',
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
];

const NOW = 1700000000000;

function createRuntime(options) {
  options = options || {};
  const now = options.now == null ? NOW : options.now;
  const store = options.store || {};
  const controls = { saveAttempts: 0, saveMode: 'ok' };
  const canvas = stubCanvas();
  const document = {
    hidden: false,
    getElementById(id) {
      return id === 'game' ? canvas : null;
    },
    createElement(tag) {
      return tag === 'canvas' ? stubCanvas() : {
        style: {},
        appendChild() {},
        addEventListener() {}
      };
    },
    addEventListener() {}
  };
  const platform = new Proxy({}, {
    get(target, property) {
      if (property === 'canvas') return canvas;
      if (property === 'ctx') return stubContext();
      if (property === 'view') {
        return {
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          safeTop: 0,
          dpr: 1,
          logicalH: 820
        };
      }
      if (property === 'load') {
        return (key) => key in store ? clone(store[key]) : null;
      }
      if (property === 'save') {
        return (key, value) => {
          if (key === 'cloud_save_v1') controls.saveAttempts++;
          if (controls.saveMode === 'false') return false;
          if (controls.saveMode === 'throw') {
            throw new Error('storage unavailable');
          }
          store[key] = clone(value);
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
      if (property === 'createCanvas') return stubCanvas;
      if (property === 'getSystemInfoAsync') {
        return (callbacks) => {
          if (callbacks && callbacks.success) {
            callbacks.success({ pixelRatio: 1, safeArea: { top: 0 } });
          }
        };
      }
      return () => {};
    }
  });
  const sandbox = {
    __GAME_TEST_HARNESS_REQUEST__: true,
    Platform: platform,
    document,
    console,
    Math,
    Date: fixedDate(now),
    isFinite,
    isNaN,
    parseInt,
    parseFloat,
    structuredClone,
    requestAnimationFrame() {},
    setTimeout() { return 0; },
    clearTimeout() {},
    addEventListener() {}
  };
  sandbox.window = {
    addEventListener() {},
    NIE_ASSET_BASE: '',
    devicePixelRatio: 1
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('nie-manifest.js', 'utf8'), sandbox, {
    filename: 'nie-manifest.js'
  });
  SCRIPT_ORDER.forEach((file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, {
      filename: file
    });
  });
  vm.runInContext(fs.readFileSync('game.js', 'utf8'), sandbox, {
    filename: 'game.js'
  });
  const harness = sandbox.__GameTestHarness;

  function freshModel() {
    const model = clone(harness.__test.snapshotModel());
    const stage2 = clone(sandbox.Stage2State.createDefaults());
    const stage3 = clone(sandbox.Stage3State.defaults());
    model.created = true;
    model.player = Object.assign(
      {},
      clone(harness.defaultPlayer()),
      stage2.player,
      stage3.player
    );
    model.systems = Object.assign({}, stage2.systems, stage3.systems);
    model.current = null;
    model.rngState = 123456789;
    model.pendingOfflineReports = [];
    model.reportArchive = [];
    model.processedThroughMs = now;
    model.lastActionStop = null;
    model.player.shouMax = 1000000;
    model.player.shouyuan = 1000000;
    model.player.lifespanAnchorMs = null;
    model.player.lifespanBaseYears = null;
    return clone(sandbox.Stage3State.normalize(model));
  }

  function replaceModel(model) {
    harness.__test.replaceModel(model);
    controls.saveAttempts = 0;
  }

  return {
    sandbox,
    api: sandbox.window.GameAPI,
    harness,
    controls,
    freshModel,
    replaceModel,
    snapshot() {
      return clone(harness.__test.snapshotModel());
    }
  };
}

function commandShape(result) {
  return result &&
    typeof result.ok === 'boolean' &&
    typeof result.code === 'string' &&
    typeof result.changed === 'boolean' &&
    Object.prototype.hasOwnProperty.call(result, 'message') &&
    Object.prototype.hasOwnProperty.call(result, 'data') &&
    deeplyFrozen(result) &&
    !containsForbiddenValue(result);
}

function addSecondLoadout(model) {
  const second = clone(model.player.combat.loadouts[0]);
  second.id = 'loadout-2';
  second.name = '方案二';
  model.player.combat.loadouts.push(second);
  model.player.combat.nextLoadoutId = 3;
  return model;
}

const runtime = createRuntime();
const API = runtime.api;

const stage1And2Queries = [
  'app', 'navigation', 'top', 'home', 'inventory', 'itemInfo', 'breakModal',
  'skillPage', 'gatherPage', 'homestead', 'charm', 'offline',
  'events', 'persistence'
];
const stage3Queries = [
  'combat', 'combatLoadouts', 'combatParty', 'equipmentInfo',
  'techniques', 'breakthrough'
];
const stage4Queries = [
  'relationships', 'relationship', 'social', 'sects', 'sect', 'world'
];
const stage5Queries = ['inheritanceHall', 'legacyTransition'];
const stage1And2Commands = [
  'randomizeAppearance', 'stepAppearance', 'confirmCreate',
  'saveAppearance', 'switchNav', 'openBreak', 'closeBreak',
  'attemptBreak', 'startAction', 'stopAction', 'sellItem', 'useItem', 'plant',
  'plantAll', 'harvest', 'equipFormation', 'unequipFormation',
  'setActiveBeast',
  'acknowledgeOffline', 'enterLegacyRebirth', 'retryPersistence',
  'expandInventory', 'closeLifespanBuffer'
];
const stage3Commands = [
  'consumeTechniqueBook',
  'createCombatLoadout',
  'renameCombatLoadout',
  'deleteCombatLoadout',
  'setActiveCombatLoadout',
  'setEquipment',
  'equipEquipment',
  'unequipEquipment',
  'enhanceEquipment',
  'reforgeEquipment',
  'salvageEquipment',
  'sellEquipment',
  'setEquipmentFavorite',
  'setSupply',
  'setCombatCompanion',
  'setActiveTechnique',
  'setPassiveTechnique',
  'claimCombatLoot',
  'treatInjury',
  'attemptBreakthrough'
];
const stage4Commands = [
  'startSocial', 'chooseEvent', 'markEventSectionRead'
];
const stage5Commands = [
  'proposeLineageRitual',
  'setInheritancePlan',
  'beginLegacyTransition',
  'chooseLegacyRoute',
  'updateNewIdentityDraft',
  'confirmLegacyTransition',
  'cancelLegacyTransition'
];

ok(Object.isFrozen(API) &&
   Object.isFrozen(API.queries) &&
   Object.isFrozen(API.commands) &&
   Object.isFrozen(API.render),
  'GameAPI and all public boundaries are frozen');
same(Object.keys(API), ['queries', 'commands', 'render'],
  'GameAPI preserves exactly the three public boundaries');
ok(!('state' in API) && !('data' in API) && !('persist' in API) &&
   !('save' in API) && !('__test' in API),
  'GameAPI exposes no state, data, persistence, or test seam');
same(
  Object.keys(API.queries).sort(),
  stage1And2Queries.concat(
    stage3Queries,
    stage4Queries,
    stage5Queries
  ).sort(),
  'query surface preserves Stage 1B-4 and adds Stage 5 queries'
);
same(
  Object.keys(API.commands).sort(),
  stage1And2Commands.concat(
    stage3Commands,
    stage4Commands,
    stage5Commands
  ).sort(),
  'command surface preserves Stage 1B-4 and adds Stage 5 commands'
);
same(Object.keys(API.render), ['drawCharacter'],
  'render surface is unchanged');
ok(!('addEventBuff' in API.commands) &&
   !('recordExternalGate' in API.commands) &&
   !('recordGate' in API.commands),
  'no event-buff or gate-completion command is public');

const stage3ApiReady = stage3Queries.every(
  (name) => typeof API.queries[name] === 'function'
) && stage3Commands.every(
  (name) => typeof API.commands[name] === 'function'
);

if (stage3ApiReady) {
  // Pure query delegation, exact reserved cards, frozen detachment, and
  // stable unknown-tab behavior.
  {
    const model = runtime.freshModel();
    runtime.replaceModel(model);
    const regions = API.queries.combat({ tab: 'regions' });
    const dungeons = API.queries.combat({ tab: 'dungeons' });
    ok(regions.tab === 'regions' && regions.regions.length === 9 &&
       dungeons.tab === 'dungeons' && dungeons.dungeons.length === 9,
      'combat query delegates all nine region and dungeon cards');
    same(API.queries.combat({ tab: 'sectTrial' }), null,
      'sect-trial tab is removed and returns null');
    same(API.queries.combat({ tab: 'specialRealm' }), null,
      'special-realm tab is removed and returns null');
    same(API.queries.combat({ tab: 'unknown' }), null,
      'unknown combat tab has stable null fallback');
    ok(deeplyFrozen(regions) && deeplyFrozen(dungeons),
      'all combat query results are deeply frozen');

    const before = bytes(API.queries.combat({ tab: 'regions' }));
    try {
      regions.regions[0].enemies[0].stats.hp = -1;
      regions.regions.push({});
    } catch (_) {}
    ok(bytes(API.queries.combat({ tab: 'regions' })) === before,
      'nested combat query mutation cannot affect the next query');
  }

  // Condition editors receive only canonical IDs that the current combat
  // content can create. Invalid free-text IDs fail before save, while a saved
  // canonical status condition executes through the real combat selector.
  {
    const model = runtime.freshModel();
    model.player.techniques.known.cloudPiercingSword = {
      level: 1,
      xp: 0
    };
    runtime.replaceModel(model);
    const loadouts = API.queries.combatLoadouts();
    same(loadouts.conditionOptions, {
      enemyHasStatus: [
        { id: 'shock', label: '震慑' },
        { id: 'slow', label: '迟缓' },
        { id: 'burn', label: '灼烧' },
        { id: 'poison', label: '中毒' }
      ],
      enemyMissingStatus: [
        { id: 'shock', label: '震慑' },
        { id: 'slow', label: '迟缓' },
        { id: 'burn', label: '灼烧' },
        { id: 'poison', label: '中毒' },
        { id: 'weaken', label: '虚弱' }
      ],
      selfMissingBuff: [
        { id: 'haste', label: '迅捷' },
        { id: 'shield', label: '护盾' },
        { id: 'inspire', label: '鼓舞' },
        { id: 'guard', label: '替伤' }
      ]
    }, 'loadout ViewModel exposes only triggerable canonical condition values');

    const beforeInvalid = bytes(runtime.snapshot());
    runtime.controls.saveAttempts = 0;
    const invalid = API.commands.setActiveTechnique({
      loadoutId: 'loadout-1',
      slotIndex: 0,
      techniqueId: 'cloudPiercingSword',
      condition: { type: 'enemyHasStatus', statusId: 'notARealStatus' }
    });
    ok(
      commandShape(invalid) &&
        !invalid.ok &&
        invalid.code === 'invalid_argument' &&
        !invalid.changed &&
        runtime.controls.saveAttempts === 0 &&
        bytes(runtime.snapshot()) === beforeInvalid,
      'noncanonical status text cannot be saved through the public API'
    );

    const configured = API.commands.setActiveTechnique({
      loadoutId: 'loadout-1',
      slotIndex: 0,
      techniqueId: 'cloudPiercingSword',
      condition: { type: 'enemyHasStatus', statusId: 'shock' }
    });
    const started = API.commands.startAction({
      key: 'combat:region:qingyunOutskirts:thornHare'
    });
    const active = runtime.snapshot();
    active.systems.combat.session.enemy.statuses.shock = {
      remainingTicks: 8,
      skipNextAction: true
    };
    runtime.replaceModel(active);
    runtime.harness.__test.advanceRuntime(NOW, NOW + 250, 'online', null);
    const afterTick = runtime.snapshot();
    ok(
      configured.ok &&
        configured.changed &&
        started.ok &&
        afterTick.player.combat.loadouts[0]
          .activeTechniques[0].condition.statusId === 'shock' &&
        afterTick.systems.combat.session.lastPlayerAction.id ===
          'cloudPiercingSword',
      'a saved canonical status condition triggers through real combat'
    );
  }

  // Stage 3 ViewModels provide a complete player-facing label layer. Raw IDs
  // remain command values only and never need to be rendered.
  {
    const model = runtime.freshModel();
    model.player.inventory.stacks.grilledCarp = 1;
    model.player.combat.loadouts[0].supplies.food = {
      itemId: 'grilledCarp',
      triggerRatio: 0.5,
      stopWhenEmpty: false
    };
    model.player.techniques.known.cloudPiercingSword = {
      level: 1,
      xp: 0
    };
    model.player.techniques.known.thunderSeal = {
      level: 1,
      xp: 0
    };
    model.player.techniques.known.steadyBreath = {
      level: 1,
      xp: 0
    };
    model.player.breakthrough.realmId = 'qi-9';
    model.player.breakthrough.cultivation = 3000;
    model.player.combatProgress.completedGates[
      'clear:foundationAltar:1'
    ] = true;
    model.player.inventory.stacks.foundationPill = 1;
    runtime.replaceModel(model);

    const regions = API.queries.combat({ tab: 'regions' });
    const dungeons = API.queries.combat({ tab: 'dungeons' });
    const loadout = API.queries.combatLoadouts().plans[0];
    const techniqueRows = API.queries.techniques().techniques;
    const cloud = techniqueRows.find((row) =>
      row.id === 'cloudPiercingSword'
    );
    const thunder = techniqueRows.find((row) => row.id === 'thunderSeal');
    const steady = techniqueRows.find((row) => row.id === 'steadyBreath');
    const breakthrough = API.queries.breakthrough();
    same(
      [...new Set(dungeons.dungeons.flatMap((dungeon) =>
        dungeon.waves.map((wave) => wave.rankLabel)
      ))].sort(),
      ['普通', '精英', '首领'],
      'enemy ranks expose complete Chinese labels'
    );
    ok(
      regions.regions[0].enemies[0].rankLabel === '普通' &&
        loadout.supplies.find((row) => row.slot === 'food').name ===
          '烤灵鲤' &&
        bytes(cloud.tagLabels) === bytes(['剑诀']) &&
        cloud.effectText === '造成 170% 攻击伤害 · 无视 25% 防御' &&
        thunder.effectText ===
          '造成 150% 攻击伤害 · 25% 概率施加震慑 2 秒' &&
        steady.effectText === '真气上限 +12%' &&
        breakthrough.pill &&
        breakthrough.pill.name === '筑基丹',
      'combat supplies, techniques, effects, and breakthrough pills have labels'
    );

    const start = API.commands.startAction({
      key: 'combat:region:qingyunOutskirts:thornHare'
    });
    ok(
      start.message === '开始：青云山麓 · 棘刺兔' &&
        start.message.indexOf('qingyunOutskirts') < 0 &&
        start.message.indexOf('thornHare') < 0,
      'start-action feedback reuses the resolved combat action name'
    );
  }

  // Immediate reports have command semantics rather than masquerading as
  // offline duration reports, and command action keys resolve to Chinese.
  {
    const model = runtime.freshModel();
    runtime.replaceModel(model);
    const created = API.commands.createCombatLoadout({ name: '方案2' });
    const report = API.queries.events().offlineReports.find((row) =>
      row.id === created.data.reportId
    );
    ok(
      report &&
        report.source === 'command' &&
        report.title === '操作记录' &&
        report.durationSeconds === 0 &&
        report.immediate === true &&
        report.durationLabel === '即时完成' &&
        report.action.label === '新建战斗方案' &&
        report.action.label.indexOf('command:') < 0,
      'immediate command reports expose correct source, title, duration, and action semantics'
    );
  }

  // Both implemented combat tabs carry one authoritative, detached combat
  // status projection. Queries remain pure even though claimPending computes a
  // candidate state internally.
  {
    const model = runtime.freshModel();
    model.player.inventory.capacity = 40;
    model.player.inventory.stacks = { healingPill: 2 };
    Object.keys(runtime.sandbox.ItemContent.ITEMS)
      .filter((itemId) =>
        ['brokenFang', 'grilledCarp', 'healingPill'].indexOf(itemId) < 0
      )
      .slice(0, 39)
      .forEach((itemId) => {
        model.player.inventory.stacks[itemId] = 1;
      });
    model.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 1200,
      totalSeconds: 1800
    };
    model.player.inventory.bindings.healingPill = {
      equipment: 0,
      task: 1,
      formation: 0
    };
    model.systems.combat.pendingLoot = {
      id: 'combat-loot-1',
      source: { type: 'enemy', id: 'thornHare' },
      items: { brokenFang: 2, grilledCarp: 1 },
      currency: 0,
      createdAtMs: NOW
    };
    model.systems.combat.nextLootId = 2;
    runtime.replaceModel(model);
    const before = bytes(runtime.snapshot());
    const regions = API.queries.combat({ tab: 'regions' });
    const dungeons = API.queries.combat({ tab: 'dungeons' });
    const expectedPending = {
      id: 'combat-loot-1',
      source: { type: 'enemy', id: 'thornHare' },
      items: { brokenFang: 2, grilledCarp: 1 },
      itemRows: [
        { id: 'brokenFang', name: '断裂兽牙', count: 2 },
        { id: 'grilledCarp', name: '烤灵鲤', count: 1 }
      ],
      currency: 0,
      createdAtMs: NOW,
      requiredFreeSlots: 2,
      canClaim: false
    };
    const expectedInjury = {
      id: 'severe-injury',
      remainingSeconds: 1200,
      treatment: {
        itemId: 'healingPill',
        owned: 1,
        available: true
      }
    };
    same(regions.pendingLoot, expectedPending,
      'regions expose canonical pending loot plus authoritative capacity status');
    same(dungeons.pendingLoot, expectedPending,
      'dungeons expose the same canonical pending loot projection');
    same(regions.injury, expectedInjury,
      'regions expose canonical injury and usable treatment quantity');
    same(dungeons.injury, expectedInjury,
      'dungeons expose the same canonical injury projection');
    ok(
      deeplyFrozen(regions.pendingLoot) &&
      deeplyFrozen(regions.injury) &&
      !containsForbiddenValue(regions.pendingLoot) &&
      !containsForbiddenValue(regions.injury),
      'combat status projections are recursively frozen and capability-free'
    );
    try {
      regions.pendingLoot.items.brokenFang = 999;
      regions.injury.treatment.owned = 999;
    } catch (_) {}
    same(API.queries.combat({ tab: 'regions' }).pendingLoot, expectedPending,
      'pending-loot mutation cannot affect model or later queries');
    same(API.queries.combat({ tab: 'regions' }).injury, expectedInjury,
      'injury mutation cannot affect model or later queries');
    ok(runtime.controls.saveAttempts === 0 &&
       bytes(runtime.snapshot()) === before,
      'combat status queries do not save or mutate state/report/RNG');
  }

  {
    const model = runtime.freshModel();
    model.player.inventory.capacity = 1;
    model.player.inventory.stacks = { brokenFang: 1 };
    model.systems.combat.pendingLoot = {
      id: 'combat-loot-1',
      source: { type: 'enemy', id: 'thornHare' },
      items: { brokenFang: 2 },
      currency: 0,
      createdAtMs: NOW
    };
    model.systems.combat.nextLootId = 2;
    runtime.replaceModel(model);
    const pending = API.queries.combat({ tab: 'regions' }).pendingLoot;
    same(pending, {
      id: 'combat-loot-1',
      source: { type: 'enemy', id: 'thornHare' },
      items: { brokenFang: 2 },
      itemRows: [
        { id: 'brokenFang', name: '断裂兽牙', count: 2 }
      ],
      currency: 0,
      createdAtMs: NOW,
      requiredFreeSlots: 0,
      canClaim: true
    }, 'existing inventory stacks make pending loot immediately claimable');
  }

  {
    const model = runtime.freshModel();
    model.player.inventory.stacks.cloudwoodSword = 1;
    model.player.inventory.stacks.grilledCarp = 2;
    model.player.inventory.stacks[
      'techniqueBook:cloudPiercingSword'
    ] = 1;
    runtime.replaceModel(model);
    const loadouts = API.queries.combatLoadouts();
    const techniques = API.queries.techniques();
    const breakthrough = API.queries.breakthrough();
    ok(Array.isArray(loadouts.plans) && loadouts.plans.length === 1 &&
       loadouts.plans[0].activeTechniques.length === 3 &&
       loadouts.plans[0].passiveTechniques.length === 5 &&
       loadouts.plans[0].supplies.length === 3 &&
       loadouts.currentDerivedStats.maxHp >= 1,
      'combat-loadout query includes plans, slots, supplies, and derived stats ' +
        JSON.stringify(loadouts));
    ok(Array.isArray(techniques.learned) &&
       Array.isArray(techniques.unlearned) &&
       techniques.learned.length === 0 &&
       techniques.unlearned.length === 77 &&
       techniques.unlearned.some((row) =>
         row.id === 'cloudPiercingSword' &&
         row.ownedBooks === 1 &&
         row.sectModifiers.xpCostMultiplier === 1),
      'technique query separates learned/unlearned rows with book and sect data ' +
        JSON.stringify(techniques));
    ok(breakthrough.currentRealm &&
       breakthrough.nextRealm &&
       breakthrough.gate &&
       breakthrough.currentRealm.id === 'qi-1' &&
       breakthrough.nextRealm.id === 'qi-2' &&
       breakthrough.cultivation === 0 &&
       breakthrough.gate.progress.current === 0 &&
       breakthrough.gate.progress.required === 3 &&
       breakthrough.baseChance === 1 &&
       breakthrough.finalChance === 1 &&
       breakthrough.failureConsequence.gateRetained,
      'breakthrough query delegates realm/chance and adds permanent gate progress ' +
        JSON.stringify(breakthrough));
    [loadouts, techniques, breakthrough].forEach((view) => {
      ok(deeplyFrozen(view) && !containsForbiddenValue(view),
        'Stage 3 query is detached, frozen, and contains no raw capability');
    });
    const before = [
      bytes(API.queries.combatLoadouts()),
      bytes(API.queries.techniques()),
      bytes(API.queries.breakthrough())
    ];
    try {
      loadouts.plans[0].name = 'mutated';
      techniques.unlearned[0].effect.damage = 999;
      breakthrough.gate.progress.current = 999;
    } catch (_) {}
    same([
      bytes(API.queries.combatLoadouts()),
      bytes(API.queries.techniques()),
      bytes(API.queries.breakthrough())
    ], before, 'nested mutation never leaks through Stage 3 queries');

    const completed = runtime.freshModel();
    completed.player.combatProgress.completedGates[
      'kill:thornHare:3'
    ] = true;
    runtime.replaceModel(completed);
    const completedGate = API.queries.breakthrough().gate;
    ok(completedGate &&
       completedGate.completed &&
       completedGate.progress.current === completedGate.progress.required,
      'permanent completed gate displays full progress even after migration');
  }

  {
    const model = runtime.freshModel();
    model.player.inventory.stacks = {
      cloudwoodSword: 1,
      blackIronSword: 1,
      scarletCoreBlade: 1,
      cloudRobe: 1,
      breathJade: 1,
      grilledCarp: 2,
      shrimpSoup: 1,
      healingPill: 2,
      wardTalisman: 2,
      healingTalisman: 1,
      copperOre: 3,
      foundationPill: 1,
      craftingFormation: 1
    };
    model.player.inventory.bindings = {
      blackIronSword: {
        equipment: 1,
        task: 0,
        formation: 0
      },
      scarletCoreBlade: {
        equipment: 0,
        task: 1,
        formation: 0
      },
      shrimpSoup: {
        equipment: 0,
        task: 1,
        formation: 0
      },
      healingTalisman: {
        equipment: 0,
        task: 1,
        formation: 0
      }
    };
    model.player.combat.loadouts[0].equipment.weapon =
      'blackIronSword';
    model.player.combat.loadouts[0].supplies.pill = {
      itemId: 'qiGatheringPill',
      triggerRatio: 0.3,
      stopWhenEmpty: false
    };
    runtime.replaceModel(model);
    const before = bytes(runtime.snapshot());
    const view = API.queries.combatLoadouts();
    const plan = view.plans[0] || {
      id: null,
      equipment: [],
      supplies: []
    };
    const equipmentOptions = {};
    plan.equipment.forEach((row) => {
      equipmentOptions[row.slot] = (row.options || []).map(
        (option) => option.itemId
      );
    });
    const supplyOptions = {};
    plan.supplies.forEach((row) => {
      supplyOptions[row.slot] = (row.options || []).map(
        (option) => option.itemId
      );
    });
    same(equipmentOptions, {
      weapon: [
        'legacy-cloudwoodSword-1',
        'legacy-blackIronSword-1',
        'legacy-scarletCoreBlade-1'
      ],
      head: [],
      robe: ['legacy-cloudRobe-1'],
      bracer: [],
      belt: [],
      boots: [],
      accessory: ['legacy-breathJade-1'],
      artifact: []
    }, 'equipment options expose only authoritative items for each exact slot');
    same(supplyOptions, {
      food: ['grilledCarp'],
      pill: ['healingPill', 'qiGatheringPill'],
      talisman: ['wardTalisman']
    }, 'supply options expose only authoritative items for each exact type');
    const pillRow = plan.supplies.find((row) => row.slot === 'pill');
    const unownedPill = pillRow && (pillRow.options || [])
      .find((option) => option.itemId === 'qiGatheringPill');
    ok(unownedPill &&
       unownedPill.selected === true &&
       unownedPill.quantity === 0 &&
       unownedPill.available === 0 &&
       plan.equipment[0] &&
       deeplyFrozen(plan.equipment[0].options) &&
       plan.supplies[0] &&
       deeplyFrozen(plan.supplies[0].options),
      'selected but temporarily unowned supply options remain representable');
    ok(runtime.controls.saveAttempts === 0 &&
       bytes(runtime.snapshot()) === before,
      'loadout option queries do not save or mutate state/report/RNG');

    const optionCommandResults = [];
    plan.equipment.forEach((row) => {
      (row.options || []).forEach((option) => {
        runtime.replaceModel(clone(model));
        optionCommandResults.push(API.commands.setEquipment({
          loadoutId: plan.id,
          slot: row.slot,
          itemId: option.itemId
        }));
      });
    });
    plan.supplies.forEach((row) => {
      (row.options || []).forEach((option) => {
        runtime.replaceModel(clone(model));
        optionCommandResults.push(API.commands.setSupply({
          loadoutId: plan.id,
          slot: row.slot,
          config: row.slot === 'talisman'
            ? {
              itemId: option.itemId,
              useAt: 'enemy_start',
              stopWhenEmpty: false
            }
            : {
              itemId: option.itemId,
              triggerRatio: row.slot === 'food' ? 0.5 : 0.3,
              stopWhenEmpty: false
            }
        }));
      });
    });
    ok(optionCommandResults.length === 9 &&
       optionCommandResults.every((result) => result.ok),
      'every offered equipment and supply option succeeds through its public command');
  }

  // Optional breakthrough selection previews are strict, authoritative, pure,
  // and preserve the no-argument query contract.
  {
    const model = runtime.freshModel();
    model.player.breakthrough.realmId = 'qi-9';
    model.player.breakthrough.cultivation = 3000;
    model.player.combatProgress.completedGates[
      'clear:foundationAltar:1'
    ] = true;
    model.player.inventory.stacks.foundationPill = 2;
    runtime.replaceModel(model);
    const before = bytes(runtime.snapshot());
    const noArgument = API.queries.breakthrough();
    const zero = API.queries.breakthrough({
      pillItemId: null,
      quantity: 0
    });
    const one = API.queries.breakthrough({
      pillItemId: 'foundationPill',
      quantity: 1
    });
    const two = API.queries.breakthrough({
      pillItemId: 'foundationPill',
      quantity: 2
    });
    ok(noArgument.pill.selected === 0 &&
       noArgument.pill.bonus === 0 &&
       noArgument.finalChance === 0.6 &&
       bytes(noArgument) === bytes(zero),
      'no-argument breakthrough query preserves the zero-pill projection');
    same([
      one.pill.selected,
      one.pill.bonus,
      one.finalChance,
      two.pill.selected,
      two.pill.bonus,
      two.finalChance
    ], [1, 0.2, 0.8, 2, 0.4, 1],
    'selected-pill previews delegate exact 0/1/2 arrays to Breakthrough.query');
    [noArgument, zero, one, two].forEach((view) => {
      ok(deeplyFrozen(view) && !containsForbiddenValue(view),
        'breakthrough selection preview is frozen and capability-free');
    });
    [
      { pillItemId: 'goldCorePill', quantity: 1 },
      { pillItemId: 'foundationPill', quantity: 3 },
      { pillItemId: 'foundationPill', quantity: -1 },
      { pillItemId: null, quantity: 1 },
      { pillItemId: 'foundationPill', quantity: 0 },
      { pillItemId: 'foundationPill', quantity: 1, extra: true }
    ].forEach((input) => {
      same(API.queries.breakthrough(input), {
        ok: false,
        code: 'invalid_argument'
      }, 'invalid breakthrough preview fails closed: ' + JSON.stringify(input));
    });
    ok(runtime.controls.saveAttempts === 0 &&
       bytes(runtime.snapshot()) === before,
      'breakthrough previews do not save or mutate state/report/RNG');
  }

  // Combat continues to start through commands.startAction({key}); active
  // query contains only detached battle telemetry.
  {
    const model = runtime.freshModel();
    runtime.replaceModel(model);
    const started = API.commands.startAction({
      key: 'combat:region:qingyunOutskirts:thornHare'
    });
    const view = API.queries.combat({ tab: 'regions' });
    ok(commandShape(started) && started.ok && started.changed &&
       runtime.controls.saveAttempts === 1,
      'combat starts through the preserved startAction command and saves once');
    ok(view.active &&
       view.active.enemy &&
       view.active.mode === 'region' &&
       view.active.currentAction === null &&
       view.active.player.hp === view.active.player.maxHp &&
       view.active.player.qi === view.active.player.maxQi &&
       Number.isSafeInteger(view.active.player.cooldownTicks) &&
       view.active.player.techniqueCooldowns &&
       view.active.enemy.id === 'thornHare' &&
       Number.isSafeInteger(view.active.enemy.cooldownTicks) &&
       view.active.wave.index === 0 &&
       view.active.phase.index === 0,
      'active combat query exposes HP, Qi, cooldown, wave, and phase telemetry');
    ok(deeplyFrozen(view.active) && !containsForbiddenValue(view.active),
      'active combat telemetry is detached and frozen');
  }

  {
    const model = runtime.freshModel();
    model.player.techniques.known.cloudPiercingSword = {
      level: 1,
      xp: 0
    };
    model.player.combat.loadouts[0].activeTechniques[0] = {
      techniqueId: 'cloudPiercingSword',
      condition: { type: 'always' }
    };
    runtime.replaceModel(model);
    const started = API.commands.startAction({
      key: 'combat:region:qingyunOutskirts:thornHare'
    });
    const beforeFirstTick = API.queries.combat({ tab: 'regions' });
    runtime.harness.__test.advanceRuntime(NOW, NOW + 250, 'online', null);
    const beforeQuery = bytes(runtime.snapshot());
    runtime.controls.saveAttempts = 0;
    const view = API.queries.combat({ tab: 'regions' });
    same(beforeFirstTick.active.currentAction, null,
      'active combat exposes no current action before the first executed tick');
    same(view.active.currentAction, {
      id: 'cloudPiercingSword',
      name: '穿云破岳剑',
      slotIndex: 0,
      tick: 0
    }, 'active combat exposes the persisted technique that actually executed');
    ok(started.ok &&
       view.active.player.cooldownTicks > 0 &&
       view.active.player.techniqueCooldowns.cloudPiercingSword > 0 &&
       deeplyFrozen(view.active.currentAction) &&
       !containsForbiddenValue(view.active.currentAction),
      'actual combat action remains visible through cooldown and is detached');
    try {
      view.active.currentAction.id = 'mutated';
      view.active.currentAction.name = 'mutated';
    } catch (_) {}
    same(API.queries.combat({ tab: 'regions' }).active.currentAction, {
      id: 'cloudPiercingSword',
      name: '穿云破岳剑',
      slotIndex: 0,
      tick: 0
    }, 'actual-action mutation cannot affect later combat queries');
    ok(runtime.controls.saveAttempts === 0 &&
       bytes(runtime.snapshot()) === beforeQuery,
      'actual-action queries do not save or mutate state/report/RNG');
  }

  // Report ViewModels retain the complete normalized Stage 3 telemetry while
  // resolving player-facing combat names.
  {
    const model = runtime.freshModel();
    const report = clone(runtime.sandbox.SimulationReport.create());
    report.source = 'offline';
    report.fromMs = NOW - 1000;
    report.toMs = NOW;
    report.requestedSeconds = 1;
    report.action.key = 'combat:region:qingyunOutskirts:thornHare';
    report.action.completed = 2;
    report.combat = {
      ticks: 4,
      enemiesDefeated: { thornHare: 2 },
      dungeonClears: { breathCave: 1 },
      damageDealt: 18,
      damageTaken: 7,
      suppliesUsed: { grilledCarp: 1 },
      loot: { brokenFang: 3 },
      pendingLootId: 'combat-loot-9',
      retreatReason: 'player_defeated'
    };
    report.techniques = {
      xp: { cloudPiercingSword: 5 }
    };
    const dungeonReport = clone(report);
    dungeonReport.id = 'combat-dungeon-report';
    dungeonReport.source = 'online';
    dungeonReport.action.key = 'combat:dungeon:breathCave';
    model.pendingOfflineReports = [report];
    model.reportArchive = [report, dungeonReport];
    runtime.replaceModel(model);

    const offline = API.queries.offline();
    const eventLabels = API.queries.events().offlineReports.map(
      (row) => row.action.label
    );
    same(offline.reports[0].combat, report.combat,
      'offline report exposes the complete normalized combat telemetry');
    same(offline.reports[0].techniques, report.techniques,
      'offline report exposes the complete normalized technique telemetry');
    same(offline.summary.combat, report.combat,
      'offline summary exposes the complete aggregated combat telemetry');
    same(offline.summary.techniques, report.techniques,
      'offline summary exposes the complete aggregated technique telemetry');
    ok(
      offline.reports[0].action.label === '青云山麓 · 棘刺兔' &&
        eventLabels.indexOf('青云山麓 · 棘刺兔') >= 0 &&
        eventLabels.indexOf('聚气洞') >= 0,
      'online/offline report action labels resolve combat region and enemy names ' +
        JSON.stringify({
          offline: offline.reports[0].action.label,
          events: eventLabels
        })
    );
  }

  // Preserved legacy breakthrough entry points must run the same canonical
  // Stage 3 transaction. The default seed deterministically fails at 63.2%.
  {
    function readyFoundationModel() {
      const model = runtime.freshModel();
      model.player.breakthrough.realmId = 'qi-9';
      model.player.breakthrough.cultivation = 3000;
      model.player.combatProgress.completedGates[
        'clear:foundationAltar:1'
      ] = true;
      model.player.inventory.stacks.foundationPill = 2;
      return model;
    }

    runtime.replaceModel(readyFoundationModel());
    const commandSeedBefore = runtime.snapshot().rngState;
    const legacyCommand = API.commands.attemptBreak();
    const commandAfter = runtime.snapshot();
    ok(
      legacyCommand.ok && legacyCommand.changed &&
        legacyCommand.data.result === 'failure' &&
        commandAfter.player.breakthrough.cultivation === 0 &&
        commandAfter.rngState !== commandSeedBefore &&
        commandAfter.reportArchive[0].action.key ===
          'command:attemptBreakthrough',
      'legacy attemptBreak delegates to the canonical Stage 3 transaction'
    );

    runtime.replaceModel(readyFoundationModel());
    const canvasSeedBefore = runtime.snapshot().rngState;
    const canvasSucceeded = runtime.harness.tryBreakthrough();
    const canvasAfter = runtime.snapshot();
    ok(
      canvasSucceeded === false &&
        canvasAfter.player.breakthrough.cultivation === 0 &&
        canvasAfter.rngState !== canvasSeedBefore &&
        canvasAfter.reportArchive[0].action.key ===
          'command:attemptBreakthrough',
      'canvas breakthrough delegates without reporting a failed roll as success'
    );
  }

  const successCases = [
    {
      name: 'consumeTechniqueBook',
      setup(model) {
        model.player.breakthrough.realmId = 'foundation';
        model.player.inventory.stacks[
          'techniqueBook:cloudPiercingSword'
        ] = 1;
      },
      invoke(api) {
        return api.commands.consumeTechniqueBook({
          itemId: 'techniqueBook:cloudPiercingSword'
        });
      },
      verify(after, result) {
        return after.player.techniques.known.cloudPiercingSword.level === 1 &&
          result.data.itemId === 'techniqueBook:cloudPiercingSword';
      },
      report(report) {
        return report.costs.items[
          'techniqueBook:cloudPiercingSword'
        ] === 1;
      }
    },
    {
      name: 'createCombatLoadout',
      invoke(api) {
        return api.commands.createCombatLoadout({ name: '方案二' });
      },
      verify(after, result) {
        return after.player.combat.loadouts.length === 2 &&
          result.data.id === 'loadout-2';
      }
    },
    {
      name: 'renameCombatLoadout',
      setup: addSecondLoadout,
      invoke(api) {
        return api.commands.renameCombatLoadout({
          loadoutId: 'loadout-2',
          name: '远征'
        });
      },
      verify(after) {
        return after.player.combat.loadouts[1].name === '远征';
      }
    },
    {
      name: 'deleteCombatLoadout',
      setup: addSecondLoadout,
      invoke(api) {
        return api.commands.deleteCombatLoadout({
          loadoutId: 'loadout-2'
        });
      },
      verify(after) {
        return after.player.combat.loadouts.length === 1;
      }
    },
    {
      name: 'setActiveCombatLoadout',
      setup: addSecondLoadout,
      invoke(api) {
        return api.commands.setActiveCombatLoadout({
          loadoutId: 'loadout-2'
        });
      },
      verify(after) {
        return after.player.combat.activeLoadoutId === 'loadout-2';
      }
    },
    {
      name: 'setEquipment',
      setup(model) {
        model.player.inventory.stacks.cloudwoodSword = 1;
      },
      invoke(api) {
        return api.commands.setEquipment({
          loadoutId: 'loadout-1',
          slot: 'weapon',
          itemId: 'legacy-cloudwoodSword-1'
        });
      },
      verify(after) {
        return after.player.combat.loadouts[0].equipment.weapon ===
          'legacy-cloudwoodSword-1';
      }
    },
    {
      name: 'setSupply',
      setup(model) {
        model.player.inventory.stacks.grilledCarp = 1;
      },
      invoke(api) {
        return api.commands.setSupply({
          loadoutId: 'loadout-1',
          slot: 'food',
          config: {
            itemId: 'grilledCarp',
            triggerRatio: 0.5,
            stopWhenEmpty: false
          }
        });
      },
      verify(after) {
        return after.player.combat.loadouts[0].supplies.food.itemId ===
          'grilledCarp';
      }
    },
    {
      name: 'setActiveTechnique',
      setup(model) {
        model.player.techniques.known.cloudPiercingSword =
          { level: 1, xp: 0 };
      },
      invoke(api) {
        return api.commands.setActiveTechnique({
          loadoutId: 'loadout-1',
          slotIndex: 0,
          techniqueId: 'cloudPiercingSword',
          condition: { type: 'always' }
        });
      },
      verify(after) {
        return after.player.combat.loadouts[0]
          .activeTechniques[0].techniqueId === 'cloudPiercingSword';
      }
    },
    {
      name: 'setPassiveTechnique',
      setup(model) {
        model.player.techniques.known.steadyBreath =
          { level: 1, xp: 0 };
      },
      invoke(api) {
        return api.commands.setPassiveTechnique({
          loadoutId: 'loadout-1',
          slotIndex: 0,
          techniqueId: 'steadyBreath'
        });
      },
      verify(after) {
        return after.player.combat.loadouts[0]
          .passiveTechniques[0] === 'steadyBreath';
      }
    },
    {
      name: 'claimCombatLoot',
      setup(model) {
        model.player.lingshi = 0;
        model.systems.combat.pendingLoot = {
          id: 'combat-loot-1',
          source: { type: 'enemy', id: 'thornHare' },
          items: { brokenFang: 2 },
          currency: 0,
          createdAtMs: NOW
        };
        model.systems.combat.nextLootId = 2;
      },
      invoke(api) {
        return api.commands.claimCombatLoot();
      },
      verify(after, result) {
          return after.systems.combat.pendingLoot === null &&
          after.player.inventory.stacks.brokenFang === 2 &&
          after.player.lingshi === 0 &&
          result.data.items.brokenFang === 2;
      },
      report(report) {
        return report.gains.items.brokenFang === 2 &&
          !Object.prototype.hasOwnProperty.call(
            report.gains.items,
            'lingshi'
          );
      }
    },
    {
      name: 'treatInjury',
      setup(model) {
        model.player.inventory.stacks.healingPill = 1;
        model.player.combat.injury = {
          id: 'severe-injury',
          remainingSeconds: 1200,
          totalSeconds: 1800
        };
      },
      invoke(api) {
        return api.commands.treatInjury();
      },
      verify(after, result) {
        return after.player.combat.injury.remainingSeconds === 600 &&
          result.data.itemId === 'healingPill';
      },
      report(report) {
        return report.costs.items.healingPill === 1;
      }
    },
    {
      name: 'attemptBreakthrough',
      setup(model) {
        model.player.breakthrough.cultivation = 100;
        model.player.combatProgress.completedGates[
          'kill:thornHare:3'
        ] = true;
      },
      invoke(api) {
        return api.commands.attemptBreakthrough({
          pillItemId: null,
          quantity: 0
        });
      },
      verify(after, result) {
        return after.player.breakthrough.realmId === 'qi-2' &&
          result.data.result === 'success' &&
          result.data.chance === 1 &&
          typeof result.data.roll === 'number' &&
          result.data.gate === 'kill:thornHare:3' &&
          result.data.consumed.items &&
          !('state' in result.data) &&
          !('model' in result.data);
      }
    }
  ];

  successCases.forEach((testCase) => {
    const model = runtime.freshModel();
    if (testCase.setup) testCase.setup(model);
    runtime.replaceModel(model);
    const beforeArchive = model.reportArchive.length;
    const result = testCase.invoke(API);
    const after = runtime.snapshot();
    const report = after.reportArchive[after.reportArchive.length - 1];
    ok(commandShape(result) && result.ok && result.changed &&
       runtime.controls.saveAttempts === 1 &&
       testCase.verify(after, result),
      testCase.name + ' returns a standard DTO, changes model, and saves once ' +
        JSON.stringify(clone(result)));
    ok(after.reportArchive.length === beforeArchive + 1 &&
       report.source === 'command' &&
       report.action.key === 'command:' + testCase.name &&
       report.action.completed === 1 &&
       report.requestedSeconds === 0 &&
       report.mainActionSeconds === 0 &&
       (!testCase.report || testCase.report(report)),
      testCase.name + ' archives one zero-time immediate gains/costs report');
  });

  // Same-timestamp immediate report IDs remain unique and deterministic.
  {
    const model = runtime.freshModel();
    runtime.replaceModel(model);
    API.commands.createCombatLoadout({ name: '方案二' });
    API.commands.createCombatLoadout({ name: '方案三' });
    const reports = runtime.snapshot().reportArchive;
    ok(reports.length === 2 &&
       reports[0].id !== reports[1].id &&
       reports[0].action.key === 'command:createCombatLoadout' &&
       reports[1].action.key === 'command:createCombatLoadout#2',
      'immediate report IDs and action keys are unique and stable');
  }

  // Domain validation fails before persistence.
  {
    const model = runtime.freshModel();
    runtime.replaceModel(model);
    const before = bytes(runtime.snapshot());
    const invalid = API.commands.createCombatLoadout({ name: '' });
    ok(commandShape(invalid) && !invalid.ok && !invalid.changed &&
       runtime.controls.saveAttempts === 0 &&
       bytes(runtime.snapshot()) === before,
      'validation failure performs zero saves and preserves model/report');
  }

  // Save failure retains the original model and report archive.
  {
    const isolated = createRuntime();
    const model = isolated.freshModel();
    isolated.replaceModel(model);
    const before = bytes(isolated.snapshot());
    isolated.controls.saveMode = 'false';
    const failed = isolated.api.commands.createCombatLoadout({
      name: '方案二'
    });
    ok(commandShape(failed) && !failed.ok &&
       failed.code === 'save_failed' && !failed.changed &&
       isolated.controls.saveAttempts === 1 &&
       bytes(isolated.snapshot()) === before,
      'save failure returns save_failed/changed:false and retains model/report');
  }

  // The final configured supply is sale-protected but remains consumable by
  // the combat engine because it is not inventory-bound.
  {
    const model = runtime.freshModel();
    model.player.inventory.stacks.grilledCarp = 1;
    model.player.combat.loadouts[0].supplies.food = {
      itemId: 'grilledCarp',
      triggerRatio: 0.5,
      stopWhenEmpty: false
    };
    runtime.replaceModel(model);
    const before = bytes(runtime.snapshot());
    const blocked = API.commands.sellItem({
      itemId: 'grilledCarp',
      quantity: 1
    });
    ok(commandShape(blocked) && !blocked.ok &&
       blocked.code === 'item_in_combat_plan' &&
       !blocked.changed && runtime.controls.saveAttempts === 0 &&
       bytes(runtime.snapshot()) === before,
      'sellItem consults minimumSellRemainder and blocks final planned supply');

    const started = API.commands.startAction({
      key: 'combat:region:qingyunOutskirts:thornHare'
    });
    const active = runtime.snapshot();
    active.systems.combat.session.player.hp = 1;
    runtime.replaceModel(active);
    runtime.harness.__test.advanceRuntime(NOW, NOW + 250, 'online', null);
    const consumed = runtime.snapshot();
    ok(started.ok &&
       !Object.prototype.hasOwnProperty.call(
         consumed.player.inventory.stacks,
         'grilledCarp'
       ),
      'CombatEngine can consume the final configured supply');
  }

  // Active-plan edits are locked by the domain while inactive plans remain
  // editable.
  {
    const model = addSecondLoadout(runtime.freshModel());
    runtime.replaceModel(model);
    API.commands.startAction({
      key: 'combat:region:qingyunOutskirts:thornHare'
    });
    runtime.controls.saveAttempts = 0;
    const locked = API.commands.renameCombatLoadout({
      loadoutId: 'loadout-1',
      name: '锁定'
    });
    const editable = API.commands.renameCombatLoadout({
      loadoutId: 'loadout-2',
      name: '备用'
    });
    ok(!locked.ok && locked.code === 'combat_active' &&
       !locked.changed && editable.ok && editable.changed &&
       runtime.controls.saveAttempts === 1,
      'domain locks active combat plan but permits inactive-plan edits');
  }

  // Breakthrough input maps only 0..2 copies of the matching transition pill.
  {
    const model = runtime.freshModel();
    model.player.breakthrough.realmId = 'qi-9';
    model.player.breakthrough.cultivation = 3000;
    model.player.combatProgress.completedGates[
      'clear:foundationAltar:1'
    ] = true;
    model.player.inventory.stacks.foundationPill = 2;
    runtime.replaceModel(model);
    [
      { pillItemId: 'goldCorePill', quantity: 1 },
      { pillItemId: 'foundationPill', quantity: 3 },
      { pillItemId: 'foundationPill', quantity: -1 },
      { pillItemId: null, quantity: 1 }
    ].forEach((input) => {
      const before = bytes(runtime.snapshot());
      runtime.controls.saveAttempts = 0;
      const result = API.commands.attemptBreakthrough(input);
      ok(commandShape(result) && !result.ok && !result.changed &&
         runtime.controls.saveAttempts === 0 &&
         bytes(runtime.snapshot()) === before,
        'invalid breakthrough pill mapping fails before draw/save: ' +
          JSON.stringify(input));
    });

    runtime.replaceModel(model);
    const seedBefore = runtime.snapshot().rngState;
    const result = API.commands.attemptBreakthrough({
      pillItemId: 'foundationPill',
      quantity: 2
    });
    const after = runtime.snapshot();
    const report = after.reportArchive[0];
    ok(result.ok && result.changed &&
       result.data.chance === 1 &&
       result.data.result === 'success' &&
       result.data.consumed.items.foundationPill === 2 &&
       !Object.prototype.hasOwnProperty.call(
         after.player.inventory.stacks,
         'foundationPill'
       ) &&
       after.rngState !== seedBefore &&
       report.costs.items.foundationPill === 2,
      'two matching pills map to a 100% domain attempt that still draws and saves');
  }

  // Throwing accessors and hostile proxies fail closed without mutation/save.
  {
    function revokedProxy() {
      const pair = Proxy.revocable({}, {});
      pair.revoke();
      return pair.proxy;
    }

    const queryModel = runtime.freshModel();
    runtime.replaceModel(queryModel);
    const queryBefore = bytes(runtime.snapshot());
    let queryResult;
    let queryThrew = false;
    try {
      queryResult = API.queries.combat(revokedProxy());
    } catch (_) {
      queryThrew = true;
    }
    ok(!queryThrew && queryResult === null &&
       runtime.controls.saveAttempts === 0 &&
       bytes(runtime.snapshot()) === queryBefore,
      'revoked Proxy combat query fails closed to the stable null fallback');

    const breakthroughModel = runtime.freshModel();
    runtime.replaceModel(breakthroughModel);
    const breakthroughBefore = bytes(runtime.snapshot());
    let breakthroughResult;
    let breakthroughThrew = false;
    try {
      breakthroughResult = API.queries.breakthrough(revokedProxy());
    } catch (_) {
      breakthroughThrew = true;
    }
    ok(!breakthroughThrew &&
       bytes(breakthroughResult) === bytes({
         ok: false,
         code: 'invalid_argument'
       }) &&
       deeplyFrozen(breakthroughResult) &&
       runtime.controls.saveAttempts === 0 &&
       bytes(runtime.snapshot()) === breakthroughBefore,
      'revoked Proxy breakthrough preview fails closed without side effects');

    [
      'consumeTechniqueBook',
      'createCombatLoadout',
      'renameCombatLoadout',
      'deleteCombatLoadout',
      'setActiveCombatLoadout',
      'setEquipment',
      'setSupply',
      'setActiveTechnique',
      'setPassiveTechnique',
      'attemptBreakthrough'
    ].forEach((commandName) => {
      const model = runtime.freshModel();
      runtime.replaceModel(model);
      const before = bytes(runtime.snapshot());
      let result;
      let threw = false;
      try {
        result = API.commands[commandName](revokedProxy());
      } catch (_) {
        threw = true;
      }
      ok(!threw && commandShape(result) &&
         !result.ok && result.code === 'invalid_argument' &&
         !result.changed && runtime.controls.saveAttempts === 0 &&
         bytes(runtime.snapshot()) === before,
        commandName +
          ' fails a revoked Proxy closed with zero save/state/report/RNG mutation');
    });

    const hostileInputs = [
      Object.defineProperty({}, 'name', {
        enumerable: true,
        get() { throw new Error('getter invoked'); }
      }),
      new Proxy({}, {
        getOwnPropertyDescriptor() {
          throw new Error('proxy trap');
        }
      }),
      new Proxy({ name: '方案二' }, {})
    ];
    hostileInputs.forEach((input) => {
      const model = runtime.freshModel();
      runtime.replaceModel(model);
      const before = bytes(runtime.snapshot());
      let result = null;
      let threw = false;
      try {
        result = API.commands.createCombatLoadout(input);
      } catch (_) {
        threw = true;
      }
      ok(!threw && commandShape(result) && !result.ok &&
         !result.changed && runtime.controls.saveAttempts === 0 &&
         bytes(runtime.snapshot()) === before,
        'hostile/accessor input fails closed without mutation or save');
    });
  }
}

console.log(
  '\n=== Stage 3 命令/查询 API 自测：' +
  pass + ' 通过 / ' + fail + ' 失败 ==='
);
if (fail) process.exitCode = 1;
