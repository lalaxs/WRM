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

const Stage2State = require('../core/stage2-state.js');
const Inventory = require('../core/inventory.js');
const HomesteadContent = require('../content/homestead.js');
const beforeGlobal = globalThis.Formations;
const Formations = require('../core/formations.js');

ok(globalThis.Formations === beforeGlobal,
  'CommonJS loading does not attach a browser global');
ok(Object.isFrozen(Formations), 'Formations API is frozen');
exact(Object.keys(Formations), [
  'recordCrafted', 'equip', 'unequip', 'effects', 'query'
], 'Formations exposes only the five declared pure operations in order');

function freshModel(slotCount) {
  const model = Stage2State.createDefaults();
  model.systems.homestead.formations = {
    slots: Array.from({ length: slotCount == null ? 2 : slotCount }, () => null),
    owned: []
  };
  model.mainAction = { key: 'gather:collect:mining:copperVein' };
  model.current = { key: 'produce:alchemy:healingPill' };
  return model;
}

function put(model, itemId, quantity) {
  model.player.inventory.stacks[itemId] = quantity;
  return model;
}

function setFormationBinding(model, itemId, quantity) {
  model.player.inventory.bindings[itemId] = {
    equipment: 0,
    task: 0,
    formation: quantity
  };
  return model;
}

// Discovery is idempotent and inventory quantity remains authoritative.
{
  const model = freshModel();
  const before = clone(model);
  const first = Formations.recordCrafted(model, 'gatheringFormation');
  ok(first.ok && first.code === 'ok', 'recordCrafted accepts a formal formation');
  exact(first.state.systems.homestead.formations.owned,
    ['gatheringFormation'], 'recordCrafted appends discovery in content order');
  ok(first.state.mainAction === model.mainAction &&
    first.state.current === model.current,
  'recordCrafted preserves both action reference slots');
  exact(model, before, 'recordCrafted does not mutate input');
  const second = Formations.recordCrafted(
    first.state,
    'gatheringFormation'
  );
  ok(second.ok && second.code === 'already_recorded',
    'repeat discovery is a successful idempotent no-op');
  exact(second.state.systems.homestead.formations.owned,
    ['gatheringFormation'], 'repeat discovery does not duplicate ID');
  const invalid = Formations.recordCrafted(model, 'missing');
  ok(!invalid.ok && invalid.code === 'invalid_formation',
    'unknown discovery ID is rejected');
}

// Equipping binds inventory, allows two physical copies, and blocks sale.
{
  const model = put(freshModel(), 'gatheringFormation', 2);
  const before = clone(model);
  const first = Formations.equip(model, 0, 'gatheringFormation');
  ok(first.ok && first.code === 'ok', 'an available formation can be equipped');
  ok(first.state.systems.homestead.formations.slots[0] ===
    'gatheringFormation', 'equip commits the slot reference');
  ok(first.state.player.inventory.bindings.gatheringFormation.formation === 1,
    'equip binds exactly one item for formation');
  ok(Inventory.availableQuantity(
    first.state.player.inventory,
    'gatheringFormation'
  ) === 1, 'one of two copies remains unbound');
  exact(model, before, 'equip does not mutate its input model');
  ok(first.state.mainAction === model.mainAction &&
    first.state.current === model.current,
  'equip preserves both action reference slots');

  const second = Formations.equip(
    first.state,
    1,
    'gatheringFormation'
  );
  ok(second.ok && second.code === 'ok',
    'two physical copies may occupy two slots');
  ok(second.state.player.inventory.bindings.gatheringFormation.formation === 2,
    'two occupied slots bind two copies');

  const sell = Inventory.sell(
    first.state.player.inventory,
    'gatheringFormation',
    2
  );
  ok(!sell.ok && sell.code === 'item_bound',
    'formation binding prevents selling a bound copy');
}

{
  const model = put(freshModel(), 'gatheringFormation', 1);
  const first = Formations.equip(model, 0, 'gatheringFormation');
  const before = clone(first.state);
  const unavailable = Formations.equip(
    first.state,
    1,
    'gatheringFormation'
  );
  ok(!unavailable.ok && unavailable.code === 'item_unavailable',
    'one physical item cannot occupy two slots');
  exact(first.state, before, 'failed double-equip leaves input unchanged');
  const duplicate = Formations.equip(
    first.state,
    0,
    'gatheringFormation'
  );
  ok(!duplicate.ok && duplicate.code === 'already_equipped',
    'equipping the same item into the same slot is rejected');
}

