'use strict';

const fs = require('fs');
const vm = require('vm');

let pass = 0;
let fail = 0;

function ok(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.error('  ✗ FAIL: ' + message);
  }
}

function same(actual, expected, message) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), message);
}

function allNumbersFinite(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object') return true;
  return Object.keys(value).every((key) => allNumbersFinite(value[key]));
}

function jsonAdapter(initial) {
  const raw = Object.assign({}, initial || {});
  let writes = 0;
  return {
    raw,
    get writes() { return writes; },
    load(key) {
      if (!(key in raw)) return null;
      return JSON.parse(raw[key]);
    },
    save(key, value) {
      writes++;
      raw[key] = JSON.stringify(value);
      return true;
    }
  };
}

const Stage2State = require('../core/stage2-state.js');
const StateModel = require('../core/state-model.js');
const SaveSystem = require('../core/save-system.js');
const Simulation = require('../core/simulation.js');
const SimulationReport = require('../core/simulation-report.js');
const Items = require('../content/items.js');
const Skills = require('../content/life-skills.js');
const Gathering = require('../content/gathering.js');
const Homestead = require('../content/homestead.js');

const defaults = Stage2State.createDefaults();
ok(Object.keys(defaults.player.skills).length === 12,
  'new player has twelve skills');
ok(Object.keys(defaults.player.skills).join(',') ===
  Object.keys(Skills.SKILLS).join(','),
  'new player skills use canonical insertion order');
ok(Object.values(defaults.player.skills).every((skill) =>
  skill.level === 1 && skill.xp === 0),
  'all new skills start at level one with zero XP');
ok(!('charm' in defaults.player.mastery), 'charm mastery is absent');
ok(defaults.player.inventory.capacity === 40,
  'new inventory starts at 40 slots');
same(defaults.player.inventory.capacityGrants,
  { shop: 0, achievement: 0, task: 0 },
  'new inventory has only supported capacity grant sources');
ok(defaults.systems.homestead.farm.unlockedPlots === 3,
  'new homestead starts with three plots');
ok(defaults.systems.homestead.farm.plots.length === 3,
  'new farm persists each unlocked plot');
ok(defaults.systems.homestead.formations.slots.length === 1,
  'one formation slot starts unlocked');
ok(defaults.systems.homestead.beasts.activeIds.length === 0,
  'no beast starts active');
ok(defaults.systems.homestead.beasts.encounters.length === 0,
  'no beast encounter starts pending');
ok(Object.keys(defaults.systems.gathering.fishStocks).length === 10,
  'ten fish stocks exist');
ok(Object.values(defaults.systems.gathering.fishStocks)
  .every((stock) => stock === 20),
  'all fish species start at their shared stock cap');
ok(defaults.systems.gathering.nextSpotId === 1,
  'new resource point IDs start at one');
same(defaults.systems.parallel, { jobs: [] },
  'parallel system keeps its Stage 1B base');
ok(defaults.systems.world.tickAccumulator === 0,
  'world system keeps its Stage 1B accumulator');

const migrated = Stage2State.migrateLegacyPlayer({
  skills: {
    caiyao: { lv: 21, xp: 7 },
    caiju: { lv: 12, xp: 8 },
    qinqishuhua: { lv: 9, xp: 10 }
  },
  items: { yaocai: 4, lingkuang: 5, muliao: 6, shicai: 7 },
  dan: { tupo: 2, heal: 3 },
  bag: { copperOre: 9, spiritCarp: 1 },
  mastery: {
    herb: { pool: 25, entries: { parityHerb1: { lv: 8, xp: 4 } } }
  },
  spots: { herb: { id: 'parityHerb1', cap: 20, left: 11 } },
  fishing: { pond: 7 }
});

ok(migrated.player.skills.herb.level === 21 &&
   migrated.player.skills.herb.xp === 7 &&
   migrated.player.skills.mining.level === 12 &&
   migrated.player.skills.mining.xp === 8,
  'legacy canonical skills keep level and XP');
ok(migrated.player.inventory.stacks.herbBundle === 4,
  'legacy generic herbs are retained');
ok(migrated.player.inventory.stacks.oreBundle === 5 &&
   migrated.player.inventory.stacks.woodBundle === 6 &&
   migrated.player.inventory.stacks.foodBundle === 7,
  'all legacy aggregate resources use compatibility bundles');
ok(migrated.player.inventory.stacks.foundationPill === 2,
  'legacy breakthrough pills are retained');
ok(migrated.player.inventory.stacks.healingPill === 3,
  'legacy healing pills are retained');
ok(migrated.player.inventory.stacks.copperOre === 9,
  'legacy detailed bag items are retained');
ok(migrated.player.mastery.herb.parityHerb1.level === 8 &&
   migrated.player.mastery.herb.parityHerb1.xp === 4,
  'legacy gathering mastery is retained');
ok(migrated.player.legacyProgress.skills.qinqishuhua.level === 9 &&
   migrated.player.legacyProgress.skills.qinqishuhua.xp === 10,
  'noncanonical legacy skill is archived');
ok(migrated.player.legacyProgress.masteryPools.herb === 25,
  'old mastery pool is archived');

const canonicalMasteryModel = Stage2State.createDefaults();
canonicalMasteryModel.player.mastery.herb.poolXp = 31;
canonicalMasteryModel.player.mastery.herb.pool = 31;
canonicalMasteryModel.player.mastery.herb.parityHerb1 = {
  level: 7,
  xp: 8
};
canonicalMasteryModel.player.mastery.herb.entries = {
  parityHerb1: { lv: 1, xp: 0 }
};
canonicalMasteryModel.player.legacyProgress.masteryPools.herb = 25;
const canonicalMasteryNormalized =
  Stage2State.normalize(canonicalMasteryModel);
ok(
  canonicalMasteryNormalized.player.mastery.herb.parityHerb1.level === 7 &&
    canonicalMasteryNormalized.player.mastery.herb.parityHerb1.xp === 8 &&
    canonicalMasteryNormalized.player.mastery.herb.poolXp === 31 &&
    canonicalMasteryNormalized.player.legacyProgress.masteryPools.herb === 25,
  'canonical mastery outranks a legacy UI view without rewriting its archive'
);
ok(migrated.systems.gathering.spots.herb.entryId === 'parityHerb1' &&
   migrated.systems.gathering.spots.herb.instanceId === 'spot-1' &&
   migrated.systems.gathering.spots.herb.quality === 'common' &&
   migrated.systems.gathering.spots.herb.capacity === 20 &&
   migrated.systems.gathering.spots.herb.remaining === 11,
  'legacy resource point is retained with a stable v3 instance ID');
ok(migrated.systems.gathering.nextSpotId === 2,
  'legacy resource point allocation advances the stable ID counter');
ok(migrated.systems.gathering.fishStocks.spiritCarp === 5,
  'legacy pond stock is proportionally migrated to shared species stock');
ok(migrated.systems.gathering.fishStocks.spiritShrimp === 5,
  'all species available at a legacy spot receive its proportional stock');
