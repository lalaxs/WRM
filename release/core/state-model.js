(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./save-system.js'),
      require('./random.js'),
      require('./simulation-report.js'),
      require('./stage2-state.js'),
      require('./stage3-state.js'),
      require('./stage4-state.js')
    );
  } else if (root) {
    root.StateModel = factory(
      root.SaveSystem,
      root.GameRandom,
      root.SimulationReport,
      root.Stage2State,
      root.Stage3State,
      root.Stage4State
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  SaveSystem,
  GameRandom,
  SimulationReport,
  Stage2State,
  Stage3State,
  Stage4State
) {
  'use strict';

  const MODEL_VERSION = 1;
  const DEFAULT_OFFLINE_LIMIT_SECONDS = 43200;
  const MAX_OFFLINE_LIMIT_SECONDS = 172800;
  const REPORT_ARCHIVE_LIMIT = 50;
  const HAS_STAGE2_STATE = !!Stage2State &&
    typeof Stage2State.normalize === 'function' &&
    typeof Stage2State.normalizeActionKey === 'function';
  const HAS_STAGE3_STATE = HAS_STAGE2_STATE &&
    !!Stage3State &&
    typeof Stage3State.normalize === 'function' &&
    typeof Stage3State.normalizeActionKey === 'function';
  const HAS_STAGE4_STATE = HAS_STAGE3_STATE &&
    !!Stage4State &&
    typeof Stage4State.normalize === 'function' &&
    typeof Stage4State.snapshotJsonData === 'function';

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function isRecord(value) {
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
    if (!isRecord(value)) return undefined;
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
    if (!HAS_STAGE4_STATE) return isRecord(value) ? value : null;
    const snapshot = Stage4State.snapshotJsonData(value);
    return isRecord(snapshot) ? snapshot : null;
  }

  function finiteNumber(value, fallback, min) {
    if (value == null) return fallback;
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min == null ? -Infinity : min, number);
  }

  function finiteInteger(value, fallback, min) {
    return Math.floor(finiteNumber(value, fallback, min));
  }

  function cleanString(value, fallback) {
    return typeof value === 'string' ? value : fallback;
  }

  function defineEnumerable(target, key, value) {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
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

  function cloneRecord(value) {
    if (!isRecord(value)) return {};
    const cloned = cloneJson(value, null);
    return isRecord(cloned) ? cloned : {};
  }

  function cloneArray(value) {
    const cloned = cloneJson(value, null);
    return Array.isArray(cloned) ? cloned : [];
  }

  function mergeRecords() {
    const merged = {};
    for (let index = 0; index < arguments.length; index++) {
      const source = cloneRecord(arguments[index]);
      Object.keys(source).forEach(function (key) {
        defineEnumerable(merged, key, source[key]);
      });
    }
    return merged;
  }

  function normalizeAppearance(raw) {
    const source = isRecord(raw) ? raw : {};
    return {
      parts: cloneRecord(source.parts)
    };
  }

  function normalizeTimeAnchor(raw, anchorKey, baseKey, minimumBase) {
    const source = isRecord(raw) ? raw : {};
    const anchorMs = source[anchorKey];
    const baseValue = source[baseKey];
    if (!Number.isFinite(anchorMs) ||
        anchorMs < 0 ||
        !Number.isFinite(baseValue) ||
        baseValue < (minimumBase == null ? -Infinity : minimumBase)) {
      return { anchorMs: null, baseValue: null };
    }
    return { anchorMs, baseValue };
  }

  function normalizeTimedArray(value) {
    return cloneArray(value)
      .filter(function (item) {
        return isRecord(item) &&
          typeof item.id === 'string' &&
          item.id.trim().length > 0 &&
          Number.isFinite(item.remainingSeconds) &&
          item.remainingSeconds >= 0;
      })
      .map(function (item) {
        const anchor = normalizeTimeAnchor(
          item,
          'remainingAnchorMs',
          'remainingBaseSeconds',
          0
        );
        item.remainingAnchorMs = anchor.anchorMs;
        item.remainingBaseSeconds = anchor.baseValue;
        return item;
      });
  }

  function normalizePlayer(
    raw,
    includeStage2,
    includeStage3,
    includeStage4
  ) {
    if (raw == null) return null;
    if (!isRecord(raw)) return null;

    const inventory = isRecord(raw.inventory) ? raw.inventory : {};
    const shouMaxSource = raw.shouMax;
    let shouMax;
    let shouyuan;
    let lifespanAnchorMs;
    let lifespanBaseYears;
    const moodAnchor = normalizeTimeAnchor(
      raw,
      'moodAnchorMs',
      'moodBase',
      0
    );
    if (shouMaxSource === Infinity || shouMaxSource === null) {
      shouMax = null;
      shouyuan = null;
      lifespanAnchorMs = null;
      lifespanBaseYears = null;
    } else {
      shouMax = finiteNumber(shouMaxSource, 0, 0);
      shouyuan = finiteNumber(raw.shouyuan, shouMax, 0);
      const lifespanAnchor = normalizeTimeAnchor(
        raw,
        'lifespanAnchorMs',
        'lifespanBaseYears',
        0
      );
      lifespanAnchorMs = lifespanAnchor.anchorMs;
      lifespanBaseYears = lifespanAnchor.baseValue;
    }

    const inventoryResult = {
      stacks: mergeRecords(
        raw.items,
        raw.dan,
        raw.bag,
        inventory.stacks
      )
    };
    if (includeStage2) {
      inventoryResult.capacity = inventory.capacity;
      inventoryResult.capacityGrants = cloneRecord(
        inventory.capacityGrants
      );
      inventoryResult.bindings = cloneRecord(inventory.bindings);
      inventoryResult.equipment = cloneRecord(inventory.equipment);
    }

    const result = {
      name: cleanString(raw.name, ''),
      realmStage: finiteInteger(raw.realmStage, 0, 0),
      realm: cleanString(raw.realm, ''),
      title: cleanString(raw.title, ''),
      xiwei: finiteNumber(raw.xiwei, 0, 0),
      breakNeed: finiteNumber(raw.breakNeed, 0, 0),
      mood: finiteNumber(raw.mood, 0, 0),
      moodAnchorMs: moodAnchor.anchorMs,
      moodBase: moodAnchor.baseValue,
      jingqi: finiteNumber(raw.jingqi, 0, 0),
      lingshi: finiteNumber(raw.lingshi, 0, 0),
      shengwang: finiteNumber(raw.shengwang, 0, 0),
      lingyu: finiteNumber(raw.lingyu, 0, 0),
      shouyuan,
      shouMax,
      lifespanAnchorMs,
      lifespanBaseYears,
      inventory: inventoryResult,
      skills: cloneRecord(raw.skills),
      mastery: cloneRecord(raw.mastery)
    };
    if (includeStage2) {
      result.legacyProgress = cloneRecord(raw.legacyProgress);
    }
    if (includeStage3) {
      result.techniques = cloneRecord(raw.techniques);
      result.combat = cloneRecord(raw.combat);
      result.combatProgress = cloneRecord(raw.combatProgress);
      result.breakthrough = cloneRecord(raw.breakthrough);
    }
    if (includeStage4) {
      result.identity = cloneRecord(raw.identity);
      result.regionId = cleanString(raw.regionId, 'qinglan-town');
      result.flags = cloneRecord(raw.flags);
      // Stage4 字段必须透传：否则 normalize → Stage4.normalize 时 rawPlayer
      // 丢 kin/lifecycle，存档与 applyToRuntime 会把开局友人圈清成空。
      result.spiritualRootId = cleanString(raw.spiritualRootId, null);
      result.kin = cloneRecord(raw.kin);
      result.familyId = cleanString(raw.familyId, null);
      result.parentIds = Array.isArray(raw.parentIds)
        ? raw.parentIds.slice()
        : [];
      result.metPlayer = raw.metPlayer === true;
      result.lifecycle = cloneRecord(raw.lifecycle);
    }
    return result;
  }

  function normalizeSystems(
    raw,
    player,
    topLevelFishRecoverAcc,
    includeStage2,
    includeStage3,
    includeStage4
  ) {
    const source = isRecord(raw) ? raw : {};
    const gathering = isRecord(source.gathering) ? source.gathering : {};
    const homestead = isRecord(source.homestead) ? source.homestead : {};
    const farm = isRecord(homestead.farm) ? homestead.farm : {};
    const formations = isRecord(homestead.formations)
      ? homestead.formations
      : {};
    const beasts = isRecord(homestead.beasts) ? homestead.beasts : {};
    const parallel = isRecord(source.parallel) ? source.parallel : {};
    const world = isRecord(source.world) ? source.world : {};
    const legacyPlayer = isRecord(player) ? player : {};
    const fishRecoverAnchor = normalizeTimeAnchor(
      gathering,
      'fishRecoverAnchorMs',
      'fishRecoverBaseSeconds',
      0
    );
    const worldTickAnchor = normalizeTimeAnchor(
      world,
      'tickAnchorMs',
      'tickBaseSeconds',
      0
    );

    const result = {
      gathering: {
        spots: mergeRecords(legacyPlayer.spots, gathering.spots),
        fishStocks: mergeRecords(
          legacyPlayer.fishing,
          gathering.fishStocks
        ),
        fishRecoverAcc: finiteNumber(
          gathering.fishRecoverAcc,
          finiteNumber(topLevelFishRecoverAcc, 0, 0),
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
      parallel: {
        jobs: normalizeTimedArray(parallel.jobs)
      },
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
      // 人生转换 / 族谱进行中状态必须透传，否则 begin 后一正规化就被清空，弹窗永远出不来
      result.lineage = cloneRecord(source.lineage);
      result.homestead.inheritanceHall = cloneRecord(
        homestead.inheritanceHall
      );
      result.world.elapsedSeconds = world.elapsedSeconds;
      result.world.activeAccumulator = world.activeAccumulator;
      result.world.backgroundAccumulator = world.backgroundAccumulator;
      result.world.sectAccumulator = world.sectAccumulator;
      result.world.eventAccumulator = world.eventAccumulator;
      result.world.monthAccumulator = world.monthAccumulator;
      // 日历与世界见闻必须透传，否则每帧 fromRuntime/normalize 会清空，
      // 导致大事记永远不出现。
      result.world.calendar = cloneRecord(world.calendar);
      result.world.worldEvents = cloneArray(world.worldEvents);
      result.world.nextWorldEventId = world.nextWorldEventId;
      result.world.regions = cloneRecord(world.regions);
    }
    return result;
  }

  function pendingSources(raw) {
    const candidates = [];
    if (isRecord(raw.pendingOfflineReport) &&
        Array.isArray(raw.pendingOfflineReport.reports)) {
      candidates.push.apply(
        candidates,
        raw.pendingOfflineReport.reports
      );
    } else if (raw.pendingOfflineReport != null) {
      candidates.push(raw.pendingOfflineReport);
    }
    if (Array.isArray(raw.pendingOfflineReports)) {
      candidates.push.apply(candidates, raw.pendingOfflineReports);
    }
    return candidates;
  }

  function normalizePendingReports(raw, nowMs) {
    const savedAt = finiteNumber(raw.savedAt, nowMs, 0);
    return pendingSources(raw)
      .map(function (report) {
        const localReport = cloneJson(report, null);
        return SimulationReport.normalize(localReport, {
          source: 'offline',
          savedAt
        });
      })
      .reduce(function (inbox, report) {
        return SimulationReport.addPending(inbox, report);
      }, []);
  }

  function normalizeArchive(raw) {
    const archive = Array.isArray(raw.reportArchive)
      ? cloneArray(raw.reportArchive)
      : [];
    return SimulationReport.archive([], archive, REPORT_ARCHIVE_LIMIT);
  }

  function normalizeLastActionStop(raw) {
    if (!isRecord(raw) ||
        typeof raw.key !== 'string' ||
        raw.key.length === 0 ||
        typeof raw.reason !== 'string' ||
        raw.reason.length === 0 ||
        !Number.isFinite(Number(raw.atMs)) ||
        Number(raw.atMs) < 0) {
      return null;
    }
    return {
      key: raw.key,
      reason: raw.reason,
      atMs: finiteNumber(raw.atMs, 0, 0)
    };
  }

  function hasStage4Data(source) {
    if (!isRecord(source) || !HAS_STAGE4_STATE) return false;
    if (dataValue(source, 'schemaVersion') === Stage4State.VERSION) {
      return true;
    }
    const playerValue = dataValue(source, 'player');
    const player = isRecord(playerValue) ? playerValue : {};
    if (isRecord(dataValue(player, 'identity')) ||
        typeof dataValue(player, 'regionId') === 'string' ||
        isRecord(dataValue(player, 'flags'))) {
      return true;
    }
    const systemsValue = dataValue(source, 'systems');
    const systems = isRecord(systemsValue) ? systemsValue : {};
    return [
      'npcs',
      'relationships',
      'events',
      'sects',
      'social',
      'teamCombat',
      'lineage'
    ].some(function (key) {
      return isRecord(dataValue(systems, key));
    });
  }

  function normalizeInternal(raw, nowMs, includeStage2) {
    const source = snapshotRecord(raw) || {};
    const includeStage4 = hasStage4Data(source);
    const now = finiteNumber(nowMs, Date.now(), 0);
    const processedThroughMs = finiteNumber(
      source.processedThroughMs,
      finiteNumber(source.savedAt, now, 0),
      0
    );
    const offlineLimitSeconds = Math.min(
      MAX_OFFLINE_LIMIT_SECONDS,
      Math.max(
        DEFAULT_OFFLINE_LIMIT_SECONDS,
        finiteNumber(
          source.offlineLimitSeconds,
          DEFAULT_OFFLINE_LIMIT_SECONDS
        )
      )
    );

    let current = SaveSystem.normalizeAction(source.current);
    let pendingOfflineReports = normalizePendingReports(source, now);
    if (current && includeStage2) {
      const normalizedKey = Stage2State.normalizeActionKey(current.key) ||
        (HAS_STAGE3_STATE
          ? Stage3State.normalizeActionKey(current.key)
          : null) ||
        (HAS_STAGE4_STATE &&
          typeof Stage4State.normalizeActionKey === 'function'
          ? Stage4State.normalizeActionKey(current.key)
          : null);
      if (normalizedKey) {
        current.key = normalizedKey;
      } else {
        current = discloseRemovedCurrent();
      }
    }

    function discloseRemovedCurrent() {
      if (!current) return null;
        const removedKey = current.key;
        if (pendingOfflineReports.length === 0) {
          const warningReport = SimulationReport.create({
            source: 'offline',
            fromMs: processedThroughMs,
            toMs: processedThroughMs,
            requestedSeconds: 0,
            actionKey: removedKey,
            seedBefore: GameRandom.normalizeSeed(source.rngState)
          });
          pendingOfflineReports = SimulationReport.addPending(
            pendingOfflineReports,
            warningReport
          );
        }
        if (!pendingOfflineReports[0].warnings.includes(
          'legacy_action_removed'
        )) {
          pendingOfflineReports[0].warnings.push('legacy_action_removed');
        }
        return null;
    }

    const base = {
      modelVersion: MODEL_VERSION,
      created: !!source.created,
      appearance: normalizeAppearance(source.appearance),
      player: normalizePlayer(
        source.player,
        includeStage2,
        HAS_STAGE3_STATE,
        includeStage4
      ),
      current,
      rngState: GameRandom.normalizeSeed(source.rngState),
      offlineLimitSeconds,
      systems: normalizeSystems(
        source.systems,
        source.player,
        source.fishRecoverAcc,
        includeStage2,
        HAS_STAGE3_STATE,
        includeStage4
      ),
      pendingOfflineReports,
      reportArchive: normalizeArchive(source),
      processedThroughMs,
      lastActionStop: normalizeLastActionStop(source.lastActionStop)
    };
    if (includeStage4) {
      const normalized = Stage4State.normalize(base, {
        preserveLegacyFields: true
      });
      // 空池补人口；已有人口时仍会补写缺失的开局结识见闻。
      if (typeof Stage4State.ensureWorldPopulation === 'function') {
        return Stage4State.normalize(
          Stage4State.ensureWorldPopulation(normalized),
          { preserveLegacyFields: true }
        );
      }
      return normalized;
    }
    if (HAS_STAGE3_STATE) {
      return Stage3State.normalize(base, { preserveLegacyFields: true });
    }
    return includeStage2 ? Stage2State.normalize(base) : cloneJson(base, {});
  }

  function normalize(raw, nowMs) {
    return normalizeInternal(raw, nowMs, HAS_STAGE2_STATE);
  }

  function fromRuntime(runtime, nowMs) {
    const source = snapshotRecord(runtime) || {};
    const appearance = isRecord(source.parts)
      ? { parts: source.parts }
      : source.appearance;
    return normalizeInternal({
      created: source.created,
      appearance,
      player: source.player,
      current: source.current,
      rngState: source.rngState,
      offlineLimitSeconds: source.offlineLimitSeconds,
      systems: source.systems,
      fishRecoverAcc: source.fishRecoverAcc,
      pendingOfflineReports: source.pendingOfflineReports,
      pendingOfflineReport: source.offlineResult,
      reportArchive: source.reportArchive,
      processedThroughMs: source.processedThroughMs == null
        ? nowMs
        : source.processedThroughMs,
      lastActionStop: source.lastActionStop
    }, nowMs, HAS_STAGE2_STATE);
  }

  // UI/查询专用：信任运行时已在 applyToRuntime 时规范化，避免每帧深拷贝+重规范化 Stage4。
  function queryView(runtime, nowMs) {
    if (!isRecord(runtime)) {
      return {
        modelVersion: MODEL_VERSION,
        created: false,
        appearance: { parts: {} },
        player: null,
        current: null,
        rngState: GameRandom.normalizeSeed(undefined),
        offlineLimitSeconds: DEFAULT_OFFLINE_LIMIT_SECONDS,
        systems: {},
        pendingOfflineReports: [],
        reportArchive: [],
        processedThroughMs: finiteNumber(nowMs, Date.now(), 0),
        lastActionStop: null,
        savedAt: finiteNumber(nowMs, Date.now(), 0)
      };
    }
    const now = finiteNumber(nowMs, Date.now(), 0);
    const parts = isRecord(runtime.parts) ? runtime.parts : {};
    const offlineLimitSeconds = Math.min(
      MAX_OFFLINE_LIMIT_SECONDS,
      Math.max(
        DEFAULT_OFFLINE_LIMIT_SECONDS,
        finiteNumber(
          runtime.offlineLimitSeconds,
          DEFAULT_OFFLINE_LIMIT_SECONDS
        )
      )
    );
    return {
      modelVersion: MODEL_VERSION,
      created: !!runtime.created,
      appearance: { parts: parts },
      player: runtime.player || null,
      current: runtime.current || null,
      rngState: GameRandom.normalizeSeed(runtime.rngState),
      offlineLimitSeconds: offlineLimitSeconds,
      systems: isRecord(runtime.systems) ? runtime.systems : {},
      pendingOfflineReports: Array.isArray(runtime.pendingOfflineReports)
        ? runtime.pendingOfflineReports
        : [],
      reportArchive: Array.isArray(runtime.reportArchive)
        ? runtime.reportArchive
        : [],
      processedThroughMs: finiteNumber(
        runtime.processedThroughMs,
        finiteNumber(runtime.savedAt, now, 0),
        0
      ),
      lastActionStop: runtime.lastActionStop || null,
      savedAt: finiteNumber(runtime.savedAt, now, 0)
    };
  }

  function applyToRuntime(runtime, model) {
    if (!isRecord(runtime)) return runtime;
    const clean = normalizeInternal(
      model,
      dataValue(model, 'processedThroughMs'),
      HAS_STAGE2_STATE
    );
    runtime.created = clean.created;
    runtime.parts = cloneRecord(clean.appearance.parts);
    runtime.player = cloneJson(clean.player, null);
    runtime.current = cloneJson(clean.current, null);
    runtime.rngState = clean.rngState;
    runtime.offlineLimitSeconds = clean.offlineLimitSeconds;
    runtime.systems = cloneJson(clean.systems, normalizeSystems());
    runtime.pendingOfflineReports = cloneArray(clean.pendingOfflineReports);
    runtime.reportArchive = cloneArray(clean.reportArchive);
    runtime.processedThroughMs = clean.processedThroughMs;
    runtime.lastActionStop = cloneJson(clean.lastActionStop, null);
    return runtime;
  }

  function toSnapshotInput(model) {
    const clean = normalize(
      model,
      dataValue(model, 'processedThroughMs')
    );
    // Already normalized; one JSON-safe clone is enough for save input.
    return cloneJson(clean, {});
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  function readonly(value) {
    if (value === undefined) return undefined;
    return deepFreeze(cloneJson(value, null));
  }

  return Object.freeze({
    MODEL_VERSION,
    normalize,
    fromRuntime,
    queryView,
    applyToRuntime,
    toSnapshotInput,
    readonly
  });
});
