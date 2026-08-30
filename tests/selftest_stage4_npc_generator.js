'use strict';

const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const GameRandom = require('../core/random.js');
const RegionContent = require('../content/regions.js');
const SectContent = require('../content/sects.js');
const NpcGenerationContent = require('../content/npc-generation.js');

let NpcGenerator = null;
try {
  NpcGenerator = require('../core/npc-generator.js');
} catch (error) {
  NpcGenerator = null;
}

let passed = 0;
let failed = 0;

function ok(condition, label) {
  if (condition) {
    passed++;
    console.log('✓ ' + label);
  } else {
    failed++;
    console.error('✗ ' + label);
  }
}

function bundle(order) {
  const result = {};
  (order || ['regions', 'sects', 'generation']).forEach(function (key) {
    if (key === 'regions') result.regions = RegionContent;
    if (key === 'sects') result.sects = SectContent;
    if (key === 'generation') {
      result.generation = NpcGenerationContent;
    }
  });
  return result;
}

function generationWith(overrides) {
  overrides = overrides || {};
  return {
    GENERATION_RULES: overrides.GENERATION_RULES ||
      NpcGenerationContent.GENERATION_RULES,
    REALM_WEIGHTS: overrides.REALM_WEIGHTS ||
      NpcGenerationContent.REALM_WEIGHTS,
    GENDERS: overrides.GENDERS || NpcGenerationContent.GENDERS,
    SURNAMES: overrides.SURNAMES || NpcGenerationContent.SURNAMES,
    GIVEN_NAME_COMPONENTS: overrides.GIVEN_NAME_COMPONENTS ||
      NpcGenerationContent.GIVEN_NAME_COMPONENTS,
    APPEARANCE_FEATURES: overrides.APPEARANCE_FEATURES ||
      NpcGenerationContent.APPEARANCE_FEATURES,
    PERSONALITY_PROFILES: overrides.PERSONALITY_PROFILES ||
      NpcGenerationContent.PERSONALITY_PROFILES,
    VALUE_PROFILES: overrides.VALUE_PROFILES ||
      NpcGenerationContent.VALUE_PROFILES,
    TALENTS: overrides.TALENTS || NpcGenerationContent.TALENTS,
    SPIRITUAL_ROOTS: overrides.SPIRITUAL_ROOTS ||
      NpcGenerationContent.SPIRITUAL_ROOTS,
    ROMANCE_PRINCIPLES: overrides.ROMANCE_PRINCIPLES ||
      NpcGenerationContent.ROMANCE_PRINCIPLES,
    DAO_HEART_TRAITS: overrides.DAO_HEART_TRAITS ||
      NpcGenerationContent.DAO_HEART_TRAITS
  };
}

function contentWithGeneration(generation) {
  return {
    regions: RegionContent,
    sects: SectContent,
    generation: generation
  };
}

function cloneRealmRows() {
  return NpcGenerationContent.REALM_WEIGHTS.map(function (row) {
    return {
      realmStage: row.realmStage,
      weight: row.weight,
      lifespanMultiplier: row.lifespanMultiplier
    };
  });
}

function cloneGenderRows() {
  return NpcGenerationContent.GENDERS.map(function (row) {
    return {
      id: row.id,
      name: row.name,
      weight: row.weight
    };
  });
}

function bootstrap(seed, content) {
  if (!NpcGenerator || typeof NpcGenerator.bootstrap !== 'function') {
    return null;
  }
  try {
    return NpcGenerator.bootstrap({
      count: 120,
      rngState: seed,
      content: content || bundle()
    });
  } catch (error) {
    return null;
  }
}

function recordDigest(records) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(records))
    .digest('hex');
}

ok(NpcGenerator !== null, '永久人物生成器模块存在');
ok(NpcGenerator !== null &&
   typeof NpcGenerator.generateOne === 'function' &&
   typeof NpcGenerator.bootstrap === 'function',
'人物生成器导出单人生成与首批生成');

