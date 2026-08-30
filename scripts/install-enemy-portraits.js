'use strict';

/**
 * 校验运行时敌人立绘是否齐全。
 * 正式资产仅保留 assets/enemy-portraits/256/。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR_256 = path.join(ROOT, 'assets', 'enemy-portraits', '256');

function gameEnemyIds() {
  const src = fs.readFileSync(path.join(ROOT, 'content', 'combat.js'), 'utf8');
  const ids = new Set();
  for (const m of src.matchAll(/normalEnemyIds:\s*\[([^\]]+)\]/g)) {
    for (const id of m[1].matchAll(/'([^']+)'/g)) ids.add(id[1]);
  }
  for (const m of src.matchAll(/(?:eliteId|bossId):\s*'([^']+)'/g)) {
    ids.add(m[1]);
  }
  for (const m of src.matchAll(/enemyId:\s*'([^']+)'/g)) {
    ids.add(m[1]);
  }
  return [...ids].sort();
}

function listPngIds(dir) {
  if (!fs.existsSync(dir)) return new Set();
  return new Set(
    fs
      .readdirSync(dir)
      .filter(function (f) {
        return f.endsWith('.png');
      })
      .map(function (f) {
        return f.replace(/\.png$/, '');
      })
  );
}

function main() {
  const enemies = gameEnemyIds();
  const have256 = listPngIds(DIR_256);
  const missing256 = [];
  const orphan256 = [];

  enemies.forEach(function (id) {
    if (!have256.has(id)) missing256.push(id);
  });
  have256.forEach(function (id) {
    if (enemies.indexOf(id) < 0) orphan256.push(id);
  });

  const report = {
    gameEnemyCount: enemies.length,
    missing256: missing256,
    orphan256: orphan256.sort(),
    dir256: 'assets/enemy-portraits/256'
  };
  console.log(JSON.stringify(report, null, 2));
  if (missing256.length) process.exitCode = 1;
}

main();
