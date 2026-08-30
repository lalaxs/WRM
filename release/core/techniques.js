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
      require('../content/techniques.js'),
      require('../content/realms.js'),
      proxyDetector,
      null
    );
  } else if (root) {
    root.Techniques = factory(
      root.Inventory,
      root.TechniqueContent,
      root.RealmContent,
      null,
      root.structuredClone
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Inventory,
  TechniqueContent,
  RealmContent,
  proxyDetector,
  stateCloneProbe
) {
  'use strict';

  const MAX_LEVEL = 200;
  // MWI Ability books: Tier1 = 50 XP, Tier2+ = 500 XP.
  const DUPLICATE_BOOK_XP_TIER1 = 50;
  const DUPLICATE_BOOK_XP_TIER2_PLUS = 500;
  const XP_SOURCES = Object.freeze([
    'combat', 'npc_guidance', 'sect_training'
  ]);
  // Hit counts and scheduler/status ticks are discrete combat structure.
  // Scaling them would break two-hit resolution and fixed tick contracts.
  const ACTIVE_STRUCTURAL_NUMBERS = Object.freeze([
    'hits', 'durationTicks', 'attackIntervalTicks', 'chance',
    'pulseIntervalTicks', 'pulseCount', 'stacks', 'maxStacks',
    'defenseIgnore', 'pulseDamageRatio', 'attackFactor', 'accuracyFlat',
    'damageBonus', 'damageTakenFactor', 'threshold', 'bonus',
    'lowHpThreshold', 'overflowShieldCap'
  ]);
  const NEUTRAL_MODIFIERS = Object.freeze({
    requiredRealmReduction: 0,
    xpCostMultiplier: 1
  });
  const FAVORED_MODIFIERS = Object.freeze({
    requiredRealmReduction: 1,
    xpCostMultiplier: 0.9
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

  function nonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function positiveInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
  }

  function copyTags(value) {
    const tags = strictArrayValues(value);
    if (!tags || !tags.every(function (tag) {
      return typeof tag === 'string' && tag.length > 0;
    })) {
      return null;
    }
    return tags.slice();
  }

  function copyEffect(value) {
    const copied = cloneStrict(value, new Set());
    return copied.ok && plainRecord(copied.value) ? copied.value : null;
  }

  const techniques = snapshotRegistry(
    TechniqueContent,
    'TECHNIQUES',
    function (id, value) {
      if (!plainRecord(value) || dataValue(value, 'id') !== id) return null;
      const name = dataValue(value, 'name');
      const kind = dataValue(value, 'kind');
      const tier = dataValue(value, 'tier');
      const tags = copyTags(dataValue(value, 'tags'));
      const requiredRealmIndex = dataValue(value, 'requiredRealmIndex');
      const bookItemId = dataValue(value, 'bookItemId');
      const qiCost = dataValue(value, 'qiCost');
      const cooldownTicks = dataValue(value, 'cooldownTicks');
      const effect = copyEffect(dataValue(value, 'effect'));
      if (typeof name !== 'string' ||
          (kind !== 'active' && kind !== 'passive') ||
          !positiveInteger(tier) || !tags ||
          !nonNegativeInteger(requiredRealmIndex) ||
          typeof bookItemId !== 'string' || bookItemId.length === 0 ||
          !nonNegativeInteger(qiCost) ||
          !nonNegativeInteger(cooldownTicks) || !effect) {
        return null;
      }
      return {
        id: id,
        name: name,
        kind: kind,
        tier: tier,
        tags: tags,
        requiredRealmIndex: requiredRealmIndex,
        bookItemId: bookItemId,
        qiCost: qiCost,
        cooldownTicks: cooldownTicks,
        effect: effect
      };
    }
  );

  const techniquesByBook = {};
  Object.keys(techniques).forEach(function (techniqueId) {
    define(
      techniquesByBook,
      techniques[techniqueId].bookItemId,
      techniques[techniqueId]
    );
  });
  deepFreeze(techniquesByBook);
  const contentXpNeed = dependencyValue(TechniqueContent, 'xpNeed');

  const realms = snapshotRegistry(
    RealmContent,
    'REALMS',
    function (id, value) {
      const index = dataValue(value, 'index');
      return plainRecord(value) &&
        dataValue(value, 'id') === id &&
        nonNegativeInteger(index)
        ? { id: id, index: index }
        : null;
    }
  );

  const applyInventory = dependencyValue(Inventory, 'apply');

  function inventoryCount(inventory, itemId) {
    const stacks = dataValue(inventory, 'stacks');
    const quantity = dataValue(stacks, itemId);
    return positiveInteger(quantity) ? quantity : 0;
  }

  function bindingCount(inventory, itemId, reason) {
    const bindings = dataValue(inventory, 'bindings');
    const record = dataValue(bindings, itemId);
    if (typeof record === 'undefined') return 0;
    const quantity = dataValue(record, reason);
    return nonNegativeInteger(quantity) ? quantity : -1;
  }

  function validateInventory(inventory) {
    if (!plainRecord(inventory)) return false;
    const capacity = dataValue(inventory, 'capacity');
    const grants = dataValue(inventory, 'capacityGrants');
    const stacks = dataValue(inventory, 'stacks');
    const bindings = dataValue(inventory, 'bindings');
    if (!nonNegativeInteger(capacity) ||
        !plainRecord(grants) ||
        !plainRecord(stacks) ||
        !plainRecord(bindings)) {
      return false;
    }
    const stackIds = Object.keys(stacks);
    if (stackIds.length > capacity) return false;
    for (let index = 0; index < stackIds.length; index++) {
      if (!positiveInteger(dataValue(stacks, stackIds[index]))) return false;
    }
    const boundIds = Object.keys(bindings);
    for (let index = 0; index < boundIds.length; index++) {
      const itemId = boundIds[index];
      const record = dataValue(bindings, itemId);
      const equipment = bindingCount(inventory, itemId, 'equipment');
      const task = bindingCount(inventory, itemId, 'task');
      const formation = bindingCount(inventory, itemId, 'formation');
      if (!plainRecord(record) || inventoryCount(inventory, itemId) < 1 ||
          equipment < 0 || task < 0 || formation < 0 ||
          equipment + task + formation > inventoryCount(inventory, itemId)) {
        return false;
      }
    }
    return true;
  }

  function validateKnown(known) {
    if (!plainRecord(known)) return false;
    const ids = Object.keys(known);
    for (let index = 0; index < ids.length; index++) {
      const techniqueId = ids[index];
      const record = dataValue(known, techniqueId);
      const level = dataValue(record, 'level');
      const xp = dataValue(record, 'xp');
      if (!own(techniques, techniqueId) || !plainRecord(record) ||
          !positiveInteger(level) || level > MAX_LEVEL ||
          !nonNegativeInteger(xp) ||
          (level < MAX_LEVEL &&
            xp >= xpNeed(level, NEUTRAL_MODIFIERS)) ||
          (level === MAX_LEVEL && xp !== 0)) {
        return false;
      }
    }
    return true;
  }

  function inspect(model) {
    const copied = cloneStrict(model, new Set());
    if (!copied.ok || !plainRecord(copied.value)) return null;
    if (!probeCloneCapability(model)) return null;
    const state = copied.value;
    const player = dataValue(state, 'player');
    const techniqueState = dataValue(player, 'techniques');
    const known = dataValue(techniqueState, 'known');
    const inventory = dataValue(player, 'inventory');
    const breakthrough = dataValue(player, 'breakthrough');
    const realmId = dataValue(breakthrough, 'realmId');
    if (!plainRecord(player) ||
        !plainRecord(techniqueState) ||
        !validateKnown(known) ||
        !validateInventory(inventory) ||
        !plainRecord(breakthrough) ||
        typeof realmId !== 'string' ||
        !own(realms, realmId)) {
      return null;
    }
    return {
      state: state,
      player: player,
      known: known,
      inventory: inventory,
      realmIndex: realms[realmId].index
    };
  }

  function neutralModifiers() {
    return {
      requiredRealmReduction: NEUTRAL_MODIFIERS.requiredRealmReduction,
      xpCostMultiplier: NEUTRAL_MODIFIERS.xpCostMultiplier
    };
  }

  function favoredModifiers() {
    return {
      requiredRealmReduction: FAVORED_MODIFIERS.requiredRealmReduction,
      xpCostMultiplier: FAVORED_MODIFIERS.xpCostMultiplier
    };
  }

  function readSectContext(value) {
    if (value == null) {
      return {
        sectId: null,
        favoredTechniqueIds: [],
        favoredTags: []
      };
    }
    const copied = cloneStrict(value, new Set());
    if (!copied.ok || !plainRecord(copied.value) ||
        !probeCloneCapability(value)) {
      return null;
    }
    const source = copied.value;
    const sectId = dataValue(source, 'sectId');
    const favoredTechniqueIds = strictArrayValues(
      dataValue(source, 'favoredTechniqueIds')
    );
    const favoredTags = strictArrayValues(dataValue(source, 'favoredTags'));
    if ((sectId !== null && typeof sectId !== 'string') ||
        !favoredTechniqueIds || !favoredTags ||
        !favoredTechniqueIds.every(function (id) {
          return typeof id === 'string';
        }) ||
        !favoredTags.every(function (tag) {
          return typeof tag === 'string';
        })) {
      return null;
    }
    return {
      sectId: sectId,
      favoredTechniqueIds: favoredTechniqueIds,
      favoredTags: favoredTags
    };
  }

  function modifiersFor(technique, sect) {
    if (!technique || !sect) return neutralModifiers();
    const favoredId = sect.favoredTechniqueIds.indexOf(technique.id) >= 0;
    const favoredTag = technique.tags.some(function (tag) {
      return sect.favoredTags.indexOf(tag) >= 0;
    });
    return favoredId || favoredTag
      ? favoredModifiers()
      : neutralModifiers();
  }

  function sectModifiers(techniqueId, sectContext) {
    const sect = readSectContext(sectContext);
    const technique = typeof techniqueId === 'string' &&
      own(techniques, techniqueId)
      ? techniques[techniqueId]
      : null;
    return deepFreeze(modifiersFor(technique, sect));
  }

  function xpNeed(level, sectModifier) {
    if (!positiveInteger(level) || level >= MAX_LEVEL) return 0;
    const multiplier = dataValue(sectModifier, 'xpCostMultiplier');
    if (typeof multiplier !== 'number' ||
        !Number.isFinite(multiplier) ||
        multiplier <= 0) {
      return 0;
    }
    if (typeof contentXpNeed !== 'function') return 0;
    try {
      const needed = contentXpNeed(level, multiplier);
      return positiveInteger(needed) ? needed : 0;
    } catch (error) {
      return 0;
    }
  }

  function roundFour(value) {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
  }

  function scaleEffectValue(value, multiplier, kind, key) {
    if (typeof value === 'number') {
      if (kind === 'active' &&
          ACTIVE_STRUCTURAL_NUMBERS.indexOf(key) >= 0) {
        return value;
      }
      return roundFour(value * multiplier);
    }
    if (Array.isArray(value)) {
      return value.map(function (item) {
        return scaleEffectValue(item, multiplier, kind, null);
      });
    }
    if (plainRecord(value)) {
      const result = {};
      Object.keys(value).forEach(function (childKey) {
        define(
          result,
          childKey,
          scaleEffectValue(value[childKey], multiplier, kind, childKey)
        );
      });
      return result;
    }
    return value;
  }

  function scaledEffectFor(technique, level) {
    if (!technique || !positiveInteger(level) || level > MAX_LEVEL) {
      return {};
    }
    // Remap old Lv20 totals (active +38% / passive +28.5%) onto MWI Lv100,
    // then keep the same rate through Lv200 for endless endgame books.
    const bonusAt100 = technique.kind === 'active' ? 0.38 : 0.285;
    const multiplier = 1 + bonusAt100 * (level - 1) / 99;
    return scaleEffectValue(
      technique.effect,
      multiplier,
      technique.kind,
      null
    );
  }

  function scaledEffect(techniqueId, level) {
    const technique = typeof techniqueId === 'string' &&
      own(techniques, techniqueId)
      ? techniques[techniqueId]
      : null;
    return deepFreeze(scaledEffectFor(technique, level));
  }

  function failure(code, model) {
    return {
      ok: false,
      code: code,
      state: model,
      gainedXp: 0,
      levelsGained: 0,
      capped: false
    };
  }

  function success(state, gainedXp, levelsGained, capped) {
    return {
      ok: true,
      code: 'ok',
      state: state,
      gainedXp: gainedXp,
      levelsGained: levelsGained,
      capped: capped
    };
  }

  function progressRecord(record, amount, modifiers) {
    let level = record.level;
    let xp = record.xp + amount;
    if (!Number.isSafeInteger(xp)) return { ok: false };
    let levelsGained = 0;
    while (level < MAX_LEVEL) {
      const needed = xpNeed(level, modifiers);
      if (!positiveInteger(needed)) {
        return { ok: false };
      }
      if (xp < needed) break;
      xp -= needed;
      level++;
      levelsGained++;
    }
    if (level >= MAX_LEVEL) xp = 0;
    record.level = level;
    record.xp = xp;
    return {
      ok: true,
      levelsGained: levelsGained,
      capped: level >= MAX_LEVEL
    };
  }

  function callInventoryApply(inventory, itemId) {
    if (typeof applyInventory !== 'function') {
      return { ok: false, code: 'inventory_apply_failed', value: null };
    }
    const expected = cloneStrict(inventory, new Set());
    if (!expected.ok || !plainRecord(expected.value)) {
      return { ok: false, code: 'inventory_apply_failed', value: null };
    }
    const expectedStacks = dataValue(expected.value, 'stacks');
    const expectedQuantity = dataValue(expectedStacks, itemId);
    if (positiveInteger(expectedQuantity)) {
      if (expectedQuantity === 1) delete expectedStacks[itemId];
      else define(expectedStacks, itemId, expectedQuantity - 1);
    }
    const delta = {};
    define(delta, itemId, -1);
    try {
      const result = applyInventory(inventory, delta);
      if (!plainRecord(result)) {
        return { ok: false, code: 'inventory_apply_failed', value: null };
      }
      const resultOk = dataValue(result, 'ok');
      const code = dataValue(result, 'code');
      const value = dataValue(result, 'value');
      if (resultOk !== true) {
        return {
          ok: false,
          code: typeof code === 'string' ? code : 'inventory_apply_failed',
          value: null
        };
      }
      return validateInventory(value) && sameData(value, expected.value)
        ? { ok: true, code: 'ok', value: value }
        : { ok: false, code: 'inventory_apply_failed', value: null };
    } catch (error) {
      return { ok: false, code: 'inventory_apply_failed', value: null };
    }
  }

  function consumeBook(model, itemId, sectContext) {
    const technique = typeof itemId === 'string' &&
      own(techniquesByBook, itemId)
      ? techniquesByBook[itemId]
      : null;
    if (!technique) return failure('invalid_technique_book', model);
    const parts = inspect(model);
    if (!parts) return failure('invalid_state', model);
    const sect = readSectContext(sectContext);
    if (!sect) return failure('invalid_sect_context', model);
    const modifiers = modifiersFor(technique, sect);
    const known = own(parts.known, technique.id)
      ? parts.known[technique.id]
      : null;
    const effectiveRequiredRealm = Math.max(
      0,
      technique.requiredRealmIndex - modifiers.requiredRealmReduction
    );
    if (!known && parts.realmIndex < effectiveRequiredRealm) {
      return failure('realm_requirement', model);
    }
    const inventoryResult = callInventoryApply(parts.inventory, itemId);
    if (!inventoryResult.ok) {
      return failure(inventoryResult.code, model);
    }
    parts.player.inventory = inventoryResult.value;
    parts.inventory = inventoryResult.value;
    if (!known) {
      define(parts.known, technique.id, { level: 1, xp: 0 });
      return success(parts.state, 0, 0, false);
    }
    const gainedXp = technique.tier <= 1
      ? DUPLICATE_BOOK_XP_TIER1
      : DUPLICATE_BOOK_XP_TIER2_PLUS;
    const progress = progressRecord(known, gainedXp, modifiers);
    return progress.ok
      ? success(
        parts.state,
        gainedXp,
        progress.levelsGained,
        progress.capped
      )
      : failure('invalid_state', model);
  }

  function grantXp(model, techniqueId, amount, source, sectContext) {
    if (XP_SOURCES.indexOf(source) < 0) {
      return failure('invalid_xp_source', model);
    }
    if (!nonNegativeInteger(amount)) return failure('invalid_xp', model);
    const technique = typeof techniqueId === 'string' &&
      own(techniques, techniqueId)
      ? techniques[techniqueId]
      : null;
    if (!technique) return failure('unknown_technique', model);
    const parts = inspect(model);
    if (!parts) return failure('invalid_state', model);
    const sect = readSectContext(sectContext);
    if (!sect) return failure('invalid_sect_context', model);
    if (!own(parts.known, techniqueId)) {
      return failure('technique_not_learned', model);
    }
    const progress = progressRecord(
      parts.known[techniqueId],
      amount,
      modifiersFor(technique, sect)
    );
    return progress.ok
      ? success(parts.state, amount, progress.levelsGained, progress.capped)
      : failure('invalid_state', model);
  }

  function emptyQuery() {
    return deepFreeze({ techniques: [] });
  }

  function queryLibrary(model, sectContext) {
    const parts = inspect(model);
    const sect = readSectContext(sectContext);
    if (!parts || !sect) return emptyQuery();
    const rows = Object.keys(techniques).map(function (techniqueId) {
      const technique = techniques[techniqueId];
      const known = own(parts.known, techniqueId)
        ? parts.known[techniqueId]
        : null;
      const modifiers = modifiersFor(technique, sect);
      const effectiveRequiredRealmIndex = Math.max(
        0,
        technique.requiredRealmIndex - modifiers.requiredRealmReduction
      );
      const level = known ? known.level : 0;
      return {
        id: technique.id,
        name: technique.name,
        kind: technique.kind,
        tier: technique.tier,
        tags: technique.tags.slice(),
        bookItemId: technique.bookItemId,
        ownedBooks: inventoryCount(parts.inventory, technique.bookItemId),
        learned: !!known,
        level: level,
        xp: known ? known.xp : 0,
        xpNeeded: known ? xpNeed(level, modifiers) : 0,
        eligible: !!known ||
          parts.realmIndex >= effectiveRequiredRealmIndex,
        requiredRealmIndex: technique.requiredRealmIndex,
        effectiveRequiredRealmIndex: effectiveRequiredRealmIndex,
        sectModifiers: modifiers,
        qiCost: technique.qiCost,
        cooldownTicks: technique.cooldownTicks,
        effect: scaledEffectFor(technique, known ? level : 1)
      };
    });
    return deepFreeze({ techniques: rows });
  }

  return Object.freeze({
    consumeBook: consumeBook,
    grantXp: grantXp,
    xpNeed: xpNeed,
    sectModifiers: sectModifiers,
    scaledEffect: scaledEffect,
    queryLibrary: queryLibrary
  });
});
