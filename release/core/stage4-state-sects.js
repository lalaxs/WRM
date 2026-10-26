(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./stage4-state-util.js'),
      require('../content/sects.js'),
      require('../content/sect-offices.js'),
      require('./sect-offices.js')
    )
    : factory(
      root && root.Stage4StateUtil,
      root && root.SectContent,
      root && root.SectOfficeContent,
      root && root.SectOffices
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Stage4StateSects = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Util,
  SectContent,
  SectOfficeContent,
  SectOffices
) {
  'use strict';

  const VERSION = Util.VERSION;
  const RESOLVED_RECENT_LIMIT = Util.RESOLVED_RECENT_LIMIT;
  const SUMMARY_LIMIT = Util.SUMMARY_LIMIT;
  const EVOLUTION_LIMIT = Util.EVOLUTION_LIMIT;
  const WORLD_EVENT_RETENTION = Util.WORLD_EVENT_RETENTION;
  const MONTH_SECONDS = Util.MONTH_SECONDS;
  const RELATION_KEYS = Util.RELATION_KEYS;
  const ACTIVITY_STATUSES = Util.ACTIVITY_STATUSES;
  const RELATION_TAG_IDS = Util.RELATION_TAG_IDS;
  const RELATION_ARC_STAGES = Util.RELATION_ARC_STAGES;
  const PREFERENCE_CATEGORIES = Util.PREFERENCE_CATEGORIES;
  const RESTRICTION_TYPES = Util.RESTRICTION_TYPES;
  const GENDERS = Util.GENDERS;
  const NPC_STATUSES = Util.NPC_STATUSES;
  const NPC_COMBAT_TAGS = Util.NPC_COMBAT_TAGS;
  const NPC_CONDITION_TYPES = Util.NPC_CONDITION_TYPES;
  const own = Util.own;
  const dataValue = Util.dataValue;
  const dataKeys = Util.dataKeys;
  const define = Util.define;
  const finiteNumber = Util.finiteNumber;
  const finiteInteger = Util.finiteInteger;
  const cleanString = Util.cleanString;
  const sortedUniqueStrings = Util.sortedUniqueStrings;
  const isRecord = Util.isRecord;
  const jsonRecord = Util.jsonRecord;
  const jsonArray = Util.jsonArray;
  const jsonValue = Util.jsonValue;
  const cloneJson = Util.cloneJson;
  const snapshotJsonData = Util.snapshotJsonData;
  const regionIds = Util.regionIds;
  const sectIds = Util.sectIds;
  const generationIds = Util.generationIds;
  const canonicalizeSpiritualRootId = Util.canonicalizeSpiritualRootId;
  const validSpiritualRootId = Util.validSpiritualRootId;
  const validId = Util.validId;
  const unorderedPairKey = Util.unorderedPairKey;
  const stableOptionsRecord = Util.stableOptionsRecord;
  const stableBooleanOption = Util.stableBooleanOption;

  function normalizeSectNumberMap(value) {
    const result = {};
    sectIds().forEach(function (sectId) {
      if (!own(value || {}, sectId)) return;
      define(
        result,
        sectId,
        finiteNumber(dataValue(value, sectId), 0)
      );
    });
    return result;
  }

  function normalizeSects(value, npcs) {
    const source = isRecord(value) ? value : {};
    const rawPlayer = isRecord(dataValue(source, 'player'))
      ? dataValue(source, 'player')
      : {};
    const rawRecords = isRecord(dataValue(source, 'records'))
      ? dataValue(source, 'records')
      : {};
    const records = {};
    sectIds().forEach(function (sectId) {
      const raw = isRecord(dataValue(rawRecords, sectId))
        ? dataValue(rawRecords, sectId)
        : {};
      const roles = {};
      const rawRoles = dataValue(raw, 'roleByNpcId');
      dataKeys(rawRoles).sort().forEach(function (npcId) {
        if (!own(npcs.records, npcId) ||
            npcs.records[npcId].sectId !== sectId) {
          return;
        }
        const role = cleanString(dataValue(rawRoles, npcId), null);
        if (role) define(roles, npcId, role);
      });
      const officeHolders = {};
      const rawHolders = isRecord(dataValue(raw, 'officeHolders'))
        ? dataValue(raw, 'officeHolders')
        : {};
      const slotDefs = SectOfficeContent &&
        typeof SectOfficeContent.listSlots === 'function'
        ? SectOfficeContent.listSlots(sectId)
        : [];
      slotDefs.forEach(function (slotDef) {
        const rawList = dataValue(rawHolders, slotDef.id);
        const holders = [];
        jsonArray(rawList).forEach(function (npcId) {
          if (typeof npcId !== 'string' ||
              !own(npcs.records, npcId) ||
              npcs.records[npcId].sectId !== sectId) {
            return;
          }
          if (holders.indexOf(npcId) < 0) holders.push(npcId);
        });
        define(officeHolders, slotDef.id, holders);
      });
      const leaderId = cleanString(dataValue(raw, 'leaderId'), null);
      define(records, sectId, {
        id: sectId,
        leaderId: leaderId &&
          own(npcs.records, leaderId) &&
          npcs.records[leaderId].sectId === sectId
          ? leaderId
          : null,
        roleByNpcId: roles,
        officeHolders: officeHolders,
        power: finiteNumber(dataValue(raw, 'power'), 1, 1),
        reputation: finiteNumber(dataValue(raw, 'reputation'), 0),
        lastChangedAt: finiteNumber(
          dataValue(raw, 'lastChangedAt'),
          0,
          0
        )
      });
    });
    const pairStates = {};
    const rawPairs = dataValue(source, 'pairStates');
    dataKeys(rawPairs).forEach(function (rawKey) {
      const key = unorderedPairKey(rawKey);
      if (!key || own(pairStates, key)) return;
      const pair = key.split('|');
      if (!sectIds().includes(pair[0]) || !sectIds().includes(pair[1])) {
        return;
      }
      define(pairStates, key, jsonRecord(dataValue(rawPairs, rawKey)));
    });
    return {
      player: {
        sectId: validId(
          dataValue(rawPlayer, 'sectId'),
          sectIds(),
          null
        ),
        joinedAt: dataValue(rawPlayer, 'joinedAt') == null
          ? null
          : finiteNumber(dataValue(rawPlayer, 'joinedAt'), null, 0),
        contribution: normalizeSectNumberMap(
          dataValue(rawPlayer, 'contribution')
        ),
        reputation: normalizeSectNumberMap(
          dataValue(rawPlayer, 'reputation')
        ),
        choiceEventOffered:
          dataValue(rawPlayer, 'choiceEventOffered') === true,
        choiceAvailableAt: finiteNumber(
          dataValue(rawPlayer, 'choiceAvailableAt'),
          0,
          0
        ),
        discipleRank: (function () {
          const rank = dataValue(rawPlayer, 'discipleRank');
          const office = dataValue(rawPlayer, 'officeSlotId');
          const raw = typeof rank === 'string' ? rank
            : (typeof office === 'string' ? office : 'disciple');
          const aliases = {
            outer: 'disciple',
            inner: 'disciple',
            trueDisciple: 'elder',
            true: 'elder',
            steward: 'peak',
            honor: 'leader'
          };
          const allowed = {
            disciple: true,
            elder: true,
            peak: true,
            leader: true
          };
          const mapped = aliases[raw] || raw;
          return allowed[mapped] ? mapped : 'disciple';
        })(),
        officeSlotId: (function () {
          const rank = dataValue(rawPlayer, 'discipleRank');
          const office = dataValue(rawPlayer, 'officeSlotId');
          const raw = typeof office === 'string' ? office
            : (typeof rank === 'string' ? rank : 'disciple');
          const aliases = {
            outer: 'disciple',
            inner: 'disciple',
            trueDisciple: 'elder',
            true: 'elder',
            steward: 'peak',
            honor: 'leader'
          };
          const allowed = {
            disciple: true,
            elder: true,
            peak: true,
            leader: true
          };
          const mapped = aliases[raw] || raw;
          return allowed[mapped] ? mapped : 'disciple';
        })(),
        job: (function () {
          const job = dataValue(rawPlayer, 'job');
          if (typeof job === 'number' && job >= 0 && job <= 4) return job | 0;
          const rank = dataValue(rawPlayer, 'discipleRank');
          const office = dataValue(rawPlayer, 'officeSlotId');
          const raw = typeof office === 'string' ? office
            : (typeof rank === 'string' ? rank : 'disciple');
          const map = {
            disciple: 0, elder: 1, peak: 2, leader: 3, honor: 4,
            outer: 0, inner: 0, trueDisciple: 1, true: 1, steward: 2
          };
          return typeof map[raw] === 'number' ? map[raw] : 0;
        })(),
        lifetimeContribution: finiteNumber(
          dataValue(rawPlayer, 'lifetimeContribution'),
          0,
          0
        ),
        mission: normalizeSectMission(dataValue(rawPlayer, 'mission'))
      },
      records: records,
      pairStates: pairStates
    };
  }

  function normalizeSectMission(value) {
    const source = isRecord(value) ? value : {};
    const completed = [];
    const seen = new Set();
    if (Array.isArray(dataValue(source, 'completedMissionIds'))) {
      dataValue(source, 'completedMissionIds').forEach(function (id) {
        if (typeof id !== 'string' || !id || seen.has(id)) return;
        seen.add(id);
        completed.push(id);
      });
    }
    const status = dataValue(source, 'status');
    const boardOfferIds = [];
    if (Array.isArray(dataValue(source, 'boardOfferIds'))) {
      dataValue(source, 'boardOfferIds').forEach(function (id) {
        if (typeof id === 'string' && id) boardOfferIds.push(id);
      });
    }
    const boardStatuses = {};
    const rawStatuses = dataValue(source, 'boardStatuses');
    if (isRecord(rawStatuses)) {
      dataKeys(rawStatuses).sort().forEach(function (key) {
        const value = dataValue(rawStatuses, key);
        if (value === 'available' || value === 'active' ||
            value === 'completed') {
          define(boardStatuses, key, value);
        }
      });
    }
    const combatBaselines = {};
    const rawBaselines = dataValue(source, 'combatBaselines');
    if (isRecord(rawBaselines)) {
      dataKeys(rawBaselines).sort().forEach(function (key) {
        define(
          combatBaselines,
          key,
          finiteInteger(dataValue(rawBaselines, key), 0, 0)
        );
      });
    }
    const boardResolved = {};
    const rawResolved = dataValue(source, 'boardResolved');
    if (isRecord(rawResolved)) {
      dataKeys(rawResolved).sort().forEach(function (key) {
        const row = dataValue(rawResolved, key);
        if (!isRecord(row) || typeof row.id !== 'string') return;
        define(boardResolved, key, jsonRecord(row));
      });
    }
    const activeResolvedRaw = dataValue(source, 'activeResolved');
    const activeResolved = isRecord(activeResolvedRaw) &&
      typeof dataValue(activeResolvedRaw, 'id') === 'string'
      ? jsonRecord(activeResolvedRaw)
      : null;
    return {
      missionId: cleanString(dataValue(source, 'missionId'), null),
      stepIndex: finiteInteger(dataValue(source, 'stepIndex'), 0, 0),
      status: status === 'active' ? 'active' : 'idle',
      combatKillBaseline: finiteInteger(
        dataValue(source, 'combatKillBaseline'),
        0,
        0
      ),
      combatBaselines: combatBaselines,
      completedMissionIds: completed,
      boardPeriod: finiteInteger(dataValue(source, 'boardPeriod'), -1, -1),
      boardOfferIds: boardOfferIds,
      boardStatuses: boardStatuses,
      boardResolved: boardResolved,
      activeResolved: activeResolved
    };
  }

  function benefitNumber(id) {
    const match = /^social-benefit-([1-9][0-9]*)$/.exec(id);
    return match ? finiteInteger(match[1], 0, 0) : 0;
  }

  function normalizeSocial(value) {
    const source = isRecord(value) ? value : {};
    const benefits = [];
    const seen = new Set();
    let highestId = 0;
    if (Array.isArray(dataValue(source, 'benefits'))) {
      dataValue(source, 'benefits').forEach(function (raw) {
        if (!isRecord(raw)) return;
        const id = cleanString(dataValue(raw, 'id'), null);
        const sourceNpcId = cleanString(
          dataValue(raw, 'sourceNpcId'),
          null
        );
        const effectId = cleanString(dataValue(raw, 'effectId'), null);
        if (!id || !sourceNpcId || !effectId || seen.has(id)) return;
        seen.add(id);
        highestId = Math.max(highestId, benefitNumber(id));
        benefits.push({
          id: id,
          sourceNpcId: sourceNpcId,
          effectId: effectId,
          remainingSeconds: finiteNumber(
            dataValue(raw, 'remainingSeconds'),
            0,
            0
          ),
          totalSeconds: finiteNumber(
            dataValue(raw, 'totalSeconds'),
            0,
            0
          )
        });
      });
    }
    return {
      nextBenefitId: Math.max(
        highestId + 1,
        finiteInteger(dataValue(source, 'nextBenefitId'), 1, 1)
      ),
      benefits: benefits
    };
  }

  return Object.freeze({
    normalizeSects: normalizeSects,
    normalizeSocial: normalizeSocial,
    normalizeSectNumberMap: normalizeSectNumberMap
  });
});