ok(migrated.systems.gathering.fishStocks.dragonFish === 20,
  'species absent from legacy spots start full');

const pillAliases = {
  heal: 'healingPill',
  tupo: 'foundationPill',
  jindan: 'goldCorePill',
  yuanying: 'nascentSoulPill',
  huashen: 'spiritTransformationPill',
  lianxu: 'voidRefiningPill',
  heti: 'bodyIntegrationPill',
  dasheng: 'mahayanaPill'
};
const allLegacyPills = {};
Object.keys(pillAliases).forEach((key, index) => {
  allLegacyPills[key] = index + 1;
});
const migratedPills = Stage2State.migrateLegacyPlayer({
  inventory: {
    stacks: {
      yaocai: 2,
      herbBundle: 3,
      heal: 4,
      healingPill: 5
    }
  },
  dan: allLegacyPills
});
ok(migratedPills.player.inventory.stacks.herbBundle === 5,
  'legacy and canonical compatibility stacks merge without loss');
ok(migratedPills.player.inventory.stacks.healingPill === 10,
  'legacy and canonical pill stacks merge without loss');
Object.keys(pillAliases).forEach((key, index) => {
  const expected = key === 'heal' ? 10 : index + 1;
  ok(migratedPills.player.inventory.stacks[pillAliases[key]] === expected,
    'legacy pill alias migrates: ' + key);
});
ok(!Object.keys(migratedPills.player.inventory.stacks).some((key) =>
  Object.prototype.hasOwnProperty.call(pillAliases, key) ||
  ['yaocai', 'lingkuang', 'muliao', 'shicai'].includes(key)),
  'legacy inventory aliases never remain active after migration');

const actionAliases = {
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
};
Object.keys(actionAliases).forEach((key) => {
  ok(Stage2State.normalizeActionKey(key) === actionAliases[key],
    'legacy action alias migrates: ' + key);
});
ok(Stage2State.normalizeActionKey('gather:mining:copper') ===
  'gather:collect:mining:copper',
  'legacy gather action key migrates');
ok(Stage2State.normalizeActionKey('gather:fishing:pond') === 'fish:pond',
  'legacy fishing action key migrates');
ok(Stage2State.normalizeActionKey(
  'produce:alchemy:foundationPill'
) === 'produce:alchemy:foundationPill',
  'canonical production action remains stable');
ok(Stage2State.normalizeActionKey('beast:tame:encounter-1') ===
   'beast:tame:encounter-1',
  'canonical tame action remains stable');
ok(Stage2State.normalizeActionKey('beast:train:beast-1') ===
   'beast:train:beast-1',
  'canonical training action remains stable');
[
  'beast:tame:encounter-0',
  'beast:tame:encounter-1:extra',
  'beast:tame:toString',
  'beast:train:beast-0',
  'beast:train:beast-1:extra',
  'beast:train:__proto__'
].forEach((key) => {
  ok(Stage2State.normalizeActionKey(key) === null,
    'malformed beast action is rejected: ' + key);
});
ok(Stage2State.normalizeActionKey(Object.create({
  key: 'beast:train:beast-1'
})) === null,
  'inherited beast action data is rejected');
ok(Stage2State.normalizeActionKey('removed_prototype_action') === null,
  'unknown prototype action is removed');
ok(Stage2State.normalizeActionKey(7) === null,
  'primitive action keys are rejected');

const adversarialInput = {
  player: {
    skills: {
      herb: { level: -5, xp: -2 },
      mining: { level: 100, xp: 999 },
      fishing: { level: 4.9, xp: 2.9 },
      charm: { level: NaN, xp: Infinity },
      obsoleteSkill: { level: 7, xp: 8 }
    },
    mastery: {
      charm: { forbidden: { level: 50, xp: 10 } },
      herb: {
        parityHerb1: { level: 100, xp: 18 },
        obsoleteEntry: { level: 5, xp: 6 }
      },
      mining: { pool: 17 }
    },
    inventory: {
      capacity: -4,
      capacityGrants: {
        shop: 3.9,
        achievement: -2,
        task: NaN,
        developer: 100
      },
      stacks: {
        copperOre: 2.9,
        ironOre: 0,
        goldOre: -3,
        silverOre: NaN,
        unknownItem: 8
      },
      bindings: {
        copperOre: { equipment: 1.9, task: -2, formation: 0, other: 8 },
        ironOre: { equipment: 4 }
      }
    },
    legacyProgress: {
      skills: { olderUnknown: { level: 2, xp: 3 } },
      masteryPools: { woodcutting: 9 }
    }
  },
  systems: {
    gathering: {
      nextSpotId: -2,
      spots: {
        herb: {
          instanceId: 'spot-7',
          skillId: 'herb',
          entryId: 'parityHerb1',
          quality: 'rare',
          capacity: 20.9,
          remaining: 99
        },
        mining: 7,
        woodcutting: {
          instanceId: 'bad',
          skillId: 'herb',
          entryId: 'willow',
          quality: 'mythic',
          capacity: 3,
          remaining: 2
        },
        obsolete: { entryId: 'lost' }
      },
      fishStocks: {
        spiritCarp: 99,
        spiritShrimp: -1,
        silverTrout: 4.9,
        greenBass: NaN,
        unknownFish: 11
      },
      fishRecoverAcc: Infinity,
      fishRecoverAnchorMs: 100,
      fishRecoverBaseSeconds: 3
    },
    homestead: {
      farm: {
        unlockedPlots: 5.9,
        plots: [
          {
            id: 'plot-1',
            cropId: 'spiritRice',
            remainingSeconds: 0,
            totalSeconds: 300,
            ready: true
          },
          {
            id: 'plot-2',
            cropId: 'missingCrop',
            remainingSeconds: 2,
            totalSeconds: 3,
            ready: false
          }
        ]
      },
      formations: {
        slots: ['gatheringFormation', 'missingFormation', 7],
        owned: [
          'gatheringFormation', 'gatheringFormation', 'missingFormation'
        ]
      },
      beasts: {
        nextId: 9.9,
        roster: [
          {
            id: 'beast-1',
            speciesId: 'spiritFox',
            level: 100,
            xp: 30,
            traitId: 'keenNose',
            growthId: 'steady'
          },
          {
            id: 'beast-2',
            speciesId: 'missingBeast',
            level: 3,
            xp: 4,
            traitId: 'diligent',
            growthId: 'swift'
          },
          {
            id: 'beast-3',
            speciesId: 'rockshell',
            level: 5,
            xp: 6,
            traitId: 'missingTrait',
            growthId: 'missingGrowth'
          }
        ],
        encounters: [
          { id: 'encounter-1', speciesId: 'waterTurtle' },
          { id: 'encounter-2', speciesId: 'missingBeast' }
        ],
        activeIds: ['beast-1', 'beast-2', 'beast-1']
      }
    },
    parallel: {
      jobs: [{
        id: 'letter-1',
        remainingSeconds: 4,
        remainingAnchorMs: 10,
        remainingBaseSeconds: 4
      }]
    },
    world: {
      tickAccumulator: 2.5,
      tickAnchorMs: 10,
      tickBaseSeconds: 2.5
    }
  }
};
const adversarialBefore = JSON.stringify(adversarialInput, (key, value) =>
  Number.isNaN(value) ? '__NaN__' :
    value === Infinity ? '__Infinity__' : value);
