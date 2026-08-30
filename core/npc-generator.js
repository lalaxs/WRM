(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./random.js'),
      require('../content/equipment.js'),
      require('./equipment.js'),
      require('./dns.js')
    )
    : factory(
      root && root.GameRandom,
      root && root.EquipmentContent,
      root && root.Equipment,
      root && root.Dns
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.NpcGenerator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  GameRandom,
  EquipmentContent,
  Equipment,
  Dns
) {
  'use strict';

  const MAX_UINT32 = 0xFFFFFFFF;
  const MAX_GENERATION_COUNT = 10000;
  const MAX_NPC_ID = Number.MAX_SAFE_INTEGER - 1;
  const NAME_ATTEMPTS = 4;
  const INVALID = Object.freeze({});
  const FORCED_GENDERS = Object.freeze([
    'female',
    'male',
    'nonbinary'
  ]);
  const APPEARANCE_SLOTS = Object.freeze([
    'build',
    'face',
    'hair',
    'feature'
  ]);

  function objectLike(value) {
    return value !== null &&
      (typeof value === 'object' || typeof value === 'function');
  }

  function sameDescriptor(left, right) {
    if (!left || !right) return left === right;
    const leftData = Object.prototype.hasOwnProperty.call(left, 'value');
    const rightData = Object.prototype.hasOwnProperty.call(right, 'value');
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
    if (!objectLike(value)) return INVALID;
    try {
      const first = Object.getOwnPropertyDescriptor(value, key);
      const second = Object.getOwnPropertyDescriptor(value, key);
      return sameDescriptor(first, second) ? first : INVALID;
    } catch (error) {
      return INVALID;
    }
  }

  function stableData(value, key) {
    const descriptor = stableDescriptor(value, key);
    return descriptor !== INVALID &&
      descriptor &&
      Object.prototype.hasOwnProperty.call(descriptor, 'value')
      ? descriptor.value
      : INVALID;
  }

  function stableArray(value) {
    if (!objectLike(value)) return null;
    let array;
    try {
      array = Array.isArray(value);
    } catch (error) {
      return null;
    }
    if (!array) return null;
    const length = stableData(value, 'length');
    if (!Number.isSafeInteger(length) ||
        length < 0 ||
        length > MAX_GENERATION_COUNT) {
      return null;
    }
    const result = [];
    for (let index = 0; index < length; index++) {
      const entry = stableData(value, String(index));
      if (entry === INVALID) return null;
      result.push(entry);
    }
    return result;
  }

  function finiteNumber(value, minimum, maximum) {
    return typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= minimum &&
      value <= maximum
      ? value
      : null;
  }

  function integer(value, minimum, maximum) {
    return Number.isSafeInteger(value) &&
      value >= minimum &&
      value <= maximum
      ? value
      : null;
  }

  function nonemptyString(value) {
    return typeof value === 'string' && value.length > 0
      ? value
      : null;
  }

  function uniqueRows(owner, key, reader) {
    const input = stableArray(stableData(owner, key));
    if (!input || input.length === 0) return null;
    const result = [];
    const ids = new Set();
    for (let index = 0; index < input.length; index++) {
      const row = reader(input[index], index);
      if (!row || ids.has(row.id)) return null;
      ids.add(row.id);
      result.push(row);
    }
    return result;
  }

  function namedRow(value) {
    if (!objectLike(value)) return null;
    const id = nonemptyString(stableData(value, 'id'));
    const name = nonemptyString(stableData(value, 'name'));
    return id && name ? { id: id, name: name } : null;
  }

  function weightedNamedRow(value) {
    const row = namedRow(value);
    const weight = finiteNumber(stableData(value, 'weight'), 0, Infinity);
    if (!row || weight === null) return null;
    row.weight = weight;
    return row;
  }

  function realmRow(value) {
    if (!objectLike(value)) return null;
    const realmStage = integer(
      stableData(value, 'realmStage'),
      0,
      1000
    );
    const weight = finiteNumber(stableData(value, 'weight'), 0, Infinity);
    const lifespanMultiplier = finiteNumber(
      stableData(value, 'lifespanMultiplier'),
      Number.MIN_VALUE,
      Infinity
    );
    if (realmStage === null ||
        weight === null ||
        lifespanMultiplier === null) {
      return null;
    }
    return {
      id: 'realm-' + realmStage,
      realmStage: realmStage,
      weight: weight,
      lifespanMultiplier: lifespanMultiplier
    };
  }

  function appearanceRow(value) {
    const row = namedRow(value);
    const slot = nonemptyString(stableData(value, 'slot'));
    if (!row || !APPEARANCE_SLOTS.includes(slot)) return null;
    row.slot = slot;
    return row;
  }

  function regionRow(value) {
    return namedRow(value);
  }

  function sectRow(value) {
    const row = namedRow(value);
    const homeRegionId = nonemptyString(
      stableData(value, 'homeRegionId')
    );
    if (!row || !homeRegionId) return null;
    row.homeRegionId = homeRegionId;
    return row;
  }

  function spiritualRootRow(value) {
    const row = weightedNamedRow(value);
    if (!row) return null;
    const efficiencyMult = finiteNumber(
      stableData(value, 'efficiencyMult'),
      0.1,
      10
    );
    if (efficiencyMult === null) return null;
    row.efficiencyMult = efficiencyMult;
    const lgIndex = integer(stableData(value, 'lgIndex'), 0, 7);
    row.lgIndex = lgIndex == null ? 3 : lgIndex;
    const lgExp = integer(stableData(value, 'lgExp'), 1, 1000);
    if (lgExp != null) row.lgExp = lgExp;
    const traits = stableStringList(stableData(value, 'traits'));
    row.traits = traits || [];
    return row;
  }

  function positiveWeight(rows) {
    let total = 0;
    for (let index = 0; index < rows.length; index++) {
      total += rows[index].weight;
    }
    return Number.isFinite(total) && total > 0 ? total : null;
  }

  function readRules(generation) {
    const source = stableData(generation, 'GENERATION_RULES');
    if (!objectLike(source)) return null;
    const bootstrapCount = integer(
      stableData(source, 'bootstrapCount'),
      1,
      MAX_GENERATION_COUNT
    );
    const activeTarget = integer(
      stableData(source, 'activeTarget'),
      1,
      MAX_GENERATION_COUNT
    );
    const familyCount = integer(
      stableData(source, 'familyCount'),
      1,
      MAX_GENERATION_COUNT
    );
    const sectMembershipChance = finiteNumber(
      stableData(source, 'sectMembershipChance'),
      0,
      1
    );
    const lifespan = stableData(source, 'baseLifespanYears');
    const minimum = objectLike(lifespan)
      ? integer(stableData(lifespan, 'min'), 1, 1000000)
      : null;
    const maximum = objectLike(lifespan)
      ? integer(stableData(lifespan, 'max'), 1, 1000000)
      : null;
    if (bootstrapCount === null ||
        activeTarget === null ||
        familyCount === null ||
        sectMembershipChance === null ||
        minimum === null ||
        maximum === null ||
        minimum > maximum) {
      return null;
    }
    return {
      bootstrapCount: bootstrapCount,
      activeTarget: activeTarget,
      familyCount: familyCount,
      sectMembershipChance: sectMembershipChance,
      baseLifespanMin: minimum,
      baseLifespanMax: maximum
    };
  }

  function snapshotContent(content) {
    if (!objectLike(content)) return null;
    const regionsOwner = stableData(content, 'regions');
    const sectsOwner = stableData(content, 'sects');
    const generation = stableData(content, 'generation');
    if (!objectLike(regionsOwner) ||
        !objectLike(sectsOwner) ||
        !objectLike(generation)) {
      return null;
    }
    const regions = uniqueRows(regionsOwner, 'REGIONS', regionRow);
    const sects = uniqueRows(sectsOwner, 'SECTS', sectRow);
    const rules = readRules(generation);
    const realms = uniqueRows(
      generation,
      'REALM_WEIGHTS',
      realmRow
    );
    const genders = uniqueRows(generation, 'GENDERS', weightedNamedRow);
    const surnames = uniqueRows(generation, 'SURNAMES', namedRow);
    const givenNames = uniqueRows(
      generation,
      'GIVEN_NAME_COMPONENTS',
      namedRow
    );
    const appearance = uniqueRows(
      generation,
      'APPEARANCE_FEATURES',
      appearanceRow
    );
    const personalities = uniqueRows(
      generation,
      'PERSONALITY_PROFILES',
      weightedNamedRow
    );
    const values = uniqueRows(
      generation,
      'VALUE_PROFILES',
      weightedNamedRow
    );
    const talents = uniqueRows(
      generation,
      'TALENTS',
      weightedNamedRow
    );
    const spiritualRoots = uniqueRows(
      generation,
      'SPIRITUAL_ROOTS',
      spiritualRootRow
    );
    const principles = uniqueRows(
      generation,
      'ROMANCE_PRINCIPLES',
      weightedNamedRow
    );
    const daoHeartTraits = uniqueRows(
      generation,
      'DAO_HEART_TRAITS',
      weightedNamedRow
    );
    if (!regions ||
        !sects ||
        !rules ||
        !realms ||
        !genders ||
        !surnames ||
        !givenNames ||
        !appearance ||
        !personalities ||
        !values ||
        !talents ||
        !spiritualRoots ||
        !principles ||
        positiveWeight(realms) === null ||
        positiveWeight(genders) === null ||
        positiveWeight(personalities) === null ||
        positiveWeight(values) === null ||
        positiveWeight(talents) === null ||
        positiveWeight(spiritualRoots) === null ||
        positiveWeight(principles) === null ||
        (daoHeartTraits !== null && positiveWeight(daoHeartTraits) === null)) {
      return null;
    }
    if (realms.length !== 16 ||
        genders.length !== FORCED_GENDERS.length) {
      return null;
    }
    for (let realmIndex = 0;
        realmIndex < realms.length;
        realmIndex++) {
      if (realms[realmIndex].realmStage !== realmIndex ||
          (realmIndex > 0 &&
           realms[realmIndex].lifespanMultiplier <=
             realms[realmIndex - 1].lifespanMultiplier)) {
        return null;
      }
    }
    for (let genderIndex = 0;
        genderIndex < FORCED_GENDERS.length;
        genderIndex++) {
      if (genders[genderIndex].id !== FORCED_GENDERS[genderIndex]) {
        return null;
      }
    }
    const regionIds = new Set();
    for (let regionIndex = 0;
        regionIndex < regions.length;
        regionIndex++) {
      regionIds.add(regions[regionIndex].id);
    }
    for (let sectIndex = 0; sectIndex < sects.length; sectIndex++) {
      if (!regionIds.has(sects[sectIndex].homeRegionId)) return null;
    }
    const appearanceBySlot = {
      build: [],
      face: [],
      hair: [],
      feature: []
    };
    for (let appearanceIndex = 0;
        appearanceIndex < appearance.length;
        appearanceIndex++) {
      appearanceBySlot[appearance[appearanceIndex].slot].push(
        appearance[appearanceIndex]
      );
    }
    for (let slotIndex = 0;
        slotIndex < APPEARANCE_SLOTS.length;
        slotIndex++) {
      if (appearanceBySlot[APPEARANCE_SLOTS[slotIndex]].length === 0) {
        return null;
      }
    }
    return {
      regions: regions,
      sects: sects,
      rules: rules,
      realms: realms,
      genders: genders,
      surnames: surnames,
      givenNames: givenNames,
      appearanceBySlot: appearanceBySlot,
      personalities: personalities,
      values: values,
      talents: talents,
      spiritualRoots: spiritualRoots,
      principles: principles,
      daoHeartTraits: daoHeartTraits
    };
  }

  const randomNext = stableData(GameRandom, 'next');

  function validSeed(value) {
    return Number.isInteger(value) &&
      value > 0 &&
      value <= MAX_UINT32;
  }

  function draw(rngState) {
    if (typeof randomNext !== 'function' || !validSeed(rngState)) {
      return null;
    }
    let result;
    try {
      result = randomNext(rngState);
    } catch (error) {
      return null;
    }
    const seed = stableData(result, 'seed');
    const value = stableData(result, 'value');
    if (!validSeed(seed) ||
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0 ||
        value >= 1) {
      return null;
    }
    return { rngState: seed, value: value };
  }

  function chooseIndex(rows, rngState) {
    const rolled = draw(rngState);
    if (!rolled || !rows || rows.length === 0) return null;
    return {
      value: rows[Math.floor(rolled.value * rows.length)],
      rngState: rolled.rngState
    };
  }

  function chooseWeighted(rows, rngState) {
    const rolled = draw(rngState);
    const total = positiveWeight(rows || []);
    if (!rolled || total === null) return null;
    const point = rolled.value * total;
    let accumulated = 0;
    let fallback = null;
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      if (row.weight <= 0) continue;
      fallback = row;
      accumulated += row.weight;
      if (point < accumulated) {
        return { value: row, rngState: rolled.rngState };
      }
    }
    return fallback
      ? { value: fallback, rngState: rolled.rngState }
      : null;
  }

  // 抽 1~2 个道心标签：先抽主标签，再按 ~45% 概率抽次标签（不重复）。
  // 返回 { traits: [id, ...], rngState }；内容无标签池时返回空数组（不失败）。
  function chooseDaoHeartTraits(rows, rngState) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { traits: [], rngState: rngState };
    }
    const first = chooseWeighted(rows, rngState);
    if (!first) return null;
    const ids = [first.value.id];
    let state = first.rngState;
    const secondRoll = draw(state);
    if (secondRoll && secondRoll.value < 0.45) {
      state = secondRoll.rngState;
      const second = chooseWeighted(rows, state);
      if (second && second.value.id !== ids[0]) {
        ids.push(second.value.id);
        state = second.rngState;
      }
    }
    return { traits: ids, rngState: state };
  }

  function stableStringList(value) {
    const input = stableArray(value);
    if (!input) return null;
    const result = [];
    const seen = new Set();
    for (let index = 0; index < input.length; index++) {
      if (typeof input[index] !== 'string') return null;
      if (!seen.has(input[index])) {
        seen.add(input[index]);
        result.push(input[index]);
      }
    }
    return result;
  }

  function chooseName(content, rngState, usedNames, nextId) {
    let seed = rngState;
    let lastName = null;
    for (let attempt = 0; attempt < NAME_ATTEMPTS; attempt++) {
      const surname = chooseIndex(content.surnames, seed);
      if (!surname) return null;
      const first = chooseIndex(content.givenNames, surname.rngState);
      if (!first) return null;
      const second = chooseIndex(content.givenNames, first.rngState);
      if (!second) return null;
      seed = second.rngState;
      lastName = surname.value.name +
        first.value.name +
        second.value.name;
      if (!usedNames.has(lastName)) {
        return { value: lastName, rngState: seed };
      }
    }
    return {
      value: lastName + '·字行' + nextId,
      rngState: seed
    };
  }

  function findId(rows, id) {
    for (let index = 0; index < rows.length; index++) {
      if (rows[index].id === id) return rows[index];
    }
    return null;
  }

  function originBiography(region) {
    return [{
      type: 'origin',
      atAge: 0,
      regionId: region.id,
      text: '出生于' + region.name + '。'
    }];
  }

  function roundFinite(value) {
    return Math.round(value * 1000000) / 1000000;
  }

  // 对标：造人初始修为按与玩家同量级的需求表滚动（Dns.cultivationNeed）。
  const REALM_CULTIVATION_NEED = Object.freeze([
    100, 250, 450, 700, 1000, 1400, 1900, 2500, 3000,
    6000, 15000, 40000, 100000, 250000, 600000, 1500000, 0
  ]);

  function realmCultivationNeed(realmStage) {
    if (Dns && typeof Dns.cultivationNeed === 'function') {
      return Dns.cultivationNeed(realmStage);
    }
    const stage = Math.max(0, Math.floor(Number(realmStage) || 0));
    return REALM_CULTIVATION_NEED[stage] || 0;
  }

  function cultivationEfficiencyValue(realmStage, root, variance) {
    const stage = Math.max(0, Math.floor(Number(realmStage) || 0));
    const mult = root && Number.isFinite(root.efficiencyMult)
      ? root.efficiencyMult
      : 1;
    const roll = Number.isFinite(variance)
      ? Math.min(1, Math.max(0, variance))
      : 0.5;
    const base = 0.6 + stage * 1.8 + stage * stage * 1.6;
    return Math.round(base * mult * (0.85 + roll * 0.3) * 100) / 100;
  }

  function equipmentRealmOrder(realmStage) {
    if (realmStage <= 8) return 1;
    return Math.min(9, realmStage - 7);
  }

  function equipmentRealmBand(realmStage) {
    return [
      'qi',
      'foundation',
      'core',
      'nascent',
      'spirit',
      'void',
      'integration',
      'mahayana',
      'ascension'
    ][equipmentRealmOrder(realmStage) - 1];
  }

  function equipmentQuality(realmStage) {
    if (realmStage >= 14) return 'legendary';
    if (realmStage >= 11) return 'epic';
    if (realmStage >= 7) return 'rare';
    if (realmStage >= 3) return 'fine';
    return 'common';
  }

  function generateCombatEquipment(npcId, realmStage, rngState) {
    const equipment = {};
    const instances = [];
    const slots = EquipmentContent &&
      Array.isArray(EquipmentContent.SLOTS)
      ? EquipmentContent.SLOTS
      : [];
    const slotMeta = EquipmentContent && EquipmentContent.SLOT_META || {};
    const order = equipmentRealmOrder(realmStage);
    let seed = rngState;
    slots.forEach(function (slot) {
      equipment[slot] = null;
      const meta = slotMeta[slot];
      if (!meta || meta.unlockRealmOrder > order ||
          !Equipment || typeof Equipment.generate !== 'function') {
        return;
      }
      const generated = Equipment.generate({
        baseId: equipmentRealmBand(realmStage) + '-' + slot,
        quality: equipmentQuality(realmStage),
        instanceId: npcId + '-' + slot,
        source: {
          type: 'npc',
          sourceId: npcId,
          acquiredAt: 0
        },
        rngState: seed
      });
      if (!generated || !generated.ok) return;
      seed = generated.rngState;
      instances.push(generated.instance);
      equipment[slot] = generated.instance.instanceId;
    });
    return {
      value: {
        version: 1,
        instances: instances,
        equipment: equipment
      },
      rngState: seed
    };
  }

  function generateOne(request) {
    try {
      if (!objectLike(request)) return null;
      const nextId = integer(
        stableData(request, 'nextId'),
        1,
        MAX_NPC_ID
      );
      const initialRngState = stableData(request, 'rngState');
      const content = snapshotContent(stableData(request, 'content'));
      const usedNamesInput = stableStringList(
        stableData(request, 'usedNames')
      );
      if (nextId === null ||
          !validSeed(initialRngState) ||
          !content ||
          !usedNamesInput) {
        return null;
      }
      const usedNames = new Set(usedNamesInput);
      const name = chooseName(
        content,
        initialRngState,
        usedNames,
        nextId
      );
      if (!name) return null;
      let rngState = name.rngState;

      const genderRoll = chooseWeighted(content.genders, rngState);
      if (!genderRoll) return null;
      rngState = genderRoll.rngState;
      const forcedGender = nextId <= FORCED_GENDERS.length
        ? findId(content.genders, FORCED_GENDERS[nextId - 1])
        : null;
      const gender = forcedGender || genderRoll.value;

      const appearance = {};
      for (let slotIndex = 0;
          slotIndex < APPEARANCE_SLOTS.length;
          slotIndex++) {
        const slot = APPEARANCE_SLOTS[slotIndex];
        const rolledAppearance = chooseIndex(
          content.appearanceBySlot[slot],
          rngState
        );
        if (!rolledAppearance) return null;
        rngState = rolledAppearance.rngState;
        appearance[slot + 'Id'] = rolledAppearance.value.id;
      }

      const realm = chooseWeighted(content.realms, rngState);
      if (!realm) return null;
      rngState = realm.rngState;
      const lifespanRoll = draw(rngState);
      if (!lifespanRoll) return null;
      rngState = lifespanRoll.rngState;
      const lifespanSpan = content.rules.baseLifespanMax -
        content.rules.baseLifespanMin + 1;
      const baseLifespan = content.rules.baseLifespanMin +
        Math.floor(lifespanRoll.value * lifespanSpan);
      const lifespanYears = roundFinite(
        baseLifespan * realm.value.lifespanMultiplier
      );
      const ageRoll = draw(rngState);
      if (!ageRoll) return null;
      rngState = ageRoll.rngState;
      const maximumStartingAge = Math.max(
        18,
        Math.min(56, Math.floor(lifespanYears) - 1)
      );
      const ageYears = 18 + Math.floor(
        ageRoll.value * (maximumStartingAge - 18 + 1)
      );
      const cultivationRoll = draw(rngState);
      if (!cultivationRoll) return null;
      rngState = cultivationRoll.rngState;
      const need = realmCultivationNeed(realm.value.realmStage);
      const cultivation = need > 0
        ? Math.floor(cultivationRoll.value * need)
        : 0;

      const talent = chooseWeighted(content.talents, rngState);
      if (!talent) return null;
      rngState = talent.rngState;
      const spiritualRoot = chooseWeighted(content.spiritualRoots, rngState);
      if (!spiritualRoot) return null;
      rngState = spiritualRoot.rngState;
      const efficiencyRoll = draw(rngState);
      if (!efficiencyRoll) return null;
      rngState = efficiencyRoll.rngState;
      const cultivationEfficiency = cultivationEfficiencyValue(
        realm.value.realmStage,
        spiritualRoot.value,
        efficiencyRoll.value
      );
      const personality = chooseWeighted(
        content.personalities,
        rngState
      );
      if (!personality) return null;
      rngState = personality.rngState;
      const value = chooseWeighted(content.values, rngState);
      if (!value) return null;
      rngState = value.rngState;
      const principle = chooseWeighted(content.principles, rngState);
      if (!principle) return null;
      rngState = principle.rngState;
      const daoTraits = chooseDaoHeartTraits(content.daoHeartTraits, rngState);
      let traits = [];
      if (daoTraits) {
        traits = daoTraits.traits;
        rngState = daoTraits.rngState;
      }

      const ordinal = nextId - 1;
      const region = content.regions[ordinal % content.regions.length];
      const membershipWindow = 10;
      const memberSlots = Math.round(
        content.rules.sectMembershipChance * membershipWindow
      );
      const slot = ordinal % membershipWindow;
      let sectId = null;
      if (slot < memberSlots) {
        const cycle = Math.floor(ordinal / membershipWindow);
        const memberOrdinal = cycle * memberSlots + slot;
        sectId = content.sects[
          memberOrdinal % content.sects.length
        ].id;
      }
      const familyId = 'family-' +
        ((ordinal % content.rules.familyCount) + 1);
      const id = 'npc-' + nextId;
      const combatEquipment = generateCombatEquipment(
        id,
        realm.value.realmStage,
        rngState
      );
      rngState = combatEquipment.rngState;
      const npc = {
        id: id,
        identity: {
          name: name.value,
          gender: gender.id,
          appearance: {
            buildId: appearance.buildId,
            faceId: appearance.faceId,
            hairId: appearance.hairId,
            featureId: appearance.featureId
          }
        },
        ageYears: ageYears,
        ageRemainderSeconds: 0,
        lifespanYears: lifespanYears,
        realmStage: realm.value.realmStage,
        cultivation: cultivation,
        cultivationEfficiency: cultivationEfficiency,
        level_l: Dns && typeof Dns.majorLevel === 'function'
          ? Dns.majorLevel(realm.value.realmStage)
          : realm.value.realmStage,
        level_s: realm.value.realmStage <= 8 ? realm.value.realmStage : 0,
        exp1: cultivation,
        history: [],
        spiritualRootId: spiritualRoot.value.id,
        talentId: talent.value.id,
        personalityId: personality.value.id,
        valueProfileId: value.value.id,
        romancePrincipleId: principle.value.id,
        traits: traits.slice(),
        regionId: region.id,
        sectId: sectId,
        familyId: familyId,
        skills: {},
        techniques: [],
        combatEquipment: combatEquipment.value,
        inventorySummary: {
          wealthTier: 0,
          notableItemIds: []
        },
        biography: originBiography(region),
        keyEventIds: [],
        status: 'living',
        kin: {
          fa: null,
          mo: null,
          par: null,
          frs: [],
          ens: []
        },
        lastDetailedAt: 0,
        lastBackgroundAt: 0
      };
      return {
        npc: npc,
        nextId: nextId + 1,
        rngState: rngState
      };
    } catch (error) {
      return null;
    }
  }

  function bootstrap(request) {
    try {
      if (!objectLike(request)) return null;
      const initialRngState = stableData(request, 'rngState');
      const contentReference = stableData(request, 'content');
      const content = snapshotContent(contentReference);
      if (!validSeed(initialRngState) || !content) return null;
      const rawCount = stableData(request, 'count');
      const count = rawCount === INVALID || rawCount == null
        ? content.rules.bootstrapCount
        : integer(rawCount, 1, MAX_GENERATION_COUNT);
      if (count === null) return null;

      const records = {};
      const usedNames = [];
      const familyIds = [];
      const seenFamilies = new Set();
      let nextId = 1;
      let rngState = initialRngState;
      for (let index = 0; index < count; index++) {
        const generated = generateOne({
          nextId: nextId,
          rngState: rngState,
          usedNames: usedNames,
          content: contentReference
        });
        if (!generated) return null;
        records[generated.npc.id] = generated.npc;
        usedNames.push(generated.npc.identity.name);
        if (!seenFamilies.has(generated.npc.familyId)) {
          seenFamilies.add(generated.npc.familyId);
          familyIds.push(generated.npc.familyId);
        }
        nextId = generated.nextId;
        rngState = generated.rngState;
      }
      return {
        records: records,
        nextId: nextId,
        rngState: rngState,
        familyIds: familyIds
      };
    } catch (error) {
      return null;
    }
  }

  return Object.freeze({
    generateOne: generateOne,
    bootstrap: bootstrap
  });
});
