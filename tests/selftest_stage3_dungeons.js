'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const CombatContent = require('../content/combat.js');
const RealmContent = require('../content/realms.js');
const TechniqueContent = require('../content/techniques.js');
const CombatEngine = require('../core/combat-engine.js');
const CombatRewards = require('../core/combat-rewards.js');
const Techniques = require('../core/techniques.js');
const Stage3State = require('../core/stage3-state.js');
const StateModel = require('../core/state-model.js');
const CombatProgress = require('../core/combat-progress.js');

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
  return Stage3State.normalize(
    StateModel.normalize(Stage3State.defaults(), 0)
  );
}

function setRealm(model, realmId) {
  const next = json(model);
  next.player.breakthrough.realmId = realmId;
  return next;
}

function forceEngineKill(model) {
  const state = json(model);
  const session = state.systems.combat.session;
  ok(!!session && !!session.enemy, 'engine kill fixture has an active enemy');
  session.enemy.hp = 1;
  session.player.attack = 1000000;
  session.player.accuracy = 1000000;
  session.player.cooldownTicks = 0;
  const tick = CombatEngine.advanceTick(session, {
    playerInventory: state.player.inventory,
    rngState: state.rngState
  });
  ok(tick.ok && tick.outcome === 'enemy_defeated',
    'single-enemy victory is produced by CombatEngine');
  state.systems.combat.session = tick.session;
  state.player.inventory = tick.playerInventory;
  state.rngState = tick.rngState;
  return state;
}

function settleKill(model, createdAtMs) {
  return CombatProgress.afterEnemyDefeated(
    forceEngineKill(model),
    {
      createdAtMs: createdAtMs,
      sectContext: {
        sectId: null,
        favoredTechniqueIds: [],
        favoredTags: []
      }
    }
  );
}

function advanceIntermission(model, ticks) {
  let state = model;
  for (let index = 0; index < ticks; index++) {
    const next = CombatProgress.nextDungeonEnemy(state);
    ok(next.ok, 'intermission tick advances');
    state = next.state;
  }
  return state;
}

function clearCurrentDungeon(model, clockBase) {
  let state = model;
  const defeated = [];
  let clock = clockBase;
  const dungeonId = state.systems.combat.session.dungeonId;
  const clearsBefore =
    state.player.combatProgress.dungeonClears[dungeonId] || 0;
  let lastResult = null;
  while ((state.player.combatProgress.dungeonClears[dungeonId] || 0) ===
      clearsBefore) {
    const enemyId = state.systems.combat.session.enemy.id;
    defeated.push(enemyId);
    const settled = settleKill(state, clock++);
    ok(settled.ok, 'dungeon enemy settlement succeeds');
    state = settled.state;
    lastResult = settled.result;
    if (settled.result.dungeonClear) break;
    state = advanceIntermission(state, 1);
  }
  return { state: state, defeated: defeated, result: lastResult };
}

equal(Object.keys(CombatProgress).sort(), [
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
].sort(), 'CombatProgress exposes only the planned public surface');
ok(Object.isFrozen(CombatProgress), 'CombatProgress export is frozen');

