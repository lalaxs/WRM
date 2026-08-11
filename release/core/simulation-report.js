(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SimulationReport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STOP_REASONS = Object.freeze({
    MANUAL: 'manual',
    SWITCHED: 'switched',
    COMPLETED: 'completed',
    RESOURCE_DEPLETED: 'resource_depleted',
    MATERIALS_EXHAUSTED: 'materials_exhausted',
    SUPPLY_EXHAUSTED: 'supply_exhausted',
    DEFEATED: 'defeated',
    INJURED: 'injured',
    LIFESPAN_BUFFER: 'lifespan_buffer',
    INVALID_ACTION: 'invalid_action',
    REQUIREMENTS_INVALID: 'requirements_invalid',
    SIMULATION_GUARD: 'simulation_guard'
  });
  const STOP_REASON_VALUES = Object.freeze(Object.keys(STOP_REASONS).map(function (key) {
    return STOP_REASONS[key];
  }));
  const DEFAULT_ARCHIVE_LIMIT = 50;

  function isRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function finiteNumber(value, fallback, min) {
    if (value == null) return fallback;
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min == null ? -Infinity : min, number);
  }

  function finiteInteger(value, fallback, min) {
    const number = finiteNumber(value, fallback, min);
    return Number.isFinite(number) ? Math.floor(number) : fallback;
  }

  function cleanString(value, fallback) {
    return typeof value === 'string' && value.length > 0 ? value : fallback;
  }

  function defineEnumerable(target, key, value) {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }

  function safeFiniteAdd(left, right) {
    const first = finiteNumber(left, 0);
    const second = finiteNumber(right, 0);
    const sum = first + second;
    if (Number.isFinite(sum)) return sum;
    if (first >= 0 && second >= 0) return Number.MAX_VALUE;
    if (first <= 0 && second <= 0) return -Number.MAX_VALUE;
    return 0;
  }

  function sanitizeJson(value) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }
    if (Array.isArray(value)) {
      const result = [];
      value.forEach(function (item) {
        const clean = sanitizeJson(item);
        if (clean !== undefined) result.push(clean);
      });
      return result;
    }
    if (!isRecord(value)) return undefined;
    const result = {};
    Object.keys(value).forEach(function (key) {
      const clean = sanitizeJson(value[key]);
      if (clean !== undefined) defineEnumerable(result, key, clean);
    });
    return result;
  }

  function cleanArray(value) {
    return Array.isArray(value) ? sanitizeJson(value) : [];
  }

  function cleanStringArray(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(function (item) {
      return typeof item === 'string' && item.length > 0;
    });
  }

  function cleanNumberMap(value) {
    const result = {};
    if (!isRecord(value)) return result;
    Object.keys(value).forEach(function (key) {
      if (!key) return;
      const amount = finiteNumber(value[key], null);
      if (amount !== null) defineEnumerable(result, key, amount);
    });
    return result;
  }

  function hashText(text) {
    let hash = 0x811C9DC5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  function decimalText(value, fallback, min) {
    return finiteNumber(value, fallback, min).toString();
  }

  function identityPart(value) {
    const text = String(value);
    return text.length + ':' + text;
  }

  function reportId(meta) {
    const source = cleanString(meta && meta.source, 'online');
    const fromMs = finiteNumber(meta && meta.fromMs, 0, 0);
    const toMs = finiteNumber(meta && meta.toMs, 0, 0);
    const actionKey = cleanString(meta && meta.actionKey, '');
    const seedBefore = finiteNumber(meta && meta.seedBefore, 0) >>> 0;
    if (!Number.isInteger(fromMs) || !Number.isInteger(toMs)) {
      return 'sim-exact-' + [
        source,
        decimalText(fromMs, 0, 0),
        decimalText(toMs, 0, 0),
        actionKey,
        seedBefore
      ].map(identityPart).join('');
    }
    return 'sim-' + hashText([
      source,
      fromMs,
      toMs,
      actionKey,
      seedBefore
    ].join('|'));
  }

  function create(meta) {
    const source = isRecord(meta) ? meta : {};
    return {
      id: reportId(source),
      source: cleanString(source.source, 'online'),
      fromMs: finiteNumber(source.fromMs, 0, 0),
      toMs: finiteNumber(source.toMs, 0, 0),
      requestedSeconds: finiteNumber(source.requestedSeconds, 0, 0),
      mainActionSeconds: 0,
      cappedSeconds: 0,
      action: {
        key: cleanString(source.actionKey, null),
        completed: 0,
        stopReason: null,
        stopAtMs: null
      },
      gains: {
        items: {},
        skillXp: {},
        masteryXp: {},
        cultivation: 0
      },
      costs: {
        items: {},
        supplies: {}
      },
      levels: [],
      unlocks: [],
      passive: {
        fishRecovered: 0,
        farmCompleted: [],
        parallelCompleted: [],
        injuryRecovered: false
      },
      combat: {
        ticks: 0,
        enemiesDefeated: {},
        dungeonClears: {},
        damageDealt: 0,
        damageTaken: 0,
        suppliesUsed: {},
        loot: {},
        pendingLootId: null,
        retreatReason: null
      },
      techniques: {
        xp: {}
      },
      social: {
        completed: [],
        relationshipChanges: [],
        misunderstandings: []
      },
      world: {
        ticks: 0,
        events: [],
        newPending: 0,
        evolution: 0,
        npcChanges: 0,
        sectChanges: 0
      },
      lifecycle: {
        playerYears: 0,
        playerBufferEntered: false,
        births: [],
        adulthood: [],
        legacyTransitionId: null
      },
      warnings: []
    };
  }

  function isStructured(raw) {
    return typeof raw.id === 'string' ||
      isRecord(raw.action) ||
      isRecord(raw.gains) ||
      Object.prototype.hasOwnProperty.call(raw, 'source');
  }

  function normalizeLegacy(raw, meta) {
    const numericKeys = Object.keys(raw).filter(function (key) {
      return typeof raw[key] === 'number' && Number.isFinite(raw[key]);
    });
    if (numericKeys.length === 0) return null;
    const key = numericKeys[0];
    const savedAt = finiteNumber(meta && meta.savedAt, 0, 0);
    const report = create({
      source: cleanString(meta && meta.source, 'offline'),
      fromMs: savedAt,
      toMs: savedAt,
      requestedSeconds: 0,
      actionKey: key,
      seedBefore: finiteNumber(meta && meta.seedBefore, 0)
    });
    report.action.completed = finiteInteger(raw[key], 0, 0);
    report.warnings.push('legacy_offline_report_migrated');
    return report;
  }

  function normalize(raw, meta) {
    if (!isRecord(raw)) return null;
    if (!isStructured(raw)) return normalizeLegacy(raw, meta);

    const rawAction = isRecord(raw.action) ? raw.action : {};
    const report = create({
      source: cleanString(raw.source, cleanString(meta && meta.source, 'online')),
      fromMs: finiteNumber(
        raw.fromMs,
        finiteNumber(meta && meta.fromMs, 0, 0),
        0
      ),
      toMs: finiteNumber(
        raw.toMs,
        finiteNumber(meta && meta.toMs, 0, 0),
        0
      ),
      requestedSeconds: finiteNumber(
        raw.requestedSeconds,
        finiteNumber(meta && meta.requestedSeconds, 0, 0),
        0
      ),
      actionKey: cleanString(rawAction.key, cleanString(meta && meta.actionKey, null)),
      seedBefore: finiteNumber(meta && meta.seedBefore, 0)
    });

    report.id = cleanString(raw.id, report.id);
    report.mainActionSeconds = finiteNumber(raw.mainActionSeconds, 0, 0);
    report.cappedSeconds = finiteNumber(raw.cappedSeconds, 0, 0);
    report.action.completed = finiteInteger(rawAction.completed, 0, 0);
    if (rawAction.stopReason != null) {
      report.action.stopReason = STOP_REASON_VALUES.includes(rawAction.stopReason)
        ? rawAction.stopReason
        : STOP_REASONS.INVALID_ACTION;
    }
    report.action.stopAtMs = finiteNumber(rawAction.stopAtMs, null, 0);

    const rawGains = isRecord(raw.gains) ? raw.gains : {};
    report.gains.items = cleanNumberMap(rawGains.items);
    report.gains.skillXp = cleanNumberMap(rawGains.skillXp);
    report.gains.masteryXp = cleanNumberMap(rawGains.masteryXp);
    report.gains.cultivation = finiteNumber(rawGains.cultivation, 0, 0);

    const rawCosts = isRecord(raw.costs) ? raw.costs : {};
    report.costs.items = cleanNumberMap(rawCosts.items);
    report.costs.supplies = cleanNumberMap(rawCosts.supplies);
    report.levels = cleanArray(raw.levels);
    report.unlocks = cleanArray(raw.unlocks);

    const rawPassive = isRecord(raw.passive) ? raw.passive : {};
    report.passive.fishRecovered = finiteNumber(rawPassive.fishRecovered, 0, 0);
    report.passive.farmCompleted = cleanArray(rawPassive.farmCompleted);
    report.passive.parallelCompleted = cleanArray(rawPassive.parallelCompleted);
    report.passive.injuryRecovered =
      rawPassive.injuryRecovered === true;

    const rawCombat = isRecord(raw.combat) ? raw.combat : {};
    report.combat.ticks = finiteInteger(rawCombat.ticks, 0, 0);
    report.combat.enemiesDefeated = cleanNumberMap(
      rawCombat.enemiesDefeated
    );
    report.combat.dungeonClears = cleanNumberMap(
      rawCombat.dungeonClears
    );
    report.combat.damageDealt = finiteNumber(
      rawCombat.damageDealt,
      0,
      0
    );
    report.combat.damageTaken = finiteNumber(
      rawCombat.damageTaken,
      0,
      0
    );
    report.combat.suppliesUsed = cleanNumberMap(
      rawCombat.suppliesUsed
    );
    report.combat.loot = cleanNumberMap(rawCombat.loot);
    report.combat.pendingLootId = cleanString(
      rawCombat.pendingLootId,
      null
    );
    report.combat.retreatReason = cleanString(
      rawCombat.retreatReason,
      null
    );

    const rawTechniques = isRecord(raw.techniques)
      ? raw.techniques
      : {};
    report.techniques.xp = cleanNumberMap(rawTechniques.xp);

    const rawSocial = isRecord(raw.social) ? raw.social : {};
    report.social.completed = cleanArray(rawSocial.completed);
    report.social.relationshipChanges = cleanArray(
      rawSocial.relationshipChanges
    );
    report.social.misunderstandings = cleanArray(
      rawSocial.misunderstandings
    );

    const rawWorld = isRecord(raw.world) ? raw.world : {};
    report.world.ticks = finiteInteger(rawWorld.ticks, 0, 0);
    report.world.events = cleanArray(rawWorld.events);
    report.world.newPending = finiteInteger(rawWorld.newPending, 0, 0);
    report.world.evolution = finiteInteger(rawWorld.evolution, 0, 0);
    report.world.npcChanges = finiteInteger(rawWorld.npcChanges, 0, 0);
    report.world.sectChanges = finiteInteger(rawWorld.sectChanges, 0, 0);
    const rawLifecycle = isRecord(raw.lifecycle) ? raw.lifecycle : {};
    report.lifecycle.playerYears = finiteNumber(
      rawLifecycle.playerYears,
      0,
      0
    );
    report.lifecycle.playerBufferEntered =
      rawLifecycle.playerBufferEntered === true;
    report.lifecycle.births = cleanArray(rawLifecycle.births);
    report.lifecycle.adulthood = cleanArray(rawLifecycle.adulthood);
    report.lifecycle.legacyTransitionId = cleanString(
      rawLifecycle.legacyTransitionId,
      null
    );
    report.warnings = cleanStringArray(raw.warnings);
    return report;
  }

  function addCount(report, section, key, amount) {
    if (!isRecord(report) || !isRecord(report.gains)) return report;
    const value = finiteNumber(amount, null);
    if (value === null) return report;

    if (section === 'cultivation') {
      const current = finiteNumber(report.gains.cultivation, 0);
      report.gains.cultivation = safeFiniteAdd(current, value);
      return report;
    }

    if (!['items', 'skillXp', 'masteryXp'].includes(section) ||
        typeof key !== 'string' || key.length === 0 ||
        !isRecord(report.gains[section])) {
      return report;
    }
    const current = Object.prototype.hasOwnProperty.call(report.gains[section], key)
      ? report.gains[section][key]
      : 0;
    defineEnumerable(
      report.gains[section],
      key,
      safeFiniteAdd(current, value)
    );
    return report;
  }

  function stop(report, reason, atMs) {
    if (!isRecord(report) || !isRecord(report.action)) return report;
    report.action.stopReason = STOP_REASON_VALUES.includes(reason)
      ? reason
      : STOP_REASONS.INVALID_ACTION;
    report.action.stopAtMs = finiteNumber(atMs, null, 0);
    return report;
  }

  function normalizedUnique(candidates) {
    const unique = [];
    const seen = new Set();
    candidates.forEach(function (candidate) {
      const report = normalize(candidate);
      if (!report || seen.has(report.id)) return;
      seen.add(report.id);
      unique.push(report);
    });
    return unique;
  }

  function addPending(existing, report) {
    const candidates = Array.isArray(existing) ? existing.slice() : [];
    if (report != null) candidates.push(report);
    return sanitizeJson(normalizedUnique(candidates)) || [];
  }

  function archive(existing, reports, limit) {
    const max = limit === undefined
      ? DEFAULT_ARCHIVE_LIMIT
      : finiteInteger(limit, 0, 0);
    if (max <= 0) return [];
    const candidates = Array.isArray(existing) ? existing.slice() : [];
    if (Array.isArray(reports)) candidates.push.apply(candidates, reports);
    else if (reports != null) candidates.push(reports);
    const unique = normalizedUnique(candidates);
    return sanitizeJson(unique.slice(-max)) || [];
  }

  function addMap(target, source) {
    Object.keys(source).forEach(function (key) {
      const current = Object.prototype.hasOwnProperty.call(target, key)
        ? target[key]
        : 0;
      defineEnumerable(target, key, safeFiniteAdd(current, source[key]));
    });
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  function summarize(reports) {
    const candidates = Array.isArray(reports) ? reports : [];
    const unique = normalizedUnique(candidates);
    const summary = {
      reportIds: [],
      requestedSeconds: 0,
      mainActionSeconds: 0,
      cappedSeconds: 0,
      action: {
        completed: 0,
        byKey: {},
        stops: []
      },
      gains: {
        items: {},
        skillXp: {},
        masteryXp: {},
        cultivation: 0
      },
      costs: {
        items: {},
        supplies: {}
      },
      levels: [],
      unlocks: [],
      passive: {
        fishRecovered: 0,
        farmCompleted: [],
        parallelCompleted: [],
        injuryRecovered: false
      },
      combat: {
        ticks: 0,
        enemiesDefeated: {},
        dungeonClears: {},
        damageDealt: 0,
        damageTaken: 0,
        suppliesUsed: {},
        loot: {},
        pendingLootId: null,
        retreatReason: null
      },
      techniques: {
        xp: {}
      },
      social: {
        completed: [],
        relationshipChanges: [],
        misunderstandings: []
      },
      world: {
        ticks: 0,
        events: [],
        newPending: 0,
        evolution: 0,
        npcChanges: 0,
        sectChanges: 0
      },
      lifecycle: {
        playerYears: 0,
        playerBufferEntered: false,
        births: [],
        adulthood: [],
        legacyTransitionId: null
      },
      warnings: []
    };

    unique.forEach(function (report) {
      summary.reportIds.push(report.id);
      summary.requestedSeconds = safeFiniteAdd(
        summary.requestedSeconds,
        report.requestedSeconds
      );
      summary.mainActionSeconds = safeFiniteAdd(
        summary.mainActionSeconds,
        report.mainActionSeconds
      );
      summary.cappedSeconds = safeFiniteAdd(
        summary.cappedSeconds,
        report.cappedSeconds
      );
      summary.action.completed = safeFiniteAdd(
        summary.action.completed,
        report.action.completed
      );
      if (report.action.key) {
        const byKey = summary.action.byKey;
        const current = Object.prototype.hasOwnProperty.call(
          byKey,
          report.action.key
        ) ? byKey[report.action.key] : 0;
        defineEnumerable(
          byKey,
          report.action.key,
          safeFiniteAdd(current, report.action.completed)
        );
      }
      if (report.action.stopReason) {
        summary.action.stops.push({
          reportId: report.id,
          key: report.action.key,
          reason: report.action.stopReason,
          atMs: report.action.stopAtMs
        });
      }
      addMap(summary.gains.items, report.gains.items);
      addMap(summary.gains.skillXp, report.gains.skillXp);
      addMap(summary.gains.masteryXp, report.gains.masteryXp);
      summary.gains.cultivation = safeFiniteAdd(
        summary.gains.cultivation,
        report.gains.cultivation
      );
      addMap(summary.costs.items, report.costs.items);
      addMap(summary.costs.supplies, report.costs.supplies);
      summary.levels.push.apply(summary.levels, report.levels);
      summary.unlocks.push.apply(summary.unlocks, report.unlocks);
      summary.passive.fishRecovered = safeFiniteAdd(
        summary.passive.fishRecovered,
        report.passive.fishRecovered
      );
      summary.passive.farmCompleted.push.apply(
        summary.passive.farmCompleted,
        report.passive.farmCompleted
      );
      summary.passive.parallelCompleted.push.apply(
        summary.passive.parallelCompleted,
        report.passive.parallelCompleted
      );
      summary.passive.injuryRecovered =
        summary.passive.injuryRecovered ||
        report.passive.injuryRecovered;
      summary.combat.ticks = safeFiniteAdd(
        summary.combat.ticks,
        report.combat.ticks
      );
      addMap(
        summary.combat.enemiesDefeated,
        report.combat.enemiesDefeated
      );
      addMap(
        summary.combat.dungeonClears,
        report.combat.dungeonClears
      );
      summary.combat.damageDealt = safeFiniteAdd(
        summary.combat.damageDealt,
        report.combat.damageDealt
      );
      summary.combat.damageTaken = safeFiniteAdd(
        summary.combat.damageTaken,
        report.combat.damageTaken
      );
      addMap(
        summary.combat.suppliesUsed,
        report.combat.suppliesUsed
      );
      addMap(summary.combat.loot, report.combat.loot);
      if (report.combat.pendingLootId !== null) {
        summary.combat.pendingLootId = report.combat.pendingLootId;
      }
      if (report.combat.retreatReason !== null) {
        summary.combat.retreatReason = report.combat.retreatReason;
      }
      addMap(summary.techniques.xp, report.techniques.xp);
      summary.social.completed.push.apply(
        summary.social.completed,
        report.social.completed
      );
      summary.social.relationshipChanges.push.apply(
        summary.social.relationshipChanges,
        report.social.relationshipChanges
      );
      summary.social.misunderstandings.push.apply(
        summary.social.misunderstandings,
        report.social.misunderstandings
      );
      summary.world.ticks = safeFiniteAdd(
        summary.world.ticks,
        report.world.ticks
      );
      summary.world.newPending = safeFiniteAdd(
        summary.world.newPending,
        report.world.newPending
      );
      summary.world.evolution = safeFiniteAdd(
        summary.world.evolution,
        report.world.evolution
      );
      summary.world.npcChanges = safeFiniteAdd(
        summary.world.npcChanges,
        report.world.npcChanges
      );
      summary.world.sectChanges = safeFiniteAdd(
        summary.world.sectChanges,
        report.world.sectChanges
      );
      summary.world.events.push.apply(summary.world.events, report.world.events);
      summary.lifecycle.playerYears = safeFiniteAdd(
        summary.lifecycle.playerYears,
        report.lifecycle.playerYears
      );
      summary.lifecycle.playerBufferEntered =
        summary.lifecycle.playerBufferEntered ||
        report.lifecycle.playerBufferEntered;
      summary.lifecycle.births.push.apply(
        summary.lifecycle.births,
        report.lifecycle.births
      );
      summary.lifecycle.adulthood.push.apply(
        summary.lifecycle.adulthood,
        report.lifecycle.adulthood
      );
      if (report.lifecycle.legacyTransitionId !== null) {
        summary.lifecycle.legacyTransitionId =
          report.lifecycle.legacyTransitionId;
      }
      summary.warnings.push.apply(summary.warnings, report.warnings);
    });

    return deepFreeze(sanitizeJson(summary));
  }

  return Object.freeze({
    STOP_REASONS,
    create,
    normalize,
    addCount,
    stop,
    addPending,
    archive,
    summarize
  });
});
