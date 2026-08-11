'use strict';

const assert = require('assert');
const Equipment = require('../core/equipment.js');
const Stage3State = require('../core/stage3-state.js');
const CombatRewards = require('../core/combat-rewards.js');
const Production = require('../core/production.js');
const RecipeContent = require('../content/recipes.js');
const Inventory = require('../core/inventory.js');
const SkillProgression = require('../core/skill-progression.js');
const GameRandom = require('../core/random.js');
const Stage2State = require('../core/stage2-state.js');
const CombatContent = require('../content/combat.js');

const model = Stage3State.normalize({
  created: true,
  player: {
    inventory: {
      capacity: 40,
      capacityGrants: {},
      stacks: {},
      bindings: {},
      equipment: { version: 1, nextInstanceId: 1, instances: [] }
    }
  },
  systems: {},
  rngState: 12345
});

const granted = CombatRewards.grantEquipment(model, [
  { baseId: 'qi-weapon', quality: 'rare', sourceId: 'slime' }
]);
assert(granted.ok);
assert.strictEqual(
  granted.state.player.inventory.equipment.instances.length,
  1
);
assert.strictEqual(granted.result.equipment.length, 1);
assert.strictEqual(granted.result.warnings.length, 0);
assert(
  Equipment.resolve(
    granted.state.player.inventory.equipment.instances[0]
  ).affixes.length === 2
);

const full = JSON.parse(JSON.stringify(model));
full.player.inventory.capacity = 1;
full.player.inventory.stacks.copperOre = 2;
const seedBefore = full.rngState;
const lost = CombatRewards.grantEquipment(full, [
  { baseId: 'qi-robe', quality: 'epic', sourceId: 'boss' }
]);
assert(lost.ok);
assert.strictEqual(
  lost.state.player.inventory.equipment.instances.length,
  0
);
assert.notStrictEqual(lost.state.rngState, seedBefore);
assert.deepStrictEqual(lost.result.warnings, [
  'equipment_lost_inventory_full'
]);
assert.strictEqual(lost.result.lost.length, 1);

const production = Production.create({
  RecipeContent,
  Inventory,
  SkillProgression,
  GameRandom,
  Equipment
});
const crafter = Stage2State.createDefaults().player;
crafter.skills.forging = { level: 99, xp: 0 };
crafter.mastery.forging.copperSword = { level: 99, xp: 0 };
crafter.inventory.stacks.copperOre = 3;
crafter.inventory.stacks.willowWood = 1;
const forged = production.complete(
  crafter,
  'forging:copperSword',
  0x12345678,
  {}
);
assert(forged.ok);
assert.strictEqual(
  forged.player.inventory.equipment.instances.length,
  1
);
assert.strictEqual(
  forged.player.inventory.equipment.instances[0].baseId,
  'qi-weapon'
);
assert.strictEqual(
  forged.player.inventory.stacks.copperSword || 0,
  0
);
assert.strictEqual(forged.gains.equipment.length, 1);

const combatModel = Stage3State.normalize({
  created: true,
  player: {
    lingshi: 0,
    inventory: {
      capacity: 40,
      capacityGrants: {},
      stacks: {},
      bindings: {},
      equipment: { version: 1, nextInstanceId: 1, instances: [] }
    }
  },
  systems: {},
  rngState: 24680
});
const dungeonId = Object.keys(CombatContent.DUNGEONS)[0];
const firstClear = CombatRewards.rollFirstClearRewards(
  dungeonId,
  combatModel.rngState
);
const settled = CombatRewards.applyOrPend(
  combatModel,
  firstClear,
  1
);
assert(settled.ok);
assert.strictEqual(
  settled.state.player.inventory.equipment.instances.length,
  1
);
const legacyRewardId = Object.keys(firstClear.items).find((itemId) =>
  Equipment.legacyInstance(itemId, 1)
);
assert(legacyRewardId);
assert.strictEqual(
  settled.state.player.inventory.stacks[legacyRewardId] || 0,
  0
);

console.log('equipment acquisition self-test passed');
