(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(require('./relationships.js'))
    : factory(root && root.Relationships);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.TeamCombatConsequences = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Relationships) {
  'use strict';

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function fallenAllies(session) {
    return (session.teams && session.teams.allies || []).filter(function (unit) {
      return unit && unit.fallen === true;
    });
  }

  function lossAmount(dangerLevel, outcome) {
    if (dangerLevel === 'safe') return 0;
    if (dangerLevel === 'perilous') return outcome === 'allies_defeated' ? 1 : 0;
    if (dangerLevel === 'deathTrial') return outcome === 'allies_defeated' ? 2 : 1;
    if (dangerLevel === 'desperate') return outcome === 'allies_defeated' ? 4 : 2;
    return 0;
  }

  function failure(code, model) {
    return { ok: false, code: code, state: model, result: null };
  }

  function apply(model, session, outcome, atMs) {
    if (!model || !session || !session.teams ||
        !Array.isArray(session.teams.allies)) {
      return failure('invalid_state', model);
    }
    let state;
    try {
      state = clone(model);
    } catch (error) {
      return failure('invalid_state', model);
    }
    const amount = lossAmount(session.dangerLevel, outcome);
    const losses = [];
    const reactions = [];
    const atSeconds = Number.isFinite(atMs) ? atMs / 1000 : 0;

    if (amount > 0) {
      fallenAllies(session).forEach(function (unit) {
        if (unit.sourceType === 'player' && state.player) {
          state.player.shouyuan = Math.max(
            0,
            (Number(state.player.shouyuan) || 0) - amount
          );
          losses.push({
            personId: 'player',
            sourceType: 'player',
            amountYears: amount
          });
        } else if (unit.sourceType === 'npc' &&
            state.systems && state.systems.npcs &&
            state.systems.npcs.records &&
            state.systems.npcs.records[unit.sourceId]) {
          const npc = state.systems.npcs.records[unit.sourceId];
          npc.lifespanYears = Math.max(
            0,
            (Number(npc.lifespanYears) || 0) - amount
          );
          losses.push({
            personId: unit.sourceId,
            sourceType: 'npc',
            amountYears: amount
          });
          reactions.push({
            npcId: unit.sourceId,
            affectionDelta: -amount * 2,
            trustDelta: -amount
          });
        }
      });
    }

    for (let index = 0; index < reactions.length; index++) {
      const reaction = reactions[index];
      if (!Relationships || typeof Relationships.applyDelta !== 'function') {
        return failure('relationship_update_failed', model);
      }
      const applied = Relationships.applyDelta(
        state,
        'player',
        reaction.npcId,
        {
          affection: reaction.affectionDelta,
          trust: reaction.trustDelta
        },
        atSeconds
      );
      if (!applied || applied.ok !== true) {
        return failure(
          applied && typeof applied.code === 'string'
            ? applied.code
            : 'relationship_update_failed',
          model
        );
      }
      state = applied.state;
    }

    if (reactions.length) {
      if (!state.systems.teamCombat) {
        state.systems.teamCombat = {
          companionIds: [null, null, null],
          reactionLog: []
        };
      }
      if (!Array.isArray(state.systems.teamCombat.reactionLog)) {
        state.systems.teamCombat.reactionLog = [];
      }
      reactions.forEach(function (reaction, index) {
        state.systems.teamCombat.reactionLog.push({
          id: 'team-consequence-' + (
            state.systems.teamCombat.reactionLog.length + index + 1
          ),
          npcId: reaction.npcId,
          dangerLevel: session.dangerLevel,
          atMs: Number.isFinite(atMs) ? atMs : 0,
          affectionDelta: reaction.affectionDelta,
          trustDelta: reaction.trustDelta
        });
      });
      while (state.systems.teamCombat.reactionLog.length > 50) {
        state.systems.teamCombat.reactionLog.shift();
      }
    }

    return {
      ok: true,
      code: 'ok',
      state: state,
      result: {
        lifespanLosses: losses,
        relationshipReactions: reactions
      }
    };
  }

  return Object.freeze({ apply: apply });
});
