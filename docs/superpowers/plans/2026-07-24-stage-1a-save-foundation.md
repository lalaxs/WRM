# Stage 1A Save Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unsafe multi-key save path with a versioned JSON-safe snapshot, introduce deterministic random state, and keep all current UI and gameplay behavior compatible.

**Architecture:** Add browser-and-Node compatible modules under `core/`. `game.js` remains the compatibility controller during this stage, but all saved data passes through `SaveSystem`, and all gameplay randomness passes through `GameRandom`. The existing DOM UI shell and current page behavior must not change.

**Tech Stack:** Native JavaScript, browser globals, CommonJS exports for Node self-tests, existing HTML/CSS/Canvas/DOM runtime.

## Global Constraints

- Preserve the existing top status bar, left navigation, right content area, CSS class names, and interaction direction.
- Do not introduce a framework, bundler, package dependency, or engine migration.
- Root source files are authoritative; `release/` is synchronized only by the release task.
- Player-facing copy must use audit-safe cultivation wording.
- The current player character remains female.
- Only one main action may be active.
- Every production change must be preceded by a test that fails for the intended reason.
- Existing `selftest_ui.js` and `selftest_skillnet.js` must remain green.
- Save data must never contain `Infinity`, `NaN`, functions, DOM nodes, Canvas objects, or runtime cache objects.
- The new snapshot key is exactly `cloud_save_v1`; the backup key is exactly `cloud_save_v1_backup`.
- The current schema version is exactly `1`.

---

### Task 1: Unified self-test runner

**Files:**
- Create: `package.json`
- Create: `selftest_all.js`
- Test: `selftest_all.js`

**Interfaces:**
- Consumes: existing `selftest_skillnet.js` and `selftest_ui.js`.
- Produces: `npm test` as the single full-suite command.

- [x] **Step 1: Write the runner with a deliberately missing required suite**

Create `selftest_all.js` with `selftest_foundation.js` in the suite list before that file exists:

```js
'use strict';

const { spawnSync } = require('child_process');

const suites = [
  'selftest_foundation.js',
  'selftest_skillnet.js',
  'selftest_ui.js'
];

let failed = 0;
for (const suite of suites) {
  const result = spawnSync(process.execPath, [suite], {
    cwd: __dirname,
    encoding: 'utf8'
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.status !== 0) failed++;
}

if (failed) {
  console.error(`\n=== 全量自测失败：${failed} 个测试文件未通过 ===`);
  process.exit(1);
}

console.log('\n=== 全量自测通过 ===');
```

- [x] **Step 2: Add the package script**

Create `package.json`:

```json
{
  "name": "xiuxian-idle-h5",
  "private": true,
  "scripts": {
    "test": "node selftest_all.js"
  }
}
```

- [x] **Step 3: Run the suite and verify the intended failure**

Run: `npm test`

Expected: FAIL because `selftest_foundation.js` does not exist. The two existing suites must still report 82/82 and 21/21 before the runner exits with failure.

- [x] **Step 4: Add the minimal foundation suite**

Create `selftest_foundation.js`:

```js
'use strict';

let pass = 0;
let fail = 0;

function ok(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.error('  ✗ FAIL: ' + message);
  }
}

ok(true, 'foundation test harness starts');

console.log(`\n=== 基础设施自测：${pass} 通过 / ${fail} 失败 ===`);
process.exit(fail ? 1 : 0);
```

- [x] **Step 5: Verify all current tests**

Run: `npm test`

Expected: PASS with foundation 1/1, skill network 82/82, UI 21/21, and final `=== 全量自测通过 ===`.

- [x] **Step 6: Commit**

```powershell
git add package.json selftest_all.js selftest_foundation.js
git commit -m "test: add unified self-test runner"
```

### Task 2: Deterministic serializable random source

**Files:**
- Create: `core/random.js`
- Modify: `selftest_foundation.js`
- Test: `selftest_foundation.js`

**Interfaces:**
- Consumes: unsigned 32-bit seed values.
- Produces: browser global `window.GameRandom` and CommonJS export with `DEFAULT_SEED`, `normalizeSeed`, `fromEntropy`, and `next`.

