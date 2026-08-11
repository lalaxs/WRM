(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./relationships.js'),
      require('./random.js'),
      require('../content/lifecycle.js')
    )
    : factory(
      root && root.Relationships,
      root && root.GameRandom,
      root && root.LifecycleContent
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Lineage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Relationships,
  GameRandom,
  LifecycleContent
) {
  'use strict';

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

  function ok(state, code, value) {
    return { ok: true, code: code || 'ok', state: state, value: value || null };
  }

  function fail(model, code) {
    return { ok: false, code: code, state: clone(model) || model, value: null };
  }

  function lineageOf(state) {
    return state && state.systems && state.systems.lineage;
  }

  function npcRecords(state) {
    return state && state.systems && state.systems.npcs &&
      state.systems.npcs.records;
  }

  function activeRitual(model) {
    const lineage = lineageOf(model);
    if (!lineage || !Array.isArray(lineage.rituals)) return null;
    return lineage.rituals.find(function (ritual) {
      return ritual && ritual.status === 'active';
    }) || null;
  }

  function adultHeirs(model) {
    const lineage = lineageOf(model);
    const records = npcRecords(model);
    if (!lineage || !records || !lineage.descendants) return [];
    return Object.keys(lineage.descendants).filter(function (npcId) {
      const person = records[npcId];
      return person &&
        person.status === 'living' &&
        person.lifeStage === 'adult' &&
        person.identity &&
        person.identity.gender === 'female';
    }).sort();
  }

  function propose(model, partnerNpcId, nowSeconds) {
    const next = clone(model);
    if (!next) return fail(model, 'invalid_state');
    const lineage = lineageOf(next);
    const records = npcRecords(next);
    const partner = records && records[partnerNpcId];
    if (!lineage || !partner) return fail(model, 'unknown_partner');
    if (partner.status !== 'living' || partner.lifeStage === 'child') {
      return fail(model, 'partner_unavailable');
    }
    const bond = Relationships &&
      typeof Relationships.getBond === 'function'
      ? Relationships.getBond(next, 'player', partnerNpcId)
      : null;
    if (!bond || bond.stage !== 'partner') {
      return fail(model, 'formal_partner_required');
    }
    if (activeRitual(next)) return fail(model, 'ritual_in_progress');
    const id = 'ritual-' + Math.max(1, Number(lineage.nextRitualId) || 1);
    lineage.nextRitualId = Math.max(1, Number(lineage.nextRitualId) || 1) + 1;
    const ritual = {
      id: id,
      playerLifeId: next.player.lifecycle.currentLifeId,
      partnerNpcId: partnerNpcId,
      startedAt: Math.max(0, Number(nowSeconds) || 0),
      completedAt: null,
      childNpcId: null,
      status: 'active'
    };
    lineage.rituals.push(ritual);
    next.systems.parallel.jobs.push({
      id: 'lineage-' + id,
      kind: 'lineageRitual',
      ritualId: id,
      partnerNpcId: partnerNpcId,
      label: '与' + partner.identity.name + '筹备传承仪式',
      remainingSeconds: LifecycleContent.LINEAGE_RITUAL_SECONDS,
      totalSeconds: LifecycleContent.LINEAGE_RITUAL_SECONDS
    });
    return ok(next, 'ok', ritual);
  }

  function nextRandom(state) {
    const rolled = GameRandom.next(state.rngState);
    state.rngState = rolled.seed;
    return rolled.value;
  }

  function childName(state, partner, childNumber) {
    const playerName = state.player && typeof state.player.name === 'string'
      ? state.player.name
      : '无名';
    const family = playerName.slice(0, 1) || '承';
    const partnerMark = partner &&
      partner.identity &&
      typeof partner.identity.name === 'string'
      ? partner.identity.name.slice(-1)
      : '宁';
    const marks = ['安', '宁', '清', '和', '昭', '月'];
    const index = Math.floor(nextRandom(state) * marks.length) % marks.length;
    return family + marks[index] + (childNumber > 1 ? partnerMark : '');
  }

  function completeRitual(model, ritualId, nowSeconds) {
    const next = clone(model);
    if (!next) return fail(model, 'invalid_state');
    const lineage = lineageOf(next);
    const records = npcRecords(next);
    if (!lineage || !records) return fail(model, 'invalid_state');
    const ritual = lineage.rituals.find(function (candidate) {
      return candidate && candidate.id === ritualId;
    });
    if (!ritual) return fail(model, 'unknown_ritual');
    if (ritual.status === 'completed') {
      return ok(next, 'already_completed', {
        ritual: ritual,
        child: records[ritual.childNpcId] || null
      });
    }
    if (ritual.status !== 'active') return fail(model, 'ritual_inactive');
    const partner = records[ritual.partnerNpcId];
    if (!partner || partner.status !== 'living') {
      ritual.status = 'cancelled';
      return ok(next, 'partner_unavailable', { ritual: ritual, child: null });
    }

    const number = Math.max(1, Number(next.systems.npcs.nextId) || 1);
    const npcId = 'npc-' + number;
    next.systems.npcs.nextId = number + 1;
    const now = Math.max(0, Number(nowSeconds) || 0);
    const child = {
      id: npcId,
      identity: {
        name: childName(next, partner, Object.keys(lineage.descendants).length + 1),
        gender: 'female',
        appearance: clone(partner.identity.appearance) || {
          buildId: 'slender',
          faceId: 'clear-face',
          hairId: 'long-black',
          featureId: 'quiet-eyes'
        }
      },
      ageYears: 0,
      ageRemainderSeconds: 0,
      lifeStage: 'child',
      lifespanYears: 80,
      realmStage: 0,
      cultivation: 0,
      talentId: partner.talentId,
      personalityId: partner.personalityId,
      valueProfileId: partner.valueProfileId,
      romancePrincipleId: partner.romancePrincipleId,
      regionId: next.player.regionId || partner.regionId,
      sectId: null,
      familyId: 'player-lineage',
      skills: {},
      techniques: [],
      inventorySummary: { wealthTier: 0, notableItemIds: [] },
      biography: [{
        at: now,
        category: 'birth',
        text: '作为你的后代来到这个世界。'
      }],
      keyEventIds: [],
      status: 'living',
      lifecycle: {},
      lastDetailedAt: now,
      lastBackgroundAt: now
    };
    records[npcId] = child;
    lineage.descendants[npcId] = {
      npcId: npcId,
      playerLifeId: ritual.playerLifeId,
      partnerNpcId: ritual.partnerNpcId,
      ritualId: ritual.id,
      bornAt: now,
      adultAt: null
    };
    ritual.completedAt = now;
    ritual.childNpcId = npcId;
    ritual.status = 'completed';
    next.systems.events.evolution.push({
      id: 'birth-' + npcId,
      at: now,
      category: 'birth',
      title: child.identity.name + '出生',
      participants: [npcId, ritual.partnerNpcId]
    });
    return ok(next, 'ok', { ritual: ritual, child: child });
  }

  function markAdultDescendants(model, nowSeconds) {
    const next = clone(model);
    if (!next) return fail(model, 'invalid_state');
    const lineage = lineageOf(next);
    const records = npcRecords(next);
    if (!lineage || !records) return fail(model, 'invalid_state');
    const adulthood = [];
    Object.keys(lineage.descendants).sort().forEach(function (npcId) {
      const person = records[npcId];
      const record = lineage.descendants[npcId];
      if (!person ||
          person.status !== 'living' ||
          person.lifeStage !== 'child' ||
          person.ageYears < LifecycleContent.CHILD_ADULT_AGE_YEARS) {
        return;
      }
      const now = Math.max(0, Number(nowSeconds) || 0);
      person.lifeStage = 'adult';
      record.adultAt = now;
      person.biography.push({
        at: now,
        category: 'adulthood',
        text: '已经成年，可以独自修行。'
      });
      next.systems.events.evolution.push({
        id: 'adulthood-' + npcId,
        at: now,
        category: 'adulthood',
        title: person.identity.name + '成年',
        participants: [npcId]
      });
      adulthood.push(npcId);
    });
    return ok(next, adulthood.length ? 'ok' : 'no_change', adulthood);
  }

  return Object.freeze({
    activeRitual: activeRitual,
    adultHeirs: adultHeirs,
    propose: propose,
    completeRitual: completeRitual,
    markAdultDescendants: markAdultDescendants
  });
});
