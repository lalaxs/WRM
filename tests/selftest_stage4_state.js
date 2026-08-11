'use strict';

const fs = require('node:fs');
const vm = require('node:vm');
const Stage4State = require('../core/stage4-state.js');
const SaveSystem = require('../core/save-system.js');
const SimulationReport = require('../core/simulation-report.js');
const StateModel = require('../core/state-model.js');

let passed = 0;
let failed = 0;

function ok(condition, label) {
  if (condition) {
    passed++;
    console.log('✓ ' + label);
  } else {
    failed++;
    console.error('✗ ' + label);
  }
}

ok(Stage4State.VERSION === 5, 'Stage 4 状态模块发布 schema v5');
[
  'defaults',
  'migrateV4',
  'normalize',
  'validate',
  'compactEventHistory',
  'snapshotJsonData'
].forEach(function (method) {
  ok(typeof Stage4State[method] === 'function',
    'Stage4State 导出 ' + method);
});
ok(Object.isFrozen(Stage4State), 'Stage4State 公共边界冻结');
const browserSandbox = {
  console: console,
  JSON: JSON,
  Object: Object,
  Array: Array,
  Number: Number,
  String: String,
  Boolean: Boolean,
  Math: Math,
  Set: Set,
  Stage3State: { normalize: function (value) { return value; } },
  RegionContent: { REGIONS: [{ id: 'qinglan-town' }] },
  SectContent: { SECTS: [] },
  NpcGenerationContent: {
    GENERATION_RULES: { bootstrapCount: 120 }
  }
};
browserSandbox.globalThis = browserSandbox;
vm.createContext(browserSandbox);
vm.runInContext(
  fs.readFileSync('core/stage4-state.js', 'utf8'),
  browserSandbox,
  { filename: 'core/stage4-state.js' }
);
ok(browserSandbox.Stage4State.VERSION === 5 &&
   Object.isFrozen(browserSandbox.Stage4State),
'Stage4State UMD 浏览器边界与 CommonJS 一致冻结');

function bootstrapResult() {
  return {
    records: {},
    nextId: 1,
    rngState: 0x12345678
  };
}

function migrateWithOptions(options) {
  try {
    return Stage4State.migrateV4(v4Fixture(), options);
  } catch (error) {
    return null;
  }
}

let statefulBootstrapCalls = 0;
let statefulBootstrapOwnKeys = 0;
const statefulBootstrapTarget = {
  bootstrapWorld: function () {
    statefulBootstrapCalls++;
    return bootstrapResult();
  }
};
const statefulBootstrapOptions = new Proxy(
  statefulBootstrapTarget,
  {
    ownKeys: function () {
      statefulBootstrapOwnKeys++;
      return statefulBootstrapOwnKeys === 1
        ? ['bootstrapWorld']
        : [];
    }
  }
);
const statefulBootstrapResult = migrateWithOptions(
  statefulBootstrapOptions
);
ok(statefulBootstrapResult !== null && statefulBootstrapCalls === 0,
  'stateful bootstrapWorld options 变化时函数零执行');

const preserveFixture = Stage4State.migrateV4(v4Fixture());
let statefulPreserveDescriptors = 0;
const statefulPreserveOptions = new Proxy({
  preserveLegacyFields: true
}, {
  getOwnPropertyDescriptor: function (target, key) {
    if (key !== 'preserveLegacyFields') {
      return Object.getOwnPropertyDescriptor(target, key);
    }
    statefulPreserveDescriptors++;
    return {
      value: statefulPreserveDescriptors === 1,
      enumerable: true,
      configurable: true,
      writable: true
    };
  }
});
const statefulPreserveResult = Stage4State.normalize(
  preserveFixture,
  statefulPreserveOptions
);
ok(!Object.prototype.hasOwnProperty.call(
  statefulPreserveResult.player,
  'realmStage'
), 'stateful preserveLegacyFields spoof fail closed');

let optionGetterHits = 0;
let optionGetterCalls = 0;
const getterOptions = {};
Object.defineProperty(getterOptions, 'bootstrapWorld', {
  enumerable: true,
  get: function () {
    optionGetterHits++;
    return function () {
      optionGetterCalls++;
      return bootstrapResult();
    };
  }
});
ok(migrateWithOptions(getterOptions) !== null &&
   optionGetterHits === 0 &&
   optionGetterCalls === 0,
'bootstrapWorld accessor options 零执行');

let revokedOptionCalls = 0;
const revokedOptionsPair = Proxy.revocable({
  bootstrapWorld: function () {
    revokedOptionCalls++;
    return bootstrapResult();
  }
}, {});
revokedOptionsPair.revoke();
ok(migrateWithOptions(revokedOptionsPair.proxy) !== null &&
   revokedOptionCalls === 0,
'revoked options fail closed');

let throwingOptionCalls = 0;
const throwingOptions = new Proxy({
  bootstrapWorld: function () {
    throwingOptionCalls++;
    return bootstrapResult();
  }
}, {
  ownKeys: function () {
    throw new Error('options ownKeys trap');
  }
});
ok(migrateWithOptions(throwingOptions) !== null &&
   throwingOptionCalls === 0,
'throwing options fail closed');

let nonPlainOptionCalls = 0;
const nonPlainOptions = Object.create({
  bootstrapWorld: function () {
    nonPlainOptionCalls++;
    return bootstrapResult();
  }
});
ok(migrateWithOptions(nonPlainOptions) !== null &&
   nonPlainOptionCalls === 0,
'non-plain options fail closed');

let transparentOptionCalls = 0;
const transparentOptions = new Proxy({
  bootstrapWorld: function () {
    transparentOptionCalls++;
    return bootstrapResult();
  }
}, {});
ok(migrateWithOptions(transparentOptions) !== null &&
   transparentOptionCalls === 1,
'stable transparent proxy options 显式允许且只执行一次');

