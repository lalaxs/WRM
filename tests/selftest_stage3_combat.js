'use strict';

const crypto = require('crypto');
const fs = require('fs');
const vm = require('vm');
const CombatContent = require('../content/combat.js');
const TechniqueContent = require('../content/techniques.js');
const Stage2State = require('../core/stage2-state.js');
const Stage3State = require('../core/stage3-state.js');
const CombatStats = require('../core/combat-stats.js');
const Techniques = require('../core/techniques.js');
const Inventory = require('../core/inventory.js');
const GameRandom = require('../core/random.js');
const SpiritBeasts = require('../core/spirit-beasts.js');
const CombatEngine = require('../core/combat-engine.js');

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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function sequenceRandom(values) {
  const rolls = values.slice();
  let draws = 0;
  return {
    next: function (seed) {
      const value = draws < rolls.length ? rolls[draws] : 0.99;
      draws++;
      return { seed: (seed + 1) >>> 0, value: value };
    },
    draws: function () { return draws; }
  };
}

function loadBrowserEngine(random, inventory) {
  const source = fs.readFileSync('./core/combat-engine.js', 'utf8');
  const context = {
    CombatContent: CombatContent,
    TechniqueContent: TechniqueContent,
    RealmContent: require('../content/realms.js'),
    CombatStats: CombatStats,
    Techniques: Techniques,
    Inventory: inventory || Inventory,
    GameRandom: random || GameRandom,
    SpiritBeasts: SpiritBeasts,
    structuredClone: globalThis.structuredClone
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'core/combat-engine.js' });
  return context.CombatEngine;
}

const cloningInventory = Object.freeze({
  apply: function (inventory, delta) {
    return Inventory.apply(clone(inventory), clone(delta));
  }
});

function freshModel() {
  return Stage3State.normalize(Stage2State.createDefaults());
}

function learnAndEquip(model, techniqueId, slotIndex) {
  model.player.techniques.known[techniqueId] = { level: 1, xp: 0 };
  model.player.combat.loadouts[0].activeTechniques[slotIndex || 0] = {
    techniqueId: techniqueId,
    condition: { type: 'always' }
  };
  return model;
}

function fundRuneCost(model, techniqueId, casts) {
  const definition = TechniqueContent.get(techniqueId);
  const runeCost = definition && definition.runeCost
    ? definition.runeCost
    : {};
  Object.keys(runeCost).forEach(function (itemId) {
    model.player.inventory.stacks[itemId] =
      (model.player.inventory.stacks[itemId] || 0) +
      runeCost[itemId] * (casts || 1);
  });
  return model;
}

function addActiveBeast(model) {
  model.systems.homestead.beasts.roster = [{
    id: 'beast-1',
    speciesId: 'spiritFox',
    level: 1,
    xp: 0,
    traitId: 'keenNose',
    growthId: 'steady'
  }];
  model.systems.homestead.beasts.activeIds = ['beast-1'];
  return model;
}

function regionSession(engine, model, enemyId) {
  return engine.createSession(model, {
    mode: 'region',
    regionId: 'qingyunOutskirts',
    enemyId: enemyId || 'thornHare',
    loadoutId: 'loadout-1'
  });
}

function quietSession(engine, model) {
  const session = clone(regionSession(engine, model || freshModel()));
  session.enemy.cooldownTicks = 999999;
  return session;
}

function context(model, rngState) {
  return {
    playerInventory: clone(model.player.inventory),
    rngState: rngState == null ? 7 : rngState
  };
}

function damageFor(attacker, defender, multiplier, defenseIgnore) {
  return Math.max(1, Math.floor(
    attacker.attack * multiplier -
      defender.defense * (1 - (defenseIgnore || 0)) * 0.5
  ));
}

same(
  Object.keys(CombatEngine),
  ['createSession', 'createEnemy', 'advanceTick', 'advanceTicks'],
  'CombatEngine exposes exactly the Task 6 public API'
);
ok(Object.isFrozen(CombatEngine), 'CombatEngine public API is frozen');

const snapshotModel = freshModel();
snapshotModel.player.inventory.stacks.cloudwoodSword = 1;
snapshotModel.player.combat.loadouts[0].equipment.weapon = 'cloudwoodSword';
snapshotModel.player.techniques.known.cloudPiercingSword = {
  level: 3,
  xp: 17
};
snapshotModel.player.techniques.known.pillGuard = { level: 2, xp: 0 };
snapshotModel.player.combat.loadouts[0].activeTechniques[0] = {
  techniqueId: 'cloudPiercingSword',
  condition: { type: 'always' }
};
snapshotModel.player.combat.loadouts[0].passiveTechniques[0] = 'pillGuard';
snapshotModel.player.combat.loadouts[0].supplies.food = {
  itemId: 'grilledCarp',
  triggerRatio: 0.5,
  stopWhenEmpty: false
};
const expectedStats = CombatStats.derive(snapshotModel, 'loadout-1');
const snapshotSession = regionSession(
  CombatEngine,
  snapshotModel,
  'thornHare'
);
ok(!!snapshotSession, 'createSession accepts a valid region battle');
ok(snapshotSession.lastPlayerAction === null,
  'a new combat session has no executed player action telemetry');
