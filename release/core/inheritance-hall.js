(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(require('../content/lifecycle.js'))
    : factory(root && root.LifecycleContent);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.InheritanceHall = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  LifecycleContent
) {
  'use strict';

  const KEYS = Object.freeze([
    'fullMasteryIds',
    'techniqueIds',
    'equipmentItemIds',
    'resourceItemIds'
  ]);

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

  function limits() {
    const row = LifecycleContent.INHERITANCE_LEVEL_ONE;
    return Object.freeze({
      fullMasteryIds: row.fullMasterySlots,
      techniqueIds: row.techniqueSlots,
      equipmentItemIds: row.equipmentSlots,
      resourceItemIds: row.resourceTypeSlots,
      resourcePercent: row.resourcePercent,
      spiritStonePercent: row.spiritStonePercent,
      premiumCurrencyPercent: row.premiumCurrencyPercent
    });
  }

  function cleanIds(value, maximum) {
    if (!Array.isArray(value)) return null;
    const seen = new Set();
    const result = [];
    for (let index = 0; index < value.length; index++) {
      const id = value[index];
      if (typeof id !== 'string' || !id || seen.has(id)) return null;
      seen.add(id);
      result.push(id);
    }
    return result.length <= maximum ? result : null;
  }

  function view(model) {
    const hall = model && model.systems && model.systems.homestead &&
      model.systems.homestead.inheritanceHall;
    const lineage = model && model.systems && model.systems.lineage;
    if (!hall || !lineage) return null;
    return Object.freeze({
      level: 1,
      limits: limits(),
      plan: Object.freeze(clone(hall.plan)),
      descendantCount: Object.keys(lineage.descendants || {}).length,
      completedLifeCount: Array.isArray(lineage.lives)
        ? lineage.lives.length
        : 0
    });
  }

  function setPlan(model, input) {
    const next = clone(model);
    if (!next || !input || typeof input !== 'object') {
      return { ok: false, code: 'invalid_plan', state: next || model };
    }
    const allowed = limits();
    const plan = {};
    for (let index = 0; index < KEYS.length; index++) {
      const key = KEYS[index];
      const ids = cleanIds(input[key] || [], allowed[key]);
      if (!ids) {
        return { ok: false, code: 'invalid_plan', state: clone(model) || model };
      }
      plan[key] = ids;
    }
    next.systems.homestead.inheritanceHall.plan = plan;
    return { ok: true, code: 'ok', state: next, value: clone(plan) };
  }

  return Object.freeze({
    limits: limits,
    view: view,
    setPlan: setPlan
  });
});
