(function (root, factory) {
  'use strict';
  const api = factory(
    typeof CombatLexicon !== 'undefined'
      ? CombatLexicon
      : typeof require === 'function'
        ? require('./combat-lexicon.js')
        : null
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.EquipmentContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (CombatLexicon) {
  'use strict';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }
    Object.freeze(value);
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return value;
  }

  const SLOTS = [
    'weapon',
    'head',
    'robe',
    'bracer',
    'belt',
    'boots',
    'accessory',
    'artifact'
  ];

  const SLOT_META = {
    weapon: {
      name: '武器',
      unlockRealmOrder: 1,
      iconKey: 'equipment-weapon',
      preferredStats: ['attack', 'accuracy', 'critChance', 'critDamage']
    },
    head: {
      name: '头冠',
      unlockRealmOrder: 2,
      iconKey: 'equipment-head',
      preferredStats: [
        'maxQi',
        'accuracy',
        'controlAccuracy',
        'controlResistance'
      ]
    },
    robe: {
      name: '法袍',
      unlockRealmOrder: 1,
      iconKey: 'equipment-robe',
      preferredStats: [
        'maxHp',
        'defense',
        'damageReduction',
        'healingTaken',
        'shieldPower'
      ]
    },
    bracer: {
      name: '护腕',
      unlockRealmOrder: 2,
      iconKey: 'equipment-bracer',
      preferredStats: [
        'actionIntervalTicks',
        'cooldownReduction',
        'critChance',
        'ailmentPower',
        'attack'
      ]
    },
    belt: {
      name: '腰带',
      unlockRealmOrder: 3,
      iconKey: 'equipment-belt',
      preferredStats: [
        'maxHp',
        'defense',
        'damageReduction',
        'controlResistance',
        'ailmentResistance'
      ]
    },
    boots: {
      name: '靴履',
      unlockRealmOrder: 3,
      iconKey: 'equipment-boots',
      preferredStats: [
        'evasion',
        'actionIntervalTicks',
        'cooldownReduction',
        'controlResistance'
      ]
    },
    accessory: {
      name: '饰品',
      unlockRealmOrder: 1,
      iconKey: 'equipment-accessory',
      preferredStats: [
        'qiRegen',
        'healingPower',
        'shieldPower',
        'ailmentPower'
      ]
    },
    artifact: {
      name: '法宝',
      unlockRealmOrder: 4,
      iconKey: 'equipment-artifact',
      preferredStats: [
        'maxQi',
        'qiRegen',
        'cooldownReduction',
        'cleansePower',
        'protectionWeight'
      ]
    }
  };

  const QUALITIES = {
    common: {
      name: '普通',
      order: 0,
      affixCount: 0,
      highTierBias: 0,
      rareChance: 0,
      color: '#9b9baa'
    },
    fine: {
      name: '精良',
      order: 1,
      affixCount: 1,
      highTierBias: 0.05,
      rareChance: 0,
      color: '#5fb879'
    },
    rare: {
      name: '稀有',
      order: 2,
      affixCount: 2,
      highTierBias: 0.12,
      rareChance: 0,
      color: '#5b92d8'
    },
    epic: {
      name: '史诗',
      order: 3,
      affixCount: 3,
      highTierBias: 0.22,
      rareChance: 0,
      color: '#9b6bd2'
    },
    legendary: {
      name: '传说',
      order: 4,
      affixCount: 4,
      highTierBias: 0.35,
      rareChance: 0.25,
      color: '#d89b45'
    },
    mythic: {
      name: '神话',
      order: 5,
      affixCount: 4,
      highTierBias: 0.5,
      rareChance: 1,
      handcrafted: true,
      color: '#d85c73'
    }
  };

  const REALM_BANDS = [
    { id: 'qi', name: '练气', order: 1, minTier: 1, maxTier: 2, scale: 1 },
    {
      id: 'foundation',
      name: '筑基',
      order: 2,
      minTier: 1,
      maxTier: 3,
      scale: 1.8
    },
    {
      id: 'core',
      name: '金丹',
      order: 3,
      minTier: 2,
      maxTier: 4,
      scale: 3
    },
    {
      id: 'nascent',
      name: '元婴',
      order: 4,
      minTier: 2,
      maxTier: 5,
      scale: 4.8
    },
    {
      id: 'spirit',
      name: '化神',
      order: 5,
      minTier: 3,
      maxTier: 6,
      scale: 7
    },
    {
      id: 'void',
      name: '炼虚',
      order: 6,
      minTier: 3,
      maxTier: 6,
      scale: 10
    },
    {
      id: 'integration',
      name: '合体',
      order: 7,
      minTier: 4,
      maxTier: 6,
      scale: 14
    },
    {
      id: 'mahayana',
      name: '大乘',
      order: 8,
      minTier: 4,
      maxTier: 6,
      scale: 19
    },
    {
      id: 'ascension',
      name: '飞升',
      order: 9,
      minTier: 5,
      maxTier: 6,
      scale: 26
    }
  ];

  const RESONANCES = {
    swordIntent: {
      id: 'swordIntent',
      name: '剑意',
      thresholds: {
        2: { percent: { attack: 0.04 }, rules: [] },
        4: {
          percent: { attack: 0.08 },
          rules: [{ id: 'sword_cycle_haste', value: 0.08 }]
        }
      }
    },
    circulation: {
      id: 'circulation',
      name: '周天',
      thresholds: {
        2: { flat: { qiRegen: 1 }, rules: [] },
        4: {
          percent: { maxQi: 0.1 },
          rules: [{ id: 'cycle_qi_refund', value: 0.06 }]
        }
      }
    },
    vitality: {
      id: 'vitality',
      name: '生息',
      thresholds: {
        2: { percent: { healingPower: 0.05 }, rules: [] },
        4: {
          percent: { healingPower: 0.1 },
          rules: [{ id: 'healing_echo', value: 0.08 }]
        }
      }
    },
    bulwark: {
      id: 'bulwark',
      name: '守御',
      thresholds: {
        2: { percent: { defense: 0.05 }, rules: [] },
        4: {
          flat: { damageReduction: 0.06 },
          rules: [{ id: 'shield_break_guard', value: 0.08 }]
        }
      }
    },
    mutation: {
      id: 'mutation',
      name: '异变',
      thresholds: {
        2: { percent: { ailmentPower: 0.05 }, rules: [] },
        4: {
          percent: { ailmentPower: 0.1 },
          rules: [{ id: 'ailment_exploit', value: 0.1 }]
        }
      }
    },
    arrayCore: {
      id: 'arrayCore',
      name: '阵枢',
      thresholds: {
        2: { percent: { accuracy: 0.04 }, rules: [] },
        4: {
          percent: { controlAccuracy: 0.08 },
          rules: [{ id: 'array_pulse', value: 0.08 }]
        }
      }
    },
    spiritBond: {
      id: 'spiritBond',
      name: '灵契',
      thresholds: {
        2: { percent: { protectionWeight: 0.05 }, rules: [] },
        4: {
          percent: { maxHp: 0.08 },
          rules: [{ id: 'beast_followup', value: 0.1 }]
        }
      }
    },
    harmony: {
      id: 'harmony',
      name: '和鸣',
      thresholds: {
        2: { percent: { shieldPower: 0.05 }, rules: [] },
        4: {
          percent: { healingTaken: 0.08 },
          rules: [{ id: 'support_harmony', value: 0.08 }]
        }
      }
    }
  };

  const COMBAT_STAT_KEYS = CombatLexicon &&
    Array.isArray(CombatLexicon.STAT_KEYS)
    ? CombatLexicon.STAT_KEYS.slice()
    : [
        'maxHp',
        'maxQi',
        'attack',
        'defense',
        'accuracy',
        'evasion',
        'critChance',
        'critDamage',
        'actionIntervalTicks',
        'cooldownReduction',
        'damageReduction',
        'healingPower',
        'healingTaken',
        'shieldPower',
        'qiRegen',
        'controlAccuracy',
        'controlResistance',
        'ailmentPower',
        'ailmentResistance',
        'cleansePower',
        'threatGain',
        'protectionWeight'
      ];

  const STAT_NAMES = {
    maxHp: '最大气血',
    maxQi: '最大真气',
    attack: '攻击',
    defense: '防御',
    accuracy: '命中',
    evasion: '闪避',
    critChance: '暴击率',
    critDamage: '暴击伤害',
    actionIntervalTicks: '行动间隔缩减',
    cooldownReduction: '冷却减缩',
    damageReduction: '伤害减免',
    healingPower: '治疗强度',
    healingTaken: '受治疗',
    shieldPower: '护盾强度',
    qiRegen: '真气恢复',
    controlAccuracy: '控制命中',
    controlResistance: '控制抗性',
    ailmentPower: '异常强度',
    ailmentResistance: '异常抗性',
    cleansePower: '净化强度',
    threatGain: '仇恨获取',
    protectionWeight: '保护权重'
  };

  const FLAT_STATS = new Set([
    'maxHp',
    'maxQi',
    'attack',
    'defense',
    'accuracy',
    'evasion',
    'qiRegen',
    'cleansePower',
    'threatGain',
    'protectionWeight'
  ]);

  function makeTierValues(stat, multiplier) {
    const flat = FLAT_STATS.has(stat);
    const values = {};
    for (let tier = 1; tier <= 6; tier += 1) {
      const base = flat ? 2 + tier * 2 : 0.01 + tier * 0.006;
      values[tier] = {
        min: Number((base * multiplier).toFixed(flat ? 0 : 4)),
        max: Number((base * multiplier * 1.5).toFixed(flat ? 0 : 4))
      };
    }
    return values;
  }

  function weightsFor(stat, kind) {
    const weights = {};
    SLOTS.forEach(function (slot) {
      const preferred = SLOT_META[slot].preferredStats.indexOf(stat) >= 0;
      weights[slot] = kind === 'rare'
        ? slot === 'artifact' ? 1.8 : 1
        : preferred ? 2.4 : 0.65;
    });
    return weights;
  }

  const AFFIXES = {};
  COMBAT_STAT_KEYS.forEach(function (stat) {
    AFFIXES['numeric-' + stat] = {
      id: 'numeric-' + stat,
      name: STAT_NAMES[stat] || stat,
      kind: 'numeric',
      stat: stat,
      mode: FLAT_STATS.has(stat) ? 'flat' : 'percent',
      tiers: makeTierValues(stat, 1),
      slotWeights: weightsFor(stat, 'numeric')
    };
  });

  [
    {
      id: 'build-sword-crit-flow',
      name: '剑光回流',
      event: 'criticalHit',
      styleTag: 'sword',
      rule: 'nextTaggedTechniqueQiCost',
      target: 'self'
    },
    {
      id: 'build-shield-recovery',
      name: '护元回响',
      event: 'shieldGained',
      styleTag: 'array',
      rule: 'temporaryQiRegen',
      target: 'self'
    },
    {
      id: 'build-ailment-pressure',
      name: '蚀骨乘隙',
      event: 'ailmentApplied',
      styleTag: 'poison',
      rule: 'damageAgainstAilingTarget',
      target: 'self'
    },
    {
      id: 'build-beast-followup',
      name: '灵契追击',
      event: 'beastActed',
      styleTag: 'beast',
      rule: 'nextTechniqueDamage',
      target: 'self'
    },
    {
      id: 'build-healing-guard',
      name: '生息护持',
      event: 'healed',
      styleTag: 'wood',
      rule: 'temporaryDamageReduction',
      target: 'self'
    },
    {
      id: 'build-cycle-focus',
      name: '周天凝神',
      event: 'techniqueCycleCompleted',
      styleTag: 'soul',
      rule: 'temporaryControlAccuracy',
      target: 'self'
    }
  ].forEach(function (row) {
    AFFIXES[row.id] = Object.assign({}, row, {
      kind: 'build',
      tiers: makeTierValues('critChance', 1.25),
      durationTicks: 3,
      maxStacks: 1,
      internalCooldownTicks: 6,
      slotWeights: weightsFor('', 'build')
    });
  });

  [
    {
      id: 'rare-broken-shield-purify',
      name: '琉璃不灭',
      event: 'shieldBroken',
      rule: 'cleanseControlAndGuard'
    },
    {
      id: 'rare-tagged-cycle-advance',
      name: '一念周天',
      event: 'techniqueCycleCompleted',
      rule: 'advanceTaggedCooldown'
    },
    {
      id: 'rare-ailment-conversion',
      name: '万毒归元',
      event: 'damageAgainstAilingTarget',
      rule: 'convertDamageToQi'
    },
    {
      id: 'rare-last-stand',
      name: '不坠道心',
      event: 'healthThresholdCrossed',
      rule: 'temporaryUntargetable'
    }
  ].forEach(function (row) {
    AFFIXES[row.id] = Object.assign({}, row, {
      kind: 'rare',
      target: 'self',
      tiers: makeTierValues('damageReduction', 1.5),
      durationTicks: 2,
      maxStacks: 1,
      internalCooldownTicks: 20,
      slotWeights: weightsFor('', 'rare')
    });
  });

  const SLOT_BASE_NAMES = {
    weapon: ['青竹剑', '玄铁剑', '赤丹刃', '唤魂杖', '雷霆剑', '虚空刃', '星铸枪', '天渊剑', '飞升刃'],
    head: ['凝露冠', '镇岳冠', '丹霞冠', '蕴魂冠', '雷纹冠', '虚冥冠', '归一冠', '天心冠', '渡劫冠'],
    robe: ['流云袍', '镇石甲', '日鳞甲', '雾织袍', '闪雷甲', '裂隙袍', '归一甲', '大乘法袍', '天劫仙衣'],
    bracer: ['青藤腕', '玄铁腕', '赤霞腕', '魂纹腕', '雷鸣腕', '虚空腕', '星枢腕', '天渊腕', '登仙腕'],
    belt: ['纳气带', '镇岳带', '丹阳带', '蕴魂带', '雷池带', '虚冥带', '归一带', '万法带', '渡劫带'],
    boots: ['踏云履', '御风履', '赤霞履', '魂游履', '雷行履', '虚渡履', '星踏履', '天涯履', '登仙履'],
    accessory: ['聚气玉', '筑基印', '金丹坠', '元婴珠', '化神镜', '虚空戒', '合体印', '万法坠', '登仙玉'],
    artifact: ['青岚铃', '镇山印', '赤阳炉', '引魂幡', '雷泽镜', '裂空梭', '归元盘', '万象图', '登仙台']
  };

  const BASE_STAT_PROFILES = {
    weapon: { attack: 9, accuracy: 3 },
    head: { maxQi: 12, controlResistance: 0.01 },
    robe: { maxHp: 28, defense: 5 },
    bracer: { attack: 4, critChance: 0.01 },
    belt: { maxHp: 16, defense: 3 },
    boots: { evasion: 3, controlResistance: 0.01 },
    accessory: { maxQi: 8, qiRegen: 1 },
    artifact: { maxQi: 5, cleansePower: 1 }
  };

  const resonanceIds = Object.keys(RESONANCES);
  const BASES = {};
  REALM_BANDS.forEach(function (realm, realmIndex) {
    SLOTS.forEach(function (slot, slotIndex) {
      const baseStats = {};
      Object.keys(BASE_STAT_PROFILES[slot]).forEach(function (stat) {
        const source = BASE_STAT_PROFILES[slot][stat];
        baseStats[stat] = Number(
          (source * realm.scale).toFixed(source < 1 ? 4 : 0)
        );
      });
      const id = realm.id + '-' + slot;
      const iconKey = SLOT_META[slot].iconKey;
      BASES[id] = {
        id: id,
        name: SLOT_BASE_NAMES[slot][realmIndex],
        slot: slot,
        realmBand: realm.id,
        realmOrder: realm.order,
        minAffixTier: realm.minTier,
        maxAffixTier: realm.maxTier,
        baseStats: baseStats,
        implicitEffect: null,
        styleTags: [],
        affixWeightProfile: slot,
        resonanceId: resonanceIds[(realmIndex + slotIndex) % resonanceIds.length],
        sourceRules: ['combat', 'forging'],
        iconKey: iconKey,
        iconSrc50: 'assets/item-icons/50/' + iconKey + '.svg',
        iconSrc100: 'assets/item-icons/100/' + iconKey + '.svg'
      };
    });
  });

  const ENHANCEMENT_LEVELS = {};
  const rates = [
    1, 1, 1, 0.9, 0.82, 0.75, 0.7, 0.6, 0.5,
    0.45, 0.37, 0.3, 0.25, 0.2, 0.15
  ];
  const pity = [0, 0, 0, 3, 3, 3, 4, 4, 4, 6, 6, 6, 8, 8, 8];
  for (let level = 1; level <= 15; level += 1) {
    ENHANCEMENT_LEVELS[level] = {
      targetLevel: level,
      successRate: rates[level - 1],
      pityFailures: pity[level - 1],
      baseStatMultiplier: Number((1 + level * 0.02).toFixed(2))
    };
  }

  const LEGACY_BASE_ALIASES = {
    cloudwoodSword: 'qi-weapon',
    cloudRobe: 'qi-robe',
    breathJade: 'qi-accessory',
    blackIronSword: 'foundation-weapon',
    stoneguardArmor: 'foundation-robe',
    foundationSeal: 'foundation-accessory',
    scarletCoreBlade: 'core-weapon',
    sunscaleArmor: 'core-robe',
    corePendant: 'core-accessory',
    soulCallingStaff: 'nascent-weapon',
    mistweaveRobe: 'nascent-robe',
    infantSoulPearl: 'nascent-accessory',
    thunderSword: 'spirit-weapon',
    lightningArmor: 'spirit-robe',
    spiritMirror: 'spirit-accessory',
    voidBlade: 'void-weapon',
    riftRobe: 'void-robe',
    voidRing: 'void-accessory',
    starforgedSpear: 'integration-weapon',
    unityArmor: 'integration-robe',
    bodySeal: 'integration-accessory',
    abyssSword: 'mahayana-weapon',
    mahayanaRobe: 'mahayana-robe',
    daoPendant: 'mahayana-accessory',
    ascensionBlade: 'ascension-weapon',
    heavenlyRobe: 'ascension-robe',
    immortalJade: 'ascension-accessory'
  };

  function getBase(id) {
    return typeof id === 'string' ? BASES[id] || null : null;
  }

  function getAffix(id) {
    return typeof id === 'string' ? AFFIXES[id] || null : null;
  }

  function getResonance(id) {
    return typeof id === 'string' ? RESONANCES[id] || null : null;
  }

  return deepFreeze({
    SLOTS: SLOTS,
    SLOT_META: SLOT_META,
    QUALITIES: QUALITIES,
    REALM_BANDS: REALM_BANDS,
    COMBAT_STAT_KEYS: COMBAT_STAT_KEYS,
    BASES: BASES,
    AFFIXES: AFFIXES,
    RESONANCES: RESONANCES,
    ENHANCEMENT_LEVELS: ENHANCEMENT_LEVELS,
    LEGACY_BASE_ALIASES: LEGACY_BASE_ALIASES,
    getBase: getBase,
    getAffix: getAffix,
    getResonance: getResonance
  });
});
