'use strict';

const WorldEventNarrativeContent = require('../content/world-event-narratives.js');
const WorldEventPicker = require('../core/world-event-picker.js');
const SectOffices = require('../core/sect-offices.js');
const Stage4State = require('../core/stage4-state.js');
const WorldMonth = require('../core/world-month.js');

let passed = 0;
let failed = 0;

function ok(condition, label) {
  if (condition) {
    passed += 1;
    console.log('✓ ' + label);
  } else {
    failed += 1;
    console.error('✗ ' + label);
  }
}

const stats = WorldEventNarrativeContent.stats();
ok(stats.total >= 350, '见闻模板总量 ≥ 350（当前 ' + stats.total + '）');
ok(stats.types >= 30, '事件类型种类 ≥ 30（当前 ' + stats.types + '）');

const requiredTypes = [
  'meet', 'talk', 'gift', 'debate', 'spar',
  'quarrel', 'rival', 'duel', 'aid', 'rescue',
  'date', 'confess_npc', 'jealousy', 'breakup',
  'seclusion_enter', 'seclusion_exit', 'breakthrough', 'tribulation',
  'travel_start', 'travel_return', 'explore', 'missing',
  'office_duty', 'office_appoint', 'office_challenge', 'sect_join',
  'treasure', 'market', 'birthday', 'imprison'
];
requiredTypes.forEach(function (type) {
  ok((stats.byType[type] || 0) >= 1, '含类型 ' + type);
});
ok((stats.byType.crisis_save || 0) >= 8, '含 crisis_save 立基文案');
ok((stats.byType.first_sight || 0) >= 8, '含 first_sight 跃迁文案');
ok((stats.byType.crisis_meet || 0) >= 8, '含 crisis_meet 跃迁文案');
ok((stats.byType.rescue || 0) >= 8, 'rescue 文案扩至 ≥8');

ok(WorldEventNarrativeContent.list().every(function (row) {
  return row.id && row.type && row.template &&
    row.template.indexOf('{a}') >= 0 &&
    row.template.indexOf('{loc}') >= 0;
}), '每条模板含 id/type/template 且含 {a}/{loc}');

const ids = {};
let unique = true;
WorldEventNarrativeContent.list().forEach(function (row) {
  if (ids[row.id]) unique = false;
  ids[row.id] = true;
});
ok(unique, '模板 id 全库唯一');

const hasPersonality = WorldEventNarrativeContent.list().some(function (row) {
  return Array.isArray(row.personalityAny) || Array.isArray(row.personalityA);
});
const hasOffice = WorldEventNarrativeContent.list().some(function (row) {
  return Array.isArray(row.officeRankAny) || Array.isArray(row.officeSlotAny);
});
const hasRogue = WorldEventNarrativeContent.list().some(function (row) {
  return Array.isArray(row.rogueTitleAny);
});
const hasTag = WorldEventNarrativeContent.list().some(function (row) {
  return Array.isArray(row.tagAny);
});
ok(hasPersonality, '含性格门控模板');
ok(hasOffice, '含职位门控模板');
ok(hasRogue, '含散修身份门控模板');
ok(hasTag, '含关系标签门控模板');

