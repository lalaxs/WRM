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

function pristine(inventory) {
  const bindings = {};
  for (const [itemId, raw] of Object.entries(inventory.bindings || {})) {
    const record = {
      equipment: Number.isSafeInteger(raw.equipment) && raw.equipment > 0
        ? raw.equipment
        : 0,
      task: Number.isSafeInteger(raw.task) && raw.task > 0
        ? raw.task
        : 0,
      formation: Number.isSafeInteger(raw.formation) && raw.formation > 0
        ? raw.formation
        : 0
    };
    if (record.equipment + record.task + record.formation > 0) {
      bindings[itemId] = record;
    }
  }
  return {
    capacity: inventory.capacity,
    capacityGrants: Object.assign({
      shop: 0,
      achievement: 0,
      task: 0
    }, inventory.capacityGrants || {}),
    stacks: Object.assign({}, inventory.stacks || {}),
    bindings,
    equipment: inventory.equipment || {
      version: 1,
      nextInstanceId: 1,
      instances: []
    }
  };
}

function bag(capacity, stacks, bindings, capacityGrants) {
  return pristine({
    capacity,
    capacityGrants,
    stacks: stacks || {},
    bindings: bindings || {}
  });
}

const beforeGlobal = globalThis.Inventory;
const I = require('../core/inventory.js');
const Items = require('../content/items.js');

ok(globalThis.Inventory === beforeGlobal,
  'CommonJS loading does not attach a browser global');
ok(Object.isFrozen(I), 'CommonJS API is frozen');
exact(Object.keys(I).sort(), [
  'addEquipment',
  'apply',
  'availableQuantity',
  'bind',
  'canApply',
  'findEquipment',
  'grantCapacity',
  'occupiedSlots',
  'query',
  'removeEquipment',
  'replaceEquipment',
  'sell',
  'unbind'
], 'inventory exports only the declared pure API');

let current = bag(3);
let result = I.apply(current, { copperOre: 2 });
ok(result.ok && result.code === 'ok',
  'a first known stack can be added');
ok(I.occupiedSlots(result.value) === 1,
  'a first stack uses one slot');
ok(result.value.stacks.copperOre === 2,
  'the first stack stores its exact quantity');
ok(result.value !== current && result.value.stacks !== current.stacks,
  'apply returns a detached inventory tree');
exact(current, bag(3), 'apply does not mutate the source inventory');

current = result.value;
result = I.apply(current, { copperOre: 3 });
ok(result.ok && result.value.stacks.copperOre === 5,
  'same-item output stacks its quantity');
ok(I.occupiedSlots(result.value) === 1,
  'the same item continues to use one slot');
current = I.apply(result.value, { tinOre: 1, ironOre: 1 }).value;
ok(I.occupiedSlots(current) === 3,
  'different positive stacks each use one slot');

const fullBefore = JSON.stringify(current);
result = I.apply(current, { silverOre: 1 });
ok(!result.ok && result.code === 'inventory_full',
  'a new stack is rejected at exact capacity');
ok(JSON.stringify(current) === fullBefore,
  'an inventory-full transaction does not mutate its input');
exact(result.value, current,
  'an inventory-full result returns unchanged inventory data');
ok(result.value !== current && result.value.stacks !== current.stacks,
  'an inventory-full result is detached from the input');

result = I.apply(current, { copperOre: -5, silverOre: 1 });
ok(result.ok && result.value.stacks.copperOre == null,
  'a transaction can consume a whole stack');
ok(result.value.stacks.silverOre === 1
  && I.occupiedSlots(result.value) === 3,
  'the same transaction can reuse the slot that its cost frees');

const forty = {};
for (let index = 0; index < 40; index++) {
  forty[Object.keys(Items.ITEMS)[index]] = 1;
}
const firstFortyIds = Object.keys(forty);
const at39 = bag(40, Object.fromEntries(
  firstFortyIds.slice(0, 39).map(itemId => [itemId, 1])
));
const addFortieth = I.apply(at39, { [firstFortyIds[39]]: 1 });
ok(addFortieth.ok && I.occupiedSlots(addFortieth.value) === 40,
  '39 occupied slots accept the fortieth distinct stack');
