# Stage 1B persistence-precision review fixes

## Status

The remaining Stage 1B formal-review findings are fixed. This report, the
runtime changes, generated release copies, and regression tests are included in
one task commit.

## Root cause

### Fractional persistence and reports

`Simulation` already kept a decimal exact clock inside one advance, but three
persistence/report boundaries discarded it:

- `StateModel.normalize` floored `processedThroughMs`;
- `SaveSystem.createSnapshot` floored both `savedAt` and
  `processedThroughMs`;
- `SimulationReport` floored `fromMs` and `toMs` before storing them and before
  generating an ID.

Consequently a save at 0.4 ms or 4e-13 seconds reopened at time zero. Two
successive sub-millisecond report windows also collapsed onto the same integer
window, generated the same ID, and were deduplicated from the pending inbox.

### Unsafe timed-array entries

`SaveSystem.validTimedArrayAnchors` explicitly treated every non-record item as
valid and checked only optional anchor pairs. It did not require a usable ID or
a finite non-negative `remainingSeconds`. Both SaveSystem and StateModel then
preserved primitive, null, and incomplete timed entries. Those values could
reach the farm/parallel lanes and crash or be incorrectly completed.

## RED evidence

After adding the required persistence, report, repair, and simulation-safety
regressions, `node selftest_simulation.js` produced:

- **230 passed / 12 failed**
- four failures for 0.4 ms and 4e-13 s non-integer save watermarks and resumed
  full-JSON equality;
- one failure for consecutive sub-millisecond report windows, IDs, and inbox
  retention;
- six failures for primitive, null, and missing-timer farm/parallel entries not
  entering backup repair;
- one failure because StateModel retained unsafe timed entries.

The pre-existing complete/absent/null/half-anchor validation already rejected
half pairs through backup repair, so the new half-pair safety checks remained
green during RED.

## Fix design

### Exact JSON-safe watermarks

`savedAt`, `processedThroughMs`, `fromMs`, and `toMs` remain JSON numbers, but
are now preserved as finite non-negative values without integer flooring.
Integer inputs therefore retain exactly the same numeric representation.
Existing schema-v1 and schema-v2 saves remain loadable.

New reports with any fractional endpoint use a collision-free,
length-prefixed identity tuple containing:

1. source;
2. canonical JavaScript decimal text for `fromMs`;
3. canonical JavaScript decimal text for `toMs`;
4. action key;
5. starting RNG seed.

This representation is JSON-safe and unambiguous without relying on a hash.
Reports whose endpoints are both integers retain the existing hashed ID rule,
preserving integer-boundary identity and compatibility. Persisted reports keep
their stored IDs during normalization.

### Timed-array validation and repair

Every farm plot and parallel job must now be a plain record with:

- a non-empty, non-whitespace string ID;
- a finite, non-negative `remainingSeconds`;
- an anchor/base pair that is absent, complete-null, or complete finite
  non-negative.

Invalid primary snapshots therefore enter the existing backup/repair path.
StateModel's defensive normalization drops primitive, null, missing-timer, and
invalid-ID entries. A structurally valid entry with a half anchor is retained
only after canonicalizing the pair to null/null, so direct normalization cannot
leave a value that later crashes simulation.

## Regression coverage

The new tests cover:

- one 0.4 ms cut and one 4e-13 s cut through
  `SaveSystem.createSnapshot` and `SaveSystem.load`;
- uninterrupted bulk, uninterrupted ten-part schedules, and save/load-resumed
  schedules with byte-for-byte full-state JSON equality;
- explicit equality of RNG, current action, player mood/lifespan, fish state,
  farm, parallel jobs, world state, and `processedThroughMs`;
- distinct fractional report windows, distinct IDs, and both reports retained
  by the pending inbox;
- farm and parallel primitive, null, missing `remainingSeconds`, and half-anchor
  corruption using backup/repair, followed by a non-throwing
  `Simulation.advance`;
- direct StateModel normalization of unsafe timed entries followed by a
  non-throwing simulation.

## GREEN and final verification

- Focused simulation suite: **242 passed / 0 failed**.
- Foundation suite: **70 passed / 0 failed**.
- Skill/content suite: **177 passed / 0 failed**.
- UI suite: **85 passed / 0 failed**.
- Authoritative `npm test`: **574 assertions passed**, release byte-equality
  included, exit code 0.
- `node selftest_release.js`: exit code 0 after `npm run release:sync`.
- Syntax checks passed for changed source and test files.
- `git diff --check`: exit code 0; only the repository's existing LF/CRLF
  conversion notices were emitted.

## Files changed

Authoritative source and tests:

- `core/save-system.js`
- `core/simulation-report.js`
- `core/state-model.js`
- `selftest_simulation.js`

Generated only by `npm run release:sync`:

- `release/core/save-system.js`
- `release/core/simulation-report.js`
- `release/core/state-model.js`

No design/plan document or Stage 2 implementation was changed.

## Concerns

None.

## Commit

The final handoff message records the task commit SHA after this report and all
authoritative/generated files are staged together. A Git commit cannot embed
its own final SHA in a tracked file without changing that SHA.
