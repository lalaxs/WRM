(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/world-event-narratives.js'),
      require('../content/sect-offices.js')
    )
    : factory(
      root && root.WorldEventNarrativeContent,
      root && root.SectOfficeContent
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.WorldEventPicker = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  NarrativeContent,
  SectOfficeContent
) {
  'use strict';

  function officeRankOf(person) {
    if (!person || !person.sectId || !person.officeSlotId) return null;
    if (!SectOfficeContent || typeof SectOfficeContent.getSlot !== 'function') {
      return null;
    }
    const slot = SectOfficeContent.getSlot(person.sectId, person.officeSlotId);
    return slot ? slot.rank : null;
  }

  function includesAny(list, value) {
    if (!Array.isArray(list) || list.length === 0) return false;
    if (list.indexOf(value) >= 0) return true;
    // 旧叙事写 outer/true/hall-*，与现原版职阶 disciple/peak 对齐。
    if (SectOfficeContent && typeof SectOfficeContent.slotsMatch === 'function') {
      for (let i = 0; i < list.length; i++) {
        if (SectOfficeContent.slotsMatch(list[i], value)) return true;
      }
    }
    if (SectOfficeContent && typeof SectOfficeContent.ranksMatch === 'function') {
      for (let i = 0; i < list.length; i++) {
        if (SectOfficeContent.ranksMatch(list[i], value)) return true;
      }
    }
    return false;
  }

  function includesOverlap(needed, available) {
    if (!Array.isArray(needed) || needed.length === 0) return true;
    if (!Array.isArray(available) || available.length === 0) return false;
    for (let index = 0; index < needed.length; index++) {
      if (available.indexOf(needed[index]) >= 0) return true;
    }
    return false;
  }

  function hasNone(forbidden, available) {
    if (!Array.isArray(forbidden) || forbidden.length === 0) return true;
    if (!Array.isArray(available)) return true;
    for (let index = 0; index < forbidden.length; index++) {
      if (available.indexOf(forbidden[index]) >= 0) return false;
    }
    return true;
  }

  function personGender(person) {
    if (!person) return null;
    if (person.identity && person.identity.gender === 'male') return 'male';
    if (person.identity && person.identity.gender === 'female') return 'female';
    if (person.gender === 'male' || person.gender === 'female') return person.gender;
    return null;
  }

  function pairGenderKey(a, b) {
    const ga = personGender(a);
    const gb = personGender(b);
    if (!ga || !gb) return null;
    return (ga === 'male' ? 'm' : 'f') + (gb === 'male' ? 'm' : 'f');
  }

  function matchGender(row, ctx) {
    const a = ctx.a;
    const b = ctx.b;
    const genderA = personGender(a);
    const genderB = personGender(b);
    const pairKey = pairGenderKey(a, b);

    if (Array.isArray(row.genderA) && row.genderA.length) {
      if (!includesAny(row.genderA, genderA)) return false;
    }
    if (Array.isArray(row.genderB) && row.genderB.length) {
      if (!includesAny(row.genderB, genderB)) return false;
    }
    if (Array.isArray(row.pairGenderAny) && row.pairGenderAny.length) {
      if (!pairKey || !includesAny(row.pairGenderAny, pairKey)) return false;
    }
    if (Array.isArray(row.pairGenderNone) && row.pairGenderNone.length) {
      if (pairKey && includesAny(row.pairGenderNone, pairKey)) return false;
    }
    return true;
  }

  function matchLocation(row, ctx) {
    if (Array.isArray(row.regions) && row.regions.length) {
      if (!includesAny(row.regions, ctx.regionId)) return false;
    }
    if (Array.isArray(row.regionTypes) && row.regionTypes.length) {
      if (!includesAny(row.regionTypes, ctx.regionType)) return false;
    }
    return true;
  }

  function matchGates(row, ctx) {
    const a = ctx.a;
    const b = ctx.b;
    const actors = row.actors || 'pair';
    if (actors === 'pair' && (!a || !b)) return false;
    if (actors === 'solo' && !a) return false;

    if (!matchGender(row, ctx)) return false;

    if (Array.isArray(row.personalityAny) && row.personalityAny.length) {
      const hit = includesAny(row.personalityAny, a && a.personalityId) ||
        includesAny(row.personalityAny, b && b.personalityId);
      if (!hit) return false;
    }
    if (Array.isArray(row.personalityA) && row.personalityA.length) {
      if (!includesAny(row.personalityA, a && a.personalityId)) return false;
    }
    if (Array.isArray(row.personalityB) && row.personalityB.length) {
      if (!b || !includesAny(row.personalityB, b.personalityId)) return false;
    }

    // 道心标签门控：任一方 / 指定方命中 traits 数组即过。
    if (Array.isArray(row.traitAny) && row.traitAny.length) {
      const hit = includesOverlap(row.traitAny, a && a.traits) ||
        includesOverlap(row.traitAny, b && b.traits);
      if (!hit) return false;
    }
    if (Array.isArray(row.traitA) && row.traitA.length) {
      if (!includesOverlap(row.traitA, a && a.traits)) return false;
    }
    if (Array.isArray(row.traitB) && row.traitB.length) {
      if (!b || !includesOverlap(row.traitB, b.traits)) return false;
    }

    const rankA = officeRankOf(a);
    const rankB = officeRankOf(b);
    if (Array.isArray(row.officeRankAny) && row.officeRankAny.length) {
      if (!includesAny(row.officeRankAny, rankA) &&
          !includesAny(row.officeRankAny, rankB)) {
        return false;
      }
    }
    if (Array.isArray(row.officeRankA) && row.officeRankA.length) {
      if (!includesAny(row.officeRankA, rankA)) return false;
    }
    if (Array.isArray(row.officeRankB) && row.officeRankB.length) {
      if (!includesAny(row.officeRankB, rankB)) return false;
    }
    if (Array.isArray(row.officeSlotAny) && row.officeSlotAny.length) {
      const slotHit = includesAny(row.officeSlotAny, a && a.officeSlotId) ||
        includesAny(row.officeSlotAny, b && b.officeSlotId);
      if (!slotHit) return false;
    }

    if (Array.isArray(row.rogueTitleAny) && row.rogueTitleAny.length) {
      const rogueHit =
        includesAny(row.rogueTitleAny, a && a.rogueTitleId) ||
        includesAny(row.rogueTitleAny, b && b.rogueTitleId);
      if (!rogueHit) return false;
    }
    if (row.eitherRogueA === true) {
      if (!a || a.sectId) return false;
    }

    if (Array.isArray(row.sectAny) && row.sectAny.length) {
      const sectHit = includesAny(row.sectAny, a && a.sectId) ||
        includesAny(row.sectAny, b && b.sectId);
      if (!sectHit) return false;
    }
    if (row.sameSect === true) {
      if (!a || !b || !a.sectId || a.sectId !== b.sectId) return false;
    }
    if (row.sameSect === false) {
      if (a && b && a.sectId && a.sectId === b.sectId) return false;
    }

    if (typeof row.affinityMin === 'number') {
      if (!(ctx.affinity >= row.affinityMin)) return false;
    }
    if (typeof row.affinityMax === 'number') {
      if (!(ctx.affinity <= row.affinityMax)) return false;
    }
    if (typeof row.eventCountMin === 'number') {
      if (!(ctx.eventCount >= row.eventCountMin)) return false;
    }
    if (typeof row.eventCountMax === 'number') {
      if (!(ctx.eventCount <= row.eventCountMax)) return false;
    }
    if (Array.isArray(row.arcAny) && row.arcAny.length) {
      if (!includesAny(row.arcAny, ctx.arcStage)) return false;
    }
    if (Array.isArray(row.arcNone) && row.arcNone.length) {
      if (ctx.arcStage && includesAny(row.arcNone, ctx.arcStage)) return false;
    }

    if (!includesOverlap(row.tagAny, ctx.tags)) return false;
    if (!hasNone(row.tagNone, ctx.tags)) return false;

    if (Array.isArray(row.statusAny) && row.statusAny.length) {
      const statusA = (a && a.activityStatus) || 'normal';
      const statusB = (b && b.activityStatus) || 'normal';
      if (!includesAny(row.statusAny, statusA) &&
          !includesAny(row.statusAny, statusB)) {
        return false;
      }
    }
    if (Array.isArray(row.statusB) && row.statusB.length) {
      const statusB = (b && b.activityStatus) || 'normal';
      if (!includesAny(row.statusB, statusB)) return false;
    }

    if (!matchLocation(row, ctx)) return false;

    return typeof row.template === 'string' && row.template.length > 0;
  }

  function isSoftGated(row) {
    return !row.personalityAny && !row.personalityA && !row.personalityB &&
      !row.traitAny && !row.traitA && !row.traitB &&
      !row.officeRankAny && !row.officeRankA && !row.officeRankB &&
      !row.tagAny && !row.rogueTitleAny && !row.sectAny &&
      row.affinityMin == null && row.affinityMax == null &&
      row.eventCountMin == null && row.eventCountMax == null &&
      !row.arcAny && !row.arcNone &&
      !row.sameSect &&
      !row.genderA && !row.genderB &&
      !row.pairGenderAny && !row.pairGenderNone;
  }

  function weightedPick(list, random) {
    if (!list || !list.length) return null;
    let total = 0;
    list.forEach(function (row) {
      total += Math.max(1, Number(row.weight) || 1);
    });
    let cursor = (typeof random === 'function' ? random() : Math.random()) *
      total;
    for (let index = 0; index < list.length; index++) {
      cursor -= Math.max(1, Number(list[index].weight) || 1);
      if (cursor < 0) return list[index];
    }
    return list[list.length - 1];
  }

  function ensureNarrativesForType(type) {
    const root = typeof globalThis !== 'undefined' ? globalThis : null;
    const lazy = root && root.LazyContent;
    if (lazy && typeof lazy.ensureWorldNarrativeType === 'function') {
      try {
        lazy.ensureWorldNarrativeType(type);
      } catch (err) {
        // ignore: sync path / already loaded / async warm
      }
    } else if (
      NarrativeContent &&
      typeof NarrativeContent.ensureTypeLoaded === 'function'
    ) {
      NarrativeContent.ensureTypeLoaded(type);
    }
  }

  function candidatesFor(type, ctx) {
    ensureNarrativesForType(type);
    const pool = NarrativeContent &&
      typeof NarrativeContent.listByType === 'function'
      ? NarrativeContent.listByType(type)
      : [];
    return pool.filter(function (row) {
      return matchGates(row, ctx);
    });
  }

  function pickNarrative(type, ctx, random) {
    ensureNarrativesForType(type);
    const context = ctx || {};
    const matched = candidatesFor(type, context);
    const stageHit = matched.filter(function (row) {
      return Array.isArray(row.arcAny) && row.arcAny.length &&
        includesAny(row.arcAny, context.arcStage);
    });
    const progressHit = matched.filter(function (row) {
      return (Array.isArray(row.arcAny) && row.arcAny.length) ||
        (Array.isArray(row.arcNone) && row.arcNone.length) ||
        row.eventCountMin != null || row.eventCountMax != null ||
        row.affinityMin != null || row.affinityMax != null;
    });
    const personalityHit = matched.filter(function (row) {
      return (Array.isArray(row.personalityAny) && row.personalityAny.length) ||
        (Array.isArray(row.personalityA) && row.personalityA.length) ||
        (Array.isArray(row.personalityB) && row.personalityB.length);
    });
    const traitHit = matched.filter(function (row) {
      return (Array.isArray(row.traitAny) && row.traitAny.length) ||
        (Array.isArray(row.traitA) && row.traitA.length) ||
        (Array.isArray(row.traitB) && row.traitB.length);
    });
    const roll = typeof random === 'function' ? random() : Math.random();
    let pool = matched;
    if (stageHit.length && roll < 0.78) {
      pool = stageHit;
    } else if (context.arcStage && progressHit.length && roll < 0.7) {
      pool = progressHit;
    } else if (personalityHit.length && roll < 0.78) {
      pool = personalityHit;
    } else if (traitHit.length && roll < 0.78) {
      pool = traitHit;
    } else if (progressHit.length && roll < 0.55) {
      pool = progressHit;
    }
    const picked = weightedPick(pool, random);
    if (picked) return picked;

    // 回落：同 type、软门控，仍遵守地点与性别合宜。
    const fallbackPool = NarrativeContent &&
      typeof NarrativeContent.listByType === 'function'
      ? NarrativeContent.listByType(type).filter(function (row) {
        return isSoftGated(row) &&
          matchLocation(row, context) &&
          matchGender(row, context);
      })
      : [];
    const fallback = weightedPick(fallbackPool, random);
    if (fallback) return fallback;

    const safePool = NarrativeContent &&
      typeof NarrativeContent.listByType === 'function'
      ? NarrativeContent.listByType(type).filter(function (row) {
        return matchLocation(row, context) && matchGender(row, context);
      })
      : [];
    return weightedPick(safePool, random) ||
      weightedPick(
        NarrativeContent ? NarrativeContent.listByType(type) : [],
        random
      );
  }

  function fillTemplate(template, parts) {
    return String(template || '')
      .replace(/\{a\}/g, parts.a || '某人')
      .replace(/\{b\}/g, parts.b || '某人')
      .replace(/\{c\}/g, parts.c || '旁人')
      .replace(/\{loc\}/g, parts.loc || '某处')
      .replace(/\{item\}/g, parts.item || '一份薄礼');
  }

  return Object.freeze({
    matchGates: matchGates,
    matchLocation: matchLocation,
    matchGender: matchGender,
    personGender: personGender,
    pairGenderKey: pairGenderKey,
    candidatesFor: candidatesFor,
    pickNarrative: pickNarrative,
    fillTemplate: fillTemplate,
    officeRankOf: officeRankOf
  });
});