- [x] **Step 1: Add failing random-source tests**

Insert after the `ok` helper in `selftest_foundation.js`:

```js
const GameRandom = require('./core/random.js');

const firstA = GameRandom.next(123456789);
const firstB = GameRandom.next(123456789);
ok(firstA.seed === firstB.seed, 'same seed produces same next seed');
ok(firstA.value === firstB.value, 'same seed produces same value');
ok(firstA.value >= 0 && firstA.value < 1, 'random value stays in [0, 1)');

const second = GameRandom.next(firstA.seed);
ok(second.seed !== firstA.seed, 'random state advances');
ok(GameRandom.normalizeSeed(0) === GameRandom.DEFAULT_SEED, 'zero seed normalizes to default');
ok(GameRandom.fromEntropy(1000, 99) === GameRandom.fromEntropy(1000, 99), 'entropy conversion is deterministic');
```

- [x] **Step 2: Verify the test fails because the module is missing**

Run: `node selftest_foundation.js`

Expected: FAIL with `Cannot find module './core/random.js'`.

- [x] **Step 3: Implement the random module**

Create `core/random.js`:

```js
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.GameRandom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_SEED = 0x6D2B79F5;

  function normalizeSeed(value) {
    const seed = Number.isFinite(value) ? (value >>> 0) : DEFAULT_SEED;
    return seed === 0 ? DEFAULT_SEED : seed;
  }

  function fromEntropy(now, salt) {
    let value = (normalizeSeed(now) ^ normalizeSeed(salt)) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x45D9F3B) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x45D9F3B) >>> 0;
    value = (value ^ (value >>> 16)) >>> 0;
    return normalizeSeed(value);
  }

  function next(seed) {
    let value = normalizeSeed(seed);
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    value >>>= 0;
    return {
      seed: normalizeSeed(value),
      value: value / 0x100000000
    };
  }

  return Object.freeze({
    DEFAULT_SEED,
    normalizeSeed,
    fromEntropy,
    next
  });
});
```

- [x] **Step 4: Verify random tests and full regression**

Run: `node selftest_foundation.js`

Expected: PASS.

Run: `npm test`

Expected: all suites PASS.

- [x] **Step 5: Commit**

```powershell
git add core/random.js selftest_foundation.js
git commit -m "feat: add deterministic random source"
```

### Task 3: Versioned JSON-safe snapshot module

**Files:**
- Create: `core/save-system.js`
- Modify: `selftest_foundation.js`
- Test: `selftest_foundation.js`

**Interfaces:**
- Consumes: an adapter with `load(key)` and `save(key, value)` methods.
- Produces: `SaveSystem.SNAPSHOT_KEY`, `BACKUP_KEY`, `SCHEMA_VERSION`, `normalizeAction`, `createSnapshot`, `load`, and `save`.
- Runtime action representation: `{ key, mode: 'repeat'|'finite', count, done, elapsed, stalled }`.

- [x] **Step 1: Add JSON round-trip and migration tests**

Add to `selftest_foundation.js`:

```js
const SaveSystem = require('./core/save-system.js');

function jsonAdapter(initial, failKey) {
  const raw = Object.assign({}, initial || {});
  return {
    raw,
    load(key) {
      if (!(key in raw)) return null;
      return JSON.parse(raw[key]);
    },
    save(key, value) {
      if (key === failKey) return false;
      raw[key] = JSON.stringify(value);
      return true;
    }
  };
}

const repeating = SaveSystem.normalizeAction({
  key: 'caiyao',
  count: Infinity,
  done: 7,
  elapsed: 1.25,
  stalled: false
});
ok(repeating.mode === 'repeat', 'Infinity action migrates to repeat mode');
ok(Number.isFinite(repeating.count), 'repeat action keeps a JSON-safe count');

const legacyNull = SaveSystem.normalizeAction({
  key: 'caiyao',
  count: null,
  done: 3,
  elapsed: 0,
  stalled: false
});
ok(legacyNull.mode === 'repeat', 'legacy null count migrates to repeat mode');

const finite = SaveSystem.normalizeAction({
  key: 'gather:explore:herb',
  count: 1,
  done: 0,
  elapsed: 0,
  stalled: false
});
ok(finite.mode === 'finite' && finite.count === 1, 'finite action remains finite');

const snapshot = SaveSystem.createSnapshot({
  created: true,
  appearance: { parts: { hair: 2 } },
  player: { name: '测试角色' },
  current: { key: 'caiyao', count: Infinity, done: 4, elapsed: 2 },
  rngState: 123,
  fishRecoverAcc: 11,
  pendingOfflineReport: null
}, 10000);
const encoded = JSON.stringify(snapshot);
ok(encoded.indexOf('"count":null') === -1, 'snapshot does not serialize Infinity as a null action count');
ok(snapshot.schemaVersion === 1 && snapshot.savedAt === 10000, 'snapshot records schema and time');

const adapter = jsonAdapter();
ok(SaveSystem.save(adapter, snapshot, 10000) === true, 'snapshot save succeeds');
const loaded = SaveSystem.load(adapter, 10000);
ok(loaded.source === 'snapshot', 'snapshot loads from primary key');
ok(loaded.snapshot.current.mode === 'repeat', 'repeat action survives JSON round-trip');

const legacyAdapter = jsonAdapter({
  cloud_created: JSON.stringify('1'),
  cloud_nie: JSON.stringify({ parts: { hair: 3 } }),
  cloud_player: JSON.stringify({ name: '旧档角色' }),
  cloud_current: JSON.stringify({ key: 'caiyao', count: null, done: 9, elapsed: 1 }),
  cloud_lastsave: JSON.stringify(5000)
});
const migrated = SaveSystem.load(legacyAdapter, 10000);
ok(migrated.source === 'legacy', 'legacy cloud keys are detected');
ok(migrated.snapshot.player.name === '旧档角色', 'legacy player is preserved');
ok(migrated.snapshot.current.mode === 'repeat', 'legacy broken repeat action is repaired');

const failedAdapter = jsonAdapter({}, SaveSystem.SNAPSHOT_KEY);
ok(SaveSystem.save(failedAdapter, snapshot, 10000) === false, 'save failure is reported');
```

Also add regression cases that require:

- a corrupt/unparseable primary to fall back to a valid backup;
- an unreadable primary during save to be treated as absent;
- the previous primary to be written to backup before the replacement primary;
- a backup write failure or exception to return `false` without overwriting the primary;
- a primary write exception to return `false`;
- nested `Infinity`/`NaN` values to remain JSON-safe after stringify/parse;
- legacy data without `cloud_lastsave` to use the supplied `now`;
- parseable but structurally invalid v1 primaries to fall back to a valid backup; and
- a new-game v1 snapshot with `player: null` to remain valid.

- [x] **Step 2: Verify the test fails because the module is missing**

Run: `node selftest_foundation.js`

Expected: FAIL with `Cannot find module './core/save-system.js'`.

- [x] **Step 3: Implement the snapshot module**

Create `core/save-system.js`:

```js
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SaveSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA_VERSION = 1;
  const SNAPSHOT_KEY = 'cloud_save_v1';
  const BACKUP_KEY = 'cloud_save_v1_backup';

  function finiteNumber(value, fallback, min) {
    if (value == null) return fallback;
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min == null ? -Infinity : min, number);
  }

  function cloneJson(value, fallback) {
    if (value == null) return fallback;
    try {
      return JSON.parse(JSON.stringify(value, function (key, item) {
        return typeof item === 'number' && !Number.isFinite(item) ? 0 : item;
      }));
    } catch (error) {
      return fallback;
    }
  }

  function record(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function normalizeAppearance(value) {
    const appearance = cloneJson(value, null);
    if (!record(appearance)) return { parts: {} };
    if (!record(appearance.parts)) appearance.parts = {};
    return appearance;
  }

  function safeLoad(adapter, key) {
    try {
      return adapter.load(key);
    } catch (error) {
      return null;
    }
  }

  function safeSave(adapter, key, value) {
    try {
      return adapter.save(key, value) !== false;
    } catch (error) {
      return false;
    }
  }

  function normalizeAction(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.key !== 'string' || !raw.key) return null;
    const legacyRepeat = raw.count == null || raw.count === Infinity;
    const mode = raw.mode === 'repeat' || legacyRepeat ? 'repeat' : 'finite';
    return {
      key: raw.key,
      mode,
      count: mode === 'repeat' ? 0 : Math.max(1, Math.floor(finiteNumber(raw.count, 1, 1))),
      done: Math.floor(finiteNumber(raw.done, 0, 0)),
      elapsed: finiteNumber(raw.elapsed, 0, 0),
      stalled: !!raw.stalled
    };
  }

  function createSnapshot(input, now) {
    const source = input && typeof input === 'object' ? input : {};
    return {
      schemaVersion: SCHEMA_VERSION,
      savedAt: Math.floor(finiteNumber(now, Date.now(), 0)),
      created: !!source.created,
      appearance: normalizeAppearance(source.appearance),
      player: cloneJson(source.player, null),
      current: normalizeAction(source.current),
      rngState: (finiteNumber(source.rngState, 0x6D2B79F5, 0) >>> 0) || 0x6D2B79F5,
      fishRecoverAcc: finiteNumber(source.fishRecoverAcc, 0, 0),
      pendingOfflineReport: cloneJson(source.pendingOfflineReport, null)
    };
  }

  function recordOrNull(value) {
    return value === null || record(value);
  }

  function validAction(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const validMode = raw.mode === 'repeat' || raw.mode === 'finite';
    const validCount = Number.isInteger(raw.count) && (
      raw.mode === 'repeat' ? raw.count === 0 : raw.count >= 1
    );
    return (
      typeof raw.key === 'string' &&
      !!raw.key &&
      validMode &&
      validCount &&
      Number.isInteger(raw.done) &&
      raw.done >= 0 &&
      Number.isFinite(raw.elapsed) &&
      raw.elapsed >= 0 &&
      typeof raw.stalled === 'boolean'
    );
  }

  function validSnapshot(raw) {
    return (
      !!raw &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      raw.schemaVersion === SCHEMA_VERSION &&
      Number.isFinite(raw.savedAt) &&
      raw.savedAt >= 0 &&
      typeof raw.created === 'boolean' &&
      recordOrNull(raw.player) &&
      record(raw.appearance) &&
      record(raw.appearance.parts) &&
      (raw.current === null || validAction(raw.current)) &&
      Number.isInteger(raw.rngState) &&
      raw.rngState > 0 &&
      raw.rngState <= 0xFFFFFFFF &&
      Number.isFinite(raw.fishRecoverAcc) &&
      raw.fishRecoverAcc >= 0 &&
      recordOrNull(raw.pendingOfflineReport)
    );
  }

  function normalizeSnapshot(raw, now) {
    return createSnapshot(raw, finiteNumber(raw.savedAt, now, 0));
  }

  function loadLegacy(adapter, now) {
    const created = safeLoad(adapter, 'cloud_created');
    const appearance = safeLoad(adapter, 'cloud_nie');
    const player = safeLoad(adapter, 'cloud_player');
    const current = safeLoad(adapter, 'cloud_current');
    const savedAt = safeLoad(adapter, 'cloud_lastsave');
    if (created == null && appearance == null && player == null && current == null && savedAt == null) return null;
    return createSnapshot({
      created: created === '1' || created === 1 || created === true,
      appearance: appearance || { parts: {} },
      player,
      current,
      rngState: 0x6D2B79F5,
      fishRecoverAcc: 0,
      pendingOfflineReport: null
    }, finiteNumber(savedAt, now, 0));
  }

  function load(adapter, now) {
    const primary = safeLoad(adapter, SNAPSHOT_KEY);
    if (validSnapshot(primary)) return { source: 'snapshot', snapshot: normalizeSnapshot(primary, now) };
    const backup = safeLoad(adapter, BACKUP_KEY);
    if (validSnapshot(backup)) return { source: 'backup', snapshot: normalizeSnapshot(backup, now) };
    const legacy = loadLegacy(adapter, now);
    if (legacy) return { source: 'legacy', snapshot: legacy };
    return { source: 'empty', snapshot: createSnapshot({}, now) };
  }

  function save(adapter, input, now) {
    const snapshot = createSnapshot(input, now);
    const previous = safeLoad(adapter, SNAPSHOT_KEY);
    if (validSnapshot(previous) && !safeSave(adapter, BACKUP_KEY, normalizeSnapshot(previous, now))) return false;
    return safeSave(adapter, SNAPSHOT_KEY, snapshot);
  }

  return Object.freeze({
    SCHEMA_VERSION,
    SNAPSHOT_KEY,
    BACKUP_KEY,
    normalizeAction,
    createSnapshot,
    load,
    save
  });
});
```

