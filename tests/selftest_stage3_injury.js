'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

const CombatContent = require('../content/combat.js');
const RealmContent = require('../content/realms.js');
const TechniqueContent = require('../content/techniques.js');
const GatheringContent = require('../content/gathering.js');
const RecipeContent = require('../content/recipes.js');
const HomesteadContent = require('../content/homestead.js');
const CombatEngine = require('../core/combat-engine.js');
const CombatRewards = require('../core/combat-rewards.js');
const Techniques = require('../core/techniques.js');
const Inventory = require('../core/inventory.js');
const SkillProgression = require('../core/skill-progression.js');
const Gathering = require('../core/gathering.js');
const Production = require('../core/production.js');
const Farm = require('../core/farm.js');
const Formations = require('../core/formations.js');
const SpiritBeasts = require('../core/spirit-beasts.js');
const GameRandom = require('../core/random.js');
const GameRules = require('../core/game-rules.js');
const Stage2Rules = require('../core/stage2-rules.js');
const Stage3State = require('../core/stage3-state.js');
const StateModel = require('../core/state-model.js');
const SaveSystem = require('../core/save-system.js');
const Simulation = require('../core/simulation.js');
const SimulationReport = require('../core/simulation-report.js');
const CombatProgress = require('../core/combat-progress.js');

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

function freshModel() {
  const model = Stage3State.normalize(
    StateModel.normalize(Stage3State.defaults(), 0)
  );
  model.current = null;
  model.rngState = 1;
  model.player.shouMax = 100;
  model.player.shouyuan = 100;
  model.player.lifespanAnchorMs = null;
  model.player.lifespanBaseYears = null;
  return model;
}

function startDungeon() {
  return CombatProgress.startDungeon(
    freshModel(),
    'breathCave',
    1000
  ).state;
}

function defeatedDungeon() {
  const model = json(startDungeon());
  model.systems.combat.session.player.hp = 0;
  return model;
}

function stage2Runtime() {
  return Stage2Rules.create({
    GameRules: GameRules,
    gameRulesConfig: {
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
    },
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
    GameRandom: GameRandom
  });
}

function jsonAdapter() {
  const raw = {};
  return {
    raw: raw,
    load: function (key) {
      return Object.prototype.hasOwnProperty.call(raw, key)
        ? JSON.parse(raw[key])
        : null;
    },
    save: function (key, value) {
      raw[key] = JSON.stringify(value);
      return true;
    }
  };
}

const plannedSurface = [
  'advanceInjury',
  'afterEnemyDefeated',
  'applyDefeat',
  'canStartDungeon',
  'canStartRegion',
  'injuryRecoveryLane',
  'nextDungeonEnemy',
  'queryDungeons',
  'queryRegions',
  'recordExternalGate',
  'startDungeon',
  'startRegion',
  'treatInjury'
].sort();
equal(
  Object.keys(CombatProgress).sort(),
  plannedSurface,
  'CombatProgress exposes exactly the Task 8 and Task 9 public surface'
);

const hasTask9Api =
  typeof CombatProgress.applyDefeat === 'function' &&
  typeof CombatProgress.advanceInjury === 'function' &&
  typeof CombatProgress.treatInjury === 'function' &&
  CombatProgress.injuryRecoveryLane &&
  typeof CombatProgress.injuryRecoveryLane.nextBoundary === 'function' &&
  typeof CombatProgress.injuryRecoveryLane.elapse === 'function' &&
  typeof CombatProgress.injuryRecoveryLane.resolve === 'function';

ok(hasTask9Api, 'Task 9 defeat, recovery, treatment, and lane APIs exist');

