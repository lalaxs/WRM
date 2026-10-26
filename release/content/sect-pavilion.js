(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.SectPavilionContent = api;
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

  /**
   * 玩家与 NPC 共用原版职阶（弟子→长老→峰主→掌门）。
   * 比原版多的是：玩家可用贡献/任务主动申请升阶；突破时也会按 retjob 同步。
   * 藏宝阁只售本宗功法；门槛看职阶，价格看贡献。
   */
  const RANKS = deepFreeze([
    {
      id: 'disciple',
      order: 20,
      label: '弟子',
      shortLabel: '弟子',
      minContribution: 0,
      minMissions: 0,
      minRealm: 0,
      job: 0
    },
    {
      id: 'elder',
      order: 70,
      label: '长老',
      shortLabel: '长老',
      minContribution: 40,
      minMissions: 2,
      minRealm: 6,
      job: 1
    },
    {
      id: 'peak',
      order: 80,
      label: '峰主',
      shortLabel: '峰主',
      minContribution: 120,
      minMissions: 5,
      minRealm: 7,
      job: 2
    },
    {
      id: 'leader',
      order: 100,
      label: '掌门',
      shortLabel: '掌门',
      minContribution: 260,
      minMissions: 10,
      minRealm: 8,
      job: 3
    }
  ]);

  // 旧外门/内门/真传/执事 → 原版职阶
  const RANK_ALIASES = deepFreeze({
    outer: 'disciple',
    inner: 'disciple',
    trueDisciple: 'elder',
    true: 'elder',
    steward: 'peak',
    honor: 'leader'
  });

  const RANK_BY_ID = Object.create(null);
  RANKS.forEach(function (row) {
    RANK_BY_ID[row.id] = row;
  });
  deepFreeze(RANK_BY_ID);

  function offer(techniqueId, cost, minRank, options) {
    const opts = options || {};
    return {
      techniqueId: techniqueId,
      contributionCost: cost,
      minRank: minRank,
      minRealm: Math.max(0, Math.floor(Number(opts.minRealm) || 0)),
      repeatXp: opts.repeatXp === true
    };
  }

  // 各宗藏宝阁：弟子可兑入门；长老/峰主/掌门递进。
  const CATALOG = deepFreeze({
    'taixuan-sword': [
      offer('cloudPiercingSword', 35, 'disciple', { minRealm: 1 }),
      offer('returningWaveSword', 30, 'disciple', { minRealm: 1 }),
      offer('swordHeart', 45, 'elder', { minRealm: 1 }),
      offer('flowingLightThirteen', 90, 'elder', { minRealm: 3 }),
      offer('flyingSwordChase', 85, 'elder', { minRealm: 3 }),
      offer('supremeMysticSword', 140, 'peak', { minRealm: 5 }),
      offer('myriadSwordsSky', 160, 'leader', { minRealm: 5 })
    ],
    'baicao-valley': [
      offer('stopBleedArt', 30, 'disciple', { minRealm: 1 }),
      offer('boneCorrosionNeedle', 35, 'disciple', { minRealm: 1 }),
      offer('medicalMind', 45, 'elder', { minRealm: 1 }),
      offer('clearSpringArt', 80, 'elder', { minRealm: 3 }),
      offer('bonePoisonMist', 90, 'elder', { minRealm: 3 }),
      offer('woodVitalityArt', 85, 'elder', { minRealm: 3 }),
      offer('witheredSpring', 150, 'peak', { minRealm: 5 })
    ],
    'tiangong-pavilion': [
      offer('spiritArmorArray', 30, 'disciple', { minRealm: 1 }),
      offer('flameThunderArray', 35, 'disciple', { minRealm: 1 }),
      offer('earthArrayHeart', 45, 'elder', { minRealm: 1 }),
      offer('fourSymbolsWard', 80, 'elder', { minRealm: 3 }),
      offer('starfallArray', 95, 'elder', { minRealm: 3 }),
      offer('spiritLockMechanism', 90, 'elder', { minRealm: 3 }),
      offer('heavenlyNetLock', 150, 'leader', { minRealm: 5 })
    ],
    'spirit-beast-mountain': [
      offer('beastWard', 30, 'disciple', { minRealm: 1 }),
      offer('beastCommandRoar', 35, 'disciple', { minRealm: 1 }),
      offer('sharedFateBond', 45, 'elder', { minRealm: 1 }),
      offer('beastEcho', 80, 'elder', { minRealm: 3 }),
      offer('lifeFeedback', 85, 'elder', { minRealm: 3 }),
      offer('beastWarSpirit', 90, 'elder', { minRealm: 3 }),
      offer('hundredBeastRush', 150, 'leader', { minRealm: 5 })
    ],
    'qingyin-palace': [
      offer('calmingMelody', 30, 'disciple', { minRealm: 1 }),
      offer('crescentSoundBlade', 35, 'disciple', { minRealm: 1 }),
      offer('clearMindScore', 45, 'elder', { minRealm: 1 }),
      offer('purifyingMelody', 80, 'elder', { minRealm: 3 }),
      offer('tearingSevenStrings', 90, 'elder', { minRealm: 3 }),
      offer('springRiverHarmony', 85, 'elder', { minRealm: 3 }),
      offer('highMountainsFlowingWater', 150, 'peak', { minRealm: 5 })
    ]
  });

  function canonicalizeRankId(rankId) {
    if (typeof rankId !== 'string' || !rankId) return 'disciple';
    if (RANK_ALIASES[rankId]) return RANK_ALIASES[rankId];
    if (RANK_BY_ID[rankId]) return rankId;
    return 'disciple';
  }

  function getRank(rankId) {
    return RANK_BY_ID[canonicalizeRankId(rankId)] || RANK_BY_ID.disciple;
  }

  function listRanks() {
    return RANKS;
  }

  function resolveOfficeContent() {
    if (typeof globalThis !== 'undefined' && globalThis.SectOfficeContent) {
      return globalThis.SectOfficeContent;
    }
    if (typeof require === 'function') {
      try { return require('./sect-offices.js'); } catch (e) { /* ignore */ }
    }
    return null;
  }

  // 下一阶：与本宗 office 席一致（无峰主席的宗门跳过峰主）。
  function nextRank(rankId, sectId) {
    const current = getRank(rankId);
    const offices = resolveOfficeContent();
    for (let i = 0; i < RANKS.length; i++) {
      const row = RANKS[i];
      if (row.order <= current.order) continue;
      if (sectId && offices && typeof offices.getSlot === 'function') {
        if (row.id !== 'disciple' && !offices.getSlot(sectId, row.id)) {
          continue;
        }
      }
      return row;
    }
    return null;
  }

  function listOffers(sectId) {
    if (typeof sectId !== 'string') return [];
    return CATALOG[sectId] || [];
  }

  function getOffer(sectId, techniqueId) {
    const rows = listOffers(sectId);
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].techniqueId === techniqueId) return rows[i];
    }
    return null;
  }

  return Object.freeze({
    RANKS: RANKS,
    RANK_ALIASES: RANK_ALIASES,
    CATALOG: CATALOG,
    canonicalizeRankId: canonicalizeRankId,
    getRank: getRank,
    listRanks: listRanks,
    nextRank: nextRank,
    listOffers: listOffers,
    getOffer: getOffer
  });
});