same(
  snapshotSession.loadoutSnapshot.activeTechniques,
  snapshotModel.player.combat.loadouts[0].activeTechniques,
  'createSession copies the selected active plan'
);
same(
  snapshotSession.loadoutSnapshot.passiveTechniques,
  snapshotModel.player.combat.loadouts[0].passiveTechniques,
  'createSession copies passive technique slots'
);
same(
  snapshotSession.loadoutSnapshot.supplies,
  snapshotModel.player.combat.loadouts[0].supplies,
  'createSession copies automatic supply settings'
);
same(
  snapshotSession.loadoutSnapshot.techniqueLevels,
  { cloudPiercingSword: 3, pillGuard: 2 },
  'createSession snapshots learned technique levels without XP records'
);
same(
  snapshotSession.loadoutSnapshot.derivedStats,
  expectedStats,
  'createSession stores the derived combat projection in the loadout snapshot'
);
same(
  {
    maxHp: snapshotSession.player.maxHp,
    maxQi: snapshotSession.player.maxQi,
    attack: snapshotSession.player.attack,
    defense: snapshotSession.player.defense,
    accuracy: snapshotSession.player.accuracy,
    evasion: snapshotSession.player.evasion,
    critChance: snapshotSession.player.critChance,
    attackIntervalTicks: snapshotSession.player.attackIntervalTicks
  },
  expectedStats,
  'the live player starts from the copied derived stats'
);
const frozenSnapshotBytes = JSON.stringify(snapshotSession);
snapshotModel.player.combat.loadouts[0].equipment.weapon = null;
snapshotModel.player.combat.loadouts[0].activeTechniques[0].techniqueId = null;
snapshotModel.player.techniques.known.cloudPiercingSword.level = 20;
ok(
  JSON.stringify(snapshotSession) === frozenSnapshotBytes &&
    deeplyFrozen(snapshotSession),
  'later save edits cannot alter the deeply frozen active session'
);

const strictOptionModel = freshModel();
const regionOptions = {
  mode: 'region',
  regionId: 'qingyunOutskirts',
  enemyId: 'thornHare',
  loadoutId: 'loadout-1'
};
const dungeonOptions = {
  mode: 'dungeon',
  dungeonId: 'breathCave',
  loadoutId: 'loadout-1'
};
ok(
  CombatEngine.createSession(strictOptionModel, regionOptions)
    .waveIndex === 0 &&
    CombatEngine.createSession(strictOptionModel, regionOptions)
      .waveDefeated === 0 &&
    CombatEngine.createSession(strictOptionModel, regionOptions)
      .bossPhase === 0,
  'createSession defaults truly missing region counters to zero'
);
ok(
  CombatEngine.createSession(strictOptionModel, dungeonOptions)
    .waveIndex === 0 &&
    CombatEngine.createSession(strictOptionModel, dungeonOptions)
      .waveDefeated === 0 &&
    CombatEngine.createSession(strictOptionModel, dungeonOptions)
      .bossPhase === 0,
  'createSession defaults truly missing dungeon counters to zero'
);
['waveIndex', 'waveDefeated', 'bossPhase'].forEach(function (field) {
  [
    ['nonzero', 1],
    ['fractional', 0.5],
    ['negative', -1],
    ['unsafe', Number.MAX_SAFE_INTEGER + 1],
    ['non-numeric', '0'],
    ['null', null],
    ['boolean', true]
  ].forEach(function (entry) {
    const label = entry[0];
    const value = entry[1];
    const model = freshModel();
    const options = clone(regionOptions);
    options[field] = value;
    const modelBefore = JSON.stringify(model);
    const optionsBefore = JSON.stringify(options);
    ok(
      CombatEngine.createSession(model, options) === null &&
        JSON.stringify(model) === modelBefore &&
        JSON.stringify(options) === optionsBefore,
      'createSession rejects an explicit ' + label + ' region ' +
        field + ' without mutating input'
    );
  });
});
['waveIndex', 'waveDefeated', 'bossPhase'].forEach(function (field) {
  [
    ['fractional', 0.5],
    ['negative', -1],
    ['unsafe', Number.MAX_SAFE_INTEGER + 1],
    ['non-numeric', '0']
  ].forEach(function (entry) {
    const label = entry[0];
    const value = entry[1];
    const model = freshModel();
    const options = clone(dungeonOptions);
    options[field] = value;
    const modelBefore = JSON.stringify(model);
    const optionsBefore = JSON.stringify(options);
    ok(
      CombatEngine.createSession(model, options) === null &&
        JSON.stringify(model) === modelBefore &&
        JSON.stringify(options) === optionsBefore,
      'createSession rejects an explicit ' + label + ' dungeon ' +
        field + ' without mutating input'
    );
  });
});
const explicitZeroDungeonOptions = clone(dungeonOptions);
explicitZeroDungeonOptions.waveIndex = 0;
explicitZeroDungeonOptions.waveDefeated = 0;
explicitZeroDungeonOptions.bossPhase = 0;
ok(
  CombatEngine.createSession(
    strictOptionModel,
    Object.assign({}, regionOptions, { bossPhase: 0 })
  ).bossPhase === 0 &&
    CombatEngine.createSession(
      strictOptionModel,
      explicitZeroDungeonOptions
    ).waveIndex === 0,
  'createSession accepts explicit zero values for canonical counters'
);

