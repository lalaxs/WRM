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
    Object.keys(value).every(function (key) {
      return deeplyFrozen(value[key]);
    });
}

function freshModel() {
  return Stage3State.normalize(Stage2State.createDefaults());
}

function reward(source, items, currency, rngState) {
  return {
    ok: true,
    code: 'ok',
    source: source,
    items: items,
    currency: currency,
    rngState: rngState
  };
}

function setPending(model, id, nextLootId) {
  model.systems.combat.pendingLoot = {
    id: id,
    source: { type: 'enemy', id: 'thornHare' },
    items: { brokenFang: 1 },
    currency: 0,
    createdAtMs: 50
  };
  model.systems.combat.nextLootId = nextLootId;
  return model;
}

function unchanged(result, model, before, code, message) {
  ok(!result.ok && result.code === code && result.state === model,
    message + ' returns the original state with ' + code);
  ok(bytes(model) === before, message + ' preserves input byte-for-byte');
}

const Stage2State = require('../core/stage2-state.js');
const Stage3State = require('../core/stage3-state.js');
const CombatContent = require('../content/combat.js');
const Inventory = require('../core/inventory.js');
const GameRandom = require('../core/random.js');
const beforeGlobal = globalThis.CombatRewards;
const Rewards = require('../core/combat-rewards.js');

ok(globalThis.CombatRewards === beforeGlobal,
  'CommonJS loading does not attach a browser global');
ok(Object.isFrozen(Rewards), 'CombatRewards API is frozen');
exact(Object.keys(Rewards), [
  'rollEnemyLoot',
  'rollFirstClearRewards',
  'applyOrPend',
  'claimPending',
  'queryPending',
  'grantEquipment'
], 'CombatRewards exposes the declared reward operations in order');

{
  [
    {
      name: 'enemy source with unreachable item',
      value: reward(
        { type: 'enemy', id: 'thornHare' },
        { brokenFang: 1, ascensionBlade: 1 },
        0,
        1
      )
    },
    {
      name: 'enemy source with unreachable currency',
      value: reward(
        { type: 'enemy', id: 'thornHare' },
        { brokenFang: 1 },
        Number.MAX_SAFE_INTEGER,
        1
      )
    }
  ].forEach(function (fixture) {
    const model = freshModel();
    const before = bytes(model);
    unchanged(
      Rewards.applyOrPend(model, fixture.value, 1),
      model,
      before,
      'invalid_rewards',
      fixture.name
    );
  });

  const forgedPending = freshModel();
  forgedPending.systems.combat.pendingLoot = {
    id: 'combat-loot-1',
    source: { type: 'enemy', id: 'thornHare' },
    items: { brokenFang: 1, ascensionBlade: 1 },
    currency: 0,
    createdAtMs: 1
  };
  forgedPending.systems.combat.nextLootId = 2;
  const forgedBytes = bytes(forgedPending);
  ok(Rewards.queryPending(forgedPending) === null,
    'queryPending rejects source-unreachable pending loot');
  unchanged(
    Rewards.claimPending(forgedPending),
    forgedPending,
    forgedBytes,
    'invalid_state',
    'claim source-unreachable pending loot'
  );

  const collidingPending = freshModel();
  collidingPending.systems.combat.pendingLoot = {
    id: 'combat-loot-1',
    source: { type: 'enemy', id: 'thornHare' },
    items: { 'brokenFang:1|grilledCarp': 1 },
    currency: 0,
    createdAtMs: 1
  };
  collidingPending.systems.combat.nextLootId = 2;
  const collidingBytes = bytes(collidingPending);
  ok(Rewards.queryPending(collidingPending) === null,
    'queryPending rejects structurally colliding item IDs');
  unchanged(
    Rewards.claimPending(collidingPending),
    collidingPending,
    collidingBytes,
    'invalid_state',
    'claim structurally colliding pending loot'
  );
}

