'use strict';

const Simulation = require('../core/simulation.js');
const Stage4Rules = require('../core/stage4-rules.js');
const Social = require('../core/social.js');

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

function baseRules() {
  return {
    start: function (state) {
      return { ok: false, code: 'invalid_action', state: state };
    },
    getAction: function () { return null; },
    nextBoundary: function () { return Infinity; },
    elapse: function () {},
    inspect: function () { return { status: 'ready', reason: null }; },
    complete: function () { return { stopReason: null }; },
    random: function (state) {
      state.rngState = ((state.rngState || 1) + 1) >>> 0;
      return 0.99;
    }
  };
}

const fakeStage3 = {
  create: function () {
    return {
      rules: baseRules(),
      lanes: [{
        id: 'prior-lane',
        nextBoundary: function () { return Infinity; },
        elapse: function () {},
        resolve: function () {}
      }]
    };
  }
};
const runtime = Stage4Rules.create({
  Stage3Rules: fakeStage3
});

function person(id, name) {
  return {
    id: id,
    identity: { name: name, gender: 'female', appearance: {} },
    status: 'living',
    personalityId: 'steady',
    sectId: null,
    romancePrincipleId: 'negotiable'
  };
}

function fixture() {
  return {
    schemaVersion: 5,
    rngState: 1,
    current: {
      key: 'unrelated-main-action',
      mode: 'repeat',
      count: null,
      done: 0,
      elapsed: 0,
      stalled: false
    },
    player: {
      skills: { charm: { level: 1, xp: 0 } },
      inventory: {
        capacity: 20,
        capacityGrants: { shop: 0, achievement: 0, task: 0 },
        stacks: {},
        bindings: {}
      }
    },
    systems: {
      npcs: {
        records: {
          'npc-1': person('npc-1', '沈青梧'),
          'npc-2': person('npc-2', '陆观澜')
        }
      },
      relationships: { edges: {}, bonds: {}, restrictions: {} },
      events: {
        nextId: 1,
        pending: [],
        resolvedRecent: [],
        resolvedIdRanges: [],
        summaries: [],
        evolution: [],
        cooldowns: {}
      },
      sects: { player: { sectId: null } },
      social: { nextBenefitId: 1, benefits: [] },
      parallel: { jobs: [] }
    }
  };
}

function job(id, npcId, remaining) {
  return {
    id: id,
    kind: 'social',
    npcId: npcId,
    sourceEventId: null,
    label: npcId === 'npc-1'
      ? '与沈青梧互寄书信'
      : '为陆观澜寻找礼物',
    remainingSeconds: remaining,
    totalSeconds: remaining,
    followupTemplateId: 'social-letter-followup',
    context: {
      npcId: npcId,
      npcName: npcId === 'npc-1' ? '沈青梧' : '陆观澜',
      regionId: 'qinglan-town',
      regionName: '青岚镇'
    },
    ready: false,
    completionReported: false
  };
}

const concurrent = fixture();
concurrent.systems.parallel.jobs.push(
  job('social-job-1', 'npc-1', 120),
  job('social-job-2', 'npc-2', 180)
);
ok(Social.hasPersonLock(concurrent, 'npc-1') === true &&
  Social.hasPersonLock(concurrent, 'missing') === false,
'同一人物被并行社交锁定而不同人物互不影响');
const advanced = Simulation.advance(concurrent, 180, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 0,
  rules: runtime.rules,
  lanes: runtime.lanes
});
ok(advanced.state.current &&
  advanced.state.current.key === 'unrelated-main-action',
'并行社交完成不会替换或占用当前主行动');
ok(advanced.state.systems.parallel.jobs.length === 0 &&
  advanced.state.systems.events.pending.length === 0,
'并行社交完成直接结算，不再生成待决策后续事件');
ok(advanced.report.passive.parallelCompleted.length === 2,
  '离线摘要只记录完成的并行进度数量和标识');

const longOffline = fixture();
longOffline.current = null;
longOffline.systems.parallel.jobs.push(
  job('social-job-long', 'npc-1', 20 * 3600)
);
const longDone = Simulation.advance(longOffline, 24 * 3600, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 12 * 3600,
  rules: runtime.rules,
  lanes: runtime.lanes
});
ok(longDone.state.systems.events.pending.length === 0 &&
  longDone.state.systems.parallel.jobs.length === 0,
  '长离线并行社交完成且不进入待决策');

const one = fixture();
one.current = null;
one.systems.parallel.jobs.push(job('social-job-chunk', 'npc-1', 120));
const once = Simulation.advance(one, 120, {
  source: 'online',
  fromMs: 0,
  rules: runtime.rules,
  lanes: runtime.lanes
});
const firstChunk = Simulation.advance(one, 60, {
  source: 'online',
  fromMs: 0,
  rules: runtime.rules,
  lanes: runtime.lanes
});
const secondChunk = Simulation.advance(firstChunk.state, 60, {
  source: 'online',
  fromMs: 60000,
  rules: runtime.rules,
  lanes: runtime.lanes
});
ok(same(once.state, secondChunk.state),
  '并行社交一次推进与分段推进得到相同保存状态');

const full = fixture();
full.current = null;
full.systems.parallel.jobs.push(job('social-job-ready', 'npc-1', 10));
const held = Simulation.advance(full, 10, {
  source: 'online',
  fromMs: 0,
  rules: runtime.rules,
  lanes: runtime.lanes
});
ok(held.state.systems.parallel.jobs.length === 0 &&
  held.state.systems.events.pending.length === 0,
'带 followup 的遗留社交任务会被丢弃，且不生成待决策');
const promoted = Simulation.advance(held.state, 1, {
  source: 'online',
  fromMs: 10000,
  rules: runtime.rules,
  lanes: runtime.lanes
});
ok(promoted.state.systems.parallel.jobs.length === 0 &&
  promoted.state.systems.events.pending.length === 0,
'后续推进不会再补待决策');

const labels = advanced.report.passive.parallelCompleted.map(function (entry) {
  return typeof entry === 'string' ? entry : entry.label;
}).join('|');
ok(!/NPC响应|等待NPC|系统等待/.test(labels),
  '并行进度摘要不出现生硬的系统等待文案');

console.log('\nStage 4 基础并行社交自测：' + passed + ' 通过，' +
  failed + ' 失败');
if (failed) process.exitCode = 1;
