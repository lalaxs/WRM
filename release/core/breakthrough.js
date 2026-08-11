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
      require('../content/items.js'),
      require('../content/realms.js'),
      require('./inventory.js'),
      require('./random.js'),
      proxyDetector,
      null
    );
  } else if (root) {
    root.Breakthrough = factory(
      root.ItemContent,
      root.RealmContent,
      root.Inventory,
      root.GameRandom,
      null,
      root.structuredClone
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  ItemContent,
  RealmContent,
  Inventory,
  GameRandom,
  proxyDetector,
  stateCloneProbe
) {
  'use strict';

  const UINT32_MAX = 0xFFFFFFFF;
  const PILL_BONUS = 0.20;

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
    return expected.every(function (key) {
      return own(record, key);
    });
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
      const array = [];
      for (let index = 0; index < values.length; index++) {
        const copied = cloneStrict(values[index], nextAncestors);
        if (!copied.ok) return copied;
        array.push(copied.value);
      }
      return { ok: true, value: array };
    }
    if (!plainRecord(value)) return { ok: false, value: null };
    const record = {};
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
      define(record, key, copied.value);
    }
    return { ok: true, value: record };
  }

  function cloneState(value) {
    const copied = cloneStrict(value, new Set());
    if (!copied.ok) return copied;
    if (typeof proxyDetector !== 'function') {
      if (typeof stateCloneProbe !== 'function') {
        return { ok: false, value: null };
      }
      try {
        stateCloneProbe(value);
      } catch (error) {
        return { ok: false, value: null };
      }
    }
    return copied;
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

  function validRng(value) {
    return Number.isSafeInteger(value) && value > 0 &&
      value <= UINT32_MAX;
  }

  function validOptionalTime(value) {
    return value === null || (finite(value) && value >= 0);
  }

  function normalizedChance(value) {
    return Math.round(value * 1000000000000) / 1000000000000;
  }

  function readContent() {
    const transitionsValue = dependencyValue(RealmContent, 'TRANSITIONS');
    const realmsValue = dependencyValue(RealmContent, 'REALMS');
    const transitionValues = strictArrayValues(transitionsValue);
    if (!transitionValues || !plainRecord(realmsValue)) {
      return {
        transitions: Object.freeze([]),
        byRealmId: Object.freeze({}),
        byReference: new WeakMap(),
        realms: Object.freeze({})
      };
    }
    const realms = {};
    let realmKeys;
    try {
      realmKeys = Reflect.ownKeys(realmsValue);
    } catch (error) {
      realmKeys = [];
    }
    realmKeys.forEach(function (realmId) {
      if (typeof realmId !== 'string') return;
      const raw = dataValue(realmsValue, realmId);
      if (!plainRecord(raw)) return;
      const id = dataValue(raw, 'id');
      const name = dataValue(raw, 'name');
      const index = dataValue(raw, 'index');
      const lifespan = dataValue(raw, 'lifespan');
      if (id !== realmId || typeof name !== 'string' ||
          !nonNegativeInteger(index) ||
          !(lifespan === null || (finite(lifespan) && lifespan >= 0))) {
        return;
      }
      define(realms, realmId, {
        id: id,
        name: name,
        index: index,
        lifespan: lifespan
      });
    });

    const transitions = [];
    const byRealmId = {};
    const byReference = new WeakMap();
    transitionValues.forEach(function (raw) {
      if (!plainRecord(raw)) return;
      const currentRealmId = dataValue(raw, 'currentRealmId');
      const nextRealmId = dataValue(raw, 'nextRealmId');
      const cultivationNeed = dataValue(raw, 'cultivationNeed');
      const baseChance = dataValue(raw, 'baseChance');
      const pillItemId = dataValue(raw, 'pillItemId');
      const gate = dataValue(raw, 'gate');
      if (typeof currentRealmId !== 'string' ||
          typeof nextRealmId !== 'string' ||
          !own(realms, currentRealmId) ||
          !own(realms, nextRealmId) ||
          !finite(cultivationNeed) || cultivationNeed < 0 ||
          !finite(baseChance) || baseChance < 0 || baseChance > 1 ||
          !(pillItemId === null || typeof pillItemId === 'string') ||
          !plainRecord(gate)) {
        return;
      }
      const gateId = dataValue(gate, 'id');
      const gateType = dataValue(gate, 'type');
      const gateTargetId = dataValue(gate, 'targetId');
      const gateCount = dataValue(gate, 'count');
      if (typeof gateId !== 'string' || gateId.trim().length === 0 ||
          typeof gateType !== 'string' ||
          typeof gateTargetId !== 'string' ||
          !positiveInteger(gateCount)) {
        return;
      }
      const record = deepFreeze({
        reference: raw,
        currentRealmId: currentRealmId,
        nextRealmId: nextRealmId,
        cultivationNeed: cultivationNeed,
        baseChance: baseChance,
        pillItemId: pillItemId,
        gate: {
          id: gateId,
          type: gateType,
          targetId: gateTargetId,
          count: gateCount
        },
        nextLifespan: realms[nextRealmId].lifespan
      });
      transitions.push(record);
      define(byRealmId, currentRealmId, record);
      byReference.set(raw, record);
    });
    return {
      transitions: deepFreeze(transitions),
      byRealmId: deepFreeze(byRealmId),
      byReference: byReference,
      realms: deepFreeze(realms)
    };
  }

  const CONTENT = readContent();

  function readItemIds() {
    const source = dependencyValue(ItemContent, 'ITEMS');
    if (!plainRecord(source)) return Object.freeze({});
    let keys;
    try {
      keys = Reflect.ownKeys(source);
    } catch (error) {
      return Object.freeze({});
    }
    const ids = {};
    for (let index = 0; index < keys.length; index++) {
      const itemId = keys[index];
      if (typeof itemId !== 'string') continue;
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(source, itemId);
      } catch (error) {
        continue;
      }
      if (!descriptor || !own(descriptor, 'value') ||
          !plainRecord(descriptor.value) ||
          dataValue(descriptor.value, 'id') !== itemId) {
        continue;
      }
      define(ids, itemId, true);
    }
    return deepFreeze(ids);
  }

  const ITEM_IDS = readItemIds();

  function contentTransition(value) {
    if (!value || typeof value !== 'object' || isDetectedProxy(value)) {
      return null;
    }
    try {
      return CONTENT.byReference.get(value) || null;
    } catch (error) {
      return null;
    }
  }

  function validatePills(transition, selectedPills) {
    const copied = cloneState(selectedPills);
    const values = copied.ok ? strictArrayValues(copied.value) : null;
    if (!values) {
      return { ok: false, code: 'invalid_pills', values: [], count: 0 };
    }
    for (let index = 0; index < values.length; index++) {
      if (typeof values[index] !== 'string') {
        return {
          ok: false,
          code: 'invalid_pills',
          values: [],
          count: 0
        };
      }
      if (!transition.pillItemId ||
          values[index] !== transition.pillItemId) {
        return {
          ok: false,
          code: 'pill_mismatch',
          values: [],
          count: 0
        };
      }
    }
    return {
      ok: true,
      code: 'ok',
      values: values,
      count: values.length
    };
  }

  function validateBuffRecord(value, allowSpent) {
    if (!exactDataKeys(value, ['id', 'bonus', 'usesRemaining'])) {
      return null;
    }
    const id = dataValue(value, 'id');
    const bonus = dataValue(value, 'bonus');
    const usesRemaining = dataValue(value, 'usesRemaining');
    if (typeof id !== 'string' || id.trim().length === 0 ||
        !finite(bonus) || bonus < 0 || bonus > 1 ||
        !(allowSpent
          ? nonNegativeInteger(usesRemaining)
          : positiveInteger(usesRemaining))) {
      return null;
    }
    return {
      id: id,
      bonus: bonus,
      usesRemaining: usesRemaining
    };
  }

  function validateBuffs(activeEventBuffs) {
    const copied = cloneState(activeEventBuffs);
    const values = copied.ok ? strictArrayValues(copied.value) : null;
    if (!values) return null;
    const records = [];
    const ids = Object.create(null);
    for (let index = 0; index < values.length; index++) {
      const record = validateBuffRecord(values[index], true);
      if (!record || own(ids, record.id)) return null;
      define(ids, record.id, true);
      records.push(record);
    }
    return records;
  }

  function chance(transition, selectedPills, activeEventBuffs) {
    const authored = contentTransition(transition);
    if (!authored) return null;
    const pills = validatePills(authored, selectedPills);
    const buffs = validateBuffs(activeEventBuffs);
    if (!pills.ok || !buffs) return null;
    let eventBonus = 0;
    for (let index = 0; index < buffs.length; index++) {
      if (buffs[index].usesRemaining > 0) {
        eventBonus += buffs[index].bonus;
        if (!finite(eventBonus)) return null;
      }
    }
    return normalizedChance(Math.min(
      1,
      Math.max(
        0,
        authored.baseChance + pills.count * PILL_BONUS + eventBonus
      )
    ));
  }

  function validateInventory(inventory) {
    if (!exactDataKeys(inventory, [
      'capacity',
      'capacityGrants',
      'stacks',
      'bindings'
    ])) {
      return false;
    }
    const capacity = dataValue(inventory, 'capacity');
    const grants = dataValue(inventory, 'capacityGrants');
    const stacks = dataValue(inventory, 'stacks');
    const bindings = dataValue(inventory, 'bindings');
    if (!nonNegativeInteger(capacity) ||
        !exactDataKeys(grants, ['shop', 'achievement', 'task']) ||
        !plainRecord(stacks) ||
        !plainRecord(bindings) ||
        !nonNegativeInteger(dataValue(grants, 'shop')) ||
        !nonNegativeInteger(dataValue(grants, 'achievement')) ||
        !nonNegativeInteger(dataValue(grants, 'task'))) {
      return false;
    }
    const stackIds = Object.keys(stacks);
    if (stackIds.length > capacity) return false;
    for (let index = 0; index < stackIds.length; index++) {
      const itemId = stackIds[index];
      if (!own(ITEM_IDS, itemId) ||
          !positiveInteger(dataValue(stacks, itemId))) {
        return false;
      }
    }
    const boundIds = Object.keys(bindings);
    for (let index = 0; index < boundIds.length; index++) {
      const itemId = boundIds[index];
      const record = dataValue(bindings, itemId);
      if (!own(stacks, itemId) ||
          !exactDataKeys(record, ['equipment', 'task', 'formation'])) {
        return false;
      }
      const equipment = dataValue(record, 'equipment');
      const task = dataValue(record, 'task');
      const formation = dataValue(record, 'formation');
      if (!nonNegativeInteger(equipment) ||
          !nonNegativeInteger(task) ||
          !nonNegativeInteger(formation)) {
        return false;
      }
      const total = equipment + task + formation;
      if (!Number.isSafeInteger(total) || total <= 0 ||
          total > dataValue(stacks, itemId)) {
        return false;
      }
    }
    return true;
  }

  function inspect(model) {
    const copied = cloneState(model);
    if (!copied.ok || !plainRecord(copied.value)) return null;
    const state = copied.value;
    const player = dataValue(state, 'player');
    const breakthrough = dataValue(player, 'breakthrough');
    const progress = dataValue(player, 'combatProgress');
    const completedGates = dataValue(progress, 'completedGates');
    const inventory = dataValue(player, 'inventory');
    const stacks = dataValue(inventory, 'stacks');
    const bindings = dataValue(inventory, 'bindings');
    const realmId = dataValue(breakthrough, 'realmId');
    const cultivation = dataValue(breakthrough, 'cultivation');
    const eventBuffs = validateBuffs(
      dataValue(breakthrough, 'eventBuffs')
    );
    const rngState = dataValue(state, 'rngState');
    if (!plainRecord(player) || !plainRecord(breakthrough) ||
        !plainRecord(progress) || !plainRecord(completedGates) ||
        !validateInventory(inventory) ||
        !plainRecord(stacks) || !plainRecord(bindings) ||
        typeof realmId !== 'string' || !own(CONTENT.realms, realmId) ||
        !finite(cultivation) || cultivation < 0 ||
        !eventBuffs || !validRng(rngState) ||
        !validOptionalTime(dataValue(player, 'shouMax')) ||
        !validOptionalTime(dataValue(player, 'shouyuan')) ||
        !validOptionalTime(dataValue(player, 'lifespanAnchorMs')) ||
        !validOptionalTime(dataValue(player, 'lifespanBaseYears'))) {
      return null;
    }
    return {
      original: model,
      state: state,
      player: player,
      breakthrough: breakthrough,
      progress: progress,
      completedGates: completedGates,
      inventory: inventory,
      stacks: stacks,
      bindings: bindings || {},
      realmId: realmId,
      cultivation: cultivation,
      eventBuffs: eventBuffs,
      rngState: rngState
    };
  }

  function requirementDto(parts) {
    if (!parts) {
      return deepFreeze({
        ok: false,
        code: 'invalid_state',
        realmId: null,
        nextRealmId: null,
        cultivation: null,
        cultivationNeed: null,
        cultivationMet: false,
        gateId: null,
        gateMet: false,
        ready: false
      });
    }
    const transition = own(CONTENT.byRealmId, parts.realmId)
      ? CONTENT.byRealmId[parts.realmId]
      : null;
    if (!transition) {
      return deepFreeze({
        ok: true,
        code: 'highest_realm',
        realmId: parts.realmId,
        nextRealmId: null,
        cultivation: parts.cultivation,
        cultivationNeed: null,
        cultivationMet: true,
        gateId: null,
        gateMet: true,
        ready: false
      });
    }
    const cultivationMet =
      parts.cultivation >= transition.cultivationNeed;
    const gateMet =
      dataValue(parts.completedGates, transition.gate.id) === true;
    return deepFreeze({
      ok: true,
      code: !cultivationMet
        ? 'insufficient_cultivation'
        : !gateMet ? 'gate_incomplete' : 'ready',
      realmId: transition.currentRealmId,
      nextRealmId: transition.nextRealmId,
      cultivation: parts.cultivation,
      cultivationNeed: transition.cultivationNeed,
      cultivationMet: cultivationMet,
      gateId: transition.gate.id,
      gateMet: gateMet,
      ready: cultivationMet && gateMet
    });
  }

  function requirements(model) {
    return requirementDto(inspect(model));
  }

  function emptyConsumed() {
    return { items: {}, eventBuffIds: [] };
  }

  function attemptDto(okValue, code, state, rngState, finalChance, roll,
    consumed, gateId, realmBefore, realmAfter) {
    return {
      ok: okValue,
      code: code,
      state: state,
      rngState: rngState,
      chance: finalChance,
      roll: roll,
      consumed: consumed,
      gateId: gateId,
      realmBefore: realmBefore,
      realmAfter: realmAfter
    };
  }

  function validationFailure(parts, model, code, transition) {
    return attemptDto(
      false,
      code,
      model,
      parts ? parts.rngState : null,
      null,
      null,
      emptyConsumed(),
      transition ? transition.gate.id : null,
      parts ? parts.realmId : null,
      parts ? parts.realmId : null
    );
  }

  function boundQuantity(parts, itemId) {
    const record = dataValue(parts.bindings, itemId);
    if (record === undefined) return 0;
    if (!plainRecord(record)) return null;
    const reasons = ['equipment', 'task', 'formation'];
    let total = 0;
    for (let index = 0; index < reasons.length; index++) {
      const quantity = dataValue(record, reasons[index]);
      if (quantity === undefined) continue;
      if (!nonNegativeInteger(quantity) ||
          !Number.isSafeInteger(total + quantity)) {
        return null;
      }
      total += quantity;
    }
    return total;
  }

  function inventorySelection(parts, transition, pillCount) {
    if (pillCount === 0) {
      return {
        ok: true,
        code: 'ok',
        delta: Object.create(null),
        consumed: {}
      };
    }
    const owned = dataValue(parts.stacks, transition.pillItemId);
    const quantity = owned === undefined ? 0 : owned;
    const bound = boundQuantity(parts, transition.pillItemId);
    if (!nonNegativeInteger(quantity) || bound === null ||
        bound > quantity) {
      return { ok: false, code: 'invalid_state' };
    }
    if (pillCount > quantity) {
      return { ok: false, code: 'insufficient_items' };
    }
    if (pillCount > quantity - bound) {
      return { ok: false, code: 'item_bound' };
    }
    const delta = Object.create(null);
    const consumed = {};
    define(delta, transition.pillItemId, -pillCount);
    define(consumed, transition.pillItemId, pillCount);
    return {
      ok: true,
      code: 'ok',
      delta: delta,
      consumed: consumed
    };
  }

  function draw(seed) {
    const next = dependencyValue(GameRandom, 'next');
    if (typeof next !== 'function') return null;
    let result;
    try {
      result = next(seed);
    } catch (error) {
      return null;
    }
    const nextSeed = dataValue(result, 'seed');
    const value = dataValue(result, 'value');
    return validRng(nextSeed) && finite(value) && value >= 0 && value < 1
      ? { seed: nextSeed, value: value }
      : null;
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

  function expectedInventory(inventory, delta) {
    const copied = cloneStrict(inventory, new Set());
    if (!copied.ok || !validateInventory(copied.value)) return null;
    const expected = copied.value;
    const itemIds = Object.keys(delta);
    for (let index = 0; index < itemIds.length; index++) {
      const itemId = itemIds[index];
      const quantity = dataValue(delta, itemId);
      if (!Number.isSafeInteger(quantity) || quantity > 0 ||
          !own(expected.stacks, itemId)) {
        return null;
      }
      const next = expected.stacks[itemId] + quantity;
      if (!nonNegativeInteger(next)) return null;
      if (next === 0) delete expected.stacks[itemId];
      else expected.stacks[itemId] = next;
    }
    return validateInventory(expected) ? expected : null;
  }

  function applyInventory(inventory, delta) {
    const apply = dependencyValue(Inventory, 'apply');
    const expected = expectedInventory(inventory, delta);
    if (typeof apply !== 'function' || !expected) return null;
    try {
      const result = apply(inventory, delta);
      const value = dataValue(result, 'value');
      if (!plainRecord(result) ||
          dataValue(result, 'ok') !== true ||
          !validateInventory(value) ||
          !sameData(value, expected)) {
        return null;
      }
      return value;
    } catch (error) {
      return null;
    }
  }

  function attempt(model, selectedPills) {
    const parts = inspect(model);
    if (!parts) {
      return validationFailure(null, model, 'invalid_state', null);
    }
    const transition = own(CONTENT.byRealmId, parts.realmId)
      ? CONTENT.byRealmId[parts.realmId]
      : null;
    if (!transition) {
      return validationFailure(parts, model, 'highest_realm', null);
    }
    if (parts.cultivation < transition.cultivationNeed) {
      return validationFailure(
        parts,
        model,
        'insufficient_cultivation',
        transition
      );
    }
    if (dataValue(parts.completedGates, transition.gate.id) !== true) {
      return validationFailure(parts, model, 'gate_incomplete', transition);
    }
    const pills = validatePills(transition, selectedPills);
    if (!pills.ok) {
      return validationFailure(parts, model, pills.code, transition);
    }
    const inventoryPlan = inventorySelection(
      parts,
      transition,
      pills.count
    );
    if (!inventoryPlan.ok) {
      return validationFailure(
        parts,
        model,
        inventoryPlan.code,
        transition
      );
    }
    const finalChance = chance(
      transition.reference,
      selectedPills,
      parts.eventBuffs
    );
    if (!finite(finalChance)) {
      return validationFailure(parts, model, 'invalid_state', transition);
    }

    const nextInventory = applyInventory(
      parts.inventory,
      inventoryPlan.delta
    );
    if (!nextInventory) {
      return validationFailure(
        parts,
        model,
        'inventory_apply_failed',
        transition
      );
    }
    const drawn = draw(parts.rngState);
    if (!drawn) {
      return validationFailure(
        parts,
        model,
        'invalid_rng_seam',
        transition
      );
    }

    parts.player.inventory = nextInventory;
    const consumedEventBuffIds = [];
    for (let index = 0; index < parts.eventBuffs.length; index++) {
      if (parts.eventBuffs[index].usesRemaining <= 0) continue;
      parts.breakthrough.eventBuffs[index].usesRemaining -= 1;
      consumedEventBuffIds.push(parts.eventBuffs[index].id);
    }
    parts.state.rngState = drawn.seed;
    parts.breakthrough.cultivation = 0;
    const succeeded = drawn.value < finalChance;
    if (succeeded) {
      parts.breakthrough.realmId = transition.nextRealmId;
      parts.player.shouMax = transition.nextLifespan;
      parts.player.shouyuan = transition.nextLifespan;
      parts.player.lifespanAnchorMs = null;
      parts.player.lifespanBaseYears = null;
    }
    return attemptDto(
      true,
      succeeded ? 'success' : 'failure',
      parts.state,
      drawn.seed,
      finalChance,
      drawn.value,
      {
        items: inventoryPlan.consumed,
        eventBuffIds: consumedEventBuffIds
      },
      transition.gate.id,
      transition.currentRealmId,
      succeeded ? transition.nextRealmId : transition.currentRealmId
    );
  }

  function addEventBuff(model, buff) {
    const parts = inspect(model);
    if (!parts) {
      return { ok: false, code: 'invalid_state', state: model };
    }
    const copiedBuff = cloneState(buff);
    const record = copiedBuff.ok
      ? validateBuffRecord(copiedBuff.value, false)
      : null;
    if (!record) {
      return { ok: false, code: 'invalid_buff', state: model };
    }
    let foundIndex = -1;
    for (let index = 0; index < parts.eventBuffs.length; index++) {
      if (parts.eventBuffs[index].id === record.id) {
        foundIndex = index;
        break;
      }
    }
    if (foundIndex >= 0 &&
        record.usesRemaining <=
          parts.eventBuffs[foundIndex].usesRemaining) {
      return { ok: true, code: 'unchanged', state: model };
    }
    if (foundIndex >= 0) {
      parts.breakthrough.eventBuffs[foundIndex] = record;
      return { ok: true, code: 'replaced', state: parts.state };
    }
    parts.breakthrough.eventBuffs.push(record);
    return { ok: true, code: 'added', state: parts.state };
  }

  function realmView(realmId) {
    if (!realmId || !own(CONTENT.realms, realmId)) return null;
    const realm = CONTENT.realms[realmId];
    return {
      id: realm.id,
      name: realm.name,
      index: realm.index,
      lifespan: realm.lifespan
    };
  }

  function failureConsequence() {
    return {
      cultivationCleared: true,
      gateRetained: true,
      selectedPreparationConsumed: true
    };
  }

  function emptyQuery(code) {
    return deepFreeze({
      ok: false,
      code: code,
      ready: false,
      currentRealm: null,
      nextRealm: null,
      cultivation: null,
      cultivationNeed: null,
      cultivationMet: false,
      gate: null,
      baseChance: null,
      pill: null,
      eventBuffs: [],
      eventBonus: 0,
      finalChance: null,
      failureConsequence: failureConsequence()
    });
  }

  function eventBuffViews(eventBuffs) {
    return eventBuffs.map(function (buff) {
      return {
        id: buff.id,
        bonus: buff.bonus,
        usesRemaining: buff.usesRemaining,
        active: buff.usesRemaining > 0
      };
    });
  }

  function query(model, selectedPills) {
    if (selectedPills === undefined) selectedPills = [];
    const parts = inspect(model);
    if (!parts) return emptyQuery('invalid_state');
    const transition = own(CONTENT.byRealmId, parts.realmId)
      ? CONTENT.byRealmId[parts.realmId]
      : null;
    if (!transition) {
      const highest = emptyQuery('highest_realm');
      return deepFreeze({
        ok: true,
        code: highest.code,
        ready: false,
        currentRealm: realmView(parts.realmId),
        nextRealm: null,
        cultivation: parts.cultivation,
        cultivationNeed: null,
        cultivationMet: true,
        gate: null,
        baseChance: null,
        pill: null,
        eventBuffs: eventBuffViews(parts.eventBuffs),
        eventBonus: 0,
        finalChance: null,
        failureConsequence: failureConsequence()
      });
    }
    const pillPlan = validatePills(transition, selectedPills);
    if (!pillPlan.ok) return emptyQuery(pillPlan.code);
    const inventoryPlan = inventorySelection(
      parts,
      transition,
      pillPlan.count
    );
    if (!inventoryPlan.ok) return emptyQuery(inventoryPlan.code);
    let eventBonus = 0;
    const eventBuffs = eventBuffViews(parts.eventBuffs);
    eventBuffs.forEach(function (buff) {
      if (buff.active) eventBonus += buff.bonus;
    });
    eventBonus = normalizedChance(eventBonus);
    const finalChance = chance(
      transition.reference,
      selectedPills,
      parts.eventBuffs
    );
    if (!finite(finalChance)) return emptyQuery('invalid_state');
    const cultivationMet =
      parts.cultivation >= transition.cultivationNeed;
    const gateMet =
      dataValue(parts.completedGates, transition.gate.id) === true;
    const ownedRaw = transition.pillItemId
      ? dataValue(parts.stacks, transition.pillItemId)
      : 0;
    const owned = ownedRaw === undefined ? 0 : ownedRaw;
    return deepFreeze({
      ok: true,
      code: !cultivationMet
        ? 'insufficient_cultivation'
        : !gateMet ? 'gate_incomplete' : 'ready',
      ready: cultivationMet && gateMet,
      currentRealm: realmView(transition.currentRealmId),
      nextRealm: realmView(transition.nextRealmId),
      cultivation: parts.cultivation,
      cultivationNeed: transition.cultivationNeed,
      cultivationMet: cultivationMet,
      gate: {
        id: transition.gate.id,
        type: transition.gate.type,
        targetId: transition.gate.targetId,
        count: transition.gate.count,
        completed: gateMet
      },
      baseChance: transition.baseChance,
      pill: transition.pillItemId
        ? {
          itemId: transition.pillItemId,
          owned: owned,
          maxSelectable: Math.max(
            0,
            owned - boundQuantity(parts, transition.pillItemId)
          ),
          selected: pillPlan.count,
          bonus: pillPlan.count * PILL_BONUS
        }
        : null,
      eventBuffs: eventBuffs,
      eventBonus: eventBonus,
      finalChance: finalChance,
      failureConsequence: failureConsequence()
    });
  }

  return Object.freeze({
    requirements: requirements,
    chance: chance,
    attempt: attempt,
    addEventBuff: addEventBuff,
    query: query
  });
});