// Ordered rows: guaranteed variable quantity consumes one draw, optional
// fixed quantity consumes one chance draw, and a miss consumes no extra draw.
{
  const hitLow = Rewards.rollEnemyLoot('thornHare', 1);
  exact(hitLow, {
    ok: true,
    code: 'ok',
    source: { type: 'enemy', id: 'thornHare' },
    items: { brokenFang: 1, grilledCarp: 1 },
    currency: 0,
    rngState: 67634689
  }, 'normal loot consumes quantity then chance in content order');
  ok(deeplyFrozen(hitLow), 'rolled enemy loot is deeply frozen');

  const miss = Rewards.rollEnemyLoot('thornHare', 10);
  exact(miss.items, { brokenFang: 1 },
    'a missed optional row grants no item');
  ok(miss.rngState === 671267850,
    'a missed fixed-quantity row consumes exactly one chance draw');

  const hitHigh = Rewards.rollEnemyLoot('thornHare', 8192);
  exact(hitHigh.items, { brokenFang: 2, grilledCarp: 1 },
    'inclusive quantity draw reaches the guaranteed maximum');
  ok(hitHigh.rngState === 13148770,
    'guaranteed quantity and optional chance consume exactly two draws');
}

// Optional item pools reuse their row chance draw. No hidden pool draw may
// shift the saved stream.
{
  const secondEquipment = Rewards.rollEnemyLoot('caveWarden', 7);
  exact(secondEquipment.items, { brokenFang: 2, cloudRobe: 1 },
    'a hit selects the second ordered equipment from its chance draw');
  ok(secondEquipment.rngState === 3882205507,
    'elite rows consume quantity plus exactly two chance draws');

  const secondBook = Rewards.rollEnemyLoot('caveWarden', 21);
  exact(secondBook.items, {
    brokenFang: 2,
    'techniqueBook:returningWindSlash': 1
  }, 'the book pool selection is deterministic and content ordered');
  ok(secondBook.rngState === 121328405,
    'a pool hit consumes no extra item-selection draw');

  const boss = Rewards.rollEnemyLoot('breathSerpent', 1);
  exact(boss.items, {
    brokenFang: 5,
    cloudwoodSword: 1,
    'techniqueBook:cloudPiercingSword': 1
  }, 'fixed guaranteed boss quantity consumes no draw before chance rows');
  ok(boss.rngState === 67634689,
    'boss fixed quantity plus two optional rows consume two draws');
}

// The same seed and input must remain byte-identical. Fixed first-clear
// rewards preserve the seed exactly.
{
  const left = Rewards.rollEnemyLoot('earthVeinApe', 123456);
  const right = Rewards.rollEnemyLoot('earthVeinApe', 123456);
  ok(bytes(left) === bytes(right),
    'identical enemy and seed return byte-identical loot and next seed');

  const firstClear = Rewards.rollFirstClearRewards('breathCave', 42);
  exact(firstClear, {
    ok: true,
    code: 'ok',
    source: { type: 'dungeon-first-clear', id: 'breathCave' },
    items: {
      breathJade: 1,
      'techniqueBook:cloudPiercingSword': 1
    },
    currency: 0,
    rngState: 42
  }, 'first-clear rewards are fixed and consume zero RNG draws');
  ok(deeplyFrozen(firstClear),
    'rolled first-clear rewards are deeply frozen');
}

// Sufficient space applies items and currency together, advances the saved
// RNG once to the roll result, and creates no pending batch.
{
  const model = freshModel();
  model.rngState = 100;
  model.player.lingshi = 7;
  const before = bytes(model);
  const rolled = reward(
    { type: 'enemy', id: 'thornHare' },
    { brokenFang: 2, grilledCarp: 1 },
    0,
    200
  );
  const result = Rewards.applyOrPend(model, rolled, 1234);
  ok(result.ok && result.code === 'ok' && result.state !== model,
    'applyOrPend returns a new successful state');
  exact(result.state.player.inventory.stacks, {
    brokenFang: 2,
    grilledCarp: 1
  }, 'the whole item batch is granted');
  ok(result.state.player.lingshi === 7,
    'authoritative zero currency is applied in the same state transaction');
  ok(result.state.rngState === 200,
    'the persisted RNG advances to the loot roll result');
  ok(result.state.systems.combat.pendingLoot === null &&
    result.state.systems.combat.nextLootId === 1,
  'successful application creates no pending loot or ID');
  exact(result.result, {
    items: { brokenFang: 2, grilledCarp: 1 },
    currency: 0,
    pendingLootId: null
  }, 'successful application reports the canonical complete batch');
  ok(result.warning === null && bytes(model) === before,
    'successful application is pure and has no warning');
  ok(deeplyFrozen(result), 'successful transaction output is deeply frozen');
}

