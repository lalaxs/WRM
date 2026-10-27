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

function unchanged(result, model, before, code, message) {
  ok(!result.ok && result.code === code && result.state === model,
    message + ' returns the original state with ' + code);
  ok(bytes(model) === before, message + ' preserves input byte-for-byte');
}

function deeplyFrozen(value) {
  if (!value || typeof value !== 'object') return true;
  return Object.isFrozen(value) &&
    Object.keys(value).every((key) => deeplyFrozen(value[key]));
}

const Stage2State = require('../core/stage2-state.js');
const Stage3State = require('../core/stage3-state.js');
const Inventory = require('../core/inventory.js');
const CombatContent = require('../content/combat.js');
const TechniqueContent = require('../content/techniques.js');
const beforeGlobal = globalThis.CombatLoadouts;
const Loadouts = require('../core/combat-loadouts.js');

ok(globalThis.CombatLoadouts === beforeGlobal,
  'CommonJS loading does not attach a browser global');
ok(Object.isFrozen(Loadouts), 'CombatLoadouts API is frozen');
exact(Object.keys(Loadouts), [
  'create',
  'rename',
  'remove',
  'setActive',
  'setEquipment',
  'setSupply',
  'setActiveTechnique',
  'setPassiveTechnique',
  'minimumSellRemainder',
  'query'
], 'CombatLoadouts exposes only the ten declared operations in order');

function freshModel() {
  const model = Stage3State.normalize(Stage2State.createDefaults());
  // This suite exercises the retained stack-equipment compatibility adapter;
  // current instance equipment is covered by selftest_equipment_*.
  delete model.player.inventory.equipment;
  model.player.combat.loadouts.forEach(loadout => {
    loadout.equipment = { weapon: null, armor: null, accessory: null };
  });
  return model;
}

function put(model, itemId, quantity) {
  model.player.inventory.stacks[itemId] = quantity;
  return model;
}

function learn(model, techniqueId) {
  model.player.techniques.known[techniqueId] = { level: 1, xp: 0 };
  return model;
}

function createSecond(model) {
  const out = Loadouts.create(model, '方案二');
  ok(out.ok && out.result.id === 'loadout-2' &&
    out.result.name === '方案二',
  'create returns the second canonical loadout');
  return out;
}

// Creation, naming, stable IDs and the five-plan cap.
{
  const model = freshModel();
  ok(model.player.combat.loadouts[0].name === '方案一',
    'new player starts with 方案一');
  const before = bytes(model);
  const second = Loadouts.create(model, '  方案二  ');
  ok(second.ok && second.code === 'ok' &&
    second.result.id === 'loadout-2' &&
    second.result.name === '方案二',
  'create trims the name and returns the created plan');
  ok(second.state.player.combat.nextLoadoutId === 3,
    'create advances the persisted loadout ID counter');
  ok(bytes(model) === before, 'create does not mutate its input');
  exact(second.state.player.combat.loadouts[1], {
    id: 'loadout-2',
    name: '方案二',
    equipment: {
      weapon: null,
      armor: null,
      accessory: null
    },
    activeTechniques: [
      { techniqueId: null, condition: { type: 'always' } },
      { techniqueId: null, condition: { type: 'always' } },
      { techniqueId: null, condition: { type: 'always' } }
    ],
    passiveTechniques: [null, null, null, null, null],
    supplies: {
      food: { itemId: null, triggerRatio: 0.5, stopWhenEmpty: false },
      pill: { itemId: null, triggerRatio: 0.3, stopWhenEmpty: false },
      talisman: {
        itemId: null,
        useAt: 'enemy_start',
        stopWhenEmpty: false
      }
    }
  }, 'created plans always have exactly 3 active and 5 passive slots');

  let current = second.state;
  for (let index = 3; index <= 5; index++) {
    current = Loadouts.create(current, '方案' + index).state;
  }
  const limitBefore = bytes(current);
  unchanged(
    Loadouts.create(current, '方案六'),
    current,
    limitBefore,
    'loadout_limit',
    'sixth loadout'
  );

  for (const name of ['', '   ', '1234567890123']) {
    const invalidBefore = bytes(model);
    unchanged(
      Loadouts.create(model, name),
      model,
      invalidBefore,
      'invalid_name',
      'invalid create name ' + JSON.stringify(name)
    );
  }
  const duplicateBefore = bytes(second.state);
  unchanged(
    Loadouts.create(second.state, ' 方案一 '),
    second.state,
    duplicateBefore,
    'duplicate_name',
    'duplicate create name'
  );

  const exhausted = freshModel();
  exhausted.player.combat.nextLoadoutId = Number.MAX_SAFE_INTEGER;
  const exhaustedBefore = bytes(exhausted);
  unchanged(
    Loadouts.create(exhausted, '方案二'),
    exhausted,
    exhaustedBefore,
    'loadout_id_exhausted',
    'unsafe next loadout ID'
  );
}