// Replacement and unequip are all-or-nothing inventory transactions.
{
  const model = put(
    put(freshModel(), 'gatheringFormation', 1),
    'farmlandFormation',
    1
  );
  const first = Formations.equip(model, 0, 'gatheringFormation');
  const replaced = Formations.equip(
    first.state,
    0,
    'farmlandFormation'
  );
  ok(replaced.ok && replaced.code === 'ok', 'an equipped slot can be replaced');
  ok(replaced.state.systems.homestead.formations.slots[0] ===
    'farmlandFormation', 'replacement commits only the new slot item');
  ok(!replaced.state.player.inventory.bindings.gatheringFormation,
    'replacement unbinds exactly one old item');
  ok(replaced.state.player.inventory.bindings.farmlandFormation.formation === 1,
    'replacement binds exactly one new item');

  const cleared = Formations.unequip(replaced.state, 0);
  ok(cleared.ok && cleared.code === 'ok', 'occupied slot can be unequipped');
  ok(cleared.state.systems.homestead.formations.slots[0] === null,
    'unequip clears the slot');
  ok(!cleared.state.player.inventory.bindings.farmlandFormation,
    'unequip unbinds exactly one formation copy');
  ok(cleared.state.mainAction === replaced.state.mainAction &&
    cleared.state.current === replaced.state.current,
  'unequip preserves both action reference slots');
}

// Stable validation codes and strict slot structure.
{
  const model = put(freshModel(1), 'gatheringFormation', 1);
  const before = clone(model);
  const cases = [
    [Formations.equip(model, -1, 'gatheringFormation'), 'invalid_slot'],
    [Formations.equip(model, 0.5, 'gatheringFormation'), 'invalid_slot'],
    [Formations.equip(model, Number.MAX_SAFE_INTEGER + 1,
      'gatheringFormation'), 'invalid_slot'],
    [Formations.equip(model, 1, 'gatheringFormation'), 'slot_locked'],
    [Formations.equip(model, 0, 'missing'), 'invalid_formation'],
    [Formations.equip(freshModel(1), 0, 'gatheringFormation'),
      'item_unavailable'],
    [Formations.unequip(model, 0), 'slot_empty'],
    [Formations.unequip(model, 1), 'slot_locked'],
    [Formations.unequip(model, Symbol('slot')), 'invalid_slot']
  ];
  cases.forEach(([result, code]) => {
    ok(!result.ok && result.code === code,
      'validation failure returns stable code ' + code);
  });
  exact(model, before, 'all validation failures leave input unchanged');
}

// Each official definition contributes exactly its declared effect.
{
  const effectKeys = [
    'gatheringExtraYieldChance',
    'farmGrowthReduction',
    'fishRecoveryReduction',
    'craftingDurationReduction',
    'beastTrainingXpBonus'
  ];
  const expectedById = {
    gatheringFormation: [0.05, 0, 0, 0, 0],
    farmlandFormation: [0, 0.10, 0, 0, 0],
    fishingFormation: [0, 0, 0.10, 0, 0],
    craftingFormation: [0, 0, 0, 0.05, 0],
    beastFormation: [0, 0, 0, 0, 0.10]
  };
  Object.keys(expectedById).forEach((formationId) => {
    const model = freshModel(1);
    model.systems.homestead.formations.slots[0] = formationId;
    const value = Formations.effects(model);
    exact(Object.keys(value), effectKeys,
      formationId + ' returns exactly five effect keys');
    exact(effectKeys.map((key) => value[key]), expectedById[formationId],
      formationId + ' contributes its exact official effect');
    ok(Object.isFrozen(value), formationId + ' effect result is frozen');
  });
  ok(!Object.keys(Formations.effects(freshModel())).some(
    (key) => /break|突破|probability/i.test(key)
  ), 'effects contains no breakthrough or probability property');
}

// Aggregation caps each channel and ignores malformed/unknown slots.
{
  const model = freshModel(30);
  model.systems.homestead.formations.slots = [
    ...Array(6).fill('gatheringFormation'),
    ...Array(5).fill('farmlandFormation'),
    ...Array(5).fill('fishingFormation'),
    ...Array(6).fill('craftingFormation'),
    ...Array(6).fill('beastFormation'),
    'missing',
    { id: 'gatheringFormation' }
  ];
  exact(Formations.effects(model), {
    gatheringExtraYieldChance: 0.25,
    farmGrowthReduction: 0.40,
    fishRecoveryReduction: 0.40,
    craftingDurationReduction: 0.25,
    beastTrainingXpBonus: 0.50
  }, 'equipped effects accumulate independently to their exact caps');

  model.systems.homestead.formations.slots = Array(3).fill(
    'gatheringFormation'
  );
  ok(Formations.effects(model).gatheringExtraYieldChance === 0.15,
    'sub-cap effect totals use stable decimal values');
}