const noBeastRandom = sequenceRandom([0, 0.99]);
const noBeastEngine = loadBrowserEngine(noBeastRandom);
const noBeastModel = learnAndEquip(freshModel(), 'beastEcho', 0);
const noBeastSession = quietSession(noBeastEngine, noBeastModel);
const noBeastEcho = noBeastEngine.advanceTick(
  noBeastSession,
  context(noBeastModel, 4)
);
ok(
  noBeastSession.loadoutSnapshot.hasActiveBeast === false &&
    noBeastEcho.metrics.damageDealt === 10 &&
    noBeastEcho.events.some(function (event) {
      return event.type === 'warning' &&
        event.code === 'missing_active_beast' &&
        event.techniqueId === 'beastEcho';
    }),
  'beastEcho falls back to a normal attack without a valid active beast'
);

const activeBeastRandom = sequenceRandom([0, 0.99]);
const activeBeastEngine = loadBrowserEngine(activeBeastRandom);
const activeBeastModel = addActiveBeast(
  learnAndEquip(freshModel(), 'beastEcho', 0)
);
const activeBeastSession = quietSession(
  activeBeastEngine,
  activeBeastModel
);
activeBeastModel.systems.homestead.beasts.activeIds = [];
activeBeastModel.systems.homestead.beasts.roster[0].level = 99;
const activeBeastEcho = activeBeastEngine.advanceTick(
  activeBeastSession,
  context(activeBeastModel, 5)
);
ok(
  activeBeastSession.loadoutSnapshot.hasActiveBeast === true &&
    activeBeastEcho.metrics.damageDealt === 20,
  'beastEcho snapshots a valid active beast and uses 1.80x'
);
ok(
  activeBeastEcho.session.loadoutSnapshot.hasActiveBeast === true,
  'later active-beast source edits cannot alter the combat snapshot'
);

const enemy = CombatEngine.createEnemy('thornHare', 0);
same(
  enemy,
  {
    id: 'thornHare',
    hp: 45,
    maxHp: 45,
    attack: 8,
    defense: 3,
    accuracy: 71,
    evasion: 6,
    attackIntervalTicks: 8,
    cooldownTicks: 0,
    phase: 0,
    buffs: {},
    statuses: {}
  },
  'createEnemy copies the exact tier-one enemy combat state'
);
ok(
  CombatEngine.createEnemy('missing-enemy', 0) === null &&
    CombatEngine.createEnemy('thornHare', -1) === null,
  'createEnemy fails closed for unknown enemies and invalid phases'
);
const phaseTwo = CombatEngine.createEnemy('ninefoldTribulation', 1);
ok(
  phaseTwo.phase === 1 &&
    phaseTwo.maxHp === Math.round(
      CombatContent.ENEMIES.ninefoldTribulation.stats.hp * 1.5
    ) &&
    phaseTwo.attack === Math.round(
      CombatContent.ENEMIES.ninefoldTribulation.stats.attack * 1.25
    ) &&
    phaseTwo.defense === Math.round(
      CombatContent.ENEMIES.ninefoldTribulation.stats.defense * 1.15
    ),
  'createEnemy applies the requested explicit boss phase multipliers'
);

const parityModel = freshModel();
let stepped = {
  ok: true,
  session: regionSession(CombatEngine, parityModel),
  playerInventory: clone(parityModel.player.inventory),
  rngState: 123
};
for (let tick = 0; tick < 40; tick++) {
  stepped = CombatEngine.advanceTick(stepped.session, {
    playerInventory: stepped.playerInventory,
    rngState: stepped.rngState
  });
}
const bulk = CombatEngine.advanceTicks(
  regionSession(CombatEngine, parityModel),
  context(parityModel, 123),
  40
);
same(bulk, stepped, 'forty advanceTick calls equal advanceTicks(..., 40)');
ok(deeplyFrozen(bulk), 'advanceTicks returns a deeply frozen DTO');

const missRandom = sequenceRandom([0.99]);
const missEngine = loadBrowserEngine(missRandom);
const missModel = freshModel();
const missSession = quietSession(missEngine, missModel);
const missBeforeHp = missSession.enemy.hp;
const missed = missEngine.advanceTick(missSession, context(missModel, 1));
ok(
  missRandom.draws() === 1 &&
    missed.rngState === 2 &&
    missed.session.enemy.hp === missBeforeHp &&
    missed.metrics.damageDealt === 0,
  'a miss consumes only one accuracy roll and deals zero damage'
);

