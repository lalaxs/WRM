(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/regions.js'),
      require('../content/original-event-bindings.js'),
      require('../content/npc-generation.js'),
      require('./world-calendar.js'),
      require('./world-narrative-fill.js'),
      require('./world-romance.js'),
      require('./dns.js'),
      require('./person-graph.js'),
      require('./event-core.js'),
      require('./person-factory.js'),
      require('./sect-offices.js'),
      require('./npc-spirit-pets.js'),
      require('./npc-simulation.js')
    )
    : factory(
      root && root.RegionContent,
      root && root.OriginalEventBindings,
      root && root.NpcGenerationContent,
      root && root.WorldCalendar,
      root && root.WorldNarrativeFill,
      root && root.WorldRomance,
      root && root.Dns,
      root && root.PersonGraph,
      root && root.EventCore,
      root && root.PersonFactory,
      root && root.SectOffices,
      root && root.NpcSpiritPets,
      root && root.NpcSimulation
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.WorldEventGen = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  RegionContent,
  OriginalEventBindings,
  NpcGenerationContent,
  WorldCalendar,
  WorldNarrativeFill,
  WorldRomance,
  DnsConfig,
  PersonGraph,
  EventCore,
  PersonFactory,
  SectOffices,
  NpcSpiritPets,
  NpcSimulation
) {
  'use strict';


  const own = WorldCalendar.own;
  const record = WorldCalendar.record;
  const finite = WorldCalendar.finite;
  const clampInt = WorldCalendar.clampInt;
  const ensureCalendar = WorldCalendar.ensureCalendar;
  const absoluteMonth = WorldCalendar.absoluteMonth;
  const currentAbsoluteMonth = WorldCalendar.currentAbsoluteMonth;
  const appendWorldEvent = WorldCalendar.appendWorldEvent;
  const MONTHS_PER_YEAR = WorldCalendar.MONTHS_PER_YEAR;
  const WORLD_EVENT_PER_GAME_YEAR = WorldCalendar.WORLD_EVENT_PER_GAME_YEAR;
  const SAME_NPC_YEAR_CAP = WorldRomance.SAME_NPC_YEAR_CAP;

  function canAppear(calendar, npcId) {
    if (DnsConfig && DnsConfig.useNpcYearCap === false) return true;
    const count = clampInt(calendar.npcYearAppearances[npcId], 0, 99);
    return count < SAME_NPC_YEAR_CAP;
  }

  function markAppear(calendar, npcId) {
    calendar.npcYearAppearances[npcId] =
      clampInt(calendar.npcYearAppearances[npcId], 0, 99) + 1;
  }

  const regionName = WorldNarrativeFill.regionName;
  const regionIds = WorldNarrativeFill.regionIds;
  const randomOf = WorldNarrativeFill.randomOf;
  const fillNarrative = WorldNarrativeFill.fillNarrative;
  const personPlainLabel = WorldNarrativeFill.personPlainLabel;
  const playerNarrativeLabel = WorldNarrativeFill.playerNarrativeLabel;
  const originalTextNeedsPeer = WorldNarrativeFill.originalTextNeedsPeer;
  const actionHasOriginalPool = WorldNarrativeFill.actionHasOriginalPool;
  const pickGiftItem = WorldNarrativeFill.pickGiftItem;
  // 恋爱节奏强制动作：仅用于播报优先级，不触发白话模板。
  const ROMANCE_STEP_ACTIONS = Object.freeze({
    gift: true,
    rare_gift: true,
    date: true,
    birthday: true,
    jealousy: true,
    confess_npc: true,
    partner_npc: true
  });

  const getAffinity = WorldRomance.getAffinity;
  const setAffinity = WorldRomance.setAffinity;
  const getTags = WorldRomance.getTags;
  const setTags = WorldRomance.setTags;
  const pairKey = WorldRomance.pairKey;
  const getArc = WorldRomance.getArc;
  const touchArc = WorldRomance.touchArc;
  const markArcChronicled = WorldRomance.markArcChronicled;
  const arcFollowScore = WorldRomance.arcFollowScore;
  const isAcquaintedPair = WorldRomance.isAcquaintedPair;
  const linkNpcAcquaintance = WorldRomance.linkNpcAcquaintance;
  const sameSectPair = WorldRomance.sameSectPair;
  const canOpenNewArc = WorldRomance.canOpenNewArc;
  const isKnownToPlayer = WorldRomance.isKnownToPlayer;
  const deriveArcStage = WorldRomance.deriveArcStage;
  const suggestRomanceBeatAction = WorldRomance.suggestRomanceBeatAction;
  const nextRomanceBeat = WorldRomance.nextRomanceBeat;
  const romanceBeatOf = WorldRomance.romanceBeatOf;
  const isBloodPair = WorldRomance.isBloodPair;
  const sanitizeBloodAction = WorldRomance.sanitizeBloodAction;
  const canDevelopNpcRomance = WorldRomance.canDevelopNpcRomance;
  const sanitizeRomanceCapAction = WorldRomance.sanitizeRomanceCapAction;
  const countNpcRomanceTargets = WorldRomance.countNpcRomanceTargets;
  const pairHasNpcRomanceSignal = WorldRomance.pairHasNpcRomanceSignal;
  const isNpcPersonId = WorldRomance.isNpcPersonId;
  const hasTag = WorldRomance.hasTag;
  const withTag = WorldRomance.withTag;
  const withoutTags = WorldRomance.withoutTags;
  const bumpEdgeMetrics = WorldRomance.bumpEdgeMetrics;
  const KNOWN_CIRCLE_RATIO = WorldRomance.KNOWN_CIRCLE_RATIO;
  const CONTINUE_ARC_RATIO = WorldRomance.CONTINUE_ARC_RATIO;
  const MONTHLY_ACQUAINTED_PAIR_CAP = WorldRomance.MONTHLY_ACQUAINTED_PAIR_CAP;
  const MONTHLY_STRANGER_OPEN_CAP = WorldRomance.MONTHLY_STRANGER_OPEN_CAP;
  const MONTHLY_OUTER_MEET_CAP = WorldRomance.MONTHLY_OUTER_MEET_CAP;
  const STRANGER_OPEN_SAME_SECT = WorldRomance.STRANGER_OPEN_SAME_SECT;
  const STRANGER_OPEN_CHANCE = WorldRomance.STRANGER_OPEN_CHANCE;
  const OUTER_MEET_CHANCE = WorldRomance.OUTER_MEET_CHANCE;
  const ACQUAINTANCE_ACTIONS = WorldRomance.ACQUAINTANCE_ACTIONS;
  const BLOOD_FORBIDDEN_ACTIONS = WorldRomance.BLOOD_FORBIDDEN_ACTIONS;
  const NEW_NPC_ROMANCE_ACTIONS = WorldRomance.NEW_NPC_ROMANCE_ACTIONS;

  // Injected by WorldMonth after construction (activity helpers live in orchestrator).
  let activityStatus = function () { return 'normal'; };
  let blocksWorldSocial = function () { return false; };

  function bindActivityHelpers(helpers) {
    if (!helpers) return;
    if (typeof helpers.activityStatus === 'function') {
      activityStatus = helpers.activityStatus;
    }
    if (typeof helpers.blocksWorldSocial === 'function') {
      blocksWorldSocial = helpers.blocksWorldSocial;
    }
  }


  const OPEN_LINE_ACTIONS = Object.freeze({
    meet: true,
    first_sight: true,
    crisis_meet: true,
    rescue: true,
    crisis_save: true
  });

  // L0 日常 / L1 契机 / L2 立基 / L3 跃迁 —— 单次冲击不可与闲聊同级。
  const IMPACT_ACTIONS = Object.freeze({
    talk: 'L0',
    meet: 'L0',
    spar: 'L0',
    market: 'L0',
    gift: 'L1',
    aid: 'L1',
    debate: 'L1',
    birthday: 'L1',
    rare_gift: 'L1',
    mentor: 'L1',
    treasure: 'L1',
    date: 'L1',
    confess_npc: 'L1',
    partner_npc: 'L1',
    rescue: 'L2',
    crisis_save: 'L2',
    first_sight: 'L3',
    crisis_meet: 'L3',
    quarrel: 'neg',
    rival: 'neg',
    duel: 'neg',
    jealousy: 'neg',
    breakup: 'neg'
  });

  const LEAP_EVENT_TYPES = Object.freeze({
    rescue: true,
    crisis_save: true,
    first_sight: true,
    crisis_meet: true
  });

  const ROMANCE_EVENT_TYPES = Object.freeze({
    date: true,
    gift: true,
    rare_gift: true,
    confess_npc: true,
    partner_npc: true,
    first_sight: true,
    crisis_meet: true,
    rescue: true,
    crisis_save: true,
    birthday: true
  });

  // 冲突默认恋爱语境：吃醋、情侣拌嘴、情敌、分手（不再靠无感情泛吵架撑场面）。
  const CONFLICT_EVENT_TYPES = Object.freeze({
    quarrel: true,
    rival: true,
    duel: true,
    jealousy: true,
    breakup: true
  });

  const ROMANCE_CONFLICT_TYPES = Object.freeze({
    jealousy: true,
    breakup: true,
    quarrel: true,
    rival: true,
    duel: true
  });

  function pickAction(affinity, random, ctx) {
    const roll = typeof random === 'function' ? random() : Math.random();
    const tags = (ctx && ctx.tags) || [];
    const stranger = !!(ctx && ctx.stranger);
    const stage = ctx && typeof ctx.arcStage === 'string' ? ctx.arcStage : null;
    const bloodKin = hasTag(tags, 'blood') || !!(ctx && ctx.bloodKin);
    const romanceCapped = !bloodKin && !!(ctx && ctx.romanceCapped);
    const romantic = !bloodKin && !romanceCapped && (
      hasTag(tags, 'lover') || hasTag(tags, 'partner') ||
      hasTag(tags, 'dao-companion')
    );
    const friendly = romantic || hasTag(tags, 'friend') ||
      hasTag(tags, 'close-friend') || bloodKin;
    const hostile = hasTag(tags, 'enemy');
    const statusB = ctx && ctx.statusB;
    const forceRescue = ctx && ctx.forceRescue === true;
    const hasLifeDebt = hasTag(tags, 'life-debt');
    const impressed = hasTag(tags, 'impressed');
    // 仅相识不算暧昧筹码，避免刚认识就吃醋约会。血缘 / 恋情名额满永不进入暧昧。
    const romanticStake = !bloodKin && !romanceCapped && (romantic ||
      ((impressed || hasLifeDebt || friendly) && affinity >= 28 &&
        stage !== 'spark' && !stranger));

    if (forceRescue ||
        (statusB === 'injured' && !hostile && roll < 0.92)) {
      return roll < 0.45 ? 'crisis_save' : 'rescue';
    }

    // 陌生人：以相识为主；一见倾心极低概率。
    if (stranger) {
      if (statusB === 'injured' || statusB === 'tribulation' ||
          (ctx && ctx.crisisMeet)) {
        return 'crisis_meet';
      }
      if (roll < 0.08) return 'first_sight';
      return 'meet';
    }

    // 相识期：往来、寒暄、切磋；不做约会/告白；也不再「结识第二遍」。
    if (stage === 'spark') {
      if (affinity >= 22 && roll < 0.10) return 'gift';
      if (roll < 0.28) return 'talk';
      if (roll < 0.50) return 'spar';
      if (roll < 0.64) return 'market';
      if (roll < 0.76) return 'aid';
      if (roll < 0.86) return 'debate';
      if (roll < 0.93) return 'talk';
      return randomOf(['talk', 'spar', 'aid'], random);
    }

    if (bloodKin || romanceCapped) {
      if (roll < 0.28) return 'talk';
      if (roll < 0.48) return 'spar';
      if (roll < 0.62) return 'gift';
      if (roll < 0.74) return 'aid';
      if (roll < 0.86) return 'market';
      return randomOf(['talk', 'gift', 'spar', 'market'], random);
    }

    if (stage === 'warm') {
      if (!hostile && !romantic && affinity >= 45 && roll < 0.22) {
        return 'confess_npc';
      }
      if (!hostile && !romantic && affinity >= 70 && roll < 0.10) {
        return 'partner_npc';
      }
      if (romanticStake && roll < 0.10) {
        return roll < 0.06 ? 'jealousy' : 'quarrel';
      }
      if (roll < 0.22) return 'date';
      if (roll < 0.42) return 'gift';
      if (roll < 0.58) return 'talk';
      if (roll < 0.70) return 'aid';
      if (roll < 0.80) return 'rare_gift';
      if (roll < 0.90) return 'spar';
      return randomOf(['date', 'gift', 'talk', 'spar'], random);
    }

    if (stage === 'strain') {
      if (roll < 0.28) return 'jealousy';
      if (roll < 0.48) return 'quarrel';
      if (roll < 0.58) return 'rival';
      if (roll < 0.66) return 'breakup';
      if (roll < 0.78) return 'talk';
      if (roll < 0.88) return 'gift';
      return randomOf(['date', 'talk', 'aid'], random);
    }

    if (stage === 'mend') {
      if (roll < 0.30) return 'date';
      if (roll < 0.52) return 'gift';
      if (roll < 0.70) return 'talk';
      if (roll < 0.82) return 'aid';
      return randomOf(['date', 'gift', 'rare_gift'], random);
    }

    if (stage === 'break') {
      if (hostile && roll < 0.35) return 'rival';
      if (roll < 0.55) return 'talk';
      return 'aid';
    }

    if (stage === 'bond' || romantic) {
      if (roll < 0.30) return 'date';
      if (roll < 0.48) return 'gift';
      if (roll < 0.60) return 'talk';
      if (roll < 0.68) return 'rare_gift';
      if (roll < 0.74) return 'aid';
      if (roll < 0.86) return 'jealousy';
      if (roll < 0.95) return 'quarrel';
      if (roll < 0.985) return 'breakup';
      return 'rival';
    }

    if (!bloodKin && !romanceCapped && !hostile && !romantic &&
        affinity < 22 &&
        roll < 0.12) {
      return statusB === 'injured' || statusB === 'tribulation' ||
        (ctx && ctx.crisisMeet)
        ? 'crisis_meet'
        : 'first_sight';
    }
    if (!hostile && (hasLifeDebt || impressed) && affinity >= 28 &&
        affinity < 60 && roll < 0.12) {
      return randomOf(['gift', 'talk', 'aid'], random);
    }

    if (!bloodKin && !romanceCapped && !hostile && !romantic &&
        affinity >= 50 &&
        roll < 0.20) {
      return 'confess_npc';
    }
    if (!bloodKin && !romanceCapped && !hostile && !romantic &&
        affinity >= 75 &&
        roll < 0.10) {
      return 'partner_npc';
    }

    if (romanticStake && !hostile && roll < 0.12) {
      if (roll < 0.07) return 'jealousy';
      if (roll < 0.11) return 'quarrel';
      return 'rival';
    }

    if (hostile && affinity <= -50 && roll < 0.06) {
      return 'quarrel';
    }

    if (!hostile && affinity >= 28 && roll < 0.30) {
      return randomOf(['gift', 'talk', 'spar', 'aid'], random);
    }
    if (affinity >= 50) {
      if (bloodKin || romanceCapped) {
        return randomOf(['gift', 'talk', 'spar', 'aid'], random);
      }
      return randomOf(
        ['gift', 'talk', 'rare_gift', 'aid', 'confess_npc'],
        random
      );
    }

    if (roll < 0.08) return 'treasure';
    if (roll < 0.16) return 'market';
    if (!bloodKin && !romanceCapped && roll < 0.24) return 'birthday';
    if (roll < 0.32) return 'gift';
    if (roll < 0.42) return 'talk';
    return randomOf(['talk', 'spar', 'aid', 'gift'], random);
  }

  function actionAffinityDelta(action, affinity, tags) {
    const tier = IMPACT_ACTIONS[action] || 'L0';
    if (tier === 'L2') {
      return 18 + Math.min(7, Math.max(0, Math.floor((20 - affinity) / 8)));
    }
    if (tier === 'L3') {
      let amount = 12 + Math.min(8, Math.max(0, Math.floor((15 - affinity) / 5)));
      if (hasTag(tags, 'life-debt')) amount += 6;
      return amount;
    }
    if (tier === 'L1') {
      if (action === 'rare_gift' || action === 'confess_npc' ||
          action === 'partner_npc') {
        return 3;
      }
      return 2;
    }
    if (tier === 'neg') {
      if (action === 'jealousy' || action === 'quarrel') return -2;
      if (action === 'breakup') return -5;
      return -3;
    }
    return 1;
  }

  function pairContext(state, aId, bId, regionId) {
    const records = state.systems.npcs.records;
    const rels = state.systems.relationships;
    const a = records[aId];
    const b = records[bId];
    const region = RegionContent && typeof RegionContent.get === 'function'
      ? RegionContent.get(regionId)
      : null;
    const arc = getArc(rels, aId, bId);
    return {
      a: a,
      b: b,
      affinity: getAffinity(rels, aId, bId),
      tags: getTags(rels, aId, bId),
      regionId: regionId,
      regionType: region && region.type ? region.type : null,
      statusA: activityStatus(a),
      statusB: activityStatus(b),
      arcStage: arc && typeof arc.stage === 'string' ? arc.stage : null,
      eventCount: arc ? clampInt(arc.eventCount, 0, 1e6) : 0
    };
  }

  // 只提议动作，不改关系。候选阶段用这个，避免「没讲也发生」。
  function proposePairAction(state, aId, bId, random, regionId, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const rels = state.systems.relationships;
    const affinity = getAffinity(rels, aId, bId);
    const ctx = pairContext(state, aId, bId, regionId);
    const acquainted = opts.stranger === true
      ? false
      : (opts.acquainted === true || isAcquaintedPair(rels, aId, bId));
    const existingArc = getArc(rels, aId, bId);
    const bloodKin = isBloodPair(ctx.tags, rels, aId, bId);
    ctx.bloodKin = bloodKin;
    const canRomance = canDevelopNpcRomance(rels, aId, bId);
    ctx.romanceCapped = !canRomance;
    ctx.stranger = !acquainted;
    ctx.arcStage = opts.arcStage || (existingArc && existingArc.stage) ||
      (acquainted
        ? deriveArcStage(ctx.tags, affinity, null, {
          eventCount: existingArc ? existingArc.eventCount : 0
        })
        : null);
    if (opts.forceRescue) ctx.forceRescue = true;
    if (opts.crisisMeet) ctx.crisisMeet = true;
    let forced = opts.forceAction || null;
    if (!forced && acquainted && !opts.forceRescue && !bloodKin &&
        canRomance) {
      forced = suggestRomanceBeatAction(
        existingArc || { stage: ctx.arcStage, eventCount: 0, romanceBeat: 'none' },
        ctx.tags,
        affinity,
        random
      );
    }
    let action = forced || pickAction(affinity, random, ctx);
    if (bloodKin) action = sanitizeBloodAction(action, random);
    if (!canRomance) action = sanitizeRomanceCapAction(action, random);
    if (ctx.stranger && !OPEN_LINE_ACTIONS[action] && !opts.forceRescue) {
      action = 'meet';
    }
    if (acquainted && OPEN_LINE_ACTIONS[action] && !opts.forceRescue) {
      action = 'talk';
    }
    const romanceBeatForced = !!forced && !!ROMANCE_STEP_ACTIONS[action];
    let thirdPartyId = opts.thirdPartyId || null;
    if (action === 'jealousy' && !thirdPartyId) {
      thirdPartyId = pickThirdPartyId(state, aId, bId, regionId, random);
    }
    const giftItem = (action === 'gift' || action === 'rare_gift' ||
      action === 'birthday' || action === 'date' || action === 'aid' ||
      action === 'treasure' || action === 'market')
      ? pickGiftItem(random)
      : null;
    return {
      action: action,
      giftItem: giftItem,
      thirdPartyId: thirdPartyId,
      romanceBeatForced: romanceBeatForced
    };
  }

  // 讲了才算：关系/标签/弧光只在真正落地见闻时改。
  function applyPairSocialEffects(state, aId, bId, action, regionId, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const rels = state.systems.relationships;
    const records = state.systems.npcs.records;
    const affinity = getAffinity(rels, aId, bId);
    const tagsNow = getTags(rels, aId, bId);
    const canRomance = canDevelopNpcRomance(rels, aId, bId);
    const thirdPartyId = opts.thirdPartyId || null;
    const random = typeof opts.random === 'function' ? opts.random : Math.random;
    if (action === 'jealousy' && thirdPartyId && records[thirdPartyId] &&
        random() < 0.4) {
      records[thirdPartyId].activityStatus = 'injured';
    }
    const delta = actionAffinityDelta(action, affinity, tagsNow);
    const nextAffinity = affinity + delta;
    setAffinity(rels, aId, bId, nextAffinity);
    setAffinity(
      rels,
      bId,
      aId,
      getAffinity(rels, bId, aId) + Math.round(delta * 0.5)
    );
    let tags = getTags(rels, aId, bId);
    const bPerson = records[bId];
    if ((action === 'rescue' || action === 'crisis_save') && bPerson) {
      if (activityStatus(bPerson) === 'injured' ||
          activityStatus(bPerson) === 'missing') {
        bPerson.activityStatus = 'normal';
      }
      tags = withoutTags(tags, ['enemy']);
      tags = withTag(tags, 'life-debt');
      tags = withTag(tags, 'friend');
      tags = withTag(tags, 'acquainted');
      setTags(rels, aId, bId, tags);
      linkNpcAcquaintance(state, aId, bId);
    } else if (action === 'first_sight' || action === 'crisis_meet') {
      tags = withoutTags(tags, ['enemy']);
      tags = withTag(tags, 'acquainted');
      if (action === 'crisis_meet') tags = withTag(tags, 'life-debt');
      if (canDevelopNpcRomance(rels, aId, bId)) {
        tags = withTag(tags, 'impressed');
      }
      setTags(rels, aId, bId, tags);
      linkNpcAcquaintance(state, aId, bId);
    } else if (action === 'meet') {
      tags = withoutTags(tags, ['enemy']);
      tags = withTag(tags, 'acquainted');
      setTags(rels, aId, bId, tags);
      linkNpcAcquaintance(state, aId, bId);
    } else if ((action === 'quarrel' || action === 'duel') &&
        nextAffinity <= -40) {
      tags = withoutTags(tags, [
        'friend',
        'close-friend',
        'dao-companion',
        'lover',
        'partner',
        'life-debt',
        'impressed'
      ]);
      tags = withTag(tags, 'enemy');
      tags = withTag(tags, 'acquainted');
      setTags(rels, aId, bId, tags);
    } else if (action === 'confess_npc' && nextAffinity >= 40 &&
        canDevelopNpcRomance(rels, aId, bId)) {
      tags = withoutTags(tags, ['enemy']);
      tags = withTag(tags, 'friend');
      tags = withTag(tags, 'lover');
      tags = withTag(tags, 'acquainted');
      setTags(rels, aId, bId, tags);
    } else if (action === 'partner_npc' &&
        (hasTag(tags, 'lover') || nextAffinity >= 70) &&
        canDevelopNpcRomance(rels, aId, bId)) {
      tags = withoutTags(tags, ['enemy']);
      tags = withTag(tags, 'lover');
      tags = withTag(tags, 'partner');
      tags = withTag(tags, 'acquainted');
      setTags(rels, aId, bId, tags);
    } else if (action === 'breakup') {
      tags = withoutTags(tags, ['lover', 'partner', 'dao-companion']);
      tags = withTag(tags, 'acquainted');
      setTags(rels, aId, bId, tags);
    } else if (action === 'date' && nextAffinity >= 45 &&
        !hasTag(tags, 'lover') && !hasTag(tags, 'enemy') &&
        canDevelopNpcRomance(rels, aId, bId)) {
      tags = withTag(tags, 'friend');
      tags = withTag(tags, 'lover');
      tags = withTag(tags, 'acquainted');
      setTags(rels, aId, bId, tags);
    } else if ((action === 'gift' || action === 'talk' || action === 'aid' ||
        action === 'meet' || action === 'rare_gift' || action === 'spar' ||
        action === 'market' || action === 'birthday' || action === 'treasure') &&
        !hasTag(tags, 'enemy')) {
      tags = withTag(tags, 'acquainted');
      if (nextAffinity >= 25 && !hasTag(tags, 'friend') &&
          !hasTag(tags, 'lover')) {
        tags = withTag(tags, 'friend');
      }
      if ((action === 'gift' || action === 'aid' || action === 'rare_gift') &&
          nextAffinity >= 45 && hasTag(tags, 'friend') &&
          !hasTag(tags, 'close-friend')) {
        tags = withTag(tags, 'close-friend');
      }
      setTags(rels, aId, bId, tags);
    } else {
      tags = withTag(tags, 'acquainted');
      setTags(rels, aId, bId, tags);
    }
    const monthNow = currentAbsoluteMonth(state);
    const finalTags = getTags(rels, aId, bId);
    touchArc(
      rels,
      aId,
      bId,
      monthNow,
      action,
      finalTags,
      nextAffinity,
      {
        chronicled: opts.chronicled === true,
        freezeRomanceBeat: !canRomance &&
          !pairHasNpcRomanceSignal(rels, aId, bId)
      }
    );
  }

  // 测试 / 显式调用：提议并立刻结算（月刷候选请用 proposePairAction）。
  function applySilentPair(state, aId, bId, random, regionId, options) {
    const proposed = proposePairAction(
      state, aId, bId, random, regionId, options
    );
    applyPairSocialEffects(
      state,
      aId,
      bId,
      proposed.action,
      regionId,
      {
        thirdPartyId: proposed.thirdPartyId,
        random: random,
        chronicled: false
      }
    );
    return proposed;
  }

  function pickThirdPartyId(state, aId, bId, regionId, random) {
    const records = state.systems.npcs.records;
    const pool = [];
    Object.keys(records).forEach(function (npcId) {
      if (npcId === aId || npcId === bId) return;
      const person = records[npcId];
      if (!person || person.status !== 'living') return;
      if (regionId && person.regionId !== regionId) return;
      pool.push(npcId);
    });
    if (!pool.length) {
      Object.keys(records).forEach(function (npcId) {
        if (npcId === aId || npcId === bId) return;
        const person = records[npcId];
        if (!person || person.status !== 'living') return;
        pool.push(npcId);
      });
    }
    return randomOf(pool, random);
  }

  function randomlevelCount(random) {
    const min = DnsConfig && Number.isFinite(DnsConfig.randomlevelMin)
      ? Math.max(0, Math.floor(DnsConfig.randomlevelMin))
      : 1;
    const max = DnsConfig && Number.isFinite(DnsConfig.randomlevelMax)
      ? Math.max(min, Math.floor(DnsConfig.randomlevelMax))
      : 2;
    if (max <= min) return min;
    return min + Math.floor(random() * (max - min + 1));
  }

  function rollYearBudget(random) {
    const roll = typeof random === 'function' ? random() : Math.random();
    return 30 + Math.floor(roll * 11);
  }

  function tagsForSoloBeat(state, npcId) {
    const rels = state.systems && state.systems.relationships;
    const withPlayer = getTags(rels, npcId, 'player');
    if (withPlayer.length) return withPlayer;
    const map = rels && rels.tags;
    if (!record(map)) return [];
    const found = [];
    const seen = {};
    Object.keys(map).forEach(function (key) {
      if (typeof key !== 'string' || key.indexOf(npcId) < 0) return;
      const list = map[key];
      if (!Array.isArray(list)) return;
      list.forEach(function (tag) {
        if (typeof tag !== 'string' || seen[tag]) return;
        seen[tag] = true;
        found.push(tag);
      });
    });
    return found;
  }

  function pushPairCandidate(state, list, aId, bId, regionId, action, extras) {
    const pairTags = getTags(state.systems.relationships, aId, bId);
    const arc = getArc(state.systems.relationships, aId, bId);
    const warmEnough = arc &&
      (arc.stage === 'warm' || arc.stage === 'bond' ||
        arc.stage === 'mend' || arc.stage === 'strain');
    const romanticPair = hasTag(pairTags, 'lover') ||
      hasTag(pairTags, 'partner') ||
      hasTag(pairTags, 'dao-companion') ||
      (warmEnough &&
        (hasTag(pairTags, 'impressed') || hasTag(pairTags, 'life-debt')));
    const monthNow = currentAbsoluteMonth(state);
    const follow = arcFollowScore(arc, monthNow);
    list.push(Object.assign({
      kind: 'pair',
      aId: aId,
      bId: bId,
      regionId: regionId,
      action: action,
      known: isKnownToPlayer(state, aId) || isKnownToPlayer(state, bId),
      leap: !!LEAP_EVENT_TYPES[action],
      romance: !!ROMANCE_EVENT_TYPES[action] &&
        !(arc && arc.stage === 'spark' && ACQUAINTANCE_ACTIONS[action]),
      acquaintance: !!(ACQUAINTANCE_ACTIONS[action] || action === 'meet' ||
        action === 'first_sight') &&
        (!arc || arc.stage === 'spark' || action === 'meet' ||
          action === 'first_sight'),
      conflict: !!CONFLICT_EVENT_TYPES[action],
      outerExpand: !!(extras && extras.outerExpand),
      romanceConflict: !!ROMANCE_CONFLICT_TYPES[action] && romanticPair,
      arcFollow: follow >= 2,
      arcScore: follow
    }, extras || {}));
  }

  function collectRegionPairCandidates(
    state,
    regionId,
    group,
    crisis,
    random
  ) {
    const rels = state.systems.relationships;
    const records = state.systems.npcs.records;
    const monthNow = currentAbsoluteMonth(state);
    const candidatePairs = [];
    const used = {};

    function markUsed(aId, bId) {
      used[pairKey(aId, bId)] = true;
    }

    const acquaintedPool = [];
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const aId = group[i];
        const bId = group[j];
        if (!isAcquaintedPair(rels, aId, bId)) continue;
        const arc = getArc(rels, aId, bId);
        acquaintedPool.push({
          aId: aId,
          bId: bId,
          score: arcFollowScore(arc, monthNow) +
            (sameSectPair(records, aId, bId) ? 0.5 : 0) +
            random()
        });
      }
    }
    acquaintedPool.sort(function (left, right) {
      return right.score - left.score;
    });

    const continueFirst = acquaintedPool.filter(function (row) {
      return row.score >= 2;
    });
    const restAcquainted = acquaintedPool.filter(function (row) {
      return row.score < 2;
    });
    const ordered = continueFirst.concat(restAcquainted);
    const acquaintedLimit = Math.min(MONTHLY_ACQUAINTED_PAIR_CAP, ordered.length);
    for (let index = 0; index < acquaintedLimit; index++) {
      const row = ordered[index];
      if (used[pairKey(row.aId, row.bId)]) continue;
      const arc = getArc(rels, row.aId, row.bId);
      const pairResult = proposePairAction(
        state,
        row.aId,
        row.bId,
        random,
        regionId,
        {
          acquainted: true,
          arcStage: arc && arc.stage
        }
      );
      markUsed(row.aId, row.bId);
      pushPairCandidate(
        state,
        candidatePairs,
        row.aId,
        row.bId,
        regionId,
        pairResult.action,
        {
          giftItem: pairResult.giftItem,
          thirdPartyId: pairResult.thirdPartyId,
          romanceBeatForced: pairResult.romanceBeatForced
        }
      );
    }

    let strangerOpened = 0;
    // 区域内尚无熟人时，先强制开一条线，避免世界见闻枯死。
    if (acquaintedPool.length === 0 && group.length >= 2) {
      const aId = group[0];
      const bId = group[1];
      if (aId && bId && aId !== bId && !used[pairKey(aId, bId)] &&
          canOpenNewArc(rels, aId, bId)) {
        const pairResult = proposePairAction(
          state,
          aId,
          bId,
          random,
          regionId,
          { stranger: true }
        );
        markUsed(aId, bId);
        strangerOpened += 1;
        // 讲了才算：结识也进候选，落地见闻时才改关系。
        pushPairCandidate(
          state,
          candidatePairs,
          aId,
          bId,
          regionId,
          pairResult.action,
          {
            strangerOpen: true,
            giftItem: pairResult.giftItem,
            thirdPartyId: pairResult.thirdPartyId,
            romanceBeatForced: pairResult.romanceBeatForced
          }
        );
      }
    }
    const strangerTries = Math.min(group.length * 2, 12);
    for (let tryIndex = 0; tryIndex < strangerTries; tryIndex++) {
      if (strangerOpened >= MONTHLY_STRANGER_OPEN_CAP) break;
      if (group.length < 2) break;
      const aId = group[Math.floor(random() * group.length) % group.length];
      const bId = group[Math.floor(random() * group.length) % group.length];
      if (!aId || !bId || aId === bId) continue;
      if (used[pairKey(aId, bId)]) continue;
      if (isAcquaintedPair(rels, aId, bId)) continue;
      if (!canOpenNewArc(rels, aId, bId)) continue;
      const chance = sameSectPair(records, aId, bId)
        ? STRANGER_OPEN_SAME_SECT
        : STRANGER_OPEN_CHANCE;
      if (random() > chance) continue;
      const pairResult = proposePairAction(
        state,
        aId,
        bId,
        random,
        regionId,
        { stranger: true }
      );
      markUsed(aId, bId);
      strangerOpened += 1;
      pushPairCandidate(
        state,
        candidatePairs,
        aId,
        bId,
        regionId,
        pairResult.action,
        {
          strangerOpen: true,
          giftItem: pairResult.giftItem,
          thirdPartyId: pairResult.thirdPartyId,
          romanceBeatForced: pairResult.romanceBeatForced
        }
      );
    }

    for (let cIndex = 0; cIndex < crisis.length; cIndex++) {
      const victimId = crisis[cIndex];
      const rescuerId = randomOf(group, random);
      if (!rescuerId || rescuerId === victimId) continue;
      const tags = getTags(rels, rescuerId, victimId);
      if (hasTag(tags, 'enemy')) continue;
      if (!isAcquaintedPair(rels, rescuerId, victimId) &&
          !canOpenNewArc(rels, rescuerId, victimId)) {
        continue;
      }
      const pairResult = proposePairAction(
        state,
        rescuerId,
        victimId,
        random,
        regionId,
        {
          forceRescue: true,
          stranger: !isAcquaintedPair(rels, rescuerId, victimId)
        }
      );
      markUsed(rescuerId, victimId);
      pushPairCandidate(
        state,
        candidatePairs,
        rescuerId,
        victimId,
        regionId,
        pairResult.action,
        {
          leap: true,
          romance: true,
          conflict: false,
          romanceConflict: false,
          giftItem: pairResult.giftItem,
          thirdPartyId: pairResult.thirdPartyId,
          romanceBeatForced: pairResult.romanceBeatForced
        }
      );
    }

    // 圈外扩：你认识的人去结识「圈子外」的人（同城已有，或按 creatpersonfr 新造）。
    // 新人先进对方 frs，尚未进玩家 getpe；日后可经「友人的友人」被你认识。
    appendOuterCircleMeets(
      state,
      regionId,
      group,
      candidatePairs,
      used,
      markUsed,
      random
    );

    return candidatePairs;
  }

  function appendOuterCircleMeets(
    state,
    regionId,
    group,
    candidatePairs,
    used,
    markUsed,
    random
  ) {
    if (!group || !group.length) return;
    const records = state.systems.npcs.records;
    const rels = state.systems.relationships;
    const circleSet = {};
    group.forEach(function (id) { circleSet[id] = true; });

    function livingOuterId(id) {
      if (!id || id === 'player' || circleSet[id]) return false;
      const person = records[id];
      if (!person || person.status !== 'living') return false;
      if (person.lifeStage === 'child') return false;
      if ((person.regionId || 'qinglan-town') !== regionId) return false;
      if (blocksWorldSocial(activityStatus(person))) return false;
      if (person.metPlayer === true) return false;
      return true;
    }

    const existingOuters = Object.keys(records).filter(livingOuterId);
    let opened = 0;
    const hostOrder = group.slice();
    for (let i = hostOrder.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1)) % (i + 1);
      const tmp = hostOrder[i];
      hostOrder[i] = hostOrder[j];
      hostOrder[j] = tmp;
    }

    for (let h = 0; h < hostOrder.length; h++) {
      if (opened >= MONTHLY_OUTER_MEET_CAP) break;
      if (random() > OUTER_MEET_CHANCE) continue;
      const hostId = hostOrder[h];
      if (!hostId || !PersonGraph.cans(state, hostId)) continue;

      let peerId = null;
      const freeOuters = existingOuters.filter(function (id) {
        if (used[pairKey(hostId, id)]) return false;
        if (isAcquaintedPair(rels, hostId, id)) return false;
        if (!canOpenNewArc(rels, hostId, id)) return false;
        return true;
      });
      if (freeOuters.length) {
        peerId = freeOuters[Math.floor(random() * freeOuters.length)];
      } else if (PersonFactory &&
          typeof PersonFactory.createPerson === 'function' &&
          random() < 0.55) {
        const activeTarget = Math.max(
          12,
          Math.floor(Number(state.systems.npcs.activeTarget) || 40)
        );
        const liveCount = Object.keys(records).filter(function (id) {
          const person = records[id];
          return person && person.status === 'living';
        }).length;
        // 人口压力大时不再为扩圈硬造人，优先等地图上已有陌生人。
        if (liveCount < activeTarget * 2) {
          const created = PersonFactory.createPerson(state, {
            regionId: regionId,
            metPlayer: false,
            ageYears: 18 + Math.floor(random() * 21),
            acquaintance: true
          });
          if (created && created.id) {
            peerId = created.id;
            created.metPlayer = false;
          }
        }
      }
      if (!peerId || peerId === hostId) continue;
      if (used[pairKey(hostId, peerId)]) continue;

      const pairResult = proposePairAction(
        state,
        hostId,
        peerId,
        random,
        regionId,
        { stranger: true }
      );
      markUsed(hostId, peerId);
      opened += 1;
      // 讲了才算：圈外结识也进候选，落地后才写 frs / 相识。
      pushPairCandidate(
        state,
        candidatePairs,
        hostId,
        peerId,
        regionId,
        pairResult.action,
        {
          strangerOpen: true,
          outerExpand: true,
          giftItem: pairResult.giftItem,
          thirdPartyId: pairResult.thirdPartyId,
          romanceBeatForced: pairResult.romanceBeatForced
        }
      );
    }
  }

  function resolvePerson(state, id) {
    if (!id) return null;
    if (id === 'player') {
      const player = state && state.player;
      if (!player || typeof player !== 'object') return null;
      if (!player.id) player.id = 'player';
      return player;
    }
    const records = state && state.systems && state.systems.npcs &&
      state.systems.npcs.records;
    return records && records[id] ? records[id] : null;
  }

  function applyStructuralEventEffects(state, pick, a, b, ctx, random) {
    if (!Number.isFinite(pick.eventId) || !a) return;
    const eid = pick.eventId | 0;
    const cal = state && state.systems && state.systems.world
      ? ensureCalendar(state.systems.world)
      : null;
    const monthNow = cal ? absoluteMonth(cal) : 0;

    // 获物/生日礼物：只做文案表现，NPC 不建背包、不碰 player.inventory。
    if (eid === 81 && NpcSpiritPets &&
        typeof NpcSpiritPets.hatchPet === 'function') {
      if (NpcSpiritPets.canHatch && !NpcSpiritPets.canHatch(a)) return;
      const pet = NpcSpiritPets.hatchPet(a, {
        random: random,
        bondedAtMonth: monthNow,
        youngName: ctx.petYoungName || null
      });
      if (pet) {
        ctx.petYoungName = pet.youngName;
        pick.structuralApplied = true;
      }
      return;
    }
    if (eid === 83 && NpcSpiritPets &&
        typeof NpcSpiritPets.formPet === 'function') {
      if (NpcSpiritPets.canForm && !NpcSpiritPets.canForm(a)) return;
      const pet = NpcSpiritPets.formPet(a, {
        random: random,
        bondedAtMonth: monthNow,
        formName: ctx.petFormName || null
      });
      if (pet) {
        ctx.petFormName = pet.formName;
        ctx.petYoungName = pet.youngName;
        pick.structuralApplied = true;
      }
      return;
    }
    if (eid === 212 && SectOffices &&
        typeof SectOffices.promoteSuccessor === 'function') {
      const result = SectOffices.promoteSuccessor(
        state,
        a.id,
        b ? b.id : null
      );
      if (result && result.ok) {
        ctx.officeTitle = result.title;
        pick.structuralApplied = true;
      }
      return;
    }
    if (eid === 459 && PersonFactory &&
        typeof PersonFactory.createChild === 'function') {
      if (!ctx.babyName) {
        const pool = [
          '清衡', '和珩', '月宁', '安真', '青雪', '星予',
          '华辰', '渊昭', '灵犀', '景行', '望舒', '承影'
        ];
        const roll = typeof random === 'function' ? random() : Math.random();
        ctx.babyName = pool[Math.floor(roll * pool.length) % pool.length];
      }
      const child = PersonFactory.createChild(
        state,
        a.id,
        b ? b.id : null,
        {
          name: ctx.babyName,
          regionId: pick.regionId || a.regionId
        }
      );
      if (child && child.identity && child.identity.name) {
        ctx.babyName = child.identity.name;
        pick.childId = child.id;
        pick.structuralApplied = true;
      }
      return;
    }
    // 飞升离凡：仅当已达飞升境（与 attemptBreakthrough 后 resolveAscensionDeparture 同门槛）。
    // 禁止 force：练气等低境绝不能因文案事件被标 ascended。
    // 213/516/574；573 压制留凡、525 旁观 —— 不在此处理。
    if ((eid === 213 || eid === 516 || eid === 574) &&
        a.id !== 'player') {
      const sim = NpcSimulation ||
        (typeof globalThis !== 'undefined' && globalThis.NpcSimulation) ||
        null;
      const need = (sim && Number.isFinite(sim.ASCENSION_REALM_STAGE))
        ? sim.ASCENSION_REALM_STAGE
        : 16;
      if (Math.floor(Number(a.realmStage) || 0) < need) {
        return;
      }
      if (sim && typeof sim.resolveAscensionDeparture === 'function') {
        const ok = sim.resolveAscensionDeparture(state, a.id);
        if (ok) pick.structuralApplied = true;
      }
    }
  }

  const ASCEND_EVENT_IDS = Object.freeze({ 213: true, 516: true, 574: true });
  const STRUCTURAL_EVENT_IDS = Object.freeze({
    81: true,
    83: true,
    212: true,
    459: true,
    213: true,
    516: true,
    574: true
  });

  function isAscendEventId(eventId) {
    return !!(ASCEND_EVENT_IDS[eventId | 0]);
  }

  function isStructuralEventId(eventId) {
    return !!(STRUCTURAL_EVENT_IDS[eventId | 0]);
  }

  function personCanAscendByRealm(person) {
    if (!person || person.status !== 'living') return false;
    const sim = NpcSimulation ||
      (typeof globalThis !== 'undefined' && globalThis.NpcSimulation) ||
      null;
    const need = (sim && Number.isFinite(sim.ASCENSION_REALM_STAGE))
      ? sim.ASCENSION_REALM_STAGE
      : 16;
    return Math.floor(Number(person.realmStage) || 0) >= need;
  }

  function personSpiritPet(person) {
    if (NpcSpiritPets && typeof NpcSpiritPets.normalizePet === 'function') {
      return NpcSpiritPets.normalizePet(person && person.spiritPet);
    }
    return person && person.spiritPet ? person.spiritPet : null;
  }

  // 结构性事件资格：不满足则改抽，避免「无宠化形」「重复化形」等假叙事。
  // 玩家契约灵宠专属（82/85/86/89/90/91）：原版对「你」，禁止 NPC 世界见闻落地。
  function isEventEligible(state, eventId, a, b) {
    const eid = eventId | 0;
    if (!a) return false;
    if (eid === 82 || eid === 85 || eid === 86 ||
        eid === 89 || eid === 90 || eid === 91) {
      return false;
    }
    if (eid === 81) {
      if (NpcSpiritPets && typeof NpcSpiritPets.canHatch === 'function') {
        return NpcSpiritPets.canHatch(a);
      }
      return !personSpiritPet(a);
    }
    if (eid === 83) {
      if (NpcSpiritPets && typeof NpcSpiritPets.canForm === 'function') {
        return NpcSpiritPets.canForm(a);
      }
      const pet = personSpiritPet(a);
      return !!(pet && pet.stage === 'young');
    }
    if (eid === 212) {
      if (!b || b.status !== 'living') return false;
      const sectId = a.sectId || b.sectId;
      return !!(sectId && typeof sectId === 'string');
    }
    if (eid === 459) {
      // 产子需要道侣/配对对象；单人不可凭空生子。
      return !!(b && b.status === 'living');
    }
    if (isAscendEventId(eid)) {
      return personCanAscendByRealm(a);
    }
    return true;
  }

  function rematchEligibleEventId(action, random, bannedId, state, a, b) {
    if (!OriginalEventBindings ||
        typeof OriginalEventBindings.pickEventId !== 'function') {
      return null;
    }
    for (let i = 0; i < 16; i++) {
      const id = OriginalEventBindings.pickEventId(action || 'character_beat', random);
      if (id == null || id === bannedId) continue;
      if (!isEventEligible(state, id, a, b)) continue;
      return id;
    }
    return null;
  }

  // 低境抽到「成功飞升」文案时改抽其它见闻，避免练气飞升的假叙事。
  function rematchNonAscendEventId(action, random, bannedId) {
    if (!OriginalEventBindings ||
        typeof OriginalEventBindings.pickEventId !== 'function') {
      return null;
    }
    for (let i = 0; i < 12; i++) {
      const id = OriginalEventBindings.pickEventId(action || 'character_beat', random);
      if (id == null || id === bannedId) continue;
      if (isAscendEventId(id)) continue;
      return id;
    }
    return null;
  }

  function narrativeCanFill(eventId, aLabel, bLabel, giftItem, extraNames, random, playerLabel) {
    if (!WorldNarrativeFill ||
        typeof WorldNarrativeFill.fillOriginalEventNarrative !== 'function') {
      return true;
    }
    const text = WorldNarrativeFill.fillOriginalEventNarrative(
      eventId,
      aLabel,
      bLabel,
      giftItem || null,
      extraNames || null,
      random,
      {},
      null,
      playerLabel || null
    );
    return !!(text && String(text).trim());
  }

  // 先锁定可填文案、且资格成立的 eventId，再落结构性效果，避免「先改状态再改抽 ID」。
  function resolvePlayableEventId(state, pick, a, b, aLabel, bLabel, ctx, random) {
    if (!Number.isFinite(pick.eventId)) return pick.eventId;
    let eventId = pick.eventId | 0;
    if (OriginalEventBindings &&
        typeof OriginalEventBindings.resolveConsentEventId === 'function') {
      const resolved = OriginalEventBindings.resolveConsentEventId(eventId);
      if (resolved == null) return null;
      eventId = resolved | 0;
    }
    const tried = {};
    for (let attempt = 0; attempt < 16; attempt++) {
      if (tried[eventId]) break;
      tried[eventId] = true;
      if (!isEventEligible(state, eventId, a, b)) {
        const alt = rematchEligibleEventId(
          pick.action, random, eventId, state, a, b
        );
        if (alt == null) return null;
        eventId = alt | 0;
        continue;
      }
      if (!narrativeCanFill(
        eventId,
        aLabel,
        bLabel,
        ctx && ctx.giftItem,
        ctx && ctx.extraNameLabels,
        random,
        ctx && ctx.playerLabel
      )) {
        const altFill = rematchEligibleEventId(
          pick.action, random, eventId, state, a, b
        );
        if (altFill == null) return null;
        eventId = altFill | 0;
        continue;
      }
      return eventId;
    }
    return isEventEligible(state, eventId, a, b) ? eventId : null;
  }

  function doevent(state, pick, random) {
    const world = state && state.systems && state.systems.world;
    const cal = ensureCalendar(world);
    const rels = state.systems.relationships;
    const a = resolvePerson(state, pick.aId);
    const b = pick.bId ? resolvePerson(state, pick.bId) : null;
    const third = pick.thirdPartyId
      ? resolvePerson(state, pick.thirdPartyId)
      : null;
    if (!a) return null;
    if (!Number.isFinite(pick.eventId)) return null;
    if (isAscendEventId(pick.eventId) &&
        !personCanAscendByRealm(a)) {
      const alt = rematchNonAscendEventId(pick.action, random, pick.eventId);
      if (alt == null) return null;
      pick.eventId = alt;
    }
    const monthNow = absoluteMonth(cal);
    // 熟人即时可见，陌生人最多延迟 1 月（对标原版传闻延迟）。
    const delay = pick.known ? 0 : (random() < 0.55 ? 0 : 1);
    const ctx = pick.kind === 'solo'
      ? {
        a: a,
        b: null,
        affinity: pick.action === 'character_beat'
          ? getAffinity(rels, pick.aId, 'player')
          : 0,
        tags: pick.action === 'character_beat'
          ? tagsForSoloBeat(state, pick.aId)
          : [],
        regionId: pick.regionId,
        regionType: (function () {
          const region = RegionContent &&
            typeof RegionContent.get === 'function'
            ? RegionContent.get(pick.regionId)
            : null;
          return region && region.type ? region.type : null;
        })()
      }
      : pairContext(state, pick.aId, pick.bId, pick.regionId);
    if (pick.giftItem) ctx.giftItem = pick.giftItem;
    if (third) ctx.thirdPartyLabel = personPlainLabel(third);
    if (third) {
      ctx.extraNameLabels = [personPlainLabel(third)];
    }
    ctx.playerLabel = typeof playerNarrativeLabel === 'function'
      ? playerNarrativeLabel(state)
      : null;
    const aLabel = personPlainLabel(a);
    const bLabel = b ? personPlainLabel(b) : null;
    const playable = resolvePlayableEventId(
      state, pick, a, b, aLabel, bLabel, ctx, random
    );
    if (playable == null) return null;
    pick.eventId = playable;
    ctx.eventId = playable;
    ctx.useOriginalText = true;
    pick.useOriginalText = true;
    // 已锁定可播放 ID：配方拼句失败时禁止再改抽到别的结构性事件。
    ctx.lockEventId = true;
    // 升职/产子/灵宠：先改状态再拼文案，保证插槽与存档一致。
    applyStructuralEventEffects(state, pick, a, b, ctx, random);
    const participants = pick.bId
      ? (pick.thirdPartyId
        ? [pick.aId, pick.bId, pick.thirdPartyId]
        : [pick.aId, pick.bId])
      : [pick.aId];
    if (pick.childId) participants.push(pick.childId);
    // P3：把候选的布尔标志 + 关系标签映射成规范大类 + tags（对标原版 List<string[]> 描述符）。
    const classified = EventCore && EventCore.classifyEvent
      ? EventCore.classifyEvent(pick)
      : { category: null, tags: [] };
    const narrative = fillNarrative(
      pick.action,
      aLabel,
      bLabel,
      regionName(pick.regionId),
      ctx,
      random
    );
    if (!narrative) return null;
    // 讲了才算：双人关系效果跟见闻一起落地。
    if (pick.kind === 'pair' && pick.bId && pick.action) {
      applyPairSocialEffects(state, pick.aId, pick.bId, pick.action, pick.regionId, {
        thirdPartyId: pick.thirdPartyId || null,
        random: random,
        chronicled: true
      });
    }
    // fillNarrative 可能因配方失败改抽了别的 eventId（仅非 lock 时）。
    if (Number.isFinite(ctx.eventId)) pick.eventId = ctx.eventId;
    // 若文案改抽到其它结构性 ID，禁止带着旧状态硬发（应在 resolve 阶段已避免）。
    if (Number.isFinite(pick.eventId) &&
        isStructuralEventId(pick.eventId) &&
        !pick.structuralApplied &&
        (pick.eventId === 81 || pick.eventId === 83 ||
          pick.eventId === 212 || pick.eventId === 459 ||
          isAscendEventId(pick.eventId))) {
      // 资格已过但仍未写入：补一次（例如 83 已有幼宠）。
      applyStructuralEventEffects(state, pick, a, b, ctx, random);
    }
    const event = appendWorldEvent(state, {
      type: pick.action,
      participants: participants,
      location: pick.regionId,
      narrative: narrative,
      source: 'world',
      visibleFromMonth: monthNow + delay,
      category: classified.category,
      tags: classified.tags,
      eventId: Number.isFinite(pick.eventId) ? pick.eventId : null
    });
    if (pick.kind === 'pair' && pick.bId) {
      markArcChronicled(rels, pick.aId, pick.bId, monthNow);
    }
    markAppear(cal, pick.aId);
    if (pick.bId) markAppear(cal, pick.bId);
    cal.yearEventsCreated += 1;
    cal.monthEventsCreated += 1;
    // 执行时才扣当日配额（离散 Pass：事件真正发生才耗名额）。
    PersonGraph.markActed(state, pick.aId);
    if (pick.bId) PersonGraph.markActed(state, pick.bId);
    // 7A：玩家参与则扣 act4day。
    if (pick.aId === 'player' || pick.bId === 'player' ||
        pick.thirdPartyId === 'player') {
      PersonGraph.markActed(state, 'player');
    }
    // 3C：原版文案附带的轻量效果（重伤/道侣标签/突破倾向等）。
    applyOriginalEventEffects(state, pick, a, b, rels);
    // 对标 person.history：参与者各记一条轻量履历 [eventId|0, month, peerId…]
    appendPersonHistory(a, event, pick.bId || null, monthNow);
    if (b) appendPersonHistory(b, event, pick.aId, monthNow);
    return event;
  }

  function applyBreakthroughDelta(person, delta) {
    if (!person || !Number.isFinite(delta) || !delta) return;
    // 对标文案百分比：直接加到 attemptBreakthrough 的 rate；罕见 +100% 封顶 0.5
    const amt = Math.max(-0.5, Math.min(0.5, delta));
    person.breakthroughBias = Math.max(
      -0.5,
      Math.min(0.5, (Number(person.breakthroughBias) || 0) + amt)
    );
  }

  function upgradeSpiritualRoot(person) {
    if (!person || person.status === 'dead') return false;
    const roots = NpcGenerationContent &&
      Array.isArray(NpcGenerationContent.SPIRITUAL_ROOTS)
      ? NpcGenerationContent.SPIRITUAL_ROOTS.slice()
      : [];
    if (!roots.length) return false;
    // lgIndex 越小越优（0=变异天灵根 … 7=杂灵根）
    roots.sort(function (a, b) {
      return (Number(a.lgIndex) || 0) - (Number(b.lgIndex) || 0);
    });
    const curId = person.spiritualRootId || 'single';
    let curIndex = roots.length - 1;
    for (let i = 0; i < roots.length; i++) {
      if (roots[i].id === curId) {
        curIndex = i;
        break;
      }
    }
    if (curIndex <= 0) return false;
    const next = roots[curIndex - 1];
    if (!next || !next.id) return false;
    person.spiritualRootId = next.id;
    if (DnsConfig && typeof DnsConfig.syncLevelAliases === 'function') {
      DnsConfig.syncLevelAliases(person);
    }
    // 灵根变了要重算修炼效率（有 Dns.getexps 时由 simulation 侧再刷也行）
    if (NpcGenerationContent &&
        typeof NpcGenerationContent.cultivationEfficiencyFor === 'function') {
      person.cultivationEfficiency = Math.round(
        NpcGenerationContent.cultivationEfficiencyFor(
          person.realmStage,
          person.spiritualRootId,
          0.5
        ) * 10000
      ) / 10000;
    }
    return true;
  }

  function applyOriginalEventEffects(state, pick, a, b, rels) {
    if (!OriginalEventBindings ||
        typeof OriginalEventBindings.effectFor !== 'function') {
      return;
    }
    if (!Number.isFinite(pick.eventId)) return;
    const eff = OriginalEventBindings.effectFor(pick.eventId);
    if (!eff) return;
    const conflictish = pick.conflict || pick.romanceConflict ||
      pick.action === 'duel' || pick.action === 'rival' ||
      pick.action === 'quarrel';
    if (eff.status === 'injured' && a && a.status === 'living') {
      a.activityStatus = 'injured';
    }
    // 死亡效果过重：仅冲突类动作才落地，且不直接抹除玩家。
    if (eff.status === 'dead' && conflictish && a && a.id !== 'player' &&
        a.status === 'living') {
      a.status = 'dead';
      a.activityStatus = 'normal';
    }
    if (eff.tag && rels && a && b) {
      const tags = getTags(rels, a.id, b.id);
      setTags(rels, a.id, b.id, withTag(tags, eff.tag));
    }
    if (eff.untag && rels && a && b) {
      const tags = getTags(rels, a.id, b.id);
      setTags(rels, a.id, b.id, withoutTags(tags, [eff.untag]));
    }
    // P0：优先用文案百分比；无百分比时再回落 ±0.05
    if (Number.isFinite(eff.breakthrough_delta) && a) {
      applyBreakthroughDelta(a, Number(eff.breakthrough_delta));
    } else if (eff.buff === 'breakthrough_up' && a) {
      applyBreakthroughDelta(a, 0.05);
    } else if (eff.buff === 'breakthrough_down' && a) {
      applyBreakthroughDelta(a, -0.05);
    }
    if (eff.buff === 'tribulation_down' && a) {
      a.tribulationDeathBias = Math.max(
        -0.2,
        (Number(a.tribulationDeathBias) || 0) - 0.05
      );
    }
    if (eff.wash_root && a) {
      upgradeSpiritualRoot(a);
    }
    // 关系账本分层：
    //   NPC↔NPC → 只改单维好感（npcAffinities）
    //   玩家↔NPC → 只改 8 维 edge（比原版更深）
    if (rels && a && b) {
      const withPlayer = a.id === 'player' || b.id === 'player';
      const at = Number(state && state.systems && state.systems.world &&
        state.systems.world.calendar &&
        state.systems.world.calendar.elapsedSeconds) || 0;
      if (!withPlayer) {
        // 爱意类文案在 NPC 之间也折算进好感；独占/欲望不单独建维。
        const feelAmt = (Number(eff.feel) || 0) + (Number(eff.love) || 0);
        if (feelAmt) {
          setAffinity(
            rels,
            a.id,
            b.id,
            getAffinity(rels, a.id, b.id) + feelAmt
          );
          setAffinity(
            rels,
            b.id,
            a.id,
            getAffinity(rels, b.id, a.id) + Math.round(feelAmt * 0.5)
          );
        }
      } else {
        const deltas = {};
        if (Number.isFinite(eff.feel) && eff.feel) {
          deltas.affection = Math.round(eff.feel);
        }
        if (Number.isFinite(eff.love) && eff.love) {
          deltas.romanticAttachment = Math.round(eff.love);
        }
        if (Number.isFinite(eff.lust) && eff.lust) {
          deltas.jealousy = Math.round(eff.lust);
        }
        if (Number.isFinite(eff.desire) && eff.desire) {
          deltas.desire = Math.round(eff.desire);
        }
        if (Object.keys(deltas).length) {
          bumpEdgeMetrics(rels, a.id, b.id, deltas, at);
          const reverse = {};
          Object.keys(deltas).forEach(function (key) {
            reverse[key] = Math.round(deltas[key] * 0.5);
          });
          bumpEdgeMetrics(rels, b.id, a.id, reverse, at);
        }
      }
    }
    if (eff.sublevel && a && a.id !== 'player' && a.status === 'living') {
      const drop = Math.max(1, Math.floor(Number(eff.sublevel) || 1));
      a.realmStage = Math.max(0, Math.floor(Number(a.realmStage) || 0) - drop);
      a.cultivation = 0;
      if (DnsConfig && typeof DnsConfig.syncLevelAliases === 'function') {
        DnsConfig.syncLevelAliases(a);
      }
    }
    if (eff.restore_qi && a) {
      a.activityStatus = a.activityStatus === 'injured'
        ? 'injured'
        : 'normal';
      a.cultivation = Math.max(
        Number(a.cultivation) || 0,
        Math.floor((Number(a.cultivation) || 0) +
          Math.max(1, Math.floor((Number(a.efficiency) || 1) * 30)))
      );
    }
  }

  function appendPersonHistory(person, event, peerId, monthNow) {
    if (!person || !event) return;
    if (!Array.isArray(person.history)) person.history = [];
    const row = [
      Number.isFinite(event.eventId) ? event.eventId : 0,
      monthNow | 0
    ];
    if (peerId) row.push(peerId);
    if (typeof event.type === 'string') row.push(event.type);
    person.history.push(row);
    if (person.history.length > 80) {
      person.history = person.history.slice(person.history.length - 80);
    }
  }


  return Object.freeze({
    OPEN_LINE_ACTIONS: OPEN_LINE_ACTIONS,
    IMPACT_ACTIONS: IMPACT_ACTIONS,
    LEAP_EVENT_TYPES: LEAP_EVENT_TYPES,
    ROMANCE_EVENT_TYPES: ROMANCE_EVENT_TYPES,
    CONFLICT_EVENT_TYPES: CONFLICT_EVENT_TYPES,
    ROMANCE_CONFLICT_TYPES: ROMANCE_CONFLICT_TYPES,
    bindActivityHelpers: bindActivityHelpers,
    canAppear: canAppear,
    markAppear: markAppear,
    pickAction: pickAction,
    actionAffinityDelta: actionAffinityDelta,
    pairContext: pairContext,
    proposePairAction: proposePairAction,
    applyPairSocialEffects: applyPairSocialEffects,
    applySilentPair: applySilentPair,
    pickThirdPartyId: pickThirdPartyId,
    randomlevelCount: randomlevelCount,
    rollYearBudget: rollYearBudget,
    tagsForSoloBeat: tagsForSoloBeat,
    pushPairCandidate: pushPairCandidate,
    collectRegionPairCandidates: collectRegionPairCandidates,
    appendOuterCircleMeets: appendOuterCircleMeets,
    resolvePerson: resolvePerson,
    doevent: doevent,
    applyOriginalEventEffects: applyOriginalEventEffects,
    appendPersonHistory: appendPersonHistory
  });
});