const addFortyFirst = I.apply(addFortieth.value, {
  [Object.keys(Items.ITEMS)[40]]: 1
});
ok(!addFortyFirst.ok && addFortyFirst.code === 'inventory_full',
  '40 occupied slots reject a forty-first distinct stack');
const stackWhileFull = I.apply(addFortieth.value, {
  [firstFortyIds[0]]: 9
});
ok(stackWhileFull.ok
  && stackWhileFull.value.stacks[firstFortyIds[0]] === 10
  && I.occupiedSlots(stackWhileFull.value) === 40,
'a full inventory still accepts output into an existing stack');

const oneFree = bag(40, Object.fromEntries(
  firstFortyIds.slice(0, 39).map(itemId => [itemId, 1])
));
const twoOutputsBefore = JSON.stringify(oneFree);
const competingOutputs = I.apply(oneFree, {
  [firstFortyIds[39]]: 1,
  [Object.keys(Items.ITEMS)[40]]: 1
});
ok(!competingOutputs.ok && competingOutputs.code === 'inventory_full',
  'multiple new stacks atomically compete for the last free slot');
ok(JSON.stringify(oneFree) === twoOutputsBefore,
  'competing new stacks do not partially consume the last slot');
ok(competingOutputs.value.stacks[firstFortyIds[39]] == null
  && competingOutputs.value.stacks[Object.keys(Items.ITEMS)[40]] == null,
'no output survives a failed multi-stack transaction');

const costAndOutput = bag(1, { copperOre: 2 });
const impossibleSwap = I.apply(costAndOutput, {
  copperOre: -1,
  tinOre: 1,
  ironOre: 1
});
ok(!impossibleSwap.ok && impossibleSwap.code === 'inventory_full',
  'cost and multiple outputs are validated as one slot transaction');
exact(impossibleSwap.value, costAndOutput,
  'a failed cost/output transaction loses neither cost nor output');

const zeroInput = bag(2, { copperOre: 4 });
const zeroResult = I.apply(zeroInput, {
  copperOre: 0,
  tinOre: 0
});
ok(zeroResult.ok && zeroResult.code === 'ok',
  'zero deltas are valid no-op transaction entries');
exact(zeroResult.value, zeroInput,
  'zero deltas preserve all inventory data');
ok(zeroResult.value !== zeroInput,
  'zero-delta success still returns detached data');

for (const [delta, code, label] of [
  [{ unknownRelic: 1 }, 'unknown_item', 'unknown item'],
  [{ copperOre: 0.5 }, 'invalid_delta', 'fractional quantity'],
  [{ copperOre: NaN }, 'invalid_delta', 'NaN quantity'],
  [{ copperOre: Infinity }, 'invalid_delta', 'infinite quantity'],
  [{ copperOre: Number.MAX_SAFE_INTEGER + 1 },
    'invalid_delta', 'unsafe integer quantity'],
  [[], 'invalid_delta', 'array transaction'],
  [null, 'invalid_delta', 'null transaction']
]) {
  const rejected = I.apply(zeroInput, delta);
  ok(!rejected.ok && rejected.code === code,
    'apply rejects ' + label + ' with ' + code);
  exact(rejected.value, zeroInput,
    'rejected ' + label + ' returns unchanged detached data');
  ok(rejected.value !== zeroInput,
    'rejected ' + label + ' does not expose its input reference');
}

const accessorDelta = {};
Object.defineProperty(accessorDelta, 'copperOre', {
  enumerable: true,
  get() {
    throw new Error('must not invoke');
  }
});
let accessorResult = null;
try {
  accessorResult = I.apply(zeroInput, accessorDelta);
  ok(accessorResult.code === 'invalid_delta',
    'apply rejects accessor delta properties');
} catch (error) {
  ok(false, 'apply does not invoke accessor delta properties');
}

const hiddenTransactionBag = bag(2, { copperOre: 2 });
const hiddenCostVisibleGain = { tinOre: 1 };
Object.defineProperty(hiddenCostVisibleGain, 'copperOre', {
  enumerable: false,
  configurable: true,
  writable: true,
  value: -2
});
const hiddenCostResult = I.apply(
  hiddenTransactionBag,
  hiddenCostVisibleGain
);
ok(!hiddenCostResult.ok && hiddenCostResult.code === 'invalid_delta',
  'apply rejects a hidden cost combined with a visible gain');
