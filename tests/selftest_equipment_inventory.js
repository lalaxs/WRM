'use strict';

const assert = require('assert');
const Equipment = require('../core/equipment.js');
const Inventory = require('../core/inventory.js');
const Stage2State = require('../core/stage2-state.js');
const StateModel = require('../core/state-model.js');

function makeInstance(instanceId, baseId = 'qi-weapon') {
  const generated = Equipment.generate({
    baseId,
    quality: 'rare',
    instanceId,
    source: { type: 'test', sourceId: 'inventory', acquiredAt: 1 },
    rngState: Number(instanceId.replace(/\D/g, '')) || 1
  });
  assert(generated.ok);
  return generated.instance;
}

const first = makeInstance('eq-1');
const second = makeInstance('eq-2', 'qi-head');
const bag = {
  capacity: 2,
  capacityGrants: {},
  stacks: { copperOre: 20 },
  bindings: {},
  equipment: { version: 1, nextInstanceId: 2, instances: [first] }
};

assert.strictEqual(Inventory.occupiedSlots(bag), 2);
const rejected = Inventory.addEquipment(bag, second);
assert.strictEqual(rejected.ok, false);
assert.strictEqual(rejected.code, 'inventory_full');
assert.strictEqual(rejected.value.equipment.instances.length, 1);

const roomy = { ...bag, capacity: 3 };
const added = Inventory.addEquipment(roomy, second);
assert(added.ok);
assert.strictEqual(added.value.equipment.instances.length, 2);
assert.strictEqual(Inventory.findEquipment(added.value, 'eq-2').baseId, 'qi-head');
assert.strictEqual(added.value.equipment.nextInstanceId, 3);

const favorited = Equipment.normalizeInstance({ ...second, favorite: true });
const replaced = Inventory.replaceEquipment(added.value, favorited);
assert(replaced.ok);
assert.strictEqual(
  Inventory.findEquipment(replaced.value, 'eq-2').favorite,
  true
);

const removed = Inventory.removeEquipment(replaced.value, 'eq-2');
assert(removed.ok);
assert.strictEqual(removed.result.instanceId, 'eq-2');
assert.strictEqual(removed.value.equipment.instances.length, 1);

const queried = Inventory.query(added.value, {
  category: 'equipment',
  search: '凝露'
});
assert.strictEqual(queried.used, 3);
assert.strictEqual(queried.items.length, 1);
assert.strictEqual(queried.items[0].instanceId, 'eq-2');
assert.strictEqual(queried.items[0].slot, 'head');
assert.strictEqual(queried.items[0].quantity, 1);

const migrated = Stage2State.normalize({
  player: {
    inventory: {
      capacity: 40,
      capacityGrants: {},
      stacks: { cloudwoodSword: 2, copperOre: 3 },
      bindings: {}
    }
  },
  systems: {}
});
assert.strictEqual(migrated.player.inventory.equipment.instances.length, 2);
assert.strictEqual(
  migrated.player.inventory.equipment.instances[0].instanceId,
  'legacy-cloudwoodSword-1'
);
assert.strictEqual(
  migrated.player.inventory.stacks.cloudwoodSword,
  undefined
);
assert.strictEqual(migrated.player.inventory.stacks.copperOre, 3);

const reopened = Stage2State.normalize(migrated);
assert.deepStrictEqual(reopened.player.inventory, migrated.player.inventory);

const model = StateModel.normalize({
  version: 1,
  created: true,
  player: migrated.player,
  systems: migrated.systems
});
assert.strictEqual(model.player.inventory.equipment.instances.length, 2);

console.log('equipment inventory self-test passed');
