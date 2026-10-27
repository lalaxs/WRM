'use strict';

const assert = require('assert');
const { createHarness } = require('./runtime-harness');
const { sandbox, harness, clock } = createHarness();
const Saves = sandbox.SaveSystem;
const input = harness.__test.snapshotModel();
const initial = Saves.createSnapshot(input, clock.now);

function adapter(primary, backup) {
  const data = new Map();
  if (primary) data.set(Saves.SNAPSHOT_KEY, JSON.stringify(primary));
  if (backup) data.set(Saves.BACKUP_KEY, JSON.stringify(backup));
  return {
    data, failKey: null,
    load(key) { return data.has(key) ? JSON.parse(data.get(key)) : null; },
    save(key, value) {
      if (this.failKey === key) return false;
      data.set(key, JSON.stringify(value));
      return true;
    }
  };
}

const storage = adapter();
assert(Saves.save(storage, input, clock.now));
const loaded = Saves.load(storage, clock.now);
assert.strictEqual(loaded.snapshot.schemaVersion, 5);
assert.strictEqual(loaded.snapshot.rngState, input.rngState);
assert.strictEqual(loaded.snapshot.processedThroughMs, input.processedThroughMs);
loaded.snapshot.player.name = 'detached';
assert.notStrictEqual(storage.load(Saves.SNAPSHOT_KEY).player.name, 'detached');

const second = JSON.parse(JSON.stringify(input));
second.player.lingshi += 10;
assert(Saves.save(storage, second, clock.now));
assert.strictEqual(storage.load(Saves.BACKUP_KEY).player.lingshi, input.player.lingshi);
assert.strictEqual(storage.load(Saves.SNAPSHOT_KEY).player.lingshi, second.player.lingshi);

const checkpoint = storage.data.get(Saves.SNAPSHOT_KEY);
for (const key of [Saves.SNAPSHOT_KEY, Saves.BACKUP_KEY]) {
  storage.failKey = key;
  assert.strictEqual(Saves.save(storage, input, clock.now), false);
  assert.strictEqual(storage.data.get(Saves.SNAPSHOT_KEY), checkpoint);
}

const corrupted = adapter(null, initial);
corrupted.data.set(Saves.SNAPSHOT_KEY, '{broken-json');
const recovered = Saves.load(corrupted, clock.now);
assert(recovered.needsRepair);
assert.strictEqual(recovered.snapshot.player.name, initial.player.name);

for (const target of ['primary', 'backup']) {
  const future = { ...initial, schemaVersion: 99 };
  const protectedStore = adapter(target === 'primary' ? future : initial,
    target === 'backup' ? future : initial);
  const before = Array.from(protectedStore.data);
  assert(Saves.load(protectedStore, clock.now).writeProtected);
  assert.strictEqual(Saves.save(protectedStore, input, clock.now), false);
  assert.deepStrictEqual(Array.from(protectedStore.data), before);
}
const obsolete = adapter({ ...initial, schemaVersion: 4 });
assert.strictEqual(Saves.load(obsolete, clock.now).snapshot.created, false);
console.log('Save round trip, backup, corrupt-data recovery and version protection passed');