exact(hiddenCostResult.value, hiddenTransactionBag,
  'hidden-cost rejection leaves the complete bag value unchanged');
ok(hiddenCostResult.value !== hiddenTransactionBag
  && hiddenCostResult.value.stacks !== hiddenTransactionBag.stacks,
'hidden-cost rejection returns detached inventory data');

const symbolDelta = { copperOre: -1 };
Object.defineProperty(symbolDelta, Symbol('hidden-output'), {
  enumerable: true,
  configurable: true,
  writable: true,
  value: 1
});
const symbolResult = I.apply(zeroInput, symbolDelta);
ok(!symbolResult.ok && symbolResult.code === 'invalid_delta',
  'apply rejects symbol delta keys before applying string entries');
exact(symbolResult.value, zeroInput,
  'symbol-key rejection leaves every string delta unapplied');

const inheritedDelta = Object.create({ copperOre: 1 });
const inheritedResult = I.apply(zeroInput, inheritedDelta);
ok(!inheritedResult.ok && inheritedResult.code === 'invalid_delta',
  'apply rejects a delta with an untrusted prototype');
let constructorGetterHits = 0;
const adversarialPrototype = Object.create(null);
Object.defineProperty(adversarialPrototype, 'constructor', {
  configurable: true,
  get() {
    constructorGetterHits++;
    throw new Error('must not invoke prototype constructor');
  }
});
const adversarialDelta = Object.create(adversarialPrototype);
Object.defineProperty(adversarialDelta, 'copperOre', {
  enumerable: true,
  configurable: true,
  writable: true,
  value: 1
});
let adversarialResult = null;
try {
  adversarialResult = I.apply(zeroInput, adversarialDelta);
  ok(adversarialResult.code === 'invalid_delta',
    'apply rejects a custom prototype without inspecting its constructor');
} catch (error) {
  ok(false, 'custom-prototype validation does not invoke constructor getters');
}
ok(constructorGetterHits === 0,
  'custom prototype constructor getter is never triggered');

const nullPrototypeDelta = Object.create(null);
Object.defineProperty(nullPrototypeDelta, 'copperOre', {
  enumerable: true,
  configurable: true,
  writable: true,
  value: -1
});
const nullPrototypeResult = I.apply(zeroInput, nullPrototypeDelta);
ok(nullPrototypeResult.ok
  && nullPrototypeResult.value.stacks.copperOre === 3,
'a null-prototype own enumerable data delta is accepted');

const pollutionDelta = Object.create(null);
Object.defineProperty(pollutionDelta, '__proto__', {
  enumerable: true,
  configurable: true,
  writable: true,
  value: 1
});
const pollutionResult = I.apply(zeroInput, pollutionDelta);
ok(!pollutionResult.ok && pollutionResult.code === 'unknown_item',
  'apply treats a prototype-pollution key as an unknown item, not metadata');
ok(Object.prototype.polluted == null,
  'prototype-pollution input cannot modify Object.prototype');

const insufficient = I.apply(zeroInput, { copperOre: -5 });
ok(!insufficient.ok && insufficient.code === 'insufficient_items',
  'a cost beyond owned quantity is rejected');
exact(I.canApply(zeroInput, { copperOre: -5 }), insufficient,
  'canApply and apply report the same unaffordable transaction');
const affordable = I.canApply(zeroInput, {
  copperOre: -4,
  tinOre: 1
});
ok(affordable.ok && affordable.value.stacks.copperOre == null
  && affordable.value.stacks.tinOre === 1,
'canApply validates the complete affordable result without mutation');
exact(zeroInput, bag(2, { copperOre: 4 }),
  'canApply does not mutate its input');

let boundBag = bag(3, { copperOre: 7, tinOre: 2 });
let boundResult = I.bind(boundBag, 'copperOre', 2, 'equipment');
ok(boundResult.ok, 'equipment binding succeeds');
exact(boundResult.value.bindings.copperOre, {
  equipment: 2,
  task: 0,
  formation: 0
}, 'a retained binding item always has all three canonical fields');
boundBag = boundResult.value;
boundBag = I.bind(boundBag, 'copperOre', 1, 'task').value;
boundBag = I.bind(boundBag, 'copperOre', 2, 'formation').value;
ok(I.availableQuantity(boundBag, 'copperOre') === 2,
  'available quantity subtracts every binding reason');
