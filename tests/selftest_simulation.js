'use strict';

const assert = require('assert');
const { createHarness } = require('./runtime-harness');
const clone = value => JSON.parse(JSON.stringify(value));

function exploring() {
  const runtime = createHarness();
  assert(runtime.api.commands.startAction({ key: 'gather:explore:herb' }).ok);
  return runtime;
}
function advance(runtime, seconds, source = 'online', limit = null) {
  const model = runtime.model || (runtime.model = runtime.harness.__test.snapshotModel());
  const from = model.processedThroughMs;
  const result = runtime.sandbox.Simulation.advance(model, seconds, {
    fromMs: from, source, mutateInPlace: true, mainActionLimitSeconds: limit,
    rules: runtime.harness.simulationRuntime.rules,
    // This is the deterministic action/passive-clock contract. The world uses
    // deliberately coarse NPC batches and has its own domain integration tests.
    lanes: runtime.harness.simulationRuntime.lanes.filter(lane =>
      !lane.id.startsWith('stage4-') && !lane.id.startsWith('stage5-'))
  });
  result.state.processedThroughMs = result.report.toMs;
  runtime.model = result.state;
  return result.report;
}

// Partitioning time must not change rewards, RNG, passive clocks or action debt.
const bulk = exploring();
const partitioned = exploring();
const offline = exploring();
const original = clone(bulk.harness.__test.snapshotModel());
advance(bulk, 12);
for (let index = 0; index < 120; index++) advance(partitioned, 0.1);
advance(offline, 12, 'offline', 12);
const expected = clone(bulk.model);
assert.deepStrictEqual(clone(partitioned.model), expected);
assert.deepStrictEqual(clone(offline.model), expected);
assert(expected.player.skills.herb.xp > original.player.skills.herb.xp);

const capped = exploring();
const report = advance(capped, 30, 'offline', 5);
assert.strictEqual(report.mainActionSeconds, 5);
assert.strictEqual(report.toMs - report.fromMs, 30000);
assert.strictEqual(capped.model.processedThroughMs, report.toMs);
assert.strictEqual(report.action.completed, 2);

// A time budget yields only after making progress, so resume jobs cannot starve.
const sliced = exploring();
const partial = sliced.evaluate(`
  (() => {
    const realNow = Date.now;
    let wall = 0;
    try {
      Date.now = () => wall += 100;
      return Simulation.advance(StateModel.captureRuntime(state), 12, {
        fromMs: state.processedThroughMs, source: 'online', mutateInPlace: true,
        rules: simulationRuntime.rules, lanes: simulationRuntime.lanes, timeBudgetMs: 1
      });
    } finally { Date.now = realNow; }
  })()
`);
assert(partial.report.toMs > partial.report.fromMs);
assert(partial.remainingSeconds > 0 && !partial.done);
console.log('Real-rule time partitioning, offline limits and cooperative yielding passed');
