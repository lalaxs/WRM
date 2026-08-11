'use strict';

const fs = require('fs');
const vm = require('vm');
const { isDeepStrictEqual } = require('node:util');

let pass = 0;
let fail = 0;

function ok(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.error('  ✗ FAIL: ' + message);
  }
}

function exact(actual, expected, message) {
  ok(isDeepStrictEqual(actual, expected), message);
}

function noThrow(run, message) {
  try {
    run();
    ok(true, message);
  } catch (error) {
    ok(false, message + ' (' + error.message + ')');
  }
}

const GatheringContent = require('../content/gathering.js');
const Inventory = require('../core/inventory.js');
const SkillProgression = require('../core/skill-progression.js');
const GameRandom = require('../core/random.js');
const Stage2State = require('../core/stage2-state.js');
const beforeGlobal = globalThis.Gathering;
const Gathering = require('../core/gathering.js');

ok(globalThis.Gathering === beforeGlobal,
  'CommonJS loading does not attach a browser global');
ok(Object.isFrozen(Gathering), 'CommonJS Gathering API is frozen');
exact(Object.keys(Gathering), ['create'],
  'Task 5 exposes only the factory; fishing methods arrive in Task 6');

function sequenceRandom(values) {
  let draws = 0;
  return {
    next(seed) {
      draws++;
      const index = seed >>> 0;
      return {
        seed: index + 1,
        value: values[index] == null ? 0 : values[index]
      };
    },
    draws() {
      return draws;
    }
  };
}

function realDeps(random) {
  return {
    GatheringContent,
    Inventory,
    SkillProgression,
    GameRandom: random || GameRandom
  };
}

function makeRules(values) {
  const random = sequenceRandom(values || []);
  return {
    random,
    rules: Gathering.create(realDeps(random))
  };
}

function freshModel() {
  return Stage2State.createDefaults();
}

function knownSpot(
  skillId = 'mining',
  entryId = 'copper',
  quality = 'common',
  remaining = 2,
  capacity = 2
) {
  const model = freshModel();
  model.systems.gathering.spots[skillId] = {
    instanceId: 'spot-1',
    skillId,
    entryId,
    quality,
    capacity,
    remaining
  };
  model.systems.gathering.nextSpotId = 2;
  return model;
}

function cloneContent() {
  return JSON.parse(JSON.stringify({
    GATHERING: GatheringContent.GATHERING,
    FISH_SPECIES: GatheringContent.FISH_SPECIES,
    RESOURCE_QUALITIES: GatheringContent.RESOURCE_QUALITIES
  }));
}

const frozenRules = Gathering.create(Object.freeze(realDeps()));
ok(Object.isFrozen(frozenRules), 'created gathering rules are frozen');
exact(Object.keys(frozenRules).sort(), [
  'advanceFishStocks', 'collect', 'explore', 'fish'
], 'gathering rules expose exploration, collection, and fishing');

const qualityCases = [
  [0.699999, 'common', 15],
  [0.70, 'fine', 19],
  [0.949999, 'fine', 19],
  [0.95, 'rare', 23]
];
qualityCases.forEach(([qualityRoll, quality, capacity]) => {
  const model = freshModel();
  const before = JSON.stringify(model);
  const made = makeRules([0, qualityRoll, 0]);
  const explored = made.rules.explore(model, 'mining', 0);
  ok(explored.ok && explored.code === 'ok',
    'exploration succeeds at quality boundary ' + qualityRoll);
  ok(explored.state !== model,
    'exploration returns detached state at boundary ' + qualityRoll);
  exact(explored.state.systems.gathering.spots.mining, {
    instanceId: 'spot-1',
    skillId: 'mining',
    entryId: 'copper',
    quality,
    capacity,
    remaining: capacity
  }, 'quality and rounded capacity are exact at ' + qualityRoll);
  ok(explored.rngState === 3 && made.random.draws() === 3,
    'exploration consumes exactly three draws at ' + qualityRoll);
  exact(explored.result, {
    spot: {
      instanceId: 'spot-1',
      skillId: 'mining',
      entryId: 'copper',
      quality,
      capacity,
      remaining: capacity
    }
  }, 'exploration returns a report-ready spot at ' + qualityRoll);
  exact(explored.gains, {
    items: {},
    skillXp: { mining: 10 },
    masteryXp: { 'explore:mining': 5 },
    cultivation: 1
  }, 'exploration reports exact gains at ' + qualityRoll);
  exact(explored.state.player.skills.mining, { level: 1, xp: 10 },
    'exploration writes skill progress exactly once');
  exact(
    explored.state.player.mastery.mining['explore:mining'],
    { level: 1, xp: 5 },
    'exploration writes exploration mastery exactly once'
  );
  ok(explored.state.player.xiwei === 1,
    'exploration writes cultivation exactly once');
  ok(explored.state.systems.gathering.nextSpotId === 2,
    'exploration advances nextSpotId once');
  ok(JSON.stringify(model) === before,
    'exploration preserves all input bytes at ' + qualityRoll);
});

