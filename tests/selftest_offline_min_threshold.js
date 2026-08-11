'use strict';
// 离线结算最短门槛自测：
// 验证「离线时长不足 1 分钟不弹离线结算，满 1 分钟（含整 60 秒）才弹」。
// 复用 stage3_api 的 VM 加载范式（已验证可加载 game.js 并暴露 harness，且不触发已删除的 Canvas UI）。
const fs = require('fs');
const vm = require('vm');

let pass = 0;
let fail = 0;
function ok(condition, message) {
  if (condition) {
    pass++;
    console.log('  ✓ ' + message);
  } else {
    fail++;
    console.error('  ✗ FAIL: ' + message);
  }
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stubContext() {
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
    width: 420,
    height: 820,
    clientWidth: 420,
    clientHeight: 820,
    getContext() { return stubContext(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 420, height: 820 }; }
  };
}
function fixedDate(now) {
  return class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
}

const SCRIPT_ORDER = [
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

const NOW = 1700000000000;

function createRuntime(options) {
  options = options || {};
  const now = options.now == null ? NOW : options.now;
  const store = options.store || {};
  const controls = { saveAttempts: 0, saveMode: 'ok' };
  const canvas = stubCanvas();
  const document = {
    hidden: false,
    getElementById(id) { return id === 'game' ? canvas : null; },
    createElement(tag) {
      return tag === 'canvas' ? stubCanvas() : { style: {}, appendChild() {}, addEventListener() {} };
    },
    addEventListener() {}
  };
  const platform = new Proxy({}, {
    get(t, p) {
      if (p === 'canvas') return canvas;
      if (p === 'ctx') return stubContext();
      if (p === 'view') return { scale: 1, offsetX: 0, offsetY: 0, safeTop: 0, dpr: 1, logicalH: 820 };
      if (p === 'load') return (key) => key in store ? clone(store[key]) : null;
      if (p === 'save') {
        return (key, value) => {
          if (key === 'cloud_save_v1') controls.saveAttempts++;
          if (controls.saveMode === 'false') return false;
          if (controls.saveMode === 'throw') throw new Error('storage unavailable');
          store[key] = clone(value);
          return true;
        };
      }
      if (p === 'createImage') return () => ({ complete: true, onload: null, onerror: null, set src(v) {} });
      if (p === 'createCanvas') return stubCanvas;
      if (p === 'getSystemInfoAsync') {
        return (cb) => { if (cb && cb.success) cb.success({ pixelRatio: 1, safeArea: { top: 0 } }); };
      }
      return () => {};
    }
  });
  const sandbox = {
    __GAME_TEST_HARNESS_REQUEST__: true,
    Platform: platform,
    document,
    console,
    Math,
    Date: fixedDate(now),
    isFinite,
    isNaN,
    parseInt,
    parseFloat,
    structuredClone,
    requestAnimationFrame() {},
    setTimeout() { return 0; },
    clearTimeout() {},
    addEventListener() {}
  };
  sandbox.window = { addEventListener() {}, NIE_ASSET_BASE: '', devicePixelRatio: 1 };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('nie-manifest.js', 'utf8'), sandbox, { filename: 'nie-manifest.js' });
  SCRIPT_ORDER.forEach((file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  });
  vm.runInContext(fs.readFileSync('game.js', 'utf8'), sandbox, { filename: 'game.js' });
  const harness = sandbox.__GameTestHarness;
  return { sandbox, harness, controls, snapshot() { return clone(harness.__test.snapshotModel()); } };
}

// 构造一个「正在采药」的干净存档，模拟离线 offlineMs 后重新打开。
// 每次用独立 runtime + 独立 store，避免水位线串扰。
function settleFor(offlineMs) {
  const rt = createRuntime({ store: {} });
  const G = rt.harness;
  const model = G.__test.snapshotModel();
  model.created = true;
  model.current = { key: 'caiyao', mode: 'loop' };
  const base = model.processedThroughMs || 0;
  return G.__test.settleStartupOffline(model, base + offlineMs);
}

console.log('离线结算最短门槛自测（MIN_OFFLINE_SETTLE_MS = 60000，即「至少 1 分钟」）');

const r59 = settleFor(59000);
ok(r59.newReports.length === 0, '离线 59 秒：不弹「离线结算」（不足门槛）');

const r60 = settleFor(60000);
ok(r60.newReports.length >= 1, '离线满 60 秒：弹「离线结算」（恰好达门槛）');
if (r60.newReports.length) {
  ok(r60.newReports[0].source === 'offline', '门槛触发的报告来源为 offline');
}

const r30 = settleFor(30000);
ok(r30.newReports.length === 0, '离线 30 秒：不弹「离线结算」');

const r3600 = settleFor(3600000);
ok(r3600.newReports.length >= 1, '离线 1 小时：弹「离线结算」（正常收益不受影响）');

console.log('\n=== 离线门槛自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
process.exit(fail === 0 ? 0 : 1);
