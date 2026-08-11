# Stage 6 Full Integration, UI Clarity, Performance, Regression, and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Use `game-studio:game-playtest` for the browser QA task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate and verify every approved Stage 1B–5 system as one shippable TapTap H5 game, improve information hierarchy and numerical explanations inside the existing UI skeleton, add safe local/cloud conflict handling, and close deterministic simulation, performance, browser, release, and configuration engineering gates.

**Architecture:** Stage 6 does not add another gameplay system or simulation clock. It composes the Stage 1B–5 pure model/rules into one frozen command/query boundary, adds pure launch-content/save-envelope audits plus a platform-only cloud-sync controller, and refines the existing DOM UI without replacing its top bar, left navigation, right content area, full-screen overlays, or character Canvas. Root source remains authoritative; `release/` is a generated, hash-verified H5 directory.

**Tech Stack:** Native JavaScript, UMD browser globals plus CommonJS Node tests, existing DOM/CSS/Canvas2D runtime, Node built-ins for tests/scripts, TapTap H5 platform bridge, no new gameplay framework or engine.

## Global Constraints

- The only product authority is `docs/superpowers/specs/2026-07-24-xiuxian-idle-core-design.md`.
- This plan starts only after Stage 1B–5 implementation, review, migration, release, and completion gates pass.
- This is an integration and engineering-completion stage. Do not redesign gameplay, rebalance approved content, replace approved names/IDs, or use “is it fun?” as a gate.
- Preserve the existing `顶部状态 + 左侧可滚动页签 + 右侧独立内容区 + 全屏弹层` skeleton and current light-purple visual direction.
- Preserve native HTML/CSS/JavaScript, DOM UI, and player-character Canvas composition. Do not introduce React, Vue, Phaser, another engine, or a new bundler.
- Simulation state stays outside rendering. UI reads frozen ViewModels and sends commands; it never reads or mutates the model.
- Online, offline, hidden-tab resume, and long-time fast-forward use only `Simulation.advance`.
- Do not add a second timer, per-system offline formula, background worker state, or renderer-owned gameplay state.
- Main action uses the configured 12–48 hour cap. Farm, fish recovery, injury, named social progress, NPC world, age/lifespan, sects, descendants, reincarnation/ascension hooks, and other passive lanes use full real elapsed time according to their owning stage.
- Randomness remains injected and serialized. Runtime gameplay/content files do not call `Math.random()`.
- Breakthrough probability remains base + pills + event benefit only.
- Player-facing copy continues to avoid `双修`, `NPC响应`, `等待NPC`, `系统等待`, and equivalent mechanical wording.
- `天下` and `探索` remain UI/data/event surfaces without a large map, coordinates, pathfinding, free movement, pan/zoom, or map renderer.
- Root source is the sole authority. No implementer edits `release/` by hand or copies generated release code back into root.
- Every implementation task follows verified RED → minimal GREEN → focused regression → full regression → commit → independent reviewer.
- Every reviewer resolves all Serious and Important findings before the commander dispatches the next task.

---

## 0. Start Gate and Locked Cross-Stage Contract

### 0.1 Required start evidence

Before Task 1:

```powershell
npm test
npm run sync-release
npm test
git diff --exit-code
```

Expected: every Stage 1B–5 suite passes, release sync succeeds, the second test pass is green, and sync leaves no diff.

The current repository observed while this plan was written is still the Stage 1A runtime (`core/random.js`, `core/save-system.js`, three test suites). That is evidence only, not the Stage 6 start state. Do not implement Stage 6 against the current legacy mutable `GameAPI`.

### 0.2 Save version

The gameplay snapshot chain is:

```text
legacy cloud_* keys
  -> schema v1 Stage 1A snapshot
  -> schema v2 Stage 1B simulation/report model
  -> schema v3 Stage 2 skills/inventory/homestead
  -> schema v4 Stage 3 combat/techniques/breakthrough
  -> schema v5 Stage 4 NPC/relationship/event/sect world
  -> schema v6 Stage 5 lifespan/descendants/succession/reincarnation/ascension
```

Stage 6 does **not** bump gameplay schema beyond v6 because it adds no gameplay state. UI preferences, cloud-sync metadata, and recoverable conflict copies use independent infrastructure records:

```js
const UI_PREFS_KEY = 'xiuxian_ui_prefs_v1';
const CLOUD_SYNC_META_KEY = 'xiuxian_cloud_sync_meta_v1';
const CONFLICT_LOCAL_KEY = 'xiuxian_conflict_local_v1';
const CONFLICT_CLOUD_KEY = 'xiuxian_conflict_cloud_v1';
```

Unknown future gameplay schemas remain unreadable and must never be normalized down to v6 or overwrite a valid local save.

The v6 sentinel audit must preserve:

```text
player.lifecycle
systems.lineage.nextLifeId
systems.lineage.nextRitualId
systems.lineage.nextTransitionId
systems.lineage.family
systems.lineage.lives
systems.lineage.kinship
systems.lineage.personAliases
systems.lineage.descendants
systems.lineage.rituals
systems.lineage.mementos
systems.lineage.permanentRomanceRestrictions
systems.lineage.pendingTransition
systems.homestead.inheritanceHall
systems.lifecycle.reincarnationQueue
systems.lifecycle.blessingSchedules
systems.npcs.records[*].lifecycle.baseLifespanYears
```

Stage 5 extends the existing NPC status/biography, relationship restrictions, event evolution/DSL, and parallel-job records. Migration, audit, and UI integration must reuse those records and must not create a second NPC/world/event model.

### 0.3 Public boundaries

Preserve:

```js
window.GameAPI = Object.freeze({ queries, commands, render });
```

All existing Stage 1B–5 query and command names remain. Every gameplay command returns:

```js
{ ok: boolean, code: string, changed: boolean, message: string | null, data: object | null }
```

In particular, Stage 6 must preserve and integrate the Stage 5 lifecycle boundary:

```js
queries.inheritanceHall({ section, cursor })
queries.legacyTransition()

commands.proposeLineageRitual(payload)
commands.upgradeInheritanceHall()
commands.setInheritancePlan(payload)
commands.consumeLongevityItem({ itemId })
commands.beginLegacyTransition({ cause })
// cause: 'lifespan' | 'voluntary' | 'ascension'
commands.chooseLegacyRoute({ route, heirNpcId })
// route: 'descendant' | 'newIdentity'
commands.updateNewIdentityDraft(payload)
commands.confirmLegacyTransition()
commands.cancelLegacyTransition()
```

Existing `events`, `world`, `relationship`, and `homestead` queries retain their Stage 5 additive lifecycle fields; Stage 6 does not create parallel lineage or lifecycle queries for the same state.

Stage 6 adds:

```js
queries.settings()
queries.launchDiagnostics()

commands.setUiPreferences({ largeText, reducedMotion })
commands.loginTapTap()
commands.syncCloudNow()
commands.resolveCloudConflict({ choice })
// choice: 'keepLocal' | 'useCloud' | 'later'
commands.restoreConflictCopy({ source })
// source: 'local' | 'cloud'
```

The four platform/cloud commands return `Promise<CommandResult>` because they perform external I/O. Existing gameplay commands remain synchronous. UI must disable the initiating control while one cloud command is in flight.

### 0.4 Startup order

Use this exact order:

```text
1. Read primary local snapshot.
2. Validate; otherwise try local backup, then legacy migration, then empty save.
3. Run explicit one-step migrations through v6 in memory.
4. Persist migrated/recovered v6 transactionally before simulation.
5. If an authenticated cloud session is already available, fetch the one cloud slot.
6. Validate cloud envelope and contained snapshot without mutating local state.
7. Classify: `same` keeps local, `localOnly` keeps local and queues upload,
   `cloudOnly` commits the validated cloud snapshot, and invalid/future cloud keeps
   local with a warning.
8. Only when two nonempty valid hashes diverge, show the blocking conflict-choice
   overlay; commit the player's choice transactionally and keep recoverable copies
   of both branches.
9. Advance the selected snapshot from its saved watermark exactly once.
10. Persist the pending offline report before showing it.
11. Show offline settlement detail before normal navigation.
12. Acknowledge once, archive once to the event-summary source, then enter normal UI.
```

If cloud is unavailable, logged out, or times out, continue from local at Step 9 and show a nonblocking sync status in `设置`. Network failure never blocks local play.

If the player logs in later and a conflict is discovered, show the conflict overlay immediately. Selecting `later` keeps the local branch active and performs no upload/download; the unresolved status remains visible in `设置`.

