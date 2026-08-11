# Stage 1B Unified Simulation and State Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有顶部状态栏、左侧页签、右侧内容区和角色 Canvas 合成方案的前提下，把在线与离线推进收敛为同一个纯逻辑 `Simulation.advance`，建立私有游戏状态、稳定的命令/查询接口、可解释的行动停止原因和幂等离线报告。

**Architecture:** `game.js` 继续作为浏览器启动与兼容控制器，但不再拥有第二套在线/离线规则。可持久化模型通过 `StateModel` 进出快照；`Simulation.advance` 只接收普通对象、显式规则和时间，不访问 DOM、Canvas、提示或存档，并返回新状态和结构化报告。`ui.js` 只读取冻结的 ViewModel、发送命令；灵田、并行进度和世界演变以空数据容器与 lane 接口接入，本阶段不填充完整 NPC、技能或种植内容。

**Tech Stack:** 原生 JavaScript、UMD 浏览器全局、CommonJS Node 自测、现有 HTML/CSS/DOM/Canvas、无新增依赖或打包器。

## Global Constraints

- 已审计前置基线：Stage 1A HEAD `279525b`；`core/random.js`、`core/save-system.js` 已由 `index.html` 和测试沙箱加载，运行时已使用 `cloud_save_v1`、JSON-safe repeat action、持久化 RNG、可重试持久化故障锁和 JSON-safe `null` 无限寿元。
- 唯一玩法规格是 `docs/superpowers/specs/2026-07-24-xiuxian-idle-core-design.md`。
- 保留现有“顶部状态 + 左侧页签 + 右侧内容区 + 全屏弹层”结构、CSS 类名和操作方向。
- 不引入框架、引擎、构建器、第三方依赖或大地图。
- 根目录是唯一源码；`release/` 只能由同步脚本生成，不能手改。
- 玩家始终只有一个主要挂机行动；灵田、并行社交进度和 NPC 世界属于并行 lane。
- 在线和离线只能调用同一个 `Simulation.advance`，不得保留 `tickCurrent` 与 `offlineSettle` 两套结算实现。
- 模拟不得访问 `window`、`document`、DOM、Canvas、`Platform`、toast 或存档。
- `Simulation.advance` 不修改传入模型；同一模型、时长和 RNG 状态必须产生同一结果。
- UI 不得获得内部可变 `state`、规则表或 Canvas 缓存；查询返回深拷贝并冻结的 ViewModel。
- Stage 1A 的持久化安全线不得回退：写入失败后阻止所有进度变化，常驻错误条持续可见，只有专用重试命令可提交被保留的结果；普通保存、自动保存和页面生命周期保存都不能绕过故障锁。
- 离线主行动初始上限仍为 12 小时；灵田、并行进度、世界、年龄和寿元按完整现实时间推进。
- 行动在材料耗尽、有限资源点耗尽、条件失效、补给耗尽、战败/重伤或寿元进入安全缓冲时停止；剩余时间不自动切换行动。
- 突破概率来源仍只允许基础概率、丹药、事件增益。本阶段不扩写战斗、NPC 或十二技能内容。
- 所有新增行为先写失败测试，再写最小实现；每个任务通过独立 reviewer 后才进入下一任务。

---

## 现状证据与 Stage 1A 后置假设

### 当前证据

- `game.js` 的 `state` 同时保存玩家进度、当前行动、离线弹窗、导航、Canvas 缓存和帧时钟，持久化边界与显示边界混合。
- `game.js` 当前有在线 `tickCurrent(dt)` 和离线 `offlineSettle(sec)` 两套规则；采集、钓鱼、材料不足和被动恢复在两条路径中的处理不同。
- `render()` 单独推进寿元、心情和鱼群恢复，而 `offlineSettle()` 只推进当前行动；这直接违反“在线/离线同一规则”和“年龄寿元、世界、灵田、并行进度完整现实时间推进”。
- `tickCurrent()` 会受突破、离线和轮回弹窗状态影响；显示层状态正在改变模拟结果。
- `GameAPI` 当前暴露 `state`、`data` 和 `persist`；`ui.js` 直接读取或修改 `a.state.phase`、`a.state.parts`、`a.state.navIndex`、`a.state.dirty`。
- `ui.js` 直接读取 `a.data.ACTIONS`、`a.data.SKILL_PAGES`，因此内容表可被显示层改写。
- 离线结果目前是 `{[actionKey]: count}`，不能表达实际/有效时长、停止原因、消耗、被动完成、等级提升或世界推进。
- `core/save-system.js` 已提供单快照、备份、坏档回退和 JSON-safe 动作标准化；`core/random.js` 已提供可保存 RNG。
- Stage 1A 已有 `getPersistenceStatus()` / `retryPersistence()`、常驻 `.persistence-error` UI 和全局进度锁；`repair`、`offline`、`explore`、`closeOffline` 与普通 `save` 写入失败各自保留可重试上下文，普通 `persist()` 不能越权提交。
- 探索遵守“开始先落档、结果再落档”；结果保存失败时保留已经产生的结果和 RNG、恢复已完成动作作为重试锚点。离线结算失败则回滚到结算前 checkpoint，以原 `savedAt -> now` 区间重试，成功后只计一次。
- 无限寿元的持久化哨兵已锁定为 `shouyuan:null`、`shouMax:null`；输入中的 `Infinity` 会归一化为 `null`，而不是 `0`。

### 以 Stage 1A HEAD `279525b` 为执行基线

执行本计划时应先确认：

```powershell
node --check core/random.js
node --check core/save-system.js
node --check game.js
node --check ui.js
npm test
```

已核实基线：基础设施 `44/44`、玩法 `140/140`、UI `47/47`，合计 `231/231`，最终输出 `=== 全量自测通过 ===`。实现者开始 Task 1 时必须在自己的实际 HEAD 上重新执行并记录计数；计数只能上升，不能用删测试或放宽断言维持绿色。

同时确认：`Platform.save` 返回布尔值；`game.js` 不再直接写旧 `cloud_*` 多键；repeat action 为 `{mode:'repeat', count:0}`；所有 gameplay randomness 经过 `state.rngState`；待领取离线结果已在展示前写回快照；修复/离线/探索失败会进入专用恢复状态并锁住进度；无限寿元可 JSON round-trip 为 `null`。

若上述任一项不满足，停止 Stage 1B Task 1，在当前实际 HEAD 上先补回缺失的 Stage 1A 基线能力；不得在 Stage 1B 新模块里另造一套旁路兼容逻辑。

## 锁定的模块边界

| 文件 | 唯一职责 | 禁止内容 |
|---|---|---|
| `core/simulation-report.js` | 停止原因、结构化结算报告、报告 ID、待领取去重、归档 | DOM、存档、玩法规则 |
| `core/state-model.js` | 可持久化模型默认值、旧字段归一化、运行时模型提取/回填、只读 ViewModel | UI 操作、计时、随机产出 |
| `core/simulation.js` | 通用事件边界循环；推进主行动和并行 lanes；返回新状态与报告 | 具体技能内容、DOM、toast、Platform |
| `core/game-rules.js` | 把现有 `ACTIONS`、`GATHERING_DATA` 和玩家字段适配为 simulation rules/lanes | UI、存档、页面导航 |
| `game.js` | 浏览器启动、规则装配、生命周期时钟、存档事务、命令和查询、Canvas 角色合成 | 第二套结算公式、对外可变 state |
| `ui.js` | DOM 结构、ViewModel 渲染、命令发送 | 直接读写游戏状态或规则表 |
| `scripts/sync-release.js` | 从根源码生成发布运行时文件 | 玩法逻辑、反向覆盖根源码 |

锁定的 v2 可持久化边界：

```js
player: {
  inventory: { stacks: {} },
  skills: {},
  mastery: {}
},
offlineLimitSeconds: 43200,
systems: {
  gathering: {
    spots: {},
    fishStocks: {},
    fishRecoverAcc: 0
  },
  homestead: {
    farm: { plots: [] },
    formations: { slots: [], owned: [] },
    beasts: { roster: [], activeIds: [] }
  },
  parallel: { jobs: [] },
  world: { tickAccumulator: 0 }
}
```

本阶段只实现空容器与通用时间接缝：

- `player.inventory.stacks` 是物品数量的唯一持久化来源；v1 的 `player.items`、`player.dan`、`player.bag` 在迁移时扁平合并，运行时不得继续保存三份副本。
- `systems.gathering` 是有限资源点、鱼种库存和恢复累加器的唯一持久化来源；v1 的 `player.spots`、`player.fishing` 和顶层 `fishRecoverAcc` 迁入此处。
- `systems.homestead.farm.plots[*].remainingSeconds` 到零时写入 `report.passive.farmCompleted`。
- `parallel.jobs[*].remainingSeconds` 到零时写入 `report.passive.parallelCompleted`。
- `world.tickAccumulator` 每满 `worldTickSeconds` 增加 `report.world.ticks`；不生成 NPC 内容。

锁定的停止原因：

```js
const STOP_REASONS = Object.freeze({
  MANUAL: 'manual',
  SWITCHED: 'switched',
  COMPLETED: 'completed',
  RESOURCE_DEPLETED: 'resource_depleted',
  MATERIALS_EXHAUSTED: 'materials_exhausted',
  SUPPLY_EXHAUSTED: 'supply_exhausted',
  DEFEATED: 'defeated',
  INJURED: 'injured',
  LIFESPAN_BUFFER: 'lifespan_buffer',
  INVALID_ACTION: 'invalid_action',
  REQUIREMENTS_INVALID: 'requirements_invalid',
  SIMULATION_GUARD: 'simulation_guard'
});
```

`offline_cap` 不是行动停止原因：它只增加 `report.cappedSeconds`，不清空 `state.current`，玩家上线后仍继续原行动。

锁定的模拟接口：

