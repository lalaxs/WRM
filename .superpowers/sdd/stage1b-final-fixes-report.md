# Stage 1B final-review fixes

## Status

Implementation, independent re-review, and verification are complete. This
report is included in the final implementation commit.

## Root-cause analysis and hypotheses

### Persisted frame partitioning

The failure is outside the scheduler's local exact-time account. `Simulation`
uses a decimal `BigInt` account for `remaining` and `mainRemaining`, so boundaries
inside one `advance` call are protected. At every call boundary, however, the
rules persist ordinary binary floating-point results:

- `current.elapsed += seconds`, followed by `elapsed -= duration`;
- `mood += seconds * rate`;
- `fishRecoverAcc += seconds`, followed by subtraction at recovery;
- farm/parallel `remainingSeconds -= seconds`;
- `world.tickAccumulator += seconds`, followed by tick subtraction.

The next call reconstructs a boundary from those rounded values. Therefore the
frame partition becomes part of the persisted state. The scheduler cannot repair
information that was already rounded before the next `advance` begins.

Working comparison: the lifespan lane already uses an absolute wall-clock anchor
and baseline value. Repeated calls derive the public value from the same origin,
and a direct public-field mutation causes a self-healing rebase.

Confirmed hypothesis: generalizing that anchor/baseline pattern to every
persisted time-bearing rule field will make practical integer-millisecond
partitions independent without per-call rounding or relaxed equality.

The first implementation exposed a second-order fractional-boundary defect
during independent review. Although the scheduler's remaining-time account was
decimal-exact, its wall-clock cursor still used repeated binary
`elapsedReality += step`, and rule adapters formed end timestamps with
`startMs + seconds * 1000`. Repeated 0.1-second boundaries could therefore
miss one completion, and sub-millisecond schedules could persist one-bit
differences in anchors and public fields.

Confirmed follow-up hypothesis: derive the cursor as
`requested - remaining` in the same exact decimal account, perform timestamp
addition/subtraction through decimal parts, and derive completion anchors from
the prior action anchor plus its duration. Reconcile a supplied timestamp with
the persisted action/world logical cursor only when they differ by at most
eight scale-relative ULPs. There is no fixed absolute snap or frame quantum.

### Classic-script runtime scope

`index.html` loads `game.js` as a classic script. Top-level function declarations
become properties of the browser global object even though `window.GameAPI` is
narrow. Existing VM tests use `window !== globalThis`, which hides this browser
topology and append a lexical export string to `game.js`, so they do not detect
the leak.

Confirmed hypothesis: one whole-runtime IIFE, plus an explicit opt-in harness
that is created only when `window !== globalThis`, removes classic-script leaks
while keeping VM test access. A browser-faithful VM with
`window === globalThis` must expose no harness even when the request flag exists.

### Renderer state argument

The runtime calls `window.UI.renderGame(state)`. This bypasses the query boundary
by handing the private mutable runtime object to a global renderer.

Confirmed hypothesis: the renderer already reads `window.GameAPI`; invoking it
with zero arguments removes the reference without changing UI boot order.

### Command timestamp settlement

`commitModel` clones the runtime at its old `processedThroughMs`, applies the
start/switch/stop mutation, and saves at `Date.now()`. `savedAt` advances, but the
candidate watermark and simulation state do not. The next frame then either
assigns the gap to the new action or loses it behind the saved wall-clock time.

Confirmed hypothesis: for action-affecting commands only, simulate the detached
candidate from its persisted watermark to the command timestamp before running
the mutator, then save/apply or retain that single candidate through the existing
recovery coordinator. This preserves atomicity and retry single-application.

## Representation design and schema implications

The selected representation is additive, JSON-safe absolute wall-clock
anchor/baseline metadata adjacent to each public value:

- current action: `elapsedAnchorMs` + `elapsedBaseSeconds`;
- mood: `moodAnchorMs` + `moodBase`;
- fish recovery: `fishRecoverAnchorMs` + `fishRecoverBaseSeconds`;
- farm/parallel item: `remainingAnchorMs` + `remainingBaseSeconds`;
- world ticks: `tickAnchorMs` + `tickBaseSeconds`;
- lifespan retains `lifespanAnchorMs` + `lifespanBaseYears`.

Boundary queries use absolute deadlines derived from these pairs and the
scheduler's current wall-clock time. Elapse derives the public value from the
same origin. Resolution rebases at the exact boundary. If future gameplay or a
migration directly changes a public value without updating metadata, the adapter
detects incoherence within a small ULP tolerance and rebases automatically.