{
  const base = freshModel();
  const unknownRegion = CombatProgress.startRegion(
    base, 'missing-region', 'thornHare', 10
  );
  ok(!unknownRegion.ok && unknownRegion.code === 'unknown_region',
    'unknown region is rejected');
  ok(unknownRegion.state === base, 'unknown region preserves input identity');

  const unknownEnemy = CombatProgress.startRegion(
    base, 'qingyunOutskirts', 'missing-enemy', 10
  );
  ok(!unknownEnemy.ok && unknownEnemy.code === 'unknown_enemy',
    'unknown enemy is rejected');
  equal(bytes(base), bytes(unknownEnemy.state),
    'unknown enemy cannot replace the main action');

  const wrongEnemy = CombatProgress.startRegion(
    base, 'qingyunOutskirts', 'ironClawBeast', 10
  );
  ok(!wrongEnemy.ok && wrongEnemy.code === 'enemy_not_in_region',
    'enemy from another region is rejected');

  const locked = CombatProgress.startRegion(
    base, 'blackIronRidge', 'ironClawBeast', 10
  );
  ok(!locked.ok && locked.code === 'realm_locked',
    'locked realm rejects a region start');
  equal(base.current, null, 'locked start does not replace current action');

  const pending = json(base);
  pending.systems.combat.pendingLoot = {
    id: 'combat-loot-1',
    source: { type: 'enemy', id: 'thornHare' },
    items: { brokenFang: 1 },
    currency: 0,
    createdAtMs: 1
  };
  pending.systems.combat.nextLootId = 2;
  const blocked = CombatProgress.startRegion(
    pending, 'qingyunOutskirts', 'thornHare', 10
  );
  ok(!blocked.ok && blocked.code === 'pending_loot_exists',
    'pending loot blocks region start');
  equal(bytes(blocked.state), bytes(pending),
    'pending-loot rejection is atomic');

  const injuredPending = json(pending);
  injuredPending.player.combat.injury = {
    id: 'severe-injury',
    remainingSeconds: 300,
    totalSeconds: 1800
  };
  const injuredPendingBefore = bytes(injuredPending);
  equal([
    CombatProgress.canStartRegion(
      injuredPending, 'qingyunOutskirts', 'thornHare'
    ).code,
    CombatProgress.startRegion(
      injuredPending, 'qingyunOutskirts', 'thornHare', 10
    ).code,
    CombatProgress.canStartDungeon(
      injuredPending, 'breathCave'
    ).code,
    CombatProgress.startDungeon(
      injuredPending, 'breathCave', 10
    ).code
  ], ['injured', 'injured', 'injured', 'injured'],
  'injury precedes pending loot across all combat start interfaces');
  equal(bytes(injuredPending), injuredPendingBefore,
    'injured plus pending eligibility remains byte-preserving');

  const active = CombatProgress.startRegion(
    base, 'qingyunOutskirts', 'thornHare', 10
  ).state;
  const malformed = json(active);
  malformed.systems.combat.session.waveIndex = 99;
  const cannotMask = CombatProgress.startRegion(
    malformed, 'qingyunOutskirts', 'grayWolf', 11
  );
  ok(!cannotMask.ok && cannotMask.code === 'invalid_state',
    'new action cannot mask a noncanonical existing combat session');
  equal(bytes(cannotMask.state), bytes(malformed),
    'noncanonical-session rejection preserves input byte-for-byte');
}

{
  const started = CombatProgress.startRegion(
    freshModel(), 'qingyunOutskirts', 'thornHare', 20
  ).state;
  const activeReload = Stage3State.normalize(json(started));
  ok(!!activeReload.systems.combat.session &&
    activeReload.systems.combat.session.enemy.hp > 0 &&
    activeReload.systems.combat.session.intermissionTicks === 0,
  'region active phase survives JSON normalization');

  const dead = json(started);
  dead.systems.combat.session.enemy.hp = 0;
  const deadReload = Stage3State.normalize(json(dead));
  ok(!!deadReload.systems.combat.session &&
    deadReload.systems.combat.session.enemy.hp === 0 &&
    deadReload.systems.combat.session.intermissionTicks === 0,
  'region dead-awaiting-settlement phase survives JSON normalization');

  const intermission = json(started);
  intermission.systems.combat.session.enemy = null;
  intermission.systems.combat.session.intermissionTicks = 4;
  const intermissionReload = Stage3State.normalize(json(intermission));
  ok(!!intermissionReload.systems.combat.session &&
    intermissionReload.systems.combat.session.enemy === null &&
    intermissionReload.systems.combat.session.intermissionTicks === 4,
  'region intermission phase survives JSON normalization');

  const staleDead = json(dead);
  staleDead.systems.combat.session.intermissionTicks = 3;
  const staleBefore = bytes(staleDead);
  const rejected = CombatProgress.afterEnemyDefeated(staleDead, {
    createdAtMs: 21,
    sectContext: {
      sectId: null,
      favoredTechniqueIds: [],
      favoredTags: []
    }
  });
  ok(!rejected.ok && rejected.code === 'invalid_state',
    'dead region enemy with intermission cannot settle again');
  equal(bytes(rejected.state), staleBefore,
    'stale region settlement preserves model/current/inventory/RNG bytes');

  const negativeHp = json(dead);
  negativeHp.systems.combat.session.enemy.hp = -1;
  const negativeBefore = bytes(negativeHp);
  const negativeRejected = CombatProgress.afterEnemyDefeated(negativeHp, {
    createdAtMs: 22,
    sectContext: {
      sectId: null,
      favoredTechniqueIds: [],
      favoredTags: []
    }
  });
  ok(!negativeRejected.ok, 'negative-HP forged outcome cannot settle');
  equal(bytes(negativeRejected.state), negativeBefore,
    'forged negative-HP rejection is byte-preserving');
}

