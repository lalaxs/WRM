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

const RecipeContent = require('../content/recipes.js');
const RecipeFixtures =
  require('./selftest_stage2_content_fixtures.js').recipes;
const Inventory = require('../core/inventory.js');
const SkillProgression = require('../core/skill-progression.js');
const GameRandom = require('../core/random.js');
const Stage2State = require('../core/stage2-state.js');
const beforeGlobal = globalThis.Production;
const Production = require('../core/production.js');

ok(globalThis.Production === beforeGlobal,
  'CommonJS loading does not attach a browser global');
ok(Object.isFrozen(Production), 'Production module API is frozen');
exact(Object.keys(Production), ['create'],
  'Production module exposes only its factory');

function sequenceRandom(values) {
  let draws = 0;
  return {
    next(seed) {
      const index = draws++;
      return {
        seed: (seed + 1) >>> 0,
        value: values[index] == null ? 0.99 : values[index]
      };
    },
    draws() {
      return draws;
    }
  };
}

function dependencies(random, recipes, inventory, progression) {
  return {
    RecipeContent: recipes || RecipeContent,
    Inventory: inventory || Inventory,
    SkillProgression: progression || SkillProgression,
    GameRandom: random || GameRandom
  };
}

function makeRules(values, overrides) {
  const random = sequenceRandom(values || []);
  const settings = overrides || {};
  return {
    random,
    rules: Production.create(dependencies(
      random,
      settings.recipes,
      settings.inventory,
      settings.progression
    ))
  };
}

function freshPlayer() {
  const player = Stage2State.createDefaults().player;
  player.xiwei = 0;
  return player;
}

function masteryKey(recipe) {
  const prefix = recipe.skillId + ':';
  return recipe.masteryId.indexOf(prefix) === 0
    ? recipe.masteryId.slice(prefix.length)
    : recipe.masteryId;
}

function fixtureRecipe(row) {
  const baseSeconds = row[5];
  const skillXp = Math.max(1, Math.round(baseSeconds * 1.5));
  return {
    id: row[0],
    skillId: row[1],
    masteryId: row[2],
    unlockLevel: row[4],
    baseSeconds,
    skillXp,
    masteryXp: Math.max(1, Math.round(skillXp * 0.5)),
    cultivation: Math.max(1, Math.round(baseSeconds * 0.25)),
    ingredients: row[6],
    ingredientChoices: row[7],
    output: row[8]
  };
}

function preparePlayer(expected, level, masteryLevel) {
  const player = freshPlayer();
  player.skills[expected.skillId] = {
    level: level == null ? expected.unlockLevel : level,
    xp: 0
  };
  player.mastery[expected.skillId][masteryKey(expected)] = {
    level: masteryLevel == null ? 1 : masteryLevel,
    xp: 0
  };
  Object.keys(expected.ingredients).forEach((itemId) => {
    player.inventory.stacks[itemId] = expected.ingredients[itemId];
  });
  expected.ingredientChoices.forEach((group) => {
    const itemId = group.itemIds[0];
    player.inventory.stacks[itemId] =
      (player.inventory.stacks[itemId] || 0) + group.quantity;
  });
  return player;
}

const rules = Production.create(dependencies());
ok(Object.isFrozen(rules), 'created production rules are frozen');
exact(Object.keys(rules), ['complete', 'getDuration'],
  'created rules expose completion and duration lookup');

