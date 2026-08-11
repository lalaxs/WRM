'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

const ItemContent = require('../content/items.js');
const RealmContent = require('../content/realms.js');
const Inventory = require('../core/inventory.js');
const GameRandom = require('../core/random.js');
const Stage3State = require('../core/stage3-state.js');
const StateModel = require('../core/state-model.js');
const Breakthrough = require('../core/breakthrough.js');

let passed = 0;

function ok(condition, message) {
  assert.ok(condition, message);
  passed++;
}

function equal(actual, expected, message) {
  assert.deepStrictEqual(actual, expected, message);
  passed++;
}

function json(value) {
  return JSON.parse(JSON.stringify(value));
}

function bytes(value) {
  return JSON.stringify(value);
}

function freshModel() {
  const model = Stage3State.normalize(
    StateModel.normalize(Stage3State.defaults(), 0)
  );
  model.rngState = 1;
  model.player.shouMax = 120;
  model.player.shouyuan = 87;
  model.player.lifespanAnchorMs = 1000;
  model.player.lifespanBaseYears = 87;
  return model;
}

function readyModel(realmId, cultivation, stacks) {
  const model = freshModel();
  const transition = RealmContent.getTransition(realmId);
  model.player.breakthrough.realmId = realmId;
  model.player.breakthrough.cultivation = cultivation == null
    ? transition.cultivationNeed
    : cultivation;
  model.player.combatProgress.completedGates[transition.gate.id] = true;
  model.player.inventory.stacks = Object.assign({}, stacks || {});
  return model;
}

function failureSeed(chance) {
  for (let seed = 1; seed < 100000; seed++) {
    if (GameRandom.next(seed).value >= chance) return seed;
  }
  throw new Error('no deterministic failure seed found');
}

function assertCompleteAttemptDto(result, message) {
  equal(Object.keys(result).sort(), [
    'chance',
    'code',
    'consumed',
    'gateId',
    'ok',
    'realmAfter',
    'realmBefore',
    'rngState',
    'roll',
    'state'
  ].sort(), message + ' has the complete planned DTO');
  equal(Object.keys(result.consumed).sort(), [
    'eventBuffIds',
    'items'
  ], message + ' has the complete consumed DTO');
}

function loadBrowser(overrides) {
  const source = fs.readFileSync('./core/breakthrough.js', 'utf8');
  const context = Object.assign({
    console: console,
    ItemContent: ItemContent,
    Inventory: Inventory,
    RealmContent: RealmContent,
    GameRandom: GameRandom,
    structuredClone: structuredClone
  }, overrides || {});
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'core/breakthrough.js' });
  return context.Breakthrough;
}

equal(Object.keys(Breakthrough).sort(), [
  'addEventBuff',
  'attempt',
  'chance',
  'query',
  'requirements'
].sort(), 'Breakthrough exposes exactly the Task 10 public surface');
ok(Object.isFrozen(Breakthrough), 'Breakthrough export is frozen');
ok(Breakthrough.chance.length === 3,
  'chance has exactly the restricted three-argument signature');

{
  const model = freshModel();
  const transition = RealmContent.getTransition('qi-1');
  model.player.breakthrough.cultivation =
    transition.cultivationNeed - 1;
  model.player.combatProgress.completedGates[transition.gate.id] = true;
  const before = bytes(model);
  const requirements = Breakthrough.requirements(model);
  equal(requirements, {
    ok: true,
    code: 'insufficient_cultivation',
    realmId: 'qi-1',
    nextRealmId: 'qi-2',
    cultivation: 99,
    cultivationNeed: 100,
    cultivationMet: false,
    gateId: 'kill:thornHare:3',
    gateMet: true,
    ready: false
  }, 'insufficient cultivation is reported before a minor breakthrough');
  ok(Object.isFrozen(requirements),
    'requirements returns a frozen value object');
  const blocked = Breakthrough.attempt(model, []);
  ok(!blocked.ok && blocked.code === 'insufficient_cultivation',
    'insufficient cultivation blocks an attempt');
  assertCompleteAttemptDto(blocked, 'cultivation validation failure');
  ok(blocked.state === model,
    'cultivation validation failure preserves input identity');
  equal(blocked.rngState, model.rngState,
    'cultivation validation failure preserves RNG');
  equal(blocked.roll, null,
    'cultivation validation failure does not draw RNG');
  equal(bytes(model), before,
    'cultivation validation failure does not mutate input');
}

