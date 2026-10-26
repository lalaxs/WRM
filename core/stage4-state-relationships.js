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
  else if (root) root.Stage4StateRelationships = api;
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
  const directionalPairKey = Util.directionalPairKey;
  const unorderedPairKey = Util.unorderedPairKey;
  const stableOptionsRecord = Util.stableOptionsRecord;
  const stableBooleanOption = Util.stableBooleanOption;

  function normalizeRelationships(value) {
    const source = isRecord(value) ? value : {};
    const edges = {};
    const rawEdges = dataValue(source, 'edges');
    dataKeys(rawEdges).forEach(function (key) {
      if (!directionalPairKey(key, '>')) return;
      const rawEdge = dataValue(rawEdges, key);
      const edge = {};
      RELATION_KEYS.forEach(function (metric) {
        let raw = dataValue(rawEdge, metric);
        if (metric === 'closeness' &&
            raw == null &&
            dataValue(rawEdge, 'resentment') != null) {
          raw = dataValue(rawEdge, 'resentment');
        }
        define(
          edge,
          metric,
          finiteInteger(raw, 0, 0, 100)
        );
      });
      // v5 resentment discarded; closeness defaults to 0 unless already present.
      edge.lastChangedAt = finiteNumber(
        dataValue(rawEdge, 'lastChangedAt'),
        0,
        0
      );
      define(edges, key, edge);
    });
    const bonds = {};
    const rawBonds = dataValue(source, 'bonds');
    dataKeys(rawBonds).forEach(function (rawKey) {
      const key = unorderedPairKey(rawKey);
      if (!key || own(bonds, key)) return;
      const rawBond = dataValue(rawBonds, rawKey);
      define(bonds, key, {
        stage: cleanString(
          dataValue(rawBond, 'stage'),
          'acquaintance'
        ),
        changedByEventId: cleanString(
          dataValue(rawBond, 'changedByEventId'),
          null
        ),
        changedAt: finiteNumber(
          dataValue(rawBond, 'changedAt'),
          0,
          0
        )
      });
    });
    const restrictions = {};
    const rawRestrictions = dataValue(source, 'restrictions');
    dataKeys(rawRestrictions).forEach(function (rawKey) {
      const key = unorderedPairKey(rawKey);
      const restriction = dataValue(rawRestrictions, rawKey);
      if (!key ||
          !RESTRICTION_TYPES.includes(restriction)) {
        return;
      }
      if (own(restrictions, key) &&
          RESTRICTION_TYPES.indexOf(restrictions[key]) <=
            RESTRICTION_TYPES.indexOf(restriction)) {
        return;
      }
      define(restrictions, key, restriction);
    });
    const npcAffinities = {};
    const rawAffinities = dataValue(source, 'npcAffinities');
    dataKeys(rawAffinities).forEach(function (key) {
      if (!directionalPairKey(key, '>')) return;
      const amount = finiteInteger(dataValue(rawAffinities, key), 0, -100, 100);
      if (amount !== 0) define(npcAffinities, key, amount);
    });
    const tags = {};
    const rawTags = dataValue(source, 'tags');
    dataKeys(rawTags).forEach(function (rawKey) {
      const key = unorderedPairKey(rawKey);
      if (!key || own(tags, key)) return;
      const list = [];
      const seen = {};
      jsonArray(dataValue(rawTags, rawKey)).forEach(function (tag) {
        if (typeof tag !== 'string' ||
            RELATION_TAG_IDS.indexOf(tag) < 0 ||
            seen[tag]) {
          return;
        }
        seen[tag] = true;
        list.push(tag);
      });
      if (list.length) define(tags, key, list);
    });
    const arcs = {};
    const rawArcs = dataValue(source, 'arcs');
    dataKeys(rawArcs).forEach(function (rawKey) {
      const key = unorderedPairKey(rawKey);
      if (!key || own(arcs, key)) return;
      const rawArc = dataValue(rawArcs, rawKey);
      if (!isRecord(rawArc)) return;
      const stage = cleanString(dataValue(rawArc, 'stage'), null);
      if (!stage || RELATION_ARC_STAGES.indexOf(stage) < 0) return;
      define(arcs, key, {
        stage: stage,
        lastEventMonth: finiteInteger(
          dataValue(rawArc, 'lastEventMonth'),
          0,
          0,
          1e9
        ),
        lastChronicleMonth: finiteInteger(
          dataValue(rawArc, 'lastChronicleMonth'),
          0,
          0,
          1e9
        ),
        eventCount: finiteInteger(
          dataValue(rawArc, 'eventCount'),
          0,
          0,
          1e6
        ),
        romanceBeat: [
          'none',
          'courting',
          'gifted',
          'jealous',
          'confessed',
          'bonded'
        ].indexOf(cleanString(dataValue(rawArc, 'romanceBeat'), 'none')) >= 0
          ? cleanString(dataValue(rawArc, 'romanceBeat'), 'none')
          : 'none'
      });
    });
    return {
      edges: edges,
      bonds: bonds,
      restrictions: restrictions,
      npcAffinities: npcAffinities,
      tags: tags,
      arcs: arcs
    };
  }

  return Object.freeze({
    normalizeRelationships: normalizeRelationships
  });
});