const hitRandom = sequenceRandom([0, 0.99]);
const hitEngine = loadBrowserEngine(hitRandom);
const hitModel = freshModel();
const hitSession = quietSession(hitEngine, hitModel);
const normalDamage = damageFor(hitSession.player, hitSession.enemy, 1, 0);
const hit = hitEngine.advanceTick(hitSession, context(hitModel, 10));
ok(
  hitRandom.draws() === 2 &&
    hit.rngState === 12 &&
    hit.metrics.damageDealt === normalDamage &&
    hit.session.enemy.hp === hitSession.enemy.hp - normalDamage,
  'a hit and non-critical roll use the exact damage formula'
);
same(hit.session.lastPlayerAction, {
  id: 'normalAttack',
  slotIndex: null,
  tick: 0
}, 'an executed normal attack records authoritative action telemetry');

const critRandom = sequenceRandom([0, 0]);
const critEngine = loadBrowserEngine(critRandom);
const critModel = freshModel();
const critSession = quietSession(critEngine, critModel);
const crit = critEngine.advanceTick(
  critSession,
  context(critModel, 20)
);
ok(
  critRandom.draws() === 2 &&
    crit.metrics.damageDealt === Math.floor(normalDamage * 1.5) &&
    crit.events.some(function (event) {
      return event.type === 'damage' && event.critical === true;
    }),
  'a hit and critical roll applies the exact 1.50 multiplier'
);

const initiativeRandom = sequenceRandom([0, 0.99]);
const initiativeEngine = loadBrowserEngine(initiativeRandom);
const initiativeModel = freshModel();
const initiativeSession = clone(regionSession(
  initiativeEngine,
  initiativeModel
));
initiativeSession.enemy.hp = 1;
const initiativeHp = initiativeSession.player.hp;
const initiative = initiativeEngine.advanceTick(
  initiativeSession,
  context(initiativeModel, 30)
);
ok(
  initiative.outcome === 'enemy_defeated' &&
    initiative.session.player.hp === initiativeHp &&
    initiative.metrics.damageTaken === 0 &&
    initiativeRandom.draws() === 2,
  'player acts first and a killing hit prevents the enemy action'
);

const timersModel = freshModel();
const timersSession = clone(regionSession(CombatEngine, timersModel));
timersSession.player.cooldownTicks = 3;
timersSession.enemy.cooldownTicks = 4;
timersSession.player.techniqueCooldowns.cloudPiercingSword = 2;
timersSession.player.statuses.slow = {
  remainingTicks: 2,
  attackIntervalAdd: 2
};
timersSession.enemy.statuses.shock = {
  remainingTicks: 2,
  skipNextAction: false
};
const timers = CombatEngine.advanceTick(
  timersSession,
  context(timersModel, 40)
);
ok(
  timers.session.player.cooldownTicks === 2 &&
    timers.session.enemy.cooldownTicks === 3 &&
    timers.session.player.techniqueCooldowns.cloudPiercingSword === 1 &&
    timers.session.player.statuses.slow.remainingTicks === 1 &&
    timers.session.enemy.statuses.shock.remainingTicks === 1,
  'every action cooldown, technique cooldown, and status decrements once'
);

[
  ['fractional player cooldown', function (session) {
    session.player.cooldownTicks = 0.5;
  }],
  ['fractional enemy cooldown', function (session) {
    session.enemy.cooldownTicks = 0.5;
  }],
  ['fractional enemy phase', function (session) {
    session.enemy.phase = 0.5;
  }],
  ['player interval below minimum', function (session) {
    session.player.attackIntervalTicks = 1;
  }],
  ['fractional enemy interval', function (session) {
    session.enemy.attackIntervalTicks = 8.5;
  }],
  ['fractional technique cooldown', function (session) {
    session.player.techniqueCooldowns.cloudPiercingSword = 0.5;
  }],
  ['fractional status duration', function (session) {
    session.player.statuses.shock = {
      remainingTicks: 1.5,
      skipNextAction: true
    };
  }],
  ['shock status extra field', function (session) {
    session.player.statuses.shock = {
      remainingTicks: 8,
      skipNextAction: true,
      attackIntervalAdd: 2
    };
  }],
  ['slow status wrong fixed value', function (session) {
    session.player.statuses.slow = {
      remainingTicks: 12,
      attackIntervalAdd: 3
    };
  }],
  ['haste status wrong fixed value', function (session) {
    session.player.statuses.haste = {
      remainingTicks: 40,
      attackIntervalReduction: 0.2
    };
  }],
  ['unknown status', function (session) {
    session.enemy.statuses.poison = { remainingTicks: 3 };
  }]
].forEach(function (fixture) {
  const strictModel = freshModel();
  const strictSession = quietSession(CombatEngine, strictModel);
  fixture[1](strictSession);
  const before = JSON.stringify(strictSession);
  const rejected = CombatEngine.advanceTick(
    strictSession,
    context(strictModel, 45)
  );
  ok(
    rejected.ok === false && JSON.stringify(strictSession) === before,
    'invalid tick state fails closed without mutation: ' + fixture[0]
  );
});