{
  const model = freshModel();
  const transition = RealmContent.getTransition('qi-1');
  model.player.breakthrough.cultivation =
    transition.cultivationNeed;
  const before = bytes(model);
  const requirements = Breakthrough.requirements(model);
  ok(requirements.code === 'gate_incomplete' &&
    requirements.cultivationMet &&
    !requirements.gateMet &&
    !requirements.ready,
  'missing permanent gate is reported after cultivation is met');
  const blocked = Breakthrough.attempt(model, []);
  ok(!blocked.ok && blocked.code === 'gate_incomplete',
    'missing permanent gate blocks a 100% minor transition');
  equal(bytes(model), before,
    'gate validation failure changes no state, inventory, event, or RNG');
}

{
  const transition = RealmContent.getTransition('qi-1');
  equal(Breakthrough.chance(transition, [], []), 1,
    'minor transition has the exact 100% content base chance');
  const model = readyModel('qi-1');
  const beforeSeed = model.rngState;
  const expectedDraw = GameRandom.next(beforeSeed);
  const result = Breakthrough.attempt(model, []);
  ok(result.ok && result.code === 'success',
    'ready minor transition succeeds');
  equal(result.roll, expectedDraw.value,
    '100% minor transition still uses the saved RNG draw');
  equal(result.rngState, expectedDraw.seed,
    '100% minor transition advances RNG exactly once');
  equal(result.state.rngState, expectedDraw.seed,
    'successful state stores the one advanced RNG seed');
  ok(result.state.player.breakthrough.realmId === 'qi-2' &&
    result.state.player.breakthrough.cultivation === 0,
  'minor transition advances realm and clears cultivation');
  ok(result.state.player.combatProgress.completedGates[
    transition.gate.id
  ] === true, 'minor transition retains its permanent gate');
}

{
  const expectedMajorBases = [
    ['qi-9', 0.60],
    ['foundation', 0.50],
    ['gold-core', 0.40],
    ['nascent-soul', 0.30],
    ['spirit-transformation', 0.25],
    ['void-refining', 0.20],
    ['body-integration', 0.15],
    ['mahayana', 0.10]
  ];
  expectedMajorBases.forEach(function (entry) {
    equal(
      Breakthrough.chance(
        RealmContent.getTransition(entry[0]),
        [],
        []
      ),
      entry[1],
      entry[0] + ' uses the exact authored major base chance'
    );
  });
}

{
  const transition = RealmContent.getTransition('qi-9');
  equal(
    Breakthrough.chance(
      transition,
      ['foundationPill', 'foundationPill'],
      []
    ),
    1,
    'two matching breakthrough pills add exactly 0.40'
  );
  equal(
    Breakthrough.chance(transition, ['goldCorePill'], []),
    null,
    'mismatched breakthrough pill is rejected'
  );
  equal(
    Breakthrough.chance(transition, ['healingPill'], []),
    null,
    'healing pill cannot enter breakthrough probability'
  );
  equal(
    Breakthrough.chance(transition, ['grilledCarp'], []),
    null,
    'food cannot enter breakthrough probability'
  );
  equal(
    Breakthrough.chance(transition, ['wardTalisman'], []),
    null,
    'talisman cannot enter breakthrough probability'
  );
  equal(
    Breakthrough.chance(
      transition,
      [],
      [
        { id: 'spent', bonus: 0.9, usesRemaining: 0 },
        { id: 'active', bonus: 0.15, usesRemaining: 2 }
      ]
    ),
    0.75,
    'only finite event buffs with remaining uses contribute'
  );
  equal(
    Breakthrough.chance(
      transition,
      ['foundationPill'],
      [{ id: 'omen', bonus: 0.9, usesRemaining: 1 }]
    ),
    1,
    'pill and event bonuses clamp final chance to 1.00'
  );
  equal(
    Breakthrough.chance(
      Object.assign({}, transition, { baseChance: 1 }),
      [],
      []
    ),
    null,
    'forged transition content is rejected'
  );
  equal(
    Breakthrough.chance(
      transition,
      [],
      [{ id: 'infinite', bonus: Infinity, usesRemaining: 1 }]
    ),
    null,
    'non-finite event bonus is rejected'
  );
  equal(
    Breakthrough.chance(
      transition,
      [],
      [
        { id: 'duplicate', bonus: 0.1, usesRemaining: 1 },
        { id: 'duplicate', bonus: 0.1, usesRemaining: 2 }
      ]
    ),
    null,
    'duplicate event IDs cannot be counted twice'
  );
}