// Every canonical recipe has an independently specified valid transaction.
RecipeFixtures.forEach((row) => {
  const expected = fixtureRecipe(row);
  const player = preparePlayer(expected, 99, 1);
  const before = JSON.stringify(player);
  const made = makeRules([0.99]);
  const result = made.rules.complete(player, expected.id, 7, {});
  ok(result.ok && result.code === 'ok',
    'canonical recipe completes: ' + expected.id);
  exact(result.gains.items, {
    [expected.output.itemId]: expected.output.quantity
  }, 'canonical output is exact: ' + expected.id);
  exact(result.costs.items, Object.assign(
    {},
    expected.ingredients,
    ...expected.ingredientChoices.map((group) => ({
      [group.itemIds[0]]: group.quantity
    }))
  ), 'canonical costs are exact: ' + expected.id);
  ok(result.gains.skillXp[expected.skillId] === expected.skillXp &&
    result.gains.masteryXp[expected.masteryId] === expected.masteryXp &&
    result.gains.cultivation === expected.cultivation,
  'canonical progression gains are exact: ' + expected.id);
  ok(result.player.inventory.stacks[expected.output.itemId] ===
    ((expected.ingredients[expected.output.itemId] || 0) +
      expected.output.quantity -
      (result.costs.items[expected.output.itemId] || 0)),
  'canonical output stack is exact: ' + expected.id);
  ok(made.random.draws() === 1 && result.rngState === 8,
    'canonical completion consumes exactly one retention draw: ' +
      expected.id);
  ok(JSON.stringify(player) === before,
    'canonical completion does not mutate input: ' + expected.id);
});

// Level-one alchemy, stacking, and progression.
{
  const expected = fixtureRecipe(RecipeFixtures[0]);
  const player = preparePlayer(expected, 1, 1);
  const made = makeRules([0.99]);
  const result = made.rules.complete(
    player,
    'alchemy:healingPill',
    10,
    {}
  );
  ok(result.ok, 'level-one player can create the healing pill');
  exact(result.player.inventory.stacks, { healingPill: 1 },
    'healing pill consumes exactly two lingzhi');
  exact(result.gains, {
    items: { healingPill: 1 },
    skillXp: { alchemy: 12 },
    masteryXp: { 'alchemy:healingPill': 6 },
    cultivation: 2
  }, 'healing pill grants literal recipe progression');
  exact(result.costs, { items: { lingzhi: 2 } },
    'healing pill reports its actual costs');
  ok(result.player.skills.alchemy.xp === 12 &&
    result.player.mastery.alchemy.healingPill.xp === 6 &&
    result.player.xiwei === 2,
  'player receives skill, mastery, and cultivation gains');

  const twiceInput = result.player;
  twiceInput.inventory.stacks.lingzhi = 2;
  const twice = made.rules.complete(
    twiceInput,
    'alchemy:healingPill',
    result.rngState,
    {}
  );
  ok(twice.ok && twice.player.inventory.stacks.healingPill === 2,
    'repeated production stacks output into the existing slot');
}

// All five skills enforce unlocks and exact fixed-material availability.
[
  ['alchemy:qiGatheringPill', 'alchemy'],
  ['forging:ironSword', 'forging'],
  ['cooking:troutFeast', 'cooking'],
  ['talisman:gatheringTalisman', 'talisman'],
  ['formation:gatheringFormation', 'formation']
].forEach(([recipeId, skillId]) => {
  const expected = fixtureRecipe(
    RecipeFixtures.find((row) => row[0] === recipeId)
  );
  const locked = preparePlayer(expected, expected.unlockLevel - 1, 1);
  const lockedBefore = JSON.stringify(locked);
  const lockedMade = makeRules([0]);
  const lockedResult = lockedMade.rules.complete(
    locked,
    recipeId,
    1,
    {}
  );
  ok(!lockedResult.ok && lockedResult.code === 'skill_locked',
    skillId + ' locked recipe is rejected');
  ok(lockedMade.random.draws() === 0 &&
    JSON.stringify(lockedResult.player) === lockedBefore,
  skillId + ' locked recipe consumes no RNG or state');

  const missing = preparePlayer(expected, expected.unlockLevel, 1);
  delete missing.inventory.stacks[Object.keys(expected.ingredients)[0]];
  const missingBefore = JSON.stringify(missing);
  const missingMade = makeRules([0]);
  const missingResult = missingMade.rules.complete(
    missing,
    recipeId,
    1,
    {}
  );
  ok(!missingResult.ok && missingResult.code === 'materials_exhausted',
    skillId + ' missing materials are rejected');
  ok(missingMade.random.draws() === 0 &&
    JSON.stringify(missingResult.player) === missingBefore,
  skillId + ' material preflight consumes no RNG or state');
});