const maxCapacity = makeRules([0, 0, 0.9999999999999999])
  .rules.explore(freshModel(), 'mining', 0);
ok(maxCapacity.state.systems.gathering.spots.mining.capacity === 30,
  'capacity roll near one selects the inclusive maximum');
const zeroRoll = makeRules([0, 0, 0])
  .rules.explore(freshModel(), 'mining', 0);
ok(zeroRoll.state.systems.gathering.spots.mining.capacity === 15,
  'zero capacity roll selects the inclusive minimum');

const oneEntryContent = cloneContent();
oneEntryContent.GATHERING.mining.entries =
  oneEntryContent.GATHERING.mining.entries.slice(0, 1);
oneEntryContent.GATHERING.mining.entries[0].capMin = 7;
oneEntryContent.GATHERING.mining.entries[0].capMax = 7;
const oneEntry = Gathering.create({
  GatheringContent: oneEntryContent,
  Inventory,
  SkillProgression,
  GameRandom: sequenceRandom([0.9999999999999999, 0, 0.999])
}).explore(freshModel(), 'mining', 0);
ok(oneEntry.ok
  && oneEntry.result.spot.entryId === 'copper'
  && oneEntry.result.spot.capacity === 7,
'single-entry pool and capMin=capMax are deterministic for near-one rolls');

const poolModel = freshModel();
poolModel.player.skills.mining = { level: 1, xp: 0 };
const firstPool = makeRules([0, 0, 0])
  .rules.explore(poolModel, 'mining', 0);
const lastPool = makeRules([0.9999999999999999, 0, 0])
  .rules.explore(poolModel, 'mining', 0);
ok(firstPool.result.spot.entryId === 'copper',
  'uniform pool index zero selects the first unlocked entry');
ok(lastPool.result.spot.entryId === 'iron',
  'uniform pool index near one selects the last unlocked entry');

const replacementModel = knownSpot('mining', 'iron', 'rare', 4, 9);
replacementModel.systems.gathering.spots.herb = {
  instanceId: 'spot-2',
  skillId: 'herb',
  entryId: 'lingzhiGrove',
  quality: 'fine',
  capacity: 5,
  remaining: 3
};
replacementModel.systems.gathering.nextSpotId = 3;
const previousMine = replacementModel.systems.gathering.spots.mining;
const previousHerb = JSON.parse(JSON.stringify(
  replacementModel.systems.gathering.spots.herb
));
const replaced = makeRules([0, 0, 0])
  .rules.explore(replacementModel, 'mining', 0);
ok(replaced.ok
  && replaced.result.spot.instanceId === 'spot-3'
  && replaced.result.spot.entryId === 'copper',
'completed exploration replaces the old same-skill point with a new ID');
ok(replaced.state.systems.gathering.spots.mining !== previousMine,
  'the old same-skill point is not recoverable from returned state');
exact(replaced.state.systems.gathering.spots.herb, previousHerb,
  'exploration preserves every other skill point');

const normalizedFallback = Stage2State.normalize({
  player: freshModel().player,
  systems: {
    gathering: {
      spots: {
        mining: {
          instanceId: 'spot-9',
          skillId: 'mining',
          entryId: 'copper',
          quality: 'common',
          capacity: 2,
          remaining: 2
        }
      }
    }
  }
});
ok(normalizedFallback.systems.gathering.nextSpotId === 10,
  'Stage2State repairs a missing nextSpotId above existing spot IDs');