// Query is stable, detached, and gives slots, discovery, quantities and UI text.
{
  const model = freshModel(2);
  model.systems.homestead.formations.owned = [
    'farmlandFormation', 'gatheringFormation'
  ];
  put(model, 'gatheringFormation', 2);
  put(model, 'farmlandFormation', 1);
  const equipped = Formations.equip(model, 0, 'gatheringFormation').state;
  const view = Formations.query(equipped);
  ok(Object.isFrozen(view) && Object.isFrozen(view.slots) &&
    Object.isFrozen(view.formations) && Object.isFrozen(view.effects),
  'query deeply freezes the complete view');
  exact(view.discoveredIds, ['gatheringFormation', 'farmlandFormation'],
    'query sorts discovery by stable content order');
  exact(view.formations.map((row) => row.formationId), Object.keys(
    HomesteadContent.FORMATIONS
  ), 'query rows follow stable content order');
  const gathering = view.formations[0];
  ok(gathering.owned === 2 && gathering.unbound === 1 &&
    gathering.equippedCount === 1 && gathering.canEquip === true,
  'query reports authoritative owned, unbound and equip eligibility');
  ok(gathering.effectText ===
    HomesteadContent.FORMATIONS.gatheringFormation.effectText,
  'query exposes official effect text');
  ok(view.slots[0].formationId === 'gatheringFormation' &&
    view.slots[1].formationId === null,
  'query returns one card per unlocked slot');
  const snapshot = clone(view);
  equipped.systems.homestead.formations.slots[0] = null;
  equipped.player.inventory.stacks.gatheringFormation = 99;
  exact(view, snapshot, 'query is detached from later input mutation');
}

// canEquip must describe whether at least one slot can accept this row now.
{
  const oneSlot = put(freshModel(1), 'gatheringFormation', 2);
  const equipped = Formations.equip(
    oneSlot,
    0,
    'gatheringFormation'
  ).state;
  const gathering = Formations.query(equipped).formations[0];
  ok(gathering.unbound === 1 && gathering.canEquip === false,
    'a spare copy is not eligible when the only slot already has that item');

  const replaceable = put(
    put(freshModel(1), 'farmlandFormation', 1),
    'gatheringFormation',
    1
  );
  const farmland = Formations.equip(
    replaceable,
    0,
    'farmlandFormation'
  ).state;
  ok(Formations.query(farmland).formations[0].canEquip === true,
    'an unbound copy is eligible when a slot contains a different formation');
}

// Slot references and inventory formation bindings are one invariant.
{
  const missing = put(freshModel(2), 'gatheringFormation', 2);
  missing.systems.homestead.formations.slots[0] = 'gatheringFormation';
  const missingBefore = clone(missing);
  const missingResult = Formations.equip(
    missing,
    1,
    'gatheringFormation'
  );
  ok(!missingResult.ok && missingResult.code === 'invalid_state',
    'a slot with no matching formation binding is rejected');
  exact(missing, missingBefore,
    'missing-binding rejection leaves the input unchanged');
  ok(Formations.query(missing).formations.every((row) =>
    row.canEquip === false
  ), 'query disables all equip eligibility for a missing binding');

  const extra = setFormationBinding(
    put(freshModel(1), 'gatheringFormation', 1),
    'gatheringFormation',
    1
  );
  const extraResult = Formations.equip(
    extra,
    0,
    'gatheringFormation'
  );
  ok(!extraResult.ok && extraResult.code === 'invalid_state',
    'a formation binding with no matching slot is rejected');
  ok(Formations.query(extra).formations.every((row) =>
    row.canEquip === false
  ), 'query disables all equip eligibility for an extra binding');

  const short = setFormationBinding(
    put(freshModel(2), 'gatheringFormation', 2),
    'gatheringFormation',
    1
  );
  short.systems.homestead.formations.slots = [
    'gatheringFormation',
    'gatheringFormation'
  ];
  const shortResult = Formations.unequip(short, 0);
  ok(!shortResult.ok && shortResult.code === 'invalid_state',
    'two slots with only one matching binding are rejected');

  const unsafe = setFormationBinding(
    put(freshModel(1), 'gatheringFormation', 1),
    'gatheringFormation',
    Number.MAX_SAFE_INTEGER + 1
  );
  unsafe.systems.homestead.formations.slots[0] =
    'gatheringFormation';
  const unsafeResult = Formations.unequip(unsafe, 0);
  ok(!unsafeResult.ok && unsafeResult.code === 'invalid_state',
    'a non-safe formation binding count is rejected');
}

