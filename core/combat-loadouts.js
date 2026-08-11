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
      require('./inventory.js'),
      require('../content/combat.js'),
      require('../content/techniques.js'),
      require('../content/equipment.js'),
      require('./equipment.js'),
      proxyDetector,
      null
    );
  } else if (root) {
    root.CombatLoadouts = factory(
      root.Inventory,
      root.CombatContent,
      root.TechniqueContent,
      root.EquipmentContent,
      root.Equipment,
      null,
      root.structuredClone
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Inventory,
  CombatContent,
  TechniqueContent,
  EquipmentContent,
  Equipment,
  proxyDetector,
  stateCloneProbe
) {
  'use strict';

  const MAX_LOADOUTS = 5;
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
  const SUPPLY_SLOTS = Object.freeze(['food', 'pill', 'talisman']);
  const ACTIVE_SLOT_COUNT = 3;
  const PASSIVE_SLOT_COUNT = 5;

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

  function probeModelCloneCapability(model) {
    if (typeof proxyDetector === 'function') return true;
    if (typeof stateCloneProbe !== 'function') return false;
    try {
      stateCloneProbe(model);
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
      if (typeof keys[index] !== 'string' ||
          expected.indexOf(keys[index]) < 0) {
        return false;
      }
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(record, keys[index]);
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
    keys.forEach(function (key) {
      if (typeof key !== 'string') return;
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(source, key);
      } catch (error) {
        return;
      }
      if (!descriptor || !own(descriptor, 'value')) return;
      const parsed = parser(key, descriptor.value);
      if (parsed) define(result, key, parsed);
    });
    return deepFreeze(result);
  }

  function copyStats(value) {
    if (!plainRecord(value)) return null;
    const result = {};
    const keys = Object.keys(value);
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const amount = dataValue(value, key);
      if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;
      define(result, key, amount);
    }
    return result;
  }

  const equipment = snapshotRegistry(
    CombatContent,
    'EQUIPMENT',
    function (id, value) {
      if (!plainRecord(value) || dataValue(value, 'id') !== id) return null;
      const slot = dataValue(value, 'slot');
      const stats = copyStats(dataValue(value, 'stats'));
      if (EQUIPMENT_SLOTS.indexOf(slot) < 0 || !stats) return null;
      return {
        id: id,
        name: typeof dataValue(value, 'name') === 'string'
          ? dataValue(value, 'name')
          : id,
        slot: slot,
        stats: stats
      };
    }
  );

  const supplies = snapshotRegistry(
    CombatContent,
    'SUPPLIES',
    function (id, value) {
      const type = dataValue(value, 'type');
      return SUPPLY_SLOTS.indexOf(type) >= 0
        ? { id: id, type: type }
        : null;
    }
  );

  const techniques = snapshotRegistry(
    TechniqueContent,
    'TECHNIQUES',
    function (id, value) {
      if (!plainRecord(value) || dataValue(value, 'id') !== id) return null;
      const kind = dataValue(value, 'kind');
      if (kind !== 'active' && kind !== 'passive') return null;
      return {
        id: id,
        name: typeof dataValue(value, 'name') === 'string'
          ? dataValue(value, 'name')
          : id,
        kind: kind
      };
    }
  );

  const availableQuantity = dependencyValue(Inventory, 'availableQuantity');
  const bindInventory = dependencyValue(Inventory, 'bind');
  const unbindInventory = dependencyValue(Inventory, 'unbind');

  function safeInteger(value, minimum) {
    return Number.isSafeInteger(value) && value >= minimum;
  }

  function cleanName(value) {
    if (typeof value !== 'string') return null;
    const name = value.trim();
    const length = Array.from(name).length;
    return length >= 1 && length <= 12 ? name : null;
  }

  function readCondition(value) {
    if (!plainRecord(value)) return null;
    const type = dataValue(value, 'type');
    if (type === 'always' || type === 'selfMissingShield') {
      return exactDataKeys(value, ['type']) ? { type: type } : null;
    }
    if (type === 'selfHpBelow' || type === 'enemyHpBelow' ||
        type === 'selfQiAbove' || type === 'selfQiBelow') {
      if (!exactDataKeys(value, ['type', 'threshold'])) return null;
      const threshold = dataValue(value, 'threshold');
      const minimum = type === 'selfQiAbove' ? 0 : 0.01;
      return typeof threshold === 'number' &&
        Number.isFinite(threshold) &&
        threshold >= minimum &&
        threshold <= 1
        ? { type: type, threshold: threshold }
        : null;
    }
    if (type === 'enemyHasStatus' || type === 'enemyMissingStatus') {
      if (!exactDataKeys(value, ['type', 'statusId'])) return null;
      const statusId = dataValue(value, 'statusId');
      return typeof statusId === 'string' && statusId.trim().length > 0
        ? { type: type, statusId: statusId }
        : null;
    }
    if (type === 'selfMissingBuff') {
      if (!exactDataKeys(value, ['type', 'buffId'])) return null;
      const buffId = dataValue(value, 'buffId');
      return typeof buffId === 'string' && buffId.trim().length > 0
        ? { type: type, buffId: buffId }
        : null;
    }
    return null;
  }

  function readSupplyConfig(value, slot) {
    if (!plainRecord(value)) {
      return { ok: false, code: 'invalid_supply_config', value: null };
    }
    const expected = slot === 'talisman'
      ? ['itemId', 'useAt', 'stopWhenEmpty']
      : ['itemId', 'triggerRatio', 'stopWhenEmpty'];
    if (!exactDataKeys(value, expected) ||
        typeof dataValue(value, 'stopWhenEmpty') !== 'boolean') {
      return { ok: false, code: 'invalid_supply_config', value: null };
    }
    const itemId = dataValue(value, 'itemId');
    if (itemId !== null && typeof itemId !== 'string') {
      return { ok: false, code: 'supply_type_mismatch', value: null };
    }
    if (itemId !== null &&
        (!own(supplies, itemId) || supplies[itemId].type !== slot)) {
      return { ok: false, code: 'supply_type_mismatch', value: null };
    }
    if (slot === 'talisman') {
      if (dataValue(value, 'useAt') !== 'enemy_start') {
        return { ok: false, code: 'invalid_use_at', value: null };
      }
      return {
        ok: true,
        code: 'ok',
        value: {
          itemId: itemId,
          useAt: 'enemy_start',
          stopWhenEmpty: dataValue(value, 'stopWhenEmpty')
        }
      };
    }
    const ratio = dataValue(value, 'triggerRatio');
    if (typeof ratio !== 'number' || !Number.isFinite(ratio) ||
        ratio < 0.05 || ratio > 0.95) {
      return { ok: false, code: 'invalid_trigger_ratio', value: null };
    }
    return {
      ok: true,
      code: 'ok',
      value: {
        itemId: itemId,
        triggerRatio: ratio,
        stopWhenEmpty: dataValue(value, 'stopWhenEmpty')
      }
    };
  }

  function validKnownRecord(value) {
    if (!plainRecord(value)) return false;
    const level = dataValue(value, 'level');
    const xp = dataValue(value, 'xp');
    return safeInteger(level, 1) && safeInteger(xp, 0);
  }

  function inventoryCount(inventory, itemId) {
    const stacks = dataValue(inventory, 'stacks');
    const quantity = dataValue(stacks, itemId);
    return safeInteger(quantity, 1) ? quantity : 0;
  }

  function equipmentInstance(inventory, instanceId) {
    if (typeof instanceId !== 'string') return null;
    const equipmentState = dataValue(inventory, 'equipment');
    const instances = strictArrayValues(
      dataValue(equipmentState, 'instances')
    );
    if (!plainRecord(equipmentState) || !instances) return null;
    for (let index = 0; index < instances.length; index++) {
      const normalized = Equipment.normalizeInstance(instances[index]);
      if (normalized && normalized.instanceId === instanceId) {
        return normalized;
      }
    }
    return null;
  }

  function usesInstanceEquipment(inventory) {
    return plainRecord(dataValue(inventory, 'equipment'));
  }

  function bindingCount(inventory, itemId, reason) {
    const bindings = dataValue(inventory, 'bindings');
    const record = dataValue(bindings, itemId);
    if (typeof record === 'undefined') return 0;
    const quantity = dataValue(record, reason);
    return safeInteger(quantity, 0) ? quantity : -1;
  }

  function validateInventory(inventory) {
    if (!plainRecord(inventory)) return false;
    const stacks = dataValue(inventory, 'stacks');
    const bindings = dataValue(inventory, 'bindings');
    const equipmentState = dataValue(inventory, 'equipment');
    const instances = plainRecord(equipmentState)
      ? strictArrayValues(dataValue(equipmentState, 'instances'))
      : null;
    if (!plainRecord(stacks) || !plainRecord(bindings) ||
        (typeof equipmentState !== 'undefined' &&
          (!plainRecord(equipmentState) || !instances))) {
      return false;
    }
    const instanceIds = {};
    if (instances) {
      for (let index = 0; index < instances.length; index++) {
        const instance = Equipment.normalizeInstance(instances[index]);
        if (!instance || own(instanceIds, instance.instanceId)) return false;
        define(instanceIds, instance.instanceId, true);
      }
    }
    const stackIds = Object.keys(stacks);
    for (let index = 0; index < stackIds.length; index++) {
      if (!safeInteger(dataValue(stacks, stackIds[index]), 1)) return false;
    }
    const boundIds = Object.keys(bindings);
    for (let index = 0; index < boundIds.length; index++) {
      const itemId = boundIds[index];
      const record = dataValue(bindings, itemId);
      if (!plainRecord(record) || inventoryCount(inventory, itemId) < 1) {
        return false;
      }
      const equipmentCount = bindingCount(
        inventory,
        itemId,
        'equipment'
      );
      const taskCount = bindingCount(inventory, itemId, 'task');
      const formationCount = bindingCount(
        inventory,
        itemId,
        'formation'
      );
      if (equipmentCount < 0 || taskCount < 0 || formationCount < 0 ||
          equipmentCount + taskCount + formationCount >
            inventoryCount(inventory, itemId)) {
        return false;
      }
    }
    return true;
  }

  function validateLoadout(value, known, seenTechniques, inventory) {
    if (!plainRecord(value)) return false;
    const id = dataValue(value, 'id');
    const name = dataValue(value, 'name');
    if (typeof id !== 'string' || id.trim().length === 0 ||
        cleanName(name) !== name) {
      return false;
    }
    const equipmentState = dataValue(value, 'equipment');
    if (!plainRecord(equipmentState)) return false;
    const instanceMode = usesInstanceEquipment(inventory);
    const slotsToValidate = instanceMode
      ? EQUIPMENT_SLOTS
      : ['weapon', 'armor', 'accessory'];
    for (let index = 0; index < slotsToValidate.length; index++) {
      const slot = slotsToValidate[index];
      const instanceId = dataValue(equipmentState, slot);
      if (instanceMode) {
        const instance = instanceId === null
          ? null
          : equipmentInstance(inventory, instanceId);
        const base = instance && EquipmentContent
          ? EquipmentContent.getBase(instance.baseId)
          : null;
        if (instanceId !== null &&
            (
              typeof instanceId !== 'string' ||
              !instance ||
              !base ||
              base.slot !== slot
            )) {
          return false;
        }
      } else if (instanceId !== null &&
          (
            typeof instanceId !== 'string' ||
            !own(equipment, instanceId) ||
            equipment[instanceId].slot !== slot
          )) {
        return false;
      }
    }

    const active = strictArrayValues(dataValue(value, 'activeTechniques'));
    if (!active || active.length !== ACTIVE_SLOT_COUNT) return false;
    for (let index = 0; index < active.length; index++) {
      const slot = active[index];
      if (!plainRecord(slot)) return false;
      const techniqueId = dataValue(slot, 'techniqueId');
      if (!readCondition(dataValue(slot, 'condition'))) return false;
      if (techniqueId === null) continue;
      if (typeof techniqueId !== 'string' ||
          !own(techniques, techniqueId) ||
          techniques[techniqueId].kind !== 'active' ||
          !own(known, techniqueId) ||
          !validKnownRecord(dataValue(known, techniqueId)) ||
          own(seenTechniques, techniqueId)) {
        return false;
      }
      define(seenTechniques, techniqueId, true);
    }

    const passive = strictArrayValues(dataValue(value, 'passiveTechniques'));
    if (!passive || passive.length !== PASSIVE_SLOT_COUNT) return false;
    for (let index = 0; index < passive.length; index++) {
      const techniqueId = passive[index];
      if (techniqueId === null) continue;
      if (typeof techniqueId !== 'string' ||
          !own(techniques, techniqueId) ||
          techniques[techniqueId].kind !== 'passive' ||
          !own(known, techniqueId) ||
          !validKnownRecord(dataValue(known, techniqueId)) ||
          own(seenTechniques, techniqueId)) {
        return false;
      }
      define(seenTechniques, techniqueId, true);
    }

    const supplyState = dataValue(value, 'supplies');
    if (!plainRecord(supplyState)) return false;
    for (let index = 0; index < SUPPLY_SLOTS.length; index++) {
      const slot = SUPPLY_SLOTS[index];
      if (!readSupplyConfig(dataValue(supplyState, slot), slot).ok) {
        return false;
      }
    }
    return true;
  }

  function inspect(model) {
    const copied = cloneStrict(model, new Set());
    if (!copied.ok || !plainRecord(copied.value)) return null;
    if (!probeModelCloneCapability(model)) return null;
    const state = copied.value;
    const player = dataValue(state, 'player');
    const combat = dataValue(player, 'combat');
    const techniquesState = dataValue(player, 'techniques');
    const known = dataValue(techniquesState, 'known');
    const inventory = dataValue(player, 'inventory');
    const systems = dataValue(state, 'systems');
    const combatSystem = dataValue(systems, 'combat');
    const session = dataValue(combatSystem, 'session');
    const loadouts = strictArrayValues(dataValue(combat, 'loadouts'));
    if (!plainRecord(player) || !plainRecord(combat) ||
        !plainRecord(techniquesState) || !plainRecord(known) ||
        !validateInventory(inventory) || !plainRecord(systems) ||
        !plainRecord(combatSystem) ||
        (session !== null && !plainRecord(session)) ||
        !loadouts || loadouts.length < 1 ||
        loadouts.length > MAX_LOADOUTS) {
      return null;
    }
    const ids = {};
    const names = {};
    for (let index = 0; index < loadouts.length; index++) {
      const loadout = loadouts[index];
      const id = dataValue(loadout, 'id');
      const name = dataValue(loadout, 'name');
      const seenTechniques = {};
      if (!validateLoadout(loadout, known, seenTechniques, inventory) ||
          own(ids, id) || own(names, name)) {
        return null;
      }
      define(ids, id, index);
      define(names, name, true);
    }
    const activeLoadoutId = dataValue(combat, 'activeLoadoutId');
    const nextLoadoutId = dataValue(combat, 'nextLoadoutId');
    if (typeof activeLoadoutId !== 'string' ||
        !own(ids, activeLoadoutId) ||
        !safeInteger(nextLoadoutId, 2)) {
      return null;
    }
    if (session !== null) {
      const sessionLoadoutId = dataValue(session, 'loadoutId');
      if (typeof sessionLoadoutId !== 'string' ||
          !own(ids, sessionLoadoutId)) {
        return null;
      }
    }
    combat.loadouts = loadouts;
    const referenced = referencedEquipment(loadouts);
    const referencedIds = Object.keys(referenced);
    for (let index = 0; index < referencedIds.length; index++) {
      if (usesInstanceEquipment(inventory)) {
        if (!equipmentInstance(inventory, referencedIds[index])) return null;
      } else if (inventoryCount(inventory, referencedIds[index]) < 1) {
        return null;
      }
    }
    return {
      state: state,
      combat: combat,
      inventory: inventory,
      known: known,
      loadouts: loadouts,
      ids: ids,
      names: names,
      session: session
    };
  }

  function referencedEquipment(loadouts) {
    const result = {};
    for (let index = 0; index < loadouts.length; index++) {
      const slots = dataValue(loadouts[index], 'equipment');
      const slotNames = own(slots, 'armor')
        ? ['weapon', 'armor', 'accessory']
        : EQUIPMENT_SLOTS;
      for (let slotIndex = 0;
        slotIndex < slotNames.length;
        slotIndex++) {
        const instanceId = dataValue(slots, slotNames[slotIndex]);
        if (typeof instanceId === 'string') {
          define(result, instanceId, true);
        }
      }
    }
    return result;
  }

  function callAvailable(inventory, itemId) {
    if (typeof availableQuantity !== 'function') {
      return { ok: false, quantity: 0 };
    }
    try {
      const quantity = availableQuantity(inventory, itemId);
      return {
        ok: safeInteger(quantity, 0),
        quantity: safeInteger(quantity, 0) ? quantity : 0
      };
    } catch (error) {
      return { ok: false, quantity: 0 };
    }
  }

  function callInventory(operation, inventory, itemId, quantity) {
    if (typeof operation !== 'function') return { ok: false, value: null };
    try {
      const result = operation(
        inventory,
        itemId,
        quantity,
        'equipment'
      );
      const value = dataValue(result, 'value');
      return plainRecord(result) &&
        dataValue(result, 'ok') === true &&
        plainRecord(value) &&
        validateInventory(value)
        ? { ok: true, value: value }
        : { ok: false, value: null };
    } catch (error) {
      return { ok: false, value: null };
    }
  }

  function reconcileBindings(parts) {
    if (usesInstanceEquipment(parts.inventory)) {
      return { ok: true, code: 'ok' };
    }
    const desired = referencedEquipment(parts.loadouts);
    let inventory = parts.inventory;
    const currentBindings = dataValue(inventory, 'bindings');
    const union = {};
    Object.keys(desired).forEach(function (itemId) {
      define(union, itemId, true);
    });
    Object.keys(currentBindings).forEach(function (itemId) {
      if (bindingCount(inventory, itemId, 'equipment') > 0) {
        define(union, itemId, true);
      }
    });
    const itemIds = Object.keys(union).sort();
    for (let index = 0; index < itemIds.length; index++) {
      const itemId = itemIds[index];
      const current = bindingCount(inventory, itemId, 'equipment');
      const wanted = own(desired, itemId) ? 1 : 0;
      if (current <= wanted) continue;
      const out = callInventory(
        unbindInventory,
        inventory,
        itemId,
        current - wanted
      );
      if (!out.ok) return { ok: false, code: 'inventory_unbind_failed' };
      inventory = out.value;
    }
    for (let index = 0; index < itemIds.length; index++) {
      const itemId = itemIds[index];
      const current = bindingCount(inventory, itemId, 'equipment');
      const wanted = own(desired, itemId) ? 1 : 0;
      if (current >= wanted) continue;
      const out = callInventory(
        bindInventory,
        inventory,
        itemId,
        wanted - current
      );
      if (!out.ok) return { ok: false, code: 'inventory_bind_failed' };
      inventory = out.value;
    }
    delete inventory.equipment;
    parts.state.player.inventory = inventory;
    parts.inventory = inventory;
    return { ok: true, code: 'ok' };
  }

  function success(state, result) {
    return {
      ok: true,
      code: 'ok',
      state: state,
      result: result == null ? null : result
    };
  }

  function failure(code, model) {
    return { ok: false, code: code, state: model, result: null };
  }

  function prepare(model) {
    const parts = inspect(model);
    return parts || null;
  }

  function find(parts, loadoutId) {
    return typeof loadoutId === 'string' && own(parts.ids, loadoutId)
      ? {
        index: parts.ids[loadoutId],
        value: parts.loadouts[parts.ids[loadoutId]]
      }
      : null;
  }

  function locked(parts, loadoutId) {
    return !!parts.session &&
      dataValue(parts.session, 'loadoutId') === loadoutId;
  }

  function finish(parts, model, result) {
    const reconciled = reconcileBindings(parts);
    return reconciled.ok
      ? success(parts.state, result)
      : failure(reconciled.code, model);
  }

  function create(model, name) {
    const parts = prepare(model);
    if (!parts) return failure('invalid_state', model);
    if (parts.loadouts.length >= MAX_LOADOUTS) {
      return failure('loadout_limit', model);
    }
    const clean = cleanName(name);
    if (!clean) return failure('invalid_name', model);
    if (own(parts.names, clean)) return failure('duplicate_name', model);
    let number = parts.combat.nextLoadoutId;
    let id = 'loadout-' + number;
    while (own(parts.ids, id)) {
      number++;
      if (!Number.isSafeInteger(number)) {
        return failure('loadout_id_exhausted', model);
      }
      id = 'loadout-' + number;
    }
    if (number >= Number.MAX_SAFE_INTEGER) {
      return failure('loadout_id_exhausted', model);
    }
    const loadout = {
      id: id,
      name: clean,
      equipment: usesInstanceEquipment(parts.inventory)
        ? {
            weapon: null,
            head: null,
            robe: null,
            bracer: null,
            belt: null,
            boots: null,
            accessory: null,
            artifact: null
          }
        : { weapon: null, armor: null, accessory: null },
      activeTechniques: [
        { techniqueId: null, condition: { type: 'always' } },
        { techniqueId: null, condition: { type: 'always' } },
        { techniqueId: null, condition: { type: 'always' } }
      ],
      passiveTechniques: [null, null, null, null, null],
      supplies: {
        food: {
          itemId: null,
          triggerRatio: 0.5,
          stopWhenEmpty: false
        },
        pill: {
          itemId: null,
          triggerRatio: 0.3,
          stopWhenEmpty: false
        },
        talisman: {
          itemId: null,
          useAt: 'enemy_start',
          stopWhenEmpty: false
        }
      }
    };
    parts.loadouts.push(loadout);
    parts.combat.nextLoadoutId = number + 1;
    return finish(parts, model, { id: id, name: clean });
  }

  function rename(model, loadoutId, name) {
    const parts = prepare(model);
    if (!parts) return failure('invalid_state', model);
    const current = find(parts, loadoutId);
    if (!current) return failure('loadout_not_found', model);
    if (locked(parts, loadoutId)) return failure('combat_active', model);
    const clean = cleanName(name);
    if (!clean) return failure('invalid_name', model);
    if (clean !== current.value.name && own(parts.names, clean)) {
      return failure('duplicate_name', model);
    }
    current.value.name = clean;
    return finish(parts, model, { id: loadoutId, name: clean });
  }

  function remove(model, loadoutId) {
    const parts = prepare(model);
    if (!parts) return failure('invalid_state', model);
    const current = find(parts, loadoutId);
    if (!current) return failure('loadout_not_found', model);
    if (parts.loadouts.length === 1) return failure('last_loadout', model);
    if (locked(parts, loadoutId)) return failure('combat_active', model);
    parts.loadouts.splice(current.index, 1);
    if (parts.combat.activeLoadoutId === loadoutId) {
      parts.combat.activeLoadoutId = parts.loadouts[0].id;
    }
    return finish(parts, model, { id: loadoutId });
  }

  function setActive(model, loadoutId) {
    const parts = prepare(model);
    if (!parts) return failure('invalid_state', model);
    if (!find(parts, loadoutId)) return failure('loadout_not_found', model);
    parts.combat.activeLoadoutId = loadoutId;
    return finish(parts, model, { id: loadoutId });
  }

  function setEquipment(model, loadoutId, slot, instanceId) {
    const parts = prepare(model);
    if (!parts) return failure('invalid_state', model);
    const current = find(parts, loadoutId);
    if (!current) return failure('loadout_not_found', model);
    const instanceMode = usesInstanceEquipment(parts.inventory);
    const allowedSlots = instanceMode
      ? EQUIPMENT_SLOTS
      : ['weapon', 'armor', 'accessory'];
    if (allowedSlots.indexOf(slot) < 0) {
      return failure('invalid_equipment_slot', model);
    }
    if (instanceMode &&
        EquipmentContent.SLOT_META[slot].unlockRealmOrder >
        unlockedEquipmentOrder(parts.state)) {
      return failure('equipment_slot_locked', model);
    }
    if (!instanceMode) {
      if (instanceId !== null &&
          (
            typeof instanceId !== 'string' ||
            !own(equipment, instanceId) ||
            equipment[instanceId].slot !== slot
          )) {
        return failure('equipment_type_mismatch', model);
      }
      const oldReferences = referencedEquipment(parts.loadouts);
      const previous = current.value.equipment[slot];
      if (instanceId !== null && instanceId !== previous &&
          !own(oldReferences, instanceId)) {
        const available = callAvailable(parts.inventory, instanceId);
        if (!available.ok || available.quantity < 1) {
          return failure('item_unavailable', model);
        }
      }
      current.value.equipment[slot] = instanceId;
      return finish(parts, model, {
        loadoutId: loadoutId,
        slot: slot,
        itemId: instanceId
      });
    }
    const instance = instanceId === null
      ? null
      : equipmentInstance(parts.inventory, instanceId);
    const base = instance
      ? EquipmentContent.getBase(instance.baseId)
      : null;
    if (instanceId !== null &&
        (typeof instanceId !== 'string' || !instance || !base)) {
      return failure('equipment_type_mismatch', model);
    }
    if (instanceId !== null && base.slot !== slot) {
      return failure('equipment_type_mismatch', model);
    }
    current.value.equipment[slot] = instanceId;
    return finish(parts, model, {
      loadoutId: loadoutId,
      slot: slot,
      itemId: instanceId,
      instanceId: instanceId
    });
  }

  function setSupply(model, loadoutId, slot, config) {
    const parts = prepare(model);
    if (!parts) return failure('invalid_state', model);
    const current = find(parts, loadoutId);
    if (!current) return failure('loadout_not_found', model);
    if (locked(parts, loadoutId)) return failure('combat_active', model);
    if (SUPPLY_SLOTS.indexOf(slot) < 0) {
      return failure('invalid_supply_slot', model);
    }
    const checked = readSupplyConfig(config, slot);
    if (!checked.ok) return failure(checked.code, model);
    const previous = current.value.supplies[slot].itemId;
    if (checked.value.itemId !== null &&
        checked.value.itemId !== previous) {
      const available = callAvailable(
        parts.inventory,
        checked.value.itemId
      );
      if (!available.ok || available.quantity < 1) {
        return failure('item_unavailable', model);
      }
    }
    current.value.supplies[slot] = checked.value;
    return finish(parts, model, {
      loadoutId: loadoutId,
      slot: slot,
      config: checked.value
    });
  }

  function techniqueChecked(parts, techniqueId, kind) {
    if (techniqueId === null) return { ok: true, value: null };
    if (typeof techniqueId !== 'string' || !own(techniques, techniqueId) ||
        techniques[techniqueId].kind !== kind) {
      return { ok: false, code: 'technique_type_mismatch' };
    }
    if (!own(parts.known, techniqueId) ||
        !validKnownRecord(dataValue(parts.known, techniqueId))) {
      return { ok: false, code: 'technique_not_learned' };
    }
    return { ok: true, value: techniqueId };
  }

  function appearsElsewhere(loadout, techniqueId, kind, slotIndex) {
    if (techniqueId === null) return false;
    if (kind === 'active') {
      return loadout.activeTechniques.some(function (slot, index) {
        return index !== slotIndex && slot.techniqueId === techniqueId;
      });
    }
    return loadout.passiveTechniques.some(function (value, index) {
      return index !== slotIndex && value === techniqueId;
    });
  }

  function setActiveTechnique(
    model,
    loadoutId,
    slotIndex,
    techniqueId,
    condition
  ) {
    const parts = prepare(model);
    if (!parts) return failure('invalid_state', model);
    const current = find(parts, loadoutId);
    if (!current) return failure('loadout_not_found', model);
    if (locked(parts, loadoutId)) return failure('combat_active', model);
    if (!safeInteger(slotIndex, 0) || slotIndex >= ACTIVE_SLOT_COUNT) {
      return failure('invalid_slot_index', model);
    }
    const checked = techniqueChecked(parts, techniqueId, 'active');
    if (!checked.ok) return failure(checked.code, model);
    const checkedCondition = readCondition(condition);
    if (!checkedCondition) return failure('invalid_condition', model);
    if (appearsElsewhere(
      current.value,
      checked.value,
      'active',
      slotIndex
    )) {
      return failure('duplicate_technique', model);
    }
    current.value.activeTechniques[slotIndex] = {
      techniqueId: checked.value,
      condition: checkedCondition
    };
    return finish(parts, model, {
      loadoutId: loadoutId,
      slotIndex: slotIndex,
      techniqueId: checked.value
    });
  }

  function setPassiveTechnique(
    model,
    loadoutId,
    slotIndex,
    techniqueId
  ) {
    const parts = prepare(model);
    if (!parts) return failure('invalid_state', model);
    const current = find(parts, loadoutId);
    if (!current) return failure('loadout_not_found', model);
    if (locked(parts, loadoutId)) return failure('combat_active', model);
    if (!safeInteger(slotIndex, 0) || slotIndex >= PASSIVE_SLOT_COUNT) {
      return failure('invalid_slot_index', model);
    }
    const checked = techniqueChecked(parts, techniqueId, 'passive');
    if (!checked.ok) return failure(checked.code, model);
    if (appearsElsewhere(
      current.value,
      checked.value,
      'passive',
      slotIndex
    )) {
      return failure('duplicate_technique', model);
    }
    current.value.passiveTechniques[slotIndex] = checked.value;
    return finish(parts, model, {
      loadoutId: loadoutId,
      slotIndex: slotIndex,
      techniqueId: checked.value
    });
  }

  function supplyReferences(parts, itemId) {
    for (let index = 0; index < parts.loadouts.length; index++) {
      const supplyState = parts.loadouts[index].supplies;
      for (let slotIndex = 0;
        slotIndex < SUPPLY_SLOTS.length;
        slotIndex++) {
        if (supplyState[SUPPLY_SLOTS[slotIndex]].itemId === itemId) {
          return true;
        }
      }
    }
    return false;
  }

  function inspectSupplyLoadouts(model) {
    const copied = cloneStrict(model, new Set());
    if (!copied.ok || !plainRecord(copied.value)) return null;
    if (!probeModelCloneCapability(model)) return null;
    const player = dataValue(copied.value, 'player');
    const combat = dataValue(player, 'combat');
    const loadouts = strictArrayValues(dataValue(combat, 'loadouts'));
    if (!plainRecord(player) || !plainRecord(combat) ||
        !loadouts || loadouts.length < 1 ||
        loadouts.length > MAX_LOADOUTS) {
      return null;
    }
    const ids = {};
    for (let index = 0; index < loadouts.length; index++) {
      const loadout = loadouts[index];
      const id = dataValue(loadout, 'id');
      const supplyState = dataValue(loadout, 'supplies');
      if (!plainRecord(loadout) ||
          typeof id !== 'string' || id.trim().length === 0 ||
          own(ids, id) || !plainRecord(supplyState)) {
        return null;
      }
      define(ids, id, true);
      for (let slotIndex = 0;
        slotIndex < SUPPLY_SLOTS.length;
        slotIndex++) {
        const slot = SUPPLY_SLOTS[slotIndex];
        if (!readSupplyConfig(dataValue(supplyState, slot), slot).ok) {
          return null;
        }
      }
    }
    return loadouts;
  }

  function minimumSellRemainder(model, itemId) {
    if (typeof itemId !== 'string') return Number.MAX_SAFE_INTEGER;
    const loadouts = inspectSupplyLoadouts(model);
    if (!loadouts) return Number.MAX_SAFE_INTEGER;
    if (!own(supplies, itemId)) return 0;
    return supplyReferences({ loadouts: loadouts }, itemId) ? 1 : 0;
  }

  function safeAvailable(inventory, itemId) {
    const out = callAvailable(inventory, itemId);
    return out.ok ? out.quantity : 0;
  }

  function emptyQuery() {
    return deepFreeze({
      activeLoadoutId: null,
      activeSessionLoadoutId: null,
      maxLoadouts: MAX_LOADOUTS,
      canCreate: false,
      tabs: [],
      loadouts: []
    });
  }

  function unlockedEquipmentOrder(state) {
    const player = dataValue(state, 'player');
    const breakthrough = dataValue(player, 'breakthrough');
    const realmId = dataValue(breakthrough, 'realmId');
    if (typeof realmId !== 'string') return 0;
    if (/^qi-[1-9]$/.test(realmId)) return 1;
    if (realmId === 'foundation') return 2;
    if (realmId === 'gold-core') return 3;
    return [
      'nascent-soul',
      'spirit-transformation',
      'void-refining',
      'body-integration',
      'mahayana',
      'ascension'
    ].indexOf(realmId) >= 0 ? 4 : 0;
  }

  function query(model) {
    const parts = prepare(model);
    if (!parts) return emptyQuery();
    const sessionLoadoutId = parts.session &&
      typeof dataValue(parts.session, 'loadoutId') === 'string'
      ? dataValue(parts.session, 'loadoutId')
      : null;
    const tabs = parts.loadouts.map(function (loadout) {
      return {
        id: loadout.id,
        name: loadout.name,
        active: loadout.id === parts.combat.activeLoadoutId,
        editingLocked: loadout.id === sessionLoadoutId
      };
    });
    const rows = parts.loadouts.map(function (loadout) {
      const instanceMode = !!EquipmentContent && !!Equipment &&
        usesInstanceEquipment(parts.inventory);
      const querySlots = instanceMode
        ? EQUIPMENT_SLOTS
        : ['weapon', 'armor', 'accessory'];
      const equipmentRows = querySlots.map(function (slot) {
        const instanceId = loadout.equipment[slot];
        if (!instanceMode) {
          const legacy = instanceId ? equipment[instanceId] : null;
          return {
            slot: slot,
            itemId: instanceId,
            name: legacy ? legacy.name : null,
            stats: legacy
              ? cloneStrict(legacy.stats, new Set()).value
              : {},
            owned: instanceId
              ? inventoryCount(parts.inventory, instanceId)
              : 0,
            available: instanceId
              ? safeAvailable(parts.inventory, instanceId)
              : 0
          };
        }
        const instance = instanceId
          ? equipmentInstance(parts.inventory, instanceId)
          : null;
        const definition = instance ? Equipment.resolve(instance) : null;
        return {
          slot: slot,
          instanceId: instanceId,
          itemId: instanceId,
          name: definition ? definition.name : null,
          stats: definition ? cloneStrict(definition.stats, new Set()).value : {},
          quality: definition ? definition.quality : null,
          enhancementLevel: definition
            ? definition.enhancementLevel
            : 0,
          iconSrc50: definition ? definition.iconSrc50 : null,
          iconSrc100: definition ? definition.iconSrc100 : null,
          affixes: definition
            ? cloneStrict(definition.affixes, new Set()).value
            : [],
          unlocked: !!(
            EquipmentContent &&
            EquipmentContent.SLOT_META &&
            EquipmentContent.SLOT_META[slot] &&
            EquipmentContent.SLOT_META[slot].unlockRealmOrder <=
              unlockedEquipmentOrder(parts.state)
          ),
          owned: instanceId ? 1 : 0,
          available: instanceId ? 1 : 0
        };
      });
      const activeRows = loadout.activeTechniques.map(function (
        slot,
        index
      ) {
        const definition = slot.techniqueId
          ? techniques[slot.techniqueId]
          : null;
        return {
          slotIndex: index,
          priority: index + 1,
          techniqueId: slot.techniqueId,
          name: definition ? definition.name : null,
          condition: cloneStrict(slot.condition, new Set()).value
        };
      });
      const passiveRows = loadout.passiveTechniques.map(function (
        techniqueId,
        index
      ) {
        const definition = techniqueId ? techniques[techniqueId] : null;
        return {
          slotIndex: index,
          techniqueId: techniqueId,
          name: definition ? definition.name : null
        };
      });
      const supplyRows = SUPPLY_SLOTS.map(function (slot) {
        const config = loadout.supplies[slot];
        const itemId = config.itemId;
        return {
          slot: slot,
          itemId: itemId,
          config: cloneStrict(config, new Set()).value,
          owned: itemId ? inventoryCount(parts.inventory, itemId) : 0,
          available: itemId
            ? safeAvailable(parts.inventory, itemId)
            : 0,
          minimumSellRemainder: itemId &&
            supplyReferences(parts, itemId)
            ? 1
            : 0
        };
      });
      return {
        id: loadout.id,
        name: loadout.name,
        active: loadout.id === parts.combat.activeLoadoutId,
        editingLocked: loadout.id === sessionLoadoutId,
        equipment: equipmentRows,
        activeTechniques: activeRows,
        passiveTechniques: passiveRows,
        supplies: supplyRows
      };
    });
    return deepFreeze({
      activeLoadoutId: parts.combat.activeLoadoutId,
      activeSessionLoadoutId: sessionLoadoutId,
      maxLoadouts: MAX_LOADOUTS,
      canCreate: parts.loadouts.length < MAX_LOADOUTS,
      tabs: tabs,
      loadouts: rows
    });
  }

  return Object.freeze({
    create: create,
    rename: rename,
    remove: remove,
    setActive: setActive,
    setEquipment: setEquipment,
    setSupply: setSupply,
    setActiveTechnique: setActiveTechnique,
    setPassiveTechnique: setPassiveTechnique,
    minimumSellRemainder: minimumSellRemainder,
    query: query
  });
});
