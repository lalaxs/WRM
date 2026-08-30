'use strict';

const fs = require('fs');
const vm = require('vm');

let pass = 0;
let fail = 0;

function ok(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.error('  ✗ FAIL: ' + message);
  }
}

const GameRandom = require('../core/random.js');
const SaveSystem = require('../core/save-system.js');

function allNumbersFinite(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object') return true;
  return Object.keys(value).every((key) => allNumbersFinite(value[key]));
}

function jsonAdapter(initial, failKey) {
  const raw = Object.assign({}, initial || {});
  return {
    raw,
    load(key) {
      if (!(key in raw)) return null;
      return JSON.parse(raw[key]);
    },
    save(key, value) {
      if (key === failKey) return false;
      raw[key] = JSON.stringify(value);
      return true;
    }
  };
}

const firstA = GameRandom.next(123456789);
const firstB = GameRandom.next(123456789);
ok(firstA.seed === firstB.seed, 'same seed produces same next seed');
ok(firstA.value === firstB.value, 'same seed produces same value');
ok(firstA.value >= 0 && firstA.value < 1, 'random value stays in [0, 1)');

const second = GameRandom.next(firstA.seed);
ok(second.seed !== firstA.seed, 'random state advances');
ok(GameRandom.normalizeSeed(0) === GameRandom.DEFAULT_SEED, 'zero seed normalizes to default');
ok(GameRandom.fromEntropy(1000, 99) === GameRandom.fromEntropy(1000, 99), 'entropy conversion is deterministic');

const repeating = SaveSystem.normalizeAction({
  key: 'caiyao',
  count: Infinity,
  done: 7,
  elapsed: 1.25,
  stalled: false
});
ok(repeating.mode === 'repeat', 'Infinity action migrates to repeat mode');
ok(Number.isFinite(repeating.count), 'repeat action keeps a JSON-safe count');

const legacyNull = SaveSystem.normalizeAction({
  key: 'caiyao',
  count: null,
  done: 3,
  elapsed: 0,
  stalled: false
});
ok(legacyNull.mode === 'repeat', 'legacy null count migrates to repeat mode');

const finite = SaveSystem.normalizeAction({
  key: 'gather:explore:herb',
  count: 1,
  done: 0,
  elapsed: 0,
  stalled: false
});
ok(finite.mode === 'finite' && finite.count === 1, 'finite action remains finite');

const snapshot = SaveSystem.createSnapshot({
  created: true,
  appearance: { parts: { hair: 2 } },
  player: { name: '测试角色' },
  current: { key: 'caiyao', count: Infinity, done: 4, elapsed: 2 },
  rngState: 123,
  fishRecoverAcc: 11,
  pendingOfflineReport: null
}, 10000);
const encoded = JSON.stringify(snapshot);
ok(encoded.indexOf('"count":null') === -1, 'snapshot does not serialize Infinity as a null action count');
ok(snapshot.schemaVersion === 5 && snapshot.savedAt === 10000,
  'snapshot records schema and time');

const adapter = jsonAdapter();
ok(SaveSystem.save(adapter, snapshot, 10000) === true, 'snapshot save succeeds');
const loaded = SaveSystem.load(adapter, 10000);
ok(loaded.source === 'snapshot', 'snapshot loads from primary key');
ok(loaded.snapshot.current.mode === 'repeat', 'repeat action survives JSON round-trip');

const backupSnapshot = SaveSystem.createSnapshot({
  player: { name: '备份角色' }
}, 8000);
const corruptPrimaryAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: '{broken json',
  [SaveSystem.BACKUP_KEY]: JSON.stringify(backupSnapshot)
});
let recoveredFromBackup = null;
try {
  recoveredFromBackup = SaveSystem.load(corruptPrimaryAdapter, 10000);
} catch (error) {
  recoveredFromBackup = null;
}
ok(
  recoveredFromBackup &&
    recoveredFromBackup.source === 'backup' &&
    recoveredFromBackup.snapshot.player.name === '备份角色' &&
    recoveredFromBackup.needsRepair === true,
  'corrupt primary falls back to a valid backup'
);

const corruptSaveAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: '{broken json'
});
let corruptPrimarySave = null;
try {
  corruptPrimarySave = SaveSystem.save(corruptSaveAdapter, snapshot, 10000);
} catch (error) {
  corruptPrimarySave = null;
}
ok(corruptPrimarySave === true, 'save treats an unreadable primary as absent');

const oldSnapshot = SaveSystem.createSnapshot({
  player: { name: '旧主档' }
}, 9000);
const writeOrder = [];
const orderedAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(oldSnapshot)
});
const orderedSave = orderedAdapter.save;
orderedAdapter.save = function (key, value) {
  writeOrder.push(key);
  return orderedSave.call(this, key, value);
};
ok(
  SaveSystem.save(orderedAdapter, { player: { name: '新主档' } }, 10000) === true,
  'replacement save succeeds'
);
ok(
  writeOrder.join(',') === SaveSystem.BACKUP_KEY + ',' + SaveSystem.SNAPSHOT_KEY,
  'previous primary is backed up before the replacement primary is written'
);
ok(
  JSON.parse(orderedAdapter.raw[SaveSystem.BACKUP_KEY]).player.name === '旧主档',
  'backup preserves the previous primary snapshot'
);

const backupFailureAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(oldSnapshot)
}, SaveSystem.BACKUP_KEY);
const primaryBeforeBackupFailure = backupFailureAdapter.raw[SaveSystem.SNAPSHOT_KEY];
ok(
  SaveSystem.save(backupFailureAdapter, { player: { name: '不应覆盖' } }, 10000) === false,
  'backup write failure is reported'
);
ok(
  backupFailureAdapter.raw[SaveSystem.SNAPSHOT_KEY] === primaryBeforeBackupFailure,
  'backup write failure leaves the primary unchanged'
);

const throwingBackupAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(oldSnapshot)
});
const primaryBeforeBackupThrow = throwingBackupAdapter.raw[SaveSystem.SNAPSHOT_KEY];
throwingBackupAdapter.save = function (key, value) {
  if (key === SaveSystem.BACKUP_KEY) throw new Error('backup write failed');
  this.raw[key] = JSON.stringify(value);
  return true;
};
let throwingBackupResult = null;
try {
  throwingBackupResult = SaveSystem.save(
    throwingBackupAdapter,
    { player: { name: '不应覆盖' } },
    10000
  );
} catch (error) {
  throwingBackupResult = null;
}
ok(throwingBackupResult === false, 'backup write exception is reported as false');
ok(
  throwingBackupAdapter.raw[SaveSystem.SNAPSHOT_KEY] === primaryBeforeBackupThrow,
  'backup write exception leaves the primary unchanged'
);

const throwingPrimaryAdapter = jsonAdapter();
throwingPrimaryAdapter.save = function (key) {
  if (key === SaveSystem.SNAPSHOT_KEY) throw new Error('primary write failed');
  return true;
};
let throwingPrimaryResult = null;
try {
  throwingPrimaryResult = SaveSystem.save(throwingPrimaryAdapter, snapshot, 10000);
} catch (error) {
  throwingPrimaryResult = null;
}
ok(throwingPrimaryResult === false, 'primary write exception is reported as false');

const structurallyValidBackup = SaveSystem.createSnapshot({
  player: { name: '结构有效备份' }
}, 7000);
const schemaOnlyPrimaryAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify({ schemaVersion: 1 }),
  [SaveSystem.BACKUP_KEY]: JSON.stringify(structurallyValidBackup)
});
const schemaOnlyRecovery = SaveSystem.load(schemaOnlyPrimaryAdapter, 10000);
ok(
  schemaOnlyRecovery.source === 'backup' &&
    schemaOnlyRecovery.snapshot.player.name === '结构有效备份',
  'schema-only primary is rejected in favor of a valid backup'
);

const damagedPrimary = SaveSystem.createSnapshot({
  player: { name: '损坏主档' }
}, 7500);
damagedPrimary.appearance = null;
const damagedPrimaryAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(damagedPrimary),
  [SaveSystem.BACKUP_KEY]: JSON.stringify(structurallyValidBackup)
});
ok(
  SaveSystem.load(damagedPrimaryAdapter, 10000).source === 'backup',
  'primary with a damaged required structure falls back to backup'
);

const arrayPartsPrimary = SaveSystem.createSnapshot({
  appearance: { parts: { hair: 1 } },
  player: { name: '数组外观主档' }
}, 7600);
arrayPartsPrimary.appearance.parts = [];
const arrayPartsAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(arrayPartsPrimary),
  [SaveSystem.BACKUP_KEY]: JSON.stringify(structurallyValidBackup)
});
ok(
  SaveSystem.load(arrayPartsAdapter, 10000).source === 'backup',
  'primary with array appearance parts falls back to backup'
);

const nullPartsPrimary = SaveSystem.createSnapshot({
  appearance: { parts: { hair: 1 } },
  player: { name: '空外观主档' }
}, 7700);
nullPartsPrimary.appearance.parts = null;
const nullPartsAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(nullPartsPrimary),
  [SaveSystem.BACKUP_KEY]: JSON.stringify(structurallyValidBackup)
});
ok(
  SaveSystem.load(nullPartsAdapter, 10000).source === 'backup',
  'primary without an appearance parts record falls back to backup'
);

const exoticPartsPrimary = SaveSystem.createSnapshot({
  appearance: { parts: { hair: 1 } },
  player: { name: '特殊外观主档' }
}, 7750);
exoticPartsPrimary.appearance.parts = new Date(0);
const exoticPartsAdapter = {
  load(key) {
    if (key === SaveSystem.SNAPSHOT_KEY) return exoticPartsPrimary;
    if (key === SaveSystem.BACKUP_KEY) return structurallyValidBackup;
    return null;
  },
  save() { return true; }
};
ok(
  SaveSystem.load(exoticPartsAdapter, 10000).source === 'backup',
  'primary with non-plain appearance parts falls back to backup'
);

const normalizedBadAppearance = SaveSystem.createSnapshot({
  appearance: { parts: ['bad'] }
}, 7800);
ok(
  normalizedBadAppearance.appearance &&
    normalizedBadAppearance.appearance.parts &&
    !Array.isArray(normalizedBadAppearance.appearance.parts),
  'snapshot creation normalizes invalid appearance parts'
);

class ExoticPlayer {
  constructor() {
    this.name = '不应持久化';
  }
}
ok(
  SaveSystem.createSnapshot({ player: new ExoticPlayer() }, 7900).player === null,
  'snapshot creation rejects non-plain player instances'
);
const throwingPrototypePlayer = new Proxy({}, {
  getPrototypeOf() {
    throw new Error('prototype unavailable');
  }
});
let throwingPrototypeSnapshot = null;
try {
  throwingPrototypeSnapshot = SaveSystem.createSnapshot({
    player: throwingPrototypePlayer
  }, 7950);
} catch (error) {
  throwingPrototypeSnapshot = null;
}
ok(
  throwingPrototypeSnapshot && throwingPrototypeSnapshot.player === null,
  'snapshot boundary treats throwing prototype inspection as non-plain'
);

const emptySnapshotAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(SaveSystem.createSnapshot({}, 6000))
});
const emptySnapshotLoad = SaveSystem.load(emptySnapshotAdapter, 10000);
ok(
  emptySnapshotLoad.source === 'snapshot' && emptySnapshotLoad.snapshot.player === null,
  'new-game snapshot with a null player remains valid'
);
ok(
  emptySnapshotLoad.snapshot.pendingOfflineReport === null &&
    Array.isArray(emptySnapshotLoad.snapshot.pendingOfflineReports) &&
    emptySnapshotLoad.snapshot.pendingOfflineReports.length === 0,
  'v2 load keeps a canonical inbox while presenting an empty Stage 1A report view'
);
const stagedInboxSnapshot = SaveSystem.createSnapshot({
  pendingOfflineReports: [{ id: 'one' }, { id: 'two' }]
}, 6100);
const stagedInboxLoad = SaveSystem.load(jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(stagedInboxSnapshot)
}), 10000);
ok(
  stagedInboxLoad.snapshot.pendingOfflineReport.id === 'one' &&
    stagedInboxLoad.snapshot.pendingOfflineReports.length === 2 &&
    stagedInboxLoad.snapshot.pendingOfflineReports[1].id === 'two',
  'Stage 1A load view never discards additional canonical pending reports'
);
const stagedInboxClone = JSON.parse(JSON.stringify(stagedInboxLoad.snapshot));
const stagedInboxCopy = Object.assign({}, stagedInboxLoad.snapshot);
ok(
  Object.prototype.propertyIsEnumerable.call(
    stagedInboxLoad.snapshot,
    'pendingOfflineReports'
  ) &&
    stagedInboxClone.pendingOfflineReports.length === 2 &&
    stagedInboxCopy.pendingOfflineReports.length === 2,
  'canonical pending inbox survives ordinary enumeration and JSON cloning'
);

const singularAfterEmptyCanonical = SaveSystem.createSnapshot({
  pendingOfflineReports: [],
  pendingOfflineReport: { caiyao: 3 }
}, 6200);
ok(
  singularAfterEmptyCanonical.pendingOfflineReport.reports.length === 1 &&
    singularAfterEmptyCanonical.pendingOfflineReport.reports[0]
      .action.key === 'caiyao' &&
    singularAfterEmptyCanonical.pendingOfflineReport.reports[0]
      .action.completed === 3 &&
    singularAfterEmptyCanonical.pendingOfflineReport.reports[0]
      .warnings.includes('legacy_offline_report_migrated'),
  'empty canonical inbox never suppresses a newly-produced singular report'
);

const deduplicatedPending = SaveSystem.createSnapshot({
  pendingOfflineReports: [{
    id: 'same-report',
    source: 'offline',
    action: { key: 'old', completed: 1 }
  }],
  pendingOfflineReport: {
    id: 'same-report',
    source: 'offline',
    action: { key: 'new', completed: 2 }
  }
}, 6300);
ok(
  deduplicatedPending.pendingOfflineReport.reports.length === 1 &&
    deduplicatedPending.pendingOfflineReport.reports[0]
      .action.key === 'new' &&
    deduplicatedPending.pendingOfflineReport.reports[0]
      .action.completed === 2,
  'singular report wins stable-id deduplication against an older canonical copy'
);

const nestedUnsafeSnapshot = SaveSystem.createSnapshot({
  appearance: { metrics: { infinite: Infinity } },
  player: { shouMax: Infinity, stats: { invalid: NaN } },
  pendingOfflineReport: { rewards: { overflow: Infinity } }
}, 10000);
const nestedRoundTrip = JSON.parse(JSON.stringify(nestedUnsafeSnapshot));
ok(
  !('metrics' in nestedRoundTrip.appearance) &&
    !('stats' in nestedRoundTrip.player) &&
    nestedRoundTrip.player.shouMax === null &&
    nestedRoundTrip.pendingOfflineReport.reports.length === 0 &&
    allNumbersFinite(nestedRoundTrip),
  'snapshot whitelist removes unknown fields and remains JSON-safe after round-trip'
);

const legacyAdapter = jsonAdapter({
  cloud_created: JSON.stringify('1'),
  cloud_nie: JSON.stringify({ parts: { hair: 3 } }),
  cloud_player: JSON.stringify({ name: '旧档角色' }),
  cloud_current: JSON.stringify({ key: 'caiyao', count: null, done: 9, elapsed: 1 }),
  cloud_lastsave: JSON.stringify(5000)
});
const migrated = SaveSystem.load(legacyAdapter, 10000);
ok(migrated.source === 'empty', 'legacy cloud_* keys are ignored');
ok(migrated.snapshot.player === null, 'ignored legacy keys yield a null player');
ok(migrated.migrated === false && migrated.needsRepair === false,
  'ignored legacy keys do not request migration or repair');

const legacyWithoutLastSave = jsonAdapter({
  cloud_player: JSON.stringify({ name: '无时间旧档' })
});
ok(
  SaveSystem.load(legacyWithoutLastSave, 12000).source === 'empty' &&
    SaveSystem.load(legacyWithoutLastSave, 12000).snapshot.player === null,
  'cloud_player alone is ignored like other legacy split keys'
);

