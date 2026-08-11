'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_256 = path.join(ROOT, 'assets', 'enemy-portraits', '256');
const OUT_512 = path.join(ROOT, 'assets', 'enemy-portraits', '512');

const ART_BATCHES = [
  // Prefer later batches when the same id appears in multiple places.
  'docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster-cartoon-v2',
  'docs/art/enemy-prototypes/2026-08-01-dungeon-enemies-color-v2'
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function collectArt() {
  const art = new Map();
  ART_BATCHES.forEach(function (rel) {
    const dir = path.join(ROOT, rel);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(function (file) {
      const match = file.match(/^(.+)-(source|preview)\.png$/);
      if (!match) return;
      const id = match[1];
      const kind = match[2];
      if (!art.has(id)) art.set(id, {});
      art.get(id)[kind] = path.join(dir, file);
      art.get(id).batch = rel;
    });
  });
  return art;
}

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

function copyFile(from, to) {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}

function main() {
  ensureDir(OUT_256);
  ensureDir(OUT_512);
  const art = collectArt();
  const enemies = gameEnemyIds();
  const installed = [];
  const missing = [];
  const orphanArt = [];

  enemies.forEach(function (id) {
    const row = art.get(id);
    if (!row || !row.preview || !row.source) {
      missing.push(id);
      return;
    }
    copyFile(row.preview, path.join(OUT_256, id + '.png'));
    copyFile(row.source, path.join(OUT_512, id + '.png'));
    installed.push(id);
  });

  art.forEach(function (row, id) {
    if (enemies.indexOf(id) >= 0) return;
    if (row.preview && row.source) orphanArt.push(id);
  });

  const report = {
    installedGameEnemies: installed.length,
    missingGameEnemies: missing,
    orphanArtNotInContent: orphanArt.sort(),
    out256: path.relative(ROOT, OUT_256).replace(/\\/g, '/'),
    out512: path.relative(ROOT, OUT_512).replace(/\\/g, '/')
  };
  console.log(JSON.stringify(report, null, 2));
  if (missing.length) process.exitCode = 1;
}

main();
