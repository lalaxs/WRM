(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/life-skills.js'),
      require('../content/lifecycle.js'),
      require('./lineage.js'),
      require('./npc-roster.js'),
      require('./stage4-state.js')
    )
    : factory(
      root && root.LifeSkillContent,
      root && root.LifecycleContent,
      root && root.Lineage,
      root && root.NpcRoster,
      root && root.Stage4State
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.LegacyTransition = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  LifeSkillContent,
  LifecycleContent,
  Lineage,
  NpcRoster,
  Stage4State
) {
  'use strict';

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

  function result(ok, code, state, value) {
    return { ok: ok, code: code, state: state, value: value || null };
  }

  function fail(model, code) {
    return result(false, code, clone(model) || model, null);
  }

  function lineage(model) {
    return model && model.systems && model.systems.lineage;
  }

  function begin(model, cause, nowSeconds) {
    if (!['lifespan', 'voluntary', 'ascension'].includes(cause)) {
      return fail(model, 'invalid_cause');
    }
    const next = clone(model);
    const records = lineage(next);
    if (!next || !records) return fail(model, 'invalid_state');
    if (records.pendingTransition) {
      return result(true, 'already_pending', next, records.pendingTransition);
    }
    if (cause === 'lifespan' &&
        (!next.player.lifecycle ||
         next.player.lifecycle.status !== 'safety_buffer')) {
      return fail(model, 'lifespan_not_ready');
    }
    const number = Math.max(
      1,
      Number(records.nextTransitionId) || 1
    );
    records.nextTransitionId = number + 1;
    // 没有可继承成年后代时，默认进入「创建新身份」，避免开局无后代卡在选路线空态
    const hasHeir = Lineage &&
      typeof Lineage.adultHeirs === 'function' &&
      Lineage.adultHeirs(next).length > 0;
    const defaultName = next.player && typeof next.player.name === 'string'
      ? String(next.player.name).trim().slice(0, 12)
      : '';
    records.pendingTransition = {
      id: 'transition-' + number,
      cause: cause,
      route: hasHeir ? null : 'newIdentity',
      heirNpcId: null,
      draft: {
        name: hasHeir ? '' : defaultName,
        originId: 'wanderingReborn',
        personalityId: 'steady',
        talentId: 'plainSpirit',
        appearance: clone(next.appearance)
      },
      createdAt: Math.max(0, Number(nowSeconds) || 0)
    };
    next.player.lifecycle.status = 'transition_pending';
    next.player.lifecycle.pendingCause = cause;
    return result(true, 'ok', next, records.pendingTransition);
  }

  function chooseRoute(model, route, heirNpcId) {
    const next = clone(model);
    const records = lineage(next);
    const pending = records && records.pendingTransition;
    if (!pending) return fail(model, 'no_pending_transition');
    if (route === 'descendant') {
      if (!Lineage.adultHeirs(next).includes(heirNpcId)) {
        return fail(model, 'invalid_heir');
      }
      pending.route = route;
      pending.heirNpcId = heirNpcId;
    } else if (route === 'newIdentity') {
      pending.route = route;
      pending.heirNpcId = null;
    } else {
      return fail(model, 'invalid_route');
    }
    return result(true, 'ok', next, pending);
  }

  function updateDraft(model, input) {
    const next = clone(model);
    const records = lineage(next);
    const pending = records && records.pendingTransition;
    if (!pending || pending.route !== 'newIdentity') {
      return fail(model, 'new_identity_not_selected');
    }
    if (!input || typeof input !== 'object') return fail(model, 'invalid_draft');
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 12) return fail(model, 'invalid_name');
    const originIds = LifecycleContent.NEW_IDENTITY_ORIGINS.map(function (row) {
      return row.id;
    });
    pending.draft.name = name;
    pending.draft.originId = originIds.includes(input.originId)
      ? input.originId
      : 'wanderingReborn';
    pending.draft.personalityId =
      typeof input.personalityId === 'string' && input.personalityId
        ? input.personalityId
        : 'steady';
    pending.draft.talentId =
      typeof input.talentId === 'string' && input.talentId
        ? input.talentId
        : 'plainSpirit';
    if (input.appearance && typeof input.appearance === 'object') {
      pending.draft.appearance = clone(input.appearance);
    }
    return result(true, 'ok', next, pending.draft);
  }

  function playerRelationshipArchive(model) {
    const relationships = model.systems && model.systems.relationships;
    const archive = { edges: {}, bonds: {} };
    if (!relationships) return archive;
    Object.keys(relationships.edges || {}).forEach(function (key) {
      if (key.indexOf('player>') === 0 ||
          key.slice(-7) === '>player') {
        archive.edges[key] = clone(relationships.edges[key]);
      }
    });
    Object.keys(relationships.bonds || {}).forEach(function (key) {
      if (key.split('|').includes('player')) {
        archive.bonds[key] = clone(relationships.bonds[key]);
      }
    });
    return archive;
  }

  function clearPlayerRelationships(model) {
    const relationships = model.systems.relationships;
    Object.keys(relationships.edges).forEach(function (key) {
      if (key.indexOf('player>') === 0 ||
          key.slice(-7) === '>player') delete relationships.edges[key];
    });
    Object.keys(relationships.bonds).forEach(function (key) {
      if (key.split('|').includes('player')) delete relationships.bonds[key];
    });
  }

  // 新人生开局：清空上一世大事记/世界见闻，避免旧文案混进新档。
  function clearPreviousLifeChronicle(model) {
    const world = model && model.systems && model.systems.world;
    if (!world) return;
    world.worldEvents = [];
    world.nextWorldEventId = 1;
    if (!world.calendar || typeof world.calendar !== 'object') return;
    world.calendar.yearEventsCreated = 0;
    world.calendar.monthEventsCreated = 0;
    world.calendar.npcYearAppearances = {};
    world.calendar.playerLeapLastMonth = {};
  }

  function exactSkills(player) {
    const copy = {};
    Object.keys(LifeSkillContent.SKILLS).forEach(function (skillId) {
      copy[skillId] = clone(player.skills && player.skills[skillId]) ||
        { level: 1, xp: 0 };
    });
    return copy;
  }

  function confirm(model, nowSeconds) {
    const next = clone(model);
    const records = lineage(next);
    const pending = records && records.pendingTransition;
    if (!pending || !pending.route) return fail(model, 'route_required');
    const oldLife = next.player.lifecycle;
    const oldSkills = exactSkills(next.player);
    const oldRealmStage = Math.max(0, Number(next.player.realmStage) || 0);
    const archive = playerRelationshipArchive(next);
    let sourceNpcId = null;
    let source = 'newIdentity';
    let nextRealmStage = 0;

    if (pending.route === 'descendant') {
      const heirs = Lineage.adultHeirs(next);
      if (!heirs.includes(pending.heirNpcId)) return fail(model, 'invalid_heir');
      const heir = next.systems.npcs.records[pending.heirNpcId];
      sourceNpcId = heir.id;
      source = 'descendant';
      nextRealmStage = Math.min(
        oldRealmStage,
        Math.max(0, Number(heir.realmStage) || 0)
      );
      next.player.name = heir.identity.name;
      next.player.identity = {
        gender: 'female',
        originId: 'descendant',
        personalityId: heir.personalityId,
        talentIds: [heir.talentId]
      };
      if (heir.identity && heir.identity.appearance) {
        next.appearance = clone(heir.identity.appearance);
      }
      // 新世界整池刷新，不把继承人残留为 playerIdentity 旧 NPC。
    } else {
      if (!pending.draft || !pending.draft.name) {
        return fail(model, 'draft_required');
      }
      next.player.name = pending.draft.name;
      next.player.identity = {
        gender: 'female',
        originId: pending.draft.originId,
        personalityId: pending.draft.personalityId,
        talentIds: [pending.draft.talentId]
      };
      if (pending.draft.appearance) {
        next.appearance = clone(pending.draft.appearance);
      }
    }

    const endedAt = Math.max(0, Number(nowSeconds) || 0);
    const newLifeId = 'life-' + Math.max(2, Number(records.nextLifeId) || 2);
    records.nextLifeId = Math.max(2, Number(records.nextLifeId) || 2) + 1;
    records.lives.push({
      id: oldLife.currentLifeId,
      generation: oldLife.generation,
      source: oldLife.source,
      sourceNpcId: oldLife.sourceNpcId,
      identity: {
        name: model.player.name,
        gender: 'female'
      },
      startedAt: oldLife.startedAt,
      endedAt: endedAt,
      outcome: source === 'descendant' ? 'handover' : 'reincarnated',
      realmStage: oldRealmStage,
      skills: oldSkills,
      relationshipArchive: archive,
      heirNpcId: sourceNpcId,
      nextLifeId: newLifeId
    });

    next.player.skills = oldSkills;
    next.player.realmStage = nextRealmStage;
    next.player.cultivation = 0;
    if (next.player.breakthrough) {
      next.player.breakthrough.cultivation = 0;
      next.player.breakthrough.eventBuffs = [];
    }
    next.player.shouMax = 120;
    next.player.shouyuan = 120;
    next.player.lifecycle = {
      currentLifeId: newLifeId,
      generation: Math.max(1, Number(oldLife.generation) || 1) + 1,
      source: source,
      sourceNpcId: sourceNpcId,
      ageYears: 18,
      ageRemainderSeconds: 0,
      status: 'active',
      pendingCause: null,
      startedAt: endedAt
    };
    next.current = null;
    next.lastActionStop = null;
    if (next.systems.combat) {
      next.systems.combat.session = null;
      next.systems.combat.pendingLoot = null;
    }
    if (next.systems.social) next.systems.social.benefits = [];
    next.systems.parallel.jobs = next.systems.parallel.jobs.filter(
      function (job) {
        return !job || job.kind !== 'social';
      }
    );
    records.pendingTransition = null;
    // 新人生当作新世界：不继承上一世人物，整池重生 NPC 与结构关系。
    let refreshed = next;
    if (Stage4State &&
        typeof Stage4State.reseedWorldPopulation === 'function') {
      refreshed = Stage4State.reseedWorldPopulation(next);
    } else {
      clearPlayerRelationships(next);
      clearPreviousLifeChronicle(next);
      refreshed = NpcRoster.rebalance(next, {
        target: next.systems.npcs.activeTarget
      }) || next;
    }
    return result(true, 'ok', refreshed, {
      lifeId: newLifeId,
      source: source,
      sourceNpcId: sourceNpcId
    });
  }

  function cancel(model) {
    const next = clone(model);
    const records = lineage(next);
    if (!records || !records.pendingTransition) {
      return fail(model, 'no_pending_transition');
    }
    if (records.pendingTransition.cause !== 'voluntary') {
      return fail(model, 'transition_required');
    }
    records.pendingTransition = null;
    next.player.lifecycle.status = 'active';
    next.player.lifecycle.pendingCause = null;
    return result(true, 'ok', next, null);
  }

  function view(model) {
    const records = lineage(model);
    if (!records) return null;
    return Object.freeze({
      pending: clone(records.pendingTransition),
      eligibleHeirIds: Object.freeze(Lineage.adultHeirs(model)),
      origins: LifecycleContent.NEW_IDENTITY_ORIGINS,
      completedLifeCount: records.lives.length
    });
  }

  return Object.freeze({
    begin: begin,
    chooseRoute: chooseRoute,
    updateDraft: updateDraft,
    confirm: confirm,
    cancel: cancel,
    view: view,
    clearPreviousLifeChronicle: clearPreviousLifeChronicle
  });
});