const extendedSnapshot = SaveSystem.createSnapshot({
  player: {
    inventory: {
      stacks: {
        commonSeed: 1,
        gatheringFormation: 1,
        beastFeed: 1
      },
      bindings: {
        gatheringFormation: {
          equipment: 0,
          task: 0,
          formation: 1
        }
      }
    }
  },
  systems: {
    gathering: {
      nextSpotId: 2,
      spots: {
        herb: {
          instanceId: 'spot-1',
          skillId: 'herb',
          entryId: 'parityHerb1',
          quality: 'common',
          capacity: 5,
          remaining: 3
        }
      },
      fishStocks: { spiritCarp: 7 },
      fishRecoverAcc: 9
    },
    homestead: {
      farm: {
        unlockedPlots: 3,
        plots: [{
          id: 'plot-1',
          cropId: 'spiritRice',
          remainingSeconds: 12,
          totalSeconds: 300,
          ready: false
        }]
      },
      formations: {
        slots: ['gatheringFormation'],
        owned: ['gatheringFormation']
      },
      beasts: {
        nextId: 2,
        roster: [{
          id: 'beast-1',
          speciesId: 'spiritFox',
          level: 2,
          xp: 3,
          traitId: 'keenNose',
          growthId: 'steady'
        }],
        encounters: [],
        activeIds: ['beast-1']
      }
    },
    parallel: { jobs: [{ id: 'j1', remainingSeconds: 8 }] },
    world: { tickAccumulator: 3 }
  },
  reportArchive: [{ id: 'r1' }],
  processedThroughMs: 9000
}, 10000);
// createSnapshot 首轮可能把 worldEvents.eventId 的 null 规范成 0；再过一轮得到可无修复落盘的字节。
const extendedCanonical = SaveSystem.createSnapshot(
  extendedSnapshot,
  extendedSnapshot.savedAt
);
const extendedJson = JSON.parse(JSON.stringify(extendedSnapshot));
ok(extendedJson.schemaVersion === 5,
  'new snapshots use schema version 5');
ok(extendedJson.systems.homestead.farm.plots[0].id === 'plot-1' &&
   extendedJson.systems.homestead.farm.plots[0].cropId === 'spiritRice',
  'snapshot preserves farm extension state');
ok(extendedJson.systems.homestead.formations.slots[0] ===
     'gatheringFormation' &&
   extendedJson.systems.homestead.beasts.roster[0].id === 'beast-1',
  'snapshot preserves formation and beast extension state');
ok(extendedJson.reportArchive[0].id === 'r1',
  'snapshot preserves report archive');
ok(extendedJson.processedThroughMs === 9000,
  'snapshot preserves processed-through watermark');

const stage2RoundTripAdapter = jsonAdapter();
ok(
  SaveSystem.save(stage2RoundTripAdapter, extendedSnapshot, 10000) === true,
  'Stage 2 extension snapshot saves through the single versioned key'
);
const stage2RoundTrip = SaveSystem.load(stage2RoundTripAdapter, 10000);
ok(
  JSON.stringify(stage2RoundTrip.snapshot.player.inventory) ===
    JSON.stringify(extendedSnapshot.player.inventory) &&
  JSON.stringify(stage2RoundTrip.snapshot.systems.gathering.spots) ===
    JSON.stringify(extendedSnapshot.systems.gathering.spots) &&
  stage2RoundTrip.snapshot.systems.gathering.fishRecoverAcc === 9 &&
  JSON.stringify(stage2RoundTrip.snapshot.systems.homestead.farm) ===
    JSON.stringify(extendedSnapshot.systems.homestead.farm) &&
  JSON.stringify(stage2RoundTrip.snapshot.systems.homestead.formations) ===
    JSON.stringify(extendedSnapshot.systems.homestead.formations) &&
  JSON.stringify(stage2RoundTrip.snapshot.systems.homestead.beasts) ===
    JSON.stringify(extendedSnapshot.systems.homestead.beasts),
  'planted crop, formation binding, resource point, fish accumulator and beast survive JSON load'
);

const v1 = {
  schemaVersion: 1,
  savedAt: 6000,
  created: true,
  appearance: { parts: { hair: 2 } },
  player: {
    name: '第一版角色',
    items: { herb: 2 },
    spots: { herb: { id: 'old-grove', left: 2, cap: 3 } }
  },
  current: {
    key: 'caiyao',
    mode: 'repeat',
    count: 0,
    done: 4,
    elapsed: 2,
    stalled: false
  },
  rngState: 123,
  fishRecoverAcc: 5,
  pendingOfflineReport: null
};
const v1Adapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(v1)
});
let v1WriteCount = 0;
const v1Save = v1Adapter.save;
v1Adapter.save = function (key, value) {
  v1WriteCount++;
  return v1Save.call(this, key, value);
};
const migratedV1 = SaveSystem.load(v1Adapter, 12000);
ok(migratedV1.source === 'empty' && migratedV1.migrated === false,
  'schema v1 snapshot is rejected instead of migrated');
ok(migratedV1.needsRepair === false && migratedV1.snapshot.player === null,
  'rejected v1 load stays empty without repair');
ok(v1WriteCount === 0,
  'rejecting an old schema never performs a hidden write');

const metadataPrimary = SaveSystem.load(jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(extendedCanonical)
}), 12000);
ok(metadataPrimary.migrated === false && metadataPrimary.needsRepair === false,
  'canonical primary snapshot needs no repair');

const backupV1 = SaveSystem.load(jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: '{bad json',
  [SaveSystem.BACKUP_KEY]: JSON.stringify(v1)
}), 12000);
ok(backupV1.source === 'empty' && backupV1.migrated === false &&
   backupV1.needsRepair === false &&
   backupV1.snapshot.player === null,
  'v1 backup is rejected like any other old schema');

const futureOnly = SaveSystem.load(jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify({
    schemaVersion: SaveSystem.SCHEMA_VERSION + 1,
    savedAt: 1,
    created: false
  })
}), 12000);
ok(futureOnly.source === 'empty' && futureOnly.migrated === false,
  'unknown future snapshots are rejected instead of downgraded');