{
  const transition = RealmContent.getTransition('foundation');
  const base = Breakthrough.chance(transition, [], []);
  const model = readyModel('foundation');
  const plain = Breakthrough.query(model, []);
  equal(Breakthrough.query(model).finalChance, plain.finalChance,
    'query defaults omitted pill selection to no selected pills');
  const noisy = json(model);
  noisy.player.combat.loadouts[0].equipment.weapon = 'cloudwoodSword';
  noisy.player.techniques.known.cloudPiercingSword = { level: 20, xp: 0 };
  noisy.player.formations = { breakthroughChance: 1 };
  noisy.player.spiritBeasts = { breakthroughChance: 1 };
  noisy.player.relationships = { breakthroughChance: 1 };
  noisy.player.sect = { breakthroughChance: 1 };
  noisy.player.homestead = { breakthroughChance: 1 };
  noisy.player.combatStats = { breakthroughChance: 1 };
  noisy.player.beast = { breakthroughChance: 1 };
  const noisyQuery = Breakthrough.query(noisy, []);
  equal(Breakthrough.chance(transition, [], []), base,
    'chance has no model or forbidden-system input path');
  equal(noisyQuery.finalChance, plain.finalChance,
    'adding every forbidden system field cannot change query chance');
  delete noisy.player.formations;
  delete noisy.player.spiritBeasts;
  delete noisy.player.relationships;
  delete noisy.player.sect;
  equal(Breakthrough.query(noisy, []).finalChance, plain.finalChance,
    'removing forbidden system fields cannot change query chance');
}

{
  const model = readyModel('qi-9', null, {
    foundationPill: 2,
    healingPill: 3,
    grilledCarp: 4,
    wardTalisman: 5,
    goldCorePill: 6
  });
  model.player.breakthrough.eventBuffs = [
    { id: 'omen-a', bonus: 0.05, usesRemaining: 2 },
    { id: 'spent', bonus: 0.9, usesRemaining: 0 },
    { id: 'omen-b', bonus: 0.05, usesRemaining: 1 }
  ];
  model.rngState = 1;
  const before = bytes(model);
  const expectedDraw = GameRandom.next(model.rngState);
  const result = Breakthrough.attempt(
    model,
    ['foundationPill', 'foundationPill']
  );
  ok(result.ok && result.code === 'success',
    'deterministic major breakthrough succeeds');
  assertCompleteAttemptDto(result, 'successful attempt');
  equal(result.chance, 1,
    'successful attempt reports the clamped final chance');
  equal(result.roll, expectedDraw.value,
    'successful attempt reports its one RNG roll');
  equal(result.rngState, expectedDraw.seed,
    'successful attempt advances RNG exactly once');
  equal(result.consumed, {
    items: { foundationPill: 2 },
    eventBuffIds: ['omen-a', 'omen-b']
  }, 'successful attempt reports exact included preparation');
  equal(result.realmBefore, 'qi-9',
    'successful DTO reports realm before');
  equal(result.realmAfter, 'foundation',
    'successful DTO reports realm after');
  equal(result.gateId, 'clear:foundationAltar:1',
    'successful DTO reports permanent gate');
  ok(result.state.player.breakthrough.realmId === 'foundation' &&
    result.state.player.breakthrough.cultivation === 0,
  'success advances realm and clears cultivation');
  equal(result.state.player.inventory.stacks, {
    healingPill: 3,
    grilledCarp: 4,
    wardTalisman: 5,
    goldCorePill: 6
  }, 'success consumes only matching selected breakthrough pills');
  equal(result.state.player.breakthrough.eventBuffs, [
    { id: 'omen-a', bonus: 0.05, usesRemaining: 1 },
    { id: 'spent', bonus: 0.9, usesRemaining: 0 },
    { id: 'omen-b', bonus: 0.05, usesRemaining: 0 }
  ], 'success consumes one use from each actually included event buff');
  ok(result.state.player.combatProgress.completedGates[
    'clear:foundationAltar:1'
  ] === true, 'success retains completed breakthrough gate');
  equal({
    shouyuan: result.state.player.shouyuan,
    shouMax: result.state.player.shouMax,
    lifespanAnchorMs: result.state.player.lifespanAnchorMs,
    lifespanBaseYears: result.state.player.lifespanBaseYears
  }, {
    shouyuan: 300,
    shouMax: 300,
    lifespanAnchorMs: null,
    lifespanBaseYears: null
  }, 'success refreshes lifespan from the target RealmContent contract');
  equal(bytes(model), before,
    'successful attempt leaves its input unchanged');
}

