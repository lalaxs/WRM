(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.NpcCombatConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function safeId(value) {
    return typeof value === 'string' &&
      /^(?!__proto__$)(?!prototype$)(?!constructor$)[A-Za-z0-9._:-]{1,128}$/.test(value)
      ? value
      : null;
  }
  function profileOf(state, npcId) {
    const npc = state && state.systems && state.systems.npcs &&
      state.systems.npcs.records && state.systems.npcs.records[npcId];
    return npc && npc.combatProfile ? { npc: npc, profile: npc.combatProfile } : null;
  }
  function failure(code, model) {
    return { ok: false, code: code, state: model, result: null };
  }
  function uniquePush(list, value, limit) {
    if (list.indexOf(value) < 0) list.push(value);
    while (list.length > limit) list.shift();
  }
  function defaultProfileForNpc(npc) {
    const tags = [];
    if (npc && npc.sectId === 'baicao-valley') tags.push('heal', 'dan', 'wood');
    if (npc && npc.sectId === 'taixuan-sword') tags.push('damage', 'sword');
    return {
      preferenceTags: tags,
      equipment: { weapon: null, armor: null, accessory: null },
      activeTechniques: [],
      passiveTechniques: [],
      supplies: { food: null, pill: null, talisman: null },
      sourceEvents: []
    };
  }
  function applyConfigEvent(model, npcId, event) {
    const id = safeId(npcId);
    const eventId = event && safeId(event.id);
    if (!id || !eventId || !event || typeof event !== 'object') {
      return failure('invalid_event', model);
    }
    const state = clone(model);
    const parts = profileOf(state, id);
    if (!parts) return failure('unknown_npc', model);
    const profile = parts.profile;
    if (event.type === 'adoptTechnique') {
      const techniqueId = safeId(event.techniqueId);
      if (!techniqueId) return failure('invalid_technique', model);
      const slot = {
        techniqueId: techniqueId,
        level: Math.max(1, Math.min(20, Math.floor(Number(event.level) || 1))),
        condition: { type: 'always' }
      };
      profile.activeTechniques = profile.activeTechniques.filter(function (entry) {
        return entry.techniqueId !== techniqueId;
      });
      profile.activeTechniques.unshift(slot);
      profile.activeTechniques = profile.activeTechniques.slice(0, 4);
    } else if (event.type === 'adoptEquipment') {
      const slotName = ['weapon', 'armor', 'accessory'].indexOf(event.slot) >= 0
        ? event.slot
        : null;
      if (!slotName || !event.item || typeof event.item !== 'object') {
        return failure('invalid_equipment', model);
      }
      profile.equipment[slotName] = clone(event.item);
    } else if (event.type === 'adoptSupply') {
      const supplySlot = ['food', 'pill', 'talisman'].indexOf(event.slot) >= 0
        ? event.slot
        : null;
      if (!supplySlot || !event.supply || typeof event.supply !== 'object') {
        return failure('invalid_supply', model);
      }
      profile.supplies[supplySlot] = clone(event.supply);
    } else {
      return failure('unknown_event_type', model);
    }
    (Array.isArray(event.preferenceTags) ? event.preferenceTags : []).forEach(function (tag) {
      if (typeof tag === 'string' && /^[A-Za-z][A-Za-z0-9]*$/.test(tag)) {
        uniquePush(profile.preferenceTags, tag, 12);
      }
    });
    uniquePush(profile.sourceEvents, eventId, 20);
    return {
      ok: true,
      code: 'ok',
      state: state,
      result: { npcId: id, sourceEventId: eventId }
    };
  }
  return Object.freeze({
    defaultProfileForNpc: defaultProfileForNpc,
    applyConfigEvent: applyConfigEvent
  });
});
