'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const Runtime = require('../runtime-modules.js');

function layerFor(file) {
  return Runtime.DEPENDENCY_LAYERS.find(layer => layer.owns.some(owned =>
    owned.endsWith('/') ? file.startsWith(owned) : file === owned));
}

function violations(file, source) {
  const from = layerFor(file);
  if (!from) return [];
  return Array.from(source.matchAll(/\brequire\s*\(\s*['"](\.[^'"]*)['"]\s*\)/g))
    .flatMap(match => {
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]));
      const to = layerFor(resolved);
      return to && !from.mayDependOn.includes(to.id)
        ? [file + ' must not depend on ' + resolved] : [];
    });
}

const files = new Set(Runtime.BOOT_SCRIPTS.concat(Runtime.COMBAT_RUNTIME_SCRIPTS,
  Runtime.UI_PAGE_SCRIPTS, Runtime.DEFERRED_DATA).filter(file => file.endsWith('.js')));
const errors = Array.from(files).flatMap(file => violations(file, fs.readFileSync(file, 'utf8')));
assert.deepStrictEqual(errors, [], errors.join('\n'));
assert.strictEqual(violations('content/example.js', "require('../core/dns.js')").length, 1);
assert.strictEqual(violations('core/example.js', "require('../game.js')").length, 1);
assert.strictEqual(violations('core/example.js', "require('../content/game-config.js')").length, 0);
assert.strictEqual(violations('ui/example.js', "require('../core/save-system.js')").length, 1);
console.log('Runtime dependency direction checks passed');
