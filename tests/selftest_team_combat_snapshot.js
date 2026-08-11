'use strict';

const fs = require('fs');
const vm = require('vm');
const Stage4State = require('../core/stage4-state.js');
const TeamCombatSnapshot = require('../core/team-combat-snapshot.js');
const CombatContent = require('../content/combat.js');
const TechniqueContent = require('../content/techniques.js');
const CombatStats = require('../core/combat-stats.js');
const CombatParty = require('../core/combat-party.js');
const Techniques = require('../core/techniques.js');

function ok(value, message) {
  if (!value) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const model = Stage4State.normalize({
  player: {
    breakthrough: { realmId: 'qi-1', cultivation: 0, eventBuffs: [] },
    combat: {
      activeLoadoutId: 'loadout-1',
      nextLoadoutId: 2,
      injury: null,
      loadouts: [{
        id: 'loadout-1',
        name: '方案一',
        equipment: { weapon: null, armor: null, accessory: null },
        activeTechniques: [
          { techniqueId: 'cloudPiercingSword', condition: { type: 'always' } },
          { techniqueId: null, condition: { type: 'always' } },
          { techniqueId: null, condition: { type: 'always' } }
        ],
        passiveTechniques: [null, null, null, null, null],
        supplies: {
          food: { itemId: null, triggerRatio: 0.5, stopWhenEmpty: false },
          pill: { itemId: null, triggerRatio: 0.3, stopWhenEmpty: false },
          talisman: { itemId: null, useAt: 'enemy_start', stopWhenEmpty: false }
        }
      }]
    },
    techniques: { known: { cloudPiercingSword: { level: 2 } } }
  },
  systems: {
    teamCombat: { companionIds: ['npc-1', null, null], reactionLog: [] },
    npcs: {
      nextId: 2,
      records: {
        'npc-1': {
          identity: { name: '青岚' },
          status: 'living',
          lifeStage: 'adult',
          realmStage: 3,
          combatProfile: {
            preferenceTags: ['heal', 'wood'],
            equipment: { weapon: null, armor: null, accessory: null },
            activeTechniques: [{
              techniqueId: 'clearHeartArt',
              level: 2,
              condition: { type: 'allyHpBelow', threshold: 0.6 }
            }],
            passiveTechniques: [],
            supplies: { food: null, pill: null, talisman: null },
            sourceEvents: ['seed']
          }
        }
      },
      activeIds: ['npc-1'],
      backgroundIds: []
    },
    relationships: {
      edges: {
        'player>npc-1': {
          affection: 80, trust: 70, romanticAttachment: 10, desire: 0,
          dependence: 0, loyalty: 10, jealousy: 0, resentment: 0,
          lastChangedAt: 0
        },
        'npc-1>player': {
          affection: 70, trust: 65, romanticAttachment: 8, desire: 0,
          dependence: 0, loyalty: 10, jealousy: 0, resentment: 0,
          lastChangedAt: 0
        }
      },
      bonds: {
        'npc-1|player': {
          stage: 'friend', changedAt: 0, changedByEventId: 'seed'
        }
      },
      restrictions: {}
    }
  }
}, { preserveLegacyFields: true });

const before = clone(model);
const session = TeamCombatSnapshot.createSession(model, {
  mode: 'region',
  regionId: 'qingyunOutskirts',
  enemyIds: ['thornHare', 'grayWolf'],
  loadoutId: 'loadout-1',
  rngState: 7
});

ok(session, 'team session is created');
ok(session.teams.allies.length === 2, 'player plus one companion in allies');
ok(session.teams.enemies.length === 2, 'two enemies in enemies');
ok(session.teams.allies[0].sourceType === 'player', 'first ally is player');
ok(session.teams.allies[1].sourceType === 'npc', 'second ally is npc');
const playerTechnique = session.teams.allies[0].techniques[0];
ok(playerTechnique.effect.multiplier === 1.428,
  'player technique effect is scaled for level 2');
ok(session.teams.allies[1].techniques[0].techniqueId === 'clearHeartArt',
  'npc fixed technique copied');
const npcTechnique = session.teams.allies[1].techniques[0];
ok(npcTechnique.effect.maxHpRatio === 0.204,
  'npc technique effect is scaled for level 2');
playerTechnique.effect.multiplier = 999;
npcTechnique.effect.maxHpRatio = 999;
ok(Techniques.scaledEffect('cloudPiercingSword', 2).multiplier === 1.428 &&
   TechniqueContent.get('cloudPiercingSword').effect.multiplier === 1.4,
  'player session effect is detached from scaled and content effects');
ok(Techniques.scaledEffect('clearHeartArt', 2).maxHpRatio === 0.204 &&
   TechniqueContent.get('clearHeartArt').effect.maxHpRatio === 0.2,
  'npc session effect is detached from scaled and content effects');
ok(session.teams.allies[1].cooperation > 1, 'npc cooperation included');
ok(session.teams.enemies.every(function (unit) {
  return unit.side === 'enemy' && unit.hp > 0;
}), 'enemy units are valid');
ok(session.dangerLevel === 'safe', 'region danger copied');
ok(JSON.stringify(model) === JSON.stringify(before), 'session creation does not mutate model');

model.systems.npcs.records['npc-1'].combatProfile.activeTechniques[0].level = 20;
ok(session.teams.allies[1].techniques[0].level === 2,
  'session snapshots npc profile');
ok(TeamCombatSnapshot.createSession(model, {
  mode: 'region', regionId: 'qingyunOutskirts', enemyIds: [], rngState: 7
}) === null, 'empty enemy formation is rejected');
ok(TeamCombatSnapshot.createSession(model, {
  mode: 'region', regionId: 'qingyunOutskirts',
  enemyIds: ['thornHare', 'thornHare', 'thornHare', 'thornHare', 'thornHare'],
  rngState: 7
}) === null, 'oversized enemy formation is rejected');
ok(TeamCombatSnapshot.createSession(model, {
  mode: 'region', regionId: 'qingyunOutskirts', enemyIds: ['unknown'], rngState: 7
}) === null, 'missing enemy is rejected');

const browserContext = {
  CombatContent,
  TechniqueContent,
  CombatStats,
  CombatParty,
  Techniques
};
browserContext.globalThis = browserContext;
vm.runInNewContext(
  fs.readFileSync('./core/team-combat-snapshot.js', 'utf8'),
  browserContext,
  { filename: 'core/team-combat-snapshot.js' }
);
ok(browserContext.TeamCombatSnapshot &&
   Object.isFrozen(browserContext.TeamCombatSnapshot),
  'browser UMD installs the frozen TeamCombatSnapshot global');

console.log('team combat snapshot selftest passed');