// Inventory full stores exactly one canonical batch. Inventory, currency and
// awarded items remain unchanged; only RNG and pending bookkeeping advance.
{
  const model = freshModel();
  model.rngState = 100;
  model.player.lingshi = 7;
  model.player.inventory.capacity = 1;
  model.player.inventory.stacks.brokenFang = 3;
  const inventoryBefore = bytes(model.player.inventory);
  const rolled = reward(
    { type: 'enemy', id: 'grayWolf' },
    { brokenFang: 2, grilledCarp: 1 },
    0,
    200
  );
  const result = Rewards.applyOrPend(model, rolled, 9876.5);
  ok(result.ok && result.code === 'inventory_full' &&
    result.warning === 'inventory_full',
  'full inventory returns the inventory_full warning without failing combat');
  ok(bytes(result.state.player.inventory) === inventoryBefore &&
    result.state.player.lingshi === 7,
  'full inventory grants neither items nor currency');
  ok(result.state.rngState === 200,
    'pending loot preserves the already-consumed RNG result');
  exact(result.state.systems.combat.pendingLoot, {
    id: 'combat-loot-1',
    source: { type: 'enemy', id: 'grayWolf' },
    items: { brokenFang: 2, grilledCarp: 1 },
    currency: 0,
    createdAtMs: 9876.5
  }, 'full inventory stores exactly one strict pending batch');
  ok(result.state.systems.combat.nextLootId === 2 &&
    result.result.pendingLootId === 'combat-loot-1',
  'pending creation increments nextLootId exactly once and reports the batch');
  ok(deeplyFrozen(result), 'pending transaction output is deeply frozen');

  const roundTrip = Stage3State.normalize(
    JSON.parse(JSON.stringify(result.state))
  );
  exact(roundTrip.systems.combat, result.state.systems.combat,
    'pending loot and its next ID survive JSON normalization round-trip');
}

// Existing pending loot merges the new batch so continuous combat can keep going.
{
  const model = freshModel();
  model.rngState = 123;
  model.systems.combat.pendingLoot = {
    id: 'combat-loot-4',
    source: { type: 'enemy', id: 'thornHare' },
    items: { brokenFang: 1 },
    currency: 0,
    createdAtMs: 50
  };
  model.systems.combat.nextLootId = 5;
  const before = bytes(model);
  const result = Rewards.applyOrPend(
    model,
    reward(
      { type: 'enemy', id: 'grayWolf' },
      { brokenFang: 1 },
      0,
      999
    ),
    60
  );
  ok(result.ok && result.code === 'inventory_full' &&
    result.warning === 'inventory_full',
  'an existing pending batch merges a new reward');
  exact(result.state.systems.combat.pendingLoot, {
    id: 'combat-loot-4',
    source: { type: 'enemy', id: 'thornHare' },
    items: { brokenFang: 2 },
    currency: 0,
    createdAtMs: 50
  }, 'merged pending keeps the original id and accumulates items/currency');
  ok(result.state.systems.combat.nextLootId === 5 &&
    result.state.rngState === 999 &&
    result.state.player.lingshi === model.player.lingshi,
  'merge advances RNG without minting a new pending id or granting currency');
  ok(bytes(model) === before,
    'merge leaves the caller model byte-for-byte unchanged');
}

