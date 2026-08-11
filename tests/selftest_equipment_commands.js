'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stubContext() {
  return new Proxy({}, {
    get(target, property) {
      if (property === 'createLinearGradient') {
        return () => ({ addColorStop() {} });
      }
      if (property === 'measureText') return () => ({ width: 10 });
      if (property === 'canvas') return { width: 390, height: 760 };
      return () => {};
    }
  });
}

function stubCanvas() {
  return {
    width: 390,
    height: 760,
    clientWidth: 390,
    clientHeight: 760,
    getContext() { return stubContext(); },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 390, height: 760 };
    }
  };
}

const files = [
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
];

const canvas = stubCanvas();
const store = {};
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
        logicalH: 760
      };
    }
    if (property === 'load') {
      return (key) => key in store ? clone(store[key]) : null;
    }
    if (property === 'save') {
      return (key, value) => {
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
  document: {
    hidden: false,
    getElementById(id) { return id === 'game' ? canvas : null; },
    createElement(tag) {
      return tag === 'canvas'
        ? stubCanvas()
        : { style: {}, appendChild() {}, addEventListener() {} };
    },
    addEventListener() {}
  },
  console,
  Math,
  Date: class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [1700000000000]));
    }
    static now() { return 1700000000000; }
  },
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
vm.runInContext(fs.readFileSync('nie-manifest.js', 'utf8'), sandbox);
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, {
    filename: file
  });
});
vm.runInContext(fs.readFileSync('game.js', 'utf8'), sandbox, {
  filename: 'game.js'
});

const harness = sandbox.__GameTestHarness;
const api = sandbox.window.GameAPI;
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
model.processedThroughMs = 1700000000000;
model.lastActionStop = null;
model.player.shouMax = 1000000;
model.player.shouyuan = 1000000;
model.player.breakthrough.realmId = 'qi-3';
model.player.inventory.stacks.ironOre = 100;
model.player.inventory.stacks.spiritEssence = 20;

const generated = sandbox.Equipment.generate({
  baseId: 'qi-weapon',
  quality: 'legendary',
  instanceId: 'eq-1',
  source: { type: 'test', sourceId: 'commands', acquiredAt: 1 },
  rngState: 99
});
assert(generated.ok);
model.player.inventory.equipment = {
  version: 1,
  nextInstanceId: 2,
  instances: [clone(generated.instance)]
};
harness.__test.replaceModel(
  clone(sandbox.Stage3State.normalize(model))
);

const info = api.queries.equipmentInfo({ instanceId: 'eq-1' });
assert(info);
assert.strictEqual(info.instanceId, 'eq-1');
assert.strictEqual(info.slot, 'weapon');
assert(Array.isArray(info.affixes));
assert.strictEqual(info.permissions.canEquip, true);

const equipped = api.commands.equipEquipment({ instanceId: 'eq-1' });
assert(equipped.ok);
assert.strictEqual(equipped.data.slot, 'weapon');
assert.strictEqual(
  harness.__test.snapshotModel().player.combat.loadouts[0].equipment.weapon,
  'eq-1'
);

const enhanced = api.commands.enhanceEquipment({
  instanceId: 'eq-1',
  useProtection: false
});
assert(enhanced.ok);
assert.strictEqual(enhanced.data.level, 1);

const beforeReforge = api.queries.equipmentInfo({ instanceId: 'eq-1' });
const reforged = api.commands.reforgeEquipment({
  instanceId: 'eq-1',
  lockedAffixIndex: 0
});
assert(reforged.ok);
const afterReforge = api.queries.equipmentInfo({ instanceId: 'eq-1' });
assert.deepStrictEqual(afterReforge.affixes[0], beforeReforge.affixes[0]);

const favored = api.commands.setEquipmentFavorite({
  instanceId: 'eq-1',
  favorite: true
});
assert(favored.ok);
const blockedFavorite = api.commands.sellEquipment({
  instanceId: 'eq-1'
});
assert.strictEqual(blockedFavorite.ok, false);
assert.strictEqual(blockedFavorite.code, 'equipment_favorite');

assert(api.commands.setEquipmentFavorite({
  instanceId: 'eq-1',
  favorite: false
}).ok);
const blockedReference = api.commands.sellEquipment({
  instanceId: 'eq-1'
});
assert.strictEqual(blockedReference.ok, false);
assert.strictEqual(blockedReference.code, 'equipment_referenced');

assert(api.commands.unequipEquipment({ slot: 'weapon' }).ok);
const sold = api.commands.sellEquipment({ instanceId: 'eq-1' });
assert(sold.ok);
assert.strictEqual(
  harness.__test.snapshotModel().player.inventory.equipment.instances.length,
  0
);

console.log('equipment command self-test passed');