const twoHitRandom = sequenceRandom([0, 0.99, 0, 0.99]);
const twoHitEngine = loadBrowserEngine(twoHitRandom);
const twoHitModel = learnAndEquip(
  freshModel(),
  'returningWindSlash',
  0
);
const twoHitSession = quietSession(twoHitEngine, twoHitModel);
const twoHitDamage = damageFor(
  twoHitSession.player,
  twoHitSession.enemy,
  0.7,
  0
);
const twoHit = twoHitEngine.advanceTick(
  twoHitSession,
  context(twoHitModel, 50)
);
ok(
  twoHitRandom.draws() === 4 &&
    twoHit.metrics.damageDealt === twoHitDamage * 2 &&
    twoHit.events.filter(function (event) {
      return event.type === 'damage';
    }).length === 2 &&
    twoHit.gains.techniqueXp.returningWindSlash === 1 &&
    twoHit.session.player.qi === twoHitSession.player.qi - 8 &&
    twoHit.session.player.techniqueCooldowns.returningWindSlash === 15,
  'two-hit technique consumes two stable accuracy/critical pairs and one cast'
);
same(twoHit.session.lastPlayerAction, {
  id: 'returningWindSlash',
  slotIndex: 0,
  tick: 0
}, 'a fired technique records its selected slot and execution tick');
const twoHitCooldown = twoHitEngine.advanceTick(
  twoHit.session,
  {
    playerInventory: twoHit.playerInventory,
    rngState: twoHit.rngState
  }
);
same(twoHitCooldown.session.lastPlayerAction, {
  id: 'returningWindSlash',
  slotIndex: 0,
  tick: 0
}, 'technique telemetry persists unchanged while the player is cooling down');

const healRandom = sequenceRandom([]);
const healEngine = loadBrowserEngine(healRandom, cloningInventory);
const healModel = fundRuneCost(
  learnAndEquip(freshModel(), 'clearHeartArt', 0),
  'clearHeartArt',
  1
);
const healSession = quietSession(healEngine, healModel);
healSession.player.hp = 50;
const healed = healEngine.advanceTick(
  healSession,
  context(healModel, 60)
);
ok(
  healRandom.draws() === 0 &&
    healed.session.player.hp === 68.8 &&
    healed.session.player.qi === healSession.player.qi - 10 &&
    healed.gains.techniqueXp.clearHeartArt === 1,
  'mixed healing consumes no accuracy or critical roll and emits cast XP'
);

const invalidModel = learnAndEquip(
  freshModel(),
  'cloudPiercingSword',
  0
);
const invalidSession = quietSession(CombatEngine, invalidModel);
invalidSession.loadoutSnapshot.activeTechniques[0].techniqueId =
  'removedTechnique';
invalidSession.loadoutSnapshot.techniqueLevels.removedTechnique = 1;
const invalidTechnique = CombatEngine.advanceTick(
  invalidSession,
  context(invalidModel, 70)
);
ok(
  invalidTechnique.events.some(function (event) {
    return event.type === 'warning' &&
      event.code === 'invalid_technique';
  }) &&
    !Object.keys(invalidTechnique.gains.techniqueXp).length &&
    invalidTechnique.session.player.qi === invalidSession.player.qi,
  'unknown session technique falls back to normalAttack with one warning'
);
same(invalidTechnique.session.lastPlayerAction, {
  id: 'normalAttack',
  slotIndex: null,
  tick: 0
}, 'an actually executed fallback records normalAttack, not the invalid selection');

let inventoryApplyCalls = 0;
const countedInventory = Object.freeze({
  apply: function (inventory, delta) {
    inventoryApplyCalls++;
    return Inventory.apply(clone(inventory), clone(delta));
  }
});
const foodEngine = loadBrowserEngine(
  sequenceRandom([]),
  countedInventory
);
const foodModel = freshModel();
foodModel.player.inventory.stacks.grilledCarp = 1;
foodModel.player.techniques.known.pillGuard = { level: 1, xp: 0 };
foodModel.player.combat.loadouts[0].passiveTechniques[0] = 'pillGuard';
foodModel.player.combat.loadouts[0].supplies.food = {
  itemId: 'grilledCarp',
  triggerRatio: 0.5,
  stopWhenEmpty: false
};
const foodSession = quietSession(foodEngine, foodModel);
foodSession.player.hp = foodSession.player.maxHp * 0.5;
foodSession.player.cooldownTicks = 2;
const food = foodEngine.advanceTick(
  foodSession,
  context(foodModel, 80)
);
same(
  {
    applyCalls: inventoryApplyCalls,
    hp: food.session.player.hp,
    capped: food.session.player.hp <= food.session.player.maxHp,
    remaining: food.playerInventory.stacks.grilledCarp,
    cost: food.costs.items.grilledCarp,
    metric: food.metrics.suppliesUsed.grilledCarp
  },
  {
    applyCalls: 1,
    hp: foodSession.player.hp + 23,
    capped: true,
    remaining: undefined,
    cost: 1,
    metric: 1
  },
  'food triggers at the threshold, uses pillGuard, clamps, and applies once'
);

const clampFoodModel = clone(foodModel);
clampFoodModel.player.inventory.stacks.grilledCarp = 1;
const clampFoodSession = quietSession(CombatEngine, clampFoodModel);
clampFoodSession.player.hp = clampFoodSession.player.maxHp - 1;
clampFoodModel.player.combat.loadouts[0].supplies.food.triggerRatio = 0.99;
clampFoodSession.loadoutSnapshot.supplies.food.triggerRatio = 0.99;
const clampFood = CombatEngine.advanceTick(
  clampFoodSession,
  context(clampFoodModel, 81)
);
ok(
  clampFood.session.player.hp === clampFoodSession.player.maxHp,
  'automatic healing is clamped to maximum HP'
);

