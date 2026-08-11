(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./stage3-state.js'),
      require('../content/regions.js'),
      require('../content/sects.js'),
      require('../content/npc-generation.js'),
      require('./npc-generator.js'),
      require('./npc-roster.js'),
      require('../content/equipment.js'),
      require('./equipment.js')
    )
    : factory(
      root && root.Stage3State,
      root && root.RegionContent,
      root && root.SectContent,
      root && root.NpcGenerationContent,
      root && root.NpcGenerator,
      root && root.NpcRoster,
      root && root.EquipmentContent,
      root && root.Equipment
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Stage4State = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Stage3State,
  RegionContent,
  SectContent,
  NpcGenerationContent,
  NpcGenerator,
  NpcRoster,
  EquipmentContent,
  Equipment
) {
  'use strict';

  const VERSION = 5;
  const PENDING_LIMIT = 20;
  const RESOLVED_RECENT_LIMIT = 100;
  const SUMMARY_LIMIT = 300;
  const EVOLUTION_LIMIT = 500;
  const JSON_DEPTH_LIMIT = 128;
  const JSON_BRANCH_NODE_LIMIT = 250000;
  const JSON_ARRAY_LIMIT = 100000;
  const JSON_OBJECT_KEY_LIMIT = 10000;
  const JSON_STRING_LIMIT = 100000;
  const JSON_ISOLATION_DEPTH = 3;
  const PARTICIPANT_LIMIT = 2000;
  const EVENT_OPTION_LIMIT = 100;
  const MONTH_SECONDS = 30 * 24 * 60 * 60;
  const RELATION_KEYS = Object.freeze([
    'affection',
    'trust',
    'romanticAttachment',
    'desire',
    'dependence',
    'loyalty',
    'jealousy',
    'resentment'
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

  function validId(id, ids, fallback) {
    return typeof id === 'string' && ids.includes(id) ? id : fallback;
  }

  function defaultSectRecords() {
    const records = {};
    sectIds().forEach(function (sectId) {
      define(records, sectId, {
        id: sectId,
        leaderId: null,
        roleByNpcId: {},
        power: 1,
        reputation: 0,
        lastChangedAt: 0
      });
    });
    return records;
  }

  function defaultRegions() {
    const regions = {};
    regionIds().forEach(function (regionId) {
      define(regions, regionId, {
        prosperity: 50,
        danger: 10,
        controllingSectId: null,
        lastChangedAt: 0
      });
    });
    return regions;
  }

  function defaults() {
    return {
      player: {
        identity: { gender: 'female' },
        regionId: 'qinglan-town',
        flags: { completedFirstAction: false },
        lifecycle: {
          currentLifeId: 'life-1',
          generation: 1,
          source: 'founder',
          sourceNpcId: null,
          ageYears: 18,
          ageRemainderSeconds: 0,
          status: 'active',
          pendingCause: null,
          startedAt: 0
        }
      },
      systems: {
        npcs: {
          nextId: 1,
          activeTarget: 40,
          records: {},
          activeIds: [],
          backgroundIds: [],
          backgroundCursor: 0
        },
        relationships: {
          edges: {},
          bonds: {},
          restrictions: {}
        },
        events: {
          nextId: 1,
          pending: [],
          resolvedRecent: [],
          resolvedIdRanges: [],
          summaries: [],
          evolution: [],
          compacted: [],
          cooldowns: {},
          day: {
            index: 0,
            budget: 0,
            attempted: 0,
            created: 0
          }
        },
        sects: {
          player: {
            sectId: null,
            joinedAt: null,
            contribution: {},
            reputation: {},
            choiceEventOffered: false,
            choiceAvailableAt: 0
          },
          records: defaultSectRecords(),
          pairStates: {}
        },
        social: {
          nextBenefitId: 1,
          benefits: []
        },
        teamCombat: {
          companionIds: [null, null, null],
          reactionLog: []
        },
        lineage: {
          nextLifeId: 2,
          nextRitualId: 1,
          nextTransitionId: 1,
          descendants: {},
          rituals: [],
          lives: [],
          pendingTransition: null
        },
        world: {
          elapsedSeconds: 0,
          activeAccumulator: 0,
          backgroundAccumulator: 0,
          sectAccumulator: 0,
          eventAccumulator: 0,
          regions: defaultRegions()
        }
      }
    };
  }

  function normalizePlayer(source, cleanPlayer) {
    if (!isRecord(cleanPlayer)) return cleanPlayer;
    const rawFlags = jsonRecord(dataValue(source, 'flags'));
    rawFlags.completedFirstAction =
      dataValue(dataValue(source, 'flags'), 'completedFirstAction') === true;
    cleanPlayer.identity = { gender: 'female' };
    cleanPlayer.regionId = validId(
      dataValue(source, 'regionId'),
      regionIds(),
      'qinglan-town'
    );
    cleanPlayer.flags = jsonRecord(rawFlags);
    const rawLifecycle = isRecord(dataValue(source, 'lifecycle'))
      ? dataValue(source, 'lifecycle')
      : {};
    const lifecycleStatus = dataValue(rawLifecycle, 'status');
    cleanPlayer.lifecycle = {
      currentLifeId: cleanString(
        dataValue(rawLifecycle, 'currentLifeId'),
        'life-1'
      ),
      generation: finiteInteger(
        dataValue(rawLifecycle, 'generation'),
        1,
        1
      ),
      source: [
        'founder',
        'descendant',
        'newIdentity'
      ].includes(dataValue(rawLifecycle, 'source'))
        ? dataValue(rawLifecycle, 'source')
        : 'founder',
      sourceNpcId: cleanString(
        dataValue(rawLifecycle, 'sourceNpcId'),
        null
      ),
      ageYears: finiteInteger(
        dataValue(rawLifecycle, 'ageYears'),
        18,
        0
      ),
      ageRemainderSeconds: finiteNumber(
        dataValue(rawLifecycle, 'ageRemainderSeconds'),
        0,
        0
      ),
      status: [
        'active',
        'safety_buffer',
        'transition_pending'
      ].includes(lifecycleStatus) ? lifecycleStatus : 'active',
      pendingCause: [
        'lifespan',
        'voluntary',
        'ascension'
      ].includes(dataValue(rawLifecycle, 'pendingCause'))
        ? dataValue(rawLifecycle, 'pendingCause')
        : null,
      startedAt: finiteNumber(
        dataValue(rawLifecycle, 'startedAt'),
        0,
        0
      )
    };
    if (Number.isFinite(cleanPlayer.shouyuan) &&
        cleanPlayer.shouyuan <= 1 &&
        cleanPlayer.lifecycle.status === 'active') {
      cleanPlayer.lifecycle.status = 'safety_buffer';
      cleanPlayer.lifecycle.pendingCause = 'lifespan';
    }
    if (isRecord(cleanPlayer.mastery) && own(cleanPlayer.mastery, 'charm')) {
      delete cleanPlayer.mastery.charm;
    }
    return cleanPlayer;
  }

  function normalizeNumberMap(value, minimum, maximum) {
    const result = {};
    dataKeys(value).sort().forEach(function (key) {
      if (key.length === 0) return;
      define(
        result,
        key,
        finiteNumber(dataValue(value, key), 0, minimum, maximum)
      );
    });
    return result;
  }

  function safePublicId(value, fallback) {
    return typeof value === 'string' &&
      /^(?!__proto__$)(?!prototype$)(?!constructor$)[A-Za-z0-9._:-]{1,128}$/.test(value)
      ? value
      : fallback;
  }

  function normalizeNpcStats(value) {
    const result = {};
    const source = isRecord(value) ? value : {};
    [
      'maxHp', 'maxQi', 'attack', 'defense', 'accuracy', 'evasion',
      'critChance', 'critDamage', 'actionIntervalTicks',
      'damageReduction', 'healingPower', 'healingTaken', 'shieldPower',
      'qiRegen', 'controlAccuracy', 'controlResistance', 'ailmentPower',
      'ailmentResistance', 'cleansePower', 'threatGain', 'protectionWeight'
    ].forEach(function (key) {
      const amount = dataValue(source, key);
      if (Number.isFinite(amount)) define(result, key, amount);
    });
    return result;
  }

  function normalizeNpcEquipmentSlot(value) {
    if (!isRecord(value)) return null;
    return {
      id: safePublicId(dataValue(value, 'id'), 'npc-gear'),
      name: cleanString(dataValue(value, 'name'), '随身法器'),
      tags: sortedUniqueStrings(dataValue(value, 'tags')).filter(function (tag) {
        return NPC_COMBAT_TAGS.indexOf(tag) >= 0;
      }),
      stats: normalizeNpcStats(dataValue(value, 'stats'))
    };
  }

  function normalizeNpcCondition(value) {
    const source = isRecord(value) ? value : {};
    const type = NPC_CONDITION_TYPES.indexOf(dataValue(source, 'type')) >= 0
      ? dataValue(source, 'type')
      : 'always';
    if (type === 'selfHpBelow' || type === 'selfQiAbove' ||
        type === 'allyHpBelow' || type === 'enemyHpBelow') {
      return {
        type: type,
        threshold: finiteNumber(dataValue(source, 'threshold'), 0.5, 0.01, 1)
      };
    }
    if (type === 'enemyHasStatus') {
      return { type: type, statusId: safePublicId(dataValue(source, 'statusId'), 'stun') };
    }
    if (type === 'selfMissingBuff') {
      return { type: type, buffId: safePublicId(dataValue(source, 'buffId'), 'guard') };
    }
    return { type: 'always' };
  }

  function normalizeNpcTechniqueSlot(value) {
    if (!isRecord(value)) return null;
    const techniqueId = safePublicId(dataValue(value, 'techniqueId'), null);
    if (!techniqueId) return null;
    return {
      techniqueId: techniqueId,
      level: finiteInteger(dataValue(value, 'level'), 1, 1, 20),
      condition: normalizeNpcCondition(dataValue(value, 'condition'))
    };
  }

  function normalizeNpcPassiveSlot(value) {
    if (!isRecord(value)) return null;
    const techniqueId = safePublicId(dataValue(value, 'techniqueId'), null);
    if (!techniqueId) return null;
    return {
      techniqueId: techniqueId,
      level: finiteInteger(dataValue(value, 'level'), 1, 1, 20)
    };
  }

  function normalizeNpcSupply(value) {
    if (!isRecord(value)) return null;
    return {
      id: safePublicId(dataValue(value, 'id'), 'npc-supply'),
      label: cleanString(dataValue(value, 'label'), '随身补给'),
      heal: finiteNumber(dataValue(value, 'heal'), 0, 0),
      restoreQi: finiteNumber(dataValue(value, 'restoreQi'), 0, 0),
      shieldMaxHpRatio: finiteNumber(dataValue(value, 'shieldMaxHpRatio'), 0, 0, 1),
      triggerRatio: finiteNumber(dataValue(value, 'triggerRatio'), 0.5, 0.05, 0.95)
    };
  }

  function normalizeNpcCombatProfile(value) {
    const source = isRecord(value) ? value : {};
    const preferenceTags = sortedUniqueStrings(dataValue(source, 'preferenceTags'))
      .filter(function (tag) { return NPC_COMBAT_TAGS.indexOf(tag) >= 0; });
    return {
      preferenceTags: preferenceTags,
      equipment: {
        weapon: normalizeNpcEquipmentSlot(dataValue(dataValue(source, 'equipment'), 'weapon')),
        armor: normalizeNpcEquipmentSlot(dataValue(dataValue(source, 'equipment'), 'armor')),
        accessory: normalizeNpcEquipmentSlot(dataValue(dataValue(source, 'equipment'), 'accessory'))
      },
      activeTechniques: jsonArray(dataValue(source, 'activeTechniques'))
        .map(normalizeNpcTechniqueSlot).filter(Boolean).slice(0, 4),
      passiveTechniques: jsonArray(dataValue(source, 'passiveTechniques'))
        .map(normalizeNpcPassiveSlot).filter(Boolean).slice(0, 3),
      supplies: {
        food: normalizeNpcSupply(dataValue(dataValue(source, 'supplies'), 'food')),
        pill: normalizeNpcSupply(dataValue(dataValue(source, 'supplies'), 'pill')),
        talisman: normalizeNpcSupply(dataValue(dataValue(source, 'supplies'), 'talisman'))
      },
      sourceEvents: sortedUniqueStrings(dataValue(source, 'sourceEvents'))
        .filter(function (id) { return safePublicId(id, null) === id; })
        .slice(0, 20)
    };
  }

  function normalizeNpcCombatEquipment(value) {
    const source = isRecord(value) ? value : {};
    const slots = EquipmentContent &&
      Array.isArray(EquipmentContent.SLOTS)
      ? EquipmentContent.SLOTS
      : [
        'weapon', 'head', 'robe', 'bracer',
        'belt', 'boots', 'accessory', 'artifact'
      ];
    const instances = [];
    const byId = {};
    jsonArray(dataValue(source, 'instances')).forEach(function (raw) {
      const instance = Equipment &&
        typeof Equipment.normalizeInstance === 'function'
        ? Equipment.normalizeInstance(raw)
        : null;
      if (!instance || own(byId, instance.instanceId)) return;
      byId[instance.instanceId] = instance;
      instances.push(instance);
    });
    const rawMap = isRecord(dataValue(source, 'equipment'))
      ? dataValue(source, 'equipment')
      : {};
    const equipment = {};
    slots.forEach(function (slot) {
      const instanceId = safePublicId(dataValue(rawMap, slot), null);
      const instance = instanceId && byId[instanceId];
      const resolved = instance && Equipment &&
        typeof Equipment.resolve === 'function'
        ? Equipment.resolve(instance)
        : null;
      equipment[slot] = resolved && resolved.slot === slot
        ? instanceId
        : null;
    });
    return {
      version: 1,
      instances: instances,
      equipment: equipment
    };
  }

  function normalizeNpc(raw, recordId) {
    const source = isRecord(raw) ? raw : {};
    const rawIdentity = isRecord(dataValue(source, 'identity'))
      ? dataValue(source, 'identity')
      : {};
    const rawAppearance = isRecord(dataValue(rawIdentity, 'appearance'))
      ? dataValue(rawIdentity, 'appearance')
      : {};
    const statusValue = dataValue(source, 'status');
    const status = NPC_STATUSES.includes(statusValue)
      ? statusValue
      : 'living';
    const rawSkills = dataValue(source, 'skills');
    const skills = {};
    dataKeys(rawSkills).sort().forEach(function (skillId) {
      define(
        skills,
        skillId,
        finiteInteger(dataValue(rawSkills, skillId), 0, 0)
      );
    });
    const inventorySource = isRecord(
      dataValue(source, 'inventorySummary')
    ) ? dataValue(source, 'inventorySummary') : {};
    const genders = GENDERS;
    const personalities = generationIds('PERSONALITY_PROFILES', 'steady');
    const valueProfiles = generationIds('VALUE_PROFILES', 'benevolent');
    const talents = generationIds('TALENTS', 'wood-spirit');
    const principles = generationIds(
      'ROMANCE_PRINCIPLES',
      'negotiable'
    );
    return {
      id: recordId,
      identity: {
        name: cleanString(dataValue(rawIdentity, 'name'), recordId),
        gender: validId(
          dataValue(rawIdentity, 'gender'),
          genders,
          'female'
        ),
        appearance: {
          buildId: cleanString(
            dataValue(rawAppearance, 'buildId'),
            'slender'
          ),
          faceId: cleanString(
            dataValue(rawAppearance, 'faceId'),
            'clear-face'
          ),
          hairId: cleanString(
            dataValue(rawAppearance, 'hairId'),
            'long-black'
          ),
          featureId: cleanString(
            dataValue(rawAppearance, 'featureId'),
            'quiet-eyes'
          )
        }
      },
      ageYears: finiteInteger(dataValue(source, 'ageYears'), 0, 0),
      lifeStage: dataValue(source, 'lifeStage') === 'child'
        ? 'child'
        : 'adult',
      ageRemainderSeconds: finiteNumber(
        dataValue(source, 'ageRemainderSeconds'),
        0,
        0
      ),
      lifespanYears: finiteNumber(
        dataValue(source, 'lifespanYears'),
        28,
        0
      ),
      realmStage: finiteInteger(
        dataValue(source, 'realmStage'),
        0,
        0
      ),
      cultivation: finiteNumber(
        dataValue(source, 'cultivation'),
        0,
        0
      ),
      talentId: validId(
        dataValue(source, 'talentId'),
        talents,
        talents[0]
      ),
      personalityId: validId(
        dataValue(source, 'personalityId'),
        personalities,
        personalities[0]
      ),
      valueProfileId: validId(
        dataValue(source, 'valueProfileId'),
        valueProfiles,
        valueProfiles[0]
      ),
      romancePrincipleId: validId(
        dataValue(source, 'romancePrincipleId'),
        principles,
        principles[0]
      ),
      regionId: validId(
        dataValue(source, 'regionId'),
        regionIds(),
        'qinglan-town'
      ),
      sectId: validId(
        dataValue(source, 'sectId'),
        sectIds(),
        null
      ),
      familyId: cleanString(dataValue(source, 'familyId'), null),
      skills: skills,
      techniques: sortedUniqueStrings(dataValue(source, 'techniques')),
      combatEquipment: normalizeNpcCombatEquipment(
        dataValue(source, 'combatEquipment')
      ),
      combatProfile: normalizeNpcCombatProfile(dataValue(source, 'combatProfile')),
      inventorySummary: {
        wealthTier: finiteInteger(
          dataValue(inventorySource, 'wealthTier'),
          0,
          0
        ),
        notableItemIds: sortedUniqueStrings(
          dataValue(inventorySource, 'notableItemIds')
        )
      },
      biography: jsonArray(dataValue(source, 'biography')),
      keyEventIds: sortedUniqueStrings(dataValue(source, 'keyEventIds')),
      status: status,
      lifecycle: jsonRecord(dataValue(source, 'lifecycle')),
      lastDetailedAt: finiteNumber(
        dataValue(source, 'lastDetailedAt'),
        0,
        0
      ),
      lastBackgroundAt: finiteNumber(
        dataValue(source, 'lastBackgroundAt'),
        0,
        0
      )
    };
  }

  function npcNumber(id) {
    const match = /^npc-([1-9][0-9]*)$/.exec(id);
    return match ? finiteInteger(match[1], 0, 0) : 0;
  }

  function normalizeNpcSystem(value) {
    const source = isRecord(value) ? value : {};
    const rawRecords = dataValue(source, 'records');
    const records = {};
    let highestId = 0;
    dataKeys(rawRecords).sort().forEach(function (recordId) {
      if (recordId.length === 0) return;
      define(records, recordId, normalizeNpc(
        dataValue(rawRecords, recordId),
        recordId
      ));
      highestId = Math.max(highestId, npcNumber(recordId));
    });
    const living = Object.keys(records).filter(function (id) {
      return records[id].status === 'living' &&
        records[id].lifeStage !== 'child';
    });
    const activeTarget = finiteInteger(
      dataValue(source, 'activeTarget'),
      40,
      30,
      50
    );
    const activeIds = [];
    const backgroundIds = [];
    const assigned = new Set();
    function assign(input, target) {
      if (!Array.isArray(input)) return;
      input.forEach(function (id) {
        if (typeof id !== 'string' ||
            assigned.has(id) ||
            !own(records, id) ||
            records[id].status !== 'living') {
          return;
        }
        if (target === activeIds && activeIds.length >= activeTarget) {
          backgroundIds.push(id);
        } else {
          target.push(id);
        }
        assigned.add(id);
      });
    }
    assign(dataValue(source, 'activeIds'), activeIds);
    assign(dataValue(source, 'backgroundIds'), backgroundIds);
    living.forEach(function (id) {
      if (assigned.has(id)) return;
      if (activeIds.length < activeTarget) activeIds.push(id);
      else backgroundIds.push(id);
      assigned.add(id);
    });
    const rawNextId = finiteInteger(
      dataValue(source, 'nextId'),
      highestId + 1,
      1
    );
    return {
      nextId: Math.max(highestId + 1, rawNextId),
      activeTarget: activeTarget,
      records: records,
      activeIds: activeIds,
      backgroundIds: backgroundIds,
      backgroundCursor: backgroundIds.length === 0
        ? 0
        : finiteInteger(
          dataValue(source, 'backgroundCursor'),
          0,
          0,
          backgroundIds.length - 1
        )
    };
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

  function normalizeRelationships(value) {
    const source = isRecord(value) ? value : {};
    const edges = {};
    const rawEdges = dataValue(source, 'edges');
    dataKeys(rawEdges).forEach(function (key) {
      if (!directionalPairKey(key, '>')) return;
      const rawEdge = dataValue(rawEdges, key);
      const edge = {};
      RELATION_KEYS.forEach(function (metric) {
        define(
          edge,
          metric,
          finiteInteger(dataValue(rawEdge, metric), 0, 0, 100)
        );
      });
      edge.lastChangedAt = finiteNumber(
        dataValue(rawEdge, 'lastChangedAt'),
        0,
        0
      );
      define(edges, key, edge);
    });
    const bonds = {};
    const rawBonds = dataValue(source, 'bonds');
    dataKeys(rawBonds).forEach(function (rawKey) {
      const key = unorderedPairKey(rawKey);
      if (!key || own(bonds, key)) return;
      const rawBond = dataValue(rawBonds, rawKey);
      define(bonds, key, {
        stage: cleanString(
          dataValue(rawBond, 'stage'),
          'acquaintance'
        ),
        changedByEventId: cleanString(
          dataValue(rawBond, 'changedByEventId'),
          null
        ),
        changedAt: finiteNumber(
          dataValue(rawBond, 'changedAt'),
          0,
          0
        )
      });
    });
    const restrictions = {};
    const rawRestrictions = dataValue(source, 'restrictions');
    dataKeys(rawRestrictions).forEach(function (rawKey) {
      const key = unorderedPairKey(rawKey);
      const restriction = dataValue(rawRestrictions, rawKey);
      if (!key ||
          !RESTRICTION_TYPES.includes(restriction)) {
        return;
      }
      if (own(restrictions, key) &&
          RESTRICTION_TYPES.indexOf(restrictions[key]) <=
            RESTRICTION_TYPES.indexOf(restriction)) {
        return;
      }
      define(restrictions, key, restriction);
    });
    return {
      edges: edges,
      bonds: bonds,
      restrictions: restrictions
    };
  }

  function normalizeTeamCombat(value, npcs) {
    const source = isRecord(value) ? value : {};
    const rawIds = Array.isArray(dataValue(source, 'companionIds'))
      ? dataValue(source, 'companionIds')
      : [];
    const companionIds = [0, 1, 2].map(function (index) {
      const id = rawIds[index];
      return typeof id === 'string' &&
        own(npcs.records, id) &&
        npcs.records[id].status === 'living'
        ? id
        : null;
    });
    const reactionLog = jsonArray(dataValue(source, 'reactionLog')).map(function (entry, index) {
      const npcId = cleanString(dataValue(entry, 'npcId'), null);
      return {
        id: cleanString(dataValue(entry, 'id'), 'team-reaction-' + (index + 1)),
        npcId: npcId && own(npcs.records, npcId) ? npcId : null,
        dangerLevel: cleanString(dataValue(entry, 'dangerLevel'), 'safe'),
        atMs: finiteNumber(dataValue(entry, 'atMs'), 0, 0),
        affectionDelta: finiteInteger(dataValue(entry, 'affectionDelta'), 0, -100, 100),
        trustDelta: finiteInteger(dataValue(entry, 'trustDelta'), 0, -100, 100)
      };
    }).filter(function (entry) {
      return entry.npcId !== null;
    }).slice(-50);
    return { companionIds: companionIds, reactionLog: reactionLog };
  }

  function normalizePending(value) {
    const pending = jsonArray(value);
    const result = [];
    const ids = new Set();
    for (let pendingIndex = 0;
        pendingIndex < pending.length &&
        result.length < PENDING_LIMIT;
        pendingIndex++) {
      const raw = pending[pendingIndex];
      if (!isRecord(raw)) continue;
      const id = cleanString(dataValue(raw, 'id'), null);
      const options = dataValue(raw, 'options');
      if (!id || ids.has(id) || !Array.isArray(options)) continue;
      const cleanOptions = [];
      const optionIds = new Set();
      for (let optionIndex = 0;
          optionIndex < options.length &&
          cleanOptions.length < EVENT_OPTION_LIMIT;
          optionIndex++) {
        const rawOption = options[optionIndex];
        if (!isRecord(rawOption)) continue;
        const optionId = cleanString(dataValue(rawOption, 'id'), null);
        if (!optionId ||
            optionIds.has(optionId)) continue;
        optionIds.add(optionId);
        cleanOptions.push({
          id: optionId,
          label: cleanString(dataValue(rawOption, 'label'), optionId),
          preview: cleanString(dataValue(rawOption, 'preview'), ''),
          effects: jsonArray(dataValue(rawOption, 'effects'))
        });
      }
      if (cleanOptions.length === 0) continue;
      ids.add(id);
      result.push({
        id: id,
        templateId: cleanString(dataValue(raw, 'templateId'), ''),
        templateRevision: finiteInteger(
          dataValue(raw, 'templateRevision'),
          1,
          1
        ),
        createdAt: finiteNumber(dataValue(raw, 'createdAt'), 0, 0),
        participants: sortedUniqueStrings(
          dataValue(raw, 'participants'),
          PARTICIPANT_LIMIT
        ),
        context: jsonRecord(dataValue(raw, 'context')),
        title: cleanString(dataValue(raw, 'title'), ''),
        body: cleanString(dataValue(raw, 'body'), ''),
        options: cleanOptions
      });
    }
    return result;
  }

  function normalizeHistory(value) {
    return jsonArray(value).filter(function (entry) {
      return isRecord(entry);
    });
  }

  function historyTime(entry) {
    const candidates = ['at', 'createdAt', 'resolvedAt', 'fromAt'];
    for (let index = 0; index < candidates.length; index++) {
      const value = dataValue(entry, candidates[index]);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return 0;
  }

  function historyImportantIds(entry) {
    const explicit = dataValue(entry, 'importantIds');
    const result = sortedUniqueStrings(explicit);
    const seen = new Set(result);
    [
      'npcId',
      'sectId',
      'sourceNpcId',
      'targetNpcId'
    ].forEach(function (key) {
      const value = dataValue(entry, key);
      if (typeof value === 'string' &&
          value.length > 0 &&
          !seen.has(value)) {
        seen.add(value);
        result.push(value);
      }
    });
    return result;
  }

  function normalizeCompacted(value) {
    return normalizeHistory(value).map(function (entry, index) {
      return {
        id: cleanString(
          dataValue(entry, 'id'),
          'compact-existing-' + (index + 1)
        ),
        source: cleanString(dataValue(entry, 'source'), 'mixed'),
        monthIndex: finiteInteger(
          dataValue(entry, 'monthIndex'),
          0,
          0
        ),
        category: cleanString(
          dataValue(entry, 'category'),
          'world'
        ),
        count: finiteInteger(dataValue(entry, 'count'), 0, 0),
        importantIds: sortedUniqueStrings(
          dataValue(entry, 'importantIds')
        )
      };
    }).filter(function (entry) {
      return entry.count > 0;
    });
  }

  function appendCompacted(compacted, entries, source, endExclusive) {
    const groups = {};
    const groupImportantIds = new Map();
    const compactedById = new Map();
    compacted.forEach(function (entry) {
      compactedById.set(entry.id, entry);
    });
    const end = Math.min(
      entries.length,
      finiteInteger(endExclusive, entries.length, 0, entries.length)
    );
    for (let index = 0; index < end; index++) {
      const entry = entries[index];
      const monthIndex = Math.floor(historyTime(entry) / MONTH_SECONDS);
      const category = cleanString(dataValue(entry, 'category'), 'world');
      const groupKey = source + '|' + monthIndex + '|' + category;
      if (!own(groups, groupKey)) {
        define(groups, groupKey, {
          id: 'compact-' + source + '-' + monthIndex + '-' + category,
          source: source,
          monthIndex: monthIndex,
          category: category,
          count: 0,
          importantIds: []
        });
        groupImportantIds.set(groupKey, new Set());
      }
      groups[groupKey].count++;
      const importantIds = groupImportantIds.get(groupKey);
      historyImportantIds(entry).forEach(function (id) {
        if (!importantIds.has(id)) {
          importantIds.add(id);
          groups[groupKey].importantIds.push(id);
        }
      });
    }
    Object.keys(groups).sort().forEach(function (key) {
      const group = groups[key];
      const existing = compactedById.get(group.id);
      if (existing) {
        existing.count += group.count;
        const existingIds = new Set(existing.importantIds);
        group.importantIds.forEach(function (id) {
          if (!existingIds.has(id)) {
            existingIds.add(id);
            existing.importantIds.push(id);
          }
        });
      } else {
        compacted.push(group);
        compactedById.set(group.id, group);
      }
    });
  }

  function compactHistories(events) {
    const compacted = normalizeCompacted(events.compacted);
    const summaryKeepFrom = Math.max(
      0,
      events.summaries.length - SUMMARY_LIMIT
    );
    const evolutionKeepFrom = Math.max(
      0,
      events.evolution.length - EVOLUTION_LIMIT
    );
    appendCompacted(
      compacted,
      events.summaries,
      'summary',
      summaryKeepFrom
    );
    appendCompacted(
      compacted,
      events.evolution,
      'evolution',
      evolutionKeepFrom
    );
    events.summaries = events.summaries.slice(-SUMMARY_LIMIT);
    events.evolution = events.evolution.slice(-EVOLUTION_LIMIT);
    events.compacted = compacted;
    return events;
  }

  function normalizeEvents(value) {
    const source = isRecord(value) ? value : {};
    const day = isRecord(dataValue(source, 'day'))
      ? dataValue(source, 'day')
      : {};
    const events = {
      nextId: finiteInteger(dataValue(source, 'nextId'), 1, 1),
      pending: normalizePending(dataValue(source, 'pending')),
      resolvedRecent: normalizeHistory(
        dataValue(source, 'resolvedRecent')
      ).slice(-RESOLVED_RECENT_LIMIT),
      resolvedIdRanges: jsonArray(
        dataValue(source, 'resolvedIdRanges')
      ),
      summaries: normalizeHistory(dataValue(source, 'summaries')),
      evolution: normalizeHistory(dataValue(source, 'evolution')),
      compacted: normalizeCompacted(dataValue(source, 'compacted')),
      cooldowns: normalizeNumberMap(
        dataValue(source, 'cooldowns'),
        0
      ),
      day: {
        index: finiteInteger(dataValue(day, 'index'), 0, 0),
        budget: finiteInteger(dataValue(day, 'budget'), 0, 0),
        attempted: finiteInteger(dataValue(day, 'attempted'), 0, 0),
        created: finiteInteger(dataValue(day, 'created'), 0, 0)
      }
    };
    return compactHistories(events);
  }

  function normalizeSectNumberMap(value) {
    const result = {};
    sectIds().forEach(function (sectId) {
      if (!own(value || {}, sectId)) return;
      define(
        result,
        sectId,
        finiteNumber(dataValue(value, sectId), 0)
      );
    });
    return result;
  }

  function normalizeSects(value, npcs) {
    const source = isRecord(value) ? value : {};
    const rawPlayer = isRecord(dataValue(source, 'player'))
      ? dataValue(source, 'player')
      : {};
    const rawRecords = isRecord(dataValue(source, 'records'))
      ? dataValue(source, 'records')
      : {};
    const records = {};
    sectIds().forEach(function (sectId) {
      const raw = isRecord(dataValue(rawRecords, sectId))
        ? dataValue(rawRecords, sectId)
        : {};
      const roles = {};
      const rawRoles = dataValue(raw, 'roleByNpcId');
      dataKeys(rawRoles).sort().forEach(function (npcId) {
        if (!own(npcs.records, npcId) ||
            npcs.records[npcId].sectId !== sectId) {
          return;
        }
        const role = cleanString(dataValue(rawRoles, npcId), null);
        if (role) define(roles, npcId, role);
      });
      const leaderId = cleanString(dataValue(raw, 'leaderId'), null);
      define(records, sectId, {
        id: sectId,
        leaderId: leaderId &&
          own(npcs.records, leaderId) &&
          npcs.records[leaderId].sectId === sectId
          ? leaderId
          : null,
        roleByNpcId: roles,
        power: finiteNumber(dataValue(raw, 'power'), 1, 1),
        reputation: finiteNumber(dataValue(raw, 'reputation'), 0),
        lastChangedAt: finiteNumber(
          dataValue(raw, 'lastChangedAt'),
          0,
          0
        )
      });
    });
    const pairStates = {};
    const rawPairs = dataValue(source, 'pairStates');
    dataKeys(rawPairs).forEach(function (rawKey) {
      const key = unorderedPairKey(rawKey);
      if (!key || own(pairStates, key)) return;
      const pair = key.split('|');
      if (!sectIds().includes(pair[0]) || !sectIds().includes(pair[1])) {
        return;
      }
      define(pairStates, key, jsonRecord(dataValue(rawPairs, rawKey)));
    });
    return {
      player: {
        sectId: validId(
          dataValue(rawPlayer, 'sectId'),
          sectIds(),
          null
        ),
        joinedAt: dataValue(rawPlayer, 'joinedAt') == null
          ? null
          : finiteNumber(dataValue(rawPlayer, 'joinedAt'), null, 0),
        contribution: normalizeSectNumberMap(
          dataValue(rawPlayer, 'contribution')
        ),
        reputation: normalizeSectNumberMap(
          dataValue(rawPlayer, 'reputation')
        ),
        choiceEventOffered:
          dataValue(rawPlayer, 'choiceEventOffered') === true,
        choiceAvailableAt: finiteNumber(
          dataValue(rawPlayer, 'choiceAvailableAt'),
          0,
          0
        )
      },
      records: records,
      pairStates: pairStates
    };
  }

  function benefitNumber(id) {
    const match = /^social-benefit-([1-9][0-9]*)$/.exec(id);
    return match ? finiteInteger(match[1], 0, 0) : 0;
  }

  function normalizeSocial(value) {
    const source = isRecord(value) ? value : {};
    const benefits = [];
    const seen = new Set();
    let highestId = 0;
    if (Array.isArray(dataValue(source, 'benefits'))) {
      dataValue(source, 'benefits').forEach(function (raw) {
        if (!isRecord(raw)) return;
        const id = cleanString(dataValue(raw, 'id'), null);
        const sourceNpcId = cleanString(
          dataValue(raw, 'sourceNpcId'),
          null
        );
        const effectId = cleanString(dataValue(raw, 'effectId'), null);
        if (!id || !sourceNpcId || !effectId || seen.has(id)) return;
        seen.add(id);
        highestId = Math.max(highestId, benefitNumber(id));
        benefits.push({
          id: id,
          sourceNpcId: sourceNpcId,
          effectId: effectId,
          remainingSeconds: finiteNumber(
            dataValue(raw, 'remainingSeconds'),
            0,
            0
          ),
          totalSeconds: finiteNumber(
            dataValue(raw, 'totalSeconds'),
            0,
            0
          )
        });
      });
    }
    return {
      nextBenefitId: Math.max(
        highestId + 1,
        finiteInteger(dataValue(source, 'nextBenefitId'), 1, 1)
      ),
      benefits: benefits
    };
  }

  function normalizeWorld(value, cleanWorld) {
    const source = isRecord(value) ? value : {};
    const world = isRecord(cleanWorld) ? cleanWorld : {};
    world.elapsedSeconds = finiteNumber(
      dataValue(source, 'elapsedSeconds'),
      0,
      0
    );
    world.activeAccumulator = finiteNumber(
      dataValue(source, 'activeAccumulator'),
      0,
      0
    );
    world.backgroundAccumulator = finiteNumber(
      dataValue(source, 'backgroundAccumulator'),
      0,
      0
    );
    world.sectAccumulator = finiteNumber(
      dataValue(source, 'sectAccumulator'),
      0,
      0
    );
    world.eventAccumulator = finiteNumber(
      dataValue(source, 'eventAccumulator'),
      0,
      0
    );
    const rawRegions = dataValue(source, 'regions');
    const regions = {};
    regionIds().forEach(function (regionId) {
      const raw = isRecord(dataValue(rawRegions, regionId))
        ? dataValue(rawRegions, regionId)
        : {};
      define(regions, regionId, {
        prosperity: finiteInteger(
          dataValue(raw, 'prosperity'),
          50,
          0,
          100
        ),
        danger: finiteInteger(
          dataValue(raw, 'danger'),
          10,
          0,
          100
        ),
        controllingSectId: validId(
          dataValue(raw, 'controllingSectId'),
          sectIds(),
          null
        ),
        lastChangedAt: finiteNumber(
          dataValue(raw, 'lastChangedAt'),
          0,
          0
        )
      });
    });
    world.regions = regions;
    return world;
  }

  function normalizeParallel(cleanParallel) {
    const source = isRecord(cleanParallel) ? cleanParallel : { jobs: [] };
    const jobs = [];
    const seen = new Set();
    if (Array.isArray(source.jobs)) {
      source.jobs.forEach(function (job) {
        if (!isRecord(job) ||
            typeof job.id !== 'string' ||
            job.id.length === 0 ||
            seen.has(job.id)) {
          return;
        }
        seen.add(job.id);
        if (job.kind !== 'social') {
          jobs.push(jsonRecord(job));
          return;
        }
        const social = {
          id: job.id,
          kind: 'social',
          npcId: cleanString(job.npcId, ''),
          sourceEventId: cleanString(job.sourceEventId, null),
          label: cleanString(job.label, ''),
          remainingSeconds: finiteNumber(job.remainingSeconds, 0, 0),
          totalSeconds: finiteNumber(job.totalSeconds, 0, 0),
          followupTemplateId: cleanString(job.followupTemplateId, null),
          context: jsonRecord(job.context),
          ready: job.ready === true,
          completionReported: job.completionReported === true
        };
        if (own(job, 'remainingAnchorMs')) {
          social.remainingAnchorMs =
            job.remainingAnchorMs == null
              ? null
              : finiteNumber(job.remainingAnchorMs, null, 0);
        }
        if (own(job, 'remainingBaseSeconds')) {
          social.remainingBaseSeconds =
            job.remainingBaseSeconds == null
              ? null
              : finiteNumber(job.remainingBaseSeconds, null, 0);
        }
        jobs.push(social);
      });
    }
    return { jobs: jobs };
  }

  function normalizeInheritanceHall(value) {
    const source = isRecord(value) ? value : {};
    const rawPlan = isRecord(dataValue(source, 'plan'))
      ? dataValue(source, 'plan')
      : {};
    return {
      level: 1,
      plan: {
        fullMasteryIds: sortedUniqueStrings(
          dataValue(rawPlan, 'fullMasteryIds')
        ).slice(0, 3),
        techniqueIds: sortedUniqueStrings(
          dataValue(rawPlan, 'techniqueIds')
        ).slice(0, 2),
        equipmentItemIds: sortedUniqueStrings(
          dataValue(rawPlan, 'equipmentItemIds')
        ).slice(0, 1),
        resourceItemIds: sortedUniqueStrings(
          dataValue(rawPlan, 'resourceItemIds')
        ).slice(0, 3)
      }
    };
  }

  function normalizeLineage(value, npcs) {
    const source = isRecord(value) ? value : {};
    const descendants = {};
    const rawDescendants = dataValue(source, 'descendants');
    dataKeys(rawDescendants).sort().forEach(function (npcId) {
      if (!own(npcs.records, npcId)) return;
      const raw = isRecord(dataValue(rawDescendants, npcId))
        ? dataValue(rawDescendants, npcId)
        : {};
      define(descendants, npcId, {
        npcId: npcId,
        playerLifeId: cleanString(
          dataValue(raw, 'playerLifeId'),
          'life-1'
        ),
        partnerNpcId: cleanString(
          dataValue(raw, 'partnerNpcId'),
          null
        ),
        ritualId: cleanString(dataValue(raw, 'ritualId'), null),
        bornAt: finiteNumber(dataValue(raw, 'bornAt'), 0, 0),
        adultAt: dataValue(raw, 'adultAt') == null
          ? null
          : finiteNumber(dataValue(raw, 'adultAt'), null, 0)
      });
    });
    const rituals = [];
    const rawRituals = dataValue(source, 'rituals');
    if (Array.isArray(rawRituals)) {
      rawRituals.slice(-100).forEach(function (raw) {
        if (!isRecord(raw)) return;
        const id = cleanString(dataValue(raw, 'id'), null);
        const partnerNpcId = cleanString(
          dataValue(raw, 'partnerNpcId'),
          null
        );
        if (!id || !partnerNpcId) return;
        rituals.push({
          id: id,
          playerLifeId: cleanString(
            dataValue(raw, 'playerLifeId'),
            'life-1'
          ),
          partnerNpcId: partnerNpcId,
          startedAt: finiteNumber(dataValue(raw, 'startedAt'), 0, 0),
          completedAt: dataValue(raw, 'completedAt') == null
            ? null
            : finiteNumber(dataValue(raw, 'completedAt'), null, 0),
          childNpcId: cleanString(dataValue(raw, 'childNpcId'), null),
          status: ['active', 'completed', 'cancelled'].includes(
            dataValue(raw, 'status')
          ) ? dataValue(raw, 'status') : 'active'
        });
      });
    }
    const pending = dataValue(source, 'pendingTransition');
    return {
      nextLifeId: finiteInteger(dataValue(source, 'nextLifeId'), 2, 2),
      nextRitualId: finiteInteger(
        dataValue(source, 'nextRitualId'),
        1,
        1
      ),
      nextTransitionId: finiteInteger(
        dataValue(source, 'nextTransitionId'),
        1,
        1
      ),
      descendants: descendants,
      rituals: rituals,
      lives: jsonArray(dataValue(source, 'lives')),
      pendingTransition: isRecord(pending) ? jsonRecord(pending) : null
    };
  }

  function normalize(model, options) {
    const source = jsonRecord(model);
    const rawPlayer = isRecord(dataValue(source, 'player'))
      ? dataValue(source, 'player')
      : null;
    const rawSystems = isRecord(dataValue(source, 'systems'))
      ? dataValue(source, 'systems')
      : {};
    const clean = Stage3State.normalize(source, {
      preserveLegacyFields: stableBooleanOption(
        options,
        'preserveLegacyFields'
      )
    });
    normalizePlayer(rawPlayer || {}, clean.player);
    const npcs = normalizeNpcSystem(dataValue(rawSystems, 'npcs'));
    clean.systems.npcs = npcs;
    clean.systems.teamCombat = normalizeTeamCombat(
      dataValue(rawSystems, 'teamCombat'),
      npcs
    );
    clean.systems.relationships = normalizeRelationships(
      dataValue(rawSystems, 'relationships')
    );
    clean.systems.events = normalizeEvents(dataValue(rawSystems, 'events'));
    clean.systems.sects = normalizeSects(
      dataValue(rawSystems, 'sects'),
      npcs
    );
    clean.systems.social = normalizeSocial(
      dataValue(rawSystems, 'social')
    );
    clean.systems.lineage = normalizeLineage(
      dataValue(rawSystems, 'lineage'),
      npcs
    );
    if (!isRecord(clean.systems.homestead)) {
      clean.systems.homestead = {};
    }
    clean.systems.homestead.inheritanceHall =
      normalizeInheritanceHall(
        dataValue(
          dataValue(rawSystems, 'homestead'),
          'inheritanceHall'
        )
      );
    clean.systems.parallel = normalizeParallel(clean.systems.parallel);
    clean.systems.world = normalizeWorld(
      dataValue(rawSystems, 'world'),
      clean.systems.world
    );
    const rebalanced = NpcRoster &&
      typeof NpcRoster.rebalance === 'function'
      ? NpcRoster.rebalance(clean, {
        target: clean.systems.npcs.activeTarget
      })
      : null;
    return rebalanced || clean;
  }

  function hasCompletedAction(source) {
    const current = dataValue(source, 'current');
    if (isRecord(current) &&
        finiteInteger(dataValue(current, 'done'), 0, 0) > 0) {
      return true;
    }
    const reports = [];
    const archive = dataValue(source, 'reportArchive');
    if (Array.isArray(archive)) reports.push.apply(reports, archive);
    const pending = dataValue(source, 'pendingOfflineReports');
    if (Array.isArray(pending)) reports.push.apply(reports, pending);
    const envelope = dataValue(source, 'pendingOfflineReport');
    if (isRecord(envelope) &&
        Array.isArray(dataValue(envelope, 'reports'))) {
      reports.push.apply(reports, dataValue(envelope, 'reports'));
    }
    return reports.some(function (report) {
      const action = dataValue(report, 'action');
      return isRecord(action) &&
        finiteInteger(dataValue(action, 'completed'), 0, 0) > 0;
    });
  }

  function migrateV4(model, options) {
    const source = jsonRecord(model);
    const candidate = jsonRecord(source);
    candidate.schemaVersion = VERSION;
    if (isRecord(candidate.player)) {
      const flags = isRecord(candidate.player.flags)
        ? candidate.player.flags
        : {};
      flags.completedFirstAction = hasCompletedAction(source);
      candidate.player.flags = flags;
    }
    const certifiedOptions = stableOptionsRecord(options);
    const injectedBootstrap = dataValue(
      certifiedOptions,
      'bootstrapWorld'
    );
    const defaultBootstrap = dataValue(NpcGenerator, 'bootstrap');
    const bootstrapWorld = typeof injectedBootstrap === 'function'
      ? injectedBootstrap
      : defaultBootstrap;
    if (dataValue(source, 'schemaVersion') === 4 &&
        typeof bootstrapWorld === 'function') {
      const count = NpcGenerationContent &&
        NpcGenerationContent.GENERATION_RULES
        ? NpcGenerationContent.GENERATION_RULES.bootstrapCount
        : 120;
      const result = bootstrapWorld({
        count: count,
        rngState: candidate.rngState,
        content: Object.freeze({
          regions: RegionContent,
          sects: SectContent,
          generation: NpcGenerationContent
        })
      });
      if (isRecord(result)) {
        if (!isRecord(candidate.systems)) candidate.systems = {};
        candidate.systems.npcs = {
          nextId: dataValue(result, 'nextId'),
          activeTarget: 40,
          records: dataValue(result, 'records'),
          activeIds: [],
          backgroundIds: [],
          backgroundCursor: 0
        };
        const nextSeed = dataValue(result, 'rngState');
        if (Number.isInteger(nextSeed) &&
            nextSeed > 0 &&
            nextSeed <= 0xFFFFFFFF) {
          candidate.rngState = nextSeed;
        }
      }
    }
    return normalize(candidate);
  }

  function sameJson(left, right) {
    try {
      return JSON.stringify(left) === JSON.stringify(right);
    } catch (error) {
      return false;
    }
  }

  function validate(model) {
    const source = jsonRecord(model);
    if (dataValue(source, 'schemaVersion') !== VERSION) {
      return false;
    }
    return sameJson(source, jsonRecord(normalize(source)));
  }

  function compactEventHistory(model) {
    const clean = normalize(model);
    clean.systems.events = compactHistories(clean.systems.events);
    return clean;
  }

  return Object.freeze({
    VERSION: VERSION,
    defaults: defaults,
    migrateV4: migrateV4,
    normalize: normalize,
    validate: validate,
    compactEventHistory: compactEventHistory,
    snapshotJsonData: snapshotJsonData
  });
});