// Rename, activate and remove are transactional.
{
  let model = createSecond(freshModel()).state;
  const renamed = Loadouts.rename(model, 'loadout-2', '  常用方案  ');
  ok(renamed.ok &&
    renamed.state.player.combat.loadouts[1].name === '常用方案',
  'rename stores the trimmed name');
  const duplicateBefore = bytes(renamed.state);
  unchanged(
    Loadouts.rename(renamed.state, 'loadout-2', '方案一'),
    renamed.state,
    duplicateBefore,
    'duplicate_name',
    'duplicate rename'
  );
  const active = Loadouts.setActive(renamed.state, 'loadout-2');
  ok(active.ok &&
    active.state.player.combat.activeLoadoutId === 'loadout-2',
  'setActive selects an existing plan');
  const removed = Loadouts.remove(active.state, 'loadout-2');
  ok(removed.ok &&
    removed.state.player.combat.loadouts.length === 1 &&
    removed.state.player.combat.activeLoadoutId === 'loadout-1',
  'removing the active plan selects the first remaining plan');
  const lastBefore = bytes(removed.state);
  unchanged(
    Loadouts.remove(removed.state, 'loadout-1'),
    removed.state,
    lastBefore,
    'last_loadout',
    'last loadout removal'
  );
  const missingBefore = bytes(model);
  for (const operation of [
    () => Loadouts.rename(model, 'missing', '新名'),
    () => Loadouts.remove(model, 'missing'),
    () => Loadouts.setActive(model, 'missing')
  ]) {
    unchanged(
      operation(),
      model,
      missingBefore,
      'loadout_not_found',
      'missing loadout transaction'
    );
  }
}

// Equipment references bind one physical stack once across all plans.
{
  let model = put(freshModel(), 'cloudwoodSword', 1);
  const before = bytes(model);
  const first = Loadouts.setEquipment(
    model,
    'loadout-1',
    'weapon',
    'cloudwoodSword'
  );
  ok(first.ok &&
    first.state.player.inventory.bindings.cloudwoodSword.equipment === 1,
  'planned equipment binds exactly one physical item');
  ok(bytes(model) === before, 'setEquipment does not mutate its input');
  const sold = Inventory.sell(
    first.state.player.inventory,
    'cloudwoodSword',
    1
  );
  ok(!sold.ok && sold.code === 'item_bound',
    'Stage 2 Inventory blocks sale of planned equipment');

  const second = createSecond(first.state);
  const shared = Loadouts.setEquipment(
    second.state,
    second.result.id,
    'weapon',
    'cloudwoodSword'
  );
  ok(shared.ok &&
    shared.state.player.inventory.bindings.cloudwoodSword.equipment === 1,
  'shared preset reference still binds one physical stack once');
  const clearFirst = Loadouts.setEquipment(
    shared.state,
    'loadout-1',
    'weapon',
    null
  );
  ok(clearFirst.ok &&
    clearFirst.state.player.inventory.bindings.cloudwoodSword.equipment === 1,
  'removing one of two references keeps the equipment binding');
  const clearLast = Loadouts.setEquipment(
    clearFirst.state,
    'loadout-2',
    'weapon',
    null
  );
  ok(clearLast.ok &&
    clearLast.state.player.inventory.bindings.cloudwoodSword == null,
  'removing the last reference releases the equipment binding');

  const rebound = Loadouts.setEquipment(
    shared.state,
    'loadout-1',
    'weapon',
    null
  );
  const deleted = Loadouts.remove(rebound.state, 'loadout-2');
  ok(deleted.ok &&
    deleted.state.player.inventory.bindings.cloudwoodSword == null,
  'deleting the last referencing plan releases its equipment binding');
}

