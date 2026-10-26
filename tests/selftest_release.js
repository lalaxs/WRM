'use strict';

const fs = require('fs');
const path = require('path');

const files = [
  'index.html', 'platform.js', 'game.js', 'game-appearance.js', 'game-persist.js', 'game-runtime.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-commands-combat.js', 'game-commands-homestead.js', 'game-commands-social.js', 'game-commands-sect.js', 'game-commands-legacy.js', 'game-api.js',
  ...require('./ui_scripts').UI_SCRIPT_FILES,
  'styles.css',
  'nie-manifest.js', 'nie-hair-rules.js',
  'core/random.js', 'core/save-system.js',
  'core/simulation-report.js', 'core/state-model.js',
  'core/simulation.js', 'core/game-rules.js'
];

let fail = 0;
for (const file of files) {
  const source = path.join(__dirname, '..', file);
  const target = path.join(__dirname, '..', 'release', file);
  const same = fs.existsSync(target) &&
    fs.readFileSync(source).equals(fs.readFileSync(target));
  if (!same) {
    fail++;
    console.error('  ✗ release drift: ' + file);
  }
}

process.exit(fail ? 1 : 0);
