'use strict';

const Stage4State = require('../core/stage4-state.js');
const Relationships = require('../core/relationships.js');
const NpcCombatConfig = require('../core/npc-combat-config.js');
const CombatParty = require('../core/combat-party.js');

function ok(value, message) {
  if (!value) throw new Error(message);
}

function baseModel() {
  return Stage4State.normalize({
    player: {},
    systems: {
      npcs: {
        nextId: 3,
        records: {
          'npc-1': {
            identity: { name: '青岚' },
            status: 'living',
            lifeStage: 'adult',
            realmStage: 4
          },
          'npc-2': {
            identity: { name: '远客' },
            status: 'living',
            lifeStage: 'adult',
            realmStage: 4
          }
        },
        activeIds: ['npc-1', 'npc-2'],
        backgroundIds: []
      },
      relationships: {
        edges: {
          'player>npc-1': {
            affection: 72, trust: 60, romanticAttachment: 20, desire: 0,
            dependence: 0, loyalty: 10, jealousy: 0, closeness: 0,
            lastChangedAt: 0
          },
          'npc-1>player': {
            affection: 68, trust: 55, romanticAttachment: 15, desire: 0,
            dependence: 0, loyalty: 10, jealousy: 0, closeness: 0,
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
}

let model = baseModel();
ok(model.systems.teamCombat, 'team combat state exists');
ok(model.systems.teamCombat.companionIds.length === 3,
  'three companion slots exist');

const query = CombatParty.query(model);
ok(query.eligible.some(function (row) { return row.npcId === 'npc-1'; }),
  'friend is eligible');
ok(!query.eligible.some(function (row) { return row.npcId === 'npc-2'; }),
  'stranger is not eligible');

const selected = CombatParty.setCompanion(model, 0, 'npc-1', 1000);
ok(selected.ok && selected.state.systems.teamCombat.companionIds[0] === 'npc-1',
  'eligible companion can be selected');

const rejected = CombatParty.setCompanion(model, 1, 'npc-2', 1000);
ok(!rejected.ok && rejected.code === 'not_eligible',
  'ineligible companion rejected');

const event = NpcCombatConfig.applyConfigEvent(selected.state, 'npc-1', {
  id: 'gift-event-1',
  type: 'adoptTechnique',
  techniqueId: 'clearHeartArt',
  level: 2,
  preferenceTags: ['heal', 'wood']
});
ok(event.ok, 'config event accepted');
ok(event.state.systems.npcs.records['npc-1'].combatProfile.activeTechniques
  .some(function (slot) { return slot.techniqueId === 'clearHeartArt'; }),
  'event adds fixed npc technique');
ok(event.state.systems.npcs.records['npc-1'].combatProfile.sourceEvents
  .indexOf('gift-event-1') >= 0, 'event source is recorded');

const beforeReaction = Relationships.getEdge(event.state, 'player', 'npc-1');
const beforeCooperation = CombatParty.cooperationFor(event.state, 'npc-1');
const reaction = CombatParty.highRiskReaction(
  event.state,
  'npc-1',
  'desperate',
  2000,
  7
);
ok(reaction.ok && reaction.code === 'reaction' && reaction.result.triggered,
  'deterministic high risk reaction triggers');
ok(reaction.state.systems.teamCombat.reactionLog.length === 1,
  'reaction is logged');
ok(reaction.result.metricDeltas.affection < 0 &&
  reaction.result.metricDeltas.trust < 0,
  'triggered high risk reaction reduces relationship metrics');
const afterReaction = Relationships.getEdge(reaction.state, 'player', 'npc-1');
ok(afterReaction.affection === beforeReaction.affection +
  reaction.result.metricDeltas.affection &&
  afterReaction.trust === beforeReaction.trust +
  reaction.result.metricDeltas.trust,
  'triggered reaction persists relationship deltas');
ok(CombatParty.cooperationFor(reaction.state, 'npc-1') < beforeCooperation,
  'cooperation reflects updated relationship metrics');

let cappedReaction = reaction;
for (let index = 0; index < 51; index++) {
  cappedReaction = CombatParty.highRiskReaction(
    cappedReaction.state,
    'npc-1',
    'safe',
    3000 + index,
    10 + index
  );
}
const reactionIds = cappedReaction.state.systems.teamCombat.reactionLog
  .map(function (entry) { return entry.id; });
ok(reactionIds.length === 50 && new Set(reactionIds).size === 50,
  'reaction log ids remain unique after trimming');

console.log('combat party selftest passed');
