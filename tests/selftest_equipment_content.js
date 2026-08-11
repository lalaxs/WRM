'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const EquipmentContent = require('../content/equipment.js');

assert.deepStrictEqual(EquipmentContent.SLOTS, [
  'weapon',
  'head',
  'robe',
  'bracer',
  'belt',
  'boots',
  'accessory',
  'artifact'
]);

assert.strictEqual(Object.keys(EquipmentContent.RESONANCES).length, 8);
assert.strictEqual(EquipmentContent.QUALITIES.common.affixCount, 0);
assert.strictEqual(EquipmentContent.QUALITIES.legendary.affixCount, 4);

for (const slot of EquipmentContent.SLOTS) {
  const meta = EquipmentContent.SLOT_META[slot];
  assert(meta, `missing slot metadata for ${slot}`);
  assert(Number.isInteger(meta.unlockRealmOrder));

  const bases = Object.values(EquipmentContent.BASES).filter(
    (base) => base.slot === slot
  );
  assert(bases.length >= 9, `missing realm bases for ${slot}`);
  assert(bases.every((base) => base.iconSrc50 && base.iconSrc100));

  for (const size of [50, 100]) {
    const icon = path.join(
      __dirname,
      '..',
      'assets',
      'item-icons',
      String(size),
      `equipment-${slot}.svg`
    );
    assert(fs.existsSync(icon), `missing ${size}px icon for ${slot}`);
  }
}

const numericAffixStats = new Set(
  Object.values(EquipmentContent.AFFIXES)
    .filter((affix) => affix.kind === 'numeric')
    .map((affix) => affix.stat)
);
for (const stat of EquipmentContent.COMBAT_STAT_KEYS) {
  assert(numericAffixStats.has(stat), `missing numeric affix for ${stat}`);
}

for (const affix of Object.values(EquipmentContent.AFFIXES)) {
  assert(affix.tiers && Object.keys(affix.tiers).length === 6);
  assert(
    EquipmentContent.SLOTS.every(
      (slot) => Number(affix.slotWeights[slot]) > 0
    ),
    `${affix.id} must remain possible in every slot`
  );
}

assert(
  Object.values(EquipmentContent.AFFIXES).some(
    (affix) => affix.kind === 'build'
  ),
  'build affixes are required'
);
assert(
  Object.values(EquipmentContent.AFFIXES).some(
    (affix) => affix.kind === 'rare'
  ),
  'rare affixes are required'
);
assert(Object.isFrozen(EquipmentContent.BASES));
assert(Object.isFrozen(EquipmentContent.AFFIXES));

console.log('equipment content self-test passed');
