(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.RealmContent = api;
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

  const REALM_ROWS = [
    ['qi-1', '练气一层', 120],
    ['qi-2', '练气二层', 120],
    ['qi-3', '练气三层', 120],
    ['qi-4', '练气四层', 120],
    ['qi-5', '练气五层', 120],
    ['qi-6', '练气六层', 120],
    ['qi-7', '练气七层', 120],
    ['qi-8', '练气八层', 120],
    ['qi-9', '练气九层', 120],
    ['foundation', '筑基', 300],
    ['gold-core', '金丹', 800],
    ['nascent-soul', '元婴', 2000],
    ['spirit-transformation', '化神', 5000],
    ['void-refining', '炼虚', 12000],
    ['body-integration', '合体', 30000],
    ['mahayana', '大乘', 80000],
    ['ascension', '飞升', null]
  ];

  const realms = {};
  REALM_ROWS.forEach(function (row, index) {
    realms[row[0]] = {
      id: row[0],
      name: row[1],
      index: index,
      lifespan: row[2]
    };
  });
  const REALMS = deepFreeze(realms);

  function gate(id, type, targetId, count) {
    return { id: id, type: type, targetId: targetId, count: count };
  }

  function transition(currentRealmId, nextRealmId, cultivationNeed, baseChance,
    pillItemId, permanentGate) {
    return {
      currentRealmId: currentRealmId,
      nextRealmId: nextRealmId,
      name: REALMS[currentRealmId].name,
      nextName: REALMS[nextRealmId].name,
      cultivationNeed: cultivationNeed,
      baseChance: baseChance,
      pillItemId: pillItemId,
      gate: permanentGate,
      nextLifespan: REALMS[nextRealmId].lifespan
    };
  }

  const TRANSITIONS = deepFreeze([
    transition('qi-1', 'qi-2', 100, 1, null,
      gate('kill:thornHare:3', 'enemyKills', 'thornHare', 3)),
    transition('qi-2', 'qi-3', 250, 1, null,
      gate('kill:grayWolf:3', 'enemyKills', 'grayWolf', 3)),
    transition('qi-3', 'qi-4', 450, 1, null,
      gate('kill:wanderingBandit:3', 'enemyKills', 'wanderingBandit', 3)),
    transition('qi-4', 'qi-5', 700, 1, null,
      gate('kill:thornHare:10', 'enemyKills', 'thornHare', 10)),
    transition('qi-5', 'qi-6', 1000, 1, null,
      gate('kill:grayWolf:10', 'enemyKills', 'grayWolf', 10)),
    transition('qi-6', 'qi-7', 1400, 1, null,
      gate('kill:wanderingBandit:10', 'enemyKills', 'wanderingBandit', 10)),
    transition('qi-7', 'qi-8', 1900, 1, null,
      gate('clear:breathCave:1', 'dungeonClears', 'breathCave', 1)),
    transition('qi-8', 'qi-9', 2500, 1, null,
      gate('clear:breathCave:3', 'dungeonClears', 'breathCave', 3)),
    transition('qi-9', 'foundation', 3000, 0.6, 'foundationPill',
      gate('clear:foundationAltar:1', 'dungeonClears', 'foundationAltar', 1)),
    transition('foundation', 'gold-core', 6000, 0.5, 'goldCorePill',
      gate('clear:goldCoreRuins:1', 'dungeonClears', 'goldCoreRuins', 1)),
    transition('gold-core', 'nascent-soul', 15000, 0.4, 'nascentSoulPill',
      gate('clear:nascentSoulTower:1', 'dungeonClears', 'nascentSoulTower', 1)),
    transition('nascent-soul', 'spirit-transformation', 40000, 0.3,
      'spiritTransformationPill',
      gate('clear:spiritTransformationPeak:1', 'dungeonClears',
        'spiritTransformationPeak', 1)),
    transition('spirit-transformation', 'void-refining', 100000, 0.25,
      'voidRefiningPill',
      gate('clear:voidRefiningRift:1', 'dungeonClears', 'voidRefiningRift', 1)),
    transition('void-refining', 'body-integration', 250000, 0.2,
      'bodyIntegrationPill',
      gate('clear:bodyIntegrationPalace:1', 'dungeonClears',
        'bodyIntegrationPalace', 1)),
    transition('body-integration', 'mahayana', 600000, 0.15,
      'mahayanaPill',
      gate('clear:mahayanaTrial:1', 'dungeonClears', 'mahayanaTrial', 1)),
    transition('mahayana', 'ascension', 1500000, 0.1, null,
      gate('clear:ascensionTrial:1', 'dungeonClears', 'ascensionTrial', 1))
  ]);

  const TRANSITION_BY_REALM_ID = {};
  TRANSITIONS.forEach(function (record) {
    TRANSITION_BY_REALM_ID[record.currentRealmId] = record;
  });
  deepFreeze(TRANSITION_BY_REALM_ID);

  function getRealm(realmId) {
    return REALMS[realmId] || null;
  }

  function getTransition(currentRealmId) {
    return TRANSITION_BY_REALM_ID[currentRealmId] || null;
  }

  return Object.freeze({
    REALMS: REALMS,
    TRANSITIONS: TRANSITIONS,
    getRealm: getRealm,
    getTransition: getTransition
  });
});