const futurePrimaryBytes = JSON.stringify({
  schemaVersion: SaveSystem.SCHEMA_VERSION + 7,
  savedAt: 7777,
  futurePayload: { irreplaceable: true }
});
const futureBackup = SaveSystem.createSnapshot({
  player: { name: '只读备份角色' }
}, 7000);
const futureBackupBytes = JSON.stringify(futureBackup);
const futureProtectedAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: futurePrimaryBytes,
  [SaveSystem.BACKUP_KEY]: futureBackupBytes
});
const futureProtectedLoad = SaveSystem.load(futureProtectedAdapter, 12000);
ok(
  futureProtectedLoad.source === 'backup' &&
    futureProtectedLoad.future === true &&
    futureProtectedLoad.writeProtected === true &&
    futureProtectedLoad.needsRepair === false,
  'future primary may display backup but is explicitly write-protected'
);
ok(
  SaveSystem.save(
    futureProtectedAdapter,
    futureProtectedLoad.snapshot,
    futureProtectedLoad.snapshot.savedAt
  ) === false &&
    futureProtectedAdapter.raw[SaveSystem.SNAPSHOT_KEY] ===
      futurePrimaryBytes &&
    futureProtectedAdapter.raw[SaveSystem.BACKUP_KEY] ===
      futureBackupBytes,
  'repair save cannot overwrite future primary or its recovery backup'
);

const protectedPrimary = SaveSystem.createSnapshot({
  player: { name: '合法当前主档' }
}, 7100);
const protectedPrimaryBytes = JSON.stringify(protectedPrimary);
const futureBackupOnlyBytes = JSON.stringify({
  schemaVersion: SaveSystem.SCHEMA_VERSION + 5,
  savedAt: 7000,
  futureBackupPayload: { preserve: true }
});
const futureBackupOnlyAdapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: protectedPrimaryBytes,
  [SaveSystem.BACKUP_KEY]: futureBackupOnlyBytes
});
let protectedSaveCalls = 0;
const protectedSave = futureBackupOnlyAdapter.save;
futureBackupOnlyAdapter.save = function (key, value) {
  protectedSaveCalls++;
  return protectedSave.call(this, key, value);
};
ok(
  SaveSystem.save(
    futureBackupOnlyAdapter,
    { player: { name: '不得写入' } },
    12000
  ) === false &&
    protectedSaveCalls === 0 &&
    futureBackupOnlyAdapter.raw[SaveSystem.SNAPSHOT_KEY] ===
      protectedPrimaryBytes &&
    futureBackupOnlyAdapter.raw[SaveSystem.BACKUP_KEY] ===
      futureBackupOnlyBytes,
  'future backup also blocks every primary and backup write'
);

const damagedV2 = SaveSystem.createSnapshot({}, 8000);
damagedV2.systems.homestead.formations.slots = {};
const strictV2Adapter = jsonAdapter({
  [SaveSystem.SNAPSHOT_KEY]: JSON.stringify(damagedV2),
  [SaveSystem.BACKUP_KEY]: JSON.stringify(extendedSnapshot)
});
ok(SaveSystem.load(strictV2Adapter, 12000).source === 'backup',
  'malformed v2 extension structure falls back to backup');

const whitelistedSnapshot = SaveSystem.createSnapshot({
  dirty: true,
  cache: { canvas: true },
  _persistenceIssue: { kind: 'save' },
  systems: extendedSnapshot.systems
}, 10000);
ok(!('dirty' in whitelistedSnapshot) &&
   !('cache' in whitelistedSnapshot) &&
   !('_persistenceIssue' in whitelistedSnapshot),
  'snapshot creation excludes runtime and recovery controls');

const failedAdapter = jsonAdapter({}, SaveSystem.SNAPSHOT_KEY);
ok(SaveSystem.save(failedAdapter, snapshot, 10000) === false, 'save failure is reported');

