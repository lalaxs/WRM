// Focused regression test for the battle-screen "treat injury" no-response bug.
//
// Root cause this test pins down:
//   game.js render() runs on every requestAnimationFrame (~60fps). Each frame it
//   advances the injury recovery lane, which writes a *different float*
//   remainingSeconds into the model. renderCombatView() used to fold that float
//   into its structural signature, so the combat host was rebuilt (innerHTML='')
//   every frame -- destroying & recreating the .treat-injury button ~60x/sec.
//   A button destroyed that fast can never receive a click -> "点了没反应".
//
// Fix (ui.js renderCombatView): strip remainingSeconds from the signature via
// stripInjuryCountdown() and refresh the countdown text in place via
// refreshInjuryCountdown(). The button node now survives across frames.
//
// This test drives the REAL recovery lane (runRuntimeFrame), which is exactly the
// float-producing mechanism the live app uses, and asserts:
//   1. The .treat-injury button node identity is PRESERVED across float changes
//      (no per-frame rebuild). <-- the decisive assertion.
//   2. The preserved button is still clickable and actually consumes a pill +
//      reduces the injury.

const fs = require('fs');
const vm = require('vm');
require('../core/simulation-report.js');

// ── Minimal browser-like harness (copied from selftest_ui.js createRuntime) ──
class ClassList {
  constructor() { this._s = new Set(); }
  add(value) { this._s.add(value); }
  remove(value) { this._s.delete(value); }
  toggle(value, force) {
    if (force === undefined) force = !this._s.has(value);
    force ? this._s.add(value) : this._s.delete(value);
    return force;
  }
  contains(value) { return this._s.has(value); }
  toString() { return [...this._s].join(' '); }
}
function stubCtx() {
  return new Proxy({}, {
    get(target, property) {
      if (property === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (property === 'measureText') return () => ({ width: 10 });
      if (property === 'canvas') return { width: 420, height: 820 };
      return () => {};
    }
  });
}
class MockEl {
  constructor(tag) {
    this.tagName = (tag || 'div').toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.classList = new ClassList();
    this._text = '';
    this._handlers = {};
    this.width = 0; this.height = 0;
    this.clientWidth = this.tagName === 'CANVAS' ? 56 : 0;
    this.clientHeight = this.tagName === 'CANVAS' ? 56 : 0;
    this.disabled = false; this.value = ''; this.type = ''; this.placeholder = '';
  }
  set className(value) {
    this.classList = new ClassList();
    String(value || '').split(/\s+/).forEach((n) => { if (n) this.classList.add(n); });
  }
  get className() { return this.classList.toString(); }
  set textContent(value) { this._text = String(value == null ? '' : value); this.children = []; }
  get textContent() { return this._text; }
  set innerHTML(value) { if (value === '') this.children = []; this._html = value; }
  get innerHTML() { return this._html || ''; }
  appendChild(child) { this.children.push(child); child.parent = this; return child; }
  get childNodes() { return this.children; }
  get firstChild() { return this.children[0] || null; }
  get lastChild() { return this.children[this.children.length - 1] || null; }
  removeChild(child) { const i = this.children.indexOf(child); if (i >= 0) this.children.splice(i, 1); return child; }
  insertBefore(child, ref) {
    if (ref == null) this.children.push(child);
    else { const i = this.children.indexOf(ref); if (i < 0) this.children.push(child); else this.children.splice(i, 0, child); }
    child.parent = this; return child;
  }
  addEventListener(event, handler) { (this._handlers[event] = this._handlers[event] || []).push(handler); }
  click() { if (this.disabled) return; (this._handlers.click || []).forEach((h) => h({})); }
  dispatch(event) { (this._handlers[event] || []).forEach((h) => h({ target: this })); }
  getContext() { return stubCtx(); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 420, height: 820 }; }
  find(predicate, output) {
    output = output || [];
    if (predicate(this)) output.push(this);
    this.children.forEach((c) => { if (c.find) c.find(predicate, output); });
    return output;
  }
}
function stubCanvas() { const c = new MockEl('canvas'); c.getContext = () => stubCtx(); return c; }
function byClass(root, className) {
  return root.find((e) => e.classList && e.classList.contains(className));
}
function fixedDate(now) {
  return class FixedDate extends Date {
    constructor(...a) { super(...(a.length ? a : [now])); }
    static now() { return now; }
  };
}
function createRuntime(store, now, controls, withUI, options) {
  controls = controls || { saveMode: 'ok', saveAttempts: 0 };
  options = options || {};
  const canvas = stubCanvas();
  const uiRoot = new MockEl('div'); uiRoot.id = 'ui';
  const document = {
    getElementById(id) { if (id === 'game') return canvas; if (id === 'ui') return uiRoot; return null; },
    createElement(tag) { return tag === 'canvas' ? stubCanvas() : new MockEl(tag); },
    addEventListener() {}, hidden: false
  };
  const view = { scale: 1, offsetX: 0, offsetY: 0, safeTop: 0, dpr: 1, logicalH: 820 };
  const platform = new Proxy({}, {
    get(_t, property) {
      if (property === 'canvas') return canvas;
      if (property === 'ctx') return stubCtx();
      if (property === 'view') return view;
      if (property === 'load') return (k) => (k in store ? JSON.parse(store[k]) : null);
      if (property === 'save') return (k, v) => { store[k] = JSON.stringify(v); return true; };
      if (property === 'createImage') return () => ({ complete: true, onload: null, onerror: null, set src(v) {} });
      if (property === 'createCanvas') return () => stubCanvas();
      if (property === 'getSystemInfoAsync') return (o) => { if (o && o.success) o.success({ pixelRatio: 1, safeArea: { top: 0 } }); };
      return () => {};
    }
  });
  const windowFacade = { addEventListener() {}, NIE_ASSET_BASE: '', devicePixelRatio: 1 };
  const sandbox = {
    __GAME_TEST_HARNESS_REQUEST__: !!options.requestTestHarness,
    Platform: platform, document, window: windowFacade, console,
    Math, Date: fixedDate(now), isFinite, isNaN, parseInt, parseFloat,
    setTimeout() { return 0; }, clearTimeout() {},
    requestAnimationFrame() { return 0; },
    Proxy, RegExp, Error, Set, structuredClone
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('nie-manifest.js', 'utf8'), sandbox, { filename: 'nie-manifest.js' });
  const stage3Dependencies = [
    'content/items.js', 'content/life-skills.js', 'content/gathering.js', 'content/recipes.js',
    'content/homestead.js', 'content/combat.js', 'content/techniques.js', 'content/realms.js',
    'core/stage2-state.js', 'core/stage3-state.js', 'core/random.js', 'core/inventory.js',
    'core/skill-progression.js', 'core/gathering.js', 'core/production.js', 'core/farm.js',
    'core/formations.js', 'core/spirit-beasts.js', 'core/combat-loadouts.js', 'core/techniques.js',
    'core/combat-stats.js', 'core/combat-engine.js', 'core/combat-rewards.js', 'core/combat-progress.js',
    'core/breakthrough.js', 'core/save-system.js', 'core/simulation-report.js', 'core/state-model.js',
    'core/simulation.js', 'core/game-rules.js', 'core/stage2-rules.js', 'core/stage3-rules.js'
  ];
  stage3Dependencies.forEach((file) => vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file }));
  ['game.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-api.js'].forEach((file) => {
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
});
  if (withUI) require('./ui_scripts').loadUiScripts(vm, sandbox);
  return { api: sandbox.window.GameAPI, ui: sandbox.window.UI, root: uiRoot, sandbox, controls, store };
}

