(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.GatheringContent = api;
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

  function loadMaterialContent() {
    if (typeof globalThis !== 'undefined' && globalThis.MaterialContent) {
      return globalThis.MaterialContent;
    }
    if (typeof require === 'function') {
      try {
        return require('./materials.js');
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  const MATERIAL_CONTENT = loadMaterialContent();

  function drop(itemId, w, q) {
    return { itemId: itemId, w: w, q: q };
  }

  function entry(id, name, unlockLevel, time, xp, capMin, capMax, drops) {
    return {
      id: id,
      masteryId: null,
      name: name,
      unlockLevel: unlockLevel,
      time: time,
      xp: xp,
      capMin: capMin,
      capMax: capMax,
      drops: drops
    };
  }

  function spot(id, name, unlockLevel, time, xp, drops) {
    return {
      id: id,
      name: name,
      unlockLevel: unlockLevel,
      time: time,
      xp: xp,
      drops: drops
    };
  }

  function exploration(skillId, name) {
    return {
      id: 'explore:' + skillId,
      masteryId: 'explore:' + skillId,
      name: name,
      label: '探索',
      time: 2,
      skillXp: 10,
      masteryXp: 5,
      cultivation: 1
    };
  }

  const LEGACY_ENTRY_ALIASES = {
    herb: {
      lingzhiGrove: 'parityHerb1',
      mushroomWood: 'parityHerb2',
      silkForest: 'parityHerb3',
      riverbank: 'parityHerb4',
      dragonValley: 'parityHerb5',
      moonMeadow: 'parityHerb6',
      secretGarden: 'parityHerb7',
      bloodSwamp: 'parityHerb8',
      thunderPeak: 'parityHerb8',
      goldenRealm: 'parityHerb8',
      myriadHerb: 'parityHerb8'
    }
  };

  const miningEntries = [
    entry('copper', '铜矿脉', 1, 4, 12, 15, 30, [
      drop('copperOre', 100, 1), drop('topaz', 8, 1), drop('lingshi', 8, 1)
    ]),
    entry('tin', '锡矿脉', 1, 4, 12, 15, 30, [
      drop('tinOre', 100, 1), drop('topaz', 8, 1), drop('lingshi', 8, 1)
    ]),
    entry('iron', '铁矿脉', 1, 4, 12, 15, 30, [
      drop('ironOre', 100, 1), drop('topaz', 8, 1), drop('lingshi', 9, 1)
    ]),
    entry('silver', '银矿脉', 12, 6, 25, 12, 25, [
      drop('silverOre', 100, 1), drop('topaz', 8, 1), drop('lingshi', 10, 1)
    ]),
    entry('gold', '金矿脉', 20, 8, 40, 10, 22, [
      drop('goldOre', 100, 1), drop('topaz', 6, 1), drop('sapphire', 3, 1),
      drop('lingshi', 12, 1)
    ]),
    entry('mithril', '秘银矿脉', 25, 9, 50, 9, 20, [
      drop('mithrilOre', 100, 1), drop('sapphire', 8, 1), drop('ruby', 3, 1),
      drop('lingshi', 12, 1)
    ]),
    entry('jade', '灵玉矿脉', 30, 10, 60, 8, 18, [
      drop('jadeShard', 100, 1), drop('sapphire', 8, 1), drop('ruby', 3, 1),
      drop('lingshi', 13, 1)
    ]),
    entry('adamant', '精金矿脉', 35, 11, 70, 7, 15, [
      drop('adamantOre', 100, 1), drop('ruby', 7, 1), drop('emerald', 6, 1),
      drop('diamond', 2, 1), drop('lingshi', 14, 1)
    ]),
    entry('darkiron', '玄铁矿脉', 40, 12, 85, 6, 12, [
      drop('darkIronOre', 100, 1), drop('ruby', 6, 1), drop('emerald', 6, 1),
      drop('diamond', 3, 1), drop('darkCrystal', 1, 1), drop('lingshi', 15, 1)
    ]),
    entry('crystal', '玄晶矿脉', 45, 14, 100, 5, 10, [
      drop('crystalOre', 100, 1), drop('ruby', 6, 1), drop('emerald', 6, 1),
      drop('diamond', 3, 1), drop('darkCrystal', 2, 1), drop('lingshi', 17, 1)
    ])
  ];

  const woodcuttingEntries = [
    entry('willow', '河畔柳林', 1, 4, 10, 15, 30, [
      drop('willowWood', 70, 1), drop('pineWood', 15, 1), drop('spiritPeach', 8, 1),
      drop('lingshi', 10, 1), drop('birdNest', 5, 1), drop('commonSeed', 6, 1)
    ]),
    entry('pine', '青松岭', 5, 5, 15, 12, 25, [
      drop('pineWood', 65, 1), drop('willowWood', 15, 1), drop('spiritPeach', 8, 1),
      drop('lingshi', 10, 1), drop('birdNest', 3, 1), drop('commonSeed', 6, 1)
    ]),
    entry('peach', '桃花谷', 12, 6, 22, 10, 22, [
      drop('peachWood', 60, 1), drop('pineWood', 15, 1), drop('spiritPeach', 8, 1),
      drop('lingshi', 10, 1), drop('birdNest', 3, 1), drop('commonSeed', 6, 1)
    ]),
    entry('nanmu', '楠木深林', 20, 8, 35, 8, 18, [
      drop('nanmuWood', 55, 1), drop('peachWood', 15, 1), drop('spiritPeach', 8, 1),
      drop('lingshi', 12, 1), drop('resin', 10, 1), drop('birdNest', 8, 1),
      drop('commonSeed', 6, 1)
    ]),
    entry('phoenix', '梧桐灵谷', 28, 10, 48, 7, 15, [
      drop('phoenixWood', 50, 1), drop('nanmuWood', 18, 1), drop('spiritPeach', 6, 1),
      drop('lingshi', 12, 1), drop('spiritEgg', 10, 1), drop('resin', 10, 1),
      drop('birdNest', 6, 1), drop('fineSeed', 5, 1)
    ]),
    entry('spirit', '灵木幽林', 35, 11, 60, 6, 14, [
      drop('spiritWood', 50, 1), drop('phoenixWood', 15, 1), drop('spiritPeach', 6, 1),
      drop('lingshi', 12, 1), drop('spiritWormSilk', 10, 1), drop('resin', 8, 1),
      drop('birdNest', 5, 1), drop('fineSeed', 5, 1)
    ]),
    entry('thunder', '雷劈枯林', 42, 13, 78, 5, 12, [
      drop('thunderWood', 45, 1), drop('spiritWood', 18, 1), drop('spiritPeach', 6, 1),
      drop('lingshi', 15, 1), drop('thunderHerb', 10, 1), drop('resin', 7, 1),
      drop('birdNest', 5, 1), drop('beastHide', 6, 1), drop('spiritFruit', 5, 1),
      drop('rareSeed', 5, 1)
    ]),
    entry('blood', '血檀秘境', 48, 14, 90, 4, 10, [
      drop('bloodSandalwood', 45, 1), drop('thunderWood', 15, 1),
      drop('spiritPeach', 6, 1), drop('lingshi', 15, 1), drop('beastHide', 10, 1),
      drop('bloodHerb', 8, 1), drop('resin', 7, 1), drop('birdNest', 5, 1),
      drop('spiritFruit', 5, 1), drop('rareSeed', 5, 1)
    ]),
    entry('ancient', '万年古林', 55, 16, 110, 3, 8, [
      drop('ancientWood', 40, 1), drop('bloodSandalwood', 15, 1),
      drop('spiritWood', 12, 1), drop('lingshi', 15, 1), drop('millenniumVine', 8, 1),
      drop('spiritFruit', 5, 1), drop('birdNest', 5, 1), drop('beastHide', 6, 1),
      drop('rareSeed', 5, 1)
    ]),
    entry('vine', '仙藤圣林', 62, 18, 140, 3, 7, [
      drop('millenniumVine', 35, 1), drop('ancientWood', 18, 1),
      drop('spiritWood', 12, 1), drop('lingshi', 15, 1), drop('spiritFruit', 8, 1),
      drop('resin', 7, 1), drop('birdNest', 5, 1), drop('beastHide', 6, 1),
      drop('rareSeed', 5, 1)
    ])
  ];

  const fishingSpots = [
    spot('pond', '村口池塘', 1, 4.0, 10, [
      drop('spiritCarp', 70, 1), drop('spiritShrimp', 30, 1)
    ]),
    spot('shallow', '灵溪浅滩', 5, 3.5, 15, [
      drop('spiritShrimp', 60, 1), drop('spiritCarp', 25, 1),
      drop('silverTrout', 15, 1)
    ]),
    spot('moon', '银月溪谷', 10, 5.0, 22, [
      drop('silverTrout', 55, 1), drop('spiritCarp', 25, 1),
      drop('greenBass', 15, 1), drop('spiritShrimp', 5, 1)
    ]),
    spot('deep', '翠玉深潭', 18, 6.0, 32, [
      drop('greenBass', 50, 1), drop('silverTrout', 25, 1),
      drop('darkCatfish', 15, 1), drop('spiritCarp', 10, 1)
    ]),
    spot('dark', '幽冥暗河', 25, 7.0, 42, [
      drop('darkCatfish', 50, 1), drop('greenBass', 25, 1),
      drop('sunsetSalmon', 15, 1), drop('thunderEel', 10, 1)
    ]),
    spot('waterfall', '落霞瀑布', 32, 8.0, 55, [
      drop('sunsetSalmon', 50, 1), drop('darkCatfish', 20, 1),
      drop('thunderEel', 18, 1), drop('greenBass', 12, 1)
    ]),
    spot('thunderPond', '雷泽沼地', 40, 9.0, 68, [
      drop('thunderEel', 50, 1), drop('sunsetSalmon', 22, 1),
      drop('spiritLobster', 15, 1), drop('darkCatfish', 13, 1)
    ]),
    spot('ocean', '沧澜深海', 50, 10.0, 85, [
      drop('spiritLobster', 45, 1), drop('thunderEel', 25, 1),
      drop('swordfish', 18, 1), drop('sunsetSalmon', 12, 1)
    ]),
    spot('trench', '剑渊海沟', 60, 12.0, 105, [
      drop('swordfish', 45, 1), drop('spiritLobster', 25, 1),
      drop('dragonFish', 12, 1), drop('thunderEel', 18, 1)
    ]),
    spot('dragon', '龙渊秘境', 70, 15.0, 130, [
      drop('dragonFish', 40, 1), drop('swordfish', 25, 1),
      drop('spiritLobster', 20, 1), drop('thunderEel', 15, 1)
    ])
  ];

  const herbEntries = [
    entry('lingzhiGrove', '灵芝草丛', 1, 5.0, 12, 12, 25, [
      drop('lingzhi', 60, 1), drop('spiritHoney', 18, 1),
      drop('commonSeed', 12, 1), drop('lingshi', 12, 1)
    ]),
    entry('mushroomWood', '灵菇林地', 3, 5.0, 14, 10, 22, [
      drop('spiritMushroom', 60, 1), drop('spiritHoney', 18, 1),
      drop('commonSeed', 12, 1), drop('lingshi', 12, 1)
    ]),
    entry('silkForest', '天蚕丝林', 8, 7.0, 22, 10, 20, [
      drop('skySilk', 60, 1), drop('spiritHoney', 18, 1),
      drop('commonSeed', 12, 1), drop('lingshi', 12, 1)
    ]),
    entry('riverbank', '灵溪河岸', 10, 7.0, 25, 8, 18, [
      drop('ironhideGrass', 55, 1), drop('spiritHoney', 18, 1),
      drop('commonSeed', 12, 1), drop('lingshi', 12, 1)
    ]),
    entry('dragonValley', '龙涎草谷', 20, 10.0, 45, 6, 15, [
      drop('dragonSalivaGrass', 50, 1), drop('spiritHoney', 12, 1),
      drop('spiritRice', 12, 1), drop('fineSeed', 10, 1), drop('lingshi', 12, 1)
    ]),
    entry('moonMeadow', '月华草甸', 22, 10.0, 50, 5, 14, [
      drop('moonSpiritGrass', 50, 1), drop('spiritHoney', 12, 1),
      drop('spiritRice', 12, 1), drop('fineSeed', 10, 1), drop('lingshi', 12, 1)
    ]),
    entry('secretGarden', '灵药秘圃', 30, 12.0, 60, 4, 10, [
      drop('starGrass', 45, 1), drop('spiritHoney', 12, 1),
      drop('spiritRice', 12, 1), drop('fineSeed', 10, 1), drop('lingshi', 12, 1)
    ]),
    entry('bloodSwamp', '血灵沼泽', 35, 13.0, 70, 4, 10, [
      drop('bloodSpiritGrass', 45, 1), drop('oldGinseng', 10, 1),
      drop('bloodGinsengFruit', 10, 1), drop('rareSeed', 8, 1),
      drop('lingshi', 12, 1)
    ]),
    entry('thunderPeak', '雷霆峰顶', 40, 14.0, 80, 3, 8, [
      drop('thunderSpiritGrass', 50, 1), drop('oldGinseng', 10, 1),
      drop('bloodGinsengFruit', 10, 1), drop('rareSeed', 8, 1),
      drop('lingshi', 12, 1)
    ]),
    entry('goldenRealm', '金芝圣境', 45, 15.0, 100, 3, 7, [
      drop('goldenLingzhi', 35, 1), drop('oldGinseng', 10, 1),
      drop('bloodGinsengFruit', 10, 1), drop('rareSeed', 8, 1),
      drop('lingshi', 12, 1)
    ]),
    entry('myriadHerb', '万药灵境', 50, 16.0, 120, 3, 6, [
      drop('goldenLingzhi', 20, 1), drop('thunderSpiritGrass', 15, 1),
      drop('starGrass', 15, 1), drop('oldGinseng', 10, 1),
      drop('bloodGinsengFruit', 10, 1), drop('rareSeed', 8, 1),
      drop('lingshi', 12, 1)
    ])
  ];

  function materialExtensionEntries(skillId) {
    const extensions = MATERIAL_CONTENT && typeof MATERIAL_CONTENT.gatheringExtensions === 'function'
      ? MATERIAL_CONTENT.gatheringExtensions()[skillId]
      : null;
    return (extensions || []).map(function (record) {
      return entry(
        record.id,
        record.name,
        record.unlockLevel,
        record.time,
        record.xp,
        record.capMin,
        record.capMax,
        (record.drops || []).map(function (dropRow) {
          return drop(dropRow.itemId, dropRow.w, dropRow.q);
        })
      );
    });
  }

  function appendMaterialExtensions(target, skillId) {
    materialExtensionEntries(skillId).forEach(function (record) {
      target.push(record);
    });
  }

  function replaceWithMaterialExtensions(target, skillId) {
    const entries = materialExtensionEntries(skillId);
    if (!entries.length) return;
    target.length = 0;
    entries.forEach(function (record) {
      target.push(record);
    });
  }

  appendMaterialExtensions(miningEntries, 'mining');
  appendMaterialExtensions(woodcuttingEntries, 'woodcutting');
  replaceWithMaterialExtensions(herbEntries, 'herb');

  miningEntries.forEach(function (record) {
    record.masteryId = 'mining:' + record.id;
  });
  woodcuttingEntries.forEach(function (record) {
    record.masteryId = 'woodcutting:' + record.id;
  });
  herbEntries.forEach(function (record) {
    record.masteryId = 'herb:' + record.id;
  });

  const GATHERING = deepFreeze({
    mining: {
      id: 'mining',
      title: '采矿',
      tint: '#CFE6F6',
      explore: exploration('mining', '探寻灵矿'),
      entries: miningEntries
    },
    woodcutting: {
      id: 'woodcutting',
      title: '伐木',
      tint: '#FBEFC4',
      explore: exploration('woodcutting', '探寻灵林'),
      entries: woodcuttingEntries
    },
    fishing: {
      id: 'fishing',
      title: '钓鱼',
      tint: '#CFE6F6',
      explore: null,
      spots: fishingSpots
    },
    herb: {
      id: 'herb',
      title: '采药',
      tint: '#CDEBD7',
      explore: exploration('herb', '探寻药田'),
      entries: herbEntries
    }
  });

  function species(id, name) {
    return {
      id: id,
      name: name,
      masteryId: 'fishing:' + id,
      maxStock: 20,
      recoverSeconds: 60
    };
  }

  const FISH_SPECIES = deepFreeze({
    spiritCarp: species('spiritCarp', '灵鲤'),
    spiritShrimp: species('spiritShrimp', '灵虾'),
    silverTrout: species('silverTrout', '银鳟'),
    greenBass: species('greenBass', '青鲈'),
    darkCatfish: species('darkCatfish', '玄鲶'),
    sunsetSalmon: species('sunsetSalmon', '霞鲑'),
    thunderEel: species('thunderEel', '雷鳗'),
    spiritLobster: species('spiritLobster', '灵龙虾'),
    swordfish: species('swordfish', '剑鱼'),
    dragonFish: species('dragonFish', '龙鱼')
  });

  const RESOURCE_QUALITIES = deepFreeze({
    common: { weight: 70, capacityMultiplier: 1, extraYieldChance: 0 },
    fine: { weight: 25, capacityMultiplier: 1.25, extraYieldChance: 0.15 },
    rare: { weight: 5, capacityMultiplier: 1.5, extraYieldChance: 0.30 }
  });

  function eachDrop(visitor) {
    ['mining', 'woodcutting', 'herb'].forEach(function (skillId) {
      GATHERING[skillId].entries.forEach(function (record) {
        record.drops.forEach(visitor);
      });
    });
    GATHERING.fishing.spots.forEach(function (record) {
      record.drops.forEach(visitor);
    });
  }

  function getEntry(skillId, entryId) {
    const family = GATHERING[skillId];
    if (!family || !family.entries) return null;
    return family.entries.find(function (record) {
      return record.id === entryId;
    }) || null;
  }

  function resolveEntryId(skillId, entryId) {
    if (typeof skillId !== 'string' || typeof entryId !== 'string') {
      return null;
    }
    if (getEntry(skillId, entryId)) return entryId;
    const aliases = LEGACY_ENTRY_ALIASES[skillId];
    const resolved = aliases && aliases[entryId];
    return resolved && getEntry(skillId, resolved) ? resolved : null;
  }

  function getFishingSpot(spotId) {
    return GATHERING.fishing.spots.find(function (record) {
      return record.id === spotId;
    }) || null;
  }

  return Object.freeze({
    GATHERING: GATHERING,
    FISH_SPECIES: FISH_SPECIES,
    RESOURCE_QUALITIES: RESOURCE_QUALITIES,
    LEGACY_ENTRY_ALIASES: deepFreeze(LEGACY_ENTRY_ALIASES),
    eachDrop: eachDrop,
    getEntry: getEntry,
    resolveEntryId: resolveEntryId,
    getFishingSpot: getFishingSpot
  });
});
