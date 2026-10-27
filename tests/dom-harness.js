// UI migration self-test: load game.js + ui.js in a small browser-like VM and
// verify the public query/command/render boundary plus persistence recovery UI.
const fs = require('fs');
const vm = require('vm');
const SimulationReportNode = require('../core/simulation-report.js');
const SaveSystemNode = require('../core/save-system.js');

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
      if (property === 'createLinearGradient') {
        return () => ({ addColorStop() {} });
      }
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
    this.style = {
      setProperty(name, value) {
        this[name] = value;
      },
      removeProperty(name) {
        delete this[name];
      }
    };
    this.classList = new ClassList();
    this._text = '';
    this._handlers = {};
    this.width = 0;
    this.height = 0;
    this.clientWidth = this.tagName === 'CANVAS' ? 56 : 0;
    this.clientHeight = this.tagName === 'CANVAS' ? 56 : 0;
    this.disabled = false;
    this.value = '';
    this.type = '';
    this.placeholder = '';
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
    child.parentNode = this;
    return child;
  }
  get childNodes() { return this.children; }
  get firstChild() { return this.children[0] || null; }
  get lastChild() {
    return this.children[this.children.length - 1] || null;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) this.children.splice(idx, 1);
    return child;
  }
  insertBefore(child, reference) {
    if (reference == null) {
      this.children.push(child);
    } else {
      const idx = this.children.indexOf(reference);
      if (idx < 0) this.children.push(child);
      else this.children.splice(idx, 0, child);
    }
    child.parent = this;
    return child;
  }
  replaceChild(next, old) { const i = this.children.indexOf(old); if (i >= 0) this.children[i] = next; next.parent = next.parentNode = this; return old; }
  contains(node) { return this.find(el => el === node).length > 0; }
  querySelectorAll(selector) { const parts = selector.trim().split('.').filter(Boolean); return this.find(el => el !== this && parts.every(c => el.classList && el.classList.contains(c))); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(event, handler) {
    (this._handlers[event] = this._handlers[event] || []).push(handler);
  }
  click() {
    if (this.disabled) return;
    (this._handlers.click || []).forEach((handler) => handler({ target: this, stopPropagation() {}, preventDefault() {} }));
  }
  dispatch(event) {
    (this._handlers[event] || []).forEach((handler) => handler({
      target: this
    }));
  }
  getContext() { return stubCtx(); }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 420, height: 820 };
  }
  setAttribute(name, value) {
    this.attributes = this.attributes || {};
    this.attributes[name] = String(value);
    if (name === 'title') this.title = String(value);
  }
  getAttribute(name) {
    this.attributes = this.attributes || {};
    return this.attributes[name];
  }
  removeAttribute(name) {
    if (this.attributes) delete this.attributes[name];
  }
  find(predicate, output) {
    output = output || [];
    if (predicate(this)) output.push(this);
    this.children.forEach((child) => {
      if (child.find) child.find(predicate, output);
    });
    return output;
  }
}

function stubCanvas() {
  const canvas = new MockEl('canvas');
  canvas.getContext = () => stubCtx();
  return canvas;
}

function byClass(root, className) {
  return root.find((element) =>
    element.classList && element.classList.contains(className)
  );
}

function allText(root) {
  return root.find(() => true)
    .map((element) => element.textContent)
    .filter(Boolean)
    .join('\n');
}

function inside(root, parentClass, childClass) {
  return byClass(root, parentClass).flatMap((parent) =>
    byClass(parent, childClass)
  );
}

function firstClass(root, className, index) {
  return byClass(root, className)[index || 0] || new MockEl('div');
}

function fixedDate(now) {
  return class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
}

