(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./stage4-state-util.js'),
      require('./equipment.js'),
      require('../content/equipment.js'),
      require('../content/npc-generation.js'),
      require('../content/sect-offices.js'),
      require('../content/regions.js')
    )
    : factory(
      root && root.Stage4StateUtil,
      root && root.Equipment,
      root && root.EquipmentContent,
      root && root.NpcGenerationContent,
      root && root.SectOfficeContent,
      root && root.RegionContent
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Stage4StateNpc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Util,
  Equipment,
  EquipmentContent,
  NpcGenerationContent,
  SectOfficeContent,
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

  function normalizePlayer(source, cleanPlayer) {
    if (!isRecord(cleanPlayer)) return cleanPlayer;
    const rawFlags = jsonRecord(dataValue(source, 'flags'));
    rawFlags.completedFirstAction =
      dataValue(dataValue(source, 'flags'), 'completedFirstAction') === true;
    cleanPlayer.identity = { gender: 'female' };
    cleanPlayer.regionId = validId(
      dataValue(source, 'regionId'),
      regionIds(),
      'qinglan-town'
    );
    cleanPlayer.flags = jsonRecord(rawFlags);
    cleanPlayer.spiritualRootId = validSpiritualRootId(
      dataValue(source, 'spiritualRootId')
    );
    cleanPlayer.kin = normalizeKin(dataValue(source, 'kin'));
    cleanPlayer.familyId = cleanString(dataValue(source, 'familyId'), null);
    const rawLifecycle = isRecord(dataValue(source, 'lifecycle'))
      ? dataValue(source, 'lifecycle')
      : {};
    const lifecycleStatus = dataValue(rawLifecycle, 'status');
    cleanPlayer.lifecycle = {
      currentLifeId: cleanString(
        dataValue(rawLifecycle, 'currentLifeId'),
        'life-1'
      ),
      generation: finiteInteger(
        dataValue(rawLifecycle, 'generation'),
        1,
        1
      ),
      source: [
        'founder',
        'descendant',
        'newIdentity'
      ].includes(dataValue(rawLifecycle, 'source'))
        ? dataValue(rawLifecycle, 'source')
        : 'founder',
      sourceNpcId: cleanString(
        dataValue(rawLifecycle, 'sourceNpcId'),
        null
      ),
      ageYears: finiteInteger(
        dataValue(rawLifecycle, 'ageYears'),
        18,
        0
      ),
      ageRemainderSeconds: finiteNumber(
        dataValue(rawLifecycle, 'ageRemainderSeconds'),
        0,
        0
      ),
      status: [
        'active',
        'safety_buffer',
        'transition_pending'
      ].includes(lifecycleStatus) ? lifecycleStatus : 'active',
      pendingCause: [
        'lifespan',
        'voluntary',
        'ascension'
      ].includes(dataValue(rawLifecycle, 'pendingCause'))
        ? dataValue(rawLifecycle, 'pendingCause')
        : null,
      startedAt: finiteNumber(
        dataValue(rawLifecycle, 'startedAt'),
        0,
        0
      )
    };
    if (Number.isFinite(cleanPlayer.shouyuan) &&
        cleanPlayer.shouyuan <= 1 &&
        cleanPlayer.lifecycle.status === 'active') {
      cleanPlayer.lifecycle.status = 'safety_buffer';
      cleanPlayer.lifecycle.pendingCause = 'lifespan';
    }
    if (isRecord(cleanPlayer.mastery) && own(cleanPlayer.mastery, 'charm')) {
      delete cleanPlayer.mastery.charm;
    }
    return cleanPlayer;
  }

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

  function safePublicId(value, fallback) {
    return typeof value === 'string' &&
      /^(?!__proto__$)(?!prototype$)(?!constructor$)[A-Za-z0-9._:-]{1,128}$/.test(value)
      ? value
      : fallback;
  }

  function normalizeNpcStats(value) {
    const result = {};
    const source = isRecord(value) ? value : {};
    [
      'maxHp', 'maxQi', 'attack', 'defense', 'accuracy', 'evasion',
      'critChance', 'critDamage', 'actionIntervalTicks',
      'damageReduction', 'healingPower', 'healingTaken', 'shieldPower',
      'qiRegen', 'controlAccuracy', 'controlResistance', 'ailmentPower',
      'ailmentResistance', 'cleansePower', 'threatGain', 'protectionWeight'
    ].forEach(function (key) {
      const amount = dataValue(source, key);
      if (Number.isFinite(amount)) define(result, key, amount);
    });
    return result;
  }

  function normalizeNpcEquipmentSlot(value) {
    if (!isRecord(value)) return null;
    return {
      id: safePublicId(dataValue(value, 'id'), 'npc-gear'),
      name: cleanString(dataValue(value, 'name'), '随身法器'),
      tags: sortedUniqueStrings(dataValue(value, 'tags')).filter(function (tag) {
        return NPC_COMBAT_TAGS.indexOf(tag) >= 0;
      }),
      stats: normalizeNpcStats(dataValue(value, 'stats'))
    };
  }

  function normalizeNpcCondition(value) {
    const source = isRecord(value) ? value : {};
    const type = NPC_CONDITION_TYPES.indexOf(dataValue(source, 'type')) >= 0
      ? dataValue(source, 'type')
      : 'always';
    if (type === 'selfHpBelow' || type === 'selfQiAbove' ||
        type === 'allyHpBelow' || type === 'enemyHpBelow') {
      return {
        type: type,
        threshold: finiteNumber(dataValue(source, 'threshold'), 0.5, 0.01, 1)
      };
    }
    if (type === 'enemyHasStatus') {
      return { type: type, statusId: safePublicId(dataValue(source, 'statusId'), 'stun') };
    }
    if (type === 'selfMissingBuff') {
      return { type: type, buffId: safePublicId(dataValue(source, 'buffId'), 'guard') };
    }
    return { type: 'always' };
  }

  function normalizeNpcTechniqueSlot(value) {
    if (!isRecord(value)) return null;
    const techniqueId = safePublicId(dataValue(value, 'techniqueId'), null);
    if (!techniqueId) return null;
    return {
      techniqueId: techniqueId,
      level: finiteInteger(dataValue(value, 'level'), 1, 1, 20),
      condition: normalizeNpcCondition(dataValue(value, 'condition'))
    };
  }

  function normalizeNpcPassiveSlot(value) {
    if (!isRecord(value)) return null;
    const techniqueId = safePublicId(dataValue(value, 'techniqueId'), null);
    if (!techniqueId) return null;
    return {
      techniqueId: techniqueId,
      level: finiteInteger(dataValue(value, 'level'), 1, 1, 20)
    };
  }

  function normalizeNpcSupply(value) {
    if (!isRecord(value)) return null;
    return {
      id: safePublicId(dataValue(value, 'id'), 'npc-supply'),
      label: cleanString(dataValue(value, 'label'), '随身补给'),
      heal: finiteNumber(dataValue(value, 'heal'), 0, 0),
      restoreQi: finiteNumber(dataValue(value, 'restoreQi'), 0, 0),
      shieldMaxHpRatio: finiteNumber(dataValue(value, 'shieldMaxHpRatio'), 0, 0, 1),
      triggerRatio: finiteNumber(dataValue(value, 'triggerRatio'), 0.5, 0.05, 0.95)
    };
  }

  function normalizeNpcCombatProfile(value) {
    const source = isRecord(value) ? value : {};
    const preferenceTags = sortedUniqueStrings(dataValue(source, 'preferenceTags'))
      .filter(function (tag) { return NPC_COMBAT_TAGS.indexOf(tag) >= 0; });
    return {
      preferenceTags: preferenceTags,
      equipment: {
        weapon: normalizeNpcEquipmentSlot(dataValue(dataValue(source, 'equipment'), 'weapon')),
        armor: normalizeNpcEquipmentSlot(dataValue(dataValue(source, 'equipment'), 'armor')),
        accessory: normalizeNpcEquipmentSlot(dataValue(dataValue(source, 'equipment'), 'accessory'))
      },
      activeTechniques: jsonArray(dataValue(source, 'activeTechniques'))
        .map(normalizeNpcTechniqueSlot).filter(Boolean).slice(0, 4),
      passiveTechniques: jsonArray(dataValue(source, 'passiveTechniques'))
        .map(normalizeNpcPassiveSlot).filter(Boolean).slice(0, 3),
      supplies: {
        food: normalizeNpcSupply(dataValue(dataValue(source, 'supplies'), 'food')),
        pill: normalizeNpcSupply(dataValue(dataValue(source, 'supplies'), 'pill')),
        talisman: normalizeNpcSupply(dataValue(dataValue(source, 'supplies'), 'talisman'))
      },
      sourceEvents: sortedUniqueStrings(dataValue(source, 'sourceEvents'))
        .filter(function (id) { return safePublicId(id, null) === id; })
        .slice(0, 20)
    };
  }

  function normalizeNpcCombatEquipment(value) {
    const source = isRecord(value) ? value : {};
    const slots = EquipmentContent &&
      Array.isArray(EquipmentContent.SLOTS)
      ? EquipmentContent.SLOTS
      : [
        'weapon', 'head', 'robe', 'bracer',
        'belt', 'boots', 'accessory', 'artifact'
      ];
    const instances = [];
    const byId = {};
    jsonArray(dataValue(source, 'instances')).forEach(function (raw) {
      const instance = Equipment &&
        typeof Equipment.normalizeInstance === 'function'
        ? Equipment.normalizeInstance(raw)
        : null;
      if (!instance || own(byId, instance.instanceId)) return;
      byId[instance.instanceId] = instance;
      instances.push(instance);
    });
    const rawMap = isRecord(dataValue(source, 'equipment'))
      ? dataValue(source, 'equipment')
      : {};
    const equipment = {};
    slots.forEach(function (slot) {
      const instanceId = safePublicId(dataValue(rawMap, slot), null);
      const instance = instanceId && byId[instanceId];
      const resolved = instance && Equipment &&
        typeof Equipment.resolve === 'function'
        ? Equipment.resolve(instance)
        : null;
      equipment[slot] = resolved && resolved.slot === slot
        ? instanceId
        : null;
    });
    return {
      version: 1,
      instances: instances,
      equipment: equipment
    };
  }

  function normalizeKin(raw) {
    const source = isRecord(raw) ? raw : {};
    function cleanPersonRef(value) {
      const id = cleanString(value, null);
      if (!id) return null;
      if (id === 'player' || /^npc-/.test(id)) return id;
      return null;
    }
    return {
      fa: cleanPersonRef(dataValue(source, 'fa')),
      mo: cleanPersonRef(dataValue(source, 'mo')),
      par: cleanPersonRef(dataValue(source, 'par')),
      frs: sortedUniqueStrings(dataValue(source, 'frs'))
        .filter(function (id) {
          return id === 'player' || /^npc-/.test(id);
        }),
      ens: sortedUniqueStrings(dataValue(source, 'ens'))
        .filter(function (id) {
          return id === 'player' || /^npc-/.test(id);
        })
    };
  }

  function normalizeNpc(raw, recordId) {
    const source = isRecord(raw) ? raw : {};
    const rawIdentity = isRecord(dataValue(source, 'identity'))
      ? dataValue(source, 'identity')
      : {};
    const rawAppearance = isRecord(dataValue(rawIdentity, 'appearance'))
      ? dataValue(rawIdentity, 'appearance')
      : {};
    const statusValue = dataValue(source, 'status');
    const status = NPC_STATUSES.includes(statusValue)
      ? statusValue
      : 'living';
    const rawSkills = dataValue(source, 'skills');
    const skills = {};
    dataKeys(rawSkills).sort().forEach(function (skillId) {
      define(
        skills,
        skillId,
        finiteInteger(dataValue(rawSkills, skillId), 0, 0)
      );
    });
    const inventorySource = isRecord(
      dataValue(source, 'inventorySummary')
    ) ? dataValue(source, 'inventorySummary') : {};
    const genders = GENDERS;
    const personalities = generationIds('PERSONALITY_PROFILES', 'steady');
    const valueProfiles = generationIds('VALUE_PROFILES', 'benevolent');
    const talents = generationIds('TALENTS', 'wood-spirit');
    const principles = generationIds(
      'ROMANCE_PRINCIPLES',
      'negotiable'
    );
    const daoHeartTraits = generationIds('DAO_HEART_TRAITS', 'loyal');
    return {
      id: recordId,
      identity: {
        name: cleanString(dataValue(rawIdentity, 'name'), recordId),
        gender: validId(
          dataValue(rawIdentity, 'gender'),
          genders,
          'female'
        ),
        appearance: {
          buildId: cleanString(
            dataValue(rawAppearance, 'buildId'),
            'slender'
          ),
          faceId: cleanString(
            dataValue(rawAppearance, 'faceId'),
            'clear-face'
          ),
          hairId: cleanString(
            dataValue(rawAppearance, 'hairId'),
            'long-black'
          ),
          featureId: cleanString(
            dataValue(rawAppearance, 'featureId'),
            'quiet-eyes'
          )
        }
      },
      ageYears: finiteInteger(dataValue(source, 'ageYears'), 0, 0),
      lifeStage: dataValue(source, 'lifeStage') === 'child'
        ? 'child'
        : 'adult',
      ageRemainderSeconds: finiteNumber(
        dataValue(source, 'ageRemainderSeconds'),
        0,
        0
      ),
      lifespanYears: finiteNumber(
        dataValue(source, 'lifespanYears'),
        28,
        0
      ),
      realmStage: finiteInteger(
        dataValue(source, 'realmStage'),
        0,
        0
      ),
      cultivation: finiteNumber(
        dataValue(source, 'cultivation'),
        0,
        0
      ),
      // 原版别名（与 realmStage/cultivation 双写；缺省时由修炼模块补齐）
      level_l: finiteInteger(dataValue(source, 'level_l'), 0, 0, 9),
      level_s: finiteInteger(dataValue(source, 'level_s'), 0, 0, 20),
      exp1: finiteNumber(dataValue(source, 'exp1'), 0, 0),
      history: (function () {
        const rows = [];
        jsonArray(dataValue(source, 'history')).forEach(function (row) {
          if (!Array.isArray(row) || !row.length) return;
          rows.push(row.slice(0, 6));
        });
        return rows.slice(-80);
      })(),
      cultivationEfficiency: (function () {
        const raw = finiteNumber(
          dataValue(source, 'cultivationEfficiency'),
          0,
          0
        );
        if (raw > 0) return Math.round(raw * 100) / 100;
        const stage = finiteInteger(
          dataValue(source, 'realmStage'),
          0,
          0
        );
        const rootId = validSpiritualRootId(
          dataValue(source, 'spiritualRootId')
        );
        if (NpcGenerationContent &&
            typeof NpcGenerationContent.cultivationEfficiencyFor ===
              'function') {
          return NpcGenerationContent.cultivationEfficiencyFor(
            stage,
            rootId,
            0.5
          );
        }
        return Math.round((0.6 + stage * 1.8 + stage * stage * 1.6) * 100) /
          100;
      })(),
      spiritualRootId: validSpiritualRootId(
        dataValue(source, 'spiritualRootId')
      ),
      talentId: validId(
        dataValue(source, 'talentId'),
        talents,
        talents[0]
      ),
      personalityId: validId(
        dataValue(source, 'personalityId'),
        personalities,
        personalities[0]
      ),
      valueProfileId: validId(
        dataValue(source, 'valueProfileId'),
        valueProfiles,
        valueProfiles[0]
      ),
      romancePrincipleId: validId(
        dataValue(source, 'romancePrincipleId'),
        principles,
        principles[0]
      ),
      traits: (function () {
        const raw = sortedUniqueStrings(dataValue(source, 'traits'))
          .filter(function (id) { return daoHeartTraits.indexOf(id) >= 0; })
          .slice(0, 2);
        if (raw.length > 0) return raw;
        // 旧档无 traits：按 id 哈希派生 1~2 个稳定标签（同档结果一致）。
        let hash = 0;
        const seed = String(recordId || '');
        for (let index = 0; index < seed.length; index++) {
          hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
        }
        const first = daoHeartTraits[hash % daoHeartTraits.length];
        const second = daoHeartTraits[
          ((hash >>> 4) + 3) % daoHeartTraits.length
        ];
        return second !== first ? [first, second] : [first];
      })(),
      parentIds: sortedUniqueStrings(dataValue(source, 'parentIds'))
        .filter(function (id) {
          return id === 'player' || /^npc-/.test(id);
        })
        .slice(0, 2),
      mentorNpcId: (function () {
        const mentorId = cleanString(
          dataValue(source, 'mentorNpcId'),
          null
        );
        if (!mentorId || mentorId === recordId) return null;
        if (mentorId === 'player' || /^npc-/.test(mentorId)) return mentorId;
        return null;
      })(),
      regionId: validId(
        dataValue(source, 'regionId'),
        regionIds(),
        'qinglan-town'
      ),
      sectId: validId(
        dataValue(source, 'sectId'),
        sectIds(),
        null
      ),
      officeSlotId: (function () {
        const sectId = validId(
          dataValue(source, 'sectId'),
          sectIds(),
          null
        );
        const slotId = dataValue(source, 'officeSlotId');
        if (!sectId || typeof slotId !== 'string') return null;
        if (!SectOfficeContent ||
            typeof SectOfficeContent.getSlot !== 'function') {
          return null;
        }
        const slot = SectOfficeContent.getSlot(sectId, slotId);
        return slot ? slot.id : null;
      })(),
      rogueTitleId: (function () {
        const sectId = validId(
          dataValue(source, 'sectId'),
          sectIds(),
          null
        );
        if (sectId) return null;
        const titleId = dataValue(source, 'rogueTitleId');
        if (typeof titleId !== 'string') return null;
        return SectOfficeContent &&
          typeof SectOfficeContent.getRogueTitle === 'function' &&
          SectOfficeContent.getRogueTitle(titleId)
          ? titleId
          : null;
      })(),
      familyId: cleanString(dataValue(source, 'familyId'), null),
      skills: skills,
      techniques: sortedUniqueStrings(dataValue(source, 'techniques')),
      combatEquipment: normalizeNpcCombatEquipment(
        dataValue(source, 'combatEquipment')
      ),
      combatProfile: normalizeNpcCombatProfile(dataValue(source, 'combatProfile')),
      spiritPet: (function () {
        const raw = dataValue(source, 'spiritPet');
        if (!raw || typeof raw !== 'object') return null;
        const stage = raw.stage === 'formed' || raw.stage === 'young' ||
          raw.stage === 'egg'
          ? raw.stage
          : 'young';
        return {
          stage: stage,
          youngName: typeof raw.youngName === 'string' ? raw.youngName : null,
          formName: typeof raw.formName === 'string' ? raw.formName : null,
          speciesHint: raw.speciesHint === 'phoenix' ? 'phoenix' : 'dragon',
          bondedAtMonth: finiteInteger(raw.bondedAtMonth, 0, 0)
        };
      })(),
      inventorySummary: {
        wealthTier: finiteInteger(
          dataValue(inventorySource, 'wealthTier'),
          0,
          0
        ),
        notableItemIds: sortedUniqueStrings(
          dataValue(inventorySource, 'notableItemIds')
        )
      },
      biography: (function () {
        // 开局经历只保留出身；旧档 pregame 旧事不再展示/落盘。
        return jsonArray(dataValue(source, 'biography')).filter(function (entry) {
          if (!entry || typeof entry !== 'object') return true;
          return entry.type !== 'pregame';
        }).map(function (entry) {
          if (!entry || typeof entry !== 'object' || entry.type !== 'origin') {
            return entry;
          }
          if (typeof entry.text === 'string' &&
              entry.text.indexOf('自此在修行路上留下姓名') >= 0 &&
              typeof entry.regionId === 'string') {
            const region = RegionContent &&
              typeof RegionContent.get === 'function'
              ? RegionContent.get(entry.regionId)
              : null;
            const name = region && region.name
              ? region.name
              : entry.text.replace(/^出生于/, '').replace(/，.*$/, '').replace(/。$/, '');
            return Object.assign({}, entry, {
              text: '出生于' + name + '。'
            });
          }
          return entry;
        });
      })(),
      keyEventIds: sortedUniqueStrings(dataValue(source, 'keyEventIds')),
      status: status,
      activityStatus: ACTIVITY_STATUSES.indexOf(
        dataValue(source, 'activityStatus')
      ) >= 0
        ? dataValue(source, 'activityStatus')
        : 'normal',
      birthdayMonth: finiteInteger(
        dataValue(source, 'birthdayMonth'),
        1,
        1,
        12
      ),
      birthdayDay: finiteInteger(
        dataValue(source, 'birthdayDay'),
        1,
        1,
        28
      ),
      metPlayer: dataValue(source, 'metPlayer') === true,
      kin: normalizeKin(dataValue(source, 'kin')),
      preferences: (function () {
        const raw = isRecord(dataValue(source, 'preferences'))
          ? dataValue(source, 'preferences')
          : {};
        const loveItemIds = sortedUniqueStrings(
          dataValue(raw, 'loveItemIds')
        ).slice(0, 2);
        const likeCategories = [];
        jsonArray(dataValue(raw, 'likeCategories')).forEach(function (cat) {
          if (typeof cat === 'string' &&
              PREFERENCE_CATEGORIES.indexOf(cat) >= 0 &&
              likeCategories.indexOf(cat) < 0 &&
              likeCategories.length < 2) {
            likeCategories.push(cat);
          }
        });
        if (likeCategories.length === 0 && loveItemIds.length === 0) {
          let hash = 0;
          const seed = String(recordId || '');
          for (let index = 0; index < seed.length; index++) {
            hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
          }
          const first = PREFERENCE_CATEGORIES[
            hash % PREFERENCE_CATEGORIES.length
          ];
          const second = PREFERENCE_CATEGORIES[
            ((hash >>> 4) + 3) % PREFERENCE_CATEGORIES.length
          ];
          likeCategories.push(first);
          if (second !== first) likeCategories.push(second);
        }
        const dislike = dataValue(raw, 'dislikeCategory');
        return {
          loveItemIds: loveItemIds,
          likeCategories: likeCategories,
          dislikeCategory: typeof dislike === 'string' &&
            PREFERENCE_CATEGORIES.indexOf(dislike) >= 0
            ? dislike
            : null
        };
      })(),
      lifecycle: jsonRecord(dataValue(source, 'lifecycle')),
      lastDetailedAt: finiteNumber(
        dataValue(source, 'lastDetailedAt'),
        0,
        0
      ),
      lastBackgroundAt: finiteNumber(
        dataValue(source, 'lastBackgroundAt'),
        0,
        0
      )
    };
  }

  function npcNumber(id) {
    const match = /^npc-([1-9][0-9]*)$/.exec(id);
    return match ? finiteInteger(match[1], 0, 0) : 0;
  }

  function normalizeNpcSystem(value) {
    const source = isRecord(value) ? value : {};
    const rawRecords = dataValue(source, 'records');
    const records = {};
    let highestId = 0;
    dataKeys(rawRecords).sort().forEach(function (recordId) {
      if (recordId.length === 0) return;
      define(records, recordId, normalizeNpc(
        dataValue(rawRecords, recordId),
        recordId
      ));
      highestId = Math.max(highestId, npcNumber(recordId));
    });
    const living = Object.keys(records).filter(function (id) {
      return records[id].status === 'living' &&
        records[id].lifeStage !== 'child';
    });
    const activeTarget = finiteInteger(
      dataValue(source, 'activeTarget'),
      40,
      30,
      50
    );
    const activeIds = [];
    const backgroundIds = [];
    const assigned = new Set();
    function assign(input, target) {
      if (!Array.isArray(input)) return;
      input.forEach(function (id) {
        if (typeof id !== 'string' ||
            assigned.has(id) ||
            !own(records, id) ||
            records[id].status !== 'living') {
          return;
        }
        if (target === activeIds && activeIds.length >= activeTarget) {
          backgroundIds.push(id);
        } else {
          target.push(id);
        }
        assigned.add(id);
      });
    }
    assign(dataValue(source, 'activeIds'), activeIds);
    assign(dataValue(source, 'backgroundIds'), backgroundIds);
    living.forEach(function (id) {
      if (assigned.has(id)) return;
      if (activeIds.length < activeTarget) activeIds.push(id);
      else backgroundIds.push(id);
      assigned.add(id);
    });
    const rawNextId = finiteInteger(
      dataValue(source, 'nextId'),
      highestId + 1,
      1
    );
    return {
      nextId: Math.max(highestId + 1, rawNextId),
      activeTarget: activeTarget,
      records: records,
      activeIds: activeIds,
      backgroundIds: backgroundIds,
      backgroundCursor: backgroundIds.length === 0
        ? 0
        : finiteInteger(
          dataValue(source, 'backgroundCursor'),
          0,
          0,
          backgroundIds.length - 1
        )
    };
  }

  function normalizeTeamCombat(value, npcs) {
    const source = isRecord(value) ? value : {};
    const rawIds = Array.isArray(dataValue(source, 'companionIds'))
      ? dataValue(source, 'companionIds')
      : [];
    const companionIds = [0, 1, 2].map(function (index) {
      const id = rawIds[index];
      return typeof id === 'string' &&
        own(npcs.records, id) &&
        npcs.records[id].status === 'living'
        ? id
        : null;
    });
    const reactionLog = jsonArray(dataValue(source, 'reactionLog')).map(function (entry, index) {
      const npcId = cleanString(dataValue(entry, 'npcId'), null);
      return {
        id: cleanString(dataValue(entry, 'id'), 'team-reaction-' + (index + 1)),
        npcId: npcId && own(npcs.records, npcId) ? npcId : null,
        dangerLevel: cleanString(dataValue(entry, 'dangerLevel'), 'safe'),
        atMs: finiteNumber(dataValue(entry, 'atMs'), 0, 0),
        affectionDelta: finiteInteger(dataValue(entry, 'affectionDelta'), 0, -100, 100),
        trustDelta: finiteInteger(dataValue(entry, 'trustDelta'), 0, -100, 100)
      };
    }).filter(function (entry) {
      return entry.npcId !== null;
    }).slice(-50);
    return { companionIds: companionIds, reactionLog: reactionLog };
  }

  return Object.freeze({
    normalizePlayer: normalizePlayer,
    normalizeNpc: normalizeNpc,
    normalizeNpcSystem: normalizeNpcSystem,
    normalizeTeamCombat: normalizeTeamCombat,
    normalizeKin: normalizeKin
  });
});
