'use strict';

// 精准回归：浏览器最小化 / App 切后台时，重伤恢复倒计时应照常生效。
// 根因：主循环用 requestAnimationFrame，标签页隐藏时浏览器暂停 rAF → 游戏时钟冻结
//       → injuryRecoveryLane 不扣减 → 重伤倒计时卡住不动。
// 修复：隐藏时挂一个 1s 后台定时器持续推动游戏时钟（advanceHidden），
//      回来时停止定时器。本测试验证隐藏期间重伤剩余时间确实在递减。
//
// 沙箱装配严格照搬 selftest_home_combat.js：不注入宿主 Object/Array/JSON，
// 让 vm 使用自带内置对象，否则 stage3-rules 的 plainRecord(deps) 会因 prototype 判定失败。
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

// 捕获后台定时器的回调，用于验证「隐藏时确实启动了定时器」；不自动触发，时间由测试手动驱动。
let capturedTick = null;
function setIntervalStub(fn) { capturedTick = fn; return 1; }
function clearIntervalStub() { capturedTick = null; }

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
  setInterval: setIntervalStub,
  clearInterval: clearIntervalStub,
  Proxy,
  RegExp,
  Error,
  Set,
  structuredClone: (x) => JSON.parse(JSON.stringify(x))
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const stage3Files = [
  'content/herblore-parity.js',
  'content/materials.js',
  'content/items.js',
  'content/life-skills.js',
  'content/gathering.js',
  'content/recipes.js',
  'content/homestead.js',
  'content/combat.js',
  'content/techniques.js',
  'content/realms.js',
  'core/stage2-state.js',
  'core/stage3-state.js',
  'core/random.js',
  'core/inventory.js',
  'core/skill-progression.js',
  'core/gathering.js',
  'core/production.js',
  'core/farm.js',
  'core/formations.js',
  'core/spirit-beasts.js',
  'core/combat-loadouts.js',
  'core/techniques.js',
  'core/combat-stats.js',
  'core/combat-engine.js',
  'core/combat-rewards.js',
  'core/combat-progress.js',
  'core/breakthrough.js',
  'core/save-system.js',
  'core/simulation-report.js',
  'core/state-model.js',
  'core/simulation.js',
  'core/game-rules.js',
  'core/stage2-rules.js',
  'core/stage3-rules.js'
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

const S = harness.state;
// 锚定游戏时钟到 NOW，避免默认模型时间戳干扰
S._last = NOW;
S.processedThroughMs = NOW;
S._nextAutosaveAt = NOW + 30000;
S.player = S.player || {};
S.player.combat = S.player.combat || {};
// 设置重伤：剩余 120 秒（totalSeconds 仅用于规范化校验）
S.player.combat.injury = {
  id: 'severe-injury',
  remainingSeconds: 120,
  remainingSecondsExact: '120',
  totalSeconds: 300
};
S.current = null; // 无主动作，纯重伤恢复场景

const remBefore = S.player.combat.injury.remainingSeconds;
ok(remBefore === 120, '初始重伤剩余应为 120 秒，实际=' + remBefore);

// 1) 进入「隐藏 / 最小化」：应启动后台定时器
const hideOk = harness.__test.handleVisibilityChange(true, NOW);
ok(hideOk === true, 'handleVisibilityChange(true) 应返回 true');
ok(capturedTick !== null, '隐藏时应启动后台定时器（setInterval 被调用）');
ok(S._hiddenAt === NOW, '隐藏时应记录 _hiddenAt');

// 2) 后台持续推进 60 秒（模拟定时器按墙钟时间多次触发；此处直接驱动一次 60s 跨度）
harness.__test.advanceHidden(NOW + 60000);
const remAfter60 = S.player.combat.injury.remainingSeconds;
ok(remAfter60 !== undefined && remAfter60 < 120,
  '后台推进 60s 后重伤剩余应减少，实际=' + remAfter60);
ok(Math.abs(remAfter60 - 60) < 1,
  '后台推进 60s 后重伤剩余应≈60 秒，实际=' + remAfter60);
ok(S.processedThroughMs === NOW + 60000,
  '后台推进后 processedThroughMs 应前进到 NOW+60000，实际=' + S.processedThroughMs);

// 3) 再推进 60 秒（共 120s）→ 重伤应刚好恢复（remaining 归 0 / injury 清空）
harness.__test.advanceHidden(NOW + 120000);
const injuryAfter120 = S.player.combat.injury;
ok(injuryAfter120 === null || injuryAfter120.remainingSeconds <= 0,
  '后台累计推进 120s 后重伤应已恢复（injury 清空或剩余≤0），实际=' +
    (injuryAfter120 ? injuryAfter120.remainingSeconds : 'null'));

// 4) 回到前台：停止后台定时器，_hiddenAt 清空，不崩溃
const showOk = harness.__test.handleVisibilityChange(false, NOW + 121000);
ok(showOk === true, 'handleVisibilityChange(false) 应返回 true');
ok(capturedTick === null, '回到前台后应停止后台定时器（clearInterval 被调用）');
ok(S._hiddenAt === null, '回到前台后 _hiddenAt 应清空');

console.log(`\n=== 重伤后台恢复回归：${pass} 通过 / ${fail} 失败 ===`);
process.exit(fail ? 1 : 0);