### 0.5 Cloud-save safety contract

Use one ASCII cloud slot:

```text
archive metadata name: auto_save
archive file: auto_save.json
```

Cloud envelope:

```js
{
  envelopeVersion: 1,
  snapshotSchemaVersion: 6,
  revision: 42,
  originDeviceId: 'device-...',
  savedAt: 1720000000000,
  snapshotHash: 'fnv1a32:89abcdef',
  summary: {
    characterName: '...',
    generation: 3,
    realmName: '金丹',
    playSeconds: 123456
  },
  snapshot: { schemaVersion: 6 }
}
```

Rules:

- Hash canonical normalized snapshot JSON; the hash is corruption/divergence detection, not security.
- Never merge two divergent deterministic worlds. The player explicitly keeps local, uses cloud, or decides later.
- Before choosing local, save the validated downloaded cloud envelope under `CONFLICT_CLOUD_KEY`.
- Before choosing cloud, save the current valid local snapshot under `CONFLICT_LOCAL_KEY`.
- `useCloud` writes the cloud snapshot through the same primary/backup transaction, then performs offline settlement from the cloud watermark.
- `keepLocal` uploads only after the cloud copy is safely retained. Upload failure leaves the conflict unresolved and local gameplay intact.
- Only one cloud operation may be in flight. Coalesce newer upload requests; never update the same archive concurrently.
- Local save remains immediate. Cloud upload is queued only at approved critical checkpoints or manual sync and is throttled to at most once per 60 seconds.
- Cloud save failure never rolls back an already successful local save.
- Downloaded malformed, future-schema, over-10-MiB, or hash-mismatched data is never offered as a valid overwrite choice.
- Do not auto-delete any cloud archive.

### 0.6 UI preferences

UI preferences are device-local, not part of the deterministic world or cloud gameplay payload:

```js
{
  version: 1,
  largeText: false,
  reducedMotion: 'system' | 'reduce' | 'full'
}
```

No preference changes simulation cadence, content generation, active/background tier membership, RNG consumption, drop rate, event rate, combat outcome, or offline cap.

---

## 1. Launch Content and Navigation Completeness Matrix

The launch audit must verify these exact Stage 1B–5 quantities:

### Stage 2

```text
12 life skills
10 mining entries
10 woodcutting entries
11 herb entries
10 fishing spots
10 fish species
6 crops
4 spirit-beast species
5 formations
33 production/formation recipes
```

### Stage 3

```text
9 normal combat regions
45 enemy definitions
9 four-wave dungeons
27 equipment items
16 techniques and 16 technique books
16 realm transitions/permanent breakthrough gates
```

### Stage 4

```text
120 bootstrap permanent characters
40 active / 80 background at initial rebalance
8 abstract regions
5 fixed sects
16 bootstrap families/households
7 shared + 10 special social interactions
40 authored event templates
10 named parallel-social patterns
8 directional relationship metrics
4 romance principles
```

### Stage 5

```text
5 inheritance-hall levels
8 family bonuses
6 new-life origins
8 bloodlines
6 hidden previous-life marks
6 ascension blessings
3 longevity items
24 lifecycle event templates:
  8 lineage / ritual / birth / upbringing / adulthood
  6 memento / memory / reunion
  4 death / memorial / reincarnation
  6 ascension / blessing
```

Stage 5 cadence and retention are also exact launch contracts:

```text
1 world year = 43,200 real seconds
lineage ritual duration = 6 real hours
child adulthood = age 18 = 9 real days from birth
player lifespan safety buffer = 1 world year
ordinary generated NPC base lifespan = inclusive 56–112 world years
NPC ascension step = every 24 real hours
natural death and adulthood = exact timestamp boundaries
NPC reincarnation delay = 7–30 real days
ascension blessing interval = 7–14 real days
longLifeSeed active family bonus = floor(realm lifespan maximum × 1.05)
per-NPC detailed biography cap = 100 entries, then decade compaction
lineage life chronicle = all compact records retained
recent lineage ritual cap = 100 entries, older rituals aggregated
event summaries = 300, world evolution = 500, older entries compacted
```

Exact left navigation remains:

```js
[
  '洞府','背包','商城','事件','探索','战斗','功法','宗门','天下','关系','设置',
  '采药','采矿','伐木','钓鱼','炼丹','炼器','烹饪','符箓'
]
```

Exact cave sub-navigation remains:

```js
['灵田','阵法','灵兽','会客厅','传承殿']
```

Integration behavior:

- `事件` is implemented with three sections.
- `探索` composes existing abstract-region, investigation, encounter, special-place, and event data. It does not create a map.
- `战斗` preserves `普通区域 / 副本 / 宗门试炼 / 特殊秘境`. Stage 6 wires existing sect/event/world discoveries into these tabs; it does not invent a new combat engine.
- `商城` may expose only approved Stage 1B–5 capacity/entitlement content. Do not invent an unapproved cash shop, price table, gacha, ad reward, or IAP catalog in Stage 6.
- `设置` is implemented by this plan.
- No confirmed Stage 1B–5 surface may still render generic `筹建中`, `敬请期待`, `(该功能原型未实现)`, or `implemented:false`.
- A genuinely empty runtime collection uses a truthful state such as `当前没有待处理事件` or `尚未发现可进入的特殊秘境`; it does not pretend the system is unimplemented.

---

## 2. UI Information Hierarchy and Number Explanation Contract

Do not replace the shell. Refine information inside it.

### Top status

Order:

1. avatar, player name, current realm;
2. cultivation current/required and breakthrough availability;
3. current main action label, status, and progress/stop reason;
4. compact mood, essence, spirit stones, reputation values.

At narrow widths the four secondary values wrap/collapse inside the top bar; the realm, cultivation, and current action remain visible.

### Right content page hierarchy

Every implemented page follows:

```text
page title + one-line purpose
critical warning/pending decision/current progress
primary action/configuration
owned/unlocked content
locked/future content with exact requirement
collapsible numerical explanation
```

### Shared numerical ViewModel

Gameplay queries provide, and UI only renders:

```js
{
  label: '最终耗时',
  formatted: '7.42 秒',
  value: 7.42,
  unit: 'seconds',
  breakdown: [
    { label:'基础耗时', formatted:'8.00 秒', kind:'base' },
    { label:'采药等级', formatted:'-4%', kind:'modifier' },
    { label:'灵草熟练度', formatted:'-4%', kind:'modifier' }
  ]
}
```

Required explanations:

- action duration, output range, XP, mastery and cultivation;
- inventory used/free/capacity and binding reason;
- formation/beast/sect modifiers and affected system;
- combat derived stats, hit/crit, supply trigger, wave/reward;
- technique cost, cooldown, condition, scaling;
- breakthrough gate and only three probability sources;
- relationship directional values and charm multiplier/reduction;
- event immediate cost/result preview and named delayed duration;
- lifespan/age, lineage eligibility, inheritance slots/loss/retention;
- offline actual time, effective main time, cap, passive full-time work, stop reason.

Locked cards always show exact current/required progress. Hover-only tooltips are forbidden; explanations use inline rows, an `说明` button, or an accessible disclosure that works by touch.

Shared status codes:

```text
idle, active, waiting, ready, stalled, locked, complete, warning, error
```

UI derives color/icon from code, never by parsing Chinese text.

---

## 3. File Map

| File | Responsibility |
|---|---|
| `core/stable-json.js` | Stable JSON serialization and FNV-1a snapshot hash |
| `core/save-envelope.js` | Cloud envelope create/validate/summary |
| `core/save-compare.js` | Pure local/cloud classification and conflict choices |
| `core/value-breakdown.js` | Frozen shared number/status ViewModel helpers |
| `cloud-save.js` | Platform-facing one-slot cloud synchronization controller |
| `platform.js` | Local storage, Tap login/cloud file bridge, local mocks only |
| `game.js` | Compose Stage 1B–6 dependencies and expose frozen API |
| `ui.js` | Existing-shell hierarchy, settings/conflict/offline/nav rendering |
| `styles.css` | Additive responsive, disclosure, state, touch, reduced-motion styles |
| `content/**` | Existing Stage 1B–5 registries only; fix references, no rebalance |
| `scripts/audit-content.js` | Launch counts/reference/completeness report |
| `scripts/perf-benchmark.js` | Deterministic simulation/save-size performance budgets |
| `scripts/serve-static.js` | Node-built-in local HTTP server for browser QA |
| `scripts/sync-release.js` | One-way allowlisted root→release generation |
| `scripts/verify-release.js` | Exact release file/hash/config/size verification |
| `selftest_stage6_*.js` | Focused integration, save, cloud, UI, perf, deterministic tests |
| `.superpowers/sdd/stage-6-browser-qa.md` | Browser evidence, viewports, findings, console results |

