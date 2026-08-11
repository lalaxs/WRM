'use strict';

// 战斗僵持/抽搐修复回归测试（完整模拟主循环 + UI 渲染）
// 验收：
//   1. 战斗进入后 game-state 内 combat tick 正常跑（elapsed 推进、enemy.hp 下降）
//   2. UI 层 combat 查询返回的 active 视图随时间变化（血量/出手/阶段）
//   3. 不再出现"双方满血、出手满格、僵持不动"的视觉卡死
//   4. 离战后 state + UI 视图都正确清空
//
// 沙箱装配严格照搬 selftest_home_combat.js（已验证能跑通 stage3 全套 + harness）

const fs = require('fs');
const vm = require('vm');

let pass = 0;
let fail = 0;
function ok(c, m) {
  if (c) pass++;
  else { fail++; console.error('  FAIL: ' + m); }
}

function stubCtx() {
  return new Proxy({}, {
    get(t, p) {
      if (p === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'canvas') return { width: 420, height: 820 };
      return () => {};
    }
  });
}
function stubCanvas() {
  return {
    width: 420, height: 820, style: {},
    getContext: () => stubCtx(),
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 820 })
  };
}
function fixedDate(now) {
  return class FixedDate extends Date {
    constructor(...a) { super(...(a.length ? a : [now])); }
    static now() { return now; }
  };
}

