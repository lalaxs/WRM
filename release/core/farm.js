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
      require('../content/homestead.js'),
      require('./inventory.js'),
      require('./skill-progression.js'),
      require('./random.js'),
      proxyDetector
    );
  } else if (root) {
    root.Farm = factory(
      root.HomesteadContent,
      root.Inventory,
      root.SkillProgression,
      root.GameRandom,
      null
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  HomesteadContent,
  Inventory,
  SkillProgression,
  GameRandom,
  proxyDetector
) {
  'use strict';

  const MAX_LEVEL = 99;
  const MAX_GROWTH_REDUCTION = 0.40;
  const MAX_EXTRA_YIELD_CHANCE = 0.75;
  const MAX_RNG_STATE = 0xFFFFFFFF;
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
      if (prototype === null) return true;
      if (Object.getPrototypeOf(prototype) !== null) return false;
      const descriptor = Object.getOwnPropertyDescriptor(
        prototype,
        'constructor'
      );
      return !!descriptor &&
        own(descriptor, 'value') &&
        typeof descriptor.value === 'function' &&
        descriptor.value.name === 'Object';
    } catch (error) {
      return false;
    }
  }

  function ownDataValue(record, key) {
    try {
      if (!isPlainRecord(record) || !own(record, key)) return undefined;
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      return descriptor && own(descriptor, 'value')
        ? descriptor.value
        : undefined;
    } catch (error) {
      return undefined;
    }
  }

  function ownArrayDataValue(array, index) {
    try {
      if (!Array.isArray(array) || isDetectedProxy(array) ||
          !own(array, String(index))) {
        return undefined;
      }
      const descriptor = Object.getOwnPropertyDescriptor(
        array,
        String(index)
      );
      return descriptor && own(descriptor, 'value')
        ? descriptor.value
        : undefined;
    } catch (error) {
      return undefined;
    }
  }

  function cloneJsonValue(value, ancestors) {
    if (value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean') {
      return { ok: true, value: value };
    }
    if (typeof value === 'number') {
      return Number.isFinite(value)
        ? { ok: true, value: value }
        : { ok: false, value: null };
    }
    if (typeof value !== 'object' || isDetectedProxy(value)) {
      return { ok: false, value: null };
    }
    if (ancestors.has(value)) return { ok: false, value: null };

    let prototype;
    let keys;
    try {
      prototype = Object.getPrototypeOf(value);
      keys = Reflect.ownKeys(value);
    } catch (error) {
      return { ok: false, value: null };
    }
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(value);

    if (Array.isArray(value)) {
      let arrayConstructor;
      try {
        arrayConstructor = prototype &&
          Object.getOwnPropertyDescriptor(prototype, 'constructor');
      } catch (error) {
        arrayConstructor = null;
      }
      if (prototype !== Array.prototype &&
          !(arrayConstructor &&
            own(arrayConstructor, 'value') &&
            typeof arrayConstructor.value === 'function' &&
            arrayConstructor.value.name === 'Array')) {
        return { ok: false, value: null };
      }
      const result = [];
      const length = value.length;
      if (!Number.isSafeInteger(length) || length < 0) {
        return { ok: false, value: null };
      }
      for (let index = 0; index < length; index++) {
        const item = ownArrayDataValue(value, index);
        if (item === undefined && !own(value, String(index))) {
          return { ok: false, value: null };
        }
        const copied = cloneJsonValue(item, nextAncestors);
        if (!copied.ok) return copied;
        result.push(copied.value);
      }
      if (keys.some(function (key) {
        return key !== 'length' &&
          !(typeof key === 'string' &&
            /^(0|[1-9]\d*)$/.test(key) &&
            Number(key) < length);
      })) {
        return { ok: false, value: null };
      }
      return { ok: true, value: result };
    }

    if (!isPlainRecord(value)) return { ok: false, value: null };
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
      const copied = cloneJsonValue(descriptor.value, nextAncestors);
      if (!copied.ok) return copied;
      define(result, key, copied.value);
    }
    return { ok: true, value: result };
  }

  function cloneJson(value) {
    return cloneJsonValue(value, new Set());
  }

  function cloneModel(model) {
    if (!isPlainRecord(model)) return { ok: false, value: {} };
    let keys;
    try {
      keys = Reflect.ownKeys(model);
    } catch (error) {
      return { ok: false, value: {} };
    }
    const result = {};
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (typeof key !== 'string') return { ok: false, value: {} };
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(model, key);
      } catch (error) {
        return { ok: false, value: {} };
      }
      if (!descriptor || descriptor.enumerable !== true ||
          !own(descriptor, 'value')) {
        return { ok: false, value: {} };
      }
      if (ACTION_KEYS.indexOf(key) >= 0) {
        define(result, key, descriptor.value);
        continue;
      }
      const copied = cloneJson(descriptor.value);
      if (!copied.ok) return { ok: false, value: {} };
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

  function safeInteger(value, minimum) {
    return Number.isSafeInteger(value) &&
      value >= (minimum == null ? 0 : minimum);
  }

  function validProgress(value) {
    const level = ownDataValue(value, 'level');
    const xp = ownDataValue(value, 'xp');
    return safeInteger(level, 1) &&
      level <= MAX_LEVEL &&
      safeInteger(xp, 0) &&
      (level < MAX_LEVEL || xp === 0);
  }

  function validRngState(value) {
    return Number.isInteger(value) &&
      value > 0 &&
      value <= MAX_RNG_STATE;
  }

  function requireRecord(record, key, label) {
    const value = ownDataValue(record, key);
    if (!isPlainRecord(value)) throw new TypeError(label + ' is required');
    return value;
  }

  function requireFunction(record, key, label) {
    const value = ownDataValue(record, key);
    if (typeof value !== 'function') {
      throw new TypeError(label + ' is required');
    }
    return value;
  }

  function copyCrops(content) {
    const source = requireRecord(content, 'CROPS', 'HomesteadContent.CROPS');
    const crops = {};
    Object.keys(source).forEach(function (cropId) {
      const raw = ownDataValue(source, cropId);
      if (!isPlainRecord(raw) ||
          ownDataValue(raw, 'id') !== cropId ||
          ownDataValue(raw, 'skillId') !== 'farming' ||
          ownDataValue(raw, 'masteryId') !== 'farming:' + cropId ||
          typeof ownDataValue(raw, 'name') !== 'string' ||
          !safeInteger(ownDataValue(raw, 'unlockLevel'), 1) ||
          ownDataValue(raw, 'unlockLevel') > MAX_LEVEL ||
          typeof ownDataValue(raw, 'growthSeconds') !== 'number' ||
          !Number.isFinite(ownDataValue(raw, 'growthSeconds')) ||
          ownDataValue(raw, 'growthSeconds') <= 0 ||
          !safeInteger(ownDataValue(raw, 'skillXp'), 1) ||
          !safeInteger(ownDataValue(raw, 'masteryXp'), 1)) {
        throw new TypeError('HomesteadContent.CROPS is invalid');
      }
      const seed = ownDataValue(raw, 'seed');
      const output = ownDataValue(raw, 'output');
      if (!isPlainRecord(seed) ||
          typeof ownDataValue(seed, 'itemId') !== 'string' ||
          !safeInteger(ownDataValue(seed, 'quantity'), 1) ||
          !isPlainRecord(output) ||
          typeof ownDataValue(output, 'itemId') !== 'string' ||
          !safeInteger(ownDataValue(output, 'quantity'), 1)) {
        throw new TypeError('HomesteadContent.CROPS is invalid');
      }
      define(crops, cropId, deepFreeze({
        id: cropId,
        skillId: 'farming',
        masteryId: 'farming:' + cropId,
        name: ownDataValue(raw, 'name'),
        unlockLevel: ownDataValue(raw, 'unlockLevel'),
        seed: {
          itemId: ownDataValue(seed, 'itemId'),
          quantity: ownDataValue(seed, 'quantity')
        },
        growthSeconds: ownDataValue(raw, 'growthSeconds'),
        skillXp: ownDataValue(raw, 'skillXp'),
        masteryXp: ownDataValue(raw, 'masteryXp'),
        output: {
          itemId: ownDataValue(output, 'itemId'),
          quantity: ownDataValue(output, 'quantity')
        }
      }));
    });
    if (Object.keys(crops).length === 0) {
      throw new TypeError('HomesteadContent.CROPS is invalid');
    }
    return deepFreeze(crops);
  }

  const crops = copyCrops(HomesteadContent);
  const inventoryApply = requireFunction(
    Inventory,
    'apply',
    'Inventory.apply'
  );
  const skillSpeedBonus = requireFunction(
    SkillProgression,
    'skillSpeedBonus',
    'SkillProgression.skillSpeedBonus'
  );
  const masterySpeedBonus = requireFunction(
    SkillProgression,
    'masterySpeedBonus',
    'SkillProgression.masterySpeedBonus'
  );
  const masteryYieldChance = requireFunction(
    SkillProgression,
    'masteryYieldOrRetentionChance',
    'SkillProgression.masteryYieldOrRetentionChance'
  );
  const addSkillXp = requireFunction(
    SkillProgression,
    'addSkillXp',
    'SkillProgression.addSkillXp'
  );
  const addMasteryXp = requireFunction(
    SkillProgression,
    'addMasteryXp',
    'SkillProgression.addMasteryXp'
  );
  const randomNext = requireFunction(
    GameRandom,
    'next',
    'GameRandom.next'
  );

  function safeBonus(source, key, maximum) {
    const value = ownDataValue(source, key);
    return typeof value === 'number' &&
      Number.isFinite(value) &&
      value > 0
      ? Math.min(maximum, value)
      : 0;
  }

  function modelParts(model) {
    const copied = cloneModel(model);
    if (!copied.ok || !isPlainRecord(copied.value)) {
      return { ok: false, state: copied.value };
    }
    const state = copied.value;
    const player = ownDataValue(state, 'player');
    const systems = ownDataValue(state, 'systems');
    const homestead = ownDataValue(systems, 'homestead');
    const farm = ownDataValue(homestead, 'farm');
    const plots = ownDataValue(farm, 'plots');
    const skills = ownDataValue(player, 'skills');
    const mastery = ownDataValue(player, 'mastery');
    const farmingMastery = ownDataValue(mastery, 'farming');
    const inventory = ownDataValue(player, 'inventory');
    const skill = ownDataValue(skills, 'farming');
    const unlockedPlots = ownDataValue(farm, 'unlockedPlots');
    if (!isPlainRecord(player) ||
        !isPlainRecord(systems) ||
        !isPlainRecord(homestead) ||
        !isPlainRecord(farm) ||
        !Array.isArray(plots) ||
        isDetectedProxy(plots) ||
        !isPlainRecord(skills) ||
        !isPlainRecord(mastery) ||
        !isPlainRecord(farmingMastery) ||
        !isPlainRecord(inventory) ||
        !validProgress(skill) ||
        !safeInteger(unlockedPlots, 0)) {
      return { ok: false, state: state };
    }
    return {
      ok: true,
      state: state,
      player: player,
      farm: farm,
      plots: plots,
      skills: skills,
      skill: skill,
      farmingMastery: farmingMastery,
      inventory: inventory,
      unlockedPlots: unlockedPlots
    };
  }

  function plotAt(parts, plotId) {
    if (typeof plotId !== 'string' || plotId.length === 0) return null;
    for (let index = 0; index < parts.plots.length; index++) {
      const plot = ownArrayDataValue(parts.plots, index);
      if (isPlainRecord(plot) &&
          ownDataValue(plot, 'id') === plotId) {
        return { plot: plot, index: index };
      }
    }
    return null;
  }

  function masteryFor(parts, cropId) {
    const progress = ownDataValue(parts.farmingMastery, cropId);
    return validProgress(progress) ? progress : null;
  }

  function plantFailure(code, state) {
    return { ok: false, code: code, state: state };
  }

  function callSpeedBonus(fn, level) {
    let value;
    try {
      value = fn(level);
    } catch (error) {
      return null;
    }
    return typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value < 1
      ? value
      : null;
  }

  function plant(model, plotId, cropId, bonuses) {
    const parts = modelParts(model);
    if (!parts.ok) return plantFailure('invalid_model', parts.state);
    const found = plotAt(parts, plotId);
    if (!found) return plantFailure('plot_not_found', parts.state);
    if (found.index >= parts.unlockedPlots) {
      return plantFailure('plot_locked', parts.state);
    }
    const crop = typeof cropId === 'string' && own(crops, cropId)
      ? crops[cropId]
      : null;
    if (!crop) return plantFailure('invalid_crop', parts.state);
    if (ownDataValue(found.plot, 'cropId') !== null ||
        ownDataValue(found.plot, 'ready') !== false ||
        ownDataValue(found.plot, 'remainingSeconds') !== 0 ||
        ownDataValue(found.plot, 'totalSeconds') !== 0) {
      return plantFailure('plot_occupied', parts.state);
    }
    if (parts.skill.level < crop.unlockLevel) {
      return plantFailure('skill_locked', parts.state);
    }
    const mastery = masteryFor(parts, cropId);
    if (!mastery) return plantFailure('invalid_model', parts.state);

    const skillBonus = callSpeedBonus(
      skillSpeedBonus,
      parts.skill.level
    );
    const masteryBonus = callSpeedBonus(
      masterySpeedBonus,
      mastery.level
    );
    if (skillBonus === null || masteryBonus === null) {
      return plantFailure('invalid_progression', parts.state);
    }
    const growthReduction = safeBonus(
      bonuses,
      'farmGrowthReduction',
      MAX_GROWTH_REDUCTION
    );
    const rawDuration = crop.growthSeconds *
      (1 - skillBonus) *
      (1 - masteryBonus) *
      (1 - growthReduction);
    const totalSeconds = Math.max(1, Math.round(rawDuration));
    if (!safeInteger(totalSeconds, 1)) {
      return plantFailure('invalid_duration', parts.state);
    }

    const delta = {};
    define(delta, crop.seed.itemId, -crop.seed.quantity);
    let inventoryResult;
    try {
      inventoryResult = inventoryApply(parts.inventory, delta);
    } catch (error) {
      return plantFailure('invalid_inventory', parts.state);
    }
    if (!isPlainRecord(inventoryResult) ||
        ownDataValue(inventoryResult, 'ok') !== true) {
      const code = isPlainRecord(inventoryResult) &&
        (
          ownDataValue(inventoryResult, 'code') ===
            'insufficient_items' ||
          ownDataValue(inventoryResult, 'code') === 'item_bound'
        )
        ? 'insufficient_seed'
        : 'invalid_inventory';
      return plantFailure(code, parts.state);
    }
    const nextInventory = cloneJson(
      ownDataValue(inventoryResult, 'value')
    );
    if (!nextInventory.ok || !isPlainRecord(nextInventory.value)) {
      return plantFailure('invalid_inventory', parts.state);
    }

    define(parts.player, 'inventory', nextInventory.value);
    parts.plots[found.index] = {
      id: plotId,
      cropId: cropId,
      remainingSeconds: totalSeconds,
      totalSeconds: totalSeconds,
      ready: false,
      remainingAnchorMs: 0,
      remainingBaseSeconds: 0
    };
    const costs = {};
    define(costs, crop.seed.itemId, crop.seed.quantity);
    return {
      ok: true,
      code: 'ok',
      state: parts.state,
      result: {
        plotId: plotId,
        cropId: cropId,
        totalSeconds: totalSeconds
      },
      costs: { items: costs }
    };
  }

  function emptyCompleted(state) {
    return { state: state, completed: [] };
  }

  function readPlotAccount(plot, totalSeconds, remainingSeconds) {
    const anchorMs = ownDataValue(plot, 'remainingAnchorMs');
    const baseSeconds = ownDataValue(plot, 'remainingBaseSeconds');
    if (typeof anchorMs === 'number' &&
        Number.isFinite(anchorMs) &&
        anchorMs >= 0 &&
        typeof baseSeconds === 'number' &&
        Number.isFinite(baseSeconds) &&
        baseSeconds >= 0) {
      const elapsed = anchorMs / 1000 + baseSeconds;
      const projection = Math.max(0, totalSeconds - elapsed);
      if (projection === remainingSeconds) {
        return { anchorMs: anchorMs, baseSeconds: baseSeconds };
      }
    }
    return {
      anchorMs: 0,
      baseSeconds: Math.max(0, totalSeconds - remainingSeconds)
    };
  }

  function advance(model, elapsedSeconds) {
    const copied = cloneModel(model);
    if (!copied.ok) return emptyCompleted(copied.value);
    if (typeof elapsedSeconds !== 'number' ||
        !Number.isFinite(elapsedSeconds) ||
        elapsedSeconds <= 0) {
      return emptyCompleted(copied.value);
    }
    const state = copied.value;
    const systems = ownDataValue(state, 'systems');
    const homestead = ownDataValue(systems, 'homestead');
    const farm = ownDataValue(homestead, 'farm');
    const plots = ownDataValue(farm, 'plots');
    if (!isPlainRecord(systems) ||
        !isPlainRecord(homestead) ||
        !isPlainRecord(farm) ||
        !Array.isArray(plots) ||
        isDetectedProxy(plots)) {
      return emptyCompleted(state);
    }

    const completed = [];
    for (let index = 0; index < plots.length; index++) {
      const plot = ownArrayDataValue(plots, index);
      if (!isPlainRecord(plot) ||
          ownDataValue(plot, 'ready') === true) {
        continue;
      }
      const cropId = ownDataValue(plot, 'cropId');
      if (typeof cropId !== 'string' || !own(crops, cropId)) continue;
      const totalSeconds = ownDataValue(plot, 'totalSeconds');
      const remainingSeconds = ownDataValue(plot, 'remainingSeconds');
      if (typeof totalSeconds !== 'number' ||
          !Number.isFinite(totalSeconds) ||
          totalSeconds <= 0 ||
          typeof remainingSeconds !== 'number' ||
          !Number.isFinite(remainingSeconds) ||
          remainingSeconds < 0 ||
          remainingSeconds > totalSeconds) {
        continue;
      }
      const account = readPlotAccount(
        plot,
        totalSeconds,
        remainingSeconds
      );
      const baseSeconds = account.baseSeconds + elapsedSeconds;
      const elapsedTotal = account.anchorMs / 1000 + baseSeconds;
      if (elapsedTotal >= totalSeconds) {
        plot.remainingSeconds = 0;
        plot.ready = true;
        plot.remainingAnchorMs = totalSeconds * 1000;
        plot.remainingBaseSeconds = 0;
        completed.push({
          plotId: ownDataValue(plot, 'id'),
          cropId: cropId
        });
      } else {
        plot.remainingSeconds = totalSeconds - elapsedTotal;
        plot.remainingAnchorMs = account.anchorMs;
        plot.remainingBaseSeconds = baseSeconds;
      }
    }
    return { state: state, completed: completed };
  }

  function harvestFailure(code, state, rngState) {
    return {
      ok: false,
      code: code,
      state: state,
      rngState: rngState
    };
  }

  function plannedProgress(fn, progress, amount) {
    if (!validProgress(progress) || !safeInteger(amount, 1)) return null;
    if (progress.level < MAX_LEVEL) {
      const sum = progress.xp + amount;
      if (!safeInteger(sum, 0) || sum - amount !== progress.xp) {
        return null;
      }
    }
    let result;
    try {
      result = fn({
        level: progress.level,
        xp: progress.xp
      }, amount);
    } catch (error) {
      return null;
    }
    const value = ownDataValue(result, 'value');
    if (!validProgress(value)) return null;
    return { level: value.level, xp: value.xp };
  }

  function draw(rngState) {
    let rolled;
    try {
      rolled = randomNext(rngState);
    } catch (error) {
      return null;
    }
    const seed = ownDataValue(rolled, 'seed');
    const value = ownDataValue(rolled, 'value');
    return validRngState(seed) &&
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value < 1
      ? { rngState: seed, value: value }
      : null;
  }

  function harvest(model, plotId, rngState, bonuses) {
    const parts = modelParts(model);
    if (!parts.ok) {
      return harvestFailure('invalid_model', parts.state, rngState);
    }
    const found = plotAt(parts, plotId);
    if (!found) {
      return harvestFailure('plot_not_found', parts.state, rngState);
    }
    const cropId = ownDataValue(found.plot, 'cropId');
    const crop = typeof cropId === 'string' && own(crops, cropId)
      ? crops[cropId]
      : null;
    if (!crop ||
        ownDataValue(found.plot, 'ready') !== true ||
        ownDataValue(found.plot, 'remainingSeconds') !== 0) {
      return harvestFailure('crop_not_ready', parts.state, rngState);
    }
    const mastery = masteryFor(parts, cropId);
    if (!mastery) {
      return harvestFailure('invalid_model', parts.state, rngState);
    }
    if (!validRngState(rngState)) {
      return harvestFailure('invalid_rng', parts.state, rngState);
    }
    const nextSkill = plannedProgress(
      addSkillXp,
      parts.skill,
      crop.skillXp
    );
    const nextMastery = plannedProgress(
      addMasteryXp,
      mastery,
      crop.masteryXp
    );
    if (!nextSkill || !nextMastery) {
      return harvestFailure(
        'invalid_progression',
        parts.state,
        rngState
      );
    }

    const rolled = draw(rngState);
    if (!rolled) {
      return harvestFailure('invalid_rng', parts.state, rngState);
    }
    let masteryChance;
    try {
      masteryChance = masteryYieldChance(mastery.level);
    } catch (error) {
      masteryChance = 0;
    }
    if (typeof masteryChance !== 'number' ||
        !Number.isFinite(masteryChance) ||
        masteryChance < 0) {
      masteryChance = 0;
    }
    const chance = Math.min(
      MAX_EXTRA_YIELD_CHANCE,
      masteryChance + safeBonus(
        bonuses,
        'farmExtraYieldChance',
        MAX_EXTRA_YIELD_CHANCE
      )
    );
    const extraYield = rolled.value < chance;
    const quantity = crop.output.quantity * (extraYield ? 2 : 1);
    if (!safeInteger(quantity, 1)) {
      return harvestFailure(
        'invalid_inventory',
        parts.state,
        rolled.rngState
      );
    }
    const delta = {};
    define(delta, crop.output.itemId, quantity);
    let inventoryResult;
    try {
      inventoryResult = inventoryApply(parts.inventory, delta);
    } catch (error) {
      return harvestFailure(
        'invalid_inventory',
        parts.state,
        rolled.rngState
      );
    }
    if (!isPlainRecord(inventoryResult) ||
        ownDataValue(inventoryResult, 'ok') !== true) {
      const code = isPlainRecord(inventoryResult) &&
        ownDataValue(inventoryResult, 'code') === 'inventory_full'
        ? 'inventory_full'
        : 'invalid_inventory';
      return harvestFailure(code, parts.state, rolled.rngState);
    }
    const nextInventory = cloneJson(
      ownDataValue(inventoryResult, 'value')
    );
    if (!nextInventory.ok || !isPlainRecord(nextInventory.value)) {
      return harvestFailure(
        'invalid_inventory',
        parts.state,
        rolled.rngState
      );
    }

    define(parts.player, 'inventory', nextInventory.value);
    define(parts.skills, 'farming', nextSkill);
    define(parts.farmingMastery, cropId, nextMastery);
    parts.plots[found.index] = {
      id: plotId,
      cropId: null,
      remainingSeconds: 0,
      totalSeconds: 0,
      ready: false,
      remainingAnchorMs: null,
      remainingBaseSeconds: null
    };
    const itemGains = {};
    const skillGains = {};
    const masteryGains = {};
    define(itemGains, crop.output.itemId, quantity);
    define(skillGains, 'farming', crop.skillXp);
    define(masteryGains, crop.masteryId, crop.masteryXp);
    return {
      ok: true,
      code: 'ok',
      state: parts.state,
      rngState: rolled.rngState,
      result: {
        plotId: plotId,
        cropId: cropId,
        quantity: quantity,
        extraYield: extraYield
      },
      gains: {
        items: itemGains,
        skillXp: skillGains,
        masteryXp: masteryGains,
        cultivation: 0
      }
    };
  }

  function fallbackQueryParts(model) {
    const copied = cloneModel(model);
    if (!copied.ok) return null;
    const state = copied.value;
    const player = ownDataValue(state, 'player');
    const systems = ownDataValue(state, 'systems');
    const homestead = ownDataValue(systems, 'homestead');
    const farm = ownDataValue(homestead, 'farm');
    const plots = ownDataValue(farm, 'plots');
    const skills = ownDataValue(player, 'skills');
    const mastery = ownDataValue(player, 'mastery');
    const farmingMastery = ownDataValue(mastery, 'farming');
    const inventory = ownDataValue(player, 'inventory');
    const stacks = ownDataValue(inventory, 'stacks');
    const skill = ownDataValue(skills, 'farming');
    if (!isPlainRecord(player) ||
        !isPlainRecord(systems) ||
        !isPlainRecord(homestead) ||
        !isPlainRecord(farm) ||
        !Array.isArray(plots) ||
        !isPlainRecord(skills) ||
        !isPlainRecord(mastery) ||
        !isPlainRecord(farmingMastery) ||
        !isPlainRecord(inventory) ||
        !isPlainRecord(stacks) ||
        !validProgress(skill)) {
      return null;
    }
    return {
      plots: plots,
      unlockedPlots: safeInteger(
        ownDataValue(farm, 'unlockedPlots'),
        0
      )
        ? ownDataValue(farm, 'unlockedPlots')
        : 0,
      skill: skill,
      farmingMastery: farmingMastery,
      stacks: stacks
    };
  }

  function ownedCount(stacks, itemId) {
    const value = ownDataValue(stacks, itemId);
    return safeInteger(value, 0) ? value : 0;
  }

  function query(model) {
    const parts = fallbackQueryParts(model);
    const plots = [];
    const cropRows = [];
    const skillLevel = parts ? parts.skill.level : 1;
    const stacks = parts ? parts.stacks : {};
    const mastery = parts ? parts.farmingMastery : {};
    const unlockedPlots = parts ? parts.unlockedPlots : 0;

    if (parts) {
      for (let index = 0; index < parts.plots.length; index++) {
        const source = ownArrayDataValue(parts.plots, index);
        if (!isPlainRecord(source)) continue;
        const cropId = ownDataValue(source, 'cropId');
        const crop = typeof cropId === 'string' && own(crops, cropId)
          ? crops[cropId]
          : null;
        const total = typeof ownDataValue(source, 'totalSeconds') ===
            'number' &&
          Number.isFinite(ownDataValue(source, 'totalSeconds')) &&
          ownDataValue(source, 'totalSeconds') > 0
          ? ownDataValue(source, 'totalSeconds')
          : 0;
        const remainingRaw = typeof ownDataValue(
          source,
          'remainingSeconds'
        ) === 'number' &&
          Number.isFinite(ownDataValue(source, 'remainingSeconds'))
          ? ownDataValue(source, 'remainingSeconds')
          : 0;
        const remaining = Math.min(total, Math.max(0, remainingRaw));
        const ready = !!crop &&
          ownDataValue(source, 'ready') === true &&
          remaining === 0;
        plots.push({
          plotId: typeof ownDataValue(source, 'id') === 'string'
            ? ownDataValue(source, 'id')
            : 'plot-' + (index + 1),
          unlocked: index < unlockedPlots,
          cropId: crop ? crop.id : null,
          cropName: crop ? crop.name : null,
          remainingSeconds: remaining,
          totalSeconds: total,
          ready: ready,
          progress: ready
            ? 1
            : total > 0
              ? Math.min(1, Math.max(0, (total - remaining) / total))
              : 0,
          seedItemId: crop ? crop.seed.itemId : null,
          seedOwned: crop ? ownedCount(stacks, crop.seed.itemId) : 0,
          unlockLevel: crop ? crop.unlockLevel : null
        });
      }
    }

    Object.keys(crops).forEach(function (cropId) {
      const crop = crops[cropId];
      const progress = ownDataValue(mastery, cropId);
      cropRows.push({
        cropId: cropId,
        name: crop.name,
        unlockLevel: crop.unlockLevel,
        unlocked: skillLevel >= crop.unlockLevel,
        seedItemId: crop.seed.itemId,
        seedRequired: crop.seed.quantity,
        seedOwned: ownedCount(stacks, crop.seed.itemId),
        growthSeconds: crop.growthSeconds,
        baseHarvest: crop.output.quantity,
        masteryLevel: validProgress(progress) ? progress.level : 1
      });
    });

    return deepFreeze({
      unlockedPlots: unlockedPlots,
      farmingLevel: skillLevel,
      plots: plots,
      plantableCrops: cropRows
    });
  }

  return Object.freeze({
    plant: plant,
    advance: advance,
    harvest: harvest,
    query: query
  });
});