---

## 4. Sequential TDD / QA Tasks

### Task 1: Make the full test runner and feature inventory impossible to omit

**Files:**

- Create: `test/suites.js`
- Create: `selftest_stage6_registration.js`
- Modify: `selftest_all.js`
- Modify: `package.json`

**Interfaces:**

- Produces `TEST_SUITES` as the one explicit ordered test list.
- Produces `npm run test:registration`.
- Does not dynamically execute files in filesystem order.

- [ ] **Step 1: Write RED registration tests**

`selftest_stage6_registration.js` scans root for `selftest_*.js`, excluding `selftest_all.js`, and asserts each file appears exactly once in `TEST_SUITES`. It also asserts no listed file is missing.

Add the new suite to the old runner first and run:

```powershell
npm test
```

Expected: FAIL because `test/suites.js` and registration coverage do not exist.

- [ ] **Step 2: Implement one ordered suite registry**

Order by dependency:

```text
foundation/save -> state/migration -> content -> pure domain modules
-> simulation/determinism -> API -> UI -> release
```

`selftest_all.js` imports the array and spawns each suite in a fresh Node process. It prints per-suite elapsed milliseconds and a final passed/failed count.

- [ ] **Step 3: Add scripts**

```json
{
  "scripts": {
    "test": "node selftest_all.js",
    "test:registration": "node selftest_stage6_registration.js",
    "audit:content": "node scripts/audit-content.js",
    "perf": "node scripts/perf-benchmark.js",
    "verify:release": "node scripts/verify-release.js"
  }
}
```

Preserve the established sync script name; do not create both `sync-release` and `release:sync`.

- [ ] **Step 4: Verify**

```powershell
node selftest_stage6_registration.js
npm test
```

Expected: registration and all existing suites PASS.

- [ ] **Step 5: Commit**

```powershell
git add test/suites.js selftest_stage6_registration.js selftest_all.js package.json
git commit -m "test: register the complete engineering suite"
```

**Reviewer gate:** Add an unregistered fake suite and prove the registration test fails, remove it, then verify each real suite runs in a fresh process.

---

### Task 2: Verify the complete v1→v6 migration and backup-recovery chain

**Files:**

- Create: `fixtures/saves/v1-minimal.json`
- Create: `fixtures/saves/v2-simulation.json`
- Create: `fixtures/saves/v3-skills.json`
- Create: `fixtures/saves/v4-combat.json`
- Create: `fixtures/saves/v5-world.json`
- Create: `fixtures/saves/v6-lineage.json`
- Create: `selftest_stage6_save_chain.js`
- Modify: `core/save-system.js`
- Modify: `core/state-model.js`
- Modify: `selftest_foundation.js`

**Interfaces:**

- Consumes every one-step migrator from Stage 1B–5.
- Produces `SaveSystem.inspect`, `loadValidated`, `writeMigrated`, and existing save/load behavior without changing snapshot schema 6.

- [ ] **Step 1: Write RED migration matrix**

For each fixture assert:

```text
load -> exact one-step chain -> normalized v6 -> JSON round trip
second normalize -> byte-identical
save -> reopen -> same model/RNG/watermark
```

Sentinel progress in every stage must survive: skill/mastery/inventory/homestead, combat/loadout/technique/gates, NPC/relations/events/sects, and Stage 5 lineage/lifecycle/inheritance.
The v6 fixture must include a descendant-successor `personAliases` entry, a chosen-heir relationship archive, and persisted NPC/child `baseLifespanYears`; the round trip must preserve each exactly.

Add fixtures for:

- legacy multi-key `cloud_*`;
- corrupt primary + valid backup;
- valid primary + corrupt backup;
- both corrupt + valid legacy;
- schema-only primary;
- future schema 7 primary + valid v6 backup;
- interrupted migration write;
- backup write false/throw;
- primary write false/throw;
- nested non-finite/array/wrong-reference corruption.

Run focused suite; expected FAIL on missing full-chain APIs/assertions.

- [ ] **Step 2: Implement inspection without mutation**

```js
SaveSystem.inspect(raw)
// {ok, schemaVersion, reason, summary}

SaveSystem.loadValidated(adapter, nowMs)
// {source:'primary'|'backup'|'legacy'|'empty', snapshot, migrated, warnings}
```

Inspection never advances simulation, consumes RNG, or writes.

- [ ] **Step 3: Make migration persistence transactional**

`writeMigrated`:

1. validates the original source;
2. migrates one version at a time;
3. validates v6;
4. writes/verifies backup before primary;
5. writes/verifies v6 primary;
6. returns success only after read-back validation.

On any failure, keep the last valid committed primary/backup and return `save_failed`; do not continue into offline settlement.

- [ ] **Step 4: Verify future and recovery behavior**

Future primary must not be overwritten. If a valid v6 backup exists, load backup with warning `future_primary_recovered_from_backup`; otherwise show a blocking unsupported-version error with export/diagnostic information.

- [ ] **Step 5: Run**

```powershell
node selftest_stage6_save_chain.js
node selftest_foundation.js
npm test
```

- [ ] **Step 6: Commit**

```powershell
git add fixtures/saves/v1-minimal.json fixtures/saves/v2-simulation.json fixtures/saves/v3-skills.json fixtures/saves/v4-combat.json fixtures/saves/v5-world.json fixtures/saves/v6-lineage.json core/save-system.js core/state-model.js selftest_stage6_save_chain.js selftest_foundation.js
git commit -m "test: prove complete save migration and recovery"
```

**Reviewer gate:** Mutate one sentinel from every schema fixture and inspect migration diffs. Confirm no fallback path silently starts a new game while a valid backup exists.

---

### Task 3: Build pure cloud envelopes and explicit conflict decisions

**Files:**

- Create: `core/stable-json.js`
- Create: `core/save-envelope.js`
- Create: `core/save-compare.js`
- Create: `selftest_stage6_save_envelope.js`
- Modify: `selftest_all.js`
- Modify: `index.html`

**Interfaces:**

```js
StableJson.stringify(value)
StableJson.fnv1a32(text)

SaveEnvelope.create(snapshot, metadata)
SaveEnvelope.validate(envelope)
SaveEnvelope.summary(snapshot)
SaveEnvelope.byteLength(envelope)

SaveCompare.classify(localSnapshot, cloudEnvelope, syncMeta)
// 'same'|'localOnly'|'cloudOnly'|'conflict'|'invalidCloud'|'futureCloud'

SaveCompare.resolve(classification, choice)
// pure decision object; no I/O
```

- [ ] **Step 1: Write RED canonical-hash tests**

Prove object key insertion order does not change stable JSON/hash; array order does. Same v6 snapshot always creates the same snapshot hash.

Reject cycles, non-finite values, wrong envelope version, mismatched hash/schema, missing summary, and payload over 10 MiB.

- [ ] **Step 2: Write conflict classification tests**

Cover:

```text
same hash -> same
local created/cloud absent -> localOnly
local empty/cloud valid -> cloudOnly
both valid/different hash -> conflict regardless of timestamps
cloud corrupt -> invalidCloud
cloud schema > 6 -> futureCloud
```

Timestamps/revisions are display hints only and never auto-select a branch.

- [ ] **Step 3: Implement pure modules**

No module accesses `Platform`, localStorage, DOM, time, random, network, or cloud globals. Metadata/time/device ID are injected.

- [ ] **Step 4: Verify**

```powershell
node --check core/stable-json.js
node --check core/save-envelope.js
node --check core/save-compare.js
node selftest_stage6_save_envelope.js
npm test
```

- [ ] **Step 5: Commit**

```powershell
git add core/stable-json.js core/save-envelope.js core/save-compare.js index.html selftest_stage6_save_envelope.js selftest_all.js
git commit -m "feat: compare local and cloud save envelopes safely"
```

**Reviewer gate:** Reorder nested keys, tamper with one byte, supply future schema, and confirm no timestamp heuristic bypasses player choice.

---

### Task 4: Add TapTap H5 cloud bridge and serialized sync controller

**Files:**