{
  let base = freshModel();
  base.current = {
    key: 'gather:explore:herb',
    mode: 'repeat',
    count: 0,
    done: 7,
    elapsed: 2,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null,
    stalled: false
  };
  base.player.techniques.known.steadyBreath = { level: 1, xp: 0 };
  base.player.combat.loadouts[0].passiveTechniques[0] = 'steadyBreath';
  const started = CombatProgress.startRegion(
    base, 'qingyunOutskirts', 'thornHare', 50
  );
  ok(started.ok && started.code === 'ok', 'region starts');
  equal(started.state.current.key,
    'combat:region:qingyunOutskirts:thornHare',
    'region installs its repeat main action');
  equal(started.state.lastActionStop, {
    key: 'gather:explore:herb',
    reason: 'switched',
    atMs: 50
  }, 'prior main action is replaced only after validation');
  ok(Object.isFrozen(started.state) &&
    Object.isFrozen(started.state.systems.combat.session),
  'region start returns deeply frozen state');

  const initialHp = started.state.systems.combat.session.player.maxHp - 9;
  const initialQi = started.state.systems.combat.session.player.maxQi - 7;
  const wounded = json(started.state);
  wounded.systems.combat.session.player.hp = initialHp;
  wounded.systems.combat.session.player.qi = initialQi;
  const killed = settleKill(wounded, 60);
  ok(killed.ok, 'region kill settles');
  equal(killed.state.player.combatProgress.enemyKills.thornHare, 1,
    'enemy kill increments once');
  equal(killed.state.player.combatProgress.regionKills.qingyunOutskirts, 1,
    'region kill increments once');
  equal(killed.state.player.breakthrough.cultivation,
    CombatContent.ENEMIES.thornHare.cultivation,
    'configured cultivation is granted');
  equal(killed.state.player.techniques.known.steadyBreath.xp, 1,
    'configured passive gains 1 combat XP once');
  equal(killed.state.systems.combat.session.intermissionTicks, 1,
    'region waits one tick for continuous loop');
  equal(killed.state.systems.combat.session.enemy, null,
    'defeated region enemy is removed during intermission');

  const repeated = CombatProgress.afterEnemyDefeated(killed.state, {
    createdAtMs: 61,
    sectContext: {
      sectId: null,
      favoredTechniqueIds: [],
      favoredTags: []
    }
  });
  ok(!repeated.ok && repeated.code === 'enemy_not_defeated',
    'settlement is idempotent after an enemy was removed');
  equal(killed.state.player.combatProgress.enemyKills.thornHare, 1,
    'idempotent rejection cannot double-count a kill');

  const afterZero = advanceIntermission(killed.state, 0);
  equal(afterZero.systems.combat.session.enemy, null,
    'region does not spawn before the single tick');
  const respawned = advanceIntermission(afterZero, 1);
  equal(respawned.systems.combat.session.enemy.id, 'thornHare',
    'selected region enemy respawns on the first tick');
  equal(respawned.systems.combat.session.player.hp, initialHp,
    'region HP persists between enemies');
  ok(
    respawned.systems.combat.session.player.qi >= initialQi,
    'region Qi does not drop between enemies'
  );
}

{
  let full = freshModel();
  full.player.inventory.capacity = 1;
  full.player.inventory.stacks = { tinOre: 1 };
  const started = CombatProgress.startRegion(
    full, 'qingyunOutskirts', 'thornHare', 1
  );
  const continued = settleKill(started.state, 2);
  ok(continued.ok && continued.code === 'ok',
    'pending loot keeps the region combat loop running');
  equal(continued.warning, 'inventory_full',
    'pending loot reports inventory_full warning');
  ok(continued.state.current !== null,
    'pending loot keeps the main combat action');
  ok(continued.state.systems.combat.session !== null,
    'pending loot keeps the combat session for the next enemy');
  equal(continued.state.systems.combat.session.enemy, null,
    'defeated enemy enters the region intermission');
  ok(!!continued.state.systems.combat.pendingLoot,
    'the complete reward batch remains pending');
  equal(continued.state.player.inventory.stacks, { tinOre: 1 },
    'pending reward never partially changes inventory');
  equal(continued.state.player.combatProgress.enemyKills.thornHare, 1,
    'pending settlement still records the completed enemy exactly once');
  equal(
    continued.state.player.combatProgress.regionKills.qingyunOutskirts,
    1,
    'pending settlement advances region progress as one atomic outcome'
  );
  equal(continued.state.player.breakthrough.cultivation, 5,
    'pending settlement grants cultivation with the same atomic outcome');
}

