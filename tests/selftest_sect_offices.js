'use strict';

const SectOfficeContent = require('../content/sect-offices.js');
const SectOffices = require('../core/sect-offices.js');
const SectContent = require('../content/sects.js');
const Dns = require('../core/dns.js');
const Stage4State = require('../core/stage4-state.js');

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

ok(SectContent.SECTS.every(function (sect) {
  return SectOfficeContent.listSlots(sect.id).length >= 3;
}), '五大宗门均配置原版职阶槽（弟子/长老/掌门…）');

ok(SectOfficeContent.getSlot('taixuan-sword', 'honor').title === '剑仙' &&
  SectOfficeContent.getSlot('baicao-valley', 'leader').title === '谷主',
'门派特色职位名号正确');

ok(SectOfficeContent.getSlot('taixuan-sword', 'outer').id === 'disciple',
'旧席 outer 别名映射到弟子');

ok(Dns.retjob(3, 0) === 0 && Dns.retjob(6, 0) === 1,
'retjob 默认：≤5弟子，>5长老');
ok(Dns.retjob(7, 1, { peakCount: 0 }) === 2 &&
  Dns.jobmax[1] === 5,
'retjob 凌霄系 fami=1 可升峰主，jobmax[fami]=5');
ok(Dns.retjob(8, 2, { leaderTaken: false }) === 3,
'retjob 药王系 fami=2 满境可掌门');
ok(Dns.retjob(8, 2, { leaderTaken: true }) === 1,
'retjob 掌门已占则回落长老');

ok(SectOfficeContent.ROGUE_TITLES.length >= 8, '散修身份表不少于 8 种');

const fixture = {
  schemaVersion: 5,
  rngState: 1,
  player: {
    identity: { name: '测试', gender: 'female' },
    flags: { completedFirstAction: true }
  },
  systems: {
    npcs: {
      nextId: 5,
      activeTarget: 40,
      records: {
        'npc-1': {
          id: 'npc-1',
          identity: { name: '沈青梧', gender: 'female' },
          status: 'living',
          sectId: 'taixuan-sword',
          realmStage: 8,
          cultivation: 100,
          regionId: 'eastern-sect-heights',
          personalityId: 'chicheng',
          valueProfileId: 'benevolent',
          talentId: 'wood-spirit',
          romancePrincipleId: 'exclusive'
        },
        'npc-2': {
          id: 'npc-2',
          identity: { name: '陆观澜', gender: 'male' },
          status: 'living',
          sectId: 'taixuan-sword',
          realmStage: 3,
          cultivation: 40,
          regionId: 'eastern-sect-heights',
          personalityId: 'wenya',
          valueProfileId: 'scholarly',
          talentId: 'sword-heart',
          romancePrincipleId: 'tolerant'
        },
        'npc-3': {
          id: 'npc-3',
          identity: { name: '白无羁', gender: 'male' },
          status: 'living',
          sectId: null,
          realmStage: 4,
          cultivation: 20,
          regionId: 'qinglan-town',
          personalityId: 'shuaituo',
          valueProfileId: 'freedom-seeking',
          talentId: 'water-spirit',
          romancePrincipleId: 'casual'
        },
        'npc-4': {
          id: 'npc-4',
          identity: { name: '化神剑', gender: 'female' },
          status: 'living',
          sectId: 'taixuan-sword',
          realmStage: 12,
          cultivation: 900,
          regionId: 'eastern-sect-heights',
          personalityId: 'qingleng',
          valueProfileId: 'achievement-driven',
          talentId: 'sword-heart',
          romancePrincipleId: 'devoted'
        }
      },
      activeIds: ['npc-1', 'npc-2', 'npc-3', 'npc-4'],
      backgroundIds: [],
      backgroundCursor: 0
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
    }
  }
};

const normalized = Stage4State.normalize(fixture);
const sword = normalized.systems.sects.records['taixuan-sword'];
const senior = normalized.systems.npcs.records['npc-4'];
const stewardCandidate = normalized.systems.npcs.records['npc-2'];
const rogue = normalized.systems.npcs.records['npc-3'];
const leaderId = sword.leaderId;
const leader = leaderId && normalized.systems.npcs.records[leaderId];

ok(leader &&
  (Number(leader.realmStage) || 0) >= 8 &&
  leader.officeSlotId === 'leader' &&
  leader.job === 3 &&
  leaderId !== 'npc-1' &&
  leaderId !== 'npc-2' &&
  leaderId !== 'npc-3',
'宗主按需由高境人物担任，不从低境弟子硬提');
ok(sword.roleByNpcId[leaderId] === '宗主',
'宗主职位写入 role 映射');

ok(senior.officeSlotId === 'elder' || senior.officeSlotId === 'disciple',
'高境门人无显式任命时落长老/弟子，不当自动宗主');
ok(senior.job === 1 || senior.job === 0, '高境门人 job 为长老或弟子');
ok(leader.rogueTitleId == null, '门派弟子不挂散修身份');
ok(typeof rogue.rogueTitleId === 'string' &&
  SectOfficeContent.getRogueTitle(rogue.rogueTitleId),
'散修自动分配身份名号');
ok(rogue.officeSlotId == null, '散修无门派槽位');

ok(stewardCandidate.officeSlotId === 'disciple' &&
  stewardCandidate.job === 0,
'低阶弟子落入弟子职');

