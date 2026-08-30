(function (root, factory) {
  'use strict';
  let proxyDetector = null;
  if (typeof module === 'object' && module.exports) {
    try {
      proxyDetector = require('node:util').types.isProxy;
    } catch (error) {
      proxyDetector = null;
    }
    module.exports = factory(
      proxyDetector,
      require('../content/combat.js'),
      require('./stage3-state.js'),
      require('./combat-progress.js'),
      require('./techniques.js'),
      require('./inventory.js'),
      require('./stage2-rules.js'),
      require('./combat-engine.js'),
      require('./team-combat-engine.js'),
      require('./team-combat-snapshot.js'),
      require('./team-combat-consequences.js')
    );
    return;
  }
  const api = factory(
    proxyDetector,
    root && root.CombatContent,
    root && root.Stage3State,
    root && root.CombatProgress,
    root && root.Techniques,
    root && root.Inventory,
    root && root.Stage2Rules,
    root && root.CombatEngine,
    root && root.TeamCombatEngine,
    root && root.TeamCombatSnapshot,
    root && root.TeamCombatConsequences
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Stage3Rules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  proxyDetector,
  TrustedCombatContent,
  TrustedStage3State,
  TrustedCombatProgress,
  TrustedTechniques,
  TrustedInventory,
  TrustedStage2Rules,
  TrustedCombatEngine,
  TrustedTeamCombatEngine,
  TrustedTeamCombatSnapshot,
  TrustedTeamCombatConsequences
) {
  'use strict';

  const TICK_SECONDS = 0.25;
  // Offline combat advances multiple ticks per simulation step (Melvor-style
  // O(actions) batching). Online stays at one tick so the UI can animate.
  // 480 tick ≈ 120s 战斗；12h 离线约 360 次 complete，显著低于旧值 40（约 4320 次）。
  const OFFLINE_COMBAT_BATCH_TICKS = 480;
  const EMPTY_SECT = Object.freeze({
    sectId: null,
    favoredTechniqueIds: Object.freeze([]),
    favoredTags: Object.freeze([])
  });
  const REQUIRED_DEPS = Object.freeze([
    'Stage2Rules',
    'CombatEngine',
    'CombatProgress',
    'Techniques',
    'Inventory'
  ]);
  const TICK_OUTCOMES = Object.freeze(
    'continue enemy_defeated player_defeated supply_exhausted'.split(' ')
  );
  const TICK_KEYS = Object.freeze(
    'ok session playerInventory rngState outcome events gains costs metrics'
      .split(' ')
  );
  const SESSION_KEYS = Object.freeze((
    'mode actionKey regionId enemyId dungeonId waveIndex waveDefeated ' +
    'bossPhase intermissionTicks elapsedTicks tickRemainderSeconds ' +
    'lastPlayerAction loadoutId loadoutSnapshot player enemy'
  ).split(' '));
  const EVENT_TYPES = Object.freeze(
    'damage supply status heal restore_qi status_skip warning'.split(' ')
  );
  const trustedAfterEnemyDefeated = requireTrustedFunction(
    TrustedCombatProgress,
    'afterEnemyDefeated',
    'CombatProgress'
  );
  const trustedStartRegion = requireTrustedFunction(
    TrustedCombatProgress,
    'startRegion',
    'CombatProgress'
  );
  const trustedStartDungeon = requireTrustedFunction(
    TrustedCombatProgress,
    'startDungeon',
    'CombatProgress'
  );
  const trustedNextDungeonEnemy = requireTrustedFunction(
    TrustedCombatProgress,
    'nextDungeonEnemy',
    'CombatProgress'
  );
  const trustedApplyDefeat = requireTrustedFunction(
    TrustedCombatProgress,
    'applyDefeat',
    'CombatProgress'
  );
  const trustedGrantXp = requireTrustedFunction(
    TrustedTechniques,
    'grantXp',
    'Techniques'
  );
  const trustedCreateStage2 = requireTrustedFunction(
    TrustedStage2Rules,
    'create',
    'Stage2Rules'
  );
  const trustedAdvanceTick = requireTrustedFunction(
    TrustedCombatEngine,
    'advanceTick',
    'CombatEngine'
  );
  const trustedCreateLegacySession = requireTrustedFunction(
    TrustedCombatEngine,
    'createSession',
    'CombatEngine'
  );
  const trustedInjuryLane = requireTrustedRecord(
    TrustedCombatProgress,
    'injuryRecoveryLane',
    'CombatProgress'
  );

  function optionalTrustedFunction(target, key) {
    try {
      return requireTrustedFunction(target, key, key);
    } catch (error) {
      return null;
    }
  }

  const trustedTeamAdvanceTick = optionalTrustedFunction(
    TrustedTeamCombatEngine,
    'advanceTick'
  );
  const trustedTeamCreateSession = optionalTrustedFunction(
    TrustedTeamCombatSnapshot,
    'createSession'
  );
  const trustedApplyTeamConsequences = optionalTrustedFunction(
    TrustedTeamCombatConsequences,
    'apply'
  );

  function own(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
  }

  function define(target, key, value) {
    Object.defineProperty(target, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }

  function detectedProxy(value) {
    if (typeof proxyDetector !== 'function') return false;
    try {
      return proxyDetector(value) === true;
    } catch (error) {
      return true;
    }
  }

  function plainRecord(value) {
    try {
      if (!value ||
          typeof value !== 'object' ||
          Array.isArray(value) ||
          detectedProxy(value)) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      return prototype === Object.prototype || prototype === null;
    } catch (error) {
      return false;
    }
  }

  function dataValue(target, key) {
    try {
      if ((!plainRecord(target) && typeof target !== 'function') ||
          !own(target, key)) {
        return undefined;
      }
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      return descriptor && own(descriptor, 'value')
        ? descriptor.value
        : undefined;
    } catch (error) {
      return undefined;
    }
  }

  function requireFunction(target, key, label) {
    const value = dataValue(target, key);
    if (typeof value !== 'function') {
      throw new TypeError(label + '.' + key + ' must be a function');
    }
    return value;
  }

  function requireTrustedFunction(target, key, label) {
    let descriptor;
    try {
      descriptor = target &&
        Object.getOwnPropertyDescriptor(target, key);
    } catch (error) {
      descriptor = null;
    }
    const value = descriptor && own(descriptor, 'value')
      ? descriptor.value
      : undefined;
    if (typeof value !== 'function') {
      throw new TypeError(label + '.' + key + ' must be a function');
    }
    return value;
  }

  function requireTrustedRecord(target, key, label) {
    let descriptor;
    try {
      descriptor = target &&
        Object.getOwnPropertyDescriptor(target, key);
    } catch (error) {
      descriptor = null;
    }
    const value = descriptor && own(descriptor, 'value')
      ? descriptor.value
      : undefined;
    let idDescriptor;
    try {
      idDescriptor = value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !detectedProxy(value)
        ? Object.getOwnPropertyDescriptor(value, 'id')
        : null;
    } catch (error) {
      idDescriptor = null;
    }
    if (!idDescriptor ||
        !own(idDescriptor, 'value') ||
        typeof idDescriptor.value !== 'string') {
      throw new TypeError(label + '.' + key + ' must be a record');
    }
    return value;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  function snapshotDependencies(deps) {
    if (!plainRecord(deps)) {
      throw new TypeError('deps must be a plain object');
    }
    const result = {};
    REQUIRED_DEPS.forEach(function (key) {
      const value = dataValue(deps, key);
      if (!value ||
          (typeof value !== 'object' && typeof value !== 'function') ||
          detectedProxy(value)) {
        throw new TypeError('deps.' + key + ' is required');
      }
      define(result, key, value);
    });
    return result;
  }

  function finite(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  function nonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function uint32(value) {
    return Number.isInteger(value) &&
      value >= 0 &&
      value <= 0xffffffff;
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function strictClone(value) {
    try {
      return { ok: true, value: cloneJson(value) };
    } catch (error) {
      return { ok: false, value: null };
    }
  }

  function sameValue(left, right) {
    if (left === right) return true;
    if (!left ||
        !right ||
        typeof left !== 'object' ||
        typeof right !== 'object') {
      return false;
    }
    const leftArray = Array.isArray(left);
    if (leftArray !== Array.isArray(right) ||
        (!leftArray &&
         (!plainRecord(left) || !plainRecord(right)))) {
      return false;
    }
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    for (let index = 0; index < leftKeys.length; index++) {
      const key = leftKeys[index];
      if (!own(right, key) ||
          !sameValue(left[key], right[key])) {
        return false;
      }
    }
    return true;
  }

  function exactKeys(value, keys) {
    if (!plainRecord(value)) return false;
    const actual = Reflect.ownKeys(value);
    if (actual.length !== keys.length) return false;
    return actual.every(function (key) {
      if (typeof key !== 'string' || keys.indexOf(key) < 0) {
        return false;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor &&
        descriptor.enumerable === true &&
        own(descriptor, 'value');
    });
  }

  function canonicalCountMap(value) {
    if (!plainRecord(value)) return false;
    const keys = Object.keys(value);
    for (let index = 0; index < keys.length; index++) {
      if (!keys[index] ||
          !nonNegativeInteger(dataValue(value, keys[index]))) {
        return false;
      }
    }
    return true;
  }

  function canonicalEvents(events) {
    if (!Array.isArray(events)) return false;
    for (let index = 0; index < events.length; index++) {
      const value = events[index];
      const type = dataValue(value, 'type');
      const warning = type === 'warning';
      const keys = warning
        ? [
          'type',
          'sourceId',
          'targetId',
          'amount',
          'critical',
          'techniqueId',
          'hit',
          'code'
        ]
        : [
          'type',
          'sourceId',
          'targetId',
          'amount',
          'critical',
          'techniqueId',
          'hit'
        ];
      if (!exactKeys(value, keys) ||
          EVENT_TYPES.indexOf(type) < 0 ||
          typeof dataValue(value, 'sourceId') !== 'string' ||
          typeof dataValue(value, 'targetId') !== 'string' ||
          !Number.isFinite(dataValue(value, 'amount')) ||
          dataValue(value, 'amount') < 0 ||
          typeof dataValue(value, 'critical') !== 'boolean' ||
          typeof dataValue(value, 'hit') !== 'boolean' ||
          (dataValue(value, 'techniqueId') !== null &&
           typeof dataValue(value, 'techniqueId') !== 'string') ||
          (warning &&
           typeof dataValue(value, 'code') !== 'string')) {
        return false;
      }
    }
    return true;
  }

  function canonicalSessionTransition(before, after, outcome) {
    if (!exactKeys(before, SESSION_KEYS) ||
        !exactKeys(after, SESSION_KEYS) ||
        !plainRecord(after.player) ||
        !plainRecord(after.enemy) ||
        !Number.isFinite(after.player.hp) ||
        after.player.hp < 0 ||
        !Number.isFinite(after.enemy.hp) ||
        after.enemy.hp < 0) {
      return false;
    }
    const immutable = [
      'mode',
      'actionKey',
      'regionId',
      'enemyId',
      'dungeonId',
      'waveIndex',
      'waveDefeated',
      'bossPhase',
      'intermissionTicks',
      'tickRemainderSeconds',
      'loadoutId',
      'loadoutSnapshot'
    ];
    if (immutable.some(function (key) {
      return !sameValue(dataValue(before, key), dataValue(after, key));
    }) ||
        [
          'maxHp',
          'maxQi',
          'attack',
          'defense',
          'accuracy',
          'evasion',
          'critChance',
          'attackIntervalTicks'
        ].some(function (key) {
          return !sameValue(before.player[key], after.player[key]);
        }) ||
        [
          'id',
          'maxHp',
          'attack',
          'defense',
          'accuracy',
          'evasion',
          'attackIntervalTicks',
          'phase'
        ].some(function (key) {
          return !sameValue(before.enemy[key], after.enemy[key]);
        }) ||
        !nonNegativeInteger(dataValue(before, 'elapsedTicks')) ||
        !nonNegativeInteger(dataValue(after, 'elapsedTicks')) ||
        dataValue(after, 'elapsedTicks') !==
          dataValue(before, 'elapsedTicks') + 1) {
      return false;
    }
    const beforeAction = dataValue(before, 'lastPlayerAction');
    const afterAction = dataValue(after, 'lastPlayerAction');
    const actionChanged = !sameValue(beforeAction, afterAction);
    if (actionChanged &&
        (!plainRecord(afterAction) ||
          dataValue(afterAction, 'tick') !==
            dataValue(before, 'elapsedTicks') ||
          (dataValue(before.player, 'cooldownTicks') !== 0) ||
          outcome === 'supply_exhausted' ||
          !plainRecord(dataValue(before, 'enemy')) ||
          !Number.isFinite(dataValue(before.enemy, 'hp')) ||
          dataValue(before.enemy, 'hp') <= 0 ||
          !Number.isFinite(dataValue(before.player, 'hp')) ||
          dataValue(before.player, 'hp') <= 0)) {
      return false;
    }
    const playerHp = after.player.hp;
    const enemyHp = after.enemy.hp;
    if (outcome === 'continue' || outcome === 'supply_exhausted') {
      return playerHp > 0 && enemyHp > 0;
    }
    if (outcome === 'enemy_defeated') {
      return playerHp > 0 && enemyHp === 0;
    }
    return outcome === 'player_defeated' &&
      playerHp === 0 &&
      enemyHp > 0;
  }

  function canonicalPlayerActionEvidence(before, tick) {
    const beforeAction = dataValue(before, 'lastPlayerAction');
    const afterAction = dataValue(tick.session, 'lastPlayerAction');
    if (sameValue(beforeAction, afterAction)) return true;
    if (!plainRecord(afterAction)) return false;
    const expectedTechniqueId =
      dataValue(afterAction, 'id') === 'normalAttack'
        ? null
        : dataValue(afterAction, 'id');
    return tick.events.some(function (entry) {
      const type = dataValue(entry, 'type');
      return (type === 'damage' ||
          type === 'heal' ||
          type === 'restore_qi') &&
        dataValue(entry, 'sourceId') === 'player' &&
        dataValue(entry, 'techniqueId') === expectedTechniqueId;
    });
  }

  function replaceRecord(target, source) {
    Object.keys(target).forEach(function (key) {
      delete target[key];
    });
    Object.keys(source).forEach(function (key) {
      define(target, key, source[key]);
    });
  }

  function addMap(target, source) {
    if (!plainRecord(target) || !plainRecord(source)) return false;
    const keys = Object.keys(source);
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const amount = dataValue(source, key);
      const current = own(target, key) ? dataValue(target, key) : 0;
      if (!key ||
          !Number.isFinite(amount) ||
          amount < 0 ||
          !Number.isFinite(current) ||
          current < 0 ||
          !Number.isFinite(current + amount)) {
        return false;
      }
      define(target, key, current + amount);
    }
    return true;
  }

  function validMapAddition(target, source) {
    if (!plainRecord(target) || !plainRecord(source)) return false;
    const keys = Object.keys(source);
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const amount = dataValue(source, key);
      const current = own(target, key) ? dataValue(target, key) : 0;
      if (!key ||
          !Number.isFinite(amount) ||
          amount < 0 ||
          !Number.isFinite(current) ||
          current < 0 ||
          !Number.isFinite(current + amount)) {
        return false;
      }
    }
    return true;
  }

  function addWarning(report, warning) {
    if (typeof warning !== 'string' || !warning) return;
    if (report.warnings.indexOf(warning) < 0) {
      report.warnings.push(warning);
    }
  }

  function parseCombatKey(key) {
    if (typeof key !== 'string') return null;
    let match = /^combat:region:([^:]+):([^:]+)$/.exec(key);
    if (match) {
      return {
        key: key,
        kind: 'combat-region',
        mode: 'region',
        regionId: match[1],
        enemyId: match[2],
        duration: TICK_SECONDS
      };
    }
    match = /^combat:dungeon:([^:]+)$/.exec(key);
    if (match) {
      return {
        key: key,
        kind: 'combat-dungeon',
        mode: 'dungeon',
        dungeonId: match[1],
        duration: TICK_SECONDS
      };
    }
    return null;
  }

  function combatSystem(state) {
    return state &&
      state.systems &&
      state.systems.combat;
  }

  function activeSession(state) {
    const system = combatSystem(state);
    return system && plainRecord(system.session)
      ? system.session
      : null;
  }

  function currentKey(state) {
    return state &&
      plainRecord(state.current) &&
      typeof dataValue(state.current, 'key') === 'string'
      ? dataValue(state.current, 'key')
      : null;
  }

  function clearSession(state) {
    const system = combatSystem(state);
    if (system) system.session = null;
  }

  function isTeamSession(session) {
    const teams = dataValue(session, 'teams');
    return plainRecord(session) && plainRecord(teams) &&
      Array.isArray(dataValue(teams, 'allies')) &&
      Array.isArray(dataValue(teams, 'enemies'));
  }

  function fxSideForUnit(session, unitId) {
    if (unitId === 'player') return 'player';
    if (unitId === 'enemy') return 'enemy';
    if (isTeamSession(session)) {
      const allies = dataValue(dataValue(session, 'teams'), 'allies');
      const enemies = dataValue(dataValue(session, 'teams'), 'enemies');
      if (Array.isArray(allies)) {
        for (let index = 0; index < allies.length; index++) {
          if (dataValue(allies[index], 'id') === unitId) return 'player';
        }
      }
      if (Array.isArray(enemies)) {
        for (let index = 0; index < enemies.length; index++) {
          if (dataValue(enemies[index], 'id') === unitId) return 'enemy';
        }
      }
    }
    if (typeof unitId === 'string' && unitId.indexOf('ally') === 0) {
      return 'player';
    }
    return 'enemy';
  }

  function appendCombatFxActions(state, session, events) {
    const system = combatSystem(state);
    if (!system || !plainRecord(session) || !Array.isArray(events) ||
        events.length === 0) {
      return;
    }
    if (!Array.isArray(system.fxActions)) system.fxActions = [];
    let nextId = Number.isSafeInteger(system.nextFxActionId) &&
      system.nextFxActionId > 0
      ? system.nextFxActionId
      : 1;
    for (let index = 0; index < events.length; index++) {
      const ev = events[index];
      if (!plainRecord(ev)) continue;
      const type = dataValue(ev, 'type');
      if (type !== 'damage' && type !== 'heal' && type !== 'status' &&
          type !== 'restore_qi' && type !== 'supply') {
        continue;
      }
      const sourceId = dataValue(ev, 'sourceId');
      const targetId = dataValue(ev, 'targetId');
      if (typeof sourceId !== 'string' || typeof targetId !== 'string') {
        continue;
      }
      const techniqueId = dataValue(ev, 'techniqueId');
      const amount = Number(dataValue(ev, 'amount'));
      const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
      const critical = dataValue(ev, 'critical') === true;
      const rawHit = dataValue(ev, 'hit');
      let skillType = 'other';
      let damage = 0;
      let heal = 0;
      let hit = true;
      if (type === 'damage') {
        skillType = 'attack';
        damage = safeAmount;
        hit = typeof rawHit === 'boolean' ? rawHit : safeAmount > 0;
      } else if (type === 'heal') {
        skillType = 'heal';
        heal = safeAmount;
        hit = true;
      } else {
        skillType = 'other';
        hit = true;
      }
      system.fxActions.push({
        id: nextId,
        side: fxSideForUnit(session, sourceId),
        targetSide: fxSideForUnit(session, targetId),
        sourceId: sourceId,
        targetId: targetId,
        techniqueId: typeof techniqueId === 'string' ? techniqueId : null,
        skillType: skillType,
        hit: hit,
        damage: damage,
        heal: heal,
        critical: critical
      });
      nextId += 1;
    }
    system.nextFxActionId = nextId;
    while (system.fxActions.length > 48) system.fxActions.shift();
  }

  function startFailure(code, state) {
    return {
      ok: false,
      code: code,
      state: state
    };
  }

  function mapStartFailure(code) {
    if ([
      'unknown_region',
      'unknown_enemy',
      'enemy_not_in_region',
      'unknown_dungeon'
    ].indexOf(code) >= 0) {
      return 'invalid_action';
    }
    return typeof code === 'string' ? code : 'requirements_invalid';
  }

  function create(deps) {
    const safe = snapshotDependencies(deps);
    const injectedTeamCombatEngine = dataValue(deps, 'TeamCombatEngine');
    const injectedTeamCombatConsequences = dataValue(
      deps,
      'TeamCombatConsequences'
    );
    const teamAdvanceTick = injectedTeamCombatEngine
      ? requireFunction(
        injectedTeamCombatEngine,
        'advanceTick',
        'deps.TeamCombatEngine'
      )
      : trustedTeamAdvanceTick;
    const applyTeamConsequences = injectedTeamCombatConsequences
      ? requireFunction(
        injectedTeamCombatConsequences,
        'apply',
        'deps.TeamCombatConsequences'
      )
      : trustedApplyTeamConsequences;
    const teamCreateSession = trustedTeamCreateSession;
    requireFunction(
      safe.Stage2Rules,
      'create',
      'deps.Stage2Rules'
    );
    requireFunction(
      safe.CombatEngine,
      'createSession',
      'deps.CombatEngine'
    );
    const advanceTick = requireFunction(
      safe.CombatEngine,
      'advanceTick',
      'deps.CombatEngine'
    );
    const createEnemy = safe.CombatEngine &&
      typeof safe.CombatEngine.createEnemy === 'function'
      ? safe.CombatEngine.createEnemy
      : null;
    const startRegion = requireFunction(
      safe.CombatProgress,
      'startRegion',
      'deps.CombatProgress'
    );
    const startDungeon = requireFunction(
      safe.CombatProgress,
      'startDungeon',
      'deps.CombatProgress'
    );
    const afterEnemyDefeated = requireFunction(
      safe.CombatProgress,
      'afterEnemyDefeated',
      'deps.CombatProgress'
    );
    const nextDungeonEnemy = requireFunction(
      safe.CombatProgress,
      'nextDungeonEnemy',
      'deps.CombatProgress'
    );
    const applyDefeat = requireFunction(
      safe.CombatProgress,
      'applyDefeat',
      'deps.CombatProgress'
    );
    const grantXp = requireFunction(
      safe.Techniques,
      'grantXp',
      'deps.Techniques'
    );
    const inventoryApply = requireFunction(
      safe.Inventory,
      'apply',
      'deps.Inventory'
    );
    const normalizeStage3State = requireFunction(
      TrustedStage3State,
      'normalize',
      'Stage3State'
    );
    const normalizeStage3Session = requireFunction(
      TrustedStage3State,
      'normalizeSession',
      'Stage3State'
    );
    const trustedInventoryApply = requireFunction(
      TrustedInventory,
      'apply',
      'Inventory'
    );
    const certifiedSessions = new WeakMap();
    const certifiedInventories = new WeakMap();
    const injectedInjuryLane = dataValue(
      safe.CombatProgress,
      'injuryRecoveryLane'
    );
    if (!plainRecord(injectedInjuryLane) ||
        typeof dataValue(injectedInjuryLane, 'id') !== 'string') {
      throw new TypeError(
        'deps.CombatProgress.injuryRecoveryLane is required'
      );
    }
    const injuryLane = trustedInjuryLane;

    let baseRuntime;
    try {
      baseRuntime = trustedCreateStage2(deps);
    } catch (error) {
      throw new TypeError('Stage 2 runtime creation failed');
    }
    if (!plainRecord(baseRuntime) ||
        !plainRecord(dataValue(baseRuntime, 'rules')) ||
        !Array.isArray(dataValue(baseRuntime, 'lanes'))) {
      throw new TypeError('Stage 2 runtime is invalid');
    }
    const baseRules = dataValue(baseRuntime, 'rules');
    const baseLanes = dataValue(baseRuntime, 'lanes');
    [
      'start',
      'getAction',
      'nextBoundary',
      'elapse',
      'inspect',
      'complete',
      'random'
    ].forEach(function (key) {
      requireFunction(baseRules, key, 'Stage 2 rules');
    });

    function start(state, key, nowMs) {
      const descriptor = parseCombatKey(key);
      if (typeof key === 'string' &&
          key.indexOf('combat:') === 0 &&
          !descriptor) {
        return startFailure('invalid_action', state);
      }
      if (!descriptor) {
        let started;
        try {
          started = baseRules.start(state, key, nowMs);
        } catch (error) {
          return startFailure('invalid_action', state);
        }
        if (started &&
            started.ok === true &&
            started.code !== 'no_change' &&
            plainRecord(started.state) &&
            activeSession(state)) {
          clearSession(started.state);
        }
        return started;
      }
      let started;
      started = descriptor.mode === 'region'
        ? certifiedDomainCall(
          startRegion,
          trustedStartRegion,
          [state, descriptor.regionId, descriptor.enemyId, nowMs]
        )
        : certifiedDomainCall(
          startDungeon,
          trustedStartDungeon,
          [state, descriptor.dungeonId, nowMs]
        );
      if (!started) return startFailure('requirements_invalid', state);
      if (!started || started.ok !== true) {
        return startFailure(
          mapStartFailure(started && started.code),
          state
        );
      }
      if (!exactKeys(started, [
        'ok', 'code', 'state', 'result', 'warning'
      ]) ||
          (started.code !== 'ok' && started.code !== 'no_change') ||
          started.warning !== null ||
          !exactKeys(started.result, ['actionKey']) ||
          started.result.actionKey !== descriptor.key ||
          !plainRecord(started.state) ||
          currentKey(started.state) !== descriptor.key ||
          (!isTeamSession(activeSession(started.state)) &&
           !canonicalSession(activeSession(started.state)))) {
        return startFailure('requirements_invalid', state);
      }
      return {
        ok: true,
        code: started.code,
        state: started.state
      };
    }

    function getAction(state) {
      const key = currentKey(state);
      const descriptor = parseCombatKey(key);
      if (!descriptor) return baseRules.getAction(state);
      return deepFreeze(descriptor);
    }

    function selectedRules(descriptor) {
      return descriptor &&
        (descriptor.kind === 'combat-region' ||
         descriptor.kind === 'combat-dungeon')
        ? rules
        : baseRules;
    }

    function combatInspection(state, descriptor) {
      const session = activeSession(state);
      if (!session ||
          currentKey(state) !== descriptor.key ||
          dataValue(session, 'actionKey') !== descriptor.key ||
          dataValue(session, 'mode') !== descriptor.mode) {
        clearSession(state);
        return { status: 'stop', reason: 'requirements_invalid' };
      }
      if (state.player &&
          state.player.combat &&
          state.player.combat.injury !== null) {
        clearSession(state);
        return { status: 'stop', reason: 'injured' };
      }
      // 待领取战利品不再清掉战斗；挂机循环继续，仅禁止新开一场（canStart）
      return { status: 'ready', reason: null };
    }

    function isOfflineSource(helpers) {
      return !!(helpers &&
        helpers.report &&
        helpers.report.source === 'offline');
    }

    function combatTimeBoundary(state, helpers) {
      const first = Math.max(
        0,
        TICK_SECONDS - finite(state.current.elapsed, 0)
      );
      if (!isOfflineSource(helpers)) return first;
      return first + (OFFLINE_COMBAT_BATCH_TICKS - 1) * TICK_SECONDS;
    }

    function elapseCombat(state, seconds) {
      const current = state.current;
      const elapsed = finite(current.elapsed, 0);
      current.elapsed = elapsed + seconds;
      current.stalled = false;
    }

    function finishCombatDuration(state) {
      const current = state.current;
      current.elapsed = Math.max(
        0,
        finite(current.elapsed, 0) - TICK_SECONDS
      );
      current.stalled = false;
    }

    function canReportEngine(report, tick) {
      if (!Number.isFinite(tick.metrics.damageDealt) ||
          tick.metrics.damageDealt < 0 ||
          !Number.isFinite(tick.metrics.damageTaken) ||
          tick.metrics.damageTaken < 0 ||
          !Number.isFinite(
            report.combat.damageDealt + tick.metrics.damageDealt
          ) ||
          !Number.isFinite(
            report.combat.damageTaken + tick.metrics.damageTaken
          ) ||
          !validMapAddition(
            report.combat.suppliesUsed,
            tick.metrics.suppliesUsed
          ) ||
          !validMapAddition(report.costs.items, tick.costs.items) ||
          !validMapAddition(
            report.costs.supplies,
            tick.metrics.suppliesUsed
          ) ||
          !validMapAddition(
            report.techniques.xp,
            tick.gains.techniqueXp
          )) {
        return false;
      }
      return true;
    }

    function reportEngine(report, tick) {
      if (!canReportEngine(report, tick)) return false;
      report.combat.ticks++;
      report.combat.damageDealt += tick.metrics.damageDealt;
      report.combat.damageTaken += tick.metrics.damageTaken;
      if (!addMap(
        report.combat.suppliesUsed,
        tick.metrics.suppliesUsed
      ) ||
          !addMap(report.costs.items, tick.costs.items) ||
          !addMap(report.costs.supplies, tick.metrics.suppliesUsed) ||
          !addMap(report.techniques.xp, tick.gains.techniqueXp)) {
        return false;
      }
      return true;
    }

    function normalizedExact(value, normalize, options) {
      const input = strictClone(value);
      if (!input.ok) return null;
      let normalized;
      try {
        normalized = normalize(input.value, options);
      } catch (error) {
        normalized = null;
      }
      return normalized && sameValue(normalized, input.value)
        ? input.value
        : null;
    }

    function canonicalSession(value, alreadyDetached) {
      const cached = plainRecord(value)
        ? certifiedSessions.get(value)
        : null;
      if (cached && sameValue(value, cached)) {
        return value;
      }
      const input = alreadyDetached
        ? { ok: true, value: value }
        : strictClone(value);
      if (!input.ok) return null;
      let normalized;
      try {
        normalized = normalizeStage3Session(input.value);
      } catch (error) {
        normalized = null;
      }
      const canonical = normalized &&
        sameValue(normalized, input.value)
          ? input.value
          : null;
      if (canonical && plainRecord(value)) {
        certifiedSessions.set(value, deepFreeze(normalized));
      }
      return canonical;
    }

    function canonicalSessionPair(before, after) {
      return !!canonicalSession(before) &&
        !!canonicalSession(after, true);
    }

    function canonicalState(value) {
      return normalizedExact(
        value,
        normalizeStage3State,
        { preserveLegacyFields: true }
      );
    }

    function normalizeCertifiedState(value) {
      const input = strictClone(value);
      if (!input.ok) return null;
      let normalized;
      try {
        normalized = normalizeStage3State(
          input.value,
          { preserveLegacyFields: true }
        );
      } catch (error) {
        normalized = null;
      }
      const detached = strictClone(normalized);
      return detached.ok ? detached.value : null;
    }

    function inventoryResult(apply, inventory, delta) {
      const input = strictClone(inventory);
      const copiedDelta = strictClone(delta);
      if (!input.ok || !copiedDelta.ok) return null;
      let raw;
      try {
        raw = apply(input.value, copiedDelta.value);
      } catch (error) {
        raw = null;
      }
      const detached = strictClone(raw);
      return detached.ok &&
        exactKeys(detached.value, ['ok', 'code', 'value']) &&
        detached.value.ok === true &&
        detached.value.code === 'ok'
        ? detached.value.value
        : null;
    }

    function canonicalInventory(value) {
      const snapshot = plainRecord(value)
        ? certifiedInventories.get(value)
        : null;
      if (snapshot && sameValue(value, snapshot)) {
        return value;
      }
      const normalized = inventoryResult(
        trustedInventoryApply,
        value,
        {}
      );
      if (!normalized || !sameValue(normalized, value)) return null;
      if (plainRecord(value)) {
        certifiedInventories.set(value, deepFreeze(normalized));
      }
      return normalized;
    }

    function certifyEquivalentInventory(value, source) {
      const snapshot = plainRecord(source)
        ? certifiedInventories.get(source)
        : null;
      if (!snapshot || !plainRecord(value)) return false;
      certifiedInventories.set(value, snapshot);
      return true;
    }

    function validateTick(beforeSession, beforeInventory, rawTick) {
      if (!exactKeys(rawTick, TICK_KEYS)) return null;
      let tick;
      try {
        tick = cloneJson(rawTick);
      } catch (error) {
        tick = null;
      }
      if (!tick ||
          !exactKeys(tick, TICK_KEYS) ||
          tick.ok !== true ||
          TICK_OUTCOMES.indexOf(tick.outcome) < 0 ||
          !uint32(tick.rngState) ||
          !exactKeys(tick.gains, ['techniqueXp']) ||
          !exactKeys(tick.costs, ['items']) ||
          !exactKeys(
            tick.metrics,
            ['damageDealt', 'damageTaken', 'suppliesUsed']
          ) ||
          !canonicalCountMap(tick.gains.techniqueXp) ||
          !canonicalCountMap(tick.costs.items) ||
          !canonicalCountMap(tick.metrics.suppliesUsed) ||
          !Number.isFinite(tick.metrics.damageDealt) ||
          tick.metrics.damageDealt < 0 ||
          !Number.isFinite(tick.metrics.damageTaken) ||
          tick.metrics.damageTaken < 0 ||
          !canonicalEvents(tick.events) ||
          !canonicalSessionPair(beforeSession, tick.session) ||
          !canonicalInventory(beforeInventory) ||
          !canonicalSessionTransition(
            beforeSession,
            tick.session,
            tick.outcome
          ) ||
          !canonicalPlayerActionEvidence(beforeSession, tick) ||
          !sameValue(tick.costs.items, tick.metrics.suppliesUsed)) {
        return null;
      }
      const delta = {};
      const costIds = Object.keys(tick.costs.items);
      costIds.forEach(function (itemId) {
        define(delta, itemId, -tick.costs.items[itemId]);
      });
      if (costIds.length === 0) {
        return sameValue(beforeInventory, tick.playerInventory) &&
          certifyEquivalentInventory(
            tick.playerInventory,
            beforeInventory
          )
            ? tick
            : null;
      }
      if (!canonicalInventory(tick.playerInventory)) return null;
      const expected = inventoryResult(
        trustedInventoryApply,
        beforeInventory,
        delta
      );
      const dependencyValue = inventoryResult(
        inventoryApply,
        beforeInventory,
        delta
      );
      if (!expected ||
          !dependencyValue ||
          !sameValue(expected, dependencyValue) ||
          !sameValue(expected, tick.playerInventory)) {
        return null;
      }
      return tick;
    }

    function certifiedDomainCall(operation, trusted, args) {
      const operationArgs = strictClone(args);
      if (!operationArgs.ok || !Array.isArray(operationArgs.value)) {
        return null;
      }
      let operational;
      try {
        operational = operation.apply(null, operationArgs.value);
      } catch (error) {
        return null;
      }
      const detached = strictClone(operational);
      if (!detached.ok) return null;
      if (operation === trusted) return detached.value;

      const trustedArgs = strictClone(args);
      if (!trustedArgs.ok || !Array.isArray(trustedArgs.value)) {
        return null;
      }
      let expected;
      try {
        expected = trusted.apply(null, trustedArgs.value);
      } catch (error) {
        return null;
      }
      const certificate = strictClone(expected);
      return certificate.ok &&
        sameValue(detached.value, certificate.value)
        ? detached.value
        : null;
    }

    function certifiedFrozenCall(operation, trusted, args) {
      const copied = strictClone(args);
      if (!copied.ok || !Array.isArray(copied.value)) return null;
      const frozenArgs = deepFreeze(copied.value);
      let operational;
      try {
        operational = operation.apply(null, frozenArgs);
      } catch (error) {
        return null;
      }
      const detached = strictClone(operational);
      if (!detached.ok) return null;
      if (operation === trusted) return detached.value;
      let expected;
      try {
        expected = trusted.apply(null, frozenArgs);
      } catch (error) {
        return null;
      }
      const certificate = strictClone(expected);
      return certificate.ok &&
        sameValue(detached.value, certificate.value)
        ? detached.value
        : null;
    }

    function grantActiveTechniqueXp(state, xp, report) {
      let working = state;
      const techniqueIds = Object.keys(xp);
      for (let index = 0; index < techniqueIds.length; index++) {
        const techniqueId = techniqueIds[index];
        const amount = dataValue(xp, techniqueId);
        const granted = certifiedDomainCall(
          grantXp,
          trustedGrantXp,
          [
            working,
            techniqueId,
            amount,
            'combat',
            EMPTY_SECT
          ]
        );
        if (!granted ||
            !exactKeys(granted, [
              'ok',
              'code',
              'state',
              'gainedXp',
              'levelsGained',
              'capped'
            ])) {
          return null;
        }
        if (!canonicalState(granted.state) ||
            granted.ok !== true ||
            granted.code !== 'ok' ||
            granted.gainedXp !== amount ||
            !nonNegativeInteger(granted.levelsGained) ||
            typeof granted.capped !== 'boolean') {
          return null;
        }
        working = granted.state;
        if (granted.levelsGained > 0) {
          report.levels.push({
            type: 'technique',
            id: techniqueId,
            levels: granted.levelsGained
          });
        }
      }
      return working;
    }

    function reportProgress(
      report,
      progress,
      mode,
      pendingLootId,
      dungeonId
    ) {
      const value = progress && progress.result;
      if (!plainRecord(value)) return false;
      const enemyId = dataValue(value, 'enemyId');
      const cultivation = dataValue(value, 'cultivation');
      const passiveXp = dataValue(value, 'passiveXp');
      const loot = dataValue(value, 'loot');
      const unlocks = dataValue(value, 'unlocks');
      if (typeof enemyId !== 'string' ||
          !Number.isFinite(cultivation) ||
          cultivation < 0 ||
          !plainRecord(passiveXp) ||
          !plainRecord(loot) ||
          !Array.isArray(unlocks)) {
        return false;
      }
      define(
        report.combat.enemiesDefeated,
        enemyId,
        (own(report.combat.enemiesDefeated, enemyId)
          ? report.combat.enemiesDefeated[enemyId]
          : 0) + 1
      );
      report.gains.cultivation += cultivation;
      if (!addMap(report.techniques.xp, passiveXp) ||
          !addMap(report.gains.items, loot) ||
          !addMap(report.combat.loot, loot)) {
        return false;
      }
      unlocks.forEach(function (gateId) {
        if (typeof gateId === 'string') report.unlocks.push(gateId);
      });
      if (mode === 'region') {
        report.action.completed++;
      } else if (dataValue(value, 'dungeonClear') === true) {
        if (typeof dungeonId !== 'string') return false;
        define(
          report.combat.dungeonClears,
          dungeonId,
          (own(report.combat.dungeonClears, dungeonId)
            ? report.combat.dungeonClears[dungeonId]
            : 0) + 1
        );
        report.action.completed++;
      }
      if (pendingLootId !== null) {
        report.combat.pendingLootId = pendingLootId;
      }
      return true;
    }

    function resultEnvelope(rawResult) {
      const detached = strictClone(rawResult);
      return detached.ok &&
        exactKeys(detached.value, [
          'ok',
          'code',
          'state',
          'result',
          'warning'
        ])
        ? detached.value
        : null;
    }

    function validateIntermission(rawResult) {
      const value = resultEnvelope(rawResult);
      const state = value && normalizeCertifiedState(value.state);
      if (!value ||
          !state ||
          value.ok !== true ||
          value.code !== 'ok' ||
          value.warning !== null ||
          !exactKeys(value.result, [
            'spawned',
            'intermissionTicks'
          ]) ||
          typeof value.result.spawned !== 'boolean' ||
          !nonNegativeInteger(value.result.intermissionTicks)) {
        return null;
      }
      value.state = state;
      return value;
    }

    function validateDefeat(rawResult) {
      const value = resultEnvelope(rawResult);
      const state = value && normalizeCertifiedState(value.state);
      if (!value ||
          !state ||
          value.ok !== true ||
          value.code !== 'injured' ||
          value.warning !== null ||
          !exactKeys(value.result, ['stopReason', 'report']) ||
          value.result.stopReason !== 'injured' ||
          !exactKeys(value.result.report, ['retreatReason']) ||
          value.result.report.retreatReason !== 'player_defeated') {
        return null;
      }
      value.state = state;
      return value;
    }

    function validateProgressTransition(rawResult) {
      const value = resultEnvelope(rawResult);
      const rawState = value && value.state;
      const rawSystems = rawState && dataValue(rawState, 'systems');
      const rawCombat = rawSystems && dataValue(rawSystems, 'combat');
      const rawSession = rawCombat && dataValue(rawCombat, 'session');
      const state = isTeamSession(rawSession)
        ? rawState
        : value && normalizeCertifiedState(value.state);
      if (!value ||
          !state ||
          typeof value.ok !== 'boolean' ||
          typeof value.code !== 'string' ||
          (value.warning !== null &&
           typeof value.warning !== 'string') ||
          !exactKeys(value.result, [
            'enemyId',
            'cultivation',
            'passiveXp',
            'loot',
            'unlocks',
            'dungeonClear',
            'firstClear'
          ]) ||
          typeof value.result.enemyId !== 'string' ||
          !nonNegativeInteger(value.result.cultivation) ||
          !canonicalCountMap(value.result.passiveXp) ||
          !canonicalCountMap(value.result.loot) ||
          !Array.isArray(value.result.unlocks) ||
          value.result.unlocks.some(function (id) {
            return typeof id !== 'string' || id.length === 0;
          }) ||
          typeof value.result.dungeonClear !== 'boolean' ||
          typeof value.result.firstClear !== 'boolean') {
        return null;
      }
      value.state = state;
      return value;
    }

    function teamUnit(session, side, sourceType) {
      const teams = dataValue(session, 'teams');
      const units = teams && dataValue(teams, side);
      if (!Array.isArray(units)) return null;
      return units.filter(function (unit) {
        return dataValue(unit, 'sourceType') === sourceType;
      })[0] || null;
    }

    function compatibilityUnit(previous, unit, useSourceId) {
      let next;
      try {
        next = plainRecord(previous) ? cloneJson(previous) : {};
      } catch (error) {
        return null;
      }
      if (!plainRecord(next) || !plainRecord(unit)) return null;
      ['hp', 'maxHp', 'qi', 'maxQi', 'fallen'].forEach(function (key) {
        const value = dataValue(unit, key);
        if (value !== undefined) next[key] = value;
      });
      if (useSourceId) next.id = dataValue(unit, 'sourceId');
      return next;
    }

    function legacyEnemyBase(session, enemyUnit) {
      const enemyId = dataValue(enemyUnit, 'sourceId');
      const bossPhase = nonNegativeInteger(dataValue(session, 'bossPhase'))
        ? dataValue(session, 'bossPhase')
        : 0;
      const previous = dataValue(session, 'enemy');
      if (plainRecord(previous) &&
          dataValue(previous, 'id') === enemyId &&
          nonNegativeInteger(dataValue(previous, 'phase')) &&
          Number.isFinite(dataValue(previous, 'attack')) &&
          Number.isFinite(dataValue(previous, 'defense')) &&
          Number.isFinite(dataValue(previous, 'accuracy')) &&
          Number.isFinite(dataValue(previous, 'evasion')) &&
          nonNegativeInteger(dataValue(previous, 'attackIntervalTicks')) &&
          nonNegativeInteger(dataValue(previous, 'cooldownTicks')) &&
          plainRecord(dataValue(previous, 'buffs')) &&
          plainRecord(dataValue(previous, 'statuses'))) {
        return previous;
      }
      if (typeof createEnemy !== 'function' || typeof enemyId !== 'string') {
        return null;
      }
      try {
        return createEnemy(enemyId, bossPhase);
      } catch (error) {
        return null;
      }
    }

    function synchronizeTeamCompatibility(session, exposeEnemy) {
      if (!isTeamSession(session)) return null;
      const player = teamUnit(session, 'allies', 'player');
      const enemy = teamUnit(session, 'enemies', 'enemy');
      if (!player || !enemy) return null;
      let next;
      try {
        next = cloneJson(session);
      } catch (error) {
        return null;
      }
      const compatiblePlayer = compatibilityUnit(
        dataValue(session, 'player'),
        player,
        false
      );
      if (!compatiblePlayer) return null;
      next.player = compatiblePlayer;
      if (exposeEnemy === false) {
        next.enemy = null;
      } else {
        // 间隔结束后旧 enemy 常为 null/残缺；必须重建完整 actor，否则第二场击杀会校验失败并清会话
        const baseEnemy = legacyEnemyBase(session, enemy);
        const compatibleEnemy = compatibilityUnit(baseEnemy, enemy, true);
        if (!compatibleEnemy) return null;
        const bossPhase = nonNegativeInteger(dataValue(session, 'bossPhase'))
          ? dataValue(session, 'bossPhase')
          : 0;
        compatibleEnemy.phase = bossPhase;
        next.enemy = compatibleEnemy;
      }
      return next;
    }

    function teamEnemyIds(session) {
      if (!isTeamSession(session)) return null;
      const units = dataValue(dataValue(session, 'teams'), 'enemies');
      if (!Array.isArray(units) || units.length < 1 || units.length > 4) {
        return null;
      }
      const ids = units.map(function (unit) {
        return dataValue(unit, 'sourceType') === 'enemy'
          ? dataValue(unit, 'sourceId')
          : null;
      });
      return ids.every(function (id) {
        return typeof id === 'string' && id.length > 0;
      }) ? ids : null;
    }

    function nextTeamEnemyIds(progressed, priorSession) {
      const priorIds = teamEnemyIds(priorSession);
      if (!priorIds) return null;
      if (dataValue(progressed, 'mode') !== 'dungeon') return priorIds;
      if (!TrustedCombatContent ||
          typeof TrustedCombatContent.getDungeon !== 'function') {
        return priorIds;
      }
      let dungeon;
      try {
        dungeon = TrustedCombatContent.getDungeon(
          dataValue(progressed, 'dungeonId')
        );
      } catch (error) {
        return null;
      }
      const waves = dungeon && dataValue(dungeon, 'waves');
      const waveIndex = dataValue(progressed, 'waveIndex');
      const wave = Array.isArray(waves) && nonNegativeInteger(waveIndex)
        ? waves[waveIndex]
        : null;
      const enemyIds = wave && dataValue(wave, 'enemyIds');
      if (Array.isArray(enemyIds) &&
          enemyIds.length >= 1 && enemyIds.length <= 4 &&
          enemyIds.every(function (id) {
            return typeof id === 'string' && id.length > 0;
          })) {
        return enemyIds.slice();
      }
      const enemyId = wave && dataValue(wave, 'enemyId');
      return typeof enemyId === 'string' ? [enemyId] : null;
    }

    function nextTeamSession(state, priorSession) {
      if (!teamCreateSession || !isTeamSession(priorSession)) return null;
      const progressed = activeSession(state);
      if (!isTeamSession(progressed)) return null;
      const mode = dataValue(progressed, 'mode');
      const enemyId = dataValue(progressed, 'enemyId');
      const loadoutId = dataValue(progressed, 'loadoutId');
      const enemyIds = nextTeamEnemyIds(progressed, priorSession);
      if (!enemyIds) return null;
      const sessionOptions = {
        mode: mode,
        loadoutId: loadoutId,
        rngState: state.rngState,
        waveIndex: dataValue(progressed, 'waveIndex'),
        waveDefeated: dataValue(progressed, 'waveDefeated')
      };
      const legacyOptions = {
        mode: mode,
        loadoutId: loadoutId,
        waveIndex: dataValue(progressed, 'waveIndex'),
        waveDefeated: dataValue(progressed, 'waveDefeated'),
        bossPhase: dataValue(progressed, 'bossPhase')
      };
      if (mode === 'region') {
        sessionOptions.regionId = dataValue(progressed, 'regionId');
        sessionOptions.enemyIds = enemyIds;
        legacyOptions.regionId = sessionOptions.regionId;
        legacyOptions.enemyId = enemyId;
      } else if (mode === 'dungeon') {
        sessionOptions.dungeonId = dataValue(progressed, 'dungeonId');
        sessionOptions.enemyIds = enemyIds;
        legacyOptions.dungeonId = sessionOptions.dungeonId;
      } else {
        return null;
      }
      let team;
      let legacy;
      try {
        team = teamCreateSession(state, sessionOptions);
        legacy = trustedCreateLegacySession(state, legacyOptions);
      } catch (error) {
        return null;
      }
      if (!isTeamSession(team) || !plainRecord(legacy)) return null;
      let allies;
      try {
        allies = cloneJson(dataValue(dataValue(priorSession, 'teams'), 'allies'));
      } catch (error) {
        return null;
      }
      if (!Array.isArray(allies)) return null;
      const next = Object.assign({}, legacy, team);
      next.teams = {
        allies: allies,
        enemies: dataValue(dataValue(team, 'teams'), 'enemies')
      };
      [
        'actionKey', 'enemyId', 'waveIndex', 'waveDefeated',
        'bossPhase', 'intermissionTicks'
      ].forEach(function (key) {
        next[key] = dataValue(progressed, key);
      });
      next.enemy = dataValue(progressed, 'enemy');
      return synchronizeTeamCompatibility(next, next.enemy !== null);
    }

    function advanceTeamIntermission(state, report) {
      let candidate;
      let candidateReport;
      try {
        candidate = cloneJson(state);
        candidateReport = cloneJson(report);
      } catch (error) {
        return false;
      }
      const session = activeSession(candidate);
      const ticks = dataValue(session, 'intermissionTicks');
      if (!isTeamSession(session) || !nonNegativeInteger(ticks) || ticks < 1 ||
          dataValue(session, 'enemy') !== null) {
        return false;
      }
      finishCombatDuration(candidate);
      session.intermissionTicks = ticks - 1;
      if (session.intermissionTicks === 0) {
        const synchronized = synchronizeTeamCompatibility(session, true);
        if (!synchronized) return false;
        candidate.systems.combat.session = synchronized;
      }
      candidateReport.combat.ticks++;
      replaceRecord(state, candidate);
      replaceRecord(report, candidateReport);
      return true;
    }

    function completeCombatOnce(state, descriptor, helpers) {
      const session = activeSession(state);
      if (!session) {
        clearSession(state);
        return { stopReason: 'requirements_invalid' };
      }
      if (isTeamSession(session)) {
        if (!teamAdvanceTick || !applyTeamConsequences) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
        if (dataValue(session, 'enemy') === null &&
            nonNegativeInteger(dataValue(session, 'intermissionTicks')) &&
            dataValue(session, 'intermissionTicks') > 0) {
          if (!advanceTeamIntermission(state, helpers.report)) {
            clearSession(state);
            return { stopReason: 'requirements_invalid' };
          }
          return { stopReason: null };
        }
        let tick;
        if (isOfflineSource(helpers)) {
          try {
            tick = teamAdvanceTick(session, { rngState: state.rngState });
          } catch (error) {
            tick = null;
          }
        } else {
          tick = certifiedFrozenCall(
            teamAdvanceTick,
            trustedTeamAdvanceTick || teamAdvanceTick,
            [session, { rngState: state.rngState }]
          );
        }
        if (!tick || tick.ok !== true ||
            !isTeamSession(tick.session) ||
            !uint32(tick.rngState) ||
            ['continue', 'enemies_defeated', 'allies_defeated']
              .indexOf(tick.outcome) < 0 ||
            !plainRecord(tick.metrics) ||
            !Number.isFinite(dataValue(tick.metrics, 'damageDealt')) ||
            dataValue(tick.metrics, 'damageDealt') < 0 ||
            !Number.isFinite(dataValue(tick.metrics, 'damageTaken')) ||
            dataValue(tick.metrics, 'damageTaken') < 0) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
        const synchronized = synchronizeTeamCompatibility(tick.session, true);
        if (!synchronized) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
        finishCombatDuration(state);
        state.systems.combat.session = synchronized;
        state.rngState = tick.rngState;
        helpers.report.combat.ticks++;
        helpers.report.combat.damageDealt += tick.metrics.damageDealt || 0;
        helpers.report.combat.damageTaken += tick.metrics.damageTaken || 0;
        if (!isOfflineSource(helpers)) {
          appendCombatFxActions(state, synchronized, tick.events);
        }
        if (tick.outcome === 'continue') return { stopReason: null };
        const consequence = certifiedFrozenCall(
          applyTeamConsequences,
          trustedApplyTeamConsequences || applyTeamConsequences,
          [state, synchronized, tick.outcome, helpers.nowMs()]
        );
        if (!consequence || consequence.ok !== true ||
            !plainRecord(consequence.state)) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
        replaceRecord(state, consequence.state);
        if (tick.outcome === 'allies_defeated') {
          clearSession(state);
          return { stopReason: 'team_defeated' };
        }
        let candidate;
        let candidateReport;
        try {
          candidate = cloneJson(consequence.state);
          candidateReport = cloneJson(helpers.report);
        } catch (error) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
        const mode = dataValue(synchronized, 'mode');
        const dungeonId = mode === 'dungeon'
          ? dataValue(synchronized, 'dungeonId')
          : null;
        const progress = validateProgressTransition(
          certifiedDomainCall(
            afterEnemyDefeated,
            trustedAfterEnemyDefeated,
            [
              candidate,
              {
                createdAtMs: helpers.nowMs(),
                sectContext: EMPTY_SECT
              }
            ]
          )
        );
        if (!progress) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
        candidate = progress.state;
        if (progress.code === 'boss_phase') {
          const bossSession = nextTeamSession(candidate, synchronized);
          if (!bossSession) {
            clearSession(state);
            return { stopReason: 'requirements_invalid' };
          }
          candidate.systems.combat.session = bossSession;
          replaceRecord(state, candidate);
          replaceRecord(helpers.report, candidateReport);
          return { stopReason: null };
        }
        const pending = combatSystem(candidate).pendingLoot;
        const pendingLootId = pending &&
          typeof pending.id === 'string'
          ? pending.id
          : null;
        if (!reportProgress(
          candidateReport,
          progress,
          mode,
          pendingLootId,
          dungeonId
        )) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
        if (progress.warning) {
          addWarning(candidateReport, progress.warning);
        }
        if (progress.code === 'requirements_invalid') {
          candidateReport.combat.retreatReason =
            progress.warning || 'requirements_invalid';
          replaceRecord(state, candidate);
          replaceRecord(helpers.report, candidateReport);
          return { stopReason: 'requirements_invalid' };
        }
        const next = nextTeamSession(candidate, synchronized);
        if (!next) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
        candidate.systems.combat.session = next;
        replaceRecord(state, candidate);
        replaceRecord(helpers.report, candidateReport);
        return { stopReason: null };
      }
      if (session.enemy === null) {
        let candidate;
        let candidateReport;
        try {
          candidate = cloneJson(state);
          candidateReport = cloneJson(helpers.report);
        } catch (error) {
          candidate = null;
          candidateReport = null;
        }
        if (!plainRecord(candidate) || !plainRecord(candidateReport)) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
        finishCombatDuration(candidate);
        const intermission = validateIntermission(
          certifiedDomainCall(
            nextDungeonEnemy,
            trustedNextDungeonEnemy,
            [candidate]
          )
        );
        if (!intermission) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
        candidateReport.combat.ticks++;
        candidate = intermission.state;
        replaceRecord(state, candidate);
        replaceRecord(helpers.report, candidateReport);
        return { stopReason: null };
      }

      let tick;
      if (isOfflineSource(helpers)) {
        // Offline hot path: one engine call, no dual certification / deep
        // canonical clones. Semantics still come from the same advanceTick.
        try {
          tick = advanceTick(
            session,
            {
              playerInventory: state.player.inventory,
              rngState: state.rngState
            }
          );
        } catch (error) {
          tick = null;
        }
        if (!tick ||
            tick.ok !== true ||
            TICK_OUTCOMES.indexOf(tick.outcome) < 0 ||
            !uint32(tick.rngState) ||
            !tick.session ||
            !tick.playerInventory ||
            !tick.gains ||
            !tick.costs ||
            !tick.metrics) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
      } else {
        tick = certifiedFrozenCall(
          advanceTick,
          trustedAdvanceTick,
          [
            session,
            {
              playerInventory: state.player.inventory,
              rngState: state.rngState
            }
          ]
        );
        tick = validateTick(
          session,
          state.player.inventory,
          tick
        );
        if (!tick) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
      }
      if (tick.outcome === 'continue' &&
          Object.keys(tick.gains.techniqueXp || {}).length === 0) {
        if (!reportEngine(helpers.report, tick)) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
        finishCombatDuration(state);
        state.systems.combat.session = tick.session;
        state.player.inventory = tick.playerInventory;
        state.rngState = tick.rngState;
        if (!isOfflineSource(helpers)) {
          appendCombatFxActions(state, tick.session, tick.events);
        }
        return { stopReason: null };
      }

      let candidate;
      let candidateReport;
      try {
        candidate = cloneJson(state);
        candidateReport = cloneJson(helpers.report);
      } catch (error) {
        candidate = null;
        candidateReport = null;
      }
      if (!plainRecord(candidate) || !plainRecord(candidateReport)) {
        clearSession(state);
        return { stopReason: 'requirements_invalid' };
      }
      finishCombatDuration(candidate);
      if (!reportEngine(candidateReport, tick)) {
        clearSession(state);
        return { stopReason: 'requirements_invalid' };
      }
      candidate.systems.combat.session = tick.session;
      candidate.player.inventory = tick.playerInventory;
      candidate.rngState = tick.rngState;
      const xpState = grantActiveTechniqueXp(
        candidate,
        tick.gains.techniqueXp,
        candidateReport
      );
      if (!xpState) {
        clearSession(state);
        return { stopReason: 'requirements_invalid' };
      }
      candidate = xpState;
      if (!isOfflineSource(helpers)) {
        appendCombatFxActions(candidate, tick.session, tick.events);
      }

      if (tick.outcome === 'continue') {
        replaceRecord(state, candidate);
        replaceRecord(helpers.report, candidateReport);
        return { stopReason: null };
      }
      if (tick.outcome === 'supply_exhausted') {
        candidateReport.combat.retreatReason = 'supply_exhausted';
        clearSession(candidate);
        replaceRecord(state, candidate);
        replaceRecord(helpers.report, candidateReport);
        return { stopReason: 'supply_exhausted' };
      }
      if (tick.outcome === 'player_defeated') {
        const atMs = helpers.nowMs();
        const defeated = validateDefeat(
          certifiedDomainCall(
            applyDefeat,
            trustedApplyDefeat,
            [candidate, atMs]
          )
        );
        if (!defeated) {
          clearSession(state);
          return { stopReason: 'requirements_invalid' };
        }
        candidate = defeated.state;
        candidateReport.combat.retreatReason = 'player_defeated';
        replaceRecord(state, candidate);
        replaceRecord(helpers.report, candidateReport);
        return { stopReason: 'injured' };
      }

      const mode = session.mode;
      const dungeonId = mode === 'dungeon' &&
        typeof session.dungeonId === 'string'
        ? session.dungeonId
        : null;
      const progressAtMs = helpers.nowMs();
      const progress = validateProgressTransition(
        certifiedDomainCall(
          afterEnemyDefeated,
          trustedAfterEnemyDefeated,
          [
            candidate,
            {
              createdAtMs: progressAtMs,
              sectContext: EMPTY_SECT
            }
          ]
        )
      );
      if (!progress) {
        clearSession(state);
        return { stopReason: 'requirements_invalid' };
      }
      candidate = progress.state;
      if (progress.code === 'boss_phase') {
        replaceRecord(state, candidate);
        replaceRecord(helpers.report, candidateReport);
        return { stopReason: null };
      }
      const pending = combatSystem(candidate).pendingLoot;
      const pendingLootId = pending &&
        typeof pending.id === 'string'
        ? pending.id
        : null;
      if (!reportProgress(
        candidateReport,
        progress,
        mode,
        pendingLootId,
        dungeonId
      )) {
        clearSession(state);
        return { stopReason: 'requirements_invalid' };
      }
      if (progress.warning) {
        addWarning(candidateReport, progress.warning);
      }
      if (progress.code === 'requirements_invalid') {
        candidateReport.combat.retreatReason =
          progress.warning || 'requirements_invalid';
        replaceRecord(state, candidate);
        replaceRecord(helpers.report, candidateReport);
        return { stopReason: 'requirements_invalid' };
      }
      replaceRecord(state, candidate);
      replaceRecord(helpers.report, candidateReport);
      return { stopReason: null };
    }

    function completeCombat(state, descriptor, helpers) {
      if (!isOfflineSource(helpers)) {
        return completeCombatOnce(state, descriptor, helpers);
      }
      const endMs = helpers.nowMs();
      let result = { stopReason: null };
      let guard = 0;
      const maxBatch = OFFLINE_COMBAT_BATCH_TICKS + 2;
      while (
        state.current &&
        activeSession(state) &&
        finite(state.current.elapsed, 0) + 1e-12 >= TICK_SECONDS &&
        guard < maxBatch
      ) {
        guard++;
        const remainingElapsed = finite(state.current.elapsed, 0);
        const tickEndMs = endMs -
          Math.max(0, remainingElapsed - TICK_SECONDS) * 1000;
        const tickHelpers = {
          report: helpers.report,
          random: helpers.random,
          stopCurrent: helpers.stopCurrent,
          nowMs: function () {
            return tickEndMs;
          }
        };
        result = completeCombatOnce(state, descriptor, tickHelpers);
        if (result && result.stopReason != null) break;
      }
      return result;
    }

    const rules = Object.freeze({
      start: start,
      getAction: getAction,
      nextBoundary: function (state, descriptor, helpers) {
        if (selectedRules(descriptor) !== rules) {
          return baseRules.nextBoundary(state, descriptor, helpers);
        }
        return combatTimeBoundary(state, helpers);
      },
      elapse: function (state, descriptor, seconds, helpers) {
        if (selectedRules(descriptor) !== rules) {
          return baseRules.elapse(state, descriptor, seconds, helpers);
        }
        return elapseCombat(state, seconds);
      },
      inspect: function (state, descriptor) {
        if (selectedRules(descriptor) !== rules) {
          return baseRules.inspect(state, descriptor);
        }
        return combatInspection(state, descriptor);
      },
      complete: function (state, descriptor, helpers) {
        if (selectedRules(descriptor) !== rules) {
          return baseRules.complete(state, descriptor, helpers);
        }
        return completeCombat(state, descriptor, helpers);
      },
      random: function (state) {
        return baseRules.random(state);
      }
    });

    const lanes = Object.freeze(baseLanes.filter(function (lane) {
      return lane && lane.id !== injuryLane.id;
    }).concat([injuryLane]));
    return Object.freeze({ rules: rules, lanes: lanes });
  }

  return Object.freeze({
    create: create
  });
});
