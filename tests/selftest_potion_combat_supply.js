'use strict';

const assert = require('assert');

const CombatContent = require('../content/combat.js');

[
  'combatGuardPill',
  'spiritShieldPill',
  'battleFuryPill',
  'voidPiercingPill',
  'tribulationGuardPill',
  'runeSaverPill'
].forEach((itemId) => {
  assert.strictEqual(
    CombatContent.getSupply(itemId),
    null,
    'removed prototype combat pill is not exposed as supply: ' + itemId
  );
});

assert.deepStrictEqual(
  CombatContent.getSupply('healingPill'),
  { type: 'pill', heal: 50 },
  'legacy healing pill remains available for existing combat/injury flows'
);
assert.deepStrictEqual(
  CombatContent.getSupply('qiGatheringPill'),
  { type: 'pill', restoreQi: 40 },
  'legacy qi pill remains available for existing combat flows'
);

console.log('potion combat supply cleanup selftest passed');
