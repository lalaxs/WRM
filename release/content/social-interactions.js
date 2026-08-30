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

  function requiredAffectionValue(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0
      ? Math.floor(amount)
      : 0;
  }

  function shared(
    id,
    label,
    durationSeconds,
    relationship,
    benefit,
    requiredAffection,
    options
  ) {
    const opts = options && typeof options === 'object' ? options : {};
    return {
      id: id,
      label: label,
      durationSeconds: durationSeconds,
      requiredAffection: requiredAffectionValue(requiredAffection),
      requiredTags: Array.isArray(opts.requiredTags) ? opts.requiredTags.slice() : [],
      requiredAnyTags: Array.isArray(opts.requiredAnyTags)
        ? opts.requiredAnyTags.slice()
        : [],
      forbiddenTags: Array.isArray(opts.forbiddenTags)
        ? opts.forbiddenTags.slice()
        : [],
      requiredRomanticAttachment: Number.isFinite(opts.requiredRomanticAttachment)
        ? Math.floor(opts.requiredRomanticAttachment)
        : 0,
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
    benefit,
    requiredAffection
  ) {
    return {
      id: id,
      label: label,
      durationSeconds: durationSeconds,
      requiredAffection: requiredAffectionValue(requiredAffection),
      availability: { kind: 'sect', sectIds: [sectId] },
      relationship: relationship,
      rewards: benefit
    };
  }

  // requiredAffection：对方对我方好感达到后才解锁。
  const SHARED_INTERACTIONS = deepFreeze([
    shared(
      'talk',
      '接近',
      120,
      relation({ affection: 2, trust: 1 }, { affection: 1 }, 0.08),
      rewards(6, 2),
      0
    ),
    shared(
      'gift',
      '赠礼',
      60,
      relation({ affection: 3 }, { affection: 3, trust: 1 }, 0.04),
      rewards(8, 1),
      10
    ),
    shared(
      'accompany',
      '陪伴',
      300,
      relation({ affection: 3, trust: 2 }, { affection: 2, trust: 2 }, 0.05),
      rewards(10, 5),
      20
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
      ),
      35
    ),
    shared(
      'outing',
      '出游',
      900,
      relation({ affection: 4, trust: 2 }, { affection: 3, trust: 2 }, 0.09),
      rewards(18, 16),
      45
    ),
    shared(
      'visit',
      '拜访',
      600,
      relation({ trust: 3 }, { affection: 2, trust: 3 }, 0.07),
      rewards(14, 10),
      25
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
      ),
      55
    ),
    shared(
      'repayKindness',
      '报答恩情',
      480,
      relation(
        { affection: 8, trust: 6, romanticAttachment: 4 },
        { affection: 10, trust: 8, romanticAttachment: 5 },
        0.03
      ),
      rewards(20, 12),
      0,
      { requiredTags: ['life-debt'] }
    ),
    shared(
      'confess',
      '表白心意',
      600,
      relation(
        { affection: 6, trust: 4, romanticAttachment: 12 },
        { affection: 8, trust: 4, romanticAttachment: 14 },
        0.12
      ),
      rewards(22, 10),
      45,
      {
        requiredRomanticAttachment: 20,
        requiredAnyTags: ['friend', 'close-friend', 'life-debt', 'impressed'],
        forbiddenTags: ['enemy', 'partner']
      }
    ),
    shared(
      'formPartnership',
      '结为道侣',
      900,
      relation(
        { affection: 8, trust: 8, romanticAttachment: 10, loyalty: 10 },
        { affection: 10, trust: 8, romanticAttachment: 10, loyalty: 10 },
        0.08
      ),
      rewards(28, 16),
      60,
      {
        requiredRomanticAttachment: 40,
        requiredAnyTags: ['lover'],
        forbiddenTags: ['enemy']
      }
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
      ),
      30
    ),
    sectSpecific(
      'taixuanForgeExchange',
      '共研剑器',
      'taixuan-sword',
      660,
      relation({ trust: 2 }, { trust: 3 }, 0.06),
      rewards(16, 16, [{ skillId: 'forging', xp: 14 }]),
      30
    ),
    sectSpecific(
      'baicaoHerbWalk',
      '结伴辨识草木',
      'baicao-valley',
      720,
      relation({ affection: 2, trust: 2 }, { affection: 2, trust: 2 }, 0.04),
      rewards(16, 14, [{ skillId: 'herb', xp: 16 }]),
      30
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
      ),
      35
    ),
    sectSpecific(
      'tiangongArtifactStudy',
      '拆解机关器',
      'tiangong-pavilion',
      720,
      relation({ trust: 2 }, { trust: 3 }, 0.07),
      rewards(16, 16, [{ skillId: 'forging', xp: 14 }]),
      30
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
      ),
      35
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
      ),
      30
    ),
    sectSpecific(
      'spiritFieldVisit',
      '走访灵田',
      'spirit-beast-mountain',
      660,
      relation({ affection: 2, trust: 2 }, { affection: 2, trust: 2 }, 0.04),
      rewards(16, 14, [{ skillId: 'farming', xp: 14 }]),
      25
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
      ),
      30
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
      ),
      25
    )
  ]);

  const ALL_INTERACTIONS =
    deepFreeze(SHARED_INTERACTIONS.concat(SPECIFIC_INTERACTIONS));
  const BY_ID = Object.create(null);
  ALL_INTERACTIONS.forEach(function (interaction) {
    BY_ID[interaction.id] = interaction;
  });
  deepFreeze(BY_ID);

  const SOCIAL_NARRATIVES = deepFreeze({
    talk: {
      start: '你想接近{name}，开口前手心已悄悄出了汗。',
      progress: '你正与{name}交谈，话越平常，心跳越响。',
      complete: '你在【{loc}】与【{name}】接近片刻；对方表面淡淡应着，你却看见{pronoun}睫毛颤了一下。'
    },
    gift: {
      start: '你带着一份心意去寻{name}，掌心因紧张而发热。',
      progress: '你正赶往{name}处，想把礼物递上，又怕太过唐突。',
      complete: '你在【{loc}】把礼物交给【{name}】，嘴上说随手带的；对方接过时目光在你脸上停得太久。'
    },
    accompany: {
      start: '你想陪{name}一段路，启程时脚步比平时轻。',
      progress: '你寻到{name}身边，沉默并不尴尬，反而让人不敢先开口。',
      complete: '你与【{name}】在【{loc}】相伴；临别时{pronoun}表面上先转身，脚步却放得很慢。'
    },
    discussDao: {
      start: '你想与{name}论道，带着几个真正想问清的疑问。',
      progress: '你走向{name}，准备借机请教，心却比剑意更沉。',
      complete: '你与【{name}】在【{loc}】论道相持；末了一同沉默，谁都把半句未竟之言咽了回去。'
    },
    outing: {
      start: '你邀{name}出游，启程前反复确认自己没有说错时辰。',
      progress: '你赶往会合，既期待又怕对方只是客套应下。',
      complete: '你与【{name}】在【{loc}】出游一程。回来时彼此都放慢了半步，有话却没说出口。'
    },
    visit: {
      start: '你想拜访{name}，门外停了停，才抬手敲门。',
      progress: '你前往{name}居所，袖中手心却在出汗。',
      complete: '你在【{loc}】拜访【{name}】；客套之后略叙近况，临走时对方多送了你一程。'
    },
    cultivateTogether: {
      start: '你想与{name}一起修炼，既为精进，也为靠近。',
      progress: '你赶往{name}处，准备并肩吐纳，呼吸已先乱了半拍。',
      complete: '你与【{name}】在【{loc}】一同修炼；收功时对上目光，两人都像被烫到，又装作若无其事。'
    },
    repayKindness: {
      start: '你记得那次救命之恩，想去见{name}，把亏欠说出口。',
      progress: '你赶往{name}处，话在喉间滚了又滚。',
      complete: '你在【{loc}】向【{name}】报答恩情；对方摇头不允，收下时指尖却发颤。'
    },
    confess: {
      start: '你想向{name}表明心意，明知可能无功，仍迈出了一步。',
      progress: '你走向{name}，表面镇定，袖中手心却全是汗。',
      complete: '你在【{loc}】向【{name}】道明心意；对方沉默片刻，喉结轻轻一滚，却没有退避。'
    },
    formPartnership: {
      start: '你想与{name}结为道侣，此念一起便再难按捺。',
      progress: '你赶往{name}处，准备立誓，指尖冰凉。',
      complete: '你与【{name}】在【{loc}】结下道侣之契；应声很轻，眼眶却红了，十指终于交扣。'
    },
    taixuanSwordPractice: {
      start: '你想与{name}同练剑式，已动身前去。',
      progress: '你正走向{name}，准备同练剑式，剑意却先乱了半寸。',
      complete: '你与【{name}】在【{loc}】同练剑式，险些分出胜负，收势时却都留了三分余地。'
    },
    taixuanForgeExchange: {
      start: '你想与{name}共研剑器，已动身前去。',
      progress: '你正赶往{name}处，准备共研剑器。',
      complete: '你与【{name}】在【{loc}】共研剑器，火花迸溅间，话却比刀锋更软了一些。'
    },
    baicaoHerbWalk: {
      start: '你想与{name}结伴识草，已动身前去。',
      progress: '你正走向{name}，准备结伴辨识草木。',
      complete: '你与【{name}】在【{loc}】结伴识草，所得颇丰；分药时指尖相触，两人都装作未觉。'
    },
    baicaoAlchemyExchange: {
      start: '你想与{name}交流丹理，已动身前去。',
      progress: '你正赶往{name}处，准备交流丹理。',
      complete: '你与【{name}】在【{loc}】交流丹理，火候将成时，竟一同屏住了呼吸。'
    },
    tiangongArtifactStudy: {
      start: '你想与{name}拆解机关，已动身前去。',
      progress: '你正走向{name}，准备一同拆解机关器。',
      complete: '你与【{name}】在【{loc}】拆解机关器，卡壳处你先放弃，对方却伸手帮你按住了簧片。'
    },
    tiangongFormationDraft: {
      start: '你想与{name}合绘阵图，已动身前去。',
      progress: '你正赶往{name}处，准备合绘阵图。',
      complete: '你与【{name}】在【{loc}】合绘阵图，笔锋交错时，阵意渐成，默契也是。'
    },
    spiritBeastCare: {
      start: '你想与{name}一同照料灵兽，已动身前去。',
      progress: '你正走向{name}，准备一同照料灵兽。',
      complete: '你与【{name}】在【{loc}】照料灵兽，气氛温软；兽儿亲昵地蹭过两人，反而让你们都红了耳尖。'
    },
    spiritFieldVisit: {
      start: '你想与{name}走访灵田，已动身前去。',
      progress: '你正赶往{name}处，准备走访灵田。',
      complete: '你与【{name}】在【{loc}】走访灵田，见闻渐丰；夕阳里，谁都没有先提归去。'
    },
    qingyinTalismanExchange: {
      start: '你想与{name}共研符意，已动身前去。',
      progress: '你正走向{name}，准备共研符意。',
      complete: '你与【{name}】在【{loc}】共研符意，符理渐通；落笔时你们的呼吸竟齐了。'
    },
    qingyinHeartMusic: {
      start: '你想去听{name}的清心曲，已动身前去。',
      progress: '你正赶往{name}处，准备静听清心曲。',
      complete: '你在【{loc}】听【{name}】奏清心曲，心绪渐平；曲终却舍不得先鼓掌，怕惊散那一点余韵。'
    }
  });

  function narrativeContext(input) {
    const source = input && typeof input === 'object' ? input : {};
    return {
      name: typeof source.name === 'string' && source.name
        ? source.name
        : '对方',
      pronoun: typeof source.pronoun === 'string' && source.pronoun
        ? source.pronoun
        : '对方',
      loc: typeof source.loc === 'string' && source.loc
        ? source.loc
        : '某处',
      you: typeof source.you === 'string' && source.you
        ? source.you
        : '无名'
    };
  }

  function fillNarrative(template, ctx) {
    let text = String(template || '')
      .split('{name}').join(ctx.name)
      .split('{pronoun}').join(ctx.pronoun)
      .split('{loc}').join(ctx.loc)
      .split('{you}').join(ctx.you);
    if (ctx.you && text.indexOf(ctx.you) < 0) {
      text = text
        .replace(/^你与/, ctx.you + '与')
        .replace(/^你在/, ctx.you + '在')
        .replace(/^你正/, ctx.you + '正')
        .replace(/^你开始/, ctx.you + '开始')
        .replace(/^你/, ctx.you);
    }
    return text;
  }

  function getNarrative(interactionId, phase, input) {
    const row = typeof interactionId === 'string'
      ? SOCIAL_NARRATIVES[interactionId]
      : null;
    const template = row && row[phase]
      ? row[phase]
      : (phase === 'complete'
        ? '你与【{name}】在【{loc}】完成了一次相处。'
        : (phase === 'progress'
          ? '你正与{name}相处。'
          : '你开始与{name}互动。'));
    return fillNarrative(template, narrativeContext(input));
  }

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
    SOCIAL_NARRATIVES: SOCIAL_NARRATIVES,
    get: get,
    list: list,
    forSect: forSect,
    getNarrative: getNarrative
  });
});
