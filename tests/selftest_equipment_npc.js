'use strict';

const assert = require('assert');
const NpcGenerator = require('../core/npc-generator.js');
const NpcSimulation = require('../core/npc-simulation.js');
const Stage4State = require('../core/stage4-state.js');
const RegionContent = require('../content/regions.js');
const SectContent = require('../content/sects.js');
const NpcGenerationContent = require('../content/npc-generation.js');

const content = {
  regions: RegionContent,
  sects: SectContent,
  generation: NpcGenerationContent
};
const request = {
  nextId: 1,
  rngState: 0x12345678,
  usedNames: [],
  content: content
};
const first = NpcGenerator.generateOne(request);
const repeated = NpcGenerator.generateOne(request);
assert.deepStrictEqual(first, repeated);
assert(first && first.npc && first.npc.combatEquipment);
assert(Array.isArray(first.npc.combatEquipment.instances));
assert(first.npc.combatEquipment.instances.length > 0);
assert.strictEqual(
  Object.prototype.hasOwnProperty.call(
    first.npc.combatEquipment.equipment,
    'weapon'
  ),
  true
);

const raw = Stage4State.defaults();
raw.rngState = first.rngState;
raw.systems.npcs.records[first.npc.id] = first.npc;
raw.systems.npcs.activeIds = [first.npc.id];
raw.systems.npcs.nextId = 2;
const clean = Stage4State.normalize(raw);
const normalizedNpc = clean.systems.npcs.records[first.npc.id];
assert(normalizedNpc.combatEquipment);
assert.strictEqual(normalizedNpc.combatEquipment.version, 1);
assert(
  normalizedNpc.combatEquipment.instances.every((instance) =>
    instance.instanceId.indexOf('npc-1-') === 0
  )
);
assert(!clean.player.inventory ||
  !clean.player.inventory.equipment ||
  clean.player.inventory.equipment.instances.every((instance) =>
    instance.instanceId.indexOf('npc-1-') !== 0
  ));

const beforePlayer = JSON.stringify(clean.player);
const person = normalizedNpc;
person.realmStage = 4;
const beforeInstances = person.combatEquipment.instances.length;
NpcSimulation.improveEquipment(person, {
  random() { return 0.01; },
  nowSeconds() { return 1234; }
});
assert.strictEqual(JSON.stringify(clean.player), beforePlayer);
assert(person.combatEquipment.instances.length >= beforeInstances);

console.log('equipment NPC self-test passed');
