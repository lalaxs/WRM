'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const GameRandom = require('../core/random.js');
const SaveSystem = require('../core/save-system.js');
const SimulationReport = require('../core/simulation-report.js');
const StateModel = require('../core/state-model.js');
const Simulation = require('../core/simulation.js');
const GameRules = require('../core/game-rules.js');
const Stage4State = require('../core/stage4-state.js');

let pass = 0;
let fail = 0;
function ok(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.error('  ✗ FAIL: ' + message);
  }
}

function stage4SimulationFixture(value) {
  return Stage4State.normalize(value, {
    preserveLegacyFields: true
  });
}

function allNumbersFinite(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object') return true;
  return Object.keys(value).every((key) => allNumbersFinite(value[key]));
}

ok(true, 'simulation test harness starts');

function makeRuleContent() {
  return {
    actions: {
      makePill: {
        skill: 'alchemy',
        name: '炼丹',
        time: 4,
        xp: 10,
        cost: { herb: 2 },
        effects: {
          stacks: { pill: 1 },
          cultivation: 0,
          jingqi: 0
        }
      }
    },
    gatheringData: {
      herb: {
        entries: [{
          id: 'grove',
          name: '灵草圃',
          unlockLv: 1,
          time: 2,
          xp: 10,
          capMin: 2,
          capMax: 2,
          drops: [{ item: 'herb', w: 1, q: 1 }]
        }]
      },
      fishing: {
        entries: [{
          id: 'pond',
          name: '灵池',
          unlockLv: 1,
          time: 60,
          xp: 10,
          drops: [{ item: 'carp', w: 1, q: 1 }]
        }]
      }
    },
    gatherSkillKey: { herb: 'herbalism', fishing: 'fishing' },
    discoverableEntries(skill, level) {
      const group = this.gatheringData[skill];
      return group
        ? group.entries.filter((entry) => entry.unlockLv <= level)
        : [];
    },
    skillXpNeed() { return 100; },
    masteryXpNeed() { return 100; },
    masteryDoubleChance() { return 0; },
    effectiveGatherTime(skill, entryId) {
      const group = this.gatheringData[skill];
      const entry = group &&
        group.entries.find((candidate) => candidate.id === entryId);
      return entry ? entry.time : 1;
    },
    constants: {
      fishMax: 30,
      fishRecoverSeconds: 60,
      moodMax: 100,
      moodRegenPerSecond: 1 / 30,
      yearSeconds: 10,
      lifespanBufferYears: 1,
      worldTickSeconds: 300
    }
  };
}

function makeRulePlayer(overrides) {
  const source = overrides || {};
  return {
    inventory: {
      stacks: Object.assign({ herb: 0, pill: 0 }, source.stacks || {})
    },
    skills: Object.assign({
      alchemy: { lv: 1, xp: 0 },
      herbalism: { lv: 1, xp: 0 },
      fishing: { lv: 1, xp: 0 }
    }, source.skills || {}),
    mastery: Object.assign({
      herb: {
        pool: 0,
        entries: { grove: { lv: 1, xp: 0 } }
      },
      fishing: {
        pool: 0,
        entries: { carp: { lv: 1, xp: 0 } }
      }
    }, source.mastery || {}),
    xiwei: source.xiwei || 0,
    jingqi: source.jingqi == null ? 100 : source.jingqi,
    mood: source.mood == null ? 0 : source.mood,
    moodAnchorMs: null,
    moodBase: null,
    shouyuan: source.shouyuan === undefined ? null : source.shouyuan,
    shouMax: source.shouMax === undefined ? null : source.shouMax,
    lifespanAnchorMs: null,
    lifespanBaseYears: null
  };
}

function makeRuleState(overrides) {
  const source = overrides || {};
  return {
    modelVersion: 1,
    created: false,
    appearance: { parts: {} },
    player: JSON.parse(JSON.stringify(
      source.player || makeRulePlayer()
    )),
    current: SaveSystem.normalizeAction(
      source.current === undefined ? {
        key: 'makePill',
        mode: 'repeat',
        count: 0,
        done: 0,
        elapsed: 0,
        stalled: false
      } : source.current
    ),
    systems: JSON.parse(JSON.stringify(source.systems || {
      gathering: {
        spots: {},
        fishStocks: {},
        fishRecoverAcc: 0
      },
      homestead: { farm: { plots: [] } },
      parallel: { jobs: [] },
      world: { tickAccumulator: 0 }
    })),
    rngState: source.rngState == null ? 9 : source.rngState
  };
}

const rawStateEqualityGuardLeft = stage4SimulationFixture(
  StateModel.normalize(makeRuleState({ current: null }), 0)
);
const rawStateEqualityGuardRight = JSON.parse(
  JSON.stringify(rawStateEqualityGuardLeft)
);
rawStateEqualityGuardLeft.player.realmStage = 0;
rawStateEqualityGuardRight.player.realmStage = 99;
ok(
  JSON.stringify(rawStateEqualityGuardLeft) !==
    JSON.stringify(rawStateEqualityGuardRight),
  'full-state equality guard detects a realmStage 0 versus 99 mismatch'
);

const ruleContent = makeRuleContent();
const ruleContentBefore = JSON.stringify(ruleContent);
const gameRules = GameRules.create(ruleContent);
ok(Object.isFrozen(gameRules.rules) &&
  Object.isFrozen(gameRules.lanes) &&
  gameRules.lanes.every((lane) => Object.isFrozen(lane)),
  'game rules and fixed lane registry are immutable');
ok(gameRules.lanes.map((lane) => lane.id).join(',') ===
  'lifespan,fish,mood,farm,parallel,world',
  'passive lanes use the fixed deterministic order');
ok(JSON.stringify(ruleContent) === ruleContentBefore &&
  !Object.isFrozen(ruleContent) &&
  !Object.isFrozen(ruleContent.constants),
  'creating rules never mutates or freezes caller configuration');

[
  {
    label: 'action duration rejects Infinity',
    mutate(content) { content.actions.makePill.time = Infinity; }
  },
  {
    label: 'action costs reject negative numbers',
    mutate(content) { content.actions.makePill.cost.herb = -1; }
  },
  {
    label: 'stack effects reject non-finite numbers',
    mutate(content) {
      content.actions.makePill.effects.stacks.pill = NaN;
    }
  },
  {
    label: 'cultivation effects reject negative numbers',
    mutate(content) {
      content.actions.makePill.effects.cultivation = -1;
    }
  },
  {
    label: 'drop quantities reject negative numbers',
    mutate(content) {
      content.gatheringData.herb.entries[0].drops[0].q = -1;
    }
  },
  {
    label: 'drop weights reject non-finite numbers',
    mutate(content) {
      content.gatheringData.herb.entries[0].drops[0].w = Infinity;
    }
  }
].forEach((invalidCase) => {
  const invalidContent = makeRuleContent();
  invalidCase.mutate(invalidContent);
  let invalidError = null;
  try {
    GameRules.create(invalidContent);
  } catch (error) {
    invalidError = error;
  }
  ok(invalidError instanceof RangeError, invalidCase.label);
});
const negativeJingqiContent = makeRuleContent();
negativeJingqiContent.actions.makePill.effects.jingqi = -2;
ok(!!GameRules.create(negativeJingqiContent),
  'explicit negative jingqi effects remain valid');

