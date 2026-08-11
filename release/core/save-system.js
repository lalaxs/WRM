(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./stage2-state.js'),
      require('./stage3-state.js'),
      require('./stage4-state.js')
    )
    : factory(
      root && root.Stage2State,
      root && root.Stage3State,
      root && root.Stage4State
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SaveSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Stage2State,
  Stage3State,
  Stage4State
) {
  'use strict';

  const SCHEMA_VERSION = 5;
  const STAGE3_SCHEMA_VERSION = 4;
  const STAGE2_SCHEMA_VERSION = 3;
  const STAGE1B_SCHEMA_VERSION = 2;
  const MODEL_VERSION = 1;
  const SNAPSHOT_KEY = 'cloud_save_v1';
  const BACKUP_KEY = 'cloud_save_v1_backup';
  const DEFAULT_OFFLINE_LIMIT_SECONDS = 43200;
  const MAX_OFFLINE_LIMIT_SECONDS = 172800;
  const HAS_STAGE2_STATE = !!Stage2State &&
    typeof Stage2State.normalize === 'function' &&
    typeof Stage2State.normalizeActionKey === 'function';
  const HAS_STAGE3_STATE = HAS_STAGE2_STATE &&
    !!Stage3State &&
    typeof Stage3State.normalize === 'function' &&
    typeof Stage3State.migrateV3 === 'function' &&
    typeof Stage3State.normalizeActionKey === 'function';
  const HAS_STAGE4_STATE = HAS_STAGE3_STATE &&
    !!Stage4State &&
    Stage4State.VERSION === SCHEMA_VERSION &&
    typeof Stage4State.normalize === 'function' &&
    typeof Stage4State.migrateV4 === 'function' &&
    typeof Stage4State.validate === 'function' &&
    typeof Stage4State.snapshotJsonData === 'function';
  const ACTIVE_SCHEMA_VERSION = HAS_STAGE4_STATE
    ? SCHEMA_VERSION
    : HAS_STAGE3_STATE
      ? STAGE3_SCHEMA_VERSION
    : HAS_STAGE2_STATE ? STAGE2_SCHEMA_VERSION : STAGE1B_SCHEMA_VERSION;

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function finiteNumber(value, fallback, min) {
    if (value == null) return fallback;
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min == null ? -Infinity : min, number);
  }

  function cloneJson(value, fallback) {
    if (value == null) return fallback;
    if (!HAS_STAGE4_STATE) {
      try {
        return JSON.parse(JSON.stringify(value, function (key, item) {
          return typeof item === 'number' && !Number.isFinite(item)
            ? 0
            : item;
        }));
      } catch (error) {
        return fallback;
      }
    }
    const cloned = Stage4State.snapshotJsonData(value);
    return cloned === null ? fallback : cloned;
  }

  function record(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      if (prototype === null) return true;
      if (Object.getPrototypeOf(prototype) !== null) return false;
      const constructor = Object.prototype.hasOwnProperty.call(
        prototype,
        'constructor'
      ) ? prototype.constructor : null;
      return typeof constructor === 'function' &&
        Function.prototype.toString.call(constructor) ===
          Function.prototype.toString.call(Object);
    } catch (error) {
      return false;
    }
  }

  function dataValue(value, key) {
    if (!record(value)) return undefined;
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && own(descriptor, 'value')
        ? descriptor.value
        : undefined;
    } catch (error) {
      return undefined;
    }
  }

  function snapshotRecord(value) {
    if (!HAS_STAGE4_STATE) return record(value) ? value : null;
    const snapshot = Stage4State.snapshotJsonData(value);
    return record(snapshot) ? snapshot : null;
  }

  function normalizeAppearance(value) {
    const appearance = record(value) ? value : {};
    return { parts: cloneRecord(appearance.parts) };
  }

  function cloneRecord(value) {
    const cloned = cloneJson(value, null);
    return record(cloned) ? cloned : {};
  }

  function cloneArray(value) {
    const cloned = cloneJson(value, null);
    return Array.isArray(cloned) ? cloned : [];
  }

  function normalizeTimeAnchor(source, anchorKey, baseKey) {
    const value = record(source) ? source : {};
    if (!Number.isFinite(value[anchorKey]) ||
        value[anchorKey] < 0 ||
        !Number.isFinite(value[baseKey]) ||
        value[baseKey] < 0) {
      return { anchorMs: null, baseValue: null };
    }
    return {
      anchorMs: value[anchorKey],
      baseValue: value[baseKey]
    };
  }

  function writeNormalizedTimeAnchor(
    target,
    source,
    anchorKey,
    baseKey
  ) {
    const anchor = normalizeTimeAnchor(source, anchorKey, baseKey);
    target[anchorKey] = anchor.anchorMs;
    target[baseKey] = anchor.baseValue;
  }

  function normalizeTimedArray(value) {
    return cloneArray(value)
      .filter(function (item) {
        return validTimedEntryShape(item);
      })
      .map(function (item) {
        writeNormalizedTimeAnchor(
          item,
          item,
          'remainingAnchorMs',
          'remainingBaseSeconds'
        );
        return item;
      });
  }

  function normalizePlayer(value) {
    if (value == null) return null;
    if (!record(value)) return null;
    const player = cloneJson(value, {});
    writeNormalizedTimeAnchor(
      player,
      value,
      'moodAnchorMs',
      'moodBase'
    );
    if (value.shouMax === Infinity || value.shouMax === null) {
      player.shouMax = null;
      player.shouyuan = null;
      player.lifespanAnchorMs = null;
      player.lifespanBaseYears = null;
    } else {
      writeNormalizedTimeAnchor(
        player,
        value,
        'lifespanAnchorMs',
        'lifespanBaseYears'
      );
    }
    return player;
  }

  function normalizeSystems(
    value,
    legacy,
    includeStage2,
    includeStage3,
    includeStage4
  ) {
    const source = record(value) ? value : {};
    const gathering = record(source.gathering) ? source.gathering : {};
    const homestead = record(source.homestead) ? source.homestead : {};
    const farm = record(homestead.farm) ? homestead.farm : {};
    const formations = record(homestead.formations)
      ? homestead.formations
      : {};
    const beasts = record(homestead.beasts) ? homestead.beasts : {};
    const parallel = record(source.parallel) ? source.parallel : {};
    const world = record(source.world) ? source.world : {};
    const oldPlayer = record(legacy && legacy.player) ? legacy.player : {};
    const fishRecoverAnchor = normalizeTimeAnchor(
      gathering,
      'fishRecoverAnchorMs',
      'fishRecoverBaseSeconds'
    );
    const worldTickAnchor = normalizeTimeAnchor(
      world,
      'tickAnchorMs',
      'tickBaseSeconds'
    );

    const result = {
      gathering: {
        spots: cloneRecord(
          gathering.spots !== undefined ? gathering.spots : oldPlayer.spots
        ),
        fishStocks: cloneRecord(
          gathering.fishStocks !== undefined
            ? gathering.fishStocks
            : oldPlayer.fishing
        ),
        fishRecoverAcc: finiteNumber(
          gathering.fishRecoverAcc,
          finiteNumber(legacy && legacy.fishRecoverAcc, 0, 0),
          0
        ),
        fishRecoverAnchorMs: fishRecoverAnchor.anchorMs,
        fishRecoverBaseSeconds: fishRecoverAnchor.baseValue
      },
      homestead: {
        farm: {
          plots: normalizeTimedArray(farm.plots)
        },
        formations: {
          slots: cloneArray(formations.slots),
          owned: cloneArray(formations.owned)
        },
        beasts: {
          roster: cloneArray(beasts.roster),
          activeIds: cloneArray(beasts.activeIds)
        }
      },
      parallel: { jobs: normalizeTimedArray(parallel.jobs) },
      world: {
        tickAccumulator: finiteNumber(world.tickAccumulator, 0, 0),
        tickAnchorMs: worldTickAnchor.anchorMs,
        tickBaseSeconds: worldTickAnchor.baseValue
      }
    };
    if (includeStage2) {
      result.gathering.nextSpotId = gathering.nextSpotId;
      result.homestead.farm.unlockedPlots = farm.unlockedPlots;
      result.homestead.beasts.nextId = beasts.nextId;
      result.homestead.beasts.encounters = cloneArray(beasts.encounters);
    }
    if (includeStage3) {
      result.combat = cloneRecord(source.combat);
    }
    if (includeStage4) {
      result.npcs = cloneRecord(source.npcs);
      result.relationships = cloneRecord(source.relationships);
      result.events = cloneRecord(source.events);
      result.sects = cloneRecord(source.sects);
      result.social = cloneRecord(source.social);
      result.teamCombat = cloneRecord(source.teamCombat);
      result.world.elapsedSeconds = world.elapsedSeconds;
      result.world.activeAccumulator = world.activeAccumulator;
      result.world.backgroundAccumulator = world.backgroundAccumulator;
      result.world.sectAccumulator = world.sectAccumulator;
      result.world.eventAccumulator = world.eventAccumulator;
      result.world.regions = cloneRecord(world.regions);
    }
    return result;
  }

  function pendingReportKey(report) {
    if (record(report) &&
        typeof report.id === 'string' &&
        report.id.length > 0) {
      return 'id:' + report.id;
    }
    if (record(report)) {
      const legacyKey = Object.keys(report).find(function (key) {
        return typeof report[key] === 'number' &&
          Number.isFinite(report[key]);
      });
      if (legacyKey) return 'legacy:' + legacyKey;
    }
    try {
      return 'json:' + JSON.stringify(report);
    } catch (error) {
      return null;
    }
  }

  function normalizePendingEnvelope(source) {
    const candidates = [];
    const singular = source.pendingOfflineReport;
    if (record(singular) && Array.isArray(singular.reports)) {
      candidates.push.apply(candidates, singular.reports);
    } else if (singular != null) {
      candidates.push(singular);
    }
    if (Array.isArray(source.pendingOfflineReports)) {
      candidates.push.apply(candidates, source.pendingOfflineReports);
    }

    const reports = [];
    const seen = new Set();
    candidates.forEach(function (candidate) {
      const report = cloneJson(candidate, null);
      if (!record(report)) return;
      const key = pendingReportKey(report);
      if (key != null && seen.has(key)) return;
      if (key != null) seen.add(key);
      reports.push(report);
    });
    return {
      version: 1,
      reports
    };
  }

  const REPORT_STOP_REASONS = Object.freeze([
    'manual',
    'switched',
    'completed',
    'resource_depleted',
    'materials_exhausted',
    'supply_exhausted',
    'defeated',
    'injured',
    'lifespan_buffer',
    'invalid_action',
    'requirements_invalid',
    'simulation_guard'
  ]);

  function defineRecordValue(target, key, value) {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }

  function cleanReportString(value, fallback) {
    return typeof value === 'string' && value.length > 0
      ? value
      : fallback;
  }

  function reportNumber(value, fallback, integer) {
    const number = finiteNumber(value, fallback, 0);
    return integer ? Math.floor(number) : number;
  }

  function normalizeReportMap(value) {
    const result = {};
    if (!record(value)) return result;
    Object.keys(value).forEach(function (key) {
      if (!key) return;
      const amount = finiteNumber(value[key], null, 0);
      if (amount != null) defineRecordValue(result, key, amount);
    });
    return result;
  }

  function normalizeReportWarnings(value) {
    const warnings = [];
    cloneArray(value).forEach(function (warning) {
      if (typeof warning !== 'string' ||
          warning.length === 0 ||
          warnings.includes(warning)) {
        return;
      }
      warnings.push(warning);
    });
    return warnings;
  }

  function normalizeStage2Report(value, savedAt, index) {
    if (!record(value)) return null;
    const rawAction = record(value.action) ? value.action : {};
    const structured = typeof value.id === 'string' ||
      record(value.action) ||
      record(value.gains) ||
      Object.prototype.hasOwnProperty.call(value, 'source');
    let legacyKey = null;
    if (!structured) {
      legacyKey = Object.keys(value).find(function (key) {
        return typeof value[key] === 'number' &&
          Number.isFinite(value[key]);
      }) || null;
      if (!legacyKey) return null;
    }

    const source = cleanReportString(value.source, 'offline');
    const fromMs = reportNumber(value.fromMs, savedAt, false);
    const toMs = reportNumber(value.toMs, savedAt, false);
    const actionKey = legacyKey || cleanReportString(rawAction.key, null);
    const fallbackId = 'save-report-' + index + '-' + fromMs + '-' +
      toMs + '-' + (actionKey || 'none');
    const stopReason = rawAction.stopReason == null
      ? null
      : REPORT_STOP_REASONS.includes(rawAction.stopReason)
        ? rawAction.stopReason
        : 'invalid_action';
    const stopAtMs = rawAction.stopAtMs == null
      ? null
      : reportNumber(rawAction.stopAtMs, null, false);
    const rawGains = record(value.gains) ? value.gains : {};
    const rawCosts = record(value.costs) ? value.costs : {};
    const rawPassive = record(value.passive) ? value.passive : {};
    const rawWorld = record(value.world) ? value.world : {};
    const warnings = normalizeReportWarnings(value.warnings);
    if (legacyKey && !warnings.includes('legacy_offline_report_migrated')) {
      warnings.push('legacy_offline_report_migrated');
    }

    return {
      id: cleanReportString(value.id, fallbackId),
      source,
      fromMs,
      toMs,
      requestedSeconds: reportNumber(
        value.requestedSeconds,
        0,
        false
      ),
      mainActionSeconds: reportNumber(
        value.mainActionSeconds,
        0,
        false
      ),
      cappedSeconds: reportNumber(value.cappedSeconds, 0, false),
      action: {
        key: actionKey,
        completed: legacyKey
          ? reportNumber(value[legacyKey], 0, true)
          : reportNumber(rawAction.completed, 0, true),
        stopReason,
        stopAtMs
      },
      gains: {
        items: normalizeReportMap(rawGains.items),
        skillXp: normalizeReportMap(rawGains.skillXp),
        masteryXp: normalizeReportMap(rawGains.masteryXp),
        cultivation: reportNumber(rawGains.cultivation, 0, false)
      },
      costs: {
        items: normalizeReportMap(rawCosts.items),
        supplies: normalizeReportMap(rawCosts.supplies)
      },
      levels: cloneArray(value.levels),
      unlocks: cloneArray(value.unlocks),
      passive: {
        fishRecovered: reportNumber(
          rawPassive.fishRecovered,
          0,
          false
        ),
        farmCompleted: cloneArray(rawPassive.farmCompleted),
        parallelCompleted: cloneArray(rawPassive.parallelCompleted)
      },
      world: {
        ticks: reportNumber(rawWorld.ticks, 0, true),
        events: cloneArray(rawWorld.events)
      },
      warnings
    };
  }

  function normalizeStage2ReportList(value, savedAt) {
    return cloneArray(value).map(function (report, index) {
      return normalizeStage2Report(report, savedAt, index);
    }).filter(function (report) {
      return report !== null;
    });
  }

  function normalizeStage2PendingEnvelope(source, savedAt) {
    const envelope = normalizePendingEnvelope(source);
    return {
      version: 1,
      reports: normalizeStage2ReportList(envelope.reports, savedAt)
    };
  }

  function normalizeLastActionStop(value) {
    if (value == null) return null;
    return record(value) ? cloneJson(value, null) : null;
  }

  function safeLoad(adapter, key) {
    try {
      return adapter.load(key);
    } catch (error) {
      return null;
    }
  }

  function safeSave(adapter, key, value) {
    try {
      return adapter.save(key, value) !== false;
    } catch (error) {
      return false;
    }
  }

  function normalizeAction(raw) {
    const source = snapshotRecord(raw);
    if (!source ||
        typeof source.key !== 'string' ||
        !source.key) return null;
    const legacyRepeat = source.count == null ||
      source.count === Infinity;
    const mode = source.mode === 'repeat' || legacyRepeat
      ? 'repeat'
      : 'finite';
    const elapsedAnchor = normalizeTimeAnchor(
      source,
      'elapsedAnchorMs',
      'elapsedBaseSeconds'
    );
    const action = {
      key: source.key,
      mode,
      count: mode === 'repeat' ? 0 : Math.max(1, Math.floor(finiteNumber(source.count, 1, 1))),
      done: Math.floor(finiteNumber(source.done, 0, 0)),
      elapsed: finiteNumber(source.elapsed, 0, 0),
      elapsedAnchorMs: elapsedAnchor.anchorMs,
      elapsedBaseSeconds: elapsedAnchor.baseValue,
      stalled: !!source.stalled
    };
    if (record(source.context)) {
      action.context = cloneRecord(source.context);
    }
    return action;
  }

  function createBaseSnapshot(input, now, schemaVersion) {
    const source = snapshotRecord(input) || {};
    const savedAt = finiteNumber(now, Date.now(), 0);
    const stage2 = schemaVersion >= STAGE2_SCHEMA_VERSION;
    return {
      schemaVersion,
      savedAt,
      modelVersion: MODEL_VERSION,
      created: !!source.created,
      appearance: normalizeAppearance(source.appearance),
      player: normalizePlayer(source.player),
      current: normalizeAction(source.current),
      rngState: (finiteNumber(source.rngState, 0x6D2B79F5, 0) >>> 0) || 0x6D2B79F5,
      offlineLimitSeconds: Math.min(
        MAX_OFFLINE_LIMIT_SECONDS,
        finiteNumber(
          source.offlineLimitSeconds,
          DEFAULT_OFFLINE_LIMIT_SECONDS,
          DEFAULT_OFFLINE_LIMIT_SECONDS
        )
      ),
      systems: normalizeSystems(
        source.systems,
        source,
        schemaVersion >= STAGE2_SCHEMA_VERSION,
        schemaVersion >= STAGE3_SCHEMA_VERSION,
        schemaVersion >= SCHEMA_VERSION
      ),
      pendingOfflineReport: stage2
        ? normalizeStage2PendingEnvelope(source, savedAt)
        : normalizePendingEnvelope(source),
      reportArchive: stage2
        ? normalizeStage2ReportList(source.reportArchive, savedAt)
        : cloneArray(source.reportArchive),
      processedThroughMs: finiteNumber(
        source.processedThroughMs,
        finiteNumber(source.savedAt, now, 0),
        0
      ),
      lastActionStop: normalizeLastActionStop(source.lastActionStop)
    };
  }

  function createV2Snapshot(input, now) {
    return createBaseSnapshot(input, now, STAGE1B_SCHEMA_VERSION);
  }

  function createV3Snapshot(input, now) {
    const snapshot = createBaseSnapshot(input, now, STAGE2_SCHEMA_VERSION);
    if (snapshot.current) {
      const key = Stage2State.normalizeActionKey(snapshot.current.key);
      if (key) {
        snapshot.current.key = key;
      } else {
        const removedKey = snapshot.current.key;
        snapshot.current = null;
        discloseRemovedAction(snapshot, removedKey);
      }
    }
    return Stage2State.normalize(snapshot);
  }

  function createV4Snapshot(input, now) {
    const snapshot = createBaseSnapshot(
      input,
      now,
      STAGE3_SCHEMA_VERSION
    );
    if (snapshot.current) {
      const key = Stage2State.normalizeActionKey(snapshot.current.key) ||
        Stage3State.normalizeActionKey(snapshot.current.key);
      if (key) {
        snapshot.current.key = key;
      } else {
        const removedKey = snapshot.current.key;
        snapshot.current = null;
        discloseRemovedAction(snapshot, removedKey);
      }
    }
    return Stage3State.normalize(snapshot);
  }

  function removedActionReport(snapshot, actionKey) {
    const atMs = finiteNumber(
      snapshot.processedThroughMs,
      finiteNumber(snapshot.savedAt, 0, 0),
      0
    );
    return {
      id: 'legacy-action-removed-' + atMs + '-' + actionKey,
      source: 'offline',
      fromMs: atMs,
      toMs: atMs,
      requestedSeconds: 0,
      mainActionSeconds: 0,
      cappedSeconds: 0,
      action: {
        key: actionKey,
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
      costs: { items: {}, supplies: {} },
      levels: [],
      unlocks: [],
      passive: {
        fishRecovered: 0,
        farmCompleted: [],
        parallelCompleted: []
      },
      world: { ticks: 0, events: [] },
      warnings: ['legacy_action_removed']
    };
  }

  function discloseRemovedAction(snapshot, actionKey) {
    const envelope = record(snapshot.pendingOfflineReport)
      ? snapshot.pendingOfflineReport
      : { version: 1, reports: [] };
    if (!Array.isArray(envelope.reports)) envelope.reports = [];
    if (envelope.reports.length === 0) {
      envelope.reports.push(removedActionReport(snapshot, actionKey));
    } else {
      const first = record(envelope.reports[0])
        ? envelope.reports[0]
        : removedActionReport(snapshot, actionKey);
      first.warnings = Array.isArray(first.warnings)
        ? first.warnings.filter(function (warning) {
          return typeof warning === 'string' && warning.length > 0;
        })
        : [];
      if (!first.warnings.includes('legacy_action_removed')) {
        first.warnings.push('legacy_action_removed');
      }
      envelope.reports[0] = first;
    }
    snapshot.pendingOfflineReport = envelope;
  }

  function createSnapshot(input, now) {
    if (!HAS_STAGE2_STATE) return createV2Snapshot(input, now);
    if (!HAS_STAGE3_STATE) return createV3Snapshot(input, now);
    if (!HAS_STAGE4_STATE) return createV4Snapshot(input, now);
    const snapshot = createBaseSnapshot(input, now, SCHEMA_VERSION);
    if (snapshot.current) {
      const key = Stage2State.normalizeActionKey(snapshot.current.key) ||
        Stage3State.normalizeActionKey(snapshot.current.key);
      if (key) {
        snapshot.current.key = key;
      } else {
        const removedKey = snapshot.current.key;
        snapshot.current = null;
        discloseRemovedAction(snapshot, removedKey);
      }
    }
    return Stage4State.normalize(snapshot);
  }

  function recordOrNull(value) {
    return value === null || record(value);
  }

  function validAction(raw) {
    raw = snapshotRecord(raw);
    if (!raw) return false;
    const validMode = raw.mode === 'repeat' || raw.mode === 'finite';
    const validCount = Number.isInteger(raw.count) && (
      raw.mode === 'repeat' ? raw.count === 0 : raw.count >= 1
    );
    return (
      typeof raw.key === 'string' &&
      !!raw.key &&
      validMode &&
      validCount &&
      Number.isInteger(raw.done) &&
      raw.done >= 0 &&
      Number.isFinite(raw.elapsed) &&
      raw.elapsed >= 0 &&
      validOptionalTimeAnchor(
        raw,
        'elapsedAnchorMs',
        'elapsedBaseSeconds'
      ) &&
      typeof raw.stalled === 'boolean' &&
      (!own(raw, 'context') ||
        (record(raw.context) && validJsonValue(raw.context)))
    );
  }

  function validOptionalTimeAnchor(raw, anchorKey, baseKey) {
    const anchor = raw[anchorKey];
    const base = raw[baseKey];
    const absent = (anchor === undefined && base === undefined) ||
      (anchor === null && base === null);
    return absent || (
      Number.isFinite(anchor) &&
      anchor >= 0 &&
      Number.isFinite(base) &&
      base >= 0
    );
  }

  function validV1Snapshot(raw) {
    return (
      !!raw &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      raw.schemaVersion === 1 &&
      Number.isFinite(raw.savedAt) &&
      raw.savedAt >= 0 &&
      typeof raw.created === 'boolean' &&
      recordOrNull(raw.player) &&
      record(raw.appearance) &&
      record(raw.appearance.parts) &&
      (raw.current === null || validAction(raw.current)) &&
      Number.isInteger(raw.rngState) &&
      raw.rngState > 0 &&
      raw.rngState <= 0xFFFFFFFF &&
      Number.isFinite(raw.fishRecoverAcc) &&
      raw.fishRecoverAcc >= 0 &&
      recordOrNull(raw.pendingOfflineReport)
    );
  }

  function validSystems(raw) {
    return (
      record(raw) &&
      record(raw.gathering) &&
      record(raw.gathering.spots) &&
      record(raw.gathering.fishStocks) &&
      Number.isFinite(raw.gathering.fishRecoverAcc) &&
      raw.gathering.fishRecoverAcc >= 0 &&
      validOptionalTimeAnchor(
        raw.gathering,
        'fishRecoverAnchorMs',
        'fishRecoverBaseSeconds'
      ) &&
      record(raw.homestead) &&
      record(raw.homestead.farm) &&
      Array.isArray(raw.homestead.farm.plots) &&
      validTimedArrayAnchors(raw.homestead.farm.plots) &&
      record(raw.homestead.formations) &&
      Array.isArray(raw.homestead.formations.slots) &&
      Array.isArray(raw.homestead.formations.owned) &&
      record(raw.homestead.beasts) &&
      Array.isArray(raw.homestead.beasts.roster) &&
      Array.isArray(raw.homestead.beasts.activeIds) &&
      record(raw.parallel) &&
      Array.isArray(raw.parallel.jobs) &&
      validTimedArrayAnchors(raw.parallel.jobs) &&
      record(raw.world) &&
      Number.isFinite(raw.world.tickAccumulator) &&
      raw.world.tickAccumulator >= 0 &&
      validOptionalTimeAnchor(
        raw.world,
        'tickAnchorMs',
        'tickBaseSeconds'
      )
    );
  }

  function validTimedArrayAnchors(items) {
    return items.every(function (item) {
      return validTimedEntryShape(item) &&
        validOptionalTimeAnchor(
          item,
          'remainingAnchorMs',
          'remainingBaseSeconds'
        );
    });
  }

  function validTimedEntryShape(item) {
    return record(item) &&
      typeof item.id === 'string' &&
      item.id.trim().length > 0 &&
      Number.isFinite(item.remainingSeconds) &&
      item.remainingSeconds >= 0;
  }

  function validPlayerTimeAnchors(player) {
    return player === null || (
      record(player) &&
      validOptionalTimeAnchor(
        player,
        'moodAnchorMs',
        'moodBase'
      ) &&
      validOptionalTimeAnchor(
        player,
        'lifespanAnchorMs',
        'lifespanBaseYears'
      )
    );
  }

  function validLastActionStop(raw) {
    return raw === null || (
      record(raw) &&
      typeof raw.key === 'string' &&
      raw.key.length > 0 &&
      typeof raw.reason === 'string' &&
      raw.reason.length > 0 &&
      Number.isFinite(raw.atMs) &&
      raw.atMs >= 0
    );
  }

  function validV2Snapshot(raw) {
    return (
      !!raw &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      raw.schemaVersion === STAGE1B_SCHEMA_VERSION &&
      raw.modelVersion === MODEL_VERSION &&
      Number.isFinite(raw.savedAt) &&
      raw.savedAt >= 0 &&
      typeof raw.created === 'boolean' &&
      recordOrNull(raw.player) &&
      validPlayerTimeAnchors(raw.player) &&
      record(raw.appearance) &&
      record(raw.appearance.parts) &&
      (raw.current === null || validAction(raw.current)) &&
      Number.isInteger(raw.rngState) &&
      raw.rngState > 0 &&
      raw.rngState <= 0xFFFFFFFF &&
      Number.isFinite(raw.offlineLimitSeconds) &&
      raw.offlineLimitSeconds >= DEFAULT_OFFLINE_LIMIT_SECONDS &&
      raw.offlineLimitSeconds <= MAX_OFFLINE_LIMIT_SECONDS &&
      validSystems(raw.systems) &&
      record(raw.pendingOfflineReport) &&
      raw.pendingOfflineReport.version === 1 &&
      Array.isArray(raw.pendingOfflineReport.reports) &&
      Array.isArray(raw.reportArchive) &&
      Number.isFinite(raw.processedThroughMs) &&
      raw.processedThroughMs >= 0 &&
      validLastActionStop(raw.lastActionStop)
    );
  }

  function sameJson(left, right) {
    if (left === right) return true;
    if (typeof left !== typeof right ||
        left === null ||
        right === null ||
        typeof left !== 'object') {
      return false;
    }
    if (Array.isArray(left) || Array.isArray(right)) {
      return Array.isArray(left) &&
        Array.isArray(right) &&
        left.length === right.length &&
        left.every(function (item, index) {
          return sameJson(item, right[index]);
        });
    }
    if (!record(left) || !record(right)) return false;
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every(function (key, index) {
      return key === rightKeys[index] &&
        sameJson(left[key], right[key]);
    });
  }

  function exactKeys(value, keys) {
    if (!record(value)) return false;
    const actual = Object.keys(value).sort();
    const expected = keys.slice().sort();
    return actual.length === expected.length &&
      actual.every(function (key, index) {
        return key === expected[index];
      });
  }

  function validReportNumber(value, integer) {
    return Number.isFinite(value) &&
      value >= 0 &&
      (!integer || Number.isInteger(value));
  }

  function validReportMap(value) {
    return record(value) && Object.keys(value).every(function (key) {
      return key.length > 0 && validReportNumber(value[key], false);
    });
  }

  function validJsonValue(value) {
    if (value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean') {
      return true;
    }
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) return value.every(validJsonValue);
    return record(value) && Object.keys(value).every(function (key) {
      return validJsonValue(value[key]);
    });
  }

  function validSimulationReport(report) {
    if (!exactKeys(report, [
      'id', 'source', 'fromMs', 'toMs', 'requestedSeconds',
      'mainActionSeconds', 'cappedSeconds', 'action', 'gains',
      'costs', 'levels', 'unlocks', 'passive', 'world', 'warnings'
    ])) {
      return false;
    }
    if (typeof report.id !== 'string' ||
        report.id.length === 0 ||
        typeof report.source !== 'string' ||
        report.source.length === 0 ||
        !validReportNumber(report.fromMs, false) ||
        !validReportNumber(report.toMs, false) ||
        !validReportNumber(report.requestedSeconds, false) ||
        !validReportNumber(report.mainActionSeconds, false) ||
        !validReportNumber(report.cappedSeconds, false)) {
      return false;
    }
    if (!exactKeys(report.action, [
      'key', 'completed', 'stopReason', 'stopAtMs'
    ]) ||
        !(report.action.key === null ||
          (typeof report.action.key === 'string' &&
            report.action.key.length > 0)) ||
        !validReportNumber(report.action.completed, true) ||
        !(report.action.stopReason === null ||
          REPORT_STOP_REASONS.includes(report.action.stopReason)) ||
        !(report.action.stopAtMs === null ||
          validReportNumber(report.action.stopAtMs, false))) {
      return false;
    }
    if (!exactKeys(report.gains, [
      'items', 'skillXp', 'masteryXp', 'cultivation'
    ]) ||
        !validReportMap(report.gains.items) ||
        !validReportMap(report.gains.skillXp) ||
        !validReportMap(report.gains.masteryXp) ||
        !validReportNumber(report.gains.cultivation, false) ||
        !exactKeys(report.costs, ['items', 'supplies']) ||
        !validReportMap(report.costs.items) ||
        !validReportMap(report.costs.supplies)) {
      return false;
    }
    if (!Array.isArray(report.levels) ||
        !report.levels.every(validJsonValue) ||
        !Array.isArray(report.unlocks) ||
        !report.unlocks.every(validJsonValue) ||
        !exactKeys(report.passive, [
          'fishRecovered', 'farmCompleted', 'parallelCompleted'
        ]) ||
        !validReportNumber(report.passive.fishRecovered, false) ||
        !Array.isArray(report.passive.farmCompleted) ||
        !report.passive.farmCompleted.every(validJsonValue) ||
        !Array.isArray(report.passive.parallelCompleted) ||
        !report.passive.parallelCompleted.every(validJsonValue) ||
        !exactKeys(report.world, ['ticks', 'events']) ||
        !validReportNumber(report.world.ticks, true) ||
        !Array.isArray(report.world.events) ||
        !report.world.events.every(validJsonValue) ||
        !Array.isArray(report.warnings) ||
        !report.warnings.every(function (warning) {
          return typeof warning === 'string' && warning.length > 0;
        })) {
      return false;
    }
    return true;
  }

  function validPendingEnvelope(value) {
    return exactKeys(value, ['version', 'reports']) &&
      value.version === 1 &&
      Array.isArray(value.reports) &&
      value.reports.every(validSimulationReport);
  }

  function validStage2Action(raw) {
    return validAction(raw) &&
      Stage2State.normalizeActionKey(raw.key) !== null;
  }

  function validStage2Branches(raw, allowStage3, allowStage4) {
    if (!HAS_STAGE2_STATE) return false;
    try {
      const normalized = Stage2State.normalize({
        player: raw.player,
        systems: raw.systems
      });
      const comparablePlayer = cloneJson(raw.player, null);
      const comparableSystems = cloneJson(raw.systems, null);
      if (!record(comparableSystems)) return false;
      if (allowStage3 && record(comparablePlayer)) {
        delete comparablePlayer.techniques;
        delete comparablePlayer.combat;
        delete comparablePlayer.combatProgress;
        delete comparablePlayer.breakthrough;
        delete comparablePlayer.realmStage;
        delete comparablePlayer.xiwei;
      }
      if (allowStage4 && record(comparablePlayer)) {
        delete comparablePlayer.identity;
        delete comparablePlayer.regionId;
        delete comparablePlayer.flags;
        delete comparablePlayer.lifecycle;
      }
      const normalizedPlayer = cloneJson(normalized.player, null);
      if (allowStage3 && record(normalizedPlayer)) {
        delete normalizedPlayer.realmStage;
        delete normalizedPlayer.xiwei;
      }
      if (allowStage3) delete comparableSystems.combat;
      if (allowStage4) {
        delete comparableSystems.npcs;
        delete comparableSystems.relationships;
        delete comparableSystems.events;
        delete comparableSystems.sects;
        delete comparableSystems.social;
        delete comparableSystems.teamCombat;
        delete comparableSystems.lineage;
        if (record(comparableSystems.homestead)) {
          delete comparableSystems.homestead.inheritanceHall;
        }
        if (record(comparableSystems.world)) {
          delete comparableSystems.world.elapsedSeconds;
          delete comparableSystems.world.activeAccumulator;
          delete comparableSystems.world.backgroundAccumulator;
          delete comparableSystems.world.sectAccumulator;
          delete comparableSystems.world.eventAccumulator;
          delete comparableSystems.world.regions;
        }
      }
      if (record(comparableSystems.gathering) &&
          comparableSystems.gathering.fishRecoverAnchorMs === undefined &&
          comparableSystems.gathering.fishRecoverBaseSeconds === undefined) {
        comparableSystems.gathering.fishRecoverAnchorMs = null;
        comparableSystems.gathering.fishRecoverBaseSeconds = null;
      }
      if (record(comparableSystems.world) &&
          comparableSystems.world.tickAnchorMs === undefined &&
          comparableSystems.world.tickBaseSeconds === undefined) {
        comparableSystems.world.tickAnchorMs = null;
        comparableSystems.world.tickBaseSeconds = null;
      }
      if (raw.player === null) {
        if (normalized.player !== null) return false;
      } else {
        if (!record(comparablePlayer) ||
            !sameJson(comparablePlayer, normalizedPlayer)) {
          return false;
        }
      }
      return sameJson(comparableSystems, normalized.systems);
    } catch (error) {
      return false;
    }
  }

  function validV3Snapshot(raw) {
    return (
      !!raw &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      raw.schemaVersion === STAGE2_SCHEMA_VERSION &&
      raw.modelVersion === MODEL_VERSION &&
      Number.isFinite(raw.savedAt) &&
      raw.savedAt >= 0 &&
      typeof raw.created === 'boolean' &&
      recordOrNull(raw.player) &&
      validPlayerTimeAnchors(raw.player) &&
      record(raw.appearance) &&
      record(raw.appearance.parts) &&
      (raw.current === null || validStage2Action(raw.current)) &&
      Number.isInteger(raw.rngState) &&
      raw.rngState > 0 &&
      raw.rngState <= 0xFFFFFFFF &&
      Number.isFinite(raw.offlineLimitSeconds) &&
      raw.offlineLimitSeconds >= DEFAULT_OFFLINE_LIMIT_SECONDS &&
      raw.offlineLimitSeconds <= MAX_OFFLINE_LIMIT_SECONDS &&
      validSystems(raw.systems) &&
      validPendingEnvelope(raw.pendingOfflineReport) &&
      Array.isArray(raw.reportArchive) &&
      raw.reportArchive.every(validSimulationReport) &&
      Number.isFinite(raw.processedThroughMs) &&
      raw.processedThroughMs >= 0 &&
      validLastActionStop(raw.lastActionStop) &&
      validStage2Branches(raw, false, false)
    );
  }

  function validV4Snapshot(raw) {
    return (
      !!raw &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      raw.schemaVersion === STAGE3_SCHEMA_VERSION &&
      raw.modelVersion === MODEL_VERSION &&
      Number.isFinite(raw.savedAt) &&
      raw.savedAt >= 0 &&
      typeof raw.created === 'boolean' &&
      recordOrNull(raw.player) &&
      validPlayerTimeAnchors(raw.player) &&
      record(raw.appearance) &&
      record(raw.appearance.parts) &&
      (raw.current === null || validAction(raw.current)) &&
      Number.isInteger(raw.rngState) &&
      raw.rngState > 0 &&
      raw.rngState <= 0xFFFFFFFF &&
      Number.isFinite(raw.offlineLimitSeconds) &&
      raw.offlineLimitSeconds >= DEFAULT_OFFLINE_LIMIT_SECONDS &&
      raw.offlineLimitSeconds <= MAX_OFFLINE_LIMIT_SECONDS &&
      validSystems(raw.systems) &&
      validPendingEnvelope(raw.pendingOfflineReport) &&
      Array.isArray(raw.reportArchive) &&
      raw.reportArchive.every(validSimulationReport) &&
      Number.isFinite(raw.processedThroughMs) &&
      raw.processedThroughMs >= 0 &&
      validLastActionStop(raw.lastActionStop) &&
      validStage2Branches(raw, true, false)
    );
  }

  function validV5Snapshot(raw) {
    return (
      !!raw &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      raw.schemaVersion === SCHEMA_VERSION &&
      raw.modelVersion === MODEL_VERSION &&
      Number.isFinite(raw.savedAt) &&
      raw.savedAt >= 0 &&
      typeof raw.created === 'boolean' &&
      recordOrNull(raw.player) &&
      validPlayerTimeAnchors(raw.player) &&
      record(raw.appearance) &&
      record(raw.appearance.parts) &&
      (raw.current === null || validAction(raw.current)) &&
      Number.isInteger(raw.rngState) &&
      raw.rngState > 0 &&
      raw.rngState <= 0xFFFFFFFF &&
      Number.isFinite(raw.offlineLimitSeconds) &&
      raw.offlineLimitSeconds >= DEFAULT_OFFLINE_LIMIT_SECONDS &&
      raw.offlineLimitSeconds <= MAX_OFFLINE_LIMIT_SECONDS &&
      validSystems(raw.systems) &&
      validPendingEnvelope(raw.pendingOfflineReport) &&
      Array.isArray(raw.reportArchive) &&
      raw.reportArchive.every(validSimulationReport) &&
      Number.isFinite(raw.processedThroughMs) &&
      raw.processedThroughMs >= 0 &&
      validLastActionStop(raw.lastActionStop) &&
      validStage2Branches(raw, true, true)
    );
  }

  function normalizeSnapshot(raw, now) {
    return createSnapshot(raw, finiteNumber(raw.savedAt, now, 0));
  }

  function migrateV1(raw, now) {
    const source = cloneJson(raw, {});
    source.schemaVersion = STAGE1B_SCHEMA_VERSION;
    source.modelVersion = MODEL_VERSION;
    source.processedThroughMs = finiteNumber(
      source.processedThroughMs,
      finiteNumber(source.savedAt, now, 0),
      0
    );
    source.systems = normalizeSystems(source.systems, source);
    source.reportArchive = Array.isArray(source.reportArchive)
      ? source.reportArchive
      : [];
    return createV2Snapshot(
      source,
      finiteNumber(source.savedAt, now, 0)
    );
  }

  function migrateV2(raw, now) {
    const source = cloneJson(raw, {});
    source.schemaVersion = STAGE2_SCHEMA_VERSION;
    return createV3Snapshot(
      source,
      finiteNumber(source.savedAt, now, 0)
    );
  }

  function migrateV3(raw, now) {
    const source = cloneJson(raw, {});
    const converted = Stage3State.migrateV3(source);
    converted.schemaVersion = STAGE3_SCHEMA_VERSION;
    return createV4Snapshot(
      converted,
      finiteNumber(source.savedAt, now, 0)
    );
  }

  function migrateV4(raw, now) {
    if (!HAS_STAGE4_STATE) return null;
    const converted = Stage4State.migrateV4(raw);
    converted.schemaVersion = SCHEMA_VERSION;
    return createSnapshot(
      converted,
      finiteNumber(dataValue(raw, 'savedAt'), now, 0)
    );
  }

  function migrateSnapshot(raw, now) {
    raw = snapshotRecord(raw);
    if (!raw) return null;
    if (!HAS_STAGE2_STATE) {
      if (raw.schemaVersion === STAGE1B_SCHEMA_VERSION) {
        if (!validV2Snapshot(raw)) return null;
        return {
          snapshot: createV2Snapshot(
            raw,
            finiteNumber(raw.savedAt, now, 0)
          ),
          migrated: false
        };
      }
      if (raw.schemaVersion === 1) {
        if (!validV1Snapshot(raw)) return null;
        const snapshot = migrateV1(raw, now);
        return validV2Snapshot(snapshot)
          ? { snapshot, migrated: true }
          : null;
      }
      return null;
    }
    if (!HAS_STAGE3_STATE) {
      if (raw.schemaVersion === STAGE2_SCHEMA_VERSION) {
        if (!validV3Snapshot(raw)) return null;
        return {
          snapshot: createV3Snapshot(
            raw,
            finiteNumber(raw.savedAt, now, 0)
          ),
          migrated: false
        };
      }
      if (raw.schemaVersion === STAGE1B_SCHEMA_VERSION) {
        if (!validV2Snapshot(raw)) return null;
        const snapshot = migrateV2(raw, now);
        return validV3Snapshot(snapshot)
          ? { snapshot: snapshot, migrated: true }
          : null;
      }
      if (raw.schemaVersion === 1) {
        if (!validV1Snapshot(raw)) return null;
        const v2 = migrateV1(raw, now);
        if (!validV2Snapshot(v2)) return null;
        const snapshot = migrateV2(v2, now);
        return validV3Snapshot(snapshot)
          ? { snapshot: snapshot, migrated: true }
          : null;
      }
      return null;
    }
    if (!HAS_STAGE4_STATE) {
      if (raw.schemaVersion === STAGE3_SCHEMA_VERSION) {
        if (!validV4Snapshot(raw)) return null;
        const snapshot = createV4Snapshot(
          raw,
          finiteNumber(raw.savedAt, now, 0)
        );
        const repaired = !sameJson(raw, snapshot);
        return {
          snapshot: snapshot,
          migrated: repaired
        };
      }
      if (raw.schemaVersion === STAGE2_SCHEMA_VERSION) {
        if (!validV3Snapshot(raw)) return null;
        const snapshot = migrateV3(raw, now);
        return validV4Snapshot(snapshot)
          ? { snapshot: snapshot, migrated: true }
          : null;
      }
      if (raw.schemaVersion === STAGE1B_SCHEMA_VERSION) {
        if (!validV2Snapshot(raw)) return null;
        const v3 = migrateV2(raw, now);
        if (!validV3Snapshot(v3)) return null;
        const snapshot = migrateV3(v3, now);
        return validV4Snapshot(snapshot)
          ? { snapshot: snapshot, migrated: true }
          : null;
      }
      if (raw.schemaVersion === 1) {
        if (!validV1Snapshot(raw)) return null;
        const v2 = migrateV1(raw, now);
        if (!validV2Snapshot(v2)) return null;
        const v3 = migrateV2(v2, now);
        if (!validV3Snapshot(v3)) return null;
        const snapshot = migrateV3(v3, now);
        return validV4Snapshot(snapshot)
          ? { snapshot: snapshot, migrated: true }
          : null;
      }
      return null;
    }
    if (raw.schemaVersion === SCHEMA_VERSION) {
      if (!validV5Snapshot(raw)) return null;
      const snapshot = normalizeSnapshot(raw, now);
      const repaired = !sameJson(raw, snapshot);
      return {
        snapshot: snapshot,
        migrated: repaired
      };
    }
    if (raw.schemaVersion === STAGE3_SCHEMA_VERSION) {
      if (!validV4Snapshot(raw)) return null;
      const snapshot = migrateV4(raw, now);
      return validV5Snapshot(snapshot)
        ? { snapshot: snapshot, migrated: true }
        : null;
    }
    if (raw.schemaVersion === STAGE2_SCHEMA_VERSION) {
      if (!validV3Snapshot(raw)) return null;
      const v4 = migrateV3(raw, now);
      if (!validV4Snapshot(v4)) return null;
      const snapshot = migrateV4(v4, now);
      return validV5Snapshot(snapshot)
        ? { snapshot: snapshot, migrated: true }
        : null;
    }
    if (raw.schemaVersion === STAGE1B_SCHEMA_VERSION) {
      if (!validV2Snapshot(raw)) return null;
      const v3 = migrateV2(raw, now);
      if (!validV3Snapshot(v3)) return null;
      const v4 = migrateV3(v3, now);
      if (!validV4Snapshot(v4)) return null;
      const snapshot = migrateV4(v4, now);
      return validV5Snapshot(snapshot)
        ? { snapshot: snapshot, migrated: true }
        : null;
    }
    if (raw.schemaVersion === 1) {
      if (!validV1Snapshot(raw)) return null;
      const v2 = migrateV1(raw, now);
      if (!validV2Snapshot(v2)) return null;
      const v3 = migrateV2(v2, now);
      if (!validV3Snapshot(v3)) return null;
      const v4 = migrateV3(v3, now);
      if (!validV4Snapshot(v4)) return null;
      const snapshot = migrateV4(v4, now);
      return validV5Snapshot(snapshot)
        ? { snapshot: snapshot, migrated: true }
        : null;
    }
    return null;
  }

  function futureSchemaVersion(raw) {
    const version = Number(dataValue(raw, 'schemaVersion'));
    return Number.isInteger(version) && version > ACTIVE_SCHEMA_VERSION
      ? version
      : null;
  }

  function highestFutureSchemaVersion() {
    let highest = null;
    for (let index = 0; index < arguments.length; index++) {
      const version = futureSchemaVersion(arguments[index]);
      if (version != null && (highest == null || version > highest)) {
        highest = version;
      }
    }
    return highest;
  }

  function loadView(snapshot) {
    const envelope = record(snapshot.pendingOfflineReport) &&
      Array.isArray(snapshot.pendingOfflineReport.reports)
      ? snapshot.pendingOfflineReport
      : { reports: [] };
    const reports = cloneArray(envelope.reports);
    snapshot.pendingOfflineReports = reports;
    snapshot.pendingOfflineReport = reports.length > 0
      ? cloneJson(reports[0], null)
      : null;
    return snapshot;
  }

  function loadLegacy(adapter, now) {
    const created = safeLoad(adapter, 'cloud_created');
    const appearance = safeLoad(adapter, 'cloud_nie');
    const player = safeLoad(adapter, 'cloud_player');
    const current = safeLoad(adapter, 'cloud_current');
    const savedAt = safeLoad(adapter, 'cloud_lastsave');
    if (created == null && appearance == null && player == null && current == null && savedAt == null) return null;
    return createSnapshot({
      created: created === '1' || created === 1 || created === true,
      appearance: appearance || { parts: {} },
      player,
      current,
      rngState: 0x6D2B79F5
    }, finiteNumber(savedAt, now, 0));
  }

  function load(adapter, now) {
    const primary = safeLoad(adapter, SNAPSHOT_KEY);
    const backup = safeLoad(adapter, BACKUP_KEY);
    const futureVersion = highestFutureSchemaVersion(primary, backup);
    const primaryResult = migrateSnapshot(primary, now);
    if (primaryResult) {
      const result = {
        source: 'snapshot',
        snapshot: loadView(primaryResult.snapshot),
        migrated: primaryResult.migrated,
        needsRepair: futureVersion == null && primaryResult.migrated,
        future: futureVersion != null,
        writeProtected: futureVersion != null
      };
      if (futureVersion != null) {
        result.futureSchemaVersion = futureVersion;
      }
      return result;
    }
    const backupResult = migrateSnapshot(backup, now);
    if (backupResult) {
      return {
        source: 'backup',
        snapshot: loadView(backupResult.snapshot),
        migrated: backupResult.migrated,
        needsRepair: futureVersion == null,
        future: futureVersion != null,
        futureSchemaVersion: futureVersion,
        writeProtected: futureVersion != null
      };
    }
    if (futureVersion != null) {
      return {
        source: 'empty',
        snapshot: loadView(createSnapshot({}, now)),
        migrated: false,
        needsRepair: false,
        future: true,
        futureSchemaVersion: futureVersion,
        writeProtected: true
      };
    }
    const legacy = loadLegacy(adapter, now);
    if (legacy) {
      return {
        source: 'legacy',
        snapshot: loadView(legacy),
        migrated: true,
        needsRepair: true,
        future: false,
        writeProtected: false
      };
    }
    return {
      source: 'empty',
      snapshot: loadView(createSnapshot({}, now)),
      migrated: false,
      needsRepair: false,
      future: false,
      writeProtected: false
    };
  }

  function save(adapter, input, now) {
    const previous = safeLoad(adapter, SNAPSHOT_KEY);
    const previousBackup = safeLoad(adapter, BACKUP_KEY);
    if (futureSchemaVersion(previous) != null ||
        futureSchemaVersion(previousBackup) != null) {
      return false;
    }
    const snapshot = createSnapshot(input, now);
    const previousResult = migrateSnapshot(previous, now);
    if (previousResult &&
        !safeSave(adapter, BACKUP_KEY, previousResult.snapshot)) {
      return false;
    }
    return safeSave(adapter, SNAPSHOT_KEY, snapshot);
  }

  return Object.freeze({
    SCHEMA_VERSION,
    SNAPSHOT_KEY,
    BACKUP_KEY,
    normalizeAction,
    migrateV3,
    migrateV4,
    createSnapshot,
    load,
    save
  });
});
