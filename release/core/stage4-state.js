(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./stage3-state.js'),
      require('./stage4-state-util.js'),
      require('./stage4-state-npc.js'),
      require('./stage4-state-relationships.js'),
      require('./stage4-state-events.js'),
      require('./stage4-state-sects.js'),
      require('./stage4-state-world.js'),
      require('./stage4-state-lineage.js'),
      require('../content/regions.js'),
      require('../content/sects.js'),
      require('../content/npc-generation.js'),
      require('./npc-generator.js'),
      require('./npc-roster.js'),
      require('../content/social-interactions.js'),
      require('../content/sect-offices.js'),
      require('./sect-offices.js'),
      require('./person-factory.js')
    )
    : factory(
      root && root.Stage3State,
      root && root.Stage4StateUtil,
      root && root.Stage4StateNpc,
      root && root.Stage4StateRelationships,
      root && root.Stage4StateEvents,
      root && root.Stage4StateSects,
      root && root.Stage4StateWorld,
      root && root.Stage4StateLineage,
      root && root.RegionContent,
      root && root.SectContent,
      root && root.NpcGenerationContent,
      root && root.NpcGenerator,
      root && root.NpcRoster,
      root && root.SocialInteractionContent,
      root && root.SectOfficeContent,
      root && root.SectOffices,
      root && root.PersonFactory
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Stage4State = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Stage3State,
  Util,
  Stage4StateNpc,
  Stage4StateRelationships,
  Stage4StateEvents,
  Stage4StateSects,
  Stage4StateWorld,
  Stage4StateLineage,
  RegionContent,
  SectContent,
  NpcGenerationContent,
  NpcGenerator,
  NpcRoster,
  SocialInteractionContent,
  SectOfficeContent,
  SectOffices,
  PersonFactory
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

  const normalizePlayer = Stage4StateNpc.normalizePlayer;
  const normalizeNpcSystem = Stage4StateNpc.normalizeNpcSystem;
  const normalizeTeamCombat = Stage4StateNpc.normalizeTeamCombat;
  const normalizeRelationships = Stage4StateRelationships.normalizeRelationships;
  const normalizeEvents = Stage4StateEvents.normalizeEvents;
  const compactHistories = Stage4StateEvents.compactHistories;
  const normalizeSects = Stage4StateSects.normalizeSects;
  const normalizeSocial = Stage4StateSects.normalizeSocial;
  const normalizeWorld = Stage4StateWorld.normalizeWorld;
  const normalizeParallel = Stage4StateWorld.normalizeParallel;
  const normalizeLineage = Stage4StateLineage.normalizeLineage;
  const normalizeInheritanceHall = Stage4StateLineage.normalizeInheritanceHall;

  function defaultSectRecords() {
    const records = {};
    sectIds().forEach(function (sectId) {
      define(records, sectId, {
        id: sectId,
        leaderId: null,
        roleByNpcId: {},
        officeHolders: {},
        power: 1,
        reputation: 0,
        lastChangedAt: 0
      });
    });
    return records;
  }

  function defaultRegions() {
    const regions = {};
    regionIds().forEach(function (regionId) {
      define(regions, regionId, {
        prosperity: 50,
        danger: 10,
        controllingSectId: null,
        lastChangedAt: 0
      });
    });
    return regions;
  }

  function defaults() {
    return {
      player: {
        identity: { gender: 'female' },
        regionId: 'qinglan-town',
        spiritualRootId: 'single',
        flags: { completedFirstAction: false },
        lifecycle: {
          currentLifeId: 'life-1',
          generation: 1,
          source: 'founder',
          sourceNpcId: null,
          ageYears: 18,
          ageRemainderSeconds: 0,
          status: 'active',
          pendingCause: null,
          startedAt: 0
        }
      },
      systems: {
        npcs: {
          nextId: 1,
          activeTarget: 40,
          records: {},
          activeIds: [],
          backgroundIds: [],
          backgroundCursor: 0
        },
        relationships: {
          edges: {},
          bonds: {},
          restrictions: {},
          npcAffinities: {},
          tags: {},
          arcs: {}
        },
        events: {
          nextId: 1,
          pending: [],
          resolvedRecent: [],
          resolvedIdRanges: [],
          summaries: [],
          evolution: [],
          compacted: [],
          cooldowns: {},
          day: {
            index: 0,
            budget: 0,
            attempted: 0,
            created: 0
          }
        },
        sects: {
          player: {
            sectId: null,
            joinedAt: null,
            contribution: {},
            reputation: {},
            choiceEventOffered: false,
            choiceAvailableAt: 0,
            discipleRank: 'disciple',
            officeSlotId: 'disciple',
            job: 0,
            lifetimeContribution: 0,
            mission: {
              missionId: null,
              stepIndex: 0,
              status: 'idle',
              combatKillBaseline: 0,
              combatBaselines: {},
              completedMissionIds: [],
              boardPeriod: -1,
              boardOfferIds: [],
              boardStatuses: {},
              boardResolved: {},
              activeResolved: null
            }
          },
          records: defaultSectRecords(),
          pairStates: {}
        },
        social: {
          nextBenefitId: 1,
          benefits: []
        },
        teamCombat: {
          companionIds: [null, null, null],
          reactionLog: []
        },
        lineage: {
          nextLifeId: 2,
          nextRitualId: 1,
          nextTransitionId: 1,
          descendants: {},
          rituals: [],
          lives: [],
          pendingTransition: null
        },
        world: {
          elapsedSeconds: 0,
          activeAccumulator: 0,
          backgroundAccumulator: 0,
          sectAccumulator: 0,
          eventAccumulator: 0,
          monthAccumulator: 0,
          nextWorldEventId: 1,
          worldEvents: [],
          calendar: {
            year: 1,
            month: 1,
            monthAccumulator: 0,
            yearEventBudget: 36,
            yearEventsCreated: 0,
            monthEventsCreated: 0,
            npcYearAppearances: {},
            playerLeapLastMonth: {}
          },
          regions: defaultRegions()
        }
      }
    };
  }

  function normalize(model, options) {
    const source = jsonRecord(model);
    const rawPlayer = isRecord(dataValue(source, 'player'))
      ? dataValue(source, 'player')
      : null;
    const rawSystems = isRecord(dataValue(source, 'systems'))
      ? dataValue(source, 'systems')
      : {};
    let clean = Stage3State.normalize(source, {
      preserveLegacyFields: stableBooleanOption(
        options,
        'preserveLegacyFields'
      )
    });
    normalizePlayer(rawPlayer || {}, clean.player);
    const npcs = normalizeNpcSystem(dataValue(rawSystems, 'npcs'));
    clean.systems.npcs = npcs;
    clean.systems.teamCombat = normalizeTeamCombat(
      dataValue(rawSystems, 'teamCombat'),
      npcs
    );
    clean.systems.relationships = normalizeRelationships(
      dataValue(rawSystems, 'relationships')
    );
    clean.systems.events = normalizeEvents(dataValue(rawSystems, 'events'));
    clean.systems.sects = normalizeSects(
      dataValue(rawSystems, 'sects'),
      npcs
    );
    clean.systems.social = normalizeSocial(
      dataValue(rawSystems, 'social')
    );
    clean.systems.lineage = normalizeLineage(
      dataValue(rawSystems, 'lineage'),
      npcs
    );
    if (!isRecord(clean.systems.homestead)) {
      clean.systems.homestead = {};
    }
    clean.systems.homestead.inheritanceHall =
      normalizeInheritanceHall(
        dataValue(
          dataValue(rawSystems, 'homestead'),
          'inheritanceHall'
        )
      );
    clean.systems.parallel = normalizeParallel(clean.systems.parallel);
    clean.systems.world = normalizeWorld(
      dataValue(rawSystems, 'world'),
      clean.systems.world
    );
    migrateSocialMainActionToQueue(clean);
    // clean is already a fresh normalized tree; rebalance in place.
    if (NpcRoster &&
        typeof NpcRoster.rebalanceInPlace === 'function') {
      NpcRoster.rebalanceInPlace(clean, {
        target: clean.systems.npcs.activeTarget
      });
    } else if (NpcRoster &&
        typeof NpcRoster.rebalance === 'function') {
      const rebalanced = NpcRoster.rebalance(clean, {
        target: clean.systems.npcs.activeTarget
      });
      if (rebalanced) clean = rebalanced;
    }
    // 已有人口但玩家圈子为空时不再全图补种；圈子只靠 creatperson* / 偶遇扩。
    clean = ensureSectOffices(clean);
    // reconcile 可能补写宗门领袖等人物；再过一遍 NPC normalize，保证字段幂等。
    clean.systems.npcs = normalizeNpcSystem(clean.systems.npcs);
    return clean;
  }

  function livingNpcNeedsOffice(person) {
    if (!person || person.status !== 'living' || person.lifeStage === 'child') {
      return false;
    }
    if (person.sectId) {
      return typeof person.officeSlotId !== 'string' ||
        !person.officeSlotId;
    }
    return typeof person.rogueTitleId !== 'string' || !person.rogueTitleId;
  }

  function sectHasVacantOffice(model) {
    if (!SectOfficeContent ||
        typeof SectOfficeContent.listSlots !== 'function') {
      return false;
    }
    const sects = model && model.systems && model.systems.sects &&
      model.systems.sects.records;
    if (!sects) return false;
    return Object.keys(sects).some(function (sectId) {
      const record = sects[sectId];
      const holders = record && record.officeHolders
        ? record.officeHolders
        : {};
      const slots = SectOfficeContent.listSlots(sectId) || [];
      return slots.some(function (slot) {
        if (slot.pool) return false;
        const capacity = Math.max(1, Math.floor(Number(slot.capacity) || 1));
        const filled = Array.isArray(holders[slot.id])
          ? holders[slot.id].length
          : 0;
        return filled < capacity;
      });
    });
  }

  function ensureSectOffices(model) {
    if (!SectOffices || typeof SectOffices.reconcile !== 'function') {
      return model;
    }
    const records = model && model.systems && model.systems.npcs &&
      model.systems.npcs.records;
    if (!records) return model;
    const needs = Object.keys(records).some(function (id) {
      return livingNpcNeedsOffice(records[id]);
    }) || sectHasVacantOffice(model);
    if (!needs) return model;
    const result = SectOffices.reconcile(model, { inPlace: true });
    return result && result.ok ? result.state : model;
  }

  // 旧版主动社交占主行动：迁移进并行队列，避免与主挂机抢槽。
  function migrateSocialMainActionToQueue(clean) {
    const current = isRecord(clean.current) ? clean.current : null;
    const key = current && typeof current.key === 'string'
      ? current.key
      : null;
    if (!key || key.indexOf('social:') !== 0) return;
    const actionKey = normalizeActionKey(key);
    if (!actionKey) {
      clean.current = null;
      return;
    }
    const parts = actionKey.split(':');
    const npcId = parts[1];
    const interactionId = parts[2];
    const itemId = interactionId === 'gift' ? parts[3] : null;
    const content = SocialInteractionContent &&
      typeof SocialInteractionContent.get === 'function'
      ? SocialInteractionContent.get(interactionId)
      : null;
    const total = content && Number.isFinite(content.durationSeconds)
      ? content.durationSeconds
      : 0;
    const elapsed = Math.max(0, finiteNumber(current.elapsed, 0, 0));
    const remaining = Math.max(0, total - elapsed);
    if (!clean.systems.parallel ||
        !Array.isArray(clean.systems.parallel.jobs)) {
      clean.systems.parallel = { jobs: [] };
    }
    const already = clean.systems.parallel.jobs.some(function (job) {
      return job && job.kind === 'social' && job.actionKey === actionKey;
    });
    if (!already && total > 0) {
      const person = clean.systems.npcs &&
        clean.systems.npcs.records &&
        clean.systems.npcs.records[npcId];
      const name = person && person.identity && person.identity.name
        ? person.identity.name
        : '对方';
      const label = content &&
        SocialInteractionContent &&
        typeof SocialInteractionContent.getNarrative === 'function'
        ? SocialInteractionContent.getNarrative(interactionId, 'progress', {
          name: name,
          pronoun: person && person.identity &&
            person.identity.gender === 'male' ? '他' : '她'
        })
        : (content && content.label
          ? content.label.replace('某人', name)
          : '社交');
      clean.systems.parallel.jobs.push({
        id: 'social-job-migrated-' + actionKey.replace(/:/g, '-'),
        kind: 'social',
        npcId: npcId,
        sourceEventId: null,
        label: label,
        remainingSeconds: remaining,
        totalSeconds: total,
        followupTemplateId: null,
        interactionId: interactionId,
        itemId: itemId,
        paidItemId: null,
        actionKey: actionKey,
        context: {},
        ready: remaining <= 0,
        completionReported: false
      });
    }
    clean.current = null;
  }

  function npcRecordCount(systems) {
    const npcs = isRecord(systems) ? dataValue(systems, 'npcs') : null;
    const records = isRecord(npcs) ? dataValue(npcs, 'records') : null;
    return isRecord(records) ? dataKeys(records).length : 0;
  }

  function resolveBootstrapWorld(options) {
    const certifiedOptions = stableOptionsRecord(options);
    const injectedBootstrap = dataValue(
      certifiedOptions,
      'bootstrapWorld'
    );
    const defaultBootstrap = dataValue(NpcGenerator, 'bootstrap');
    return typeof injectedBootstrap === 'function'
      ? injectedBootstrap
      : defaultBootstrap;
  }

  function applyBootstrapResult(candidate, result) {
    if (!isRecord(result)) return candidate;
    if (!isRecord(candidate.systems)) candidate.systems = {};
    candidate.systems.npcs = {
      nextId: dataValue(result, 'nextId'),
      activeTarget: 40,
      records: dataValue(result, 'records'),
      activeIds: [],
      backgroundIds: [],
      backgroundCursor: 0
    };
    const nextSeed = dataValue(result, 'rngState');
    if (Number.isInteger(nextSeed) &&
        nextSeed > 0 &&
        nextSeed <= 0xFFFFFFFF) {
      candidate.rngState = nextSeed;
    }
    return candidate;
  }

  // 空人物池时按关系造人开局（对标 creatperson*），不再 bootstrap 全图陌生人。
  // 若 options.bootstrapWorld 显式注入（自测），仍走旧注入路径。
  function ensureWorldPopulation(model, options) {
    const candidate = jsonRecord(model);
    if (npcRecordCount(candidate.systems) > 0) {
      // 已有人口：仍补写缺失的开局结识见闻（旧档常只剩一条「踏入旅途」）。
      if (PersonFactory &&
          typeof PersonFactory.ensureOpeningMeetStories === 'function') {
        return PersonFactory.ensureOpeningMeetStories(candidate);
      }
      return candidate;
    }
    const certifiedOptions = stableOptionsRecord(options) || {};
    const bootstrapWorld = resolveBootstrapWorld(options);
    const injectedBootstrap = dataValue(certifiedOptions, 'bootstrapWorld');
    if (typeof injectedBootstrap === 'function') {
      const count = NpcGenerationContent &&
        NpcGenerationContent.GENERATION_RULES
        ? NpcGenerationContent.GENERATION_RULES.bootstrapCount
        : 120;
      const result = bootstrapWorld({
        count: count,
        rngState: candidate.rngState,
        content: Object.freeze({
          regions: RegionContent,
          sects: SectContent,
          generation: NpcGenerationContent
        })
      });
      return applyBootstrapResult(candidate, result);
    }
    if (PersonFactory && typeof PersonFactory.seedOpeningWorld === 'function') {
      // 敌对/失效 options（revoked proxy 等）已在 certifiedOptions 被丢弃。
      return PersonFactory.seedOpeningWorld(candidate, certifiedOptions);
    }
    if (typeof bootstrapWorld !== 'function') {
      return candidate;
    }
    const count = NpcGenerationContent &&
      NpcGenerationContent.GENERATION_RULES
      ? NpcGenerationContent.GENERATION_RULES.bootstrapCount
      : 120;
    const result = bootstrapWorld({
      count: count,
      rngState: candidate.rngState,
      content: Object.freeze({
        regions: RegionContent,
        sects: SectContent,
        generation: NpcGenerationContent
      })
    });
    return applyBootstrapResult(candidate, result);
  }

  // 新人生：整池清空后按开局流程重生人物与结构关系（不继承上一世 NPC）。
  function reseedWorldPopulation(model, options) {
    const candidate = jsonRecord(model);
    if (!isRecord(candidate.systems)) candidate.systems = {};
    const activeTarget = isRecord(candidate.systems.npcs) &&
      Number.isFinite(candidate.systems.npcs.activeTarget)
      ? Math.max(1, Math.floor(candidate.systems.npcs.activeTarget))
      : 40;
    candidate.systems.npcs = {
      nextId: 1,
      activeTarget: activeTarget,
      records: {},
      activeIds: [],
      backgroundIds: [],
      backgroundCursor: 0
    };
    candidate.systems.relationships = {
      edges: {},
      bonds: {},
      restrictions: {},
      npcAffinities: {},
      tags: {},
      arcs: {}
    };
    candidate.systems.events = {
      nextId: 1,
      pending: [],
      resolvedRecent: [],
      resolvedIdRanges: [],
      summaries: [],
      evolution: [],
      compacted: [],
      cooldowns: {},
      day: {
        index: 0,
        budget: 0,
        attempted: 0,
        created: 0
      }
    };
    if (isRecord(candidate.systems.teamCombat)) {
      candidate.systems.teamCombat.companionIds = [null, null, null];
      candidate.systems.teamCombat.reactionLog = [];
    }
    if (isRecord(candidate.systems.social)) {
      candidate.systems.social.benefits = [];
    }
    if (isRecord(candidate.systems.sects)) {
      candidate.systems.sects.records = defaultSectRecords();
      candidate.systems.sects.pairStates = {};
      candidate.systems.sects.player = {
        sectId: null,
        joinedAt: null,
        contribution: {},
        reputation: {},
        choiceEventOffered: false,
        choiceAvailableAt: 0,
        discipleRank: 'disciple',
        officeSlotId: 'disciple',
        job: 0,
        lifetimeContribution: 0,
        mission: {
          missionId: null,
          stepIndex: 0,
          status: 'idle',
          combatKillBaseline: 0,
          combatBaselines: {},
          completedMissionIds: [],
          boardPeriod: -1,
          boardOfferIds: [],
          boardStatuses: {},
          boardResolved: {},
          activeResolved: null
        }
      };
    }
    if (isRecord(candidate.systems.lineage)) {
      candidate.systems.lineage.descendants = {};
      candidate.systems.lineage.rituals = [];
    }
    if (isRecord(candidate.player)) {
      candidate.player.kin = {
        fa: null,
        mo: null,
        par: null,
        frs: [],
        ens: []
      };
      candidate.player.parentIds = [];
      candidate.player.metPlayer = false;
    }
    if (isRecord(candidate.systems.world)) {
      const world = candidate.systems.world;
      // 新世界时钟归零：否则上一世累计秒数/月累加器会在转世后继续补算，
      // 让新刷的 NPC 瞬间集体坐化，并灌进大事记。
      world.elapsedSeconds = 0;
      world.activeAccumulator = 0;
      world.backgroundAccumulator = 0;
      world.sectAccumulator = 0;
      world.eventAccumulator = 0;
      world.monthAccumulator = 0;
      world.worldEvents = [];
      world.nextWorldEventId = 1;
      if (isRecord(world.calendar)) {
        world.calendar.year = 1;
        world.calendar.month = 1;
        world.calendar.monthAccumulator = 0;
        world.calendar.yearEventsCreated = 0;
        world.calendar.monthEventsCreated = 0;
        world.calendar.npcYearAppearances = {};
        world.calendar.playerLeapLastMonth = {};
      }
    }
    return normalize(ensureWorldPopulation(candidate, options), options);
  }

  function sameJson(left, right) {
    try {
      return JSON.stringify(left) === JSON.stringify(right);
    } catch (error) {
      return false;
    }
  }

  function validate(model) {
    const source = jsonRecord(model);
    if (dataValue(source, 'schemaVersion') !== VERSION) {
      return false;
    }
    return sameJson(source, jsonRecord(normalize(source)));
  }

  function compactEventHistory(model) {
    const clean = normalize(model);
    clean.systems.events = compactHistories(clean.systems.events);
    return clean;
  }

  // 保留合法社交主行动键，避免存档规范化时被当成 legacy 清掉并弹出空离线报告。
  const SOCIAL_KEY_PART = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  function normalizeActionKey(key) {
    if (typeof key !== 'string' || key.length === 0) return null;
    const parts = key.split(':');
    if (parts.length < 3 || parts.length > 4 || parts[0] !== 'social') {
      return null;
    }
    if (!SOCIAL_KEY_PART.test(parts[1]) || !SOCIAL_KEY_PART.test(parts[2])) {
      return null;
    }
    if (!SocialInteractionContent ||
        typeof SocialInteractionContent.get !== 'function' ||
        !SocialInteractionContent.get(parts[2])) {
      return null;
    }
    const gift = parts[2] === 'gift';
    if ((gift && parts.length !== 4) || (!gift && parts.length !== 3)) {
      return null;
    }
    if (gift && !SOCIAL_KEY_PART.test(parts[3])) return null;
    return key;
  }

  return Object.freeze({
    VERSION: VERSION,
    defaults: defaults,
    ensureWorldPopulation: ensureWorldPopulation,
    reseedWorldPopulation: reseedWorldPopulation,
    normalize: normalize,
    normalizeActionKey: normalizeActionKey,
    validate: validate,
    compactEventHistory: compactEventHistory,
    snapshotJsonData: snapshotJsonData
  });
});