// A persisted pending ID is canonical only when its positive safe integer is
// exactly one less than nextLootId. Every public pending path must reject the
// same malformed state without consuming or replacing it.
{
  const malformed = [
    ['combat-loot-x', 2, 'nonnumeric pending ID'],
    ['combat-loot-01', 2, 'leading-zero pending ID'],
    [
      'combat-loot-' + Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      'pending ID beyond the last incrementable integer'
    ],
    ['combat-loot-4', 3, 'nextLootId lower than pending ID'],
    ['combat-loot-4', 4, 'nextLootId equal to pending ID'],
    ['combat-loot-4', 6, 'nextLootId higher than pending ID plus one']
  ];
  malformed.forEach(function (fixture) {
    const model = setPending(freshModel(), fixture[0], fixture[1]);
    const before = bytes(model);
    ok(Rewards.queryPending(model) === null,
      fixture[2] + ' is hidden by queryPending');
    unchanged(
      Rewards.claimPending(model),
      model,
      before,
      'invalid_state',
      fixture[2] + ' claim'
    );
    unchanged(
      Rewards.applyOrPend(
        model,
        reward(
          { type: 'enemy', id: 'grayWolf' },
          { brokenFang: 1 },
          0,
          999
        ),
        60
      ),
      model,
      before,
      'invalid_state',
      fixture[2] + ' new reward'
    );
  });
}

// The counter itself must be a positive safe integer. Exhaustion is distinct
// from malformed state and is detected before any inventory transaction.
{
  [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1].forEach(function (
    nextLootId
  ) {
    const model = freshModel();
    model.systems.combat.nextLootId = nextLootId;
    const before = bytes(model);
    unchanged(
      Rewards.applyOrPend(
        model,
        reward(
          { type: 'enemy', id: 'thornHare' },
          { brokenFang: 1 },
          0,
          2
        ),
        1
      ),
      model,
      before,
      'invalid_state',
      'noncanonical nextLootId ' + nextLootId
    );
  });

  const exhausted = freshModel();
  exhausted.systems.combat.nextLootId = Number.MAX_SAFE_INTEGER;
  const before = bytes(exhausted);
  unchanged(
    Rewards.applyOrPend(
      exhausted,
      reward(
        { type: 'enemy', id: 'thornHare' },
        { brokenFang: 1 },
        0,
        2
      ),
      1
    ),
    exhausted,
    before,
    'loot_id_exhausted',
    'exhausted pending ID counter'
  );
}

// Claim applies the original items and currency once, then clears pending.
{
  const model = freshModel();
  model.player.lingshi = 5;
  model.systems.combat.pendingLoot = {
    id: 'combat-loot-2',
    source: { type: 'dungeon-first-clear', id: 'breathCave' },
    items: {
      breathJade: 1,
      'techniqueBook:cloudPiercingSword': 1
    },
    currency: 0,
    createdAtMs: 70
  };
  model.systems.combat.nextLootId = 3;
  const claimed = Rewards.claimPending(model);
  ok(claimed.ok && claimed.code === 'ok',
    'claim succeeds when the whole pending batch fits');
  exact(claimed.state.player.inventory.stacks, {
    breathJade: 1,
    'techniqueBook:cloudPiercingSword': 1
  }, 'claim grants every pending item once');
  ok(claimed.state.player.lingshi === 5 &&
    claimed.state.systems.combat.pendingLoot === null &&
    claimed.state.systems.combat.nextLootId === 3,
  'claim grants currency, clears pending, and never reuses the ID');
  exact(claimed.result, {
    items: {
      breathJade: 1,
      'techniqueBook:cloudPiercingSword': 1
    },
    currency: 0,
    pendingLootId: null
  }, 'claim reports the complete canonical batch');

  const repeated = Rewards.claimPending(claimed.state);
  unchanged(
    repeated,
    claimed.state,
    bytes(claimed.state),
    'no_pending_loot',
    'repeated claim'
  );
}

// The highest incrementable pending ID can still be claimed, but its exhausted
// successor can never create another batch or reuse the claimed ID.
{
  const lastPendingId = Number.MAX_SAFE_INTEGER - 1;
  const model = setPending(
    freshModel(),
    'combat-loot-' + lastPendingId,
    Number.MAX_SAFE_INTEGER
  );
  const view = Rewards.queryPending(model);
  ok(view && view.id === 'combat-loot-' + lastPendingId,
    'the highest incrementable pending ID remains queryable');
  const claimed = Rewards.claimPending(model);
  ok(claimed.ok &&
    claimed.state.systems.combat.pendingLoot === null &&
    claimed.state.systems.combat.nextLootId === Number.MAX_SAFE_INTEGER,
  'the highest incrementable pending ID remains claimable exactly once');
  const claimedClone = clone(claimed.state);
  const before = bytes(claimedClone);
  unchanged(
    Rewards.applyOrPend(
      claimedClone,
      reward(
        { type: 'enemy', id: 'grayWolf' },
        { brokenFang: 1 },
        0,
        3
      ),
      2
    ),
    claimedClone,
    before,
    'loot_id_exhausted',
    'reward after claiming the last incrementable pending ID'
  );
}

