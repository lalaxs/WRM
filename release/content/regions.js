(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.RegionContent = api;
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

  const REGIONS = deepFreeze([
    {
      id: 'qinglan-town',
      name: '青岚镇',
      type: 'town',
      description: '山道与灵田之间的清静小镇，散修常在此落脚。',
      tags: ['settlement', 'farming', 'newcomer']
    },
    {
      id: 'yunzhou-city',
      name: '云州城',
      type: 'town',
      description: '商旅与修士汇集的大城，消息流转极快。',
      tags: ['settlement', 'commerce', 'social']
    },
    {
      id: 'jade-market',
      name: '琳琅坊市',
      type: 'market',
      description: '各地修士交换材料、器物与见闻的常设坊市。',
      tags: ['commerce', 'crafting', 'rumor']
    },
    {
      id: 'eastern-sect-heights',
      name: '东岭宗域',
      type: 'sectBase',
      description: '剑峰与工阁相望的宗门驻地群。',
      tags: ['sect', 'combat', 'crafting']
    },
    {
      id: 'western-sect-valley',
      name: '西谷宗域',
      type: 'sectBase',
      description: '药谷、灵兽山与清音宫相连的宗门驻地群。',
      tags: ['sect', 'herb', 'beast', 'talisman']
    },
    {
      id: 'mistwood',
      name: '雾隐林',
      type: 'wilderness',
      description: '林雾终年不散，草木与灵兽踪迹丰富。',
      tags: ['wilderness', 'herb', 'wood', 'beast']
    },
    {
      id: 'redstone-wilds',
      name: '赤岩荒原',
      type: 'wilderness',
      description: '裸露矿脉纵横的荒原，也常有危险人物出没。',
      tags: ['wilderness', 'mining', 'danger']
    },
    {
      id: 'mirror-realm',
      name: '照心秘境',
      type: 'specialRealm',
      description: '偶尔显现的特殊秘境，只通过传闻与事件进入。',
      tags: ['special', 'event', 'technique']
    }
  ]);

  const BY_ID = Object.create(null);
  REGIONS.forEach(function (region) {
    BY_ID[region.id] = region;
  });
  deepFreeze(BY_ID);

  function get(regionId) {
    if (typeof regionId !== 'string') return null;
    return Object.prototype.hasOwnProperty.call(BY_ID, regionId)
      ? BY_ID[regionId]
      : null;
  }

  function list(type) {
    if (type == null) return REGIONS;
    return deepFreeze(REGIONS.filter(function (region) {
      return region.type === type;
    }));
  }

  return Object.freeze({
    REGIONS: REGIONS,
    get: get,
    list: list
  });
});