- Create: `cloud-save.js`
- Create: `selftest_stage6_cloud_sync.js`
- Modify: `platform.js`
- Modify: `index.html`
- Modify: `game.js`
- Modify: `selftest_all.js`

**Interfaces:**

`platform.js` exposes:

```js
Platform.account.status()
Platform.account.login()

Platform.cloud.isAvailable()
Platform.cloud.listArchives()
Platform.cloud.downloadArchive({ archiveUUID, archiveFileId })
Platform.cloud.createArchive({ name, bytes, metadata })
Platform.cloud.updateArchive({ archiveUUID, name, bytes, metadata })
```

`cloud-save.js` exposes:

```js
CloudSaveController.create({ platform, localStore, clock, envelope, compare })
controller.check()
controller.syncNow()
controller.resolveConflict(choice)
controller.restoreConflictCopy(source)
controller.status()
```

- [ ] **Step 1: Write RED adapter and mock tests**

In Node/browser VM with no `tap`, assert cloud is unavailable and local gameplay continues.

With a fake Tap adapter assert:

- one ASCII `auto_save` slot;
- create when absent, update by UUID when present;
- downloaded bytes are validated before classification;
- only one operation in flight;
- rapid save notifications coalesce;
- next upload occurs no earlier than 60 seconds;
- manual sync respects the same limit;
- network failure preserves local state and pending retry;
- same hash performs no upload;
- conflicting hash performs no upload until choice;
- raw `tap.*` exists only in `platform.js`.

- [ ] **Step 2: Wrap platform callbacks**

All raw `tap.getCloudSaveManager`, `tap.getFileSystemManager`, `tap.env.USER_DATA_PATH`, login, file read/write, and archive APIs remain inside `platform.js`.

Normal browser mock stores an in-memory archive for tests only; it must be visibly marked `mock:true` and never pretend production cloud succeeded.

- [ ] **Step 3: Implement serialized controller**

The controller owns external I/O only. It never calls `Simulation.advance` or mutates a model. It asks the game controller for a validated current snapshot and returns validated selected snapshot/result objects.

Use:

```text
no operation concurrency
60-second upload floor
last requested hash wins queue
explicit retry state
15-second network timeout
```

- [ ] **Step 4: Implement recoverable choices**

`keepLocal`, `useCloud`, and restore paths follow Section 0.5 write ordering. `later` writes only unresolved sync metadata.

- [ ] **Step 5: Verify**

```powershell
node --check platform.js
node --check cloud-save.js
node selftest_stage6_cloud_sync.js
npm test
rg -n "\btap\." --glob "*.js" .
```

Expected: production raw Tap API matches appear only in `platform.js`; test fakes may contain string fixtures only.

- [ ] **Step 6: Commit**

```powershell
git add platform.js cloud-save.js game.js index.html selftest_stage6_cloud_sync.js selftest_all.js
git commit -m "feat: add safe one-slot cloud synchronization"
```

**Reviewer gate:** Inject timeout, corrupt download, backup failure, primary failure, upload conflict, repeated click, and reopen mid-choice. Verify neither branch is silently lost.

---

### Task 5: Implement Settings, cloud status, and conflict-choice UI

**Files:**

- Create: `selftest_stage6_settings.js`
- Modify: `game.js`
- Modify: `ui.js`
- Modify: `styles.css`
- Modify: `selftest_ui.js`
- Modify: `selftest_all.js`

**Interfaces:**

- Produces the Stage 6 settings queries/commands from Section 0.3.
- Consumes cloud controller status only through the game controller.

- [ ] **Step 1: Write RED API tests**

`queries.settings()` returns frozen:

```js
{
  preferences: { largeText, reducedMotion },
  account: { available, loggedIn, displayName },
  cloud: {
    available, state, lastSuccessAt, lastErrorCode,
    localSummary, cloudSummary, conflict, retryAt
  },
  save: {
    schemaVersion: 6, bytes, source, backupAvailable,
    conflictLocalAvailable, conflictCloudAvailable
  },
  build: { version, releaseHash }
}
```

Mutation must not affect subsequent queries.

- [ ] **Step 2: Write RED UI tests**

`设置` renders:

1. display preferences;
2. TapTap account status/login;
3. local save summary;
4. cloud sync status/manual sync;
5. backup/conflict-copy recovery controls;
6. build/version diagnostics.

Conflict overlay displays side-by-side/stacked summaries:

```text
角色、世代、境界、保存时间、游玩时长、来源设备
保留本地 / 使用云端 / 稍后处理
```

No choice is preselected. Every overwrite choice has explicit consequence text.

- [ ] **Step 3: Implement local preferences**

Read/write `UI_PREFS_KEY` separately through Platform storage. Apply `.large-text` and reduced-motion classes/attributes at root. Invalid preference records fall back without touching the game save.

- [ ] **Step 4: Implement async controls**

Buttons show `登录中 / 同步中 / 正在恢复` and are disabled during in-flight work. Failures show a short message plus retained retry control. UI never parses provider error text to make decisions.

- [ ] **Step 5: Verify**

```powershell
node selftest_stage6_settings.js
node selftest_ui.js
npm test
```

- [ ] **Step 6: Commit**

```powershell
git add game.js ui.js styles.css selftest_stage6_settings.js selftest_ui.js selftest_all.js
git commit -m "feat: add settings and cloud conflict controls"
```

**Reviewer gate:** Test keyboard/touch choice, async double-click, failure retry, `later`, and both restore copies. Confirm settings never alter deterministic state or RNG.

---

### Task 6: Make offline settlement and Event archive one idempotent flow

**Files:**

- Create: `selftest_stage6_offline_events.js`
- Modify: `core/simulation-report.js`
- Modify: `game.js`
- Modify: `ui.js`
- Modify: `selftest_ui.js`
- Modify: `selftest_all.js`

**Interfaces:**

- Preserves Stage 1B pending-report inbox and `reportArchive` as the single offline-report source.
- Preserves Stage 4 `systems.events` as person/sect/world event source.

- [ ] **Step 1: Write RED startup-order tests**

Prove:

- selected local/cloud/recovered snapshot is committed before offline advance;
- same `processedThroughMs` cannot settle twice;
- report is persisted before overlay visibility;
- normal navigation is not shown ahead of a pending offline overlay;
- save failure rolls back model/RNG/watermark/report and allows retry;
- existing pending report merges deterministic new elapsed results without duplicate gains;
- intervals below the display threshold still advance/persist partial progress but do not fabricate a detail overlay.

- [ ] **Step 2: Write full detail RED tests**

Offline ViewModel includes:

```text
actual elapsed
effective main-action elapsed and cap
selected action
completed count and stop reason
items/currency gained
skill XP/mastery XP/cultivation
materials/supplies consumed
levels/unlocks
farm and named parallel completions
new pending-decision count
new world-evolution count
```

Person/world event bodies stay out of the overlay.

- [ ] **Step 3: Write event-page RED tests**

Exact sections:

```text
事件摘要
待决策事件
世界演变
```

Summary query merges `reportArchive` and Stage 4 summaries as ViewModel rows without duplicating persistence. Acknowledging one report archives exactly once; repeated submission returns `no_change`.

Pending events never expire/overwrite and retain capacity 20. World filters remain `身边动态 / 天下传闻`.

- [ ] **Step 4: Implement**

Use one command:

```js
commands.acknowledgeOffline({ reportIds })
```

It performs one transactional model update and save. UI calls no private close/persist method.

- [ ] **Step 5: Verify**

```powershell
node selftest_stage6_offline_events.js
node selftest_simulation.js
node selftest_ui.js
npm test
```

- [ ] **Step 6: Commit**

```powershell
git add core/simulation-report.js game.js ui.js selftest_stage6_offline_events.js selftest_ui.js selftest_all.js
git commit -m "fix: unify offline detail and event archival"
```

**Reviewer gate:** Reopen before/after persistence and click acknowledge three times. Compare report IDs, gains, archive count, RNG, and watermark.

---

### Task 7: Standardize numerical explanations and frozen page ViewModels

**Files:**