{
  const model = readyModel('foundation', null, { goldCorePill: 2 });
  model.player.combatProgress.completedGates['unrelated-gate'] = true;
  model.player.breakthrough.eventBuffs = [
    { id: 'trial-omen', bonus: 0, usesRemaining: 2 }
  ];
  model.rngState = failureSeed(0.90);
  const before = bytes(model);
  const expectedDraw = GameRandom.next(model.rngState);
  const failed = Breakthrough.attempt(
    model,
    ['goldCorePill', 'goldCorePill']
  );
  ok(failed.ok && failed.code === 'failure',
    'deterministic failed breakthrough is a legal consumed attempt');
  assertCompleteAttemptDto(failed, 'failed attempt');
  equal(failed.roll, expectedDraw.value,
    'failed attempt reports its one RNG roll');
  equal(failed.rngState, expectedDraw.seed,
    'failed attempt advances RNG exactly once');
  equal(failed.consumed, {
    items: { goldCorePill: 2 },
    eventBuffIds: ['trial-omen']
  }, 'failure consumes the same selected preparation');
  ok(failed.state.player.breakthrough.realmId === 'foundation' &&
    failed.state.player.breakthrough.cultivation === 0,
  'failure retains realm and clears cultivation');
  equal(failed.state.player.inventory.stacks, {},
    'failure consumes matching breakthrough pills');
  equal(failed.state.player.breakthrough.eventBuffs, [
    { id: 'trial-omen', bonus: 0, usesRemaining: 1 }
  ], 'failure consumes one use from every included active event buff');
  equal(failed.state.player.combatProgress.completedGates, {
    'clear:goldCoreRuins:1': true,
    'unrelated-gate': true
  }, 'failure retains every completed gate');
  equal({
    shouyuan: failed.state.player.shouyuan,
    shouMax: failed.state.player.shouMax,
    lifespanAnchorMs: failed.state.player.lifespanAnchorMs,
    lifespanBaseYears: failed.state.player.lifespanBaseYears
  }, {
    shouyuan: 87,
    shouMax: 120,
    lifespanAnchorMs: 1000,
    lifespanBaseYears: 87
  }, 'failure does not refresh or alter lifespan');
  equal(bytes(model), before,
    'failed legal attempt leaves its input unchanged');

  failed.state.player.breakthrough.cultivation = 6000;
  failed.state.player.inventory.stacks.goldCorePill = 1;
  const retry = Breakthrough.attempt(failed.state, ['goldCorePill']);
  ok(retry.code === 'success' || retry.code === 'failure',
    'retry after failure does not require re-clearing the permanent gate');
}

{
  const model = readyModel('foundation', null, {
    foundationPill: 2,
    healingPill: 1,
    grilledCarp: 1,
    wardTalisman: 1
  });
  const invalidSelections = [
    [['foundationPill'], 'pill_mismatch'],
    [['healingPill'], 'pill_mismatch'],
    [['grilledCarp'], 'pill_mismatch'],
    [['wardTalisman'], 'pill_mismatch'],
    [['goldCorePill', 'healingPill'], 'pill_mismatch'],
    [[, 'goldCorePill'], 'invalid_pills'],
    [Object.defineProperty([], '0', {
      enumerable: true,
      get: function () { throw new Error('must not execute'); }
    }), 'invalid_pills']
  ];
  invalidSelections.forEach(function (entry, index) {
    const before = bytes(model);
    const result = Breakthrough.attempt(model, entry[0]);
    ok(!result.ok && result.code === entry[1],
      'invalid pill selection ' + index + ' is rejected');
    assertCompleteAttemptDto(result, 'invalid pill selection ' + index);
    equal(result.roll, null,
      'invalid pill selection ' + index + ' consumes no RNG');
    equal(result.consumed, { items: {}, eventBuffIds: [] },
      'invalid pill selection ' + index + ' consumes nothing');
    equal(bytes(model), before,
      'invalid pill selection ' + index + ' leaves input unchanged');
  });
}

