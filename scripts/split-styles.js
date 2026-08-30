'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'styles.css');
const SHELL = path.join(ROOT, 'styles-shell.css');
const GAME = path.join(ROOT, 'styles-game.css');

// Prefer re-splitting from a full styles.css if it still has Stage 3 section.
let full = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
if (!full.includes('Stage 3：沿用既有右侧内容区的战斗与功法组件')) {
  // Already split/compat — rebuild full from parts if present
  if (fs.existsSync(SHELL) && fs.existsSync(GAME)) {
    full = fs.readFileSync(SHELL, 'utf8').replace(/\r\n/g, '\n') +
      fs.readFileSync(GAME, 'utf8').replace(/\r\n/g, '\n');
  } else {
    throw new Error('Cannot find Stage 3 split marker in styles.css');
  }
}

const lines = full.split('\n');
let splitAt = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Stage 3：沿用既有右侧内容区的战斗与功法组件')) {
    splitAt = i;
    break;
  }
}
if (splitAt < 0) throw new Error('Stage 3 marker not found');

const shell = lines.slice(0, splitAt).join('\n') + '\n';
const game =
  '/* ============================================================\n' +
  '   styles-game.css — combat / social / lineage / battle UI\n' +
  '   Loaded after entering game via LazyContent.ensureGameStyles()\n' +
  '   ============================================================ */\n' +
  lines.slice(splitAt).join('\n').replace(/^\n/, '') +
  (full.endsWith('\n') ? '' : '\n');

fs.writeFileSync(SHELL, shell);
fs.writeFileSync(GAME, game);
// Compatibility bundle for tests that grep a single styles.css
fs.writeFileSync(SRC, shell + game);

console.log('styles-shell.css', fs.statSync(SHELL).size);
console.log('styles-game.css', fs.statSync(GAME).size);
console.log('styles.css (bundle)', fs.statSync(SRC).size);
console.log('split at line', splitAt + 1);