const fixture = Stage4State.normalize({
  schemaVersion: 5,
  rngState: 9,
  player: {
    identity: { name: '测', gender: 'female' },
    flags: { completedFirstAction: true }
  },
  systems: {
    npcs: {
      nextId: 4,
      activeTarget: 40,
      records: {
        'npc-1': {
          id: 'npc-1',
          identity: { name: '沈青梧', gender: 'female' },
          status: 'living',
          sectId: 'taixuan-sword',
          realmStage: 8,
          cultivation: 20,
          regionId: 'eastern-sect-heights',
          personalityId: 'chicheng',
          valueProfileId: 'benevolent',
          talentId: 'sword-heart',
          romancePrincipleId: 'exclusive',
          activityStatus: 'normal'
        },
        'npc-2': {
          id: 'npc-2',
          identity: { name: '陆观澜', gender: 'male' },
          status: 'living',
          sectId: 'taixuan-sword',
          realmStage: 4,
          cultivation: 10,
          regionId: 'eastern-sect-heights',
          personalityId: 'qingleng',
          valueProfileId: 'scholarly',
          talentId: 'wood-spirit',
          romancePrincipleId: 'tolerant',
          activityStatus: 'normal'
        },
        'npc-3': {
          id: 'npc-3',
          identity: { name: '白无羁', gender: 'male' },
          status: 'living',
          sectId: null,
          realmStage: 3,
          cultivation: 8,
          regionId: 'qinglan-town',
          personalityId: 'shuaituo',
          valueProfileId: 'freedom-seeking',
          talentId: 'water-spirit',
          romancePrincipleId: 'casual',
          activityStatus: 'normal'
        }
      },
      activeIds: ['npc-1', 'npc-2', 'npc-3'],
      backgroundIds: [],
      backgroundCursor: 0
    },
    relationships: {
      edges: {},
      bonds: {},
      limits: {},
      npcAffinities: { 'npc-1>npc-2': 40, 'npc-2>npc-1': 35 },
      tags: { 'npc-1|npc-2': ['friend'] }
    },
    sects: {
      player: {
        sectId: null,
        joinedAt: null,
        contribution: {},
        reputation: {},
        choiceEventOffered: false,
        choiceAvailableAt: 0
      },
      records: {},
      pairStates: {}
    },
    world: {
      calendar: {
        year: 1,
        month: 1,
        monthAccumulator: 0,
        yearEventBudget: 36,
        yearEventsCreated: 0,
        monthEventsCreated: 0,
        npcYearAppearances: {}
      },
      worldEvents: [],
      nextWorldEventId: 1
    }
  }
});

const reconciled = SectOffices.reconcile(fixture, { inPlace: true }).state;
const a = reconciled.systems.npcs.records['npc-1'];
const b = reconciled.systems.npcs.records['npc-2'];
const rogue = reconciled.systems.npcs.records['npc-3'];

const giftPick = WorldEventPicker.pickNarrative('gift', {
  a: a,
  b: b,
  affinity: 40,
  tags: ['friend'],
  regionId: 'eastern-sect-heights',
  regionType: 'sectBase'
}, function () { return 0.2; });
ok(giftPick && giftPick.template, '赠礼类可按门控抽出模板');

const roguePick = WorldEventPicker.pickNarrative('talk', {
  a: rogue,
  b: a,
  affinity: 10,
  tags: [],
  regionId: 'qinglan-town'
}, function () { return 0.3; });
ok(roguePick && roguePick.template, '散修参与时仍可抽出模板');

const filled = WorldEventPicker.fillTemplate(
  '{a}在{loc}与{b}闲谈。',
  { a: '甲', b: '乙', loc: '青岚镇' }
);
ok(filled === '甲在青岚镇与乙闲谈。', '模板填充正确');

let rng = 0.11;
const advanced = WorldMonth.advanceMonths(reconciled, 8, {
  random: function () {
    rng = (rng * 1.7) % 1;
    return rng;
  }
});
ok(advanced.months === 8, '月推演可前进');
const events = reconciled.systems.world.worldEvents || [];
ok(events.length >= 1, '推演后产生世界见闻');
ok(events.every(function (entry) {
  return (entry.source === 'world' || entry.source === 'player') &&
    typeof entry.narrative === 'string' &&
    entry.narrative.indexOf('【') < 0 &&
    !entry.options;
}), '见闻只读：有叙事、无选项、无符号框');

const narratives = events.map(function (entry) { return entry.narrative; });
const diverse = new Set(narratives).size >= Math.min(3, narratives.length);
ok(diverse, '多月推演叙事不全重复');

