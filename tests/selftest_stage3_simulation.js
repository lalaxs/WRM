'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

const CombatContent = require('../content/combat.js');
const GatheringContent = require('../content/gathering.js');
const HomesteadContent = require('../content/homestead.js');
const RecipeContent = require('../content/recipes.js');
const Farm = require('../core/farm.js');
const Formations = require('../core/formations.js');
const GameRandom = require('../core/random.js');
const GameRules = require('../core/game-rules.js');
const Gathering = require('../core/gathering.js');
const Inventory = require('../core/inventory.js');
const Production = require('../core/production.js');
const Simulation = require('../core/simulation.js');
const SimulationReport = require('../core/simulation-report.js');
const SkillProgression = require('../core/skill-progression.js');
const SpiritBeasts = require('../core/spirit-beasts.js');
const Stage2Rules = require('../core/stage2-rules.js');
const StateModel = require('../core/state-model.js');
const Stage3State = require('../core/stage3-state.js');
const Techniques = require('../core/techniques.js');
const CombatEngine = require('../core/combat-engine.js');
const CombatProgress = require('../core/combat-progress.js');
const Stage3Rules = require('../core/stage3-rules.js');

let passed = 0;
let failed = 0;

function ok(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error('  ✗ FAIL: ' + message);
  }
}

function equal(actual, expected, message) {
  try {
    assert.deepStrictEqual(actual, expected);
    passed++;
  } catch (error) {
    failed++;
    console.error('  ✗ FAIL: ' + message);
    console.error('    actual:   ' + JSON.stringify(actual));
    console.error('    expected: ' + JSON.stringify(expected));
  }
}

function json(value) {
  return JSON.parse(JSON.stringify(value));
}

function bytes(value) {
  return JSON.stringify(value);
}

