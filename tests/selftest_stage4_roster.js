'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const Stage4State = require('../core/stage4-state.js');

let NpcRoster = null;
try {
  NpcRoster = require('../core/npc-roster.js');
} catch (error) {
  NpcRoster = null;
}

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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function npc(id, overrides) {
  return Object.assign({
    id: id,
    identity: { name: id, gender: 'female', appearance: {} },
    ageYears: 20,
    lifespanYears: 80,
    realmStage: 0,
    cultivation: 0,
    talentId: 'wood-spirit',
    personalityId: 'steady',
    valueProfileId: 'benevolent',
    romancePrincipleId: 'negotiable',
    regionId: 'cangwu-market',
    sectId: null,
    familyId: 'family-' + id,
    skills: {},
    techniques: [],
    inventorySummary: { wealthTier: 0, notableItemIds: [] },
    biography: [],
    keyEventIds: [],
    status: 'living',
    lastDetailedAt: 0,
    lastBackgroundAt: 0
  }, overrides || {});
}

function model(count) {
  const value = {
    player: { regionId: 'qinglan-town' },
    systems: {
      npcs: {
        nextId: count + 1,
        activeTarget: 40,
        records: {},
        activeIds: [],
        backgroundIds: [],
        backgroundCursor: 0
      },
      relationships: { edges: {}, bonds: {}, restrictions: {} },
      events: { pending: [] },
      sects: { player: { sectId: null } },
      parallel: { jobs: [] }
    }
  };
  for (let index = count; index >= 1; index--) {
    const id = 'npc-' + index;
    value.systems.npcs.records[id] = npc(id);
  }
  return value;
}

function partitionIds(value) {
  return value.systems.npcs.activeIds.concat(
    value.systems.npcs.backgroundIds
  );
}

ok(NpcRoster !== null, '人物名册分层模块存在');
ok(NpcRoster !== null &&
   typeof NpcRoster.relevance === 'function' &&
   typeof NpcRoster.rebalance === 'function' &&
   typeof NpcRoster.assertPartition === 'function',
'人物名册只公开相关度、重分层和分区断言');