{
  const model = readyModel('foundation', null, { goldCorePill: 1 });
  const before = bytes(model);
  const result = Breakthrough.attempt(
    model,
    ['goldCorePill', 'goldCorePill']
  );
  ok(!result.ok && result.code === 'insufficient_items',
    'attempt rejects selection above available matching pill quantity');
  equal(result.roll, null,
    'inventory validation finishes before RNG draw');
  equal(bytes(model), before,
    'inventory validation failure changes no inventory or state');
}

{
  let applyCalls = 0;
  let rngCalls = 0;
  const guardedBreakthrough = loadBrowser({
    Inventory: Object.freeze({
      apply: function (inventory, delta) {
        applyCalls++;
        return Inventory.apply(inventory, delta);
      }
    }),
    GameRandom: Object.freeze({
      next: function (seed) {
        rngCalls++;
        return GameRandom.next(seed);
      }
    })
  });
  const cases = [
    ['unknown stack', function (inventory) {
      inventory.stacks.missingItem = 1;
    }],
    ['string healing quantity', function (inventory) {
      inventory.stacks.healingPill = '3';
    }],
    ['unsafe food quantity', function (inventory) {
      inventory.stacks.grilledCarp = Number.MAX_SAFE_INTEGER + 1;
    }],
    ['zero talisman quantity', function (inventory) {
      inventory.stacks.wardTalisman = 0;
    }],
    ['missing capacity', function (inventory) {
      delete inventory.capacity;
    }],
    ['string capacity', function (inventory) {
      inventory.capacity = '40';
    }],
    ['unsafe capacity', function (inventory) {
      inventory.capacity = Number.MAX_SAFE_INTEGER + 1;
    }],
    ['missing capacity grants', function (inventory) {
      delete inventory.capacityGrants;
    }],
    ['missing capacity-grant field', function (inventory) {
      delete inventory.capacityGrants.task;
    }],
    ['extra capacity-grant field', function (inventory) {
      inventory.capacityGrants.event = 1;
    }],
    ['invalid capacity-grant quantity', function (inventory) {
      inventory.capacityGrants.shop = '1';
    }],
    ['missing binding field', function (inventory) {
      inventory.bindings.foundationPill = {
        equipment: 1,
        task: 0
      };
    }],
    ['extra binding field', function (inventory) {
      inventory.bindings.foundationPill = {
        equipment: 1,
        task: 0,
        formation: 0,
        event: 0
      };
    }],
    ['zero-total binding', function (inventory) {
      inventory.bindings.foundationPill = {
        equipment: 0,
        task: 0,
        formation: 0
      };
    }],
    ['binding without stack', function (inventory) {
      inventory.bindings.goldCorePill = {
        equipment: 1,
        task: 0,
        formation: 0
      };
    }],
    ['non-plain stack map', function (inventory) {
      inventory.stacks = new Date(0);
    }],
    ['non-plain capacity grants', function (inventory) {
      inventory.capacityGrants = [];
    }],
    ['non-plain bindings map', function (inventory) {
      inventory.bindings = [];
    }],
    ['extra inventory field', function (inventory) {
      inventory.legacyStacks = {};
    }]
  ];
  cases.forEach(function (entry) {
    [[], ['foundationPill']].forEach(function (selectedPills) {
      const model = readyModel('qi-9', null, {
        foundationPill: 2,
        healingPill: 3,
        grilledCarp: 1,
        wardTalisman: 1
      });
      model.player.breakthrough.eventBuffs = [
        { id: 'preserved-omen', bonus: 0.1, usesRemaining: 2 }
      ];
      entry[1](model.player.inventory);
      const before = bytes(model);
      const beforeCultivation =
        model.player.breakthrough.cultivation;
      const beforeEvents = bytes(
        model.player.breakthrough.eventBuffs
      );
      const beforeSeed = model.rngState;
      const result = guardedBreakthrough.attempt(
        model,
        selectedPills
      );
      ok(!result.ok && result.code === 'invalid_state',
        entry[0] + ' fails closed before an ' +
          (selectedPills.length ? 'item' : 'empty') + ' selection');
      equal(applyCalls, 0,
        entry[0] + ' never reaches Inventory.apply');
      equal(rngCalls, 0,
        entry[0] + ' never reaches RNG');
      equal(result.roll, null,
        entry[0] + ' reports no RNG roll');
      equal(json(result.consumed), { items: {}, eventBuffIds: [] },
        entry[0] + ' reports no consumed preparation');
      equal(model.rngState, beforeSeed,
        entry[0] + ' preserves RNG state');
      equal(model.player.breakthrough.cultivation, beforeCultivation,
        entry[0] + ' preserves cultivation');
      equal(bytes(model.player.breakthrough.eventBuffs), beforeEvents,
        entry[0] + ' preserves event uses');
      equal(bytes(model), before,
        entry[0] + ' preserves every unrelated inventory field');
    });
  });
}