function createRuntime(store, now, controls, withUI, options) {
  controls = controls || { saveMode: 'ok', saveAttempts: 0 };
  options = options || {};
  const canvas = stubCanvas();
  const uiRoot = new MockEl('div');
  uiRoot.id = 'ui';
  const scheduledFrames = [];
  const rendererCalls = [];
  const document = {
    getElementById(id) {
      if (id === 'game') return canvas;
      if (id === 'ui') return uiRoot;
      return null;
    },
    createTextNode(text) { const node = new MockEl('span'); node.textContent = text; return node; },
    createElement(tag) {
      return tag === 'canvas' ? stubCanvas() : new MockEl(tag);
    },
    addEventListener() {},
    hidden: false
  };
  const view = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    safeTop: 0,
    dpr: 1,
    logicalH: 820
  };
  const platform = new Proxy({}, {
    get(target, property) {
      if (property === 'canvas') return canvas;
      if (property === 'ctx') return stubCtx();
      if (property === 'view') return view;
      if (property === 'load') {
        return (key) => key in store ? JSON.parse(store[key]) : null;
      }
      if (property === 'save') {
        return (key, value) => {
          controls.saveAttempts = (controls.saveAttempts || 0) + 1;
          const outcome = controls.saveOutcomes &&
            controls.saveOutcomes.length
            ? controls.saveOutcomes.shift()
            : controls.saveMode;
          if (outcome === false || outcome === 'false') return false;
          if (outcome === 'throw') throw new Error('storage unavailable');
          store[key] = JSON.stringify(value);
          return true;
        };
      }
      if (property === 'createImage') {
        return () => ({
          complete: true,
          onload: null,
          onerror: null,
          set src(value) {}
        });
      }
      if (property === 'createCanvas') return () => stubCanvas();
      if (property === 'getSystemInfoAsync') {
        return (options) => {
          if (options && options.success) {
            options.success({
              pixelRatio: 1,
              safeArea: { top: 0 }
            });
          }
        };
      }
      return () => {};
    }
  });
  const windowFacade = {
    addEventListener() {},
    NIE_ASSET_BASE: '',
    devicePixelRatio: 1
  };
  const sandbox = {
    __GAME_TEST_HARNESS_REQUEST__: !!options.requestTestHarness,
    Platform: platform,
    document,
    window: windowFacade,
    console,
    Math,
    Date: fixedDate(now),
    isFinite,
    isNaN,
    parseInt,
    parseFloat,
    requestAnimationFrame(callback) {
      if (options.captureFrames && typeof callback === 'function') {
        scheduledFrames.push(callback);
      }
    },
    setTimeout() { return 0; },
    clearTimeout() {},
    Proxy,
    RegExp,
    Error,
    Set,
    structuredClone
  };
  if (options.browserTopology) {
    sandbox.addEventListener = windowFacade.addEventListener;
    sandbox.NIE_ASSET_BASE = '';
    sandbox.devicePixelRatio = 1;
    sandbox.window = sandbox;
  }
  sandbox.globalThis = sandbox;
  if (options.interceptRenderer) {
    sandbox.window.UI = {
      renderGame() {
        rendererCalls.push(Array.from(arguments));
      }
    };
  }
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync('nie-manifest.js', 'utf8'),
    sandbox,
    { filename: 'nie-manifest.js' }
  );
  vm.runInContext(
    fs.readFileSync('nie-hair-rules.js', 'utf8'),
    sandbox,
    { filename: 'nie-hair-rules.js' }
  );
  require('./runtime-scripts').loadHerblore(vm, sandbox);
  require('./runtime-scripts').DEPENDENCIES.forEach(file => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  });
  if (options.instrumentStage2ModelReads) {
    const baseStateModel = sandbox.StateModel;
    controls.stage2ModelReads = 0;
    sandbox.StateModel = Object.freeze(Object.assign({}, baseStateModel, {
      fromRuntime() {
        controls.stage2ModelReads++;
        return baseStateModel.fromRuntime.apply(baseStateModel, arguments);
      }
    }));
  }
  ['game.js', 'game-appearance.js', 'game-persist.js', 'game-runtime.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-commands-combat.js', 'game-commands-homestead.js', 'game-commands-social.js', 'game-commands-sect.js', 'game-commands-legacy.js', 'game-api.js'].forEach((file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  });
  if (withUI) {
    const { loadUiScripts } = require('./ui_scripts');
    loadUiScripts(vm, sandbox);
  }
  return {
    api: sandbox.window.GameAPI,
    ui: sandbox.window.UI,
    root: uiRoot,
    sandbox,
    controls,
    store,
    scheduledFrames,
    rendererCalls
  };
}

module.exports = { createRuntime, MockEl, byClass, allText, firstClass };