const fallbackExplore = makeRules([0, 0, 0])
  .rules.explore(normalizedFallback, 'mining', 0);
ok(fallbackExplore.result.spot.instanceId === 'spot-10'
  && fallbackExplore.state.systems.gathering.nextSpotId === 11,
'exploration consumes the normalized nextSpotId fallback stably');

const lockedContent = cloneContent();
lockedContent.GATHERING.mining.entries.forEach(entry => {
  entry.unlockLevel = 2;
});
const lockedRandom = sequenceRandom([0, 0, 0]);
const lockedRules = Gathering.create({
  GatheringContent: lockedContent,
  Inventory,
  SkillProgression,
  GameRandom: lockedRandom
});
const lockedInput = freshModel();
const locked = lockedRules.explore(lockedInput, 'mining', 0);
ok(!locked.ok && locked.code === 'skill_locked',
  'exploration rejects an empty unlocked pool');
exact(locked.state, lockedInput,
  'locked exploration returns value-equivalent state');
ok(locked.state !== lockedInput && lockedRandom.draws() === 0,
  'locked exploration is detached and consumes no RNG');

for (const [skillId, code] of [
  ['fishing', 'invalid_skill'],
  ['alchemy', 'invalid_skill'],
  ['MINING', 'invalid_skill'],
  ['', 'invalid_skill'],
  [null, 'invalid_skill']
]) {
  const made = makeRules([0, 0, 0]);
  const model = freshModel();
  const rejected = made.rules.explore(model, skillId, 0);
  ok(!rejected.ok && rejected.code === code,
    'explore rejects unsupported skill ' + String(skillId));
  ok(made.random.draws() === 0 && rejected.rngState === 0,
    'invalid exploration consumes no RNG for ' + String(skillId));
}

for (const invalidRng of [NaN, Infinity, -1, 0.5, '0', null]) {
  const made = makeRules([0, 0, 0]);
  const rejected = made.rules.explore(freshModel(), 'mining', invalidRng);
  ok(!rejected.ok && rejected.code === 'invalid_rng',
    'explore rejects invalid serialized RNG ' + String(invalidRng));
  ok(made.random.draws() === 0,
    'invalid serialized RNG never invokes the random provider');
}

const successInput = knownSpot();
const successBefore = JSON.stringify(successInput);
const successMade = makeRules([0, 0.999]);
const collected = successMade.rules.collect(
  successInput,
  'mining',
  'copper',
  0,
  {}
);
ok(collected.ok && collected.code === 'ok',
  'one finite-resource collection succeeds');
ok(collected.state !== successInput
  && JSON.stringify(successInput) === successBefore,
'collection returns detached state and preserves the complete input');
ok(collected.state.systems.gathering.spots.mining.remaining === 1,
  'one collection decrements remaining capacity exactly once');
exact(collected.state.player.inventory.stacks, { copperOre: 1 },
  'weighted drop is transacted into inventory');
exact(collected.state.player.skills.mining, { level: 1, xp: 12 },
  'collection grants entry skill XP exactly once');
exact(collected.state.player.mastery.mining.copper, {
  level: 1,
  xp: 6
}, 'collection grants rounded half-entry mastery XP exactly once');
ok(collected.state.player.xiwei === 1,
  'collection grants declared cultivation exactly once');
exact(collected.gains, {
  items: { copperOre: 1 },
  skillXp: { mining: 12 },
  masteryXp: { 'mining:copper': 6 },
  cultivation: 1
}, 'collection returns exact report-ready gains');
exact(collected.result, {
  itemId: 'copperOre',
  quantity: 1,
  spot: {
    instanceId: 'spot-1',
    skillId: 'mining',
    entryId: 'copper',
    quality: 'common',
    capacity: 2,
    remaining: 1
  }
}, 'collection result reports item quantity and remaining point');
ok(collected.rngState === 2 && successMade.random.draws() === 2,
  'successful collection consumes exactly drop and extra-yield draws');