// Choice resolution uses the declared ten-fish order and safe preferences.
{
  const row = RecipeFixtures.find((item) =>
    item[0] === 'cooking:beastFeed'
  );
  const expected = fixtureRecipe(row);
  const canonicalFish = row[7][0].itemIds;
  canonicalFish.forEach((fishId, fishIndex) => {
    const player = preparePlayer(expected, 12, 1);
    canonicalFish.forEach((id) => delete player.inventory.stacks[id]);
    player.inventory.stacks[fishId] = 1;
    const result = makeRules([0.99]).rules.complete(
      player,
      expected.id,
      fishIndex,
      {}
    );
    ok(result.ok && result.costs.items[fishId] === 1,
      'beast feed falls back to canonical fish ' + fishId);
  });

  const preferred = preparePlayer(expected, 12, 1);
  preferred.inventory.stacks.spiritCarp = 1;
  preferred.inventory.stacks.dragonFish = 1;
  const picked = makeRules([0.99]).rules.complete(
    preferred,
    expected.id,
    4,
    { preferredIngredients: ['dragonFish'] }
  );
  ok(picked.ok && picked.costs.items.dragonFish === 1 &&
    picked.player.inventory.stacks.spiritCarp === 1,
  'valid affordable preferred fish overrides canonical order');

  const unavailable = preparePlayer(expected, 12, 1);
  unavailable.inventory.stacks.spiritCarp = 1;
  const fallback = makeRules([0.99]).rules.complete(
    unavailable,
    expected.id,
    4,
    { preferredIngredients: ['dragonFish'] }
  );
  ok(fallback.ok && fallback.costs.items.spiritCarp === 1,
    'unavailable valid preference falls back to affordable canonical fish');

  const invalidMade = makeRules([0]);
  const invalidBefore = JSON.stringify(preferred);
  const invalid = invalidMade.rules.complete(
    preferred,
    expected.id,
    4,
    { preferredIngredients: ['notAFish'] }
  );
  ok(!invalid.ok && invalid.code === 'invalid_preferred_ingredient' &&
    invalidMade.random.draws() === 0,
  'unknown preferred fish is rejected before RNG');
  ok(JSON.stringify(invalid.player) === invalidBefore,
    'invalid preference leaves the whole player unchanged');

  const noFish = preparePlayer(expected, 12, 1);
  canonicalFish.forEach((id) => delete noFish.inventory.stacks[id]);
  const noFishMade = makeRules([0]);
  const exhausted = noFishMade.rules.complete(
    noFish,
    expected.id,
    4,
    {}
  );
  ok(!exhausted.ok && exhausted.code === 'materials_exhausted' &&
    noFishMade.random.draws() === 0,
  'missing choice-group material is rejected before RNG');
}

// Retention uses one strict-boundary draw and caps at fifty percent.
{
  const expected = fixtureRecipe(RecipeFixtures[0]);
  function retainedAt(masteryLevel, roll, bonus) {
    const player = preparePlayer(expected, 1, masteryLevel);
    const made = makeRules([roll]);
    return {
      made,
      result: made.rules.complete(
        player,
        expected.id,
        100,
        { materialRetentionChance: bonus }
      )
    };
  }

  const hit = retainedAt(5, 0.009999, 0);
  ok(hit.result.ok && hit.result.retained &&
    hit.result.player.inventory.stacks.lingzhi === 2 &&
    hit.result.player.inventory.stacks.healingPill === 1,
  'retention hit keeps the entire ingredient set and grants output');
  exact(hit.result.costs.items, {},
    'retention reports no material cost');
  ok(hit.made.random.draws() === 1,
    'retention hit consumes exactly one draw');

  const edge = retainedAt(5, 0.01, 0);
  ok(edge.result.ok && !edge.result.retained &&
    edge.result.player.inventory.stacks.lingzhi == null,
  'retention uses a strict less-than boundary');

  const cappedHit = retainedAt(99, 0.499999, 999);
  const cappedMiss = retainedAt(99, 0.5, 999);
  ok(cappedHit.result.retained && !cappedMiss.result.retained,
    'mastery plus bonus retention caps exactly at fifty percent');
}