- [x] **Step 4: Verify the focused and full tests**

Run: `node --check core/save-system.js`

Expected: syntax check PASS.

Run: `node selftest_foundation.js`

Expected: all foundation assertions PASS.

Run: `npm test`

Expected: all suites PASS.

- [x] **Step 5: Commit**

```powershell
git add core/save-system.js selftest_foundation.js
git commit -m "feat: add versioned snapshot save system"
```

### Task 4: Integrate snapshot and deterministic RNG without changing UI

**Files:**
- Modify: `index.html`
- Modify: `platform.js`
- Modify: `game.js`
- Modify: `ui.js`
- Modify: `selftest_foundation.js`
- Modify: `selftest_skillnet.js`
- Modify: `selftest_ui.js`
- Test: `selftest_foundation.js`
- Test: `selftest_skillnet.js`
- Test: `selftest_ui.js`

**Interfaces:**
- Consumes: browser globals `GameRandom` and `SaveSystem`.
- Produces: one `cloud_save_v1` snapshot, legacy import, JSON-safe repeat actions, serializable RNG state, and existing `window.GameAPI`.

- [x] **Step 1: Add failing browser integration assertions**

Extend the browser sandbox in `selftest_foundation.js` to load `core/random.js`, `core/save-system.js`, `game.js`, and assert:

```js
ok(typeof GameRandom.next === 'function', 'browser random API is available');
ok(typeof SaveSystem.load === 'function', 'browser save API is available');
```

Extend `selftest_skillnet.js`:

```js
ok(G.state.current && G.state.current.mode === 'repeat', 'setCurrent uses repeat mode');
ok(Number.isFinite(G.state.current.count), 'repeat action state is JSON-safe');
```

Replace the old assertion that requires `count === Infinity`.

Extend `selftest_ui.js` after starting an action:

```js
const persisted = JSON.parse(store.cloud_save_v1 || 'null');
ok(!persisted || persisted.schemaVersion === 1, 'UI flow uses the versioned snapshot when saved');
```

Change the `Platform` storage stub in `selftest_ui.js` to perform a real JSON round-trip:

```js
if (p === 'load') return (k) => (k in store ? JSON.parse(store[k]) : null);
if (p === 'save') return (k, v) => { store[k] = JSON.stringify(v); return true; };
```

- [x] **Step 2: Run tests and verify the intended failure**

Run: `npm test`

Expected: FAIL because the scripts are not loaded by the test sandboxes, `setCurrent` still uses `Infinity`, and versioned persistence is not integrated.

- [x] **Step 3: Load foundation scripts before game logic**

In `index.html`, insert before `game.js`:

```html
  <script src="core/random.js"></script>
  <script src="core/save-system.js"></script>
```

Load the same two files in the VM sandboxes before `game.js`.

- [x] **Step 4: Make platform storage report failures**

Replace `Platform.save` in `platform.js` with:

```js
    save(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        return false;
      }
    },
```

Keep `Platform.load` behavior unchanged.

- [x] **Step 5: Make runtime actions JSON-safe**

Add to `game.js`:

```js
function repeatAction(key) {
  return { key, mode: 'repeat', count: 0, done: 0, elapsed: 0, stalled: false };
}

function finiteAction(key, count) {
  return { key, mode: 'finite', count: Math.max(1, count | 0), done: 0, elapsed: 0, stalled: false };
}

function actionHasRemaining(current) {
  return !!current && (current.mode === 'repeat' || current.done < current.count);
}
```