const made = Simulation.advance(makeRuleState({
  player: makeRulePlayer({ stacks: { herb: 4 } })
}), 20, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 20,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(made.state.player.inventory.stacks.pill === 2,
  'production consumes exactly available materials');
ok(made.state.player.inventory.stacks.herb === 0,
  'production material payment is transactional and exact');
ok(made.state.current === null,
  'production stops when materials are exhausted');
ok(made.report.action.stopReason === 'materials_exhausted',
  'production reports materials exhaustion');
ok(made.report.action.completed === 2,
  'report records completed production iterations');
ok(made.report.gains.items.pill === 2 &&
  made.report.costs.items.herb === 4,
  'production reports item gains and costs from economic deltas');

const missingMaterials = makeRuleState({
  player: makeRulePlayer({ stacks: { herb: 1 } })
});
const missingMaterialsBefore = JSON.stringify(
  missingMaterials.player.inventory.stacks
);
const blockedProduction = Simulation.advance(missingMaterials, 20, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(JSON.stringify(blockedProduction.state.player.inventory.stacks) ===
  missingMaterialsBefore &&
  blockedProduction.report.action.completed === 0,
  'missing production materials never partially pay or grant output');

const unknownAction = Simulation.advance(makeRuleState({
  current: {
    key: 'missing',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    stalled: false
  }
}), 1, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(unknownAction.state.current === null &&
  unknownAction.report.action.stopReason === 'invalid_action',
  'unknown action stops with the stable invalid action reason');

const finiteComplete = Simulation.advance(makeRuleState({
  current: {
    key: 'makePill',
    mode: 'finite',
    count: 1,
    done: 1,
    elapsed: 0,
    stalled: false
  }
}), 1, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(finiteComplete.state.current === null &&
  finiteComplete.report.action.stopReason === 'completed',
  'already completed finite action stops without another iteration');

const gathered = Simulation.advance(makeRuleState({
  player: makeRulePlayer(),
  current: {
    key: 'gather:herb:grove',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    stalled: false
  },
  systems: {
    gathering: {
      spots: { herb: { id: 'grove', cap: 2, left: 2 } },
      fishStocks: {},
      fishRecoverAcc: 0
    },
    homestead: { farm: { plots: [] } },
    parallel: { jobs: [] },
    world: { tickAccumulator: 0 }
  }
}), 20, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(gathered.state.player.inventory.stacks.herb === 2 &&
  gathered.report.action.completed === 2,
  'finite gathering applies drops, XP and exact capacity');
ok(gathered.report.action.stopReason === 'resource_depleted' &&
  gathered.state.systems.gathering.spots.herb === null,
  'finite gathering clears depleted spot and reports depletion');

const finiteGathered = Simulation.advance(makeRuleState({
  player: makeRulePlayer(),
  current: {
    key: 'gather:herb:grove',
    mode: 'finite',
    count: 1,
    done: 0,
    elapsed: 0,
    stalled: false
  },
  systems: {
    gathering: {
      spots: { herb: { id: 'grove', cap: 1, left: 1 } },
      fishStocks: {},
      fishRecoverAcc: 0
    },
    homestead: { farm: { plots: [] } },
    parallel: { jobs: [] },
    world: { tickAccumulator: 0 }
  }
}), 2, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(finiteGathered.state.systems.gathering.spots.herb === null,
  'finite gathering still clears a spot exhausted on its final count');
ok(finiteGathered.report.action.stopReason === 'completed',
  'finite completion wins over simultaneous resource depletion');

const explored = Simulation.advance(makeRuleState({
  current: {
    key: 'gather:explore:herb',
    mode: 'finite',
    count: 1,
    done: 0,
    elapsed: 0,
    stalled: false
  }
}), 2, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(explored.state.systems.gathering.spots.herb.id === 'grove' &&
  explored.state.systems.gathering.spots.herb.left === 2,
  'two-second exploration injects deterministic spot and capacity RNG');
ok(explored.state.current === null &&
  explored.report.action.stopReason === 'completed',
  'exploration is a one-shot finite action');

const waitingFish = Simulation.advance(makeRuleState({
  current: {
    key: 'gather:fishing:pond',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    stalled: false
  },
  systems: {
    gathering: {
      spots: {},
      fishStocks: { pond: 0 },
      fishRecoverAcc: 0
    },
    homestead: { farm: { plots: [] } },
    parallel: { jobs: [] },
    world: { tickAccumulator: 0 }
  }
}), 60, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 60,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(waitingFish.state.current &&
  waitingFish.state.systems.gathering.fishStocks.pond === 1 &&
  waitingFish.report.action.completed === 0,
  'empty fishing waits without dropping the action and recovers exactly');
ok(waitingFish.report.passive.fishRecovered === 1,
  'fish stock recovery is handled and reported by passive lane');

const simultaneousFish = Simulation.advance(makeRuleState({
  current: {
    key: 'gather:fishing:pond',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    stalled: false
  },
  systems: {
    gathering: {
      spots: {},
      fishStocks: { pond: 1 },
      fishRecoverAcc: 0
    },
    homestead: { farm: { plots: [] } },
    parallel: { jobs: [] },
    world: { tickAccumulator: 0 }
  }
}), 60, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(simultaneousFish.report.action.completed === 1 &&
  simultaneousFish.report.passive.fishRecovered === 1 &&
  simultaneousFish.state.systems.gathering.fishStocks.pond === 1,
  'simultaneous fishing and recovery boundary resolves without lost stock');

const overfullFish = Simulation.advance(makeRuleState({
  current: null,
  systems: {
    gathering: {
      spots: {},
      fishStocks: { pond: 45 },
      fishRecoverAcc: 0
    },
    homestead: { farm: { plots: [] } },
    parallel: { jobs: [] },
    world: { tickAccumulator: 0 }
  }
}), 60, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 0,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(overfullFish.state.systems.gathering.fishStocks.pond === 30 &&
  overfullFish.report.passive.fishRecovered === 0,
  'over-cap fish stock clamps without negative recovery accounting');

const negativeFish = Simulation.advance(makeRuleState({
  current: null,
  systems: {
    gathering: {
      spots: {},
      fishStocks: { pond: -5 },
      fishRecoverAcc: 0
    },
    homestead: { farm: { plots: [] } },
    parallel: { jobs: [] },
    world: { tickAccumulator: 0 }
  }
}), 60, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 0,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(negativeFish.state.systems.gathering.fishStocks.pond === 1 &&
  negativeFish.report.passive.fishRecovered === 1,
  'negative fish stock clamps to zero before positive recovery');

const lifespanResult = Simulation.advance(makeRuleState({
  player: makeRulePlayer({
    stacks: { herb: 100 },
    shouyuan: 2,
    shouMax: 2
  }),
  current: {
    key: 'makePill',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    stalled: false
  }
}), 20, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(lifespanResult.report.action.stopReason === 'lifespan_buffer',
  'main action stops before silent lifespan exhaustion');
ok(lifespanResult.state.player.shouyuan === 1,
  'player lifespan clamps at one-year safety buffer');

const immortalResult = Simulation.advance(makeRuleState({
  player: makeRulePlayer({ shouyuan: null, shouMax: null }),
  current: null
}), 1000, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 0,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(immortalResult.state.player.shouyuan === null,
  'null lifespan remains infinite and never becomes numeric');

const passiveResult = Simulation.advance(makeRuleState({
  player: makeRulePlayer({ mood: 0 }),
  current: null,
  systems: {
    gathering: {
      spots: {},
      fishStocks: {},
      fishRecoverAcc: 0
    },
    homestead: {
      farm: {
        plots: [{ id: 'plot-1', remainingSeconds: 100 }]
      }
    },
    parallel: {
      jobs: [{ id: 'letter-1', remainingSeconds: 200 }]
    },
    world: { tickAccumulator: 0 }
  }
}), 600, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 0,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(passiveResult.report.passive.farmCompleted.join(',') === 'plot-1' &&
  passiveResult.report.passive.parallelCompleted.join(',') === 'letter-1',
  'farm and parallel jobs finish through generic remaining seconds');
ok(passiveResult.report.world.ticks === 2 &&
  passiveResult.report.world.events.length === 0,
  'world seam resolves deterministic five-minute ticks');
ok(passiveResult.state.player.mood === 20,
  'mood recovers continuously during passive simulation');

const emptyLaneResult = Simulation.advance(makeRuleState({
  current: null,
  systems: {
    gathering: {
      spots: {},
      fishStocks: {},
      fishRecoverAcc: 0
    },
    homestead: { farm: { plots: [] } },
    parallel: { jobs: [] },
    world: { tickAccumulator: 0 }
  }
}), 1, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
ok(emptyLaneResult.report.world.ticks === 0,
  'empty passive collections advance without zero-boundary loops');

const chunkInitial = makeRuleState({
  player: makeRulePlayer(),
  current: {
    key: 'gather:herb:grove',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    stalled: false
  },
  systems: {
    gathering: {
      spots: { herb: { id: 'grove', cap: 10, left: 10 } },
      fishStocks: {},
      fishRecoverAcc: 0
    },
    homestead: { farm: { plots: [] } },
    parallel: { jobs: [] },
    world: { tickAccumulator: 0 }
  },
  rngState: 1234
});
const bulkRulesResult = Simulation.advance(chunkInitial, 10, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: gameRules.rules,
  lanes: gameRules.lanes
});
let chunkRulesState = chunkInitial;
for (let second = 0; second < 10; second++) {
  chunkRulesState = Simulation.advance(chunkRulesState, 1, {
    source: 'online',
    fromMs: second * 1000,
    mainActionLimitSeconds: null,
    rules: gameRules.rules,
    lanes: gameRules.lanes
  }).state;
}
ok(JSON.stringify(chunkRulesState) ===
  JSON.stringify(bulkRulesResult.state),
  'real gathering rules keep chunked and bulk state identical with one RNG');

const specialStacks = JSON.parse(
  '{"__proto__":2,"constructor":3,"prototype":4}'
);
const specialContent = makeRuleContent();
specialContent.actions = {
  special: {
    skill: 'alchemy',
    name: '特殊键',
    time: 1,
    xp: 0,
    effects: {
      stacks: specialStacks,
      cultivation: 0,
      jingqi: 0
    }
  }
};
const specialRules = GameRules.create(specialContent);
const specialResult = Simulation.advance(makeRuleState({
  current: {
    key: 'special',
    mode: 'finite',
    count: 1,
    done: 0,
    elapsed: 0,
    stalled: false
  }
}), 1, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: specialRules.rules,
  lanes: specialRules.lanes
});
const specialRuleRoundTrip = JSON.parse(JSON.stringify(specialResult.state));
ok(specialRuleRoundTrip.player.inventory.stacks.__proto__ === 2 &&
  specialRuleRoundTrip.player.inventory.stacks.constructor === 3 &&
  specialRuleRoundTrip.player.inventory.stacks.prototype === 4 &&
  Object.prototype.polluted === undefined,
  'rule economy preserves special inventory keys without prototype pollution');
ok(specialResult.report.gains.items.__proto__ === 2 &&
  specialResult.report.gains.items.constructor === 3,
  'rule report preserves special item keys');

ok(Object.isFrozen(SimulationReport.STOP_REASONS),
  'stop reasons table is immutable');
ok(SimulationReport.STOP_REASONS.MATERIALS_EXHAUSTED === 'materials_exhausted',
  'stop reasons use stable serializable codes');
ok(SimulationReport.STOP_REASONS.SIMULATION_GUARD === 'simulation_guard',
  'simulation guard uses its locked code');

const rawBoundary = {
  schemaVersion: 1,
  savedAt: 5000,
  created: true,
  appearance: { parts: { hair: 2 }, ignored: true },
  player: {
    name: '边界测试',
    shouyuan: 10,
    shouMax: Infinity,
    items: { yaocai: 3, shared: 1 },
    dan: { tupo: 1, shared: 2 },
    bag: { copperOre: 2, shared: 3 },
    inventory: { stacks: { shared: 4 } },
    spots: { herb: { id: 'parityHerb1', left: 3, cap: 5 } },
    fishing: { pond: 7 },
    skills: { caiyao: { lv: 2, xp: 3 } },
    mastery: { herb: { pool: 0, entries: {} } }
  },
  current: {
    key: 'caiyao',
    mode: 'repeat',
    count: 0,
    done: 2,
    elapsed: 1
  },
  rngState: 123,
  fishRecoverAcc: 9,
  pendingOfflineReport: { caiyao: 2 },
  dirty: true,
  cache: { canvas: true },
  _persistenceIssue: { kind: 'offline' }
};
const rawBoundaryBefore = JSON.stringify(rawBoundary, (key, value) => (
  value === Infinity ? '__Infinity__' : value
));
const normalizedBoundary = StateModel.normalize(rawBoundary, 10000);
ok(normalizedBoundary.processedThroughMs === 5000,
  'savedAt migrates to processedThroughMs');
ok(normalizedBoundary.offlineLimitSeconds === 43200,
  'missing offline limit defaults to twelve hours');
ok(normalizedBoundary.player.inventory.stacks.herbBundle === 3 &&
   normalizedBoundary.player.inventory.stacks.foundationPill === 1 &&
   normalizedBoundary.player.inventory.stacks.copperOre === 2 &&
   !('shared' in normalizedBoundary.player.inventory.stacks),
  'legacy inventory maps migrate to known Stage 2 item IDs');
ok(!('items' in normalizedBoundary.player) &&
   !('dan' in normalizedBoundary.player) &&
   !('bag' in normalizedBoundary.player),
  'legacy inventory maps are not retained in v2 model');
ok(normalizedBoundary.systems.gathering.spots.herb.entryId ===
   'parityHerb1',
  'legacy resource spots migrate to gathering system');
ok(normalizedBoundary.systems.gathering.fishStocks.spiritCarp === 5,
  'legacy per-spot fish stock migrates proportionally to species stock');
ok(normalizedBoundary.systems.gathering.fishRecoverAcc === 9,
  'legacy passive accumulator migrates to gathering system');
ok(normalizedBoundary.systems.homestead.farm.plots.length === 3,
  'farm defaults contain three unlocked plots');
ok(normalizedBoundary.systems.homestead.formations.slots.length === 1,
  'formation defaults contain one unlocked slot');
ok(normalizedBoundary.systems.homestead.beasts.roster.length === 0,
  'beast extension slot exists');
ok(normalizedBoundary.systems.parallel.jobs.length === 0,
  'parallel extension slot exists');
ok(normalizedBoundary.systems.world.tickAccumulator === 0,
  'world extension slot exists');
ok(normalizedBoundary.player.shouyuan === null &&
   normalizedBoundary.player.shouMax === null,
  'unlimited lifespan uses the null sentinel for both lifespan fields');
ok(JSON.parse(JSON.stringify(normalizedBoundary)).player.shouMax === null &&
   allNumbersFinite(normalizedBoundary),
  'state model remains finite through JSON round-trip');
ok(normalizedBoundary.pendingOfflineReports.length === 1 &&
   normalizedBoundary.pendingOfflineReports[0].action.key === 'caiyao',
  'singular Stage 1A offline report migrates into the report inbox');
ok(normalizedBoundary.current.key === 'gather:explore:herb',
  'legacy active action migrates to its canonical Stage 2 key');
ok(JSON.stringify(rawBoundary, (key, value) => (
  value === Infinity ? '__Infinity__' : value
)) === rawBoundaryBefore,
  'normalization does not mutate its input');

const canonicalBoundary = StateModel.normalize({
  savedAt: 6000,
  player: {
    name: '规范角色',
    items: { yaocai: 1 },
    inventory: { stacks: { herbBundle: 8 } },
    spots: {
      herb: { id: 'parityHerb1', cap: 5, left: 2 }
    }
  },
  systems: {
    gathering: {
      nextSpotId: 10,
      spots: {
        herb: {
          instanceId: 'spot-9',
          skillId: 'herb',
          entryId: 'mushroomWood',
          capacity: 8,
          remaining: 4
        }
      },
      fishStocks: { spiritCarp: 4 },
      fishRecoverAcc: 3
    },
    homestead: {
      farm: { plots: [{ id: 'plot' }] },
      formations: { slots: ['slot'], owned: ['owned'] },
      beasts: { roster: [{ id: 'beast' }], activeIds: ['beast'] }
    },
    parallel: { jobs: [{ id: 'job' }] },
    world: { tickAccumulator: 2 }
  },
  offlineLimitSeconds: 999999,
  pendingOfflineReports: [
    { id: 'same', source: 'offline' },
    { id: 'same', source: 'offline' }
  ],
  lastActionStop: { key: 'caiyao', reason: 'manual', atMs: 5999 }
}, 10000);
ok(canonicalBoundary.player.inventory.stacks.herbBundle === 9 &&
   canonicalBoundary.systems.gathering.spots.herb[0].entryId ===
     'mushroomWood' &&
   !('quality' in canonicalBoundary.systems.gathering.spots.herb[0]),
  'canonical Stage 2 locations override legacy aliases while item aliases merge');

const gatheringMergeInput = {
  player: {
    spots: JSON.parse(
      '{"herb":{"id":"parityHerb1","cap":5,"left":2},' +
      '"mining":{"id":"copper","cap":6,"left":3},' +
      '"__proto__":{"id":"legacy-special"}}'
    ),
    fishing: JSON.parse(
      '{"pond":4,"constructor":6}'
    )
  },
  systems: {
    gathering: {
      spots: JSON.parse(
        '{"herb":{"instanceId":"spot-8","skillId":"herb",' +
        '"entryId":"mushroomWood",' +
        '"capacity":9,"remaining":4},' +
        '"prototype":{"id":"canonical-special"}}'
      ),
      fishStocks: JSON.parse(
        '{"spiritCarp":8,"prototype":9}'
      ),
      fishRecoverAcc: 0
    }
  }
};
const gatheringMergeBefore = JSON.stringify(gatheringMergeInput);
const gatheringMerged = StateModel.normalize(gatheringMergeInput, 0);
ok(
  gatheringMerged.systems.gathering.spots.herb[0].entryId ===
    'mushroomWood' &&
  gatheringMerged.systems.gathering.spots.mining[0].entryId ===
    'copper' &&
  !('quality' in gatheringMerged.systems.gathering.spots.herb[0]),
  'legacy and canonical spots merge by key with canonical precedence'
);
ok(
  gatheringMerged.systems.gathering.fishStocks.spiritCarp === 8,
  'canonical per-species fish stock overrides legacy per-spot stock'
);
ok(
  !Object.prototype.hasOwnProperty.call(
    gatheringMerged.systems.gathering.spots,
    '__proto__'
  ) &&
  !Object.prototype.hasOwnProperty.call(
    gatheringMerged.systems.gathering.spots,
    'prototype'
  ) &&
  !Object.prototype.hasOwnProperty.call(
    gatheringMerged.systems.gathering.fishStocks,
    'constructor'
  ) &&
  !Object.prototype.hasOwnProperty.call(
    gatheringMerged.systems.gathering.fishStocks,
    'prototype'
  ) &&
  Object.prototype.polluted === undefined,
  'Stage 2 gathering ignores unknown special keys without prototype pollution'
);
ok(JSON.stringify(gatheringMergeInput) === gatheringMergeBefore,
  'gathering merge normalization never mutates either source');

const emptyCanonicalGathering = StateModel.normalize({
  player: {
    spots: {
      herb: { id: 'parityHerb1', cap: 5, left: 2 }
    },
    fishing: { pond: 12 }
  },
  systems: {
    gathering: {
      spots: {},
      fishStocks: {},
      fishRecoverAcc: 0
    }
  }
}, 0);
ok(
  emptyCanonicalGathering.systems.gathering.spots.herb.entryId ===
    'parityHerb1' &&
  emptyCanonicalGathering.systems.gathering.fishStocks.spiritCarp === 8,
  'empty canonical gathering maps never swallow legacy entries'
);
ok(canonicalBoundary.offlineLimitSeconds === 172800,
  'offline limit is clamped to the supported upper bound');
ok(canonicalBoundary.pendingOfflineReports.length === 1,
  'pending report inbox is normalized and deduplicated');
ok(canonicalBoundary.lastActionStop.key === 'caiyao' &&
   canonicalBoundary.lastActionStop.atMs === 5999,
  'valid last action stop metadata survives normalization');

const canonicalPendingReport = SimulationReport.create({
  source: 'offline',
  fromMs: 6000,
  toMs: 7000,
  requestedSeconds: 1,
  actionKey: 'tuna',
  seedBefore: 5
});
const mergedPendingSources = StateModel.normalize({
  savedAt: 7000,
  pendingOfflineReports: [canonicalPendingReport],
  pendingOfflineReport: { caiyao: 2 }
}, 8000);
ok(
  mergedPendingSources.pendingOfflineReports.length === 2 &&
    mergedPendingSources.pendingOfflineReports.some(
      (report) => report.action.key === 'tuna'
    ) &&
    mergedPendingSources.pendingOfflineReports.some(
      (report) => report.action.key === 'caiyao'
    ),
  'canonical and singular pending report sources merge without loss'
);

const singularWithEmptyCanonical = StateModel.normalize({
  savedAt: 7000,
  pendingOfflineReports: [],
  pendingOfflineReport: { caiyao: 4 }
}, 8000);
ok(
  singularWithEmptyCanonical.pendingOfflineReports.length === 1 &&
    singularWithEmptyCanonical.pendingOfflineReports[0].action.key === 'caiyao',
  'empty canonical model inbox does not suppress a new singular report'
);
const runtimeMergedPending = StateModel.fromRuntime({
  pendingOfflineReports: [canonicalPendingReport],
  offlineResult: { caiyao: 5 }
}, 8000);
ok(
  runtimeMergedPending.pendingOfflineReports.length === 2 &&
    runtimeMergedPending.pendingOfflineReports.some(
      (report) => report.action.key === 'caiyao'
    ),
  'runtime extraction retains a newly-produced legacy offline report'
);

const newerSingularReport = JSON.parse(JSON.stringify(canonicalPendingReport));
newerSingularReport.gains.items.yaocai = 9;
const olderCanonicalReport = JSON.parse(JSON.stringify(canonicalPendingReport));
olderCanonicalReport.gains.items.yaocai = 1;
const stablePendingDedup = StateModel.normalize({
  pendingOfflineReports: [olderCanonicalReport],
  pendingOfflineReport: newerSingularReport
}, 8000);
ok(
  stablePendingDedup.pendingOfflineReports.length === 1 &&
    stablePendingDedup.pendingOfflineReports[0].gains.items.yaocai === 9,
  'singular copy wins stable report-id deduplication over stale canonical data'
);

const foreignPendingReport = vm.runInNewContext(
  '(' + JSON.stringify(canonicalPendingReport) + ')'
);
const foreignPendingBoundary = StateModel.normalize({
  pendingOfflineReports: [foreignPendingReport]
}, 8000);
ok(
  foreignPendingBoundary.pendingOfflineReports.length === 1 &&
    foreignPendingBoundary.pendingOfflineReports[0].id ===
      canonicalPendingReport.id,
  'foreign-realm pending reports clone into the local realm before normalization'
);

const malformedBoundary = StateModel.normalize({
  created: 'yes',
  appearance: { parts: [] },
  player: {
    name: {},
    realmStage: NaN,
    shouyuan: Infinity,
    shouMax: 'bad',
    inventory: { stacks: [] },
    skills: [],
    mastery: new Date(0)
  },
  current: { key: '', count: -2 },
  rngState: 0,
  offlineLimitSeconds: -1,
  systems: {
    gathering: { spots: [], fishStocks: null, fishRecoverAcc: Infinity },
    homestead: {
      farm: { plots: {} },
      formations: { slots: {}, owned: null },
      beasts: { roster: 'bad', activeIds: {} }
    },
    parallel: { jobs: {} },
    world: { tickAccumulator: NaN }
  },
  pendingOfflineReports: {},
  reportArchive: {},
  processedThroughMs: -10,
  lastActionStop: { key: {}, reason: null, atMs: Infinity }
}, 20000);
ok(malformedBoundary.created === true &&
   malformedBoundary.appearance.parts &&
   !Array.isArray(malformedBoundary.appearance.parts),
  'malformed appearance is replaced without losing boolean creation state');
ok(malformedBoundary.player.name === '' &&
   malformedBoundary.player.realmStage === 0 &&
   malformedBoundary.player.inventory.stacks &&
   !Array.isArray(malformedBoundary.player.inventory.stacks) &&
   !Array.isArray(malformedBoundary.player.skills) &&
   !Array.isArray(malformedBoundary.player.mastery),
  'malformed player fields normalize to model-safe defaults');
ok(malformedBoundary.current === null &&
   malformedBoundary.offlineLimitSeconds === 43200 &&
   malformedBoundary.processedThroughMs === 0 &&
   malformedBoundary.lastActionStop === null,
  'malformed action, limits, watermark and stop metadata are rejected safely');
ok(malformedBoundary.systems.homestead.farm.plots.length === 3 &&
   malformedBoundary.systems.homestead.formations.slots.length === 1 &&
   malformedBoundary.systems.parallel.jobs.length === 0 &&
   malformedBoundary.systems.world.tickAccumulator === 0,
  'malformed extension slots normalize to safe Stage 2 defaults');

class ExoticStatePlayer {
  constructor() {
    this.name = '不应进入模型';
  }
}
ok(StateModel.normalize({
  player: new ExoticStatePlayer()
}, 1).player === null,
  'state model rejects non-plain player instances');
const throwingStatePlayer = new Proxy({}, {
  getPrototypeOf() {
    throw new Error('prototype unavailable');
  }
});
let throwingStateBoundary = null;
try {
  throwingStateBoundary = StateModel.normalize({
    player: throwingStatePlayer
  }, 1);
} catch (error) {
  throwingStateBoundary = null;
}
ok(
  throwingStateBoundary && throwingStateBoundary.player === null,
  'state model treats throwing prototype inspection as non-plain'
);

const mutableVmSource = { nested: { value: 1 } };
const mutableVm = StateModel.readonly(mutableVmSource);
mutableVmSource.nested.value = 2;
ok(Object.isFrozen(mutableVm) && Object.isFrozen(mutableVm.nested) &&
   mutableVm.nested.value === 1,
  'readonly deeply freezes a detached clone');

const runtimeBoundary = {
  dirty: true,
  cache: { canvas: true },
  appearance: { parts: { hair: 99 } },
  parts: { hair: 98 },
  phase: 'game',
  navIndex: 6,
  showOffline: true,
  _last: 22,
  _persistenceIssue: { kind: 'repair' },
  _offlineCommitPending: true,
  _recoveryCandidate: { secret: true }
};
StateModel.applyToRuntime(runtimeBoundary, normalizedBoundary);
runtimeBoundary.player.name = '运行中';
runtimeBoundary.player.renderer = {
  canvas: { getContext() {} },
  modalOpen: true
};
const extractedBoundary = StateModel.fromRuntime(runtimeBoundary, 12000);
ok(extractedBoundary.player.name === '运行中',
  'runtime model fields round-trip');
ok(normalizedBoundary.player.name === '边界测试',
  'applying and mutating runtime state never mutates the source model');
ok(extractedBoundary.appearance.parts.hair === 2,
  'runtime extraction uses the appearance indices applied to the live state');
ok(!('cache' in extractedBoundary) &&
   !('dirty' in extractedBoundary) &&
   !('phase' in extractedBoundary) &&
   !('navIndex' in extractedBoundary) &&
   !('showOffline' in extractedBoundary) &&
   !('_last' in extractedBoundary),
  'renderer and UI fields never enter model');
ok(!('_persistenceIssue' in extractedBoundary) &&
   !('_offlineCommitPending' in extractedBoundary) &&
   !('_recoveryCandidate' in extractedBoundary),
  'persistence recovery control never enters the save model');
ok(!('renderer' in extractedBoundary.player),
  'DOM-like and canvas-like player fields never enter the model');
ok(runtimeBoundary.phase === 'game' &&
   runtimeBoundary.navIndex === 6 &&
   runtimeBoundary.dirty === true &&
   runtimeBoundary.cache.canvas === true &&
   runtimeBoundary._persistenceIssue.kind === 'repair',
  'applying a model never overwrites runtime-only UI or recovery controls');

const snapshotInput = StateModel.toSnapshotInput(extractedBoundary);
snapshotInput.player.name = '快照副本';
ok(extractedBoundary.player.name === '运行中' &&
   !('dirty' in snapshotInput) &&
   !('_persistenceIssue' in snapshotInput),
  'snapshot input is a detached persistence whitelist');

const reportA = SimulationReport.create({
  source: 'offline',
  fromMs: 1000,
  toMs: 61000,
  requestedSeconds: 60,
  actionKey: 'caiyao',
  seedBefore: 7
});
const reportA2 = SimulationReport.create({
  source: 'offline',
  fromMs: 1000,
  toMs: 61000,
  requestedSeconds: 60,
  actionKey: 'caiyao',
  seedBefore: 7
});
ok(reportA.id === reportA2.id,
  'same settlement window produces same report id');
ok(reportA.source === 'offline' &&
  reportA.requestedSeconds === 60 &&
  reportA.action.key === 'caiyao',
  'create records sanitized settlement metadata');
ok(reportA.mainActionSeconds === 0 &&
  reportA.gains.cultivation === 0 &&
  Array.isArray(reportA.passive.parallelCompleted),
  'create returns the fixed report structure');

SimulationReport.addCount(reportA, 'items', 'yaocai', 2);
SimulationReport.addCount(reportA, 'skillXp', 'caiyao', 8);
SimulationReport.stop(reportA, 'resource_depleted', 61000);
ok(reportA.gains.items.yaocai === 2,
  'report records item gains');
ok(reportA.gains.skillXp.caiyao === 8,
  'report records skill experience gains');
ok(reportA.action.stopReason === 'resource_depleted' &&
  reportA.action.stopAtMs === 61000,
  'report records stop reason and timestamp');

const reportDifferentSeed = SimulationReport.create({
  source: 'offline',
  fromMs: 1000,
  toMs: 61000,
  requestedSeconds: 60,
  actionKey: 'caiyao',
  seedBefore: 8
});
ok(reportDifferentSeed.id !== reportA.id,
  'report identity includes the starting random seed');

const invalidCreated = SimulationReport.create({
  source: 7,
  fromMs: Infinity,
  toMs: NaN,
  requestedSeconds: -Infinity,
  actionKey: {},
  seedBefore: Infinity
});
ok(invalidCreated.source === 'online' &&
  invalidCreated.fromMs === 0 &&
  invalidCreated.toMs === 0 &&
  invalidCreated.requestedSeconds === 0 &&
  invalidCreated.action.key === null,
  'create safely defaults invalid or missing metadata');
ok(allNumbersFinite(invalidCreated),
  'invalid numeric metadata never becomes a persisted non-finite number');

const beforeInvalidAdd = JSON.stringify(reportA.gains);
SimulationReport.addCount(reportA, 'items', 'bad', Infinity);
SimulationReport.addCount(reportA, 'unknown', 'bad', 1);
SimulationReport.addCount(null, 'items', 'bad', 1);
ok(JSON.stringify(reportA.gains) === beforeInvalidAdd,
  'addCount ignores invalid reports, sections, keys and non-finite amounts');
SimulationReport.stop(reportA2, 'not_a_locked_reason', Infinity);
ok(reportA2.action.stopReason === 'invalid_action' &&
  reportA2.action.stopAtMs === null,
  'stop normalizes invalid reason and timestamp');

const inbox = SimulationReport.addPending(
  SimulationReport.addPending([], reportA),
  reportA2
);
ok(inbox.length === 1,
  'pending reports deduplicate by id');
reportA.gains.items.yaocai = 999;
ok(inbox[0].gains.items.yaocai === 2,
  'pending inbox JSON-clones reports after deduplication');

const duplicateObject = SimulationReport.normalize(inbox[0]);
duplicateObject.gains.items.yaocai = 77;
const duplicateInbox = SimulationReport.addPending(inbox, duplicateObject);
ok(duplicateInbox.length === 1 &&
  duplicateInbox[0].gains.items.yaocai === 2,
  'same id in a different object remains idempotent and keeps first entry');
const reopenedInbox = JSON.parse(JSON.stringify(duplicateInbox));
const reopenedDuplicate = JSON.parse(JSON.stringify(duplicateInbox[0]));
ok(
  SimulationReport.addPending(
    reopenedInbox,
    reopenedDuplicate
  ).length === 1,
  'same report stays idempotent across a real JSON reopen'
);
ok(SimulationReport.addPending(null, null).length === 0,
  'pending inbox tolerates invalid or missing input');

const archived = SimulationReport.archive([], inbox, 50);
const archivedAgain = SimulationReport.archive(archived, inbox, 50);
ok(archivedAgain.length === 1,
  'report archive is idempotent');
ok(SimulationReport.archive(archived, inbox, 0).length === 0 &&
  SimulationReport.archive(archived, inbox, -2).length === 0,
  'archive limit zero or negative keeps no reports');

const r2 = SimulationReport.create({
  source: 'online',
  fromMs: 61000,
  toMs: 62000,
  requestedSeconds: 1,
  actionKey: 'caiyao',
  seedBefore: 8
});
const r3 = SimulationReport.create({
  source: 'online',
  fromMs: 62000,
  toMs: 63000,
  requestedSeconds: 1,
  actionKey: 'caiyao',
  seedBefore: 9
});
const limitedArchive = SimulationReport.archive([], [reportA2, r2, r3], 2);
ok(limitedArchive.length === 2 &&
  limitedArchive[0].id === r2.id &&
  limitedArchive[1].id === r3.id,
  'archive keeps only the newest limited reports');

const structuredRaw = JSON.parse(JSON.stringify(r2));
structuredRaw.mainActionSeconds = 1;
structuredRaw.gains.items.herb = 3;
structuredRaw.world.ticks = 2;
structuredRaw.warnings.push('fixture_warning');
structuredRaw.gains.skillXp.bad = Infinity;
structuredRaw.levels.push({
  skill: 'bad',
  value: NaN,
  nested: { duration: -Infinity }
});
const normalizedStructured = SimulationReport.normalize(structuredRaw);
ok(normalizedStructured.id === r2.id &&
  normalizedStructured.mainActionSeconds === 1 &&
  normalizedStructured.gains.items.herb === 3 &&
  normalizedStructured.gains.skillXp.bad === undefined,
  'normalize fills a structured report and removes non-finite counts');
ok(allNumbersFinite(normalizedStructured) &&
  normalizedStructured.levels[0].value === undefined &&
  normalizedStructured.levels[0].nested.duration === undefined,
  'normalization removes non-finite numbers from nested persisted arrays');

const legacy = SimulationReport.normalize(
  { caiyao: 4, cailiao: 'not-a-number' },
  { savedAt: 123456, source: 'offline', seedBefore: 3 }
);
const legacyAgain = SimulationReport.normalize(
  { caiyao: 4 },
  { savedAt: 123456, source: 'offline', seedBefore: 3 }
);
ok(legacy.action.key === 'caiyao' &&
  legacy.action.completed === 4 &&
  legacy.warnings.includes('legacy_offline_report_migrated'),
  'legacy Stage 1A report migrates its first numeric action');
ok(legacy.id === legacyAgain.id,
  'legacy migration uses savedAt for stable identity');
ok(SimulationReport.normalize(null) === null &&
  SimulationReport.normalize([]) === null,
  'normalize rejects invalid report roots');

SimulationReport.addCount(r2, 'items', 'yaocai', 5);
r2.mainActionSeconds = 1;
r2.levels.push({ skill: 'caiyao', level: 2 });
r2.unlocks.push('caiyao-2');
r2.passive.fishRecovered = 3;
r2.passive.farmCompleted.push('plot-1');
r2.world.ticks = 2;
r2.world.events.push({ type: 'weather' });
r2.warnings.push('fixture_warning');
const summary = SimulationReport.summarize([inbox[0], r2, r2, null]);
ok(Object.isFrozen(summary) &&
  Object.isFrozen(summary.gains) &&
  Object.isFrozen(summary.gains.items) &&
  Object.isFrozen(summary.levels[0]),
  'summary returned to callers is deeply immutable');
ok(summary.reportIds.length === 2 &&
  summary.reportIds[0] === inbox[0].id &&
  summary.reportIds[1] === r2.id,
  'summary retains deduplicated source report ids');
ok(summary.gains.items.yaocai === 7 &&
  summary.mainActionSeconds === 1 &&
  summary.world.ticks === 2,
  'summary merges numeric maps and counters');
ok(summary.levels.length === 1 &&
  summary.unlocks.length === 1 &&
  summary.passive.farmCompleted.length === 1 &&
  summary.world.events.length === 1,
  'summary merges report arrays');
ok(SimulationReport.summarize(null).reportIds.length === 0,
  'summary tolerates missing input');

const overflowA = SimulationReport.create({
  source: 'offline',
  fromMs: 70000,
  toMs: 71000,
  requestedSeconds: Number.MAX_VALUE,
  actionKey: 'overflow',
  seedBefore: 10
});
const overflowB = SimulationReport.create({
  source: 'offline',
  fromMs: 71000,
  toMs: 72000,
  requestedSeconds: Number.MAX_VALUE,
  actionKey: 'overflow',
  seedBefore: 11
});
[overflowA, overflowB].forEach((report) => {
  report.mainActionSeconds = Number.MAX_VALUE;
  report.cappedSeconds = Number.MAX_VALUE;
  report.action.completed = Number.MAX_VALUE;
  report.gains.cultivation = Number.MAX_VALUE;
  report.passive.fishRecovered = Number.MAX_VALUE;
  report.world.ticks = Number.MAX_VALUE;
  report.gains.items.positive = Number.MAX_VALUE;
  report.gains.items.negative = -Number.MAX_VALUE;
  report.gains.items.cancel = report === overflowA
    ? Number.MAX_VALUE
    : -Number.MAX_VALUE;
  report.gains.skillXp.positive = Number.MAX_VALUE;
  report.gains.masteryXp.positive = Number.MAX_VALUE;
  report.costs.items.positive = Number.MAX_VALUE;
  report.costs.supplies.negative = -Number.MAX_VALUE;
});
overflowB.gains.items.nonFinite = Infinity;
overflowB.gains.skillXp.nonFinite = NaN;
const overflowSummary = SimulationReport.summarize([overflowA, overflowB]);
ok(overflowSummary.requestedSeconds === Number.MAX_VALUE &&
  overflowSummary.mainActionSeconds === Number.MAX_VALUE &&
  overflowSummary.cappedSeconds === Number.MAX_VALUE &&
  overflowSummary.action.completed === Number.MAX_VALUE &&
  overflowSummary.action.byKey.overflow === Number.MAX_VALUE,
  'summary saturates all top-level and action counters on positive overflow');
ok(overflowSummary.gains.cultivation === Number.MAX_VALUE &&
  overflowSummary.passive.fishRecovered === Number.MAX_VALUE &&
  overflowSummary.world.ticks === Number.MAX_VALUE,
  'summary saturates cultivation, passive and world counters');
ok(overflowSummary.gains.items.positive === Number.MAX_VALUE &&
  overflowSummary.gains.skillXp.positive === Number.MAX_VALUE &&
  overflowSummary.gains.masteryXp.positive === Number.MAX_VALUE &&
  overflowSummary.costs.items.positive === Number.MAX_VALUE,
  'summary saturates every positive numeric map');
ok(overflowSummary.gains.items.negative === -Number.MAX_VALUE &&
  overflowSummary.costs.supplies.negative === -Number.MAX_VALUE,
  'summary saturates negative numeric map overflow');
ok(overflowSummary.gains.items.cancel === 0 &&
  overflowSummary.gains.items.nonFinite === undefined &&
  overflowSummary.gains.skillXp.nonFinite === undefined &&
  allNumbersFinite(overflowSummary),
  'summary handles positive-negative cancellation and rejects non-finite input');

const specialKeys = SimulationReport.create({
  source: 'online',
  fromMs: 80000,
  toMs: 81000,
  requestedSeconds: 1,
  actionKey: '__proto__',
  seedBefore: 12
});
specialKeys.action.completed = 1;
SimulationReport.addCount(specialKeys, 'items', '__proto__', 2);
SimulationReport.addCount(specialKeys, 'items', 'constructor', 3);
SimulationReport.addCount(specialKeys, 'items', 'prototype', 4);
const constructorAction = SimulationReport.create({
  source: 'online',
  fromMs: 81000,
  toMs: 82000,
  requestedSeconds: 1,
  actionKey: 'constructor',
  seedBefore: 13
});
constructorAction.action.completed = 2;
const prototypeAction = SimulationReport.create({
  source: 'online',
  fromMs: 82000,
  toMs: 83000,
  requestedSeconds: 1,
  actionKey: 'prototype',
  seedBefore: 14
});
prototypeAction.action.completed = 3;
const specialSummary = SimulationReport.summarize([
  specialKeys,
  constructorAction,
  prototypeAction
]);
const specialRoundTrip = JSON.parse(JSON.stringify(specialSummary));
ok(Object.prototype.hasOwnProperty.call(specialSummary.gains.items, '__proto__') &&
  specialSummary.gains.items.__proto__ === 2 &&
  specialSummary.gains.items.constructor === 3 &&
  specialSummary.gains.items.prototype === 4,
  'numeric maps preserve prototype-shaped item keys');
ok(Object.prototype.hasOwnProperty.call(specialSummary.action.byKey, '__proto__') &&
  specialSummary.action.byKey.__proto__ === 1 &&
  specialSummary.action.byKey.constructor === 2 &&
  specialSummary.action.byKey.prototype === 3,
  'action summary preserves all prototype-shaped action keys');
ok(specialRoundTrip.gains.items.__proto__ === 2 &&
  specialRoundTrip.gains.items.constructor === 3 &&
  specialRoundTrip.action.byKey.__proto__ === 1 &&
  specialRoundTrip.action.byKey.constructor === 2 &&
  specialRoundTrip.action.byKey.prototype === 3,
  'special mapping keys survive JSON persistence');
ok(Object.getPrototypeOf(specialSummary.gains.items) === Object.prototype &&
  Object.getPrototypeOf(specialSummary.action.byKey) === Object.prototype &&
  Object.prototype.polluted === undefined &&
  ({}).polluted === undefined,
  'special mapping keys do not pollute or replace object prototypes');

function fixtureRules(events) {
  return {
    getAction(state) {
      return state.current
        ? { key: state.current.key, duration: 2 }
        : null;
    },
    nextBoundary(state, descriptor) {
      return Math.max(0, descriptor.duration - state.current.elapsed);
    },
    elapse(state, descriptor, seconds) {
      state.current.elapsed += seconds;
    },
    inspect(state) {
      return state.energy > 0
        ? { status: 'ready', reason: null }
        : { status: 'stop', reason: 'materials_exhausted' };
    },
    complete(state, descriptor, helpers) {
      if (events) events.push('action:' + helpers.nowMs());
      state.current.elapsed -= descriptor.duration;
      state.current.done++;
      state.energy--;
      state.reward = (state.reward || 0) +
        (helpers.random() < 0.5 ? 1 : 2);
      helpers.report.action.completed++;
      SimulationReport.addCount(
        helpers.report,
        'items',
        'fixtureReward',
        1
      );
      return {
        stopReason: state.energy <= 0
          ? 'materials_exhausted'
          : null
      };
    },
    random(state) {
      const next = GameRandom.next(state.rngState);
      state.rngState = next.seed;
      return next.value;
    }
  };
}

function fixtureLane(events) {
  return {
    id: 'parallel',
    nextBoundary(state) {
      return state.job
        ? Math.max(0, state.job.remainingSeconds)
        : Infinity;
    },
    elapse(state, seconds) {
      if (state.job) state.job.remainingSeconds -= seconds;
    },
    resolve(state, helpers) {
      if (state.job && state.job.remainingSeconds <= 1e-9) {
        if (events) events.push('lane:' + helpers.nowMs());
        helpers.report.passive.parallelCompleted.push(state.job.id);
        state.job = null;
      }
    }
  };
}

function fixtureState() {
  return {
    rngState: 123,
    energy: 3,
    reward: 0,
    current: {
      key: 'fixture',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0
    },
    job: { id: 'letter-1', remainingSeconds: 3 }
  };
}

const fixtureBase = fixtureState();
const fixtureBefore = JSON.stringify(fixtureBase);
const fixtureOnce = Simulation.advance(fixtureBase, 6, {
  source: 'offline',
  fromMs: 1000,
  mainActionLimitSeconds: 6,
  rules: fixtureRules(),
  lanes: [fixtureLane()]
});
ok(JSON.stringify(fixtureBase) === fixtureBefore,
  'advance does not mutate input model');
ok(fixtureOnce.state.current === null,
  'materials exhausted stops the action');
ok(fixtureOnce.report.action.stopReason === 'materials_exhausted' &&
  fixtureOnce.state.lastActionStop.reason === 'materials_exhausted' &&
  fixtureOnce.state.lastActionStop.atMs === 7000,
  'stop reason and deterministic stop time are persisted');
ok(fixtureOnce.report.passive.parallelCompleted[0] === 'letter-1',
  'parallel lane advances in the same call');
ok(fixtureOnce.report.mainActionSeconds === 6 &&
  fixtureOnce.report.action.completed === 3,
  'main action report records exact worked time and completions');

let fixtureChunkState = JSON.parse(fixtureBefore);
for (let fixtureIndex = 0; fixtureIndex < 24; fixtureIndex++) {
  const fixtureOut = Simulation.advance(fixtureChunkState, 0.25, {
    source: 'online',
    fromMs: 1000 + fixtureIndex * 250,
    mainActionLimitSeconds: null,
    rules: fixtureRules(),
    lanes: [fixtureLane()]
  });
  fixtureChunkState = fixtureOut.state;
}
ok(JSON.stringify(fixtureChunkState) === JSON.stringify(fixtureOnce.state),
  'chunked online and bulk offline reach identical state and RNG');

const fixtureCapped = Simulation.advance(fixtureState(), 60, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 2,
  rules: fixtureRules(),
  lanes: [fixtureLane()]
});
ok(fixtureCapped.report.mainActionSeconds === 2,
  'offline cap limits only main lane');
ok(fixtureCapped.report.cappedSeconds === 58,
  'offline cap is visible in report');
ok(fixtureCapped.report.passive.parallelCompleted.includes('letter-1'),
  'parallel lane uses full elapsed time beyond main cap');
ok(fixtureCapped.state.current &&
  fixtureCapped.state.current.done === 1 &&
  fixtureCapped.state.energy === 2,
  'offline cap keeps an unfinished main action active');

let zeroCalls = 0;
const zeroResult = Simulation.advance(fixtureState(), 0, {
  source: 'online',
  fromMs: 1000,
  mainActionLimitSeconds: null,
  rules: {
    getAction() { zeroCalls++; return null; },
    nextBoundary() { zeroCalls++; return Infinity; },
    elapse() { zeroCalls++; },
    inspect() { zeroCalls++; return { status: 'ready', reason: null }; },
    complete() { zeroCalls++; return { stopReason: null }; },
    random() { zeroCalls++; return 0; }
  },
  lanes: [{
    id: 'zero',
    nextBoundary() { zeroCalls++; return Infinity; },
    elapse() { zeroCalls++; },
    resolve() { zeroCalls++; }
  }]
});
ok(zeroCalls === 0 &&
  JSON.stringify(zeroResult.state) === JSON.stringify(fixtureState()) &&
  zeroResult.report.requestedSeconds === 0,
  'zero elapsed time is a pure clone with no rule or lane calls');

[-1, NaN, Infinity].forEach((badElapsed) => {
  const invalidInput = fixtureState();
  const invalidBefore = JSON.stringify(invalidInput);
  let invalidError = null;
  try {
    Simulation.advance(invalidInput, badElapsed, {
      source: 'online',
      fromMs: 0,
      mainActionLimitSeconds: null,
      rules: fixtureRules(),
      lanes: []
    });
  } catch (error) {
    invalidError = error;
  }
  ok(invalidError instanceof RangeError &&
    JSON.stringify(invalidInput) === invalidBefore,
    'negative and non-finite elapsed time is rejected without mutation');
});

const longElapsedSeconds = 48 * 60 * 60;
const longState = {
  rngState: 9,
  current: { key: 'long', elapsed: 0 },
  passiveElapsed: 0
};
const longResult = Simulation.advance(longState, longElapsedSeconds, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 12 * 60 * 60,
  rules: {
    getAction(state) {
      return state.current ? { key: 'long' } : null;
    },
    nextBoundary() { return Infinity; },
    elapse(state, descriptor, seconds) {
      state.current.elapsed += seconds;
    },
    inspect() { return { status: 'ready', reason: null }; },
    complete() { throw new Error('infinite boundary must not complete'); },
    random() { return 0; }
  },
  lanes: [{
    id: 'clock',
    nextBoundary() { return Infinity; },
    elapse(state, seconds) { state.passiveElapsed += seconds; },
    resolve() { throw new Error('infinite boundary must not resolve'); }
  }]
});
ok(longResult.state.current.elapsed === 12 * 60 * 60 &&
  longResult.state.passiveElapsed === longElapsedSeconds,
  '48-hour advance caps main work but preserves full passive reality time');
ok(longResult.report.mainActionSeconds === 12 * 60 * 60 &&
  longResult.report.cappedSeconds === 36 * 60 * 60,
  '48-hour report exposes exact main and capped seconds');

const laneOnlyOrder = [];
const laneOnlyState = {
  rngState: 1,
  current: null,
  first: 1,
  second: 1
};
function orderedLane(id, field) {
  return {
    id,
    nextBoundary(state) { return state[field] == null ? Infinity : state[field]; },
    elapse(state, seconds) {
      if (state[field] != null) state[field] -= seconds;
    },
    resolve(state) {
      if (state[field] <= 1e-9) {
        laneOnlyOrder.push(id);
        state[field] = null;
      }
    }
  };
}
const laneOnlyResult = Simulation.advance(laneOnlyState, 2, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: fixtureRules(),
  lanes: [
    orderedLane('first', 'first'),
    orderedLane('second', 'second')
  ]
});
ok(laneOnlyResult.state.current === null &&
  laneOnlyResult.state.first === null &&
  laneOnlyResult.state.second === null,
  'lane-only advance works when there is no main action');
ok(laneOnlyOrder.join(',') === 'first,second',
  'simultaneous lanes resolve in supplied array order');

const simultaneousOrder = [];
Simulation.advance({
  rngState: 123,
  energy: 1,
  reward: 0,
  current: {
    key: 'fixture',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0
  },
  job: { id: 'same-time', remainingSeconds: 2 }
}, 2, {
  source: 'online',
  fromMs: 500,
  mainActionLimitSeconds: null,
  rules: fixtureRules(simultaneousOrder),
  lanes: [fixtureLane(simultaneousOrder)]
});
ok(simultaneousOrder.join(',') === 'lane:2500,action:2500',
  'same-time passive lane resolves before the main action');

const waitingOrder = [];
const waitingState = {
  rngState: 123,
  energy: 1,
  reward: 0,
  awake: false,
  current: {
    key: 'fixture',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0
  },
  wakeRemaining: 1
};
const waitingRules = fixtureRules(waitingOrder);
waitingRules.inspect = function (state) {
  return state.awake
    ? { status: 'ready', reason: null }
    : { status: 'waiting', reason: null };
};
const waitingLane = {
  id: 'wake',
  nextBoundary(state) {
    return state.awake ? Infinity : Math.max(0, state.wakeRemaining);
  },
  elapse(state, seconds) {
    if (!state.awake) state.wakeRemaining -= seconds;
  },
  resolve(state, helpers) {
    if (!state.awake && state.wakeRemaining <= 1e-9) {
      waitingOrder.push('wake:' + helpers.nowMs());
      state.awake = true;
    }
  }
};
const waitingResult = Simulation.advance(waitingState, 3, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: waitingRules,
  lanes: [waitingLane]
});
ok(waitingResult.report.mainActionSeconds === 2 &&
  waitingResult.report.action.completed === 1,
  'waiting action does not advance until a passive lane makes it ready');
ok(waitingOrder.join(',') === 'wake:1000,action:3000',
  'waiting keeps the action and resumes after the lane boundary');

function expectBoundaryError(boundary, target, label) {
  let boundaryError = null;
  try {
    const invalidBoundaryState = {
      rngState: 1,
      current: target === 'action' ? { key: 'bad', elapsed: 0 } : null
    };
    Simulation.advance(invalidBoundaryState, 1, {
      source: 'online',
      fromMs: 0,
      mainActionLimitSeconds: null,
      rules: {
        getAction(state) {
          return state.current ? { key: 'bad' } : null;
        },
        nextBoundary() {
          return target === 'action' ? boundary : Infinity;
        },
        elapse() {},
        inspect() { return { status: 'ready', reason: null }; },
        complete() { return { stopReason: null }; },
        random() { return 0; }
      },
      lanes: target === 'lane' ? [{
        id: 'bad-lane',
        nextBoundary() { return boundary; },
        elapse() {},
        resolve() {}
      }] : []
    });
  } catch (error) {
    boundaryError = error;
  }
  ok(boundaryError instanceof RangeError, label);
}
expectBoundaryError(NaN, 'action',
  'NaN main-action boundary is rejected explicitly');
expectBoundaryError(-1, 'action',
  'negative main-action boundary is rejected explicitly');
expectBoundaryError(NaN, 'lane',
  'NaN lane boundary is rejected explicitly');
expectBoundaryError(-1, 'lane',
  'negative lane boundary is rejected explicitly');

const resolverInput = {
  rngState: 1,
  current: null,
  remaining: 0
};
const resolverBefore = JSON.stringify(resolverInput);
const resolverFailure = new Error('resolver failed');
let resolverCaught = null;
try {
  Simulation.advance(resolverInput, 1, {
    source: 'online',
    fromMs: 0,
    mainActionLimitSeconds: null,
    rules: fixtureRules(),
    lanes: [{
      id: 'throws',
      nextBoundary() { return 0; },
      elapse() {},
      resolve() { throw resolverFailure; }
    }]
  });
} catch (error) {
  resolverCaught = error;
}
ok(resolverCaught === resolverFailure &&
  JSON.stringify(resolverInput) === resolverBefore,
  'resolver exceptions propagate while the caller input stays unchanged');

const stalledResult = Simulation.advance({
  rngState: 1,
  current: { key: 'stalled', elapsed: 0 },
  passiveElapsed: 0
}, 2, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: {
    getAction(state) { return state.current ? { key: 'stalled' } : null; },
    nextBoundary() { return 0; },
    elapse() {},
    inspect() { return { status: 'ready', reason: null }; },
    complete() { return { stopReason: null }; },
    random() { return 0; }
  },
  lanes: [{
    id: 'stalled-lane',
    nextBoundary() { return 0; },
    elapse(state, seconds) { state.passiveElapsed += seconds; },
    resolve() {}
  }]
});
ok(stalledResult.state.current === null &&
  stalledResult.state.lastActionStop.reason === 'simulation_guard' &&
  stalledResult.report.warnings.includes('simulation_guard'),
  'zero-boundary resolvers without state progress trip the simulation guard');
ok(stalledResult.state.passiveElapsed === 2,
  'zero-boundary guard continues passive elapsed time to the endpoint');

const guardResult = Simulation.advance({
  rngState: 1,
  current: { key: 'long', elapsed: 0 },
  pulse: { remaining: 1, count: 0 }
}, 10, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  transitionLimit: 2,
  rules: {
    getAction(state) { return state.current ? { key: 'long' } : null; },
    nextBoundary() { return Infinity; },
    elapse(state, descriptor, seconds) {
      state.current.elapsed += seconds;
    },
    inspect() { return { status: 'ready', reason: null }; },
    complete() { return { stopReason: null }; },
    random() { return 0; }
  },
  lanes: [{
    id: 'pulse',
    nextBoundary(state) { return state.pulse.remaining; },
    elapse(state, seconds) { state.pulse.remaining -= seconds; },
    resolve(state) {
      state.pulse.count++;
      state.pulse.remaining = 1;
    }
  }]
});
ok(guardResult.report.warnings.includes('simulation_guard') &&
  guardResult.state.current === null &&
  guardResult.state.lastActionStop.reason === 'simulation_guard',
  'injectable transition limit exercises the million-transition guard');

function decimalRules() {
  return {
    getAction(state) {
      return state.current ? { key: 'decimal', duration: 0.3 } : null;
    },
    nextBoundary(state, descriptor) {
      return Math.max(0, descriptor.duration - state.current.elapsed);
    },
    elapse(state, descriptor, seconds) {
      state.current.elapsed += seconds;
    },
    inspect() { return { status: 'ready', reason: null }; },
    complete(state, descriptor) {
      state.current.elapsed -= descriptor.duration;
      state.current.done++;
      state.current = null;
      return { stopReason: null };
    },
    random() { return 0; }
  };
}
const decimalBase = {
  rngState: 1,
  current: { key: 'decimal', elapsed: 0, done: 0 }
};
const decimalBulk = Simulation.advance(decimalBase, 0.3, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: decimalRules(),
  lanes: []
});
let decimalChunk = JSON.parse(JSON.stringify(decimalBase));
for (let decimalIndex = 0; decimalIndex < 3; decimalIndex++) {
  decimalChunk = Simulation.advance(decimalChunk, 0.1, {
    source: 'online',
    fromMs: decimalIndex * 100,
    mainActionLimitSeconds: null,
    rules: decimalRules(),
    lanes: []
  }).state;
}
ok(JSON.stringify(decimalChunk) === JSON.stringify(decimalBulk.state),
  'floating-point boundary epsilon keeps chunked and bulk state identical');

let earlyActionCompletions = 0;
let earlyLaneResolutions = 0;
const earlyBoundaryResult = Simulation.advance({
  rngState: 1,
  current: { key: 'not-yet', elapsed: 0 },
  laneRemaining: 1.0000000005
}, 1, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 1,
  rules: {
    getAction(state) {
      return state.current ? { key: 'not-yet', duration: 1.0000000005 } : null;
    },
    nextBoundary(state, descriptor) {
      return descriptor.duration - state.current.elapsed;
    },
    elapse(state, descriptor, seconds) {
      state.current.elapsed += seconds;
    },
    inspect() { return { status: 'ready', reason: null }; },
    complete() {
      earlyActionCompletions++;
      return { stopReason: null };
    },
    random() { return 0; }
  },
  lanes: [{
    id: 'not-yet',
    nextBoundary(state) { return state.laneRemaining; },
    elapse(state, seconds) { state.laneRemaining -= seconds; },
    resolve() { earlyLaneResolutions++; }
  }]
});
ok(earlyActionCompletions === 0 &&
  earlyLaneResolutions === 0 &&
  earlyBoundaryResult.state.current.elapsed === 1,
  'remaining time and main cap never resolve a boundary five-tenths ns early');
ok(earlyBoundaryResult.state.laneRemaining > 0 &&
  earlyBoundaryResult.state.laneRemaining < 1e-9,
  'sub-nanosecond unfinished lane remainder is preserved, not resolved');

function repeatingDecimalRules(duration) {
  return {
    getAction(state) {
      return state.current ? { key: 'repeat-decimal', duration } : null;
    },
    nextBoundary(state, descriptor) {
      return Math.max(0, descriptor.duration - state.current.elapsed);
    },
    elapse(state, descriptor, seconds) {
      state.current.elapsed += seconds;
    },
    inspect() { return { status: 'ready', reason: null }; },
    complete(state, descriptor, helpers) {
      state.current.elapsed -= descriptor.duration;
      state.current.done++;
      helpers.report.action.completed++;
      return { stopReason: null };
    },
    random() { return 0; }
  };
}

function compareDecimalSchedules(duration, total, chunk) {
  const initial = {
    rngState: 1,
    current: {
      key: 'repeat-decimal',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0
    }
  };
  const bulk = Simulation.advance(initial, total, {
    source: 'online',
    fromMs: 0,
    mainActionLimitSeconds: null,
    rules: repeatingDecimalRules(duration),
    lanes: []
  }).state;
  let chunked = JSON.parse(JSON.stringify(initial));
  const count = Math.round(total / chunk);
  for (let index = 0; index < count; index++) {
    chunked = Simulation.advance(chunked, chunk, {
      source: 'online',
      fromMs: index * chunk * 1000,
      mainActionLimitSeconds: null,
      rules: repeatingDecimalRules(duration),
      lanes: []
    }).state;
  }
  return { bulk, chunked };
}

[
  { duration: 0.3, total: 3, chunk: 0.1 },
  { duration: 0.2, total: 2, chunk: 0.1 },
  { duration: 0.1, total: 2, chunk: 0.2 }
].forEach((decimalCase) => {
  const compared = compareDecimalSchedules(
    decimalCase.duration,
    decimalCase.total,
    decimalCase.chunk
  );
  ok(JSON.stringify(compared.bulk) === JSON.stringify(compared.chunked),
    'repeat decimal schedule stays JSON-identical for duration ' +
      decimalCase.duration + ' and chunk ' + decimalCase.chunk);
});

const preciseEconomyValue = 0.12345678901234566;
const preciseEconomyResult = Simulation.advance({
  rngState: 1,
  current: { key: 'precise-economy', elapsed: 0 },
  futureEconomy: preciseEconomyValue
}, 1, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: {
    getAction(state) {
      return state.current ? { key: state.current.key } : null;
    },
    nextBoundary() { return 0; },
    elapse() {},
    inspect() { return { status: 'ready', reason: null }; },
    complete(state) {
      state.reward = preciseEconomyValue;
      state.current = null;
      return { stopReason: null };
    },
    random() { return 0; }
  },
  lanes: []
});
ok(preciseEconomyResult.state.futureEconomy === preciseEconomyValue &&
  preciseEconomyResult.state.reward === preciseEconomyValue,
  'time canonicalization never rounds future or economic state numbers');

let fineZeroResolved = 0;
let fineBoundaryResolved = 0;
const fineElapsedSeconds = 1e-12;
const fineTimingResult = Simulation.advance({
  rngState: 1,
  current: null,
  zeroDone: false,
  fineRemaining: 4e-13,
  fineElapsed: 0,
  futureTimer: 4e-13
}, fineElapsedSeconds, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: fixtureRules(),
  lanes: [{
    id: 'zero-first',
    nextBoundary(state) {
      return state.zeroDone ? Infinity : 0;
    },
    elapse() {},
    resolve(state) {
      fineZeroResolved++;
      state.zeroDone = true;
    }
  }, {
    id: 'fine-time',
    nextBoundary(state) {
      return fineBoundaryResolved === 0 ? state.fineRemaining : Infinity;
    },
    elapse(state, seconds) {
      state.fineElapsed += seconds;
      if (fineBoundaryResolved === 0) state.fineRemaining -= seconds;
    },
    resolve(state) {
      fineBoundaryResolved++;
      state.fineRemaining = null;
    }
  }]
});
const fineTimingTolerance = 4 * Number.EPSILON;
ok(fineZeroResolved === 1 && fineBoundaryResolved === 1,
  'zero boundary then legal sub-picosecond boundary both resolve once');
ok(fineTimingResult.state.fineElapsed <=
  fineElapsedSeconds + fineTimingTolerance &&
  Math.abs(fineTimingResult.state.fineElapsed - fineElapsedSeconds) <=
    fineTimingTolerance,
  'lane elapse total never exceeds requested time beyond machine error');
ok(fineTimingResult.state.futureTimer === 4e-13,
  'legal future sub-picosecond time is never rounded or deleted');

let femtoBoundaryResolved = 0;
const femtoResult = Simulation.advance({
  rngState: 1,
  current: null,
  femtoRemaining: 6e-16,
  laneAElapsed: 0,
  laneBElapsed: 0
}, 1e-15, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: fixtureRules(),
  lanes: [{
    id: 'femto-boundary',
    nextBoundary(state) {
      return femtoBoundaryResolved === 0
        ? state.femtoRemaining
        : Infinity;
    },
    elapse(state, seconds) {
      state.laneAElapsed += seconds;
      if (femtoBoundaryResolved === 0) state.femtoRemaining -= seconds;
    },
    resolve(state) {
      femtoBoundaryResolved++;
      state.femtoRemaining = null;
    }
  }, {
    id: 'femto-observer',
    nextBoundary() { return Infinity; },
    elapse(state, seconds) { state.laneBElapsed += seconds; },
    resolve() {}
  }]
});
ok(femtoBoundaryResolved === 1 &&
  Math.abs(femtoResult.state.laneAElapsed - 1e-15) <= Number.MIN_VALUE &&
  Math.abs(femtoResult.state.laneBElapsed - 1e-15) <= Number.MIN_VALUE,
  'two lanes advance the full 1e-15 around a legal 6e-16 boundary');

let subnormalResolved = 0;
const subnormalElapsed = Number.MIN_VALUE * 2;
const subnormalResult = Simulation.advance({
  rngState: 1,
  current: null,
  subnormalRemaining: Number.MIN_VALUE,
  subnormalObserved: 0
}, subnormalElapsed, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: fixtureRules(),
  lanes: [{
    id: 'subnormal-boundary',
    nextBoundary(state) {
      return subnormalResolved === 0
        ? state.subnormalRemaining
        : Infinity;
    },
    elapse(state, seconds) {
      if (subnormalResolved === 0) state.subnormalRemaining -= seconds;
    },
    resolve(state) {
      subnormalResolved++;
      state.subnormalRemaining = null;
    }
  }, {
    id: 'subnormal-observer',
    nextBoundary() { return Infinity; },
    elapse(state, seconds) { state.subnormalObserved += seconds; },
    resolve() {}
  }]
});
ok(subnormalResolved === 1 &&
  subnormalResult.state.subnormalObserved === subnormalElapsed,
  'zero tolerance underflow does not swallow a legal subnormal remainder');

function runFloorSchedule(elapsed, boundaries) {
  const events = [];
  let elapseCalls = 0;
  const state = {
    rngState: 1,
    current: null,
    observed: 0,
    jobs: boundaries.map((entry) => ({
      id: entry.id,
      remaining: entry.seconds,
      done: false
    }))
  };
  const lanes = boundaries.map((entry, index) => ({
    id: entry.id,
    nextBoundary(model) {
      return model.jobs[index].done
        ? Infinity
        : model.jobs[index].remaining;
    },
    elapse(model, seconds) {
      elapseCalls++;
      if (!model.jobs[index].done) {
        model.jobs[index].remaining -= seconds;
      }
    },
    resolve(model) {
      events.push(entry.id);
      model.jobs[index].done = true;
      model.jobs[index].remaining = null;
    }
  }));
  lanes.push({
    id: 'floor-observer',
    nextBoundary() { return Infinity; },
    elapse(model, seconds) {
      elapseCalls++;
      model.observed += seconds;
    },
    resolve() {}
  });
  const output = Simulation.advance(state, elapsed, {
    source: 'online',
    fromMs: 0,
    mainActionLimitSeconds: null,
    rules: fixtureRules(),
    lanes
  });
  return { output, events, elapseCalls };
}

const unitFloorSchedule = runFloorSchedule(1, [
  { id: 'after-min', seconds: Number.MIN_VALUE },
  { id: 'tiny-a', seconds: 1e-20 },
  { id: 'tiny-b', seconds: 1e-20 }
]);
ok(unitFloorSchedule.events.join(',') === 'after-min,tiny-a,tiny-b' &&
  unitFloorSchedule.output.state.observed <= 1 &&
  unitFloorSchedule.output.state.observed === 1 &&
  unitFloorSchedule.elapseCalls < 256,
  'rounded account after MIN and 1e-20 boundaries stays finite and complete');

const offlineFloorSchedule = runFloorSchedule(172800, [
  { id: 'offline-min', seconds: Number.MIN_VALUE }
]);
ok(offlineFloorSchedule.events.join(',') === 'offline-min' &&
  offlineFloorSchedule.output.state.observed <= 172800 &&
  offlineFloorSchedule.output.state.observed === 172800 &&
  offlineFloorSchedule.elapseCalls < 256,
  '172800-second account after MIN boundary never rounds above its remainder');

const hugeFloorSchedule = runFloorSchedule(1e100, [
  { id: 'huge-tiny', seconds: 1e-100 }
]);
ok(hugeFloorSchedule.events.join(',') === 'huge-tiny' &&
  hugeFloorSchedule.output.state.observed <= 1e100 &&
  hugeFloorSchedule.output.state.observed === 1e100 &&
  hugeFloorSchedule.elapseCalls < 256,
  '1e100 account after 1e-100 boundary finishes without overshoot or looping');

let tinyRandomCalls = 0;
const tinyCapResult = Simulation.advance({
  rngState: 1,
  current: { key: 'tiny-cap', elapsed: 0 },
  reward: preciseEconomyValue
}, 1e-12, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 4e-13,
  rules: {
    getAction(state) {
      return state.current ? { key: state.current.key, duration: 8e-13 } : null;
    },
    nextBoundary(state, descriptor) {
      return descriptor.duration - state.current.elapsed;
    },
    elapse(state, descriptor, seconds) {
      state.current.elapsed += seconds;
    },
    inspect() { return { status: 'ready', reason: null }; },
    complete(state, descriptor, helpers) {
      tinyRandomCalls++;
      state.reward += helpers.random();
      state.current = null;
      return { stopReason: null };
    },
    random() {
      tinyRandomCalls++;
      return 0.5;
    }
  },
  lanes: []
});
ok(tinyCapResult.state.current &&
  tinyCapResult.state.current.elapsed === 4e-13 &&
  tinyCapResult.report.mainActionSeconds === 4e-13,
  'legal 4e-13 main cap is preserved as actual worked time');