const stage2RuleModules = [
  'core/gathering.js',
  'core/production.js',
  'core/farm.js',
  'core/formations.js',
  'core/spirit-beasts.js',
  'core/stage2-rules.js'
];
const forbiddenStage2RuntimeAccess =
  /\b(?:document|window|Platform|SaveSystem|localStorage|canvas)\b|toast\s*\(|Math\.random/;
stage2RuleModules.forEach((path) => {
  ok(
    !forbiddenStage2RuntimeAccess.test(fs.readFileSync(path, 'utf8')),
    path + ' remains pure and independent of UI, storage, and global random'
  );
});

const stage3PureFiles = [
  'content/combat.js',
  'content/techniques.js',
  'content/realms.js',
  'core/stage3-state.js',
  'core/combat-loadouts.js',
  'core/techniques.js',
  'core/combat-stats.js',
  'core/combat-engine.js',
  'core/combat-rewards.js',
  'core/combat-progress.js',
  'core/breakthrough.js',
  'core/stage3-rules.js'
];
const forbiddenStage3RuntimeAccess =
  /Math\.random|localStorage|Platform\.|SaveSystem|document\.|canvas|toast\s*\(/;
stage3PureFiles.forEach((path) => {
  ok(
    !forbiddenStage3RuntimeAccess.test(fs.readFileSync(path, 'utf8')),
    path + ' remains pure and independent of UI, storage, and global random'
  );
});

const browserStore = {};
const browserSandbox = {
  __GAME_TEST_HARNESS_REQUEST__: true,
  Platform: new Proxy({}, {
    get(target, prop) {
      if (prop === 'canvas') return {};
      if (prop === 'ctx') return {};
      if (prop === 'getSystemInfoAsync') return () => {};
      if (prop === 'load') {
        return (key) => key in browserStore
          ? JSON.parse(browserStore[key])
          : null;
      }
      if (prop === 'save') {
        return (key, value) => {
          browserStore[key] = JSON.stringify(value);
          return true;
        };
      }
      return () => {};
    }
  }),
  NIE_MANIFEST: { g: {}, b: {} },
  window: { addEventListener() {}, NIE_ASSET_BASE: '' },
  document: { addEventListener() {}, hidden: false },
  console,
  requestAnimationFrame() {}, setTimeout() {}
};
browserSandbox.globalThis = browserSandbox;
vm.createContext(browserSandbox);
const stage2BrowserFiles = [
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
  'simulation-report.js',
  'state-model.js',
  'simulation.js',
  'game-rules.js',
  'stage2-rules.js',
  'stage3-rules.js',
  'stage4-rules.js'
];
stage2BrowserFiles.forEach((file) => {
  const path = file.indexOf('/') >= 0 ? file : 'core/' + file;
  vm.runInContext(
    fs.readFileSync(path, 'utf8'),
    browserSandbox,
    { filename: path }
  );
});
['game.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-api.js'].forEach((file) => {
  vm.runInContext(fs.readFileSync(file, 'utf8'), browserSandbox, { filename: file });
});
ok(
  typeof browserSandbox.GameRandom.next === 'function',
  'browser random API is available'
);
ok(
  typeof browserSandbox.SaveSystem.load === 'function',
  'browser save API is available'
);
ok(
  browserSandbox.SaveSystem.createSnapshot({
    player: { name: '跨上下文角色' }
  }, 1).player.name === '跨上下文角色',
  'browser save boundary accepts plain records from an embedding context'
);
ok(
  browserSandbox.SaveSystem.SCHEMA_VERSION === 5 &&
    browserSandbox.SaveSystem.createSnapshot({}, 1).schemaVersion === 5,
  'browser composition writes and publishes schema v5 only'
);
ok(
  !!browserSandbox.window.GameAPI,
  'game logic consumes the browser foundation APIs'
);
ok(
  browserSandbox.__GameTestHarness &&
    Object.isFrozen(
      browserSandbox.__GameTestHarness.simulationRuntime
    ) &&
    Object.isFrozen(
      browserSandbox.__GameTestHarness.simulationRuntime.rules
    ) &&
    browserSandbox.__GameTestHarness.simulationRuntime.lanes
      .filter((lane) => lane.id === 'stage3-injury-recovery')
      .length === 1,
  'game constructs one frozen combined Stage 3 simulation runtime'
);
const productionScripts = Array.from(
  fs.readFileSync('index.html', 'utf8').matchAll(
    /<script src="([^"]+)"><\/script>/g
  ),
  (match) => match[1].split('?')[0]
);
const requiredStage3Order = [
  'content/combat.js',
  'content/techniques.js',
  'content/realms.js',
  'core/stage3-state.js',
  'core/combat-loadouts.js',
  'core/techniques.js',
  'core/breakthrough.js',
  'game.js',
  'game-queries.js',
  'game-queries-social.js',
  'game-queries-combat.js',
  'game-commands.js',
  'game-api.js'
];
ok(
  requiredStage3Order.every((file, index) => {
    const position = productionScripts.indexOf(file);
    return position >= 0 &&
      (index === 0 ||
       position > productionScripts.indexOf(requiredStage3Order[index - 1]));
  }),
  'index loads every Stage 3 content dependency before game in order'
);
const deferredCombatRuntimeScripts = [
  'core/combat-stats.js',
  'core/team-combat-snapshot.js',
  'core/team-combat-engine.js',
  'core/team-combat-consequences.js',
  'core/combat-engine.js',
  'core/combat-rewards.js',
  'core/combat-progress.js',
  'core/stage3-rules.js'
];
ok(
  deferredCombatRuntimeScripts.every((file) =>
    productionScripts.indexOf(file) < 0
  ),
  'index defers Stage 3 combat engines out of the sync script chain'
);
ok(
  fs.readFileSync('core/lazy-content.js', 'utf8').includes('ensureCombatRuntime'),
  'LazyContent exposes ensureCombatRuntime for deferred combat engines'
);
function playableBrowserModel(mutate) {
  const model = browserSandbox.Stage2State.createDefaults();
  model.created = true;
  model.processedThroughMs = 2000000000000;
  model.current = null;
  model.player.shouyuan = 120;
  model.player.shouMax = 120;
  if (typeof mutate === 'function') mutate(model);
  return browserSandbox.Stage4State.normalize(
    browserSandbox.Stage4State.ensureWorldPopulation(
      browserSandbox.Stage4State.normalize(model)
    )
  );
}

const canonicalMasteryRuntime = playableBrowserModel(function (model) {
  model.player.inventory = {
    capacity: 88,
    capacityGrants: { shop: 48, achievement: 0, task: 0 },
    stacks: { spiritCarp: 2 },
    bindings: { spiritCarp: { task: 1 } }
  };
  model.player.mastery.herb.poolXp = 12;
  model.player.mastery.herb.parityHerb1 = {
    level: 3,
    xp: 4
  };
  model.player.mastery.alchemy.poolXp = 7;
  model.player.mastery.alchemy.healingPill = {
    level: 2,
    xp: 1
  };
  model.player.legacyProgress = {
    skills: { forgottenSkill: { level: 9, xp: 2 } },
    masteryPools: { herb: 25 },
    masteryEntries: {
      forgottenSkill: {
        legacyPlace: { level: 6, xp: 3 }
      }
    }
  };
});
const canonicalLegacyProgressBytes = JSON.stringify(
  canonicalMasteryRuntime.player.legacyProgress
);
browserSandbox.__GameTestHarness.__test.replaceModel(
  canonicalMasteryRuntime
);
const canonicalMasteryStart =
  browserSandbox.window.GameAPI.commands.startAction({
    key: 'fish:pond'
  });
