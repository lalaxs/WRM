'use strict';

const fs = require('fs');
const vm = require('vm');

let pass = 0;
let fail = 0;
function ok(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.error('  ✗ FAIL: ' + message);
  }
}

class ClassList {
  constructor() { this._set = new Set(); }
  add(value) { this._set.add(value); }
  remove(value) { this._set.delete(value); }
  contains(value) { return this._set.has(value); }
  toggle(value, force) {
    const enabled = force === undefined ? !this._set.has(value) : !!force;
    enabled ? this.add(value) : this.remove(value);
    return enabled;
  }
  toString() { return Array.from(this._set).join(' '); }
}

class MockEl {
  constructor(tag) {
    this.tagName = String(tag || 'div').toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.classList = new ClassList();
    this._text = '';
    this._handlers = {};
    this.disabled = false;
    this.value = '';
    this.clientWidth = this.tagName === 'CANVAS' ? 420 : 0;
    this.clientHeight = this.tagName === 'CANVAS' ? 820 : 0;
  }
  set className(value) {
    this.classList = new ClassList();
    String(value || '').split(/\s+/).forEach((name) => {
      if (name) this.classList.add(name);
    });
  }
  get className() { return this.classList.toString(); }
  set textContent(value) {
    this._text = String(value == null ? '' : value);
    this.children = [];
  }
  get textContent() { return this._text; }
  set innerHTML(value) {
    if (value === '') this.children = [];
    this._html = value;
  }
  get innerHTML() { return this._html || ''; }
  appendChild(child) {
    this.children.push(child);
    child.parent = this;
    return child;
  }
  addEventListener(event, handler) {
    (this._handlers[event] = this._handlers[event] || []).push(handler);
  }
  click() {
    if (this.disabled) return;
    (this._handlers.click || []).forEach((handler) =>
      handler({ stopPropagation() {}, preventDefault() {} })
    );
  }
  dispatch(event) {
    (this._handlers[event] || []).forEach((handler) =>
      handler({ target: this, stopPropagation() {}, preventDefault() {} })
    );
  }
  getContext() { return {}; }
  getBoundingClientRect() {
    return { left: 0, right: 420, top: 0, bottom: 820, width: 420 };
  }
  find(predicate, output) {
    output = output || [];
    if (predicate(this)) output.push(this);
    this.children.forEach((child) => child.find(predicate, output));
    return output;
  }
}

function byClass(root, className) {
  return root.find((element) =>
    element.classList && element.classList.contains(className)
  );
}

function firstClass(root, className, index) {
  return byClass(root, className)[index || 0] || new MockEl('div');
}

function cssBlock(source, selector) {
  const start = source.indexOf(selector + ' {');
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  const close = source.indexOf('\n}', open);
  return close < 0 ? '' : source.slice(open + 1, close);
}