// Inventory transaction is one signed net delta and remains atomic.
{
  const expected = fixtureRecipe(RecipeFixtures[0]);
  const full = preparePlayer(expected, 1, 1);
  full.inventory.capacity = 1;
  full.inventory.stacks.lingzhi = 3;
  const before = JSON.stringify(full);
  const fullMade = makeRules([0.99]);
  const result = fullMade.rules.complete(
    full,
    expected.id,
    20,
    {}
  );
  ok(!result.ok && result.code === 'inventory_full',
    'output-full completion fails atomically');
  ok(result.rngState === 21 && fullMade.random.draws() === 1,
    'output-full failure advances the fixed retention draw');
  ok(JSON.stringify(result.player) === before &&
    JSON.stringify(full) === before,
  'output-full failure keeps every ingredient and player field');

  const freed = preparePlayer(expected, 1, 1);
  freed.inventory.capacity = 1;
  const freedResult = makeRules([0.99]).rules.complete(
    freed,
    expected.id,
    20,
    {}
  );
  ok(freedResult.ok &&
    freedResult.player.inventory.stacks.lingzhi == null &&
    freedResult.player.inventory.stacks.healingPill === 1,
  'consumed stack frees a slot for output in the same transaction');

  const retainedFull = preparePlayer(expected, 1, 5);
  retainedFull.inventory.capacity = 1;
  const retainedFullResult = makeRules([0]).rules.complete(
    retainedFull,
    expected.id,
    20,
    {}
  );
  ok(!retainedFullResult.ok &&
    retainedFullResult.code === 'inventory_full' &&
    retainedFullResult.retained,
  'retained ingredients cannot falsely free an output slot');
}

// Custom content proves same-item netting and cumulative choice groups.
{
  const customRecipe = {
    id: 'cooking:testNet',
    skillId: 'cooking',
    masteryId: 'cooking:testNet',
    name: '测试料理',
    unlockLevel: 1,
    baseSeconds: 1,
    skillXp: 1,
    masteryXp: 1,
    cultivation: 1,
    ingredients: { spiritRice: 2 },
    ingredientChoices: [
      { quantity: 1, itemIds: ['spiritCarp', 'spiritShrimp'] },
      { quantity: 2, itemIds: ['spiritCarp', 'spiritShrimp'] }
    ],
    output: { itemId: 'spiritRice', quantity: 1 }
  };
  const player = freshPlayer();
  player.mastery.cooking.testNet = { level: 1, xp: 0 };
  player.inventory.stacks.spiritRice = 2;
  player.inventory.stacks.spiritCarp = 3;
  let applyCalls = 0;
  const trackingInventory = {
    availableQuantity: Inventory.availableQuantity,
    apply(inventory, delta) {
      applyCalls++;
      exact(delta, { spiritRice: -1, spiritCarp: -3 },
        'costs and output merge into one signed net delta');
      return Inventory.apply(inventory, delta);
    }
  };
  const result = makeRules([0.99], {
    recipes: { RECIPES: { [customRecipe.id]: customRecipe } },
    inventory: trackingInventory
  }).rules.complete(player, customRecipe.id, 1, {});
  ok(result.ok && applyCalls === 1,
    'production applies inventory exactly once');
  exact(result.player.inventory.stacks, { spiritRice: 1 },
    'same-item output and repeated choice costs never overwrite');
  exact(result.costs.items, { spiritRice: 2, spiritCarp: 3 },
    'gross costs remain accurate after signed-net merging');
}

