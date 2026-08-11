'use strict';

const fs = require('fs');
const vm = require('vm');

const CombatContent = require('../content/combat.js');
const TechniqueContent = require('../content/techniques.js');
const Stage2State = require('../core/stage2-state.js');
const Stage3State = require('../core/stage3-state.js');
const CombatStats = require('../core/combat-stats.js');
const Techniques = require('../core/techniques.js');
const Inventory = require('../core/inventory.js');
const GameRandom = require('../core/random.js');
const SpiritBeasts = require('../core/spirit-beasts.js');

let passed = 0;
let failed = 0;

function ok(condition, message) {
  if (condition) passed++;
  else {
    failed++;
    console.error('x ' + message);
  }
}

function exact(actual, expected, message) {
  ok(
    JSON.stringify(actual) === JSON.stringify(expected),
    message + '\n  expected: ' + JSON.stringify(expected) +
      '\n  actual:   ' + JSON.stringify(actual)
  );
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sequenceRandom(values) {
  const rolls = values.slice();
  let draws = 0;
  return {
    next: function (seed) {
      const value = draws < rolls.length ? rolls[draws] : 0.99;
      draws++;
      return { seed: (seed + 1) >>> 0, value: value };
    },
    draws: function () { return draws; }
  };
}

function loadBrowserEngine(random, inventory) {
  const source = fs.readFileSync('./core/combat-engine.js', 'utf8');
  const context = {
    CombatContent: CombatContent,
    TechniqueContent: TechniqueContent,
    CombatStats: CombatStats,
    Techniques: Techniques,
    Inventory: inventory || Inventory,
    GameRandom: random || GameRandom,
    SpiritBeasts: SpiritBeasts,
    structuredClone: globalThis.structuredClone
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'core/combat-engine.js' });
  return context.CombatEngine;
}

function freshModel() {
  return Stage3State.normalize(Stage2State.createDefaults());
}

function learnAndEquip(model, techniqueId) {
  model.player.techniques.known[techniqueId] = { level: 1, xp: 0 };
  model.player.combat.loadouts[0].activeTechniques[0] = {
    techniqueId: techniqueId,
    condition: { type: 'always' }
  };
  return model;
}

function regionSession(engine, model) {
  const session = clone(engine.createSession(model, {
    mode: 'region',
    regionId: 'qingyunOutskirts',
    enemyId: 'thornHare',
    loadoutId: 'loadout-1'
  }));
  session.enemy.cooldownTicks = 999999;
  return session;
}

function context(model, rngState) {
  return {
    playerInventory: clone(model.player.inventory),
    rngState: rngState == null ? 7 : rngState
  };
}

const bindingDefinition = TechniqueContent.get('bindingTalisman');
exact(
  bindingDefinition && bindingDefinition.runeCost,
  { earthCharm: 1, bodyCharm: 1 },
  'bindingTalisman declares the rune charm cost used by combat'
);

let inventoryApplyCalls = 0;
const countedInventory = Object.freeze({
  apply: function (inventory, delta) {
    inventoryApplyCalls++;
    return Inventory.apply(clone(inventory), clone(delta));
  }
});

const castRandom = sequenceRandom([0, 0.99]);
const castEngine = loadBrowserEngine(castRandom, countedInventory);
const castModel = learnAndEquip(freshModel(), 'bindingTalisman');
castModel.player.inventory.stacks.earthCharm = 2;
castModel.player.inventory.stacks.bodyCharm = 3;
const castSession = regionSession(castEngine, castModel);
const cast = castEngine.advanceTick(castSession, context(castModel, 50));
exact(
  {
    applyCalls: inventoryApplyCalls,
    action: cast.session.lastPlayerAction,
    earthCharm: cast.playerInventory.stacks.earthCharm,
    bodyCharm: cast.playerInventory.stacks.bodyCharm,
    earthCost: cast.costs.items.earthCharm,
    bodyCost: cast.costs.items.bodyCharm,
    qi: cast.session.player.qi,
    xp: cast.gains.techniqueXp.bindingTalisman,
    slow: cast.session.enemy.statuses.slow &&
      cast.session.enemy.statuses.slow.remainingTicks
  },
  {
    applyCalls: 1,
    action: { id: 'bindingTalisman', slotIndex: 0, tick: 0 },
    earthCharm: 1,
    bodyCharm: 2,
    earthCost: 1,
    bodyCost: 1,
    qi: castSession.player.qi - bindingDefinition.qiCost,
    xp: 1,
    slow: 11
  },
  'a talisman technique consumes rune charms once and then resolves the cast'
);

const missingRandom = sequenceRandom([0, 0.99]);
const missingEngine = loadBrowserEngine(missingRandom);
const missingModel = learnAndEquip(freshModel(), 'bindingTalisman');
missingModel.player.inventory.stacks.earthCharm = 1;
const missingSession = regionSession(missingEngine, missingModel);
const missing = missingEngine.advanceTick(
  missingSession,
  context(missingModel, 60)
);
ok(
  missing.events.some(function (event) {
    return event.type === 'warning' &&
      event.code === 'missing_rune_charm' &&
      event.techniqueId === 'bindingTalisman';
  }),
  'missing rune charm emits a specific combat warning'
);
exact(
  {
    action: missing.session.lastPlayerAction,
    earthCharm: missing.playerInventory.stacks.earthCharm,
    bodyCharm: missing.playerInventory.stacks.bodyCharm,
    costs: missing.costs.items,
    qi: missing.session.player.qi,
    xp: missing.gains.techniqueXp.bindingTalisman,
    hasSlow: Object.prototype.hasOwnProperty.call(
      missing.session.enemy.statuses,
      'slow'
    )
  },
  {
    action: { id: 'normalAttack', slotIndex: null, tick: 0 },
    earthCharm: 1,
    bodyCharm: undefined,
    costs: {},
    qi: missingSession.player.qi,
    xp: undefined,
    hasSlow: false
  },
  'missing rune charm falls back to normal attack without partial costs'
);

if (failed) {
  console.error(
    'rune combat consumption selftest failed: ' +
      passed + ' passed / ' + failed + ' failed'
  );
  process.exitCode = 1;
} else {
  console.log('rune combat consumption selftest passed: ' + passed);
}