{
  const model = freshModel();
  model.player.breakthrough.realmId = 'ascension';
  model.player.breakthrough.cultivation = Number.MAX_SAFE_INTEGER;
  const before = bytes(model);
  const requirements = Breakthrough.requirements(model);
  ok(requirements.code === 'highest_realm' &&
    requirements.nextRealmId === null &&
    !requirements.ready,
  'final realm requirements returns highest_realm');
  const result = Breakthrough.attempt(model, []);
  ok(!result.ok && result.code === 'highest_realm',
    'final realm attempt returns highest_realm');
  assertCompleteAttemptDto(result, 'highest-realm attempt');
  equal(bytes(model), before,
    'highest-realm attempt leaves all input unchanged');
}

{
  const model = readyModel('mahayana');
  model.rngState = 1;
  const result = Breakthrough.attempt(model, []);
  ok(result.ok && result.code === 'success',
    'final authored transition can succeed');
  equal({
    realmId: result.state.player.breakthrough.realmId,
    shouyuan: result.state.player.shouyuan,
    shouMax: result.state.player.shouMax,
    lifespanAnchorMs: result.state.player.lifespanAnchorMs,
    lifespanBaseYears: result.state.player.lifespanBaseYears
  }, {
    realmId: 'ascension',
    shouyuan: null,
    shouMax: null,
    lifespanAnchorMs: null,
    lifespanBaseYears: null
  }, 'ascension applies the existing immortal lifespan contract');
}

{
  const model = freshModel();
  const before = bytes(model);
  const invalidBuffs = [
    null,
    {},
    { id: '', bonus: 0.1, usesRemaining: 1 },
    { id: '   ', bonus: 0.1, usesRemaining: 1 },
    { id: 'bad', bonus: NaN, usesRemaining: 1 },
    { id: 'bad', bonus: Infinity, usesRemaining: 1 },
    { id: 'bad', bonus: -0.01, usesRemaining: 1 },
    { id: 'bad', bonus: 1.01, usesRemaining: 1 },
    { id: 'bad', bonus: 0.1, usesRemaining: 0 },
    { id: 'bad', bonus: 0.1, usesRemaining: 1.5 },
    { id: 'bad', bonus: 0.1, usesRemaining: Number.MAX_SAFE_INTEGER + 1 }
  ];
  invalidBuffs.forEach(function (buff, index) {
    const result = Breakthrough.addEventBuff(model, buff);
    ok(!result.ok && result.code === 'invalid_buff',
      'invalid event buff ' + index + ' is rejected');
    ok(result.state === model,
      'invalid event buff ' + index + ' preserves input identity');
  });
  equal(bytes(model), before,
    'all invalid event buffs leave model unchanged');
}

{
  const model = freshModel();
  const added = Breakthrough.addEventBuff(model, {
    id: 'omen',
    bonus: 0.10,
    usesRemaining: 2
  });
  ok(added.ok && added.code === 'added' && added.state !== model,
    'new valid event buff is added to a cloned state');
  equal(added.state.player.breakthrough.eventBuffs, [
    { id: 'omen', bonus: 0.10, usesRemaining: 2 }
  ], 'event hook stores only the strict event-buff schema');
  equal(model.player.breakthrough.eventBuffs, [],
    'event hook never mutates its input');

  const lower = Breakthrough.addEventBuff(added.state, {
    id: 'omen',
    bonus: 0.90,
    usesRemaining: 1
  });
  ok(lower.ok && lower.code === 'unchanged' &&
    lower.state === added.state,
  'same ID with no greater uses is a stable no-op');

  const equalUses = Breakthrough.addEventBuff(added.state, {
    id: 'omen',
    bonus: 0.90,
    usesRemaining: 2
  });
  ok(equalUses.ok && equalUses.code === 'unchanged' &&
    equalUses.state === added.state,
  'same ID with equal uses is a stable no-op');

  const replaced = Breakthrough.addEventBuff(added.state, {
    id: 'omen',
    bonus: 0.25,
    usesRemaining: 3
  });
  ok(replaced.ok && replaced.code === 'replaced' &&
    replaced.state !== added.state,
  'same ID is replaced only by greater uses');
  equal(replaced.state.player.breakthrough.eventBuffs, [
    { id: 'omen', bonus: 0.25, usesRemaining: 3 }
  ], 'greater-use replacement stores the new validated record');
}

