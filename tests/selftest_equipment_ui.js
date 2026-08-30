'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

class ClassList {
  constructor() {
    this.values = new Set();
  }
  add(value) {
    this.values.add(value);
  }
  remove(value) {
    this.values.delete(value);
  }
  contains(value) {
    return this.values.has(value);
  }
  toggle(value, force) {
    const enabled = force === undefined ? !this.values.has(value) : !!force;
    if (enabled) this.values.add(value);
    else this.values.delete(value);
    return enabled;
  }
  toString() {
    return Array.from(this.values).join(' ');
  }
}

class MockElement {
  constructor(tag) {
    this.tagName = String(tag || 'div').toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.classList = new ClassList();
    this.handlers = {};
    this.disabled = false;
    this.value = '';
    this._text = '';
  }
  set className(value) {
    this.classList = new ClassList();
    String(value || '').split(/\s+/).forEach((name) => {
      if (name) this.classList.add(name);
    });
  }
  get className() {
    return this.classList.toString();
  }
  set textContent(value) {
    this._text = String(value == null ? '' : value);
    this.children = [];
  }
  get textContent() {
    return this._text;
  }
  set innerHTML(value) {
    if (value === '') this.children = [];
  }
  appendChild(child) {
    child.parent = this;
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    return child;
  }
  addEventListener(type, handler) {
    (this.handlers[type] = this.handlers[type] || []).push(handler);
  }
  click() {
    if (this.disabled) return;
    (this.handlers.click || []).forEach((handler) => handler({
      target: this,
      preventDefault() {},
      stopPropagation() {}
    }));
    if (typeof this.onclick === 'function') {
      this.onclick({
        target: this,
        preventDefault() {},
        stopPropagation() {}
      });
    }
  }
  contains(target) {
    if (target === this) return true;
    return this.children.some((child) =>
      child && typeof child.contains === 'function' && child.contains(target)
    );
  }
  closest(selector) {
    if (selector === '[data-item-tip-trigger="1"]' &&
        this.dataset.itemTipTrigger === '1') {
      return this;
    }
    return this.parent && typeof this.parent.closest === 'function'
      ? this.parent.closest(selector)
      : null;
  }
  getContext() {
    return new Proxy({}, {
      get(target, property) {
        if (property === 'createLinearGradient') {
          return () => ({ addColorStop() {} });
        }
        if (property === 'measureText') return () => ({ width: 10 });
        if (property === 'canvas') return { width: 390, height: 760 };
        return () => {};
      }
    });
  }
  getBoundingClientRect() {
    return { left: 12, right: 92, top: 130, bottom: 198, width: 80, height: 68 };
  }
  find(predicate, output) {
    const result = output || [];
    if (predicate(this)) result.push(this);
    this.children.forEach((child) => {
      if (child && typeof child.find === 'function') child.find(predicate, result);
    });
    return result;
  }
}

function byClass(root, className) {
  return root.find((element) =>
    element.classList && element.classList.contains(className)
  );
}

function frozenCopy(value) {
  if (!value || typeof value !== 'object') return value;
  const copy = Array.isArray(value) ? [] : {};
  Object.keys(value).forEach((key) => {
    copy[key] = frozenCopy(value[key]);
  });
  return Object.freeze(copy);
}