let plainOptionCalls = 0;
ok(migrateWithOptions({
  bootstrapWorld: function () {
    plainOptionCalls++;
    return bootstrapResult();
  }
}) !== null && plainOptionCalls === 1,
'ordinary plain bootstrapWorld options 正常执行一次');

let nullPrototypeOptionCalls = 0;
const nullPrototypeOptions = Object.create(null);
nullPrototypeOptions.bootstrapWorld = function () {
  nullPrototypeOptionCalls++;
  return bootstrapResult();
};
ok(migrateWithOptions(nullPrototypeOptions) !== null &&
   nullPrototypeOptionCalls === 1,
'null-prototype bootstrapWorld options 正常执行一次');

const plainPreserveResult = Stage4State.normalize(
  preserveFixture,
  { preserveLegacyFields: true }
);
ok(Object.prototype.hasOwnProperty.call(
  plainPreserveResult.player,
  'realmStage'
), 'ordinary stable preserveLegacyFields=true 生效');

let saveSchemaGetterHits = 0;
const hostileSchemaSnapshot = {};
Object.defineProperty(hostileSchemaSnapshot, 'schemaVersion', {
  enumerable: true,
  get: function () {
    saveSchemaGetterHits++;
    throw new Error('schema getter executed');
  }
});
let hostileSchemaLoad = null;
try {
  hostileSchemaLoad = SaveSystem.load({
    load: function (key) {
      return key === SaveSystem.SNAPSHOT_KEY
        ? hostileSchemaSnapshot
        : null;
    }
  }, 1);
} catch (error) {
  hostileSchemaLoad = null;
}
ok(saveSchemaGetterHits === 0 && hostileSchemaLoad !== null,
  'SaveSystem.load 不执行 schema accessor 且安全恢复');

let saveModelGetterHits = 0;
const hostileModelSnapshot = {
  schemaVersion: 5
};
Object.defineProperty(hostileModelSnapshot, 'modelVersion', {
  enumerable: true,
  get: function () {
    saveModelGetterHits++;
    throw new Error('model getter executed');
  }
});
let hostileModelLoad = null;
try {
  hostileModelLoad = SaveSystem.load({
    load: function (key) {
      return key === SaveSystem.SNAPSHOT_KEY
        ? hostileModelSnapshot
        : null;
    }
  }, 1);
} catch (error) {
  hostileModelLoad = null;
}
ok(saveModelGetterHits === 0 && hostileModelLoad !== null,
  'SaveSystem.load 不执行 model accessor 且安全恢复');

let actionKeyGetterHits = 0;
let actionContextGetterHits = 0;
const hostileAction = {};
Object.defineProperty(hostileAction, 'key', {
  enumerable: true,
  get: function () {
    actionKeyGetterHits++;
    throw new Error('action key getter executed');
  }
});
Object.defineProperty(hostileAction, 'context', {
  enumerable: true,
  get: function () {
    actionContextGetterHits++;
    throw new Error('action context getter executed');
  }
});
let hostileActionResult = null;
try {
  hostileActionResult = SaveSystem.normalizeAction(hostileAction);
} catch (error) {
  hostileActionResult = 'threw';
}
ok(actionKeyGetterHits === 0 &&
   actionContextGetterHits === 0 &&
   hostileActionResult === null,
'动作 key/context accessor 不执行且不进入存档');

let nestedContextGetterHits = 0;
const nestedActionContext = { safe: 'kept' };
Object.defineProperty(nestedActionContext, 'poison', {
  enumerable: true,
  get: function () {
    nestedContextGetterHits++;
    throw new Error('nested action context getter executed');
  }
});
let nestedActionResult = null;
try {
  nestedActionResult = SaveSystem.normalizeAction({
    key: 'gather:explore:herb',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    stalled: false,
    context: nestedActionContext
  });
} catch (error) {
  nestedActionResult = null;
}
ok(nestedContextGetterHits === 0 &&
   nestedActionResult !== null &&
   nestedActionResult.context.safe === 'kept' &&
   !Object.prototype.hasOwnProperty.call(
     nestedActionResult.context,
     'poison'
   ),
'动作 context 内层 getter 零执行且不持久化');

let appearancePartsGetterHits = 0;
const appearanceGetterInput = v4Fixture();
Object.defineProperty(appearanceGetterInput.appearance, 'parts', {
  enumerable: true,
  configurable: true,
  get: function () {
    appearancePartsGetterHits++;
    throw new Error('appearance.parts getter executed');
  }
});
let appearanceGetterSnapshot = null;
try {
  appearanceGetterSnapshot = SaveSystem.createSnapshot(
    appearanceGetterInput,
    1
  );
} catch (error) {
  appearanceGetterSnapshot = null;
}
ok(appearancePartsGetterHits === 0 &&
   appearanceGetterSnapshot !== null &&
   Object.keys(appearanceGetterSnapshot.appearance.parts).length === 0,
'appearance.parts getter 零执行且安全丢弃');

let playerNameGetterHits = 0;
const playerGetterInput = v4Fixture();
Object.defineProperty(playerGetterInput.player, 'name', {
  enumerable: true,
  configurable: true,
  get: function () {
    playerNameGetterHits++;
    throw new Error('player.name getter executed');
  }
});
let playerGetterSnapshot = null;
try {
  playerGetterSnapshot = SaveSystem.createSnapshot(
    playerGetterInput,
    1
  );
} catch (error) {
  playerGetterSnapshot = null;
}
ok(playerNameGetterHits === 0 &&
   playerGetterSnapshot !== null &&
   playerGetterSnapshot.player.name !== 'poison',
'player.name getter 零执行且不进入快照');