if (NpcRoster) {
  ok(Object.isFrozen(NpcRoster), '人物名册公共边界冻结');

  const initial = model(120);
  const beforeInitial = JSON.stringify(initial);
  const balanced = NpcRoster.rebalance(initial, { target: 40 });
  ok(balanced !== initial &&
     balanced.systems.npcs.activeIds.length === 40 &&
     balanced.systems.npcs.backgroundIds.length === 80,
  '首批 120 名永久人物精确分成 40 人活跃圈和 80 人背景池');
  ok(JSON.stringify(initial) === beforeInitial,
    '重分层不修改调用方保存态');
  ok(NpcRoster.assertPartition(balanced) === true &&
     new Set(partitionIds(balanced)).size === 120,
  '全部在世人物恰好属于一个模拟层级');

  const low = NpcRoster.rebalance(initial, { target: -100 });
  const high = NpcRoster.rebalance(initial, { target: 500 });
  ok(low.systems.npcs.activeTarget === 30 &&
     low.systems.npcs.activeIds.length === 30,
  '低于下限的活跃目标夹到 30');
  ok(high.systems.npcs.activeTarget === 50 &&
     high.systems.npcs.activeIds.length === 50,
  '高于上限的活跃目标夹到 50');

  const priorities = model(40);
  priorities.systems.npcs.records['npc-2'].regionId = 'qinglan-town';
  priorities.systems.npcs.records['npc-3'].sectId = 'taixuan-sword';
  priorities.systems.npcs.records['npc-4'].regionId = 'qinglan-town';
  priorities.systems.npcs.records['npc-4'].sectId = 'taixuan-sword';
  priorities.systems.npcs.records['npc-5'].regionId = 'qinglan-town';
  priorities.systems.npcs.records['npc-5'].sectId = 'taixuan-sword';
  priorities.systems.npcs.records['npc-6'].regionId = 'qinglan-town';
  priorities.systems.npcs.records['npc-6'].sectId = 'taixuan-sword';
  priorities.systems.npcs.records['npc-7'].regionId = 'qinglan-town';
  priorities.systems.npcs.records['npc-7'].sectId = 'taixuan-sword';
  priorities.systems.npcs.records['npc-8'].regionId = 'qinglan-town';
  priorities.systems.npcs.records['npc-8'].sectId = 'taixuan-sword';
  priorities.systems.sects.player.sectId = 'taixuan-sword';
  priorities.systems.relationships.bonds['npc-4|player'] = {
    stage: 'friend',
    changedByEventId: 'event-old',
    changedAt: 1
  };
  priorities.systems.relationships.edges['player>npc-7'] = {
    affection: 1
  };
  priorities.systems.parallel.jobs.push({
    id: 'social-job-active',
    kind: 'social',
    npcId: 'npc-5',
    remainingSeconds: 30,
    totalSeconds: 60,
    ready: false,
    completionReported: false
  }, {
    id: 'social-job-ready',
    kind: 'social',
    npcId: 'npc-8',
    remainingSeconds: 0,
    totalSeconds: 60,
    ready: true,
    completionReported: true
  });
  priorities.systems.events.pending.push({
    id: 'event-pending',
    participants: ['npc-6']
  });
  const scorePending = NpcRoster.relevance(priorities, 'npc-6');
  const scoreSocial = NpcRoster.relevance(priorities, 'npc-5');
  const scoreReadySocial = NpcRoster.relevance(priorities, 'npc-8');
  const scoreBond = NpcRoster.relevance(priorities, 'npc-4');
  const scoreConnection = NpcRoster.relevance(priorities, 'npc-7');
  const scoreSect = NpcRoster.relevance(priorities, 'npc-3');
  const scoreRegion = NpcRoster.relevance(priorities, 'npc-2');
  const scoreNone = NpcRoster.relevance(priorities, 'npc-1');
  ok(Number.isInteger(scorePending) &&
     scorePending > scoreSocial &&
     scoreSocial > scoreBond &&
     scoreBond > scoreSect &&
     scoreSect > scoreRegion &&
     scoreRegion > scoreNone,
  '待决事件、社交、羁绊、同宗和同地区使用互不重叠的有序整数优先级');
  ok(scoreReadySocial === scoreSocial &&
     scoreConnection === scoreBond,
  '已报告但仍待晋升的 ready 社交人物继续保留固定优先层');

  const numericTie = model(12);
  const numericBalanced = NpcRoster.rebalance(
    numericTie,
    { target: 30 }
  );
  ok(numericBalanced.systems.npcs.activeIds.indexOf('npc-2') <
       numericBalanced.systems.npcs.activeIds.indexOf('npc-10'),
  '同分使用 ASCII 数字 NPC ID 排序而非词典或地区排序');

  const promotedInput = model(31);
  promotedInput.systems.npcs.activeTarget = 30;
  promotedInput.systems.npcs.activeIds = Array.from(
    { length: 30 },
    function (_, index) { return 'npc-' + (index + 1); }
  );
  promotedInput.systems.npcs.backgroundIds = ['npc-31'];
  const previouslyActive = promotedInput.systems.npcs.activeIds.slice();
  promotedInput.systems.relationships.edges['npc-31>player'] = {
    affection: 1
  };
  const promoted = NpcRoster.rebalance(promotedInput, { target: 30 });
  const displaced = previouslyActive.filter(function (id) {
    return !promoted.systems.npcs.activeIds.includes(id);
  });
  ok(promoted.systems.npcs.activeIds.includes('npc-31') &&
     displaced.length === 1 &&
     promoted.systems.npcs.backgroundIds.includes(displaced[0]),
  '背景人物产生玩家联系后进入活跃圈且被替换者回到背景池');
  ok(Object.keys(promoted.systems.npcs.records).length === 31,
    '人物退出活跃圈时永久记录不被删除');

  const pendingCapacity = model(31);
  pendingCapacity.systems.npcs.activeTarget = 30;
  pendingCapacity.systems.npcs.activeIds = Array.from(
    { length: 30 },
    function (_, index) { return 'npc-' + (index + 1); }
  );
  pendingCapacity.systems.npcs.backgroundIds = ['npc-31'];
  pendingCapacity.systems.parallel.jobs.push({
    id: 'social-job-awaiting-event-capacity',
    kind: 'social',
    npcId: 'npc-31',
    remainingSeconds: 0,
    totalSeconds: 60,
    ready: true,
    completionReported: true
  });
  const pendingCapacityBalanced = NpcRoster.rebalance(
    pendingCapacity,
    { target: 30 }
  );
  ok(pendingCapacityBalanced.systems.npcs.activeIds.includes('npc-31'),
    '事件队列满时仍留在 ready 队列的人物会从背景层进入活跃圈');

  const pinned = model(70);
  pinned.systems.events.pending = Array.from(
    { length: 60 },
    function (_, index) {
      return {
        id: 'event-' + (index + 1),
        participants: ['npc-' + (index + 1)]
      };
    }
  );
  const pinnedBalanced = NpcRoster.rebalance(pinned, { target: 50 });
  ok(JSON.stringify(pinnedBalanced.systems.npcs.activeIds) ===
       JSON.stringify(Array.from(
         { length: 50 },
         function (_, index) { return 'npc-' + (index + 1); }
       )),
  '超过 50 名固定优先人物时保留最高稳定相关度集合且没有重复');

  const firstOrder = model(120);
  const secondOrder = clone(firstOrder);
  secondOrder.systems.npcs.records = {};
  Object.keys(firstOrder.systems.npcs.records).reverse().forEach(function (id) {
    secondOrder.systems.npcs.records[id] =
      clone(firstOrder.systems.npcs.records[id]);
  });
  const firstResult = NpcRoster.rebalance(firstOrder, { target: 40 });
  const secondResult = NpcRoster.rebalance(secondOrder, { target: 40 });
  ok(JSON.stringify(firstResult.systems.npcs.activeIds) ===
       JSON.stringify(secondResult.systems.npcs.activeIds) &&
     JSON.stringify(firstResult.systems.npcs.backgroundIds) ===
       JSON.stringify(secondResult.systems.npcs.backgroundIds),
  '相同保存态不受对象属性插入顺序影响并得到完全相同的分层数组');

  const lifecycle = model(4);
  lifecycle.systems.npcs.records['npc-2'].status = 'dead';
  lifecycle.systems.npcs.records['npc-3'].status = 'reincarnated';
  lifecycle.systems.npcs.records['npc-4'].status = 'ascended';
  lifecycle.systems.npcs.activeIds = [
    'npc-1', 'npc-2', 'missing', 'npc-1'
  ];
  lifecycle.systems.npcs.backgroundIds = ['npc-3', 'npc-4', 'npc-1'];
  const lifecycleBalanced = NpcRoster.rebalance(
    lifecycle,
    { target: 40 }
  );
  ok(JSON.stringify(partitionIds(lifecycleBalanced)) ===
       JSON.stringify(['npc-1']) &&
     NpcRoster.assertPartition(lifecycleBalanced) === true,
  '死亡、转世、飞升和不存在的人物都从模拟分层排除');
  const duplicatePartition = clone(lifecycleBalanced);
  duplicatePartition.systems.npcs.backgroundIds.push('npc-1');
  ok(NpcRoster.assertPartition(duplicatePartition) === false,
    '分区断言拒绝跨层重复人物');
  const omittedLiving = clone(initial);
  omittedLiving.systems.npcs.activeIds = [];
  omittedLiving.systems.npcs.backgroundIds = [];
  ok(NpcRoster.assertPartition(omittedLiving) === false,
    '分区断言拒绝遗漏仍在世人物');

  const cloneInput = model(40);
  const clonedResult = NpcRoster.rebalance(cloneInput, { target: 40 });
  clonedResult.systems.npcs.records['npc-1'].identity.name = 'changed';
  ok(cloneInput.systems.npcs.records['npc-1'].identity.name === 'npc-1',
    '返回的规范模型与输入深度隔离');

  let getterHits = 0;
  const accessorModel = model(40);
  Object.defineProperty(accessorModel.systems.events, 'pending', {
    enumerable: true,
    get: function () {
      getterHits++;
      return [];
    }
  });
  ok(NpcRoster.rebalance(accessorModel, { target: 40 }) === null &&
     NpcRoster.relevance(accessorModel, 'npc-1') === 0 &&
     NpcRoster.assertPartition(accessorModel) === false &&
     getterHits === 0,
  '保存态访问器零执行并在全部公共入口失败关闭');

  let optionGetterHits = 0;
  const optionAccessor = {};
  Object.defineProperty(optionAccessor, 'target', {
    enumerable: true,
    get: function () {
      optionGetterHits++;
      return 50;
    }
  });
  ok(NpcRoster.rebalance(model(120), optionAccessor) === null &&
     optionGetterHits === 0,
  '重分层选项访问器零执行并失败关闭');

  const revokedPair = Proxy.revocable(model(40), {});
  revokedPair.revoke();
  let revokedResult;
  try {
    revokedResult = NpcRoster.rebalance(revokedPair.proxy, { target: 40 });
  } catch (error) {
    revokedResult = 'threw';
  }
  ok(revokedResult === null &&
     NpcRoster.assertPartition(revokedPair.proxy) === false,
  '已撤销保存态代理不抛错并失败关闭');

  const throwingProxy = new Proxy(model(40), {
    ownKeys: function () {
      throw new Error('hostile ownKeys');
    }
  });
  ok(NpcRoster.rebalance(throwingProxy, { target: 40 }) === null,
    '恶意代理反射异常时失败关闭');

  class NonPlainModel {}
  const nonPlain = new NonPlainModel();
  nonPlain.systems = model(40).systems;
  nonPlain.player = { regionId: 'qinglan-town' };
  ok(NpcRoster.rebalance(nonPlain, { target: 40 }) === null &&
     NpcRoster.relevance(nonPlain, 'npc-1') === 0 &&
     NpcRoster.assertPartition(nonPlain) === false,
  '非普通对象模型在全部公共入口失败关闭');

  const hostileArrayAudit = spawnSync(process.execPath, ['-e', [
    "'use strict';",
    "const R = require('../core/npc-roster.js');",
    'function model(pending) {',
    '  return {',
    "    player: { regionId: 'qinglan-town' },",
    '    systems: {',
    '      npcs: {',
    '        nextId: 2, activeTarget: 40,',
    "        records: { 'npc-1': {",
    "          id: 'npc-1', status: 'living',",
    "          regionId: 'remote', sectId: null",
    '        } },',
    '        activeIds: [], backgroundIds: [], backgroundCursor: 0',
    '      },',
    '      relationships: { edges: {}, bonds: {} },',
    '      events: { pending: pending },',
    '      sects: { player: { sectId: null } },',
    '      parallel: { jobs: [] }',
    '    }',
    '  };',
    '}',
    'function timed(pending) {',
    '  const started = Date.now();',
    '  const result = R.rebalance(model(pending), { target: 40 });',
    '  return { rejected: result === null, elapsedMs: Date.now() - started };',
    '}',
    'const maximum = timed(new Array(4294967295));',
    'const fiveMillion = timed(new Array(5000000));',
    'let atLimitOwnKeys = 0;',
    'const atLimitArray = new Proxy(new Array(100000).fill(null), {',
    '  ownKeys: function (target) {',
    '    atLimitOwnKeys++;',
    '    return Reflect.ownKeys(target);',
    '  }',
    '});',
    'const atLimit = timed(atLimitArray);',
    'const beyondLimit = timed(new Array(100001).fill(null));',
    'let denseOverLimitOwnKeys = 0;',
    'const denseOverLimitArray = new Proxy(',
    '  new Array(500000).fill(null),',
    '  {',
    '    ownKeys: function (target) {',
    '      denseOverLimitOwnKeys++;',
    '      return Reflect.ownKeys(target);',
    '    }',
    '  }',
    ');',
    'const denseOverLimit = timed(denseOverLimitArray);',
    'const nodeBudget = timed(Array.from(',
    '  { length: 100000 },',
    '  function (_, index) { return { left: index, right: index }; }',
    '));',
    'let getterHits = 0;',
    'const accessor = [null];',
    "Object.defineProperty(accessor, '0', {",
    '  enumerable: true,',
    '  get: function () { getterHits++; return {}; }',
    '});',
    'const accessorRejected = R.rebalance(',
    '  model(accessor), { target: 40 }',
    ') === null;',
    'let lengthDescriptorCalls = 0;',
    'const statefulLength = new Proxy([], {',
    '  getOwnPropertyDescriptor: function (target, key) {',
    '    const descriptor = Reflect.getOwnPropertyDescriptor(target, key);',
    "    if (key !== 'length') return descriptor;",
    '    lengthDescriptorCalls++;',
    '    return Object.assign({}, descriptor, {',
    '      value: lengthDescriptorCalls === 1 ? 0 : 1',
    '    });',
    '  }',
    '});',
    'const statefulRejected = R.rebalance(',
    '  model(statefulLength), { target: 40 }',
    ') === null;',
    'const revokedPair = Proxy.revocable([], {});',
    'const revokedModel = model(revokedPair.proxy);',
    'revokedPair.revoke();',
    'const revokedRejected = R.rebalance(',
    '  revokedModel, { target: 40 }',
    ') === null;',
    'if (!maximum.rejected || !fiveMillion.rejected ||',
    '    atLimit.rejected || !beyondLimit.rejected ||',
    '    !denseOverLimit.rejected ||',
    '    !nodeBudget.rejected ||',
    '    !accessorRejected || getterHits !== 0 ||',
    '    !statefulRejected || !revokedRejected ||',
    '    atLimitOwnKeys !== 2 || denseOverLimitOwnKeys !== 0 ||',
    '    maximum.elapsedMs > 250 || fiveMillion.elapsedMs > 250 ||',
    '    atLimit.elapsedMs > 750 || beyondLimit.elapsedMs > 250 ||',
    '    denseOverLimit.elapsedMs > 250 ||',
    '    nodeBudget.elapsedMs > 750) {',
    '  process.exitCode = 1;',
    '}',
    'console.log(JSON.stringify({',
    '  maximum: maximum,',
    '  fiveMillion: fiveMillion,',
    '  atLimit: atLimit,',
    '  beyondLimit: beyondLimit,',
    '  denseOverLimit: denseOverLimit,',
    '  atLimitOwnKeys: atLimitOwnKeys,',
    '  denseOverLimitOwnKeys: denseOverLimitOwnKeys,',
    '  nodeBudget: nodeBudget,',
    '  getterHits: getterHits,',
    '  lengthDescriptorCalls: lengthDescriptorCalls,',
    '  statefulRejected: statefulRejected,',
    '  revokedRejected: revokedRejected',
    '}));'
  ].join('\n')], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    timeout: 3000
  });
  if (hostileArrayAudit.status === 0) {
    console.log('  hostile sparse arrays: ' +
      hostileArrayAudit.stdout.trim());
  }
  ok(hostileArrayAudit.status === 0,
  '超长密集数组在 ownKeys 前拒绝，十万边界仍枚举并保留');

  const browserSandbox = {
    console: console,
    Object: Object,
    Array: Array,
    Number: Number,
    String: String,
    Boolean: Boolean,
    Math: Math,
    Set: Set,
    Map: Map
  };
  browserSandbox.globalThis = browserSandbox;
  vm.createContext(browserSandbox);
  vm.runInContext(
    fs.readFileSync('core/npc-roster.js', 'utf8'),
    browserSandbox,
    { filename: 'core/npc-roster.js' }
  );
  ok(browserSandbox.NpcRoster &&
     Object.isFrozen(browserSandbox.NpcRoster) &&
     typeof browserSandbox.NpcRoster.rebalance === 'function',
  '人物名册 UMD 浏览器边界与 CommonJS 一致冻结');
  const indexSource = fs.readFileSync('index.html', 'utf8');
  ok(indexSource.indexOf('core/npc-generator.js') <
       indexSource.indexOf('core/npc-roster.js') &&
     indexSource.indexOf('core/npc-roster.js') <
       indexSource.indexOf('core/stage4-state.js'),
  '浏览器严格按人物生成器、名册、Stage4State 顺序加载');

  const noRandom = model(120);
  const originalRandom = Math.random;
  let noRandomResult = null;
  Math.random = function () {
    throw new Error('roster must not consume RNG');
  };
  try {
    noRandomResult = NpcRoster.rebalance(noRandom, { target: 40 });
  } finally {
    Math.random = originalRandom;
  }
  ok(noRandomResult !== null &&
     noRandomResult.systems.npcs.activeIds.length === 40,
  '重分层完全由保存态决定且不消耗随机数');

  const normalized = Stage4State.defaults();
  normalized.schemaVersion = 5;
  normalized.systems.npcs.records = {};
  for (let index = 1; index <= 31; index++) {
    const id = 'npc-' + index;
    normalized.systems.npcs.records[id] = npc(id);
  }
  normalized.systems.npcs.nextId = 32;
  normalized.systems.npcs.activeTarget = 30;
  normalized.systems.npcs.activeIds = Array.from(
    { length: 30 },
    function (_, index) { return 'npc-' + (index + 1); }
  );
  normalized.systems.npcs.backgroundIds = ['npc-31'];
  normalized.systems.relationships.edges['player>npc-31'] = {
    affection: 1
  };
  const repairedByState = Stage4State.normalize(normalized);
  ok(repairedByState.systems.npcs.activeIds.includes('npc-31') &&
     repairedByState.systems.npcs.backgroundIds.length === 1 &&
     Stage4State.validate(repairedByState) === true,
  'Stage4State 通用规范化按保存态相关度确定性修复人物分区');
  const reopenedByState = Stage4State.normalize(clone(repairedByState));
  ok(JSON.stringify(reopenedByState) === JSON.stringify(repairedByState),
    'v5 重开保持名册分区与 RNG 的字节稳定');
}

console.log(`\nStage 4 人物名册自测：${passed} 通过，${failed} 失败`);
if (failed > 0) process.exitCode = 1;
