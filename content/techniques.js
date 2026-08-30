(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.TechniqueContent = api;
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

  function legacyFunctionTags(effect) {
    if (!effect || typeof effect !== 'object') return ['buff'];
    if (effect.type === 'heal') return effect.purge ? ['heal', 'cleanse'] : ['heal'];
    if (effect.type === 'restoreQi') return ['qiRestore'];
    if (effect.type === 'shield') return ['shield'];
    if (effect.type === 'aoeAttack') return ['damage'];
    if (effect.type === 'purge') return ['cleanse'];
    if (effect.type === 'guard') return ['guard'];
    if (effect.type === 'beastAttack') return ['damage'];
    if (effect.type === 'partyDamageBuff') return ['buff'];
    if (effect.supplyHealingBonus) return ['buff', 'heal'];
    if (effect.activeBeastEffectBonus) return ['buff'];
    if (effect.healPowerBonus) return ['buff', 'heal'];
    if (effect.shieldPowerBonus) return ['buff', 'shield'];
    if (effect.defensePercent || effect.maxQiPercent ||
        effect.attackIntervalReduction || effect.accuracyFlat ||
        effect.critChanceBonus || effect.incomingHealBonus ||
        effect.controlResistBonus || effect.maxHpPercent ||
        effect.selfAndBeastMaxHpPercent || effect.affinityTeamBonus) {
      return ['buff'];
    }
    if (effect.type === 'attack' && effect.status) return ['damage', 'control'];
    if (effect.type === 'attack') return ['damage'];
    return ['buff'];
  }

  function legacyStyleTags(tags) {
    const mapping = {
      fist: 'body',
      spirit: 'soul',
      healing: 'dan',
      qi: 'dan',
      movement: 'body',
      pill: 'dan',
      thunder: 'array',
      talisman: 'talisman',
      music: 'soul'
    };
    return (Array.isArray(tags) ? tags : []).map(function (tag) {
      return mapping[tag] || tag;
    }).filter(function (tag, index, list) {
      return list.indexOf(tag) === index;
    });
  }

  function legacyTargetRule(effect) {
    if (!effect) return 'self';
    if (effect.type === 'heal' || effect.type === 'restoreQi' ||
        effect.type === 'shield' || effect.type === 'purge' ||
        effect.type === 'guard' || effect.type === 'partyDamageBuff') {
      return 'self';
    }
    if (effect.type === 'aoeAttack') return 'allEnemies';
    return effect.type === 'attack' || effect.type === 'beastAttack'
      ? 'highestThreatEnemy'
      : 'self';
  }

  function define(records, id, name, kind, tier, tags, requiredRealmIndex,
    qiCost, cooldownTicks, effect, runeCost, functionTags, styleTags, targetRule) {
    records[id] = {
      id: id,
      name: name,
      kind: kind,
      tier: tier,
      tags: tags,
      functionTags: functionTags || legacyFunctionTags(effect),
      styleTags: styleTags || legacyStyleTags(tags),
      targetRule: targetRule || legacyTargetRule(effect),
      requiredRealmIndex: requiredRealmIndex,
      bookItemId: 'techniqueBook:' + id,
      qiCost: qiCost,
      cooldownTicks: cooldownTicks,
      effect: effect
    };
    if (runeCost && typeof runeCost === 'object') {
      records[id].runeCost = runeCost;
    }
  }

  const records = {};

  // ——— 验证池：无门派主动 ———
  define(records, 'stoneBreakingFist', '碎石拳', 'active', 1, ['fist'], 0,
    6, 12, { type: 'attack', multiplier: 1.25 });
  define(records, 'returningWindSlash', '回风斩', 'active', 1, ['sword'], 0,
    8, 16, { type: 'attack', hits: 2, multiplier: 0.7 });
  define(records, 'gatheringBreath', '小周天吐纳术', 'active', 1, ['qi'], 0,
    0, 48, { type: 'restoreQi', maxQiRatio: 0.2 });
  define(records, 'clearHeartArt', '回春术', 'active', 1, ['healing'], 0,
    10, 24, { type: 'heal', attackFactor: 0.9, maxHpRatio: 0.08 },
    { natureCharm: 1 });
  define(records, 'bodyBarrier', '护体罡气', 'active', 2, ['body'], 9,
    12, 28, { type: 'shield', defenseFactor: 1.0, maxHpRatio: 0.08 });
  define(records, 'flowingFirePalm', '流火掌', 'active', 2, ['fist'], 9,
    11, 20, {
      type: 'attack',
      multiplier: 1.15,
      status: { id: 'burn', durationTicks: 12, pulseDamageRatio: 0.18 }
    });
  define(records, 'spiritNeedle', '破甲指', 'active', 2, ['spirit'], 9,
    18, 28, { type: 'attack', multiplier: 1.55, defenseIgnore: 0.25 },
    { mindCharm: 1 });
  define(records, 'bindingTalisman', '缚灵术', 'active', 3, ['talisman'], 10,
    16, 32, {
      type: 'attack',
      multiplier: 0.9,
      status: { id: 'slow', durationTicks: 12 }
    },
    { earthCharm: 1, bodyCharm: 1 });

  // ——— 验证池：门派主动 ———
  define(records, 'cloudPiercingSword', '穿云破岳剑', 'active', 2, ['sword'], 9,
    18, 30, { type: 'attack', multiplier: 1.7, defenseIgnore: 0.25 });
  define(records, 'returningWaveSword', '回风叠浪剑', 'active', 2, ['sword'], 9,
    12, 20, { type: 'attack', hits: 3, multiplier: 0.52 });
  define(records, 'stopBleedArt', '止血回元术', 'active', 2, ['healing'], 9,
    10, 24, { type: 'heal', attackFactor: 1.0, maxHpRatio: 0.08 },
    { natureCharm: 1 });
  define(records, 'boneCorrosionNeedle', '腐骨针', 'active', 2, ['spirit'], 9,
    15, 28, {
      type: 'attack',
      multiplier: 1.05,
      status: { id: 'poison', durationTicks: 12, stacks: 2, pulseDamageRatio: 0.08 }
    },
    { mindCharm: 1 });
  define(records, 'spiritArmorArray', '灵甲符阵', 'active', 2, ['array'], 9,
    12, 28, { type: 'shield', defenseFactor: 1.2, maxHpRatio: 0.08 },
    { earthCharm: 1 });
  define(records, 'flameThunderArray', '炎雷阵', 'active', 2, ['array'], 9,
    18, 32, { type: 'aoeAttack', multiplier: 0.9 },
    { airCharm: 1, fireCharm: 1 });
  define(records, 'beastWard', '灵契护主', 'active', 2, ['beast'], 9,
    16, 32, {
      type: 'guard',
      durationTicks: 16
    });
  define(records, 'beastCommandRoar', '裂阵兽吼', 'active', 2, ['beast'], 9,
    16, 28, {
      type: 'beastAttack',
      multiplier: 1.4
    });
  define(records, 'calmingMelody', '宁神曲', 'active', 2, ['music'], 9,
    10, 26, {
      type: 'heal',
      attackFactor: 0.7,
      maxHpRatio: 0.06,
      purge: true
    },
    { natureCharm: 1 });
  define(records, 'crescentSoundBlade', '弦月音刃', 'active', 2, ['music'], 9,
    16, 28, { type: 'attack', multiplier: 1.55 },
    { mindCharm: 1 });
  define(records, 'heartLink', '同心引', 'active', 2, ['spirit'], 9,
    20, 42, {
      type: 'partyDamageBuff',
      damageBonus: 0.12,
      durationTicks: 12
    });
  define(records, 'confusingGaze', '迷心眸', 'active', 2, ['spirit'], 9,
    16, 32, {
      type: 'attack',
      multiplier: 0.6,
      status: {
        id: 'weaken',
        durationTicks: 12,
        attackFactor: 0.85,
        accuracyFlat: -15
      }
    },
    { mindCharm: 1 });

  // ——— 验证池：无门派被动 ———
  define(records, 'steadyBreath', '稳息心法', 'passive', 1, ['qi'], 0,
    0, 0, { maxQiPercent: 0.12 });
  define(records, 'ironBody', '铁身功', 'passive', 1, ['body'], 0,
    0, 0, { defensePercent: 0.08 });
  define(records, 'sharpEye', '明目诀', 'passive', 1, ['spirit'], 0,
    0, 0, { accuracyFlat: 10 });
  define(records, 'swiftShadow', '疾影诀', 'passive', 2, ['movement'], 9,
    0, 0, { attackIntervalReduction: 0.05 });
  define(records, 'nurtureEssence', '养元诀', 'passive', 2, ['healing'], 9,
    0, 0, { incomingHealBonus: 0.12 });
  define(records, 'battleHeart', '百战心法', 'passive', 3, ['fist'], 10,
    0, 0, { critChanceBonus: 0.05 });

  // ——— 验证池：门派被动 ———
  define(records, 'swordHeart', '剑骨铮鸣', 'passive', 2, ['sword'], 9,
    0, 0, { taggedDamageBonus: { sword: 0.08 } });
  define(records, 'medicalMind', '岐黄心法', 'passive', 2, ['healing'], 9,
    0, 0, { healPowerBonus: 0.1 });
  define(records, 'earthArrayHeart', '坤元阵心', 'passive', 2, ['array'], 9,
    0, 0, { shieldPowerBonus: 0.12 });
  define(records, 'sharedFateBond', '同命灵契', 'passive', 2, ['beast'], 9,
    0, 0, { selfAndBeastMaxHpPercent: 0.08 });
  define(records, 'clearMindScore', '澄心谱', 'passive', 2, ['music'], 9,
    0, 0, { controlResistBonus: 0.12 });
  define(records, 'knowingIntent', '知意诀', 'passive', 2, ['spirit'], 9,
    0, 0, { affinityTeamBonus: 0.25 });

  // ——— 路线图扩写：无门派剩余 ———
  define(records, 'thunderSeal', '惊雷印', 'active', 3, ['thunder'], 10,
    20, 36, {
      type: 'attack',
      multiplier: 1.5,
      status: { id: 'shock', chance: 0.25, durationTicks: 8 }
    },
    { airCharm: 1, fireCharm: 1 });
  define(records, 'clearTruthArt', '清心还真诀', 'active', 4, ['healing'], 10,
    24, 48, {
      type: 'heal',
      attackFactor: 1.3,
      maxHpRatio: 0.12,
      purge: true
    },
    { natureCharm: 2 });
  define(records, 'eightDirectionsSword', '八方落剑诀', 'active', 4, ['sword'], 11,
    28, 44, { type: 'aoeAttack', multiplier: 1.05 },
    { airCharm: 1, mindCharm: 1 });
  define(records, 'blackTortoiseWard', '玄龟镇岳诀', 'active', 5, ['body'], 12,
    36, 64, {
      type: 'shield',
      defenseFactor: 0.8,
      maxHpRatio: 0.08,
      damageReduction: 0.08
    },
    { earthCharm: 2, bodyCharm: 1 });
  define(records, 'hiddenEdge', '藏锋诀', 'passive', 3, ['sword'], 10,
    0, 0, { normalAttackBonus: 0.15 });
  define(records, 'heartGuardArt', '护心诀', 'passive', 3, ['body'], 10,
    0, 0, { controlResistBonus: 0.15 });
  define(records, 'endlessCycleArt', '周天不息法', 'passive', 4, ['qi'], 11,
    0, 0, { qiRegenBonus: 0.18 });
  define(records, 'lastStandArt', '绝处逢生诀', 'passive', 5, ['body'], 12,
    0, 0, {
      lowHpThreshold: 0.3,
      lowHpDamageReduction: 0.2,
      lowHpIncomingHealBonus: 0.2
    });

  // ——— 太玄剑宗扩写 ———
  define(records, 'supremeMysticSword', '太玄一剑', 'active', 5, ['sword'], 11,
    38, 66, {
      type: 'attack',
      multiplier: 2.85,
      enemyHpBelowBonus: { threshold: 0.3, bonus: 0.25 }
    });
  define(records, 'flowingLightThirteen', '流光十三式', 'active', 4, ['sword'], 10,
    24, 38, { type: 'attack', hits: 4, multiplier: 0.55 });
  define(records, 'flyingSwordChase', '飞剑逐影', 'active', 3, ['sword'], 10,
    20, 32, { type: 'attack', hits: 3, multiplier: 0.65 });
  define(records, 'myriadSwordsSky', '万剑凌霄', 'active', 5, ['sword'], 11,
    40, 64, { type: 'aoeAttack', multiplier: 1.4 });
  define(records, 'endlessSwordHeart', '无间剑心', 'passive', 3, ['sword'], 10,
    0, 0, { critChanceBonus: 0.04 });
  define(records, 'swordReturnOrigin', '御剑归元', 'passive', 4, ['sword'], 11,
    0, 0, { taggedDamageBonus: { sword: 0.08 }, accuracyFlat: 8 });

  // ——— 百草谷扩写 ———
  define(records, 'clearSpringArt', '清心回春诀', 'active', 3, ['healing'], 10,
    18, 36, {
      type: 'heal',
      attackFactor: 1.2,
      maxHpRatio: 0.1,
      purge: true
    },
    { natureCharm: 1 });
  define(records, 'bonePoisonMist', '腐骨毒雾', 'active', 4, ['spirit'], 10,
    26, 44, {
      type: 'aoeAttack',
      multiplier: 0.7,
      status: {
        id: 'poison',
        durationTicks: 12,
        stacks: 2,
        pulseDamageRatio: 0.08
      }
    },
    { mindCharm: 1, natureCharm: 1 });
  define(records, 'woodVitalityArt', '青木护生诀', 'active', 3, ['healing'], 10,
    20, 36, {
      type: 'heal',
      attackFactor: 0.6,
      maxHpRatio: 0.075
    },
    { natureCharm: 1 });
  define(records, 'witheredSpring', '枯木逢春', 'active', 5, ['healing'], 11,
    38, 64, {
      type: 'heal',
      attackFactor: 1.05,
      maxHpRatio: 0.15
    },
    { natureCharm: 2 });
  define(records, 'myriadPoisonTrue', '万毒真解', 'passive', 3, ['spirit'], 10,
    0, 0, { ailmentPowerBonus: 0.15 });
  define(records, 'woodSharedLife', '草木同生', 'passive', 4, ['healing'], 11,
    0, 0, { overflowHealToShield: 0.5, overflowShieldCap: 0.12 });

  // ——— 天工阁扩写 ———
  define(records, 'fourSymbolsWard', '四象护阵', 'active', 3, ['array'], 10,
    22, 42, {
      type: 'shield',
      defenseFactor: 0.7,
      maxHpRatio: 0.06
    },
    { earthCharm: 1 });
  define(records, 'starfallArray', '星落杀阵', 'active', 4, ['array'], 10,
    30, 50, {
      type: 'aoeAttack',
      multiplier: 1.2,
      status: {
        id: 'vulnerable',
        durationTicks: 12,
        damageTakenFactor: 1.1
      }
    },
    { cosmicCharm: 2, fireCharm: 1 });
  define(records, 'spiritLockMechanism', '锁灵机关', 'active', 3, ['talisman'], 10,
    18, 36, {
      type: 'attack',
      multiplier: 0.85,
      status: { id: 'silence', durationTicks: 8 }
    },
    { earthCharm: 1, mindCharm: 1 });
  define(records, 'heavenlyNetLock', '天罗锁灵机', 'active', 5, ['talisman'], 11,
    34, 60, {
      type: 'attack',
      multiplier: 1.3,
      status: { id: 'silence', durationTicks: 8 },
      followStatus: { id: 'slow', durationTicks: 12 }
    },
    { earthCharm: 2, mindCharm: 1 });
  define(records, 'heavenlyCalculation', '天机演算', 'passive', 3, ['array'], 10,
    0, 0, { taggedDamageBonus: { array: 0.15 } });
  define(records, 'mechanismMastery', '机括精研', 'passive', 4, ['talisman'], 11,
    0, 0, { accuracyFlat: 15, controlResistBonus: 0.05 });

  // ——— 灵兽山扩写 ———
  define(records, 'lifeFeedback', '生息反哺', 'active', 4, ['beast'], 10,
    24, 44, {
      type: 'heal',
      attackFactor: 0.8,
      maxHpRatio: 0.08,
      requireBeast: true
    });
  define(records, 'beastEcho', '灵兽回响', 'active', 4, ['beast'], 10,
    25, 40, { type: 'beastAttack', multiplier: 1.8 });
  define(records, 'beastWarSpirit', '兽群战意', 'active', 3, ['beast'], 10,
    20, 42, {
      type: 'partyDamageBuff',
      damageBonus: 0.1,
      durationTicks: 12,
      requireBeast: true
    });
  define(records, 'hundredBeastRush', '百兽奔袭', 'active', 5, ['beast'], 11,
    38, 62, {
      type: 'aoeAttack',
      multiplier: 1.3,
      requireBeast: true,
      status: { id: 'burn', durationTicks: 8, pulseDamageRatio: 0.1 }
    });
  define(records, 'spiritCompanion', '御灵真诀', 'passive', 3, ['beast'], 10,
    0, 0, { activeBeastEffectBonus: 0.12 });
  define(records, 'myriadBeastHeart', '万兽灵心', 'passive', 4, ['beast'], 11,
    0, 0, { activeBeastEffectBonus: 0.08, maxHpPercent: 0.05 });

  // ——— 清音宫扩写 ———
  define(records, 'purifyingMelody', '涤尘清音', 'active', 3, ['music'], 10,
    22, 44, {
      type: 'heal',
      attackFactor: 0.35,
      maxHpRatio: 0.04,
      purge: true
    },
    { natureCharm: 1 });
  define(records, 'tearingSevenStrings', '裂帛七弦', 'active', 4, ['music'], 10,
    28, 46, {
      type: 'aoeAttack',
      multiplier: 1.05,
      status: { id: 'silence', chance: 0.25, durationTicks: 8 }
    },
    { mindCharm: 1 });
  define(records, 'springRiverHarmony', '春江和鸣', 'active', 3, ['music'], 10,
    22, 42, {
      type: 'restoreQi',
      maxQiRatio: 0.1,
      status: { id: 'haste', durationTicks: 12 }
    });
  define(records, 'highMountainsFlowingWater', '高山流水', 'active', 5, ['music'], 11,
    36, 64, {
      type: 'partyDamageBuff',
      damageBonus: 0.12,
      durationTicks: 12,
      accuracyFlat: 10,
      critChanceBonus: 0.05
    });
  define(records, 'killingToneBone', '杀音入骨', 'passive', 3, ['music'], 10,
    0, 0, { taggedDamageBonus: { music: 0.15 } });
  define(records, 'lingeringSound', '余音绕梁', 'passive', 4, ['music'], 11,
    0, 0, { buffDurationBonus: 0.2 });

  // ——— 红尘阁扩写 ———
  define(records, 'spiritResonance', '灵犀相契', 'active', 4, ['spirit'], 10,
    26, 48, {
      type: 'partyDamageBuff',
      damageBonus: 0.15,
      durationTicks: 12,
      damageReduction: 0.15
    });
  define(records, 'drunkenRedDust', '醉红尘', 'active', 4, ['spirit'], 10,
    28, 52, {
      type: 'attack',
      multiplier: 0.5,
      status: {
        id: 'weaken',
        durationTicks: 12,
        attackFactor: 0.8,
        accuracyFlat: -20
      }
    },
    { mindCharm: 1 });
  define(records, 'longSleeveDance', '长袖善舞', 'active', 3, ['spirit'], 10,
    20, 42, {
      type: 'partyDamageBuff',
      damageBonus: 0.1,
      durationTicks: 12,
      accuracyFlat: 10
    });
  define(records, 'allBeingsFavor', '众生倾意', 'active', 5, ['spirit'], 11,
    34, 60, {
      type: 'partyDamageBuff',
      damageBonus: 0.3,
      durationTicks: 8,
      selfAttackPenalty: 0.15
    });
  define(records, 'confusingHeartTrue', '惑心真解', 'passive', 3, ['spirit'], 10,
    0, 0, { accuracyFlat: 15 });
  define(records, 'redDustMirror', '红尘心鉴', 'passive', 4, ['spirit'], 11,
    0, 0, { affinityTeamBonus: 0.08 });

  // ——— 非 76 路线图：存档兼容 ———
  define(records, 'pillGuard', '丹护心诀', 'passive', 5, ['pill'], 11,
    0, 0, { supplyHealingBonus: 0.15 });

  function assignSect(sectId, ids) {
    ids.forEach(function (id) {
      if (records[id]) records[id].sectId = sectId;
    });
  }

  assignSect('taixuan-sword', [
    'cloudPiercingSword', 'returningWaveSword', 'swordHeart',
    'supremeMysticSword', 'flowingLightThirteen', 'flyingSwordChase',
    'myriadSwordsSky', 'endlessSwordHeart', 'swordReturnOrigin'
  ]);
  assignSect('baicao-valley', [
    'stopBleedArt', 'boneCorrosionNeedle', 'medicalMind',
    'clearSpringArt', 'bonePoisonMist', 'woodVitalityArt', 'witheredSpring',
    'myriadPoisonTrue', 'woodSharedLife'
  ]);
  assignSect('tiangong-pavilion', [
    'spiritArmorArray', 'flameThunderArray', 'earthArrayHeart',
    'fourSymbolsWard', 'starfallArray', 'spiritLockMechanism',
    'heavenlyNetLock', 'heavenlyCalculation', 'mechanismMastery'
  ]);
  assignSect('spirit-beast-mountain', [
    'beastWard', 'beastCommandRoar', 'sharedFateBond',
    'lifeFeedback', 'beastEcho', 'beastWarSpirit', 'hundredBeastRush',
    'spiritCompanion', 'myriadBeastHeart'
  ]);
  assignSect('qingyin-palace', [
    'calmingMelody', 'crescentSoundBlade', 'clearMindScore',
    'purifyingMelody', 'tearingSevenStrings', 'springRiverHarmony',
    'highMountainsFlowingWater', 'killingToneBone', 'lingeringSound'
  ]);
  // 红尘阁尚未入可选宗门表，仍标记归属便于日后接入。
  assignSect('hongchen-pavilion', [
    'heartLink', 'confusingGaze', 'knowingIntent',
    'spiritResonance', 'drunkenRedDust', 'longSleeveDance',
    'allBeingsFavor', 'confusingHeartTrue', 'redDustMirror'
  ]);

  const VALIDATION_POOL_IDS = Object.freeze([
    'stoneBreakingFist', 'returningWindSlash', 'gatheringBreath', 'clearHeartArt',
    'bodyBarrier', 'flowingFirePalm', 'spiritNeedle', 'bindingTalisman',
    'cloudPiercingSword', 'returningWaveSword', 'stopBleedArt', 'boneCorrosionNeedle',
    'spiritArmorArray', 'flameThunderArray', 'beastWard', 'beastCommandRoar',
    'calmingMelody', 'crescentSoundBlade', 'heartLink', 'confusingGaze',
    'steadyBreath', 'ironBody', 'sharpEye', 'swiftShadow', 'nurtureEssence',
    'battleHeart', 'swordHeart', 'medicalMind', 'earthArrayHeart', 'sharedFateBond',
    'clearMindScore', 'knowingIntent'
  ]);

  const ROADMAP_IDS = Object.freeze(VALIDATION_POOL_IDS.concat([
    'thunderSeal', 'clearTruthArt', 'eightDirectionsSword', 'blackTortoiseWard',
    'hiddenEdge', 'heartGuardArt', 'endlessCycleArt', 'lastStandArt',
    'supremeMysticSword', 'flowingLightThirteen', 'flyingSwordChase', 'myriadSwordsSky',
    'endlessSwordHeart', 'swordReturnOrigin',
    'clearSpringArt', 'bonePoisonMist', 'woodVitalityArt', 'witheredSpring',
    'myriadPoisonTrue', 'woodSharedLife',
    'fourSymbolsWard', 'starfallArray', 'spiritLockMechanism', 'heavenlyNetLock',
    'heavenlyCalculation', 'mechanismMastery',
    'lifeFeedback', 'beastEcho', 'beastWarSpirit', 'hundredBeastRush',
    'spiritCompanion', 'myriadBeastHeart',
    'purifyingMelody', 'tearingSevenStrings', 'springRiverHarmony',
    'highMountainsFlowingWater', 'killingToneBone', 'lingeringSound',
    'spiritResonance', 'drunkenRedDust', 'longSleeveDance', 'allBeingsFavor',
    'confusingHeartTrue', 'redDustMirror'
  ]));

  const TECHNIQUES = deepFreeze(records);
  const BY_BOOK_ITEM_ID = {};
  Object.values(TECHNIQUES).forEach(function (technique) {
    BY_BOOK_ITEM_ID[technique.bookItemId] = technique;
  });
  deepFreeze(BY_BOOK_ITEM_ID);

  function get(techniqueId) {
    return TECHNIQUES[techniqueId] || null;
  }

  function getByBookItemId(itemId) {
    return BY_BOOK_ITEM_ID[itemId] || null;
  }

  function list(kind) {
    const techniques = Object.values(TECHNIQUES);
    return Object.freeze(kind == null
      ? techniques.slice()
      : techniques.filter(function (technique) {
        return technique.kind === kind;
      }));
  }

  function listValidationPool() {
    return Object.freeze(VALIDATION_POOL_IDS.map(function (id) {
      return TECHNIQUES[id];
    }).filter(Boolean));
  }

  function listRoadmap() {
    return Object.freeze(ROADMAP_IDS.map(function (id) {
      return TECHNIQUES[id];
    }).filter(Boolean));
  }

  function listBySect(sectId) {
    if (typeof sectId !== 'string') return Object.freeze([]);
    return Object.freeze(Object.values(TECHNIQUES).filter(function (row) {
      return row.sectId === sectId;
    }));
  }

  // Milky Way Idle cumulative XP to reach each level (Abilities share the skill table).
  // Source: https://milkywayidle.wiki.gg/wiki/Experience and community experience.json
  const MWI_CUMULATIVE_XP = Object.freeze([
    0,
    0, 33, 76, 132, 202, 286, 386, 503, 637, 791,
    964, 1159, 1377, 1620, 1891, 2192, 2525, 2893, 3300, 3750,
    4247, 4795, 5400, 6068, 6805, 7618, 8517, 9508, 10604, 11814,
    13151, 14629, 16262, 18068, 20064, 22271, 24712, 27411, 30396, 33697,
    37346, 41381, 45842, 50773, 56222, 62243, 68895, 76242, 84355, 93311,
    103195, 114100, 126127, 139390, 154009, 170118, 187863, 207403, 228914, 252584,
    278623, 307256, 338731, 373318, 411311, 453030, 498824, 549074, 604193, 664632,
    730881, 803472, 882985, 970050, 1065351, 1169633, 1283701, 1408433, 1544780, 1693774,
    1856536, 2034279, 2228321, 2440088, 2671127, 2923113, 3197861, 3497335, 3823663, 4179145,
    4566274, 4987741, 5446463, 5945587, 6488521, 7078945, 7720834, 8418485, 9176537, 10000000,
    11404976, 12904567, 14514400, 16242080, 18095702, 20083886, 22215808, 24501230, 26950540, 29574787,
    32385721, 35395838, 38618420, 42067584, 45758332, 49706603, 53929328, 58444489, 63271179, 68429670,
    73941479, 79829440, 86117783, 92832214, 100000000, 114406130, 130118394, 147319656, 166147618, 186752428,
    209297771, 233962072, 260939787, 290442814, 322702028, 357968938, 396517495, 438646053, 484679494, 534971538,
    589907252, 649905763, 715423218, 786955977, 865044093, 950275074, 1043287971, 1144777804, 1255500373, 1376277458,
    1508002470, 1651646566, 1808265285, 1979005730, 2165114358, 2367945418, 2588970089, 2829786381, 3092129857, 3377885250,
    3689099031, 4027993033, 4396979184, 4798675471, 5235923207, 5711805728, 6229668624, 6793141628, 7406162301, 8073001662,
    8798291902, 9587056372, 10444742007, 11377254401, 12390995728, 13492905745, 14690506120, 15991948361, 17406065609, 18942428633,
    20611406335, 22424231139, 24393069640, 26531098945, 28852589138, 31372992363, 34109039054, 37078841860, 40302007875, 43799759843,
    47595067021, 51712786465, 56179815564, 61025256696, 66280594953, 71979889960, 78159982881, 84860719814, 92125192822, 100000000000
  ]);
  const MAX_TECHNIQUE_LEVEL = 200;

  function xpNeed(level, multiplier) {
    if (!Number.isSafeInteger(level) || level < 1 || level >= MAX_TECHNIQUE_LEVEL ||
        typeof multiplier !== 'number' ||
        !Number.isFinite(multiplier) ||
        multiplier <= 0) {
      return 0;
    }
    const current = MWI_CUMULATIVE_XP[level];
    const next = MWI_CUMULATIVE_XP[level + 1];
    if (!Number.isSafeInteger(current) || !Number.isSafeInteger(next)) {
      return 0;
    }
    return Math.round((next - current) * multiplier);
  }

  return Object.freeze({
    TECHNIQUES: TECHNIQUES,
    VALIDATION_POOL_IDS: VALIDATION_POOL_IDS,
    ROADMAP_IDS: ROADMAP_IDS,
    get: get,
    getByBookItemId: getByBookItemId,
    list: list,
    listValidationPool: listValidationPool,
    listRoadmap: listRoadmap,
    listBySect: listBySect,
    xpNeed: xpNeed
  });
});
