# Stage 2 Task 6 implementation report

## Scope

- Extended the frozen gathering factory with discoverable `fish` and
  `advanceFishStocks` methods.
- Added deterministic fishing completion with shared species stocks,
  species mastery, atomic fish/fish-box inventory output, and fixed RNG
  consumption.
- Added shared passive fish-stock recovery with additive capped reductions,
  exact decimal chunk accumulation, capped recovery reports, and no banked
  time after all species fill.
- Registered the independent Stage 2 fishing self-test suite.
- Updated the Task 5 factory-key assertion and its mutable content fixture
  for the enlarged public API; all original Task 5 behavioral assertions
  remain unchanged.

## RED

Initial suite registration:

- `npm test` failed only because `selftest_stage2_fishing.js` was missing.
- Existing Stage 2 gathering remained 235 passed / 0 failed.

Factory API RED:

- 0 passed / 2 failed because `fish` and `advanceFishStocks` were absent.

Behavior RED after adding minimal API placeholders:

- 46 passed / 73 failed.
- Failures covered the unimplemented shared stock, three-draw completion,
  atomic inventory, species progression, retry boundary, and recovery
  behavior.

## GREEN

Focused results:

- `selftest_stage2_fishing.js`: 119 passed / 0 failed.
- `selftest_stage2_gathering.js`: 235 passed / 0 failed.

Full regression:

- foundation: 73 passed
- Stage 2 content: 928 passed
- Stage 2 state: 155 passed
- Stage 2 progression: 148 passed
- Stage 2 inventory: 150 passed
- Stage 2 gathering: 235 passed
- Stage 2 fishing: 119 passed
- simulation: 249 passed
- skill network: 177 passed
- UI migration: 85 passed
- `npm test`: pass

## Implemented contracts

- Locked/unknown spots and invalid/empty state preflights consume zero RNG.
- A successful catch and an inventory-full completion consume exactly three
  draws: species, extra yield, and the 8% fish-box roll.
- Inventory-full returns the advanced RNG state while leaving all model data
  unchanged, preventing reroll abuse.
- Fish and fish-box outputs are one atomic inventory transaction.
- Extra yield caps at 75% and never consumes extra species stock.
- Species stock and mastery are shared across every spot.
- Empty-stock waiting preserves the action and reports a strictly positive
  retry time from the shared accumulator and current effective interval.
- Recovery reductions combine additively and cap at 40%, making 36 seconds
  the minimum interval.
- The accumulator stores elapsed seconds across bonus changes; it is not
  proportionally rescaled.
- Decimal accumulation makes 17+43, 59.999+0.001, and 600×0.1 seconds agree
  with their matching batch boundaries.
- Large elapsed values use bounded arithmetic rather than per-interval
  iteration; every species caps at 20 and surplus time is discarded once all
  stocks fill.
- Dependencies and fishing content are snapshotted and frozen at factory
  creation; accessor, inherited, and revoked-proxy bonuses are ignored
  without invocation.

## Verification

- `node --check core/gathering.js`
- `node --check selftest_stage2_fishing.js`
- `node selftest_stage2_fishing.js`
- `node selftest_stage2_gathering.js`
- `npm test`
- `git diff --check`
- Production purity scan for global randomness, DOM, storage, timer, Canvas,
  and UI side effects

## Concerns

None for Task 6. Simulation-lane scheduling and UI exposure remain correctly
deferred to later Stage 2 tasks.

## Formal review fix

The formal review found one partition-invariance defect. Although
`18.117720000000002 + 41.882279999999994 === 60` in JavaScript, the original
per-call decimal projection retained `59.99999999999999`, so the split call
missed a recovery that the bulk call completed.

Review-fix RED:

- focused suite: 142 passed / 31 failed
- reviewer split state/report mismatch
- no complete persisted mid-recovery timing account
- save/reload midpoint mismatch
- deterministic random-partition property failures

Review-fix GREEN:

- focused suite: 179 passed / 0 failed
- existing `fishRecoverAnchorMs` and `fishRecoverBaseSeconds` now form the
  cross-call JSON timing account
- `fishRecoverAcc` is the canonical readable projection of that account
- completed intervals atomically rebase all three fields
- all-full stocks reset to `{acc:0,anchor:null,base:null}`
- a final-boundary-only four-ULP scale-relative reconciliation handles legal
  floating regrouping without absorbing a real `4e-13` duration
- reviewer split, 600×0.1, 17+43, 24 deterministic random partitions,
  midpoint JSON/Stage2State reload, dynamic bonus switching, 48-hour and huge
  elapsed cases all pass
- Stage 2 state: 155 passed / 0 failed
- foundation: 73 passed / 0 failed
- Task 5 gathering: 235 passed / 0 failed
- full `npm test`: pass

## Second formal review fix

The first review fix still depended on a four-ULP final-boundary
reconciliation. A 21-part sequence whose ordinary JavaScript reduction is
strictly 60 seconds accumulated an exact-account projection of
`59.99999999999996`, proving that any fixed ULP allowance remained dependent
on partition count.

Second-fix RED:

- focused suite: 180 passed / 2 failed
- the 21-part full gathering state differed from one bulk call
- the 21-part recovery report differed from the bulk report

Second-fix GREEN replaces boundary tolerance and per-interval remainder
rebasing entirely:

- `fishRecoverBaseSeconds` is the ordinary-JavaScript, call-order cumulative
  elapsed-seconds total since the last all-full reset
- `fishRecoverAnchorMs` is the cumulative settled-interval waterline in
  milliseconds
- `fishRecoverAcc` is only the canonical projection
  `totalSeconds - settledMs / 1000`
- completion compares `totalSeconds` directly with
  `settledMs / 1000 + currentInterval`; no epsilon or ULP allowance can turn
  a sub-boundary duration into a completion
- completing an interval advances only the waterline and never rebases the
  remainder into a new cross-call total
- all-full reset remains `{acc:0,anchor:null,base:null}`

Final focused result:

- `selftest_stage2_fishing.js`: 192 passed / 0 failed

Added properties cover:

- the exact 21-part review sequence
- 120- and 600-second multi-interval runs with all ten stocks empty
- ordinary-JavaScript-reduce bulk equivalence for state and reports
- reload after the first settled interval and continued report aggregation
- a dynamic 36-second interval
- 600 × 0.1-second calls against the same JavaScript-reduce bulk parameter
- strict non-completion at `60 - 4e-13`