function gameRulesConfig() {
  return {
    actions: {
      legacyMeditate: {
        skill: 'legacyMeditation',
        time: 1,
        xp: 1,
        cost: {},
        effects: {
          stacks: {},
          cultivation: 1,
          jingqi: 0
        }
      }
    },
    gatheringData: {},
    gatherSkillKey: {},
    discoverableEntries: function () { return []; },
    skillXpNeed: function () { return 100; },
    masteryXpNeed: function () { return 100; },
    masteryDoubleChance: function () { return 0; },
    effectiveGatherTime: function () { return 1; },
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
}

function runtimeDeps(overrides) {
  return Object.assign({
    Stage2Rules: Stage2Rules,
    GameRules: GameRules,
    gameRulesConfig: gameRulesConfig(),
    Gathering: Gathering,
    Production: Production,
    Farm: Farm,
    Formations: Formations,
    SpiritBeasts: SpiritBeasts,
    GatheringContent: GatheringContent,
    RecipeContent: RecipeContent,
    HomesteadContent: HomesteadContent,
    Inventory: Inventory,
    SkillProgression: SkillProgression,
    GameRandom: GameRandom,
    CombatEngine: CombatEngine,
    CombatProgress: CombatProgress,
    Techniques: Techniques
  }, overrides || {});
}

function freshModel(seed) {
  const model = StateModel.normalize(Stage3State.defaults(), 0);
  model.current = null;
  model.rngState = seed == null ? 1 : seed;
  model.player.shouMax = 1000000;
  model.player.shouyuan = 1000000;
  model.player.lifespanAnchorMs = null;
  model.player.lifespanBaseYears = null;
  return model;
}

function freshRuntimeModel(seed) {
  const model = StateModel.fromRuntime(freshModel(seed), 0);
  model.current = null;
  model.rngState = seed == null ? 1 : seed;
  model.player.shouMax = 1000000;
  model.player.shouyuan = 1000000;
  model.player.lifespanAnchorMs = null;
  model.player.lifespanBaseYears = null;
  return model;
}

function advance(runtime, state, seconds, options) {
  const config = options || {};
  return Simulation.advance(state, seconds, {
    source: config.source || 'online',
    fromMs: config.fromMs == null ? 0 : config.fromMs,
    mainActionLimitSeconds:
      config.limit == null ? null : config.limit,
    rules: runtime.rules,
    lanes: config.lanes == null ? runtime.lanes : config.lanes
  });
}

function start(runtime, state, key, nowMs) {
  return runtime.rules.start(state, key, nowMs == null ? 0 : nowMs);
}

function combatSession(state) {
  return state.systems.combat.session;
}

function makeEndlessRegion(runtime, seed) {
  const started = start(
    runtime,
    freshModel(seed),
    'combat:region:qingyunOutskirts:thornHare',
    0
  );
  assert.strictEqual(started.ok, true);
  const state = json(started.state);
  const session = combatSession(state);
  session.player.hp = 1000000000000;
  session.player.maxHp = 1000000000000;
  session.player.attack = 1;
  session.enemy.hp = 1000000000000;
  session.enemy.maxHp = 1000000000000;
  session.enemy.attack = 1;
  return state;
}

function makeFastCombatState(seed) {
  const key = 'combat:region:qingyunOutskirts:thornHare';
  const state = json(start(runtime, freshModel(seed), key, 0).state);
  const session = combatSession(state);
  session.player.hp = 1000000000000;
  session.player.maxHp = 1000000000000;
  session.player.attack = 1;
  session.player.cooldownTicks = Number.MAX_SAFE_INTEGER;
  session.enemy.hp = 1000000000000;
  session.enemy.maxHp = 1000000000000;
  session.enemy.attack = 1;
  session.enemy.cooldownTicks = Number.MAX_SAFE_INTEGER;
  return state;
}

function normalizeSummary(reports) {
  const summary = json(SimulationReport.summarize(reports));
  summary.reportIds = [];
  summary.action.stops.forEach(function (stop) {
    stop.reportId = '';
    stop.atMs = null;
  });
  return summary;
}

function chunked(
  runtime,
  initial,
  totalSeconds,
  chunks,
  seedFromMs,
  lanes
) {
  let state = initial;
  let remaining = totalSeconds;
  let fromMs = seedFromMs || 0;
  let index = 0;
  const reports = [];
  while (remaining > 0) {
    const seconds = Math.min(chunks[index % chunks.length], remaining);
    const out = advance(runtime, state, seconds, {
      source: 'online',
      fromMs: fromMs,
      lanes: lanes
    });
    state = out.state;
    reports.push(out.report);
    fromMs += seconds * 1000;
    remaining -= seconds;
    index++;
  }
  return { state: state, reports: reports };
}

const runtime = Stage3Rules.create(runtimeDeps());
const fastCombatEngine = Object.freeze({
  createSession: CombatEngine.createSession,
  advanceTick: CombatEngine.advanceTick
});
const fastRuntime = Stage3Rules.create(runtimeDeps({
  CombatEngine: fastCombatEngine
}));

{
  function hostileLane(id) {
    return Object.freeze({
      id: id,
      nextBoundary: function () { return 1; },
      elapse: function (state) {
        state.rngState = (state.rngState + 1) >>> 0;
        state.player.lingshi += 1000;
      },
      resolve: function () {}
    });
  }

  const injectedProgress = Object.assign({}, CombatProgress, {
    injuryRecoveryLane: hostileLane('stage3-injury-recovery')
  });
  const guardedInjuryRuntime = Stage3Rules.create(runtimeDeps({
    CombatProgress: injectedProgress
  }));
  const injuryInput = freshModel(211);
  const injuryResult = advance(guardedInjuryRuntime, injuryInput, 1);
  ok(
    injuryResult.state.rngState === injuryInput.rngState &&
      injuryResult.state.player.lingshi === injuryInput.player.lingshi &&
      guardedInjuryRuntime.lanes[
        guardedInjuryRuntime.lanes.length - 1
      ] === CombatProgress.injuryRecoveryLane,
    'injected injury lane cannot mutate RNG or currency'
  );

  const injectedStage2 = Object.freeze({
    create: function (deps) {
      const trusted = Stage2Rules.create(deps);
      return Object.freeze({
        rules: trusted.rules,
        lanes: Object.freeze(
          trusted.lanes.concat([hostileLane('forged-stage2-lane')])
        )
      });
    }
  });
  const guardedStage2Runtime = Stage3Rules.create(runtimeDeps({
    Stage2Rules: injectedStage2
  }));
  const stage2Input = freshModel(223);
  const stage2Result = advance(guardedStage2Runtime, stage2Input, 1);
  ok(
    stage2Result.state.rngState === stage2Input.rngState &&
      stage2Result.state.player.lingshi === stage2Input.player.lingshi &&
      !guardedStage2Runtime.lanes.some(function (lane) {
        return lane.id === 'forged-stage2-lane';
      }),
    'injected Stage2Rules.create cannot add a currency/RNG lane'
  );
}

ok(Object.isFrozen(Stage3Rules), 'Stage3Rules module API is frozen');
ok(Object.isFrozen(runtime) &&
   Object.isFrozen(runtime.rules) &&
   Object.isFrozen(runtime.lanes),
'Stage 3 runtime and public registries are frozen');
ok(Object.getPrototypeOf(runtime) === Object.prototype &&
   Object.getPrototypeOf(runtime.rules) === Object.prototype &&
   Array.isArray(runtime.lanes),
'Stage 3 runtime uses ordinary objects and an ordinary lane array');
ok(runtime.lanes.every(function (lane) {
  return Object.isFrozen(lane) &&
    Object.getPrototypeOf(lane) === Object.prototype;
}), 'every combined passive lane is a frozen ordinary object');
equal(runtime.lanes.map(function (lane) { return lane.id; }), [
  'lifespan',
  'mood',
  'parallel',
  'world',
  'stage2-fish-recovery',
  'stage2-farm-growth',
  'stage3-injury-recovery'
], 'Stage 3 extends Stage 2 passive lanes once and in order');

{
  const stage2 = start(
    runtime,
    freshModel(3),
    'gather:explore:mining',
    20
  );
  ok(stage2.ok &&
     stage2.state.current.key === 'gather:explore:mining',
  'Stage 2 action parsing and start behavior are preserved');
  const completed = advance(runtime, stage2.state, 2, {
    source: 'online',
    fromMs: 20
  });
  ok(completed.report.action.completed === 1 &&
     completed.state.current === null,
  'noncombat completion still delegates to the Stage 2 runtime');
}

{
  const old = freshModel(5);
  old.player.skills.legacyMeditation = { lv: 1, xp: 0 };
  old.current = {
    key: 'legacyMeditate',
    mode: 'repeat',
    count: 0,
    done: 7,
    elapsed: 0,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null,
    stalled: false
  };
  const before = bytes(old);
  const invalidRegion = start(
    runtime,
    old,
    'combat:region:missing:thornHare',
    100
  );
  ok(!invalidRegion.ok &&
     invalidRegion.code === 'invalid_action' &&
     bytes(invalidRegion.state) === before,
  'invalid region combat validates before replacing current');
  const invalidEnemy = start(
    runtime,
    old,
    'combat:region:qingyunOutskirts:missing',
    100
  );
  ok(!invalidEnemy.ok &&
     invalidEnemy.code === 'invalid_action' &&
     bytes(invalidEnemy.state) === before,
  'invalid region enemy validates before replacing current');
  const invalidDungeon = start(
    runtime,
    old,
    'combat:dungeon:missing',
    100
  );
  ok(!invalidDungeon.ok &&
     invalidDungeon.code === 'invalid_action' &&
     bytes(invalidDungeon.state) === before,
  'invalid dungeon combat validates before replacing current');

  const region = start(
    runtime,
    old,
    'combat:region:qingyunOutskirts:thornHare',
    100
  );
  ok(region.ok &&
     region.state.current.key ===
       'combat:region:qingyunOutskirts:thornHare' &&
     combatSession(region.state).mode === 'region',
  'valid region action installs one active combat session');
  const dungeon = start(
    runtime,
    old,
    'combat:dungeon:breathCave',
    100
  );
  ok(dungeon.ok &&
     dungeon.state.current.key === 'combat:dungeon:breathCave' &&
     combatSession(dungeon.state).mode === 'dungeon',
  'valid dungeon action installs one active combat session');
}

{
  function forgedProgress(method, mutate) {
    const injected = Object.assign({}, CombatProgress);
    injected[method] = function () {
      const args = Array.prototype.slice.call(arguments);
      const trusted = CombatProgress[method].apply(null, args);
      const forged = json(trusted);
      if (forged.ok) mutate(forged.state);
      return forged;
    };
    return Object.freeze(injected);
  }

  const regionRuntime = Stage3Rules.create(runtimeDeps({
    CombatProgress: forgedProgress('startRegion', function (state) {
      state.player.combatProgress.completedGates.forged = true;
      state.player.inventory.stacks.brokenFang = 999;
      state.rngState = 0xabcdef01;
    })
  }));
  const regionBefore = freshModel(0x13572468);
  const regionBytes = bytes(regionBefore);
  const forgedRegion = start(
    regionRuntime,
    regionBefore,
    'combat:region:qingyunOutskirts:thornHare',
    50
  );
  ok(
    forgedRegion.ok === false &&
      forgedRegion.code === 'requirements_invalid' &&
      bytes(forgedRegion.state) === regionBytes,
    'forged region starts cannot add gates, inventory, RNG, or success'
  );

  const dungeonRuntime = Stage3Rules.create(runtimeDeps({
    CombatProgress: forgedProgress('startDungeon', function (state) {
      state.player.combatProgress.firstClears.breathCave = true;
      state.player.inventory.stacks.breathJade = 999;
      state.rngState = 0x10203040;
    })
  }));
  const dungeonBefore = freshModel(0x24681357);
  const dungeonBytes = bytes(dungeonBefore);
  const forgedDungeon = start(
    dungeonRuntime,
    dungeonBefore,
    'combat:dungeon:breathCave',
    50
  );
  ok(
    forgedDungeon.ok === false &&
      forgedDungeon.code === 'requirements_invalid' &&
      bytes(forgedDungeon.state) === dungeonBytes,
    'forged dungeon starts cannot add progress, inventory, RNG, or success'
  );
}

{
  const started = start(
    runtime,
    freshModel(7),
    'combat:region:qingyunOutskirts:thornHare',
    0
  );
  const descriptor = runtime.rules.getAction(started.state);
  ok(descriptor &&
     descriptor.duration === 0.25 &&
     Object.isFrozen(descriptor),
  'combat descriptor duration is exactly 0.25 seconds');
  const beforeDone = started.state.current.done;
  const tick = advance(runtime, started.state, 0.25);
  ok(combatSession(tick.state).elapsedTicks === 1,
    'one Simulation completion delegates exactly one combat tick');
  ok(
    combatSession(tick.state).lastPlayerAction &&
      combatSession(tick.state).lastPlayerAction.id === 'normalAttack' &&
      combatSession(tick.state).lastPlayerAction.tick === 0,
    'simulation persists the player action that actually executed'
  );
  ok(tick.state.current.done === beforeDone &&
     tick.report.action.completed === 0 &&
     tick.report.combat.ticks === 1,
  'combat ticks do not increment main action done or completion');
}

{
  const started = start(
    runtime,
    freshModel(11),
    'combat:region:qingyunOutskirts:thornHare',
    0
  );
  const state = json(started.state);
  combatSession(state).enemy.hp = 1;
  combatSession(state).player.attack = 1000000;
  combatSession(state).player.accuracy = 1000000;
  combatSession(state).player.cooldownTicks = 0;
  const killed = advance(runtime, state, 0.25);
  ok(killed.report.action.completed === 1 &&
     killed.report.combat.enemiesDefeated.thornHare === 1 &&
     killed.state.player.combatProgress.regionKills.qingyunOutskirts === 1,
  'one region kill reports one completion and one progress increment');
  ok(killed.report.gains.cultivation ===
       CombatContent.ENEMIES.thornHare.cultivation,
  'region cultivation enters the shared report exactly');
  ok(
    combatSession(killed.state).enemy === null &&
      combatSession(killed.state).lastPlayerAction.id === 'normalAttack',
    'the last executed action remains available through wave intermission'
  );
}

{
  const started = start(
    runtime,
    freshModel(13),
    'combat:dungeon:breathCave',
    0
  );
  const state = json(started.state);
  const session = combatSession(state);
  session.waveIndex = 3;
  session.waveDefeated = 0;
  session.enemyId = 'breathSerpent';
  session.bossPhase = 0;
  session.intermissionTicks = 0;
  session.enemy = json(CombatEngine.createEnemy('breathSerpent', 0));
  session.enemy.hp = 1;
  session.player.attack = 1000000;
  session.player.accuracy = 1000000;
  session.player.cooldownTicks = 0;
  const cleared = advance(runtime, state, 0.25);
  ok(cleared.report.action.completed === 1 &&
     cleared.report.combat.dungeonClears.breathCave === 1 &&
     cleared.state.player.combatProgress.dungeonClears.breathCave === 1,
  'dungeon final clear reports completion exactly once');
  const internal = advance(runtime, cleared.state, 2.75, {
    fromMs: 250
  });
  ok(internal.report.action.completed === 0 &&
     Object.keys(internal.report.combat.dungeonClears).length === 0,
  'dungeon repeat/intermission ticks do not report clears');
}

{
  const model = freshModel(17);
  model.player.combat.loadouts[0].supplies.food = {
    itemId: 'grilledCarp',
    triggerRatio: 0.95,
    stopWhenEmpty: true
  };
  const started = start(
    runtime,
    model,
    'combat:region:qingyunOutskirts:thornHare',
    0
  );
  const state = json(started.state);
  combatSession(state).player.hp = 1;
  const stopped = advance(runtime, state, 0.25);
  ok(stopped.state.current === null &&
     stopped.state.systems.combat.session === null &&
     stopped.report.action.stopReason === 'supply_exhausted' &&
     stopped.report.combat.retreatReason === 'supply_exhausted',
  'missing configured supply clears combat with supply_exhausted');
}

{
  const started = start(
    runtime,
    freshModel(19),
    'combat:region:qingyunOutskirts:thornHare',
    0
  );
  const state = json(started.state);
  const session = combatSession(state);
  session.player.hp = 1;
  session.player.cooldownTicks = 5;
  session.enemy.attack = 1000000;
  session.enemy.accuracy = 1000000;
  session.enemy.cooldownTicks = 0;
  const defeated = advance(runtime, state, 0.25);
  ok(defeated.state.current === null &&
     defeated.state.systems.combat.session === null &&
     defeated.state.player.combat.injury !== null &&
     defeated.report.action.stopReason === 'injured' &&
     defeated.report.combat.retreatReason === 'player_defeated',
  'player defeat delegates applyDefeat and stops with injured');
}

{
  const model = freshRuntimeModel(157);
  const legacyRealmStage = model.player.realmStage;
  const legacyCultivation = model.player.xiwei;
  const started = start(
    runtime,
    model,
    'combat:region:qingyunOutskirts:thornHare',
    0
  );
  const state = json(started.state);
  combatSession(state).enemy.hp = 1;
  combatSession(state).player.attack = 1000000;
  combatSession(state).player.accuracy = 1000000;
  combatSession(state).player.cooldownTicks = 0;
  const killed = advance(runtime, state, 0.25);
  ok(
    killed.report.combat.enemiesDefeated.thornHare === 1 &&
    killed.state.player.realmStage === legacyRealmStage &&
    killed.state.player.xiwei === legacyCultivation +
      CombatContent.ENEMIES.thornHare.cultivation,
    'StateModel.fromRuntime region defeat preserves legacy realm fields'
  );
}

{
  const model = freshRuntimeModel(163);
  model.player.techniques.known.cloudPiercingSword = {
    level: 1,
    xp: 0
  };
  model.player.combat.loadouts[0].activeTechniques[0] = {
    techniqueId: 'cloudPiercingSword',
    condition: { type: 'always' }
  };
  const started = start(
    runtime,
    model,
    'combat:region:qingyunOutskirts:thornHare',
    0
  );
  const ticked = advance(runtime, started.state, 0.25);
  ok(
    ticked.report.action.stopReason === null &&
    ticked.report.techniques.xp.cloudPiercingSword > 0 &&
    ticked.state.player.techniques.known.cloudPiercingSword.xp > 0 &&
    Number.isSafeInteger(ticked.state.player.realmStage) &&
    Number.isFinite(ticked.state.player.xiwei),
    'StateModel.fromRuntime active-technique XP transition is accepted'
  );
}

{
  const model = freshRuntimeModel(167);
  const started = start(
    runtime,
    model,
    'combat:region:qingyunOutskirts:thornHare',
    0
  );
  const state = json(started.state);
  const session = combatSession(state);
  session.player.hp = 1;
  session.player.cooldownTicks = 5;
  session.enemy.attack = 1000000;
  session.enemy.accuracy = 1000000;
  session.enemy.cooldownTicks = 0;
  const defeated = advance(runtime, state, 0.25);
  ok(
    defeated.report.action.stopReason === 'injured' &&
    defeated.state.player.combat.injury !== null &&
    Number.isSafeInteger(defeated.state.player.realmStage) &&
    Number.isFinite(defeated.state.player.xiwei),
    'StateModel.fromRuntime player-defeat transition is accepted'
  );
}

{
  const started = start(
    runtime,
    freshRuntimeModel(173),
    'combat:dungeon:breathCave',
    0
  );
  const state = json(started.state);
  combatSession(state).enemy = null;
  combatSession(state).intermissionTicks = 1;
  const resumed = advance(runtime, state, 0.25);
  ok(
    resumed.report.action.stopReason === null &&
    resumed.report.combat.ticks === 1 &&
    resumed.state.systems.combat.session !== null &&
    Number.isSafeInteger(resumed.state.player.realmStage) &&
    Number.isFinite(resumed.state.player.xiwei),
    'StateModel.fromRuntime dungeon intermission transition is accepted'
  );
}

{
  const model = freshModel(23);
  const itemIds = Object.keys(require('../content/items.js').ITEMS);
  itemIds.filter(function (itemId) {
    return itemId !== 'brokenFang' && itemId !== 'grilledCarp';
  }).slice(0, model.player.inventory.capacity)
    .forEach(function (itemId) {
      model.player.inventory.stacks[itemId] = 1;
    });
  const started = start(
    runtime,
    model,
    'combat:region:qingyunOutskirts:thornHare',
    0
  );
  const state = json(started.state);
  combatSession(state).enemy.hp = 1;
  combatSession(state).player.attack = 1000000;
  combatSession(state).player.accuracy = 1000000;
  combatSession(state).player.cooldownTicks = 0;
  const pending = advance(runtime, state, 0.25);
  ok(pending.state.current !== null &&
     pending.state.systems.combat.session !== null &&
     pending.state.systems.combat.pendingLoot !== null &&
     pending.report.action.stopReason === null &&
     pending.report.warnings.indexOf('inventory_full') >= 0 &&
     pending.report.combat.pendingLootId ===
       pending.state.systems.combat.pendingLoot.id,
  'inventory-full pending loot keeps combat running without losing the batch');
}

{
  const model = freshModel(24);
  const itemIds = Object.keys(require('../content/items.js').ITEMS);
  itemIds.filter(function (itemId) {
    return itemId !== 'brokenFang' &&
      itemId !== 'grilledCarp' &&
      itemId !== 'breathJade';
  }).slice(0, model.player.inventory.capacity)
    .forEach(function (itemId) {
      model.player.inventory.stacks[itemId] = 1;
    });
  const started = start(
    runtime,
    model,
    'combat:dungeon:breathCave',
    0
  );
  const state = json(started.state);
  const session = combatSession(state);
  session.waveIndex = 3;
  session.waveDefeated = 0;
  session.enemyId = 'breathSerpent';
  session.bossPhase = 0;
  session.intermissionTicks = 0;
  session.enemy = json(CombatEngine.createEnemy('breathSerpent', 0));
  session.enemy.hp = 1;
  session.player.attack = 1000000;
  session.player.accuracy = 1000000;
  session.player.cooldownTicks = 0;
  const pendingClear = advance(runtime, state, 0.25);
  ok(
    pendingClear.report.action.completed === 1 &&
    pendingClear.report.combat.dungeonClears.breathCave === 1 &&
    pendingClear.report.action.stopReason === null &&
    pendingClear.state.systems.combat.session !== null &&
    pendingClear.state.systems.combat.pendingLoot !== null,
  'inventory-full final clear still reports its one dungeon completion');
}

{
  const combat = start(
    runtime,
    freshModel(29),
    'combat:region:qingyunOutskirts:thornHare',
    100
  );
  const switched = start(
    runtime,
    combat.state,
    'gather:explore:mining',
    200
  );
  ok(switched.ok &&
     switched.state.current.key === 'gather:explore:mining' &&
     switched.state.systems.combat.session === null &&
     switched.state.lastActionStop.key ===
       'combat:region:qingyunOutskirts:thornHare' &&
     switched.state.lastActionStop.reason === 'switched',
  'switching to noncombat clears the combat session with switched');
  const later = advance(runtime, switched.state, 0.25, {
    fromMs: 200
  });
  ok(later.state.systems.combat.session === null,
    'switched combat never continues in the background');

  const stage2Only = Stage2Rules.create(runtimeDeps());
  const directStage2Switch = stage2Only.rules.start(
    combat.state,
    'gather:explore:mining',
    300
  );
  ok(directStage2Switch.ok &&
     directStage2Switch.state.systems.combat.session === null &&
     directStage2Switch.state.lastActionStop.reason === 'switched',
  'Stage 2 direct switching also clears a detached combat session');
  const mismatched = json(combat.state);
  mismatched.systems.combat.session.actionKey =
    'combat:region:qingyunOutskirts:grayWolf';
  const guardedStage2Switch = stage2Only.rules.start(
    mismatched,
    'gather:explore:mining',
    301
  );
  ok(guardedStage2Switch.ok &&
     guardedStage2Switch.state.systems.combat.session === null,
  'Stage 2 switching clears even a mismatched hostile combat session');
}

{
  const report = SimulationReport.create({
    source: 'online',
    fromMs: 0,
    toMs: 250,
    requestedSeconds: 0.25,
    actionKey: 'combat:region:qingyunOutskirts:thornHare',
    seedBefore: 1
  });
  equal(report.combat, {
    ticks: 0,
    enemiesDefeated: {},
    dungeonClears: {},
    damageDealt: 0,
    damageTaken: 0,
    suppliesUsed: {},
    loot: {},
    pendingLootId: null,
    retreatReason: null
  }, 'new reports contain the canonical combat section');
  equal(report.techniques, { xp: {} },
    'new reports contain the canonical technique XP section');

  const normalized = SimulationReport.normalize({
    id: 'kept-id',
    combat: {
      ticks: 2,
      enemiesDefeated: { thornHare: 1 },
      dungeonClears: { breathCave: 1 },
      damageDealt: 7,
      damageTaken: 3,
      suppliesUsed: { grilledCarp: 1 },
      loot: { brokenFang: 2 },
      pendingLootId: 'combat-loot-7',
      retreatReason: 'inventory_full'
    },
    techniques: { xp: { cloudPiercingSword: 3 } }
  });
  ok(normalized.id === 'kept-id' &&
     normalized.combat.ticks === 2 &&
     normalized.techniques.xp.cloudPiercingSword === 3,
  'report normalization preserves IDs and Stage 3 fields');

  const other = SimulationReport.normalize({
    id: 'other-id',
    combat: {
      ticks: 4,
      enemiesDefeated: { thornHare: 2 },
      dungeonClears: {},
      damageDealt: 5,
      damageTaken: 6,
      suppliesUsed: { grilledCarp: 2 },
      loot: { brokenFang: 1 },
      pendingLootId: null,
      retreatReason: null
    },
    techniques: { xp: { cloudPiercingSword: 4 } },
    passive: { injuryRecovered: true }
  });
  const summary = SimulationReport.summarize([normalized, other]);
  equal(summary.reportIds, ['kept-id', 'other-id'],
    'summary preserves deterministic report ID order');
  ok(summary.combat.ticks === 6 &&
     summary.combat.enemiesDefeated.thornHare === 3 &&
     summary.combat.damageDealt === 12 &&
     summary.combat.suppliesUsed.grilledCarp === 3 &&
     summary.combat.loot.brokenFang === 3 &&
     summary.techniques.xp.cloudPiercingSword === 7 &&
     summary.passive.injuryRecovered === true,
  'summary merges Stage 3 maps, totals, and Task 9 injury flag safely');
  ok(Object.isFrozen(summary.combat) &&
     Object.isFrozen(summary.techniques.xp),
  'summarized Stage 3 report data is deeply frozen');
}

{
  const initial = makeEndlessRegion(runtime, 31);
  const online = chunked(runtime, initial, 120, [0.25], 1000);
  const offline = advance(runtime, initial, 120, {
    source: 'offline',
    fromMs: 1000,
    limit: 43200
  });
  equal(bytes(online.state), bytes(offline.state),
    '120 seconds in 480 ticks equals one offline batch byte-for-byte');
  equal(
    normalizeSummary(online.reports),
    normalizeSummary([offline.report]),
    '120-second online/offline report totals are identical'
  );
}

{
  const initial = makeFastCombatState(37);
  const online = chunked(
    fastRuntime,
    initial,
    60,
    [0.25, 1.75, 17, 60],
    5000,
    []
  );
  const offline = advance(fastRuntime, initial, 60, {
    source: 'offline',
    fromMs: 5000,
    limit: 43200,
    lanes: []
  });
  equal(bytes(online.state), bytes(offline.state),
    'trusted-engine irregular combat ticks equal one batch byte-for-byte');
  equal(
    normalizeSummary(online.reports),
    normalizeSummary([offline.report]),
    'trusted-engine irregular and batch report totals are identical'
  );
}

{
  const initial = makeFastCombatState(41);
  const out = advance(fastRuntime, initial, 48 * 3600, {
    source: 'offline',
    fromMs: 0,
    limit: 60,
    lanes: []
  });
  ok(out.report.mainActionSeconds === 60 &&
     out.report.cappedSeconds === 48 * 3600 - 60 &&
     out.report.combat.ticks === 60 / 0.25,
  'offline settlement honors the configured combat cap exactly');

  const injured = freshModel(41);
  injured.systems.gathering.fishStocks.spiritCarp = 0;
  injured.systems.homestead.farm.plots[0] = {
    id: 'plot-1',
    cropId: 'spiritRice',
    remainingSeconds: 100,
    totalSeconds: 100,
    ready: false
  };
  injured.player.combat.injury = {
    id: 'severe-injury',
    remainingSeconds: 1800,
    remainingSecondsExact: '1800',
    totalSeconds: 1800
  };
  const recovered = advance(fastRuntime, injured, 48 * 3600, {
    source: 'offline',
    fromMs: 0,
    limit: 12 * 3600
  });
  ok(recovered.state.player.combat.injury === null &&
     recovered.report.passive.injuryRecovered === true,
  'injury recovery advances for the complete 48 real hours');
  ok(
    recovered.state.systems.gathering.fishStocks.spiritCarp ===
      GatheringContent.FISH_SPECIES.spiritCarp.maxStock &&
    recovered.report.passive.fishRecovered > 0,
  'fish recovery advances for the complete 48 real hours');
  ok(
    recovered.state.systems.homestead.farm.plots[0].ready === true &&
    recovered.report.passive.farmCompleted.some(function (entry) {
      return entry.plotId === 'plot-1' &&
        entry.cropId === 'spiritRice';
    }),
  'farm growth advances for the complete 48 real hours');
}

function parityAfterReload(initial, beforeSeconds, afterSeconds, mutate) {
  let checkpoint = advance(runtime, initial, beforeSeconds).state;
  if (typeof mutate === 'function') checkpoint = mutate(json(checkpoint));
  const direct = advance(runtime, checkpoint, afterSeconds, {
    fromMs: beforeSeconds * 1000
  }).state;
  const reloaded = Stage3State.normalize(
    json(checkpoint),
    { preserveLegacyFields: true }
  );
  const resumed = advance(runtime, reloaded, afterSeconds, {
    fromMs: beforeSeconds * 1000
  }).state;
  return { direct: direct, resumed: resumed };
}

{
  const initial = start(
    runtime,
    freshModel(43),
    'combat:region:qingyunOutskirts:thornHare',
    0
  ).state;
  const parity = parityAfterReload(initial, 0.25, 1, function (state) {
    combatSession(state).player.cooldownTicks = 3;
    return state;
  });
  equal(bytes(parity.direct), bytes(parity.resumed),
    'save/reload at player cooldown 3 is byte-identical');
}

{
  const started = start(
    runtime,
    freshModel(47),
    'combat:dungeon:breathCave',
    0
  ).state;
  const checkpoint = json(started);
  combatSession(checkpoint).enemy = null;
  combatSession(checkpoint).intermissionTicks = 4;
  const direct = advance(runtime, checkpoint, 1).state;
  const resumed = advance(
    runtime,
    Stage3State.normalize(
      json(checkpoint),
      { preserveLegacyFields: true }
    ),
    1
  ).state;
  equal(bytes(direct), bytes(resumed),
    'save/reload between dungeon enemies is byte-identical');
}

{
  const model = freshModel(53);
  model.player.breakthrough.realmId = 'mahayana';
  model.player.combatProgress.firstClears.mahayanaTrial = true;
  const started = start(
    runtime,
    model,
    'combat:dungeon:ascensionTrial',
    0
  );
  const checkpoint = json(started.state);
  const session = combatSession(checkpoint);
  session.waveIndex = 3;
  session.waveDefeated = 0;
  session.enemyId = 'ninefoldTribulation';
  session.bossPhase = 1;
  session.intermissionTicks = 0;
  session.enemy = json(
    CombatEngine.createEnemy('ninefoldTribulation', 1)
  );
  const direct = advance(runtime, checkpoint, 1).state;
  const resumed = advance(
    runtime,
    Stage3State.normalize(
      json(checkpoint),
      { preserveLegacyFields: true }
    ),
    1
  ).state;
  equal(bytes(direct), bytes(resumed),
    'save/reload at final boss phase transition is byte-identical');
}

{
  const pending = freshModel(59);
  pending.systems.combat.pendingLoot = {
    id: 'combat-loot-1',
    source: { type: 'enemy', id: 'thornHare' },
    items: { brokenFang: 1 },
    currency: 0,
    createdAtMs: 10
  };
  pending.systems.combat.nextLootId = 2;
  const direct = advance(runtime, pending, 60).state;
  const resumed = advance(
    runtime,
    Stage3State.normalize(
      json(pending),
      { preserveLegacyFields: true }
    ),
    60
  ).state;
  equal(bytes(direct), bytes(resumed),
    'save/reload with pending loot is byte-identical');
}

[61, 67, 71].forEach(function (seed) {
  const initial = makeEndlessRegion(runtime, seed);
  const chunks = chunked(runtime, initial, 10, [0.25, 1.75], 0);
  const batch = advance(runtime, initial, 10, {
    source: 'offline',
    fromMs: 0,
    limit: 43200
  });
  equal(bytes(chunks.state), bytes(batch.state),
    'multi-seed online/offline parity holds for seed ' + seed);
});

{
  function hostileEngine(mutate) {
    return Object.freeze({
      createSession: CombatEngine.createSession,
      advanceTick: function (session, context) {
        const tick = json(CombatEngine.advanceTick(session, context));
        mutate(tick);
        return tick;
      }
    });
  }

  function hostileTickRollsBack(name, mutate, seed) {
    const guardedRuntime = Stage3Rules.create(runtimeDeps({
      CombatEngine: hostileEngine(mutate)
    }));
    const model = freshModel(seed);
    model.player.inventory.stacks.cloudwoodSword = 1;
    const started = start(
      guardedRuntime,
      model,
      'combat:region:qingyunOutskirts:thornHare',
      0
    ).state;
    const before = json(started);
    const inputBytes = bytes(started);
    const result = advance(guardedRuntime, started, 0.25);
    ok(
      result.state.current === null &&
      result.state.systems.combat.session === null &&
      result.state.lastActionStop.reason === 'requirements_invalid' &&
      bytes(result.state.player.inventory) ===
        bytes(before.player.inventory) &&
      result.state.rngState === before.rngState &&
      bytes(result.state.player.techniques) ===
        bytes(before.player.techniques) &&
      bytes(result.state.player.breakthrough) ===
        bytes(before.player.breakthrough) &&
      bytes(result.state.player.combatProgress) ===
        bytes(before.player.combatProgress) &&
      result.report.combat.ticks === 0 &&
      result.report.combat.damageDealt === 0 &&
      result.report.combat.damageTaken === 0 &&
      Object.keys(result.report.combat.suppliesUsed).length === 0 &&
      Object.keys(result.report.costs.items).length === 0 &&
      Object.keys(result.report.techniques.xp).length === 0 &&
      bytes(started) === inputBytes,
      name + ' rolls back the entire hostile tick'
    );
  }

  hostileTickRollsBack(
    'unknown outcome with injected inventory',
    function (tick) {
      tick.outcome = 'hostile_unknown';
      tick.playerInventory.stacks.cloudwoodSword = 999;
    },
    73
  );
  hostileTickRollsBack(
    'uint32-overflow RNG',
    function (tick) { tick.rngState = Math.pow(2, 40); },
    79
  );
  hostileTickRollsBack(
    'fractional RNG',
    function (tick) { tick.rngState = 1.5; },
    83
  );
  hostileTickRollsBack(
    'plausible but forged RNG advancement',
    function (tick) { tick.rngState = (tick.rngState + 1) >>> 0; },
    84
  );
  hostileTickRollsBack(
    'plausible forged one-hit enemy defeat',
    function (tick) {
      tick.session.enemy.hp = 0;
      tick.outcome = 'enemy_defeated';
    },
    85
  );
  hostileTickRollsBack(
    'malformed session',
    function (tick) { delete tick.session.player; },
    89
  );
  hostileTickRollsBack(
    'non-canonical player combat stats',
    function (tick) { tick.session.player.attack = 'malformed'; },
    90
  );
  hostileTickRollsBack(
    'outcome inconsistent with a live session',
    function (tick) { tick.outcome = 'player_defeated'; },
    91
  );
  hostileTickRollsBack(
    'unreported inventory cleaning',
    function (tick) { tick.playerInventory.stacks = {}; },
    97
  );
  hostileTickRollsBack(
    'malformed event',
    function (tick) { tick.events = [{ type: 'hostile' }]; },
    101
  );
  hostileTickRollsBack(
    'executed action without canonical event evidence',
    function (tick) { tick.events = []; },
    102
  );
  hostileTickRollsBack(
    'non-finite technique gain',
    function (tick) {
      tick.gains.techniqueXp.cloudPiercingSword = Infinity;
    },
    103
  );
  hostileTickRollsBack(
    'unmatched item cost',
    function (tick) { tick.costs.items.grilledCarp = 1; },
    107
  );
  hostileTickRollsBack(
    'non-finite metric',
    function (tick) { tick.metrics.damageDealt = NaN; },
    109
  );
}

{
  function counterEngine(mutate) {
    return Object.freeze({
      createSession: CombatEngine.createSession,
      advanceTick: function (session, context) {
        session.elapsedTicks++;
        mutate(session);
        return {
          ok: true,
          session: session,
          playerInventory: context.playerInventory,
          rngState: context.rngState,
          outcome: 'continue',
          events: [],
          gains: { techniqueXp: {} },
          costs: { items: {} },
          metrics: {
            damageDealt: 0,
            damageTaken: 0,
            suppliesUsed: {}
          }
        };
      }
    });
  }

  [
    {
      name: 'MAX_SAFE elapsed before increment',
      before: Number.MAX_SAFE_INTEGER,
      mutate: function () {}
    },
    {
      name: '2^53 elapsed after increment',
      before: 0,
      mutate: function (session) {
        session.elapsedTicks = Math.pow(2, 53);
      }
    },
    {
      name: 'fractional elapsed after increment',
      before: 0,
      mutate: function (session) {
        session.elapsedTicks = 1.5;
      }
    },
    {
      name: 'negative elapsed after increment',
      before: 0,
      mutate: function (session) {
        session.elapsedTicks = -1;
      }
    }
  ].forEach(function (testCase, index) {
    const guardedRuntime = Stage3Rules.create(runtimeDeps({
      CombatEngine: counterEngine(testCase.mutate)
    }));
    const started = json(start(
      guardedRuntime,
      freshModel(179 + index),
      'combat:region:qingyunOutskirts:thornHare',
      0
    ).state);
    combatSession(started).elapsedTicks = testCase.before;
    const before = json(started);
    const result = advance(guardedRuntime, started, 0.25);
    ok(
      result.report.action.stopReason === 'requirements_invalid' &&
      result.report.combat.ticks === 0 &&
      result.state.current === null &&
      result.state.systems.combat.session === null &&
      result.state.rngState === before.rngState,
      testCase.name + ' fails closed without committing a combat tick'
    );
  });
}

{
  const guardedRuntime = Stage3Rules.create(runtimeDeps({
    CombatEngine: fastCombatEngine
  }));
  const started = start(
    guardedRuntime,
    freshModel(191),
    'combat:region:qingyunOutskirts:thornHare',
    0
  ).state;
  const first = advance(guardedRuntime, started, 0.25);
  first.state.systems.combat.session.player.attack = 'malformed';
  const poisoned = json(first.state);
  const result = advance(guardedRuntime, first.state, 0.25, {
    fromMs: 250
  });
  ok(
    result.report.action.stopReason === 'requirements_invalid' &&
    result.report.combat.ticks === 0 &&
    result.state.current === null &&
    result.state.systems.combat.session === null &&
    result.state.rngState === poisoned.rngState,
    'mutating a previously accepted session cannot poison canonical caches'
  );
}

{
  const forgedProgress = Object.assign({}, CombatProgress, {
    afterEnemyDefeated: function (model, options) {
      const value = json(
        CombatProgress.afterEnemyDefeated(model, options)
      );
      value.state.player.inventory.stacks.cloudwoodSword = 999;
      return value;
    }
  });
  const guardedRuntime = Stage3Rules.create(runtimeDeps({
    CombatProgress: forgedProgress
  }));
  const started = json(start(
    guardedRuntime,
    freshModel(113),
    'combat:region:qingyunOutskirts:thornHare',
    0
  ).state);
  combatSession(started).enemy.hp = 1;
  combatSession(started).player.attack = 1000000;
  combatSession(started).player.accuracy = 1000000;
  combatSession(started).player.cooldownTicks = 0;
  const before = json(started);
  const inputBytes = bytes(started);
  const result = advance(guardedRuntime, started, 0.25);
  ok(
    result.state.current === null &&
    result.state.systems.combat.session === null &&
    result.state.lastActionStop.reason === 'requirements_invalid' &&
    result.state.rngState === before.rngState &&
    bytes(result.state.player.inventory) ===
      bytes(before.player.inventory) &&
    bytes(result.state.player.techniques) ===
      bytes(before.player.techniques) &&
    bytes(result.state.player.breakthrough) ===
      bytes(before.player.breakthrough) &&
    bytes(result.state.player.combatProgress) ===
      bytes(before.player.combatProgress) &&
    result.report.combat.ticks === 0 &&
    result.report.action.completed === 0 &&
    Object.keys(result.report.combat.enemiesDefeated).length === 0 &&
    Object.keys(result.report.gains.items).length === 0 &&
    bytes(started) === inputBytes,
    'forged enemy-defeated progress inventory rolls back the full pipeline'
  );
}

[
  {
    name: 'forged progress RNG',
    mutate: function (value) {
      value.state.rngState = (value.state.rngState + 1) >>> 0;
    }
  },
  {
    name: 'forged progress player attack',
    mutate: function (value) {
      value.state.systems.combat.session.player.attack += 12345;
    }
  }
].forEach(function (testCase, index) {
  const forgedProgress = Object.assign({}, CombatProgress, {
    afterEnemyDefeated: function (model, options) {
      const value = json(
        CombatProgress.afterEnemyDefeated(model, options)
      );
      testCase.mutate(value);
      return value;
    }
  });
  const guardedRuntime = Stage3Rules.create(runtimeDeps({
    CombatProgress: forgedProgress
  }));
  const started = json(start(
    guardedRuntime,
    freshModel(137 + index),
    'combat:region:qingyunOutskirts:thornHare',
    0
  ).state);
  combatSession(started).enemy.hp = 1;
  combatSession(started).player.attack = 1000000;
  combatSession(started).player.accuracy = 1000000;
  combatSession(started).player.cooldownTicks = 0;
  const before = json(started);
  const result = advance(guardedRuntime, started, 0.25);
  ok(
    result.report.action.stopReason === 'requirements_invalid' &&
    result.report.combat.ticks === 0 &&
    result.state.rngState === before.rngState &&
    bytes(result.state.player.inventory) ===
      bytes(before.player.inventory) &&
    bytes(result.state.player.techniques) ===
      bytes(before.player.techniques) &&
    bytes(result.state.player.breakthrough) ===
      bytes(before.player.breakthrough) &&
    bytes(result.state.player.combatProgress) ===
      bytes(before.player.combatProgress),
    testCase.name + ' rolls back the enemy-defeated pipeline'
  );
});

{
  const forgedInventory = Object.assign({}, Inventory, {
    apply: function (inventory, delta) {
      const value = json(Inventory.apply(inventory, delta));
      if (value.ok) {
        value.value.stacks.cloudwoodSword = 999;
      }
      return value;
    }
  });
  const guardedRuntime = Stage3Rules.create(runtimeDeps({
    Inventory: forgedInventory
  }));
  const model = freshModel(127);
  model.player.inventory.stacks.grilledCarp = 1;
  model.player.combat.loadouts[0].supplies.food = {
    itemId: 'grilledCarp',
    triggerRatio: 0.95,
    stopWhenEmpty: false
  };
  const started = json(start(
    guardedRuntime,
    model,
    'combat:region:qingyunOutskirts:thornHare',
    0
  ).state);
  combatSession(started).player.hp = 1;
  const before = json(started);
  const result = advance(guardedRuntime, started, 0.25);
  ok(
    result.report.action.stopReason === 'requirements_invalid' &&
    result.report.combat.ticks === 0 &&
    result.state.rngState === before.rngState &&
    bytes(result.state.player.inventory) ===
      bytes(before.player.inventory),
    'forged Inventory.apply consumption rolls back the full tick'
  );
}

{
  const forgedTechniques = Object.assign({}, Techniques, {
    grantXp: function (model, id, amount, source, sect) {
      const value = json(
        Techniques.grantXp(model, id, amount, source, sect)
      );
      if (value.ok) value.state.player.breakthrough.cultivation++;
      return value;
    }
  });
  const guardedRuntime = Stage3Rules.create(runtimeDeps({
    Techniques: forgedTechniques
  }));
  const model = freshModel(131);
  model.player.techniques.known.cloudPiercingSword = {
    level: 1,
    xp: 0
  };
  model.player.combat.loadouts[0].activeTechniques[0] = {
    techniqueId: 'cloudPiercingSword',
    condition: { type: 'always' }
  };
  const started = json(start(
    guardedRuntime,
    model,
    'combat:region:qingyunOutskirts:thornHare',
    0
  ).state);
  const before = json(started);
  const result = advance(guardedRuntime, started, 0.25);
  ok(
    result.report.action.stopReason === 'requirements_invalid' &&
    result.report.combat.ticks === 0 &&
    result.state.rngState === before.rngState &&
    bytes(result.state.player.techniques) ===
      bytes(before.player.techniques) &&
    bytes(result.state.player.breakthrough) ===
      bytes(before.player.breakthrough),
    'forged Techniques.grantXp rolls back XP and cultivation'
  );
}

{
  const forgedTechniques = Object.assign({}, Techniques, {
    grantXp: function (model, id, amount, source, sect) {
      const value = json(
        Techniques.grantXp(model, id, amount, source, sect)
      );
      if (value.ok) value.state.player.techniques.known[id].xp = 999;
      return value;
    }
  });
  const guardedRuntime = Stage3Rules.create(runtimeDeps({
    Techniques: forgedTechniques
  }));
  const model = freshModel(149);
  model.player.techniques.known.cloudPiercingSword = {
    level: 1,
    xp: 0
  };
  model.player.combat.loadouts[0].activeTechniques[0] = {
    techniqueId: 'cloudPiercingSword',
    condition: { type: 'always' }
  };
  const started = json(start(
    guardedRuntime,
    model,
    'combat:region:qingyunOutskirts:thornHare',
    0
  ).state);
  const before = json(started);
  const result = advance(guardedRuntime, started, 0.25);
  ok(
    result.report.action.stopReason === 'requirements_invalid' &&
    result.report.combat.ticks === 0 &&
    bytes(result.state.player.techniques) ===
      bytes(before.player.techniques),
    'forged target technique XP rolls back the full tick'
  );
}

{
  const forgedProgress = Object.assign({}, CombatProgress, {
    applyDefeat: function (model, atMs) {
      const value = json(CombatProgress.applyDefeat(model, atMs));
      if (value.ok) value.state.player.combat.injury.hostile = true;
      return value;
    }
  });
  const guardedRuntime = Stage3Rules.create(runtimeDeps({
    CombatProgress: forgedProgress
  }));
  const started = json(start(
    guardedRuntime,
    freshModel(151),
    'combat:region:qingyunOutskirts:thornHare',
    0
  ).state);
  combatSession(started).player.hp = 1;
  combatSession(started).player.cooldownTicks = 5;
  combatSession(started).enemy.attack = 1000000;
  combatSession(started).enemy.accuracy = 1000000;
  combatSession(started).enemy.cooldownTicks = 0;
  const before = json(started);
  const result = advance(guardedRuntime, started, 0.25);
  ok(
    result.report.action.stopReason === 'requirements_invalid' &&
    result.report.combat.ticks === 0 &&
    result.state.player.combat.injury === null &&
    result.state.rngState === before.rngState,
    'forged defeat injury payload rolls back the full tick'
  );
}

{
  let getterRejected = false;
  try {
    const hostile = runtimeDeps();
    Object.defineProperty(hostile, 'CombatEngine', {
      enumerable: true,
      get: function () { throw new Error('getter reached'); }
    });
    Stage3Rules.create(hostile);
  } catch (error) {
    getterRejected = error instanceof TypeError;
  }
  ok(getterRejected, 'dependency accessors fail closed');

  let proxyRejected = false;
  try {
    Stage3Rules.create(new Proxy({}, {}));
  } catch (error) {
    proxyRejected = error instanceof TypeError;
  }
  ok(proxyRejected, 'dependency proxies fail closed');
}

{
  const source = fs.readFileSync('core/stage3-rules.js', 'utf8');
  ok(!/Math\.random|localStorage|Platform\.|SaveSystem|document\.|canvas|toast\s*\(/.test(source),
    'Stage3Rules is pure and independent of UI/storage/global random');
  ok(
    !/function\s+(?:techniqueCertificate|progressCertificate|evaluateExpectedGates|expectedReward|applyExpectedTechniqueXp|incrementCount)\b/.test(source),
    'Stage3Rules delegates domain transitions instead of copying formulas'
  );

  const sandbox = {
    Stage2Rules: Stage2Rules,
    CombatEngine: CombatEngine,
    CombatProgress: CombatProgress,
    Techniques: Techniques
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, {
    filename: 'core/stage3-rules.js'
  });
  ok(sandbox.Stage3Rules &&
     typeof sandbox.Stage3Rules.create === 'function' &&
     Object.isFrozen(sandbox.Stage3Rules),
  'Stage3Rules attaches a frozen browser UMD API');
}

console.log(
  '\n=== Stage 3 统一战斗模拟自测：' +
  passed + ' 通过 / ' + failed + ' 失败 ==='
);
process.exitCode = failed ? 1 : 0;
