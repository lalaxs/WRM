'use strict';

const fs = require('fs');
const path = require('path');

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assert failed');
}

const ROOT = path.join(__dirname, '..');
const Combat = require('../content/combat.js');
const enemies = Object.values(Combat.ENEMIES);

assert(enemies.length === 45, 'expected 45 combat enemies');

const missingFiles = [];
enemies.forEach(function (enemy) {
  assert(typeof enemy.portraitSrc === 'string' && enemy.portraitSrc, enemy.id + ' portraitSrc');
  assert(
    enemy.portraitSrc === 'assets/enemy-portraits/256/' + enemy.id + '.png',
    enemy.id + ' portraitSrc path'
  );
  const abs = path.join(ROOT, enemy.portraitSrc);
  if (!fs.existsSync(abs)) missingFiles.push(enemy.id);
  const master = path.join(ROOT, 'assets/enemy-portraits/512/' + enemy.id + '.png');
  assert(fs.existsSync(master), enemy.id + ' 512 master exists');
});

assert(missingFiles.length === 0, 'missing portrait files: ' + missingFiles.join(','));

const progressSrc = fs.readFileSync(path.join(ROOT, 'core/combat-progress.js'), 'utf8');
assert(
  progressSrc.includes("portraitSrc: dataValue(enemy, 'portraitSrc')"),
  'query exposes enemy portraitSrc'
);

const uiSrc = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
assert(uiSrc.includes('resolveEnemyPortraitSrc'), 'UI resolves portrait sources');
assert(uiSrc.includes('enemy-portrait-img'), 'battle UI can render portrait images');
assert(uiSrc.includes('region-enemy-art'), 'region list can render portrait images');

console.log('OK: enemy portraits wired for ' + enemies.length + ' enemies');