let stateNestedPlayerGetterHits = 0;
let stateNestedContextGetterHits = 0;
const stateNestedInput = v4Fixture();
Object.defineProperty(stateNestedInput.player, 'name', {
  enumerable: true,
  configurable: true,
  get: function () {
    stateNestedPlayerGetterHits++;
    throw new Error('StateModel nested player getter executed');
  }
});
stateNestedInput.current = {
  key: 'gather:explore:herb',
  mode: 'repeat',
  count: 0,
  done: 0,
  elapsed: 0,
  stalled: false,
  context: {}
};
Object.defineProperty(stateNestedInput.current.context, 'poison', {
  enumerable: true,
  get: function () {
    stateNestedContextGetterHits++;
    throw new Error('StateModel nested context getter executed');
  }
});
let stateNestedResult = null;
try {
  stateNestedResult = StateModel.normalize(stateNestedInput, 1);
} catch (error) {
  stateNestedResult = null;
}
ok(stateNestedPlayerGetterHits === 0 &&
   stateNestedContextGetterHits === 0 &&
   stateNestedResult !== null &&
   (!stateNestedResult.current ||
    !stateNestedResult.current.context ||
    !Object.prototype.hasOwnProperty.call(
      stateNestedResult.current.context,
      'poison'
    )),
'StateModel 深层 player/context getter 零执行');

let modelSchemaGetterHits = 0;
const hostileStateModel = {};
Object.defineProperty(hostileStateModel, 'schemaVersion', {
  enumerable: true,
  get: function () {
    modelSchemaGetterHits++;
    throw new Error('StateModel schema getter executed');
  }
});
let hostileStateModelResult = null;
try {
  hostileStateModelResult = StateModel.normalize(hostileStateModel, 1);
} catch (error) {
  hostileStateModelResult = null;
}
ok(modelSchemaGetterHits === 0 && hostileStateModelResult !== null,
  'StateModel 不执行 schema accessor 且安全规范化');

const revokedSavePair = Proxy.revocable({}, {});
revokedSavePair.revoke();
let revokedSaveResult = null;
try {
  revokedSaveResult = SaveSystem.load({
    load: function (key) {
      return key === SaveSystem.SNAPSHOT_KEY
        ? revokedSavePair.proxy
        : null;
    }
  }, 1);
} catch (error) {
  revokedSaveResult = null;
}
ok(revokedSaveResult !== null,
  'SaveSystem 对 revoked proxy 存档 fail closed');

let throwingModelResult = null;
try {
  throwingModelResult = StateModel.normalize(new Proxy({}, {
    getOwnPropertyDescriptor: function () {
      throw new Error('descriptor trap');
    }
  }), 1);
} catch (error) {
  throwingModelResult = null;
}
ok(throwingModelResult !== null,
  'StateModel 对 throwing proxy fail closed');

let actionProxyResult = 'threw';
let actionProxyOwnKeys = 0;
try {
  actionProxyResult = SaveSystem.normalizeAction(new Proxy({
    key: 'gather:explore:herb'
  }, {
    ownKeys: function () {
      actionProxyOwnKeys++;
      return actionProxyOwnKeys % 2 === 1 ? ['key'] : [];
    }
  }));
} catch (error) {
  actionProxyResult = 'threw';
}
ok(actionProxyResult === null,
  '动作描述器对 stateful proxy fail closed');

const nonPlainAction = Object.create({ key: 'gather:explore:herb' });
ok(SaveSystem.normalizeAction(nonPlainAction) === null,
  '动作描述器拒绝 non-plain prototype');

let playerGetterHits = 0;
const hostilePlayerModel = { schemaVersion: 5 };
Object.defineProperty(hostilePlayerModel, 'player', {
  enumerable: true,
  get: function () {
    playerGetterHits++;
    throw new Error('player getter executed');
  }
});
let hostilePlayerResult = null;
try {
  hostilePlayerResult = Stage4State.normalize(hostilePlayerModel);
} catch (error) {
  hostilePlayerResult = null;
}
ok(playerGetterHits === 0 && hostilePlayerResult !== null,
  'Stage4State 在旧阶段 normalizer 前剥离 player accessor');

let revokedProxyResult = null;
const revokedPair = Proxy.revocable({}, {});
revokedPair.revoke();
try {
  revokedProxyResult = Stage4State.normalize(revokedPair.proxy);
} catch (error) {
  revokedProxyResult = null;
}
ok(revokedProxyResult !== null,
  'revoked proxy fail closed 且不逃逸异常');

let throwingProxyResult = null;
try {
  throwingProxyResult = Stage4State.normalize(new Proxy({}, {
    ownKeys: function () {
      throw new Error('ownKeys trap');
    }
  }));
} catch (error) {
  throwingProxyResult = null;
}
ok(throwingProxyResult !== null,
  'throwing proxy fail closed 且不逃逸异常');

let statefulOwnKeysCalls = 0;
const statefulProxy = new Proxy({
  player: { identity: { gender: 'male' } },
  systems: {}
}, {
  ownKeys: function () {
    statefulOwnKeysCalls++;
    return statefulOwnKeysCalls % 2 === 1
      ? ['player']
      : ['systems'];
  }
});
let statefulProxyResult = null;
try {
  statefulProxyResult = Stage4State.normalize(statefulProxy);
} catch (error) {
  statefulProxyResult = null;
}
ok(statefulProxyResult !== null &&
   (!statefulProxyResult.player ||
     statefulProxyResult.player.identity.gender === 'female'),
'stateful proxy 不注入不一致字段且安全恢复');

const nonPlain = Object.create({ inheritedPoison: true });
nonPlain.schemaVersion = 5;
nonPlain.player = { identity: { gender: 'male' } };
let nonPlainResult = null;
try {
  nonPlainResult = Stage4State.normalize(nonPlain);
} catch (error) {
  nonPlainResult = null;
}
ok(nonPlainResult !== null &&
   !Object.prototype.hasOwnProperty.call(
     nonPlainResult,
     'inheritedPoison'
   ),
'non-plain prototype fail closed 且不继承污染字段');

