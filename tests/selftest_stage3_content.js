'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { isDeepStrictEqual } = require('node:util');

let pass = 0;
let fail = 0;

function ok(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.error('  ✗ FAIL: ' + message);
  }
}

function exact(actual, expected, message) {
  ok(isDeepStrictEqual(actual, expected), message);
}

function frozenTree(value, seen) {
  if (!value || typeof value !== 'object') return true;
  seen = seen || new Set();
  if (seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value)
    && Object.keys(value).every((key) => frozenTree(value[key], seen));
}

function load(modulePath, label) {
  try {
    return require(modulePath);
  } catch (error) {
    ok(false, label + ' loads through CommonJS: ' + error.code);
    return null;
  }
}

const Combat = load('../content/combat.js', 'CombatContent');
const Techniques = load('../content/techniques.js', 'TechniqueContent');
const Realms = load('../content/realms.js', 'RealmContent');
const Items = load('../content/items.js', 'ItemContent');
const MaterialContent = load('../content/materials.js', 'MaterialContent');

if (Combat && Techniques && Realms && Items && MaterialContent) {
  const materialRows = MaterialContent.itemRows();
  const materialEquipmentCount = materialRows.filter((row) =>
    row.category === 'equipment'
  ).length;
  const expectedSeeds = [
    [1, 'qingyunOutskirts', '青云山麓',
      ['thornHare', 'grayWolf', 'wanderingBandit'],
      'breathCave', '聚气洞', 'caveWarden', 'breathSerpent', 0, null],
    [2, 'blackIronRidge', '玄铁岭',
      ['ironClawBeast', 'stonePuppet', 'rogueCultivator'],
      'foundationAltar', '筑基坛', 'altarGuardian', 'earthVeinApe', 8, 'breathCave'],
    [3, 'redSandValley', '赤砂谷',
      ['sandScorpion', 'fireCrow', 'swordRogue'],
      'goldCoreRuins', '金丹遗府', 'ruinElder', 'scarletCoreBeast', 9,
      'foundationAltar'],
    [4, 'mistSoulMarsh', '雾魂泽',
      ['soulMoth', 'ghostVine', 'mireFiend'],
      'nascentSoulTower', '元婴塔', 'towerKeeper', 'infantSoulShade', 10,
      'goldCoreRuins'],
    [5, 'thunderPeak', '雷霆峰',
      ['thunderBird', 'lightningSpirit', 'armoredFiend'],
      'spiritTransformationPeak', '化神天阶', 'thunderJudge', 'heavenlyThunderRoc',
      11, 'nascentSoulTower'],
    [6, 'voidRift', '虚空裂谷',
      ['riftCrawler', 'voidMoth', 'spaceBandit'],
      'voidRefiningRift', '炼虚裂境', 'riftWarden', 'voidDevourer', 12,
      'spiritTransformationPeak'],
    [7, 'starfallAbyss', '星落渊',
      ['starHound', 'meteorGolem', 'abyssCultivator'],
      'bodyIntegrationPalace', '合体古殿', 'palaceMarshal', 'unityTitan', 13,
      'voidRefiningRift'],
    [8, 'mahayanaAbyss', '大乘天渊',
      ['daoWraith', 'lawBeast', 'skyDemon'],
      'mahayanaTrial', '大乘道场', 'daoGateKeeper', 'myriadLawAvatar', 14,
      'bodyIntegrationPalace'],
    [9, 'ascensionTerrace', '飞升台',
      ['cloudGeneral', 'tribulationSpirit', 'immortalShadow'],
      'ascensionTrial', '飞升天关', 'tribulationHerald', 'ninefoldTribulation', 15,
      'mahayanaTrial']
  ];

  ok(Object.keys(Combat.REGIONS).length === 9, 'nine combat regions');
  ok(Object.keys(Combat.ENEMIES).length === 45, 'forty-five enemy definitions');
  ok(Object.keys(Combat.DUNGEONS).length === 9, 'nine dungeons');
  ok(Object.values(Combat.DUNGEONS).every((dungeon) => dungeon.waves.length === 4),
    'every dungeon has four wave groups');
  ok(Combat.ENEMIES.ninefoldTribulation.phases.length === 2,
    'final boss exercises multi-phase support');
  ok(Object.keys(Combat.EQUIPMENT).length === 27, 'twenty-seven equipment items');
  ok(Object.keys(Combat.SUPPLIES).length === 11, 'eleven combat supplies');
  ok(Object.keys(Techniques.TECHNIQUES).length === 77,
    'seventy-seven techniques including one legacy book');
  ok(Techniques.list('active').length === 48, 'forty-eight active techniques');
  ok(Techniques.list('passive').length === 29, 'twenty-nine passive techniques');
  ok(Techniques.VALIDATION_POOL_IDS.length === 32, 'validation pool has thirty-two ids');
  ok(Techniques.ROADMAP_IDS.length === 76, 'roadmap has seventy-six ids');
  ok(Techniques.listValidationPool().length === 32, 'validation pool resolves');
  ok(Techniques.listRoadmap().length === 76, 'roadmap resolves');
  ok(Realms.TRANSITIONS.length === 16, 'sixteen realm transitions');

  exact(Object.keys(Combat.REGIONS), expectedSeeds.map((row) => row[1]),
    'region IDs keep canonical tier order');
  exact(Object.keys(Combat.DUNGEONS), expectedSeeds.map((row) => row[4]),
    'dungeon IDs keep canonical tier order');

  for (const seed of expectedSeeds) {
    const [
      tier, regionId, regionName, normalEnemyIds, dungeonId, dungeonName,
      eliteId, bossId, requiredRealmIndex, requiredDungeonId
    ] = seed;
    const region = Combat.REGIONS[regionId];
    const dungeon = Combat.DUNGEONS[dungeonId];
    exact([
      region.id, region.name, region.tier, region.dangerLevel,
      region.requiredRealmIndex, region.enemyIds, region.formations
    ], [
      regionId, regionName, tier,
      tier <= 2 ? 'safe' : (tier <= 6 ? 'perilous' : 'deathTrial'),
      requiredRealmIndex, normalEnemyIds,
      normalEnemyIds.map((enemyId) => ({ enemyIds: [enemyId] }))
    ],
    'region row is exact: ' + regionId);
    exact([
      dungeon.id, dungeon.name, dungeon.tier, dungeon.dangerLevel, dungeon.regionId,
      dungeon.requiredRealmIndex, dungeon.requiredDungeonId,
      dungeon.waves
    ], [
      dungeonId, dungeonName, tier,
      tier <= 1 ? 'safe' : (tier <= 7 ? 'perilous' : 'deathTrial'),
      regionId, requiredRealmIndex, requiredDungeonId,
      [
        { enemyIds: [normalEnemyIds[0]], enemyId: normalEnemyIds[0], count: 2 },
        { enemyIds: [normalEnemyIds[1]], enemyId: normalEnemyIds[1], count: 2 },
        { enemyIds: [eliteId], enemyId: eliteId, count: 1 },
        { enemyIds: [bossId], enemyId: bossId, count: 1 }
      ]
    ], 'dungeon row and wave sequence are exact: ' + dungeonId);

    for (const enemyId of normalEnemyIds) {
      ok(Combat.ENEMIES[enemyId].rank === 'normal',
        'region enemy is normal rank: ' + enemyId);
    }
    ok(Combat.ENEMIES[eliteId].rank === 'elite',
      'dungeon elite rank is exact: ' + eliteId);
    ok(Combat.ENEMIES[bossId].rank === 'boss',
      'dungeon boss rank is exact: ' + bossId);
  }

  const expectedNormalStats = {
    1: [45, 8, 3, 71, 6, 8, 5],
    5: [527, 59, 20, 83, 14, 6, 25],
    9: [6174, 440, 129, 95, 22, 4, 45]
  };
  for (const [tierText, expected] of Object.entries(expectedNormalStats)) {
    const tier = Number(tierText);
    const enemyId = expectedSeeds[tier - 1][3][0];
    const enemy = Combat.ENEMIES[enemyId];
    exact([
      enemy.stats.hp,
      enemy.stats.attack,
      enemy.stats.defense,
      enemy.stats.accuracy,
      enemy.stats.evasion,
      enemy.stats.attackIntervalTicks,
      enemy.cultivation
    ], expected, 'normal enemy formula is exact at tier ' + tier);
  }

  for (const seed of expectedSeeds) {
    const tier = seed[0];
    const normal = Combat.ENEMIES[seed[3][0]];
    const elite = Combat.ENEMIES[seed[6]];
    const boss = Combat.ENEMIES[seed[7]];
    exact([
      elite.stats.hp,
      elite.stats.attack,
      elite.stats.defense,
      elite.cultivation
    ], [
      Math.round(normal.stats.hp * 2),
      Math.round(normal.stats.attack * 1.35),
      Math.round(normal.stats.defense * 1.4),
      normal.cultivation * 3
    ], 'elite multipliers are exact at tier ' + tier);
    exact([
      boss.stats.hp,
      boss.stats.attack,
      boss.stats.defense,
      boss.cultivation
    ], [
      Math.round(normal.stats.hp * 5),
      Math.round(normal.stats.attack * 1.6),
      Math.round(normal.stats.defense * 1.6),
      normal.cultivation * 8
    ], 'boss multipliers are exact at tier ' + tier);
  }

  exact(Combat.ENEMIES.ninefoldTribulation.phases, [
    { hpMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1 },
    { hpMultiplier: 1.5, attackMultiplier: 1.25, defenseMultiplier: 1.15 }
  ], 'ninefold tribulation phases are exact');
  ok(Object.values(Combat.ENEMIES)
    .filter((enemy) => enemy.id !== 'ninefoldTribulation')
    .every((enemy) => enemy.phases.length === 0),
  'only the final boss has multiple phases');

  const equipmentRows = [
    ['cloudwoodSword', 'cloudRobe', 'breathJade'],
    ['blackIronSword', 'stoneguardArmor', 'foundationSeal'],
    ['scarletCoreBlade', 'sunscaleArmor', 'corePendant'],
    ['soulCallingStaff', 'mistweaveRobe', 'infantSoulPearl'],
    ['thunderSword', 'lightningArmor', 'spiritMirror'],
    ['voidBlade', 'riftRobe', 'voidRing'],
    ['starforgedSpear', 'unityArmor', 'bodySeal'],
    ['abyssSword', 'mahayanaRobe', 'daoPendant'],
    ['ascensionBlade', 'heavenlyRobe', 'immortalJade']
  ];
  exact(Object.keys(Combat.EQUIPMENT), equipmentRows.flat(),
    'equipment IDs keep canonical tier and slot order');
  equipmentRows.forEach((ids, index) => {
    const tier = index + 1;
    exact([Combat.EQUIPMENT[ids[0]].slot, Combat.EQUIPMENT[ids[0]].stats],
      ['weapon', { attack: tier * 6, accuracy: tier * 2 }],
      'weapon formula is exact at tier ' + tier);
    exact([Combat.EQUIPMENT[ids[1]].slot, Combat.EQUIPMENT[ids[1]].stats],
      ['armor', { maxHp: tier * 20, defense: tier * 4 }],
      'armor formula is exact at tier ' + tier);
    exact([Combat.EQUIPMENT[ids[2]].slot, Combat.EQUIPMENT[ids[2]].stats],
      ['accessory', {
        maxQi: tier * 10,
        critChance: tier * 0.01,
        evasion: tier
      }], 'accessory formula is exact at tier ' + tier);
  });

  exact(Combat.SUPPLIES, {
    grilledCarp: { type: 'food', heal: 20 },
    shrimpSoup: { type: 'food', heal: 25 },
    spiritRiceMeal: { type: 'food', heal: 35 },
    troutFeast: { type: 'food', heal: 45 },
    lobsterBanquet: { type: 'food', heal: 60 },
    dragonFishBanquet: { type: 'food', heal: 90 },
    healingPill: { type: 'pill', heal: 50 },
    qiGatheringPill: { type: 'pill', restoreQi: 40 },
    wardTalisman: { type: 'talisman', shieldMaxHpRatio: 0.2 },
    healingTalisman: { type: 'talisman', heal: 35 },
    hasteTalisman: {
      type: 'talisman',
      attackIntervalReduction: 0.1,
      durationTicks: 40
    }
  }, 'combat supply effects are exact');

  const baseMaterials = [
    'brokenFang', 'beastBone', 'spiritClaw', 'monsterCore', 'spiritScale',
    'fiendBlood', 'soulShard', 'voidMarrow', 'tribulationAsh'
  ];
  const extraSupplies = [
    'grilledCarp', 'shrimpSoup', 'spiritRiceMeal', 'troutFeast',
    'healingTalisman', 'wardTalisman', 'lobsterBanquet',
    'dragonFishBanquet', 'hasteTalisman'
  ];
  exact(Combat.TIER_LOOT.map((row) => [
    row.tier, row.baseMaterialId, row.extraSupplyId, row.techniqueIds.length
  ]), [
    [1, 'brokenFang', 'grilledCarp', 7],
    [2, 'beastBone', 'shrimpSoup', 23],
    [3, 'spiritClaw', 'spiritRiceMeal', 28],
    [4, 'monsterCore', 'troutFeast', 17],
    [5, 'spiritScale', 'healingTalisman', 19],
    [6, 'fiendBlood', 'wardTalisman', 77],
    [7, 'soulShard', 'lobsterBanquet', 77],
    [8, 'voidMarrow', 'dragonFishBanquet', 77],
    [9, 'tribulationAsh', 'hasteTalisman', 77]
  ], 'tier loot sources and book pool sizes are exact');

  exact(Combat.LOOT_TABLES['normal:1'].map(function (row) {
    return [
      row.itemId || 'pool',
      row.chance == null ? null : row.chance
    ];
  }), [
    ['brokenFang', null],
    ['grilledCarp', 0.15],
    ['pool', 0.012]
  ], 'region AFK drops materials plus MWI-like zone technique books');
  exact([
    Combat.LOOT_TABLES['elite:1'].find(function (row) {
      return row.itemIds && String(row.itemIds[0]).indexOf('techniqueBook:') === 0;
    }).chance,
    Combat.LOOT_TABLES['boss:1'].find(function (row) {
      return row.itemIds && String(row.itemIds[0]).indexOf('techniqueBook:') === 0;
    }).chance
  ], [0.04, 0.08],
  'elite/boss technique books are denser than region, MWI dungeon-chest style');

  const expectedFirstClearBookIds = Combat.FIRST_CLEAR_TECHNIQUE_IDS.slice();
  expectedSeeds.forEach((seed, index) => {
    const dungeon = Combat.DUNGEONS[seed[4]];
    const expectedItems = {};
    expectedItems[equipmentRows[index][2]] = 1;
    expectedItems['techniqueBook:' + expectedFirstClearBookIds[index]] = 1;
    exact(dungeon.firstClearRewards.items, expectedItems,
      'first-clear rewards are exact for tier ' + (index + 1));
  });

  ok(Techniques.ROADMAP_IDS.every((id) => {
    const technique = Techniques.TECHNIQUES[id];
    const item = Items.ITEMS[technique.bookItemId];
    return !!technique && !!item && item.techniqueId === id;
  }), 'every roadmap technique has a matching book item');
  ok(Techniques.VALIDATION_POOL_IDS.every((id) =>
    Techniques.ROADMAP_IDS.indexOf(id) >= 0
  ), 'validation pool is a subset of the roadmap');
  Object.values(Techniques.TECHNIQUES).forEach((technique) => {
    ok(!!technique.effect && typeof technique.effect === 'object',
      'technique effect exists: ' + technique.id);
    ok(technique.bookItemId === 'techniqueBook:' + technique.id,
      'technique book ID is exact: ' + technique.id);
  });

  const expectedTransitions = [
    ['qi-1', 'qi-2', '练气一层', '练气二层', 100, 1, null,
      ['kill:thornHare:3', 'enemyKills', 'thornHare', 3], 120],
    ['qi-2', 'qi-3', '练气二层', '练气三层', 250, 1, null,
      ['kill:grayWolf:3', 'enemyKills', 'grayWolf', 3], 120],
    ['qi-3', 'qi-4', '练气三层', '练气四层', 450, 1, null,
      ['kill:wanderingBandit:3', 'enemyKills', 'wanderingBandit', 3], 120],
    ['qi-4', 'qi-5', '练气四层', '练气五层', 700, 1, null,
      ['kill:thornHare:10', 'enemyKills', 'thornHare', 10], 120],
    ['qi-5', 'qi-6', '练气五层', '练气六层', 1000, 1, null,
      ['kill:grayWolf:10', 'enemyKills', 'grayWolf', 10], 120],
    ['qi-6', 'qi-7', '练气六层', '练气七层', 1400, 1, null,
      ['kill:wanderingBandit:10', 'enemyKills', 'wanderingBandit', 10], 120],
    ['qi-7', 'qi-8', '练气七层', '练气八层', 1900, 1, null,
      ['clear:breathCave:1', 'dungeonClears', 'breathCave', 1], 120],
    ['qi-8', 'qi-9', '练气八层', '练气九层', 2500, 1, null,
      ['clear:breathCave:3', 'dungeonClears', 'breathCave', 3], 120],
    ['qi-9', 'foundation', '练气九层', '筑基', 3000, 0.6, 'foundationPill',
      ['clear:foundationAltar:1', 'dungeonClears', 'foundationAltar', 1], 300],
    ['foundation', 'gold-core', '筑基', '金丹', 6000, 0.5, 'goldCorePill',
      ['clear:goldCoreRuins:1', 'dungeonClears', 'goldCoreRuins', 1], 800],
    ['gold-core', 'nascent-soul', '金丹', '元婴', 15000, 0.4, 'nascentSoulPill',
      ['clear:nascentSoulTower:1', 'dungeonClears', 'nascentSoulTower', 1], 2000],
    ['nascent-soul', 'spirit-transformation', '元婴', '化神', 40000, 0.3,
      'spiritTransformationPill',
      ['clear:spiritTransformationPeak:1', 'dungeonClears',
        'spiritTransformationPeak', 1], 5000],
    ['spirit-transformation', 'void-refining', '化神', '炼虚', 100000, 0.25,
      'voidRefiningPill',
      ['clear:voidRefiningRift:1', 'dungeonClears', 'voidRefiningRift', 1], 12000],
    ['void-refining', 'body-integration', '炼虚', '合体', 250000, 0.2,
      'bodyIntegrationPill',
      ['clear:bodyIntegrationPalace:1', 'dungeonClears',
        'bodyIntegrationPalace', 1], 30000],
    ['body-integration', 'mahayana', '合体', '大乘', 600000, 0.15,
      'mahayanaPill',
      ['clear:mahayanaTrial:1', 'dungeonClears', 'mahayanaTrial', 1], 80000],
    ['mahayana', 'ascension', '大乘', '飞升', 1500000, 0.1, null,
      ['clear:ascensionTrial:1', 'dungeonClears', 'ascensionTrial', 1], null]
  ];
  exact(Realms.TRANSITIONS.map((transition) => [
    transition.currentRealmId,
    transition.nextRealmId,
    transition.name,
    transition.nextName,
    transition.cultivationNeed,
    transition.baseChance,
    transition.pillItemId,
    [
      transition.gate.id,
      transition.gate.type,
      transition.gate.targetId,
      transition.gate.count
    ],
    transition.nextLifespan
  ]), expectedTransitions, 'realm transitions match the complete permanent-gate table');

  for (const region of Object.values(Combat.REGIONS)) {
    for (const enemyId of region.enemyIds) {
      ok(!!Combat.ENEMIES[enemyId], 'region enemy exists: ' + enemyId);
    }
  }
  for (const enemy of Object.values(Combat.ENEMIES)) {
    ok(!!Combat.LOOT_TABLES[enemy.lootTableId],
      'enemy loot table exists: ' + enemy.lootTableId);
  }
  for (const dungeon of Object.values(Combat.DUNGEONS)) {
    for (const wave of dungeon.waves) {
      ok(!!Combat.ENEMIES[wave.enemyId], 'dungeon enemy exists: ' + wave.enemyId);
    }
    for (const itemId of Object.keys(dungeon.firstClearRewards.items)) {
      ok(!!Items.ITEMS[itemId], 'first-clear item exists: ' + itemId);
    }
    ok(!!Combat.LOOT_TABLES[dungeon.repeatLootTableId],
      'repeat loot table exists: ' + dungeon.repeatLootTableId);
  }
  for (const row of Combat.TIER_LOOT) {
    ok(!!Items.ITEMS[row.baseMaterialId],
      'tier base material exists: ' + row.baseMaterialId);
    ok(!!Items.ITEMS[row.extraSupplyId],
      'tier supply exists: ' + row.extraSupplyId);
    row.techniqueIds.forEach((techniqueId) => {
      ok(!!Techniques.TECHNIQUES[techniqueId],
        'tier book-pool technique exists: ' + techniqueId);
    });
  }
  for (const supplyId of Object.keys(Combat.SUPPLIES)) {
    ok(!!Items.ITEMS[supplyId], 'combat supply item exists: ' + supplyId);
  }
  for (const equipment of Object.values(Combat.EQUIPMENT)) {
    const item = Items.ITEMS[equipment.id];
    ok(!!item, 'equipment item exists: ' + equipment.id);
    ok(item.category === 'equipment', 'equipment item category is exact: ' + equipment.id);
    ok(item.equipmentSlot === equipment.slot,
      'equipment item slot agrees with combat registry: ' + equipment.id);
  }
  for (const technique of Object.values(Techniques.TECHNIQUES)) {
    const item = Items.ITEMS[technique.bookItemId];
    ok(!!item, 'technique book exists: ' + technique.id);
    ok(item.category === 'technique' && item.techniqueId === technique.id,
      'technique book points back to technique: ' + technique.id);
  }
  for (const transition of Realms.TRANSITIONS) {
    if (transition.pillItemId) {
      ok(!!Items.ITEMS[transition.pillItemId],
        'breakthrough pill exists: ' + transition.pillItemId);
    }
    if (transition.gate.type === 'enemyKills') {
      ok(!!Combat.ENEMIES[transition.gate.targetId],
        'enemy gate target exists: ' + transition.gate.id);
    } else {
      ok(!!Combat.DUNGEONS[transition.gate.targetId],
        'dungeon gate target exists: ' + transition.gate.id);
    }
  }

  ok(Items.list('equipment').length === 37 + materialEquipmentCount,
    'Stage 2 ten equipment, Stage 3 twenty-seven equipment, and material jewelry are registered');
  ok(Items.list('technique').length === 77,
    'seventy-seven technique-book items are registered');
  const materialIds = new Set(materialRows.map((row) => row.id));
  const promotedBaseMaterialIds = [
    'copperOre', 'tinOre', 'ironOre', 'silverOre', 'goldOre', 'mithrilOre',
    'adamantOre', 'jadeShard', 'darkIronOre', 'crystalOre', 'topaz',
    'sapphire', 'ruby', 'emerald', 'diamond', 'darkCrystal', 'lingshi'
  ];
  ok(
    promotedBaseMaterialIds.every((itemId) => {
      const item = Items.get(itemId);
      return materialIds.has(itemId) &&
        item &&
        typeof item.materialType === 'string' &&
        item.iconSrc50 &&
        item.iconSrc100;
    }),
    'base mining and gem drops are promoted into material rows with runtime art'
  );
  const nonMaterialItemCount = Object.keys(Items.ITEMS)
    .filter((itemId) => !materialIds.has(itemId))
    .length;
  ok(nonMaterialItemCount > 0,
    'legacy, combat, and technique item registry remains outside material catalog');
  ok(Object.keys(Items.ITEMS).length === nonMaterialItemCount + materialRows.length,
    'all unique material rows are registered without double-counting promoted base ids');
  for (const item of Object.values(Items.ITEMS)) {
    ok(Number.isInteger(item.sellValue) && item.sellValue > 0,
      'every item keeps a positive integer sale value: ' + item.id);
  }

  ok(Combat.getRegion('qingyunOutskirts') === Combat.REGIONS.qingyunOutskirts,
    'region lookup returns canonical record');
  ok(Combat.getEnemy('thornHare') === Combat.ENEMIES.thornHare,
    'enemy lookup returns canonical record');
  ok(Combat.getDungeon('breathCave') === Combat.DUNGEONS.breathCave,
    'dungeon lookup returns canonical record');
  ok(Combat.getEquipment('cloudwoodSword') === Combat.EQUIPMENT.cloudwoodSword,
    'equipment lookup returns canonical record');
  ok(Combat.getSupply('grilledCarp') === Combat.SUPPLIES.grilledCarp,
    'supply lookup returns canonical record');
  ok(Combat.getLootTable('normal:1') === Combat.LOOT_TABLES['normal:1'],
    'loot-table lookup returns canonical record');

  {
    const source = { type: 'enemy', id: 'thornHare' };
    const reordered = {};
    reordered.grilledCarp = 1;
    reordered.brokenFang = 1;
    exact(Combat.validateRewardPayload(source, reordered, 0), {
      source: source,
      items: { brokenFang: 1, grilledCarp: 1 },
      currency: 0
    }, 'reward validation is tuple-order independent');

    const separatorCollision = Object.create(null);
    separatorCollision['brokenFang:1|grilledCarp'] = 1;
    ok(
      Combat.validateRewardPayload(
        source,
        separatorCollision,
        0
      ) === null,
      'separator-bearing item IDs cannot collide with valid reward tuples'
    );

    ['__proto__', 'constructor'].forEach(function (hostileId) {
      const hostileItems = Object.create(null);
      hostileItems[hostileId] = 1;
      ok(
        Combat.validateRewardPayload(source, hostileItems, 0) === null,
        'prototype-sensitive item ID fails authoritative membership: ' +
          hostileId
      );
    });

    let transparentValueReads = 0;
    const proxiedItems = new Proxy(
      { brokenFang: 1, grilledCarp: 1 },
      {
        get() {
          transparentValueReads++;
          throw new Error('reward proxy values must not be read');
        }
      }
    );
    exact(Combat.validateRewardPayload(source, proxiedItems, 0), {
      source: source,
      items: { brokenFang: 1, grilledCarp: 1 },
      currency: 0
    }, 'transparent proxy is captured once as an equivalent canonical tuple');
    ok(transparentValueReads === 0,
      'transparent proxy values are never read through property access');

    const duplicateKeys = new Proxy({ brokenFang: 1 }, {
      ownKeys() {
        return ['brokenFang', 'brokenFang'];
      }
    });
    ok(Combat.validateRewardPayload(source, duplicateKeys, 0) === null,
      'duplicate proxy keys fail closed');

    const revoked = Proxy.revocable({ brokenFang: 1 }, {});
    revoked.revoke();
    ok(Combat.validateRewardPayload(source, revoked.proxy, 0) === null,
      'revoked reward proxy fails closed');

    let descriptorReads = 0;
    const statefulProxy = new Proxy(
      { brokenFang: 1, grilledCarp: 1 },
      {
        getOwnPropertyDescriptor(target, key) {
          descriptorReads++;
          if (descriptorReads > 1) {
            throw new Error('descriptor state changed during capture');
          }
          return Object.getOwnPropertyDescriptor(target, key);
        }
      }
    );
    ok(Combat.validateRewardPayload(source, statefulProxy, 0) === null,
      'stateful descriptor proxy fails closed during canonical capture');

    let accessorRuns = 0;
    const accessorItems = {};
    Object.defineProperty(accessorItems, 'brokenFang', {
      enumerable: true,
      get() {
        accessorRuns++;
        return 1;
      }
    });
    ok(
      Combat.validateRewardPayload(source, accessorItems, 0) === null &&
        accessorRuns === 0,
      'reward item accessors fail closed without invocation'
    );

    [
      [{ type: 'enemy', id: 'breathCave' }, { brokenFang: 1 }, 0],
      [
        { type: 'dungeon-first-clear', id: 'thornHare' },
        { brokenFang: 1 },
        0
      ],
      [source, { brokenFang: 0 }, 0],
      [source, { brokenFang: 3 }, 0],
      [source, { brokenFang: 1, grilledCarp: 2 }, 0],
      [source, { brokenFang: Number.MAX_SAFE_INTEGER }, 0],
      [source, { brokenFang: 1 }, -1],
      [source, { brokenFang: 1 }, Number.MAX_SAFE_INTEGER]
    ].forEach(function (fixture, index) {
      ok(
        Combat.validateRewardPayload(
          fixture[0],
          fixture[1],
          fixture[2]
        ) === null,
        'reward source/quantity/currency boundary fails closed #' + index
      );
    });
  }

  ok(Techniques.get('cloudPiercingSword') ===
    Techniques.TECHNIQUES.cloudPiercingSword,
  'technique lookup returns canonical record');
  ok(Techniques.getByBookItemId('techniqueBook:cloudPiercingSword') ===
    Techniques.TECHNIQUES.cloudPiercingSword,
  'technique book lookup returns canonical record');
  ok(Realms.getTransition('qi-1') === Realms.TRANSITIONS[0],
    'realm transition lookup returns canonical record');
  ok(Combat.getRegion('missing') === null
    && Combat.getEnemy('missing') === null
    && Combat.getDungeon('missing') === null
    && Combat.getEquipment('missing') === null
    && Combat.getSupply('missing') === null
    && Combat.getLootTable('missing') === null
    && Techniques.get('missing') === null
    && Techniques.getByBookItemId('missing') === null
    && Realms.getTransition('missing') === null,
  'content lookups reject unknown IDs consistently');

  for (const moduleApi of [Combat, Techniques, Realms, Items]) {
    ok(Object.isFrozen(moduleApi), 'CommonJS module API is frozen');
    ok(frozenTree(moduleApi), 'CommonJS module data is deeply frozen');
  }
  ok(Object.isFrozen(Techniques.list())
    && Object.isFrozen(Techniques.list('active'))
    && Object.isFrozen(Techniques.list('passive')),
  'technique list results are frozen arrays');

  const browserModules = [
    ['content/combat.js', 'CombatContent'],
    ['content/techniques.js', 'TechniqueContent'],
    ['content/realms.js', 'RealmContent'],
    ['content/items.js', 'ItemContent']
  ];
  for (const [file, globalName] of browserModules) {
    const context = {};
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    vm.runInNewContext(source, context, { filename: file });
    ok(!!context[globalName], file + ' exposes browser global ' + globalName);
    ok(Object.isFrozen(context[globalName]),
      file + ' browser global API is frozen');
    ok(frozenTree(context[globalName]),
      file + ' browser global data is deeply frozen');
    ok(!/Math\.random|localStorage|Platform\.|SaveSystem|document\.|canvas|toast\(/.test(source),
      file + ' remains a pure content module');
  }
}

console.log('\n=== Stage 3 内容自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