```js
Simulation.advance(model, elapsedSeconds, {
  source: 'online' | 'offline',
  fromMs: Number,
  mainActionLimitSeconds: null | Number,
  rules: ActionRules,
  lanes: PassiveLane[]
}) -> { state: PlainObject, report: SimulationReport }
```

锁定的命令结果：

```js
{
  ok: Boolean,
  code: String,
  changed: Boolean,
  message: String | null,
  data: PlainObject | null
}
```

锁定的公开 API：

```js
window.GameAPI = Object.freeze({
  queries: Object.freeze({
    app, navigation, top, home, inventory, breakModal,
    skillPage, gatherPage, offline, events, persistence
  }),
  commands: Object.freeze({
    randomizeAppearance, stepAppearance, confirmCreate, saveAppearance,
    switchNav, openBreak, closeBreak, attemptBreak,
    startAction, stopAction, acknowledgeOffline, enterLegacyRebirth,
    retryPersistence
  }),
  render: Object.freeze({
    drawCharacter
  })
});
```

公开对象不得包含 `state`、`data`、`persist`、`save`、旧根级 `getPersistenceStatus` / `retryPersistence`、`ACTIONS`、`GATHERING_DATA` 或内部 Canvas。`queries.persistence()` 只返回 UI 安全状态；不得返回 `savedAt`、`now`、checkpoint、候选模型、存储适配器、重试函数或任何“忽略锁继续写入”能力。`commands.retryPersistence()` 是唯一允许内部恢复协调器提交被保留结果的公开入口。

---

### Task 1: Stage 1B 测试入口和后置基线

**Files:**
- Create: `selftest_simulation.js`
- Modify: `selftest_all.js`
- Test: `selftest_simulation.js`

**Interfaces:**
- Consumes: Stage 1A 已通过的三套自测；审计基线为 foundation `44`、skillnet `140`、UI `47`。
- Produces: `npm test` 必须执行 simulation suite。

- [ ] **Step 1: 在 runner 中先加入不存在的 suite**

在 `selftest_all.js` 的 `suites` 数组中，把 `selftest_simulation.js` 放在 foundation 之后：

```js
const suites = [
  'selftest_foundation.js',
  'selftest_simulation.js',
  'selftest_skillnet.js',
  'selftest_ui.js'
];
```

- [ ] **Step 2: 运行并确认只因文件缺失失败**

Run: `npm test`

Expected: foundation、skillnet、UI 仍通过；runner 因找不到 `selftest_simulation.js` 失败。

- [ ] **Step 3: 创建最小 suite**

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

ok(true, 'simulation test harness starts');

