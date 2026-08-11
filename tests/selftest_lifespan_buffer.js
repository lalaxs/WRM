'use strict';

// 浏览器 UI 冻结复现器：
// 用真实 platform.js + game.js + ui.js（经 __GAME_TEST_HARNESS_REQUEST__ 钩子）
// 在 Node 里用 DOM 桩跑起来，启动真实战斗，逐帧调用 UI.renderGame()，
// 捕捉「刷出下一个敌人后双方不再出手」的真正异常堆栈。

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── 最小 DOM 实现（真实对象，确保数据字段 undefined 访问仍会抛错）──
function makeClassList() {
  const set = new Set();
  return {
    _set: set,
    add(c) { set.add(c); },
    remove(c) { set.delete(c); },
    contains(c) { return set.has(c); },
    toggle(c, force) {
      const has = set.has(c);
      const want = force === undefined ? !has : !!force;
      if (want) set.add(c); else set.delete(c);
      return want;
    }
  };
}

const ctxStub = new Proxy({}, {
  get(t, p) {
    if (p === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (p in t) return t[p];
    return () => {};
  },
  set(t, p, v) { t[p] = v; return true; }
});

class Element {
  constructor(tag) {
    this.tagName = (tag || 'div').toUpperCase();
    this.className = '';
    this.textContent = '';
    this.title = '';
    this.width = 420;
    this.height = 820;
    this.style = {};
    this.dataset = {};
    this.classList = makeClassList();
    this.childNodes = [];
    this.children = [];
    this.parentNode = null;
    this._handlers = {};
  }
  get firstChild() { return this.childNodes[0] || undefined; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || undefined; }
  get offsetWidth() { return 0; }
  get scrollHeight() { return 0; }
  set scrollHeight(v) { /* no-op */ }
  set innerHTML(v) {
    if (v === '' || v == null) { this.childNodes = []; this.children = []; }
    this._innerHTML = v;
  }
  get innerHTML() { return this._innerHTML || ''; }
  appendChild(child) {
    child.parentNode = this;
    this.childNodes.push(child);
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const i = this.childNodes.indexOf(child);
    if (i >= 0) this.childNodes.splice(i, 1);
    const j = this.children.indexOf(child);
    if (j >= 0) this.children.splice(j, 1);
    child.parentNode = null;
    return child;
  }
  insertBefore(child, ref) {
    child.parentNode = this;
    const i = ref ? this.childNodes.indexOf(ref) : 0;
    if (i < 0) this.childNodes.push(child);
    else this.childNodes.splice(i, 0, child);
    this.children.push(child);
    return child;
  }
  addEventListener(type, fn) {
    (this._handlers[type] = this._handlers[type] || []).push(fn);
  }
  removeEventListener() {}
  getContext() { return ctxStub; }
  click() {
    (this._handlers.click || []).forEach((fn) => fn({}));
  }
  setAttribute() {}
  getAttribute() { return null; }
  querySelector() { return null; }
}

const elementsById = {};
function getElementById(id) {
  if (!elementsById[id]) {
    elementsById[id] = new Element(id === 'game' ? 'canvas' : 'div');
  }
  return elementsById[id];
}

const documentStub = {
  getElementById,
  createElement(tag) { return new Element(tag); },
  createTextNode(t) { const e = new Element('#text'); e.textContent = t; return e; },
  addEventListener() {},
  removeEventListener() {},
  body: new Element('body'),
  documentElement: new Element('html'),
  hidden: false,
  get computedStyle() { return null; }
};

// ── localStorage 桩 ──
const storage = new Map();
const localStorageStub = {
  getItem(k) { return storage.has(k) ? storage.get(k) : null; },
  setItem(k, v) { storage.set(k, String(v)); },
  removeItem(k) { storage.delete(k); }
};

// ── sandbox ──
// 只注入「非固有」全局；Object/Array/Math/JSON/Promise/Proxy/Error/Date/RegExp 等
// 由 vm 上下文自行提供，切勿用 Node 的版本覆盖，否则会破坏「plain object」/instanceof 校验。
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  structuredClone: (typeof structuredClone === 'function')
    ? structuredClone
    : (v) => JSON.parse(JSON.stringify(v)),
  getComputedStyle() { return { paddingTop: '0px' }; },
  devicePixelRatio: 1,
  innerWidth: 420,
  innerHeight: 820,
  localStorage: localStorageStub,
  document: documentStub,
  Image: class { constructor() { this.onload = null; this.src = ''; this.complete = false; } },
  fetch: () => Promise.reject(new Error('no fetch in harness')),
  __GAME_TEST_HARNESS_REQUEST__: true
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
// window 必须是「不同于 globalThis」的对象，才能触发 __GameTestHarness 暴露闸门；
// 同时用 Proxy 把 window.* 读写代理到 sandbox，保证 platform.js 里 `window.Platform=...`
// 等同于裸全局 `Platform`（game.js 只读裸 Platform）。
sandbox.addEventListener = function () {};
sandbox.removeEventListener = function () {};
sandbox.window = new Proxy(sandbox, {
  get(t, p) { return t[p]; },
  set(t, p, v) { t[p] = v; return true; },
  has(t, p) { return p in t; }
});

// requestAnimationFrame：捕获 render 但不自动循环
let capturedRender = null;
sandbox.requestAnimationFrame = function (cb) { capturedRender = cb; return 1; };
sandbox.cancelAnimationFrame = function () {};

vm.createContext(sandbox);

// ── 按 index.html 顺序加载全部脚本 ──
const scripts = [
  'nie-manifest.js',
  'platform.js',
  'AdManager.js',
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
  'content/regions.js',
  'content/sects.js',
  'content/npc-generation.js',
  'content/social-interactions.js',
  'content/event-templates.js',
  'content/lifecycle.js',
  'core/stage2-state.js',
  'core/stage3-state.js',
  'core/random.js',
  'core/npc-generator.js',
  'core/npc-roster.js',
  'core/stage4-state.js',
  'core/relationships.js',
  'core/inventory.js',
  'core/skill-progression.js',
  'core/social.js',
  'core/event-engine.js',
  'core/npc-simulation.js',
  'core/sect-simulation.js',
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
  'core/stage3-rules.js',
  'core/stage4-rules.js',
  'core/lineage.js',
  'core/inheritance-hall.js',
  'core/legacy-transition.js',
  'core/stage5-rules.js',
  'game.js',
  'ui.js'
];

for (const rel of scripts) {
  const abs = path.resolve(__dirname, '..', rel);
  if (!fs.existsSync(abs)) { console.error('缺少脚本:', rel); continue; }
  try {
    vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: abs });
  } catch (e) {
    console.error('加载脚本出错', rel, '\n', e.stack || e);
    process.exit(1);
  }
}

