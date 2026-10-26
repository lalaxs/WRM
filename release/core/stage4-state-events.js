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
  else if (root) root.Stage4StateEvents = api;
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

  function normalizeNumberMap(value, minimum, maximum) {
    const result = {};
    dataKeys(value).sort().forEach(function (key) {
      if (key.length === 0) return;
      define(
        result,
        key,
        finiteNumber(dataValue(value, key), 0, minimum, maximum)
      );
    });
    return result;
  }

  function normalizePending() {
    // 待决策已删除；读档一律清空遗留 pending。
    return [];
  }

  function normalizeHistory(value) {
    return jsonArray(value).filter(function (entry) {
      return isRecord(entry);
    });
  }

  function historyTime(entry) {
    const candidates = ['at', 'createdAt', 'resolvedAt', 'fromAt'];
    for (let index = 0; index < candidates.length; index++) {
      const value = dataValue(entry, candidates[index]);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return 0;
  }

  function historyImportantIds(entry) {
    const explicit = dataValue(entry, 'importantIds');
    const result = sortedUniqueStrings(explicit);
    const seen = new Set(result);
    [
      'npcId',
      'sectId',
      'sourceNpcId',
      'targetNpcId'
    ].forEach(function (key) {
      const value = dataValue(entry, key);
      if (typeof value === 'string' &&
          value.length > 0 &&
          !seen.has(value)) {
        seen.add(value);
        result.push(value);
      }
    });
    return result;
  }

  function normalizeCompacted(value) {
    return normalizeHistory(value).map(function (entry, index) {
      return {
        id: cleanString(
          dataValue(entry, 'id'),
          'compact-existing-' + (index + 1)
        ),
        source: cleanString(dataValue(entry, 'source'), 'mixed'),
        monthIndex: finiteInteger(
          dataValue(entry, 'monthIndex'),
          0,
          0
        ),
        category: cleanString(
          dataValue(entry, 'category'),
          'world'
        ),
        count: finiteInteger(dataValue(entry, 'count'), 0, 0),
        importantIds: sortedUniqueStrings(
          dataValue(entry, 'importantIds')
        )
      };
    }).filter(function (entry) {
      return entry.count > 0;
    });
  }

  function appendCompacted(compacted, entries, source, endExclusive) {
    const groups = {};
    const groupImportantIds = new Map();
    const compactedById = new Map();
    compacted.forEach(function (entry) {
      compactedById.set(entry.id, entry);
    });
    const end = Math.min(
      entries.length,
      finiteInteger(endExclusive, entries.length, 0, entries.length)
    );
    for (let index = 0; index < end; index++) {
      const entry = entries[index];
      const monthIndex = Math.floor(historyTime(entry) / MONTH_SECONDS);
      const category = cleanString(dataValue(entry, 'category'), 'world');
      const groupKey = source + '|' + monthIndex + '|' + category;
      if (!own(groups, groupKey)) {
        define(groups, groupKey, {
          id: 'compact-' + source + '-' + monthIndex + '-' + category,
          source: source,
          monthIndex: monthIndex,
          category: category,
          count: 0,
          importantIds: []
        });
        groupImportantIds.set(groupKey, new Set());
      }
      groups[groupKey].count++;
      const importantIds = groupImportantIds.get(groupKey);
      historyImportantIds(entry).forEach(function (id) {
        if (!importantIds.has(id)) {
          importantIds.add(id);
          groups[groupKey].importantIds.push(id);
        }
      });
    }
    Object.keys(groups).sort().forEach(function (key) {
      const group = groups[key];
      const existing = compactedById.get(group.id);
      if (existing) {
        existing.count += group.count;
        const existingIds = new Set(existing.importantIds);
        group.importantIds.forEach(function (id) {
          if (!existingIds.has(id)) {
            existingIds.add(id);
            existing.importantIds.push(id);
          }
        });
      } else {
        compacted.push(group);
        compactedById.set(group.id, group);
      }
    });
  }

  function compactHistories(events) {
    const compacted = normalizeCompacted(events.compacted);
    const summaryKeepFrom = Math.max(
      0,
      events.summaries.length - SUMMARY_LIMIT
    );
    const evolutionKeepFrom = Math.max(
      0,
      events.evolution.length - EVOLUTION_LIMIT
    );
    appendCompacted(
      compacted,
      events.summaries,
      'summary',
      summaryKeepFrom
    );
    appendCompacted(
      compacted,
      events.evolution,
      'evolution',
      evolutionKeepFrom
    );
    events.summaries = events.summaries.slice(-SUMMARY_LIMIT);
    events.evolution = events.evolution.slice(-EVOLUTION_LIMIT);
    events.compacted = compacted;
    return events;
  }

  function normalizeEvents(value) {
    const source = isRecord(value) ? value : {};
    const day = isRecord(dataValue(source, 'day'))
      ? dataValue(source, 'day')
      : {};
    const events = {
      nextId: finiteInteger(dataValue(source, 'nextId'), 1, 1),
      pending: normalizePending(dataValue(source, 'pending')),
      resolvedRecent: normalizeHistory(
        dataValue(source, 'resolvedRecent')
      ).slice(-RESOLVED_RECENT_LIMIT),
      resolvedIdRanges: jsonArray(
        dataValue(source, 'resolvedIdRanges')
      ),
      summaries: normalizeHistory(dataValue(source, 'summaries')),
      evolution: normalizeHistory(dataValue(source, 'evolution')),
      compacted: normalizeCompacted(dataValue(source, 'compacted')),
      cooldowns: normalizeNumberMap(
        dataValue(source, 'cooldowns'),
        0
      ),
      day: {
        index: finiteInteger(dataValue(day, 'index'), 0, 0),
        budget: finiteInteger(dataValue(day, 'budget'), 0, 0),
        attempted: finiteInteger(dataValue(day, 'attempted'), 0, 0),
        created: finiteInteger(dataValue(day, 'created'), 0, 0)
      }
    };
    return compactHistories(events);
  }

  return Object.freeze({
    normalizeEvents: normalizeEvents,
    compactHistories: compactHistories,
    normalizePending: normalizePending,
    normalizeHistory: normalizeHistory
  });
});