// All three equipment types validate slot, ownership and input atomicity.
{
  const fixtures = [
    ['weapon', 'cloudwoodSword'],
    ['armor', 'cloudRobe'],
    ['accessory', 'breathJade']
  ];
  for (const [slot, itemId] of fixtures) {
    const model = put(freshModel(), itemId, 1);
    const out = Loadouts.setEquipment(model, 'loadout-1', slot, itemId);
    ok(out.ok && out.state.player.combat.loadouts[0].equipment[slot] === itemId,
      slot + ' accepts its exact equipment type');
  }
  const model = put(put(freshModel(), 'cloudRobe', 1), 'cloudwoodSword', 1);
  const mismatchBefore = bytes(model);
  unchanged(
    Loadouts.setEquipment(model, 'loadout-1', 'weapon', 'cloudRobe'),
    model,
    mismatchBefore,
    'equipment_type_mismatch',
    'equipment type mismatch'
  );
  unchanged(
    Loadouts.setEquipment(model, 'loadout-1', 'ring', 'cloudwoodSword'),
    model,
    mismatchBefore,
    'invalid_equipment_slot',
    'unknown equipment slot'
  );
  const unavailable = freshModel();
  const unavailableBefore = bytes(unavailable);
  unchanged(
    Loadouts.setEquipment(
      unavailable,
      'loadout-1',
      'weapon',
      'cloudwoodSword'
    ),
    unavailable,
    unavailableBefore,
    'item_unavailable',
    'unowned equipment'
  );
}

// Supplies remain consumable but retain one-unit sale protection.
{
  let model = freshModel();
  put(model, 'grilledCarp', 2);
  put(model, 'healingPill', 1);
  put(model, 'wardTalisman', 1);
  let out = Loadouts.setSupply(model, 'loadout-1', 'food', {
    itemId: 'grilledCarp',
    triggerRatio: 0.5,
    stopWhenEmpty: false
  });
  out = Loadouts.setSupply(out.state, 'loadout-1', 'pill', {
    itemId: 'healingPill',
    triggerRatio: 0.3,
    stopWhenEmpty: true
  });
  out = Loadouts.setSupply(out.state, 'loadout-1', 'talisman', {
    itemId: 'wardTalisman',
    useAt: 'enemy_start',
    stopWhenEmpty: false
  });
  ok(out.ok && !out.state.player.inventory.bindings.grilledCarp &&
    !out.state.player.inventory.bindings.healingPill &&
    !out.state.player.inventory.bindings.wardTalisman,
  'configured supplies never create inventory bindings');
  ok(Loadouts.minimumSellRemainder(out.state, 'grilledCarp') === 1 &&
    Loadouts.minimumSellRemainder(out.state, 'healingPill') === 1 &&
    Loadouts.minimumSellRemainder(out.state, 'wardTalisman') === 1 &&
    Loadouts.minimumSellRemainder(out.state, 'shrimpSoup') === 0,
  'minimumSellRemainder protects exactly one referenced supply');

  const sellOne = Inventory.sell(
    out.state.player.inventory,
    'grilledCarp',
    1
  );
  ok(sellOne.ok && sellOne.value.stacks.grilledCarp === 1,
    'ordinary inventory sale can remove excess configured supply');
  ok(sellOne.value.stacks.grilledCarp -
    Loadouts.minimumSellRemainder(out.state, 'grilledCarp') === 0,
  'command layer can detect that selling the final referenced unit is unsafe');
  const consumed = Inventory.apply(sellOne.value, { grilledCarp: -1 });
  ok(consumed.ok && consumed.value.stacks.grilledCarp == null,
    'combat can still consume the final configured supply');

  const malformedSession = out.state;
  malformedSession.player.inventory.stacks.grilledCarp = 1;
  malformedSession.systems.combat.session = {};
  const guardedMinimum = Loadouts.minimumSellRemainder(
    malformedSession,
    'grilledCarp'
  );
  ok(guardedMinimum === 1,
    'sale remainder scans safe loadouts independently of malformed session');
  ok(malformedSession.player.inventory.stacks.grilledCarp - 1 <
    guardedMinimum,
  'command-layer guard blocks sale of the final referenced supply unit');
}

