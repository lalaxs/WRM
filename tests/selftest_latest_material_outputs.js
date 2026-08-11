'use strict';

const assert = require('assert');

const MaterialContent = require('../content/materials.js');
global.MaterialContent = MaterialContent;
global.ItemArtContent = require('../content/item-art.js');

const Items = require('../content/items.js');
const Gathering = require('../content/gathering.js');
const Combat = require('../content/combat.js');
const Stage2State = require('../core/stage2-state.js');

function itemHasRuntimeIcon(itemId) {
  const item = Items.get(itemId);
  return !!(item && item.iconSrc50 && item.iconSrc100);
}

const latestHerbEntryIds = [
  'parityHerb1', 'parityHerb2', 'parityHerb3', 'parityHerb4',
  'parityHerb5', 'parityHerb6', 'parityHerb7', 'parityHerb8'
];

assert.deepStrictEqual(
  Gathering.GATHERING.herb.entries.map((entry) => entry.id),
  latestHerbEntryIds,
  '采药产出表只使用最新药草圃，不混入旧灵芝/灵菇占位'
);
assert.strictEqual(
  Gathering.getEntry('herb', 'lingzhiGrove'),
  null,
  '旧采药点灵芝草丛不再作为正式产出'
);
assert.deepStrictEqual(
  Gathering.getEntry('herb', 'parityHerb1').drops.map((drop) => drop.itemId),
  ['garumHerb', 'garumSeed'],
  '第一阶采药产出嘉露草与嘉露种子'
);

const migratedLegacyHerb = Stage2State.normalize({
  player: {
    mastery: {
      herb: {
        lingzhiGrove: { level: 8, xp: 4 }
      }
    }
  },
  systems: {
    gathering: {
      spots: {
        herb: { id: 'lingzhiGrove', cap: 20, left: 11 }
      }
    }
  },
  current: {
    key: 'gather:collect:herb:lingzhiGrove',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    stalled: false
  }
});
assert.strictEqual(
  Stage2State.normalizeActionKey('gather:collect:herb:lingzhiGrove'),
  'gather:collect:herb:parityHerb1',
  '旧采药行动 key 迁移到第一阶新药草圃'
);
assert.strictEqual(
  migratedLegacyHerb.systems.gathering.spots.herb.entryId,
  'parityHerb1',
  '旧采药点存档迁移到第一阶新药草圃'
);
assert.strictEqual(
  migratedLegacyHerb.player.mastery.herb.parityHerb1.level,
  8,
  '旧采药熟练度迁移到第一阶新药草圃'
);

const tierBattleMaterials = [
  'brokenFang', 'beastBone', 'spiritClaw', 'monsterCore', 'spiritScale',
  'fiendBlood', 'soulShard', 'voidMarrow', 'tribulationAsh'
];

tierBattleMaterials.forEach((itemId, index) => {
  const tier = index + 1;
  ['normal', 'elite', 'boss'].forEach((rank) => {
    const table = Combat.getLootTable(rank + ':' + tier);
    assert(table, '战斗掉落表存在：' + rank + ':' + tier);
    assert.strictEqual(
      table[0].itemId,
      itemId,
      '战斗主掉落按阶产出最新战斗材料：' + rank + ':' + tier
    );
  });
  assert(itemHasRuntimeIcon(itemId), '战斗材料有运行时图标：' + itemId);
});

const miningDropIds = new Set();
Gathering.GATHERING.mining.entries.forEach((entry) => {
  entry.drops.forEach((drop) => miningDropIds.add(drop.itemId));
});
miningDropIds.forEach((itemId) => {
  assert(itemHasRuntimeIcon(itemId), '采矿正式产物有运行时图标：' + itemId);
});

console.log('latest material outputs selftest passed');