- Create: `core/value-breakdown.js`
- Create: `selftest_stage6_viewmodels.js`
- Modify: `core/skill-progression.js`
- Modify: `core/gathering.js`
- Modify: `core/production.js`
- Modify: `core/farm.js`
- Modify: `core/formations.js`
- Modify: `core/spirit-beasts.js`
- Modify: `core/combat-stats.js`
- Modify: `core/combat-progress.js`
- Modify: `core/techniques.js`
- Modify: `core/breakthrough.js`
- Modify: `core/relationships.js`
- Modify: `core/social.js`
- Modify: `core/sect-simulation.js`
- Modify: `core/player-lifespan.js`
- Modify: `core/npc-lifecycle.js`
- Modify: `core/kinship.js`
- Modify: `core/lineage.js`
- Modify: `core/inheritance-hall.js`
- Modify: `core/inheritance-projector.js`
- Modify: `core/legacy-transition.js`
- Modify: `core/memory-reunion.js`
- Modify: `core/reincarnation.js`
- Modify: `core/ascended-blessings.js`
- Modify: `core/stage5-rules.js`
- Modify: `game.js`
- Modify: `index.html`
- Modify: `selftest_all.js`

**Interfaces:**

```js
ValueBreakdown.number({ label, value, unit, breakdown })
ValueBreakdown.requirement({ label, current, required, met })
ValueBreakdown.status(code, detail)
ValueBreakdown.freeze(value)
```

- [ ] **Step 1: Write RED helper tests**

Assert deterministic formatting for integers, percentages, seconds/minutes/hours/days, item quantities, XP, relationship values, age/lifespan, and infinity/null sentinel.

Unknown unit/status rejects in development tests; it does not silently produce misleading copy.

- [ ] **Step 2: Write page contract tests**

For each navigation/subtab query, assert:

- one page title/purpose;
- primary status;
- every action has duration/reward/cost/cultivation;
- every locked item has current/required;
- every derived probability/stat has source breakdown;
- no UI-facing raw decimal is missing a unit;
- no formula is recomputed in `ui.js`;
- nested values are frozen.

- [ ] **Step 3: Implement shared helpers and adapt queries**

Keep formulas in owning Stage 2–5 domain modules. Query adapters pass exact calculated sources into `ValueBreakdown`; the helper formats only.

- [ ] **Step 4: Add forbidden derivation scan**

```powershell
rg -n "Math\.(round|floor|min|max)|xpNeed|breakthrough|hitChance|effectiveDuration" ui.js
```

Expected: UI may use layout percentages supplied by ViewModels but contains no gameplay formula/cost/probability derivation.

- [ ] **Step 5: Verify and commit**

```powershell
node selftest_stage6_viewmodels.js
node selftest_stage2_api.js
node selftest_stage3_api.js
node selftest_stage4_api.js
node selftest_stage5_api.js
npm test
git add core/value-breakdown.js core/skill-progression.js core/gathering.js core/production.js core/farm.js core/formations.js core/spirit-beasts.js core/combat-stats.js core/combat-progress.js core/techniques.js core/breakthrough.js core/relationships.js core/social.js core/sect-simulation.js core/player-lifespan.js core/npc-lifecycle.js core/kinship.js core/lineage.js core/inheritance-hall.js core/inheritance-projector.js core/legacy-transition.js core/memory-reunion.js core/reincarnation.js core/ascended-blessings.js core/stage5-rules.js game.js index.html selftest_stage6_viewmodels.js selftest_all.js
git commit -m "refactor: expose readable numerical breakdowns"
```

**Reviewer gate:** Recalculate one representative value from every system and compare displayed total/sources to the domain result. Reject UI-derived gameplay math.

---

### Task 8: Refine all navigation pages inside the unchanged shell

**Files:**

- Create: `selftest_stage6_navigation.js`
- Modify: `ui.js`
- Modify: `styles.css`
- Modify: `selftest_ui.js`
- Modify: `selftest_all.js`

**Interfaces:**

- Consumes only `GameAPI.queries`, `GameAPI.commands`, and `GameAPI.render`.
- Preserves one `.topbar`, one `.nav`, one `.content`, one modal root, and one toast/live-status root.

- [ ] **Step 1: Write exact shell/navigation RED tests**

Assert the exact 19-item navigation and five cave tabs. For every route:

- page title and purpose;
- no generic placeholder copy;
- exactly one right-content scroll owner;
- current action persists through page changes;
- critical status appears before catalog/list;
- locked state has requirement;
- primary action has a visible label and disabled reason.

- [ ] **Step 2: Refine top status**

Implement Section 2 top order. Current action status is a compact chip/row linked to its owning page; no second action slot or queue is introduced.

- [ ] **Step 3: Refine life-skill/inventory/cave pages**

Use consistent page header, active status, action cards, cost/output/XP/mastery explanations, inventory binding reason, farm/formation/beast/meeting-hall/inheritance details.

- [ ] **Step 4: Refine combat/technique/breakthrough pages**

Keep automatic combat. Show configuration before catalog, active battle before history, and the exact three breakthrough probability sources.

- [ ] **Step 5: Refine event/explore/sect/world/relationship/lineage pages**

- Event page keeps three sections.
- Explore surfaces existing travel/encounter/investigation/special-place events as cards/lists only.
- Sect/world use existing Stage 4 states.
- Relationship shows charm and both directions.
- Descendant/lineage/inheritance/previous-life pages use Stage 5 queries.
- No map or manual NPC-life controls.

- [ ] **Step 6: Refine store/settings empty and entitlement states**

Store shows only approved existing capacity/entitlement data. If no approved purchase catalog exists, use a factual entitlement/expansion-source page without an invented purchase button or `筹建中`.

- [ ] **Step 7: Add accessible disclosure and feedback**

Every numerical `说明` uses a button with `aria-expanded`; modal close has an accessible name; pending/error messages use a live status region. Do not depend on hover.

- [ ] **Step 8: Verify**

```powershell
node --check ui.js
node selftest_stage6_navigation.js
node selftest_ui.js
npm test
```

- [ ] **Step 9: Commit**

```powershell
git add ui.js styles.css selftest_stage6_navigation.js selftest_ui.js selftest_all.js
git commit -m "refactor: clarify the complete game interface"
```

**Reviewer gate:** Traverse all 19 routes and five cave tabs with seeded early/mid/late saves. Compare DOM skeleton before/after; no layout replacement or fake system is accepted.

---

### Task 9: Make every navigation, modal, and control responsive and touch-safe

**Files:**

- Create: `selftest_stage6_responsive.js`
- Modify: `platform.js`
- Modify: `ui.js`
- Modify: `styles.css`
- Modify: `index.html`
- Modify: `selftest_all.js`

**Interfaces:**

- UI uses DOM click/pointer semantics; Canvas input remains in `Platform`.
- No input path mutates simulation directly.

- [ ] **Step 1: Write RED static/layout contract tests**

Assert:

```text
viewport-fit=cover
interactive-widget=resizes-content
touch-action is explicit
safe-area insets applied at top and bottom
left nav and right content scroll independently
body never scrolls horizontally
buttons/selects/disclosures are >=44 CSS px in both dimensions
focus-visible style exists
prefers-reduced-motion is respected
```

- [ ] **Step 2: Normalize Canvas pointer lifecycle**

Support pointer/touch start, move, end, and cancel; prevent duplicate mouse-after-touch dispatch. Coordinate conversion uses current DPR/scale exactly once.

Visibility/focus changes affect rendering/input plumbing only; elapsed simulation still advances from the saved/runtime watermark.

- [ ] **Step 3: Add responsive breakpoints**

Required viewports:

```text
320×568
360×800
390×844
420×820
768×1024
1280×720
812×375 landscape sanity
```

At narrow portrait:

- nav remains 88–104 CSS px and scrollable;
- right content uses one column where two columns would fall below readable width;
- top secondary values wrap without hiding realm/action;
- modals fit safe area and scroll internally;
- conflict comparison stacks local over cloud.

Landscape is a supported sanity state, not a redesigned layout: no clipped modal/control and a visible recommendation to return to portrait is allowed.

- [ ] **Step 4: Add touch behavior tests**

Test:

- vertical nav swipe does not activate the passed item;
- content swipe does not move nav;
- tap activates once;
- held/rapid tap does not submit cloud/event/offline action twice;
- modal blocks controls beneath it;
- focus returns to the invoking control after modal close.

- [ ] **Step 5: Verify**

```powershell
node selftest_stage6_responsive.js
node selftest_ui.js
npm test
```

- [ ] **Step 6: Commit**

```powershell
git add platform.js ui.js styles.css index.html selftest_stage6_responsive.js selftest_ui.js selftest_all.js
git commit -m "fix: harden responsive touch interactions"
```

**Reviewer gate:** Run actual pointer and touch emulation at every viewport. DOM assertions alone are insufficient.