ok(I.availableQuantity(boundBag, 'tinOre') === 2,
  'an unbound item remains fully available');
ok(I.availableQuantity(boundBag, 'unknownRelic') === 0,
  'unknown item availability is zero');

const boundCost = I.apply(boundBag, { copperOre: -3 });
ok(!boundCost.ok && boundCost.code === 'item_bound',
  'a transaction cannot consume protected quantity');
const missingCost = I.apply(boundBag, { copperOre: -8 });
ok(!missingCost.ok && missingCost.code === 'insufficient_items',
  'a cost above total owned quantity remains insufficient-items');
exact(missingCost.value.bindings.copperOre, {
  equipment: 2,
  task: 1,
  formation: 2
}, 'a detached failure preserves the canonical binding shape');
const availableCost = I.apply(boundBag, { copperOre: -2 });
ok(availableCost.ok
  && availableCost.value.stacks.copperOre === 5
  && I.availableQuantity(availableCost.value, 'copperOre') === 0,
'a transaction may consume exactly the unbound quantity');
exact(availableCost.value.bindings.copperOre, {
  equipment: 2,
  task: 1,
  formation: 2
}, 'a successful transaction preserves all canonical binding fields');

const bindBefore = JSON.stringify(boundBag);
for (const [itemId, quantity, reason, code, label] of [
  ['unknownRelic', 1, 'task', 'unknown_item', 'unknown item'],
  ['tinOre', 0, 'task', 'invalid_quantity', 'zero quantity'],
  ['tinOre', 0.5, 'task', 'invalid_quantity', 'fractional quantity'],
  ['tinOre', NaN, 'task', 'invalid_quantity', 'NaN quantity'],
  ['tinOre', Infinity, 'task', 'invalid_quantity', 'infinite quantity'],
  ['tinOre', 1, 'quest', 'invalid_binding_reason', 'unknown reason'],
  ['copperOre', 3, 'task', 'item_bound', 'quantity beyond available']
]) {
  const rejected = I.bind(boundBag, itemId, quantity, reason);
  ok(!rejected.ok && rejected.code === code,
    'bind rejects ' + label + ' with ' + code);
  ok(JSON.stringify(boundBag) === bindBefore,
    'rejected bind for ' + label + ' leaves input unchanged');
}

const unbindSource = I.bind(
  bag(2, { tinOre: 2 }),
  'tinOre',
  2,
  'task'
).value;
const partiallyUnbound = I.unbind(unbindSource, 'tinOre', 1, 'task');
ok(partiallyUnbound.ok
  && partiallyUnbound.value.bindings.tinOre.task === 1,
'unbind removes only the requested protected quantity');
exact(partiallyUnbound.value.bindings.tinOre, {
  equipment: 0,
  task: 1,
  formation: 0
}, 'partial unbind retains zero-valued canonical binding fields');
const fullyUnbound = I.unbind(
  partiallyUnbound.value,
  'tinOre',
  1,
  'task'
);
ok(fullyUnbound.ok
  && fullyUnbound.value.bindings.tinOre == null
  && I.availableQuantity(fullyUnbound.value, 'tinOre') === 2,
'unbind removes empty binding records');

const canonicalFailureInput = bag(
  2,
  { copperOre: 2 },
  {
    copperOre: {
      equipment: 0,
      task: 1,
      formation: 0
    }
  }
);
const canonicalFailure = I.apply(
  canonicalFailureInput,
  { copperOre: -2 }
);
ok(!canonicalFailure.ok && canonicalFailure.code === 'item_bound',
  'canonical binding input still protects its bound quantity');
exact(canonicalFailure.value, canonicalFailureInput,
  'failed apply returns a structurally equal canonical inventory');
ok(canonicalFailure.value !== canonicalFailureInput
  && canonicalFailure.value.bindings !== canonicalFailureInput.bindings
  && canonicalFailure.value.bindings.copperOre !==
    canonicalFailureInput.bindings.copperOre,
'failed apply returns a fully detached canonical inventory');
for (const [quantity, reason, code, label] of [
  [3, 'task', 'binding_underflow', 'quantity above the reason binding'],
  [0, 'task', 'invalid_quantity', 'zero quantity'],
  [1, 'quest', 'invalid_binding_reason', 'unknown reason']
]) {
  const rejected = I.unbind(unbindSource, 'tinOre', quantity, reason);
  ok(!rejected.ok && rejected.code === code,
    'unbind rejects ' + label + ' with ' + code);
}