ok(tinyRandomCalls === 0 &&
  tinyCapResult.state.reward === preciseEconomyValue,
  'tiny cap below boundary never completes or advances random economy');

let ulpBoundaryCompletions = 0;
let ulpBoundaryRandomCalls = 0;
const ulpBoundaryResult = Simulation.advance({
  rngState: 1,
  current: { key: 'ulp-future', elapsed: 0 },
  reward: 0
}, 1, {
  source: 'offline',
  fromMs: 0,
  mainActionLimitSeconds: 1,
  rules: {
    getAction(state) {
      return state.current
        ? { key: state.current.key, duration: 1.0000000000000004 }
        : null;
    },
    nextBoundary(state, descriptor) {
      return descriptor.duration - state.current.elapsed;
    },
    elapse(state, descriptor, seconds) {
      state.current.elapsed += seconds;
    },
    inspect() { return { status: 'ready', reason: null }; },
    complete(state, descriptor, helpers) {
      ulpBoundaryCompletions++;
      state.reward += helpers.random();
      state.current = null;
      return { stopReason: null };
    },
    random() {
      ulpBoundaryRandomCalls++;
      return 0.5;
    }
  },
  lanes: []
});
ok(ulpBoundaryCompletions === 0 &&
  ulpBoundaryRandomCalls === 0 &&
  ulpBoundaryResult.state.current &&
  ulpBoundaryResult.state.current.elapsed === 1,
  'boundary one ulp beyond actual step and cap never completes or randomizes');

