(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    let proxyDetector = null;
    try {
      proxyDetector = require('node:util').types.isProxy;
    } catch (error) {
      proxyDetector = null;
    }
    module.exports = factory(proxyDetector);
  } else if (root) {
    root.Production = factory(null);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  proxyDetector
) {
  'use strict';

  const PRODUCTION_SKILLS = Object.freeze([
    'alchemy', 'forging', 'cooking', 'talisman', 'formation'
  ]);
  const MAX_RNG_STATE = 0xFFFFFFFF;
  const MAX_RETENTION_CHANCE = 0.50;
  const MAX_DURATION_REDUCTION = 0.95;

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function define(target, key, value) {
    Object.defineProperty(target, key, {
      value,
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

  function isPlainRecord(value) {
    try {
      if (!value || typeof value !== 'object' ||
          Array.isArray(value) || isDetectedProxy(value)) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      return prototype === null || prototype === Object.prototype;
    } catch (error) {
      return false;
    }
  }

  function ownDataValue(record, key) {
    try {
      if (!isPlainRecord(record) || !own(record, key)) {
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

  function ownArrayDataValue(array, key) {
    try {
      if (!Array.isArray(array) || isDetectedProxy(array) ||
          !own(array, key)) {
        return undefined;
      }
      const descriptor = Object.getOwnPropertyDescriptor(array, key);
      return descriptor && own(descriptor, 'value')
        ? descriptor.value
        : undefined;
    } catch (error) {
      return undefined;
    }
  }

  function cloneJsonValue(value, ancestors, allowNonFiniteNumbers) {
    if (value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean') {
      return { ok: true, value };
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) || allowNonFiniteNumbers
        ? { ok: true, value }
        : { ok: false, value: null };
    }
    if (typeof value !== 'object' || isDetectedProxy(value)) {
      return { ok: false, value: null };
    }

    let prototype;
    let keys;
    try {
      prototype = Object.getPrototypeOf(value);
      keys = Reflect.ownKeys(value);
    } catch (error) {
      return { ok: false, value: null };
    }
    if (ancestors.has(value)) return { ok: false, value: null };

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(value);
    if (Array.isArray(value)) {
      if (prototype !== Array.prototype) {
        return { ok: false, value: null };
      }
      let lengthDescriptor;
      try {
        lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
      } catch (error) {
        return { ok: false, value: null };
      }
      const length = lengthDescriptor &&
        own(lengthDescriptor, 'value') &&
        Number.isSafeInteger(lengthDescriptor.value) &&
        lengthDescriptor.value >= 0
        ? lengthDescriptor.value
        : null;
      if (length === null || keys.length !== length + 1) {
        return { ok: false, value: null };
      }
      const result = [];
      for (let index = 0; index < length; index++) {
        if (keys[index] !== String(index)) {
          return { ok: false, value: null };
        }
        let descriptor;
        try {
          descriptor = Object.getOwnPropertyDescriptor(
            value,
            String(index)
          );
        } catch (error) {
          return { ok: false, value: null };
        }
        if (!descriptor || descriptor.enumerable !== true ||
            !own(descriptor, 'value')) {
          return { ok: false, value: null };
        }
        const copied = cloneJsonValue(
          descriptor.value,
          nextAncestors,
          allowNonFiniteNumbers
        );
        if (!copied.ok) return copied;
        result.push(copied.value);
      }
      if (keys[length] !== 'length') {
        return { ok: false, value: null };
      }
      return { ok: true, value: result };
    }

    if (prototype !== null && prototype !== Object.prototype) {
      return { ok: false, value: null };
    }
    const result = prototype === null ? Object.create(null) : {};
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (typeof key !== 'string') {
        return { ok: false, value: null };
      }
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
      const copied = cloneJsonValue(
        descriptor.value,
        nextAncestors,
        allowNonFiniteNumbers
      );
      if (!copied.ok) return copied;
      define(result, key, copied.value);
    }
    return { ok: true, value: result };
  }

  function cloneJson(value) {
    return cloneJsonValue(value, new Set(), false);
  }

  function cloneDetached(value) {
    return cloneJsonValue(value, new Set(), true);
  }

  function deepFreeze(value) {
    if (!value ||
        (typeof value !== 'object' && typeof value !== 'function') ||
        Object.isFrozen(value)) {
      return value;
    }
    Object.freeze(value);
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return value;
  }

  function snapshotDependencyValue(value, ancestors) {
    const type = typeof value;
    if ((value !== null && type === 'object') || type === 'function') {
      if (isDetectedProxy(value)) {
        throw new TypeError('proxy dependency');
      }
    }
    if (value === null ||
        type === 'string' ||
        type === 'boolean' ||
        type === 'function') {
      return value;
    }
    if (type === 'number') {
      if (!Number.isFinite(value)) {
        throw new TypeError('non-finite dependency number');
      }
      return value;
    }
    if (type !== 'object') {
      throw new TypeError('unsupported dependency value');
    }
    if (ancestors.has(value)) {
      throw new TypeError('cyclic dependency value');
    }

    let prototype;
    let keys;
    try {
      prototype = Object.getPrototypeOf(value);
      keys = Reflect.ownKeys(value);
    } catch (error) {
      throw new TypeError('dependency reflection failed');
    }
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(value);

    if (Array.isArray(value)) {
      if (prototype !== Array.prototype) {
        throw new TypeError('array dependency has an invalid prototype');
      }
      let lengthDescriptor;
      try {
        lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
      } catch (error) {
        throw new TypeError('array length descriptor failed');
      }
      const length = lengthDescriptor &&
        own(lengthDescriptor, 'value') &&
        Number.isSafeInteger(lengthDescriptor.value) &&
        lengthDescriptor.value >= 0
        ? lengthDescriptor.value
        : null;
      if (length === null || keys.length !== length + 1) {
        throw new TypeError('array dependency has invalid keys');
      }
      const result = [];
      for (let index = 0; index < length; index++) {
        const key = String(index);
        if (keys[index] !== key) {
          throw new TypeError('array dependency has a hole or extra key');
        }
        let descriptor;
        try {
          descriptor = Object.getOwnPropertyDescriptor(value, key);
        } catch (error) {
          throw new TypeError('array element descriptor failed');
        }
        if (!descriptor ||
            descriptor.enumerable !== true ||
            !own(descriptor, 'value')) {
          throw new TypeError('array dependency element is not data');
        }
        result.push(snapshotDependencyValue(
          descriptor.value,
          nextAncestors
        ));
      }
      if (keys[length] !== 'length') {
        throw new TypeError('array dependency has an extra key');
      }
      return Object.freeze(result);
    }

    if (prototype !== null && prototype !== Object.prototype) {
      throw new TypeError('object dependency has an invalid prototype');
    }
    const result = prototype === null ? Object.create(null) : {};
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (typeof key !== 'string') {
        throw new TypeError('dependency symbol keys are not supported');
      }
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(value, key);
      } catch (error) {
        throw new TypeError('dependency property descriptor failed');
      }
      if (!descriptor ||
          descriptor.enumerable !== true ||
          !own(descriptor, 'value')) {
        throw new TypeError('dependency property is not enumerable data');
      }
      define(
        result,
        key,
        snapshotDependencyValue(descriptor.value, nextAncestors)
      );
    }
    return Object.freeze(result);
  }

  function snapshotDependencies(deps) {
    try {
      return snapshotDependencyValue(deps, new Set());
    } catch (error) {
      throw new TypeError('deps contains an unsafe dependency snapshot');
    }
  }

  function requireRecord(record, key, label) {
    const value = ownDataValue(record, key);
    if (!isPlainRecord(value)) {
      throw new TypeError(label + ' must be an own plain object');
    }
    return value;
  }

  function requireFunction(record, key, label) {
    const value = ownDataValue(record, key);
    if (typeof value !== 'function') {
      throw new TypeError(label + ' must be an own function');
    }
    return function () {
      return Reflect.apply(value, record, arguments);
    };
  }

  function requireString(record, key, label) {
    const value = ownDataValue(record, key);
    if (typeof value !== 'string' || value.length === 0) {
      throw new TypeError(label + ' must be a non-empty string');
    }
    return value;
  }

  function requireSafeInteger(record, key, label, minimum, maximum) {
    const value = ownDataValue(record, key);
    if (!Number.isSafeInteger(value) ||
        value < minimum ||
        (maximum != null && value > maximum)) {
      throw new TypeError(label + ' must be a safe integer');
    }
    return value;
  }

  function requireFiniteNumber(record, key, label, minimum) {
    const value = ownDataValue(record, key);
    if (typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < minimum) {
      throw new TypeError(label + ' must be a finite number');
    }
    return value;
  }

  function copyQuantityRecord(raw, label) {
    if (!isPlainRecord(raw)) {
      throw new TypeError(label + ' must be a plain object');
    }
    const result = {};
    const itemIds = Object.keys(raw);
    itemIds.forEach(function (itemId) {
      if (itemId.length === 0) {
        throw new TypeError(label + ' has an invalid item id');
      }
      const quantity = requireSafeInteger(
        raw,
        itemId,
        label + '.' + itemId,
        1
      );
      define(result, itemId, quantity);
    });
    return result;
  }

  function copyRecipe(raw, recipeId) {
    if (!isPlainRecord(raw)) {
      throw new TypeError('recipe must be a plain object');
    }
    const id = requireString(raw, 'id', 'recipe.id');
    const skillId = requireString(raw, 'skillId', 'recipe.skillId');
    const masteryId = requireString(raw, 'masteryId', 'recipe.masteryId');
    if (id !== recipeId ||
        PRODUCTION_SKILLS.indexOf(skillId) < 0 ||
        masteryId !== id) {
      throw new TypeError('recipe identity is not canonical');
    }
    const choices = ownDataValue(raw, 'ingredientChoices');
    if (!Array.isArray(choices)) {
      throw new TypeError('recipe ingredient choices must be an array');
    }
    const copiedChoices = choices.map(function (group, groupIndex) {
      if (!isPlainRecord(group)) {
        throw new TypeError('ingredient choice must be a plain object');
      }
      const itemIds = ownDataValue(group, 'itemIds');
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new TypeError('ingredient choice must contain items');
      }
      const copiedIds = [];
      itemIds.forEach(function (itemId) {
        if (typeof itemId !== 'string' ||
            itemId.length === 0 ||
            copiedIds.indexOf(itemId) >= 0) {
          throw new TypeError('ingredient choice item is invalid');
        }
        copiedIds.push(itemId);
      });
      return {
        quantity: requireSafeInteger(
          group,
          'quantity',
          'ingredientChoices.' + groupIndex + '.quantity',
          1
        ),
        itemIds: copiedIds
      };
    });
    const output = requireRecord(raw, 'output', 'recipe.output');
    const copied = {
      id,
      skillId,
      masteryId,
      name: requireString(raw, 'name', 'recipe.name'),
      unlockLevel: requireSafeInteger(
        raw,
        'unlockLevel',
        'recipe.unlockLevel',
        1,
        120
      ),
      baseSeconds: requireFiniteNumber(
        raw,
        'baseSeconds',
        'recipe.baseSeconds',
        0
      ),
      skillXp: requireSafeInteger(raw, 'skillXp', 'recipe.skillXp', 0),
      masteryXp: requireSafeInteger(
        raw,
        'masteryXp',
        'recipe.masteryXp',
        0
      ),
      cultivation: requireSafeInteger(
        raw,
        'cultivation',
        'recipe.cultivation',
        0
      ),
      ingredients: copyQuantityRecord(
        requireRecord(raw, 'ingredients', 'recipe.ingredients'),
        'recipe.ingredients'
      ),
      ingredientChoices: copiedChoices,
      output: {
        itemId: requireString(output, 'itemId', 'recipe.output.itemId'),
        quantity: requireSafeInteger(
          output,
          'quantity',
          'recipe.output.quantity',
          1
        )
      }
    };
    const equipmentBaseId = ownDataValue(raw, 'equipmentBaseId');
    if (equipmentBaseId !== undefined) {
      if (skillId !== 'forging' ||
          typeof equipmentBaseId !== 'string' ||
          equipmentBaseId.length === 0) {
        throw new TypeError('recipe equipment base is invalid');
      }
      copied.equipmentBaseId = equipmentBaseId;
    }
    return copied;
  }

  function copyRecipes(content) {
    const rawRecipes = requireRecord(
      content,
      'RECIPES',
      'deps.RecipeContent.RECIPES'
    );
    const recipes = {};
    Object.keys(rawRecipes).forEach(function (recipeId) {
      define(recipes, recipeId, copyRecipe(rawRecipes[recipeId], recipeId));
    });
    return deepFreeze(recipes);
  }

  function isProgress(value) {
    return isPlainRecord(value) &&
      Number.isSafeInteger(ownDataValue(value, 'level')) &&
      ownDataValue(value, 'level') >= 1 &&
      ownDataValue(value, 'level') <= 99 &&
      Number.isSafeInteger(ownDataValue(value, 'xp')) &&
      ownDataValue(value, 'xp') >= 0;
  }

  function masteryStorageId(recipe) {
    const prefix = recipe.skillId + ':';
    return recipe.masteryId.indexOf(prefix) === 0
      ? recipe.masteryId.slice(prefix.length)
      : recipe.masteryId;
  }

  function checkedPlayer(player, recipe) {
    const copied = cloneJson(player);
    if (!copied.ok || !isPlainRecord(copied.value)) {
      return { ok: false, player: copied.ok ? copied.value : null };
    }
    const candidate = copied.value;
    const skills = ownDataValue(candidate, 'skills');
    const mastery = ownDataValue(candidate, 'mastery');
    const inventory = ownDataValue(candidate, 'inventory');
    const skill = ownDataValue(skills, recipe.skillId);
    const skillMastery = ownDataValue(mastery, recipe.skillId);
    const storageId = masteryStorageId(recipe);
    const masteryProgress = ownDataValue(skillMastery, storageId);
    const cultivation = ownDataValue(candidate, 'xiwei');
    if (!isPlainRecord(skills) ||
        !isPlainRecord(mastery) ||
        !isPlainRecord(inventory) ||
        !isProgress(skill) ||
        !isPlainRecord(skillMastery) ||
        !isProgress(masteryProgress) ||
        (cultivation !== undefined &&
          (!Number.isSafeInteger(cultivation) ||
            cultivation < 0))) {
      return { ok: false, player: candidate };
    }
    return {
      ok: true,
      player: candidate,
      skills,
      mastery,
      inventory,
      skill,
      skillMastery,
      masteryProgress,
      storageId
    };
  }

  function validRngState(value) {
    return Number.isSafeInteger(value) &&
      value >= 0 &&
      value <= MAX_RNG_STATE;
  }

  function emptyGains() {
    return {
      items: {},
      skillXp: {},
      masteryXp: {},
      cultivation: 0
    };
  }

  function emptyCosts() {
    return { items: {} };
  }

  function detachedPlayer(player) {
    const copied = cloneDetached(player);
    return copied.ok ? copied.value : null;
  }

  function cultivationCommit(player, reward) {
    if (!Number.isSafeInteger(reward) || reward < 0) {
      return { ok: false, current: null, next: null };
    }
    if (!isPlainRecord(player)) {
      return { ok: true, current: null, next: null, deferred: true };
    }
    const raw = ownDataValue(player, 'xiwei');
    const current = raw === undefined ? 0 : raw;
    if (!Number.isSafeInteger(current) || current < 0) {
      return { ok: false, current, next: null };
    }
    const next = current + reward;
    if (!Number.isSafeInteger(next) ||
        next - current !== reward) {
      return { ok: false, current, next: null };
    }
    return { ok: true, current, next, deferred: false };
  }

  function failure(code, player, rngState, retained) {
    return {
      ok: false,
      code,
      player: detachedPlayer(player),
      rngState,
      retained: retained === true,
      gains: emptyGains(),
      costs: emptyCosts()
    };
  }

  function copyOptions(options, groupCount) {
    if (options == null) {
      return {
        ok: true,
        materialRetentionChance: 0,
        preferred: {}
      };
    }
    const copied = cloneJson(options);
    if (!copied.ok || !isPlainRecord(copied.value)) {
      return { ok: false, code: 'invalid_options' };
    }
    const source = copied.value;
    const rawBonus = ownDataValue(source, 'materialRetentionChance');
    const materialRetentionChance =
      typeof rawBonus === 'number' &&
      Number.isFinite(rawBonus) &&
      rawBonus >= 0
        ? rawBonus
        : 0;
    const preferred = {};
    const rawPreferred = ownDataValue(source, 'preferredIngredients');
    if (rawPreferred === undefined || rawPreferred === null) {
      return { ok: true, materialRetentionChance, preferred };
    }
    let keys;
    if (Array.isArray(rawPreferred)) {
      keys = Object.keys(rawPreferred);
    } else if (isPlainRecord(rawPreferred)) {
      keys = Object.keys(rawPreferred);
    } else {
      return { ok: false, code: 'invalid_options' };
    }
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (!/^(0|[1-9]\d*)$/.test(key)) {
        return { ok: false, code: 'invalid_preferred_ingredient' };
      }
      const groupIndex = Number(key);
      if (!Number.isSafeInteger(groupIndex) ||
          groupIndex < 0 ||
          groupIndex >= groupCount) {
        return { ok: false, code: 'invalid_preferred_ingredient' };
      }
      const itemId = Array.isArray(rawPreferred)
        ? ownArrayDataValue(rawPreferred, key)
        : ownDataValue(rawPreferred, key);
      if (itemId === null || itemId === undefined) continue;
      if (typeof itemId !== 'string' || itemId.length === 0) {
        return { ok: false, code: 'invalid_preferred_ingredient' };
      }
      define(preferred, key, itemId);
    }
    return { ok: true, materialRetentionChance, preferred };
  }

  function addQuantity(target, itemId, quantity) {
    const current = own(target, itemId) ? target[itemId] : 0;
    const next = current + quantity;
    if (!Number.isSafeInteger(next) || next < 0) return false;
    define(target, itemId, next);
    return true;
  }

  function addSignedQuantity(target, itemId, quantity) {
    const current = own(target, itemId) ? target[itemId] : 0;
    const next = current + quantity;
    if (!Number.isSafeInteger(next)) return false;
    define(target, itemId, next);
    return true;
  }

  function safeDurationReduction(bonuses) {
    const copied = cloneJson(bonuses == null ? {} : bonuses);
    if (!copied.ok || !isPlainRecord(copied.value)) return 0;
    const value = ownDataValue(
      copied.value,
      'craftingDurationReduction'
    );
    return typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0
      ? Math.min(MAX_DURATION_REDUCTION, value)
      : 0;
  }

  function roundedToThree(value) {
    if (Math.abs(value) >= 1e21) return value;
    const correction = Math.abs(value) * Number.EPSILON;
    return Math.round((value + correction) * 1000) / 1000;
  }

  function create(deps) {
    const safeDeps = snapshotDependencies(deps);
    if (!isPlainRecord(safeDeps)) {
      throw new TypeError('deps contains an unsafe dependency snapshot');
    }
    const recipeContent = requireRecord(
      safeDeps,
      'RecipeContent',
      'deps.RecipeContent'
    );
    const inventory = requireRecord(
      safeDeps,
      'Inventory',
      'deps.Inventory'
    );
    const progression = requireRecord(
      safeDeps,
      'SkillProgression',
      'deps.SkillProgression'
    );
    const random = requireRecord(
      safeDeps,
      'GameRandom',
      'deps.GameRandom'
    );
    const equipment = ownDataValue(safeDeps, 'Equipment');

    const recipes = copyRecipes(recipeContent);
    const inventoryAvailable = requireFunction(
      inventory,
      'availableQuantity',
      'deps.Inventory.availableQuantity'
    );
    const inventoryApply = requireFunction(
      inventory,
      'apply',
      'deps.Inventory.apply'
    );
    const inventoryAddEquipment = isPlainRecord(equipment)
      ? requireFunction(
        inventory,
        'addEquipment',
        'deps.Inventory.addEquipment'
      )
      : null;
    const equipmentGenerate = isPlainRecord(equipment)
      ? requireFunction(
        equipment,
        'generate',
        'deps.Equipment.generate'
      )
      : null;
    const effectiveDuration = requireFunction(
      progression,
      'effectiveDuration',
      'deps.SkillProgression.effectiveDuration'
    );
    const addSkillXp = requireFunction(
      progression,
      'addSkillXp',
      'deps.SkillProgression.addSkillXp'
    );
    const addMasteryXp = requireFunction(
      progression,
      'addMasteryXp',
      'deps.SkillProgression.addMasteryXp'
    );
    const retentionChance = requireFunction(
      progression,
      'masteryYieldOrRetentionChance',
      'deps.SkillProgression.masteryYieldOrRetentionChance'
    );
    const randomNext = requireFunction(
      random,
      'next',
      'deps.GameRandom.next'
    );

    function draw(rngState) {
      let rolled;
      try {
        rolled = randomNext(rngState);
      } catch (error) {
        return { ok: false, rngState };
      }
      if (!isPlainRecord(rolled)) {
        return { ok: false, rngState };
      }
      const seed = ownDataValue(rolled, 'seed');
      const value = ownDataValue(rolled, 'value');
      if (!validRngState(seed) ||
          typeof value !== 'number' ||
          !Number.isFinite(value) ||
          value < 0 ||
          value >= 1) {
        return { ok: false, rngState };
      }
      return { ok: true, rngState: seed, value };
    }

    function forgingQuality(parts, value) {
      const progress = Math.max(
        0,
        Math.min(
          1,
          (
            parts.skill.level +
            parts.masteryProgress.level - 2
          ) / 196
        )
      );
      const legendary = 0.01 + progress * 0.04;
      const epic = legendary + 0.04 + progress * 0.11;
      const rare = epic + 0.14 + progress * 0.20;
      const fine = rare + 0.35;
      if (value < legendary) return 'legendary';
      if (value < epic) return 'epic';
      if (value < rare) return 'rare';
      if (value < fine) return 'fine';
      return 'common';
    }

    function getAvailable(inventoryValue, itemId) {
      let quantity;
      try {
        quantity = inventoryAvailable(inventoryValue, itemId);
      } catch (error) {
        return null;
      }
      return Number.isSafeInteger(quantity) && quantity >= 0
        ? quantity
        : null;
    }

    function resolveCosts(parts, recipe, options) {
      const costs = {};
      const itemIds = Object.keys(recipe.ingredients);
      for (let index = 0; index < itemIds.length; index++) {
        const itemId = itemIds[index];
        const quantity = recipe.ingredients[itemId];
        const available = getAvailable(parts.inventory, itemId);
        if (available === null) {
          return { ok: false, code: 'invalid_inventory' };
        }
        if (available < quantity) {
          return { ok: false, code: 'materials_exhausted' };
        }
        if (!addQuantity(costs, itemId, quantity)) {
          return { ok: false, code: 'invalid_inventory' };
        }
      }

      for (let groupIndex = 0;
        groupIndex < recipe.ingredientChoices.length;
        groupIndex++) {
        const group = recipe.ingredientChoices[groupIndex];
        const preferred = options.preferred[String(groupIndex)];
        if (preferred !== undefined &&
            group.itemIds.indexOf(preferred) < 0) {
          return {
            ok: false,
            code: 'invalid_preferred_ingredient'
          };
        }
        let selected = null;
        if (preferred !== undefined) {
          const available = getAvailable(parts.inventory, preferred);
          if (available === null) {
            return { ok: false, code: 'invalid_inventory' };
          }
          const reserved = own(costs, preferred) ? costs[preferred] : 0;
          if (available - reserved >= group.quantity) {
            selected = preferred;
          }
        }
        if (selected === null) {
          for (let itemIndex = 0;
            itemIndex < group.itemIds.length;
            itemIndex++) {
            const itemId = group.itemIds[itemIndex];
            const available = getAvailable(parts.inventory, itemId);
            if (available === null) {
              return { ok: false, code: 'invalid_inventory' };
            }
            const reserved = own(costs, itemId) ? costs[itemId] : 0;
            if (available - reserved >= group.quantity) {
              selected = itemId;
              break;
            }
          }
        }
        if (selected === null) {
          return { ok: false, code: 'materials_exhausted' };
        }
        if (!addQuantity(costs, selected, group.quantity)) {
          return { ok: false, code: 'invalid_inventory' };
        }
      }
      return { ok: true, costs };
    }

    function getDuration(player, recipeId, bonuses) {
      const recipe = typeof recipeId === 'string' && own(recipes, recipeId)
        ? recipes[recipeId]
        : null;
      if (!recipe) return Infinity;
      const parts = checkedPlayer(player, recipe);
      if (!parts.ok || parts.skill.level < recipe.unlockLevel) {
        return Infinity;
      }
      let duration;
      try {
        duration = effectiveDuration(
          recipe.baseSeconds,
          parts.skill.level,
          parts.masteryProgress.level
        );
      } catch (error) {
        return Infinity;
      }
      if (typeof duration !== 'number' ||
          !Number.isFinite(duration) ||
          duration < 0) {
        return Infinity;
      }
      const reduction = safeDurationReduction(bonuses);
      return roundedToThree(Math.max(
        0.5,
        duration * (1 - reduction)
      ));
    }

    function complete(player, recipeId, rngState, rawOptions) {
      const recipe = typeof recipeId === 'string' && own(recipes, recipeId)
        ? recipes[recipeId]
        : null;
      if (!recipe) {
        return failure('invalid_recipe', player, rngState, false);
      }
      const cultivation = cultivationCommit(
        player,
        recipe.cultivation
      );
      if (!cultivation.ok) {
        return failure(
          'invalid_progression',
          player,
          rngState,
          false
        );
      }
      const parts = checkedPlayer(player, recipe);
      if (!parts.ok) {
        return failure(
          'invalid_player',
          parts.player,
          rngState,
          false
        );
      }
      if (parts.skill.level < recipe.unlockLevel) {
        return failure(
          'skill_locked',
          parts.player,
          rngState,
          false
        );
      }
      const options = copyOptions(
        rawOptions,
        recipe.ingredientChoices.length
      );
      if (!options.ok) {
        return failure(options.code, parts.player, rngState, false);
      }
      const resolved = resolveCosts(parts, recipe, options);
      if (!resolved.ok) {
        return failure(
          resolved.code,
          parts.player,
          rngState,
          false
        );
      }
      if (!validRngState(rngState)) {
        return failure('invalid_rng', parts.player, rngState, false);
      }

      const rolled = draw(rngState);
      if (!rolled.ok) {
        return failure('invalid_rng', parts.player, rngState, false);
      }
      let masteryChance;
      try {
        masteryChance = retentionChance(parts.masteryProgress.level);
      } catch (error) {
        masteryChance = 0;
      }
      if (typeof masteryChance !== 'number' ||
          !Number.isFinite(masteryChance) ||
          masteryChance < 0) {
        masteryChance = 0;
      }
      const chance = Math.min(
        MAX_RETENTION_CHANCE,
        masteryChance + options.materialRetentionChance
      );
      const retained = rolled.value < chance;
      const producesEquipment =
        typeof recipe.equipmentBaseId === 'string' &&
        typeof equipmentGenerate === 'function' &&
        typeof inventoryAddEquipment === 'function';

      const delta = {};
      if (!retained) {
        const costIds = Object.keys(resolved.costs);
        for (let index = 0; index < costIds.length; index++) {
          const itemId = costIds[index];
          if (!addSignedQuantity(
            delta,
            itemId,
            -resolved.costs[itemId]
          )) {
            return failure(
              'invalid_inventory',
              parts.player,
              rolled.rngState,
              retained
            );
          }
        }
      }
      if (!producesEquipment) {
        if (!addSignedQuantity(
          delta,
          recipe.output.itemId,
          recipe.output.quantity
        )) {
          return failure(
            'invalid_inventory',
            parts.player,
            rolled.rngState,
            retained
          );
        }
      }

      let inventoryResult;
      try {
        inventoryResult = inventoryApply(parts.inventory, delta);
      } catch (error) {
        return failure(
          'invalid_inventory',
          parts.player,
          rolled.rngState,
          retained
        );
      }
      if (!isPlainRecord(inventoryResult) ||
          ownDataValue(inventoryResult, 'ok') !== true) {
        const code = isPlainRecord(inventoryResult) &&
          ownDataValue(inventoryResult, 'code') === 'inventory_full'
          ? 'inventory_full'
          : 'invalid_inventory';
        return failure(
          code,
          parts.player,
          rolled.rngState,
          retained
        );
      }
      let nextInventory = cloneJson(
        ownDataValue(inventoryResult, 'value')
      );
      if (!nextInventory.ok || !isPlainRecord(nextInventory.value)) {
        return failure(
          'invalid_inventory',
          parts.player,
          rolled.rngState,
          retained
        );
      }
      let finalRngState = rolled.rngState;
      const equipmentGains = [];
      if (producesEquipment) {
        const qualityRoll = draw(finalRngState);
        if (!qualityRoll.ok) {
          return failure(
            'invalid_rng',
            parts.player,
            finalRngState,
            retained
          );
        }
        const equipmentState = ownDataValue(
          nextInventory.value,
          'equipment'
        );
        const nextInstanceId = ownDataValue(
          equipmentState,
          'nextInstanceId'
        );
        if (!isPlainRecord(equipmentState) ||
            !Number.isSafeInteger(nextInstanceId) ||
            nextInstanceId < 1) {
          return failure(
            'invalid_inventory',
            parts.player,
            qualityRoll.rngState,
            retained
          );
        }
        let generated;
        try {
          generated = equipmentGenerate({
            baseId: recipe.equipmentBaseId,
            quality: forgingQuality(parts, qualityRoll.value),
            instanceId: 'eq-' + nextInstanceId,
            source: {
              type: 'forging',
              sourceId: recipe.id,
              acquiredAt: 0
            },
            rngState: qualityRoll.rngState
          });
        } catch (error) {
          generated = null;
        }
        if (!isPlainRecord(generated) ||
            ownDataValue(generated, 'ok') !== true) {
          return failure(
            'invalid_equipment',
            parts.player,
            qualityRoll.rngState,
            retained
          );
        }
        let added;
        try {
          added = inventoryAddEquipment(
            nextInventory.value,
            ownDataValue(generated, 'instance')
          );
        } catch (error) {
          added = null;
        }
        if (!isPlainRecord(added) ||
            ownDataValue(added, 'ok') !== true) {
          return failure(
            isPlainRecord(added) &&
              ownDataValue(added, 'code') === 'inventory_full'
              ? 'inventory_full'
              : 'invalid_inventory',
            parts.player,
            ownDataValue(generated, 'rngState'),
            retained
          );
        }
        nextInventory = cloneJson(ownDataValue(added, 'value'));
        if (!nextInventory.ok ||
            !isPlainRecord(nextInventory.value)) {
          return failure(
            'invalid_inventory',
            parts.player,
            ownDataValue(generated, 'rngState'),
            retained
          );
        }
        equipmentGains.push(
          cloneJson(ownDataValue(generated, 'instance')).value
        );
        finalRngState = ownDataValue(generated, 'rngState');
      }

      let skillResult;
      let masteryResult;
      try {
        skillResult = addSkillXp(
          cloneJson(parts.skill).value,
          recipe.skillXp
        );
        masteryResult = addMasteryXp(
          cloneJson(parts.masteryProgress).value,
          recipe.masteryXp
        );
      } catch (error) {
        return failure(
          'invalid_progression',
          parts.player,
          rolled.rngState,
          retained
        );
      }
      const nextSkill = cloneJson(ownDataValue(skillResult, 'value'));
      const nextMastery = cloneJson(ownDataValue(masteryResult, 'value'));
      if (!nextSkill.ok ||
          !nextMastery.ok ||
          !isProgress(nextSkill.value) ||
          !isProgress(nextMastery.value)) {
        return failure(
          'invalid_progression',
          parts.player,
          rolled.rngState,
          retained
        );
      }

      define(
        parts.skills,
        recipe.skillId,
        nextSkill.value
      );
      define(
        parts.skillMastery,
        parts.storageId,
        nextMastery.value
      );
      define(parts.player, 'inventory', nextInventory.value);
      define(
        parts.player,
        'xiwei',
        cultivation.next
      );

      const itemGains = {};
      const skillGains = {};
      const masteryGains = {};
      if (!producesEquipment) {
        define(itemGains, recipe.output.itemId, recipe.output.quantity);
      }
      define(skillGains, recipe.skillId, recipe.skillXp);
      define(masteryGains, recipe.masteryId, recipe.masteryXp);
      const gains = {
        items: itemGains,
        skillXp: skillGains,
        masteryXp: masteryGains,
        cultivation: recipe.cultivation
      };
      if (producesEquipment) {
        gains.equipment = equipmentGains;
      }
      return {
        ok: true,
        code: 'ok',
        player: parts.player,
        rngState: finalRngState,
        retained,
        gains: gains,
        costs: {
          items: retained ? {} : resolved.costs
        }
      };
    }

    return Object.freeze({
      complete,
      getDuration
    });
  }

  return Object.freeze({ create });
});