const normalized = Stage2State.normalize(adversarialInput);
ok(normalized.player.skills.herb.level === 1 &&
   normalized.player.skills.herb.xp === 0,
  'negative skill progress clamps to the minimum');
ok(normalized.player.skills.mining.level === 99 &&
   normalized.player.skills.mining.xp === 0,
  'level 99 always has zero XP');
ok(normalized.player.skills.fishing.level === 4 &&
   normalized.player.skills.fishing.xp === 2,
  'skill level and XP normalize to integers');
ok(normalized.player.skills.charm.level === 1 &&
   normalized.player.skills.charm.xp === 0,
  'non-finite skill progress uses safe defaults');
ok(normalized.player.legacyProgress.skills.obsoleteSkill.level === 7 &&
   normalized.player.legacyProgress.skills.olderUnknown.level === 2,
  'unknown and previously archived skill progress are retained');
ok(!('charm' in normalized.player.mastery),
  'normalization always removes charm mastery');
ok(normalized.player.mastery.herb.parityHerb1.level === 99 &&
   normalized.player.mastery.herb.parityHerb1.xp === 0,
  'known mastery progress clamps to level 99');
ok(!('obsoleteEntry' in normalized.player.mastery.herb),
  'unknown mastery entries do not remain active');
ok(normalized.player.legacyProgress.masteryEntries.herb
   .obsoleteEntry.level === 5,
  'unknown mastery entries are archived');
ok(normalized.player.legacyProgress.masteryPools.mining === 17 &&
   normalized.player.legacyProgress.masteryPools.woodcutting === 9,
  'legacy mastery pools merge without loss');
ok(normalized.player.inventory.capacity === 40,
  'invalid inventory capacity returns to the base capacity');
same(normalized.player.inventory.capacityGrants,
  { shop: 3, achievement: 0, task: 0 },
  'capacity grants clamp and ignore unsupported sources');
same(normalized.player.inventory.stacks, { copperOre: 2 },
  'inventory keeps only known positive integer stacks');
same(normalized.player.inventory.bindings,
  { copperOre: { equipment: 1, task: 0, formation: 0 } },
  'bindings clamp to stack quantity and canonical purposes');
ok(Stage2State.occupiedSlots(normalized.player.inventory) === 1,
  'occupied slots count positive stacks only');
ok(Stage2State.occupiedSlots({
  stacks: { a: 1, b: 0, c: -1, d: NaN }
}) === 1, 'occupied slot helper rejects zero and invalid quantities');
ok(normalized.systems.gathering.nextSpotId === 8,
  'next resource ID advances beyond retained stable IDs');
ok(normalized.systems.gathering.spots.herb.capacity === 20 &&
   normalized.systems.gathering.spots.herb.remaining === 20 &&
   normalized.systems.gathering.spots.herb.quality === 'rare',
  'valid resource points clamp remaining capacity');
ok(normalized.systems.gathering.spots.mining === null &&
   normalized.systems.gathering.spots.woodcutting === null &&
   !('obsolete' in normalized.systems.gathering.spots),
  'invalid and unknown resource point records are removed');
ok(normalized.systems.gathering.fishStocks.spiritCarp === 20 &&
   normalized.systems.gathering.fishStocks.spiritShrimp === 0 &&
   normalized.systems.gathering.fishStocks.silverTrout === 4 &&
   normalized.systems.gathering.fishStocks.greenBass === 20 &&
   !('unknownFish' in normalized.systems.gathering.fishStocks),
  'shared fish stocks clamp and unknown species are ignored');
ok(normalized.systems.gathering.fishRecoverAcc >= 0 &&
   normalized.systems.gathering.fishRecoverAcc < 60,
  'shared fish recovery accumulator stays within one base interval');
ok(normalized.systems.gathering.fishRecoverAnchorMs === 100 &&
   normalized.systems.gathering.fishRecoverBaseSeconds === 3,
  'Stage 1B fish recovery anchor pair remains lossless');
ok(normalized.systems.homestead.farm.unlockedPlots === 5 &&
   normalized.systems.homestead.farm.plots.length === 5,
  'farm plot count follows normalized unlocked plots');
ok(normalized.systems.homestead.farm.plots[0].ready === true &&
   normalized.systems.homestead.farm.plots[0].remainingSeconds === 0 &&
   normalized.systems.homestead.farm.plots[0].cropId === 'spiritRice',
  'mature crop remains planted and is never auto-harvested');
ok(normalized.systems.homestead.farm.plots[1].cropId === null,
  'invalid crop references reset only their own plot');
same(normalized.systems.homestead.formations.slots,
  ['gatheringFormation', null, null],
  'invalid formation slot references are removed in place');
same(normalized.systems.homestead.formations.owned,
  ['gatheringFormation'],
  'formation discovery keeps unique valid IDs');
ok(normalized.systems.homestead.beasts.roster.length === 2 &&
   normalized.systems.homestead.beasts.roster.some(
     (beast) => beast.id === 'beast-3' && beast.speciesId === 'rockshell'
   ),
  'valid roster beasts survive even when optional traits are invalid');
ok(normalized.systems.homestead.beasts.roster.find(
  (beast) => beast.id === 'beast-1'
).level === 99,
  'beast levels use the same 1-99 clamp');
same(normalized.systems.homestead.beasts.activeIds, ['beast-1'],
  'active beast references are valid, unique, and roster-backed');
ok(normalized.systems.homestead.beasts.encounters.length === 1 &&
   normalized.systems.homestead.beasts.encounters[0].speciesId ===
     'waterTurtle',
  'invalid encounter species are removed');
ok(normalized.systems.parallel.jobs[0].remainingAnchorMs === 10 &&
   normalized.systems.parallel.jobs[0].remainingBaseSeconds === 4 &&
   normalized.systems.world.tickAnchorMs === 10 &&
   normalized.systems.world.tickBaseSeconds === 2.5,
  'parallel and world Stage 1B exact-time metadata survive normalization');
ok(JSON.stringify(adversarialInput, (key, value) =>
  Number.isNaN(value) ? '__NaN__' :
    value === Infinity ? '__Infinity__' : value) === adversarialBefore,
  'Stage 2 normalization never mutates its input');
ok(allNumbersFinite(JSON.parse(JSON.stringify(normalized))),
  'normalized Stage 2 state is JSON-only and finite');

const manyItems = {};
Object.keys(Items.ITEMS).slice(0, 41).forEach((itemId) => {
  manyItems[itemId] = 1;
});
const overCapacityLegacy = Stage2State.migrateLegacyPlayer({
  bag: manyItems,
  inventory: { capacity: 1 }
});
ok(Stage2State.occupiedSlots(overCapacityLegacy.player.inventory) === 41 &&
   overCapacityLegacy.player.inventory.capacity === 41,
  'legacy migration expands capacity enough to retain every occupied stack');