// Claiming N preserves nextLootId=N+1, so a later full batch gets N+1 and
// advances to N+2 rather than reusing the claimed identifier.
{
  const model = setPending(freshModel(), 'combat-loot-4', 5);
  const claimed = Rewards.claimPending(model);
  ok(claimed.ok, 'canonical pending ID can be claimed before repending');
  const next = clone(claimed.state);
  next.player.inventory.capacity = 1;
  const repended = Rewards.applyOrPend(
    next,
    reward(
      { type: 'enemy', id: 'caveWarden' },
      { brokenFang: 2, cloudwoodSword: 1 },
      0,
      4
    ),
    3
  );
  ok(repended.ok && repended.code === 'ok' &&
    repended.state.systems.combat.pendingLoot === null &&
    repended.state.systems.combat.nextLootId === 5 &&
    repended.result.warnings[0] ===
      'equipment_lost_inventory_full',
  'full bag rejects equipment without creating or reusing a pending ID');
}

// Failed claim preserves pending, inventory, currency, RNG and ID exactly.
{
  const model = freshModel();
  model.player.lingshi = 5;
  model.player.inventory.capacity = 1;
  model.player.inventory.stacks.spiritRice = 1;
  model.systems.combat.pendingLoot = {
    id: 'combat-loot-8',
    source: { type: 'enemy', id: 'thornHare' },
    items: { brokenFang: 1 },
    currency: 0,
    createdAtMs: 70
  };
  model.systems.combat.nextLootId = 9;
  const before = bytes(model);
  const result = Rewards.claimPending(model);
  unchanged(
    result,
    model,
    before,
    'inventory_full',
    'claim without enough space'
  );
  ok(result.warning === 'inventory_full',
    'failed claim returns the inventory_full warning');
}

// Stage 2 slot and binding rules: adding to a bound equipment stack consumes
// no new slot, while an equipment + book batch needs two distinct free slots.
{
  const model = freshModel();
  model.player.inventory.capacity = 2;
  model.player.inventory.stacks.brokenFang = 1;
  model.player.inventory.stacks.cloudwoodSword = 1;
  model.player.inventory.bindings.cloudwoodSword = {
    equipment: 1,
    task: 0,
    formation: 0
  };
  const stacked = Rewards.applyOrPend(
    model,
    reward(
      { type: 'enemy', id: 'caveWarden' },
      { brokenFang: 2, cloudwoodSword: 1 },
      0,
      2
    ),
    1
  );
  ok(stacked.ok &&
    stacked.state.player.inventory.stacks.brokenFang === 3 &&
    stacked.state.player.inventory.stacks.cloudwoodSword === 1 &&
    stacked.state.player.inventory.bindings.cloudwoodSword.equipment === 1 &&
    stacked.result.warnings[0] === 'equipment_lost_inventory_full',
  'legacy equipment rewards become instances and are lost when the shared bag is full');

  const empty = freshModel();
  empty.player.inventory.capacity = 1;
  const tooManyKinds = Rewards.applyOrPend(
    empty,
    reward(
      { type: 'enemy', id: 'grayWolf' },
      {
        brokenFang: 2,
        grilledCarp: 1
      },
      0,
      2
    ),
    1
  );
  ok(tooManyKinds.ok &&
    tooManyKinds.code === 'inventory_full' &&
    tooManyKinds.state.systems.combat.pendingLoot !== null &&
    Object.keys(tooManyKinds.state.player.inventory.stacks).length === 0,
  'distinct stack kinds that exceed capacity become one pending batch');
}

