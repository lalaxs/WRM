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
      id: 'steady',
      name: '沉稳',
      weight: 10,
      summary: '看重长期积累，态度变化较慢但持久。',
      relationModifiers: { trust: 1.10, resentment: 0.90 }
    },
    {
      id: 'direct',
      name: '直率',
      weight: 10,
      summary: '喜欢清楚表达，也更快回应坦诚。',
      relationModifiers: { affection: 1.05, resentment: 1.05 }
    },
    {
      id: 'patient',
      name: '耐心',
      weight: 10,
      summary: '愿意花时间倾听，不容易因小事动摇。',
      relationModifiers: { trust: 1.08, jealousy: 0.85 }
    },
    {
      id: 'practical',
      name: '务实',
      weight: 10,
      summary: '重视可靠行动与实际结果。',
      relationModifiers: { trust: 1.05, dependence: 0.90 }
    },
    {
      id: 'forthright',
      name: '爽朗',
      weight: 10,
      summary: '待人热情，情绪来得快也去得快。',
      relationModifiers: { affection: 1.10, resentment: 0.85 }
    },
    {
      id: 'diplomatic',
      name: '圆融',
      weight: 10,
      summary: '擅长体察他人，也愿意寻找折中办法。',
      relationModifiers: { trust: 1.06, jealousy: 0.90 }
    },
    {
      id: 'curious',
      name: '好奇',
      weight: 10,
      summary: '乐于接触新人物、新技艺与新见闻。',
      relationModifiers: { affection: 1.06, dependence: 0.95 }
    },
    {
      id: 'reserved',
      name: '内敛',
      weight: 10,
      summary: '不轻易显露心意，建立信任后十分认真。',
      relationModifiers: { trust: 1.12, affection: 0.92 }
    },
    {
      id: 'warm',
      name: '温厚',
      weight: 10,
      summary: '习惯照顾身边的人，也珍惜日常陪伴。',
      relationModifiers: { affection: 1.08, dependence: 1.05 }
    },
    {
      id: 'ambitious',
      name: '进取',
      weight: 10,
      summary: '看重成长与成就，欣赏有行动力的人。',
      relationModifiers: { loyalty: 1.05, resentment: 1.02 }
    },
    {
      id: 'free-spirited',
      name: '洒脱',
      weight: 10,
      summary: '重视自由选择，不喜欢被过度约束。',
      relationModifiers: { affection: 1.04, dependence: 0.80 }
    },
    {
      id: 'meticulous',
      name: '缜密',
      weight: 10,
      summary: '重视细节与承诺，对失约也更敏感。',
      relationModifiers: { trust: 1.10, resentment: 1.08 }
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
      id: 'open',
      name: '接受开放关系',
      weight: 20,
      summary: '更看重坦诚与共同约定。'
    },
    {
      id: 'negotiable',
      name: '可以协商',
      weight: 35,
      summary: '愿意通过长期相处讨论彼此边界。'
    },
    {
      id: 'monogamous',
      name: '倾向专一',
      weight: 35,
      summary: '通常希望双方保持专一。'
    },
    {
      id: 'absolute-monogamy',
      name: '要求绝对专一',
      weight: 10,
      summary: '把双方绝对专一视为重要承诺。'
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

  function getRomancePrinciple(principleId) {
    return findById(ROMANCE_PRINCIPLES, principleId);
  }

  return Object.freeze({
    GENERATION_RULES: GENERATION_RULES,
    REALM_WEIGHTS: REALM_WEIGHTS,
    GENDERS: GENDERS,
    SURNAMES: SURNAMES,
    GIVEN_NAME_COMPONENTS: GIVEN_NAME_COMPONENTS,
    APPEARANCE_FEATURES: APPEARANCE_FEATURES,
    PERSONALITY_PROFILES: PERSONALITY_PROFILES,
    VALUE_PROFILES: VALUE_PROFILES,
    TALENTS: TALENTS,
    ROMANCE_PRINCIPLES: ROMANCE_PRINCIPLES,
    getPersonality: getPersonality,
    getValueProfile: getValueProfile,
    getTalent: getTalent,
    getRomancePrinciple: getRomancePrinciple
  });
});
