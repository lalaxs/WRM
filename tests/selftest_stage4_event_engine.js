'use strict';

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
function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const template = Object.freeze({
  id: 'friend-offer',
  revision: 1,
  scope: 'player',
  category: 'relationship',
  cooldownSeconds: 0,
  requirements: [],
  title: '{{npcName}}递来一封信',
  body: '{{npcName}}希望与你认真结交。',
  options: Object.freeze([
    Object.freeze({
      id: 'accept',
      label: '坦然接受',
      preview: '成为好友',
      effects: Object.freeze([
        Object.freeze({
          type: 'relationDelta',
          sourceId: 'player',
          targetId: '{{npcId}}',
          values: Object.freeze({ trust: 4 })
        }),
        Object.freeze({
          type: 'setBondStage',
          firstId: 'player',
          secondId: '{{npcId}}',
          stage: 'friend'
        })
      ])
    }),
    Object.freeze({
      id: 'delay',
      label: '先互寄书信',
      preview: '两分钟后再决定',
      effects: Object.freeze([
        Object.freeze({
          type: 'startSocialJob',
          npcId: '{{npcId}}',
          label: '与{{npcName}}互寄书信',
          durationSeconds: 120,
          followupTemplateId: 'friend-followup'
        })
      ])
    })
  ])
});
const followup = Object.freeze({
  id: 'friend-followup',
  revision: 1,
  scope: 'player',
  category: 'relationship',
  cooldownSeconds: 0,
  requirements: [],
  title: '书信已有回音',
  body: '{{npcName}}在信末约你再谈。',
  options: Object.freeze([
    Object.freeze({
      id: 'read',
      label: '收好来信',
      preview: '信任略有增加',
      effects: Object.freeze([
        Object.freeze({
          type: 'relationDelta',
          sourceId: '{{npcId}}',
          targetId: 'player',
          values: Object.freeze({ trust: 2 })
        })
      ])
    })
  ])
});
const templates = Object.freeze([template, followup]);