// Pending query is a detached, deeply frozen canonical view.
{
  const model = freshModel();
  model.systems.combat.pendingLoot = {
    id: 'combat-loot-3',
    source: { type: 'enemy', id: 'thornHare' },
    items: { brokenFang: 2 },
    currency: 0,
    createdAtMs: 9
  };
  model.systems.combat.nextLootId = 4;
  const view = Rewards.queryPending(model);
  exact(view, model.systems.combat.pendingLoot,
    'queryPending exposes the canonical pending shape');
  ok(view !== model.systems.combat.pendingLoot &&
    view.items !== model.systems.combat.pendingLoot.items &&
    deeplyFrozen(view),
  'queryPending returns no mutable reference');
  try {
    view.items.brokenFang = 99;
  } catch (_) {}
  ok(model.systems.combat.pendingLoot.items.brokenFang === 2,
    'mutating a pending view cannot reach state');
  ok(Rewards.queryPending(freshModel()) === null,
    'queryPending returns null when no loot is pending');
}

// Invalid values and descriptor-hostile inputs fail closed without invoking
// getters or mutating caller data.
{
  const invalidSeed = Rewards.rollEnemyLoot('thornHare', NaN);
  ok(!invalidSeed.ok && invalidSeed.code === 'invalid_rng',
    'noncanonical RNG state fails closed');
  const unknownEnemy = Rewards.rollEnemyLoot('missing-enemy', 1);
  ok(!unknownEnemy.ok && unknownEnemy.code === 'invalid_enemy' &&
    unknownEnemy.rngState === 1,
  'unknown enemy consumes no RNG');
  const unknownDungeon = Rewards.rollFirstClearRewards(
    'missing-dungeon',
    1
  );
  ok(!unknownDungeon.ok &&
    unknownDungeon.code === 'invalid_dungeon' &&
    unknownDungeon.rngState === 1,
  'unknown first-clear source consumes no RNG');

  let getterHits = 0;
  const hostileRewards = {};
  Object.defineProperty(hostileRewards, 'ok', {
    enumerable: true,
    get: function () {
      getterHits++;
      return true;
    }
  });
  const model = freshModel();
  const before = bytes(model);
  const accessorResult = Rewards.applyOrPend(model, hostileRewards, 1);
  unchanged(
    accessorResult,
    model,
    before,
    'invalid_rewards',
    'accessor reward input'
  );
  ok(getterHits === 0, 'reward accessors are never invoked');

  const proxyResult = Rewards.applyOrPend(
    model,
    new Proxy({}, {
      ownKeys: function () { throw new Error('proxy trap'); }
    }),
    1
  );
  unchanged(
    proxyResult,
    model,
    before,
    'invalid_rewards',
    'proxy reward input'
  );

  let stateGetterHits = 0;
  const hostileModel = freshModel();
  Object.defineProperty(hostileModel.systems.combat, 'pendingLoot', {
    enumerable: true,
    configurable: true,
    get: function () {
      stateGetterHits++;
      return null;
    }
  });
  const hostileBefore = bytes(freshModel());
  const hostileState = Rewards.applyOrPend(
    hostileModel,
    reward(
      { type: 'enemy', id: 'thornHare' },
      { brokenFang: 1 },
      0,
      2
    ),
    1
  );
  ok(!hostileState.ok && hostileState.code === 'invalid_state' &&
    hostileState.state === hostileModel,
  'state accessors fail closed');
  ok(stateGetterHits === 0 && bytes(freshModel()) === hostileBefore,
    'state accessors are never invoked');
}