Use `finiteAction(key, 1)` for resource exploration and `repeatAction(key)` for repeat gathering and production.

Replace every `cur.done < cur.count` check with `actionHasRemaining(cur)`.

Replace every `cur.count - cur.done` expression with:

```js
const remain = cur.mode === 'repeat' ? Number.MAX_SAFE_INTEGER : Math.max(0, cur.count - cur.done);
```

Resource exploration is a transactional finite action. First persist the finite exploration action before generating any random result; if that write fails, restore the previous action and show explicit feedback. Then generate the resource point once, increment `done`, clear `current`, and persist the generated point/RNG/final action state together. If the final write fails, retain the generated result as a stalled completed finite action and retry persistence without rerolling. A restart from the committed pre-explore action reproduces the same result from the saved RNG seed.

- [x] **Step 6: Route gameplay randomness through saved state**

Add `rngState` to `state`, initialized with `GameRandom.fromEntropy(Date.now(), 0x584955)`.

Add:

```js
function gameRandom() {
  const result = GameRandom.next(state.rngState);
  state.rngState = result.seed;
  return result.value;
}
```

Replace gameplay `Math.random()` calls with `gameRandom()`. This includes gathering selection, resource capacity, double drops, fishing chest, breakthrough, and appearance randomization.

The ascended realm uses `null` as the JSON-safe “unlimited lifespan” sentinel for both `shouyuan` and derived `shouMax`. `ensurePlayer`, realm application, online lifespan decay, Canvas rendering, and DOM rendering must all treat `null` as immortal and display `寿元 无尽`.

- [x] **Step 7: Replace multi-key persistence**

Replace `persist()` with:

```js
function persist(now, allowPendingOfflineCommit) {
  if (state._offlineCommitPending && !allowPendingOfflineCommit) return false;
  return SaveSystem.save(Platform, {
    created: state.created,
    appearance: { parts: state.parts },
    player: state.player,
    current: state.current,
    rngState: state.rngState,
    fishRecoverAcc: state.fishRecoverAcc,
    pendingOfflineReport: state.offlineResult
  }, now == null ? Date.now() : now);
}
```

Remove direct writes to `cloud_player`, `cloud_current`, `cloud_lastsave`, `cloud_nie`, and `cloud_created` from `game.js`. Character creation must set `state.created`, `state.player`, and appearance state before calling `persist()`.

- [x] **Step 8: Replace startup loading**

At startup call:

```js
const loaded = SaveSystem.load(Platform, Date.now());
const save = loaded.snapshot;
state.parts = normalizeParts(save.appearance && save.appearance.parts);
state.created = !!save.created;
state.player = save.player ? ensurePlayer(save.player) : null;
state.current = SaveSystem.normalizeAction(save.current);
state.rngState = GameRandom.normalizeSeed(save.rngState);
state.fishRecoverAcc = Number.isFinite(save.fishRecoverAcc) ? save.fishRecoverAcc : 0;
state.offlineResult = save.pendingOfflineReport || null;
state.showOffline = !!state.offlineResult;
state.phase = state.created && state.player ? 'game' : 'create';
state.navIndex = NAV_HOME;
```

If `loaded.source` is `legacy` or `backup`, immediately call `persist(save.savedAt)` after applying the state so the repaired snapshot becomes authoritative.

Add a merge helper:

```js
function mergeOfflineResults(base, extra) {
  if (!base) return extra || null;
  if (!extra) return base;
  const merged = Object.assign({}, base);
  for (const key of Object.keys(extra)) {
    const oldValue = Number(merged[key]) || 0;
    const newValue = Number(extra[key]) || 0;
    merged[key] = oldValue + newValue;
  }
  return merged;
}
```

Calculate elapsed time from `save.savedAt` even when a saved offline report already exists. Merge any new result into `state.offlineResult`, show the offline modal whenever the merged report is non-null, and immediately persist with the current timestamp before rendering the modal. This prevents replay after a crash without discarding time accumulated while an earlier report was still pending.