---

### Task 10: Enforce active/background simulation and performance budgets

**Files:**

- Create: `scripts/perf-benchmark.js`
- Create: `selftest_stage6_performance.js`
- Modify: `core/simulation.js`
- Modify: `core/npc-roster.js`
- Modify: `core/npc-simulation.js`
- Modify: `core/event-engine.js`
- Modify: `core/sect-simulation.js`
- Modify: `core/stage4-rules.js`
- Modify: `core/npc-lifecycle.js`
- Modify: `core/reincarnation.js`
- Modify: `core/ascended-blessings.js`
- Modify: `core/stage5-rules.js`
- Modify: `selftest_all.js`

The listed world/lifecycle modules are the complete allowed optimization set. Edit only a file implicated by a failing operation-count assertion or recorded profile; omit untouched files from the commit.

**Interfaces:**

`Simulation.advance` accepts optional nonpersistent instrumentation:

```js
{
  onBoundary(kind),
  onNpc(mode, npcId),
  onEvent(templateId),
  onSect(sectId),
  onLifecycle(kind, personId)
}
```

Omitted instrumentation has zero semantic effect.

- [ ] **Step 1: Write RED operation-count tests**

Assert:

- active target remains 30–50, default 40;
- active step touches at most 50 people × 8 candidates;
- background step touches each scheduled person × at most 3 candidates;
- no full NPC relationship matrix allocation;
- background connection moves a person active without deletion;
- pending capacity does not stop background evolution;
- Dead, reincarnated, ascended, and `playerIdentity` records follow the exact Section 1 cadence and are not processed as detailed living-active people.

- [ ] **Step 2: Write deterministic performance fixtures**

```text
Launch world: 120 NPC / 40 active / 30 real days
Lifecycle stress world: 1000 NPC / 50 active / 100 descendants /
                        20 player-life chronicles / 1 real year
Sparse graph: 1000 NPC / 5000 directional edges
Full history: 20 pending / 300 summaries / 500 evolution /
              100 detailed biography rows per person /
              all compact player-life chronicles /
              100 recent ritual rows plus older aggregate counts
```

Budgets on the repository Node environment:

```text
launch 30-day advance <= 2.0 s
lifecycle stress one-year advance <= 5.0 s
launch v6 snapshot <= 5 MiB
stress cloud envelope < 10 MiB
no detailed history exceeds its owning cap/compaction contract
```

Operation-count assertions are authoritative; wall-clock limits are smoke guards and must print hardware/runtime metadata on failure.

- [ ] **Step 3: Implement instrumentation and optimize root causes**

Allowed fixes: stable cursors, bounded candidates, batching, compaction, avoiding repeated deep clones inside one boundary, cached immutable content lookup.

Forbidden fixes: skip elapsed time, reduce event/NPC outcomes, change RNG order, lower content counts, vary simulation detail based on UI preference, or weaken state equality.

- [ ] **Step 4: Add browser UI budgets to QA contract**

External browser measurements:

```text
local boot to first required overlay <= 2.5 s
30-day offline settlement <= 3.0 s
navigation switch p95 <= 100 ms under mobile emulation
tap to visible state p95 <= 100 ms
no navigation long task > 200 ms
```

- [ ] **Step 5: Verify**

```powershell
node selftest_stage6_performance.js
npm run perf
npm test
```

- [ ] **Step 6: Commit**

```powershell
git add scripts/perf-benchmark.js selftest_stage6_performance.js selftest_all.js core/simulation.js core/npc-roster.js core/npc-simulation.js core/event-engine.js core/sect-simulation.js core/stage4-rules.js core/npc-lifecycle.js core/reincarnation.js core/ascended-blessings.js core/stage5-rules.js
git commit -m "perf: enforce final world simulation budgets"
```

**Reviewer gate:** Inspect counters and profiler output. Reject a faster result caused by omitted events, RNG draws, histories, or lifecycle transitions.

---

### Task 11: Prove long-offline determinism, boundary recovery, and idempotency

**Files:**

- Create: `selftest_stage6_long_offline.js`
- Create: `selftest_stage6_idempotency.js`
- Modify: `selftest_all.js`
- Modify: `core/save-system.js`
- Modify: `core/simulation.js`
- Modify: `core/simulation-report.js`
- Modify: `core/stage2-rules.js`
- Modify: `core/stage3-rules.js`
- Modify: `core/stage4-rules.js`
- Modify: `core/stage5-rules.js`
- Modify: `core/farm.js`
- Modify: `core/combat-progress.js`
- Modify: `core/social.js`
- Modify: `core/event-engine.js`
- Modify: `core/player-lifespan.js`
- Modify: `core/npc-lifecycle.js`
- Modify: `core/lineage.js`
- Modify: `core/legacy-transition.js`
- Modify: `game.js`

The runtime paths above are the bounded defect-fix set for this task. Write the failing matrix assertion first and edit only the module proven responsible; omit untouched files from the commit.

**Interfaces:**

- Uses normalized state/hash comparison, not selected-field comparison.
- Aggregates report totals while preserving ID uniqueness.

- [ ] **Step 1: Add elapsed-time matrix**

Test:

```text
0s, 1s, 29s, 30s, 59s, 60s, 3599s
12h, 24h, 48h
7d, 28d, 56d, 180d
```

For every relevant duration compare:

```text
one offline batch
fixed smallest-boundary chunks
irregular chunks
save/reopen at selected boundaries
online chunks where feasible
```

Compare complete normalized v6 state, RNG, processed watermark, active/background partition, pending jobs/events, sect states, histories, lineage/lifecycle records, and aggregated reports.

- [ ] **Step 2: Cover every lane/action stop**

Fixtures:

```text
resource depleted
materials exhausted
fish empty/recovery same boundary
farm maturity
combat supply exhausted
combat defeat/injury recovery
dungeon wave/boss phase/pending loot
social main action
named parallel follow-up with pending=20
NPC active/background rebalance
sect/day/event boundaries
lifespan buffer and Stage 5 death/succession/reincarnation/ascension boundaries
descendant succession with heir edges/bonds/jobs/pending events
```

Main action stops once and remaining offline time never auto-selects another.
After descendant succession, `personAliases['life:' + newLifeId]` canonically points to the chosen heir NPC, and that NPC's former edges, bonds, jobs, and pending-event participation are archived/reconciled before `playerIdentity`; no duplicate biological person or stale social action remains.

- [ ] **Step 3: Idempotency matrix**

Submit three times:

```text
acknowledge offline report
claim pending combat loot
choose event option
harvest same plot
resolve ready social follow-up
attempt same inheritance/transition command ID
resolve cloud conflict
restore conflict copy
manual cloud sync with same hash
```

Only the first valid transaction may change state/reward/archive. Later calls return `no_change`, `already_resolved`, or owning stable code.

- [ ] **Step 4: Power-loss matrix**

Fail/throw storage:

```text
before backup
after backup before primary
after primary before report visibility
after conflict copy before branch overwrite
after local save before cloud upload
```

Reopen must recover one valid branch and never duplicate progression.

- [ ] **Step 5: Verify**

```powershell
node selftest_stage6_long_offline.js
node selftest_stage6_idempotency.js
npm test
```

- [ ] **Step 6: Commit**

```powershell
git add selftest_stage6_long_offline.js selftest_stage6_idempotency.js selftest_all.js core/save-system.js core/simulation.js core/simulation-report.js core/stage2-rules.js core/stage3-rules.js core/stage4-rules.js core/stage5-rules.js core/farm.js core/combat-progress.js core/social.js core/event-engine.js core/player-lifespan.js core/npc-lifecycle.js core/lineage.js core/legacy-transition.js game.js
git commit -m "test: prove long-term deterministic progression"
```

**Reviewer gate:** Select at least five random seeds and three critical simultaneous boundaries. Reproduce hashes in fresh Node processes.

---

### Task 12: Run real-browser smoke and visual QA with evidence

**Files:**

- Create: `scripts/serve-static.js`
- Create: `selftest_stage6_static_server.js`
- Create: `.superpowers/sdd/stage-6-browser-qa.md`
- Create: `.superpowers/sdd/evidence/stage-6/.gitkeep`
- Modify: `selftest_all.js`

This task does not edit runtime files. Every browser finding pauses the task and creates a separate focused defect task with an exact reproduction test and exact file list; after review, rerun this task from Step 2.

**Interfaces:**

