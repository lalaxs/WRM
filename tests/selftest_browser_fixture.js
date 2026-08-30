'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0;
let fail = 0;
function ok(condition, message) {
  if (condition) {
    pass++;
  } else {
    fail++;
    console.error('  ✗ ' + message);
  }
}

const root = path.join(__dirname, '..');
const fixtureDirectory = path.join(root, 'test-fixtures');
const fixtureHtmlPath = path.join(
  fixtureDirectory,
  'stage2-engineering-save.html'
);
const fixtureScriptPath = path.join(
  fixtureDirectory,
  'stage2-engineering-save.js'
);

ok(
  fs.existsSync(fixtureHtmlPath),
  'engineering save fixture HTML exists outside production runtime'
);
ok(
  fs.existsSync(fixtureScriptPath),
  'engineering save fixture script exists outside production runtime'
);

if (!fs.existsSync(fixtureHtmlPath) ||
    !fs.existsSync(fixtureScriptPath)) {
  console.error(
    `\n=== 浏览器工程夹具自测失败：${pass} 通过 / ${fail} 失败 ===`
  );
  process.exit(1);
}

const fixtureHtml = fs.readFileSync(fixtureHtmlPath, 'utf8');
const fixtureScript = fs.readFileSync(fixtureScriptPath, 'utf8');
const expectedScripts = [
  '../content/herblore-parity.js',
  '../content/materials.js',
  '../content/items.js',
  '../content/life-skills.js',
  '../content/gathering.js',
  '../content/recipes.js',
  '../content/homestead.js',
  '../content/combat.js',
  '../content/techniques.js',
  '../content/realms.js',
  '../content/regions.js',
  '../content/sects.js',
  '../content/sect-offices.js',
  '../content/sect-missions.js',
  '../content/sect-pavilion.js',
  '../content/npc-generation.js',
  '../content/social-interactions.js',
  '../content/world-event-narratives.js',
  '../core/stage2-state.js',
  '../core/stage3-state.js',
  '../core/random.js',
  '../core/npc-generator.js',
  '../core/npc-roster.js',
  '../core/person-factory.js',
  '../core/relation-seed.js',
  '../core/sect-offices.js',
  '../core/sect-missions.js',
  '../core/sect-pavilion.js',
  '../core/stage4-state.js',
  '../core/save-system.js',
  'stage2-engineering-save.js'
];
const actualScripts = Array.from(
  fixtureHtml.matchAll(/<script\s+src="([^"]+)"\s*><\/script>/g),
  (match) => match[1]
);
ok(
  JSON.stringify(actualScripts) === JSON.stringify(expectedScripts),
  'fixture loads only canonical content/state/save modules plus its seed script'
);
ok(
  !/[?&](?:debug|fixture|test)=/i.test(fixtureHtml + fixtureScript),
  'fixture uses no production debug query parameter'
);

const productionText = [
  'index.html',
  'game.js',
  'game-queries.js',
  'game-queries-social.js',
  'game-queries-combat.js',
  'game-commands.js',
  'game-api.js',
  ...require('./ui_scripts').UI_SCRIPT_FILES
]
  .map((relativePath) =>
    fs.readFileSync(path.join(root, relativePath), 'utf8')
  )
  .join('\n');
ok(
  !/stage2-engineering-save|test-fixtures/i.test(productionText),
  'production entry and runtime do not reference the engineering fixture'
);

const syncRelease = require('../scripts/sync-release.js');
ok(
  !syncRelease.RUNTIME_FILES.some((entry) => entry === 'test-fixtures' ||
    entry.startsWith('test-fixtures/')),
  'release synchronizer allowlist excludes test-fixtures'
);
ok(
  !fs.existsSync(path.join(root, 'release', 'test-fixtures')),
  'release output contains no engineering fixture directory'
);

const fixedNow = 1735689600000;
const storage = new Map();
let redirectedTo = null;
const statusNode = {
  textContent: '',
  dataset: {}
};
const sandbox = {
  console,
  Date: { now: () => fixedNow },
  document: {
    getElementById(id) {
      return id === 'fixture-status' ? statusNode : null;
    }
  },
  localStorage: {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    removeItem(key) {
      storage.delete(key);
    },
    setItem(key, value) {
      storage.set(key, String(value));
    }
  },
  location: {
    replace(target) {
      redirectedTo = target;
    }
  }
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

for (const relativeScript of actualScripts) {
  const absoluteScript = path.resolve(fixtureDirectory, relativeScript);
  vm.runInContext(
    fs.readFileSync(absoluteScript, 'utf8'),
    sandbox,
    { filename: absoluteScript }
  );
}

const adapter = {
  load(key) {
    const value = storage.get(key);
    return value == null ? null : JSON.parse(value);
  },
  save(key, value) {
    storage.set(key, JSON.stringify(value));
    return true;
  }
};
const loaded = sandbox.SaveSystem.load(adapter, fixedNow);
const snapshot = loaded.snapshot;
ok(
  redirectedTo === '../index.html',
  'fixture redirects to the canonical index after persistence'
);
ok(
  loaded.source === 'snapshot' &&
    loaded.migrated === false &&
    loaded.needsRepair === false &&
    snapshot.schemaVersion === 5 &&
    snapshot.created === true,
  'fixture persists and reloads as a canonical Stage 4 v5 snapshot'
);
ok(
  snapshot.player.name === '工程验收' &&
    (snapshot.player.inventory.stacks.gatheringFormation === 1 ||
      snapshot.systems.homestead.formations.owned.includes(
        'gatheringFormation'
      )) &&
    !snapshot.player.inventory.bindings.gatheringFormation,
  'fixture exposes one unbound formation item ready for UI equip'
);
ok(
  snapshot.systems.homestead.formations.slots[0] === null &&
    snapshot.systems.homestead.formations.owned.includes(
      'gatheringFormation'
    ),
  'fixture exposes one empty slot and one owned formation'
);
ok(
  snapshot.systems.homestead.beasts.activeIds.length === 0 &&
    snapshot.systems.homestead.beasts.roster.length === 1 &&
    snapshot.systems.homestead.beasts.roster[0].id === 'beast-1',
  'fixture exposes one unselected assistant beast'
);
const fixtureHerbSpot = Array.isArray(snapshot.systems.gathering.spots.herb)
  ? snapshot.systems.gathering.spots.herb[0]
  : snapshot.systems.gathering.spots.herb;
ok(
  snapshot.current &&
    snapshot.current.key ===
      'gather:collect:herb:parityHerb1' &&
    snapshot.current.mode === 'repeat' &&
    fixtureHerbSpot &&
    fixtureHerbSpot.remaining === 25,
  'fixture loads with a durable canonical main action in progress'
);
ok(
  statusNode.dataset.state === 'ready',
  'fixture records ready status before redirect'
);

console.log(
  `\n=== 浏览器工程夹具自测：${pass} 通过 / ${fail} 失败 ===`
);
process.exit(fail ? 1 : 0);
