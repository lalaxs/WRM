'use strict';

const fs = require('fs');
const vm = require('vm');
const CombatContent = require('../content/combat.js');
const TechniqueContent = require('../content/techniques.js');
const RealmContent = require('../content/realms.js');
const Stage3State = require('../core/stage3-state.js');
const CombatStats = require('../core/combat-stats.js');

let passed = 0;
let failed = 0;

function ok(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error('✗ ' + message);
  }
}

function same(actual, expected, message) {
  ok(
    JSON.stringify(actual) === JSON.stringify(expected),
    message + '\n  expected: ' + JSON.stringify(expected) +
      '\n  actual:   ' + JSON.stringify(actual)
  );
}

function exactKeys(value, keys, message) {
  same(Object.keys(value), keys, message);
}

function deeplyFrozen(value, seen) {
  if (!value || typeof value !== 'object') return true;
  const visited = seen || new Set();
  if (visited.has(value)) return true;
  visited.add(value);
  if (!Object.isFrozen(value)) return false;
  return Object.keys(value).every(function (key) {
    return deeplyFrozen(value[key], visited);
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function freshModel(realmId) {
  const model = Stage3State.defaults();
  model.player.breakthrough.realmId = realmId || 'qi-1';
  return model;
}

function baseExpected(realmIndex) {
  return {
    maxHp: 100 + realmIndex * 40,
    maxQi: 100 + realmIndex * 10,
    attack: 12 + realmIndex * 5,
    defense: 5 + realmIndex * 3,
    accuracy: 75 + realmIndex * 2,
    evasion: 5 + realmIndex,
    critChance: Math.min(0.25, 0.05 + realmIndex * 0.005),
    attackIntervalTicks: Math.max(
      4,
      8 - Math.floor(realmIndex / 4)
    )
  };
}

const beforeGlobal = globalThis.CombatStats;
exactKeys(
  CombatStats,
  ['derive', 'conditionMet', 'selectAction'],
  'CombatStats exposes only the Task 5 public API'
);
ok(Object.isFrozen(CombatStats), 'CombatStats public API is frozen');
ok(
  globalThis.CombatStats === beforeGlobal,
  'CommonJS loading does not attach a browser global'
);

// A wrong realm mapping or base formula must fail at the low, middle, and
// final indices rather than passing through a shared implementation helper.
[
  ['qi-1', 0],
  ['qi-9', 8],
  ['ascension', 16]
].forEach(function (fixture) {
  const stats = CombatStats.derive(freshModel(fixture[0]), 'loadout-1');
  same(
    stats,
    baseExpected(fixture[1]),
    'realm base is exact at index ' + fixture[1]
  );
  ok(deeplyFrozen(stats), 'realm snapshot is deeply frozen at ' + fixture[0]);
});

// Missing flat equipment, percentage passives, or the mandated order changes
// these independently hand-calculated values.
const equipped = freshModel();
equipped.player.combat.loadouts[0].equipment = {
  weapon: 'cloudwoodSword',
  armor: 'cloudRobe',
  accessory: 'breathJade'
};
same(
  CombatStats.derive(equipped, 'loadout-1'),
  {
    maxHp: 120,
    maxQi: 110,
    attack: 18,
    defense: 9,
    accuracy: 77,
    evasion: 6,
    critChance: 0.06,
    attackIntervalTicks: 8
  },
  'tier-one equipment applies exact flat stats'
);

const passive = clone(equipped);
passive.player.combat.loadouts[0].passiveTechniques = [
  'ironBody',
  'steadyBreath',
  'swiftShadow',
  null,
  null
];
passive.player.techniques.known = {
  ironBody: { level: 1, xp: 0 },
  steadyBreath: { level: 1, xp: 0 },
  swiftShadow: { level: 1, xp: 0 }
};
same(
  CombatStats.derive(passive, 'loadout-1'),
  {
    maxHp: 120,
    maxQi: 110,
    attack: 18,
    defense: 9.72,
    accuracy: 77,
    evasion: 6,
    critChance: 0.06,
    attackIntervalTicks: 8
  },
  'only unlocked passive slots apply at qi-1'
);

const levelledPassive = clone(equipped);
levelledPassive.player.combat.loadouts[0].passiveTechniques = [
  'ironBody',
  'steadyBreath',
  'swiftShadow',
  null,
  null
];
levelledPassive.player.techniques.known = {
  ironBody: { level: 20, xp: 0 },
  steadyBreath: { level: 20, xp: 0 },
  swiftShadow: { level: 20, xp: 0 }
};
const levelledStats = CombatStats.derive(levelledPassive, 'loadout-1');
ok(
  levelledStats.defense === 9.9252 &&
    levelledStats.maxQi === 110 &&
    levelledStats.attackIntervalTicks === 8,
  'learned passive levels use 1.5% scaling on unlocked slots only'
);

const noBreakthrough = CombatStats.derive(passive, 'loadout-1');
ok(
  !Object.keys(noBreakthrough).some(function (key) {
    return /break|probability|突破/i.test(key);
  }),
  'combat projection cannot affect breakthrough chance'
);

// A returned battle-start snapshot must not retain model/loadout references.
const isolatedModel = clone(passive);
const isolated = CombatStats.derive(isolatedModel, 'loadout-1');
isolatedModel.player.breakthrough.realmId = 'ascension';
isolatedModel.player.combat.loadouts[0].equipment.weapon = null;
isolatedModel.player.techniques.known.ironBody.level = 20;
same(
  isolated,
  {
    maxHp: 120,
    maxQi: 110,
    attack: 18,
    defense: 9.72,
    accuracy: 77,
    evasion: 6,
    critChance: 0.06,
    attackIntervalTicks: 8
  },
  'derived combat snapshot is detached from later model edits'
);

function battle(overrides) {
  const result = {
    player: {
      hp: 40,
      maxHp: 100,
      qi: 60,
      maxQi: 100,
      buffs: {},
      statuses: {},
      techniqueCooldowns: {}
    },
    enemy: {
      hp: 30,
      maxHp: 100,
      buffs: {},
      statuses: { shock: { remainingTicks: 2 } }
    }
  };
  if (overrides) overrides(result);
  return result;
}

// Each condition boundary catches an inclusive comparator or a missing-container
// shortcut. The evaluator must not draw randomness.
ok(
  CombatStats.conditionMet({ type: 'always' }, battle()),
  'always condition is satisfied'
);
ok(
  CombatStats.conditionMet(
    { type: 'selfHpBelow', threshold: 0.5 },
    battle()
  ),
  'selfHpBelow accepts a ratio below the threshold'
);
ok(
  !CombatStats.conditionMet(
    { type: 'selfHpBelow', threshold: 0.4 },
    battle()
  ),
  'selfHpBelow is false at the exact boundary'
);
ok(
  !CombatStats.conditionMet(
    { type: 'selfHpBelow', threshold: 0.009 },
    battle(function (value) { value.player.hp = 0; })
  ),
  'selfHpBelow rejects a threshold below 0.01 even at zero HP'
);
ok(
  CombatStats.conditionMet(
    { type: 'selfHpBelow', threshold: 0.01 },
    battle(function (value) { value.player.hp = 0; })
  ),
  'selfHpBelow accepts the 0.01 threshold at zero HP'
);
ok(
  CombatStats.conditionMet(
    { type: 'selfQiAbove', threshold: 0.5 },
    battle()
  ),
  'selfQiAbove accepts a ratio above the threshold'
);
ok(
  !CombatStats.conditionMet(
    { type: 'selfQiAbove', threshold: 0.6 },
    battle()
  ),
  'selfQiAbove is false at the exact boundary'
);
ok(
  CombatStats.conditionMet(
    { type: 'selfQiAbove', threshold: 0 },
    battle()
  ),
  'selfQiAbove alone accepts a zero threshold'
);
ok(
  CombatStats.conditionMet(
    { type: 'enemyHpBelow', threshold: 0.4 },
    battle()
  ),
  'enemyHpBelow accepts a ratio below the threshold'
);
ok(
  !CombatStats.conditionMet(
    { type: 'enemyHpBelow', threshold: 0.3 },
    battle()
  ),
  'enemyHpBelow is false at the exact boundary'
);
ok(
  !CombatStats.conditionMet(
    { type: 'enemyHpBelow', threshold: 0.009 },
    battle(function (value) { value.enemy.hp = 0; })
  ),
  'enemyHpBelow rejects a threshold below 0.01 even at zero HP'
);
ok(
  CombatStats.conditionMet(
    { type: 'enemyHpBelow', threshold: 0.01 },
    battle(function (value) { value.enemy.hp = 0; })
  ),
  'enemyHpBelow accepts the 0.01 threshold at zero HP'
);
ok(
  CombatStats.conditionMet(
    { type: 'enemyHasStatus', statusId: 'shock' },
    battle()
  ),
  'enemyHasStatus finds a present status'
);
ok(
  !CombatStats.conditionMet(
    { type: 'enemyHasStatus', statusId: 'burn' },
    battle()
  ),
  'enemyHasStatus rejects a missing status'
);
ok(
  !CombatStats.conditionMet(
    { type: 'enemyHasStatus', statusId: 'shock' },
    battle(function (value) { value.enemy = null; })
  ),
  'enemy conditions are false without an enemy'
);
ok(
  !CombatStats.conditionMet(
    { type: 'enemyHasStatus', statusId: 'shock' },
    battle(function (value) { delete value.enemy.statuses; })
  ),
  'enemy status condition is false without a status map'
);
ok(
  CombatStats.conditionMet(
    { type: 'selfMissingBuff', buffId: 'ward' },
    battle()
  ),
  'selfMissingBuff finds a missing key in a present buff map'
);
ok(
  !CombatStats.conditionMet(
    { type: 'selfMissingBuff', buffId: 'ward' },
    battle(function (value) {
      value.player.buffs.ward = { remainingTicks: 2 };
    })
  ),
  'selfMissingBuff rejects a present buff'
);
ok(
  !CombatStats.conditionMet(
    { type: 'selfMissingBuff', buffId: 'ward' },
    battle(function (value) { delete value.player.buffs; })
  ),
  'selfMissingBuff fails closed without a buff map'
);
ok(
  !CombatStats.conditionMet(
    { type: 'selfHpBelow', threshold: 0.5 },
    battle(function (value) { value.player.maxHp = 0; })
  ),
  'ratio conditions reject a missing positive denominator'
);
ok(
  !CombatStats.conditionMet({ type: 'unknown' }, battle()),
  'unknown condition fails closed'
);

function prioritySnapshot() {
  return {
    unlockedActiveSlots: 3,
    realmIndex: 10,
    activeTechniques: [
      {
        techniqueId: 'clearHeartArt',
        condition: { type: 'selfHpBelow', threshold: 0.5 }
      },
      {
        techniqueId: 'thunderSeal',
        condition: { type: 'enemyHpBelow', threshold: 0.4 }
      },
      {
        techniqueId: 'cloudPiercingSword',
        condition: { type: 'always' }
      }
    ],
    techniqueLevels: {
      clearHeartArt: 1,
      thunderSeal: 1,
      cloudPiercingSword: 1
    }
  };
}

const firstAction = CombatStats.selectAction(battle(), prioritySnapshot());
same(
  firstAction,
  { id: 'clearHeartArt', slotIndex: 0 },
  'leftmost ready skill wins (conditions ignored)'
);
ok(deeplyFrozen(firstAction), 'selected technique action is frozen');

function oneSkillSnapshot(techniqueLevels) {
  const snapshot = {
    activeTechniques: [
      {
        techniqueId: 'cloudPiercingSword',
        condition: { type: 'always' }
      }
    ]
  };
  if (arguments.length) snapshot.techniqueLevels = techniqueLevels;
  return snapshot;
}

same(
  CombatStats.selectAction(
    battle(),
    oneSkillSnapshot({ cloudPiercingSword: 1 })
  ),
  { id: 'cloudPiercingSword', slotIndex: 0 },
  'a normal learned-level record permits the configured technique'
);
same(
  CombatStats.selectAction(battle(), oneSkillSnapshot()),
  { id: 'normalAttack', slotIndex: null },
  'missing techniqueLevels fails closed as not learned'
);
same(
  CombatStats.selectAction(
    battle(),
    oneSkillSnapshot({ otherTechnique: 1 })
  ),
  { id: 'normalAttack', slotIndex: null },
  'a missing techniqueLevels key fails closed as not learned'
);
same(
  CombatStats.selectAction(battle(), oneSkillSnapshot([])),
  { id: 'normalAttack', slotIndex: null },
  'a non-record techniqueLevels map fails closed'
);
same(
  CombatStats.selectAction(battle(), oneSkillSnapshot(new Date(0))),
  { id: 'normalAttack', slotIndex: null },
  'an exotic techniqueLevels object fails closed'
);

let levelGetterRuns = 0;
const accessorLevels = {};
Object.defineProperty(accessorLevels, 'cloudPiercingSword', {
  enumerable: true,
  get: function () {
    levelGetterRuns++;
    return 1;
  }
});
same(
  CombatStats.selectAction(
    battle(),
    oneSkillSnapshot(accessorLevels)
  ),
  { id: 'normalAttack', slotIndex: null },
  'an accessor technique level fails closed'
);
ok(
  levelGetterRuns === 0,
  'technique level accessors are never invoked'
);

let levelProxyTraps = 0;
const proxiedLevels = new Proxy(
  { cloudPiercingSword: 1 },
  {
    ownKeys: function () {
      levelProxyTraps++;
      throw new Error('level proxy trap');
    }
  }
);
same(
  CombatStats.selectAction(
    battle(),
    oneSkillSnapshot(proxiedLevels)
  ),
  { id: 'normalAttack', slotIndex: null },
  'a proxied techniqueLevels map fails closed'
);
ok(
  levelProxyTraps === 0,
  'CommonJS detects a techniqueLevels proxy before entering its traps'
);

const secondAction = CombatStats.selectAction(
  battle(function (value) {
    value.player.hp = 100;
    value.enemy.hp = 30;
  }),
  prioritySnapshot()
);
same(
  secondAction,
  { id: 'clearHeartArt', slotIndex: 0 },
  'leftmost skill still wins when former conditions would have skipped it'
);

const thirdAction = CombatStats.selectAction(
  battle(function (value) {
    value.player.hp = 100;
    value.enemy.hp = 100;
    value.player.qi = 5;
    value.player.techniqueCooldowns.clearHeartArt = 1;
  }),
  prioritySnapshot()
);
same(
  thirdAction,
  { id: 'normalAttack', slotIndex: null },
  'falls back to normal attack when every technique is on cooldown or lacks qi'
);

const rejectedSnapshot = prioritySnapshot();
const rejectedBattle = battle(function (value) {
  value.player.hp = 100;
  value.enemy.hp = 30;
  value.player.qi = 5;
  value.player.techniqueCooldowns.thunderSeal = 1;
});
same(
  CombatStats.selectAction(rejectedBattle, rejectedSnapshot),
  { id: 'normalAttack', slotIndex: null },
  'normal attack is stable when cooldown and qi reject every skill'
);
ok(
  deeplyFrozen(CombatStats.selectAction({}, {})),
  'invalid selection input returns a frozen normal attack'
);
exactKeys(
  CombatStats.selectAction({}, {}),
  ['id', 'slotIndex'],
  'normal and technique actions share one stable shape'
);

let rngCalls = 0;
const savedRandom = Math.random;
try {
  Math.random = function () {
    rngCalls++;
    throw new Error('condition/action selection must not consume RNG');
  };
  CombatStats.conditionMet({ type: 'always' }, battle());
  CombatStats.selectAction(battle(), prioritySnapshot());
} finally {
  Math.random = savedRandom;
}
ok(rngCalls === 0, 'condition evaluation and priority selection consume no RNG');

// Descriptor-first inspection rejects accessors without invoking them.
let getterRuns = 0;
const accessorModel = freshModel();
Object.defineProperty(accessorModel.player.combat, 'loadouts', {
  enumerable: true,
  get: function () {
    getterRuns++;
    throw new Error('getter invoked');
  }
});
same(
  CombatStats.derive(accessorModel, 'loadout-1'),
  {
    maxHp: 1,
    maxQi: 1,
    attack: 1,
    defense: 1,
    accuracy: 0,
    evasion: 0,
    critChance: 0,
    attackIntervalTicks: 2
  },
  'hostile derive input fails closed to a stable minimum snapshot'
);
ok(getterRuns === 0, 'derive never invokes an input accessor');

const accessorCondition = { type: 'always' };
Object.defineProperty(accessorCondition, 'threshold', {
  enumerable: true,
  get: function () {
    getterRuns++;
    return 0.5;
  }
});
ok(
  !CombatStats.conditionMet(accessorCondition, battle()),
  'condition with extra accessor data fails closed'
);
ok(getterRuns === 0, 'condition evaluator never invokes an accessor');

// Node can detect a Proxy before entering it. Browser assertions below only
// require fail-closed behavior and do not overstate trap-free detection.
let proxyTraps = 0;
const proxy = new Proxy(freshModel(), {
  ownKeys: function () {
    proxyTraps++;
    throw new Error('proxy trap');
  }
});
const proxyStats = CombatStats.derive(proxy, 'loadout-1');
ok(
  proxyTraps === 0 && proxyStats.maxHp === 1 && deeplyFrozen(proxyStats),
  'CommonJS proxy input fails closed without entering proxy traps'
);

const source = fs.readFileSync('./core/combat-stats.js', 'utf8');
const browserContext = {
  CombatContent: CombatContent,
  TechniqueContent: TechniqueContent,
  RealmContent: RealmContent,
  Formations: require('../core/formations.js'),
  SpiritBeasts: require('../core/spirit-beasts.js')
};
browserContext.globalThis = browserContext;
vm.createContext(browserContext);
vm.runInContext(source, browserContext, { filename: 'core/combat-stats.js' });
ok(
  deeplyFrozen(browserContext.CombatStats),
  'browser UMD installs one frozen CombatStats global'
);
same(
  Object.keys(browserContext.CombatStats),
  Object.keys(CombatStats),
  'browser and CommonJS paths expose the same API order'
);
same(
  browserContext.CombatStats.derive(freshModel('qi-9'), 'loadout-1'),
  baseExpected(8),
  'browser UMD derives the same realm snapshot'
);

// Active effect seams are optional. Their combat data applies after passives,
// while the current Stage 2 life-skill-only effects remain harmless.
const seamModel = freshModel();
const seamBefore = JSON.stringify(seamModel);
const seamContext = {
  CombatContent: CombatContent,
  TechniqueContent: TechniqueContent,
  RealmContent: RealmContent,
  Formations: {
    effects: function (received) {
      received.player.breakthrough.realmId = 'ascension';
      return {
        combat: {
          maxHpPercent: 0.1,
          attack: 3,
          critChance: 0.02,
          attackIntervalReduction: 0.1
        }
      };
    }
  },
  SpiritBeasts: {
    effects: function () {
      return {
        combat: {
          global: {
            maxQiPercent: 0.2,
            defense: 2,
            evasion: 4,
            critChance: 0.01,
            attackIntervalReduction: 0.1
          }
        }
      };
    }
  }
};
seamContext.globalThis = seamContext;
vm.createContext(seamContext);
vm.runInContext(source, seamContext, { filename: 'core/combat-stats.js' });
same(
  seamContext.CombatStats.derive(seamModel, 'loadout-1'),
  {
    maxHp: 110,
    maxQi: 120,
    attack: 15,
    defense: 7,
    accuracy: 75,
    evasion: 9,
    critChance: 0.08,
    attackIntervalTicks: 6
  },
  'formation then beast combat effects apply at the final modifier stage'
);
ok(
  JSON.stringify(seamModel) === seamBefore,
  'effect dependencies receive a copy and cannot mutate derive input'
);

let dependencyGetterRuns = 0;
const hostileFormations = {};
Object.defineProperty(hostileFormations, 'effects', {
  enumerable: true,
  get: function () {
    dependencyGetterRuns++;
    throw new Error('dependency getter invoked');
  }
});
const hostileDependencyContext = {
  CombatContent: CombatContent,
  TechniqueContent: TechniqueContent,
  RealmContent: RealmContent,
  Formations: hostileFormations,
  SpiritBeasts: {}
};
hostileDependencyContext.globalThis = hostileDependencyContext;
vm.createContext(hostileDependencyContext);
vm.runInContext(source, hostileDependencyContext, {
  filename: 'core/combat-stats.js'
});
same(
  hostileDependencyContext.CombatStats.derive(
    freshModel(),
    'loadout-1'
  ),
  baseExpected(0),
  'unsafe optional effect dependencies are ignored'
);
ok(
  dependencyGetterRuns === 0,
  'browser dependency accessors are never invoked'
);

const clampContext = {
  CombatContent: CombatContent,
  TechniqueContent: TechniqueContent,
  RealmContent: RealmContent,
  Formations: {
    effects: function () {
      return {
        combat: {
          maxHp: -10000,
          maxQi: -10000,
          attack: -10000,
          defense: -10000,
          critChance: 4,
          attackIntervalReduction: 4
        }
      };
    }
  },
  SpiritBeasts: {
    effects: function () {
      return { combat: { global: { critChance: -10 } } };
    }
  }
};
clampContext.globalThis = clampContext;
vm.createContext(clampContext);
vm.runInContext(source, clampContext, { filename: 'core/combat-stats.js' });
const clamped = clampContext.CombatStats.derive(
  freshModel(),
  'loadout-1'
);
ok(
  clamped.maxHp === 1 && clamped.maxQi === 1 &&
    clamped.attack === 1 && clamped.defense === 1 &&
    clamped.critChance === 0 &&
    clamped.attackIntervalTicks === 2,
  'final clamp enforces minimum stats, chance range, and two-tick interval'
);

ok(
  !/Math\.random|localStorage|Platform\.|SaveSystem|document\.|canvas|toast\(/.test(
    source
  ),
  'combat stats source stays pure'
);

if (failed) {
  console.error(
    '\n=== Stage 3 战斗属性自测：' + passed +
      ' 通过 / ' + failed + ' 失败 ==='
  );
  process.exitCode = 1;
} else {
  console.log(
    '\n=== Stage 3 战斗属性自测：' + passed + ' 通过 / 0 失败 ==='
  );
}
