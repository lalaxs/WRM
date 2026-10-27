(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../content/homestead.js'),
      require('./inventory.js')
    );
  } else if (root) {
    root.Formations = factory(
      root.HomesteadContent,
      root.Inventory
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  HomesteadContent,
  Inventory
) {
  'use strict';

  const EFFECT_KEYS = Object.freeze([
    'gatheringExtraYieldChance',
    'farmGrowthReduction',
    'fishRecoveryReduction',
    'craftingDurationReduction',
    'beastTrainingXpBonus'
  ]);
  const EFFECT_CAPS = Object.freeze({
    gatheringExtraYieldChance: 0.25,
    farmGrowthReduction: 0.40,
    fishRecoveryReduction: 0.40,
    craftingDurationReduction: 0.25,
    beastTrainingXpBonus: 0.50
  });
  const ACTION_KEYS = Object.freeze(['mainAction', 'current']);

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

  function plainRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }

  function dataValue(value, key) { return value && own(value, key) ? value[key] : undefined; }

  function dependencyDataValue(value, key) { return value ? value[key] : undefined; }

  function plainArray(value) { return Array.isArray(value); }

  function strictArrayValues(value) { return Array.isArray(value) ? value : null; }

  function snapshotDefinitions(content) {
    const raw = dependencyDataValue(content, 'FORMATIONS');
    if (!raw || typeof raw !== 'object' ||
        Array.isArray(raw)) {
      return Object.freeze({ order: Object.freeze([]), byId: Object.freeze({}) });
    }
    let keys;
    try {
      keys = Reflect.ownKeys(raw);
    } catch (error) {
      return Object.freeze({ order: Object.freeze([]), byId: Object.freeze({}) });
    }
    const order = [];
    const byId = {};
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (typeof key !== 'string') continue;
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(raw, key);
      } catch (error) {
        continue;
      }
      if (!descriptor || !own(descriptor, 'value') ||
          !plainRecord(descriptor.value)) {
        continue;
      }
      const source = descriptor.value;
      const id = dataValue(source, 'id');
      const itemId = dataValue(source, 'itemId');
      const name = dataValue(source, 'name');
      const effectText = dataValue(source, 'effectText');
      const effectSource = dataValue(source, 'effect');
      const effectKey = dataValue(effectSource, 'key');
      const effectValue = dataValue(effectSource, 'value');
      if (id !== key || typeof itemId !== 'string' ||
          typeof name !== 'string' || typeof effectText !== 'string' ||
          EFFECT_KEYS.indexOf(effectKey) < 0 ||
          typeof effectValue !== 'number' ||
          !Number.isFinite(effectValue) || effectValue < 0) {
        continue;
      }
      const definition = Object.freeze({
        id: id,
        itemId: itemId,
        name: name,
        effect: Object.freeze({
          key: effectKey,
          value: effectValue
        }),
        effectText: effectText
      });
      order.push(id);
      define(byId, id, definition);
    }
    return Object.freeze({
      order: Object.freeze(order),
      byId: Object.freeze(byId)
    });
  }

  const definitionSnapshot = snapshotDefinitions(HomesteadContent);
  const formationOrder = definitionSnapshot.order;
  const formations = definitionSnapshot.byId;
  const availableQuantity = dependencyDataValue(
    Inventory,
    'availableQuantity'
  );
  const bindInventory = dependencyDataValue(Inventory, 'bind');
  const unbindInventory = dependencyDataValue(Inventory, 'unbind');

  function cloneStrict(value) { return { ok: true, value: value === undefined ? undefined : JSON.parse(JSON.stringify(value)) }; }

  function cloneModel(model) { return plainRecord(model) ? cloneStrict(model) : { ok: false }; }

  function formationState(model) {
    const systems = dataValue(model, 'systems');
    const homestead = dataValue(systems, 'homestead');
    const value = dataValue(homestead, 'formations');
    const slots = strictArrayValues(dataValue(value, 'slots'));
    const owned = strictArrayValues(dataValue(value, 'owned'));
    if (!plainRecord(value) || !slots || !owned) return null;
    for (let index = 0; index < slots.length; index++) {
      if (slots[index] !== null &&
          (typeof slots[index] !== 'string' ||
          !own(formations, slots[index]))) {
        return null;
      }
    }
    for (let index = 0; index < owned.length; index++) {
      if (typeof owned[index] !== 'string') return null;
    }
    return { value: value, slots: slots, owned: owned };
  }

  function inventoryState(model) {
    const player = dataValue(model, 'player');
    const inventory = dataValue(player, 'inventory');
    return plainRecord(inventory) ? inventory : null;
  }

  function safeInventoryCount(record, key) {
    const value = dataValue(record, key);
    if (typeof value === 'undefined') {
      return { ok: true, value: 0 };
    }
    return Number.isSafeInteger(value) && value >= 0
      ? { ok: true, value: value }
      : { ok: false, value: 0 };
  }

  function formationInventoryConsistent(current, inventory) {
    if (!current || !plainRecord(inventory)) return false;
    const stacks = dataValue(inventory, 'stacks');
    const bindings = dataValue(inventory, 'bindings');
    if (!plainRecord(stacks) || !plainRecord(bindings)) return false;

    const slotCounts = {};
    formationOrder.forEach(function (formationId) {
      define(slotCounts, formationId, 0);
    });
    for (let index = 0; index < current.slots.length; index++) {
      const formationId = current.slots[index];
      if (formationId === null) continue;
      if (typeof formationId !== 'string' ||
          !own(formations, formationId)) {
        return false;
      }
      slotCounts[formationId]++;
    }

    for (let index = 0; index < formationOrder.length; index++) {
      const formationId = formationOrder[index];
      const itemId = formations[formationId].itemId;
      const owned = safeInventoryCount(stacks, itemId);
      if (!owned.ok) return false;
      const record = dataValue(bindings, itemId);
      let equipment = { ok: true, value: 0 };
      let task = { ok: true, value: 0 };
      let formation = { ok: true, value: 0 };
      if (typeof record !== 'undefined') {
        if (!plainRecord(record)) return false;
        equipment = safeInventoryCount(record, 'equipment');
        task = safeInventoryCount(record, 'task');
        formation = safeInventoryCount(record, 'formation');
      }
      if (!equipment.ok || !task.ok || !formation.ok ||
          equipment.value + task.value + formation.value > owned.value ||
          formation.value !== slotCounts[formationId]) {
        return false;
      }
    }
    return true;
  }

  function success(state, code) {
    return { ok: true, code: code || 'ok', state: state };
  }

  function failure(code, state) {
    return { ok: false, code: code, state: state };
  }

  function recordCrafted(model, formationId) {
    if (typeof formationId !== 'string' || !own(formations, formationId)) {
      return failure('invalid_formation', model);
    }
    const cloned = cloneModel(model);
    if (!cloned.ok) return failure('invalid_state', model);
    const current = formationState(cloned.value);
    if (!current) return failure('invalid_state', model);
    if (current.owned.indexOf(formationId) >= 0) {
      return success(cloned.value, 'already_recorded');
    }
    current.value.owned.push(formationId);
    return success(cloned.value);
  }

  function validSlotIndex(slotIndex) {
    return Number.isSafeInteger(slotIndex) && slotIndex >= 0;
  }

  function callAvailable(inventory, itemId) {
    if (typeof availableQuantity !== 'function') {
      return { ok: false, quantity: 0 };
    }
    try {
      const quantity = availableQuantity(inventory, itemId);
      return {
        ok: Number.isSafeInteger(quantity) && quantity >= 0,
        quantity: Number.isSafeInteger(quantity) && quantity >= 0
          ? quantity
          : 0
      };
    } catch (error) {
      return { ok: false, quantity: 0 };
    }
  }

  function callInventory(operation, inventory, itemId) {
    if (typeof operation !== 'function') return { ok: false, value: null };
    try {
      const result = operation(inventory, itemId, 1, 'formation');
      return plainRecord(result) &&
        dataValue(result, 'ok') === true &&
        plainRecord(dataValue(result, 'value'))
        ? { ok: true, value: dataValue(result, 'value') }
        : { ok: false, value: null };
    } catch (error) {
      return { ok: false, value: null };
    }
  }

  function equip(model, slotIndex, formationId) {
    if (!validSlotIndex(slotIndex)) return failure('invalid_slot', model);
    if (typeof formationId !== 'string' || !own(formations, formationId)) {
      return failure('invalid_formation', model);
    }
    const cloned = cloneModel(model);
    if (!cloned.ok) return failure('invalid_state', model);
    const current = formationState(cloned.value);
    const inventory = inventoryState(cloned.value);
    if (!current || !inventory) return failure('invalid_state', model);
    if (!formationInventoryConsistent(current, inventory)) {
      return failure('invalid_state', model);
    }
    if (slotIndex >= current.slots.length) {
      return failure('slot_locked', model);
    }
    const previousId = current.slots[slotIndex];
    if (previousId === formationId) {
      return failure('already_equipped', model);
    }
    const definition = formations[formationId];
    const availability = callAvailable(inventory, definition.itemId);
    if (!availability.ok) return failure('inventory_check_failed', model);
    if (availability.quantity < 1) {
      return failure('item_unavailable', model);
    }

    let nextInventory = inventory;
    if (previousId !== null) {
      const oldDefinition = formations[previousId];
      const unbound = callInventory(
        unbindInventory,
        nextInventory,
        oldDefinition.itemId
      );
      if (!unbound.ok) return failure('inventory_unbind_failed', model);
      nextInventory = unbound.value;
    }
    const bound = callInventory(
      bindInventory,
      nextInventory,
      definition.itemId
    );
    if (!bound.ok) return failure('inventory_bind_failed', model);
    cloned.value.player.inventory = bound.value;
    cloned.value.systems.homestead.formations.slots[slotIndex] = formationId;
    if (!formationInventoryConsistent(
      formationState(cloned.value),
      inventoryState(cloned.value)
    )) {
      return failure('invalid_state', model);
    }
    return success(cloned.value);
  }

  function unequip(model, slotIndex) {
    if (!validSlotIndex(slotIndex)) return failure('invalid_slot', model);
    const cloned = cloneModel(model);
    if (!cloned.ok) return failure('invalid_state', model);
    const current = formationState(cloned.value);
    const inventory = inventoryState(cloned.value);
    if (!current || !inventory) return failure('invalid_state', model);
    if (!formationInventoryConsistent(current, inventory)) {
      return failure('invalid_state', model);
    }
    if (slotIndex >= current.slots.length) {
      return failure('slot_locked', model);
    }
    const previousId = current.slots[slotIndex];
    if (previousId === null) return failure('slot_empty', model);
    const unbound = callInventory(
      unbindInventory,
      inventory,
      formations[previousId].itemId
    );
    if (!unbound.ok) return failure('inventory_unbind_failed', model);
    cloned.value.player.inventory = unbound.value;
    cloned.value.systems.homestead.formations.slots[slotIndex] = null;
    if (!formationInventoryConsistent(
      formationState(cloned.value),
      inventoryState(cloned.value)
    )) {
      return failure('invalid_state', model);
    }
    return success(cloned.value);
  }

  function emptyEffects() {
    return {
      gatheringExtraYieldChance: 0,
      farmGrowthReduction: 0,
      fishRecoveryReduction: 0,
      craftingDurationReduction: 0,
      beastTrainingXpBonus: 0
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

  function safeFormationParts(model) {
    const systems = dataValue(model, 'systems');
    const homestead = dataValue(systems, 'homestead');
    const value = dataValue(homestead, 'formations');
    const slots = strictArrayValues(dataValue(value, 'slots'));
    const owned = strictArrayValues(dataValue(value, 'owned'));
    return {
      slots: slots || [],
      owned: (owned || []).filter(function (formationId) {
        return typeof formationId === 'string' &&
          own(formations, formationId);
      })
    };
  }

  function effects(model) {
    const totals = emptyEffects();
    const current = safeFormationParts(model);
    for (let index = 0; index < current.slots.length; index++) {
      const formationId = current.slots[index];
      if (typeof formationId !== 'string' ||
          !own(formations, formationId)) {
        continue;
      }
      const effect = formations[formationId].effect;
      totals[effect.key] = Math.min(
        EFFECT_CAPS[effect.key],
        Math.round((totals[effect.key] + effect.value) * 1e12) / 1e12
      );
    }
    EFFECT_KEYS.forEach(function (key) {
      totals[key] = Math.min(EFFECT_CAPS[key], totals[key]);
    });
    return deepFreeze(totals);
  }

  function safeOwnedCount(inventory, itemId) {
    const stacks = dataValue(inventory, 'stacks');
    const quantity = dataValue(stacks, itemId);
    return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0;
  }

  function query(model) {
    const current = safeFormationParts(model);
    const sourceInventory = inventoryState(model);
    const copiedInventory = sourceInventory
      ? cloneStrict(sourceInventory)
      : { ok: false, value: null };
    const inventory = copiedInventory.ok ? copiedInventory.value : null;
    const consistent = formationInventoryConsistent(current, inventory);
    const discovered = [];
    formationOrder.forEach(function (formationId) {
      if (current.owned.indexOf(formationId) >= 0) {
        discovered.push(formationId);
      }
    });

    const cards = current.slots.map(function (formationId, slotIndex) {
      const definition = typeof formationId === 'string' &&
        own(formations, formationId)
        ? formations[formationId]
        : null;
      return {
        slotIndex: slotIndex,
        formationId: definition ? definition.id : null,
        name: definition ? definition.name : null,
        effectText: definition ? definition.effectText : null
      };
    });
    const rows = formationOrder.map(function (formationId) {
      const definition = formations[formationId];
      const owned = inventory
        ? safeOwnedCount(inventory, definition.itemId)
        : 0;
      const available = inventory
        ? callAvailable(inventory, definition.itemId)
        : { ok: false, quantity: 0 };
      const unbound = available.ok ? available.quantity : 0;
      const equippedCount = current.slots.reduce(function (count, value) {
        return count + (value === formationId ? 1 : 0);
      }, 0);
      const hasEligibleSlot = current.slots.some(function (value) {
        return value !== formationId;
      });
      return {
        formationId: formationId,
        itemId: definition.itemId,
        name: definition.name,
        owned: owned,
        unbound: unbound,
        discovered: discovered.indexOf(formationId) >= 0,
        equippedCount: equippedCount,
        effectText: definition.effectText,
        canEquip: consistent && unbound > 0 && hasEligibleSlot
      };
    });
    return deepFreeze({
      slots: cards,
      discoveredIds: discovered,
      formations: rows,
      effects: effects(model)
    });
  }

  return Object.freeze({
    recordCrafted: recordCrafted,
    equip: equip,
    unequip: unequip,
    effects: effects,
    query: query
  });
});