// Duration lookup is deterministic, capped, rounded, and non-throwing.
{
  const player = freshPlayer();
  ok(rules.getDuration(player, 'alchemy:healingPill', {}) === 8,
    'level-one duration equals the literal base duration');
  player.skills.alchemy.level = 99;
  player.mastery.alchemy.healingPill.level = 99;
  ok(rules.getDuration(
    player,
    'alchemy:healingPill',
    { craftingDurationReduction: 0.05 }
  ) === 5.672, 'duration composes skill, mastery, and five-percent formation');
  ok(rules.getDuration(
    player,
    'alchemy:healingPill',
    { craftingDurationReduction: 999 }
  ) === 0.5, 'hostile duration reduction cannot make duration negative');
  ok(rules.getDuration(
    player,
    'alchemy:healingPill',
    { craftingDurationReduction: -1 }
  ) === 5.97, 'negative duration reduction is ignored');
  ok(rules.getDuration(player, 'unknown', {}) === Infinity,
    'unknown recipe has explicit infinite duration');
  player.skills.alchemy.level = 1;
  ok(rules.getDuration(player, 'alchemy:qiGatheringPill', {}) === Infinity,
    'locked recipe has explicit infinite duration');
}

// Level 99 stays capped while the recipe still grants reported rewards.
{
  const expected = fixtureRecipe(RecipeFixtures[0]);
  const player = preparePlayer(expected, 99, 99);
  player.skills.alchemy.xp = 0;
  player.mastery.alchemy.healingPill.xp = 0;
  const result = makeRules([0.99]).rules.complete(
    player,
    expected.id,
    1,
    {}
  );
  exact(result.player.skills.alchemy, { level: 99, xp: 0 },
    'skill level 99 remains capped');
  exact(result.player.mastery.alchemy.healingPill,
    { level: 99, xp: 0 }, 'mastery level 99 remains capped');
  ok(result.gains.skillXp.alchemy === 12 &&
    result.gains.masteryXp['alchemy:healingPill'] === 6,
  'capped progression still reports recipe rewards');
}

// Cultivation commits must remain exact safe integers or fail before effects.
{
  const expected = fixtureRecipe(RecipeFixtures[0]);
  const invalidCultivation = [
    [Number.MAX_SAFE_INTEGER, 'maximum safe integer plus reward'],
    [Number.MAX_SAFE_INTEGER - 1, 'one below maximum plus reward'],
    [Number.MAX_VALUE, 'maximum finite number'],
    [0.5, 'fractional cultivation'],
    [NaN, 'NaN cultivation'],
    [Infinity, 'infinite cultivation'],
    [-1, 'negative cultivation']
  ];
  invalidCultivation.forEach(([xiwei, label]) => {
    const player = preparePlayer(expected, 1, 1);
    player.xiwei = xiwei;
    const before = structuredClone(player);
    let inventoryCalls = 0;
    const trackingInventory = {
      availableQuantity: Inventory.availableQuantity,
      apply(inventory, delta) {
        inventoryCalls++;
        return Inventory.apply(inventory, delta);
      }
    };
    const made = makeRules([0], { inventory: trackingInventory });
    const result = made.rules.complete(
      player,
      expected.id,
      0x12345678,
      { materialRetentionChance: 0.5 }
    );
    ok(!result.ok && result.code === 'invalid_progression',
      label + ' is rejected as invalid progression');
    ok(result.rngState === 0x12345678 &&
      made.random.draws() === 0 &&
      inventoryCalls === 0,
    label + ' fails before retention RNG and inventory apply');
    ok(result.player !== player &&
      isDeepStrictEqual(result.player, before),
    label + ' returns a detached value-equivalent player');
    exact(result.gains, {
      items: {},
      skillXp: {},
      masteryXp: {},
      cultivation: 0
    }, label + ' failure reports no gains');
    exact(result.costs, { items: {} },
      label + ' failure reports no costs');
  });

  const exactMax = preparePlayer(expected, 1, 1);
  exactMax.xiwei = Number.MAX_SAFE_INTEGER - 2;
  const reachesMax = makeRules([0.99]).rules.complete(
    exactMax,
    expected.id,
    3,
    {}
  );
  ok(reachesMax.ok &&
    reachesMax.player.xiwei === Number.MAX_SAFE_INTEGER,
  'cultivation may reach the maximum safe integer exactly');
  ok(reachesMax.player.xiwei - exactMax.xiwei ===
    expected.cultivation,
  'successful cultivation applies the reported reward exactly');
}

