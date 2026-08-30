/*
 * npc-spirit-pets.js —— NPC 灵宠轻量状态（世界事件 81 孵化 / 83 化形）
 * 不接玩家洞府 SpiritBeasts，不做背包。
 *
 * 约束：
 *   - 81 仅在无灵宠时孵化；已有幼体/化形则拒绝
 *   - 83 仅在幼体阶段化形；已化形不可再化形，无宠不可凭空化形
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory()
    : factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.NpcSpiritPets = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const YOUNG_PETS = Object.freeze(['幼龙', '雏凤']);
  const PET_FORMS = Object.freeze(['龙君', '龙女', '凤君', '凤女']);

  function randomOf(list, random) {
    if (!list || !list.length) return null;
    const roll = typeof random === 'function' ? random() : Math.random();
    return list[Math.floor(roll * list.length) % list.length];
  }

  function speciesOfYoung(youngName) {
    if (youngName === '雏凤') return 'phoenix';
    return 'dragon';
  }

  function formForSpecies(species, random) {
    if (species === 'phoenix') {
      return randomOf(['凤君', '凤女'], random) || '凤君';
    }
    return randomOf(['龙君', '龙女'], random) || '龙君';
  }

  function normalizePet(raw) {
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
      bondedAtMonth: Number.isFinite(raw.bondedAtMonth)
        ? Math.floor(raw.bondedAtMonth)
        : 0
    };
  }

  function canHatch(person) {
    if (!person || person.status === 'dead') return false;
    const pet = normalizePet(person.spiritPet);
    return !pet;
  }

  function canForm(person) {
    if (!person || person.status === 'dead') return false;
    const pet = normalizePet(person.spiritPet);
    return !!(pet && pet.stage === 'young');
  }

  function hatchPet(person, options) {
    if (!canHatch(person)) return null;
    const opts = options || {};
    const youngName = typeof opts.youngName === 'string' && opts.youngName
      ? opts.youngName
      : (randomOf(YOUNG_PETS, opts.random) || '幼龙');
    const pet = {
      stage: 'young',
      youngName: youngName,
      formName: null,
      speciesHint: opts.speciesHint || speciesOfYoung(youngName),
      bondedAtMonth: Number.isFinite(opts.bondedAtMonth)
        ? Math.floor(opts.bondedAtMonth)
        : 0
    };
    person.spiritPet = pet;
    return pet;
  }

  function formPet(person, options) {
    if (!canForm(person)) return null;
    const opts = options || {};
    const pet = normalizePet(person.spiritPet);
    if (!pet) return null;
    const formName = typeof opts.formName === 'string' && opts.formName
      ? opts.formName
      : formForSpecies(pet.speciesHint, opts.random);
    pet.stage = 'formed';
    pet.formName = formName;
    person.spiritPet = pet;
    return pet;
  }

  return Object.freeze({
    YOUNG_PETS: YOUNG_PETS,
    PET_FORMS: PET_FORMS,
    normalizePet: normalizePet,
    canHatch: canHatch,
    canForm: canForm,
    hatchPet: hatchPet,
    formPet: formPet
  });
});
