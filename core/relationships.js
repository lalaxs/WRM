(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(require('./stage4-state.js'))
    : factory(root && root.Stage4State);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Relationships = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Stage4State
) {
  'use strict';

  const METRICS = Object.freeze([
    'affection',
    'trust',
    'romanticAttachment',
    'closeness',
    'dependence',
    'loyalty',
    'jealousy',
    'desire'
  ]);
  const STAGES = Object.freeze([
    'stranger',
    'acquaintance',
    'friend',
    'lover',
    'partner',
    'distant',
    'separated',
    'enemy'
  ]);
  const RESTRICTIONS = Object.freeze([
    'blood',
    'directInLaw',
    'guardianship',
    'priorGenerationPartner'
  ]);
  const PERSON_ID_PATTERN =
    /^(?!__proto__$)(?!prototype$)(?!constructor$)[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
  const EVENT_ID_PATTERN =
    /^(?!__proto__$)(?!prototype$)(?!constructor$)[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function dependencyDataValue(value, key) {
    try {
      if (!value ||
          (typeof value !== 'object' && typeof value !== 'function')) {
        return undefined;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && own(descriptor, 'value')
        ? descriptor.value
        : undefined;
    } catch (error) {
      return undefined;
    }
  }

  const snapshotJsonData = dependencyDataValue(
    Stage4State,
    'snapshotJsonData'
  );

  function record(value) {
    return value &&
      typeof value === 'object' &&
      !Array.isArray(value)
      ? value
      : null;
  }

  function descriptorSafeJson(value) {
    const stack = [{ value: value, depth: 0 }];
    const seen = new Set();
    let nodes = 0;
    while (stack.length > 0) {
      const frame = stack.pop();
      const current = frame.value;
      nodes++;
      if (nodes > 250000 || frame.depth > 128) return false;
      if (current === null ||
          typeof current === 'string' ||
          typeof current === 'boolean') {
        continue;
      }
      if (typeof current === 'number') {
        if (!Number.isFinite(current)) return false;
        continue;
      }
      if (typeof current !== 'object' || seen.has(current)) {
        return false;
      }
      let keys;
      let firstKeys;
      let firstPrototype;
      let secondPrototype;
      let firstArray;
      let secondArray;
      try {
        firstPrototype = Object.getPrototypeOf(current);
        secondPrototype = Object.getPrototypeOf(current);
        firstArray = Array.isArray(current);
        secondArray = Array.isArray(current);
        keys = Reflect.ownKeys(current);
        firstKeys = Reflect.ownKeys(current);
      } catch (error) {
        return false;
      }
      if (firstPrototype !== secondPrototype ||
          firstArray !== secondArray ||
          (firstArray
            ? firstPrototype !== Array.prototype
            : firstPrototype !== null &&
              firstPrototype !== Object.prototype) ||
          keys.length !== firstKeys.length) {
        return false;
      }
      for (let index = 0; index < keys.length; index++) {
        if (keys[index] !== firstKeys[index]) return false;
      }
      seen.add(current);
      const array = firstArray;
      if (array) {
        let firstLength;
        let secondLength;
        try {
          firstLength = Object.getOwnPropertyDescriptor(
            current,
            'length'
          );
          secondLength = Object.getOwnPropertyDescriptor(
            current,
            'length'
          );
        } catch (error) {
          return false;
        }
        if (!firstLength ||
            !secondLength ||
            !own(firstLength, 'value') ||
            !own(secondLength, 'value') ||
            !Object.is(firstLength.value, secondLength.value) ||
            firstLength.writable !== secondLength.writable ||
            firstLength.enumerable !== secondLength.enumerable ||
            firstLength.configurable !== secondLength.configurable ||
            !Number.isSafeInteger(firstLength.value) ||
            firstLength.value < 0 ||
            firstLength.value > 100000) {
          return false;
        }
        if (keys.length !== firstLength.value + 1) return false;
        const keySet = new Set(keys);
        for (let index = 0; index < firstLength.value; index++) {
          if (!keySet.has(String(index))) return false;
        }
      } else if (keys.length > 10000) {
        return false;
      }
      for (let index = 0; index < keys.length; index++) {
        const key = keys[index];
        if (array && key === 'length') continue;
        if (typeof key !== 'string' ||
            key === '__proto__' ||
            key === 'prototype' ||
            key === 'constructor') {
          return false;
        }
        let first;
        let second;
        try {
          first = Object.getOwnPropertyDescriptor(current, key);
          second = Object.getOwnPropertyDescriptor(current, key);
        } catch (error) {
          return false;
        }
        if (!first ||
            !second ||
            !own(first, 'value') ||
            !own(second, 'value') ||
            first.enumerable !== true ||
            second.enumerable !== true ||
            first.configurable !== second.configurable ||
            first.writable !== second.writable ||
            !Object.is(first.value, second.value)) {
          return false;
        }
        stack.push({ value: first.value, depth: frame.depth + 1 });
      }
    }
    return true;
  }

  function dataValue(value, key) {
    if (!record(value)) return undefined;
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && own(descriptor, 'value')
        ? descriptor.value
        : undefined;
    } catch (error) {
      return undefined;
    }
  }

  function snapshot(value) {
    if (typeof snapshotJsonData !== 'function' ||
        !descriptorSafeJson(value)) {
      return null;
    }
    try {
      const clean = snapshotJsonData(value);
      return record(clean) ? clean : null;
    } catch (error) {
      return null;
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

  function validPersonId(value) {
    return typeof value === 'string' &&
      PERSON_ID_PATTERN.test(value) &&
      value.indexOf('>') < 0 &&
      value.indexOf('|') < 0;
  }

  function validEventId(value) {
    return typeof value === 'string' &&
      EVENT_ID_PATTERN.test(value);
  }

  function validTime(value) {
    return typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0;
  }

  function canonicalTime(value) {
    return Object.is(value, -0) ? 0 : value;
  }

  function pairKey(firstId, secondId) {
    return firstId < secondId
      ? firstId + '|' + secondId
      : secondId + '|' + firstId;
  }

  function edgeKey(sourceId, targetId) {
    return sourceId + '>' + targetId;
  }

  function parseDirectionalKey(value) {
    if (typeof value !== 'string') return null;
    const separator = value.indexOf('>');
    if (separator <= 0 ||
        separator !== value.lastIndexOf('>') ||
        separator >= value.length - 1) {
      return null;
    }
    const sourceId = value.slice(0, separator);
    const targetId = value.slice(separator + 1);
    return validPersonId(sourceId) &&
      validPersonId(targetId) &&
      sourceId !== targetId
      ? [sourceId, targetId]
      : null;
  }

  function parseUnorderedKey(value) {
    if (typeof value !== 'string') return null;
    const separator = value.indexOf('|');
    if (separator <= 0 ||
        separator !== value.lastIndexOf('|') ||
        separator >= value.length - 1) {
      return null;
    }
    const firstId = value.slice(0, separator);
    const secondId = value.slice(separator + 1);
    if (!validPersonId(firstId) ||
        !validPersonId(secondId) ||
        firstId === secondId ||
        value !== pairKey(firstId, secondId)) {
      return null;
    }
    return [firstId, secondId];
  }

  function keysExactly(value, expected) {
    if (!record(value)) return false;
    const keys = Object.keys(value);
    if (keys.length !== expected.length) return false;
    const seen = new Set(keys);
    if (seen.size !== keys.length) return false;
    for (let index = 0; index < expected.length; index++) {
      if (!seen.has(expected[index])) return false;
    }
    return true;
  }

  function zeroEdge() {
    return {
      affection: 0,
      trust: 0,
      romanticAttachment: 0,
      closeness: 0,
      dependence: 0,
      loyalty: 0,
      jealousy: 0,
      desire: 0,
      lastChangedAt: 0
    };
  }

  function defaultBond() {
    return {
      stage: 'stranger',
      changedByEventId: null,
      changedAt: 0
    };
  }

  function validEdge(value) {
    if (!keysExactly(
      value,
      METRICS.concat(['lastChangedAt'])
    )) {
      return false;
    }
    for (let index = 0; index < METRICS.length; index++) {
      const amount = dataValue(value, METRICS[index]);
      if (!Number.isSafeInteger(amount) ||
          amount < 0 ||
          amount > 100) {
        return false;
      }
    }
    return validTime(dataValue(value, 'lastChangedAt'));
  }

  function validBond(value) {
    if (!keysExactly(value, [
      'stage',
      'changedByEventId',
      'changedAt'
    ])) {
      return false;
    }
    const eventId = dataValue(value, 'changedByEventId');
    return STAGES.indexOf(dataValue(value, 'stage')) >= 0 &&
      (eventId === null || validEventId(eventId)) &&
      validTime(dataValue(value, 'changedAt'));
  }

  function buildPeople(model) {
    const player = record(dataValue(model, 'player'));
    const systems = record(dataValue(model, 'systems'));
    const npcs = systems && record(dataValue(systems, 'npcs'));
    const records = npcs && record(dataValue(npcs, 'records'));
    if (!player || !systems || !npcs || !records) return null;

    const people = new Map();
    people.set('player', { status: 'living' });
    const ids = Object.keys(records);
    for (let index = 0; index < ids.length; index++) {
      const id = ids[index];
      const value = record(dataValue(records, id));
      if (!validPersonId(id) ||
          id === 'player' ||
          !value ||
          dataValue(value, 'id') !== id) {
        return null;
      }
      const status = dataValue(value, 'status');
      if (typeof status !== 'string' || status.length === 0) return null;
      people.set(id, { status: status });
    }
    return {
      systems: systems,
      people: people
    };
  }

  function validateRelationships(systems, people) {
    const relationships = record(dataValue(systems, 'relationships'));
    const edges = relationships &&
      record(dataValue(relationships, 'edges'));
    const bonds = relationships &&
      record(dataValue(relationships, 'bonds'));
    const restrictions = relationships &&
      record(dataValue(relationships, 'restrictions'));
    if (!relationships || !edges || !bonds || !restrictions) return null;

    const edgeKeys = Object.keys(edges);
    for (let index = 0; index < edgeKeys.length; index++) {
      const parsed = parseDirectionalKey(edgeKeys[index]);
      if (!parsed ||
          !people.has(parsed[0]) ||
          !people.has(parsed[1]) ||
          !validEdge(dataValue(edges, edgeKeys[index]))) {
        return null;
      }
    }

    const bondKeys = Object.keys(bonds);
    for (let index = 0; index < bondKeys.length; index++) {
      const parsed = parseUnorderedKey(bondKeys[index]);
      if (!parsed ||
          !people.has(parsed[0]) ||
          !people.has(parsed[1]) ||
          !validBond(dataValue(bonds, bondKeys[index]))) {
        return null;
      }
    }

    const restrictionKeys = Object.keys(restrictions);
    for (let index = 0; index < restrictionKeys.length; index++) {
      const parsed = parseUnorderedKey(restrictionKeys[index]);
      const restriction = dataValue(
        restrictions,
        restrictionKeys[index]
      );
      if (!parsed ||
          !people.has(parsed[0]) ||
          !people.has(parsed[1]) ||
          RESTRICTIONS.indexOf(restriction) < 0) {
        return null;
      }
    }

    return {
      relationships: relationships,
      edges: edges,
      bonds: bonds,
      restrictions: restrictions
    };
  }

  function inspect(model) {
    const state = snapshot(model);
    if (!state) return null;
    const population = buildPeople(state);
    if (!population) return null;
    const relationships = validateRelationships(
      population.systems,
      population.people
    );
    if (!relationships) return null;
    return {
      state: state,
      systems: population.systems,
      people: population.people,
      relationships: relationships.relationships,
      edges: relationships.edges,
      bonds: relationships.bonds,
      restrictions: relationships.restrictions
    };
  }

  function knownPair(parts, firstId, secondId, livingOnly) {
    if (!validPersonId(firstId) ||
        !validPersonId(secondId) ||
        firstId === secondId ||
        !parts.people.has(firstId) ||
        !parts.people.has(secondId)) {
      return false;
    }
    if (!livingOnly) return true;
    return parts.people.get(firstId).status === 'living' &&
      parts.people.get(secondId).status === 'living';
  }

  function personPairFailure(parts, firstId, secondId) {
    if (firstId === secondId) return 'same_person';
    if (!validPersonId(firstId) ||
        !validPersonId(secondId) ||
        !parts.people.has(firstId) ||
        !parts.people.has(secondId)) {
      return 'unknown_person';
    }
    return 'nonliving_person';
  }

  function deepFreeze(value) {
    const stack = [value];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current ||
          typeof current !== 'object' ||
          Object.isFrozen(current)) {
        continue;
      }
      Object.keys(current).forEach(function (key) {
        const child = current[key];
        if (child && typeof child === 'object') stack.push(child);
      });
      Object.freeze(current);
    }
    return value;
  }

  function edgeView(parts, sourceId, targetId) {
    const key = edgeKey(sourceId, targetId);
    const source = own(parts.edges, key)
      ? dataValue(parts.edges, key)
      : zeroEdge();
    const view = {};
    for (let index = 0; index < METRICS.length; index++) {
      define(view, METRICS[index], dataValue(source, METRICS[index]));
    }
    view.lastChangedAt = dataValue(source, 'lastChangedAt');
    return deepFreeze(view);
  }

  function bondView(parts, firstId, secondId) {
    const key = pairKey(firstId, secondId);
    const source = own(parts.bonds, key)
      ? dataValue(parts.bonds, key)
      : defaultBond();
    return deepFreeze({
      stage: dataValue(source, 'stage'),
      changedByEventId: dataValue(source, 'changedByEventId'),
      changedAt: dataValue(source, 'changedAt')
    });
  }

  function getEdge(model, sourceId, targetId) {
    const parts = inspect(model);
    return parts && knownPair(parts, sourceId, targetId, false)
      ? edgeView(parts, sourceId, targetId)
      : null;
  }

  function success(state, code, value) {
    return {
      ok: true,
      code: code || 'ok',
      state: state,
      value: value == null ? null : value
    };
  }

  function failure(code, model) {
    return {
      ok: false,
      code: code,
      state: model,
      value: null
    };
  }

  function deltaValues(values) {
    const clean = snapshot(values);
    if (!clean) return null;
    const keys = Object.keys(clean);
    if (keys.length === 0 || keys.length > METRICS.length) return null;
    const result = {};
    for (let index = 0; index < keys.length; index++) {
      const metric = keys[index];
      const amount = dataValue(clean, metric);
      if (METRICS.indexOf(metric) < 0 ||
          !Number.isSafeInteger(amount)) {
        return null;
      }
      define(result, metric, amount);
    }
    return result;
  }

  function allMetricsZero(value) {
    for (let index = 0; index < METRICS.length; index++) {
      if (dataValue(value, METRICS[index]) !== 0) return false;
    }
    return true;
  }

  function applyDelta(
    model,
    sourceId,
    targetId,
    values,
    atSeconds
  ) {
    // 8 维关系边仅服务玩家↔NPC；NPC↔NPC 应走 npcAffinities。
    if (sourceId !== 'player' && targetId !== 'player') {
      return failure('npc_pair_uses_affinity', model);
    }
    const delta = deltaValues(values);
    if (!delta) return failure('invalid_delta', model);
    if (!validTime(atSeconds)) return failure('invalid_time', model);
    const parts = inspect(model);
    if (!parts) return failure('invalid_state', model);
    if (!knownPair(parts, sourceId, targetId, true)) {
      return failure(personPairFailure(
        parts,
        sourceId,
        targetId
      ), model);
    }

    const key = edgeKey(sourceId, targetId);
    const current = own(parts.edges, key)
      ? dataValue(parts.edges, key)
      : zeroEdge();
    const next = {};
    let changed = false;
    for (let index = 0; index < METRICS.length; index++) {
      const metric = METRICS[index];
      const previous = dataValue(current, metric);
      const amount = own(delta, metric) ? delta[metric] : 0;
      const value = Math.min(100, Math.max(0, previous + amount));
      define(next, metric, value);
      if (value !== previous) changed = true;
    }
    next.lastChangedAt = changed
      ? canonicalTime(atSeconds)
      : dataValue(current, 'lastChangedAt');

    if (!changed) {
      return success(
        parts.state,
        'unchanged',
        edgeView(parts, sourceId, targetId)
      );
    }
    if (allMetricsZero(next)) {
      delete parts.edges[key];
    } else {
      define(parts.edges, key, next);
    }
    return success(
      parts.state,
      'ok',
      allMetricsZero(next)
        ? deepFreeze(zeroEdge())
        : edgeView(parts, sourceId, targetId)
    );
  }

  function getBond(model, firstId, secondId) {
    const parts = inspect(model);
    return parts && knownPair(parts, firstId, secondId, false)
      ? bondView(parts, firstId, secondId)
      : null;
  }

  function bondEventEvidence(
    parts,
    eventId,
    firstId,
    secondId,
    atSeconds
  ) {
    const events = record(dataValue(parts.systems, 'events'));
    const pending = events && dataValue(events, 'pending');
    const recent = events && dataValue(events, 'resolvedRecent');
    if (!Array.isArray(pending) || !Array.isArray(recent)) {
      return 'unresolved_event';
    }
    for (let index = 0; index < pending.length; index++) {
      const event = record(pending[index]);
      if (event && dataValue(event, 'id') === eventId) {
        return 'unresolved_event';
      }
    }
    let matching = null;
    let matchingCount = 0;
    for (let index = 0; index < recent.length; index++) {
      const event = record(recent[index]);
      if (!event || dataValue(event, 'id') !== eventId) continue;
      matching = event;
      matchingCount++;
    }
    if (matchingCount !== 1) return 'unresolved_event';
    const resolvedAt = dataValue(matching, 'resolvedAt');
    if (!validTime(resolvedAt) || resolvedAt !== atSeconds) {
      return 'unresolved_event';
    }
    const participants = dataValue(matching, 'participants');
    if (!Array.isArray(participants)) return 'unresolved_event';
    const coversPair = firstId === 'player' || secondId === 'player'
      ? participants.indexOf(
        firstId === 'player' ? secondId : firstId
      ) >= 0
      : participants.indexOf(firstId) >= 0 &&
        participants.indexOf(secondId) >= 0;
    if (!coversPair) return 'unresolved_event';

    const bondKeys = Object.keys(parts.bonds);
    for (let index = 0; index < bondKeys.length; index++) {
      const bond = dataValue(parts.bonds, bondKeys[index]);
      if (dataValue(bond, 'changedByEventId') === eventId) {
        return 'event_reused';
      }
    }
    return null;
  }

  function setBondStage(
    model,
    firstId,
    secondId,
    stage,
    eventId,
    atSeconds
  ) {
    if (STAGES.indexOf(stage) < 0) {
      return failure('invalid_stage', model);
    }
    if (!validEventId(eventId)) {
      return failure('invalid_event', model);
    }
    if (!validTime(atSeconds)) return failure('invalid_time', model);
    const parts = inspect(model);
    if (!parts) return failure('invalid_state', model);
    if (!knownPair(parts, firstId, secondId, true)) {
      return failure(personPairFailure(
        parts,
        firstId,
        secondId
      ), model);
    }
    const evidenceFailure = bondEventEvidence(
      parts,
      eventId,
      firstId,
      secondId,
      atSeconds
    );
    if (evidenceFailure) return failure(evidenceFailure, model);

    const key = pairKey(firstId, secondId);
    const bond = {
      stage: stage,
      changedByEventId: eventId,
      changedAt: canonicalTime(atSeconds)
    };
    if (own(parts.bonds, key)) parts.bonds[key] = bond;
    else define(parts.bonds, key, bond);
    return success(parts.state, 'ok', deepFreeze({
      stage: bond.stage,
      changedByEventId: bond.changedByEventId,
      changedAt: bond.changedAt
    }));
  }

  function canRomanceParts(parts, firstId, secondId) {
    return knownPair(parts, firstId, secondId, true) &&
      !own(parts.restrictions, pairKey(firstId, secondId));
  }

  function canRomance(model, firstId, secondId) {
    const parts = inspect(model);
    return parts
      ? canRomanceParts(parts, firstId, secondId)
      : false;
  }

  function queryPair(model, firstId, secondId) {
    const parts = inspect(model);
    if (!parts || !knownPair(parts, firstId, secondId, false)) {
      return null;
    }
    return pairView(parts, firstId, secondId);
  }

  function pairView(parts, firstId, secondId) {
    return deepFreeze({
      firstId: firstId,
      secondId: secondId,
      firstToSecond: edgeView(parts, firstId, secondId),
      secondToFirst: edgeView(parts, secondId, firstId),
      bond: bondView(parts, firstId, secondId),
      romanceEligible: canRomanceParts(parts, firstId, secondId)
    });
  }

  function queryPairs(model, firstId, secondIds) {
    if (!Array.isArray(secondIds)) return deepFreeze({});
    const parts = inspect(model);
    if (!parts || !validPersonId(firstId)) return deepFreeze({});
    const rows = {};
    secondIds.forEach(function (secondId) {
      if (knownPair(parts, firstId, secondId, false)) {
        define(rows, secondId, pairView(parts, firstId, secondId));
      }
    });
    return deepFreeze(rows);
  }

  return Object.freeze({
    getEdge: getEdge,
    applyDelta: applyDelta,
    getBond: getBond,
    setBondStage: setBondStage,
    canRomance: canRomance,
    queryPair: queryPair,
    queryPairs: queryPairs
  });
});
