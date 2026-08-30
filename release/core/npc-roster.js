// 轻量 NPC 名册维护器（对标反编译原版的「不维护全员池」设计）。
//
// 旧版 npc-roster.js 是一整套「全员池」重平衡算法：按权重（pendingEvent /
// socialJob / playerConnection / sameSect / sameRegion）在 最高 250000 节点
// 的图里反复重排 activeIds / backgroundIds，维持 30~50 人的常驻活跃圈。
// 这是 O(全体) 的沉重成本，且本质上在「模拟一个 NPC 世界」——与原版
// 「NPC 只在关系形成时存在、事件只唤醒关系圈」的轻量思路相悖。
//
// 新版本只做最小维护：保证 activeIds / backgroundIds 是合法数组、按
// activeTarget 把超额活跃者下沉到后台、剔除已不存在的记录。不再有任何
// 重平衡图算法。名册的「种子」由 stage4-state.js 在初始化时一次性拆分，
// 后续仅在血脉/传承成熟时由 stage5 调用本维护器补位。
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.NpcRoster = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_ACTIVE = 40;
  const MIN_ACTIVE = 1;
  const MAX_ACTIVE = 200;

  function certifiedTarget(options, fallback) {
    const requested = options && Number.isInteger(options.target)
      ? options.target
      : null;
    if (requested == null) {
      return Number.isInteger(fallback) ? fallback : DEFAULT_ACTIVE;
    }
    return Math.max(MIN_ACTIVE, Math.min(MAX_ACTIVE, requested));
  }

  function ensureArrays(npcs) {
    if (!npcs) return false;
    if (!Array.isArray(npcs.activeIds)) npcs.activeIds = [];
    if (!Array.isArray(npcs.backgroundIds)) npcs.backgroundIds = [];
    return true;
  }

  // 仅保留仍在 records 中且存活的 id。
  function pruneToRecords(npcs, records) {
    const alive = function (id) {
      const person = records && records[id];
      return !!person && person.status === 'living';
    };
    npcs.activeIds = npcs.activeIds.filter(alive);
    npcs.backgroundIds = npcs.backgroundIds.filter(alive);
  }

  function rebalanceInPlace(model, options) {
    const npcs = model && model.systems && model.systems.npcs;
    if (!ensureArrays(npcs)) return false;
    const records = npcs.records;
    const target = certifiedTarget(options, npcs.activeTarget);
    npcs.activeTarget = target;
    pruneToRecords(npcs, records);
    // 去重：活跃圈与后台层不允许跨层重复（保持单一归属）。
    const activeSet = new Set(npcs.activeIds);
    npcs.backgroundIds = npcs.backgroundIds.filter(function (id) {
      return !activeSet.has(id);
    });
    // 新生成 / 新成熟但尚未入层的人物先补进后台层，保证「每名在世人物
    // 恰好属于一个模拟层级」的不变式（stage4 规范化与 stage5 血脉成熟都依赖它）。
    const inTier = new Set(npcs.activeIds.concat(npcs.backgroundIds));
    Object.keys(records || {}).forEach(function (id) {
      const person = records[id];
      if (person && person.status === 'living' && !inTier.has(id)) {
        npcs.backgroundIds.push(id);
        inTier.add(id);
      }
    });
    // 活跃圈超额：把多出来的人下沉到后台，维持有限常驻规模（不再做权重重排）。
    while (npcs.activeIds.length > target && npcs.activeIds.length > 0) {
      const moved = npcs.activeIds.pop();
      if (moved != null && npcs.backgroundIds.indexOf(moved) < 0) {
        npcs.backgroundIds.push(moved);
      }
    }
    return true;
  }

  function rebalance(model, options) {
    const npcs = model && model.systems && model.systems.npcs;
    if (!npcs) return null;
    if (!rebalanceInPlace(model, options)) return null;
    return model;
  }

  return Object.freeze({
    DEFAULT_ACTIVE: DEFAULT_ACTIVE,
    MIN_ACTIVE: MIN_ACTIVE,
    MAX_ACTIVE: MAX_ACTIVE,
    rebalanceInPlace: rebalanceInPlace,
    rebalance: rebalance
  });
});
