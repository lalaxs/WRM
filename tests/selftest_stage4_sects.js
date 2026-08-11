'use strict';

const SectSimulation = require('../core/sect-simulation.js');
const EventEngine = require('../core/event-engine.js');
const EventContent = require('../content/event-templates.js');
const SectContent = require('../content/sects.js');

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

function fixture() {
  const records = {};
  SectContent.SECTS.forEach(function (sect, index) {
    records[sect.id] = {
      id: sect.id,
      leaderId: null,
      roleByNpcId: {},
      power: 10 + index,
      reputation: 0,
      lastChangedAt: 0
    };
  });
  return {
    player: {
      flags: { completedFirstAction: false },
      skills: { herb: { level: 3, xp: 2 } },
      techniques: { learned: { cloudPiercingSword: { level: 2, xp: 4 } } }
    },
    systems: {
      npcs: {
        records: {
          'npc-1': {
            id: 'npc-1',
            identity: { name: '沈青梧' },
            status: 'living',
            sectId: 'taixuan-sword',
            realmStage: 2,
            cultivation: 20,
            regionId: 'eastern-sect-heights'
          },
          'npc-2': {
            id: 'npc-2',
            identity: { name: '陆观澜' },
            status: 'living',
            sectId: 'taixuan-sword',
            realmStage: 1,
            cultivation: 80,
            regionId: 'eastern-sect-heights'
          }
        }
      },
      events: {
        nextId: 1,
        pending: [],
        resolvedRecent: [],
        resolvedIdRanges: [],
        summaries: [],
        evolution: [],
        compacted: [],
        cooldowns: {}
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
        records: records,
        pairStates: {}
      },
      relationships: { edges: {}, bonds: {}, restrictions: {} },
      parallel: { jobs: [] },
      social: { nextBenefitId: 1, benefits: [] },
      world: { elapsedSeconds: 0 }
    }
  };
}

const initial = fixture();
ok(initial.systems.sects.player.sectId === null &&
  SectSimulation.queryAll(initial).player.displayName === '散修',
'玩家开局保持散修身份');
const beforeAction = SectSimulation.onFirstActionCompleted(
  initial,
  { nowSeconds: function () { return 0; } },
  { templates: EventContent.TEMPLATES }
);
ok(beforeAction.ok === false && beforeAction.code === 'action_required',
'首次主行动完成以前不提供宗门选择');
initial.player.flags.completedFirstAction = true;
const offered = SectSimulation.onFirstActionCompleted(
  initial,
  { nowSeconds: function () { return 100; } },
  { templates: EventContent.TEMPLATES }
);
ok(offered.ok === true &&
  offered.state.systems.events.pending.filter(function (event) {
    return event.templateId === 'sect-first-choice';
  }).length === 1,
'首次完成主行动后恰好加入一条五宗门正式选择事件');
const offeredAgain = SectSimulation.onFirstActionCompleted(
  offered.state,
  { nowSeconds: function () { return 101; } },
  { templates: EventContent.TEMPLATES }
);
ok(offeredAgain.code === 'no_change' &&
  offeredAgain.state.systems.events.pending.length === 1,
'重复完成行动不会重复加入宗门选择');

const joined = EventEngine.resolve(
  offered.state,
  offered.state.systems.events.pending[0].id,
  'join-taixuan',
  { nowSeconds: function () { return 120; } }
);
ok(joined.ok === true &&
  joined.state.systems.sects.player.sectId === 'taixuan-sword',
'玩家加入宗门只通过已处理的事件选项完成');
ok(joined.state.player.skills.herb.level === 3 &&
  joined.state.player.techniques.learned.cloudPiercingSword.level === 2,
'加入或更换宗门不会删除已学技能与功法');

const wanderingEvent = SectSimulation.onFirstActionCompleted(
  Object.assign(fixture(), {
    player: Object.assign(fixture().player, {
      flags: { completedFirstAction: true }
    })
  }),
  { nowSeconds: function () { return 100; } },
  { templates: EventContent.TEMPLATES }
);
const wandering = EventEngine.resolve(
  wanderingEvent.state,
  wanderingEvent.state.systems.events.pending[0].id,
  'remain-wandering',
  { nowSeconds: function () { return 120; } }
);
const tooEarly = SectSimulation.onFirstActionCompleted(
  wandering.state,
  { nowSeconds: function () { return 120 + 86399; } },
  { templates: EventContent.TEMPLATES }
);
const reoffered = SectSimulation.onFirstActionCompleted(
  wandering.state,
  { nowSeconds: function () { return 120 + 86400; } },
  { templates: EventContent.TEMPLATES }
);
ok(tooEarly.code === 'cooldown' &&
  reoffered.ok === true &&
  reoffered.state.systems.events.pending.length === 1,
'继续散修后至少经过一个世界日才会再次收到选择');

const evolved = SectSimulation.advanceDay(
  joined.state,
  {
    random: function () { return 0.8; },
    nowSeconds: function () { return 86400; },
    report: { world: { sectChanges: 0, evolution: 0, events: [] } }
  },
  { sects: SectContent }
);
ok(evolved.ok === true &&
  SectContent.SECTS.every(function (sect) {
    return evolved.state.systems.sects.records[sect.id].power >= 1;
  }),
'五个固定宗门每天演变且势力值不会低于一');
ok(evolved.state.systems.sects.records['taixuan-sword'].leaderId ===
  'npc-1' &&
  evolved.state.systems.sects.records['taixuan-sword']
    .roleByNpcId['npc-2'] === '执事',
'宗门领袖与基础职务按保存数据稳定确定');
ok(Object.keys(evolved.state.systems.sects.pairStates).length === 10 &&
  evolved.state.systems.events.evolution.length >= 5,
'五宗两两关系及每日演变摘要完整保存');
ok(JSON.stringify(evolved.state).indexOf('breakthroughChance') < 0 &&
  JSON.stringify(evolved.state).indexOf('breakthroughProbability') < 0,
'宗门演变不写入突破概率修正');

console.log('\nStage 4 基础宗门自测：' + passed + ' 通过，' +
  failed + ' 失败');
if (failed) process.exitCode = 1;
