'use strict';

// Reuse production ordering instead of maintaining incomplete Stage 2/4 lists.
const fs = require('fs');
const Runtime = require('../runtime-modules.js');

const DEPENDENCIES = Runtime.BOOT_SCRIPTS.filter(file =>
  !Runtime.GAME_SCRIPTS.includes(file) &&
  !Runtime.UI_BOOT_SCRIPTS.includes(file) &&
  !['platform.js', 'AdManager.js', 'core/lazy-content.js'].includes(file)
).concat(Runtime.COMBAT_RUNTIME_SCRIPTS);

function loadHerblore(vm, sandbox) {
  vm.runInContext(fs.readFileSync('content/herblore-parity.js', 'utf8'), sandbox);
  vm.runInContext('HerbloreParityContent.loadFromData(JSON.parse(' +
    JSON.stringify(fs.readFileSync('content/herblore-parity.json', 'utf8')) + '))', sandbox);
}

module.exports = { DEPENDENCIES, loadHerblore };
