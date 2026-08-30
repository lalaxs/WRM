(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/sects.js'),
      require('./sect-offices.js'),
      require('./sect-missions.js')
    )
    : factory(
      root && root.SectContent,
      root && root.SectOffices,
      root && root.SectMissions
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.SectSimulation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  DefaultSectContent,
  SectOffices,
  SectMissions
) {
  'use strict';

  const PAIR_STATES = Object.freeze([
    'allied',
    'neutral',
    'competitive',
    'hostile'
  ]);

  // 退宗后再入门不再设置冷却。
  const LEAVE_COOLDOWN_SECONDS = 0;

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

  function onFirstActionCompleted(model, helpers) {
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
    const now = nowSeconds(helpers);
    if (Number.isFinite(sectPlayer.choiceAvailableAt) &&
        sectPlayer.choiceAvailableAt > now) {
      return response(false, 'cooldown', state);
    }
    if (sectPlayer.choiceEventOffered === true) {
      return response(true, 'no_change', state);
    }
    sectPlayer.choiceEventOffered = true;
    return response(true, 'ok', state);
  }

  function knownSectId(sectId) {
    if (sectId === null) return true;
    if (DefaultSectContent && typeof DefaultSectContent.get === 'function') {
      return !!DefaultSectContent.get(sectId);
    }
    return contentList({}).some(function (sect) {
      return sect.id === sectId;
    });
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
    if (nextSectId !== null && !knownSectId(nextSectId)) {
      return response(false, 'unknown_sect', model);
    }
    const previous = playerSect.sectId;
    playerSect.sectId = nextSectId;
    playerSect.joinedAt = nextSectId === null ? null : atSeconds;
    playerSect.choiceEventOffered = true;
    playerSect.choiceAvailableAt = nextSectId === null
      ? atSeconds + LEAVE_COOLDOWN_SECONDS
      : 0;
    if (nextSectId && nextSectId !== previous) {
      playerSect.discipleRank = 'disciple';
      playerSect.officeSlotId = 'disciple';
      playerSect.job = 0;
    }
    if (nextSectId === null) {
      playerSect.discipleRank = 'disciple';
      playerSect.officeSlotId = 'disciple';
      playerSect.job = 0;
    }
    if (previous && previous !== nextSectId) {
      playerSect.contribution[previous] = Math.floor(
        (Number(playerSect.contribution[previous]) || 0) * 0.8
      );
      playerSect.reputation[previous] =
        (Number(playerSect.reputation[previous]) || 0) - 5;
    }
    if (nextSectId === null && SectMissions &&
        typeof SectMissions.ensureMissionState === 'function') {
      const mission = SectMissions.ensureMissionState(playerSect);
      mission.missionId = null;
      mission.stepIndex = 0;
      mission.status = 'idle';
      mission.combatKillBaseline = 0;
    }
    return response(true, previous === nextSectId ? 'no_change' : 'ok', state, {
      eventId: eventId || null,
      previousSectId: previous,
      sectId: nextSectId
    });
  }

  function choosePlayerSect(model, sectId, helpers) {
    const state = clone(model);
    const player = state.player || {};
    const sectPlayer = state.systems && state.systems.sects &&
      state.systems.sects.player;
    if (!sectPlayer) return response(false, 'invalid_state', model);
    const now = nowSeconds(helpers);
    const nextSectId = sectId === null || sectId === undefined || sectId === ''
      ? null
      : String(sectId);
    if (!knownSectId(nextSectId)) {
      return response(false, 'unknown_sect', state);
    }
    // 散修身份下加入或确认继续散修：仅受冷却与加入门槛约束。
    if (sectPlayer.sectId === null) {
      if (Number.isFinite(sectPlayer.choiceAvailableAt) &&
          sectPlayer.choiceAvailableAt > now) {
        return response(false, 'cooldown', state);
      }
      if (nextSectId === null) {
        sectPlayer.choiceEventOffered = true;
        sectPlayer.choiceAvailableAt = now + LEAVE_COOLDOWN_SECONDS;
        return response(true, 'ok', state, {
          previousSectId: null,
          sectId: null
        });
      }
      const definition = DefaultSectContent &&
        typeof DefaultSectContent.get === 'function'
        ? DefaultSectContent.get(nextSectId)
        : null;
      if (SectMissions &&
          typeof SectMissions.evaluateJoinRequirements === 'function' &&
          definition) {
        const gate = SectMissions.evaluateJoinRequirements(definition, player);
        if (!gate.met) {
          return response(false, 'sect_requirement', state, {
            requirements: gate.requirements
          });
        }
      }
    }
    return applyPlayerMembership(
      state,
      { sectId: nextSectId },
      null,
      now
    );
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
    const worldElapsed = state.systems && state.systems.world
      ? Number(state.systems.world.elapsedSeconds)
      : NaN;
    const at = Number.isFinite(worldElapsed)
      ? Math.max(0, worldElapsed)
      : nowSeconds(helpers);
    sects.forEach(function (definition) {
      const record = systems.records[definition.id] || {
        id: definition.id,
        leaderId: null,
        roleByNpcId: {},
        officeHolders: {},
        power: 1,
        reputation: 0,
        lastChangedAt: 0
      };
      const powerDelta = random(helpers) < 0.5 ? -1 : 1;
      const reputationDelta = random(helpers) < 0.5 ? -1 : 1;
      record.power = Math.max(1, (Number(record.power) || 1) + powerDelta);
      record.reputation =
        (Number(record.reputation) || 0) + reputationDelta;
      record.lastChangedAt = at;
      systems.records[definition.id] = record;
      // 日常门务只更新势力，不再刷进大事记（避免淹没 NPC 世界见闻）。
      const report = helpers && helpers.report && helpers.report.world;
      if (report) {
        report.sectChanges = (Number(report.sectChanges) || 0) + 1;
      }
    });
    if (SectOffices && typeof SectOffices.reconcile === 'function') {
      const reconciled = SectOffices.reconcile(state, { inPlace: true });
      if (reconciled && reconciled.ok) {
        // state already mutated in place
      }
    } else {
      sects.forEach(function (definition) {
        const record = systems.records[definition.id];
        if (!record) return;
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
      });
    }
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
    LEAVE_COOLDOWN_SECONDS: LEAVE_COOLDOWN_SECONDS,
    onFirstActionCompleted: onFirstActionCompleted,
    applyPlayerMembership: applyPlayerMembership,
    choosePlayerSect: choosePlayerSect,
    advanceDay: advanceDay,
    queryAll: queryAll,
    queryOne: queryOne
  });
});