const weightedTotal = 116;
const firstBoundary = 100 / weightedTotal;
const secondBoundary = 108 / weightedTotal;
const weightedCases = [
  [0, 'copperOre'],
  [firstBoundary - Number.EPSILON, 'copperOre'],
  [firstBoundary, 'topaz'],
  [secondBoundary - Number.EPSILON, 'topaz'],
  [secondBoundary, 'lingshi'],
  [0.9999999999999999, 'lingshi']
];
weightedCases.forEach(([roll, itemId]) => {
  const result = makeRules([roll, 0.999])
    .rules.collect(knownSpot(), 'mining', 'copper', 0, {});
  ok(result.ok && result.result.itemId === itemId,
    'weighted cumulative boundary selects ' + itemId + ' at ' + roll);
});

const extraCases = [
  [0.149999, 2],
  [0.15, 1]
];
extraCases.forEach(([extraRoll, quantity]) => {
  const result = makeRules([0, extraRoll])
    .rules.collect(knownSpot('mining', 'copper', 'fine'), 'mining',
      'copper', 0, {});
  ok(result.ok && result.result.quantity === quantity,
    'fine-quality extra-yield boundary is exact at ' + extraRoll);
  ok(result.state.player.inventory.stacks.copperOre === quantity,
    'fine extra output is included in the single inventory transaction');
});

const masteryBonusModel = knownSpot(
  'mining', 'copper', 'rare', 2, 2
);
masteryBonusModel.player.mastery.mining.copper = {
  level: 99,
  xp: 0
};
for (const [extraRoll, quantity] of [
  [0.749999, 2],
  [0.75, 1]
]) {
  const result = makeRules([0, extraRoll])
    .rules.collect(
      masteryBonusModel,
      'mining',
      'copper',
      0,
      { extraYieldChance: 999 }
    );
  ok(result.ok && result.result.quantity === quantity,
    'combined extra-yield chance caps at .75; boundary ' + extraRoll);
}

let hostileBonusReads = 0;
const accessorBonuses = {};
Object.defineProperty(accessorBonuses, 'extraYieldChance', {
  enumerable: true,
  get() {
    hostileBonusReads++;
    throw new Error('must not invoke');
  }
});
const inheritedBonuses = Object.create({ extraYieldChance: 1 });
for (const [bonuses, label] of [
  [accessorBonuses, 'accessor'],
  [inheritedBonuses, 'prototype'],
  [{ extraYieldChance: NaN }, 'NaN'],
  [{ extraYieldChance: Infinity }, 'infinite'],
  [{ extraYieldChance: -1 }, 'negative'],
  [{ extraYieldChance: '1' }, 'non-number']
]) {
  noThrow(() => {
    const result = makeRules([0, 0])
      .rules.collect(
        knownSpot('mining', 'copper', 'common'),
        'mining',
        'copper',
        0,
        bonuses
      );
    ok(result.ok && result.result.quantity === 1,
      'unsafe ' + label + ' bonus is ignored');
  }, 'unsafe ' + label + ' bonus is non-throwing');
}
ok(hostileBonusReads === 0,
  'bonus validation never invokes an adversarial getter');

const depletedInput = knownSpot('mining', 'copper', 'common', 1, 1);
const depleted = makeRules([0, 1 - Number.EPSILON])
  .rules.collect(depletedInput, 'mining', 'copper', 0, {});
ok(depleted.ok
  && depleted.code === 'resource_depleted_after_completion',
'last capacity completes successfully with the explicit stop code');
ok(depleted.state.systems.gathering.spots.mining === null,
  'last capacity clears the finite resource point');
ok(depleted.result.spot === null,
  'last-capacity result reports that no point remains');
ok(depleted.gains.items.copperOre === 1
  && depleted.state.player.skills.mining.xp === 12,
'last capacity still commits items and progression');