function hexLuma(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return 0;
  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function frozenCopy(value) {
  if (!value || typeof value !== 'object') return value;
  const copy = Array.isArray(value) ? [] : {};
  Object.keys(value).forEach((key) => {
    copy[key] = frozenCopy(value[key]);
  });
  return Object.freeze(copy);
}

const root = new MockEl('div');
root.id = 'ui';
const canvas = new MockEl('canvas');
const calls = [];
const farm = {
  unlockedPlots: 2,
  farmingLevel: 8,
  plots: [
    {
      plotId: 'plot-1',
      unlocked: true,
      cropId: null,
      cropName: null,
      remainingSeconds: 0,
      totalSeconds: 0,
      ready: false,
      progress: 0
    },
    {
      plotId: 'plot-2',
      unlocked: true,
      cropId: null,
      cropName: null,
      remainingSeconds: 0,
      totalSeconds: 0,
      ready: false,
      progress: 0
    },
    {
      plotId: 'plot-3',
      unlocked: true,
      cropId: 'heartClearGrass',
      cropName: '清心草',
      remainingSeconds: 45,
      totalSeconds: 120,
      ready: false,
      progress: 0.625
    }
  ],
  plantableCrops: [
    {
      cropId: 'spiritRice',
      name: '灵米',
      unlockLevel: 1,
      unlocked: true,
      seedItemId: 'commonSeed',
      seedRequired: 1,
      seedOwned: 3,
      growthSeconds: 60,
      baseHarvest: 2,
      masteryLevel: 3
    },
    {
      cropId: 'heartClearGrass',
      name: '清心草',
      unlockLevel: 8,
      unlocked: true,
      seedItemId: 'commonSeed',
      seedRequired: 1,
      seedOwned: 3,
      growthSeconds: 120,
      baseHarvest: 2,
      masteryLevel: 1
    }
  ]
};

const GameAPI = Object.freeze({
  queries: Object.freeze({
    app() {
      return frozenCopy({
        phase: 'game',
        appearance: {
          indices: {
            body: 0, cloth: 0, nose: 0, mouth: 0,
            eyes: 0, eyebrush: 0, hair: 0
          }
        },
        modals: {
          break: false,
          offline: false,
          legacyRebirth: false
        }
      });
    },
    navigation() {
      return frozenCopy({
        activeIndex: 0,
        items: [{ id: 'nav-0', label: '洞府', active: true }]
      });
    },
    top() {
      return frozenCopy({
        name: '青岚',
        pills: { mood: 88, jingqi: 90, lingshi: 120, shengwang: 0 },
        realm: '练气一层',
        xiwei: 12,
        need: 100,
        canBreak: false
      });
    },
    home() {
      return frozenCopy({ realm: '练气一层', current: null });
    },
    homestead(moduleId) {
      if (moduleId === 'farm') return frozenCopy(farm);
      if (moduleId === 'formations') {
        return frozenCopy({ slots: [], formations: [] });
      }
      if (moduleId === 'beasts') {
        return frozenCopy({ encounters: [], roster: [], activeIds: [] });
      }
      return frozenCopy({ implemented: false });
    },
    breakModal() { return null; },
    offline() {
      return frozenCopy({
        visible: false,
        reports: [],
        summary: { durationSeconds: 0, actions: [], stops: [] }
      });
    },
    persistence() {
      return frozenCopy({
        locked: false,
        kind: null,
        message: '',
        canRetry: false
      });
    }
  }),
  commands: Object.freeze({
    plantAll(input) {
      calls.push({ name: 'plantAll', input });
      return frozenCopy({
        ok: true,
        code: 'ok',
        changed: true,
        message: '全部播种成功',
        data: { planted: input.assignments.length }
      });
    }
  }),
  render: Object.freeze({ drawCharacter() { return true; } })
});

const sandbox = {
  document: {
    getElementById(id) {
      if (id === 'ui') return root;
      if (id === 'game') return canvas;
      return null;
    },
    createElement(tag) {
      return tag === 'canvas' ? new MockEl('canvas') : new MockEl(tag);
    },
    addEventListener() {},
    hidden: false
  },
  window: null,
  GameAPI,
  console,
  setTimeout() { return 0; },
  clearTimeout() {},
  requestAnimationFrame() {},
  Math
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
require('./ui_scripts').loadUiScripts(vm, sandbox);

const styleSource = fs.readFileSync('styles.css', 'utf8');
const farmFieldCss = cssBlock(styleSource, '.farm-field');
const farmFieldHexes = Array.from(
  farmFieldCss.matchAll(/#[0-9a-f]{6}/ig),
  (match) => match[0]
);
const farmFieldBaseLuma = farmFieldHexes.length
  ? farmFieldHexes.reduce((sum, hex) => sum + hexLuma(hex), 0) /
    farmFieldHexes.length
  : 0;
ok(
  farmFieldCss.indexOf('radial-gradient') < 0 &&
    farmFieldCss.indexOf('linear-gradient(90deg') >= 0 &&
    farmFieldCss.indexOf('linear-gradient(0deg') >= 0 &&
    farmFieldBaseLuma >= 174,
  'farm field CSS uses a light soil palette with crosshatch texture and no bright spot'
);

sandbox.UI.renderGame();
firstClass(root, 'cave-card', 0).click();

ok(
  byClass(root, 'plot-card').length === 3 &&
    firstClass(root, 'farm-crop-icon').textContent === '未选择种子' &&
    firstClass(root, 'farm-crop-icon', 1).textContent === '未选择种子' &&
    firstClass(root, 'farm-crop-icon', 2).textContent === '🌿' &&
    firstClass(root, 'farm-field-status').textContent === '未播种' &&
    firstClass(root, 'farm-field-status', 1).textContent === '未播种' &&
    firstClass(root, 'farm-field-status', 2).textContent === '成长中' &&
    byClass(root, 'farm-field-progress').length === 1 &&
    firstClass(root, 'farm-plan-summary').textContent === '尚未选择种子' &&
    byClass(root, 'plant-all-action')[0].disabled === true,
  'farm UI keeps initial empty plots unselected until a seed is chosen'
);

const quickSelect = firstClass(root, 'quick-crop-select');
quickSelect.value = 'spiritRice';
quickSelect.dispatch('change');
firstClass(root, 'quick-seed-action').click();

ok(
  byClass(root, 'plot-card').length === 3 &&
    byClass(root, 'farm-field').length === 3 &&
    byClass(root, 'plot-card').every((card) =>
      byClass(card, 'farm-field')[0] === card
    ) &&
    byClass(root, 'farm-crop-icon').length === 3 &&
    byClass(root, 'farm-field-status').length === 3 &&
    byClass(root, 'farm-field-progress').length === 1 &&
    byClass(root, 'farm-field-progress-fill').length === 1 &&
    byClass(root, 'farm-field-progress-label').length === 1 &&
    byClass(root, 'card-title').length === 0 &&
    byClass(root, 'plot-crop').length === 0 &&
    byClass(root, 'plot-plan').length === 0 &&
    byClass(root, 'seed-count').length === 0 &&
    byClass(root, 'farm-soil-bed').length === 0 &&
    byClass(root, 'farm-furrow').length === 0 &&
    byClass(root, 'farm-plant').length === 0 &&
    firstClass(root, 'farm-crop-icon').textContent === '🌱' &&
    firstClass(root, 'farm-field-status').textContent === '未播种' &&
    firstClass(root, 'farm-field-status', 2).textContent === '成长中' &&
    firstClass(root, 'farm-field-progress-fill').style.width === '63%' &&
    firstClass(root, 'farm-field-progress-label').textContent === '剩余 45 秒' &&
    byClass(root, 'crop-kind-spiritRice').length >= 1 &&
    byClass(root, 'crop-kind-heartClearGrass').length >= 1,
  'farm UI renders crop icons, soil-card status, and progress bars without complex field rows'
);

firstClass(root, 'plot-card', 1).click();
ok(
    byClass(root, 'farm-plot-mask').length === 1 &&
    firstClass(root, 'farm-plot-mask').style.display === 'flex' &&
    byClass(root, 'farm-plot-modal').length === 1 &&
    firstClass(root, 'modal-title').textContent === '灵田详情' &&
    firstClass(root, 'plot-status').textContent ===
      '未播种 · 这块田会按当前种子计划参与全部播种' &&
    byClass(root, 'farm-plot-detail').length === 0,
  'farm plot click opens an unnumbered masked modal instead of an inline detail panel'
);
const detailSelect = firstClass(root, 'crop-plan-select');
detailSelect.value = 'heartClearGrass';
detailSelect.dispatch('change');

firstClass(root, 'plant-all-action').click();

ok(
  calls.length === 1 &&
    calls[0].name === 'plantAll' &&
    JSON.stringify(calls[0].input) === JSON.stringify({
      assignments: [
        { plotId: 'plot-1', cropId: 'spiritRice' },
        { plotId: 'plot-2', cropId: 'heartClearGrass' }
      ]
    }),
  'farm UI keeps per-plot seed plans and submits one plantAll command'
);
ok(
  byClass(root, 'farm-plot-mask').length === 1 &&
    firstClass(root, 'farm-plot-mask').style.display === 'none' &&
    byClass(root, 'plot-card').length === 3,
  'farm UI closes the plot modal after a successful plantAll command'
);

farm.plantableCrops[0].seedOwned = 0;
farm.plantableCrops[1].seedOwned = 0;
sandbox.UI.renderGame();
const insufficientBefore = calls.length;
ok(
  firstClass(root, 'farm-plan-summary').textContent ===
    '将播种 2 块 · 种子不足' &&
    byClass(root, 'plant-all-action')[0].disabled === false,
  'farm seed shortage keeps the planned plant button clickable for warning feedback'
);
firstClass(root, 'plant-all-action').click();
ok(
  calls.length === insufficientBefore &&
    byClass(root, 'toast-stack').length === 1 &&
    byClass(root, 'toast').some((node) =>
      node.textContent === '种子不足'
    ),
  'farm seed shortage shows a floating toast warning without submitting plantAll'
);

console.log(
  `\n=== 灵田批量播种 UI 自测：${pass} 通过 / ${fail} 失败 ===`
);
process.exit(fail ? 1 : 0);