let switchedGetCallsFirst = 0;
const switchedFirst = Simulation.advance({
  rngState: 1,
  current: { key: 'A', elapsed: 0 },
  passiveElapsed: 0
}, 2, {
  source: 'online',
  fromMs: 4000,
  mainActionLimitSeconds: null,
  rules: {
    getAction(state) {
      switchedGetCallsFirst++;
      return state.current ? { key: state.current.key } : null;
    },
    nextBoundary() { return 0; },
    elapse() {},
    inspect(state, descriptor) {
      return { status: 'ready', reason: null };
    },
    complete(state, descriptor, helpers) {
      helpers.report.action.completed++;
      state.current = { key: 'B', elapsed: 0 };
      helpers.stopCurrent('resource_depleted', helpers.nowMs());
      return { stopReason: null };
    },
    random() { return 0; }
  },
  lanes: [{
    id: 'switched-clock',
    nextBoundary() { return Infinity; },
    elapse(state, seconds) { state.passiveElapsed += seconds; },
    resolve() {}
  }]
});
ok(switchedFirst.report.action.key === 'A' &&
  switchedFirst.report.action.completed === 1 &&
  switchedFirst.report.action.stopReason === null,
  'first report remains exclusively attributed to completed action A');
ok(switchedFirst.state.current &&
  switchedFirst.state.current.key === 'B' &&
  switchedFirst.state.passiveElapsed === 2 &&
  switchedGetCallsFirst === 2,
  'switch to B pauses the main lane while passive time finishes');