{
  const base = freshModel();
  const unknown = CombatProgress.startDungeon(base, 'missing-dungeon', 10);
  ok(!unknown.ok && unknown.code === 'unknown_dungeon',
    'unknown dungeon is rejected');

  const realmLocked = CombatProgress.startDungeon(
    base, 'foundationAltar', 10
  );
  ok(!realmLocked.ok && realmLocked.code === 'realm_locked',
    'dungeon realm prerequisite is checked first');

  const highRealm = setRealm(base, 'foundation');
  const priorLocked = CombatProgress.startDungeon(
    highRealm, 'foundationAltar', 10
  );
  ok(!priorLocked.ok &&
    priorLocked.code === 'required_dungeon_not_cleared',
  'prior-dungeon prerequisite is enforced');
  equal(bytes(priorLocked.state), bytes(highRealm),
    'failed dungeon prerequisites consume and replace nothing');
}

{
  const started = CombatProgress.startDungeon(
    freshModel(), 'breathCave', 90
  ).state;
  const stale = json(started);
  stale.systems.combat.session.enemy = null;
  stale.systems.combat.session.waveDefeated = 2;
  stale.systems.combat.session.intermissionTicks = 1;
  const staleBefore = bytes(stale);
  const direct = CombatProgress.nextDungeonEnemy(stale);
  ok(!direct.ok && direct.code === 'invalid_state',
    'count-exhausted dungeon intermission cannot spawn a third enemy');
  equal(bytes(direct.state), staleBefore,
    'invalid dungeon spawn preserves model/current/inventory/RNG bytes');

  const reloaded = Stage3State.normalize(json(stale));
  ok(reloaded.systems.combat.session === null &&
    reloaded.current === null,
  'JSON normalization clears count-exhausted dungeon intermission');
  ok(reloaded.pendingOfflineReports.some(function (report) {
    return report.warnings.includes('invalid_combat_session_recovered');
  }), 'invalid dungeon phase appends the existing recovery warning');

  const wrongPhase = json(started);
  wrongPhase.systems.combat.session.enemy = null;
  wrongPhase.systems.combat.session.intermissionTicks = 1;
  wrongPhase.systems.combat.session.bossPhase = 1;
  const wrongBefore = bytes(wrongPhase);
  const wrong = CombatProgress.nextDungeonEnemy(wrongPhase);
  ok(!wrong.ok, 'intermission cannot retain a stale boss phase');
  equal(bytes(wrong.state), wrongBefore,
    'stale boss-phase spawn rejection is byte-preserving');
}