function fixture() {
  return {
    schemaVersion: 5,
    player: {
      regionId: 'qinglan-town',
      inventory: {
        capacity: 20,
        capacityGrants: { shop: 0, achievement: 0, task: 0 },
        stacks: { spiritPeach: 1 },
        bindings: {}
      }
    },
    systems: {
      npcs: {
        records: {
          'npc-1': {
            id: 'npc-1',
            identity: { name: '沈青梧', gender: 'female', appearance: {} },
            status: 'living',
            romancePrincipleId: 'negotiable'
          }
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
      sects: {
        player: {
          sectId: null,
          joinedAt: null,
          contribution: {},
          reputation: {},
          choiceEventOffered: false
        }
      },
      parallel: { jobs: [] },
      social: { nextBenefitId: 1, benefits: [] }
    }
  };
}

const context = {
  npcId: 'npc-1',
  npcName: '沈青梧',
  regionId: 'qinglan-town',
  regionName: '青岚镇'
};
const created = EventEngine.instantiate(
  fixture(),
  'friend-offer',
  context,
  { nowSeconds: function () { return 10; } },
  templates
);
ok(created.ok === true &&
  created.event.title === '沈青梧递来一封信' &&
  created.event.body.includes('沈青梧'),
'模板只用保存的上下文渲染为完整中文事件');
ok(created.event.options[0].effects[1].secondId === 'npc-1',
  '事件实例保存替换完成的效果快照');
const queued = EventEngine.enqueue(created.state, created.event);
ok(queued.ok === true && queued.state.systems.events.pending.length === 1,
  '事件实例进入不覆盖的待决队列');
const resolved = EventEngine.resolve(
  queued.state,
  created.event.id,
  'accept',
  { nowSeconds: function () { return 20; } }
);
ok(resolved.ok === true &&
  resolved.state.systems.events.pending.length === 0 &&
  resolved.state.systems.events.resolvedRecent.length === 1,
'事件选项一次性移出待决并写入已处理记录');
ok(resolved.state.systems.relationships.edges[
  'player>npc-1'
].trust === 4 &&
  resolved.state.systems.relationships.bonds[
    'npc-1|player'
  ].stage === 'friend' &&
  resolved.state.systems.relationships.bonds[
    'npc-1|player'
  ].changedByEventId === created.event.id,
'关系阶段在克隆状态中按已处理事件证据顺序改变');
const duplicate = EventEngine.resolve(
  resolved.state,
  created.event.id,
  'accept',
  { nowSeconds: function () { return 30; } }
);
ok(duplicate.ok === true && duplicate.code === 'already_resolved' &&
  same(duplicate.state, resolved.state),
'重复提交同一事件选项保持幂等');

const delayedCreated = EventEngine.instantiate(
  fixture(),
  'friend-offer',
  context,
  { nowSeconds: function () { return 10; } },
  templates
);
const delayedQueued = EventEngine.enqueue(
  delayedCreated.state,
  delayedCreated.event
);
const delayed = EventEngine.resolve(
  delayedQueued.state,
  delayedCreated.event.id,
  'delay',
  { nowSeconds: function () { return 20; } }
);
ok(delayed.ok === true &&
  delayed.state.current === undefined &&
  delayed.state.systems.parallel.jobs.length === 1 &&
  delayed.state.systems.parallel.jobs[0].label ===
    '与沈青梧互寄书信',
'延迟回复创建具名并行社交且不占主行动');

const frozenSnapshot = JSON.parse(JSON.stringify(delayedQueued.state));
const registryRevisionChanged = templates.map(function (entry) {
  if (entry.id !== 'friend-offer') return entry;
  return Object.assign({}, entry, {
    revision: 99,
    options: [{
      id: 'accept',
      label: '已改版',
      preview: '',
      effects: [{ type: 'unknownAfterRevision' }]
    }]
  });
});
const oldResolved = EventEngine.resolve(
  frozenSnapshot,
  delayedCreated.event.id,
  'accept',
  { nowSeconds: function () { return 20; } },
  registryRevisionChanged
);
ok(oldResolved.ok === true,
  '已保存事件不依赖当前模板版本即可解决');

const bad = JSON.parse(JSON.stringify(delayedQueued.state));
bad.systems.events.pending[0].options[0].effects.push({
  type: 'unknownEffect'
});
const beforeBad = JSON.stringify(bad);
const rejected = EventEngine.resolve(
  bad,
  delayedCreated.event.id,
  'accept',
  { nowSeconds: function () { return 20; } }
);
ok(rejected.ok === false &&
  rejected.code === 'unknown_effect' &&
  JSON.stringify(bad) === beforeBad,
'任一未知效果使整个选项原子失败');

let capacity = fixture();
for (let index = 0; index < 20; index++) {
  const made = EventEngine.instantiate(
    capacity,
    'friend-offer',
    context,
    { nowSeconds: function () { return index; } },
    templates
  );
  capacity = EventEngine.enqueue(made.state, made.event).state;
}
const twentyFirst = EventEngine.instantiate(
  capacity,
  'friend-offer',
  context,
  { nowSeconds: function () { return 21; } },
  templates
);
const capacityResult = EventEngine.enqueue(
  twentyFirst.state,
  twentyFirst.event
);
ok(capacity.systems.events.pending.length === 20 &&
  capacityResult.ok === false &&
  capacityResult.code === 'pending_capacity',
'待决事件最多二十条且新事件不会覆盖旧事件');
const afterSixtyDays = JSON.parse(JSON.stringify(capacity));
afterSixtyDays.systems.world = { elapsedSeconds: 60 * 86400 };
ok(afterSixtyDays.systems.events.pending.length === 20,
  '待决事件没有过期时间');
const summary = EventEngine.appendSummary(capacity, {
  id: 'summary-1',
  category: 'region',
  title: '青岚镇近日灵雨充沛',
  at: 100
});
ok(summary.ok === true &&
  summary.state.systems.events.summaries.length === 1,
'队列已满时地区摘要仍可记录');
const evolution = EventEngine.appendEvolution(summary.state, {
  id: 'world-1',
  category: 'world',
  title: '琳琅坊市迎来远方商队',
  at: 101
});
ok(evolution.ok === true &&
  evolution.state.systems.events.evolution.length === 1,
'队列已满时世界演变仍继续记录');

console.log('\nStage 4 基础事件引擎自测：' + passed + ' 通过，' +
  failed + ' 失败');
if (failed) process.exitCode = 1;
