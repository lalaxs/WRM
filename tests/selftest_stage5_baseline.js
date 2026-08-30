'use strict';

const assert = require('assert');
const LifecycleContent = require('../content/lifecycle.js');
const LifeSkillContent = require('../content/life-skills.js');
const Stage4State = require('../core/stage4-state.js');
const Lineage = require('../core/lineage.js');
const InheritanceHall = require('../core/inheritance-hall.js');
const LegacyTransition = require('../core/legacy-transition.js');
const Stage5Rules = require('../core/stage5-rules.js');
const NpcRoster = require('../core/npc-roster.js');

let passed = 0;
function ok(condition, label) {
  assert.ok(condition, label);
  passed++;
}

function partner() {
  return {
    id: 'npc-1',
    identity: {
      name: '沈清和',
      gender: 'male',
      appearance: {
        buildId: 'slender',
        faceId: 'clear-face',
        hairId: 'long-black',
        featureId: 'quiet-eyes'
      }
    },
    ageYears: 24,
    ageRemainderSeconds: 0,
    lifeStage: 'adult',
    lifespanYears: 80,
    realmStage: 0,
    cultivation: 0,
    talentId: 'wood-spirit',
    personalityId: 'steady',
    valueProfileId: 'benevolent',
    romancePrincipleId: 'negotiable',
    regionId: 'qinglan-town',
    sectId: null,
    familyId: 'family-1',
    skills: {},
    techniques: [],
    inventorySummary: { wealthTier: 1, notableItemIds: [] },
    biography: [],
    keyEventIds: [],
    status: 'living',
    lastDetailedAt: 0,
    lastBackgroundAt: 0
  };
}

function fixture() {
  const skills = {};
  Object.keys(LifeSkillContent.SKILLS).forEach(function (skillId, index) {
    skills[skillId] = { level: index + 2, xp: index * 11 };
  });
  const model = Stage4State.normalize({
    schemaVersion: 5,
    created: true,
    player: {
      name: '闻人照月',
      realmStage: 0,
      cultivation: 99,
      shouyuan: 120,
      shouMax: 120,
      skills: skills
    },
    appearance: { parts: { body: 1, hair: 2 } },
    rngState: 123456789,
    systems: {
      npcs: {
        nextId: 2,
        activeTarget: 40,
        records: { 'npc-1': partner() },
        activeIds: ['npc-1'],
        backgroundIds: [],
        backgroundCursor: 0
      },
      relationships: {
        edges: {},
        bonds: {
          'npc-1|player': {
            stage: 'partner',
            changedByEventId: 'event-partner',
            changedAt: 0
          }
        },
        restrictions: {}
      }
    }
  }, { preserveLegacyFields: true });
  model.systems.relationships.bonds['npc-1|player'] = {
    stage: 'partner',
    changedByEventId: 'event-partner',
    changedAt: 0
  };
  return model;
}

ok(LifecycleContent.WORLD_YEAR_SECONDS === 43200,
  '一个世界年是现实十二小时');
ok(LifecycleContent.LINEAGE_RITUAL_SECONDS === 21600,
  '传承仪式是具名六小时并行进度');

const initial = fixture();
ok(initial.player.lifecycle.ageYears === 18 &&
  initial.systems.homestead.inheritanceHall.level === 1,
'旧存档自动获得基础生命周期与传承殿');

const proposed = Lineage.propose(initial, 'npc-1', 10);
ok(proposed.ok && proposed.state.current == null,
  '正式伴侣可以开始不占主行动的传承仪式');
ok(proposed.state.systems.parallel.jobs[0].kind === 'lineageRitual',
  '传承仪式保存为具名并行进度');