const qiModel = freshModel();
qiModel.player.inventory.stacks.qiGatheringPill = 1;
qiModel.player.combat.loadouts[0].supplies.pill = {
  itemId: 'qiGatheringPill',
  triggerRatio: 0.3,
  stopWhenEmpty: false
};
const qiSession = quietSession(CombatEngine, qiModel);
qiSession.player.qi = qiSession.player.maxQi * 0.3;
qiSession.player.cooldownTicks = 2;
const qi = CombatEngine.advanceTick(
  qiSession,
  context(qiModel, 90)
);
ok(
  qi.session.player.qi === 70 &&
    qi.costs.items.qiGatheringPill === 1 &&
    qi.playerInventory.stacks.qiGatheringPill === undefined,
  'qi pill triggers at or below its threshold before the player action'
);

const talismanModel = freshModel();
talismanModel.player.inventory.stacks.wardTalisman = 2;
talismanModel.player.combat.loadouts[0].supplies.talisman = {
  itemId: 'wardTalisman',
  useAt: 'enemy_start',
  stopWhenEmpty: false
};
let talismanSession = quietSession(CombatEngine, talismanModel);
talismanSession.player.cooldownTicks = 2;
const talismanFirst = CombatEngine.advanceTick(
  talismanSession,
  context(talismanModel, 100)
);
const talismanSecond = CombatEngine.advanceTick(
  talismanFirst.session,
  {
    playerInventory: talismanFirst.playerInventory,
    rngState: talismanFirst.rngState
  }
);
ok(
  talismanFirst.costs.items.wardTalisman === 1 &&
    talismanFirst.session.player.shield === 20 &&
    talismanFirst.session.enemy.buffs.enemyStartHandled === true &&
    !Object.keys(talismanSecond.costs.items).length &&
    talismanSecond.playerInventory.stacks.wardTalisman === 1,
  'enemy_start talisman is consumed exactly once for one spawned enemy'
);

const hasteModel = freshModel();
hasteModel.player.inventory.stacks.hasteTalisman = 1;
hasteModel.player.combat.loadouts[0].supplies.talisman = {
  itemId: 'hasteTalisman',
  useAt: 'enemy_start',
  stopWhenEmpty: false
};
const hasteSession = quietSession(CombatEngine, hasteModel);
hasteSession.player.cooldownTicks = 2;
const haste = CombatEngine.advanceTick(
  hasteSession,
  context(hasteModel, 101)
);
ok(
  haste.session.player.statuses.haste.remainingTicks === 39 &&
    haste.session.player.statuses.haste.attackIntervalReduction === 0.1,
  'haste talisman applies the only supported 40-tick haste status'
);

const emptyModel = freshModel();
emptyModel.player.combat.loadouts[0].supplies.food = {
  itemId: 'grilledCarp',
  triggerRatio: 0.5,
  stopWhenEmpty: true
};
const emptySession = clone(regionSession(CombatEngine, emptyModel));
emptySession.player.hp = 50;
emptySession.player.cooldownTicks = 3;
emptySession.player.statuses.haste = {
  remainingTicks: 2,
  attackIntervalReduction: 0.1
};
const emptyHp = emptySession.player.hp;
const exhausted = CombatEngine.advanceTick(
  emptySession,
  context(emptyModel, 110)
);
ok(
  exhausted.outcome === 'supply_exhausted' &&
    exhausted.session.player.hp === emptyHp &&
    exhausted.metrics.damageTaken === 0 &&
    exhausted.session.enemy.cooldownTicks === 0 &&
    exhausted.session.player.cooldownTicks === 2 &&
    exhausted.session.player.statuses.haste.remainingTicks === 1,
  'empty stopWhenEmpty supply retreats before enemy action and ticks once'
);

const continueModel = clone(emptyModel);
continueModel.player.combat.loadouts[0].supplies.food.stopWhenEmpty = false;
const continueSession = clone(regionSession(CombatEngine, continueModel));
continueSession.player.hp = 50;
continueSession.player.cooldownTicks = 3;
const continueRandom = sequenceRandom([0, 0.99]);
const continueEngine = loadBrowserEngine(continueRandom);
const continued = continueEngine.advanceTick(
  continueSession,
  context(continueModel, 120)
);
ok(
  continued.outcome === 'continue' &&
    continued.metrics.damageTaken > 0 &&
    !Object.keys(continued.costs.items).length,
  'empty non-stopping supply continues and permits the enemy action'
);

const breakthroughSupplyModel = freshModel();
breakthroughSupplyModel.player.inventory.stacks.foundationPill = 1;
breakthroughSupplyModel.player.combat.loadouts[0].supplies.pill = {
  itemId: 'foundationPill',
  triggerRatio: 0.3,
  stopWhenEmpty: false
};
ok(
  CombatEngine.createSession(breakthroughSupplyModel, {
    mode: 'region',
    regionId: 'qingyunOutskirts',
    enemyId: 'thornHare',
    loadoutId: 'loadout-1'
  }) === null,
  'breakthrough pills are rejected as combat supplies'
);