{
  let model = freshModel();
  const started = CombatProgress.startDungeon(model, 'breathCave', 100);
  ok(started.ok, 'tier-one dungeon starts');
  equal(started.state.systems.combat.session.waveIndex, 0,
    'dungeon begins at wave zero');
  equal(started.state.systems.combat.session.waveDefeated, 0,
    'dungeon begins at enemy one within the wave');
  equal(started.state.systems.combat.session.enemy.id, 'thornHare',
    'dungeon creates wave-zero enemy one');

  const damaged = json(started.state);
  damaged.player.inventory.stacks.wardTalisman = 2;
  damaged.player.combat.loadouts[0].supplies.talisman.itemId =
    'wardTalisman';
  damaged.systems.combat.session.loadoutSnapshot.supplies.talisman.itemId =
    'wardTalisman';
  damaged.systems.combat.session.player.hp -= 11;
  damaged.systems.combat.session.player.qi -= 13;
  const hp = damaged.systems.combat.session.player.hp;
  const qi = damaged.systems.combat.session.player.qi;
  const firstEnemy = settleKill(damaged, 101);
  equal(firstEnemy.state.player.inventory.stacks.wardTalisman, 1,
    'first dungeon enemy consumes one configured talisman');
  let afterFirst = advanceIntermission(firstEnemy.state, 1);
  const secondEnemy = settleKill(afterFirst, 102);
  ok(!Object.prototype.hasOwnProperty.call(
    secondEnemy.state.player.inventory.stacks,
    'wardTalisman'
  ),
    'remaining supply count persists and reaches zero on enemy two');
  afterFirst = advanceIntermission(secondEnemy.state, 1);
  const clearedTail = clearCurrentDungeon(afterFirst, 103);
  const cleared = {
    state: clearedTail.state,
    defeated: ['thornHare', 'thornHare'].concat(clearedTail.defeated),
    result: clearedTail.result
  };
  equal(cleared.defeated, [
    'thornHare', 'thornHare',
    'grayWolf', 'grayWolf',
    'caveWarden', 'breathSerpent'
  ], 'dungeon encounter sequence is exactly 2/2/1/1');
  equal(cleared.state.player.combatProgress.dungeonClears.breathCave, 1,
    'boss death increments dungeon clear exactly once');
  equal(cleared.state.player.combatProgress.firstClears.breathCave, true,
    'first clear is recorded once');
  equal(cleared.state.player.combatProgress.completedGates[
    'clear:breathCave:1'
  ], true, 'first clear permanently unlocks its gate');
  ok(cleared.result.firstClear &&
    cleared.result.unlocks.includes('clear:breathCave:1'),
  'first-clear reward and gate event occur on the first clear');
  ok(
    cleared.state.player.inventory.stacks.breathJade >= 1 ||
      (cleared.state.player.inventory.equipment.instances || []).some(
        function (instance) {
          return instance && instance.baseId === 'qi-accessory';
        }
      ),
    'first clear grants the fixed accessory through CombatRewards');
  ok(
    cleared.state.player.inventory.stacks[
      'techniqueBook:stoneBreakingFist'
    ] >= 1 ||
      (cleared.state.player.techniques.known &&
        cleared.state.player.techniques.known.stoneBreakingFist),
    'first clear grants the fixed book through CombatRewards'
  );
  equal(cleared.state.systems.combat.session.intermissionTicks, 4,
    'repeat run waits four ticks before next loop');
  equal(cleared.state.systems.combat.session.player.hp,
    cleared.state.systems.combat.session.player.maxHp,
    'completed run refills HP before repeat wait');
  equal(cleared.state.systems.combat.session.player.qi,
    cleared.state.systems.combat.session.player.maxQi,
    'completed run refills Qi before repeat wait');
  ok(hp < cleared.state.systems.combat.session.player.hp &&
    qi < cleared.state.systems.combat.session.player.qi,
  'HP and Qi were preserved until the run completed');

  const afterThree = advanceIntermission(cleared.state, 3);
  equal(afterThree.systems.combat.session.enemy, null,
    'repeat run does not start one tick early');
  const repeatStart = advanceIntermission(afterThree, 1);
  equal(repeatStart.systems.combat.session.enemy.id, 'thornHare',
    'repeat run starts after four ticks');

  const second = clearCurrentDungeon(repeatStart, 200);
  equal(second.state.player.combatProgress.dungeonClears.breathCave, 2,
    'second boss death adds one clear');
  equal(second.state.player.combatProgress.firstClears.breathCave, true,
    'first-clear flag remains true');
  ok(!second.result.firstClear && second.result.unlocks.length === 0,
    'second clear receives repeat settlement without first-clear effects');
  ok(!second.state.player.combatProgress.completedGates[
    'clear:breathCave:3'
  ], 'three-clear gate is not unlocked off by one');
}

