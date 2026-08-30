'use strict';

const fs = require('node:fs');
const vm = require('node:vm');
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

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function allNumbersFiniteNonNegative(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0;
  }
  if (!value || typeof value !== 'object') return true;
  return Object.keys(value).every((key) =>
    allNumbersFiniteNonNegative(value[key]));
}

function jsonAdapter(initial) {
  const raw = Object.assign({}, initial || {});
  const writes = [];
  return {
    raw,
    writes,
    load(key) {
      if (!(key in raw)) return null;
      return JSON.parse(raw[key]);
    },
    save(key, value) {
      writes.push(key);
      raw[key] = JSON.stringify(value);
      return true;
    }
  };
}

function load(path, label) {
  try {
    return require(path);
  } catch (error) {
    ok(false, label + ' loads: ' + error.code);
    return null;
  }
}

const Stage3State = load('../core/stage3-state.js', 'Stage3State');
const Stage2State = require('../core/stage2-state.js');
const SaveSystem = require('../core/save-system.js');
const StateModel = require('../core/state-model.js');
const CombatLoadouts = require('../core/combat-loadouts.js');
const CombatProgress = require('../core/combat-progress.js');
const CombatRewards = require('../core/combat-rewards.js');
const ItemContent = require('../content/items.js');

if (Stage3State) {
  const defaults = Stage3State.defaults();
  ok(defaults.player.combat.loadouts.length === 1,
    'one default loadout');
  ok(defaults.player.combat.loadouts[0].activeTechniques.length === 3,
    'three active slots');
  ok(defaults.player.combat.loadouts[0].passiveTechniques.length === 5,
    'five passive slots');
  ok(defaults.player.techniques.known &&
     Object.keys(defaults.player.techniques.known).length === 0,
  'no technique starts learned');
  ok(defaults.systems.combat.session === null,
    'no combat session starts');
  ok(defaults.systems.combat.pendingLoot === null,
    'no pending loot starts');
  exact(defaults.player.combat.loadouts[0].supplies, {
    food: { itemId: null, triggerRatio: 0.5, stopWhenEmpty: false },
    pill: { itemId: null, triggerRatio: 0.3, stopWhenEmpty: false },
    talisman: {
      itemId: null,
      useAt: 'enemy_start',
      stopWhenEmpty: false
    }
  }, 'default supplies use the persisted v4 shape');
  exact(defaults.player.combatProgress, {
    enemyKills: {},
    regionKills: {},
    dungeonClears: {},
    firstClears: {},
    completedGates: {}
  }, 'new combat progress starts empty');
  exact(defaults.player.breakthrough, {
    realmId: 'qi-1',
    cultivation: 0,
    eventBuffs: []
  }, 'new breakthrough progress starts at qi-1');
  ok(Object.isFrozen(Stage3State),
    'Stage3State public API is frozen');
  defaults.player.combat.loadouts[0].name = '独立副本';
  ok(Stage3State.defaults().player.combat.loadouts[0].name === '方案一',
    'defaults returns detached mutable state');

  const stage2 = Stage2State.createDefaults();
  stage2.player.name = '无损迁移';
  stage2.player.realmStage = 9;
  stage2.player.xiwei = 3456;
  stage2.player.shouyuan = 250;
  stage2.player.shouMax = 300;
  stage2.player.inventory.capacity = 47;
  stage2.player.inventory.capacityGrants.shop = 7;
  stage2.player.inventory.stacks = {
    healingPill: 4,
    spiritRice: 2
  };
  stage2.player.inventory.bindings = {};
  stage2.player.skills.herb = { level: 12, xp: 34 };
  stage2.player.mastery.herb.parityHerb1 = { level: 7, xp: 8 };
  stage2.player.legacyProgress.skills.forgotten = { level: 9, xp: 2 };
  stage2.systems.gathering.fishStocks.spiritCarp = 6;
  stage2.systems.homestead.farm.plots[0] = {
    id: 'plot-1',
    cropId: 'spiritRice',
    remainingSeconds: 12,
    totalSeconds: 300,
    ready: false
  };
  stage2.systems.homestead.formations.owned = ['gatheringFormation'];
  stage2.systems.homestead.formations.slots = ['gatheringFormation'];
  const stage2Before = copy(stage2);
  const migrated = Stage3State.normalize(stage2);
  ok(migrated.player.breakthrough.realmId === 'foundation',
    'legacy realm index maps to realm id');
  ok(migrated.player.breakthrough.cultivation === 3456,
    'legacy cultivation is retained');
  ok(!('realmStage' in migrated.player) && !('xiwei' in migrated.player),
    'normalize removes duplicated legacy realm fields');
  exact(migrated.player.inventory.stacks,
    stage2Before.player.inventory.stacks,
    'normalize preserves inventory stacks byte-for-byte');
  exact(migrated.player.inventory.bindings, {},
    'normalize clears empty equipment bindings');
  exact(migrated.player.skills, stage2Before.player.skills,
    'normalize preserves every Stage 2 skill');
  exact(migrated.player.mastery, stage2Before.player.mastery,
    'normalize preserves every Stage 2 mastery record');
  exact(migrated.player.legacyProgress, stage2Before.player.legacyProgress,
    'normalize preserves archived Stage 2 progress');
  exact(migrated.systems.gathering, stage2Before.systems.gathering,
    'normalize preserves gathering state');
  exact(migrated.systems.homestead, stage2Before.systems.homestead,
    'normalize preserves homestead state');
  exact(stage2, stage2Before, 'normalize never mutates its input');
  ok(typeof Stage3State.migrateV3 !== 'function',
    'Stage3State.migrateV3 is removed');

  function stage3Model() {
    const base = Stage2State.createDefaults();
    const increment = Stage3State.defaults();
    base.player.techniques = increment.player.techniques;
    base.player.combat = increment.player.combat;
    base.player.combatProgress = increment.player.combatProgress;
    base.player.breakthrough = increment.player.breakthrough;
    base.systems.combat = increment.systems.combat;
    base.pendingOfflineReports = [];
    base.current = null;
    base.processedThroughMs = 1000.125;
    base.rngState = 123;
    return base;
  }

  function validSession() {
    return {
      mode: 'region',
      actionKey: 'combat:region:qingyunOutskirts:thornHare',
      regionId: 'qingyunOutskirts',
      enemyId: 'thornHare',
      dungeonId: null,
      waveIndex: 0,
      waveDefeated: 0,
      bossPhase: 0,
      intermissionTicks: 0,
      elapsedTicks: 7,
      tickRemainderSeconds: 0.1,
      lastPlayerAction: {
        id: 'cloudPiercingSword',
        slotIndex: 0,
        tick: 0
      },
      loadoutId: 'loadout-1',
      loadoutSnapshot: {
        activeTechniques: [{
          techniqueId: 'cloudPiercingSword',
          condition: { type: 'always' }
        }],
        passiveTechniques: ['steadyBreath', null, null, null, null],
        supplies: {
          food: {
            itemId: 'grilledCarp',
            triggerRatio: 0.5,
            stopWhenEmpty: false
          },
          pill: {
            itemId: 'healingPill',
            triggerRatio: 0.3,
            stopWhenEmpty: false
          },
          talisman: {
            itemId: 'wardTalisman',
            useAt: 'enemy_start',
            stopWhenEmpty: false
          }
        },
        techniqueLevels: {
          cloudPiercingSword: 3,
          steadyBreath: 2
        },
        derivedStats: {
          maxHp: 100,
          maxQi: 100,
          attack: 12,
          defense: 5,
          accuracy: 75,
          evasion: 5,
          critChance: 0.05,
          attackIntervalTicks: 8
        },
        hasActiveBeast: true,
        realmIndex: 0,
        unlockedActiveSlots: 1,
        unlockedPassiveSlots: 1
      },
      player: {
        hp: 90,
        maxHp: 100,
        qi: 80,
        maxQi: 100,
        attack: 12,
        defense: 5,
        accuracy: 75,
        evasion: 5,
        critChance: 0.05,
        attackIntervalTicks: 8,
        cooldownTicks: 3,
        shield: 0,
        buffs: {},
        statuses: {},
        techniqueCooldowns: { cloudPiercingSword: 4 }
      },
      enemy: {
        id: 'thornHare',
        hp: 22,
        maxHp: 45,
        attack: 8,
        defense: 3,
        accuracy: 71,
        evasion: 6,
        attackIntervalTicks: 8,
        cooldownTicks: 2,
        phase: 0,
        buffs: {},
        statuses: {}
      }
    };
  }

  function validFinalBossSession() {
    const session = validSession();
    session.mode = 'dungeon';
    session.actionKey = 'combat:dungeon:ascensionTrial';
    session.regionId = 'ascensionTerrace';
    session.enemyId = 'ninefoldTribulation';
    session.dungeonId = 'ascensionTrial';
    session.waveIndex = 3;
    session.waveDefeated = 0;
    session.bossPhase = 1;
    session.enemy.id = 'ninefoldTribulation';
    session.enemy.phase = 1;
    return session;
  }

  function validDungeonIntermissionSession() {
    const session = validSession();
    session.mode = 'dungeon';
    session.actionKey = 'combat:dungeon:breathCave';
    session.regionId = 'qingyunOutskirts';
    session.enemyId = 'thornHare';
    session.dungeonId = 'breathCave';
    session.waveIndex = 0;
    session.waveDefeated = 1;
    session.bossPhase = 0;
    session.intermissionTicks = 4;
    session.enemy = null;
    return session;
  }

  const normalizedActiveRegion = Stage3State.normalizeSession(validSession());
  ok(!!normalizedActiveRegion &&
    normalizedActiveRegion.enemy.hp === 22 &&
    normalizedActiveRegion.intermissionTicks === 0,
  'region active phase is canonical');
  const deadRegionSession = validSession();
  deadRegionSession.enemy.hp = 0;
  const normalizedDeadRegion =
    Stage3State.normalizeSession(deadRegionSession);
  ok(!!normalizedDeadRegion &&
    normalizedDeadRegion.enemy.hp === 0 &&
    normalizedDeadRegion.intermissionTicks === 0,
  'region dead-awaiting-settlement phase is canonical');
  const regionIntermissionSession = validSession();
  regionIntermissionSession.enemy = null;
  regionIntermissionSession.intermissionTicks = 4;
  const normalizedRegionIntermission =
    Stage3State.normalizeSession(regionIntermissionSession);
  ok(!!normalizedRegionIntermission &&
    normalizedRegionIntermission.enemy === null &&
    normalizedRegionIntermission.intermissionTicks === 4,
  'region intermission phase is canonical');
  ok(!!Stage3State.normalizeSession(validDungeonIntermissionSession()),
    'dungeon intermission before the group count is canonical');
  const legacyTelemetrySession = validSession();
  delete legacyTelemetrySession.lastPlayerAction;
  ok(
    Stage3State.normalizeSession(legacyTelemetrySession)
      .lastPlayerAction === null,
    'a pre-telemetry combat session upgrades to an explicit null action'
  );

  function recoveryModel(session) {
    const input = stage3Model();
    input.player.techniques.known = {
      cloudPiercingSword: { level: 3, xp: 19 },
      steadyBreath: { level: 2, xp: 7 }
    };
    input.player.combatProgress = {
      enemyKills: { thornHare: 19 },
      regionKills: { qingyunOutskirts: 8 },
      dungeonClears: { breathCave: 3 },
      firstClears: { breathCave: true },
      completedGates: { 'kill:thornHare:3': true }
    };
    input.player.inventory.stacks = {
      healingPill: 4,
      spiritRice: 2
    };
    input.player.skills.herb = { level: 12, xp: 34 };
    input.player.mastery.herb.parityHerb1 = { level: 7, xp: 8 };
    input.systems.combat.session = session || validSession();
    input.current = {
      key: input.systems.combat.session.actionKey,
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      elapsedAnchorMs: null,
      elapsedBaseSeconds: null,
      stalled: false
    };
    return input;
  }

  function preservedRecoveryBranches(model) {
    return {
      techniques: model.player.techniques,
      completedGates: model.player.combatProgress.completedGates,
      enemyKills: model.player.combatProgress.enemyKills,
      regionKills: model.player.combatProgress.regionKills,
      dungeonClears: model.player.combatProgress.dungeonClears,
      firstClears: model.player.combatProgress.firstClears,
      inventory: model.player.inventory,
      skills: model.player.skills,
      mastery: model.player.mastery
    };
  }

  function currentAction(key) {
    return {
      key: key,
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      elapsedAnchorMs: null,
      elapsedBaseSeconds: null,
      stalled: false
    };
  }

  const midCombat = stage3Model();
  midCombat.player.techniques.known = {
    cloudPiercingSword: { level: 3, xp: 19 },
    steadyBreath: { level: 2, xp: 7 }
  };
  midCombat.systems.combat.session = validSession();
  midCombat.current = {
    key: 'combat:region:qingyunOutskirts:thornHare',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 1.75,
    elapsedAnchorMs: 1000.125,
    elapsedBaseSeconds: 1.75,
    stalled: false
  };
  const roundTrip = JSON.parse(JSON.stringify(Stage3State.normalize(midCombat)));
  ok(roundTrip.systems.combat.session.elapsedTicks === 7 &&
     roundTrip.systems.combat.session.tickRemainderSeconds === 0.1,
  'mid-combat session survives JSON round-trip');
  ok(roundTrip.systems.combat.session.player.hp === 90 &&
     roundTrip.systems.combat.session.enemy.hp === 22 &&
     roundTrip.current.key ===
       'combat:region:qingyunOutskirts:thornHare',
  'mid-combat actors and main action survive JSON round-trip');
  exact(roundTrip.systems.combat.session.loadoutSnapshot,
    midCombat.systems.combat.session.loadoutSnapshot,
    'mid-combat loadout snapshot survives JSON round-trip');
  exact(roundTrip.systems.combat.session.lastPlayerAction, {
    id: 'cloudPiercingSword',
    slotIndex: 0,
    tick: 0
  }, 'last executed player action survives JSON round-trip');

  const conditionInput = stage3Model();
  conditionInput.player.combat.loadouts[0].activeTechniques = [
    {
      techniqueId: 'cloudPiercingSword',
      condition: { type: 'always', threshold: 0.2 }
    },
    {
      techniqueId: 'returningWindSlash',
      condition: { type: 'selfHpBelow', threshold: -9, extra: true }
    },
    {
      techniqueId: 'stoneBreakingFist',
      condition: { type: 'selfQiAbove', threshold: 9 }
    }
  ];
  conditionInput.player.combat.loadouts.push({
    id: 'loadout-2',
    name: '条件',
    equipment: { weapon: null, armor: null, accessory: null },
    activeTechniques: [
      {
        techniqueId: 'clearHeartArt',
        condition: { type: 'enemyHasStatus', statusId: 'shock', extra: 1 }
      },
      {
        techniqueId: 'gatheringBreath',
        condition: { type: 'selfMissingBuff', buffId: 'haste' }
      },
      {
        techniqueId: 'thunderSeal',
        condition: { type: 'unknown', threshold: 0.2 }
      }
    ],
    passiveTechniques: [null, null, null, null, null],
    supplies: copy(Stage3State.defaults()
      .player.combat.loadouts[0].supplies)
  });
  const normalizedConditions = Stage3State.normalize(conditionInput)
    .player.combat.loadouts;
  exact(normalizedConditions[0].activeTechniques.map((slot) => slot.condition), [
    { type: 'always' },
    { type: 'selfHpBelow', threshold: 0.01 },
    { type: 'selfQiAbove', threshold: 1 }
  ], 'numeric conditions normalize to their exact allowed shapes');
  exact(normalizedConditions[1].activeTechniques.map((slot) => slot.condition), [
    { type: 'enemyHasStatus', statusId: 'shock' },
    { type: 'selfMissingBuff', buffId: 'haste' },
    { type: 'always' }
  ], 'string and unknown conditions normalize to exact allowed shapes');

  function warningCount(model) {
    const reports = Array.isArray(model.pendingOfflineReports)
      ? model.pendingOfflineReports
      : model.pendingOfflineReport &&
          Array.isArray(model.pendingOfflineReport.reports)
        ? model.pendingOfflineReport.reports
        : [];
    return reports.reduce((total, report) =>
      total + (Array.isArray(report.warnings)
        ? report.warnings.filter((warning) =>
          warning === 'invalid_combat_session_recovered').length
        : 0), 0);
  }

  const invalidSessionCases = [
    ['unknown region', validSession,
      (session) => { session.regionId = 'missingRegion'; }],
    ['unknown enemy', validSession,
      (session) => { session.enemyId = 'missingEnemy'; }],
    ['unknown dungeon', validSession, (session) => {
      session.mode = 'dungeon';
      session.actionKey = 'combat:dungeon:missingDungeon';
      session.regionId = null;
      session.enemyId = null;
      session.dungeonId = 'missingDungeon';
      session.enemy = null;
    }],
    ['mode/actionKey mismatch', validSession, (session) => {
      session.actionKey = 'combat:dungeon:breathCave';
    }],
    ['invalid mode', validSession, (session) => {
      session.mode = 'arena';
    }],
    ['unknown loadout', validSession,
      (session) => { session.loadoutId = 'loadout-404'; }],
    ['unknown active technique', validSession, (session) => {
      session.loadoutSnapshot.activeTechniques[0].techniqueId =
        'missingTechnique';
    }],
    ['passive in active slot', validSession, (session) => {
      session.loadoutSnapshot.activeTechniques[0].techniqueId =
        'steadyBreath';
    }],
    ['non-record active slot', validSession, (session) => {
      session.loadoutSnapshot.activeTechniques[0] = 7;
    }],
    ['active in passive slot', validSession, (session) => {
      session.loadoutSnapshot.passiveTechniques[0] =
        'cloudPiercingSword';
    }],
    ['non-string passive slot', validSession, (session) => {
      session.loadoutSnapshot.passiveTechniques[0] = 7;
    }],
    ['unknown technique level', validSession, (session) => {
      session.loadoutSnapshot.techniqueLevels.missingTechnique = 4;
    }],
    ['non-record technique levels', validSession, (session) => {
      session.loadoutSnapshot.techniqueLevels = [];
    }],
    ['missing derived combat stats', validSession, (session) => {
      delete session.loadoutSnapshot.derivedStats;
    }],
    ['extra derived combat stat', validSession, (session) => {
      session.loadoutSnapshot.derivedStats.breakthroughChance = 1;
    }],
    ['non-finite derived combat stat', validSession, (session) => {
      session.loadoutSnapshot.derivedStats.attack = NaN;
    }],
    ['invalid derived attack interval', validSession, (session) => {
      session.loadoutSnapshot.derivedStats.attackIntervalTicks = 1.5;
    }],
    ['invalid active-beast snapshot seam', validSession, (session) => {
      session.loadoutSnapshot.hasActiveBeast = 'yes';
    }],
    ['unknown food item', validSession, (session) => {
      session.loadoutSnapshot.supplies.food.itemId = 'missingItem';
    }],
    ['wrong food supply type', validSession, (session) => {
      session.loadoutSnapshot.supplies.food.itemId = 'wardTalisman';
    }],
    ['unknown pill item', validSession, (session) => {
      session.loadoutSnapshot.supplies.pill.itemId = 'missingItem';
    }],
    ['wrong pill supply type', validSession, (session) => {
      session.loadoutSnapshot.supplies.pill.itemId = 'grilledCarp';
    }],
    ['unknown talisman item', validSession, (session) => {
      session.loadoutSnapshot.supplies.talisman.itemId = 'missingItem';
    }],
    ['wrong talisman supply type', validSession, (session) => {
      session.loadoutSnapshot.supplies.talisman.itemId = 'healingPill';
    }],
    ['unknown last player action', validSession, (session) => {
      session.lastPlayerAction.id = 'missingTechnique';
    }],
    ['last player action slot mismatch', validSession, (session) => {
      session.lastPlayerAction.slotIndex = 1;
    }],
    ['future last player action tick', validSession, (session) => {
      session.lastPlayerAction.tick = session.elapsedTicks;
    }],
    ['normal attack with a technique slot', validSession, (session) => {
      session.lastPlayerAction = {
        id: 'normalAttack',
        slotIndex: 0,
        tick: 0
      };
    }],
    ['unknown enemy actor', validSession,
      (session) => { session.enemy.id = 'missingEnemy'; }],
    ['non-plain player actor', validSession,
      (session) => { session.player = []; }],
    ['non-JSON player buff', validSession, (session) => {
      session.player.buffs.bad = function () {};
    }],
    ['non-JSON player status', validSession, (session) => {
      session.player.statuses.bad = new Date(0);
    }],
    ['non-JSON enemy buff', validSession, (session) => {
      session.enemy.buffs.bad = function () {};
    }],
    ['non-JSON enemy status', validSession, (session) => {
      session.enemy.statuses.bad = new Date(0);
    }],
    ['region wave index', validSession,
      (session) => { session.waveIndex = 1; }],
    ['region defeated count', validSession,
      (session) => { session.waveDefeated = 1; }],
    ['region boss phase', validSession,
      (session) => { session.bossPhase = 1; }],
    ['live enemy with intermission', validSession,
      (session) => { session.intermissionTicks = 1; }],
    ['dead enemy with intermission', validSession, (session) => {
      session.enemy.hp = 0;
      session.intermissionTicks = 1;
    }],
    ['missing enemy without intermission', validSession,
      (session) => { session.enemy = null; }],
    ['dungeon region mismatch', validFinalBossSession, (session) => {
      session.regionId = 'qingyunOutskirts';
    }],
    ['dungeon enemy/wave mismatch', validFinalBossSession, (session) => {
      session.enemyId = 'cloudGeneral';
      session.enemy.id = 'cloudGeneral';
    }],
    ['dungeon wave out of range', validFinalBossSession,
      (session) => { session.waveIndex = 4; }],
    ['dungeon defeated count out of range', validFinalBossSession,
      (session) => { session.waveDefeated = 2; }],
    ['dungeon exhausted group intermission',
      validDungeonIntermissionSession, (session) => {
        session.waveDefeated = 2;
      }],
    ['dungeon intermission stale boss phase',
      validDungeonIntermissionSession, (session) => {
        session.bossPhase = 1;
      }],
    ['boss phase out of range', validFinalBossSession, (session) => {
      session.bossPhase = 2;
      session.enemy.phase = 2;
    }],
    ['enemy/session phase mismatch', validFinalBossSession,
      (session) => { session.enemy.phase = 0; }]
  ];
  invalidSessionCases.forEach(([label, createSession, mutate]) => {
    const input = recoveryModel(createSession());
    const preservedBefore = copy(preservedRecoveryBranches(input));
    mutate(input.systems.combat.session);
    const repaired = Stage3State.normalize(input);
    ok(repaired.systems.combat.session === null &&
       repaired.current === null,
    'invalid session clears session and combat action: ' + label);
    exact(preservedRecoveryBranches(repaired), preservedBefore,
      'invalid session preserves all player progress: ' + label);
    ok(warningCount(repaired) === 1,
      'invalid session appends exactly one recovery warning: ' + label);
  });

  const canonicalInvalidSessionCases = [
    ['fractional player attack interval', (session) => {
      session.player.attackIntervalTicks = 7.5;
    }],
    ['fractional player cooldown', (session) => {
      session.player.cooldownTicks = 1.5;
    }],
    ['negative player cooldown', (session) => {
      session.player.cooldownTicks = -1;
    }],
    ['fractional enemy attack interval', (session) => {
      session.enemy.attackIntervalTicks = 7.5;
    }],
    ['fractional enemy cooldown', (session) => {
      session.enemy.cooldownTicks = 1.5;
    }],
    ['negative enemy cooldown', (session) => {
      session.enemy.cooldownTicks = -1;
    }],
    ['fractional enemy phase', (session) => {
      session.enemy.phase = 0.5;
    }],
    ['fractional technique cooldown', (session) => {
      session.player.techniqueCooldowns.cloudPiercingSword = 1.5;
    }],
    ['negative technique cooldown', (session) => {
      session.player.techniqueCooldowns.cloudPiercingSword = -1;
    }],
    ['passive technique cooldown', (session) => {
      session.player.techniqueCooldowns.steadyBreath = 1;
    }],
    ['unknown technique cooldown', (session) => {
      session.player.techniqueCooldowns.missingTechnique = 1;
    }],
    ['fractional intermission ticks', (session) => {
      session.intermissionTicks = 0.5;
    }],
    ['negative intermission ticks', (session) => {
      session.intermissionTicks = -1;
    }],
    ['fractional elapsed ticks', (session) => {
      session.elapsedTicks = 7.5;
    }],
    ['negative elapsed ticks', (session) => {
      session.elapsedTicks = -1;
    }],
    ['fractional wave index', (session) => {
      session.waveIndex = 0.5;
    }],
    ['negative wave index', (session) => {
      session.waveIndex = -1;
    }],
    ['fractional defeated count', (session) => {
      session.waveDefeated = 0.5;
    }],
    ['negative defeated count', (session) => {
      session.waveDefeated = -1;
    }],
    ['fractional boss phase', (session) => {
      session.bossPhase = 0.5;
    }],
    ['negative boss phase', (session) => {
      session.bossPhase = -1;
    }],
    ['negative tick remainder', (session) => {
      session.tickRemainderSeconds = -0.1;
    }],
    ['out-of-range tick remainder', (session) => {
      session.tickRemainderSeconds = 0.25;
    }],
    ['fractional shock duration', (session) => {
      session.player.statuses.shock = {
        remainingTicks: 1.5,
        skipNextAction: false
      };
    }],
    ['wrong shock flag', (session) => {
      session.player.statuses.shock = {
        remainingTicks: 2,
        skipNextAction: 0
      };
    }],
    ['extra shock field', (session) => {
      session.player.statuses.shock = {
        remainingTicks: 2,
        skipNextAction: false,
        extra: true
      };
    }],
    ['wrong slow constant', (session) => {
      session.player.statuses.slow = {
        remainingTicks: 2,
        attackIntervalAdd: 1
      };
    }],
    ['wrong haste constant', (session) => {
      session.player.statuses.haste = {
        remainingTicks: 2,
        attackIntervalReduction: 0.2
      };
    }],
    ['unknown player status', (session) => {
      session.player.statuses.poison = { remainingTicks: 2 };
    }],
    ['fractional enemy status duration', (session) => {
      session.enemy.statuses.slow = {
        remainingTicks: 1.5,
        attackIntervalAdd: 2
      };
    }],
    ['unknown enemy status', (session) => {
      session.enemy.statuses.poison = { remainingTicks: 2 };
    }]
  ];
  canonicalInvalidSessionCases.forEach(function (entry) {
    const label = entry[0];
    const mutate = entry[1];
    const input = recoveryModel();
    mutate(input.systems.combat.session);
    const serializedInput = JSON.parse(JSON.stringify(input));
    [input, serializedInput].forEach(function (candidate, index) {
      const repaired = Stage3State.normalize(candidate);
      ok(
        repaired.systems.combat.session === null &&
          repaired.current === null &&
          warningCount(repaired) === 1,
        'canonical combat validation rejects ' + label +
          (index === 0 ? ' directly' : ' after JSON round-trip')
      );
    });
  });

  const prewarnedRecovery = recoveryModel();
  prewarnedRecovery.pendingOfflineReports = [{
    warnings: ['invalid_combat_session_recovered']
  }];
  prewarnedRecovery.systems.combat.session.regionId = 'missingRegion';
  const prewarnedRepaired = Stage3State.normalize(prewarnedRecovery);
  ok(prewarnedRepaired.current === null &&
     prewarnedRepaired.systems.combat.session === null &&
     warningCount(prewarnedRepaired) === 1,
  'combat session recovery never duplicates an existing warning');

  [
    ['missing current', null, null],
    ['noncombat current', currentAction('fish:pond'), 'fish:pond'],
    [
      'mismatched combat current',
      currentAction('combat:dungeon:breathCave'),
      null
    ]
  ].forEach(([label, current, expectedCurrentKey]) => {
    const input = recoveryModel();
    input.current = current;
    const preservedBefore = copy(preservedRecoveryBranches(input));
    const repaired = Stage3State.normalize(input);
    ok(repaired.systems.combat.session === null,
      'valid session without its exact combat current is recovered: ' + label);
    ok(expectedCurrentKey === null
      ? repaired.current === null
      : repaired.current && repaired.current.key === expectedCurrentKey,
    'session/current recovery preserves only a noncombat current: ' + label);
    exact(preservedRecoveryBranches(repaired), preservedBefore,
      'session/current recovery preserves long-term progress: ' + label);
    ok(warningCount(repaired) === 1,
      'session/current recovery appends one warning: ' + label);
  });

  const nullPlayerCombat = stage3Model();
  nullPlayerCombat.player = null;
  nullPlayerCombat.systems.combat.session = null;
  nullPlayerCombat.current = {
    key: 'combat:region:qingyunOutskirts:thornHare',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null,
    stalled: false
  };
  const nullPlayerCombatRepaired = Stage3State.normalize(nullPlayerCombat);
  ok(nullPlayerCombatRepaired.player === null &&
     nullPlayerCombatRepaired.systems.combat.session === null &&
     nullPlayerCombatRepaired.current === null &&
     warningCount(nullPlayerCombatRepaired) === 1,
  'player-null direct normalization clears a stranded combat action');

  const nullPlayerNonCombat = copy(nullPlayerCombat);
  nullPlayerNonCombat.current.key = 'fish:pond';
  const nullPlayerNonCombatNormalized =
    Stage3State.normalize(nullPlayerNonCombat);
  ok(nullPlayerNonCombatNormalized.player === null &&
     nullPlayerNonCombatNormalized.current.key === 'fish:pond' &&
     warningCount(nullPlayerNonCombatNormalized) === 0,
  'player-null normalization preserves a noncombat current action');

  const nonCombatAction = stage3Model();
  nonCombatAction.systems.combat.session = validSession();
  nonCombatAction.systems.combat.session.regionId = 'missingRegion';
  nonCombatAction.current = {
    key: 'fish:pond',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null,
    stalled: false
  };
  const nonCombatRepaired = Stage3State.normalize(nonCombatAction);
  ok(nonCombatRepaired.systems.combat.session === null &&
     nonCombatRepaired.current.key === 'fish:pond' &&
     warningCount(nonCombatRepaired) === 1,
  'invalid session clears only combat state and warns once');

  const corruptBranches = stage3Model();
  corruptBranches.player.techniques.known = {
    cloudPiercingSword: { level: 3.9, xp: 17.8 },
    missingTechnique: { level: 9, xp: 99 }
  };
  corruptBranches.player.combat.activeLoadoutId = 'missing-loadout';
  corruptBranches.player.combat.nextLoadoutId = -7;
  corruptBranches.player.combat.loadouts = [{
    id: 'loadout-9',
    name: 7,
    equipment: {
      weapon: 'cloudwoodSword',
      armor: 'missingItem',
      accessory: 'cloudRobe'
    },
    activeTechniques: [
      {
        techniqueId: 'cloudPiercingSword',
        condition: { type: 'always' }
      },
      {
        techniqueId: 'missingTechnique',
        condition: { type: 'always' }
      }
    ],
    passiveTechniques: ['steadyBreath', 'missingTechnique'],
    supplies: {
      food: {
        itemId: 'wardTalisman',
        triggerRatio: Infinity,
        stopWhenEmpty: 1
      },
      pill: {
        itemId: 'missingItem',
        triggerRatio: -2,
        stopWhenEmpty: true
      },
      talisman: {
        itemId: 'wardTalisman',
        useAt: 'later',
        stopWhenEmpty: true
      }
    }
  }, {
    id: '',
    name: 'drop me'
  }];
  corruptBranches.player.combat.injury = {
    id: 'severe-injury',
    remainingSeconds: -10,
    totalSeconds: Infinity
  };
  corruptBranches.player.combatProgress = {
    enemyKills: { thornHare: 3.9, missingEnemy: 90 },
    regionKills: { qingyunOutskirts: 4.9, missingRegion: 9 },
    dungeonClears: { breathCave: 2.9, missingDungeon: 8 },
    firstClears: { breathCave: true, missingDungeon: true },
    completedGates: {
      'kill:thornHare:3': true,
      'missing:gate': true
    }
  };
  corruptBranches.player.breakthrough = {
    realmId: 'missingRealm',
    cultivation: -20,
    eventBuffs: [{
      id: 'fortune',
      bonus: Infinity,
      usesRemaining: -1
    }]
  };
  corruptBranches.systems.combat.pendingLoot = {
    id: 'combat-loot-8',
    source: { type: 'enemy', id: 'thornHare' },
    items: { cloudwoodSword: 1, missingItem: 2 },
    currency: 7,
    createdAtMs: 100
  };
  corruptBranches.systems.combat.nextLootId = -2;
  const repairedBranches = Stage3State.normalize(corruptBranches);
  exact(repairedBranches.player.techniques.known, {
    cloudPiercingSword: { level: 3, xp: 17 }
  }, 'unknown techniques are rejected and known progress clamps');
  ok(repairedBranches.player.combat.activeLoadoutId === 'loadout-9' &&
     repairedBranches.player.combat.nextLoadoutId === 11 &&
     repairedBranches.player.combat.loadouts.length === 2 &&
     repairedBranches.player.combat.loadouts[1].id === 'loadout-10',
  'corrupt loadout IDs repair locally with a collision-free counter');
  exact(repairedBranches.player.combat.loadouts[0].equipment, {
    weapon: null,
    head: null,
    robe: null,
    bracer: null,
    belt: null,
    boots: null,
    accessory: null,
    artifact: null
  }, 'equipment references require an owned known item in the matching slot');
  exact(repairedBranches.player.combat.loadouts[0].activeTechniques, [
    {
      techniqueId: 'cloudPiercingSword',
      condition: { type: 'always' }
    },
    { techniqueId: null, condition: { type: 'always' } },
    { techniqueId: null, condition: { type: 'always' } }
  ], 'active technique references recover in place and pad to three slots');
  exact(repairedBranches.player.combat.loadouts[0].passiveTechniques,
    [null, null, null, null, null],
    'passive technique references must be learned and pad to five slots');
  exact(repairedBranches.player.combat.loadouts[0].supplies, {
    food: { itemId: null, triggerRatio: 0.5, stopWhenEmpty: true },
    pill: { itemId: null, triggerRatio: 0.05, stopWhenEmpty: true },
    talisman: {
      itemId: 'wardTalisman',
      useAt: 'enemy_start',
      stopWhenEmpty: true
    }
  }, 'supply references, safe ratios, booleans and use timing recover locally');
  exact(repairedBranches.player.combatProgress, {
    enemyKills: { thornHare: 3 },
    regionKills: { qingyunOutskirts: 4 },
    dungeonClears: { breathCave: 2 },
    firstClears: { breathCave: true },
    completedGates: { 'kill:thornHare:3': true }
  }, 'unknown enemy, region, dungeon and gate progress is rejected');
  ok(repairedBranches.player.breakthrough.realmId === 'qi-1' &&
     repairedBranches.player.breakthrough.cultivation === 0 &&
     repairedBranches.player.breakthrough.eventBuffs[0].bonus === 0 &&
     repairedBranches.player.breakthrough.eventBuffs[0].usesRemaining === 0,
  'breakthrough branch recovers to finite non-negative progress');
  ok(repairedBranches.systems.combat.pendingLoot === null &&
     repairedBranches.systems.combat.nextLootId === 1,
  'pending loot with an unknown item is rejected without touching inventory');
  ok(repairedBranches.player.combat.injury.remainingSeconds === 0 &&
     repairedBranches.player.combat.injury.remainingSecondsExact === '0' &&
     repairedBranches.player.combat.injury.totalSeconds === 0,
  'injury timers clamp to finite non-negative values');

  const hostileOperability = stage3Model();
  hostileOperability.player.inventory.stacks = {
    cloudwoodSword: 1,
    cloudRobe: 1
  };
  hostileOperability.player.inventory.bindings = {
    cloudwoodSword: { equipment: 0, task: 0, formation: 0 },
    cloudRobe: { equipment: 1, task: 0, formation: 0 }
  };
  hostileOperability.player.techniques.known = {
    cloudPiercingSword: { level: 20, xp: 999999 },
    returningWindSlash: { level: 2, xp: 325 },
    steadyBreath: { level: 1, xp: 0 }
  };
  const hostileLoadouts = [];
  for (let index = 0; index < 6; index++) {
    const loadout = copy(Stage3State.defaults().player.combat.loadouts[0]);
    loadout.id = index < 2 ? 'loadout-1' : 'hostile id ' + index;
    loadout.name = index < 2 ? '  重复  ' : '';
    loadout.equipment.weapon = 'cloudwoodSword';
    loadout.equipment.armor = index === 0 ? 'cloudRobe' : 'missingItem';
    loadout.activeTechniques[0].techniqueId = 'cloudPiercingSword';
    loadout.activeTechniques[1].techniqueId = 'cloudPiercingSword';
    loadout.activeTechniques[2].techniqueId = 'unlearnedTechnique';
    loadout.passiveTechniques = [
      'steadyBreath',
      'steadyBreath',
      'cloudPiercingSword'
    ];
    loadout.supplies.food.triggerRatio = 0.01;
    loadout.supplies.pill.triggerRatio = 1;
    hostileLoadouts.push(loadout);
  }
  hostileOperability.player.combat.loadouts = hostileLoadouts;
  hostileOperability.player.combat.activeLoadoutId = 'hostile id 5';
  hostileOperability.player.combat.nextLoadoutId = 2;
  const operable = Stage3State.normalize(hostileOperability);
  ok(
    operable.player.techniques.known.cloudPiercingSword.xp < 999999 &&
      operable.player.techniques.known.returningWindSlash.xp < 325 &&
      operable.player.techniques.known.cloudPiercingSword.xp >= 0 &&
      operable.player.techniques.known.returningWindSlash.xp >= 0,
    'technique recovery enforces capped XP and the neutral next-level threshold'
  );
  ok(
    operable.player.combat.loadouts.length === 5 &&
      new Set(operable.player.combat.loadouts.map((entry) => entry.id))
        .size === 5 &&
      new Set(operable.player.combat.loadouts.map((entry) => entry.name))
        .size === 5 &&
      operable.player.combat.loadouts.some((entry) =>
        entry.id === operable.player.combat.activeLoadoutId),
    'hostile loadout recovery yields at most five unique IDs and names'
  );
  ok(operable.player.combat.loadouts.every((loadout) => {
    const ids = loadout.activeTechniques
      .map((slot) => slot.techniqueId)
      .concat(loadout.passiveTechniques)
      .filter(Boolean);
    return new Set(ids).size === ids.length &&
      loadout.supplies.food.triggerRatio >= 0.05 &&
      loadout.supplies.food.triggerRatio <= 0.95 &&
      loadout.supplies.pill.triggerRatio >= 0.05 &&
      loadout.supplies.pill.triggerRatio <= 0.95;
  }), 'loadout recovery removes invalid/unlearned/duplicate techniques and clamps ratios');
  ok(
    operable.player.inventory.equipment.instances.length === 2 &&
      operable.player.inventory.equipment.instances.some((item) =>
        item.source && item.source.sourceId === 'cloudwoodSword') &&
      operable.player.inventory.equipment.instances.some((item) =>
        item.source && item.source.sourceId === 'cloudRobe') &&
      Object.keys(operable.player.inventory.bindings).length === 0 &&
      operable.player.combat.loadouts[0].equipment.weapon ===
        'legacy-cloudwoodSword-1' &&
      operable.player.combat.loadouts[0].equipment.robe ===
        'legacy-cloudRobe-1',
    'loadout recovery reconciles equipment bindings to retained references'
  );  const operableQuery = CombatLoadouts.query(operable);
  ok(operableQuery.loadouts.length === 5,
    'recovered hostile loadouts remain queryable');
  const operableRename = CombatLoadouts.rename(
    operable,
    operable.player.combat.loadouts[0].id,
    '可修改'
  );
  ok(operableRename.ok === true,
    'recovered hostile loadouts remain mutable');
  const operableRoundTrip = Stage3State.normalize(copy(operable));
  exact(operableRoundTrip, operable,
    'hostile recovery is deterministic across JSON round-trip');

  const exhaustedCountersModel = stage3Model();
  exhaustedCountersModel.player.combatProgress.enemyKills.thornHare =
    Number.MAX_SAFE_INTEGER;
  exhaustedCountersModel.player.combatProgress.regionKills.qingyunOutskirts =
    Number.MAX_SAFE_INTEGER;
  exhaustedCountersModel.player.combatProgress.dungeonClears.breathCave =
    Number.MAX_SAFE_INTEGER;
  exhaustedCountersModel.player.combat.nextLoadoutId =
    Number.MAX_SAFE_INTEGER;
  exhaustedCountersModel.systems.combat.nextLootId =
    Number.MAX_SAFE_INTEGER;
  const recoveredCounters = Stage3State.normalize(exhaustedCountersModel);
  ok(
    recoveredCounters.player.combatProgress.enemyKills.thornHare <
      Number.MAX_SAFE_INTEGER &&
      recoveredCounters.player.combatProgress.regionKills.qingyunOutskirts <
        Number.MAX_SAFE_INTEGER &&
      recoveredCounters.player.combatProgress.dungeonClears.breathCave <
        Number.MAX_SAFE_INTEGER,
    'exhausted combat progress counters recover with increment headroom'
  );
  const firstRecoveredLoadout = CombatLoadouts.create(
    recoveredCounters,
    '恢复方案二'
  );
  const secondRecoveredLoadout = firstRecoveredLoadout.ok
    ? CombatLoadouts.create(firstRecoveredLoadout.state, '恢复方案三')
    : firstRecoveredLoadout;
  ok(
    firstRecoveredLoadout.ok === true &&
      secondRecoveredLoadout.ok === true &&
      firstRecoveredLoadout.result.id !== secondRecoveredLoadout.result.id,
    'exhausted loadout counter recovers to stable unique incrementable IDs'
  );
  const lootRecovery = copy(recoveredCounters);
  lootRecovery.player.inventory.stacks = {};
  ItemContent.list().filter(function (item) {
    return item.id !== 'brokenFang';
  }).slice(0, lootRecovery.player.inventory.capacity)
    .forEach(function (item) {
      lootRecovery.player.inventory.stacks[item.id] = 1;
    });
  lootRecovery.player.inventory.bindings = {};
  const recoveredLoot = CombatRewards.applyOrPend(lootRecovery, {
    ok: true,
    code: 'ok',
    source: { type: 'enemy', id: 'thornHare' },
    items: { brokenFang: 1 },
    currency: 0,
    rngState: lootRecovery.rngState
  }, 1);
  ok(
    recoveredLoot.ok &&
      recoveredLoot.code === 'inventory_full' &&
      recoveredLoot.state.systems.combat.pendingLoot.id === 'combat-loot-1' &&
      recoveredLoot.state.systems.combat.nextLootId === 2,
    'exhausted loot counter recovers to a reachable incrementable ID'
  );
  const recoveredCounterRoundTrip = Stage3State.normalize(
    copy(recoveredLoot.state)
  );
  exact(
    recoveredCounterRoundTrip,
    recoveredLoot.state,
    'recovered combat counters and generated IDs survive save/reload exactly'
  );

  const validPendingModel = stage3Model();
  validPendingModel.systems.combat.pendingLoot = {
    id: 'combat-loot-7',
    source: { type: 'enemy', id: 'thornHare' },
    items: { brokenFang: 2 },
    currency: 0,
    createdAtMs: 123.5
  };
  validPendingModel.systems.combat.nextLootId = 8;
  const validPending = Stage3State.normalize(validPendingModel);
  exact(validPending.systems.combat.pendingLoot,
    validPendingModel.systems.combat.pendingLoot,
    'exact CombatRewards-canonical pending loot survives recovery');
  exact(CombatRewards.queryPending(validPending),
    validPendingModel.systems.combat.pendingLoot,
    'recovered canonical pending loot remains publicly claimable');
  const claimedPending = CombatRewards.claimPending(validPending);
  ok(claimedPending.ok === true &&
     claimedPending.state.systems.combat.pendingLoot === null &&
     CombatRewards.claimPending(claimedPending.state).code ===
       'no_pending_loot',
  'recovered pending loot can be claimed exactly once');

  [
    ['forged id', (pending) => { pending.id = 'loot-7'; }],
    ['id correlation', (pending) => {}],
    ['non-reward item', (pending) => {
      pending.items = { spiritRice: 1 };
    }],
    ['fractional quantity', (pending) => {
      pending.items = { brokenFang: 1.5 };
    }],
    ['unsafe quantity', (pending) => {
      pending.items = { brokenFang: Number.MAX_SAFE_INTEGER + 1 };
    }],
    ['fractional currency', (pending) => { pending.currency = 0.5; }],
    ['unsafe currency', (pending) => {
      pending.currency = Number.MAX_SAFE_INTEGER + 1;
    }],
    ['source-forged item', (pending) => {
      pending.items = { brokenFang: 1, ascensionBlade: 1 };
    }],
    ['source-forged quantity', (pending) => {
      pending.items = { brokenFang: 3 };
    }],
    ['source-forged currency', (pending) => {
      pending.currency = Number.MAX_SAFE_INTEGER;
    }],
    ['separator-colliding item id', (pending) => {
      pending.items = { 'brokenFang:1|grilledCarp': 1 };
    }],
    ['negative timestamp', (pending) => { pending.createdAtMs = -1; }]
  ].forEach(function (fixture) {
    const malformed = stage3Model();
    malformed.systems.combat.pendingLoot =
      copy(validPendingModel.systems.combat.pendingLoot);
    malformed.systems.combat.nextLootId =
      fixture[0] === 'id correlation' ? 9 : 8;
    fixture[1](malformed.systems.combat.pendingLoot);
    const recovered = Stage3State.normalize(malformed);
    const eligibility = CombatProgress.canStartRegion(
      recovered,
      'qingyunOutskirts',
      'thornHare'
    );
    const claimAfterRecovery = CombatRewards.claimPending(recovered);
    ok(
      recovered.systems.combat.pendingLoot === null &&
        eligibility.ok === true &&
        claimAfterRecovery.code === 'no_pending_loot' &&
        claimAfterRecovery.state === recovered,
      'malformed pending loot clears without blocking combat: ' + fixture[0]
    );
  });

  let pendingAccessorRuns = 0;
  const accessorPendingModel = stage3Model();
  const accessorPending = {
    id: 'combat-loot-7',
    items: { brokenFang: 1 },
    currency: 0,
    createdAtMs: 1
  };
  Object.defineProperty(accessorPending, 'source', {
    enumerable: true,
    get() {
      pendingAccessorRuns++;
      throw new Error('pending source accessor must not run');
    }
  });
  accessorPendingModel.systems.combat.pendingLoot = accessorPending;
  accessorPendingModel.systems.combat.nextLootId = 8;
  let accessorPendingRecovered = null;
  try {
    accessorPendingRecovered = Stage3State.normalize(accessorPendingModel);
  } catch (error) {
    accessorPendingRecovered = null;
  }
  ok(
    accessorPendingRecovered &&
      accessorPendingRecovered.systems.combat.pendingLoot === null &&
      pendingAccessorRuns === 0,
    'hostile pending-loot accessors fail closed without invocation'
  );
  let pendingItemAccessorRuns = 0;
  const accessorItemsModel = stage3Model();
  const accessorItems = {};
  Object.defineProperty(accessorItems, 'brokenFang', {
    enumerable: true,
    get() {
      pendingItemAccessorRuns++;
      throw new Error('pending item accessor must not run');
    }
  });
  accessorItemsModel.systems.combat.pendingLoot = {
    id: 'combat-loot-7',
    source: { type: 'enemy', id: 'thornHare' },
    items: accessorItems,
    currency: 0,
    createdAtMs: 1
  };
  accessorItemsModel.systems.combat.nextLootId = 8;
  const accessorItemsRecovered = Stage3State.normalize(
    accessorItemsModel
  );
  ok(
    accessorItemsRecovered.systems.combat.pendingLoot === null &&
      pendingItemAccessorRuns === 0,
    'hostile pending item accessors fail closed without invocation'
  );

  const legacyInjury = stage3Model();
  legacyInjury.player.combat.injury = {
    id: 'severe-injury',
    remainingSeconds: 1e-7,
    totalSeconds: 1800
  };
  exact(Stage3State.normalize(legacyInjury).player.combat.injury, {
    id: 'severe-injury',
    remainingSeconds: 1e-7,
    remainingSecondsExact: '0.0000001',
    totalSeconds: 1800
  }, 'legacy injury saves migrate to canonical exact decimal time');

  const legalExactInjury = stage3Model();
  legalExactInjury.player.combat.injury = {
    id: 'severe-injury',
    remainingSeconds: Number('1799.9999999999997'),
    remainingSecondsExact: '1799.9999999999997',
    totalSeconds: 1800
  };
  const legalExactNormalized = Stage3State.normalize(legalExactInjury);
  exact(legalExactNormalized.player.combat.injury, {
    id: 'severe-injury',
    remainingSeconds: Number('1799.9999999999997'),
    remainingSecondsExact: '1799.9999999999997',
    totalSeconds: 1800
  }, 'canonical exact injury time and field order are preserved');
  ok(
    JSON.stringify(Stage3State.normalize(copy(legalExactNormalized))) ===
      JSON.stringify(legalExactNormalized),
    'legal exact injury save bytes are stable across reload'
  );

  [
    {
      remainingSeconds: 1,
      remainingSecondsExact: '1.0',
      totalSeconds: 1800
    },
    {
      remainingSeconds: 1,
      remainingSecondsExact: '2',
      totalSeconds: 1800
    },
    {
      remainingSeconds: 1800,
      remainingSecondsExact: '1800.0000000000001',
      totalSeconds: 1800
    },
    {
      remainingSeconds: 1,
      remainingSecondsExact: {},
      totalSeconds: 1800
    }
  ].forEach((invalid, index) => {
    const model = stage3Model();
    model.player.combat.injury = Object.assign(
      { id: 'severe-injury' },
      invalid
    );
    ok(Stage3State.normalize(model).player.combat.injury === null,
      'invalid exact injury form fails closed #' + (index + 1));
  });

  const accessorExactInjury = stage3Model();
  let exactAccessorReads = 0;
  const hostileInjury = {
    id: 'severe-injury',
    remainingSeconds: 1,
    totalSeconds: 1800
  };
  Object.defineProperty(hostileInjury, 'remainingSecondsExact', {
    enumerable: true,
    get() {
      exactAccessorReads++;
      throw new Error('exact injury accessor must not run');
    }
  });
  accessorExactInjury.player.combat.injury = hostileInjury;
  let accessorExactResult = null;
  try {
    accessorExactResult = Stage3State.normalize(accessorExactInjury);
  } catch (error) {
    accessorExactResult = null;
  }
  ok(accessorExactResult &&
     accessorExactResult.player.combat.injury === null &&
     exactAccessorReads === 0,
  'hostile exact injury accessor fails closed without invocation');

  const proxyExactInjury = stage3Model();
  proxyExactInjury.player.combat.injury = new Proxy({
    id: 'severe-injury',
    remainingSeconds: 1,
    remainingSecondsExact: '1',
    totalSeconds: 1800
  }, {
    getOwnPropertyDescriptor(target, key) {
      if (key === 'remainingSecondsExact') {
        throw new Error('hostile exact descriptor');
      }
      return Object.getOwnPropertyDescriptor(target, key);
    }
  });
  let proxyExactResult = null;
  try {
    proxyExactResult = Stage3State.normalize(proxyExactInjury);
  } catch (error) {
    proxyExactResult = null;
  }
  ok(proxyExactResult &&
     proxyExactResult.player.combat.injury === null,
  'hostile exact injury proxy fails closed without escaping');

  const numericSession = stage3Model();
  numericSession.systems.combat.session = validSession();
  numericSession.current = currentAction(
    numericSession.systems.combat.session.actionKey
  );
  numericSession.systems.combat.session.waveIndex = -2;
  numericSession.systems.combat.session.elapsedTicks = 4.9;
  numericSession.systems.combat.session.tickRemainderSeconds = Infinity;
  numericSession.systems.combat.session.player.hp = -8;
  numericSession.systems.combat.session.player.qi = Infinity;
  numericSession.systems.combat.session.player.cooldownTicks = 3.9;
  numericSession.systems.combat.session.enemy.hp = -3;
  const rejectedNumericSession = Stage3State.normalize(numericSession);
  ok(
    rejectedNumericSession.systems.combat.session === null &&
      rejectedNumericSession.current === null &&
      warningCount(rejectedNumericSession) === 1,
    'noncanonical combat quantities reject the whole active session'
  );

  function stage2Composition() {
    const sandbox = {
      console,
      JSON,
      Object,
      Array,
      Number,
      String,
      Boolean,
      Math,
      Date,
      Set,
      Map,
      Proxy,
      RegExp,
      Error,
      isFinite,
      isNaN,
      parseInt,
      parseFloat
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    [
      'content/herblore-parity.js',
      'content/materials.js',
      'content/items.js',
      'content/life-skills.js',
      'content/gathering.js',
      'content/recipes.js',
      'content/homestead.js',
      'core/stage2-state.js',
      'core/save-system.js'
    ].forEach((file) => {
      vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, {
        filename: file
      });
    });
    return sandbox.SaveSystem;
  }

  const Stage2Save = stage2Composition();
  let stage2CreateError = null;
  try {
    Stage2Save.createSnapshot(stage2Before, 8000.125);
  } catch (error) {
    stage2CreateError = error;
  }
  ok(stage2CreateError &&
     /Stage4State is required/.test(String(stage2CreateError.message || '')),
    'Stage 2-only composition cannot create snapshots without Stage4State');

  const v3 = {
    schemaVersion: 3,
    savedAt: 8000.125,
    created: true,
    appearance: { parts: {} },
    player: stage2Before.player,
    current: null,
    rngState: 123,
    systems: stage2Before.systems,
    pendingOfflineReport: null
  };
  const v3Adapter = jsonAdapter({
    [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(v3)
  });
  const v3Loaded = SaveSystem.load(v3Adapter, 9000.875);
  ok(SaveSystem.SCHEMA_VERSION === 5 &&
     v3Loaded.source === 'empty' &&
     v3Loaded.migrated === false &&
     v3Loaded.needsRepair === false &&
     v3Loaded.snapshot.player === null,
  'schema v3 is rejected instead of migrated to v5');
  ok(v3Adapter.writes.length === 0,
    'rejecting a v3 snapshot performs no hidden write');

  const v2 = {
    schemaVersion: 2,
    savedAt: 8000.125,
    created: true,
    appearance: { parts: {} },
    player: stage2Before.player,
    current: null,
    rngState: 123,
    fishRecoverAcc: 0,
    pendingOfflineReport: null
  };
  const v1 = {
    schemaVersion: 1,
    savedAt: 8000.125,
    created: true,
    appearance: { parts: {} },
    player: {
      name: 'v1链',
      realmStage: 9,
      xiwei: 3456,
      shouyuan: 250,
      shouMax: 300,
      bag: { cloudwoodSword: 1 }
    },
    current: null,
    rngState: 123,
    fishRecoverAcc: 0,
    pendingOfflineReport: null
  };
  [
    ['v1', v1],
    ['v2', v2],
    ['v3', v3]
  ].forEach(([label, fixture]) => {
    const loaded = SaveSystem.load(jsonAdapter({
      [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(fixture)
    }), 9000.875);
    ok(loaded.source === 'empty' &&
       loaded.migrated === false &&
       loaded.needsRepair === false &&
       loaded.snapshot.player === null,
    label + ' is rejected instead of migrated to v5');
  });

  const canonicalV5 = SaveSystem.createSnapshot(midCombat, 1000.125);
  const canonicalV5Adapter = jsonAdapter();
  SaveSystem.save(canonicalV5Adapter, canonicalV5, 1000.125);
  const canonicalV5Loaded = SaveSystem.load(canonicalV5Adapter, 1000.125);
  ok(canonicalV5.schemaVersion === 5 &&
     canonicalV5Loaded.snapshot.schemaVersion === 5 &&
     canonicalV5Loaded.migrated === false &&
     canonicalV5Loaded.needsRepair === false,
  'canonical v5 reloads without silent relabeling or repair');
  exact(canonicalV5Loaded.snapshot.player.inventory,
    canonicalV5.player.inventory,
    'v5 JSON save/load preserves Stage 2 inventory');
  exact(canonicalV5Loaded.snapshot.player.skills,
    canonicalV5.player.skills,
    'v5 JSON save/load preserves Stage 2 skills');
  exact(canonicalV5Loaded.snapshot.player.mastery,
    canonicalV5.player.mastery,
    'v5 JSON save/load preserves Stage 2 mastery');
  exact(canonicalV5Loaded.snapshot.player.combatProgress,
    canonicalV5.player.combatProgress,
    'v5 JSON save/load preserves combat gates and progress');
  ok(canonicalV5Loaded.snapshot.systems.combat.session.elapsedTicks === 7,
    'v5 JSON save/load preserves an active combat session');

  const corruptV4 = copy(canonicalV5);
  corruptV4.systems.combat.session.regionId = 'missingRegion';
  corruptV4.player.combatProgress.enemyKills.thornHare = 31;
  const corruptV4Adapter = jsonAdapter({
    [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(corruptV4),
    [SaveSystem.BACKUP_KEY]: JSON.stringify(canonicalV5)
  });
  const corruptV4Loaded = SaveSystem.load(corruptV4Adapter, 2000);
  ok(corruptV4Loaded.source === 'snapshot' &&
     corruptV4Loaded.snapshot.systems.combat.session === null &&
     corruptV4Loaded.snapshot.player.combatProgress.enemyKills.thornHare ===
       31 &&
     corruptV4Loaded.needsRepair === true &&
     warningCount(corruptV4Loaded.snapshot) === 1,
  'repairable v5 combat corruption recovers its branch instead of rolling back');

  const hostileNullPlayerV4 = SaveSystem.createSnapshot({
    player: null
  }, 3000.5);
  hostileNullPlayerV4.current = {
    key: 'combat:region:qingyunOutskirts:thornHare',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null,
    stalled: false
  };
  const hostileNullPlayerAdapter = jsonAdapter({
    [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(hostileNullPlayerV4)
  });
  const hostileNullPlayerLoaded = SaveSystem.load(
    hostileNullPlayerAdapter,
    3001
  );
  ok(hostileNullPlayerLoaded.source === 'snapshot' &&
     hostileNullPlayerLoaded.snapshot.player === null &&
     hostileNullPlayerLoaded.snapshot.systems.combat.session === null &&
     hostileNullPlayerLoaded.snapshot.current === null &&
     hostileNullPlayerLoaded.migrated === true &&
     hostileNullPlayerLoaded.needsRepair === true &&
     warningCount(hostileNullPlayerLoaded.snapshot) === 1 &&
     hostileNullPlayerAdapter.writes.length === 0,
  'SaveSystem flags player-null stranded combat state for transactional repair');
  const hostileRepairModel = StateModel.toSnapshotInput(
    StateModel.normalize(
      hostileNullPlayerLoaded.snapshot,
      hostileNullPlayerLoaded.snapshot.processedThroughMs
    )
  );
  ok(SaveSystem.save(
    hostileNullPlayerAdapter,
    hostileRepairModel,
    hostileNullPlayerLoaded.snapshot.savedAt
  ) === true,
  'player-null hostile recovery writes through the existing save transaction');
  exact(hostileNullPlayerAdapter.writes,
    [SaveSystem.BACKUP_KEY, SaveSystem.SNAPSHOT_KEY],
    'player-null hostile repair keeps backup-before-primary ordering');
  const hostileRepairReload = SaveSystem.load(
    hostileNullPlayerAdapter,
    3001
  );
  ok(hostileRepairReload.migrated === false &&
     hostileRepairReload.needsRepair === false &&
     hostileRepairReload.snapshot.current === null &&
     warningCount(hostileRepairReload.snapshot) === 1,
  'durably repaired player-null state reloads canonically without warning duplication');

  [
    ['missing current', null, null],
    ['noncombat current', currentAction('fish:pond'), 'fish:pond'],
    [
      'mismatched combat current',
      currentAction('combat:dungeon:breathCave'),
      null
    ]
  ].forEach(([label, current, expectedCurrentKey], index) => {
    const hostile = SaveSystem.createSnapshot(
      recoveryModel(),
      4000.5 + index
    );
    hostile.current = current;
    const preservedBefore = copy(preservedRecoveryBranches(hostile));
    const adapter = jsonAdapter({
      [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(hostile)
    });
    const loaded = SaveSystem.load(adapter, 4010 + index);
    ok(loaded.source === 'snapshot' &&
       loaded.snapshot.systems.combat.session === null &&
       loaded.migrated === true &&
       loaded.needsRepair === true &&
       warningCount(loaded.snapshot) === 1 &&
       adapter.writes.length === 0,
    'SaveSystem flags session/current recovery for repair: ' + label);
    ok(expectedCurrentKey === null
      ? loaded.snapshot.current === null
      : loaded.snapshot.current &&
        loaded.snapshot.current.key === expectedCurrentKey,
    'SaveSystem preserves only a noncombat current during repair: ' + label);
    exact(preservedRecoveryBranches(loaded.snapshot), preservedBefore,
      'SaveSystem recovery preserves long-term progress: ' + label);

    const repairModel = StateModel.toSnapshotInput(StateModel.normalize(
      loaded.snapshot,
      loaded.snapshot.processedThroughMs
    ));
    ok(SaveSystem.save(
      adapter,
      repairModel,
      loaded.snapshot.savedAt
    ) === true,
    'session/current recovery is durably saved: ' + label);
    exact(adapter.writes,
      [SaveSystem.BACKUP_KEY, SaveSystem.SNAPSHOT_KEY],
      'session/current repair writes backup before primary: ' + label);

    const reloaded = SaveSystem.load(adapter, 4010 + index);
    ok(reloaded.migrated === false &&
       reloaded.needsRepair === false &&
       reloaded.snapshot.systems.combat.session === null &&
       warningCount(reloaded.snapshot) === 1,
    'session/current repair reloads canonically: ' + label);
    ok(expectedCurrentKey === null
      ? reloaded.snapshot.current === null
      : reloaded.snapshot.current &&
        reloaded.snapshot.current.key === expectedCurrentKey,
    'canonical reload keeps only the repaired noncombat current: ' + label);
    exact(preservedRecoveryBranches(reloaded.snapshot), preservedBefore,
      'canonical reload preserves long-term progress: ' + label);
  });

  const persistedRuntime = StateModel.normalize(
    Stage3State.normalize(copy(stage2Before)),
    8000.125
  );
  ok(persistedRuntime.player.realmStage === 9 &&
     persistedRuntime.player.xiwei === 3456 &&
     persistedRuntime.player.breakthrough.realmId === 'foundation',
  'StateModel exposes derived legacy realm fields only as a runtime bridge');
  const persistedAgain = StateModel.toSnapshotInput(persistedRuntime);
  const persistedV4 = SaveSystem.createSnapshot(persistedAgain, 8000.125);
  ok(!('realmStage' in persistedV4.player) &&
     !('xiwei' in persistedV4.player) &&
     persistedV4.player.breakthrough.cultivation === 3456,
  'v5 snapshot boundary removes runtime-only duplicated realm progress');

  const sourceText = fs.readFileSync('core/stage3-state.js', 'utf8');
  ok(!/\b(document|window|Platform|SaveSystem|localStorage|sessionStorage)\b|Math\.random/
    .test(sourceText),
  'Stage 3 state module is pure and independent of UI, storage and random');

  const dependencyAbsentSandbox = {
    console,
    Math,
    Date,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    isFinite,
    isNaN,
    parseInt,
    parseFloat,
    Set,
    Map,
    Proxy,
    RegExp,
    Error
  };
  dependencyAbsentSandbox.globalThis = dependencyAbsentSandbox;
  vm.createContext(dependencyAbsentSandbox);
  [
    'content/herblore-parity.js',
    'content/materials.js',
    'content/items.js',
    'content/life-skills.js',
    'content/gathering.js',
    'content/recipes.js',
    'content/homestead.js',
    'content/techniques.js',
    'content/realms.js',
    'core/stage2-state.js',
    'core/stage3-state.js'
  ].forEach((file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'),
      dependencyAbsentSandbox, { filename: file });
  });
  const impossibleWithoutContent = validSession();
  impossibleWithoutContent.enemy.hp = 0;
  impossibleWithoutContent.intermissionTicks = 2;
  let dependencyAbsentThrew = false;
  let dependencyAbsentResult = 'not-called';
  try {
    dependencyAbsentResult =
      dependencyAbsentSandbox.Stage3State.normalizeSession(
        impossibleWithoutContent
      );
  } catch (error) {
    dependencyAbsentThrew = true;
  }
  ok(!dependencyAbsentThrew && dependencyAbsentResult === null,
    'dependency-absent composition generically rejects impossible phase');
  dependencyAbsentThrew = false;
  try {
    dependencyAbsentResult =
      dependencyAbsentSandbox.Stage3State.normalizeSession(validSession());
  } catch (error) {
    dependencyAbsentThrew = true;
  }
  ok(!dependencyAbsentThrew && dependencyAbsentResult === null,
    'dependency-absent composition fails closed without throwing');

  const browserSandbox = {
    console,
    Math,
    Date,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    isFinite,
    isNaN,
    parseInt,
    parseFloat,
    Set,
    Map,
    Proxy,
    RegExp,
    Error
  };
  browserSandbox.globalThis = browserSandbox;
  vm.createContext(browserSandbox);
  [
    'content/herblore-parity.js',
    'content/materials.js',
    'content/items.js',
    'content/life-skills.js',
    'content/gathering.js',
    'content/recipes.js',
    'content/homestead.js',
    'content/combat.js',
    'content/techniques.js',
    'content/realms.js',
    'core/stage2-state.js',
    'core/stage3-state.js'
  ].forEach((file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), browserSandbox, {
      filename: file
    });
  });
  ok(typeof browserSandbox.Stage3State.normalizeSession === 'function' &&
     Object.isFrozen(browserSandbox.Stage3State) &&
     browserSandbox.Stage3State.defaults()
       .player.combat.loadouts.length === 1,
  'Stage 3 state exposes the same frozen UMD browser API');
}

console.log('\n=== Stage 3 状态自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