// Corrupt, sparse, accessor and proxy inputs are rejected or safely ignored.
{
  const sparse = freshModel(2);
  sparse.systems.homestead.formations.slots = new Array(2);
  const sparseResult = Formations.equip(
    sparse,
    0,
    'gatheringFormation'
  );
  ok(!sparseResult.ok && sparseResult.code === 'invalid_state',
    'sparse slot arrays are rejected');

  let getterRuns = 0;
  const accessor = freshModel(1);
  Object.defineProperty(
    accessor.systems.homestead.formations,
    'slots',
    { enumerable: true, get() { getterRuns++; return [null]; } }
  );
  const accessorResult = Formations.equip(
    accessor,
    0,
    'gatheringFormation'
  );
  ok(!accessorResult.ok && accessorResult.code === 'invalid_state' &&
    getterRuns === 0,
  'accessor state is rejected without invoking getter');

  let proxyRuns = 0;
  const proxied = new Proxy(freshModel(1), {
    get(target, key) {
      proxyRuns++;
      return target[key];
    }
  });
  const proxyResult = Formations.equip(
    proxied,
    0,
    'gatheringFormation'
  );
  ok(!proxyResult.ok && proxyResult.code === 'invalid_state' &&
    proxyRuns === 0,
  'proxy state is rejected without property reads');

  const symbolic = freshModel(1);
  symbolic.systems.homestead.formations.slots[Symbol('hidden')] =
    'gatheringFormation';
  ok(Formations.effects(symbolic).gatheringExtraYieldChance === 0,
    'symbol-keyed slot payload is safely ignored');
}

