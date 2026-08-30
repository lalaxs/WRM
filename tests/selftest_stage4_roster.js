'use strict';

// 轻量 NPC 名册维护器自测（对标反编译原版的「不维护全员池」设计）。
//
// 旧版 npc-roster.js 是一整套「全员池」重平衡算法：按权重在最高 250000 节点的
// 图里反复重排 activeIds / backgroundIds，并导出 relevance / assertPartition 等
// 防御式入口。那套逻辑维持「模拟一个 NPC 世界」，与原版「NPC 只在关系形成时存在、
// 事件只唤醒关系圈」的轻量思路相悖，已在 P5 中彻底移除。
//
// 新版只做最小维护：保证 activeIds / backgroundIds 是合法数组、按 activeTarget
// 把超额活跃者下沉到后台、剔除已离世 / 不存在的记录。本文件即验证这套最小行为，
// 不再断言任何旧版重平衡图算法。

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

// 生成 count 名永久人物，前 activeCount 名进 activeIds，其余进 backgroundIds。
function model(count, activeCount) {
  const value = {
    player: { regionId: 'qinglan-town' },
    systems: {
      npcs: {
        nextId: count + 1,
        activeTarget: activeCount,
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
  const active = Math.max(0, Math.min(count, activeCount == null ? count : activeCount));
  for (let index = 1; index <= count; index++) {
    const id = 'npc-' + index;
    value.systems.npcs.records[id] = npc(id);
    if (index <= active) {
      value.systems.npcs.activeIds.push(id);
    } else {
      value.systems.npcs.backgroundIds.push(id);
    }
  }
  return value;
}

ok(NpcRoster !== null, '轻量 NPC 名册维护器模块存在');
ok(NpcRoster !== null &&
   typeof NpcRoster.rebalance === 'function' &&
   typeof NpcRoster.rebalanceInPlace === 'function' &&
   Number.isInteger(NpcRoster.DEFAULT_ACTIVE) &&
   Number.isInteger(NpcRoster.MIN_ACTIVE) &&
   Number.isInteger(NpcRoster.MAX_ACTIVE),
'名册只公开 rebalance / rebalanceInPlace 与边界常量（无旧版重平衡图算法）');

if (NpcRoster) {
  ok(Object.isFrozen(NpcRoster), '名册公共边界冻结');

  // 非法保存态被安全拒绝，不崩溃。
  ok(NpcRoster.rebalance({}) === null,
    '缺 systems.npcs 的保存态被安全拒绝（返回 null）');
  ok(NpcRoster.rebalanceInPlace({}) === false,
    'rebalanceInPlace 对非法保存态返回 false');

  // 缺 activeIds / backgroundIds 时自动补成合法空数组而非崩溃。
  const patched = {
    systems: {
      npcs: {
        records: { 'npc-1': npc('npc-1') },
        activeTarget: 40
      }
    }
  };
  ok(NpcRoster.rebalance(patched) !== null &&
     Array.isArray(patched.systems.npcs.activeIds) &&
     Array.isArray(patched.systems.npcs.backgroundIds),
  '缺 activeIds / backgroundIds 时自动补成合法空数组');

  // 目标值夹取到 [MIN_ACTIVE, MAX_ACTIVE]，不再有 30~50 常驻圈概念。
  const lo = model(10, 5);
  const loResult = NpcRoster.rebalance(lo, { target: -100 });
  ok(loResult && loResult.systems.npcs.activeTarget === NpcRoster.MIN_ACTIVE,
    '低于下限的目标夹到 MIN_ACTIVE=' + NpcRoster.MIN_ACTIVE);

  const hi = model(10, 5);
  const hiResult = NpcRoster.rebalance(hi, { target: 9999 });
  ok(hiResult && hiResult.systems.npcs.activeTarget === NpcRoster.MAX_ACTIVE,
    '高于上限的目标夹到 MAX_ACTIVE=' + NpcRoster.MAX_ACTIVE);

  // 缺席目标且保存态无 activeTarget 时回退到 DEFAULT_ACTIVE。
  const def = {
    systems: {
      npcs: {
        records: { 'npc-1': npc('npc-1') },
        activeIds: [],
        backgroundIds: []
      }
    }
  };
  const defResult = NpcRoster.rebalance(def, {});
  ok(defResult && defResult.systems.npcs.activeTarget === NpcRoster.DEFAULT_ACTIVE,
    '缺省目标且保存态无 activeTarget 时回退到 DEFAULT_ACTIVE=' +
      NpcRoster.DEFAULT_ACTIVE);

  // 活跃圈超额时把多出的人下沉到后台，两层互不重复。
  const oversized = model(120, 120);
  const oversizedResult = NpcRoster.rebalance(oversized, { target: 40 });
  ok(oversizedResult &&
     oversizedResult.systems.npcs.activeIds.length === 40 &&
     oversizedResult.systems.npcs.backgroundIds.length === 80,
  '活跃圈超额时把多出的 80 人下沉到后台（40 活跃 + 80 后台）');
  ok(oversizedResult.systems.npcs.activeIds.every(function (id) {
      return oversizedResult.systems.npcs.backgroundIds.indexOf(id) < 0;
    }) &&
     oversizedResult.systems.npcs.backgroundIds.every(function (id) {
      return oversizedResult.systems.npcs.activeIds.indexOf(id) < 0;
    }),
  '下沉后活跃圈与后台层互不重复');
  ok(oversizedResult.systems.npcs.activeIds.every(function (id, index) {
      return id === 'npc-' + (index + 1);
    }),
  '下沉从尾部弹出，活跃圈保留编号靠前的人');

  // 剔除已离世 / 不存在的记录；脏数据（跨层重复）被自然收敛为单一存活层。
  const lifecycle = model(4, 4);
  lifecycle.systems.npcs.records['npc-2'].status = 'dead';
  lifecycle.systems.npcs.records['npc-3'].status = 'ascended';
  lifecycle.systems.npcs.records['npc-4'].status = 'reincarnated';
  lifecycle.systems.npcs.backgroundIds.push('npc-3'); // 制造跨层脏数据
  const lifecycleResult = NpcRoster.rebalance(lifecycle, { target: 40 });
  const liveIds = lifecycleResult.systems.npcs.activeIds.concat(
    lifecycleResult.systems.npcs.backgroundIds
  );
  ok(liveIds.indexOf('npc-2') < 0 &&
     liveIds.indexOf('npc-3') < 0 &&
     liveIds.indexOf('npc-4') < 0 &&
     liveIds.indexOf('npc-1') >= 0 &&
     liveIds.indexOf('npc-1') === liveIds.lastIndexOf('npc-1'),
  '死亡 / 飞升 / 转世与不存在的人被排除，存活者保留且不跨层重复');

  // 完全不消费随机数——维护结果只由保存态决定。
  const noRandom = model(120, 120);
  const originalRandom = Math.random;
  let randomTouched = false;
  Math.random = function () {
    randomTouched = true;
    return 0.5;
  };
  const noRandomResult = NpcRoster.rebalance(noRandom, { target: 40 });
  Math.random = originalRandom;
  ok(noRandomResult !== null &&
     randomTouched === false &&
     noRandomResult.systems.npcs.activeIds.length === 40,
  '维护器完全由保存态决定且不消费随机数');

  // 原地维护并返回同一保存态（无深度拷贝开销）。
  const sameModel = model(120, 120);
  ok(NpcRoster.rebalance(sameModel, { target: 40 }) === sameModel,
    'rebalance 原地维护并返回同一保存态');

  // 浏览器 UMD 边界与 CommonJS 一致，且不再暴露旧 relevance 入口。
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
     typeof browserSandbox.NpcRoster.rebalance === 'function' &&
     typeof browserSandbox.NpcRoster.relevance === 'undefined',
  '浏览器 UMD 边界与 CommonJS 一致且不再暴露旧 relevance');

  // 浏览器严格按人物生成器、名册、Stage4State 顺序加载（顺序改动会破坏全局依赖）。
  const indexSource = fs.readFileSync('index.html', 'utf8');
  ok(indexSource.indexOf('core/npc-generator.js') <
       indexSource.indexOf('core/npc-roster.js') &&
     indexSource.indexOf('core/npc-roster.js') <
       indexSource.indexOf('core/stage4-state.js'),
  '浏览器严格按人物生成器、名册、Stage4State 顺序加载');
}

console.log(`\nStage 4 人物名册自测：${passed} 通过，${failed} 失败`);
if (failed > 0) process.exitCode = 1;