{
  let model = setRealm(freshModel(), 'mahayana');
  model.player.combatProgress.firstClears.mahayanaTrial = true;
  const started = CombatProgress.startDungeon(
    model, 'ascensionTrial', 300
  );
  ok(started.ok, 'final dungeon prerequisites can be satisfied');
  const atBoss = json(started.state);
  atBoss.systems.combat.session.waveIndex = 3;
  atBoss.systems.combat.session.waveDefeated = 0;
  atBoss.systems.combat.session.enemyId = 'ninefoldTribulation';
  atBoss.systems.combat.session.bossPhase = 0;
  atBoss.systems.combat.session.enemy =
    json(CombatEngine.createEnemy('ninefoldTribulation', 0));
  const beforeProgress = bytes(atBoss.player.combatProgress);
  const beforeInventory = bytes(atBoss.player.inventory);
  const phaseOne = settleKill(atBoss, 301);
  ok(phaseOne.ok && phaseOne.code === 'boss_phase',
    'phase-one death transitions to the next boss phase');
  equal(phaseOne.state.systems.combat.session.bossPhase, 1,
    'boss phase increments without advancing wave');
  equal(phaseOne.state.systems.combat.session.waveIndex, 3,
    'phase transition keeps boss wave index');
  equal(phaseOne.state.systems.combat.session.waveDefeated, 0,
    'phase transition does not count the boss early');
  equal(phaseOne.state.systems.combat.session.enemy.phase, 1,
    'phase two enemy is created immediately');
  equal(bytes(phaseOne.state.player.combatProgress), beforeProgress,
    'phase one grants no kill, clear, or gate');
  equal(bytes(phaseOne.state.player.inventory), beforeInventory,
    'phase one grants no boss loot');

  const phaseTwo = settleKill(phaseOne.state, 302);
  ok(phaseTwo.ok && phaseTwo.result.dungeonClear,
    'final boss phase completes the dungeon');
  equal(phaseTwo.state.player.combatProgress.dungeonClears.ascensionTrial, 1,
    'multi-phase boss increments clear only after final phase');

  const phaseReload = Stage3State.normalize(json(phaseOne.state));
  const phaseTwoReloaded = settleKill(phaseReload, 302);
  equal(bytes(phaseTwoReloaded.state), bytes(phaseTwo.state),
    'boss phase save/reload reaches byte-identical final state');
  equal(phaseTwoReloaded.state.rngState, phaseTwo.state.rngState,
    'boss phase save/reload preserves final RNG');
}

{
  let full = freshModel();
  full.player.inventory.capacity = 1;
  full.player.inventory.stacks = { tinOre: 1 };
  const started = CombatProgress.startDungeon(
    full, 'breathCave', 350
  ).state;
  const boss = json(started);
  boss.systems.combat.session.waveIndex = 3;
  boss.systems.combat.session.waveDefeated = 0;
  boss.systems.combat.session.enemyId = 'breathSerpent';
  boss.systems.combat.session.enemy =
    json(CombatEngine.createEnemy('breathSerpent', 0));
  const pending = settleKill(boss, 351);
  ok(pending.ok && pending.code === 'ok' &&
    pending.warning === 'inventory_full',
    'full inventory keeps a first-clear boss settlement in the combat loop');
  ok(pending.state.systems.combat.session !== null,
    'full inventory keeps the dungeon session for the repeat loop');
  const items = pending.state.systems.combat.pendingLoot.items;
  ok(items.brokenFang >= 5 &&
    (items.breathJade === 1 ||
      items['techniqueBook:stoneBreakingFist'] === 1 ||
      Object.keys(items).some(function (key) {
        return key.indexOf('techniqueBook:') === 0;
      })),
  'boss loot and fixed first-clear rewards pend as one complete batch');
  equal(pending.state.player.combatProgress.dungeonClears.breathCave, 1,
    'pending first-clear settlement records one complete clear');
  equal(pending.state.player.combatProgress.firstClears.breathCave, true,
    'pending first-clear settlement records first clear once');
}

{
  function runFrom(state, clock) {
    let current = state;
    while (!current.player.combatProgress.dungeonClears.breathCave) {
      if (current.systems.combat.session.enemy === null) {
        current = CombatProgress.nextDungeonEnemy(current).state;
        continue;
      }
      const settled = settleKill(current, clock++);
      current = settled.state;
      if (settled.result.dungeonClear) break;
    }
    return current;
  }

  const started = CombatProgress.startDungeon(
    freshModel(), 'breathCave', 400
  ).state;
  const first = settleKill(started, 401).state;
  const midWave = advanceIntermission(first, 1);
  const uninterrupted = runFrom(json(midWave), 500);
  const reloaded = Stage3State.normalize(json(midWave));
  const resumed = runFrom(reloaded, 500);
  equal(bytes(resumed), bytes(uninterrupted),
    'mid-wave JSON plus Stage3State reload is byte-identical');
  equal(resumed.rngState, uninterrupted.rngState,
    'mid-wave reload preserves final RNG exactly');
}

