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
      require('../content/realms.js'),
      require('./formations.js'),
      require('./spirit-beasts.js'),
      require('./equipment.js'),
      proxyDetector
    );
  } else if (root) {
    root.CombatStats = factory(
      root.CombatContent,
      root.TechniqueContent,
      root.RealmContent,
      root.Formations,
      root.SpiritBeasts,
      root.Equipment,
      null
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  CombatContent,
  TechniqueContent,
  RealmContent,
  Formations,
  SpiritBeasts,
  Equipment,
  proxyDetector
) {
  'use strict';

  const EQUIPMENT_SLOTS = Object.freeze([
    'weapon',
    'head',
    'robe',
    'bracer',
    'belt',
    'boots',
    'accessory',
    'artifact'
  ]);
  const ACTIVE_SLOT_COUNT = 3;
  const PASSIVE_SLOT_COUNT = 5;
  const MAX_TECHNIQUE_LEVEL = 200;
  const STAT_KEYS = Object.freeze([
    'maxHp',
    'maxQi',
    'attack',
    'defense',
    'accuracy',
    'evasion',
    'critChance',
    'attackIntervalTicks'
  ]);
  const FLAT_EFFECT_KEYS = Object.freeze([
    'maxHp', 'maxQi', 'attack', 'defense', 'accuracy', 'evasion',
    'critChance'
  ]);
  const PERCENT_EFFECTS = Object.freeze({
    maxHpPercent: 'maxHp',
    maxQiPercent: 'maxQi',
    attackPercent: 'attack',
    defensePercent: 'defense',
    accuracyPercent: 'accuracy',
    evasionPercent: 'evasion',
    critChancePercent: 'critChance'
  });
  const CONDITION_KEYS = Object.freeze({
    always: Object.freeze(['type']),
    selfHpBelow: Object.freeze(['type', 'threshold']),
    selfQiBelow: Object.freeze(['type', 'threshold']),
    selfQiAbove: Object.freeze(['type', 'threshold']),
    enemyHpBelow: Object.freeze(['type', 'threshold']),
    enemyHasStatus: Object.freeze(['type', 'statusId']),
    enemyMissingStatus: Object.freeze(['type', 'statusId']),
    selfMissingBuff: Object.freeze(['type', 'buffId']),
    selfMissingShield: Object.freeze(['type'])
  });

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
    return expected.every(function (key) { return own(record, key); });
  }

  function cloneStrict(value, ancestors) {
    if (value === null || typeof value === 'string' ||
        typeof value === 'boolean' || typeof value === 'undefined') {
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

  function snapshotRegistry(content, registryKey, parser) {
    const source = dependencyValue(content, registryKey);
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
      const key = keys[index];
      if (typeof key !== 'string') continue;
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(source, key);
      } catch (error) {
        continue;
      }
      if (!descriptor || !own(descriptor, 'value')) continue;
      const parsed = parser(key, descriptor.value);
      if (parsed) define(result, key, parsed);
    }
    return deepFreeze(result);
  }

  function finite(value) {
    return typeof value === 'number' && Number.isFinite(value);
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

  const equipment = snapshotRegistry(
    CombatContent,
    'EQUIPMENT',
    function (id, value) {
      if (!plainRecord(value) || dataValue(value, 'id') !== id) return null;
      const slot = dataValue(value, 'slot');
      const stats = copyNumericRecord(dataValue(value, 'stats'));
      if (EQUIPMENT_SLOTS.indexOf(slot) < 0 &&
          slot !== 'armor' || !stats) {
        return null;
      }
      return { id: id, slot: slot, stats: stats };
    }
  );

  const techniques = snapshotRegistry(
    TechniqueContent,
    'TECHNIQUES',
    function (id, value) {
      if (!plainRecord(value) || dataValue(value, 'id') !== id) return null;
      const kind = dataValue(value, 'kind');
      const qiCost = dataValue(value, 'qiCost');
      const effect = cloneStrict(dataValue(value, 'effect'), new Set());
      if ((kind !== 'active' && kind !== 'passive') ||
          !Number.isSafeInteger(qiCost) || qiCost < 0 ||
          !effect.ok || !plainRecord(effect.value)) {
        return null;
      }
      return {
        id: id,
        kind: kind,
        qiCost: qiCost,
        effect: effect.value
      };
    }
  );

  const realms = snapshotRegistry(
    RealmContent,
    'REALMS',
    function (id, value) {
      const index = dataValue(value, 'index');
      if (!plainRecord(value) || dataValue(value, 'id') !== id ||
          !Number.isSafeInteger(index) || index < 0) {
        return null;
      }
      return { id: id, index: index };
    }
  );

  const formationEffects = dependencyValue(Formations, 'effects');
  const beastEffects = dependencyValue(SpiritBeasts, 'effects');

  function safeMinimum() {
    return deepFreeze({
      maxHp: 1,
      maxQi: 1,
      attack: 1,
      defense: 1,
      accuracy: 0,
      evasion: 0,
      critChance: 0,
      attackIntervalTicks: 2
    });
  }

  function findLoadout(loadouts, loadoutId) {
    for (let index = 0; index < loadouts.length; index++) {
      const loadout = loadouts[index];
      if (plainRecord(loadout) && dataValue(loadout, 'id') === loadoutId) {
        return loadout;
      }
    }
    return null;
  }

  function inspectDerive(model, loadoutId) {
    if (typeof loadoutId !== 'string') return null;
    const copied = cloneStrict(model, new Set());
    if (!copied.ok || !plainRecord(copied.value)) return null;
    const state = copied.value;
    const player = dataValue(state, 'player');
    const breakthrough = dataValue(player, 'breakthrough');
    const combat = dataValue(player, 'combat');
    const techniqueState = dataValue(player, 'techniques');
    const known = dataValue(techniqueState, 'known');
    const inventory = dataValue(player, 'inventory');
    const loadouts = strictArrayValues(dataValue(combat, 'loadouts'));
    const realmId = dataValue(breakthrough, 'realmId');
    if (!plainRecord(player) || !plainRecord(breakthrough) ||
        !plainRecord(combat) || !plainRecord(techniqueState) ||
        !plainRecord(known) || !loadouts ||
        typeof realmId !== 'string' || !own(realms, realmId)) {
      return null;
    }
    const loadout = findLoadout(loadouts, loadoutId);
    if (!loadout) return null;
    const slots = dataValue(loadout, 'equipment');
    const passives = strictArrayValues(
      dataValue(loadout, 'passiveTechniques')
    );
    if (!plainRecord(slots) || !passives ||
        passives.length !== PASSIVE_SLOT_COUNT) {
      return null;
    }
    return {
      state: state,
      realmIndex: realms[realmId].index,
      equipment: slots,
      inventory: inventory,
      passives: passives,
      known: known
    };
  }

  function realmBase(realmIndex) {
    return {
      maxHp: 100 + realmIndex * 40,
      maxQi: 100 + realmIndex * 10,
      attack: 12 + realmIndex * 5,
      defense: 5 + realmIndex * 3,
      accuracy: 75 + realmIndex * 2,
      evasion: 5 + realmIndex,
      critChance: Math.min(
        0.25,
        0.05 + realmIndex * 0.005
      ),
      attackIntervalTicks: Math.max(
        4,
        8 - Math.floor(realmIndex / 4)
      )
    };
  }

  function applyEquipment(stats, slots, inventory) {
    const equipmentState = dataValue(inventory, 'equipment');
    const instances = equipmentState
      ? strictArrayValues(dataValue(equipmentState, 'instances'))
      : null;
    if (!Equipment || typeof Equipment.normalizeInstance !== 'function' ||
        typeof Equipment.resolve !== 'function' ||
        typeof Equipment.aggregate !== 'function' ||
        !plainRecord(equipmentState) || !instances) {
      const legacySlots = ['weapon', 'armor', 'accessory'];
      for (let index = 0; index < legacySlots.length; index++) {
        const slot = legacySlots[index];
        const itemId = dataValue(slots, slot);
        if (itemId == null) continue;
        if (typeof itemId !== 'string' || !own(equipment, itemId) ||
            equipment[itemId].slot !== slot) {
          return null;
        }
        const additions = equipment[itemId].stats;
        Object.keys(additions).forEach(function (key) {
          if (STAT_KEYS.indexOf(key) >= 0) stats[key] += additions[key];
        });
      }
      return {
        aggregate: {
          flat: {},
          percent: {},
          rules: [],
          resonance: { counts: {}, active: {} }
        },
        intervalReduction: 0,
        cooldownReduction: 0
      };
    }
    const byId = {};
    for (let index = 0; index < instances.length; index++) {
      const instance = Equipment.normalizeInstance(instances[index]);
      if (instance) define(byId, instance.instanceId, instance);
    }
    const equipped = [];
    for (let index = 0; index < EQUIPMENT_SLOTS.length; index++) {
      const slot = EQUIPMENT_SLOTS[index];
      const instanceId = dataValue(slots, slot);
      if (instanceId === null) continue;
      const instance = typeof instanceId === 'string' && own(byId, instanceId)
        ? byId[instanceId]
        : null;
      const resolved = instance ? Equipment.resolve(instance) : null;
      if (!resolved || resolved.slot !== slot) {
        return null;
      }
      equipped.push(instance);
    }
    const aggregate = Equipment.aggregate(equipped);
    Object.keys(aggregate.flat).forEach(function (key) {
      if (key === 'actionIntervalTicks' || key === 'cooldownReduction') return;
      if (!finite(stats[key])) stats[key] = 0;
      stats[key] += aggregate.flat[key];
    });
    Object.keys(aggregate.percent).forEach(function (key) {
      if (key === 'actionIntervalTicks' || key === 'cooldownReduction') return;
      if (!finite(stats[key])) stats[key] = 0;
      stats[key] *= 1 + aggregate.percent[key];
    });
    return {
      aggregate: aggregate,
      intervalReduction: finite(aggregate.percent.actionIntervalTicks)
        ? aggregate.percent.actionIntervalTicks
        : 0,
      cooldownReduction: (
        (finite(aggregate.flat.cooldownReduction)
          ? aggregate.flat.cooldownReduction
          : 0) +
        (finite(aggregate.percent.cooldownReduction)
          ? aggregate.percent.cooldownReduction
          : 0)
      )
    };
  }

  function appendEquipmentFields(result, stats, equipmentResult) {
    const aggregate = equipmentResult.aggregate;
    const legacyKeys = {
      maxHp: true,
      maxQi: true,
      attack: true,
      defense: true,
      accuracy: true,
      evasion: true,
      critChance: true
    };
    Object.keys(aggregate.flat).concat(
      Object.keys(aggregate.percent)
    ).forEach(function (key) {
      if (key === 'actionIntervalTicks' ||
          key === 'cooldownReduction' ||
          own(legacyKeys, key)) return;
      if (finite(stats[key])) {
        result[key] = roundTwelve(stats[key]);
      }
    });
    if (aggregate.rules.length) {
      result.equipmentRules = cloneStrict(
        aggregate.rules,
        new Set()
      ).value;
    }
    if (Object.keys(aggregate.resonance.counts).length) {
      result.equipmentResonance = cloneStrict(
        aggregate.resonance,
        new Set()
      ).value;
    }
  }

  function validKnownLevel(value) {
    return plainRecord(value) &&
      Number.isSafeInteger(dataValue(value, 'level')) &&
      dataValue(value, 'level') >= 1 &&
      dataValue(value, 'level') <= MAX_TECHNIQUE_LEVEL;
  }

  function roundFour(value) {
    return Math.round(value * 1e4) / 1e4;
  }

  function scaledPassiveValue(base, level) {
    return roundFour(base * (1 + 0.015 * (level - 1)));
  }

  function unlockedPassiveCount(realmIndex) {
    if (RealmContent &&
        typeof RealmContent.unlockedPassiveTechniqueSlots === 'function') {
      try {
        const count = RealmContent.unlockedPassiveTechniqueSlots(realmIndex);
        if (Number.isSafeInteger(count) && count >= 1 &&
            count <= PASSIVE_SLOT_COUNT) {
          return count;
        }
      } catch (error) {
        /* fall through */
      }
    }
    return PASSIVE_SLOT_COUNT;
  }

  function unlockedActiveCount(realmIndex) {
    if (RealmContent &&
        typeof RealmContent.unlockedActiveTechniqueSlots === 'function') {
      try {
        const count = RealmContent.unlockedActiveTechniqueSlots(realmIndex);
        if (Number.isSafeInteger(count) && count >= 1 &&
            count <= ACTIVE_SLOT_COUNT) {
          return count;
        }
      } catch (error) {
        /* fall through */
      }
    }
    return ACTIVE_SLOT_COUNT;
  }

  function applyPassives(stats, parts) {
    const totals = {
      maxHpPercent: 0,
      maxQiPercent: 0,
      attackPercent: 0,
      defensePercent: 0,
      accuracyPercent: 0,
      evasionPercent: 0,
      critChancePercent: 0,
      attackIntervalReduction: 0,
      activeBeastEffectBonus: 0,
      incomingHealBonus: 0,
      healPowerBonus: 0,
      shieldPowerBonus: 0,
      controlResistBonus: 0,
      affinityTeamBonus: 0,
      accuracyFlat: 0,
      critChanceFlat: 0
    };
    const unlocked = unlockedPassiveCount(parts.realmIndex);
    for (let index = 0; index < parts.passives.length; index++) {
      if (index >= unlocked) break;
      const techniqueId = parts.passives[index];
      if (techniqueId === null) continue;
      if (typeof techniqueId !== 'string' ||
          !own(techniques, techniqueId) ||
          techniques[techniqueId].kind !== 'passive' ||
          !own(parts.known, techniqueId)) {
        return null;
      }
      const known = dataValue(parts.known, techniqueId);
      if (!validKnownLevel(known)) return null;
      const level = dataValue(known, 'level');
      const effect = techniques[techniqueId].effect;
      const keys = Object.keys(totals);
      for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
        const key = keys[keyIndex];
        const base = dataValue(effect, key);
        if (finite(base)) {
          totals[key] += scaledPassiveValue(base, level);
        }
      }
      const critBonus = dataValue(effect, 'critChanceBonus');
      if (finite(critBonus)) {
        totals.critChanceFlat += scaledPassiveValue(critBonus, level);
      }
      const sharedHp = dataValue(effect, 'selfAndBeastMaxHpPercent');
      if (finite(sharedHp)) {
        totals.maxHpPercent += scaledPassiveValue(sharedHp, level);
      }
    }
    Object.keys(PERCENT_EFFECTS).forEach(function (key) {
      const statKey = PERCENT_EFFECTS[key];
      stats[statKey] *= 1 + totals[key];
    });
    if (totals.accuracyFlat) stats.accuracy += totals.accuracyFlat;
    if (totals.critChanceFlat) {
      stats.critChance = Math.min(0.75, stats.critChance + totals.critChanceFlat);
    }
    return {
      intervalReduction: totals.attackIntervalReduction,
      beastEffectMultiplier: 1 + totals.activeBeastEffectBonus,
      incomingHealBonus: totals.incomingHealBonus,
      healPowerBonus: totals.healPowerBonus,
      shieldPowerBonus: totals.shieldPowerBonus,
      controlResistBonus: totals.controlResistBonus,
      affinityTeamBonus: totals.affinityTeamBonus
    };
  }

  function optionalCombatEffect(operation, state, nestedGlobal) {
    if (typeof operation !== 'function') return null;
    const copied = cloneStrict(state, new Set());
    if (!copied.ok) return null;
    let result;
    try {
      result = operation(copied.value);
    } catch (error) {
      return null;
    }
    const combat = dataValue(result, 'combat');
    if (!plainRecord(combat)) return null;
    if (!nestedGlobal) return combat;
    const global = dataValue(combat, 'global');
    return plainRecord(global) ? global : combat;
  }

  function applyCombatEffect(stats, effect, multiplier) {
    let intervalReduction = 0;
    if (!plainRecord(effect) || !finite(multiplier)) {
      return intervalReduction;
    }
    for (let index = 0; index < FLAT_EFFECT_KEYS.length; index++) {
      const key = FLAT_EFFECT_KEYS[index];
      const amount = dataValue(effect, key);
      if (finite(amount)) stats[key] += amount * multiplier;
    }
    Object.keys(PERCENT_EFFECTS).forEach(function (key) {
      const amount = dataValue(effect, key);
      if (finite(amount)) {
        stats[PERCENT_EFFECTS[key]] *= 1 + amount * multiplier;
      }
    });
    const reduction = dataValue(effect, 'attackIntervalReduction');
    if (finite(reduction)) intervalReduction = reduction * multiplier;
    const cdr = dataValue(effect, 'cooldownReduction');
    if (finite(cdr)) {
      if (!finite(stats.cooldownReduction)) stats.cooldownReduction = 0;
      stats.cooldownReduction += cdr * multiplier;
    }
    return intervalReduction;
  }

  function roundTwelve(value) {
    if (!finite(value)) return 0;
    return Math.round(value * 1e12) / 1e12;
  }

  function clamp(value, minimum, maximum) {
    if (!finite(value)) return minimum;
    return Math.max(minimum, Math.min(maximum, value));
  }

  function finishStats(stats, intervalReduction, equipmentResult) {
    const interval = finite(stats.attackIntervalTicks) &&
      finite(intervalReduction)
      ? Math.floor(stats.attackIntervalTicks * (1 - intervalReduction))
      : 2;
    const result = {
      maxHp: roundTwelve(Math.max(1, finite(stats.maxHp) ? stats.maxHp : 1)),
      maxQi: roundTwelve(Math.max(1, finite(stats.maxQi) ? stats.maxQi : 1)),
      attack: roundTwelve(Math.max(1, finite(stats.attack) ? stats.attack : 1)),
      defense: roundTwelve(Math.max(
        1,
        finite(stats.defense) ? stats.defense : 1
      )),
      accuracy: roundTwelve(Math.max(
        0,
        finite(stats.accuracy) ? stats.accuracy : 0
      )),
      evasion: roundTwelve(Math.max(
        0,
        finite(stats.evasion) ? stats.evasion : 0
      )),
      critChance: roundTwelve(clamp(stats.critChance, 0, 0.95)),
      attackIntervalTicks: Math.max(2, interval)
    };
    if (equipmentResult) {
      const cdr = finite(equipmentResult.cooldownReduction)
        ? equipmentResult.cooldownReduction
        : 0;
      const fromStats = finite(stats.cooldownReduction)
        ? stats.cooldownReduction
        : 0;
      const totalCdr = clamp(cdr + fromStats, 0, 0.5);
      if (totalCdr > 0) {
        result.cooldownReduction = roundTwelve(totalCdr);
      }
      appendEquipmentFields(result, stats, equipmentResult);
    }
    return deepFreeze(result);
  }

  function derive(model, loadoutId) {
    const parts = inspectDerive(model, loadoutId);
    if (!parts) return safeMinimum();
    const stats = realmBase(parts.realmIndex);
    const equipmentResult = applyEquipment(
      stats,
      parts.equipment,
      parts.inventory
    );
    if (!equipmentResult) return safeMinimum();
    const passive = applyPassives(stats, parts);
    if (!passive) return safeMinimum();
    let intervalReduction = passive.intervalReduction +
      equipmentResult.intervalReduction;
    intervalReduction += applyCombatEffect(
      stats,
      optionalCombatEffect(formationEffects, parts.state, false),
      1
    );
    intervalReduction += applyCombatEffect(
      stats,
      optionalCombatEffect(beastEffects, parts.state, true),
      passive.beastEffectMultiplier
    );
    return finishStats(stats, intervalReduction, equipmentResult);
  }

  function validRatio(value, maximum) {
    return finite(value) && value >= 0 && value <= maximum;
  }

  function conditionShape(condition) {
    if (!plainRecord(condition)) return null;
    const type = dataValue(condition, 'type');
    const keys = typeof type === 'string' && own(CONDITION_KEYS, type)
      ? CONDITION_KEYS[type]
      : null;
    return keys && exactDataKeys(condition, keys) ? type : null;
  }

  function activeEntry(record, key) {
    if (!plainRecord(record) || typeof key !== 'string' || !key.length) {
      return null;
    }
    if (!own(record, key)) return false;
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(record, key);
    } catch (error) {
      return null;
    }
    if (!descriptor || !own(descriptor, 'value')) return null;
    const value = descriptor.value;
    if (typeof value === 'number') return finite(value) && value > 0;
    if (typeof value === 'boolean') return value;
    return plainRecord(value);
  }

  function conditionMetSafe(condition, battle) {
    const type = conditionShape(condition);
    if (!type || !plainRecord(battle)) return false;
    const player = dataValue(battle, 'player');
    if (!plainRecord(player)) return false;
    if (type === 'always') return true;
    if (type === 'selfMissingShield') {
      const shield = dataValue(player, 'shield');
      return !finite(shield) || shield <= 0;
    }
    if (type === 'selfHpBelow' || type === 'selfQiAbove' ||
        type === 'selfQiBelow') {
      const threshold = dataValue(condition, 'threshold');
      const currentKey = type === 'selfHpBelow' ? 'hp' : 'qi';
      const maximumKey = type === 'selfHpBelow' ? 'maxHp' : 'maxQi';
      const current = dataValue(player, currentKey);
      const maximum = dataValue(player, maximumKey);
      if (!validRatio(threshold, 1) || !finite(current) ||
          ((type === 'selfHpBelow' || type === 'selfQiBelow') &&
            threshold < 0.01) ||
          !finite(maximum) || maximum <= 0) {
        return false;
      }
      const ratio = current / maximum;
      if (type === 'selfHpBelow' || type === 'selfQiBelow') {
        return ratio < threshold;
      }
      return ratio > threshold;
    }
    if (type === 'enemyHpBelow') {
      const threshold = dataValue(condition, 'threshold');
      const enemy = dataValue(battle, 'enemy');
      const hp = dataValue(enemy, 'hp');
      const maxHp = dataValue(enemy, 'maxHp');
      return plainRecord(enemy) &&
        validRatio(threshold, 1) &&
        threshold >= 0.01 &&
        finite(hp) && finite(maxHp) && maxHp > 0 &&
        hp / maxHp < threshold;
    }
    if (type === 'enemyHasStatus' || type === 'enemyMissingStatus') {
      const enemy = dataValue(battle, 'enemy');
      if (!plainRecord(enemy)) return false;
      const hasStatus = activeEntry(
        dataValue(enemy, 'statuses'),
        dataValue(condition, 'statusId')
      );
      if (hasStatus === null) return false;
      return type === 'enemyHasStatus' ? hasStatus === true : hasStatus === false;
    }
    if (type === 'selfMissingBuff') {
      const buffId = dataValue(condition, 'buffId');
      if (buffId === 'shield') {
        const shield = dataValue(player, 'shield');
        return !finite(shield) || shield <= 0;
      }
      const buffEntry = activeEntry(dataValue(player, 'buffs'), buffId);
      if (buffEntry === true) return false;
      if (buffEntry === null) return false;
      const statusEntry = activeEntry(dataValue(player, 'statuses'), buffId);
      return statusEntry === false;
    }
    return false;
  }

  function conditionMet(condition, battle) {
    const conditionCopy = cloneStrict(condition, new Set());
    const battleCopy = cloneStrict(battle, new Set());
    return conditionCopy.ok && battleCopy.ok
      ? conditionMetSafe(conditionCopy.value, battleCopy.value)
      : false;
  }

  const NORMAL_ATTACK = deepFreeze({
    id: 'normalAttack',
    slotIndex: null
  });

  function action(techniqueId, slotIndex) {
    return deepFreeze({ id: techniqueId, slotIndex: slotIndex });
  }

  function learnedInSnapshot(snapshot, techniqueId) {
    const levels = dataValue(snapshot, 'techniqueLevels');
    if (!plainRecord(levels) || !own(levels, techniqueId)) return false;
    const level = dataValue(levels, techniqueId);
    return Number.isSafeInteger(level) &&
      level >= 1 && level <= MAX_TECHNIQUE_LEVEL;
  }

  function selectAction(battle, loadoutSnapshot) {
    const battleCopy = cloneStrict(battle, new Set());
    const snapshotCopy = cloneStrict(loadoutSnapshot, new Set());
    if (!battleCopy.ok || !snapshotCopy.ok ||
        !plainRecord(battleCopy.value) ||
        !plainRecord(snapshotCopy.value)) {
      return NORMAL_ATTACK;
    }
    const safeBattle = battleCopy.value;
    const snapshot = snapshotCopy.value;
    const player = dataValue(safeBattle, 'player');
    const slots = strictArrayValues(dataValue(snapshot, 'activeTechniques'));
    const qi = dataValue(player, 'qi');
    const cooldowns = dataValue(player, 'techniqueCooldowns');
    if (!plainRecord(player) || !slots || !finite(qi) ||
        !plainRecord(cooldowns)) {
      return NORMAL_ATTACK;
    }
    for (let index = 0; index < ACTIVE_SLOT_COUNT; index++) {
      if (index >= slots.length) continue;
      const unlockedSlots = Number.isSafeInteger(
        dataValue(snapshot, 'unlockedActiveSlots')
      )
        ? dataValue(snapshot, 'unlockedActiveSlots')
        : unlockedActiveCount(
          Number.isSafeInteger(dataValue(snapshot, 'realmIndex'))
            ? dataValue(snapshot, 'realmIndex')
            : 0
        );
      if (index >= unlockedSlots) continue;
      const slot = slots[index];
      const techniqueId = dataValue(slot, 'techniqueId');
      if (techniqueId === null) continue;
      if (!plainRecord(slot) || typeof techniqueId !== 'string' ||
          !own(techniques, techniqueId) ||
          techniques[techniqueId].kind !== 'active' ||
          !learnedInSnapshot(snapshot, techniqueId)) {
        continue;
      }
      const cooldown = own(cooldowns, techniqueId)
        ? dataValue(cooldowns, techniqueId)
        : 0;
      if (!Number.isSafeInteger(cooldown) || cooldown < 0 ||
          cooldown > 0 || qi < techniques[techniqueId].qiCost) {
        continue;
      }
      return action(techniqueId, index);
    }
    return NORMAL_ATTACK;
  }

  return Object.freeze({
    derive: derive,
    conditionMet: conditionMet,
    selectAction: selectAction
  });
});
