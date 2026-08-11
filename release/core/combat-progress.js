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
      require('../content/combat.js'),
      require('../content/realms.js'),
      require('../content/techniques.js'),
      require('./combat-engine.js'),
      require('./team-combat-snapshot.js'),
      require('./combat-rewards.js'),
      require('./techniques.js'),
      require('./stage3-state.js'),
      require('./inventory.js'),
      proxyDetector,
      null
    );
  } else if (root) {
    root.CombatProgress = factory(
      root.CombatContent,
      root.RealmContent,
      root.TechniqueContent,
      root.CombatEngine,
      root.TeamCombatSnapshot,
      root.CombatRewards,
      root.Techniques,
      root.Stage3State,
      root.Inventory,
      null,
      root.structuredClone
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  CombatContent,
  RealmContent,
  TechniqueContent,
  CombatEngine,
  TeamCombatSnapshot,
  CombatRewards,
  Techniques,
  Stage3State,
  Inventory,
  proxyDetector,
  stateCloneProbe
) {
  'use strict';

  const UINT32_MAX = 0xFFFFFFFF;
  const REGION_INTERMISSION_TICKS = 1;
  const DUNGEON_INTERMISSION_TICKS = 1;
  const DUNGEON_REPEAT_TICKS = 4;
  const SEVERE_INJURY_SECONDS = 5; // 重伤恢复时长（秒）：默认 5 秒恢复
  const INJURY_TREATMENT_SECONDS = 600; // 用疗伤丹治疗：扣除的秒数（基础恢复仅 5 秒，治疗会直接清掉剩余时间）
  const INJURY_EPSILON_SECONDS = 1e-9;
  const EMPTY_SECT = Object.freeze({
    sectId: null,
    favoredTechniqueIds: Object.freeze([]),
    favoredTags: Object.freeze([])
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

  function isDetectedProxy(value) {
    if (typeof proxyDetector !== 'function') return false;
    try {
      return proxyDetector(value) === true;
    } catch (error) {
      return true;
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

  function cloneStrict(value, seen) {
    if (value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean') {
      return { ok: true, value: value };
    }
    if (typeof value === 'number') {
      return Number.isFinite(value)
        ? { ok: true, value: Object.is(value, -0) ? 0 : value }
        : { ok: false, value: null };
    }
    if (!value || typeof value !== 'object' || isDetectedProxy(value)) {
      return { ok: false, value: null };
    }
    if (seen.has(value)) return { ok: false, value: null };
    seen.add(value);
    let keys;
    try {
      keys = Reflect.ownKeys(value);
    } catch (error) {
      seen.delete(value);
      return { ok: false, value: null };
    }
    const array = plainArray(value);
    if (!array && !plainRecord(value)) {
      seen.delete(value);
      return { ok: false, value: null };
    }
    const result = array ? [] : {};
    const expectedLength = array ? value.length : null;
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (array && key === 'length') continue;
      if (typeof key !== 'string') {
        seen.delete(value);
        return { ok: false, value: null };
      }
      if (array && key !== String(index)) {
        seen.delete(value);
        return { ok: false, value: null };
      }
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(value, key);
      } catch (error) {
        seen.delete(value);
        return { ok: false, value: null };
      }
      if (!descriptor || descriptor.enumerable !== true ||
          !own(descriptor, 'value')) {
        seen.delete(value);
        return { ok: false, value: null };
      }
      const copied = cloneStrict(descriptor.value, seen);
      if (!copied.ok) {
        seen.delete(value);
        return copied;
      }
      if (array) result.push(copied.value);
      else define(result, key, copied.value);
    }
    seen.delete(value);
    if (array && (
      keys.length !== expectedLength + 1 ||
      keys[keys.length - 1] !== 'length' ||
      result.length !== expectedLength
    )) {
      return { ok: false, value: null };
    }
    return { ok: true, value: result };
  }

  function safeClone(value) {
    const copied = cloneStrict(value, new Set());
    if (!copied.ok) return copied;
    if (typeof proxyDetector !== 'function' &&
        typeof stateCloneProbe === 'function') {
      try {
        stateCloneProbe(value);
      } catch (error) {
        return { ok: false, value: null };
      }
    }
    return copied;
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

  function frozenSnapshot(dependency, key, fallback) {
    const copied = safeClone(dependencyValue(dependency, key));
    return deepFreeze(copied.ok ? copied.value : fallback);
  }

  const regions = frozenSnapshot(CombatContent, 'REGIONS', {});
  const enemies = frozenSnapshot(CombatContent, 'ENEMIES', {});
  const dungeons = frozenSnapshot(CombatContent, 'DUNGEONS', {});
  const lootTables = frozenSnapshot(CombatContent, 'LOOT_TABLES', {});
  const realms = frozenSnapshot(RealmContent, 'REALMS', {});
  const transitions = frozenSnapshot(RealmContent, 'TRANSITIONS', []);
  const techniqueContent = frozenSnapshot(
    TechniqueContent,
    'TECHNIQUES',
    {}
  );

  const engineCreateSession = dependencyValue(CombatEngine, 'createSession');
  const teamCreateSession = dependencyValue(
    TeamCombatSnapshot,
    'createSession'
  );
  const engineCreateEnemy = dependencyValue(CombatEngine, 'createEnemy');
  const rollEnemyLoot = dependencyValue(
    CombatRewards,
    'rollEnemyLoot'
  );
  const rollFirstClearRewards = dependencyValue(
    CombatRewards,
    'rollFirstClearRewards'
  );
  const applyOrPend = dependencyValue(CombatRewards, 'applyOrPend');
  const grantTechniqueXp = dependencyValue(Techniques, 'grantXp');
  const normalizeSession = dependencyValue(
    Stage3State,
    'normalizeSession'
  );
  const inventoryApply = dependencyValue(Inventory, 'apply');

  function finiteTimestamp(value) {
    return typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0;
  }

  function nonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function positiveInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
  }

  function validRng(value) {
    return Number.isSafeInteger(value) &&
      value > 0 &&
      value <= UINT32_MAX;
  }

  function normalizedDecimalParts(units, exponent) {
    if (units === 0n) return { units: 0n, exponent: 0 };
    while (units % 10n === 0n) {
      units /= 10n;
      exponent++;
    }
    return { units: units, exponent: exponent };
  }

  function decimalPartsFromNumber(value) {
    const pieces = value.toString().toLowerCase().split('e');
    const coefficient = pieces[0];
    const scientificExponent = pieces.length > 1
      ? Number(pieces[1])
      : 0;
    const decimalAt = coefficient.indexOf('.');
    const fractionalDigits = decimalAt < 0
      ? 0
      : coefficient.length - decimalAt - 1;
    return normalizedDecimalParts(
      BigInt(coefficient.replace('.', '')),
      scientificExponent - fractionalDigits
    );
  }

  function decimalStringFromParts(parts) {
    if (parts.units === 0n) return '0';
    const digits = parts.units.toString();
    if (parts.exponent >= 0) {
      return digits + '0'.repeat(parts.exponent);
    }
    const decimalAt = digits.length + parts.exponent;
    if (decimalAt > 0) {
      return digits.slice(0, decimalAt) + '.' + digits.slice(decimalAt);
    }
    return '0.' + '0'.repeat(-decimalAt) + digits;
  }

  function decimalStringFromNumber(value) {
    return decimalStringFromParts(decimalPartsFromNumber(value));
  }

  function decimalPartsFromCanonical(value) {
    if (typeof value !== 'string' ||
        value.length === 0 ||
        value.length > 400 ||
        !/^(?:0|[1-9][0-9]*)(?:\.[0-9]*[1-9])?$/.test(value)) {
      return null;
    }
    const decimalAt = value.indexOf('.');
    const fractionalDigits = decimalAt < 0
      ? 0
      : value.length - decimalAt - 1;
    let parts;
    try {
      parts = normalizedDecimalParts(
        BigInt(value.replace('.', '')),
        -fractionalDigits
      );
    } catch (error) {
      return null;
    }
    return decimalStringFromParts(parts) === value ? parts : null;
  }

  function compareDecimalParts(leftParts, rightParts) {
    const exponent = Math.min(leftParts.exponent, rightParts.exponent);
    const leftUnits = leftParts.units *
      (10n ** BigInt(leftParts.exponent - exponent));
    const rightUnits = rightParts.units *
      (10n ** BigInt(rightParts.exponent - exponent));
    return leftUnits < rightUnits ? -1 : leftUnits > rightUnits ? 1 : 0;
  }

  function subtractInjurySeconds(remainingSecondsExact, elapsedSeconds) {
    const leftParts = decimalPartsFromCanonical(remainingSecondsExact);
    const rightParts = decimalPartsFromNumber(elapsedSeconds);
    const exponent = Math.min(leftParts.exponent, rightParts.exponent);
    const nextUnits = leftParts.units *
      (10n ** BigInt(leftParts.exponent - exponent)) -
      rightParts.units *
      (10n ** BigInt(rightParts.exponent - exponent));
    const nextParts = nextUnits <= 0n
      ? { units: 0n, exponent: 0 }
      : normalizedDecimalParts(nextUnits, exponent);
    const epsilonParts = decimalPartsFromCanonical(
      decimalStringFromNumber(INJURY_EPSILON_SECONDS)
    );
    const recovered = compareDecimalParts(nextParts, epsilonParts) <= 0;
    const exact = recovered ? '0' : decimalStringFromParts(nextParts);
    return {
      exact: exact,
      value: recovered ? 0 : Number(exact),
      recovered: recovered
    };
  }

  function canonicalCountMap(value, registry) {
    if (!plainRecord(value)) return null;
    const result = {};
    const ids = Object.keys(value);
    for (let index = 0; index < ids.length; index++) {
      const id = ids[index];
      const amount = dataValue(value, id);
      if (!own(registry, id) || !nonNegativeInteger(amount)) return null;
      define(result, id, amount);
    }
    return result;
  }

  function gateById(gateId) {
    for (let index = 0; index < transitions.length; index++) {
      const gate = dataValue(transitions[index], 'gate');
      if (plainRecord(gate) && dataValue(gate, 'id') === gateId) {
        return gate;
      }
    }
    return null;
  }

  function canonicalTrueMap(value, validator) {
    if (!plainRecord(value)) return null;
    const result = {};
    const ids = Object.keys(value);
    for (let index = 0; index < ids.length; index++) {
      const id = ids[index];
      if (dataValue(value, id) !== true || !validator(id)) return null;
      define(result, id, true);
    }
    return result;
  }

  function canonicalProgress(value) {
    if (!plainRecord(value)) return null;
    const enemyKills = canonicalCountMap(
      dataValue(value, 'enemyKills'),
      enemies
    );
    const regionKills = canonicalCountMap(
      dataValue(value, 'regionKills'),
      regions
    );
    const dungeonClears = canonicalCountMap(
      dataValue(value, 'dungeonClears'),
      dungeons
    );
    const firstClears = canonicalTrueMap(
      dataValue(value, 'firstClears'),
      function (id) { return own(dungeons, id); }
    );
    const completedGates = canonicalTrueMap(
      dataValue(value, 'completedGates'),
      function (id) { return !!gateById(id); }
    );
    return enemyKills && regionKills && dungeonClears &&
      firstClears && completedGates
      ? {
        enemyKills: enemyKills,
        regionKills: regionKills,
        dungeonClears: dungeonClears,
        firstClears: firstClears,
        completedGates: completedGates
      }
      : null;
  }

  function canonicalInjury(value) {
    if (value === null) return null;
    if (!plainRecord(value)) return undefined;
    const keys = Object.keys(value).sort();
    const legacy = keys.length === 3;
    if ((!legacy && keys.length !== 4) ||
        keys[0] !== 'id' ||
        keys[1] !== 'remainingSeconds' ||
        (!legacy && keys[2] !== 'remainingSecondsExact') ||
        keys[legacy ? 2 : 3] !== 'totalSeconds') {
      return undefined;
    }
    const id = dataValue(value, 'id');
    const remainingSeconds = dataValue(value, 'remainingSeconds');
    const totalSeconds = dataValue(value, 'totalSeconds');
    if (id !== 'severe-injury' ||
        !Number.isFinite(remainingSeconds) ||
        remainingSeconds < 0 ||
        Object.is(remainingSeconds, -0) ||
        !Number.isFinite(totalSeconds) ||
        totalSeconds < 0 ||
        Object.is(totalSeconds, -0) ||
        remainingSeconds > totalSeconds) {
      return undefined;
    }
    const remainingSecondsExact = legacy
      ? decimalStringFromNumber(remainingSeconds)
      : dataValue(value, 'remainingSecondsExact');
    const exactParts = decimalPartsFromCanonical(remainingSecondsExact);
    if (
        !exactParts ||
        Number(remainingSecondsExact) !== remainingSeconds ||
        compareDecimalParts(
          exactParts,
          decimalPartsFromNumber(totalSeconds)
        ) > 0) {
      return undefined;
    }
    return {
      id: 'severe-injury',
      remainingSeconds: remainingSeconds,
      remainingSecondsExact: remainingSecondsExact,
      totalSeconds: totalSeconds
    };
  }

  function inspectModel(model) {
    const copied = safeClone(model);
    if (!copied.ok || !plainRecord(copied.value)) return null;
    const state = copied.value;
    const player = dataValue(state, 'player');
    const combat = dataValue(player, 'combat');
    const injury = canonicalInjury(dataValue(combat, 'injury'));
    const progress = canonicalProgress(dataValue(
      player,
      'combatProgress'
    ));
    const breakthrough = dataValue(player, 'breakthrough');
    const realmId = dataValue(breakthrough, 'realmId');
    const inventory = dataValue(player, 'inventory');
    const stacks = dataValue(inventory, 'stacks');
    const systems = dataValue(state, 'systems');
    const combatSystem = dataValue(systems, 'combat');
    let session = dataValue(combatSystem, 'session');
    const pendingLoot = dataValue(combatSystem, 'pendingLoot');
    const current = dataValue(state, 'current');
    if (!plainRecord(player) || !plainRecord(combat) ||
        injury === undefined ||
        !progress || !plainRecord(breakthrough) ||
        typeof realmId !== 'string' || !own(realms, realmId) ||
        !plainRecord(inventory) || !plainRecord(stacks) ||
        !plainRecord(systems) || !plainRecord(combatSystem) ||
        (session !== null && !plainRecord(session)) ||
        (pendingLoot !== null && !plainRecord(pendingLoot)) ||
        (current !== null && !plainRecord(current)) ||
        !validRng(dataValue(state, 'rngState'))) {
      return null;
    }
    combat.injury = injury;
    if (session !== null) {
      let normalizedSession;
      if (isTeamSession(session)) {
        normalizedSession = session;
      } else {
        try {
          normalizedSession = typeof normalizeSession === 'function'
            ? normalizeSession(session)
            : null;
        } catch (error) {
          normalizedSession = null;
        }
      }
      if (!normalizedSession ||
          JSON.stringify(normalizedSession) !== JSON.stringify(session)) {
        return null;
      }
      combatSystem.session = normalizedSession;
      session = normalizedSession;
    }
    player.combatProgress = progress;
    return {
      state: state,
      player: player,
      combat: combat,
      injury: injury,
      progress: progress,
      breakthrough: breakthrough,
      realmIndex: dataValue(realms[realmId], 'index'),
      inventory: inventory,
      stacks: stacks,
      combatSystem: combatSystem,
      session: session,
      pendingLoot: pendingLoot,
      current: current
    };
  }

  function isTeamSession(session) {
    if (!plainRecord(session) || !plainRecord(dataValue(session, 'teams')) ||
        (dataValue(session, 'mode') !== 'region' &&
         dataValue(session, 'mode') !== 'dungeon') ||
        typeof dataValue(session, 'actionKey') !== 'string' ||
        !nonNegativeInteger(dataValue(session, 'waveIndex')) ||
        !nonNegativeInteger(dataValue(session, 'waveDefeated')) ||
        !nonNegativeInteger(dataValue(session, 'elapsedTicks')) ||
        !Number.isFinite(dataValue(session, 'tickRemainderSeconds')) ||
        dataValue(session, 'tickRemainderSeconds') < 0 ||
        dataValue(session, 'tickRemainderSeconds') >= 0.25) {
      return false;
    }
    if (dataValue(session, 'mode') === 'region' &&
        (dataValue(session, 'waveIndex') !== 0 ||
         dataValue(session, 'waveDefeated') !== 0)) {
      return false;
    }
    const teams = dataValue(session, 'teams');
    const allies = dataValue(teams, 'allies');
    const enemies = dataValue(teams, 'enemies');
    if (!plainArray(allies) || allies.length === 0 ||
        !plainArray(enemies) || enemies.length === 0 ||
        !allies.concat(enemies).every(function (unit) {
          return plainRecord(unit) && typeof dataValue(unit, 'id') === 'string' &&
            typeof dataValue(unit, 'sourceType') === 'string' &&
            typeof dataValue(unit, 'sourceId') === 'string' &&
            Number.isFinite(dataValue(unit, 'hp')) &&
            Number.isFinite(dataValue(unit, 'maxHp')) &&
            typeof dataValue(unit, 'fallen') === 'boolean';
        })) {
      return false;
    }
    try {
      return typeof normalizeSession === 'function' && !!normalizeSession(session);
    } catch (error) {
      return false;
    }
  }

  function actionMatchesSession(parts) {
    if (parts.session === null) {
      return !(parts.current &&
        typeof dataValue(parts.current, 'key') === 'string' &&
        dataValue(parts.current, 'key').indexOf('combat:') === 0);
    }
    return !!parts.current &&
      dataValue(parts.current, 'key') ===
        dataValue(parts.session, 'actionKey');
  }

  function result(okValue, code, state, resultValue, warning, freezeState) {
    if (freezeState) deepFreeze(state);
    if (resultValue) deepFreeze(resultValue);
    return Object.freeze({
      ok: okValue,
      code: code,
      state: state,
      result: resultValue || null,
      warning: warning || null
    });
  }

  function failure(code, model) {
    return result(false, code, model, null, null, false);
  }

  function eligibility(okValue, code, actionKey, detail) {
    return deepFreeze({
      ok: okValue,
      code: code,
      actionKey: actionKey || null,
      detail: detail || null
    });
  }

  function itemRequirements(dungeon) {
    const value = dataValue(dungeon, 'requiredItems');
    if (value === undefined) return {};
    if (!plainRecord(value)) return null;
    const result = {};
    const itemIds = Object.keys(value);
    for (let index = 0; index < itemIds.length; index++) {
      const itemId = itemIds[index];
      const amount = dataValue(value, itemId);
      if (!itemId || !positiveInteger(amount)) return null;
      define(result, itemId, amount);
    }
    return result;
  }

  function firstMissingItem(stacks, requirements) {
    const itemIds = Object.keys(requirements);
    for (let index = 0; index < itemIds.length; index++) {
      const itemId = itemIds[index];
      const owned = own(stacks, itemId) ? dataValue(stacks, itemId) : 0;
      if (!nonNegativeInteger(owned) || owned < requirements[itemId]) {
        return itemId;
      }
    }
    return null;
  }

  function canStartRegion(model, regionId, enemyId) {
    if (typeof regionId !== 'string' || !own(regions, regionId)) {
      return eligibility(false, 'unknown_region', null, null);
    }
    if (typeof enemyId !== 'string' || !own(enemies, enemyId)) {
      return eligibility(false, 'unknown_enemy', null, null);
    }
    const region = regions[regionId];
    const enemyIds = dataValue(region, 'enemyIds');
    if (!plainArray(enemyIds) || enemyIds.indexOf(enemyId) < 0) {
      return eligibility(false, 'enemy_not_in_region', null, null);
    }
    const parts = inspectModel(model);
    if (!parts || !actionMatchesSession(parts)) {
      return eligibility(false, 'invalid_state', null, null);
    }
    if (parts.injury !== null) {
      return eligibility(false, 'injured', null, null);
    }
    if (parts.pendingLoot !== null) {
      return eligibility(false, 'pending_loot_exists', null, null);
    }
    if (!nonNegativeInteger(parts.realmIndex) ||
        parts.realmIndex < dataValue(region, 'requiredRealmIndex')) {
      return eligibility(false, 'realm_locked', null, {
        requiredRealmIndex: dataValue(region, 'requiredRealmIndex')
      });
    }
    return eligibility(
      true,
      'ok',
      'combat:region:' + regionId + ':' + enemyId,
      null
    );
  }

  function canStartDungeon(model, dungeonId) {
    if (typeof dungeonId !== 'string' || !own(dungeons, dungeonId)) {
      return eligibility(false, 'unknown_dungeon', null, null);
    }
    const parts = inspectModel(model);
    if (!parts || !actionMatchesSession(parts)) {
      return eligibility(false, 'invalid_state', null, null);
    }
    if (parts.injury !== null) {
      return eligibility(false, 'injured', null, null);
    }
    if (parts.pendingLoot !== null) {
      return eligibility(false, 'pending_loot_exists', null, null);
    }
    const dungeon = dungeons[dungeonId];
    const requiredRealmIndex = dataValue(
      dungeon,
      'requiredRealmIndex'
    );
    if (!nonNegativeInteger(parts.realmIndex) ||
        !nonNegativeInteger(requiredRealmIndex) ||
        parts.realmIndex < requiredRealmIndex) {
      return eligibility(false, 'realm_locked', null, {
        requiredRealmIndex: requiredRealmIndex
      });
    }
    const requiredDungeonId = dataValue(dungeon, 'requiredDungeonId');
    if (requiredDungeonId !== null &&
        dataValue(parts.progress.firstClears, requiredDungeonId) !== true) {
      return eligibility(
        false,
        'required_dungeon_not_cleared',
        null,
        { dungeonId: requiredDungeonId }
      );
    }
    const requirements = itemRequirements(dungeon);
    if (!requirements) {
      return eligibility(false, 'invalid_content', null, null);
    }
    const missingItemId = firstMissingItem(parts.stacks, requirements);
    if (missingItemId !== null) {
      return eligibility(false, 'required_item_missing', null, {
        itemId: missingItemId,
        required: requirements[missingItemId]
      });
    }
    return eligibility(
      true,
      'ok',
      'combat:dungeon:' + dungeonId,
      null
    );
  }

  function canonicalAction(actionKey) {
    return {
      key: actionKey,
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      elapsedAnchorMs: null,
      elapsedBaseSeconds: null,
      stalled: false
    };
  }

  function installAction(parts, actionKey, nowMs) {
    if (parts.current) {
      parts.state.lastActionStop = {
        key: dataValue(parts.current, 'key'),
        reason: 'switched',
        atMs: nowMs
      };
    }
    parts.state.current = canonicalAction(actionKey);
  }

  function startRegion(model, regionId, enemyId, nowMs) {
    const allowed = canStartRegion(model, regionId, enemyId);
    if (!allowed.ok) return failure(allowed.code, model);
    if (!finiteTimestamp(nowMs)) return failure('invalid_timestamp', model);
    const parts = inspectModel(model);
    if (!parts) return failure('invalid_state', model);
    if (parts.session &&
        dataValue(parts.session, 'actionKey') === allowed.actionKey) {
      return result(
        true,
        'no_change',
        deepFreeze(parts.state),
        { actionKey: allowed.actionKey },
        null,
        false
      );
    }
    let session;
    try {
      const useTeamCombat = typeof teamCreateSession === 'function' &&
        plainRecord(dataValue(parts.state.systems, 'teamCombat'));
      const teamSession = useTeamCombat
        ? teamCreateSession(parts.state, {
          mode: 'region',
          regionId: regionId,
          enemyIds: [enemyId],
          loadoutId: parts.state.player.combat.activeLoadoutId,
          rngState: parts.state.rngState
        })
        : null;
      const legacySession = typeof engineCreateSession === 'function'
        ? engineCreateSession(parts.state, {
          mode: 'region',
          regionId: regionId,
          enemyId: enemyId
        })
        : null;
      session = teamSession && legacySession
        ? Object.assign({}, legacySession, teamSession)
        : teamSession || legacySession;
    } catch (error) {
      session = null;
    }
    if (!session) return failure('requirements_invalid', model);
    installAction(parts, allowed.actionKey, nowMs);
    parts.combatSystem.session = session;
    parts.combatSystem.lootLog = [];
    return result(
      true,
      'ok',
      parts.state,
      { actionKey: allowed.actionKey },
      null,
      true
    );
  }

  function startDungeon(model, dungeonId, nowMs) {
    const allowed = canStartDungeon(model, dungeonId);
    if (!allowed.ok) return failure(allowed.code, model);
    if (!finiteTimestamp(nowMs)) return failure('invalid_timestamp', model);
    const parts = inspectModel(model);
    if (!parts) return failure('invalid_state', model);
    if (parts.session &&
        dataValue(parts.session, 'actionKey') === allowed.actionKey) {
      return result(
        true,
        'no_change',
        deepFreeze(parts.state),
        { actionKey: allowed.actionKey },
        null,
        false
      );
    }
    let session;
    try {
      const waves = dataValue(dungeons[dungeonId], 'waves');
      const wave = plainArray(waves) ? waves[0] : null;
      const enemyIds = wave && (dataValue(wave, 'enemyIds') || [
        dataValue(wave, 'enemyId')
      ]);
      const useTeamCombat = typeof teamCreateSession === 'function' &&
        plainRecord(dataValue(parts.state.systems, 'teamCombat'));
      const teamSession = useTeamCombat &&
        plainArray(enemyIds)
        ? teamCreateSession(parts.state, {
          mode: 'dungeon',
          dungeonId: dungeonId,
          enemyIds: enemyIds,
          loadoutId: parts.state.player.combat.activeLoadoutId,
          rngState: parts.state.rngState,
          waveIndex: 0,
          waveDefeated: 0
        })
        : null;
      const legacySession = typeof engineCreateSession === 'function'
        ? engineCreateSession(parts.state, {
          mode: 'dungeon',
          dungeonId: dungeonId,
          waveIndex: 0,
          waveDefeated: 0,
          bossPhase: 0
        })
        : null;
      session = teamSession && legacySession
        ? Object.assign({}, legacySession, teamSession)
        : teamSession || legacySession;
    } catch (error) {
      session = null;
    }
    if (!session) return failure('requirements_invalid', model);
    installAction(parts, allowed.actionKey, nowMs);
    parts.combatSystem.session = session;
    parts.combatSystem.lootLog = [];
    return result(
      true,
      'ok',
      parts.state,
      { actionKey: allowed.actionKey },
      null,
      true
    );
  }

  function addCount(record, id) {
    const current = own(record, id) ? dataValue(record, id) : 0;
    if (!nonNegativeInteger(current) ||
        current === Number.MAX_SAFE_INTEGER) {
      return false;
    }
    define(record, id, current + 1);
    return true;
  }

  function evaluateGates(progress) {
    const unlocks = [];
    for (let index = 0; index < transitions.length; index++) {
      const gate = dataValue(transitions[index], 'gate');
      if (!plainRecord(gate)) continue;
      const gateId = dataValue(gate, 'id');
      const type = dataValue(gate, 'type');
      const targetId = dataValue(gate, 'targetId');
      const count = dataValue(gate, 'count');
      let current = 0;
      if (type === 'enemyKills') {
        current = own(progress.enemyKills, targetId)
          ? progress.enemyKills[targetId]
          : 0;
      } else if (type === 'dungeonClears') {
        current = own(progress.dungeonClears, targetId)
          ? progress.dungeonClears[targetId]
          : 0;
      } else {
        continue;
      }
      if (positiveInteger(count) && current >= count &&
          dataValue(progress.completedGates, gateId) !== true) {
        define(progress.completedGates, gateId, true);
        unlocks.push(gateId);
      }
    }
    return unlocks;
  }

  function rewardData(value) {
    if (!plainRecord(value) ||
        dataValue(value, 'ok') !== true ||
        dataValue(value, 'code') !== 'ok' ||
        !plainRecord(dataValue(value, 'source')) ||
        !plainRecord(dataValue(value, 'items')) ||
        !nonNegativeInteger(dataValue(value, 'currency')) ||
        !validRng(dataValue(value, 'rngState'))) {
      return null;
    }
    return value;
  }

  function combineRewards(enemyReward, firstClearReward) {
    const items = {};
    [enemyReward, firstClearReward].forEach(function (reward) {
      Object.keys(reward.items).forEach(function (itemId) {
        const current = own(items, itemId) ? items[itemId] : 0;
        const quantity = reward.items[itemId];
        if (!positiveInteger(quantity) ||
            !Number.isSafeInteger(current + quantity)) {
          return;
        }
        define(items, itemId, current + quantity);
      });
    });
    return {
      ok: true,
      code: 'ok',
      source: firstClearReward.source,
      items: items,
      currency: enemyReward.currency + firstClearReward.currency,
      rngState: firstClearReward.rngState
    };
  }

  function readAfterOptions(value) {
    const copied = safeClone(value);
    if (!copied.ok || !plainRecord(copied.value)) return null;
    const createdAtMs = dataValue(copied.value, 'createdAtMs');
    const sectContext = dataValue(copied.value, 'sectContext');
    if (!finiteTimestamp(createdAtMs) ||
        (sectContext !== undefined && !plainRecord(sectContext))) {
      return null;
    }
    return {
      createdAtMs: createdAtMs,
      sectContext: sectContext === undefined ? EMPTY_SECT : sectContext
    };
  }

  function grantPassives(state, session, sectContext) {
    const snapshot = dataValue(session, 'loadoutSnapshot');
    const passiveIds = dataValue(snapshot, 'passiveTechniques');
    if (!plainArray(passiveIds)) return null;
    let current = state;
    const gained = {};
    for (let index = 0; index < passiveIds.length; index++) {
      const techniqueId = passiveIds[index];
      if (techniqueId === null) continue;
      const definition = typeof techniqueId === 'string'
        ? techniqueContent[techniqueId]
        : null;
      const tier = definition && dataValue(definition, 'tier');
      if (!definition || dataValue(definition, 'kind') !== 'passive' ||
          !positiveInteger(tier) ||
          typeof grantTechniqueXp !== 'function') {
        return null;
      }
      let granted;
      try {
        granted = grantTechniqueXp(
          current,
          techniqueId,
          tier,
          'combat',
          sectContext
        );
      } catch (error) {
        return null;
      }
      if (!plainRecord(granted) ||
          dataValue(granted, 'ok') !== true ||
          !plainRecord(dataValue(granted, 'state'))) {
        return null;
      }
      current = dataValue(granted, 'state');
      define(gained, techniqueId, tier);
    }
    const copied = safeClone(current);
    return copied.ok ? { state: copied.value, gained: gained } : null;
  }

  function grantPassivesForEnemies(state, session, sectContext, count) {
    if (!positiveInteger(count)) return null;
    let current = state;
    const gained = {};
    for (let index = 0; index < count; index++) {
      const granted = grantPassives(current, session, sectContext);
      if (!granted || !plainRecord(granted.state) ||
          !plainRecord(granted.gained)) {
        return null;
      }
      const techniqueIds = Object.keys(granted.gained);
      for (let techniqueIndex = 0;
          techniqueIndex < techniqueIds.length;
          techniqueIndex++) {
        const techniqueId = techniqueIds[techniqueIndex];
        const amount = dataValue(granted.gained, techniqueId);
        const existing = own(gained, techniqueId)
          ? dataValue(gained, techniqueId)
          : 0;
        if (!positiveInteger(amount) ||
            !Number.isSafeInteger(existing + amount)) {
          return null;
        }
        define(gained, techniqueId, existing + amount);
      }
      current = granted.state;
    }
    return { state: current, gained: gained };
  }

  function task8SessionPhase(session) {
    if (!plainRecord(session)) return null;
    const mode = dataValue(session, 'mode');
    const actionKey = dataValue(session, 'actionKey');
    const regionId = dataValue(session, 'regionId');
    const enemyId = dataValue(session, 'enemyId');
    const dungeonId = dataValue(session, 'dungeonId');
    const waveIndex = dataValue(session, 'waveIndex');
    const waveDefeated = dataValue(session, 'waveDefeated');
    const bossPhase = dataValue(session, 'bossPhase');
    const intermissionTicks = dataValue(session, 'intermissionTicks');
    const enemy = dataValue(session, 'enemy');
    if (!nonNegativeInteger(waveIndex) ||
        !nonNegativeInteger(waveDefeated) ||
        !nonNegativeInteger(bossPhase) ||
        !nonNegativeInteger(intermissionTicks)) {
      return null;
    }
    let expectedEnemyId;
    if (mode === 'region') {
      const region = typeof regionId === 'string'
        ? regions[regionId]
        : null;
      const enemyIds = region && dataValue(region, 'enemyIds');
      if (!region || !plainArray(enemyIds) ||
          typeof enemyId !== 'string' ||
          enemyIds.indexOf(enemyId) < 0 ||
          dungeonId !== null ||
          waveIndex !== 0 ||
          waveDefeated !== 0 ||
          bossPhase !== 0 ||
          actionKey !==
            'combat:region:' + regionId + ':' + enemyId) {
        return null;
      }
      expectedEnemyId = enemyId;
    } else if (mode === 'dungeon') {
      const dungeon = typeof dungeonId === 'string'
        ? dungeons[dungeonId]
        : null;
      const waves = dungeon && dataValue(dungeon, 'waves');
      if (!dungeon || !plainArray(waves) ||
          waveIndex >= waves.length ||
          !plainRecord(waves[waveIndex])) {
        return null;
      }
      const wave = waves[waveIndex];
      const count = dataValue(wave, 'count');
      expectedEnemyId = dataValue(wave, 'enemyId');
      if (!positiveInteger(count) ||
          waveDefeated >= count ||
          enemyId !== expectedEnemyId ||
          regionId !== dataValue(dungeon, 'regionId') ||
          actionKey !== 'combat:dungeon:' + dungeonId) {
        return null;
      }
    } else {
      return null;
    }
    if (enemy === null) {
      return intermissionTicks > 0 && bossPhase === 0
        ? 'intermission'
        : null;
    }
    const definition = enemies[expectedEnemyId];
    const phases = definition && dataValue(definition, 'phases');
    const phase = dataValue(enemy, 'phase');
    const hp = dataValue(enemy, 'hp');
    const maxPhase = plainArray(phases) && phases.length > 0
      ? phases.length - 1
      : 0;
    if (!definition ||
        !plainRecord(enemy) ||
        dataValue(enemy, 'id') !== expectedEnemyId ||
        intermissionTicks !== 0 ||
        !Number.isFinite(hp) ||
        hp < 0 ||
        !nonNegativeInteger(phase) ||
        phase !== bossPhase ||
        bossPhase > maxPhase) {
      return null;
    }
    return hp === 0 ? 'dead' : 'active';
  }

  function defeatedSession(parts) {
    const session = parts.session;
    const enemy = session && dataValue(session, 'enemy');
    if (task8SessionPhase(session) !== 'dead' ||
        !plainRecord(enemy) ||
        dataValue(parts.current, 'key') !==
          dataValue(session, 'actionKey') ||
        typeof dataValue(enemy, 'id') !== 'string' ||
        dataValue(session, 'enemyId') !== dataValue(enemy, 'id')) {
      return null;
    }
    const mode = dataValue(session, 'mode');
    if (mode !== 'region' && mode !== 'dungeon') return null;
    return { session: session, enemy: enemy, mode: mode };
  }

  function phaseTransition(parts, defeated) {
    const enemyId = dataValue(defeated.enemy, 'id');
    const definition = enemies[enemyId];
    const phases = definition && dataValue(definition, 'phases');
    const bossPhase = dataValue(defeated.session, 'bossPhase');
    if (!plainArray(phases) || phases.length === 0 ||
        !nonNegativeInteger(bossPhase) ||
        bossPhase >= phases.length - 1) {
      return null;
    }
    let enemy;
    try {
      enemy = typeof engineCreateEnemy === 'function'
        ? engineCreateEnemy(enemyId, bossPhase + 1)
        : null;
    } catch (error) {
      enemy = null;
    }
    if (!enemy) return false;
    defeated.session.bossPhase = bossPhase + 1;
    defeated.session.enemy = enemy;
    return result(
      true,
      'boss_phase',
      parts.state,
      {
        enemyId: enemyId,
        cultivation: 0,
        passiveXp: {},
        loot: {},
        unlocks: [],
        dungeonClear: false,
        firstClear: false
      },
      null,
      true
    );
  }

  function isDungeonClear(session, dungeon) {
    const waves = dataValue(dungeon, 'waves');
    const waveIndex = dataValue(session, 'waveIndex');
    const waveDefeated = dataValue(session, 'waveDefeated');
    if (!plainArray(waves) || !nonNegativeInteger(waveIndex) ||
        waveIndex >= waves.length || !nonNegativeInteger(waveDefeated)) {
      return null;
    }
    const count = dataValue(waves[waveIndex], 'count');
    if (!positiveInteger(count) || waveDefeated >= count) return null;
    return waveIndex === waves.length - 1 &&
      waveDefeated + 1 === count;
  }

  function defeatedEnemyRecords(session, fallbackEnemy) {
    if (!isTeamSession(session)) return [fallbackEnemy];
    const units = dataValue(dataValue(session, 'teams'), 'enemies');
    if (!plainArray(units)) return null;
    const rows = units.map(function (unit) {
      const enemyId = dataValue(unit, 'sourceId');
      return dataValue(unit, 'sourceType') === 'enemy' &&
        dataValue(unit, 'fallen') === true &&
        typeof enemyId === 'string' && enemies[enemyId]
        ? { id: enemyId }
        : null;
    });
    return rows.length > 0 && rows.every(Boolean) ? rows : null;
  }

  function combineRewardList(rewards) {
    if (!plainArray(rewards) || rewards.length === 0) return null;
    if (rewards.length === 1) return rewardData(rewards[0]);
    const items = {};
    let currency = 0;
    const components = [];
    for (let index = 0; index < rewards.length; index++) {
      const reward = rewards[index];
      if (!rewardData(reward) || !Number.isSafeInteger(
        currency + dataValue(reward, 'currency')
      )) return null;
      currency += dataValue(reward, 'currency');
      components.push({
        source: dataValue(reward, 'source'),
        items: dataValue(reward, 'items')
      });
      const rewardItems = dataValue(reward, 'items');
      const itemIds = Object.keys(rewardItems);
      for (let itemIndex = 0; itemIndex < itemIds.length; itemIndex++) {
        const itemId = itemIds[itemIndex];
        const quantity = dataValue(rewardItems, itemId);
        const current = own(items, itemId) ? dataValue(items, itemId) : 0;
        if (!positiveInteger(quantity) ||
            !Number.isSafeInteger(current + quantity)) return null;
        define(items, itemId, current + quantity);
      }
    }
    const finalReward = rewardData(rewards[rewards.length - 1]);
    if (!finalReward) return null;
    return {
      ok: true,
      code: 'ok',
      source: {
        type: 'combat-batch',
        id: JSON.stringify(components)
      },
      items: items,
      currency: currency,
      rngState: dataValue(finalReward, 'rngState')
    };
  }

  function rolledRewards(parts, defeated, defeatedEnemies, dungeonClear, firstClear) {
    if (typeof rollEnemyLoot !== 'function') return null;
    if (!plainArray(defeatedEnemies) || defeatedEnemies.length === 0) return null;
    const rewards = [];
    let rngState = dataValue(parts.state, 'rngState');
    for (let index = 0; index < defeatedEnemies.length; index++) {
      let enemyReward;
      try {
        enemyReward = rollEnemyLoot(defeatedEnemies[index].id, rngState);
      } catch (error) {
        return null;
      }
      enemyReward = rewardData(enemyReward);
      if (!enemyReward) return null;
      rewards.push(enemyReward);
      rngState = dataValue(enemyReward, 'rngState');
    }
    if (dungeonClear && firstClear) {
      if (typeof rollFirstClearRewards !== 'function') return null;
      let firstReward;
      try {
        firstReward = rollFirstClearRewards(
          dataValue(defeated.session, 'dungeonId'),
          rngState
        );
      } catch (error) {
        return null;
      }
      firstReward = rewardData(firstReward);
      if (!firstReward) return null;
      if (defeatedEnemies.length === 1) {
        const combined = combineRewards(rewards[0], firstReward);
        return combined || null;
      }
      rewards.push(firstReward);
    }
    return combineRewardList(rewards);
  }

  function stopForPending(state, session, atMs) {
    state.lastActionStop = {
      key: dataValue(session, 'actionKey'),
      reason: 'requirements_invalid',
      atMs: atMs
    };
    state.current = null;
    state.systems.combat.session = null;
  }

  function afterEnemyDefeated(model, rawOptions) {
    const options = readAfterOptions(rawOptions);
    if (!options) return failure('invalid_options', model);
    const parts = inspectModel(model);
    if (!parts || !actionMatchesSession(parts)) {
      return failure('invalid_state', model);
    }
    const defeated = defeatedSession(parts);
    if (!defeated) return failure('enemy_not_defeated', model);
    const defeatedEnemies = defeatedEnemyRecords(
      defeated.session,
      defeated.enemy
    );
    if (!defeatedEnemies) return failure('enemy_not_defeated', model);
    const transitioned = phaseTransition(parts, defeated);
    if (transitioned === false) return failure('invalid_state', model);
    if (transitioned) return transitioned;

    let dungeon = null;
    let dungeonClear = false;
    let firstClear = false;
    if (defeated.mode === 'dungeon') {
      dungeon = dungeons[dataValue(defeated.session, 'dungeonId')];
      const clear = dungeon
        ? isDungeonClear(defeated.session, dungeon)
        : null;
      if (clear === null) return failure('invalid_state', model);
      dungeonClear = clear;
      firstClear = dungeonClear &&
        dataValue(
          parts.progress.firstClears,
          dataValue(defeated.session, 'dungeonId')
        ) !== true;
    }

    const reward = rolledRewards(
      parts,
      defeated,
      defeatedEnemies,
      dungeonClear,
      firstClear
    );
    if (!reward || typeof applyOrPend !== 'function') {
      return failure('reward_failed', model);
    }
    let rewarded;
    try {
      rewarded = applyOrPend(parts.state, reward, options.createdAtMs);
    } catch (error) {
      return failure('reward_failed', model);
    }
    if (!plainRecord(rewarded)) return failure('reward_failed', model);
    const rewardOk = dataValue(rewarded, 'ok') === true;
    const rewardCode = dataValue(rewarded, 'code');
    if (!rewardOk && rewardCode !== 'inventory_full') {
      return failure('reward_failed', model);
    }
    const rewardState = safeClone(dataValue(rewarded, 'state'));
    if (!rewardState.ok) return failure('reward_failed', model);
    let working = rewardState.value;
    const workingPlayer = dataValue(working, 'player');
    const cultivationState = dataValue(workingPlayer, 'breakthrough');
    const cultivation = dataValue(cultivationState, 'cultivation');
    const enemyDefinition = enemies[dataValue(defeated.enemy, 'id')];
    let cultivationGain = 0;
    for (let index = 0; index < defeatedEnemies.length; index++) {
      const definition = enemies[defeatedEnemies[index].id];
      const gain = definition && dataValue(definition, 'cultivation');
      if (!nonNegativeInteger(gain) ||
          !Number.isSafeInteger(cultivationGain + gain)) {
        return failure('invalid_state', model);
      }
      cultivationGain += gain;
    }
    if (!plainRecord(workingPlayer) ||
        !plainRecord(cultivationState) ||
        !nonNegativeInteger(cultivation) ||
        !Number.isSafeInteger(cultivation + cultivationGain)) {
      return failure('invalid_state', model);
    }
    cultivationState.cultivation = cultivation + cultivationGain;

    const passives = grantPassivesForEnemies(
      working,
      defeated.session,
      options.sectContext,
      defeatedEnemies.length
    );
    if (!passives) return failure('technique_xp_failed', model);
    working = passives.state;
    const workingCombatSystem = dataValue(
      dataValue(working, 'systems'),
      'combat'
    );
    if (!plainRecord(workingCombatSystem)) {
      return failure('invalid_state', model);
    }
    if (!Array.isArray(workingCombatSystem.lootLog)) {
      workingCombatSystem.lootLog = [];
    }
    const lootItems = {};
    Object.keys(reward.items).forEach(function (itemId) {
      const quantity = reward.items[itemId];
      if (Number.isSafeInteger(quantity) && quantity > 0) {
        lootItems[itemId] = quantity;
      }
    });
    const enemyRank = enemyDefinition &&
      dataValue(enemyDefinition, 'rank')
      ? dataValue(enemyDefinition, 'rank')
      : 'normal';
    workingCombatSystem.lootLog.push({
      enemyId: dataValue(defeated.enemy, 'id'),
      enemyName: enemyDefinition && dataValue(enemyDefinition, 'name')
        ? dataValue(enemyDefinition, 'name')
        : dataValue(defeated.enemy, 'id'),
      rank: enemyRank,
      items: lootItems,
      currency: Number.isFinite(reward.currency) && reward.currency >= 0
        ? reward.currency
        : 0,
      firstClear: firstClear,
      dungeonClear: dungeonClear,
      createdAtMs: options.createdAtMs
    });
    while (workingCombatSystem.lootLog.length > 50) {
      workingCombatSystem.lootLog.shift();
    }
    const progress = dataValue(dataValue(working, 'player'), 'combatProgress');
    const workingSession = dataValue(
      dataValue(dataValue(working, 'systems'), 'combat'),
      'session'
    );
    if (!plainRecord(progress) || !plainRecord(workingSession)) {
      return failure('invalid_state', model);
    }
    for (let index = 0; index < defeatedEnemies.length; index++) {
      if (!addCount(progress.enemyKills, defeatedEnemies[index].id)) {
        return failure('invalid_state', model);
      }
    }
    const unlocks = evaluateGates(progress);

    if (defeated.mode === 'region') {
      const regionId = dataValue(workingSession, 'regionId');
      for (let index = 0; index < defeatedEnemies.length; index++) {
        if (!addCount(progress.regionKills, regionId)) {
          return failure('invalid_state', model);
        }
      }
      unlocks.push.apply(unlocks, evaluateGates(progress));
      workingSession.enemy = null;
      workingSession.intermissionTicks = REGION_INTERMISSION_TICKS;
    } else {
      const dungeonId = dataValue(workingSession, 'dungeonId');
      const waves = dataValue(dungeons[dungeonId], 'waves');
      const waveIndex = dataValue(workingSession, 'waveIndex');
      const wave = waves[waveIndex];
      workingSession.waveDefeated++;
      workingSession.enemy = null;
      workingSession.bossPhase = 0;
      if (dungeonClear) {
        if (!addCount(progress.dungeonClears, dungeonId)) {
          return failure('invalid_state', model);
        }
        if (firstClear) define(progress.firstClears, dungeonId, true);
        unlocks.push.apply(unlocks, evaluateGates(progress));
        workingSession.waveIndex = 0;
        workingSession.waveDefeated = 0;
        workingSession.enemyId = dataValue(waves[0], 'enemyId');
        workingSession.intermissionTicks = DUNGEON_REPEAT_TICKS;
        workingSession.player.hp = workingSession.player.maxHp;
        workingSession.player.qi = workingSession.player.maxQi;
      } else if (workingSession.waveDefeated < dataValue(wave, 'count')) {
        workingSession.intermissionTicks = DUNGEON_INTERMISSION_TICKS;
      } else {
        workingSession.waveIndex++;
        workingSession.waveDefeated = 0;
        workingSession.enemyId = dataValue(
          waves[workingSession.waveIndex],
          'enemyId'
        );
        workingSession.intermissionTicks = DUNGEON_INTERMISSION_TICKS;
      }
    }

    const uniqueUnlocks = unlocks.filter(function (gateId, index) {
      return unlocks.indexOf(gateId) === index;
    });
    const pending = !rewardOk && rewardCode === 'inventory_full';
    if (pending) {
      stopForPending(working, workingSession, options.createdAtMs);
    }
    return result(
      !pending,
      pending ? 'requirements_invalid' : 'ok',
      working,
      {
        enemyId: dataValue(defeated.enemy, 'id'),
        cultivation: cultivationGain,
        passiveXp: passives.gained,
        loot: reward.items,
        unlocks: uniqueUnlocks,
        dungeonClear: dungeonClear,
        firstClear: firstClear
      },
      pending ? 'inventory_full' : null,
      true
    );
  }

  function nextDungeonEnemy(model) {
    const parts = inspectModel(model);
    if (!parts || !actionMatchesSession(parts)) {
      return failure('invalid_state', model);
    }
    const session = parts.session;
    if (!plainRecord(session)) return failure('no_combat_session', model);
    const phase = task8SessionPhase(session);
    if (phase === null) return failure('invalid_state', model);
    if (phase !== 'intermission') {
      return failure('no_intermission', model);
    }
    session.intermissionTicks--;
    if (session.intermissionTicks === 0) {
      let enemy;
      try {
        enemy = typeof engineCreateEnemy === 'function'
          ? engineCreateEnemy(
            dataValue(session, 'enemyId'),
            dataValue(session, 'bossPhase')
          )
          : null;
      } catch (error) {
        enemy = null;
      }
      if (!enemy) return failure('invalid_state', model);
      session.enemy = enemy;
    }
    return result(
      true,
      'ok',
      parts.state,
      {
        spawned: session.enemy !== null,
        intermissionTicks: session.intermissionTicks
      },
      null,
      true
    );
  }

  function applyDefeat(model, atMs) {
    if (!finiteTimestamp(atMs)) return failure('invalid_timestamp', model);
    const parts = inspectModel(model);
    if (!parts || !actionMatchesSession(parts) || !parts.session) {
      return failure('invalid_state', model);
    }
    const actionKey = dataValue(parts.session, 'actionKey');
    const player = dataValue(parts.session, 'player');
    if (!plainRecord(player) ||
        dataValue(player, 'hp') !== 0 ||
        !parts.current ||
        dataValue(parts.current, 'key') !== actionKey) {
      return failure('player_not_defeated', model);
    }

    const existing = parts.injury;
    const severeExact = decimalStringFromNumber(SEVERE_INJURY_SECONDS);
    const remainingSecondsExact = existing &&
      compareDecimalParts(
        decimalPartsFromCanonical(existing.remainingSecondsExact),
        decimalPartsFromCanonical(severeExact)
      ) > 0
      ? existing.remainingSecondsExact
      : severeExact;
    const remainingSeconds = Number(remainingSecondsExact);
    parts.combat.injury = {
      id: 'severe-injury',
      remainingSeconds: remainingSeconds,
      remainingSecondsExact: remainingSecondsExact,
      totalSeconds: Math.max(
        existing ? existing.totalSeconds : 0,
        remainingSeconds,
        SEVERE_INJURY_SECONDS
      )
    };
    parts.state.lastActionStop = {
      key: actionKey,
      reason: 'injured',
      atMs: atMs
    };
    parts.state.current = null;
    parts.combatSystem.session = null;
    return result(
      true,
      'injured',
      parts.state,
      {
        stopReason: 'injured',
        report: { retreatReason: 'player_defeated' }
      },
      null,
      true
    );
  }

  function advanceInjury(model, seconds) {
    if (typeof seconds !== 'number' ||
        !Number.isFinite(seconds) ||
        seconds < 0) {
      return failure('invalid_seconds', model);
    }
    const parts = inspectModel(model);
    if (!parts || !actionMatchesSession(parts)) {
      return failure('invalid_state', model);
    }
    if (parts.injury === null) {
      return result(
        true,
        'no_change',
        parts.state,
        { recovered: false, remainingSeconds: 0 },
        null,
        true
      );
    }
    const remaining = subtractInjurySeconds(
      parts.injury.remainingSecondsExact,
      seconds
    );
    if (remaining.recovered) {
      parts.combat.injury = null;
    } else {
      parts.combat.injury.remainingSeconds = remaining.value;
      parts.combat.injury.remainingSecondsExact = remaining.exact;
    }
    return result(
      true,
      'ok',
      parts.state,
      {
        recovered: parts.combat.injury === null,
        remainingSeconds: parts.combat.injury
          ? parts.combat.injury.remainingSeconds
          : 0
      },
      null,
      true
    );
  }

  function inventoryResult(value) {
    if (!plainRecord(value) ||
        typeof dataValue(value, 'ok') !== 'boolean' ||
        typeof dataValue(value, 'code') !== 'string' ||
        !plainRecord(dataValue(value, 'value'))) {
      return null;
    }
    return value;
  }

  function applyInventory(inventory, delta) {
    if (typeof inventoryApply !== 'function') return null;
    try {
      return inventoryResult(inventoryApply(inventory, delta));
    } catch (error) {
      return null;
    }
  }

  function samePlainValue(left, right) {
    if (Object.is(left, right)) return true;
    if (plainArray(left) || plainArray(right)) {
      if (!plainArray(left) || !plainArray(right) ||
          left.length !== right.length) {
        return false;
      }
      for (let index = 0; index < left.length; index++) {
        if (!samePlainValue(left[index], right[index])) return false;
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
          !samePlainValue(dataValue(left, key), dataValue(right, key))) {
        return false;
      }
    }
    return true;
  }

  function treatInjury(model) {
    const parts = inspectModel(model);
    if (!parts || !actionMatchesSession(parts)) {
      return failure('invalid_state', model);
    }
    if (parts.injury === null) return failure('no_injury', model);

    // 拒绝明显非法的库存（如 capacity 为负），但不拒绝真实的 {stacks, free} 形态
    if (own(parts.inventory, 'capacity') &&
        (!nonNegativeInteger(dataValue(parts.inventory, 'capacity')))) {
      return failure('invalid_inventory', model);
    }

    const delta = {};
    define(delta, 'healingPill', -1);
    const consumed = applyInventory(parts.inventory, delta);
    if (!consumed || dataValue(consumed, 'ok') !== true) {
      return failure(dataValue(consumed, 'code') || 'invalid_inventory', model);
    }
    const newInventory = dataValue(consumed, 'value');
    if (!plainRecord(newInventory) ||
        !plainRecord(dataValue(newInventory, 'stacks'))) {
      return failure('invalid_inventory', model);
    }
    // 确认恰好消耗 1 颗疗伤丹（兼容 {stacks, free} 与规范化两种库存形态）
    const oldStacks = parts.stacks;
    const oldPills = oldStacks && own(oldStacks, 'healingPill')
      ? dataValue(oldStacks, 'healingPill') : 0;
    const newStacks = dataValue(newInventory, 'stacks');
    const newPills = newStacks && own(newStacks, 'healingPill')
      ? dataValue(newStacks, 'healingPill') : 0;
    if (!nonNegativeInteger(newPills) ||
        newPills !== Math.max(0, oldPills - 1)) {
      return failure('invalid_inventory', model);
    }

    const before = parts.injury.remainingSeconds;
    const remaining = subtractInjurySeconds(
      parts.injury.remainingSecondsExact,
      INJURY_TREATMENT_SECONDS
    );
    parts.player.inventory = newInventory;
    if (remaining.recovered) {
      parts.combat.injury = null;
    } else {
      parts.combat.injury.remainingSeconds = remaining.value;
      parts.combat.injury.remainingSecondsExact = remaining.exact;
    }
    return result(
      true,
      'ok',
      parts.state,
      {
        itemId: 'healingPill',
        consumed: 1,
        recoveredSeconds: Math.min(INJURY_TREATMENT_SECONDS, before),
        remainingSeconds: remaining.value
      },
      null,
      true
    );
  }

  function injuryRecordFromState(state) {
    const player = dataValue(state, 'player');
    const combat = dataValue(player, 'combat');
    const injury = dataValue(combat, 'injury');
    const canonical = canonicalInjury(injury);
    if (canonical === undefined || canonical === null ||
        !writableDataProperty(combat, 'injury')) {
      return null;
    }
    if (!own(injury, 'remainingSecondsExact')) {
      combat.injury = canonical;
      return canonical;
    }
    if (!writableDataProperty(injury, 'remainingSeconds') ||
        !writableDataProperty(injury, 'remainingSecondsExact')) {
      return null;
    }
    injury.remainingSeconds = canonical.remainingSeconds;
    injury.remainingSecondsExact = canonical.remainingSecondsExact;
    return injury;
  }

  function writableDataProperty(record, key) {
    if (!plainRecord(record) || !own(record, key)) return false;
    try {
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      return !!descriptor &&
        own(descriptor, 'value') &&
        descriptor.writable === true;
    } catch (error) {
      return false;
    }
  }

  function finishInjuryRecovery(state, helpers) {
    const player = dataValue(state, 'player');
    const combat = dataValue(player, 'combat');
    const report = dataValue(helpers, 'report');
    const passive = dataValue(report, 'passive');
    if (!writableDataProperty(combat, 'injury') ||
        !plainRecord(passive)) {
      return false;
    }
    combat.injury = null;
    define(passive, 'injuryRecovered', true);
    return true;
  }

  const injuryRecoveryLane = Object.freeze({
    id: 'stage3-injury-recovery',
    nextBoundary: function (state) {
      const injury = injuryRecordFromState(state);
      return injury ? injury.remainingSeconds : Infinity;
    },
    elapse: function (state, seconds, helpers) {
      if (typeof seconds !== 'number' ||
          !Number.isFinite(seconds) ||
          seconds < 0) {
        return;
      }
      const injury = injuryRecordFromState(state);
      if (!injury ||
          !writableDataProperty(injury, 'remainingSeconds')) {
        return;
      }
      if (!writableDataProperty(injury, 'remainingSecondsExact')) {
        return;
      }
      const remaining = subtractInjurySeconds(
        injury.remainingSecondsExact,
        seconds
      );
      if (remaining.recovered) {
        finishInjuryRecovery(state, helpers);
      } else {
        injury.remainingSeconds = remaining.value;
        injury.remainingSecondsExact = remaining.exact;
      }
    },
    resolve: function (state, helpers) {
      const injury = injuryRecordFromState(state);
      if (!injury || compareDecimalParts(
        decimalPartsFromCanonical(injury.remainingSecondsExact),
        decimalPartsFromNumber(INJURY_EPSILON_SECONDS)
      ) > 0) {
        return;
      }
      finishInjuryRecovery(state, helpers);
    }
  });

  function recordExternalGate(progress, gateId, source) {
    const copied = safeClone(progress);
    const canonical = copied.ok ? canonicalProgress(copied.value) : null;
    if (!canonical) {
      return deepFreeze({
        ok: false,
        code: 'invalid_progress',
        progress: copied.ok ? copied.value : {},
        unlocks: []
      });
    }
    const gate = typeof gateId === 'string' ? gateById(gateId) : null;
    if (!gate || dataValue(gate, 'type') !== 'task') {
      return deepFreeze({
        ok: false,
        code: 'gate_not_external_task',
        progress: canonical,
        unlocks: []
      });
    }
    if (typeof source !== 'string' || source.length === 0) {
      return deepFreeze({
        ok: false,
        code: 'invalid_source',
        progress: canonical,
        unlocks: []
      });
    }
    if (dataValue(canonical.completedGates, gateId) === true) {
      return deepFreeze({
        ok: true,
        code: 'no_change',
        progress: canonical,
        unlocks: []
      });
    }
    define(canonical.completedGates, gateId, true);
    return deepFreeze({
      ok: true,
      code: 'ok',
      progress: canonical,
      unlocks: [gateId]
    });
  }

  function copyStats(enemy) {
    const copied = safeClone(dataValue(enemy, 'stats'));
    return copied.ok ? copied.value : {};
  }

  function previewLootTable(lootTableId) {
    const table = typeof lootTableId === 'string'
      ? lootTables[lootTableId]
      : null;
    if (!plainArray(table)) return [];
    return table.map(function (row) {
      const itemIds = dataValue(row, 'itemIds');
      return {
        itemId: dataValue(row, 'itemId') || null,
        itemIds: plainArray(itemIds) ? itemIds.slice() : [],
        min: dataValue(row, 'min'),
        max: dataValue(row, 'max'),
        chance: dataValue(row, 'chance')
      };
    });
  }

  function activeRegion(parts, regionId) {
    const session = parts.session;
    if (!session || dataValue(session, 'mode') !== 'region' ||
        dataValue(session, 'regionId') !== regionId) {
      return null;
    }
    const player = compatiblePlayer(session);
    const enemy = compatibleEnemy(session);
    return {
      enemyId: compatibleEnemyId(session),
      playerHp: dataValue(player, 'hp'),
      playerMaxHp: dataValue(player, 'maxHp'),
      playerQi: dataValue(player, 'qi'),
      playerMaxQi: dataValue(player, 'maxQi'),
      enemyHp: enemy ? dataValue(enemy, 'hp') : null,
      enemyMaxHp: enemy ? dataValue(enemy, 'maxHp') : null,
      intermissionTicks: dataValue(session, 'intermissionTicks')
    };
  }

  function compatiblePlayer(session) {
    if (!isTeamSession(session)) return dataValue(session, 'player');
    return dataValue(session, 'teams').allies.filter(function (unit) {
      return dataValue(unit, 'sourceType') === 'player';
    })[0] || null;
  }

  function compatibleEnemy(session) {
    if (!isTeamSession(session)) return dataValue(session, 'enemy');
    return dataValue(session, 'teams').enemies[0] || null;
  }

  function compatibleEnemyId(session) {
    if (!isTeamSession(session)) return dataValue(session, 'enemyId');
    const enemy = compatibleEnemy(session);
    return enemy ? dataValue(enemy, 'sourceId') : null;
  }

  function queryRegions(model) {
    const parts = inspectModel(model);
    if (!parts || !actionMatchesSession(parts)) {
      return deepFreeze({ regions: [] });
    }
    const rows = Object.keys(regions).map(function (regionId) {
      const region = regions[regionId];
      const enemyIds = dataValue(region, 'enemyIds');
      return {
        id: regionId,
        name: dataValue(region, 'name'),
        tier: dataValue(region, 'tier'),
        requiredRealmIndex: dataValue(region, 'requiredRealmIndex'),
        unlocked: parts.realmIndex >= dataValue(
          region,
          'requiredRealmIndex'
        ),
        killCount: own(parts.progress.regionKills, regionId)
          ? parts.progress.regionKills[regionId]
          : 0,
        enemies: plainArray(enemyIds)
          ? enemyIds.map(function (enemyId) {
            const enemy = enemies[enemyId];
            return {
              id: enemyId,
              name: dataValue(enemy, 'name'),
              rank: dataValue(enemy, 'rank'),
              cultivation: dataValue(enemy, 'cultivation'),
              stats: copyStats(enemy),
              drops: previewLootTable(dataValue(enemy, 'lootTableId')),
              killCount: own(parts.progress.enemyKills, enemyId)
                ? parts.progress.enemyKills[enemyId]
                : 0
            };
          })
          : [],
        active: activeRegion(parts, regionId)
      };
    });
    return deepFreeze({ regions: rows });
  }

  function activeDungeon(parts, dungeonId) {
    const session = parts.session;
    if (!session || dataValue(session, 'mode') !== 'dungeon' ||
        dataValue(session, 'dungeonId') !== dungeonId) {
      return null;
    }
    const enemy = compatibleEnemy(session);
    return {
      waveIndex: dataValue(session, 'waveIndex'),
      waveNumber: dataValue(session, 'waveIndex') + 1,
      waveDefeated: dataValue(session, 'waveDefeated'),
      enemyNumber: dataValue(session, 'waveDefeated') + 1,
      enemyId: compatibleEnemyId(session),
      enemyHp: enemy ? dataValue(enemy, 'hp') : null,
      enemyMaxHp: enemy ? dataValue(enemy, 'maxHp') : null,
      bossPhase: dataValue(session, 'bossPhase'),
      bossPhaseNumber: dataValue(session, 'bossPhase') + 1,
      intermissionTicks: dataValue(session, 'intermissionTicks')
    };
  }

  function queryDungeons(model) {
    const parts = inspectModel(model);
    if (!parts || !actionMatchesSession(parts)) {
      return deepFreeze({ dungeons: [] });
    }
    const rows = Object.keys(dungeons).map(function (dungeonId) {
      const dungeon = dungeons[dungeonId];
      const requirements = itemRequirements(dungeon) || {};
      const requiredDungeonId = dataValue(
        dungeon,
        'requiredDungeonId'
      );
      const waves = dataValue(dungeon, 'waves');
      const reward = dataValue(
        dataValue(dungeon, 'firstClearRewards'),
        'items'
      );
      const firstReward = safeClone(reward);
      return {
        id: dungeonId,
        name: dataValue(dungeon, 'name'),
        tier: dataValue(dungeon, 'tier'),
        unlocked: parts.realmIndex >= dataValue(
          dungeon,
          'requiredRealmIndex'
        ) && (
          requiredDungeonId === null ||
          dataValue(parts.progress.firstClears, requiredDungeonId) === true
        ) && firstMissingItem(parts.stacks, requirements) === null,
        prerequisites: {
          realm: {
            requiredRealmIndex: dataValue(
              dungeon,
              'requiredRealmIndex'
            ),
            met: parts.realmIndex >= dataValue(
              dungeon,
              'requiredRealmIndex'
            )
          },
          priorDungeon: requiredDungeonId === null
            ? null
            : {
              dungeonId: requiredDungeonId,
              met: dataValue(
                parts.progress.firstClears,
                requiredDungeonId
              ) === true
            },
          items: Object.keys(requirements).map(function (itemId) {
            const owned = own(parts.stacks, itemId)
              ? parts.stacks[itemId]
              : 0;
            return {
              itemId: itemId,
              required: requirements[itemId],
              owned: owned,
              met: owned >= requirements[itemId]
            };
          })
        },
        waves: plainArray(waves)
          ? waves.map(function (wave, index) {
            const enemyId = dataValue(wave, 'enemyId');
            const enemy = enemies[enemyId];
            return {
              index: index,
              enemyId: enemyId,
              enemyName: dataValue(enemy, 'name'),
              rank: dataValue(enemy, 'rank'),
              count: dataValue(wave, 'count')
            };
          })
          : [],
        firstClear: {
          completed: dataValue(
            parts.progress.firstClears,
            dungeonId
          ) === true,
          rewards: firstReward.ok ? firstReward.value : {}
        },
        repeatDrops: previewLootTable(
          dataValue(dungeon, 'repeatLootTableId')
        ),
        clearCount: own(parts.progress.dungeonClears, dungeonId)
          ? parts.progress.dungeonClears[dungeonId]
          : 0,
        active: activeDungeon(parts, dungeonId)
      };
    });
    return deepFreeze({ dungeons: rows });
  }

  return Object.freeze({
    canStartRegion: canStartRegion,
    canStartDungeon: canStartDungeon,
    startRegion: startRegion,
    startDungeon: startDungeon,
    applyDefeat: applyDefeat,
    advanceInjury: advanceInjury,
    treatInjury: treatInjury,
    injuryRecoveryLane: injuryRecoveryLane,
    afterEnemyDefeated: afterEnemyDefeated,
    nextDungeonEnemy: nextDungeonEnemy,
    queryRegions: queryRegions,
    queryDungeons: queryDungeons,
    recordExternalGate: recordExternalGate
  });
});
