'use strict';

const Stage4State = require('../core/stage4-state.js');
const TeamCombatConsequences = require('../core/team-combat-consequences.js');
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
const SkillProgression = require('../core/skill-progression.js');
const SpiritBeasts = require('../core/spirit-beasts.js');
const Stage2Rules = require('../core/stage2-rules.js');
const Stage3State = require('../core/stage3-state.js');
const StateModel = require('../core/state-model.js');
const Techniques = require('../core/techniques.js');
const CombatEngine = require('../core/combat-engine.js');
const CombatProgress = require('../core/combat-progress.js');
const TeamCombatEngine = require('../core/team-combat-engine.js');
const TeamCombatSnapshot = require('../core/team-combat-snapshot.js');
const Stage3Rules = require('../core/stage3-rules.js');

function ok(value, message) {
  if (!value) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function gameRulesConfig() {
  return {
    actions: {},
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

function runtimeDeps() {
  return {
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
    Techniques: Techniques,
    TeamCombatEngine: TeamCombatEngine,
    TeamCombatSnapshot: TeamCombatSnapshot,
    TeamCombatConsequences: TeamCombatConsequences
  };
}

function freshTeamModel(seed) {
  const state = Stage3State.normalize(
    StateModel.normalize(Stage3State.defaults(), 0)
  );
  state.current = null;
  state.rngState = seed == null ? 7 : seed;
  state.systems.teamCombat = {
    companionIds: [null, null, null],
    reactionLog: []
  };
  return state;
}

function startTeam(runtime, key, seed) {
  const started = runtime.rules.start(freshTeamModel(seed), key, 0);
  ok(started.ok, 'team combat start succeeds');
  ok(!!started.state.systems.combat.session.teams,
    'team combat start installs a team session');
  return clone(started.state);
}

function advance(runtime, state, fromMs) {
  return Simulation.advance(state, 0.25, {
    source: 'online',
    fromMs: fromMs || 0,
    rules: runtime.rules,
    lanes: runtime.lanes
  });
}

function forceTeamVictory(state) {
  const session = state.systems.combat.session;
  const player = session.teams.allies[0];
  const enemy = session.teams.enemies[0];
  player.attack = 1000000;
  player.accuracy = 1000000;
  player.cooldownTicks = 0;
  enemy.hp = 1;
  enemy.maxHp = 1;
  enemy.cooldownTicks = 999999;
}

function forceTeamMultiVictory(state) {
  const session = state.systems.combat.session;
  const replacement = TeamCombatSnapshot.createSession(state, {
    mode: 'region',
    regionId: 'qingyunOutskirts',
    enemyIds: ['thornHare', 'grayWolf'],
    loadoutId: state.player.combat.activeLoadoutId,
    rngState: state.rngState
  });
  session.teams.enemies = clone(replacement.teams.enemies);
  const player = session.teams.allies[0];
  player.attack = 1000000;
  player.accuracy = 1000000;
  player.cooldownTicks = 0;
  player.techniques = [{
    techniqueId: 'test-multi-hit',
    condition: { type: 'always' },
    targetRule: 'highestThreatEnemy',
    effect: { type: 'attack', hits: 2, multiplier: 1 }
  }];
  session.teams.enemies.forEach(function (enemy) {
    enemy.hp = 1;
    enemy.maxHp = 1;
    enemy.cooldownTicks = 999999;
  });
}

function forceTeamPartialDefeat(state) {
  const session = state.systems.combat.session;
  const replacement = TeamCombatSnapshot.createSession(state, {
    mode: 'region',
    regionId: 'qingyunOutskirts',
    enemyIds: ['thornHare', 'grayWolf'],
    loadoutId: state.player.combat.activeLoadoutId,
    rngState: state.rngState
  });
  session.teams.enemies = clone(replacement.teams.enemies);
  const player = session.teams.allies[0];
  const enemies = session.teams.enemies;
  player.attack = 1000000;
  player.accuracy = 1000000;
  player.cooldownTicks = 0;
  enemies[0].hp = 1;
  enemies[0].maxHp = 1;
  enemies[1].hp = 1000000;
  enemies[1].maxHp = 1000000;
  enemies[1].cooldownTicks = 999999;
}

const model = Stage4State.normalize({
  player: { shouyuan: 80, combat: { injury: null } },
  systems: {
    teamCombat: { companionIds: ['npc-1', null, null], reactionLog: [] },
    npcs: {
      nextId: 2,
      records: {
        'npc-1': {
          identity: { name: '\u9752\u5c9a' },
          status: 'living',
          lifeStage: 'adult',
          lifespanYears: 90,
          ageYears: 30,
          combatProfile: {}
        }
      },
      activeIds: ['npc-1'],
      backgroundIds: []
    },
    relationships: {
      edges: {
        'player>npc-1': { affection: 80, trust: 70, romanticAttachment: 20, desire: 0, dependence: 0, loyalty: 0, jealousy: 0, resentment: 0, lastChangedAt: 0 },
        'npc-1>player': { affection: 80, trust: 70, romanticAttachment: 20, desire: 0, dependence: 0, loyalty: 0, jealousy: 0, resentment: 0, lastChangedAt: 0 }
      },
      bonds: { 'npc-1|player': { stage: 'friend', changedAt: 0, changedByEventId: 'seed' } },
      restrictions: {}
    }
  }
}, { preserveLegacyFields: true });

const session = {
  dangerLevel: 'deathTrial',
  teams: {
    allies: [
      { id: 'ally-player', sourceType: 'player', sourceId: 'player', fallen: false },
      { id: 'ally-npc-1', sourceType: 'npc', sourceId: 'npc-1', fallen: true }
    ],
    enemies: []
  }
};

const result = TeamCombatConsequences.apply(model, session, 'allies_defeated', 12345);
ok(result.ok, 'death-trial consequence applies');
ok(result.result.lifespanLosses.length === 1, 'only fallen participant loses lifespan');
ok(result.result.lifespanLosses[0].personId === 'npc-1', 'fallen npc loses lifespan');
ok(result.state.systems.npcs.records['npc-1'].lifespanYears === 88, 'npc lifespan reduced');
ok(result.state.systems.teamCombat.reactionLog.length === 1, 'relationship risk reaction logged');
ok(result.state.systems.relationships.edges['player>npc-1'].affection === 76, 'relationship reaction mutates affection');
ok(result.state.systems.relationships.edges['player>npc-1'].trust === 68, 'relationship reaction mutates trust');

const safe = TeamCombatConsequences.apply(model, Object.assign({}, session, { dangerLevel: 'safe' }), 'allies_defeated', 12345);
ok(safe.ok && safe.result.lifespanLosses.length === 0, 'safe combat has no lifespan loss');

const runtime = Stage3Rules.create(runtimeDeps());

{
  const state = startTeam(
    runtime,
    'combat:region:qingyunOutskirts:thornHare',
    17
  );
  forceTeamPartialDefeat(state);
  const tick = advance(runtime, state, 0);
  const sessionAfter = tick.state.systems.combat.session;
  ok(sessionAfter.player.hp === sessionAfter.teams.allies[0].hp,
    'team tick synchronizes legacy player hp');
  ok(sessionAfter.enemy.hp === sessionAfter.teams.enemies[0].hp,
    'team tick synchronizes legacy enemy hp');
  ok(sessionAfter.enemy.fallen === sessionAfter.teams.enemies[0].fallen,
    'team tick synchronizes legacy enemy fallen state');
}

{
  const state = startTeam(
    runtime,
    'combat:region:qingyunOutskirts:thornHare',
    23
  );
  forceTeamVictory(state);
  const won = advance(runtime, state, 0);
  const sessionAfter = won.state.systems.combat.session;
  ok(won.state.player.combatProgress.enemyKills.thornHare === 1,
    'team region victory settles enemy progress');
  ok(Object.keys(won.report.combat.loot).length > 0,
    'team region victory reports rolled loot');
  ok(sessionAfter && sessionAfter.teams.enemies[0].fallen === false,
    'team region victory replaces defeated enemies');
  ok(sessionAfter.enemy === null && sessionAfter.intermissionTicks > 0,
    'team region victory enters the compatibility intermission');
}

{
  const state = startTeam(
    runtime,
    'combat:region:qingyunOutskirts:thornHare',
    29
  );
  forceTeamMultiVictory(state);
  const won = advance(runtime, state, 0);
  const sessionAfter = won.state.systems.combat.session;
  const expectedCultivation = CombatContent.getEnemy('thornHare').cultivation +
    CombatContent.getEnemy('grayWolf').cultivation;
  ok(won.state.player.combatProgress.enemyKills.thornHare === 1 &&
    won.state.player.combatProgress.enemyKills.grayWolf === 1,
  'team victory records every defeated enemy');
  ok(won.report.gains.cultivation === expectedCultivation,
    'team victory grants cultivation for every defeated enemy');
  ok(JSON.stringify(sessionAfter.teams.enemies.map(function (enemy) {
    return enemy.sourceId;
  })) === JSON.stringify(['thornHare', 'grayWolf']),
  'team region replacement preserves multiple enemy ids');
}

{
  const state = startTeam(
    runtime,
    'combat:region:qingyunOutskirts:thornHare',
    37
  );
  state.player.inventory.capacity = 1;
  state.player.inventory.stacks = { spiritRice: 1 };
  forceTeamMultiVictory(state);
  const continued = advance(runtime, state, 0);
  const pending = continued.state.systems.combat.pendingLoot;
  ok(pending !== null,
    'full inventory creates pending loot for a team victory');
  ok(continued.state.current !== null &&
    continued.state.systems.combat.session !== null &&
    continued.report.action.stopReason === null,
  'full inventory keeps the team combat loop running');
  ok(JSON.stringify(pending.items) ===
    JSON.stringify(continued.report.combat.loot),
  'pending team loot preserves every defeated enemy reward');
}

{
  const state = startTeam(runtime, 'combat:dungeon:breathCave', 31);
  forceTeamVictory(state);
  const won = advance(runtime, state, 0);
  const sessionAfter = won.state.systems.combat.session;
  ok(sessionAfter.waveDefeated === 1,
    'team dungeon victory advances the wave count');
  ok(sessionAfter.teams.enemies[0].fallen === false,
    'team dungeon victory prepares the next enemy');
  let spawned = won;
  for (let index = 0; index < sessionAfter.intermissionTicks; index++) {
    spawned = advance(runtime, spawned.state, (index + 1) * 250);
  }
  ok(spawned.state.systems.combat.session.enemy !== null,
    'team dungeon intermission exposes the next legacy enemy');
}

{
  let state = startTeam(
    runtime,
    'combat:region:qingyunOutskirts:thornHare',
    41
  );
  let kills = 0;
  for (let round = 0; round < 3; round++) {
    forceTeamVictory(state);
    const fought = advance(runtime, state, round * 500);
    ok(fought.report.action.stopReason === null &&
      fought.state.current !== null &&
      fought.state.systems.combat.session !== null,
    'team region keeps fighting after kill #' + (round + 1));
    state = fought.state;
    let wait = fought;
    const ticks = state.systems.combat.session.intermissionTicks || 0;
    for (let index = 0; index < ticks; index++) {
      wait = advance(
        runtime,
        wait.state,
        round * 500 + (index + 1) * 250
      );
    }
    state = wait.state;
    ok(state.systems.combat.session.enemy !== null &&
      Number.isFinite(state.systems.combat.session.enemy.phase),
    'team region respawns a complete legacy enemy after kill #' +
      (round + 1));
    kills = state.player.combatProgress.enemyKills.thornHare || 0;
  }
  ok(kills === 3, 'team region continuous combat records three kills');
}

console.log('team combat integration selftest passed');