This remains schema v2/model v1 as a backward-compatible additive change.
Existing v2 and migrated v1 snapshots may omit every new pair; normalization
stores `null` pairs and the first subsequent elapse establishes the anchor.
Save/load retains finite non-negative anchors without integer flooring, allowing
future fractional-millisecond action boundaries. Unknown future schema snapshots
remain protected by the existing loader.

Each pair is complete-or-null after normalization. Validation accepts an older
snapshot where both fields are absent, a canonical pair where both are `null`,
or a complete finite non-negative pair. A half-present pair is invalid and
enters the existing backup/repair path. This applies uniformly to the action,
mood, lifespan, fish, farm items, parallel jobs, and world tick metadata.

## RED evidence

- Baseline before new tests: simulation **203/203**, UI **79/79**, skillnet
  **177/177**.
- `node selftest_simulation.js`: **204 passed / 8 failed**. Expected failures:
  176×17ms+8ms/full JSON, 30×0.1s/full JSON, main completion, low mood,
  farm completion, parallel completion, world boundary, and save/load
  continuation. Fish recovery happened to resolve in the fixture and remained a
  passing boundary assertion.
- `node selftest_ui.js`: **79 passed / 6 failed**. Expected failures:
  browser-global denylist, zero-argument renderer, timestamp-settled start,
  switch, stop, and failed-switch retry single-application.
- `node selftest_skillnet.js`: stopped with the single expected failure
  `explicit Node-only game harness is unavailable`.
- Independent review then added repeated-boundary and pair-integrity tests.
  `node selftest_simulation.js` reported **216 passed / 11 failed**:
  - repeated 0.1-second and 0.4-millisecond completion schedules exposed the
    rounded cursor/boundary issue;
  - partial mood, lifespan, farm, and parallel pairs were still accepted or
    preserved instead of canonicalized/repaired.
- Follow-up review found that the interim fixed `1e-9` millisecond timestamp
  snap erased legal sub-picosecond intervals. The added 10×`4e-13`-second
  regression produced **227 passed / 1 failed**, with matching completions/RNG
  but one-ULP passive-state differences.

## GREEN evidence

- `node selftest_simulation.js`: **228 passed / 0 failed**.
  - Full JSON equality: 176×17ms+8ms online vs one 3s offline.
  - Full JSON equality: 30×0.1s online vs one 3s offline.
  - Repeat and finite main-action completion, low mood, fish recovery, farm,
    parallel, world boundary, lifespan, and save/load continuation all use the
    same final persisted state.
  - The snapshot test asserts every new anchor/baseline pair survives save/load.
  - A pre-anchor schema-v2 snapshot remains a normal writable v2 snapshot and
    lazily establishes anchors.
  - Repeated 0.1-second and 0.4-millisecond action boundaries produce the same
    full JSON, completion totals, and RNG state in bulk and partitioned runs.
  - Ten repeated `4e-13`-second boundaries match one `4e-12`-second bulk run
    without absolute timestamp snapping.
  - Absent, complete finite, complete-null, and every half-pair permutation are
    covered for player and timed-list metadata; half-pairs use backup/repair.
- `node selftest_ui.js`: **85 passed / 0 failed**.
  - A browser-faithful VM uses `window === globalThis`, requests the test
    harness, and proves the request is ignored in browser topology.
  - The expanded global denylist is empty; `GameAPI` and all three sub-objects
    are frozen and its keys are exactly `commands,queries,render`.
  - The global renderer interception receives zero arguments.
  - Controlled-time start, switch, and stop commands settle the old model first.
    A failed settled switch leaves runtime/committed state unchanged and the
    dedicated retry applies the held candidate exactly once.
- `node selftest_skillnet.js`: **177 passed / 0 failed** using the explicit
  opt-in VM-only harness rather than appended lexical exports.
- `node selftest_foundation.js`: **70 passed / 0 failed**.
- `node selftest_release.js`: exit code **0** after synchronization.
- Focused assertion total: **560 / 560**, excluding the byte-equality release
  loop from the numeric assertion counters.

## Implementation

### Chunk-invariant time

`Simulation` now passes its existing helper clock into `rules.nextBoundary`,
`rules.elapse`, and `lane.nextBoundary`. Existing adapters that ignore an extra
argument remain compatible. Its wall-clock cursor is derived from exact decimal
`requested - remaining` parts instead of a repeated floating-point addition.
`GameRules` uses one shared anchor implementation for decimal-safe timestamp
addition/subtraction, deadline calculation, public-value derivation, ULP
coherence checks, and boundary rebasing.