// ── Test ──
const NOW = 1700000000000;
const store = {};
const runtime = createRuntime(store, NOW, null, true, { fullStage3: true, requestTestHarness: true });
runtime.api.commands.confirmCreate();
const harness = runtime.sandbox.__GameTestHarness;

// Set up a severe injury with the exact field shape the game's recovery lane
// uses (remainingSecondsExact must agree with remainingSeconds, or normalize
// nulls the injury). owned=2 healing pills.
let model = harness.__test.snapshotModel();
model.player.inventory.stacks.healingPill = 2;
model.player.combat.injury = {
  id: 'severe-injury',
  remainingSeconds: 1200.5,
  remainingSecondsExact: '1200.5',
  totalSeconds: 1800
};
harness.__test.replaceModel(model);

const combatIndex = runtime.api.queries.navigation().items.findIndex((i) => i.label === '战斗');
runtime.api.commands.switchNav({ index: combatIndex });
runtime.ui.renderGame();

const treatNode = () => byClass(runtime.root, 'treat-injury')[0] || null;
const node0 = treatNode();
if (!node0) { console.error('FAIL: .treat-injury button never rendered'); process.exit(1); }
if (node0.disabled) { console.error('FAIL: .treat-injury button is disabled (should be clickable)'); process.exit(1); }

// Simulate the real render loop: each frame the recovery lane advances and
// writes a different float remainingSeconds, then UI renders -- exactly the
// scenario that used to destroy & recreate the button every frame.
let rebuilds = 0;
let prev = node0;
let lastRemaining = null;
let t = harness.state.processedThroughMs || 0;
for (let f = 1; f <= 40; f++) {
  t += 250; // advance ~0.25s of sim time per frame (recovery lane decrements)
  harness.__test.runRuntimeFrame(t);
  runtime.ui.renderGame();
  const cur = treatNode();
  if (f === 1 || f === 40) {
    const v = runtime.api.queries.combat({ tab: 'regions' }).injury;
    console.log('frame ' + f + ': view.injury = ' + JSON.stringify(v));
  }
  if (cur !== prev) rebuilds++;
  prev = cur;
}
lastRemaining = runtime.api.queries.combat({ tab: 'regions' }).injury;
if (!lastRemaining) {
  console.error('FAIL: injury view became null during simulated frames');
  process.exit(1);
}

// Assert: the button node was NOT recreated during the simulated frames.
const identityStable = rebuilds === 0 && prev === node0;

// Click the (still-stable) button and confirm it consumes a pill + reduces injury.
const clickNode = treatNode();
const nodeStableBeforeClick = clickNode === node0; // the node we click is the persistent one
const beforeRemaining = harness.state.player.combat.injury
  ? harness.state.player.combat.injury.remainingSeconds
  : null;
clickNode.click();
const pillAfter = harness.state.player.inventory.stacks.healingPill;
const injuryAfter = harness.state.player.combat.injury
  ? harness.state.player.combat.injury.remainingSeconds
  : null;

let pass = true;
function check(name, ok) {
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!ok) pass = false;
}
check('treat-injury button node is NOT rebuilt across per-frame float changes (root cause fixed)', identityStable);
check('button clicked is the same persistent node (no rebuild during frames)', nodeStableBeforeClick);
check('clicking treat-injury consumes exactly 1 healing pill (2 -> 1)', pillAfter === 1);
check('clicking treat-injury reduces the injury', injuryAfter != null && beforeRemaining != null && injuryAfter < beforeRemaining);

console.log('\nSummary: rebuilds=' + rebuilds +
  ' pillAfter=' + pillAfter +
  ' injuryBefore=' + beforeRemaining + ' injuryAfter=' + injuryAfter);
if (!pass) { console.error('\nREGRESSION: treat-injury bug NOT fixed.'); process.exit(1); }
console.log('\nOK: treat-injury is stable and clickable. Bug fixed.');