// Browser UMD attaches only CombatRewards and uses one Inventory.apply call
// for each batch attempt.
{
  const source = fs.readFileSync(
    require.resolve('../core/combat-rewards.js'),
    'utf8'
  );
  let applyCalls = 0;
  const browserInventory = Object.freeze({
    apply: function (inventory, delta) {
      applyCalls++;
      return Inventory.apply(inventory, delta);
    },
    addEquipment: Inventory.addEquipment
  });
  const context = {
    CombatContent: CombatContent,
    Inventory: browserInventory,
    GameRandom: GameRandom,
    Equipment: require('../core/equipment.js'),
    structuredClone: structuredClone
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  ok(context.CombatRewards &&
    Object.isFrozen(context.CombatRewards) &&
    Object.keys(context.CombatRewards).join(',') ===
      'rollEnemyLoot,rollFirstClearRewards,applyOrPend,claimPending,queryPending,grantEquipment',
  'browser UMD exposes only the frozen CombatRewards API');

  const browserModel = clone(freshModel());
  const browserResult = context.CombatRewards.applyOrPend(
    browserModel,
    reward(
      { type: 'enemy', id: 'thornHare' },
      { brokenFang: 1 },
      0,
      2
    ),
    1
  );
  ok(browserResult.ok && applyCalls === 1,
    'applyOrPend attempts the whole batch with one Inventory.apply call');

  let browserGetterHits = 0;
  const browserAccessorReward = {};
  Object.defineProperty(browserAccessorReward, 'ok', {
    enumerable: true,
    get: function () {
      browserGetterHits++;
      return true;
    }
  });
  const rejectedAccessor = context.CombatRewards.applyOrPend(
    clone(freshModel()),
    browserAccessorReward,
    1
  );
  ok(!rejectedAccessor.ok &&
    rejectedAccessor.code === 'invalid_rewards' &&
    browserGetterHits === 0,
  'browser UMD rejects reward accessors before structured-clone probing');

  const inventoryCallsBeforeInvalidIds = applyCalls;
  const mismatchedPending = setPending(
    clone(freshModel()),
    'combat-loot-2',
    2
  );
  const mismatchedClaim = context.CombatRewards.claimPending(
    mismatchedPending
  );
  const mismatchedApply = context.CombatRewards.applyOrPend(
    mismatchedPending,
    reward(
      { type: 'enemy', id: 'grayWolf' },
      { brokenFang: 1 },
      0,
      3
    ),
    2
  );
  const exhausted = clone(freshModel());
  exhausted.systems.combat.nextLootId = Number.MAX_SAFE_INTEGER;
  const exhaustedApply = context.CombatRewards.applyOrPend(
    exhausted,
    reward(
      { type: 'enemy', id: 'grayWolf' },
      { brokenFang: 1 },
      0,
      3
    ),
    2
  );
  ok(!mismatchedClaim.ok &&
    mismatchedClaim.code === 'invalid_state' &&
    !mismatchedApply.ok &&
    mismatchedApply.code === 'invalid_state' &&
    !exhaustedApply.ok &&
    exhaustedApply.code === 'loot_id_exhausted',
  'browser UMD returns stable errors for mismatched and exhausted IDs');
  ok(applyCalls === inventoryCallsBeforeInvalidIds,
    'invalid or exhausted pending IDs never call Inventory.apply');
}

// Hostile browser dependencies are inspected descriptor-first and collapse to
// an empty content seam without running accessors.
{
  const source = fs.readFileSync(
    require.resolve('../core/combat-rewards.js'),
    'utf8'
  );
  let dependencyGetterHits = 0;
  const hostileContent = {};
  Object.defineProperty(hostileContent, 'ENEMIES', {
    enumerable: true,
    get: function () {
      dependencyGetterHits++;
      return CombatContent.ENEMIES;
    }
  });
  const context = {
    CombatContent: hostileContent,
    Inventory: Inventory,
    GameRandom: GameRandom,
    structuredClone: structuredClone
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  const rejected = context.CombatRewards.rollEnemyLoot('thornHare', 1);
  ok(!rejected.ok && rejected.code === 'invalid_enemy',
    'hostile content dependencies fail closed');
  ok(dependencyGetterHits === 0,
    'content dependency accessors are never invoked');
}

const source = fs.readFileSync(
  require.resolve('../core/combat-rewards.js'),
  'utf8'
);
ok(!/Math\.random|localStorage|Platform\.|SaveSystem|document\.|canvas|toast\(/.test(
  source
), 'CombatRewards remains a pure core module');

console.log(
  `\n=== Stage 3 战斗奖励自测：${pass} 通过 / ${fail} 失败 ===`
);
if (fail) process.exitCode = 1;
