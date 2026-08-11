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

const Stage2State = require('../core/stage2-state.js');
const GameRandom = require('../core/random.js');
const beforeGlobal = globalThis.Farm;
const Farm = require('../core/farm.js');

ok(globalThis.Farm === beforeGlobal,
  'CommonJS loading does not attach a browser global');
ok(Object.isFrozen(Farm), 'Farm API is frozen');
exact(Object.keys(Farm), ['plant', 'advance', 'harvest', 'query'],
  'Farm exposes only the four pure operations');

function freshModel() {
  const model = Stage2State.createDefaults();
  model.player.xiwei = 0;
  return model;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function putReadyCrop(model, plotIndex, cropId, totalSeconds) {
  const plot = model.systems.homestead.farm.plots[plotIndex];
  plot.cropId = cropId;
  plot.totalSeconds = totalSeconds || 300;
  plot.remainingSeconds = 0;
  plot.ready = true;
  plot.remainingAnchorMs = plot.totalSeconds * 1000;
  plot.remainingBaseSeconds = 0;
  return model;
}

function putGrowingCrop(
  model,
  plotIndex,
  cropId,
  totalSeconds,
  remainingSeconds
) {
  const plot = model.systems.homestead.farm.plots[plotIndex];
  plot.cropId = cropId;
  plot.totalSeconds = totalSeconds;
  plot.remainingSeconds = remainingSeconds;
  plot.ready = false;
  plot.remainingAnchorMs = 0;
  plot.remainingBaseSeconds = totalSeconds - remainingSeconds;
  return model;
}

function mergeCompleted(target, entries) {
  entries.forEach((entry) => target.push(entry));
  return target;
}

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

// Planting is immediate, atomic, passive, and snapshots its duration.
{
  const model = freshModel();
  model.player.inventory.stacks.commonSeed = 3;
  model.mainAction = {
    key: 'gather:collect:mining:copper',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    stalled: false
  };
  model.current = { key: 'fish:pond', mode: 'repeat' };
  const before = clone(model);
  const planted = Farm.plant(model, 'plot-1', 'spiritRice', {});
  ok(planted.ok && planted.code === 'ok',
    'a legal crop can be planted');
  ok(planted.state.mainAction === model.mainAction &&
    planted.state.current === model.current,
  'plant preserves both main-action reference slots');
  ok(planted.state.systems.homestead.farm.plots[0].remainingSeconds === 300 &&
    planted.state.systems.homestead.farm.plots[0].totalSeconds === 300,
  'spirit rice snapshots five minutes');
  ok(planted.state.systems.homestead.farm.plots[0].remainingAnchorMs === 0 &&
    planted.state.systems.homestead.farm.plots[0].remainingBaseSeconds === 0,
  'a planted crop starts a complete cumulative timing account');
  ok(planted.state.player.inventory.stacks.commonSeed === 2,
    'plant consumes exactly one tier seed');
  exact(model, before, 'plant does not mutate its input model');

  const occupied = Farm.plant(
    planted.state,
    'plot-1',
    'spiritRice',
    {}
  );
  ok(!occupied.ok && occupied.code === 'plot_occupied',
    'an occupied plot rejects planting');
}

{
  const model = freshModel();
  model.player.skills.farming = { level: 20, xp: 0 };
  model.player.mastery.farming.spiritRice = { level: 10, xp: 0 };
  model.player.inventory.stacks.commonSeed = 1;
  const planted = Farm.plant(model, 'plot-1', 'spiritRice', {
    farmGrowthReduction: 0.10
  });
  ok(planted.ok &&
    planted.state.systems.homestead.farm.plots[0].totalSeconds === 259,
  'plant snapshots skill, mastery, and farm reduction with integer rounding');

  const capped = freshModel();
  capped.player.skills.farming = { level: 99, xp: 0 };
  capped.player.mastery.farming.spiritRice = { level: 99, xp: 0 };
  capped.player.inventory.stacks.commonSeed = 1;
  const cappedPlant = Farm.plant(capped, 'plot-1', 'spiritRice', {
    farmGrowthReduction: 99
  });
  ok(cappedPlant.ok &&
    cappedPlant.state.systems.homestead.farm.plots[0].totalSeconds === 134,
  'farm growth reduction caps at 40% before positive integer rounding');
}

{
  const model = freshModel();
  model.player.inventory.stacks.commonSeed = 10;
  const missing = Farm.plant(model, 'missing', 'spiritRice', {});
  const unknown = Farm.plant(model, 'plot-1', 'missingCrop', {});
  const locked = Farm.plant(model, 'plot-1', 'moonSpiritGrass', {});
  const noSeedModel = freshModel();
  const noSeed = Farm.plant(
    noSeedModel,
    'plot-1',
    'spiritRice',
    {}
  );
  ok(!missing.ok && missing.code === 'plot_not_found',
    'unknown plot is rejected');
  ok(!unknown.ok && unknown.code === 'invalid_crop',
    'unknown crop is rejected');
  ok(!locked.ok && locked.code === 'skill_locked',
    'crop above farming level is rejected');
  ok(!noSeed.ok && noSeed.code === 'insufficient_seed',
    'plant requires the crop tier seed');

  model.systems.homestead.farm.plots.push({
    id: 'plot-4',
    cropId: null,
    remainingSeconds: 0,
    totalSeconds: 0,
    ready: false
  });
  const plotLocked = Farm.plant(model, 'plot-4', 'spiritRice', {});
  ok(!plotLocked.ok && plotLocked.code === 'plot_locked',
    'a plot beyond unlockedPlots is rejected');
}

// Every plot advances independently on full real time without replacing action.
{
  const model = freshModel();
  model.player.skills.farming.level = 99;
  model.player.inventory.stacks.commonSeed = 3;
  model.player.inventory.stacks.fineSeed = 2;
  const one = Farm.plant(model, 'plot-1', 'spiritRice', {}).state;
  const two = Farm.plant(one, 'plot-2', 'heartClearGrass', {}).state;
  const three = Farm.plant(two, 'plot-3', 'moonSpiritGrass', {}).state;
  exact(
    three.systems.homestead.farm.plots.map((plot) => plot.cropId),
    ['spiritRice', 'heartClearGrass', 'moonSpiritGrass'],
    'three plots can hold three different crops'
  );
  three.mainAction = { key: 'gather:collect:herb:lingzhiGrove' };
  three.current = { key: 'produce:alchemy:healingPill' };

  const split = Farm.advance(
    Farm.advance(three, 123).state,
    177
  );
  const once = Farm.advance(three, 300);
  exact(
    split.state.systems.homestead.farm,
    once.state.systems.homestead.farm,
    '123+177 advancement matches one 300-second batch'
  );
  ok(once.state.systems.homestead.farm.plots[0].ready,
    'the first crop matures at zero');
  exact(once.completed, [{ plotId: 'plot-1', cropId: 'spiritRice' }],
    'maturity is reported without harvesting');
  ok(once.state.mainAction === three.mainAction &&
    once.state.current === three.current,
  'advance preserves both main-action reference slots');

  const later = Farm.advance(once.state, 48 * 3600);
  ok(later.state.systems.homestead.farm.plots[0].ready &&
    later.state.systems.homestead.farm.plots[0].cropId === 'spiritRice',
  'mature crops survive 48 real hours without rot');
  ok(later.completed.every((entry) => entry.plotId !== 'plot-1'),
    'a mature crop is reported completed only once');
}

// The persisted pair is one cumulative account, including fractional calls.
{
  const model = putGrowingCrop(
    freshModel(),
    0,
    'spiritRice',
    300,
    300
  );
  const parts = partitionTarget(300, 37, 0xA5A5A5A5);
  const bulkSeconds = parts.reduce((total, part) => total + part, 0);
  let chunkState = model;
  const chunkCompleted = [];
  parts.forEach((part) => {
    const step = Farm.advance(chunkState, part);
    chunkState = step.state;
    mergeCompleted(chunkCompleted, step.completed);
  });
  const bulk = Farm.advance(model, bulkSeconds);
  exact(chunkState.systems.homestead.farm,
    bulk.state.systems.homestead.farm,
    '37 arbitrary real partitions match their JavaScript-reduce batch');
  exact(chunkCompleted, bulk.completed,
    'partitioned completion report matches the bulk report');

  for (let seed = 1; seed <= 24; seed++) {
    const randomParts = partitionTarget(
      300,
      5 + seed,
      Math.imul(seed, 0x9E3779B1)
    );
    const randomBulkSeconds = randomParts.reduce(
      (total, part) => total + part,
      0
    );
    let randomState = model;
    const randomCompleted = [];
    randomParts.forEach((part) => {
      const step = Farm.advance(randomState, part);
      randomState = step.state;
      mergeCompleted(randomCompleted, step.completed);
    });
    const randomBulk = Farm.advance(model, randomBulkSeconds);
    exact(randomState.systems.homestead.farm,
      randomBulk.state.systems.homestead.farm,
      'random partition state matches JS-reduce bulk #' + seed);
    exact(randomCompleted, randomBulk.completed,
      'random partition report matches JS-reduce bulk #' + seed);
  }
}

{
  const tenths = Array.from({ length: 600 }, () => 0.1);
  const bulkSeconds = tenths.reduce((total, part) => total + part, 0);
  const model = putGrowingCrop(
    freshModel(),
    0,
    'spiritRice',
    60,
    60
  );
  let chunkState = model;
  const completed = [];
  tenths.forEach((part) => {
    const step = Farm.advance(chunkState, part);
    chunkState = step.state;
    mergeCompleted(completed, step.completed);
  });
  const bulk = Farm.advance(model, bulkSeconds);
  exact(chunkState.systems.homestead.farm,
    bulk.state.systems.homestead.farm,
    '600 x 0.1 seconds matches its JavaScript-reduce bulk');
  exact(completed, bulk.completed,
    '0.1-second reports aggregate to the bulk report');
}

{
  const legalRemainder = 4e-13;
  const model = putGrowingCrop(
    freshModel(),
    0,
    'spiritRice',
    60,
    60
  );
  const short = Farm.advance(model, 60 - legalRemainder);
  ok(!short.state.systems.homestead.farm.plots[0].ready &&
    short.completed.length === 0 &&
    short.state.systems.homestead.farm.plots[0].remainingSeconds > 0,
  '60 - 4e-13 remains strictly before maturity');
  const exactBoundary = Farm.advance(short.state, legalRemainder);
  ok(exactBoundary.state.systems.homestead.farm.plots[0].ready &&
    exactBoundary.completed.length === 1,
  'the final real 4e-13 seconds reaches maturity');
}

{
  const model = putGrowingCrop(
    freshModel(),
    0,
    'spiritRice',
    300,
    300
  );
  const first = Farm.advance(model, 123.456789);
  const reloaded = Stage2State.normalize(
    JSON.parse(JSON.stringify(first.state))
  );
  const resumed = Farm.advance(reloaded, 176.543211);
  const uninterrupted = Farm.advance(model, 300);
  exact(resumed.state.systems.homestead.farm,
    uninterrupted.state.systems.homestead.farm,
    'JSON save/reload preserves the cumulative crop account');
  exact(resumed.completed, uninterrupted.completed,
    'save/reload continuation reports the same maturity');
}

{
  const model = freshModel();
  putGrowingCrop(model, 0, 'spiritRice', 30, 30);
  putGrowingCrop(model, 1, 'heartClearGrass', 10, 10);
  putGrowingCrop(model, 2, 'moonSpiritGrass', 20, 20);
  const completed = Farm.advance(model, 30);
  exact(completed.completed, [
    { plotId: 'plot-1', cropId: 'spiritRice' },
    { plotId: 'plot-2', cropId: 'heartClearGrass' },
    { plotId: 'plot-3', cropId: 'moonSpiritGrass' }
  ], 'simultaneous completion is emitted in stable plot order');
  const repeated = Farm.advance(completed.state, 1000);
  exact(repeated.completed, [],
    'already mature plots never report completion again');
}

{
  const model = putGrowingCrop(
    freshModel(),
    0,
    'spiritRice',
    60,
    60
  );
  const before = clone(model);
  [0, -1, NaN, Infinity, '1'].forEach((elapsed) => {
    const result = Farm.advance(model, elapsed);
    exact(result.state, before,
      'invalid/zero elapsed leaves state unchanged: ' + String(elapsed));
    exact(result.completed, [],
      'invalid/zero elapsed has no completion: ' + String(elapsed));
  });
  exact(model, before, 'advance never mutates its input model');
}

// Harvest preflight, fixed RNG, atomic output, progression, and canonical clear.
{
  const growing = freshModel();
  growing.player.inventory.stacks.commonSeed = 1;
  const planted = Farm.plant(growing, 'plot-1', 'spiritRice', {}).state;
  const beforeSeed = 17;
  const tooSoon = Farm.harvest(planted, 'plot-1', beforeSeed, {});
  ok(!tooSoon.ok && tooSoon.code === 'crop_not_ready' &&
    tooSoon.rngState === beforeSeed,
  'harvest before maturity consumes zero random draws');

  const ready = Farm.advance(planted, 300).state;
  ready.mainAction = { key: 'gather:collect:mining:copper' };
  ready.current = { key: 'fish:pond' };
  const readyBefore = clone(ready);
  const expectedSeed = GameRandom.next(1).seed;
  const harvested = Farm.harvest(ready, 'plot-1', 1, {
    farmExtraYieldChance: 0.75
  });
  ok(harvested.ok && harvested.rngState === expectedSeed,
    'legal harvest consumes exactly one serialized random draw');
  ok(harvested.state.player.inventory.stacks.spiritRice === 8,
    'extra-yield hit grants one extra base batch');
  ok(harvested.state.player.skills.farming.xp === 10 &&
    harvested.state.player.mastery.farming.spiritRice.xp === 5,
  'harvest grants content farming and crop-mastery XP');
  ok(harvested.gains.cultivation === 0,
    'harvest grants zero cultivation');
  ok(harvested.state.mainAction === ready.mainAction &&
    harvested.state.current === ready.current,
  'harvest preserves both main-action reference slots');
  exact(ready, readyBefore, 'successful harvest does not mutate its input');
  exact(
    harvested.state.systems.homestead.farm.plots[0],
    {
      id: 'plot-1',
      cropId: null,
      remainingSeconds: 0,
      totalSeconds: 0,
      ready: false,
      remainingAnchorMs: null,
      remainingBaseSeconds: null
    },
    'successful harvest clears the plot to the canonical empty shape'
  );
}

{
  const model = putReadyCrop(freshModel(), 0, 'spiritRice', 300);
  model.player.inventory.capacity = 1;
  model.player.inventory.stacks.copperOre = 1;
  const before = clone(model);
  const expectedSeed = GameRandom.next(12345678).seed;
  const full = Farm.harvest(model, 'plot-1', 12345678, {});
  ok(!full.ok && full.code === 'inventory_full' &&
    full.rngState === expectedSeed,
  'full inventory still commits the one harvest draw');
  exact(full.state, before,
    'full inventory retains the mature crop and all progression');
}

{
  const model = putReadyCrop(freshModel(), 0, 'spiritRice', 300);
  const harvested = Farm.harvest(model, 'plot-1', 12345678, {});
  ok(harvested.ok &&
    harvested.state.player.inventory.stacks.spiritRice === 4,
  'a missed extra roll grants exactly the base harvest batch');
  exact(harvested.gains.items, { spiritRice: 4 },
    'base harvest reports the committed output');
  exact(harvested.gains.skillXp, { farming: 10 },
    'base harvest reports farming XP');
  exact(harvested.gains.masteryXp, { 'farming:spiritRice': 5 },
    'base harvest reports crop mastery XP');
}

{
  const missing = Farm.harvest(freshModel(), 'missing', 1, {});
  const empty = Farm.harvest(freshModel(), 'plot-1', 1, {});
  const invalidRngModel = putReadyCrop(
    freshModel(),
    0,
    'spiritRice',
    300
  );
  const invalidRng = Farm.harvest(
    invalidRngModel,
    'plot-1',
    0,
    {}
  );
  ok(!missing.ok && missing.code === 'plot_not_found' &&
    missing.rngState === 1,
  'unknown harvest plot consumes zero draws');
  ok(!empty.ok && empty.code === 'crop_not_ready' &&
    empty.rngState === 1,
  'empty harvest plot consumes zero draws');
  ok(!invalidRng.ok && invalidRng.code === 'invalid_rng' &&
    invalidRng.rngState === 0,
  'invalid serialized RNG is rejected before a draw');
}

{
  const overflow = putReadyCrop(
    freshModel(),
    0,
    'spiritRice',
    300
  );
  overflow.player.skills.farming = {
    level: 1,
    xp: Number.MAX_SAFE_INTEGER
  };
  const rejected = Farm.harvest(overflow, 'plot-1', 1, {});
  ok(!rejected.ok && rejected.code === 'invalid_progression' &&
    rejected.rngState === 1,
  'unsafe farming progression is rejected before random or inventory effects');

  const capped = putReadyCrop(
    freshModel(),
    0,
    'spiritRice',
    300
  );
  capped.player.skills.farming = { level: 99, xp: 0 };
  capped.player.mastery.farming.spiritRice = { level: 99, xp: 0 };
  const accepted = Farm.harvest(capped, 'plot-1', 1, {});
  ok(accepted.ok &&
    accepted.state.player.skills.farming.level === 99 &&
    accepted.state.player.skills.farming.xp === 0 &&
    accepted.state.player.mastery.farming.spiritRice.level === 99 &&
    accepted.state.player.mastery.farming.spiritRice.xp === 0,
  'level-99 skill and mastery remain safely capped');

  const masteryOverflow = putReadyCrop(
    freshModel(),
    0,
    'spiritRice',
    300
  );
  masteryOverflow.player.mastery.farming.spiritRice = {
    level: 1,
    xp: Number.MAX_SAFE_INTEGER
  };
  const masteryRejected = Farm.harvest(
    masteryOverflow,
    'plot-1',
    1,
    {}
  );
  ok(!masteryRejected.ok &&
    masteryRejected.code === 'invalid_progression' &&
    masteryRejected.rngState === 1,
  'unsafe crop mastery progression is rejected before the draw');
}

{
  const model = putReadyCrop(freshModel(), 0, 'spiritRice', 300);
  model.player.inventory.capacity = 1;
  model.player.inventory.stacks.spiritRice = 2;
  const harvested = Farm.harvest(model, 'plot-1', 12345678, {});
  ok(harvested.ok &&
    harvested.state.player.inventory.stacks.spiritRice === 6,
  'a full bag accepts harvest into an existing output stack');
}

// Query returns a detached deeply frozen stable content view.
{
  const model = freshModel();
  model.player.inventory.stacks.commonSeed = 7;
  const view = Farm.query(model);
  ok(Object.isFrozen(view) &&
    Object.isFrozen(view.plots) &&
    Object.isFrozen(view.plots[0]) &&
    Object.isFrozen(view.plantableCrops),
  'query returns a deeply frozen ViewModel');
  exact(
    view.plantableCrops.map((crop) => crop.cropId),
    [
      'spiritRice',
      'qiGatheringGrass',
      'heartClearGrass',
      'moonSpiritGrass',
      'bloodSpiritGrass',
      'goldenLingzhi'
    ],
    'query preserves stable crop content order'
  );
  ok(view.plantableCrops[0].seedOwned === 7 &&
    view.plantableCrops[0].unlocked === true &&
    view.plantableCrops[3].unlocked === false,
  'query includes seed counts and crop unlock status');
  model.player.inventory.stacks.commonSeed = 99;
  ok(view.plantableCrops[0].seedOwned === 7,
    'query is detached from later model mutation');

  const planted = Farm.plant(model, 'plot-1', 'spiritRice', {}).state;
  const midway = Farm.advance(planted, 75).state;
  const progress = Farm.query(midway).plots[0].progress;
  ok(progress === 0.25,
    'query reports clamped elapsed growth progress');
  model.systems.homestead.farm.plots[0].remainingSeconds = -100;
  const clamped = Farm.query(model).plots[0].progress;
  ok(clamped >= 0 && clamped <= 1,
    'query progress is always clamped from malformed public values');
}

{
  let reads = 0;
  const hostile = {};
  Object.defineProperty(hostile, 'player', {
    enumerable: true,
    get() {
      reads++;
      throw new Error('must not run model getter');
    }
  });
  let view;
  try {
    view = Farm.query(hostile);
  } catch (error) {
    view = null;
  }
  ok(reads === 0 && view && Object.isFrozen(view),
    'query ignores accessor state without invoking it');

  const bonus = {};
  Object.defineProperty(bonus, 'farmGrowthReduction', {
    enumerable: true,
    get() {
      reads++;
      throw new Error('must not run bonus getter');
    }
  });
  const model = freshModel();
  model.player.inventory.stacks.commonSeed = 1;
  const planted = Farm.plant(model, 'plot-1', 'spiritRice', bonus);
  ok(planted.ok &&
    planted.state.systems.homestead.farm.plots[0].totalSeconds === 300 &&
    reads === 0,
  'plant ignores accessor bonuses without invocation');

  let trapped = 0;
  const proxy = new Proxy({}, {
    getPrototypeOf() {
      trapped++;
      throw new Error('must not reflect proxy');
    }
  });
  let result;
  try {
    result = Farm.plant(proxy, 'plot-1', 'spiritRice', {});
  } catch (error) {
    result = null;
  }
  ok(result && !result.ok && result.code === 'invalid_model' &&
    trapped === 0,
  'detected proxy models fail closed without invoking traps');
}

const source = fs.readFileSync('./core/farm.js', 'utf8');
[
  [/\bMath\.random\s*\(/, 'Math.random'],
  [/\bdocument\b/, 'DOM'],
  [/\bcanvas\b|getContext\s*\(/i, 'Canvas'],
  [/\blocalStorage\b|\bSaveSystem\b|\bPlatform\b/, 'storage/save'],
  [/\bset(?:Timeout|Interval)\s*\(/, 'timer'],
  [/\btoast\s*\(/, 'UI side effect']
].forEach(([pattern, label]) => {
  ok(!pattern.test(source), 'farm module has no ' + label + ' dependency');
});

{
  const sandbox = {
    HomesteadContent: require('../content/homestead.js'),
    Inventory: require('../core/inventory.js'),
    SkillProgression: require('../core/skill-progression.js'),
    GameRandom: require('../core/random.js')
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'core/farm.js' });
  ok(sandbox.Farm && Object.isFrozen(sandbox.Farm),
    'browser loading exposes one frozen Farm API');
  exact(Object.keys(sandbox.Farm), ['plant', 'advance', 'harvest', 'query'],
    'browser Farm global has the exact public surface');
}

function browserFarmWithRoll(rollValue) {
  const HomesteadContent = require('../content/homestead.js');
  const Inventory = require('../core/inventory.js');
  const SkillProgression = require('../core/skill-progression.js');
  let inventoryCalls = 0;
  let randomCalls = 0;
  const mutableContent = clone(HomesteadContent);
  const mutableInventory = {
    apply(inventory, delta) {
      inventoryCalls++;
      const outerDelta = {};
      Object.keys(delta).forEach((itemId) => {
        outerDelta[itemId] = delta[itemId];
      });
      return Inventory.apply(inventory, outerDelta);
    }
  };
  const mutableProgression = {
    skillSpeedBonus: SkillProgression.skillSpeedBonus,
    masterySpeedBonus: SkillProgression.masterySpeedBonus,
    masteryYieldOrRetentionChance:
      SkillProgression.masteryYieldOrRetentionChance,
    addSkillXp: SkillProgression.addSkillXp,
    addMasteryXp: SkillProgression.addMasteryXp
  };
  const mutableRandom = {
    next(seed) {
      randomCalls++;
      return { seed: (seed + 1) >>> 0, value: rollValue };
    }
  };
  const sandbox = {
    HomesteadContent: mutableContent,
    Inventory: mutableInventory,
    SkillProgression: mutableProgression,
    GameRandom: mutableRandom
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'core/farm.js' });
  return {
    farm: sandbox.Farm,
    mutableContent,
    mutableInventory,
    mutableProgression,
    mutableRandom,
    inventoryCalls() {
      return inventoryCalls;
    },
    randomCalls() {
      return randomCalls;
    }
  };
}

// UMD dependency snapshots make the one-draw and one-apply contract observable.
{
  const made = browserFarmWithRoll(0.75);
  const model = putReadyCrop(freshModel(), 0, 'spiritRice', 300);
  const boundary = made.farm.harvest(model, 'plot-1', 7, {
    farmExtraYieldChance: 0.75
  });
  ok(boundary.ok &&
    boundary.state.player.inventory.stacks.spiritRice === 4,
  'extra-yield comparison is strict at the 75% boundary');
  ok(made.randomCalls() === 1 && made.inventoryCalls() === 1,
    'legal harvest performs exactly one draw and one inventory apply');
}

{
  const made = browserFarmWithRoll(0.749999);
  const model = putReadyCrop(freshModel(), 0, 'spiritRice', 300);
  const hit = made.farm.harvest(model, 'plot-1', 7, {
    farmExtraYieldChance: 99
  });
  ok(hit.ok && hit.state.player.inventory.stacks.spiritRice === 8,
    'extra-yield bonus caps at 75% and a value below it hits');
}

{
  const made = browserFarmWithRoll(0.1);
  const model = freshModel();
  model.player.inventory.stacks.commonSeed = 1;
  const planted = made.farm.plant(model, 'plot-1', 'spiritRice', {});
  ok(planted.ok && made.inventoryCalls() === 1 &&
    made.randomCalls() === 0,
  'plant performs exactly one inventory apply and no random draw');

  const full = putReadyCrop(freshModel(), 0, 'spiritRice', 300);
  full.player.inventory.capacity = 1;
  full.player.inventory.stacks.copperOre = 1;
  const beforeCalls = made.inventoryCalls();
  const blocked = made.farm.harvest(full, 'plot-1', 8, {});
  ok(!blocked.ok && blocked.code === 'inventory_full' &&
    made.randomCalls() === 1 &&
    made.inventoryCalls() === beforeCalls + 1,
  'full-bag harvest still performs its fixed draw and one atomic apply');
}

{
  const made = browserFarmWithRoll(0.99);
  const originalName = made.mutableContent.CROPS.spiritRice.name;
  made.mutableContent.CROPS.spiritRice.name = 'late crop mutation';
  made.mutableContent.CROPS.spiritRice.output.quantity = 999;
  made.mutableInventory.apply = function () {
    throw new Error('late inventory mutation');
  };
  made.mutableProgression.addSkillXp = function () {
    throw new Error('late progression mutation');
  };
  made.mutableRandom.next = function () {
    throw new Error('late random mutation');
  };
  const model = putReadyCrop(freshModel(), 0, 'spiritRice', 300);
  const harvested = made.farm.harvest(model, 'plot-1', 9, {});
  const queried = made.farm.query(freshModel());
  ok(harvested.ok &&
    harvested.state.player.inventory.stacks.spiritRice === 4 &&
    queried.plantableCrops[0].name === originalName,
  'post-load content and method mutation cannot affect Farm');
}

{
  let reads = 0;
  const unsafeContent = {};
  Object.defineProperty(unsafeContent, 'CROPS', {
    enumerable: true,
    get() {
      reads++;
      throw new Error('must not invoke dependency getter');
    }
  });
  const sandbox = {
    HomesteadContent: unsafeContent,
    Inventory: require('../core/inventory.js'),
    SkillProgression: require('../core/skill-progression.js'),
    GameRandom: require('../core/random.js')
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  let threw = false;
  try {
    vm.runInContext(source, sandbox, { filename: 'core/farm.js' });
  } catch (error) {
    threw = error instanceof TypeError || error.name === 'TypeError';
  }
  ok(threw && reads === 0,
    'unsafe dependency accessors are rejected without invocation');
}

console.log(
  `\n=== Stage 2 灵田自测：${pass} 通过 / ${fail} 失败 ===`
);
if (fail) process.exit(1);