{
  let model = freshModel();
  let state = CombatProgress.startRegion(
    model, 'qingyunOutskirts', 'thornHare', 1
  ).state;
  let lastUnlocks = [];
  for (let count = 1; count <= 3; count++) {
    const settled = settleKill(state, 600 + count);
    state = settled.state;
    lastUnlocks = settled.result.unlocks;
    if (count < 3) state = advanceIntermission(state, 1);
  }
  equal(state.player.combatProgress.completedGates[
    'kill:thornHare:3'
  ], true, 'kill-count gate unlocks at the exact threshold');
  equal(lastUnlocks, ['kill:thornHare:3'],
    'unlock event emits only on false-to-true');

  state = advanceIntermission(state, 1);
  const fourth = settleKill(state, 700);
  equal(fourth.result.unlocks, [],
    'completed gate never emits a second unlock');
  equal(fourth.state.player.combatProgress.completedGates[
    'kill:thornHare:3'
  ], true, 'completed gate never returns false');

  const forged = json(fourth.state.player.combatProgress);
  const external = CombatProgress.recordExternalGate(
    forged, 'kill:thornHare:3', 'ui'
  );
  ok(!external.ok && external.code === 'gate_not_external_task',
    'external hook rejects non-task content gates');
  equal(bytes(external.progress), bytes(forged),
    'rejected external gate hook leaves progress unchanged');
}

{
  const active = CombatProgress.startRegion(
    freshModel(), 'qingyunOutskirts', 'grayWolf', 10
  ).state;
  const regions = CombatProgress.queryRegions(active);
  ok(Object.isFrozen(regions) &&
    Object.isFrozen(regions.regions) &&
    Object.isFrozen(regions.regions[0].enemies[0].stats),
  'region query is deeply frozen');
  equal(regions.regions.length, 9, 'region query returns all regions');
  ok(regions.regions.every(function (region) {
    return region.enemies.length === 3;
  }), 'each region query has three enemies');
  const qingyun = regions.regions.find(function (region) {
    return region.id === 'qingyunOutskirts';
  });
  ok(qingyun.unlocked && qingyun.active.enemyId === 'grayWolf',
    'region query exposes unlock and active progress');
  ok(qingyun.enemies.every(function (enemy) {
    return enemy.stats && Array.isArray(enemy.drops) &&
      Number.isSafeInteger(enemy.killCount);
  }), 'region query exposes stats, drop previews, and kill counts');
  ok(regions.regions.every(function (region) {
    return typeof region.bannerSrc === 'string' &&
      region.bannerSrc.indexOf('assets/combat-areas/') === 0;
  }), 'region query exposes combat area banners');

  const dungeons = CombatProgress.queryDungeons(active);
  ok(Object.isFrozen(dungeons) &&
    Object.isFrozen(dungeons.dungeons[0].waves),
  'dungeon query is deeply frozen');
  equal(dungeons.dungeons.length, 9, 'dungeon query returns all dungeons');
  ok(dungeons.dungeons.every(function (dungeon) {
    return dungeon.waves.length === 4 &&
      dungeon.firstClear &&
      Array.isArray(dungeon.repeatDrops) &&
      Number.isSafeInteger(dungeon.clearCount) &&
      typeof dungeon.bannerSrc === 'string' &&
      dungeon.bannerSrc.indexOf('assets/combat-areas/') === 0;
  }), 'dungeon query exposes prerequisites, waves, rewards, clears, and banners');

  try {
    regions.regions[0].enemies[0].stats.hp = -1;
  } catch (error) {
    ok(error instanceof TypeError, 'frozen query rejects nested mutation');
  }
  const again = CombatProgress.queryRegions(active);
  ok(again.regions[0].enemies[0].stats.hp > 0,
    'query mutation cannot leak into later reads');
}

{
  const accessor = freshModel();
  Object.defineProperty(accessor.player, 'combatProgress', {
    enumerable: true,
    get: function () {
      throw new Error('accessor should never run');
    }
  });
  equal(CombatProgress.queryRegions(accessor), { regions: [] },
    'accessor-bearing query input fails closed');

  const proxy = new Proxy(freshModel(), {
    ownKeys: function () {
      throw new Error('proxy trap');
    }
  });
  equal(CombatProgress.queryDungeons(proxy), { dungeons: [] },
    'proxy-bearing query input fails closed');
  const before = bytes(freshModel());
  const hostileStart = CombatProgress.startDungeon(proxy, 'breathCave', 1);
  ok(!hostileStart.ok && hostileStart.code === 'invalid_state',
    'hostile mutation input fails closed');
  equal(bytes(freshModel()), before,
    'hostile input cannot change ordinary state');
}