const NOW = 1_700_000_000_000;
const store = {};
const view = { scale: 1, offsetX: 0, offsetY: 0, safeTop: 0, dpr: 1, logicalH: 820 };
const platform = new Proxy({}, {
  get(t, p) {
    if (p === 'canvas') return stubCanvas();
    if (p === 'ctx') return stubCtx();
    if (p === 'view') return view;
    if (p === 'load') return (k) => (k in store ? JSON.parse(store[k]) : null);
    if (p === 'save') return (k, v) => { store[k] = JSON.stringify(v); return true; };
    if (p === 'createImage') return () => ({ complete: true, onload: null, onerror: null, set src(v) {} });
    if (p === 'createCanvas') return () => stubCanvas();
    if (p === 'getSystemInfoAsync') return (opts) => {
      if (opts && opts.success) opts.success({ pixelRatio: 1, safeArea: { top: 0 } });
    };
    return () => {};
  }
});
const sandbox = {
  __GAME_TEST_HARNESS_REQUEST__: true,
  Platform: platform,
  document: {
    getElementById: (id) => id === 'game' ? stubCanvas() : (id === 'ui' ? { id: 'ui', appendChild() {}, querySelector() { return null; } } : null),
    createElement: (t) => stubCanvas(),
    addEventListener() {},
    hidden: false
  },
  window: { addEventListener() {}, NIE_ASSET_BASE: '', devicePixelRatio: 1 },
  console,
  Math,
  Date: fixedDate(NOW),
  isFinite,
  isNaN,
  parseInt,
  parseFloat,
  requestAnimationFrame() {},
  setTimeout() { return 0; },
  clearTimeout() {},
  Proxy,
  RegExp,
  Error,
  Set,
  structuredClone: (x) => JSON.parse(JSON.stringify(x))
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const stage3Files = [
  'content/items.js', 'content/life-skills.js', 'content/gathering.js',
  'content/recipes.js', 'content/homestead.js', 'content/combat.js',
  'content/techniques.js', 'content/realms.js',
  'core/stage2-state.js', 'core/stage3-state.js', 'core/random.js',
  'core/inventory.js', 'core/skill-progression.js', 'core/gathering.js',
  'core/production.js', 'core/farm.js', 'core/formations.js',
  'core/spirit-beasts.js', 'core/combat-loadouts.js', 'core/techniques.js',
  'core/combat-stats.js', 'core/combat-engine.js', 'core/combat-rewards.js',
  'core/combat-progress.js', 'core/breakthrough.js', 'core/save-system.js',
  'core/simulation-report.js', 'core/state-model.js', 'core/simulation.js',
  'core/game-rules.js', 'core/stage2-rules.js', 'core/stage3-rules.js'
];
stage3Files.forEach((f) =>
  vm.runInContext(fs.readFileSync(f, 'utf8'), sandbox, { filename: f })
);
vm.runInContext(fs.readFileSync('game.js', 'utf8'), sandbox, { filename: 'game.js' });
// 故意不加载 ui.js（vm 里 DOM stub 不全，UI 会抛异常；我们只测 game-state 与 combat 查询）

const harness = sandbox.__GameTestHarness;
if (!harness) { console.error('harness 未暴露'); process.exit(1); }
const api = sandbox.window.GameAPI;
if (!api) { console.error('window.GameAPI 未暴露'); process.exit(1); }
const UI = sandbox.window.UI;  // undefined, expected
if (!api) { console.error('window.GameAPI 未暴露'); process.exit(1); }

api.commands.confirmCreate();

// 真实启动战斗
api.commands.startAction({ key: 'combat:region:qingyunOutskirts:thornHare' });

// 模拟主循环：每帧调 runRuntimeFrame（推时钟）
// 同时记录每帧的 game-state 和 combat 查询视图
const timeline = [];
let tMs = NOW;
for (let i = 0; i < 80; i++) {  // 80 * 50ms = 4s
  tMs = NOW + i * 50;
  harness.__test.runRuntimeFrame(tMs);
  const s = harness.state;
  const view = api.queries.combat({ tab: 'regions' });
  const sess = s.systems.combat && s.systems.combat.session;
  const enemy = sess && sess.enemy;
  const activeBattle = view && view.active;
  const activeEnemy = activeBattle && activeBattle.enemy;
  if (i < 2 || i % 5 === 0) {
    timeline.push({
      t: i * 50,
      hasCurrent: !!s.current,
      currentKey: s.current && s.current.key,
      currentElapsed: s.current && s.current.elapsed,
      injury: s.player && s.player.combat && s.player.combat.injury,
      enemyHp: enemy && enemy.hp,
      sessMode: sess && sess.mode,
      // UI 视图
      uiHasActive: !!activeBattle,
      uiEnemyHp: activeEnemy && activeEnemy.hp,
      uiPlayerHp: activeBattle && activeBattle.player && activeBattle.player.hp
    });
  }
}
console.log('  时间线（每 250ms 一行）：');
timeline.forEach(r => {
  console.log('    t=' + r.t + 'ms  cur=' + (r.currentKey || 'null') +
    ' curElapsed=' + (r.currentElapsed && r.currentElapsed.toFixed(2)) +
    ' injury=' + (r.injury ? r.injury.id : 'null') +
    ' stateEnemy.hp=' + r.enemyHp +
    ' uiActive=' + r.uiHasActive +
    ' uiEnemyHp=' + (r.uiEnemyHp != null ? r.uiEnemyHp : 'n/a') +
    ' uiPlayerHp=' + (r.uiPlayerHp != null ? r.uiPlayerHp : 'n/a'));
});

// 验收 1：战斗 tick 在跑过 1-2 个 TICK（enemy.hp 已下降 + uiActive=true）
const t250 = timeline.find(r => r.t === 250);
ok(t250 && t250.uiHasActive === true, '战斗开始时 UI 应显示 active 视图');
ok(t250 && t250.currentKey && t250.currentKey.indexOf('combat:') === 0,
  '战斗中 state.current 持续存在：' + (t250 && t250.currentKey));

// 验收 2：敌人血量应下降（战斗 tick 在跑，不再僵持）
const t0 = timeline[0];
ok(t250 && t250.enemyHp < t0.enemyHp,
  't=250ms 时敌人血量应已下降，hp=' + (t0 && t0.enemyHp) + '->' + (t250 && t250.enemyHp) + '（之前 release/ 版本的「整段跳过」会卡在 45）');

// 验收 3：UI 视图（combat.active.enemy）应反映 game-state 变化
const earlyHasUI = timeline.slice(0, 3).some(r => r.uiHasActive);
ok(earlyHasUI, '战斗开始时 UI 应显示 active 视图');
// 玩家血量在战斗中也应下降（敌人自动攻击）
const playerHpEarly = timeline.find(r => r.t === 250) && timeline.find(r => r.t === 250).uiPlayerHp;
ok(playerHpEarly != null && playerHpEarly < 100,
  '战斗 250ms 后玩家应被敌人反击掉血，hp=' + playerHpEarly);

// 离战
api.commands.stopAction();
const finalState = harness.state;
ok(!finalState.current || finalState.current.key.indexOf('combat:') !== 0,
  '离战后 state.current 应清空');
tMs = NOW + 5000;
harness.__test.runRuntimeFrame(tMs);
const finalView = api.queries.combat({ tab: 'regions' });
ok(!finalView || !finalView.active, '离战后 UI combat.active 应清空');

console.log('\n' + pass + '/' + (pass + fail) + ' 通过');
if (fail > 0) process.exit(1);