const root = new MockElement('div');
const canvas = new MockElement('canvas');
const calls = [];
const equipment = {
  instanceId: 'eq-ui-1',
  itemId: 'eq-ui-1',
  baseId: 'qi-weapon',
  name: '传说 青锋剑',
  baseName: '青锋剑',
  category: 'equipment',
  slot: 'weapon',
  slotName: '武器',
  quality: 'legendary',
  qualityName: '传说',
  quantity: 1,
  available: 1,
  bound: 1,
  favorite: false,
  enhancementLevel: 3,
  iconSrc50: 'assets/item-icons/50/equipment-weapon.svg',
  iconSrc100: 'assets/item-icons/100/equipment-weapon.svg',
  description: '一柄适合练气修士使用的灵剑。',
  flat: { attack: 12 },
  percent: { critChance: 0.04 },
  affixes: [
    { id: 'attack', name: '攻击', tier: 3, value: 7, text: '攻击 +7' },
    {
      id: 'critChance',
      name: '暴击率',
      tier: 2,
      value: 0.04,
      text: '暴击率 +4%'
    }
  ],
  comparison: {
    currentInstanceId: null,
    currentName: null,
    flat: { attack: 12 },
    percent: { critChance: 0.04 }
  },
  resonanceBefore: { counts: {}, active: {} },
  resonanceAfter: { counts: { swordIntent: 1 }, active: {} },
  references: [],
  permissions: {
    canEquip: true,
    canEnhance: true,
    canReforge: true,
    canSell: true,
    canSalvage: true
  }
};
const slots = [
  'weapon', 'head', 'robe', 'bracer',
  'belt', 'boots', 'accessory', 'artifact'
];
const queries = {
  app() {
    return frozenCopy({
      phase: 'game',
      appearance: { indices: {} },
      modals: { break: false, offline: false, legacyRebirth: false }
    });
  },
  navigation() {
    return frozenCopy({
      activeIndex: 0,
      items: [{ id: 'inventory', label: '背包', active: true }]
    });
  },
  top() {
    return frozenCopy({
      name: '青岚',
      pills: {
        lingshi: 100,
        jingqi: 100,
        mood: 100,
        shengwang: 0,
        shouyuan: 100
      },
      realm: '练气三层',
      xiwei: 10,
      need: 100,
      canBreak: false
    });
  },
  home() {
    return frozenCopy({ current: null });
  },
  persistence() {
    return frozenCopy({ locked: false, kind: null, message: '', canRetry: false });
  },
  inventory() {
    return frozenCopy({
      capacity: 20,
      used: 1,
      free: 19,
      categories: ['all', 'equipment'],
      selectedCategory: 'all',
      search: '',
      items: [equipment]
    });
  },
  combatLoadouts() {
    return frozenCopy({
      activeLoadoutId: 'loadout-1',
      plans: [{
        id: 'loadout-1',
        name: '默认方案',
        active: true,
        equipment: slots.map((slot) => slot === 'weapon'
          ? Object.assign({}, equipment, { unlocked: true })
          : {
              slot,
              instanceId: null,
              itemId: null,
              name: null,
              unlocked: slot !== 'artifact'
            })
      }]
    });
  },
  equipmentInfo(input) {
    return input && input.instanceId === equipment.instanceId
      ? frozenCopy(equipment)
      : null;
  },
  breakModal() {
    return null;
  },
  offline() {
    return frozenCopy({ visible: false, reports: [] });
  }
};

function command(name) {
  return (input) => {
    calls.push({ name, input });
    return frozenCopy({
      ok: true,
      code: 'ok',
      changed: true,
      message: null,
      data: input || null
    });
  };
}

const commandNames = [
  'openBreak',
  'switchNav',
  'retryPersistence',
  'sellItem',
  'useItem',
  'expandInventory',
  'equipEquipment',
  'unequipEquipment',
  'enhanceEquipment',
  'reforgeEquipment',
  'setEquipmentFavorite',
  'sellEquipment',
  'salvageEquipment'
];
const commands = {};
commandNames.forEach((name) => {
  commands[name] = command(name);
});
const document = {
  body: root,
  getElementById(id) {
    if (id === 'ui') return root;
    if (id === 'game') return canvas;
    return null;
  },
  createElement(tag) {
    return new MockElement(tag);
  },
  addEventListener() {}
};
const sandbox = {
  document,
  console,
  setTimeout() { return 0; },
  clearTimeout() {},
  innerWidth: 390,
  innerHeight: 760,
  GameAPI: Object.freeze({
    queries: Object.freeze(queries),
    commands: Object.freeze(commands),
    render: Object.freeze({ drawCharacter() {} })
  })
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
require('./ui_scripts').loadUiScripts(vm, sandbox);
sandbox.UI.renderGame();

assert.strictEqual(byClass(root, 'inventory-equipment-dock').length, 1);
assert.strictEqual(byClass(root, 'equipment-dock-slot').length, 8);
assert.strictEqual(byClass(root, 'inventory-scroll-region').length, 1);

const filledDockSlot = byClass(root, 'equipment-dock-slot').find((slot) =>
  slot.classList.contains('filled')
);
assert(filledDockSlot);
filledDockSlot.click();
assert.strictEqual(byClass(root, 'equipment-equipped-tip').length, 1);
assert.strictEqual(byClass(root, 'equipment-tip-unequip').length, 1);

const bagEquipment = byClass(root, 'inv-slot').find((slot) =>
  slot.classList.contains('filled')
);
assert(bagEquipment);
bagEquipment.click();
assert.strictEqual(byClass(root, 'equipment-affix-row').length, 2);
assert.strictEqual(byClass(root, 'equipment-action-equip').length, 1);
assert.strictEqual(byClass(root, 'equipment-action-enhance').length, 1);
assert.strictEqual(byClass(root, 'equipment-action-reforge').length, 1);

byClass(root, 'equipment-action-equip')[0].click();
assert.strictEqual(calls[calls.length - 1].name, 'equipEquipment');
assert.strictEqual(
  calls[calls.length - 1].input.instanceId,
  'eq-ui-1'
);

console.log('equipment UI self-test passed');
