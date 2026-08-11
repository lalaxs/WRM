# Stage 2 Task 4 Implementation Report

## Scope

- Added `core/inventory.js`.
- Added `selftest_stage2_inventory.js`.
- Registered the focused suite in `selftest_all.js`.
- Did not modify the runtime, UI, simulation adapter, domain modules, or
  generated `release/` files.

## RED

1. Registered `selftest_stage2_inventory.js` before creating it.
2. Ran `npm test`.
3. All existing suites passed and the full run failed only because the new
   suite was missing (`MODULE_NOT_FOUND`).
4. Added the complete behavior suite before production code.
5. Ran `node selftest_stage2_inventory.js`; it failed because
   `core/inventory.js` was missing.

## GREEN

- `node --check core/inventory.js`: passed.
- `node selftest_stage2_inventory.js`: 150 passed / 0 failed.
- `npm test`: all suites passed, including inventory 150 / 0.
- `git diff --check`: passed.

## Formal review fix RED

- Additive capacity-grant coverage produced 3 expected failures.
- Strict own-property delta coverage produced 5 expected failures.
- Canonical binding-shape coverage produced 3 expected failures.
- Each review item was brought back to GREEN before the next item was
  implemented.

## Implemented contract

- Frozen UMD/CommonJS API:
  `occupiedSlots`, `availableQuantity`, `canApply`, `apply`, `bind`,
  `unbind`, `sell`, `grantCapacity`, and `query`.
- Canonical transaction input is a plain own-data signed net-delta record
  whose direct prototype is `Object.prototype` or `null`.
  `Reflect.ownKeys` validation rejects arrays, symbols, non-enumerable keys,
  accessors, inherited/custom prototypes, unknown item IDs, unsafe integers,
  fractions, `NaN`, and infinities without consulting prototype
  constructors.
- Zero deltas are valid no-ops. Object keys are unique, so duplicate delta
  keys are not an accepted input shape; same-item costs and gains are passed
  as their signed net delta.
- Every cost is checked against total owned and all three binding reasons
  before any temporary stack is changed. Capacity is checked only after all
  negative and positive entries have been applied to the temporary map.
- All failures return detached, value-equivalent normalized inventory data.
  No cost, output, binding, or capacity change survives a failure.
- Exact slot boundaries, existing-stack output at capacity, slot reuse, and
  multiple new-stack contention are covered.
- Bindings support only `equipment`, `task`, and `formation`; availability
  subtracts all reasons. Sale uses `apply`, respects unbound quantity, and
  returns exact item sale value.
- Capacity grants support only `shop`, `achievement`, and `task`.
  Every valid call adds the full positive amount to both total capacity and
  that source's cumulative grant counter. Both sums are checked for
  safe-integer overflow before either value changes.
- Every retained binding item uses the exact
  `{equipment,task,formation}` shape, including zero values. The item binding
  record is removed only when all three values reach zero.
- Query results are deeply frozen, JSON-safe, category-stable, registry-order
  stable, and searchable by Unicode-normalized case-insensitive item ID or
  display name.
- Production code has no DOM, Canvas, storage, timer, save, or randomness
  dependency.

## Concerns

- None within Task 4 scope.