const fakeStage4 = {
  create: function () {
    return {
      rules: {
        start: function () {},
        getAction: function () {},
        nextBoundary: function () {},
        elapse: function () {},
        inspect: function () {},
        complete: function () {},
        random: function () {}
      },
      lanes: []
    };
  }
};
const runtime = Stage5Rules.create({ Stage4Rules: fakeStage4 });
const lane = runtime.lanes.find(function (candidate) {
  return candidate.id === 'stage5-lineage';
});
const evolved = proposed.state;
lane.elapse(evolved, LifecycleContent.LINEAGE_RITUAL_SECONDS);
const report = {
  passive: { parallelCompleted: [] },
  lifecycle: { births: [], adulthood: [] }
};
lane.resolve(evolved, {
  nowMs: function () { return 21610000; },
  report: report
});
const childId = Object.keys(evolved.systems.lineage.descendants)[0];
ok(childId && report.lifecycle.births.length === 1,
  '六小时到时会确定性创建永久后代');
ok(evolved.systems.npcs.records[childId].lifeStage === 'child',
  '新生后代先处于儿童阶段');
ok(!evolved.systems.npcs.activeIds.includes(childId) &&
  !evolved.systems.npcs.backgroundIds.includes(childId),
'儿童不会进入成年人物模拟池');

evolved.systems.npcs.records[childId].ageYears = 18;
const matured = Lineage.markAdultDescendants(evolved, 999);
ok(matured.ok &&
  matured.state.systems.npcs.records[childId].lifeStage === 'adult',
'后代满十八岁后进入成年阶段');
const balanced = NpcRoster.rebalance(matured.state, { target: 40 });
ok(balanced.systems.npcs.activeIds.includes(childId) ||
  balanced.systems.npcs.backgroundIds.includes(childId),
'成年后代进入现有人物分层');

const badPlan = InheritanceHall.setPlan(balanced, {
  fullMasteryIds: ['a', 'b', 'c', 'd'],
  techniqueIds: [],
  equipmentItemIds: [],
  resourceItemIds: []
});
ok(!badPlan.ok, '传承殿一级会限制方案槽位');
const savedPlan = InheritanceHall.setPlan(balanced, {
  fullMasteryIds: ['herb'],
  techniqueIds: [],
  equipmentItemIds: [],
  resourceItemIds: ['spiritWood']
});
ok(savedPlan.ok &&
  savedPlan.state.systems.homestead.inheritanceHall.plan
    .fullMasteryIds[0] === 'herb',
'基础传承方案可以持久保存');

const originalSkills = JSON.stringify(savedPlan.state.player.skills);
const heirName = savedPlan.state.systems.npcs.records[childId].identity.name;
savedPlan.state.systems.world.elapsedSeconds = 2000000;
savedPlan.state.systems.world.activeAccumulator = 99999;
savedPlan.state.systems.world.monthAccumulator = 99999;
savedPlan.state.systems.world.calendar.monthAccumulator = 99999;
savedPlan.state.systems.world.calendar.year = 80;
const began = LegacyTransition.begin(
  savedPlan.state,
  'voluntary',
  1000
);
const selected = LegacyTransition.chooseRoute(
  began.state,
  'descendant',
  childId
);
const inherited = LegacyTransition.confirm(selected.state, 1001);
const refreshedChild = inherited.state.systems.npcs.records[childId];
ok(inherited.ok &&
  inherited.state.player.name === heirName &&
  Object.keys(inherited.state.systems.npcs.records).length >= 3 &&
  inherited.state.player.kin &&
  !inherited.state.player.kin.mo &&
  !inherited.state.player.kin.fa &&
  Array.isArray(inherited.state.player.kin.frs) &&
  inherited.state.player.kin.frs.length >= 2 &&
  (!refreshedChild || refreshedChild.identity.name !== heirName) &&
  Object.keys(inherited.state.systems.npcs.records).every(function (id) {
    return inherited.state.systems.npcs.records[id].status !==
      'playerIdentity';
  }),
'传代后按关系包重建人物圈，继承人以玩家身份进入新世界');
ok(JSON.stringify(inherited.state.player.skills) === originalSkills &&
  Object.keys(inherited.state.player.skills).length === 12,
'传代时十二项生活技能等级与经验完全保留');
ok(inherited.state.systems.lineage.lives.length === 1 &&
  inherited.state.systems.lineage.pendingTransition === null &&
  Object.keys(inherited.state.systems.lineage.descendants).length === 0,
'旧人生写入传承记录且转换一次性完成');
ok(inherited.state.systems.world.calendar.year === 1 &&
  inherited.state.systems.world.calendar.month === 1 &&
  inherited.state.systems.world.elapsedSeconds === 0 &&
  inherited.state.systems.world.activeAccumulator === 0 &&
  inherited.state.systems.world.monthAccumulator === 0 &&
  inherited.state.systems.world.calendar.monthAccumulator === 0,
'新人生从新世界日历与时钟重新开始');

