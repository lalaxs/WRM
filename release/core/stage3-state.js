(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./stage2-state.js'),
      require('../content/items.js'),
      require('../content/combat.js'),
      require('../content/techniques.js'),
      require('../content/realms.js'),
      require('../content/equipment.js'),
      require('./equipment.js')
    )
    : factory(
      root && root.Stage2State,
      root && root.ItemContent,
      root && root.CombatContent,
      root && root.TechniqueContent,
      root && root.RealmContent,
      root && root.EquipmentContent,
      root && root.Equipment
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Stage3State = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Stage2State,
  ItemContent,
  CombatContent,
  TechniqueContent,
  RealmContent,
  EquipmentContent,
  Equipment
) {
  'use strict';

  const MAX_TECHNIQUE_LEVEL = 20;
  const MAX_LOADOUTS = 5;
  const DEFAULT_LOADOUT_ID = 'loadout-1';
  const EQUIPMENT_SLOTS = Object.freeze([
    'weapon',
    'head',
    'robe',
    'bracer',
    'belt',
    'boots',
    'accessory',
    'artifact'
  ]);
  const RECOVERABLE_COUNTER_MAX = Math.floor(
    Number.MAX_SAFE_INTEGER / 2
  );
  const RECOVERY_WARNING = 'invalid_combat_session_recovered';
  const DERIVED_STAT_KEYS = Object.freeze([
    'maxHp',
    'maxQi',
    'attack',
    'defense',
    'accuracy',
    'evasion',
    'critChance',
    'attackIntervalTicks'
  ]);

  function isRecord(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      if (prototype === null) return true;
      if (Object.getPrototypeOf(prototype) !== null) return false;
      const constructor = Object.prototype.hasOwnProperty.call(
        prototype,
        'constructor'
      ) ? prototype.constructor : null;
      return typeof constructor === 'function' &&
        Function.prototype.toString.call(constructor) ===
          Function.prototype.toString.call(Object);
    } catch (error) {
      return false;
    }
  }

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

  const rewardPayloadValidator = (function () {
    let descriptor;
    try {
      descriptor = CombatContent &&
        Object.getOwnPropertyDescriptor(
          CombatContent,
          'validateRewardPayload'
        );
    } catch (error) {
      descriptor = null;
    }
    return descriptor && own(descriptor, 'value') &&
      typeof descriptor.value === 'function'
      ? descriptor.value
      : null;
  })();

  function combatContentValue(method, id) {
    try {
      if (!CombatContent || typeof CombatContent[method] !== 'function') {
        return null;
      }
      return CombatContent[method](id);
    } catch (error) {
      return null;
    }
  }

  function finiteNumber(value, fallback, minimum, maximum) {
    if (value == null) return fallback;
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(
      maximum == null ? Infinity : maximum,
      Math.max(minimum == null ? -Infinity : minimum, number)
    );
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

  function finiteInteger(value, fallback, minimum, maximum) {
    return Math.floor(finiteNumber(
      value,
      fallback,
      minimum,
      maximum == null ? Number.MAX_SAFE_INTEGER : maximum
    ));
  }

  function finiteAtLeast(value, minimum) {
    return typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= minimum;
  }

  function safeIntegerAtLeast(value, minimum) {
    return Number.isSafeInteger(value) && value >= minimum;
  }

  function exactDataKeys(record, expected) {
    if (!isRecord(record)) return false;
    let keys;
    try {
      keys = Reflect.ownKeys(record);
    } catch (error) {
      return false;
    }
    if (keys.length !== expected.length) return false;
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (typeof key !== 'string' || expected.indexOf(key) < 0) {
        return false;
      }
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(record, key);
      } catch (error) {
        return false;
      }
      if (!descriptor || descriptor.enumerable !== true ||
          !own(descriptor, 'value')) {
        return false;
      }
    }
    return expected.every(function (key) {
      return own(record, key);
    });
  }

  function dataPropertyValue(record, key) {
    if (!isRecord(record) || !own(record, key)) {
      return { exists: false, value: undefined };
    }
    try {
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      return descriptor && own(descriptor, 'value')
        ? { exists: true, value: descriptor.value }
        : { exists: true, value: undefined };
    } catch (error) {
      return { exists: true, value: undefined };
    }
  }

  function shallowDataRecord(record) {
    if (!isRecord(record)) return {};
    const result = {};
    let keys;
    try {
      keys = Reflect.ownKeys(record);
    } catch (error) {
      return result;
    }
    keys.forEach(function (key) {
      if (typeof key !== 'string') return;
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(record, key);
      } catch (error) {
        return;
      }
      if (descriptor && descriptor.enumerable === true &&
          own(descriptor, 'value')) {
        define(result, key, descriptor.value);
      }
    });
    return result;
  }

  function cleanId(value, fallback) {
    return typeof value === 'string' && value.trim().length > 0
      ? value
      : fallback;
  }

  function cleanString(value, fallback) {
    return typeof value === 'string' ? value : fallback;
  }

  function cloneJson(value, fallback) {
    if (value == null) return fallback;
    try {
      return JSON.parse(JSON.stringify(value, function (key, item) {
        if (typeof item === 'number' && !Number.isFinite(item)) return 0;
        return item;
      }));
    } catch (error) {
      return fallback;
    }
  }

  function defaultSupplies() {
    return {
      food: { itemId: null, triggerRatio: 0.5, stopWhenEmpty: false },
      pill: { itemId: null, triggerRatio: 0.3, stopWhenEmpty: false },
      talisman: {
        itemId: null,
        useAt: 'enemy_start',
        stopWhenEmpty: false
      }
    };
  }

  function defaultActiveSlot() {
    return { techniqueId: null, condition: { type: 'always' } };
  }

  function defaultLoadout() {
    return {
      id: DEFAULT_LOADOUT_ID,
      name: '方案一',
      equipment: {
        weapon: null,
        head: null,
        robe: null,
        bracer: null,
        belt: null,
        boots: null,
        accessory: null,
        artifact: null
      },
      activeTechniques: [
        defaultActiveSlot(),
        defaultActiveSlot(),
        defaultActiveSlot()
      ],
      passiveTechniques: [null, null, null],
      supplies: defaultSupplies()
    };
  }

  function defaults() {
    return {
      player: {
        techniques: { known: {} },
        combat: {
          injury: null,
          activeLoadoutId: DEFAULT_LOADOUT_ID,
          nextLoadoutId: 2,
          loadouts: [defaultLoadout()]
        },
        combatProgress: {
          enemyKills: {},
          regionKills: {},
          dungeonClears: {},
          firstClears: {},
          completedGates: {}
        },
        breakthrough: {
          realmId: 'qi-1',
          cultivation: 0,
          eventBuffs: []
        }
      },
      systems: {
        combat: {
          session: null,
          pendingLoot: null,
          nextLootId: 1
        }
      }
    };
  }

  function normalizeCondition(value) {
    const source = isRecord(value) ? value : {};
    switch (source.type) {
      case 'selfHpBelow':
      case 'enemyHpBelow':
        return {
          type: source.type,
          threshold: finiteNumber(source.threshold, 0.01, 0.01, 1)
        };
      case 'selfQiAbove':
        return {
          type: source.type,
          threshold: finiteNumber(source.threshold, 0, 0, 1)
        };
      case 'enemyHasStatus': {
        const statusId = cleanId(source.statusId, null);
        return statusId
          ? { type: source.type, statusId: statusId }
          : { type: 'always' };
      }
      case 'selfMissingBuff': {
        const buffId = cleanId(source.buffId, null);
        return buffId
          ? { type: source.type, buffId: buffId }
          : { type: 'always' };
      }
      case 'always':
      default:
        return { type: 'always' };
    }
  }

  function knownTechnique(id, kind) {
    const technique = cleanId(id, null)
      ? TechniqueContent.get(id)
      : null;
    return technique && (!kind || technique.kind === kind)
      ? technique.id
      : null;
  }

  function normalizeKnownTechniques(value) {
    const source = isRecord(value) ? value : {};
    const known = {};
    Object.keys(source).forEach(function (techniqueId) {
      const rawRecord = dataPropertyValue(source, techniqueId).value;
      if (!knownTechnique(techniqueId) || !isRecord(rawRecord)) {
        return;
      }
      const level = finiteInteger(
        dataPropertyValue(rawRecord, 'level').value,
        1,
        1,
        MAX_TECHNIQUE_LEVEL
      );
      let xp = finiteInteger(
        dataPropertyValue(rawRecord, 'xp').value,
        0,
        0,
        Number.MAX_SAFE_INTEGER
      );
      if (level >= MAX_TECHNIQUE_LEVEL) {
        xp = 0;
      } else {
        let needed = 0;
        try {
          needed = TechniqueContent &&
            typeof TechniqueContent.xpNeed === 'function'
            ? TechniqueContent.xpNeed(level, 1)
            : 0;
        } catch (error) {
          needed = 0;
        }
        xp = Number.isSafeInteger(needed) && needed > 0
          ? Math.min(xp, needed - 1)
          : 0;
      }
      define(known, techniqueId, { level: level, xp: xp });
    });
    return { known: known };
  }

  function inventoryEquipmentInstances(inventory) {
    return isRecord(inventory) &&
      isRecord(inventory.equipment) &&
      Array.isArray(inventory.equipment.instances)
      ? inventory.equipment.instances
      : [];
  }

  function inventoryEquipment(inventory, instanceId) {
    const instances = inventoryEquipmentInstances(inventory);
    for (let index = 0; index < instances.length; index += 1) {
      const instance = Equipment.normalizeInstance(instances[index]);
      if (instance && instance.instanceId === instanceId) return instance;
    }
    return null;
  }

  function legacyEquipmentInstance(inventory, itemId, slot) {
    const baseId = EquipmentContent.LEGACY_BASE_ALIASES[itemId];
    if (!baseId) return null;
    const instances = inventoryEquipmentInstances(inventory);
    for (let index = 0; index < instances.length; index += 1) {
      const instance = Equipment.normalizeInstance(instances[index]);
      const base = instance
        ? EquipmentContent.getBase(instance.baseId)
        : null;
      if (instance && base && base.slot === slot &&
          (
            instance.baseId === baseId ||
            instance.source.sourceId === itemId
          )) {
        return instance;
      }
    }
    return null;
  }

  function normalizeEquipment(value, inventory) {
    const source = isRecord(value) ? value : {};
    const result = {};
    EQUIPMENT_SLOTS.forEach(function (slot) {
      const rawReference = slot === 'robe' && source.robe == null
        ? source.armor
        : source[slot];
      const instanceId = cleanId(rawReference, null);
      let instance = instanceId
        ? inventoryEquipment(inventory, instanceId)
        : null;
      if (!instance && instanceId) {
        instance = legacyEquipmentInstance(inventory, instanceId, slot);
      }
      const base = instance
        ? EquipmentContent.getBase(instance.baseId)
        : null;
      result[slot] = base && base.slot === slot
        ? instance.instanceId
        : null;
    });
    return result;
  }

  function normalizeSupply(value, type, strict) {
    const source = isRecord(value) ? value : {};
    const fallbackRatio = type === 'food' ? 0.5 : 0.3;
    const rawItemId = source.itemId == null
      ? null
      : cleanId(source.itemId, null);
    const supply = rawItemId ? CombatContent.getSupply(rawItemId) : null;
    const validReference = rawItemId === null ||
      !!(supply && supply.type === type);
    const itemId = validReference ? rawItemId : null;
    const result = type === 'talisman'
      ? {
        itemId: itemId,
        useAt: source.useAt === 'enemy_start'
          ? 'enemy_start'
          : 'enemy_start',
        stopWhenEmpty: !!source.stopWhenEmpty
      }
      : {
        itemId: itemId,
        triggerRatio: finiteNumber(
          source.triggerRatio,
          fallbackRatio,
          0.05,
          0.95
        ),
        stopWhenEmpty: !!source.stopWhenEmpty
      };
    return {
      value: result,
      valid: !strict || validReference
    };
  }

  function normalizeSupplies(value, strict) {
    const source = isRecord(value) ? value : {};
    const food = normalizeSupply(source.food, 'food', strict);
    const pill = normalizeSupply(source.pill, 'pill', strict);
    const talisman = normalizeSupply(source.talisman, 'talisman', strict);
    return {
      value: {
        food: food.value,
        pill: pill.value,
        talisman: talisman.value
      },
      valid: food.valid && pill.valid && talisman.valid
    };
  }

  function normalizeActiveSlots(
    value,
    fixedLength,
    strict,
    learned,
    seen
  ) {
    const source = Array.isArray(value) ? value : [];
    const result = [];
    let valid = true;
    const length = fixedLength == null ? source.length : fixedLength;
    for (let index = 0; index < length; index++) {
      const slotIsRecord = isRecord(source[index]);
      const slot = slotIsRecord ? source[index] : {};
      if (strict && !slotIsRecord) valid = false;
      const rawId = slot.techniqueId == null
        ? null
        : cleanId(slot.techniqueId, null);
      const techniqueId = rawId
        ? knownTechnique(rawId, 'active')
        : null;
      const allowed = techniqueId &&
        (!learned || own(learned, techniqueId)) &&
        (!seen || !own(seen, techniqueId))
        ? techniqueId
        : null;
      if (strict && rawId !== null && !allowed) valid = false;
      if (allowed && seen) define(seen, allowed, true);
      result.push({
        techniqueId: allowed,
        condition: normalizeCondition(slot.condition)
      });
    }
    return { value: result, valid: valid };
  }

  function normalizePassiveSlots(
    value,
    fixedLength,
    strict,
    learned,
    seen
  ) {
    const source = Array.isArray(value) ? value : [];
    const result = [];
    let valid = true;
    const length = fixedLength == null ? source.length : fixedLength;
    for (let index = 0; index < length; index++) {
      if (strict &&
          source[index] !== null &&
          source[index] !== undefined &&
          typeof source[index] !== 'string') {
        valid = false;
      }
      const rawId = source[index] == null
        ? null
        : cleanId(source[index], null);
      const techniqueId = rawId
        ? knownTechnique(rawId, 'passive')
        : null;
      const allowed = techniqueId &&
        (!learned || own(learned, techniqueId)) &&
        (!seen || !own(seen, techniqueId))
        ? techniqueId
        : null;
      if (strict && rawId !== null && !allowed) valid = false;
      if (allowed && seen) define(seen, allowed, true);
      result.push(allowed);
    }
    return { value: result, valid: valid };
  }

  function loadoutNumber(id) {
    const match = /^loadout-([1-9][0-9]*)$/.exec(id || '');
    return match ? finiteInteger(match[1], 0, 0) : 0;
  }

  function normalizedLoadoutName(value) {
    if (typeof value !== 'string') return null;
    const name = value.trim();
    return name.length >= 1 && Array.from(name).length <= 12
      ? name
      : null;
  }

  function uniqueLoadoutName(preferred, index, names) {
    if (preferred && !own(names, preferred)) {
      define(names, preferred, true);
      return preferred;
    }
    let suffix = index + 1;
    let name = '方案' + suffix;
    while (own(names, name)) {
      suffix++;
      name = '方案' + suffix;
    }
    define(names, name, true);
    return name;
  }

  function normalizeLoadout(value, index, known, inventory, id, names) {
    if (!isRecord(value)) return null;
    const seen = {};
    const active = normalizeActiveSlots(
      value.activeTechniques,
      3,
      false,
      known,
      seen
    );
    const passive = normalizePassiveSlots(
      value.passiveTechniques,
      3,
      false,
      known,
      seen
    );
    return {
      id: id,
      name: uniqueLoadoutName(
        normalizedLoadoutName(value.name),
        index,
        names
      ),
      equipment: normalizeEquipment(value.equipment, inventory),
      activeTechniques: active.value,
      passiveTechniques: passive.value,
      supplies: normalizeSupplies(value.supplies, false).value
    };
  }

  function normalizeInjury(value) {
    if (!isRecord(value)) return null;
    let keys;
    try {
      keys = Reflect.ownKeys(value);
    } catch (error) {
      return null;
    }
    const hasExact = keys.indexOf('remainingSecondsExact') >= 0;
    const expected = hasExact
      ? ['id', 'remainingSeconds', 'remainingSecondsExact', 'totalSeconds']
      : ['id', 'remainingSeconds', 'totalSeconds'];
    if (keys.length !== expected.length ||
        keys.some(function (key) {
          return typeof key !== 'string' || expected.indexOf(key) < 0;
        })) {
      return null;
    }
    const values = {};
    for (let index = 0; index < expected.length; index++) {
      const key = expected[index];
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(value, key);
      } catch (error) {
        return null;
      }
      if (!descriptor || descriptor.enumerable !== true ||
          !own(descriptor, 'value')) {
        return null;
      }
      define(values, key, descriptor.value);
    }
    if (values.id !== 'severe-injury') return null;
    if (hasExact) {
      const exactParts = decimalPartsFromCanonical(
        values.remainingSecondsExact
      );
      if (!exactParts ||
          typeof values.remainingSeconds !== 'number' ||
          !Number.isFinite(values.remainingSeconds) ||
          values.remainingSeconds < 0 ||
          Object.is(values.remainingSeconds, -0) ||
          typeof values.totalSeconds !== 'number' ||
          !Number.isFinite(values.totalSeconds) ||
          values.totalSeconds < 0 ||
          Object.is(values.totalSeconds, -0) ||
          values.remainingSeconds > values.totalSeconds ||
          Number(values.remainingSecondsExact) !==
            values.remainingSeconds ||
          compareDecimalParts(
            exactParts,
            decimalPartsFromNumber(values.totalSeconds)
          ) > 0) {
        return null;
      }
      return {
        id: 'severe-injury',
        remainingSeconds: values.remainingSeconds,
        remainingSecondsExact: values.remainingSecondsExact,
        totalSeconds: values.totalSeconds
      };
    }
    const totalSeconds = finiteNumber(values.totalSeconds, 0, 0);
    const remainingSeconds = Math.min(
      totalSeconds,
      finiteNumber(values.remainingSeconds, 0, 0)
    );
    return {
      id: 'severe-injury',
      remainingSeconds: remainingSeconds,
      remainingSecondsExact: decimalStringFromNumber(remainingSeconds),
      totalSeconds: totalSeconds
    };
  }

  function normalizeCombatPlayer(value) {
    if (!isRecord(value)) return { value: null, valid: false };
    const buffs = normalizeJsonRecordResult(value.buffs);
    const statuses = normalizeCombatStatuses(value.statuses);
    const techniqueCooldowns = normalizeTechniqueCooldowns(
      value.techniqueCooldowns
    );
    const hp = value.hp;
    const maxHp = value.maxHp;
    const qi = value.qi;
    const maxQi = value.maxQi;
    const critChance = value.critChance;
    return {
      valid: isRecord(value.buffs) &&
        buffs.valid &&
        statuses.valid &&
        techniqueCooldowns.valid &&
        finiteAtLeast(hp, 0) &&
        finiteAtLeast(maxHp, 1) &&
        hp <= maxHp &&
        finiteAtLeast(qi, 0) &&
        finiteAtLeast(maxQi, 1) &&
        qi <= maxQi &&
        finiteAtLeast(value.attack, 1) &&
        finiteAtLeast(value.defense, 1) &&
        finiteAtLeast(value.accuracy, 0) &&
        finiteAtLeast(value.evasion, 0) &&
        finiteAtLeast(critChance, 0) &&
        critChance <= 0.95 &&
        safeIntegerAtLeast(value.attackIntervalTicks, 2) &&
        safeIntegerAtLeast(value.cooldownTicks, 0) &&
        finiteAtLeast(value.shield, 0),
      value: {
        hp: hp,
        maxHp: maxHp,
        qi: qi,
        maxQi: maxQi,
        attack: value.attack,
        defense: value.defense,
        accuracy: value.accuracy,
        evasion: value.evasion,
        critChance: critChance,
        attackIntervalTicks: value.attackIntervalTicks,
        cooldownTicks: value.cooldownTicks,
        shield: value.shield,
        buffs: buffs.value,
        statuses: statuses.value,
        techniqueCooldowns: techniqueCooldowns.value
      }
    };
  }

  function normalizeTechniqueCooldowns(value) {
    if (!isRecord(value)) return { value: {}, valid: false };
    const source = value;
    const result = {};
    let valid = true;
    Object.keys(source).forEach(function (techniqueId) {
      if (!knownTechnique(techniqueId, 'active') ||
          !safeIntegerAtLeast(source[techniqueId], 0)) {
        valid = false;
        return;
      }
      define(result, techniqueId, source[techniqueId]);
    });
    return { value: result, valid: valid };
  }

  function normalizeCombatStatuses(value) {
    if (!isRecord(value)) return { value: {}, valid: false };
    const result = {};
    const statusIds = Object.keys(value);
    for (let index = 0; index < statusIds.length; index++) {
      const statusId = statusIds[index];
      const status = value[statusId];
      if (statusId === 'shock') {
        if (!exactDataKeys(
          status,
          ['remainingTicks', 'skipNextAction']
        ) ||
            !safeIntegerAtLeast(status.remainingTicks, 1) ||
            typeof status.skipNextAction !== 'boolean') {
          return { value: {}, valid: false };
        }
      } else if (statusId === 'slow') {
        if (!exactDataKeys(
          status,
          ['remainingTicks', 'attackIntervalAdd']
        ) ||
            !safeIntegerAtLeast(status.remainingTicks, 1) ||
            status.attackIntervalAdd !== 2) {
          return { value: {}, valid: false };
        }
      } else if (statusId === 'haste') {
        if (!exactDataKeys(
          status,
          ['remainingTicks', 'attackIntervalReduction']
        ) ||
            !safeIntegerAtLeast(status.remainingTicks, 1) ||
            status.attackIntervalReduction !== 0.1) {
          return { value: {}, valid: false };
        }
      } else {
        return { value: {}, valid: false };
      }
      define(result, statusId, Object.assign({}, status));
    }
    return { value: result, valid: true };
  }

  function normalizeJsonValue(value, seen) {
    if (value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean') {
      return { ok: true, value: value };
    }
    if (typeof value === 'number') {
      return {
        ok: true,
        value: Number.isFinite(value) ? Math.max(0, value) : 0
      };
    }
    if (Array.isArray(value)) {
      if (seen.has(value)) return { ok: false, value: null };
      seen.add(value);
      const array = [];
      for (let index = 0; index < value.length; index++) {
        const item = normalizeJsonValue(value[index], seen);
        if (!item.ok) return { ok: false, value: null };
        array.push(item.value);
      }
      seen.delete(value);
      return { ok: true, value: array };
    }
    if (!isRecord(value) || seen.has(value)) {
      return { ok: false, value: null };
    }
    seen.add(value);
    const result = {};
    const keys = Object.keys(value);
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const item = normalizeJsonValue(value[key], seen);
      if (!item.ok) return { ok: false, value: null };
      define(result, key, item.value);
    }
    seen.delete(value);
    return { ok: true, value: result };
  }

  function normalizeJsonRecordResult(value) {
    if (value == null) return { value: {}, valid: true };
    if (!isRecord(value)) return { value: {}, valid: false };
    const normalized = normalizeJsonValue(value, new Set());
    return normalized.ok && isRecord(normalized.value)
      ? { value: normalized.value, valid: true }
      : { value: {}, valid: false };
  }

  function normalizeCombatEnemy(value, allowedEnemyIds) {
    if (value === null) return { value: null, valid: true };
    if (!isRecord(value)) return { value: null, valid: false };
    const id = cleanId(value.id, null);
    if (!id || !CombatContent.getEnemy(id) ||
        (allowedEnemyIds && !allowedEnemyIds.includes(id))) {
      return { value: null, valid: false };
    }
    const buffs = normalizeJsonRecordResult(value.buffs);
    const statuses = normalizeCombatStatuses(value.statuses);
    const hp = value.hp;
    const maxHp = value.maxHp;
    return {
      valid: isRecord(value.buffs) &&
        buffs.valid &&
        statuses.valid &&
        finiteAtLeast(hp, 0) &&
        finiteAtLeast(maxHp, 1) &&
        hp <= maxHp &&
        finiteAtLeast(value.attack, 0) &&
        finiteAtLeast(value.defense, 0) &&
        finiteAtLeast(value.accuracy, 0) &&
        finiteAtLeast(value.evasion, 0) &&
        safeIntegerAtLeast(value.attackIntervalTicks, 2) &&
        safeIntegerAtLeast(value.cooldownTicks, 0) &&
        safeIntegerAtLeast(value.phase, 0),
      value: {
        id: id,
        hp: hp,
        maxHp: maxHp,
        attack: value.attack,
        defense: value.defense,
        accuracy: value.accuracy,
        evasion: value.evasion,
        attackIntervalTicks: value.attackIntervalTicks,
        cooldownTicks: value.cooldownTicks,
        phase: value.phase,
        buffs: buffs.value,
        statuses: statuses.value
      }
    };
  }

  function normalizeActionKey(key) {
    if (typeof key !== 'string' || key.length === 0) return null;
    let match = /^combat:region:([^:]+):([^:]+)$/.exec(key);
    if (match) {
      const region = CombatContent.getRegion(match[1]);
      return region &&
        CombatContent.getEnemy(match[2]) &&
        region.enemyIds.includes(match[2])
        ? key
        : null;
    }
    match = /^combat:dungeon:([^:]+)$/.exec(key);
    return match && CombatContent.getDungeon(match[1]) ? key : null;
  }

  function normalizeSnapshotTechniques(value) {
    if (!isRecord(value)) return { value: {}, valid: false };
    const source = value;
    const result = {};
    let valid = true;
    Object.keys(source).forEach(function (techniqueId) {
      if (!knownTechnique(techniqueId)) {
        valid = false;
        return;
      }
      define(result, techniqueId, finiteInteger(
        source[techniqueId],
        1,
        1,
        MAX_TECHNIQUE_LEVEL
      ));
    });
    return { value: result, valid: valid };
  }

  function normalizeDerivedStats(value) {
    if (!isRecord(value)) return null;
    let keys;
    try {
      keys = Reflect.ownKeys(value);
    } catch (error) {
      return null;
    }
    if (keys.length !== DERIVED_STAT_KEYS.length) return null;
    const result = {};
    for (let index = 0; index < DERIVED_STAT_KEYS.length; index++) {
      const key = DERIVED_STAT_KEYS[index];
      if (!own(value, key)) return null;
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(value, key);
      } catch (error) {
        return null;
      }
      if (!descriptor || descriptor.enumerable !== true ||
          !own(descriptor, 'value') ||
          typeof descriptor.value !== 'number' ||
          !Number.isFinite(descriptor.value)) {
        return null;
      }
      const amount = descriptor.value;
      if ((key === 'maxHp' || key === 'maxQi' ||
          key === 'attack' || key === 'defense') && amount < 1) {
        return null;
      }
      if ((key === 'accuracy' || key === 'evasion') && amount < 0) {
        return null;
      }
      if (key === 'critChance' && (amount < 0 || amount > 0.95)) {
        return null;
      }
      if (key === 'attackIntervalTicks' &&
          (!Number.isSafeInteger(amount) || amount < 2)) {
        return null;
      }
      define(result, key, amount);
    }
    for (let index = 0; index < keys.length; index++) {
      if (typeof keys[index] !== 'string' ||
          DERIVED_STAT_KEYS.indexOf(keys[index]) < 0) {
        return null;
      }
    }
    return result;
  }

  function normalizeLastPlayerAction(value, snapshot, elapsedTicks) {
    if (value == null) return { value: null, valid: true };
    if (!exactDataKeys(value, ['id', 'slotIndex', 'tick'])) {
      return { value: null, valid: false };
    }
    const id = value.id;
    const slotIndex = value.slotIndex;
    const tick = value.tick;
    if (!safeIntegerAtLeast(tick, 0) || tick >= elapsedTicks) {
      return { value: null, valid: false };
    }
    if (id === 'normalAttack') {
      return slotIndex === null
        ? {
          value: { id: 'normalAttack', slotIndex: null, tick: tick },
          valid: true
        }
        : { value: null, valid: false };
    }
    if (!safeIntegerAtLeast(slotIndex, 0) ||
        slotIndex >= snapshot.activeTechniques.length ||
        snapshot.activeTechniques[slotIndex].techniqueId !== id ||
        !knownTechnique(id, 'active')) {
      return { value: null, valid: false };
    }
    return {
      value: { id: id, slotIndex: slotIndex, tick: tick },
      valid: true
    };
  }

  function normalizeSession(session) {
    if (!isRecord(session)) return null;
    const rawEnemy = session.enemy;
    const rawIntermissionTicks = session.intermissionTicks;
    if (!safeIntegerAtLeast(rawIntermissionTicks, 0) ||
        (rawEnemy === null
          ? rawIntermissionTicks === 0
          : (!isRecord(rawEnemy) ||
            rawIntermissionTicks !== 0 ||
            !finiteAtLeast(rawEnemy.hp, 0)))) {
      return null;
    }
    const mode = session.mode;
    let actionKey;
    let regionId = null;
    let enemyId = null;
    let dungeonId = null;
    let allowedEnemyIds;

    if (mode === 'region') {
      const region = combatContentValue('getRegion', session.regionId);
      const enemy = combatContentValue('getEnemy', session.enemyId);
      if (!region || !enemy ||
          !region.enemyIds.includes(session.enemyId) ||
          session.dungeonId !== null) {
        return null;
      }
      regionId = region.id;
      enemyId = enemy.id;
      allowedEnemyIds = [enemy.id];
      actionKey = 'combat:region:' + region.id + ':' + enemy.id;
    } else if (mode === 'dungeon') {
      const dungeon = combatContentValue('getDungeon', session.dungeonId);
      if (!dungeon) return null;
      dungeonId = dungeon.id;
      regionId = session.regionId == null ? null : session.regionId;
      if (regionId !== null &&
          (!combatContentValue('getRegion', regionId) ||
            regionId !== dungeon.regionId)) {
        return null;
      }
      allowedEnemyIds = dungeon.waves.map(function (wave) {
        return wave.enemyId;
      });
      enemyId = session.enemyId == null ? null : session.enemyId;
      if (enemyId !== null &&
          (!combatContentValue('getEnemy', enemyId) ||
            !allowedEnemyIds.includes(enemyId))) {
        return null;
      }
      actionKey = 'combat:dungeon:' + dungeon.id;
    } else {
      return null;
    }
    if (session.actionKey !== actionKey) return null;
    const waveIndex = session.waveIndex;
    const waveDefeated = session.waveDefeated;
    const bossPhase = session.bossPhase;
    if (!safeIntegerAtLeast(waveIndex, 0) ||
        !safeIntegerAtLeast(waveDefeated, 0) ||
        !safeIntegerAtLeast(bossPhase, 0) ||
        !safeIntegerAtLeast(session.intermissionTicks, 0) ||
        !safeIntegerAtLeast(session.elapsedTicks, 0) ||
        !finiteAtLeast(session.tickRemainderSeconds, 0) ||
        session.tickRemainderSeconds >= 0.25) {
      return null;
    }
    if (mode === 'region') {
      if (waveIndex !== 0 || waveDefeated !== 0 || bossPhase !== 0) {
        return null;
      }
    } else {
      const dungeon = combatContentValue('getDungeon', dungeonId);
      if (waveIndex >= dungeon.waves.length) return null;
      const wave = dungeon.waves[waveIndex];
      if (waveDefeated >= wave.count ||
          enemyId !== wave.enemyId ||
          (rawEnemy === null && bossPhase !== 0)) {
        return null;
      }
    }

    const loadoutId = cleanId(session.loadoutId, null);
    if (!loadoutId || !isRecord(session.loadoutSnapshot)) return null;
    const rawSnapshot = session.loadoutSnapshot;
    const techniqueLevels = normalizeSnapshotTechniques(
      rawSnapshot.techniqueLevels
    );
    const seenTechniques = {};
    const active = normalizeActiveSlots(
      rawSnapshot.activeTechniques,
      null,
      true,
      techniqueLevels.value,
      seenTechniques
    );
    const passive = normalizePassiveSlots(
      rawSnapshot.passiveTechniques,
      null,
      true,
      techniqueLevels.value,
      seenTechniques
    );
    const supplies = normalizeSupplies(rawSnapshot.supplies, true);
    const derivedStats = normalizeDerivedStats(rawSnapshot.derivedStats);
    const hasActiveBeast = rawSnapshot.hasActiveBeast;
    const player = normalizeCombatPlayer(session.player);
    const enemy = normalizeCombatEnemy(session.enemy, allowedEnemyIds);
    const lastPlayerAction = normalizeLastPlayerAction(
      session.lastPlayerAction,
      { activeTechniques: active.value },
      session.elapsedTicks
    );
    if (!active.valid ||
        !passive.valid ||
        !supplies.valid ||
        !techniqueLevels.valid ||
        !derivedStats ||
        typeof hasActiveBeast !== 'boolean' ||
        !player.valid ||
        !enemy.valid ||
        !lastPlayerAction.valid) {
      return null;
    }
    if (enemy.value &&
        (enemyId === null || enemy.value.id !== enemyId)) {
      return null;
    }
    if (enemyId !== null) {
      const enemyDefinition = combatContentValue('getEnemy', enemyId);
      if (!enemyDefinition) return null;
      const maxPhase = enemyDefinition.phases.length > 0
        ? enemyDefinition.phases.length - 1
        : 0;
      if (bossPhase > maxPhase ||
          (enemy.value && enemy.value.phase !== bossPhase)) {
        return null;
      }
    } else if (bossPhase !== 0) {
      return null;
    }

    const normalized = {
      mode: mode,
      actionKey: actionKey,
      regionId: regionId,
      enemyId: enemyId,
      dungeonId: dungeonId,
      waveIndex: waveIndex,
      waveDefeated: waveDefeated,
      bossPhase: bossPhase,
      intermissionTicks: session.intermissionTicks,
      elapsedTicks: session.elapsedTicks,
      tickRemainderSeconds: session.tickRemainderSeconds,
      lastPlayerAction: lastPlayerAction.value,
      loadoutId: loadoutId,
      loadoutSnapshot: {
        activeTechniques: active.value,
        passiveTechniques: passive.value,
        supplies: supplies.value,
        techniqueLevels: techniqueLevels.value,
        derivedStats: derivedStats,
        hasActiveBeast: hasActiveBeast
      },
      player: player.value,
      enemy: enemy.value
    };
    const teams = dataPropertyValue(session, 'teams').value;
    if (teams === undefined) return normalized;
    if (!isRecord(teams) || !Array.isArray(teams.allies) ||
        !Array.isArray(teams.enemies) || teams.allies.length < 1 ||
        teams.enemies.length < 1) {
      return null;
    }
    const copiedTeams = cloneJson(teams, null);
    if (!copiedTeams) return null;
    normalized.teams = copiedTeams;
    if (typeof session.dangerLevel === 'string') {
      normalized.dangerLevel = session.dangerLevel;
    }
    if (Number.isSafeInteger(session.rngStateAtStart) &&
        session.rngStateAtStart >= 0) {
      normalized.rngStateAtStart = session.rngStateAtStart;
    }
    return normalized;
  }

  function knownGateIds() {
    const result = {};
    RealmContent.TRANSITIONS.forEach(function (transition) {
      define(result, transition.gate.id, true);
    });
    return result;
  }

  const GATE_IDS = knownGateIds();

  function normalizeCountMap(value, getContent) {
    const source = isRecord(value) ? value : {};
    const result = {};
    Object.keys(source).forEach(function (id) {
      if (!getContent(id)) return;
      define(result, id, finiteInteger(
        source[id],
        0,
        0,
        RECOVERABLE_COUNTER_MAX
      ));
    });
    return result;
  }

  function normalizeTrueMap(value, getContent) {
    const source = isRecord(value) ? value : {};
    const result = {};
    Object.keys(source).forEach(function (id) {
      if (source[id] === true && getContent(id)) define(result, id, true);
    });
    return result;
  }

  function normalizeCombatProgress(value) {
    const source = isRecord(value) ? value : {};
    return {
      enemyKills: normalizeCountMap(
        source.enemyKills,
        CombatContent.getEnemy
      ),
      regionKills: normalizeCountMap(
        source.regionKills,
        CombatContent.getRegion
      ),
      dungeonClears: normalizeCountMap(
        source.dungeonClears,
        CombatContent.getDungeon
      ),
      firstClears: normalizeTrueMap(
        source.firstClears,
        CombatContent.getDungeon
      ),
      completedGates: normalizeTrueMap(
        source.completedGates,
        function (gateId) { return own(GATE_IDS, gateId); }
      )
    };
  }

  function realmIdFromLegacyStage(value) {
    const realms = Object.values(RealmContent.REALMS).slice().sort(
      function (left, right) { return left.index - right.index; }
    );
    const index = finiteInteger(value, 0, 0, realms.length - 1);
    return realms[index].id;
  }

  function normalizeEventBuffs(value) {
    const source = Array.isArray(value) ? value : [];
    const result = [];
    const byId = {};
    source.forEach(function (raw) {
      if (!isRecord(raw)) return;
      const id = cleanId(raw.id, null);
      if (!id) return;
      const record = {
        id: id,
        bonus: finiteNumber(raw.bonus, 0, 0, 1),
        usesRemaining: finiteInteger(raw.usesRemaining, 0, 0)
      };
      if (!own(byId, id)) {
        byId[id] = result.length;
        result.push(record);
      } else if (
        record.usesRemaining > result[byId[id]].usesRemaining
      ) {
        result[byId[id]] = record;
      }
    });
    return result;
  }

  function normalizeBreakthrough(value, legacyPlayer) {
    const source = isRecord(value) ? value : {};
    const legacy = isRecord(legacyPlayer) ? legacyPlayer : {};
    const realmId = RealmContent.getRealm(source.realmId)
      ? source.realmId
      : own(legacy, 'realmStage')
        ? realmIdFromLegacyStage(legacy.realmStage)
        : 'qi-1';
    return {
      realmId: realmId,
      cultivation: finiteNumber(
        own(source, 'cultivation')
          ? source.cultivation
          : legacy.xiwei,
        0,
        0
      ),
      eventBuffs: normalizeEventBuffs(source.eventBuffs)
    };
  }

  function nextAvailableLoadoutId(ids, startAt) {
    let number = Number.isSafeInteger(startAt) &&
      startAt >= 1 &&
      startAt <= RECOVERABLE_COUNTER_MAX
      ? startAt
      : 1;
    let id = 'loadout-' + number;
    while (own(ids, id) && number < RECOVERABLE_COUNTER_MAX) {
      number++;
      id = 'loadout-' + number;
    }
    return number <= RECOVERABLE_COUNTER_MAX ? id : null;
  }

  function normalizedLoadoutId(value, ids, nextNumber) {
    const preferred = typeof value === 'string'
      ? value.trim()
      : '';
    if (preferred.length > 0 &&
        preferred.length <= 64 &&
        !own(ids, preferred)) {
      return preferred;
    }
    return nextAvailableLoadoutId(ids, nextNumber);
  }

  function reconcileEquipmentBindings(inventory, loadouts) {
    if (!isRecord(inventory) ||
        !isRecord(inventory.stacks) ||
        !isRecord(inventory.bindings)) {
      return;
    }
    const bindings = {};
    const itemIds = Object.keys(inventory.stacks).sort();
    itemIds.forEach(function (itemId) {
      const source = isRecord(inventory.bindings[itemId])
        ? inventory.bindings[itemId]
        : {};
      const record = {
        equipment: 0,
        task: finiteInteger(source.task, 0, 0, inventory.stacks[itemId]),
        formation: finiteInteger(
          source.formation,
          0,
          0,
          inventory.stacks[itemId]
        )
      };
      const remaining = Math.max(
        0,
        inventory.stacks[itemId] - record.equipment
      );
      record.task = Math.min(record.task, remaining);
      record.formation = Math.min(
        record.formation,
        remaining - record.task
      );
      if (record.equipment + record.task + record.formation > 0) {
        define(bindings, itemId, record);
      }
    });
    inventory.bindings = bindings;
  }

  function normalizeCombat(value, known, inventory) {
    const source = isRecord(value) ? value : {};
    const rawLoadouts = Array.isArray(source.loadouts)
      ? source.loadouts
      : [];
    const loadouts = [];
    const ids = {};
    const names = {};
    let nextGeneratedNumber = 1;
    rawLoadouts.forEach(function (raw, index) {
      if (loadouts.length >= MAX_LOADOUTS || !isRecord(raw)) return;
      const id = normalizedLoadoutId(
        dataPropertyValue(raw, 'id').value,
        ids,
        nextGeneratedNumber
      );
      if (!id) return;
      const loadout = normalizeLoadout(
        raw,
        index,
        known,
        inventory,
        id,
        names
      );
      if (!loadout) return;
      define(ids, loadout.id, true);
      loadouts.push(loadout);
      nextGeneratedNumber = Math.max(
        nextGeneratedNumber,
        loadoutNumber(loadout.id) + 1
      );
    });
    if (loadouts.length === 0) {
      const fallback = defaultLoadout();
      loadouts.push(fallback);
      define(ids, fallback.id, true);
    }
    const highestId = loadouts.reduce(function (highest, loadout) {
      return Math.max(highest, loadoutNumber(loadout.id));
    }, 1);
    const requestedNext = finiteInteger(
      source.nextLoadoutId,
      2,
      2,
      Number.MAX_SAFE_INTEGER
    );
    const monotonicNext = highestId < RECOVERABLE_COUNTER_MAX
      ? Math.max(highestId + 1, requestedNext)
      : requestedNext;
    const preferredNext = monotonicNext <= RECOVERABLE_COUNTER_MAX &&
      !own(ids, 'loadout-' + monotonicNext)
      ? monotonicNext
      : null;
    const recoveredNextId = preferredNext === null
      ? nextAvailableLoadoutId(ids, 2)
      : 'loadout-' + preferredNext;
    const activeLoadoutId = cleanId(source.activeLoadoutId, null);
    const injury = dataPropertyValue(source, 'injury');
    const result = {
      injury: normalizeInjury(injury.value),
      activeLoadoutId: activeLoadoutId && own(ids, activeLoadoutId)
        ? activeLoadoutId
        : loadouts[0].id,
      nextLoadoutId: loadoutNumber(recoveredNextId) || 2,
      loadouts: loadouts
    };
    reconcileEquipmentBindings(inventory, loadouts);
    return result;
  }

  function normalizePendingLoot(value, nextLootId) {
    if (value === null || value === undefined) return null;
    if (!exactDataKeys(value, [
      'id', 'source', 'items', 'currency', 'createdAtMs'
    ])) {
      return null;
    }
    const id = value.id;
    const match = typeof id === 'string'
      ? /^combat-loot-([1-9][0-9]*)$/.exec(id)
      : null;
    const number = match ? Number(match[1]) : 0;
    if (!match ||
        !Number.isSafeInteger(number) ||
        number <= 0 ||
        number >= Number.MAX_SAFE_INTEGER ||
        nextLootId !== number + 1 ||
        typeof rewardPayloadValidator !== 'function') {
      return null;
    }
    let reward;
    try {
      reward = rewardPayloadValidator(
        value.source,
        value.items,
        value.currency
      );
    } catch (error) {
      return null;
    }
    if (!reward ||
        typeof value.createdAtMs !== 'number' ||
        !Number.isFinite(value.createdAtMs) ||
        value.createdAtMs < 0) {
      return null;
    }
    return {
      id: id,
      source: reward.source,
      items: reward.items,
      currency: reward.currency,
      createdAtMs: Object.is(value.createdAtMs, -0)
        ? 0
        : value.createdAtMs
    };
  }

  function lootNumber(value) {
    if (!value || typeof value.id !== 'string') return 0;
    const match = /^combat-loot-([1-9][0-9]*)$/.exec(value.id);
    return match ? finiteInteger(match[1], 0, 0) : 0;
  }

  function normalizeLootLog(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    for (let index = 0; index < value.length; index++) {
      const entry = value[index];
      if (!isRecord(entry)) continue;
      const enemyId = typeof entry.enemyId === 'string' ? entry.enemyId : '';
      const enemyName = typeof entry.enemyName === 'string'
        ? entry.enemyName
        : enemyId;
      const rank = typeof entry.rank === 'string' ? entry.rank : 'normal';
      const rawItems = isRecord(entry.items) ? entry.items : {};
      const items = {};
      Object.keys(rawItems).forEach(function (id) {
        const quantity = rawItems[id];
        if (Number.isFinite(quantity) &&
            quantity > 0 &&
            Number.isSafeInteger(quantity)) {
          items[id] = quantity;
        }
      });
      const currency = Number.isFinite(entry.currency) && entry.currency >= 0
        ? entry.currency
        : 0;
      const firstClear = entry.firstClear === true;
      const dungeonClear = entry.dungeonClear === true;
      const createdAtMs = Number.isFinite(entry.createdAtMs) &&
        entry.createdAtMs >= 0
        ? entry.createdAtMs
        : 0;
      const normalized = {
        enemyId: enemyId,
        enemyName: enemyName,
        rank: rank,
        items: items,
        currency: currency,
        firstClear: firstClear,
        dungeonClear: dungeonClear,
        createdAtMs: Object.is(createdAtMs, -0) ? 0 : createdAtMs
      };
      if (typeof entry.rankLabel === 'string') {
        normalized.rankLabel = entry.rankLabel;
      }
      out.push(normalized);
    }
    return out;
  }

  function warningReport(model, actionKey) {
    const atMs = finiteNumber(
      model && model.processedThroughMs,
      finiteNumber(model && model.savedAt, 0, 0),
      0
    );
    return {
      id: 'combat-session-recovered-' + atMs + '-' +
        (actionKey || 'none'),
      source: 'offline',
      fromMs: atMs,
      toMs: atMs,
      requestedSeconds: 0,
      mainActionSeconds: 0,
      cappedSeconds: 0,
      action: {
        key: actionKey || null,
        completed: 0,
        stopReason: null,
        stopAtMs: null
      },
      gains: {
        items: {},
        skillXp: {},
        masteryXp: {},
        cultivation: 0
      },
      costs: { items: {}, supplies: {} },
      levels: [],
      unlocks: [],
      passive: {
        fishRecovered: 0,
        farmCompleted: [],
        parallelCompleted: []
      },
      world: { ticks: 0, events: [] },
      warnings: [RECOVERY_WARNING]
    };
  }

  function appendRecoveryWarning(model, actionKey) {
    let reports;
    if (Array.isArray(model.pendingOfflineReports)) {
      reports = model.pendingOfflineReports;
    } else {
      if (!isRecord(model.pendingOfflineReport)) {
        model.pendingOfflineReport = { version: 1, reports: [] };
      }
      if (!Array.isArray(model.pendingOfflineReport.reports)) {
        model.pendingOfflineReport.reports = [];
      }
      reports = model.pendingOfflineReport.reports;
    }
    if (reports.length === 0) {
      reports.push(warningReport(model, actionKey));
      return;
    }
    if (!isRecord(reports[0])) reports[0] = warningReport(model, actionKey);
    reports[0].warnings = Array.isArray(reports[0].warnings)
      ? reports[0].warnings.filter(function (warning) {
        return typeof warning === 'string' && warning.length > 0;
      })
      : [];
    if (!reports[0].warnings.includes(RECOVERY_WARNING)) {
      reports[0].warnings.push(RECOVERY_WARNING);
    }
  }

  function normalize(model, options) {
    const source = isRecord(model) ? model : {};
    const baseSource = shallowDataRecord(source);
    const rawSystemsValue = dataPropertyValue(source, 'systems').value;
    const rawSystems = isRecord(rawSystemsValue) ? rawSystemsValue : {};
    const rawCombatSystemValue =
      dataPropertyValue(rawSystems, 'combat').value;
    const rawCombatSystem = isRecord(rawCombatSystemValue)
      ? rawCombatSystemValue
      : {};
    const baseSystems = shallowDataRecord(rawSystems);
    define(baseSystems, 'combat', {
      session: null,
      pendingLoot: null,
      nextLootId: 1
    });
    define(baseSource, 'systems', baseSystems);
    const basePlayerValue = dataPropertyValue(source, 'player').value;
    if (isRecord(basePlayerValue)) {
      const basePlayer = shallowDataRecord(basePlayerValue);
      const baseCombatValue = dataPropertyValue(
        basePlayerValue,
        'combat'
      ).value;
      if (isRecord(baseCombatValue)) {
        const baseCombat = shallowDataRecord(baseCombatValue);
        const rawInjury = dataPropertyValue(
          baseCombatValue,
          'injury'
        ).value;
        define(baseCombat, 'injury', normalizeInjury(rawInjury));
        define(basePlayer, 'combat', baseCombat);
      }
      define(baseSource, 'player', basePlayer);
    }
    const clean = Stage2State.normalize(baseSource);
    const rawNextLootId =
      dataPropertyValue(rawCombatSystem, 'nextLootId').value;
    const nextLootId = safeIntegerAtLeast(rawNextLootId, 1) &&
      rawNextLootId <= RECOVERABLE_COUNTER_MAX
      ? rawNextLootId
      : 1;
    const rawPendingLoot =
      dataPropertyValue(rawCombatSystem, 'pendingLoot').value;
    const pendingLoot = normalizePendingLoot(
      rawPendingLoot,
      nextLootId
    );
    const rawLootLog =
      dataPropertyValue(rawCombatSystem, 'lootLog').value;
    const lootLog = normalizeLootLog(rawLootLog);
    clean.systems.combat = {
      session: null,
      pendingLoot: pendingLoot,
      nextLootId: pendingLoot ? lootNumber(pendingLoot) + 1 : nextLootId,
      lootLog: lootLog
    };

    const hasPlayer = source.player !== null;
    if (hasPlayer) {
      const rawPlayer = isRecord(source.player) ? source.player : {};
      clean.player.techniques = normalizeKnownTechniques(
        isRecord(rawPlayer.techniques) ? rawPlayer.techniques.known : null
      );
      clean.player.combat = normalizeCombat(
        rawPlayer.combat,
        clean.player.techniques.known,
        clean.player.inventory
      );
      clean.player.combatProgress = normalizeCombatProgress(
        rawPlayer.combatProgress
      );
      clean.player.breakthrough = normalizeBreakthrough(
        rawPlayer.breakthrough,
        rawPlayer
      );
      delete clean.player.realmStage;
      delete clean.player.xiwei;
      if (options && options.preserveLegacyFields) {
        clean.player.realmStage =
          RealmContent.getRealm(clean.player.breakthrough.realmId).index;
        clean.player.xiwei = clean.player.breakthrough.cultivation;
      }
    }

    const rawSession = dataPropertyValue(rawCombatSystem, 'session').value;
    let session = rawSession == null ? null : normalizeSession(rawSession);
    let recovered = rawSession != null && session === null;
    if (session && (!hasPlayer ||
        !clean.player.combat.loadouts.some(function (loadout) {
          return loadout.id === session.loadoutId;
        }))) {
      session = null;
      recovered = true;
    }
    const currentKey = isRecord(clean.current)
      ? clean.current.key
      : null;
    const combatCurrent = typeof currentKey === 'string' &&
      currentKey.indexOf('combat:') === 0;
    if (session &&
        (!combatCurrent || currentKey !== session.actionKey)) {
      session = null;
      recovered = true;
    }
    clean.systems.combat.session = session;
    if (recovered) {
      if (combatCurrent) clean.current = null;
      appendRecoveryWarning(
        clean,
        rawSession && rawSession.actionKey
          ? rawSession.actionKey
          : currentKey
      );
    } else if (combatCurrent && !session) {
      clean.current = null;
      appendRecoveryWarning(clean, currentKey);
    }
    return clean;
  }

  function migrateV3(model) {
    return normalize(cloneJson(model, {}));
  }

  return Object.freeze({
    defaults: defaults,
    normalize: normalize,
    migrateV3: migrateV3,
    normalizeSession: normalizeSession,
    normalizeActionKey: normalizeActionKey
  });
});
