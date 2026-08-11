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
ok(inherited.ok &&
  inherited.state.systems.npcs.records[childId].status === 'playerIdentity',
'可以选择成年女性后代接续玩家身份');
ok(JSON.stringify(inherited.state.player.skills) === originalSkills &&
  Object.keys(inherited.state.player.skills).length === 12,
'传代时十二项生活技能等级与经验完全保留');
ok(inherited.state.systems.lineage.lives.length === 1 &&
  inherited.state.systems.lineage.pendingTransition === null,
'旧人生写入传承记录且转换一次性完成');

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

console.log('Stage 5 基础生命周期与传承自测：' + passed + ' 通过 / 0 失败');