const existingContainers = {
  gathering: {
    nextSpotId: 18,
    spots: {
      herb: {
        instanceId: 'spot-17',
        skillId: 'herb',
        entryId: 'parityHerb1',
        quality: 'fine',
        capacity: 8,
        remaining: 4
      }
    },
    fishStocks: { spiritCarp: 3 },
    fishRecoverAcc: 19
  },
  homestead: {
    farm: {
      unlockedPlots: 1,
      plots: [{
        id: 'plot-1',
        cropId: 'spiritRice',
        remainingSeconds: 0,
        totalSeconds: 300,
        ready: true
      }]
    },
    formations: {
      slots: ['gatheringFormation'],
      owned: ['gatheringFormation']
    },
    beasts: {
      nextId: 2,
      roster: [{
        id: 'beast-1',
        speciesId: 'spiritFox',
        level: 4,
        xp: 5,
        traitId: 'keenNose',
        growthId: 'steady'
      }],
      encounters: [],
      activeIds: ['beast-1']
    }
  },
  parallel: { jobs: [] },
  world: { tickAccumulator: 0 }
};
const preservedContainers = Stage2State.migrateLegacyPlayer(
  { name: '已迁移角色' },
  existingContainers
);
ok(preservedContainers.systems.gathering.spots.herb.instanceId ===
   'spot-17' &&
   preservedContainers.systems.homestead.farm.plots[0].ready === true &&
   preservedContainers.systems.homestead.formations.slots[0] ===
     'gatheringFormation' &&
   preservedContainers.systems.homestead.beasts.roster[0].level === 4,
  'already-normalized Stage 2 containers are never overwritten');

const directHalfAnchors = Stage2State.normalize({
  player: { name: '半锚点角色' },
  systems: {
    homestead: {
      farm: {
        unlockedPlots: 1,
        plots: [{
          id: 'plot-1',
          cropId: 'spiritRice',
          remainingSeconds: 12,
          totalSeconds: 300,
          ready: false,
          remainingAnchorMs: 500
        }]
      }
    },
    parallel: {
      jobs: [{
        id: 'social-1',
        remainingSeconds: 8,
        remainingAnchorMs: 500
      }]
    }
  }
});
ok(directHalfAnchors.systems.parallel.jobs[0].remainingAnchorMs === null &&
   directHalfAnchors.systems.parallel.jobs[0].remainingBaseSeconds === null &&
   directHalfAnchors.systems.homestead.farm.plots[0]
     .remainingAnchorMs === null &&
   directHalfAnchors.systems.homestead.farm.plots[0]
     .remainingBaseSeconds === null,
  'direct Stage2 normalization completes every half timer anchor as null/null');

const stableCounterModel = Stage2State.normalize({
  player: { name: '稳定编号角色' },
  systems: {
    gathering: {
      nextSpotId: 2,
      spots: {
        herb: {
          instanceId: 'spot-44',
          skillId: 'herb',
          entryId: 'parityHerb1',
          quality: 'common',
          capacity: 20,
          remaining: 10
        }
      }
    },
    homestead: {
      beasts: {
        nextId: 2,
        roster: [{
          id: 'beast-12',
          speciesId: 'spiritFox',
          level: 2,
          xp: 0,
          traitId: 'keenNose',
          growthId: 'steady'
        }],
        encounters: [{
          id: 'encounter-41',
          speciesId: 'rockshell'
        }, {
          id: 'beast-51',
          speciesId: 'azureCrane'
        }],
        activeIds: []
      }
    }
  }
});
const stableCounterAdapter = jsonAdapter();
const stableCounterSnapshot = SaveSystem.createSnapshot(
  stableCounterModel,
  700
);
SaveSystem.save(stableCounterAdapter, stableCounterSnapshot, 700);
const stableCounterReload = SaveSystem.load(
  stableCounterAdapter,
  700
).snapshot;
ok(stableCounterReload.systems.homestead.beasts.nextId === 52 &&
   stableCounterReload.systems.gathering.nextSpotId === 45,
  'stable counters survive save/reload above every persisted numeric ID');
const continuedCounters = JSON.parse(JSON.stringify(stableCounterReload));
continuedCounters.systems.homestead.beasts.roster.push({
  id: 'beast-52',
  speciesId: 'spiritFox',
  level: 1,
  xp: 0,
  traitId: 'keenNose',
  growthId: 'steady'
});
continuedCounters.systems.gathering.spots.mining = {
  id: 'copper',
  cap: 10,
  left: 10
};
const continuedCounterModel = Stage2State.normalize(continuedCounters);
ok(continuedCounterModel.systems.homestead.beasts.nextId === 53 &&
   continuedCounterModel.systems.gathering.spots.mining.instanceId ===
     'spot-45' &&
   continuedCounterModel.systems.gathering.nextSpotId === 46,
  'continued allocations cannot reuse persisted beast or resource-point IDs');

const pendingWarningModel = StateModel.normalize({
  savedAt: 1000,
  player: { name: '旧动作角色' },
  current: {
    key: 'removed_prototype_action',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    stalled: false
  },
  pendingOfflineReport: { caiyao: 1 }
}, 2000);
ok(pendingWarningModel.current === null,
  'StateModel clears removed prototype actions');
ok(pendingWarningModel.pendingOfflineReports.length === 1 &&
   pendingWarningModel.pendingOfflineReports[0].warnings.includes(
     'legacy_action_removed'
   ),
  'removed prototype action is disclosed on the next pending report');

const canonicalActionModel = StateModel.normalize({
  current: {
    key: 'caiyao',
    mode: 'repeat',
    count: 0,
    done: 2,
    elapsed: 1,
    elapsedAnchorMs: 100,
    elapsedBaseSeconds: 1,
    stalled: false
  }
}, 100);
ok(canonicalActionModel.current.key === 'gather:explore:herb' &&
   canonicalActionModel.current.elapsedAnchorMs === 100 &&
   canonicalActionModel.current.elapsedBaseSeconds === 1,
  'StateModel migrates action aliases without weakening exact-time fields');

