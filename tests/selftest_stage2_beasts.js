'use strict';

const fs = require('fs');
const vm = require('vm');
const { isDeepStrictEqual } = require('node:util');
let pass = 0;
let fail = 0;
function ok(value, message) { if (value) pass++; else { fail++; console.error('  ✗ FAIL: ' + message); } }
function exact(actual, expected, message) { ok(isDeepStrictEqual(actual, expected), message); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
const Stage2State = require('../core/stage2-state.js');
const GameRandom = require('../core/random.js');
const beforeGlobal = globalThis.SpiritBeasts;
const SpiritBeasts = require('../core/spirit-beasts.js');

ok(globalThis.SpiritBeasts === beforeGlobal, 'CommonJS loading does not attach a browser global');
ok(Object.isFrozen(SpiritBeasts), 'SpiritBeasts API is frozen');
exact(Object.keys(SpiritBeasts), ['tryEncounter', 'completeTame', 'completeTraining', 'setActive', 'effects', 'query'], 'strict public API order');
function fresh() { const model = Stage2State.createDefaults(); model.mainAction = { key: 'gather:collect:herb' }; model.current = { key: 'fish:pond' }; return model; }
function rolls(values) { let calls = 0; return { next(seed) { const value = values[calls++]; return { seed: (seed + 1) >>> 0, value: value == null ? 0.99 : value }; }, calls() { return calls; } }; }

// Exact encounter mapping, strict threshold, cap/dedup, and zero-mutation failures.
{
  const model = fresh();
  const made = browserWithRolls([0.0099]);
  const result = made.api.tryEncounter(model, 'herb', 7);
  ok(result.ok && result.rngState === 8 && made.calls() === 1, 'eligible encounter consumes exactly one draw');
  exact(clone(result.state.systems.homestead.beasts.encounters), [{ id: 'encounter-1', speciesId: 'spiritFox', sourceSkillId: 'herb' }], '0.0099 creates the exact herb spirit fox encounter');
  ok(result.state.mainAction === model.mainAction && result.state.current === model.current, 'encounter preserves action reference slots');
  const boundary = browserWithRolls([0.01]).api.tryEncounter(model, 'herb', 7);
  ok(boundary.ok && boundary.code === 'no_encounter' && boundary.state.systems.homestead.beasts.encounters.length === 0, '0.01 is strictly outside encounter threshold');
  ['mining', 'woodcutting', 'fishing'].forEach((source, index) => {
    const value = browserWithRolls([0]).api.tryEncounter(model, source, 9);
    exact(value.state.systems.homestead.beasts.encounters[0].speciesId, ['rockshell', 'azureCrane', 'waterTurtle'][index], 'source maps to exact species ' + source);
  });
  const pending = fresh(); pending.systems.homestead.beasts.encounters.push({ id: 'encounter-1', speciesId: 'spiritFox', sourceSkillId: 'herb' });
  const duplicate = browserWithRolls([0]).api.tryEncounter(pending, 'herb', 7);
  ok(!duplicate.ok && duplicate.code === 'already_pending' && duplicate.rngState === 7 && duplicate.state === pending, 'pending species blocks before draw');
  pending.systems.homestead.beasts.encounters = ['spiritFox', 'rockshell', 'azureCrane'].map((speciesId, index) => ({ id: 'encounter-' + (index + 1), speciesId, sourceSkillId: 'herb' }));
  const capped = browserWithRolls([0]).api.tryEncounter(pending, 'fishing', 7);
  ok(!capped.ok && capped.code === 'pending_cap' && capped.rngState === 7, 'three pending encounters block fourth with zero draw');
  const invalid = browserWithRolls([0]).api.tryEncounter(model, 'alchemy', 7);
  ok(!invalid.ok && invalid.code === 'invalid_source' && invalid.rngState === 7 && invalid.state === model, 'invalid source fails before draw without mutation');
}

function encounter(model, speciesId) { model.systems.homestead.beasts.encounters.push({ id: 'encounter-1', speciesId, sourceSkillId: speciesId === 'spiritFox' ? 'herb' : speciesId === 'rockshell' ? 'mining' : speciesId === 'azureCrane' ? 'woodcutting' : 'fishing' }); model.systems.homestead.beasts.nextId = 2; return model; }
function tame(model, encounterId, traitRoll, growthRoll) { return browserWithRolls([traitRoll, growthRoll]).api.completeTame(model, encounterId, 11); }

// Taming is two-draw, atomic and persists concrete trait/growth ordering.
{
  let model = encounter(fresh(), 'spiritFox'); model.player.inventory.stacks.beastLureTalisman = 1;
  const result = tame(model, 'encounter-1', 0, 0.999);
  ok(result.ok && result.rngState === 13 && result.state.player.inventory.stacks.beastLureTalisman === undefined, 'taming consumes lure and exactly two draws');
  exact(clone(result.state.systems.homestead.beasts.roster[0]), { id: 'beast-2', speciesId: 'spiritFox', level: 1, xp: 0, traitId: 'keenNose', growthId: 'spiritual' }, 'trait/growth selection follows stable content order and shared nextId');
  ok(result.state.player.skills.beastTaming.xp === 30 && result.state.player.mastery.beastTaming.spiritFox.xp === 15 && result.state.player.xiwei === 5, 'tame grants exact progression and xiwei');
  const reloaded = Stage2State.normalize(JSON.parse(JSON.stringify(result.state)));
  exact(reloaded.systems.homestead.beasts.roster[0], clone(result.state.systems.homestead.beasts.roster[0]), 'trait and growth survive JSON roundtrip');
  const noLureModel = encounter(fresh(), 'spiritFox');
  const noLure = tame(noLureModel, 'encounter-1', 0, 0);
  ok(!noLure.ok && noLure.code === 'materials_exhausted' && noLure.rngState === 11 && noLure.state === noLureModel, 'missing lure keeps encounter and consumes zero draws');
}

// Training: one roll, level progression, shared mastery, caller-supplied
// assistant/formation XP math, and cap safety.
{
  let base = encounter(fresh(), 'spiritFox'); base.player.inventory.stacks.beastLureTalisman = 1;
  base = tame(base, 'encounter-1', 0, 0.3).state; base.player.inventory.stacks.beastFeed = 2;
  const trained = browserWithRolls([0]).api.completeTraining(base, 'beast-2', 21, { beastTrainingXpBonus: 0.10 });
  ok(trained.ok && trained.rngState === 22 && trained.state.player.inventory.stacks.beastFeed === 1, 'training consumes one feed and one draw');
  ok(trained.state.systems.homestead.beasts.roster[0].xp === 11 && trained.state.player.skills.beastTaming.xp === 40 && trained.state.player.mastery.beastTaming.spiritFox.xp === 20 && trained.state.player.xiwei === 7, 'training grants exact base XP once');
  const extraModel = clone(base); extraModel.player.mastery.beastTaming.spiritFox = { level: 99, xp: 0 };
  const extra = browserWithRolls([0]).api.completeTraining(extraModel, 'beast-2', 21, { beastTrainingXpBonus: 0.10 });
  ok(extra.ok && extra.state.systems.homestead.beasts.roster[0].xp === 21, 'extra batch adds only base 10 beast XP');
  const diligent = clone(base); diligent.systems.homestead.beasts.roster[0].traitId = 'diligent';
  const inactiveDiligent = browserWithRolls([0.9]).api.completeTraining(diligent, 'beast-2', 21, {});
  ok(inactiveDiligent.ok && inactiveDiligent.state.systems.homestead.beasts.roster[0].xp === 10, 'a diligent trainee receives no implicit self bonus');
  const assistedDiligent = browserWithRolls([0.9]).api.completeTraining(diligent, 'beast-2', 21, { beastTrainingXpBonus: 0.10 });
  ok(assistedDiligent.ok && assistedDiligent.state.systems.homestead.beasts.roster[0].xp === 11, 'the explicit active-assistant bonus applies exactly once');
  const absent = browserWithRolls([0]).api.completeTraining(fresh(), 'missing', 21, {});
  ok(!absent.ok && absent.code === 'beast_not_found' && absent.rngState === 21, 'unknown beast has zero draw');
  const foodless = clone(base); delete foodless.player.inventory.stacks.beastFeed;
  const foodlessBefore = clone(foodless); const foodlessMade = browserWithRolls([0]);
  const foodlessResult = foodlessMade.api.completeTraining(foodless, 'beast-2', 21, {});
  ok(!foodlessResult.ok && foodlessResult.code === 'materials_exhausted' &&
    foodlessResult.rngState === 21 && foodlessMade.calls() === 0 &&
    foodlessResult.state === foodless &&
    isDeepStrictEqual(foodless, foodlessBefore) &&
    isDeepStrictEqual(foodlessResult.state, foodlessBefore),
  'missing feed rolls back both input and result state with zero draws');
  const overflow = clone(base); overflow.player.skills.beastTaming.xp = Number.MAX_SAFE_INTEGER;
  const overflowResult = browserWithRolls([0]).api.completeTraining(overflow, 'beast-2', 21, {});
  ok(!overflowResult.ok && overflowResult.code === 'invalid_progression' && overflowResult.rngState === 21, 'unsafe skill XP rejects before draw');
  const capped = clone(base); capped.systems.homestead.beasts.roster[0] = { id: 'beast-2', speciesId: 'spiritFox', level: 99, xp: 0, traitId: 'keenNose', growthId: 'swift' }; capped.player.skills.beastTaming = { level: 99, xp: 0 }; capped.player.mastery.beastTaming.spiritFox = { level: 99, xp: 0 };
  const cappedResult = browserWithRolls([0]).api.completeTraining(capped, 'beast-2', 21, {});
  ok(cappedResult.ok && cappedResult.state.systems.homestead.beasts.roster[0].level === 99 && cappedResult.state.systems.homestead.beasts.roster[0].xp === 0, 'beast and progress level 99 safely cap');
}

// Active selection and scoped assistance view remain detached and frozen.
{
  const model = fresh(); model.systems.homestead.beasts.roster = [
    { id: 'beast-1', speciesId: 'spiritFox', level: 11, xp: 0, traitId: 'keenNose', growthId: 'spiritual' },
    { id: 'beast-2', speciesId: 'waterTurtle', level: 1, xp: 0, traitId: 'friendly', growthId: 'steady' }
  ];
  const set = SpiritBeasts.setActive(model, 'beast-1');
  ok(set.ok && set.state.systems.homestead.beasts.activeIds.length === 1 && set.state.mainAction === model.mainAction, 'active selection replaces one entry without consuming action');
  const switched = SpiritBeasts.setActive(set.state, 'beast-2');
  exact(switched.state.systems.homestead.beasts.activeIds, ['beast-2'], 'switch replaces active beast');
  const clear = SpiritBeasts.setActive(switched.state, null);
  exact(clear.state.systems.homestead.beasts.activeIds, [], 'null clears active assistant');
  const effect = SpiritBeasts.effects(set.state);
  ok(Object.isFrozen(effect) && Object.isFrozen(effect.gathering) && effect.gathering.bySkill.herb.gatheringExtraYieldChance === 0.05775 && effect.gathering.global.gatheringExtraYieldChance === 0.02, 'species effect stays skill scoped while trait effect is global and spiritual/level multiplier applies');
  ok(effect.breakthroughChance === undefined, 'effects never exposes breakthrough modifiers');
  const malformed = clone(set.state); malformed.systems.homestead.beasts.activeIds = ['beast-1', 'beast-2'];
  exact(SpiritBeasts.effects(malformed), effect, 'only first valid active beast contributes');
  const view = SpiritBeasts.query(set.state);
  ok(Object.isFrozen(view) && Object.isFrozen(view.roster) && Object.isFrozen(view.roster[0]) && Object.isFrozen(view.effects), 'query is deeply frozen');
  model.systems.homestead.beasts.roster[0].level = 99;
  ok(view.roster[0].level === 11, 'query detaches from later mutations');
}

// Review regressions: canonical xiwei, one-pass beast levelling, exact effects,
// and invalid random outputs. Each case exercises the public module behavior.
{
  const cross = fresh();
  cross.systems.homestead.beasts.roster = [{ id: 'beast-1', speciesId: 'spiritFox', level: 1, xp: 29, traitId: 'keenNose', growthId: 'steady' }];
  cross.player.inventory.stacks.beastFeed = 1;
  const levelled = browserWithRolls([0.99]).api.completeTraining(cross, 'beast-1', 31, {});
  ok(levelled.ok && levelled.state.systems.homestead.beasts.roster[0].level === 2 && levelled.state.systems.homestead.beasts.roster[0].xp === 9, 'training applies one gain once across a level threshold');

  const xiwei = encounter(fresh(), 'spiritFox'); xiwei.player.inventory.stacks.beastLureTalisman = 1; xiwei.player.xiwei = 7;
  const tamed = tame(xiwei, 'encounter-1', 0, 0);
  ok(tamed.ok && tamed.state.player.xiwei === 12 && tamed.state.player.cultivation === undefined, 'taming commits canonical xiwei without a shadow cultivation field');

  const deft = fresh(); deft.systems.homestead.beasts.roster = [{ id: 'beast-1', speciesId: 'spiritFox', level: 1, xp: 0, traitId: 'deftPaws', growthId: 'steady' }]; deft.systems.homestead.beasts.activeIds = ['beast-1'];
  ok(SpiritBeasts.effects(deft).production.global.materialRetentionChance === 0.02 && SpiritBeasts.effects(deft).gathering.global.materialRetentionChance === undefined, 'deft paws is a production retention trait, not gathering');

  const exactScale = fresh(); exactScale.systems.homestead.beasts.roster = [{ id: 'beast-1', speciesId: 'spiritFox', level: 2, xp: 0, traitId: 'keenNose', growthId: 'steady' }]; exactScale.systems.homestead.beasts.activeIds = ['beast-1'];
  ok(SpiritBeasts.effects(exactScale).gathering.bySkill.herb.gatheringExtraYieldChance === 0.05025, 'effects preserve exact level multiplier without display rounding');

  [-1, 1, Infinity, NaN].forEach((roll) => {
    const input = fresh(); const before = clone(input); const made = browserWithRolls([roll]);
    const invalid = made.api.tryEncounter(input, 'herb', 7);
    ok(!invalid.ok && invalid.code === 'invalid_rng' && invalid.rngState === 7 &&
      made.calls() === 1 && invalid.state === input &&
      isDeepStrictEqual(input, before) && isDeepStrictEqual(invalid.state, before),
    'out-of-range random value invokes one draw without committing it: ' + String(roll));
  });
}

// Defensive public inputs and full effect catalogue regressions.
{
  const owned = fresh(); owned.systems.homestead.beasts.roster = [{ id: 'beast-1', speciesId: 'spiritFox', level: 1, xp: 0, traitId: 'keenNose', growthId: 'steady' }];
  const duplicate = browserWithRolls([0]).api.tryEncounter(owned, 'herb', 7);
  ok(!duplicate.ok && duplicate.code === 'already_owned' && duplicate.rngState === 7, 'owned species blocks duplicate encounter before RNG');
  const overflow = encounter(fresh(), 'spiritFox'); overflow.player.inventory.stacks.beastLureTalisman = 1; overflow.player.xiwei = Number.MAX_SAFE_INTEGER;
  const overflowResult = tame(overflow, 'encounter-1', 0, 0);
  ok(!overflowResult.ok && overflowResult.code === 'invalid_progression' && overflowResult.rngState === 11 && overflowResult.state === overflow, 'xiwei overflow fails before two tame draws');
  const bound = encounter(fresh(), 'spiritFox'); bound.player.inventory.stacks.beastLureTalisman = 1; bound.player.inventory.bindings.beastLureTalisman = { equipment: 1, task: 0, formation: 0 };
  const boundResult = tame(bound, 'encounter-1', 0, 0);
  ok(!boundResult.ok && boundResult.code === 'item_bound' && boundResult.rngState === 13 && boundResult.state === bound, 'post-draw inventory rejection preserves its stable code and rolls back tame');
  const domains = { keenNose: 'gathering', diligent: 'beastTraining', deftPaws: 'production', friendly: 'social' };
  Object.keys(domains).forEach((traitId) => { const model = fresh(); model.systems.homestead.beasts.roster = [{ id: 'beast-1', speciesId: 'spiritFox', level: 1, xp: 0, traitId, growthId: 'steady' }]; model.systems.homestead.beasts.activeIds = ['beast-1']; ok(SpiritBeasts.effects(model)[domains[traitId]].global[Object.keys(require('../content/homestead.js').TRAITS[traitId].effect)[0]] !== undefined, 'trait maps to declared domain: ' + traitId); });
  ['spiritFox', 'rockshell', 'azureCrane', 'waterTurtle'].forEach((speciesId) => { const model = fresh(); model.systems.homestead.beasts.roster = [{ id: 'beast-1', speciesId, level: 1, xp: 0, traitId: 'keenNose', growthId: 'spiritual' }]; model.systems.homestead.beasts.activeIds = ['beast-1']; const view = SpiritBeasts.effects(model); ok(Object.isFrozen(view) && Object.isFrozen(view.gathering.global) && Object.isFrozen(view.production.bySkill), 'all effect domains are deeply frozen: ' + speciesId); });
  const hostile = fresh(); Object.defineProperty(hostile, 'player', { enumerable: true, get() { throw new Error('getter'); } });
  const hostileResult = SpiritBeasts.tryEncounter(hostile, 'herb', 7);
  ok(!hostileResult.ok && hostileResult.code === 'invalid_model', 'hostile getter model is never invoked');
}

// Review finding #6: species mastery is a shared pool, never per-beast state.
{
  const model = fresh();
  model.systems.homestead.beasts.roster = [
    { id: 'beast-1', speciesId: 'spiritFox', level: 1, xp: 0, traitId: 'keenNose', growthId: 'steady' },
    { id: 'beast-2', speciesId: 'spiritFox', level: 1, xp: 0, traitId: 'friendly', growthId: 'swift' }
  ];
  model.player.inventory.stacks.beastFeed = 2;
  const first = browserWithRolls([0.99]).api.completeTraining(model, 'beast-1', 51, {});
  const second = browserWithRolls([0.99]).api.completeTraining(first.state, 'beast-2', 52, {});
  ok(first.ok && second.ok &&
    first.state.player.mastery.beastTaming.spiritFox.xp === 5 &&
    second.state.player.mastery.beastTaming.spiritFox.xp === 10,
  'two beasts of one species continue one shared mastery record');
}

// Exact species and trait effect topology, including all frozen dynamic leaves.
{
  const cases = [
    ['spiritFox', 'herb', 'gathering', 'gatheringExtraYieldChance', 0.05],
    ['rockshell', 'mining', 'gathering', 'gatheringExtraYieldChance', 0.05],
    ['azureCrane', 'woodcutting', 'gathering', 'gatheringDurationReduction', 0.05],
    ['waterTurtle', 'fishing', 'fishing', 'fishRecoveryReduction', 0.10]
  ];
  cases.forEach(([speciesId, skillId, domain, key, value]) => {
    const model = fresh(); model.systems.homestead.beasts.roster = [{ id: 'beast-1', speciesId, level: 1, xp: 0, traitId: 'keenNose', growthId: 'steady' }]; model.systems.homestead.beasts.activeIds = ['beast-1'];
    const effect = SpiritBeasts.effects(model);
    exact(Object.keys(effect), ['gathering', 'fishing', 'production', 'beastTraining', 'social'], 'effect has exactly five stable domains: ' + speciesId);
    Object.keys(effect).forEach((name) => exact(Object.keys(effect[name]), ['global', 'bySkill'], 'domain shape is stable: ' + speciesId + '/' + name));
    ok(effect[domain].bySkill[skillId][key] === value && Object.isFrozen(effect[domain].bySkill[skillId]), 'species assistance is exact and frozen: ' + speciesId);
  });
}

// Fail closed for hostile public state without triggering a Proxy trap or mutating input.
{
  let trapCalls = 0;
  const proxy = new Proxy({}, { getPrototypeOf() { trapCalls++; throw new Error('trap'); } });
  const result = SpiritBeasts.query(proxy);
  ok(trapCalls === 0 && Object.isFrozen(result) && result.roster.length === 0, 'detected proxy query fails closed without traps');
  const sparse = fresh(); sparse.systems.homestead.beasts.roster = new Array(1);
  const sparseResult = SpiritBeasts.completeTraining(sparse, 'beast-1', 7, {});
  ok(!sparseResult.ok && sparseResult.state === sparse && !(0 in sparse.systems.homestead.beasts.roster), 'sparse roster fails closed and retains input');
  const symbol = fresh(); Object.defineProperty(symbol, Symbol('bad'), { value: 1, enumerable: true });
  ok(!SpiritBeasts.tryEncounter(symbol, 'herb', 7).ok, 'symbol-bearing model fails closed');
  const cycle = fresh(); cycle.loop = cycle;
  ok(!SpiritBeasts.tryEncounter(cycle, 'herb', 7).ok, 'cyclic model fails closed');
}

function browserWithRolls(values) {
  const source = fs.readFileSync('./core/spirit-beasts.js', 'utf8');
  const random = rolls(values);
  const BaseInventory = require('../core/inventory.js');
  const sandbox = { HomesteadContent: clone(require('../content/homestead.js')), Inventory: { apply(inventory, delta) { const hostDelta = {}; Object.keys(delta).forEach((key) => { hostDelta[key] = delta[key]; }); return BaseInventory.apply(inventory, hostDelta); } }, SkillProgression: require('../core/skill-progression.js'), GameRandom: random };
  sandbox.globalThis = sandbox; vm.createContext(sandbox); vm.runInContext(source, sandbox, { filename: 'core/spirit-beasts.js' });
  return { api: sandbox.SpiritBeasts, calls: random.calls };
}

function controlledBeasts(options) {
  options = options || {};
  const source = fs.readFileSync('./core/spirit-beasts.js', 'utf8');
  const BaseInventory = require('../core/inventory.js'); const BaseProgression = require('../core/skill-progression.js');
  const calls = { random: 0, inventory: 0, skill: 0, mastery: 0, chance: 0 };
  const randomSequence = Array.isArray(options.randomSequence)
    ? options.randomSequence.slice()
    : null;
  const random = {};
  if (!options.randomMissing) random.next = function (seed) {
    const index = calls.random++;
    if (options.randomThrow) throw new Error('random');
    if (options.randomMalformed) return { seed: seed + 1, value: 1 };
    const value = randomSequence && index < randomSequence.length
      ? randomSequence[index]
      : options.roll == null ? 0 : options.roll;
    return { seed: seed + 1, value };
  };
  const inventory = {};
  if (!options.inventoryMissing) inventory.apply = function (input, delta) { calls.inventory++; if (options.inventoryThrow) throw new Error('inventory'); if (options.inventoryMalformed) return { ok: true }; const hostDelta = {}; Object.keys(delta).forEach((key) => { hostDelta[key] = delta[key]; }); return BaseInventory.apply(input, hostDelta); };
  const progression = {};
  if (!options.skillMissing) progression.addSkillXp = function (p, amount) { calls.skill++; if (options.skillThrow) throw new Error('skill'); if (options.skillMalformed) return {}; return BaseProgression.addSkillXp(p, amount); };
  if (!options.masteryMissing) progression.addMasteryXp = function (p, amount) { calls.mastery++; if (options.masteryThrow) throw new Error('mastery'); if (options.masteryMalformed) return {}; return BaseProgression.addMasteryXp(p, amount); };
  if (!options.chanceMissing) progression.masteryYieldOrRetentionChance = function (level) { calls.chance++; if (options.chanceThrow) throw new Error('chance'); if (options.chanceMalformed) return 2; return BaseProgression.masteryYieldOrRetentionChance(level); };
  const content = clone(require('../content/homestead.js'));
  const dependencies = { content, inventory, progression, random };
  const sandbox = { HomesteadContent: content, Inventory: inventory, SkillProgression: progression, GameRandom: random };
  sandbox.globalThis = sandbox; vm.createContext(sandbox); vm.runInContext(source, sandbox, { filename: 'core/spirit-beasts.js' });
  return { api: sandbox.SpiritBeasts, calls, dependencies, sandbox };
}

// Calling a missing random method consumes no draw. Throwing or malformed
// methods are invoked once, but cannot commit either their returned seed or state.
{
  [
    [{ randomMissing: true }, 0, 'missing random method performs zero calls'],
    [{ randomThrow: true }, 1, 'throwing random method is called but commits no draw'],
    [{ randomMalformed: true }, 1, 'malformed random result is called but commits no draw']
  ].forEach(([options, expectedCalls, label]) => {
    const input = fresh(); const before = clone(input); const made = controlledBeasts(options);
    const result = made.api.tryEncounter(input, 'herb', 7);
    ok(!result.ok && result.code === 'invalid_rng' && result.rngState === 7 &&
      made.calls.random === expectedCalls && result.state === input &&
      isDeepStrictEqual(input, before) && isDeepStrictEqual(result.state, before),
    label + ' and rolls back both state views');
  });
}

// Maximum legal caller bonus gain is 25, so unsafe state fails before RNG.
{
  const model = fresh(); model.systems.homestead.beasts.roster = [{ id: 'beast-1', speciesId: 'spiritFox', level: 1, xp: Number.MAX_SAFE_INTEGER - 24, traitId: 'diligent', growthId: 'steady' }]; model.player.inventory.stacks.beastFeed = 1;
  const before = clone(model); const made = controlledBeasts({ randomSequence: [0] });
  const rejected = made.api.completeTraining(model, 'beast-1', 21, { beastTrainingXpBonus: 0.50 });
  ok(!rejected.ok && rejected.code === 'invalid_progression' &&
    rejected.rngState === 21 && made.calls.random === 0 &&
    made.calls.inventory === 0 && rejected.state === model &&
    isDeepStrictEqual(model, before) && isDeepStrictEqual(rejected.state, before),
  'max potential 25 XP rejects before side effects and rolls back both state views');

  const xiwei = clone(model); xiwei.systems.homestead.beasts.roster[0].xp = 0;
  xiwei.player.xiwei = Number.MAX_SAFE_INTEGER; const xiweiBefore = clone(xiwei);
  const xiweiMade = controlledBeasts({ randomSequence: [0] });
  const xiweiRejected = xiweiMade.api.completeTraining(xiwei, 'beast-1', 21, {});
  ok(!xiweiRejected.ok && xiweiRejected.code === 'invalid_progression' &&
    xiweiRejected.rngState === 21 && xiweiMade.calls.random === 0 &&
    xiweiMade.calls.inventory === 0 && xiweiRejected.state === xiwei &&
    isDeepStrictEqual(xiwei, xiweiBefore) &&
    isDeepStrictEqual(xiweiRejected.state, xiweiBefore),
  'training xiwei overflow rejects before side effects and rolls back both state views');
}

// Every injected UMD failure branch is exercised with serialized RNG accounting.
{
  function tameInput() { const value = encounter(fresh(), 'spiritFox'); value.player.inventory.stacks.beastLureTalisman = 1; return value; }
  function trainInput() { const value = fresh(); value.systems.homestead.beasts.roster = [{ id: 'beast-1', speciesId: 'spiritFox', level: 1, xp: 0, traitId: 'keenNose', growthId: 'steady' }]; value.player.inventory.stacks.beastFeed = 1; return value; }
  function tameFailure(options, label, expectedSeed, expectedCalls) {
    const input = tameInput(); const before = clone(input); const made = controlledBeasts(options); let result;
    try { result = made.api.completeTame(input, 'encounter-1', 41); } catch (error) { result = null; }
    ok(result && !result.ok && result.rngState === expectedSeed &&
      result.state === input && isDeepStrictEqual(input, before) &&
      isDeepStrictEqual(result.state, before) &&
      isDeepStrictEqual(made.calls, expectedCalls) &&
      made.calls.random === expectedCalls.random,
    label);
  }
  function trainFailure(options, label, expectedSeed, expectedCalls) {
    const input = trainInput(); const before = clone(input); const made = controlledBeasts(options); let result;
    try { result = made.api.completeTraining(input, 'beast-1', 41, {}); } catch (error) { result = null; }
    ok(result && !result.ok && result.rngState === expectedSeed &&
      result.state === input && isDeepStrictEqual(input, before) &&
      isDeepStrictEqual(result.state, before) &&
      isDeepStrictEqual(made.calls, expectedCalls) &&
      made.calls.random === expectedCalls.random,
    label);
  }
  tameFailure(
    { inventoryMissing: true },
    'missing Inventory.apply fails before tame draws and rolls back both state views',
    41, { random: 0, inventory: 0, skill: 0, mastery: 0, chance: 0 }
  );
  [
    [{ inventoryThrow: true }, { random: 2, inventory: 1, skill: 0, mastery: 0, chance: 0 }],
    [{ inventoryMalformed: true }, { random: 2, inventory: 1, skill: 0, mastery: 0, chance: 0 }],
    [{ skillMissing: true }, { random: 2, inventory: 1, skill: 0, mastery: 1, chance: 0 }],
    [{ skillThrow: true }, { random: 2, inventory: 1, skill: 1, mastery: 1, chance: 0 }],
    [{ skillMalformed: true }, { random: 2, inventory: 1, skill: 1, mastery: 1, chance: 0 }],
    [{ masteryMissing: true }, { random: 2, inventory: 1, skill: 1, mastery: 0, chance: 0 }],
    [{ masteryThrow: true }, { random: 2, inventory: 1, skill: 1, mastery: 1, chance: 0 }],
    [{ masteryMalformed: true }, { random: 2, inventory: 1, skill: 1, mastery: 1, chance: 0 }]
  ].forEach(([options, expectedCalls]) => tameFailure(
    options,
    'tame dependency branch returns its second valid seed after exactly two draws: ' + Object.keys(options)[0],
    43, expectedCalls
  ));
  trainFailure(
    { inventoryMissing: true },
    'missing Inventory.apply is a zero-draw training preflight failure',
    41, { random: 0, inventory: 0, skill: 0, mastery: 0, chance: 0 }
  );
  trainFailure(
    { chanceMissing: true },
    'missing mastery chance is a zero-draw training preflight failure',
    41, { random: 0, inventory: 0, skill: 0, mastery: 0, chance: 0 }
  );
  [
    [{ inventoryThrow: true }, { random: 1, inventory: 1, skill: 0, mastery: 0, chance: 0 }],
    [{ inventoryMalformed: true }, { random: 1, inventory: 1, skill: 0, mastery: 0, chance: 0 }],
    [{ skillMissing: true }, { random: 1, inventory: 1, skill: 0, mastery: 1, chance: 1 }],
    [{ skillThrow: true }, { random: 1, inventory: 1, skill: 1, mastery: 1, chance: 1 }],
    [{ skillMalformed: true }, { random: 1, inventory: 1, skill: 1, mastery: 1, chance: 1 }],
    [{ masteryMissing: true }, { random: 1, inventory: 1, skill: 1, mastery: 0, chance: 1 }],
    [{ masteryThrow: true }, { random: 1, inventory: 1, skill: 1, mastery: 1, chance: 1 }],
    [{ masteryMalformed: true }, { random: 1, inventory: 1, skill: 1, mastery: 1, chance: 1 }],
    [{ chanceThrow: true }, { random: 1, inventory: 1, skill: 0, mastery: 0, chance: 1 }],
    [{ chanceMalformed: true }, { random: 1, inventory: 1, skill: 0, mastery: 0, chance: 1 }]
  ].forEach(([options, expectedCalls]) => trainFailure(
    options,
    'training dependency branch returns its valid seed after exactly one draw: ' + Object.keys(options)[0],
    42, expectedCalls
  ));
  const noFeed = trainInput(); delete noFeed.player.inventory.stacks.beastFeed; const noFeedBefore = clone(noFeed); const noFeedMade = controlledBeasts({}); const noFeedResult = noFeedMade.api.completeTraining(noFeed, 'beast-1', 41, {});
  ok(!noFeedResult.ok && noFeedResult.code === 'materials_exhausted' &&
    noFeedMade.calls.random === 0 && noFeedResult.rngState === 41 &&
    noFeedResult.state === noFeed && isDeepStrictEqual(noFeed, noFeedBefore) &&
    isDeepStrictEqual(noFeedResult.state, noFeedBefore),
  'material preflight consumes zero draws and rolls back both state views');
  const randomCases = [
    { sequence: [1], kind: 'tame', expectedSeed: 41, expectedCalls: 1, label: 'tame first invalid draw returns the input seed' },
    { sequence: [0, 1], kind: 'tame', expectedSeed: 42, expectedCalls: 2, label: 'tame second invalid draw returns the first valid seed' },
    { sequence: [1], kind: 'training', expectedSeed: 41, expectedCalls: 1, label: 'training invalid draw returns the input seed' }
  ];
  randomCases.forEach((entry) => {
    const input = entry.kind === 'training' ? trainInput() : tameInput();
    const before = clone(input); const made = controlledBeasts({ randomSequence: entry.sequence });
    const result = entry.kind === 'training'
      ? made.api.completeTraining(input, 'beast-1', 41, {})
      : made.api.completeTame(input, 'encounter-1', 41);
    ok(!result.ok && result.code === 'invalid_rng' &&
      made.calls.random === entry.expectedCalls &&
      result.rngState === entry.expectedSeed && result.state === input &&
      isDeepStrictEqual(input, before) && isDeepStrictEqual(result.state, before),
    entry.label + ' and rolls back both state views');
  });
}

// The UMD factory snapshots host-realm dependency functions and mutable content
// deeply at load time. Replacing every sandbox method and corrupting all three
// content registries afterwards cannot redirect tame, training, effects, or query.
{
  const made = controlledBeasts({ randomSequence: [0, 0.999, 0.99] });
  ok(made.dependencies.content === made.sandbox.HomesteadContent &&
    made.dependencies.inventory === made.sandbox.Inventory &&
    made.dependencies.progression === made.sandbox.SkillProgression &&
    made.dependencies.random === made.sandbox.GameRandom,
  'controlled builder exposes the original mutable host-realm dependency objects');
  const lateCalls = { random: 0, inventory: 0, skill: 0, mastery: 0, chance: 0 };
  made.sandbox.Inventory.apply = function () { lateCalls.inventory++; throw new Error('late inventory'); };
  made.sandbox.SkillProgression.addSkillXp = function () { lateCalls.skill++; throw new Error('late skill'); };
  made.sandbox.SkillProgression.addMasteryXp = function () { lateCalls.mastery++; throw new Error('late mastery'); };
  made.sandbox.SkillProgression.masteryYieldOrRetentionChance = function () { lateCalls.chance++; throw new Error('late chance'); };
  made.sandbox.GameRandom.next = function () { lateCalls.random++; throw new Error('late random'); };
  const mutableContent = made.dependencies.content;
  mutableContent.BEASTS.spiritFox.sourceSkillId = 'broken-source';
  mutableContent.BEASTS.spiritFox.assistance.key = 'brokenSpeciesEffect';
  mutableContent.BEASTS.spiritFox.assistance.skillId = 'broken-skill';
  mutableContent.BEASTS.spiritFox.assistance.value = 9;
  mutableContent.TRAITS.keenNose.id = 'broken-trait';
  mutableContent.TRAITS.keenNose.effect.gatheringExtraYieldChance = 8;
  mutableContent.GROWTH_TENDENCIES.spiritual.id = 'broken-growth';
  mutableContent.GROWTH_TENDENCIES.spiritual.assistanceMultiplier = 7;

  const input = encounter(fresh(), 'spiritFox');
  input.player.inventory.stacks.beastLureTalisman = 1;
  const tamed = made.api.completeTame(input, 'encounter-1', 61);
  ok(tamed.ok && tamed.code === 'ok' && tamed.rngState === 63 &&
    tamed.state.player.inventory.stacks.beastLureTalisman === undefined &&
    tamed.state.player.skills.beastTaming.xp === 30 &&
    tamed.state.player.mastery.beastTaming.spiritFox.xp === 15 &&
    tamed.state.player.xiwei === 5,
  'tame uses the snapshotted inventory, progression, random, trait, and growth dependencies');
  exact(clone(tamed.state.systems.homestead.beasts.roster[0]), {
    id: 'beast-2', speciesId: 'spiritFox', level: 1, xp: 0,
    traitId: 'keenNose', growthId: 'spiritual'
  }, 'tame preserves the original snapshotted content ordering');
  exact(clone(tamed.gains), {
    skillXp: { beastTaming: 30 },
    masteryXp: { 'beastTaming:spiritFox': 15 },
    cultivation: 5
  }, 'tame returns the formal gains from the original dependency functions');
  exact(made.calls, { random: 2, inventory: 1, skill: 1, mastery: 1, chance: 0 },
    'tame increments only the original host-realm dependency counters');

  tamed.state.player.inventory.stacks.beastFeed = 1;
  const trained = made.api.completeTraining(tamed.state, 'beast-2', tamed.rngState, {});
  ok(trained.ok && trained.code === 'ok' && trained.rngState === 64 &&
    trained.state.systems.homestead.beasts.roster[0].xp === 10 &&
    trained.state.player.inventory.stacks.beastFeed === undefined &&
    trained.state.player.skills.beastTaming.xp === 40 &&
    trained.state.player.mastery.beastTaming.spiritFox.xp === 20 &&
    trained.state.player.xiwei === 7,
  'training uses the snapshotted inventory, progression, chance, and random functions');
  exact(clone(trained.gains), {
    beastXp: 10,
    skillXp: { beastTaming: 10 },
    masteryXp: { 'beastTaming:spiritFox': 5 },
    cultivation: 2
  }, 'training returns the formal result from the original dependency functions');
  exact(made.calls, { random: 3, inventory: 2, skill: 2, mastery: 2, chance: 1 },
    'training increments only the original host-realm dependency counters');
  exact(lateCalls, { random: 0, inventory: 0, skill: 0, mastery: 0, chance: 0 },
    'post-load replacement dependency methods are never invoked');

  const active = made.api.setActive(trained.state, 'beast-2');
  const effect = made.api.effects(active.state); const view = made.api.query(active.state);
  ok(active.ok &&
    effect.gathering.bySkill.herb.gatheringExtraYieldChance === 0.055 &&
    effect.gathering.global.gatheringExtraYieldChance === 0.02 &&
    effect.gathering.bySkill['broken-skill'] === undefined,
  'effects uses the original beast, trait, and spiritual-growth snapshot');
  exact(clone(view.roster[0]), {
    id: 'beast-2', speciesId: 'spiritFox', level: 1, xp: 10,
    traitId: 'keenNose', growthId: 'spiritual'
  }, 'query keeps the original content-backed beast valid after registry corruption');
  exact(clone(view.effects), clone(effect),
    'query returns the same original-content effect result as effects');
}

const source = fs.readFileSync('./core/spirit-beasts.js', 'utf8');
[['Math.random', /\bMath\.random\s*\(/], ['DOM', /\bdocument\b/], ['timer', /\bset(?:Timeout|Interval)\s*\(/]].forEach(([label, pattern]) => ok(!pattern.test(source), 'module has no ' + label));
console.log(`\n=== Stage 2 灵兽自测：${pass} 通过 / ${fail} 失败 ===`);
if (fail) process.exit(1);
