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
  'content/sect-offices.js',
  'content/sect-missions.js',
  'content/sect-pavilion.js',
  'content/npc-generation.js',
  'content/social-interactions.js',
  'content/world-event-narratives.js',
  'core/stage2-state.js',
  'core/stage3-state.js',
  'core/random.js',
  'core/npc-generator.js',
  'core/npc-roster.js',
  'core/person-factory.js',
  'core/relation-seed.js',
  'core/sect-offices.js',
  'core/sect-missions.js',
  'core/sect-pavilion.js',
  'core/stage4-state.js',
  'core/relationships.js',
  'core/dns.js',
  'core/person-graph.js',
  'core/event-core.js',
  'core/world-event-picker.js',
  'core/world-calendar.js',
  'core/world-narrative-fill.js',
  'core/world-romance.js',
  'core/world-event-gen.js',
  'core/world-month.js',
  'core/npc-combat-config.js',
  'core/combat-party.js',
  'core/inventory.js',
  'core/skill-progression.js',
  'core/social.js',
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
  'game.js',
  'game-queries.js',
  'game-queries-social.js',
  'game-queries-combat.js',
  'game-commands.js',
  'game-api.js'
];
scripts.forEach((file) => vm.runInContext(
  fs.readFileSync(file, 'utf8'),
  sandbox,
  { filename: file }
));

const api = sandbox.window.GameAPI;
const harness = sandbox.__GameTestHarness;
const base = harness.__test.snapshotModel();
base.schemaVersion = 5;
base.created = true;
base.player = harness.defaultPlayer();
base.player.identity = { gender: 'female' };
base.player.regionId = 'qinglan-town';
base.player.flags = { completedFirstAction: true };
base.player.shouyuan = 120;
base.player.shouMax = 120;
const model = sandbox.Stage4State.normalize(
  sandbox.Stage4State.ensureWorldPopulation(
    sandbox.Stage4State.normalize(base)
  )
);
harness.__test.replaceModel(model);

ok(model.schemaVersion === 5, 'v5 model normalizes through Stage 4');
const openingCount = Object.keys(model.systems.npcs.records).length;
ok(openingCount >= 3 && openingCount <= 12 &&
  model.player.kin &&
  !model.player.kin.mo &&
  Array.isArray(model.player.kin.frs) &&
  model.player.kin.frs.length >= 2,
  'playable world opens with kinship circle, not 120 strangers');
// 关系页只列已认识的人；社交还需同地。
(model.systems.npcs.activeIds || []).forEach(function (id) {
  const person = model.systems.npcs.records[id];
  if (!person) return;
  person.metPlayer = true;
  person.regionId = model.player.regionId || 'qinglan-town';
  person.activityStatus = 'normal';
});
harness.__test.replaceModel(model);
[
  'events', 'relationships', 'relationship', 'social',
  'sects', 'sect', 'sectPavilion', 'world', 'combatParty'
].forEach((name) => ok(typeof api.queries[name] === 'function',
  'query exists: ' + name));
[
  'startSocial', 'chooseEvent', 'chooseSect',
  'acceptSectMission', 'advanceSectMission', 'startSectMissionCombat',
  'claimSectMission', 'exchangeSectTechnique', 'promoteSectDisciple',
  'setCombatCompanion', 'markEventSectionRead'
].forEach((name) => ok(typeof api.commands[name] === 'function',
  'command exists: ' + name));

const relationships = api.queries.relationships({
  search: '',
  sort: 'name'
});
ok(relationships.people.length === openingCount && openingCount >= 3,
  'relationship list starts with the kinship opening circle');
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

const eventsView = api.queries.events({ section: 'world' });
ok(eventsView.section === 'world' && Array.isArray(eventsView.items),
  'event section is a unified world chronicle');
ok(eventsView.tabs.length === 1 && eventsView.tabs[0].id === 'world',
  '事件页只有大事记一个分区');
const pendingGone = api.queries.events({ section: 'pending' });
const summaryGone = api.queries.events({ section: 'summary' });
ok(pendingGone.section === 'world' && summaryGone.section === 'world' &&
  !pendingGone.tabs.some(function (tab) {
    return tab.id === 'pending' || tab.id === 'summary';
  }),
  '待决策/离线摘要分区已移除，非法 section 回落大事记');
const mark = api.commands.markEventSectionRead({
  section: 'world',
  ids: api.queries.events({ section: 'world' }).items.map((row) => row.id)
});
ok(mark.ok, 'event display metadata can be marked read');

const sects = api.queries.sects();
ok(sects.wandering && sects.sects.length === 5,
  'sect query starts wandering and shows five sects');
ok(api.queries.sect({ sectId: sects.sects[0].id }).memberCount >= 0,
  'sect member count is derived');

const world = api.queries.world({});
ok(world.regions.length === 8 && Array.isArray(world.people),
  'world query returns abstract regions and people cards');
ok(world.scope === 'all' &&
  (!world.filters.scopes || world.filters.scopes.length === 0),
  '天下页不再区分身边动态与天下传闻');
ok(JSON.stringify(world).indexOf('coordinate') < 0 &&
   JSON.stringify(world).indexOf('latitude') < 0,
  'world query exposes no coordinates');

const partyEligibleNpcId = npcId;
const partyIneligibleNpcId = relationships.people[1].npcId;
const partyModel = harness.__test.snapshotModel();
const eligiblePerson = partyModel.systems.npcs.records[partyEligibleNpcId];
if (eligiblePerson) {
  eligiblePerson.lifeStage = 'adult';
  eligiblePerson.status = 'living';
}
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
  closeness: 0,
  lastChangedAt: 0
};
const evidenceId = 'event-9001';
if (!Array.isArray(partyModel.systems.events.resolvedRecent)) {
  partyModel.systems.events.resolvedRecent = [];
}
partyModel.systems.events.resolvedRecent.push({
  id: evidenceId,
  templateId: 'autonomous-relationship',
  templateRevision: 1,
  participants: ['player', partyEligibleNpcId],
  title: 'party seed',
  optionId: 'world-result',
  resolvedAt: 1
});
partyModel.systems.relationships.bonds[
  ['player', partyEligibleNpcId].sort().join('|')
] = {
  stage: 'friend',
  changedAt: 1,
  changedByEventId: evidenceId
};
harness.__test.replaceModel(partyModel);
const partyBefore = api.queries.combatParty();
const savesBeforeParty = saveCount;
const selectedParty = api.commands.setCombatCompanion({
  slotIndex: 1,
  npcId: partyEligibleNpcId
});
const partyAfter = api.queries.combatParty();
const savedParty = store.cloud_save_v1 &&
  store.cloud_save_v1.systems &&
  store.cloud_save_v1.systems.teamCombat;
ok(
  (partyBefore.eligible.some((row) => row.npcId === partyEligibleNpcId) ||
    selectedParty.ok === true) &&
    !partyBefore.eligible.some((row) => row.npcId === partyIneligibleNpcId),
  'combat party query distinguishes eligible and ineligible NPCs'
);
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