let saleBag = bag(4, {
  copperOre: 5,
  tinOre: 2,
  healingPill: 1
});
saleBag = I.bind(saleBag, 'copperOre', 2, 'task').value;
const partialSale = I.sell(saleBag, 'copperOre', 2);
ok(partialSale.ok
  && partialSale.value.stacks.copperOre === 3
  && partialSale.currency === Items.ITEMS.copperOre.sellValue * 2,
'sell removes an exact unbound partial quantity and returns lingshi value');
const allUnboundSale = I.sell(partialSale.value, 'copperOre', 1);
ok(allUnboundSale.ok
  && allUnboundSale.value.stacks.copperOre === 2
  && I.availableQuantity(allUnboundSale.value, 'copperOre') === 0,
'sell may remove all remaining unbound quantity while preserving bindings');
const protectedSale = I.sell(allUnboundSale.value, 'copperOre', 1);
ok(!protectedSale.ok && protectedSale.code === 'item_bound',
  'sell rejects protected quantity');
const excessiveSale = I.sell(saleBag, 'tinOre', 3);
ok(!excessiveSale.ok && excessiveSale.code === 'insufficient_items',
  'sell rejects quantity beyond total owned');
const wholeSale = I.sell(saleBag, 'tinOre', 2);
ok(wholeSale.ok && wholeSale.value.stacks.tinOre == null,
  'sell removes a stack when all unbound quantity is sold');
for (const [itemId, quantity, code, label] of [
  ['unknownRelic', 1, 'unknown_item', 'unknown item'],
  ['tinOre', 0, 'invalid_quantity', 'zero quantity'],
  ['tinOre', -1, 'invalid_quantity', 'negative quantity'],
  ['tinOre', 0.5, 'invalid_quantity', 'fractional quantity'],
  ['tinOre', NaN, 'invalid_quantity', 'NaN quantity'],
  ['tinOre', Infinity, 'invalid_quantity', 'infinite quantity']
]) {
  const rejected = I.sell(saleBag, itemId, quantity);
  ok(!rejected.ok && rejected.code === code,
    'sell rejects ' + label + ' with ' + code);
}
exact(saleBag, bag(4, {
  copperOre: 5,
  tinOre: 2,
  healingPill: 1
}, {
  copperOre: { task: 2 }
}), 'sale operations never mutate their source inventory');

let capacityBag = bag(3);
const expanded = I.grantCapacity(capacityBag, 5, 'achievement');
ok(expanded.ok
  && expanded.value.capacity === 8
  && expanded.value.capacityGrants.achievement === 5,
'achievement records and grants five permanent slots');
const repeated = I.grantCapacity(expanded.value, 5, 'achievement');
ok(repeated.ok
  && repeated.value.capacity === 13
  && repeated.value.capacityGrants.achievement === 10,
'each repeated grant adds its full positive slot amount');
const smallerGrant = I.grantCapacity(repeated.value, 2, 'achievement');
ok(smallerGrant.ok
  && smallerGrant.value.capacity === 15
  && smallerGrant.value.capacityGrants.achievement === 12,
'a smaller later grant still accumulates its full positive amount');
const capacityOverflowBag = bag(
  Number.MAX_SAFE_INTEGER,
  {},
  {},
  { shop: 0, achievement: 0, task: 0 }
);
const capacityOverflow = I.grantCapacity(
  capacityOverflowBag,
  1,
  'shop'
);
ok(!capacityOverflow.ok
  && capacityOverflow.code === 'invalid_capacity_amount',
'capacity overflow rejects the complete grant');
exact(capacityOverflow.value, capacityOverflowBag,
  'capacity overflow returns detached value-equivalent inventory');
ok(capacityOverflow.value !== capacityOverflowBag,
  'capacity overflow does not expose the source reference');
