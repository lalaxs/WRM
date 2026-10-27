'use strict';

// Production skill-network integration. Old canvas/Stage-1 aliases are no
// longer playable actions; exercise the canonical GameAPI and production tables.
const assert = require('assert');
const { createHarness } = require('./runtime-harness');

function step(runtime, seconds, source = 'online', limit = null) {
  const from = runtime.harness.state.processedThroughMs;
  return runtime.harness.__test.advanceGameplay(from, from + seconds * 1000,
    source, limit);
}

const runtime = createHarness();
const { sandbox, harness, api } = runtime;
for (const [id, skill] of Object.entries(sandbox.LifeSkillContent.SKILLS)) {
  assert(harness.state.player.skills[id], 'default player owns ' + id);
  assert.strictEqual(typeof skill.label, 'string');
}
for (const name of ['采药', '采矿', '伐木', '钓鱼']) {
  const page = api.queries.gatherPage(name);
  assert(Object.isFrozen(page));
  assert(page.explore || page.spots.length);
}
for (const name of ['炼丹', '炼器', '烹饪', '符箓']) {
  const page = api.queries.skillPage(name);
  assert(Object.isFrozen(page));
  assert(page.recipes.length);
  page.recipes.forEach(recipe => {
    assert(recipe.actionKey.startsWith('produce:'));
    assert(recipe.durationSeconds > 0);
    assert(sandbox.ItemContent.get(recipe.output.itemId));
  });
}
const unchanged = JSON.stringify(harness.state.player);
assert.strictEqual(api.commands.startAction({ key: 'unknown-action' }).ok, false);
assert.strictEqual(JSON.stringify(harness.state.player), unchanged);

// Explore repeatedly, then collect from the exact emitted resource instance.
assert(api.commands.startAction({ key: 'gather:explore:herb' }).ok);
assert.strictEqual(harness.state.current.mode, 'repeat');
const exploreDuration = api.queries.gatherPage('采药').explore.durationSeconds;
step(runtime, exploreDuration);
const resource = api.queries.gatherPage('采药').resources[0];
assert(resource && resource.remaining > 0);
assert(api.commands.startAction({ key: resource.actionKey }).ok);
const beforeHerb = harness.state.player.inventory.stacks.garumHerb || 0;
const collection = step(runtime, resource.durationSeconds);
assert.strictEqual(collection.action.completed, 1);
assert(harness.state.player.inventory.stacks.garumHerb > beforeHerb);
assert.strictEqual(api.queries.gatherPage('采药').resources[0].remaining,
  resource.remaining - 1);
assert(api.commands.stopAction().ok);

// Production consumes real ingredients and stops cleanly once exhausted.
const production = createHarness();
const model = production.harness.__test.snapshotModel();
model.player.inventory.stacks.garumHerb = 2;
model.player.inventory.stacks.potatoSeeds = 4;
production.harness.__test.replaceModel(model);
assert(production.api.commands.startAction({
  key: 'produce:alchemy:birdNestPotionI'
}).ok);
const report = step(production, 10);
assert.strictEqual(report.action.completed, 2);
assert.strictEqual(production.harness.state.player.inventory.stacks.birdNestPotionI, 2);
assert.strictEqual(production.harness.state.player.inventory.stacks.garumHerb || 0, 0);
assert.strictEqual(production.harness.state.player.inventory.stacks.potatoSeeds || 0, 0);
assert.strictEqual(production.harness.state.current, null);
assert.strictEqual(production.harness.state.lastActionStop.reason, 'materials_exhausted');
assert(production.harness.state.player.skills.alchemy.xp > 0);

// Crossing a reload keeps rewards and acknowledged report IDs idempotent.
const offline = createHarness();
assert(offline.api.commands.startAction({ key: 'gather:explore:mining' }).ok);
const from = offline.harness.state.processedThroughMs;
const input = offline.harness.__test.snapshotModel();
const settled = offline.harness.__test.settleStartupOffline(input, from + 60000);
assert(settled.ok);
assert.strictEqual(offline.harness.state.processedThroughMs, from + 60000);
assert(offline.harness.state.pendingOfflineReports.length > 0);
const rewards = JSON.stringify(offline.harness.state.player.inventory);
const rng = offline.harness.state.rngState;
const again = offline.harness.__test.settleStartupOffline(
  offline.harness.__test.snapshotModel(), from + 60000);
assert(again.ok);
assert.strictEqual(JSON.stringify(offline.harness.state.player.inventory), rewards);
assert.strictEqual(offline.harness.state.rngState, rng);
assert.strictEqual(offline.harness.state.pendingOfflineReports.length, 1);
const reportIds = offline.harness.state.pendingOfflineReports.map(report => report.id);
assert(offline.api.commands.acknowledgeOffline({ reportIds }).ok);
assert.strictEqual(offline.harness.state.pendingOfflineReports.length, 0);
assert(offline.api.commands.acknowledgeOffline({ reportIds }).ok);

// Failed command saves leave the live checkpoint intact and retry the same
// candidate. The broader time-cap/partition matrix lives in simulation suites.
const recovery = createHarness();
const checkpoint = recovery.harness.__test.snapshotModel();
recovery.controls.saveMode = 'false';
const failed = recovery.api.commands.startAction({ key: 'gather:explore:woodcutting' });
assert.strictEqual(failed.code, 'save_failed');
assert(recovery.api.queries.persistence().locked);
assert.strictEqual(recovery.harness.state.current, checkpoint.current);
assert.strictEqual(recovery.api.commands.stopAction().code, 'persistence_locked');
recovery.controls.saveMode = 'ok';
assert(recovery.api.commands.retryPersistence().ok);
assert.strictEqual(recovery.harness.state.current.key, 'gather:explore:woodcutting');
assert.strictEqual(recovery.harness.state.rngState, checkpoint.rngState);
assert.strictEqual(recovery.api.queries.persistence().locked, false);

console.log('Canonical skill network, production, offline idempotency and recovery passed');
