(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.HomesteadContent = api;
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

  function crop(id, name, unlockLevel, seedId, growthSeconds, quantity) {
    const skillXp = Math.max(1, Math.round(growthSeconds / 30));
    return {
      id: id,
      skillId: 'farming',
      masteryId: 'farming:' + id,
      name: name,
      unlockLevel: unlockLevel,
      seed: { itemId: seedId, quantity: 1 },
      growthSeconds: growthSeconds,
      skillXp: skillXp,
      masteryXp: Math.max(1, Math.round(skillXp * 0.5)),
      output: { itemId: id, quantity: quantity }
    };
  }

  const CROPS = deepFreeze({
    spiritRice: crop('spiritRice', '灵米', 1, 'commonSeed', 5 * 60, 4),
    qiGatheringGrass: crop('qiGatheringGrass', '聚气草', 3, 'commonSeed', 10 * 60, 3),
    heartClearGrass: crop('heartClearGrass', '清心草', 8, 'commonSeed', 15 * 60, 3),
    moonSpiritGrass: crop('moonSpiritGrass', '月灵草', 20, 'fineSeed', 30 * 60, 3),
    bloodSpiritGrass: crop('bloodSpiritGrass', '血灵草', 35, 'fineSeed', 45 * 60, 2),
    goldenLingzhi: crop('goldenLingzhi', '金芝', 50, 'rareSeed', 90 * 60, 1)
  });

  const FORMATIONS = deepFreeze({
    gatheringFormation: {
      id: 'gatheringFormation',
      itemId: 'gatheringFormation',
      name: '聚材阵',
      masteryId: 'formation:gatheringFormation',
      effect: { key: 'gatheringExtraYieldChance', value: 0.05 },
      effectText: '采集与钓鱼额外产出概率 +5 个百分点'
    },
    farmlandFormation: {
      id: 'farmlandFormation',
      itemId: 'farmlandFormation',
      name: '丰壤阵',
      masteryId: 'formation:farmlandFormation',
      effect: { key: 'farmGrowthReduction', value: 0.10 },
      effectText: '播种时作物生长时间 −10%'
    },
    fishingFormation: {
      id: 'fishingFormation',
      itemId: 'fishingFormation',
      name: '回澜阵',
      masteryId: 'formation:fishingFormation',
      effect: { key: 'fishRecoveryReduction', value: 0.10 },
      effectText: '鱼种库存恢复间隔 −10%'
    },
    craftingFormation: {
      id: 'craftingFormation',
      itemId: 'craftingFormation',
      name: '百工阵',
      masteryId: 'formation:craftingFormation',
      effect: { key: 'craftingDurationReduction', value: 0.05 },
      effectText: '生产与阵法制作时间 −5%'
    },
    beastFormation: {
      id: 'beastFormation',
      itemId: 'beastFormation',
      name: '御灵阵',
      masteryId: 'formation:beastFormation',
      effect: { key: 'beastTrainingXpBonus', value: 0.10 },
      effectText: '主动训练灵兽经验 +10%'
    }
  });

  function beast(id, name, sourceSkillId, assistance) {
    return {
      id: id,
      name: name,
      sourceSkillId: sourceSkillId,
      masteryId: 'beastTaming:' + id,
      encounterChance: 0.01,
      tameSeconds: 60,
      tamingItemId: 'beastLureTalisman',
      tameSkillXp: 30,
      tameMasteryXp: 15,
      tameCultivation: 5,
      trainingSeconds: 30,
      trainingItemId: 'beastFeed',
      trainingBeastXp: 10,
      trainingSkillXp: 10,
      trainingMasteryXp: 5,
      trainingCultivation: 2,
      assistance: assistance
    };
  }

  const BEASTS = deepFreeze({
    spiritFox: beast('spiritFox', '灵狐', 'herb', {
      key: 'gatheringExtraYieldChance',
      skillId: 'herb',
      value: 0.05
    }),
    rockshell: beast('rockshell', '岩甲兽', 'mining', {
      key: 'gatheringExtraYieldChance',
      skillId: 'mining',
      value: 0.05
    }),
    azureCrane: beast('azureCrane', '青羽鹤', 'woodcutting', {
      key: 'gatheringDurationReduction',
      skillId: 'woodcutting',
      value: 0.05
    }),
    waterTurtle: beast('waterTurtle', '水灵龟', 'fishing', {
      key: 'fishRecoveryReduction',
      value: 0.10
    })
  });

  const TRAITS = deepFreeze({
    keenNose: {
      id: 'keenNose',
      name: '灵嗅',
      effect: { gatheringExtraYieldChance: 0.02 }
    },
    diligent: {
      id: 'diligent',
      name: '勤勉',
      effect: { beastTrainingXpBonus: 0.10 }
    },
    deftPaws: {
      id: 'deftPaws',
      name: '巧爪',
      effect: { materialRetentionChance: 0.02 }
    },
    friendly: {
      id: 'friendly',
      name: '亲和',
      effect: { socialPositiveGainBonus: 0.05 }
    }
  });

  const GROWTH_TENDENCIES = deepFreeze({
    steady: { id: 'steady', name: '稳健', xpNeedMultiplier: 1, assistanceMultiplier: 1 },
    swift: { id: 'swift', name: '敏捷', xpNeedMultiplier: 0.90, assistanceMultiplier: 1 },
    spiritual: { id: 'spiritual', name: '灵慧', xpNeedMultiplier: 1.10, assistanceMultiplier: 1.10 }
  });

  function getCrop(cropId) {
    return CROPS[cropId] || null;
  }

  function getFormation(formationId) {
    return FORMATIONS[formationId] || null;
  }

  function getBeast(speciesId) {
    return BEASTS[speciesId] || null;
  }

  return Object.freeze({
    CROPS: CROPS,
    FORMATIONS: FORMATIONS,
    BEASTS: BEASTS,
    TRAITS: TRAITS,
    GROWTH_TENDENCIES: GROWTH_TENDENCIES,
    getCrop: getCrop,
    getFormation: getFormation,
    getBeast: getBeast
  });
});
