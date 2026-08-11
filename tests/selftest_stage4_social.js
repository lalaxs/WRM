'use strict';

const Social = require('../core/social.js');
const SocialContent = require('../content/social-interactions.js');
const Stage4Rules = require('../core/stage4-rules.js');
const Simulation = require('../core/simulation.js');

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

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function npc(id, overrides) {
  return Object.assign({
    id: id,
    identity: { name: '沈青梧', gender: 'female', appearance: {} },
    status: 'living',
    personalityId: 'steady',
    sectId: 'baicao-valley',
    romancePrincipleId: 'negotiable'
  }, overrides || {});
}

function fixture(charmLevel) {
  return {
    schemaVersion: 5,
    rngState: 123,
    current: null,
    player: {
      cultivation: 0,
      skills: {
        charm: { level: charmLevel || 1, xp: 0 },
        herb: { level: 1, xp: 0 }
      },
      mastery: {},
      inventory: {
        capacity: 20,
        capacityGrants: { shop: 0, achievement: 0, task: 0 },
        stacks: { spiritPeach: 2 },
        bindings: {}
      }
    },
    systems: {
      npcs: { records: { 'npc-1': npc('npc-1') } },
      relationships: { edges: {}, bonds: {}, restrictions: {} },
      events: { pending: [], resolvedRecent: [], resolvedIdRanges: [] },
      sects: { player: { sectId: null } },
      social: { nextBenefitId: 1, benefits: [] },
      parallel: { jobs: [] }
    }
  };
}

ok(Social !== null, '社交领域模块存在');
ok(same(Social.parseActionKey('social:npc-1:talk'), {
  key: 'social:npc-1:talk',
  npcId: 'npc-1',
  interactionId: 'talk',
  itemId: null
}), '通用社交行动键可精确解析');
ok(same(Social.parseActionKey(
  'social:npc-1:gift:spiritPeach'
), {
  key: 'social:npc-1:gift:spiritPeach',
  npcId: 'npc-1',
  interactionId: 'gift',
  itemId: 'spiritPeach'
}), '赠礼行动键保存具体礼物');
ok([
  'social:npc-1',
  'social:npc-1:gift',
  'social:npc-1:talk:extra',
  'social::talk',
  'social:npc-1:unknown'
].every(function (key) {
  return Social.parseActionKey(key) === null;
}), '非规范或未知社交行动键全部拒绝');

const base = fixture(1);
ok(Social.isAvailable(
  base,
  'npc-1',
  'talk',
  null
).ok === true, '在世人物可进行通用社交');
ok(Social.isAvailable(
  base,
  'npc-1',
  'gift',
  'spiritPeach'
).ok === true, '持有可用礼物时赠礼可开始');
ok(Social.isAvailable(
  base,
  'npc-1',
  'gift',
  'missing'
).ok === false, '不存在的礼物不可开始');
ok(Social.isAvailable(
  base,
  'missing',
  'talk',
  null
).ok === false, '不存在的人物不可开始');
const dead = fixture(1);
dead.systems.npcs.records['npc-1'].status = 'dead';
ok(Social.isAvailable(dead, 'npc-1', 'talk', null).ok === false,
  '不在世人物不可开始社交');
const locked = fixture(1);
locked.systems.parallel.jobs.push({
  id: 'job-1',
  kind: 'social',
  npcId: 'npc-1',
  remainingSeconds: 10,
  ready: false
});
ok(Social.isAvailable(locked, 'npc-1', 'talk', null).code ===
  'person_busy', '同一人物的并行进度会锁定新社交');

const talk = Social.parseActionKey('social:npc-1:talk');
ok(Social.duration(base, talk) === 120,
  '社交持续时间来自冻结内容');
const completed = Social.complete(base, talk, {
  nowSeconds: function () { return 120; },
  random: function () { return 0.99; }
});
ok(completed.ok === true &&
  completed.state.player.skills.charm.xp === 6 &&
  completed.state.player.mastery.charm === undefined,
'完成社交只通过 social 来源增加魅力且不创建精通');
ok(completed.state.player.cultivation === 2,
  '社交完成可给予基础修为');