ok((sword.officeHolders.honor || []).length === 0,
'剑仙名号位无人显式任命时可空缺');
ok((sword.officeHolders.leader || []).indexOf(leaderId) >= 0,
'宗主占位写入 officeHolders');

const again = Stage4State.normalize(normalized);
ok(again.systems.npcs.records[leaderId].officeSlotId === 'leader' &&
  again.systems.npcs.records['npc-3'].rogueTitleId === rogue.rogueTitleId,
'再次归一化保持既有职位稳定');

const affiliation = SectOffices.resolveAffiliation(
  again.systems.npcs.records[leaderId],
  '太玄剑宗'
);
ok(affiliation === '太玄剑宗·宗主', '展示标签为门派·职位');

const rogueLabel = SectOffices.resolveAffiliation(
  again.systems.npcs.records['npc-3'],
  null
);
ok(/^散修·/.test(rogueLabel), '散修展示为散修·身份');

ok(typeof SectOfficeContent.assignJobByRealm === 'function',
'content 导出 assignJobByRealm');
const sample = {
  id: 'npc-x',
  sectId: 'taixuan-sword',
  realmStage: 0,
  officeSlotId: null
};
SectOfficeContent.assignJobByRealm(sample);
ok(sample.officeSlotId === 'disciple' && sample.job === 0,
'retjob：炼气→弟子');
sample.realmStage = 6;
SectOfficeContent.assignJobByRealm(sample);
ok(sample.officeSlotId === 'elder' && sample.job === 1,
'retjob：高境→长老');
SectOfficeContent.assignJobByRealm(sample, { officeSlotId: 'leader' });
ok(sample.officeSlotId === 'leader' && sample.job === 3,
'显式任命可指定宗主');
SectOfficeContent.assignJobByRealm(sample, { forceRogue: true });
ok(sample.sectId == null && sample.officeSlotId == null &&
  typeof sample.rogueTitleId === 'string',
'forceRogue 转为散修');

// 百草谷峰主编制
const peakSample = {
  id: 'npc-peak',
  sectId: 'baicao-valley',
  fami: 1,
  realmStage: 7,
  officeSlotId: null
};
SectOfficeContent.assignJobByRealm(peakSample, {
  retjobCtx: { peakCount: 0, leaderTaken: true, honorTaken: true }
});
ok(peakSample.officeSlotId === 'peak' && peakSample.job === 2,
'编制上下文下百草谷高境可升峰主');

const lowOnly = Stage4State.normalize({
  schemaVersion: 5,
  rngState: 2,
  player: fixture.player,
  systems: {
    npcs: {
      nextId: 3,
      activeTarget: 40,
      records: {
        'npc-1': {
          id: 'npc-1',
          identity: { name: '甲', gender: 'female' },
          status: 'living',
          sectId: 'taixuan-sword',
          realmStage: 2,
          cultivation: 10,
          regionId: 'eastern-sect-heights',
          personalityId: 'chicheng',
          valueProfileId: 'benevolent',
          talentId: 'wood-spirit',
          romancePrincipleId: 'exclusive'
        },
        'npc-2': {
          id: 'npc-2',
          identity: { name: '乙', gender: 'male' },
          status: 'living',
          sectId: 'taixuan-sword',
          realmStage: 1,
          cultivation: 5,
          regionId: 'eastern-sect-heights',
          personalityId: 'wenya',
          valueProfileId: 'scholarly',
          talentId: 'sword-heart',
          romancePrincipleId: 'tolerant'
        }
      },
      activeIds: ['npc-1', 'npc-2'],
      backgroundIds: [],
      backgroundCursor: 0
    },
    sects: fixture.systems.sects
  }
});
ok((lowOnly.systems.sects.records['taixuan-sword'].officeHolders.honor || [])
  .length === 0,
'无人达境时名号位允许空缺，不降门槛硬补');
const lowLeaderId = lowOnly.systems.sects.records['taixuan-sword'].leaderId;
const lowLeader = lowLeaderId &&
  lowOnly.systems.npcs.records[lowLeaderId];
ok(lowLeader &&
  lowLeaderId !== 'npc-1' &&
  lowLeaderId !== 'npc-2' &&
  (Number(lowLeader.realmStage) || 0) >= 8 &&
  lowLeader.officeSlotId === 'leader' &&
  lowLeader.metPlayer !== true,
'低境弟子不坐宗主；按需生成未结识的高境宗主');
ok(lowOnly.systems.npcs.records['npc-1'].officeSlotId !== 'leader' &&
  lowOnly.systems.npcs.records['npc-2'].officeSlotId !== 'leader',
'炼气弟子只落弟子席，不当宗主');
ok(lowOnly.systems.sects.records['taixuan-sword']
  .roleByNpcId['npc-2'] !== undefined,
'其余弟子仍有职位名');

// 玩家升阶路径独立存在
const SectPavilion = require('../core/sect-pavilion.js');
ok(typeof SectPavilion.buildPavilionView === 'function' &&
  typeof SectPavilion.promoteDisciple === 'function' &&
  typeof SectPavilion.syncAfterBreakthrough === 'function',
'玩家与 NPC 共用职阶；可主动升阶 + 突破同步');

console.log('\n门派职位/散修身份自测：' + passed + ' 通过，' +
  failed + ' 失败');
if (failed) process.exitCode = 1;