// Browser UMD path, dependency call ordering, atomic rollback and snapshots.
{
  const source = fs.readFileSync('./core/formations.js', 'utf8');
  const definitions = clone(HomesteadContent.FORMATIONS);
  const calls = [];
  let rejectUnbind = false;
  function availableQuantity(inventory, itemId) {
    calls.push(['available', itemId]);
    const owned = inventory.stacks[itemId] || 0;
    const record = inventory.bindings[itemId] || {};
    return Math.max(
      0,
      owned - (record.equipment || 0) -
        (record.task || 0) - (record.formation || 0)
    );
  }
  function bind(inventory, itemId, quantity, reason) {
    calls.push(['bind', itemId, quantity, reason]);
    if (itemId === 'farmlandFormation') {
      return { ok: false, code: 'blocked', value: clone(inventory) };
    }
    const value = clone(inventory);
    if (!value.bindings[itemId]) {
      value.bindings[itemId] = {
        equipment: 0,
        task: 0,
        formation: 0
      };
    }
    value.bindings[itemId][reason] += quantity;
    return { ok: true, code: 'ok', value };
  }
  function unbind(inventory, itemId, quantity, reason) {
    calls.push(['unbind', itemId, quantity, reason]);
    if (rejectUnbind) {
      return { ok: false, code: 'blocked', value: clone(inventory) };
    }
    const value = clone(inventory);
    value.bindings[itemId][reason] -= quantity;
    if (value.bindings[itemId].equipment +
        value.bindings[itemId].task +
        value.bindings[itemId].formation === 0) {
      delete value.bindings[itemId];
    }
    return { ok: true, code: 'ok', value };
  }
  const context = {
    HomesteadContent: { FORMATIONS: definitions },
    Inventory: { availableQuantity, bind, unbind }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  ok(Object.isFrozen(context.Formations),
    'browser UMD installs one frozen Formations global');
  exact(Array.from(Object.keys(context.Formations)), [
    'recordCrafted', 'equip', 'unequip', 'effects', 'query'
  ], 'browser UMD exposes the same strict API order');

  const model = freshModel(1);
  model.systems.homestead.formations.slots[0] = 'gatheringFormation';
  put(put(model, 'gatheringFormation', 1), 'farmlandFormation', 1);
  setFormationBinding(model, 'gatheringFormation', 1);

  calls.length = 0;
  const missingBinding = put(freshModel(2), 'gatheringFormation', 2);
  missingBinding.systems.homestead.formations.slots[0] =
    'gatheringFormation';
  const inconsistent = context.Formations.equip(
    missingBinding,
    1,
    'gatheringFormation'
  );
  ok(!inconsistent.ok && inconsistent.code === 'invalid_state',
    'inconsistent slot binding fails before an equip transaction');
  exact(calls, [],
    'inconsistent equip makes zero available, bind, or unbind calls');
  exact(missingBinding.systems.homestead.formations.slots, [
    'gatheringFormation',
    null
  ], 'inconsistent equip leaves slot references unchanged');

  calls.length = 0;
  const before = clone(model);
  const failedReplace = context.Formations.equip(
    model,
    0,
    'farmlandFormation'
  );
  ok(!failedReplace.ok && failedReplace.code === 'inventory_bind_failed',
    'replace reports stable code when second inventory step fails');
  exact(calls, [
    ['available', 'farmlandFormation'],
    ['unbind', 'gatheringFormation', 1, 'formation'],
    ['bind', 'farmlandFormation', 1, 'formation']
  ], 'replace calls unbind then bind exactly once with formation reason');
  exact(failedReplace.state, before,
    'failed second replace step rolls back public model state');
  exact(model, before, 'failed replacement never mutates source input');

  calls.length = 0;
  const same = context.Formations.equip(
    model,
    0,
    'gatheringFormation'
  );
  ok(!same.ok && same.code === 'already_equipped' && calls.length === 0,
    'same-slot duplicate fails before all inventory dependency calls');

  definitions.gatheringFormation.effect.value = 99;
  context.Inventory.bind = () => {
    throw new Error('mutated dependency must not run');
  };
  ok(context.Formations.effects(model).gatheringExtraYieldChance === 0.05,
    'content definitions are snapshotted at module load');
  const duplicateAfterMutation = context.Formations.equip(
    model,
    0,
    'gatheringFormation'
  );
  ok(!duplicateAfterMutation.ok && duplicateAfterMutation.code ===
    'already_equipped',
  'dependency function snapshot is isolated from later mutation');

  calls.length = 0;
  const open = freshModel(1);
  put(open, 'gatheringFormation', 1);
  const validAfterMutation = context.Formations.equip(
    open,
    0,
    'gatheringFormation'
  );
  ok(validAfterMutation.ok &&
    calls.some((entry) => entry[0] === 'bind'),
  'captured bind function still serves a valid equip after mutation');

  calls.length = 0;
  rejectUnbind = true;
  const beforeUnequip = clone(model);
  const failedUnequip = context.Formations.unequip(model, 0);
  ok(!failedUnequip.ok &&
    failedUnequip.code === 'inventory_unbind_failed',
  'unequip reports stable dependency failure');
  exact(calls, [
    ['unbind', 'gatheringFormation', 1, 'formation']
  ], 'failed unequip calls unbind exactly once');
  exact(failedUnequip.state, beforeUnequip,
    'failed unequip returns the unchanged public state');
}

// Dependency getters/proxies are not executed during browser module loading.
{
  const source = fs.readFileSync('./core/formations.js', 'utf8');
  let runs = 0;
  const context = {
    HomesteadContent: Object.defineProperty({}, 'FORMATIONS', {
      enumerable: true,
      get() { runs++; throw new Error('getter invoked'); }
    }),
    Inventory: new Proxy({}, {
      get() { runs++; throw new Error('proxy invoked'); }
    })
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  ok(runs === 0 && Object.isFrozen(context.Formations),
    'unsafe dependency accessors and proxies are ignored at load');
  exact(Array.from(Object.keys(context.Formations)), [
    'recordCrafted', 'equip', 'unequip', 'effects', 'query'
  ], 'unsafe dependencies still produce a stable inert API');
}

// A hostile availability dependency cannot mutate query input.
{
  const source = fs.readFileSync('./core/formations.js', 'utf8');
  const definitions = clone(HomesteadContent.FORMATIONS);
  const context = {
    HomesteadContent: { FORMATIONS: definitions },
    Inventory: {
      availableQuantity(inventory, itemId) {
        inventory.stacks[itemId] = 0;
        return 0;
      },
      bind(inventory) {
        return { ok: true, code: 'ok', value: inventory };
      },
      unbind(inventory) {
        return { ok: true, code: 'ok', value: inventory };
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  const model = put(freshModel(1), 'gatheringFormation', 2);
  const before = clone(model);
  context.Formations.query(model);
  exact(model, before,
    'query never gives a dependency a live reference to input state');
}

console.log(
  `\n=== Stage 2 阵法自测：${pass} 通过 / ${fail} 失败 ===`
);
if (fail) process.exit(1);
