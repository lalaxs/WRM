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
  ok(JSON.stringify(actual) === JSON.stringify(expected), message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deeplyFrozen(value, seen) {
  if (!value || typeof value !== 'object') return true;
  seen = seen || new Set();
  if (seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value) &&
    Object.keys(value).every((key) => deeplyFrozen(value[key], seen));
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
];

function createRuntime(options) {
  options = options || {};
  const now = options.now == null ? 1700000000000 : options.now;
  const store = options.store || {};
  const controls = {
    saveAttempts: 0,
    saveMode: 'ok'
  };
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
  const windowFacade = {
    addEventListener() {},
    NIE_ASSET_BASE: '',
    devicePixelRatio: 1
  };
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
    requestAnimationFrame() {},
    setTimeout() { return 0; },
    clearTimeout() {},
    addEventListener() {}
  };
  sandbox.window = windowFacade;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync('nie-manifest.js', 'utf8'),
    sandbox,
    { filename: 'nie-manifest.js' }
  );
  SCRIPT_ORDER.forEach((file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, {
      filename: file
    });
    if (file === 'content/homestead.js' &&
        options.ambiguousFormationItem) {
      const content = clone(sandbox.HomesteadContent);
      content.FORMATIONS.duplicateGathering = {
        id: 'duplicateGathering',
        itemId: 'gatheringFormation',
        name: '重名聚材阵',
        masteryId: 'formation:duplicateGathering',
        effect: {
          key: 'gatheringExtraYieldChance',
          value: 0.01
        },
        effectText: '测试重复物品映射'
      };
      sandbox.HomesteadContent = content;
    }
    if (file === 'content/homestead.js' &&
        options.swappedFormationItems) {
      const content = clone(sandbox.HomesteadContent);
      const gatheringItem =
        content.FORMATIONS.gatheringFormation.itemId;
      content.FORMATIONS.gatheringFormation.itemId =
        content.FORMATIONS.farmlandFormation.itemId;
      content.FORMATIONS.farmlandFormation.itemId = gatheringItem;
      sandbox.HomesteadContent = content;
    }
  });
  ['game.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-api.js'].forEach((file) => {
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
});
  const harness = sandbox.__GameTestHarness;

  function freshModel() {
    const model = clone(harness.__test.snapshotModel());
    const defaults = clone(sandbox.Stage2State.createDefaults());
    model.created = true;
    model.player = Object.assign(
      {},
      clone(harness.defaultPlayer()),
      defaults.player
    );
    model.systems = defaults.systems;
    model.current = null;
    model.rngState = 123456789;
    model.pendingOfflineReports = [];
    model.reportArchive = [];
    model.processedThroughMs = now;
    model.lastActionStop = null;
    return model;
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
    deeplyFrozen(result);
}

function currentAction(key, options) {
  const settings = options || {};
  return {
    key,
    mode: settings.mode || 'finite',
    count: settings.count == null ? 1 : settings.count,
    done: settings.done == null ? 0 : settings.done,
    elapsed: settings.elapsed == null ? 0 : settings.elapsed,
    stalled: settings.stalled === true,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null
  };
}

function readySpiritRice(model) {
  model.systems.homestead.farm.plots[0] = {
    id: 'plot-1',
    cropId: 'spiritRice',
    remainingSeconds: 0,
    totalSeconds: 300,
    ready: true,
    remainingAnchorMs: 300000,
    remainingBaseSeconds: 0
  };
  return model;
}

function fillInventoryExcluding(runtime, model, excludedItemId) {
  const itemIds = Object.keys(runtime.sandbox.ItemContent.ITEMS)
    .filter((itemId) => itemId !== excludedItemId)
    .slice(0, model.player.inventory.capacity);
  model.player.inventory.stacks = {};
  itemIds.forEach((itemId) => {
    model.player.inventory.stacks[itemId] = 1;
  });
  return model;
}

const runtime = createRuntime();
const API = runtime.api;

ok(Object.isFrozen(API) &&
   Object.isFrozen(API.queries) &&
   Object.isFrozen(API.commands) &&
   Object.isFrozen(API.render),
  'GameAPI and all three public surfaces are frozen');
same(Object.keys(API), ['queries', 'commands', 'render'],
  'GameAPI exposes exactly the Stage 1B boundaries');
ok(!('state' in API) && !('data' in API) && !('persist' in API),
  'GameAPI exposes no mutable state, registry, or persistence capability');

[
  'startAction', 'stopAction', 'sellItem', 'plant', 'plantAll', 'harvest',
  'equipFormation', 'unequipFormation', 'setActiveBeast'
].forEach((name) => {
  ok(typeof API.commands[name] === 'function',
    'commands exposes ' + name);
});
[
  'app', 'navigation', 'top', 'home', 'inventory', 'breakModal',
  'skillPage', 'gatherPage', 'offline', 'events', 'persistence',
  'homestead', 'charm'
].forEach((name) => {
  ok(typeof API.queries[name] === 'function',
    'queries preserves or exposes ' + name);
});

// Single main-action slot and unchanged Stage 1B start/stop composition.
{
  const model = runtime.freshModel();
  runtime.replaceModel(model);
  const first = API.commands.startAction({
    key: 'gather:explore:herb'
  });
  const afterFirst = runtime.snapshot();
  const second = API.commands.startAction({
    key: 'gather:explore:mining'
  });
  const afterSecond = runtime.snapshot();
  const stopped = API.commands.stopAction();
  const afterStop = runtime.snapshot();
  ok(commandShape(first) && first.ok && first.changed &&
     runtime.controls.saveAttempts === 3,
    'start, replace, and stop each return frozen DTOs and persist once ' +
      JSON.stringify({
        first: clone(first),
        second: clone(second),
        stopped: clone(stopped),
        saves: runtime.controls.saveAttempts
      }));
  ok(afterFirst.current.key === 'gather:explore:herb' &&
     afterSecond.current.key === 'gather:explore:mining' &&
     afterSecond.lastActionStop.key === 'gather:explore:herb' &&
     afterStop.current === null &&
     stopped.ok && stopped.changed,
    'start/stop owns one replaceable main-action slot');
  ok(!('state' in first) && !('model' in first) &&
     !('state' in first.data) && !('model' in first.data),
    'main-action command DTOs expose no model reference');
}

