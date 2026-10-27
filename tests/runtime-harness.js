'use strict';

// Canonical browser-script topology shared by runtime regression tests and the
// performance benchmark. It deliberately does not substitute CommonJS modules.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Runtime = require('../runtime-modules.js');
const ROOT = path.join(__dirname, '..');

function createHarness(options = {}) {
  const scheduledTasks = [];
  const clock = { now: options.now || 1735689600000 };
  const controls = { saveMode: 'ok', primaryWrites: 0, normalizeCalls: 0 };
  const store = options.store || new Map();
  const context = new Proxy({}, {
    get(target, key) {
      if (key === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (key === 'measureText') return () => ({ width: 10 });
      return () => {};
    }
  });
  function canvas() {
    return { width: 420, height: 820, clientWidth: 420, clientHeight: 820,
      getContext: () => context,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 820 }) };
  }
  const mainCanvas = canvas();
  const platform = new Proxy({}, {
    get(target, key) {
      if (key === 'canvas') return mainCanvas;
      if (key === 'ctx') return context;
      if (key === 'view') return { scale: 1, dpr: 1, safeTop: 0,
        offsetX: 0, offsetY: 0, logicalH: 820 };
      if (key === 'load') return name => {
        const raw = store.get(name);
        return raw == null ? null : JSON.parse(raw);
      };
      if (key === 'save') return (name, value) => {
        if (controls.saveMode === 'throw') throw new Error('storage unavailable');
        if (controls.saveMode === 'false') return false;
        store.set(name, JSON.stringify(value));
        if (name === 'cloud_save_v1') controls.primaryWrites++;
        return true;
      };
      if (key === 'createCanvas') return canvas;
      if (key === 'createImage') return () => ({ complete: true, set src(value) {} });
      if (key === 'getSystemInfoAsync') return cb => cb.success({ pixelRatio: 1 });
      return () => {};
    }
  });
  const sandbox = {
    __GAME_TEST_HARNESS_REQUEST__: true,
    __auditControls: controls,
    Platform: platform, console, Math, structuredClone,
    Date: class extends Date { static now() { return clock.now; } },
    requestAnimationFrame(fn) { if (options.captureTimers) scheduledTasks.push(fn); },
    setTimeout(fn) { if (options.captureTimers) scheduledTasks.push(fn); return 0; },
    clearTimeout() {},
    document: { hidden: false, addEventListener() {},
      getElementById: () => mainCanvas,
      createElement: tag => tag === 'canvas' ? canvas() :
        { style: {}, appendChild() {}, addEventListener() {} } },
    window: { addEventListener() {}, devicePixelRatio: 1, NIE_ASSET_BASE: '' }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  function run(file) {
    let source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (file === 'core/stage4-state.js') {
      source = source.replace('function normalize(model, options) {',
        'function normalize(model, options) { globalThis.__auditControls.normalizeCalls++;');
    }
    vm.runInContext(source, sandbox, { filename: file });
  }
  run('content/herblore-parity.js');
  vm.runInContext('HerbloreParityContent.loadFromData(JSON.parse(' +
    JSON.stringify(fs.readFileSync(path.join(ROOT, 'content/herblore-parity.json'), 'utf8')) +
    '))', sandbox);
  const scripts = Runtime.BOOT_SCRIPTS.filter(file =>
    !['platform.js', 'AdManager.js', 'ui.js'].includes(file) && !file.startsWith('ui/'));
  scripts.splice(scripts.indexOf('game.js'), 0, ...Runtime.COMBAT_RUNTIME_SCRIPTS);
  scripts.forEach(run);
  const harness = sandbox.__GameTestHarness;
  let model = harness.__test.snapshotModel();
  model.created = true;
  model.player = harness.defaultPlayer();
  model.player.identity = { gender: 'female', name: '运行验收' };
  model.player.regionId = 'qinglan-town';
  model.player.shouyuan = 120;
  model.player.shouMax = 120;
  model.player.flags = { completedFirstAction: true };
  model.rngState = 31;
  model.processedThroughMs = clock.now;
  model = sandbox.Stage4State.normalize(sandbox.Stage4State.ensureWorldPopulation(model));
  const npcs = model.systems.npcs;
  const first = Object.values(npcs.records)[0];
  for (let index = Object.keys(npcs.records).length; index < (options.npcCount || 0); index++) {
    const npc = JSON.parse(JSON.stringify(first));
    npc.id = 'benchmark-npc-' + index;
    npcs.records[npc.id] = npc;
    npcs.backgroundIds.push(npc.id);
  }
  harness.__test.replaceModel(model);
  harness.state.phase = 'game';
  harness.state._last = clock.now;
  harness.state._nextAutosaveAt = clock.now + 30000;
  return { sandbox, harness, api: sandbox.window.GameAPI, clock, controls, store, scheduledTasks,
    evaluate: source => vm.runInContext(source, sandbox) };
}

module.exports = { createHarness };
