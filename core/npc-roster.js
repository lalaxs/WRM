(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.NpcRoster = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MIN_ACTIVE = 30;
  const MAX_ACTIVE = 50;
  const DEFAULT_ACTIVE = 40;
  const MAX_DEPTH = 128;
  const MAX_NODES = 250000;
  const MAX_ARRAY_LENGTH = 100000;
  const INVALID = Object.freeze({});
  const NOT_ARRAY = Object.freeze({});
  const WEIGHTS = Object.freeze({
    pendingEvent: 16,
    socialJob: 8,
    playerConnection: 4,
    sameSect: 2,
    sameRegion: 1
  });

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
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
    if (!leftData) return left.get === right.get && left.set === right.set;
    return left.writable === right.writable &&
      Object.is(left.value, right.value);
  }

  function stableDescriptor(value, key) {
    try {
      const first = Object.getOwnPropertyDescriptor(value, key);
      const second = Object.getOwnPropertyDescriptor(value, key);
      return sameDescriptor(first, second) ? first : INVALID;
    } catch (error) {
      return INVALID;
    }
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
      const first = stableDescriptor(value, 'constructor');
      return first !== INVALID &&
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

  function preflightArray(value) {
    let array;
    try {
      array = Array.isArray(value);
    } catch (error) {
      return INVALID;
    }
    if (!array) return NOT_ARRAY;

    let firstPrototype;
    let secondPrototype;
    try {
      firstPrototype = Object.getPrototypeOf(value);
      secondPrototype = Object.getPrototypeOf(value);
    } catch (error) {
      return INVALID;
    }
    if (firstPrototype !== secondPrototype ||
        !plainArrayPrototype(firstPrototype)) {
      return INVALID;
    }
    const lengthDescriptor = stableDescriptor(value, 'length');
    if (lengthDescriptor === INVALID ||
        !lengthDescriptor ||
        !own(lengthDescriptor, 'value') ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0 ||
        lengthDescriptor.value > MAX_ARRAY_LENGTH) {
      return INVALID;
    }
    return {
      length: lengthDescriptor.value
    };
  }

  function inspectContainer(value) {
    if (!value || typeof value !== 'object') return INVALID;
    let firstPrototype;
    let secondPrototype;
    let firstKeys;
    let secondKeys;
    let isArray;
    try {
      firstPrototype = Object.getPrototypeOf(value);
      secondPrototype = Object.getPrototypeOf(value);
      firstKeys = Reflect.ownKeys(value);
      secondKeys = Reflect.ownKeys(value);
      isArray = Array.isArray(value);
    } catch (error) {
      return INVALID;
    }
    if (firstPrototype !== secondPrototype ||
        !sameKeys(firstKeys, secondKeys) ||
        (isArray
          ? !plainArrayPrototype(firstPrototype)
          : !plainObjectPrototype(firstPrototype))) {
      return INVALID;
    }
    return {
      array: isArray,
      keys: firstKeys
    };
  }

  function define(target, key, value) {
    Object.defineProperty(target, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }

  function cloneJsonValue(value, state, depth) {
    state.nodes++;
    if (state.nodes > MAX_NODES) return INVALID;
    if (value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : INVALID;
    }
    if (typeof value !== 'object' ||
        depth > MAX_DEPTH ||
        state.active.has(value)) {
      return INVALID;
    }

    const arrayPreflight = preflightArray(value);
    if (arrayPreflight === INVALID) return INVALID;
    const shape = inspectContainer(value);
    if (shape === INVALID ||
        (shape.array && arrayPreflight === NOT_ARRAY) ||
        (!shape.array && arrayPreflight !== NOT_ARRAY)) {
      return INVALID;
    }
    let output;
    state.active.add(value);

    if (shape.array) {
      const lengthDescriptor = stableDescriptor(value, 'length');
      if (lengthDescriptor === INVALID ||
          !lengthDescriptor ||
          !own(lengthDescriptor, 'value') ||
          !Number.isSafeInteger(lengthDescriptor.value) ||
          lengthDescriptor.value < 0 ||
          lengthDescriptor.value > MAX_ARRAY_LENGTH ||
          lengthDescriptor.value !== arrayPreflight.length) {
        state.active.delete(value);
        return INVALID;
      }
      const length = arrayPreflight.length;
      output = new Array(length);
      for (let keyIndex = 0; keyIndex < shape.keys.length; keyIndex++) {
        const key = shape.keys[keyIndex];
        if (key === 'length') continue;
        if (typeof key !== 'string' ||
            !/^(0|[1-9][0-9]*)$/.test(key) ||
            Number(key) >= length) {
          state.active.delete(value);
          return INVALID;
        }
        const descriptor = stableDescriptor(value, key);
        if (descriptor === INVALID ||
            !descriptor ||
            !descriptor.enumerable ||
            !own(descriptor, 'value')) {
          state.active.delete(value);
          return INVALID;
        }
        const child = cloneJsonValue(
          descriptor.value,
          state,
          depth + 1
        );
        if (child === INVALID) {
          state.active.delete(value);
          return INVALID;
        }
        output[Number(key)] = child;
      }
      for (let index = 0; index < length; index++) {
        if (!own(output, index)) {
          state.active.delete(value);
          return INVALID;
        }
      }
    } else {
      output = {};
      for (let keyIndex = 0; keyIndex < shape.keys.length; keyIndex++) {
        const key = shape.keys[keyIndex];
        if (typeof key !== 'string') {
          state.active.delete(value);
          return INVALID;
        }
        const descriptor = stableDescriptor(value, key);
        if (descriptor === INVALID ||
            !descriptor ||
            !own(descriptor, 'value')) {
          state.active.delete(value);
          return INVALID;
        }
        if (!descriptor.enumerable) continue;
        const child = cloneJsonValue(
          descriptor.value,
          state,
          depth + 1
        );
        if (child === INVALID) {
          state.active.delete(value);
          return INVALID;
        }
        define(output, key, child);
      }
    }

    state.active.delete(value);
    return output;
  }

  function snapshot(value) {
    try {
      const result = cloneJsonValue(value, {
        nodes: 0,
        active: new Set()
      }, 0);
      return result === INVALID ? null : result;
    } catch (error) {
      return null;
    }
  }

  function record(value) {
    return value &&
      typeof value === 'object' &&
      !Array.isArray(value)
      ? value
      : null;
  }

  function asciiCompare(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
  }

  function numericNpcPart(id) {
    if (typeof id !== 'string') return null;
    const match = /^npc-([0-9]+)$/.exec(id);
    if (!match) return null;
    const digits = match[1].replace(/^0+(?=[0-9])/, '');
    return {
      digits: digits,
      raw: id
    };
  }

  function compareNpcIds(left, right) {
    const leftPart = numericNpcPart(left);
    const rightPart = numericNpcPart(right);
    if (leftPart && rightPart) {
      if (leftPart.digits.length !== rightPart.digits.length) {
        return leftPart.digits.length - rightPart.digits.length;
      }
      const digitOrder = asciiCompare(
        leftPart.digits,
        rightPart.digits
      );
      return digitOrder || asciiCompare(leftPart.raw, rightPart.raw);
    }
    if (leftPart) return -1;
    if (rightPart) return 1;
    return asciiCompare(left, right);
  }

  function playerPairMember(key, separator) {
    if (typeof key !== 'string') return null;
    const parts = key.split(separator);
    if (parts.length !== 2 || parts[0] === parts[1]) return null;
    if (parts[0] === 'player') return parts[1];
    if (parts[1] === 'player') return parts[0];
    return null;
  }

  function addLiving(target, candidate, living) {
    if (typeof candidate === 'string' && living.has(candidate)) {
      target.add(candidate);
    }
  }

  function buildIndex(model) {
    const systems = record(model.systems);
    const npcs = systems && record(systems.npcs);
    const records = npcs && record(npcs.records);
    if (!systems || !npcs || !records) return null;

    const living = new Set();
    Object.keys(records).forEach(function (id) {
      const person = record(records[id]);
      if (person &&
          person.status === 'living' &&
          person.lifeStage !== 'child') {
        living.add(id);
      }
    });

    const pending = new Set();
    const events = record(systems.events);
    const pendingEvents = events && Array.isArray(events.pending)
      ? events.pending
      : [];
    pendingEvents.forEach(function (event) {
      const participants = record(event) &&
        Array.isArray(event.participants)
        ? event.participants
        : [];
      participants.forEach(function (id) {
        addLiving(pending, id, living);
      });
    });

    const social = new Set();
    const parallel = record(systems.parallel);
    const jobs = parallel && Array.isArray(parallel.jobs)
      ? parallel.jobs
      : [];
    jobs.forEach(function (job) {
      if (!record(job) ||
          job.kind !== 'social' ||
          !(job.ready === true ||
            (Number.isFinite(job.remainingSeconds) &&
             job.remainingSeconds > 0))) {
        return;
      }
      addLiving(social, job.npcId, living);
    });

    const connected = new Set();
    const relationships = record(systems.relationships);
    const bonds = relationships && record(relationships.bonds)
      ? relationships.bonds
      : {};
    Object.keys(bonds).forEach(function (key) {
      addLiving(connected, playerPairMember(key, '|'), living);
    });
    const edges = relationships && record(relationships.edges)
      ? relationships.edges
      : {};
    Object.keys(edges).forEach(function (key) {
      addLiving(connected, playerPairMember(key, '>'), living);
    });

    const player = record(model.player) || {};
    const sects = record(systems.sects);
    const sectPlayer = sects && record(sects.player)
      ? sects.player
      : {};
    return {
      npcs: npcs,
      records: records,
      living: living,
      pending: pending,
      social: social,
      connected: connected,
      playerSectId: typeof sectPlayer.sectId === 'string'
        ? sectPlayer.sectId
        : null,
      playerRegionId: typeof player.regionId === 'string'
        ? player.regionId
        : null
    };
  }

  function score(index, npcId) {
    if (!index.living.has(npcId)) return 0;
    const person = index.records[npcId];
    let result = 0;
    if (index.pending.has(npcId)) result += WEIGHTS.pendingEvent;
    if (index.social.has(npcId)) result += WEIGHTS.socialJob;
    if (index.connected.has(npcId)) result += WEIGHTS.playerConnection;
    if (index.playerSectId &&
        person.sectId === index.playerSectId) {
      result += WEIGHTS.sameSect;
    }
    if (index.playerRegionId &&
        person.regionId === index.playerRegionId) {
      result += WEIGHTS.sameRegion;
    }
    return result;
  }

  function certifiedTarget(options, fallback) {
    if (options == null) {
      return Number.isFinite(fallback)
        ? Math.min(MAX_ACTIVE, Math.max(MIN_ACTIVE, Math.floor(fallback)))
        : DEFAULT_ACTIVE;
    }
    const clean = snapshot(options);
    if (!record(clean)) return null;
    const value = own(clean, 'target') ? clean.target : fallback;
    if (!Number.isFinite(value)) return null;
    return Math.min(MAX_ACTIVE, Math.max(MIN_ACTIVE, Math.floor(value)));
  }

  function relevance(model, npcId) {
    try {
      if (typeof npcId !== 'string') return 0;
      const clean = snapshot(model);
      if (!record(clean)) return 0;
      const index = buildIndex(clean);
      return index ? score(index, npcId) : 0;
    } catch (error) {
      return 0;
    }
  }

  function rebalance(model, options) {
    try {
      const clean = snapshot(model);
      if (!record(clean)) return null;
      const index = buildIndex(clean);
      if (!index) return null;
      const target = certifiedTarget(options, index.npcs.activeTarget);
      if (target === null) return null;

      const ranked = Array.from(index.living);
      ranked.sort(function (left, right) {
        const scoreOrder = score(index, right) - score(index, left);
        return scoreOrder || compareNpcIds(left, right);
      });

      const activeCount = Math.min(target, ranked.length);
      const activeIds = ranked.slice(0, activeCount);
      const backgroundIds = ranked.slice(activeCount);
      let previousBackgroundId = null;
      if (Array.isArray(index.npcs.backgroundIds) &&
          Number.isSafeInteger(index.npcs.backgroundCursor) &&
          index.npcs.backgroundCursor >= 0 &&
          index.npcs.backgroundCursor < index.npcs.backgroundIds.length) {
        previousBackgroundId =
          index.npcs.backgroundIds[index.npcs.backgroundCursor];
      }
      index.npcs.activeTarget = target;
      index.npcs.activeIds = activeIds;
      index.npcs.backgroundIds = backgroundIds;
      const preservedCursor = previousBackgroundId == null
        ? -1
        : backgroundIds.indexOf(previousBackgroundId);
      index.npcs.backgroundCursor = backgroundIds.length === 0
        ? 0
        : Math.max(0, preservedCursor);
      return clean;
    } catch (error) {
      return null;
    }
  }

  function assertPartition(model) {
    try {
      const clean = snapshot(model);
      if (!record(clean)) return false;
      const index = buildIndex(clean);
      if (!index ||
          !Number.isInteger(index.npcs.activeTarget) ||
          index.npcs.activeTarget < MIN_ACTIVE ||
          index.npcs.activeTarget > MAX_ACTIVE ||
          !Array.isArray(index.npcs.activeIds) ||
          !Array.isArray(index.npcs.backgroundIds)) {
        return false;
      }
      const expectedActive = Math.min(
        index.npcs.activeTarget,
        index.living.size
      );
      if (index.npcs.activeIds.length !== expectedActive) return false;
      const seen = new Set();
      const tiers = index.npcs.activeIds.concat(
        index.npcs.backgroundIds
      );
      for (let idIndex = 0; idIndex < tiers.length; idIndex++) {
        const id = tiers[idIndex];
        if (typeof id !== 'string' ||
            seen.has(id) ||
            !index.living.has(id)) {
          return false;
        }
        seen.add(id);
      }
      if (seen.size !== index.living.size) return false;
      const cursor = index.npcs.backgroundCursor;
      if (index.npcs.backgroundIds.length === 0) return cursor === 0;
      return Number.isInteger(cursor) &&
        cursor >= 0 &&
        cursor < index.npcs.backgroundIds.length;
    } catch (error) {
      return false;
    }
  }

  return Object.freeze({
    relevance: relevance,
    rebalance: rebalance,
    assertPartition: assertPartition
  });
});