const rebirthStart = LegacyTransition.begin(
  inherited.state,
  'voluntary',
  2000
);
const rebirthRoute = LegacyTransition.chooseRoute(
  rebirthStart.state,
  'newIdentity'
);
const drafted = LegacyTransition.updateDraft(rebirthRoute.state, {
  name: '陆明月',
  originId: 'wanderingReborn',
  personalityId: 'steady',
  talentId: 'plainSpirit',
  appearance: { parts: { body: 2, hair: 3 } }
});
const reborn = LegacyTransition.confirm(drafted.state, 2001);
ok(reborn.ok &&
  reborn.state.player.name === '陆明月' &&
  JSON.stringify(reborn.state.player.skills) === originalSkills,
'也可以创建新身份轮回且生活技能不重置');

const chronicleSeed = LegacyTransition.begin(
  reborn.state,
  'voluntary',
  3000
);
const chronicleRoute = LegacyTransition.chooseRoute(
  chronicleSeed.state,
  'newIdentity'
);
const chronicleDraft = LegacyTransition.updateDraft(chronicleRoute.state, {
  name: '陆清秋',
  originId: 'wanderingReborn',
  personalityId: 'steady',
  talentId: 'plainSpirit'
});
chronicleDraft.state.systems.world.worldEvents = [
  {
    id: 'we-old',
    type: 'talk',
    participants: ['npc-1', 'npc-2'],
    location: 'qinglan-town',
    narrative: '上一世旧事',
    source: 'world',
    atMonth: 1,
    visibleFromMonth: 1
  }
];
chronicleDraft.state.systems.world.nextWorldEventId = 9;
chronicleDraft.state.systems.world.calendar.yearEventsCreated = 5;
const chronicleCleared = LegacyTransition.confirm(chronicleDraft.state, 3001);
ok(
  chronicleCleared.ok &&
    Array.isArray(chronicleCleared.state.systems.world.worldEvents) &&
    chronicleCleared.state.systems.world.worldEvents.length >= 1 &&
    chronicleCleared.state.systems.world.worldEvents.some(function (ev) {
      return ev && Array.isArray(ev.tags) && ev.tags.indexOf('prologue') >= 0;
    }) &&
    chronicleCleared.state.systems.world.nextWorldEventId >= 2 &&
    chronicleCleared.state.systems.world.calendar.yearEventsCreated >= 1 &&
    Object.keys(chronicleCleared.state.systems.npcs.records).length >= 3 &&
    chronicleCleared.state.player.kin &&
    !chronicleCleared.state.player.kin.mo &&
    Object.keys(chronicleCleared.state.systems.npcs.records).every(function (id) {
      const npc = chronicleCleared.state.systems.npcs.records[id];
      return npc && npc.status !== 'playerIdentity' && npc.status !== 'ascended';
    }),
  '开启新人生会清空旧大事记并写入踏入旅途开场见闻'
);

console.log('Stage 5 基础生命周期与传承自测：' + passed + ' 通过 / 0 失败');