// Failure paths never persist, never change RNG/current, and map messages.
const stage2ApiReady = [
  'sellItem', 'plant', 'plantAll', 'harvest', 'equipFormation',
  'unequipFormation', 'setActiveBeast'
].every((name) => typeof API.commands[name] === 'function') &&
  typeof API.queries.homestead === 'function' &&
  typeof API.queries.charm === 'function';

if (stage2ApiReady) {
{
  const model = runtime.freshModel();
  model.current = {
    key: 'gather:explore:herb',
    mode: 'finite',
    count: 1,
    done: 0,
    elapsed: 0,
    stalled: false,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null
  };
  runtime.replaceModel(model);
  const before = runtime.snapshot();
    const failures = [
      API.commands.sellItem({ itemId: 'missing', quantity: 1 }),
      API.commands.plant({ plotId: 'missing', cropId: 'spiritRice' }),
      API.commands.plantAll({
        assignments: [{ plotId: 'missing', cropId: 'spiritRice' }]
      }),
      API.commands.harvest({ plotId: 'plot-1' }),
      API.commands.equipFormation({
        slotIndex: 0,
        itemId: 'missing'
    }),
    API.commands.unequipFormation({ slotIndex: 0 }),
    API.commands.setActiveBeast({ beastId: 'missing' })
  ];
  ok(failures.every((result) =>
    commandShape(result) &&
    !result.ok &&
    result.changed === false &&
    typeof result.message === 'string' &&
    /[\u3400-\u9fff]/.test(result.message)),
  'inventory, farm, formation, and beast failures map to concise Chinese DTOs');
  ok(runtime.controls.saveAttempts === 0,
    'all failed immediate commands persist zero times');
  same(runtime.snapshot(), before,
    'all failed immediate commands preserve the complete model and RNG');
}

// Bulk planting commits each planned empty plot in a single save/report and
// rejects the whole batch when any planned plot cannot be planted.
{
  const model = runtime.freshModel();
  model.player.skills.farming.level = 8;
  model.player.inventory.stacks.commonSeed = 2;
  runtime.replaceModel(model);
  const planted = API.commands.plantAll({
    assignments: [
      { plotId: 'plot-1', cropId: 'spiritRice' },
      { plotId: 'plot-2', cropId: 'heartClearGrass' }
    ]
  });
  const after = runtime.snapshot();
  ok(commandShape(planted) && planted.ok && planted.changed &&
     planted.data.planted === 2 &&
     after.systems.homestead.farm.plots[0].cropId === 'spiritRice' &&
     after.systems.homestead.farm.plots[1].cropId === 'heartClearGrass' &&
     after.player.inventory.stacks.commonSeed === undefined &&
     after.reportArchive.length === 1 &&
     after.reportArchive[0].costs.items.commonSeed === 2 &&
     after.reportArchive[0].action.key === 'command:plantAll' &&
     runtime.controls.saveAttempts === 1,
    'plantAll plants independent planned crops atomically in one save/report');

  const blocked = runtime.freshModel();
  blocked.player.skills.farming.level = 8;
  blocked.player.inventory.stacks.commonSeed = 1;
  blocked.systems.homestead.farm.plots[1].cropId = 'spiritRice';
  blocked.systems.homestead.farm.plots[1].remainingSeconds = 300;
  blocked.systems.homestead.farm.plots[1].totalSeconds = 300;
  runtime.replaceModel(blocked);
  const beforeBlocked = runtime.snapshot();
  const rejected = API.commands.plantAll({
    assignments: [
      { plotId: 'plot-1', cropId: 'spiritRice' },
      { plotId: 'plot-2', cropId: 'heartClearGrass' }
    ]
  });
  ok(commandShape(rejected) && !rejected.ok &&
     rejected.changed === false &&
     rejected.code === 'plot_occupied' &&
     runtime.controls.saveAttempts === 0,
    'plantAll reports the first invalid planned plot without saving');
  same(runtime.snapshot(), beforeBlocked,
    'rejected plantAll leaves every plot and seed untouched');
}

// Persistence failure holds each immediate command candidate without exposing
// or applying it. Recovery applies it once; retrying recovery cannot apply it
// again.
{
  const atomicCases = [
    {
      name: 'sellItem',
      prepare(model) {
        model.player.inventory.stacks.lingzhi = 2;
        return model;
      },
      invoke(api) {
        return api.commands.sellItem({ itemId: 'lingzhi', quantity: 1 });
      },
      query(api) {
        return {
          inventory: clone(api.queries.inventory()),
          top: clone(api.queries.top()),
          events: clone(api.queries.events())
        };
      },
      applied(before, after) {
        return after.player.inventory.stacks.lingzhi === 1 &&
          after.player.lingshi === before.player.lingshi + 1 &&
          after.reportArchive.length === 1;
      }
    },
    {
      name: 'plant',
      prepare(model) {
        model.player.inventory.stacks.commonSeed = 1;
        return model;
      },
      invoke(api) {
        return api.commands.plant({
          plotId: 'plot-1',
          cropId: 'spiritRice'
        });
      },
      query(api) {
        return {
          farm: clone(api.queries.homestead('farm')),
          inventory: clone(api.queries.inventory()),
          events: clone(api.queries.events())
        };
      },
      applied(before, after) {
        return after.systems.homestead.farm.plots[0].cropId ===
            'spiritRice' &&
          !Object.prototype.hasOwnProperty.call(
            after.player.inventory.stacks,
            'commonSeed'
          ) &&
          after.reportArchive.length === 1;
      }
    },
    {
      name: 'harvest',
      prepare(model) {
        return readySpiritRice(model);
      },
      invoke(api) {
        return api.commands.harvest({ plotId: 'plot-1' });
      },
      query(api) {
        return {
          farm: clone(api.queries.homestead('farm')),
          inventory: clone(api.queries.inventory()),
          events: clone(api.queries.events())
        };
      },
      applied(before, after) {
        return after.systems.homestead.farm.plots[0].cropId === null &&
          after.player.inventory.stacks.spiritRice === 4 &&
          after.rngState !== before.rngState &&
          after.reportArchive.length === 1;
      }
    },
    {
      name: 'equipFormation',
      prepare(model) {
        model.player.inventory.stacks.gatheringFormation = 1;
        return model;
      },
      invoke(api) {
        return api.commands.equipFormation({
          slotIndex: 0,
          itemId: 'gatheringFormation'
        });
      },
      query(api) {
        return {
          formations: clone(api.queries.homestead('formations')),
          inventory: clone(api.queries.inventory()),
          events: clone(api.queries.events())
        };
      },
      applied(before, after) {
        return after.systems.homestead.formations.slots[0] ===
            'gatheringFormation' &&
          after.reportArchive.length === 1;
      }
    },
    {
      name: 'unequipFormation',
      prepare(model, isolated) {
        model.player.inventory.stacks.gatheringFormation = 1;
        const equipped = isolated.sandbox.Formations.equip(
          model,
          0,
          'gatheringFormation'
        );
        return clone(equipped.state);
      },
      invoke(api) {
        return api.commands.unequipFormation({ slotIndex: 0 });
      },
      query(api) {
        return {
          formations: clone(api.queries.homestead('formations')),
          inventory: clone(api.queries.inventory()),
          events: clone(api.queries.events())
        };
      },
      applied(before, after) {
        return after.systems.homestead.formations.slots[0] === null &&
          after.reportArchive.length === 1;
      }
    },
    {
      name: 'setActiveBeast',
      prepare(model) {
        model.systems.homestead.beasts.roster.push({
          id: 'beast-1',
          speciesId: 'spiritFox',
          level: 1,
          xp: 0,
          traitId: 'keenNose',
          growthId: 'steady'
        });
        return model;
      },
      invoke(api) {
        return api.commands.setActiveBeast({ beastId: 'beast-1' });
      },
      query(api) {
        return {
          beasts: clone(api.queries.homestead('beasts')),
          events: clone(api.queries.events())
        };
      },
      applied(before, after) {
        return after.systems.homestead.beasts.activeIds[0] ===
            'beast-1' &&
          after.reportArchive.length === 0;
      }
    }
  ];

  atomicCases.forEach((testCase) => {
    const isolated = createRuntime();
    const model = testCase.prepare(isolated.freshModel(), isolated);
    isolated.replaceModel(model);
    const before = isolated.snapshot();
    const beforeQuery = testCase.query(isolated.api);
    isolated.controls.saveMode = 'false';
    const failed = testCase.invoke(isolated.api);
    const afterFailure = isolated.snapshot();
    const afterFailureQuery = testCase.query(isolated.api);
    const issue = isolated.api.queries.persistence();
    const blocked = testCase.invoke(isolated.api);
    const attemptsAfterBlocked = isolated.controls.saveAttempts;
    isolated.controls.saveMode = 'ok';
    const recovered = isolated.api.commands.retryPersistence();
    const afterRecovery = isolated.snapshot();
    const firstRecoveryQuery = testCase.query(isolated.api);
    const recoveredAgain = isolated.api.commands.retryPersistence();
    const afterSecondRecovery = isolated.snapshot();

    ok(commandShape(failed) &&
       !failed.ok &&
       failed.code === 'save_failed' &&
       failed.changed === false &&
       failed.data.retryable === true &&
       attemptsAfterBlocked === 1 &&
       issue.locked === true &&
       issue.kind === 'save' &&
       issue.canRetry === true &&
       blocked.code === 'persistence_locked',
    testCase.name + ' failed persistence enters one locked recovery path');
    same(afterFailure, before,
      testCase.name + ' failed persistence leaves runtime model unchanged');
    same(afterFailureQuery, beforeQuery,
      testCase.name + ' failed persistence leaves public queries unchanged');
    ok(commandShape(recovered) &&
       recovered.ok &&
       recovered.changed &&
       isolated.controls.saveAttempts === 2 &&
       isolated.api.queries.persistence().locked === false &&
       testCase.applied(before, afterRecovery),
    testCase.name + ' recovery applies the held candidate exactly once');
    ok(commandShape(recoveredAgain) &&
       recoveredAgain.ok &&
       recoveredAgain.code === 'no_change' &&
       recoveredAgain.changed === false,
    testCase.name + ' second recovery is an explicit no-change');
    same(afterSecondRecovery, afterRecovery,
      testCase.name + ' repeated recovery cannot double-apply');
    same(testCase.query(isolated.api), firstRecoveryQuery,
      testCase.name + ' repeated recovery leaves public queries stable');
  });
}

// Numeric command inputs are real numbers only: no booleans, strings,
// fractional values, negative values, or unsafe integers may reach domains.
{
  const malformedCases = [
    {
      name: 'sellItem quantity boolean',
      prepare(model) {
        model.player.inventory.stacks.lingzhi = 2;
        return model;
      },
      invoke(api) {
        return api.commands.sellItem({ itemId: 'lingzhi', quantity: true });
      }
    },
    {
      name: 'sellItem quantity string',
      prepare(model) {
        model.player.inventory.stacks.lingzhi = 2;
        return model;
      },
      invoke(api) {
        return api.commands.sellItem({ itemId: 'lingzhi', quantity: '1' });
      }
    },
    {
      name: 'equipFormation slot boolean',
      prepare(model) {
        model.player.inventory.stacks.gatheringFormation = 1;
        return model;
      },
      invoke(api) {
        return api.commands.equipFormation({
          slotIndex: false,
          itemId: 'gatheringFormation'
        });
      }
    },
    {
      name: 'equipFormation slot string',
      prepare(model) {
        model.player.inventory.stacks.gatheringFormation = 1;
        return model;
      },
      invoke(api) {
        return api.commands.equipFormation({
          slotIndex: '0',
          itemId: 'gatheringFormation'
        });
      }
    },
    {
      name: 'equipFormation slot unsafe integer',
      prepare(model) {
        model.player.inventory.stacks.gatheringFormation = 1;
        return model;
      },
      invoke(api) {
        return api.commands.equipFormation({
          slotIndex: Number.MAX_SAFE_INTEGER + 1,
          itemId: 'gatheringFormation'
        });
      }
    },
    {
      name: 'unequipFormation slot boolean',
      prepare(model, isolated) {
        model.player.inventory.stacks.gatheringFormation = 1;
        return clone(isolated.sandbox.Formations.equip(
          model,
          0,
          'gatheringFormation'
        ).state);
      },
      invoke(api) {
        return api.commands.unequipFormation({ slotIndex: false });
      }
    },
    {
      name: 'unequipFormation slot string',
      prepare(model, isolated) {
        model.player.inventory.stacks.gatheringFormation = 1;
        return clone(isolated.sandbox.Formations.equip(
          model,
          0,
          'gatheringFormation'
        ).state);
      },
      invoke(api) {
        return api.commands.unequipFormation({ slotIndex: '0' });
      }
    },
    {
      name: 'unequipFormation slot unsafe integer',
      prepare(model, isolated) {
        model.player.inventory.stacks.gatheringFormation = 1;
        return clone(isolated.sandbox.Formations.equip(
          model,
          0,
          'gatheringFormation'
        ).state);
      },
      invoke(api) {
        return api.commands.unequipFormation({
          slotIndex: Number.MAX_SAFE_INTEGER + 1
        });
      }
    }
  ];

  malformedCases.forEach((testCase) => {
    const isolated = createRuntime();
    const model = testCase.prepare(isolated.freshModel(), isolated);
    isolated.replaceModel(model);
    const before = isolated.snapshot();
    const result = testCase.invoke(isolated.api);
    ok(commandShape(result) &&
       !result.ok &&
       result.code === 'invalid_argument' &&
       result.changed === false &&
       isolated.controls.saveAttempts === 0,
    testCase.name + ' is rejected atomically before persistence');
    same(isolated.snapshot(), before,
      testCase.name + ' cannot mutate model, RNG, action, or reports');
  });
}

// Selling changes only the requested stack/currency, archives one report,
// preserves the current action, and persists once.
{
  const model = runtime.freshModel();
  model.player.inventory.stacks.lingzhi = 3;
  model.current = {
    key: 'gather:explore:herb',
    mode: 'finite',
    count: 1,
    done: 0,
    elapsed: 0,
    stalled: false,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null
  };
  runtime.replaceModel(model);
  const result = API.commands.sellItem({
    itemId: 'lingzhi',
    quantity: 2
  });
  const after = runtime.snapshot();
  ok(commandShape(result) && result.ok && result.changed &&
     result.data.currency === 2 &&
     after.player.lingshi === model.player.lingshi + 2 &&
     after.player.inventory.stacks.lingzhi === 1,
    'sellItem returns currency and adds it to player lingshi');
  ok(runtime.controls.saveAttempts === 1 &&
     after.current.key === model.current.key &&
     after.reportArchive.length === 1 &&
     after.reportArchive[0].requestedSeconds === 0 &&
     after.reportArchive[0].mainActionSeconds === 0 &&
     after.reportArchive[0].costs.items.lingzhi === 2,
    'sellItem persists once, archives exact zero-time cost, and preserves main action');
}

// Plant/harvest use pure Farm operations. Validation failures consume no RNG;
// a sampled domain failure commits only its returned RNG.
{
  const model = runtime.freshModel();
  model.player.inventory.stacks.commonSeed = 1;
  model.current = {
    key: 'gather:explore:mining',
    mode: 'finite',
    count: 1,
    done: 0,
    elapsed: 0,
    stalled: false,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null
  };
  runtime.replaceModel(model);
  const planted = API.commands.plant({
    plotId: 'plot-1',
    cropId: 'spiritRice'
  });
  const afterPlant = runtime.snapshot();
  ok(commandShape(planted) && planted.ok && planted.changed &&
     afterPlant.systems.homestead.farm.plots[0].cropId ===
       'spiritRice' &&
     afterPlant.current.key === model.current.key &&
     afterPlant.reportArchive.length === 1 &&
     afterPlant.reportArchive[0].costs.items.commonSeed === 1,
    'plant persists once, reports seed cost, and does not interrupt main action');
  ok(runtime.controls.saveAttempts === 1,
    'successful plant persists exactly once');

  const failedRng = afterPlant.rngState;
  const early = API.commands.harvest({ plotId: 'plot-1' });
  ok(!early.ok && early.changed === false &&
     runtime.controls.saveAttempts === 1 &&
     runtime.snapshot().rngState === failedRng,
    'failed harvest persists zero additional times and does not advance RNG');

  const ready = runtime.snapshot();
  ready.systems.homestead.farm.plots[0].remainingSeconds = 0;
  ready.systems.homestead.farm.plots[0].ready = true;
  runtime.replaceModel(ready);
  const harvested = API.commands.harvest({ plotId: 'plot-1' });
  const afterHarvest = runtime.snapshot();
  ok(commandShape(harvested) && harvested.ok && harvested.changed &&
     afterHarvest.rngState !== ready.rngState &&
     afterHarvest.player.inventory.stacks.spiritRice >= 4 &&
     afterHarvest.reportArchive.length === 2 &&
     afterHarvest.reportArchive[1].gains.items.spiritRice >= 4,
    'successful harvest advances RNG and archives exact item gains');
  ok(runtime.controls.saveAttempts === 1 &&
     afterHarvest.current.key === ready.current.key,
    'successful harvest persists once without replacing main action');
}

// Cross-layer RNG contract: Farm returns an advanced seed after an
// inventory-full roll, and the immediate controller persists that seed while
// rolling back the failed harvest transaction.
{
  const isolated = createRuntime();
  const model = readySpiritRice(isolated.freshModel());
  fillInventoryExcluding(isolated, model, 'spiritRice');
  isolated.replaceModel(model);
  const before = isolated.snapshot();
  const failed = isolated.api.commands.harvest({ plotId: 'plot-1' });
  const after = isolated.snapshot();
  ok(commandShape(failed) &&
     !failed.ok &&
     failed.code === 'inventory_full' &&
     failed.changed === true &&
     isolated.controls.saveAttempts === 1 &&
     after.rngState !== before.rngState,
  'sampled inventory-full harvest persists its advanced RNG once');
  same(after.player.inventory, before.player.inventory,
    'sampled harvest failure rolls back the complete inventory transaction');
  same(after.systems.homestead.farm, before.systems.homestead.farm,
    'sampled harvest failure leaves the mature crop available');
}

// Saving the RNG-only failure is still atomic: a persistence failure leaves
// the live runtime byte-identical, including the original seed.
{
  const isolated = createRuntime();
  const model = readySpiritRice(isolated.freshModel());
  fillInventoryExcluding(isolated, model, 'spiritRice');
  isolated.replaceModel(model);
  const before = isolated.snapshot();
  isolated.controls.saveMode = 'false';
  const failed = isolated.api.commands.harvest({ plotId: 'plot-1' });
  ok(commandShape(failed) &&
     !failed.ok &&
     failed.code === 'save_failed' &&
     failed.changed === false &&
     isolated.controls.saveAttempts === 1,
  'sampled failure reports save_failed when its RNG commit cannot persist');
  same(isolated.snapshot(), before,
    'failed persistence fully rolls back sampled harvest RNG and domain state');
}

// Formation itemId resolution is explicit; equip/unequip preserve action.
{
  const model = runtime.freshModel();
  model.player.inventory.stacks.gatheringFormation = 1;
  model.current = {
    key: 'gather:explore:woodcutting',
    mode: 'finite',
    count: 1,
    done: 0,
    elapsed: 0,
    stalled: false,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null
  };
  runtime.replaceModel(model);
  const equipped = API.commands.equipFormation({
    slotIndex: 0,
    itemId: 'gatheringFormation'
  });
  const afterEquip = runtime.snapshot();
  ok(commandShape(equipped) && equipped.ok && equipped.changed &&
     equipped.data.formationId === 'gatheringFormation' &&
     afterEquip.systems.homestead.formations.slots[0] ===
       'gatheringFormation' &&
     afterEquip.current.key === model.current.key &&
     runtime.controls.saveAttempts === 1,
    'equip resolves itemId to one formation, persists once, and preserves action');
  const unequipped = API.commands.unequipFormation({ slotIndex: 0 });
  const afterUnequip = runtime.snapshot();
  ok(commandShape(unequipped) && unequipped.ok && unequipped.changed &&
     afterUnequip.systems.homestead.formations.slots[0] === null &&
     afterUnequip.current.key === model.current.key &&
     runtime.controls.saveAttempts === 2,
    'unequip persists once and preserves the current action');
  ok(afterUnequip.reportArchive.length === 2 &&
     afterUnequip.reportArchive.every((report) =>
       report.requestedSeconds === 0 &&
       report.mainActionSeconds === 0),
    'formation inventory changes archive one zero-time report each');
}

{
  const ambiguous = createRuntime({ ambiguousFormationItem: true });
  const model = ambiguous.freshModel();
  model.player.inventory.stacks.gatheringFormation = 1;
  ambiguous.replaceModel(model);
  const result = ambiguous.api.commands.equipFormation({
    slotIndex: 0,
    itemId: 'gatheringFormation'
  });
  ok(commandShape(result) && !result.ok &&
     result.changed === false &&
     result.code === 'ambiguous_formation_item' &&
     ambiguous.controls.saveAttempts === 0,
    'equip rejects an itemId mapped by more than one formation definition');
}

// Active beast selection is immediate, frozen, persistent, and clearable.
{
  const model = runtime.freshModel();
  model.systems.homestead.beasts.roster.push({
    id: 'beast-1',
    speciesId: 'spiritFox',
    level: 1,
    xp: 0,
    traitId: 'keenNose',
    growthId: 'steady'
  });
  model.current = {
    key: 'gather:explore:herb',
    mode: 'finite',
    count: 1,
    done: 0,
    elapsed: 0,
    stalled: false,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null
  };
  runtime.replaceModel(model);
  const selected = API.commands.setActiveBeast({ beastId: 'beast-1' });
  const afterSelect = runtime.snapshot();
  const cleared = API.commands.setActiveBeast({ beastId: null });
  const afterClear = runtime.snapshot();
  ok(commandShape(selected) && selected.ok && selected.changed &&
     afterSelect.systems.homestead.beasts.activeIds[0] === 'beast-1' &&
     afterSelect.current.key === model.current.key,
    'setActiveBeast selects one assistant without interrupting main action');
  ok(commandShape(cleared) && cleared.ok && cleared.changed &&
     afterClear.systems.homestead.beasts.activeIds.length === 0 &&
     afterClear.current.key === model.current.key &&
     afterClear.reportArchive.length === 0 &&
     runtime.controls.saveAttempts === 2,
    'setActiveBeast null clears and each success persists exactly once');
}

// Every reporting command returns the archived report ID and records the
// exact zero-time command delta. Beast selection intentionally has no report.
{
  const reportCases = [
    {
      name: 'sellItem',
      prepare(model) {
        model.player.inventory.stacks.lingzhi = 1;
        return model;
      },
      invoke(api) {
        return api.commands.sellItem({ itemId: 'lingzhi', quantity: 1 });
      },
      costs: { items: { lingzhi: 1 }, supplies: {} },
      gains: {
        items: { lingshi: 1 },
        skillXp: {},
        masteryXp: {},
        cultivation: 0
      }
    },
    {
      name: 'plant',
      prepare(model) {
        model.player.inventory.stacks.commonSeed = 1;
        return model;
      },
      invoke(api) {
        return api.commands.plant({
          plotId: 'plot-1',
          cropId: 'spiritRice'
        });
      },
      costs: { items: { commonSeed: 1 }, supplies: {} },
      gains: {
        items: {},
        skillXp: {},
        masteryXp: {},
        cultivation: 0
      }
    },
    {
      name: 'harvest',
      prepare(model) {
        return readySpiritRice(model);
      },
      invoke(api) {
        return api.commands.harvest({ plotId: 'plot-1' });
      },
      costs: { items: {}, supplies: {} },
      gains: {
        items: { spiritRice: 4 },
        skillXp: { farming: 10 },
        masteryXp: { 'farming:spiritRice': 5 },
        cultivation: 0
      }
    },
    {
      name: 'equipFormation',
      prepare(model) {
        model.player.inventory.stacks.gatheringFormation = 1;
        return model;
      },
      invoke(api) {
        return api.commands.equipFormation({
          slotIndex: 0,
          itemId: 'gatheringFormation'
        });
      },
      costs: { items: {}, supplies: {} },
      gains: {
        items: {},
        skillXp: {},
        masteryXp: {},
        cultivation: 0
      }
    },
    {
      name: 'unequipFormation',
      prepare(model, isolated) {
        model.player.inventory.stacks.gatheringFormation = 1;
        return clone(isolated.sandbox.Formations.equip(
          model,
          0,
          'gatheringFormation'
        ).state);
      },
      invoke(api) {
        return api.commands.unequipFormation({ slotIndex: 0 });
      },
      costs: { items: {}, supplies: {} },
      gains: {
        items: {},
        skillXp: {},
        masteryXp: {},
        cultivation: 0
      }
    }
  ];

  reportCases.forEach((testCase) => {
    const isolated = createRuntime();
    const model = testCase.prepare(isolated.freshModel(), isolated);
    isolated.replaceModel(model);
    const result = testCase.invoke(isolated.api);
    const reports = isolated.snapshot().reportArchive;
    const report = reports[0];
    ok(commandShape(result) &&
       result.ok &&
       result.changed &&
       reports.length === 1 &&
       result.data.reportId === report.id,
    testCase.name + ' DTO reportId is the one archived report ID');
    same({
      source: report.source,
      fromMs: report.fromMs,
      toMs: report.toMs,
      requestedSeconds: report.requestedSeconds,
      mainActionSeconds: report.mainActionSeconds,
      action: report.action,
      costs: report.costs,
      gains: report.gains
    }, {
      source: 'command',
      fromMs: 1700000000000,
      toMs: 1700000000000,
      requestedSeconds: 0,
      mainActionSeconds: 0,
      action: {
        key: 'command:' + testCase.name,
        completed: 1,
        stopReason: null,
        stopAtMs: null
      },
      costs: testCase.costs,
      gains: testCase.gains
    }, testCase.name + ' archives its exact zero-duration costs and gains');
  });

  const isolated = createRuntime();
  const beastModel = isolated.freshModel();
  beastModel.systems.homestead.beasts.roster.push({
    id: 'beast-1',
    speciesId: 'spiritFox',
    level: 1,
    xp: 0,
    traitId: 'keenNose',
    growthId: 'steady'
  });
  isolated.replaceModel(beastModel);
  const selected = isolated.api.commands.setActiveBeast({
    beastId: 'beast-1'
  });
  ok(selected.ok &&
     selected.data.beastId === 'beast-1' &&
     !Object.prototype.hasOwnProperty.call(selected.data, 'reportId') &&
     isolated.snapshot().reportArchive.length === 0,
  'setActiveBeast returns no report ID and archives no report');
}

{
  const swapped = createRuntime({ swappedFormationItems: true });
  const model = swapped.freshModel();
  model.player.inventory.stacks.farmlandFormation = 1;
  swapped.replaceModel(model);
  const result = swapped.api.commands.equipFormation({
    slotIndex: 0,
    itemId: 'farmlandFormation'
  });
  ok(result.ok &&
     result.data.itemId === 'farmlandFormation' &&
     result.data.formationId === 'gatheringFormation' &&
     swapped.snapshot().systems.homestead.formations.slots[0] ===
       'gatheringFormation',
    'equip resolves the one content definition even when itemId and formationId differ');
}

// Same-millisecond immediate reports remain distinct.
{
  const model = runtime.freshModel();
  model.player.inventory.stacks.lingzhi = 2;
  runtime.replaceModel(model);
  API.commands.sellItem({ itemId: 'lingzhi', quantity: 1 });
  API.commands.sellItem({ itemId: 'lingzhi', quantity: 1 });
  const reports = runtime.snapshot().reportArchive;
  ok(reports.length === 2 &&
     reports[0].id !== reports[1].id &&
     reports[0].action.key === 'command:sellItem' &&
     reports[1].action.key === 'command:sellItem#2',
    'same-millisecond commands use stable distinct report action keys and IDs');
}

// Inventory is the exact object-shaped Inventory.query VM.
{
  const model = runtime.freshModel();
  model.player.inventory.stacks.lingzhi = 3;
  model.player.inventory.stacks.gatheringFormation = 1;
  runtime.replaceModel(model);
  const view = API.queries.inventory({
    category: 'material',
    search: '灵芝'
  });
  const direct = runtime.sandbox.Inventory.query(
    runtime.harness.__test.snapshotModel().player.inventory,
    { category: 'material', search: '灵芝' }
  );
  same(clone(view), clone(direct),
    'inventory API is exactly the detached Inventory.query object');
  ok(deeplyFrozen(view) &&
     view.capacity === 40 &&
     view.used === 2 &&
     view.free === 38 &&
     view.selectedCategory === 'material' &&
     view.search === '灵芝' &&
     view.items.length === 1 &&
     view.items[0].itemId === 'lingzhi' &&
     view.items[0].quantity === 3,
    'inventory returns the detached frozen Inventory.query object VM');
  try {
    view.items[0].quantity = 999;
    view.items.push({ itemId: 'fake' });
  } catch (error) {}
  ok(API.queries.inventory({
    category: 'material',
    search: '灵芝'
  }).items[0].quantity === 3,
  'inventory nested mutation cannot affect the next query');
}

// Production skill pages expose progression, bonuses, recipe eligibility,
// costs, and active progress.
{
  const model = runtime.freshModel();
  model.player.inventory.stacks.garumHerb = 1;
  model.player.inventory.stacks.potatoSeeds = 2;
  model.current = {
    key: 'produce:alchemy:birdNestPotionI',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 4,
    stalled: false,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null
  };
  runtime.replaceModel(model);
  const page = API.queries.skillPage('炼丹');
  const first = page.recipes.find((recipe) =>
    recipe.recipeId === 'alchemy:birdNestPotionI');
  const locked = page.recipes.find((recipe) =>
    recipe.recipeId === 'alchemy:meleeAccuracyPotionI');
  ok(deeplyFrozen(page) &&
     page.skillId === 'alchemy' &&
     page.level === 1 &&
     page.xp === 0 &&
     page.nextXp > 0 &&
     page.bonuses.skillSpeedBonus === 0 &&
     typeof page.bonuses.craftingDurationReduction === 'number',
    'skillPage exposes frozen canonical skill progression and bonuses');
  ok(first.unlocked && first.costAvailable &&
     first.costs[0].itemId === 'garumHerb' &&
     first.costs[0].owned === 1 &&
     first.costs[1].itemId === 'potatoSeeds' &&
     first.costs[1].owned === 2 &&
     first.active && first.progress > 0 &&
     first.mastery.speedBonus === 0 &&
     locked.unlocked === false,
    'skillPage exposes unlocked/locked recipes, costs, and active progress');
}

{
  const model = runtime.freshModel();
  model.player.skills.cooking = { level: 12, xp: 0 };
  runtime.replaceModel(model);
  const page = API.queries.skillPage('烹饪');
  ok(deeplyFrozen(page) &&
     page.skillId === 'cooking' &&
     page.recipes.every((entry) => entry.recipeId !== 'cooking:beastFeed'),
    'default cooking skillPage hides legacy prototype recipes');
}

// Gathering pages expose explored capacity and fishing shared stocks.
{
  const model = runtime.freshModel();
  model.systems.gathering.spots.herb = [{
    instanceId: 'spot-1',
    skillId: 'herb',
    entryId: 'parityHerb1',
    capacity: 20,
    remaining: 7
  }];
  model.systems.gathering.fishStocks.spiritCarp = 9;
  model.current = currentAction('fish:pond', {
    mode: 'repeat',
    count: 0,
    stalled: true
  });
  runtime.replaceModel(model);
  const herb = API.queries.gatherPage('采药');
  const fish = API.queries.gatherPage('钓鱼');
  ok(deeplyFrozen(herb) &&
     herb.skillId === 'herb' &&
     herb.level === 1 &&
     herb.bonuses.skillSpeedBonus === 0 &&
     herb.explore.actionKey === 'gather:explore:herb' &&
     herb.resource.entryId === 'parityHerb1' &&
     herb.resource.remaining === 7 &&
     herb.resource.capacity === 20 &&
     herb.resource.mastery.level === 1 &&
     herb.resource.mastery.speedBonus === 0 &&
     herb.resource.drops[0].itemId === 'garumHerb',
    'gatherPage exposes progression, explore card, capacity, and drops');
  ok(deeplyFrozen(fish) &&
     fish.skillId === 'fishing' &&
     fish.spots.length === 10 &&
     fish.spots[0].actionKey === 'fish:pond' &&
     fish.spots[0].active === true &&
     fish.spots[0].stalled === true &&
     fish.spots.filter((spot) =>
       spot.species.some((species) =>
         species.speciesId === 'spiritCarp' &&
         species.stock === 9 &&
         species.maxStock === 20)).length >= 2,
    'fishing page exposes stalled state and shared stock across spots');
}

// Homestead delegates pure query domains and decorates beast action cards.
{
  const model = runtime.freshModel();
  model.systems.homestead.beasts.encounters.push({
    id: 'encounter-1',
    speciesId: 'spiritFox',
    sourceSkillId: 'herb'
  });
  model.systems.homestead.beasts.roster.push({
    id: 'beast-1',
    speciesId: 'spiritFox',
    level: 2,
    xp: 3,
    traitId: 'friendly',
    growthId: 'swift'
  });
  model.player.skills.beastTaming = { level: 21, xp: 0 };
  model.player.mastery.beastTaming.spiritFox = {
    level: 31,
    xp: 0
  };
  model.current = currentAction('beast:tame:encounter-1', {
    elapsed: 10,
    stalled: true
  });
  runtime.replaceModel(model);
  const farm = API.queries.homestead('farm');
  const formations = API.queries.homestead('formations');
  const beasts = API.queries.homestead('beasts');
  const tameDescriptor = runtime.harness.simulationRuntime.rules.getAction(
    runtime.snapshot()
  );
  const trainingModel = runtime.snapshot();
  trainingModel.current = currentAction('beast:train:beast-1', {
    mode: 'repeat',
    count: 0,
    elapsed: 5
  });
  const trainingDescriptor =
    runtime.harness.simulationRuntime.rules.getAction(trainingModel);
  ok(deeplyFrozen(farm) &&
     farm.plots.length === 3 &&
     farm.plantableCrops.length === 6,
    'homestead farm delegates Farm.query');
  ok(deeplyFrozen(formations) &&
     formations.slots.length === 1 &&
     formations.formations.length === 5,
    'homestead formations delegates Formations.query');
  ok(deeplyFrozen(beasts) &&
     beasts.encounters[0].tame.actionKey ===
       'beast:tame:encounter-1' &&
     beasts.roster[0].training.actionKey ===
       'beast:train:beast-1' &&
     beasts.roster[0].assistant.beastId === 'beast-1' &&
     beasts.roster[0].traitName === '亲和' &&
     beasts.roster[0].growthName === '敏捷',
    'homestead beasts exposes encounter, roster, assistant, and training cards');
  ok(tameDescriptor.duration === 55.272 &&
     trainingDescriptor.duration === 27.636 &&
     beasts.encounters[0].tame.durationSeconds ===
       tameDescriptor.duration &&
     beasts.roster[0].training.durationSeconds ===
       trainingDescriptor.duration,
    'leveled tame and training cards exactly match runtime action durations');
  ok(beasts.encounters[0].tame.active === true &&
     beasts.encounters[0].tame.stalled === true &&
     beasts.encounters[0].tame.progress ===
       10 / tameDescriptor.duration &&
     beasts.roster[0].training.active === false &&
     beasts.roster[0].training.stalled === false &&
     beasts.roster[0].training.progress === 0,
    'active tame card exposes stalled state and exact progress');
  runtime.replaceModel(trainingModel);
  const trainingBeasts = API.queries.homestead('beasts');
  ok(trainingBeasts.encounters[0].tame.active === false &&
     trainingBeasts.encounters[0].tame.stalled === false &&
     trainingBeasts.encounters[0].tame.progress === 0 &&
     trainingBeasts.roster[0].training.active === true &&
     trainingBeasts.roster[0].training.stalled === false &&
     trainingBeasts.roster[0].training.progress ===
       5 / trainingDescriptor.duration,
    'active training card exposes exact progress while tame is inactive');
  const meeting = API.queries.homestead('meetingHall');
  const inheritance = API.queries.homestead('inheritance');
  same(clone(meeting), { implemented: false },
    'meeting hall returns only an unimplemented card');
  same(clone(inheritance), { implemented: false },
    'inheritance hall returns only an unimplemented card');
  ok(deeplyFrozen(meeting) && deeplyFrozen(inheritance),
    'reserved homestead cards are deeply frozen');

  const invalidModel = runtime.snapshot();
  invalidModel.systems.homestead.beasts.encounters.push({
    id: 'invalid-encounter',
    speciesId: 'missing-species',
    sourceSkillId: 'herb'
  });
  runtime.replaceModel(invalidModel);
  const safeBeasts = API.queries.homestead('beasts');
  ok(deeplyFrozen(safeBeasts) &&
     !safeBeasts.encounters.some((entry) =>
       entry.id === 'invalid-encounter'),
    'invalid beast entries are safely normalized out of the frozen VM');
}

// Charm has progression/benefits only and no action affordance.
{
  const model = runtime.freshModel();
  model.player.skills.charm = { level: 12, xp: 7 };
  runtime.replaceModel(model);
  const charm = API.queries.charm();
  ok(deeplyFrozen(charm) &&
     charm.level === 12 &&
     charm.xp === 7 &&
     charm.nextXp > 0 &&
     charm.text === '通过社交互动自然提升' &&
     typeof charm.benefits.positiveRelationMultiplier === 'number' &&
     typeof charm.benefits.misunderstandingReduction === 'number',
    'charm exposes exact fixed text, progression, and benefits');
  ok(!('action' in charm) &&
     !('actionKey' in charm) &&
     !('button' in charm) &&
     typeof API.commands.gainCharm !== 'function',
    'charm has no action button or command method');
}

// Cross-query nested mutation resistance.
{
  const model = runtime.freshModel();
  model.player.inventory.stacks.gatheringFormation = 1;
  runtime.replaceModel(model);
  const first = API.queries.homestead('formations');
  const before = JSON.stringify(first);
  try {
    first.formations[0].name = '篡改';
    first.effects.gatheringExtraYieldChance = 99;
  } catch (error) {}
  ok(JSON.stringify(API.queries.homestead('formations')) === before,
    'nested homestead mutation leaves the next detached query unchanged');
}
}

console.log(
  '\n=== Stage 2 命令/查询 API 自测：' +
  pass + ' 通过 / ' + fail + ' 失败 ==='
);
if (fail) process.exit(1);