let switchedGetCallsSecond = 0;
const switchedSecond = Simulation.advance(switchedFirst.state, 1, {
  source: 'online',
  fromMs: 6000,
  mainActionLimitSeconds: null,
  rules: {
    getAction(state) {
      switchedGetCallsSecond++;
      return state.current
        ? { key: state.current.key }
        : { key: 'invalid-after-stop' };
    },
    nextBoundary() { return Infinity; },
    elapse() {},
    inspect() {
      return { status: 'stop', reason: 'resource_depleted' };
    },
    complete() { return { stopReason: null }; },
    random() { return 0; }
  },
  lanes: [{
    id: 'second-clock',
    nextBoundary() { return Infinity; },
    elapse(state, seconds) { state.passiveElapsed += seconds; },
    resolve() {}
  }]
});
ok(switchedSecond.report.action.key === 'B' &&
  switchedSecond.report.action.completed === 0 &&
  switchedSecond.report.action.stopReason === 'resource_depleted' &&
  switchedSecond.report.action.stopAtMs === 6000,
  'next advance gives stopped action B its own report');
ok(switchedSecond.state.lastActionStop.key === 'B' &&
  switchedSecond.state.lastActionStop.reason === 'resource_depleted' &&
  switchedSecond.state.lastActionStop.atMs === 6000,
  'next advance writes B-only lastActionStop metadata');
