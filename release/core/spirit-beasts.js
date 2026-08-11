(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    let proxyDetector = null;
    try { proxyDetector = require('node:util').types.isProxy; } catch (error) {}
    module.exports = factory(
      require('../content/homestead.js'), require('./inventory.js'),
      require('./skill-progression.js'), require('./random.js'), proxyDetector
    );
  } else if (root) {
    root.SpiritBeasts = factory(root.HomesteadContent, root.Inventory,
      root.SkillProgression, root.GameRandom, null);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  HomesteadContent, Inventory, SkillProgression, GameRandom, proxyDetector
) {
  'use strict';

  const MAX_LEVEL = 99;
  const MAX_RNG_STATE = 0xFFFFFFFF;
  const ACTION_KEYS = Object.freeze(['mainAction', 'current']);
  const DOMAIN_KEYS = Object.freeze([
    'gathering', 'fishing', 'production', 'beastTraining', 'social'
  ]);

  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function define(target, key, value) { Object.defineProperty(target, key, { value, enumerable: true, configurable: true, writable: true }); }
  function isProxy(value) { try { return typeof proxyDetector === 'function' && proxyDetector(value); } catch (error) { return true; } }
  function record(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value) || isProxy(value)) return false;
      const proto = Object.getPrototypeOf(value);
      if (proto === null || proto === Object.prototype) return true;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'constructor');
      return !!descriptor && own(descriptor, 'value') &&
        typeof descriptor.value === 'function' &&
        descriptor.value.name === 'Object' &&
        Object.getPrototypeOf(proto) === null;
    } catch (error) { return false; }
  }
  function data(value, key) {
    try {
      if (!record(value) || !own(value, key)) return undefined;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && own(descriptor, 'value') ? descriptor.value : undefined;
    } catch (error) { return undefined; }
  }
  function strictArray(value) {
    if (!Array.isArray(value) || isProxy(value)) return null;
    const result = [];
    for (let index = 0; index < value.length; index++) {
      if (!own(value, String(index))) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !own(descriptor, 'value')) return null;
      result.push(descriptor.value);
    }
    return result;
  }
  function clone(value, seen) {
    const ancestors = seen || new Set();
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return { ok: true, value };
    if (typeof value === 'number') return Number.isFinite(value) ? { ok: true, value } : { ok: false };
    if (typeof value !== 'object' || isProxy(value) || ancestors.has(value)) return { ok: false };
    const nextSeen = new Set(ancestors); nextSeen.add(value);
    if (Array.isArray(value)) {
      const raw = strictArray(value); if (!raw) return { ok: false };
      const result = [];
      for (let index = 0; index < raw.length; index++) { const copied = clone(raw[index], nextSeen); if (!copied.ok) return copied; result.push(copied.value); }
      return { ok: true, value: result };
    }
    if (!record(value)) return { ok: false };
    const result = {};
    let keys;
    try { keys = Reflect.ownKeys(value); } catch (error) { return { ok: false }; }
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index]; if (typeof key !== 'string') return { ok: false };
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || descriptor.enumerable !== true || !own(descriptor, 'value')) return { ok: false };
      const copied = clone(descriptor.value, nextSeen); if (!copied.ok) return copied;
      define(result, key, copied.value);
    }
    return { ok: true, value: result };
  }
  function cloneModel(model) {
    if (!record(model)) return { ok: false };
    const result = {};
    let keys;
    try { keys = Reflect.ownKeys(model); } catch (error) { return { ok: false }; }
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index]; if (typeof key !== 'string') return { ok: false };
      const descriptor = Object.getOwnPropertyDescriptor(model, key);
      if (!descriptor || descriptor.enumerable !== true || !own(descriptor, 'value')) return { ok: false };
      if (ACTION_KEYS.indexOf(key) >= 0) { define(result, key, descriptor.value); continue; }
      const copied = clone(descriptor.value); if (!copied.ok) return copied;
      define(result, key, copied.value);
    }
    return { ok: true, value: result };
  }
  function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.freeze(value); Object.keys(value).forEach((key) => freeze(value[key])); return value; }
  function safe(value, minimum) { return Number.isSafeInteger(value) && value >= (minimum == null ? 0 : minimum); }
  function validRng(value) { return Number.isInteger(value) && value > 0 && value <= MAX_RNG_STATE; }
  function validProgress(value) { const level = data(value, 'level'); const xp = data(value, 'xp'); return safe(level, 1) && level <= MAX_LEVEL && safe(xp, 0) && (level < MAX_LEVEL || xp === 0); }
  function canAddProgress(value, amount) { return validProgress(value) && (data(value, 'level') >= MAX_LEVEL || safe(data(value, 'xp') + amount, 0)); }
  function failure(code, state, rngState) { return { ok: false, code, state, rngState }; }
  function success(state, rngState, code, gains) { const result = { ok: true, code: code || 'ok', state, rngState }; if (gains) result.gains = gains; return result; }
  function dependencyValue(target, key) { try { const descriptor = target && Object.getOwnPropertyDescriptor(target, key); return descriptor && own(descriptor, 'value') ? descriptor.value : null; } catch (error) { return null; } }

  function snapshotContent(content) {
    const rawBeasts = dependencyValue(content, 'BEASTS');
    const rawTraits = dependencyValue(content, 'TRAITS');
    const rawGrowth = dependencyValue(content, 'GROWTH_TENDENCIES');
    const bySpecies = {}; const species = [];
    if (record(rawBeasts)) Object.keys(rawBeasts).forEach(function (id) {
      const source = data(rawBeasts, id); const assistance = data(source, 'assistance');
      const sourceSkillId = data(source, 'sourceSkillId'); const key = data(assistance, 'key'); const value = data(assistance, 'value'); const skillId = data(assistance, 'skillId');
      if (!record(source) || data(source, 'id') !== id || typeof sourceSkillId !== 'string' || typeof key !== 'string' || !Number.isFinite(value) || value < 0 || (skillId !== undefined && typeof skillId !== 'string')) return;
      species.push(id); define(bySpecies, id, freeze({ id, sourceSkillId, assistance: freeze({ key, value, skillId: typeof skillId === 'string' ? skillId : null }) }));
    });
    const traits = {}; const traitOrder = [];
    if (record(rawTraits)) Object.keys(rawTraits).forEach(function (id) { const source = data(rawTraits, id); const effect = data(source, 'effect'); if (!record(source) || data(source, 'id') !== id || !record(effect)) return; const keys = Object.keys(effect); if (keys.length !== 1 || !Number.isFinite(data(effect, keys[0]))) return; traitOrder.push(id); define(traits, id, freeze({ id, key: keys[0], value: data(effect, keys[0]) })); });
    const growth = {}; const growthOrder = [];
    if (record(rawGrowth)) Object.keys(rawGrowth).forEach(function (id) { const source = data(rawGrowth, id); const multiplier = data(source, 'assistanceMultiplier'); if (!record(source) || data(source, 'id') !== id || !Number.isFinite(multiplier) || multiplier < 0) return; growthOrder.push(id); define(growth, id, freeze({ id, assistanceMultiplier: multiplier })); });
    return freeze({ species: freeze(species), bySpecies: freeze(bySpecies), traitOrder: freeze(traitOrder), traits: freeze(traits), growthOrder: freeze(growthOrder), growth: freeze(growth) });
  }
  const content = snapshotContent(HomesteadContent);
  const inventoryApply = dependencyValue(Inventory, 'apply');
  const addSkillXp = dependencyValue(SkillProgression, 'addSkillXp');
  const addMasteryXp = dependencyValue(SkillProgression, 'addMasteryXp');
  const masteryExtraChance = dependencyValue(SkillProgression, 'masteryYieldOrRetentionChance');
  const randomNext = dependencyValue(GameRandom, 'next');

  function beastsOf(model) { const systems = data(model, 'systems'); const home = data(systems, 'homestead'); const beasts = data(home, 'beasts'); return record(beasts) ? beasts : null; }
  function playerOf(model) { const player = data(model, 'player'); return record(player) ? player : null; }
  function sourceSpecies(sourceSkillId) { for (let index = 0; index < content.species.length; index++) { const speciesId = content.species[index]; if (content.bySpecies[speciesId].sourceSkillId === sourceSkillId) return speciesId; } return null; }
  function beastXpNeed(level, growthId) { const multiplier = growthId === 'swift' ? 0.90 : growthId === 'spiritual' ? 1.10 : 1; return level >= 99 ? 0 : Math.round(30 * Math.pow(level, 1.5) * multiplier); }
  function addBeastXp(progress, amount, growthId) { let level = progress.level; let xp = progress.xp + amount; while (level < MAX_LEVEL) { const need = beastXpNeed(level, growthId); if (xp < need) break; xp -= need; level++; } return { level, xp: level >= MAX_LEVEL ? 0 : xp }; }
  function usableBeast(value) { return record(value) && typeof data(value, 'id') === 'string' && content.bySpecies[data(value, 'speciesId')] && validProgress(value) && content.traits[data(value, 'traitId')] && content.growth[data(value, 'growthId')]; }
  function tameProgress(player, speciesId) { const skills = data(player, 'skills'); const mastery = data(player, 'mastery'); const beastTaming = data(skills, 'beastTaming'); const species = data(data(mastery, 'beastTaming'), speciesId); return validProgress(beastTaming) && validProgress(species) ? { skill: beastTaming, mastery: species } : null; }
  function canCultivate(player, amount) { const current = data(player, 'xiwei'); return (current === undefined || safe(current, 0)) && (current === undefined || safe(current + amount, 0)); }
  function roll(seed) { if (!validRng(seed) || typeof randomNext !== 'function') return null; try { const value = randomNext(seed); return record(value) && validRng(data(value, 'seed')) && typeof data(value, 'value') === 'number' && Number.isFinite(data(value, 'value')) && data(value, 'value') >= 0 && data(value, 'value') < 1 ? { seed: data(value, 'seed'), value: data(value, 'value') } : null; } catch (error) { return null; } }
  function applyInventory(inventory, delta) { try { const result = inventoryApply(inventory, delta); if (!record(result) || typeof data(result, 'ok') !== 'boolean') return null; if (data(result, 'ok') === false) return { ok: false, code: typeof data(result, 'code') === 'string' ? data(result, 'code') : 'dependency_failure' }; return record(data(result, 'value')) ? { ok: true, value: data(result, 'value') } : null; } catch (error) { return null; } }
  function progressGain(fn, progress, amount) { try { const result = fn(progress, amount); return record(result) && validProgress(data(result, 'value')) ? data(result, 'value') : null; } catch (error) { return null; } }
  function indexed(order, value) { return order[Math.min(order.length - 1, Math.max(0, Math.floor(value * order.length)))]; }

  function tryEncounter(model, sourceSkillId, rngState) {
    const beasts = beastsOf(model); if (!beasts) return failure('invalid_model', model, rngState);
    const speciesId = sourceSpecies(sourceSkillId); if (!speciesId) return failure('invalid_source', model, rngState);
    if (!validRng(rngState)) return failure('invalid_rng', model, rngState);
    const roster = strictArray(data(beasts, 'roster')); const encounters = strictArray(data(beasts, 'encounters'));
    if (!roster || !encounters) return failure('invalid_model', model, rngState);
    if (roster.some((entry) => usableBeast(entry) && data(entry, 'speciesId') === speciesId)) return failure('already_owned', model, rngState);
    if (encounters.some((entry) => record(entry) && data(entry, 'speciesId') === speciesId)) return failure('already_pending', model, rngState);
    if (encounters.length >= 3) return failure('pending_cap', model, rngState);
    const drawn = roll(rngState); if (!drawn) return failure('invalid_rng', model, rngState);
    if (!(drawn.value < 0.01)) return success(model, drawn.seed, 'no_encounter');
    const copied = cloneModel(model); if (!copied.ok) return failure('invalid_model', model, drawn.seed);
    const next = beastsOf(copied.value); const nextId = data(next, 'nextId'); if (!safe(nextId, 1) || !safe(nextId + 1, 1)) return failure('invalid_model', model, drawn.seed);
    next.encounters.push({ id: 'encounter-' + nextId, speciesId, sourceSkillId }); next.nextId = nextId + 1;
    return success(copied.value, drawn.seed);
  }

  function completeTame(model, encounterId, rngState) {
    const beasts = beastsOf(model); const player = playerOf(model); if (!beasts || !player) return failure('invalid_model', model, rngState);
    if (!validRng(rngState)) return failure('invalid_rng', model, rngState);
    const encounters = strictArray(data(beasts, 'encounters')); const roster = strictArray(data(beasts, 'roster')); const inventory = data(player, 'inventory');
    const index = encounters && encounters.findIndex((entry) => record(entry) && data(entry, 'id') === encounterId && content.bySpecies[data(entry, 'speciesId')]);
    if (!encounters || !roster || index == null || index < 0) return failure('encounter_not_found', model, rngState);
    const encounter = encounters[index]; const speciesId = data(encounter, 'speciesId');
    if (roster.some((entry) => usableBeast(entry) && data(entry, 'speciesId') === speciesId)) return failure('already_owned', model, rngState);
    if (typeof inventoryApply !== 'function' || !record(inventory)) return failure('invalid_model', model, rngState);
    const available = data(inventory, 'stacks'); if (!record(available) || !safe(data(available, 'beastLureTalisman'), 1)) return failure('materials_exhausted', model, rngState);
    const tame = tameProgress(player, speciesId);
    if (!tame || !canAddProgress(tame.skill, 30) || !canAddProgress(tame.mastery, 15) || !canCultivate(player, 5)) return failure('invalid_progression', model, rngState);
    const traitRoll = roll(rngState); if (!traitRoll) return failure('invalid_rng', model, rngState); const growthRoll = roll(traitRoll.seed); if (!growthRoll) return failure('invalid_rng', model, traitRoll.seed);
    const copied = cloneModel(model); if (!copied.ok) return failure('invalid_model', model, growthRoll.seed);
    const nextPlayer = playerOf(copied.value); const applied = applyInventory(data(nextPlayer, 'inventory'), { beastLureTalisman: -1 });
    if (!applied) return failure('dependency_failure', model, growthRoll.seed);
    if (!applied.ok) return failure(applied.code, model, growthRoll.seed);
    nextPlayer.inventory = applied.value;
    const progress = tameProgress(nextPlayer, speciesId); const skillGain = progressGain(addSkillXp, progress.skill, 30); const masteryGain = progressGain(addMasteryXp, progress.mastery, 15);
    if (!skillGain || !masteryGain) return failure('dependency_failure', model, growthRoll.seed);
    nextPlayer.skills.beastTaming = skillGain; nextPlayer.mastery.beastTaming[speciesId] = masteryGain; nextPlayer.xiwei = (data(nextPlayer, 'xiwei') || 0) + 5;
    const next = beastsOf(copied.value); const nextId = data(next, 'nextId'); if (!safe(nextId, 1) || !safe(nextId + 1, 1)) return failure('invalid_model', model, growthRoll.seed);
    next.encounters.splice(index, 1); next.roster.push({ id: 'beast-' + nextId, speciesId, level: 1, xp: 0, traitId: indexed(content.traitOrder, traitRoll.value), growthId: indexed(content.growthOrder, growthRoll.value) }); next.nextId = nextId + 1;
    return success(copied.value, growthRoll.seed, 'ok', { skillXp: { beastTaming: 30 }, masteryXp: { ['beastTaming:' + speciesId]: 15 }, cultivation: 5 });
  }

  function bonus(value, key, maximum) { const amount = data(value, key); return typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 ? Math.min(maximum, amount) : 0; }
  function completeTraining(model, beastId, rngState, bonuses) {
    const beasts = beastsOf(model); const player = playerOf(model); if (!beasts || !player) return failure('invalid_model', model, rngState);
    if (!validRng(rngState)) return failure('invalid_rng', model, rngState);
    const roster = strictArray(data(beasts, 'roster')); const inventory = data(player, 'inventory'); const index = roster && roster.findIndex((entry) => usableBeast(entry) && data(entry, 'id') === beastId);
    if (!roster || index == null || index < 0) return failure('beast_not_found', model, rngState);
    const beast = roster[index]; const speciesId = data(beast, 'speciesId'); const stacks = data(inventory, 'stacks');
    if (typeof inventoryApply !== 'function' || !record(inventory)) return failure('invalid_model', model, rngState);
    if (!record(stacks) || !safe(data(stacks, 'beastFeed'), 1)) return failure('materials_exhausted', model, rngState);
    const training = tameProgress(player, speciesId);
    const base = Math.floor(10 * (1 + bonus(bonuses, 'beastTrainingXpBonus', 0.50)));
    if (!training || !canAddProgress(training.skill, 10) || !canAddProgress(training.mastery, 5) || !safe(data(beast, 'xp') + base + 10, 0) || !canCultivate(player, 2) || typeof masteryExtraChance !== 'function') return failure('invalid_progression', model, rngState);
    const drawn = roll(rngState); if (!drawn) return failure('invalid_rng', model, rngState);
    const copied = cloneModel(model); if (!copied.ok) return failure('invalid_model', model, drawn.seed);
    const nextPlayer = playerOf(copied.value); const applied = applyInventory(data(nextPlayer, 'inventory'), { beastFeed: -1 });
    if (!applied) return failure('dependency_failure', model, drawn.seed);
    if (!applied.ok) return failure(applied.code, model, drawn.seed);
    nextPlayer.inventory = applied.value;
    let chance; try { chance = masteryExtraChance(training.mastery.level); } catch (error) { return failure('dependency_failure', model, drawn.seed); }
    if (typeof chance !== 'number' || !Number.isFinite(chance) || chance < 0 || chance > 1) return failure('dependency_failure', model, drawn.seed);
    const next = beastsOf(copied.value); const nextBeast = next.roster[index]; const extra = drawn.value < chance ? 10 : 0;
    const beastGain = addBeastXp(nextBeast, base + extra, nextBeast.growthId); nextBeast.level = beastGain.level; nextBeast.xp = beastGain.xp;
    const progress = tameProgress(nextPlayer, speciesId); const skillGain = progressGain(addSkillXp, progress.skill, 10); const masteryGain = progressGain(addMasteryXp, progress.mastery, 5);
    if (!skillGain || !masteryGain) return failure('dependency_failure', model, drawn.seed);
    nextPlayer.skills.beastTaming = skillGain; nextPlayer.mastery.beastTaming[speciesId] = masteryGain; nextPlayer.xiwei = (data(nextPlayer, 'xiwei') || 0) + 2;
    return success(copied.value, drawn.seed, 'ok', { beastXp: base + extra, skillXp: { beastTaming: 10 }, masteryXp: { ['beastTaming:' + speciesId]: 5 }, cultivation: 2 });
  }

  function setActive(model, beastIdOrNull) {
    const beasts = beastsOf(model); if (!beasts) return failure('invalid_model', model, null);
    if (beastIdOrNull !== null && typeof beastIdOrNull !== 'string') return failure('invalid_beast', model, null);
    const roster = strictArray(data(beasts, 'roster')); if (!roster) return failure('invalid_model', model, null);
    if (beastIdOrNull !== null && !roster.some((entry) => usableBeast(entry) && data(entry, 'id') === beastIdOrNull)) return failure('beast_not_found', model, null);
    const copied = cloneModel(model); if (!copied.ok) return failure('invalid_model', model, null);
    beastsOf(copied.value).activeIds = beastIdOrNull === null ? [] : [beastIdOrNull]; return success(copied.value, null);
  }

  function emptyEffects() { const result = {}; DOMAIN_KEYS.forEach((domain) => define(result, domain, { global: {}, bySkill: {} })); return result; }
  function active(model) { const beasts = beastsOf(model); if (!beasts) return null; const ids = strictArray(data(beasts, 'activeIds')); const roster = strictArray(data(beasts, 'roster')); if (!ids || !roster || typeof ids[0] !== 'string') return null; return roster.find((entry) => usableBeast(entry) && data(entry, 'id') === ids[0]) || null; }
  function effects(model) {
    const result = emptyEffects(); const beast = active(model); if (!beast) return freeze(result);
    const trait = content.traits[beast.traitId]; const definition = content.bySpecies[beast.speciesId]; const multiplier = Math.min(1.50, 1 + (beast.level - 1) * 0.005) * content.growth[beast.growthId].assistanceMultiplier;
    if (trait) {
      const domain = trait.key === 'socialPositiveGainBonus' ? 'social' : trait.key === 'beastTrainingXpBonus' ? 'beastTraining' : trait.key === 'materialRetentionChance' ? 'production' : 'gathering';
      result[domain].global[trait.key] = trait.value;
    }
    const assistance = definition.assistance; const domain = assistance.key === 'fishRecoveryReduction' ? 'fishing' : assistance.key === 'craftingDurationReduction' ? 'production' : assistance.key === 'beastTrainingXpBonus' ? 'beastTraining' : 'gathering';
    const skillId = assistance.skillId || definition.sourceSkillId; result[domain].bySkill[skillId] = {}; result[domain].bySkill[skillId][assistance.key] = Number((assistance.value * multiplier).toPrecision(15));
    return freeze(result);
  }
  function query(model) {
    const beasts = beastsOf(model); const roster = beasts && strictArray(data(beasts, 'roster')) || []; const encounters = beasts && strictArray(data(beasts, 'encounters')) || []; const activeIds = beasts && strictArray(data(beasts, 'activeIds')) || [];
    return freeze({ encounters: encounters.filter(record).map((entry) => ({ id: data(entry, 'id'), speciesId: data(entry, 'speciesId'), sourceSkillId: data(entry, 'sourceSkillId') })), roster: roster.filter(usableBeast).map((entry) => ({ id: data(entry, 'id'), speciesId: data(entry, 'speciesId'), level: data(entry, 'level'), xp: data(entry, 'xp'), traitId: data(entry, 'traitId'), growthId: data(entry, 'growthId') })), activeIds: activeIds.filter((id, index) => index === 0 && typeof id === 'string'), effects: effects(model) });
  }
  return Object.freeze({ tryEncounter, completeTame, completeTraining, setActive, effects, query });
});