const missingCases = [
  [freshModel(), 'mining', 'copper', 'missing point'],
  [knownSpot(), 'mining', 'tin', 'wrong entry'],
  [knownSpot(), 'woodcutting', 'willow', 'wrong skill point']
];
missingCases.forEach(([model, skillId, entryId, label]) => {
  const made = makeRules([0, 0]);
  const before = JSON.stringify(model);
  const result = made.rules.collect(model, skillId, entryId, 0, {});
  ok(!result.ok && result.code === 'resource_depleted',
    'collect rejects ' + label + ' as depleted');
  ok(result.rngState === 0 && made.random.draws() === 0,
    'depleted ' + label + ' consumes no RNG');
  exact(result.state, model,
    'depleted ' + label + ' returns value-equivalent state');
  ok(result.state !== model && JSON.stringify(model) === before,
    'depleted ' + label + ' returns detached state without mutation');
});

const lockedCollectInput = knownSpot(
  'mining', 'silver', 'common', 2, 2
);
const lockedCollectMade = makeRules([0, 0]);
const lockedCollect = lockedCollectMade.rules.collect(
  lockedCollectInput,
  'mining',
  'silver',
  0,
  {}
);
ok(!lockedCollect.ok && lockedCollect.code === 'skill_locked',
  'collection rejects a point above current skill level');
ok(lockedCollectMade.random.draws() === 0,
  'locked collection consumes no RNG');

for (const [skillId, entryId, code, label] of [
  ['fishing', 'pond', 'invalid_skill', 'fishing'],
  ['alchemy', 'healingPill', 'invalid_skill', 'non-resource skill'],
  ['mining', 'unknown', 'invalid_entry', 'unknown entry'],
  ['MINING', 'copper', 'invalid_skill', 'wrong-case skill']
]) {
  const made = makeRules([0, 0]);
  const result = made.rules.collect(
    knownSpot(),
    skillId,
    entryId,
    0,
    {}
  );
  ok(!result.ok && result.code === code,
    'collect rejects ' + label + ' with ' + code);
  ok(made.random.draws() === 0,
    'invalid ' + label + ' consumes no RNG');
}

const fullNewStack = knownSpot();
fullNewStack.player.inventory.capacity = 1;
fullNewStack.player.inventory.stacks = { tinOre: 3 };
const fullBefore = JSON.stringify(fullNewStack);
const fullMade = makeRules([0, 0]);
const full = fullMade.rules.collect(
  fullNewStack,
  'mining',
  'copper',
  0,
  {}
);
ok(!full.ok && full.code === 'inventory_full',
  'new stack is rejected when all inventory slots are occupied');
ok(full.rngState === 2 && fullMade.random.draws() === 2,
  'inventory-full failure returns advanced RNG to prevent reroll abuse');
exact(full.state, fullNewStack,
  'inventory-full collection is an all-state no-op');
ok(full.state !== fullNewStack
  && JSON.stringify(fullNewStack) === fullBefore,
'inventory-full failure is detached and preserves input bytes');
ok(full.state.systems.gathering.spots.mining.remaining === 2
  && full.state.player.skills.mining.xp === 0
  && full.state.player.mastery.mining.copper.xp === 0
  && !Object.prototype.hasOwnProperty.call(full.state.player, 'xiwei'),
'inventory-full failure grants no capacity, XP, mastery, or cultivation');
exact(full.gains, {
  items: {},
  skillXp: {},
  masteryXp: {},
  cultivation: 0
}, 'inventory-full failure reports no gains');

const fullExistingStack = knownSpot();
fullExistingStack.player.inventory.capacity = 1;
fullExistingStack.player.inventory.stacks = { copperOre: 5 };
const stacked = makeRules([0, 0])
  .rules.collect(
    fullExistingStack,
    'mining',
    'copper',
    0,
    {}
  );
ok(stacked.ok
  && stacked.state.player.inventory.stacks.copperOre === 6,
'full inventory still accepts output into an existing stack');

for (const invalidRng of [NaN, Infinity, -1, 0.5, '0', undefined]) {
  const made = makeRules([0, 0]);
  const result = made.rules.collect(
    knownSpot(),
    'mining',
    'copper',
    invalidRng,
    {}
  );
  ok(!result.ok && result.code === 'invalid_rng',
    'collect rejects invalid serialized RNG ' + String(invalidRng));
  ok(made.random.draws() === 0,
    'invalid collection RNG never invokes the random provider');
}

