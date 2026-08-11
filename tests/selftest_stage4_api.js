'use strict';

const fs = require('fs');
const vm = require('vm');

let pass = 0;
let fail = 0;
function ok(value, message) {
  if (value) {
    pass++;
  } else {
    fail++;
    console.error('  ✗ ' + message);
  }
}

function context2d() {
  return new Proxy({}, {
    get(target, key) {
      if (key === 'createLinearGradient') {
        return () => ({ addColorStop() {} });
      }
      if (key === 'measureText') return () => ({ width: 10 });
      return () => {};
    }
  });
}

function canvas() {
  return {
    width: 420,
    height: 820,
    clientWidth: 420,
    clientHeight: 820,
    getContext: context2d,
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 420, height: 820 };
    }
  };
}

const store = {};
let saveCount = 0;
const gameCanvas = canvas();
const platform = new Proxy({}, {
  get(target, key) {
    if (key === 'canvas') return gameCanvas;
    if (key === 'ctx') return context2d();
    if (key === 'view') {
      return {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        safeTop: 0,
        dpr: 1,
        logicalH: 820
      };
    }
    if (key === 'load') return (name) => store[name] || null;
    if (key === 'save') {
      return (name, value) => {
        if (name === 'cloud_save_v1') saveCount++;
        store[name] = JSON.parse(JSON.stringify(value));
        return true;
      };
    }
    if (key === 'createCanvas') return canvas;
    if (key === 'createImage') {
      return () => ({ complete: true, set src(value) {} });
    }
    if (key === 'getSystemInfoAsync') {
      return (options) => options.success({
        pixelRatio: 1,
        safeArea: { top: 0 }
      });
    }
    return () => {};
  }
});

