(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.FishingParityContent = api;
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

  const JUNK_IMMUNITY_MASTERY = 65;
  const JUNK_SKILL_XP = 1;

  const SPECIES_ROWS = [
    ['spiritShrimp', '灵虾', 1],
    ['sardineFish', '沙丁灵鱼', 1],
    ['spiritCarp', '灵鲤', 1],
    ['blowfish', '河豚灵', 5],
    ['herringFish', '青鲱', 5],
    ['spiritSeahorse', '灵海马', 15],
    ['mackerelFish', '鲭灵鱼', 15],
    ['silverTrout', '银鳟', 8],
    ['leapingTrout', '跃纹鳟', 20],
    ['poisonFish', '毒泡鱼', 28],
    ['sunsetSalmon', '霞鲑', 20],
    ['leapingSalmon', '跃纹鲑', 35],
    ['fanfish', '扇尾鱼', 20],
    ['greenBass', '青鲈', 18],
    ['darkCatfish', '玄鲶', 25],
    ['spiritLobster', '灵龙虾', 40],
    ['halibutFish', '比目灵', 40],
    ['skeletonFish', '骨纹鱼', 45],
    ['swordfish', '剑鱼', 40],
    ['anglerFish', '鮟鱇灵', 50],
    ['crabSpirit', '玄蟹', 55],
    ['thunderEel', '雷鳗', 40],
    ['sharkSpirit', '鲨灵', 50],
    ['leapingBroad', '阔跃鱼', 55],
    ['caveFish', '洞冥鱼', 55],
    ['tilapiaFish', '石斑灵', 60],
    ['magicFish', '魔光鱼', 75],
    ['mantaRay', '鳐灵', 40],
    ['whaleSpirit', '鲸灵', 50],
    ['lavaFish', '熔岩鱼', 48],
    ['spikeFish', '刺鳞鱼', 60],
    ['rockfish', '岩纹鱼', 65],
    ['blueCrab', '蓝玉蟹', 60],
    ['magmaEel', '炎髓鳗', 48],
    ['largeBlowfish', '巨河豚', 60],
    ['staticJellyfish', '静电水母', 65],
    ['frostCrab', '霜蟹', 70],
    ['frozenManta', '冻鳐', 70],
    ['ghostFish', '鬼纹鱼', 75],
    ['mysticSeahorse', '玄海马', 80],
    ['terrorFish', '骇浪鱼', 75],
    ['mysticShark', '玄鲨', 80],
    ['dragonFish', '龙鱼', 70]
  ];

  // 尚无独立美术时，用可区分 emoji 区分鱼种（避免卡片上一排全是同一条蓝鱼）
  const SPECIES_ICON = {
    spiritShrimp: '🦐',
    sardineFish: '🐟',
    spiritCarp: '🐠',
    blowfish: '🐡',
    herringFish: '🐟',
    spiritSeahorse: '🌊',
    mackerelFish: '🐠',
    silverTrout: '🐟',
    leapingTrout: '🐠',
    poisonFish: '☠️',
    sunsetSalmon: '🍣',
    leapingSalmon: '🍣',
    fanfish: '🐠',
    greenBass: '🐟',
    darkCatfish: '🐟',
    spiritLobster: '🦞',
    halibutFish: '🐟',
    skeletonFish: '💀',
    swordfish: '🗡️',
    anglerFish: '🐡',
    crabSpirit: '🦀',
    thunderEel: '⚡',
    sharkSpirit: '🦈',
    leapingBroad: '🐠',
    caveFish: '🌑',
    tilapiaFish: '🐟',
    magicFish: '✨',
    mantaRay: '🪽',
    whaleSpirit: '🐋',
    lavaFish: '🔥',
    spikeFish: '📌',
    rockfish: '🪨',
    blueCrab: '🦀',
    magmaEel: '🌋',
    largeBlowfish: '🐡',
    staticJellyfish: '🪼',
    frostCrab: '❄️',
    frozenManta: '❄️',
    ghostFish: '👻',
    mysticSeahorse: '🌌',
    terrorFish: '👿',
    mysticShark: '🦈',
    dragonFish: '🐉'
  };

  const COOKABLE = {
    spiritShrimp: ['cookedSpiritShrimp', '灵虾汤', 1, 6, 20],
    sardineFish: ['cookedSardineFish', '烤沙丁', 3, 6, 22],
    spiritCarp: ['grilledCarp', '烤灵鲤', 1, 6, 24],
    blowfish: ['cookedBlowfish', '炙河豚', 8, 7, 26],
    herringFish: ['cookedHerringFish', '青鲱脍', 8, 7, 28],
    spiritSeahorse: ['cookedSpiritSeahorse', '海马羹', 15, 8, 32],
    mackerelFish: ['cookedMackerelFish', '鲭灵烤鱼', 18, 8, 34],
    silverTrout: ['troutFeast', '银鳟宴', 12, 8, 36],
    leapingTrout: ['cookedLeapingTrout', '跃纹鳟炙', 20, 9, 38],
    sunsetSalmon: ['cookedSunsetSalmon', '霞鲑炙', 22, 10, 42],
    leapingSalmon: ['cookedLeapingSalmon', '跃纹鲑炙', 35, 12, 48],
    fanfish: ['cookedFanfish', '扇尾鱼脍', 25, 10, 44],
    greenBass: ['cookedGreenBass', '青鲈炙', 20, 10, 40],
    darkCatfish: ['cookedDarkCatfish', '玄鲶煲', 28, 12, 46],
    spiritLobster: ['lobsterBanquet', '灵龙虾宴', 40, 14, 60],
    halibutFish: ['cookedHalibutFish', '比目灵炙', 42, 14, 62],
    swordfish: ['cookedSwordfish', '剑鱼排', 48, 16, 70],
    anglerFish: ['cookedAnglerFish', '鮟鱇灵汤', 50, 16, 72],
    crabSpirit: ['cookedCrabSpirit', '玄蟹黄', 55, 18, 76],
    thunderEel: ['cookedThunderEel', '雷鳗炙', 45, 15, 68],
    sharkSpirit: ['cookedSharkSpirit', '鲨灵肉', 58, 18, 80],
    leapingBroad: ['cookedLeapingBroad', '阔跃鱼炙', 55, 17, 78],
    caveFish: ['cookedCaveFish', '洞冥鱼脍', 60, 18, 82],
    tilapiaFish: ['cookedTilapiaFish', '石斑灵炙', 62, 18, 84],
    mantaRay: ['cookedMantaRay', '鳐灵翅', 70, 20, 90],
    whaleSpirit: ['cookedWhaleSpirit', '鲸灵脍', 75, 22, 95],
    lavaFish: ['cookedLavaFish', '熔岩鱼炙', 55, 17, 78],
    spikeFish: ['cookedSpikeFish', '刺鳞鱼脍', 62, 18, 84],
    rockfish: ['cookedRockfish', '岩纹鱼煲', 65, 19, 86],
    blueCrab: ['cookedBlueCrab', '蓝玉蟹宴', 64, 19, 88],
    magmaEel: ['cookedMagmaEel', '炎髓鳗炙', 58, 18, 80],
    largeBlowfish: ['cookedLargeBlowfish', '巨河豚脍', 66, 20, 88],
    frostCrab: ['cookedFrostCrab', '霜蟹宴', 70, 20, 92],
    frozenManta: ['cookedFrozenManta', '冻鳐脍', 72, 21, 94],
    mysticSeahorse: ['cookedMysticSeahorse', '玄海马羹', 80, 24, 100],
    terrorFish: ['cookedTerrorFish', '骇浪鱼脍', 78, 23, 98],
    mysticShark: ['cookedMysticShark', '玄鲨排', 85, 26, 110],
    dragonFish: ['dragonFishBanquet', '龙鱼宴', 70, 22, 100]
  };

  const SPECIAL_COOK = {
    poisonFish: true,
    skeletonFish: true,
    magicFish: true,
    staticJellyfish: true,
    ghostFish: true
  };

  function drop(itemId, w, q) {
    return { itemId: itemId, w: w, q: q == null ? 1 : q };
  }

  function spot(id, name, unlockLevel, time, xp, fishChance, junkChance, specialChance, fishIds, options) {
    const settings = options || {};
    const weights = fishIds.map(function (pair) {
      return drop(pair[0], pair[1], 1);
    });
    return {
      id: id,
      name: name,
      masteryId: 'fishing:' + id,
      unlockLevel: unlockLevel,
      time: time,
      xp: xp,
      fishChance: fishChance,
      junkChance: junkChance,
      specialChance: specialChance,
      unlockFlag: settings.unlockFlag || null,
      drops: weights
    };
  }

  const SPOTS = [
    spot('pond', '村口池塘', 1, 4, 10, 75, 25, 0, [
      ['spiritShrimp', 40], ['sardineFish', 30], ['spiritCarp', 30]
    ]),
    spot('shrapnelCreek', '碎石灵溪', 5, 4, 14, 80, 20, 0, [
      ['sardineFish', 35], ['herringFish', 35], ['blowfish', 30]
    ]),
    spot('shallow', '灵溪浅滩', 8, 3.5, 16, 78, 20, 2, [
      ['spiritShrimp', 35], ['spiritCarp', 35], ['silverTrout', 30]
    ]),
    spot('moon', '银月溪谷', 15, 5, 22, 72, 26, 2, [
      ['silverTrout', 40], ['spiritSeahorse', 30], ['mackerelFish', 30]
    ]),
    spot('pier', '渡口渔栈', 20, 5, 28, 70, 28, 2, [
      ['silverTrout', 30], ['sunsetSalmon', 40], ['fanfish', 30]
    ]),
    spot('deep', '翠玉深潭', 28, 6, 36, 70, 27, 3, [
      ['greenBass', 35], ['poisonFish', 30], ['darkCatfish', 35]
    ]),
    spot('openWaters', '沧澜阔水', 40, 8, 55, 70, 27, 3, [
      ['swordfish', 35], ['spiritLobster', 35], ['mantaRay', 30]
    ]),
    spot('barrenOcean', '荒洋无风带', 50, 10, 72, 88, 10, 2, [
      ['sharkSpirit', 35], ['whaleSpirit', 30], ['halibutFish', 35]
    ]),
    spot('trench', '剑渊海沟', 55, 11, 85, 68, 28, 4, [
      ['blowfish', 20], ['anglerFish', 30], ['caveFish', 25], ['swordfish', 25]
    ]),
    spot('thunderPond', '雷泽沼地', 48, 9, 68, 80, 15, 5, [
      ['thunderEel', 40], ['lavaFish', 30], ['magmaEel', 30]
    ]),
    spot('jungleWaters', '蛮藤水泽', 60, 11, 90, 78, 18, 4, [
      ['spikeFish', 35], ['blueCrab', 35], ['largeBlowfish', 30]
    ]),
    spot('staticValley', '静雷谷涧', 65, 12, 100, 82, 14, 4, [
      ['rockfish', 55], ['staticJellyfish', 45]
    ]),
    spot('frozenSea', '玄冰海', 70, 13, 110, 88, 10, 2, [
      ['frostCrab', 50], ['frozenManta', 50]
    ]),
    spot('midnightLagoon', '夜汐潟湖', 75, 14, 120, 66, 28, 6, [
      ['ghostFish', 35], ['terrorFish', 35], ['skeletonFish', 30]
    ]),
    spot('mysticPond', '玄机秘潭', 80, 15, 135, 84, 10, 6, [
      ['mysticSeahorse', 25], ['mysticShark', 25], ['magicFish', 25], ['dragonFish', 25]
    ]),
    spot('secretCove', '漂流秘湾', 1, 8, 80, 92, 0, 8, [
      ['spiritSeahorse', 35], ['skeletonFish', 30], ['magicFish', 35]
    ], { unlockFlag: 'secretCove' }),
    spot('berserkShoal', '狂澜滩', 20, 7, 60, 94, 5, 1, [
      ['leapingTrout', 35], ['leapingSalmon', 35], ['leapingBroad', 30]
    ], { unlockFlag: 'berserkShoal' })
  ];

  const FISH_SPECIES = {};
  SPECIES_ROWS.forEach(function (row) {
    FISH_SPECIES[row[0]] = {
      id: row[0],
      name: row[1],
      unlockLevel: row[2],
      masteryId: 'fishing:' + row[0],
      maxStock: 20,
      recoverSeconds: 60,
      cookable: !!COOKABLE[row[0]],
      specialUse: !!SPECIAL_COOK[row[0]]
    };
  });

  const JUNK_POOL = [
    { itemId: 'oldBoot', w: 18, sellValue: 2 },
    { itemId: 'rottenHat', w: 16, sellValue: 2 },
    { itemId: 'rustyHook', w: 14, sellValue: 2 },
    { itemId: 'tornNet', w: 14, sellValue: 2 },
    { itemId: 'driftwood', w: 12, sellValue: 3 },
    { itemId: 'crackedBowl', w: 10, sellValue: 2 },
    { itemId: 'soakedRags', w: 8, sellValue: 1 },
    { itemId: 'hempRope', w: 6, sellValue: 6 },
    { itemId: 'spiritSilkScrap', w: 4, sellValue: 10 },
    { itemId: 'dullScale', w: 4, sellValue: 5 },
    { itemId: 'waterloggedCoin', w: 3, sellValue: 12 },
    { itemId: 'tangledWeed', w: 3, sellValue: 3 }
  ];

  const SPECIAL_POOL = [
    { itemId: 'sunkenCasket', w: 500 },
    { itemId: 'lostTackleBox', w: 80 },
    { itemId: 'messageBottle', w: 25 },
    { itemId: 'berserkBracer', w: 18 },
    { itemId: 'pirateRelicRing', w: 8 },
    { itemId: 'ancientSkillRing', w: 2 },
    { itemId: 'ancientMasteryRing', w: 2 }
  ];

  const CASKET_LOOT = [
    { kind: 'junk', w: 40 },
    { kind: 'gem', w: 25, itemIds: ['topaz', 'sapphire', 'ruby'] },
    { kind: 'bar', w: 12, itemIds: ['bronzeBar', 'ironBar', 'silverBar'] },
    { kind: 'lingshi', w: 18, quantity: 5 },
    { kind: 'item', w: 5, itemId: 'brinePendant' }
  ];

  const TACKLE_LOOT = [
    { itemId: 'fishingHook', w: 35 },
    { itemId: 'goldenReel', w: 25 },
    { itemId: 'spiritLure', w: 25 },
    { itemId: 'topaz', w: 8 },
    { itemId: 'spiritEssence', w: 7 }
  ];

  function itemRow(id, name, category, opts) {
    const settings = opts || {};
    return {
      id: id,
      name: name,
      category: category,
      materialType: settings.materialType || null,
      tier: settings.tier || 1,
      quality: settings.quality || 'white',
      icon: settings.icon || '🐟',
      description: settings.description || (name + '。'),
      sourceTags: settings.sourceTags || ['gathering:fishing'],
      useTags: settings.useTags || [],
      stackable: settings.stackable !== false,
      useAction: settings.useAction || null,
      unlockFlag: settings.unlockFlag || null,
      heal: settings.heal || null,
      equipmentSlot: settings.equipmentSlot || null
    };
  }

  function itemRows() {
    const rows = [];
    SPECIES_ROWS.forEach(function (row) {
      const id = row[0];
      const name = row[1];
      if (id === 'magicFish') {
        rows.push(itemRow(id, name, 'consumable', {
          materialType: 'raw_fish',
          icon: '✨',
          description: '魔光鱼，可生食恢复气血，亦可出售。',
          useTags: ['combat_food'],
          useAction: 'eat',
          heal: 55,
          sellValue: 40
        }));
        return;
      }
      rows.push(itemRow(id, name, 'material', {
        materialType: SPECIAL_COOK[id] ? 'special_fish' : 'raw_fish',
        icon: SPECIES_ICON[id] || '🐟',
        description: name + '，钓鱼所得。',
        useTags: COOKABLE[id]
          ? ['cooking']
          : (SPECIAL_COOK[id] ? ['alchemy', 'sell'] : ['sell']),
        sellValue: 3 + Math.floor(row[2] / 5)
      }));
    });

    Object.keys(COOKABLE).forEach(function (rawId) {
      const cook = COOKABLE[rawId];
      rows.push(itemRow(cook[0], cook[1], 'consumable', {
        materialType: 'cooked_fish',
        icon: '🍲',
        description: cook[1] + '，战斗中可恢复气血。',
        sourceTags: ['production:cooking'],
        useTags: ['combat_food'],
        sellValue: 8 + Math.floor(cook[2] / 3),
        heal: cook[4]
      }));
    });

    rows.push(itemRow('spiritRiceMeal', '灵米饭', 'consumable', {
      materialType: 'cooked_meal',
      icon: '🍚',
      description: '灵米饭，食用可恢复状态。',
      sourceTags: ['production:cooking'],
      useTags: ['combat_food'],
      sellValue: 10,
      heal: 35
    }));
    rows.push(itemRow('beastFeed', '灵兽口粮', 'consumable', {
      materialType: 'beast_feed',
      icon: '🍖',
      description: '灵兽口粮，用于驯养灵兽。',
      sourceTags: ['production:cooking'],
      useTags: ['beast'],
      sellValue: 8
    }));

    JUNK_POOL.forEach(function (entry) {
      const names = {
        oldBoot: '破靴',
        rottenHat: '烂斗笠',
        rustyHook: '锈钩',
        tornNet: '断网',
        driftwood: '漂木',
        crackedBowl: '碎瓷碗',
        soakedRags: '潮湿布片',
        hempRope: '麻绳',
        spiritSilkScrap: '灵丝残段',
        dullScale: '黯淡鳞片',
        waterloggedCoin: '水蚀铜钱',
        tangledWeed: '缠魂水草'
      };
      rows.push(itemRow(entry.itemId, names[entry.itemId], 'material', {
        materialType: 'fishing_junk',
        icon: '🥾',
        description: names[entry.itemId] + '，钓鱼杂物，多可出售。',
        useTags: entry.itemId === 'hempRope' || entry.itemId === 'spiritSilkScrap'
          ? ['talisman', 'sell']
          : ['sell'],
        sellValue: entry.sellValue
      }));
    });

    rows.push(itemRow('sunkenCasket', '沉水宝匣', 'material', {
      materialType: 'fishing_container',
      icon: '📦',
      description: '沉水宝匣，打开可获得杂物、宝石或小饰品。',
      useTags: ['open'],
      useAction: 'openSunkenCasket',
      sellValue: 20
    }));
    rows.push(itemRow('lostTackleBox', '遗落渔匣', 'material', {
      materialType: 'fishing_container',
      icon: '🧰',
      description: '遗落渔匣，打开可获得渔具消耗品。',
      useTags: ['open'],
      useAction: 'openLostTackleBox',
      sellValue: 35
    }));
    rows.push(itemRow('messageBottle', '漂流瓶', 'material', {
      materialType: 'fishing_key',
      icon: '🍾',
      description: '漂流瓶，使用后解锁漂流秘湾。',
      useTags: ['unlock'],
      useAction: 'unlockSecretCove',
      unlockFlag: 'secretCove',
      sellValue: 50
    }));
    rows.push(itemRow('berserkBracer', '狂澜护腕', 'material', {
      materialType: 'fishing_key',
      icon: '🥋',
      description: '狂澜护腕，使用后解锁狂澜滩（掉落专属）。',
      useTags: ['unlock', 'equipment'],
      useAction: 'unlockBerserkShoal',
      unlockFlag: 'berserkShoal',
      equipmentSlot: 'accessory',
      sellValue: 120,
      quality: 'blue'
    }));
    rows.push(itemRow('pirateRelicRing', '海盗遗戒', 'material', {
      materialType: 'fishing_gear',
      icon: '💍',
      description: '海盗遗戒，钓鱼掉落专属饰品素材。',
      useTags: ['equipment'],
      equipmentSlot: 'accessory',
      sellValue: 200,
      quality: 'purple'
    }));
    rows.push(itemRow('ancientSkillRing', '古钓技能戒', 'material', {
      materialType: 'fishing_gear',
      icon: '💍',
      description: '古钓技能戒，极稀有；生活技能经验加成（属性二期接入）。',
      useTags: ['equipment'],
      equipmentSlot: 'accessory',
      sellValue: 800,
      quality: 'orange'
    }));
    rows.push(itemRow('ancientMasteryRing', '古钓熟练戒', 'material', {
      materialType: 'fishing_gear',
      icon: '💍',
      description: '古钓熟练戒，极稀有；熟练经验加成（属性二期接入）。',
      useTags: ['equipment'],
      equipmentSlot: 'accessory',
      sellValue: 800,
      quality: 'orange'
    }));
    rows.push(itemRow('brinePendant', '水蚀玉佩', 'material', {
      materialType: 'fishing_gear',
      icon: '📿',
      description: '水蚀玉佩，沉水宝匣偶出的低阶饰品。',
      useTags: ['equipment'],
      equipmentSlot: 'accessory',
      sellValue: 40,
      quality: 'green'
    }));
    rows.push(itemRow('fishingHook', '灵鱼钩', 'consumable', {
      materialType: 'fishing_consumable',
      icon: '🪝',
      description: '灵鱼钩，钓鱼消耗品（效果二期接入）。',
      useTags: ['fishing'],
      sellValue: 15
    }));
    rows.push(itemRow('goldenReel', '金丝轮', 'consumable', {
      materialType: 'fishing_consumable',
      icon: '🎯',
      description: '金丝轮，提升特殊掉落率（效果二期接入）。',
      useTags: ['fishing'],
      sellValue: 25
    }));
    rows.push(itemRow('spiritLure', '聚灵饵', 'consumable', {
      materialType: 'fishing_consumable',
      icon: '🪱',
      description: '聚灵饵，提升双倍鱼产出（效果二期接入）。',
      useTags: ['fishing'],
      sellValue: 20
    }));
    rows.push(itemRow('fishBox', '鱼宝箱', 'material', {
      materialType: 'fishing_container',
      icon: '📦',
      description: '旧版鱼宝箱，等同沉水宝匣可打开。',
      useTags: ['open'],
      useAction: 'openSunkenCasket',
      sellValue: 15
    }));

    return rows;
  }

  function recipeRows() {
    const rows = [];
    Object.keys(COOKABLE).forEach(function (rawId) {
      const cook = COOKABLE[rawId];
      const ingredients = {};
      ingredients[rawId] = 2;
      rows.push({
        skillId: 'cooking',
        outputId: cook[0],
        name: cook[1],
        unlockLevel: cook[2],
        baseSeconds: cook[3],
        ingredients: ingredients,
        options: { outputQuantity: 1 }
      });
    });
    rows.push({
      skillId: 'cooking',
      outputId: 'spiritRiceMeal',
      name: '灵米饭',
      unlockLevel: 10,
      baseSeconds: 10,
      ingredients: { spiritRice: 3, spiritHoney: 1 },
      options: { outputQuantity: 1 }
    });
    rows.push({
      skillId: 'cooking',
      outputId: 'beastFeed',
      name: '灵兽口粮',
      unlockLevel: 12,
      baseSeconds: 10,
      ingredients: { spiritRice: 2 },
      options: {
        outputQuantity: 2,
        ingredientChoices: [{
          quantity: 1,
          itemIds: Object.keys(COOKABLE)
        }]
      }
    });
    return rows;
  }

  function supplyRows() {
    const supplies = {
      magicFish: { type: 'food', heal: 55 },
      spiritRiceMeal: { type: 'food', heal: 35 }
    };
    Object.keys(COOKABLE).forEach(function (rawId) {
      const cook = COOKABLE[rawId];
      supplies[cook[0]] = { type: 'food', heal: cook[4] };
    });
    return supplies;
  }

  function getSpot(spotId) {
    return SPOTS.find(function (row) { return row.id === spotId; }) || null;
  }

  return deepFreeze({
    JUNK_IMMUNITY_MASTERY: JUNK_IMMUNITY_MASTERY,
    JUNK_SKILL_XP: JUNK_SKILL_XP,
    SPECIES_ROWS: SPECIES_ROWS,
    FISH_SPECIES: FISH_SPECIES,
    SPOTS: SPOTS,
    JUNK_POOL: JUNK_POOL,
    SPECIAL_POOL: SPECIAL_POOL,
    CASKET_LOOT: CASKET_LOOT,
    TACKLE_LOOT: TACKLE_LOOT,
    COOKABLE: COOKABLE,
    itemRows: itemRows,
    recipeRows: recipeRows,
    supplyRows: supplyRows,
    getSpot: getSpot
  });
});