if (hasTask9Api) {
  ok(Object.isFrozen(CombatProgress) &&
    Object.isFrozen(CombatProgress.injuryRecoveryLane),
  'CombatProgress and the injury lane are frozen');
  equal(
    CombatProgress.injuryRecoveryLane.id,
    'stage3-injury-recovery',
    'injury lane uses the frozen Stage 3 lane id'
  );

  {
    const model = defeatedDungeon();
    model.player.inventory.stacks.cloudwoodSword = 1;
    model.player.inventory.stacks.grilledCarp = 2;
    model.player.inventory.stacks.healingPill = 2;
    model.player.inventory.stacks.wardTalisman = 2;
    model.player.inventory.bindings.cloudwoodSword = {
      equipment: 1,
      task: 0,
      formation: 0
    };
    model.player.combat.loadouts[0].equipment.weapon = 'cloudwoodSword';
    model.player.techniques.known.steadyBreath = { level: 1, xp: 7 };
    model.player.combatProgress.dungeonClears.breathCave = 2;
    model.player.combatProgress.firstClears.breathCave = true;
    const gateId = RealmContent.TRANSITIONS[0].gate.id;
    model.player.combatProgress.completedGates[gateId] = true;
    model.player.lifecycle = {
      status: 'alive',
      deathCount: 3,
      reincarnationCount: 2
    };
    model.systems.combat.session.waveIndex = 0;
    model.systems.combat.session.waveDefeated = 1;

    // These quantities represent supplies already consumed by CombatEngine.
    model.player.inventory.stacks.grilledCarp--;
    model.player.inventory.stacks.healingPill--;
    model.player.inventory.stacks.wardTalisman--;
    const retained = {
      inventory: json(model.player.inventory),
      loadouts: json(model.player.combat.loadouts),
      techniques: json(model.player.techniques),
      progress: json(model.player.combatProgress),
      lifecycle: json(model.player.lifecycle)
    };
    const out = CombatProgress.applyDefeat(model, 2500);
    ok(out.ok && out.code === 'injured',
      'HP zero applies the injured result');
    equal(out.state.current, null,
      'defeat clears the matching combat main action');
    equal(out.state.systems.combat.session, null,
      'defeat discards the failed combat run session');
    equal(out.state.lastActionStop, {
      key: 'combat:dungeon:breathCave',
      reason: 'injured',
      atMs: 2500
    }, 'defeat records the injured stop reason');
    equal(out.result, {
      stopReason: 'injured',
      report: { retreatReason: 'player_defeated' }
    }, 'defeat returns the player-defeated report seam');
    equal(out.state.player.combat.injury, {
      id: 'severe-injury',
      remainingSeconds: 5,
      remainingSecondsExact: '5',
      totalSeconds: 5
    }, 'defeat creates a five-second severe injury');
    equal(out.state.player.inventory, retained.inventory,
      'defeat neither refunds consumed supplies nor deletes inventory');
    equal(out.state.player.combat.loadouts, retained.loadouts,
      'defeat preserves equipment and loadouts');
    equal(out.state.player.techniques, retained.techniques,
      'defeat preserves learned techniques and XP');
    equal(out.state.player.combatProgress, retained.progress,
      'defeat preserves only already completed permanent progress');
    equal(out.state.player.lifecycle, retained.lifecycle,
      'ordinary defeat never invokes death or reincarnation');
  }

  {
    const existingLong = defeatedDungeon();
    existingLong.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 2400.5,
      remainingSecondsExact: '2400.5',
      totalSeconds: 3000
    };
    const longOut = CombatProgress.applyDefeat(existingLong, 1);
    equal(longOut.state.player.combat.injury, {
      id: 'severe-injury',
      remainingSeconds: 2400.5,
      remainingSecondsExact: '2400.5',
      totalSeconds: 3000
    }, 'defeat keeps a longer exact injury instead of adding time');

    const existingShort = defeatedDungeon();
    existingShort.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 900,
      remainingSecondsExact: '900',
      totalSeconds: 1800
    };
    equal(
      CombatProgress.applyDefeat(existingShort, 2)
        .state.player.combat.injury.remainingSeconds,
      900,
      'defeat keeps a longer existing injury instead of adding time'
    );
  }

  {
    const alive = startDungeon();
    const before = bytes(alive);
    const out = CombatProgress.applyDefeat(alive, 3);
    ok(!out.ok && out.code === 'player_not_defeated',
      'applyDefeat rejects a living combat session');
    equal(bytes(out.state), before,
      'rejected defeat is byte-preserving');
  }

  {
    const injured = freshModel();
    injured.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 100,
      totalSeconds: 1800
    };
    const before = bytes(injured);
    const region = CombatProgress.startRegion(
      injured,
      'qingyunOutskirts',
      'thornHare',
      1
    );
    const dungeon = CombatProgress.startDungeon(
      injured,
      'breathCave',
      1
    );
    ok(!region.ok && region.code === 'injured' &&
      !dungeon.ok && dungeon.code === 'injured',
    'injury blocks both region and dungeon starts');
    equal(bytes(region.state), before,
      'injured region start leaves the model unchanged');
    equal(bytes(dungeon.state), before,
      'injured dungeon start leaves the model unchanged');

    const runtime = stage2Runtime();
    const noncombat = runtime.rules.start(
      injured,
      'gather:explore:mining',
      10
    );
    ok(noncombat.ok &&
      noncombat.state.current.key === 'gather:explore:mining' &&
      noncombat.state.player.combat.injury.remainingSeconds === 100,
    'injury does not globally lock Stage 2 noncombat actions');
  }

  {
    const injured = freshModel();
    injured.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 1800,
      remainingSecondsExact: '1800',
      totalSeconds: 1800
    };
    const before = bytes(injured);
    const advanced = CombatProgress.advanceInjury(injured, 600);
    equal(advanced.state.player.combat.injury.remainingSeconds, 1200,
      'advanceInjury subtracts complete real seconds');
    equal(bytes(injured), before,
      'advanceInjury does not mutate its input');

    const bulk = CombatProgress.advanceInjury(injured, 1800);
    let chunks = injured;
    [0.25, 17.75, 600, 1182].forEach(function (seconds) {
      chunks = CombatProgress.advanceInjury(chunks, seconds).state;
    });
    equal(chunks, bulk.state,
      'injury recovery is chunk invariant');
    equal(bulk.state.player.combat.injury, null,
      'advanceInjury clears the injury exactly at zero');

    const invalid = CombatProgress.advanceInjury(injured, NaN);
    ok(!invalid.ok && invalid.code === 'invalid_seconds',
      'non-finite injury time fails closed');
    equal(bytes(invalid.state), before,
      'invalid injury time cannot mutate state');

    const invalidLegacyInjury = json(injured);
    invalidLegacyInjury.player.combat.injury.remainingSeconds = NaN;
    let invalidLegacyResult = null;
    try {
      invalidLegacyResult = CombatProgress.advanceInjury(
        invalidLegacyInjury,
        1
      );
    } catch (error) {
      invalidLegacyResult = null;
    }
    ok(invalidLegacyResult &&
       !invalidLegacyResult.ok &&
       invalidLegacyResult.code === 'invalid_state',
    'non-finite legacy injury state fails closed without throwing');
  }

  {
    const injured = freshModel();
    injured.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 1800,
      totalSeconds: 1800
    };
    const bulk = CombatProgress.advanceInjury(injured, 0.2).state;
    const firstChunk = CombatProgress.advanceInjury(injured, 0.1).state;
    const reloadedChunk = Stage3State.normalize(json(firstChunk));
    const chunks = CombatProgress.advanceInjury(
      reloadedChunk,
      0.1
    ).state;
    equal(bytes(chunks), bytes(bulk),
      'advanceInjury is byte-identical for decimal bulk/chunks after reload');
    equal(
      bulk.player.combat.injury.remainingSeconds,
      1799.8,
      'advanceInjury stores the canonical decimal remainder'
    );
    equal(
      bulk.player.combat.injury.remainingSecondsExact,
      '1799.8',
      'advanceInjury persists the canonical decimal recovery truth'
    );
  }

  {
    const injured = freshModel();
    injured.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 1800,
      remainingSecondsExact: '1800',
      totalSeconds: 1800
    };
    const bulk = CombatProgress.advanceInjury(injured, 3e-13).state;
    let chunks = injured;
    [1e-13, 1e-13, 1e-13].forEach(function (seconds) {
      chunks = CombatProgress.advanceInjury(chunks, seconds).state;
      chunks = Stage3State.normalize(json(chunks));
    });
    equal(
      bytes(chunks.player.combat.injury),
      bytes(bulk.player.combat.injury),
      'direct tiny recovery is byte-identical after every-chunk reload'
    );
    equal(bulk.player.combat.injury, {
      id: 'severe-injury',
      remainingSeconds: Number('1799.9999999999997'),
      remainingSecondsExact: '1799.9999999999997',
      totalSeconds: 1800
    }, 'direct recovery stores the exact 3e-13 subtraction');

    let forward = injured;
    [1e-13, 2e-13].forEach(function (seconds) {
      forward = CombatProgress.advanceInjury(forward, seconds).state;
      forward = Stage3State.normalize(json(forward));
    });
    let reverse = injured;
    [2e-13, 1e-13].forEach(function (seconds) {
      reverse = CombatProgress.advanceInjury(reverse, seconds).state;
      reverse = Stage3State.normalize(json(reverse));
    });
    equal(
      bytes(forward.player.combat.injury),
      bytes(reverse.player.combat.injury),
      'scientific-notation chunks are order invariant across reloads'
    );
  }

  {
    const runtime = stage2Runtime();
    const injured = freshModel();
    injured.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 1800,
      totalSeconds: 1800
    };
    const started = runtime.rules.start(
      injured,
      'gather:explore:mining',
      0
    ).state;
    const combinedLanes = Object.freeze(
      runtime.lanes.concat([CombatProgress.injuryRecoveryLane])
    );
    equal(combinedLanes.map(function (lane) { return lane.id; }), [
      'lifespan',
      'mood',
      'parallel',
      'world',
      'stage2-fish-recovery',
      'stage2-farm-growth',
      'stage3-injury-recovery'
    ], 'injury recovery appends to existing passive lanes without replacement');
    equal(new Set(combinedLanes.map(function (lane) {
      return lane.id;
    })).size, combinedLanes.length,
    'combined passive lanes contain no duplicate settlement');

    const offline = Simulation.advance(started, 4800, {
      source: 'offline',
      fromMs: 0,
      mainActionLimitSeconds: 1,
      rules: runtime.rules,
      lanes: combinedLanes
    });
    equal(offline.report.mainActionSeconds, 1,
      'offline cap still limits only the main action');
    equal(offline.report.cappedSeconds, 4799,
      'offline report exposes the capped main-action remainder');
    equal(offline.state.player.combat.injury, null,
      'injury lane receives the complete offline duration beyond the cap');
    equal(offline.report.passive.injuryRecovered, true,
      'the recovery boundary reports injuryRecovered once');

    const again = Simulation.advance(offline.state, 1, {
      source: 'online',
      fromMs: 4800000,
      mainActionLimitSeconds: null,
      rules: runtime.rules,
      lanes: combinedLanes
    });
    equal(again.report.passive.injuryRecovered, false,
      'later settlements do not report the same recovery twice');
  }

  {
    const runtime = stage2Runtime();
    const lanes = runtime.lanes.concat([
      CombatProgress.injuryRecoveryLane
    ]);
    const injured = freshModel();
    injured.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 1800,
      totalSeconds: 1800
    };
    const bulk = Simulation.advance(injured, 0.2, {
      source: 'online',
      fromMs: 0,
      mainActionLimitSeconds: null,
      rules: runtime.rules,
      lanes: lanes
    });
    const first = Simulation.advance(injured, 0.1, {
      source: 'online',
      fromMs: 0,
      mainActionLimitSeconds: null,
      rules: runtime.rules,
      lanes: lanes
    });
    const reloaded = Stage3State.normalize(json(first.state));
    const second = Simulation.advance(reloaded, 0.1, {
      source: 'online',
      fromMs: 100,
      mainActionLimitSeconds: null,
      rules: runtime.rules,
      lanes: lanes
    });
    equal(bytes(second.state), bytes(bulk.state),
      'injury lane is byte-identical for decimal bulk/chunks and reload');
    equal(first.report.passive.injuryRecovered, false,
      'partial decimal chunk does not report recovery early');
    equal(second.report.passive.injuryRecovered, false,
      'non-boundary decimal chunks do not fabricate recovery');

    const boundary = freshModel();
    boundary.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 0.2,
      totalSeconds: 1800
    };
    const boundaryFirst = Simulation.advance(boundary, 0.1, {
      source: 'online',
      fromMs: 0,
      mainActionLimitSeconds: null,
      rules: runtime.rules,
      lanes: lanes
    });
    const boundaryReload = Stage3State.normalize(
      json(boundaryFirst.state)
    );
    const boundarySecond = Simulation.advance(boundaryReload, 0.1, {
      source: 'online',
      fromMs: 100,
      mainActionLimitSeconds: null,
      rules: runtime.rules,
      lanes: lanes
    });
    const boundaryAgain = Simulation.advance(boundarySecond.state, 0.1, {
      source: 'online',
      fromMs: 200,
      mainActionLimitSeconds: null,
      rules: runtime.rules,
      lanes: lanes
    });
    equal(boundaryFirst.report.passive.injuryRecovered, false,
      'first boundary chunk keeps injury active above epsilon');
    equal(boundarySecond.state.player.combat.injury, null,
      'decimal boundary clears injury after JSON reload');
    equal(boundarySecond.report.passive.injuryRecovered, true,
      'decimal recovery boundary reports exactly once');
    equal(boundaryAgain.report.passive.injuryRecovered, false,
      'post-boundary advance cannot duplicate recovery reporting');

    const epsilon = freshModel();
    epsilon.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 1.1e-9,
      totalSeconds: 1800
    };
    const epsilonRecovery = Simulation.advance(epsilon, 0.1e-9, {
      source: 'online',
      fromMs: 0,
      mainActionLimitSeconds: null,
      rules: runtime.rules,
      lanes: lanes
    });
    const epsilonAgain = Simulation.advance(
      epsilonRecovery.state,
      0.1e-9,
      {
        source: 'online',
        fromMs: 0.0000001,
        mainActionLimitSeconds: null,
        rules: runtime.rules,
        lanes: lanes
      }
    );
    equal(epsilonRecovery.state.player.combat.injury, null,
      'lane normalizes an epsilon remainder to recovered null immediately');
    equal(epsilonRecovery.report.passive.injuryRecovered, true,
      'epsilon recovery is reported in the settlement that crosses it');
    equal(epsilonAgain.report.passive.injuryRecovered, false,
      'epsilon recovery cannot be reported again');
  }

  {
    const runtime = stage2Runtime();
    const exactInjury = {
      id: 'severe-injury',
      remainingSeconds: 1800,
      remainingSecondsExact: '1800',
      totalSeconds: 1800
    };
    const injured = freshModel();
    injured.player.combat.injury = exactInjury;

    function laneAdvance(state, seconds) {
      const next = json(state);
      const helpers = { report: { passive: { injuryRecovered: false } } };
      CombatProgress.injuryRecoveryLane.elapse(next, seconds, helpers);
      CombatProgress.injuryRecoveryLane.resolve(next, helpers);
      return next;
    }

    const laneBulk = laneAdvance(injured, 3e-13);
    let laneChunks = injured;
    [1e-13, 1e-13, 1e-13].forEach(function (seconds) {
      laneChunks = laneAdvance(laneChunks, seconds);
      laneChunks = Stage3State.normalize(json(laneChunks));
    });
    equal(
      bytes(laneChunks.player.combat.injury),
      bytes(laneBulk.player.combat.injury),
      'injury lane tiny recovery is byte-identical after every reload'
    );

    const options = {
      source: 'online',
      fromMs: 0,
      mainActionLimitSeconds: null,
      rules: runtime.rules,
      lanes: [CombatProgress.injuryRecoveryLane]
    };
    const simulationBulk = Simulation.advance(injured, 3e-13, options);
    let simulationChunks = injured;
    [1e-13, 1e-13, 1e-13].forEach(function (seconds) {
      simulationChunks = Simulation.advance(
        simulationChunks,
        seconds,
        options
      ).state;
      simulationChunks = Stage3State.normalize(json(simulationChunks));
    });
    equal(
      bytes(simulationChunks.player.combat.injury),
      bytes(simulationBulk.state.player.combat.injury),
      'Simulation tiny recovery is byte-identical after every reload'
    );
  }

  {
    const report = SimulationReport.create({
      source: 'online',
      fromMs: 0,
      toMs: 1,
      requestedSeconds: 1
    });
    equal(report.passive.injuryRecovered, false,
      'new reports default optional injury recovery to false');
    equal(
      SimulationReport.normalize({
        id: 'injury-report',
        source: 'offline',
        passive: { injuryRecovered: true }
      }).passive.injuryRecovered,
      true,
      'report normalization preserves a true injury recovery event'
    );
    equal(
      SimulationReport.normalize({
        id: 'legacy-without-injury',
        source: 'offline',
        passive: {}
      }).passive.injuryRecovered,
      false,
      'older reports normalize with injuryRecovered false'
    );
    equal(
      SimulationReport.summarize([
        report,
        {
          id: 'injury-report',
          source: 'offline',
          passive: { injuryRecovered: true }
        }
      ]).passive.injuryRecovered,
      true,
      'report summaries preserve whether a recovery occurred'
    );
  }

  {
    const injured = freshModel();
    injured.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 1800,
      remainingSecondsExact: '1800',
      totalSeconds: 1800
    };
    injured.player.inventory.stacks.healingPill = 2;
    const treated = CombatProgress.treatInjury(injured);
    ok(treated.ok && treated.code === 'ok',
      'treatInjury accepts one available healing pill');
    equal(treated.state.player.inventory.stacks.healingPill, 1,
      'treatment consumes exactly one healing pill through Inventory');
    equal(treated.state.player.combat.injury.remainingSeconds, 1200,
      'one healing pill removes exactly 600 injury seconds');
    equal(treated.state.player.combat.injury.remainingSecondsExact, '1200',
      'treatment updates the persisted exact recovery time');

    const short = json(injured);
    short.player.combat.injury.remainingSeconds = 500;
    short.player.combat.injury.remainingSecondsExact = '500';
    const cleared = CombatProgress.treatInjury(short);
    equal(cleared.state.player.combat.injury, null,
      'treatment clamps a short injury to recovered null');
    equal(cleared.state.player.inventory.stacks.healingPill, 1,
      'recovery treatment still consumes one pill atomically');
  }

  {
    // 回归：真实存档使用 {stacks, free} 旧形态库存（无 capacity/bindings）。
    // 修复前 treatInjury 把规范化结果与原始 {stacks, free} 做结构比对必失败，
    // 导致点击治疗毫无反应。这里直接验证该形态能正常消耗丹药并减伤。
    const legacy = freshModel();
    legacy.player.inventory = { stacks: { healingPill: 2 }, free: 38 };
    legacy.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 1800,
      remainingSecondsExact: '1800',
      totalSeconds: 1800
    };
    const treated = CombatProgress.treatInjury(legacy);
    ok(treated.ok && treated.code === 'ok',
      'treatInjury works with legacy {stacks, free} inventory');
    equal(Inventory.availableQuantity(treated.state.player.inventory, 'healingPill'), 1,
      'legacy inventory consumes exactly one healing pill through the treat command');
    equal(treated.state.player.combat.injury.remainingSeconds, 1200,
      'legacy inventory treatment removes 600 injury seconds');
  }

  {
    const noInjury = freshModel();
    noInjury.player.inventory.stacks.healingPill = 1;
    const noInjuryBytes = bytes(noInjury);
    const absent = CombatProgress.treatInjury(noInjury);
    ok(!absent.ok && absent.code === 'no_injury',
      'treatment without injury is rejected');
    equal(bytes(absent.state), noInjuryBytes,
      'no-injury treatment preserves all bytes');

    const noPill = freshModel();
    noPill.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 1800,
      totalSeconds: 1800
    };
    const noPillBytes = bytes(noPill);
    const missing = CombatProgress.treatInjury(noPill);
    ok(!missing.ok && missing.code === 'insufficient_items',
      'treatment without a healing pill is rejected');
    equal(bytes(missing.state), noPillBytes,
      'missing-pill treatment is atomic');

    const invalidInventory = json(noPill);
    invalidInventory.player.inventory.capacity = -1;
    invalidInventory.player.inventory.stacks.healingPill = 1;
    const invalidBytes = bytes(invalidInventory);
    const invalid = CombatProgress.treatInjury(invalidInventory);
    ok(!invalid.ok && invalid.code === 'invalid_inventory',
      'malformed inventory is rejected instead of silently normalized');
    equal(bytes(invalid.state), invalidBytes,
      'malformed-inventory treatment preserves the original state');
  }

  {
    const injuredPending = freshModel();
    injuredPending.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 300,
      totalSeconds: 1800
    };
    injuredPending.systems.combat.pendingLoot = {
      id: 'combat-loot-1',
      source: { type: 'enemy', id: 'thornHare' },
      items: { copperOre: 1 },
      currency: 2,
      createdAtMs: 50
    };
    injuredPending.systems.combat.nextLootId = 2;
    const before = bytes(injuredPending);
    const canRegion = CombatProgress.canStartRegion(
      injuredPending,
      'qingyunOutskirts',
      'thornHare'
    );
    const startRegion = CombatProgress.startRegion(
      injuredPending,
      'qingyunOutskirts',
      'thornHare',
      1
    );
    const canDungeon = CombatProgress.canStartDungeon(
      injuredPending,
      'breathCave'
    );
    const startDungeonResult = CombatProgress.startDungeon(
      injuredPending,
      'breathCave',
      1
    );
    equal([
      canRegion.code,
      startRegion.code,
      canDungeon.code,
      startDungeonResult.code
    ], ['injured', 'injured', 'injured', 'injured'],
    'injury takes precedence over a valid pending-loot lock');
    equal(bytes(injuredPending), before,
      'four injured/pending eligibility checks preserve input bytes');
    equal(bytes(startRegion.state), before,
      'injured/pending region start returns unchanged state bytes');
    equal(bytes(startDungeonResult.state), before,
      'injured/pending dungeon start returns unchanged state bytes');

    const pendingOnly = json(injuredPending);
    pendingOnly.player.combat.injury = null;
    const pendingBefore = bytes(pendingOnly);
    const pendingCodes = [
      CombatProgress.canStartRegion(
        pendingOnly,
        'qingyunOutskirts',
        'thornHare'
      ).code,
      CombatProgress.startRegion(
        pendingOnly,
        'qingyunOutskirts',
        'thornHare',
        1
      ).code,
      CombatProgress.canStartDungeon(
        pendingOnly,
        'breathCave'
      ).code,
      CombatProgress.startDungeon(
        pendingOnly,
        'breathCave',
        1
      ).code
    ];
    equal(pendingCodes, [
      'pending_loot_exists',
      'pending_loot_exists',
      'pending_loot_exists',
      'pending_loot_exists'
    ], 'pending loot alone retains its existing rejection code');
    equal(bytes(pendingOnly), pendingBefore,
      'pending-only eligibility checks remain byte-preserving');
  }

  {
    const accessor = freshModel();
    Object.defineProperty(accessor.player.combat, 'injury', {
      enumerable: true,
      get: function () {
        throw new Error('injury accessor should never run');
      }
    });
    let accessorResult = null;
    try {
      accessorResult = CombatProgress.treatInjury(accessor);
    } catch (error) {
      accessorResult = null;
    }
    ok(accessorResult && !accessorResult.ok &&
      accessorResult.code === 'invalid_state',
    'accessor-bearing injury state fails closed without invocation');

    const proxy = new Proxy(freshModel(), {
      ownKeys: function () {
        throw new Error('proxy trap should never escape');
      }
    });
    let proxyResult = null;
    try {
      proxyResult = CombatProgress.advanceInjury(proxy, 1);
    } catch (error) {
      proxyResult = null;
    }
    ok(proxyResult && !proxyResult.ok &&
      proxyResult.code === 'invalid_state',
    'proxy-bearing injury state fails closed');
  }

  {
    const injured = freshModel();
    injured.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 1234.5,
      totalSeconds: 1800
    };
    const normalized = Stage3State.normalize(json(injured));
    const canonicalInjury = {
      id: 'severe-injury',
      remainingSeconds: 1234.5,
      remainingSecondsExact: '1234.5',
      totalSeconds: 1800
    };
    equal(normalized.player.combat.injury, canonicalInjury,
      'legacy severe injury gains exact recovery time on reload');

    const adapter = jsonAdapter();
    const snapshot = SaveSystem.createSnapshot(injured, 8000);
    ok(SaveSystem.save(adapter, snapshot, 8000),
      'injured v4 snapshot saves');
    const loaded = SaveSystem.load(adapter, 8000);
    equal(
      loaded.snapshot.player.combat.injury,
      canonicalInjury,
      'save-system reload preserves injury timers exactly'
    );
  }

  {
    const source = fs.readFileSync('./core/combat-progress.js', 'utf8');
    let inventoryApplyCalls = 0;
    const context = {
      CombatContent: CombatContent,
      RealmContent: RealmContent,
      TechniqueContent: TechniqueContent,
      CombatEngine: CombatEngine,
      CombatRewards: CombatRewards,
      Techniques: Techniques,
      Stage3State: Stage3State,
      Inventory: Object.freeze({
        apply: function (inventory, delta) {
          inventoryApplyCalls++;
          const next = json(inventory);
          if (!delta || delta.healingPill !== -1 ||
              (next.stacks.healingPill || 0) < 1) {
            return { ok: false, code: 'invalid_delta', value: next };
          }
          next.stacks.healingPill--;
          if (next.stacks.healingPill === 0) {
            delete next.stacks.healingPill;
          }
          return { ok: true, code: 'ok', value: next };
        }
      }),
      structuredClone: structuredClone
    };
    context.globalThis = context;
    vm.runInNewContext(source, context, {
      filename: 'combat-progress-injury.js'
    });
    equal(
      Object.keys(context.CombatProgress).sort(),
      plannedSurface,
      'browser UMD exposes the same Task 9 surface'
    );
    ok(Object.isFrozen(context.CombatProgress.injuryRecoveryLane),
      'browser UMD publishes the frozen injury lane');

    const injured = freshModel();
    injured.player.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: 1800,
      totalSeconds: 1800
    };
    injured.player.inventory.stacks.healingPill = 1;
    const treated = context.CombatProgress.treatInjury(injured);
    ok(treated.ok &&
      treated.state.player.combat.injury.remainingSeconds === 1200,
    'injected Inventory transaction produces the real treatment result');
    equal(inventoryApplyCalls, 1,
      'one treatment uses exactly one Inventory.apply transaction');
  }
}

if (failed) {
  console.error(
    '\n=== Stage 3 重伤自测失败：' + passed +
    ' 通过 / ' + failed + ' 失败 ==='
  );
  process.exitCode = 1;
} else {
  console.log(
    '\n=== Stage 3 重伤自测：' + passed + ' 通过 / 0 失败 ==='
  );
}
