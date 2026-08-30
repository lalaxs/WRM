'use strict';
// 离线结算最短门槛自测：
// 1) 离线时长不足 1 分钟不结算；满 1 分钟才结算（推进水位线）
// 2) 空闲（无主行动）长离线推进水位线但不弹「离线收益」
// 3) isMeaningfulOfflineReport 门闩：有完成次数才算有意义
const fs = require('fs');
const vm = require('vm');
const SimulationReport = require('../core/simulation-report.js');

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
  ['game.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-api.js'].forEach((file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  });
  const harness = sandbox.__GameTestHarness;
  return { sandbox, harness, controls, snapshot() { return clone(harness.__test.snapshotModel()); } };
}

function settleWithCurrent(offlineMs, current) {
  const rt = createRuntime({ store: {} });
  const G = rt.harness;
  const model = G.__test.snapshotModel();
  model.created = true;
  model.current = current;
  const base = model.processedThroughMs || 0;
  const target = base + offlineMs;
  const result = G.__test.settleStartupOffline(model, target);
  return { result, target, G };
}

function sampleReport(overrides) {
  const report = SimulationReport.create({
    source: 'offline',
    fromMs: 0,
    toMs: 60000,
    requestedSeconds: 60,
    actionKey: 'tuna',
    seedBefore: 1
  });
  if (overrides && typeof overrides === 'object') {
    Object.keys(overrides).forEach(function (key) {
      report[key] = overrides[key];
    });
  }
  return report;
}

console.log('离线结算最短门槛 / 有意义弹窗自测');

const r59 = settleWithCurrent(59000, { key: 'tuna', mode: 'repeat', count: 0, done: 0, elapsed: 0 });
ok(r59.result.newReports.length === 0, '离线 59 秒：不弹「离线结算」（不足门槛）');

const r60 = settleWithCurrent(60000, {
  key: 'tuna',
  mode: 'repeat',
  count: 0,
  done: 0,
  elapsed: 0
});
ok(
  r60.result.ok === true &&
    r60.result.state.processedThroughMs === r60.target,
  '离线满 60 秒：结算并推进水位线'
);

const r30 = settleWithCurrent(30000, { key: 'tuna', mode: 'repeat', count: 0, done: 0, elapsed: 0 });
ok(r30.result.newReports.length === 0, '离线 30 秒：不弹「离线结算」');

const idle = settleWithCurrent(3600000, null);
ok(
  idle.result.ok === true &&
    idle.result.state.processedThroughMs === idle.target &&
    idle.result.newReports.length === 0,
  '空闲离线 1 小时：水位线推进但不弹离线收益'
);
ok(
  idle.G.state.showOffline === false &&
    (idle.result.state.pendingOfflineReports || []).length === 0,
  '空闲长离线后 showOffline 为 false'
);

const empty = sampleReport();
ok(
  SimulationReport.isMeaningfulOfflineReport(empty) === false,
  '空报告（completed=0）不算有意义'
);
const gained = sampleReport();
gained.action.completed = 3;
ok(
  SimulationReport.isMeaningfulOfflineReport(gained) === true,
  '有主行动完成次数的报告算有意义'
);
const recovered = sampleReport();
recovered.warnings = ['invalid_combat_session_recovered'];
ok(
  SimulationReport.isMeaningfulOfflineReport(recovered) === false,
  '纯战斗 session 恢复 warning 不算有意义'
);
const rollback = sampleReport();
rollback.warnings = ['clock_rollback'];
ok(
  SimulationReport.isMeaningfulOfflineReport(rollback) === true,
  '时钟回拨 warning 仍算有意义'
);

console.log('\n=== 离线门槛自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
process.exit(fail === 0 ? 0 : 1);
