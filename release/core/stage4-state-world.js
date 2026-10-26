(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./stage4-state-util.js'),
      require('../content/regions.js')
    )
    : factory(
      root && root.Stage4StateUtil,
      root && root.RegionContent
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Stage4StateWorld = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Util,
  RegionContent
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

  function normalizeWorldEvent(entry, index) {
    const source = isRecord(entry) ? entry : {};
    const participants = [];
    jsonArray(dataValue(source, 'participants')).forEach(function (id) {
      if (typeof id === 'string' && id.length && participants.length < 3) {
        participants.push(id);
      }
    });
    const tags = [];
    jsonArray(dataValue(source, 'tags')).forEach(function (tag) {
      if (typeof tag === 'string' && tag.length && tags.length < 12) {
        tags.push(tag);
      }
    });
    const category = cleanString(dataValue(source, 'category'), null);
    const rawEventId = dataValue(source, 'eventId');
    const parsedEventId = Number(rawEventId);
    const eventId = rawEventId == null || !Number.isFinite(parsedEventId)
      ? 0
      : Math.floor(parsedEventId);
    return {
      id: cleanString(dataValue(source, 'id'), 'we-' + (index + 1)),
      month: finiteInteger(dataValue(source, 'month'), 0, 0),
      visibleFromMonth: finiteInteger(
        dataValue(source, 'visibleFromMonth'),
        finiteInteger(dataValue(source, 'month'), 0, 0),
        0
      ),
      type: cleanString(dataValue(source, 'type'), 'meet'),
      participants: participants,
      location: cleanString(dataValue(source, 'location'), null),
      narrative: cleanString(dataValue(source, 'narrative'), ''),
      source: dataValue(source, 'source') === 'player' ? 'player' : 'world',
      category: category,
      tags: tags,
      eventId: eventId
    };
  }

  function normalizeWorld(value, cleanWorld) {
    const source = isRecord(value) ? value : {};
    const world = isRecord(cleanWorld) ? cleanWorld : {};
    world.elapsedSeconds = finiteNumber(
      dataValue(source, 'elapsedSeconds'),
      0,
      0
    );
    world.activeAccumulator = finiteNumber(
      dataValue(source, 'activeAccumulator'),
      0,
      0
    );
    world.backgroundAccumulator = finiteNumber(
      dataValue(source, 'backgroundAccumulator'),
      0,
      0
    );
    world.sectAccumulator = finiteNumber(
      dataValue(source, 'sectAccumulator'),
      0,
      0
    );
    world.eventAccumulator = finiteNumber(
      dataValue(source, 'eventAccumulator'),
      0,
      0
    );
    world.monthAccumulator = finiteNumber(
      dataValue(source, 'monthAccumulator'),
      0,
      0
    );
    const rawCalendar = isRecord(dataValue(source, 'calendar'))
      ? dataValue(source, 'calendar')
      : {};
    const appearances = {};
    const rawAppearances = dataValue(rawCalendar, 'npcYearAppearances');
    dataKeys(rawAppearances).forEach(function (npcId) {
      if (typeof npcId !== 'string') return;
      appearances[npcId] = finiteInteger(
        dataValue(rawAppearances, npcId),
        0,
        0,
        99
      );
    });
    const leapLast = {};
    const rawLeap = dataValue(rawCalendar, 'playerLeapLastMonth');
    dataKeys(rawLeap).forEach(function (npcId) {
      if (typeof npcId !== 'string') return;
      leapLast[npcId] = finiteInteger(
        dataValue(rawLeap, npcId),
        0,
        0,
        1e9
      );
    });
    world.calendar = {
      year: (function () {
        const rawYear = finiteInteger(dataValue(rawCalendar, 'year'), 1, 1);
        // 纠正早期占位默认年 342，统一从第 1 年计。
        return rawYear === 342 ? 1 : rawYear;
      })(),
      month: finiteInteger(dataValue(rawCalendar, 'month'), 1, 1, 12),
      monthAccumulator: finiteNumber(
        dataValue(rawCalendar, 'monthAccumulator'),
        finiteNumber(dataValue(source, 'monthAccumulator'), 0, 0),
        0
      ),
      yearEventBudget: finiteInteger(
        dataValue(rawCalendar, 'yearEventBudget'),
        36,
        10,
        40
      ),
      yearEventsCreated: finiteInteger(
        dataValue(rawCalendar, 'yearEventsCreated'),
        0,
        0
      ),
      monthEventsCreated: finiteInteger(
        dataValue(rawCalendar, 'monthEventsCreated'),
        0,
        0
      ),
      npcYearAppearances: appearances,
      playerLeapLastMonth: leapLast
    };
    const rawEvents = jsonArray(dataValue(source, 'worldEvents'));
    world.worldEvents = rawEvents.map(normalizeWorldEvent).slice(
      Math.max(0, rawEvents.length - WORLD_EVENT_RETENTION)
    );
    world.nextWorldEventId = finiteInteger(
      dataValue(source, 'nextWorldEventId'),
      world.worldEvents.length + 1,
      1
    );
    const rawRegions = dataValue(source, 'regions');
    const regions = {};
    regionIds().forEach(function (regionId) {
      const raw = isRecord(dataValue(rawRegions, regionId))
        ? dataValue(rawRegions, regionId)
        : {};
      define(regions, regionId, {
        prosperity: finiteInteger(
          dataValue(raw, 'prosperity'),
          50,
          0,
          100
        ),
        danger: finiteInteger(
          dataValue(raw, 'danger'),
          10,
          0,
          100
        ),
        controllingSectId: validId(
          dataValue(raw, 'controllingSectId'),
          sectIds(),
          null
        ),
        lastChangedAt: finiteNumber(
          dataValue(raw, 'lastChangedAt'),
          0,
          0
        )
      });
    });
    world.regions = regions;
    return world;
  }

  function normalizeParallel(cleanParallel) {
    const source = isRecord(cleanParallel) ? cleanParallel : { jobs: [] };
    const jobs = [];
    const seen = new Set();
    if (Array.isArray(source.jobs)) {
      source.jobs.forEach(function (job) {
        if (!isRecord(job) ||
            typeof job.id !== 'string' ||
            job.id.length === 0 ||
            seen.has(job.id)) {
          return;
        }
        seen.add(job.id);
        if (job.kind !== 'social') {
          jobs.push(jsonRecord(job));
          return;
        }
        const social = {
          id: job.id,
          kind: 'social',
          npcId: cleanString(job.npcId, ''),
          sourceEventId: cleanString(job.sourceEventId, null),
          label: cleanString(job.label, ''),
          remainingSeconds: finiteNumber(job.remainingSeconds, 0, 0),
          totalSeconds: finiteNumber(job.totalSeconds, 0, 0),
          followupTemplateId: cleanString(job.followupTemplateId, null),
          interactionId: cleanString(job.interactionId, null),
          itemId: cleanString(job.itemId, null),
          paidItemId: cleanString(job.paidItemId, null),
          actionKey: cleanString(job.actionKey, null),
          context: jsonRecord(job.context),
          ready: job.ready === true,
          completionReported: job.completionReported === true
        };
        if (own(job, 'remainingAnchorMs')) {
          social.remainingAnchorMs =
            job.remainingAnchorMs == null
              ? null
              : finiteNumber(job.remainingAnchorMs, null, 0);
        }
        if (own(job, 'remainingBaseSeconds')) {
          social.remainingBaseSeconds =
            job.remainingBaseSeconds == null
              ? null
              : finiteNumber(job.remainingBaseSeconds, null, 0);
        }
        jobs.push(social);
      });
    }
    return { jobs: jobs };
  }

  return Object.freeze({
    normalizeWorld: normalizeWorld,
    normalizeParallel: normalizeParallel,
    normalizeWorldEvent: normalizeWorldEvent
  });
});
