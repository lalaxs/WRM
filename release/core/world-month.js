(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/original-event-bindings.js'),
      require('./dns.js'),
      require('./person-graph.js'),
      require('./person-factory.js'),
      require('./world-calendar.js'),
      require('./world-narrative-fill.js'),
      require('./world-romance.js'),
      require('./world-event-gen.js')
    )
    : factory(
      root && root.OriginalEventBindings,
      root && root.Dns,
      root && root.PersonGraph,
      root && root.PersonFactory,
      root && root.WorldCalendar,
      root && root.WorldNarrativeFill,
      root && root.WorldRomance,
      root && root.WorldEventGen
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.WorldMonth = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  OriginalEventBindings,
  DnsConfig,
  PersonGraph,
  PersonFactory,
  WorldCalendar,
  WorldNarrativeFill,
  WorldRomance,
  WorldEventGen
) {
  'use strict';


  const MONTH_REAL_SECONDS = WorldCalendar.MONTH_REAL_SECONDS;
  const MONTHS_PER_YEAR = WorldCalendar.MONTHS_PER_YEAR;
  const OFFLINE_MONTH_CAP = WorldCalendar.OFFLINE_MONTH_CAP;
  const OFFLINE_EVENT_MONTH_CHANCE = WorldCalendar.OFFLINE_EVENT_MONTH_CHANCE;
  const OFFLINE_EVENT_MONTHLY_CAP = WorldCalendar.OFFLINE_EVENT_MONTHLY_CAP;
  const WORLD_EVENT_PER_GAME_YEAR = WorldCalendar.WORLD_EVENT_PER_GAME_YEAR;
  const WORLD_EVENT_MONTHLY_SOFT_CAP = WorldCalendar.WORLD_EVENT_MONTHLY_SOFT_CAP;
  const WORLD_EVENT_RETENTION = WorldCalendar.WORLD_EVENT_RETENTION;
  const own = WorldCalendar.own;
  const record = WorldCalendar.record;
  const finite = WorldCalendar.finite;
  const clampInt = WorldCalendar.clampInt;
  const ensureCalendar = WorldCalendar.ensureCalendar;
  const calendarLabel = WorldCalendar.calendarLabel;
  const absoluteMonth = WorldCalendar.absoluteMonth;
  const partsFromAbsoluteMonth = WorldCalendar.partsFromAbsoluteMonth;
  const labelFromAbsoluteMonth = WorldCalendar.labelFromAbsoluteMonth;
  const currentAbsoluteMonth = WorldCalendar.currentAbsoluteMonth;
  const appendWorldEvent = WorldCalendar.appendWorldEvent;
  const canAppear = WorldEventGen.canAppear;
  const markAppear = WorldEventGen.markAppear;

  const GIFT_ITEMS = WorldNarrativeFill.GIFT_ITEMS;
  const regionName = WorldNarrativeFill.regionName;
  const regionIds = WorldNarrativeFill.regionIds;
  const randomOf = WorldNarrativeFill.randomOf;
  const fillOriginalEventNarrative = WorldNarrativeFill.fillOriginalEventNarrative;
  const originalTextNeedsPeer = WorldNarrativeFill.originalTextNeedsPeer;
  const personPlainLabel = WorldNarrativeFill.personPlainLabel;
  const personChronicleLabel = WorldNarrativeFill.personChronicleLabel;
  const playerNarrativeLabel = WorldNarrativeFill.playerNarrativeLabel;
  const rewriteNarrativePlayerYou = WorldNarrativeFill.rewriteNarrativePlayerYou;

  const TAG_IDS = WorldRomance.TAG_IDS;
  const ARC_STAGES = WorldRomance.ARC_STAGES;
  const ROMANCE_BEATS = WorldRomance.ROMANCE_BEATS;
  const MAX_NPC_ROMANCE_TARGETS = WorldRomance.MAX_NPC_ROMANCE_TARGETS;
  const SAME_NPC_YEAR_CAP = WorldRomance.SAME_NPC_YEAR_CAP;
  const KNOWN_CIRCLE_RATIO = WorldRomance.KNOWN_CIRCLE_RATIO;
  const CONTINUE_ARC_RATIO = WorldRomance.CONTINUE_ARC_RATIO;
  const ARC_FOLLOW_MONTHS = WorldRomance.ARC_FOLLOW_MONTHS;
  const getAffinity = WorldRomance.getAffinity;
  const setAffinity = WorldRomance.setAffinity;
  const getTags = WorldRomance.getTags;
  const setTags = WorldRomance.setTags;
  const getArc = WorldRomance.getArc;
  const setArc = WorldRomance.setArc;
  const isAcquaintedPair = WorldRomance.isAcquaintedPair;
  const linkNpcAcquaintance = WorldRomance.linkNpcAcquaintance;
  const touchArc = WorldRomance.touchArc;
  const markArcChronicled = WorldRomance.markArcChronicled;
  const arcFollowScore = WorldRomance.arcFollowScore;
  const isKnownToPlayer = WorldRomance.isKnownToPlayer;
  const deriveArcStage = WorldRomance.deriveArcStage;
  const suggestRomanceBeatAction = WorldRomance.suggestRomanceBeatAction;
  const nextRomanceBeat = WorldRomance.nextRomanceBeat;
  const countNpcRomanceTargets = WorldRomance.countNpcRomanceTargets;
  const canDevelopNpcRomance = WorldRomance.canDevelopNpcRomance;
  const hasTag = WorldRomance.hasTag;
  const withTag = WorldRomance.withTag;
  const withoutTags = WorldRomance.withoutTags;
  const bumpEdgeMetrics = WorldRomance.bumpEdgeMetrics;
  const pairKey = WorldRomance.pairKey;

  const OPEN_LINE_ACTIONS = WorldEventGen.OPEN_LINE_ACTIONS;
  const IMPACT_ACTIONS = WorldEventGen.IMPACT_ACTIONS;
  const LEAP_EVENT_TYPES = WorldEventGen.LEAP_EVENT_TYPES;
  const ROMANCE_EVENT_TYPES = WorldEventGen.ROMANCE_EVENT_TYPES;
  const CONFLICT_EVENT_TYPES = WorldEventGen.CONFLICT_EVENT_TYPES;
  const ROMANCE_CONFLICT_TYPES = WorldEventGen.ROMANCE_CONFLICT_TYPES;
  const pickAction = WorldEventGen.pickAction;
  const actionAffinityDelta = WorldEventGen.actionAffinityDelta;
  const applySilentPair = WorldEventGen.applySilentPair;
  const randomlevelCount = WorldEventGen.randomlevelCount;
  const rollYearBudget = WorldEventGen.rollYearBudget;
  const collectRegionPairCandidates = WorldEventGen.collectRegionPairCandidates;
  const appendOuterCircleMeets = WorldEventGen.appendOuterCircleMeets;
  const doevent = WorldEventGen.doevent;


  const ACTIVITY_STATUSES = Object.freeze([
    'normal',
    'injured',
    'seclusion',
    'travel',
    'dating',
    'exploring',
    'imprisoned',
    'missing',
    'tribulation'
  ]);

  const ACTIVITY_STATUS_LABELS = Object.freeze({
    normal: '正常',
    injured: '重伤',
    seclusion: '闭关',
    travel: '游历',
    dating: '约会',
    exploring: '探险',
    imprisoned: '囚禁',
    missing: '失踪',
    tribulation: '渡劫'
  });

  const PERSONAL_ONLY_EVENT_TYPES = Object.freeze({
    seclusion_enter: true,
    seclusion_exit: true,
    breakthrough: true,
    travel_start: true,
    travel_return: true,
    explore: true,
    explore_return: true,
    injured: true,
    recover: true,
    dating_start: true,
    dating_end: true,
    missing: true,
    found_self: true,
    tribulation: true,
    tribulation_end: true,
    imprison: true,
    release: true,
    office_duty: true,
    region_move: true
  });

  function monthImportantEventCap() {
    const rolledMax = DnsConfig && Number.isFinite(DnsConfig.randomlevelMax)
      ? Math.max(0, Math.floor(DnsConfig.randomlevelMax))
      : 2;
    if (DnsConfig && DnsConfig.useMonthlySoftCap === false) return rolledMax;
    return Math.min(WORLD_EVENT_MONTHLY_SOFT_CAP, rolledMax);
  }

  function canWriteImportantEvent(cal) {
    if (!cal) return false;
    if (cal.monthEventsCreated >= monthImportantEventCap()) return false;
    if (DnsConfig && DnsConfig.useYearBudget &&
        cal.yearEventsCreated >= cal.yearEventBudget) {
      return false;
    }
    return true;
  }

  function activityStatus(person) {
    const status = person && person.activityStatus;
    return ACTIVITY_STATUSES.indexOf(status) >= 0 ? status : 'normal';
  }

  function maybeMoveNpc(person, random) {
    if (activityStatus(person) !== 'normal') return false;
    const roll = typeof random === 'function' ? random() : Math.random();
    // 换地仍发生，但不再为单纯换地写经历；频率略降以减少无效抖动。
    if (roll > 0.10) return false;
    const ids = regionIds();
    const next = randomOf(ids, random);
    if (!next || next === person.regionId) return false;
    person.regionId = next;
    return true;
  }

  function isPersonalOnlyEvent(event) {
    return !!(event && PERSONAL_ONLY_EVENT_TYPES[event.type]);
  }


  function isChronicleEvent(event) {
    if (!event) return false;
    if (isPersonalOnlyEvent(event)) return false;
    const participants = Array.isArray(event.participants)
      ? event.participants
      : [];
    const npcIds = participants.filter(function (id) {
      return typeof id === 'string' && id && id !== 'player';
    });
    const hasPlayer = participants.indexOf('player') >= 0;
    if (event.type === 'character_beat') {
      const tags = Array.isArray(event.tags) ? event.tags : [];
      if (tags.indexOf('opening') >= 0 || tags.indexOf('prologue') >= 0) {
        return true;
      }
      return npcIds.length === 1 && !hasPlayer;
    }
    // 玩家参与：进大事记（含玩家自己结识）。
    if (hasPlayer && npcIds.length >= 1) return true;
    // NPC↔NPC：讲了才算，结识也出镜（不再静默隐去）。
    if (npcIds.length >= 2) return true;
    return false;
  }

  function tickActivityStatus(person, random) {
    const status = activityStatus(person);
    const roll = typeof random === 'function' ? random() : Math.random();
    if (status === 'normal') {
      if (roll < 0.025) person.activityStatus = 'seclusion';
      else if (roll < 0.05) person.activityStatus = 'travel';
      else if (roll < 0.07) person.activityStatus = 'exploring';
      else if (roll < 0.08) person.activityStatus = 'dating';
      else if (roll < 0.09) person.activityStatus = 'injured';
      else if (roll < 0.095) person.activityStatus = 'missing';
      else if (roll < 0.098) person.activityStatus = 'tribulation';
      else if (roll < 0.1) person.activityStatus = 'imprisoned';
      return;
    }
    if (status === 'injured' || status === 'imprisoned' ||
        status === 'missing') {
      if (roll < 0.28) person.activityStatus = 'normal';
      return;
    }
    if (roll < 0.28) person.activityStatus = 'normal';
  }

  function blocksWorldSocial(status) {
    return status === 'seclusion' ||
      status === 'imprisoned' ||
      status === 'injured' ||
      status === 'missing' ||
      status === 'tribulation' ||
      status === 'exploring' ||
      status === 'travel';
  }

  function ensureWaitQueue(world) {
    if (!world) return [];
    if (!Array.isArray(world.waitQueue)) world.waitQueue = [];
    return world.waitQueue;
  }

  function waittime0(state, delayMonths, funcName, payload) {
    if (!state || !state.systems || !state.systems.world) return false;
    if (typeof funcName !== 'string' || !funcName) return false;
    const world = state.systems.world;
    const cal = ensureCalendar(world);
    const delay = Math.max(0, Math.floor(Number(delayMonths) || 0));
    ensureWaitQueue(world).push({
      atMonth: absoluteMonth(cal) + delay,
      func: funcName,
      payload: payload == null ? null : payload
    });
    return true;
  }

  function dispatchWaitFunc(state, funcName, payload, random) {
    if (funcName === 'dayevent' || funcName === 'ondayevent') {
      // 延时再跑一轮轻量随机补充（仍受 cans）。
      return;
    }
    if (funcName === 'getpost' || funcName === 'onpost') {
      return;
    }
    if (funcName === 'doevent' && payload && typeof payload === 'object') {
      doevent(state, payload, random || Math.random);
    }
  }

  function flushWaitQueue(state, random) {
    if (!state || !state.systems || !state.systems.world) return 0;
    const world = state.systems.world;
    const cal = ensureCalendar(world);
    const now = absoluteMonth(cal);
    const queue = ensureWaitQueue(world);
    let ran = 0;
    const remain = [];
    queue.forEach(function (item) {
      if (!item || typeof item.func !== 'string') return;
      if (clampInt(item.atMonth, 0, 1e9) > now) {
        remain.push(item);
        return;
      }
      dispatchWaitFunc(state, item.func, item.payload, random);
      ran += 1;
    });
    world.waitQueue = remain;
    return ran;
  }

  function getpost(state, url, funcName, payload) {
    const posts = DnsConfig && Array.isArray(DnsConfig.offlinePosts)
      ? DnsConfig.offlinePosts
      : [];
    const hit = posts.length
      ? posts[0]
      : { ok: true, url: url || (DnsConfig && DnsConfig.myurl) || '', data: null };
    waittime0(state, 0, funcName || 'onpost', {
      request: payload == null ? null : payload,
      response: hit
    });
    return hit;
  }

  function monthEventTarget(cal, helpers, random) {
    let target = randomlevelCount(random);
    if (DnsConfig && DnsConfig.useMonthlySoftCap !== false) {
      target = Math.min(WORLD_EVENT_MONTHLY_SOFT_CAP, target);
    }
    if (helpers && helpers.source === 'offline') {
      // 离线降频：约 1/4 月份出见闻，且每月最多 1 条（在线约 1～2）。
      target = random() < OFFLINE_EVENT_MONTH_CHANCE
        ? Math.min(OFFLINE_EVENT_MONTHLY_CAP, Math.max(1, target))
        : 0;
    }
    if (DnsConfig && DnsConfig.useYearBudget) {
      const remaining = cal.yearEventBudget - cal.yearEventsCreated;
      target = Math.min(target, Math.max(0, remaining));
    }
    return Math.max(0, Math.floor(target));
  }

  function advanceOneMonth(state, helpers) {
    const world = state.systems.world;
    const cal = ensureCalendar(world);
    const random = helpers && typeof helpers.random === 'function'
      ? helpers.random
      : Math.random;
    const records = state.systems.npcs.records;
    // 对标：先消化 waittime0 队列，再 dayevent。
    flushWaitQueue(state, random);
    // 旧档 metPlayer 痕迹同步进 getpe，再 reset 当日配额。
    if (PersonGraph &&
        typeof PersonGraph.syncMetPlayerIntoGetpe === 'function') {
      PersonGraph.syncMetPlayerIntoGetpe(state);
    }
    PersonGraph.resetDaily(state);
    const net = PersonGraph.relatedToPlayer(state);
    const ids = net ? Array.from(net) : [];

    cal.monthEventsCreated = 0;
    cal.month += 1;
    if (cal.month > MONTHS_PER_YEAR) {
      cal.month = 1;
      cal.year += 1;
      cal.yearEventsCreated = 0;
      cal.yearEventBudget = rollYearBudget(random);
      cal.npcYearAppearances = {};
    }

    const targetThisMonth = monthEventTarget(cal, helpers, random);

    // Shuffle lightly.
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const tmp = ids[i];
      ids[i] = ids[j];
      ids[j] = tmp;
    }

    const byRegion = {};
    const crisisByRegion = {};
    const soloCandidates = [];
    // 即使本月不出见闻，仍推进活动状态 / 迁徙，保持世界在动。
    ids.forEach(function (id) {
      const person = records[id];
      tickActivityStatus(person, random);
      maybeMoveNpc(person, random);
      if (targetThisMonth <= 0) return;
      const status = activityStatus(person);
      const regionId = person.regionId || 'qinglan-town';
      // 状态可静默变（闭关/受伤等），不写见闻、不占每月 1～2 条额度。
      if (status === 'normal') {
        const known = isKnownToPlayer(state, id);
        // 对标：getpe∩cans 进池，再由 randomlevel 抽 1～2。
        if (known) {
          if (PersonGraph.cans(state, id)) {
            soloCandidates.push({
              kind: 'solo',
              aId: id,
              bId: null,
              regionId: regionId,
              action: 'character_beat',
              known: true,
              leap: false,
              romance: false,
              conflict: false,
              romanceConflict: false,
              characterBeat: true
            });
          }
        } else if (random() < 0.05) {
          if (PersonGraph.cans(state, id)) {
            soloCandidates.push({
              kind: 'solo',
              aId: id,
              bId: null,
              regionId: regionId,
              action: 'character_beat',
              known: false,
              leap: false,
              romance: false,
              conflict: false,
              romanceConflict: false,
              characterBeat: true
            });
          }
        }
      }
      if (status === 'injured' || status === 'missing') {
        if (!crisisByRegion[regionId]) crisisByRegion[regionId] = [];
        crisisByRegion[regionId].push(id);
      }
      if (blocksWorldSocial(status)) {
        return;
      }
      if (!byRegion[regionId]) byRegion[regionId] = [];
      byRegion[regionId].push(id);
    });

    if (targetThisMonth <= 0) return;

    const candidatePairs = [];
    Object.keys(byRegion).forEach(function (regionId) {
      const group = byRegion[regionId];
      // 即使同城只有 1 个熟人，也允许他去结识圈外人。
      if (!group.length) return;
      const regionPairs = collectRegionPairCandidates(
        state,
        regionId,
        group,
        crisisByRegion[regionId] || [],
        random
      );
      for (let index = 0; index < regionPairs.length; index++) {
        const row = regionPairs[index];
        if (!PersonGraph.cans(state, row.aId)) continue;
        // 圈外扩：只要求圈内发起人有配额；圈外人尚未进 getpe。
        if (row.bId && !row.outerExpand &&
            !PersonGraph.cans(state, row.bId)) {
          continue;
        }
        candidatePairs.push(row);
      }
    });

    // —— 对标 dayevent：关系圈 ∩ cans，再 randomlevel 补 1～2 ——
    // root.mday 是月天数日历，不是固定事件表（勿再按月灌 fixed 事件）。
    const candidates = candidatePairs.concat(soloCandidates);
    if (targetThisMonth <= 0) return;
    if (!candidates.length) {
      // 无人事故事可抽时，用玩家偶遇补满本月 1～2 额度（仍不超）。
      while (cal.monthEventsCreated < targetThisMonth) {
        if (!maybePlayerMonthEncounter(state, helpers)) break;
      }
      return;
    }

    const known = candidates.filter(function (row) { return row.known; });
    const unknown = candidates.filter(function (row) { return !row.known; });
    function removeCandidate(list, pick) {
      for (let index = list.length - 1; index >= 0; index--) {
        if (list[index].aId === pick.aId && list[index].bId === pick.bId &&
            list[index].action === pick.action) {
          list.splice(index, 1);
        }
      }
    }
    let created = 0;
    while (created < targetThisMonth) {
      if (DnsConfig && DnsConfig.useYearBudget &&
          cal.yearEventsCreated >= cal.yearEventBudget) {
        break;
      }
      const preferKnown = random() < KNOWN_CIRCLE_RATIO;
      let pool = preferKnown
        ? (known.length ? known : unknown)
        : (unknown.length ? unknown : known);
      pool = pool.filter(function (row) {
        if (!PersonGraph.cans(state, row.aId)) return false;
        if (row.bId && !row.outerExpand &&
            !PersonGraph.cans(state, row.bId)) {
          return false;
        }
        if (!canAppear(cal, row.aId)) return false;
        if (row.bId && !row.outerExpand && !canAppear(cal, row.bId)) {
          return false;
        }
        return true;
      });
      if (!pool.length) break;
      const followPool = pool.filter(function (row) {
        return row.arcFollow && row.kind === 'pair';
      });
      const romanceBeatPool = pool.filter(function (row) {
        return row.romanceBeatForced && row.kind === 'pair';
      });
      const acquaintancePool = pool.filter(function (row) {
        return row.acquaintance && row.kind === 'pair';
      });
      const leapPool = pool.filter(function (row) { return row.leap; });
      const romancePool = pool.filter(function (row) {
        return row.romance && !row.conflict;
      });
      const beatPool = pool.filter(function (row) {
        return row.characterBeat;
      });
      const romanceConflictPool = pool.filter(function (row) {
        return row.romanceConflict;
      });
      const softPool = pool.filter(function (row) {
        return !row.conflict || row.romanceConflict || row.characterBeat;
      });
      let pickPool = pool;
      if (followPool.length && random() < CONTINUE_ARC_RATIO) {
        pickPool = followPool;
      } else if (romanceBeatPool.length && random() < 0.62) {
        pickPool = romanceBeatPool;
      } else if (acquaintancePool.length && random() < 0.18) {
        // 结识也出镜；不再只播戏剧开线。
        pickPool = acquaintancePool;
      } else if (leapPool.length && random() < 0.22) pickPool = leapPool;
      else if (romancePool.length && random() < 0.32) pickPool = romancePool;
      else if (beatPool.length && random() < 0.5) pickPool = beatPool;
      else if (romanceConflictPool.length && random() < 0.35) {
        pickPool = romanceConflictPool;
      } else if (softPool.length && random() < 0.88) pickPool = softPool;
      const pick = randomOf(pickPool, random);
      if (!pick) break;
      // 完全还原：有绑定池 / 别名池必抽原版 ID；同意提问已在 pickEventId 内改拒绝。
      if (pick.eventId == null &&
          OriginalEventBindings &&
          typeof OriginalEventBindings.pickEventId === 'function') {
        const boundId = OriginalEventBindings.pickEventId(pick.action, random);
        if (boundId != null) {
          pick.eventId = boundId;
          pick.useOriginalText = true;
        }
      }
      if (pick.eventId == null &&
          (pick.action === 'character_beat' || pick.characterBeat) &&
          DnsConfig && typeof DnsConfig.pickNpclogId === 'function') {
        // 单人见闻不要抽「需要第二人」或「是否同意」的原版文案。
        let beatId = null;
        for (let tryIndex = 0; tryIndex < 12; tryIndex++) {
          const cand = DnsConfig.pickNpclogId(random);
          if (cand == null) break;
          if (OriginalEventBindings &&
              typeof OriginalEventBindings.isConsentQuestion === 'function' &&
              OriginalEventBindings.isConsentQuestion(cand)) {
            continue;
          }
          if (OriginalEventBindings &&
              typeof OriginalEventBindings.resolveConsentEventId === 'function') {
            const resolved = OriginalEventBindings.resolveConsentEventId(cand);
            if (resolved == null) continue;
            if (!originalTextNeedsPeer(resolved)) {
              beatId = resolved;
              break;
            }
            continue;
          }
          if (!originalTextNeedsPeer(cand)) {
            beatId = cand;
            break;
          }
        }
        if (beatId != null) {
          pick.eventId = beatId;
          pick.useOriginalText = true;
        }
      } else if (pick.eventId == null &&
          (pick.action === 'character_beat' || pick.characterBeat) &&
          DnsConfig && Array.isArray(DnsConfig.npclog) &&
          DnsConfig.npclog.length) {
        pick.eventId = DnsConfig.npclog[
          Math.floor(random() * DnsConfig.npclog.length)
        ];
        if (OriginalEventBindings &&
            typeof OriginalEventBindings.resolveConsentEventId === 'function') {
          pick.eventId = OriginalEventBindings.resolveConsentEventId(pick.eventId);
        }
        if (pick.eventId != null) {
          pick.useOriginalText = true;
        }
      }
      // 无原版 ID 一律跳过，禁止 H5 白话兜底。
      if (pick.eventId == null) {
        removeCandidate(known, pick);
        removeCandidate(unknown, pick);
        continue;
      }
      const delivered = doevent(state, pick, random);
      if (!delivered) {
        removeCandidate(known, pick);
        removeCandidate(unknown, pick);
        continue;
      }
      created += 1;
      removeCandidate(known, pick);
      removeCandidate(unknown, pick);
    }
    // 人事见闻不足时，用玩家偶遇补满本月额度，不额外超发。
    while (created < targetThisMonth) {
      if (!maybePlayerMonthEncounter(state, helpers)) break;
      created = cal.monthEventsCreated;
    }
  }

  function nudgeSkippedMonths(state, extraMonths) {
    if (!(extraMonths > 0) || !state.systems.npcs || !state.systems.npcs.records) {
      return;
    }
    // 跳过的月份只等价于「这些月份对应的真实流逝秒数」；
    // 绝不能按日历年（extraMonths/12）直接加年龄——日历年=12×180s，
    // 而 NPC 年龄年=12×60×60s，两者差约 20 倍，离线一长就集体寿元尽。
    const NPC_YEAR_SECONDS = 12 * 60 * 60;
    const seconds = extraMonths * MONTH_REAL_SECONDS;
    Object.keys(state.systems.npcs.records).forEach(function (id) {
      const person = state.systems.npcs.records[id];
      if (!person || person.status !== 'living') return;
      const total = Math.max(0, finite(person.ageRemainderSeconds, 0)) +
        seconds;
      const years = Math.floor(total / NPC_YEAR_SECONDS);
      person.ageYears = Math.max(0, Math.floor(finite(person.ageYears, 0))) +
        years;
      person.ageRemainderSeconds = total - years * NPC_YEAR_SECONDS;
      const lifespan = finite(person.lifespanYears, Infinity);
      if (lifespan < Infinity && person.ageYears >= lifespan) {
        person.status = 'dead';
        person.activityStatus = 'normal';
        if (!Array.isArray(person.biography)) person.biography = [];
        const already = person.biography.some(function (entry) {
          return entry && entry.kind === 'lifespan-end';
        });
        if (!already) {
          person.biography.push({
            kind: 'lifespan-end',
            atAge: person.ageYears
          });
        }
      }
    });
    const npcs = state.systems.npcs;
    if (Array.isArray(npcs.activeIds)) {
      npcs.activeIds = npcs.activeIds.filter(function (id) {
        const person = npcs.records[id];
        return person && person.status === 'living';
      });
    }
    if (Array.isArray(npcs.backgroundIds)) {
      npcs.backgroundIds = npcs.backgroundIds.filter(function (id) {
        const person = npcs.records[id];
        return person && person.status === 'living';
      });
    }
    const cal = state.systems.world.calendar;
    cal.month += extraMonths;
    cal.year += Math.floor((cal.month - 1) / MONTHS_PER_YEAR);
    cal.month = ((cal.month - 1) % MONTHS_PER_YEAR) + 1;
  }

  function advanceMonths(state, monthCount, helpers) {
    let total = Math.max(0, Math.floor(Number(monthCount) || 0));
    if (!total || !state || !state.systems || !state.systems.world) {
      return { months: 0, capped: false };
    }
    ensureCalendar(state.systems.world);
    let capped = false;
    let runnable = total;
    if (helpers && typeof helpers.offlineMonthBudget === 'number') {
      const budget = Math.max(0, Math.floor(helpers.offlineMonthBudget));
      if (total > budget) {
        capped = true;
        runnable = budget;
        helpers.offlineMonthBudget = 0;
        nudgeSkippedMonths(state, total - runnable);
      } else {
        helpers.offlineMonthBudget = budget - total;
      }
    } else if (total > OFFLINE_MONTH_CAP) {
      capped = true;
      runnable = OFFLINE_MONTH_CAP;
      nudgeSkippedMonths(state, total - runnable);
    }
    for (let index = 0; index < runnable; index++) {
      advanceOneMonth(state, helpers);
    }
    return { months: runnable, capped: capped };
  }

  function elapseRealtime(state, seconds, helpers) {
    const world = state && state.systems && state.systems.world;
    if (!world) return { monthsAdvanced: 0 };
    const cal = ensureCalendar(world);
    const add = Math.max(0, finite(seconds, 0));
    cal.monthAccumulator += add;
    let advanced = 0;
    while (cal.monthAccumulator >= MONTH_REAL_SECONDS) {
      cal.monthAccumulator -= MONTH_REAL_SECONDS;
      advanceOneMonth(state, helpers);
      advanced += 1;
      if (advanced >= OFFLINE_MONTH_CAP) {
        // Spill remaining accumulator without more social months this pulse.
        break;
      }
    }
    return { monthsAdvanced: advanced };
  }

  function visibleWorldEvents(state, nowMonth) {
    const world = state && state.systems && state.systems.world;
    if (!world || !Array.isArray(world.worldEvents)) return [];
    const cal = ensureCalendar(world);
    const cursor = nowMonth == null ? absoluteMonth(cal) : nowMonth;
    return world.worldEvents.filter(function (event) {
      return clampInt(event.visibleFromMonth, 0, 1e9) <= cursor;
    });
  }

  function eventsForParticipant(state, participantId, limit) {
    const max = clampInt(limit, 1, 200);
    const list = visibleWorldEvents(state).filter(function (event) {
      return Array.isArray(event.participants) &&
        event.participants.indexOf(participantId) >= 0;
    });
    return list.slice(Math.max(0, list.length - max)).reverse();
  }

  function travelRoute(fromRegionId, targetRegionId) {
    const from = fromRegionId || 'qinglan-town';
    const to = targetRegionId;
    if (!to || from === to) {
      return {
        far: false,
        months: 0,
        nearDays: 0,
        alreadyThere: true,
        durationLabel: '无需赶路'
      };
    }
    const far = (
      (from.indexOf('sect') >= 0) !== (to.indexOf('sect') >= 0)
    ) || from === 'mirror-realm' || to === 'mirror-realm' ||
      from === 'redstone-wilds' || to === 'redstone-wilds';
    return {
      far: far,
      months: far ? 1 : 0,
      nearDays: far ? 0 : 3,
      alreadyThere: false,
      durationLabel: far ? '约 1 个月' : '约 3 天'
    };
  }

  function playerLeapReady(cal, npcId) {
    if (!record(cal.playerLeapLastMonth)) cal.playerLeapLastMonth = {};
    const last = clampInt(cal.playerLeapLastMonth[npcId], 0, 1e9);
    if (!last) return true;
    return absoluteMonth(cal) - last >= MONTHS_PER_YEAR;
  }

  function markPlayerLeap(cal, npcId) {
    if (!record(cal.playerLeapLastMonth)) cal.playerLeapLastMonth = {};
    cal.playerLeapLastMonth[npcId] = absoluteMonth(cal);
  }

  function playerLeapNarrative(
    action,
    playerLabel,
    npcLabel,
    locName,
    role
  ) {
    const you = playerLabel || '无名';
    const other = npcLabel || '对方';
    const loc = locName || '某处';
    if (action === 'crisis_save' || action === 'rescue') {
      if (role === 'rescued') {
        return you + '在' + loc + '险些被魔气吞没，' + other +
          '把' + you + '拖了出来。事后两人互换了名字，并约好伤好再联系。';
      }
      return you + '在' + loc + '发现重伤的' + other +
        '，及时施救。守到对方睁眼后，把经过和去处说清楚了。';
    }
    if (action === 'crisis_meet') {
      return you + '与' + other + '在' + loc +
        '遇上危险，一起脱困后互换了名字。';
    }
    return you + '在' + loc + '第一次看见' + other +
      '，多看了一眼又收回。';
  }

  function applyPlayerLeap(
    state,
    npcId,
    action,
    role,
    helpers
  ) {
    const world = state.systems && state.systems.world;
    const cal = ensureCalendar(world);
    const records = state.systems.npcs.records;
    const person = records[npcId];
    if (!person || person.status !== 'living') return null;
    // 与月刷共用额度：本月重要见闻已满则不再额外写偶遇。
    if (!canWriteImportantEvent(cal)) return null;
    // 7A：玩家日配额用尽则不再触发玩家偶遇。
    if (PersonGraph && typeof PersonGraph.cans === 'function' &&
        !PersonGraph.cans(state, 'player')) {
      return null;
    }
    if (!playerLeapReady(cal, npcId)) return null;
    const tagsNow = getTags(state.systems.relationships, npcId, 'player');
    if (hasTag(tagsNow, 'enemy')) return null;
    const regionId = person.regionId ||
      (state.player && state.player.regionId) ||
      'qinglan-town';
    const rels = state.systems.relationships;
    const random = helpers && typeof helpers.random === 'function'
      ? helpers.random
      : Math.random;
    const atSeconds = helpers && typeof helpers.nowSeconds === 'function'
      ? helpers.nowSeconds()
      : 0;

    let forward = {};
    let reverse = {};
    if (action === 'rescue' || action === 'crisis_save') {
      if (role === 'rescued') {
        forward = { affection: 12, trust: 10, romanticAttachment: 8 };
        reverse = { affection: 22, trust: 10, romanticAttachment: 8 };
      } else {
        forward = { affection: 20, trust: 10, romanticAttachment: 8 };
        reverse = { affection: 22, trust: 12, romanticAttachment: 8 };
        if (activityStatus(person) === 'injured' ||
            activityStatus(person) === 'missing') {
          person.activityStatus = 'normal';
        }
      }
    } else if (action === 'crisis_meet') {
      forward = { affection: 14, trust: 8, romanticAttachment: 12 };
      reverse = { affection: 16, trust: 8, romanticAttachment: 14 };
    } else {
      forward = { affection: 12, trust: 4, romanticAttachment: 14 };
      reverse = { affection: 14, trust: 4, romanticAttachment: 16 };
    }
    bumpEdgeMetrics(rels, 'player', npcId, forward, atSeconds);
    bumpEdgeMetrics(rels, npcId, 'player', reverse, atSeconds);
    let tags = getTags(rels, npcId, 'player');
    tags = withoutTags(tags, ['enemy']);
    tags = withTag(tags, 'acquainted');
    if (action === 'rescue' || action === 'crisis_save' ||
        action === 'crisis_meet') {
      tags = withTag(tags, 'life-debt');
      tags = withTag(tags, 'friend');
    }
    if (action === 'first_sight' || action === 'crisis_meet') {
      tags = withTag(tags, 'impressed');
    }
    setTags(rels, npcId, 'player', tags);
    person.metPlayer = true;
    if (PersonFactory && typeof PersonFactory.befriend === 'function') {
      PersonFactory.befriend(state, 'player', npcId);
    }
    markPlayerLeap(cal, npcId);
    touchArc(
      rels,
      npcId,
      'player',
      absoluteMonth(cal),
      action,
      tags,
      reverse.affection || 12,
      { chronicled: true }
    );

    const narrative = playerLeapNarrative(
      action,
      playerNarrativeLabel(state),
      personPlainLabel(person),
      regionName(regionId),
      role
    );
    const event = appendWorldEvent(state, {
      type: action,
      participants: role === 'rescued'
        ? [npcId, 'player']
        : ['player', npcId],
      location: regionId,
      narrative: narrative,
      source: 'player'
    });
    cal.monthEventsCreated += 1;
    cal.yearEventsCreated += 1;
    if (PersonGraph && typeof PersonGraph.markActed === 'function') {
      PersonGraph.markActed(state, 'player');
      PersonGraph.markActed(state, npcId);
    }
    return event;
  }

  function pickLocalLeapNpc(state, regionId, random, options) {
    const records = state.systems.npcs.records;
    const cal = ensureCalendar(state.systems.world);
    const circle = PersonGraph.relatedToPlayer(state);
    const preferExpand = !options || options.preferExpand !== false;

    function eligible(id) {
      const person = records[id];
      if (!person || person.status !== 'living') return false;
      if (person.lifeStage === 'child') return false;
      if (person.regionId !== regionId) return false;
      const status = activityStatus(person);
      if (status === 'seclusion' || status === 'imprisoned' ||
          status === 'tribulation' || status === 'exploring' ||
          status === 'travel') {
        return false;
      }
      if (!playerLeapReady(cal, id)) return false;
      const tags = getTags(state.systems.relationships, id, 'player');
      if (hasTag(tags, 'enemy')) return false;
      return true;
    }

    function pack(id, introducedBy) {
      return { npcId: id, introducedBy: introducedBy || null };
    }

    if (preferExpand &&
        PersonFactory &&
        typeof PersonFactory.expandForPlayerMeeting === 'function') {
      const expanded = PersonFactory.expandForPlayerMeeting(state, {
        regionId: regionId,
        random: random
      });
      if (expanded && expanded.npcId && records[expanded.npcId]) {
        records[expanded.npcId].regionId = regionId;
        if (eligible(expanded.npcId)) {
          return pack(expanded.npcId, expanded.introducedBy);
        }
      }
    }

    let pool = (circle ? Array.from(circle) : []).filter(eligible);
    if (!pool.length) {
      pool = Object.keys(records).filter(eligible);
    }
    if (!pool.length) return null;
    const injured = pool.filter(function (id) {
      return activityStatus(records[id]) === 'injured' ||
        activityStatus(records[id]) === 'missing';
    });
    if (injured.length && random() < 0.55) {
      return pack(randomOf(injured, random), null);
    }
    return pack(randomOf(pool, random), null);
  }

  function maybePlayerTravelEncounter(state, helpers) {
    if (!state || !state.player) return null;
    const random = helpers && typeof helpers.random === 'function'
      ? helpers.random
      : Math.random;
    if (random() > 0.42) return null;
    const regionId = state.player.regionId || 'qinglan-town';
    const picked = pickLocalLeapNpc(state, regionId, random, {
      preferExpand: true
    });
    if (!picked || !picked.npcId) return null;
    const person = state.systems.npcs.records[picked.npcId];
    const status = activityStatus(person);
    let action = 'first_sight';
    let role = 'seer';
    if (status === 'injured' || status === 'missing') {
      action = random() < 0.5 ? 'crisis_save' : 'rescue';
      role = 'rescuer';
    } else if (random() < 0.22) {
      action = 'crisis_meet';
      role = 'peer';
    } else if (random() < 0.35) {
      action = 'crisis_save';
      role = random() < 0.25 ? 'rescued' : 'rescuer';
    }
    return applyPlayerLeap(state, picked.npcId, action, role, helpers, {
      introducedBy: picked.introducedBy
    });
  }

  function maybePlayerMonthEncounter(state, helpers) {
    if (!state || !state.player) return null;
    if (PersonGraph && typeof PersonGraph.cans === 'function' &&
        !PersonGraph.cans(state, 'player')) {
      return null;
    }
    const random = helpers && typeof helpers.random === 'function'
      ? helpers.random
      : Math.random;
    const circle = PersonGraph.relatedToPlayer(state);
    const circleSize = circle ? circle.size : 0;
    const chance = circleSize <= 0 ? 0.78 : (circleSize < 6 ? 0.28 : 0.16);
    if (random() > chance) return null;
    const regionId = state.player.regionId || 'qinglan-town';
    const picked = pickLocalLeapNpc(state, regionId, random, {
      preferExpand: true
    });
    if (!picked || !picked.npcId) return null;
    const person = state.systems.npcs.records[picked.npcId];
    const status = activityStatus(person);
    if (status === 'injured' || status === 'missing') {
      return applyPlayerLeap(
        state,
        picked.npcId,
        random() < 0.5 ? 'crisis_save' : 'rescue',
        'rescuer',
        helpers,
        { introducedBy: picked.introducedBy }
      );
    }
    if (random() < 0.4) {
      return applyPlayerLeap(
        state,
        picked.npcId,
        'first_sight',
        'seer',
        helpers,
        { introducedBy: picked.introducedBy }
      );
    }
    return applyPlayerLeap(
      state,
      picked.npcId,
      'crisis_meet',
      'peer',
      helpers,
      { introducedBy: picked.introducedBy }
    );
  }

  function estimatePlayerTravel(state, targetRegionId) {
    const ids = regionIds();
    if (ids.indexOf(targetRegionId) < 0) {
      return { ok: false, code: 'unknown_region' };
    }
    if (!state || !state.player) {
      return { ok: false, code: 'no_player' };
    }
    const from = state.player.regionId || 'qinglan-town';
    const route = travelRoute(from, targetRegionId);
    return {
      ok: true,
      code: route.alreadyThere ? 'already_there' : 'ok',
      from: from,
      to: targetRegionId,
      fromName: regionName(from),
      toName: regionName(targetRegionId),
      far: route.far,
      months: route.months,
      nearDays: route.nearDays,
      alreadyThere: route.alreadyThere,
      durationLabel: route.durationLabel
    };
  }

  function playerTravel(state, targetRegionId, options) {
    const estimate = estimatePlayerTravel(state, targetRegionId);
    if (!estimate.ok) {
      return { ok: false, code: estimate.code };
    }
    if (estimate.alreadyThere) {
      return { ok: false, code: 'already_there' };
    }
    const from = estimate.from;
    const far = estimate.far;
    const months = estimate.months;
    // Near travel: advance ~0.1 month via accumulator (3 game days ≈ 18s).
    const world = state.systems.world;
    const cal = ensureCalendar(world);
    if (months > 0) {
      advanceMonths(state, months, options && options.helpers);
    } else {
      cal.monthAccumulator += 18;
      elapseRealtime(state, 0, options && options.helpers);
      if (cal.monthAccumulator >= MONTH_REAL_SECONDS) {
        elapseRealtime(state, 0, options && options.helpers);
      }
    }
    state.player.regionId = targetRegionId;
    const encounter = maybePlayerTravelEncounter(
      state,
      options && options.helpers
    );
    return {
      ok: true,
      code: 'ok',
      from: from,
      to: targetRegionId,
      far: far,
      durationLabel: estimate.durationLabel,
      encounter: encounter || null
    };
  }

  function sameRegion(state, npcId) {
    const person = state.systems && state.systems.npcs &&
      state.systems.npcs.records &&
      state.systems.npcs.records[npcId];
    if (!person) return false;
    const playerRegion = state.player && state.player.regionId;
    const npcRegion = person.regionId;
    if (typeof playerRegion !== 'string' || !playerRegion ||
        typeof npcRegion !== 'string' || !npcRegion) {
      return false;
    }
    return playerRegion === npcRegion;
  }

  // Wire activity helpers into event-gen (avoids circular require).
  if (WorldEventGen && typeof WorldEventGen.bindActivityHelpers === 'function') {
    WorldEventGen.bindActivityHelpers({
      activityStatus: activityStatus,
      blocksWorldSocial: blocksWorldSocial
    });
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
    ACTIVITY_STATUSES: ACTIVITY_STATUSES,
    ACTIVITY_STATUS_LABELS: ACTIVITY_STATUS_LABELS,
    PERSONAL_ONLY_EVENT_TYPES: PERSONAL_ONLY_EVENT_TYPES,
    TAG_IDS: TAG_IDS,
    ARC_STAGES: ARC_STAGES,
    ROMANCE_BEATS: ROMANCE_BEATS,
    MAX_NPC_ROMANCE_TARGETS: MAX_NPC_ROMANCE_TARGETS,
    GIFT_ITEMS: GIFT_ITEMS,
    OPEN_LINE_ACTIONS: OPEN_LINE_ACTIONS,
    IMPACT_ACTIONS: IMPACT_ACTIONS,
    LEAP_EVENT_TYPES: LEAP_EVENT_TYPES,
    ROMANCE_EVENT_TYPES: ROMANCE_EVENT_TYPES,
    CONFLICT_EVENT_TYPES: CONFLICT_EVENT_TYPES,
    ROMANCE_CONFLICT_TYPES: ROMANCE_CONFLICT_TYPES,
    isPersonalOnlyEvent: isPersonalOnlyEvent,
    isChronicleEvent: isChronicleEvent,
    waittime0: waittime0,
    getpost: getpost,
    flushWaitQueue: flushWaitQueue,
    ensureCalendar: ensureCalendar,
    calendarLabel: calendarLabel,
    absoluteMonth: absoluteMonth,
    partsFromAbsoluteMonth: partsFromAbsoluteMonth,
    labelFromAbsoluteMonth: labelFromAbsoluteMonth,
    currentAbsoluteMonth: currentAbsoluteMonth,
    appendWorldEvent: appendWorldEvent,
    fillOriginalEventNarrative: fillOriginalEventNarrative,
    getAffinity: getAffinity,
    setAffinity: setAffinity,
    getTags: getTags,
    setTags: setTags,
    getArc: getArc,
    setArc: setArc,
    isAcquaintedPair: isAcquaintedPair,
    personChronicleLabel: personChronicleLabel,
    suggestRomanceBeatAction: suggestRomanceBeatAction,
    nextRomanceBeat: nextRomanceBeat,
    playerNarrativeLabel: playerNarrativeLabel,
    rewriteNarrativePlayerYou: rewriteNarrativePlayerYou,
    isKnownToPlayer: isKnownToPlayer,
    pickAction: pickAction,
    deriveArcStage: deriveArcStage,
    actionAffinityDelta: actionAffinityDelta,
    countNpcRomanceTargets: countNpcRomanceTargets,
    canDevelopNpcRomance: canDevelopNpcRomance,
    applySilentPair: applySilentPair,
    applyPlayerLeap: applyPlayerLeap,
    maybePlayerTravelEncounter: maybePlayerTravelEncounter,
    maybePlayerMonthEncounter: maybePlayerMonthEncounter,
    advanceOneMonth: advanceOneMonth,
    advanceMonths: advanceMonths,
    elapseRealtime: elapseRealtime,
    visibleWorldEvents: visibleWorldEvents,
    eventsForParticipant: eventsForParticipant,
    estimatePlayerTravel: estimatePlayerTravel,
    playerTravel: playerTravel,
    sameRegion: sameRegion,
    regionName: regionName,
    regionIds: regionIds
  });
});