// 自审：禁心理动机句式
const banned = ['因为他', '因为她', '内心', '嫉妒得', '暗暗发誓'];
const clean = WorldEventNarrativeContent.list().every(function (row) {
  return banned.every(function (word) {
    return row.template.indexOf(word) < 0;
  });
});
ok(clean, '自审：模板避免直白心理动机句');
ok(WorldEventNarrativeContent.list().every(function (row) {
  return String(row.template).indexOf('；') < 0;
}), '自审：模板不用中文分号');
ok(WorldEventNarrativeContent.list().every(function (row) {
  return !/本要擦肩|停住对视片刻|话锋却不知不觉拐进了彼此近来的心事|聊了几句门中近闻|顺便寒暄几句|问话很淡，眼神却停得稍久|两人把近日见闻和手头难处对了个大概/.test(
    row.template
  );
}), '自审：模板避免空转文艺套话与空壳寒暄');
ok(WorldEventNarrativeContent.list().every(function (row) {
  return !/问清彼此来此做什么|道了谢，收进袖里|记下了这份人情/.test(
    row.template
  );
}), '自审：模板避免流水线收尾');
ok(
  WorldEventNarrativeContent.listByType('talk').every(function (row) {
    const text = String(row.template || '');
    const sentences = text.split('。').filter(function (part) {
      return part.trim().length > 0;
    });
    const hasIntent =
      /八卦|邀|旁敲侧击|诉苦|抱怨|追问|打趣|跟\{b\}说|关心|提起|吐槽|试探|讲述|争执|念给|对账|寒暄/.test(
        text
      );
    const hasEmotion =
      /(却|忽然|先是|差点|发紧|发颤|沉了|放软|心口|胸口|悔|怨|怒|热|冷了|住了声|听不下去|本想|看穿|想瞒|改了口|怒意|闷了)/.test(
        text
      );
    return hasIntent && hasEmotion && sentences.length <= 2 &&
      text.indexOf('谈起') < 0;
  }),
  '交谈模板：说话目的清楚 + 情绪转折，两句内写完'
);
ok(
  WorldEventNarrativeContent.list().filter(function (row) {
    return Array.isArray(row.arcAny) && row.arcAny.length;
  }).length >= 12,
  '含关系弧分流模板'
);

const arcSpark = WorldEventPicker.pickNarrative('talk', {
  a: { personalityId: 'steady', identity: { gender: 'female' } },
  b: { personalityId: 'chicheng', identity: { gender: 'male' } },
  affinity: 18,
  tags: ['acquainted'],
  arcStage: 'spark',
  eventCount: 3,
  regionId: 'qinglan-town',
  regionType: 'town'
}, function () { return 0.05; });
const arcWarm = WorldEventPicker.pickNarrative('talk', {
  a: { personalityId: 'steady', identity: { gender: 'female' } },
  b: { personalityId: 'chicheng', identity: { gender: 'male' } },
  affinity: 48,
  tags: ['acquainted', 'impressed'],
  arcStage: 'warm',
  eventCount: 5,
  regionId: 'qinglan-town',
  regionType: 'town'
}, function () { return 0.05; });
ok(arcSpark && arcSpark.template, 'spark 可抽出交谈文案');
ok(
  arcWarm &&
    ((Array.isArray(arcWarm.arcAny) &&
      arcWarm.arcAny.indexOf('warm') >= 0) ||
      /没说完的半句|别开视线|多停了一息|私事/.test(arcWarm.template)),
  'warm 优先抽出暧昧张力文案'
);

const sceneGated = WorldEventNarrativeContent.list().filter(function (row) {
  return String(row.id).indexOf('scene-') === 0;
});
ok(sceneGated.length >= 90, 'scene 模板仍保留');
ok(sceneGated.every(function (row) {
  return Array.isArray(row.regionTypes) && row.regionTypes.length > 0;
}), 'scene 模板均挂 regionTypes');

ok(WorldEventNarrativeContent.list().filter(function (row) {
  return /厢房|剑冢/.test(row.template) &&
    !(Array.isArray(row.regionTypes) && row.regionTypes.length) &&
    !(Array.isArray(row.regions) && row.regions.length);
}).length === 0, '厢房/剑冢模板不得无地点门控');

const realmCtx = {
  a: { personalityId: 'wenya', activityStatus: 'normal' },
  b: { personalityId: 'renhou', activityStatus: 'normal' },
  affinity: 12,
  tags: [],
  regionId: 'mirror-realm',
  regionType: 'specialRealm'
};
let realmBad = 0;
for (let i = 0; i < 80; i++) {
  const row = WorldEventPicker.pickNarrative(
    i % 2 === 0 ? 'meet' : 'talk',
    realmCtx,
    Math.random
  );
  if (row && /厢房|剑冢|丹房|山门/.test(row.template)) realmBad += 1;
}
ok(realmBad === 0, '秘境抽取不会出现厢房/剑冢/丹房/山门');

