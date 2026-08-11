'use strict';

const fs = require('node:fs');
const vm = require('node:vm');

let Relationships = null;
try {
  Relationships = require('../core/relationships.js');
} catch (error) {
  Relationships = null;
}

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

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function person(id, gender, overrides) {
  return Object.assign({
    id: id,
    identity: {
      name: id,
      gender: gender,
      appearance: {}
    },
    status: 'living',
    romancePrincipleId: 'negotiable'
  }, overrides || {});
}

function fixture() {
  return {
    schemaVersion: 5,
    player: {
      identity: { gender: 'female' },
      regionId: 'qinglan-town'
    },
    systems: {
      npcs: {
        records: {
          'npc-1': person('npc-1', 'female'),
          'npc-2': person('npc-2', 'male'),
          'npc-3': person('npc-3', 'nonbinary'),
          'npc-4': person('npc-4', 'female'),
          'npc-5': person('npc-5', 'male'),
          'npc-6': person('npc-6', 'nonbinary'),
          'npc-dead': person('npc-dead', 'female', {
            status: 'dead'
          })
        }
      },
      relationships: {
        edges: {},
        bonds: {},
        restrictions: {}
      },
      events: {
        pending: [],
        resolvedRecent: [
          {
            id: 'event-1',
            participants: ['npc-1'],
            resolvedAt: 100
          },
          {
            id: 'event-2',
            participants: ['npc-1', 'npc-2'],
            resolvedAt: 200
          }
        ],
        resolvedIdRanges: []
      }
    }
  };
}

function publicMethods(value) {
  return value ? Object.keys(value).sort() : [];
}

ok(Relationships !== null, '关系领域模块存在');
ok(Relationships !== null &&
  same(publicMethods(Relationships), [
    'applyDelta',
    'canRomance',
    'getBond',
    'getEdge',
    'queryPair',
    'setBondStage'
  ]),
'关系模块只公开六个纯领域接口');

