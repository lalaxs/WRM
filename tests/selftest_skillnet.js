// 技艺体系自测：在 vm 中加载 game.js（注入桩），校验数据完整性与核心逻辑
const fs = require('fs');
const vm = require('vm');

const gameRuntimeFiles = ['game.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-api.js'];

// ── 桩：Canvas 2D 上下文（所有方法 no-op）──
function stubCtx() {
  return new Proxy({}, {
    get(t, p) {
      if (p === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'canvas') return { width: 420, height: 820 };
      if (p === 'save' || p === 'restore') return () => {};
      return () => {};
    }
  });
}
function stubCanvas() {
  return { width: 300, height: 300, getContext: () => stubCtx(), style: {}, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 820 }) };
}

const view = { scale: 1, offsetX: 0, offsetY: 0, safeTop: 0, dpr: 1, logicalH: 820 };
const store = {};
let saveMode = 'ok';
let saveAttempts = 0;
let primarySaveAttempts = 0;
const Platform = new Proxy({}, {
  get(t, p) {
    if (p === 'ctx') return stubCtx();
    if (p === 'view') return view;
    if (p === 'load') return (k) => (k in store ? JSON.parse(store[k]) : null);
    if (p === 'save') return (k, v) => {
      saveAttempts++;
      if (k === 'cloud_save_v1') primarySaveAttempts++;
      if (saveMode === 'false') return false;
      if (saveMode === 'throw') throw new Error('storage unavailable');
      store[k] = JSON.stringify(v);
      return true;
    };
    if (p === 'createImage') return () => ({ onload: null, onerror: null, set src(v) {} });
    if (p === 'createCanvas') return () => stubCanvas();
    if (p === 'getSystemInfoAsync') return (obj) => { if (obj && typeof obj.success === 'function') obj.success({ pixelRatio: 1, safeArea: { top: 0 } }); };   // 触发 init 以设置 W/H/scale
    return () => {};                                   // 任意其他方法（onTouchStart 等）no-op
  }
});