const causeGift = WorldEventPicker.pickNarrative('gift', {
  a: a,
  b: b,
  affinity: 40,
  tags: ['friend'],
  regionId: 'eastern-sect-heights',
  regionType: 'sectBase'
}, function () { return 0.15; });
ok(
  causeGift &&
    Array.isArray(causeGift.personalityAny) &&
    causeGift.personalityAny.indexOf('chicheng') >= 0,
  '宗门场景优先抽到性格向 gift 文案'
);

const hasCausePersonality = WorldEventNarrativeContent.list().filter(
  function (row) {
    return /-(cause|chicheng|qingleng)-/.test(row.id) &&
      (row.type === 'gift' || row.type === 'talk' || row.type === 'quarrel') &&
      Array.isArray(row.personalityAny);
  }
).length;
ok(hasCausePersonality >= 40, '性格向常见事件文案充足');

ok(typeof WorldEventPicker.matchGender === 'function', 'picker 导出 matchGender');
ok(
  WorldEventPicker.pairGenderKey(
    { identity: { gender: 'female' } },
    { identity: { gender: 'male' } }
  ) === 'fm',
  'pairGenderKey female→male = fm'
);

const fmGiftCtx = {
  a: {
    identity: { gender: 'female' },
    personalityId: 'wenya',
    activityStatus: 'normal'
  },
  b: {
    identity: { gender: 'male' },
    personalityId: 'chicheng',
    activityStatus: 'normal'
  },
  affinity: 20,
  tags: ['friend'],
  regionId: 'qinglan-town',
  regionType: 'town'
};
let fmAssertiveHits = 0;
for (let i = 0; i < 80; i++) {
  const row = WorldEventPicker.pickNarrative('gift', fmGiftCtx, Math.random);
  if (row && /塞给|塞进|直接塞|二话不说/.test(row.template)) {
    fmAssertiveHits += 1;
  }
}
ok(fmAssertiveHits === 0, '女→男不会抽到硬塞礼物文案');

const fmSoft = WorldEventNarrativeContent.list().filter(function (row) {
  return Array.isArray(row.pairGenderAny) &&
    row.pairGenderAny.indexOf('fm') >= 0;
});
ok(fmSoft.length >= 8, '含女→男柔版文案');

const assertiveBlocked = WorldEventNarrativeContent.list().filter(
  function (row) {
    return Array.isArray(row.pairGenderNone) &&
      row.pairGenderNone.indexOf('fm') >= 0;
  }
);
ok(assertiveBlocked.length >= 10, '强势护短文案已禁女→男');

const pretentious = WorldEventNarrativeContent.list().filter(function (row) {
  return /——|指节微白|像在忍住|某条归途|仗义|耳尖微红|心口一热|于\{loc\}|报了名号|报了名字|道了声谢|衣袂|执手|终至不欢|薄礼|子时|吐纳|簪上|拔剑相向|一决高下|见真章|仇隙|神色|脸色很淡/.test(
    String(row.template || '')
  );
});
ok(pretentious.length === 0, '模板无破折号诗意/文言套话/空洞脸色');

const qinglengBeat = WorldEventNarrativeContent.list().find(function (row) {
  return row.id === 'beat-qingleng-01';
});
ok(
  !!(qinglengBeat &&
    /过了很久才站起来/.test(qinglengBeat.template) &&
    !/指节|归途|——|吐纳|神色|脸色很淡/.test(qinglengBeat.template)),
  '清冷单人戏为白话短句'
);

const meetSample = WorldEventNarrativeContent.list().find(function (row) {
  return row.id === 'meet-0001';
});
ok(
  !!(meetSample &&
    /互换了名字/.test(meetSample.template) &&
    !/报了名字|报了名号/.test(meetSample.template)),
  '初遇用「互换了名字」'
);

console.log('\n世界见闻内容自测：' + passed + ' 通过，' + failed + ' 失败');
console.log('统计：', JSON.stringify(stats.byType));
if (failed) process.exitCode = 1;
