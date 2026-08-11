(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.SocialInteractionContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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

  function rewards(charmXp, cultivation, skillXp, techniqueUnderstanding) {
    return {
      charmXp: charmXp,
      charmXpSource: 'social',
      cultivation: cultivation,
      skillXp: skillXp || [],
      techniqueUnderstanding: techniqueUnderstanding || [],
      temporaryBenefits: []
    };
  }

  function relation(playerToPerson, personToPlayer, misunderstandingChance) {
    return {
      playerToPerson: playerToPerson,
      personToPlayer: personToPlayer,
      misunderstandingChance: misunderstandingChance
    };
  }

  function shared(id, label, durationSeconds, relationship, benefit) {
    return {
      id: id,
      label: label,
      durationSeconds: durationSeconds,
      availability: { kind: 'shared', sectIds: [] },
      relationship: relationship,
      rewards: benefit
    };
  }

  function sectSpecific(
    id,
    label,
    sectId,
    durationSeconds,
    relationship,
    benefit
  ) {
    return {
      id: id,
      label: label,
      durationSeconds: durationSeconds,
      availability: { kind: 'sect', sectIds: [sectId] },
      relationship: relationship,
      rewards: benefit
    };
  }

  const SHARED_INTERACTIONS = deepFreeze([
    shared(
      'talk',
      '交谈',
      120,
      relation({ affection: 2, trust: 1 }, { affection: 1 }, 0.08),
      rewards(6, 2)
    ),
    shared(
      'gift',
      '赠礼',
      60,
      relation({ affection: 3 }, { affection: 3, trust: 1 }, 0.04),
      rewards(8, 1)
    ),
    shared(
      'accompany',
      '陪伴',
      300,
      relation({ affection: 3, trust: 2 }, { affection: 2, trust: 2 }, 0.05),
      rewards(10, 5)
    ),
    shared(
      'discussDao',
      '论道',
      480,
      relation({ trust: 3 }, { trust: 3 }, 0.06),
      rewards(
        14,
        12,
        [],
        [{ techniqueId: 'steadyBreath', amount: 2 }]
      )
    ),
    shared(
      'outing',
      '出游',
      900,
      relation({ affection: 4, trust: 2 }, { affection: 3, trust: 2 }, 0.09),
      rewards(18, 16)
    ),
    shared(
      'visit',
      '拜访',
      600,
      relation({ trust: 3 }, { affection: 2, trust: 3 }, 0.07),
      rewards(14, 10)
    ),
    shared(
      'cultivateTogether',
      '与某人一起修炼',
      1200,
      relation(
        { affection: 3, trust: 3 },
        { affection: 3, trust: 3 },
        0.05
      ),
      rewards(
        24,
        40,
        [],
        [{ techniqueId: 'gatheringBreath', amount: 3 }]
      )
    )
  ]);

  const SPECIFIC_INTERACTIONS = deepFreeze([
    sectSpecific(
      'taixuanSwordPractice',
      '同练剑式',
      'taixuan-sword',
      720,
      relation({ trust: 3 }, { trust: 3, affection: 1 }, 0.07),
      rewards(
        18,
        24,
        [],
        [{ techniqueId: 'cloudPiercingSword', amount: 4 }]
      )
    ),
    sectSpecific(
      'taixuanForgeExchange',
      '共研剑器',
      'taixuan-sword',
      660,
      relation({ trust: 2 }, { trust: 3 }, 0.06),
      rewards(16, 16, [{ skillId: 'forging', xp: 14 }])
    ),
    sectSpecific(
      'baicaoHerbWalk',
      '结伴辨识草木',
      'baicao-valley',
      720,
      relation({ affection: 2, trust: 2 }, { affection: 2, trust: 2 }, 0.04),
      rewards(16, 14, [{ skillId: 'herb', xp: 16 }])
    ),
    sectSpecific(
      'baicaoAlchemyExchange',
      '交流丹理',
      'baicao-valley',
      780,
      relation({ trust: 3 }, { trust: 3 }, 0.05),
      rewards(
        18,
        18,
        [{ skillId: 'alchemy', xp: 14 }],
        [{ techniqueId: 'clearHeartArt', amount: 3 }]
      )
    ),
    sectSpecific(
      'tiangongArtifactStudy',
      '拆解机关器',
      'tiangong-pavilion',
      720,
      relation({ trust: 2 }, { trust: 3 }, 0.07),
      rewards(16, 16, [{ skillId: 'forging', xp: 14 }])
    ),
    sectSpecific(
      'tiangongFormationDraft',
      '合绘阵图',
      'tiangong-pavilion',
      840,
      relation({ trust: 3 }, { trust: 3, affection: 1 }, 0.05),
      rewards(
        18,
        18,
        [{ skillId: 'formation', xp: 16 }],
        [{ techniqueId: 'starfallArray', amount: 2 }]
      )
    ),
    sectSpecific(
      'spiritBeastCare',
      '一同照料灵兽',
      'spirit-beast-mountain',
      720,
      relation({ affection: 3, trust: 2 }, { affection: 3 }, 0.05),
      rewards(
        18,
        16,
        [{ skillId: 'beastTaming', xp: 16 }],
        [{ techniqueId: 'beastEcho', amount: 3 }]
      )
    ),
    sectSpecific(
      'spiritFieldVisit',
      '走访灵田',
      'spirit-beast-mountain',
      660,
      relation({ affection: 2, trust: 2 }, { affection: 2, trust: 2 }, 0.04),
      rewards(16, 14, [{ skillId: 'farming', xp: 14 }])
    ),
    sectSpecific(
      'qingyinTalismanExchange',
      '共研符意',
      'qingyin-palace',
      720,
      relation({ trust: 3 }, { trust: 3 }, 0.04),
      rewards(
        18,
        16,
        [{ skillId: 'talisman', xp: 16 }],
        [{ techniqueId: 'bindingTalisman', amount: 3 }]
      )
    ),
    sectSpecific(
      'qingyinHeartMusic',
      '静听清心曲',
      'qingyin-palace',
      600,
      relation({ affection: 2, trust: 3 }, { affection: 2, trust: 2 }, 0.03),
      rewards(
        18,
        14,
        [],
        [{ techniqueId: 'steadyBreath', amount: 3 }]
      )
    )
  ]);

  const ALL_INTERACTIONS =
    deepFreeze(SHARED_INTERACTIONS.concat(SPECIFIC_INTERACTIONS));
  const BY_ID = Object.create(null);
  ALL_INTERACTIONS.forEach(function (interaction) {
    BY_ID[interaction.id] = interaction;
  });
  deepFreeze(BY_ID);

  function get(interactionId) {
    if (typeof interactionId !== 'string') return null;
    return Object.prototype.hasOwnProperty.call(BY_ID, interactionId)
      ? BY_ID[interactionId]
      : null;
  }

  function list() {
    return ALL_INTERACTIONS;
  }

  function forSect(sectId) {
    return deepFreeze(ALL_INTERACTIONS.filter(function (interaction) {
      return interaction.availability.kind === 'shared'
        || interaction.availability.sectIds.includes(sectId);
    }));
  }

  return Object.freeze({
    SHARED_INTERACTIONS: SHARED_INTERACTIONS,
    SPECIFIC_INTERACTIONS: SPECIFIC_INTERACTIONS,
    ALL_INTERACTIONS: ALL_INTERACTIONS,
    get: get,
    list: list,
    forSect: forSect
  });
});