// Every distinct canonical cultivation reward obeys the same exact boundary.
{
  const byCultivation = new Map();
  RecipeFixtures.forEach((row) => {
    const expected = fixtureRecipe(row);
    if (!byCultivation.has(expected.cultivation)) {
      byCultivation.set(expected.cultivation, expected);
    }
  });
  byCultivation.forEach((expected, cultivation) => {
    const exactPlayer = preparePlayer(expected, 99, 1);
    exactPlayer.xiwei = Number.MAX_SAFE_INTEGER - cultivation;
    const exactResult = makeRules([0.99]).rules.complete(
      exactPlayer,
      expected.id,
      5,
      {}
    );
    ok(exactResult.ok &&
      exactResult.player.xiwei === Number.MAX_SAFE_INTEGER &&
      exactResult.player.xiwei - exactPlayer.xiwei === cultivation,
    'cultivation reward reaches exact safe maximum: ' + cultivation);

    const overflowPlayer = preparePlayer(expected, 99, 1);
    overflowPlayer.xiwei =
      Number.MAX_SAFE_INTEGER - cultivation + 1;
    const before = structuredClone(overflowPlayer);
    let inventoryCalls = 0;
    const trackingInventory = {
      availableQuantity: Inventory.availableQuantity,
      apply(inventory, delta) {
        inventoryCalls++;
        return Inventory.apply(inventory, delta);
      }
    };
    const made = makeRules([0], { inventory: trackingInventory });
    const overflow = made.rules.complete(
      overflowPlayer,
      expected.id,
      5,
      { materialRetentionChance: 0.5 }
    );
    ok(!overflow.ok &&
      overflow.code === 'invalid_progression' &&
      overflow.rngState === 5,
    'cultivation reward rejects unsafe overflow: ' + cultivation);
    ok(made.random.draws() === 0 &&
      inventoryCalls === 0 &&
      overflow.player !== overflowPlayer &&
      isDeepStrictEqual(overflow.player, before),
    'cultivation overflow has zero side effects: ' + cultivation);
  });
}

// Progression helpers still cap huge safe XP without an unsafe persisted XP.
{
  const expected = fixtureRecipe(RecipeFixtures[0]);
  const player = preparePlayer(expected, 98, 98);
  player.skills.alchemy.xp = Number.MAX_SAFE_INTEGER;
  player.mastery.alchemy.healingPill.xp = Number.MAX_SAFE_INTEGER;
  const result = makeRules([0.99]).rules.complete(
    player,
    expected.id,
    6,
    {}
  );
  ok(result.ok &&
    result.player.skills.alchemy.level === 99 &&
    result.player.skills.alchemy.xp === 0,
  'skill XP helper safely caps huge progress at level 99');
  ok(result.player.mastery.alchemy.healingPill.level === 99 &&
    result.player.mastery.alchemy.healingPill.xp === 0,
  'mastery XP helper safely caps huge progress at level 99');
  ok(result.gains.skillXp.alchemy === expected.skillXp &&
    result.gains.masteryXp[expected.masteryId] === expected.masteryXp,
  'capped XP reports only the exact recipe gain');
}