function v2Snapshot(playerOverrides, systemOverrides) {
  const player = Object.assign({
    name: '迁移角色',
    realmStage: 2,
    realm: '筑基',
    title: '',
    xiwei: 123.5,
    breakNeed: 456,
    mood: 70,
    moodAnchorMs: 8000.125,
    moodBase: 70,
    jingqi: 80,
    lingshi: 987,
    shengwang: 4,
    lingyu: 3,
    shouyuan: 90,
    shouMax: 120,
    lifespanAnchorMs: 8000.125,
    lifespanBaseYears: 90,
    inventory: { stacks: { yaocai: 2, copperOre: 3 } },
    skills: { caiyao: { lv: 6, xp: 7 } },
    mastery: {}
  }, playerOverrides || {});
  const systems = Object.assign({
    gathering: {
      spots: { herb: { id: 'parityHerb1', cap: 10, left: 6 } },
      fishStocks: { pond: 15 },
      fishRecoverAcc: 11,
      fishRecoverAnchorMs: 8000.125,
      fishRecoverBaseSeconds: 11
    },
    homestead: {
      farm: { plots: [] },
      formations: { slots: [], owned: [] },
      beasts: { roster: [], activeIds: [] }
    },
    parallel: { jobs: [] },
    world: {
      tickAccumulator: 0.25,
      tickAnchorMs: 8000.125,
      tickBaseSeconds: 0.25
    }
  }, systemOverrides || {});
  return {
    schemaVersion: 2,
    savedAt: 8000.125,
    modelVersion: 1,
    created: true,
    appearance: { parts: { hair: 2 } },
    player,
    current: {
      key: 'caiyao',
      mode: 'repeat',
      count: 0,
      done: 4,
      elapsed: 0.4,
      elapsedAnchorMs: 8000.125,
      elapsedBaseSeconds: 0.4,
      stalled: false
    },
    rngState: 0x12345678,
    offlineLimitSeconds: 43200,
    systems,
    pendingOfflineReport: {
      version: 1,
      reports: [{
        id: 'legacy-report',
        source: 'offline',
        fromMs: 7000.125,
        toMs: 8000.125,
        requestedSeconds: 1,
        action: {
          key: 'caiyao',
          completed: 1,
          stopReason: null,
          stopAtMs: null
        },
        gains: {
          items: { yaocai: 1 },
          skillXp: {},
          masteryXp: {},
          cultivation: 2
        },
        costs: { items: {}, supplies: {} },
        levels: [],
        unlocks: [],
        passive: {
          fishRecovered: 0,
          farmCompleted: [],
          parallelCompleted: []
        },
        world: { ticks: 0, events: [] },
        warnings: []
      }]
    },
    reportArchive: [{ id: 'archive-only', source: 'offline' }],
    processedThroughMs: 8000.125,
    lastActionStop: null
  };
}

const v2Raw = v2Snapshot();
const v2Adapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(v2Raw)
});
const v2Loaded = SaveSystem.load(v2Adapter, 9000.875);
ok(v2Loaded.source === 'snapshot' && v2Loaded.migrated === true &&
   v2Loaded.needsRepair === true,
  'schema v2 explicitly migrates through v3 and v4 to v5 and requests durable repair');
ok(v2Loaded.snapshot.schemaVersion === 5,
  'migrated snapshot has schema version five');
ok(v2Loaded.snapshot.savedAt === 8000.125 &&
   v2Loaded.snapshot.processedThroughMs === 8000.125,
  'v2 migration preserves sub-millisecond timestamps exactly');
ok(v2Loaded.snapshot.player.lingshi === 987 &&
   v2Loaded.snapshot.player.breakthrough.cultivation === 123.5 &&
   v2Loaded.snapshot.player.breakthrough.realmId === 'qi-3' &&
   v2Loaded.snapshot.current.key === 'gather:explore:herb' &&
   v2Loaded.snapshot.current.done === 4 &&
   v2Loaded.snapshot.current.elapsed === 0.4,
  'v2 migration preserves currency, cultivation, and action');
const v2Repeated = SaveSystem.load(jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(v2Raw)
}), 9000.875);
ok(v2Loaded.snapshot.rngState !== 0x12345678 &&
   v2Repeated.snapshot.rngState === v2Loaded.snapshot.rngState &&
   JSON.stringify(v2Repeated.snapshot.systems.npcs.records) ===
     JSON.stringify(v2Loaded.snapshot.systems.npcs.records),
  'v4→v5 bootstrap deterministically advances the saved RNG');
ok(Object.keys(v2Loaded.snapshot.systems.npcs.records).length === 120 &&
   v2Loaded.snapshot.systems.npcs.nextId === 121,
  'v2 migration persists the first 120 permanent characters');
ok(v2Loaded.snapshot.pendingOfflineReports[0].id === 'legacy-report' &&
   v2Loaded.snapshot.pendingOfflineReports[0].gains.cultivation === 2 &&
   v2Loaded.snapshot.reportArchive[0].id === 'archive-only',
  'v2 migration preserves pending and archived simulation reports');
ok(v2Adapter.writes === 0,
  'loading a v2 migration performs no hidden write');
ok(SaveSystem.save(v2Adapter, v2Loaded.snapshot, 9000.875) === true,
  'the migrated v5 population can be durably repaired');
const v2Reopened = SaveSystem.load(v2Adapter, 9000.875);
ok(v2Reopened.snapshot.rngState === v2Loaded.snapshot.rngState &&
   JSON.stringify(v2Reopened.snapshot.systems.npcs.records) ===
     JSON.stringify(v2Loaded.snapshot.systems.npcs.records),
  'reopening the repaired v5 snapshot never rerolls people or RNG');

const v1Raw = {
  schemaVersion: 1,
  savedAt: 8000.125,
  created: true,
  appearance: { parts: { hair: 2 } },
  player: {
    name: '迁移角色',
    realmStage: 2,
    realm: '筑基',
    xiwei: 123.5,
    lingshi: 987,
    items: { yaocai: 2 },
    bag: { copperOre: 3 },
    skills: { caiyao: { lv: 6, xp: 7 } },
    mastery: {},
    spots: { herb: { id: 'parityHerb1', cap: 10, left: 6 } },
    fishing: { pond: 15 }
  },
  current: {
    key: 'caiyao',
    mode: 'repeat',
    count: 0,
    done: 4,
    elapsed: 0.4,
    stalled: false
  },
  rngState: 0x12345678,
  fishRecoverAcc: 11,
  pendingOfflineReport: null
};
const v1Loaded = SaveSystem.load(jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(v1Raw)
}), 9000.875);
ok(v1Loaded.snapshot.schemaVersion === 5 &&
   v1Loaded.migrated === true && v1Loaded.needsRepair === true,
  'schema v1 explicitly migrates through v2, v3, and v4 to v5');
same({
  skills: v1Loaded.snapshot.player.skills,
  inventory: v1Loaded.snapshot.player.inventory,
  gathering: v1Loaded.snapshot.systems.gathering,
  current: {
    key: v1Loaded.snapshot.current.key,
    mode: v1Loaded.snapshot.current.mode,
    count: v1Loaded.snapshot.current.count,
    done: v1Loaded.snapshot.current.done,
    elapsed: v1Loaded.snapshot.current.elapsed
  },
  rngState: v1Loaded.snapshot.rngState,
  processedThroughMs: v1Loaded.snapshot.processedThroughMs
}, {
  skills: v2Loaded.snapshot.player.skills,
  inventory: v2Loaded.snapshot.player.inventory,
  gathering: Object.assign({}, v2Loaded.snapshot.systems.gathering, {
    fishRecoverAnchorMs: null,
    fishRecoverBaseSeconds: null
  }),
  current: {
    key: v2Loaded.snapshot.current.key,
    mode: v2Loaded.snapshot.current.mode,
    count: v2Loaded.snapshot.current.count,
    done: v2Loaded.snapshot.current.done,
    elapsed: v2Loaded.snapshot.current.elapsed
  },
  rngState: v2Loaded.snapshot.rngState,
  processedThroughMs: v2Loaded.snapshot.processedThroughMs
}, 'v1→v2→v3→v4→v5 and equivalent direct v2 migration progress are identical');