The main action and all passive time fields therefore derive from absolute
wall-clock origin data rather than recurring public-field addition/subtraction.
At a boundary, action/fish/world residuals are rebased at the mathematically
derived boundary time; completed farm/parallel entries are removed as before.
Lifespan now uses the same shared implementation and retains direct-mutation
self-healing.

`StateModel` and `SaveSystem` preserve the additive fields and canonicalize
partial pairs to `null`/`null` when writing. V2 validation accepts both older
snapshots with missing pairs and canonical snapshots with either a complete
finite pair or a complete `null` pair, while rejecting half-pairs so backup or
repair can run. Anchor timestamps are not floored, so fractional-millisecond
boundaries are not destroyed by normalization.

### Runtime/API isolation

All of `game.js` is inside one strict IIFE. Browser publication remains only the
frozen `window.GameAPI`. Tests explicitly request a frozen
`__GameTestHarness` only in VM topology where `window !== globalThis`; the same
request produces no harness in browser topology. The old source-appended export
was removed.

The runtime now calls `window.UI.renderGame()` with no arguments. UI continues
to query the public API, and boot/load order is unchanged.

### Command timestamp transaction

`commitModel` has a private `settleToTimestamp` option used only by start/switch
and stop commands. It:

1. clones the committed runtime model at `processedThroughMs`;
2. simulates that detached candidate online through the command timestamp;
3. applies the action mutation;
4. saves and applies the combined candidate atomically.

If saving fails, the existing private recovery coordinator retains that exact
candidate, including gains and RNG. The runtime is unchanged, ordinary progress
remains locked, and the dedicated retry saves/applies it once.

## Files changed

Root:

- `core/game-rules.js`
- `core/save-system.js`
- `core/simulation.js`
- `core/state-model.js`
- `game.js`
- `selftest_simulation.js`
- `selftest_ui.js`
- `selftest_skillnet.js`
- `.superpowers/sdd/stage1b-final-fixes-report.md`

Generated only by `npm run release:sync`:

- `release/core/game-rules.js`
- `release/core/save-system.js`
- `release/core/simulation.js`
- `release/core/state-model.js`
- `release/game.js`

`index.html`, `ui.js`, and `release/NIE` were not changed.

## Final verification

1. Syntax checks: `node --check` passed for all six core runtime modules,
   `game.js`, `ui.js`, and all six self-test files.
2. Static forbidden scans returned no matches for:
   - old `offlineSettle` / `tickCurrent`;
   - gameplay `Math.random`;
   - `allowPendingCommit` / `ignoreLock`;
   - UI direct state/data/persistence access;
   - leaked `window.*` runtime helpers;
   - a renderer call with any argument;
   - the historical `globalThis.__G` / source-append harness.
3. Pre-sync `node selftest_release.js` correctly reported five drifted generated
   files: `game.js`, `core/save-system.js`, `core/state-model.js`,
   `core/simulation.js`, and `core/game-rules.js`.
4. First `npm run release:sync`: **12 runtime files synchronized**.
5. `node selftest_release.js`: exit code **0**.
6. Authoritative final `npm test`: exit code **0** — foundation 70 +
   simulation 228 + skillnet 177 + UI 85 = **560 assertions**, all passing;
   release byte-equality passed.
7. `git diff --check`: exit code **0**. Git emitted only the repository's
   existing LF/CRLF conversion notices.
8. Second `npm run release:sync`: **12 runtime files synchronized**; the
   pre/post `git status --short` file lists were identical, proving no new diff.
9. Independent final re-review: **Approved**, with no Critical, Important, or
   Minor findings. The reviewer also exercised a real RNG/gain-producing
   sub-picosecond gathering schedule and observed identical JSON, gains,
   completions, and final RNG.

## Self-review

- The exact scheduler still owns transition order, caps, stop precedence, and
  RNG. The change only supplies absolute time to rule adapters.
- Online and offline continue through the same `Simulation.advance`.
- The 12-hour main-action cap and full passive/lifespan advancement are
  unchanged and covered by the existing 20-hour matrix.
- V1 migration, old v2 compatibility, future-schema write protection, repair,
  offline recovery, and report idempotency remain green.
- Browser API keys remain exactly the locked public contract. No state, content
  table, raw advance, cache/report, persistence helper, recovery capability, or
  test seam is browser reachable.
- Command settlement uses the existing save/recovery transaction and does not
  add a lock bypass or second retry path.
- Root remains authoritative; generated release files are byte-equal and
  `release/NIE` was untouched.
- No Stage 2 code or content was started.

## Concerns

None.

## Commit

The final handoff records the commit SHA after this report and all root/generated
files are staged together.