const sourceOverflowBag = bag(
  20,
  {},
  {},
  {
    shop: Number.MAX_SAFE_INTEGER,
    achievement: 0,
    task: 0
  }
);
const sourceOverflow = I.grantCapacity(sourceOverflowBag, 1, 'shop');
ok(!sourceOverflow.ok
  && sourceOverflow.code === 'invalid_capacity_amount',
'per-source grant overflow rejects the complete grant');
exact(sourceOverflow.value, sourceOverflowBag,
  'per-source overflow returns detached value-equivalent inventory');
ok(sourceOverflow.value !== sourceOverflowBag,
  'per-source overflow does not expose the source reference');
for (const [amount, source, code, label] of [
  [5, 'unknown', 'invalid_capacity_source', 'unknown source'],
  [5, 'Shop', 'invalid_capacity_source', 'wrong-case source'],
  [0, 'shop', 'invalid_capacity_amount', 'zero amount'],
  [-1, 'task', 'invalid_capacity_amount', 'negative amount'],
  [0.5, 'achievement', 'invalid_capacity_amount', 'fractional amount'],
  [NaN, 'shop', 'invalid_capacity_amount', 'NaN amount'],
  [Infinity, 'task', 'invalid_capacity_amount', 'infinite amount']
]) {
  const rejected = I.grantCapacity(capacityBag, amount, source);
  ok(!rejected.ok && rejected.code === code,
    'grantCapacity rejects ' + label + ' with ' + code);
}
exact(capacityBag, bag(3),
  'capacity grants never mutate the source inventory');

const queryBag = bag(8, {
  copperOre: 5,
  tinOre: 2,
  healingPill: 1,
  copperSword: 1,
  gatheringFormation: 1
}, {
  copperOre: { task: 2, equipment: 1 },
  gatheringFormation: { formation: 1 }
});
const allView = I.query(queryBag, {});
exact({
  capacity: allView.capacity,
  used: allView.used,
  free: allView.free,
  categories: allView.categories,
  selectedCategory: allView.selectedCategory,
  search: allView.search
}, {
  capacity: 8,
  used: 5,
  free: 3,
  categories: [
    'all', 'material', 'equipment', 'consumable', 'technique', 'quest'
  ],
  selectedCategory: 'all',
  search: ''
}, 'query exposes exact capacity and filter metadata');
exact(allView.items.map(item => item.itemId), [
  'copperOre',
  'tinOre',
  'copperSword',
  'gatheringFormation',
  'healingPill'
], 'query sorts category first and registry insertion order second');
const expectedCopperRow = {
  itemId: 'copperOre',
  name: '铜矿石',
  category: 'material',
  quantity: 5,
  bound: 3,
  available: 2,
  sellValue: Items.ITEMS.copperOre.sellValue,
  icon: Items.ITEMS.copperOre.icon,
  description: Items.ITEMS.copperOre.description,
  quality: Items.ITEMS.copperOre.quality
};
['iconSrc', 'iconSrc50', 'iconSrc100'].forEach((key) => {
  if (Items.ITEMS.copperOre[key]) expectedCopperRow[key] = Items.ITEMS.copperOre[key];
});
exact(allView.items[0], expectedCopperRow,
  'query reports owned, all-bound, available quantities, and optional icon art');
ok(Object.isFrozen(allView)
  && Object.isFrozen(allView.categories)
  && Object.isFrozen(allView.items)
  && allView.items.every(Object.isFrozen),
'query returns a deeply frozen ViewModel');

const materialView = I.query(queryBag, {
  category: 'material',
  search: '矿'
});
exact(materialView.items.map(item => item.itemId), [
  'copperOre', 'tinOre'
], 'Unicode name search filters within the selected category');
const caseView = I.query(queryBag, {
  category: 'ALL',
  search: '  COPPER  '
});
ok(caseView.selectedCategory === 'all'
  && caseView.search === 'COPPER'
  && caseView.items.length === 2
  && caseView.items.every(item => /copper/i.test(item.itemId)),
'search is case-insensitive and invalid category safely falls back to all');
const wideCaseView = I.query(queryBag, {
  search: 'ＣＯＰＰＥＲ'
});
ok(wideCaseView.items.length === 2,
  'search normalizes compatible Unicode width before matching item IDs');
const emptyView = I.query(queryBag, {
  category: 'quest',
  search: '矿'
});
ok(emptyView.items.length === 0 && emptyView.selectedCategory === 'quest',
  'a valid empty category remains selected');