const canonicalMasteryReload = browserSandbox.SaveSystem.load(
  jsonAdapter(browserStore),
  2000000000000
).snapshot;
ok(
  canonicalMasteryStart.ok &&
    canonicalMasteryReload.current.key === 'fish:pond' &&
    canonicalMasteryReload.player.inventory.capacity === 88 &&
    canonicalMasteryReload.player.inventory.bindings.spiritCarp.task === 1 &&
    canonicalMasteryReload.player.mastery.herb.poolXp === 12 &&
    canonicalMasteryReload.player.mastery.herb.parityHerb1.level === 3 &&
    canonicalMasteryReload.player.mastery.herb.parityHerb1.xp === 4 &&
    canonicalMasteryReload.player.mastery.alchemy.poolXp === 7 &&
    canonicalMasteryReload.player.mastery.alchemy.healingPill.level === 2 &&
    canonicalMasteryReload.player.mastery.alchemy.healingPill.xp === 1 &&
    JSON.stringify(canonicalMasteryReload.player.legacyProgress) ===
      canonicalLegacyProgressBytes,
  'canonical mastery survives command apply and full JSON save/reload'
);

function clearBrowserStore() {
  Object.keys(browserStore).forEach((key) => {
    delete browserStore[key];
  });
}

function beastActionModel() {
  return playableBrowserModel();
}

clearBrowserStore();
const tameActionModel = beastActionModel();
tameActionModel.player.inventory.stacks.beastLureTalisman = 1;
tameActionModel.systems.homestead.beasts.nextId = 2;
tameActionModel.systems.homestead.beasts.encounters = [{
  id: 'encounter-1',
  speciesId: 'spiritFox',
  sourceSkillId: 'herb'
}];
browserSandbox.__GameTestHarness.__test.replaceModel(tameActionModel);
const tameActionStart =
  browserSandbox.window.GameAPI.commands.startAction({
    key: 'beast:tame:encounter-1'
  });
const tameActionReload = browserSandbox.SaveSystem.load(
  jsonAdapter(browserStore),
  2000000000000
).snapshot;
ok(
  tameActionStart.ok &&
    tameActionReload.current &&
    tameActionReload.current.key === 'beast:tame:encounter-1' &&
    tameActionReload.current.mode === 'finite',
  'tame action survives command apply and full JSON save/reload'
);

clearBrowserStore();
const trainActionModel = beastActionModel();
trainActionModel.player.inventory.stacks.beastFeed = 1;
trainActionModel.systems.homestead.beasts.nextId = 2;
trainActionModel.systems.homestead.beasts.roster = [{
  id: 'beast-1',
  speciesId: 'spiritFox',
  level: 1,
  xp: 0,
  traitId: 'keenNose',
  growthId: 'steady'
}];
browserSandbox.__GameTestHarness.__test.replaceModel(trainActionModel);
const trainActionStart =
  browserSandbox.window.GameAPI.commands.startAction({
    key: 'beast:train:beast-1'
  });
const trainActionReload = browserSandbox.SaveSystem.load(
  jsonAdapter(browserStore),
  2000000000000
).snapshot;
ok(
  trainActionStart.ok &&
    trainActionReload.current &&
    trainActionReload.current.key === 'beast:train:beast-1' &&
    trainActionReload.current.mode === 'repeat',
  'training action survives command apply and full JSON save/reload'
);

const selectedBeforeInvalidBeastAction =
  browserSandbox.__GameTestHarness.__test.snapshotModel().current;
const selectedBeforeInvalidBeast = selectedBeforeInvalidBeastAction
  ? selectedBeforeInvalidBeastAction.key
  : null;
const missingEncounterStart =
  browserSandbox.window.GameAPI.commands.startAction({
    key: 'beast:tame:encounter-999'
  });
const malformedBeastStart =
  browserSandbox.window.GameAPI.commands.startAction({
    key: 'beast:train:beast-1:extra'
  });
const removedInvalidBeast = SaveSystem.createSnapshot({
  player: trainActionModel.player,
  systems: trainActionModel.systems,
  current: {
    key: 'beast:train:__proto__',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    stalled: false
  }
}, 2000000000000);
ok(
  !missingEncounterStart.ok &&
    (missingEncounterStart.code === 'requirements_missing' ||
      missingEncounterStart.code === 'requirements_invalid') &&
    !malformedBeastStart.ok &&
    malformedBeastStart.code === 'invalid_action' &&
    (
      browserSandbox.__GameTestHarness.__test.snapshotModel().current
        ? browserSandbox.__GameTestHarness.__test.snapshotModel().current.key
        : null
    ) === selectedBeforeInvalidBeast &&
    removedInvalidBeast.current === null,
  'invalid beast IDs fail atomically and malformed persisted keys are removed'
);

const completeStage2BootstrapGlobals = [
  'Stage2State',
  'Stage2Rules',
  'GameRules',
  'Gathering',
  'Production',
  'Farm',
  'Formations',
  'SpiritBeasts',
  'GatheringContent',
  'RecipeContent',
  'HomesteadContent',
  'Inventory',
  'SkillProgression',
  'GameRandom'
];
const completeStage3BootstrapGlobals = [
  'Stage3State',
  'CombatContent',
  'TechniqueContent',
  'RealmContent',
  'CombatLoadouts',
  'Techniques',
  'Breakthrough'
];
const deferredStage3CombatGlobals = [
  'Stage3Rules',
  'CombatStats',
  'CombatEngine',
  'CombatRewards',
  'CombatProgress'
];

