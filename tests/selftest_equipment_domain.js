'use strict';

const assert = require('assert');
const Equipment = require('../core/equipment.js');

const request = {
  baseId: 'qi-weapon',
  quality: 'legendary',
  instanceId: 'eq-1',
  source: { type: 'test', sourceId: 'fixture', acquiredAt: 1 },
  rngState: 123456
};

const first = Equipment.generate(request);
const second = Equipment.generate(request);
assert.deepStrictEqual(first, second);
assert(first.ok);
assert.strictEqual(first.instance.affixes.length, 4);
assert.strictEqual(first.instance.instanceId, 'eq-1');
assert(Object.isFrozen(first.instance));

const resolved = Equipment.resolve(first.instance);
assert(resolved);
assert(resolved.stats.attack > 0);
assert.strictEqual(resolved.slot, 'weapon');
assert.strictEqual(resolved.resonanceId, 'swordIntent');

for (let seed = 1; seed <= 200; seed += 1) {
  const generated = Equipment.generate({
    ...request,
    instanceId: `eq-seed-${seed}`,
    rngState: seed
  });
  assert(generated.ok);
  assert(
    generated.instance.affixes.filter((affix) => affix.kind === 'build')
      .length <= 2
  );
  assert(
    generated.instance.affixes.filter((affix) => affix.kind === 'rare')
      .length <= 1
  );
  assert(generated.instance.affixes.every((affix) => affix.tier <= 2));
}

const locked = Equipment.reforge(first.instance, {
  lockedAffixIndex: 0,
  rngState: first.rngState
});
assert(locked.ok);
assert.deepStrictEqual(locked.instance.affixes[0], first.instance.affixes[0]);
assert.strictEqual(locked.instance.baseId, first.instance.baseId);
assert.strictEqual(locked.instance.quality, first.instance.quality);

const highLevel = Equipment.normalizeInstance({
  ...first.instance,
  enhancementLevel: 12,
  enhancementPity: 0
});
const failed = Equipment.enhance(highLevel, {
  materialAvailable: true,
  protectionBonus: 0,
  rngState: 123456
});
assert(failed.ok);
assert.strictEqual(failed.success, false);
assert.strictEqual(failed.instance.enhancementLevel, 12);
assert.strictEqual(failed.instance.enhancementPity, 1);

const guaranteed = Equipment.enhance(
  Equipment.normalizeInstance({
    ...first.instance,
    enhancementLevel: 12,
    enhancementPity: 8
  }),
  {
    materialAvailable: true,
    protectionBonus: 0,
    rngState: 123456
  }
);
assert(guaranteed.ok);
assert.strictEqual(guaranteed.success, true);
assert.strictEqual(guaranteed.instance.enhancementLevel, 13);
assert.strictEqual(guaranteed.instance.enhancementPity, 0);

const maxed = Equipment.enhance(
  Equipment.normalizeInstance({
    ...first.instance,
    enhancementLevel: 15
  }),
  {
    materialAvailable: true,
    protectionBonus: 1,
    rngState: 1
  }
);
assert.strictEqual(maxed.ok, false);
assert.strictEqual(maxed.code, 'enhancement_max');

const sameResonance = [1, 2, 3, 4].map((ordinal) =>
  Equipment.generate({
    baseId: 'qi-weapon',
    quality: 'common',
    instanceId: `eq-res-${ordinal}`,
    source: request.source,
    rngState: ordinal
  }).instance
);
const aggregate = Equipment.aggregate(sameResonance);
assert.strictEqual(aggregate.resonance.counts.swordIntent, 4);
assert.deepStrictEqual(
  aggregate.resonance.active.swordIntent.map((entry) => entry.threshold),
  [2, 4]
);

const legacy = Equipment.legacyInstance('cloudwoodSword', 2);
assert(legacy);
assert.strictEqual(legacy.instanceId, 'legacy-cloudwoodSword-2');
assert.strictEqual(legacy.baseId, 'qi-weapon');
assert.strictEqual(Equipment.legacyInstance('unknown', 1), null);

console.log('equipment domain self-test passed');