{
  const model = readyModel('qi-9', null, { foundationPill: 3 });
  model.player.breakthrough.eventBuffs = [
    { id: 'active', bonus: 0.05, usesRemaining: 2 },
    { id: 'spent', bonus: 0.50, usesRemaining: 0 }
  ];
  const view = Breakthrough.query(model, ['foundationPill']);
  ok(Object.isFrozen(view) &&
    Object.isFrozen(view.currentRealm) &&
    Object.isFrozen(view.nextRealm) &&
    Object.isFrozen(view.gate) &&
    Object.isFrozen(view.pill) &&
    Object.isFrozen(view.eventBuffs) &&
    Object.isFrozen(view.eventBuffs[0]),
  'breakthrough query is deeply frozen');
  equal({
    code: view.code,
    ready: view.ready,
    cultivation: view.cultivation,
    cultivationNeed: view.cultivationNeed,
    baseChance: view.baseChance,
    pill: view.pill,
    eventBonus: view.eventBonus,
    finalChance: view.finalChance,
    failureConsequence: view.failureConsequence
  }, {
    code: 'ready',
    ready: true,
    cultivation: 3000,
    cultivationNeed: 3000,
    baseChance: 0.60,
    pill: {
      itemId: 'foundationPill',
      owned: 3,
      maxSelectable: 3,
      selected: 1,
      bonus: 0.20
    },
    eventBonus: 0.05,
    finalChance: 0.85,
    failureConsequence: {
      cultivationCleared: true,
      gateRetained: true,
      selectedPreparationConsumed: true
    }
  }, 'query exposes the authored breakthrough plan and only three chance sources');
  const leakedRealm = view.currentRealm;
  const leakedBuff = view.eventBuffs[0];
  try { leakedRealm.name = 'mutated'; } catch (error) {}
  try { leakedBuff.bonus = 1; } catch (error) {}
  const again = Breakthrough.query(model, ['foundationPill']);
  ok(again.currentRealm.name === '练气九层' &&
    again.eventBuffs[0].bonus === 0.05,
  'query mutations cannot leak into content or state');
}

{
  const model = freshModel();
  model.player.breakthrough.realmId = 'ascension';
  model.player.breakthrough.eventBuffs = [
    { id: 'active-omen', bonus: 0.1, usesRemaining: 1 },
    { id: 'spent-omen', bonus: 0.2, usesRemaining: 0 }
  ];
  const view = Breakthrough.query(model);
  equal(view.eventBuffs, [
    {
      id: 'active-omen',
      bonus: 0.1,
      usesRemaining: 1,
      active: true
    },
    {
      id: 'spent-omen',
      bonus: 0.2,
      usesRemaining: 0,
      active: false
    }
  ], 'highest-realm query uses the normal event-buff DTO shape');
  ok(Object.isFrozen(view.eventBuffs) &&
    Object.isFrozen(view.eventBuffs[0]) &&
    Object.isFrozen(view.eventBuffs[1]),
  'highest-realm event-buff DTO remains deeply frozen');
}

{
  const badAccessor = freshModel();
  let getterCalls = 0;
  Object.defineProperty(badAccessor.player.breakthrough, 'cultivation', {
    enumerable: true,
    configurable: true,
    get: function () {
      getterCalls++;
      return 100;
    }
  });
  const attempt = Breakthrough.attempt(badAccessor, []);
  ok(!attempt.ok && attempt.code === 'invalid_state',
    'accessor-backed required state fails closed');
  equal(getterCalls, 0,
    'accessor-backed required state is never executed');
  const view = Breakthrough.query(badAccessor, []);
  ok(!view.ok && view.code === 'invalid_state',
    'query fails closed on accessor-backed required state');
  equal(getterCalls, 0,
    'query never executes hostile accessors');
}

