'use strict';

const EventEngine = require('../core/event-engine.js');
const EventContent = require('../content/event-templates.js');
const SectContent = require('../content/sects.js');
const Simulation = require('../core/simulation.js');
const Stage4Rules = require('../core/stage4-rules.js');

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

function fixture(seed) {
  const records = {};
  for (let index = 1; index <= 12; index++) {
    const id = 'npc-' + index;
    records[id] = {
      id: id,
      identity: { name: '人物' + index },
      status: 'living',
      regionId: 'qinglan-town',
      sectId: null
    };
  }
  return {
    rngState: seed || 1,
    player: {
      regionId: 'qinglan-town',
      flags: { completedFirstAction: false }
    },
    systems: {
      npcs: {
        records: records,
        activeIds: Object.keys(records),
        backgroundIds: [],
        backgroundCursor: 0
      },
      relationships: { edges: {}, bonds: {}, restrictions: {} },
      events: {
        nextId: 1,
        pending: [],
        resolvedRecent: [],
        resolvedIdRanges: [],
        summaries: [],
        evolution: [],
        compacted: [],
        cooldowns: {},
        day: { index: 0, budget: 0, attempted: 0, created: 0 }
      },
      sects: {
        player: {
          sectId: null,
          choiceEventOffered: false,
          choiceAvailableAt: 0
        }
      },
      world: { elapsedSeconds: 0 }
    }
  };
}

for (let index = 0; index < 20; index++) {
  const budget = EventEngine.rollDailyBudget({
    random: function () { return index / 20; }
  });
  ok(Number.isInteger(budget) && budget >= 5 && budget <= 10,
    '每日关键事件预算是五到十的整数（样本 ' + (index + 1) + '）');
}

const scheduled = fixture(7);
let randomIndex = 0;
const randomValues = [0.01, 0.19, 0.37, 0.55, 0.73, 0.91];
const helper = {
  random: function () {
    const value = randomValues[randomIndex % randomValues.length];
    randomIndex++;
    return value;
  },
  nowSeconds: function () { return 7200; }
};
scheduled.systems.events.day.budget = 6;
for (let index = 0; index < 6; index++) {
  const result = EventEngine.schedulePlayerEvent(
    scheduled,
    helper,
    { templates: EventContent.TEMPLATES }
  );
  ok(result.ok === true, '有容量时事件槽能生成第 ' + (index + 1) +
    ' 条基础事件');
  Object.keys(scheduled).forEach(function (key) { delete scheduled[key]; });
  Object.assign(scheduled, result.state);
}
ok(scheduled.systems.events.pending.length === 6 &&
  scheduled.systems.events.day.created === 6,
'有合格模板和空余容量时按日预算生成待决事件');

const deterministicA = fixture(19);
const deterministicB = fixture(19);
deterministicA.systems.events.day.budget = 1;
deterministicB.systems.events.day.budget = 1;
function deterministicHelper() {
  let cursor = 0;
  const values = [0.2, 0.4, 0.6, 0.8];
  return {
    random: function () {
      const value = values[cursor % values.length];
      cursor++;
      return value;
    },
    nowSeconds: function () { return 7200; }
  };
}
const first = EventEngine.schedulePlayerEvent(
  deterministicA,
  deterministicHelper(),
  { templates: EventContent.TEMPLATES }
);
const second = EventEngine.schedulePlayerEvent(
  deterministicB,
  deterministicHelper(),
  { templates: EventContent.TEMPLATES }
);
ok(first.ok === true && second.ok === true &&
  same(first.state, second.state),
'同一保存态与随机序列生成相同人物、模板和选项快照');

const full = fixture(2);
full.systems.events.pending = Array.from({ length: 20 }, function (_, index) {
  return { id: 'full-' + index, options: [] };
});
full.systems.events.day.budget = 10;
const paused = EventEngine.schedulePlayerEvent(
  full,
  deterministicHelper(),
  { templates: EventContent.TEMPLATES }
);
ok(paused.ok === false && paused.code === 'pending_capacity' &&
  paused.state.systems.events.day.attempted === 1 &&
  paused.state.systems.events.pending.length === 20,
'待决已满会记下一次尝试但不会覆盖或补发事件');

