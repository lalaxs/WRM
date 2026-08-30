/*
 * event-core.js —— 事件分类映射（对标原版 events:List<string[]> 描述符）
 *
 * 原版里每个事件是一个 string[]（第 0 位=事件类型/类别，后面是参数），
 * 运行时由 doevent(temp) 解释执行。这里做 H5 的同构：
 *
 *   1) EVENT_CATEGORIES —— 规范的「事件大类」字典（对标原版隐式分类）。
 *   2) classifyEvent(desc) —— 把 world-month 已经算好的布尔标志
 *      (romance/conflict/leap/characterBeat/stranger/fixed) + 关系标签，
 *      映射成规范的 { category, tags }，挂到每个 world event 上。
 *
 * 这样：
 *   - 每个事件都带「类型(type，驱动叙事)」+「大类(category，驱动分类)」+「tags(多维标签)」，
 *     与对标项目一致（type=具体动作，category=大类，tags=可扩展维度）。
 *   - 现有叙事完全不动（type 字段原样保留给 fillNarrative 用）。
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory()
    : factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.EventCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // 规范事件大类（对标原版隐式分类 + H5 已领先的标签体系）。
  const EVENT_CATEGORIES = Object.freeze({
    CULTIVATION: 'cultivation', // 修炼类（功法/突破/宗门事务）
    SOCIAL: 'social',           // 人际 / 社交类（相识、往来）
    ROMANCE: 'romance',         // 恋爱类（暧昧、告白、道侣）
    CONFLICT: 'conflict',       // 冲突类（恩怨、争斗）
    LEAP: 'leap',               // 奇遇类（机缘、异闻）
    STRANGER: 'stranger',       // 随机 NPC / 陌生开局类
    FIXED: 'fixed'              // 固定类标签（原版 root.mday 实为月天数表，非事件日程）
  });

  const CATEGORY_LABELS = Object.freeze({
    cultivation: '修炼',
    social: '人际',
    romance: '恋爱',
    conflict: '冲突',
    leap: '奇遇',
    stranger: '随机奇遇',
    fixed: '固定日程'
  });

  // 优先级：固定日程 > 陌生开局 > 奇遇 > 冲突 > 恋爱 > 修炼 > 人际。
  // （与原版"先走固定日程表、再补随机"的节拍一致。）
  const PRIORITY = [
    'fixed', 'stranger', 'leap', 'conflict', 'romance', 'cultivation', 'social'
  ];

  function hasTag(tags, tag) {
    return Array.isArray(tags) && tags.indexOf(tag) >= 0;
  }

  /*
   * 把候选描述符映射为规范分类。
   * desc 字段（均来自 world-month 已算好的候选）：
   *   action        : string   具体动作（如 'character_beat'），驱动叙事，不参与主分类。
   *   tags          : string[]  关系派生标签（'lover'/'partner'/'dao-companion'…），原样保留。
   *   romance / romanceConflict / conflict / leap / characterBeat / stranger / fixed : boolean
   * 返回 { category, tags } —— tags 含规范大类 + 原关系标签（去重）。
   */
  function classifyEvent(desc) {
    desc = desc || {};
    const out = [];
    if (Array.isArray(desc.tags)) {
      desc.tags.forEach(function (t) {
        if (typeof t === 'string' && out.indexOf(t) < 0) out.push(t);
      });
    }

    let category = EVENT_CATEGORIES.SOCIAL;
    if (desc.fixed) category = EVENT_CATEGORIES.FIXED;
    else if (desc.stranger) category = EVENT_CATEGORIES.STRANGER;
    else if (desc.leap) category = EVENT_CATEGORIES.LEAP;
    else if (desc.conflict) category = EVENT_CATEGORIES.CONFLICT;
    else if (desc.romance || desc.romanceConflict) {
      category = EVENT_CATEGORIES.ROMANCE;
    } else if (desc.characterBeat || desc.action === 'character_beat') {
      category = EVENT_CATEGORIES.CULTIVATION;
    } else {
      category = EVENT_CATEGORIES.SOCIAL;
    }

    if (out.indexOf(category) < 0) out.push(category);
    return { category: category, tags: out };
  }

  function labelOf(category) {
    return CATEGORY_LABELS[category] || category;
  }

  return Object.freeze({
    EVENT_CATEGORIES: EVENT_CATEGORIES,
    CATEGORY_LABELS: CATEGORY_LABELS,
    PRIORITY: PRIORITY,
    classifyEvent: classifyEvent,
    labelOf: labelOf,
    hasTag: hasTag
  });
});