for (const [badModel, label] of [
  [null, 'null'],
  [{}, 'empty'],
  [Object.create(freshModel()), 'inherited'],
  [{ player: { skills: null } }, 'partial'],
  [{ player: { skills: { mining: { level: NaN, xp: 0 } } } }, 'NaN']
]) {
  noThrow(() => {
    const made = makeRules([0, 0, 0]);
    const explored = made.rules.explore(badModel, 'mining', 0);
    const collectedBad = made.rules.collect(
      badModel,
      'mining',
      'copper',
      0,
      {}
    );
    ok(!explored.ok && explored.code === 'invalid_model',
      'explore rejects ' + label + ' model');
    ok(!collectedBad.ok && collectedBad.code === 'invalid_model',
      'collect rejects ' + label + ' model');
  }, 'invalid ' + label + ' model is non-throwing');
}

let modelGetterReads = 0;
const getterModel = {};
Object.defineProperty(getterModel, 'player', {
  enumerable: true,
  get() {
    modelGetterReads++;
    throw new Error('must not invoke');
  }
});
noThrow(() => {
  const result = makeRules([0, 0, 0])
    .rules.explore(getterModel, 'mining', 0);
  ok(!result.ok && result.code === 'invalid_model',
    'accessor model is rejected safely');
}, 'model validation is getter-safe');
ok(modelGetterReads === 0,
  'model validation never invokes an adversarial getter');

let arrayLengthReads = 0;
const proxiedArrayModel = freshModel();
proxiedArrayModel.systems.parallel.jobs = new Proxy([], {
  get(target, key, receiver) {
    if (key === 'length') {
      arrayLengthReads++;
      throw new Error('must not invoke');
    }
    return Reflect.get(target, key, receiver);
  }
});
noThrow(() => {
  const result = makeRules([0, 0, 0])
    .rules.explore(proxiedArrayModel, 'mining', 0);
  ok(result.ok,
    'proxied data-only array model is cloned without invoking getters');
}, 'model cloning is proxy-array getter-safe');
ok(arrayLengthReads === 0,
  'model cloning reads array length from its data descriptor');

const invalidRandomRules = Gathering.create(realDeps({
  next() {
    return { seed: NaN, value: 2 };
  }
}));
noThrow(() => {
  const result = invalidRandomRules.explore(freshModel(), 'mining', 0);
  ok(!result.ok && result.code === 'invalid_rng',
    'invalid random-provider output is rejected safely');
}, 'invalid random-provider output is non-throwing');

const deterministicInput = knownSpot('mining', 'copper', 'fine', 2, 2);
const deterministicBefore = JSON.stringify(deterministicInput);
const deterministicA = makeRules([firstBoundary, 0.1])
  .rules.collect(
    deterministicInput,
    'mining',
    'copper',
    0,
    { extraYieldChance: 0.01 }
  );
const deterministicB = makeRules([firstBoundary, 0.1])
  .rules.collect(
    deterministicInput,
    'mining',
    'copper',
    0,
    { extraYieldChance: 0.01 }
  );
exact(deterministicA, deterministicB,
  'same model, seed, bonuses, and dependency sequence are deterministic');
ok(JSON.stringify(deterministicInput) === deterministicBefore,
  'repeated deterministic collection preserves all input bytes');

function stableDependencyRejection(buildDeps, message) {
  let rejected = null;
  try {
    Gathering.create(buildDeps());
  } catch (error) {
    rejected = error;
  }
  ok(rejected instanceof TypeError,
    message + ' rejects with TypeError');
  ok(rejected && rejected.message ===
    'deps contains an unsafe dependency snapshot',
  message + ' uses the stable dependency error without leaking trap text');
}

let entriesLengthReads = 0;
const proxiedEntriesContent = cloneContent();
proxiedEntriesContent.GATHERING.mining.entries = new Proxy(
  proxiedEntriesContent.GATHERING.mining.entries,
  {
    get(target, key, receiver) {
      if (key === 'length') {
        entriesLengthReads++;
        throw new Error('entries length secret');
      }
      return Reflect.get(target, key, receiver);
    }
  }
);
noThrow(() => {
  stableDependencyRejection(() => ({
    ...realDeps(),
    GatheringContent: proxiedEntriesContent
  }), 'proxied entries array');
}, 'proxied entries dependency rejects without exposing its trap');
ok(entriesLengthReads === 0,
  'entries dependency snapshot never invokes a Proxy length getter');

