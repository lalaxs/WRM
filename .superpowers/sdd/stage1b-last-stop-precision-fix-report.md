# Stage 1B last-action-stop precision fix

## Status

The sole remaining Important finding from the formal Stage 1B review is fixed.
No Stage 2 implementation or unrelated behavior was changed.

## Root cause

`Simulation.advance()` and `SimulationReport` already preserved an exact
fractional stop timestamp. When the completed runtime state crossed
`StateModel.toSnapshotInput()`, however, `normalizeLastActionStop()` converted
`lastActionStop.atMs` with `finiteInteger()`.

That conversion changed a 0.4 ms stop to 0 and likewise truncated the
sub-picosecond boundary. The report and live state therefore disagreed with
the snapshot input, saved snapshot, and reopened canonical state.

`SaveSystem.normalizeLastActionStop()` only clones the validated value and did
not contain a second integer conversion.

## RED evidence

Two regression cases were added before changing production code:

- finite `count: 1` completion after 0.0004 seconds (0.4 ms);
- finite `count: 1` completion after 4e-13 seconds (4e-10 ms).

Each case explicitly checks:

- `report.action.stopAtMs`;
- live, snapshot-input, snapshot, and reopened
  `lastActionStop.atMs`;
- full canonical state JSON equality before and after save/reopen.

`node selftest_simulation.js` then produced:

- **244 passed / 4 failed**;
- the report-time assertion passed for both cases;
- snapshot/reopen timestamp agreement and full-state JSON equality failed for
  both cases.

This isolated the failure to StateModel persistence normalization.

## Minimal fix

`StateModel.normalizeLastActionStop()` now uses `finiteNumber()` rather than
`finiteInteger()` after its existing validity guard.

The resulting semantics preserve any finite non-negative fractional
millisecond timestamp, keep legacy integer timestamps unchanged, and continue
to reject negative or non-finite values.

## GREEN and final verification

- Focused simulation suite: **248 passed / 0 failed**.
- Foundation suite: **70 passed / 0 failed**.
- Skill/content suite: **177 passed / 0 failed**.
- UI suite: **85 passed / 0 failed**.
- Authoritative `npm test`: **580 assertions passed / 0 failed**.
- `npm run release:sync`: synchronized all 12 runtime files.
- `node selftest_release.js`: exit code 0.
- Syntax checks: **20 runtime JavaScript files**, all passed.
- Second release sync: byte-identical and idempotent across all 318 release
  files.
- `git diff --check`: exit code 0; only the repository's existing LF/CRLF
  conversion notices were emitted.

## Files changed

Authoritative source and tests:

- `core/state-model.js`
- `selftest_simulation.js`

Generated only by `npm run release:sync`:

- `release/core/state-model.js`

Task evidence:

- `.superpowers/sdd/stage1b-last-stop-precision-fix-report.md`

## Concerns

None.

## Commit

The final handoff message records the task commit SHA. A tracked report cannot
contain its own final commit SHA without changing that SHA.
