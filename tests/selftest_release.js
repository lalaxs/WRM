'use strict';

const fs = require('fs');
const path = require('path');

const files = [
  'index.html', 'platform.js', 'game.js', 'ui.js', 'styles.css',
  'nie-manifest.js',
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