- `node scripts/serve-static.js --root . --port 4173`
- Serves files only from the resolved root, refuses path traversal, and sets JS/CSS/image MIME types.

- [ ] **Step 1: Implement and test the local server**

Use Node built-ins only. Add a small server self-test for index, JS, CSS, image, 404, and traversal rejection.

- [ ] **Step 2: Boot root source in a real browser**

Use `game-studio:game-playtest` and browser automation. Confirm first actionable screen and zero uncaught console/page errors.

- [ ] **Step 3: Execute seeded journey**

At minimum:

```text
create female character
start/switch/stop life-skill main action
farm passive progress while another action runs
inventory filter/sale/binding
combat, dungeon, automatic skill, supply, injury, pending loot
technique/loadout/breakthrough explanation
sect choice and trial surface
relationship interaction and named parallel progress
event decision/follow-up/world filter
descendant/inheritance/succession/reincarnation/ascension Stage 5 surfaces
settings, login-unavailable local fallback, cloud mock conflict choices
close/reopen and offline detail -> event archive
```

- [ ] **Step 4: Execute viewport/touch matrix**

Use every viewport in Task 9. Capture screenshots of:

- creation;
- normal shell;
- densest inventory/combat/relationship page;
- offline detail;
- event three-section page;
- conflict overlay;
- inheritance/lineage page;
- 320-wide and landscape sanity.

Test mouse, emulated touch, keyboard focus, nav/content scroll, modal blocking, resize, and reduced motion.

- [ ] **Step 5: Measure budgets**

Record boot, offline settlement, nav p95, input response, and long-task observations in the QA document.

- [ ] **Step 6: Dispatch and retest findings by severity**

Report each issue:

```text
severity
what the player sees
exact reproduction
evidence path
owner: simulation / save / platform / frontend / content
fix commit and retest result
```

Serious/Important findings block Task 13. Minor findings are either fixed or explicitly recorded with no correctness/data-loss/accessibility impact.
Each fix is a separate focused task as specified above; this QA implementer records evidence and reruns the affected journey but does not patch runtime files directly.

- [ ] **Step 7: Run root regression**

```powershell
npm test
node selftest_stage6_static_server.js
```

- [ ] **Step 8: Commit**

```powershell
git add scripts/serve-static.js selftest_stage6_static_server.js selftest_all.js .superpowers/sdd/stage-6-browser-qa.md .superpowers/sdd/evidence/stage-6
git commit -m "test: record final browser game QA"
```

**Reviewer gate:** Reviewer repeats at least 360×800 and 420×820 from a fresh browser profile and checks screenshots rather than trusting DOM-only assertions.

---

### Task 13: Generate and verify the TapTap H5 release directory

**Files:**

- Create: `scripts/verify-release.js`
- Create: `selftest_stage6_taptap_config.js`
- Modify: `scripts/sync-release.js`
- Modify: `selftest_release_sync.js`
- Modify: `package.json`
- Modify: `game.json`
- Modify: `project.config.json`
- Modify: `index.html`
- Generate: `release/**` from allowlisted root source
- Modify: `selftest_all.js`

**Interfaces:**

- Root is H5 source; `release/index.html` is the upload/runtime entry.
- `game.json` and `project.config.json` remain valid portrait development metadata. Their presence must not convert runtime to sandbox `GameGlobal`/`tap.onTouchStart`.

- [ ] **Step 1: Write RED TapTap/H5 config tests**

Assert:

```text
index.html exists and is first entry
viewport-fit=cover and portrait-friendly viewport
one #game canvas and one #ui DOM overlay
styles and scripts resolve in deterministic dependency order
game.json deviceOrientation === 'portrait'
project.config.json setting.es6 === true
project description matches this game, not the old click-square sample
no GameGlobal/tap.createCanvas/tap.onTouchStart sandbox runtime
raw tap.* only in platform.js bridge
local browser works when tap is absent
```

- [ ] **Step 2: Replace release copying with exact generation**

One explicit allowlist includes:

```text
index.html, styles.css, platform.js, cloud-save.js, game.js, ui.js,
nie-manifest.js, game.json, project.config.json,
all runtime core/**, content/**, and NIE/**
```

Sync:

1. validates source paths stay inside root;
2. copies allowlisted runtime files;
3. removes stale generated runtime files from release using exact validated paths;
4. preserves no hand-edited release source;
5. writes `release/release-manifest.json` with sorted relative paths, byte sizes, and SHA-256;
6. never includes tests, docs, `.git`, `.superpowers`, scripts, fixtures, source reviews, or secrets.

- [ ] **Step 3: Verify release**

`verify-release.js` asserts:

- manifest matches every file;
- source/release runtime hashes match;
- no missing/stale/unlisted file;
- all HTML script/style/asset references resolve;
- release contains no absolute local paths;
- total release is <= 20 MiB conservative package budget;
- a production cloud envelope remains <10 MiB;
- config JSON parses and portrait/H5 requirements pass.

- [ ] **Step 4: Run release browser smoke**

Serve `release/`, repeat core journey:

```text
boot
load/migrate fixture
offline overlay and archive
one main action
event/relationship/world
settings/cloud-unavailable fallback
close/reopen
```

Capture one release screenshot and zero-console-error record.

- [ ] **Step 5: Verify idempotent generation**

```powershell
npm run sync-release
npm run verify:release
npm test
npm run sync-release
git diff --exit-code
```

Second sync must not change any byte.

- [ ] **Step 6: Record Maker boundary**

Run read-only Maker status. If `.maker-mcp/config.json` is absent, record `not_bound` in QA and do not initialize, bind, submit, push, or build. This project is the approved H5 line; remote Maker/app selection and upload are external release actions requiring explicit user authority.

- [ ] **Step 7: Commit**

```powershell
git add scripts/sync-release.js scripts/verify-release.js selftest_release_sync.js selftest_stage6_taptap_config.js selftest_all.js package.json game.json project.config.json index.html release
git commit -m "build: generate the verified TapTap H5 release"
```

**Reviewer gate:** From clean checkout, generate twice, inspect manifest/config, serve release, and confirm no source/release drift or sandbox-runtime conversion.

---

### Task 14: Final full regression, requirements audit, and independent release review

**Files:**

- Create: `scripts/audit-content.js`
- Create: `selftest_stage6_content_integrity.js`
- Create: `.superpowers/sdd/stage-6-final-report.md`
- Modify: `selftest_all.js`

This task does not edit runtime files. Step 7 dispatches each independently reproduced defect as a separate focused implementer/reviewer task with exact paths, then returns here for a complete fresh rerun.

**Interfaces:**

- Produces machine-readable and human-readable launch count/reference audit.
- Produces no gameplay state changes.

- [ ] **Step 1: Write RED launch-content integrity suite**

Assert every exact quantity, cadence, and retention bound in Section 1. Validate:

```text
unique IDs and display names
every action -> skill/content
every recipe -> existing input/output item
every drop/reward -> existing item
every dungeon wave -> enemy
every technique book -> technique
every breakthrough gate -> valid target
every sect preference/trial -> valid skill/technique/content
every NPC region/sect/family -> registry
every event requirement/effect/follow-up -> valid DSL/reference
every relationship key -> exact eight metrics
every descendant/inheritance/lifecycle reference -> valid Stage 5 registry
every inheritance-hall row -> exact limits, retention rates, upgrade realm/currency/material costs
every player/NPC realm -> exact lifespan table/multiplier
every descendant-successor life alias -> one canonical saved person, no chain/cycle/duplicate kinship node
every generated NPC/child -> persisted base lifespan in inclusive 56–112 range
longLifeSeed -> floor(realm maximum × 1.05), never a breakthrough source
every lifecycle template -> exact 8/6/4/6 category partition
every NPC status/life stage -> allowed v6 value and valid tier membership
every nav/subtab -> implemented query and renderer
no confirmed feature generic placeholder
no forbidden player-facing wording
```

- [ ] **Step 2: Implement audit script**

`npm run audit:content` prints exact counts and exits nonzero on any dangling/duplicate/invalid reference. It imports the same registries as runtime; it does not maintain a second copied catalog.

- [ ] **Step 3: Run complete engineering commands fresh**

```powershell
npm run test:registration
npm run audit:content
npm run perf
npm run sync-release
npm run verify:release
npm test
```

Then syntax-check every runtime JS file and run architecture scans:

