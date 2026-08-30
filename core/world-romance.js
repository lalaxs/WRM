(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./world-calendar.js'),
      require('./person-factory.js')
    )
    : factory(
      root && root.WorldCalendar,
      root && root.PersonFactory
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.WorldRomance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  WorldCalendar,
  PersonFactory
) {
  'use strict';

  const KNOWN_CIRCLE_RATIO = 0.75;
  const SAME_NPC_YEAR_CAP = 3;
  const MAX_ACTIVE_ARCS_PER_NPC = 2;
  // NPC↔NPC 恋爱发展对象上限；玩家也受此限。
  const MAX_NPC_ROMANCE_TARGETS = 3;
  const CONTINUE_ARC_RATIO = 0.72;
  const MONTHLY_ACQUAINTED_PAIR_CAP = 5;
  const MONTHLY_STRANGER_OPEN_CAP = 1;
  const MONTHLY_OUTER_MEET_CAP = 1;
  const STRANGER_OPEN_SAME_SECT = 0.12;
  const STRANGER_OPEN_CHANCE = 0.04;
  const OUTER_MEET_CHANCE = 0.08;
  const ARC_FOLLOW_MONTHS = 4;
  const SPARK_TO_WARM_EVENTS = 4;
  const ACQUAINTANCE_ACTIONS = Object.freeze({
    meet: true,
    talk: true,
    spar: true,
    market: true,
    debate: true,
    aid: true,
    birthday: true,
    treasure: true
  });

  const TAG_IDS = Object.freeze([
    'friend',
    'lover',
    'partner',
    'mentor',
    'blood',
    'enemy',
    'dao-companion',
    'close-friend',
    'life-debt',
    'impressed',
    'acquainted'
  ]);

  const ARC_STAGES = Object.freeze([
    'spark',
    'warm',
    'bond',
    'strain',
    'mend',
    'break'
  ]);

  // 道侣线节拍：往来 → 赠礼 → 吃醋 → 告白 → 道侣
  const ROMANCE_BEATS = Object.freeze([
    'none',
    'courting',
    'gifted',
    'jealous',
    'confessed',
    'bonded'
  ]);

  // 血缘对禁止的恋爱/暧昧行动（亲缘可往来，不可走情爱线）。
  const BLOOD_FORBIDDEN_ACTIONS = Object.freeze({
    first_sight: true,
    date: true,
    confess_npc: true,
    partner_npc: true,
    jealousy: true,
    breakup: true,
    rival: true,
    rare_gift: true,
    birthday: true
  });

  const BLOOD_SAFE_ACTIONS = Object.freeze([
    'talk',
    'meet',
    'spar',
    'aid',
    'market',
    'debate',
    'gift',
    'rescue',
    'crisis_save',
    'treasure'
  ]);

  // 会新开/推进 NPC 恋情线的行动；已达对象上限时改走普通往来。
  const NEW_NPC_ROMANCE_ACTIONS = Object.freeze({
    first_sight: true,
    date: true,
    confess_npc: true,
    partner_npc: true,
    jealousy: true,
    breakup: true,
    rival: true,
    rare_gift: true,
    birthday: true
  });

  const NPC_ROMANCE_TARGET_TAGS = Object.freeze([
    'lover',
    'partner',
    'dao-companion',
    'impressed'
  ]);

  const ROMANCE_CAP_SAFE_ACTIONS = Object.freeze([
    'talk',
    'meet',
    'spar',
    'aid',
    'market',
    'debate',
    'gift',
    'treasure'
  ]);

  const own = WorldCalendar.own;
  const record = WorldCalendar.record;
  const finite = WorldCalendar.finite;
  const clampInt = WorldCalendar.clampInt;

  function randomOf(list, random) {
    if (!list || !list.length) return null;
    const roll = typeof random === 'function' ? random() : Math.random();
    return list[Math.floor(roll * list.length) % list.length];
  }

  function pairKey(left, right) {
    return left < right ? left + '|' + right : right + '|' + left;
  }

  function affinityKey(sourceId, targetId) {
    return sourceId + '>' + targetId;
  }

  function getAffinity(rels, sourceId, targetId) {
    // 玩家↔NPC：以 8 维里的 affection 为准（更深账本）。
    if (sourceId === 'player' || targetId === 'player') {
      const fromEdge = edgeMetric(rels, sourceId, targetId, 'affection');
      if (fromEdge) return fromEdge;
    }
    const map = rels && rels.npcAffinities;
    if (!record(map)) return 0;
    const value = map[affinityKey(sourceId, targetId)];
    if (value == null || value === '') return 0;
    return clampInt(value, -100, 100);
  }

  function setAffinity(rels, sourceId, targetId, value) {
    if (!record(rels)) return;
    // 玩家↔NPC 不写单维 affinity 表，改走 8 维 edge。
    if (sourceId === 'player' || targetId === 'player') {
      const next = clampInt(value, -100, 100);
      const prev = edgeMetric(rels, sourceId, targetId, 'affection');
      bumpEdgeMetrics(rels, sourceId, targetId, {
        affection: next - prev
      }, 0);
      return;
    }
    if (!record(rels.npcAffinities)) rels.npcAffinities = {};
    const next = clampInt(value, -100, 100);
    const key = affinityKey(sourceId, targetId);
    if (next === 0) delete rels.npcAffinities[key];
    else rels.npcAffinities[key] = next;
  }

  function getTags(rels, leftId, rightId) {
    const map = rels && rels.tags;
    if (!record(map)) return [];
    const raw = map[pairKey(leftId, rightId)];
    return Array.isArray(raw) ? raw.slice() : [];
  }

  function setTags(rels, leftId, rightId, tags) {
    if (!record(rels)) return;
    if (!record(rels.tags)) rels.tags = {};
    const key = pairKey(leftId, rightId);
    const clean = [];
    const seen = {};
    (Array.isArray(tags) ? tags : []).forEach(function (tag) {
      if (typeof tag !== 'string' || !TAG_IDS.includes(tag) || seen[tag]) {
        return;
      }
      seen[tag] = true;
      clean.push(tag);
    });
    if (!clean.length) delete rels.tags[key];
    else rels.tags[key] = clean;
  }

  function ensureArcs(rels) {
    if (!record(rels)) return null;
    if (!record(rels.arcs)) rels.arcs = {};
    return rels.arcs;
  }

  function getArc(rels, leftId, rightId) {
    const arcs = rels && rels.arcs;
    if (!record(arcs)) return null;
    const raw = arcs[pairKey(leftId, rightId)];
    return record(raw) ? raw : null;
  }

  function setArc(rels, leftId, rightId, arc) {
    const arcs = ensureArcs(rels);
    if (!arcs) return;
    const key = pairKey(leftId, rightId);
    if (!arc || !arc.stage || ARC_STAGES.indexOf(arc.stage) < 0) {
      delete arcs[key];
      return;
    }
    arcs[key] = {
      stage: arc.stage,
      lastEventMonth: clampInt(arc.lastEventMonth, 0, 1e9),
      lastChronicleMonth: clampInt(arc.lastChronicleMonth, 0, 1e9),
      eventCount: clampInt(arc.eventCount, 0, 1e6),
      romanceBeat: ROMANCE_BEATS.indexOf(arc.romanceBeat) >= 0
        ? arc.romanceBeat
        : 'none'
    };
  }

  function hasRelationHistory(tags) {
    if (!Array.isArray(tags) || !tags.length) return false;
    for (let i = 0; i < tags.length; i++) {
      if (tags[i] !== 'acquainted' && TAG_IDS.indexOf(tags[i]) >= 0) {
        return true;
      }
    }
    return hasTag(tags, 'acquainted');
  }

  function isAcquaintedPair(rels, aId, bId) {
    const tags = getTags(rels, aId, bId);
    if (hasRelationHistory(tags)) return true;
    if (getAffinity(rels, aId, bId) !== 0) return true;
    if (getAffinity(rels, bId, aId) !== 0) return true;
    const arc = getArc(rels, aId, bId);
    return !!(arc && arc.stage && arc.stage !== 'break');
  }

  function linkNpcAcquaintance(state, aId, bId) {
    if (!aId || !bId || aId === bId) return false;
    if (aId === 'player' || bId === 'player') {
      if (PersonFactory && typeof PersonFactory.befriend === 'function') {
        const npcId = aId === 'player' ? bId : aId;
        return !!PersonFactory.befriend(state, 'player', npcId);
      }
      return false;
    }
    if (PersonFactory && typeof PersonFactory.acquaint === 'function') {
      return !!PersonFactory.acquaint(state, aId, bId);
    }
    const records = state && state.systems && state.systems.npcs &&
      state.systems.npcs.records;
    const left = records && records[aId];
    const right = records && records[bId];
    if (!left || !right) return false;
    function ensureFrs(person) {
      if (!person.kin || typeof person.kin !== 'object') {
        person.kin = { fa: null, mo: null, par: null, frs: [], ens: [] };
      }
      if (!Array.isArray(person.kin.frs)) person.kin.frs = [];
      return person.kin.frs;
    }
    const leftFrs = ensureFrs(left);
    const rightFrs = ensureFrs(right);
    if (leftFrs.indexOf(bId) < 0) leftFrs.push(bId);
    if (rightFrs.indexOf(aId) < 0) rightFrs.push(aId);
    return true;
  }

  function sameSectPair(records, aId, bId) {
    const a = records && records[aId];
    const b = records && records[bId];
    return !!(a && b && a.sectId && b.sectId && a.sectId === b.sectId);
  }

  function isActiveArcStage(stage) {
    return !!stage && stage !== 'break';
  }

  function countActiveArcsForNpc(rels, npcId) {
    const arcs = rels && rels.arcs;
    if (!record(arcs) || typeof npcId !== 'string') return 0;
    let count = 0;
    Object.keys(arcs).forEach(function (key) {
      const parts = key.split('|');
      if (parts.length !== 2) return;
      if (parts[0] !== npcId && parts[1] !== npcId) return;
      if (isActiveArcStage(arcs[key] && arcs[key].stage)) count += 1;
    });
    return count;
  }

  function canOpenNewArc(rels, aId, bId) {
    if (isAcquaintedPair(rels, aId, bId)) return true;
    return countActiveArcsForNpc(rels, aId) < MAX_ACTIVE_ARCS_PER_NPC &&
      countActiveArcsForNpc(rels, bId) < MAX_ACTIVE_ARCS_PER_NPC;
  }

  function deriveArcStage(tags, affinity, previous, meta) {
    if (hasTag(tags, 'enemy')) return 'break';
    const eventCount = meta && meta.eventCount != null
      ? clampInt(meta.eventCount, 0, 1e6)
      : 0;
    const romantic = hasTag(tags, 'lover') || hasTag(tags, 'partner') ||
      hasTag(tags, 'dao-companion');
    if (previous === 'strain' && romantic) return 'strain';
    if (previous === 'mend' && romantic) return 'mend';
    if (romantic) return 'bond';
    // 暧昧期要先熬过相识：有心动/恩情也得来往几回，不能开线就约会。
    const romanticSignal = hasTag(tags, 'life-debt') ||
      hasTag(tags, 'impressed') ||
      hasTag(tags, 'close-friend') ||
      (hasTag(tags, 'friend') && affinity >= 30);
    if (romanticSignal &&
        eventCount >= SPARK_TO_WARM_EVENTS &&
        affinity >= 22) {
      return previous === 'strain' ? 'strain' : 'warm';
    }
    if (previous === 'mend') return 'mend';
    if (hasTag(tags, 'acquainted') || hasTag(tags, 'friend') ||
        hasTag(tags, 'impressed') || hasTag(tags, 'life-debt') ||
        affinity > 0) {
      return 'spark';
    }
    return previous && ARC_STAGES.indexOf(previous) >= 0 ? previous : 'spark';
  }

  function nextArcStage(previous, action, tags, affinity, meta) {
    if (action === 'breakup') return 'break';
    if (action === 'jealousy' || action === 'quarrel' || action === 'rival' ||
        action === 'duel') {
      const stake = hasTag(tags, 'lover') || hasTag(tags, 'partner') ||
        hasTag(tags, 'impressed') || hasTag(tags, 'life-debt') ||
        previous === 'bond' || previous === 'warm' || previous === 'mend';
      if (stake && previous !== 'spark') return 'strain';
    }
    if (previous === 'strain' &&
        (action === 'date' || action === 'gift' || action === 'talk' ||
          action === 'aid' || action === 'rare_gift' || action === 'confess_npc')) {
      return 'mend';
    }
    if (previous === 'mend' &&
        (action === 'date' || action === 'gift' || action === 'talk' ||
          action === 'aid' || action === 'rare_gift')) {
      return deriveArcStage(tags, affinity, 'mend', meta) === 'bond'
        ? 'bond'
        : 'warm';
    }
    return deriveArcStage(tags, affinity, previous, meta);
  }

  function touchArc(rels, aId, bId, month, action, tags, affinity, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const prev = getArc(rels, aId, bId) || {};
    const nextCount = clampInt(prev.eventCount, 0, 1e6) + 1;
    const stage = nextArcStage(prev.stage, action, tags, affinity, {
      eventCount: nextCount
    });
    // 恋情名额已满且彼此尚无线索时，不把普通往来写成 courting，避免暗占名额。
    const nextBeat = opts.freezeRomanceBeat
      ? romanceBeatOf(prev)
      : nextRomanceBeat(romanceBeatOf(prev), action, tags);
    setArc(rels, aId, bId, {
      stage: stage,
      lastEventMonth: month,
      lastChronicleMonth: opts.chronicled
        ? month
        : clampInt(prev.lastChronicleMonth, 0, 1e9),
      eventCount: nextCount,
      romanceBeat: nextBeat
    });
    return stage;
  }

  function markArcChronicled(rels, aId, bId, month) {
    const prev = getArc(rels, aId, bId);
    if (!prev) return;
    setArc(rels, aId, bId, {
      stage: prev.stage,
      lastEventMonth: prev.lastEventMonth,
      lastChronicleMonth: month,
      eventCount: prev.eventCount,
      romanceBeat: romanceBeatOf(prev)
    });
  }

  function arcFollowScore(arc, monthNow) {
    if (!arc || !isActiveArcStage(arc.stage)) return 0;
    const lastCh = clampInt(arc.lastChronicleMonth, 0, 1e9);
    const lastEv = clampInt(arc.lastEventMonth, 0, 1e9);
    if (lastCh > 0 && monthNow - lastCh <= ARC_FOLLOW_MONTHS) return 3;
    if (lastEv > 0 && monthNow - lastEv <= ARC_FOLLOW_MONTHS) return 2;
    return 1;
  }

  function edgeMetric(rels, sourceId, targetId, metric) {
    const edges = rels && rels.edges;
    if (!record(edges)) return 0;
    const edge = edges[affinityKey(sourceId, targetId)];
    if (!record(edge)) return 0;
    return clampInt(edge[metric], 0, 100);
  }

  function isKnownToPlayer(state, npcId) {
    const rels = state && state.systems && state.systems.relationships;
    if (edgeMetric(rels, npcId, 'player', 'affection') >= 20) return true;
    const tags = getTags(rels, npcId, 'player');
    if (tags.length) return true;
    const person = state && state.systems && state.systems.npcs &&
      state.systems.npcs.records &&
      state.systems.npcs.records[npcId];
    return !!(person && person.metPlayer === true);
  }

  function romanceBeatOf(arc) {
    const beat = arc && arc.romanceBeat;
    return ROMANCE_BEATS.indexOf(beat) >= 0 ? beat : 'none';
  }

  function nextRomanceBeat(prevBeat, action, tags) {
    if (hasTag(tags, 'partner') || hasTag(tags, 'dao-companion') ||
        action === 'partner_npc') {
      return 'bonded';
    }
    if (action === 'confess_npc') return 'confessed';
    if (action === 'jealousy') return 'jealous';
    if (action === 'gift' || action === 'rare_gift' || action === 'date' ||
        action === 'birthday') {
      if (prevBeat === 'none' || prevBeat === 'courting' || !prevBeat) {
        return 'gifted';
      }
      return prevBeat;
    }
    if (action === 'talk' || action === 'meet' || action === 'aid' ||
        action === 'spar' || action === 'market') {
      if (prevBeat === 'none' || !prevBeat) return 'courting';
      return prevBeat;
    }
    return prevBeat || 'none';
  }

  function isBloodPair(tags, rels, leftId, rightId) {
    if (hasTag(tags, 'blood')) return true;
    if (!record(rels) || !record(rels.restrictions)) return false;
    return rels.restrictions[pairKey(leftId, rightId)] === 'blood';
  }

  function sanitizeBloodAction(action, random) {
    if (!action || !BLOOD_FORBIDDEN_ACTIONS[action]) return action;
    return randomOf(BLOOD_SAFE_ACTIONS, random) || 'talk';
  }

  function isNpcPersonId(id) {
    return typeof id === 'string' && /^npc-/.test(id);
  }

  function pairHasNpcRomanceSignal(rels, aId, bId) {
    const tags = getTags(rels, aId, bId);
    for (let index = 0; index < NPC_ROMANCE_TARGET_TAGS.length; index++) {
      if (hasTag(tags, NPC_ROMANCE_TARGET_TAGS[index])) return true;
    }
    return romanceBeatOf(getArc(rels, aId, bId)) !== 'none';
  }

  function countNpcRomanceTargets(rels, npcId) {
    if (!isNpcPersonId(npcId) || !record(rels)) return 0;
    const seen = {};
    function mark(otherId) {
      if (!isNpcPersonId(otherId) || otherId === npcId || seen[otherId]) {
        return;
      }
      seen[otherId] = true;
    }
    const tagMap = record(rels.tags) ? rels.tags : {};
    Object.keys(tagMap).forEach(function (key) {
      const parts = String(key).split('|');
      if (parts.length !== 2) return;
      if (parts[0] !== npcId && parts[1] !== npcId) return;
      const other = parts[0] === npcId ? parts[1] : parts[0];
      if (!isNpcPersonId(other)) return;
      const list = tagMap[key];
      if (!Array.isArray(list)) return;
      for (let index = 0; index < NPC_ROMANCE_TARGET_TAGS.length; index++) {
        if (list.indexOf(NPC_ROMANCE_TARGET_TAGS[index]) >= 0) {
          mark(other);
          return;
        }
      }
    });
    const arcs = record(rels.arcs) ? rels.arcs : {};
    Object.keys(arcs).forEach(function (key) {
      const parts = String(key).split('|');
      if (parts.length !== 2) return;
      if (parts[0] !== npcId && parts[1] !== npcId) return;
      const other = parts[0] === npcId ? parts[1] : parts[0];
      if (!isNpcPersonId(other)) return;
      if (romanceBeatOf(arcs[key]) !== 'none') mark(other);
    });
    return Object.keys(seen).length;
  }

  function canDevelopNpcRomance(rels, aId, bId) {
    if (aId === 'player' || bId === 'player') return true;
    if (!isNpcPersonId(aId) || !isNpcPersonId(bId)) return true;
    if (pairHasNpcRomanceSignal(rels, aId, bId)) return true;
    return countNpcRomanceTargets(rels, aId) < MAX_NPC_ROMANCE_TARGETS &&
      countNpcRomanceTargets(rels, bId) < MAX_NPC_ROMANCE_TARGETS;
  }

  function sanitizeRomanceCapAction(action, random) {
    if (!action || !NEW_NPC_ROMANCE_ACTIONS[action]) return action;
    return randomOf(ROMANCE_CAP_SAFE_ACTIONS, random) || 'talk';
  }

  function suggestRomanceBeatAction(arc, tags, affinity, random) {
    if (!arc || !arc.stage) return null;
    if (hasTag(tags, 'blood')) return null;
    const stage = arc.stage;
    const beat = romanceBeatOf(arc);
    const count = clampInt(arc.eventCount, 0, 1e6);
    const romantic = hasTag(tags, 'lover') || hasTag(tags, 'partner') ||
      hasTag(tags, 'dao-companion');
    const hostile = hasTag(tags, 'enemy');
    const roll = typeof random === 'function' ? random() : Math.random();
    if (hostile) return null;

    if (romantic || beat === 'bonded') {
      if (roll < 0.38) return 'date';
      if (roll < 0.58) return 'gift';
      if (roll < 0.68) return 'talk';
      return null;
    }

    if (stage === 'spark' && count >= 2 && affinity >= 14 &&
        (beat === 'none' || beat === 'courting')) {
      if (roll < 0.58) return 'gift';
      if (roll < 0.78) return 'talk';
      return null;
    }

    if (stage === 'warm' || stage === 'mend') {
      if (beat === 'none' || beat === 'courting') {
        if (roll < 0.72) return 'gift';
        if (roll < 0.9) return 'date';
        return 'talk';
      }
      if (beat === 'gifted') {
        if (affinity >= 30 && roll < 0.58) return 'jealousy';
        if (roll < 0.82) return 'date';
        return 'gift';
      }
      if (beat === 'jealous') {
        if (affinity >= 40 && roll < 0.7) return 'confess_npc';
        return 'date';
      }
      if (beat === 'confessed') {
        if (affinity >= 52 && roll < 0.72) return 'partner_npc';
        return 'date';
      }
    }

    if (stage === 'strain') {
      if (roll < 0.55) return 'jealousy';
      return 'quarrel';
    }
    return null;
  }

  function hasTag(tags, id) {
    return Array.isArray(tags) && tags.indexOf(id) >= 0;
  }

  function withTag(tags, id) {
    const next = Array.isArray(tags) ? tags.slice() : [];
    if (next.indexOf(id) < 0) next.push(id);
    return next;
  }

  function withoutTags(tags, removeIds) {
    const ban = {};
    (Array.isArray(removeIds) ? removeIds : []).forEach(function (id) {
      ban[id] = true;
    });
    return (Array.isArray(tags) ? tags : []).filter(function (tag) {
      return !ban[tag];
    });
  }

  function ensureEdge(rels, sourceId, targetId) {
    if (!record(rels)) return null;
    if (sourceId !== 'player' && targetId !== 'player') return null;
    if (!record(rels.edges)) rels.edges = {};
    const key = affinityKey(sourceId, targetId);
    if (!record(rels.edges[key])) {
      rels.edges[key] = {
        affection: 0,
        trust: 0,
        romanticAttachment: 0,
        closeness: 0,
        dependence: 0,
        loyalty: 0,
        jealousy: 0,
        desire: 0,
        lastChangedAt: 0
      };
    }
    return rels.edges[key];
  }

  function bumpEdgeMetrics(rels, sourceId, targetId, deltas, atSeconds) {
    // 8 维仅用于玩家↔NPC；NPC↔NPC 禁止写 edge。
    if (sourceId !== 'player' && targetId !== 'player') return;
    const edge = ensureEdge(rels, sourceId, targetId);
    if (!edge) return;
    Object.keys(deltas || {}).forEach(function (metric) {
      const amount = Number(deltas[metric]);
      if (!Number.isFinite(amount) || amount === 0) return;
      const prev = clampInt(edge[metric], 0, 100);
      edge[metric] = clampInt(prev + amount, 0, 100);
    });
    edge.lastChangedAt = Number.isFinite(atSeconds) ? atSeconds : 0;
  }


  return Object.freeze({
    KNOWN_CIRCLE_RATIO: KNOWN_CIRCLE_RATIO,
    SAME_NPC_YEAR_CAP: SAME_NPC_YEAR_CAP,
    MAX_ACTIVE_ARCS_PER_NPC: MAX_ACTIVE_ARCS_PER_NPC,
    MAX_NPC_ROMANCE_TARGETS: MAX_NPC_ROMANCE_TARGETS,
    CONTINUE_ARC_RATIO: CONTINUE_ARC_RATIO,
    MONTHLY_ACQUAINTED_PAIR_CAP: MONTHLY_ACQUAINTED_PAIR_CAP,
    MONTHLY_STRANGER_OPEN_CAP: MONTHLY_STRANGER_OPEN_CAP,
    MONTHLY_OUTER_MEET_CAP: MONTHLY_OUTER_MEET_CAP,
    STRANGER_OPEN_SAME_SECT: STRANGER_OPEN_SAME_SECT,
    STRANGER_OPEN_CHANCE: STRANGER_OPEN_CHANCE,
    OUTER_MEET_CHANCE: OUTER_MEET_CHANCE,
    ARC_FOLLOW_MONTHS: ARC_FOLLOW_MONTHS,
    SPARK_TO_WARM_EVENTS: SPARK_TO_WARM_EVENTS,
    ACQUAINTANCE_ACTIONS: ACQUAINTANCE_ACTIONS,
    TAG_IDS: TAG_IDS,
    ARC_STAGES: ARC_STAGES,
    ROMANCE_BEATS: ROMANCE_BEATS,
    BLOOD_FORBIDDEN_ACTIONS: BLOOD_FORBIDDEN_ACTIONS,
    BLOOD_SAFE_ACTIONS: BLOOD_SAFE_ACTIONS,
    NEW_NPC_ROMANCE_ACTIONS: NEW_NPC_ROMANCE_ACTIONS,
    NPC_ROMANCE_TARGET_TAGS: NPC_ROMANCE_TARGET_TAGS,
    ROMANCE_CAP_SAFE_ACTIONS: ROMANCE_CAP_SAFE_ACTIONS,
    pairKey: pairKey,
    affinityKey: affinityKey,
    getAffinity: getAffinity,
    setAffinity: setAffinity,
    getTags: getTags,
    setTags: setTags,
    ensureArcs: ensureArcs,
    getArc: getArc,
    setArc: setArc,
    hasRelationHistory: hasRelationHistory,
    isAcquaintedPair: isAcquaintedPair,
    linkNpcAcquaintance: linkNpcAcquaintance,
    sameSectPair: sameSectPair,
    isActiveArcStage: isActiveArcStage,
    countActiveArcsForNpc: countActiveArcsForNpc,
    canOpenNewArc: canOpenNewArc,
    deriveArcStage: deriveArcStage,
    nextArcStage: nextArcStage,
    touchArc: touchArc,
    markArcChronicled: markArcChronicled,
    arcFollowScore: arcFollowScore,
    edgeMetric: edgeMetric,
    isKnownToPlayer: isKnownToPlayer,
    romanceBeatOf: romanceBeatOf,
    nextRomanceBeat: nextRomanceBeat,
    isBloodPair: isBloodPair,
    sanitizeBloodAction: sanitizeBloodAction,
    isNpcPersonId: isNpcPersonId,
    pairHasNpcRomanceSignal: pairHasNpcRomanceSignal,
    countNpcRomanceTargets: countNpcRomanceTargets,
    canDevelopNpcRomance: canDevelopNpcRomance,
    sanitizeRomanceCapAction: sanitizeRomanceCapAction,
    suggestRomanceBeatAction: suggestRomanceBeatAction,
    hasTag: hasTag,
    withTag: withTag,
    withoutTags: withoutTags,
    ensureEdge: ensureEdge,
    bumpEdgeMetrics: bumpEdgeMetrics
  });
});