const sandbox = {
  __GAME_TEST_HARNESS_REQUEST__: true,
  Platform: platform,
  console,
  Math,
  Date,
  structuredClone,
  isFinite,
  isNaN,
  parseInt,
  parseFloat,
  requestAnimationFrame() {},
  setTimeout() { return 0; },
  clearTimeout() {},
  addEventListener() {},
  document: {
    hidden: false,
    getElementById(id) { return id === 'game' ? gameCanvas : null; },
    createElement(tag) { return tag === 'canvas' ? canvas() : {
      style: {},
      appendChild() {},
      addEventListener() {}
    }; },
    addEventListener() {}
  }
};
sandbox.window = {
  addEventListener() {},
  NIE_ASSET_BASE: '',
  devicePixelRatio: 1
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const scripts = [
  'nie-manifest.js',
  'content/herblore-parity.js',
  'content/materials.js',
  'content/items.js',
  'content/life-skills.js',
  'content/gathering.js',
  'content/recipes.js',
  'content/homestead.js',
  'content/combat.js',
  'content/techniques.js',
  'content/realms.js',
  'content/regions.js',
  'content/sects.js',
  'content/npc-generation.js',
  'content/social-interactions.js',
  'content/event-templates.js',
  'core/stage2-state.js',
  'core/stage3-state.js',
  'core/random.js',
  'core/npc-generator.js',
  'core/npc-roster.js',
  'core/stage4-state.js',
  'core/relationships.js',
  'core/npc-combat-config.js',
  'core/combat-party.js',
  'core/inventory.js',
  'core/skill-progression.js',
  'core/social.js',
  'core/event-engine.js',
  'core/npc-simulation.js',
  'core/sect-simulation.js',
  'core/gathering.js',
  'core/production.js',
  'core/farm.js',
  'core/formations.js',
  'core/spirit-beasts.js',
  'core/combat-loadouts.js',
  'core/techniques.js',
  'core/combat-stats.js',
  'core/team-combat-snapshot.js',
  'core/team-combat-engine.js',
  'core/team-combat-consequences.js',
  'core/combat-engine.js',
  'core/combat-rewards.js',
  'core/combat-progress.js',
  'core/breakthrough.js',
  'core/save-system.js',
  'core/simulation-report.js',
  'core/state-model.js',
  'core/simulation.js',
  'core/game-rules.js',
  'core/stage2-rules.js',
  'core/stage3-rules.js',
  'core/stage4-rules.js',
  'game.js'
];
scripts.forEach((file) => vm.runInContext(
  fs.readFileSync(file, 'utf8'),
  sandbox,
  { filename: file }
));

const api = sandbox.window.GameAPI;
const harness = sandbox.__GameTestHarness;
const base = harness.__test.snapshotModel();
base.schemaVersion = 4;
base.created = true;
base.player = harness.defaultPlayer();
base.player.identity = { gender: 'female' };
base.player.regionId = 'qinglan-town';
base.player.flags = { completedFirstAction: true };
const model = sandbox.Stage4State.migrateV4(base);
harness.__test.replaceModel(model);

ok(model.schemaVersion === 5, 'v4 model migrates to Stage 4');
ok(Object.keys(model.systems.npcs.records).length === 120,
  'playable world contains 120 permanent people');
[
  'events', 'relationships', 'relationship', 'social',
  'sects', 'sect', 'world', 'combatParty'
].forEach((name) => ok(typeof api.queries[name] === 'function',
  'query exists: ' + name));
[
  'startSocial', 'chooseEvent', 'setCombatCompanion', 'markEventSectionRead'
].forEach((name) => ok(typeof api.commands[name] === 'function',
  'command exists: ' + name));

const relationships = api.queries.relationships({
  search: '',
  sort: 'name'
});
ok(relationships.people.length === 40,
  'relationship list starts with the active 40 people');
ok(Object.isFrozen(relationships) && Object.isFrozen(relationships.people),
  'relationship query is detached and frozen');

const npcId = relationships.people[0].npcId;
const detail = api.queries.relationship({ npcId });
ok(detail && detail.metrics.length === 8,
  'relationship detail exposes all eight directions');
ok(detail.metrics.every((row) =>
  Number.isFinite(row.playerToPerson) &&
  Number.isFinite(row.personToPlayer)),
  'both relationship directions are numeric');

const social = api.queries.social({ npcId });
ok(social && social.interactions.some((row) => row.id === 'talk'),
  'available social actions include talk');
const savesBeforeSocial = saveCount;
const started = api.commands.startSocial({
  npcId,
  interactionId: 'talk'
});
ok(started.ok && started.changed && saveCount === savesBeforeSocial + 1,
  'social starts in the single main slot and saves once: ' +
    JSON.stringify(started) + ', saves=' + saveCount);

const sections = ['summary', 'pending', 'world'];
sections.forEach((section) => {
  const events = api.queries.events({ section });
  ok(events.section === section && Array.isArray(events.items),
    'event section is queryable: ' + section);
});
const mark = api.commands.markEventSectionRead({
  section: 'summary',
  ids: api.queries.events({ section: 'summary' }).items.map((row) => row.id)
});
ok(mark.ok, 'event display metadata can be marked read');

const sects = api.queries.sects();
ok(sects.wandering && sects.sects.length === 5,
  'sect query starts wandering and shows five sects');
ok(api.queries.sect({ sectId: sects.sects[0].id }).memberCount >= 0,
  'sect member count is derived');

const world = api.queries.world({ scope: 'nearby' });
ok(world.regions.length === 8 && Array.isArray(world.people),
  'world query returns abstract regions and people cards');
ok(JSON.stringify(world).indexOf('coordinate') < 0 &&
   JSON.stringify(world).indexOf('latitude') < 0,
  'world query exposes no coordinates');

const partyEligibleNpcId = npcId;
const partyIneligibleNpcId = relationships.people[1].npcId;
const partyModel = harness.__test.snapshotModel();
partyModel.systems.relationships.edges[
  'player>' + partyEligibleNpcId
] = {
  affection: 70,
  trust: 60,
  romanticAttachment: 0,
  desire: 0,
  dependence: 0,
  loyalty: 0,
  jealousy: 0,
  resentment: 0,
  lastChangedAt: 0
};
partyModel.systems.relationships.bonds[
  ['player', partyEligibleNpcId].sort().join('|')
] = { stage: 'friend', changedAt: 0, changedByEventId: 'party-api-seed' };
harness.__test.replaceModel(partyModel);
const partyBefore = api.queries.combatParty();
ok(partyBefore.eligible.some((row) => row.npcId === partyEligibleNpcId) &&
   !partyBefore.eligible.some((row) => row.npcId === partyIneligibleNpcId),
  'combat party query distinguishes eligible and ineligible NPCs');
const savesBeforeParty = saveCount;
const selectedParty = api.commands.setCombatCompanion({
  slotIndex: 1,
  npcId: partyEligibleNpcId
});
const partyAfter = api.queries.combatParty();
const savedParty = store.cloud_save_v1 &&
  store.cloud_save_v1.systems &&
  store.cloud_save_v1.systems.teamCombat;
ok(selectedParty.ok && selectedParty.changed &&
   saveCount === savesBeforeParty + 1 &&
   partyAfter.slots[1].npcId === partyEligibleNpcId &&
   savedParty && savedParty.companionIds[1] === partyEligibleNpcId,
  'combat party command updates query and persisted snapshot');
const rejectedParty = api.commands.setCombatCompanion({
  slotIndex: 1,
  npcId: partyIneligibleNpcId
});
ok(!rejectedParty.ok &&
   api.queries.combatParty().slots[1].npcId === partyEligibleNpcId &&
   saveCount === savesBeforeParty + 1,
  'ineligible combat companion is rejected without replacing selection');

console.log(
  '\nStage 4 基础 API 自测：' + pass + ' 通过 / ' + fail + ' 失败'
);
if (fail) process.exitCode = 1;