ok(completed.state.systems.relationships.edges[
  'player>npc-1'
].affection === 2 &&
  completed.state.systems.relationships.edges[
  'npc-1>player'
].affection === 1,
'社交分别写入玩家与人物两个方向的关系变化');
ok(completed.state.systems.relationships.bonds[
  'npc-1|player'
] === undefined, '普通社交数值变化不会改变关系阶段');

const highCharm = fixture(99);
const highCompleted = Social.complete(highCharm, talk, {
  nowSeconds: function () { return 120; },
  random: function () { return 0.99; }
});
ok(highCompleted.ok === true &&
  highCompleted.result.charmBenefits.positiveRelationMultiplier === 1.49 &&
  highCompleted.result.charmBenefits.misunderstandingReduction === 0.294 &&
  highCompleted.state.systems.relationships.edges[
    'player>npc-1'
  ].affection > completed.state.systems.relationships.edges[
    'player>npc-1'
  ].affection,
'高魅力提高正面关系收益并降低误会概率');
ok(highCompleted.result.misunderstandingChance >= 0,
  '魅力减免不会把误会概率降为负数');

const gift = Social.parseActionKey(
  'social:npc-1:gift:spiritPeach'
);
const giftDone = Social.complete(fixture(1), gift, {
  nowSeconds: function () { return 60; },
  random: function () { return 0.99; }
});
ok(giftDone.ok === true &&
  giftDone.state.player.inventory.stacks.spiritPeach === 1,
'赠礼消耗与社交奖励在同一结果中结算');
const unavailableGift = fixture(1);
unavailableGift.player.inventory.stacks = {};
const beforeUnavailable = JSON.stringify(unavailableGift);
const rejectedGift = Social.complete(unavailableGift, gift, {
  nowSeconds: function () { return 60; },
  random: function () { return 0.99; }
});
ok(rejectedGift.ok === false &&
  JSON.stringify(unavailableGift) === beforeUnavailable,
'赠礼材料不足时不提交任何关系或奖励变化');

const cultivate = Social.query(
  fixture(1),
  'npc-1'
).interactions.find(function (entry) {
  return entry.id === 'cultivateTogether';
});
ok(cultivate && cultivate.label === '与沈青梧一起修炼' &&
  !cultivate.label.includes('双修'),
'共同修炼使用审核安全且带人物名的文案');
ok(SocialContent.SHARED_INTERACTIONS.length === 7 &&
  Social.query(fixture(1), 'npc-1').interactions.length >= 7,
'七个通用互动全部可供基础人物使用');

const fakeStage3 = {
  create: function () {
    return {
      rules: {
        start: function (state) {
          return { ok: false, code: 'invalid_action', state: state };
        },
        getAction: function () { return null; },
        nextBoundary: function () { return Infinity; },
        elapse: function () {},
        inspect: function () {
          return { status: 'ready', reason: null };
        },
        complete: function () { return { stopReason: null }; },
        random: function (state) {
          state.rngState = ((state.rngState || 1) + 1) >>> 0;
          return 0.99;
        }
      },
      lanes: []
    };
  }
};
const runtime = Stage4Rules.create({ Stage3Rules: fakeStage3 });
const started = runtime.rules.start(
  fixture(1),
  'social:npc-1:talk',
  0
);
ok(started.ok === true &&
  started.state.current.mode === 'finite' &&
  started.state.current.count === 1,
'主动社交以一次性主行动开始');
const socialAdvance = Simulation.advance(started.state, 120, {
  source: 'online',
  fromMs: 0,
  rules: runtime.rules,
  lanes: runtime.lanes
});
ok(socialAdvance.state.current === null &&
  socialAdvance.report.action.completed === 1 &&
  socialAdvance.report.social.completed.length === 1 &&
  socialAdvance.state.player.flags.completedFirstAction === true,
'社交到时结算并释放主行动槽');
const offlineStarted = runtime.rules.start(
  fixture(1),
  'social:npc-1:talk',
  0
);
const cappedSocial = Simulation.advance(offlineStarted.state, 120, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 60,
  rules: runtime.rules,
  lanes: runtime.lanes
});
ok(cappedSocial.state.current !== null &&
  cappedSocial.state.current.elapsed === 60 &&
  cappedSocial.report.social.completed.length === 0,
'主动社交遵循主行动离线上限且未到时不会提前结算');

console.log('\nStage 4 基础社交自测：' + passed + ' 通过，' +
  failed + ' 失败');
if (failed) process.exitCode = 1;
