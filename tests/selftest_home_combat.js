'use strict';

// 精准回归：战斗中顶栏「当前行动」进度条。
// 验证：(1) 战斗中 home.current.combat 标记打开、name 非空；
//       (2) 进度按 1 - enemy.hp/maxHp 读取（不是抽搐也不是卡 0）；
//       (3) 间歇帧（enemy=null）复用上一帧进度，避免回弹闪烁。
//
// 沙箱装配严格照搬 selftest_ui.js 的 createRuntime：不注入宿主 Object/Array/JSON。
// 走真实 api.commands.startAction 启动战斗（确保 stage3 内部 session.actionKey /
// state.current.key 一致，combatInspection 返回 ready），不调 advanceRuntime（不触发
// combatInspection 重检，避免把 session 清空）。
const fs = require('fs');
const vm = require('vm');

let pass = 0;
let fail = 0;
function ok(c, m) {
  if (c) pass++;
  else { fail++; console.error('  ✗ ' + m); }
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

const harness = sandbox.__GameTestHarness;
if (!harness) { console.error('harness 未暴露'); process.exit(1); }
const api = sandbox.window.GameAPI;
if (!api) { console.error('window.GameAPI 未暴露'); process.exit(1); }
api.commands.confirmCreate();

// 真实启动战斗（确保 stage3 内部 session.actionKey/state.current.key 一致）
api.commands.startAction({ key: 'combat:region:qingyunOutskirts:thornHare' });
const S = harness.state;
const sess = S.systems.combat && S.systems.combat.session;

// 1) 战斗中标记 + 进度 = 1 - hp/maxHp
const home1 = api.queries.home();
ok(home1.current && home1.current.combat === true,
  '战斗中 home.current.combat 应为 true（进入战斗分支）');
ok(home1.current && typeof home1.current.name === 'string' && home1.current.name.length > 0,
  '战斗名称应非空，实际=' + (home1.current && home1.current.name));
if (sess && sess.enemy) {
  const expected1 = 1 - sess.enemy.hp / sess.enemy.maxHp;
  ok(home1.current && Math.abs(home1.current.progress - expected1) < 1e-6,
    '战斗进度应为 1 - hp/maxHp = ' + expected1.toFixed(3) + '，实际=' + (home1.current && home1.current.progress));
}

// 2) 敌人血量下降 → 进度平滑上升（不是抽搐）
if (sess && sess.enemy) {
  sess.enemy.hp = 10;
  const home2 = api.queries.home();
  const expected2 = 1 - 10 / sess.enemy.maxHp;
  ok(home2.current && Math.abs(home2.current.progress - expected2) < 1e-6,
    '敌人 hp 10/' + sess.enemy.maxHp + ' 时进度应为 ' + expected2.toFixed(3) +
    '，实际=' + (home2.current && home2.current.progress));
}

// 3) 过场/间歇帧（enemy 为 null）复用上一帧进度，避免回弹闪烁
if (sess) {
  const cachedEnemy = sess.enemy;
  sess.enemy = null;
  const home3 = api.queries.home();
  const expected3 = 1 - 10 / cachedEnemy.maxHp;
  ok(home3.current && Math.abs(home3.current.progress - expected3) < 1e-6,
    '间歇帧（enemy=null）应复用上一帧 ' + expected3.toFixed(3) +
    '，实际=' + (home3.current && home3.current.progress));
  // 恢复 enemy 供后续清理
  sess.enemy = cachedEnemy;
}

// 4) 离开战斗后，标记清除、进度归零
api.commands.stopAction();
const home4 = api.queries.home();
ok(!home4.current || home4.current.combat !== true,
  '离开战斗后 current.combat 不应为 true（已退出战斗分支）');

console.log(`\n=== 战斗顶栏进度条回归：${pass} 通过 / ${fail} 失败 ===`);
process.exit(fail ? 1 : 0);
