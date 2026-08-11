(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    let proxyDetector = null;
    try {
      proxyDetector = require('node:util').types.isProxy;
    } catch (error) {
      proxyDetector = null;
    }
    module.exports = factory(
      require('../content/combat.js'),
      require('../content/techniques.js'),
      require('./combat-stats.js'),
      require('./techniques.js'),
      require('./inventory.js'),
      require('./random.js'),
      require('./spirit-beasts.js'),
      proxyDetector,
      null
    );
  } else if (root) {
    root.CombatEngine = factory(
      root.CombatContent,
      root.TechniqueContent,
      root.CombatStats,
      root.Techniques,
      root.Inventory,
      root.GameRandom,
      root.SpiritBeasts,
      null,
      root.structuredClone
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  CombatContent,
  TechniqueContent,
  CombatStats,
  Techniques,
  Inventory,
  GameRandom,
  SpiritBeasts,
  proxyDetector,
  stateCloneProbe
) {
  'use strict';

  const MAX_TECHNIQUE_LEVEL = 20;
  const ACTIVE_SLOT_COUNT = 3;
  const PASSIVE_SLOT_COUNT = 3;
  const UINT32_MAX = 0xFFFFFFFF;
  const SUPPLY_TYPES = Object.freeze(['food', 'pill', 'talisman']);
  const STATUS_IDS = Object.freeze(['shock', 'slow', 'haste']);
  const PLAYER_STAT_KEYS = Object.freeze([
    'maxHp', 'maxQi', 'attack', 'defense', 'accuracy', 'evasion',
    'critChance', 'attackIntervalTicks'
  ]);

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function define(target, key, value) {
    Object.defineProperty(target, key, {
      value: value,
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

  function probeCloneCapability(value) {
    if (typeof proxyDetector === 'function') return true;
    if (typeof stateCloneProbe !== 'function') return false;
    try {
      stateCloneProbe(value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function plainRecord(value) {
    try {
      if (!value || typeof value !== 'object' ||
          Array.isArray(value) || isDetectedProxy(value)) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      if (prototype === null) return true;
      const parent = Object.getPrototypeOf(prototype);
      const descriptor = Object.getOwnPropertyDescriptor(
        prototype,
        'constructor'
      );
      return !!descriptor &&
        own(descriptor, 'value') &&
        typeof descriptor.value === 'function' &&
        descriptor.value.name === 'Object' &&
        parent === null;
    } catch (error) {
      return false;
    }
  }

  function plainArray(value) {
    try {
      if (!Array.isArray(value) || isDetectedProxy(value)) return false;
      const prototype = Object.getPrototypeOf(value);
      if (prototype === Array.prototype) return true;
      const descriptor = Object.getOwnPropertyDescriptor(
        prototype,
        'constructor'
      );
      const parent = Object.getPrototypeOf(prototype);
      return !!descriptor &&
        own(descriptor, 'value') &&
        typeof descriptor.value === 'function' &&
        descriptor.value.name === 'Array' &&
        !!parent &&
        Object.getPrototypeOf(parent) === null;
    } catch (error) {
      return false;
    }
  }

  function dataValue(record, key) {
    try {
      if (!plainRecord(record) || !own(record, key)) return undefined;
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      return descriptor && own(descriptor, 'value')
        ? descriptor.value
        : undefined;
    } catch (error) {
      return undefined;
    }
  }

  function dependencyValue(record, key) {
    try {
      if (!record || (typeof record !== 'object' &&
          typeof record !== 'function') || isDetectedProxy(record)) {
        return undefined;
      }
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      return descriptor && own(descriptor, 'value')
        ? descriptor.value
        : undefined;
    } catch (error) {
      return undefined;
    }
  }

  function strictArrayValues(value) {
    if (!plainArray(value)) return null;
    let keys;
    let lengthDescriptor;
    try {
      keys = Reflect.ownKeys(value);
      lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
    } catch (error) {
      return null;
    }
    if (!lengthDescriptor || !own(lengthDescriptor, 'value') ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0 ||
        keys.length !== lengthDescriptor.value + 1) {
      return null;
    }
    const result = [];
    for (let index = 0; index < lengthDescriptor.value; index++) {
      if (keys[index] !== String(index)) return null;
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      } catch (error) {
        return null;
      }
      if (!descriptor || descriptor.enumerable !== true ||
          !own(descriptor, 'value')) {
        return null;
      }
      result.push(descriptor.value);
    }
    return keys[lengthDescriptor.value] === 'length' ? result : null;
  }

  function exactDataKeys(record, expected) {
    if (!plainRecord(record)) return false;
    let keys;
    try {
      keys = Reflect.ownKeys(record);
    } catch (error) {
      return false;
    }
    if (keys.length !== expected.length) return false;
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (typeof key !== 'string' || expected.indexOf(key) < 0) {
        return false;
      }
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(record, key);
      } catch (error) {
        return false;
      }
      if (!descriptor || descriptor.enumerable !== true ||
          !own(descriptor, 'value')) {
        return false;
      }
    }
    return expected.every(function (key) {
      return own(record, key);
    });
  }

  function cloneStrict(value, ancestors) {
    if (value === null || typeof value === 'string' ||
        typeof value === 'boolean') {
      return { ok: true, value: value };
    }
    if (typeof value === 'number') {
      return Number.isFinite(value)
        ? { ok: true, value: value }
        : { ok: false, value: null };
    }
    if (typeof value !== 'object' || isDetectedProxy(value) ||
        ancestors.has(value)) {
      return { ok: false, value: null };
    }
    let keys;
    try {
      keys = Reflect.ownKeys(value);
    } catch (error) {
      return { ok: false, value: null };
    }
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(value);
    if (Array.isArray(value)) {
      const values = strictArrayValues(value);
      if (!values) return { ok: false, value: null };
      const result = [];
      for (let index = 0; index < values.length; index++) {
        const copied = cloneStrict(values[index], nextAncestors);
        if (!copied.ok) return copied;
        result.push(copied.value);
      }
      return { ok: true, value: result };
    }
    if (!plainRecord(value)) return { ok: false, value: null };
    const result = {};
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (typeof key !== 'string') return { ok: false, value: null };
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(value, key);
      } catch (error) {
        return { ok: false, value: null };
      }
      if (!descriptor || descriptor.enumerable !== true ||
          !own(descriptor, 'value')) {
        return { ok: false, value: null };
      }
      const copied = cloneStrict(descriptor.value, nextAncestors);
      if (!copied.ok) return copied;
      define(result, key, copied.value);
    }
    return { ok: true, value: result };
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }
    Object.freeze(value);
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return value;
  }

  function sameData(left, right) {
    if (left === right) return true;
    if (!left || !right || typeof left !== 'object' ||
        typeof right !== 'object') {
      return false;
    }
    if (Array.isArray(left) || Array.isArray(right)) {
      if (!Array.isArray(left) || !Array.isArray(right) ||
          left.length !== right.length) {
        return false;
      }
      for (let index = 0; index < left.length; index++) {
        if (!sameData(left[index], right[index])) return false;
      }
      return true;
    }
    if (!plainRecord(left) || !plainRecord(right)) return false;
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (leftKeys.length !== rightKeys.length) return false;
    for (let index = 0; index < leftKeys.length; index++) {
      const key = leftKeys[index];
      if (key !== rightKeys[index] ||
          !sameData(dataValue(left, key), dataValue(right, key))) {
        return false;
      }
    }
    return true;
  }

  function finite(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function nonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function positiveInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
  }

  function optionalNonNegativeInteger(record, key) {
    if (!own(record, key)) return { valid: true, value: 0 };
    const value = dataValue(record, key);
    return {
      valid: nonNegativeInteger(value),
      value: value
    };
  }

  function validRngState(value) {
    return Number.isSafeInteger(value) && value >= 0 &&
      value <= UINT32_MAX;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function snapshotRegistry(content, key, parser) {
    const source = dependencyValue(content, key);
    if (!source || typeof source !== 'object' ||
        Array.isArray(source) || isDetectedProxy(source)) {
      return Object.freeze({});
    }
    let keys;
    try {
      keys = Reflect.ownKeys(source);
    } catch (error) {
      return Object.freeze({});
    }
    const result = {};
    for (let index = 0; index < keys.length; index++) {
      const id = keys[index];
      if (typeof id !== 'string') continue;
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(source, id);
      } catch (error) {
        continue;
      }
      if (!descriptor || !own(descriptor, 'value')) continue;
      const parsed = parser(id, descriptor.value);
      if (parsed) define(result, id, parsed);
    }
    return deepFreeze(result);
  }

  function copyNumericRecord(value) {
    if (!plainRecord(value)) return null;
    let keys;
    try {
      keys = Reflect.ownKeys(value);
    } catch (error) {
      return null;
    }
    const result = {};
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (typeof key !== 'string') return null;
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(value, key);
      } catch (error) {
        return null;
      }
      if (!descriptor || descriptor.enumerable !== true ||
          !own(descriptor, 'value') || !finite(descriptor.value)) {
        return null;
      }
      define(result, key, descriptor.value);
    }
    return result;
  }

  function copyPositiveIntegerRecord(value) {
    if (value == null) return {};
    if (!plainRecord(value)) return null;
    let keys;
    try {
      keys = Reflect.ownKeys(value);
    } catch (error) {
      return null;
    }
    const result = {};
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (typeof key !== 'string' || key.length === 0) return null;
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(value, key);
      } catch (error) {
        return null;
      }
      if (!descriptor || descriptor.enumerable !== true ||
          !own(descriptor, 'value') ||
          !positiveInteger(descriptor.value)) {
        return null;
      }
      define(result, key, descriptor.value);
    }
    return result;
  }

  const enemies = snapshotRegistry(
    CombatContent,
    'ENEMIES',
    function (id, value) {
      if (!plainRecord(value) || dataValue(value, 'id') !== id) return null;
      const stats = copyNumericRecord(dataValue(value, 'stats'));
      const phases = strictArrayValues(dataValue(value, 'phases'));
      if (!stats || !phases) return null;
      const copiedPhases = [];
      for (let index = 0; index < phases.length; index++) {
        const phase = copyNumericRecord(phases[index]);
        if (!phase) return null;
        copiedPhases.push(phase);
      }
      return { id: id, stats: stats, phases: copiedPhases };
    }
  );

  const supplies = snapshotRegistry(
    CombatContent,
    'SUPPLIES',
    function (id, value) {
      if (!plainRecord(value)) return null;
      const type = dataValue(value, 'type');
      if (SUPPLY_TYPES.indexOf(type) < 0) return null;
      const result = { id: id, type: type };
      [
        'heal', 'restoreQi', 'shieldMaxHpRatio',
        'attackIntervalReduction', 'durationTicks'
      ].forEach(function (key) {
        const amount = dataValue(value, key);
        if (finite(amount)) result[key] = amount;
      });
      return result;
    }
  );

  const techniques = snapshotRegistry(
    TechniqueContent,
    'TECHNIQUES',
    function (id, value) {
      if (!plainRecord(value) || dataValue(value, 'id') !== id ||
          dataValue(value, 'kind') !== 'active') {
        return null;
      }
      const tier = dataValue(value, 'tier');
      const qiCost = dataValue(value, 'qiCost');
      const cooldownTicks = dataValue(value, 'cooldownTicks');
      const tags = strictArrayValues(dataValue(value, 'tags'));
      const effect = cloneStrict(dataValue(value, 'effect'), new Set());
      const runeCost = copyPositiveIntegerRecord(
        dataValue(value, 'runeCost')
      );
      if (!positiveInteger(tier) || !nonNegativeInteger(qiCost) ||
          !nonNegativeInteger(cooldownTicks) || !tags ||
          !tags.every(function (tag) {
            return typeof tag === 'string' && tag.length > 0;
          }) ||
          !effect.ok || !plainRecord(effect.value) || !runeCost) {
        return null;
      }
      return {
        id: id,
        tier: tier,
        qiCost: qiCost,
        cooldownTicks: cooldownTicks,
        tags: tags.slice(),
        runeCost: runeCost,
        effect: effect.value
      };
    }
  );

  const deriveStats = dependencyValue(CombatStats, 'derive');
  const selectCombatAction = dependencyValue(CombatStats, 'selectAction');
  const scaledTechniqueEffect = dependencyValue(Techniques, 'scaledEffect');
  const inventoryApply = dependencyValue(Inventory, 'apply');
  const randomNext = dependencyValue(GameRandom, 'next');
  const querySpiritBeasts = dependencyValue(SpiritBeasts, 'query');

  function findLoadout(loadouts, loadoutId) {
    for (let index = 0; index < loadouts.length; index++) {
      const loadout = loadouts[index];
      if (plainRecord(loadout) &&
          dataValue(loadout, 'id') === loadoutId) {
        return loadout;
      }
    }
    return null;
  }

  function validCondition(condition) {
    if (!plainRecord(condition)) return false;
    const type = dataValue(condition, 'type');
    if (type === 'always') return true;
    if (type === 'selfHpBelow' || type === 'selfQiAbove' ||
        type === 'enemyHpBelow') {
      const threshold = dataValue(condition, 'threshold');
      return finite(threshold) && threshold >= 0 && threshold <= 1;
    }
    if (type === 'enemyHasStatus') {
      return typeof dataValue(condition, 'statusId') === 'string';
    }
    if (type === 'selfMissingBuff') {
      return typeof dataValue(condition, 'buffId') === 'string';
    }
    return false;
  }

  function validSupplyConfig(config, type) {
    if (!plainRecord(config)) return false;
    const itemId = dataValue(config, 'itemId');
    if (itemId !== null &&
        (typeof itemId !== 'string' || !own(supplies, itemId) ||
          supplies[itemId].type !== type)) {
      return false;
    }
    if (typeof dataValue(config, 'stopWhenEmpty') !== 'boolean') {
      return false;
    }
    if (type === 'talisman') {
      return dataValue(config, 'useAt') === 'enemy_start';
    }
    const ratio = dataValue(config, 'triggerRatio');
    return finite(ratio) && ratio >= 0.05 && ratio <= 0.95;
  }

  function hasValidActiveBeast(model) {
    if (typeof querySpiritBeasts !== 'function') return false;
    const copied = cloneStrict(model, new Set());
    if (!copied.ok || !plainRecord(copied.value)) return false;
    let view;
    try {
      view = querySpiritBeasts(copied.value);
    } catch (error) {
      return false;
    }
    const activeIds = strictArrayValues(dataValue(view, 'activeIds'));
    const roster = strictArrayValues(dataValue(view, 'roster'));
    if (!activeIds || !roster || activeIds.length !== 1 ||
        typeof activeIds[0] !== 'string') {
      return false;
    }
    return roster.some(function (beast) {
      return plainRecord(beast) &&
        dataValue(beast, 'id') === activeIds[0];
    });
  }

  function copyLoadoutSnapshot(
    loadout,
    known,
    derivedStats,
    hasActiveBeast
  ) {
    if (!plainRecord(loadout) || !plainRecord(known) ||
        !plainRecord(derivedStats) ||
        typeof hasActiveBeast !== 'boolean') {
      return null;
    }
    const active = strictArrayValues(dataValue(
      loadout,
      'activeTechniques'
    ));
    const passive = strictArrayValues(dataValue(
      loadout,
      'passiveTechniques'
    ));
    const supplyState = dataValue(loadout, 'supplies');
    if (!active || active.length !== ACTIVE_SLOT_COUNT ||
        !passive || passive.length !== PASSIVE_SLOT_COUNT ||
        !plainRecord(supplyState)) {
      return null;
    }
    const activeCopy = [];
    for (let index = 0; index < active.length; index++) {
      const slot = active[index];
      const techniqueId = dataValue(slot, 'techniqueId');
      const condition = cloneStrict(dataValue(slot, 'condition'), new Set());
      if (!plainRecord(slot) ||
          (techniqueId !== null && typeof techniqueId !== 'string') ||
          !condition.ok || !validCondition(condition.value)) {
        return null;
      }
      if (techniqueId !== null &&
          (!own(techniques, techniqueId) || !own(known, techniqueId))) {
        return null;
      }
      activeCopy.push({
        techniqueId: techniqueId,
        condition: condition.value
      });
    }
    const passiveCopy = [];
    for (let index = 0; index < passive.length; index++) {
      const techniqueId = passive[index];
      if (techniqueId !== null &&
          (typeof techniqueId !== 'string' || !own(known, techniqueId))) {
        return null;
      }
      passiveCopy.push(techniqueId);
    }
    const supplyCopy = {};
    for (let index = 0; index < SUPPLY_TYPES.length; index++) {
      const type = SUPPLY_TYPES[index];
      const config = dataValue(supplyState, type);
      if (!validSupplyConfig(config, type)) return null;
      const copied = cloneStrict(config, new Set());
      if (!copied.ok) return null;
      define(supplyCopy, type, copied.value);
    }
    const levels = {};
    const knownIds = Object.keys(known);
    for (let index = 0; index < knownIds.length; index++) {
      const techniqueId = knownIds[index];
      const record = dataValue(known, techniqueId);
      const level = dataValue(record, 'level');
      if (!plainRecord(record) || !positiveInteger(level) ||
          level > MAX_TECHNIQUE_LEVEL) {
        return null;
      }
      define(levels, techniqueId, level);
    }
    const statsCopy = cloneStrict(derivedStats, new Set());
    return statsCopy.ok
      ? {
        activeTechniques: activeCopy,
        passiveTechniques: passiveCopy,
        supplies: supplyCopy,
        techniqueLevels: levels,
        derivedStats: statsCopy.value,
        hasActiveBeast: hasActiveBeast
      }
      : null;
  }

  function createEnemy(enemyId, phaseIndex) {
    const definition = typeof enemyId === 'string' && own(enemies, enemyId)
      ? enemies[enemyId]
      : null;
    const requestedPhase = phaseIndex == null ? 0 : phaseIndex;
    if (!definition || !nonNegativeInteger(requestedPhase)) return null;
    const phases = definition.phases;
    const maxPhase = phases.length > 0 ? phases.length - 1 : 0;
    if (requestedPhase > maxPhase) return null;
    const phase = phases.length > 0
      ? phases[requestedPhase]
      : {
        hpMultiplier: 1,
        attackMultiplier: 1,
        defenseMultiplier: 1
      };
    const stats = definition.stats;
    const hp = Math.round(stats.hp * (
      finite(phase.hpMultiplier) ? phase.hpMultiplier : 1
    ));
    const attack = Math.round(stats.attack * (
      finite(phase.attackMultiplier) ? phase.attackMultiplier : 1
    ));
    const defense = Math.round(stats.defense * (
      finite(phase.defenseMultiplier) ? phase.defenseMultiplier : 1
    ));
    return deepFreeze({
      id: enemyId,
      hp: hp,
      maxHp: hp,
      attack: attack,
      defense: defense,
      accuracy: stats.accuracy,
      evasion: stats.evasion,
      attackIntervalTicks: stats.attackIntervalTicks,
      cooldownTicks: 0,
      phase: requestedPhase,
      buffs: {},
      statuses: {}
    });
  }

  function createSession(model, rawOptions) {
    const copiedModel = cloneStrict(model, new Set());
    const copiedOptions = cloneStrict(rawOptions, new Set());
    if (!copiedModel.ok || !copiedOptions.ok ||
        !probeCloneCapability(model) ||
        !probeCloneCapability(rawOptions) ||
        !plainRecord(copiedModel.value) ||
        !plainRecord(copiedOptions.value)) {
      return null;
    }
    const state = copiedModel.value;
    const options = copiedOptions.value;
    const playerState = dataValue(state, 'player');
    const combatState = dataValue(playerState, 'combat');
    const techniqueState = dataValue(playerState, 'techniques');
    const known = dataValue(techniqueState, 'known');
    const loadouts = strictArrayValues(dataValue(combatState, 'loadouts'));
    const requestedLoadoutId = dataValue(options, 'loadoutId');
    const loadoutId = typeof requestedLoadoutId === 'string'
      ? requestedLoadoutId
      : dataValue(combatState, 'activeLoadoutId');
    if (!plainRecord(playerState) || !plainRecord(combatState) ||
        !plainRecord(techniqueState) || !plainRecord(known) ||
        !loadouts || typeof loadoutId !== 'string' ||
        typeof deriveStats !== 'function') {
      return null;
    }
    const loadout = findLoadout(loadouts, loadoutId);
    if (!loadout) return null;
    let derived;
    try {
      derived = deriveStats(state, loadoutId);
    } catch (error) {
      return null;
    }
    const snapshot = copyLoadoutSnapshot(
      loadout,
      known,
      derived,
      hasValidActiveBeast(state)
    );
    if (!snapshot) return null;

    const mode = dataValue(options, 'mode');
    let regionId = null;
    let dungeonId = null;
    let enemyId = null;
    const requestedWaveIndex = optionalNonNegativeInteger(
      options,
      'waveIndex'
    );
    const requestedWaveDefeated = optionalNonNegativeInteger(
      options,
      'waveDefeated'
    );
    const requestedBossPhase = optionalNonNegativeInteger(
      options,
      'bossPhase'
    );
    if (!requestedWaveIndex.valid ||
        !requestedWaveDefeated.valid ||
        !requestedBossPhase.valid) {
      return null;
    }
    let waveIndex = requestedWaveIndex.value;
    let waveDefeated = requestedWaveDefeated.value;
    let bossPhase = requestedBossPhase.value;
    let actionKey;
    if (mode === 'region') {
      regionId = dataValue(options, 'regionId');
      enemyId = dataValue(options, 'enemyId');
      const getRegion = dependencyValue(CombatContent, 'getRegion');
      let region;
      try {
        region = typeof getRegion === 'function' ? getRegion(regionId) : null;
      } catch (error) {
        return null;
      }
      const enemyIds = region && strictArrayValues(dataValue(
        region,
        'enemyIds'
      ));
      if (typeof regionId !== 'string' || typeof enemyId !== 'string' ||
          !enemyIds || enemyIds.indexOf(enemyId) < 0 ||
          waveIndex !== 0 || waveDefeated !== 0 || bossPhase !== 0) {
        return null;
      }
      actionKey = 'combat:region:' + regionId + ':' + enemyId;
    } else if (mode === 'dungeon') {
      dungeonId = dataValue(options, 'dungeonId');
      const getDungeon = dependencyValue(CombatContent, 'getDungeon');
      let dungeon;
      try {
        dungeon = typeof getDungeon === 'function'
          ? getDungeon(dungeonId)
          : null;
      } catch (error) {
        return null;
      }
      const waves = dungeon && strictArrayValues(dataValue(dungeon, 'waves'));
      if (typeof dungeonId !== 'string' || !waves ||
          waveIndex >= waves.length || !plainRecord(waves[waveIndex])) {
        return null;
      }
      enemyId = dataValue(options, 'enemyId');
      if (enemyId == null) enemyId = dataValue(waves[waveIndex], 'enemyId');
      if (enemyId !== dataValue(waves[waveIndex], 'enemyId')) return null;
      regionId = typeof dataValue(dungeon, 'regionId') === 'string'
        ? dataValue(dungeon, 'regionId')
        : null;
      actionKey = 'combat:dungeon:' + dungeonId;
    } else {
      return null;
    }
    const enemy = createEnemy(enemyId, bossPhase);
    if (!enemy) return null;
    const stats = snapshot.derivedStats;
    for (let index = 0; index < PLAYER_STAT_KEYS.length; index++) {
      if (!finite(dataValue(stats, PLAYER_STAT_KEYS[index]))) return null;
    }
    return deepFreeze({
      mode: mode,
      actionKey: actionKey,
      regionId: regionId,
      enemyId: enemyId,
      dungeonId: dungeonId,
      waveIndex: waveIndex,
      waveDefeated: waveDefeated,
      bossPhase: bossPhase,
      intermissionTicks: 0,
      elapsedTicks: 0,
      tickRemainderSeconds: 0,
      lastPlayerAction: null,
      loadoutId: loadoutId,
      loadoutSnapshot: snapshot,
      player: {
        hp: stats.maxHp,
        maxHp: stats.maxHp,
        qi: stats.maxQi,
        maxQi: stats.maxQi,
        attack: stats.attack,
        defense: stats.defense,
        accuracy: stats.accuracy,
        evasion: stats.evasion,
        critChance: stats.critChance,
        attackIntervalTicks: stats.attackIntervalTicks,
        cooldownTicks: 0,
        shield: 0,
        buffs: {},
        statuses: {},
        techniqueCooldowns: {}
      },
      enemy: enemy
    });
  }

  function emptyCounts() {
    return {
      gains: { techniqueXp: {} },
      costs: { items: {} },
      metrics: {
        damageDealt: 0,
        damageTaken: 0,
        suppliesUsed: {}
      }
    };
  }

  function resultDto(
    okValue,
    session,
    inventory,
    rngState,
    outcome,
    events,
    counts
  ) {
    return deepFreeze({
      ok: okValue,
      session: session,
      playerInventory: inventory,
      rngState: rngState,
      outcome: outcome,
      events: events,
      gains: counts.gains,
      costs: counts.costs,
      metrics: counts.metrics
    });
  }

  function invalidResult() {
    return resultDto(
      false,
      null,
      null,
      null,
      'continue',
      [],
      emptyCounts()
    );
  }

  function finiteAtLeast(value, minimum) {
    return finite(value) && value >= minimum;
  }

  function safeIntegerAtLeast(value, minimum) {
    return Number.isSafeInteger(value) && value >= minimum;
  }

  function validDerivedStats(value) {
    if (!exactDataKeys(value, PLAYER_STAT_KEYS)) return false;
    return finiteAtLeast(dataValue(value, 'maxHp'), 1) &&
      finiteAtLeast(dataValue(value, 'maxQi'), 1) &&
      finiteAtLeast(dataValue(value, 'attack'), 1) &&
      finiteAtLeast(dataValue(value, 'defense'), 1) &&
      finiteAtLeast(dataValue(value, 'accuracy'), 0) &&
      finiteAtLeast(dataValue(value, 'evasion'), 0) &&
      finiteAtLeast(dataValue(value, 'critChance'), 0) &&
      dataValue(value, 'critChance') <= 0.95 &&
      safeIntegerAtLeast(dataValue(value, 'attackIntervalTicks'), 2);
  }

  function validStatuses(statuses) {
    if (!plainRecord(statuses)) return false;
    const ids = Object.keys(statuses);
    for (let index = 0; index < ids.length; index++) {
      const statusId = ids[index];
      const status = dataValue(statuses, statusId);
      if (statusId === 'shock') {
        if (!exactDataKeys(
          status,
          ['remainingTicks', 'skipNextAction']
        ) ||
            !positiveInteger(dataValue(status, 'remainingTicks')) ||
            typeof dataValue(status, 'skipNextAction') !== 'boolean') {
          return false;
        }
      } else if (statusId === 'slow') {
        if (!exactDataKeys(
          status,
          ['remainingTicks', 'attackIntervalAdd']
        ) ||
            !positiveInteger(dataValue(status, 'remainingTicks')) ||
            dataValue(status, 'attackIntervalAdd') !== 2) {
          return false;
        }
      } else if (statusId === 'haste') {
        if (!exactDataKeys(
          status,
          ['remainingTicks', 'attackIntervalReduction']
        ) ||
            !positiveInteger(dataValue(status, 'remainingTicks')) ||
            dataValue(status, 'attackIntervalReduction') !== 0.1) {
          return false;
        }
      } else {
        return false;
      }
    }
    return true;
  }

  function validTechniqueCooldowns(value) {
    if (!plainRecord(value)) return false;
    const ids = Object.keys(value);
    for (let index = 0; index < ids.length; index++) {
      if (!own(techniques, ids[index]) ||
          !safeIntegerAtLeast(dataValue(value, ids[index]), 0)) {
        return false;
      }
    }
    return true;
  }

  function validCombatant(value, player) {
    if (!plainRecord(value)) return false;
    const hp = dataValue(value, 'hp');
    const maxHp = dataValue(value, 'maxHp');
    if (!finiteAtLeast(hp, 0) || !finiteAtLeast(maxHp, 1) ||
        hp > maxHp ||
        !finiteAtLeast(dataValue(value, 'attack'), player ? 1 : 0) ||
        !finiteAtLeast(dataValue(value, 'defense'), player ? 1 : 0) ||
        !finiteAtLeast(dataValue(value, 'accuracy'), 0) ||
        !finiteAtLeast(dataValue(value, 'evasion'), 0) ||
        !safeIntegerAtLeast(dataValue(
          value,
          'attackIntervalTicks'
        ), 2) ||
        !safeIntegerAtLeast(dataValue(value, 'cooldownTicks'), 0) ||
        !plainRecord(dataValue(value, 'buffs')) ||
        !validStatuses(dataValue(value, 'statuses'))) {
      return false;
    }
    if (!player) {
      return safeIntegerAtLeast(dataValue(value, 'phase'), 0);
    }
    const qi = dataValue(value, 'qi');
    const maxQi = dataValue(value, 'maxQi');
    const critChance = dataValue(value, 'critChance');
    return finiteAtLeast(qi, 0) &&
      finiteAtLeast(maxQi, 1) &&
      qi <= maxQi &&
      finiteAtLeast(critChance, 0) &&
      critChance <= 0.95 &&
      finiteAtLeast(dataValue(value, 'shield'), 0) &&
      validTechniqueCooldowns(dataValue(value, 'techniqueCooldowns'));
  }

  function validLastPlayerAction(value, snapshot, elapsedTicks) {
    if (value === null) return true;
    if (!exactDataKeys(value, ['id', 'slotIndex', 'tick'])) return false;
    const id = dataValue(value, 'id');
    const slotIndex = dataValue(value, 'slotIndex');
    const tick = dataValue(value, 'tick');
    if (!safeIntegerAtLeast(tick, 0) || tick >= elapsedTicks) {
      return false;
    }
    if (id === 'normalAttack') return slotIndex === null;
    const active = strictArrayValues(dataValue(
      snapshot,
      'activeTechniques'
    ));
    return typeof id === 'string' &&
      own(techniques, id) &&
      active &&
      safeIntegerAtLeast(slotIndex, 0) &&
      slotIndex < active.length &&
      dataValue(active[slotIndex], 'techniqueId') === id;
  }

  function inspectTick(session, rawContext) {
    const copiedSession = cloneStrict(session, new Set());
    const copiedContext = cloneStrict(rawContext, new Set());
    if (!copiedSession.ok || !copiedContext.ok ||
        !probeCloneCapability(session) ||
        !probeCloneCapability(rawContext) ||
        !plainRecord(copiedSession.value) ||
        !plainRecord(copiedContext.value)) {
      return null;
    }
    const safeSession = copiedSession.value;
    const safeContext = copiedContext.value;
    const snapshot = dataValue(safeSession, 'loadoutSnapshot');
    const player = dataValue(safeSession, 'player');
    const enemy = dataValue(safeSession, 'enemy');
    const inventory = dataValue(safeContext, 'playerInventory');
    const rngState = dataValue(safeContext, 'rngState');
    if (!plainRecord(snapshot) || !validCombatant(player, true) ||
        (enemy !== null && !validCombatant(enemy, false)) ||
        !plainRecord(inventory) || !validRngState(rngState) ||
        !validDerivedStats(dataValue(snapshot, 'derivedStats')) ||
        typeof dataValue(snapshot, 'hasActiveBeast') !== 'boolean' ||
        !safeIntegerAtLeast(dataValue(safeSession, 'waveIndex'), 0) ||
        !safeIntegerAtLeast(dataValue(safeSession, 'waveDefeated'), 0) ||
        !safeIntegerAtLeast(dataValue(safeSession, 'bossPhase'), 0) ||
        !safeIntegerAtLeast(dataValue(
          safeSession,
          'intermissionTicks'
        ), 0) ||
        !safeIntegerAtLeast(dataValue(safeSession, 'elapsedTicks'), 0) ||
        !validLastPlayerAction(
          dataValue(safeSession, 'lastPlayerAction'),
          snapshot,
          dataValue(safeSession, 'elapsedTicks')
        ) ||
        !finiteAtLeast(dataValue(
          safeSession,
          'tickRemainderSeconds'
        ), 0) ||
        dataValue(safeSession, 'tickRemainderSeconds') >= 0.25 ||
        (enemy !== null &&
          dataValue(enemy, 'phase') !==
            dataValue(safeSession, 'bossPhase'))) {
      return null;
    }
    return {
      session: safeSession,
      player: player,
      enemy: enemy,
      snapshot: snapshot,
      inventory: inventory,
      rngState: rngState
    };
  }

  function addCount(record, key, amount) {
    const previous = own(record, key) ? record[key] : 0;
    record[key] = previous + amount;
  }

  function event(type, sourceId, targetId, amount, critical, techniqueId) {
    return {
      type: type,
      sourceId: sourceId,
      targetId: targetId,
      amount: amount,
      critical: critical,
      techniqueId: techniqueId
    };
  }

  function warningEvent(code, techniqueId) {
    const value = event(
      'warning',
      'player',
      'enemy',
      0,
      false,
      techniqueId || null
    );
    value.code = code;
    return value;
  }

  function draw(parts) {
    if (typeof randomNext !== 'function') return null;
    let rolled;
    try {
      rolled = randomNext(parts.rngState);
    } catch (error) {
      return null;
    }
    const seed = dataValue(rolled, 'seed');
    const value = dataValue(rolled, 'value');
    if (!validRngState(seed) || !finite(value) ||
        value < 0 || value >= 1) {
      return null;
    }
    parts.rngState = seed;
    return value;
  }

  function critChanceFor(attacker) {
    const direct = dataValue(attacker, 'critChance');
    if (finite(direct)) return clamp(direct, 0, 0.95);
    const id = dataValue(attacker, 'id');
    return typeof id === 'string' && own(enemies, id) &&
      finite(enemies[id].stats.critChance)
      ? clamp(enemies[id].stats.critChance, 0, 0.95)
      : 0;
  }

  function applyDamage(target, amount) {
    let remaining = amount;
    const shield = finite(dataValue(target, 'shield'))
      ? Math.max(0, dataValue(target, 'shield'))
      : 0;
    if (shield > 0) {
      const absorbed = Math.min(shield, remaining);
      target.shield = shield - absorbed;
      remaining -= absorbed;
    }
    const before = target.hp;
    target.hp = Math.max(0, before - remaining);
    return before - target.hp;
  }

  function resolveAttack(
    parts,
    attacker,
    defender,
    sourceId,
    targetId,
    techniqueId,
    multiplier,
    defenseIgnore,
    hits
  ) {
    let landed = false;
    const count = positiveInteger(hits) ? hits : 1;
    for (let index = 0; index < count; index++) {
      const accuracyRoll = draw(parts);
      if (accuracyRoll === null) return { ok: false, landed: landed };
      const hitChance = clamp(
        0.75 + (attacker.accuracy - defender.evasion) * 0.005,
        0.2,
        0.98
      );
      if (accuracyRoll >= hitChance) {
        parts.events.push(event(
          'damage',
          sourceId,
          targetId,
          0,
          false,
          techniqueId
        ));
        continue;
      }
      const criticalRoll = draw(parts);
      if (criticalRoll === null) return { ok: false, landed: landed };
      const baseDamage = Math.max(1, Math.floor(
        attacker.attack * multiplier -
          defender.defense * (1 - defenseIgnore) * 0.5
      ));
      const critical = criticalRoll < critChanceFor(attacker);
      const amount = critical
        ? Math.floor(baseDamage * 1.5)
        : baseDamage;
      const applied = applyDamage(defender, amount);
      if (targetId === 'player') {
        parts.counts.metrics.damageTaken += applied;
      } else {
        parts.counts.metrics.damageDealt += applied;
      }
      parts.events.push(event(
        'damage',
        sourceId,
        targetId,
        amount,
        critical,
        techniqueId
      ));
      landed = true;
    }
    return { ok: true, landed: landed };
  }

  function statusRecord(statusId, remainingTicks) {
    if (statusId === 'shock') {
      return {
        remainingTicks: remainingTicks,
        skipNextAction: true
      };
    }
    if (statusId === 'slow') {
      return {
        remainingTicks: remainingTicks,
        attackIntervalAdd: 2
      };
    }
    return {
      remainingTicks: remainingTicks,
      attackIntervalReduction: 0.1
    };
  }

  function applyStatus(target, statusId, durationTicks) {
    if (STATUS_IDS.indexOf(statusId) < 0 ||
        !positiveInteger(durationTicks)) {
      return false;
    }
    const statuses = target.statuses;
    const current = own(statuses, statusId)
      ? statuses[statusId]
      : null;
    const currentRemaining = plainRecord(current) &&
      positiveInteger(dataValue(current, 'remainingTicks'))
      ? dataValue(current, 'remainingTicks')
      : 0;
    const next = statusRecord(
      statusId,
      Math.max(currentRemaining, durationTicks)
    );
    if (statusId === 'shock' && plainRecord(current) &&
        dataValue(current, 'skipNextAction') === true) {
      next.skipNextAction = true;
    }
    statuses[statusId] = next;
    return true;
  }

  function scaledEffectFor(techniqueId, level) {
    if (typeof scaledTechniqueEffect !== 'function') return null;
    let effect;
    try {
      effect = scaledTechniqueEffect(techniqueId, level);
    } catch (error) {
      return null;
    }
    const copied = cloneStrict(effect, new Set());
    return copied.ok && plainRecord(copied.value)
      ? copied.value
      : null;
  }

  function passiveHealingBonus(snapshot) {
    const passive = strictArrayValues(dataValue(
      snapshot,
      'passiveTechniques'
    ));
    const levels = dataValue(snapshot, 'techniqueLevels');
    if (!passive || !plainRecord(levels)) return 0;
    let total = 0;
    for (let index = 0; index < passive.length; index++) {
      const techniqueId = passive[index];
      if (techniqueId === null) continue;
      const level = dataValue(levels, techniqueId);
      const effect = scaledEffectFor(techniqueId, level);
      const amount = effect && dataValue(effect, 'supplyHealingBonus');
      if (finite(amount) && amount > 0) total += amount;
    }
    return total;
  }

  function taggedDamageBonus(snapshot, technique) {
    const passive = strictArrayValues(dataValue(
      snapshot,
      'passiveTechniques'
    ));
    const levels = dataValue(snapshot, 'techniqueLevels');
    if (!passive || !plainRecord(levels) || !technique) return 0;
    let total = 0;
    for (let index = 0; index < passive.length; index++) {
      const passiveId = passive[index];
      if (passiveId === null) continue;
      const effect = scaledEffectFor(
        passiveId,
        dataValue(levels, passiveId)
      );
      const bonuses = effect && dataValue(effect, 'taggedDamageBonus');
      if (!plainRecord(bonuses)) continue;
      technique.tags.forEach(function (tag) {
        const amount = dataValue(bonuses, tag);
        if (finite(amount) && amount > 0) total += amount;
      });
    }
    return total;
  }

  function inventoryResultValue(result) {
    if (!plainRecord(result) || dataValue(result, 'ok') !== true) {
      return null;
    }
    const value = dataValue(result, 'value');
    const copied = cloneStrict(value, new Set());
    return copied.ok && plainRecord(copied.value)
      ? copied.value
      : null;
  }

  function consumeSupply(parts, itemId) {
    if (typeof inventoryApply !== 'function') return null;
    const requested = cloneStrict(parts.inventory, new Set());
    const expected = cloneStrict(parts.inventory, new Set());
    if (!requested.ok || !expected.ok ||
        !plainRecord(requested.value) || !plainRecord(expected.value)) {
      return null;
    }
    const expectedStacks = dataValue(expected.value, 'stacks');
    const quantity = dataValue(expectedStacks, itemId);
    if (!plainRecord(expectedStacks) || !positiveInteger(quantity)) {
      return null;
    }
    if (quantity === 1) delete expectedStacks[itemId];
    else expectedStacks[itemId] = quantity - 1;
    const delta = {};
    define(delta, itemId, -1);
    let applied;
    try {
      applied = inventoryApply(requested.value, delta);
    } catch (error) {
      return null;
    }
    const result = inventoryResultValue(applied);
    return result && sameData(result, expected.value) ? result : null;
  }

  function consumeItemCost(parts, costs) {
    if (!plainRecord(costs)) return null;
    const itemIds = Object.keys(costs);
    if (!itemIds.length) return parts.inventory;
    if (typeof inventoryApply !== 'function') return null;
    const requested = cloneStrict(parts.inventory, new Set());
    const expected = cloneStrict(parts.inventory, new Set());
    if (!requested.ok || !expected.ok || !plainRecord(requested.value) ||
        !plainRecord(expected.value)) {
      return null;
    }
    const expectedStacks = dataValue(expected.value, 'stacks');
    if (!plainRecord(expectedStacks)) return null;
    const delta = {};
    for (let index = 0; index < itemIds.length; index++) {
      const itemId = itemIds[index];
      const quantity = dataValue(costs, itemId);
      const owned = dataValue(expectedStacks, itemId);
      if (!positiveInteger(quantity) ||
          !safeIntegerAtLeast(owned, quantity)) {
        return null;
      }
      const next = owned - quantity;
      if (next === 0) delete expectedStacks[itemId];
      else expectedStacks[itemId] = next;
      define(delta, itemId, -quantity);
    }
    let applied;
    try {
      applied = inventoryApply(requested.value, delta);
    } catch (error) {
      return null;
    }
    const result = inventoryResultValue(applied);
    return result && sameData(result, expected.value) ? result : null;
  }

  function useSupply(parts, type, config) {
    const itemId = dataValue(config, 'itemId');
    if (itemId === null) return { stop: false, used: false };
    if (typeof itemId !== 'string' || !own(supplies, itemId) ||
        supplies[itemId].type !== type) {
      parts.events.push(warningEvent('invalid_supply', null));
      return { stop: false, used: false };
    }
    const nextInventory = consumeSupply(parts, itemId);
    if (!nextInventory) {
      return {
        stop: dataValue(config, 'stopWhenEmpty') === true,
        used: false
      };
    }
    parts.inventory = nextInventory;
    addCount(parts.counts.costs.items, itemId, 1);
    addCount(parts.counts.metrics.suppliesUsed, itemId, 1);
    const supply = supplies[itemId];
    let amount = 0;
    if (finite(supply.heal) && supply.heal > 0) {
      const before = parts.player.hp;
      const healing = Math.round(
        supply.heal * (1 + passiveHealingBonus(parts.snapshot))
      );
      parts.player.hp = Math.min(parts.player.maxHp, before + healing);
      amount = parts.player.hp - before;
    }
    if (finite(supply.restoreQi) && supply.restoreQi > 0) {
      const before = parts.player.qi;
      parts.player.qi = Math.min(
        parts.player.maxQi,
        before + supply.restoreQi
      );
      amount = parts.player.qi - before;
    }
    if (finite(supply.shieldMaxHpRatio) &&
        supply.shieldMaxHpRatio > 0) {
      const shield = Math.round(
        parts.player.maxHp * supply.shieldMaxHpRatio
      );
      parts.player.shield = Math.max(parts.player.shield, shield);
      amount = shield;
    }
    if (finite(supply.attackIntervalReduction) &&
        positiveInteger(supply.durationTicks)) {
      applyStatus(parts.player, 'haste', supply.durationTicks);
      amount = supply.durationTicks;
    }
    parts.events.push(event(
      'supply',
      itemId,
      'player',
      amount,
      false,
      null
    ));
    return { stop: false, used: true };
  }

  function applyAutomaticSupplies(parts) {
    const supplyState = dataValue(parts.snapshot, 'supplies');
    if (!plainRecord(supplyState)) return { stop: false };
    const talisman = dataValue(supplyState, 'talisman');
    if (parts.enemy && plainRecord(talisman) &&
        dataValue(talisman, 'useAt') === 'enemy_start' &&
        dataValue(parts.enemy.buffs, 'enemyStartHandled') !== true) {
      const result = useSupply(parts, 'talisman', talisman);
      parts.enemy.buffs.enemyStartHandled = true;
      if (result.stop) return { stop: true };
    }
    const food = dataValue(supplyState, 'food');
    if (plainRecord(food) &&
        parts.player.hp / parts.player.maxHp <=
          dataValue(food, 'triggerRatio')) {
      const result = useSupply(parts, 'food', food);
      if (result.stop) return { stop: true };
    }
    const pill = dataValue(supplyState, 'pill');
    if (plainRecord(pill) &&
        parts.player.qi / parts.player.maxQi <=
          dataValue(pill, 'triggerRatio')) {
      const result = useSupply(parts, 'pill', pill);
      if (result.stop) return { stop: true };
    }
    return { stop: false };
  }

  function effectiveInterval(combatant) {
    let value = combatant.attackIntervalTicks;
    const slow = dataValue(combatant.statuses, 'slow');
    if (plainRecord(slow) &&
        positiveInteger(dataValue(slow, 'remainingTicks')) &&
        finite(dataValue(slow, 'attackIntervalAdd'))) {
      value += dataValue(slow, 'attackIntervalAdd');
    }
    const haste = dataValue(combatant.statuses, 'haste');
    if (plainRecord(haste) &&
        positiveInteger(dataValue(haste, 'remainingTicks')) &&
        finite(dataValue(haste, 'attackIntervalReduction'))) {
      value = Math.floor(
        value * (1 - dataValue(haste, 'attackIntervalReduction'))
      );
    }
    return Math.max(2, Math.floor(value));
  }

  function selectAction(parts) {
    const active = strictArrayValues(dataValue(
      parts.snapshot,
      'activeTechniques'
    ));
    if (!active) {
      return { id: 'normalAttack', slotIndex: null, invalidId: null };
    }
    for (let index = 0; index < active.length; index++) {
      const techniqueId = dataValue(active[index], 'techniqueId');
      if (techniqueId !== null &&
          (typeof techniqueId !== 'string' ||
            !own(techniques, techniqueId))) {
        return {
          id: 'normalAttack',
          slotIndex: null,
          invalidId: typeof techniqueId === 'string' ? techniqueId : null
        };
      }
    }
    if (typeof selectCombatAction !== 'function') {
      return { id: 'normalAttack', slotIndex: null, invalidId: null };
    }
    let selected;
    try {
      selected = selectCombatAction(parts.session, parts.snapshot);
    } catch (error) {
      selected = null;
    }
    const selectedId = dataValue(selected, 'id');
    const selectedSlotIndex = dataValue(selected, 'slotIndex');
    if (selectedId === 'normalAttack') {
      return selectedSlotIndex === null
        ? { id: 'normalAttack', slotIndex: null, invalidId: null }
        : {
          id: 'normalAttack',
          slotIndex: null,
          invalidId: selectedId
        };
    }
    return typeof selectedId === 'string' &&
      own(techniques, selectedId) &&
      safeIntegerAtLeast(selectedSlotIndex, 0) &&
      selectedSlotIndex < active.length &&
      dataValue(active[selectedSlotIndex], 'techniqueId') === selectedId
      ? {
        id: selectedId,
        slotIndex: selectedSlotIndex,
        invalidId: null
      }
      : {
        id: 'normalAttack',
        slotIndex: null,
        invalidId: typeof selectedId === 'string' ? selectedId : null
      };
  }

  function recordPlayerAction(parts, id, slotIndex) {
    parts.session.lastPlayerAction = {
      id: id,
      slotIndex: slotIndex,
      tick: parts.session.elapsedTicks
    };
  }

  function executeNormalAttack(parts) {
    const resolved = resolveAttack(
      parts,
      parts.player,
      parts.enemy,
      'player',
      parts.enemy.id,
      null,
      1,
      0,
      1
    );
    if (!resolved.ok) return false;
    parts.player.cooldownTicks = effectiveInterval(parts.player);
    recordPlayerAction(parts, 'normalAttack', null);
    return true;
  }

  function applyTechniqueStatus(parts, effect, techniqueId) {
    const rawStatus = dataValue(effect, 'status');
    if (!plainRecord(rawStatus)) return true;
    let statusId = dataValue(rawStatus, 'id');
    if (statusId === 'binding') statusId = 'slow';
    const durationTicks = dataValue(rawStatus, 'durationTicks');
    const chance = dataValue(rawStatus, 'chance');
    if (finite(chance)) {
      const rolled = draw(parts);
      if (rolled === null) return false;
      if (rolled >= chance) return true;
    }
    if (!positiveInteger(durationTicks) ||
        !applyStatus(parts.enemy, statusId, durationTicks)) {
      return true;
    }
    parts.events.push(event(
      'status',
      'player',
      parts.enemy.id,
      durationTicks,
      false,
      techniqueId
    ));
    return true;
  }

  function techniqueExecution(ok, code) {
    return { ok: ok, code: code || 'ok' };
  }

  function executeTechnique(parts, techniqueId, slotIndex) {
    const technique = techniques[techniqueId];
    const levels = dataValue(parts.snapshot, 'techniqueLevels');
    const level = dataValue(levels, techniqueId);
    const effect = scaledEffectFor(techniqueId, level);
    if (!effect || parts.player.qi < technique.qiCost) {
      return techniqueExecution(false, 'invalid_technique');
    }
    const nextInventory = consumeItemCost(parts, technique.runeCost);
    if (!nextInventory) {
      return techniqueExecution(false, 'missing_rune_charm');
    }
    parts.inventory = nextInventory;
    Object.keys(technique.runeCost).forEach(function (itemId) {
      addCount(
        parts.counts.costs.items,
        itemId,
        dataValue(technique.runeCost, itemId)
      );
    });
    parts.player.qi -= technique.qiCost;
    const type = dataValue(effect, 'type');
    if (type === 'attack') {
      const activeBeastMultiplier = dataValue(
        effect,
        'activeBeastMultiplier'
      );
      let multiplier =
        dataValue(parts.snapshot, 'hasActiveBeast') === true &&
        finite(activeBeastMultiplier)
          ? activeBeastMultiplier
          : dataValue(effect, 'multiplier');
      if (!finite(multiplier) || multiplier <= 0) {
        return techniqueExecution(false, 'invalid_technique');
      }
      multiplier *= 1 + taggedDamageBonus(parts.snapshot, technique);
      const defenseIgnore = finite(dataValue(effect, 'defenseIgnore'))
        ? clamp(dataValue(effect, 'defenseIgnore'), 0, 1)
        : 0;
      const hits = positiveInteger(dataValue(effect, 'hits'))
        ? dataValue(effect, 'hits')
        : 1;
      const resolved = resolveAttack(
        parts,
        parts.player,
        parts.enemy,
        'player',
        parts.enemy.id,
        techniqueId,
        multiplier,
        defenseIgnore,
        hits
      );
      if (!resolved.ok) return techniqueExecution(false, 'invalid_technique');
      if (resolved.landed &&
          !applyTechniqueStatus(parts, effect, techniqueId)) {
        return techniqueExecution(false, 'invalid_technique');
      }
    } else if (type === 'heal') {
      const ratio = dataValue(effect, 'maxHpRatio');
      if (!finite(ratio) || ratio < 0) {
        return techniqueExecution(false, 'invalid_technique');
      }
      const before = parts.player.hp;
      parts.player.hp = Math.min(
        parts.player.maxHp,
        before + parts.player.maxHp * ratio
      );
      parts.events.push(event(
        'heal',
        'player',
        'player',
        parts.player.hp - before,
        false,
        techniqueId
      ));
    } else if (type === 'restoreQi') {
      const amount = dataValue(effect, 'amount');
      if (!finite(amount) || amount < 0) {
        return techniqueExecution(false, 'invalid_technique');
      }
      const before = parts.player.qi;
      parts.player.qi = Math.min(parts.player.maxQi, before + amount);
      parts.events.push(event(
        'restore_qi',
        'player',
        'player',
        parts.player.qi - before,
        false,
        techniqueId
      ));
    } else {
      return techniqueExecution(false, 'invalid_technique');
    }
    parts.player.cooldownTicks = effectiveInterval(parts.player);
    parts.player.techniqueCooldowns[techniqueId] =
      technique.cooldownTicks;
    addCount(
      parts.counts.gains.techniqueXp,
      techniqueId,
      technique.tier
    );
    recordPlayerAction(parts, techniqueId, slotIndex);
    return techniqueExecution(true);
  }

  function playerAction(parts) {
    if (parts.player.cooldownTicks !== 0 || !parts.enemy) return true;
    const selected = selectAction(parts);
    if (selected.invalidId !== null) {
      parts.events.push(warningEvent(
        'invalid_technique',
        selected.invalidId
      ));
      return executeNormalAttack(parts);
    }
    if (selected.id === 'normalAttack') return executeNormalAttack(parts);
    const techniqueResult = executeTechnique(
      parts,
      selected.id,
      selected.slotIndex
    );
    if (techniqueResult.ok) return true;
    parts.events.push(warningEvent(techniqueResult.code, selected.id));
    return executeNormalAttack(parts);
  }

  function enemyAction(parts) {
    if (!parts.enemy || parts.enemy.hp <= 0 ||
        parts.player.hp <= 0 || parts.enemy.cooldownTicks !== 0) {
      return true;
    }
    const shock = dataValue(parts.enemy.statuses, 'shock');
    if (plainRecord(shock) &&
        positiveInteger(dataValue(shock, 'remainingTicks')) &&
        dataValue(shock, 'skipNextAction') === true) {
      shock.skipNextAction = false;
      parts.enemy.cooldownTicks = effectiveInterval(parts.enemy);
      parts.events.push(event(
        'status_skip',
        'shock',
        parts.enemy.id,
        0,
        false,
        null
      ));
      return true;
    }
    const resolved = resolveAttack(
      parts,
      parts.enemy,
      parts.player,
      parts.enemy.id,
      'player',
      null,
      1,
      0,
      1
    );
    if (!resolved.ok) return false;
    parts.enemy.cooldownTicks = effectiveInterval(parts.enemy);
    return true;
  }

  function decrementStatuses(combatant) {
    const statuses = combatant.statuses;
    Object.keys(statuses).forEach(function (statusId) {
      const remaining = statuses[statusId].remainingTicks - 1;
      if (remaining <= 0) delete statuses[statusId];
      else statuses[statusId].remainingTicks = remaining;
    });
  }

  function finishTick(parts, forcedOutcome) {
    if (parts.player.cooldownTicks > 0) {
      parts.player.cooldownTicks--;
    }
    Object.keys(parts.player.techniqueCooldowns).forEach(function (id) {
      const value = parts.player.techniqueCooldowns[id];
      if (value > 0) {
        parts.player.techniqueCooldowns[id] = value - 1;
      }
    });
    decrementStatuses(parts.player);
    if (parts.enemy) {
      if (parts.enemy.cooldownTicks > 0) parts.enemy.cooldownTicks--;
      decrementStatuses(parts.enemy);
    }
    parts.session.elapsedTicks++;
    let outcome = forcedOutcome || 'continue';
    if (!forcedOutcome) {
      if (parts.enemy && parts.enemy.hp <= 0) {
        outcome = 'enemy_defeated';
      } else if (parts.player.hp <= 0) {
        outcome = 'player_defeated';
      }
    }
    return resultDto(
      true,
      parts.session,
      parts.inventory,
      parts.rngState,
      outcome,
      parts.events,
      parts.counts
    );
  }

  function advanceTick(session, context) {
    const inspected = inspectTick(session, context);
    if (!inspected) return invalidResult();
    const parts = {
      session: inspected.session,
      player: inspected.player,
      enemy: inspected.enemy,
      snapshot: inspected.snapshot,
      inventory: inspected.inventory,
      rngState: inspected.rngState,
      events: [],
      counts: emptyCounts()
    };
    if ((parts.enemy && parts.enemy.hp <= 0) ||
        parts.player.hp <= 0) {
      return finishTick(parts, null);
    }
    const supplied = applyAutomaticSupplies(parts);
    if (supplied.stop) {
      return finishTick(parts, 'supply_exhausted');
    }
    if (!playerAction(parts)) return invalidResult();
    if (!enemyAction(parts)) return invalidResult();
    return finishTick(parts, null);
  }

  function advanceTicks(session, context, tickCount) {
    if (!nonNegativeInteger(tickCount)) return invalidResult();
    let currentSession = session;
    let currentContext = context;
    let result = null;
    if (tickCount === 0) {
      const inspected = inspectTick(currentSession, currentContext);
      return inspected
        ? resultDto(
          true,
          inspected.session,
          inspected.inventory,
          inspected.rngState,
          'continue',
          [],
          emptyCounts()
        )
        : invalidResult();
    }
    for (let index = 0; index < tickCount; index++) {
      result = advanceTick(currentSession, currentContext);
      if (!result.ok) return result;
      currentSession = result.session;
      currentContext = {
        playerInventory: result.playerInventory,
        rngState: result.rngState
      };
    }
    return result;
  }

  return Object.freeze({
    createSession: createSession,
    createEnemy: createEnemy,
    advanceTick: advanceTick,
    advanceTicks: advanceTicks
  });
});
