(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/sect-missions.js'),
      require('../content/combat.js')
    )
    : factory(
      root && root.SectMissionContent,
      root && root.CombatContent
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.SectMissions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  DefaultMissionContent,
  DefaultCombatContent
) {
  'use strict';

  const SKILL_ALIASES = Object.freeze({
    herb: Object.freeze(['herb', 'caiyao']),
    mining: Object.freeze(['mining', 'caiju']),
    woodcutting: Object.freeze(['woodcutting', 'famu']),
    fishing: Object.freeze(['fishing', 'diaoyu']),
    forging: Object.freeze(['forging', 'lianqi']),
    alchemy: Object.freeze(['alchemy', 'liandan']),
    talisman: Object.freeze(['talisman', 'fulu']),
    charm: Object.freeze(['charm']),
    farming: Object.freeze(['farming'])
  });

  const FALLBACK_COMBAT = Object.freeze({
    regionId: 'qingyunOutskirts',
    enemyId: 'thornHare',
    enemyName: '棘刺兔'
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function response(ok, code, state, extra) {
    return Object.assign({ ok: ok, code: code, state: state }, extra || {});
  }

  function missionContent(deps) {
    return deps && deps.missions ? deps.missions : DefaultMissionContent;
  }

  function combatContent(deps) {
    return deps && deps.combat ? deps.combat : DefaultCombatContent;
  }

  function boardSize(content) {
    return Math.max(1, Number(content && content.BOARD_SIZE) || 3);
  }

  function refreshSeconds(content) {
    return Math.max(60, Number(content && content.REFRESH_SECONDS) || 1800);
  }

  function emptyMission() {
    return {
      missionId: null,
      stepIndex: 0,
      status: 'idle',
      combatKillBaseline: 0,
      combatBaselines: {},
      completedMissionIds: [],
      boardPeriod: -1,
      boardOfferIds: [],
      boardStatuses: {},
      boardResolved: {},
      activeResolved: null
    };
  }

  function ensureMissionState(playerSect) {
    if (!playerSect.mission || typeof playerSect.mission !== 'object') {
      playerSect.mission = emptyMission();
    }
    const mission = playerSect.mission;
    if (!Array.isArray(mission.completedMissionIds)) {
      mission.completedMissionIds = [];
    }
    if (!Array.isArray(mission.boardOfferIds)) {
      mission.boardOfferIds = [];
    }
    if (!mission.boardStatuses || typeof mission.boardStatuses !== 'object') {
      mission.boardStatuses = {};
    }
    if (!mission.combatBaselines || typeof mission.combatBaselines !== 'object') {
      mission.combatBaselines = {};
    }
    if (!mission.boardResolved || typeof mission.boardResolved !== 'object') {
      mission.boardResolved = {};
    }
    if (!Number.isFinite(mission.boardPeriod)) mission.boardPeriod = -1;
    if (!Number.isFinite(mission.combatKillBaseline)) {
      mission.combatKillBaseline = 0;
    }
    return mission;
  }

  function nowSeconds(helpers, model) {
    if (helpers && typeof helpers.nowSeconds === 'function') {
      return Math.max(0, Number(helpers.nowSeconds()) || 0);
    }
    const world = model && model.systems && model.systems.world;
    if (world && Number.isFinite(world.elapsedSeconds)) {
      return Math.max(0, Number(world.elapsedSeconds) || 0);
    }
    return Math.floor(Date.now() / 1000);
  }

  function playerRealmStage(model) {
    return Math.max(
      0,
      Math.floor(Number(model && model.player && model.player.realmStage) || 0)
    );
  }

  function hashString(text) {
    let hash = 2166136261;
    const source = String(text || '');
    for (let i = 0; i < source.length; i++) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function rewardMultiplier(realmStage) {
    const stage = Math.max(0, Math.floor(Number(realmStage) || 0));
    return 1 + Math.floor(stage / 3) * 0.4;
  }

  function scaleAmount(baseAmount, realmStage) {
    const base = Math.max(1, Math.floor(Number(baseAmount) || 1));
    const band = Math.floor(Math.max(0, Number(realmStage) || 0) / 3);
    return Math.max(1, Math.round(base * (1 + band * 0.5)));
  }

  function scaleRewards(rewards, realmStage) {
    const source = rewards || {};
    const mult = rewardMultiplier(realmStage);
    return {
      contribution: Math.max(
        1,
        Math.round((Number(source.contribution) || 0) * mult)
      ),
      reputation: Math.max(
        1,
        Math.round((Number(source.reputation) || 0) * mult)
      ),
      lingshi: Math.max(1, Math.round((Number(source.lingshi) || 0) * mult))
    };
  }

  function maxMaterialTier(realmStage) {
    const stage = Math.max(0, Math.floor(Number(realmStage) || 0));
    if (stage <= 2) return 2;
    if (stage <= 5) return 3;
    if (stage <= 8) return 4;
    if (stage <= 10) return 6;
    if (stage <= 12) return 7;
    return 9;
  }

  function familyDefinition(content, familyId) {
    if (content && typeof content.getDeliverFamily === 'function') {
      return content.getDeliverFamily(familyId);
    }
    const families = content && content.DELIVER_FAMILIES;
    if (families && familyId && families[familyId]) return families[familyId];
    return null;
  }

  function familyAcceptList(family, realmStage) {
    if (!family) return [];
    const maxTier = maxMaterialTier(realmStage);
    const list = [];
    (family.aliases || []).forEach(function (id) {
      list.push({ id: id, name: family.label || id, tier: 0, alias: true });
    });
    (family.items || []).forEach(function (row) {
      if (!row || typeof row.id !== 'string') return;
      const tier = Math.max(0, Math.floor(Number(row.tier) || 1));
      if (tier > maxTier) return;
      list.push({
        id: row.id,
        name: row.name || row.id,
        tier: tier,
        alias: false
      });
    });
    return list;
  }

  function listCombatRegions(combat) {
    if (!combat || !combat.REGIONS) return [];
    return Object.keys(combat.REGIONS).map(function (id) {
      return combat.REGIONS[id];
    }).filter(function (region) {
      return region && Array.isArray(region.enemyIds) && region.enemyIds.length;
    }).sort(function (left, right) {
      return (left.requiredRealmIndex || 0) - (right.requiredRealmIndex || 0) ||
        (left.tier || 0) - (right.tier || 0) ||
        String(left.id).localeCompare(String(right.id));
    });
  }

  function pickCombatTarget(combat, realmStage, salt) {
    const regions = listCombatRegions(combat);
    let chosen = null;
    regions.forEach(function (region) {
      const need = Math.max(0, Math.floor(Number(region.requiredRealmIndex) || 0));
      if (need <= realmStage) chosen = region;
    });
    if (!chosen) {
      return {
        regionId: FALLBACK_COMBAT.regionId,
        enemyId: FALLBACK_COMBAT.enemyId,
        label: '击败' + FALLBACK_COMBAT.enemyName
      };
    }
    const enemies = chosen.enemyIds;
    const index = hashString(salt + ':' + chosen.id) % enemies.length;
    const enemyId = enemies[index];
    let enemyName = enemyId;
    if (combat && typeof combat.getEnemy === 'function') {
      const enemy = combat.getEnemy(enemyId);
      if (enemy && enemy.name) enemyName = enemy.name;
    }
    return {
      regionId: chosen.id,
      enemyId: enemyId,
      label: '击败' + enemyName
    };
  }

  function resolveDeliverStep(step, content, realmStage) {
    const familyId = typeof step.family === 'string'
      ? step.family
      : legacyFamilyFromStack(step.stackId);
    const family = familyDefinition(content, familyId);
    const baseAmount = Math.max(
      1,
      Math.floor(Number(step.amount) || 1)
    );
    const amount = scaleAmount(baseAmount, realmStage);
    const accept = familyAcceptList(family, realmStage);
    const labelBase = (family && family.label) ||
      (typeof step.label === 'string' ? step.label : '物资');
    const label = '上交' + labelBase + '×' + amount;
    return {
      kind: 'deliver',
      family: familyId,
      amount: amount,
      label: label,
      hint: (family && family.hint) || '',
      examples: accept.filter(function (row) {
        return !row.alias;
      }).slice(0, 3).map(function (row) {
        return row.name;
      }),
      acceptIds: accept.map(function (row) {
        return row.id;
      })
    };
  }

  function legacyFamilyFromStack(stackId) {
    if (stackId === 'yaocai' || stackId === 'herbBundle') return 'herb';
    if (stackId === 'lingkuang' || stackId === 'oreBundle') return 'ore';
    if (stackId === 'shicai' || stackId === 'foodBundle') return 'food';
    if (stackId === 'muliao' || stackId === 'woodBundle') return 'ore';
    return null;
  }

  function resolveCombatStep(step, combat, realmStage, salt) {
    if (step && step.auto !== false &&
        (!step.regionId || !step.enemyId || step.auto === true)) {
      const picked = pickCombatTarget(combat, realmStage, salt);
      return {
        kind: 'combat',
        auto: true,
        regionId: picked.regionId,
        enemyId: picked.enemyId,
        label: typeof step.label === 'string' && step.label.indexOf('击败') === 0
          ? picked.label
          : (step.label || picked.label)
      };
    }
    return {
      kind: 'combat',
      auto: false,
      regionId: step.regionId || FALLBACK_COMBAT.regionId,
      enemyId: step.enemyId || FALLBACK_COMBAT.enemyId,
      label: step.label || '完成战斗挑战'
    };
  }

  function resolveDefinition(definition, content, combat, realmStage, salt) {
    if (!definition) return null;
    const steps = (definition.steps || []).map(function (step, index) {
      if (step.kind === 'deliver') {
        return resolveDeliverStep(step, content, realmStage);
      }
      if (step.kind === 'combat') {
        return resolveCombatStep(
          step,
          combat,
          realmStage,
          salt + ':step:' + index
        );
      }
      return clone(step);
    });
    return {
      id: definition.id,
      sectId: definition.sectId,
      name: definition.name,
      description: definition.description,
      steps: steps,
      rewards: scaleRewards(definition.rewards, realmStage),
      realmStage: realmStage
    };
  }

  function missionEligible(definition, realmStage) {
    if (!definition) return false;
    const minRealm = Math.max(0, Math.floor(Number(definition.minRealm) || 0));
    const maxRealm = Math.max(
      minRealm,
      Math.floor(Number.isFinite(definition.maxRealm) ? definition.maxRealm : 99)
    );
    return realmStage >= minRealm && realmStage <= maxRealm;
  }

  function pickBoardOffers(sectId, period, content, realmStage) {
    const pool = (content.listForSect(sectId) || []).filter(function (row) {
      return missionEligible(row, realmStage);
    });
    const size = Math.min(boardSize(content), pool.length);
    if (size <= 0) {
      // 境界过滤后为空时回退全池，避免看板空白。
      const fallback = (content.listForSect(sectId) || []).slice();
      const fallbackSize = Math.min(boardSize(content), fallback.length);
      const scoredFallback = fallback.map(function (row, index) {
        return {
          id: row.id,
          score: hashString(sectId + ':' + period + ':' + row.id + ':' + index)
        };
      }).sort(function (left, right) {
        return left.score - right.score || left.id.localeCompare(right.id);
      });
      return scoredFallback.slice(0, fallbackSize).map(function (row) {
        return row.id;
      });
    }
    const scored = pool.map(function (row, index) {
      return {
        id: row.id,
        score: hashString(
          sectId + ':' + period + ':' + realmStage + ':' + row.id + ':' + index
        )
      };
    }).sort(function (left, right) {
      return left.score - right.score || left.id.localeCompare(right.id);
    });
    return scored.slice(0, size).map(function (row) {
      return row.id;
    });
  }

  function rebuildBoardResolved(
    mission,
    sectId,
    content,
    combat,
    realmStage,
    period
  ) {
    const resolved = {};
    (mission.boardOfferIds || []).forEach(function (id) {
      const definition = content.get(id);
      resolved[id] = resolveDefinition(
        definition,
        content,
        combat,
        realmStage,
        sectId + ':' + period + ':' + id
      );
    });
    mission.boardResolved = resolved;
    return resolved;
  }

  function ensureBoard(playerSect, sectId, content, combat, atSeconds, realmStage) {
    const mission = ensureMissionState(playerSect);
    const period = Math.floor(atSeconds / refreshSeconds(content));
    const activeId = mission.status === 'active' ? mission.missionId : null;
    if (mission.boardPeriod === period &&
        mission.boardOfferIds.length === boardSize(content) &&
        mission.boardResolved &&
        Object.keys(mission.boardResolved).length) {
      return mission;
    }
    const nextOffers = pickBoardOffers(sectId, period, content, realmStage);
    if (activeId && nextOffers.indexOf(activeId) < 0) {
      nextOffers[nextOffers.length - 1] = activeId;
    }
    const nextStatuses = {};
    nextOffers.forEach(function (id) {
      if (id === activeId) nextStatuses[id] = 'active';
      else nextStatuses[id] = 'available';
    });
    mission.boardPeriod = period;
    mission.boardOfferIds = nextOffers;
    mission.boardStatuses = nextStatuses;
    rebuildBoardResolved(
      mission,
      sectId,
      content,
      combat,
      realmStage,
      period
    );
    if (activeId && mission.activeResolved) {
      mission.boardResolved[activeId] = mission.activeResolved;
    }
    return mission;
  }

  function resolvedFor(mission, missionId, content, combat, realmStage, salt) {
    if (mission.activeResolved &&
        mission.missionId === missionId &&
        mission.activeResolved.id === missionId) {
      return mission.activeResolved;
    }
    if (mission.boardResolved && mission.boardResolved[missionId]) {
      return mission.boardResolved[missionId];
    }
    return resolveDefinition(
      content.get(missionId),
      content,
      combat,
      realmStage,
      salt || missionId
    );
  }

  function skillLevel(player, skillId) {
    const skills = player && player.skills;
    if (!skills || typeof skills !== 'object') return 1;
    const aliases = SKILL_ALIASES[skillId] || [skillId];
    let best = 1;
    for (let i = 0; i < aliases.length; i++) {
      const row = skills[aliases[i]];
      if (!row || typeof row !== 'object') continue;
      const level = Number.isFinite(row.level)
        ? row.level
        : (Number.isFinite(row.lv) ? row.lv : 1);
      if (level > best) best = level;
    }
    return best;
  }

  function evaluateRequirement(req, player) {
    if (!req || typeof req !== 'object') {
      return { ok: true, label: '' };
    }
    const label = typeof req.label === 'string' ? req.label : '加入要求';
    if (req.type === 'realmStage') {
      const realm = Math.max(0, Math.floor(Number(player && player.realmStage) || 0));
      const min = Math.max(0, Math.floor(Number(req.min) || 0));
      return { ok: realm >= min, label: label, current: realm, required: min };
    }
    if (req.type === 'spiritualRoot') {
      const rootId = player && typeof player.spiritualRootId === 'string'
        ? player.spiritualRootId
        : null;
      const allowed = Array.isArray(req.rootIds) ? req.rootIds : [];
      return {
        ok: !!rootId && allowed.indexOf(rootId) >= 0,
        label: label,
        current: rootId,
        required: allowed.slice()
      };
    }
    if (req.type === 'skill') {
      const level = skillLevel(player, req.skillId);
      const minLevel = Math.max(1, Math.floor(Number(req.minLevel) || 1));
      return {
        ok: level >= minLevel,
        label: label,
        current: level,
        required: minLevel
      };
    }
    return { ok: true, label: label };
  }

  function evaluateJoinRequirements(definition, player) {
    const requirements = definition && Array.isArray(definition.joinRequirements)
      ? definition.joinRequirements
      : [];
    const rows = requirements.map(function (req) {
      return evaluateRequirement(req, player);
    });
    return {
      requirements: rows,
      met: rows.every(function (row) { return row.ok; })
    };
  }

  function enemyKillCount(model, enemyId) {
    const progress = model && model.systems && model.systems.combat &&
      model.systems.combat.progress;
    const kills = progress && progress.enemyKills;
    if (!kills || typeof enemyId !== 'string') return 0;
    return Math.max(0, Math.floor(Number(kills[enemyId]) || 0));
  }

  function stackCount(player, stackId) {
    const stacks = player && player.inventory && player.inventory.stacks;
    if (!stacks || typeof stackId !== 'string') return 0;
    return Math.max(0, Math.floor(Number(stacks[stackId]) || 0));
  }

  function deliverHave(player, step) {
    const ids = Array.isArray(step.acceptIds) && step.acceptIds.length
      ? step.acceptIds
      : (step.stackId ? [step.stackId] : []);
    let total = 0;
    ids.forEach(function (id) {
      total += stackCount(player, id);
    });
    return total;
  }

  function consumeDeliver(player, step) {
    const need = Math.max(1, Math.floor(Number(step.amount) || 1));
    if (!player.inventory || typeof player.inventory !== 'object') {
      player.inventory = { stacks: {} };
    }
    if (!player.inventory.stacks || typeof player.inventory.stacks !== 'object') {
      player.inventory.stacks = {};
    }
    const stacks = player.inventory.stacks;
    const ids = Array.isArray(step.acceptIds) && step.acceptIds.length
      ? step.acceptIds.slice()
      : (step.stackId ? [step.stackId] : []);
    // 优先扣散装/低阶：按持有量从小到大，减少拆散高价值材料。
    ids.sort(function (left, right) {
      return stackCount(player, left) - stackCount(player, right) ||
        String(left).localeCompare(String(right));
    });
    let remaining = need;
    ids.forEach(function (id) {
      if (remaining <= 0) return;
      const have = stackCount(player, id);
      if (have <= 0) return;
      const take = Math.min(have, remaining);
      const next = have - take;
      if (next <= 0) delete stacks[id];
      else stacks[id] = next;
      remaining -= take;
    });
    return remaining <= 0;
  }

  function stepProgress(model, mission, step) {
    if (!step) return { ok: false, have: 0, need: 0, combatReady: false };
    if (step.kind === 'deliver') {
      const need = Math.max(1, Math.floor(Number(step.amount) || 1));
      const have = deliverHave(model.player, step);
      return { ok: have >= need, have: have, need: need, combatReady: false };
    }
    if (step.kind === 'combat') {
      const kills = enemyKillCount(model, step.enemyId);
      const baseline = Math.max(
        0,
        Math.floor(Number(mission.combatBaselines[step.enemyId]) ||
          Number(mission.combatKillBaseline) || 0)
      );
      const ready = kills > baseline;
      return { ok: ready, have: kills - baseline, need: 1, combatReady: ready };
    }
    return { ok: false, have: 0, need: 0, combatReady: false };
  }

  function refreshMissionBoard(model, helpers, deps) {
    const state = clone(model);
    const playerSect = state.systems && state.systems.sects &&
      state.systems.sects.player;
    if (!playerSect || !playerSect.sectId) {
      return response(false, 'not_in_sect', model);
    }
    const content = missionContent(deps);
    const combat = combatContent(deps);
    const realmStage = playerRealmStage(state);
    // 强制重刷：清空 period 以重建看板与解析结果。
    const mission = ensureMissionState(playerSect);
    mission.boardPeriod = -1;
    ensureBoard(
      playerSect,
      playerSect.sectId,
      content,
      combat,
      nowSeconds(helpers, state),
      realmStage
    );
    return response(true, 'ok', state);
  }

  function acceptMission(model, missionId, helpers, deps) {
    const state = clone(model);
    const playerSect = state.systems && state.systems.sects &&
      state.systems.sects.player;
    if (!playerSect || !playerSect.sectId) {
      return response(false, 'not_in_sect', model);
    }
    const content = missionContent(deps);
    const combat = combatContent(deps);
    const realmStage = playerRealmStage(state);
    const at = nowSeconds(helpers, state);
    const mission = ensureBoard(
      playerSect,
      playerSect.sectId,
      content,
      combat,
      at,
      realmStage
    );
    const definition = content.get(missionId);
    if (!definition || definition.sectId !== playerSect.sectId) {
      return response(false, 'unknown_mission', model);
    }
    if (mission.boardOfferIds.indexOf(missionId) < 0) {
      return response(false, 'unknown_mission', state);
    }
    if (mission.boardStatuses[missionId] === 'completed') {
      return response(false, 'mission_done', state);
    }
    if (mission.status === 'active' && mission.missionId) {
      return response(false, 'mission_busy', state);
    }
    const resolved = resolvedFor(
      mission,
      missionId,
      content,
      combat,
      realmStage,
      playerSect.sectId + ':' + mission.boardPeriod + ':' + missionId
    );
    if (!resolved) return response(false, 'unknown_mission', state);
    mission.missionId = missionId;
    mission.stepIndex = 0;
    mission.status = 'active';
    mission.activeResolved = clone(resolved);
    mission.combatKillBaseline = 0;
    mission.combatBaselines = {};
    (resolved.steps || []).forEach(function (step) {
      if (step.kind === 'combat' && step.enemyId) {
        mission.combatBaselines[step.enemyId] = enemyKillCount(
          state,
          step.enemyId
        );
      }
    });
    Object.keys(mission.boardStatuses).forEach(function (id) {
      if (mission.boardStatuses[id] === 'active') {
        mission.boardStatuses[id] = 'available';
      }
    });
    mission.boardStatuses[missionId] = 'active';
    return response(true, 'ok', state, { missionId: missionId });
  }

  function abandonMission(model) {
    const state = clone(model);
    const playerSect = state.systems && state.systems.sects &&
      state.systems.sects.player;
    if (!playerSect) return response(false, 'invalid_state', model);
    const mission = ensureMissionState(playerSect);
    if (mission.missionId && mission.boardStatuses[mission.missionId] === 'active') {
      mission.boardStatuses[mission.missionId] = 'available';
    }
    mission.missionId = null;
    mission.stepIndex = 0;
    mission.status = 'idle';
    mission.combatKillBaseline = 0;
    mission.combatBaselines = {};
    mission.activeResolved = null;
    return response(true, 'ok', state);
  }

  function markCombatBaseline(model, deps) {
    const state = clone(model);
    const playerSect = state.systems && state.systems.sects &&
      state.systems.sects.player;
    if (!playerSect || !playerSect.sectId) {
      return response(false, 'not_in_sect', model);
    }
    const content = missionContent(deps);
    const combat = combatContent(deps);
    const mission = ensureMissionState(playerSect);
    if (mission.status !== 'active' || !mission.missionId) {
      return response(false, 'no_active_mission', model);
    }
    const resolved = resolvedFor(
      mission,
      mission.missionId,
      content,
      combat,
      playerRealmStage(state),
      mission.missionId
    );
    if (!resolved) return response(false, 'unknown_mission', model);
    const combatStep = (resolved.steps || []).find(function (step) {
      return step.kind === 'combat' &&
        !stepProgress(state, mission, step).ok;
    });
    if (!combatStep) return response(false, 'not_combat_step', state);
    if (!mission.combatBaselines[combatStep.enemyId] &&
        mission.combatBaselines[combatStep.enemyId] !== 0) {
      mission.combatBaselines[combatStep.enemyId] = enemyKillCount(
        state,
        combatStep.enemyId
      );
    }
    mission.combatKillBaseline = mission.combatBaselines[combatStep.enemyId];
    return response(true, 'ok', state, {
      regionId: combatStep.regionId,
      enemyId: combatStep.enemyId,
      actionKey: 'combat:region:' + combatStep.regionId + ':' +
        combatStep.enemyId
    });
  }

  function finishMissionRewards(state, playerSect, resolved) {
    const rewards = resolved.rewards || {};
    const sectId = playerSect.sectId;
    playerSect.contribution[sectId] =
      (Number(playerSect.contribution[sectId]) || 0) +
      (Number(rewards.contribution) || 0);
    playerSect.lifetimeContribution =
      (Number(playerSect.lifetimeContribution) || 0) +
      (Number(rewards.contribution) || 0);
    playerSect.reputation[sectId] =
      (Number(playerSect.reputation[sectId]) || 0) +
      (Number(rewards.reputation) || 0);
    if (Number(rewards.lingshi) > 0 && state.player) {
      state.player.lingshi = (Number(state.player.lingshi) || 0) +
        Number(rewards.lingshi);
    }
    const mission = ensureMissionState(playerSect);
    if (mission.completedMissionIds.indexOf(resolved.id) < 0) {
      mission.completedMissionIds.push(resolved.id);
    }
    mission.boardStatuses[resolved.id] = 'completed';
    mission.missionId = null;
    mission.stepIndex = 0;
    mission.status = 'idle';
    mission.combatKillBaseline = 0;
    mission.combatBaselines = {};
    mission.activeResolved = null;
  }

  function claimMission(model, helpers, deps) {
    const state = clone(model);
    const playerSect = state.systems && state.systems.sects &&
      state.systems.sects.player;
    if (!playerSect || !playerSect.sectId) {
      return response(false, 'not_in_sect', model);
    }
    const content = missionContent(deps);
    const combat = combatContent(deps);
    const mission = ensureMissionState(playerSect);
    if (mission.status !== 'active' || !mission.missionId) {
      return response(false, 'no_active_mission', model);
    }
    const resolved = resolvedFor(
      mission,
      mission.missionId,
      content,
      combat,
      playerRealmStage(state),
      mission.missionId
    );
    if (!resolved) return response(false, 'unknown_mission', model);
    const player = state.player || {};
    const steps = resolved.steps || [];
    for (let i = 0; i < steps.length; i++) {
      if (!stepProgress(state, mission, steps[i]).ok) {
        return response(
          false,
          steps[i].kind === 'combat' ? 'combat_incomplete' : 'materials_short',
          state
        );
      }
    }
    for (let j = 0; j < steps.length; j++) {
      if (steps[j].kind !== 'deliver') continue;
      if (!consumeDeliver(player, steps[j])) {
        return response(false, 'materials_short', state);
      }
    }
    finishMissionRewards(state, playerSect, resolved);
    return response(true, 'mission_complete', state, {
      missionId: resolved.id,
      rewards: resolved.rewards || {}
    });
  }

  // 兼容旧逐步推进接口：等同整单交付。
  function advanceStep(model, deps, options) {
    return claimMission(model, null, deps);
  }

  function describeObjective(step) {
    if (!step) return '';
    if (step.kind === 'deliver') return step.label || '上交物资';
    if (step.kind === 'combat') return step.label || '完成战斗挑战';
    return step.label || '完成目标';
  }

  function buildMissionCard(model, mission, resolved, status) {
    const steps = (resolved.steps || []).map(function (step, index) {
      const progress = stepProgress(model, mission, step);
      return {
        index: index,
        kind: step.kind,
        label: describeObjective(step),
        family: step.family || null,
        hint: step.hint || '',
        examples: Array.isArray(step.examples) ? step.examples.slice() : [],
        stackId: step.stackId || null,
        amount: step.amount || null,
        regionId: step.regionId || null,
        enemyId: step.enemyId || null,
        have: progress.have,
        need: progress.need,
        ok: progress.ok,
        combatReady: progress.combatReady
      };
    });
    const canClaim = status === 'active' &&
      steps.length > 0 &&
      steps.every(function (step) { return step.ok; });
    const pendingCombat = status === 'active'
      ? steps.find(function (step) {
        return step.kind === 'combat' && !step.ok;
      })
      : null;
    return {
      id: resolved.id,
      name: resolved.name,
      description: resolved.description,
      status: status,
      statusLabel: status === 'completed'
        ? '已完成'
        : (status === 'active'
          ? (canClaim ? '可交付' : '进行中')
          : '可接取'),
      steps: steps,
      canClaim: canClaim,
      canAccept: status === 'available',
      pendingCombat: pendingCombat || null,
      rewards: resolved.rewards || {},
      realmStage: resolved.realmStage,
      objectiveText: steps.map(function (step) {
        return step.label;
      }).join(' · ')
    };
  }

  function buildMissionView(model, sectId, deps, helpers) {
    const content = missionContent(deps);
    const combat = combatContent(deps);
    const playerSect = model && model.systems && model.systems.sects &&
      model.systems.sects.player;
    if (!playerSect || playerSect.sectId !== sectId) {
      return {
        offers: [],
        active: null,
        refreshSeconds: refreshSeconds(content),
        needsRefresh: false,
        nextRefreshIn: 0
      };
    }
    const at = nowSeconds(helpers, model);
    const period = Math.floor(at / refreshSeconds(content));
    const realmStage = playerRealmStage(model);
    const mission = ensureMissionState(playerSect);
    const needsRefresh = mission.boardPeriod !== period ||
      mission.boardOfferIds.length !== boardSize(content) ||
      !mission.boardResolved ||
      !Object.keys(mission.boardResolved).length;
    let offerIds;
    if (needsRefresh) {
      offerIds = pickBoardOffers(sectId, period, content, realmStage);
    } else {
      offerIds = mission.boardOfferIds.slice();
    }
    if (mission.status === 'active' && mission.missionId &&
        offerIds.indexOf(mission.missionId) < 0) {
      offerIds[offerIds.length - 1] = mission.missionId;
    }
    const resolvedMap = needsRefresh
      ? (function () {
        const map = {};
        offerIds.forEach(function (id) {
          map[id] = resolveDefinition(
            content.get(id),
            content,
            combat,
            realmStage,
            sectId + ':' + period + ':' + id
          );
        });
        return map;
      })()
      : mission.boardResolved;
    if (mission.status === 'active' && mission.missionId && mission.activeResolved) {
      resolvedMap[mission.missionId] = mission.activeResolved;
    }
    const offers = offerIds.map(function (id) {
      const resolved = resolvedMap[id];
      if (!resolved) return null;
      let status = 'available';
      if (!needsRefresh && mission.boardStatuses[id]) {
        status = mission.boardStatuses[id];
      }
      if (mission.status === 'active' && mission.missionId === id) {
        status = 'active';
      }
      return buildMissionCard(model, mission, resolved, status);
    }).filter(Boolean);
    const active = offers.find(function (row) {
      return row.status === 'active';
    }) || null;
    const elapsedInPeriod = at % refreshSeconds(content);
    return {
      offers: offers,
      active: active,
      refreshSeconds: refreshSeconds(content),
      needsRefresh: needsRefresh,
      nextRefreshIn: Math.max(0, refreshSeconds(content) - elapsedInPeriod)
    };
  }

  return Object.freeze({
    SKILL_ALIASES: SKILL_ALIASES,
    emptyMission: emptyMission,
    ensureMissionState: ensureMissionState,
    evaluateJoinRequirements: evaluateJoinRequirements,
    evaluateRequirement: evaluateRequirement,
    skillLevel: skillLevel,
    refreshMissionBoard: refreshMissionBoard,
    acceptMission: acceptMission,
    abandonMission: abandonMission,
    markCombatBaseline: markCombatBaseline,
    claimMission: claimMission,
    advanceStep: advanceStep,
    buildMissionView: buildMissionView,
    enemyKillCount: enemyKillCount,
    scaleAmount: scaleAmount,
    scaleRewards: scaleRewards,
    resolveDefinition: resolveDefinition
  });
});