function gameBootstrapSandbox() {
  const sandbox = {
    __GAME_TEST_HARNESS_REQUEST__: true,
    Platform: new Proxy({}, {
      get(target, prop) {
        if (prop === 'canvas') return {};
        if (prop === 'ctx') return {};
        if (prop === 'getSystemInfoAsync') return () => {};
        return () => {};
      }
    }),
    NIE_MANIFEST: { g: {}, b: {} },
    window: { addEventListener() {}, NIE_ASSET_BASE: '' },
    document: { addEventListener() {}, hidden: false },
    console,
    requestAnimationFrame() {},
    setTimeout() {}
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function loadFilesInto(sandbox, files) {
  files.forEach((file) => {
    const path = file.indexOf('/') >= 0 ? file : 'core/' + file;
    vm.runInContext(
      fs.readFileSync(path, 'utf8'),
      sandbox,
      { filename: path }
    );
  });
}

function bootstrapWithMissingStage2Global(missingName) {
  const sandbox = gameBootstrapSandbox();
  loadFilesInto(sandbox, stage2BrowserFiles);
  vm.runInContext(
    'delete globalThis[' + JSON.stringify(missingName) + ']',
    sandbox
  );
  try {
    ['game.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-api.js'].forEach((file) => {
      vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
    });
    return { error: null, sandbox };
  } catch (error) {
    return { error, sandbox };
  }
}

completeStage2BootstrapGlobals.forEach((missingName) => {
  const result = bootstrapWithMissingStage2Global(missingName);
  ok(
    result.error &&
      result.error.message ===
        'Incomplete Stage 2 bootstrap: missing ' + missingName,
    'partial Stage 2 bootstrap fails clearly when missing ' + missingName +
      ' (actual: ' +
      (result.error ? result.error.message : 'no error') + ')'
  );
});

completeStage3BootstrapGlobals.forEach((missingName) => {
  const result = bootstrapWithMissingStage2Global(missingName);
  ok(
    result.error &&
      result.error.message ===
        'Incomplete Stage 3 bootstrap: missing ' + missingName,
    'partial Stage 3 bootstrap fails clearly when missing ' + missingName +
      ' (actual: ' +
      (result.error ? result.error.message : 'no error') + ')'
  );
});

deferredStage3CombatGlobals.forEach((missingName) => {
  const result = bootstrapWithMissingStage2Global(missingName);
  ok(
    result.error === null &&
      result.sandbox &&
      typeof result.sandbox.refreshStage3CombatRuntime === 'function' &&
      result.sandbox.refreshStage3CombatRuntime() === false,
    'missing deferred combat global ' + missingName +
      ' still boots without Incomplete Stage 3' +
      ' (actual: ' +
      (result.error ? result.error.message : 'ok') + ')'
  );
});

['GameRules', 'GameRandom'].forEach((missingName) => {
  const sandbox = gameBootstrapSandbox();
  loadFilesInto(sandbox, [
    'core/random.js',
    'core/save-system.js',
    'core/simulation-report.js',
    'core/state-model.js',
    'core/simulation.js',
    'core/game-rules.js'
  ]);
  vm.runInContext(
    'delete globalThis[' + JSON.stringify(missingName) + ']',
    sandbox
  );
  let error = null;
  try {
    ['game.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-api.js'].forEach((file) => {
      vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
    });
  } catch (caught) {
    error = caught;
  }
  ok(
    error &&
      error.message ===
        'Incomplete Stage 2 bootstrap: missing ' + missingName,
    'legacy fallback fails clearly when missing ' + missingName +
      ' (actual: ' + (error ? error.message : 'no error') + ')'
  );
});

const legacyBootstrapSandbox = gameBootstrapSandbox();
loadFilesInto(legacyBootstrapSandbox, [
  'core/random.js',
  'core/save-system.js',
  'core/simulation-report.js',
  'core/state-model.js',
  'core/simulation.js',
  'core/game-rules.js'
]);
let legacyBootstrapError = null;
try {
  ['game.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-api.js'].forEach((file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), legacyBootstrapSandbox, { filename: file });
  });
} catch (error) {
  legacyBootstrapError = error;
}
ok(
  legacyBootstrapError === null &&
    legacyBootstrapSandbox.__GameTestHarness &&
    legacyBootstrapSandbox.__GameTestHarness.simulationRuntime &&
    typeof legacyBootstrapSandbox.__GameTestHarness
      .simulationRuntime.rules.start === 'undefined',
  'all Stage 2 extensions absent selects the legacy GameRules fallback'
);

function platformSandbox(throwOnWrite) {
  const canvas = {
    getContext() {
      return { setTransform() {} };
    },
    addEventListener() {},
    style: {}
  };
  const sandbox = {
    document: {
      getElementById() { return canvas; },
      createElement() { return { style: {} }; },
      body: { appendChild() {}, removeChild() {} }
    },
    localStorage: {
      setItem() {
        if (throwOnWrite) throw new Error('quota exceeded');
      },
      getItem() { return null; }
    },
    getComputedStyle() { return { paddingTop: '0' }; },
    Image: function Image() {},
    fetch() { return Promise.resolve({ json() { return {}; } }); },
    parseFloat,
    Promise,
    JSON,
    window: {
      devicePixelRatio: 1,
      innerWidth: 420,
      innerHeight: 820,
      addEventListener() {}
    }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('platform.js', 'utf8'), sandbox, {
    filename: 'platform.js'
  });
  return sandbox.window.Platform;
}

ok(
  platformSandbox(false).save('test', { ok: true }) === true,
  'platform save reports a successful write'
);
ok(
  platformSandbox(true).save('test', { ok: true }) === false,
  'platform save reports a failed write'
);

ok(true, 'foundation test harness starts');

console.log(`\n=== 基础设施自测：${pass} 通过 / ${fail} 失败 ===`);
process.exit(fail ? 1 : 0);
