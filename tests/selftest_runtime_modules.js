'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const RuntimeModules = require('../runtime-modules.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const bootErrors = RuntimeModules.validateBootHtml(html);
bootErrors.forEach(function (error) {
  console.error('FAIL:', error);
});
assert.strictEqual(bootErrors.length, 0, 'index.html matches RuntimeModules boot contract');

assert.ok(
  RuntimeModules.BOOT_SCRIPTS.indexOf('runtime-modules.js') >= 0,
  'runtime-modules.js itself is in the boot list'
);
assert.ok(
  RuntimeModules.BOOT_SCRIPTS.indexOf('core/lazy-content.js') >
    RuntimeModules.BOOT_SCRIPTS.indexOf('runtime-modules.js'),
  'lazy-content loads after runtime-modules'
);

assert.strictEqual(
  RuntimeModules.COMBAT_RUNTIME_SCRIPTS.length,
  RuntimeModules.COMBAT_RUNTIME_GLOBALS.length,
  'combat runtime scripts align with global names'
);

const uiSources = RuntimeModules.UI_TEST_SCRIPTS.map(function (rel) {
  return {
    name: rel,
    source: fs.readFileSync(path.join(root, rel), 'utf8')
  };
});
const isolationErrors = RuntimeModules.validateUiIsolation(uiSources);
isolationErrors.forEach(function (error) {
  console.error('FAIL:', error);
});
assert.strictEqual(
  isolationErrors.length,
  0,
  'UI scripts stay isolated from core/content/SaveSystem'
);

const LazyContent = require('../core/lazy-content.js');
assert.deepStrictEqual(
  LazyContent.UI_PAGE_SCRIPTS.slice(),
  RuntimeModules.UI_PAGE_SCRIPTS.slice(),
  'LazyContent UI pages come from RuntimeModules'
);
assert.deepStrictEqual(
  LazyContent.COMBAT_RUNTIME_SCRIPTS.slice(),
  RuntimeModules.COMBAT_RUNTIME_SCRIPTS.slice(),
  'LazyContent combat runtime comes from RuntimeModules'
);

const layers = RuntimeModules.DEPENDENCY_LAYERS.map(function (layer) {
  return layer.id;
});
assert.deepStrictEqual(
  layers,
  ['platform', 'content', 'core', 'game', 'ui'],
  'dependency layers stay ordered platform→…→ui'
);

console.log('runtime modules contract selftest passed');
console.log('  boot scripts:', RuntimeModules.BOOT_SCRIPTS.length);
console.log('  deferred UI pages:', RuntimeModules.UI_PAGE_SCRIPTS.length);
console.log('  deferred combat:', RuntimeModules.COMBAT_RUNTIME_SCRIPTS.length);
