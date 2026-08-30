'use strict';

// 轻量 NPC 生命周期自测（对标原版 person.addday / getexps / dns.exp / lvup）。
const NpcSimulation = require('../core/npc-simulation.js');
const Dns = require('../core/dns.js');

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
    level_l: 0,
    cultivation: 0,
    expsx: 1.0,
    lg: 3,
    spiritualRootId: 'single',
    personalityId: 'steady',
    valueProfileId: 'benevolent',
    regionId: 'qinglan-town',
    sectId: null,
    biography: [],
    status: 'living',
    lifeStage: 'adult',
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
        backgroundCursor: 0,
        activeTarget: 40
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

ok(Dns.cultivationNeed(0) === 100 && Dns.cultivationNeed(5) === 1400 &&
  Dns.cultivationNeed(8) === 3000,
  '突破门槛走 H5 细档（与玩家同量级）');
ok(Dns.exp[0] === 1000 && Dns.lgExp[3] === 100,
  '钉死原版 dns.exp / lg_exp 对照表');
ok(Math.abs(Dns.getexps({
  expsx: 1.0,
  lg: 3,
  level_l: 0,
  realmStage: 0
}) - 1.0) < 1e-9,
  'getexps：expsx1 × lg100/100 × (1+0.2*0) = 1');
ok(Math.abs(Dns.getexps({
  expsx: 1.0,
  lg: 3,
  level_l: 5,
  realmStage: 5
}) - 2.0) < 1e-9,
  'getexps：含 level_l 系数 (1+0.2*5)=2');
ok(Math.abs(Dns.breakthroughRate(0) - 1) < 1e-9 &&
  Math.abs(Dns.breakthroughRate(8) - 0.6) < 1e-9 &&
  Math.abs(Dns.breakthroughRate(15) - 0.1) < 1e-9,
  '突破率走 H5 细档（与玩家 TRANSITIONS 对齐）');

// 衰老 + 寿元尽
const aged = fixture();
aged.systems.npcs.records['npc-1'].lifespanYears = 21;
NpcSimulation.advanceAges(aged, 12 * 60 * 60 + 75);
ok(aged.systems.npcs.records['npc-1'].ageYears === 21 &&
  aged.systems.npcs.records['npc-1'].ageRemainderSeconds === 75,
'人物年龄使用完整经过时间并保存不足一年的余数');
ok(aged.systems.npcs.records['npc-1'].status === 'dead' &&
  !aged.systems.npcs.activeIds.includes('npc-1') &&
  aged.systems.npcs.records['npc-1'].biography.some(function (entry) {
    return entry && entry.kind === 'lifespan-end';
  }) &&
  aged.systems.events.evolution.some(function (entry) {
    return entry.category === 'lifecycle' &&
      entry.npcId === 'npc-1';
  }),
'达到寿元判定死亡并移出人物池');

// 对标 addday：一个月 += getexps（H5 月≈原版天）
const dayGain = fixture();
const p0 = dayGain.systems.npcs.records['npc-1'];
p0.expsx = 1.0;
p0.lg = 3;
p0.level_l = 0;
NpcSimulation.advanceCultivation(dayGain, Dns.MONTH_REAL_SECONDS, helpers([0.01], 0));
ok(Math.abs(p0.cultivation - 1.0) < 1e-6,
'一个月修为增量 = getexps（对标 addday / 游戏月）');

// 修炼持续增长但远未满细档门槛
const grown = fixture();
NpcSimulation.advanceCultivation(grown, 50, helpers([0.01], 50));
const grownCult = grown.systems.npcs.records['npc-1'].cultivation;
ok(grownCult > 0 && grownCult < 5,
'50 秒远未填满突破门槛');

// 修为满足则突破（炼气档，成功率 100%）
const broke = fixture();
broke.systems.npcs.records['npc-1'].realmStage = 0;
broke.systems.npcs.records['npc-1'].level_l = 0;
broke.systems.npcs.records['npc-1'].cultivation = 1000;
NpcSimulation.advanceCultivation(broke, 1, helpers([0.01], 1));
ok(broke.systems.npcs.records['npc-1'].realmStage === 1,
'修为达细档门槛可立刻突破');

// 高境按 H5 突破率表
const major = fixture();
major.systems.npcs.records['npc-1'].realmStage = 8;
major.systems.npcs.records['npc-1'].level_l = 8;
major.systems.npcs.records['npc-1'].cultivation = 2000000;
NpcSimulation.advanceCultivation(major, 1, helpers([0.01], 1));
ok(major.systems.npcs.records['npc-1'].realmStage === 9,
'高境按突破率表可突破成功');

const majorFail = fixture();
majorFail.systems.npcs.records['npc-1'].realmStage = 8;
majorFail.systems.npcs.records['npc-1'].level_l = 8;
majorFail.systems.npcs.records['npc-1'].cultivation = 2000000;
NpcSimulation.advanceCultivation(majorFail, 1, helpers([0.99], 1));
ok(majorFail.systems.npcs.records['npc-1'].realmStage === 8 &&
  majorFail.systems.npcs.records['npc-1'].cultivation === 0,
'突破失败会清空修为');

const multi = fixture();
multi.systems.npcs.records['npc-1'].realmStage = 0;
multi.systems.npcs.records['npc-1'].cultivation = 10000000;
NpcSimulation.advanceCultivation(multi, 1, helpers([0.01], 1));
ok(multi.systems.npcs.records['npc-1'].realmStage === 1,
'单次推进最多突破一档');

const ascended = fixture();
ascended.systems.npcs.records['npc-1'].realmStage = 15;
ascended.systems.npcs.records['npc-1'].level_l = 9;
ascended.systems.npcs.records['npc-1'].cultivation = 2000000;
NpcSimulation.advanceCultivation(ascended, 1, helpers([0.01], 1));
ok(ascended.systems.npcs.records['npc-1'].status === 'ascended' &&
  ascended.systems.npcs.records['npc-1'].realmStage >=
    NpcSimulation.ASCENSION_REALM_STAGE &&
  !ascended.systems.npcs.activeIds.includes('npc-1'),
'突破至飞升境后离世并移出人物池');

console.log('\nStage 4 轻量 NPC 生命周期自测：' + passed + ' 通过，' +
  failed + ' 失败');
if (failed) process.exitCode = 1;
