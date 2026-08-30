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
    root.Gathering = factory(null);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  proxyDetector
) {
  'use strict';

  const RESOURCE_SKILLS = Object.freeze([
    'herb', 'mining', 'woodcutting'
  ]);
  const FISHING_SKILL = 'fishing';
  const JUNK_IMMUNITY_MASTERY = 65;
  const JUNK_SKILL_XP = 1;
  const MAX_EXTRA_YIELD_CHANCE = 0.75;
  const MAX_RECOVERY_REDUCTION = 0.40;
  const MAX_RNG_STATE = 0xFFFFFFFF;

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function isPlainRecord(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
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

  function define(target, key, value) {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }

  function isFiniteNonNegative(value) {
    return typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0;
  }

  function decimalParts(value) {
    const pieces = value.toString().toLowerCase().split('e');
    const coefficient = pieces[0];
    const scientificExponent = pieces.length > 1
      ? Number(pieces[1])
      : 0;
    const decimalAt = coefficient.indexOf('.');
    const fractionalDigits = decimalAt < 0
      ? 0
      : coefficient.length - decimalAt - 1;
    return {
      units: BigInt(coefficient.replace('.', '')),
      exponent: scientificExponent - fractionalDigits
    };
  }

  function decimalOperation(left, right, operation) {
    const leftParts = decimalParts(left);
    const rightParts = decimalParts(right);
    const exponent = Math.min(leftParts.exponent, rightParts.exponent);
    const leftUnits = leftParts.units *
      (10n ** BigInt(leftParts.exponent - exponent));
    const rightUnits = rightParts.units *
      (10n ** BigInt(rightParts.exponent - exponent));
    const units = operation === 'add'
      ? leftUnits + rightUnits
      : leftUnits - rightUnits;
    return Number(units.toString() + 'e' + exponent);
  }

  function addDecimalNumbers(left, right) {
    return decimalOperation(left, right, 'add');
  }

  function subtractDecimalNumbers(left, right) {
    return decimalOperation(left, right, 'subtract');
  }

  function multiplyDecimalByInteger(value, multiplier) {
    const parts = decimalParts(value);
    return Number(
      (parts.units * BigInt(multiplier)).toString() +
      'e' + parts.exponent
    );
  }

  function isSafeNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function isProgress(value) {
    return isPlainRecord(value) &&
      Number.isSafeInteger(ownDataValue(value, 'level')) &&
      ownDataValue(value, 'level') >= 1 &&
      ownDataValue(value, 'level') <= 99 &&
      isSafeNonNegativeInteger(ownDataValue(value, 'xp'));
  }

  function cloneJsonValue(value, ancestors) {
    if (value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean') {
      return { ok: true, value };
    }
    if (typeof value === 'number') {
      return Number.isFinite(value)
        ? { ok: true, value }
        : { ok: false, value: null };
    }
    if (typeof value !== 'object') {
      return { ok: false, value: null };
    }

    let prototype;
    try {
      prototype = Object.getPrototypeOf(value);
    } catch (error) {
      return { ok: false, value: null };
    }

    const isArray = Array.isArray(value);
    if (isArray) {
      if (prototype !== Array.prototype || ancestors.has(value)) {
        return { ok: false, value: null };
      }
      let keys;
      try {
        keys = Reflect.ownKeys(value);
      } catch (error) {
        return { ok: false, value: null };
      }
      if (keys.some(function (key) {
        return typeof key !== 'string' ||
          (key !== 'length' && !/^(0|[1-9]\d*)$/.test(key));
      })) {
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
      if (length === null) return { ok: false, value: null };
      const nextAncestors = new Set(ancestors);
      nextAncestors.add(value);
      const result = [];
      for (let index = 0; index < length; index++) {
        let descriptor;
        try {
          descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        } catch (error) {
          return { ok: false, value: null };
        }
        if (!descriptor || !descriptor.enumerable ||
            !own(descriptor, 'value')) {
          return { ok: false, value: null };
        }
        const cloned = cloneJsonValue(descriptor.value, nextAncestors);
        if (!cloned.ok) return cloned;
        result.push(cloned.value);
      }
      return { ok: true, value: result };
    }

    if ((prototype !== null && prototype !== Object.prototype) ||
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
    const result = {};
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
      if (!descriptor || !descriptor.enumerable ||
          !own(descriptor, 'value')) {
        return { ok: false, value: null };
      }
      const cloned = cloneJsonValue(descriptor.value, nextAncestors);
      if (!cloned.ok) return cloned;
      define(result, key, cloned.value);
    }
    return { ok: true, value: result };
  }

  function cloneJson(value) {
    return cloneJsonValue(value, new Set());
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
    let arrayValue;
    let keys;
    try {
      prototype = Object.getPrototypeOf(value);
      arrayValue = Array.isArray(value);
      keys = Reflect.ownKeys(value);
    } catch (error) {
      throw new TypeError('dependency reflection failed');
    }
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(value);

    if (arrayValue) {
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

  function requireSafeInteger(record, key, label, minimum) {
    const value = ownDataValue(record, key);
    if (!Number.isSafeInteger(value) || value < minimum) {
      throw new TypeError(label + ' must be a safe integer');
    }
    return value;
  }

  function requireFinite(record, key, label, minimum, maximum) {
    const value = ownDataValue(record, key);
    if (typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < minimum ||
        (maximum != null && value > maximum)) {
      throw new TypeError(label + ' must be finite and in range');
    }
    return value;
  }

  function copyDrop(raw, label) {
    if (!isPlainRecord(raw)) {
      throw new TypeError(label + ' must be a plain object');
    }
    return {
      itemId: requireString(raw, 'itemId', label + '.itemId'),
      w: requireFinite(raw, 'w', label + '.w', Number.MIN_VALUE),
      q: requireSafeInteger(raw, 'q', label + '.q', 1)
    };
  }

  function copyEntry(raw, label) {
    if (!isPlainRecord(raw)) {
      throw new TypeError(label + ' must be a plain object');
    }
    const drops = ownDataValue(raw, 'drops');
    if (!Array.isArray(drops) || drops.length === 0) {
      throw new TypeError(label + '.drops must be a non-empty array');
    }
    const capMin = requireSafeInteger(raw, 'capMin', label + '.capMin', 1);
    const capMax = requireSafeInteger(raw, 'capMax', label + '.capMax', 1);
    if (capMax < capMin) {
      throw new TypeError(label + '.capMax must be at least capMin');
    }
    return {
      id: requireString(raw, 'id', label + '.id'),
      masteryId: requireString(
        raw,
        'masteryId',
        label + '.masteryId'
      ),
      unlockLevel: requireSafeInteger(
        raw,
        'unlockLevel',
        label + '.unlockLevel',
        1
      ),
      xp: requireSafeInteger(raw, 'xp', label + '.xp', 0),
      capMin,
      capMax,
      drops: drops.map(function (drop, index) {
        return copyDrop(drop, label + '.drops[' + index + ']');
      })
    };
  }

  function copyFishingSpot(raw, label) {
    if (!isPlainRecord(raw)) {
      throw new TypeError(label + ' must be a plain object');
    }
    const drops = ownDataValue(raw, 'drops');
    if (!Array.isArray(drops) || drops.length === 0) {
      throw new TypeError(label + '.drops must be a non-empty array');
    }
    const spotId = requireString(raw, 'id', label + '.id');
    const masteryId = requireString(raw, 'masteryId', label + '.masteryId');
    if (masteryId !== FISHING_SKILL + ':' + spotId) {
      throw new TypeError(label + '.masteryId is not canonical');
    }
    const unlockFlag = ownDataValue(raw, 'unlockFlag');
    const fishChance = own(raw, 'fishChance')
      ? requireFinite(raw, 'fishChance', label + '.fishChance', 0)
      : 100;
    const junkChance = own(raw, 'junkChance')
      ? requireFinite(raw, 'junkChance', label + '.junkChance', 0)
      : 0;
    const specialChance = own(raw, 'specialChance')
      ? requireFinite(raw, 'specialChance', label + '.specialChance', 0)
      : 0;
    return {
      id: spotId,
      masteryId: masteryId,
      unlockLevel: requireSafeInteger(
        raw,
        'unlockLevel',
        label + '.unlockLevel',
        1
      ),
      time: requireFinite(raw, 'time', label + '.time', Number.MIN_VALUE),
      xp: requireSafeInteger(raw, 'xp', label + '.xp', 0),
      fishChance: fishChance,
      junkChance: junkChance,
      specialChance: specialChance,
      unlockFlag: typeof unlockFlag === 'string' && unlockFlag
        ? unlockFlag
        : null,
      drops: drops.map(function (drop, index) {
        return copyDrop(drop, label + '.drops[' + index + ']');
      })
    };
  }

  function copyWeightedPool(raw, label) {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new TypeError(label + ' must be a non-empty array');
    }
    return raw.map(function (entry, index) {
      if (!isPlainRecord(entry)) {
        throw new TypeError(label + '[' + index + '] must be a plain object');
      }
      return {
        itemId: requireString(entry, 'itemId', label + '[' + index + '].itemId'),
        w: requireSafeInteger(entry, 'w', label + '[' + index + '].w', 1)
      };
    });
  }

  function copyFishSpecies(raw, speciesId, label) {
    if (!isPlainRecord(raw)) {
      throw new TypeError(label + ' must be a plain object');
    }
    const copiedId = requireString(raw, 'id', label + '.id');
    const masteryId = requireString(raw, 'masteryId', label + '.masteryId');
    if (copiedId !== speciesId ||
        masteryId !== FISHING_SKILL + ':' + speciesId) {
      throw new TypeError(label + ' has a non-canonical ID');
    }
    return {
      id: copiedId,
      masteryId,
      maxStock: requireSafeInteger(
        raw,
        'maxStock',
        label + '.maxStock',
        1
      ),
      recoverSeconds: requireSafeInteger(
        raw,
        'recoverSeconds',
        label + '.recoverSeconds',
        1
      )
    };
  }

  function copyExplore(raw, skillId, label) {
    if (!isPlainRecord(raw)) {
      throw new TypeError(label + ' must be a plain object');
    }
    const masteryId = requireString(raw, 'masteryId', label + '.masteryId');
    if (masteryId !== 'explore:' + skillId) {
      throw new TypeError(label + '.masteryId is not canonical');
    }
    return {
      masteryId,
      skillXp: requireSafeInteger(raw, 'skillXp', label + '.skillXp', 0),
      masteryXp: requireSafeInteger(
        raw,
        'masteryXp',
        label + '.masteryXp',
        0
      ),
      cultivation: requireSafeInteger(
        raw,
        'cultivation',
        label + '.cultivation',
        0
      )
    };
  }

  function copyGatheringContent(source) {
    const gathering = requireRecord(
      source,
      'GATHERING',
      'deps.GatheringContent.GATHERING'
    );
    const copied = {
      families: {},
      spotCaps: [],
      discoverGainMin: 10,
      discoverGainMax: 20,
      fishing: {
        spots: [],
        species: {},
        junkPool: [],
        specialPool: [],
        junkImmunityMastery: JUNK_IMMUNITY_MASTERY,
        junkSkillXp: JUNK_SKILL_XP
      }
    };

    const rawCaps = ownDataValue(source, 'RESOURCE_SPOT_CAPS');
    if (Array.isArray(rawCaps)) {
      rawCaps.forEach(function (row) {
        if (!isPlainRecord(row)) return;
        const minLevel = ownDataValue(row, 'minLevel');
        const maxCapacity = ownDataValue(row, 'maxCapacity');
        if (!Number.isSafeInteger(minLevel) || minLevel < 1) return;
        if (!Number.isSafeInteger(maxCapacity) || maxCapacity < 1) return;
        copied.spotCaps.push({
          minLevel: minLevel,
          maxCapacity: maxCapacity
        });
      });
    }
    if (!copied.spotCaps.length) {
      copied.spotCaps = [
        { minLevel: 1, maxCapacity: 50 },
        { minLevel: 25, maxCapacity: 60 },
        { minLevel: 50, maxCapacity: 70 },
        { minLevel: 75, maxCapacity: 80 },
        { minLevel: 90, maxCapacity: 90 }
      ];
    }
    const gainMin = ownDataValue(source, 'DISCOVER_GAIN_MIN');
    const gainMax = ownDataValue(source, 'DISCOVER_GAIN_MAX');
    if (Number.isSafeInteger(gainMin) && gainMin >= 1) {
      copied.discoverGainMin = gainMin;
    }
    if (Number.isSafeInteger(gainMax) && gainMax >= copied.discoverGainMin) {
      copied.discoverGainMax = gainMax;
    }

    RESOURCE_SKILLS.forEach(function (skillId) {
      const family = requireRecord(
        gathering,
        skillId,
        'GATHERING.' + skillId
      );
      const rawEntries = ownDataValue(family, 'entries');
      if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
        throw new TypeError(
          'GATHERING.' + skillId + '.entries must be a non-empty array'
        );
      }
      const entries = rawEntries.map(function (entry, index) {
        return copyEntry(
          entry,
          'GATHERING.' + skillId + '.entries[' + index + ']'
        );
      });
      const ids = new Set();
      entries.forEach(function (entry) {
        if (ids.has(entry.id)) {
          throw new TypeError(
            'GATHERING.' + skillId + ' has duplicate entry IDs'
          );
        }
        ids.add(entry.id);
      });
      define(copied.families, skillId, {
        explore: copyExplore(
          ownDataValue(family, 'explore'),
          skillId,
          'GATHERING.' + skillId + '.explore'
        ),
        entries
      });
    });

    const fishing = requireRecord(
      gathering,
      FISHING_SKILL,
      'GATHERING.fishing'
    );
    const rawFishingSpots = ownDataValue(fishing, 'spots');
    if (!Array.isArray(rawFishingSpots) || rawFishingSpots.length === 0) {
      throw new TypeError(
        'GATHERING.fishing.spots must be a non-empty array'
      );
    }
    copied.fishing.spots = rawFishingSpots.map(function (spot, index) {
      return copyFishingSpot(
        spot,
        'GATHERING.fishing.spots[' + index + ']'
      );
    });
    const spotIds = new Set();
    copied.fishing.spots.forEach(function (spot) {
      if (spotIds.has(spot.id)) {
        throw new TypeError('GATHERING.fishing has duplicate spot IDs');
      }
      spotIds.add(spot.id);
    });

    const rawSpecies = requireRecord(
      source,
      'FISH_SPECIES',
      'deps.GatheringContent.FISH_SPECIES'
    );
    const speciesIds = Object.keys(rawSpecies);
    if (speciesIds.length === 0) {
      throw new TypeError('FISH_SPECIES must not be empty');
    }
    speciesIds.forEach(function (speciesId) {
      define(
        copied.fishing.species,
        speciesId,
        copyFishSpecies(
          ownDataValue(rawSpecies, speciesId),
          speciesId,
          'FISH_SPECIES.' + speciesId
        )
      );
    });
    copied.fishing.spots.forEach(function (spot) {
      spot.drops.forEach(function (drop) {
        if (!own(copied.fishing.species, drop.itemId)) {
          throw new TypeError(
            'fishing spot references an unknown species'
          );
        }
      });
    });

    const rawJunk = ownDataValue(source, 'JUNK_POOL');
    const rawSpecial = ownDataValue(source, 'SPECIAL_POOL');
    if (Array.isArray(rawJunk) && rawJunk.length) {
      copied.fishing.junkPool = copyWeightedPool(rawJunk, 'JUNK_POOL');
    } else {
      copied.fishing.junkPool = [
        { itemId: 'oldBoot', w: 1 }
      ];
    }
    if (Array.isArray(rawSpecial) && rawSpecial.length) {
      copied.fishing.specialPool = copyWeightedPool(
        rawSpecial,
        'SPECIAL_POOL'
      );
    } else {
      copied.fishing.specialPool = [
        { itemId: 'sunkenCasket', w: 1 }
      ];
    }
    const parity = ownDataValue(source, 'FISHING_PARITY');
    if (isPlainRecord(parity)) {
      if (Number.isSafeInteger(ownDataValue(parity, 'JUNK_IMMUNITY_MASTERY'))) {
        copied.fishing.junkImmunityMastery =
          ownDataValue(parity, 'JUNK_IMMUNITY_MASTERY');
      }
      if (Number.isSafeInteger(ownDataValue(parity, 'JUNK_SKILL_XP'))) {
        copied.fishing.junkSkillXp =
          ownDataValue(parity, 'JUNK_SKILL_XP');
      }
    }
    return deepFreeze(copied);
  }

  function isResourceSkill(skillId) {
    return RESOURCE_SKILLS.indexOf(skillId) >= 0;
  }

  function asSpotList(value) {
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value.filter(function (row) {
        return isPlainRecord(row);
      });
    }
    if (isPlainRecord(value)) return [value];
    return [];
  }

  function maxSpotCapacityForLevel(content, skillLevel) {
    const level = Number(skillLevel);
    const safeLevel = Number.isFinite(level) && level > 0
      ? Math.floor(level)
      : 1;
    const caps = Array.isArray(content.spotCaps) ? content.spotCaps : [];
    let max = 50;
    caps.forEach(function (row) {
      if (safeLevel >= row.minLevel) max = row.maxCapacity;
    });
    return Math.max(1, max);
  }

  function discoverGainForRoll(content, rollValue) {
    const minimum = Number.isSafeInteger(content.discoverGainMin)
      ? content.discoverGainMin
      : 10;
    const maximum = Number.isSafeInteger(content.discoverGainMax) &&
      content.discoverGainMax >= minimum
      ? content.discoverGainMax
      : Math.max(minimum, 20);
    const unit = Number(rollValue);
    const safeUnit = Number.isFinite(unit) && unit >= 0 && unit < 1
      ? unit
      : 0;
    return minimum + Math.floor(safeUnit * (maximum - minimum + 1));
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

  function failure(code, state, rngState) {
    return {
      ok: false,
      code,
      state,
      rngState,
      result: null,
      gains: emptyGains()
    };
  }

  function safeFailureState(model) {
    const cloned = cloneJson(model);
    return cloned.ok ? cloned.value : null;
  }

  function checkedModel(model, skillId, masteryId) {
    const cloned = cloneJson(model);
    if (!cloned.ok || !isPlainRecord(cloned.value)) {
      return { ok: false, state: safeFailureState(model) };
    }
    const state = cloned.value;
    const player = ownDataValue(state, 'player');
    const systems = ownDataValue(state, 'systems');
    const skills = ownDataValue(player, 'skills');
    const mastery = ownDataValue(player, 'mastery');
    const inventory = ownDataValue(player, 'inventory');
    const gathering = ownDataValue(systems, 'gathering');
    const spots = ownDataValue(gathering, 'spots');
    const skillProgress = ownDataValue(skills, skillId);
    const skillMastery = ownDataValue(mastery, skillId);
    const masteryProgress = ownDataValue(skillMastery, masteryId);
    const nextSpotId = ownDataValue(gathering, 'nextSpotId');
    const cultivation = ownDataValue(player, 'xiwei');

    if (!isPlainRecord(player) ||
        !isPlainRecord(systems) ||
        !isPlainRecord(skills) ||
        !isPlainRecord(mastery) ||
        !isPlainRecord(inventory) ||
        !isPlainRecord(gathering) ||
        !isPlainRecord(spots) ||
        !isProgress(skillProgress) ||
        !isPlainRecord(skillMastery) ||
        !isProgress(masteryProgress) ||
        !Number.isSafeInteger(nextSpotId) ||
        nextSpotId < 1 ||
        nextSpotId >= Number.MAX_SAFE_INTEGER ||
        (cultivation !== undefined && !isFiniteNonNegative(cultivation))) {
      return { ok: false, state };
    }

    return {
      ok: true,
      state,
      player,
      gathering,
      spots,
      skillProgress,
      skillMastery,
      masteryProgress
    };
  }

  function checkedFishingModel(model, content) {
    const cloned = cloneJson(model);
    if (!cloned.ok || !isPlainRecord(cloned.value)) {
      return { ok: false, state: safeFailureState(model) };
    }
    const state = cloned.value;
    const player = ownDataValue(state, 'player');
    const systems = ownDataValue(state, 'systems');
    const skills = ownDataValue(player, 'skills');
    const mastery = ownDataValue(player, 'mastery');
    const inventory = ownDataValue(player, 'inventory');
    const gathering = ownDataValue(systems, 'gathering');
    const fishStocks = ownDataValue(gathering, 'fishStocks');
    const skillProgress = ownDataValue(skills, FISHING_SKILL);
    const skillMastery = ownDataValue(mastery, FISHING_SKILL);
    const accumulator = ownDataValue(gathering, 'fishRecoverAcc');
    const timePair = fishTimePair(gathering);
    const cultivation = ownDataValue(player, 'xiwei');
    const speciesIds = Object.keys(content.fishing.species);
    const spotIds = content.fishing.spots.map(function (spot) {
      return spot.id;
    });

    if (!isPlainRecord(player) ||
        !isPlainRecord(systems) ||
        !isPlainRecord(skills) ||
        !isPlainRecord(mastery) ||
        !isPlainRecord(inventory) ||
        !isPlainRecord(gathering) ||
        !isPlainRecord(fishStocks) ||
        !isProgress(skillProgress) ||
        !isPlainRecord(skillMastery) ||
        !isFiniteNonNegative(accumulator) ||
        !timePair.ok ||
        (cultivation !== undefined && !isFiniteNonNegative(cultivation)) ||
        Object.keys(fishStocks).length !== speciesIds.length ||
        Object.keys(skillMastery).length !== spotIds.length) {
      return { ok: false, state };
    }

    for (let index = 0; index < speciesIds.length; index++) {
      const speciesId = speciesIds[index];
      const species = content.fishing.species[speciesId];
      const stock = ownDataValue(fishStocks, speciesId);
      if (!Number.isSafeInteger(stock) ||
          stock < 0 ||
          stock > species.maxStock) {
        return { ok: false, state };
      }
    }

    for (let index = 0; index < spotIds.length; index++) {
      const spotId = spotIds[index];
      const progress = ownDataValue(skillMastery, spotId);
      if (!isProgress(progress)) {
        return { ok: false, state };
      }
    }

    return {
      ok: true,
      state,
      player,
      gathering,
      fishStocks,
      skillProgress,
      skillMastery
    };
  }

  function pointMatches(point, skillId, entryId) {
    if (point === null) return { ok: true, exists: false };
    if (!isPlainRecord(point) ||
        ownDataValue(point, 'skillId') !== skillId ||
        typeof ownDataValue(point, 'entryId') !== 'string' ||
        typeof ownDataValue(point, 'instanceId') !== 'string' ||
        !Number.isSafeInteger(ownDataValue(point, 'capacity')) ||
        ownDataValue(point, 'capacity') <= 0 ||
        !Number.isSafeInteger(ownDataValue(point, 'remaining')) ||
        ownDataValue(point, 'remaining') < 0 ||
        ownDataValue(point, 'remaining') >
          ownDataValue(point, 'capacity')) {
      return { ok: false, exists: false };
    }
    const entryOk = entryId == null ||
      ownDataValue(point, 'entryId') === entryId;
    return {
      ok: true,
      exists: entryOk && ownDataValue(point, 'remaining') > 0
    };
  }

  function findSpotIndex(list, targetId) {
    if (!Array.isArray(list) || typeof targetId !== 'string') return -1;
    for (let index = 0; index < list.length; index++) {
      if (ownDataValue(list[index], 'instanceId') === targetId) {
        return index;
      }
    }
    for (let index = 0; index < list.length; index++) {
      if (ownDataValue(list[index], 'entryId') === targetId &&
          ownDataValue(list[index], 'remaining') > 0) {
        return index;
      }
    }
    return -1;
  }

  function contentEntry(content, skillId, entryId) {
    const entries = content.families[skillId].entries;
    for (let index = 0; index < entries.length; index++) {
      if (entries[index].id === entryId) return entries[index];
    }
    return null;
  }

  function fishingSpot(content, spotId) {
    const spots = content.fishing.spots;
    for (let index = 0; index < spots.length; index++) {
      if (spots[index].id === spotId) return spots[index];
    }
    return null;
  }

  function storageMasteryId(skillId, masteryId) {
    const prefix = skillId + ':';
    return masteryId.indexOf(prefix) === 0
      ? masteryId.slice(prefix.length)
      : masteryId;
  }

  function safeBonusChance(bonuses) {
    const value = ownDataValue(bonuses, 'extraYieldChance');
    return isFiniteNonNegative(value) ? value : 0;
  }

  function safeRecoveryReduction(bonuses, key) {
    const value = ownDataValue(bonuses, key);
    return isFiniteNonNegative(value) ? value : 0;
  }

  function effectiveRecoveryInterval(content, bonuses) {
    const speciesIds = Object.keys(content.fishing.species);
    let baseInterval = Infinity;
    speciesIds.forEach(function (speciesId) {
      baseInterval = Math.min(
        baseInterval,
        content.fishing.species[speciesId].recoverSeconds
      );
    });
    const combined = addDecimalNumbers(
      safeRecoveryReduction(bonuses, 'fishRecoveryReduction'),
      safeRecoveryReduction(bonuses, 'beastFishRecoveryReduction')
    );
    const reduction = Math.min(MAX_RECOVERY_REDUCTION, combined);
    const multiplier = subtractDecimalNumbers(1, reduction);
    return multiplyDecimalByInteger(multiplier, baseInterval);
  }

  function fishTimePair(gathering) {
    const anchorMs = ownDataValue(gathering, 'fishRecoverAnchorMs');
    const baseSeconds = ownDataValue(
      gathering,
      'fishRecoverBaseSeconds'
    );
    if (anchorMs === null && baseSeconds === null) {
      return { ok: true, complete: false, anchorMs, baseSeconds };
    }
    if (isFiniteNonNegative(anchorMs) &&
        isFiniteNonNegative(baseSeconds)) {
      return { ok: true, complete: true, anchorMs, baseSeconds };
    }
    return {
      ok: false,
      complete: false,
      anchorMs: null,
      baseSeconds: null
    };
  }

  function readFishTimeAccount(gathering) {
    const publicValue = ownDataValue(gathering, 'fishRecoverAcc');
    const pair = fishTimePair(gathering);
    if (pair.complete) {
      const logicalValue = fishTimeProjection(
        pair.baseSeconds,
        pair.anchorMs
      );
      if (Number.isFinite(logicalValue) &&
          logicalValue >= 0 &&
          publicValue === logicalValue) {
        return {
          totalSeconds: pair.baseSeconds,
          settledMs: pair.anchorMs,
          logicalValue
        };
      }
    }
    return {
      totalSeconds: publicValue,
      settledMs: 0,
      logicalValue: publicValue
    };
  }

  function advanceFishTimeAccount(account, elapsedSeconds) {
    const totalSeconds = account.totalSeconds + elapsedSeconds;
    return {
      totalSeconds,
      settledMs: account.settledMs,
      logicalValue: fishTimeProjection(
        totalSeconds,
        account.settledMs
      )
    };
  }

  function fishTimeProjection(totalSeconds, settledMs) {
    const value = totalSeconds - settledMs / 1000;
    return value <= 0 ? 0 : value;
  }

  function nextFishRecoveryBoundary(account, interval) {
    return account.settledMs / 1000 + interval;
  }

  function settleFishRecoveryInterval(account, interval) {
    account.settledMs += interval * 1000;
    account.logicalValue = fishTimeProjection(
      account.totalSeconds,
      account.settledMs
    );
  }

  function writeFishTimeAccount(gathering, account) {
    gathering.fishRecoverAcc = account.logicalValue;
    gathering.fishRecoverAnchorMs = account.settledMs;
    gathering.fishRecoverBaseSeconds = account.totalSeconds;
  }

  function resetFishTimeAccount(gathering) {
    gathering.fishRecoverAcc = 0;
    gathering.fishRecoverAnchorMs = null;
    gathering.fishRecoverBaseSeconds = null;
  }

  function addCultivation(player, amount) {
    const current = ownDataValue(player, 'xiwei');
    const base = isFiniteNonNegative(current) ? current : 0;
    const next = base + amount;
    define(
      player,
      'xiwei',
      Number.isFinite(next) ? next : Number.MAX_VALUE
    );
  }

  function applyProgress(
    stateParts,
    skillId,
    masteryId,
    skillXp,
    masteryXp,
    cultivation,
    addSkillXp,
    addMasteryXp
  ) {
    let skillResult;
    let masteryResult;
    try {
      skillResult = addSkillXp(stateParts.skillProgress, skillXp);
      masteryResult = addMasteryXp(
        stateParts.masteryProgress,
        masteryXp
      );
    } catch (error) {
      return false;
    }
    if (!isPlainRecord(skillResult) ||
        !isProgress(ownDataValue(skillResult, 'value')) ||
        !isPlainRecord(masteryResult) ||
        !isProgress(ownDataValue(masteryResult, 'value'))) {
      return false;
    }
    define(
      stateParts.player.skills,
      skillId,
      ownDataValue(skillResult, 'value')
    );
    define(
      stateParts.skillMastery,
      masteryId,
      ownDataValue(masteryResult, 'value')
    );
    addCultivation(stateParts.player, cultivation);
    return true;
  }

  function create(deps) {
    const safeDeps = snapshotDependencies(deps);
    if (!isPlainRecord(safeDeps)) {
      throw new TypeError('deps contains an unsafe dependency snapshot');
    }
    const gatheringContent = requireRecord(
      safeDeps,
      'GatheringContent',
      'deps.GatheringContent'
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

    const content = copyGatheringContent(gatheringContent);
    const inventoryApply = requireFunction(
      inventory,
      'apply',
      'deps.Inventory.apply'
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
    const masteryYieldChance = requireFunction(
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

    function explore(model, skillId, rngState) {
      if (!isResourceSkill(skillId)) {
        return failure(
          'invalid_skill',
          safeFailureState(model),
          rngState
        );
      }
      if (!validRngState(rngState)) {
        return failure(
          'invalid_rng',
          safeFailureState(model),
          rngState
        );
      }
      const family = content.families[skillId];
      const masteryId = family.explore.masteryId;
      const stateParts = checkedModel(model, skillId, masteryId);
      if (!stateParts.ok) {
        return failure('invalid_model', stateParts.state, rngState);
      }
      const level = stateParts.skillProgress.level;
      const pool = family.entries.filter(function (entry) {
        return entry.unlockLevel <= level;
      });
      if (pool.length === 0) {
        return failure('skill_locked', stateParts.state, rngState);
      }
      const held = asSpotList(ownDataValue(stateParts.spots, skillId));
      const capacityCap = maxSpotCapacityForLevel(content, level);
      function remainingOf(entryId) {
        for (let heldIndex = 0; heldIndex < held.length; heldIndex++) {
          if (ownDataValue(held[heldIndex], 'entryId') === entryId) {
            const value = Number(ownDataValue(held[heldIndex], 'remaining'));
            return Number.isSafeInteger(value) && value > 0 ? value : 0;
          }
        }
        return 0;
      }
      const openPool = pool.filter(function (entry) {
        return remainingOf(entry.id) < capacityCap;
      });
      if (!openPool.length) {
        return failure('spots_full', stateParts.state, rngState);
      }

      const entryRoll = draw(rngState);
      if (!entryRoll.ok) {
        return failure('invalid_rng', stateParts.state, rngState);
      }
      const capacityRoll = draw(entryRoll.rngState);
      if (!capacityRoll.ok) {
        return failure(
          'invalid_rng',
          stateParts.state,
          entryRoll.rngState
        );
      }

      const entryIndex = Math.min(
        openPool.length - 1,
        Math.floor(entryRoll.value * openPool.length)
      );
      const entry = openPool[entryIndex];
      const gained = Math.max(
        1,
        Math.min(capacityCap, discoverGainForRoll(content, capacityRoll.value))
      );

      // 同名地点只保留一张卡：已有则累加储量，否则新增
      let sameIndex = -1;
      for (let index = 0; index < held.length; index++) {
        if (ownDataValue(held[index], 'entryId') === entry.id) {
          sameIndex = index;
          break;
        }
      }

      const nextHeld = held.slice();
      let spot;
      if (sameIndex >= 0) {
        const previous = held[sameIndex];
        const prevRemaining = Number(ownDataValue(previous, 'remaining'));
        const safePrev = Number.isSafeInteger(prevRemaining) && prevRemaining > 0
          ? prevRemaining
          : 0;
        const remaining = Math.min(capacityCap, safePrev + gained);
        spot = {
          instanceId: ownDataValue(previous, 'instanceId'),
          skillId,
          entryId: entry.id,
          capacity: capacityCap,
          remaining: remaining
        };
        nextHeld[sameIndex] = spot;
      } else {
        const nextSpotId = stateParts.gathering.nextSpotId;
        const remaining = Math.min(capacityCap, gained);
        spot = {
          instanceId: 'spot-' + nextSpotId,
          skillId,
          entryId: entry.id,
          capacity: capacityCap,
          remaining: remaining
        };
        nextHeld.push(spot);
        stateParts.gathering.nextSpotId = nextSpotId + 1;
      }
      define(stateParts.spots, skillId, nextHeld);

      if (!applyProgress(
        stateParts,
        skillId,
        masteryId,
        family.explore.skillXp,
        family.explore.masteryXp,
        family.explore.cultivation,
        addSkillXp,
        addMasteryXp
      )) {
        return failure('invalid_model', safeFailureState(model), rngState);
      }

      let saturatedAfter = true;
      for (let poolIndex = 0; poolIndex < pool.length; poolIndex++) {
        const entryId = pool[poolIndex].id;
        let rem = 0;
        for (let heldIndex = 0; heldIndex < nextHeld.length; heldIndex++) {
          if (ownDataValue(nextHeld[heldIndex], 'entryId') === entryId) {
            const value = Number(ownDataValue(nextHeld[heldIndex], 'remaining'));
            rem = Number.isSafeInteger(value) && value > 0 ? value : 0;
            break;
          }
        }
        if (rem < capacityCap) {
          saturatedAfter = false;
          break;
        }
      }

      const skillGains = {};
      const masteryGains = {};
      define(skillGains, skillId, family.explore.skillXp);
      define(masteryGains, masteryId, family.explore.masteryXp);
      return {
        ok: true,
        code: saturatedAfter ? 'spots_full_after_completion' : 'ok',
        state: stateParts.state,
        rngState: capacityRoll.rngState,
        result: { spot: cloneJson(spot).value },
        gains: {
          items: {},
          skillXp: skillGains,
          masteryXp: masteryGains,
          cultivation: family.explore.cultivation
        }
      };
    }

    function collect(model, skillId, targetId, rngState, bonuses) {
      if (!isResourceSkill(skillId)) {
        return failure(
          'invalid_skill',
          safeFailureState(model),
          rngState
        );
      }
      if (typeof targetId !== 'string' || !targetId) {
        return failure(
          'invalid_entry',
          safeFailureState(model),
          rngState
        );
      }
      if (!validRngState(rngState)) {
        return failure(
          'invalid_rng',
          safeFailureState(model),
          rngState
        );
      }
      const preview = cloneJson(model);
      if (!preview.ok || !isPlainRecord(preview.value)) {
        return failure('invalid_model', safeFailureState(model), rngState);
      }
      const previewSystems = ownDataValue(preview.value, 'systems');
      const previewGathering = ownDataValue(previewSystems, 'gathering');
      const previewSpotsRoot = ownDataValue(previewGathering, 'spots');
      if (!isPlainRecord(previewSystems) ||
          !isPlainRecord(previewGathering) ||
          !isPlainRecord(previewSpotsRoot)) {
        return failure('invalid_model', safeFailureState(model), rngState);
      }
      const previewHeld = asSpotList(
        ownDataValue(previewSpotsRoot, skillId)
      );
      const previewIndex = findSpotIndex(previewHeld, targetId);
      if (previewIndex < 0) {
        const maybeEntry = !/^spot-\d+$/.test(targetId)
          ? contentEntry(content, skillId, targetId)
          : null;
        if (!maybeEntry && !/^spot-\d+$/.test(targetId)) {
          return failure(
            'invalid_entry',
            safeFailureState(model),
            rngState
          );
        }
        return failure(
          'resource_depleted',
          safeFailureState(model),
          rngState
        );
      }
      const entry = contentEntry(
        content,
        skillId,
        previewHeld[previewIndex].entryId
      );
      if (!entry) {
        return failure(
          'invalid_entry',
          safeFailureState(model),
          rngState
        );
      }
      const masteryId = storageMasteryId(skillId, entry.masteryId);
      const stateParts = checkedModel(model, skillId, masteryId);
      if (!stateParts.ok) {
        return failure('invalid_model', stateParts.state, rngState);
      }
      const held = asSpotList(ownDataValue(stateParts.spots, skillId));
      const spotIndex = findSpotIndex(held, targetId);
      if (spotIndex < 0) {
        return failure('resource_depleted', stateParts.state, rngState);
      }
      const point = held[spotIndex];
      const checkedPoint = pointMatches(
        point,
        skillId,
        point.entryId
      );
      if (!checkedPoint.ok) {
        return failure('invalid_model', stateParts.state, rngState);
      }
      if (!checkedPoint.exists) {
        return failure('resource_depleted', stateParts.state, rngState);
      }
      if (entry.unlockLevel > stateParts.skillProgress.level) {
        return failure('skill_locked', stateParts.state, rngState);
      }

      const dropRoll = draw(rngState);
      if (!dropRoll.ok) {
        return failure('invalid_rng', stateParts.state, rngState);
      }
      const extraRoll = draw(dropRoll.rngState);
      if (!extraRoll.ok) {
        return failure(
          'invalid_rng',
          stateParts.state,
          dropRoll.rngState
        );
      }

      const totalWeight = entry.drops.reduce(function (total, drop) {
        return total + drop.w;
      }, 0);
      const target = dropRoll.value * totalWeight;
      let cumulative = 0;
      let drop = entry.drops[entry.drops.length - 1];
      for (let index = 0; index < entry.drops.length; index++) {
        cumulative += entry.drops[index].w;
        if (target < cumulative) {
          drop = entry.drops[index];
          break;
        }
      }

      let masteryChance;
      try {
        masteryChance = masteryYieldChance(
          stateParts.masteryProgress.level
        );
      } catch (error) {
        masteryChance = 0;
      }
      if (!isFiniteNonNegative(masteryChance)) masteryChance = 0;
      const extraChance = Math.min(
        0.75,
        masteryChance + safeBonusChance(bonuses)
      );
      const quantity = drop.q * (extraRoll.value < extraChance ? 2 : 1);
      const itemDelta = {};
      define(itemDelta, drop.itemId, quantity);

      let inventoryResult;
      try {
        inventoryResult = inventoryApply(
          stateParts.player.inventory,
          itemDelta
        );
      } catch (error) {
        return failure(
          'invalid_inventory',
          stateParts.state,
          extraRoll.rngState
        );
      }
      if (!isPlainRecord(inventoryResult) ||
          ownDataValue(inventoryResult, 'ok') !== true) {
        const code = isPlainRecord(inventoryResult) &&
          ownDataValue(inventoryResult, 'code') === 'inventory_full'
          ? 'inventory_full'
          : 'invalid_inventory';
        return failure(code, stateParts.state, extraRoll.rngState);
      }
      const nextInventory = ownDataValue(inventoryResult, 'value');
      if (!isPlainRecord(nextInventory)) {
        return failure(
          'invalid_inventory',
          stateParts.state,
          extraRoll.rngState
        );
      }
      stateParts.player.inventory = nextInventory;

      const masteryXp = Math.max(1, Math.round(entry.xp * 0.5));
      const cultivation = Math.max(1, Math.round(entry.xp / 10));
      if (!applyProgress(
        stateParts,
        skillId,
        masteryId,
        entry.xp,
        masteryXp,
        cultivation,
        addSkillXp,
        addMasteryXp
      )) {
        return failure('invalid_model', safeFailureState(model), rngState);
      }

      point.remaining -= 1;
      const depleted = point.remaining === 0;
      const nextHeld = held.slice();
      nextHeld[spotIndex] = point;
      define(stateParts.spots, skillId, nextHeld);

      const itemGains = {};
      const skillGains = {};
      const masteryGains = {};
      define(itemGains, drop.itemId, quantity);
      define(skillGains, skillId, entry.xp);
      define(masteryGains, entry.masteryId, masteryXp);
      return {
        ok: true,
        code: depleted
          ? 'resource_depleted_after_completion'
          : 'ok',
        state: stateParts.state,
        rngState: extraRoll.rngState,
        result: {
          itemId: drop.itemId,
          quantity,
          spot: cloneJson(point).value
        },
        gains: {
          items: itemGains,
          skillXp: skillGains,
          masteryXp: masteryGains,
          cultivation
        }
      };
    }

    function pickWeighted(entries, rollValue) {
      const totalWeight = entries.reduce(function (total, entry) {
        return total + entry.w;
      }, 0);
      const target = rollValue * totalWeight;
      let cumulative = 0;
      let selected = entries[entries.length - 1];
      for (let index = 0; index < entries.length; index++) {
        cumulative += entries[index].w;
        if (target < cumulative) {
          selected = entries[index];
          break;
        }
      }
      return selected;
    }

    function fish(model, spotId, rngState, bonuses) {
      const spot = typeof spotId === 'string'
        ? fishingSpot(content, spotId)
        : null;
      if (!spot) {
        return failure(
          'invalid_spot',
          safeFailureState(model),
          rngState
        );
      }
      if (!validRngState(rngState)) {
        return failure(
          'invalid_rng',
          safeFailureState(model),
          rngState
        );
      }

      const stateParts = checkedFishingModel(model, content);
      if (!stateParts.ok) {
        return failure('invalid_model', stateParts.state, rngState);
      }
      if (spot.unlockLevel > stateParts.skillProgress.level) {
        return failure('skill_locked', stateParts.state, rngState);
      }
      if (spot.unlockFlag) {
        const unlocks = ownDataValue(stateParts.gathering, 'fishingUnlocks');
        if (!isPlainRecord(unlocks) ||
            ownDataValue(unlocks, spot.unlockFlag) !== true) {
          return failure('spot_locked', stateParts.state, rngState);
        }
      }

      const available = spot.drops.filter(function (drop) {
        return stateParts.fishStocks[drop.itemId] > 0;
      });
      if (available.length === 0) {
        const waiting = failure(
          'fish_stock_empty',
          stateParts.state,
          rngState
        );
        const interval = effectiveRecoveryInterval(content, bonuses);
        const account = readFishTimeAccount(stateParts.gathering);
        const boundary = nextFishRecoveryBoundary(account, interval);
        const remaining = account.totalSeconds < boundary
          ? boundary - account.totalSeconds
          : Number.MIN_VALUE;
        waiting.retryAfterSeconds = remaining;
        return waiting;
      }

      const speciesRoll = draw(rngState);
      if (!speciesRoll.ok) {
        return failure('invalid_rng', stateParts.state, rngState);
      }
      const intended = pickWeighted(available, speciesRoll.value);
      const speciesId = intended.itemId;
      const species = content.fishing.species[speciesId];
      const masteryProgress = stateParts.skillMastery[spot.id];

      let fishChance = spot.fishChance;
      let junkChance = spot.junkChance;
      let specialChance = spot.specialChance;
      const immunityAt = content.fishing.junkImmunityMastery;
      if (masteryProgress.level >= immunityAt) {
        junkChance = 0;
      }
      const typeTotal = fishChance + junkChance + specialChance;
      const safeFish = typeTotal > 0 ? fishChance : 100;
      const safeJunk = typeTotal > 0 ? junkChance : 0;
      const safeSpecial = typeTotal > 0 ? specialChance : 0;
      const renormalizedTotal = safeFish + safeJunk + safeSpecial;

      const typeRoll = draw(speciesRoll.rngState);
      if (!typeRoll.ok) {
        return failure(
          'invalid_rng',
          stateParts.state,
          speciesRoll.rngState
        );
      }
      const typeTarget = typeRoll.value * renormalizedTotal;
      let outcome = 'fish';
      if (typeTarget < safeFish) outcome = 'fish';
      else if (typeTarget < safeFish + safeJunk) outcome = 'junk';
      else outcome = 'special';

      const itemDelta = {};
      let itemId = speciesId;
      let quantity = 1;
      let skillXp = spot.xp;
      let masteryXp = Math.max(1, Math.round(spot.xp * 0.5));
      let grantMastery = true;
      let consumeStock = true;
      let nextRng = typeRoll.rngState;
      let resultMeta = {
        outcome: outcome,
        speciesId: speciesId,
        itemId: speciesId,
        quantity: 1,
        fishBox: false
      };

      if (outcome === 'fish') {
        const extraRoll = draw(typeRoll.rngState);
        if (!extraRoll.ok) {
          return failure(
            'invalid_rng',
            stateParts.state,
            typeRoll.rngState
          );
        }
        nextRng = extraRoll.rngState;
        let masteryChance;
        try {
          masteryChance = masteryYieldChance(masteryProgress.level);
        } catch (error) {
          masteryChance = 0;
        }
        if (!isFiniteNonNegative(masteryChance)) masteryChance = 0;
        const extraChance = Math.min(
          MAX_EXTRA_YIELD_CHANCE,
          masteryChance + safeBonusChance(bonuses)
        );
        quantity = intended.q * (extraRoll.value < extraChance ? 2 : 1);
        itemId = speciesId;
        define(itemDelta, speciesId, quantity);
        resultMeta.quantity = quantity;
        resultMeta.itemId = speciesId;
      } else if (outcome === 'junk') {
        const junkRoll = draw(typeRoll.rngState);
        if (!junkRoll.ok) {
          return failure(
            'invalid_rng',
            stateParts.state,
            typeRoll.rngState
          );
        }
        nextRng = junkRoll.rngState;
        const junkItem = pickWeighted(
          content.fishing.junkPool,
          junkRoll.value
        );
        itemId = junkItem.itemId;
        quantity = 1;
        skillXp = content.fishing.junkSkillXp;
        masteryXp = 0;
        grantMastery = false;
        consumeStock = false;
        define(itemDelta, itemId, 1);
        resultMeta.itemId = itemId;
        resultMeta.quantity = 1;
      } else {
        const specialRoll = draw(typeRoll.rngState);
        if (!specialRoll.ok) {
          return failure(
            'invalid_rng',
            stateParts.state,
            typeRoll.rngState
          );
        }
        nextRng = specialRoll.rngState;
        const specialItem = pickWeighted(
          content.fishing.specialPool,
          specialRoll.value
        );
        itemId = specialItem.itemId;
        quantity = 1;
        consumeStock = false;
        define(itemDelta, itemId, 1);
        resultMeta.itemId = itemId;
        resultMeta.quantity = 1;
        if (itemId === 'sunkenCasket' || itemId === 'fishBox') {
          resultMeta.fishBox = true;
        }
      }

      let inventoryResult;
      try {
        inventoryResult = inventoryApply(
          stateParts.player.inventory,
          itemDelta
        );
      } catch (error) {
        return failure(
          'invalid_inventory',
          stateParts.state,
          nextRng
        );
      }
      if (!isPlainRecord(inventoryResult) ||
          ownDataValue(inventoryResult, 'ok') !== true) {
        const code = isPlainRecord(inventoryResult) &&
          ownDataValue(inventoryResult, 'code') === 'inventory_full'
          ? 'inventory_full'
          : 'invalid_inventory';
        return failure(code, stateParts.state, nextRng);
      }
      const nextInventory = ownDataValue(inventoryResult, 'value');
      if (!isPlainRecord(nextInventory)) {
        return failure(
          'invalid_inventory',
          stateParts.state,
          nextRng
        );
      }
      stateParts.player.inventory = nextInventory;

      const cultivation = Math.max(1, Math.round(skillXp / 10));
      stateParts.masteryProgress = masteryProgress;
      if (grantMastery) {
        if (!applyProgress(
          stateParts,
          FISHING_SKILL,
          spot.id,
          skillXp,
          masteryXp,
          cultivation,
          addSkillXp,
          addMasteryXp
        )) {
          return failure('invalid_model', safeFailureState(model), rngState);
        }
      } else {
        if (!applyProgress(
          stateParts,
          FISHING_SKILL,
          spot.id,
          skillXp,
          0,
          cultivation,
          addSkillXp,
          function (progress) {
            return { value: progress };
          }
        )) {
          return failure('invalid_model', safeFailureState(model), rngState);
        }
      }

      if (consumeStock) {
        stateParts.fishStocks[speciesId] -= 1;
      }

      const itemGains = {};
      const skillGains = {};
      const masteryGains = {};
      define(itemGains, itemId, quantity);
      define(skillGains, FISHING_SKILL, skillXp);
      if (grantMastery && masteryXp > 0) {
        define(masteryGains, spot.masteryId, masteryXp);
      }

      return {
        ok: true,
        code: 'ok',
        state: stateParts.state,
        rngState: nextRng,
        result: resultMeta,
        gains: {
          items: itemGains,
          skillXp: skillGains,
          masteryXp: masteryGains,
          cultivation
        }
      };
    }

    function advanceFishStocks(model, elapsedSeconds, bonuses) {
      if (!isFiniteNonNegative(elapsedSeconds)) {
        return {
          ok: false,
          code: 'invalid_elapsed',
          state: safeFailureState(model),
          recovered: {}
        };
      }
      const stateParts = checkedFishingModel(model, content);
      if (!stateParts.ok) {
        return {
          ok: false,
          code: 'invalid_model',
          state: stateParts.state,
          recovered: {}
        };
      }

      const speciesIds = Object.keys(content.fishing.species);
      let maximumDeficit = 0;
      speciesIds.forEach(function (speciesId) {
        maximumDeficit = Math.max(
          maximumDeficit,
          content.fishing.species[speciesId].maxStock -
            stateParts.fishStocks[speciesId]
        );
      });
      if (maximumDeficit === 0) {
        resetFishTimeAccount(stateParts.gathering);
        return {
          ok: true,
          code: 'ok',
          state: stateParts.state,
          recovered: {}
        };
      }
      if (elapsedSeconds === 0) {
        return {
          ok: true,
          code: 'ok',
          state: stateParts.state,
          recovered: {}
        };
      }

      const interval = effectiveRecoveryInterval(content, bonuses);
      const advancedAccount = advanceFishTimeAccount(
        readFishTimeAccount(stateParts.gathering),
        elapsedSeconds
      );
      let completedIntervals = 0;
      if (!Number.isFinite(advancedAccount.totalSeconds)) {
        completedIntervals = maximumDeficit;
      } else {
        while (completedIntervals < maximumDeficit) {
          const boundary = nextFishRecoveryBoundary(
            advancedAccount,
            interval
          );
          if (advancedAccount.totalSeconds < boundary) break;
          settleFishRecoveryInterval(advancedAccount, interval);
          completedIntervals++;
        }
      }

      const recovered = {};
      if (completedIntervals > 0) {
        speciesIds.forEach(function (speciesId) {
          const species = content.fishing.species[speciesId];
          const before = stateParts.fishStocks[speciesId];
          const after = Math.min(
            species.maxStock,
            before + completedIntervals
          );
          stateParts.fishStocks[speciesId] = after;
          if (after > before) {
            define(recovered, speciesId, after - before);
          }
        });
      }

      const allFull = speciesIds.every(function (speciesId) {
        return stateParts.fishStocks[speciesId] ===
          content.fishing.species[speciesId].maxStock;
      });
      if (allFull) {
        resetFishTimeAccount(stateParts.gathering);
      } else {
        writeFishTimeAccount(stateParts.gathering, advancedAccount);
      }

      return {
        ok: true,
        code: 'ok',
        state: stateParts.state,
        recovered
      };
    }

    return Object.freeze({
      explore,
      collect,
      fish,
      advanceFishStocks
    });
  }

  return Object.freeze({ create });
});
