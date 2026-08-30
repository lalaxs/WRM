(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory()
    : factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.WorldCalendar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MONTH_REAL_SECONDS = 180;
  const MONTHS_PER_YEAR = 12;
  // 离线全量推演社交见闻的月数上限。超额只推日历/年龄（nudgeSkippedMonths），
  // 避免长离线进游戏时同步跑数百次 advanceOneMonth 造成白屏卡死。
  // 48 月 ≈ 2.4 真实小时的见闻保真；与主行动离线上限（12h/48h）解耦。
  const OFFLINE_MONTH_CAP = 48;
  // 离线见闻降频：在 cap 内的月份里，约 1/4 出见闻，且每月最多 1 条
  // （在线约为 randomlevel 1～2 条/月）。
  const OFFLINE_EVENT_MONTH_CHANCE = 0.25;
  const OFFLINE_EVENT_MONTHLY_CAP = 1;
  const WORLD_EVENT_PER_GAME_YEAR = 36;
  const WORLD_EVENT_MONTHLY_SOFT_CAP = 5;
  // 见闻保留上限：过大时在线 tick 的 clone/normalize/大事记扫描都会变卡。
  const WORLD_EVENT_RETENTION = 400;
  const CALENDAR_EPOCH_YEAR = 1;

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function record(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : null;
  }

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function clampInt(value, min, max) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function ensureCalendar(world) {
    if (!record(world)) return null;
    if (!record(world.calendar)) {
      world.calendar = {
        year: CALENDAR_EPOCH_YEAR,
        month: 1,
        monthAccumulator: 0,
        yearEventBudget: WORLD_EVENT_PER_GAME_YEAR,
        yearEventsCreated: 0,
        monthEventsCreated: 0,
        npcYearAppearances: {},
        playerLeapLastMonth: {}
      };
    }
    const cal = world.calendar;
    let year = clampInt(cal.year, 1, 99999);
    // 纠正早期占位默认年 342。
    if (year === 342) year = 1;
    cal.year = year;
    cal.month = clampInt(cal.month, 1, 12);
    cal.monthAccumulator = Math.max(0, finite(cal.monthAccumulator, 0));
    cal.yearEventBudget = clampInt(
      cal.yearEventBudget,
      10,
      40
    );
    cal.yearEventsCreated = clampInt(cal.yearEventsCreated, 0, 1000);
    cal.monthEventsCreated = clampInt(cal.monthEventsCreated, 0, 100);
    if (!record(cal.npcYearAppearances)) cal.npcYearAppearances = {};
    if (!record(cal.playerLeapLastMonth)) cal.playerLeapLastMonth = {};
    if (!Array.isArray(world.worldEvents)) world.worldEvents = [];
    world.nextWorldEventId = clampInt(world.nextWorldEventId, 1, 1e9);
    return cal;
  }

  function calendarLabel(calendar) {
    const cal = record(calendar) || {};
    const year = clampInt(cal.year, 1, 99999);
    const month = clampInt(cal.month, 1, 12);
    return year + '年' + month + '月';
  }

  function absoluteMonth(calendar) {
    const cal = record(calendar) || {};
    return (clampInt(cal.year, 1, 99999) - 1) * MONTHS_PER_YEAR +
      clampInt(cal.month, 1, 12);
  }

  function partsFromAbsoluteMonth(absolute) {
    const value = Math.max(1, Math.floor(Number(absolute) || 1));
    return {
      year: Math.floor((value - 1) / MONTHS_PER_YEAR) + CALENDAR_EPOCH_YEAR,
      month: ((value - 1) % MONTHS_PER_YEAR) + 1,
      absoluteMonth: value
    };
  }

  function labelFromAbsoluteMonth(absolute) {
    const parts = partsFromAbsoluteMonth(absolute);
    return parts.year + '年' + parts.month + '月';
  }

  function currentAbsoluteMonth(state) {
    const world = state && state.systems && state.systems.world;
    if (!world) return 1;
    return absoluteMonth(ensureCalendar(world));
  }

  function trimWorldEvents(world) {
    if (!Array.isArray(world.worldEvents)) {
      world.worldEvents = [];
      return;
    }
    if (world.worldEvents.length > WORLD_EVENT_RETENTION) {
      world.worldEvents = world.worldEvents.slice(
        world.worldEvents.length - WORLD_EVENT_RETENTION
      );
    }
  }

  function appendWorldEvent(state, entry) {
    const world = state && state.systems && state.systems.world;
    if (!world) return null;
    ensureCalendar(world);
    const id = 'we-' + world.nextWorldEventId;
    world.nextWorldEventId += 1;
    const event = {
      id: id,
      month: absoluteMonth(world.calendar),
      visibleFromMonth: entry.visibleFromMonth == null
        ? absoluteMonth(world.calendar)
        : clampInt(entry.visibleFromMonth, 0, 1e9),
      type: typeof entry.type === 'string' ? entry.type : 'meet',
      participants: Array.isArray(entry.participants)
        ? entry.participants.slice(0, 3)
        : [],
      location: typeof entry.location === 'string' ? entry.location : null,
      narrative: typeof entry.narrative === 'string' ? entry.narrative : '',
      source: entry.source === 'player' ? 'player' : 'world',
      // P3：持久化规范分类（对标原版 events:List<string[]> 描述符的"类型+参数"）。
      category: typeof entry.category === 'string' ? entry.category : null,
      tags: Array.isArray(entry.tags) ? entry.tags.slice() : [],
      // 对标 doevent(temp[0])：原版事件 ID（npclog 抽样），叙事仍用 H5 模板。
      eventId: Number.isFinite(Number(entry.eventId))
        ? Math.floor(Number(entry.eventId))
        : null
    };
    world.worldEvents.push(event);
    trimWorldEvents(world);
    return event;
  }


  return Object.freeze({
    MONTH_REAL_SECONDS: MONTH_REAL_SECONDS,
    MONTHS_PER_YEAR: MONTHS_PER_YEAR,
    OFFLINE_MONTH_CAP: OFFLINE_MONTH_CAP,
    OFFLINE_EVENT_MONTH_CHANCE: OFFLINE_EVENT_MONTH_CHANCE,
    OFFLINE_EVENT_MONTHLY_CAP: OFFLINE_EVENT_MONTHLY_CAP,
    WORLD_EVENT_PER_GAME_YEAR: WORLD_EVENT_PER_GAME_YEAR,
    WORLD_EVENT_MONTHLY_SOFT_CAP: WORLD_EVENT_MONTHLY_SOFT_CAP,
    WORLD_EVENT_RETENTION: WORLD_EVENT_RETENTION,
    CALENDAR_EPOCH_YEAR: CALENDAR_EPOCH_YEAR,
    own: own,
    record: record,
    finite: finite,
    clampInt: clampInt,
    ensureCalendar: ensureCalendar,
    calendarLabel: calendarLabel,
    absoluteMonth: absoluteMonth,
    partsFromAbsoluteMonth: partsFromAbsoluteMonth,
    labelFromAbsoluteMonth: labelFromAbsoluteMonth,
    currentAbsoluteMonth: currentAbsoluteMonth,
    trimWorldEvents: trimWorldEvents,
    appendWorldEvent: appendWorldEvent
  });
});