const sandbox = {
  __GAME_TEST_HARNESS_REQUEST__: true,
  Platform,
  window: { addEventListener() {}, NIE_ASSET_BASE: '' },
  document: { addEventListener() {}, hidden: false },
  console,
  Math, Date, isFinite, isNaN, parseInt, parseFloat,
  requestAnimationFrame() {}, setTimeout() {}, Proxy, RegExp, Error, Set,
  structuredClone
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
[
  'core/random.js',
  'content/herblore-parity.js',
  'content/materials.js',
  'content/items.js',
  'content/life-skills.js',
  'content/gathering.js',
  'content/recipes.js',
  'content/homestead.js',
  'core/stage2-state.js',
  'core/inventory.js',
  'core/skill-progression.js',
  'core/gathering.js',
  'core/production.js',
  'core/farm.js',
  'core/formations.js',
  'core/spirit-beasts.js',
  'core/stage2-rules.js'
].forEach(function (file) {
  vm.runInContext(
    fs.readFileSync(file, 'utf8'),
    sandbox,
    { filename: file }
  );
});
// SaveSystem 需要 Stage3/4，但勿把 Stage3State 挂到 game 沙箱（会触发 Stage3 完整性检查）。
const saveSandbox = {
  Stage2State: sandbox.Stage2State,
  Stage3State: require('../core/stage3-state.js'),
  Stage4State: require('../core/stage4-state.js'),
  console: sandbox.console,
  Math: sandbox.Math,
  Date: sandbox.Date,
  JSON: JSON,
  Object: Object,
  Array: Array,
  Number: Number,
  String: String,
  Boolean: Boolean,
  Error: Error,
  Set: Set,
  Infinity: Infinity,
  NaN: NaN,
  isFinite: isFinite,
  isNaN: isNaN,
  parseInt: parseInt,
  parseFloat: parseFloat
};
saveSandbox.globalThis = saveSandbox;
vm.createContext(saveSandbox);
vm.runInContext(
  fs.readFileSync('core/save-system.js', 'utf8'),
  saveSandbox,
  { filename: 'core/save-system.js' }
);
sandbox.SaveSystem = saveSandbox.SaveSystem;
vm.runInContext(fs.readFileSync('core/simulation-report.js', 'utf8'), sandbox, { filename: 'core/simulation-report.js' });
vm.runInContext(fs.readFileSync('core/state-model.js', 'utf8'), sandbox, { filename: 'core/state-model.js' });
vm.runInContext(fs.readFileSync('core/simulation.js', 'utf8'), sandbox, { filename: 'core/simulation.js' });
vm.runInContext(fs.readFileSync('core/game-rules.js', 'utf8'), sandbox, { filename: 'core/game-rules.js' });
gameRuntimeFiles.forEach((file) => {
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
});

if (!sandbox.__GameTestHarness) {
  console.error('  ✗ FAIL: explicit Node-only game harness is unavailable');
  process.exit(1);
}
const G = sandbox.__GameTestHarness;
const API = sandbox.window.GameAPI;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL: ' + msg); } }
function advanceSeconds(seconds, source, mainActionLimitSeconds) {
  if (!G.__test || typeof G.__test.advanceGameplay !== 'function') {
    return null;
  }
  const fromMs = Number.isFinite(G.state.processedThroughMs)
    ? G.state.processedThroughMs
    : 0;
  return G.__test.advanceGameplay(
    fromMs,
    fromMs + seconds * 1000,
    source || 'online',
    mainActionLimitSeconds == null ? null : mainActionLimitSeconds
  );
}
function settleCurrentModel(nowMs) {
  return G.__test.settleStartupOffline(
    G.__test.snapshotModel(),
    nowMs
  );
}
ok(
  G.__test && typeof G.__test.advanceGameplay === 'function',
  'runtime exposes a Node-only guarded gameplay advancement seam'
);

// 1) 顶层数据存在
ok(G.ACTIONS && G.SKILL_PAGES && G.NAV && G.defaultPlayer, '核心数据结构存在');
ok(Object.keys(G.ACTIONS).length === 29,
  'ACTIONS 完整覆盖 29 个现有行动');
ok(Object.values(G.ACTIONS).every((action) => typeof action.run !== 'function'),
  'all action effects are declarative and serializable');
ok(JSON.stringify(JSON.parse(JSON.stringify(G.ACTIONS))) ===
  JSON.stringify(G.ACTIONS),
  'ACTIONS survives a JSON round trip without behavior loss');

// 2) NAV 里所有技艺页都能路由到 SKILL_PAGES，且 actions 都在 ACTIONS 中
const navSkills = G.NAV.filter(n => G.SKILL_PAGES[n]);
ok(navSkills.length === 7, 'NAV 含 7 个技艺页入口（实际 ' + navSkills.length + '）');
for (const n of navSkills) {
  const sp = G.SKILL_PAGES[n];
  // 技艺页（type:'skill'）走 actions；采集页（type:'gather'）用采集数据表，无 actions
  if (sp.type === 'gather') {
    ok(sp && sp.skill, 'SKILL_PAGES[' + n + '] 采集页结构完整');
  } else {
    ok(sp && sp.skill && Array.isArray(sp.actions), 'SKILL_PAGES[' + n + '] 技艺页结构完整');
    for (const ak of sp.actions) ok(!!G.ACTIONS[ak], '动作 ' + ak + '（' + n + '）存在于 ACTIONS');
  }
}

// 3) 每个 ACTIONS 的 skill 都在 defaultPlayer.skills 中
const dp = G.defaultPlayer();
const skillKeys = new Set();
for (const k in G.ACTIONS) skillKeys.add(G.ACTIONS[k].skill);
for (const sk of skillKeys) ok(!!dp.skills[sk], '技能 ' + sk + ' 在 defaultPlayer.skills 中有默认档');
ok(dp.skills && Object.keys(dp.skills).length === 13, 'defaultPlayer 含 13 个技艺（实际 ' + Object.keys(dp.skills).length + '）');
ok(dp.inventory && dp.inventory.stacks &&
  !Object.prototype.hasOwnProperty.call(dp, 'items') &&
  !Object.prototype.hasOwnProperty.call(dp, 'dan') &&
  !Object.prototype.hasOwnProperty.call(dp, 'bag') &&
  !Object.prototype.hasOwnProperty.call(dp, 'spots') &&
  !Object.prototype.hasOwnProperty.call(dp, 'fishing'),
  'player only owns canonical inventory and gathering lives in systems');

// 4) 资源齐全：9 类采集/转化产物默认 0
const needItems = ['yaocai','lingkuang','muliao','shicai','faqi','hujia','shanshi','fu','caiqing'];
for (const it of needItems) {
  ok(it in dp.inventory.stacks, 'defaultPlayer.inventory.stacks 含 ' + it);
}

// 5) resName 覆盖所有资源/丹药
for (const it of needItems.concat(['tupo','heal','jindan','yuanying','huashen','lianxu','heti','dasheng']))
  ok(G.resName(it) !== it, 'resName(' + it + ') 有中文名 → ' + G.resName(it));

// 6) 资源转化链路：采灵草→药材→炼筑基丹→筑基丹
G.state.player = G.defaultPlayer();
G.state.current = null;
G.setCurrent('caiyao', 5);
advanceSeconds(5 * 3 + 1);   // 5 次 × 3s + 余量
ok(G.state.player.inventory.stacks.yaocai === 10, '采灵草×5 → 药材+10（实际 ' + G.state.player.inventory.stacks.yaocai + '）');
G.setCurrent('liandan_tupo', 2);
advanceSeconds(2 * 8 + 1);   // 2 次 × 8s
ok(G.state.player.inventory.stacks.tupo === 2, '炼筑基丹×2 → 筑基丹+2（实际 ' + G.state.player.inventory.stacks.tupo + '）');
ok(G.state.player.inventory.stacks.yaocai === 0, '炼丹消耗药材 10（实际 ' + G.state.player.inventory.stacks.yaocai + '）');

// 7) 等级门槛：采灵芝 needLv20，lv1 不可设；升到 20 后可设
G.state.player = G.defaultPlayer();
G.state.current = null;
G.setCurrent('caiyao2', 1);
ok(G.state.current === null, 'lv1 时采灵芝(needLv20) 被拦截，未设为当前动作');
// 灌 XP 到 caiyao Lv20
let guard = 0;
while (G.state.player.skills.caiyao.lv < 20 && guard < 5000) { G.addSkillXp(G.state.player, 'caiyao', 100); guard++; }
ok(G.state.player.skills.caiyao.lv >= 20, 'caiyao 已升至 Lv' + G.state.player.skills.caiyao.lv);
G.setCurrent('caiyao2', 1);
ok(G.state.current && (G.state.current && G.state.current.key) === 'caiyao2', '达到等级后采灵芝可设为当前动作');

// 8) ensurePlayer 兼容旧档：缺技能自动补默认
const oldSave = {
  realmStage: 3,
  xiwei: 50,
  inventory: { stacks: { yaocai: 3 } }
};
const merged = G.ensurePlayer(oldSave);
ok(merged.skills && merged.skills.caiyao && merged.skills.caiju, 'ensurePlayer 为旧档补齐缺失技艺');
ok(merged.inventory.stacks.muliao === 0, 'ensurePlayer 为规范档补齐缺失资源字段');
ok(merged.shouMax === G.REALM_TABLE[3].shou, 'ensurePlayer 按 realmStage 推导 shouMax');

// 9) addSkillXp 升级 + 跨级
G.state.player = G.defaultPlayer();
const before = G.state.player.skills.tuna.lv;
for (let i = 0; i < 30; i++) G.addSkillXp(G.state.player, 'tuna', 50);
ok(G.state.player.skills.tuna.lv > before, 'tuna 通过 XP 升级（Lv' + before + ' → Lv' + G.state.player.skills.tuna.lv + '）');

// 10) 当前渲染入口由 UI 层消费 GameAPI；旧 canvas 私有绘制函数不再暴露。
G.state.player = G.defaultPlayer();
G.state.current = { key: 'liandan_tupo', count: 5, done: 0, elapsed: 1.2, stalled: false };
ok(!G.drawHome && !G.drawSkillPage,
  'legacy canvas draw helpers are not exposed through the game harness');
ok(API && API.queries && API.commands && API.render,
  'GameAPI exposes the current query/command/render boundary');
// navIndexOfAction 映射正确（动作 → 所属技艺页索引）
ok(G.navIndexOfAction('liandan_tupo') === G.NAV.indexOf('炼丹'), 'navIndexOfAction(liandan_tupo) → 炼丹页');

// 11) 梅尔沃式行为卡的数据路由仍保持：炼丹页 action 归属正确。
G.state.player = G.defaultPlayer();   // 默认全 Lv1
G.state.current = { key: 'liandan_tupo', count: 5, done: 0, elapsed: 1.2, stalled: false };
ok(G.SKILL_PAGES['炼丹'].actions.includes('liandan_tupo'),
  '炼丹页包含旧兼容筑基丹动作');
ok(G.navIndexOfAction('liandan_jindan') === G.NAV.indexOf('炼丹'),
  '炼金丹动作仍路由到炼丹页');

// 12) 突破弹窗（替代独立页签）：showBreak 触发绘制 + NAV 已移除冗余页签
G.state.player = G.defaultPlayer();
G.state.current = null;
G.setShowBreak(true);
ok(G.getShowBreak() === true, '顶栏突破按钮 → showBreak=true（弹出弹窗，不再进独立页签）');
try { G.drawBreakModal(); ok(true, 'drawBreakModal 渲染无异常'); }
catch (e) { ok(false, 'drawBreakModal 抛异常: ' + e.message); }
ok(G.NAV.indexOf('突破') === -1, 'NAV 已移除独立「突破」页签');
ok(G.NAV.indexOf('放置') === -1, 'NAV 已移除统一「放置」页签（消除多页重复执行）');

// 13) 选中行为循环执行：切换前一直做，不会自动停（梅尔沃式·一次只挂一件）
G.setShowBreak(false);
G.state.player = G.defaultPlayer();
G.state.current = null;
G.setCurrent('tuna');   // 不设次数 → 无限循环
ok(G.state.current && G.state.current.mode === 'repeat', 'setCurrent uses repeat mode');
ok(
  !!G.state.current && Number.isFinite((G.state.current && G.state.current.count)),
  'repeat action state is JSON-safe'
);
if (G.state.current) {
  const xiwei0 = G.state.player.xiwei;
  advanceSeconds(100);     // 一次性推进 100s（≈20 次打坐）
  ok(G.state.player.xiwei > xiwei0, '循环执行持续产出修为（实际 +' + (G.state.player.xiwei - xiwei0) + '）');
  ok(G.state.current !== null, '循环执行未因 done>=count 而自动清空');
} else {
  ok(false, '循环执行持续产出修为（实际 +0）');
  ok(false, '循环执行未因 done>=count 而自动清空');
}

// 14) 探索是有限动作，循环采集/生产是 JSON 安全的重复动作
G.state.player = G.defaultPlayer();
G.state.current = null;
G.setCurrent('gather:explore:herb');
ok(
  G.state.current &&
    G.state.current.mode === 'finite' &&
    (G.state.current && G.state.current.count) === 1,
  'resource exploration uses one finite action'
);

// 15) 离线采集报告只记录本次新增，不把历史 done 重复并入
G.state.player = G.defaultPlayer();
const herbEntry = G.GATHERING_DATA.herb.entries[0];
const herbKey = 'gather:herb:' + herbEntry.id;
G.state.systems.gathering.spots.herb = { id: herbEntry.id, cap: 100, left: 100 };
G.state.current = {
  key: herbKey,
  mode: 'repeat',
  count: 0,
  done: 7,
  elapsed: 0,
  stalled: false
};
const herbOfflineSeconds = Math.max(30, herbEntry.time * 2);
const herbOfflineReport = advanceSeconds(
  herbOfflineSeconds,
  'offline',
  12 * 3600
);
ok(
  herbOfflineReport &&
    herbOfflineReport.action.completed ===
      Math.floor(herbOfflineSeconds / herbEntry.time),
  'offline gathering report contains only newly-earned iterations'
);
G.state.player = G.defaultPlayer();
G.state.player.inventory.stacks.yaocai = 5;
G.state.current = {
  key: 'liandan_tupo',
  mode: 'repeat',
  count: 0,
  done: 4,
  elapsed: 0,
  stalled: false
};
const limitedProductionReport = advanceSeconds(100, 'offline', 12 * 3600);
ok(
  limitedProductionReport &&
    limitedProductionReport.action.completed === 1,
  'offline production report counts completed work after material limits'
);

G.state.player = G.defaultPlayer();
G.state.player.shouyuan = null;
G.state.player.shouMax = null;
G.state.current = {
  key: 'tuna',
  mode: 'repeat',
  count: 0,
  done: 0,
  elapsed: 0,
  stalled: false
};
G.state.offlineLimitSeconds = 12 * 3600;
G.state.systems.homestead.farm.plots = [{
  id: 'long-farm',
  remainingSeconds: 50000
}];
G.state.systems.parallel.jobs = [{
  id: 'long-parallel',
  remainingSeconds: 60000
}];
G.state.systems.world.tickAccumulator = 0;
const longOfflineReport = advanceSeconds(
  20 * 3600,
  'offline',
  12 * 3600
);
ok(
  longOfflineReport &&
    longOfflineReport.action.completed === 8640 &&
    (G.state.current && G.state.current.done) === 8640,
  'twenty-hour offline main action respects the twelve-hour cap'
);
ok(
  G.state.systems.homestead.farm.plots.length === 0 &&
    G.state.systems.parallel.jobs.length === 0 &&
    G.state.systems.world.tickAccumulator === 0,
  'twenty-hour passive lanes receive the full elapsed duration'
);
ok(
  longOfflineReport &&
    longOfflineReport.requestedSeconds === 20 * 3600 &&
    longOfflineReport.mainActionSeconds === 12 * 3600 &&
    longOfflineReport.cappedSeconds === 8 * 3600 &&
    longOfflineReport.passive.farmCompleted.includes('long-farm') &&
    longOfflineReport.passive.parallelCompleted.includes('long-parallel') &&
    longOfflineReport.world.ticks === 240,
  'twenty-hour report records capped main time and complete passive work'
);

// Task 6：真实 game runtime 必须让在线分帧与离线整段走同一模拟入口。
ok(
  G.__test &&
    typeof G.__test.snapshotModel === 'function' &&
    typeof G.__test.replaceModel === 'function' &&
    typeof G.__test.advanceRuntime === 'function',
  'runtime exposes a Node-only unified advancement test seam'
);
if (G.__test && typeof G.__test.advanceRuntime === 'function') {
  const integrationModel = G.__test.snapshotModel();
  integrationModel.created = true;
  integrationModel.player = G.defaultPlayer();
  integrationModel.player.shouyuan = null;
  integrationModel.player.shouMax = null;
  integrationModel.current = {
    key: 'tuna',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    stalled: false
  };
  integrationModel.processedThroughMs = 0;
  integrationModel.systems.world.tickAccumulator = 0;

  G.__test.replaceModel(JSON.parse(JSON.stringify(integrationModel)));
  for (let i = 0; i < 400; i++) {
    G.__test.advanceRuntime(i * 250, (i + 1) * 250, 'online', null);
  }
  const onlineState = G.__test.snapshotModel();

  G.__test.replaceModel(JSON.parse(JSON.stringify(integrationModel)));
  G.__test.advanceRuntime(0, 100000, 'offline', 12 * 3600);
  const offlineState = G.__test.snapshotModel();

  ok(
    JSON.stringify(onlineState) === JSON.stringify(offlineState),
    'real current action has identical online/offline result'
  );

  G.__test.replaceModel(JSON.parse(JSON.stringify(integrationModel)));
  G.state.player.shouyuan = 120;
  G.state.player.shouMax = 120;
  const startAccumulator =
    G.state.systems.world.tickAccumulator;
  const startLifespan = G.state.player.shouyuan;
  const twentyHourReport = G.__test.advanceRuntime(
    0,
    20 * 3600 * 1000,
    'offline',
    12 * 3600
  );
  ok(
    twentyHourReport.mainActionSeconds === 12 * 3600,
    'main action uses 12 hour offline cap'
  );
  ok(
    G.state.systems.world.tickAccumulator !== startAccumulator ||
      twentyHourReport.world.ticks > 0,
    'world lane advances full 20 hours'
  );
  ok(
    G.state.player.shouyuan < startLifespan,
    'lifespan advances for full offline duration'
  );
}

// Task 6：启动离线事务先落盘完整报告，并按 processedThroughMs 幂等。
ok(
  G.__test && typeof G.__test.settleStartupOffline === 'function',
  'runtime exposes a Node-only startup settlement test seam'
);
if (G.__test && typeof G.__test.settleStartupOffline === 'function') {
  const snapshotAt0 = sandbox.SaveSystem.createSnapshot({
    created: true,
    appearance: { parts: G.state.parts },
    player: G.defaultPlayer(),
    current: {
      key: 'tuna',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      stalled: false
    },
    rngState: 123456789,
    processedThroughMs: 0
  }, 0);
  store.cloud_save_v1 = JSON.stringify(snapshotAt0);
  saveMode = 'ok';
  const firstOpen = G.__test.settleStartupOffline(snapshotAt0, 60000);
  const savedAfterFirst = firstOpen.snapshot;
  const secondOpen = G.__test.settleStartupOffline(savedAfterFirst, 60000);
  const persistedOpen = JSON.parse(store.cloud_save_v1);
  ok(
    firstOpen.newReports.length === 1 &&
      persistedOpen.processedThroughMs === 60000 &&
      persistedOpen.pendingOfflineReport.reports.length === 1,
    'processed-through watermark and one report persist before offline modal'
  );
  ok(
    secondOpen.newReports.length === 0,
    'reopening at the same watermark does not replay offline settlement'
  );
  ok(
    secondOpen.state.pendingOfflineReports.length === 1,
    'pending report remains visible without duplication'
  );
}

// Task 6：帧率不决定保存频率；弹窗不暂停统一时钟，写失败则锁住固定候选。
ok(
  G.__test &&
    typeof G.__test.runRuntimeFrame === 'function' &&
    typeof G.__test.handleVisibilityChange === 'function' &&
    typeof G.__test.flushLifecycle === 'function',
  'runtime exposes Node-only clock and lifecycle test seams'
);
if (G.__test && typeof G.__test.runRuntimeFrame === 'function') {
  const clockModel = sandbox.StateModel.normalize({
    created: true,
    appearance: { parts: G.state.parts },
    player: G.defaultPlayer(),
    current: {
      key: 'tuna',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      stalled: false
    },
    rngState: 123456789,
    processedThroughMs: 0
  }, 0);
  G.__test.replaceModel(clockModel);
  G.state._last = 0;
  G.state._hiddenAt = null;
  G.state._nextAutosaveAt = 30000;
  G.state.showBreak = true;
  saveMode = 'ok';
  const autosavesBefore = primarySaveAttempts;
  for (let frame = 1; frame <= 90; frame++) {
    G.__test.runRuntimeFrame(frame * 1000);
  }
  ok(
    primarySaveAttempts - autosavesBefore === 3 &&
      G.state.processedThroughMs === 90000 &&
      JSON.parse(store.cloud_save_v1).processedThroughMs === 90000,
    'ninety seconds online autosaves three times independent of frame rate'
  );
  ok(
    G.state.current && (G.state.current && G.state.current.done) === 18,
    'modal state does not pause online advancement'
  );

  G.__test.replaceModel(clockModel);
  G.state._last = 0;
  G.state._hiddenAt = null;
  G.state._nextAutosaveAt = 30000;
  G.state.showBreak = false;
  saveMode = 'false';
  const committedBeforeAutosaveFailure = store.cloud_save_v1;
  G.__test.runRuntimeFrame(30000);
  const heldAfterAutosave = JSON.stringify(G.__test.snapshotModel());
  const recoveryView = G.__test.recoverySnapshot();
  G.__test.runRuntimeFrame(60000);
  ok(
    G.queries.persistence().locked === true &&
      G.queries.persistence().kind === 'save' &&
      JSON.stringify(G.__test.snapshotModel()) === heldAfterAutosave,
    'failed periodic save freezes the exact advanced model'
  );
  ok(
    recoveryView &&
      recoveryView.kind === 'save' &&
      !Object.values(recoveryView).some((value) => typeof value === 'function') &&
      !Object.prototype.hasOwnProperty.call(recoveryView, 'candidate') &&
      !Object.prototype.hasOwnProperty.call(recoveryView, 'adapter'),
    'recovery snapshot is detached and redacted'
  );
  saveMode = 'ok';
  ok(
    G.persist(60000) === false &&
      store.cloud_save_v1 === committedBeforeAutosaveFailure &&
      G.commands.retryPersistence() === true &&
      JSON.parse(store.cloud_save_v1).processedThroughMs === 30000,
    'only dedicated retry commits the held autosave candidate'
  );

  const watermarkModel = sandbox.StateModel.normalize(clockModel, 10000);
  watermarkModel.processedThroughMs = 10000;
  G.__test.replaceModel(watermarkModel);
  saveMode = 'ok';
  G.persist(20000);
  const watermarkSnapshot = JSON.parse(store.cloud_save_v1);
  ok(
    watermarkSnapshot.savedAt === 20000 &&
      watermarkSnapshot.processedThroughMs === 10000,
    'generic persistence never claims unsimulated time as processed'
  );
}

// Task 6：隐藏先补在线段，恢复只结算隐藏段，rAF/pagehide 不得双算。
if (G.__test && typeof G.__test.handleVisibilityChange === 'function') {
  const lifecycleModel = sandbox.StateModel.normalize({
    created: true,
    appearance: { parts: G.state.parts },
    player: G.defaultPlayer(),
    current: {
      key: 'tuna',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      stalled: false
    },
    rngState: 246813579,
    processedThroughMs: 0
  }, 0);
  G.__test.replaceModel(lifecycleModel);
  G.state._last = 0;
  G.state._hiddenAt = null;
  G.state._nextAutosaveAt = 999999;
  saveMode = 'ok';
  ok(
    G.__test.handleVisibilityChange(true, 10000) === true &&
      G.state.processedThroughMs === 10000,
    'hiding advances and persists the visible interval first'
  );
  const hiddenDone = G.state.current ? (G.state.current && G.state.current.done) : null;
  G.__test.runRuntimeFrame(40000);
  G.__test.flushLifecycle(50000);
  ok(
    G.state.current != null && (G.state.current && G.state.current.done) === hiddenDone,
    'hidden rAF and page lifecycle flush do not double-count hidden time'
  );
  const firstVisible = G.__test.handleVisibilityChange(false, 70000);
  ok(
    firstVisible === true &&
      G.state.processedThroughMs === 70000 &&
      G.state.pendingOfflineReports.length === 1 &&
      G.state.showOffline === true,
    'showing settles and persists exactly the hidden interval'
  );
  const firstResumeDone = G.state.current ? (G.state.current && G.state.current.done) : 0;
  G.__test.handleVisibilityChange(true, 80000);
  G.__test.handleVisibilityChange(false, 90000);
  ok(
    G.state.current != null &&
      (G.state.current && G.state.current.done) - firstResumeDone === 4 &&
      G.state.pendingOfflineReports.length === 2,
    'two hide-resume cycles neither lose nor duplicate time'
  );
}

// Task 6：报告领取先提交，再从 pending 唯一移动到有限归档。
ok(
  G.__test && typeof G.__test.acknowledgeOffline === 'function',
  'runtime exposes a Node-only acknowledgement test seam'
);
if (G.__test && typeof G.__test.acknowledgeOffline === 'function') {
  const reportToArchive = G.state.pendingOfflineReports[0];
  const firstAck = G.__test.acknowledgeOffline([reportToArchive.id]);
  const repeatedAck = G.__test.acknowledgeOffline([reportToArchive.id]);
  ok(
    firstAck.ok === true &&
      firstAck.changed === true &&
      G.state.reportArchive.filter(
        (report) => report.id === reportToArchive.id
      ).length === 1,
    'acknowledgement archives the selected report exactly once'
  );
  ok(
    repeatedAck.ok === true &&
      repeatedAck.code === 'no_change' &&
      repeatedAck.changed === false &&
      G.state.reportArchive.filter(
        (report) => report.id === reportToArchive.id
      ).length === 1,
    'repeated acknowledgement is idempotent'
  );
}

// 恢复段写失败时保持隐藏 checkpoint，只有专用重试才应用同一候选。
if (G.__test && typeof G.__test.handleVisibilityChange === 'function') {
  const resumeFailureModel = sandbox.StateModel.normalize({
    created: true,
    appearance: { parts: G.state.parts },
    player: G.defaultPlayer(),
    current: {
      key: 'tuna',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      stalled: false
    },
    rngState: 112233445,
    processedThroughMs: 0
  }, 0);
  G.__test.replaceModel(resumeFailureModel);
  G.state._last = 0;
  G.state._hiddenAt = null;
  G.state._nextAutosaveAt = 999999;
  saveMode = 'ok';
  G.__test.handleVisibilityChange(true, 10000);
  saveMode = 'false';
  const failedResume = G.__test.handleVisibilityChange(false, 70000);
  const failedResumeState = JSON.stringify(G.__test.snapshotModel());
  const failedResumeRecovery = G.__test.recoverySnapshot();
  G.__test.runRuntimeFrame(90000);
  ok(
    failedResume === false &&
      G.queries.persistence().kind === 'offline' &&
      G.state.processedThroughMs === 10000 &&
      G.state.pendingOfflineReports.length === 0 &&
      JSON.stringify(G.__test.snapshotModel()) === failedResumeState,
    'failed resume keeps the original checkpoint and freezes later frames'
  );
  ok(
    failedResumeRecovery &&
      failedResumeRecovery.candidateSummary.processedThroughMs === 70000 &&
      failedResumeRecovery.candidateSummary.pendingReportCount === 1,
    'offline recovery status summarizes the failed result candidate'
  );
  saveMode = 'ok';
  ok(
    G.commands.retryPersistence() === true &&
      G.state.processedThroughMs === 70000 &&
      G.state.pendingOfflineReports.length === 1,
    'resume retry commits the original interval exactly once'
  );
}

// Task 6：时钟回拨不重放未来区间，并持久化可见 warning。
if (G.__test && typeof G.__test.settleStartupOffline === 'function') {
  const rollbackSnapshot = sandbox.SaveSystem.createSnapshot({
    created: true,
    appearance: { parts: G.state.parts },
    player: G.defaultPlayer(),
    current: {
      key: 'tuna',
      mode: 'repeat',
      count: 0,
      done: 24,
      elapsed: 0,
      stalled: false
    },
    rngState: 987654321,
    processedThroughMs: 120000
  }, 120000);
  store.cloud_save_v1 = JSON.stringify(rollbackSnapshot);
  saveMode = 'ok';
  const rollbackResult = G.__test.settleStartupOffline(
    rollbackSnapshot,
    60000
  );
  ok(
    rollbackResult.report &&
      rollbackResult.report.warnings.includes('clock_rollback') &&
      rollbackResult.state.processedThroughMs === 120000,
    'clock rollback preserves the durable watermark and records a warning'
  );
  const rollbackDone = (G.state.current && G.state.current.done);
  const rollbackRng = G.state.rngState;
  G.state._last = 60000;
  G.state._nextAutosaveAt = 999999;
  G.__test.runRuntimeFrame(90000);
  G.__test.runRuntimeFrame(120000);
  ok(
    G.state.processedThroughMs === 120000 &&
      (G.state.current && G.state.current.done) === rollbackDone &&
      G.state.rngState === rollbackRng,
    'clock rollback freezes gameplay until wall time catches the watermark'
  );
}

// 16) 随机状态写入单一版本化快照并可继续推进
G.state.rngState = 123456789;
const randomBefore = G.state.rngState;
const randomValue = G.gameRandom && G.gameRandom();
ok(
  typeof randomValue === 'number' && G.state.rngState !== randomBefore,
  'gameplay randomness advances the saved RNG state'
);
ok(G.persist(43210) === true, 'runtime snapshot persistence reports success');
const runtimeSnapshot = store.cloud_save_v1 ? JSON.parse(store.cloud_save_v1) : null;
ok(
  runtimeSnapshot &&
    runtimeSnapshot.schemaVersion === 5 &&
    runtimeSnapshot.rngState === G.state.rngState,
  'runtime snapshot persists the advanced RNG state'
);
// 17) 离线结算保存失败时回滚全部可变状态，并允许安全重试
G.state.created = true;
G.state.player = G.defaultPlayer();
G.state.player.xiwei = G.REALM_TABLE[0].need;
G.state.current = {
  key: 'tuna',
  mode: 'repeat',
  count: 0,
  done: 4,
  elapsed: 1,
  stalled: false
};
G.state.rngState = 246813579;
G.state.systems.gathering.fishRecoverAcc = 7;
G.state.offlineResult = null;
G.state.pendingOfflineReports = [];
G.state.reportArchive = [];
G.state.showOffline = false;
G.state._offlineSec = 0;
G.__test.replaceModel(G.__test.snapshotModel());
function failedOfflineCheckpointJson() {
  const model = G.__test.snapshotModel();
  return JSON.stringify({
    player: model.player,
    current: model.current,
    rngState: model.rngState,
    fishRecoverAcc: model.systems.gathering.fishRecoverAcc,
    offlineResult: G.state.offlineResult,
    showOffline: G.state.showOffline,
    offlineSec: G.state._offlineSec
  });
}
const beforeFailedOffline = failedOfflineCheckpointJson();
saveMode = 'false';
const failedOfflineModel = G.__test.snapshotModel();
failedOfflineModel.processedThroughMs = 0;
const failedOffline = G.__test.settleStartupOffline(
  failedOfflineModel,
  60000
).ok;
ok(failedOffline === false, 'offline settlement reports a false save result');
const afterFailedOffline = failedOfflineCheckpointJson();
ok(
  afterFailedOffline === beforeFailedOffline,
  'failed offline settlement restores player/action/random/fishing/report state'
);
ok(
  G.getToastMessage().indexOf('保存失败') >= 0,
  'failed offline settlement gives explicit feedback'
);
const failedOfflineStatus = G.queries.persistence &&
  G.queries.persistence();
ok(
  failedOfflineStatus &&
    failedOfflineStatus.locked === true &&
    failedOfflineStatus.kind === 'offline' &&
    failedOfflineStatus.savedAt === 0 &&
    failedOfflineStatus.now === 60000,
  'failed offline settlement exposes the exact retry interval'
);
try {
const lockedActionSnapshot = JSON.stringify({
  player: G.state.player,
  current: G.state.current,
  rngState: G.state.rngState,
  fishRecoverAcc: G.state.systems.gathering.fishRecoverAcc
});
advanceSeconds(120);
ok(
  JSON.stringify({
    player: G.state.player,
    current: G.state.current,
    rngState: G.state.rngState,
    fishRecoverAcc: G.state.systems.gathering.fishRecoverAcc
  }) === lockedActionSnapshot,
  'persistence lock pauses current action progress'
);
const lockedCommandsSnapshot = JSON.stringify({
  player: G.state.player,
  current: G.state.current,
  parts: G.state.parts,
  rngState: G.state.rngState,
  created: G.state.created
});
G.setCurrent('lianqi');
G.randomize();
G.stepPart('hair', 1);
G.tryBreakthrough();
G.enterLunhui();
G.confirmCreate();
ok(
  JSON.stringify({
    player: G.state.player,
    current: G.state.current,
    parts: G.state.parts,
    rngState: G.state.rngState,
    created: G.state.created
  }) === lockedCommandsSnapshot,
  'persistence lock blocks progress-changing and irreversible commands'
);
const committedBeforeBlockedPersist = store.cloud_save_v1;
saveMode = 'ok';
ok(
  G.persist(60001) === false,
  'generic persistence stays blocked after an uncommitted offline settlement'
);
ok(
  store.cloud_save_v1 === committedBeforeBlockedPersist,
  'blocked persistence preserves the old timestamp for restart retry'
);
saveMode = 'throw';
const thrownOffline = G.commands.retryPersistence &&
  G.commands.retryPersistence();
ok(thrownOffline === false, 'offline settlement contains thrown storage errors');
ok(
  failedOfflineCheckpointJson() === beforeFailedOffline,
  'thrown offline save restores the same checkpoint'
);
saveMode = 'ok';
ok(
  G.commands.retryPersistence &&
    G.commands.retryPersistence() === true,
  'offline settlement can retry once storage recovers'
);
ok(
  G.queries.persistence &&
    G.queries.persistence().locked === false,
  'successful offline retry clears the persistence lock'
);
ok(
  G.state.pendingOfflineReports.length === 1 &&
    G.state.pendingOfflineReports[0].action.key === 'tuna' &&
    G.state.pendingOfflineReports[0].action.completed > 0 &&
    G.state.player.xiwei > 0,
  'successful retry applies one committed offline settlement'
);
const committedXiwei = G.state.player.xiwei;
const committedDone = (G.state.current && G.state.current.done);
ok(
  settleCurrentModel(60000).ok === true &&
    G.state.player.xiwei === committedXiwei &&
    (G.state.current && G.state.current.done) === committedDone,
  'repeating the same in-memory settlement cannot duplicate rewards'
);

// 18) 短离线区间也按统一规则完成整轮并保留余数
G.state.player = G.defaultPlayer();
G.state.current = {
  key: 'tuna',
  mode: 'repeat',
  count: 0,
  done: 0,
  elapsed: 2,
  stalled: false
};
const shortOfflineReport = advanceSeconds(29, 'offline', 12 * 3600);
ok(shortOfflineReport &&
    shortOfflineReport.action.completed === 6,
  'short offline progress reports every completed iteration');
ok(
  G.state.current.elapsed === 1,
  'short offline progress retains only the unfinished remainder'
);

G.state.created = true;
G.state.player = G.defaultPlayer();
G.state.current = {
  key: 'tuna',
  mode: 'repeat',
  count: 0,
  done: 0,
  elapsed: 3,
  stalled: false
};
G.state.offlineResult = null;
G.state.pendingOfflineReports = [];
G.state.showOffline = false;
saveMode = 'ok';
G.state.processedThroughMs = 100000;
G.persist(100000);
ok(settleCurrentModel(120000).ok === true, 'short offline interval commits');
let shortOfflineSnapshot = JSON.parse(store.cloud_save_v1);
ok(
  G.state.current.elapsed === 3 &&
    shortOfflineSnapshot.savedAt === 120000 &&
    shortOfflineSnapshot.current.elapsed === 3,
  'short offline interval advances timestamp and resolves full iterations'
);

G.state.current.elapsed = 0;
G.state.processedThroughMs = 130000;
G.persist(130000);
ok(settleCurrentModel(150000).ok === true, 'pending report accepts short new progress');
shortOfflineSnapshot = JSON.parse(store.cloud_save_v1);
ok(
  shortOfflineSnapshot.pendingOfflineReport.version === 1 &&
    shortOfflineSnapshot.pendingOfflineReport.reports.length === 2 &&
    new Set(
      shortOfflineSnapshot.pendingOfflineReport.reports.map(
        (report) => report.id
      )
    ).size === 2 &&
    shortOfflineSnapshot.current.elapsed === 0 &&
    shortOfflineSnapshot.savedAt === 150000,
  'saving pending reports appends one uniquely identified interval'
);

const beforeShortFailure = JSON.stringify({
  player: G.state.player,
  current: G.state.current,
  pendingOfflineReports: G.state.pendingOfflineReports,
  showOffline: G.state.showOffline,
  offlineSec: G.state._offlineSec
});
saveMode = 'false';
ok(settleCurrentModel(170000).ok === false, 'short interval reports save failure');
ok(
  JSON.stringify({
    player: G.state.player,
    current: G.state.current,
    pendingOfflineReports: G.state.pendingOfflineReports,
    showOffline: G.state.showOffline,
    offlineSec: G.state._offlineSec
  }) === beforeShortFailure,
  'failed short interval commit restores partial progress and pending report'
);
saveMode = 'ok';
ok(
  settleCurrentModel(170000).ok === false &&
    G.commands.retryPersistence() === true,
  'short interval transaction only resumes through its dedicated retry'
);

G.state.created = true;
G.state.player = G.defaultPlayer();
G.state.player.mood = 0;
G.state.current = null;
G.state.offlineResult = null;
G.state.pendingOfflineReports = [];
G.state.showOffline = false;
G.state.systems.world.tickAccumulator = 0;
G.state.processedThroughMs = 200000;
G.persist(200000);
ok(
  settleCurrentModel(210000).ok === true,
  'passive-only offline interval commits without a main action'
);
const passiveOnlySnapshot = JSON.parse(store.cloud_save_v1);
ok(
  passiveOnlySnapshot.savedAt === 210000 &&
    passiveOnlySnapshot.player.mood > 0 &&
    passiveOnlySnapshot.systems.world.tickAccumulator === 10,
  'passive-only offline progress is persisted at the new watermark'
);

// 19) 关闭报告只有在清除状态成功写入后才生效
const closeReport = G.__test.advanceRuntime(
  G.state.processedThroughMs,
  G.state.processedThroughMs + 5000,
  'offline',
  5
);
G.state.pendingOfflineReports = sandbox.SimulationReport.addPending(
  [],
  closeReport
);
G.state.showOffline = true;
G.state.offlineResult = null;
saveMode = 'ok';
G.persist(70000);
const pendingBeforeClose = store.cloud_save_v1;
const pendingCloseId = G.state.pendingOfflineReports[0].id;
saveMode = 'false';
ok(G.closeOffline() === false, 'closeOffline reports a failed write');
ok(
  G.state.showOffline === true &&
    G.state.pendingOfflineReports.length === 1 &&
    G.state.pendingOfflineReports[0].id === pendingCloseId &&
    store.cloud_save_v1 === pendingBeforeClose,
  'failed close keeps the report visible and the committed snapshot unchanged'
);
saveMode = 'throw';
ok(
  G.commands.retryPersistence() === false,
  'closeOffline retry contains thrown storage errors'
);
ok(
  G.state.showOffline === true &&
    G.state.pendingOfflineReports.length === 1 &&
    G.state.pendingOfflineReports[0].id === pendingCloseId,
  'thrown close restores the pending report'
);
saveMode = 'ok';
ok(
  G.closeOffline() === false,
  'ordinary closeOffline stays locked after a failed report commit'
);
ok(
  G.commands.retryPersistence() === true,
  'closeOffline succeeds only through the explicit persistence retry'
);
ok(
  G.state.showOffline === false &&
    G.state.pendingOfflineReports.length === 0 &&
    G.state.reportArchive.filter(
      (report) => report.id === pendingCloseId
    ).length === 1 &&
    JSON.parse(store.cloud_save_v1).pendingOfflineReport.version === 1 &&
    JSON.parse(store.cloud_save_v1).pendingOfflineReport.reports.length === 0,
  'successful close clears memory and persisted pending report'
);

// 20) 飞升寿元使用 JSON-safe 的 null 哨兵并可稳定往返
const ascendedInput = G.defaultPlayer();
ascendedInput.realmStage = G.REALM_TABLE.length - 1;
ascendedInput.shouyuan = Infinity;
ascendedInput.shouMax = Infinity;
const ascended = G.ensurePlayer(ascendedInput);
ok(
  ascended.shouyuan === null && ascended.shouMax === null,
  'ascended lifespan normalizes to the immortal null sentinel'
);
G.state.player = ascended;
G.state.current = null;
G.state.offlineResult = null;
saveMode = 'ok';
ok(G.persist(80000) === true, 'ascended player snapshot saves successfully');
const ascendedSnapshot = JSON.parse(store.cloud_save_v1);
ok(
  ascendedSnapshot.player.shouyuan === null &&
    ascendedSnapshot.player.shouMax === null,
  'ascended lifespan persists without Infinity coercion'
);
const ascendedRoundTrip = G.ensurePlayer(ascendedSnapshot.player);
ok(
  ascendedRoundTrip.shouyuan === null &&
    ascendedRoundTrip.shouMax === null,
  'ascended lifespan survives save and load'
);

// 21) 探索结果只生成一次，保存失败后持有同一结果重试
G.state.created = true;
G.state.player = G.defaultPlayer();
G.state.systems.gathering.spots = {};
G.state.current = {
  key: 'tuna',
  mode: 'repeat',
  count: 0,
  done: 2,
  elapsed: 0,
  stalled: false
};
G.state.rngState = 135792468;
G.state.offlineResult = null;
saveMode = 'ok';
G.persist(89000);
const actionBeforeExplore = JSON.stringify(G.state.current);
const committedBeforeExplore = store.cloud_save_v1;
saveMode = 'false';
G.setCurrent('gather:explore:herb');
ok(
  JSON.stringify(G.state.current) === actionBeforeExplore &&
    store.cloud_save_v1 === committedBeforeExplore,
  'explore does not replace the current action unless its finite action saves'
);
ok(
  G.getToastMessage().indexOf('保存失败') >= 0,
  'failed explore start gives explicit feedback'
);
saveMode = 'ok';
ok(
  G.commands.retryPersistence() === true &&
    G.queries.persistence().locked === false,
  'failed explore start unlocks through the explicit retry path'
);
G.setCurrent('gather:explore:herb');
ok(
  JSON.parse(store.cloud_save_v1).current.key === 'gather:explore:herb',
  'explore action is committed before result generation'
);
const preExploreSnapshot = JSON.parse(store.cloud_save_v1);
saveMode = 'false';
const exploreWritesBeforeFailure = saveAttempts;
advanceSeconds(2.1);
const failedExploreSpot = G.state.systems.gathering.spots.herb
  ? JSON.stringify(G.state.systems.gathering.spots.herb)
  : null;
const failedExploreRng = G.state.rngState;
ok(
  !!failedExploreSpot &&
    G.state.current &&
    G.state.current.mode === 'repeat' &&
    (G.state.current && G.state.current.done) >= 1 &&
    G.state.current.stalled === true,
  'failed explore save keeps completed discovery pending for retry'
);
ok(
  JSON.parse(store.cloud_save_v1).current.key === 'gather:explore:herb',
  'failed explore save leaves the committed pre-explore action intact'
);
ok(
  G.getToastMessage().indexOf('保存失败') >= 0,
  'failed explore save gives explicit feedback'
);
for (let frame = 0; frame < 120; frame++) advanceSeconds(0.1);
ok(
  saveAttempts === exploreWritesBeforeFailure + 1,
  'failed explore result does not retry persistence every frame'
);
ok(
  G.queries.persistence &&
    G.queries.persistence().locked === true &&
    G.queries.persistence().kind === 'explore',
  'failed explore result enters explicit recoverable save state'
);
saveMode = 'ok';
ok(
  G.commands.retryPersistence &&
    G.commands.retryPersistence() === true,
  'manual explore retry succeeds after storage recovers'
);
const committedExplore = JSON.parse(store.cloud_save_v1);
ok(
  G.state.current &&
    (G.state.current && G.state.current.key) === 'gather:explore:herb' &&
    G.state.current.stalled === false &&
    committedExplore.current &&
    committedExplore.current.key === 'gather:explore:herb' &&
    JSON.stringify(committedExplore.systems.gathering.spots.herb) ===
      failedExploreSpot,
  'retry commits the held explore result and resumes continuous exploration'
);
ok(
  G.state.rngState === failedExploreRng &&
    committedExplore.rngState === failedExploreRng,
  'retry persistence does not reroll or advance RNG'
);

// 普通手动保存也只在写入成功后提示成功，失败时进入同一恢复通道。
saveMode = 'false';
ok(G.save() === false, 'manual save reports a failed storage write');
ok(
  G.getToastMessage().indexOf('保存失败') >= 0 &&
    G.queries.persistence().locked === true,
  'manual save failure is visible and locks further progress'
);
saveMode = 'ok';
ok(
  G.commands.retryPersistence() === true &&
    G.getToastMessage().indexOf('已保存') >= 0 &&
    G.queries.persistence().locked === false,
  'manual save confirmation appears only after a successful retry'
);

// 模拟在失败写入后直接重开：旧快照携带同一随机种子，结果必须一致。
G.state.player = G.ensurePlayer(preExploreSnapshot.player);
G.state.current = preExploreSnapshot.current;
G.state.rngState = preExploreSnapshot.rngState;
G.state.systems = JSON.parse(JSON.stringify(preExploreSnapshot.systems));
G.state.offlineResult = preExploreSnapshot.pendingOfflineReport;
G.state.showOffline = false;
advanceSeconds(2.1);
ok(
  G.state.systems.gathering.spots.herb &&
    JSON.stringify(G.state.systems.gathering.spots.herb) === failedExploreSpot &&
    G.state.rngState === failedExploreRng,
  'reopening after a failed explore save deterministically reproduces the same result'
);

// 22) 材料不足：生产行为按统一停止原因结束，不白送产出
G.state.player = G.defaultPlayer();
G.state.current = null;
G.state.showOffline = false;
G.state.offlineResult = null;
G.state.player.inventory.stacks.yaocai = 2;   // 不够一次炼筑基丹（需 5）
G.setCurrent('liandan_tupo');
advanceSeconds(100);
ok(G.state.current === null &&
  G.state.lastActionStop &&
  G.state.lastActionStop.reason === 'materials_exhausted',
  '材料不足 → 行为以 materials_exhausted 停止');
ok(G.state.player.inventory.stacks.tupo === 0, '材料不足时未产出（不白送丹药）');
} catch (error) {
  ok(false, 'skillnet trailing suite aborted: ' + (error && error.message));
}

console.log('\n================ 自测结果 ================');
console.log('通过: ' + pass + '  失败: ' + fail);
console.log('NAV 技艺页: ' + navSkills.join(' / '));
console.log('ACTIONS 动作总数: ' + Object.keys(G.ACTIONS).length);
process.exit(fail === 0 ? 0 : 1);
