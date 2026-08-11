'use strict';

const fs = require('fs');
const vm = require('vm');
const { isDeepStrictEqual } = require('node:util');
const GatheringContent = require('../content/gathering.js');
const Inventory = require('../core/inventory.js');
const SkillProgression = require('../core/skill-progression.js');
const GameRandom = require('../core/random.js');
const Stage2State = require('../core/stage2-state.js');
const Gathering = require('../core/gathering.js');

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

function near(actual, expected, epsilon, message) {
  ok(Math.abs(actual - expected) <= epsilon, message);
}

function sequenceRandom(values) {
  let draws = 0;
  return {
    next(seed) {
      const index = seed >>> 0;
      draws++;
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

function deps(random, content, inventory) {
  return {
    GatheringContent: content || GatheringContent,
    Inventory: inventory || Inventory,
    SkillProgression,
    GameRandom: random || GameRandom
  };
}

function makeRules(values, content, inventory) {
  const random = sequenceRandom(values || []);
  return {
    random,
    rules: Gathering.create(deps(random, content, inventory))
  };
}

function freshModel() {
  return Stage2State.createDefaults();
}

function clearStocks(model) {
  Object.keys(model.systems.gathering.fishStocks).forEach((speciesId) => {
    model.systems.gathering.fishStocks[speciesId] = 0;
  });
  return model;
}

function fillStocks(model, quantity) {
  Object.keys(model.systems.gathering.fishStocks).forEach((speciesId) => {
    model.systems.gathering.fishStocks[speciesId] = quantity;
  });
  return model;
}

function cloneContent() {
  return JSON.parse(JSON.stringify({
    GATHERING: GatheringContent.GATHERING,
    FISH_SPECIES: GatheringContent.FISH_SPECIES,
    RESOURCE_QUALITIES: GatheringContent.RESOURCE_QUALITIES,
    JUNK_POOL: GatheringContent.JUNK_POOL,
    SPECIAL_POOL: GatheringContent.SPECIAL_POOL,
    FISHING_PARITY: GatheringContent.FISHING_PARITY
  }));
}

function mergeRecovered(target, delta) {
  Object.keys(delta).forEach((speciesId) => {
    target[speciesId] = (target[speciesId] || 0) + delta[speciesId];
  });
  return target;
}

const defaultRules = Gathering.create(deps());
ok(typeof defaultRules.fish === 'function',
  'gathering rules expose fish completion');
ok(typeof defaultRules.advanceFishStocks === 'function',
  'gathering rules expose shared fish-stock recovery');
ok(Object.isFrozen(defaultRules),
  'extended gathering rules remain frozen');
exact(Object.keys(defaultRules).sort(), [
  'advanceFishStocks', 'collect', 'explore', 'fish'
], 'fishing methods are ordinary discoverable factory API keys');

// Preflight failures are detached, deterministic, and consume no RNG.
[
  ['missing', 1, 'invalid_spot'],
  ['shallow', 1, 'skill_locked']
].forEach(([spotId, skillLevel, code]) => {
  const model = freshModel();
  model.player.skills.fishing.level = skillLevel;
  const before = JSON.stringify(model);
  const made = makeRules([0, 0, 0]);
  const result = made.rules.fish(model, spotId, 0, {});
  ok(!result.ok && result.code === code,
    'fishing preflight rejects ' + spotId + ' with ' + code);
  ok(result.state !== model && JSON.stringify(result.state) === before,
    'preflight rejection returns an unchanged detached state for ' + spotId);
  ok(result.rngState === 0 && made.random.draws() === 0,
    'preflight rejection consumes no RNG for ' + spotId);
});

{
  const model = freshModel();
  const made = makeRules([0, 0, 0]);
  const result = made.rules.fish(model, 'pond', -1, {});
  ok(!result.ok && result.code === 'invalid_rng',
    'invalid fishing seed is rejected');
  ok(made.random.draws() === 0,
    'invalid fishing seed consumes no RNG');
}

{
  const model = clearStocks(freshModel());
  model.current = { key: 'fish:pond', elapsed: 2 };
  model.systems.gathering.fishRecoverAcc = 17.5;
  const before = JSON.stringify(model);
  const made = makeRules([0, 0, 0]);
  const result = made.rules.fish(model, 'pond', 0, {});
  ok(!result.ok && result.code === 'fish_stock_empty',
    'an empty fishing spot reports a waiting stock failure');
  near(result.retryAfterSeconds, 42.5, 1e-12,
    'empty spot reports exact time until shared base recovery');
  ok(JSON.stringify(result.state) === before &&
    result.state.current.key === 'fish:pond',
  'empty stock does not clear or mutate the selected action');
  ok(made.random.draws() === 0 && result.rngState === 0,
    'empty-stock waiting consumes no RNG');

  const reduced = made.rules.fish(model, 'pond', 0, {
    fishRecoveryReduction: 0.2,
    beastFishRecoveryReduction: 0.2
  });
  near(reduced.retryAfterSeconds, 18.5, 1e-12,
    'retry time uses the capped effective recovery interval');
}

// Weighted selection excludes zero stock and re-normalizes the live pool.
// pond live weights with only shrimp+carp: shrimp 40, carp 30 (total 70).
[
  [(40 / 70) - 1e-12, 'spiritShrimp'],
  [40 / 70, 'spiritCarp']
].forEach(([roll, speciesId]) => {
  const model = clearStocks(freshModel());
  model.systems.gathering.fishStocks.spiritCarp = 20;
  model.systems.gathering.fishStocks.spiritShrimp = 20;
  // rolls: species, type(fish), extra
  const made = makeRules([roll, 0, 0.99]);
  const result = made.rules.fish(model, 'pond', 0, {});
  ok(result.ok && result.result.speciesId === speciesId,
    'pond weight boundary selects ' + speciesId + ' at ' + roll);
  ok(result.result.outcome === 'fish',
    'forced type roll stays on fish outcome');
  ok(result.rngState === 3 && made.random.draws() === 3,
    'successful weighted catch consumes exactly three RNG draws');
});

{
  const model = clearStocks(freshModel());
  model.systems.gathering.fishStocks.spiritShrimp = 2;
  const made = makeRules([0, 0, 0.99]);
  const result = made.rules.fish(model, 'pond', 0, {});
  ok(result.ok && result.result.speciesId === 'spiritShrimp',
    'zero-stock fish is excluded and the remaining weight is normalized');
  ok(result.state.systems.gathering.fishStocks.spiritShrimp === 1,
    'one successful catch decrements only the caught shared species');
  ok(result.state.systems.gathering.fishStocks.spiritCarp === 0,
    'unavailable species remains unchanged');
}

{
  const model = clearStocks(freshModel());
  model.systems.gathering.fishStocks.spiritShrimp = 2;
  const before = JSON.stringify(model);
  // species=0 -> shrimp, type=0 -> fish, extra=0 -> double
  const made = makeRules([0, 0, 0]);
  const result = made.rules.fish(model, 'pond', 0, {
    extraYieldChance: 0.01
  });
  ok(result.ok && result.result.quantity === 2,
    'fishing extra-yield roll can double output');
  ok(result.state.systems.gathering.fishStocks.spiritShrimp === 1,
    'double output still consumes exactly one fish stock');
  ok(result.gains.items.spiritShrimp === 2,
    'extra fish output is reported exactly');
  ok(JSON.stringify(model) === before,
    'successful fishing does not mutate caller input');
}

[
  [0.749999999, 2],
  [0.75, 1]
].forEach(([extraRoll, quantity]) => {
  const model = clearStocks(freshModel());
  model.systems.gathering.fishStocks.spiritShrimp = 1;
  model.player.mastery.fishing.spiritShrimp.level = 99;
  const result = makeRules([0, 0, extraRoll]).rules.fish(
    model,
    'pond',
    0,
    { extraYieldChance: 999 }
  );
  ok(result.ok && result.result.quantity === quantity,
    'combined fishing extra chance caps at .75 boundary ' + extraRoll);
});

// Melvor-style type roll: fish / junk / special.
{
  const model = clearStocks(freshModel());
  model.systems.gathering.fishStocks.spiritShrimp = 2;
  // type target in [0.75, 1) => junk on pond (75/25/0)
  const junked = makeRules([0, 0.75, 0]).rules.fish(model, 'pond', 0, {});
  ok(junked.ok && junked.result.outcome === 'junk',
    'pond type roll can resolve to junk');
  ok(junked.state.systems.gathering.fishStocks.spiritShrimp === 2,
    'junk catches do not consume fish stock');
  ok((junked.gains.skillXp.fishing || 0) === 1,
    'junk catches grant exactly 1 fishing XP');
}

{
  const model = clearStocks(freshModel());
  model.player.skills.fishing.level = 80;
  model.systems.gathering.fishStocks.magicFish = 2;
  model.systems.gathering.fishingUnlocks = {
    secretCove: true,
    berserkShoal: false
  };
  // mysticPond specialChance 6%; force special via type roll after fish band
  // fish 84 junk 10 special 6 -> special starts at 0.94
  const special = makeRules([0, 0.95, 0]).rules.fish(
    model,
    'mysticPond',
    0,
    {}
  );
  ok(special.ok && special.result.outcome === 'special',
    'high-tier spot type roll can resolve to special');
  ok(typeof special.result.itemId === 'string' &&
    special.result.itemId !== special.result.speciesId,
  'special outcome grants a non-fish item');
}

{
  const model = clearStocks(freshModel());
  model.systems.gathering.fishStocks.spiritShrimp = 2;
  model.player.inventory.capacity = 0;
  const before = JSON.stringify(model);
  const made = makeRules([0, 0, 0]);
  const result = made.rules.fish(model, 'pond', 0, {
    extraYieldChance: 1
  });
  ok(!result.ok && result.code === 'inventory_full',
    'full inventory rejects combined fishing output');
  ok(result.rngState === 3 && made.random.draws() === 3,
    'inventory-full fishing still advances all three RNG draws');
  ok(JSON.stringify(result.state) === before &&
    JSON.stringify(model) === before,
  'inventory-full fishing changes no stock, progression, or caller state');
  exact(result.gains, {
    items: {},
    skillXp: {},
    masteryXp: {},
    cultivation: 0
  }, 'inventory-full fishing grants nothing');
}

{
  const model = clearStocks(freshModel());
  model.systems.gathering.fishStocks.spiritShrimp = 2;
  model.player.inventory.capacity = 1;
  model.player.inventory.stacks.spiritShrimp = 7;
  const fits = makeRules([0, 0, 0.99]).rules.fish(
    model,
    'pond',
    0,
    {}
  );
  ok(fits.ok && fits.state.player.inventory.stacks.spiritShrimp === 8,
    'existing fish stack fits without taking a new slot');
}

{
  let applyCalls = 0;
  let capturedDelta = null;
  const inventory = {
    apply(value, delta) {
      applyCalls++;
      capturedDelta = JSON.parse(JSON.stringify(delta));
      return Inventory.apply(value, delta);
    }
  };
  const model = clearStocks(freshModel());
  model.systems.gathering.fishStocks.spiritShrimp = 2;
  const result = makeRules([0, 0, 0], null, inventory).rules.fish(
    model,
    'pond',
    0,
    { extraYieldChance: 1 }
  );
  ok(result.ok && applyCalls === 1,
    'fish output uses exactly one inventory transaction');
  exact(capturedDelta, { spiritShrimp: 2 },
    'the one inventory transaction contains every rolled output');
}

// Fishing progression is shared by species across spots.
{
  const model = clearStocks(freshModel());
  model.player.skills.fishing.level = 8;
  model.systems.gathering.fishStocks.spiritShrimp = 2;
  let caught = makeRules([0, 0, 0.99]).rules.fish(
    model,
    'pond',
    0,
    {}
  );
  // shallow: shrimp/carp/trout — keep only shrimp
  Object.keys(caught.state.systems.gathering.fishStocks).forEach((id) => {
    if (id !== 'spiritShrimp') {
      caught.state.systems.gathering.fishStocks[id] = 0;
    }
  });
  const second = makeRules([0, 0, 0.99]).rules.fish(
    caught.state,
    'shallow',
    0,
    {}
  );
  ok(second.ok && second.result.speciesId === 'spiritShrimp',
    'the same live species can be caught at another unlocked spot');
  exact(second.state.player.mastery.fishing.spiritShrimp, {
    level: 1,
    xp: 13
  }, 'one species mastery record receives XP from both spots');
  exact(second.state.player.skills.fishing, { level: 8, xp: 26 },
    'spot XP advances the fishing skill exactly once per catch');
  ok(second.state.player.xiwei === 3,
    'fishing cultivation is rounded from each spot XP');
}

{
  const model = clearStocks(freshModel());
  model.player.skills.fishing.level = 8;
  model.systems.gathering.fishStocks.spiritShrimp = 1;
  const first = makeRules([0, 0, 0.99]).rules.fish(
    model,
    'pond',
    0,
    {}
  );
  Object.keys(first.state.systems.gathering.fishStocks).forEach((id) => {
    if (id !== 'spiritShrimp') {
      first.state.systems.gathering.fishStocks[id] = 0;
    }
  });
  const second = makeRules([0, 0, 0.99]).rules.fish(
    first.state,
    'shallow',
    0,
    {}
  );
  ok(!second.ok && second.code === 'fish_stock_empty',
    'same-species stock depletion is shared across fishing spots');
}

{
  const model = clearStocks(freshModel());
  model.systems.gathering.fishStocks.spiritShrimp = 1;
  const before = JSON.stringify(model);
  const made = makeRules([0, 0, 1]);
  const result = made.rules.fish(model, 'pond', 0, {});
  ok(!result.ok && result.code === 'invalid_rng',
    'a malformed third random draw rejects the catch');
  ok(result.rngState === 2 && made.random.draws() === 3,
    'malformed third draw reports the last valid RNG state');
  ok(JSON.stringify(result.state) === before,
    'malformed random output does not mutate stock or progression');
}

{
  let bonusReads = 0;
  const accessorBonuses = {};
  Object.defineProperty(accessorBonuses, 'extraYieldChance', {
    enumerable: true,
    get() {
      bonusReads++;
      return 1;
    }
  });
  const model = clearStocks(freshModel());
  model.systems.gathering.fishStocks.spiritShrimp = 1;
  const result = makeRules([0, 0, 0.99]).rules.fish(
    model,
    'pond',
    0,
    accessorBonuses
  );
  ok(result.ok && result.result.quantity === 1 && bonusReads === 0,
    'fishing ignores accessor bonus values without invoking them');

  const inherited = Object.create({ extraYieldChance: 1 });
  const inheritedResult = makeRules([0, 0, 0.99]).rules.fish(
    model,
    'pond',
    0,
    inherited
  );
  ok(inheritedResult.ok && inheritedResult.result.quantity === 1,
    'fishing ignores inherited bonus values');
}

// Passive recovery uses one shared seconds accumulator.
{
  const model = fillStocks(freshModel(), 20);
  model.systems.gathering.fishStocks.spiritCarp = 0;
  const before = JSON.stringify(model);
  const zero = defaultRules.advanceFishStocks(model, 0, {});
  ok(zero.ok && zero.state !== model &&
    JSON.stringify(zero.state) === before,
  'zero elapsed recovery is a detached no-op');
  exact(zero.recovered, {}, 'zero elapsed reports no recovery');

  const almost = defaultRules.advanceFishStocks(model, 59.999, {});
  ok(almost.ok &&
    almost.state.systems.gathering.fishStocks.spiritCarp === 0,
  '59.999 seconds does not cross the base recovery boundary');
  near(almost.state.systems.gathering.fishRecoverAcc, 59.999, 1e-12,
    'sub-boundary seconds remain in the shared accumulator');
  const boundary = defaultRules.advanceFishStocks(
    almost.state,
    0.001,
    {}
  );
  ok(boundary.state.systems.gathering.fishStocks.spiritCarp === 1,
    'the remaining 0.001 seconds reaches the 60-second boundary');
  near(boundary.state.systems.gathering.fishRecoverAcc, 0, 1e-12,
    'exact recovery boundary leaves no shared remainder');
}

{
  const model = fillStocks(freshModel(), 20);
  model.systems.gathering.fishStocks.spiritCarp = 0;
  const once = defaultRules.advanceFishStocks(model, 60, {});
  const chunks = defaultRules.advanceFishStocks(
    defaultRules.advanceFishStocks(model, 17, {}).state,
    43,
    {}
  );
  ok(once.state.systems.gathering.fishStocks.spiritCarp === 1,
    '60 seconds recovers one stock');
  exact(once.state.systems.gathering, chunks.state.systems.gathering,
    '17+43 seconds is byte-for-byte chunk invariant');
  exact(once.recovered, { spiritCarp: 1 },
    'recovery report contains the exact changed species delta');
  ok(JSON.stringify(model.systems.gathering.fishStocks.spiritCarp) === '0',
    'recovery leaves caller stock input unchanged');
}

// Formal-review regression: decimal term regrouping must not miss a boundary.
{
  const model = fillStocks(freshModel(), 20);
  model.systems.gathering.fishStocks.spiritCarp = 0;
  const firstSeconds = 18.117720000000002;
  const secondSeconds = 41.882279999999994;
  ok(firstSeconds + secondSeconds === 60,
    'reviewer split uses the same JavaScript total as the bulk call');

  const bulk = defaultRules.advanceFishStocks(
    model,
    firstSeconds + secondSeconds,
    {}
  );
  const first = defaultRules.advanceFishStocks(model, firstSeconds, {});
  const chunks = defaultRules.advanceFishStocks(
    first.state,
    secondSeconds,
    {}
  );
  const chunkReport = mergeRecovered(
    mergeRecovered({}, first.recovered),
    chunks.recovered
  );

  exact(chunks.state.systems.gathering, bulk.state.systems.gathering,
    'reviewer decimal split matches bulk full gathering JSON');
  exact(chunkReport, bulk.recovered,
    'reviewer decimal split and bulk recovery reports aggregate equally');
  ok(Number.isFinite(first.state.systems.gathering.fishRecoverAnchorMs) &&
    Number.isFinite(
      first.state.systems.gathering.fishRecoverBaseSeconds
    ),
  'mid-recovery state persists one complete fish timing account');

  const reloaded = Stage2State.normalize(
    JSON.parse(JSON.stringify(first.state))
  );
  const afterReload = defaultRules.advanceFishStocks(
    reloaded,
    secondSeconds,
    {}
  );
  exact(afterReload.state.systems.gathering, bulk.state.systems.gathering,
    'save/reload at reviewer midpoint continues identically to bulk');
  exact(
    mergeRecovered(
      mergeRecovered({}, first.recovered),
      afterReload.recovered
    ),
    bulk.recovered,
    'save/reload recovery report aggregates identically to bulk'
  );

  const waitingModel = fillStocks(freshModel(), 0);
  const waitingFirst = defaultRules.advanceFishStocks(
    waitingModel,
    firstSeconds,
    {}
  );
  const waiting = defaultRules.fish(
    waitingFirst.state,
    'pond',
    0,
    {}
  );
  near(waiting.retryAfterSeconds, secondSeconds, 2e-14,
    'retryAfter reads the same persisted logical fish time account');
}

{
  const reviewerParts = [
    4.274571518786251,
    5.996982158881588,
    4.95680199843811,
    2.893584131366018,
    2.0880736543153255,
    2.3578345539693584,
    1.4178149134522215,
    2.9303971792249883,
    1.798071100870249,
    0.5524166811845199,
    0.5459911922437685,
    1.6065188937068982,
    1.8024459786184373,
    0.2476368496626536,
    0.30670711207780615,
    2.846561429195671,
    1.782147251729703,
    0.9406393808672148,
    1.1673924221847463,
    0.06212355607961787,
    19.425288043144832
  ];
  const bulkSeconds = reviewerParts.reduce(
    (total, part) => total + part,
    0
  );
  ok(bulkSeconds === 60,
    '21-part reviewer sequence has a strict JavaScript reduce total of 60');
  const model = fillStocks(freshModel(), 20);
  model.systems.gathering.fishStocks.spiritCarp = 0;
  let chunkState = model;
  const chunkRecovered = {};
  reviewerParts.forEach((part) => {
    const step = defaultRules.advanceFishStocks(chunkState, part, {});
    chunkState = step.state;
    mergeRecovered(chunkRecovered, step.recovered);
  });
  const bulk = defaultRules.advanceFishStocks(model, bulkSeconds, {});
  exact(chunkState.systems.gathering, bulk.state.systems.gathering,
    '21-part reviewer sequence matches bulk full gathering JSON');
  exact(chunkRecovered, bulk.recovered,
    '21-part reviewer sequence matches bulk aggregated recovery report');
}

{
  let seed = 0xA5A5A5A5;
  function nextFraction() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  }
  for (let sample = 0; sample < 24; sample++) {
    const targetSeconds = 120;
    const parts = [];
    let assigned = 0;
    for (let index = 0; index < 7; index++) {
      const room = targetSeconds - assigned;
      const part = room * nextFraction() * 0.35;
      parts.push(part);
      assigned += part;
    }
    parts.push(targetSeconds - assigned);
    const bulkSeconds = parts.reduce((total, part) => total + part, 0);

    const model = fillStocks(freshModel(), 20);
    model.systems.gathering.fishStocks.spiritCarp = 0;
    let chunkState = model;
    const chunkRecovered = {};
    parts.forEach((part) => {
      const step = defaultRules.advanceFishStocks(chunkState, part, {});
      chunkState = step.state;
      mergeRecovered(chunkRecovered, step.recovered);
    });
    const bulk = defaultRules.advanceFishStocks(model, bulkSeconds, {});
    exact(
      chunkState.systems.gathering,
      bulk.state.systems.gathering,
      'random legal partition matches bulk gathering sample ' + sample
    );
    exact(
      chunkRecovered,
      bulk.recovered,
      'random legal partition report matches bulk sample ' + sample
    );
  }
}

{
  function partitionTarget(targetSeconds, count, initialSeed) {
    let seed = initialSeed >>> 0;
    let assigned = 0;
    const parts = [];
    for (let index = 0; index < count - 1; index++) {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      const fraction = seed / 0x100000000;
      const part = (targetSeconds - assigned) * fraction * 0.14;
      parts.push(part);
      assigned += part;
    }
    parts.push(targetSeconds - assigned);
    return parts;
  }

  [
    [120, 0x12345678],
    [600, 0x87654321]
  ].forEach(([targetSeconds, seed]) => {
    const parts = partitionTarget(targetSeconds, 21, seed);
    const bulkSeconds = parts.reduce(
      (total, part) => total + part,
      0
    );
    const model = fillStocks(freshModel(), 0);
    let chunkState = model;
    const chunkRecovered = {};
    parts.forEach((part) => {
      const step = defaultRules.advanceFishStocks(chunkState, part, {});
      chunkState = step.state;
      mergeRecovered(chunkRecovered, step.recovered);
    });
    const bulk = defaultRules.advanceFishStocks(model, bulkSeconds, {});
    exact(chunkState.systems.gathering, bulk.state.systems.gathering,
      targetSeconds + 's multi-interval all-species property matches state');
    exact(chunkRecovered, bulk.recovered,
      targetSeconds + 's multi-interval all-species property matches report');
  });

  const saveParts = partitionTarget(120, 21, 0xCAFEBABE);
  const saveBulkSeconds = saveParts.reduce(
    (total, part) => total + part,
    0
  );
  const saveModel = fillStocks(freshModel(), 0);
  let uninterruptedState = saveModel;
  const uninterruptedRecovered = {};
  let savedState = null;
  let savedRecovered = null;
  let savedIndex = -1;
  saveParts.forEach((part, index) => {
    const step = defaultRules.advanceFishStocks(
      uninterruptedState,
      part,
      {}
    );
    uninterruptedState = step.state;
    mergeRecovered(uninterruptedRecovered, step.recovered);
    if (savedState === null &&
        Object.keys(step.recovered).length > 0 &&
        index < saveParts.length - 1) {
      savedState = Stage2State.normalize(
        JSON.parse(JSON.stringify(step.state))
      );
      savedRecovered = JSON.parse(JSON.stringify(uninterruptedRecovered));
      savedIndex = index;
    }
  });
  ok(savedState !== null &&
    savedState.systems.gathering.fishRecoverAnchorMs >= 60000,
  'save checkpoint is captured after the first settled interval');
  let resumedState = savedState;
  const resumedRecovered = {};
  for (let index = savedIndex + 1; index < saveParts.length; index++) {
    const step = defaultRules.advanceFishStocks(
      resumedState,
      saveParts[index],
      {}
    );
    resumedState = step.state;
    mergeRecovered(resumedRecovered, step.recovered);
  }
  exact(resumedState.systems.gathering,
    uninterruptedState.systems.gathering,
    'save/reload after the first interval preserves the cumulative account');
  exact(
    mergeRecovered(savedRecovered, resumedRecovered),
    uninterruptedRecovered,
    'post-interval save/reload reports aggregate identically'
  );
  const saveBulk = defaultRules.advanceFishStocks(
    saveModel,
    saveBulkSeconds,
    {}
  );
  exact(uninterruptedState.systems.gathering,
    saveBulk.state.systems.gathering,
    'post-interval save/reload scenario also matches JS-reduce bulk');

  const dynamicParts = partitionTarget(72, 21, 0x0BADF00D);
  const dynamicBulkSeconds = dynamicParts.reduce(
    (total, part) => total + part,
    0
  );
  const dynamicModel = fillStocks(freshModel(), 0);
  let dynamicState = dynamicModel;
  const dynamicRecovered = {};
  dynamicParts.forEach((part) => {
    const step = defaultRules.advanceFishStocks(
      dynamicState,
      part,
      { fishRecoveryReduction: 0.4 }
    );
    dynamicState = step.state;
    mergeRecovered(dynamicRecovered, step.recovered);
  });
  const dynamicBulk = defaultRules.advanceFishStocks(
    dynamicModel,
    dynamicBulkSeconds,
    { fishRecoveryReduction: 0.4 }
  );
  exact(dynamicState.systems.gathering,
    dynamicBulk.state.systems.gathering,
    'dynamic 36-second interval remains partition invariant');
  exact(dynamicRecovered, dynamicBulk.recovered,
    'dynamic interval reports aggregate identically to bulk');
}

{
  const model = fillStocks(freshModel(), 0);
  const legalRemainder = 4e-13;
  const almost = defaultRules.advanceFishStocks(
    model,
    60 - legalRemainder,
    {}
  );
  ok(almost.state.systems.gathering.fishStocks.spiritCarp === 0,
    'scale-relative reconciliation does not absorb a legal 4e-13 duration');
  const reached = defaultRules.advanceFishStocks(
    almost.state,
    legalRemainder,
    {}
  );
  ok(reached.state.systems.gathering.fishStocks.spiritCarp === 1,
    'the legal 4e-13 remainder reaches the boundary when actually elapsed');
}

{
  const model = fillStocks(freshModel(), 20);
  model.systems.gathering.fishStocks.spiritCarp = 0;
  let chunked = model;
  const recovered = {};
  const tenths = Array.from({ length: 600 }, () => 0.1);
  tenths.forEach((part) => {
    const step = defaultRules.advanceFishStocks(chunked, part, {});
    chunked = step.state;
    Object.keys(step.recovered).forEach((speciesId) => {
      recovered[speciesId] =
        (recovered[speciesId] || 0) + step.recovered[speciesId];
    });
  });
  const bulkSeconds = tenths.reduce((total, part) => total + part, 0);
  const once = defaultRules.advanceFishStocks(model, bulkSeconds, {});
  exact(chunked.systems.gathering, once.state.systems.gathering,
    'six hundred 0.1-second chunks match their JS-reduce batch exactly');
  exact(recovered, once.recovered,
    'chunked recovery reports aggregate to the batched report');
}

{
  const model = fillStocks(freshModel(), 20);
  model.systems.gathering.fishStocks.spiritCarp = 0;
  model.systems.gathering.fishStocks.spiritShrimp = 19;
  const multi = defaultRules.advanceFishStocks(model, 180, {});
  ok(multi.state.systems.gathering.fishStocks.spiritCarp === 3 &&
    multi.state.systems.gathering.fishStocks.spiritShrimp === 20,
  'each completed interval adds one to every non-full species');
  exact(multi.recovered, {
    spiritCarp: 3,
    spiritShrimp: 1
  }, 'multi-interval recovery reports each species exact capped delta');

  const capped = defaultRules.advanceFishStocks(multi.state, 60 * 100, {});
  ok(capped.state.systems.gathering.fishStocks.spiritCarp === 20,
    'large passive recovery caps species stock at 20');
  ok(capped.state.systems.gathering.fishRecoverAcc === 0,
    'time after all species fill is never banked');
}

{
  const model = fillStocks(freshModel(), 19);
  const recovered = defaultRules.advanceFishStocks(model, 600, {});
  ok(Object.values(recovered.state.systems.gathering.fishStocks)
    .every((quantity) => quantity === 20),
  'a large step fills every species after the first needed interval');
  ok(recovered.state.systems.gathering.fishRecoverAcc === 0,
    'extra intervals after the stocks first fill are discarded');
  ok(Object.values(recovered.recovered)
    .every((quantity) => quantity === 1),
  'large-step report excludes discarded intervals');

  recovered.state.systems.gathering.fishRecoverAcc = 33;
  const full = defaultRules.advanceFishStocks(recovered.state, 12, {});
  ok(full.state.systems.gathering.fishRecoverAcc === 0,
    'all-full stocks clear an existing accumulator');
  exact(full.recovered, {},
    'all-full recovery reports no fabricated stock');
}

// Recovery reductions combine as seconds, cap at 40%, and do not rescale acc.
{
  const model = fillStocks(freshModel(), 20);
  model.systems.gathering.fishStocks.spiritCarp = 0;
  const almost = defaultRules.advanceFishStocks(model, 35.999, {
    fishRecoveryReduction: 0.3,
    beastFishRecoveryReduction: 0.3
  });
  ok(almost.state.systems.gathering.fishStocks.spiritCarp === 0,
    '40% cap never reduces interval below 36 seconds');
  const boundary = defaultRules.advanceFishStocks(almost.state, 0.001, {
    fishRecoveryReduction: 0.3,
    beastFishRecoveryReduction: 0.3
  });
  ok(boundary.state.systems.gathering.fishStocks.spiritCarp === 1,
    'formation and beast reductions combine additively at the cap');

  const switched = fillStocks(freshModel(), 20);
  switched.systems.gathering.fishStocks.spiritCarp = 0;
  switched.systems.gathering.fishRecoverAcc = 30;
  const afterSwitch = defaultRules.advanceFishStocks(switched, 6, {
    fishRecoveryReduction: 0.4
  });
  ok(afterSwitch.state.systems.gathering.fishStocks.spiritCarp === 1,
    'bonus changes retain accumulator seconds instead of rescaling progress');
}

{
  const invalidBonuses = [
    { fishRecoveryReduction: NaN },
    { beastFishRecoveryReduction: Infinity },
    { fishRecoveryReduction: -1 },
    { fishRecoveryReduction: '0.4' },
    Object.create({ fishRecoveryReduction: 0.4 })
  ];
  invalidBonuses.forEach((bonuses, index) => {
    const model = fillStocks(freshModel(), 20);
    model.systems.gathering.fishStocks.spiritCarp = 0;
    const result = defaultRules.advanceFishStocks(model, 59, bonuses);
    ok(result.state.systems.gathering.fishStocks.spiritCarp === 0 &&
      result.state.systems.gathering.fishRecoverAcc === 59,
    'invalid/inherited recovery bonus is ignored case ' + index);
  });

  let reads = 0;
  const accessor = {};
  Object.defineProperty(accessor, 'fishRecoveryReduction', {
    enumerable: true,
    get() {
      reads++;
      return 0.4;
    }
  });
  const model = fillStocks(freshModel(), 20);
  model.systems.gathering.fishStocks.spiritCarp = 0;
  const accessorResult = defaultRules.advanceFishStocks(model, 59, accessor);
  ok(accessorResult.state.systems.gathering.fishStocks.spiritCarp === 0 &&
    reads === 0,
  'recovery never invokes an accessor bonus');

  const revocable = Proxy.revocable({}, {});
  revocable.revoke();
  let proxyResult = null;
  try {
    proxyResult = defaultRules.advanceFishStocks(model, 59, revocable.proxy);
  } catch (error) {
    proxyResult = null;
  }
  ok(proxyResult && proxyResult.ok &&
    proxyResult.state.systems.gathering.fishStocks.spiritCarp === 0,
  'revoked proxy bonuses are safely ignored');
}

[
  [-1, 'negative'],
  [NaN, 'NaN'],
  [Infinity, 'infinite'],
  ['60', 'non-number']
].forEach(([elapsed, label]) => {
  const model = freshModel();
  const before = JSON.stringify(model);
  const result = defaultRules.advanceFishStocks(model, elapsed, {});
  ok(!result.ok && result.code === 'invalid_elapsed',
    label + ' recovery elapsed is rejected');
  ok(result.state !== model && JSON.stringify(result.state) === before,
    label + ' elapsed rejection is an unchanged detached state');
  exact(result.recovered, {},
    label + ' elapsed rejection reports no recovery');
});

{
  const model = fillStocks(freshModel(), 0);
  const huge = defaultRules.advanceFishStocks(
    model,
    Number.MAX_VALUE,
    {}
  );
  ok(huge.ok &&
    Object.values(huge.state.systems.gathering.fishStocks)
      .every((quantity) => quantity === 20),
  'huge finite elapsed fills stocks without unsafe iteration');
  ok(huge.state.systems.gathering.fishRecoverAcc === 0 &&
    Object.values(huge.recovered).every((quantity) => quantity === 20),
  'huge elapsed uses capped arithmetic and an exact report');

  const fortyEightHours = defaultRules.advanceFishStocks(
    fillStocks(freshModel(), 0),
    48 * 3600,
    {}
  );
  ok(Object.values(fortyEightHours.state.systems.gathering.fishStocks)
    .every((quantity) => quantity === 20) &&
    fortyEightHours.state.systems.gathering.fishRecoverAcc === 0,
  '48 hours fills every species and leaves no banked recovery time');
}

{
  const invalidModels = [
    (model) => { model.systems.gathering.fishStocks.spiritCarp = 21; },
    (model) => { model.systems.gathering.fishStocks.spiritCarp = 0.5; },
    (model) => { delete model.systems.gathering.fishStocks.spiritCarp; },
    (model) => { model.systems.gathering.fishRecoverAcc = NaN; },
    (model) => {
      model.systems.gathering.fishRecoverAnchorMs = 1000;
      model.systems.gathering.fishRecoverBaseSeconds = null;
    },
    (model) => { model.player.mastery.fishing.spiritCarp.level = 0; }
  ];
  invalidModels.forEach((mutate, index) => {
    const model = freshModel();
    mutate(model);
    const made = makeRules([0, 0, 0]);
    const caught = made.rules.fish(model, 'pond', 0, {});
    ok(!caught.ok && caught.code === 'invalid_model' &&
      made.random.draws() === 0,
    'invalid fishing model is rejected before RNG case ' + index);
    const recovered = made.rules.advanceFishStocks(model, 60, {});
    ok(!recovered.ok && recovered.code === 'invalid_model',
      'invalid recovery model is rejected case ' + index);
  });
}

// Fishing content/dependency snapshots stay isolated from later mutation.
{
  const content = cloneContent();
  const made = makeRules([0, 0, 0.99], content);
  content.GATHERING.fishing.spots[0].drops[0].w = 0;
  content.GATHERING.fishing.spots[0].drops[1].w = 999;
  content.FISH_SPECIES.spiritShrimp.maxStock = 1;
  const model = clearStocks(freshModel());
  model.systems.gathering.fishStocks.spiritCarp = 20;
  model.systems.gathering.fishStocks.spiritShrimp = 20;
  const result = made.rules.fish(model, 'pond', 0, {});
  ok(result.ok && result.result.speciesId === 'spiritShrimp',
    'created rules retain a deep fishing-content snapshot');
  ok(result.state.systems.gathering.fishStocks.spiritShrimp === 19,
    'later species metadata mutation cannot alter stock rules');
}

{
  const model = clearStocks(freshModel());
  model.systems.gathering.fishStocks.spiritShrimp = 1;
  Object.freeze(model.systems.gathering.fishStocks);
  Object.freeze(model.systems.gathering);
  Object.freeze(model.systems);
  Object.freeze(model.player.inventory);
  Object.freeze(model.player.mastery.fishing);
  Object.freeze(model.player.mastery);
  Object.freeze(model.player.skills);
  Object.freeze(model.player);
  Object.freeze(model);
  const result = makeRules([0, 0, 0.99]).rules.fish(
    model,
    'pond',
    0,
    {}
  );
  ok(result.ok && result.state !== model,
    'fishing accepts frozen input and returns a detached state');
}

const source = fs.readFileSync('./core/gathering.js', 'utf8');
[
  ['Math.random', /\bMath\.random\b/],
  ['DOM', /\bdocument\b/],
  ['storage', /\blocalStorage\b|\bSaveSystem\b|\bPlatform\b/],
  ['timer', /\bsetInterval\b|\bsetTimeout\b/],
  ['UI side effect', /\btoast\s*\(/]
].forEach(([label, pattern]) => {
  ok(!pattern.test(source),
    'gathering and fishing rules contain no ' + label + ' dependency');
});

{
  const context = { console };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'core/gathering.js' });
  ok(context.Gathering &&
    typeof context.Gathering.create === 'function' &&
    Object.isFrozen(context.Gathering),
  'browser loading exposes only the frozen Gathering factory API');
}

console.log(
  `\n=== Stage 2 钓鱼与鱼群恢复自测：${pass} 通过 / ${fail} 失败 ===`
);
if (fail) process.exit(1);