let dropsLengthReads = 0;
const proxiedDropsContent = cloneContent();
proxiedDropsContent.GATHERING.mining.entries[0].drops = new Proxy(
  proxiedDropsContent.GATHERING.mining.entries[0].drops,
  {
    get(target, key, receiver) {
      if (key === 'length') {
        dropsLengthReads++;
        throw new Error('drops length secret');
      }
      return Reflect.get(target, key, receiver);
    }
  }
);
noThrow(() => {
  stableDependencyRejection(() => ({
    ...realDeps(),
    GatheringContent: proxiedDropsContent
  }), 'proxied drops array');
}, 'proxied drops dependency rejects without exposing its trap');
ok(dropsLengthReads === 0,
  'drops dependency snapshot never invokes a Proxy length getter');

for (const [trapName, handler] of [
  ['getPrototypeOf', {
    getPrototypeOf() {
      throw new Error('prototype trap secret');
    }
  }],
  ['ownKeys', {
    ownKeys() {
      throw new Error('ownKeys trap secret');
    }
  }],
  ['getOwnPropertyDescriptor', {
    getOwnPropertyDescriptor() {
      throw new Error('descriptor trap secret');
    }
  }]
]) {
  const trappedContent = new Proxy(cloneContent(), handler);
  noThrow(() => {
    stableDependencyRejection(() => ({
      ...realDeps(),
      GatheringContent: trappedContent
    }), trapName + ' dependency trap');
  }, trapName + ' dependency trap has a stable rejection');
}

const thisRandom = {
  value: [0, 0, 0],
  next(seed) {
    return {
      seed: (seed >>> 0) + 1,
      value: this.value[seed >>> 0]
    };
  }
};
const thisRandomRules = Gathering.create(realDeps(thisRandom));
thisRandom.value[0] = 0.9999999999999999;
thisRandom.value[1] = 0.95;
thisRandom.value[2] = 0.9999999999999999;
thisRandom.value = [0.5, 0.8, 0.5];
thisRandom.next = function () {
  throw new Error('late random method replacement must not be used');
};
const isolatedRandom = thisRandomRules.explore(
  freshModel(),
  'mining',
  0
);
ok(isolatedRandom.ok
  && isolatedRandom.result.spot.entryId === 'copper'
  && isolatedRandom.result.spot.quality === 'common'
  && isolatedRandom.result.spot.capacity === 15,
'random this-data and method are deeply snapshotted at factory creation');

const mutableContent = cloneContent();
const mutableInventory = { apply: Inventory.apply };
const mutableProgression = {
  addSkillXp: SkillProgression.addSkillXp,
  addMasteryXp: SkillProgression.addMasteryXp,
  masteryYieldOrRetentionChance:
    SkillProgression.masteryYieldOrRetentionChance
};
const mutableRandom = sequenceRandom([0, 0, 0]);
const copiedRules = Gathering.create({
  GatheringContent: mutableContent,
  Inventory: mutableInventory,
  SkillProgression: mutableProgression,
  GameRandom: mutableRandom
});
mutableContent.GATHERING.mining.entries[0].id = 'mutated';
mutableContent.GATHERING.mining.entries[0].drops[0].itemId = 'tinOre';
mutableContent.GATHERING.mining.entries.push(
  JSON.parse(JSON.stringify(mutableContent.GATHERING.mining.entries[0]))
);
mutableContent.RESOURCE_QUALITIES.common.capacityMultiplier = 99;
mutableInventory.apply = function () {
  throw new Error('late mutation must not be used');
};
mutableProgression.addSkillXp = function () {
  throw new Error('late mutation must not be used');
};
mutableRandom.next = function () {
  throw new Error('late mutation must not be used');
};
noThrow(() => {
  const result = copiedRules.explore(freshModel(), 'mining', 0);
  ok(result.ok
    && result.result.spot.entryId === 'copper'
    && result.result.spot.capacity === 15,
  'factory copies content and callable dependency boundaries');
}, 'late dependency mutation cannot affect created rules');