function removedWarningCount(model) {
  return model.pendingOfflineReports.reduce((total, report) =>
    total + report.warnings.filter((warning) =>
      warning === 'legacy_action_removed').length, 0);
}

function loadThenNormalize(adapter, now) {
  const loaded = SaveSystem.load(adapter, now);
  return {
    loaded,
    model: StateModel.normalize(
      loaded.snapshot,
      loaded.snapshot.processedThroughMs
    )
  };
}

const removedV2 = v2Snapshot();
removedV2.current.key = 'removed_v2_action';
const removedV2Result = loadThenNormalize(jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(removedV2)
}), 9001);
ok(removedV2Result.model.current === null &&
   removedV2Result.model.pendingOfflineReports.length === 1 &&
   removedV2Result.model.pendingOfflineReports[0].id === 'legacy-report' &&
   removedWarningCount(removedV2Result.model) === 1,
  'v2 removed action appends exactly one warning to the next pending report');

const removedV1 = JSON.parse(JSON.stringify(v1Raw));
removedV1.current.key = 'removed_v1_action';
const removedV1Result = loadThenNormalize(jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(removedV1)
}), 9002);
ok(removedV1Result.model.current === null &&
   removedV1Result.model.pendingOfflineReports.length === 1 &&
   removedV1Result.model.pendingOfflineReports[0].requestedSeconds === 0 &&
   removedV1Result.model.pendingOfflineReports[0].fromMs ===
     removedV1Result.model.pendingOfflineReports[0].toMs &&
   removedWarningCount(removedV1Result.model) === 1,
  'v1 removed action creates one zero-duration warning report');

const removedLegacyResult = loadThenNormalize(jsonAdapter({
  cloud_created: JSON.stringify(1),
  cloud_nie: JSON.stringify({ parts: { hair: 1 } }),
  cloud_player: JSON.stringify({ name: '旧分键角色' }),
  cloud_current: JSON.stringify({
    key: 'removed_legacy_action',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    stalled: false
  }),
  cloud_lastsave: JSON.stringify(9003)
}), 9003);
ok(removedLegacyResult.loaded.source === 'legacy' &&
   removedLegacyResult.model.current === null &&
   removedWarningCount(removedLegacyResult.model) === 1,
  'split-key legacy load discloses a removed action exactly once');

const prewarnedV2 = v2Snapshot();
prewarnedV2.current.key = 'removed_pre_warned_action';
prewarnedV2.pendingOfflineReport.reports[0].warnings.push(
  'legacy_action_removed'
);
const prewarnedV2Result = loadThenNormalize(jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(prewarnedV2)
}), 9004);
ok(removedWarningCount(prewarnedV2Result.model) === 1,
  'migration never duplicates an existing removed-action warning');

const knownAliasV2 = v2Snapshot();
knownAliasV2.current.key = 'liandan_heal';
const knownAliasV2Result = loadThenNormalize(jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(knownAliasV2)
}), 9005);
ok(knownAliasV2Result.model.current.key ===
     'produce:alchemy:healingPill' &&
   removedWarningCount(knownAliasV2Result.model) === 0,
  'known aliases migrate without a removed-action warning');

const canonicalSnapshot = SaveSystem.createSnapshot(
  StateModel.toSnapshotInput(StateModel.normalize({
    created: true,
    player: {
      name: '往返角色',
      lingshi: 33,
      xiwei: 44,
      inventory: {
        capacity: 40,
        capacityGrants: { shop: 0, achievement: 0, task: 0 },
        stacks: {
          spiritRice: 2,
          gatheringFormation: 1,
          beastFeed: 1
        },
        bindings: {
          gatheringFormation: {
            equipment: 0,
            task: 0,
            formation: 1
          }
        }
      }
    },
    systems: {
      gathering: {
        nextSpotId: 8,
        spots: {
          herb: {
            instanceId: 'spot-7',
            skillId: 'herb',
            entryId: 'parityHerb1',
            quality: 'fine',
            capacity: 10,
            remaining: 4
          }
        },
        fishStocks: { spiritCarp: 7 },
        fishRecoverAcc: 12.25
      },
      homestead: {
        farm: {
          unlockedPlots: 3,
          plots: [{
            id: 'plot-1',
            cropId: 'spiritRice',
            remainingSeconds: 23.5,
            totalSeconds: 300,
            ready: false,
            remainingAnchorMs: 1000.125,
            remainingBaseSeconds: 23.5
          }]
        },
        formations: {
          slots: ['gatheringFormation'],
          owned: ['gatheringFormation']
        },
        beasts: {
          nextId: 2,
          roster: [{
            id: 'beast-1',
            speciesId: 'spiritFox',
            level: 3,
            xp: 4,
            traitId: 'keenNose',
            growthId: 'steady'
          }],
          encounters: [],
          activeIds: ['beast-1']
        }
      },
      parallel: { jobs: [] },
      world: { tickAccumulator: 0 }
    },
    processedThroughMs: 1000.125
  }, 1000.125)),
  1000.125
);
const roundTripAdapter = jsonAdapter();
ok(SaveSystem.save(roundTripAdapter, canonicalSnapshot, 1000.125) === true,
  'canonical v5 snapshot saves');
const roundTripped = SaveSystem.load(roundTripAdapter, 1000.125);
ok(roundTripped.source === 'snapshot' && !roundTripped.migrated &&
   !roundTripped.needsRepair,
  'canonical v5 snapshot reloads without migration or repair');
same(roundTripped.snapshot.player.inventory,
  canonicalSnapshot.player.inventory,
  'inventory survives a real JSON snapshot round-trip');
same(roundTripped.snapshot.player.skills, canonicalSnapshot.player.skills,
  'skills survive a real JSON snapshot round-trip');
same(roundTripped.snapshot.player.mastery, canonicalSnapshot.player.mastery,
  'mastery survives a real JSON snapshot round-trip');
same(roundTripped.snapshot.systems.gathering,
  canonicalSnapshot.systems.gathering,
  'gathering survives a real JSON snapshot round-trip');
same(roundTripped.snapshot.systems.homestead,
  canonicalSnapshot.systems.homestead,
  'homestead survives a real JSON snapshot round-trip');
ok(roundTripped.snapshot.processedThroughMs === 1000.125,
  'sub-millisecond watermark survives a real JSON round-trip');