const disguisedPrototype = Object.create(null);
const disguisedNonPlain = Object.create(disguisedPrototype);
disguisedNonPlain.safe = true;
let disguisedSnapshot = 'missing';
try {
  disguisedSnapshot = typeof Stage4State.snapshotJsonData === 'function'
    ? Stage4State.snapshotJsonData(disguisedNonPlain)
    : 'missing';
} catch (error) {
  disguisedSnapshot = 'threw';
}
ok(disguisedSnapshot === null,
  'Object.create(Object.create(null)) 被严格拒绝');

const nestedRevokedPair = Proxy.revocable({ poison: true }, {});
nestedRevokedPair.revoke();
let nestedStatefulCalls = 0;
const nestedHostileInput = {
  safeBefore: { value: 1 },
  revoked: nestedRevokedPair.proxy,
  throwing: new Proxy({ poison: true }, {
    getOwnPropertyDescriptor: function () {
      throw new Error('nested descriptor trap');
    }
  }),
  stateful: new Proxy({ left: 1, right: 2 }, {
    ownKeys: function () {
      nestedStatefulCalls++;
      return nestedStatefulCalls % 2 === 1
        ? ['left']
        : ['right'];
    }
  }),
  safeAfter: { value: 2 }
};
let nestedHostileSnapshot = null;
try {
  nestedHostileSnapshot =
    typeof Stage4State.snapshotJsonData === 'function'
      ? Stage4State.snapshotJsonData(nestedHostileInput)
      : null;
} catch (error) {
  nestedHostileSnapshot = null;
}
ok(nestedHostileSnapshot !== null &&
   nestedHostileSnapshot.safeBefore.value === 1 &&
   nestedHostileSnapshot.safeAfter.value === 2 &&
   !Object.prototype.hasOwnProperty.call(
     nestedHostileSnapshot,
     'revoked'
   ) &&
   !Object.prototype.hasOwnProperty.call(
     nestedHostileSnapshot,
     'throwing'
   ) &&
   !Object.prototype.hasOwnProperty.call(
     nestedHostileSnapshot,
     'stateful'
   ),
'revoked/throwing/stateful nested proxy 局部 fail closed');

const deeplyNested = {};
let deepCursor = deeplyNested;
for (let deepIndex = 0; deepIndex < 20000; deepIndex++) {
  deepCursor.next = {};
  deepCursor = deepCursor.next;
}
const deepFixture = v4Fixture();
deepFixture.schemaVersion = 5;
deepFixture.systems = deepFixture.systems || {};
deepFixture.systems.events = {
  pending: [{
    id: 'event-deep',
    templateId: 'deep',
    templateRevision: 1,
    createdAt: 0,
    participants: [],
    context: deeplyNested,
    title: '深层事件',
    body: '测试有界恢复',
    options: [{
      id: 'ok',
      label: '确认',
      preview: '',
      effects: []
    }]
  }]
};
let deepResult = null;
const deepStartedAt = Date.now();
try {
  deepResult = Stage4State.normalize(deepFixture);
} catch (error) {
  deepResult = null;
}
const deepElapsedMs = Date.now() - deepStartedAt;
ok(deepResult !== null && deepElapsedMs < 4000,
  '20000 层 JSON 输入不栈溢出并在预算内恢复');

const oversizedFixture = Stage4State.migrateV4(v4Fixture());
oversizedFixture.systems.events.pending = [pendingEvent(1)];
oversizedFixture.systems.events.pending[0].participants = Array.from(
  { length: 25000 },
  function (_, index) { return 'npc-hostile-' + index; }
);
oversizedFixture.systems.events.pending[0].options = Array.from(
  { length: 5000 },
  function (_, index) {
    return {
      id: 'option-' + index,
      label: '选项' + index,
      preview: '',
      effects: []
    };
  }
);
oversizedFixture.systems.events.summaries = Array.from(
  { length: 5000 },
  function (_, index) {
    return { id: 'summary-hostile-' + index, at: index };
  }
);
oversizedFixture.systems.events.evolution = Array.from(
  { length: 5000 },
  function (_, index) {
    return { id: 'evolution-hostile-' + index, at: index };
  }
);
let oversizedResult = null;
const oversizedStartedAt = Date.now();
try {
  oversizedResult = Stage4State.normalize(oversizedFixture);
} catch (error) {
  oversizedResult = null;
}
const oversizedElapsedMs = Date.now() - oversizedStartedAt;
ok(oversizedResult !== null &&
   oversizedResult.systems.events.pending[0].participants.length <= 2000 &&
   oversizedResult.systems.events.pending[0].options.length <= 100 &&
   oversizedResult.systems.events.summaries.length === 300 &&
   oversizedResult.systems.events.evolution.length === 500 &&
   oversizedElapsedMs < 4000,
'25000 参与者与超大 options/history 按固定预算快速恢复');
console.log(
  '  hostile performance: depth-20000=' + deepElapsedMs +
  'ms, oversized=' + oversizedElapsedMs + 'ms'
);

const preservedHistory = Stage4State.migrateV4(v4Fixture());
preservedHistory.systems.events.summaries = Array.from(
  { length: 5000 },
  function (_, index) {
    return {
      id: 's-' + index,
      at: index,
      category: 'npc',
      importantIds: ['npc-summary-' + index]
    };
  }
);
preservedHistory.systems.events.evolution = Array.from(
  { length: 5000 },
  function (_, index) {
    return {
      id: 'e-' + index,
      at: index,
      category: 'world',
      importantIds: ['npc-evolution-' + index]
    };
  }
);
const preservedHistoryResult = Stage4State.normalize(preservedHistory);
const summaryCompactedCount =
  preservedHistoryResult.systems.events.compacted.reduce(
    function (total, entry) {
      return total + (entry.source === 'summary' ? entry.count : 0);
    },
    0
  );