ok(switchedSecond.report.warnings.includes('simulation_guard') &&
  switchedGetCallsSecond < 10 &&
  switchedSecond.state.passiveElapsed === 3,
  'orphan descriptor after B stop guards quickly and passive time continues');
const switchedSummary = SimulationReport.summarize([
  switchedFirst.report,
  switchedSecond.report
]);
ok(switchedSummary.action.completed === 1 &&
  switchedSummary.action.byKey.A === 1 &&
  switchedSummary.action.byKey.B === 0,
  'summary attributes A completion to A and never to stopped B');

let stopLimitLaneResolves = 0;
const stopLimitResult = Simulation.advance({
  rngState: 1,
  current: { key: 'blocked', elapsed: 0 },
  passiveElapsed: 0
}, 1, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  transitionLimit: 1,
  rules: {
    getAction(state) {
      return state.current ? { key: state.current.key } : null;
    },
    nextBoundary() { return Infinity; },
    elapse() {},
    inspect() {
      return { status: 'stop', reason: 'requirements_invalid' };
    },
    complete() { return { stopReason: null }; },
    random() { return 0; }
  },
  lanes: [{
    id: 'zero-after-stop',
    nextBoundary() { return 0; },
    elapse(state, seconds) { state.passiveElapsed += seconds; },
    resolve() { stopLimitLaneResolves++; }
  }]
});
ok(stopLimitResult.report.action.stopReason === 'requirements_invalid' &&
  stopLimitResult.report.warnings.includes('simulation_guard') &&
  stopLimitLaneResolves === 0,
  'inspect stop consumes a transition before the next zero lane boundary');
ok(stopLimitResult.state.passiveElapsed === 1,
  'transition guard after inspect stop still advances passive reality time');

const prototypeInput = Object.create({ inherited: 'must-not-copy' });
prototypeInput.rngState = 1;
prototypeInput.current = null;
prototypeInput.future = Object.create(null);
prototypeInput.future.enabled = true;
Object.defineProperty(prototypeInput.future, '__proto__', {
  value: { safe: true },
  enumerable: true,
  configurable: true,
  writable: true
});
const prototypeResult = Simulation.advance(prototypeInput, 1, {
  source: 'online',
  fromMs: 0,
  mainActionLimitSeconds: null,
  rules: fixtureRules(),
  lanes: []
});
const prototypeRoundTrip = JSON.parse(JSON.stringify(prototypeResult.state));
ok(prototypeResult.state.future.enabled === true &&
  prototypeResult.state.future.__proto__.safe === true &&
  !Object.prototype.hasOwnProperty.call(prototypeResult.state, 'inherited'),
  'JSON clone preserves own future fields and ignores inherited prototype data');
ok(prototypeRoundTrip.future.__proto__.safe === true &&
  Object.prototype.polluted === undefined,
  'special prototype-shaped data stays JSON-safe without pollution');

let unsafeModelError = null;
try {
  Simulation.advance({
    rngState: 1,
    current: null,
    future: { invalid: Infinity }
  }, 1, {
    source: 'online',
    fromMs: 0,
    mainActionLimitSeconds: null,
    rules: fixtureRules(),
    lanes: []
  });
} catch (error) {
  unsafeModelError = error;
}
ok(unsafeModelError instanceof TypeError,
  'non-JSON-safe model fields are rejected instead of silently deleted');

const browserCode = fs.readFileSync(
  path.join(__dirname, '..', 'core', 'simulation-report.js'),
  'utf8'
);
const browserSandbox = {};
browserSandbox.globalThis = browserSandbox;
vm.runInNewContext(browserCode, browserSandbox, {
  filename: 'simulation-report.js'
});
ok(typeof browserSandbox.SimulationReport.create === 'function',
  'SimulationReport attaches to browser global');
ok(browserSandbox.SimulationReport.STOP_REASONS.DEFEATED === 'defeated',
  'browser global exposes the same stable stop reasons');
[
  'content/herblore-parity.js',
  'content/materials.js',
  'content/items.js',
  'content/life-skills.js',
  'content/gathering.js',
  'content/recipes.js',
  'content/homestead.js',
  'core/stage2-state.js',
  'core/random.js',
  'core/save-system.js',
  'core/state-model.js',
  'core/simulation.js',
  'core/game-rules.js'
].forEach((file) => {
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    browserSandbox,
    { filename: file }
  );
});
ok(typeof browserSandbox.StateModel.normalize === 'function',
  'StateModel attaches to browser global with browser dependencies');
ok(browserSandbox.StateModel.normalize({}, 1).modelVersion === 1,
  'browser StateModel exposes the canonical model version');
ok(browserSandbox.StateModel.normalize({
  player: { name: '嵌入上下文角色' }
}, 1).player.name === '嵌入上下文角色',
  'browser StateModel accepts plain records from its embedding context');
const crossVmGathering = browserSandbox.StateModel.normalize({
  player: {
    spots: {
      herb: { id: 'parityHerb1', cap: 5, left: 2 }
    },
    fishing: { pond: 3 }
  },
  systems: {
    gathering: {
      spots: {
        mining: {
          instanceId: 'spot-2',
          skillId: 'mining',
          entryId: 'copper',
          capacity: 4,
          remaining: 3
        }
      },
      fishStocks: { spiritCarp: 4 },
      fishRecoverAcc: 0
    }
  }
}, 1);
ok(
  crossVmGathering.systems.gathering.spots.herb[0].entryId ===
    'parityHerb1' &&
  crossVmGathering.systems.gathering.spots.mining[0].entryId ===
    'copper' &&
  crossVmGathering.systems.gathering.fishStocks.spiritCarp === 4 &&
  !('quality' in crossVmGathering.systems.gathering.spots.mining[0]),
  'browser StateModel merges cross-context gathering records'
);
ok(typeof browserSandbox.Simulation.advance === 'function',
  'Simulation attaches to browser global');
ok(typeof browserSandbox.GameRules.create === 'function',
  'GameRules attaches to browser global after simulation foundations');

function matrixAdvance(
  state,
  seconds,
  source,
  fromMs,
  mainActionLimitSeconds,
  ruleSet
) {
  const selectedRules = ruleSet || gameRules;
  return Simulation.advance(state, seconds, {
    source,
    fromMs,
    mainActionLimitSeconds,
    rules: selectedRules.rules,
    lanes: selectedRules.lanes
  });
}

function matrixChunkedState(initial, totalSeconds, chunkSeconds) {
  let state = JSON.parse(JSON.stringify(initial));
  const chunks = totalSeconds / chunkSeconds;
  for (let index = 0; index < chunks; index++) {
    state = matrixAdvance(
      state,
      chunkSeconds,
      'online',
      index * chunkSeconds * 1000,
      null
    ).state;
  }
  return state;
}

function matrixState(totalSeconds, chunkSeconds, label) {
  const initial = makeRuleState({
    player: makeRulePlayer({ stacks: { herb: 10000 }, mood: 100 }),
    rngState: 246813579
  });
  const online = matrixChunkedState(initial, totalSeconds, chunkSeconds);
  const offline = matrixAdvance(
    initial,
    totalSeconds,
    'offline',
    0,
    totalSeconds
  ).state;
  ok(JSON.stringify(online) === JSON.stringify(offline), label);
}

matrixState(
  100,
  0.25,
  '400 × 0.25-second online and 100-second offline states are JSON-identical'
);
matrixState(
  3600,
  1,
  '3600 × 1-second online and 3600-second offline states are JSON-identical'
);

const lifespanPartitionContent = makeRuleContent();
lifespanPartitionContent.constants.yearSeconds = 1800;
const lifespanPartitionRules = GameRules.create(lifespanPartitionContent);
const lifespanPartitionRuntime = {
  rules: lifespanPartitionRules.rules,
  lanes: lifespanPartitionRules.lanes.filter((lane) => lane.id === 'lifespan')
};
const lifespanPartitionInitial = stage4SimulationFixture(
  StateModel.normalize(makeRuleState({
    player: makeRulePlayer({ mood: 100, shouyuan: 100, shouMax: 100 }),
    current: null
  }), 0)
);
const lifespanSingleSecond = matrixAdvance(
  lifespanPartitionInitial,
  1,
  'online',
  0,
  null,
  lifespanPartitionRuntime
).state;
let lifespanSixtyFrames = JSON.parse(JSON.stringify(lifespanPartitionInitial));
for (let frame = 0; frame < 60; frame++) {
  lifespanSixtyFrames = matrixAdvance(
    lifespanSixtyFrames,
    1 / 60,
    'online',
    frame * (1000 / 60),
    null,
    lifespanPartitionRuntime
  ).state;
}
ok(
  JSON.stringify(lifespanSingleSecond) === JSON.stringify(lifespanSixtyFrames),
  'one second and 60 × 1/60-second lifespan advances are JSON-identical'
);
const lifespanHalfSecond = matrixAdvance(
  lifespanPartitionInitial,
  0.5,
  'online',
  0,
  null,
  lifespanPartitionRuntime
).state;
const lifespanSavedHalf = SaveSystem.createSnapshot(
  StateModel.toSnapshotInput(lifespanHalfSecond),
  500
);
const lifespanReloadedHalf = SaveSystem.load({
  load(key) {
    return key === SaveSystem.SNAPSHOT_KEY ? lifespanSavedHalf : null;
  }
}, 500).snapshot;
const lifespanResumedSecond = matrixAdvance(
  StateModel.normalize(lifespanReloadedHalf, 500),
  0.5,
  'online',
  500,
  null,
  lifespanPartitionRuntime
).state;
ok(
  lifespanReloadedHalf.player.lifespanAnchorMs === 0 &&
    lifespanReloadedHalf.player.lifespanBaseYears === 100 &&
    JSON.stringify(lifespanResumedSecond) ===
      JSON.stringify(lifespanSingleSecond),
  'lifespan anchor and base survive save/load continuation without decay drift'
);
const lifespanExternalIncreaseStart = matrixAdvance(
  lifespanPartitionInitial,
  1,
  'online',
  0,
  null,
  lifespanPartitionRuntime
).state;
lifespanExternalIncreaseStart.player.shouyuan += 10;
const lifespanExternalIncreaseSingle = matrixAdvance(
  lifespanExternalIncreaseStart,
  1,
  'online',
  1000,
  null,
  lifespanPartitionRuntime
).state;
const lifespanExpectedAfterIncrease = 110 - 2 / 1800;
ok(
  Math.abs(
    lifespanExternalIncreaseSingle.player.shouyuan -
      lifespanExpectedAfterIncrease
  ) <= Number.EPSILON * 32 * lifespanExpectedAfterIncrease &&
    lifespanExternalIncreaseSingle.player.lifespanAnchorMs === 1000 &&
    Math.abs(
      lifespanExternalIncreaseSingle.player.lifespanBaseYears -
        (110 - 1 / 1800)
    ) <= Number.EPSILON * 32 * lifespanExpectedAfterIncrease,
  'lifespan lane self-rebases a direct increase without hidden-field writes'
);
const lifespanExternalDecreaseStart = matrixAdvance(
  lifespanPartitionInitial,
  1,
  'online',
  0,
  null,
  lifespanPartitionRuntime
).state;
lifespanExternalDecreaseStart.player.shouyuan -= 10;
const lifespanExternalDecrease = matrixAdvance(
  lifespanExternalDecreaseStart,
  1,
  'online',
  1000,
  null,
  lifespanPartitionRuntime
).state;
ok(
  Math.abs(lifespanExternalDecrease.player.shouyuan - (90 - 2 / 1800)) <=
    Number.EPSILON * 32 * 90 &&
    lifespanExternalDecrease.player.lifespanAnchorMs === 1000,
  'lifespan lane self-rebases a direct decrease without hidden-field writes'
);
let lifespanExternalIncreaseFrames = JSON.parse(
  JSON.stringify(lifespanExternalIncreaseStart)
);
for (let frame = 0; frame < 60; frame++) {
  lifespanExternalIncreaseFrames = matrixAdvance(
    lifespanExternalIncreaseFrames,
    1 / 60,
    'online',
    1000 + frame * (1000 / 60),
    null,
    lifespanPartitionRuntime
  ).state;
}
const lifespanExternalIncreaseHalf = matrixAdvance(
  lifespanExternalIncreaseStart,
  0.5,
  'online',
  1000,
  null,
  lifespanPartitionRuntime
).state;
const lifespanExternalIncreaseSaved = SaveSystem.createSnapshot(
  StateModel.toSnapshotInput(lifespanExternalIncreaseHalf),
  1500
);
const lifespanExternalIncreaseReloaded = SaveSystem.load({
  load(key) {
    return key === SaveSystem.SNAPSHOT_KEY
      ? lifespanExternalIncreaseSaved
      : null;
  }
}, 1500).snapshot;
const lifespanExternalIncreaseResumed = matrixAdvance(
  StateModel.normalize(lifespanExternalIncreaseReloaded, 1500),
  0.5,
  'online',
  1500,
  null,
  lifespanPartitionRuntime
).state;
ok(
  JSON.stringify(lifespanExternalIncreaseFrames) ===
    JSON.stringify(lifespanExternalIncreaseSingle) &&
    JSON.stringify(lifespanExternalIncreaseResumed) ===
      JSON.stringify(lifespanExternalIncreaseSingle),
  'self-rebased lifespan remains chunk- and save/load-invariant'
);
const lifespanBufferState = matrixAdvance(makeRuleState({
  player: makeRulePlayer({
    mood: 100,
    stacks: { herb: 1000 },
    shouyuan: 2,
    shouMax: 2
  })
}), 1800, 'offline', 0, 1800, lifespanPartitionRules);
ok(
  lifespanBufferState.state.player.shouyuan === 1 &&
    lifespanBufferState.state.player.lifespanAnchorMs === 0 &&
    lifespanBufferState.state.player.lifespanBaseYears === 2 &&
    lifespanBufferState.report.action.stopReason === 'lifespan_buffer',
  'lifespan anchor stops a finite player exactly at the one-year buffer'
);
const anchoredImmortal = matrixAdvance(makeRuleState({
  player: makeRulePlayer({ mood: 100, shouyuan: null, shouMax: null }),
  current: null
}), 1, 'online', 0, null, lifespanPartitionRuntime).state;
ok(
  anchoredImmortal.player.shouyuan === null &&
    anchoredImmortal.player.lifespanAnchorMs === null &&
    anchoredImmortal.player.lifespanBaseYears === null,
  'infinite lifespan remains null without a persisted decay anchor'
);

const twentyHourContent = makeRuleContent();
twentyHourContent.constants.worldTickSeconds = 299;
const twentyHourRules = GameRules.create(twentyHourContent);
const twentyHourInitial = makeRuleState({
  player: makeRulePlayer({
    stacks: { herb: 50000 },
    shouyuan: 10000,
    shouMax: 10000
  }),
  systems: {
    gathering: { spots: {}, fishStocks: {}, fishRecoverAcc: 0 },
    homestead: {
      farm: { plots: [{ id: 'farm-20h', remainingSeconds: 72000 }] }
    },
    parallel: { jobs: [{ id: 'parallel-20h', remainingSeconds: 72000 }] },
    world: { tickAccumulator: 17 }
  }
});
const twentyHourMatrix = matrixAdvance(
  twentyHourInitial,
  72000,
  'offline',
  0,
  43200,
  twentyHourRules
);
let twentyHourChunkedState = JSON.parse(JSON.stringify(twentyHourInitial));
let twentyHourRemainingBudget = 43200;
let twentyHourChunkedTicks = 0;
for (let elapsed = 0; elapsed < 72000; elapsed += 60) {
  const chunk = matrixAdvance(
    twentyHourChunkedState,
    60,
    'offline',
    elapsed * 1000,
    twentyHourRemainingBudget,
    twentyHourRules
  );
  twentyHourChunkedState = chunk.state;
  twentyHourRemainingBudget = Math.max(
    0,
    twentyHourRemainingBudget - chunk.report.mainActionSeconds
  );
  twentyHourChunkedTicks += chunk.report.world.ticks;
}
const twentyHourStatesMatch = JSON.stringify(twentyHourChunkedState) ===
  JSON.stringify(twentyHourMatrix.state);
