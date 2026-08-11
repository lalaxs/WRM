# Stage 2 Task 8 implementation report

## Scope

- Added the pure frozen `Farm` UMD/CommonJS API with exactly `plant`,
  `advance`, `harvest`, and `query`.
- Added the independent real-time farmland suite and registered it in
  `selftest_all.js`.
- Did not connect farmland to `Simulation`, `GameAPI`, UI, or `release/`;
  those remain later Stage 2 tasks.

## RED

1. Registered `selftest_stage2_farm.js` before creating it.
2. Ran `npm test`; every existing suite remained green and the run failed
   only because the new suite was absent.
3. Added the initial full behavior suite before production code.
4. Ran `node selftest_stage2_farm.js`; it failed with the expected
   `MODULE_NOT_FOUND` for `core/farm.js`.

## GREEN

- First implementation run: 77 passed / 6 failed. All six failures were in
  the VM dependency-observation fixture.
- Root-cause tracing showed that the outer-realm `Inventory.apply` rejected
  the VM-realm delta prototype. The farm transaction had already made exactly
  one draw and one apply. The fixture now copies only the delta at that realm
  boundary, matching a same-realm browser load without weakening production
  validation.
- Final focused suite: **138 passed / 0 failed**.
- Full `npm test`: all suites passed.

## Implemented contracts

- Planting validates the normalized player/farm shape, plot existence and
  unlock count, empty plot, crop unlock, mastery record, duration inputs, and
  seed transaction before committing.
- Seed consumption uses `Inventory.apply` exactly once. Planting snapshots
  skill speed, crop mastery speed, and the farm reduction capped at 40%, then
  rounds to a positive integer second.
- Plant, advance, and harvest preserve both `mainAction` and `current`
  reference identity and never mutate their input model.
- Every growing plot owns a complete persisted cumulative timing account:
  `remainingAnchorMs` stores the already-accounted offset and
  `remainingBaseSeconds` accumulates elapsed calls in ordinary JavaScript call
  order. `remainingSeconds` is only a projection and is never reused as the
  next call's time base.
- Maturity canonicalizes the timing pair at the exact boundary, keeps the
  crop indefinitely, emits completion once in plot order, and never harvests.
- Harvest preflight failures consume zero draws. Every valid mature harvest
  consumes exactly one serialized `GameRandom.next` draw before its single
  atomic inventory transaction.
- A full inventory returns the advanced seed while retaining the mature crop
  and all progression, preventing reroll abuse. An existing output stack
  remains usable in a full bag.
- Extra harvest chance is strict `<`, caps at 75%, and produces either one or
  two complete base batches.
- Farming and crop-mastery XP are committed only after output fits.
  Cultivation is always zero. Unsafe XP addition is rejected before random or
  inventory effects, while level 99 remains `{level:99,xp:0}`.
- Successful harvest clears only its plot to the canonical empty shape with a
  complete null timing pair.
- Query returns detached, deeply frozen plot cards and crop rows with stable
  content order, clamped progress, seed counts, unlock levels/status, and
  mastery levels.
- Crop content and callable dependencies are captured at module load.
  Accessor/proxy state fails closed and late dependency mutation cannot change
  behavior.

## Timing verification

- `123 + 177` against one 300-second call.
- 37-part real-number partition against its JavaScript-reduce batch.
- 24 additional deterministic random partitions, comparing full farm JSON
  and aggregated completion reports.
- `600 x 0.1` against its JavaScript-reduce batch.
- Strict non-completion at `60 - 4e-13`, then completion after the final
  `4e-13`.
- JSON plus `Stage2State.normalize` save/reload at a fractional midpoint.
- Three different crop durations, stable simultaneous completion order,
  repeated mature advancement, and a 48-hour real-time advance.

## Verification

- `node --check core/farm.js`
- `node --check selftest_stage2_farm.js`
- `node selftest_stage2_farm.js` — 138 passed / 0 failed
- `npm test` — pass
- `git diff --check`
- Production purity scan for global randomness, DOM, Canvas, storage/save,
  timers, and UI side effects

## Concerns

None within Task 8. Chronological passive-lane scheduling, command exposure,
and rendering remain deliberately deferred to Stage 2 Tasks 11–13.
