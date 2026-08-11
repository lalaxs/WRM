(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./event-engine.js'),
      require('./npc-roster.js'),
      require('../content/regions.js'),
      require('../content/sects.js'),
      require('../content/equipment.js'),
      require('./equipment.js')
    )
    : factory(
      root && root.EventEngine,
      root && root.NpcRoster,
      root && root.RegionContent,
      root && root.SectContent,
      root && root.EquipmentContent,
      root && root.Equipment
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.NpcSimulation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  DefaultEventEngine,
  NpcRoster,
  RegionContent,
  SectContent,
  EquipmentContent,
  Equipment
) {
  'use strict';

  const YEAR_SECONDS = 12 * 60 * 60;
  const METRICS = Object.freeze([
    'affection',
    'trust',
    'romanticAttachment',
    'desire',
    'dependence',
    'loyalty',
    'jealousy',
    'resentment'
  ]);

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function nowSeconds(helpers) {
    return helpers && typeof helpers.nowSeconds === 'function'
      ? Math.max(0, finite(helpers.nowSeconds(), 0))
      : 0;
  }

  function random(helpers) {
    const value = helpers && typeof helpers.random === 'function'
      ? helpers.random()
      : 0;
    return Number.isFinite(value) && value >= 0 && value < 1 ? value : 0;
  }

  function records(model) {
    return model && model.systems && model.systems.npcs &&
      model.systems.npcs.records;
  }

  function reportChange(helpers, amount) {
    const world = helpers && helpers.report && helpers.report.world;
    if (!world) return;
    world.npcChanges = finite(world.npcChanges, 0) +
      (amount == null ? 1 : amount);
  }

  function replace(target, source) {
    Object.keys(target).forEach(function (key) { delete target[key]; });
    Object.keys(source).forEach(function (key) { target[key] = source[key]; });
  }

  function regionIds(deps) {
    if (deps && Array.isArray(deps.regionIds) && deps.regionIds.length > 0) {
      return deps.regionIds.slice().sort();
    }
    const content = deps && deps.regions ? deps.regions : RegionContent;
    return content && typeof content.list === 'function'
      ? content.list().map(function (region) { return region.id; }).sort()
      : ['qinglan-town'];
  }

  function sectIds(deps) {
    const content = deps && deps.sects ? deps.sects : SectContent;
    return content && typeof content.list === 'function'
      ? content.list().map(function (sect) { return sect.id; }).sort()
      : [];
  }

  function stableCandidates(model, npcId, limit, mode, deps) {
    const all = records(model) || {};
    const source = all[npcId];
    if (!source) return [];
    const npcs = model.systems && model.systems.npcs || {};
    const supplied = deps && Array.isArray(deps.candidateIds)
      ? deps.candidateIds
      : null;
    const tier = mode === 'background'
      ? npcs.backgroundIds
      : npcs.activeIds;
    const pool = supplied ||
      (Array.isArray(tier) ? tier : Object.keys(all).sort());
    const result = [];
    for (let index = 0;
        index < pool.length && result.length < limit;
        index++) {
      const id = pool[index];
      const candidate = all[id];
      if (id !== npcId &&
        candidate &&
        candidate.status === 'living' &&
        candidate.lifeStage !== 'child' &&
        candidate.regionId === source.regionId) {
        result.push(id);
      }
    }
    return result;
  }

  function emptyEdge(atSeconds) {
    const edge = {};
    METRICS.forEach(function (metric) { edge[metric] = 0; });
    edge.lastChangedAt = atSeconds;
    return edge;
  }

  function addRelation(model, sourceId, targetId, values, atSeconds) {
    const relationships = model.systems.relationships;
    if (!relationships.edges) relationships.edges = {};
    const key = sourceId + '>' + targetId;
    const edge = relationships.edges[key] || emptyEdge(atSeconds);
    let changed = false;
    Object.keys(values).forEach(function (metric) {
      if (METRICS.indexOf(metric) < 0) return;
      const previous = finite(edge[metric], 0);
      const next = Math.min(100, Math.max(0, previous + values[metric]));
      edge[metric] = next;
      if (next !== previous) changed = true;
    });
    if (changed) edge.lastChangedAt = atSeconds;
    relationships.edges[key] = edge;
  }

  function cultivate(person, mode) {
    person.cultivation = finite(person.cultivation, 0) +
      (mode === 'active' ? 4 : 12);
    return 'cultivation';
  }

  function equipmentRealmOrder(realmStage) {
    if (realmStage <= 8) return 1;
    return Math.min(9, realmStage - 7);
  }

  function equipmentRealmBand(realmStage) {
    return [
      'qi', 'foundation', 'core', 'nascent', 'spirit',
      'void', 'integration', 'mahayana', 'ascension'
    ][equipmentRealmOrder(realmStage) - 1];
  }

  function equipmentQuality(realmStage) {
    if (realmStage >= 14) return 'legendary';
    if (realmStage >= 11) return 'epic';
    if (realmStage >= 7) return 'rare';
    if (realmStage >= 3) return 'fine';
    return 'common';
  }

  function equipmentScore(instance) {
    const resolved = Equipment &&
      typeof Equipment.resolve === 'function'
      ? Equipment.resolve(instance)
      : null;
    if (!resolved) return -Infinity;
    let score = 0;
    Object.keys(resolved.flat || {}).forEach(function (stat) {
      score += Math.max(0, finite(resolved.flat[stat], 0));
    });
    Object.keys(resolved.percent || {}).forEach(function (stat) {
      score += Math.max(0, finite(resolved.percent[stat], 0)) * 100;
    });
    score += (resolved.rules || []).length * 8;
    return score;
  }

  function improveEquipment(person, helpers) {
    if (!person || !EquipmentContent || !Equipment ||
        typeof Equipment.generate !== 'function' ||
        !person.combatEquipment ||
        !Array.isArray(person.combatEquipment.instances) ||
        !person.combatEquipment.equipment) {
      return false;
    }
    const realmStage = Math.max(
      0,
      Math.floor(finite(person.realmStage, 0))
    );
    const order = equipmentRealmOrder(realmStage);
    const slots = EquipmentContent.SLOTS.filter(function (slot) {
      const meta = EquipmentContent.SLOT_META[slot];
      return meta && meta.unlockRealmOrder <= order;
    });
    if (!slots.length) return false;
    const slot = slots[Math.min(
      slots.length - 1,
      Math.floor(random(helpers) * slots.length)
    )];
    const seed = Math.max(
      1,
      Math.min(
        0xFFFFFFFF,
        Math.floor(random(helpers) * 0xFFFFFFFF)
      )
    );
    const instanceId = person.id + '-' + slot + '-upgrade-' +
      Math.max(0, Math.floor(nowSeconds(helpers)));
    const generated = Equipment.generate({
      baseId: equipmentRealmBand(realmStage) + '-' + slot,
      quality: equipmentQuality(realmStage),
      instanceId: instanceId,
      source: {
        type: 'npc-upgrade',
        sourceId: person.id || 'npc',
        acquiredAt: nowSeconds(helpers)
      },
      rngState: seed
    });
    if (!generated || !generated.ok) return false;
    const currentId = person.combatEquipment.equipment[slot];
    const current = person.combatEquipment.instances.find(
      function (instance) {
        return instance && instance.instanceId === currentId;
      }
    );
    if (current &&
        equipmentScore(generated.instance) <= equipmentScore(current)) {
      return false;
    }
    person.combatEquipment.instances =
      person.combatEquipment.instances.filter(function (instance) {
        return !instance || instance.instanceId !== currentId;
      });
    person.combatEquipment.instances.push(generated.instance);
    person.combatEquipment.equipment[slot] =
      generated.instance.instanceId;
    return true;
  }

  function attemptBreakthrough(person, helpers) {
    const stage = Math.max(0, Math.floor(finite(person.realmStage, 0)));
    const required = (stage + 1) * 100;
    if (finite(person.cultivation, 0) < required) {
      return cultivate(person, 'active');
    }
    if (random(helpers) < 0.6) {
      person.realmStage = stage + 1;
      person.cultivation = Math.max(0, person.cultivation - required);
      improveEquipment(person, helpers);
      return 'breakthrough';
    }
    return 'breakthrough-failed';
  }

  function travel(person, helpers, deps) {
    const ids = regionIds(deps);
    const alternatives = ids.filter(function (id) {
      return id !== person.regionId;
    });
    if (alternatives.length === 0) return cultivate(person, 'active');
    person.regionId = alternatives[
      Math.min(alternatives.length - 1, Math.floor(
        random(helpers) * alternatives.length
      ))
    ];
    return 'travel';
  }

  function interact(model, npcId, mode, helpers, deps) {
    const candidates = stableCandidates(
      model,
      npcId,
      mode === 'active' ? 8 : 3,
      mode,
      deps
    );
    if (candidates.length === 0) {
      return cultivate(records(model)[npcId], mode);
    }
    const targetId = candidates[
      Math.min(candidates.length - 1, Math.floor(
        random(helpers) * candidates.length
      ))
    ];
    const at = nowSeconds(helpers);
    addRelation(model, npcId, targetId, { affection: 1, trust: 1 }, at);
    addRelation(model, targetId, npcId, { affection: 1 }, at);

    const first = model.systems.relationships.edges[npcId + '>' + targetId];
    const second = model.systems.relationships.edges[targetId + '>' + npcId];
    if (first.trust >= 20 &&
        second.trust >= 20 &&
        random(helpers) < 0.08) {
      const engine = deps && deps.EventEngine || DefaultEventEngine;
      if (engine &&
          typeof engine.resolveAutonomousBondStage === 'function') {
        const result = engine.resolveAutonomousBondStage(
          model,
          npcId,
          targetId,
          'friend',
          '两位人物在同行中成为好友',
          { nowSeconds: function () { return at; } }
        );
        if (result && result.ok) replace(model, result.state);
      }
    }
    return 'interaction';
  }

  function considerSect(model, npcId, helpers, deps) {
    const person = records(model)[npcId];
    const ids = sectIds(deps);
    if (!person || ids.length === 0) return cultivate(person, 'active');
    const nextSectId = person.sectId === null
      ? ids[Math.min(ids.length - 1, Math.floor(random(helpers) * ids.length))]
      : (random(helpers) < 0.15 ? null : person.sectId);
    if (nextSectId === person.sectId) return cultivate(person, 'active');
    const engine = deps && deps.EventEngine || DefaultEventEngine;
    if (!engine || typeof engine.resolveAutonomousNpcSect !== 'function') {
      return cultivate(person, 'active');
    }
    const result = engine.resolveAutonomousNpcSect(
      model,
      npcId,
      nextSectId,
      { nowSeconds: function () { return nowSeconds(helpers); } }
    );
    if (result && result.ok) {
      replace(model, result.state);
      return nextSectId ? 'sect-join' : 'sect-leave';
    }
    return cultivate(records(model)[npcId], 'active');
  }

  function chooseDecision(model, npcId, mode, helpers, deps) {
    const all = records(model);
    const person = all && all[npcId];
    if (!person ||
        person.status !== 'living' ||
        person.lifeStage === 'child') return 'skipped';
    const active = mode !== 'background';
    const choices = active ? 5 : 3;
    const choice = Math.min(choices - 1, Math.floor(random(helpers) * choices));
    let result;
    if (choice === 0) result = cultivate(person, mode);
    else if (active && choice === 1) result = attemptBreakthrough(person, helpers);
    else if ((active && choice === 2) || (!active && choice === 1)) {
      result = travel(person, helpers, deps);
    } else if ((active && choice === 3) || (!active && choice === 2)) {
      result = interact(model, npcId, mode, helpers, deps || {});
    } else {
      result = considerSect(model, npcId, helpers, deps || {});
    }
    const current = records(model)[npcId];
    if (current) {
      if (active) current.lastDetailedAt = nowSeconds(helpers);
      else current.lastBackgroundAt = nowSeconds(helpers);
    }
    reportChange(helpers, result === 'skipped' ? 0 : 1);
    return result;
  }

  function advanceActiveStep(model, helpers, deps) {
    const npcs = model.systems && model.systems.npcs;
    const ids = npcs && Array.isArray(npcs.activeIds)
      ? npcs.activeIds.slice(0, 50)
      : [];
    let processed = 0;
    ids.forEach(function (id) {
      if (chooseDecision(model, id, 'active', helpers, deps) !== 'skipped') {
        processed++;
      }
    });
    if (NpcRoster && typeof NpcRoster.rebalance === 'function') {
      const rebalanced = NpcRoster.rebalance(model, {
        target: npcs.activeTarget
      });
      if (rebalanced) replace(model, rebalanced);
    }
    return { processed: processed, maxCandidates: 8 };
  }

  function advanceBackgroundStep(model, helpers, deps) {
    const npcs = model.systems && model.systems.npcs;
    const ids = npcs && Array.isArray(npcs.backgroundIds)
      ? npcs.backgroundIds.slice()
      : [];
    if (ids.length === 0) {
      if (npcs) npcs.backgroundCursor = 0;
      return { processed: 0, maxCandidates: 3 };
    }
    const start = Number.isSafeInteger(npcs.backgroundCursor)
      ? Math.max(0, npcs.backgroundCursor % ids.length)
      : 0;
    let processed = 0;
    for (let offset = 0; offset < ids.length; offset++) {
      const id = ids[(start + offset) % ids.length];
      const candidateIds = [];
      for (let candidateOffset = 1;
          candidateOffset < ids.length && candidateIds.length < 3;
          candidateOffset++) {
        candidateIds.push(
          ids[(start + offset + candidateOffset) % ids.length]
        );
      }
      if (chooseDecision(
        model,
        id,
        'background',
        helpers,
        Object.assign({}, deps || {}, { candidateIds: candidateIds })
      ) !== 'skipped') processed++;
    }
    if (model.systems.npcs.backgroundIds.length === 0) {
      model.systems.npcs.backgroundCursor = 0;
    } else {
      model.systems.npcs.backgroundCursor =
        (start + ids.length) % model.systems.npcs.backgroundIds.length;
    }
    return { processed: processed, maxCandidates: 3 };
  }

  function advanceAges(model, seconds) {
    const elapsed = Math.max(0, finite(seconds, 0));
    const all = records(model) || {};
    const events = model.systems && model.systems.events;
    Object.keys(all).sort().forEach(function (id) {
      const person = all[id];
      if (!person || person.status !== 'living') return;
      const total = Math.max(0, finite(person.ageRemainderSeconds, 0)) +
        elapsed;
      const years = Math.floor(total / YEAR_SECONDS);
      person.ageYears = Math.max(0, Math.floor(finite(person.ageYears, 0))) +
        years;
      person.ageRemainderSeconds = total - years * YEAR_SECONDS;
      if (person.ageYears < finite(person.lifespanYears, Infinity)) return;
      if (!Array.isArray(person.biography)) person.biography = [];
      const warned = person.biography.some(function (entry) {
        return entry && entry.kind === 'lifespan-warning';
      });
      if (warned) return;
      person.biography.push({
        kind: 'lifespan-warning',
        atAge: person.ageYears
      });
      if (events) {
        if (!Array.isArray(events.evolution)) events.evolution = [];
        events.evolution.push({
          id: 'lifespan-warning-' + id,
          category: 'future-lifecycle',
          npcId: id,
          title: person.identity && person.identity.name
            ? person.identity.name + '的寿元将近，需要日后处理'
            : id + '的寿元将近，需要日后处理',
          at: finite(model.systems.world &&
            model.systems.world.elapsedSeconds, 0)
        });
      }
    });
    return model;
  }

  return Object.freeze({
    YEAR_SECONDS: YEAR_SECONDS,
    advanceActiveStep: advanceActiveStep,
    advanceBackgroundStep: advanceBackgroundStep,
    advanceAges: advanceAges,
    chooseDecision: chooseDecision,
    improveEquipment: improveEquipment
  });
});
