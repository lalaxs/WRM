(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/sects.js'),
      require('./event-engine.js')
    )
    : factory(root && root.SectContent, root && root.EventEngine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.SectSimulation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  DefaultSectContent,
  EventEngine
) {
  'use strict';

  const PAIR_STATES = Object.freeze([
    'allied',
    'neutral',
    'competitive',
    'hostile'
  ]);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function response(ok, code, state, extra) {
    return Object.assign({ ok: ok, code: code, state: state }, extra || {});
  }

  function nowSeconds(helpers) {
    return helpers && typeof helpers.nowSeconds === 'function'
      ? Math.max(0, Number(helpers.nowSeconds()) || 0)
      : 0;
  }

  function random(helpers) {
    const value = helpers && typeof helpers.random === 'function'
      ? helpers.random()
      : 0;
    return Number.isFinite(value) && value >= 0 && value < 1 ? value : 0;
  }

  function contentList(deps) {
    const content = deps && deps.sects ? deps.sects : DefaultSectContent;
    return content && typeof content.list === 'function'
      ? content.list()
      : [];
  }

  function existingChoice(model) {
    const pending = model.systems.events.pending;
    return Array.isArray(pending) && pending.some(function (event) {
      return event && event.templateId === 'sect-first-choice';
    });
  }

  function onFirstActionCompleted(model, helpers, deps) {
    const state = clone(model);
    const player = state.player || {};
    const sectPlayer = state.systems && state.systems.sects &&
      state.systems.sects.player;
    if (!sectPlayer) return response(false, 'invalid_state', model);
    if (!player.flags || player.flags.completedFirstAction !== true) {
      return response(false, 'action_required', state);
    }
    if (sectPlayer.sectId !== null) {
      return response(false, 'already_joined', state);
    }
    if (existingChoice(state) || sectPlayer.choiceEventOffered === true) {
      return response(true, 'no_change', state);
    }
    const now = nowSeconds(helpers);
    if (Number.isFinite(sectPlayer.choiceAvailableAt) &&
        sectPlayer.choiceAvailableAt > now) {
      return response(false, 'cooldown', state);
    }
    const created = EventEngine.instantiate(
      state,
      'sect-first-choice',
      {},
      { nowSeconds: function () { return now; } },
      deps && deps.templates
    );
    if (!created.ok) return created;
    const queued = EventEngine.enqueue(created.state, created.event);
    if (!queued.ok) return queued;
    queued.state.systems.sects.player.choiceEventOffered = true;
    return response(true, 'ok', queued.state, { event: created.event });
  }

  function applyPlayerMembership(model, change, eventId, atSeconds) {
    const state = clone(model);
    const playerSect = state.systems && state.systems.sects &&
      state.systems.sects.player;
    if (!playerSect) return response(false, 'invalid_state', model);
    const nextSectId = change && Object.prototype.hasOwnProperty.call(
      change,
      'sectId'
    ) ? change.sectId : null;
    const previous = playerSect.sectId;
    playerSect.sectId = nextSectId;
    playerSect.joinedAt = nextSectId === null ? null : atSeconds;
    playerSect.choiceEventOffered = nextSectId !== null;
    playerSect.choiceAvailableAt = nextSectId === null
      ? atSeconds + 86400
      : 0;
    if (previous && previous !== nextSectId) {
      playerSect.contribution[previous] = Math.floor(
        (Number(playerSect.contribution[previous]) || 0) * 0.8
      );
      playerSect.reputation[previous] =
        (Number(playerSect.reputation[previous]) || 0) - 5;
    }
    return response(true, previous === nextSectId ? 'no_change' : 'ok', state, {
      eventId: eventId,
      previousSectId: previous,
      sectId: nextSectId
    });
  }

  function compareMembers(left, right) {
    const realm = (Number(right.realmStage) || 0) -
      (Number(left.realmStage) || 0);
    if (realm) return realm;
    const cultivation = (Number(right.cultivation) || 0) -
      (Number(left.cultivation) || 0);
    return cultivation || left.id.localeCompare(right.id);
  }

  function appendEvolution(state, entry, helpers) {
    const events = state.systems.events;
    if (!Array.isArray(events.evolution)) events.evolution = [];
    events.evolution.push(entry);
    const report = helpers && helpers.report && helpers.report.world;
    if (report) {
      report.sectChanges = (Number(report.sectChanges) || 0) + 1;
      report.evolution = (Number(report.evolution) || 0) + 1;
      if (Array.isArray(report.events)) {
        report.events.push({ category: entry.category, title: entry.title });
      }
    }
  }

  function pairKey(first, second) {
    return first < second ? first + '|' + second : second + '|' + first;
  }

  function advanceDay(model, helpers, deps) {
    const state = clone(model);
    const sects = contentList(deps);
    const systems = state.systems && state.systems.sects;
    const records = state.systems && state.systems.npcs &&
      state.systems.npcs.records || {};
    if (!systems || !systems.records) {
      return response(false, 'invalid_state', model);
    }
    const at = nowSeconds(helpers);
    sects.forEach(function (definition) {
      const record = systems.records[definition.id] || {
        id: definition.id,
        leaderId: null,
        roleByNpcId: {},
        power: 1,
        reputation: 0,
        lastChangedAt: 0
      };
      const members = Object.keys(records).map(function (id) {
        return records[id];
      }).filter(function (person) {
        return person && person.status === 'living' &&
          person.sectId === definition.id;
      }).sort(compareMembers);
      record.leaderId = members.length > 0 ? members[0].id : null;
      record.roleByNpcId = {};
      members.slice(1, 4).forEach(function (person) {
        record.roleByNpcId[person.id] = '执事';
      });
      const powerDelta = random(helpers) < 0.5 ? -1 : 1;
      const reputationDelta = random(helpers) < 0.5 ? -1 : 1;
      record.power = Math.max(1, (Number(record.power) || 1) + powerDelta);
      record.reputation =
        (Number(record.reputation) || 0) + reputationDelta;
      record.lastChangedAt = at;
      systems.records[definition.id] = record;
      appendEvolution(state, {
        id: 'sect-day-' + definition.id + '-' + at,
        category: 'sect',
        sectId: definition.id,
        scope: systems.player.sectId === definition.id
          ? 'nearby'
          : 'world',
        title: definition.name + '完成了今日的门中事务',
        at: at
      }, helpers);
    });
    for (let first = 0; first < sects.length; first++) {
      for (let second = first + 1; second < sects.length; second++) {
        const key = pairKey(sects[first].id, sects[second].id);
        const previous = systems.pairStates[key] &&
          systems.pairStates[key].state;
        const roll = random(helpers);
        const next = roll < 0.08
          ? 'hostile'
          : roll < 0.28
            ? 'competitive'
            : roll > 0.88
              ? 'allied'
              : (PAIR_STATES.indexOf(previous) >= 0 ? previous : 'neutral');
        systems.pairStates[key] = {
          state: next,
          lastChangedAt: at
        };
      }
    }
    return response(true, 'ok', state);
  }

  function queryAll(model, deps) {
    const content = contentList(deps);
    const systems = model.systems && model.systems.sects;
    const player = systems && systems.player || { sectId: null };
    return {
      player: {
        sectId: player.sectId,
        displayName: player.sectId === null
          ? '散修'
          : ((content.find(function (sect) {
            return sect.id === player.sectId;
          }) || {}).name || player.sectId)
      },
      sects: content.map(function (definition) {
        const record = systems && systems.records &&
          systems.records[definition.id] || {};
        return {
          id: definition.id,
          name: definition.name,
          power: Math.max(1, Number(record.power) || 1),
          reputation: Number(record.reputation) || 0,
          leaderId: record.leaderId || null
        };
      })
    };
  }

  function queryOne(model, sectId, deps) {
    return queryAll(model, deps).sects.find(function (sect) {
      return sect.id === sectId;
    }) || null;
  }

  return Object.freeze({
    onFirstActionCompleted: onFirstActionCompleted,
    applyPlayerMembership: applyPlayerMembership,
    advanceDay: advanceDay,
    queryAll: queryAll,
    queryOne: queryOne
  });
});