if (NpcGenerator) {
  ok(Object.isFrozen(NpcGenerator),
    '人物生成器公共边界冻结');

  const first = bootstrap(0x12345678);
  const repeated = bootstrap(0x12345678);
  const other = bootstrap(0x87654321);

  ok(first !== null &&
     repeated !== null &&
     JSON.stringify(first) === JSON.stringify(repeated),
  '同一保存种子两次生成的 120 人与最终 RNG 完全一致');
  ok(first !== null &&
     other !== null &&
     recordDigest(first.records) !== recordDigest(other.records),
  '不同保存种子生成不同人口');
  ok(first !== null &&
     Object.keys(first.records).length === 120 &&
     Object.keys(first.records)[0] === 'npc-1' &&
     Object.keys(first.records)[119] === 'npc-120' &&
     first.nextId === 121,
  '首批人物使用 npc-1 至 npc-120 且 nextId 为 121');
  ok(first !== null &&
     Number.isInteger(first.rngState) &&
     first.rngState > 0 &&
     first.rngState <= 0xFFFFFFFF &&
     first.rngState !== 0x12345678,
  '生成只推进并返回可持久化 RNG 状态');

  const recordKeys = [
    'id',
    'identity',
    'ageYears',
    'ageRemainderSeconds',
    'lifespanYears',
    'realmStage',
    'cultivation',
    'cultivationEfficiency',
    'level_l',
    'level_s',
    'exp1',
    'history',
    'spiritualRootId',
    'talentId',
    'personalityId',
    'valueProfileId',
    'romancePrincipleId',
    'traits',
    'regionId',
    'sectId',
    'familyId',
    'skills',
    'techniques',
    'combatEquipment',
    'inventorySummary',
    'biography',
    'keyEventIds',
    'status',
    'kin',
    'lastDetailedAt',
    'lastBackgroundAt'
  ];
  const identityKeys = ['name', 'gender', 'appearance'];
  const appearanceKeys = ['buildId', 'faceId', 'hairId', 'featureId'];
  const inventoryKeys = ['wealthTier', 'notableItemIds'];
  const records = first ? Object.keys(first.records).map(function (id) {
    return first.records[id];
  }) : [];
  ok(records.length === 120 && records.every(function (record) {
    return JSON.stringify(Object.keys(record)) ===
        JSON.stringify(recordKeys) &&
      JSON.stringify(Object.keys(record.identity)) ===
        JSON.stringify(identityKeys) &&
      JSON.stringify(Object.keys(record.identity.appearance)) ===
        JSON.stringify(appearanceKeys) &&
      JSON.stringify(Object.keys(record.inventorySummary)) ===
        JSON.stringify(inventoryKeys);
  }), '每个人物严格保存规范字段且没有临时生成字段');
  ok(records.every(function (record) {
    return JSON.stringify(JSON.parse(JSON.stringify(record))) ===
        JSON.stringify(record) &&
      record.status === 'living' &&
      record.ageRemainderSeconds === 0 &&
      record.lastDetailedAt === 0 &&
      record.lastBackgroundAt === 0 &&
      Array.isArray(record.techniques) &&
      record.techniques.length === 0 &&
      record.inventorySummary.wealthTier === 0 &&
      Array.isArray(record.inventorySummary.notableItemIds) &&
      record.inventorySummary.notableItemIds.length === 0 &&
      Array.isArray(record.keyEventIds) &&
      record.keyEventIds.length === 0;
  }), '人物记录可 JSON 往返且空功法、背包摘要使用精确结构');
  ok(records.every(function (record) {
    return Array.isArray(record.biography) &&
      record.biography.length === 1 &&
      record.biography[0].type === 'origin' &&
      record.biography[0].regionId === record.regionId &&
      typeof record.biography[0].text === 'string' &&
      /^出生于.+\。$/.test(record.biography[0].text);
  }), '每个人物开局经历仅保留出生地');

  const genders = new Set(records.map(function (record) {
    return record.identity.gender;
  }));
  ok(genders.size === 3 &&
     genders.has('female') &&
     genders.has('male') &&
     genders.has('nonbinary'),
  '首批人口包含全部三种性别');
  ok(records.every(function (record) {
    return !Object.prototype.hasOwnProperty.call(record, 'socialRestriction') &&
      !Object.prototype.hasOwnProperty.call(record, 'romanceEligible') &&
      !Object.prototype.hasOwnProperty.call(
        record.identity,
        'socialRestriction'
      );
  }), '人物性别不生成社交或恋爱资格限制');

  const familyIds = new Set(records.map(function (record) {
    return record.familyId;
  }));
  ok(familyIds.size === 16 &&
     first.familyIds.length === 16 &&
     first.familyIds.every(function (id) {
       return familyIds.has(id);
     }),
  '首批人口精确分布到 16 个家庭标识');
  ok(records.every(function (record) {
    return !Object.prototype.hasOwnProperty.call(record, 'parentIds') &&
      !Object.prototype.hasOwnProperty.call(record, 'guardianIds') &&
      !Object.prototype.hasOwnProperty.call(record, 'lineage') &&
      !Object.prototype.hasOwnProperty.call(record, 'childrenIds');
  }), '人物生成器本身不写父母/监护/谱系（结构关系由 relation-seed 另步播种）');
  ok(records.every(function (record) {
    return typeof record.spiritualRootId === 'string' &&
      Number.isFinite(record.cultivationEfficiency) &&
      record.cultivationEfficiency > 0;
  }), '首批人口具备灵根与正修炼效率');

  const realmRows = NpcGenerationContent.REALM_WEIGHTS;
  const realmByStage = new Map(realmRows.map(function (row) {
    return [row.realmStage, row];
  }));
  ok(realmRows.every(function (row, index) {
    return index === 0 ||
      row.lifespanMultiplier >
        realmRows[index - 1].lifespanMultiplier;
  }), '境界寿元倍率逐境严格增加');
  ok(records.every(function (record) {
    const row = realmByStage.get(record.realmStage);
    return row &&
      record.lifespanYears + 1e-9 >=
        28 * row.lifespanMultiplier &&
      record.lifespanYears - 1e-9 <=
        56 * row.lifespanMultiplier;
  }), '每个人物的境界倍率前基础寿元位于 28–56 年');

  const reorderedRealms = cloneRealmRows();
  reorderedRealms[0].realmStage = 1;
  reorderedRealms[1].realmStage = 0;
  ok(bootstrap(
    0x12345678,
    contentWithGeneration(generationWith({
      REALM_WEIGHTS: reorderedRealms
    }))
  ) === null,
  '境界编号即使唯一也必须按规范顺序对齐倍率');
  ok(bootstrap(
    0x12345678,
    contentWithGeneration(generationWith({
      REALM_WEIGHTS:
        NpcGenerationContent.REALM_WEIGHTS.slice(0, -1)
    }))
  ) === null,
  '缺失规范境界行时生成失败关闭');
  const duplicateRealms = cloneRealmRows();
  duplicateRealms[2].realmStage = duplicateRealms[1].realmStage;
  ok(bootstrap(
    0x12345678,
    contentWithGeneration(generationWith({
      REALM_WEIGHTS: duplicateRealms
    }))
  ) === null,
  '重复境界编号时生成失败关闭');
  const fractionalRealms = cloneRealmRows();
  fractionalRealms[2].realmStage = 2.5;
  ok(bootstrap(
    0x12345678,
    contentWithGeneration(generationWith({
      REALM_WEIGHTS: fractionalRealms
    }))
  ) === null,
  '非整数境界编号时生成失败关闭');
  const mismatchedMultipliers = cloneRealmRows();
  mismatchedMultipliers[3].lifespanMultiplier =
    mismatchedMultipliers[2].lifespanMultiplier;
  ok(bootstrap(
    0x12345678,
    contentWithGeneration(generationWith({
      REALM_WEIGHTS: mismatchedMultipliers
    }))
  ) === null,
  '境界寿元倍率没有严格递增时生成失败关闭');

  ok(bootstrap(
    0x12345678,
    contentWithGeneration(generationWith({
      GENDERS: NpcGenerationContent.GENDERS.slice(0, 2)
    }))
  ) === null,
  '缺失任一规范性别时生成失败关闭');
  const duplicateGenders = cloneGenderRows();
  duplicateGenders[2].id = 'female';
  ok(bootstrap(
    0x12345678,
    contentWithGeneration(generationWith({
      GENDERS: duplicateGenders
    }))
  ) === null,
  '重复规范性别时生成失败关闭');
  const unknownGenders = cloneGenderRows();
  unknownGenders[2].id = 'unknown';
  ok(bootstrap(
    0x12345678,
    contentWithGeneration(generationWith({
      GENDERS: unknownGenders
    }))
  ) === null,
  '未知性别替代规范性别时生成失败关闭');
  const reorderedGenders = cloneGenderRows();
  const firstGender = reorderedGenders[0];
  reorderedGenders[0] = reorderedGenders[1];
  reorderedGenders[1] = firstGender;
  ok(bootstrap(
    0x12345678,
    contentWithGeneration(generationWith({
      GENDERS: reorderedGenders
    }))
  ) === null,
  '性别内容表重排时生成失败关闭以避免 RNG 语义漂移');

  let semanticRngCalls = 0;
  const semanticSandbox = {
    console: console,
    Object: Object,
    Array: Array,
    Number: Number,
    String: String,
    Boolean: Boolean,
    Math: Math,
    Set: Set,
    GameRandom: {
      next: function (seed) {
        semanticRngCalls++;
        return { seed: seed + 1, value: 0.5 };
      }
    }
  };
  semanticSandbox.globalThis = semanticSandbox;
  vm.createContext(semanticSandbox);
  vm.runInContext(
    fs.readFileSync('core/npc-generator.js', 'utf8'),
    semanticSandbox,
    { filename: 'core/npc-generator.js' }
  );
  const hostileRequest = {
    count: 120,
    rngState: 0x12345678,
    content: contentWithGeneration(generationWith({
      REALM_WEIGHTS:
        NpcGenerationContent.REALM_WEIGHTS.slice(0, -1)
    }))
  };
  const hostileOneRequest = {
    nextId: 1,
    rngState: 0x12345678,
    usedNames: [],
    content: contentWithGeneration(generationWith({
      GENDERS: NpcGenerationContent.GENDERS.slice(0, 2)
    }))
  };
  ok(semanticSandbox.NpcGenerator.bootstrap(hostileRequest) === null &&
     semanticSandbox.NpcGenerator.generateOne(hostileOneRequest) === null &&
     hostileRequest.rngState === 0x12345678 &&
     hostileOneRequest.rngState === 0x12345678 &&
     semanticRngCalls === 0,
  '语义损坏内容在 RNG 消耗前失败关闭且不改变请求种子');

  const sectIds = new Set(SectContent.SECTS.map(function (sect) {
    return sect.id;
  }));
  const sectMembers = records.filter(function (record) {
    return record.sectId !== null;
  });
  ok(sectMembers.length === 84 &&
     records.length - sectMembers.length === 36,
  '首批人口精确为七成宗门人物与三成散修');
  ok(sectMembers.every(function (record) {
    return sectIds.has(record.sectId);
  }) && new Set(sectMembers.map(function (record) {
    return record.sectId;
  })).size === 5,
  '宗门人物分布于五个真实宗门引用');
  const regionIds = new Set(RegionContent.REGIONS.map(function (region) {
    return region.id;
  }));
  ok(records.every(function (record) {
    return regionIds.has(record.regionId);
  }) && new Set(records.map(function (record) {
    return record.regionId;
  })).size === 8,
  '首批人口覆盖全部八个真实地区引用');

  const talentIds = new Set(
    NpcGenerationContent.TALENTS.map(function (row) { return row.id; })
  );
  const spiritualRootIds = new Set(
    NpcGenerationContent.SPIRITUAL_ROOTS.map(function (row) {
      return row.id;
    })
  );
  const personalityIds = new Set(
    NpcGenerationContent.PERSONALITY_PROFILES.map(function (row) {
      return row.id;
    })
  );
  const valueIds = new Set(
    NpcGenerationContent.VALUE_PROFILES.map(function (row) {
      return row.id;
    })
  );
  const principleIds = new Set(
    NpcGenerationContent.ROMANCE_PRINCIPLES.map(function (row) {
      return row.id;
    })
  );
  ok(records.every(function (record) {
    return talentIds.has(record.talentId) &&
      spiritualRootIds.has(record.spiritualRootId) &&
      personalityIds.has(record.personalityId) &&
      valueIds.has(record.valueProfileId) &&
      principleIds.has(record.romancePrincipleId);
  }), '天赋、灵根、性格、价值观与恋爱原则只引用冻结内容表');

  function forceSecondWeight(rows, key) {
    return rows.map(function (row, index) {
      const copy = {};
      Object.keys(row).forEach(function (name) {
        copy[name] = row[name];
      });
      copy.weight = index === 1 ? 1 : 0;
      if (key && index === 1) copy[key] = row[key];
      return copy;
    });
  }
  const weightedGeneration = {
    GENERATION_RULES: NpcGenerationContent.GENERATION_RULES,
    REALM_WEIGHTS: forceSecondWeight(
      NpcGenerationContent.REALM_WEIGHTS,
      'realmStage'
    ),
    GENDERS: NpcGenerationContent.GENDERS,
    SURNAMES: NpcGenerationContent.SURNAMES,
    GIVEN_NAME_COMPONENTS:
      NpcGenerationContent.GIVEN_NAME_COMPONENTS,
    APPEARANCE_FEATURES:
      NpcGenerationContent.APPEARANCE_FEATURES,
    PERSONALITY_PROFILES: forceSecondWeight(
      NpcGenerationContent.PERSONALITY_PROFILES
    ),
    VALUE_PROFILES: NpcGenerationContent.VALUE_PROFILES,
    TALENTS: forceSecondWeight(NpcGenerationContent.TALENTS),
    SPIRITUAL_ROOTS: forceSecondWeight(
      NpcGenerationContent.SPIRITUAL_ROOTS
    ),
    ROMANCE_PRINCIPLES:
      NpcGenerationContent.ROMANCE_PRINCIPLES,
    DAO_HEART_TRAITS:
      NpcGenerationContent.DAO_HEART_TRAITS
  };
  const weighted = NpcGenerator.generateOne({
    nextId: 17,
    rngState: 0x10203040,
    usedNames: [],
    content: {
      regions: RegionContent,
      sects: SectContent,
      generation: weightedGeneration
    }
  });
  ok(weighted !== null &&
     weighted.npc.realmStage ===
       NpcGenerationContent.REALM_WEIGHTS[1].realmStage &&
     weighted.npc.personalityId ===
       NpcGenerationContent.PERSONALITY_PROFILES[1].id &&
     weighted.npc.talentId ===
       NpcGenerationContent.TALENTS[1].id &&
     weighted.npc.spiritualRootId ===
       NpcGenerationContent.SPIRITUAL_ROOTS[1].id,
  '境界、性格、天赋与灵根选择使用内容表权重');

  const beforeAppend = JSON.stringify(first.records);
  const appended = NpcGenerator.generateOne({
    nextId: first.nextId,
    rngState: first.rngState,
    usedNames: records.map(function (record) {
      return record.identity.name;
    }),
    content: bundle()
  });
  ok(appended !== null &&
     appended.npc.id === 'npc-121' &&
     appended.nextId === 122 &&
     appended.rngState !== first.rngState,
  '追加生成 npc-121 并推进 nextId 与 RNG');
  ok(JSON.stringify(first.records) === beforeAppend,
    '追加人物不改变任何既有人物记录');

  const reordered = bootstrap(
    0x12345678,
    bundle(['generation', 'sects', 'regions'])
  );
  ok(reordered !== null &&
     JSON.stringify(reordered) === JSON.stringify(first),
  '内容容器属性插入顺序不影响生成结果');

  let randomCalls = 0;
  const originalRandom = Math.random;
  Math.random = function () {
    randomCalls++;
    throw new Error('global random must not run');
  };
  let withoutGlobalRandom = null;
  try {
    withoutGlobalRandom = bootstrap(0x2468ACE1);
  } finally {
    Math.random = originalRandom;
  }
  ok(withoutGlobalRandom !== null && randomCalls === 0,
    '人物生成绝不调用全局 Math.random');

  let contentGetterHits = 0;
  const accessorContent = {};
  Object.defineProperty(accessorContent, 'generation', {
    enumerable: true,
    get: function () {
      contentGetterHits++;
      return NpcGenerationContent;
    }
  });
  accessorContent.regions = RegionContent;
  accessorContent.sects = SectContent;
  let accessorResult = 'threw';
  try {
    accessorResult = NpcGenerator.bootstrap({
      count: 120,
      rngState: 0x12345678,
      content: accessorContent
    });
  } catch (error) {
    accessorResult = 'threw';
  }
  ok(accessorResult === null && contentGetterHits === 0,
    '内容访问器零执行并安全拒绝');

  const revokedPair = Proxy.revocable(bundle(), {});
  revokedPair.revoke();
  let revokedResult = 'threw';
  try {
    revokedResult = NpcGenerator.bootstrap({
      count: 120,
      rngState: 0x12345678,
      content: revokedPair.proxy
    });
  } catch (error) {
    revokedResult = 'threw';
  }
  ok(revokedResult === null,
    '已撤销内容代理不抛错且生成失败关闭');

  let descriptorCalls = 0;
  const statefulContent = new Proxy(bundle(), {
    getOwnPropertyDescriptor: function (target, key) {
      descriptorCalls++;
      if (key === 'generation' && descriptorCalls > 1) {
        return {
          value: null,
          enumerable: true,
          configurable: true,
          writable: true
        };
      }
      return Object.getOwnPropertyDescriptor(target, key);
    }
  });
  let statefulResult = 'threw';
  try {
    statefulResult = NpcGenerator.bootstrap({
      count: 120,
      rngState: 0x12345678,
      content: statefulContent
    });
  } catch (error) {
    statefulResult = 'threw';
  }
  ok(statefulResult === null,
    '变化中的内容引用失败关闭');

  const minimalGeneration = {
    GENERATION_RULES: NpcGenerationContent.GENERATION_RULES,
    REALM_WEIGHTS: NpcGenerationContent.REALM_WEIGHTS,
    GENDERS: NpcGenerationContent.GENDERS,
    SURNAMES: [{ id: 'only-surname', name: '闻人' }],
    GIVEN_NAME_COMPONENTS: [{ id: 'only-given', name: '安' }],
    APPEARANCE_FEATURES: [
      { id: 'build', name: '清瘦', slot: 'build' },
      { id: 'face', name: '清秀', slot: 'face' },
      { id: 'hair', name: '乌发', slot: 'hair' },
      { id: 'feature', name: '静目', slot: 'feature' }
    ],
    PERSONALITY_PROFILES:
      [NpcGenerationContent.PERSONALITY_PROFILES[0]],
    VALUE_PROFILES: [NpcGenerationContent.VALUE_PROFILES[0]],
    TALENTS: [NpcGenerationContent.TALENTS[0]],
    SPIRITUAL_ROOTS: [NpcGenerationContent.SPIRITUAL_ROOTS[0]],
    ROMANCE_PRINCIPLES:
      [NpcGenerationContent.ROMANCE_PRINCIPLES[0]],
    DAO_HEART_TRAITS: [NpcGenerationContent.DAO_HEART_TRAITS[0]]
  };
  const minimalContent = {
    regions: { REGIONS: [RegionContent.REGIONS[0]] },
    sects: {
      SECTS: [{
        id: SectContent.SECTS[0].id,
        name: SectContent.SECTS[0].name,
        homeRegionId: RegionContent.REGIONS[0].id
      }]
    },
    generation: minimalGeneration
  };
  const namedOne = NpcGenerator.generateOne({
    nextId: 1,
    rngState: 0xABCDEF01,
    usedNames: [],
    content: minimalContent
  });
  const namedTwo = namedOne && NpcGenerator.generateOne({
    nextId: 2,
    rngState: namedOne.rngState,
    usedNames: [namedOne.npc.identity.name],
    content: minimalContent
  });
  ok(namedOne !== null &&
     namedTwo !== null &&
     namedOne.npc.identity.name !== namedTwo.npc.identity.name &&
     namedTwo.npc.identity.name.indexOf('·字') > 0,
  '有限重名尝试耗尽后保存稳定表字后缀');

  const invalidSeed = NpcGenerator.bootstrap({
    count: 120,
    rngState: 0,
    content: bundle()
  });
  ok(invalidSeed === null,
    '无效的序列化 RNG 状态失败关闭');

  const browserSandbox = {
    console: console,
    Object: Object,
    Array: Array,
    Number: Number,
    String: String,
    Boolean: Boolean,
    Math: Math,
    Set: Set,
    GameRandom: GameRandom,
    Dns: require('../core/dns.js'),
    EquipmentContent: require('../content/equipment.js'),
    Equipment: require('../core/equipment.js')
  };
  browserSandbox.globalThis = browserSandbox;
  vm.createContext(browserSandbox);
  vm.runInContext(
    fs.readFileSync('core/npc-generator.js', 'utf8'),
    browserSandbox,
    { filename: 'core/npc-generator.js' }
  );
  const browserResult = browserSandbox.NpcGenerator.bootstrap({
    count: 120,
    rngState: 0x12345678,
    content: bundle()
  });
  ok(Object.isFrozen(browserSandbox.NpcGenerator) &&
     JSON.stringify(browserResult) === JSON.stringify(first),
  '人物生成器浏览器 UMD 与 CommonJS 结果一致');
}

if (failed) {
  console.error(
    '\n=== Stage 4 人物生成自测失败：' +
    failed + ' 项，' + passed + ' 项通过 ==='
  );
  process.exit(1);
}

console.log(
  '\n=== Stage 4 人物生成自测通过：' +
  passed + ' 项，0 项失败 ==='
);