ok(
  twentyHourStatesMatch &&
    twentyHourMatrix.report.mainActionSeconds === 43200 &&
    twentyHourRemainingBudget === 0 &&
    twentyHourMatrix.state.current.done === 10800 &&
    twentyHourMatrix.state.systems.homestead.farm.plots.length === 0 &&
    twentyHourMatrix.state.systems.parallel.jobs.length === 0 &&
    twentyHourMatrix.report.world.ticks === 240 &&
    twentyHourChunkedTicks === twentyHourMatrix.report.world.ticks &&
    twentyHourMatrix.state.systems.world.tickAccumulator === 257 &&
    Math.abs(twentyHourMatrix.state.player.shouyuan - 2800) < 1e-8,
  '20-hour offline and globally budgeted chunks are JSON-identical with full passive lanes'
);

const persistedTimeContent = makeRuleContent();
persistedTimeContent.actions[
  'produce:alchemy:healingPill'
] = persistedTimeContent.actions.makePill;
delete persistedTimeContent.actions.makePill;
persistedTimeContent.actions[
  'produce:alchemy:healingPill'
].time = 3;
persistedTimeContent.actions[
  'produce:alchemy:healingPill'
].xp = 0;
persistedTimeContent.actions[
  'produce:alchemy:healingPill'
].cost = { lingzhi: 2 };
persistedTimeContent.actions[
  'produce:alchemy:healingPill'
].effects.stacks = { healingPill: 1 };
persistedTimeContent.constants.fishMax = 20;
persistedTimeContent.constants.yearSeconds = 1800;
const persistedTimeRules = GameRules.create(persistedTimeContent);

function persistedTimeBoundaryState() {
  return makeRuleState({
    player: makeRulePlayer({
      stacks: { herb: 0, pill: 0, lingzhi: 4 },
      mood: 0,
      shouyuan: 100,
      shouMax: 100
    }),
    current: {
      key: 'produce:alchemy:healingPill',
      mode: 'finite',
      count: 1,
      done: 0,
      elapsed: 0,
      stalled: false
    },
    systems: {
      gathering: {
        spots: {},
        fishStocks: { spiritCarp: 19 },
        fishRecoverAcc: 57
      },
      homestead: {
        farm: {
          unlockedPlots: 1,
          plots: [{
            id: 'farm-3s',
            cropId: 'spiritRice',
            remainingSeconds: 3,
            totalSeconds: 300,
            ready: false
          }]
        }
      },
      parallel: {
        jobs: [{ id: 'parallel-3s', remainingSeconds: 3 }]
      },
      world: { tickAccumulator: 297 }
    },
    rngState: 13579
  });
}

function advanceMillisecondPartitions(initial, partitions, startMs) {
  let state = JSON.parse(JSON.stringify(initial));
  const reports = [];
  let cursor = startMs || 0;
  partitions.forEach(function (milliseconds) {
    const result = matrixAdvance(
      state,
      milliseconds / 1000,
      'online',
      cursor,
      null,
      persistedTimeRules
    );
    state = result.state;
    reports.push(result.report);
    cursor += milliseconds;
  });
  return { state, reports, cursor };
}

function reportTotals(reports) {
  return reports.reduce(function (totals, report) {
    totals.actionCompleted += report.action.completed;
    totals.fishRecovered += report.passive.fishRecovered;
    totals.farmCompleted.push.apply(
      totals.farmCompleted,
      report.passive.farmCompleted
    );
    totals.parallelCompleted.push.apply(
      totals.parallelCompleted,
      report.passive.parallelCompleted
    );
    totals.worldTicks += report.world.ticks;
    return totals;
  }, {
    actionCompleted: 0,
    fishRecovered: 0,
    farmCompleted: [],
    parallelCompleted: [],
    worldTicks: 0
  });
}

const persistedTimeInitial = stage4SimulationFixture(
  StateModel.normalize(
    persistedTimeBoundaryState(),
    0
  )
);
const persistedTimeOffline = matrixAdvance(
  persistedTimeInitial,
  3,
  'offline',
  0,
  3,
  persistedTimeRules
);
const seventeenMillisecondRun = advanceMillisecondPartitions(
  persistedTimeInitial,
  new Array(176).fill(17).concat([8]),
  0
);
const tenthSecondRun = advanceMillisecondPartitions(
  persistedTimeInitial,
  new Array(30).fill(100),
  0
);
const seventeenTotals = reportTotals(seventeenMillisecondRun.reports);
const tenthTotals = reportTotals(tenthSecondRun.reports);
const offlineTotals = reportTotals([persistedTimeOffline.report]);

ok(
  JSON.stringify(seventeenMillisecondRun.state) ===
    JSON.stringify(persistedTimeOffline.state),
  '176 × 17ms + 8ms online and one 3-second offline advance are full-JSON identical'
);
ok(
  JSON.stringify(tenthSecondRun.state) ===
    JSON.stringify(persistedTimeOffline.state),
  '30 × 0.1-second online and one 3-second offline advance are full-JSON identical'
);
const persistedRepeatInitial = persistedTimeBoundaryState();
persistedRepeatInitial.current.mode = 'repeat';
persistedRepeatInitial.current.count = 0;
const persistedRepeatOffline = matrixAdvance(
  persistedRepeatInitial,
  3,
  'offline',
  0,
  3,
  persistedTimeRules
).state;
const persistedRepeatFrames = advanceMillisecondPartitions(
  persistedRepeatInitial,
  new Array(176).fill(17).concat([8]),
  0
).state;
ok(
  JSON.stringify(persistedRepeatFrames) ===
      JSON.stringify(persistedRepeatOffline) &&
    persistedRepeatFrames.current.done === 1 &&
    persistedRepeatFrames.current.elapsed === 0 &&
    persistedRepeatFrames.current.elapsedAnchorMs === 3000 &&
    persistedRepeatFrames.current.elapsedBaseSeconds === 0,
  'repeat action persists one exact completion and a zero residual across 17ms partitions'
);
ok(
  persistedTimeOffline.state.current === null &&
    seventeenMillisecondRun.state.current === null &&
    tenthSecondRun.state.current === null &&
    offlineTotals.actionCompleted === 1 &&
    seventeenTotals.actionCompleted === 1 &&
    tenthTotals.actionCompleted === 1,
  'main action completes exactly once at the persisted three-second boundary'
);
ok(
  persistedTimeOffline.state.player.mood ===
      seventeenMillisecondRun.state.player.mood &&
    persistedTimeOffline.state.player.mood ===
      tenthSecondRun.state.player.mood,
  'low mood regeneration is partition invariant'
);
ok(
  offlineTotals.fishRecovered === 1 &&
    seventeenTotals.fishRecovered === 1 &&
    tenthTotals.fishRecovered === 1 &&
    persistedTimeOffline.state.systems.gathering.fishStocks.spiritCarp === 20,
  'fish recovery resolves exactly once at the persisted boundary'
);
ok(
  offlineTotals.farmCompleted.join(',') === 'farm-3s' &&
    seventeenTotals.farmCompleted.join(',') === 'farm-3s' &&
    tenthTotals.farmCompleted.join(',') === 'farm-3s' &&
    persistedTimeOffline.state.systems.homestead.farm.plots.length === 0,
  'farm completion is partition invariant at the exact boundary'
);
ok(
  offlineTotals.parallelCompleted.join(',') === 'parallel-3s' &&
    seventeenTotals.parallelCompleted.join(',') === 'parallel-3s' &&
    tenthTotals.parallelCompleted.join(',') === 'parallel-3s' &&
    persistedTimeOffline.state.systems.parallel.jobs.length === 0,
  'parallel completion is partition invariant at the exact boundary'
);
ok(
  offlineTotals.worldTicks === 1 &&
    seventeenTotals.worldTicks === 1 &&
    tenthTotals.worldTicks === 1 &&
    persistedTimeOffline.state.systems.world.tickAccumulator === 0,
  'world tick boundary and accumulator are partition invariant'
);

const persistedTimeFirstHalf = advanceMillisecondPartitions(
  persistedTimeInitial,
  new Array(15).fill(100),
  0
);
const persistedTimeHalfSnapshot = SaveSystem.createSnapshot(
  StateModel.toSnapshotInput(persistedTimeFirstHalf.state),
  1500
);
const persistedTimeHalfReloaded = SaveSystem.load({
  load(key) {
    return key === SaveSystem.SNAPSHOT_KEY
      ? persistedTimeHalfSnapshot
      : null;
  }
}, 1500).snapshot;
ok(
  persistedTimeHalfReloaded.current.elapsedAnchorMs === 0 &&
    persistedTimeHalfReloaded.current.elapsedBaseSeconds === 0 &&
    persistedTimeHalfReloaded.player.moodAnchorMs === 0 &&
    persistedTimeHalfReloaded.player.moodBase === 0 &&
    persistedTimeHalfReloaded.systems.gathering.fishRecoverAnchorMs === 0 &&
    persistedTimeHalfReloaded.systems.gathering
      .fishRecoverBaseSeconds === 57 &&
    persistedTimeHalfReloaded.systems.homestead.farm.plots[0]
      .remainingAnchorMs === 0 &&
    persistedTimeHalfReloaded.systems.parallel.jobs[0]
      .remainingAnchorMs === 0 &&
    persistedTimeHalfReloaded.systems.world.tickAnchorMs === 0 &&
    persistedTimeHalfReloaded.systems.world.tickBaseSeconds === 297,
  'all persisted time anchors and baselines survive the v2 snapshot boundary'
);
const preAnchorV2 = JSON.parse(JSON.stringify(persistedTimeHalfSnapshot));
preAnchorV2.schemaVersion = 2;
delete preAnchorV2.current.elapsedAnchorMs;
delete preAnchorV2.current.elapsedBaseSeconds;
delete preAnchorV2.player.moodAnchorMs;
delete preAnchorV2.player.moodBase;
delete preAnchorV2.systems.gathering.fishRecoverAnchorMs;
delete preAnchorV2.systems.gathering.fishRecoverBaseSeconds;
delete preAnchorV2.systems.world.tickAnchorMs;
delete preAnchorV2.systems.world.tickBaseSeconds;
preAnchorV2.systems.homestead.farm.plots.forEach(function (plot) {
  delete plot.remainingAnchorMs;
  delete plot.remainingBaseSeconds;
});
preAnchorV2.systems.parallel.jobs.forEach(function (job) {
  delete job.remainingAnchorMs;
  delete job.remainingBaseSeconds;
});
const preAnchorV2Load = SaveSystem.load({
  load(key) {
    return key === SaveSystem.SNAPSHOT_KEY ? preAnchorV2 : null;
  }
}, 1500);
ok(
  preAnchorV2Load.source === 'empty' &&
    preAnchorV2Load.migrated === false &&
    preAnchorV2Load.writeProtected === false &&
    preAnchorV2Load.snapshot.player === null,
  'pre-anchor schema-v2 snapshots are rejected instead of migrated'
);
const preAnchorV5 = JSON.parse(JSON.stringify(persistedTimeHalfSnapshot));
delete preAnchorV5.current.elapsedAnchorMs;
delete preAnchorV5.current.elapsedBaseSeconds;
delete preAnchorV5.player.moodAnchorMs;
delete preAnchorV5.player.moodBase;
delete preAnchorV5.systems.gathering.fishRecoverAnchorMs;
delete preAnchorV5.systems.gathering.fishRecoverBaseSeconds;
delete preAnchorV5.systems.world.tickAnchorMs;
delete preAnchorV5.systems.world.tickBaseSeconds;
preAnchorV5.systems.homestead.farm.plots.forEach(function (plot) {
  delete plot.remainingAnchorMs;
  delete plot.remainingBaseSeconds;
});
preAnchorV5.systems.parallel.jobs.forEach(function (job) {
  delete job.remainingAnchorMs;
  delete job.remainingBaseSeconds;
});
const preAnchorV5Model = StateModel.normalize(preAnchorV5, 1500);
ok(
  preAnchorV5Model.current.elapsedAnchorMs === null &&
    preAnchorV5Model.player.moodAnchorMs === null &&
    preAnchorV5Model.systems.gathering.fishRecoverAnchorMs === null &&
    preAnchorV5Model.systems.world.tickAnchorMs === null,
  'same-version v5 models without anchors remain compatible and lazily establish anchors'
);
const persistedTimeResumed = advanceMillisecondPartitions(
  StateModel.normalize(persistedTimeHalfReloaded, 1500),
  new Array(15).fill(100),
  1500
);
ok(
  JSON.stringify(persistedTimeResumed.state) ===
    JSON.stringify(persistedTimeOffline.state),
  'save/load continuation preserves the same full JSON state at the boundary'
);

function repeatedFractionalBoundaryCase(duration, total, partitions, label) {
  const content = makeRuleContent();
  content.actions.makePill.time = duration;
  content.constants.yearSeconds = 1800;
  const rules = GameRules.create(content);
  const initial = makeRuleState({
    player: makeRulePlayer({
      stacks: { herb: 1000 },
      mood: 0,
      shouyuan: 100,
      shouMax: 100
    }),
    current: {
      key: 'makePill',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      stalled: false
    },
    rngState: 97531
  });
  const bulk = matrixAdvance(
    initial,
    total,
    'offline',
    0,
    total,
    rules
  );
  let state = JSON.parse(JSON.stringify(initial));
  const reports = [];
  let fromMs = 0;
  partitions.forEach(function (seconds) {
    const result = matrixAdvance(
      state,
      seconds,
      'online',
      fromMs,
      null,
      rules
    );
    state = result.state;
    reports.push(result.report);
    fromMs += seconds * 1000;
  });
  const chunkTotals = reportTotals(reports);
  const statesMatch =
    JSON.stringify(state) === JSON.stringify(bulk.state);
  const totalsMatch =
    chunkTotals.actionCompleted === bulk.report.action.completed;
  const rngMatches = state.rngState === bulk.state.rngState;
  if (!statesMatch || !totalsMatch || !rngMatches) {
    console.error(JSON.stringify({
      label,
      partitionedState: state,
      bulkState: bulk.state,
      partitionedCompleted: chunkTotals.actionCompleted,
      bulkCompleted: bulk.report.action.completed
    }, null, 2));
  }
  ok(statesMatch && totalsMatch && rngMatches, label);
}

repeatedFractionalBoundaryCase(
  0.1,
  3,
  new Array(30).fill(0.1),
  'bulk and partitioned schedules match across thirty repeated 0.1-second boundaries'
);
repeatedFractionalBoundaryCase(
  0.0004,
  0.004,
  new Array(10).fill(0.0004),
  'bulk and partitioned schedules match across repeated fractional-millisecond boundaries'
);
repeatedFractionalBoundaryCase(
  4e-13,
  4e-12,
  new Array(10).fill(4e-13),
  'bulk and partitioned schedules match across repeated sub-picosecond boundaries'
);

const partialAnchorSnapshot = SaveSystem.createSnapshot({
  created: true,
  player: Object.assign(makeRulePlayer({
    mood: 4,
    shouyuan: 100,
    shouMax: 100
  }), {
    moodAnchorMs: 1,
    lifespanBaseYears: 100
  }),
  current: null,
  systems: {
    gathering: {
      spots: {},
      fishStocks: {},
      fishRecoverAcc: 0
    },
    homestead: {
      farm: {
        plots: [{
          id: 'plot-1',
          cropId: 'spiritRice',
          remainingSeconds: 3,
          totalSeconds: 300,
          ready: false,
          remainingAnchorMs: 1
        }]
      }
    },
    parallel: {
      jobs: [{
        id: 'partial-parallel',
        remainingSeconds: 3,
        remainingBaseSeconds: 3
      }]
    },
    world: { tickAccumulator: 0 }
  },
  rngState: 7,
  processedThroughMs: 1
}, 1);
const partialAnchorModel = StateModel.normalize(partialAnchorSnapshot, 1);
ok(
  partialAnchorSnapshot.player.moodAnchorMs === null &&
    partialAnchorSnapshot.player.moodBase === null &&
    partialAnchorSnapshot.player.lifespanAnchorMs === null &&
    partialAnchorSnapshot.player.lifespanBaseYears === null &&
    partialAnchorSnapshot.systems.homestead.farm.plots[0]
      .remainingAnchorMs === null &&
    partialAnchorSnapshot.systems.homestead.farm.plots[0]
      .remainingBaseSeconds === null &&
    partialAnchorSnapshot.systems.parallel.jobs[0]
      .remainingAnchorMs === null &&
    partialAnchorSnapshot.systems.parallel.jobs[0]
      .remainingBaseSeconds === null &&
    partialAnchorModel.systems.homestead.farm.plots[0]
      .remainingAnchorMs === null &&
    partialAnchorModel.systems.parallel.jobs[0]
      .remainingBaseSeconds === null,
  'snapshot and StateModel canonicalize every partial time pair to a complete null pair'
);

