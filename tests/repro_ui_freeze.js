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
  'content/lifecycle.js',
  'core/stage2-state.js',
  'core/stage3-state.js',
  'core/random.js',
  'core/npc-generator.js',
  'core/npc-roster.js',
  'core/person-factory.js',
  'core/relation-seed.js',
  'core/stage4-state.js',
  'core/relationships.js',
  'core/world-calendar.js',
  'core/world-narrative-fill.js',
  'core/world-romance.js',
  'core/world-event-gen.js',
  'core/world-month.js',
  'core/inventory.js',
  'core/skill-progression.js',
  'core/social.js',
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
  'game-queries.js',
  'game-queries-social.js',
  'game-queries-combat.js',
  'game-commands.js',
  'game-api.js',
  'ui/ui-core.js',
  'ui/ui-home.js',
  'ui/ui-skills.js',
  'ui/ui-social.js',
  'ui/ui-combat.js',
  'ui/ui-modals.js',
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

// ── 创建角色，进入 game 阶段 ──
const created = sandbox.window.GameAPI.commands.confirmCreate();
console.log('[harness] confirmCreate ok =', created && created.ok, created && created.message);
console.log('[harness] state.phase =', harness.state.phase, 'created =', harness.state.created);

// 副本需要境界门槛，给 harness 新角色拉高境界以便测试「波次切换（敌人 id 变化）」这条最易卡死的路径
harness.state.player.realmStage = 10;

// ── 切到「战斗」导航 ──
const nav = sandbox.window.GameAPI.queries.navigation();
const combatNavIndex = nav.items.findIndex((it) => it.label === '战斗');
console.log('[harness] nav items =', nav.items.map((i) => i.label).join(','), 'combatIndex =', combatNavIndex);
if (combatNavIndex >= 0) {
  sandbox.window.GameAPI.commands.switchNav({ index: combatNavIndex });
}

// ── 选战斗 key（先探查可用项，跳过锁定的）──
function dumpCombat(tab) {
  const v = sandbox.window.GameAPI.queries.combat({ tab });
  console.log('[dump] combat(' + tab + ') keys =', v ? Object.keys(v).join(',') : 'null');
  if (v && v.regions) {
    v.regions.slice(0, 2).forEach((r) => {
      console.log('  region:', r.id, 'locked=', r.locked, 'enemies=',
        (r.enemies || []).map((e) => e.id + (e.actionKey ? '(' + e.actionKey + ')' : '')).join(','));
    });
  }
  if (v && v.dungeons) {
    v.dungeons.slice(0, 2).forEach((d) => {
      console.log('  dungeon:', d.id, 'locked=', d.locked, 'actionKey=', d.actionKey);
    });
  }
  return v;
}
const regView = dumpCombat('regions');
const dunView = dumpCombat('dungeons');

function firstUnlockedKey() {
  // 副本优先（波次切换更接近用户卡死的场景）
  if (dunView && dunView.dungeons) {
    for (const d of dunView.dungeons) {
      if (!d.locked && d.actionKey) return d.actionKey;
    }
  }
  if (regView && regView.regions) {
    for (const r of regView.regions) {
      if (r.locked) continue;
      const e = r.enemies && r.enemies[0];
      if (e && e.actionKey) return e.actionKey;
      if (e && e.id) return 'combat:region:' + r.id + ':' + e.id;
    }
  }
  return null;
}

const actionKey = 'combat:dungeon:breathCave';
let started = sandbox.window.GameAPI.commands.startAction({ key: actionKey });
console.log('[harness] dungeon 启动 ok =', started && started.ok, started && started.message);
if (!started || !started.ok) {
  console.log('[harness] 副本启动失败，退回 region');
  const fallback = firstUnlockedKey() || 'combat:region:qingyunOutskirts:thornHare';
  started = sandbox.window.GameAPI.commands.startAction({ key: fallback });
  console.log('[harness] region 启动 ok =', started && started.ok, started && started.message);
}
const actionKeyUsed = harness.state.current && harness.state.current.key;
console.log('[harness] 最终战斗 key =', actionKeyUsed);
if (!started || !started.ok) {
  console.error('[harness] 无法启动战斗，退出');
  process.exit(1);
}
console.log('[harness] state.current =', harness.state.current && harness.state.current.key,
  'session.mode =', (harness.state.systems.combat && harness.state.systems.combat.session || {}).mode);

// ── 逐帧推进引擎 + 渲染 UI，捕捉异常 ──
let lastEnemyId = null;
let respawns = 0;
let intermissions = 0;
let kills = 0;
let threw = null;
let threwFrame = -1;
const FRAMES = 1400;
for (let i = 0; i < FRAMES; i++) {
  const from = harness.state.processedThroughMs;
  try {
    harness.__test.advanceRuntime(from, from + 16, 'online', null);
  } catch (e) {
    console.error('[harness] 引擎 advanceRuntime 抛错 @frame', i, '\n', e.stack || e);
    break;
  }
  const sess = harness.state.systems.combat && harness.state.systems.combat.session;
  const enemyId = sess && sess.enemy ? sess.enemy.id : (sess ? 'INTERMISSION' : 'NO_SESSION');
  // 击杀检测：上一帧有敌且未满血，这一帧进入间歇
  if (lastEnemyId !== null && lastEnemyId !== 'INTERMISSION' && enemyId === 'INTERMISSION') {
    intermissions++;
    console.log('[harness] 击杀 @frame', i, '击杀数=', intermissions);
  }
  // 重生检测：上一帧间歇、这一帧有敌
  if (lastEnemyId === 'INTERMISSION' && enemyId !== 'INTERMISSION' && enemyId !== 'NO_SESSION') {
    respawns++;
    console.log('[harness] 重生 @frame', i, 'enemy=', enemyId, '重生数=', respawns);
  }
  lastEnemyId = enemyId;
  if (!harness.state.current) {
    console.log('[harness] 战斗于 frame', i, '结束（state.current 清空）');
    break;
  }
  if (enemyId !== lastEnemyId) {
    if (lastEnemyId !== null && enemyId === 'INTERMISSION') {
      // 进入间歇
    } else if (lastEnemyId !== null && lastEnemyId !== 'INTERMISSION' && enemyId !== 'INTERMISSION' && enemyId !== 'NO_SESSION') {
      respawns++;
    }
    lastEnemyId = enemyId;
  }
  try {
    sandbox.window.UI.renderGame();
  } catch (e) {
    threw = e;
    threwFrame = i;
    console.error('[harness] ★ UI.renderGame 抛错 @frame', i, 'enemyId=', enemyId, '\n', e.stack || e);
    break;
  }
  if (i % 500 === 0) {
    const s2 = harness.state.systems.combat && harness.state.systems.combat.session;
    console.log('frame', i, 'enemy=', enemyId, 'pHP=', s2 && s2.player && s2.player.hp, 'eHP=', s2 && s2.enemy && s2.enemy.hp, 'waveDefeated=', s2 && s2.waveDefeated);
  }
}

console.log('[harness] 结束：frames=', FRAMES, 'respawns=', respawns, 'UI抛错=', threw ? (threw.message) : '无', '抛错帧=', threwFrame);
if (!threw) console.log('[harness] 未复现 UI 异常（renderGame 全程未抛错）');
