(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./stage4-state-util.js')
    )
    : factory(
      root && root.Stage4StateUtil
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Stage4StateLineage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Util
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
  const stableOptionsRecord = Util.stableOptionsRecord;
  const stableBooleanOption = Util.stableBooleanOption;

  function normalizeInheritanceHall(value) {
    const source = isRecord(value) ? value : {};
    const rawPlan = isRecord(dataValue(source, 'plan'))
      ? dataValue(source, 'plan')
      : {};
    return {
      level: 1,
      plan: {
        fullMasteryIds: sortedUniqueStrings(
          dataValue(rawPlan, 'fullMasteryIds')
        ).slice(0, 3),
        techniqueIds: sortedUniqueStrings(
          dataValue(rawPlan, 'techniqueIds')
        ).slice(0, 2),
        equipmentItemIds: sortedUniqueStrings(
          dataValue(rawPlan, 'equipmentItemIds')
        ).slice(0, 1),
        resourceItemIds: sortedUniqueStrings(
          dataValue(rawPlan, 'resourceItemIds')
        ).slice(0, 3)
      }
    };
  }

  function normalizeLineage(value, npcs) {
    const source = isRecord(value) ? value : {};
    const descendants = {};
    const rawDescendants = dataValue(source, 'descendants');
    dataKeys(rawDescendants).sort().forEach(function (npcId) {
      if (!own(npcs.records, npcId)) return;
      const raw = isRecord(dataValue(rawDescendants, npcId))
        ? dataValue(rawDescendants, npcId)
        : {};
      define(descendants, npcId, {
        npcId: npcId,
        playerLifeId: cleanString(
          dataValue(raw, 'playerLifeId'),
          'life-1'
        ),
        partnerNpcId: cleanString(
          dataValue(raw, 'partnerNpcId'),
          null
        ),
        ritualId: cleanString(dataValue(raw, 'ritualId'), null),
        bornAt: finiteNumber(dataValue(raw, 'bornAt'), 0, 0),
        adultAt: dataValue(raw, 'adultAt') == null
          ? null
          : finiteNumber(dataValue(raw, 'adultAt'), null, 0)
      });
    });
    const rituals = [];
    const rawRituals = dataValue(source, 'rituals');
    if (Array.isArray(rawRituals)) {
      rawRituals.slice(-100).forEach(function (raw) {
        if (!isRecord(raw)) return;
        const id = cleanString(dataValue(raw, 'id'), null);
        const partnerNpcId = cleanString(
          dataValue(raw, 'partnerNpcId'),
          null
        );
        if (!id || !partnerNpcId) return;
        rituals.push({
          id: id,
          playerLifeId: cleanString(
            dataValue(raw, 'playerLifeId'),
            'life-1'
          ),
          partnerNpcId: partnerNpcId,
          startedAt: finiteNumber(dataValue(raw, 'startedAt'), 0, 0),
          completedAt: dataValue(raw, 'completedAt') == null
            ? null
            : finiteNumber(dataValue(raw, 'completedAt'), null, 0),
          childNpcId: cleanString(dataValue(raw, 'childNpcId'), null),
          status: ['active', 'completed', 'cancelled'].includes(
            dataValue(raw, 'status')
          ) ? dataValue(raw, 'status') : 'active'
        });
      });
    }
    const pending = dataValue(source, 'pendingTransition');
    return {
      nextLifeId: finiteInteger(dataValue(source, 'nextLifeId'), 2, 2),
      nextRitualId: finiteInteger(
        dataValue(source, 'nextRitualId'),
        1,
        1
      ),
      nextTransitionId: finiteInteger(
        dataValue(source, 'nextTransitionId'),
        1,
        1
      ),
      descendants: descendants,
      rituals: rituals,
      lives: jsonArray(dataValue(source, 'lives')),
      pendingTransition: isRecord(pending) ? jsonRecord(pending) : null
    };
  }

  return Object.freeze({
    normalizeLineage: normalizeLineage,
    normalizeInheritanceHall: normalizeInheritanceHall
  });
});
