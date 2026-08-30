'use strict';

const { isDeepStrictEqual } = require('node:util');
const fs = require('fs');
const vm = require('vm');

const GameRules = require('../core/game-rules.js');
const Simulation = require('../core/simulation.js');
const SimulationReport = require('../core/simulation-report.js');
const GameRandom = require('../core/random.js');
const Inventory = require('../core/inventory.js');
const SkillProgression = require('../core/skill-progression.js');
const Gathering = require('../core/gathering.js');
const Production = require('../core/production.js');
const Farm = require('../core/farm.js');
const Formations = require('../core/formations.js');
const SpiritBeasts = require('../core/spirit-beasts.js');
const Stage2State = require('../core/stage2-state.js');
const GatheringContent = require('../content/gathering.js');
const RecipeContent = require('../content/recipes.js');
const HomesteadContent = require('../content/homestead.js');
const Stage2Rules = require('../core/stage2-rules.js');

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
  if (!isDeepStrictEqual(actual, expected)) {
    const difference = firstDifference(actual, expected, '$');
    console.error('    first difference: ' + difference);
  }
  ok(isDeepStrictEqual(actual, expected), message);
}

function firstDifference(actual, expected, path) {
  if (Object.is(actual, expected)) return 'none';
  if (!actual || !expected ||
      typeof actual !== 'object' ||
      typeof expected !== 'object') {
    return path + ' actual=' + JSON.stringify(actual) +
      ' expected=' + JSON.stringify(expected);
  }
  const keys = Array.from(new Set(
    Object.keys(actual).concat(Object.keys(expected))
  ));
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    if (!ownForTest(actual, key) || !ownForTest(expected, key)) {
      return path + '.' + key + ' key presence differs';
    }
    if (!isDeepStrictEqual(actual[key], expected[key])) {
      return firstDifference(
        actual[key],
        expected[key],
        path + '.' + key
      );
    }
  }
  return path + ' prototypes differ';
}

