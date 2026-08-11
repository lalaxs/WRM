(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.CombatContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return value;
  }

  const SEEDS = [
    {
      tier: 1,
      region: { id: 'qingyunOutskirts', name: '青云山麓' },
      normalEnemyIds: ['thornHare', 'grayWolf', 'wanderingBandit'],
      dungeon: { id: 'breathCave', name: '聚气洞' },
      eliteId: 'caveWarden',
      bossId: 'breathSerpent',
      requiredRealmIndex: 0,
      requiredDungeonId: null
    },
    {
      tier: 2,
      region: { id: 'blackIronRidge', name: '玄铁岭' },
      normalEnemyIds: ['ironClawBeast', 'stonePuppet', 'rogueCultivator'],
      dungeon: { id: 'foundationAltar', name: '筑基坛' },
      eliteId: 'altarGuardian',
      bossId: 'earthVeinApe',
      requiredRealmIndex: 8,
      requiredDungeonId: 'breathCave'
    },
    {
      tier: 3,
      region: { id: 'redSandValley', name: '赤砂谷' },
      normalEnemyIds: ['sandScorpion', 'fireCrow', 'swordRogue'],
      dungeon: { id: 'goldCoreRuins', name: '金丹遗府' },
      eliteId: 'ruinElder',
      bossId: 'scarletCoreBeast',
      requiredRealmIndex: 9,
      requiredDungeonId: 'foundationAltar'
    },
    {
      tier: 4,
      region: { id: 'mistSoulMarsh', name: '雾魂泽' },
      normalEnemyIds: ['soulMoth', 'ghostVine', 'mireFiend'],
      dungeon: { id: 'nascentSoulTower', name: '元婴塔' },
      eliteId: 'towerKeeper',
      bossId: 'infantSoulShade',
      requiredRealmIndex: 10,
      requiredDungeonId: 'goldCoreRuins'
    },
    {
      tier: 5,
      region: { id: 'thunderPeak', name: '雷霆峰' },
      normalEnemyIds: ['thunderBird', 'lightningSpirit', 'armoredFiend'],
      dungeon: { id: 'spiritTransformationPeak', name: '化神天阶' },
      eliteId: 'thunderJudge',
      bossId: 'heavenlyThunderRoc',
      requiredRealmIndex: 11,
      requiredDungeonId: 'nascentSoulTower'
    },
    {
      tier: 6,
      region: { id: 'voidRift', name: '虚空裂谷' },
      normalEnemyIds: ['riftCrawler', 'voidMoth', 'spaceBandit'],
      dungeon: { id: 'voidRefiningRift', name: '炼虚裂境' },
      eliteId: 'riftWarden',
      bossId: 'voidDevourer',
      requiredRealmIndex: 12,
      requiredDungeonId: 'spiritTransformationPeak'
    },
    {
      tier: 7,
      region: { id: 'starfallAbyss', name: '星落渊' },
      normalEnemyIds: ['starHound', 'meteorGolem', 'abyssCultivator'],
      dungeon: { id: 'bodyIntegrationPalace', name: '合体古殿' },
      eliteId: 'palaceMarshal',
      bossId: 'unityTitan',
      requiredRealmIndex: 13,
      requiredDungeonId: 'voidRefiningRift'
    },
    {
      tier: 8,
      region: { id: 'mahayanaAbyss', name: '大乘天渊' },
      normalEnemyIds: ['daoWraith', 'lawBeast', 'skyDemon'],
      dungeon: { id: 'mahayanaTrial', name: '大乘道场' },
      eliteId: 'daoGateKeeper',
      bossId: 'myriadLawAvatar',
      requiredRealmIndex: 14,
      requiredDungeonId: 'bodyIntegrationPalace'
    },
    {
      tier: 9,
      region: { id: 'ascensionTerrace', name: '飞升台' },
      normalEnemyIds: ['cloudGeneral', 'tribulationSpirit', 'immortalShadow'],
      dungeon: { id: 'ascensionTrial', name: '飞升天关' },
      eliteId: 'tribulationHerald',
      bossId: 'ninefoldTribulation',
      requiredRealmIndex: 15,
      requiredDungeonId: 'mahayanaTrial'
    }
  ];

  const ENEMY_NAMES = {
    thornHare: '棘刺兔',
    grayWolf: '灰狼',
    wanderingBandit: '流寇',
    caveWarden: '洞府守卫',
    breathSerpent: '聚气灵蛇',
    ironClawBeast: '铁爪兽',
    stonePuppet: '岩石傀儡',
    rogueCultivator: '邪修',
    altarGuardian: '祭坛守将',
    earthVeinApe: '地脉猿王',
    sandScorpion: '赤砂蝎',
    fireCrow: '炎鸦',
    swordRogue: '亡命剑修',
    ruinElder: '遗府长老',
    scarletCoreBeast: '赤丹妖兽',
    soulMoth: '噬魂蛾',
    ghostVine: '幽魂藤',
    mireFiend: '泥泽魔',
    towerKeeper: '元婴塔主',
    infantSoulShade: '婴魂幻影',
    thunderBird: '雷鸟',
    lightningSpirit: '闪电灵',
    armoredFiend: '披甲魔',
    thunderJudge: '雷罚使',
    heavenlyThunderRoc: '天雷鹏',
    riftCrawler: '裂隙爬兽',
    voidMoth: '虚空蛾',
    spaceBandit: '破界盗修',
    riftWarden: '裂境守望者',
    voidDevourer: '虚空吞噬者',
    starHound: '星辉猎犬',
    meteorGolem: '陨星傀儡',
    abyssCultivator: '深渊修士',
    palaceMarshal: '古殿战将',
    unityTitan: '归一巨灵',
    daoWraith: '道痕怨灵',
    lawBeast: '法则异兽',
    skyDemon: '天魔',
    daoGateKeeper: '道门守关者',
    myriadLawAvatar: '万法化身',
    cloudGeneral: '云中仙将',
    tribulationSpirit: '劫雷之灵',
    immortalShadow: '真仙残影',
    tribulationHerald: '天劫使者',
    ninefoldTribulation: '九重天劫'
  };

  const EQUIPMENT_ROWS = [
    [
      ['cloudwoodSword', '云木剑'],
      ['cloudRobe', '流云袍'],
      ['breathJade', '聚气玉']
    ],
    [
      ['blackIronSword', '玄铁灵剑'],
      ['stoneguardArmor', '镇石甲'],
      ['foundationSeal', '筑基印']
    ],
    [
      ['scarletCoreBlade', '赤丹刃'],
      ['sunscaleArmor', '日鳞甲'],
      ['corePendant', '金丹坠']
    ],
    [
      ['soulCallingStaff', '唤魂杖'],
      ['mistweaveRobe', '雾织袍'],
      ['infantSoulPearl', '元婴珠']
    ],
    [
      ['thunderSword', '雷霆剑'],
      ['lightningArmor', '闪雷甲'],
      ['spiritMirror', '化神镜']
    ],
    [
      ['voidBlade', '虚空刃'],
      ['riftRobe', '裂隙袍'],
      ['voidRing', '虚空戒']
    ],
    [
      ['starforgedSpear', '星铸枪'],
      ['unityArmor', '归一甲'],
      ['bodySeal', '合体印']
    ],
    [
      ['abyssSword', '天渊剑'],
      ['mahayanaRobe', '大乘法袍'],
      ['daoPendant', '万法坠']
    ],
    [
      ['ascensionBlade', '飞升刃'],
      ['heavenlyRobe', '天劫仙衣'],
      ['immortalJade', '登仙玉']
    ]
  ];

  const equipment = {};
  EQUIPMENT_ROWS.forEach(function (row, index) {
    const tier = index + 1;
    equipment[row[0][0]] = {
      id: row[0][0],
      name: row[0][1],
      tier: tier,
      slot: 'weapon',
      stats: { attack: tier * 6, accuracy: tier * 2 }
    };
    equipment[row[1][0]] = {
      id: row[1][0],
      name: row[1][1],
      tier: tier,
      slot: 'armor',
      stats: { maxHp: tier * 20, defense: tier * 4 }
    };
    equipment[row[2][0]] = {
      id: row[2][0],
      name: row[2][1],
      tier: tier,
      slot: 'accessory',
      stats: {
        maxQi: tier * 10,
        critChance: tier * 0.01,
        evasion: tier
      }
    };
  });
  const EQUIPMENT = deepFreeze(equipment);

  const SUPPLIES = deepFreeze({
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
  });

  const ALL_TECHNIQUE_IDS = [
    'cloudPiercingSword', 'returningWindSlash', 'stoneBreakingFist',
    'spiritNeedle', 'clearHeartArt', 'gatheringBreath', 'thunderSeal',
    'bindingTalisman', 'beastEcho', 'starfallArray',
    'steadyBreath', 'ironBody', 'swiftShadow', 'swordHeart',
    'pillGuard', 'spiritCompanion'
  ];

  const TIER_LOOT = deepFreeze([
    {
      tier: 1,
      baseMaterialId: 'brokenFang',
      extraSupplyId: 'grilledCarp',
      techniqueIds: [
        'cloudPiercingSword', 'returningWindSlash', 'gatheringBreath', 'steadyBreath'
      ]
    },
    {
      tier: 2,
      baseMaterialId: 'beastBone',
      extraSupplyId: 'shrimpSoup',
      techniqueIds: [
        'stoneBreakingFist', 'spiritNeedle', 'clearHeartArt', 'ironBody'
      ]
    },
    {
      tier: 3,
      baseMaterialId: 'spiritClaw',
      extraSupplyId: 'spiritRiceMeal',
      techniqueIds: ['thunderSeal', 'bindingTalisman', 'swiftShadow']
    },
    {
      tier: 4,
      baseMaterialId: 'monsterCore',
      extraSupplyId: 'troutFeast',
      techniqueIds: ['beastEcho', 'swordHeart']
    },
    {
      tier: 5,
      baseMaterialId: 'spiritScale',
      extraSupplyId: 'healingTalisman',
      techniqueIds: ['starfallArray', 'pillGuard']
    },
    {
      tier: 6,
      baseMaterialId: 'fiendBlood',
      extraSupplyId: 'wardTalisman',
      techniqueIds: ['spiritCompanion']
    },
    {
      tier: 7,
      baseMaterialId: 'soulShard',
      extraSupplyId: 'lobsterBanquet',
      techniqueIds: ['starfallArray', 'spiritCompanion']
    },
    {
      tier: 8,
      baseMaterialId: 'voidMarrow',
      extraSupplyId: 'dragonFishBanquet',
      techniqueIds: ['starfallArray', 'swordHeart', 'pillGuard']
    },
    {
      tier: 9,
      baseMaterialId: 'tribulationAsh',
      extraSupplyId: 'hasteTalisman',
      techniqueIds: ALL_TECHNIQUE_IDS
    }
  ]);

  function itemPool(itemIds) {
    return itemIds.slice();
  }

  function bookPool(techniqueIds) {
    return techniqueIds.map(function (techniqueId) {
      return 'techniqueBook:' + techniqueId;
    });
  }

  const lootTables = {};
  TIER_LOOT.forEach(function (row) {
    const tierEquipment = EQUIPMENT_ROWS[row.tier - 1].map(function (entry) {
      return entry[0];
    });
    lootTables['normal:' + row.tier] = [
      {
        itemId: row.baseMaterialId,
        min: 1,
        max: 2,
        chance: null
      },
      {
        itemId: row.extraSupplyId,
        min: 1,
        max: 1,
        chance: 0.15
      }
    ];
    lootTables['elite:' + row.tier] = [
      {
        itemId: row.baseMaterialId,
        min: 2,
        max: 4,
        chance: null
      },
      {
        itemIds: itemPool(tierEquipment.slice(0, 2)),
        min: 1,
        max: 1,
        chance: 0.2
      },
      {
        itemIds: bookPool(row.techniqueIds),
        min: 1,
        max: 1,
        chance: 0.1
      }
    ];
    lootTables['boss:' + row.tier] = [
      {
        itemId: row.baseMaterialId,
        min: 5,
        max: 5,
        chance: null
      },
      {
        itemIds: itemPool(tierEquipment),
        min: 1,
        max: 1,
        chance: 0.35
      },
      {
        itemIds: bookPool(row.techniqueIds),
        min: 1,
        max: 1,
        chance: 0.2
      }
    ];
  });
  const LOOT_TABLES = deepFreeze(lootTables);

  const ATTACK_INTERVAL_TICKS = [8, 8, 7, 7, 6, 6, 5, 5, 4];

  function normalStats(tier) {
    return {
      hp: Math.round(45 * Math.pow(1.85, tier - 1)),
      attack: Math.round(8 * Math.pow(1.65, tier - 1)),
      defense: Math.round(3 * Math.pow(1.6, tier - 1)),
      accuracy: 68 + tier * 3,
      evasion: 4 + tier * 2,
      attackIntervalTicks: ATTACK_INTERVAL_TICKS[tier - 1],
      critChance: 0.05
    };
  }

  function scaledStats(base, hpMultiplier, attackMultiplier, defenseMultiplier) {
    return {
      hp: Math.round(base.hp * hpMultiplier),
      attack: Math.round(base.attack * attackMultiplier),
      defense: Math.round(base.defense * defenseMultiplier),
      accuracy: base.accuracy,
      evasion: base.evasion,
      attackIntervalTicks: base.attackIntervalTicks,
      critChance: base.critChance
    };
  }

  function enemy(id, tier, rank, stats, cultivation, phases) {
    return {
      id: id,
      name: ENEMY_NAMES[id],
      tier: tier,
      rank: rank,
      stats: stats,
      cultivation: cultivation,
      phases: phases || [],
      lootTableId: rank + ':' + tier
    };
  }

  const enemies = {};
  SEEDS.forEach(function (seed) {
    const baseStats = normalStats(seed.tier);
    const baseCultivation = seed.tier * 5;
    seed.normalEnemyIds.forEach(function (enemyId) {
      enemies[enemyId] = enemy(
        enemyId,
        seed.tier,
        'normal',
        Object.assign({}, baseStats),
        baseCultivation,
        []
      );
    });
    enemies[seed.eliteId] = enemy(
      seed.eliteId,
      seed.tier,
      'elite',
      scaledStats(baseStats, 2, 1.35, 1.4),
      baseCultivation * 3,
      []
    );
    enemies[seed.bossId] = enemy(
      seed.bossId,
      seed.tier,
      'boss',
      scaledStats(baseStats, 5, 1.6, 1.6),
      baseCultivation * 8,
      seed.bossId === 'ninefoldTribulation'
        ? [
          { hpMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1 },
          { hpMultiplier: 1.5, attackMultiplier: 1.25, defenseMultiplier: 1.15 }
        ]
        : []
    );
  });
  const ENEMIES = deepFreeze(enemies);

  const regions = {};
  const dungeons = {};
  SEEDS.forEach(function (seed) {
    regions[seed.region.id] = {
      id: seed.region.id,
      name: seed.region.name,
      tier: seed.tier,
      dangerLevel: seed.tier <= 2 ? 'safe' : (seed.tier <= 6 ? 'perilous' : 'deathTrial'),
      requiredRealmIndex: seed.requiredRealmIndex,
      enemyIds: seed.normalEnemyIds.slice(),
      formations: seed.normalEnemyIds.map(function (enemyId) {
        return { enemyIds: [enemyId] };
      })
    };

    const tierLoot = TIER_LOOT[seed.tier - 1];
    const bookIndex = Math.min(seed.tier, tierLoot.techniqueIds.length) - 1;
    const firstClearItems = {};
    firstClearItems[EQUIPMENT_ROWS[seed.tier - 1][2][0]] = 1;
    firstClearItems['techniqueBook:' + tierLoot.techniqueIds[bookIndex]] = 1;
    dungeons[seed.dungeon.id] = {
      id: seed.dungeon.id,
      name: seed.dungeon.name,
      tier: seed.tier,
      dangerLevel: seed.tier <= 1 ? 'safe' : (seed.tier <= 7 ? 'perilous' : 'deathTrial'),
      regionId: seed.region.id,
      requiredRealmIndex: seed.requiredRealmIndex,
      requiredDungeonId: seed.requiredDungeonId,
      waves: [
        { enemyIds: [seed.normalEnemyIds[0]], enemyId: seed.normalEnemyIds[0], count: 2 },
        { enemyIds: [seed.normalEnemyIds[1]], enemyId: seed.normalEnemyIds[1], count: 2 },
        { enemyIds: [seed.eliteId], enemyId: seed.eliteId, count: 1 },
        { enemyIds: [seed.bossId], enemyId: seed.bossId, count: 1 }
      ],
      firstClearRewards: { items: firstClearItems },
      repeatLootTableId: 'boss:' + seed.tier
    };
  });
  const REGIONS = deepFreeze(regions);
  const DUNGEONS = deepFreeze(dungeons);

  function plainDataRecord(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      if (prototype === null) return true;
      const parent = Object.getPrototypeOf(prototype);
      const descriptor = Object.getOwnPropertyDescriptor(
        prototype,
        'constructor'
      );
      return !!descriptor &&
        Object.prototype.hasOwnProperty.call(descriptor, 'value') &&
        typeof descriptor.value === 'function' &&
        descriptor.value.name === 'Object' &&
        parent === null;
    } catch (error) {
      return false;
    }
  }

  function dataEntries(value) {
    if (!plainDataRecord(value)) return null;
    let keys;
    try {
      keys = Reflect.ownKeys(value);
    } catch (error) {
      return null;
    }
    const result = [];
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      let descriptor;
      try {
        descriptor = typeof key === 'string'
          ? Object.getOwnPropertyDescriptor(value, key)
          : null;
      } catch (error) {
        return null;
      }
      if (!descriptor ||
          descriptor.enumerable !== true ||
          !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        return null;
      }
      result.push({ key: key, value: descriptor.value });
    }
    return result;
  }

  function exactDataRecord(value, expectedKeys) {
    const entries = dataEntries(value);
    if (!entries || entries.length !== expectedKeys.length) return null;
    const result = {};
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      if (expectedKeys.indexOf(entry.key) < 0 ||
          Object.prototype.hasOwnProperty.call(result, entry.key)) {
        return null;
      }
      result[entry.key] = entry.value;
    }
    return expectedKeys.every(function (key) {
      return Object.prototype.hasOwnProperty.call(result, key);
    }) ? result : null;
  }

  function addRewardQuantity(target, itemId, quantity) {
    const current = Object.prototype.hasOwnProperty.call(target, itemId)
      ? target[itemId]
      : 0;
    const next = current + quantity;
    if (!Number.isSafeInteger(next) || next <= 0) return false;
    target[itemId] = next;
    return true;
  }

  function combineRewardItems(left, right) {
    const result = {};
    [left, right].forEach(function (source) {
      Object.keys(source).forEach(function (itemId) {
        addRewardQuantity(result, itemId, source[itemId]);
      });
    });
    return result;
  }

  function rowRewardOptions(row) {
    const options = [];
    if (row.chance !== null && row.chance < 1) options.push({});
    if (row.chance === 0) return options;
    const itemIds = typeof row.itemId === 'string'
      ? [row.itemId]
      : row.itemIds;
    itemIds.forEach(function (itemId) {
      for (let quantity = row.min; quantity <= row.max; quantity++) {
        const items = {};
        items[itemId] = quantity;
        options.push(items);
      }
    });
    return options;
  }

  function tableRewardOptions(rows) {
    let combinations = [{}];
    rows.forEach(function (row) {
      const options = rowRewardOptions(row);
      const next = [];
      combinations.forEach(function (base) {
        options.forEach(function (option) {
          next.push(combineRewardItems(base, option));
        });
      });
      combinations = next;
    });
    return combinations;
  }

  function authoritativeRewardItemIds() {
    const result = Object.create(null);
    Object.keys(LOOT_TABLES).forEach(function (tableId) {
      LOOT_TABLES[tableId].forEach(function (row) {
        const itemIds = typeof row.itemId === 'string'
          ? [row.itemId]
          : row.itemIds;
        itemIds.forEach(function (itemId) {
          result[itemId] = true;
        });
      });
    });
    Object.keys(DUNGEONS).forEach(function (dungeonId) {
      Object.keys(DUNGEONS[dungeonId].firstClearRewards.items)
        .forEach(function (itemId) {
          result[itemId] = true;
        });
    });
    return Object.freeze(result);
  }

  const AUTHORITATIVE_REWARD_ITEM_IDS = authoritativeRewardItemIds();

  function rewardSignature(items) {
    return JSON.stringify(Object.keys(items).sort().map(function (itemId) {
      return [itemId, items[itemId]];
    }));
  }

  function buildRewardSignatures() {
    const result = {};
    Object.keys(ENEMIES).forEach(function (enemyId) {
      const signatures = new Set();
      tableRewardOptions(LOOT_TABLES[ENEMIES[enemyId].lootTableId])
        .forEach(function (items) {
          signatures.add(rewardSignature(items));
        });
      result['enemy:' + enemyId] = signatures;
    });
    Object.keys(DUNGEONS).forEach(function (dungeonId) {
      const dungeon = DUNGEONS[dungeonId];
      const fixed = dungeon.firstClearRewards.items;
      const signatures = new Set([rewardSignature(fixed)]);
      const finalWave = dungeon.waves[dungeon.waves.length - 1];
      const enemy = ENEMIES[finalWave.enemyId];
      tableRewardOptions(LOOT_TABLES[enemy.lootTableId])
        .forEach(function (items) {
          signatures.add(rewardSignature(
            combineRewardItems(items, fixed)
          ));
        });
      result['dungeon-first-clear:' + dungeonId] = signatures;
    });
    return result;
  }

  const REWARD_SIGNATURES = buildRewardSignatures();

  function canonicalRewardItems(value) {
    const entries = dataEntries(value);
    if (!entries || entries.length === 0) return null;
    const items = {};
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      if (typeof entry.key !== 'string' ||
          entry.key.length === 0 ||
          !Object.prototype.hasOwnProperty.call(
            AUTHORITATIVE_REWARD_ITEM_IDS,
            entry.key
          ) ||
          !Number.isSafeInteger(entry.value) ||
          entry.value <= 0 ||
          Object.prototype.hasOwnProperty.call(items, entry.key)) {
        return null;
      }
      items[entry.key] = entry.value;
    }
    return items;
  }

  function hasKnownRewardSignature(source, items) {
    const signatures = REWARD_SIGNATURES[source.type + ':' + source.id];
    return !!signatures && signatures.has(rewardSignature(items));
  }

  function validCombatBatch(sourceId, items) {
    let components;
    try {
      components = JSON.parse(sourceId);
    } catch (error) {
      return false;
    }
    if (!Array.isArray(components) ||
        components.length < 2 || components.length > 5) {
      return false;
    }
    const combined = {};
    for (let index = 0; index < components.length; index++) {
      const component = exactDataRecord(components[index], ['source', 'items']);
      const source = component && exactDataRecord(component.source, ['type', 'id']);
      const componentItems = component && canonicalRewardItems(component.items);
      if (!source || source.type === 'combat-batch' ||
          typeof source.type !== 'string' ||
          typeof source.id !== 'string' ||
          !componentItems || !hasKnownRewardSignature(source, componentItems)) {
        return false;
      }
      const itemIds = Object.keys(componentItems);
      for (let itemIndex = 0; itemIndex < itemIds.length; itemIndex++) {
        const itemId = itemIds[itemIndex];
        if (!addRewardQuantity(combined, itemId, componentItems[itemId])) {
          return false;
        }
      }
    }
    return rewardSignature(combined) === rewardSignature(items);
  }

  function validateRewardPayload(sourceValue, itemsValue, currencyValue) {
    const source = exactDataRecord(sourceValue, ['type', 'id']);
    if (!source ||
        typeof source.type !== 'string' ||
        typeof source.id !== 'string' ||
        currencyValue !== 0) {
      return null;
    }
    const items = canonicalRewardItems(itemsValue);
    if (!items || (source.type === 'combat-batch'
      ? !validCombatBatch(source.id, items)
      : !hasKnownRewardSignature(source, items))) return null;
    const canonicalItems = {};
    Object.keys(items).sort().forEach(function (itemId) {
      canonicalItems[itemId] = items[itemId];
    });
    return deepFreeze({
      source: { type: source.type, id: source.id },
      items: canonicalItems,
      currency: 0
    });
  }

  function getRegion(regionId) {
    return REGIONS[regionId] || null;
  }

  function getEnemy(enemyId) {
    return ENEMIES[enemyId] || null;
  }

  function getDungeon(dungeonId) {
    return DUNGEONS[dungeonId] || null;
  }

  function getEquipment(itemId) {
    return EQUIPMENT[itemId] || null;
  }

  function getSupply(itemId) {
    return SUPPLIES[itemId] || null;
  }

  function getLootTable(lootTableId) {
    return LOOT_TABLES[lootTableId] || null;
  }

  return Object.freeze({
    REGIONS: REGIONS,
    ENEMIES: ENEMIES,
    DUNGEONS: DUNGEONS,
    EQUIPMENT: EQUIPMENT,
    SUPPLIES: SUPPLIES,
    TIER_LOOT: TIER_LOOT,
    LOOT_TABLES: LOOT_TABLES,
    getRegion: getRegion,
    getEnemy: getEnemy,
    getDungeon: getDungeon,
    getEquipment: getEquipment,
    getSupply: getSupply,
    getLootTable: getLootTable,
    validateRewardPayload: validateRewardPayload
  });
});