const shockRandom = sequenceRandom([0, 0.99, 0]);
const shockEngine = loadBrowserEngine(shockRandom, cloningInventory);
const shockModel = fundRuneCost(
  learnAndEquip(freshModel(), 'thunderSeal', 0),
  'thunderSeal',
  1
);
const shockSession = clone(regionSession(shockEngine, shockModel));
const shocked = shockEngine.advanceTick(
  shockSession,
  context(shockModel, 130)
);
ok(
  shocked.session.enemy.statuses.shock.remainingTicks === 7 &&
    shocked.session.enemy.statuses.shock.skipNextAction === false &&
    shocked.metrics.damageTaken === 0 &&
    shockRandom.draws() === 3,
  'shock uses its post-crit status roll and skips the next due enemy action'
);

const slowRandom = sequenceRandom([0, 0.99]);
const slowEngine = loadBrowserEngine(slowRandom, cloningInventory);
const slowModel = fundRuneCost(
  learnAndEquip(freshModel(), 'bindingTalisman', 0),
  'bindingTalisman',
  1
);
const slowSession = quietSession(slowEngine, slowModel);
const slowed = slowEngine.advanceTick(
  slowSession,
  context(slowModel, 140)
);
ok(
  slowed.session.enemy.statuses.slow.remainingTicks === 11 &&
    slowed.session.enemy.statuses.slow.attackIntervalAdd === 2 &&
    !Object.prototype.hasOwnProperty.call(
      slowed.session.enemy.statuses,
      'binding'
    ),
  'binding content maps to the supported finite slow status'
);

const reapplyRandom = sequenceRandom([0, 0.99, 0]);
const reapplyEngine = loadBrowserEngine(reapplyRandom, cloningInventory);
const reapplyModel = fundRuneCost(
  learnAndEquip(freshModel(), 'thunderSeal', 0),
  'thunderSeal',
  1
);
const reapplySession = quietSession(reapplyEngine, reapplyModel);
reapplySession.enemy.statuses.shock = {
  remainingTicks: 10,
  skipNextAction: false
};
const reapplied = reapplyEngine.advanceTick(
  reapplySession,
  context(reapplyModel, 150)
);
ok(
  reapplied.session.enemy.statuses.shock.remainingTicks === 9,
  'status reapplication keeps the larger remaining duration without stacking'
);

const simultaneousModel = freshModel();
const simultaneousSession = clone(regionSession(
  CombatEngine,
  simultaneousModel
));
simultaneousSession.player.hp = 0;
simultaneousSession.enemy.hp = 0;
const simultaneous = CombatEngine.advanceTick(
  simultaneousSession,
  context(simultaneousModel, 160)
);
ok(
  simultaneous.outcome === 'enemy_defeated' &&
    simultaneous.events.length === 0,
  'simultaneous zero HP resolves enemy defeat first without extra actions'
);

const deterministicModel = freshModel();
const deterministicSession = clone(regionSession(
  CombatEngine,
  deterministicModel
));
deterministicSession.player.hp = 1000000000000;
deterministicSession.player.maxHp = 1000000000000;
deterministicSession.enemy.hp = 1000000000000;
deterministicSession.enemy.maxHp = 1000000000000;
const longRandomA = sequenceRandom([]);
const longEngineA = loadBrowserEngine(longRandomA);
const longRandomB = sequenceRandom([]);
const longEngineB = loadBrowserEngine(longRandomB);
const longA = longEngineA.advanceTicks(
  deterministicSession,
  context(deterministicModel, 0x12345678),
  10000
);
const longB = longEngineB.advanceTicks(
  deterministicSession,
  context(deterministicModel, 0x12345678),
  10000
);
const digestA = crypto.createHash('sha256')
  .update(JSON.stringify(longA))
  .digest('hex');
const digestB = crypto.createHash('sha256')
  .update(JSON.stringify(longB))
  .digest('hex');
ok(
  digestA === digestB &&
    longRandomA.draws() === 2500 &&
    longRandomB.draws() === 2500 &&
    longA.rngState === longB.rngState &&
    longA.rngState === ((0x12345678 + 2500) >>> 0) &&
    longA.outcome === 'continue' &&
    longA.session.elapsedTicks === 10000 &&
    longB.outcome === 'continue' &&
    longB.session.elapsedTicks === 10000,
  'sustainable ten-thousand-tick fixture covers long-lived combat RNG'
);

