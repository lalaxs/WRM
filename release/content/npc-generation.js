(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.NpcGenerationContent = api;
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

  function namedRows(rows) {
    return rows.map(function (row) {
      return { id: row[0], name: row[1] };
    });
  }

  const GENERATION_RULES = deepFreeze({
    bootstrapCount: 120,
    activeTarget: 40,
    familyCount: 16,
    sectMembershipChance: 0.70,
    baseLifespanYears: { min: 28, max: 56 }
  });

  // 开局结构关系种子（父母 / 师徒 / NPC 道侣）。只在人口 bootstrap 后跑一次。
  const RELATION_SEED_RULES = deepFreeze({
    blood: {
      clusterCount: { min: 8, max: 12 },
      maxClustersPerFamily: 2,
      singleParentChance: 0.30,
      childrenPerCluster: { min: 1, max: 2 },
      minParentAge: 36,
      minAgeGap: 16,
      maxParentAgeGap: 25,
      affinity: 42
    },
    mentor: {
      pairCount: { min: 12, max: 20 },
      minMentorRealm: 3,
      minRealmGap: 1,
      softMinAgeGap: 8,
      disciplesPerMentor: { min: 1, max: 3 },
      requireSect: true,
      affinity: 28
    },
    daoCompanion: {
      pairCount: { min: 6, max: 10 },
      minAge: 22,
      maxAgeGap: 20,
      maxRealmGap: 3,
      sameSectWeight: 3,
      sameRegionWeight: 2,
      affinity: 55
    }
  });

  const REALM_WEIGHTS = deepFreeze([
    { realmStage: 0, weight: 400, lifespanMultiplier: 1.00 },
    { realmStage: 1, weight: 260, lifespanMultiplier: 1.05 },
    { realmStage: 2, weight: 200, lifespanMultiplier: 1.10 },
    { realmStage: 3, weight: 160, lifespanMultiplier: 1.16 },
    { realmStage: 4, weight: 125, lifespanMultiplier: 1.23 },
    { realmStage: 5, weight: 100, lifespanMultiplier: 1.31 },
    { realmStage: 6, weight: 80, lifespanMultiplier: 1.40 },
    { realmStage: 7, weight: 62, lifespanMultiplier: 1.50 },
    { realmStage: 8, weight: 48, lifespanMultiplier: 1.62 },
    { realmStage: 9, weight: 28, lifespanMultiplier: 2.50 },
    { realmStage: 10, weight: 14, lifespanMultiplier: 5.00 },
    { realmStage: 11, weight: 8, lifespanMultiplier: 10.00 },
    { realmStage: 12, weight: 4, lifespanMultiplier: 20.00 },
    { realmStage: 13, weight: 2, lifespanMultiplier: 40.00 },
    { realmStage: 14, weight: 1, lifespanMultiplier: 80.00 },
    { realmStage: 15, weight: 1, lifespanMultiplier: 160.00 }
  ]);

  const GENDERS = deepFreeze([
    { id: 'female', name: '女', weight: 45 },
    { id: 'male', name: '男', weight: 45 },
    { id: 'nonbinary', name: '无定性', weight: 10 }
  ]);

  const SURNAMES = deepFreeze(namedRows([
    ['shen', '沈'], ['gu', '顾'], ['lu', '陆'], ['su', '苏'],
    ['lin', '林'], ['ye', '叶'], ['bai', '白'], ['chu', '楚'],
    ['xie', '谢'], ['ning', '宁'], ['jiang', '江'], ['liu', '柳'],
    ['luo', '洛'], ['wen', '温'], ['xiao', '萧'], ['meng', '孟'],
    ['cheng', '程'], ['qin', '秦'], ['tang', '唐'], ['song', '宋'],
    ['xia', '夏'], ['yun', '云'], ['pei', '裴'], ['han', '韩'],
    ['wei', '卫'], ['qiao', '乔'], ['xu', '许'], ['zhou', '周'],
    ['jiang2', '姜'], ['mu', '慕'], ['sima', '司马'], ['shangguan', '上官'],
    ['wenren', '闻人'], ['ouyang', '欧阳'], ['nangong', '南宫'],
    ['duanmu', '端木']
  ]));

  const GIVEN_NAME_COMPONENTS = deepFreeze(namedRows([
    ['qing', '青'], ['wu', '梧'], ['yue', '月'], ['zhao', '昭'],
    ['ji', '霁'], ['ning', '宁'], ['lan', '岚'], ['xi', '溪'],
    ['wei', '微'], ['lan2', '澜'], ['qing2', '清'], ['he', '和'],
    ['yan', '砚'], ['zhou', '舟'], ['xuan', '玄'], ['su', '素'],
    ['yao', '遥'], ['yin', '音'], ['zhu', '竹'], ['heng', '衡'],
    ['an', '安'], ['yao2', '瑶'], ['xing', '星'], ['chen', '尘'],
    ['jing', '景'], ['chu', '初'], ['zhao2', '照'], ['wan', '晚'],
    ['qiu', '秋'], ['cen', '岑'], ['yu', '予'], ['mo', '墨'],
    ['ling', '灵'], ['yu2', '玉'], ['chuan', '川'], ['xue', '雪'],
    ['tang', '棠'], ['xiu', '修'], ['zhen', '真'], ['yun', '云'],
    ['xiao', '霄'], ['hua', '华'], ['jin', '锦'], ['ling2', '绫'],
    ['heng2', '珩'], ['yuan', '渊'], ['ze', '泽'], ['chen2', '辰']
  ]));

  const APPEARANCE_FEATURES = deepFreeze([
    { id: 'slender', name: '清瘦', slot: 'build' },
    { id: 'tall', name: '修长', slot: 'build' },
    { id: 'sturdy', name: '健实', slot: 'build' },
    { id: 'graceful', name: '轻盈', slot: 'build' },
    { id: 'clear-face', name: '清秀面容', slot: 'face' },
    { id: 'round-face', name: '圆润面容', slot: 'face' },
    { id: 'sharp-face', name: '棱角分明', slot: 'face' },
    { id: 'gentle-face', name: '温和面容', slot: 'face' },
    { id: 'heroic-face', name: '英气面容', slot: 'face' },
    { id: 'long-black', name: '乌黑长发', slot: 'hair' },
    { id: 'high-ponytail', name: '利落高束', slot: 'hair' },
    { id: 'braided', name: '细辫垂肩', slot: 'hair' },
    { id: 'silver-streak', name: '鬓间银发', slot: 'hair' },
    { id: 'short-neat', name: '齐整短发', slot: 'hair' },
    { id: 'quiet-eyes', name: '沉静眼神', slot: 'feature' },
    { id: 'bright-smile', name: '明朗笑意', slot: 'feature' },
    { id: 'sword-brows', name: '剑眉', slot: 'feature' },
    { id: 'beauty-mark', name: '眼下小痣', slot: 'feature' },
    { id: 'amber-eyes', name: '琥珀眼眸', slot: 'feature' },
    { id: 'calm-bearing', name: '从容气度', slot: 'feature' }
  ]);

  const PERSONALITY_PROFILES = deepFreeze([
    {
      id: 'chicheng',
      name: '赤诚',
      weight: 10,
      summary: '直率坦诚，快意恩仇。',
      relationModifiers: { affection: 1.08, trust: 1.05, closeness: 1.02 }
    },
    {
      id: 'qingleng',
      name: '清冷',
      weight: 10,
      summary: '性情淡泊，专注修行。',
      relationModifiers: { trust: 1.12, closeness: 0.85, dependence: 0.80 }
    },
    {
      id: 'rechen',
      name: '热忱',
      weight: 10,
      summary: '古道热肠，乐于助人。',
      relationModifiers: { affection: 1.12, closeness: 1.08, jealousy: 1.05 }
    },
    {
      id: 'shuaituo',
      name: '洒脱',
      weight: 10,
      summary: '不拘小节，好游历。',
      relationModifiers: { affection: 1.04, dependence: 0.80 }
    },
    {
      id: 'zhizhuo',
      name: '执着',
      weight: 10,
      summary: '心志坚定，专一。',
      relationModifiers: { loyalty: 1.15, romanticAttachment: 1.10, jealousy: 1.08 }
    },
    {
      id: 'renhou',
      name: '仁厚',
      weight: 10,
      summary: '心胸宽广，包容。',
      relationModifiers: { trust: 1.08, jealousy: 0.85, closeness: 1.05 }
    },
    {
      id: 'jiaojin',
      name: '骄矜',
      weight: 10,
      summary: '自信骄傲，追求卓越。',
      relationModifiers: { loyalty: 1.05, affection: 0.95, desire: 1.05 }
    },
    {
      id: 'wenya',
      name: '温雅',
      weight: 10,
      summary: '温润如玉，善于倾听。',
      relationModifiers: { trust: 1.08, closeness: 1.10, desire: 0.95 }
    }
  ]);

  const VALUE_PROFILES = deepFreeze([
    { id: 'benevolent', name: '仁善', weight: 10, priorities: ['扶助', '宽和'] },
    { id: 'righteous', name: '守义', weight: 10, priorities: ['承诺', '公道'] },
    { id: 'pragmatic', name: '求实', weight: 10, priorities: ['效率', '稳定'] },
    { id: 'scholarly', name: '尚学', weight: 10, priorities: ['学识', '传授'] },
    { id: 'family-minded', name: '顾家', weight: 10, priorities: ['亲缘', '照料'] },
    {
      id: 'freedom-seeking',
      name: '自在',
      weight: 10,
      priorities: ['自由', '游历']
    },
    {
      id: 'achievement-driven',
      name: '求成',
      weight: 10,
      priorities: ['实力', '声望']
    },
    { id: 'balanced', name: '持中', weight: 10, priorities: ['分寸', '调和'] }
  ]);

  // 道心标签：独立于性格/价值观的一层人物标签，每种都挂真实机制
  // （社交 delta 乘数 / 误解率 / 突破偏见 / 事件叙事门控）。NPC 生成时
  // 按权重抽取 1~2 个写入 records 的 traits 字段；旧档无 traits 时由
  // stage4-state 按 id 哈希派生（与 preferences 同款哈希法）。
  const DAO_HEART_TRAITS = deepFreeze([
    {
      id: 'loyal',
      name: '忠义',
      weight: 10,
      summary: '重诺守义，一旦认准便极难动摇。',
      effects: {
        loyalGrowth: 1.30,
        willfulResistance: 0
      }
    },
    {
      id: 'willful',
      name: '执拗',
      weight: 10,
      summary: '心志极坚，软磨硬泡反而不易打动。',
      effects: {
        willfulResistance: 0.15,
        loyalGrowth: 0
      }
    },
    {
      id: 'generous',
      name: '慷慨',
      weight: 10,
      summary: '出手大方，也最容易被真心打动。',
      effects: {
        giftAffection: 1.30,
        giftMisunderstandingScale: 0.5
      }
    },
    {
      id: 'thrifty',
      name: '节俭',
      weight: 10,
      summary: '惜物重理，礼物难以收买，交心却可长久。',
      effects: {
        giftAffection: 0.80,
        marketTrust: 1.10
      }
    },
    {
      id: 'scholarly',
      name: '好古',
      weight: 10,
      summary: '嗜读古卷，论道最能引为知己。',
      effects: {
        daoTrust: 1.30
      }
    },
    {
      id: 'pious',
      name: '敬天',
      weight: 10,
      summary: '敬畏天道，心性契合天地规律，渡劫更顺。',
      effects: {
        breakthroughBias: 0.1
      }
    },
    {
      id: 'principled',
      name: '方正',
      weight: 10,
      summary: '一板一眼，认死理，也最重名分。',
      effects: {
        loyalGrowth: 1.20,
        principledRigidity: 0.1
      }
    },
    {
      id: 'wanderer',
      name: '逍遥',
      weight: 10,
      summary: '云游四方，最不耐烦被一处牵绊。',
      effects: {
        outingAffection: 1.20,
        stayAffection: 0.90
      }
    }
  ]);

  // 对标原版 _lg / linggen0..7 + dns.lg_exp
  // 权重：高档稀有，杂/多灵根更常见（原版造人权未钉死，按档次稀有度）
  const SPIRITUAL_ROOTS = deepFreeze([
    {
      id: 'mutant-heaven',
      name: '变异天灵根',
      lgIndex: 0,
      lgExp: 180,
      weight: 1,
      efficiencyMult: 1.8,
      traits: ['天资', '变异']
    },
    {
      id: 'heaven',
      name: '天灵根',
      lgIndex: 1,
      lgExp: 150,
      weight: 2,
      efficiencyMult: 1.5,
      traits: ['天资']
    },
    {
      id: 'mutant',
      name: '变异灵根',
      lgIndex: 2,
      lgExp: 130,
      weight: 4,
      efficiencyMult: 1.3,
      traits: ['变异']
    },
    {
      id: 'single',
      name: '单灵根',
      lgIndex: 3,
      lgExp: 100,
      weight: 18,
      efficiencyMult: 1.0,
      traits: ['纯粹']
    },
    {
      id: 'dual',
      name: '双灵根',
      lgIndex: 4,
      lgExp: 90,
      weight: 22,
      efficiencyMult: 0.9,
      traits: ['双行']
    },
    {
      id: 'triple',
      name: '三灵根',
      lgIndex: 5,
      lgExp: 80,
      weight: 20,
      efficiencyMult: 0.8,
      traits: ['驳杂']
    },
    {
      id: 'quad',
      name: '四灵根',
      lgIndex: 6,
      lgExp: 70,
      weight: 16,
      efficiencyMult: 0.7,
      traits: ['驳杂']
    },
    {
      id: 'mixed',
      name: '杂灵根',
      lgIndex: 7,
      lgExp: 60,
      weight: 28,
      efficiencyMult: 0.6,
      traits: ['驳杂']
    }
  ]);

  // 旧五行/伪灵根 → 原版档（读档兼容）
  const SPIRITUAL_ROOT_ALIASES = deepFreeze({
    metal: 'single',
    wood: 'single',
    water: 'single',
    fire: 'single',
    earth: 'dual',
    'mutant-ice': 'mutant',
    'mutant-thunder': 'mutant',
    waste: 'mixed'
  });

  const TALENTS = deepFreeze([
    {
      id: 'wood-spirit',
      name: '木灵亲和',
      weight: 10,
      affinities: [{ kind: 'skill', targetId: 'herb', multiplier: 1.12 }]
    },
    {
      id: 'metal-spirit',
      name: '金灵亲和',
      weight: 10,
      affinities: [{ kind: 'skill', targetId: 'forging', multiplier: 1.12 }]
    },
    {
      id: 'water-spirit',
      name: '水灵亲和',
      weight: 10,
      affinities: [{ kind: 'skill', targetId: 'fishing', multiplier: 1.12 }]
    },
    {
      id: 'fire-spirit',
      name: '火灵亲和',
      weight: 10,
      affinities: [{ kind: 'skill', targetId: 'alchemy', multiplier: 1.12 }]
    },
    {
      id: 'earth-spirit',
      name: '土灵亲和',
      weight: 10,
      affinities: [{ kind: 'skill', targetId: 'formation', multiplier: 1.12 }]
    },
    {
      id: 'sword-heart',
      name: '剑心初明',
      weight: 8,
      affinities: [{
        kind: 'technique',
        targetId: 'cloudPiercingSword',
        multiplier: 1.10
      }]
    },
    {
      id: 'beast-affinity',
      name: '灵兽亲和',
      weight: 10,
      affinities: [{
        kind: 'skill',
        targetId: 'beastTaming',
        multiplier: 1.12
      }]
    },
    {
      id: 'talisman-insight',
      name: '符意通明',
      weight: 10,
      affinities: [{ kind: 'skill', targetId: 'talisman', multiplier: 1.12 }]
    },
    {
      id: 'farm-blessing',
      name: '沃土之缘',
      weight: 10,
      affinities: [{ kind: 'skill', targetId: 'farming', multiplier: 1.12 }]
    },
    {
      id: 'cooking-sense',
      name: '百味灵感',
      weight: 10,
      affinities: [{ kind: 'skill', targetId: 'cooking', multiplier: 1.12 }]
    },
    {
      id: 'woodcraft',
      name: '识木之眼',
      weight: 10,
      affinities: [{ kind: 'skill', targetId: 'woodcutting', multiplier: 1.12 }]
    },
    {
      id: 'ore-sense',
      name: '听矿之耳',
      weight: 10,
      affinities: [{ kind: 'skill', targetId: 'mining', multiplier: 1.12 }]
    }
  ]);

  const ROMANCE_PRINCIPLES = deepFreeze([
    {
      id: 'exclusive',
      name: '专一',
      weight: 20,
      summary: '必须为唯一结契对象，否则心动易锁定。'
    },
    {
      id: 'devoted',
      name: '从一而终',
      weight: 35,
      summary: '默认唯一，特殊条件可破例再多容忍一二人。'
    },
    {
      id: 'tolerant',
      name: '宽和',
      weight: 30,
      summary: '接受多结契，吃醋增长较慢。'
    },
    {
      id: 'casual',
      name: '随性',
      weight: 15,
      summary: '不太在意契约形式，随缘而合。'
    }
  ]);

  function findById(entries, id) {
    for (let index = 0; index < entries.length; index++) {
      if (entries[index].id === id) return entries[index];
    }
    return null;
  }

  function getPersonality(personalityId) {
    return findById(PERSONALITY_PROFILES, personalityId);
  }

  function getValueProfile(valueProfileId) {
    return findById(VALUE_PROFILES, valueProfileId);
  }

  function getTalent(talentId) {
    return findById(TALENTS, talentId);
  }

  function getSpiritualRoot(rootId) {
    let id = rootId;
    if (typeof id === 'string' && SPIRITUAL_ROOT_ALIASES[id]) {
      id = SPIRITUAL_ROOT_ALIASES[id];
    }
    return findById(SPIRITUAL_ROOTS, id);
  }

  function getRomancePrinciple(principleId) {
    return findById(ROMANCE_PRINCIPLES, principleId);
  }

  function getDaoHeartTrait(traitId) {
    return findById(DAO_HEART_TRAITS, traitId);
  }

  function cultivationEfficiencyFor(realmStage, spiritualRootId, variance) {
    const stage = Math.max(0, Math.floor(Number(realmStage) || 0));
    const root = getSpiritualRoot(spiritualRootId);
    const lg = root && Number.isFinite(root.lgIndex) ? root.lgIndex : 3;
    const stub = {
      realmStage: stage,
      level_l: stage <= 8 ? stage : Math.min(9, 8 + Math.ceil((stage - 8) / 2)),
      expsx: 0.9 + (Number.isFinite(variance) ? variance : 0.5) * 0.5,
      lg: lg,
      spiritualRootId: spiritualRootId
    };
    function resolveDns() {
      if (typeof globalThis !== 'undefined' && globalThis.Dns) {
        return globalThis.Dns;
      }
      if (typeof require === 'function') {
        try { return require('../core/dns.js'); } catch (e) { return null; }
      }
      return null;
    }
    const Dns = resolveDns();
    if (Dns && typeof Dns.cultivationPerMonth === 'function') {
      return Dns.cultivationPerMonth(stub);
    }
    if (Dns && typeof Dns.getexps === 'function') {
      return Dns.getexps(stub);
    }
    return 1;
  }

  // 道心标签 id 列表 → 显示名列表（保留顺序，去重，忽略非法 id）。
  function daoHeartTraitNames(traitIds) {
    const names = [];
    const seen = {};
    (Array.isArray(traitIds) ? traitIds : []).forEach(function (id) {
      if (typeof id !== 'string' || seen[id]) return;
      seen[id] = true;
      const trait = getDaoHeartTrait(id);
      if (trait) names.push(trait.name);
    });
    return names;
  }

  // 道心标签 id 列表 → { id, name, summary, effects } 视图列表。
  function daoHeartTraitViews(traitIds) {
    const views = [];
    const seen = {};
    (Array.isArray(traitIds) ? traitIds : []).forEach(function (id) {
      if (typeof id !== 'string' || seen[id]) return;
      seen[id] = true;
      const trait = getDaoHeartTrait(id);
      if (trait) {
        views.push({
          id: trait.id,
          name: trait.name,
          summary: trait.summary,
          effects: trait.effects
        });
      }
    });
    return views;
  }

  return Object.freeze({
    GENERATION_RULES: GENERATION_RULES,
    RELATION_SEED_RULES: RELATION_SEED_RULES,
    REALM_WEIGHTS: REALM_WEIGHTS,
    GENDERS: GENDERS,
    SURNAMES: SURNAMES,
    GIVEN_NAME_COMPONENTS: GIVEN_NAME_COMPONENTS,
    APPEARANCE_FEATURES: APPEARANCE_FEATURES,
    PERSONALITY_PROFILES: PERSONALITY_PROFILES,
    VALUE_PROFILES: VALUE_PROFILES,
    DAO_HEART_TRAITS: DAO_HEART_TRAITS,
    SPIRITUAL_ROOTS: SPIRITUAL_ROOTS,
    SPIRITUAL_ROOT_ALIASES: SPIRITUAL_ROOT_ALIASES,
    TALENTS: TALENTS,
    ROMANCE_PRINCIPLES: ROMANCE_PRINCIPLES,
    getPersonality: getPersonality,
    getValueProfile: getValueProfile,
    getTalent: getTalent,
    getSpiritualRoot: getSpiritualRoot,
    getRomancePrinciple: getRomancePrinciple,
    getDaoHeartTrait: getDaoHeartTrait,
    daoHeartTraitNames: daoHeartTraitNames,
    daoHeartTraitViews: daoHeartTraitViews,
    cultivationEfficiencyFor: cultivationEfficiencyFor
  });
});
