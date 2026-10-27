'use strict';

const assert = require('assert');
const { createHarness } = require('./runtime-harness');

const runtime = createHarness({ npcCount: 120 });
const { harness, sandbox, api, clock, controls, store } = runtime;
const state = harness.state;
const npcReference = state.systems.npcs;
const historyReference = state.systems.world.worldEvents;
const inventoryReference = state.player.inventory;
const initial = state.processedThroughMs;
const formationModel = sandbox.Stage2State.normalize({
  player: { inventory: { stacks: { gatheringFormation: 2 } } }
});
assert.strictEqual(formationModel.player.inventory.stacks.gatheringFormation, 2,
  'formation stacks survive combat-equipment instance migration');
harness.__test.advanceRuntime(initial, initial + 80, 'online', null);
assert.strictEqual(state.systems.npcs, npcReference,
  'passive lanes must not copy an unrelated NPC pool each tick');
assert.strictEqual(state.systems.world.worldEvents, historyReference);
assert.strictEqual(state.player.inventory, inventoryReference);

const view = api.queries.app();
assert(Object.isFrozen(view.appearance.indices));
assert.notStrictEqual(view.appearance.indices, state.parts);
assert.throws(() => { view.appearance.indices.cloth = 999; }, TypeError);
assert.notStrictEqual(state.parts.cloth, 999);

for (let index = 0; index < 2; index++) {
  controls.normalizeCalls = 0;
  const writes = controls.primaryWrites;
  assert.strictEqual(harness.persist(clock.now), true);
  assert.strictEqual(controls.normalizeCalls, 1,
    'a save has one full state canonicalization, including repeated saves');
  assert.strictEqual(controls.primaryWrites, writes + 1);
}
assert.strictEqual(state.processedThroughMs, initial + 80,
  'saving never advances the processed watermark without simulation');

const model = sandbox.StateModel.captureRuntime(state, state.processedThroughMs);
const expected = sandbox.SaveSystem.createSnapshot(model, clock.now);
const persisted = JSON.parse(store.get('cloud_save_v1'));
assert.deepStrictEqual(persisted, JSON.parse(JSON.stringify(expected)),
  'runtime save projection equals the full external snapshot boundary');

const resume = createHarness();
const start = resume.clock.now;
assert(resume.harness.__test.handleVisibilityChange(true, start));
resume.clock.now += 600000;
const pendingBefore = resume.harness.state.pendingOfflineReports.length;
assert(resume.harness.__test.handleVisibilityChange(false, resume.clock.now));
assert(resume.harness.state.catchingUp);
assert(resume.api.queries.persistence().locked);
assert.strictEqual(resume.harness.state.processedThroughMs, start,
  'long resume returns before synchronous whole-interval simulation');
let slices = 0;
while (resume.harness.state.catchingUp && slices < 1000) {
  resume.harness.__test.stepCatchup();
  slices++;
}
assert(slices > 1 && slices < 1000);
assert.strictEqual(resume.harness.state.processedThroughMs, resume.clock.now);
assert.strictEqual(resume.harness.state.pendingOfflineReports.length, pendingBefore,
  'page resume does not create reload-only offline reward dialogs');
const saved = resume.store.get('cloud_save_v1');
resume.harness.__test.handleVisibilityChange(false, resume.clock.now);
assert.strictEqual(resume.store.get('cloud_save_v1'), saved,
  'repeated visibility events do not duplicate catch-up');

const failed = createHarness();
const checkpoint = failed.clock.now;
failed.harness.__test.handleVisibilityChange(true, checkpoint);
failed.clock.now += 60000;
failed.harness.__test.handleVisibilityChange(false, failed.clock.now);
failed.controls.saveMode = 'false';
while (failed.harness.state.catchingUp) failed.harness.__test.stepCatchup();
assert.strictEqual(failed.harness.state.processedThroughMs, checkpoint);
assert(failed.api.queries.persistence().locked);
failed.controls.saveMode = 'ok';
assert.strictEqual(failed.harness.commands.retryPersistence(), true);
assert.strictEqual(failed.harness.state.processedThroughMs, failed.clock.now);
assert.strictEqual(failed.api.queries.persistence().locked, false);

const future = JSON.parse(store.get('cloud_save_v1'));
future.schemaVersion = 99;
store.set('cloud_save_v1_backup', JSON.stringify(future));
assert.strictEqual(harness.persist(clock.now), false,
  'cached previous snapshots cannot bypass future-version write protection');
assert(api.queries.persistence().locked);

const chunked = createHarness({ captureTimers: true });
chunked.evaluate(`
  globalThis.__GAME_TEST_HARNESS_REQUEST__ = false;
  globalThis.__monthCaps = [];
  const originalAdvance = Simulation.advance;
  Simulation = Object.freeze(Object.assign({}, Simulation, {
    advance: function (model, seconds, options) {
      __monthCaps.push(options.offlineMonthCap);
      return originalAdvance(model, seconds, options);
    }
  }));
  scheduleStartupOfflineSettle(StateModel.captureRuntime(state, state.processedThroughMs),
    state.processedThroughMs + 60 * 180 * 1000);
`);
let tasks = 0;
while (chunked.scheduledTasks.length && tasks++ < 1000) chunked.scheduledTasks.shift()();
assert(tasks < 1000 && !chunked.harness.state.settlingOffline);
const caps = chunked.sandbox.__monthCaps;
assert(caps.length > 2 && caps[0] === 48 && caps.includes(0));
assert(caps.every((cap, index) => index === 0 || cap <= caps[index - 1]),
  'world-month budget is carried across offline slices, never reset per slice');
assert.strictEqual(chunked.harness.state.processedThroughMs,
  chunked.clock.now + 60 * 180 * 1000);
console.log('Runtime ownership, canonical saves and sliced resume self-test passed');
