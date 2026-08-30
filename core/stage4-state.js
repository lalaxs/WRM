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
      require('./equipment.js'),
      require('../content/social-interactions.js'),
      require('../content/sect-offices.js'),
      require('./sect-offices.js'),
      require('./person-factory.js')
    )
    : factory(
      root && root.Stage3State,
      root && root.RegionContent,
      root && root.SectContent,
      root && root.NpcGenerationContent,
      root && root.NpcGenerator,
      root && root.NpcRoster,
      root && root.EquipmentContent,
      root && root.Equipment,
      root && root.SocialInteractionContent,
      root && root.SectOfficeContent,
      root && root.SectOffices,
      root && root.PersonFactory
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
  Equipment,
  SocialInteractionContent,
  SectOfficeContent,
  SectOffices,
  PersonFactory
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

  function defaultSectRecords() {
    const records = {};
    sectIds().forEach(function (sectId) {
      define(records, sectId, {
        id: sectId,
        leaderId: null,
        roleByNpcId: {},
        officeHolders: {},
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
        spiritualRootId: 'single',
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
          restrictions: {},
          npcAffinities: {},
          tags: {},
          arcs: {}
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
            choiceAvailableAt: 0,
            discipleRank: 'disciple',
            officeSlotId: 'disciple',
            job: 0,
            lifetimeContribution: 0,
            mission: {
              missionId: null,
              stepIndex: 0,
              status: 'idle',
              combatKillBaseline: 0,
              combatBaselines: {},
              completedMissionIds: [],
              boardPeriod: -1,
              boardOfferIds: [],
              boardStatuses: {},
              boardResolved: {},
              activeResolved: null
            }
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
          monthAccumulator: 0,
          nextWorldEventId: 1,
          worldEvents: [],
          calendar: {
            year: 1,
            month: 1,
            monthAccumulator: 0,
            yearEventBudget: 36,
            yearEventsCreated: 0,
            monthEventsCreated: 0,
            npcYearAppearances: {},
            playerLeapLastMonth: {}
          },
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
    cleanPlayer.spiritualRootId = validSpiritualRootId(
      dataValue(source, 'spiritualRootId')
    );
    cleanPlayer.kin = normalizeKin(dataValue(source, 'kin'));
    cleanPlayer.familyId = cleanString(dataValue(source, 'familyId'), null);
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

  function normalizeKin(raw) {
    const source = isRecord(raw) ? raw : {};
    function cleanPersonRef(value) {
      const id = cleanString(value, null);
      if (!id) return null;
      if (id === 'player' || /^npc-/.test(id)) return id;
      return null;
    }
    return {
      fa: cleanPersonRef(dataValue(source, 'fa')),
      mo: cleanPersonRef(dataValue(source, 'mo')),
      par: cleanPersonRef(dataValue(source, 'par')),
      frs: sortedUniqueStrings(dataValue(source, 'frs'))
        .filter(function (id) {
          return id === 'player' || /^npc-/.test(id);
        }),
      ens: sortedUniqueStrings(dataValue(source, 'ens'))
        .filter(function (id) {
          return id === 'player' || /^npc-/.test(id);
        })
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
    const daoHeartTraits = generationIds('DAO_HEART_TRAITS', 'loyal');
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
      // 原版别名（与 realmStage/cultivation 双写；缺省时由修炼模块补齐）
      level_l: finiteInteger(dataValue(source, 'level_l'), 0, 0, 9),
      level_s: finiteInteger(dataValue(source, 'level_s'), 0, 0, 20),
      exp1: finiteNumber(dataValue(source, 'exp1'), 0, 0),
      history: (function () {
        const rows = [];
        jsonArray(dataValue(source, 'history')).forEach(function (row) {
          if (!Array.isArray(row) || !row.length) return;
          rows.push(row.slice(0, 6));
        });
        return rows.slice(-80);
      })(),
      cultivationEfficiency: (function () {
        const raw = finiteNumber(
          dataValue(source, 'cultivationEfficiency'),
          0,
          0
        );
        if (raw > 0) return Math.round(raw * 100) / 100;
        const stage = finiteInteger(
          dataValue(source, 'realmStage'),
          0,
          0
        );
        const rootId = validSpiritualRootId(
          dataValue(source, 'spiritualRootId')
        );
        if (NpcGenerationContent &&
            typeof NpcGenerationContent.cultivationEfficiencyFor ===
              'function') {
          return NpcGenerationContent.cultivationEfficiencyFor(
            stage,
            rootId,
            0.5
          );
        }
        return Math.round((0.6 + stage * 1.8 + stage * stage * 1.6) * 100) /
          100;
      })(),
      spiritualRootId: validSpiritualRootId(
        dataValue(source, 'spiritualRootId')
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
      traits: (function () {
        const raw = sortedUniqueStrings(dataValue(source, 'traits'))
          .filter(function (id) { return daoHeartTraits.indexOf(id) >= 0; })
          .slice(0, 2);
        if (raw.length > 0) return raw;
        // 旧档无 traits：按 id 哈希派生 1~2 个稳定标签（同档结果一致）。
        let hash = 0;
        const seed = String(recordId || '');
        for (let index = 0; index < seed.length; index++) {
          hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
        }
        const first = daoHeartTraits[hash % daoHeartTraits.length];
        const second = daoHeartTraits[
          ((hash >>> 4) + 3) % daoHeartTraits.length
        ];
        return second !== first ? [first, second] : [first];
      })(),
      parentIds: sortedUniqueStrings(dataValue(source, 'parentIds'))
        .filter(function (id) {
          return id === 'player' || /^npc-/.test(id);
        })
        .slice(0, 2),
      mentorNpcId: (function () {
        const mentorId = cleanString(
          dataValue(source, 'mentorNpcId'),
          null
        );
        if (!mentorId || mentorId === recordId) return null;
        if (mentorId === 'player' || /^npc-/.test(mentorId)) return mentorId;
        return null;
      })(),
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
      officeSlotId: (function () {
        const sectId = validId(
          dataValue(source, 'sectId'),
          sectIds(),
          null
        );
        const slotId = dataValue(source, 'officeSlotId');
        if (!sectId || typeof slotId !== 'string') return null;
        if (!SectOfficeContent ||
            typeof SectOfficeContent.getSlot !== 'function') {
          return null;
        }
        const slot = SectOfficeContent.getSlot(sectId, slotId);
        return slot ? slot.id : null;
      })(),
      rogueTitleId: (function () {
        const sectId = validId(
          dataValue(source, 'sectId'),
          sectIds(),
          null
        );
        if (sectId) return null;
        const titleId = dataValue(source, 'rogueTitleId');
        if (typeof titleId !== 'string') return null;
        return SectOfficeContent &&
          typeof SectOfficeContent.getRogueTitle === 'function' &&
          SectOfficeContent.getRogueTitle(titleId)
          ? titleId
          : null;
      })(),
      familyId: cleanString(dataValue(source, 'familyId'), null),
      skills: skills,
      techniques: sortedUniqueStrings(dataValue(source, 'techniques')),
      combatEquipment: normalizeNpcCombatEquipment(
        dataValue(source, 'combatEquipment')
      ),
      combatProfile: normalizeNpcCombatProfile(dataValue(source, 'combatProfile')),
      spiritPet: (function () {
        const raw = dataValue(source, 'spiritPet');
        if (!raw || typeof raw !== 'object') return null;
        const stage = raw.stage === 'formed' || raw.stage === 'young' ||
          raw.stage === 'egg'
          ? raw.stage
          : 'young';
        return {
          stage: stage,
          youngName: typeof raw.youngName === 'string' ? raw.youngName : null,
          formName: typeof raw.formName === 'string' ? raw.formName : null,
          speciesHint: raw.speciesHint === 'phoenix' ? 'phoenix' : 'dragon',
          bondedAtMonth: finiteInteger(raw.bondedAtMonth, 0, 0)
        };
      })(),
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
      biography: (function () {
        // 开局经历只保留出身；旧档 pregame 旧事不再展示/落盘。
        return jsonArray(dataValue(source, 'biography')).filter(function (entry) {
          if (!entry || typeof entry !== 'object') return true;
          return entry.type !== 'pregame';
        }).map(function (entry) {
          if (!entry || typeof entry !== 'object' || entry.type !== 'origin') {
            return entry;
          }
          if (typeof entry.text === 'string' &&
              entry.text.indexOf('自此在修行路上留下姓名') >= 0 &&
              typeof entry.regionId === 'string') {
            const region = RegionContent &&
              typeof RegionContent.get === 'function'
              ? RegionContent.get(entry.regionId)
              : null;
            const name = region && region.name
              ? region.name
              : entry.text.replace(/^出生于/, '').replace(/，.*$/, '').replace(/。$/, '');
            return Object.assign({}, entry, {
              text: '出生于' + name + '。'
            });
          }
          return entry;
        });
      })(),
      keyEventIds: sortedUniqueStrings(dataValue(source, 'keyEventIds')),
      status: status,
      activityStatus: ACTIVITY_STATUSES.indexOf(
        dataValue(source, 'activityStatus')
      ) >= 0
        ? dataValue(source, 'activityStatus')
        : 'normal',
      birthdayMonth: finiteInteger(
        dataValue(source, 'birthdayMonth'),
        1,
        1,
        12
      ),
      birthdayDay: finiteInteger(
        dataValue(source, 'birthdayDay'),
        1,
        1,
        28
      ),
      metPlayer: dataValue(source, 'metPlayer') === true,
      kin: normalizeKin(dataValue(source, 'kin')),
      preferences: (function () {
        const raw = isRecord(dataValue(source, 'preferences'))
          ? dataValue(source, 'preferences')
          : {};
        const loveItemIds = sortedUniqueStrings(
          dataValue(raw, 'loveItemIds')
        ).slice(0, 2);
        const likeCategories = [];
        jsonArray(dataValue(raw, 'likeCategories')).forEach(function (cat) {
          if (typeof cat === 'string' &&
              PREFERENCE_CATEGORIES.indexOf(cat) >= 0 &&
              likeCategories.indexOf(cat) < 0 &&
              likeCategories.length < 2) {
            likeCategories.push(cat);
          }
        });
        if (likeCategories.length === 0 && loveItemIds.length === 0) {
          let hash = 0;
          const seed = String(recordId || '');
          for (let index = 0; index < seed.length; index++) {
            hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
          }
          const first = PREFERENCE_CATEGORIES[
            hash % PREFERENCE_CATEGORIES.length
          ];
          const second = PREFERENCE_CATEGORIES[
            ((hash >>> 4) + 3) % PREFERENCE_CATEGORIES.length
          ];
          likeCategories.push(first);
          if (second !== first) likeCategories.push(second);
        }
        const dislike = dataValue(raw, 'dislikeCategory');
        return {
          loveItemIds: loveItemIds,
          likeCategories: likeCategories,
          dislikeCategory: typeof dislike === 'string' &&
            PREFERENCE_CATEGORIES.indexOf(dislike) >= 0
            ? dislike
            : null
        };
      })(),
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
        let raw = dataValue(rawEdge, metric);
        if (metric === 'closeness' &&
            raw == null &&
            dataValue(rawEdge, 'resentment') != null) {
          raw = dataValue(rawEdge, 'resentment');
        }
        define(
          edge,
          metric,
          finiteInteger(raw, 0, 0, 100)
        );
      });
      // v5 resentment discarded; closeness defaults to 0 unless already present.
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
    const npcAffinities = {};
    const rawAffinities = dataValue(source, 'npcAffinities');
    dataKeys(rawAffinities).forEach(function (key) {
      if (!directionalPairKey(key, '>')) return;
      const amount = finiteInteger(dataValue(rawAffinities, key), 0, -100, 100);
      if (amount !== 0) define(npcAffinities, key, amount);
    });
    const tags = {};
    const rawTags = dataValue(source, 'tags');
    dataKeys(rawTags).forEach(function (rawKey) {
      const key = unorderedPairKey(rawKey);
      if (!key || own(tags, key)) return;
      const list = [];
      const seen = {};
      jsonArray(dataValue(rawTags, rawKey)).forEach(function (tag) {
        if (typeof tag !== 'string' ||
            RELATION_TAG_IDS.indexOf(tag) < 0 ||
            seen[tag]) {
          return;
        }
        seen[tag] = true;
        list.push(tag);
      });
      if (list.length) define(tags, key, list);
    });
    const arcs = {};
    const rawArcs = dataValue(source, 'arcs');
    dataKeys(rawArcs).forEach(function (rawKey) {
      const key = unorderedPairKey(rawKey);
      if (!key || own(arcs, key)) return;
      const rawArc = dataValue(rawArcs, rawKey);
      if (!isRecord(rawArc)) return;
      const stage = cleanString(dataValue(rawArc, 'stage'), null);
      if (!stage || RELATION_ARC_STAGES.indexOf(stage) < 0) return;
      define(arcs, key, {
        stage: stage,
        lastEventMonth: finiteInteger(
          dataValue(rawArc, 'lastEventMonth'),
          0,
          0,
          1e9
        ),
        lastChronicleMonth: finiteInteger(
          dataValue(rawArc, 'lastChronicleMonth'),
          0,
          0,
          1e9
        ),
        eventCount: finiteInteger(
          dataValue(rawArc, 'eventCount'),
          0,
          0,
          1e6
        ),
        romanceBeat: [
          'none',
          'courting',
          'gifted',
          'jealous',
          'confessed',
          'bonded'
        ].indexOf(cleanString(dataValue(rawArc, 'romanceBeat'), 'none')) >= 0
          ? cleanString(dataValue(rawArc, 'romanceBeat'), 'none')
          : 'none'
      });
    });
    return {
      edges: edges,
      bonds: bonds,
      restrictions: restrictions,
      npcAffinities: npcAffinities,
      tags: tags,
      arcs: arcs
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

  function normalizePending() {
    // 待决策已删除；读档一律清空遗留 pending。
    return [];
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
      const officeHolders = {};
      const rawHolders = isRecord(dataValue(raw, 'officeHolders'))
        ? dataValue(raw, 'officeHolders')
        : {};
      const slotDefs = SectOfficeContent &&
        typeof SectOfficeContent.listSlots === 'function'
        ? SectOfficeContent.listSlots(sectId)
        : [];
      slotDefs.forEach(function (slotDef) {
        const rawList = dataValue(rawHolders, slotDef.id);
        const holders = [];
        jsonArray(rawList).forEach(function (npcId) {
          if (typeof npcId !== 'string' ||
              !own(npcs.records, npcId) ||
              npcs.records[npcId].sectId !== sectId) {
            return;
          }
          if (holders.indexOf(npcId) < 0) holders.push(npcId);
        });
        define(officeHolders, slotDef.id, holders);
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
        officeHolders: officeHolders,
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
        ),
        discipleRank: (function () {
          const rank = dataValue(rawPlayer, 'discipleRank');
          const office = dataValue(rawPlayer, 'officeSlotId');
          const raw = typeof rank === 'string' ? rank
            : (typeof office === 'string' ? office : 'disciple');
          const aliases = {
            outer: 'disciple',
            inner: 'disciple',
            trueDisciple: 'elder',
            true: 'elder',
            steward: 'peak',
            honor: 'leader'
          };
          const allowed = {
            disciple: true,
            elder: true,
            peak: true,
            leader: true
          };
          const mapped = aliases[raw] || raw;
          return allowed[mapped] ? mapped : 'disciple';
        })(),
        officeSlotId: (function () {
          const rank = dataValue(rawPlayer, 'discipleRank');
          const office = dataValue(rawPlayer, 'officeSlotId');
          const raw = typeof office === 'string' ? office
            : (typeof rank === 'string' ? rank : 'disciple');
          const aliases = {
            outer: 'disciple',
            inner: 'disciple',
            trueDisciple: 'elder',
            true: 'elder',
            steward: 'peak',
            honor: 'leader'
          };
          const allowed = {
            disciple: true,
            elder: true,
            peak: true,
            leader: true
          };
          const mapped = aliases[raw] || raw;
          return allowed[mapped] ? mapped : 'disciple';
        })(),
        job: (function () {
          const job = dataValue(rawPlayer, 'job');
          if (typeof job === 'number' && job >= 0 && job <= 4) return job | 0;
          const rank = dataValue(rawPlayer, 'discipleRank');
          const office = dataValue(rawPlayer, 'officeSlotId');
          const raw = typeof office === 'string' ? office
            : (typeof rank === 'string' ? rank : 'disciple');
          const map = {
            disciple: 0, elder: 1, peak: 2, leader: 3, honor: 4,
            outer: 0, inner: 0, trueDisciple: 1, true: 1, steward: 2
          };
          return typeof map[raw] === 'number' ? map[raw] : 0;
        })(),
        lifetimeContribution: finiteNumber(
          dataValue(rawPlayer, 'lifetimeContribution'),
          0,
          0
        ),
        mission: normalizeSectMission(dataValue(rawPlayer, 'mission'))
      },
      records: records,
      pairStates: pairStates
    };
  }

  function normalizeSectMission(value) {
    const source = isRecord(value) ? value : {};
    const completed = [];
    const seen = new Set();
    if (Array.isArray(dataValue(source, 'completedMissionIds'))) {
      dataValue(source, 'completedMissionIds').forEach(function (id) {
        if (typeof id !== 'string' || !id || seen.has(id)) return;
        seen.add(id);
        completed.push(id);
      });
    }
    const status = dataValue(source, 'status');
    const boardOfferIds = [];
    if (Array.isArray(dataValue(source, 'boardOfferIds'))) {
      dataValue(source, 'boardOfferIds').forEach(function (id) {
        if (typeof id === 'string' && id) boardOfferIds.push(id);
      });
    }
    const boardStatuses = {};
    const rawStatuses = dataValue(source, 'boardStatuses');
    if (isRecord(rawStatuses)) {
      dataKeys(rawStatuses).sort().forEach(function (key) {
        const value = dataValue(rawStatuses, key);
        if (value === 'available' || value === 'active' ||
            value === 'completed') {
          define(boardStatuses, key, value);
        }
      });
    }
    const combatBaselines = {};
    const rawBaselines = dataValue(source, 'combatBaselines');
    if (isRecord(rawBaselines)) {
      dataKeys(rawBaselines).sort().forEach(function (key) {
        define(
          combatBaselines,
          key,
          finiteInteger(dataValue(rawBaselines, key), 0, 0)
        );
      });
    }
    const boardResolved = {};
    const rawResolved = dataValue(source, 'boardResolved');
    if (isRecord(rawResolved)) {
      dataKeys(rawResolved).sort().forEach(function (key) {
        const row = dataValue(rawResolved, key);
        if (!isRecord(row) || typeof row.id !== 'string') return;
        define(boardResolved, key, jsonRecord(row));
      });
    }
    const activeResolvedRaw = dataValue(source, 'activeResolved');
    const activeResolved = isRecord(activeResolvedRaw) &&
      typeof dataValue(activeResolvedRaw, 'id') === 'string'
      ? jsonRecord(activeResolvedRaw)
      : null;
    return {
      missionId: cleanString(dataValue(source, 'missionId'), null),
      stepIndex: finiteInteger(dataValue(source, 'stepIndex'), 0, 0),
      status: status === 'active' ? 'active' : 'idle',
      combatKillBaseline: finiteInteger(
        dataValue(source, 'combatKillBaseline'),
        0,
        0
      ),
      combatBaselines: combatBaselines,
      completedMissionIds: completed,
      boardPeriod: finiteInteger(dataValue(source, 'boardPeriod'), -1, -1),
      boardOfferIds: boardOfferIds,
      boardStatuses: boardStatuses,
      boardResolved: boardResolved,
      activeResolved: activeResolved
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

  function normalizeWorldEvent(entry, index) {
    const source = isRecord(entry) ? entry : {};
    const participants = [];
    jsonArray(dataValue(source, 'participants')).forEach(function (id) {
      if (typeof id === 'string' && id.length && participants.length < 3) {
        participants.push(id);
      }
    });
    const tags = [];
    jsonArray(dataValue(source, 'tags')).forEach(function (tag) {
      if (typeof tag === 'string' && tag.length && tags.length < 12) {
        tags.push(tag);
      }
    });
    const category = cleanString(dataValue(source, 'category'), null);
    const rawEventId = dataValue(source, 'eventId');
    const parsedEventId = Number(rawEventId);
    const eventId = rawEventId == null || !Number.isFinite(parsedEventId)
      ? 0
      : Math.floor(parsedEventId);
    return {
      id: cleanString(dataValue(source, 'id'), 'we-' + (index + 1)),
      month: finiteInteger(dataValue(source, 'month'), 0, 0),
      visibleFromMonth: finiteInteger(
        dataValue(source, 'visibleFromMonth'),
        finiteInteger(dataValue(source, 'month'), 0, 0),
        0
      ),
      type: cleanString(dataValue(source, 'type'), 'meet'),
      participants: participants,
      location: cleanString(dataValue(source, 'location'), null),
      narrative: cleanString(dataValue(source, 'narrative'), ''),
      source: dataValue(source, 'source') === 'player' ? 'player' : 'world',
      category: category,
      tags: tags,
      eventId: eventId
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
    world.monthAccumulator = finiteNumber(
      dataValue(source, 'monthAccumulator'),
      0,
      0
    );
    const rawCalendar = isRecord(dataValue(source, 'calendar'))
      ? dataValue(source, 'calendar')
      : {};
    const appearances = {};
    const rawAppearances = dataValue(rawCalendar, 'npcYearAppearances');
    dataKeys(rawAppearances).forEach(function (npcId) {
      if (typeof npcId !== 'string') return;
      appearances[npcId] = finiteInteger(
        dataValue(rawAppearances, npcId),
        0,
        0,
        99
      );
    });
    const leapLast = {};
    const rawLeap = dataValue(rawCalendar, 'playerLeapLastMonth');
    dataKeys(rawLeap).forEach(function (npcId) {
      if (typeof npcId !== 'string') return;
      leapLast[npcId] = finiteInteger(
        dataValue(rawLeap, npcId),
        0,
        0,
        1e9
      );
    });
    world.calendar = {
      year: (function () {
        const rawYear = finiteInteger(dataValue(rawCalendar, 'year'), 1, 1);
        // 纠正早期占位默认年 342，统一从第 1 年计。
        return rawYear === 342 ? 1 : rawYear;
      })(),
      month: finiteInteger(dataValue(rawCalendar, 'month'), 1, 1, 12),
      monthAccumulator: finiteNumber(
        dataValue(rawCalendar, 'monthAccumulator'),
        finiteNumber(dataValue(source, 'monthAccumulator'), 0, 0),
        0
      ),
      yearEventBudget: finiteInteger(
        dataValue(rawCalendar, 'yearEventBudget'),
        36,
        10,
        40
      ),
      yearEventsCreated: finiteInteger(
        dataValue(rawCalendar, 'yearEventsCreated'),
        0,
        0
      ),
      monthEventsCreated: finiteInteger(
        dataValue(rawCalendar, 'monthEventsCreated'),
        0,
        0
      ),
      npcYearAppearances: appearances,
      playerLeapLastMonth: leapLast
    };
    const rawEvents = jsonArray(dataValue(source, 'worldEvents'));
    world.worldEvents = rawEvents.map(normalizeWorldEvent).slice(
      Math.max(0, rawEvents.length - WORLD_EVENT_RETENTION)
    );
    world.nextWorldEventId = finiteInteger(
      dataValue(source, 'nextWorldEventId'),
      world.worldEvents.length + 1,
      1
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
          interactionId: cleanString(job.interactionId, null),
          itemId: cleanString(job.itemId, null),
          paidItemId: cleanString(job.paidItemId, null),
          actionKey: cleanString(job.actionKey, null),
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
    let clean = Stage3State.normalize(source, {
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
    migrateSocialMainActionToQueue(clean);
    // clean is already a fresh normalized tree; rebalance in place.
    if (NpcRoster &&
        typeof NpcRoster.rebalanceInPlace === 'function') {
      NpcRoster.rebalanceInPlace(clean, {
        target: clean.systems.npcs.activeTarget
      });
    } else if (NpcRoster &&
        typeof NpcRoster.rebalance === 'function') {
      const rebalanced = NpcRoster.rebalance(clean, {
        target: clean.systems.npcs.activeTarget
      });
      if (rebalanced) clean = rebalanced;
    }
    // 已有人口但玩家圈子为空时不再全图补种；圈子只靠 creatperson* / 偶遇扩。
    clean = ensureSectOffices(clean);
    // reconcile 可能补写宗门领袖等人物；再过一遍 NPC normalize，保证字段幂等。
    clean.systems.npcs = normalizeNpcSystem(clean.systems.npcs);
    return clean;
  }

  function livingNpcNeedsOffice(person) {
    if (!person || person.status !== 'living' || person.lifeStage === 'child') {
      return false;
    }
    if (person.sectId) {
      return typeof person.officeSlotId !== 'string' ||
        !person.officeSlotId;
    }
    return typeof person.rogueTitleId !== 'string' || !person.rogueTitleId;
  }

  function sectHasVacantOffice(model) {
    if (!SectOfficeContent ||
        typeof SectOfficeContent.listSlots !== 'function') {
      return false;
    }
    const sects = model && model.systems && model.systems.sects &&
      model.systems.sects.records;
    if (!sects) return false;
    return Object.keys(sects).some(function (sectId) {
      const record = sects[sectId];
      const holders = record && record.officeHolders
        ? record.officeHolders
        : {};
      const slots = SectOfficeContent.listSlots(sectId) || [];
      return slots.some(function (slot) {
        if (slot.pool) return false;
        const capacity = Math.max(1, Math.floor(Number(slot.capacity) || 1));
        const filled = Array.isArray(holders[slot.id])
          ? holders[slot.id].length
          : 0;
        return filled < capacity;
      });
    });
  }

  function ensureSectOffices(model) {
    if (!SectOffices || typeof SectOffices.reconcile !== 'function') {
      return model;
    }
    const records = model && model.systems && model.systems.npcs &&
      model.systems.npcs.records;
    if (!records) return model;
    const needs = Object.keys(records).some(function (id) {
      return livingNpcNeedsOffice(records[id]);
    }) || sectHasVacantOffice(model);
    if (!needs) return model;
    const result = SectOffices.reconcile(model, { inPlace: true });
    return result && result.ok ? result.state : model;
  }

  // 旧版主动社交占主行动：迁移进并行队列，避免与主挂机抢槽。
  function migrateSocialMainActionToQueue(clean) {
    const current = isRecord(clean.current) ? clean.current : null;
    const key = current && typeof current.key === 'string'
      ? current.key
      : null;
    if (!key || key.indexOf('social:') !== 0) return;
    const actionKey = normalizeActionKey(key);
    if (!actionKey) {
      clean.current = null;
      return;
    }
    const parts = actionKey.split(':');
    const npcId = parts[1];
    const interactionId = parts[2];
    const itemId = interactionId === 'gift' ? parts[3] : null;
    const content = SocialInteractionContent &&
      typeof SocialInteractionContent.get === 'function'
      ? SocialInteractionContent.get(interactionId)
      : null;
    const total = content && Number.isFinite(content.durationSeconds)
      ? content.durationSeconds
      : 0;
    const elapsed = Math.max(0, finiteNumber(current.elapsed, 0, 0));
    const remaining = Math.max(0, total - elapsed);
    if (!clean.systems.parallel ||
        !Array.isArray(clean.systems.parallel.jobs)) {
      clean.systems.parallel = { jobs: [] };
    }
    const already = clean.systems.parallel.jobs.some(function (job) {
      return job && job.kind === 'social' && job.actionKey === actionKey;
    });
    if (!already && total > 0) {
      const person = clean.systems.npcs &&
        clean.systems.npcs.records &&
        clean.systems.npcs.records[npcId];
      const name = person && person.identity && person.identity.name
        ? person.identity.name
        : '对方';
      const label = content &&
        SocialInteractionContent &&
        typeof SocialInteractionContent.getNarrative === 'function'
        ? SocialInteractionContent.getNarrative(interactionId, 'progress', {
          name: name,
          pronoun: person && person.identity &&
            person.identity.gender === 'male' ? '他' : '她'
        })
        : (content && content.label
          ? content.label.replace('某人', name)
          : '社交');
      clean.systems.parallel.jobs.push({
        id: 'social-job-migrated-' + actionKey.replace(/:/g, '-'),
        kind: 'social',
        npcId: npcId,
        sourceEventId: null,
        label: label,
        remainingSeconds: remaining,
        totalSeconds: total,
        followupTemplateId: null,
        interactionId: interactionId,
        itemId: itemId,
        paidItemId: null,
        actionKey: actionKey,
        context: {},
        ready: remaining <= 0,
        completionReported: false
      });
    }
    clean.current = null;
  }

  function npcRecordCount(systems) {
    const npcs = isRecord(systems) ? dataValue(systems, 'npcs') : null;
    const records = isRecord(npcs) ? dataValue(npcs, 'records') : null;
    return isRecord(records) ? dataKeys(records).length : 0;
  }

  function resolveBootstrapWorld(options) {
    const certifiedOptions = stableOptionsRecord(options);
    const injectedBootstrap = dataValue(
      certifiedOptions,
      'bootstrapWorld'
    );
    const defaultBootstrap = dataValue(NpcGenerator, 'bootstrap');
    return typeof injectedBootstrap === 'function'
      ? injectedBootstrap
      : defaultBootstrap;
  }

  function applyBootstrapResult(candidate, result) {
    if (!isRecord(result)) return candidate;
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
    return candidate;
  }

  // 空人物池时按关系造人开局（对标 creatperson*），不再 bootstrap 全图陌生人。
  // 若 options.bootstrapWorld 显式注入（自测），仍走旧注入路径。
  function ensureWorldPopulation(model, options) {
    const candidate = jsonRecord(model);
    if (npcRecordCount(candidate.systems) > 0) {
      // 已有人口：仍补写缺失的开局结识见闻（旧档常只剩一条「踏入旅途」）。
      if (PersonFactory &&
          typeof PersonFactory.ensureOpeningMeetStories === 'function') {
        return PersonFactory.ensureOpeningMeetStories(candidate);
      }
      return candidate;
    }
    const certifiedOptions = stableOptionsRecord(options) || {};
    const bootstrapWorld = resolveBootstrapWorld(options);
    const injectedBootstrap = dataValue(certifiedOptions, 'bootstrapWorld');
    if (typeof injectedBootstrap === 'function') {
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
      return applyBootstrapResult(candidate, result);
    }
    if (PersonFactory && typeof PersonFactory.seedOpeningWorld === 'function') {
      // 敌对/失效 options（revoked proxy 等）已在 certifiedOptions 被丢弃。
      return PersonFactory.seedOpeningWorld(candidate, certifiedOptions);
    }
    if (typeof bootstrapWorld !== 'function') {
      return candidate;
    }
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
    return applyBootstrapResult(candidate, result);
  }

  // 新人生：整池清空后按开局流程重生人物与结构关系（不继承上一世 NPC）。
  function reseedWorldPopulation(model, options) {
    const candidate = jsonRecord(model);
    if (!isRecord(candidate.systems)) candidate.systems = {};
    const activeTarget = isRecord(candidate.systems.npcs) &&
      Number.isFinite(candidate.systems.npcs.activeTarget)
      ? Math.max(1, Math.floor(candidate.systems.npcs.activeTarget))
      : 40;
    candidate.systems.npcs = {
      nextId: 1,
      activeTarget: activeTarget,
      records: {},
      activeIds: [],
      backgroundIds: [],
      backgroundCursor: 0
    };
    candidate.systems.relationships = {
      edges: {},
      bonds: {},
      restrictions: {},
      npcAffinities: {},
      tags: {},
      arcs: {}
    };
    candidate.systems.events = {
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
    };
    if (isRecord(candidate.systems.teamCombat)) {
      candidate.systems.teamCombat.companionIds = [null, null, null];
      candidate.systems.teamCombat.reactionLog = [];
    }
    if (isRecord(candidate.systems.social)) {
      candidate.systems.social.benefits = [];
    }
    if (isRecord(candidate.systems.sects)) {
      candidate.systems.sects.records = defaultSectRecords();
      candidate.systems.sects.pairStates = {};
      candidate.systems.sects.player = {
        sectId: null,
        joinedAt: null,
        contribution: {},
        reputation: {},
        choiceEventOffered: false,
        choiceAvailableAt: 0,
        discipleRank: 'disciple',
        officeSlotId: 'disciple',
        job: 0,
        lifetimeContribution: 0,
        mission: {
          missionId: null,
          stepIndex: 0,
          status: 'idle',
          combatKillBaseline: 0,
          combatBaselines: {},
          completedMissionIds: [],
          boardPeriod: -1,
          boardOfferIds: [],
          boardStatuses: {},
          boardResolved: {},
          activeResolved: null
        }
      };
    }
    if (isRecord(candidate.systems.lineage)) {
      candidate.systems.lineage.descendants = {};
      candidate.systems.lineage.rituals = [];
    }
    if (isRecord(candidate.player)) {
      candidate.player.kin = {
        fa: null,
        mo: null,
        par: null,
        frs: [],
        ens: []
      };
      candidate.player.parentIds = [];
      candidate.player.metPlayer = false;
    }
    if (isRecord(candidate.systems.world)) {
      const world = candidate.systems.world;
      // 新世界时钟归零：否则上一世累计秒数/月累加器会在转世后继续补算，
      // 让新刷的 NPC 瞬间集体坐化，并灌进大事记。
      world.elapsedSeconds = 0;
      world.activeAccumulator = 0;
      world.backgroundAccumulator = 0;
      world.sectAccumulator = 0;
      world.eventAccumulator = 0;
      world.monthAccumulator = 0;
      world.worldEvents = [];
      world.nextWorldEventId = 1;
      if (isRecord(world.calendar)) {
        world.calendar.year = 1;
        world.calendar.month = 1;
        world.calendar.monthAccumulator = 0;
        world.calendar.yearEventsCreated = 0;
        world.calendar.monthEventsCreated = 0;
        world.calendar.npcYearAppearances = {};
        world.calendar.playerLeapLastMonth = {};
      }
    }
    return normalize(ensureWorldPopulation(candidate, options), options);
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

  // 保留合法社交主行动键，避免存档规范化时被当成 legacy 清掉并弹出空离线报告。
  const SOCIAL_KEY_PART = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  function normalizeActionKey(key) {
    if (typeof key !== 'string' || key.length === 0) return null;
    const parts = key.split(':');
    if (parts.length < 3 || parts.length > 4 || parts[0] !== 'social') {
      return null;
    }
    if (!SOCIAL_KEY_PART.test(parts[1]) || !SOCIAL_KEY_PART.test(parts[2])) {
      return null;
    }
    if (!SocialInteractionContent ||
        typeof SocialInteractionContent.get !== 'function' ||
        !SocialInteractionContent.get(parts[2])) {
      return null;
    }
    const gift = parts[2] === 'gift';
    if ((gift && parts.length !== 4) || (!gift && parts.length !== 3)) {
      return null;
    }
    if (gift && !SOCIAL_KEY_PART.test(parts[3])) return null;
    return key;
  }

  return Object.freeze({
    VERSION: VERSION,
    defaults: defaults,
    ensureWorldPopulation: ensureWorldPopulation,
    reseedWorldPopulation: reseedWorldPopulation,
    normalize: normalize,
    normalizeActionKey: normalizeActionKey,
    validate: validate,
    compactEventHistory: compactEventHistory,
    snapshotJsonData: snapshotJsonData
  });
});