// Failure classes are deterministic, detached, and RNG-safe.
{
  const expected = fixtureRecipe(RecipeFixtures[0]);
  const player = preparePlayer(expected, 1, 1);
  [
    ['unknown', 'invalid_recipe', 0],
    [null, 'invalid_recipe', 0]
  ].forEach(([recipeId, code, draws]) => {
    const made = makeRules([0]);
    const result = made.rules.complete(player, recipeId, 8, {});
    ok(!result.ok && result.code === code &&
      made.random.draws() === draws,
    code + ' returns without consuming RNG');
    ok(result.player !== player &&
      JSON.stringify(result.player) === JSON.stringify(player),
    code + ' returns a detached unchanged player');
  });

  const invalidSeed = makeRules([0]);
  const invalidRng = invalidSeed.rules.complete(
    player,
    expected.id,
    -1,
    {}
  );
  ok(!invalidRng.ok && invalidRng.code === 'invalid_rng' &&
    invalidSeed.random.draws() === 0,
  'invalid serialized RNG is rejected before provider invocation');

  const malformedRandom = {
    next(seed) {
      return { seed: seed + 1, value: 1 };
    }
  };
  const malformedRules = Production.create(dependencies(malformedRandom));
  const malformed = malformedRules.complete(
    player,
    expected.id,
    2,
    {}
  );
  ok(!malformed.ok && malformed.code === 'invalid_rng' &&
    malformed.rngState === 2,
  'invalid random-provider output cannot corrupt serialized RNG');
  ok(JSON.stringify(malformed.player) === JSON.stringify(player),
    'invalid random-provider output leaves player unchanged');
}

// Safe-integer overflow from the inventory boundary fails atomically.
{
  const expected = fixtureRecipe(RecipeFixtures[0]);
  const player = preparePlayer(expected, 1, 1);
  player.inventory.stacks.healingPill = Number.MAX_SAFE_INTEGER;
  const before = JSON.stringify(player);
  const made = makeRules([0.99]);
  const result = made.rules.complete(
    player,
    expected.id,
    9,
    {}
  );
  ok(!result.ok && result.code === 'invalid_inventory' &&
    result.rngState === 10,
  'unsafe output stack overflow fails after the fixed draw');
  ok(JSON.stringify(result.player) === before,
    'safe-integer overflow leaves the full player unchanged');
}

// Adversarial players, options, and dependency boundaries stay getter-safe.
{
  let playerReads = 0;
  const accessorPlayer = {};
  Object.defineProperty(accessorPlayer, 'inventory', {
    enumerable: true,
    get() {
      playerReads++;
      throw new Error('must not invoke player getter');
    }
  });
  const result = rules.complete(
    accessorPlayer,
    'alchemy:healingPill',
    1,
    {}
  );
  ok(!result.ok && result.code === 'invalid_player' && playerReads === 0,
    'player accessors are rejected without invocation');

  let optionReads = 0;
  const accessorOptions = {};
  Object.defineProperty(accessorOptions, 'materialRetentionChance', {
    enumerable: true,
    get() {
      optionReads++;
      throw new Error('must not invoke option getter');
    }
  });
  const expected = fixtureRecipe(RecipeFixtures[0]);
  const player = preparePlayer(expected, 1, 1);
  const optionMade = makeRules([0]);
  const invalidOptions = optionMade.rules.complete(
    player,
    expected.id,
    1,
    accessorOptions
  );
  ok(!invalidOptions.ok && invalidOptions.code === 'invalid_options' &&
    optionReads === 0 && optionMade.random.draws() === 0,
  'option accessors are rejected before RNG without invocation');

  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  noThrow(() => {
    const revokedResult = rules.complete(
      player,
      expected.id,
      1,
      revoked.proxy
    );
    ok(!revokedResult.ok && revokedResult.code === 'invalid_options',
      'revoked proxy options have a stable failure');
  }, 'revoked proxy options never escape an exception');

  let depReads = 0;
  const accessorDeps = {};
  Object.defineProperty(accessorDeps, 'RecipeContent', {
    enumerable: true,
    get() {
      depReads++;
      throw new Error('must not invoke dependency getter');
    }
  });
  noThrow(() => {
    let threw = false;
    try {
      Production.create(accessorDeps);
    } catch (error) {
      threw = error instanceof TypeError;
    }
    ok(threw, 'factory rejects accessor dependencies with TypeError');
  }, 'factory dependency validation has a stable error');
  ok(depReads === 0, 'factory never invokes a dependency getter');

  const trapped = new Proxy(dependencies(), {
    ownKeys() {
      throw new Error('proxy trap secret');
    }
  });
  noThrow(() => {
    let threw = false;
    try {
      Production.create(trapped);
    } catch (error) {
      threw = error instanceof TypeError;
    }
    ok(threw, 'factory rejects a proxied dependency graph');
  }, 'proxied dependencies do not leak trap exceptions');
}

