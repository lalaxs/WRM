'use strict';

const NpcSimulation = require('../core/npc-simulation.js');
const EventEngine = require('../core/event-engine.js');

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

function person(id, overrides) {
  return Object.assign({
    id: id,
    identity: { name: id, gender: 'female', appearance: {} },
    ageYears: 20,
    ageRemainderSeconds: 0,
    lifespanYears: 80,
    realmStage: 0,
    cultivation: 0,
    personalityId: 'steady',
    valueProfileId: 'benevolent',
    regionId: 'qinglan-town',
    sectId: null,
    biography: [],
    status: 'living',
    lastDetailedAt: 0,
    lastBackgroundAt: 0
  }, overrides || {});
}

function fixture() {
  return {
    rngState: 1,
    player: { regionId: 'qinglan-town' },
    systems: {
      npcs: {
        records: {
          'npc-1': person('npc-1'),
          'npc-2': person('npc-2'),
          'npc-3': person('npc-3'),
          'npc-4': person('npc-4')
        },
        activeIds: ['npc-1', 'npc-2'],
        backgroundIds: ['npc-3', 'npc-4'],
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
        cooldowns: {}
      },
      sects: { player: { sectId: null }, records: {}, pairStates: {} },
      world: { elapsedSeconds: 0 }
    }
  };
}

function helpers(values, now) {
  let index = 0;
  return {
    random: function () {
      const value = values[index % values.length];
      index++;
      return value;
    },
    nowSeconds: function () { return now || 0; },
    report: {
      world: {
        npcChanges: 0,
        sectChanges: 0,
        evolution: 0,
        newPending: 0,
        events: []
      }
    }
  };
}

const aged = fixture();
aged.systems.npcs.records['npc-1'].lifespanYears = 21;
NpcSimulation.advanceAges(aged, 12 * 60 * 60 + 75);
ok(aged.systems.npcs.records['npc-1'].ageYears === 21 &&
  aged.systems.npcs.records['npc-1'].ageRemainderSeconds === 75,
'人物年龄使用完整经过时间并保存不足一年的余数');
ok(aged.systems.npcs.records['npc-1'].status === 'living' &&
  aged.systems.events.evolution.some(function (entry) {
    return entry.category === 'future-lifecycle';
  }),
'达到寿元只记录后续生命周期提示，不在本阶段删除或判死');

const decisions = fixture();
NpcSimulation.chooseDecision(
  decisions,
  'npc-1',
  'active',
  helpers([0.01], 900),
  { EventEngine: EventEngine }
);
ok(decisions.systems.npcs.records['npc-1'].cultivation > 0,
'活跃人物可以自主修炼');
decisions.systems.npcs.records['npc-1'].cultivation = 100;
NpcSimulation.chooseDecision(
  decisions,
  'npc-1',
  'active',
  helpers([0.25, 0.01], 1800),
  { EventEngine: EventEngine }
);
ok(decisions.systems.npcs.records['npc-1'].realmStage === 1,
'修为满足基础条件的人物可以尝试并完成简单突破');
const oldRegion = decisions.systems.npcs.records['npc-1'].regionId;
NpcSimulation.chooseDecision(
  decisions,
  'npc-1',
  'active',
  helpers([0.45, 0.9], 2700),
  { regionIds: ['qinglan-town', 'cangwu-market'] }
);
ok(decisions.systems.npcs.records['npc-1'].regionId !== oldRegion,
'活跃人物可以在抽象地区之间旅行');
decisions.systems.npcs.records['npc-2'].regionId =
  decisions.systems.npcs.records['npc-1'].regionId;
NpcSimulation.chooseDecision(
  decisions,
  'npc-1',
  'active',
  helpers([0.65, 0.01, 0.01], 3600),
  { EventEngine: EventEngine }
);
ok(Boolean(decisions.systems.relationships.edges['npc-1>npc-2']) &&
  Boolean(decisions.systems.relationships.edges['npc-2>npc-1']),
'人物互动写入两个方向互不替代的稀疏关系边');
const autonomousBond = EventEngine.resolveAutonomousBondStage(
  decisions,
  'npc-1',
  'npc-2',
  'friend',
  '两位人物在同行中成为好友',
  { nowSeconds: function () { return 4000; } }
);
ok(autonomousBond.ok === true &&
  autonomousBond.state.systems.relationships.bonds['npc-1|npc-2']
    .changedByEventId ===
    autonomousBond.state.systems.events.resolvedRecent.slice(-1)[0].id,
'自主关系阶段变化由事件引擎写入已处理世界事件证据');
const autonomousSect = EventEngine.resolveAutonomousNpcSect(
  autonomousBond.state,
  'npc-2',
  'baicao-valley',
  { nowSeconds: function () { return 4100; } }
);
ok(autonomousSect.ok === true &&
  autonomousSect.state.systems.npcs.records['npc-2'].sectId ===
    'baicao-valley' &&
  autonomousSect.state.systems.events.resolvedRecent.slice(-1)[0]
    .templateId === 'autonomous-sect-membership',
'人物加入或离开宗门同样保存为已处理的世界事件');

const stepped = fixture();
const activeSummary = NpcSimulation.advanceActiveStep(
  stepped,
  helpers([0.01], 900),
  { EventEngine: EventEngine }
);
const backgroundSummary = NpcSimulation.advanceBackgroundStep(
  stepped,
  helpers([0.01], 21600),
  { EventEngine: EventEngine }
);
ok(activeSummary.processed === 2 &&
  stepped.systems.npcs.records['npc-1'].lastDetailedAt === 900,
'每个活跃边界只处理当前活跃圈人物');
ok(backgroundSummary.processed === 2 &&
  backgroundSummary.maxCandidates <= 3 &&
  stepped.systems.npcs.backgroundCursor === 0,
'后台边界按游标处理后台池且每人最多考虑三个候选');
ok(Object.keys(stepped.systems.npcs.records).length === 4,
'自主模拟不会删除永久人物记录');

const full = fixture();
full.systems.events.pending = Array.from({ length: 20 }, function (_, index) {
  return { id: 'event-full-' + index, options: [] };
});
const beforeCultivation = full.systems.npcs.records['npc-1'].cultivation;
NpcSimulation.advanceActiveStep(
  full,
  helpers([0.01], 900),
  { EventEngine: EventEngine }
);
ok(full.systems.npcs.records['npc-1'].cultivation > beforeCultivation,
'待决事件达到二十条时人物自主活动仍继续');

console.log('\nStage 4 基础人物模拟自测：' + passed + ' 通过，' +
  failed + ' 失败');
if (failed) process.exitCode = 1;
