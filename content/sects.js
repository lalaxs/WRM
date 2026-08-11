(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.SectContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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

  function skill(targetId, multiplier) {
    return {
      kind: 'skill',
      targetId: targetId,
      multiplier: multiplier
    };
  }

  function technique(targetId, multiplier) {
    return {
      kind: 'technique',
      targetId: targetId,
      multiplier: multiplier
    };
  }

  const SECTS = deepFreeze([
    {
      id: 'taixuan-sword',
      name: '太玄剑宗',
      homeRegionId: 'eastern-sect-heights',
      description: '重实战与剑意，门风直接，兼修炼器。',
      traits: ['剑修', '实战', '直率'],
      preferredPersonalityIds: ['direct', 'ambitious', 'steady'],
      bonuses: [
        skill('forging', 1.10),
        technique('cloudPiercingSword', 1.12)
      ],
      favoredResources: ['矿材', '剑器'],
      learningAccess: 'favored-not-exclusive'
    },
    {
      id: 'baicao-valley',
      name: '百草谷',
      homeRegionId: 'western-sect-valley',
      description: '善辨草木与丹理，门人耐心而重视照料。',
      traits: ['采药', '炼丹', '耐心'],
      preferredPersonalityIds: ['patient', 'warm', 'meticulous'],
      bonuses: [
        skill('herb', 1.12),
        skill('alchemy', 1.10),
        technique('clearHeartArt', 1.08)
      ],
      favoredResources: ['灵草', '丹药'],
      learningAccess: 'favored-not-exclusive'
    },
    {
      id: 'tiangong-pavilion',
      name: '天工阁',
      homeRegionId: 'eastern-sect-heights',
      description: '以器与阵解决难题，行事务实，讲究章法。',
      traits: ['炼器', '阵法', '务实'],
      preferredPersonalityIds: ['practical', 'meticulous', 'curious'],
      bonuses: [
        skill('forging', 1.08),
        skill('formation', 1.12),
        technique('starfallArray', 1.08)
      ],
      favoredResources: ['器胚', '阵图'],
      learningAccess: 'favored-not-exclusive'
    },
    {
      id: 'spirit-beast-mountain',
      name: '灵兽山',
      homeRegionId: 'western-sect-valley',
      description: '与灵兽共同生活，兼顾灵田，门风爽朗坦诚。',
      traits: ['御兽', '种植', '爽直'],
      preferredPersonalityIds: ['forthright', 'warm', 'free-spirited'],
      bonuses: [
        skill('beastTaming', 1.12),
        skill('farming', 1.10),
        technique('beastEcho', 1.08)
      ],
      favoredResources: ['兽粮', '灵植'],
      learningAccess: 'favored-not-exclusive'
    },
    {
      id: 'qingyin-palace',
      name: '清音宫',
      homeRegionId: 'western-sect-valley',
      description: '以符音安神解纷，重礼数，也擅长经营人情。',
      traits: ['符箓', '魅力', '调和'],
      preferredPersonalityIds: ['diplomatic', 'reserved', 'meticulous'],
      bonuses: [
        skill('talisman', 1.12),
        skill('charm', 1.08),
        technique('bindingTalisman', 1.08)
      ],
      favoredResources: ['符纸', '音玉'],
      learningAccess: 'favored-not-exclusive'
    }
  ]);

  const BY_ID = Object.create(null);
  SECTS.forEach(function (sect) {
    BY_ID[sect.id] = sect;
  });
  deepFreeze(BY_ID);

  function get(sectId) {
    if (typeof sectId !== 'string') return null;
    return Object.prototype.hasOwnProperty.call(BY_ID, sectId)
      ? BY_ID[sectId]
      : null;
  }

  function list() {
    return SECTS;
  }

  return Object.freeze({
    SECTS: SECTS,
    get: get,
    list: list
  });
});
