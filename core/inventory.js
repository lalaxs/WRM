(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../content/items.js'),
      require('./equipment.js')
    );
  } else if (root) {
    root.Inventory = factory(root.ItemContent, root.Equipment);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  ItemContent,
  Equipment
) {
  'use strict';

  const DEFAULT_CAPACITY = 40;
  const BINDING_REASONS = Object.freeze([
    'equipment', 'task', 'formation'
  ]);
  const CAPACITY_SOURCES = Object.freeze([
    'shop', 'achievement', 'task'
  ]);
  const QUERY_CATEGORIES = Object.freeze([
    'all', 'material', 'equipment', 'consumable', 'technique', 'quest'
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

  function isRecord(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      if (prototype === null) return true;
      if (Object.getPrototypeOf(prototype) !== null) return false;
      const constructor = own(prototype, 'constructor')
        ? prototype.constructor
        : null;
      return typeof constructor === 'function' &&
        Function.prototype.toString.call(constructor) ===
          Function.prototype.toString.call(Object);
    } catch (error) {
      return false;
    }
  }

  function dataValue(record, key, fallback) {
    if (!isRecord(record) || !own(record, key)) return fallback;
    try {
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      return descriptor && own(descriptor, 'value')
        ? descriptor.value
        : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function safeNonNegativeInteger(value, fallback) {
    return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
  }

  function knownItem(itemId) {
    return typeof itemId === 'string' &&
      !!ItemContent &&
      isRecord(ItemContent.ITEMS) &&
      own(ItemContent.ITEMS, itemId)
      ? ItemContent.ITEMS[itemId]
      : null;
  }

  function cloneCapacityGrants(raw) {
    const grants = {};
    CAPACITY_SOURCES.forEach(function (source) {
      define(
        grants,
        source,
        safeNonNegativeInteger(dataValue(raw, source, 0), 0)
      );
    });
    return grants;
  }

  function cloneStacks(raw) {
    const stacks = {};
    if (!isRecord(raw)) return stacks;
    Object.keys(raw).forEach(function (itemId) {
      const descriptor = Object.getOwnPropertyDescriptor(raw, itemId);
      if (!descriptor || !own(descriptor, 'value')) return;
      const quantity = descriptor.value;
      if (!knownItem(itemId) ||
          !Number.isSafeInteger(quantity) ||
          quantity <= 0) {
        return;
      }
      define(stacks, itemId, quantity);
    });
    return stacks;
  }

  function cloneBindings(raw, stacks) {
    const bindings = {};
    if (!isRecord(raw)) return bindings;
    Object.keys(raw).forEach(function (itemId) {
      if (!own(stacks, itemId)) return;
      const descriptor = Object.getOwnPropertyDescriptor(raw, itemId);
      if (!descriptor || !own(descriptor, 'value') ||
          !isRecord(descriptor.value)) {
        return;
      }
      const source = descriptor.value;
      const record = {};
      let total = 0;
      BINDING_REASONS.forEach(function (reason) {
        const requested = safeNonNegativeInteger(
          dataValue(source, reason, 0),
          0
        );
        const quantity = Math.min(
          requested,
          Math.max(0, stacks[itemId] - total)
        );
        define(record, reason, quantity);
        total += quantity;
      });
      if (total > 0) define(bindings, itemId, record);
    });
    return bindings;
  }

  function cloneEquipment(raw) {
    const source = isRecord(raw) ? raw : {};
    const rawInstances = dataValue(source, 'instances', []);
    const instances = [];
    const ids = {};
    let highestNumericId = 0;
    if (Array.isArray(rawInstances) && Equipment) {
      rawInstances.forEach(function (rawInstance) {
        const instance = Equipment.normalizeInstance(rawInstance);
        if (!instance || own(ids, instance.instanceId)) return;
        define(ids, instance.instanceId, true);
        instances.push(instance);
        const match = /^eq-(\d+)$/.exec(instance.instanceId);
        if (match) {
          highestNumericId = Math.max(
            highestNumericId,
            safeNonNegativeInteger(Number(match[1]), 0)
          );
        }
      });
    }
    return {
      version: 1,
      nextInstanceId: Math.max(
        1,
        highestNumericId + 1,
        safeNonNegativeInteger(dataValue(source, 'nextInstanceId', 1), 1)
      ),
      instances: instances
    };
  }

  function normalizeInventory(inventory) {
    const source = isRecord(inventory) ? inventory : {};
    const stacks = cloneStacks(dataValue(source, 'stacks', {}));
    return {
      capacity: safeNonNegativeInteger(
        dataValue(source, 'capacity', DEFAULT_CAPACITY),
        DEFAULT_CAPACITY
      ),
      capacityGrants: cloneCapacityGrants(
        dataValue(source, 'capacityGrants', {})
      ),
      stacks: stacks,
      bindings: cloneBindings(
        dataValue(source, 'bindings', {}),
        stacks
      ),
      equipment: cloneEquipment(dataValue(source, 'equipment', {}))
    };
  }

  function bindingTotal(inventory, itemId) {
    const bindings = inventory.bindings[itemId];
    if (!isRecord(bindings)) return 0;
    return BINDING_REASONS.reduce(function (total, reason) {
      return total + safeNonNegativeInteger(
        dataValue(bindings, reason, 0),
        0
      );
    }, 0);
  }

  function occupiedSlots(inventory) {
    const value = normalizeInventory(inventory);
    return Object.keys(value.stacks).length +
      value.equipment.instances.length;
  }

  function availableQuantity(inventory, itemId) {
    if (!knownItem(itemId)) return 0;
    const value = normalizeInventory(inventory);
    const owned = value.stacks[itemId] || 0;
    return Math.max(0, owned - bindingTotal(value, itemId));
  }

  function failure(code, original) {
    return { ok: false, code: code, value: original };
  }

  function success(value) {
    return { ok: true, code: 'ok', value: value };
  }

  function validateDelta(delta) {
    if (!delta || typeof delta !== 'object' || Array.isArray(delta)) {
      return { ok: false, code: 'invalid_delta', entries: [] };
    }
    let prototype;
    let itemIds;
    try {
      prototype = Object.getPrototypeOf(delta);
      itemIds = Reflect.ownKeys(delta);
    } catch (error) {
      return { ok: false, code: 'invalid_delta', entries: [] };
    }
    if (prototype !== null && prototype !== Object.prototype) {
      return { ok: false, code: 'invalid_delta', entries: [] };
    }
    const entries = [];
    for (let index = 0; index < itemIds.length; index++) {
      const itemId = itemIds[index];
      if (typeof itemId !== 'string') {
        return { ok: false, code: 'invalid_delta', entries: [] };
      }
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(delta, itemId);
      } catch (error) {
        return { ok: false, code: 'invalid_delta', entries: [] };
      }
      if (!descriptor || descriptor.enumerable !== true ||
          !own(descriptor, 'value')) {
        return { ok: false, code: 'invalid_delta', entries: [] };
      }
      if (!knownItem(itemId)) {
        return { ok: false, code: 'unknown_item', entries: [] };
      }
      if (!Number.isSafeInteger(descriptor.value)) {
        return { ok: false, code: 'invalid_delta', entries: [] };
      }
      entries.push({ itemId: itemId, quantity: descriptor.value });
    }
    return { ok: true, code: 'ok', entries: entries };
  }

  function evaluate(inventory, delta) {
    const original = normalizeInventory(inventory);
    const checked = validateDelta(delta);
    if (!checked.ok) return failure(checked.code, original);

    for (let index = 0; index < checked.entries.length; index++) {
      const entry = checked.entries[index];
      if (entry.quantity >= 0) continue;
      const owned = original.stacks[entry.itemId] || 0;
      const required = -entry.quantity;
      if (required > owned) {
        return failure('insufficient_items', original);
      }
      if (required >
          Math.max(0, owned - bindingTotal(original, entry.itemId))) {
        return failure('item_bound', original);
      }
    }

    const stacks = cloneStacks(original.stacks);
    for (let index = 0; index < checked.entries.length; index++) {
      const entry = checked.entries[index];
      if (entry.quantity >= 0) continue;
      const next = stacks[entry.itemId] + entry.quantity;
      if (next === 0) delete stacks[entry.itemId];
      else stacks[entry.itemId] = next;
    }
    for (let index = 0; index < checked.entries.length; index++) {
      const entry = checked.entries[index];
      if (entry.quantity <= 0) continue;
      const current = stacks[entry.itemId] || 0;
      const next = current + entry.quantity;
      if (!Number.isSafeInteger(next)) {
        return failure('invalid_delta', original);
      }
      define(stacks, entry.itemId, next);
    }

    if (Object.keys(stacks).length +
        original.equipment.instances.length > original.capacity) {
      return failure('inventory_full', original);
    }
    return success({
      capacity: original.capacity,
      capacityGrants: cloneCapacityGrants(original.capacityGrants),
      stacks: stacks,
      bindings: cloneBindings(original.bindings, stacks),
      equipment: cloneEquipment(original.equipment)
    });
  }

  function canApply(inventory, delta) {
    return evaluate(inventory, delta);
  }

  function apply(inventory, delta) {
    return evaluate(inventory, delta);
  }

  function validPositiveQuantity(quantity) {
    return Number.isSafeInteger(quantity) && quantity > 0;
  }

  function validBindingReason(reason) {
    return typeof reason === 'string' &&
      BINDING_REASONS.indexOf(reason) >= 0;
  }

  function bind(inventory, itemId, quantity, reason) {
    const original = normalizeInventory(inventory);
    if (!knownItem(itemId)) return failure('unknown_item', original);
    if (!validPositiveQuantity(quantity)) {
      return failure('invalid_quantity', original);
    }
    if (!validBindingReason(reason)) {
      return failure('invalid_binding_reason', original);
    }
    const owned = original.stacks[itemId] || 0;
    if (quantity > owned) {
      return failure('insufficient_items', original);
    }
    if (quantity >
        Math.max(0, owned - bindingTotal(original, itemId))) {
      return failure('item_bound', original);
    }

    const next = normalizeInventory(original);
    if (!own(next.bindings, itemId)) {
      define(next.bindings, itemId, {
        equipment: 0,
        task: 0,
        formation: 0
      });
    }
    const current = safeNonNegativeInteger(
      dataValue(next.bindings[itemId], reason, 0),
      0
    );
    define(next.bindings[itemId], reason, current + quantity);
    return success(next);
  }

  function unbind(inventory, itemId, quantity, reason) {
    const original = normalizeInventory(inventory);
    if (!knownItem(itemId)) return failure('unknown_item', original);
    if (!validPositiveQuantity(quantity)) {
      return failure('invalid_quantity', original);
    }
    if (!validBindingReason(reason)) {
      return failure('invalid_binding_reason', original);
    }
    const current = original.bindings[itemId]
      ? safeNonNegativeInteger(
        dataValue(original.bindings[itemId], reason, 0),
        0
      )
      : 0;
    if (quantity > current) {
      return failure('binding_underflow', original);
    }

    const next = normalizeInventory(original);
    const remaining = current - quantity;
    define(next.bindings[itemId], reason, remaining);
    if (bindingTotal(next, itemId) === 0) {
      delete next.bindings[itemId];
    }
    return success(next);
  }

  function sell(inventory, itemId, quantity) {
    const original = normalizeInventory(inventory);
    const item = knownItem(itemId);
    if (!item) return failure('unknown_item', original);
    if (!validPositiveQuantity(quantity)) {
      return failure('invalid_quantity', original);
    }
    if (!Number.isSafeInteger(item.sellValue) || item.sellValue <= 0) {
      return failure('unsaleable_item', original);
    }
    const owned = original.stacks[itemId] || 0;
    if (quantity > owned) {
      return failure('insufficient_items', original);
    }
    if (quantity >
        Math.max(0, owned - bindingTotal(original, itemId))) {
      return failure('item_bound', original);
    }
    const currency = item.sellValue * quantity;
    if (!Number.isSafeInteger(currency)) {
      return failure('invalid_quantity', original);
    }
    const delta = {};
    define(delta, itemId, -quantity);
    const result = apply(original, delta);
    if (!result.ok) return result;
    return {
      ok: true,
      code: 'ok',
      value: result.value,
      currency: currency
    };
  }

  function validCapacitySource(source) {
    return typeof source === 'string' &&
      CAPACITY_SOURCES.indexOf(source) >= 0;
  }

  function grantCapacity(inventory, amount, source) {
    const original = normalizeInventory(inventory);
    if (!validCapacitySource(source)) {
      return failure('invalid_capacity_source', original);
    }
    if (!validPositiveQuantity(amount)) {
      return failure('invalid_capacity_amount', original);
    }
    const currentGrant = original.capacityGrants[source];
    if (!Number.isSafeInteger(original.capacity + amount) ||
        !Number.isSafeInteger(currentGrant + amount)) {
      return failure('invalid_capacity_amount', original);
    }
    const next = normalizeInventory(original);
    next.capacity += amount;
    next.capacityGrants[source] += amount;
    return success(next);
  }

  function findEquipment(inventory, instanceId) {
    if (typeof instanceId !== 'string' || !instanceId) return null;
    const value = normalizeInventory(inventory);
    for (let index = 0; index < value.equipment.instances.length; index++) {
      const instance = value.equipment.instances[index];
      if (instance.instanceId === instanceId) return instance;
    }
    return null;
  }

  function nextEquipmentCounter(equipment, instanceId) {
    const match = /^eq-(\d+)$/.exec(instanceId);
    return match
      ? Math.max(equipment.nextInstanceId, Number(match[1]) + 1)
      : equipment.nextInstanceId;
  }

  function addEquipment(inventory, rawInstance) {
    const original = normalizeInventory(inventory);
    const instance = Equipment
      ? Equipment.normalizeInstance(rawInstance)
      : null;
    if (!instance) return failure('invalid_equipment', original);
    if (findEquipment(original, instance.instanceId)) {
      return failure('equipment_id_conflict', original);
    }
    if (occupiedSlots(original) >= original.capacity) {
      return failure('inventory_full', original);
    }
    const next = normalizeInventory(original);
    next.equipment.instances.push(instance);
    next.equipment.nextInstanceId = nextEquipmentCounter(
      next.equipment,
      instance.instanceId
    );
    return success(next);
  }

  function replaceEquipment(inventory, rawInstance) {
    const original = normalizeInventory(inventory);
    const instance = Equipment
      ? Equipment.normalizeInstance(rawInstance)
      : null;
    if (!instance) return failure('invalid_equipment', original);
    const index = original.equipment.instances.findIndex(function (candidate) {
      return candidate.instanceId === instance.instanceId;
    });
    if (index < 0) return failure('equipment_not_found', original);
    const next = normalizeInventory(original);
    next.equipment.instances[index] = instance;
    next.equipment.nextInstanceId = nextEquipmentCounter(
      next.equipment,
      instance.instanceId
    );
    return success(next);
  }

  function removeEquipment(inventory, instanceId) {
    const original = normalizeInventory(inventory);
    if (typeof instanceId !== 'string' || !instanceId) {
      return failure('equipment_not_found', original);
    }
    const index = original.equipment.instances.findIndex(function (candidate) {
      return candidate.instanceId === instanceId;
    });
    if (index < 0) return failure('equipment_not_found', original);
    const next = normalizeInventory(original);
    const removed = next.equipment.instances.splice(index, 1)[0];
    return {
      ok: true,
      code: 'ok',
      value: next,
      result: removed
    };
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

  function cleanSearch(value) {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    try {
      return trimmed.normalize('NFKC');
    } catch (error) {
      return trimmed;
    }
  }

  function query(inventory, options) {
    const value = normalizeInventory(inventory);
    const source = isRecord(options) ? options : {};
    const requestedCategory = dataValue(source, 'category', 'all');
    const selectedCategory = typeof requestedCategory === 'string' &&
      QUERY_CATEGORIES.indexOf(requestedCategory) >= 0
      ? requestedCategory
      : 'all';
    const search = cleanSearch(dataValue(source, 'search', ''));
    const needle = search.toLowerCase();
    const categoryOrder = {};
    QUERY_CATEGORIES.slice(1).forEach(function (category, index) {
      define(categoryOrder, category, index);
    });
    const registryOrder = {};
    const rows = [];

    Object.keys(ItemContent.ITEMS).forEach(function (itemId, index) {
      define(registryOrder, itemId, index);
      const quantity = value.stacks[itemId] || 0;
      if (quantity <= 0) return;
      const item = ItemContent.ITEMS[itemId];
      if (selectedCategory !== 'all' &&
          item.category !== selectedCategory) {
        return;
      }
      const searchTarget = cleanSearch(
        itemId + '\n' + (typeof item.name === 'string' ? item.name : '')
      ).toLowerCase();
      if (needle && searchTarget.indexOf(needle) < 0) return;
      const bound = bindingTotal(value, itemId);
      const row = {
        itemId: itemId,
        name: item.name,
        category: item.category,
        quantity: quantity,
        bound: bound,
        available: Math.max(0, quantity - bound),
        sellValue: Number.isSafeInteger(item.sellValue)
          ? item.sellValue
          : 0,
        icon: typeof item.icon === 'string' ? item.icon : '',
        description: typeof item.description === 'string'
          ? item.description
          : '',
        quality: typeof item.quality === 'string' ? item.quality : 'common'
      };
      ['iconSrc', 'iconSrc50', 'iconSrc100'].forEach(function (key) {
        if (typeof item[key] === 'string' && item[key]) row[key] = item[key];
      });
      rows.push(row);
    });

    value.equipment.instances.forEach(function (instance, index) {
      const item = Equipment ? Equipment.resolve(instance) : null;
      if (!item) return;
      if (selectedCategory !== 'all' &&
          selectedCategory !== 'equipment') {
        return;
      }
      const searchTarget = cleanSearch(
        item.baseId + '\n' + item.name + '\n' + item.baseName
      ).toLowerCase();
      if (needle && searchTarget.indexOf(needle) < 0) return;
      rows.push({
        instanceId: item.instanceId,
        itemId: item.baseId,
        name: item.name,
        category: 'equipment',
        quantity: 1,
        bound: 0,
        available: 1,
        sellValue: 0,
        icon: item.iconKey,
        iconSrc50: item.iconSrc50,
        iconSrc100: item.iconSrc100,
        description: item.affixes.map(function (affix) {
          return affix.text;
        }).join(' · '),
        quality: item.quality,
        slot: item.slot,
        enhancementLevel: item.enhancementLevel,
        favorite: item.favorite,
        equipmentOrder: index
      });
    });

    rows.sort(function (left, right) {
      const categoryDelta =
        categoryOrder[left.category] - categoryOrder[right.category];
      if (categoryDelta) return categoryDelta;
      if (left.instanceId || right.instanceId) {
        if (!left.instanceId) return -1;
        if (!right.instanceId) return 1;
        return left.equipmentOrder - right.equipmentOrder;
      }
      return registryOrder[left.itemId] - registryOrder[right.itemId];
    });

    rows.forEach(function (row) {
      if (own(row, 'equipmentOrder')) delete row.equipmentOrder;
    });
    const used = occupiedSlots(value);
    return deepFreeze({
      capacity: value.capacity,
      used: used,
      free: Math.max(0, value.capacity - used),
      categories: QUERY_CATEGORIES.slice(),
      selectedCategory: selectedCategory,
      search: search,
      items: rows
    });
  }

  return Object.freeze({
    occupiedSlots: occupiedSlots,
    availableQuantity: availableQuantity,
    canApply: canApply,
    apply: apply,
    bind: bind,
    unbind: unbind,
    sell: sell,
    grantCapacity: grantCapacity,
    findEquipment: findEquipment,
    addEquipment: addEquipment,
    replaceEquipment: replaceEquipment,
    removeEquipment: removeEquipment,
    query: query
  });
});