console.log(`\n=== 模拟内核自测：${pass} 通过 / ${fail} 失败 ===`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 4: 验证全量基线**

Run: `npm test`

Expected: simulation 1/1；foundation 不低于 `44`、skillnet 不低于 `140`、UI 不低于 `47`，最终 `=== 全量自测通过 ===`。

- [ ] **Step 5: Commit**

```powershell
git add selftest_all.js selftest_simulation.js
git commit -m "test: add stage 1b simulation suite"
```

**Reviewer gate:** 只审 runner 是否真实传播失败退出码、Stage 1A 测试是否仍执行。

---

### Task 2: 结构化报告、停止原因和幂等收件箱

**Files:**
- Create: `core/simulation-report.js`
- Modify: `selftest_simulation.js`
- Test: `selftest_simulation.js`

**Interfaces:**
- Produces browser global/CommonJS `SimulationReport`。
- Produces `STOP_REASONS`, `create(meta)`, `normalize(raw, meta)`, `addCount(report, section, key, amount)`, `stop(report, reason, atMs)`, `addPending(existing, report)`, `archive(existing, reports, limit)`, `summarize(reports)`。

- [ ] **Step 1: 写失败测试**

在 `selftest_simulation.js` 中加载模块并加入：

```js
const SimulationReport = require('./core/simulation-report.js');

ok(SimulationReport.STOP_REASONS.MATERIALS_EXHAUSTED === 'materials_exhausted',
  'stop reasons use stable serializable codes');

const reportA = SimulationReport.create({
  source: 'offline', fromMs: 1000, toMs: 61000,
  requestedSeconds: 60, actionKey: 'caiyao', seedBefore: 7
});
const reportA2 = SimulationReport.create({
  source: 'offline', fromMs: 1000, toMs: 61000,
  requestedSeconds: 60, actionKey: 'caiyao', seedBefore: 7
});
ok(reportA.id === reportA2.id, 'same settlement window produces same report id');

SimulationReport.addCount(reportA, 'items', 'yaocai', 2);
SimulationReport.addCount(reportA, 'skillXp', 'caiyao', 8);
SimulationReport.stop(reportA, 'resource_depleted', 61000);
ok(reportA.gains.items.yaocai === 2, 'report records item gains');
ok(reportA.action.stopReason === 'resource_depleted', 'report records stop reason');

const inbox = SimulationReport.addPending(
  SimulationReport.addPending([], reportA),
  reportA2
);
ok(inbox.length === 1, 'pending reports deduplicate by id');

const archived = SimulationReport.archive([], inbox, 50);
const archivedAgain = SimulationReport.archive(archived, inbox, 50);
ok(archivedAgain.length === 1, 'report archive is idempotent');
ok(Object.isFrozen(SimulationReport.summarize(inbox)),
  'summary returned to callers is immutable');
```

- [ ] **Step 2: 确认模块缺失失败**

Run: `node selftest_simulation.js`

Expected: `Cannot find module './core/simulation-report.js'`。

- [ ] **Step 3: 实现固定报告结构**

`create(meta)` 必须返回：

```js
{
  id,
  source,
  fromMs,
  toMs,
  requestedSeconds,
  mainActionSeconds: 0,
  cappedSeconds: 0,
  action: {
    key: meta.actionKey || null,
    completed: 0,
    stopReason: null,
    stopAtMs: null
  },
  gains: {
    items: {},
    skillXp: {},
    masteryXp: {},
    cultivation: 0
  },
  costs: {
    items: {},
    supplies: {}
  },
  levels: [],
  unlocks: [],
  passive: {
    fishRecovered: 0,
    farmCompleted: [],
    parallelCompleted: []
  },
  world: {
    ticks: 0,
    events: []
  },
  warnings: []
}
```

用 FNV-1a 32-bit 为相同输入生成稳定 ID：

```js
function hashText(text) {
  let hash = 0x811C9DC5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function reportId(meta) {
  return 'sim-' + hashText([
    meta.source || 'online',
    Math.floor(meta.fromMs || 0),
    Math.floor(meta.toMs || 0),
    meta.actionKey || '',
    Number(meta.seedBefore) >>> 0
  ].join('|'));
}
```

`addPending` 和 `archive` 必须先按 `id` 去重，再 JSON clone；`archive` 只保留最后 `limit` 条。`summarize` 合并数值映射和数组后深冻结，但保留 `reportIds`，不能把多份报告压成一个会丢失原 ID 的存档对象。

`normalize(raw, meta)` 对已有结构化报告补默认字段；对 Stage 1A 的 `{[actionKey]: completed}` 旧报告，取第一个数值 key 作为 `action.key`、累计为 `action.completed`，用 `meta.savedAt` 生成稳定 ID，并在 `warnings` 加 `legacy_offline_report_migrated`。

- [ ] **Step 4: 验证 focused tests**

Run: `node selftest_simulation.js`

Expected: 全部通过。

- [ ] **Step 5: 浏览器 UMD 冒烟测试**

在 suite 中用 `vm` 执行模块，断言：

```js
ok(typeof browserSandbox.SimulationReport.create === 'function',
  'SimulationReport attaches to browser global');
```

Run: `node selftest_simulation.js`

Expected: PASS。

- [ ] **Step 6: Commit**

```powershell
git add core/simulation-report.js selftest_simulation.js
git commit -m "feat: add idempotent simulation reports"
```

**Reviewer gate:** 检查 ID 稳定、去重不丢报告、归档有界、所有字段 JSON-safe。

---

### Task 3: 可持久化 StateModel 与未来系统扩展槽

**Files:**
- Create: `core/state-model.js`
- Modify: `core/save-system.js`
- Modify: `selftest_foundation.js`
- Modify: `selftest_simulation.js`
- Test: `selftest_foundation.js`
- Test: `selftest_simulation.js`

**Interfaces:**
- Consumes: `SaveSystem.normalizeAction`, `GameRandom.normalizeSeed`, `SimulationReport`。
- Produces: `StateModel.normalize(raw, nowMs)`, `fromRuntime(runtime, nowMs)`, `applyToRuntime(runtime, model)`, `toSnapshotInput(model)`, `readonly(value)`。
- Bumps `SaveSystem.SCHEMA_VERSION` from `1` to `2` and provides explicit `v1 -> v2` migration。
- Keeps Stage 1A compatibility: old `player.items/dan/bag/spots/fishing`、top-level `fishRecoverAcc` and singular `pendingOfflineReport` still load, but all new saves use the v2 canonical locations。
- Keeps Stage 1A recovery semantics: primary v1 migration、backup recovery and legacy-key recovery all return `needsRepair:true`; repair must be durably written at the original watermark before any offline advance。

- [ ] **Step 1: 写状态边界失败测试**

```js
const StateModel = require('./core/state-model.js');

const normalized = StateModel.normalize({
  schemaVersion: 1,
  savedAt: 5000,
  created: true,
  player: {
    name: '边界测试',
    shouyuan: 10,
    shouMax: Infinity,
    items: { yaocai: 3 },
    dan: { tupo: 1 },
    bag: { copperOre: 2 },
    spots: { herb: { id: 'grove', left: 3, cap: 5 } },
    fishing: { pond: 7 },
    skills: { caiyao: { lv: 2, xp: 3 } },
    mastery: { herb: { pool: 0, entries: {} } }
  },
  current: { key: 'caiyao', mode: 'repeat', count: 0, done: 2, elapsed: 1 },
  rngState: 123,
  fishRecoverAcc: 9,
  pendingOfflineReport: { id: 'legacy-report' }
}, 10000);
ok(normalized.processedThroughMs === 5000, 'savedAt migrates to processedThroughMs');
ok(normalized.offlineLimitSeconds === 43200,
  'missing offline limit defaults to twelve hours');
ok(normalized.player.inventory.stacks.yaocai === 3 &&
   normalized.player.inventory.stacks.tupo === 1 &&
   normalized.player.inventory.stacks.copperOre === 2,
  'legacy inventory maps merge into one stack table');
ok(!('items' in normalized.player) && !('dan' in normalized.player) &&
   !('bag' in normalized.player),
  'legacy inventory maps are not retained in v2 model');
ok(normalized.systems.gathering.spots.herb.id === 'grove',
  'legacy resource spots migrate to gathering system');
ok(normalized.systems.gathering.fishStocks.pond === 7,
  'legacy fish stock migrates to gathering system');
ok(normalized.systems.gathering.fishRecoverAcc === 9,
  'legacy passive accumulator migrates to gathering system');
ok(normalized.systems.homestead.farm.plots.length === 0, 'farm extension slot exists');
ok(normalized.systems.homestead.formations.slots.length === 0,
  'formation extension slot exists');
ok(normalized.systems.homestead.beasts.roster.length === 0,
  'beast extension slot exists');
ok(normalized.systems.parallel.jobs.length === 0, 'parallel extension slot exists');
ok(normalized.systems.world.tickAccumulator === 0, 'world extension slot exists');
ok(Number.isFinite(normalized.player.shouyuan), 'persisted lifespan is finite');
ok(normalized.player.shouMax === null, 'unlimited lifespan uses null sentinel');
ok(JSON.parse(JSON.stringify(normalized)).player.shouMax === null,
  'unlimited lifespan remains null through JSON round-trip');

const mutableVm = StateModel.readonly({ nested: { value: 1 } });
ok(Object.isFrozen(mutableVm) && Object.isFrozen(mutableVm.nested),
  'readonly deeply freezes a detached clone');

const runtime = { dirty: true, cache: { canvas: true } };
StateModel.applyToRuntime(runtime, normalized);
runtime.player.name = '运行中';
const extracted = StateModel.fromRuntime(runtime, 12000);
ok(extracted.player.name === '运行中', 'runtime model fields round-trip');
ok(!('cache' in extracted) && !('dirty' in extracted),
  'renderer and UI fields never enter model');
ok(!('_persistenceIssue' in extracted) &&
   !('_offlineCommitPending' in extracted) &&
   !('_recoveryCandidate' in extracted),
  'persistence recovery control never enters the save model');
```

在 `selftest_foundation.js` 加：

```js
const extendedSnapshot = SaveSystem.createSnapshot({
  systems: {
    gathering: {
      spots: { herb: { id: 'grove', left: 3, cap: 5 } },
      fishStocks: { pond: 7 },
      fishRecoverAcc: 9
    },
    homestead: {
      farm: { plots: [{ id: 'p1', remainingSeconds: 12 }] },
      formations: { slots: ['f1'], owned: ['f1'] },
      beasts: { roster: [{ id: 'b1' }], activeIds: ['b1'] }
    },
    parallel: { jobs: [{ id: 'j1', remainingSeconds: 8 }] },
    world: { tickAccumulator: 3 }
  },
  reportArchive: [{ id: 'r1' }],
  processedThroughMs: 9000
}, 10000);
const extendedJson = JSON.parse(JSON.stringify(extendedSnapshot));
ok(extendedJson.schemaVersion === 2,
  'new snapshots use schema version 2');
ok(extendedJson.systems.homestead.farm.plots[0].id === 'p1',
  'snapshot preserves farm extension state');
ok(extendedJson.systems.homestead.formations.slots[0] === 'f1' &&
   extendedJson.systems.homestead.beasts.roster[0].id === 'b1',
  'snapshot preserves formation and beast extension state');
ok(extendedJson.reportArchive[0].id === 'r1',
  'snapshot preserves report archive');
ok(extendedJson.processedThroughMs === 9000,
  'snapshot preserves processed-through watermark');
```

- [ ] **Step 2: 运行并确认缺模块/字段失败**

Run:

```powershell
node selftest_simulation.js
node selftest_foundation.js
```

Expected: StateModel 缺失，SaveSystem 丢弃扩展字段。

- [ ] **Step 3: 先实现 SaveSystem v1 -> v2 显式迁移**

把 `SCHEMA_VERSION` 改为 `2`，并增加：

```js
function migrateV1(raw, now) {
  const source = cloneJson(raw, {});
  source.schemaVersion = 2;
  source.processedThroughMs = finiteNumber(
    source.processedThroughMs,
    finiteNumber(source.savedAt, now, 0),
    0
  );
  source.systems = source.systems || {};
  source.reportArchive = Array.isArray(source.reportArchive)
    ? source.reportArchive
    : [];
  return source;
}

function migrateSnapshot(raw, now) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.schemaVersion === 2) return raw;
  if (raw.schemaVersion === 1) return migrateV1(raw, now);
  return null;
}
```

`load` 对 primary、backup 都先 `migrateSnapshot`；返回值固定为：

```js
{
  source: 'snapshot' | 'backup' | 'legacy' | 'empty',
  snapshot,
  migrated: Boolean,
  needsRepair: Boolean
}
```

primary v1 的 `migrated` / `needsRepair` 都为 true；backup、legacy 无论是否已归一化都必须 `needsRepair:true`。旧 cloud 多键迁移直接创建 v2。未知未来版本不得误降级为 v2。`SaveSystem.load` 只读，不得在内部偷偷修复写入。

把 Stage 1A foundation 中 `snapshot.schemaVersion === 1` 的断言改为 `=== 2`；同时保留下方显式构造 `schemaVersion: 1` 的迁移 fixture，不能用删除旧断言的方式掩盖迁移缺失。

增加测试：

```js
const v1 = Object.assign({}, snapshot, { schemaVersion: 1 });
const migratedV1 = SaveSystem.load(jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(v1)
}), 12000);
ok(migratedV1.snapshot.schemaVersion === 2 && migratedV1.migrated === true,
  'schema v1 snapshot explicitly migrates to v2');
ok(migratedV1.needsRepair === true,
  'migrated v1 snapshot requires durable repair before offline settlement');
```

再为 primary v1、backup recovery、legacy recovery 各加“首次修复写失败”的集成 fixture，锁定以下顺序：

1. 运行时先应用已验证/迁移的基线模型，但不推进离线区间。
2. 用原始 `snapshot.savedAt` 写回规范 v2；失败则进入 `kind:'repair'`，保留原 `savedAt` 和本次启动的固定 `now`。
3. 故障期间所有进度命令与模拟推进返回 `persistence_locked`；普通保存和生命周期保存不得覆盖旧时间戳。
4. 专用重试若修复写成功，继续结算同一个 `savedAt -> now` 区间；若紧接着的离线结果写入失败，恢复种类转为 `offline`，但区间和 RNG 起点不变。
5. 再次重试成功后收益、报告和 `processedThroughMs` 只提交一次。重载也必须从旧已提交快照确定性重算，不能依赖被序列化的闭包或 checkpoint。

- [ ] **Step 4: 实现 StateModel**

模型必须只包含：

```js
{
  modelVersion: 1,
  created: Boolean,
  appearance: { parts: PlainObject },
  player: null | {
    name: String,
    realmStage: Number,
    realm: String,
    title: String,
    xiwei: Number,
    breakNeed: Number,
    mood: Number,
    jingqi: Number,
    lingshi: Number,
    shengwang: Number,
    lingyu: Number,
    shouyuan: Number | null,
    shouMax: Number | null,
    inventory: { stacks: PlainObject },
    skills: PlainObject,
    mastery: PlainObject
  },
  current: NormalizedAction | null,
  rngState: Uint32,
  offlineLimitSeconds: Number,
  systems: {
    gathering: {
      spots: PlainObject,
      fishStocks: PlainObject,
      fishRecoverAcc: Number
    },
    homestead: {
      farm: { plots: Array },
      formations: { slots: Array, owned: Array },
      beasts: { roster: Array, activeIds: Array }
    },
    parallel: { jobs: Array },
    world: { tickAccumulator: Number }
  },
  pendingOfflineReports: Array,
  reportArchive: Array,
  processedThroughMs: Number,
  lastActionStop: null | {
    key: String,
    reason: String,
    atMs: Number
  }
}
```

归一化规则：

```js
const sourceInbox = raw.pendingOfflineReports ||
  (raw.pendingOfflineReport && Array.isArray(raw.pendingOfflineReport.reports)
    ? raw.pendingOfflineReport.reports
    : raw.pendingOfflineReport
      ? [raw.pendingOfflineReport]
      : []);
const pendingOfflineReports = sourceInbox
  .map(report => SimulationReport.normalize(report, {
    source: 'offline',
    savedAt: raw.savedAt || nowMs
  }))
  .reduce((inbox, report) => SimulationReport.addPending(inbox, report), []);

const shouMax = raw.player && raw.player.shouMax;
if (shouMax === Infinity || shouMax === null) {
  player.shouMax = null;
  player.shouyuan = null;
}

const legacy = raw.player || {};
player.inventory = {
  stacks: Object.assign(
    {},
    legacy.items || {},
    legacy.dan || {},
    legacy.bag || {},
    legacy.inventory && legacy.inventory.stacks || {}
  )
};
delete player.items;
delete player.dan;
delete player.bag;

systems.gathering = {
  spots: clone(raw.systems?.gathering?.spots || legacy.spots || {}),
  fishStocks: clone(raw.systems?.gathering?.fishStocks || legacy.fishing || {}),
  fishRecoverAcc: finite(
    raw.systems?.gathering?.fishRecoverAcc,
    finite(raw.fishRecoverAcc, 0)
  )
};
delete player.spots;
delete player.fishing;

const offlineLimitSeconds = Math.max(
  43200,
  Math.min(172800, finite(raw.offlineLimitSeconds, 43200))
);
```

`fromRuntime` 逐字段提取，不使用 `{...runtime}`；`applyToRuntime` 逐字段回填，不覆盖 `phase`、`navIndex`、modal flags、`dirty`、`cache`、`_last`，也不覆盖 `_persistenceIssue`、`_offlineCommitPending` 或恢复协调器持有的 candidate/checkpoint。恢复控制只存在于 `game.js` 私有运行时，绝不能进入 v2 快照。`readonly` 必须先 JSON clone，再递归 `Object.freeze`。

- [ ] **Step 5: 扩展 SaveSystem v2 白名单**

在 `createSnapshot` 增加：

```js
systems: cloneJson(source.systems, {
  gathering: { spots: {}, fishStocks: {}, fishRecoverAcc: 0 },
  homestead: {
    farm: { plots: [] },
    formations: { slots: [], owned: [] },
    beasts: { roster: [], activeIds: [] }
  },
  parallel: { jobs: [] },
  world: { tickAccumulator: 0 }
}),
offlineLimitSeconds: finiteNumber(source.offlineLimitSeconds, 43200, 43200),
reportArchive: cloneJson(source.reportArchive, []),
processedThroughMs: finiteNumber(
  source.processedThroughMs,
  finiteNumber(source.savedAt, now, 0),
  0
)
```

`pendingOfflineReport` 统一保存为：

```js
{
  version: 1,
  reports: cloneJson(source.pendingOfflineReports || [], [])
}
```

读取旧 singular object 时由 `StateModel.normalize` 转成数组。v2 保存不再写顶层 `fishRecoverAcc`，只由 v1 迁移读取。

- [ ] **Step 6: 验证 focused 和 regression**

Run:

```powershell
node --check core/state-model.js
node --check core/save-system.js
node selftest_foundation.js
node selftest_simulation.js
npm test
```

Expected: 全部通过，快照 JSON 中无非有限数。

- [ ] **Step 7: Commit**

```powershell
git add core/state-model.js core/save-system.js selftest_foundation.js selftest_simulation.js
git commit -m "feat: define serializable simulation state boundary"
```

**Reviewer gate:** 尝试向 runtime 注入 DOM-like/canvas-like 字段，确认 `fromRuntime` 不携带；检查 `shouMax:null` 不被转为 0。

---

### Task 4: 纯逻辑 Simulation.advance 与 lane 调度器

**Files:**
- Create: `core/simulation.js`
- Modify: `selftest_simulation.js`
- Test: `selftest_simulation.js`

**Interfaces:**
- Consumes: `SimulationReport`, plain normalized `model`, explicit `rules` and `lanes`。
- Produces: `Simulation.advance(model, elapsedSeconds, options) -> {state, report}`。
- `rules` exact contract:

```js
{
  getAction(state): ActionDescriptor | null,
  nextBoundary(state, descriptor): Number,
  elapse(state, descriptor, seconds): void,
  inspect(state, descriptor): {
    status: 'ready' | 'waiting' | 'stop',
    reason: String | null
  },
  complete(state, descriptor, helpers): {
    stopReason: String | null
  },
  random(state): Number
}
```

- `lane` exact contract:

```js
{
  id: String,
  nextBoundary(state): Number,
  elapse(state, seconds, helpers): void,
  resolve(state, helpers): void
}
```

- `helpers` contains `{report, random(), stopCurrent(reason, atMs), nowMs()}`；`random()` advances only `state.rngState` through `GameRandom.next` supplied by rules configuration.

- [ ] **Step 1: 写不变性、分块一致性和 lane 测试**

使用测试 fixture：

```js
const Simulation = require('./core/simulation.js');

function fixtureRules() {
  return {
    getAction(s) {
      return s.current ? { key: s.current.key, duration: 2 } : null;
    },
    nextBoundary(s, d) {
      return Math.max(0, d.duration - s.current.elapsed);
    },
    elapse(s, d, seconds) {
      s.current.elapsed += seconds;
    },
    inspect(s) {
      return s.energy > 0
        ? { status: 'ready', reason: null }
        : { status: 'stop', reason: 'materials_exhausted' };
    },
    complete(s, d, h) {
      s.current.elapsed -= d.duration;
      s.current.done++;
      s.energy--;
      s.reward = (s.reward || 0) + (h.random() < 0.5 ? 1 : 2);
      h.report.action.completed++;
      SimulationReport.addCount(h.report, 'items', 'fixtureReward', 1);
      return { stopReason: s.energy <= 0 ? 'materials_exhausted' : null };
    },
    random(s) {
      const next = GameRandom.next(s.rngState);
      s.rngState = next.seed;
      return next.value;
    }
  };
}

const fixtureLane = {
  id: 'parallel',
  nextBoundary(s) {
    return s.job ? Math.max(0, s.job.remainingSeconds) : Infinity;
  },
  elapse(s, seconds) {
    if (s.job) s.job.remainingSeconds -= seconds;
  },
  resolve(s, h) {
    if (s.job && s.job.remainingSeconds <= 1e-9) {
      h.report.passive.parallelCompleted.push(s.job.id);
      s.job = null;
    }
  }
};

const base = {
  rngState: 123,
  energy: 3,
  reward: 0,
  current: { key: 'fixture', mode: 'repeat', count: 0, done: 0, elapsed: 0 },
  job: { id: 'letter-1', remainingSeconds: 3 }
};
const before = JSON.stringify(base);
const once = Simulation.advance(base, 6, {
  source: 'offline', fromMs: 1000, mainActionLimitSeconds: 6,
  rules: fixtureRules(), lanes: [fixtureLane]
});
ok(JSON.stringify(base) === before, 'advance does not mutate input model');
ok(once.state.current === null, 'materials exhausted stops the action');
ok(once.report.action.stopReason === 'materials_exhausted',
  'stop reason is reported');
ok(once.report.passive.parallelCompleted[0] === 'letter-1',
  'parallel lane advances in the same call');

let chunkState = JSON.parse(before);
let chunkReports = [];
for (let i = 0; i < 24; i++) {
  const out = Simulation.advance(chunkState, 0.25, {
    source: 'online', fromMs: 1000 + i * 250,
    mainActionLimitSeconds: null,
    rules: fixtureRules(), lanes: [fixtureLane]
  });
  chunkState = out.state;
  chunkReports.push(out.report);
}
ok(JSON.stringify(chunkState) === JSON.stringify(once.state),
  'chunked online and bulk offline reach identical state');
```

另加：

```js
const capped = Simulation.advance(base, 60, {
  source: 'offline', fromMs: 0, mainActionLimitSeconds: 2,
  rules: fixtureRules(), lanes: [fixtureLane]
});
ok(capped.report.mainActionSeconds === 2, 'offline cap limits only main lane');
ok(capped.report.cappedSeconds === 58, 'offline cap is visible in report');
ok(capped.report.passive.parallelCompleted.includes('letter-1'),
  'parallel lane uses full elapsed time beyond main cap');
```

- [ ] **Step 2: 确认模块缺失失败**

Run: `node selftest_simulation.js`

Expected: module missing。

- [ ] **Step 3: 实现事件边界循环**

算法必须按以下顺序：

```js
1. JSON clone 输入，拒绝负数/NaN elapsed。调用方必须先经过 `StateModel`，
   通用引擎不得擅自删掉未来模块字段。
2. mainBudget = source === 'offline' && limit != null
     ? min(elapsed, max(0, limit))
     : elapsed。
3. 循环直到完整现实时间 remaining 为 0：
   a. 先 inspect 主行动；`waiting` 时不把 action boundary 加入候选。
      再取 remaining、各 lane.nextBoundary、ready 主行动 nextBoundary 的最小非负值。
   b. 所有 lane.elapse(step) 始终推进。
   c. 只有 mainRemaining > 0 且 action ready 时 rules.elapse(step)。
   d. 先按传入数组顺序 resolve lanes，再 inspect/complete 主行动。
      同时刻被动恢复先发生，因此空鱼群在恢复时刻可继续钓。
   e. stopCurrent 写 lastActionStop、report.action.stopReason 并把 current 设 null。
4. `waiting` 不清空行动；主行动计时不推进，但 lanes 继续推进。
5. 每次 boundary resolution 计一次 transition；超过 1,000,000 次，
   以 simulation_guard 停止主行动并写 warnings。
6. 返回 `{state: clonedState, report}`。
```

不得用固定帧长近似；不得用 `Math.floor(elapsed / duration)` 另写离线捷径。

为避免零边界死循环：每轮必须记录 JSON-safe progress token；若所有 resolver 都未改变 token，则以 `simulation_guard` 停止，并退出主行动 resolution，继续被动时间到终点。

- [ ] **Step 4: 验证 deterministic 和 full regression**

Run:

```powershell
node --check core/simulation.js
node selftest_simulation.js
npm test
```

Expected: bulk/chunk 状态完全相同、输入未变、上限只影响主行动。

- [ ] **Step 5: Commit**

```powershell
git add core/simulation.js selftest_simulation.js
git commit -m "feat: add unified deterministic advance engine"
```

**Reviewer gate:** 特别构造 `waiting`、零 boundary、同时完成 lane/action、超 cap 和 48 小时输入，确认无死循环与时间丢失。

---

### Task 5: 现有行动规则与被动规则适配

**Files:**
- Create: `core/game-rules.js`
- Modify: `index.html`
- Modify: `game.js`
- Modify: `selftest_simulation.js`
- Modify: `selftest_skillnet.js`
- Test: `selftest_simulation.js`
- Test: `selftest_skillnet.js`

**Interfaces:**
- Consumes: existing `ACTIONS`, `GATHERING_DATA`, `REALM_TABLE`, skill helpers and `GameRandom`。
- Produces: `GameRules.create(config) -> {rules, lanes}`。
- Returned `rules` is `Object.freeze`d; `lanes` is a frozen array of frozen ordinary lane objects, so later stages extend by constructing a new config/array rather than mutating the live registry。
- `config` exact required keys:

```js
{
  actions,
  gatheringData,
  gatherSkillKey,
  discoverableEntries,
  skillXpNeed,
  masteryXpNeed,
  masteryDoubleChance,
  effectiveGatherTime,
  constants: {
    fishMax,
    fishRecoverSeconds,
    moodMax,
    moodRegenPerSecond,
    yearSeconds,
    lifespanBufferYears,
    worldTickSeconds
  }
}
```

- [ ] **Step 1: 写真实规则失败测试**

在 `selftest_simulation.js` 用最小内容 fixture 测试：

```js
const GameRules = require('./core/game-rules.js');

const content = {
  actions: {
    makePill: {
      skill: 'alchemy', name: '炼丹', time: 4, xp: 10,
      cost: { herb: 2 },
      effects: { stacks: { pill: 1 }, cultivation: 0, jingqi: 0 }
    }
  },
  gatheringData: {},
  gatherSkillKey: {},
  discoverableEntries() { return []; },
  skillXpNeed() { return 100; },
  masteryXpNeed() { return 100; },
  masteryDoubleChance() { return 0; },
  effectiveGatherTime() { return 1; },
  constants: {
    fishMax: 30,
    fishRecoverSeconds: 60,
    moodMax: 100,
    moodRegenPerSecond: 1 / 30,
    yearSeconds: 1800,
    lifespanBufferYears: 1,
    worldTickSeconds: 300
  }
};
const gameRules = GameRules.create(content);
const makeState = () => StateModel.normalize({
  player: {
    inventory: { stacks: { herb: 4, pill: 0 } },
    skills: { alchemy: { lv: 1, xp: 0 } },
    mood: 0, shouyuan: 10, shouMax: 120,
    mastery: {}
  },
  current: {
    key: 'makePill', mode: 'repeat', count: 0,
    done: 0, elapsed: 0, stalled: false
  },
  rngState: 9
}, 0);
const made = Simulation.advance(makeState(), 20, {
  source: 'offline', fromMs: 0, mainActionLimitSeconds: 20,
  rules: gameRules.rules, lanes: gameRules.lanes
});
ok(made.state.player.inventory.stacks.pill === 2,
  'production consumes exactly available materials');
ok(made.state.current === null, 'production stops when materials are exhausted');
ok(made.report.action.stopReason === 'materials_exhausted',
  'production reports materials exhaustion');
ok(made.report.action.completed === 2, 'report records completed iterations');
```

加入有限资源点、空鱼群恢复、寿元缓冲、farm/parallel/world fixture：

```js
ok(gathered.report.action.stopReason === 'resource_depleted',
  'finite gathering stops at depletion');
ok(fishingAfter60.report.passive.fishRecovered > 0,
  'fish stock recovery is handled by passive lane');
ok(lifespanResult.report.action.stopReason === 'lifespan_buffer',
  'main action stops before silent lifespan exhaustion');
ok(lifespanResult.state.player.shouyuan === 1,
  'player lifespan clamps at one-year safety buffer');
ok(passiveResult.report.world.ticks === 2,
  'world seam resolves deterministic five-minute ticks');
```

- [ ] **Step 2: 运行并确认缺模块失败**

Run: `node selftest_simulation.js`

Expected: `Cannot find module './core/game-rules.js'`。

- [ ] **Step 3: 实现 action adapter**

`inspect` 必须映射：

```js
unknown key -> stop/invalid_action
finite done >= count -> stop/completed
normal production cost missing -> stop/materials_exhausted
finite gather spot missing/left <= 0 -> stop/resource_depleted
fishing stock <= 0 -> waiting/null
unlock requirement no longer valid -> stop/requirements_invalid
otherwise -> ready/null
```

`complete` 必须：

- 探索固定耗时 2 秒，完成后用注入 RNG 选资源点和容量，然后以 `completed` 停止。
- 在本任务把现有 `ACTIONS[*].run` 闭包机械改写为 JSON-safe declarative `effects`；统一结构是
  `{stacks:{itemId:delta}, cultivation:Number, jingqi:Number}`。现有 `cost` key 直接解释为 `player.inventory.stacks` 物品 ID。
- 普通 ACTION 先从 `player.inventory.stacks` 付材料、再应用 `effects`、加技能经验、增加 done。
- 有限采集逐次掉落、精通双倍、技能/熟练度经验、容量减一；容量到零时清空 spot 并停止。
- 钓鱼逐次掉落、鱼种熟练度、8% 宝箱、库存减一；库存到零进入 waiting，不清空 action。
- 通过动作前后经济快照记录 `gains`/`costs`，不得在规则内 toast 或 persist。
- 所有随机使用 `config.random`/`helpers.random()`，禁止 `Math.random()`。

转换模式必须逐项覆盖整个表：

```js
// 采集/资源
caiyao:  { effects: { stacks: { yaocai: 2 }, cultivation: 0, jingqi: 0 } }
caijing: { effects: { stacks: { lingkuang: 2 }, cultivation: 0, jingqi: 0 } }
famu:    { effects: { stacks: { muliao: 2 }, cultivation: 0, jingqi: 0 } }
diaoyu:  { effects: { stacks: { shicai: 2 }, cultivation: 0, jingqi: 0 } }

// 生产
liandan_tupo: {
  cost: { yaocai: 5 },
  effects: { stacks: { tupo: 1 }, cultivation: 0, jingqi: 0 }
}
lianqi_jian: {
  cost: { lingkuang: 5 },
  effects: { stacks: { faqi: 1 }, cultivation: 0, jingqi: 0 }
}

// 修炼
tuna: {
  effects: { stacks: {}, cultivation: 5, jingqi: -2 }
}
shenfa: {
  effects: { stacks: {}, cultivation: 0, jingqi: 3 }
}
```

同族高阶行动只改变原数值，不改变字段。测试必须断言：

```js
ok(Object.values(ACTIONS).every(action => typeof action.run !== 'function'),
  'all action effects are declarative and serializable');
```

同步改造 `defaultPlayer()` 与 `ensurePlayer()`：

```js
inventory: {
  stacks: {
    yaocai: 0, lingkuang: 0, muliao: 0, shicai: 0,
    faqi: 0, hujia: 0, shanshi: 0, fu: 0, caiqing: 0,
    tupo: 0, heal: 0, jindan: 0, yuanying: 0, huashen: 0,
    lianxu: 0, heti: 0, dasheng: 0
  }
}
```

细粒度采集物无需预建 key，首次获得时写入同一个 `stacks`。从 player 默认值和 `ensurePlayer` 删除 `items`、`dan`、`bag`、`spots`、`fishing`；采集系统默认值由 `StateModel` 的 `systems.gathering` 负责。`skills` 和 `mastery` 继续归 player。

- [ ] **Step 4: 实现 passive lanes**

固定顺序：

```js
[
  lifespanLane,
  fishRecoveryLane,
  moodLane,
  farmLane,
  parallelLane,
  worldLane
]
```

规则：

- 寿元按 `seconds / yearSeconds` 下降；玩家到 `lifespanBufferYears` 时停止主行动并钳制，不触发死亡/轮回。
- 鱼群每满 60 秒恢复 1，封顶 `fishMax`，准确增加 `report.passive.fishRecovered`。
- 心情连续恢复到 `moodMax`。
- farm/parallel 只推进已有通用 `remainingSeconds`，完成项从 active 列表移除并把 ID 写入报告。
- world 每满 300 秒计一次 tick；本阶段 `events` 保持空数组。

- [ ] **Step 5: 在浏览器加载模块并组装真实规则**

`index.html` 中在 `game.js` 前按顺序加载：

```html
<script src="core/simulation-report.js"></script>
<script src="core/state-model.js"></script>
<script src="core/simulation.js"></script>
<script src="core/game-rules.js"></script>
```

在 `game.js` 的数据表定义完成后创建一次：

```js
const simulationRuntime = GameRules.create({
  actions: ACTIONS,
  gatheringData: GATHERING_DATA,
  gatherSkillKey: GATHER_SKILL_KEY,
  discoverableEntries,
  skillXpNeed,
  masteryXpNeed,
  masteryDoubleChance,
  effectiveGatherTime: effGatherTime,
  constants: {
    fishMax: FISH_MAX,
    fishRecoverSeconds: FISH_RECOVER_SEC,
    moodMax: MOOD_MAX,
    moodRegenPerSecond: MOOD_REGEN_PER_SEC,
    yearSeconds: YEAR_SECONDS,
    lifespanBufferYears: 1,
    worldTickSeconds: 300
  }
});
```

更新所有 vm 测试加载顺序；Stage 1A 模块必须先于 Stage 1B 模块。

- [ ] **Step 6: 删除 gameplay 里的散落随机和提示副作用**

`rollDrop`、`exploreSpot`、`gatherOnce`、`fishOnce` 的规则实现迁入 `core/game-rules.js` 后，`game.js` 不得保留被在线或离线调用的同名结算路径。UI 发起探索只创建 finite action，结果提示从 command result 或报告 ViewModel 获得。

现有运行时读取也同步切到 v2：

```js
p.items / p.dan / p.bag
  -> p.inventory.stacks
p.spots
  -> state.systems.gathering.spots
p.fishing
  -> state.systems.gathering.fishStocks
state.fishRecoverAcc
  -> state.systems.gathering.fishRecoverAcc
```

不得保留双写 alias；兼容只发生在 `StateModel.normalize(v1)`。

Run:

```powershell
rg -n "Math\\.random|offlineSettle\\(|tickCurrent\\(" game.js core
```

Expected: `Math.random` 无 gameplay 命中；旧双路径将在 Task 6 完全移除。

- [ ] **Step 7: 验证 focused 和 regression**

Run:

```powershell
node --check core/game-rules.js
node selftest_simulation.js
node selftest_skillnet.js
npm test
```

Expected: 生产、资源耗尽、鱼群等待/恢复、寿元缓冲和空扩展 lanes 全通过。

- [ ] **Step 8: Commit**

```powershell
git add core/game-rules.js index.html game.js selftest_simulation.js selftest_skillnet.js
git commit -m "refactor: adapt current actions to unified simulation rules"
```

**Reviewer gate:** 搜索 DOM/Platform/toast/Math.random 进入 `core/game-rules.js` 的情况；检查同一随机序列的 chunk/bulk 结果。

---

### Task 6: 运行时时钟、在线/离线同路与幂等离线报告

**Files:**
- Modify: `game.js`
- Modify: `selftest_simulation.js`
- Modify: `selftest_skillnet.js`
- Modify: `selftest_ui.js`
- Test: `selftest_simulation.js`
- Test: `selftest_skillnet.js`
- Test: `selftest_ui.js`

**Interfaces:**
- Consumes: `StateModel`, `Simulation`, `SimulationReport`, `simulationRuntime`。
- Produces internal `advanceRuntime(fromMs, toMs, source, mainLimit)`、`settleStartupOffline(snapshot, nowMs)` and private persistence-recovery coordinator。
- No public UI method may call raw `advanceRuntime`。
- No generic save path may receive an `allowPendingCommit` / `ignoreLock` flag. Only the private recovery coordinator may execute the exact held recovery descriptor。

- [ ] **Step 1: 写在线/离线真实集成失败测试**

在 skillnet VM 导出测试专用函数：

```js
__test: {
  snapshotModel: () => StateModel.fromRuntime(state, state.processedThroughMs),
  replaceModel: model => StateModel.applyToRuntime(state, model),
  advanceRuntime,
  settleStartupOffline,
  recoverySnapshot: () => persistenceRecovery.testSnapshot()
}
```

`__test` 仅存在于 Node VM 测试导出，不得挂到浏览器 `window.GameAPI`；`recoverySnapshot()` 也只能返回脱敏副本，不能返回可调用 closure、adapter 或可变 candidate。

测试：

```js
const startModel = G.__test.snapshotModel();

G.__test.replaceModel(JSON.parse(JSON.stringify(startModel)));
for (let i = 0; i < 400; i++) {
  G.__test.advanceRuntime(i * 250, (i + 1) * 250, 'online', null);
}
const onlineState = G.__test.snapshotModel();

G.__test.replaceModel(JSON.parse(JSON.stringify(startModel)));
G.__test.advanceRuntime(0, 100000, 'offline', 12 * 3600);
const offlineState = G.__test.snapshotModel();

ok(JSON.stringify(onlineState) === JSON.stringify(offlineState),
  'real current action has identical online/offline result');
```

幂等报告测试使用真实 JSON adapter：

```js
const firstOpen = G.__test.settleStartupOffline(snapshotAt0, 60000);
const savedAfterFirst = firstOpen.snapshot;
const secondOpen = G.__test.settleStartupOffline(savedAfterFirst, 60000);
ok(secondOpen.newReports.length === 0,
  'reopening at the same watermark does not replay offline settlement');
ok(secondOpen.state.pendingOfflineReports.length === 1,
  'pending report remains visible without duplication');
```

另测 20 小时离线：

```js
ok(result.report.mainActionSeconds === 12 * 3600,
  'main action uses 12 hour offline cap');
ok(result.state.systems.world.tickAccumulator !== startAccumulator ||
   result.report.world.ticks > 0,
  'world lane advances full 20 hours');
ok(result.state.player.shouyuan < startLifespan,
  'lifespan advances for full offline duration');
```

- [ ] **Step 2: 运行确认旧路径导致不一致**

Run:

```powershell
node selftest_skillnet.js
node selftest_ui.js
```

Expected: online/offline state不同或 test helper 缺失。

- [ ] **Step 3: 实现唯一 runtime adapter**

```js
function advanceRuntime(fromMs, toMs, source, mainActionLimitSeconds) {
  const elapsedSeconds = Math.max(0, (toMs - fromMs) / 1000);
  const input = StateModel.fromRuntime(state, fromMs);
  const result = Simulation.advance(input, elapsedSeconds, {
    source,
    fromMs,
    mainActionLimitSeconds,
    rules: simulationRuntime.rules,
    lanes: simulationRuntime.lanes
  });
  result.state.processedThroughMs = toMs;
  StateModel.applyToRuntime(state, result.state);
  return result.report;
}
```

`render()` 只计算 wall-clock delta 并调用：

```js
advanceRuntime(state._last, now, 'online', null);
state._last = now;
if (now >= state._nextAutosaveAt) {
  persistCurrentModel(now);
  state._nextAutosaveAt = now + 30000;
}
```

删除 `Math.min(0.25, dt)`；删除 render 内寿元、心情、鱼群恢复逻辑；删除旧 `tickCurrent` 和 `offlineSettle`。UI modal 状态不得阻止 advance。

`_nextAutosaveAt` 是纯运行时字段，不进入快照。自测用虚拟时间断言 90 秒连续在线最多触发 3 次周期保存且最新 `processedThroughMs` 为 90000；保存频率不得与帧率绑定。任一周期保存失败后立刻建立 `kind:'save'` 恢复项并冻结后续模拟；已在内存中推进的模型作为固定候选由专用重试提交，普通 autosave/pagehide 不得越过锁更新 watermark。

- [ ] **Step 4: 处理页面隐藏/恢复且不重复计时**

维护仅运行时字段：

```js
state._last = nowMs;
state._hiddenAt = null;
```

规则：

- `visibilitychange hidden`：先推进 `_last -> now` 的 online 时间，再持久化；记录 `_hiddenAt=now` 和 `_last=now`。
- `visibilitychange visible`：推进 `_hiddenAt -> now`，source=`offline`，主行动应用当前离线上限；把报告加入待领取，持久化成功后才设置离线弹层；清空 `_hiddenAt` 并设 `_last=now`。
- rAF 发现 `_hiddenAt != null` 时不推进，避免隐藏期间 rAF 和恢复结算双算。
- `pagehide` 和 `beforeunload` 只先补算到 `now` 再保存，不清除 pending report。
- 若任何一步写入失败，保留该操作的原 checkpoint/candidate/时间区间并进入进度锁；隐藏/恢复和 rAF 不能在锁定期间继续累计第二段待提交时间。

- [ ] **Step 5: 实现启动离线事务**

启动流程固定：

```js
1. SaveSystem.load(Platform, now)。
2. StateModel.normalize(snapshot, now)。
3. from = min(model.processedThroughMs, now)；时钟回拨时 from=now 并写 warning。
4. 若 now > from，调用唯一 Simulation.advance，source='offline'，
   mainActionLimitSeconds=model.systems.offlineLimitSeconds || 43200。
5. `SimulationReport.addPending` 按 report.id 去重。
6. model.processedThroughMs=now。
7. 先 SaveSystem.save；只有返回 true 才应用 model 并展示离线页。
8. 保存失败：恢复/保留结算前运行中模型，不应用候选收益，不前移 watermark，不展示“已落档”的收益；建立 `kind:'offline'` 恢复项，持有固定的原 snapshot、`from`、`now` 和候选结果摘要。
9. 故障期间停止 Simulation、所有进度命令和普通保存；常驻错误条保持可见。只有专用重试可用相同区间和 RNG 起点再次计算/提交，成功后才应用候选并展示离线页。
```

`pendingOfflineReport` 在快照中保存 envelope；重复打开同一 `processedThroughMs` 不重新推进。

若 `SaveSystem.load(...).needsRepair` 为 true，启动流程必须先执行 Task 3 的 repair 事务；修复未提交时不得进入步骤 3。repair 重试成功后才对最初捕获的同一 `now` 执行离线事务；离线写再失败时从 `repair` 明确转为 `offline`，不可丢失原区间或重复 RNG。

- [ ] **Step 6: 实现领取与归档事务**

```js
function acknowledgeOffline(reportIds) {
  const ids = new Set(reportIds || []);
  const selected = state.pendingOfflineReports.filter(r => ids.has(r.id));
  if (!selected.length) return commandResult(true, 'no_change', false, null, null);

  const nextArchive = SimulationReport.archive(state.reportArchive, selected, 50);
  const nextPending = state.pendingOfflineReports.filter(r => !ids.has(r.id));
  // 先构造 next model 并保存；成功后再替换运行中数组和关闭 modal。
}
```

连续点击或重复提交相同 ID 必须返回 `no_change`；归档只出现一次。事件页的离线归档来源就是 `reportArchive`。

- [ ] **Step 7: 更新离线 UI test storage 为真实 JSON**

所有测试 Platform stub：

```js
load(key) {
  return key in store ? JSON.parse(store[key]) : null;
},
save(key, value) {
  store[key] = JSON.stringify(value);
  return true;
}
```

断言：

```js
const persisted = JSON.parse(store.cloud_save_v1);
ok(persisted.processedThroughMs === nowMs,
  'processed-through watermark is persisted before offline modal');
ok(persisted.pendingOfflineReport.reports.length === 1,
  'pending offline report is persisted exactly once');
```

- [ ] **Step 8: 验证双路径已消失**

Run:

```powershell
rg -n "function tickCurrent|function offlineSettle|MOOD_REGEN_PER_SEC \\* dt|fishRecoverAcc \\+= dt" game.js
node --check game.js
npm test
```

Expected: grep 无旧结算实现命中；全量测试通过。

- [ ] **Step 9: Commit**

```powershell
git add game.js selftest_simulation.js selftest_skillnet.js selftest_ui.js
git commit -m "refactor: unify online and offline runtime advancement"
```

**Reviewer gate:** 使用同一存档连续打开三次、页面隐藏/恢复两次、系统时钟回拨一次；确认没有重复收益、漏时或 UI modal 暂停模拟。

---

### Task 7: 私有状态、命令/查询 API 与 UI 迁移

**Files:**
- Modify: `game.js`
- Modify: `ui.js`
- Modify: `selftest_ui.js`
- Modify: `selftest_skillnet.js`
- Test: `selftest_ui.js`
- Test: `selftest_skillnet.js`

**Interfaces:**
- Produces exactly `GameAPI.queries`, `GameAPI.commands`, `GameAPI.render`。
- Every command returns `{ok, code, changed, message, data}`。
- Every query returns `StateModel.readonly(viewModel)`。
- `render.drawCharacter(targetCanvas)` draws into caller canvas and returns boolean; it never returns internal cache.
- Migrates Stage 1A root `getPersistenceStatus()` / `retryPersistence()` to `queries.persistence()` / `commands.retryPersistence()` without weakening their lock、retry or persistent-error behavior。

- [ ] **Step 1: 写 API 泄漏失败测试**

在 `selftest_ui.js`：

```js
ok(API && API.queries && API.commands && API.render,
  'GameAPI exposes query command and render boundaries');
ok(!('state' in API), 'GameAPI does not expose mutable state');
ok(!('data' in API), 'GameAPI does not expose mutable rule tables');
ok(!('persist' in API), 'GameAPI does not expose persistence');
ok(!('save' in API) &&
   !('getPersistenceStatus' in API) &&
   !('retryPersistence' in API),
  'legacy root persistence capabilities are removed');

const appVm = API.queries.app();
const originalPhase = API.queries.app().phase;
try { appVm.phase = 'hacked'; } catch (error) {}
ok(API.queries.app().phase === originalPhase,
  'mutating query result cannot change game state');

const navVm = API.queries.navigation();
try { navVm.items.push({ id: 'hack' }); } catch (error) {}
ok(API.queries.navigation().items.length === navVm.items.length,
  'navigation ViewModel is detached and frozen');

const persistenceVm = API.queries.persistence();
ok(typeof persistenceVm.locked === 'boolean' &&
   !('savedAt' in persistenceVm) &&
   !('now' in persistenceVm) &&
   !('candidate' in persistenceVm) &&
   !('checkpoint' in persistenceVm) &&
   !('retry' in persistenceVm),
  'persistence query is UI-safe and carries no recovery privilege');
```

命令结果：

```js
const invalid = API.commands.startAction({ key: 'missing-action' });
ok(invalid.ok === false && invalid.code === 'invalid_action' &&
   invalid.changed === false,
  'invalid commands return structured failure');

const switched = API.commands.startAction({ key: 'caiyao' });
ok(switched.ok && switched.code === 'ok' && switched.changed,
  'valid command returns structured success');
```

- [ ] **Step 2: 确认旧 API 失败**

Run: `node selftest_ui.js`

Expected: `API.state`/old methods do not satisfy new assertions。

- [ ] **Step 3: 实现统一命令结果 helper**

```js
function commandResult(ok, code, changed, message, data) {
  return Object.freeze({
    ok: !!ok,
    code: String(code),
    changed: !!changed,
    message: message == null ? null : String(message),
    data: data == null ? null : StateModel.readonly(data)
  });
}
```

命令不得返回内部 player/current/arrays。失败 code 至少支持：

```js
'ok'
'no_change'
'invalid_argument'
'invalid_action'
'not_created'
'persistence_locked'
'requirements_missing'
'save_failed'
```

- [ ] **Step 4: 实现固定 queries**

```js
queries.app() -> {
  phase,
  appearance: { indices },
  modals: { break, offline, legacyRebirth }
}
queries.navigation() -> {
  activeIndex,
  items: [{ id, label, active }]
}
queries.top()
queries.home()
queries.inventory()
queries.breakModal()
queries.skillPage(navName)
queries.gatherPage(navName)
queries.offline() -> {
  visible,
  reports,
  summary
}
queries.events() -> {
  offlineReports: reportArchive newest-first
}
queries.persistence() -> {
  locked,
  kind: null | 'save' | 'repair' | 'offline' | 'explore' | 'closeOffline',
  message,
  canRetry
}
```

`skillPage`/`gatherPage` 内直接投影数据表，只返回页面需要的字段；不返回 ACTION object 或函数。`persistence()` 不返回内部 `error` 细节、时间戳、候选模型、checkpoint、存储键或重试 closure。

- [ ] **Step 5: 实现固定 commands**

```js
randomizeAppearance()
stepAppearance({part, delta})
confirmCreate()
saveAppearance()
switchNav({index})
openBreak()
closeBreak()
attemptBreak()
startAction({key})
stopAction()
acknowledgeOffline({reportIds})
enterLegacyRebirth()
retryPersistence()
```

`startAction` 切换旧行动时先写：

```js
lastActionStop = {
  key: previous.key,
  reason: 'switched',
  atMs: Date.now()
};
```

`stopAction` 使用 `manual`。命令可以触发 toast，但模拟模块不能。

会改变可持久化模型的命令（创建、保存形象、突破、开始/停止行动、领取离线报告、旧轮回入口）统一使用事务 helper：

```js
function commitModel(mutator, nowMs) {
  if (persistenceRecovery.isLocked()) {
    return commandResult(false, 'persistence_locked', false,
      persistenceRecovery.message(), null);
  }
  const candidate = StateModel.fromRuntime(state, nowMs);
  const result = mutator(candidate);
  if (result && result.ok === false) return result;
  if (!SaveSystem.save(Platform, StateModel.toSnapshotInput(candidate), nowMs)) {
    persistenceRecovery.holdModel({
      kind: 'save',
      candidate,
      nowMs,
      success: result && result.data || null
    });
    return commandResult(false, 'save_failed', false, '存档失败，请重试', {
      retryable: true
    });
  }
  StateModel.applyToRuntime(state, candidate);
  return commandResult(true, 'ok', true, null, result && result.data || null);
}
```

保存成功后才替换运行时模型；失败时状态不变，但候选结果由私有恢复协调器持有，玩家不必重复触发随机判定。导航、打开/关闭弹层只改变 UI 状态，不触发存档；其余所有会改变进度、外观或 RNG 的命令先检查恢复锁并返回 `persistence_locked`。

`commands.retryPersistence()` 只委托私有协调器恢复当前唯一 issue：按 `save` / `repair` / `offline` / `explore` / `closeOffline` 的既定语义提交 held candidate 或重放固定区间；成功后最多应用一次并清锁，失败时 issue 常驻。它不得接收 candidate、checkpoint、adapter、时间戳或 `ignoreLock` 参数。不得把 `commitModel`、`persistModel`、恢复协调器、底层 `SaveSystem.save` 或任意 bypass flag 暴露给 UI。

- [ ] **Step 6: 隔离角色 Canvas**

```js
function drawCharacter(targetCanvas) {
  if (!targetCanvas || typeof targetCanvas.getContext !== 'function') return false;
  const source = getCharCache();
  if (!source) return false;
  const target = targetCanvas.getContext('2d');
  // 按 targetCanvas CSS/物理尺寸绘制；不返回 source。
  return true;
}
```

删除公开 `getCharCache`。内部 Canvas 仍由 `game.js` 管理。

- [ ] **Step 7: 迁移 ui.js**

替换规则：

```js
a.state.phase                    -> a.queries.app().phase
a.state.parts[c]                 -> a.queries.app().appearance.indices[c]
a.state.navIndex                 -> a.queries.navigation().activeIndex
a.data.SKILL_PAGES[navName]      -> a.queries.skillPage(navName) ||
                                    a.queries.gatherPage(navName)
a.persist() + direct state edits -> a.commands.saveAppearance()
a.setCurrent(key)                -> a.commands.startAction({key})
a.closeOffline()                 -> a.commands.acknowledgeOffline({
                                      reportIds: a.queries.offline().reports.map(r => r.id)
                                    })
a.getPersistenceStatus()         -> a.queries.persistence()
a.retryPersistence()             -> a.commands.retryPersistence()
a.getCharCache()                 -> a.render.drawCharacter(targetCanvas)
```

事件页不再是纯占位：用 `queries.events().offlineReports` 渲染最近离线结算标题、时长、行动完成次数和停止原因；待决策事件和世界演变仍显示“尚无”，不在本阶段生成 NPC 内容。

现有 `.persistence-error`、`.persistence-message`、`.persistence-retry` 常驻错误条必须原样保留：每帧读取 `queries.persistence()`，锁定时持续显示并禁用所有进度按钮，只允许 UI 导航、弹层查看和“重试”；不得退化成一次性 toast。重试失败后错误条继续显示，成功并确认提交后才隐藏。

- [ ] **Step 8: 静态边界检查**

Run:

```powershell
rg -n "GameAPI\\.state|GameAPI\\.data|a\\.state|a\\.data|a\\.persist|getCharCache|a\\.getPersistenceStatus|a\\.retryPersistence" ui.js
rg -n "state,|data: \\{|persist,|getPersistenceStatus,|retryPersistence," game.js
```

Expected: 无 UI 直接状态/规则/存档访问；公开对象不含旧字段。

- [ ] **Step 9: UI regression**

Run:

```powershell
node --check game.js
node --check ui.js
node selftest_ui.js
node selftest_skillnet.js
npm test
```

Expected:

- 创建/编辑角色可用。
- 顶栏、导航、洞府、背包、采集和制造页仍渲染。
- 动作卡仍能启动/切换。
- 突破、离线、旧轮回弹层仍能开关；Stage 5 前保留旧轮回入口，但寿元不会由模拟自动归零。
- 离线领取后事件页出现一条且只出现一条归档。
- 模拟 `save`、`repair`、`offline`、`explore`、`closeOffline` 写失败时，常驻错误条、进度锁、专用重试和单次提交语义均保留；普通保存/页面生命周期事件不能绕过锁。

- [ ] **Step 10: Commit**

```powershell
git add game.js ui.js selftest_ui.js selftest_skillnet.js
git commit -m "refactor: enforce command query boundary for game ui"
```

**Reviewer gate:** 在测试里故意改写所有 query 返回对象，检查内部状态不变；检查 UI 无任何直接状态写入；再模拟五类写失败，确认 `commands.retryPersistence()` 是唯一恢复入口且 API 没有泄露 checkpoint/candidate/bypass。

---

### Task 8: 发布同步、完整一致性回归和 Stage 1B 验收

**Files:**
- Create: `scripts/sync-release.js`
- Create: `selftest_release.js`
- Modify: `package.json`
- Modify: `selftest_all.js`
- Generate: `release/core/random.js`
- Generate: `release/core/save-system.js`
- Generate: `release/core/simulation-report.js`
- Generate: `release/core/state-model.js`
- Generate: `release/core/simulation.js`
- Generate: `release/core/game-rules.js`
- Generate: `release/index.html`
- Generate: `release/platform.js`
- Generate: `release/game.js`
- Generate: `release/ui.js`
- Generate: `release/styles.css`
- Generate: `release/nie-manifest.js`
- Test: `selftest_release.js`

**Interfaces:**
- Produces `npm run release:sync` and a source/release byte-equality test。
- Root remains authoritative; generated release files are never edited separately。

- [ ] **Step 1: 先写 release drift 失败测试**

`selftest_release.js`：

```js
'use strict';
const fs = require('fs');
const path = require('path');

const files = [
  'index.html', 'platform.js', 'game.js', 'ui.js', 'styles.css',
  'nie-manifest.js',
  'core/random.js', 'core/save-system.js',
  'core/simulation-report.js', 'core/state-model.js',
  'core/simulation.js', 'core/game-rules.js'
];

let fail = 0;
for (const file of files) {
  const source = path.join(__dirname, file);
  const target = path.join(__dirname, 'release', file);
  const same = fs.existsSync(target) &&
    fs.readFileSync(source).equals(fs.readFileSync(target));
  if (!same) {
    fail++;
    console.error('  ✗ release drift: ' + file);
  }
}
process.exit(fail ? 1 : 0);
```

把它加入 `selftest_all.js` 最后。运行 `npm test`，预期因 `release/core/*` 缺失或 runtime drift 失败。

- [ ] **Step 2: 实现单向同步脚本**

`scripts/sync-release.js` 使用与测试完全相同的 manifest：

```js
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const release = path.resolve(root, 'release');
if (!release.startsWith(root + path.sep)) {
  throw new Error('release target escaped workspace');
}

const files = [
  'index.html', 'platform.js', 'game.js', 'ui.js', 'styles.css',
  'nie-manifest.js',
  'core/random.js', 'core/save-system.js',
  'core/simulation-report.js', 'core/state-model.js',
  'core/simulation.js', 'core/game-rules.js'
];
for (const file of files) {
  const source = path.join(root, file);
  const target = path.join(release, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}
console.log('release runtime synchronized: ' + files.length + ' files');
```

不得递归删除 `release/NIE`；不得从 release 复制回根目录。

`package.json`：

```json
{
  "scripts": {
    "test": "node selftest_all.js",
    "release:sync": "node scripts/sync-release.js"
  }
}
```

- [ ] **Step 3: 生成 release 并验证**

Run:

```powershell
npm run release:sync
npm test
```

Expected: release suite PASS，全量 PASS。

- [ ] **Step 4: 最终语法与禁用模式扫描**

Run:

```powershell
node --check core/random.js
node --check core/save-system.js
node --check core/simulation-report.js
node --check core/state-model.js
node --check core/simulation.js
node --check core/game-rules.js
node --check game.js
node --check ui.js
rg -n "function offlineSettle|function tickCurrent|Math\\.random" game.js core
rg -n "a\\.state|a\\.data|GameAPI\\.state|GameAPI\\.data|a\\.persist|a\\.getPersistenceStatus|a\\.retryPersistence" ui.js
rg -n "allowPendingCommit|ignoreLock" game.js core
```

Expected: syntax 全通过；三个 grep 无命中。

- [ ] **Step 5: 运行固定一致性矩阵**

在 `selftest_simulation.js` 确保以下矩阵均断言最终 `state` JSON 完全相等：

```text
100 秒：400 × 0.25s online vs 1 × 100s offline
3600 秒：3600 × 1s online vs 1 × 3600s offline
20 小时：主行动只推进 12h；farm/parallel/world/lifespan 推进 20h
材料恰好耗尽：最后一次完成后 materials_exhausted
有限资源恰好归零：resource_depleted
鱼群归零与第 60 秒恢复同刻：先恢复，再允许行动
寿元到 1 年缓冲同刻：停止主行动，不死亡
同一离线快照打开三次：报告 ID 不重复、收益不重复
同一领取命令提交三次：事件归档只出现一次
v1/backup/legacy 修复写失败：锁为 repair；重试后原离线区间只结算一次
离线/探索/领取/普通命令写失败：进度冻结；普通保存不能绕锁；专用重试只提交一次
持久化错误条：失败后跨 render 常驻；重试再失败不消失；成功后才隐藏
无限寿元：v1 -> v2 -> JSON save/load 始终为 null，不变成 0
```

Run: `npm test`

Expected: 全部通过。

- [ ] **Step 6: Commit**

```powershell
git add package.json selftest_all.js selftest_release.js scripts/sync-release.js release/index.html release/platform.js release/game.js release/ui.js release/styles.css release/nie-manifest.js release/core
git commit -m "build: synchronize stage 1b release runtime"
```

**Reviewer gate:** reviewer 从干净 checkout 运行 `npm test`、`npm run release:sync`、再次 `npm test`；第二次同步不得产生 diff。

---

## Stage 1B Completion Gate

- `npm test` 全部通过，且 simulation、release suites 实际包含在 runner。
- 新快照固定为 `schemaVersion: 2`；v1 单快照和旧 cloud 多键都能迁移，未知未来版本不会被误覆盖。
- primary v1、backup、legacy 的规范化写回失败会保持 `repair` 锁；修复成功后只结算一次原离线区间，后续离线写失败能安全转入 `offline` 恢复。
- v2 中物品只在 `player.inventory.stacks`，采集实例只在 `systems.gathering`，洞府扩展只在 `systems.homestead`，不存在兼容双写。
- `Simulation.advance` 不修改传入对象，不访问浏览器全局，不写存档，不弹提示。
- 真实现有动作在分块 online 与整段 offline 下产生完全相同的 state 和 RNG。
- `game.js` 不再存在 `tickCurrent`/`offlineSettle` 两套结算。
- 显示弹层、切页和 DOM 渲染不会暂停或改变模拟。
- 行动停止原因使用稳定枚举；offline cap 不误清空行动。
- 主行动遵守 12h cap；farm/parallel/world/lifespan 使用完整现实时间。
- 玩家寿元到 1 年安全缓冲时停止行动，不会离线无提示死亡。
- pending offline reports 在展示前已持久化，按 ID 去重；领取重复提交幂等；归档可在事件页读取。
- 任意持久化故障都会冻结模拟和进度命令；常驻错误条在成功恢复前不消失；普通保存、自动保存、生命周期保存均不能绕过恢复锁。
- `GameAPI` 不暴露 `state`、`data`、`persist`、底层 save、旧根级持久化方法、恢复 candidate/checkpoint/bypass 或内部 Canvas；所有查询结果深冻结且不可反向修改状态。
- `queries.persistence()` 只提供脱敏 UI 状态，`commands.retryPersistence()` 是唯一恢复入口；`save` / `repair` / `offline` / `explore` / `closeOffline` 均有失败后单次提交回归测试。
- 当前 UI 骨架和创建、导航、采集、制造、背包、突破、离线弹层没有回归。
- `release/` 与根源码完全同步，重复运行同步脚本不产生变化。
- 独立 reviewer 不存在未修复的 Serious 或 Important 问题。

## 建议的 Implementer / Reviewer 切分

每项使用新 implementer，完成后立即独立 review；不要让两个 implementer 同时修改运行时代码：

1. Task 1：测试入口，极小任务。
2. Task 2：报告与幂等，独立纯模块。
3. Task 3：状态/存档边界，独立纯模块。
4. Task 4：调度器，算法高风险，使用高推理 implementer + reviewer。
5. Task 5：现有玩法适配，内容规则高风险，单独 review。
6. Task 6：启动/生命周期/离线事务，存档重放最高风险，单独 review。
7. Task 7：API/UI 迁移，DOM 回归风险，单独 review。
8. Task 8：发布与全量回归，独立 final reviewer。

Task 4、5、6 不得并行；它们依次锁定引擎、规则、运行时。Task 2 和 Task 3 虽可理论并行，但两者共同定义 pending report 字段，仍建议串行以避免接口漂移。

## 自审结果

- 规格覆盖：统一主行动、在线/离线同规则、离线上限、完整现实时间 lanes、寿元缓冲、停止原因、幂等离线报告、事件页归档、JSON-safe 状态、可复现 RNG、UI 命令/查询边界、release 同步均有明确任务。
- 有意不在本阶段实现：完整灵田种植内容、完整并行社交内容、NPC 世界事件、十二技能重做、战斗副本、功法、宗门；只提供稳定扩展槽和时间推进接缝。
- 类型一致：`player.inventory/skills/mastery`、`systems.gathering/homestead/parallel/world`、`pendingOfflineReports`、report 字段、`Simulation.advance` 参数、GameAPI 名称在所有任务中一致；Stage 1A 的恢复状态只迁移接口位置，不进入模型、不削弱语义。
- 计划没有要求 UI 再设计；只把现有 UI 数据来源迁到 ViewModel，并给事件页接入已经要求归档的离线报告。
