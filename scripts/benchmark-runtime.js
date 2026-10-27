'use strict';

const { createHarness } = require('../tests/runtime-harness.js');

function measure(operation, count = 15) {
  operation();
  const samples = [];
  for (let index = 0; index < count; index++) {
    const start = performance.now();
    operation();
    samples.push(performance.now() - start);
  }
  samples.sort((left, right) => left - right);
  return { medianMs: +samples[Math.floor(count / 2)].toFixed(3),
    p95Ms: +samples[Math.ceil(count * 0.95) - 1].toFixed(3) };
}

const results = [0, 120, 500].map(npcCount => {
  const { sandbox, harness, api, clock, controls } = createHarness({ npcCount });
  const count = Object.keys(harness.state.systems.npcs.records).length;
  const tick = measure(() => {
    const from = harness.state.processedThroughMs;
    harness.__test.advanceRuntime(from, from + 80, 'online', null);
  });
  const loadouts = measure(() => api.queries.combatLoadouts(), 5);
  controls.normalizeCalls = 0;
  const save = measure(() => harness.persist(clock.now), 5);
  return { npcs: count,
    bytes: Buffer.byteLength(JSON.stringify(sandbox.StateModel.queryView(harness.state))),
    tick, loadouts, save, normalizationsPerSave: controls.normalizeCalls / 6 };
});
console.log(JSON.stringify({ node: process.version,
  note: 'Desktop Node VM; in-memory JSON storage; no DOM/GPU/mobile timing.', results }, null, 2));