function ownForTest(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createBaseGameRulesConfig(overrides) {
  const config = {
    actions: {
      legacyMeditate: {
        skill: 'legacyMeditation',
        time: 5,
        xp: 1,
        cost: {},
        effects: {
          stacks: {},
          cultivation: 2,
          jingqi: 0
        }
      }
    },
    gatheringData: {},
    gatherSkillKey: {},
    discoverableEntries() { return []; },
    skillXpNeed() { return 100; },
    masteryXpNeed() { return 100; },
    masteryDoubleChance() { return 0; },
    effectiveGatherTime() { return 1; },
    constants: {
      fishMax: 30,
      fishRecoverSeconds: 60,
      moodMax: 100,
      moodRegenPerSecond: 0.1,
      yearSeconds: 1800,
      lifespanBufferYears: 1,
      worldTickSeconds: 60
    }
  };
  return Object.assign(config, overrides || {});
}

function createRuntime(overrides) {
  return Stage2Rules.create(Object.assign({
    GameRules,
    gameRulesConfig: createBaseGameRulesConfig(),
    Gathering,
    Production,
    Farm,
    Formations,
    SpiritBeasts,
    GatheringContent,
    RecipeContent,
    HomesteadContent,
    Inventory,
    SkillProgression,
    GameRandom
  }, overrides || {}));
}

function freshModel() {
  const model = Stage2State.normalize(Stage2State.createDefaults());
  model.current = null;
  model.rngState = 1;
  model.player.xiwei = 0;
  model.player.shouMax = 100;
  model.player.shouyuan = 100;
  model.player.lifespanAnchorMs = null;
  model.player.lifespanBaseYears = null;
  return model;
}

function advance(runtime, state, seconds, source, fromMs, limit) {
  return Simulation.advance(state, seconds, {
    source: source || 'online',
    fromMs: fromMs == null ? 0 : fromMs,
    mainActionLimitSeconds: limit == null ? null : limit,
    rules: runtime.rules,
    lanes: runtime.lanes
  });
}

const runtime = createRuntime();
ok(Object.isFrozen(Stage2Rules), 'Stage2Rules module API is frozen');
ok(Object.isFrozen(runtime) &&
   Object.isFrozen(runtime.rules) &&
   Object.isFrozen(runtime.lanes),
'created Stage 2 runtime and both public values are frozen');
exact(runtime.lanes.map((lane) => lane.id), [
  'lifespan',
  'mood',
  'parallel',
  'world',
  'stage2-fish-recovery',
  'stage2-farm-growth'
], 'Stage 2 replaces only conflicting fish/farm lanes in the base runtime');
ok(runtime.lanes.every((lane) => Object.isFrozen(lane)),
  'each Stage 2 passive lane is frozen');

// Mutation caught: ignoring GameRules.create leaves only Stage 2 fish/farm,
// while appending all base lanes duplicates the two superseded systems.
{
  const model = freshModel();
  model.player.skills.legacyMeditation = { lv: 1, xp: 0 };
  model.current = {
    key: 'legacyMeditate',
    mode: 'finite',
    count: 1,
    done: 0,
    elapsed: 0,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null,
    stalled: false
  };
  const result = advance(runtime, model, 5, 'online', 0);
  ok(result.report.action.completed === 1 &&
     result.report.action.stopReason === 'completed' &&
     result.state.current === null &&
     result.state.player.xiwei === 2,
  'composed rules still settle a Stage 1B action exactly once');
}

// Mutation caught: returning only Stage 2 lanes freezes lifespan, mood,
// parallel work, and world time while a Stage 2 action is selected.
{
  const composedRuntime = createRuntime({
    gameRulesConfig: createBaseGameRulesConfig({
      constants: {
        fishMax: 30,
        fishRecoverSeconds: 60,
        moodMax: 100,
        moodRegenPerSecond: 0.1,
        yearSeconds: 100,
        lifespanBufferYears: 1,
        worldTickSeconds: 60
      }
    })
  });
  const model = freshModel();
  model.player.inventory.stacks.lingzhi = 100;
  model.player.mood = 0;
  model.player.moodAnchorMs = null;
  model.player.moodBase = null;
  model.player.shouMax = 10;
  model.player.shouyuan = 1.5;
  model.player.lifespanAnchorMs = null;
  model.player.lifespanBaseYears = null;
  model.systems.parallel.jobs = [{
    id: 'parallel-1',
    remainingSeconds: 120,
    remainingAnchorMs: null,
    remainingBaseSeconds: null
  }];
  model.systems.world.tickAccumulator = 0;
  model.systems.world.tickAnchorMs = null;
  model.systems.world.tickBaseSeconds = null;
  model.systems.gathering.fishStocks.spiritCarp = 0;
  model.systems.homestead.farm.plots[0] = {
    id: 'plot-1',
    cropId: 'spiritRice',
    remainingSeconds: 90,
    totalSeconds: 300,
    ready: false,
    remainingAnchorMs: null,
    remainingBaseSeconds: null
  };
  const started = composedRuntime.rules.start(
    model,
    'produce:alchemy:healingPill',
    0
  );
  const result = advance(
    composedRuntime,
    started.state,
    300,
    'online',
    0
  );
  ok(result.report.action.stopReason === 'lifespan_buffer' &&
     result.report.mainActionSeconds === 50 &&
     result.report.action.completed === 6 &&
     result.state.current === null &&
     result.state.player.shouyuan === 1,
  '300-second composition enforces the lifespan safety buffer on Stage 2');
  ok(result.state.player.mood === 30 &&
     result.report.passive.parallelCompleted[0] === 'parallel-1' &&
     result.state.systems.parallel.jobs.length === 0 &&
     result.report.world.ticks === 5,
  'mood, parallel jobs, and world ticks continue for all 300 seconds');
  ok(result.state.systems.homestead.farm.plots[0].ready === true &&
     result.report.passive.farmCompleted.length === 1 &&
     result.state.systems.gathering.fishStocks.spiritCarp > 0 &&
     result.report.passive.fishRecovered > 0,
  'Stage 2 farm/fish lanes advance once without conflicting base duplicates');
}

// Mutation caught: accepting an extra segment or inherited ID would let an
// invalid start replace the selected action.
{
  const model = freshModel();
  model.current = {
    key: 'fish:pond',
    mode: 'repeat',
    count: 0,
    done: 4,
    elapsed: 1,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null,
    stalled: false
  };
  const before = clone(model);
  [
    'fish:pond:extra',
    'gather:explore:mining:extra',
    'gather:collect:mining:constructor',
    'produce:__proto__:healingPill'
  ].forEach((key) => {
    const rejected = runtime.rules.start(model, key, 5000);
    ok(!rejected.ok && rejected.code === 'invalid_action',
      'strict action parser rejects ' + key);
    exact(rejected.state, before,
      'invalid start preserves the previous action for ' + key);
  });
  exact(model, before, 'start validation never mutates its input model');
}

// Mutation caught: a successful start that queues instead of replaces leaves
// an old background copy, or omits the canonical switched stop record.
{
  const model = freshModel();
  model.current = {
    key: 'fish:pond',
    mode: 'repeat',
    count: 0,
    done: 4,
    elapsed: 1,
    elapsedAnchorMs: 0,
    elapsedBaseSeconds: 1,
    stalled: false
  };
  const switched = runtime.rules.start(
    model,
    'produce:alchemy:healingPill',
    12345
  );
  ok(switched.ok &&
     switched.state.current.key === 'produce:alchemy:healingPill' &&
     switched.state.current.done === 0 &&
     switched.state.current.elapsed === 0 &&
     switched.state.lastActionStop.key === 'fish:pond' &&
     switched.state.lastActionStop.reason === 'switched' &&
     switched.state.lastActionStop.atMs === 12345,
  'successful start atomically replaces and records the old action');
  ok(switched.state.queue === undefined &&
     switched.state.backgroundActions === undefined,
  'successful start creates no queue or background copy');
}

// Mutation caught: replacing current before unlock validation would discard
// the old action when a locked recipe is clicked.
{
  const model = freshModel();
  model.current = {
    key: 'fish:pond',
    mode: 'repeat',
    count: 0,
    done: 2,
    elapsed: 0,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null,
    stalled: false
  };
  const locked = runtime.rules.start(
    model,
    'produce:alchemy:goldCorePill',
    7000
  );
  ok(!locked.ok && locked.code === 'requirements_invalid',
    'locked action start is rejected before replacement');
  exact(locked.state.current, model.current,
    'locked action leaves the selected action byte-identical');
}

// Real completion: explore discovery uses the gathering domain, reports every
// progression category, then continues as a repeatable background action.
{
  const model = freshModel();
  const started = runtime.rules.start(
    model,
    'gather:explore:mining',
    1000
  );
  ok(started.ok &&
     started.state.current.mode === 'repeat' &&
     started.state.current.count === 0,
  'gather exploration starts as a repeatable action');
  const result = advance(runtime, started.state, 2, 'online', 1000);
  ok(result.report.action.completed === 1 &&
     result.report.action.stopReason == null &&
     result.state.current &&
     result.state.current.key === 'gather:explore:mining',
  'gathering exploration continues after each discovery');
  exact(result.report.gains.skillXp, { mining: 10 },
    'exploration reports exact skill XP');
  exact(result.report.gains.masteryXp, { 'explore:mining': 5 },
    'exploration reports exact mastery XP');
  ok(result.report.gains.cultivation === 1 &&
     result.state.player.xiwei === 1,
  'exploration reports and commits cultivation once');
}

function putSpot(model, skillId, entryId, remaining) {
  model.systems.gathering.spots[skillId] = [{
    instanceId: 'spot-1',
    skillId,
    entryId,
    capacity: remaining,
    remaining
  }];
  model.systems.gathering.nextSpotId = 2;
  return model;
}

function putEncounter(model) {
  model.systems.homestead.beasts.encounters = [{
    id: 'encounter-1',
    speciesId: 'spiritFox',
    sourceSkillId: 'herb'
  }];
  model.systems.homestead.beasts.nextId = 2;
  return model;
}

function putBeast(model) {
  model.systems.homestead.beasts.roster = [{
    id: 'beast-1',
    speciesId: 'spiritFox',
    level: 1,
    xp: 0,
    traitId: 'keenNose',
    growthId: 'steady'
  }];
  model.systems.homestead.beasts.nextId = 2;
  return model;
}

// Mutation caught: mode drift changes finite tame actions into unbounded
// background jobs, or prematurely clears repeat actions.
{
  const cases = [
    ['gather:explore:mining', false, freshModel()],
    [
      'gather:collect:mining:copper',
      false,
      putSpot(freshModel(), 'mining', 'copper', 2)
    ],
    ['fish:pond', false, freshModel()],
    ['produce:alchemy:healingPill', false, freshModel()],
    ['beast:tame:encounter-1', true, putEncounter(freshModel())],
    ['beast:train:beast-1', false, putBeast(freshModel())]
  ];
  cases.forEach(([key, finite, model]) => {
    const started = runtime.rules.start(model, key, 9000);
    ok(started.ok &&
       started.state.current.mode === (finite ? 'finite' : 'repeat') &&
       started.state.current.count === (finite ? 1 : 0),
    key + ' starts in the canonical mode');
  });
}

// Mutation caught: the adapter must preserve the domain's successful final
// gather, then stop the selected repeat action with resource_depleted.
{
  const model = putSpot(freshModel(), 'mining', 'copper', 1);
  const started = runtime.rules.start(
    model,
    'gather:collect:mining:copper',
    0
  );
  const result = advance(runtime, started.state, 4, 'online', 0);
  ok(result.report.action.completed === 1 &&
     result.report.action.stopReason === 'resource_depleted' &&
     result.state.current === null &&
     result.state.systems.gathering.spots.mining &&
     result.state.systems.gathering.spots.mining[0] &&
     result.state.systems.gathering.spots.mining[0].remaining === 0,
  'last resource completion succeeds once then stops as depleted');
  ok(result.report.gains.items.copperOre === 1 &&
     result.report.gains.skillXp.mining === 12 &&
     result.report.gains.masteryXp['mining:copper'] === 6 &&
     result.report.gains.cultivation === 1,
  'collection reports item, skill, mastery, and cultivation gains');
}

function assertMaterialsStop(model, key, message) {
  const started = runtime.rules.start(model, key, 0);
  const result = advance(runtime, started.state, 1, 'online', 0);
  ok(result.report.action.stopReason === 'materials_exhausted' &&
     result.report.mainActionSeconds === 0 &&
     result.report.action.completed === 0 &&
     result.state.current === null,
  message);
}

assertMaterialsStop(
  freshModel(),
  'produce:alchemy:healingPill',
  'missing production ingredients stop immediately as materials_exhausted'
);
assertMaterialsStop(
  putEncounter(freshModel()),
  'beast:tame:encounter-1',
  'missing lure stops immediately as materials_exhausted'
);
assertMaterialsStop(
  putBeast(freshModel()),
  'beast:train:beast-1',
  'missing feed stops immediately as materials_exhausted'
);

// Mutation caught: mapping inventory_full to a generic domain failure loses
// the stable stop code and user-facing warning.
{
  const model = putSpot(freshModel(), 'mining', 'copper', 2);
  model.player.inventory.capacity = 1;
  model.player.inventory.stacks.lingzhi = 1;
  const beforeInventory = clone(model.player.inventory);
  const seedBefore = model.rngState;
  const started = runtime.rules.start(
    model,
    'gather:collect:mining:copper',
    0
  );
  const result = advance(runtime, started.state, 4, 'online', 0);
  ok(result.report.action.stopReason === 'requirements_invalid' &&
     result.report.warnings.filter((code) =>
       code === 'inventory_full').length === 1,
  'inventory_full maps to requirements_invalid with one warning');
  exact(result.state.player.inventory, beforeInventory,
    'inventory-full completion commits no partial inventory state');
  ok(result.state.rngState !== seedBefore &&
     result.report.action.completed === 0,
  'inventory-full completion commits sampled RNG but no completion');
}

// Mutation caught: treating empty stock as depletion clears fishing instead
// of waiting for the passive lane's next strictly-positive boundary, while
// omitting the stalled lifecycle hides the wait from ViewModels.
{
  const model = freshModel();
  Object.keys(model.systems.gathering.fishStocks).forEach((speciesId) => {
    model.systems.gathering.fishStocks[speciesId] = 0;
  });
  const started = runtime.rules.start(model, 'fish:pond', 0);
  const stalled = advance(runtime, started.state, 30, 'online', 0);
  ok(stalled.state.current &&
     stalled.state.current.key === 'fish:pond' &&
     stalled.state.current.stalled === true &&
     stalled.state.current.elapsed === 0,
  'empty fishing exposes stalled=true while waiting for recovery');
  const waited = advance(runtime, stalled.state, 30, 'online', 30000);
  ok(waited.state.current &&
     waited.state.current.key === 'fish:pond' &&
     waited.state.current.stalled === false &&
     waited.state.current.elapsed === 0 &&
     waited.report.action.stopReason === null &&
     waited.report.passive.fishRecovered > 0,
  'recovered fishing clears stalled without clearing or advancing');
  ok(!waited.report.warnings.includes('simulation_guard'),
    'all-empty fishing reaches a positive retry boundary without spinning');
  const retried = advance(runtime, waited.state, 4, 'online', 60000);
  ok(retried.report.action.completed === 1,
    'waiting fishing retries and completes after stock recovers');
}

// Successful production and beast actions must use their pure domain APIs,
// report progression, and preserve canonical finite/repeat behavior.
{
  const model = freshModel();
  model.player.inventory.stacks.lingzhi = 4;
  const started = runtime.rules.start(
    model,
    'produce:alchemy:healingPill',
    0
  );
  const result = advance(runtime, started.state, 8, 'online', 0);
  ok(result.report.action.completed === 1 &&
     result.state.current &&
     result.state.current.key === 'produce:alchemy:healingPill',
  'successful production remains selected as a repeat action');
  ok(result.report.gains.items.healingPill === 1 &&
     result.report.costs.items.lingzhi === 2 &&
     result.report.gains.skillXp.alchemy === 12 &&
     result.report.gains.masteryXp['alchemy:healingPill'] === 6 &&
     result.report.gains.cultivation === 2,
  'production reports exact economy and all progression gains');
}

{
  const model = putEncounter(freshModel());
  model.player.inventory.stacks.beastLureTalisman = 1;
  const started = runtime.rules.start(
    model,
    'beast:tame:encounter-1',
    0
  );
  const result = advance(runtime, started.state, 60, 'online', 0);
  ok(result.report.action.completed === 1 &&
     result.report.action.stopReason === 'completed' &&
     result.state.current === null &&
     result.state.systems.homestead.beasts.roster.length === 1,
  'taming is one finite successful completion');
  ok(result.report.costs.items.beastLureTalisman === 1 &&
     result.report.gains.skillXp.beastTaming === 30 &&
     result.report.gains.masteryXp['beastTaming:spiritFox'] === 15 &&
     result.report.gains.cultivation === 5,
  'taming reports its fixed material and progression');
}

{
  const model = putBeast(freshModel());
  model.player.inventory.stacks.beastFeed = 2;
  const started = runtime.rules.start(
    model,
    'beast:train:beast-1',
    0
  );
  const result = advance(runtime, started.state, 30, 'online', 0);
  ok(result.report.action.completed === 1 &&
     result.state.current &&
     result.state.current.key === 'beast:train:beast-1',
  'beast training remains selected as a repeat action');
  ok(result.report.costs.items.beastFeed === 1 &&
     result.report.gains.skillXp.beastTaming === 10 &&
     result.report.gains.masteryXp['beastTaming:spiritFox'] === 5 &&
     result.report.gains.cultivation === 2,
  'beast training reports its fixed material and progression');
}

function sequenceRandom(values) {
  let calls = 0;
  return {
    next(seed) {
      const value = values[calls] == null ? 0.99 : values[calls];
      calls++;
      return { seed: (seed + 1) >>> 0, value };
    },
    calls() {
      return calls;
    }
  };
}

function activeFox(model, traitId) {
  putBeast(model);
  model.systems.homestead.beasts.roster[0].traitId =
    traitId || 'keenNose';
  model.systems.homestead.beasts.roster[0].growthId = 'spiritual';
  model.systems.homestead.beasts.activeIds = ['beast-1'];
  return model;
}

// Mutation caught: flattening SpiritBeasts.effects applies the fox's herb
// assistance to mining, while correct global+bySkill merging does not.
{
  const herbRandom = sequenceRandom([0, 0.06]);
  const herbRuntime = createRuntime({ GameRandom: herbRandom });
  const herb = activeFox(
    putSpot(freshModel(), 'herb', 'parityHerb1', 2)
  );
  const herbStart = herbRuntime.rules.start(
    herb,
    'gather:collect:herb:parityHerb1',
    0
  );
  const herbDuration =
    herbRuntime.rules.getAction(herbStart.state).duration;
  const herbResult = advance(
    herbRuntime,
    herbStart.state,
    herbDuration,
    'online',
    0
  );

  const mineRandom = sequenceRandom([0, 0.06]);
  const mineRuntime = createRuntime({ GameRandom: mineRandom });
  const mine = activeFox(
    putSpot(freshModel(), 'mining', 'copper', 2)
  );
  const mineStart = mineRuntime.rules.start(
    mine,
    'gather:collect:mining:copper',
    0
  );
  const mineDuration =
    mineRuntime.rules.getAction(mineStart.state).duration;
  const mineResult = advance(
    mineRuntime,
    mineStart.state,
    mineDuration,
    'online',
    0
  );
  ok(herbResult.report.gains.items.garumHerb === 2,
    'fox herb assistance combines with its global gathering trait');
  ok(mineResult.report.gains.items.copperOre === 1,
    'fox herb assistance never leaks into mining');
}

// Mutation caught: encounter before main completion receives the wrong seed;
// omitting the eligible no-event seed leaves serialized RNG behind.
{
  const random = sequenceRandom([0, 0.99]);
  let calls = 0;
  let receivedSeed = null;
  const beasts = Object.assign({}, SpiritBeasts, {
    tryEncounter(state, skillId, seed) {
      calls++;
      receivedSeed = seed;
      return {
        ok: true,
        code: 'no_encounter',
        state,
        rngState: seed + 100
      };
    }
  });
  const local = createRuntime({
    GameRandom: random,
    SpiritBeasts: beasts
  });
  const model = putSpot(freshModel(), 'mining', 'copper', 2);
  const started = local.rules.start(
    model,
    'gather:collect:mining:copper',
    0
  );
  const duration = local.rules.getAction(started.state).duration;
  const result = advance(local, started.state, duration, 'online', 0);
  ok(calls === 1 && receivedSeed === 3,
    'successful gather calls encounter once with the post-domain seed');
  ok(result.state.rngState === 103,
    'eligible no-encounter draw commits its returned serialized seed');
}

// Mutation caught: expected dedup/cap outcomes are "no new event", not main
// action failures, and must not replace the successfully gathered state.
{
  const random = sequenceRandom([0, 0.99]);
  let calls = 0;
  const beasts = Object.assign({}, SpiritBeasts, {
    tryEncounter(state, skillId, seed) {
      calls++;
      return {
        ok: false,
        code: 'already_pending',
        state,
        rngState: seed
      };
    }
  });
  const local = createRuntime({
    GameRandom: random,
    SpiritBeasts: beasts
  });
  const model = putSpot(freshModel(), 'mining', 'copper', 2);
  const started = local.rules.start(
    model,
    'gather:collect:mining:copper',
    0
  );
  const duration = local.rules.getAction(started.state).duration;
  const result = advance(local, started.state, duration, 'online', 0);
  ok(calls === 1 &&
     result.report.action.completed === 1 &&
     result.report.action.stopReason === null &&
     result.report.gains.items.copperOre === 1 &&
     result.state.rngState === 3,
  'already_pending leaves the successful main completion intact');
}

// Mutation caught: recordCrafted before a production success, or both before
// and after it, records an unavailable formation or duplicates the side effect.
{
  let calls = 0;
  const formations = Object.assign({}, Formations, {
    recordCrafted(state, formationId) {
      calls++;
      return Formations.recordCrafted(state, formationId);
    }
  });
  const local = createRuntime({
    Formations: formations,
    GameRandom: sequenceRandom([0.99])
  });
  const model = freshModel();
  const recipe = RecipeContent.get('formation:gatheringFormation');
  model.player.skills.formation = { level: 20, xp: 0 };
  model.player.mastery.formation.gatheringFormation = {
    level: 1,
    xp: 0
  };
  Object.keys(recipe.ingredients).forEach((itemId) => {
    model.player.inventory.stacks[itemId] =
      recipe.ingredients[itemId] * 2;
  });
  const started = local.rules.start(
    model,
    'produce:formation:gatheringFormation',
    0
  );
  const duration = local.rules.getAction(started.state).duration;
  const result = advance(local, started.state, duration, 'online', 0);
  ok(calls === 1 &&
     result.report.action.completed === 1 &&
     result.state.systems.homestead.formations.owned
       .includes('gatheringFormation'),
  'successful formation output records discovery exactly once');
}

// Mutation caught: passing beastTraining effects as formationBonus double
// counts the beast trait; only the capped formation scalar belongs here.
{
  const model = putBeast(freshModel());
  model.player.inventory.stacks.beastFeed = 2;
  model.systems.homestead.formations.slots = ['beastFormation'];
  const started = runtime.rules.start(
    model,
    'beast:train:beast-1',
    0
  );
  const duration = runtime.rules.getAction(started.state).duration;
  const result = advance(runtime, started.state, duration, 'online', 0);
  ok(result.state.systems.homestead.beasts.roster[0].xp === 11,
    'training receives the formation scalar once');
}

// Mutation caught: reading the trainee's own diligent trait gives inactive
// trainees a free bonus and fails to assist a different selected beast.
[
  {
    label: 'active diligent trains another beast',
    activeIds: ['beast-1'],
    traineeId: 'beast-2',
    expectedXp: 11
  },
  {
    label: 'inactive diligent trainee',
    activeIds: [],
    traineeId: 'beast-1',
    expectedXp: 10
  },
  {
    label: 'active diligent trains itself',
    activeIds: ['beast-1'],
    traineeId: 'beast-1',
    expectedXp: 11
  }
].forEach((testCase) => {
  const local = createRuntime({ GameRandom: sequenceRandom([0.99]) });
  const model = freshModel();
  model.systems.homestead.beasts.roster = [
    {
      id: 'beast-1',
      speciesId: 'spiritFox',
      level: 1,
      xp: 0,
      traitId: 'diligent',
      growthId: 'steady'
    },
    {
      id: 'beast-2',
      speciesId: 'rockshell',
      level: 1,
      xp: 0,
      traitId: 'keenNose',
      growthId: 'steady'
    }
  ];
  model.systems.homestead.beasts.activeIds = testCase.activeIds;
  model.player.inventory.stacks.beastFeed = 1;
  const started = local.rules.start(
    model,
    'beast:train:' + testCase.traineeId,
    0
  );
  const duration = local.rules.getAction(started.state).duration;
  const result = advance(local, started.state, duration, 'online', 0);
  const trainee = result.state.systems.homestead.beasts.roster.find(
    (beast) => beast.id === testCase.traineeId
  );
  ok(trainee.xp === testCase.expectedXp,
    testCase.label + ' gains exactly ' + testCase.expectedXp + ' XP');
});

// Mutation caught: a failed domain result can carry a tempting detached state,
// but its post-sampling RNG must commit to prevent rerolling the failure.
{
  const gatheringModule = {
    create(deps) {
      const real = Gathering.create(deps);
      return Object.freeze(Object.assign({}, real, {
        collect(state) {
          const poisoned = clone(state);
          poisoned.player.inventory.stacks.copperOre = 999;
          return {
            ok: false,
            code: 'invalid_inventory',
            state: poisoned,
            rngState: 999
          };
        }
      }));
    }
  };
  const local = createRuntime({ Gathering: gatheringModule });
  const model = putSpot(freshModel(), 'mining', 'copper', 2);
  const started = local.rules.start(
    model,
    'gather:collect:mining:copper',
    0
  );
  const duration = local.rules.getAction(started.state).duration;
  const result = advance(local, started.state, duration, 'online', 0);
  ok(result.report.action.stopReason === 'requirements_invalid' &&
     result.report.action.completed === 0 &&
     result.state.rngState === 999 &&
     result.state.player.inventory.stacks.copperOre === undefined,
  'failed domain state rolls back while its sampled RNG commits');
}

// The same post-sampling failure contract applies to every randomized
// Stage 2 completion adapter, not only gathering.
{
  function sampledFailure(state, seed) {
    const poisoned = clone(state);
    poisoned.player.xiwei = 999;
    return {
      ok: false,
      code: 'invalid_inventory',
      state: poisoned,
      rngState: seed + 100
    };
  }
  const gatheringModule = {
    create(deps) {
      const real = Gathering.create(deps);
      return Object.freeze(Object.assign({}, real, {
        collect(state, skillId, entryId, seed) {
          return sampledFailure(state, seed);
        },
        fish(state, spotId, seed) {
          return sampledFailure(state, seed);
        }
      }));
    }
  };
  const productionModule = {
    create(deps) {
      const real = Production.create(deps);
      return Object.freeze(Object.assign({}, real, {
        complete(player, recipeId, seed) {
          const failed = sampledFailure({ player }, seed);
          return Object.assign(failed, { player: failed.state.player });
        }
      }));
    }
  };
  const beastsModule = Object.assign({}, SpiritBeasts, {
    completeTame(state, encounterId, seed) {
      return sampledFailure(state, seed);
    },
    completeTraining(state, beastId, seed) {
      return sampledFailure(state, seed);
    }
  });
  const local = createRuntime({
    Gathering: gatheringModule,
    Production: productionModule,
    SpiritBeasts: beastsModule
  });
  const cases = [
    {
      key: 'gather:collect:mining:copper',
      model: putSpot(freshModel(), 'mining', 'copper', 2)
    },
    {
      key: 'fish:pond',
      model: freshModel()
    },
    {
      key: 'produce:alchemy:healingPill',
      model: (() => {
        const model = freshModel();
        model.player.inventory.stacks.lingzhi = 2;
        return model;
      })()
    },
    {
      key: 'beast:tame:encounter-1',
      model: (() => {
        const model = putEncounter(freshModel());
        model.player.inventory.stacks.beastLureTalisman = 1;
        return model;
      })()
    },
    {
      key: 'beast:train:beast-1',
      model: (() => {
        const model = putBeast(freshModel());
        model.player.inventory.stacks.beastFeed = 1;
        return model;
      })()
    }
  ];
  cases.forEach((testCase) => {
    const started = local.rules.start(testCase.model, testCase.key, 0);
    const duration = local.rules.getAction(started.state).duration;
    const result = advance(local, started.state, duration, 'online', 0);
    ok(result.state.rngState === 101 &&
       result.state.player.xiwei === 0 &&
       result.report.action.completed === 0,
    testCase.key + ' commits failed sampled RNG and rejects detached state');
  });
}

function passiveFixture() {
  const model = freshModel();
  model.systems.gathering.fishStocks.spiritCarp = 18;
  const plot = model.systems.homestead.farm.plots[0];
  plot.cropId = 'spiritRice';
  plot.totalSeconds = 300;
  plot.remainingSeconds = 90;
  plot.ready = false;
  plot.remainingAnchorMs = 0;
  plot.remainingBaseSeconds = 210;
  return model;
}

function advanceInChunks(initial, totalSeconds, chunkSeconds) {
  let state = clone(initial);
  let fromMs = 1000;
  let remaining = totalSeconds;
  const reports = [];
  while (remaining > 0) {
    const seconds = Math.min(chunkSeconds, remaining);
    const step = advance(runtime, state, seconds, 'online', fromMs);
    state = step.state;
    reports.push(step.report);
    fromMs += seconds * 1000;
    remaining -= seconds;
  }
  return { state, summary: SimulationReport.summarize(reports) };
}

// Mutation caught: rebasing/rounding either domain clock or reporting a
// passive completion twice makes 480 real online frames diverge from a batch.
{
  const initial = passiveFixture();
  const online = advanceInChunks(initial, 120, 0.25);
  const batchStep = advance(runtime, initial, 120, 'online', 1000);
  const batchSummary = SimulationReport.summarize([batchStep.report]);
  exact(online.state, batchStep.state,
    '120 seconds in 0.25-second chunks equals one 120-second batch');
  ok(online.summary.passive.fishRecovered === 2 &&
     batchSummary.passive.fishRecovered === 2,
  'fish recovery reports the same two recovered stock units');
  exact(online.summary.passive.farmCompleted, [{
    plotId: 'plot-1',
    cropId: 'spiritRice'
  }], 'chunked farm completion is reported exactly once');
  exact(batchSummary.passive.farmCompleted,
    online.summary.passive.farmCompleted,
    'batch and chunked passive completion totals match');
}

function actionFixture() {
  const model = passiveFixture();
  model.player.inventory.stacks.lingzhi = 100000;
  const started = runtime.rules.start(
    model,
    'produce:alchemy:healingPill',
    1000
  );
  return started.state;
}

function normalizedTotals(reports) {
  const summary = clone(SimulationReport.summarize(reports));
  delete summary.reportIds;
  summary.action.stops.forEach((stop) => {
    delete stop.reportId;
  });
  return summary;
}

function advanceSchedule(
  initial,
  totalSeconds,
  chunkSeconds,
  source,
  limit
) {
  let state = clone(initial);
  let fromMs = 1000;
  let remaining = totalSeconds;
  const reports = [];
  while (remaining > 0) {
    const seconds = Math.min(chunkSeconds, remaining);
    const step = advance(
      runtime,
      state,
      seconds,
      source || 'online',
      fromMs,
      limit
    );
    state = step.state;
    reports.push(step.report);
    fromMs += seconds * 1000;
    remaining -= seconds;
  }
  return { state, reports };
}

// Mutation caught: chunk-local action/fish/farm clocks produce a different
// serialized state or economy than the one chronological offline batch.
{
  const model = actionFixture();
  const online = advanceSchedule(model, 6 * 3600, 17.25, 'online', null);
  const offlineStep = advance(
    runtime,
    model,
    6 * 3600,
    'offline',
    1000,
    12 * 3600
  );
  exact(online.state, offlineStep.state,
    '6-hour online chunks and offline batch end full-JSON identically');
  exact(
    normalizedTotals(online.reports),
    normalizedTotals([offlineStep.report]),
    '6-hour online/offline normalized report totals are identical'
  );
}

// Mutation caught: applying the offline main cap to the scheduler's global
// elapsed time truncates passive lanes and clears the selected main action.
{
  const model = actionFixture();
  const plot = model.systems.homestead.farm.plots[0];
  plot.totalSeconds = 200000;
  plot.remainingSeconds = 48 * 3600;
  plot.ready = false;
  plot.remainingAnchorMs = 0;
  plot.remainingBaseSeconds = plot.totalSeconds - plot.remainingSeconds;
  Object.keys(model.systems.gathering.fishStocks).forEach((speciesId) => {
    model.systems.gathering.fishStocks[speciesId] = 0;
  });
  const result = advance(
    runtime,
    model,
    48 * 3600,
    'offline',
    1000,
    12 * 3600
  );
  ok(result.report.mainActionSeconds === 12 * 3600 &&
     result.report.cappedSeconds === 36 * 3600,
  '48-hour offline run caps only main action at 12 hours');
  ok(result.state.current &&
     result.state.current.key === 'produce:alchemy:healingPill',
  'main action remains selected at the offline cap');
  ok(result.state.systems.homestead.farm.plots[0].ready === true &&
     result.report.passive.farmCompleted.length === 1,
  'farm passive advances all 48 hours and reports once');
  ok(Object.keys(result.state.systems.gathering.fishStocks)
    .every((speciesId) =>
      result.state.systems.gathering.fishStocks[speciesId] === 20),
  'fish passive advances all 48 hours to full stock');
}

// Mutation caught: a reload that normalizes cumulative anchors must resume at
// the same logical cursor instead of rebasing elapsed action/passive time.
{
  const initial = actionFixture();
  const uninterrupted = advance(
    runtime,
    initial,
    120,
    'online',
    1000
  );
  const first = advance(runtime, initial, 13.37, 'online', 1000);
  const reloaded = Stage2State.normalize(
    JSON.parse(JSON.stringify(first.state))
  );
  const resumed = advance(
    runtime,
    reloaded,
    120 - 13.37,
    'online',
    1000 + 13.37 * 1000
  );
  exact(resumed.state, uninterrupted.state,
    'arbitrary mid-action/crop/fish reload resumes full-JSON identically');
}

function passiveOnlyAtBoundary(seconds) {
  const model = freshModel();
  model.systems.gathering.fishStocks.spiritCarp = 19;
  const plot = model.systems.homestead.farm.plots[0];
  plot.cropId = 'spiritRice';
  plot.totalSeconds = 300;
  plot.remainingSeconds = seconds;
  plot.ready = false;
  plot.remainingAnchorMs = 0;
  plot.remainingBaseSeconds = 300 - seconds;
  return model;
}

// Mutation caught: integration-layer epsilon snapping or decimal rounding
// breaks domain-owned 0.1-second accumulation and sub-picosecond remainder.
{
  const initial = passiveOnlyAtBoundary(60);
  const chunks = advanceSchedule(initial, 60, 0.1, 'online', null);
  const batch = advance(runtime, initial, 60, 'online', 1000);
  exact(chunks.state.systems.gathering, batch.state.systems.gathering,
    '600×0.1 fish schedule equals one exact 60-second batch');
  exact(chunks.state.systems.homestead, batch.state.systems.homestead,
    '600×0.1 farm schedule equals one exact 60-second batch');

  const almost = advance(
    runtime,
    passiveOnlyAtBoundary(60),
    60 - 4e-13,
    'online',
    1000
  );
  ok(almost.state.systems.homestead.farm.plots[0].ready === false &&
     almost.report.passive.farmCompleted.length === 0,
  '60−4e−13 does not prematurely cross the farm boundary');

  const manual = clone(initial);
  const manualHelpers = {
    report: {
      passive: {
        fishRecovered: 0,
        farmCompleted: []
      }
    }
  };
  const stage2Lanes = runtime.lanes.filter(function (lane) {
    return lane.id.indexOf('stage2-') === 0;
  });
  stage2Lanes.forEach(function (lane) {
    lane.elapse(manual, 60, manualHelpers);
  });
  stage2Lanes.forEach(function (lane) {
    lane.resolve(manual, manualHelpers);
  });
  exact(manual.systems.gathering, batch.state.systems.gathering,
    'direct Stage 2 fish lane equals Simulation.advance state');
  exact(manual.systems.homestead, batch.state.systems.homestead,
    'direct Stage 2 farm lane equals Simulation.advance state');
  exact(manualHelpers.report.passive, {
    fishRecovered: batch.report.passive.fishRecovered,
    farmCompleted: batch.report.passive.farmCompleted
  },
    'direct lane elapse then resolve reports each crossing exactly once');

  const beforeSecondResolve = clone(manual);
  const beforeSecondReport = clone(manualHelpers.report.passive);
  stage2Lanes.forEach(function (lane) {
    lane.resolve(manual, manualHelpers);
  });
  ok(isDeepStrictEqual(manual, beforeSecondResolve) &&
     isDeepStrictEqual(manualHelpers.report.passive, beforeSecondReport) &&
     Object.keys(manual).every(function (key) {
       return key.indexOf('__stage2') !== 0;
     }),
  'lane resolve is idempotent and leaves no integration marker in state');
}

// Mutation caught: retaining live content references lets later caller
// mutation change parser validity and effective durations after create().
{
  const mutableGatheringContent = {
    GATHERING: clone(GatheringContent.GATHERING),
    FISH_SPECIES: clone(GatheringContent.FISH_SPECIES)
  };
  const mutableRecipeContent = {
    RECIPES: clone(RecipeContent.RECIPES)
  };
  const mutableHomesteadContent = {
    FORMATIONS: clone(HomesteadContent.FORMATIONS),
    BEASTS: clone(HomesteadContent.BEASTS)
  };
  const local = createRuntime({
    GatheringContent: mutableGatheringContent,
    RecipeContent: mutableRecipeContent,
    HomesteadContent: mutableHomesteadContent
  });
  mutableGatheringContent.GATHERING.mining.explore.time = 999;
  delete mutableRecipeContent.RECIPES['alchemy:healingPill'];
  delete mutableHomesteadContent.BEASTS.spiritFox;

  const explore = local.rules.start(
    freshModel(),
    'gather:explore:mining',
    0
  );
  const produce = local.rules.start(
    freshModel(),
    'produce:alchemy:healingPill',
    0
  );
  const tame = local.rules.start(
    putEncounter(freshModel()),
    'beast:tame:encounter-1',
    0
  );
  ok(explore.ok &&
     local.rules.getAction(explore.state).duration === 2 &&
     produce.ok &&
     tame.ok,
  'created runtime snapshots all content used by parser and duration');
}

// Mutation caught: reading dependency getters executes caller code during
// validation; accepting a Proxy undermines a stable factory snapshot.
{
  let getterCalls = 0;
  const getterDeps = {};
  Object.keys({
    GameRules,
    Production,
    Farm,
    Formations,
    SpiritBeasts,
    GatheringContent,
    RecipeContent,
    HomesteadContent,
    Inventory,
    SkillProgression,
    GameRandom
  }).forEach((key) => {
    getterDeps[key] = {
      GameRules,
      Production,
      Farm,
      Formations,
      SpiritBeasts,
      GatheringContent,
      RecipeContent,
      HomesteadContent,
      Inventory,
      SkillProgression,
      GameRandom
    }[key];
  });
  Object.defineProperty(getterDeps, 'Gathering', {
    enumerable: true,
    get() {
      getterCalls++;
      return Gathering;
    }
  });
  let getterRejected = false;
  try {
    Stage2Rules.create(getterDeps);
  } catch (error) {
    getterRejected = error instanceof TypeError;
  }
  ok(getterRejected && getterCalls === 0,
    'dependency getter is rejected without invocation');

  let proxyRejected = false;
  try {
    Stage2Rules.create(new Proxy({}, {}));
  } catch (error) {
    proxyRejected = error instanceof TypeError;
  }
  ok(proxyRejected, 'dependency Proxy is rejected');
}

// Mutation caught: a CJS-only wrapper leaves the browser composition without
// a frozen Stage2Rules factory before game bootstrap.
{
  const sandbox = {
    Object,
    Array,
    String,
    Number,
    Boolean,
    Math,
    JSON,
    Set,
    BigInt,
    console
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync('core/stage2-rules.js', 'utf8'),
    sandbox,
    { filename: 'core/stage2-rules.js' }
  );
  ok(sandbox.Stage2Rules &&
     typeof sandbox.Stage2Rules.create === 'function' &&
     Object.isFrozen(sandbox.Stage2Rules),
  'browser UMD exposes the frozen Stage2Rules factory');
}

console.log(
  `\n=== Stage 2 统一模拟自测：${pass} 通过 / ${fail} 失败 ===`
);
process.exit(fail ? 1 : 0);