const evolutionCompactedCount =
  preservedHistoryResult.systems.events.compacted.reduce(
    function (total, entry) {
      return total + (entry.source === 'evolution' ? entry.count : 0);
    },
    0
  );
const preservedImportantIds = new Set();
preservedHistoryResult.systems.events.compacted.forEach(function (entry) {
  entry.importantIds.forEach(function (id) {
    preservedImportantIds.add(id);
  });
});
ok(summaryCompactedCount +
     preservedHistoryResult.systems.events.summaries.length === 5000 &&
   evolutionCompactedCount +
     preservedHistoryResult.systems.events.evolution.length === 5000,
'5000+5000 历史压缩后总数精确保留');
ok(preservedHistoryResult.systems.events.summaries.length === 300 &&
   preservedHistoryResult.systems.events.summaries[299].id === 's-4999' &&
   preservedHistoryResult.systems.events.evolution.length === 500 &&
   preservedHistoryResult.systems.events.evolution[499].id === 'e-4999',
'历史详细上限保留最新 s-4999/e-4999');
ok(preservedImportantIds.has('npc-summary-0') &&
   preservedImportantIds.has('npc-summary-4699') &&
   preservedImportantIds.has('npc-evolution-0') &&
   preservedImportantIds.has('npc-evolution-4499'),
'压缩历史精确保留全部被压缩重要人物边界 ID');
ok(JSON.stringify(Stage4State.normalize(preservedHistoryResult)) ===
   JSON.stringify(preservedHistoryResult),
'超大历史压缩结果再次规范化字节稳定');

const parallelPreservation = Stage4State.migrateV4(v4Fixture());
parallelPreservation.systems.parallel.jobs = Array.from(
  { length: 2001 },
  function (_, index) {
    return {
      id: 'parallel-valid-' + index,
      remainingSeconds: index + 1
    };
  }
);
const parallelPreservationResult = Stage4State.normalize(
  parallelPreservation
);
ok(parallelPreservationResult.systems.parallel.jobs.length === 2001 &&
   parallelPreservationResult.systems.parallel.jobs[2000].id ===
     'parallel-valid-2000',
'2001 条有效并行任务全部保留且无通用槽位截断');

