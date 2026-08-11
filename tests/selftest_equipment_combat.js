'use strict';

const assert = require('assert');
const Equipment = require('../core/equipment.js');
const Stage3State = require('../core/stage3-state.js');
const CombatLoadouts = require('../core/combat-loadouts.js');
const CombatStats = require('../core/combat-stats.js');
const TeamCombatSnapshot = require('../core/team-combat-snapshot.js');
const CombatContent = require('../content/combat.js');

const weapon = Equipment.generate({
  baseId: 'qi-weapon',
  quality: 'rare',
  instanceId: 'eq-1',
  source: { type: 'test', sourceId: 'combat', acquiredAt: 1 },
  rngState: 42
}).instance;

const model = Stage3State.normalize({
  created: true,
  player: {
    name: '测试者',
    realmStage: 3,
    breakthrough: {
      realmId: 'qi-3',
      cultivation: 0,
      eventBuffs: []
    },
    inventory: {
      capacity: 40,
      capacityGrants: {},
      stacks: {},
      bindings: {},
      equipment: {
        version: 1,
        nextInstanceId: 2,
        instances: [weapon]
      }
    }
  },
  systems: {}
});

const loadout = model.player.combat.loadouts[0];
assert.deepStrictEqual(Object.keys(loadout.equipment), [
  'weapon',
  'head',
  'robe',
  'bracer',
  'belt',
  'boots',
  'accessory',
  'artifact'
]);

const baseAttack = CombatStats.derive(model, loadout.id).attack;
const changed = CombatLoadouts.setEquipment(
  model,
  loadout.id,
  'weapon',
  'eq-1'
);
assert(changed.ok);
assert.strictEqual(
  changed.state.player.combat.loadouts[0].equipment.weapon,
  'eq-1'
);
assert(
  CombatStats.derive(changed.state, loadout.id).attack > baseAttack
);

const wrongSlot = CombatLoadouts.setEquipment(
  changed.state,
  loadout.id,
  'robe',
  'eq-1'
);
assert.strictEqual(wrongSlot.ok, false);
assert.strictEqual(wrongSlot.code, 'equipment_type_mismatch');

const rows = CombatLoadouts.query(changed.state).loadouts[0].equipment;
assert.strictEqual(rows.length, 8);
assert.strictEqual(rows[0].instanceId, 'eq-1');
assert.strictEqual(rows[0].slot, 'weapon');
assert.strictEqual(rows[7].slot, 'artifact');
assert.strictEqual(rows[7].unlocked, false);

const enemyId = Object.keys(CombatContent.ENEMIES)[0];
const session = TeamCombatSnapshot.createSession(changed.state, {
  mode: 'region',
  regionId: Object.keys(CombatContent.REGIONS)[0],
  enemyIds: [enemyId],
  rngState: 77
});
assert(session);
assert.strictEqual(session.teams.allies[0].equipment.length, 1);
assert.strictEqual(
  session.teams.allies[0].equipment[0].instanceId,
  'eq-1'
);
assert(Object.isFrozen(session.teams.allies[0].equipment));

const mutable = JSON.parse(JSON.stringify(changed.state));
mutable.player.inventory.equipment.instances[0].baseId = 'qi-head';
assert.strictEqual(
  session.teams.allies[0].equipment[0].baseId,
  'qi-weapon'
);

console.log('equipment combat self-test passed');