if (Relationships) {
  ok(Object.isFrozen(Relationships), '关系模块公共边界冻结');

  const zero = Relationships.getEdge(fixture(), 'player', 'npc-1');
  ok(zero !== null &&
    same(Object.keys(zero), [
      'affection',
      'trust',
      'romanticAttachment',
      'desire',
      'dependence',
      'loyalty',
      'jealousy',
      'resentment',
      'lastChangedAt'
    ]) &&
    zero.affection === 0 &&
    zero.trust === 0 &&
    zero.romanticAttachment === 0 &&
    zero.desire === 0 &&
    zero.dependence === 0 &&
    zero.loyalty === 0 &&
    zero.jealousy === 0 &&
    zero.resentment === 0 &&
    zero.lastChangedAt === 0,
  '不存在的有向边以完整八项零值读取且不落盘');
  ok(Object.isFrozen(zero), '有向关系读模型冻结');

  const base = fixture();
  const beforeBase = JSON.stringify(base);
  const forward = Relationships.applyDelta(
    base,
    'player',
    'npc-1',
    { affection: 17, trust: 8 },
    10.5
  );
  ok(forward.ok === true &&
    forward.code === 'ok' &&
    forward.state !== base &&
    JSON.stringify(base) === beforeBase,
  '关系变化返回新状态且不修改调用方保存态');
  ok(forward.state.systems.relationships.edges[
    'player>npc-1'
  ].affection === 17 &&
    forward.state.systems.relationships.edges[
      'player>npc-1'
    ].trust === 8 &&
    forward.state.systems.relationships.edges[
      'player>npc-1'
    ].lastChangedAt === 10.5,
  '关系变化按来源到目标写入并保存有限秒时间');
  const reverseZero = Relationships.getEdge(
    forward.state,
    'npc-1',
    'player'
  );
  ok(reverseZero.affection === 0 &&
    !Object.prototype.hasOwnProperty.call(
      forward.state.systems.relationships.edges,
      'npc-1>player'
    ),
  'A>B 与 B>A 完全独立且默认读取不创建反向边');

  const reverse = Relationships.applyDelta(
    forward.state,
    'npc-1',
    'player',
    { affection: 91, resentment: 4 },
    11
  );
  ok(reverse.ok === true &&
    Relationships.getEdge(
      reverse.state,
      'player',
      'npc-1'
    ).affection === 17 &&
    Relationships.getEdge(
      reverse.state,
      'npc-1',
      'player'
    ).affection === 91,
  '双向关系数值可分别变化');

  const clamped = Relationships.applyDelta(
    reverse.state,
    'npc-1',
    'player',
    { affection: 999, resentment: -999 },
    12
  );
  ok(clamped.ok === true &&
    Relationships.getEdge(
      clamped.state,
      'npc-1',
      'player'
    ).affection === 100 &&
    Relationships.getEdge(
      clamped.state,
      'npc-1',
      'player'
    ).resentment === 0,
  '八项关系变化精确夹在整数 0 到 100');

  const sparse = Relationships.applyDelta(
    fixture(),
    'player',
    'npc-1',
    { affection: -5 },
    2
  );
  ok(sparse.ok === true &&
    sparse.code === 'unchanged' &&
    Object.keys(sparse.state.systems.relationships.edges).length === 0,
  '夹到零且没有有效变化时不创建无意义稀疏边');

  const canonicalZero = fixture();
  canonicalZero.systems.relationships.edges['player>npc-1'] = {
    affection: 0,
    trust: 0,
    romanticAttachment: 0,
    desire: 0,
    dependence: 0,
    loyalty: 0,
    jealousy: 0,
    resentment: 0,
    lastChangedAt: 0
  };
  const zeroRead = Relationships.queryPair(
    canonicalZero,
    'player',
    'npc-1'
  );
  const zeroAdvanced = Relationships.applyDelta(
    canonicalZero,
    'player',
    'npc-1',
    { trust: 2 },
    3
  );
  ok(zeroRead !== null &&
    zeroRead.firstToSecond.trust === 0 &&
    zeroAdvanced.ok === true &&
    zeroAdvanced.state.systems.relationships.edges[
      'player>npc-1'
    ].trust === 2,
  'Stage4State 规范化保留的八项全零边可查询并继续变化');

  const priorBond = Relationships.setBondStage(
    fixture(),
    'player',
    'npc-1',
    'friend',
    'event-1',
    100
  );
  ok(priorBond.ok === true &&
    priorBond.state.systems.relationships.bonds['npc-1|player'].stage ===
      'friend' &&
    priorBond.state.systems.relationships.bonds[
      'npc-1|player'
    ].changedByEventId === 'event-1' &&
    priorBond.state.systems.relationships.bonds[
      'npc-1|player'
    ].changedAt === 100,
  '关系阶段只由已解决事件写入并保留事件证据');
  const afterValue = Relationships.applyDelta(
    priorBond.state,
    'player',
    'npc-1',
    { affection: 100, trust: 100 },
    101
  );
  ok(afterValue.ok === true &&
    Relationships.getBond(
      afterValue.state,
      'npc-1',
      'player'
    ).stage === 'friend',
  '数值跨越任何阈值都不会改变关系阶段');

  const sameBond = Relationships.getBond(
    priorBond.state,
    'npc-1',
    'player'
  );
  const reversedBond = Relationships.getBond(
    priorBond.state,
    'player',
    'npc-1'
  );
  ok(same(sameBond, reversedBond) &&
    Object.isFrozen(sameBond),
  '无序关系阶段键按 ASCII 身份稳定并冻结读取');

  [
    'stranger',
    'acquaintance',
    'friend',
    'lover',
    'partner',
    'distant',
    'separated',
    'enemy'
  ].forEach(function (stage) {
    const changed = Relationships.setBondStage(
      fixture(),
      'npc-2',
      'npc-1',
      stage,
      'event-2',
      200
    );
    ok(changed.ok === true &&
      Relationships.getBond(
        changed.state,
        'npc-1',
        'npc-2'
      ).stage === stage,
    '事件可写入规范关系阶段：' + stage);
  });

  const invalidCases = [
    Relationships.applyDelta(
      fixture(),
      'player',
      'npc-1',
      { unknown: 1 },
      1
    ),
    Relationships.applyDelta(
      fixture(),
      'player',
      'npc-1',
      { affection: '1' },
      1
    ),
    Relationships.applyDelta(
      fixture(),
      'player',
      'npc-1',
      { affection: 1.5 },
      1
    ),
    Relationships.applyDelta(
      fixture(),
      'player',
      'missing',
      { affection: 1 },
      1
    ),
    Relationships.applyDelta(
      fixture(),
      'npc-1',
      'npc-1',
      { affection: 1 },
      1
    ),
    Relationships.applyDelta(
      fixture(),
      'player',
      'npc-1',
      { affection: 1 },
      '1'
    ),
    Relationships.applyDelta(
      fixture(),
      'player',
      'npc-1',
      { affection: 1 },
      Infinity
    ),
    Relationships.setBondStage(
      fixture(),
      'player',
      'npc-1',
      'best-friend',
      'event-1',
      1
    ),
    Relationships.setBondStage(
      fixture(),
      'player',
      'npc-1',
      'friend',
      'event-missing',
      1
    ),
    Relationships.setBondStage(
      fixture(),
      'player',
      'npc-2',
      'friend',
      'event-1',
      1
    ),
    Relationships.setBondStage(
      fixture(),
      'player',
      'npc-1',
      'friend',
      'event-1',
      99
    )
  ];
  ok(invalidCases.every(function (result) {
    return result &&
      result.ok === false &&
      result.state;
  }),
  '未知数值、数值强制转换、未知人物、自指、非法时间阶段或事件均原子失败');
  ok(invalidCases.every(function (result) {
    return same(result.state, fixture());
  }),
  '所有失败路径保持输入状态内容不变');
  ok(invalidCases[invalidCases.length - 1].code ===
    'unresolved_event',
  '事件证据必须覆盖人物且不能早于事件实际解决时间');

  const futureEvidence = Relationships.setBondStage(
    fixture(),
    'player',
    'npc-1',
    'friend',
    'event-1',
    101
  );
  const pendingAndResolved = fixture();
  pendingAndResolved.systems.events.pending.push({ id: 'event-1' });
  const pendingEvidence = Relationships.setBondStage(
    pendingAndResolved,
    'player',
    'npc-1',
    'friend',
    'event-1',
    100
  );
  const usedOnce = Relationships.setBondStage(
    fixture(),
    'npc-1',
    'npc-2',
    'friend',
    'event-2',
    200
  );
  const reused = Relationships.setBondStage(
    usedOnce.state,
    'npc-2',
    'npc-1',
    'lover',
    'event-2',
    200
  );
  const duplicateResolved = fixture();
  duplicateResolved.systems.events.resolvedRecent.push({
    id: 'event-1',
    participants: ['npc-1'],
    resolvedAt: 100
  });
  const duplicateEvidence = Relationships.setBondStage(
    duplicateResolved,
    'player',
    'npc-1',
    'friend',
    'event-1',
    100
  );
  ok(futureEvidence.ok === false &&
    pendingEvidence.ok === false &&
    reused.ok === false &&
    duplicateEvidence.ok === false,
  '旧时刻、未来时刻、仍在待决、重复使用或重复记录的事件证据全部拒绝');
  ok(reused.code === 'event_reused' &&
    same(reused.state, usedOnce.state) &&
    same(pendingEvidence.state, pendingAndResolved),
  '事件复用与待决冲突保持关系状态原子不变');

  let getterCalls = 0;
  const accessorValues = {};
  Object.defineProperty(accessorValues, 'affection', {
    enumerable: true,
    get: function () {
      getterCalls++;
      return 20;
    }
  });
  const accessorResult = Relationships.applyDelta(
    fixture(),
    'player',
    'npc-1',
    accessorValues,
    1
  );
  ok(accessorResult.ok === false && getterCalls === 0,
    '关系变化拒绝访问器且绝不执行 getter');

  const proxiedCounters = {
    get: 0,
    ownKeys: 0,
    prototype: 0,
    descriptor: 0
  };
  const proxied = new Proxy({ affection: 1 }, {
    get: function () {
      proxiedCounters.get++;
      throw new Error('must not read properties');
    },
    ownKeys: function (target) {
      proxiedCounters.ownKeys++;
      return Reflect.ownKeys(target);
    },
    getPrototypeOf: function (target) {
      proxiedCounters.prototype++;
      return Reflect.getPrototypeOf(target);
    },
    getOwnPropertyDescriptor: function (target, key) {
      proxiedCounters.descriptor++;
      return Reflect.getOwnPropertyDescriptor(target, key);
    }
  });
  const proxiedResult = Relationships.applyDelta(
    fixture(),
    'player',
    'npc-1',
    proxied,
    1
  );
  ok(proxiedResult.ok === true &&
    proxiedResult.state.systems.relationships.edges[
      'player>npc-1'
    ].affection === 1 &&
    proxiedCounters.get === 0 &&
    proxiedCounters.ownKeys >= 2 &&
    proxiedCounters.prototype >= 2 &&
    proxiedCounters.descriptor >= 2,
  '稳定透明代理只经双遍反射读取且不会触发属性 get');
  const revoke = Proxy.revocable({ affection: 1 }, {});
  revoke.revoke();
  let revokedSafe = false;
  try {
    revokedSafe = Relationships.applyDelta(
      fixture(),
      'player',
      'npc-1',
      revoke.proxy,
      1
    ).ok === false;
  } catch (error) {
    revokedSafe = false;
  }
  ok(revokedSafe, '关系变化对已撤销代理安全失败');

  const inheritedValues = Object.create({ affection: 1 });
  ok(Relationships.applyDelta(
    fixture(),
    'player',
    'npc-1',
    inheritedValues,
    1
  ).ok === false,
  '关系变化拒绝非普通原型与继承数值');

  let modelGetterCalls = 0;
  const accessorModel = fixture();
  Object.defineProperty(accessorModel.systems, 'relationships', {
    enumerable: true,
    get: function () {
      modelGetterCalls++;
      return { edges: {}, bonds: {}, restrictions: {} };
    }
  });
  ok(Relationships.queryPair(
    accessorModel,
    'player',
    'npc-1'
  ) === null && modelGetterCalls === 0,
  '保存态访问器失败关闭且不执行 getter');
  const throwingModelProxy = new Proxy(fixture(), {
    ownKeys: function () {
      throw new Error('hostile ownKeys');
    }
  });
  ok(Relationships.queryPair(
    throwingModelProxy,
    'player',
    'npc-1'
  ) === null,
  '抛错代理保存态在领域边界失败关闭');

  function Poisoned() {
    this.value = 1;
  }
  const nonPlainModels = [
    [new Date(0), 'Date'],
    [new Map([['x', 1]]), 'Map'],
    [new Poisoned(), '自定义原型']
  ];
  nonPlainModels.forEach(function (entry) {
    const modelWithNested = fixture();
    modelWithNested.systems.optionalPoison = entry[0];
    ok(Relationships.queryPair(
      modelWithNested,
      'player',
      'npc-1'
    ) === null,
    '任意深层 ' + entry[1] + ' 容器使整个输入失败关闭');
  });
  const cyclicModel = fixture();
  cyclicModel.systems.optionalCycle = cyclicModel;
  ok(Relationships.queryPair(
    cyclicModel,
    'player',
    'npc-1'
  ) === null,
  '任意深层循环引用使整个输入失败关闭');
  const nullPrototypeModel = fixture();
  nullPrototypeModel.systems.relationships.restrictions =
    Object.create(null);
  ok(Relationships.queryPair(
    nullPrototypeModel,
    'player',
    'npc-1'
  ) !== null,
  '正常 null-prototype 数据映射仍为有效 JSON 容器');

  const genders = ['npc-1', 'npc-2', 'npc-3'];
  ok(genders.every(function (npcId) {
    return Relationships.canRomance(fixture(), 'player', npcId) === true;
  }),
  '女性、男性与非二元人物在无关系限制时均可建立恋爱关系');

  const restrictions = [
    ['npc-1', 'blood'],
    ['npc-2', 'directInLaw'],
    ['npc-3', 'guardianship'],
    ['npc-4', 'priorGenerationPartner']
  ];
  const restricted = fixture();
  restrictions.forEach(function (entry) {
    restricted.systems.relationships.restrictions[
      entry[0] + '|player'
    ] = entry[1];
  });
  ok(restrictions.every(function (entry) {
    return Relationships.canRomance(
      restricted,
      'player',
      entry[0]
    ) === false;
  }),
  '血亲、直系姻亲、监护与前代正式伴侣四类关系一律不可恋爱');
  ok(Relationships.canRomance(
    restricted,
    'player',
    'npc-5'
  ) === true,
  '四类限制以外不因性别或关系数值拒绝恋爱');
  ok(Relationships.canRomance(
    fixture(),
    'player',
    'npc-dead'
  ) === false &&
    Relationships.canRomance(
      fixture(),
      'player',
      'missing'
    ) === false &&
    Relationships.canRomance(
      fixture(),
      'npc-1',
      'npc-1'
    ) === false,
  '非在世、未知或同一人物的恋爱资格失败关闭');

  const malformedRestriction = fixture();
  malformedRestriction.systems.relationships.restrictions[
    'npc-5|player'
  ] = 'formerFriend';
  ok(Relationships.canRomance(
    malformedRestriction,
    'player',
    'npc-6'
  ) === false,
  '未知限制类型使恋爱资格整体失败关闭');

  const querySource = reverse.state;
  const pair = Relationships.queryPair(
    querySource,
    'player',
    'npc-1'
  );
  ok(pair !== null &&
    pair.firstId === 'player' &&
    pair.secondId === 'npc-1' &&
    pair.firstToSecond.affection === 17 &&
    pair.secondToFirst.affection === 91 &&
    pair.bond.stage === 'stranger' &&
    pair.romanceEligible === true,
  '人物对查询一次返回双向八项数值、阶段和恋爱资格');
  ok(Object.isFrozen(pair) &&
    Object.isFrozen(pair.firstToSecond) &&
    Object.isFrozen(pair.secondToFirst) &&
    Object.isFrozen(pair.bond),
  '人物对查询结果深度冻结');
  querySource.systems.relationships.edges[
    'player>npc-1'
  ].affection = 99;
  ok(pair.firstToSecond.affection === 17,
    '人物对查询与调用方状态深度分离');

  const corrupt = fixture();
  corrupt.systems.relationships.edges['player>npc-1'] = {
    affection: 1,
    trust: 0,
    romanticAttachment: 0,
    desire: 0,
    dependence: 0,
    loyalty: 0,
    jealousy: 0,
    resentment: 0,
    lastChangedAt: '1'
  };
  ok(Relationships.getEdge(
    corrupt,
    'player',
    'npc-1'
  ) === null &&
    Relationships.queryPair(
      corrupt,
      'player',
      'npc-1'
    ) === null,
  '非规范保存关系数据不会被字符串数值修复或泄露');

  const large = fixture();
  for (let index = 0; index < 5000; index++) {
    const sourceId = 'npc-' + (index % 6 + 1);
    const targetId = 'npc-' + ((index + 1) % 6 + 1);
    const key = sourceId + '>' + targetId + ':' + index;
    // Invalid synthetic keys ensure the bounded validator rejects rather
    // than allocating a dense person matrix.
    large.systems.relationships.edges[key] = {};
  }
  let bounded = false;
  try {
    bounded = Relationships.queryPair(
      large,
      'player',
      'npc-1'
    ) === null;
  } catch (error) {
    bounded = false;
  }
  ok(bounded, '大型稀疏边表以有界遍历失败关闭且不构造人物全矩阵');

  const sparseWorld = fixture();
  sparseWorld.systems.npcs.records = {};
  for (let index = 1; index <= 80; index++) {
    const id = 'npc-' + index;
    sparseWorld.systems.npcs.records[id] = person(
      id,
      index % 3 === 0
        ? 'nonbinary'
        : index % 2 === 0 ? 'male' : 'female'
    );
  }
  let sparseCount = 0;
  for (let sourceIndex = 1;
      sourceIndex <= 80 && sparseCount < 5000;
      sourceIndex++) {
    for (let targetIndex = 1;
        targetIndex <= 80 && sparseCount < 5000;
        targetIndex++) {
      if (sourceIndex === targetIndex) continue;
      const key = 'npc-' + sourceIndex + '>npc-' + targetIndex;
      sparseWorld.systems.relationships.edges[key] = {
        affection: sparseCount % 100 + 1,
        trust: 0,
        romanticAttachment: 0,
        desire: 0,
        dependence: 0,
        loyalty: 0,
        jealousy: 0,
        resentment: 0,
        lastChangedAt: sparseCount
      };
      sparseCount++;
    }
  }
  const sparseQuery = Relationships.queryPair(
    sparseWorld,
    'npc-1',
    'npc-2'
  );
  ok(sparseCount === 5000 &&
    sparseQuery !== null &&
    sparseQuery.firstToSecond.affection === 1 &&
    Object.keys(
      sparseWorld.systems.relationships.edges
    ).length === 5000,
  '五千条有效稀疏有向边以单表处理且查询不生成完整人物矩阵');

  ok(typeof Relationships.setRomancePrinciple === 'undefined' &&
    !publicMethods(Relationships).some(function (name) {
      return /romancePrinciple/i.test(name);
    }),
  '感情原则没有通用公共 setter，只能由后续事件效果接入');

  const browserSandbox = {
    console: console,
    Object: Object,
    Array: Array,
    Number: Number,
    String: String,
    Boolean: Boolean,
    Math: Math,
    Set: Set,
    Stage4State: require('../core/stage4-state.js')
  };
  browserSandbox.globalThis = browserSandbox;
  vm.createContext(browserSandbox);
  vm.runInContext(
    fs.readFileSync('core/relationships.js', 'utf8'),
    browserSandbox,
    { filename: 'core/relationships.js' }
  );
  ok(browserSandbox.Relationships &&
    Object.isFrozen(browserSandbox.Relationships) &&
    same(
      publicMethods(browserSandbox.Relationships),
      publicMethods(Relationships)
    ),
  '关系模块 UMD 浏览器边界与 CommonJS 一致冻结');

  const transparentModelCounters = {
    get: 0,
    ownKeys: 0,
    prototype: 0,
    descriptor: 0
  };
  const transparentModel = new Proxy(fixture(), {
    get: function () {
      transparentModelCounters.get++;
      throw new Error('must not get model property');
    },
    ownKeys: function (target) {
      transparentModelCounters.ownKeys++;
      return Reflect.ownKeys(target);
    },
    getPrototypeOf: function (target) {
      transparentModelCounters.prototype++;
      return Reflect.getPrototypeOf(target);
    },
    getOwnPropertyDescriptor: function (target, key) {
      transparentModelCounters.descriptor++;
      return Reflect.getOwnPropertyDescriptor(target, key);
    }
  });
  const commonTransparent = Relationships.queryPair(
    transparentModel,
    'player',
    'npc-1'
  );
  const browserTransparent =
    browserSandbox.Relationships.queryPair(
      transparentModel,
      'player',
      'npc-1'
    );
  ok(commonTransparent !== null &&
    browserTransparent !== null &&
    same(commonTransparent, browserTransparent) &&
    transparentModelCounters.get === 0 &&
    transparentModelCounters.ownKeys >= 4 &&
    transparentModelCounters.prototype >= 4 &&
    transparentModelCounters.descriptor >= 4,
  '稳定透明保存态代理在 UMD 与 CommonJS 中结果一致且属性 get 为零');

  function statefulProxy() {
    let calls = 0;
    return new Proxy(fixture(), {
      ownKeys: function (target) {
        calls++;
        return calls === 1 ? Reflect.ownKeys(target) : [];
      }
    });
  }
  const duplicateKeysProxy = new Proxy(fixture(), {
    ownKeys: function () {
      return ['player', 'player'];
    }
  });
  const revokedModel = Proxy.revocable(fixture(), {});
  revokedModel.revoke();
  ok(Relationships.queryPair(
    statefulProxy(),
    'player',
    'npc-1'
  ) === null &&
    browserSandbox.Relationships.queryPair(
      statefulProxy(),
      'player',
      'npc-1'
    ) === null &&
    Relationships.queryPair(
      duplicateKeysProxy,
      'player',
      'npc-1'
    ) === null &&
    Relationships.queryPair(
      revokedModel.proxy,
      'player',
      'npc-1'
    ) === null,
  '变化、重复键与撤销代理在 UMD/CommonJS 中均失败关闭');
}

const indexText = fs.readFileSync('index.html', 'utf8');
ok(indexText.includes(
  '<script src="core/relationships.js"></script>'
), '浏览器入口加载关系领域模块');
ok(indexText.indexOf('core/stage4-state.js') <
  indexText.indexOf('core/relationships.js'),
'关系模块在 Stage4State 安全快照边界之后加载');

const source = fs.existsSync('core/relationships.js')
  ? fs.readFileSync('core/relationships.js', 'utf8')
  : '';
ok(!/\bMath\.random\s*\(|\bDate\.now\s*\(/.test(source),
  '关系领域模块不读取系统随机数或墙钟');
ok(!/node:util|types\.isProxy/.test(source),
  '关系领域模块没有 Node 专属代理检测分支');
ok(!/affection\s*[><=].*(friend|lover|partner)|trust\s*[><=].*(friend|lover|partner)/i
  .test(source),
'关系阶段没有数值阈值驱动逻辑');

console.log('\nStage 4 关系自测：' + passed + ' 通过，' +
  failed + ' 失败');
if (failed) process.exitCode = 1;
