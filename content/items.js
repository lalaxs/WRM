(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.ItemContent = api;
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
    if (typeof MaterialContent !== 'undefined') return MaterialContent;
    if (typeof require === 'function') {
      try {
        return require('./materials.js');
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function loadFishingParityContent() {
    if (typeof FishingParityContent !== 'undefined') return FishingParityContent;
    if (typeof require === 'function') {
      try {
        return require('./fishing-parity.js');
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function loadItemArtContent() {
    if (typeof ItemArtContent !== 'undefined') return ItemArtContent;
    if (typeof require === 'function') {
      try {
        return require('./item-art.js');
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  const MATERIAL_CONTENT = loadMaterialContent();
  const FISHING_PARITY_CONTENT = loadFishingParityContent();
  const ITEM_ART_CONTENT = loadItemArtContent();
  const MATERIAL_ITEM_ROWS = (MATERIAL_CONTENT &&
    typeof MATERIAL_CONTENT.itemRows === 'function'
    ? MATERIAL_CONTENT.itemRows()
    : []).concat(
    FISHING_PARITY_CONTENT && typeof FISHING_PARITY_CONTENT.itemRows === 'function'
      ? FISHING_PARITY_CONTENT.itemRows()
      : []
  );
  const MATERIAL_ITEMS_BY_ID = {};
  MATERIAL_ITEM_ROWS.forEach(function (row) {
    if (row && typeof row.id === 'string') {
      MATERIAL_ITEMS_BY_ID[row.id] = row;
    }
  });

  const CATEGORIES = deepFreeze({
    material: '材料',
    equipment: '装备',
    consumable: '消耗品',
    technique: '功法',
    quest: '任务物品'
  });

  const NAMES = {
    copperOre: '铜矿石',
    tinOre: '锡矿石',
    ironOre: '铁矿石',
    silverOre: '银矿石',
    goldOre: '金矿石',
    mithrilOre: '秘银矿',
    adamantOre: '精金矿',
    jadeShard: '灵玉矿',
    darkIronOre: '玄铁矿',
    crystalOre: '玄晶矿',
    topaz: '黄玉',
    sapphire: '蓝宝',
    ruby: '红宝',
    emerald: '翠玉',
    diamond: '金钻',
    darkCrystal: '暗晶',
    willowWood: '杨柳木',
    pineWood: '松木',
    peachWood: '桃木',
    nanmuWood: '楠木',
    phoenixWood: '梧桐木',
    spiritWood: '灵木',
    thunderWood: '雷击木',
    bloodSandalwood: '血檀',
    ancientWood: '古木',
    millenniumVine: '千年藤',
    resin: '树脂',
    birdNest: '鸟巢',
    spiritPeach: '灵桃',
    spiritFruit: '灵果',
    spiritEgg: '灵禽蛋',
    spiritWormSilk: '灵虫丝',
    beastHide: '兽皮',
    thunderHerb: '雷灵草',
    bloodHerb: '血灵草',
    spiritCarp: '灵鲤',
    spiritShrimp: '灵虾',
    silverTrout: '银鳟',
    greenBass: '青鲈',
    darkCatfish: '玄鲶',
    sunsetSalmon: '霞鲑',
    thunderEel: '雷鳗',
    spiritLobster: '灵龙虾',
    swordfish: '剑鱼',
    dragonFish: '龙鱼',
    lingzhi: '灵芝',
    spiritMushroom: '灵菇',
    skySilk: '天蚕丝',
    ironhideGrass: '铁皮草',
    dragonSalivaGrass: '龙涎草',
    moonSpiritGrass: '月灵草',
    starGrass: '星辰草',
    bloodSpiritGrass: '血灵草',
    thunderSpiritGrass: '雷灵草',
    goldenLingzhi: '金芝',
    qiGatheringGrass: '聚气草',
    heartClearGrass: '清心草',
    spiritHoney: '灵蜜',
    spiritRice: '灵米',
    bloodGinsengFruit: '血参果',
    oldGinseng: '老山参',
    commonSeed: '凡灵种',
    fineSeed: '上品灵种',
    rareSeed: '极品灵种',
    lingshi: '灵石',
    fishBox: '鱼宝箱',
    healingPill: '疗伤丹',
    qiGatheringPill: '聚气丹',
    foundationPill: '筑基丹',
    goldCorePill: '结金丹',
    nascentSoulPill: '化婴丹',
    spiritTransformationPill: '化神丹',
    voidRefiningPill: '炼虚丹',
    bodyIntegrationPill: '合体丹',
    mahayanaPill: '大乘丹',
    copperSword: '赤铜剑',
    ironSword: '玄铁剑',
    silverArmor: '银鳞甲',
    spiritStaff: '灵木杖',
    darkIronBlade: '玄铁刃',
    formationBase: '阵基',
    grilledCarp: '烤灵鲤',
    shrimpSoup: '灵虾汤',
    spiritRiceMeal: '灵米饭',
    troutFeast: '银鳟宴',
    lobsterBanquet: '灵龙虾宴',
    dragonFishBanquet: '龙鱼宴',
    beastFeed: '灵兽口粮',
    talismanPaper: '空白符纸',
    gatheringTalisman: '采灵符',
    hasteTalisman: '疾行符',
    wardTalisman: '护身符',
    healingTalisman: '回春符',
    beastLureTalisman: '引兽符',
    gatheringFormation: '聚材阵',
    farmlandFormation: '丰壤阵',
    fishingFormation: '回澜阵',
    craftingFormation: '百工阵',
    beastFormation: '御灵阵',
    cloudwoodSword: '云木剑',
    cloudRobe: '流云袍',
    breathJade: '聚气玉',
    blackIronSword: '玄铁灵剑',
    stoneguardArmor: '镇石甲',
    foundationSeal: '筑基印',
    scarletCoreBlade: '赤丹刃',
    sunscaleArmor: '日鳞甲',
    corePendant: '金丹坠',
    soulCallingStaff: '唤魂杖',
    mistweaveRobe: '雾织袍',
    infantSoulPearl: '元婴珠',
    thunderSword: '雷霆剑',
    lightningArmor: '闪雷甲',
    spiritMirror: '化神镜',
    voidBlade: '虚空刃',
    riftRobe: '裂隙袍',
    voidRing: '虚空戒',
    starforgedSpear: '星铸枪',
    unityArmor: '归一甲',
    bodySeal: '合体印',
    abyssSword: '天渊剑',
    mahayanaRobe: '大乘法袍',
    daoPendant: '万法坠',
    ascensionBlade: '飞升刃',
    heavenlyRobe: '天劫仙衣',
    immortalJade: '登仙玉',
    'techniqueBook:stoneBreakingFist': '碎石拳秘卷',
    'techniqueBook:returningWindSlash': '回风斩秘卷',
    'techniqueBook:gatheringBreath': '小周天吐纳术秘卷',
    'techniqueBook:clearHeartArt': '回春术秘卷',
    'techniqueBook:bodyBarrier': '护体罡气秘卷',
    'techniqueBook:flowingFirePalm': '流火掌秘卷',
    'techniqueBook:spiritNeedle': '破甲指秘卷',
    'techniqueBook:bindingTalisman': '缚灵术秘卷',
    'techniqueBook:cloudPiercingSword': '穿云破岳剑秘卷',
    'techniqueBook:returningWaveSword': '回风叠浪剑秘卷',
    'techniqueBook:stopBleedArt': '止血回元术秘卷',
    'techniqueBook:boneCorrosionNeedle': '腐骨针秘卷',
    'techniqueBook:spiritArmorArray': '灵甲符阵秘卷',
    'techniqueBook:flameThunderArray': '炎雷阵秘卷',
    'techniqueBook:beastWard': '灵契护主秘卷',
    'techniqueBook:beastCommandRoar': '裂阵兽吼秘卷',
    'techniqueBook:calmingMelody': '宁神曲秘卷',
    'techniqueBook:crescentSoundBlade': '弦月音刃秘卷',
    'techniqueBook:heartLink': '同心引秘卷',
    'techniqueBook:confusingGaze': '迷心眸秘卷',
    'techniqueBook:steadyBreath': '稳息心法秘卷',
    'techniqueBook:ironBody': '铁身功秘卷',
    'techniqueBook:sharpEye': '明目诀秘卷',
    'techniqueBook:swiftShadow': '疾影诀秘卷',
    'techniqueBook:nurtureEssence': '养元诀秘卷',
    'techniqueBook:battleHeart': '百战心法秘卷',
    'techniqueBook:swordHeart': '剑骨铮鸣秘卷',
    'techniqueBook:medicalMind': '岐黄心法秘卷',
    'techniqueBook:earthArrayHeart': '坤元阵心秘卷',
    'techniqueBook:sharedFateBond': '同命灵契秘卷',
    'techniqueBook:clearMindScore': '澄心谱秘卷',
    'techniqueBook:knowingIntent': '知意诀秘卷',
    'techniqueBook:thunderSeal': '惊雷印秘卷',
    'techniqueBook:clearTruthArt': '清心还真诀秘卷',
    'techniqueBook:eightDirectionsSword': '八方落剑诀秘卷',
    'techniqueBook:blackTortoiseWard': '玄龟镇岳诀秘卷',
    'techniqueBook:hiddenEdge': '藏锋诀秘卷',
    'techniqueBook:heartGuardArt': '护心诀秘卷',
    'techniqueBook:endlessCycleArt': '周天不息法秘卷',
    'techniqueBook:lastStandArt': '绝处逢生诀秘卷',
    'techniqueBook:supremeMysticSword': '太玄一剑秘卷',
    'techniqueBook:flowingLightThirteen': '流光十三式秘卷',
    'techniqueBook:flyingSwordChase': '飞剑逐影秘卷',
    'techniqueBook:myriadSwordsSky': '万剑凌霄秘卷',
    'techniqueBook:endlessSwordHeart': '无间剑心秘卷',
    'techniqueBook:swordReturnOrigin': '御剑归元秘卷',
    'techniqueBook:clearSpringArt': '清心回春诀秘卷',
    'techniqueBook:bonePoisonMist': '腐骨毒雾秘卷',
    'techniqueBook:woodVitalityArt': '青木护生诀秘卷',
    'techniqueBook:witheredSpring': '枯木逢春秘卷',
    'techniqueBook:myriadPoisonTrue': '万毒真解秘卷',
    'techniqueBook:woodSharedLife': '草木同生秘卷',
    'techniqueBook:fourSymbolsWard': '四象护阵秘卷',
    'techniqueBook:starfallArray': '星落杀阵秘卷',
    'techniqueBook:spiritLockMechanism': '锁灵机关秘卷',
    'techniqueBook:heavenlyNetLock': '天罗锁灵机秘卷',
    'techniqueBook:heavenlyCalculation': '天机演算秘卷',
    'techniqueBook:mechanismMastery': '机括精研秘卷',
    'techniqueBook:lifeFeedback': '生息反哺秘卷',
    'techniqueBook:beastEcho': '灵兽回响秘卷',
    'techniqueBook:beastWarSpirit': '兽群战意秘卷',
    'techniqueBook:hundredBeastRush': '百兽奔袭秘卷',
    'techniqueBook:spiritCompanion': '御灵真诀秘卷',
    'techniqueBook:myriadBeastHeart': '万兽灵心秘卷',
    'techniqueBook:purifyingMelody': '涤尘清音秘卷',
    'techniqueBook:tearingSevenStrings': '裂帛七弦秘卷',
    'techniqueBook:springRiverHarmony': '春江和鸣秘卷',
    'techniqueBook:highMountainsFlowingWater': '高山流水秘卷',
    'techniqueBook:killingToneBone': '杀音入骨秘卷',
    'techniqueBook:lingeringSound': '余音绕梁秘卷',
    'techniqueBook:spiritResonance': '灵犀相契秘卷',
    'techniqueBook:drunkenRedDust': '醉红尘秘卷',
    'techniqueBook:longSleeveDance': '长袖善舞秘卷',
    'techniqueBook:allBeingsFavor': '众生倾意秘卷',
    'techniqueBook:confusingHeartTrue': '惑心真解秘卷',
    'techniqueBook:redDustMirror': '红尘心鉴秘卷',
    'techniqueBook:pillGuard': '丹护心诀秘卷',
    'techniqueBook:returningWindSlash': '回风斩秘卷',
    'techniqueBook:gatheringBreath': '小周天吐纳术秘卷',
    'techniqueBook:clearHeartArt': '回春术秘卷',
    'techniqueBook:bodyBarrier': '护体罡气秘卷',
    'techniqueBook:flowingFirePalm': '流火掌秘卷',
    'techniqueBook:spiritNeedle': '破甲指秘卷',
    'techniqueBook:bindingTalisman': '缚灵术秘卷',
    'techniqueBook:cloudPiercingSword': '穿云破岳剑秘卷',
    'techniqueBook:returningWaveSword': '回风叠浪剑秘卷',
    'techniqueBook:stopBleedArt': '止血回元术秘卷',
    'techniqueBook:boneCorrosionNeedle': '腐骨针秘卷',
    'techniqueBook:spiritArmorArray': '灵甲符阵秘卷',
    'techniqueBook:flameThunderArray': '炎雷阵秘卷',
    'techniqueBook:beastWard': '灵契护主秘卷',
    'techniqueBook:beastCommandRoar': '裂阵兽吼秘卷',
    'techniqueBook:calmingMelody': '宁神曲秘卷',
    'techniqueBook:crescentSoundBlade': '弦月音刃秘卷',
    'techniqueBook:heartLink': '同心引秘卷',
    'techniqueBook:confusingGaze': '迷心眸秘卷',
    'techniqueBook:steadyBreath': '稳息心法秘卷',
    'techniqueBook:ironBody': '铁身功秘卷',
    'techniqueBook:sharpEye': '明目诀秘卷',
    'techniqueBook:swiftShadow': '疾影诀秘卷',
    'techniqueBook:nurtureEssence': '养元诀秘卷',
    'techniqueBook:battleHeart': '百战心法秘卷',
    'techniqueBook:swordHeart': '剑骨铮鸣秘卷',
    'techniqueBook:medicalMind': '岐黄心法秘卷',
    'techniqueBook:earthArrayHeart': '坤元阵心秘卷',
    'techniqueBook:sharedFateBond': '同命灵契秘卷',
    'techniqueBook:clearMindScore': '澄心谱秘卷',
    'techniqueBook:knowingIntent': '知意诀秘卷',
    'techniqueBook:thunderSeal': '惊雷印秘卷',
    'techniqueBook:beastEcho': '灵兽回响秘卷',
    'techniqueBook:starfallArray': '星落杀阵秘卷',
    'techniqueBook:pillGuard': '丹护心诀秘卷',
    'techniqueBook:spiritCompanion': '灵契心经秘卷',
    herbBundle: '散装药材',
    oreBundle: '散装灵矿',
    woodBundle: '散装木料',
    foodBundle: '散装食材'
  };

  const STAGE3_EQUIPMENT = {
    cloudwoodSword: { tier: 1, slot: 'weapon' },
    cloudRobe: { tier: 1, slot: 'armor' },
    breathJade: { tier: 1, slot: 'accessory' },
    blackIronSword: { tier: 2, slot: 'weapon' },
    stoneguardArmor: { tier: 2, slot: 'armor' },
    foundationSeal: { tier: 2, slot: 'accessory' },
    scarletCoreBlade: { tier: 3, slot: 'weapon' },
    sunscaleArmor: { tier: 3, slot: 'armor' },
    corePendant: { tier: 3, slot: 'accessory' },
    soulCallingStaff: { tier: 4, slot: 'weapon' },
    mistweaveRobe: { tier: 4, slot: 'armor' },
    infantSoulPearl: { tier: 4, slot: 'accessory' },
    thunderSword: { tier: 5, slot: 'weapon' },
    lightningArmor: { tier: 5, slot: 'armor' },
    spiritMirror: { tier: 5, slot: 'accessory' },
    voidBlade: { tier: 6, slot: 'weapon' },
    riftRobe: { tier: 6, slot: 'armor' },
    voidRing: { tier: 6, slot: 'accessory' },
    starforgedSpear: { tier: 7, slot: 'weapon' },
    unityArmor: { tier: 7, slot: 'armor' },
    bodySeal: { tier: 7, slot: 'accessory' },
    abyssSword: { tier: 8, slot: 'weapon' },
    mahayanaRobe: { tier: 8, slot: 'armor' },
    daoPendant: { tier: 8, slot: 'accessory' },
    ascensionBlade: { tier: 9, slot: 'weapon' },
    heavenlyRobe: { tier: 9, slot: 'armor' },
    immortalJade: { tier: 9, slot: 'accessory' }
  };

  const TECHNIQUE_BOOKS = {
    'techniqueBook:stoneBreakingFist': 'stoneBreakingFist',
    'techniqueBook:returningWindSlash': 'returningWindSlash',
    'techniqueBook:gatheringBreath': 'gatheringBreath',
    'techniqueBook:clearHeartArt': 'clearHeartArt',
    'techniqueBook:bodyBarrier': 'bodyBarrier',
    'techniqueBook:flowingFirePalm': 'flowingFirePalm',
    'techniqueBook:spiritNeedle': 'spiritNeedle',
    'techniqueBook:bindingTalisman': 'bindingTalisman',
    'techniqueBook:cloudPiercingSword': 'cloudPiercingSword',
    'techniqueBook:returningWaveSword': 'returningWaveSword',
    'techniqueBook:stopBleedArt': 'stopBleedArt',
    'techniqueBook:boneCorrosionNeedle': 'boneCorrosionNeedle',
    'techniqueBook:spiritArmorArray': 'spiritArmorArray',
    'techniqueBook:flameThunderArray': 'flameThunderArray',
    'techniqueBook:beastWard': 'beastWard',
    'techniqueBook:beastCommandRoar': 'beastCommandRoar',
    'techniqueBook:calmingMelody': 'calmingMelody',
    'techniqueBook:crescentSoundBlade': 'crescentSoundBlade',
    'techniqueBook:heartLink': 'heartLink',
    'techniqueBook:confusingGaze': 'confusingGaze',
    'techniqueBook:steadyBreath': 'steadyBreath',
    'techniqueBook:ironBody': 'ironBody',
    'techniqueBook:sharpEye': 'sharpEye',
    'techniqueBook:swiftShadow': 'swiftShadow',
    'techniqueBook:nurtureEssence': 'nurtureEssence',
    'techniqueBook:battleHeart': 'battleHeart',
    'techniqueBook:swordHeart': 'swordHeart',
    'techniqueBook:medicalMind': 'medicalMind',
    'techniqueBook:earthArrayHeart': 'earthArrayHeart',
    'techniqueBook:sharedFateBond': 'sharedFateBond',
    'techniqueBook:clearMindScore': 'clearMindScore',
    'techniqueBook:knowingIntent': 'knowingIntent',
    'techniqueBook:thunderSeal': 'thunderSeal',
    'techniqueBook:clearTruthArt': 'clearTruthArt',
    'techniqueBook:eightDirectionsSword': 'eightDirectionsSword',
    'techniqueBook:blackTortoiseWard': 'blackTortoiseWard',
    'techniqueBook:hiddenEdge': 'hiddenEdge',
    'techniqueBook:heartGuardArt': 'heartGuardArt',
    'techniqueBook:endlessCycleArt': 'endlessCycleArt',
    'techniqueBook:lastStandArt': 'lastStandArt',
    'techniqueBook:supremeMysticSword': 'supremeMysticSword',
    'techniqueBook:flowingLightThirteen': 'flowingLightThirteen',
    'techniqueBook:flyingSwordChase': 'flyingSwordChase',
    'techniqueBook:myriadSwordsSky': 'myriadSwordsSky',
    'techniqueBook:endlessSwordHeart': 'endlessSwordHeart',
    'techniqueBook:swordReturnOrigin': 'swordReturnOrigin',
    'techniqueBook:clearSpringArt': 'clearSpringArt',
    'techniqueBook:bonePoisonMist': 'bonePoisonMist',
    'techniqueBook:woodVitalityArt': 'woodVitalityArt',
    'techniqueBook:witheredSpring': 'witheredSpring',
    'techniqueBook:myriadPoisonTrue': 'myriadPoisonTrue',
    'techniqueBook:woodSharedLife': 'woodSharedLife',
    'techniqueBook:fourSymbolsWard': 'fourSymbolsWard',
    'techniqueBook:starfallArray': 'starfallArray',
    'techniqueBook:spiritLockMechanism': 'spiritLockMechanism',
    'techniqueBook:heavenlyNetLock': 'heavenlyNetLock',
    'techniqueBook:heavenlyCalculation': 'heavenlyCalculation',
    'techniqueBook:mechanismMastery': 'mechanismMastery',
    'techniqueBook:lifeFeedback': 'lifeFeedback',
    'techniqueBook:beastEcho': 'beastEcho',
    'techniqueBook:beastWarSpirit': 'beastWarSpirit',
    'techniqueBook:hundredBeastRush': 'hundredBeastRush',
    'techniqueBook:spiritCompanion': 'spiritCompanion',
    'techniqueBook:myriadBeastHeart': 'myriadBeastHeart',
    'techniqueBook:purifyingMelody': 'purifyingMelody',
    'techniqueBook:tearingSevenStrings': 'tearingSevenStrings',
    'techniqueBook:springRiverHarmony': 'springRiverHarmony',
    'techniqueBook:highMountainsFlowingWater': 'highMountainsFlowingWater',
    'techniqueBook:killingToneBone': 'killingToneBone',
    'techniqueBook:lingeringSound': 'lingeringSound',
    'techniqueBook:spiritResonance': 'spiritResonance',
    'techniqueBook:drunkenRedDust': 'drunkenRedDust',
    'techniqueBook:longSleeveDance': 'longSleeveDance',
    'techniqueBook:allBeingsFavor': 'allBeingsFavor',
    'techniqueBook:confusingHeartTrue': 'confusingHeartTrue',
    'techniqueBook:redDustMirror': 'redDustMirror',
    'techniqueBook:pillGuard': 'pillGuard'
  };

  const EQUIPMENT_IDS = new Set([
    'copperSword', 'ironSword', 'silverArmor', 'spiritStaff', 'darkIronBlade',
    'gatheringFormation', 'farmlandFormation', 'fishingFormation',
    'craftingFormation', 'beastFormation'
  ].concat(Object.keys(STAGE3_EQUIPMENT)));

  const TECHNIQUE_BOOK_IDS = new Set([
    ...Object.keys(TECHNIQUE_BOOKS)
  ]);

  const CONSUMABLE_IDS = new Set([
    'healingPill', 'qiGatheringPill', 'foundationPill', 'goldCorePill',
    'nascentSoulPill', 'spiritTransformationPill', 'voidRefiningPill',
    'bodyIntegrationPill', 'mahayanaPill',
    'grilledCarp', 'shrimpSoup', 'spiritRiceMeal', 'troutFeast',
    'lobsterBanquet', 'dragonFishBanquet', 'beastFeed',
    'talismanPaper', 'gatheringTalisman', 'hasteTalisman',
    'wardTalisman', 'healingTalisman', 'beastLureTalisman'
  ]);

  const LEGACY_PROTOTYPE_IDS = deepFreeze([
    'healingPill', 'qiGatheringPill', 'foundationPill', 'goldCorePill',
    'nascentSoulPill', 'spiritTransformationPill', 'voidRefiningPill',
    'bodyIntegrationPill', 'mahayanaPill',
    'shrimpSoup',
    'talismanPaper', 'gatheringTalisman', 'hasteTalisman',
    'wardTalisman', 'healingTalisman', 'beastLureTalisman'
  ]);
  const LEGACY_PROTOTYPE_ID_SET = new Set(LEGACY_PROTOTYPE_IDS);

  const SALE_VALUES = {
    material: 1,
    equipment: 10,
    consumable: 5,
    technique: 20
  };

  const stage3ItemIds = new Set(
    Object.keys(STAGE3_EQUIPMENT).concat(Object.keys(TECHNIQUE_BOOKS))
  );
  const orderedItemIds = Object.keys(NAMES)
    .filter(function (id) { return !stage3ItemIds.has(id); })
    .concat(Object.keys(STAGE3_EQUIPMENT), Object.keys(TECHNIQUE_BOOKS))
    .concat(MATERIAL_ITEM_ROWS
      .map(function (row) { return row.id; })
      .filter(function (id) { return !NAMES[id]; }));

  // ── 背包 UI 资源：图标先用 emoji，后期可整体替换为矢量 SVG ──
  const CATEGORY_ICON = {
    material: '📦',
    equipment: '🗡️',
    consumable: '🧪',
    technique: '📕',
    quest: '🎯'
  };
  const CATEGORY_DESC = {
    material: '修行与炼制所需的原材料，可出售换灵石，亦用于采集与生产。',
    equipment: '可装备于战斗方案，提升战力。',
    consumable: '消耗品，使用可恢复或增益，亦可在战斗/突破中发挥作用。',
    technique: '功法秘卷，研读可领悟对应功法。',
    quest: '与任务相关的物品。'
  };
  // ── 物品品质（六阶：白·绿·蓝·紫·橙·红）──
  const QUALITY = deepFreeze({
    white:  { label: '普通', color: '#9A93AD' },
    green:  { label: '精良', color: '#3F9E6B' },
    blue:   { label: '稀有', color: '#3F7FD0' },
    purple: { label: '史诗', color: '#9B5FD0' },
    orange: { label: '传说', color: '#E0852B' },
    red:    { label: '神话', color: '#E8506B' }
  });
  const CATEGORY_QUALITY = {
    material: 'white',
    equipment: 'blue',
    consumable: 'green',
    technique: 'purple',
    quest: 'white'
  };
  function qualityByTier(tier) {
    const t = Number(tier) || 1;
    if (t >= 6) return 'red';
    if (t === 5) return 'orange';
    if (t >= 3) return 'purple';
    return 'blue';
  }
  const ITEM_ICON = {
    // 矿石 / 宝石
    copperOre: '🪨', tinOre: '🪨', ironOre: '🪨', silverOre: '🪙', goldOre: '🪙',
    mithrilOre: '🪨', adamantOre: '🪨', jadeShard: '💎', darkIronOre: '🪨', crystalOre: '💎',
    topaz: '💛', sapphire: '💙', ruby: '❤️', emerald: '💚', diamond: '💎', darkCrystal: '🟣',
    // 木材 / 灵藤
    willowWood: '🪵', pineWood: '🪵', peachWood: '🪵', nanmuWood: '🪵', phoenixWood: '🪵',
    spiritWood: '🌳', thunderWood: '🪵', bloodSandalwood: '🪵', ancientWood: '🪵', millenniumVine: '🌿',
    // 灵草 / 灵植 / 灵禽 / 灵产
    thunderHerb: '🌿', bloodHerb: '🌿', ironhideGrass: '🌿', dragonSalivaGrass: '🌿',
    moonSpiritGrass: '🌿', starGrass: '🌿', bloodSpiritGrass: '🌿', thunderSpiritGrass: '🌿',
    goldenLingzhi: '🍄', qiGatheringGrass: '🌿', heartClearGrass: '🌿', lingzhi: '🍄',
    spiritMushroom: '🍄', skySilk: '🧵', resin: '🟤', birdNest: '🪺', spiritPeach: '🍑',
    spiritFruit: '🍎', spiritEgg: '🥚', spiritWormSilk: '🧵', beastHide: '🟫',
    spiritHoney: '🍯', spiritRice: '🌾', bloodGinsengFruit: '🍓', oldGinseng: '🌿',
    // 水产
    spiritCarp: '🐟', spiritShrimp: '🦐', silverTrout: '🐟', greenBass: '🐟', darkCatfish: '🐟',
    sunsetSalmon: '🐟', thunderEel: '🐡', spiritLobster: '🦞', swordfish: '🐟', dragonFish: '🐉',
    // 种子 / 货币 / 箱 / 散装
    commonSeed: '🌱', fineSeed: '🌱', rareSeed: '🌟', lingshi: '💠', fishBox: '📦',
    herbBundle: '📦', oreBundle: '📦', woodBundle: '📦', foodBundle: '📦',
    // 丹药
    healingPill: '💊', qiGatheringPill: '💊', foundationPill: '💊', goldCorePill: '💊',
    nascentSoulPill: '💊', spiritTransformationPill: '💊', voidRefiningPill: '💊',
    bodyIntegrationPill: '💊', mahayanaPill: '💊',
    // 装备（旧）
    copperSword: '⚔️', ironSword: '⚔️', silverArmor: '🛡️', spiritStaff: '🪄', darkIronBlade: '⚔️',
    formationBase: '🔯',
    // 食物
    grilledCarp: '🍢', shrimpSoup: '🍲', spiritRiceMeal: '🍚', troutFeast: '🍱',
    lobsterBanquet: '🦞', dragonFishBanquet: '🐉', beastFeed: '🌰',
    // 符纸 / 符箓
    talismanPaper: '📜', gatheringTalisman: '📜', hasteTalisman: '📜', wardTalisman: '📜',
    healingTalisman: '📜', beastLureTalisman: '📜',
    // 阵法
    gatheringFormation: '🔯', farmlandFormation: '🔯', fishingFormation: '🔯',
    craftingFormation: '🔯', beastFormation: '🔯',
    // 装备（stage3）
    cloudwoodSword: '⚔️', cloudRobe: '🥋', breathJade: '💍', blackIronSword: '⚔️',
    stoneguardArmor: '🛡️', foundationSeal: '🔮', scarletCoreBlade: '⚔️', sunscaleArmor: '🛡️',
    corePendant: '💍', soulCallingStaff: '🪄', mistweaveRobe: '🥋', infantSoulPearl: '🔮',
    thunderSword: '⚔️', lightningArmor: '🛡️', spiritMirror: '🪞', voidBlade: '🗡️',
    riftRobe: '🥋', voidRing: '💍', starforgedSpear: '🔱', unityArmor: '🛡️',
    bodySeal: '🔮', abyssSword: '⚔️', mahayanaRobe: '🥋', daoPendant: '💍',
    ascensionBlade: '🗡️', heavenlyRobe: '🥋', immortalJade: '💍',
    // 功法书
    'techniqueBook:stoneBreakingFist': '📕',
    'techniqueBook:returningWindSlash': '📕',
    'techniqueBook:gatheringBreath': '📕',
    'techniqueBook:clearHeartArt': '📕',
    'techniqueBook:bodyBarrier': '📕',
    'techniqueBook:flowingFirePalm': '📕',
    'techniqueBook:spiritNeedle': '📕',
    'techniqueBook:bindingTalisman': '📕',
    'techniqueBook:cloudPiercingSword': '📕',
    'techniqueBook:returningWaveSword': '📕',
    'techniqueBook:stopBleedArt': '📕',
    'techniqueBook:boneCorrosionNeedle': '📕',
    'techniqueBook:spiritArmorArray': '📕',
    'techniqueBook:flameThunderArray': '📕',
    'techniqueBook:beastWard': '📕',
    'techniqueBook:beastCommandRoar': '📕',
    'techniqueBook:calmingMelody': '📕',
    'techniqueBook:crescentSoundBlade': '📕',
    'techniqueBook:heartLink': '📕',
    'techniqueBook:confusingGaze': '📕',
    'techniqueBook:steadyBreath': '📕',
    'techniqueBook:ironBody': '📕',
    'techniqueBook:sharpEye': '📕',
    'techniqueBook:swiftShadow': '📕',
    'techniqueBook:nurtureEssence': '📕',
    'techniqueBook:battleHeart': '📕',
    'techniqueBook:swordHeart': '📕',
    'techniqueBook:medicalMind': '📕',
    'techniqueBook:earthArrayHeart': '📕',
    'techniqueBook:sharedFateBond': '📕',
    'techniqueBook:clearMindScore': '📕',
    'techniqueBook:knowingIntent': '📕',
    'techniqueBook:thunderSeal': '📕',
    'techniqueBook:clearTruthArt': '📕',
    'techniqueBook:eightDirectionsSword': '📕',
    'techniqueBook:blackTortoiseWard': '📕',
    'techniqueBook:hiddenEdge': '📕',
    'techniqueBook:heartGuardArt': '📕',
    'techniqueBook:endlessCycleArt': '📕',
    'techniqueBook:lastStandArt': '📕',
    'techniqueBook:supremeMysticSword': '📕',
    'techniqueBook:flowingLightThirteen': '📕',
    'techniqueBook:flyingSwordChase': '📕',
    'techniqueBook:myriadSwordsSky': '📕',
    'techniqueBook:endlessSwordHeart': '📕',
    'techniqueBook:swordReturnOrigin': '📕',
    'techniqueBook:clearSpringArt': '📕',
    'techniqueBook:bonePoisonMist': '📕',
    'techniqueBook:woodVitalityArt': '📕',
    'techniqueBook:witheredSpring': '📕',
    'techniqueBook:myriadPoisonTrue': '📕',
    'techniqueBook:woodSharedLife': '📕',
    'techniqueBook:fourSymbolsWard': '📕',
    'techniqueBook:starfallArray': '📕',
    'techniqueBook:spiritLockMechanism': '📕',
    'techniqueBook:heavenlyNetLock': '📕',
    'techniqueBook:heavenlyCalculation': '📕',
    'techniqueBook:mechanismMastery': '📕',
    'techniqueBook:lifeFeedback': '📕',
    'techniqueBook:beastEcho': '📕',
    'techniqueBook:beastWarSpirit': '📕',
    'techniqueBook:hundredBeastRush': '📕',
    'techniqueBook:spiritCompanion': '📕',
    'techniqueBook:myriadBeastHeart': '📕',
    'techniqueBook:purifyingMelody': '📕',
    'techniqueBook:tearingSevenStrings': '📕',
    'techniqueBook:springRiverHarmony': '📕',
    'techniqueBook:highMountainsFlowingWater': '📕',
    'techniqueBook:killingToneBone': '📕',
    'techniqueBook:lingeringSound': '📕',
    'techniqueBook:spiritResonance': '📕',
    'techniqueBook:drunkenRedDust': '📕',
    'techniqueBook:longSleeveDance': '📕',
    'techniqueBook:allBeingsFavor': '📕',
    'techniqueBook:confusingHeartTrue': '📕',
    'techniqueBook:redDustMirror': '📕',
    'techniqueBook:pillGuard': '📕', 'techniqueBook:returningWindSlash': '📕',
    'techniqueBook:gatheringBreath': '📕', 'techniqueBook:clearHeartArt': '📕',
    'techniqueBook:bodyBarrier': '📕', 'techniqueBook:flowingFirePalm': '📕',
    'techniqueBook:spiritNeedle': '📕', 'techniqueBook:bindingTalisman': '📕',
    'techniqueBook:cloudPiercingSword': '📕', 'techniqueBook:returningWaveSword': '📕',
    'techniqueBook:stopBleedArt': '📕', 'techniqueBook:boneCorrosionNeedle': '📕',
    'techniqueBook:spiritArmorArray': '📕', 'techniqueBook:flameThunderArray': '📕',
    'techniqueBook:beastWard': '📕', 'techniqueBook:beastCommandRoar': '📕',
    'techniqueBook:calmingMelody': '📕', 'techniqueBook:crescentSoundBlade': '📕',
    'techniqueBook:heartLink': '📕', 'techniqueBook:confusingGaze': '📕',
    'techniqueBook:steadyBreath': '📕', 'techniqueBook:ironBody': '📕',
    'techniqueBook:sharpEye': '📕', 'techniqueBook:swiftShadow': '📕',
    'techniqueBook:nurtureEssence': '📕', 'techniqueBook:battleHeart': '📕',
    'techniqueBook:swordHeart': '📕', 'techniqueBook:medicalMind': '📕',
    'techniqueBook:earthArrayHeart': '📕', 'techniqueBook:sharedFateBond': '📕',
    'techniqueBook:clearMindScore': '📕', 'techniqueBook:knowingIntent': '📕',
    'techniqueBook:thunderSeal': '📕', 'techniqueBook:beastEcho': '📕',
    'techniqueBook:starfallArray': '📕', 'techniqueBook:pillGuard': '📕',
    'techniqueBook:spiritCompanion': '📕'
  };
  const ITEM_DESC = {
    lingshi: '修真界通行货币，用于交易与突破辅助。',
    healingPill: '疗伤丹，可治疗重伤、恢复气血。',
    qiGatheringPill: '聚气丹，修炼时服用可增益修为。',
    foundationPill: '筑基丹，筑基期突破的关键丹药。',
    goldCorePill: '结金丹，金丹期突破所需。',
    nascentSoulPill: '化婴丹，元婴期突破所需。',
    spiritTransformationPill: '化神丹，化神期突破所需。',
    voidRefiningPill: '炼虚丹，炼虚期突破所需。',
    bodyIntegrationPill: '合体丹，合体期突破所需。',
    mahayanaPill: '大乘丹，大乘期突破所需。',
    grilledCarp: '烤灵鲤，食用可恢复状态。',
    shrimpSoup: '灵虾汤，食用可恢复状态。',
    spiritRiceMeal: '灵米饭，食用可恢复状态。',
    troutFeast: '银鳟宴，食用可恢复状态。',
    lobsterBanquet: '灵龙虾宴，食用可恢复状态。',
    dragonFishBanquet: '龙鱼宴，食用可恢复状态。',
    beastFeed: '灵兽口粮，用于驯养灵兽。',
    talismanPaper: '空白符纸，可绘制各类符箓。',
    gatheringTalisman: '采灵符，采集时提供增益。',
    hasteTalisman: '疾行符，行动时提供加速。',
    wardTalisman: '护身符，提供守护。',
    healingTalisman: '回春符，提供恢复。',
    beastLureTalisman: '引兽符，驯兽时吸引灵兽。',
    gatheringFormation: '聚材阵，布置于采集场景增益产出。',
    farmlandFormation: '丰壤阵，布置于灵田增益种植。',
    fishingFormation: '回澜阵，布置于水域增益钓鱼。',
    craftingFormation: '百工阵，布置于工坊增益炼制。',
    beastFormation: '御灵阵，布置于兽栏增益驯养。',
    formationBase: '阵基，布置阵法所需的核心材料。'
  };

  const records = {};
  orderedItemIds.forEach(function (id) {
    const materialRow = MATERIAL_ITEMS_BY_ID[id] || null;
    const artRow = ITEM_ART_CONTENT &&
      typeof ITEM_ART_CONTENT.get === 'function'
      ? ITEM_ART_CONTENT.get(id)
      : null;
    const category = materialRow && materialRow.category
      ? materialRow.category
      : EQUIPMENT_IDS.has(id)
      ? 'equipment'
      : TECHNIQUE_BOOK_IDS.has(id) ? 'technique'
      : CONSUMABLE_IDS.has(id) ? 'consumable' : 'material';
    records[id] = {
      id: id,
      name: materialRow && materialRow.name ? materialRow.name : NAMES[id],
      category: category,
      sellValue: SALE_VALUES[category],
      stackable: !materialRow || materialRow.stackable !== false,
      icon: materialRow && materialRow.icon
        ? materialRow.icon
        : ITEM_ICON[id] || CATEGORY_ICON[category],
      description: materialRow && materialRow.description
        ? materialRow.description
        : ITEM_DESC[id] || CATEGORY_DESC[category],
      quality: materialRow && materialRow.quality
        ? materialRow.quality
        : STAGE3_EQUIPMENT[id]
        ? qualityByTier(STAGE3_EQUIPMENT[id].tier)
        : CATEGORY_QUALITY[category]
    };
    if (artRow) {
      records[id].iconSrc = artRow.icon50 || artRow.icon100 || '';
      records[id].iconSrc50 = artRow.icon50 || artRow.icon100 || '';
      records[id].iconSrc100 = artRow.icon100 || artRow.icon50 || '';
    }
    if (STAGE3_EQUIPMENT[id]) {
      records[id].tier = STAGE3_EQUIPMENT[id].tier;
      records[id].equipmentSlot = STAGE3_EQUIPMENT[id].slot;
    }
    if (TECHNIQUE_BOOKS[id]) {
      records[id].techniqueId = TECHNIQUE_BOOKS[id];
    }
    if (materialRow) {
      [
        'tier', 'materialType', 'visualFamily', 'iconPromptKey',
        'artPrompt', 'artPriority', 'sourceTags', 'useTags',
        'melvorName', 'potionTier', 'charges', 'melvor',
        'useAction', 'unlockFlag', 'heal'
      ].forEach(function (key) {
        if (materialRow[key] != null) records[id][key] = materialRow[key];
      });
      if (materialRow.equipmentSlot) {
        records[id].equipmentSlot = materialRow.equipmentSlot;
      }
    }
    if (LEGACY_PROTOTYPE_ID_SET.has(id)) {
      records[id].legacyDesign = true;
      records[id].designStatus = 'legacy_prototype';
    }
  });
  const ITEMS = deepFreeze(records);

  function get(itemId) {
    return ITEMS[itemId] || null;
  }

  function list(category) {
    const items = Object.values(ITEMS);
    return Object.freeze(category == null
      ? items.slice()
      : items.filter(function (item) { return item.category === category; }));
  }

  return Object.freeze({
    ITEMS: ITEMS,
    CATEGORIES: CATEGORIES,
    QUALITY: QUALITY,
    LEGACY_PROTOTYPE_IDS: LEGACY_PROTOTYPE_IDS,
    get: get,
    list: list
  });
});