Offline settlement must be transactional. Capture `player`, `current`, `rngState`, `fishRecoverAcc`, pending-report state, and offline display state before simulation. If persistence returns `false` or throws, restore the checkpoint, show an explicit save-failure message, and block ordinary persistence so the old committed timestamp remains available for restart retry. A successful retry clears that block. Track the in-memory committed-through timestamp so invoking the same interval twice cannot duplicate rewards.

The failure state records the exact original `savedAt` / `now` interval and is exposed through `GameAPI.getPersistenceStatus()`. `GameAPI.retryPersistence()` retries that same interval without advancing RNG or duplicating rewards. A persistent DOM recovery banner remains visible even when no older offline report exists.

While any persistence issue is pending, online action ticks, lifespan/mood/fishing recovery, action replacement, appearance randomization, breakthroughs, reincarnation, character creation, and other irreversible commands are paused. Explore-result write failures retain the completed result and wait for explicit retry instead of writing every animation frame. Success confirmations are only emitted after the relevant write succeeds.

Internal bypass arguments are private implementation details. Public `GameAPI.persist` and `GameAPI.closeOffline` ignore extra arguments and cannot clear a pending transaction; only `GameAPI.retryPersistence()` may run the matching internal recovery path.

If writing a loaded backup or legacy save back to the primary snapshot fails, startup enters a visible `repair` persistence issue and does not begin offline settlement. Retrying first writes the original repaired snapshot at its original `savedAt`, then continues the same startup interval through the recorded `now`. Failure in either phase remains retryable without timestamp drift, including saves with no current action and no pending report.

Intervals below 30 seconds do not produce a report, but they advance `current.elapsed`. Persist that partial progress and the new timestamp transactionally, including when an older pending report is already visible.

`closeOffline()` must tentatively clear both `showOffline` and `offlineResult`, persist, and return `true` only on success. On failure or exception it restores the report, keeps the modal visible, reports the failure, and returns `false`.

`SaveSystem.validSnapshot` must reject a primary snapshot unless both `appearance` and `appearance.parts` are plain non-array records. Startup must additionally normalize known part categories and clamp invalid/out-of-range indices; a structurally bad primary falls back to a valid backup.

- [x] **Step 9: Verify syntax, focused tests, and complete regression**

Run:

```powershell
node --check core/random.js
node --check core/save-system.js
node --check game.js
node --check ui.js
npm test
```

Expected: all syntax checks and all tests PASS. The existing UI counts remain 21/21 or increase only because of new assertions. The existing skill assertions remain green with the old Infinity assertion replaced by JSON-safe repeat-mode assertions.

- [x] **Step 10: Commit**

```powershell
git add index.html platform.js game.js ui.js selftest_foundation.js selftest_skillnet.js selftest_ui.js
git commit -m "refactor: migrate runtime to versioned save snapshots"
```

#### Task 4 Implementation Report (2026-07-25)

- Status: complete, including all persistence review follow-ups.
- Runtime integration: `5acf939` (`refactor: migrate runtime to versioned save snapshots`).
- Transactional follow-up: `862a511`; player-visible recovery and progression lock: `dc52bec`; public API sealing and startup repair recovery: `24a5c30`.
- Recovery behavior: exact-interval offline/repair retry, global progression lock, explicit manual retry for exploration, persistent UI error banner, and success messages gated by committed writes. Recovery does not require reopening the game.
- Verification: foundation 44/44, skill/runtime 140/140, UI 47/47; full suite passes.
- Scope check: root runtime/test/documentation sources only; `release/` remains untouched.

## Stage 1A Completion Gate

- [x] `npm test` passes.
- [x] `JSON.stringify(state.current)` never writes an infinite value.
- [x] A legacy `cloud_current` value with `count: null` migrates to repeat mode.
- [x] A save write failure is observable as `false`.
- [x] Gameplay random state survives save and reload.
- [x] The current UI layout and all current actions still work.
- [x] The root source remains the only edited runtime source; `release/` has not been manually patched.