function brokenPrimary(mutator) {
  const broken = JSON.parse(JSON.stringify(canonicalSnapshot));
  mutator(broken);
  const adapter = jsonAdapter({
    [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(broken),
    [SaveSystem.BACKUP_KEY]: JSON.stringify(canonicalSnapshot)
  });
  return SaveSystem.load(adapter, 2000.5);
}

const strictReportFixture = StateModel.normalize(
  v2Loaded.snapshot,
  v2Loaded.snapshot.processedThroughMs
).pendingOfflineReports[0];

[
  ['missing skills', (snapshot) => { delete snapshot.player.skills; }],
  ['primitive skills', (snapshot) => { snapshot.player.skills = 7; }],
  ['negative stack', (snapshot) => {
    snapshot.player.inventory.stacks.copperOre = -1;
  }],
  ['negative spiritual stones', (snapshot) => {
    snapshot.player.lingshi = -99;
  }],
  ['player runtime cache', (snapshot) => {
    snapshot.player.runtimeCache = { selectedRow: 7 };
  }],
  ['unknown active skill', (snapshot) => {
    snapshot.player.skills.prototypeSkill = { level: 3, xp: 4 };
  }],
  ['primitive archive report', (snapshot) => {
    snapshot.reportArchive = [7];
  }],
  ['primitive pending report', (snapshot) => {
    snapshot.pendingOfflineReport = { version: 1, reports: [7] };
  }],
  ['pending report extra field', (snapshot) => {
    const report = JSON.parse(JSON.stringify(strictReportFixture));
    report.runtimeCache = true;
    snapshot.pendingOfflineReport = { version: 1, reports: [report] };
  }],
  ['negative report quantity', (snapshot) => {
    const report = JSON.parse(JSON.stringify(strictReportFixture));
    report.gains.items.copperOre = -1;
    snapshot.reportArchive = [report];
  }],
  ['half action anchor', (snapshot) => {
    snapshot.current = {
      key: 'fish:pond',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      elapsedAnchorMs: 1000,
      elapsedBaseSeconds: null,
      stalled: false
    };
  }],
  ['half fish anchor', (snapshot) => {
    snapshot.systems.gathering.fishRecoverAnchorMs = 1000;
    snapshot.systems.gathering.fishRecoverBaseSeconds = null;
  }],
  ['half farm anchor', (snapshot) => {
    snapshot.systems.homestead.farm.plots[0].remainingAnchorMs = 1000;
    snapshot.systems.homestead.farm.plots[0].remainingBaseSeconds = null;
  }],
  ['half world anchor', (snapshot) => {
    snapshot.systems.world.tickAnchorMs = 1000;
    snapshot.systems.world.tickBaseSeconds = null;
  }]
].forEach(([label, mutator]) => {
  const recovered = brokenPrimary(mutator);
  ok(recovered.source === 'backup' && recovered.needsRepair === true,
    'bad v5 Stage 2 structure falls back to backup: ' + label);
});

const dirtySnapshotInput = JSON.parse(JSON.stringify(canonicalSnapshot));
dirtySnapshotInput.player.lingshi = -99;
dirtySnapshotInput.player.xiwei = 'bad';
dirtySnapshotInput.player.runtimeCache = { selectedRow: 7 };
dirtySnapshotInput.pendingOfflineReport = {
  version: 1,
  reports: [{
    source: 'offline',
    fromMs: -10,
    toMs: 1000.125,
    warnings: [7, 'kept_warning'],
    runtimeCache: true
  }]
};
dirtySnapshotInput.reportArchive = [7];
const sanitizedCreatedSnapshot = SaveSystem.createSnapshot(
  dirtySnapshotInput,
  1000.125
);
let sanitizedSummary = null;
let sanitizedSummaryError = null;
try {
  sanitizedSummary = SimulationReport.summarize(
    sanitizedCreatedSnapshot.pendingOfflineReport.reports
  );
} catch (error) {
  sanitizedSummaryError = error;
}
if (sanitizedSummaryError) {
  console.error('  sanitized report error: ' + sanitizedSummaryError.stack);
}
ok(sanitizedCreatedSnapshot.player.lingshi === 0 &&
   !('xiwei' in sanitizedCreatedSnapshot.player) &&
   sanitizedCreatedSnapshot.player.breakthrough.cultivation === 44 &&
   !('runtimeCache' in sanitizedCreatedSnapshot.player) &&
   sanitizedCreatedSnapshot.reportArchive.length === 0 &&
   sanitizedCreatedSnapshot.pendingOfflineReport.reports.length === 1 &&
   !('runtimeCache' in
     sanitizedCreatedSnapshot.pendingOfflineReport.reports[0]) &&
   sanitizedCreatedSnapshot.pendingOfflineReport.reports[0].fromMs === 0 &&
   sanitizedCreatedSnapshot.pendingOfflineReport.reports[0].warnings.length ===
     1 &&
   sanitizedSummary &&
   sanitizedSummary.warnings.includes('kept_warning'),
  'snapshot creation strips unknown fields and emits consumable finite reports');

const repairedLoad = brokenPrimary((snapshot) => {
  snapshot.player.inventory.capacity = -1;
});
const repairedModel = StateModel.normalize(
  repairedLoad.snapshot,
  repairedLoad.snapshot.processedThroughMs
);
let repairedAdvance = null;
let repairedAdvanceError = null;
try {
  repairedAdvance = Simulation.advance(repairedModel, 0, {
    source: 'offline',
    fromMs: repairedModel.processedThroughMs,
    rules: {
      getAction() { return null; },
      nextBoundary() { return Infinity; },
      elapse() {},
      inspect() { return { status: 'stop', reason: 'invalid_action' }; },
      complete() {},
      random(seed) { return { seed, value: 0 }; }
    },
    lanes: []
  });
} catch (error) {
  repairedAdvance = null;
  repairedAdvanceError = error;
}
if (repairedAdvanceError) {
  console.error('  repair simulation error: ' + repairedAdvanceError.stack);
}
ok(repairedAdvance && repairedAdvance.state.player.inventory.capacity >= 40,
  'backup-repaired Stage 2 model is immediately safe for Simulation.advance');

const futurePrimary = JSON.stringify({
  schemaVersion: SaveSystem.SCHEMA_VERSION + 9,
  savedAt: 50,
  irreplaceable: { stage4: true }
});
const futureBackup = JSON.stringify({
  schemaVersion: SaveSystem.SCHEMA_VERSION + 3,
  savedAt: 40,
  irreplaceable: { stage3: true }
});
const futureAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: futurePrimary,
  [SaveSystem.BACKUP_KEY]: futureBackup
});
const futureLoad = SaveSystem.load(futureAdapter, 100);
const writesBeforeFutureSave = futureAdapter.writes;
ok(futureLoad.writeProtected === true &&
   futureLoad.futureSchemaVersion === SaveSystem.SCHEMA_VERSION + 9 &&
   SaveSystem.save(futureAdapter, defaults, 100) === false &&
   futureAdapter.writes === writesBeforeFutureSave &&
   futureAdapter.raw[SaveSystem.SNAPSHOT_KEY] === futurePrimary &&
   futureAdapter.raw[SaveSystem.BACKUP_KEY] === futureBackup,
  'future schema blocks every write and preserves exact primary/backup bytes');

