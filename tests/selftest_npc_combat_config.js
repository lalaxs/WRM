'use strict';

const Stage4State = require('../core/stage4-state.js');

function ok(value, message) {
  if (!value) throw new Error(message);
}

const model = Stage4State.normalize({
  player: {},
  systems: {
    npcs: {
      nextId: 2,
      records: {
        'npc-1': {
          identity: { name: '青岚' },
          realmStage: 4,
          techniques: ['cloudPiercingSword'],
          combatProfile: {
            preferenceTags: ['heal', 'wood', 'constructor'],
            equipment: {
              weapon: { id: 'npc-weapon-1', name: '青木短剑', tags: ['wood'], stats: { attack: 7 } }
            },
            activeTechniques: [
              { techniqueId: 'clearHeartArt', level: 3, condition: { type: 'allyHpBelow', threshold: 0.55 } }
            ],
            passiveTechniques: [
              { techniqueId: 'steadyBreath', level: 2 }
            ],
            supplies: {
              food: { id: 'npc-food-1', label: '随身灵膳', heal: 20, triggerRatio: 0.5 }
            },
            sourceEvents: ['event-a', 'event-a', '__proto__']
          }
        }
      },
      activeIds: ['npc-1'],
      backgroundIds: []
    }
  }
}, { preserveLegacyFields: true });

const npc = model.systems.npcs.records['npc-1'];
ok(npc.combatProfile, 'npc combat profile is normalized');
ok(npc.combatProfile.preferenceTags.indexOf('heal') >= 0, 'valid preference tag retained');
ok(npc.combatProfile.preferenceTags.indexOf('constructor') < 0, 'unsafe preference tag removed');
ok(npc.combatProfile.equipment.weapon.id === 'npc-weapon-1', 'weapon profile retained');
ok(npc.combatProfile.equipment.armor === null, 'missing armor becomes null');
ok(npc.combatProfile.activeTechniques[0].techniqueId === 'clearHeartArt', 'active technique retained');
ok(npc.combatProfile.activeTechniques[0].condition.type === 'allyHpBelow', 'npc condition retained');
ok(npc.combatProfile.passiveTechniques[0].level === 2, 'passive level retained');
ok(npc.combatProfile.supplies.food.triggerRatio === 0.5, 'fixed supply strategy retained');
ok(npc.combatProfile.sourceEvents.length === 1, 'source events deduplicate unsafe ids');

const fallback = Stage4State.normalize({
  systems: {
    npcs: {
      records: { 'npc-2': { identity: { name: '无配置' } } },
      activeIds: ['npc-2'],
      backgroundIds: []
    }
  }
}, { preserveLegacyFields: true }).systems.npcs.records['npc-2'];

ok(Array.isArray(fallback.combatProfile.preferenceTags), 'fallback profile exists');
ok(fallback.combatProfile.equipment.weapon === null, 'fallback weapon null');
ok(fallback.combatProfile.activeTechniques.length === 0, 'fallback has no fake active technique');

console.log('npc combat profile normalization selftest passed');
