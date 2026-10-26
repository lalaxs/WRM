(function (root, factory) {
  'use strict';
  const api = factory(
    typeof EquipmentContent !== 'undefined'
      ? EquipmentContent
      : typeof require === 'function'
        ? require('../content/equipment.js')
        : null,
    typeof GameRandom !== 'undefined'
      ? GameRandom
      : typeof require === 'function'
        ? require('./random.js')
        : null
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Equipment = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  EquipmentContent,
  GameRandom
) {
  'use strict';

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

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function integer(value, fallback) {
    return Number.isInteger(value) ? value : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function draw(state) {
    const result = GameRandom.next(state.rngState);
    state.rngState = result.seed;
    return result.value;
  }

  function weightedPick(rows, weightFor, state) {
    if (!rows.length) return null;
    let total = 0;
    const weights = rows.map(function (row) {
      const weight = Math.max(0, finite(weightFor(row), 0));
      total += weight;
      return weight;
    });
    if (total <= 0) return rows[0];
    let cursor = draw(state) * total;
    for (let index = 0; index < rows.length; index += 1) {
      cursor -= weights[index];
      if (cursor < 0) return rows[index];
    }
    return rows[rows.length - 1];
  }

  function normalizeSource(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      type: typeof source.type === 'string' ? source.type : 'unknown',
      sourceId: typeof source.sourceId === 'string' ? source.sourceId : '',
      acquiredAt: Math.max(0, finite(source.acquiredAt, 0))
    };
  }

  function normalizeAffix(value, base) {
    if (!value || typeof value !== 'object') return null;
    const definition = EquipmentContent.getAffix(value.id);
    if (!definition) return null;
    const tier = clamp(
      integer(value.tier, base.minAffixTier),
      base.minAffixTier,
      base.maxAffixTier
    );
    const band = definition.tiers[tier];
    if (!band) return null;
    const rolledValue = finite(value.value, band.min);
    return {
      id: definition.id,
      kind: definition.kind,
      tier: tier,
      value: Number(clamp(rolledValue, band.min, band.max).toFixed(4))
    };
  }

  function normalizeInstance(value) {
    if (!value || typeof value !== 'object') return null;
    const base = EquipmentContent.getBase(value.baseId);
    if (!base || typeof value.instanceId !== 'string' || !value.instanceId) {
      return null;
    }
    const quality = EquipmentContent.QUALITIES[value.quality]
      ? value.quality
      : 'common';
    const qualityDefinition = EquipmentContent.QUALITIES[quality];
    const sourceAffixes = Array.isArray(value.affixes) ? value.affixes : [];
    const affixes = [];
    let buildCount = 0;
    let rareCount = 0;
    const ids = new Set();
    for (
      let index = 0;
      index < sourceAffixes.length &&
      affixes.length < qualityDefinition.affixCount;
      index += 1
    ) {
      const affix = normalizeAffix(sourceAffixes[index], base);
      if (!affix || ids.has(affix.id)) return null;
      if (affix.kind === 'build' && buildCount >= 2) return null;
      if (affix.kind === 'rare' && rareCount >= 1) return null;
      ids.add(affix.id);
      if (affix.kind === 'build') buildCount += 1;
      if (affix.kind === 'rare') rareCount += 1;
      affixes.push(affix);
    }
    if (sourceAffixes.length !== affixes.length) return null;
    return deepFreeze({
      version: 1,
      instanceId: value.instanceId,
      baseId: base.id,
      quality: quality,
      affixes: affixes,
      enhancementLevel: clamp(integer(value.enhancementLevel, 0), 0, 15),
      enhancementPity: Math.max(0, integer(value.enhancementPity, 0)),
      favorite: value.favorite === true,
      source: normalizeSource(value.source)
    });
  }

  function rollTier(base, quality, state) {
    const low = base.minAffixTier;
    const high = base.maxAffixTier;
    const range = high - low + 1;
    const bias = EquipmentContent.QUALITIES[quality].highTierBias;
    const rolled = Math.pow(draw(state), Math.max(0.35, 1 - bias));
    return clamp(low + Math.floor(rolled * range), low, high);
  }

  function rollAffix(definition, base, quality, state) {
    const tier = rollTier(base, quality, state);
    const band = definition.tiers[tier];
    const value = band.min + (band.max - band.min) * draw(state);
    return {
      id: definition.id,
      kind: definition.kind,
      tier: tier,
      value: Number(value.toFixed(4))
    };
  }

  function makeAffixes(base, quality, state, lockedByIndex) {
    const qualityDefinition = EquipmentContent.QUALITIES[quality];
    const count = qualityDefinition.affixCount;
    const result = new Array(count);
    const used = new Set();
    let buildCount = 0;
    let rareCount = 0;

    Object.keys(lockedByIndex || {}).forEach(function (key) {
      const index = Number(key);
      const affix = lockedByIndex[key];
      if (!Number.isInteger(index) || index < 0 || index >= count || !affix) {
        return;
      }
      result[index] = clone(affix);
      used.add(affix.id);
      if (affix.kind === 'build') buildCount += 1;
      if (affix.kind === 'rare') rareCount += 1;
    });

    let rareIndex = -1;
    if (
      rareCount === 0 &&
      qualityDefinition.rareChance > 0 &&
      draw(state) < qualityDefinition.rareChance
    ) {
      const open = [];
      for (let index = 0; index < count; index += 1) {
        if (!result[index]) open.push(index);
      }
      if (open.length) {
        rareIndex = open[Math.floor(draw(state) * open.length)];
      }
    }

    for (let index = 0; index < count; index += 1) {
      if (result[index]) continue;
      const wantRare = index === rareIndex;
      const candidates = Object.values(EquipmentContent.AFFIXES).filter(
        function (definition) {
          if (used.has(definition.id)) return false;
          if (wantRare) return definition.kind === 'rare';
          if (definition.kind === 'rare') return false;
          if (definition.kind === 'build' && buildCount >= 2) return false;
          return true;
        }
      );
      const chosen = weightedPick(
        candidates,
        function (definition) {
          return definition.slotWeights[base.slot];
        },
        state
      );
      if (!chosen) return null;
      const affix = rollAffix(chosen, base, quality, state);
      result[index] = affix;
      used.add(chosen.id);
      if (chosen.kind === 'build') buildCount += 1;
      if (chosen.kind === 'rare') rareCount += 1;
    }
    return result;
  }

  function generate(request) {
    const args = request && typeof request === 'object' ? request : {};
    const base = EquipmentContent.getBase(args.baseId);
    const quality = EquipmentContent.QUALITIES[args.quality]
      ? args.quality
      : null;
    const rngState = GameRandom.normalizeSeed(args.rngState);
    if (!base) {
      return deepFreeze({ ok: false, code: 'unknown_equipment_base', rngState: rngState });
    }
    if (!quality || quality === 'mythic') {
      return deepFreeze({ ok: false, code: 'invalid_equipment_quality', rngState: rngState });
    }
    if (typeof args.instanceId !== 'string' || !args.instanceId) {
      return deepFreeze({ ok: false, code: 'invalid_equipment_id', rngState: rngState });
    }
    const state = { rngState: rngState };
    const affixes = makeAffixes(base, args.quality, state, null);
    if (!affixes) {
      return deepFreeze({ ok: false, code: 'affix_pool_exhausted', rngState: state.rngState });
    }
    const instance = normalizeInstance({
      version: 1,
      instanceId: args.instanceId,
      baseId: base.id,
      quality: args.quality,
      affixes: affixes,
      enhancementLevel: 0,
      enhancementPity: 0,
      favorite: false,
      source: args.source
    });
    return deepFreeze({
      ok: true,
      instance: instance,
      rngState: state.rngState
    });
  }

  function affixText(definition, affix) {
    const value = definition.mode === 'percent' ||
      definition.kind !== 'numeric'
      ? Math.round(affix.value * 1000) / 10 + '%'
      : String(Math.round(affix.value * 100) / 100);
    if (definition.kind === 'numeric') {
      return definition.name + ' +' + value;
    }
    return definition.name + ' · ' + value;
  }

  function resolve(value) {
    const instance = normalizeInstance(value);
    if (!instance) return null;
    const base = EquipmentContent.getBase(instance.baseId);
    const quality = EquipmentContent.QUALITIES[instance.quality];
    const multiplier = 1 + instance.enhancementLevel * 0.02;
    const flat = {};
    const percent = {};
    const rules = [];
    Object.keys(base.baseStats).forEach(function (stat) {
      flat[stat] = Number((base.baseStats[stat] * multiplier).toFixed(4));
    });
    const affixes = instance.affixes.map(function (affix) {
      const definition = EquipmentContent.getAffix(affix.id);
      if (definition.kind === 'numeric') {
        const destination = definition.mode === 'percent' ? percent : flat;
        destination[definition.stat] =
          finite(destination[definition.stat], 0) + affix.value;
      } else {
        rules.push({
          id: definition.id,
          kind: definition.kind,
          event: definition.event,
          rule: definition.rule,
          target: definition.target,
          value: affix.value,
          durationTicks: definition.durationTicks,
          maxStacks: definition.maxStacks,
          internalCooldownTicks: definition.internalCooldownTicks
        });
      }
      return {
        id: affix.id,
        name: definition.name,
        kind: definition.kind,
        tier: affix.tier,
        value: affix.value,
        text: affixText(definition, affix)
      };
    });
    Object.keys(flat).forEach(function (stat) {
      flat[stat] = Number(flat[stat].toFixed(4));
    });
    Object.keys(percent).forEach(function (stat) {
      percent[stat] = Number(percent[stat].toFixed(4));
    });
    const name = quality.name + ' ' + base.name +
      (instance.enhancementLevel > 0 ? ' +' + instance.enhancementLevel : '');
    return deepFreeze({
      instanceId: instance.instanceId,
      baseId: base.id,
      name: name,
      baseName: base.name,
      quality: instance.quality,
      qualityName: quality.name,
      qualityColor: quality.color,
      slot: base.slot,
      realmBand: base.realmBand,
      realmOrder: base.realmOrder,
      iconKey: base.iconKey,
      iconSrc50: base.iconSrc50,
      iconSrc100: base.iconSrc100,
      enhancementLevel: instance.enhancementLevel,
      enhancementPity: instance.enhancementPity,
      favorite: instance.favorite,
      flat: flat,
      percent: percent,
      stats: clone(flat),
      rules: rules,
      affixes: affixes,
      resonanceId: base.resonanceId || null,
      resonancePoints: base.resonanceId ? 1 : 0,
      source: clone(instance.source)
    });
  }

  function addMap(target, source) {
    Object.keys(source || {}).forEach(function (key) {
      target[key] = Number(
        (finite(target[key], 0) + finite(source[key], 0)).toFixed(4)
      );
    });
  }

  function aggregate(values) {
    const flat = {};
    const percent = {};
    const rules = [];
    const counts = {};
    const resolved = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      const item = resolve(value);
      if (!item) return;
      resolved.push(item);
      addMap(flat, item.flat);
      addMap(percent, item.percent);
      item.rules.forEach(function (rule) {
        rules.push(clone(rule));
      });
      if (item.resonanceId && item.resonancePoints > 0) {
        counts[item.resonanceId] =
          finite(counts[item.resonanceId], 0) + 1;
      }
    });
    const active = {};
    Object.keys(counts).sort().forEach(function (resonanceId) {
      const definition = EquipmentContent.getResonance(resonanceId);
      if (!definition) return;
      active[resonanceId] = [];
      [2, 4].forEach(function (threshold) {
        const effect = definition.thresholds[threshold];
        if (counts[resonanceId] < threshold || !effect) return;
        addMap(flat, effect.flat);
        addMap(percent, effect.percent);
        (effect.rules || []).forEach(function (rule) {
          rules.push({
            id: resonanceId + '-' + threshold + '-' + rule.id,
            kind: 'resonance',
            resonanceId: resonanceId,
            threshold: threshold,
            rule: rule.id,
            value: rule.value
          });
        });
        active[resonanceId].push({
          threshold: threshold,
          name: definition.name,
          effect: clone(effect)
        });
      });
      if (!active[resonanceId].length) delete active[resonanceId];
    });
    return deepFreeze({
      flat: flat,
      percent: percent,
      rules: rules,
      resonance: {
        counts: counts,
        active: active
      },
      resolved: resolved
    });
  }

  function enhance(value, options) {
    const instance = normalizeInstance(value);
    const args = options && typeof options === 'object' ? options : {};
    const originalSeed = GameRandom.normalizeSeed(args.rngState);
    if (!instance) {
      return deepFreeze({ ok: false, code: 'invalid_equipment', rngState: originalSeed });
    }
    if (instance.enhancementLevel >= 15) {
      return deepFreeze({ ok: false, code: 'enhancement_max', rngState: originalSeed });
    }
    if (args.materialAvailable !== true) {
      return deepFreeze({ ok: false, code: 'insufficient_material', rngState: originalSeed });
    }
    const targetLevel = instance.enhancementLevel + 1;
    const definition = EquipmentContent.ENHANCEMENT_LEVELS[targetLevel];
    const state = { rngState: originalSeed };
    const rolled = draw(state);
    const protectionBonus = clamp(finite(args.protectionBonus, 0), 0, 1);
    const guaranteed = definition.pityFailures > 0 &&
      instance.enhancementPity >= definition.pityFailures;
    const success = guaranteed ||
      rolled < Math.min(1, definition.successRate + protectionBonus);
    const changed = clone(instance);
    if (success) {
      changed.enhancementLevel = targetLevel;
      changed.enhancementPity = 0;
    } else {
      changed.enhancementPity += 1;
    }
    return deepFreeze({
      ok: true,
      success: success,
      guaranteed: guaranteed,
      instance: normalizeInstance(changed),
      rngState: state.rngState
    });
  }

  function reforge(value, options) {
    const instance = normalizeInstance(value);
    const args = options && typeof options === 'object' ? options : {};
    const originalSeed = GameRandom.normalizeSeed(args.rngState);
    if (!instance) {
      return deepFreeze({ ok: false, code: 'invalid_equipment', rngState: originalSeed });
    }
    const lockedIndex = args.lockedAffixIndex;
    if (
      lockedIndex !== null &&
      lockedIndex !== undefined &&
      (
        !Number.isInteger(lockedIndex) ||
        lockedIndex < 0 ||
        lockedIndex >= instance.affixes.length
      )
    ) {
      return deepFreeze({ ok: false, code: 'invalid_locked_affix', rngState: originalSeed });
    }
    const base = EquipmentContent.getBase(instance.baseId);
    const state = { rngState: originalSeed };
    const locked = {};
    if (Number.isInteger(lockedIndex)) {
      locked[lockedIndex] = instance.affixes[lockedIndex];
    }
    const affixes = makeAffixes(base, instance.quality, state, locked);
    if (!affixes) {
      return deepFreeze({ ok: false, code: 'affix_pool_exhausted', rngState: state.rngState });
    }
    const changed = clone(instance);
    changed.affixes = affixes;
    return deepFreeze({
      ok: true,
      instance: normalizeInstance(changed),
      rngState: state.rngState
    });
  }

  function legacyInstance(baseItemId, ordinal) {
    const baseId = EquipmentContent.LEGACY_BASE_ALIASES[baseItemId];
    if (!baseId || !Number.isInteger(ordinal) || ordinal < 1) return null;
    return normalizeInstance({
      version: 1,
      instanceId: 'legacy-' + baseItemId + '-' + ordinal,
      baseId: baseId,
      quality: 'common',
      affixes: [],
      enhancementLevel: 0,
      enhancementPity: 0,
      favorite: false,
      source: {
        type: 'migration',
        sourceId: baseItemId,
        acquiredAt: 0
      }
    });
  }

  return Object.freeze({
    normalizeInstance: normalizeInstance,
    generate: generate,
    resolve: resolve,
    aggregate: aggregate,
    enhance: enhance,
    reforge: reforge,
    legacyInstance: legacyInstance
  });
});