// Created rules retain content and callable snapshots after source mutation.
{
  const recipe = JSON.parse(JSON.stringify(
    RecipeContent.RECIPES['alchemy:healingPill']
  ));
  const mutableRecipes = { RECIPES: { [recipe.id]: recipe } };
  const mutableInventory = {
    availableQuantity: Inventory.availableQuantity,
    apply: Inventory.apply
  };
  const mutableProgression = {
    effectiveDuration: SkillProgression.effectiveDuration,
    addSkillXp: SkillProgression.addSkillXp,
    addMasteryXp: SkillProgression.addMasteryXp,
    masteryYieldOrRetentionChance:
      SkillProgression.masteryYieldOrRetentionChance
  };
  const mutableRandom = sequenceRandom([0.99]);
  const copied = Production.create({
    RecipeContent: mutableRecipes,
    Inventory: mutableInventory,
    SkillProgression: mutableProgression,
    GameRandom: mutableRandom
  });
  recipe.ingredients.lingzhi = 999;
  recipe.output.itemId = 'mahayanaPill';
  mutableInventory.apply = function () {
    throw new Error('late inventory mutation');
  };
  mutableProgression.addSkillXp = function () {
    throw new Error('late progression mutation');
  };
  mutableRandom.next = function () {
    throw new Error('late random mutation');
  };
  const player = freshPlayer();
  player.inventory.stacks.lingzhi = 2;
  const result = copied.complete(player, recipe.id, 1, {});
  ok(result.ok &&
    result.player.inventory.stacks.healingPill === 1,
  'post-create content and method mutation cannot affect production');
}

// The source is pure UMD and creates only the intended browser global.
const source = fs.readFileSync('./core/production.js', 'utf8');
[
  [/\bMath\.random\s*\(/, 'Math.random'],
  [/\bdocument\b/, 'DOM'],
  [/\bcanvas\b|getContext\s*\(/i, 'Canvas'],
  [/\blocalStorage\b|\bSaveSystem\b|\bPlatform\b/, 'storage/save'],
  [/\bset(?:Timeout|Interval)\s*\(/, 'timer'],
  [/\btoast\s*\(/, 'UI side effect']
].forEach(([pattern, label]) => {
  ok(!pattern.test(source),
    'production module has no ' + label + ' dependency');
});

{
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'core/production.js' });
  ok(sandbox.Production &&
    Object.isFrozen(sandbox.Production) &&
    typeof sandbox.Production.create === 'function',
  'browser loading exposes only the frozen Production factory API');
}

console.log(
  `\n=== Stage 2 生产事务自测：${pass} 通过 / ${fail} 失败 ===`
);
if (fail) process.exit(1);
