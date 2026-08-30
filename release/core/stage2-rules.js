(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    let proxyDetector = null;
    try {
      proxyDetector = require('node:util').types.isProxy;
    } catch (error) {
      proxyDetector = null;
    }
    module.exports = factory(proxyDetector);
  } else if (root) {
    root.Stage2Rules = factory(null);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  proxyDetector
) {
  'use strict';

  const STOP = Object.freeze({
    COMPLETED: 'completed',
    RESOURCE_DEPLETED: 'resource_depleted',
    MATERIALS_EXHAUSTED: 'materials_exhausted',
    INVALID_ACTION: 'invalid_action',
    REQUIREMENTS_INVALID: 'requirements_invalid'
  });
  const RESOURCE_SKILLS = Object.freeze([
    'herb', 'mining', 'woodcutting'
  ]);
  const REQUIRED_DEPS = Object.freeze([
    'GameRules',
    'Gathering',
    'Production',
    'Farm',
    'Formations',
    'SpiritBeasts',
    'GatheringContent',
    'RecipeContent',
    'HomesteadContent',
    'Inventory',
    'SkillProgression',
    'GameRandom'
  ]);
  const FISH_PENDING_KEY = '__stage2FishRecovered';
  const FARM_PENDING_KEY = '__stage2FarmCompleted';

  function own(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
  }

  function define(target, key, value) {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }

  function isDetectedProxy(value) {
    if (typeof proxyDetector !== 'function') return false;
    try {
      return proxyDetector(value) === true;
    } catch (error) {
      return true;
    }
  }

  function isRecord(value) {
    try {
      if (!value ||
          typeof value !== 'object' ||
          Array.isArray(value) ||
          isDetectedProxy(value)) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      return prototype === null ||
        prototype === Object.prototype ||
        Object.getPrototypeOf(prototype) === null;
    } catch (error) {
      return false;
    }
  }

  function dataValue(target, key) {
    try {
      if ((!isRecord(target) && typeof target !== 'function') ||
          !own(target, key)) {
        return undefined;
      }
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      return descriptor && own(descriptor, 'value')
        ? descriptor.value
        : undefined;
    } catch (error) {
      return undefined;
    }
  }

  function cloneJson(value, ancestors) {
    if (value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new TypeError('Stage 2 state must contain finite numbers');
      }
      return value;
    }
    if (typeof value !== 'object' || isDetectedProxy(value)) {
      throw new TypeError('Stage 2 state must be JSON-safe');
    }
    const seen = ancestors || new Set();
    if (seen.has(value)) {
      throw new TypeError('Stage 2 state must not contain cycles');
    }
    seen.add(value);
    try {
      if (Array.isArray(value)) {
        const result = [];
        for (let index = 0; index < value.length; index++) {
          const descriptor = Object.getOwnPropertyDescriptor(
            value,
            String(index)
          );
          if (!descriptor || !own(descriptor, 'value')) {
            throw new TypeError(
              'Stage 2 state must contain only data properties'
            );
          }
          result.push(cloneJson(descriptor.value, seen));
        }
        return result;
      }
      if (!isRecord(value)) {
        throw new TypeError('Stage 2 state must contain plain records');
      }
      const result = {};
      Object.keys(value).forEach(function (key) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !own(descriptor, 'value')) {
          throw new TypeError(
            'Stage 2 state must contain only data properties'
          );
        }
        define(result, key, cloneJson(descriptor.value, seen));
      });
      return result;
    } finally {
      seen.delete(value);
    }
  }

  function replaceRecord(target, source) {
    Object.keys(target).forEach(function (key) {
      delete target[key];
    });
    Object.keys(source).forEach(function (key) {
      define(target, key, source[key]);
    });
  }

  function snapshotDependencies(deps) {
    if (!isRecord(deps)) {
      throw new TypeError('deps must be a plain object');
    }
    const result = {};
    REQUIRED_DEPS.forEach(function (key) {
      const value = dataValue(deps, key);
      if (!value ||
          (typeof value !== 'object' && typeof value !== 'function') ||
          isDetectedProxy(value)) {
        throw new TypeError('deps.' + key + ' is required');
      }
      define(result, key, value);
    });
    return result;
  }

  function requireFunction(target, key, label) {
    const value = dataValue(target, key);
    if (typeof value !== 'function') {
      throw new TypeError(label + '.' + key + ' must be a function');
    }
    return value;
  }

  function finiteNumber(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  function decimalParts(value) {
    const pieces = value.toString().toLowerCase().split('e');
    const coefficient = pieces[0];
    const scientificExponent = pieces.length > 1
      ? Number(pieces[1])
      : 0;
    const decimalAt = coefficient.indexOf('.');
    const fractionalDigits = decimalAt < 0
      ? 0
      : coefficient.length - decimalAt - 1;
    return {
      units: BigInt(coefficient.replace('.', '')),
      exponent: scientificExponent - fractionalDigits
    };
  }

  function decimalOperation(left, right, operation) {
    const leftParts = decimalParts(left);
    const rightParts = decimalParts(right);
    const exponent = Math.min(leftParts.exponent, rightParts.exponent);
    const leftUnits = leftParts.units *
      (10n ** BigInt(leftParts.exponent - exponent));
    const rightUnits = rightParts.units *
      (10n ** BigInt(rightParts.exponent - exponent));
    const units = operation === 'add'
      ? leftUnits + rightUnits
      : leftUnits - rightUnits;
    return Number(units.toString() + 'e' + exponent);
  }

  function addDecimalNumbers(left, right) {
    return decimalOperation(left, right, 'add');
  }

  function subtractDecimalNumbers(left, right) {
    return decimalOperation(left, right, 'subtract');
  }

  function multiplyDecimalByInteger(value, multiplier) {
    const parts = decimalParts(value);
    return Number(
      (parts.units * BigInt(multiplier)).toString() +
      'e' + parts.exponent
    );
  }

  function advanceTimestampMs(startMs, seconds) {
    const parts = decimalParts(seconds);
    return addDecimalNumbers(
      startMs,
      Number(parts.units.toString() + 'e' + (parts.exponent + 3))
    );
  }

  function timestampTolerance(left, right) {
    return Number.EPSILON * 8 * Math.max(
      Number.MIN_VALUE,
      Math.abs(left),
      Math.abs(right)
    );
  }

  function timeTolerance(left, right) {
    return Number.EPSILON * 32 * Math.max(
      1,
      Math.abs(left),
      Math.abs(right)
    );
  }

  function ensureElapsedAnchor(current, nowMs) {
    const elapsed = Math.max(0, finiteNumber(current.elapsed, 0));
    const hasAnchor = Number.isFinite(current.elapsedAnchorMs) &&
      current.elapsedAnchorMs >= 0 &&
      current.elapsedAnchorMs <= nowMs +
        timestampTolerance(current.elapsedAnchorMs, nowMs) &&
      Number.isFinite(current.elapsedBaseSeconds);
    const implied = hasAnchor
      ? current.elapsedBaseSeconds +
        subtractDecimalNumbers(nowMs, current.elapsedAnchorMs) / 1000
      : null;
    if (!hasAnchor ||
        Math.abs(elapsed - implied) > timeTolerance(elapsed, implied)) {
      current.elapsedAnchorMs = nowMs;
      current.elapsedBaseSeconds = elapsed;
    }
    current.elapsed = elapsed;
  }

  function elapseCurrent(current, seconds, nowMs) {
    ensureElapsedAnchor(current, nowMs);
    current.elapsed = current.elapsedBaseSeconds +
      subtractDecimalNumbers(
        advanceTimestampMs(nowMs, seconds),
        current.elapsedAnchorMs
      ) / 1000;
  }

  function currentBoundary(current, duration, nowMs) {
    ensureElapsedAnchor(current, nowMs);
    if (current.elapsed >= duration) return 0;
    const deadlineMs = addDecimalNumbers(
      current.elapsedAnchorMs,
      (duration - current.elapsedBaseSeconds) * 1000
    );
    const effectiveNow = Math.abs(nowMs - current.elapsedAnchorMs) <=
      timestampTolerance(nowMs, current.elapsedAnchorMs)
      ? current.elapsedAnchorMs
      : nowMs;
    return Math.max(
      0,
      subtractDecimalNumbers(deadlineMs, effectiveNow) / 1000
    );
  }

  function completeCurrentDuration(current, duration, nowMs) {
    const elapsed = finiteNumber(current.elapsed, 0);
    const rawRemainder = elapsed - duration;
    const tolerance = Number.EPSILON * Math.max(
      1,
      Math.abs(elapsed),
      Math.abs(duration)
    ) * 8;
    const remainder = Math.abs(rawRemainder) <= tolerance
      ? 0
      : Math.max(0, rawRemainder);
    const anchorMs = Number.isFinite(current.elapsedAnchorMs)
      ? current.elapsedAnchorMs
      : null;
    const baseSeconds = Number.isFinite(current.elapsedBaseSeconds)
      ? current.elapsedBaseSeconds
      : null;
    const completionMs =
      remainder === 0 &&
      anchorMs != null &&
      baseSeconds != null &&
      baseSeconds <= duration
        ? addDecimalNumbers(
          anchorMs,
          (duration - baseSeconds) * 1000
        )
        : nowMs;
    current.elapsed = remainder;
    current.elapsedAnchorMs = completionMs;
    current.elapsedBaseSeconds = remainder;
  }

  function progressLevel(player, skillId) {
    const skills = player && player.skills;
    const progress = skills && skills[skillId];
    return progress && Number.isFinite(progress.level)
      ? Math.max(1, Math.floor(progress.level))
      : 1;
  }

  function masteryProgress(player, skillId, masteryId) {
    const group = player &&
      player.mastery &&
      player.mastery[skillId];
    if (!group || typeof masteryId !== 'string') return null;
    const prefix = skillId + ':';
    const storageId = masteryId.indexOf(prefix) === 0
      ? masteryId.slice(prefix.length)
      : masteryId;
    return group[storageId] || null;
  }

  function progressDuration(
    effectiveDuration,
    player,
    skillId,
    masteryId,
    baseSeconds,
    reduction
  ) {
    const mastery = masteryProgress(player, skillId, masteryId);
    const masteryLevel = mastery &&
      Number.isFinite(mastery.level)
      ? mastery.level
      : 1;
    const duration = effectiveDuration(
      baseSeconds,
      progressLevel(player, skillId),
      masteryLevel
    );
    const clean = Number.isFinite(duration) && duration > 0
      ? duration
      : Math.max(0.5, finiteNumber(baseSeconds, 0.5));
    const cappedReduction = Math.min(
      0.95,
      Math.max(0, finiteNumber(reduction, 0))
    );
    return Math.max(0.5, Number(
      (clean * (1 - cappedReduction)).toFixed(3)
    ));
  }

  function canonicalAction(key, finite) {
    return {
      key,
      mode: finite ? 'finite' : 'repeat',
      count: finite ? 1 : 0,
      done: 0,
      elapsed: 0,
      elapsedAnchorMs: null,
      elapsedBaseSeconds: null,
      stalled: false
    };
  }

  function hasRemaining(current) {
    return Boolean(current) &&
      (
        current.mode === 'repeat' ||
        (
          current.mode === 'finite' &&
          Number.isFinite(current.count) &&
          Number.isFinite(current.done) &&
          current.done < current.count
        )
      );
  }

  function addMap(target, source) {
    if (!isRecord(source)) return;
    Object.keys(source).forEach(function (key) {
      const amount = finiteNumber(source[key], 0);
      if (amount === 0) return;
      target[key] = finiteNumber(target[key], 0) + amount;
    });
  }

  function copyEconomy(result, report) {
    const gains = result && result.gains;
    const costs = result && result.costs;
    if (isRecord(gains)) {
      addMap(report.gains.items, gains.items);
      addMap(report.gains.skillXp, gains.skillXp);
      addMap(report.gains.masteryXp, gains.masteryXp);
      report.gains.cultivation += finiteNumber(gains.cultivation, 0);
    }
    if (isRecord(costs)) {
      addMap(report.costs.items, costs.items);
      addMap(report.costs.supplies, costs.supplies);
    }
    if (Array.isArray(result && result.levels)) {
      report.levels.push.apply(report.levels, result.levels);
    }
    if (Array.isArray(result && result.unlocks)) {
      report.unlocks.push.apply(report.unlocks, result.unlocks);
    }
    if (Array.isArray(result && result.warnings)) {
      report.warnings.push.apply(report.warnings, result.warnings);
    }
  }

  function create(deps) {
    const safeDeps = snapshotDependencies(deps);
    const gameRulesConfig = dataValue(deps, 'gameRulesConfig');
    if (!isRecord(gameRulesConfig)) {
      throw new TypeError('deps.gameRulesConfig must be a plain object');
    }
    const gameRulesCreate = requireFunction(
      safeDeps.GameRules,
      'create',
      'deps.GameRules'
    );
    const gatheringCreate = requireFunction(
      safeDeps.Gathering,
      'create',
      'deps.Gathering'
    );
    const productionCreate = requireFunction(
      safeDeps.Production,
      'create',
      'deps.Production'
    );
    const farmAdvance = requireFunction(
      safeDeps.Farm,
      'advance',
      'deps.Farm'
    );
    const recordFormationCrafted = requireFunction(
      safeDeps.Formations,
      'recordCrafted',
      'deps.Formations'
    );
    const formationEffects = requireFunction(
      safeDeps.Formations,
      'effects',
      'deps.Formations'
    );
    const beastEffects = requireFunction(
      safeDeps.SpiritBeasts,
      'effects',
      'deps.SpiritBeasts'
    );
    const tryBeastEncounter = requireFunction(
      safeDeps.SpiritBeasts,
      'tryEncounter',
      'deps.SpiritBeasts'
    );
    const completeTame = requireFunction(
      safeDeps.SpiritBeasts,
      'completeTame',
      'deps.SpiritBeasts'
    );
    const completeTraining = requireFunction(
      safeDeps.SpiritBeasts,
      'completeTraining',
      'deps.SpiritBeasts'
    );
    const effectiveDuration = requireFunction(
      safeDeps.SkillProgression,
      'effectiveDuration',
      'deps.SkillProgression'
    );
    const randomNext = requireFunction(
      safeDeps.GameRandom,
      'next',
      'deps.GameRandom'
    );
    const availableQuantity = requireFunction(
      safeDeps.Inventory,
      'availableQuantity',
      'deps.Inventory'
    );
    const baseRuntime = gameRulesCreate(gameRulesConfig);
    if (!isRecord(baseRuntime) ||
        !isRecord(baseRuntime.rules) ||
        !Array.isArray(baseRuntime.lanes)) {
      throw new TypeError('deps.GameRules.create returned an invalid runtime');
    }
    [
      'getAction',
      'nextBoundary',
      'elapse',
      'inspect',
      'complete',
      'random'
    ].forEach(function (key) {
      requireFunction(baseRuntime.rules, key, 'baseRuntime.rules');
    });

    const gathering = gatheringCreate({
      GatheringContent: safeDeps.GatheringContent,
      Inventory: safeDeps.Inventory,
      SkillProgression: safeDeps.SkillProgression,
      GameRandom: safeDeps.GameRandom
    });
    // Construct eagerly so malformed production dependencies fail at the
    // composition boundary, even before the first production action starts.
    const productionDeps = {
      RecipeContent: safeDeps.RecipeContent,
      Inventory: safeDeps.Inventory,
      SkillProgression: safeDeps.SkillProgression,
      GameRandom: safeDeps.GameRandom
    };
    if (isRecord(safeDeps.Equipment)) {
      productionDeps.Equipment = safeDeps.Equipment;
    }
    const production = productionCreate(productionDeps);

    const gatheringData = cloneJson(dataValue(
      safeDeps.GatheringContent,
      'GATHERING'
    ));
    const fishSpecies = cloneJson(dataValue(
      safeDeps.GatheringContent,
      'FISH_SPECIES'
    ));
    const rawLegacyAliases = dataValue(
      safeDeps.GatheringContent,
      'LEGACY_ENTRY_ALIASES'
    );
    const legacyEntryAliases = rawLegacyAliases == null
      ? {}
      : (cloneJson(rawLegacyAliases) || {});
    const recipes = cloneJson(dataValue(
      safeDeps.RecipeContent,
      'RECIPES'
    ));
    const homesteadBeasts = cloneJson(dataValue(
      safeDeps.HomesteadContent,
      'BEASTS'
    ));
    const homesteadFormations = cloneJson(dataValue(
      safeDeps.HomesteadContent,
      'FORMATIONS'
    ));
    if (!isRecord(gatheringData) ||
        !isRecord(fishSpecies) ||
        !isRecord(recipes) ||
        !isRecord(homesteadBeasts) ||
        !isRecord(homesteadFormations)) {
      throw new TypeError('Stage 2 content dependencies are invalid');
    }

    function entryFor(skillId, entryId) {
      if (RESOURCE_SKILLS.indexOf(skillId) < 0) return null;
      const family = gatheringData[skillId];
      if (!family || !Array.isArray(family.entries)) return null;
      for (let index = 0; index < family.entries.length; index++) {
        const entry = family.entries[index];
        if (entry && entry.id === entryId) return entry;
      }
      return null;
    }

    function resolveEntryId(skillId, entryId) {
      if (entryFor(skillId, entryId)) return entryId;
      const aliases = isRecord(legacyEntryAliases)
        ? legacyEntryAliases[skillId]
        : null;
      const resolved = isRecord(aliases) ? aliases[entryId] : null;
      return typeof resolved === 'string' && entryFor(skillId, resolved)
        ? resolved
        : null;
    }

    function fishingSpot(spotId) {
      const family = gatheringData.fishing;
      if (!family || !Array.isArray(family.spots)) return null;
      for (let index = 0; index < family.spots.length; index++) {
        const spot = family.spots[index];
        if (spot && spot.id === spotId) return spot;
      }
      return null;
    }

    function asSpotList(value) {
      if (value == null) return [];
      if (Array.isArray(value)) {
        return value.filter(function (row) {
          return isRecord(row);
        });
      }
      return isRecord(value) ? [value] : [];
    }

    function findHeldSpot(state, skillId, instanceId, entryId) {
      const system = state && state.systems && state.systems.gathering;
      const list = asSpotList(
        system && system.spots && system.spots[skillId]
      );
      if (typeof instanceId === 'string' && instanceId) {
        for (let index = 0; index < list.length; index++) {
          if (list[index].instanceId === instanceId) return list[index];
        }
      }
      if (typeof entryId === 'string' && entryId) {
        for (let index = 0; index < list.length; index++) {
          if (list[index].entryId === entryId &&
              finiteNumber(list[index].remaining, 0) > 0) {
            return list[index];
          }
        }
      }
      return null;
    }

    function parse(key) {
      if (typeof key !== 'string' || key.length === 0) return null;
      let match = /^gather:explore:(herb|mining|woodcutting)$/.exec(key);
      if (match) {
        const family = gatheringData[match[1]];
        return family && family.explore
          ? {
            key,
            kind: 'gather-explore',
            skillId: match[1],
            masteryId: family.explore.masteryId,
            baseSeconds: family.explore.time,
            finite: false
          }
          : null;
      }
      match = /^gather:collect:(herb|mining|woodcutting):([^:]+)$/
        .exec(key);
      if (match) {
        const skillId = match[1];
        const token = match[2];
        if (/^spot-\d+$/.test(token)) {
          return {
            key: 'gather:collect:' + skillId + ':' + token,
            kind: 'gather-collect',
            skillId: skillId,
            instanceId: token,
            entryId: null,
            masteryId: null,
            baseSeconds: null,
            unlockLevel: null,
            finite: false
          };
        }
        const entryId = resolveEntryId(skillId, token);
        const entry = entryId ? entryFor(skillId, entryId) : null;
        return entry
          ? {
            key: 'gather:collect:' + skillId + ':' + entryId,
            kind: 'gather-collect',
            skillId: skillId,
            instanceId: null,
            entryId: entryId,
            masteryId: entry.masteryId,
            baseSeconds: entry.time,
            unlockLevel: entry.unlockLevel,
            finite: false
          }
          : null;
      }
      match = /^fish:([^:]+)$/.exec(key);
      if (match) {
        const spot = fishingSpot(match[1]);
        const primary = spot &&
          Array.isArray(spot.drops) &&
          spot.drops[0];
        return spot
          ? {
            key,
            kind: 'fish',
            skillId: 'fishing',
            spotId: match[1],
            masteryId: primary ? primary.itemId : null,
            baseSeconds: spot.time,
            unlockLevel: spot.unlockLevel,
            finite: false
          }
          : null;
      }
      match = /^produce:([^:]+):([^:]+)$/.exec(key);
      if (match && own(recipes, match[1] + ':' + match[2])) {
        const recipe = recipes[match[1] + ':' + match[2]];
        return recipe && recipe.id === key.slice('produce:'.length)
          ? {
            key,
            kind: 'produce',
            skillId: recipe.skillId,
            recipeId: recipe.id,
            masteryId: recipe.masteryId,
            baseSeconds: recipe.baseSeconds,
            unlockLevel: recipe.unlockLevel,
            finite: false
          }
          : null;
      }
      match = /^beast:tame:([^:]+)$/.exec(key);
      if (match) {
        return {
          key,
          kind: 'beast-tame',
          skillId: 'beastTaming',
          encounterId: match[1],
          finite: true
        };
      }
      match = /^beast:train:([^:]+)$/.exec(key);
      if (match) {
        return {
          key,
          kind: 'beast-train',
          skillId: 'beastTaming',
          beastId: match[1],
          finite: false
        };
      }
      return null;
    }

    function beastState(state) {
      return state &&
        state.systems &&
        state.systems.homestead &&
        state.systems.homestead.beasts;
    }

    function encounterFor(state, encounterId) {
      const beasts = beastState(state);
      const encounters = beasts && beasts.encounters;
      if (!Array.isArray(encounters)) return null;
      for (let index = 0; index < encounters.length; index++) {
        const encounter = encounters[index];
        if (encounter && encounter.id === encounterId) return encounter;
      }
      return null;
    }

    function beastFor(state, beastId) {
      const beasts = beastState(state);
      const roster = beasts && beasts.roster;
      if (!Array.isArray(roster)) return null;
      for (let index = 0; index < roster.length; index++) {
        const beast = roster[index];
        if (beast && beast.id === beastId) return beast;
      }
      return null;
    }

    function startRequirements(state, descriptor) {
      const player = state && state.player;
      if (!player) return false;
      if (descriptor.unlockLevel != null &&
          progressLevel(player, descriptor.skillId) <
            descriptor.unlockLevel) {
        return false;
      }
      if (descriptor.kind === 'gather-explore') {
        return true;
      }
      if (descriptor.kind === 'gather-collect') {
        const spot = findHeldSpot(
          state,
          descriptor.skillId,
          descriptor.instanceId,
          descriptor.entryId
        );
        if (!spot || finiteNumber(spot.remaining, 0) <= 0) return false;
        if (descriptor.instanceId &&
            spot.instanceId !== descriptor.instanceId) {
          return false;
        }
        if (descriptor.entryId && spot.entryId !== descriptor.entryId) {
          return false;
        }
        const entry = entryFor(descriptor.skillId, spot.entryId);
        return Boolean(entry);
      }
      if (descriptor.kind === 'beast-tame') {
        const encounter = encounterFor(state, descriptor.encounterId);
        return Boolean(
          encounter &&
          typeof encounter.speciesId === 'string' &&
          own(homesteadBeasts, encounter.speciesId)
        );
      }
      if (descriptor.kind === 'beast-train') {
        const beast = beastFor(state, descriptor.beastId);
        return Boolean(
          beast &&
          typeof beast.speciesId === 'string' &&
          own(homesteadBeasts, beast.speciesId)
        );
      }
      return true;
    }

    function scopedBeastEffects(state, domain, skillId) {
      const all = beastEffects(state);
      const selected = all && all[domain];
      const result = {};
      if (!selected || typeof selected !== 'object') return result;
      if (isRecord(selected.global)) {
        Object.keys(selected.global).forEach(function (key) {
          result[key] = finiteNumber(selected.global[key], 0);
        });
      }
      const local = selected.bySkill &&
        selected.bySkill[skillId];
      if (isRecord(local)) {
        Object.keys(local).forEach(function (key) {
          result[key] = finiteNumber(result[key], 0) +
            finiteNumber(local[key], 0);
        });
      }
      return result;
    }

    function descriptorDuration(state, descriptor) {
      if (!descriptor) return 0;
      const player = state.player;
      if (descriptor.kind === 'gather-explore' ||
          descriptor.kind === 'gather-collect') {
        const beast = scopedBeastEffects(
          state,
          'gathering',
          descriptor.skillId
        );
        let masteryId = descriptor.masteryId;
        let baseSeconds = descriptor.baseSeconds;
        if (descriptor.kind === 'gather-collect') {
          const spot = findHeldSpot(
            state,
            descriptor.skillId,
            descriptor.instanceId,
            descriptor.entryId
          );
          const entry = spot
            ? entryFor(descriptor.skillId, spot.entryId)
            : (descriptor.entryId
              ? entryFor(descriptor.skillId, descriptor.entryId)
              : null);
          if (entry) {
            masteryId = entry.masteryId;
            baseSeconds = entry.time;
          }
        }
        return progressDuration(
          effectiveDuration,
          player,
          descriptor.skillId,
          masteryId,
          baseSeconds,
          beast.gatheringDurationReduction
        );
      }
      if (descriptor.kind === 'fish') {
        return progressDuration(
          effectiveDuration,
          player,
          descriptor.skillId,
          descriptor.masteryId,
          descriptor.baseSeconds,
          0
        );
      }
      if (descriptor.kind === 'produce') {
        const formation = formationEffects(state);
        const beast = scopedBeastEffects(
          state,
          'production',
          descriptor.skillId
        );
        const reduction = Math.min(
          0.95,
          finiteNumber(formation.craftingDurationReduction, 0) +
            finiteNumber(beast.craftingDurationReduction, 0)
        );
        const duration = production.getDuration(
          player,
          descriptor.recipeId,
          { craftingDurationReduction: reduction }
        );
        return Number.isFinite(duration) && duration > 0 ? duration : 0.5;
      }
      if (descriptor.kind === 'beast-tame') {
        const encounter = encounterFor(state, descriptor.encounterId);
        const definition = encounter &&
          homesteadBeasts[encounter.speciesId];
        return definition
          ? progressDuration(
            effectiveDuration,
            player,
            'beastTaming',
            definition.masteryId,
            definition.tameSeconds,
            0
          )
          : 0.5;
      }
      if (descriptor.kind === 'beast-train') {
        const beast = beastFor(state, descriptor.beastId);
        const definition = beast && homesteadBeasts[beast.speciesId];
        return definition
          ? progressDuration(
            effectiveDuration,
            player,
            'beastTaming',
            definition.masteryId,
            definition.trainingSeconds,
            0
          )
          : 0.5;
      }
      return Math.max(0.5, descriptor.baseSeconds || 0.5);
    }

    function inventoryAvailable(state, itemId) {
      try {
        const quantity = availableQuantity(
          state.player.inventory,
          itemId
        );
        return Number.isSafeInteger(quantity) && quantity >= 0
          ? quantity
          : 0;
      } catch (error) {
        return 0;
      }
    }

    function hasProductionMaterials(state, recipe) {
      const ingredientIds = Object.keys(recipe.ingredients || {});
      for (let index = 0; index < ingredientIds.length; index++) {
        const itemId = ingredientIds[index];
        if (inventoryAvailable(state, itemId) <
            recipe.ingredients[itemId]) {
          return false;
        }
      }
      const groups = Array.isArray(recipe.ingredientChoices)
        ? recipe.ingredientChoices
        : [];
      for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        const group = groups[groupIndex];
        const choices = Array.isArray(group.itemIds) ? group.itemIds : [];
        const found = choices.some(function (itemId) {
          return inventoryAvailable(state, itemId) >= group.quantity;
        });
        if (!found) return false;
      }
      return true;
    }

    function materialsAvailable(state, descriptor) {
      if (descriptor.kind === 'produce') {
        return hasProductionMaterials(
          state,
          recipes[descriptor.recipeId]
        );
      }
      if (descriptor.kind === 'beast-tame') {
        const encounter = encounterFor(state, descriptor.encounterId);
        const definition = encounter &&
          homesteadBeasts[encounter.speciesId];
        return Boolean(definition) &&
          inventoryAvailable(state, definition.tamingItemId) >= 1;
      }
      if (descriptor.kind === 'beast-train') {
        const beast = beastFor(state, descriptor.beastId);
        const definition = beast && homesteadBeasts[beast.speciesId];
        return Boolean(definition) &&
          inventoryAvailable(state, definition.trainingItemId) >= 1;
      }
      return true;
    }

    function gatheringBonuses(state, skillId, domain) {
      const formation = formationEffects(state);
      const beast = scopedBeastEffects(
        state,
        domain || 'gathering',
        skillId
      );
      return {
        extraYieldChance:
          finiteNumber(formation.gatheringExtraYieldChance, 0) +
          finiteNumber(beast.gatheringExtraYieldChance, 0)
      };
    }

    function finishCurrent(state, descriptor, helpers) {
      const current = state.current;
      completeCurrentDuration(
        current,
        descriptor.duration,
        helpers.nowMs()
      );
      current.done = finiteNumber(current.done, 0) + 1;
      current.stalled = false;
      helpers.report.action.completed++;
      return hasRemaining(current) ? null : STOP.COMPLETED;
    }

    function commitReturnedRng(state, result) {
      if (result &&
          Number.isSafeInteger(result.rngState) &&
          result.rngState >= 0 &&
          result.rngState <= 0xFFFFFFFF) {
        state.rngState = result.rngState;
      }
    }

    function completeExplore(state, descriptor, helpers) {
      const result = gathering.explore(
        state,
        descriptor.skillId,
        state.rngState
      );
      commitReturnedRng(state, result);
      if (!result || result.ok !== true) {
        return { stopReason: STOP.REQUIREMENTS_INVALID };
      }
      replaceRecord(state, result.state);
      commitReturnedRng(state, result);
      copyEconomy(result, helpers.report);
      finishCurrent(state, descriptor, helpers);
      return {
        stopReason: result.code === 'spots_full_after_completion'
          ? STOP.REQUIREMENTS_INVALID
          : null
      };
    }

    function addWarningOnce(report, code) {
      if (report.warnings.indexOf(code) < 0) {
        report.warnings.push(code);
      }
    }

    function failureStop(result, helpers) {
      const code = result && result.code;
      if (code === 'resource_depleted') return STOP.RESOURCE_DEPLETED;
      if (code === 'spots_full') return STOP.REQUIREMENTS_INVALID;
      if (code === 'materials_exhausted') return STOP.MATERIALS_EXHAUSTED;
      if (code === 'inventory_full') {
        addWarningOnce(helpers.report, 'inventory_full');
        return STOP.REQUIREMENTS_INVALID;
      }
      return STOP.REQUIREMENTS_INVALID;
    }

    function applyEncounter(state, skillId) {
      const result = tryBeastEncounter(
        state,
        skillId,
        state.rngState
      );
      if (!result) return;
      commitReturnedRng(state, result);
      if (result.ok === true) {
        if (isRecord(result.state) && result.state !== state) {
          replaceRecord(state, result.state);
        }
        commitReturnedRng(state, result);
        return;
      }
      if ([
        'already_owned',
        'already_pending',
        'pending_cap'
      ].indexOf(result.code) >= 0) {
        return;
      }
    }

    function completeCollect(state, descriptor, helpers) {
      const spot = findHeldSpot(
        state,
        descriptor.skillId,
        descriptor.instanceId,
        descriptor.entryId
      );
      const targetId = spot
        ? spot.instanceId
        : (descriptor.instanceId || descriptor.entryId);
      const result = gathering.collect(
        state,
        descriptor.skillId,
        targetId,
        state.rngState,
        gatheringBonuses(state, descriptor.skillId, 'gathering')
      );
      commitReturnedRng(state, result);
      if (!result || result.ok !== true) {
        return { stopReason: failureStop(result, helpers) };
      }
      replaceRecord(state, result.state);
      commitReturnedRng(state, result);
      copyEconomy(result, helpers.report);
      const finalResource =
        result.code === 'resource_depleted_after_completion';
      finishCurrent(state, descriptor, helpers);
      applyEncounter(state, descriptor.skillId);
      return {
        stopReason: finalResource ? STOP.RESOURCE_DEPLETED : null
      };
    }

    function completeFish(state, descriptor, helpers) {
      const result = gathering.fish(
        state,
        descriptor.spotId,
        state.rngState,
        gatheringBonuses(state, 'fishing', 'fishing')
      );
      commitReturnedRng(state, result);
      if (!result || result.ok !== true) {
        return { stopReason: failureStop(result, helpers) };
      }
      replaceRecord(state, result.state);
      commitReturnedRng(state, result);
      copyEconomy(result, helpers.report);
      const stopReason = finishCurrent(state, descriptor, helpers);
      applyEncounter(state, 'fishing');
      return { stopReason };
    }

    function completeProduction(state, descriptor, helpers) {
      const beast = scopedBeastEffects(
        state,
        'production',
        descriptor.skillId
      );
      const result = production.complete(
        state.player,
        descriptor.recipeId,
        state.rngState,
        {
          materialRetentionChance: finiteNumber(
            beast.materialRetentionChance,
            0
          )
        }
      );
      commitReturnedRng(state, result);
      if (!result || result.ok !== true) {
        return { stopReason: failureStop(result, helpers) };
      }
      state.player = result.player;
      commitReturnedRng(state, result);
      copyEconomy(result, helpers.report);
      finishCurrent(state, descriptor, helpers);
      const recipe = recipes[descriptor.recipeId];
      const outputId = recipe && recipe.output && recipe.output.itemId;
      if (descriptor.skillId === 'formation' &&
          typeof outputId === 'string' &&
          own(homesteadFormations, outputId)) {
        const recorded = recordFormationCrafted(state, outputId);
        if (recorded && recorded.ok === true && isRecord(recorded.state)) {
          replaceRecord(state, recorded.state);
        }
      }
      return {
        stopReason: materialsAvailable(state, descriptor)
          ? null
          : STOP.MATERIALS_EXHAUSTED
      };
    }

    function fixedCost(before, after, itemId, report) {
      const spent = before - after;
      if (spent > 0) {
        report.costs.items[itemId] =
          finiteNumber(report.costs.items[itemId], 0) + spent;
      }
    }

    function completeBeastTame(state, descriptor, helpers) {
      const encounter = encounterFor(state, descriptor.encounterId);
      const definition = encounter &&
        homesteadBeasts[encounter.speciesId];
      const itemId = definition && definition.tamingItemId;
      const before = itemId ? inventoryAvailable(state, itemId) : 0;
      const result = completeTame(
        state,
        descriptor.encounterId,
        state.rngState
      );
      commitReturnedRng(state, result);
      if (!result || result.ok !== true) {
        return { stopReason: failureStop(result, helpers) };
      }
      replaceRecord(state, result.state);
      commitReturnedRng(state, result);
      copyEconomy(result, helpers.report);
      if (itemId) {
        fixedCost(
          before,
          inventoryAvailable(state, itemId),
          itemId,
          helpers.report
        );
      }
      return {
        stopReason: finishCurrent(state, descriptor, helpers)
      };
    }

    function completeBeastTraining(state, descriptor, helpers) {
      const beast = beastFor(state, descriptor.beastId);
      const definition = beast && homesteadBeasts[beast.speciesId];
      const itemId = definition && definition.trainingItemId;
      const before = itemId ? inventoryAvailable(state, itemId) : 0;
      const formations = formationEffects(state);
      const assistant = scopedBeastEffects(
        state,
        'beastTraining',
        'beastTaming'
      );
      const result = completeTraining(
        state,
        descriptor.beastId,
        state.rngState,
        {
          beastTrainingXpBonus: Math.min(
            0.50,
            finiteNumber(formations.beastTrainingXpBonus, 0) +
              finiteNumber(assistant.beastTrainingXpBonus, 0)
          )
        }
      );
      commitReturnedRng(state, result);
      if (!result || result.ok !== true) {
        return { stopReason: failureStop(result, helpers) };
      }
      replaceRecord(state, result.state);
      commitReturnedRng(state, result);
      copyEconomy(result, helpers.report);
      if (itemId) {
        fixedCost(
          before,
          inventoryAvailable(state, itemId),
          itemId,
          helpers.report
        );
      }
      finishCurrent(state, descriptor, helpers);
      return {
        stopReason: materialsAvailable(state, descriptor)
          ? null
          : STOP.MATERIALS_EXHAUSTED
      };
    }

    const stage2Rules = Object.freeze({
      start(state, key, nowMs) {
        const cloned = cloneJson(state);
        const descriptor = parse(key);
        if (!descriptor) {
          return {
            ok: false,
            code: STOP.INVALID_ACTION,
            state: cloned
          };
        }
        if (!startRequirements(cloned, descriptor)) {
          return {
            ok: false,
            code: STOP.REQUIREMENTS_INVALID,
            state: cloned
          };
        }
        const previous = cloned.current;
        if (previous &&
            previous.key === descriptor.key &&
            previous.mode === (descriptor.finite ? 'finite' : 'repeat')) {
          return { ok: true, code: 'no_change', state: cloned };
        }
        if (previous) {
          cloned.lastActionStop = {
            key: previous.key,
            reason: 'switched',
            atMs: Number.isFinite(nowMs) && nowMs >= 0 ? nowMs : 0
          };
          const systems = dataValue(cloned, 'systems');
          const combat = dataValue(systems, 'combat');
          const session = dataValue(combat, 'session');
          if (typeof dataValue(previous, 'key') === 'string' &&
              dataValue(previous, 'key').indexOf('combat:') === 0 &&
              isRecord(combat) &&
              own(combat, 'session') &&
              session !== null) {
            combat.session = null;
          }
        }
        cloned.current = canonicalAction(descriptor.key, descriptor.finite);
        return { ok: true, code: 'ok', state: cloned };
      },
      getAction(state) {
        const current = state && state.current;
        if (!current || typeof current.key !== 'string') return null;
        const descriptor = parse(current.key);
        if (!descriptor) {
          return {
            key: current.key,
            kind: 'unknown',
            duration: 0
          };
        }
        descriptor.duration = descriptorDuration(state, descriptor);
        return descriptor;
      },
      nextBoundary(state, descriptor, helpers) {
        return currentBoundary(
          state.current,
          descriptor.duration,
          helpers.nowMs()
        );
      },
      elapse(state, descriptor, seconds, helpers) {
        elapseCurrent(state.current, seconds, helpers.nowMs());
        state.current.stalled = false;
      },
      inspect(state, descriptor) {
        if (!descriptor || descriptor.kind === 'unknown') {
          return { status: 'stop', reason: STOP.INVALID_ACTION };
        }
        if (!hasRemaining(state.current)) {
          return { status: 'stop', reason: STOP.COMPLETED };
        }
        if (descriptor.kind === 'gather-collect') {
          const spot = findHeldSpot(
            state,
            descriptor.skillId,
            descriptor.instanceId,
            descriptor.entryId
          );
          if (!spot || finiteNumber(spot.remaining, 0) <= 0) {
            return {
              status: 'stop',
              reason: STOP.RESOURCE_DEPLETED
            };
          }
        } else if (!startRequirements(state, descriptor)) {
          return { status: 'stop', reason: STOP.REQUIREMENTS_INVALID };
        }
        if (!materialsAvailable(state, descriptor)) {
          return {
            status: 'stop',
            reason: STOP.MATERIALS_EXHAUSTED
          };
        }
        if (descriptor.kind === 'fish') {
          const stocks = state.systems.gathering.fishStocks;
          const spot = fishingSpot(descriptor.spotId);
          const available = spot.drops.some(function (drop) {
            return finiteNumber(stocks[drop.itemId], 0) > 0;
          });
          state.current.stalled = !available;
          if (!available) return { status: 'waiting', reason: null };
        }
        return { status: 'ready', reason: null };
      },
      complete(state, descriptor, helpers) {
        if (descriptor.kind === 'gather-explore') {
          return completeExplore(state, descriptor, helpers);
        }
        if (descriptor.kind === 'gather-collect') {
          return completeCollect(state, descriptor, helpers);
        }
        if (descriptor.kind === 'fish') {
          return completeFish(state, descriptor, helpers);
        }
        if (descriptor.kind === 'produce') {
          return completeProduction(state, descriptor, helpers);
        }
        if (descriptor.kind === 'beast-tame') {
          return completeBeastTame(state, descriptor, helpers);
        }
        if (descriptor.kind === 'beast-train') {
          return completeBeastTraining(state, descriptor, helpers);
        }
        return { stopReason: STOP.INVALID_ACTION };
      },
      random(state) {
        const drawn = randomNext(state.rngState);
        if (!drawn ||
            !Number.isFinite(drawn.value) ||
            !Number.isInteger(drawn.seed)) {
          return NaN;
        }
        state.rngState = drawn.seed;
        return drawn.value;
      }
    });

    function usesStage2Rules(descriptor) {
      return Boolean(
        descriptor &&
        typeof descriptor.key === 'string' &&
        parse(descriptor.key)
      );
    }

    function selectedRules(descriptor) {
      return usesStage2Rules(descriptor)
        ? stage2Rules
        : baseRuntime.rules;
    }

    const rules = Object.freeze({
      start: stage2Rules.start,
      getAction(state) {
        const current = state && state.current;
        return current &&
          typeof current.key === 'string' &&
          parse(current.key)
          ? stage2Rules.getAction(state)
          : baseRuntime.rules.getAction(state);
      },
      nextBoundary(state, descriptor, helpers) {
        return selectedRules(descriptor).nextBoundary(
          state,
          descriptor,
          helpers
        );
      },
      elapse(state, descriptor, seconds, helpers) {
        return selectedRules(descriptor).elapse(
          state,
          descriptor,
          seconds,
          helpers
        );
      },
      inspect(state, descriptor) {
        return selectedRules(descriptor).inspect(state, descriptor);
      },
      complete(state, descriptor, helpers) {
        return selectedRules(descriptor).complete(
          state,
          descriptor,
          helpers
        );
      },
      random(state) {
        return baseRuntime.rules.random(state);
      }
    });

    function formationBonuses(state) {
      const result = formationEffects(state);
      return isRecord(result) ? result : {};
    }

    function fishBonuses(state) {
      const formation = formationBonuses(state);
      const beast = scopedBeastEffects(state, 'fishing', 'fishing');
      return {
        fishRecoveryReduction: finiteNumber(
          formation.fishRecoveryReduction,
          0
        ),
        beastFishRecoveryReduction: finiteNumber(
          beast.fishRecoveryReduction,
          0
        )
      };
    }

    function allFishFull(state) {
      const stocks = state &&
        state.systems &&
        state.systems.gathering &&
        state.systems.gathering.fishStocks;
      if (!stocks) return true;
      const ids = Object.keys(fishSpecies);
      return ids.every(function (speciesId) {
        const species = fishSpecies[speciesId];
        return stocks[speciesId] >= species.maxStock;
      });
    }

    function fishInterval(state) {
      let base = Infinity;
      Object.keys(fishSpecies).forEach(function (speciesId) {
        base = Math.min(base, fishSpecies[speciesId].recoverSeconds);
      });
      const bonuses = fishBonuses(state);
      const combined = addDecimalNumbers(
        bonuses.fishRecoveryReduction,
        bonuses.beastFishRecoveryReduction
      );
      const reduction = Math.min(
        0.40,
        Math.max(0, combined)
      );
      return multiplyDecimalByInteger(
        subtractDecimalNumbers(1, reduction),
        base
      );
    }

    const fishRecoveryLane = Object.freeze({
      id: 'stage2-fish-recovery',
      nextBoundary(state) {
        if (isRecord(state[FISH_PENDING_KEY])) return 0;
        if (allFishFull(state)) return Infinity;
        const interval = fishInterval(state);
        const accumulator = Math.max(
          0,
          finiteNumber(
            state.systems.gathering.fishRecoverAcc,
            0
          )
        );
        if (accumulator < interval) {
          return subtractDecimalNumbers(interval, accumulator);
        }
        return Number.MIN_VALUE;
      },
      elapse(state, seconds, helpers) {
        const scheduledResolution =
          fishRecoveryLane.nextBoundary(state) <= seconds;
        const result = gathering.advanceFishStocks(
          state,
          seconds,
          fishBonuses(state)
        );
        if (!result || result.ok !== true) return;
        replaceRecord(state, result.state);
        const recovered = result.recovered;
        if (isRecord(recovered) && Object.keys(recovered).length > 0) {
          if (scheduledResolution) {
            define(state, FISH_PENDING_KEY, recovered);
          } else {
            Object.keys(recovered).forEach(function (speciesId) {
              helpers.report.passive.fishRecovered +=
                finiteNumber(recovered[speciesId], 0);
            });
          }
        }
      },
      resolve(state, helpers) {
        const recovered = state[FISH_PENDING_KEY];
        if (!isRecord(recovered)) return;
        Object.keys(recovered).forEach(function (speciesId) {
          helpers.report.passive.fishRecovered +=
            finiteNumber(recovered[speciesId], 0);
        });
        delete state[FISH_PENDING_KEY];
        const current = state.current;
        const descriptor = current &&
          typeof current.key === 'string'
          ? parse(current.key)
          : null;
        if (descriptor && descriptor.kind === 'fish') {
          const spot = fishingSpot(descriptor.spotId);
          const stocks = state.systems.gathering.fishStocks;
          current.stalled = !spot.drops.some(function (drop) {
            return finiteNumber(stocks[drop.itemId], 0) > 0;
          });
        }
      }
    });

    function farmPlots(state) {
      const plots = state &&
        state.systems &&
        state.systems.homestead &&
        state.systems.homestead.farm &&
        state.systems.homestead.farm.plots;
      return Array.isArray(plots) ? plots : [];
    }

    const farmGrowthLane = Object.freeze({
      id: 'stage2-farm-growth',
      nextBoundary(state) {
        if (Array.isArray(state[FARM_PENDING_KEY])) return 0;
        let boundary = Infinity;
        farmPlots(state).forEach(function (plot) {
          if (!plot ||
              plot.ready === true ||
              typeof plot.cropId !== 'string') {
            return;
          }
          const remaining = finiteNumber(plot.remainingSeconds, 0);
          if (remaining > 0 && remaining < boundary) {
            boundary = remaining;
          }
        });
        return boundary;
      },
      elapse(state, seconds, helpers) {
        const scheduledResolution =
          farmGrowthLane.nextBoundary(state) <= seconds;
        const result = farmAdvance(state, seconds);
        if (!result || !isRecord(result.state)) return;
        replaceRecord(state, result.state);
        if (Array.isArray(result.completed) &&
            result.completed.length > 0) {
          if (scheduledResolution) {
            define(state, FARM_PENDING_KEY, result.completed);
          } else {
            helpers.report.passive.farmCompleted.push.apply(
              helpers.report.passive.farmCompleted,
              result.completed
            );
          }
        }
      },
      resolve(state, helpers) {
        const completed = state[FARM_PENDING_KEY];
        if (!Array.isArray(completed)) return;
        helpers.report.passive.farmCompleted.push.apply(
          helpers.report.passive.farmCompleted,
          completed
        );
        delete state[FARM_PENDING_KEY];
      }
    });

    const stage2Lanes = [
      fishRecoveryLane,
      farmGrowthLane
    ];
    const lanes = Object.freeze(baseRuntime.lanes.filter(function (lane) {
      return lane && lane.id !== 'fish' && lane.id !== 'farm';
    }).concat(stage2Lanes));
    return Object.freeze({ rules, lanes });
  }

  return Object.freeze({ create });
});