const isolatedBranchFixture = Stage4State.migrateV4(v4Fixture());
isolatedBranchFixture.systems.npcs.records = {
  'npc-1': npc('npc-1')
};
isolatedBranchFixture.systems.npcs.activeIds = ['npc-1'];
isolatedBranchFixture.systems.npcs.backgroundIds = [];
isolatedBranchFixture.systems.gathering.fishRecoverAcc = 17;
isolatedBranchFixture.systems.combat.nextLootId = 7;
isolatedBranchFixture.systems.parallel.jobs = [{
  id: 'parallel-after-events',
  remainingSeconds: 10
}];
isolatedBranchFixture.systems.events.pending = [pendingEvent(1)];
isolatedBranchFixture.systems.events.pending[0].context = {
  hostileBreadth: Array.from(
    { length: 60 },
    function () {
      return new Array(2000).fill(1);
    }
  )
};
let isolatedBranchResult = null;
const isolatedBranchStartedAt = Date.now();
try {
  isolatedBranchResult = Stage4State.normalize(isolatedBranchFixture);
} catch (error) {
  isolatedBranchResult = null;
}
const isolatedBranchElapsedMs = Date.now() - isolatedBranchStartedAt;
ok(isolatedBranchResult !== null &&
   Object.prototype.hasOwnProperty.call(
     isolatedBranchResult.systems.npcs.records,
     'npc-1'
   ) &&
   isolatedBranchResult.systems.gathering.fishRecoverAcc === 17 &&
   isolatedBranchResult.systems.combat.nextLootId === 7 &&
   isolatedBranchResult.systems.parallel.jobs.some(function (job) {
     return job.id === 'parallel-after-events';
   }) &&
   isolatedBranchElapsedMs < 4000,
'超大恶意 events 子树不删除后续 NPC/Stage2/Stage3 分支');
console.log(
  '  isolated hostile events: ' + isolatedBranchElapsedMs + 'ms'
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function adapter(initial) {
  const store = new Map();
  Object.keys(initial || {}).forEach(function (key) {
    store.set(key, clone(initial[key]));
  });
  return {
    load: function (key) {
      return store.has(key) ? clone(store.get(key)) : null;
    },
    save: function (key, value) {
      store.set(key, clone(value));
      return true;
    },
    read: function (key) {
      return store.has(key) ? clone(store.get(key)) : null;
    }
  };
}

function completedReport(id) {
  const report = SimulationReport.create({
    id: id,
    source: 'online',
    fromMs: 100,
    toMs: 200,
    requestedSeconds: 1,
    actionKey: 'gather:explore:herb',
    seedBefore: 123
  });
  report.action.completed = 1;
  return report;
}

function stripStage4(snapshot) {
  const legacy = clone(snapshot);
  legacy.schemaVersion = 4;
  if (legacy.player) delete legacy.player.lifecycle;
  if (legacy.player) {
    delete legacy.player.identity;
    delete legacy.player.regionId;
    delete legacy.player.flags;
  }
  [
    'npcs',
    'relationships',
    'events',
    'sects',
    'social',
    'teamCombat',
    'lineage'
  ].forEach(function (key) {
    if (legacy.systems) delete legacy.systems[key];
  });
  if (legacy.systems && legacy.systems.world) {
    [
      'elapsedSeconds',
      'activeAccumulator',
      'backgroundAccumulator',
      'sectAccumulator',
      'eventAccumulator',
      'regions'
    ].forEach(function (key) {
      delete legacy.systems.world[key];
    });
  }
  if (legacy.systems &&
      legacy.systems.homestead) {
    delete legacy.systems.homestead.inheritanceHall;
  }
  return legacy;
}

function v4Fixture() {
  const snapshot = SaveSystem.createSnapshot({
    created: true,
    appearance: {
      parts: {
        body: 2,
        cloth: 3,
        eyebrush: 1,
        eyes: 4,
        hair: 5,
        mouth: 2,
        nose: 1
      }
    },
    player: {
      name: '闻人照月',
      shouMax: 120,
      shouyuan: 119,
      skills: {
        charm: { level: 9, xp: 18 }
      },
      mastery: {
        herb: { level: 2, xp: 3 }
      }
    },
    rngState: 0x12345678,
    processedThroughMs: 1000
  }, 1000);
  return stripStage4(snapshot);
}

function npc(id, status, sectId) {
  return {
    id: id,
    identity: {
      name: '人物' + id,
      gender: 'female',
      appearance: {
        buildId: 'slender',
        faceId: 'clear-face',
        hairId: 'long-black',
        featureId: 'quiet-eyes'
      }
    },
    ageYears: 23,
    ageRemainderSeconds: 0,
    lifespanYears: 47,
    realmStage: 0,
    cultivation: 0,
    talentId: 'wood-spirit',
    personalityId: 'steady',
    valueProfileId: 'benevolent',
    romancePrincipleId: 'negotiable',
    regionId: 'qinglan-town',
    sectId: sectId == null ? null : sectId,
    familyId: 'family-1',
    skills: { herb: 8 },
    techniques: [],
    inventorySummary: { wealthTier: 1, notableItemIds: [] },
    biography: [],
    keyEventIds: [],
    status: status || 'living',
    lastDetailedAt: 0,
    lastBackgroundAt: 0
  };
}

function pendingEvent(index) {
  return {
    id: 'event-' + index,
    templateId: 'fixture-' + index,
    templateRevision: 1,
    createdAt: index,
    participants: ['npc-' + index],
    context: { npcName: '人物' + index },
    title: '事件' + index,
    body: '人物' + index + '带来一条消息。',
    options: [{
      id: 'accept',
      label: '接受',
      preview: '继续这件事',
      effects: []
    }]
  };
}

if (typeof Stage4State.defaults === 'function') {
  const defaults = Stage4State.defaults();
  ok(defaults.player.identity.gender === 'female',
    '默认玩家身份固定为女性');
  ok(defaults.player.regionId === 'qinglan-town',
    '默认玩家位于抽象地区青岚镇');
  ok(defaults.player.flags.completedFirstAction === false,
    '默认尚未完成首次主行动');
  ok(defaults.systems.npcs.activeTarget === 40 &&
     defaults.systems.npcs.nextId === 1,
  '默认人物池目标 40 且空池从 npc-1 开始');
  ok(Array.isArray(defaults.systems.events.pending) &&
     defaults.systems.events.pending.length === 0,
  '默认待决策事件队列为空');
  ok(Object.keys(defaults.systems.sects.records).length === 5,
    '默认创建五个固定宗门状态');
  ok(defaults.systems.social.nextBenefitId === 1,
    '默认社交增益编号从 1 开始');
}

if (typeof Stage4State.migrateV4 === 'function' &&
    typeof Stage4State.normalize === 'function') {
  const old = v4Fixture();
  let bootstrapCalls = 0;
  const migrated = Stage4State.migrateV4(old, {
    bootstrapWorld: function (request) {
      bootstrapCalls++;
      ok(request.count === 120 &&
         request.rngState === 0x12345678,
      'v4 迁移用保存的 RNG 请求首批 120 人物');
      return {
        records: {
          'npc-1': npc('npc-1'),
          'npc-2': npc('npc-2')
        },
        nextId: 3,
        rngState: 0x3456789A,
        familyIds: ['family-1']
      };
    }
  });
  ok(bootstrapCalls === 1 && migrated.schemaVersion === 5,
    'v4 只迁移一次并提升为 v5');
  ok(migrated.rngState === 0x3456789A &&
     Object.keys(migrated.systems.npcs.records).length === 2,
  '迁移保存首批人物与推进后的 RNG');
  ok(migrated.player.identity.gender === 'female',
    '旧角色补充女性身份');
  ok(JSON.stringify(migrated.appearance.parts) ===
     JSON.stringify(old.appearance.parts),
  '旧角色外貌部件完整保留');
  ok(!Object.prototype.hasOwnProperty.call(
    migrated.player.mastery,
    'charm'
  ), '魅力没有熟练度或精通分支');

  const defaultMigrated = Stage4State.migrateV4(v4Fixture());
  ok(Object.keys(defaultMigrated.systems.npcs.records).length === 120 &&
     defaultMigrated.systems.npcs.nextId === 121 &&
     defaultMigrated.rngState !== 0x12345678,
  '生成器加载后 v4 默认迁移首批 120 名永久人物');
  ok(defaultMigrated.systems.npcs.activeIds.length === 40 &&
     defaultMigrated.systems.npcs.backgroundIds.length === 80,
  '默认迁移后首批人物规范分入 40 人活跃层与 80 人背景层');
  const defaultReopened = Stage4State.normalize(clone(defaultMigrated));
  ok(JSON.stringify(defaultReopened) === JSON.stringify(defaultMigrated),
    '默认生成后的 v5 重开字节稳定且不重掷人物或 RNG');

  const reopened = Stage4State.normalize(clone(migrated), {
    bootstrapWorld: function () {
      bootstrapCalls++;
      throw new Error('v5 reopen must not bootstrap');
    }
  });
  ok(bootstrapCalls === 1,
    '通用 normalize 与 v5 重开均不重新生成人物');
  ok(JSON.stringify(reopened) === JSON.stringify(migrated),
    '规范化后的 v5 JSON 字节稳定');
  const extendedFlags = clone(migrated);
  extendedFlags.player.flags.zetaFixture = true;
  const flagsOnce = Stage4State.normalize(extendedFlags);
  const flagsTwice = Stage4State.normalize(clone(flagsOnce));
  ok(JSON.stringify(flagsOnce) === JSON.stringify(flagsTwice),
    '扩展玩家 flags 也保持规范键序与字节稳定');

  const inactiveAction = v4Fixture();
  inactiveAction.current = {
    key: 'gather:explore:herb',
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 10,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null,
    stalled: false
  };
  const inactiveMigrated = Stage4State.migrateV4(inactiveAction);
  ok(inactiveMigrated.player.flags.completedFirstAction === false,
    '仅开始行动不会误判完成首次行动');

  const completed = v4Fixture();
  completed.reportArchive = [completedReport('completed-first-action')];
  const completedMigrated = Stage4State.migrateV4(completed);
  ok(completedMigrated.player.flags.completedFirstAction === true,
    '只有真实完成报告才推断首次行动已完成');

  const corrupt = Stage4State.normalize(migrated);
  corrupt.systems.npcs.records = {
    'npc-1': npc('wrong-id', 'living', 'taixuan-sword'),
    'npc-2': npc('npc-2', 'living', 'baicao-valley'),
    'npc-3': npc('npc-3', 'living', null),
    'npc-4': npc('npc-4', 'ascended', null)
  };
  corrupt.systems.npcs.activeTarget = 999;
  corrupt.systems.npcs.activeIds = [
    'npc-1', 'npc-1', 'npc-4', 'missing'
  ];
  corrupt.systems.npcs.backgroundIds = [
    'npc-1', 'npc-2', 'npc-2'
  ];
  corrupt.systems.relationships.edges = {
    'player>npc-1': {
      affection: -100,
      trust: 42.9,
      romanticAttachment: 101,
      desire: Infinity,
      dependence: NaN,
      loyalty: 55,
      jealousy: 3,
      resentment: 500,
      lastChangedAt: -2
    }
  };
  corrupt.systems.relationships.bonds = {
    'player|npc-1': {
      stage: 'friend',
      changedByEventId: null,
      changedAt: 1
    },
    'npc-1|player': {
      stage: 'partner',
      changedByEventId: 'event-x',
      changedAt: 2
    }
  };
  corrupt.systems.relationships.restrictions = {
    'player|npc-2': 'blood',
    'npc-2|player': 'guardianship'
  };
  corrupt.systems.events.pending = Array.from(
    { length: 21 },
    function (_, index) { return pendingEvent(index + 1); }
  );
  corrupt.systems.sects.records['taixuan-sword'].memberIds = [
    'npc-1',
    'npc-2'
  ];
  corrupt.systems.sects.records['taixuan-sword'].roleByNpcId = {
    'npc-1': 'disciple',
    'npc-2': 'disciple',
    missing: 'elder'
  };
  corrupt.systems.parallel.jobs = Array.from(
    { length: 20 },
    function (_, index) {
      return {
        id: 'social-job-' + (index + 1),
        kind: 'social',
        npcId: 'npc-' + ((index % 3) + 1),
        sourceEventId: 'event-' + (index + 1),
        label: '与人物互寄书信' + (index + 1),
        remainingSeconds: 0,
        totalSeconds: 1800,
        followupTemplateId: 'social-letter-return',
        context: {
          subject: '近况',
          impossible: index === 0 ? Infinity : index
        },
        ready: true,
        completionReported: false
      };
    }
  ).concat({
    id: 'injury-1',
    kind: 'injury',
    remainingSeconds: 2,
    totalSeconds: 3
  });
  corrupt.systems.world.elapsedSeconds = -1;
  corrupt.systems.world.activeAccumulator = Infinity;
  corrupt.systems.world.regions['qinglan-town'].prosperity = 999;
  corrupt.systems.world.regions['qinglan-town'].danger = -5;

  const repaired = Stage4State.normalize(corrupt);
  const livingIds = Object.keys(repaired.systems.npcs.records)
    .filter(function (id) {
      return repaired.systems.npcs.records[id].status === 'living';
    });
  const tierIds = repaired.systems.npcs.activeIds.concat(
    repaired.systems.npcs.backgroundIds
  );
  ok(Object.keys(repaired.systems.npcs.records).length === 4 &&
     repaired.systems.npcs.records['npc-1'].id === 'npc-1',
  '规范化不删除人物记录且以稳定记录键修复 ID');
  ok(new Set(tierIds).size === tierIds.length,
    '活跃与背景人物层级没有重复 ID');
  ok(livingIds.every(function (id) {
    return tierIds.filter(function (tierId) {
      return tierId === id;
    }).length === 1;
  }), '每名仍在世人物恰好属于一个模拟层级');
  ok(!tierIds.includes('npc-4') && !tierIds.includes('missing'),
    '非在世或不存在的人物不占模拟层级');
  ok(repaired.systems.npcs.activeTarget === 50,
    '活跃目标被限制到 30–50');
  const edge = repaired.systems.relationships.edges['player>npc-1'];
  ok(edge.affection === 0 &&
     edge.trust === 42 &&
     edge.romanticAttachment === 100 &&
     edge.desire === 0 &&
     edge.dependence === 0 &&
     edge.resentment === 100,
  '八项关系数值取有限整数并夹在 0–100');
  ok(Object.keys(repaired.systems.relationships.bonds).length === 1 &&
     Object.keys(repaired.systems.relationships.bonds)[0] ===
       'npc-1|player',
  '羁绊使用唯一无序人物对键');
  ok(Object.keys(repaired.systems.relationships.restrictions).length === 1 &&
     repaired.systems.relationships.restrictions['npc-2|player'] ===
       'blood',
  '限制关系使用唯一无序人物对键');
  ok(repaired.systems.events.pending.length === 20 &&
     repaired.systems.events.pending[19].id === 'event-20',
  '待决策事件硬上限 20 且保留有效快照顺序');
  ok(!Object.prototype.hasOwnProperty.call(
    repaired.systems.sects.records['taixuan-sword'],
    'memberIds'
  ) &&
     Object.keys(
       repaired.systems.sects.records['taixuan-sword'].roleByNpcId
     ).join(',') === 'npc-1',
  '宗门成员只由人物 sectId 持有且角色表不重复成员资格');
  ok(repaired.systems.parallel.jobs.length === 21 &&
     repaired.systems.parallel.jobs.slice(0, 20).every(function (job) {
       return job.ready === true && job.completionReported === false;
     }) &&
     repaired.systems.parallel.jobs[0].ready === true &&
     repaired.systems.parallel.jobs[0].completionReported === false,
  '20 条已完成待晋升社交任务与旧阶段并行任务均存活');
  ok(repaired.systems.parallel.jobs[0].context.impossible === 0 &&
     JSON.stringify(repaired) === JSON.stringify(clone(repaired)),
  '持久状态与行动上下文保持 JSON 安全');
  ok(repaired.systems.world.elapsedSeconds === 0 &&
     repaired.systems.world.activeAccumulator === 0 &&
     repaired.systems.world.regions['qinglan-town'].prosperity === 100 &&
     repaired.systems.world.regions['qinglan-town'].danger === 0,
  '世界计时与地区 0–100 数值确定性修复');

  const rerun = Stage4State.normalize(clone(repaired));
  ok(JSON.stringify(rerun) === JSON.stringify(repaired),
    '损坏状态修复后再次规范化字节稳定');
  ok(Stage4State.validate(repaired) === true &&
     Stage4State.validate(corrupt) === false,
  'validate 只接受规范化 v5 结构');

  const history = clone(repaired);
  history.systems.events.summaries = Array.from(
    { length: 305 },
    function (_, index) {
      return {
        id: 'summary-' + index,
        at: index,
        category: index % 2 ? 'social' : 'sect',
        importantIds: index === 0 ? ['npc-1'] : []
      };
    }
  );
  history.systems.events.evolution = Array.from(
    { length: 505 },
    function (_, index) {
      return {
        id: 'evolution-' + index,
        at: index,
        category: 'world',
        importantIds: index === 1 ? ['taixuan-sword'] : []
      };
    }
  );
  const compacted = Stage4State.compactEventHistory(history);
  ok(compacted.systems.events.summaries.length === 300 &&
     compacted.systems.events.evolution.length === 500,
  '事件历史只压缩超过 300/500 的旧记录');
  const compactCount = compacted.systems.events.compacted.reduce(
    function (sum, item) { return sum + item.count; },
    0
  );
  ok(compactCount === 10,
    '压缩记录保存全部旧事件计数');
  ok(compacted.systems.events.compacted.some(function (item) {
    return item.importantIds.includes('npc-1');
  }) && compacted.systems.events.compacted.some(function (item) {
    return item.importantIds.includes('taixuan-sword');
  }), '压缩记录保留重要人物与宗门 ID');
}

if (SaveSystem.SCHEMA_VERSION === 5) {
  const v4 = v4Fixture();
  const primary = adapter({
    [SaveSystem.SNAPSHOT_KEY]: v4
  });
  const first = SaveSystem.load(primary, 2000);
  ok(first.snapshot.schemaVersion === 5 &&
     first.migrated === true,
  'SaveSystem 显式执行 v4→v5 一次迁移');
  ok(SaveSystem.save(primary, first.snapshot, 2000) === true,
    '迁移后的 v5 可以安全落盘');
  const second = SaveSystem.load(primary, 2000);
  ok(second.snapshot.schemaVersion === 5 &&
     second.migrated === false &&
     second.needsRepair === false,
  '重开规范 v5 不重复迁移');
  ok(JSON.stringify(SaveSystem.createSnapshot(
    second.snapshot,
    second.snapshot.savedAt
  )) === JSON.stringify(primary.read(SaveSystem.SNAPSHOT_KEY)),
  'v5 重开与盘中快照字节稳定');

  const contextSnapshot = SaveSystem.createSnapshot({
    current: {
      key: 'gather:explore:herb',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      stalled: false,
      context: {
        npcId: 'npc-1',
        nested: { label: '同行' },
        invalid: Infinity
      }
    }
  }, 5);
  ok(contextSnapshot.current.context.npcId === 'npc-1' &&
     contextSnapshot.current.context.invalid === 0,
  '动作描述器 context 可持久且 JSON 安全');

  const future = SaveSystem.createSnapshot({}, 1);
  future.schemaVersion = 6;
  const futureAdapter = adapter({
    [SaveSystem.SNAPSHOT_KEY]: future
  });
  const futureLoad = SaveSystem.load(futureAdapter, 2);
  ok(futureLoad.source === 'empty' &&
     futureLoad.future === true &&
     futureLoad.writeProtected === true &&
     futureLoad.futureSchemaVersion === 6,
  '未知未来 schema 仍走既有只读恢复路径');
  ok(SaveSystem.save(futureAdapter, {}, 3) === false,
    '未来 schema 存在时仍拒绝覆盖');
} else {
  ok(false, 'SaveSystem 已激活 schema v5');
}

console.log(
  '\nStage 4 状态自测：' + passed + ' 通过，' + failed + ' 失败'
);
if (failed > 0) process.exitCode = 1;