console.log('[harness] 全部脚本加载完成');
const harness = sandbox.__GameTestHarness;
if (!harness) { console.error('未暴露 __GameTestHarness'); process.exit(1); }
console.log('[harness] state.phase =', harness.state.phase);

// 创建角色（loader 基础部分不含此步）
const created = sandbox.window.GameAPI.commands.confirmCreate();
console.log('[lb] confirmCreate ok =', created && created.ok);

// ── 寿命安全缓冲弹窗验证场景 ──
console.log('[lb] 强制玩家进入安全缓冲前置状态');
const p = harness.state.player;
if (!p.lifecycle) p.lifecycle = { status: 'living', pendingCause: null };
p.lifecycle.status = 'living';
p.lifecycle.pendingCause = null;
p.shouyuan = 1; // 等于 lifespanBufferYears，下一次边界即进入缓冲

let entered = false;
for (let i = 0; i < 400; i++) {
  const from = harness.state.processedThroughMs;
  try {
    harness.__test.advanceRuntime(from, from + 16, 'online', null);
  } catch (e) {
    console.error('[lb] advanceRuntime 抛错', e.stack || e);
    process.exit(1);
  }
  if (harness.state.showLifespanBuffer) { entered = true; break; }
}
console.log('[lb] showLifespanBuffer =', harness.state.showLifespanBuffer,
  '| lifecycle.status =',
  harness.state.player.lifecycle && harness.state.player.lifecycle.status);

let buildThrew = null;
try {
  sandbox.window.UI.renderGame(); // 此时 modalsView.lifespanBuffer=true → 触发 buildLifespanBuffer + updateLifespanBuffer
} catch (e) {
  buildThrew = e;
  console.error('[lb] 弹窗渲染抛错', e.stack || e);
}
const visibleViaQuery = (function () {
  try { return !!sandbox.window.GameAPI.queries.app().modals.lifespanBuffer; }
  catch (e) { return null; }
})();
console.log('[lb] 弹窗构建抛错 =', buildThrew ? buildThrew.message : '无',
  '| queryApp.modals.lifespanBuffer =', visibleViaQuery);

let closeThrew = null;
try {
  sandbox.window.GameAPI.commands.closeLifespanBuffer();
  sandbox.window.UI.renderGame();
} catch (e) {
  closeThrew = e;
  console.error('[lb] 关闭后渲染抛错', e.stack || e);
}
const afterClose = (function () {
  try { return !!sandbox.window.GameAPI.queries.app().modals.lifespanBuffer; }
  catch (e) { return null; }
})();
console.log('[lb] 关闭后 flag =', harness.state.showLifespanBuffer,
  '| queryApp.modals.lifespanBuffer =', afterClose,
  '| 关闭渲染抛错 =', closeThrew ? closeThrew.message : '无');

let reThrow = null;
try {
  for (let i = 0; i < 80; i++) {
    const from = harness.state.processedThroughMs;
    harness.__test.advanceRuntime(from, from + 16, 'online', null);
  }
  sandbox.window.UI.renderGame();
} catch (e) { reThrow = e; }
const afterAdvance = (function () {
  try { return !!sandbox.window.GameAPI.queries.app().modals.lifespanBuffer; }
  catch (e) { return null; }
})();
console.log('[lb] 关闭后继续推进 80 帧，flag 仍为 =', harness.state.showLifespanBuffer,
  '| queryApp.modals.lifespanBuffer =', afterAdvance,
  '（应均 false，证明不重复弹）| 渲染抛错 =', reThrow ? reThrow.message : '无');

const pass = entered &&
  !buildThrew &&
  visibleViaQuery === true &&
  !closeThrew &&
  harness.state.showLifespanBuffer === false &&
  afterClose === false &&
  afterAdvance === false &&
  !reThrow;
console.log(pass ? '[lb] \u2713 寿命安全缓冲弹窗验证通过' : '[lb] \u2717 验证未通过');
process.exit(pass ? 0 : 1);