```powershell
Get-ChildItem core,content -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
node --check platform.js
node --check cloud-save.js
node --check game.js
node --check ui.js
rg -n "Math\.random|localStorage|Platform\.|SaveSystem|document\.|canvas|toast\(" core content
rg -n "GameAPI\.(state|data|persist)|\ba\.(state|data|persist)\b" ui.js
rg -n "双修|NPC响应|等待NPC|系统等待|大地图|筹建中|敬请期待|该功能原型未实现" index.html game.js ui.js styles.css core content
rg -n "GameGlobal|tap\.createCanvas|tap\.onTouch(Start|Move|End)" .
```

Expected: syntax passes; pure modules/UI/player copy/sandbox scans have no forbidden production matches.

- [ ] **Step 4: Repeat browser and release evidence**

Use a fresh browser profile against `release/`. Repeat the minimum release journey, all critical overlays, 360×800 and 420×820, console inspection, touch, and close/reopen.

- [ ] **Step 5: Write final report**

The report contains:

```text
commit range
schema/migration results
all test suite counts
launch content counts
determinism hashes/matrix
idempotency/power-loss results
performance measurements
browser viewport/evidence links
release manifest hash/bytes
TapTap H5 config result
Maker binding status (informational only)
all reviewer findings and resolutions
```

Do not write “complete” for any row lacking fresh evidence.

- [ ] **Step 6: Independent final review**

Use `superpowers:requesting-code-review`. Reviewer reads canonical spec and Stage 1B–6 plans, inspects the full implementation range, reruns all Step 3 commands, repeats browser smoke, and checks the report against raw output.

- [ ] **Step 7: Dispatch focused fixes and re-review**

Every Serious/Important finding gets a separate implementer task with an exact reproduction test and exact file list, then a full regression and reviewer recheck before this final audit resumes. Minor issues that affect data safety, deterministic results, touch access, or release correctness are elevated to Important.

- [ ] **Step 8: Final commit**

```powershell
git add scripts/audit-content.js selftest_stage6_content_integrity.js selftest_all.js .superpowers/sdd/stage-6-final-report.md
git commit -m "test: complete final engineering acceptance"
```

**Reviewer gate:** No unresolved Serious or Important finding; all completion claims cite current command output/evidence.

---

## 5. Required Test Matrix

| Matrix | Required coverage |
|---|---|
| Save source | primary, backup, legacy multi-key, empty, cloud, conflict local/cloud |
| Schema | v1, v2, v3, v4, v5, v6, corrupt, unknown future |
| Write failure | false/throw before backup, backup, primary, report, conflict copy, cloud |
| Elapsed | 0s through 180d values from Task 11 |
| Chunking | one batch, exact boundary, irregular, save/reopen, feasible online chunks |
| Main actions | gather, fish, production, formation, beast, combat region/dungeon, social |
| Passive | fish, farm, injury, social jobs, world, sect, age/lifespan, Stage 5 lifecycle |
| Event pressure | empty, normal daily 5–10, pending 19/20, ready follow-up at capacity |
| World size | 120/40 active launch; 1000/50 active + 100 descendants + 20 lives stress |
| Idempotency | reports, loot, events, harvest, lifecycle, conflict, cloud |
| UI data | early, mid, late, dense history, locked, stalled, error, empty |
| Viewport | 320×568 through 1280×720 and landscape sanity |
| Input | mouse, touch, scroll, rapid tap, keyboard focus, resize/visibility |
| Runtime | root and generated release, local browser without Tap, mocked Tap cloud |

---

## 6. Final Engineering Completion Definition

Stage 6 is complete only when:

- Stage 1B–5 completion gates remain green after integration.
- Every existing test file is registered exactly once and runs in a fresh process.
- Launch content exact counts and all cross-registry references pass.
- Every confirmed navigation/subtab has implemented data, query, renderer, status, and empty/error state.
- The top/left/right/modal skeleton and character Canvas remain; no map/framework/engine replacement exists.
- All required numeric values have units, source breakdowns, requirements, and touch-accessible explanations.
- Cloud divergence always asks the player; no branch is silently merged or overwritten.
- Conflict choices are recoverable and local save remains playable on every network failure.
- Gameplay snapshot stays schema v6; v1→v6, backup recovery, legacy migration, JSON round-trip, and future-version rejection pass.
- Offline settlement is persisted before display, shown before normal navigation, acknowledged/archived exactly once, and readable in `事件摘要`.
- Event page has `事件摘要 / 待决策事件 / 世界演变`; pending capacity/non-expiration and world continuation remain correct.
- Online/offline/chunk/reopen results match for full normalized state and RNG through the long-time matrix.
- All immediate/retry commands in the idempotency matrix award/change at most once.
- The 120/40 launch world and 1000/50/100-descendant/20-life one-year stress world meet operation, time, history, and save-size budgets.
- Every navigation, modal, disclosure, conflict choice, and primary action works by touch at required viewports without horizontal body overflow.
- Root and release real-browser smoke have no uncaught errors and evidence exists.
- `release/` is generated only from root, manifest/hash/config/size verified, and second sync has no diff.
- TapTap H5 entry/config/portrait/platform bridge passes; absence of Maker binding is reported honestly and no remote action was inferred.
- Independent final review has no unresolved Serious or Important issue.
- No decision depends on subjective playability/fun approval.

---

## 7. Commander Dispatch Order

Use a fresh implementer and fresh reviewer for each task:

```text
1  test registration
2  migration/recovery
3  save envelopes/conflict rules
4  platform cloud controller
5  settings/conflict UI
6  offline/event flow
7  numeric ViewModels
8  full navigation hierarchy
9  responsive/touch
10 performance
11 long offline/idempotency
12 real-browser QA
13 release/TapTap config
14 final audit/review
```

Tasks are sequential. Tasks 2–6 share persistence/startup transactions; Tasks 7–9 share UI contracts; Tasks 10–11 share simulation boundaries; Tasks 12–14 consume the frozen result. Parallel drafting is allowed only for browser evidence notes or read-only audit analysis; one implementer owns each runtime change set.

---

## 8. Primary Risks and Controls

| Risk | Required control |
|---|---|
| Stage 6 accidentally changes gameplay | No new gameplay schema/table; content audit and canonical diff review |
| A stage suite is silently omitted | Filesystem-to-explicit-runner registration test |
| Migration loses deep progress | Per-version sentinel fixtures and complete-state round-trip |
| Corrupt/future cloud overwrites local | Pure validation/classification; future rejection; recoverable copies |
| Timestamp auto-selects wrong branch | Different hashes always require player choice |
| Cloud retries duplicate/concur | One in-flight, 60-second floor, hash coalescing, idempotency tests |
| Offline rewards replay | Processed watermark + persisted pending report + three-submit tests |
| Event report is stored twice | `reportArchive` single source; query-time merge only |
| UI recomputes gameplay values | Shared breakdown ViewModels and source scan |
| Dense UI becomes unusable on touch | 44px targets, disclosure not hover, real viewport/touch QA |
| Active/background simulation becomes O(N²) | Bounded candidates, sparse edges, operation counters |
| Performance fix changes outcomes | Complete state/RNG equality before/after optimization |
| Release drifts/stales | Exact allowlist, stale removal, SHA-256 manifest, second-sync no diff |
| H5 is accidentally converted to sandbox runtime | DOM/Canvas entry tests and banned `GameGlobal/tap.onTouch*` scan |
| Maker workflow causes unauthorized remote action | Status only; no init/bind/build/upload without explicit app choice/authority |
| QA declares completion from mocks only | Root and release real-browser evidence plus final independent replay |

---

## 9. Plan Self-Review

- Scope: integration, clarity, cloud conflict, performance, regression, browser, release, and TapTap configuration only; no new gameplay loop or playability gate.
- Architecture: simulation, storage, cloud I/O, ViewModels, DOM UI, Canvas, and generated release remain separated.
- Save consistency: v6 remains gameplay format; preferences/sync/conflict records are separately versioned.
- Startup consistency: cloud branch selection precedes offline settlement; offline report precedes normal UI.
- UI consistency: exact navigation/shell preserved, numerical explanations come from queries, all touch paths have explicit QA.
- Determinism: long-duration matrix compares complete state/RNG and power-loss/idempotency boundaries.
- Performance: active/background limits, save-size/cloud limit, operation counters, Node timing, and browser responsiveness each have evidence.
- Release: root authority, generated manifest, exact hashes, conservative package budget, H5 config, and release browser smoke are all mandatory.
- External boundary: local engineering can complete while Maker remains unbound; no remote project is guessed or created.