const history = fixture(3);
for (let index = 0; index < 325; index++) {
  history.systems.events.summaries.push({
    id: 'summary-' + index,
    category: 'npc',
    npcId: 'npc-' + (index % 12 + 1),
    at: index * 86400
  });
}
for (let index = 0; index < 525; index++) {
  history.systems.events.evolution.push({
    id: 'evolution-' + index,
    category: 'sect',
    sectId: 'taixuan-sword',
    at: index * 86400
  });
}
const compacted = EventEngine.compactWorldHistory(history);
const compactedAgain = EventEngine.compactWorldHistory(compacted);
ok(compacted.systems.events.summaries.length === 300 &&
  compacted.systems.events.evolution.length === 500 &&
  compacted.systems.events.compacted.reduce(function (total, entry) {
    return total + entry.count;
  }, 0) === 50,
'详细摘要保留三百/五百条，较旧记录压缩后仍保存数量');
ok(same(compacted, compactedAgain),
'没有新增旧记录时重复压缩保持幂等');

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
        inspect: function () { return { status: 'ready', reason: null }; },
        complete: function () { return { stopReason: null }; },
        random: function (state) {
          state.rngState =
            (Math.imul(state.rngState || 1, 1664525) + 1013904223) >>> 0;
          return state.rngState / 0x100000000;
        }
      },
      lanes: []
    };
  }
};
const runtime = Stage4Rules.create({
  Stage3Rules: fakeStage3,
  eventTemplates: EventContent.TEMPLATES
});
function runtimeFixture() {
  const state = fixture(12345);
  state.systems.social = { nextBenefitId: 1, benefits: [] };
  state.systems.parallel = { jobs: [] };
  state.systems.world = {
    elapsedSeconds: 0,
    activeAccumulator: 0,
    backgroundAccumulator: 0,
    sectAccumulator: 0,
    eventAccumulator: 0
  };
  state.systems.sects.records = {};
  state.systems.sects.pairStates = {};
  state.systems.sects.player.joinedAt = null;
  state.systems.sects.player.contribution = {};
  state.systems.sects.player.reputation = {};
  SectContent.SECTS.forEach(function (sect) {
    state.systems.sects.records[sect.id] = {
      id: sect.id,
      leaderId: null,
      roleByNpcId: {},
      power: 10,
      reputation: 0,
      lastChangedAt: 0
    };
  });
  return state;
}
const cadenceStart = runtimeFixture();
const beforeBoundary = Simulation.advance(cadenceStart, 899, {
  source: 'online',
  fromMs: 0,
  rules: runtime.rules,
  lanes: runtime.lanes
});
const onBoundary = Simulation.advance(beforeBoundary.state, 1, {
  source: 'online',
  fromMs: 899000,
  rules: runtime.rules,
  lanes: runtime.lanes
});
ok(beforeBoundary.state.systems.npcs.records['npc-1'].lastDetailedAt !== 899 &&
  onBoundary.state.systems.npcs.records['npc-1'].lastDetailedAt === 900,
'统一模拟在精确九百秒边界运行活跃人物决策');

const oneDay = Simulation.advance(runtimeFixture(), 86400, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 0,
  rules: runtime.rules,
  lanes: runtime.lanes
});
let chunked = { state: runtimeFixture() };
for (let index = 0; index < 96; index++) {
  chunked = Simulation.advance(chunked.state, 900, {
    source: 'online',
    fromMs: index * 900000,
    mainActionLimitSeconds: 0,
    rules: runtime.rules,
    lanes: runtime.lanes
  });
}
ok(same(oneDay.state, chunked.state),
'二十四小时一次推进与九十六段在线推进得到相同世界保存态');
ok(oneDay.state.systems.events.pending.length >= 5 &&
  oneDay.state.systems.events.pending.length <= 10 &&
  oneDay.state.systems.events.evolution.length >= 5,
'一天内生成有限关键事件并继续保存宗门演变摘要');

console.log('\nStage 4 基础事件调度自测：' + passed + ' 通过，' +
  failed + ' 失败');
if (failed) process.exitCode = 1;
