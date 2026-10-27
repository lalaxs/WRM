'use strict';

const fs = require('fs');
const vm = require('vm');

function ok(value, message) {
  if (!value) throw new Error(message);
}

function context2d() {
  return new Proxy({}, {
    get(target, key) {
      if (key === 'createLinearGradient') {
        return () => ({ addColorStop() {} });
      }
      if (key === 'measureText') return () => ({ width: 10 });
      return () => {};
    }
  });
}

function canvas() {
  return {
    width: 420,
    height: 820,
    clientWidth: 420,
    clientHeight: 820,
    getContext: context2d,
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 420, height: 820 };
    }
  };
}

const store = {};
const gameCanvas = canvas();
const platform = new Proxy({}, {
  get(target, key) {
    if (key === 'canvas') return gameCanvas;
    if (key === 'ctx') return context2d();
    if (key === 'view') {
      return {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        safeTop: 0,
        dpr: 1,
        logicalH: 820
      };
    }
    if (key === 'load') return (name) => store[name] || null;
    if (key === 'save') {
      return (name, value) => {
        store[name] = JSON.parse(JSON.stringify(value));
        return true;
      };
    }
    if (key === 'createCanvas') return canvas;
    if (key === 'createImage') {
      return () => ({ complete: true, set src(value) {} });
    }
    if (key === 'getSystemInfoAsync') {
      return (options) => options.success({
        pixelRatio: 1,
        safeArea: { top: 0 }
      });
    }
    return () => {};
  }
});

const sandbox = {
  __GAME_TEST_HARNESS_REQUEST__: true,
  Platform: platform,
  console,
  Math,
  Date,
  structuredClone,
  isFinite,
  isNaN,
  parseInt,
  parseFloat,
  requestAnimationFrame() {},
  setTimeout() { return 0; },
  clearTimeout() {},
  addEventListener() {},
  document: {
    hidden: false,
    getElementById(id) { return id === 'game' ? gameCanvas : null; },
    createElement(tag) { return tag === 'canvas' ? canvas() : {
      style: {},
      appendChild() {},
      addEventListener() {}
    }; },
    addEventListener() {}
  }
};
sandbox.window = {
  addEventListener() {},
  NIE_ASSET_BASE: '',
  devicePixelRatio: 1
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
require('./runtime-scripts').loadHerblore(vm, sandbox);

require('./runtime-scripts').DEPENDENCIES.concat(require('../runtime-modules').GAME_SCRIPTS).forEach((file) => vm.runInContext(
  fs.readFileSync(file, 'utf8'),
  sandbox,
  { filename: file }
));

const api = sandbox.window.GameAPI;
const harness = sandbox.__GameTestHarness;
ok(api && api.queries && api.queries.combat, 'combat query exists');
ok(harness && harness.__test, 'test harness exists');

const base = harness.__test.snapshotModel();
base.schemaVersion = 5;
base.created = true;
base.player = harness.defaultPlayer();
base.player.identity = { gender: 'female' };
base.player.regionId = 'qinglan-town';
base.player.flags = { completedFirstAction: true };
base.player.shouyuan = 120;
base.player.shouMax = 120;
const model = sandbox.Stage4State.normalize(
  sandbox.Stage4State.ensureWorldPopulation(
    sandbox.Stage4State.normalize(base)
  )
);
harness.__test.replaceModel(model);
const started = api.commands.startAction({
  key: 'combat:region:qingyunOutskirts:thornHare'
});
ok(started.ok, 'team combat starts through the public command');

const view = api.queries.combat({ tab: 'regions' });
ok(view.active && view.active.layout === 'vertical-team',
  'team layout is exposed');
ok(view.active.allies.length === 1, 'allies view exposed');
ok(view.active.enemies.length === 1, 'enemies view exposed');
ok(view.active.allies[0].sourceType === 'player', 'ally source preserved');
ok(view.active.enemies[0].name === '棘刺兔', 'enemy name preserved');
const allyKeys = Object.keys(view.active.allies[0]).sort();
const expectedAllyKeys = [
  'actionIntervalTicks', 'cooldownTicks', 'cooperation', 'fallen', 'hp',
  'id', 'maxHp', 'maxQi', 'name', 'portraitSrc', 'qi', 'rank', 'shield',
  'sourceId', 'sourceType', 'statusEffects', 'techniques'
];
ok(JSON.stringify(allyKeys) === JSON.stringify(expectedAllyKeys),
  'team UnitView exposes only the session snapshot fields');
ok(Array.isArray(view.active.allies[0].statusEffects),
  'team UnitView maps snapshot statuses');
ok(Array.isArray(view.active.allies[0].techniques),
  'team UnitView exposes technique slots for skill icons');

console.log('team combat ui selftest passed');
