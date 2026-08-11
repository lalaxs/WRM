'use strict';

const TeamCombatEngine = require('../core/team-combat-engine.js');
const GameRandom = require('../core/random.js');
const TechniqueContent = require('../content/techniques.js');

function ok(value, message) {
  if (!value) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function unit(id, side, overrides) {
  return Object.assign({
    id: id,
    side: side,
    sourceType: side === 'ally' ? 'player' : 'enemy',
    sourceId: id,
    name: id,
    hp: 100,
    maxHp: 100,
    qi: 50,
    maxQi: 50,
    attack: 20,
    defense: 0,
    accuracy: 100,
    evasion: 0,
    critChance: 0,
    critDamage: 1.5,
    actionIntervalTicks: 2,
    cooldownTicks: 0,
    statuses: {},
    cooldowns: {},
    shield: 0,
    threat: 1,
    fallen: false,
    techniques: [],
    supplies: {},
    cooperation: 1
  }, overrides || {});
}

function sessionFor(allies, enemies) {
  return {
    mode: 'region',
    actionKey: 'combat:region:test:enemy-a',
    dangerLevel: 'safe',
    waveIndex: 0,
    waveDefeated: 0,
    elapsedTicks: 0,
    tickRemainderSeconds: 0,
    teams: { allies: allies, enemies: enemies }
  };
}

const basic = sessionFor(
  [unit('ally-player', 'ally', { attack: 40 })],
  [unit('enemy-1', 'enemy', { hp: 30, maxHp: 30, attack: 1 })]
);
const basicBefore = clone(basic);
const first = TeamCombatEngine.advanceTick(basic, { rngState: 1 });
ok(first.ok, 'tick succeeds');
ok(first.session !== basic, 'tick returns cloned session');
ok(JSON.stringify(basic) === JSON.stringify(basicBefore), 'tick does not mutate input');
ok(first.session.elapsedTicks === 1, 'elapsed ticks increment');
ok(first.events.some(function (event) { return event.type === 'damage'; }),
  'normal attack emits damage event');
ok(first.session.teams.enemies[0].fallen, 'normal attack can defeat an enemy');
ok(first.outcome === 'enemies_defeated', 'defeating all enemies produces outcome');
ok(first.metrics.damageDealt === 30, 'normal attack updates applied damage metric');

const defeatedAllies = TeamCombatEngine.advanceTick(sessionFor(
  [unit('ally-player', 'ally', { hp: 1, maxHp: 1, attack: 0 })],
  [unit('enemy-1', 'enemy', { attack: 10 })]
), { rngState: 1 });
ok(defeatedAllies.outcome === 'allies_defeated',
  'defeating all allies produces outcome');

const targeting = sessionFor([
  unit('ally-player', 'ally')
], [
  unit('enemy-a', 'enemy', { hp: 30, maxHp: 100, threat: 2 }),
  unit('enemy-b', 'enemy', { hp: 20, maxHp: 100, threat: 9 }),
  unit('enemy-c', 'enemy', { hp: 20, maxHp: 100, threat: 9 })
]);
ok(TeamCombatEngine.selectTarget(targeting, targeting.teams.allies[0],
  'highestThreatEnemy', 5).targetId === 'enemy-b',
  'highest threat target uses id tie break');
ok(TeamCombatEngine.selectTarget(targeting, targeting.teams.allies[0],
  'lowestHpEnemy', 5).targetId === 'enemy-b',
  'lowest hp target uses id tie break');
ok(TeamCombatEngine.selectTarget(targeting, targeting.teams.allies[0],
  'randomEnemy', 5).targetId === TeamCombatEngine.selectTarget(
    targeting, targeting.teams.allies[0], 'randomEnemy', 5
  ).targetId, 'random target is deterministic');
ok(TeamCombatEngine.selectTarget(targeting, targeting.teams.allies[0],
  'self', 5).targetId === 'ally-player', 'self target selects actor');

const healing = TeamCombatEngine.advanceTick(sessionFor([
  unit('ally-player', 'ally', { hp: 40, maxHp: 100, attack: 0 }),
  unit('ally-healer', 'ally', {
    attack: 0,
    techniques: [{
      techniqueId: 'clearHeartArt',
      targetRule: 'lowestHpAlly',
      condition: { type: 'allyHpBelow', threshold: 0.8 },
      effect: { type: 'heal', maxHpRatio: 0.2 }
    }]
  })
], [unit('enemy-1', 'enemy', { attack: 0 })]), { rngState: 1 });
ok(healing.events.some(function (event) {
  return event.type === 'heal' && event.targetId === 'ally-player' && event.amount === 20;
}), 'maxHpRatio healing effect from snapshot is applied');
ok(healing.session.teams.allies[0].hp === 60, 'healing restores capped max hp ratio');

const techniqueAttack = TeamCombatEngine.advanceTick(sessionFor([
  unit('ally-player', 'ally', {
    attack: 20,
    techniques: [{
      techniqueId: 'snapshotStrike',
      targetRule: 'lowestHpEnemy',
      condition: { type: 'always' },
      effect: { type: 'attack', multiplier: 2, hits: 2, defenseIgnore: 1 }
    }]
  })
], [unit('enemy-1', 'enemy', { hp: 100, maxHp: 100, defense: 10, attack: 0 })]),
{ rngState: 1 });
ok(techniqueAttack.events.filter(function (event) {
  return event.type === 'damage' && event.techniqueId === 'snapshotStrike';
}).length === 2, 'snapshot attack effect applies each configured hit');
ok(techniqueAttack.session.teams.enemies[0].hp === 20,
  'attack multiplier and defense ignore affect damage');

const thunderEffect = clone(TechniqueContent.get('thunderSeal').effect);
thunderEffect.status.chance = 1;
const thunderSeed = 1;
const thunderResult = TeamCombatEngine.advanceTick(sessionFor([
  unit('ally-player', 'ally', {
    attack: 20,
    techniques: [{
      techniqueId: 'thunderSeal',
      targetRule: 'highestThreatEnemy',
      condition: { type: 'always' },
      effect: thunderEffect
    }]
  })
], [unit('enemy-1', 'enemy', { cooldownTicks: 2, attack: 0 })]), {
  rngState: thunderSeed
});
const afterHit = GameRandom.next(thunderSeed);
const afterCrit = GameRandom.next(afterHit.seed);
const afterStatusChance = GameRandom.next(afterCrit.seed);
ok(thunderResult.session.teams.enemies[0].statuses.shock.remainingTicks === 8,
  'thunderSeal snapshot status stores remaining ticks');
ok(thunderResult.rngState === afterStatusChance.seed,
  'status chance advances deterministic rng state');

const bindingEffect = clone(TechniqueContent.get('bindingTalisman').effect);
const bindingResult = TeamCombatEngine.advanceTick(sessionFor([
  unit('ally-player', 'ally', {
    attack: 20,
    techniques: [{
      techniqueId: 'bindingTalisman',
      targetRule: 'highestThreatEnemy',
      condition: { type: 'always' },
      effect: bindingEffect
    }]
  })
], [unit('enemy-1', 'enemy', { cooldownTicks: 2, attack: 0 })]), {
  rngState: 1
});
const bindingStatus = bindingResult.session.teams.enemies[0].statuses.slow;
ok(bindingStatus.remainingTicks === 12,
  'binding status stores snapshot duration ticks');
ok(bindingStatus.attackIntervalTicks === 2,
  'binding maps to slow and preserves attack interval effect');

console.log('team combat engine selftest passed');