const validV5PrimaryBytes = JSON.stringify(canonicalSnapshot);
const v6BackupBytes = JSON.stringify({
  schemaVersion: 6,
  savedAt: 75,
  irreplaceable: { nextStage: true }
});
const futureBackupAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: validV5PrimaryBytes,
  [SaveSystem.BACKUP_KEY]: v6BackupBytes
});
const futureBackupLoad = SaveSystem.load(futureBackupAdapter, 100);
const futureBackupWrites = futureBackupAdapter.writes;
ok(futureBackupLoad.source === 'snapshot' &&
   futureBackupLoad.future === true &&
   futureBackupLoad.futureSchemaVersion === 6 &&
   futureBackupLoad.writeProtected === true &&
   futureBackupLoad.needsRepair === false &&
   SaveSystem.save(
     futureBackupAdapter,
     futureBackupLoad.snapshot,
     100
   ) === false &&
   futureBackupAdapter.writes === futureBackupWrites &&
   futureBackupAdapter.raw[SaveSystem.SNAPSHOT_KEY] === validV5PrimaryBytes &&
   futureBackupAdapter.raw[SaveSystem.BACKUP_KEY] === v6BackupBytes,
  'active-v5 load scans a future backup and preserves both exact byte strings');

const runtime = { cache: { canvas: true }, navIndex: 4 };
StateModel.applyToRuntime(runtime, roundTripped.snapshot);
const extracted = StateModel.fromRuntime(runtime, 1000.125);
same(extracted.player.inventory, roundTripped.snapshot.player.inventory,
  'runtime boundary preserves Stage 2 inventory');
same(extracted.player.skills, roundTripped.snapshot.player.skills,
  'runtime boundary preserves Stage 2 skills');
same(extracted.player.mastery, roundTripped.snapshot.player.mastery,
  'runtime boundary preserves Stage 2 mastery');
same(extracted.systems.gathering, roundTripped.snapshot.systems.gathering,
  'runtime boundary preserves Stage 2 gathering');
same(extracted.systems.homestead, roundTripped.snapshot.systems.homestead,
  'runtime boundary preserves Stage 2 homestead');
ok(!('cache' in StateModel.toSnapshotInput(extracted)) &&
   runtime.cache.canvas === true && runtime.navIndex === 4,
  'runtime-only UI cache remains outside the single snapshot');

const sourceText = fs.readFileSync('core/stage2-state.js', 'utf8');
ok(!/\b(document|localStorage|sessionStorage|Math\.random)\b/.test(sourceText),
  'Stage 2 state module has no DOM, storage, or global randomness');

const browserSandbox = {
  console,
  Math, Date, JSON, Object, Array, String, Number, Boolean,
  isFinite, isNaN, parseInt, parseFloat, Set, Map, Proxy, RegExp, Error
};
browserSandbox.globalThis = browserSandbox;
vm.createContext(browserSandbox);
[
  'content/herblore-parity.js',
  'content/materials.js',
  'content/items.js',
  'content/life-skills.js',
  'content/gathering.js',
  'content/recipes.js',
  'content/homestead.js',
  'core/stage2-state.js'
].forEach((file) => {
  vm.runInContext(fs.readFileSync(file, 'utf8'), browserSandbox, {
    filename: file
  });
});
ok(typeof browserSandbox.Stage2State.createDefaults === 'function' &&
   browserSandbox.Stage2State.createDefaults()
     .systems.homestead.farm.unlockedPlots === 3,
  'Stage 2 state exposes the same UMD browser API');

const legacyCompositionSandbox = { console, JSON, Object, Array, Number };
legacyCompositionSandbox.globalThis = legacyCompositionSandbox;
vm.createContext(legacyCompositionSandbox);
vm.runInContext(
  fs.readFileSync('core/save-system.js', 'utf8'),
  legacyCompositionSandbox,
  { filename: 'core/save-system.js' }
);
const LegacyCompositionSave = legacyCompositionSandbox.SaveSystem;
const legacyCompositionV2 = LegacyCompositionSave.createSnapshot({
  player: { name: '尚未装配 Stage 2' }
}, 77.25);
ok(LegacyCompositionSave.SCHEMA_VERSION === 5 &&
   legacyCompositionV2.schemaVersion === 2,
  'public schema target stays five while unassembled composition writes only v2');
const legacyCompositionAdapter = jsonAdapter({
  [LegacyCompositionSave.SNAPSHOT_KEY]: JSON.stringify(legacyCompositionV2)
});
const legacyCompositionLoad = LegacyCompositionSave.load(
  legacyCompositionAdapter,
  80.5
);
ok(legacyCompositionLoad.source === 'snapshot' &&
   legacyCompositionLoad.snapshot.schemaVersion === 2 &&
   legacyCompositionLoad.writeProtected === false,
  'unassembled composition safely continues its existing v2 protocol');
const legacyV2PrimaryBytes = JSON.stringify(legacyCompositionV2);
const legacyV3BackupBytes = JSON.stringify({
  schemaVersion: 3,
  savedAt: 79,
  irreplaceable: { stage2: true }
});
const legacyFutureBackupAdapter = jsonAdapter({
  [LegacyCompositionSave.SNAPSHOT_KEY]: legacyV2PrimaryBytes,
  [LegacyCompositionSave.BACKUP_KEY]: legacyV3BackupBytes
});
const legacyFutureBackupLoad = LegacyCompositionSave.load(
  legacyFutureBackupAdapter,
  80.5
);
const legacyFutureBackupWrites = legacyFutureBackupAdapter.writes;
ok(legacyFutureBackupLoad.source === 'snapshot' &&
   legacyFutureBackupLoad.future === true &&
   legacyFutureBackupLoad.futureSchemaVersion === 3 &&
   legacyFutureBackupLoad.writeProtected === true &&
   legacyFutureBackupLoad.needsRepair === false &&
   LegacyCompositionSave.save(
     legacyFutureBackupAdapter,
     legacyFutureBackupLoad.snapshot,
     80.5
   ) === false &&
   legacyFutureBackupAdapter.writes === legacyFutureBackupWrites &&
   legacyFutureBackupAdapter.raw[LegacyCompositionSave.SNAPSHOT_KEY] ===
     legacyV2PrimaryBytes &&
   legacyFutureBackupAdapter.raw[LegacyCompositionSave.BACKUP_KEY] ===
     legacyV3BackupBytes,
  'active-v2 load scans a v3 backup and preserves both exact byte strings');
const protectedV5Bytes = JSON.stringify(canonicalSnapshot);
const protectedV5Adapter = jsonAdapter({
  [LegacyCompositionSave.SNAPSHOT_KEY]: protectedV5Bytes
});
const protectedV5Load = LegacyCompositionSave.load(
  protectedV5Adapter,
  2000
);
const protectedV5Writes = protectedV5Adapter.writes;
ok(protectedV5Load.future === true &&
   protectedV5Load.futureSchemaVersion === 5 &&
   protectedV5Load.writeProtected === true &&
   LegacyCompositionSave.save(
     protectedV5Adapter,
     legacyCompositionV2,
     2000
   ) === false &&
   protectedV5Adapter.writes === protectedV5Writes &&
   protectedV5Adapter.raw[LegacyCompositionSave.SNAPSHOT_KEY] ===
     protectedV5Bytes,
  'unassembled composition treats v5 as future and performs zero writes');

console.log('\n=== Stage 2 状态自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