const completeAnchorSnapshot = SaveSystem.createSnapshot({
  created: true,
  player: Object.assign(makeRulePlayer({
    mood: 4,
    shouyuan: 100,
    shouMax: 100
  }), {
    moodAnchorMs: 1,
    moodBase: 4,
    lifespanAnchorMs: 1,
    lifespanBaseYears: 100
  }),
  current: null,
  systems: {
    gathering: {
      spots: {},
      fishStocks: {},
      fishRecoverAcc: 0
    },
    homestead: {
      farm: {
        plots: [{
          id: 'plot-1',
          cropId: 'spiritRice',
          remainingSeconds: 3,
          totalSeconds: 300,
          ready: false,
          remainingAnchorMs: 1,
          remainingBaseSeconds: 3
        }]
      }
    },
    parallel: {
      jobs: [{
        id: 'complete-parallel',
        remainingSeconds: 3,
        remainingAnchorMs: 1,
        remainingBaseSeconds: 3
      }]
    },
    world: { tickAccumulator: 0 }
  },
  rngState: 7,
  processedThroughMs: 1
}, 1);
ok(
  completeAnchorSnapshot.player.moodAnchorMs === 1 &&
    completeAnchorSnapshot.player.moodBase === 4 &&
    completeAnchorSnapshot.player.lifespanAnchorMs === 1 &&
    completeAnchorSnapshot.player.lifespanBaseYears === 100 &&
    completeAnchorSnapshot.systems.homestead.farm.plots[0]
      .remainingAnchorMs === 1 &&
    completeAnchorSnapshot.systems.parallel.jobs[0]
      .remainingBaseSeconds === 3,
  'complete finite time pairs survive canonical snapshot creation'
);

function partialV2FallsBack(label, mutate) {
  const primary = JSON.parse(JSON.stringify(completeAnchorSnapshot));
  mutate(primary);
  const loaded = SaveSystem.load({
    load(key) {
      if (key === SaveSystem.SNAPSHOT_KEY) return primary;
      if (key === SaveSystem.BACKUP_KEY) return completeAnchorSnapshot;
      return null;
    }
  }, 1);
  ok(
    loaded.source === 'backup' &&
      loaded.needsRepair === true &&
      loaded.writeProtected === false,
    label
  );
}

[
  ['mood anchor without base is rejected', function (snapshot) {
    delete snapshot.player.moodBase;
  }],
  ['mood base without anchor is rejected', function (snapshot) {
    delete snapshot.player.moodAnchorMs;
  }],
  ['lifespan anchor without base is rejected', function (snapshot) {
    delete snapshot.player.lifespanBaseYears;
  }],
  ['lifespan base without anchor is rejected', function (snapshot) {
    delete snapshot.player.lifespanAnchorMs;
  }],
  ['farm anchor without base is rejected', function (snapshot) {
    delete snapshot.systems.homestead.farm.plots[0]
      .remainingBaseSeconds;
  }],
  ['farm base without anchor is rejected', function (snapshot) {
    delete snapshot.systems.homestead.farm.plots[0].remainingAnchorMs;
  }],
  ['parallel anchor without base is rejected', function (snapshot) {
    delete snapshot.systems.parallel.jobs[0].remainingBaseSeconds;
  }],
  ['parallel base without anchor is rejected', function (snapshot) {
    delete snapshot.systems.parallel.jobs[0].remainingAnchorMs;
  }]
].forEach(function (testCase) {
  partialV2FallsBack(testCase[0], testCase[1]);
});

function advanceFractionalSchedule(initial, partitions, ruleSet) {
  let state = JSON.parse(JSON.stringify(initial));
  const reports = [];
  partitions.forEach(function (seconds) {
    const result = matrixAdvance(
      state,
      seconds,
      'online',
      state.processedThroughMs,
      null,
      ruleSet
    );
    result.state.processedThroughMs = result.report.toMs;
    state = result.state;
    reports.push(result.report);
  });
  return { state, reports };
}

function stage2PersistenceRuleContent(duration) {
  const content = makeRuleContent();
  const action = content.actions.makePill;
  delete content.actions.makePill;
  action.time = duration;
  action.xp = 0;
  action.cost = { lingzhi: 2 };
  action.effects.stacks = { healingPill: 1 };
  content.actions['produce:alchemy:healingPill'] = action;
  content.constants.fishMax = 20;
  return content;
}

function persistedFractionalCutCase(seconds, label) {
  const content = stage2PersistenceRuleContent(seconds);
  content.constants.fishRecoverSeconds = seconds;
  content.constants.worldTickSeconds = seconds;
  content.constants.yearSeconds = 1;
  const rules = GameRules.create(content);
  const totalSeconds = seconds * 10;
  const initial = stage4SimulationFixture(
    StateModel.normalize(makeRuleState({
      player: makeRulePlayer({
        stacks: {
          herb: 0,
          pill: 0,
          healingPill: 1,
          lingzhi: 1000
        },
        mood: 0,
        shouyuan: 100,
        shouMax: 100
      }),
      systems: {
        gathering: {
          spots: {},
          fishStocks: { spiritCarp: 19 },
          fishRecoverAcc: 0
        },
        homestead: {
          farm: {
            unlockedPlots: 1,
            plots: [{
              id: 'fractional-farm',
              cropId: 'spiritRice',
              remainingSeconds: totalSeconds,
              totalSeconds: 300,
              ready: false
            }]
          }
        },
        parallel: {
          jobs: [{
            id: 'fractional-parallel',
            remainingSeconds: totalSeconds
          }]
        },
        world: { tickAccumulator: 0 }
      },
      current: {
        key: 'produce:alchemy:healingPill',
        mode: 'repeat',
        count: 0,
        done: 0,
        elapsed: 0,
        stalled: false
      },
      rngState: 86420
    }), 0)
  );
  initial.processedThroughMs = 0;

  const bulk = matrixAdvance(
    initial,
    totalSeconds,
    'online',
    0,
    null,
    rules
  );
  bulk.state.processedThroughMs = bulk.report.toMs;
  const partitioned = advanceFractionalSchedule(
    initial,
    new Array(10).fill(seconds),
    rules
  );
  const first = advanceFractionalSchedule(initial, [seconds], rules);
  const cutMs = first.state.processedThroughMs;
  const snapshot = SaveSystem.createSnapshot(
    StateModel.toSnapshotInput(first.state),
    cutMs
  );
  const loaded = SaveSystem.load({
    load(key) {
      return key === SaveSystem.SNAPSHOT_KEY ? snapshot : null;
    }
  }, cutMs);
  const resumed = advanceFractionalSchedule(
    StateModel.normalize(loaded.snapshot, cutMs),
    new Array(9).fill(seconds),
    rules
  );
  const bulkJson = JSON.stringify(bulk.state);
  const partitionedJson = JSON.stringify(partitioned.state);
  const resumedJson = JSON.stringify(resumed.state);

  ok(
    snapshot.savedAt === cutMs &&
      snapshot.processedThroughMs === cutMs &&
      loaded.snapshot.savedAt === cutMs &&
      loaded.snapshot.processedThroughMs === cutMs &&
      cutMs > 0 &&
      !Number.isInteger(cutMs),
    label + ' preserves the exact non-integer save watermark'
  );
  ok(
    partitionedJson === bulkJson &&
      resumedJson === bulkJson &&
      resumed.state.rngState === bulk.state.rngState &&
      JSON.stringify(resumed.state.current) ===
        JSON.stringify(bulk.state.current) &&
      JSON.stringify(resumed.state.player) ===
        JSON.stringify(bulk.state.player) &&
      JSON.stringify(resumed.state.systems.gathering) ===
        JSON.stringify(bulk.state.systems.gathering) &&
      JSON.stringify(resumed.state.systems.homestead.farm) ===
        JSON.stringify(bulk.state.systems.homestead.farm) &&
      JSON.stringify(resumed.state.systems.parallel) ===
        JSON.stringify(bulk.state.systems.parallel) &&
      JSON.stringify(resumed.state.systems.world) ===
        JSON.stringify(bulk.state.systems.world) &&
      resumed.state.processedThroughMs ===
        bulk.state.processedThroughMs,
    label + ' save/load continuation matches bulk and partitioned full JSON'
  );
}

persistedFractionalCutCase(0.0004, '0.4ms cut');
persistedFractionalCutCase(4e-13, '4e-13s cut');

function finiteStopPrecisionPersistenceCase(seconds, label) {
  const content = stage2PersistenceRuleContent(seconds);
  const rules = GameRules.create(content);
  const initial = stage4SimulationFixture(
    StateModel.normalize(makeRuleState({
      player: makeRulePlayer({
        stacks: { herb: 0, pill: 0, lingzhi: 2 }
      }),
      current: {
        key: 'produce:alchemy:healingPill',
        mode: 'finite',
        count: 1,
        done: 0,
        elapsed: 0,
        stalled: false
      },
      rngState: 24680
    }), 0)
  );
  initial.processedThroughMs = 0;

  const completed = matrixAdvance(
    initial,
    seconds,
    'online',
    0,
    null,
    rules
  );
  completed.state.processedThroughMs = completed.report.toMs;
  const expectedStopMs = seconds * 1000;
  const canonicalCompleted = StateModel.normalize(
    completed.state,
    expectedStopMs
  );
  const snapshotInput = StateModel.toSnapshotInput(canonicalCompleted);
  const snapshot = SaveSystem.createSnapshot(
    snapshotInput,
    expectedStopMs
  );
  const loaded = SaveSystem.load({
    load(key) {
      return key === SaveSystem.SNAPSHOT_KEY
        ? JSON.parse(JSON.stringify(snapshot))
        : null;
    }
  }, expectedStopMs);
  const reloaded = StateModel.normalize(
    loaded.snapshot,
    expectedStopMs
  );

  ok(
    completed.report.action.stopAtMs === expectedStopMs,
    label + ' finite completion reports the exact fractional stop time'
  );
  ok(
    completed.state.lastActionStop.atMs === expectedStopMs &&
      snapshotInput.lastActionStop.atMs === expectedStopMs &&
      snapshot.lastActionStop.atMs === expectedStopMs &&
      reloaded.lastActionStop.atMs === expectedStopMs,
    label + ' live, snapshot-input, snapshot and reloaded stop times agree'
  );
  ok(
    JSON.stringify(snapshotInput) ===
      JSON.stringify(canonicalCompleted) &&
      JSON.stringify(reloaded) ===
        JSON.stringify(canonicalCompleted),
    label + ' finite-completion state stays full-JSON identical after reopen'
  );
}

finiteStopPrecisionPersistenceCase(0.0004, '0.4ms boundary');
finiteStopPrecisionPersistenceCase(4e-13, '4e-13s boundary');

const firstSubMillisecondReport = SimulationReport.create({
  source: 'online',
  fromMs: 0,
  toMs: 0.4,
  requestedSeconds: 0.0004,
  actionKey: 'makePill',
  seedBefore: 77
});
const secondSubMillisecondReport = SimulationReport.create({
  source: 'online',
  fromMs: 0.4,
  toMs: 0.8,
  requestedSeconds: 0.0004,
  actionKey: 'makePill',
  seedBefore: 77
});
const subMillisecondInbox = SimulationReport.addPending(
  SimulationReport.addPending([], firstSubMillisecondReport),
  secondSubMillisecondReport
);
ok(
  firstSubMillisecondReport.fromMs === 0 &&
    firstSubMillisecondReport.toMs === 0.4 &&
    secondSubMillisecondReport.fromMs === 0.4 &&
    secondSubMillisecondReport.toMs === 0.8 &&
    firstSubMillisecondReport.id !== secondSubMillisecondReport.id &&
    subMillisecondInbox.length === 2,
  'consecutive sub-millisecond report windows stay distinct in the inbox'
);

function invalidTimedEntryFallsBack(label, mutate) {
  const primary = JSON.parse(JSON.stringify(completeAnchorSnapshot));
  mutate(primary);
  const loaded = SaveSystem.load({
    load(key) {
      if (key === SaveSystem.SNAPSHOT_KEY) return primary;
      if (key === SaveSystem.BACKUP_KEY) return completeAnchorSnapshot;
      return null;
    }
  }, 1);
  let simulationSafe = true;
  try {
    matrixAdvance(
      StateModel.normalize(loaded.snapshot, 1),
      0.1,
      'online',
      1,
      null,
      gameRules
    );
  } catch (error) {
    simulationSafe = false;
  }
  ok(
    loaded.source === 'backup' &&
      loaded.needsRepair === true &&
      simulationSafe,
    label
  );
}

[
  ['farm primitive triggers backup repair', function (snapshot) {
    snapshot.systems.homestead.farm.plots[0] = 7;
  }],
  ['farm null triggers backup repair', function (snapshot) {
    snapshot.systems.homestead.farm.plots[0] = null;
  }],
  ['farm missing timer triggers backup repair', function (snapshot) {
    delete snapshot.systems.homestead.farm.plots[0].remainingSeconds;
  }],
  ['farm half anchor triggers backup repair', function (snapshot) {
    delete snapshot.systems.homestead.farm.plots[0].remainingBaseSeconds;
  }],
  ['parallel primitive triggers backup repair', function (snapshot) {
    snapshot.systems.parallel.jobs[0] = 7;
  }],
  ['parallel null triggers backup repair', function (snapshot) {
    snapshot.systems.parallel.jobs[0] = null;
  }],
  ['parallel missing timer triggers backup repair', function (snapshot) {
    delete snapshot.systems.parallel.jobs[0].remainingSeconds;
  }],
  ['parallel half anchor triggers backup repair', function (snapshot) {
    delete snapshot.systems.parallel.jobs[0].remainingAnchorMs;
  }]
].forEach(function (testCase) {
  invalidTimedEntryFallsBack(testCase[0], testCase[1]);
});

const directlyNormalizedTimedEntries = StateModel.normalize({
  player: makeRulePlayer({ shouyuan: 100, shouMax: 100 }),
  systems: {
    gathering: { spots: {}, fishStocks: {}, fishRecoverAcc: 0 },
    homestead: {
      farm: {
        plots: [
          7,
          null,
          { id: 'missing-farm-timer' },
          {
            id: 'repairable-farm',
            cropId: 'spiritRice',
            remainingSeconds: 3,
            totalSeconds: 300,
            ready: false,
            remainingAnchorMs: 1
          }
        ]
      }
    },
    parallel: {
      jobs: [
        7,
        null,
        { id: 'missing-parallel-timer' },
        {
          id: 'repairable-parallel',
          remainingSeconds: 3,
          remainingBaseSeconds: 3
        }
      ]
    },
    world: { tickAccumulator: 0 }
  },
  rngState: 7,
  processedThroughMs: 1
}, 1);
let directTimedNormalizationSafe = true;
try {
  matrixAdvance(
    directlyNormalizedTimedEntries,
    0.1,
    'online',
    1,
    null,
    gameRules
  );
} catch (error) {
  directTimedNormalizationSafe = false;
}
ok(
  directlyNormalizedTimedEntries.systems.homestead.farm.plots.length === 3 &&
    directlyNormalizedTimedEntries.systems.homestead.farm.plots[0].id ===
      'repairable-farm' &&
    directlyNormalizedTimedEntries.systems.homestead.farm.plots[0]
      .remainingAnchorMs === null &&
    directlyNormalizedTimedEntries.systems.parallel.jobs.length === 1 &&
    directlyNormalizedTimedEntries.systems.parallel.jobs[0].id ===
      'repairable-parallel' &&
    directlyNormalizedTimedEntries.systems.parallel.jobs[0]
      .remainingAnchorMs === null &&
    directTimedNormalizationSafe,
  'StateModel drops unsafe timed entries and repairs half anchors before simulation'
);

console.log(`\n=== 模拟内核自测：${pass} 通过 / ${fail} 失败 ===`);
process.exit(fail ? 1 : 0);