{
  const source = fs.readFileSync('./core/combat-progress.js', 'utf8');
  const customDungeons = json(CombatContent.DUNGEONS);
  customDungeons.foundationAltar.requiredItems = { foundationPill: 1 };
  const browserContent = Object.freeze({
    REGIONS: CombatContent.REGIONS,
    ENEMIES: CombatContent.ENEMIES,
    DUNGEONS: customDungeons,
    LOOT_TABLES: CombatContent.LOOT_TABLES,
    getRegion: function (id) {
      return CombatContent.REGIONS[id] || null;
    },
    getEnemy: function (id) {
      return CombatContent.ENEMIES[id] || null;
    },
    getDungeon: function (id) {
      return customDungeons[id] || null;
    }
  });
  const context = {
    CombatContent: browserContent,
    RealmContent: RealmContent,
    TechniqueContent: TechniqueContent,
    CombatEngine: CombatEngine,
    CombatRewards: CombatRewards,
    Techniques: Techniques,
    Stage3State: Stage3State,
    Inventory: require('../core/inventory.js'),
    structuredClone: structuredClone
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'combat-progress.js' });
  ok(Object.isFrozen(context.CombatProgress),
    'browser UMD publishes frozen CombatProgress');

  let model = setRealm(freshModel(), 'foundation');
  model.player.combatProgress.firstClears.breathCave = true;
  const missing = context.CombatProgress.startDungeon(
    model, 'foundationAltar', 1
  );
  ok(!missing.ok && missing.code === 'required_item_missing',
    'optional key-item prerequisite is enforced atomically');
  model.player.inventory.stacks.foundationPill = 1;
  const started = context.CombatProgress.startDungeon(
    model, 'foundationAltar', 1
  );
  ok(started.ok, 'key-item prerequisite permits dungeon start');
  equal(started.state.player.inventory.stacks.foundationPill, 1,
    'key item is checked but never consumed');

  const permissiveStateContext = {
    CombatContent: CombatContent,
    RealmContent: RealmContent,
    TechniqueContent: TechniqueContent,
    CombatEngine: CombatEngine,
    CombatRewards: CombatRewards,
    Techniques: Techniques,
    Stage3State: Object.freeze({
      normalizeSession: function (session) {
        return structuredClone(session);
      }
    }),
    Inventory: require('../core/inventory.js'),
    structuredClone: structuredClone
  };
  permissiveStateContext.globalThis = permissiveStateContext;
  vm.runInNewContext(source, permissiveStateContext, {
    filename: 'combat-progress-local-validator.js'
  });
  const localRegion = permissiveStateContext.CombatProgress.startRegion(
    freshModel(), 'qingyunOutskirts', 'thornHare', 2
  ).state;
  const localStaleDead = json(localRegion);
  localStaleDead.systems.combat.session.enemy.hp = 0;
  localStaleDead.systems.combat.session.intermissionTicks = 3;
  const localStaleBefore = bytes(localStaleDead);
  const localSettle =
    permissiveStateContext.CombatProgress.afterEnemyDefeated(
      localStaleDead,
      {
        createdAtMs: 3,
        sectContext: {
          sectId: null,
          favoredTechniqueIds: [],
          favoredTags: []
        }
      }
    );
  ok(!localSettle.ok,
    'CombatProgress locally rejects stale settlement phase');
  equal(bytes(localSettle.state), localStaleBefore,
    'local stale settlement validator is byte-preserving');

  const localDungeon =
    permissiveStateContext.CombatProgress.startDungeon(
      freshModel(), 'breathCave', 4
    ).state;
  const localStaleSpawn = json(localDungeon);
  localStaleSpawn.systems.combat.session.enemy = null;
  localStaleSpawn.systems.combat.session.waveDefeated = 2;
  localStaleSpawn.systems.combat.session.intermissionTicks = 1;
  const localSpawnBefore = bytes(localStaleSpawn);
  const localSpawn =
    permissiveStateContext.CombatProgress.nextDungeonEnemy(
      localStaleSpawn
    );
  ok(!localSpawn.ok,
    'CombatProgress locally rejects count-exhausted spawn phase');
  equal(bytes(localSpawn.state), localSpawnBefore,
    'local stale spawn validator is byte-preserving');
}

console.log(
  '\n=== Stage 3 区域/副本进度自测：' + passed + ' 通过 / 0 失败 ==='
);
