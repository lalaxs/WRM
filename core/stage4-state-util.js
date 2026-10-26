(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/regions.js'),
      require('../content/sects.js'),
      require('../content/npc-generation.js')
    )
    : factory(
      root && root.RegionContent,
      root && root.SectContent,
      root && root.NpcGenerationContent
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Stage4StateUtil = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  RegionContent,
  SectContent,
  NpcGenerationContent
) {
  'use strict';

  const VERSION = 5;
  const RESOLVED_RECENT_LIMIT = 100;
  const SUMMARY_LIMIT = 300;
  const EVOLUTION_LIMIT = 500;
  const WORLD_EVENT_RETENTION = 400;
  const JSON_DEPTH_LIMIT = 128;
  const JSON_BRANCH_NODE_LIMIT = 250000;
  const JSON_ARRAY_LIMIT = 100000;
  const JSON_OBJECT_KEY_LIMIT = 10000;
  const JSON_STRING_LIMIT = 100000;
  const JSON_ISOLATION_DEPTH = 3;
  const MONTH_SECONDS = 30 * 24 * 60 * 60;
  const RELATION_KEYS = Object.freeze([
    'affection',
    'trust',
    'romanticAttachment',
    'closeness',
    'dependence',
    'loyalty',
    'jealousy',
    'desire'
  ]);
  const ACTIVITY_STATUSES = Object.freeze([
    'normal',
    'injured',
    'seclusion',
    'travel',
    'dating',
    'exploring',
    'imprisoned',
    'missing',
    'tribulation'
  ]);
  const RELATION_TAG_IDS = Object.freeze([
    'friend',
    'lover',
    'partner',
    'mentor',
    'blood',
    'enemy',
    'dao-companion',
    'close-friend',
    'life-debt',
    'impressed',
    'acquainted'
  ]);
  const RELATION_ARC_STAGES = Object.freeze([
    'spark',
    'warm',
    'bond',
    'strain',
    'mend',
    'break'
  ]);
  const PREFERENCE_CATEGORIES = Object.freeze([
    'herb',
    'pill',
    'artifact',
    'talisman',
    'ore',
    'fish',
    'wood',
    'manual'
  ]);
  const RESTRICTION_TYPES = Object.freeze([
    'blood',
    'directInLaw',
    'guardianship',
    'priorGenerationPartner'
  ]);
  const GENDERS = Object.freeze(['female', 'male', 'nonbinary']);
  const NPC_STATUSES = Object.freeze([
    'living',
    'dead',
    'reincarnated',
    'ascended',
    'playerIdentity'
  ]);
  const NPC_COMBAT_TAGS = Object.freeze([
    'damage', 'heal', 'shield', 'control', 'buff', 'debuff',
    'cleanse', 'qiRestore', 'summon', 'protect', 'threat', 'ailment',
    'sword', 'body', 'dan', 'talisman', 'array', 'beast', 'soul',
    'thunder', 'fire', 'ice', 'poison', 'wood', 'water', 'earth', 'metal'
  ]);
  const NPC_CONDITION_TYPES = Object.freeze([
    'always', 'selfHpBelow', 'selfQiAbove', 'allyHpBelow',
    'enemyHpBelow', 'enemyHasStatus', 'selfMissingBuff'
  ]);

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function intrinsicKeySignature(key) {
    if (typeof key === 'string') return 'string:' + key;
    const globalKey = Symbol.keyFor(key);
    return 'symbol:' + (
      globalKey == null ? String(key.description) : globalKey
    );
  }

  function intrinsicPrototype(value, constructor, parentCheck) {
    if (value == null || typeof value !== 'object') return false;
    try {
      const firstParent = Object.getPrototypeOf(value);
      const secondParent = Object.getPrototypeOf(value);
      if (firstParent !== secondParent || !parentCheck(firstParent)) {
        return false;
      }
      const firstKeys = Reflect.ownKeys(value);
      const secondKeys = Reflect.ownKeys(value);
      const expectedKeys = Reflect.ownKeys(constructor.prototype);
      if (!sameKeys(firstKeys, secondKeys) ||
          firstKeys.length !== expectedKeys.length) {
        return false;
      }
      for (let index = 0; index < firstKeys.length; index++) {
        if (intrinsicKeySignature(firstKeys[index]) !==
            intrinsicKeySignature(expectedKeys[index])) {
          return false;
        }
      }
      const first = Object.getOwnPropertyDescriptor(value, 'constructor');
      const second = Object.getOwnPropertyDescriptor(value, 'constructor');
      return sameDescriptor(first, second) &&
        first &&
        own(first, 'value') &&
        typeof first.value === 'function' &&
        Function.prototype.toString.call(first.value) ===
          Function.prototype.toString.call(constructor);
    } catch (error) {
      return false;
    }
  }

  function plainObjectPrototype(value) {
    // Cross-realm Object.prototype is still that realm's exact intrinsic;
    // prototype-shaped user objects fail the intrinsic key/constructor checks.
    return value === null ||
      value === Object.prototype ||
      intrinsicPrototype(value, Object, function (parent) {
        return parent === null;
      });
  }

  function plainArrayPrototype(value) {
    return value === Array.prototype ||
      intrinsicPrototype(value, Array, function (parent) {
        return plainObjectPrototype(parent);
      });
  }

  function isRecord(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      return plainObjectPrototype(prototype);
    } catch (error) {
      return false;
    }
  }

  function dataValue(value, key) {
    if (!isRecord(value)) return undefined;
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch (error) {
      return undefined;
    }
    return descriptor && own(descriptor, 'value')
      ? descriptor.value
      : undefined;
  }

  function dataKeys(value) {
    if (!isRecord(value)) return [];
    try {
      return Object.keys(value).filter(function (key) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && own(descriptor, 'value');
      });
    } catch (error) {
      return [];
    }
  }

  function define(target, key, value) {
    Object.defineProperty(target, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }

  function finiteNumber(value, fallback, minimum, maximum) {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(
      maximum == null ? Infinity : maximum,
      Math.max(minimum == null ? -Infinity : minimum, number)
    );
  }

  function finiteInteger(value, fallback, minimum, maximum) {
    return Math.floor(finiteNumber(value, fallback, minimum, maximum));
  }

  function cleanString(value, fallback) {
    return typeof value === 'string' && value.length > 0
      ? value
      : fallback;
  }

  function sortedUniqueStrings(value, limit) {
    const clean = jsonArray(value);
    const result = [];
    const seen = new Set();
    const maximum = Math.min(
      clean.length,
      finiteInteger(limit, JSON_ARRAY_LIMIT, 0, JSON_ARRAY_LIMIT)
    );
    for (let index = 0; index < maximum; index++) {
      const item = clean[index];
      if (typeof item !== 'string' ||
          item.length === 0 ||
          seen.has(item)) {
        continue;
      }
      seen.add(item);
      result.push(item);
    }
    return result;
  }

  const INVALID_JSON = Object.freeze({});

  function primitiveJson(value, key) {
    if (value === null ||
        typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.length <= JSON_STRING_LIMIT
        ? value
        : value.slice(0, JSON_STRING_LIMIT);
    }
    if (typeof value === 'number') {
      if (Number.isFinite(value)) return value;
      return key === 'shouMax' ||
        key === 'shouyuan' ||
        key === 'count'
        ? null
        : 0;
    }
    return INVALID_JSON;
  }

  function sameKeys(left, right) {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index++) {
      if (left[index] !== right[index]) return false;
    }
    return true;
  }

  function sameDescriptor(left, right) {
    if (!left || !right) return left === right;
    const leftData = own(left, 'value');
    const rightData = own(right, 'value');
    if (leftData !== rightData ||
        left.enumerable !== right.enumerable ||
        left.configurable !== right.configurable) {
      return false;
    }
    if (leftData) {
      return left.writable === right.writable &&
        Object.is(left.value, right.value);
    }
    return left.get === right.get && left.set === right.set;
  }

  function stableDescriptor(value, key) {
    try {
      const first = Object.getOwnPropertyDescriptor(value, key);
      const second = Object.getOwnPropertyDescriptor(value, key);
      return sameDescriptor(first, second) ? first : INVALID_JSON;
    } catch (error) {
      return INVALID_JSON;
    }
  }

  function stableOptionsRecord(value) {
    if (value == null) return {};
    if (typeof value !== 'object') return null;
    let firstPrototype;
    let secondPrototype;
    let firstKeys;
    let secondKeys;
    try {
      if (Array.isArray(value)) return null;
      firstPrototype = Object.getPrototypeOf(value);
      secondPrototype = Object.getPrototypeOf(value);
      if (firstPrototype !== secondPrototype ||
          !plainObjectPrototype(firstPrototype)) {
        return null;
      }
      firstKeys = Reflect.ownKeys(value);
      secondKeys = Reflect.ownKeys(value);
    } catch (error) {
      return null;
    }
    if (!sameKeys(firstKeys, secondKeys)) return null;

    const result = {};
    for (let index = 0; index < firstKeys.length; index++) {
      const key = firstKeys[index];
      const descriptor = stableDescriptor(value, key);
      if (descriptor === INVALID_JSON ||
          !descriptor ||
          !own(descriptor, 'value')) {
        return null;
      }
      if (typeof key === 'string') {
        define(result, key, descriptor.value);
      }
    }
    return result;
  }

  function stableBooleanOption(options, key) {
    const certified = stableOptionsRecord(options);
    if (!certified) return false;
    const clean = snapshotJsonData(certified);
    return isRecord(clean) && dataValue(clean, key) === true;
  }

  function containerSnapshot(value, depth) {
    if (!value || typeof value !== 'object' ||
        depth >= JSON_DEPTH_LIMIT) {
      return INVALID_JSON;
    }
    let firstPrototype;
    let secondPrototype;
    let firstKeys;
    let secondKeys;
    try {
      firstPrototype = Object.getPrototypeOf(value);
      secondPrototype = Object.getPrototypeOf(value);
      if (firstPrototype !== secondPrototype) return INVALID_JSON;
      firstKeys = Reflect.ownKeys(value);
      secondKeys = Reflect.ownKeys(value);
    } catch (error) {
      return INVALID_JSON;
    }
    if (!sameKeys(firstKeys, secondKeys)) return INVALID_JSON;

    let array;
    try {
      array = Array.isArray(value);
    } catch (error) {
      return INVALID_JSON;
    }
    if (array) {
      if (!plainArrayPrototype(firstPrototype)) return INVALID_JSON;
      const lengthDescriptor = stableDescriptor(value, 'length');
      if (lengthDescriptor === INVALID_JSON ||
          !own(lengthDescriptor, 'value') ||
          !Number.isInteger(lengthDescriptor.value) ||
          lengthDescriptor.value < 0 ||
          lengthDescriptor.value > JSON_ARRAY_LIMIT) {
        return INVALID_JSON;
      }
      const length = lengthDescriptor.value;
      const entries = [];
      for (let index = 0; index < length; index++) {
        const descriptor = stableDescriptor(value, String(index));
        if (descriptor === INVALID_JSON) return INVALID_JSON;
        entries.push(
          descriptor && own(descriptor, 'value')
            ? descriptor.value
            : INVALID_JSON
        );
      }
      return {
        source: value,
        output: new Array(length).fill(null),
        entries: entries,
        array: true
      };
    }

    if (!plainObjectPrototype(firstPrototype)) {
      return INVALID_JSON;
    }
    const keys = firstKeys.filter(function (key) {
      return typeof key === 'string';
    }).sort();
    if (keys.length > JSON_OBJECT_KEY_LIMIT) return INVALID_JSON;
    const entries = [];
    for (let index = 0; index < keys.length; index++) {
      const descriptor = stableDescriptor(value, keys[index]);
      if (descriptor === INVALID_JSON) return INVALID_JSON;
      if (!descriptor ||
          !descriptor.enumerable ||
          !own(descriptor, 'value')) {
        continue;
      }
      entries.push({
        key: keys[index],
        value: descriptor.value
      });
    }
    return {
      source: value,
      output: {},
      entries: entries,
      array: false
    };
  }

  function assignSnapshotValue(snapshot, key, value) {
    if (snapshot.array) snapshot.output[key] = value;
    else define(snapshot.output, key, value);
  }

  function snapshotBranch(root, depth, ancestors) {
    const active = new Set(ancestors);
    active.add(root.source);
    const stack = [{
      snapshot: root,
      index: 0,
      depth: depth
    }];
    let nodes = 1;
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (frame.index >= frame.snapshot.entries.length) {
        active.delete(frame.snapshot.source);
        stack.pop();
        continue;
      }

      const entry = frame.snapshot.entries[frame.index++];
      const key = frame.snapshot.array
        ? frame.index - 1
        : entry.key;
      const raw = frame.snapshot.array ? entry : entry.value;
      if (raw === INVALID_JSON) continue;
      const cleanPrimitive = primitiveJson(raw, key);
      if (cleanPrimitive !== INVALID_JSON) {
        nodes++;
        if (nodes > JSON_BRANCH_NODE_LIMIT) return INVALID_JSON;
        assignSnapshotValue(frame.snapshot, key, cleanPrimitive);
        continue;
      }
      if (active.has(raw)) continue;
      nodes++;
      if (nodes > JSON_BRANCH_NODE_LIMIT) return INVALID_JSON;
      const child = containerSnapshot(raw, frame.depth + 1);
      if (child === INVALID_JSON) continue;
      assignSnapshotValue(frame.snapshot, key, child.output);
      active.add(child.source);
      stack.push({
        snapshot: child,
        index: 0,
        depth: frame.depth + 1
      });
    }
    return root.output;
  }

  function isolatedSnapshot(
    value,
    depth,
    isolationRemaining,
    ancestors,
    key
  ) {
    const primitive = primitiveJson(value, key);
    if (primitive !== INVALID_JSON) return primitive;
    if (ancestors.has(value)) return INVALID_JSON;
    const root = containerSnapshot(value, depth);
    if (root === INVALID_JSON) return INVALID_JSON;
    if (root.array || isolationRemaining <= 0) {
      return snapshotBranch(root, depth, ancestors);
    }

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(root.source);
    for (let index = 0; index < root.entries.length; index++) {
      const entry = root.entries[index];
      const clean = isolatedSnapshot(
        entry.value,
        depth + 1,
        isolationRemaining - 1,
        nextAncestors,
        entry.key
      );
      if (clean !== INVALID_JSON) {
        define(root.output, entry.key, clean);
      }
    }
    return root.output;
  }

  function snapshotJsonData(value) {
    const result = isolatedSnapshot(
      value,
      0,
      JSON_ISOLATION_DEPTH,
      new Set(),
      null
    );
    return result === INVALID_JSON ? null : result;
  }

  function jsonValue(value) {
    return snapshotJsonData(value);
  }

  function jsonRecord(value) {
    const result = jsonValue(value);
    return isRecord(result) ? result : {};
  }

  function jsonArray(value) {
    const result = jsonValue(value);
    return Array.isArray(result) ? result : [];
  }

  function cloneJson(value, fallback) {
    const result = jsonValue(value);
    return result === null && value !== null ? fallback : result;
  }

  function regionIds() {
    return RegionContent && Array.isArray(RegionContent.REGIONS)
      ? RegionContent.REGIONS.map(function (region) { return region.id; })
      : ['qinglan-town'];
  }

  function sectIds() {
    return SectContent && Array.isArray(SectContent.SECTS)
      ? SectContent.SECTS.map(function (sect) { return sect.id; })
      : [];
  }

  function generationIds(name, fallback) {
    const values = NpcGenerationContent &&
      Array.isArray(NpcGenerationContent[name])
      ? NpcGenerationContent[name]
      : [];
    const ids = values.map(function (value) { return value.id; });
    return ids.length > 0 ? ids : [fallback];
  }

  function canonicalizeSpiritualRootId(id) {
    const aliases = NpcGenerationContent &&
      NpcGenerationContent.SPIRITUAL_ROOT_ALIASES;
    if (typeof id === 'string' && aliases && aliases[id]) return aliases[id];
    return id;
  }

  function validSpiritualRootId(id) {
    const ids = generationIds('SPIRITUAL_ROOTS', 'single');
    return validId(canonicalizeSpiritualRootId(id), ids, 'single');
  }

  function validId(id, ids, fallback) {
    return typeof id === 'string' && ids.includes(id) ? id : fallback;
  }

  function directionalPairKey(value, separator) {
    if (typeof value !== 'string') return null;
    const parts = value.split(separator);
    if (parts.length !== 2 ||
        parts[0].length === 0 ||
        parts[1].length === 0 ||
        parts[0] === parts[1]) {
      return null;
    }
    return parts;
  }

  function unorderedPairKey(value) {
    const parts = directionalPairKey(value, '|');
    if (!parts) return null;
    parts.sort();
    return parts.join('|');
  }

  return Object.freeze({
    VERSION: VERSION,
    RESOLVED_RECENT_LIMIT: RESOLVED_RECENT_LIMIT,
    SUMMARY_LIMIT: SUMMARY_LIMIT,
    EVOLUTION_LIMIT: EVOLUTION_LIMIT,
    WORLD_EVENT_RETENTION: WORLD_EVENT_RETENTION,
    MONTH_SECONDS: MONTH_SECONDS,
    RELATION_KEYS: RELATION_KEYS,
    ACTIVITY_STATUSES: ACTIVITY_STATUSES,
    RELATION_TAG_IDS: RELATION_TAG_IDS,
    RELATION_ARC_STAGES: RELATION_ARC_STAGES,
    PREFERENCE_CATEGORIES: PREFERENCE_CATEGORIES,
    RESTRICTION_TYPES: RESTRICTION_TYPES,
    GENDERS: GENDERS,
    NPC_STATUSES: NPC_STATUSES,
    NPC_COMBAT_TAGS: NPC_COMBAT_TAGS,
    NPC_CONDITION_TYPES: NPC_CONDITION_TYPES,
    own: own,
    dataValue: dataValue,
    dataKeys: dataKeys,
    define: define,
    finiteNumber: finiteNumber,
    finiteInteger: finiteInteger,
    cleanString: cleanString,
    sortedUniqueStrings: sortedUniqueStrings,
    isRecord: isRecord,
    jsonRecord: jsonRecord,
    jsonArray: jsonArray,
    jsonValue: jsonValue,
    cloneJson: cloneJson,
    snapshotJsonData: snapshotJsonData,
    regionIds: regionIds,
    sectIds: sectIds,
    generationIds: generationIds,
    canonicalizeSpiritualRootId: canonicalizeSpiritualRootId,
    validSpiritualRootId: validSpiritualRootId,
    validId: validId,
    directionalPairKey: directionalPairKey,
    unorderedPairKey: unorderedPairKey,
    stableOptionsRecord: stableOptionsRecord,
    stableBooleanOption: stableBooleanOption
  });
});