const reloadModel = addActiveBeast(
  learnAndEquip(freshModel(), 'beastEcho', 0)
);
const reloadStart = clone(regionSession(
  CombatEngine,
  reloadModel
));
reloadStart.player.hp = 1000000000;
reloadStart.player.maxHp = 1000000000;
reloadStart.enemy.hp = 1000000000;
reloadStart.enemy.maxHp = 1000000000;
let directStep = {
  session: clone(reloadStart),
  playerInventory: clone(reloadModel.player.inventory),
  rngState: 0x24681357
};
let reloadedStep = clone(directStep);
let reloadSnapshotsPreserved = true;
let firstReloadParityDifference = null;
for (let tick = 0; tick < 80; tick++) {
  const persisted = clone(reloadModel);
  persisted.player.inventory = clone(reloadedStep.playerInventory);
  persisted.systems.combat.session = clone(reloadedStep.session);
  persisted.current = {
    key: reloadedStep.session.actionKey,
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null,
    stalled: false
  };
  const normalized = JSON.parse(JSON.stringify(
    Stage3State.normalize(persisted)
  ));
  reloadSnapshotsPreserved = reloadSnapshotsPreserved &&
    normalized.systems.combat.session !== null &&
    normalized.systems.combat.session.loadoutSnapshot
      .hasActiveBeast === true;
  directStep = CombatEngine.advanceTick(directStep.session, {
    playerInventory: directStep.playerInventory,
    rngState: directStep.rngState
  });
  reloadedStep = CombatEngine.advanceTick(
    normalized.systems.combat.session,
    {
      playerInventory: normalized.player.inventory,
      rngState: reloadedStep.rngState
    }
  );
  if (firstReloadParityDifference === null &&
      JSON.stringify(directStep) !== JSON.stringify(reloadedStep)) {
    firstReloadParityDifference = {
      tick: tick + 1,
      direct: directStep,
      reloaded: reloadedStep,
      directRngState: directStep.rngState,
      reloadedRngState: reloadedStep.rngState
    };
  }
}
ok(
  reloadSnapshotsPreserved,
  'every save/reload preserves derived stats and active-beast snapshot'
);
ok(
  firstReloadParityDifference === null,
  'normalize/JSON reload preserves the full DTO and RNG every tick' +
    (firstReloadParityDifference === null
      ? ''
      : '\n  first difference: ' +
        JSON.stringify(firstReloadParityDifference))
);
ok(
  directStep.session.lastPlayerAction !== null &&
    JSON.stringify(directStep.session.lastPlayerAction) ===
      JSON.stringify(reloadedStep.session.lastPlayerAction),
  'last executed action telemetry survives repeated save/reload parity'
);

let accessorRuns = 0;
const hostileModel = {};
Object.defineProperty(hostileModel, 'player', {
  enumerable: true,
  get: function () {
    accessorRuns++;
    throw new Error('player getter invoked');
  }
});
ok(
  CombatEngine.createSession(hostileModel, {
    mode: 'region',
    regionId: 'qingyunOutskirts',
    enemyId: 'thornHare',
    loadoutId: 'loadout-1'
  }) === null && accessorRuns === 0,
  'descriptor-first session creation rejects accessors without invoking them'
);

let proxyTraps = 0;
const hostileProxy = new Proxy({}, {
  get: function () { proxyTraps++; throw new Error('proxy get'); },
  getPrototypeOf: function () {
    proxyTraps++;
    throw new Error('proxy prototype');
  },
  ownKeys: function () { proxyTraps++; throw new Error('proxy keys'); }
});
ok(
  CombatEngine.createSession(hostileProxy, {}) === null &&
    proxyTraps === 0,
  'CommonJS proxy input fails closed without entering proxy traps'
);

const browserEngine = loadBrowserEngine(GameRandom);
same(
  Object.keys(browserEngine),
  Object.keys(CombatEngine),
  'browser UMD and CommonJS expose the same frozen API order'
);
ok(deeplyFrozen(browserEngine), 'browser UMD installs one frozen global');

let dependencyGetterRuns = 0;
const hostileInventory = {};
Object.defineProperty(hostileInventory, 'apply', {
  enumerable: true,
  get: function () {
    dependencyGetterRuns++;
    throw new Error('apply getter invoked');
  }
});
const hostileDependencyEngine = loadBrowserEngine(
  GameRandom,
  hostileInventory
);
const dependencyModel = freshModel();
dependencyModel.player.inventory.stacks.grilledCarp = 1;
dependencyModel.player.combat.loadouts[0].supplies.food = {
  itemId: 'grilledCarp',
  triggerRatio: 0.5,
  stopWhenEmpty: true
};
const dependencySession = quietSession(
  hostileDependencyEngine,
  dependencyModel
);
dependencySession.player.hp = 50;
const dependencyResult = hostileDependencyEngine.advanceTick(
  dependencySession,
  context(dependencyModel, 170)
);
ok(
  dependencyGetterRuns === 0 &&
    dependencyResult.outcome === 'supply_exhausted',
  'unsafe dependency accessors are never invoked and consumption fails closed'
);

const source = fs.readFileSync('./core/combat-engine.js', 'utf8');
ok(
  !/Math\.random|localStorage|Platform\.|SaveSystem|document\.|canvas|toast\(/.test(
    source
  ),
  'combat engine stays pure and has no second runtime clock'
);

if (failed) {
  console.error(
    '\n=== Stage 3 确定性战斗自测：' + passed +
      ' 通过 / ' + failed + ' 失败 ==='
  );
  process.exitCode = 1;
} else {
  console.log(
    '\n=== Stage 3 确定性战斗自测：' + passed +
      ' 通过 / 0 失败 ==='
  );
}
