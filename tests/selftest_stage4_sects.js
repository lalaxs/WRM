'use strict';

const SectSimulation = require('../core/sect-simulation.js');
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
      realmStage: 1,
      spiritualRootId: 'single',
      skills: {
        herb: { level: 3, xp: 2 },
        caiyao: { lv: 3, xp: 2 },
        mining: { level: 2, xp: 0 },
        caiju: { lv: 2, xp: 0 },
        fishing: { level: 2, xp: 0 },
        diaoyu: { lv: 2, xp: 0 },
        fulu: { lv: 2, xp: 0 },
        talisman: { level: 2, xp: 0 }
      },
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
ok(SectSimulation.choosePlayerSect(
  initial,
  'taixuan-sword',
  { nowSeconds: function () { return 10; } }
).ok === true,
'未完成首次主行动也可按门槛加入宗门');
initial.player.flags.completedFirstAction = true;
const offered = SectSimulation.onFirstActionCompleted(
  initial,
  { nowSeconds: function () { return 100; } }
);
ok(offered.ok === true &&
  offered.state.systems.sects.player.choiceEventOffered === true &&
  offered.state.systems.events.pending.length === 0,
'首次完成主行动后仍会记录解锁标记，且不进入待决策');
const offeredAgain = SectSimulation.onFirstActionCompleted(
  offered.state,
  { nowSeconds: function () { return 101; } }
);
ok(offeredAgain.code === 'no_change' &&
  offeredAgain.state.systems.events.pending.length === 0,
'重复完成行动不会重复解锁或灌入待决策');

const joined = SectSimulation.choosePlayerSect(
  offered.state,
  'taixuan-sword',
  { nowSeconds: function () { return 120; } }
);
ok(joined.ok === true &&
  joined.state.systems.sects.player.sectId === 'taixuan-sword',
'玩家在宗门页直接加入门派');
ok(joined.state.player.skills.herb.level === 3 &&
  joined.state.player.techniques.learned.cloudPiercingSword.level === 2,
'加入或更换宗门不会删除已学技能与功法');

const blocked = SectSimulation.choosePlayerSect(
  Object.assign(JSON.parse(JSON.stringify(offered.state)), {
    player: Object.assign(
      JSON.parse(JSON.stringify(offered.state.player)),
      { realmStage: 0, spiritualRootId: 'dual' }
    )
  }),
  'taixuan-sword',
  { nowSeconds: function () { return 130; } }
);
ok(blocked.ok === false && blocked.code === 'sect_requirement',
'未满足加入要求时不可入门');

const unlocked = SectSimulation.onFirstActionCompleted(
  Object.assign(fixture(), {
    player: Object.assign(fixture().player, {
      flags: { completedFirstAction: true }
    })
  }),
  { nowSeconds: function () { return 100; } }
);
const wandering = SectSimulation.choosePlayerSect(
  unlocked.state,
  null,
  { nowSeconds: function () { return 120; } }
);
ok(wandering.ok === true &&
  wandering.state.systems.sects.player.sectId === null,
'可继续以散修身份游历');
const rejoinSoon = SectSimulation.choosePlayerSect(
  wandering.state,
  'baicao-valley',
  { nowSeconds: function () { return 121; } }
);
ok(rejoinSoon.ok === true &&
  rejoinSoon.state.systems.sects.player.sectId === 'baicao-valley',
'退宗或确认散修后可立即再加入门派');

const left = SectSimulation.choosePlayerSect(
  rejoinSoon.state,
  null,
  { nowSeconds: function () { return 130; } }
);
ok(left.ok === true && left.state.systems.sects.player.sectId === null,
'已入门后可在宗门页直接离开');
const rejoinAfterLeave = SectSimulation.choosePlayerSect(
  left.state,
  'taixuan-sword',
  { nowSeconds: function () { return 131; } }
);
ok(rejoinAfterLeave.ok === true &&
  rejoinAfterLeave.state.systems.sects.player.sectId === 'taixuan-sword',
'退宗后可立即再加入其他门派');

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
  typeof evolved.state.systems.sects.records['taixuan-sword']
    .roleByNpcId['npc-1'] === 'string' &&
  typeof evolved.state.systems.npcs.records['npc-1'].officeSlotId ===
    'string',
'宗门领袖与职位槽按境界稳定确定');
ok(evolved.state.systems.npcs.records['npc-2'].officeSlotId &&
  evolved.state.systems.sects.records['taixuan-sword']
    .roleByNpcId['npc-2'],
'次席弟子也会落入门派职位');
ok(Object.keys(evolved.state.systems.sects.pairStates).length === 10,
'五宗两两关系完整保存');
ok(evolved.state.systems.events.evolution.every(function (entry) {
  return !entry || String(entry.id || '').indexOf('sect-day-') !== 0;
}), '每日门务不再写入大事记流水');
ok(JSON.stringify(evolved.state).indexOf('breakthroughChance') < 0 &&
  JSON.stringify(evolved.state).indexOf('breakthroughProbability') < 0,
'宗门演变不写入突破概率修正');

console.log('\nStage 4 基础宗门自测：' + passed + ' 通过，' +
  failed + ' 失败');
if (failed) process.exitCode = 1;
