(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./random.js'));
  } else if (root) {
    root.GameRules = factory(root.GameRandom);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  GameRandom
) {
  'use strict';

  const STOP = Object.freeze({
    COMPLETED: 'completed',
    RESOURCE_DEPLETED: 'resource_depleted',
    MATERIALS_EXHAUSTED: 'materials_exhausted',
    LIFESPAN_BUFFER: 'lifespan_buffer',
    INVALID_ACTION: 'invalid_action',
    REQUIREMENTS_INVALID: 'requirements_invalid'
  });

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

  function readNumber(value, fallback) {
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
    const units = BigInt(coefficient.replace('.', ''));
    return {
      units,
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
    const resultUnits = operation === 'add'
      ? leftUnits + rightUnits
      : leftUnits - rightUnits;
    return Number(resultUnits.toString() + 'e' + exponent);
  }

  function addDecimalNumbers(left, right) {
    return decimalOperation(left, right, 'add');
  }

  function subtractDecimalNumbers(left, right) {
    return decimalOperation(left, right, 'subtract');
  }

  function millisecondsFromSeconds(seconds) {
    const parts = decimalParts(seconds);
    return Number(parts.units.toString() + 'e' + (parts.exponent + 3));
  }

  function timestampCoherenceTolerance(left, right) {
    return Number.EPSILON * 8 * Math.max(
      Number.MIN_VALUE,
      Math.abs(left),
      Math.abs(right)
    );
  }

  function advanceTimestampMs(startMs, seconds) {
    return addDecimalNumbers(
      startMs,
      millisecondsFromSeconds(seconds)
    );
  }

  function bounded(value, minimum, maximum) {
    return Math.min(
      maximum == null ? Infinity : maximum,
      Math.max(minimum == null ? -Infinity : minimum, value)
    );
  }

  function timeCoherenceTolerance(publicValue, anchoredValue) {
    return Number.EPSILON * 32 * Math.max(
      1,
      Math.abs(publicValue),
      Math.abs(anchoredValue)
    );
  }

  function validTimeAnchor(target, anchorKey, baseKey, startMs) {
    return Number.isFinite(target[anchorKey]) &&
      target[anchorKey] >= 0 &&
      target[anchorKey] <= startMs + timestampCoherenceTolerance(
        target[anchorKey],
        startMs
      ) &&
      Number.isFinite(target[baseKey]);
  }

  function anchoredValueAt(
    anchorMs,
    baseValue,
    atMs,
    ratePerSecond,
    minimum,
    maximum
  ) {
    return bounded(
      baseValue +
        subtractDecimalNumbers(atMs, anchorMs) * ratePerSecond / 1000,
      minimum,
      maximum
    );
  }

  function ensureTimeAnchor(
    target,
    valueKey,
    anchorKey,
    baseKey,
    startMs,
    ratePerSecond,
    minimum,
    maximum
  ) {
    const publicValue = bounded(
      readNumber(target[valueKey], minimum == null ? 0 : minimum),
      minimum,
      maximum
    );
    const hasAnchor = validTimeAnchor(
      target,
      anchorKey,
      baseKey,
      startMs
    );
    const impliedValue = hasAnchor
      ? anchoredValueAt(
        target[anchorKey],
        target[baseKey],
        startMs,
        ratePerSecond,
        minimum,
        maximum
      )
      : null;
    const needsRebase = !hasAnchor ||
      Math.abs(publicValue - impliedValue) >
        timeCoherenceTolerance(publicValue, impliedValue);
    if (needsRebase) {
      target[anchorKey] = startMs;
      target[baseKey] = publicValue;
    }
    target[valueKey] = publicValue;
    return {
      anchorMs: target[anchorKey],
      baseValue: target[baseKey],
      publicValue
    };
  }

  function elapseAnchoredValue(
    target,
    valueKey,
    anchorKey,
    baseKey,
    startMs,
    endMs,
    ratePerSecond,
    minimum,
    maximum
  ) {
    const anchor = ensureTimeAnchor(
      target,
      valueKey,
      anchorKey,
      baseKey,
      startMs,
      ratePerSecond,
      minimum,
      maximum
    );
    target[valueKey] = anchoredValueAt(
      anchor.anchorMs,
      anchor.baseValue,
      endMs,
      ratePerSecond,
      minimum,
      maximum
    );
  }

  function secondsUntilAnchoredValue(
    target,
    valueKey,
    anchorKey,
    baseKey,
    nowMs,
    ratePerSecond,
    targetValue,
    minimum,
    maximum
  ) {
    const anchor = ensureTimeAnchor(
      target,
      valueKey,
      anchorKey,
      baseKey,
      nowMs,
      ratePerSecond,
      minimum,
      maximum
    );
    if ((ratePerSecond > 0 && anchor.publicValue >= targetValue) ||
        (ratePerSecond < 0 && anchor.publicValue <= targetValue)) {
      return 0;
    }
    const deadlineMs = addDecimalNumbers(
      anchor.anchorMs,
      (targetValue - anchor.baseValue) / ratePerSecond * 1000
    );
    const effectiveNowMs =
      Math.abs(nowMs - anchor.anchorMs) <=
        timestampCoherenceTolerance(nowMs, anchor.anchorMs)
        ? anchor.anchorMs
        : nowMs;
    return Math.max(
      0,
      subtractDecimalNumbers(deadlineMs, effectiveNowMs) / 1000
    );
  }

  function rebaseTimeValue(
    target,
    valueKey,
    anchorKey,
    baseKey,
    nowMs,
    value,
    minimum,
    maximum
  ) {
    const next = bounded(value, minimum, maximum);
    target[valueKey] = next;
    target[anchorKey] = nowMs;
    target[baseKey] = next;
  }

  function addMapValue(target, key, amount) {
    if (!key || !Number.isFinite(amount) || amount === 0) return;
    const previous = own(target, key)
      ? readNumber(target[key], 0)
      : 0;
    define(target, key, previous + amount);
  }

  function stackMap(player) {
    return player &&
      player.inventory &&
      player.inventory.stacks &&
      typeof player.inventory.stacks === 'object'
      ? player.inventory.stacks
      : null;
  }

  function gatheringSystem(state) {
    return state &&
      state.systems &&
      state.systems.gathering &&
      typeof state.systems.gathering === 'object'
      ? state.systems.gathering
      : null;
  }

  function clampFishStocks(system, maximum) {
    if (!system ||
        !system.fishStocks ||
        typeof system.fishStocks !== 'object') {
      return;
    }
    Object.keys(system.fishStocks).forEach(function (key) {
      define(
        system.fishStocks,
        key,
        Math.min(
          maximum,
          Math.max(0, readNumber(system.fishStocks[key], 0))
        )
      );
    });
  }

  function parseGatherKey(key) {
    if (typeof key !== 'string' || key.indexOf('gather:') !== 0) {
      return null;
    }
    const parts = key.split(':');
    if (parts.length !== 3) return null;
    if (parts[1] === 'explore') {
      return {
        mode: 'explore',
        skill: parts[2],
        entryId: null
      };
    }
    return {
      mode: 'gather',
      skill: parts[1],
      entryId: parts[2]
    };
  }

  function entryFor(config, skill, entryId) {
    const group = config.gatheringData[skill];
    if (!group || !Array.isArray(group.entries)) return null;
    for (let index = 0; index < group.entries.length; index++) {
      if (group.entries[index].id === entryId) return group.entries[index];
    }
    return null;
  }

  function skillLevel(player, skillKey) {
    const skill = player &&
      player.skills &&
      player.skills[skillKey];
    return skill && Number.isFinite(skill.lv)
      ? Math.max(1, Math.floor(skill.lv))
      : 1;
  }

  function currentHasRemaining(current) {
    return Boolean(current) &&
      (
        current.mode === 'repeat' ||
        readNumber(current.done, 0) < readNumber(current.count, 0)
      );
  }

  function canPay(stacks, cost) {
    if (!cost || typeof cost !== 'object') return true;
    return Object.keys(cost).every(function (key) {
      const needed = Math.max(0, readNumber(cost[key], 0));
      const available = stacks && own(stacks, key)
        ? readNumber(stacks[key], 0)
        : 0;
      return available >= needed;
    });
  }

  function pay(stacks, cost) {
    if (!cost || typeof cost !== 'object') return;
    Object.keys(cost).forEach(function (key) {
      const amount = Math.max(0, readNumber(cost[key], 0));
      const available = own(stacks, key)
        ? readNumber(stacks[key], 0)
        : 0;
      define(stacks, key, available - amount);
    });
  }

  function addStack(stacks, key, amount) {
    const previous = own(stacks, key)
      ? readNumber(stacks[key], 0)
      : 0;
    define(stacks, key, previous + amount);
  }

  function snapshotStacks(stacks) {
    const snapshot = {};
    Object.keys(stacks || {}).forEach(function (key) {
      define(snapshot, key, readNumber(stacks[key], 0));
    });
    return snapshot;
  }

  function recordStackEconomy(before, after, report) {
    const keys = Object.create(null);
    Object.keys(before).forEach(function (key) { keys[key] = true; });
    Object.keys(after).forEach(function (key) { keys[key] = true; });
    Object.keys(keys).forEach(function (key) {
      const delta = readNumber(after[key], 0) - readNumber(before[key], 0);
      if (delta > 0) addMapValue(report.gains.items, key, delta);
      if (delta < 0) addMapValue(report.costs.items, key, -delta);
    });
  }

  function addSkillXp(config, player, skillKey, amount, report) {
    if (!skillKey ||
        !player.skills ||
        !player.skills[skillKey] ||
        !Number.isFinite(amount) ||
        amount <= 0) {
      return;
    }
    const skill = player.skills[skillKey];
    skill.lv = Math.max(1, Math.floor(readNumber(skill.lv, 1)));
    skill.xp = Math.max(0, readNumber(skill.xp, 0)) + amount;
    addMapValue(report.gains.skillXp, skillKey, amount);
    while (skill.lv < 99) {
      const needed = readNumber(config.skillXpNeed(skill.lv), Infinity);
      if (!(needed > 0) || skill.xp < needed) break;
      skill.xp -= needed;
      skill.lv++;
      report.levels.push({ skill: skillKey, level: skill.lv });
    }
  }

  function addMasteryXp(
    config,
    player,
    skill,
    entryId,
    amount,
    report
  ) {
    const mastery = player.mastery &&
      player.mastery[skill];
    const entry = mastery &&
      mastery.entries &&
      mastery.entries[entryId];
    if (!entry || !Number.isFinite(amount) || amount <= 0) return;
    entry.lv = Math.max(1, Math.floor(readNumber(entry.lv, 1)));
    entry.xp = Math.max(0, readNumber(entry.xp, 0)) + amount;
    mastery.pool = Math.max(0, readNumber(mastery.pool, 0)) + amount * 0.25;
    addMapValue(report.gains.masteryXp, skill + ':' + entryId, amount);
    while (entry.lv < 99) {
      const needed = readNumber(config.masteryXpNeed(entry.lv), Infinity);
      if (!(needed > 0) || entry.xp < needed) break;
      entry.xp -= needed;
      entry.lv++;
      report.levels.push({
        skill,
        mastery: entryId,
        level: entry.lv
      });
    }
  }

  function applyEffects(player, effects) {
    const stacks = stackMap(player);
    const source = effects && typeof effects === 'object'
      ? effects
      : {};
    const stackEffects = source.stacks &&
      typeof source.stacks === 'object'
      ? source.stacks
      : {};
    Object.keys(stackEffects).forEach(function (key) {
      const amount = readNumber(stackEffects[key], 0);
      if (amount !== 0) addStack(stacks, key, amount);
    });
    const cultivation = readNumber(source.cultivation, 0);
    player.xiwei = Math.max(0, readNumber(player.xiwei, 0) + cultivation);
    const jingqi = readNumber(source.jingqi, 0);
    player.jingqi = Math.max(0, readNumber(player.jingqi, 0) + jingqi);
  }

  function rollDrop(drops, random) {
    if (!Array.isArray(drops) || drops.length === 0) return null;
    let total = 0;
    drops.forEach(function (drop) {
      total += Math.max(0, readNumber(drop.w, 0));
    });
    if (!(total > 0)) return drops[0];
    let cursor = random() * total;
    for (let index = 0; index < drops.length; index++) {
      cursor -= Math.max(0, readNumber(drops[index].w, 0));
      if (cursor <= 0) return drops[index];
    }
    return drops[drops.length - 1];
  }

  function discoverable(config, skill, level) {
    const result = config.discoverableEntries.call(
      config,
      skill,
      level
    );
    return Array.isArray(result) ? result : [];
  }

  function effectiveTime(config, skill, entryId, player) {
    const value = config.effectiveGatherTime.call(
      config,
      skill,
      entryId,
      player
    );
    return Math.max(Number.MIN_VALUE, readNumber(value, 1));
  }

  function masteryChance(config, skill, entryId, player) {
    return Math.min(
      1,
      Math.max(
        0,
        readNumber(
          config.masteryDoubleChance.call(
            config,
            skill,
            entryId,
            player
          ),
          0
        )
      )
    );
  }

  function requireRecord(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(label + ' must be an object');
    }
    return value;
  }

  function requireFinite(value, label, minimum, strictMinimum) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new RangeError(label + ' must be finite');
    }
    if (strictMinimum ? value <= minimum : value < minimum) {
      throw new RangeError(
        label + ' must be ' +
          (strictMinimum ? 'greater than ' : 'at least ') +
          minimum
      );
    }
    return value;
  }

  function validateNumberMap(value, label) {
    const map = requireRecord(value, label);
    Object.keys(map).forEach(function (key) {
      requireFinite(map[key], label + '.' + key, 0, false);
    });
  }

  function validateActions(actions) {
    Object.keys(actions).forEach(function (key) {
      const action = requireRecord(actions[key], 'config.actions.' + key);
      requireFinite(action.time, 'config.actions.' + key + '.time', 0, true);
      requireFinite(action.xp, 'config.actions.' + key + '.xp', 0, false);
      if (action.needLv != null) {
        requireFinite(
          action.needLv,
          'config.actions.' + key + '.needLv',
          0,
          false
        );
      }
      if (action.cost != null) {
        validateNumberMap(action.cost, 'config.actions.' + key + '.cost');
      }
      const effects = requireRecord(
        action.effects,
        'config.actions.' + key + '.effects'
      );
      validateNumberMap(
        effects.stacks,
        'config.actions.' + key + '.effects.stacks'
      );
      requireFinite(
        effects.cultivation,
        'config.actions.' + key + '.effects.cultivation',
        0,
        false
      );
      if (typeof effects.jingqi !== 'number' ||
          !Number.isFinite(effects.jingqi)) {
        throw new RangeError(
          'config.actions.' + key + '.effects.jingqi must be finite'
        );
      }
    });
  }

  function validateGathering(gatheringData) {
    Object.keys(gatheringData).forEach(function (skill) {
      const group = requireRecord(
        gatheringData[skill],
        'config.gatheringData.' + skill
      );
      if (!Array.isArray(group.entries)) {
        throw new TypeError(
          'config.gatheringData.' + skill + '.entries must be an array'
        );
      }
      group.entries.forEach(function (entry, index) {
        const label = 'config.gatheringData.' + skill +
          '.entries[' + index + ']';
        requireRecord(entry, label);
        if (typeof entry.id !== 'string' || entry.id.length === 0) {
          throw new TypeError(label + '.id must be a non-empty string');
        }
        requireFinite(entry.time, label + '.time', 0, true);
        requireFinite(entry.xp, label + '.xp', 0, false);
        requireFinite(entry.unlockLv, label + '.unlockLv', 0, false);
        if (!Array.isArray(entry.drops) || entry.drops.length === 0) {
          throw new TypeError(label + '.drops must be a non-empty array');
        }
        let totalWeight = 0;
        entry.drops.forEach(function (drop, dropIndex) {
          const dropLabel = label + '.drops[' + dropIndex + ']';
          requireRecord(drop, dropLabel);
          if (typeof drop.item !== 'string' || drop.item.length === 0) {
            throw new TypeError(
              dropLabel + '.item must be a non-empty string'
            );
          }
          totalWeight += requireFinite(
            drop.w,
            dropLabel + '.w',
            0,
            false
          );
          requireFinite(drop.q, dropLabel + '.q', 0, false);
        });
        if (!(totalWeight > 0)) {
          throw new RangeError(label + '.drops must have positive weight');
        }
        if (skill !== 'fishing') {
          requireFinite(entry.capMin, label + '.capMin', 0, false);
          requireFinite(entry.capMax, label + '.capMax', 0, false);
          if (entry.capMax < entry.capMin) {
            throw new RangeError(
              label + '.capMax must be at least capMin'
            );
          }
        }
      });
    });
  }

  function validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new TypeError('config must be an object');
    }
    [
      'actions',
      'gatheringData',
      'gatherSkillKey',
      'constants'
    ].forEach(function (key) {
      if (!config[key] || typeof config[key] !== 'object') {
        throw new TypeError('config.' + key + ' must be an object');
      }
    });
    [
      'discoverableEntries',
      'skillXpNeed',
      'masteryXpNeed',
      'masteryDoubleChance',
      'effectiveGatherTime'
    ].forEach(function (key) {
      if (typeof config[key] !== 'function') {
        throw new TypeError('config.' + key + ' must be a function');
      }
    });
    [
      'fishMax',
      'fishRecoverSeconds',
      'moodMax',
      'moodRegenPerSecond',
      'yearSeconds',
      'lifespanBufferYears',
      'worldTickSeconds'
    ].forEach(function (key) {
      if (!Number.isFinite(config.constants[key]) ||
          config.constants[key] < 0) {
        throw new TypeError(
          'config.constants.' + key + ' must be a non-negative number'
        );
      }
    });
    requireFinite(
      config.constants.fishMax,
      'config.constants.fishMax',
      0,
      false
    );
    requireFinite(
      config.constants.fishRecoverSeconds,
      'config.constants.fishRecoverSeconds',
      0,
      true
    );
    requireFinite(
      config.constants.moodMax,
      'config.constants.moodMax',
      0,
      false
    );
    requireFinite(
      config.constants.moodRegenPerSecond,
      'config.constants.moodRegenPerSecond',
      0,
      false
    );
    requireFinite(
      config.constants.yearSeconds,
      'config.constants.yearSeconds',
      0,
      true
    );
    requireFinite(
      config.constants.lifespanBufferYears,
      'config.constants.lifespanBufferYears',
      0,
      false
    );
    requireFinite(
      config.constants.worldTickSeconds,
      'config.constants.worldTickSeconds',
      0,
      true
    );
    if (config.random != null && typeof config.random !== 'function') {
      throw new TypeError('config.random must be a function');
    }
    validateActions(config.actions);
    validateGathering(config.gatheringData);
  }

  function create(config) {
    validateConfig(config);
    const constants = {
      fishMax: config.constants.fishMax,
      fishRecoverSeconds: config.constants.fishRecoverSeconds,
      moodMax: config.constants.moodMax,
      moodRegenPerSecond: config.constants.moodRegenPerSecond,
      yearSeconds: config.constants.yearSeconds,
      lifespanBufferYears: config.constants.lifespanBufferYears,
      worldTickSeconds: config.constants.worldTickSeconds
    };

    function descriptorFor(state) {
      const current = state.current;
      if (!current || typeof current.key !== 'string') return null;
      clampFishStocks(gatheringSystem(state), constants.fishMax);
      const parsed = parseGatherKey(current.key);
      if (parsed) {
        if (parsed.mode === 'explore') {
          return {
            key: current.key,
            kind: 'explore',
            skill: parsed.skill,
            duration: 2
          };
        }
        const entry = entryFor(config, parsed.skill, parsed.entryId);
        return {
          key: current.key,
          kind: parsed.skill === 'fishing' ? 'fishing' : 'gathering',
          skill: parsed.skill,
          entryId: parsed.entryId,
          entry,
          duration: entry
            ? effectiveTime(config, parsed.skill, parsed.entryId, state.player)
            : 0
        };
      }
      const action = own(config.actions, current.key)
        ? config.actions[current.key]
        : null;
      return {
        key: current.key,
        kind: action ? 'action' : 'unknown',
        action,
        duration: action ? Math.max(Number.MIN_VALUE, action.time) : 0
      };
    }

    function requirementsValid(state, descriptor) {
      const player = state.player;
      if (!player || !stackMap(player)) return false;
      if (descriptor.kind === 'action') {
        const action = descriptor.action;
        return !action.needLv ||
          skillLevel(player, action.skill) >= action.needLv;
      }
      if (descriptor.kind === 'explore') {
        const skillKey = config.gatherSkillKey[descriptor.skill];
        if (!skillKey) return false;
        return discoverable(
          config,
          descriptor.skill,
          skillLevel(player, skillKey)
        ).length > 0;
      }
      if (descriptor.kind === 'gathering' ||
          descriptor.kind === 'fishing') {
        if (!descriptor.entry) return false;
        const skillKey = config.gatherSkillKey[descriptor.skill];
        return Boolean(skillKey) &&
          skillLevel(player, skillKey) >=
            Math.max(1, readNumber(descriptor.entry.unlockLv, 1));
      }
      return true;
    }

    function inspect(state, descriptor) {
      const current = state.current;
      if (descriptor.kind === 'unknown') {
        return { status: 'stop', reason: STOP.INVALID_ACTION };
      }
      if (!currentHasRemaining(current)) {
        return { status: 'stop', reason: STOP.COMPLETED };
      }
      if (!requirementsValid(state, descriptor)) {
        return { status: 'stop', reason: STOP.REQUIREMENTS_INVALID };
      }
      if (descriptor.kind === 'action') {
        if (!canPay(stackMap(state.player), descriptor.action.cost)) {
          return {
            status: 'stop',
            reason: STOP.MATERIALS_EXHAUSTED
          };
        }
      }
      if (descriptor.kind === 'gathering') {
        const system = gatheringSystem(state);
        const spot = system &&
          system.spots &&
          system.spots[descriptor.skill];
        if (!spot ||
            spot.id !== descriptor.entryId ||
            readNumber(spot.left, 0) <= 0) {
          return {
            status: 'stop',
            reason: STOP.RESOURCE_DEPLETED
          };
        }
      }
      if (descriptor.kind === 'fishing') {
        const system = gatheringSystem(state);
        if (!system || !system.fishStocks) {
          return {
            status: 'stop',
            reason: STOP.REQUIREMENTS_INVALID
          };
        }
        clampFishStocks(system, constants.fishMax);
        const stock = own(system.fishStocks, descriptor.entryId)
          ? readNumber(system.fishStocks[descriptor.entryId], 0)
          : constants.fishMax;
        if (stock <= 0) {
          return { status: 'waiting', reason: null };
        }
      }
      return { status: 'ready', reason: null };
    }

    function completeCurrentDuration(current, duration, nowMs) {
      const elapsed = readNumber(current.elapsed, 0);
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
      rebaseTimeValue(
        current,
        'elapsed',
        'elapsedAnchorMs',
        'elapsedBaseSeconds',
        completionMs,
        remainder,
        0
      );
    }

    function completeAction(state, descriptor, helpers) {
      const action = descriptor.action;
      const player = state.player;
      const stacks = stackMap(player);
      const before = snapshotStacks(stacks);
      pay(stacks, action.cost);
      applyEffects(player, action.effects);
      recordStackEconomy(before, stacks, helpers.report);
      const cultivation = readNumber(
        action.effects && action.effects.cultivation,
        0
      );
      if (cultivation > 0) {
        helpers.report.gains.cultivation += cultivation;
      }
      addSkillXp(
        config,
        player,
        action.skill,
        readNumber(action.xp, 0),
        helpers.report
      );
      completeCurrentDuration(
        state.current,
        descriptor.duration,
        helpers.nowMs()
      );
      state.current.done++;
      state.current.stalled = false;
      helpers.report.action.completed++;
      if (!currentHasRemaining(state.current)) return STOP.COMPLETED;
      if (!canPay(stacks, action.cost)) return STOP.MATERIALS_EXHAUSTED;
      return null;
    }

    function completeExplore(state, descriptor, helpers) {
      const player = state.player;
      const skillKey = config.gatherSkillKey[descriptor.skill];
      const pool = discoverable(
        config,
        descriptor.skill,
        skillLevel(player, skillKey)
      );
      let total = 0;
      pool.forEach(function (entry) {
        total += Math.max(1, readNumber(entry.unlockLv, 1));
      });
      let cursor = helpers.random() * total;
      let chosen = pool[0];
      for (let index = 0; index < pool.length; index++) {
        cursor -= Math.max(1, readNumber(pool[index].unlockLv, 1));
        if (cursor <= 0) {
          chosen = pool[index];
          break;
        }
      }
      const minimum = Math.max(0, Math.floor(readNumber(chosen.capMin, 0)));
      const maximum = Math.max(
        minimum,
        Math.floor(readNumber(chosen.capMax, minimum))
      );
      const capacity = minimum +
        Math.floor(helpers.random() * (maximum - minimum + 1));
      const system = gatheringSystem(state);
      define(system.spots, descriptor.skill, {
        id: chosen.id,
        cap: capacity,
        left: capacity
      });
      completeCurrentDuration(
        state.current,
        descriptor.duration,
        helpers.nowMs()
      );
      state.current.done++;
      state.current.stalled = false;
      helpers.report.action.completed++;
      return STOP.COMPLETED;
    }

    function completeGather(state, descriptor, helpers) {
      const player = state.player;
      const system = gatheringSystem(state);
      const stacks = stackMap(player);
      const before = snapshotStacks(stacks);
      const drop = rollDrop(descriptor.entry.drops, helpers.random);
      if (drop) {
        const quantity = Math.max(0, readNumber(drop.q, 1));
        addStack(stacks, drop.item, quantity);
        if (helpers.random() < masteryChance(
          config,
          descriptor.skill,
          descriptor.entryId,
          player
        )) {
          addStack(stacks, drop.item, quantity);
        }
      }
      addSkillXp(
        config,
        player,
        config.gatherSkillKey[descriptor.skill],
        readNumber(descriptor.entry.xp, 0),
        helpers.report
      );
      addMasteryXp(
        config,
        player,
        descriptor.skill,
        descriptor.entryId,
        readNumber(descriptor.entry.xp, 0) * 0.5,
        helpers.report
      );
      const spot = system.spots[descriptor.skill];
      spot.left = Math.max(0, readNumber(spot.left, 0) - 1);
      completeCurrentDuration(
        state.current,
        descriptor.duration,
        helpers.nowMs()
      );
      state.current.done++;
      state.current.stalled = false;
      helpers.report.action.completed++;
      recordStackEconomy(before, stacks, helpers.report);
      if (spot.left <= 0) {
        define(system.spots, descriptor.skill, null);
        return currentHasRemaining(state.current)
          ? STOP.RESOURCE_DEPLETED
          : STOP.COMPLETED;
      }
      if (!currentHasRemaining(state.current)) return STOP.COMPLETED;
      return null;
    }

    function completeFishing(state, descriptor, helpers) {
      const player = state.player;
      const system = gatheringSystem(state);
      const stocks = system.fishStocks;
      clampFishStocks(system, constants.fishMax);
      const stacks = stackMap(player);
      const before = snapshotStacks(stacks);
      if (!own(stocks, descriptor.entryId)) {
        define(stocks, descriptor.entryId, constants.fishMax);
      }
      const drop = rollDrop(descriptor.entry.drops, helpers.random);
      if (drop) {
        const quantity = Math.max(0, readNumber(drop.q, 1));
        addStack(stacks, drop.item, quantity);
        if (drop.item !== 'fishBox') {
          if (helpers.random() < masteryChance(
            config,
            descriptor.skill,
            drop.item,
            player
          )) {
            addStack(stacks, drop.item, quantity);
          }
          addMasteryXp(
            config,
            player,
            descriptor.skill,
            drop.item,
            readNumber(descriptor.entry.xp, 0) * 0.5,
            helpers.report
          );
        }
      }
      if (helpers.random() < 0.08) addStack(stacks, 'fishBox', 1);
      addSkillXp(
        config,
        player,
        config.gatherSkillKey[descriptor.skill],
        readNumber(descriptor.entry.xp, 0),
        helpers.report
      );
      define(
        stocks,
        descriptor.entryId,
        Math.max(0, readNumber(stocks[descriptor.entryId], 0) - 1)
      );
      completeCurrentDuration(
        state.current,
        descriptor.duration,
        helpers.nowMs()
      );
      state.current.done++;
      state.current.stalled = stocks[descriptor.entryId] <= 0;
      helpers.report.action.completed++;
      recordStackEconomy(before, stacks, helpers.report);
      if (!currentHasRemaining(state.current)) return STOP.COMPLETED;
      return null;
    }

    const rules = Object.freeze({
      getAction: descriptorFor,
      nextBoundary(state, descriptor, helpers) {
        return secondsUntilAnchoredValue(
          state.current,
          'elapsed',
          'elapsedAnchorMs',
          'elapsedBaseSeconds',
          helpers.nowMs(),
          1,
          descriptor.duration,
          0
        );
      },
      elapse(state, descriptor, seconds, helpers) {
        const startMs = helpers.nowMs();
        elapseAnchoredValue(
          state.current,
          'elapsed',
          'elapsedAnchorMs',
          'elapsedBaseSeconds',
          startMs,
          advanceTimestampMs(startMs, seconds),
          1,
          0
        );
        state.current.stalled = false;
      },
      inspect,
      complete(state, descriptor, helpers) {
        if (descriptor.kind === 'action') {
          return { stopReason: completeAction(state, descriptor, helpers) };
        }
        if (descriptor.kind === 'explore') {
          return { stopReason: completeExplore(state, descriptor, helpers) };
        }
        if (descriptor.kind === 'gathering') {
          return { stopReason: completeGather(state, descriptor, helpers) };
        }
        if (descriptor.kind === 'fishing') {
          return {
            stopReason: completeFishing(state, descriptor, helpers)
          };
        }
        return { stopReason: STOP.INVALID_ACTION };
      },
      random(state) {
        if (typeof config.random === 'function') {
          const custom = config.random(state);
          if (custom &&
              typeof custom === 'object' &&
              Number.isFinite(custom.value)) {
            if (Number.isFinite(custom.seed)) {
              state.rngState = GameRandom.normalizeSeed(custom.seed);
            }
            return custom.value;
          }
          return custom;
        }
        const result = GameRandom.next(state.rngState);
        state.rngState = result.seed;
        return result.value;
      }
    });

    const lifespanLane = Object.freeze({
      id: 'lifespan',
      nextBoundary(state, helpers) {
        const player = state.player;
        if (!player ||
            player.shouyuan === null ||
            !Number.isFinite(player.shouyuan) ||
            player.shouyuan <= constants.lifespanBufferYears ||
            (player.lifecycle &&
              player.lifecycle.status === 'safety_buffer') ||
            !(constants.yearSeconds > 0)) {
          return Infinity;
        }
        return secondsUntilAnchoredValue(
          player,
          'shouyuan',
          'lifespanAnchorMs',
          'lifespanBaseYears',
          helpers.nowMs(),
          -1 / constants.yearSeconds,
          constants.lifespanBufferYears,
          constants.lifespanBufferYears
        );
      },
      elapse(state, seconds, helpers) {
        const player = state.player;
        if (!player || !(constants.yearSeconds > 0)) {
          return;
        }
        if (player.lifecycle &&
            constants.yearSeconds === 12 * 60 * 60 &&
            Number.isFinite(seconds) &&
            seconds > 0) {
          const total = Math.max(
            0,
            readNumber(player.lifecycle.ageRemainderSeconds, 0) + seconds
          );
          const years = Math.floor(total / constants.yearSeconds);
          if (years > 0) {
            player.lifecycle.ageYears = Math.max(
              0,
              Math.floor(readNumber(player.lifecycle.ageYears, 18))
            ) + years;
          }
          player.lifecycle.ageRemainderSeconds = Math.round(
            (total - years * constants.yearSeconds) * 1000000000
          ) / 1000000000;
          if (helpers.report) {
            if (!helpers.report.lifecycle) {
              helpers.report.lifecycle = {
                playerYears: 0,
                playerBufferEntered: false,
                births: [],
                adulthood: [],
                legacyTransitionId: null
              };
            }
            helpers.report.lifecycle.playerYears =
              readNumber(helpers.report.lifecycle.playerYears, 0) +
              seconds / constants.yearSeconds;
          }
        }
        if (player.shouyuan === null ||
            !Number.isFinite(player.shouyuan)) return;
        const startMs = helpers.nowMs();
        elapseAnchoredValue(
          player,
          'shouyuan',
          'lifespanAnchorMs',
          'lifespanBaseYears',
          startMs,
          advanceTimestampMs(startMs, seconds),
          -1 / constants.yearSeconds,
          constants.lifespanBufferYears
        );
      },
      resolve(state, helpers) {
        if (state.player &&
            state.player.shouyuan !== null &&
            Number.isFinite(state.player.shouyuan)) {
          state.player.shouyuan = constants.lifespanBufferYears;
          if (state.player.lifecycle) {
            state.player.lifecycle.status = 'safety_buffer';
            state.player.lifecycle.pendingCause = 'lifespan';
          }
          if (helpers.report) {
            if (!helpers.report.lifecycle) {
              helpers.report.lifecycle = {
                playerYears: 0,
                playerBufferEntered: false,
                births: [],
                adulthood: [],
                legacyTransitionId: null
              };
            }
            helpers.report.lifecycle.playerBufferEntered = true;
          }
        }
        if (state.current) {
          helpers.stopCurrent(STOP.LIFESPAN_BUFFER, helpers.nowMs());
        }
      }
    });

    const fishRecoveryLane = Object.freeze({
      id: 'fish',
      nextBoundary(state, helpers) {
        const system = gatheringSystem(state);
        if (!system ||
            !system.fishStocks ||
            !(constants.fishRecoverSeconds > 0)) {
          return Infinity;
        }
        clampFishStocks(system, constants.fishMax);
        const recoverable = Object.keys(system.fishStocks).some(function (key) {
          return readNumber(system.fishStocks[key], 0) < constants.fishMax;
        });
        if (!recoverable) return Infinity;
        return secondsUntilAnchoredValue(
          system,
          'fishRecoverAcc',
          'fishRecoverAnchorMs',
          'fishRecoverBaseSeconds',
          helpers.nowMs(),
          1,
          constants.fishRecoverSeconds,
          0
        );
      },
      elapse(state, seconds, helpers) {
        const system = gatheringSystem(state);
        if (!system || !system.fishStocks) return;
        clampFishStocks(system, constants.fishMax);
        const recoverable = Object.keys(system.fishStocks).some(function (key) {
          return readNumber(system.fishStocks[key], 0) < constants.fishMax;
        });
        if (recoverable) {
          const startMs = helpers.nowMs();
          elapseAnchoredValue(
            system,
            'fishRecoverAcc',
            'fishRecoverAnchorMs',
            'fishRecoverBaseSeconds',
            startMs,
            advanceTimestampMs(startMs, seconds),
            1,
            0
          );
        }
      },
      resolve(state, helpers) {
        const system = gatheringSystem(state);
        if (!system || !system.fishStocks) return;
        clampFishStocks(system, constants.fishMax);
        rebaseTimeValue(
          system,
          'fishRecoverAcc',
          'fishRecoverAnchorMs',
          'fishRecoverBaseSeconds',
          helpers.nowMs(),
          readNumber(system.fishRecoverAcc, 0) -
            constants.fishRecoverSeconds,
          0
        );
        Object.keys(system.fishStocks).forEach(function (key) {
          const before = Math.max(0, readNumber(system.fishStocks[key], 0));
          const after = Math.min(constants.fishMax, before + 1);
          define(system.fishStocks, key, after);
          helpers.report.passive.fishRecovered += Math.max(
            0,
            after - before
          );
        });
      }
    });

    const moodLane = Object.freeze({
      id: 'mood',
      nextBoundary() {
        return Infinity;
      },
      elapse(state, seconds, helpers) {
        const player = state.player;
        if (!player) return;
        const startMs = helpers.nowMs();
        elapseAnchoredValue(
          player,
          'mood',
          'moodAnchorMs',
          'moodBase',
          startMs,
          advanceTimestampMs(startMs, seconds),
          constants.moodRegenPerSecond,
          0,
          constants.moodMax
        );
      },
      resolve() {}
    });

    function timedListLane(id, listAt, reportKey, handles) {
      const accepts = typeof handles === 'function'
        ? handles
        : function () { return true; };
      return Object.freeze({
        id,
        nextBoundary(state, helpers) {
          const list = listAt(state);
          let next = Infinity;
          list.forEach(function (item) {
            if (!accepts(item)) return;
            const remaining = readNumber(item.remainingSeconds, 0);
            if (remaining <= 0) next = 0;
            else {
              const boundary = secondsUntilAnchoredValue(
                item,
                'remainingSeconds',
                'remainingAnchorMs',
                'remainingBaseSeconds',
                helpers.nowMs(),
                -1,
                0,
                0
              );
              if (boundary < next) next = boundary;
            }
          });
          return next;
        },
        elapse(state, seconds, helpers) {
          const startMs = helpers.nowMs();
          listAt(state).forEach(function (item) {
            if (!accepts(item)) return;
            elapseAnchoredValue(
              item,
              'remainingSeconds',
              'remainingAnchorMs',
              'remainingBaseSeconds',
              startMs,
              advanceTimestampMs(startMs, seconds),
              -1,
              0
            );
          });
        },
        resolve(state, helpers) {
          const list = listAt(state);
          const active = [];
          list.forEach(function (item) {
            if (!accepts(item)) {
              active.push(item);
            } else if (readNumber(item.remainingSeconds, 0) <= 0) {
              helpers.report.passive[reportKey].push(item.id);
            } else {
              active.push(item);
            }
          });
          list.length = 0;
          active.forEach(function (item) { list.push(item); });
        }
      });
    }

    const farmLane = timedListLane(
      'farm',
      function (state) {
        return state.systems &&
          state.systems.homestead &&
          state.systems.homestead.farm &&
          Array.isArray(state.systems.homestead.farm.plots)
          ? state.systems.homestead.farm.plots
          : [];
      },
      'farmCompleted'
    );

    const parallelLane = timedListLane(
      'parallel',
      function (state) {
        return state.systems &&
          state.systems.parallel &&
          Array.isArray(state.systems.parallel.jobs)
          ? state.systems.parallel.jobs
          : [];
      },
      'parallelCompleted',
      function (job) {
        // Stage 4 owns event-created social follow-ups. Keeping them out of
        // the generic lane prevents an older runtime from deleting a ready
        // follow-up before the Stage 4 event queue has room for it.
        return !job ||
          (job.kind !== 'social' && job.kind !== 'lineageRitual');
      }
    );

    const worldLane = Object.freeze({
      id: 'world',
      nextBoundary(state, helpers) {
        if (!(constants.worldTickSeconds > 0)) return Infinity;
        if (!state.systems || !state.systems.world) return Infinity;
        return secondsUntilAnchoredValue(
          state.systems.world,
          'tickAccumulator',
          'tickAnchorMs',
          'tickBaseSeconds',
          helpers.nowMs(),
          1,
          constants.worldTickSeconds,
          0
        );
      },
      elapse(state, seconds, helpers) {
        if (state.systems && state.systems.world) {
          const startMs = helpers.nowMs();
          elapseAnchoredValue(
            state.systems.world,
            'tickAccumulator',
            'tickAnchorMs',
            'tickBaseSeconds',
            startMs,
            advanceTimestampMs(startMs, seconds),
            1,
            0
          );
        }
      },
      resolve(state, helpers) {
        if (!state.systems || !state.systems.world) return;
        rebaseTimeValue(
          state.systems.world,
          'tickAccumulator',
          'tickAnchorMs',
          'tickBaseSeconds',
          helpers.nowMs(),
          readNumber(state.systems.world.tickAccumulator, 0) -
            constants.worldTickSeconds,
          0
        );
        helpers.report.world.ticks++;
      }
    });

    const lanes = Object.freeze([
      lifespanLane,
      fishRecoveryLane,
      moodLane,
      farmLane,
      parallelLane,
      worldLane
    ]);

    return Object.freeze({ rules, lanes });
  }

  return Object.freeze({
    create
  });
});
