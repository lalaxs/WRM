(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../content/items.js'),
      require('../content/life-skills.js'),
      require('../content/gathering.js'),
      require('../content/recipes.js'),
      require('../content/homestead.js'),
      require('./equipment.js')
    );
  } else if (root) {
    root.Stage2State = factory(
      root.ItemContent,
      root.LifeSkillContent,
      root.GatheringContent,
      root.RecipeContent,
      root.HomesteadContent,
      root.Equipment
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  ItemContent,
  LifeSkillContent,
  GatheringContent,
  RecipeContent,
  HomesteadContent,
  Equipment
) {
  'use strict';

  const BASE_INVENTORY_CAPACITY = 40;
  const BASE_FISH_STOCK = 20;
  const BASE_FISH_RECOVERY_SECONDS = 60;
  const SKILL_MAX_LEVEL = 99;
  const RESOURCE_SKILLS = Object.freeze([
    'herb', 'mining', 'woodcutting'
  ]);
  const CAPACITY_GRANT_SOURCES = Object.freeze([
    'shop', 'achievement', 'task'
  ]);
  const BINDING_PURPOSES = Object.freeze([
    'equipment', 'task', 'formation'
  ]);
  const RESOURCE_ALIASES = Object.freeze({
    yaocai: 'herbBundle',
    lingkuang: 'oreBundle',
    muliao: 'woodBundle',
    shicai: 'foodBundle'
  });
  const PILL_ALIASES = Object.freeze({
    heal: 'healingPill',
    tupo: 'foundationPill',
    jindan: 'goldCorePill',
    yuanying: 'nascentSoulPill',
    huashen: 'spiritTransformationPill',
    lianxu: 'voidRefiningPill',
    heti: 'bodyIntegrationPill',
    dasheng: 'mahayanaPill'
  });
  const SKILL_ALIASES = Object.freeze({
    caiyao: 'herb',
    caiju: 'mining',
    caijing: 'mining',
    famu: 'woodcutting',
    diaoyu: 'fishing',
    liandan: 'alchemy',
    lianqi: 'forging',
    chuyi: 'cooking',
    fulu: 'talisman',
    meili: 'charm',
    yushou: 'beastTaming',
    zhongzhi: 'farming',
    zhenfa: 'formation'
  });
  const ACTION_ALIASES = Object.freeze({
    caiyao: 'gather:explore:herb',
    caijing: 'gather:explore:mining',
    famu: 'gather:explore:woodcutting',
    diaoyu: 'fish:pond',
    liandan_tupo: 'produce:alchemy:foundationPill',
    liandan_heal: 'produce:alchemy:healingPill',
    liandan_jindan: 'produce:alchemy:goldCorePill',
    liandan_yuanying: 'produce:alchemy:nascentSoulPill',
    liandan_huashen: 'produce:alchemy:spiritTransformationPill',
    lianqi_jian: 'produce:forging:ironSword',
    lianqi_jia: 'produce:forging:silverArmor',
    chuyi: 'produce:cooking:spiritRiceMeal',
    fulu: 'produce:talisman:wardTalisman'
  });

  function isRecord(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      if (prototype === null) return true;
      if (Object.getPrototypeOf(prototype) !== null) return false;
      const constructor = Object.prototype.hasOwnProperty.call(
        prototype,
        'constructor'
      ) ? prototype.constructor : null;
      return typeof constructor === 'function' &&
        Function.prototype.toString.call(constructor) ===
          Function.prototype.toString.call(Object);
    } catch (error) {
      return false;
    }
  }

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function define(target, key, value) {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }

  function finiteNumber(value, fallback, minimum, maximum) {
    if (value == null) return fallback;
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(
      maximum == null ? Infinity : maximum,
      Math.max(minimum == null ? -Infinity : minimum, number)
    );
  }

  function finiteInteger(value, fallback, minimum, maximum) {
    return Math.floor(finiteNumber(value, fallback, minimum, maximum));
  }

  function cleanId(value, fallback) {
    return typeof value === 'string' && value.trim().length > 0
      ? value
      : fallback;
  }

  function cleanString(value, fallback) {
    return typeof value === 'string' ? value : fallback;
  }

  function cloneJson(value, fallback) {
    if (value == null) return fallback;
    try {
      return JSON.parse(JSON.stringify(value, function (key, item) {
        if (typeof item === 'number' && !Number.isFinite(item)) return 0;
        return item;
      }));
    } catch (error) {
      return fallback;
    }
  }

  function cloneRecord(value) {
    if (!isRecord(value)) return {};
    const clone = cloneJson(value, null);
    return isRecord(clone) ? clone : {};
  }

  function cloneArray(value) {
    const clone = cloneJson(value, null);
    return Array.isArray(clone) ? clone : [];
  }

  function levelRecord(value) {
    const source = isRecord(value) ? value : {};
    const level = finiteInteger(
      own(source, 'level') ? source.level : source.lv,
      1,
      1,
      SKILL_MAX_LEVEL
    );
    return {
      level,
      xp: level === SKILL_MAX_LEVEL
        ? 0
        : finiteInteger(source.xp, 0, 0)
    };
  }

  function archivedLevelRecord(value) {
    const source = isRecord(value) ? value : {};
    return {
      level: finiteInteger(
        own(source, 'level') ? source.level : source.lv,
        1,
        1,
        SKILL_MAX_LEVEL
      ),
      xp: finiteInteger(source.xp, 0, 0)
    };
  }

  function masteryKey(skillId, masteryId) {
    const prefix = skillId + ':';
    return masteryId.indexOf(prefix) === 0
      ? masteryId.slice(prefix.length)
      : masteryId;
  }

  function directResourceEntry(skillId, entryId) {
    return !!GatheringContent.getEntry(skillId, entryId);
  }

  function canonicalResourceEntryId(skillId, entryId) {
    if (typeof skillId !== 'string' || typeof entryId !== 'string') {
      return null;
    }
    if (directResourceEntry(skillId, entryId)) return entryId;
    if (typeof GatheringContent.resolveEntryId === 'function') {
      const resolved = GatheringContent.resolveEntryId(skillId, entryId);
      if (resolved && directResourceEntry(skillId, resolved)) {
        return resolved;
      }
    }
    return null;
  }

  function mergeLevelRecord(existing, incoming) {
    if (!isRecord(existing)) return incoming;
    if (incoming.level > existing.level) return incoming;
    if (incoming.level < existing.level) return existing;
    return incoming.xp > existing.xp ? incoming : existing;
  }

  function masteryIds() {
    const result = {};
    Object.keys(LifeSkillContent.SKILLS).forEach(function (skillId) {
      if (skillId !== 'charm') define(result, skillId, []);
    });

    RESOURCE_SKILLS.forEach(function (skillId) {
      const family = GatheringContent.GATHERING[skillId];
      if (family.explore) result[skillId].push(
        masteryKey(skillId, family.explore.masteryId)
      );
      family.entries.forEach(function (entry) {
        result[skillId].push(masteryKey(skillId, entry.masteryId));
      });
    });
    Object.keys(GatheringContent.FISH_SPECIES).forEach(function (speciesId) {
      result.fishing.push(speciesId);
    });
    Object.values(RecipeContent.RECIPES).forEach(function (recipe) {
      result[recipe.skillId].push(
        masteryKey(recipe.skillId, recipe.masteryId)
      );
    });
    Object.keys(HomesteadContent.CROPS).forEach(function (cropId) {
      result.farming.push(cropId);
    });
    Object.keys(HomesteadContent.BEASTS).forEach(function (speciesId) {
      result.beastTaming.push(speciesId);
    });

    Object.keys(result).forEach(function (skillId) {
      result[skillId] = Array.from(new Set(result[skillId]));
    });
    return result;
  }

  const MASTERY_IDS = masteryIds();

  function createSkills() {
    const result = {};
    Object.keys(LifeSkillContent.SKILLS).forEach(function (skillId) {
      define(result, skillId, { level: 1, xp: 0 });
    });
    return result;
  }

  function createMastery() {
    const result = {};
    Object.keys(MASTERY_IDS).forEach(function (skillId) {
      const records = {};
      MASTERY_IDS[skillId].forEach(function (contentId) {
        define(records, contentId, { level: 1, xp: 0 });
      });
      define(result, skillId, records);
    });
    return result;
  }

  function emptyPlot(index) {
    return {
      id: 'plot-' + (index + 1),
      cropId: null,
      remainingSeconds: 0,
      totalSeconds: 0,
      ready: false
    };
  }

  function createFarm(plotCount) {
    const unlockedPlots = finiteInteger(plotCount, 3, 0);
    const plots = [];
    for (let index = 0; index < unlockedPlots; index++) {
      plots.push(emptyPlot(index));
    }
    return { unlockedPlots, plots };
  }

  function createGathering() {
    const fishStocks = {};
    Object.keys(GatheringContent.FISH_SPECIES).forEach(function (speciesId) {
      define(fishStocks, speciesId, BASE_FISH_STOCK);
    });
    return {
      nextSpotId: 1,
      spots: { herb: null, mining: null, woodcutting: null },
      fishStocks,
      fishRecoverAcc: 0,
      fishRecoverAnchorMs: null,
      fishRecoverBaseSeconds: null,
      fishingUnlocks: {
        secretCove: false,
        berserkShoal: false
      }
    };
  }

  function createHomestead() {
    return {
      farm: createFarm(3),
      formations: { slots: [null], owned: [] },
      beasts: {
        nextId: 1,
        roster: [],
        encounters: [],
        activeIds: []
      }
    };
  }

  function createDefaults() {
    return {
      player: {
        skills: createSkills(),
        mastery: createMastery(),
        inventory: {
          capacity: BASE_INVENTORY_CAPACITY,
          capacityGrants: { shop: 0, achievement: 0, task: 0 },
          stacks: {},
          bindings: {},
          equipment: {
            version: 1,
            nextInstanceId: 1,
            instances: []
          }
        },
        legacyProgress: {
          skills: {},
          masteryPools: {},
          masteryEntries: {}
        }
      },
      systems: {
        gathering: createGathering(),
        homestead: createHomestead(),
        parallel: { jobs: [] },
        world: {
          tickAccumulator: 0,
          tickAnchorMs: null,
          tickBaseSeconds: null
        }
      }
    };
  }

  function normalizeSkills(source, legacyProgress) {
    const raw = isRecord(source) ? source : {};
    const result = createSkills();
    const seen = {};

    Object.keys(raw).forEach(function (rawSkillId) {
      const skillId = own(LifeSkillContent.SKILLS, rawSkillId)
        ? rawSkillId
        : SKILL_ALIASES[rawSkillId];
      if (!skillId || !own(result, skillId)) {
        define(
          legacyProgress.skills,
          rawSkillId,
          archivedLevelRecord(raw[rawSkillId])
        );
        return;
      }
      if (seen[skillId] && !own(LifeSkillContent.SKILLS, rawSkillId)) {
        return;
      }
      result[skillId] = levelRecord(raw[rawSkillId]);
      seen[skillId] = true;
    });
    return result;
  }

  function normalizeLegacyProgress(value) {
    const source = isRecord(value) ? value : {};
    const skills = {};
    const rawSkills = isRecord(source.skills) ? source.skills : {};
    Object.keys(rawSkills).forEach(function (skillId) {
      define(skills, skillId, archivedLevelRecord(rawSkills[skillId]));
    });

    const masteryPools = {};
    const rawPools = isRecord(source.masteryPools)
      ? source.masteryPools
      : {};
    Object.keys(rawPools).forEach(function (skillId) {
      const amount = finiteInteger(rawPools[skillId], 0, 0);
      if (amount > 0) define(masteryPools, skillId, amount);
    });

    const masteryEntries = {};
    const rawEntries = isRecord(source.masteryEntries)
      ? source.masteryEntries
      : {};
    Object.keys(rawEntries).forEach(function (skillId) {
      if (!isRecord(rawEntries[skillId])) return;
      const entries = {};
      Object.keys(rawEntries[skillId]).forEach(function (contentId) {
        define(
          entries,
          contentId,
          archivedLevelRecord(rawEntries[skillId][contentId])
        );
      });
      if (Object.keys(entries).length > 0) {
        define(masteryEntries, skillId, entries);
      }
    });
    return { skills, masteryPools, masteryEntries };
  }

  function archiveMasteryEntry(legacyProgress, skillId, contentId, value) {
    if (!own(legacyProgress.masteryEntries, skillId)) {
      define(legacyProgress.masteryEntries, skillId, {});
    }
    define(
      legacyProgress.masteryEntries[skillId],
      contentId,
      archivedLevelRecord(value)
    );
  }

  function canonicalMasteryContentId(skillId, contentId) {
    if (RESOURCE_SKILLS.indexOf(skillId) >= 0) {
      return canonicalResourceEntryId(skillId, contentId) || contentId;
    }
    return contentId;
  }

  function normalizeMastery(source, legacyProgress) {
    const raw = isRecord(source) ? source : {};
    const result = createMastery();

    Object.keys(raw).forEach(function (rawSkillId) {
      const skillId = own(MASTERY_IDS, rawSkillId)
        ? rawSkillId
        : SKILL_ALIASES[rawSkillId];
      const rawSkill = isRecord(raw[rawSkillId]) ? raw[rawSkillId] : {};
      if (own(rawSkill, 'pool') && !own(rawSkill, 'poolXp')) {
        const pool = finiteInteger(rawSkill.pool, 0, 0);
        if (pool > 0) define(
          legacyProgress.masteryPools,
          skillId || rawSkillId,
          pool
        );
      }

      if (skillId &&
          own(result, skillId) &&
          own(rawSkill, 'poolXp')) {
        define(
          result[skillId],
          'poolXp',
          finiteInteger(rawSkill.poolXp, 0, 0)
        );
      }
      const hasCanonicalEntries = Boolean(
        skillId &&
        own(result, skillId) &&
        Object.keys(rawSkill).some(function (contentId) {
          return contentId !== 'pool' &&
            contentId !== 'poolXp' &&
            contentId !== 'entries' &&
            own(result[skillId], contentId) &&
            isRecord(rawSkill[contentId]);
        })
      );
      const rawEntries = hasCanonicalEntries
        ? rawSkill
        : (isRecord(rawSkill.entries) ? rawSkill.entries : rawSkill);
      Object.keys(rawEntries).forEach(function (contentId) {
        if (contentId === 'pool' ||
            contentId === 'poolXp' ||
            contentId === 'entries') {
          return;
        }
        const canonicalContentId = skillId
          ? canonicalMasteryContentId(skillId, contentId)
          : contentId;
        if (skillId &&
            skillId !== 'charm' &&
            own(result, skillId) &&
            own(result[skillId], canonicalContentId)) {
          result[skillId][canonicalContentId] = mergeLevelRecord(
            result[skillId][canonicalContentId],
            levelRecord(rawEntries[contentId])
          );
        } else {
          archiveMasteryEntry(
            legacyProgress,
            skillId || rawSkillId,
            contentId,
            rawEntries[contentId]
          );
        }
      });
    });
    delete result.charm;
    return result;
  }

  function canonicalItemId(itemId) {
    return RESOURCE_ALIASES[itemId] ||
      PILL_ALIASES[itemId] ||
      (own(ItemContent.ITEMS, itemId) ? itemId : null);
  }

  function addStack(target, rawItemId, rawQuantity) {
    const itemId = canonicalItemId(rawItemId);
    const quantity = finiteInteger(rawQuantity, 0, 0);
    if (!itemId || quantity <= 0) return;
    const existing = own(target, itemId) ? target[itemId] : 0;
    define(target, itemId, existing + quantity);
  }

  function occupiedSlots(inventory) {
    const stacks = isRecord(inventory) && isRecord(inventory.stacks)
      ? inventory.stacks
      : {};
    const stackSlots = Object.keys(stacks).reduce(function (count, itemId) {
      return Number.isFinite(stacks[itemId]) &&
        Math.floor(stacks[itemId]) > 0
        ? count + 1
        : count;
    }, 0);
    const equipment = isRecord(inventory) &&
      isRecord(inventory.equipment) &&
      Array.isArray(inventory.equipment.instances)
      ? inventory.equipment.instances
      : [];
    return stackSlots + equipment.length;
  }

  function normalizeEquipment(inventory, stacks) {
    const rawEquipment = isRecord(inventory.equipment)
      ? inventory.equipment
      : {};
    const instances = [];
    const ids = {};
    let highestNumericId = 0;
    const rawInstances = Array.isArray(rawEquipment.instances)
      ? rawEquipment.instances
      : [];
    rawInstances.forEach(function (candidate) {
      const instance = Equipment &&
        typeof Equipment.normalizeInstance === 'function'
        ? Equipment.normalizeInstance(candidate)
        : null;
      if (!instance || own(ids, instance.instanceId)) return;
      define(ids, instance.instanceId, true);
      instances.push(instance);
      const match = /^eq-(\d+)$/.exec(instance.instanceId);
      if (match) {
        highestNumericId = Math.max(
          highestNumericId,
          finiteInteger(match[1], 0, 0)
        );
      }
    });

    Object.keys(stacks).forEach(function (itemId) {
      const item = own(ItemContent.ITEMS, itemId)
        ? ItemContent.ITEMS[itemId]
        : null;
      if (!item || item.category !== 'equipment') return;
      const quantity = finiteInteger(stacks[itemId], 0, 0);
      for (let ordinal = 1; ordinal <= quantity; ordinal += 1) {
        if (!Equipment || typeof Equipment.legacyInstance !== 'function') {
          break;
        }
        let migrated = Equipment.legacyInstance(itemId, ordinal);
        if (!migrated) continue;
        if (own(ids, migrated.instanceId)) {
          let suffix = ordinal + 1;
          while (own(ids, 'legacy-' + itemId + '-' + suffix)) {
            suffix += 1;
          }
          migrated = Equipment.legacyInstance(itemId, suffix);
        }
        if (!migrated) continue;
        define(ids, migrated.instanceId, true);
        instances.push(migrated);
      }
      delete stacks[itemId];
    });

    return {
      version: 1,
      nextInstanceId: Math.max(
        1,
        highestNumericId + 1,
        finiteInteger(rawEquipment.nextInstanceId, 1, 1)
      ),
      instances: instances
    };
  }

  function normalizeInventory(player) {
    const source = isRecord(player) ? player : {};
    const inventory = isRecord(source.inventory) ? source.inventory : {};
    const stacks = {};

    [
      isRecord(source.items) ? source.items : {},
      isRecord(source.dan) ? source.dan : {},
      isRecord(source.bag) ? source.bag : {},
      isRecord(inventory.stacks) ? inventory.stacks : {}
    ].forEach(function (layer) {
      Object.keys(layer).forEach(function (itemId) {
        addStack(stacks, itemId, layer[itemId]);
      });
    });
    const equipment = normalizeEquipment(inventory, stacks);

    const capacityGrants = {};
    const rawGrants = isRecord(inventory.capacityGrants)
      ? inventory.capacityGrants
      : {};
    CAPACITY_GRANT_SOURCES.forEach(function (sourceId) {
      define(
        capacityGrants,
        sourceId,
        finiteInteger(rawGrants[sourceId], 0, 0)
      );
    });

    const bindings = {};
    const rawBindings = isRecord(inventory.bindings)
      ? inventory.bindings
      : {};
    Object.keys(rawBindings).forEach(function (rawItemId) {
      const itemId = canonicalItemId(rawItemId);
      if (!itemId || !own(stacks, itemId) ||
          !isRecord(rawBindings[rawItemId])) {
        return;
      }
      const record = {};
      let bound = 0;
      BINDING_PURPOSES.forEach(function (purpose) {
        const remaining = Math.max(0, stacks[itemId] - bound);
        const quantity = Math.min(
          remaining,
          finiteInteger(rawBindings[rawItemId][purpose], 0, 0)
        );
        define(record, purpose, quantity);
        bound += quantity;
      });
      if (bound > 0) define(bindings, itemId, record);
    });

    const capacity = Math.max(
      BASE_INVENTORY_CAPACITY,
      finiteInteger(inventory.capacity, BASE_INVENTORY_CAPACITY, 0),
      occupiedSlots({ stacks, equipment })
    );
    return { capacity, capacityGrants, stacks, bindings, equipment };
  }

  function validResourceEntry(skillId, entryId) {
    return !!canonicalResourceEntryId(skillId, entryId);
  }

  function spotNumber(instanceId) {
    if (typeof instanceId !== 'string') return 0;
    const match = /^spot-(\d+)$/.exec(instanceId);
    return match ? finiteInteger(match[1], 0, 0) : 0;
  }

  function normalizeSpot(raw, skillId, allocateId) {
    if (!isRecord(raw)) return null;
    const rawEntryId = cleanId(
      own(raw, 'entryId') ? raw.entryId : raw.id,
      null
    );
    const entryId = rawEntryId
      ? canonicalResourceEntryId(skillId, rawEntryId)
      : null;
    if (!entryId) return null;
    if (own(raw, 'skillId') && raw.skillId !== skillId) return null;

    const capacity = finiteInteger(
      own(raw, 'capacity') ? raw.capacity : raw.cap,
      0,
      0
    );
    if (capacity <= 0) return null;
    const remaining = Math.min(
      capacity,
      finiteInteger(
        own(raw, 'remaining') ? raw.remaining : raw.left,
        capacity,
        0
      )
    );
    const quality = own(GatheringContent.RESOURCE_QUALITIES, raw.quality)
      ? raw.quality
      : 'common';
    const existingId = cleanId(raw.instanceId, null);
    return {
      instanceId: existingId || allocateId(),
      skillId,
      entryId,
      quality,
      capacity,
      remaining
    };
  }

  function oldFishingStocks(raw) {
    const valuesBySpecies = {};
    const source = isRecord(raw) ? raw : {};
    Object.keys(source).forEach(function (spotId) {
      const spot = GatheringContent.getFishingSpot(spotId);
      const stock = finiteNumber(source[spotId], null, 0);
      if (!spot || stock === null) return;
      const species = new Set(spot.drops.map(function (drop) {
        return drop.itemId;
      }));
      species.forEach(function (speciesId) {
        if (!own(valuesBySpecies, speciesId)) {
          define(valuesBySpecies, speciesId, []);
        }
        valuesBySpecies[speciesId].push(stock);
      });
    });
    const result = {};
    Object.keys(valuesBySpecies).forEach(function (speciesId) {
      const values = valuesBySpecies[speciesId];
      const averageRatio = values.reduce(function (sum, stock) {
        return sum + stock / 30;
      }, 0) / values.length;
      define(
        result,
        speciesId,
        finiteInteger(
          Math.round(averageRatio * BASE_FISH_STOCK),
          BASE_FISH_STOCK,
          0,
          BASE_FISH_STOCK
        )
      );
    });
    return result;
  }

  function completeAnchor(source, anchorKey, baseKey) {
    return isRecord(source) &&
      Number.isFinite(source[anchorKey]) &&
      source[anchorKey] >= 0 &&
      Number.isFinite(source[baseKey]) &&
      source[baseKey] >= 0
      ? {
        anchorMs: source[anchorKey],
        baseValue: source[baseKey]
      }
      : { anchorMs: null, baseValue: null };
  }

  function normalizeGathering(player, systems) {
    const sourceSystems = isRecord(systems) ? systems : {};
    const source = isRecord(sourceSystems.gathering)
      ? sourceSystems.gathering
      : {};
    const rawPlayer = isRecord(player) ? player : {};
    const result = createGathering();
    let nextId = Math.max(1, finiteInteger(source.nextSpotId, 1, 1));

    RESOURCE_SKILLS.forEach(function (skillId) {
      const candidate = isRecord(source.spots) &&
        own(source.spots, skillId)
        ? source.spots[skillId]
        : isRecord(rawPlayer.spots)
          ? rawPlayer.spots[skillId]
          : null;
      const spot = normalizeSpot(candidate, skillId, function () {
        return 'spot-' + nextId++;
      });
      result.spots[skillId] = spot;
      if (spot) nextId = Math.max(
        nextId,
        spotNumber(spot.instanceId) + 1
      );
    });
    result.nextSpotId = nextId;

    const rawFish = {};
    if (isRecord(rawPlayer.fishing)) {
      Object.keys(rawPlayer.fishing).forEach(function (key) {
        define(rawFish, key, rawPlayer.fishing[key]);
      });
    }
    if (isRecord(source.fishStocks)) {
      Object.keys(source.fishStocks).forEach(function (key) {
        define(rawFish, key, source.fishStocks[key]);
      });
    }
    const migratedSpotStocks = oldFishingStocks(rawFish);
    Object.keys(result.fishStocks).forEach(function (speciesId) {
      if (own(rawFish, speciesId)) {
        result.fishStocks[speciesId] = finiteInteger(
          rawFish[speciesId],
          BASE_FISH_STOCK,
          0,
          BASE_FISH_STOCK
        );
      } else if (own(migratedSpotStocks, speciesId)) {
        result.fishStocks[speciesId] = migratedSpotStocks[speciesId];
      }
    });

    const rawAccumulator = own(source, 'fishRecoverAcc')
      ? source.fishRecoverAcc
      : own(sourceSystems, 'fishRecoverAcc')
        ? sourceSystems.fishRecoverAcc
        : rawPlayer.fishRecoverAcc;
    const accumulator = finiteNumber(rawAccumulator, 0, 0);
    result.fishRecoverAcc = accumulator >= BASE_FISH_RECOVERY_SECONDS
      ? accumulator % BASE_FISH_RECOVERY_SECONDS
      : accumulator;

    const anchor = completeAnchor(
      source,
      'fishRecoverAnchorMs',
      'fishRecoverBaseSeconds'
    );
    result.fishRecoverAnchorMs = anchor.anchorMs;
    result.fishRecoverBaseSeconds = anchor.baseValue;

    const rawUnlocks = isRecord(source.fishingUnlocks)
      ? source.fishingUnlocks
      : {};
    Object.keys(result.fishingUnlocks).forEach(function (flag) {
      result.fishingUnlocks[flag] = rawUnlocks[flag] === true;
    });
    Object.keys(rawUnlocks).forEach(function (flag) {
      if (!own(result.fishingUnlocks, flag)) {
        define(result.fishingUnlocks, flag, rawUnlocks[flag] === true);
      }
    });
    return result;
  }

  function normalizePlot(raw, index) {
    const empty = emptyPlot(index);
    if (!isRecord(raw)) return empty;
    empty.id = cleanId(raw.id, empty.id);
    const cropId = cleanId(raw.cropId, null);
    if (!cropId || !own(HomesteadContent.CROPS, cropId)) return empty;

    const remainingSeconds = finiteNumber(
      raw.remainingSeconds,
      0,
      0
    );
    const totalSeconds = Math.max(
      remainingSeconds,
      finiteNumber(
        raw.totalSeconds,
        HomesteadContent.CROPS[cropId].growthSeconds,
        0
      )
    );
    empty.cropId = cropId;
    empty.remainingSeconds = remainingSeconds;
    empty.totalSeconds = totalSeconds;
    empty.ready = !!raw.ready && remainingSeconds === 0;
    if (remainingSeconds === 0) empty.ready = true;

    const anchor = completeAnchor(
      raw,
      'remainingAnchorMs',
      'remainingBaseSeconds'
    );
    if (own(raw, 'remainingAnchorMs') ||
        own(raw, 'remainingBaseSeconds')) {
      empty.remainingAnchorMs = anchor.anchorMs;
      empty.remainingBaseSeconds = anchor.baseValue;
    }
    return empty;
  }

  function normalizeFarm(raw) {
    if (!isRecord(raw)) return createFarm(3);
    const rawPlots = Array.isArray(raw.plots) ? raw.plots : [];
    const hasStage2Shape = Number.isFinite(raw.unlockedPlots);
    const unlockedPlots = hasStage2Shape
      ? finiteInteger(raw.unlockedPlots, rawPlots.length, 0)
      : Math.max(3, rawPlots.length);
    const farm = createFarm(unlockedPlots);
    for (let index = 0; index < unlockedPlots; index++) {
      farm.plots[index] = normalizePlot(rawPlots[index], index);
    }
    return farm;
  }

  function uniqueKnownIds(values, registry) {
    const result = [];
    cloneArray(values).forEach(function (id) {
      if (typeof id !== 'string' ||
          !own(registry, id) ||
          result.includes(id)) {
        return;
      }
      result.push(id);
    });
    return result;
  }

  function normalizeFormations(raw) {
    if (!isRecord(raw)) return { slots: [null], owned: [] };
    const sourceSlots = Array.isArray(raw.slots) && raw.slots.length > 0
      ? raw.slots
      : [null];
    return {
      slots: sourceSlots.map(function (formationId) {
        return typeof formationId === 'string' &&
          own(HomesteadContent.FORMATIONS, formationId)
          ? formationId
          : null;
      }),
      owned: uniqueKnownIds(raw.owned, HomesteadContent.FORMATIONS)
    };
  }

  function normalizeBeast(raw) {
    if (!isRecord(raw)) return null;
    const id = cleanId(raw.id, null);
    const speciesId = cleanId(raw.speciesId, null);
    if (!id || !speciesId || !own(HomesteadContent.BEASTS, speciesId)) {
      return null;
    }
    const progress = levelRecord(raw);
    const traitId = own(HomesteadContent.TRAITS, raw.traitId)
      ? raw.traitId
      : Object.keys(HomesteadContent.TRAITS)[0];
    const growthId = own(HomesteadContent.GROWTH_TENDENCIES, raw.growthId)
      ? raw.growthId
      : Object.keys(HomesteadContent.GROWTH_TENDENCIES)[0];
    return {
      id,
      speciesId,
      level: progress.level,
      xp: progress.xp,
      traitId,
      growthId
    };
  }

  function beastNumber(id) {
    if (typeof id !== 'string') return 0;
    const match = /^(?:beast|encounter)-(\d+)$/.exec(id);
    return match ? finiteInteger(match[1], 0, 0) : 0;
  }

  function normalizeBeasts(raw) {
    if (!isRecord(raw)) {
      return {
        nextId: 1,
        roster: [],
        encounters: [],
        activeIds: []
      };
    }
    const roster = [];
    const rosterIds = new Set();
    cloneArray(raw.roster).forEach(function (candidate) {
      const beast = normalizeBeast(candidate);
      if (!beast || rosterIds.has(beast.id)) return;
      rosterIds.add(beast.id);
      roster.push(beast);
    });

    const encounters = [];
    const encounterIds = new Set();
    cloneArray(raw.encounters).forEach(function (candidate) {
      if (!isRecord(candidate) ||
          !own(HomesteadContent.BEASTS, candidate.speciesId)) {
        return;
      }
      const id = cleanId(
        candidate.id,
        'encounter-' + (encounters.length + 1)
      );
      if (encounterIds.has(id)) return;
      encounterIds.add(id);
      const clean = cloneRecord(candidate);
      clean.id = id;
      clean.speciesId = candidate.speciesId;
      encounters.push(clean);
    });

    const activeIds = [];
    cloneArray(raw.activeIds).forEach(function (id) {
      if (activeIds.length > 0 ||
          typeof id !== 'string' ||
          !rosterIds.has(id) ||
          activeIds.includes(id)) {
        return;
      }
      activeIds.push(id);
    });

    const highestId = roster.concat(encounters).reduce(
      function (highest, entry) {
        return Math.max(highest, beastNumber(entry.id));
      },
      0
    );
    return {
      nextId: Math.max(
        highestId + 1,
        finiteInteger(raw.nextId, 1, 1)
      ),
      roster,
      encounters,
      activeIds
    };
  }

  function normalizeHomestead(systems) {
    const sourceSystems = isRecord(systems) ? systems : {};
    const source = isRecord(sourceSystems.homestead)
      ? sourceSystems.homestead
      : {};
    return {
      farm: normalizeFarm(source.farm),
      formations: normalizeFormations(source.formations),
      beasts: normalizeBeasts(source.beasts)
    };
  }

  function normalizeTimedJobs(value) {
    return cloneArray(value).filter(function (job) {
      return isRecord(job) &&
        typeof job.id === 'string' &&
        job.id.trim().length > 0 &&
        Number.isFinite(job.remainingSeconds) &&
        job.remainingSeconds >= 0;
    }).map(function (job) {
      const anchor = completeAnchor(
        job,
        'remainingAnchorMs',
        'remainingBaseSeconds'
      );
      job.remainingAnchorMs = anchor.anchorMs;
      job.remainingBaseSeconds = anchor.baseValue;
      return job;
    });
  }

  function normalizeParallel(systems) {
    const source = isRecord(systems) && isRecord(systems.parallel)
      ? systems.parallel
      : {};
    return { jobs: normalizeTimedJobs(source.jobs) };
  }

  function normalizeWorld(systems) {
    const source = isRecord(systems) && isRecord(systems.world)
      ? systems.world
      : {};
    const anchor = completeAnchor(
      source,
      'tickAnchorMs',
      'tickBaseSeconds'
    );
    return {
      tickAccumulator: finiteNumber(source.tickAccumulator, 0, 0),
      tickAnchorMs: anchor.anchorMs,
      tickBaseSeconds: anchor.baseValue
    };
  }

  function normalizeBasePlayer(raw) {
    const source = isRecord(raw) ? raw : {};
    const moodAnchor = completeAnchor(
      source,
      'moodAnchorMs',
      'moodBase'
    );
    const immortal = source.shouMax === null ||
      source.shouMax === Infinity;
    const shouMax = immortal
      ? null
      : finiteNumber(source.shouMax, 0, 0);
    const lifespanAnchor = immortal
      ? { anchorMs: null, baseValue: null }
      : completeAnchor(
        source,
        'lifespanAnchorMs',
        'lifespanBaseYears'
      );
    return {
      name: cleanString(source.name, ''),
      realmStage: finiteInteger(source.realmStage, 0, 0),
      realm: cleanString(source.realm, ''),
      title: cleanString(source.title, ''),
      xiwei: finiteNumber(source.xiwei, 0, 0),
      breakNeed: finiteNumber(source.breakNeed, 0, 0),
      mood: finiteNumber(source.mood, 0, 0),
      moodAnchorMs: moodAnchor.anchorMs,
      moodBase: moodAnchor.baseValue,
      jingqi: finiteNumber(source.jingqi, 0, 0),
      lingshi: finiteNumber(source.lingshi, 0, 0),
      shengwang: finiteNumber(source.shengwang, 0, 0),
      lingyu: finiteNumber(source.lingyu, 0, 0),
      shouyuan: immortal
        ? null
        : finiteNumber(source.shouyuan, shouMax, 0),
      shouMax,
      lifespanAnchorMs: lifespanAnchor.anchorMs,
      lifespanBaseYears: lifespanAnchor.baseValue
    };
  }

  function migrateLegacyPlayer(player, systems) {
    const rawPlayer = isRecord(player) ? player : {};
    const legacyProgress = normalizeLegacyProgress(
      rawPlayer.legacyProgress
    );
    const cleanPlayer = normalizeBasePlayer(rawPlayer);
    cleanPlayer.skills = normalizeSkills(rawPlayer.skills, legacyProgress);
    cleanPlayer.mastery = normalizeMastery(
      rawPlayer.mastery,
      legacyProgress
    );
    cleanPlayer.inventory = normalizeInventory(rawPlayer);
    cleanPlayer.legacyProgress = legacyProgress;

    return {
      player: cleanPlayer,
      systems: {
        gathering: normalizeGathering(rawPlayer, systems),
        homestead: normalizeHomestead(systems),
        parallel: normalizeParallel(systems),
        world: normalizeWorld(systems)
      }
    };
  }

  function normalizeActionKey(key) {
    if (typeof key !== 'string' || key.length === 0) return null;
    if (own(ACTION_ALIASES, key)) return ACTION_ALIASES[key];

    let match = /^gather:(herb|mining|woodcutting):([^:]+)$/.exec(key);
    if (match) {
      const entryId = canonicalResourceEntryId(match[1], match[2]);
      if (entryId) return 'gather:collect:' + match[1] + ':' + entryId;
    }
    match = /^gather:collect:(herb|mining|woodcutting):([^:]+)$/.exec(key);
    if (match) {
      const entryId = canonicalResourceEntryId(match[1], match[2]);
      if (entryId) return 'gather:collect:' + match[1] + ':' + entryId;
    }
    match = /^gather:explore:(herb|mining|woodcutting)$/.exec(key);
    if (match) return key;

    match = /^gather:fishing:([^:]+)$/.exec(key);
    if (match && GatheringContent.getFishingSpot(match[1])) {
      return 'fish:' + match[1];
    }
    match = /^fish:([^:]+)$/.exec(key);
    if (match && GatheringContent.getFishingSpot(match[1])) return key;

    match = /^produce:([^:]+):([^:]+)$/.exec(key);
    if (match && RecipeContent.get(match[1] + ':' + match[2])) return key;

    match = /^beast:tame:(encounter-[1-9][0-9]*)$/.exec(key);
    if (match) return key;
    match = /^beast:train:(beast-[1-9][0-9]*)$/.exec(key);
    if (match) return key;
    return null;
  }

  function normalize(model) {
    const source = isRecord(model) ? model : {};
    const clean = cloneRecord(source);
    if (source.player === null) {
      clean.player = null;
      clean.systems = {
        gathering: normalizeGathering({}, source.systems),
        homestead: normalizeHomestead(source.systems),
        parallel: normalizeParallel(source.systems),
        world: normalizeWorld(source.systems)
      };
      return clean;
    }
    const migrated = migrateLegacyPlayer(source.player, source.systems);
    clean.player = migrated.player;
    clean.systems = migrated.systems;
    return clean;
  }

  return Object.freeze({
    createDefaults,
    normalize,
    migrateLegacyPlayer,
    normalizeActionKey,
    occupiedSlots
  });
});