// Supply configuration is strict and every rejection is atomic.
{
  const model = put(put(put(
    freshModel(),
    'grilledCarp',
    1
  ), 'healingPill', 1), 'wardTalisman', 1);
  const cases = [
    ['food', {
      itemId: 'healingPill',
      triggerRatio: 0.5,
      stopWhenEmpty: false
    }, 'supply_type_mismatch'],
    ['pill', {
      itemId: 'healingPill',
      triggerRatio: 0.049,
      stopWhenEmpty: false
    }, 'invalid_trigger_ratio'],
    ['pill', {
      itemId: 'healingPill',
      triggerRatio: 0.951,
      stopWhenEmpty: false
    }, 'invalid_trigger_ratio'],
    ['talisman', {
      itemId: 'wardTalisman',
      useAt: 'battle_start',
      stopWhenEmpty: false
    }, 'invalid_use_at'],
    ['food', {
      itemId: 'grilledCarp',
      triggerRatio: 0.5,
      stopWhenEmpty: 0
    }, 'invalid_supply_config'],
    ['elixir', {
      itemId: 'healingPill',
      triggerRatio: 0.3,
      stopWhenEmpty: false
    }, 'invalid_supply_slot']
  ];
  for (const [slot, config, code] of cases) {
    const before = bytes(model);
    unchanged(
      Loadouts.setSupply(model, 'loadout-1', slot, config),
      model,
      before,
      code,
      'invalid ' + slot + ' supply config'
    );
  }
  const unavailable = freshModel();
  const before = bytes(unavailable);
  unchanged(
    Loadouts.setSupply(unavailable, 'loadout-1', 'food', {
      itemId: 'grilledCarp',
      triggerRatio: 0.5,
      stopWhenEmpty: false
    }),
    unavailable,
    before,
    'item_unavailable',
    'unowned supply'
  );
}

// Learned active/passive techniques validate kind, uniqueness and conditions.
{
  let model = freshModel();
  [
    'cloudPiercingSword',
    'returningWindSlash',
    'steadyBreath',
    'ironBody'
  ].forEach((id) => learn(model, id));
  let out = Loadouts.setActiveTechnique(
    model,
    'loadout-1',
    0,
    'cloudPiercingSword',
    { type: 'selfHpBelow', threshold: 0.5 }
  );
  ok(out.ok &&
    out.state.player.combat.loadouts[0].activeTechniques[0].techniqueId ===
      'cloudPiercingSword' &&
    out.state.player.combat.loadouts[0].activeTechniques[0].condition.threshold
      === 0.5,
  'learned active technique and condition are stored');
  out = Loadouts.setActiveTechnique(
    out.state,
    'loadout-1',
    1,
    'returningWindSlash',
    { type: 'enemyHasStatus', statusId: 'shock' }
  );
  out = Loadouts.setPassiveTechnique(
    out.state,
    'loadout-1',
    0,
    'steadyBreath'
  );
  ok(out.ok &&
    out.state.player.combat.loadouts[0].passiveTechniques[0] ===
      'steadyBreath',
  'learned passive technique is stored');

  const cases = [
    () => Loadouts.setActiveTechnique(
      out.state, 'loadout-1', 2, 'cloudPiercingSword', { type: 'always' }
    ),
    () => Loadouts.setActiveTechnique(
      out.state, 'loadout-1', 2, 'steadyBreath', { type: 'always' }
    ),
    () => Loadouts.setActiveTechnique(
      out.state, 'loadout-1', 2, 'stoneBreakingFist', { type: 'always' }
    ),
    () => Loadouts.setActiveTechnique(
      out.state, 'loadout-1', 4, null, { type: 'always' }
    ),
    () => Loadouts.setActiveTechnique(
      out.state, 'loadout-1', 2, null,
      { type: 'selfHpBelow', threshold: 0 }
    ),
    () => Loadouts.setPassiveTechnique(
      out.state, 'loadout-1', 1, 'steadyBreath'
    ),
    () => Loadouts.setPassiveTechnique(
      out.state, 'loadout-1', 1, 'cloudPiercingSword'
    ),
    () => Loadouts.setPassiveTechnique(
      out.state, 'loadout-1', 1, 'swiftShadow'
    ),
    () => Loadouts.setPassiveTechnique(
      out.state, 'loadout-1', 5, null
    )
  ];
  const codes = [
    'duplicate_technique',
    'technique_type_mismatch',
    'technique_not_learned',
    'invalid_slot_index',
    'invalid_condition',
    'duplicate_technique',
    'technique_type_mismatch',
    'technique_not_learned',
    'invalid_slot_index'
  ];
  cases.forEach((operation, index) => {
    const before = bytes(out.state);
    unchanged(
      operation(),
      out.state,
      before,
      codes[index],
      'invalid technique transaction ' + index
    );
  });
}

