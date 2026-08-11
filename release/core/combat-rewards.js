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
      require('./inventory.js'),
      require('./random.js'),
      require('./equipment.js'),
      proxyDetector,
      null
    );
  } else if (root) {
    root.CombatRewards = factory(
      root.CombatContent,
      root.Inventory,
      root.GameRandom,
      root.Equipment,
      null,
      root.structuredClone
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  CombatContent,
  Inventory,
  GameRandom,
  Equipment,
  proxyDetector,
  stateCloneProbe
) {
  'use strict';

  const UINT32_MAX = 0xFFFFFFFF;

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
    if (typeof proxyDetector === 'function') {
      return !isDetectedProxy(value);
    }
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
        ? { ok: true, value: Object.is(value, -0) ? 0 : value }
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

  function safeClone(value) {
    const copied = cloneStrict(value, new Set());
    if (!copied.ok || !probeCloneCapability(value)) {
      return { ok: false, value: null };
    }
    return copied;
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
    if (typeof left !== typeof right || left === null || right === null) {
      return false;
    }
    if (typeof left !== 'object') return Object.is(left, right);
    if (Array.isArray(left) || Array.isArray(right)) {
      const leftValues = strictArrayValues(left);
      const rightValues = strictArrayValues(right);
      if (!leftValues || !rightValues ||
          leftValues.length !== rightValues.length) {
        return false;
      }
      for (let index = 0; index < leftValues.length; index++) {
        if (!sameData(leftValues[index], rightValues[index])) return false;
      }
      return true;
    }
    if (!plainRecord(left) || !plainRecord(right)) return false;
    let leftKeys;
    let rightKeys;
    try {
      leftKeys = Reflect.ownKeys(left);
      rightKeys = Reflect.ownKeys(right);
    } catch (error) {
      return false;
    }
    if (leftKeys.length !== rightKeys.length) return false;
    for (let index = 0; index < leftKeys.length; index++) {
      const key = leftKeys[index];
      if (typeof key !== 'string' || rightKeys.indexOf(key) < 0 ||
          !sameData(dataValue(left, key), dataValue(right, key))) {
        return false;
      }
    }
    return true;
  }

  function validRngState(value) {
    return Number.isSafeInteger(value) && value >= 0 &&
      value <= UINT32_MAX;
  }

  function validPositiveQuantity(value) {
    return Number.isSafeInteger(value) && value > 0;
  }

  function validCurrency(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function finiteTimestamp(value) {
    return typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0;
  }

  function registryEntries(content, key) {
    const source = dependencyValue(content, key);
    if (!source || typeof source !== 'object' ||
        Array.isArray(source) || isDetectedProxy(source)) {
      return [];
    }
    let keys;
    try {
      keys = Reflect.ownKeys(source);
    } catch (error) {
      return [];
    }
    const result = [];
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
      result.push({ id: id, value: descriptor.value });
    }
    return result;
  }

  function readItemIds(value) {
    const values = strictArrayValues(value);
    if (!values || values.length === 0 ||
        !values.every(function (itemId) {
          return typeof itemId === 'string' && itemId.length > 0;
        })) {
      return null;
    }
    return values.slice();
  }

  function readLootEntry(value) {
    if (!plainRecord(value)) return null;
    const itemId = dataValue(value, 'itemId');
    const itemIds = dataValue(value, 'itemIds');
    const hasItemId = typeof itemId === 'string' && itemId.length > 0;
    const copiedPool = itemIds === undefined ? null : readItemIds(itemIds);
    if (hasItemId === !!copiedPool) return null;
    const minimum = dataValue(value, 'min');
    const maximum = dataValue(value, 'max');
    const chance = dataValue(value, 'chance');
    if (!validPositiveQuantity(minimum) ||
        !validPositiveQuantity(maximum) ||
        minimum > maximum ||
        (chance !== null &&
          (typeof chance !== 'number' ||
            !Number.isFinite(chance) ||
            chance < 0 ||
            chance > 1))) {
      return null;
    }
    return {
      itemId: hasItemId ? itemId : null,
      itemIds: copiedPool,
      min: minimum,
      max: maximum,
      chance: chance
    };
  }

  function snapshotLootTables() {
    const result = {};
    const entries = registryEntries(CombatContent, 'LOOT_TABLES');
    for (let index = 0; index < entries.length; index++) {
      const rows = strictArrayValues(entries[index].value);
      if (!rows) continue;
      const copied = [];
      let valid = true;
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = readLootEntry(rows[rowIndex]);
        if (!row) {
          valid = false;
          break;
        }
        copied.push(row);
      }
      if (valid) define(result, entries[index].id, copied);
    }
    return deepFreeze(result);
  }

  const lootTables = snapshotLootTables();

  function snapshotEnemies() {
    const result = {};
    const entries = registryEntries(CombatContent, 'ENEMIES');
    for (let index = 0; index < entries.length; index++) {
      const value = entries[index].value;
      const lootTableId = dataValue(value, 'lootTableId');
      if (!plainRecord(value) ||
          dataValue(value, 'id') !== entries[index].id ||
          typeof lootTableId !== 'string' ||
          !own(lootTables, lootTableId)) {
        continue;
      }
      define(result, entries[index].id, {
        id: entries[index].id,
        lootTableId: lootTableId
      });
    }
    return deepFreeze(result);
  }

  function copyContentItems(value) {
    if (!plainRecord(value)) return null;
    let keys;
    try {
      keys = Reflect.ownKeys(value);
    } catch (error) {
      return null;
    }
    const result = {};
    for (let index = 0; index < keys.length; index++) {
      const itemId = keys[index];
      if (typeof itemId !== 'string' || itemId.length === 0) return null;
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(value, itemId);
      } catch (error) {
        return null;
      }
      if (!descriptor || descriptor.enumerable !== true ||
          !own(descriptor, 'value') ||
          !validPositiveQuantity(descriptor.value)) {
        return null;
      }
      define(result, itemId, descriptor.value);
    }
    return result;
  }

  function snapshotDungeons() {
    const result = {};
    const entries = registryEntries(CombatContent, 'DUNGEONS');
    for (let index = 0; index < entries.length; index++) {
      const value = entries[index].value;
      const rewards = dataValue(value, 'firstClearRewards');
      const items = dataValue(rewards, 'items');
      const copiedItems = copyContentItems(items);
      if (!plainRecord(value) ||
          dataValue(value, 'id') !== entries[index].id ||
          !plainRecord(rewards) ||
          !copiedItems) {
        continue;
      }
      define(result, entries[index].id, {
        id: entries[index].id,
        items: copiedItems
      });
    }
    return deepFreeze(result);
  }

  const enemies = snapshotEnemies();
  const dungeons = snapshotDungeons();
  const inventoryApply = dependencyValue(Inventory, 'apply');
  const randomNext = dependencyValue(GameRandom, 'next');
  const rewardPayloadValidator = dependencyValue(
    CombatContent,
    'validateRewardPayload'
  );

  function rollFailure(code, rngState) {
    return deepFreeze({
      ok: false,
      code: code,
      source: null,
      items: {},
      currency: 0,
      rngState: validRngState(rngState) ? rngState : null
    });
  }

  function rollSuccess(source, items, currency, rngState) {
    return deepFreeze({
      ok: true,
      code: 'ok',
      source: source,
      items: items,
      currency: currency,
      rngState: rngState
    });
  }

  function draw(parts) {
    if (typeof randomNext !== 'function') return null;
    let result;
    try {
      result = randomNext(parts.rngState);
    } catch (error) {
      return null;
    }
    const seed = dataValue(result, 'seed');
    const value = dataValue(result, 'value');
    if (!validRngState(seed) ||
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0 ||
        value >= 1) {
      return null;
    }
    parts.rngState = seed;
    return value;
  }

  function addItem(items, itemId, quantity) {
    const current = own(items, itemId) ? items[itemId] : 0;
    const next = current + quantity;
    if (!Number.isSafeInteger(next) || next <= 0) return false;
    define(items, itemId, next);
    return true;
  }

  function selectedItem(row, chanceRoll) {
    if (row.itemId !== null) return row.itemId;
    if (chanceRoll === null || row.chance <= 0) return null;
    const normalized = chanceRoll / row.chance;
    const index = Math.min(
      row.itemIds.length - 1,
      Math.floor(normalized * row.itemIds.length)
    );
    return row.itemIds[index];
  }

  function rollEnemyLoot(enemyId, rngState) {
    if (!validRngState(rngState)) {
      return rollFailure('invalid_rng', rngState);
    }
    if (typeof enemyId !== 'string' || !own(enemies, enemyId)) {
      return rollFailure('invalid_enemy', rngState);
    }
    const rows = lootTables[enemies[enemyId].lootTableId];
    const parts = { rngState: rngState };
    const items = {};
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      let chanceRoll = null;
      if (row.chance !== null) {
        chanceRoll = draw(parts);
        if (chanceRoll === null) {
          return rollFailure('invalid_rng_seam', rngState);
        }
        if (chanceRoll >= row.chance) continue;
      }
      let quantity = row.min;
      if (row.min !== row.max) {
        const quantityRoll = draw(parts);
        if (quantityRoll === null) {
          return rollFailure('invalid_rng_seam', rngState);
        }
        quantity = row.min + Math.floor(
          quantityRoll * (row.max - row.min + 1)
        );
      }
      const itemId = selectedItem(row, chanceRoll);
      if (typeof itemId !== 'string' ||
          !addItem(items, itemId, quantity)) {
        return rollFailure('invalid_loot_table', rngState);
      }
    }
    return rollSuccess(
      { type: 'enemy', id: enemyId },
      items,
      0,
      parts.rngState
    );
  }

  function rollFirstClearRewards(dungeonId, rngState) {
    if (!validRngState(rngState)) {
      return rollFailure('invalid_rng', rngState);
    }
    if (typeof dungeonId !== 'string' || !own(dungeons, dungeonId)) {
      return rollFailure('invalid_dungeon', rngState);
    }
    const items = copyContentItems(dungeons[dungeonId].items);
    if (!items) return rollFailure('invalid_dungeon', rngState);
    return rollSuccess(
      { type: 'dungeon-first-clear', id: dungeonId },
      items,
      0,
      rngState
    );
  }

  function mutationResult(
    okValue,
    code,
    state,
    result,
    warning,
    freezeState
  ) {
    if (freezeState) deepFreeze(state);
    if (result) deepFreeze(result);
    return Object.freeze({
      ok: okValue,
      code: code,
      state: state,
      result: result,
      warning: warning
    });
  }

  function failure(code, model, warning) {
    return mutationResult(
      false,
      code,
      model,
      null,
      warning || null,
      false
    );
  }

  function canonicalRewardPayload(source, items, currency) {
    if (typeof rewardPayloadValidator !== 'function') return null;
    let validated;
    try {
      validated = rewardPayloadValidator(source, items, currency);
    } catch (error) {
      return null;
    }
    const copied = cloneStrict(validated, new Set());
    return copied.ok &&
      exactDataKeys(copied.value, ['source', 'items', 'currency'])
      ? copied.value
      : null;
  }

  function readReward(value) {
    const copied = safeClone(value);
    if (!copied.ok ||
        !exactDataKeys(copied.value, [
          'ok', 'code', 'source', 'items', 'currency', 'rngState'
        ]) ||
        dataValue(copied.value, 'ok') !== true ||
        dataValue(copied.value, 'code') !== 'ok') {
      return null;
    }
    const reward = canonicalRewardPayload(
      dataValue(copied.value, 'source'),
      dataValue(copied.value, 'items'),
      dataValue(copied.value, 'currency')
    );
    const rngState = dataValue(copied.value, 'rngState');
    return reward && validRngState(rngState)
      ? {
        source: reward.source,
        items: reward.items,
        currency: reward.currency,
        rngState: rngState
      }
      : null;
  }

  function inspectModel(model) {
    const copied = safeClone(model);
    if (!copied.ok || !plainRecord(copied.value)) return null;
    const state = copied.value;
    const player = dataValue(state, 'player');
    const inventory = dataValue(player, 'inventory');
    const currency = dataValue(player, 'lingshi');
    const systems = dataValue(state, 'systems');
    const combat = dataValue(systems, 'combat');
    const pendingLoot = dataValue(combat, 'pendingLoot');
    const nextLootId = dataValue(combat, 'nextLootId');
    if (!plainRecord(player) || !plainRecord(inventory) ||
        !validCurrency(currency) || !plainRecord(systems) ||
        !plainRecord(combat) ||
        (pendingLoot !== null && !plainRecord(pendingLoot)) ||
        !validPositiveQuantity(nextLootId)) {
      return null;
    }
    if (pendingLoot !== null &&
        !readPending(pendingLoot, nextLootId)) {
      return null;
    }
    return {
      state: state,
      player: player,
      inventory: inventory,
      combat: combat,
      pendingLoot: pendingLoot,
      nextLootId: nextLootId
    };
  }

  function callInventory(inventory, items) {
    if (typeof inventoryApply !== 'function') return null;
    const copiedInventory = cloneStrict(inventory, new Set());
    const copiedItems = cloneStrict(items, new Set());
    if (!copiedInventory.ok || !copiedItems.ok) return null;
    const delta = Object.create(null);
    const itemIds = Object.keys(copiedItems.value);
    for (let index = 0; index < itemIds.length; index++) {
      define(delta, itemIds[index], copiedItems.value[itemIds[index]]);
    }
    let raw;
    try {
      raw = inventoryApply(copiedInventory.value, delta);
    } catch (error) {
      return null;
    }
    const copied = safeClone(raw);
    if (!copied.ok || !plainRecord(copied.value)) return null;
    const okValue = dataValue(copied.value, 'ok');
    const code = dataValue(copied.value, 'code');
    const value = dataValue(copied.value, 'value');
    if (typeof okValue !== 'boolean' ||
        typeof code !== 'string' ||
        !plainRecord(value)) {
      return null;
    }
    return { ok: okValue, code: code, value: value };
  }

  function batchResult(items, currency, pendingLootId) {
    const result = {
      items: items,
      currency: currency,
      pendingLootId: pendingLootId
    };
    if (arguments.length > 3 && Array.isArray(arguments[3])) {
      result.equipment = arguments[3];
      result.lostEquipment = Array.isArray(arguments[4])
        ? arguments[4]
        : [];
      result.warnings = Array.isArray(arguments[5])
        ? arguments[5]
        : [];
    }
    return result;
  }

  function sourceEquipmentRank(source) {
    if (!plainRecord(source)) return 'normal';
    const type = dataValue(source, 'type');
    const id = dataValue(source, 'id');
    if (type === 'dungeon-first-clear') return 'firstClear';
    if (type === 'enemy' && typeof id === 'string' && own(enemies, id)) {
      const tableId = enemies[id].lootTableId;
      if (tableId.indexOf('boss:') === 0) return 'boss';
      if (tableId.indexOf('elite:') === 0) return 'elite';
      return 'normal';
    }
    if (type === 'combat-batch' && typeof id === 'string') {
      try {
        const components = JSON.parse(id);
        let best = 'normal';
        (Array.isArray(components) ? components : []).forEach(
          function (component) {
            const rank = sourceEquipmentRank(component && component.source);
            if (rank === 'firstClear' || rank === 'boss') best = rank;
            else if (rank === 'elite' && best === 'normal') best = rank;
          }
        );
        return best;
      } catch (error) {
        return 'normal';
      }
    }
    return 'normal';
  }

  function equipmentQualityForRoll(rank, value) {
    const weights = {
      normal: [
        ['common', 0.70],
        ['fine', 0.25],
        ['rare', 0.05]
      ],
      elite: [
        ['common', 0.35],
        ['fine', 0.43],
        ['rare', 0.20],
        ['epic', 0.02]
      ],
      boss: [
        ['common', 0.10],
        ['fine', 0.35],
        ['rare', 0.35],
        ['epic', 0.18],
        ['legendary', 0.02]
      ],
      firstClear: [
        ['fine', 0.30],
        ['rare', 0.50],
        ['epic', 0.20]
      ]
    };
    const rows = weights[rank] || weights.normal;
    let total = 0;
    for (let index = 0; index < rows.length; index++) {
      total += rows[index][1];
      if (value < total) return rows[index][0];
    }
    return rows[rows.length - 1][0];
  }

  function convertEquipmentRewards(parts, reward) {
    const remaining = copyContentItems(reward.items);
    if (!remaining) return null;
    const gained = [];
    const lost = [];
    const warnings = [];
    let inventory = parts.inventory;
    const randomParts = { rngState: reward.rngState };
    const rank = sourceEquipmentRank(reward.source);
    const itemIds = Object.keys(remaining);
    for (let itemIndex = 0; itemIndex < itemIds.length; itemIndex++) {
      const itemId = itemIds[itemIndex];
      const probe = Equipment &&
        typeof Equipment.legacyInstance === 'function'
        ? Equipment.legacyInstance(itemId, 1)
        : null;
      if (!probe) continue;
      const quantity = remaining[itemId];
      delete remaining[itemId];
      for (let ordinal = 0; ordinal < quantity; ordinal++) {
        const qualityRoll = draw(randomParts);
        if (qualityRoll === null) return null;
        const equipmentState = dataValue(inventory, 'equipment');
        const nextInstanceId = dataValue(
          equipmentState,
          'nextInstanceId'
        );
        if (!plainRecord(equipmentState) ||
            !Number.isSafeInteger(nextInstanceId) ||
            nextInstanceId < 1) {
          return null;
        }
        const generated = Equipment.generate({
          baseId: probe.baseId,
          quality: equipmentQualityForRoll(rank, qualityRoll),
          instanceId: 'eq-' + nextInstanceId,
          source: {
            type: 'combat',
            sourceId: typeof reward.source.id === 'string'
              ? reward.source.id
              : '',
            acquiredAt: 0
          },
          rngState: randomParts.rngState
        });
        if (!generated || !generated.ok) return null;
        randomParts.rngState = generated.rngState;
        const added = Inventory.addEquipment(
          inventory,
          generated.instance
        );
        if (added.ok) {
          inventory = added.value;
          gained.push(generated.instance);
        } else if (added.code === 'inventory_full') {
          lost.push(generated.instance);
          warnings.push('equipment_lost_inventory_full');
        } else {
          return null;
        }
      }
    }
    return {
      inventory: inventory,
      items: remaining,
      equipment: gained,
      lost: lost,
      warnings: warnings,
      rngState: randomParts.rngState
    };
  }

  function applyOrPend(model, rawReward, createdAtMs) {
    const parts = inspectModel(model);
    if (!parts) return failure('invalid_state', model, null);
    if (parts.pendingLoot !== null) {
      return failure('pending_loot_exists', model, null);
    }
    if (parts.nextLootId === Number.MAX_SAFE_INTEGER) {
      return failure('loot_id_exhausted', model, null);
    }
    const reward = readReward(rawReward);
    if (!reward) return failure('invalid_rewards', model, null);
    if (!finiteTimestamp(createdAtMs)) {
      return failure('invalid_created_at', model, null);
    }
    const nextCurrency = parts.player.lingshi + reward.currency;
    if (!Number.isSafeInteger(nextCurrency) || nextCurrency < 0) {
      return failure('invalid_currency', model, null);
    }
    const converted = convertEquipmentRewards(parts, reward);
    if (!converted) return failure('invalid_rewards', model, null);
    const applied = callInventory(converted.inventory, converted.items);
    if (!applied) return failure('inventory_apply_failed', model, null);
    if (applied.ok) {
      if (applied.code !== 'ok') {
        return failure('inventory_apply_failed', model, null);
      }
      parts.player.inventory = applied.value;
      parts.player.lingshi = nextCurrency;
      parts.state.rngState = converted.rngState;
      const hasEquipmentResult = converted.equipment.length > 0 ||
        converted.lost.length > 0 ||
        converted.warnings.length > 0;
      return mutationResult(
        true,
        'ok',
        parts.state,
        hasEquipmentResult
          ? batchResult(
            converted.items,
            reward.currency,
            null,
            converted.equipment,
            converted.lost,
            converted.warnings
          )
          : batchResult(converted.items, reward.currency, null),
        converted.warnings[0] || null,
        true
      );
    }
    if (applied.code !== 'inventory_full' ||
        !sameData(applied.value, parts.inventory)) {
      return failure('invalid_rewards', model, null);
    }
    const pending = {
      id: 'combat-loot-' + parts.nextLootId,
      source: reward.source,
      items: converted.items,
      currency: reward.currency,
      createdAtMs: Object.is(createdAtMs, -0) ? 0 : createdAtMs
    };
    parts.combat.pendingLoot = pending;
    parts.combat.nextLootId = parts.nextLootId + 1;
    parts.player.inventory = converted.inventory;
    parts.state.rngState = converted.rngState;
    return mutationResult(
      false,
      'inventory_full',
      parts.state,
      null,
      'inventory_full',
      true
    );
  }

  function readPending(value, nextLootId) {
    if (!exactDataKeys(value, [
      'id', 'source', 'items', 'currency', 'createdAtMs'
    ])) {
      return null;
    }
    const id = dataValue(value, 'id');
    const reward = canonicalRewardPayload(
      dataValue(value, 'source'),
      dataValue(value, 'items'),
      dataValue(value, 'currency')
    );
    const createdAtMs = dataValue(value, 'createdAtMs');
    const match = typeof id === 'string'
      ? /^combat-loot-([1-9][0-9]*)$/.exec(id)
      : null;
    const number = match ? Number(match[1]) : 0;
    if (!match ||
        !Number.isSafeInteger(number) ||
        number <= 0 ||
        number >= Number.MAX_SAFE_INTEGER ||
        nextLootId !== number + 1 ||
        !reward ||
        !finiteTimestamp(createdAtMs)) {
      return null;
    }
    return {
      id: id,
      source: reward.source,
      items: reward.items,
      currency: reward.currency,
      createdAtMs: Object.is(createdAtMs, -0) ? 0 : createdAtMs
    };
  }

  function claimPending(model) {
    const parts = inspectModel(model);
    if (!parts) return failure('invalid_state', model, null);
    if (parts.pendingLoot === null) {
      return failure('no_pending_loot', model, null);
    }
    const pending = readPending(parts.pendingLoot, parts.nextLootId);
    if (!pending) return failure('invalid_state', model, null);
    const nextCurrency = parts.player.lingshi + pending.currency;
    if (!Number.isSafeInteger(nextCurrency) || nextCurrency < 0) {
      return failure('invalid_currency', model, null);
    }
    const applied = callInventory(parts.inventory, pending.items);
    if (!applied) return failure('inventory_apply_failed', model, null);
    if (!applied.ok) {
      if (applied.code === 'inventory_full' &&
          sameData(applied.value, parts.inventory)) {
        return failure('inventory_full', model, 'inventory_full');
      }
      return failure('invalid_state', model, null);
    }
    if (applied.code !== 'ok') {
      return failure('inventory_apply_failed', model, null);
    }
    parts.player.inventory = applied.value;
    parts.player.lingshi = nextCurrency;
    parts.combat.pendingLoot = null;
    return mutationResult(
      true,
      'ok',
      parts.state,
      batchResult(pending.items, pending.currency, null),
      null,
      true
    );
  }

  function queryPending(model) {
    const parts = inspectModel(model);
    if (!parts || parts.pendingLoot === null) return null;
    const pending = readPending(parts.pendingLoot, parts.nextLootId);
    return pending ? deepFreeze(pending) : null;
  }

  function grantEquipment(model, rawAwards) {
    const parts = inspectModel(model);
    const awards = strictArrayValues(rawAwards);
    if (!parts || !awards) {
      return failure('invalid_state', model, null);
    }
    const gained = [];
    const lost = [];
    const warnings = [];
    let inventory = parts.inventory;
    let rngState = parts.state.rngState;
    for (let index = 0; index < awards.length; index++) {
      const award = awards[index];
      if (!plainRecord(award)) {
        return failure('invalid_rewards', model, null);
      }
      const equipmentState = dataValue(inventory, 'equipment');
      const nextInstanceId = dataValue(equipmentState, 'nextInstanceId');
      if (!plainRecord(equipmentState) ||
          !Number.isSafeInteger(nextInstanceId) ||
          nextInstanceId < 1) {
        return failure('invalid_state', model, null);
      }
      const generated = Equipment.generate({
        baseId: dataValue(award, 'baseId'),
        quality: dataValue(award, 'quality'),
        instanceId: 'eq-' + nextInstanceId,
        source: {
          type: 'combat',
          sourceId: typeof dataValue(award, 'sourceId') === 'string'
            ? dataValue(award, 'sourceId')
            : '',
          acquiredAt: 0
        },
        rngState: rngState
      });
      if (!generated.ok) {
        return failure(generated.code, model, null);
      }
      rngState = generated.rngState;
      const added = Inventory.addEquipment(inventory, generated.instance);
      if (added.ok) {
        inventory = added.value;
        gained.push(generated.instance);
      } else if (added.code === 'inventory_full') {
        lost.push(generated.instance);
        warnings.push('equipment_lost_inventory_full');
      } else {
        return failure(added.code, model, null);
      }
    }
    parts.player.inventory = inventory;
    parts.state.rngState = rngState;
    return {
      ok: true,
      code: 'ok',
      state: parts.state,
      result: {
        equipment: gained,
        lost: lost,
        warnings: warnings
      },
      changed: awards.length > 0
    };
  }

  return Object.freeze({
    rollEnemyLoot: rollEnemyLoot,
    rollFirstClearRewards: rollFirstClearRewards,
    applyOrPend: applyOrPend,
    claimPending: claimPending,
    queryPending: queryPending,
    grantEquipment: grantEquipment
  });
});
