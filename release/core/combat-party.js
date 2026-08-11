(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(require('./relationships.js'), require('./random.js'))
    : factory(root && root.Relationships, root && root.GameRandom);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.CombatParty = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Relationships, GameRandom) {
  'use strict';

  const ELIGIBLE_STAGES = ['friend', 'lover', 'partner'];
  const DANGER_ORDER = { safe: 0, perilous: 1, deathTrial: 2, desperate: 3 };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function npc(model, npcId) {
    return model && model.systems && model.systems.npcs &&
      model.systems.npcs.records && model.systems.npcs.records[npcId] || null;
  }
  function pair(model, npcId) {
    return Relationships && Relationships.queryPair
      ? Relationships.queryPair(model, 'player', npcId)
      : null;
  }
  function eligible(model, npcId) {
    const person = npc(model, npcId);
    const relation = pair(model, npcId);
    return eligibleParts(person, relation);
  }
  function eligibleParts(person, relation) {
    return !!person && person.status === 'living' && person.lifeStage === 'adult' &&
      relation && relation.bond && ELIGIBLE_STAGES.indexOf(relation.bond.stage) >= 0;
  }
  function failure(code, model, rngState) {
    const result = { ok: false, code: code, state: model, result: null };
    if (rngState !== undefined) result.rngState = rngState;
    return result;
  }
  function query(model) {
    const systems = model && model.systems ? model.systems : {};
    const team = systems.teamCombat || { companionIds: [null, null, null] };
    const records = systems.npcs && systems.npcs.records || {};
    const ids = Object.keys(records);
    const pairs = Relationships && typeof Relationships.queryPairs === 'function'
      ? Relationships.queryPairs(model, 'player', ids)
      : null;
    return {
      slots: team.companionIds.map(function (npcId, slotIndex) {
        const person = npcId ? npc(model, npcId) : null;
        return {
          slotIndex: slotIndex,
          npcId: npcId,
          name: person && person.identity ? person.identity.name : null
        };
      }),
      eligible: ids.filter(function (npcId) {
        return eligibleParts(records[npcId], pairs ? pairs[npcId] : pair(model, npcId));
      }).map(function (npcId) {
        const person = npc(model, npcId);
        const relation = pairs ? pairs[npcId] : pair(model, npcId);
        const metrics = relation.firstToSecond || {};
        return {
          npcId: npcId,
          name: person.identity.name,
          affection: metrics.affection || 0,
          trust: metrics.trust || 0,
          stage: relation.bond.stage
        };
      })
    };
  }
  function setCompanion(model, slotIndex, npcId, atMs) {
    if (!Number.isSafeInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) {
      return failure('invalid_slot', model);
    }
    if (npcId !== null && !eligible(model, npcId)) return failure('not_eligible', model);
    const state = clone(model);
    state.systems.teamCombat.companionIds[slotIndex] = npcId;
    state.systems.teamCombat.changedAt = Number.isFinite(atMs) ? atMs : 0;
    return {
      ok: true,
      code: 'ok',
      state: state,
      result: { slotIndex: slotIndex, npcId: npcId }
    };
  }
  function cooperationFor(model, npcId) {
    const relation = pair(model, npcId);
    const metrics = relation && relation.firstToSecond || {};
    const affection = Math.max(0, Math.min(100, Number(metrics.affection) || 0));
    const trust = Math.max(0, Math.min(100, Number(metrics.trust) || 0));
    return Math.round((0.9 + (affection + trust) / 1000) * 10000) / 10000;
  }
  function nextReactionId(state, npcId, atMs, rngState) {
    const entries = state.systems.teamCombat.reactionLog;
    const ids = entries.map(function (entry) { return entry.id; });
    const base = 'team-risk-' + atMs + '-' + npcId + '-' + (rngState >>> 0);
    let id = base;
    let suffix = 2;
    while (ids.indexOf(id) >= 0) {
      id = base + '-' + suffix;
      suffix++;
    }
    return id;
  }
  function highRiskReaction(model, npcId, dangerLevel, atMs, rngState) {
    if (!eligible(model, npcId)) return failure('not_eligible', model, rngState);
    const order = DANGER_ORDER[dangerLevel];
    if (!Number.isSafeInteger(order)) return failure('invalid_danger', model, rngState);
    const rolled = GameRandom && GameRandom.next
      ? GameRandom.next(rngState >>> 0)
      : { seed: rngState >>> 0, value: 0 };
    const relation = pair(model, npcId);
    const metrics = relation.firstToSecond || {};
    const comfort = ((metrics.affection || 0) + (metrics.trust || 0)) / 2;
    const chance = Math.max(0, Math.min(0.95, order * 0.18 - comfort * 0.003));
    const triggered = order > 0 && rolled.value < chance;
    const deltas = triggered
      ? { affection: -2 * order, trust: -order }
      : { affection: 0, trust: 0 };
    let state = clone(model);
    if (triggered) {
      const applied = Relationships.applyDelta(
        state,
        'player',
        npcId,
        deltas,
        Number.isFinite(atMs) ? atMs / 1000 : 0
      );
      if (!applied || !applied.ok) {
        return failure(applied && applied.code || 'relationship_update_failed', model, rolled.seed);
      }
      state = applied.state;
    }
    state.systems.teamCombat.reactionLog.push({
      id: nextReactionId(
        state,
        npcId,
        Number.isFinite(atMs) ? atMs : 0,
        rolled.seed
      ),
      npcId: npcId,
      dangerLevel: dangerLevel,
      atMs: Number.isFinite(atMs) ? atMs : 0,
      affectionDelta: deltas.affection,
      trustDelta: deltas.trust
    });
    while (state.systems.teamCombat.reactionLog.length > 50) {
      state.systems.teamCombat.reactionLog.shift();
    }
    return {
      ok: true,
      code: triggered ? 'reaction' : 'no_change',
      state: state,
      rngState: rolled.seed,
      result: { npcId: npcId, triggered: triggered, metricDeltas: deltas }
    };
  }
  return Object.freeze({
    query: query,
    setCompanion: setCompanion,
    cooperationFor: cooperationFor,
    highRiskReaction: highRiskReaction
  });
});
