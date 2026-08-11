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

[
  'nie-manifest.js',
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
  'core/stage2-state.js',
  'core/stage3-state.js',
  'core/random.js',
  'core/npc-generator.js',
  'core/npc-roster.js',
  'core/stage4-state.js',
  'core/relationships.js',
  'core/npc-combat-config.js',
  'core/combat-party.js',
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
  'core/team-combat-snapshot.js',
  'core/team-combat-engine.js',
  'core/team-combat-consequences.js',
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
  'game.js'
].forEach((file) => vm.runInContext(
  fs.readFileSync(file, 'utf8'),
  sandbox,
  { filename: file }
));

const api = sandbox.window.GameAPI;
const harness = sandbox.__GameTestHarness;
ok(api && api.queries && api.queries.combat, 'combat query exists');
ok(harness && harness.__test, 'test harness exists');

const base = harness.__test.snapshotModel();
base.schemaVersion = 4;
base.created = true;
base.player = harness.defaultPlayer();
base.player.identity = { gender: 'female' };
base.player.regionId = 'qinglan-town';
base.player.flags = { completedFirstAction: true };
const model = sandbox.Stage4State.migrateV4(base);
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
ok(JSON.stringify(Object.keys(view.active.allies[0]).sort()) === JSON.stringify([
  'actionIntervalTicks', 'cooldownTicks', 'cooperation', 'fallen', 'hp',
  'id', 'maxHp', 'maxQi', 'name', 'qi', 'shield', 'sourceId',
  'sourceType', 'statusEffects', 'techniques'
]), 'team UnitView exposes only the session snapshot fields');
ok(Array.isArray(view.active.allies[0].statusEffects),
  'team UnitView maps snapshot statuses');
ok(Array.isArray(view.active.allies[0].techniques),
  'team UnitView exposes technique slots for skill icons');

console.log('team combat ui selftest passed');
