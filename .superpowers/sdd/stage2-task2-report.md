# Stage 2 Task 2 Report — State Defaults and Lossless Migration

## Scope

Implemented the Stage 2 persistence boundary and legacy migration:

- `core/stage2-state.js`
- `core/state-model.js`
- `core/save-system.js`
- synchronized copies of the changed core files under `release/core/`
- focused Stage 2 state tests and full-suite registration
- persistence, simulation-fixture, and browser-composition compatibility tests

This task does not implement Stage 2 domain rules, UI, progression, or page
script injection. Task 11 must load the Stage 2 content modules and
`core/stage2-state.js` before `SaveSystem` and `StateModel`; Task 14 completes
the full release composition.

The compatibility bundle items required by the Task 2 brief were already
present in `content/items.js` from the accepted Task 1 baseline, so this task
did not duplicate or alter those records.

## RED evidence

1. Registered `selftest_stage2_state.js` in `selftest_all.js` before creating
   the file.
2. `npm test` failed only because `selftest_stage2_state.js` was missing; all
   pre-existing suites remained green.
3. Added the focused migration/default-state suite before the production
   module existed.
4. `node selftest_stage2_state.js` then failed with
   `Cannot find module './core/stage2-state.js'`.
5. The focused suite was expanded while implementation proceeded, ending at
   135 assertions that cover malformed and adversarial persisted input as
   well as the specified happy paths.

## Implemented state contract

`Stage2State` exposes exactly:

- `createDefaults()`
- `normalize(model)`
- `migrateLegacyPlayer(player, systems)`
- `normalizeActionKey(key)`
- `occupiedSlots(inventory)`

The default model includes all 12 canonical skills, mastery records for every
applicable content definition except charm, a 40-slot inventory, three farm
plots, one formation slot, empty beast activity, all ten shared fish stocks,
parallel-job state, and world/fishing timing anchors.

Normalization clamps every finite range defined by the plan, removes charm
mastery, preserves known valid mastery records, archives unknown legacy
skills and mastery pools, repairs malformed containers, retains mature crops
without auto-harvesting, removes invalid formation/beast bindings without
deleting valid roster beasts, and produces JSON-safe finite state.

The module is pure: the static scan found no DOM, storage, or `Math.random`
dependency.

## Migration matrix

| Input | Stage 2 composition | Legacy composition without `Stage2State` |
| --- | --- | --- |
| schema v1 | explicit v1 → v2 → v3 | explicit v1 → v2 |
| schema v2 | explicit v2 → v3 | read/write as v2 |
| schema v3 | validate and read as v3 | treat as future; never overwrite |
| schema > active version | reject as future; zero writes | reject as future; zero writes |

`SaveSystem.SCHEMA_VERSION` is publicly 3. Until Task 11 assembles the new
browser scripts, the capability-gated legacy composition continues to create
schema v2 saves. It recognizes schema v3 as future data and refuses to
downgrade, strip, or overwrite it. This transition keeps the current browser
and release entry points safe without prematurely changing script order.

The v2 → v3 migration preserves Stage 1B timing, current-action progress,
offline reports, RNG state, spiritual stones, cultivation, and all existing
snapshot fields. It also:

- merges legacy aggregate resources and pill aliases into canonical stacks;
- allocates stable resource-point instance IDs;
- proportionally converts per-spot fishing stock to shared species stock;
- carries and clamps the shared fish recovery accumulator;
- preserves already-normalized homestead containers instead of overwriting
  them;
- maps every specified legacy action alias;
- clears unknown/removed actions and records `legacy_action_removed` in the
  next pending offline report.

Strict schema-v3 validation rejects missing branches, primitive containers,
negative values, unknown active actions, and half-present timing-anchor pairs.
The startup repair path can then rebuild safe canonical state.

## Compatibility-fixture changes

`selftest_simulation.js` previously used `StateModel` to manufacture generic
fixtures containing deliberately synthetic item and action IDs. `StateModel`
is now correctly a schema-v3 content boundary and must reject those IDs.

The generic `Simulation`/`GameRules` tests now construct equivalent Stage 1B
simulation fixtures directly. Their production, material, gathering,
fishing, lifespan, and timing assertions remain intact; no behavioral
assertions were deleted. StateModel-boundary and persistence tests use real
Stage 2 content IDs and canonical action keys.

`selftest_ui.js` explicitly creates the still-current browser composition
without `Stage2State`. This locks the capability gate until Task 11 updates
the real page composition. A separate browser-VM test loads the Stage 2
module and proves schema-v3 behavior.