// The combat session locks only the plan used by that session.
{
  let model = createSecond(freshModel()).state;
  put(model, 'cloudwoodSword', 1);
  put(model, 'grilledCarp', 1);
  learn(model, 'cloudPiercingSword');
  model.systems.combat.session = { loadoutId: 'loadout-1' };
  const activeEdits = [
    () => Loadouts.setEquipment(
      model, 'loadout-1', 'weapon', 'cloudwoodSword'
    ),
    () => Loadouts.setSupply(model, 'loadout-1', 'food', {
      itemId: 'grilledCarp',
      triggerRatio: 0.5,
      stopWhenEmpty: false
    }),
    () => Loadouts.setActiveTechnique(
      model, 'loadout-1', 0, 'cloudPiercingSword', { type: 'always' }
    ),
    () => Loadouts.setPassiveTechnique(model, 'loadout-1', 0, null)
  ];
  activeEdits.forEach((operation, index) => {
    const before = bytes(model);
    unchanged(
      operation(),
      model,
      before,
      'combat_active',
      'active combat plan edit ' + index
    );
  });
  const inactive = Loadouts.setEquipment(
    model,
    'loadout-2',
    'weapon',
    'cloudwoodSword'
  );
  ok(inactive.ok &&
    inactive.state.player.combat.loadouts[1].equipment.weapon ===
      'cloudwoodSword',
  'inactive loadout remains editable during combat');
}

// Query is detached, deeply frozen and reports all required edit metadata.
{
  let model = createSecond(freshModel()).state;
  put(model, 'cloudwoodSword', 1);
  put(model, 'grilledCarp', 2);
  learn(model, 'cloudPiercingSword');
  model = Loadouts.setEquipment(
    model, 'loadout-1', 'weapon', 'cloudwoodSword'
  ).state;
  model = Loadouts.setSupply(model, 'loadout-1', 'food', {
    itemId: 'grilledCarp',
    triggerRatio: 0.5,
    stopWhenEmpty: false
  }).state;
  model = Loadouts.setActiveTechnique(
    model, 'loadout-1', 0, 'cloudPiercingSword', { type: 'always' }
  ).state;
  model.systems.combat.session = { loadoutId: 'loadout-1' };
  const view = Loadouts.query(model);
  ok(deeplyFrozen(view), 'query output is deeply frozen');
  ok(view.activeLoadoutId === 'loadout-1' &&
    view.activeSessionLoadoutId === 'loadout-1' &&
    view.tabs.length === 2 &&
    view.tabs[0].active === true &&
    view.tabs[0].editingLocked === true &&
    view.tabs[1].editingLocked === false,
  'query returns plan tabs and active-session edit locks');
  const first = view.loadouts[0];
  ok(first.equipment[0].slot === 'weapon' &&
    first.equipment[0].itemId === 'cloudwoodSword' &&
    first.equipment[0].owned === 1 &&
    first.equipment[0].available === 0 &&
    first.equipment[0].stats.attack === 6,
  'query reports equipment stats and owned/available counts');
  ok(first.activeTechniques[0].priority === 1 &&
    first.activeTechniques[2].priority === 3 &&
    first.activeTechniques[0].condition.type === 'always',
  'query reports active slot priorities and conditions');
  ok(first.passiveTechniques[0].slotIndex === 0 &&
    first.passiveTechniques.length === 5,
  'query reports all three passive slots');
  ok(first.supplies[0].slot === 'food' &&
    first.supplies[0].owned === 2 &&
    first.supplies[0].available === 2 &&
    first.supplies[0].minimumSellRemainder === 1,
  'query reports configured supply counts and sale remainder');
  const snapshot = clone(view);
  model.player.combat.loadouts[0].name = 'mutated';
  model.player.inventory.stacks.grilledCarp = 99;
  exact(view, snapshot, 'query is detached from later input mutation');
}

console.log(
  `\n=== Stage 3 战斗方案自测：${pass} 通过 / ${fail} 失败 ===`
);
if (fail) process.exit(1);