const queryBefore = JSON.stringify(queryBag);
try {
  allView.items.push({});
} catch (error) {
  // Frozen arrays may throw in strict mode.
}
try {
  allView.items[0].quantity = 999;
} catch (error) {
  // Frozen rows may throw in strict mode.
}
ok(JSON.stringify(queryBag) === queryBefore
  && I.query(queryBag, {}).items[0].quantity === 5,
'mutating a query result cannot mutate the inventory or a later query');
const queryJson = JSON.stringify(allView);
exact(JSON.parse(queryJson), allView,
  'the frozen query is JSON-round-trip safe');
ok(JSON.stringify(queryBag) === queryBefore,
  'all queries preserve their input bytes');

const sourceCode = fs.readFileSync('core/inventory.js', 'utf8');
const forbiddenProductionPatterns = [
  [/\bMath\.random\s*\(/, 'Math.random'],
  [/\bdocument\b/, 'DOM document'],
  [/\bCanvas\b|getContext\s*\(/, 'Canvas'],
  [/\blocalStorage\b|\bSaveSystem\b/, 'save side effect'],
  [/\bset(?:Timeout|Interval)\s*\(/, 'timer side effect']
];
for (const [pattern, label] of forbiddenProductionPatterns) {
  ok(!pattern.test(sourceCode),
    'inventory module has no ' + label + ' dependency');
}

const browserSandbox = {};
browserSandbox.globalThis = browserSandbox;
vm.createContext(browserSandbox);
vm.runInContext(
  fs.readFileSync('content/items.js', 'utf8'),
  browserSandbox,
  { filename: 'content/items.js' }
);
vm.runInContext(sourceCode, browserSandbox, {
  filename: 'core/inventory.js'
});
ok(typeof browserSandbox.Inventory === 'object'
  && Object.isFrozen(browserSandbox.Inventory),
'UMD browser loading exposes one frozen Inventory API');
exact(Object.keys(browserSandbox).sort(), [
  'Inventory', 'ItemContent', 'globalThis'
], 'browser UMD does not leak implementation helpers');
exact(Object.keys(browserSandbox.Inventory).sort(), Object.keys(I).sort(),
  'browser and CommonJS expose the same inventory functions');
ok(vm.runInContext(
  'Inventory.apply({' +
    'capacity:1,' +
    'capacityGrants:{shop:0,achievement:0,task:0},' +
    'stacks:{},bindings:{}' +
  '},{copperOre:1}).ok',
  browserSandbox
), 'browser UMD executes the same-realm transaction rule');

const customItemContent = Object.freeze({
  ITEMS: Object.freeze({
    boundQuest: Object.freeze({
      id: 'boundQuest',
      name: '绑定信物',
      category: 'quest',
      sellValue: 0,
      stackable: true
    })
  }),
  CATEGORIES: Object.freeze({
    material: '材料',
    equipment: '装备',
    consumable: '消耗品',
    technique: '功法',
    quest: '任务物品'
  }),
  get(itemId) {
    return this.ITEMS[itemId] || null;
  }
});
const unsaleableSandbox = {
  ItemContent: customItemContent,
  Object, Array, Number, String, Boolean, JSON,
  Set, Map, RegExp, Error, TypeError, Math
};
unsaleableSandbox.globalThis = unsaleableSandbox;
vm.createContext(unsaleableSandbox);
vm.runInContext(sourceCode, unsaleableSandbox, {
  filename: 'core/inventory.js'
});
const unsaleable = unsaleableSandbox.Inventory.sell(
  bag(1, { boundQuest: 1 }),
  'boundQuest',
  1
);
ok(!unsaleable.ok && unsaleable.code === 'unsaleable_item',
  'sell rejects a known item without a positive sale value');

const pureInput = bag(3, { copperOre: 2 });
const pureBefore = JSON.stringify(pureInput);
const pureOne = I.apply(pureInput, {
  copperOre: -1,
  tinOre: 1
});
const pureTwo = I.apply(pureInput, {
  copperOre: -1,
  tinOre: 1
});
exact(pureOne, pureTwo,
  'the same transaction input produces the same output');
ok(JSON.stringify(pureInput) === pureBefore,
  'repeated pure transactions preserve the input bytes');

console.log('\n=== Stage 2 背包自测：' +
  pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