{
  const target = readyModel('qi-9', null, { foundationPill: 1 });
  const hostileModel = new Proxy(target, {});
  const beforeSeed = target.rngState;
  const attempt = Breakthrough.attempt(hostileModel, ['foundationPill']);
  ok(!attempt.ok && attempt.code === 'invalid_state',
    'proxied model fails closed');
  equal(target.rngState, beforeSeed,
    'proxied model failure cannot draw RNG');
  equal(Breakthrough.chance(
    new Proxy(RealmContent.getTransition('qi-9'), {}),
    [],
    []
  ), null, 'proxied transition fails closed');
  ok(Breakthrough.query(hostileModel, []).code === 'invalid_state',
    'proxied query input fails closed');
  const buffResult = Breakthrough.addEventBuff(
    target,
    new Proxy({ id: 'omen', bonus: 0.1, usesRemaining: 1 }, {})
  );
  ok(!buffResult.ok && buffResult.code === 'invalid_buff',
    'proxied event buff fails closed');
}

{
  let applyCalls = 0;
  const browserInventory = Object.freeze({
    apply: function (inventory, delta) {
      applyCalls++;
      return Inventory.apply(inventory, delta);
    }
  });
  const browserBreakthrough = loadBrowser({
    Inventory: browserInventory
  });
  equal(Object.keys(browserBreakthrough).sort(),
    Object.keys(Breakthrough).sort(),
    'browser UMD exposes the same exact public surface');
  ok(Object.isFrozen(browserBreakthrough),
    'browser UMD export is frozen');
  const model = readyModel('qi-9', null, { foundationPill: 2 });
  model.player.breakthrough.eventBuffs = [
    { id: 'browser-omen', bonus: 0.1, usesRemaining: 1 }
  ];
  const result = browserBreakthrough.attempt(
    model,
    ['foundationPill', 'foundationPill']
  );
  ok(result.ok,
    'browser UMD performs a legal breakthrough: ' + JSON.stringify(result));
  equal(applyCalls, 1,
    'legal attempt consumes all selected pills through one Inventory.apply');

  const minor = browserBreakthrough.attempt(readyModel('qi-1'), []);
  ok(minor.ok && minor.code === 'success',
    'browser UMD performs a legal 100% minor transition');
  equal(applyCalls, 2,
    'legal no-pill minor attempt still crosses Inventory.apply exactly once');

  const failureModel = readyModel('foundation');
  failureModel.rngState = failureSeed(0.50);
  const failed = browserBreakthrough.attempt(failureModel, []);
  ok(failed.ok && failed.code === 'failure',
    'browser UMD performs a legal failed attempt');
  equal(applyCalls, 3,
    'legal failed attempt crosses Inventory.apply exactly once');

  const invalid = browserBreakthrough.attempt(
    model,
    ['healingPill']
  );
  ok(!invalid.ok, 'browser UMD rejects invalid selection');
  equal(applyCalls, 3,
    'validation failure never calls Inventory.apply');

  const proxied = new Proxy(model, {});
  ok(browserBreakthrough.attempt(proxied, []).code === 'invalid_state',
    'browser UMD fails closed on a proxy without Node proxy detection');
  equal(browserBreakthrough.chance(
    RealmContent.getTransition('qi-9'),
    new Proxy([], {}),
    []
  ), null, 'browser UMD chance rejects proxied pill selection');
  equal(browserBreakthrough.chance(
    RealmContent.getTransition('qi-9'),
    [],
    new Proxy([], {})
  ), null, 'browser UMD chance rejects proxied event selection');
}

{
  const source = fs.readFileSync('./core/breakthrough.js', 'utf8');
  ok(!/Math\.random|localStorage|Platform\.|SaveSystem|document\.|canvas|toast\(/.test(source),
    'breakthrough core has no UI, storage, or nondeterministic dependency');
  ok(!/CombatStats|Formations|SpiritBeasts|Techniques|Relations|Sect|Beast|Formation/.test(source),
    'breakthrough call graph imports no forbidden probability system');
}

console.log(
  '\n=== Stage 3 永久门槛突破自测：' +
  passed + ' 通过 / 0 失败 ==='
);
