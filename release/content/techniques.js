(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.TechniqueContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return value;
  }

  function legacyFunctionTags(effect) {
    if (!effect || typeof effect !== 'object') return ['buff'];
    if (effect.type === 'heal') return ['heal'];
    if (effect.type === 'restoreQi') return ['qiRestore'];
    if (effect.supplyHealingBonus) return ['buff', 'heal'];
    if (effect.activeBeastEffectBonus) return ['buff'];
    if (effect.defensePercent || effect.maxQiPercent || effect.attackIntervalReduction) return ['buff'];
    if (effect.type === 'attack' && effect.status) return ['damage', 'control'];
    if (effect.type === 'attack') return ['damage'];
    return ['buff'];
  }

  function legacyStyleTags(tags) {
    const mapping = {
      fist: 'body',
      spirit: 'soul',
      healing: 'dan',
      qi: 'dan',
      movement: 'body',
      pill: 'dan'
    };
    return (Array.isArray(tags) ? tags : []).map(function (tag) {
      return mapping[tag] || tag;
    }).filter(function (tag, index, list) {
      return list.indexOf(tag) === index;
    });
  }

  function legacyTargetRule(effect) {
    if (!effect || effect.type === 'heal' || effect.type === 'restoreQi') return 'self';
    return effect.type === 'attack' ? 'highestThreatEnemy' : 'self';
  }

  function define(records, id, name, kind, tier, tags, requiredRealmIndex,
    qiCost, cooldownTicks, effect, runeCost, functionTags, styleTags, targetRule) {
    records[id] = {
      id: id,
      name: name,
      kind: kind,
      tier: tier,
      tags: tags,
      functionTags: functionTags || legacyFunctionTags(effect),
      styleTags: styleTags || legacyStyleTags(tags),
      targetRule: targetRule || legacyTargetRule(effect),
      requiredRealmIndex: requiredRealmIndex,
      bookItemId: 'techniqueBook:' + id,
      qiCost: qiCost,
      cooldownTicks: cooldownTicks,
      effect: effect
    };
    if (runeCost && typeof runeCost === 'object') {
      records[id].runeCost = runeCost;
    }
  }

  const records = {};
  define(records, 'cloudPiercingSword', '穿云剑诀', 'active', 1, ['sword'], 0,
    10, 16, { type: 'attack', multiplier: 1.4 });
  define(records, 'returningWindSlash', '回风斩', 'active', 1, ['sword'], 0,
    12, 20, { type: 'attack', hits: 2, multiplier: 0.8 });
  define(records, 'stoneBreakingFist', '碎石拳', 'active', 2, ['fist'], 8,
    12, 20, { type: 'attack', multiplier: 1.6 });
  define(records, 'spiritNeedle', '灵犀针', 'active', 2, ['spirit'], 8,
    14, 24, { type: 'attack', multiplier: 1.2, defenseIgnore: 0.3 },
    { mindCharm: 1 });
  define(records, 'clearHeartArt', '清心诀', 'active', 2, ['healing'], 8,
    20, 48, { type: 'heal', maxHpRatio: 0.2 },
    { natureCharm: 1 });
  define(records, 'gatheringBreath', '聚息功', 'active', 1, ['qi'], 0,
    0, 60, { type: 'restoreQi', amount: 25 });
  define(records, 'thunderSeal', '雷印', 'active', 3, ['thunder'], 9,
    22, 32, {
      type: 'attack',
      multiplier: 1.8,
      status: { id: 'shock', chance: 0.3, durationTicks: 8 }
    },
    { airCharm: 1, fireCharm: 1 });
  define(records, 'bindingTalisman', '定身符法', 'active', 3, ['talisman'], 9,
    18, 36, {
      type: 'attack',
      multiplier: 0.8,
      status: {
        id: 'binding',
        attackIntervalTicks: 2,
        durationTicks: 12
      }
    },
    { earthCharm: 1, bodyCharm: 1 });
  define(records, 'beastEcho', '灵兽回响', 'active', 4, ['beast'], 10,
    24, 32, {
      type: 'attack',
      multiplier: 1.5,
      activeBeastMultiplier: 1.8
    });
  define(records, 'starfallArray', '星落阵诀', 'active', 5, ['array'], 11,
    30, 60, { type: 'attack', multiplier: 2.2 },
    { cosmicCharm: 2, fireCharm: 1 });

  define(records, 'steadyBreath', '稳息心法', 'passive', 1, ['qi'], 0,
    0, 0, { maxQiPercent: 0.15 });
  define(records, 'ironBody', '铁身功', 'passive', 2, ['body'], 8,
    0, 0, { defensePercent: 0.1 });
  define(records, 'swiftShadow', '疾影诀', 'passive', 3, ['movement'], 9,
    0, 0, { attackIntervalReduction: 0.05 });
  define(records, 'swordHeart', '剑心通明', 'passive', 4, ['sword'], 10,
    0, 0, { taggedDamageBonus: { sword: 0.1 } });
  define(records, 'pillGuard', '丹护心诀', 'passive', 5, ['pill'], 11,
    0, 0, { supplyHealingBonus: 0.15 });
  define(records, 'spiritCompanion', '灵契心经', 'passive', 6, ['beast'], 12,
    0, 0, { activeBeastEffectBonus: 0.1 });

  const TECHNIQUES = deepFreeze(records);
  const BY_BOOK_ITEM_ID = {};
  Object.values(TECHNIQUES).forEach(function (technique) {
    BY_BOOK_ITEM_ID[technique.bookItemId] = technique;
  });
  deepFreeze(BY_BOOK_ITEM_ID);

  function get(techniqueId) {
    return TECHNIQUES[techniqueId] || null;
  }

  function getByBookItemId(itemId) {
    return BY_BOOK_ITEM_ID[itemId] || null;
  }

  function list(kind) {
    const techniques = Object.values(TECHNIQUES);
    return Object.freeze(kind == null
      ? techniques.slice()
      : techniques.filter(function (technique) {
        return technique.kind === kind;
      }));
  }

  function xpNeed(level, multiplier) {
    if (!Number.isSafeInteger(level) || level < 1 || level >= 20 ||
        typeof multiplier !== 'number' ||
        !Number.isFinite(multiplier) ||
        multiplier <= 0) {
      return 0;
    }
    return Math.round(100 * Math.pow(level, 1.7) * multiplier);
  }

  return Object.freeze({
    TECHNIQUES: TECHNIQUES,
    get: get,
    getByBookItemId: getByBookItemId,
    list: list,
    xpNeed: xpNeed
  });
});