for (const [deps, label] of [
  [null, 'null deps'],
  [{}, 'empty deps'],
  [Object.create(realDeps()), 'inherited deps'],
  [{ ...realDeps(), Inventory: {} }, 'missing inventory apply'],
  [{ ...realDeps(), SkillProgression: {} }, 'missing progression calls'],
  [{ ...realDeps(), GameRandom: {} }, 'missing random next'],
  [{
    ...realDeps(),
    GatheringContent: { GATHERING: {}, RESOURCE_QUALITIES: {} }
  }, 'invalid content']
]) {
  noThrow(() => {
    let threw = false;
    try {
      Gathering.create(deps);
    } catch (error) {
      threw = error instanceof TypeError;
    }
    ok(threw, 'factory rejects ' + label + ' with TypeError');
  }, 'factory validation is stable for ' + label);
}

let depGetterReads = 0;
const accessorDeps = {};
Object.defineProperty(accessorDeps, 'GatheringContent', {
  enumerable: true,
  get() {
    depGetterReads++;
    throw new Error('must not invoke');
  }
});
noThrow(() => {
  let threw = false;
  try {
    Gathering.create(accessorDeps);
  } catch (error) {
    threw = error instanceof TypeError;
  }
  ok(threw, 'factory rejects accessor dependencies with TypeError');
}, 'dependency validation is getter-safe');
ok(depGetterReads === 0,
  'factory never invokes an adversarial dependency getter');

const sourceCode = fs.readFileSync('core/gathering.js', 'utf8');
const forbiddenProductionPatterns = [
  [/\bMath\.random\s*\(/, 'Math.random'],
  [/\bdocument\b/, 'DOM document'],
  [/\bCanvas\b|getContext\s*\(/, 'Canvas'],
  [/\blocalStorage\b|\bSaveSystem\b/, 'save side effect'],
  [/\bset(?:Timeout|Interval)\s*\(/, 'timer side effect']
];
for (const [pattern, label] of forbiddenProductionPatterns) {
  ok(!pattern.test(sourceCode),
    'gathering module has no ' + label + ' dependency');
}

const browserSandbox = {};
browserSandbox.globalThis = browserSandbox;
vm.createContext(browserSandbox);
for (const file of [
  'content/herblore-parity.js',
  'content/materials.js',
  'content/items.js',
  'content/life-skills.js',
  'content/gathering.js',
  'core/inventory.js',
  'core/skill-progression.js',
  'core/random.js',
  'core/gathering.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), browserSandbox, {
    filename: file
  });
}
ok(typeof browserSandbox.Gathering === 'object'
  && Object.isFrozen(browserSandbox.Gathering),
'browser UMD exposes one frozen Gathering API');
exact(Object.keys(browserSandbox).sort(), [
  'GameRandom',
  'Gathering',
  'GatheringContent',
  'HerbloreParityContent',
  'Inventory',
  'ItemContent',
  'LifeSkillContent',
  'MaterialContent',
  'SkillProgression',
  'globalThis'
], 'browser UMD does not leak gathering implementation helpers');
exact(Object.keys(browserSandbox.Gathering), ['create'],
  'browser and CommonJS expose the same Gathering factory');
ok(vm.runInContext(
  'Gathering.create({' +
    'GatheringContent:GatheringContent,' +
    'Inventory:Inventory,' +
    'SkillProgression:SkillProgression,' +
    'GameRandom:GameRandom' +
  '}).explore({' +
    'player:{skills:{mining:{level:1,xp:0}},' +
      'mastery:{mining:{\"explore:mining\":{level:1,xp:0}}},' +
      'inventory:{capacity:40,capacityGrants:{shop:0,achievement:0,task:0},' +
        'stacks:{},bindings:{}}},' +
    'systems:{gathering:{nextSpotId:1,' +
      'spots:{herb:null,mining:null,woodcutting:null}}}' +
  '},\"mining\",1).ok',
  browserSandbox
), 'browser UMD executes the same-realm pure exploration rule');

console.log('\n=== Stage 2 探索采集自测：' +
  pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
