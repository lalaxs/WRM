'use strict';

const fs = require('fs');
const vm = require('vm');
const { isDeepStrictEqual } = require('node:util');

let pass = 0;
let fail = 0;

function ok(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.error('  ✗ FAIL: ' + message);
  }
}

function exact(actual, expected, message) {
  ok(isDeepStrictEqual(actual, expected), message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function bytes(value) {
  return JSON.stringify(value);
}

function deeplyFrozen(value) {
  if (!value || typeof value !== 'object') return true;
  return Object.isFrozen(value) &&
    Object.keys(value).every((key) => deeplyFrozen(value[key]));
}

function unchanged(result, model, before, code, message) {
  ok(!result.ok && result.code === code && result.state === model,
    message + ' returns the original state with ' + code);
  ok(bytes(model) === before, message + ' preserves input byte-for-byte');
}

const Stage2State = require('../core/stage2-state.js');
const Stage3State = require('../core/stage3-state.js');
const Inventory = require('../core/inventory.js');
const TechniqueContent = require('../content/techniques.js');
const RealmContent = require('../content/realms.js');
const beforeGlobal = globalThis.Techniques;
const Techniques = require('../core/techniques.js');

const emptySect = Object.freeze({
  sectId: null,
  favoredTechniqueIds: Object.freeze([]),
  favoredTags: Object.freeze([])
});

function freshModel(realmId) {
  const model = Stage3State.normalize(Stage2State.createDefaults());
  if (realmId) model.player.breakthrough.realmId = realmId;
  return model;
}

function put(model, itemId, quantity) {
  model.player.inventory.stacks[itemId] = quantity;
  return model;
}

function learn(model, techniqueId, level, xp) {
  model.player.techniques.known[techniqueId] = {
    level: level == null ? 1 : level,
    xp: xp == null ? 0 : xp
  };
  return model;
}

function libraryRow(view, techniqueId) {
  return view.techniques.find((row) => row.id === techniqueId);
}

ok(globalThis.Techniques === beforeGlobal,
  'CommonJS loading does not attach a browser global');
ok(Object.isFrozen(Techniques), 'Techniques API is frozen');
exact(Object.keys(Techniques), [
  'consumeBook',
  'grantXp',
  'xpNeed',
  'sectModifiers',
  'scaledEffect',
  'queryLibrary'
], 'Techniques exposes only the six declared operations in order');

// Exact sect seam and XP thresholds at the reviewer-gate levels.
{
  const favoredId = {
    sectId: 'azure-sword',
    favoredTechniqueIds: ['cloudPiercingSword'],
    favoredTags: []
  };
  const favoredTag = {
    sectId: 'azure-sword',
    favoredTechniqueIds: [],
    favoredTags: ['sword']
  };
  const nonfavored = {
    sectId: 'azure-sword',
    favoredTechniqueIds: ['ironBody'],
    favoredTags: ['body']
  };
  exact(Techniques.sectModifiers('cloudPiercingSword', favoredId), {
    requiredRealmReduction: 1,
    xpCostMultiplier: 0.9
  }, 'favored technique ID lowers realm requirement and XP cost');
  exact(Techniques.sectModifiers('cloudPiercingSword', favoredTag), {
    requiredRealmReduction: 1,
    xpCostMultiplier: 0.9
  }, 'favored technique tag lowers realm requirement and XP cost');
  exact(Techniques.sectModifiers('cloudPiercingSword', nonfavored), {
    requiredRealmReduction: 0,
    xpCostMultiplier: 1
  }, 'nonfavored sect context leaves requirements unchanged');
  exact(Techniques.sectModifiers('cloudPiercingSword', emptySect), {
    requiredRealmReduction: 0,
    xpCostMultiplier: 1
  }, 'empty sect context is neutral');

  const ordinary = { xpCostMultiplier: 1 };
  const favored = { xpCostMultiplier: 0.9 };
  exact([
    Techniques.xpNeed(1, ordinary),
    Techniques.xpNeed(39, ordinary),
    Techniques.xpNeed(199, ordinary)
  ], [33, 3301, 7874807178],
  'ordinary XP thresholds match the MWI table at levels 1, 39 and 199');
  exact([
    Techniques.xpNeed(1, favored),
    Techniques.xpNeed(10, favored),
    Techniques.xpNeed(19, favored)
  ], [30, 156, 405],
  'favored XP thresholds are exact at levels 1, 10 and 19');
  ok(Techniques.xpNeed(200, favored) === 0,
    'level 200 has no further XP requirement');
}

// First books learn permanently; duplicates grant MWI book XP (T1=50, T2+=500).
{
  const model = put(
    freshModel(),
    'techniqueBook:stoneBreakingFist',
    2
  );
  const before = bytes(model);
  const learned = Techniques.consumeBook(
    model,
    'techniqueBook:stoneBreakingFist',
    emptySect
  );
  ok(learned.ok && learned.code === 'ok' &&
    learned.state.player.techniques.known.stoneBreakingFist.level === 1 &&
    learned.state.player.techniques.known.stoneBreakingFist.xp === 0,
  'first book permanently learns technique at level 1 and zero XP');
  ok(learned.gainedXp === 0 && learned.levelsGained === 0 &&
    learned.capped === false,
  'first book does not become duplicate XP');
  ok(learned.state.player.inventory.stacks[
    'techniqueBook:stoneBreakingFist'
  ] === 1, 'first book consumes exactly one inventory item');
  ok(bytes(model) === before, 'first-book learning does not mutate input');

  const learnedBefore = bytes(learned.state);
  const duplicate = Techniques.consumeBook(
    learned.state,
    'techniqueBook:stoneBreakingFist',
    emptySect
  );
  ok(duplicate.ok && duplicate.gainedXp === 50 &&
    duplicate.levelsGained === 1 &&
    duplicate.state.player.techniques.known.stoneBreakingFist.level === 2 &&
    duplicate.state.player.techniques.known.stoneBreakingFist.xp === 17,
  'duplicate tier-one book grants 50 XP through the MWI level loop');
  ok(duplicate.state.player.inventory.stacks[
    'techniqueBook:stoneBreakingFist'
  ] == null, 'duplicate book is consumed exactly once');
  ok(bytes(learned.state) === learnedBefore,
    'duplicate absorption does not mutate input');

  const tierTwo = put(
    learn(freshModel('qi-9'), 'bodyBarrier'),
    'techniqueBook:bodyBarrier',
    1
  );
  const tierTwoOut = Techniques.consumeBook(
    tierTwo,
    'techniqueBook:bodyBarrier',
    emptySect
  );
  ok(tierTwoOut.ok && tierTwoOut.gainedXp === 500 &&
    tierTwoOut.levelsGained === 6 &&
    tierTwoOut.state.player.techniques.known.bodyBarrier.level === 7 &&
    tierTwoOut.state.player.techniques.known.bodyBarrier.xp === 114,
    'duplicate tier-two book grants exactly 500 XP through the MWI level loop');
}

// Unknown/non-book items, realm gates and favored ID/tag eligibility.
{
  const model = put(freshModel(), 'herbBundle', 1);
  unchanged(
    Techniques.consumeBook(model, 'missing-book', emptySect),
    model,
    bytes(model),
    'invalid_technique_book',
    'unknown book'
  );
  unchanged(
    Techniques.consumeBook(model, 'herbBundle', emptySect),
    model,
    bytes(model),
    'invalid_technique_book',
    'non-technique item'
  );

  const gated = put(
    freshModel('qi-9'),
    'techniqueBook:cloudPiercingSword',
    1
  );
  unchanged(
    Techniques.consumeBook(
      gated,
      'techniqueBook:cloudPiercingSword',
      emptySect
    ),
    gated,
    bytes(gated),
    'realm_requirement',
    'ordinary realm requirement'
  );

  for (const favoredContext of [
    {
      sectId: 'sword-hall',
      favoredTechniqueIds: ['cloudPiercingSword'],
      favoredTags: []
    },
    {
      sectId: 'sword-hall',
      favoredTechniqueIds: [],
      favoredTags: ['sword']
    }
  ]) {
    const before = bytes(gated);
    const out = Techniques.consumeBook(
      gated,
      'techniqueBook:cloudPiercingSword',
      favoredContext
    );
    ok(out.ok &&
      out.state.player.techniques.known.cloudPiercingSword.level === 1 &&
      bytes(gated) === before,
    'favored ID or tag reduces the pre-learning realm requirement by one');
  }
}

// XP sources, exact favored cost and permanent known records.
{
  let model = learn(freshModel(), 'cloudPiercingSword');
  for (const source of ['combat', 'npc_guidance', 'sect_training']) {
    const before = bytes(model);
    const out = Techniques.grantXp(
      model,
      'cloudPiercingSword',
      1,
      source,
      emptySect
    );
    ok(out.ok && out.levelsGained === 0 && out.capped === false &&
      out.state.player.techniques.known.cloudPiercingSword.xp ===
        model.player.techniques.known.cloudPiercingSword.xp + 1,
    source + ' is an accepted technique XP source');
    ok(bytes(model) === before, source + ' XP does not mutate input');
    model = out.state;
  }

  const unknownBefore = bytes(model);
  unchanged(
    Techniques.grantXp(
      model,
      'cloudPiercingSword',
      1,
      'mystery',
      emptySect
    ),
    model,
    unknownBefore,
    'invalid_xp_source',
    'unknown XP source'
  );

  const favored = {
    sectId: 'azure-sword',
    favoredTechniqueIds: ['cloudPiercingSword'],
    favoredTags: []
  };
  const at29 = learn(freshModel(), 'cloudPiercingSword', 1, 29);
  const levelUp = Techniques.grantXp(
    at29,
    'cloudPiercingSword',
    1,
    'sect_training',
    favored
  );
  ok(levelUp.ok && levelUp.levelsGained === 1 &&
    levelUp.state.player.techniques.known.cloudPiercingSword.level === 2 &&
    levelUp.state.player.techniques.known.cloudPiercingSword.xp === 0,
  'favored level-one threshold is exactly 30 XP');

  const changedSect = Techniques.grantXp(
    levelUp.state,
    'cloudPiercingSword',
    1,
    'combat',
    {
      sectId: 'iron-body',
      favoredTechniqueIds: ['ironBody'],
      favoredTags: ['body']
    }
  );
  ok(changedSect.ok &&
    changedSect.state.player.techniques.known.cloudPiercingSword.level === 2,
  'changing to a nonfavored sect never removes a learned technique');
  const clearedSect = Techniques.grantXp(
    changedSect.state,
    'cloudPiercingSword',
    1,
    'combat',
    emptySect
  );
  ok(clearedSect.ok &&
    clearedSect.state.player.techniques.known.cloudPiercingSword.level === 2,
  'clearing sect context never removes a learned technique');

  const unlearned = freshModel();
  unchanged(
    Techniques.grantXp(
      unlearned,
      'cloudPiercingSword',
      1,
      'combat',
      emptySect
    ),
    unlearned,
    bytes(unlearned),
    'technique_not_learned',
    'unlearned technique XP'
  );
}

// Sect changes preserve the complete existing-XP-plus-grant pool.
{
  const favored = {
    sectId: 'azure-sword',
    favoredTechniqueIds: ['cloudPiercingSword'],
    favoredTags: []
  };
  const cases = [
    {
      startXp: 32,
      amount: 0,
      expected: { level: 2, xp: 2 },
      levelsGained: 1,
      capped: false,
      label: 'zero XP reconciles favored overflow that stays valid under neutral'
    },
    {
      startXp: 0,
      amount: 1000,
      expected: { level: 11, xp: 131 },
      levelsGained: 10,
      capped: false,
      label: 'large multi-level XP deducts each favored threshold once'
    },
    {
      startXp: 0,
      amount: 1000000000,
      expected: { level: 147, xp: 61040816 },
      levelsGained: 146,
      capped: false,
      label: 'one billion XP climbs deep into the MWI curve without capping'
    },
    {
      startXp: 0,
      amount: 100000000000,
      expected: { level: 200, xp: 0 },
      levelsGained: 199,
      capped: true,
      label: 'overflow beyond level 200 is discarded only at the cap'
    }
  ];
  for (const testCase of cases) {
    const model = learn(
      freshModel(),
      'cloudPiercingSword',
      1,
      testCase.startXp
    );
    const before = bytes(model);
    const out = Techniques.grantXp(
      model,
      'cloudPiercingSword',
      testCase.amount,
      'sect_training',
      favored
    );
    ok(out.ok &&
      out.levelsGained === testCase.levelsGained &&
      out.capped === testCase.capped,
    testCase.label + ' reports exact progression metadata');
    exact(
      out.ok
        ? out.state.player.techniques.known.cloudPiercingSword
        : null,
      testCase.expected,
      testCase.label + ' preserves the exact XP pool'
    );
    ok(bytes(model) === before,
      testCase.label + ' leaves input immutable');
  }
}

// One large XP grant crosses many levels, discards overflow and caps at 200.
{
  const model = learn(freshModel(), 'cloudPiercingSword');
  model.player.combat.loadouts[0].activeTechniques[0] = {
    techniqueId: 'cloudPiercingSword',
    condition: { type: 'always' }
  };
  const loadoutsBefore = bytes(model.player.combat.loadouts);
  const before = bytes(model);
  const out = Techniques.grantXp(
    model,
    'cloudPiercingSword',
    100000000000,
    'npc_guidance',
    emptySect
  );
  ok(out.ok && out.levelsGained === 199 && out.capped === true &&
    out.state.player.techniques.known.cloudPiercingSword.level === 200 &&
    out.state.player.techniques.known.cloudPiercingSword.xp === 0,
  'large XP crosses levels and caps at level 200 with zero XP');
  ok(bytes(out.state.player.combat.loadouts) === loadoutsBefore,
    'grantXp never mutates loadout configuration');
  ok(bytes(model) === before, 'large XP grant does not mutate input');

  const cappedBefore = bytes(out.state);
  const capped = Techniques.grantXp(
    out.state,
    'cloudPiercingSword',
    50,
    'combat',
    emptySect
  );
  ok(capped.ok && capped.levelsGained === 0 && capped.capped === true &&
    capped.state.player.techniques.known.cloudPiercingSword.xp === 0,
  'XP granted at cap remains zero');
  ok(bytes(out.state) === cappedBefore, 'cap handling preserves input');
}

// Active and passive effect scaling is exact and detached.
{
  exact(Techniques.scaledEffect('cloudPiercingSword', 10), {
    type: 'attack',
    multiplier: 1.7587,
    defenseIgnore: 0.25
  }, 'active numeric effects remap old Lv20 power onto MWI Lv100');
  exact(Techniques.scaledEffect('steadyBreath', 10), {
    maxQiPercent: 0.1231
  }, 'passive percentages use the remapped MWI level scale');
  exact(Techniques.scaledEffect('swordHeart', 20), {
    taggedDamageBonus: { sword: 0.0844 }
  }, 'nested passive percentages round to four decimals');
  exact(Techniques.scaledEffect('returningWindSlash', 20), {
    type: 'attack',
    hits: 2,
    multiplier: 0.7511
  }, 'active hit count remains structural while multiplier scales');
  exact(Techniques.scaledEffect('bindingTalisman', 20), {
    type: 'attack',
    multiplier: 0.9656,
    status: {
      id: 'slow',
      durationTicks: 12
    }
  }, 'active timing fields remain structural while damage scales');
  exact(Techniques.scaledEffect('cloudPiercingSword', 100), {
    type: 'attack',
    multiplier: 2.346,
    defenseIgnore: 0.25
  }, 'Lv100 restores the old Lv20 active power budget');
  ok(deeplyFrozen(Techniques.scaledEffect('ironBody', 4)),
    'scaled effects are deeply frozen');
}

// Query includes books, learning, eligibility, modifiers and frozen snapshots.
{
  const model = put(
    learn(freshModel('qi-8'), 'cloudPiercingSword', 10, 123),
    'techniqueBook:cloudPiercingSword',
    2
  );
  put(model, 'techniqueBook:stoneBreakingFist', 1);
  const context = {
    sectId: 'stone-hall',
    favoredTechniqueIds: [],
    favoredTags: ['fist']
  };
  const view = Techniques.queryLibrary(model, context);
  ok(deeplyFrozen(view) && view.techniques.length === 77,
    'query returns a deeply frozen complete technique library');
  const owned = libraryRow(view, 'cloudPiercingSword');
  ok(owned.ownedBooks === 2 && owned.learned === true &&
    owned.level === 10 && owned.xp === 123 &&
    owned.xpNeeded === 173 &&
    owned.eligible === true &&
    owned.effectiveRequiredRealmIndex === 9 &&
    owned.qiCost === 18 && owned.cooldownTicks === 30,
  'query reports owned books, learned progress, eligibility and base timing');
  exact(owned.effect, {
    type: 'attack',
    multiplier: 1.7587,
    defenseIgnore: 0.25
  }, 'query reports the learned level scaled effect');

  const favored = libraryRow(view, 'stoneBreakingFist');
  ok(favored.ownedBooks === 1 && favored.learned === false &&
    favored.level === 0 && favored.xp === 0 &&
    favored.xpNeeded === 0 &&
    favored.eligible === true &&
    favored.requiredRealmIndex === 0 &&
    favored.effectiveRequiredRealmIndex === 0,
  'query reports favored pre-learning eligibility at requirement minus one');
  exact(favored.sectModifiers, {
    requiredRealmReduction: 1,
    xpCostMultiplier: 0.9
  }, 'query exposes the exact favored sect modifiers');

  const snapshot = clone(view);
  model.player.inventory.stacks[
    'techniqueBook:cloudPiercingSword'
  ] = 99;
  model.player.techniques.known.cloudPiercingSword.level = 1;
  model.player.techniques.known.cloudPiercingSword.xp = 0;
  exact(view, snapshot, 'query is detached from later input mutation');

  const cleared = libraryRow(
    Techniques.queryLibrary(model, emptySect),
    'cloudPiercingSword'
  );
  ok(cleared.learned && cleared.level === 1,
    'query never hides learned techniques after sect context clears');
}

// Inventory.apply is the single atomic cost boundary.
{
  const bound = put(
    freshModel(),
    'techniqueBook:stoneBreakingFist',
    1
  );
  bound.player.inventory.bindings[
    'techniqueBook:stoneBreakingFist'
  ] = { equipment: 0, task: 1, formation: 0 };
  unchanged(
    Techniques.consumeBook(
      bound,
      'techniqueBook:stoneBreakingFist',
      emptySect
    ),
    bound,
    bytes(bound),
    'item_bound',
    'bound book cost'
  );

  const missing = freshModel();
  unchanged(
    Techniques.consumeBook(
      missing,
      'techniqueBook:stoneBreakingFist',
      emptySect
    ),
    missing,
    bytes(missing),
    'insufficient_items',
    'missing book cost'
  );
  ok(Inventory.availableQuantity(
    missing.player.inventory,
    'techniqueBook:stoneBreakingFist'
  ) === 0, 'atomic failure proof uses the real Stage 2 Inventory contract');

  const dirtyInventories = [];
  const unknownStack = put(
    freshModel(),
    'techniqueBook:stoneBreakingFist',
    1
  );
  unknownStack.player.inventory.stacks['intruder-item'] = 1;
  dirtyInventories.push(['unknown unrelated stack', unknownStack]);

  const malformedGrant = put(
    freshModel(),
    'techniqueBook:stoneBreakingFist',
    1
  );
  malformedGrant.player.inventory.capacityGrants.shop = '1';
  dirtyInventories.push(['malformed capacity grant', malformedGrant]);

  const extraBinding = put(
    freshModel(),
    'techniqueBook:stoneBreakingFist',
    2
  );
  extraBinding.player.inventory.bindings[
    'techniqueBook:stoneBreakingFist'
  ] = { equipment: 0, task: 1, formation: 0, injected: 1 };
  dirtyInventories.push(['extra binding field', extraBinding]);

  for (const [label, dirty] of dirtyInventories) {
    unchanged(
      Techniques.consumeBook(
        dirty,
        'techniqueBook:stoneBreakingFist',
        emptySect
      ),
      dirty,
      bytes(dirty),
      'inventory_apply_failed',
      label
    );
  }
}

// Accessors, proxies, cycles and malformed canonical state fail closed.
{
  let getterRuns = 0;
  const accessor = put(
    freshModel(),
    'techniqueBook:stoneBreakingFist',
    1
  );
  Object.defineProperty(accessor.player.techniques, 'known', {
    enumerable: true,
    get() {
      getterRuns++;
      accessor.player.inventory.stacks[
        'techniqueBook:stoneBreakingFist'
      ] = 999;
      return {};
    }
  });
  const inventoryBefore = bytes(accessor.player.inventory);
  const accessorOut = Techniques.consumeBook(
    accessor,
    'techniqueBook:stoneBreakingFist',
    emptySect
  );
  ok(!accessorOut.ok && accessorOut.code === 'invalid_state' &&
    accessorOut.state === accessor && getterRuns === 0 &&
    bytes(accessor.player.inventory) === inventoryBefore,
  'accessor state is rejected without invoking its getter or charging cost');

  let proxyRuns = 0;
  const target = freshModel();
  const proxied = new Proxy(target, {
    get(object, key) {
      proxyRuns++;
      return object[key];
    }
  });
  const proxyOut = Techniques.grantXp(
    proxied,
    'cloudPiercingSword',
    1,
    'combat',
    emptySect
  );
  ok(!proxyOut.ok && proxyOut.code === 'invalid_state' &&
    proxyOut.state === proxied && proxyRuns === 0,
  'Node proxy state is rejected without reading properties');

  const cyclic = freshModel();
  cyclic.player.techniques.loop = cyclic;
  const cyclicOut = Techniques.grantXp(
    cyclic,
    'cloudPiercingSword',
    1,
    'combat',
    emptySect
  );
  ok(!cyclicOut.ok && cyclicOut.code === 'invalid_state' &&
    cyclicOut.state === cyclic,
  'cyclic state is rejected without throwing');

  let sectGetterRuns = 0;
  const hostileSect = { sectId: null, favoredTechniqueIds: [] };
  Object.defineProperty(hostileSect, 'favoredTags', {
    enumerable: true,
    get() {
      sectGetterRuns++;
      return ['sword'];
    }
  });
  exact(Techniques.sectModifiers('cloudPiercingSword', hostileSect), {
    requiredRealmReduction: 0,
    xpCostMultiplier: 1
  }, 'hostile sect context fails closed to neutral modifiers');
  ok(sectGetterRuns === 0, 'sect modifier inspection never invokes accessors');

  const malformed = learn(freshModel(), 'cloudPiercingSword');
  malformed.player.techniques.known.cloudPiercingSword.level = 201;
  unchanged(
    Techniques.grantXp(
      malformed,
      'cloudPiercingSword',
      1,
      'combat',
      emptySect
    ),
    malformed,
    bytes(malformed),
    'invalid_state',
    'out-of-range known technique level'
  );
  for (const impossibleXp of [33, 34]) {
    const impossible = learn(
      freshModel(),
      'cloudPiercingSword',
      1,
      impossibleXp
    );
    unchanged(
      Techniques.grantXp(
        impossible,
        'cloudPiercingSword',
        1,
        'combat',
        emptySect
      ),
      impossible,
      bytes(impossible),
      'invalid_state',
      'level-one XP at or above its neutral threshold'
    );
  }
  const empty = Techniques.queryLibrary(accessor, emptySect);
  ok(deeplyFrozen(empty) && empty.techniques.length === 0,
    'query returns a frozen empty library on hostile state');
}

// Browser UMD uses the Task 3 structuredClone probe and fails closed.
{
  const source = fs.readFileSync('./core/techniques.js', 'utf8');
  const applyCalls = [];
  let rejectApply = true;
  const inventory = {
    apply(value, delta) {
      applyCalls.push(clone(delta));
      if (rejectApply) {
        return { ok: false, code: 'blocked', value: clone(value) };
      }
      const next = clone(value);
      for (const [itemId, amount] of Object.entries(delta)) {
        const quantity = (next.stacks[itemId] || 0) + amount;
        if (quantity > 0) next.stacks[itemId] = quantity;
        else delete next.stacks[itemId];
      }
      return { ok: true, code: 'ok', value: next };
    }
  };
  const context = {
    structuredClone: globalThis.structuredClone,
    Inventory: inventory,
    TechniqueContent: {
      TECHNIQUES: clone(TechniqueContent.TECHNIQUES)
    },
    RealmContent: {
      REALMS: clone(RealmContent.REALMS)
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  ok(Object.isFrozen(context.Techniques),
    'browser UMD installs one frozen Techniques global');
  exact(Array.from(Object.keys(context.Techniques)), Object.keys(Techniques),
    'browser and CommonJS paths expose the same API order');

  const rejected = put(
    freshModel(),
    'techniqueBook:stoneBreakingFist',
    1
  );
  const rejectedBefore = bytes(rejected);
  const rejectedOut = context.Techniques.consumeBook(
    rejected,
    'techniqueBook:stoneBreakingFist',
    clone(emptySect)
  );
  ok(!rejectedOut.ok && rejectedOut.code === 'blocked' &&
    rejectedOut.state === rejected && bytes(rejected) === rejectedBefore &&
    applyCalls.length === 1 &&
    applyCalls[0]['techniqueBook:stoneBreakingFist'] === -1,
  'browser inventory failure rolls back state after one exact apply call');

  rejectApply = false;
  const accepted = context.Techniques.consumeBook(
    rejected,
    'techniqueBook:stoneBreakingFist',
    clone(emptySect)
  );
  ok(accepted.ok &&
    accepted.state.player.techniques.known.stoneBreakingFist.level === 1 &&
    applyCalls.length === 2,
  'browser UMD learns only after Inventory.apply succeeds');

  let topProxyTraps = 0;
  const topProxyTarget = freshModel();
  const topProxy = new Proxy(topProxyTarget, {
    getPrototypeOf(target) {
      topProxyTraps++;
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      topProxyTraps++;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      topProxyTraps++;
      return Reflect.getOwnPropertyDescriptor(target, key);
    }
  });
  const topProxyBefore = bytes(topProxyTarget);
  const topProxyOut = context.Techniques.grantXp(
    topProxy,
    'cloudPiercingSword',
    1,
    'combat',
    clone(emptySect)
  );
  ok(!topProxyOut.ok && topProxyOut.code === 'invalid_state' &&
    topProxyOut.state === topProxy &&
    bytes(topProxyTarget) === topProxyBefore &&
    topProxyTraps > 0,
  'browser structuredClone rejects a top-level Proxy without data mutation');

  let nestedProxyTraps = 0;
  const nestedProxyModel = freshModel();
  const nestedKnown = nestedProxyModel.player.techniques.known;
  nestedProxyModel.player.techniques.known = new Proxy(nestedKnown, {
    getPrototypeOf(target) {
      nestedProxyTraps++;
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      nestedProxyTraps++;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      nestedProxyTraps++;
      return Reflect.getOwnPropertyDescriptor(target, key);
    }
  });
  const nestedProxyOut = context.Techniques.queryLibrary(
    nestedProxyModel,
    clone(emptySect)
  );
  ok(nestedProxyOut.techniques.length === 0 && nestedProxyTraps > 0,
    'browser structuredClone rejects a nested Proxy and query fails closed');

  let browserGetterRuns = 0;
  const browserAccessor = freshModel();
  Object.defineProperty(browserAccessor.player.techniques, 'known', {
    enumerable: true,
    get() {
      browserGetterRuns++;
      return {};
    }
  });
  const browserAccessorOut = context.Techniques.grantXp(
    browserAccessor,
    'cloudPiercingSword',
    1,
    'combat',
    clone(emptySect)
  );
  ok(!browserAccessorOut.ok &&
    browserAccessorOut.code === 'invalid_state' &&
    browserGetterRuns === 0,
  'browser descriptor preflight rejects accessor state without side effects');

  const noCloneContext = {
    Inventory: inventory,
    TechniqueContent: context.TechniqueContent,
    RealmContent: context.RealmContent
  };
  vm.createContext(noCloneContext);
  vm.runInContext(source, noCloneContext);
  const noCloneModel = freshModel();
  const noCloneOut = noCloneContext.Techniques.grantXp(
    noCloneModel,
    'cloudPiercingSword',
    1,
    'combat',
    clone(emptySect)
  );
  ok(!noCloneOut.ok && noCloneOut.code === 'invalid_state' &&
    noCloneOut.state === noCloneModel,
  'browser UMD fails closed when structuredClone is unavailable');
  ok(noCloneContext.Techniques.queryLibrary(
    noCloneModel,
    clone(emptySect)
  ).techniques.length === 0,
  'browser query fails closed when structuredClone is unavailable');
}

console.log(
  `\n=== Stage 3 功法成长自测：${pass} 通过 / ${fail} 失败 ===`
);
if (fail) process.exit(1);
