(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./simulation-report.js'));
  } else if (root) {
    root.Simulation = factory(root.SimulationReport);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  SimulationReport
) {
  'use strict';

  const DEFAULT_TRANSITION_LIMIT = 1000000;
  const MACHINE_RESIDUAL_FACTOR = 4;
  const GUARD_WARNING = 'simulation_guard';
  const FLOAT64_VIEW = new DataView(new ArrayBuffer(8));

  function defineEnumerable(target, key, value) {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }

  function cloneJsonValue(value, ancestors) {
    if (value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new TypeError('simulation model must contain only finite numbers');
      }
      return value;
    }
    if (typeof value !== 'object') {
      throw new TypeError('simulation model must be JSON-safe');
    }

    const stack = ancestors || new Set();
    if (stack.has(value)) {
      throw new TypeError('simulation model must not contain cycles');
    }
    stack.add(value);

    try {
      if (Array.isArray(value)) {
        const array = [];
        for (let index = 0; index < value.length; index++) {
          if (!Object.prototype.hasOwnProperty.call(value, index)) {
            array.push(null);
            continue;
          }
          const descriptor = Object.getOwnPropertyDescriptor(value, index);
          if (!descriptor ||
              typeof descriptor.get === 'function' ||
              typeof descriptor.set === 'function') {
            throw new TypeError(
              'simulation model must contain only data properties'
            );
          }
          array.push(cloneJsonValue(descriptor.value, stack));
        }
        return array;
      }

      const clone = {};
      const symbols = Object.getOwnPropertySymbols(value);
      for (let index = 0; index < symbols.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          symbols[index]
        );
        if (descriptor && descriptor.enumerable) {
          throw new TypeError(
            'simulation model must not contain enumerable symbol keys'
          );
        }
      }

      Object.keys(value).forEach(function (key) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor ||
            typeof descriptor.get === 'function' ||
            typeof descriptor.set === 'function') {
          throw new TypeError(
            'simulation model must contain only data properties'
          );
        }
        defineEnumerable(
          clone,
          key,
          cloneJsonValue(descriptor.value, stack)
        );
      });
      return clone;
    } finally {
      stack.delete(value);
    }
  }

  function digestWorld(world) {
    if (!world || typeof world !== 'object') return world;
    const events = Array.isArray(world.worldEvents) ? world.worldEvents : [];
    const last = events.length ? events[events.length - 1] : null;
    const out = {};
    Object.keys(world).forEach(function (key) {
      if (key === 'worldEvents') {
        // 见闻正文不进守卫串：长离线后可达数百～上千条，stringify 会拖垮在线 tick。
        out.worldEvents = {
          length: events.length,
          lastId: last && last.id != null ? last.id : null
        };
      } else {
        out[key] = world[key];
      }
    });
    return out;
  }

  function digestNpcs(npcs) {
    if (!npcs || typeof npcs !== 'object') return npcs;
    const records = npcs.records && typeof npcs.records === 'object'
      ? npcs.records
      : {};
    const digest = {};
    Object.keys(records).forEach(function (id) {
      const person = records[id];
      if (!person || typeof person !== 'object') {
        digest[id] = person;
        return;
      }
      digest[id] = [
        person.status,
        person.realmStage,
        person.cultivation,
        person.regionId,
        person.sectId,
        person.ageYears,
        person.ageRemainderSeconds,
        person.lastDetailedAt,
        person.lastBackgroundAt,
        person.biography && person.biography.length,
        person.keyEventIds && person.keyEventIds.length
      ];
    });
    return {
      nextId: npcs.nextId,
      activeIds: npcs.activeIds,
      backgroundIds: npcs.backgroundIds,
      records: digest
    };
  }

  function digestSystems(systems) {
    if (!systems || typeof systems !== 'object') return systems;
    const out = {};
    Object.keys(systems).forEach(function (key) {
      if (key === 'npcs') {
        out.npcs = digestNpcs(systems.npcs);
      } else if (key === 'world') {
        out.world = digestWorld(systems.world);
      } else {
        out[key] = systems[key];
      }
    });
    return out;
  }

  // 变更守卫摘要：保留全部顶层键，压缩 NPC records 与 worldEvents；
  // 避免对含大量见闻的整树先深拷贝再 stringify。
  function jsonToken(state) {
    if (!state || typeof state !== 'object') {
      return JSON.stringify(state);
    }
    const snapshot = {};
    Object.keys(state).forEach(function (key) {
      if (key === 'systems') {
        snapshot.systems = digestSystems(state.systems);
      } else {
        snapshot[key] = state[key];
      }
    });
    return JSON.stringify(snapshot);
  }

  function requireFunction(owner, key, label) {
    if (!owner || typeof owner[key] !== 'function') {
      throw new TypeError(label + '.' + key + ' must be a function');
    }
  }

  function validateRules(rules) {
    [
      'getAction',
      'nextBoundary',
      'elapse',
      'inspect',
      'complete',
      'random'
    ].forEach(function (key) {
      requireFunction(rules, key, 'rules');
    });
  }

  function validateLanes(lanes) {
    if (!Array.isArray(lanes)) {
      throw new TypeError('lanes must be an array');
    }
    lanes.forEach(function (lane, index) {
      const label = 'lanes[' + index + ']';
      if (!lane || typeof lane.id !== 'string' || lane.id.length === 0) {
        throw new TypeError(label + '.id must be a non-empty string');
      }
      ['nextBoundary', 'elapse', 'resolve'].forEach(function (key) {
        requireFunction(lane, key, label);
      });
    });
  }

  function readBoundary(value, label) {
    if (value === Infinity) return Infinity;
    if (typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0) {
      throw new RangeError(
        label + ' must return a non-negative finite number or Infinity'
      );
    }
    return value;
  }

  function readInspection(value) {
    if (!value ||
        !['ready', 'waiting', 'stop'].includes(value.status)) {
      throw new TypeError(
        'rules.inspect must return ready, waiting, or stop status'
      );
    }
    return value;
  }

  function addGuardWarning(report) {
    if (!report.warnings.includes(GUARD_WARNING)) {
      report.warnings.push(GUARD_WARNING);
    }
  }

  function subtractionTolerance(total, step) {
    return MACHINE_RESIDUAL_FACTOR * Number.EPSILON * Math.max(
      Math.abs(total),
      Math.abs(step)
    );
  }

  // This is deliberately not decimal quantization. It only clears the result
  // of subtracting two non-zero, machine-equal scheduler values. Legal small
  // durations (including 4e-13) otherwise pass through byte-for-byte.
  function subtractSchedulerSeconds(total, step) {
    const raw = total - step;
    if (raw === 0) return 0;
    if (Math.abs(raw) <= subtractionTolerance(total, step)) {
      return 0;
    }
    if (raw < 0) {
      throw new RangeError('simulation time subtraction became negative');
    }
    return raw;
  }

  function decimalParts(value) {
    const text = value.toString().toLowerCase();
    const pieces = text.split('e');
    const coefficient = pieces[0];
    const scientificExponent = pieces.length > 1
      ? Number(pieces[1])
      : 0;
    const decimalAt = coefficient.indexOf('.');
    const fractionalDigits = decimalAt < 0
      ? 0
      : coefficient.length - decimalAt - 1;
    const digits = coefficient.replace('.', '').replace(/^0+/, '') || '0';
    return normalizeDecimalParts({
      units: BigInt(digits),
      exponent: scientificExponent - fractionalDigits
    });
  }

  function normalizeDecimalParts(parts) {
    if (parts.units === 0n) {
      return { units: 0n, exponent: 0 };
    }
    let units = parts.units;
    let exponent = parts.exponent;
    while (units % 10n === 0n) {
      units /= 10n;
      exponent++;
    }
    return { units, exponent };
  }

  function decimalPartsToNumber(parts) {
    if (parts.units === 0n) return 0;
    return Number(parts.units.toString() + 'e' + parts.exponent);
  }

  function compareDecimalParts(left, right) {
    const exponent = Math.min(left.exponent, right.exponent);
    const leftUnits = left.units *
      (10n ** BigInt(left.exponent - exponent));
    const rightUnits = right.units *
      (10n ** BigInt(right.exponent - exponent));
    if (leftUnits < rightUnits) return -1;
    if (leftUnits > rightUnits) return 1;
    return 0;
  }

  function nextDownPositive(value) {
    if (Number.isNaN(value)) return NaN;
    if (value <= 0) return 0;
    FLOAT64_VIEW.setFloat64(0, value, false);
    const bits = FLOAT64_VIEW.getBigUint64(0, false);
    FLOAT64_VIEW.setBigUint64(0, bits - 1n, false);
    return FLOAT64_VIEW.getFloat64(0, false);
  }

  function decimalPartsToFloorNumber(parts) {
    if (parts.units === 0n) {
      return { value: 0, unrepresentable: false };
    }
    let candidate = decimalPartsToNumber(parts);
    if (candidate === Infinity) candidate = Number.MAX_VALUE;
    if (candidate === 0) {
      return { value: 0, unrepresentable: true };
    }
    if (compareDecimalParts(decimalParts(candidate), parts) > 0) {
      candidate = nextDownPositive(candidate);
    }
    return {
      value: candidate,
      unrepresentable: candidate === 0
    };
  }

  function subtractDecimalParts(left, right) {
    const exponent = Math.min(left.exponent, right.exponent);
    const leftShift = left.exponent - exponent;
    const rightShift = right.exponent - exponent;
    const leftUnits = left.units * (10n ** BigInt(leftShift));
    const rightUnits = right.units * (10n ** BigInt(rightShift));
    return normalizeDecimalParts({
      units: leftUnits - rightUnits,
      exponent
    });
  }

  function addDecimalParts(left, right) {
    const exponent = Math.min(left.exponent, right.exponent);
    const leftShift = left.exponent - exponent;
    const rightShift = right.exponent - exponent;
    const leftUnits = left.units * (10n ** BigInt(leftShift));
    const rightUnits = right.units * (10n ** BigInt(rightShift));
    return normalizeDecimalParts({
      units: leftUnits + rightUnits,
      exponent
    });
  }

  function millisecondsParts(secondsParts) {
    return normalizeDecimalParts({
      units: secondsParts.units,
      exponent: secondsParts.exponent + 3
    });
  }

  function timestampCoherenceTolerance(left, right) {
    return Number.EPSILON * 8 * Math.max(
      Number.MIN_VALUE,
      Math.abs(left),
      Math.abs(right)
    );
  }

  function anchoredCursorMs(
    target,
    valueKey,
    anchorKey,
    baseKey
  ) {
    if (!target ||
        !Number.isFinite(target[valueKey]) ||
        !Number.isFinite(target[anchorKey]) ||
        target[anchorKey] < 0 ||
        !Number.isFinite(target[baseKey])) {
      return null;
    }
    const elapsedParts = subtractDecimalParts(
      decimalParts(target[valueKey]),
      decimalParts(target[baseKey])
    );
    return decimalPartsToNumber(addDecimalParts(
      decimalParts(target[anchorKey]),
      millisecondsParts(elapsedParts)
    ));
  }

  function logicalFromMs(model, suppliedFromMs) {
    const currentCursor = anchoredCursorMs(
      model && model.current,
      'elapsed',
      'elapsedAnchorMs',
      'elapsedBaseSeconds'
    );
    const world = model &&
      model.systems &&
      model.systems.world;
    const worldCursor = anchoredCursorMs(
      world,
      'tickAccumulator',
      'tickAnchorMs',
      'tickBaseSeconds'
    );
    const candidates = [currentCursor, worldCursor];
    for (let index = 0; index < candidates.length; index++) {
      const candidate = candidates[index];
      if (candidate != null &&
          Math.abs(candidate - suppliedFromMs) <=
            timestampCoherenceTolerance(candidate, suppliedFromMs)) {
        return candidate;
      }
    }
    return suppliedFromMs;
  }

  function createTimeAccount(seconds) {
    return {
      parts: decimalParts(seconds),
      value: seconds,
      unrepresentable: false
    };
  }

  function subtractTimeAccount(account, step) {
    const numericRaw = account.value - step;
    const numericResult = subtractSchedulerSeconds(account.value, step);
    const decimalResult = subtractDecimalParts(
      account.parts,
      decimalParts(step)
    );

    if (numericRaw !== 0 && numericResult === 0) {
      account.parts = { units: 0n, exponent: 0 };
      account.value = 0;
      account.unrepresentable = false;
      return 0;
    }
    if (decimalResult.units < 0n) {
      throw new RangeError('simulation decimal time account became negative');
    }
    account.parts = decimalResult;
    const floored = decimalPartsToFloorNumber(decimalResult);
    account.value = floored.value;
    account.unrepresentable = floored.unrepresentable;
    return account.value;
  }

  function transitionLimit(options) {
    if (options.transitionLimit == null) {
      return DEFAULT_TRANSITION_LIMIT;
    }
    const value = options.transitionLimit;
    if (!Number.isFinite(value) || value < 1) {
      throw new RangeError('transitionLimit must be a positive finite number');
    }
    return Math.min(DEFAULT_TRANSITION_LIMIT, Math.floor(value));
  }

  function advance(model, elapsedSeconds, options) {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      throw new RangeError('elapsedSeconds must be a non-negative finite number');
    }
    const config = options || {};
    if (config.source !== 'online' && config.source !== 'offline') {
      throw new TypeError('source must be online or offline');
    }
    validateRules(config.rules);
    const lanes = config.lanes == null ? [] : config.lanes;
    validateLanes(lanes);

    const suppliedFromMs = config.fromMs == null ? 0 : config.fromMs;
    if (!Number.isFinite(suppliedFromMs) || suppliedFromMs < 0) {
      throw new RangeError('fromMs must be a non-negative finite number');
    }
    const state = cloneJsonValue(model);
    const fromMs = logicalFromMs(state, suppliedFromMs);
    const elapsedRealityParts = decimalParts(elapsedSeconds);
    const toMs = decimalPartsToNumber(
      addDecimalParts(
        decimalParts(fromMs),
        millisecondsParts(elapsedRealityParts)
      )
    );
    if (!Number.isFinite(toMs)) {
      throw new RangeError('simulation time range must remain finite');
    }

    let mainBudget = elapsedSeconds;
    if (config.source === 'offline' &&
        config.mainActionLimitSeconds != null) {
      if (!Number.isFinite(config.mainActionLimitSeconds)) {
        throw new RangeError(
          'mainActionLimitSeconds must be finite or null'
        );
      }
      mainBudget = Math.min(
        elapsedSeconds,
        Math.max(0, config.mainActionLimitSeconds)
      );
    }

    const initialActionKey = state.current &&
      typeof state.current.key === 'string'
      ? state.current.key
      : null;
    const report = SimulationReport.create({
      source: config.source,
      fromMs,
      toMs,
      requestedSeconds: elapsedSeconds,
      actionKey: initialActionKey,
      seedBefore: state.rngState
    });
    report.cappedSeconds = config.source === 'offline'
      ? elapsedSeconds - mainBudget
      : 0;

    if (elapsedSeconds === 0) {
      return {
        state,
        report,
        remainingSeconds: 0,
        done: true
      };
    }

    const maxTransitions = transitionLimit(config);
    const disabledLanes = new Set();
    let remaining = elapsedSeconds;
    let mainRemaining = mainBudget;
    const remainingAccount = createTimeAccount(elapsedSeconds);
    const mainRemainingAccount = createTimeAccount(mainBudget);
    let transitions = 0;
    let activeActionKey = initialActionKey;
    let mainDisabled = false;
    const timeBudgetMs = config.timeBudgetMs == null
      ? null
      : Number(config.timeBudgetMs);
    if (timeBudgetMs != null &&
        (!Number.isFinite(timeBudgetMs) || timeBudgetMs < 0)) {
      throw new RangeError('timeBudgetMs must be a non-negative finite number');
    }
    const wallStartedAt = timeBudgetMs != null &&
      typeof Date !== 'undefined' &&
      typeof Date.now === 'function'
      ? Date.now()
      : null;
    let budgetExhausted = false;

    function nowMs() {
      const elapsed = subtractDecimalParts(
        elapsedRealityParts,
        remainingAccount.parts
      );
      return decimalPartsToNumber(
        addDecimalParts(
          decimalParts(fromMs),
          millisecondsParts(elapsed)
        )
      );
    }

    function stopCurrent(reason, atMs, descriptorKey) {
      const currentKey = typeof descriptorKey === 'string'
        ? descriptorKey
        : (
          state.current &&
            typeof state.current.key === 'string'
            ? state.current.key
            : activeActionKey
        );
      if (currentKey &&
          report.action.key &&
          currentKey !== report.action.key) {
        // The new action belongs to the next advance and its own report.
        mainDisabled = true;
        activeActionKey = null;
        return;
      }
      const stopAt = Number.isFinite(atMs) && atMs >= 0 ? atMs : nowMs();
      if (currentKey) report.action.key = currentKey;
      SimulationReport.stop(report, reason, stopAt);
      if (currentKey) {
        state.lastActionStop = {
          key: currentKey,
          reason: report.action.stopReason,
          atMs: report.action.stopAtMs
        };
      }
      state.current = null;
      activeActionKey = null;
    }

    const helpers = {
      report,
      source: config.source,
      remainingSeconds: elapsedSeconds,
      offlineMonthBudget: config.source === 'offline'
        ? (Number.isFinite(config.offlineMonthCap)
          ? Math.max(0, Math.floor(config.offlineMonthCap))
          : 48)
        : null,
      random() {
        const value = config.rules.random(state);
        if (!Number.isFinite(value) || value < 0 || value >= 1) {
          throw new RangeError(
            'rules.random must return a finite value in [0, 1)'
          );
        }
        return value;
      },
      stopCurrent,
      nowMs
    };

    function tripGuard(dueLaneIndexes, descriptorKey) {
      addGuardWarning(report);
      if (state.current || activeActionKey) {
        stopCurrent(GUARD_WARNING, nowMs(), descriptorKey);
      }
      mainDisabled = true;
      dueLaneIndexes.forEach(function (index) {
        disabledLanes.add(index);
      });
    }

    // Online and offline both skip full-tree JSON equality when time advanced.
    // After long offline, worldEvents/relationships make per-tick stringify the
    // dominant cost of every click/frame. Zero-step loops still trip the guard.
    const strictMutationGuard = false;

    while (remaining > 0) {
      if (wallStartedAt != null &&
          timeBudgetMs != null &&
          (transitions & 15) === 0 &&
          Date.now() - wallStartedAt >= timeBudgetMs) {
        budgetExhausted = true;
        break;
      }
      helpers.remainingSeconds = remaining;
      let descriptor = null;
      let inspection = null;
      let precisionGuardPending = false;

      if (mainRemaining > 0 && !mainDisabled) {
        descriptor = config.rules.getAction(state);
        if (descriptor != null) {
          if (!descriptor || typeof descriptor !== 'object') {
            throw new TypeError(
              'rules.getAction must return an action descriptor or null'
            );
          }
          const descriptorKey = typeof descriptor.key === 'string'
            ? descriptor.key
            : (
              state.current && typeof state.current.key === 'string'
                ? state.current.key
                : activeActionKey
            );
          if (!state.current) {
            // A descriptor without a persisted current action is an adapter
            // contract violation. Disable the main lane immediately instead
            // of allowing zero-time stop descriptors to spin.
            transitions++;
            addGuardWarning(report);
            mainDisabled = true;
            descriptor = null;
            inspection = null;
          } else {
            activeActionKey = descriptorKey;
          }
          if (report.action.key == null && activeActionKey) {
            report.action.key = activeActionKey;
          }
          if (descriptor) {
            inspection = readInspection(
              config.rules.inspect(state, descriptor)
            );
            if (inspection.status === 'stop') {
              const beforeStop = strictMutationGuard
                ? jsonToken(state)
                : null;
              transitions++;
              if (transitions > maxTransitions) {
                tripGuard([], descriptor.key);
                continue;
              }
              stopCurrent(
                inspection.reason,
                nowMs(),
                descriptor.key
              );
              if (strictMutationGuard &&
                  beforeStop === jsonToken(state)) {
                tripGuard([], descriptor.key);
              }
              continue;
            }
          }
        } else if (!state.current) {
          activeActionKey = null;
        }
      }

      const laneBoundaries = lanes.map(function (lane, index) {
        if (disabledLanes.has(index)) return Infinity;
        return readBoundary(
          lane.nextBoundary(state, helpers),
          'lane "' + lane.id + '".nextBoundary'
        );
      });

      let actionBoundary = Infinity;
      if (descriptor && inspection.status === 'ready' && mainRemaining > 0) {
        actionBoundary = readBoundary(
          config.rules.nextBoundary(state, descriptor, helpers),
          'rules.nextBoundary'
        );
      }

      let step = remaining;
      laneBoundaries.forEach(function (boundary) {
        if (boundary < step) step = boundary;
      });
      if (actionBoundary < step) step = actionBoundary;
      if (descriptor &&
          inspection.status === 'ready' &&
          mainRemaining < step) {
        step = mainRemaining;
      }
      if (!Number.isFinite(step) || step < 0) {
        throw new RangeError('simulation selected an invalid time step');
      }

      const dueLaneIndexes = [];
      laneBoundaries.forEach(function (boundary, index) {
        if (boundary !== Infinity &&
            boundary <= step) {
          dueLaneIndexes.push(index);
        }
      });
      const actionDue = actionBoundary !== Infinity &&
        actionBoundary <= step;

      lanes.forEach(function (lane) {
        lane.elapse(state, step, helpers);
      });
      if (descriptor &&
          inspection.status === 'ready' &&
          mainRemaining > 0) {
        config.rules.elapse(
          state,
          descriptor,
          step,
          helpers
        );
        mainRemaining = subtractTimeAccount(mainRemainingAccount, step);
        if (mainRemainingAccount.unrepresentable) {
          mainRemaining = 0;
          precisionGuardPending = true;
        }
        report.mainActionSeconds += step;
      }

      remaining = subtractTimeAccount(remainingAccount, step);
      if (remainingAccount.unrepresentable) {
        remaining = 0;
        precisionGuardPending = true;
      }

      if (dueLaneIndexes.length === 0 && !actionDue) {
        if (precisionGuardPending) {
          tripGuard([], activeActionKey);
        }
        continue;
      }

      transitions++;
      if (transitions > maxTransitions) {
        tripGuard(dueLaneIndexes, activeActionKey);
        continue;
      }

      const guardMutations = strictMutationGuard || step === 0;
      const beforeResolution = guardMutations
        ? jsonToken(state)
        : null;
      dueLaneIndexes.forEach(function (index) {
        lanes[index].resolve(state, helpers);
      });

      if (actionDue && state.current) {
        const freshDescriptor = config.rules.getAction(state);
        const sameAction = freshDescriptor &&
          (
            activeActionKey == null ||
            typeof freshDescriptor.key !== 'string' ||
            freshDescriptor.key === activeActionKey
          );
        if (sameAction) {
          const freshInspection = readInspection(
            config.rules.inspect(state, freshDescriptor)
          );
          if (freshInspection.status === 'stop') {
            stopCurrent(
              freshInspection.reason,
              nowMs(),
              freshDescriptor.key
            );
          } else if (freshInspection.status === 'ready') {
            const completion = config.rules.complete(
              state,
              freshDescriptor,
              helpers
            );
            const completedKey = typeof freshDescriptor.key === 'string'
              ? freshDescriptor.key
              : activeActionKey;
            const nextKey = state.current &&
              typeof state.current.key === 'string'
              ? state.current.key
              : null;
            const switchedAction = Boolean(
              completedKey &&
              nextKey &&
              completedKey !== nextKey
            );
            if (switchedAction) {
              // A single report never crosses action keys. The new current
              // action remains untouched for the next advance.
              mainDisabled = true;
              activeActionKey = null;
            } else if (completion &&
                completion.stopReason != null &&
                (state.current || activeActionKey)) {
              stopCurrent(
                completion.stopReason,
                nowMs(),
                freshDescriptor.key
              );
            } else if (!state.current) {
              activeActionKey = null;
            }
          }
        }
      }

      const postResolutionKey = state.current &&
        typeof state.current.key === 'string'
        ? state.current.key
        : null;
      if (initialActionKey &&
          postResolutionKey &&
          postResolutionKey !== initialActionKey) {
        mainDisabled = true;
        activeActionKey = null;
      }
      if (precisionGuardPending) {
        tripGuard([], activeActionKey);
      }

      if (guardMutations &&
          beforeResolution === jsonToken(state)) {
        tripGuard(dueLaneIndexes, activeActionKey);
      }
    }

    report.mainActionSeconds = decimalPartsToNumber(
      subtractDecimalParts(
        decimalParts(mainBudget),
        mainRemainingAccount.parts
      )
    );

    if (budgetExhausted && remaining > 0) {
      report.toMs = nowMs();
      report.requestedSeconds = Math.max(
        0,
        (report.toMs - report.fromMs) / 1000
      );
    }

    return {
      // 在线短步进的结果会立刻 applyToRuntime，再克隆一次整树没有收益。
      state: config.source === 'online' ? state : cloneJsonValue(state),
      report: cloneJsonValue(report),
      remainingSeconds: remaining,
      done: !(remaining > 0)
    };
  }

  return Object.freeze({
    advance
  });
});