## GREEN evidence

- Stage 2 state suite: **155 passed / 0 failed**
- Foundation suite: **73 passed / 0 failed**
- Stage 2 content suite: **928 passed / 0 failed**
- Simulation suite: **249 passed / 0 failed**
- Skill-network suite: **177 passed / 0 failed**
- UI migration suite: **85 passed / 0 failed**
- `npm test`: **1,667 total assertions passed**
- `node --check`: all changed runtime and test files passed
- purity scan over `core/stage2-state.js`: passed
- `git diff --check`: passed
- repeated `npm run release:sync`: identical SHA-256 hashes before and after

The release synchronization used only the repository's existing allowlist.
It synchronized `core/save-system.js` and `core/state-model.js`; it did not
add Stage 2 content, `stage2-state.js`, or entry-point scripts to the release
allowlist.

## Formal-review hardening

The Task 2 formal review identified five persistence-boundary gaps. Each
follow-up began with an adversarial focused test and produced an observed RED
before implementation:

- future-schema scan: 2 failures;
- removed-action disclosure: 4 failures, including schema-v3 rejection;
- strict schema-v3 player/report validation: 9 failures;
- stable beast/resource ID counters: 1 failure;
- direct half-anchor normalization: 1 failure.

The initial follow-up run was **138 passed / 17 failed**. After the minimal
fixes, the focused suite is **155 passed / 0 failed**.

### Future-schema recovery protection

`SaveSystem.load` now reads both primary and backup before selecting a usable
snapshot and records the highest future schema version found in either
location. A valid active-version primary plus a future backup is displayable
but write-protected in both capability modes:

- active schema v2 protects a schema-v3 backup;
- active schema v3 protects a schema-v4 backup.

Subsequent `save` performs zero writes and preserves both original serialized
byte strings exactly.

### Removed-action disclosure

Unknown v1, v2, and split-key legacy actions can no longer disappear before
`StateModel` observes their outcome. Migration clears the action and records
`legacy_action_removed` exactly once:

- an existing next pending report receives the warning;
- an empty inbox receives a canonical zero-duration report;
- an already-present warning is not duplicated;
- known aliases continue to migrate without the warning.

A structurally valid schema-v3 snapshot containing an unknown active action
is no longer accepted as a clean primary; it falls back to backup and requests
repair.

### Strict schema-v3 validation and canonical reports

The complete persisted player object is now compared against a whitelist
normalization, not only its Stage 2 progress branches. Negative/non-numeric
base values and extra fields such as `runtimeCache` are rejected on load and
removed during snapshot creation.

Pending and archived simulation reports now use an exact canonical structure.
The validator checks every required outer and nested key, finite non-negative
numbers, action/report shapes, arrays, maps, warnings, and stop reasons.
Primitive reports, extra fields, and negative quantities trigger backup
recovery. Snapshot creation canonicalizes legacy reports and removes unsafe
or unknown fields before persistence, leaving reports safe for
`SimulationReport.summarize`.

Foundation assertions that previously retained arbitrary player/report fields
were updated to assert the stricter whitelist and canonical legacy-report
conversion. The simulation test named “pre-anchor schema-v2” previously
carried a schema-v3 fixture; it now explicitly sets schema version 2 and
asserts the real v2 → v3 migration while preserving the same precision and
anchor behavior.

### Stable counters and direct anchors

`homestead.beasts.nextId` is now greater than every numeric `beast-N` or
`encounter-N` ID across both roster and pending encounters. Save/reload plus
continued allocation tests prove that neither beast nor resource-point IDs
are reused. The existing gathering counter already scanned every canonical
resource-point slot and is now locked by the same round-trip test.

Direct `Stage2State.normalize` now completes half-present timer anchor pairs
for parallel jobs as `null/null`, matching farm, StateModel, and formal
composition behavior.

The follow-up release synchronization remained on the existing allowlist.
Core and release copies were byte-identical, and a second synchronization
left their SHA-256 hashes unchanged.

## Commit

- `0c40802 feat: add stage 2 state and legacy migration`
- `fix: harden stage 2 migration validation` (this follow-up commit)

## Follow-up contract

Task 11 must assemble the browser scripts in dependency order and switch the
page from the protected schema-v2 compatibility path to the schema-v3 Stage
2 path. Task 14 must perform the corresponding complete release assembly.
Until then, schema-v3 saves remain write-protected when opened by an
unassembled legacy page.
