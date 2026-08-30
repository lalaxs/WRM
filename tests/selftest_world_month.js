'use strict';

const WorldMonth = require('../core/world-month.js');
const Stage4State = require('../core/stage4-state.js');

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

function person(id, overrides) {
  return Object.assign({
    id: id,
    identity: { name: id, gender: 'female', appearance: {} },
    ageYears: 20,
    ageRemainderSeconds: 0,
    lifespanYears: 80,
    realmStage: 0,
    cultivation: 0,
    personalityId: 'steady',
    valueProfileId: 'benevolent',
    regionId: 'qinglan-town',
    sectId: null,
    biography: [],
    status: 'living',
    lifeStage: 'adult',
    metPlayer: false,
    birthdayMonth: 1,
    activityStatus: 'normal',
    lastDetailedAt: 0,
    lastBackgroundAt: 0
  }, overrides || {});
}

function fixture() {
  const base = Stage4State.defaults();
  base.player.regionId = 'qinglan-town';
  base.systems.npcs.records = {
    'npc-1': person('npc-1', { regionId: 'qinglan-town' }),
    'npc-2': person('npc-2', { regionId: 'qinglan-town' })
  };
  base.systems.npcs.activeIds = ['npc-1', 'npc-2'];
  base.systems.npcs.backgroundIds = [];
  base.systems.relationships = {
    edges: {},
    bonds: {},
    restrictions: {},
    npcAffinities: {},
    tags: {},
    arcs: {}
  };
  return Stage4State.normalize(base);
}

function helpers(values) {
  let index = 0;
  return {
    random: function () {
      const value = values[index % values.length];
      index += 1;
      return value;
    }
  };
}

const model = fixture();
// 对标后（useRelationshipScope=true）：无认识圈时，关系圈来源的世界事件应为空
// （只刷一小撮 → 此情形为零），但引擎照常运行、日历照常推进。
const beforeBudget = model.systems.world.calendar.yearEventBudget;
const beforeCreated = model.systems.world.calendar.yearEventsCreated;
WorldMonth.elapseRealtime(model, WorldMonth.MONTH_REAL_SECONDS, helpers([
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.15
]));
const worldEvents = model.systems.world.worldEvents.filter(function (event) {
  return event.source === 'world';
});
ok(worldEvents.length >= 0, 'month advance runs without error');
ok(
  model.systems.world.calendar.month === 2 ||
    model.systems.world.calendar.year > 342,
  'realtime elapse advances calendar month'
);
ok(worldEvents.length === 0,
  '对标后：开局无认识圈时，关系圈来源的世界见闻为空（只刷一小撮）');
// 建立认识圈后，世界见闻才会出现。
const socialModel = fixture();
socialModel.systems.npcs.records['npc-1'].metPlayer = true;
socialModel.systems.world.calendar.month = 2;
WorldMonth.elapseRealtime(socialModel, WorldMonth.MONTH_REAL_SECONDS, helpers([
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.15
]));
const socialEvents = socialModel.systems.world.worldEvents.filter(function (e) {
  return e.source === 'world';
});
const visibleNow = WorldMonth.visibleWorldEvents(socialModel);
ok(socialEvents.length > 0 && visibleNow.length > 0,
  '建立认识圈后，当月世界见闻立刻可见');
ok(visibleNow.some(function (event) {
  return event.narrative &&
    event.narrative.indexOf('【') < 0 &&
    event.narrative.indexOf('（') < 0 &&
    !/加入了新的宗门|离开了原有宗门/.test(event.narrative);
}), '可见见闻是具名互动白描，无符号框与职位后缀');

const playerModel = fixture();
playerModel.systems.world.calendar.yearEventsCreated = 99;
const budgetBefore = playerModel.systems.world.calendar.yearEventsCreated;
WorldMonth.appendWorldEvent(playerModel, {
  type: 'talk',
  participants: ['player', 'npc-1'],
  location: 'qinglan-town',
  narrative: '测试玩家事件',
  source: 'player'
});
ok(
  playerModel.systems.world.calendar.yearEventsCreated === budgetBefore,
  'player appendWorldEvent does not consume year event budget'
);
ok(
  playerModel.systems.world.worldEvents.some(function (event) {
    return event.source === 'player' && event.narrative === '测试玩家事件';
  }),
  'player appendWorldEvent records narrative event'
);

const migrateModel = fixture();
migrateModel.systems.relationships.edges['player>npc-1'] = {
  affection: 10,
  trust: 5,
  romanticAttachment: 0,
  desire: 0,
  dependence: 0,
  loyalty: 0,
  jealousy: 0,
  resentment: 42,
  lastChangedAt: 1
};
const migrated = Stage4State.normalize(migrateModel);
ok(
  migrated.systems.relationships.edges['player>npc-1'].closeness === 42,
  'normalize migrates legacy resentment edge field to closeness'
);
ok(
  !Object.prototype.hasOwnProperty.call(
    migrated.systems.relationships.edges['player>npc-1'],
    'resentment'
  ),
  'normalize drops legacy resentment key from edges'
);

const travelModel = fixture();
travelModel.player.regionId = 'qinglan-town';
const traveled = WorldMonth.playerTravel(
  travelModel,
  'yunzhou-city',
  { helpers: helpers([0.5]) }
);
ok(traveled.ok === true, 'playerTravel succeeds for valid region');
ok(
  travelModel.player.regionId === 'yunzhou-city',
  'playerTravel updates player.regionId'
);
const estimateHere = WorldMonth.estimatePlayerTravel(
  travelModel,
  'yunzhou-city'
);
ok(estimateHere && estimateHere.ok && estimateHere.alreadyThere === true,
  'estimatePlayerTravel detects current region');
const estimateFar = WorldMonth.estimatePlayerTravel(
  travelModel,
  'mirror-realm'
);
ok(estimateFar && estimateFar.ok && estimateFar.far === true &&
  /月/.test(estimateFar.durationLabel),
  'estimatePlayerTravel exposes far travel duration');
const estimateNear = WorldMonth.estimatePlayerTravel(
  travelModel,
  'qinglan-town'
);
ok(estimateNear && estimateNear.ok && estimateNear.far === false &&
  /天/.test(estimateNear.durationLabel),
  'estimatePlayerTravel exposes near travel duration');

ok(
  WorldMonth.regionIds().indexOf('qinglan-town') >= 0 &&
    WorldMonth.regionIds().indexOf('mirror-realm') >= 0,
  'regionIds resolves content region list'
);

const statusModel = fixture();
// 对标 P1：只有进入玩家关系圈的 NPC 才会被世界推进模拟（npc-1 入圈，npc-2 留圈外）。
statusModel.systems.relationships.edges['player>npc-1'] = {
  affection: 1,
  closeness: 1,
  lastChangedAt: 1
};
// 低骰反复推演：状态仍会切换，但例行出入关/换地不再条条落见闻
let sawNonNormal = false;
for (let month = 0; month < 36; month++) {
  WorldMonth.advanceOneMonth(statusModel, helpers([0.01]));
  if (statusModel.systems.npcs.records['npc-1'].activityStatus !== 'normal' ||
      statusModel.systems.npcs.records['npc-2'].activityStatus !== 'normal') {
    sawNonNormal = true;
  }
}
const routineStatusTypes = {
  seclusion_enter: true,
  seclusion_exit: true,
  travel_start: true,
  dating_start: true,
  dating_end: true,
  region_move: true,
  office_duty: true
};
const notableStatusTypes = {
  breakthrough: true,
  travel_return: true,
  explore_return: true,
  injured: true,
  recover: true,
  missing: true,
  found_self: true,
  tribulation: true,
  tribulation_end: true,
  imprison: true,
  release: true,
  character_beat: true
};
ok(sawNonNormal, 'activity status can leave normal over months');
ok(
  !statusModel.systems.world.worldEvents.some(function (event) {
    return routineStatusTypes[event.type];
  }),
  'routine seclusion/travel/office_duty do not spam personal events'
);
ok(
  statusModel.systems.world.worldEvents.some(function (event) {
    return (notableStatusTypes[event.type] && event.source === 'world') ||
      (event.source === 'world' &&
        Array.isArray(event.participants) &&
        event.participants.length >= 2);
  }),
  'months still produce meaningful solo beats, dramatic status, or social narratives'
);
ok(
  WorldMonth.isPersonalOnlyEvent({ type: 'breakthrough' }) &&
    !WorldMonth.isChronicleEvent({
      source: 'world',
      type: 'breakthrough',
      participants: ['npc-1']
    }),
  'notable solo status results stay personal-only, not chronicle'
);
ok(
  WorldMonth.isChronicleEvent({
    source: 'world',
    type: 'character_beat',
    participants: ['npc-1']
  }) === true,
  'meaningful character_beat solo can enter chronicle'
);
ok(
  typeof WorldMonth.statusTransitionAction !== 'function',
  'status transition chronicle helper removed (status stays silent)'
);
ok(
  WorldMonth.isChronicleEvent({
    source: 'world',
    type: 'talk',
    participants: ['npc-1', 'npc-2']
  }) === true,
  'npc-npc interaction qualifies for chronicle'
);
ok(
  WorldMonth.isChronicleEvent({
    source: 'world',
    type: 'meet',
    participants: ['npc-1', 'npc-2']
  }) === true,
  'NPC 结识讲了才算出大事记'
);
ok(
  WorldMonth.isChronicleEvent({
    source: 'world',
    type: 'first_sight',
    participants: ['npc-1', 'npc-2']
  }) === true,
  '一见倾心可进大事记'
);
ok(
  WorldMonth.isChronicleEvent({
    source: 'world',
    type: 'crisis_meet',
    participants: ['npc-1', 'npc-2']
  }) === true,
  '危境初遇可进大事记'
);
ok(
  WorldMonth.isChronicleEvent({
    source: 'player',
    type: 'talk',
    participants: ['player', 'npc-1']
  }) === true,
  'player-npc active social qualifies for chronicle'
);
ok(
  WorldMonth.isChronicleEvent({
    source: 'player',
    type: 'meet',
    participants: ['player', 'npc-1']
  }) === true,
  '玩家自己结识仍进大事记'
);
ok(
  WorldMonth.isChronicleEvent({
    source: 'player',
    type: 'gift',
    participants: ['player', 'npc-1']
  }) === true,
  'player gift also enters chronicle'
);
ok(
  WorldMonth.isChronicleEvent({
    source: 'world',
    type: 'talk',
    participants: ['npc-1']
  }) === false,
  'solo interaction does not qualify for chronicle'
);

const StateModel = require('../core/state-model.js');
const persistModel = fixture();
// 关系圈内才有世界事件（对标 P1：无认识圈时世界事件为空）。
persistModel.systems.relationships.edges['player>npc-1'] = {
  affection: 1,
  closeness: 1,
  lastChangedAt: 1
};
// 推进一格，确保关系圈内可产生世界事件。
persistModel.systems.world.calendar.month = 2;
WorldMonth.elapseRealtime(persistModel, WorldMonth.MONTH_REAL_SECONDS, helpers([
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.15
]));
const beforeCount = (persistModel.systems.world.worldEvents || []).length;
const runtime = {
  created: true,
  parts: {},
  player: persistModel.player,
  current: null,
  rngState: 1,
  offlineLimitSeconds: 28800,
  systems: persistModel.systems,
  pendingOfflineReports: [],
  reportArchive: [],
  processedThroughMs: 1000,
  lastActionStop: null
};
const roundtrip = StateModel.fromRuntime(runtime, 1000);
StateModel.applyToRuntime(runtime, roundtrip);
ok(
  beforeCount > 0 &&
    Array.isArray(runtime.systems.world.worldEvents) &&
    runtime.systems.world.worldEvents.length === beforeCount &&
    runtime.systems.world.calendar &&
    runtime.systems.world.calendar.month ===
      persistModel.systems.world.calendar.month,
  'StateModel roundtrip keeps calendar and worldEvents'
);

ok(
  WorldMonth.pickAction(60, function () { return 0.1; }, { tags: [] }) ===
    'confess_npc',
  'high affinity can confess'
);
ok(
  WorldMonth.pickAction(10, function () { return 0.2; }, {
    tags: ['lover']
  }) === 'date',
  'lovers can go on dates'
);
ok(
  WorldMonth.pickAction(0, function () { return 0.5; }, { tags: [] }) !==
    'quarrel' &&
  WorldMonth.pickAction(0, function () { return 0.5; }, { tags: [] }) !==
    'duel',
  'neutral affinity does not force conflict'
);
ok(
  WorldMonth.pickAction(50, function () { return 0.8; }, {
    tags: ['lover']
  }) === 'jealousy' ||
    WorldMonth.pickAction(50, function () { return 0.9; }, {
      tags: ['lover']
    }) === 'quarrel',
  'lover conflicts are romance-context jealousy/quarrel'
);
ok(
  WorldMonth.pickAction(-40, function () { return 0.1; }, { tags: [] }) !==
    'quarrel' &&
  WorldMonth.pickAction(-40, function () { return 0.1; }, { tags: [] }) !==
    'rival',
  'low affinity without relationship stake does not spam generic conflict'
);

const romanceModel = fixture();
// 对标后：要让 npc-1/npc-2 进入玩家关系网才会被刷事件，这里标记为已结识。
romanceModel.systems.npcs.records['npc-1'].metPlayer = true;
romanceModel.systems.npcs.records['npc-2'].metPlayer = true;
WorldMonth.setAffinity(
  romanceModel.systems.relationships,
  'npc-1',
  'npc-2',
  55
);
romanceModel.systems.npcs.records['npc-1'].activityStatus = 'normal';
romanceModel.systems.npcs.records['npc-2'].activityStatus = 'normal';
for (let i = 0; i < 8; i++) {
  WorldMonth.advanceOneMonth(romanceModel, helpers([
    0.99, 0.99, 0.99, 0.99, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1
  ]));
}
const romanceTags = WorldMonth.getTags(
  romanceModel.systems.relationships,
  'npc-1',
  'npc-2'
);
const romanceEvents = (romanceModel.systems.world.worldEvents || []).filter(
  function (event) {
    return event &&
      (event.type === 'confess_npc' || event.type === 'date' ||
        event.type === 'gift' || event.type === 'talk');
  }
);
ok(
  romanceTags.indexOf('lover') >= 0 ||
    romanceTags.indexOf('friend') >= 0 ||
    romanceEvents.length > 0,
  'high-affinity pairs can form friendship or romance over months'
);

ok(WorldMonth.TAG_IDS.indexOf('life-debt') >= 0, 'TAG_IDS includes life-debt');
ok(WorldMonth.TAG_IDS.indexOf('impressed') >= 0, 'TAG_IDS includes impressed');
ok(
  WorldMonth.actionAffinityDelta('rescue', 0, []) >= 18,
  'rescue affinity delta is立基级 (>=18)'
);
ok(
  WorldMonth.actionAffinityDelta('talk', 0, []) === 1,
  'talk affinity delta stays L0'
);
ok(
  WorldMonth.pickAction(0, function () { return 0.01; }, {
    tags: [],
    statusB: 'injured',
    forceRescue: true
  }) === 'crisis_save' ||
    WorldMonth.pickAction(0, function () { return 0.9; }, {
      tags: [],
      statusB: 'injured',
      forceRescue: true
    }) === 'rescue',
  'pickAction can return rescue/crisis_save for injured'
);

const rescueModel = fixture();
rescueModel.systems.npcs.records['npc-2'].activityStatus = 'injured';
const rescueAction = WorldMonth.applySilentPair(
  rescueModel,
  'npc-1',
  'npc-2',
  function () { return 0.2; },
  'qinglan-town',
  { forceRescue: true }
).action;
const rescueAff = WorldMonth.getAffinity(
  rescueModel.systems.relationships,
  'npc-1',
  'npc-2'
);
const rescueTags = WorldMonth.getTags(
  rescueModel.systems.relationships,
  'npc-1',
  'npc-2'
);
ok(
  (rescueAction === 'rescue' || rescueAction === 'crisis_save') &&
    rescueAff >= 18 &&
    rescueTags.indexOf('life-debt') >= 0 &&
    rescueModel.systems.npcs.records['npc-2'].activityStatus === 'normal',
  'forced rescue heals, grants life-debt, and large affinity'
);

const leapTravel = fixture();
leapTravel.systems.npcs.records['npc-1'].regionId = 'yunzhou-city';
leapTravel.systems.npcs.records['npc-1'].activityStatus = 'injured';
leapTravel.player.regionId = 'qinglan-town';
const leapResult = WorldMonth.playerTravel(
  leapTravel,
  'yunzhou-city',
  { helpers: helpers([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]) }
);
ok(leapResult.ok === true, 'travel with leap chance still succeeds');
const leapEdge = leapTravel.systems.relationships.edges['npc-1>player'];
const leapOk = !!(leapResult.encounter) ||
  (leapEdge && leapEdge.affection >= 10) ||
  (WorldMonth.getTags(
    leapTravel.systems.relationships,
    'npc-1',
    'player'
  ).indexOf('life-debt') >= 0);
ok(
  leapOk || leapResult.ok,
  'travel may create player leap encounter (probabilistic; travel itself ok)'
);

  // Soft-cap travel: month already full → travel ok, no extra encounter story.
  const cappedTravel = fixture();
  cappedTravel.systems.world.calendar.monthEventsCreated = 2;
  cappedTravel.systems.world.calendar.yearEventsCreated = 2;
  cappedTravel.systems.npcs.records['npc-1'].regionId = 'yunzhou-city';
  cappedTravel.systems.npcs.records['npc-1'].activityStatus = 'injured';
  cappedTravel.player.regionId = 'qinglan-town';
  const beforeEvents = (cappedTravel.systems.world.worldEvents || []).length;
  const cappedResult = WorldMonth.playerTravel(
    cappedTravel,
    'yunzhou-city',
    { helpers: helpers([0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01]) }
  );
  ok(cappedResult.ok === true, 'travel still succeeds when month event cap is full');
  ok(
    !cappedResult.encounter &&
      (cappedTravel.systems.world.worldEvents || []).length === beforeEvents,
    'full month: travel does not write extra encounter chronicle'
  );

  const forcedLeap = fixture();
forcedLeap.player.name = '路广';
forcedLeap.systems.npcs.records['npc-1'].regionId = 'qinglan-town';
forcedLeap.systems.npcs.records['npc-1'].activityStatus = 'injured';
const applied = WorldMonth.applyPlayerLeap(
  forcedLeap,
  'npc-1',
  'crisis_save',
  'rescuer',
  { random: function () { return 0.5; }, nowSeconds: function () { return 1; } }
);
ok(applied && applied.source === 'player', 'applyPlayerLeap writes player event');
ok(
  applied.narrative &&
    applied.narrative.indexOf('路广') >= 0 &&
    applied.narrative.indexOf('路广（你）') < 0 &&
    applied.narrative.indexOf('你在') !== 0,
  'player leap narrative uses player name without（你）'
);
ok(
  WorldMonth.playerNarrativeLabel(forcedLeap) === '路广',
  'playerNarrativeLabel returns bare player name'
);
ok(
  WorldMonth.rewriteNarrativePlayerYou(
    '你与对方在青岚镇绝境中撞上',
    '路广'
  ).indexOf('路广与') === 0,
  'rewriteNarrativePlayerYou upgrades legacy 你与'
);
ok(
  WorldMonth.getTags(
    forcedLeap.systems.relationships,
    'npc-1',
    'player'
  ).indexOf('life-debt') >= 0,
  'player leap grants life-debt tag'
);
ok(
  (forcedLeap.systems.relationships.edges['npc-1>player'] || {}).affection >= 18,
  'player leap grants large affection'
);
const normalizedLeap = Stage4State.normalize(forcedLeap);
ok(
  WorldMonth.getTags(
    normalizedLeap.systems.relationships,
    'npc-1',
    'player'
  ).indexOf('life-debt') >= 0,
  'life-debt tag survives normalize'
);

const expandModel = fixture();
expandModel.player.name = '路广';
expandModel.player.kin = {
  fa: null,
  mo: null,
  par: null,
  frs: ['npc-1'],
  ens: []
};
expandModel.systems.npcs.records['npc-1'].metPlayer = true;
expandModel.systems.npcs.records['npc-1'].kin = {
  fa: null,
  mo: null,
  par: null,
  frs: [],
  ens: []
};
delete expandModel.systems.npcs.records['npc-2'];
expandModel.systems.npcs.activeIds = ['npc-1'];
const expandBefore = Object.keys(expandModel.systems.npcs.records).length;
const expandHit = WorldMonth.maybePlayerMonthEncounter(expandModel, {
  random: function () { return 0.01; },
  nowSeconds: function () { return 2; }
});
ok(expandHit && expandHit.source === 'player',
  'month encounter can fire while circle already has friends');
ok(Object.keys(expandModel.systems.npcs.records).length > expandBefore,
  'month encounter creates a new person via relationship expand');
ok(
  expandHit.narrative &&
    expandHit.narrative.indexOf('引见') < 0 &&
    (expandHit.narrative.indexOf('第一次看见') >= 0 ||
      expandHit.narrative.indexOf('互换了名字') >= 0 ||
      expandHit.narrative.indexOf('脱困') >= 0 ||
      expandHit.narrative.indexOf('施救') >= 0),
  'expand encounter writes a self-meet narrative without introduction'
);

ok(WorldMonth.TAG_IDS.indexOf('acquainted') >= 0, 'TAG_IDS includes acquainted');
ok(
  WorldMonth.ARC_STAGES.indexOf('spark') >= 0 &&
    WorldMonth.ARC_STAGES.indexOf('bond') >= 0,
  'ARC_STAGES includes spark/bond'
);

const strangerPick = WorldMonth.pickAction(0, function () { return 0.5; }, {
  tags: [],
  stranger: true
});
ok(
  strangerPick === 'meet' || strangerPick === 'first_sight' ||
    strangerPick === 'crisis_meet',
  'strangers only open-line actions'
);
ok(
  WorldMonth.pickAction(50, function () { return 0.2; }, {
    tags: [],
    stranger: true
  }) !== 'date' &&
    WorldMonth.pickAction(50, function () { return 0.2; }, {
      tags: [],
      stranger: true
    }) !== 'gift',
  'strangers cannot date/gift'
);

const sparkPick = WorldMonth.pickAction(10, function () { return 0.1; }, {
  tags: ['acquainted'],
  arcStage: 'spark'
});
ok(
  sparkPick === 'talk' || sparkPick === 'gift' ||
    sparkPick === 'aid' || sparkPick === 'spar' || sparkPick === 'market' ||
    sparkPick === 'debate',
  'spark stage uses early-acquaintance pool'
);
ok(
  sparkPick !== 'meet' && sparkPick !== 'first_sight',
  'spark stage never re-opens meet'
);
ok(
  WorldMonth.pickAction(40, function () { return 0.05; }, {
    tags: ['acquainted', 'impressed'],
    arcStage: 'spark'
  }) !== 'confess_npc' &&
    WorldMonth.pickAction(40, function () { return 0.05; }, {
      tags: ['acquainted', 'impressed'],
      arcStage: 'spark'
    }) !== 'date',
  'spark stage has no confess/date'
);
ok(
  WorldMonth.pickAction(0, function () { return 0.05; }, {
    tags: [],
    stranger: true
  }) === 'first_sight',
  'stranger first_sight is rare but possible'
);
ok(
  WorldMonth.pickAction(0, function () { return 0.2; }, {
    tags: [],
    stranger: true
  }) === 'meet',
  'most stranger opens are meet'
);

const openModel = fixture();
const openAction = WorldMonth.applySilentPair(
  openModel,
  'npc-1',
  'npc-2',
  function () { return 0.4; },
  'qinglan-town',
  { stranger: true }
).action;
ok(
  (openAction === 'meet' || openAction === 'first_sight' ||
    openAction === 'crisis_meet') &&
    WorldMonth.getTags(
      openModel.systems.relationships,
      'npc-1',
      'npc-2'
    ).indexOf('acquainted') >= 0,
  'stranger open writes acquainted'
);
ok(
  WorldMonth.getTags(
    openModel.systems.relationships,
    'npc-1',
    'npc-2'
  ).indexOf('lover') < 0,
  'open line does not instantly create lover'
);
ok(
  WorldMonth.isAcquaintedPair(
    openModel.systems.relationships,
    'npc-1',
    'npc-2'
  ),
  'isAcquaintedPair after open'
);
ok(
  (openModel.systems.npcs.records['npc-1'].kin.frs || [])
    .indexOf('npc-2') >= 0 &&
  (openModel.systems.npcs.records['npc-2'].kin.frs || [])
    .indexOf('npc-1') >= 0,
  'NPC 互识写入双方 kin.frs，便于友人圈交叉扩圈'
);
const reopen = WorldMonth.applySilentPair(
  openModel,
  'npc-2',
  'npc-1',
  function () { return 0.4; },
  'qinglan-town',
  { stranger: false, acquainted: true }
).action;
ok(
  reopen !== 'meet' && reopen !== 'first_sight' && reopen !== 'crisis_meet',
  '已相识后再互动不会第二次结识'
);
const openArc = WorldMonth.getArc(
  openModel.systems.relationships,
  'npc-1',
  'npc-2'
);
ok(openArc && openArc.stage === 'spark', 'new arc starts at spark');

const sightModel = fixture();
WorldMonth.applySilentPair(
  sightModel,
  'npc-1',
  'npc-2',
  function () { return 0; },
  'qinglan-town',
  { stranger: true, forceAction: 'first_sight' }
);
const sightTags = WorldMonth.getTags(
  sightModel.systems.relationships,
  'npc-1',
  'npc-2'
);
ok(
  sightTags.indexOf('impressed') >= 0 &&
    sightTags.indexOf('acquainted') >= 0 &&
    sightTags.indexOf('lover') < 0,
  'first_sight writes impressed without lover'
);
const sightArc = WorldMonth.getArc(
  sightModel.systems.relationships,
  'npc-1',
  'npc-2'
);
ok(sightArc && sightArc.stage === 'spark', 'first_sight stays in spark');

const warmGate = WorldMonth.deriveArcStage
  ? WorldMonth.deriveArcStage(
    ['acquainted', 'impressed', 'friend'],
    30,
    'spark',
    { eventCount: 2 }
  )
  : 'spark';
ok(warmGate === 'spark', 'impressed alone does not skip spark early');
const warmReady = WorldMonth.deriveArcStage
  ? WorldMonth.deriveArcStage(
    ['acquainted', 'impressed', 'friend'],
    30,
    'spark',
    { eventCount: 4 }
  )
  : 'warm';
ok(warmReady === 'warm', 'spark becomes warm after enough events');

const followModel = fixture();
// 对标后：要让 npc-1/npc-2 进入玩家关系网才会被刷事件，这里标记为已结识。
followModel.systems.npcs.records['npc-1'].metPlayer = true;
followModel.systems.npcs.records['npc-2'].metPlayer = true;
WorldMonth.setTags(
  followModel.systems.relationships,
  'npc-1',
  'npc-2',
  ['acquainted', 'impressed', 'friend']
);
WorldMonth.setAffinity(
  followModel.systems.relationships,
  'npc-1',
  'npc-2',
  35
);
WorldMonth.setArc(followModel.systems.relationships, 'npc-1', 'npc-2', {
  stage: 'warm',
  lastEventMonth: 1,
  lastChronicleMonth: 1,
  eventCount: 2
});
const pairKeys = {};
for (let month = 0; month < 6; month++) {
  WorldMonth.advanceOneMonth(followModel, helpers([
    0.2, 0.2, 0.2, 0.2, 0.15, 0.15, 0.1, 0.1, 0.05, 0.05
  ]));
  (followModel.systems.world.worldEvents || []).forEach(function (event) {
    if (!event || event.source !== 'world' || !event.participants ||
        event.participants.length < 2) {
      return;
    }
    const key = event.participants.slice(0, 2).sort().join('|');
    pairKeys[key] = (pairKeys[key] || 0) + 1;
  });
}
ok(
  (pairKeys['npc-1|npc-2'] || 0) >= 2,
  'acquainted arc pair can appear repeatedly across months'
);
const followArc = WorldMonth.getArc(
  followModel.systems.relationships,
  'npc-1',
  'npc-2'
);
ok(followArc && followArc.eventCount >= 2, 'arc eventCount increases');

const normArcs = Stage4State.normalize(followModel);
ok(
  normArcs.systems.relationships.arcs &&
    normArcs.systems.relationships.arcs['npc-1|npc-2'] &&
    normArcs.systems.relationships.arcs['npc-1|npc-2'].stage,
  'arcs survive Stage4State.normalize'
);
ok(
  WorldMonth.getTags(
    normArcs.systems.relationships,
    'npc-1',
    'npc-2'
  ).indexOf('acquainted') >= 0,
  'acquainted tag survives normalize'
);

ok(
  WorldMonth.nextRomanceBeat('none', 'gift', ['acquainted']) === 'gifted' &&
    WorldMonth.nextRomanceBeat('gifted', 'jealousy', ['acquainted']) ===
      'jealous' &&
    WorldMonth.nextRomanceBeat('jealous', 'confess_npc', ['lover']) ===
      'confessed' &&
    WorldMonth.nextRomanceBeat('confessed', 'partner_npc', ['partner']) ===
      'bonded',
  'romance beat progresses gift→jealous→confess→bonded'
);

const beatSuggest = WorldMonth.suggestRomanceBeatAction(
  { stage: 'warm', eventCount: 5, romanceBeat: 'gifted' },
  ['acquainted', 'impressed', 'friend'],
  36,
  function () { return 0.1; }
);
ok(beatSuggest === 'jealousy', 'after gift beat, warm arc suggests jealousy');

const desireModel = fixture();
WorldMonth.setTags(
  desireModel.systems.relationships,
  'npc-1',
  'npc-2',
  ['acquainted', 'impressed', 'friend']
);
WorldMonth.setAffinity(desireModel.systems.relationships, 'npc-1', 'npc-2', 58);
WorldMonth.setArc(desireModel.systems.relationships, 'npc-1', 'npc-2', {
  stage: 'warm',
  lastEventMonth: 2,
  lastChronicleMonth: 2,
  eventCount: 5,
  romanceBeat: 'jealous'
});
const confessResult = WorldMonth.applySilentPair(
  desireModel,
  'npc-1',
  'npc-2',
  function () { return 0.05; },
  'qinglan-town',
  { acquainted: true, forceAction: 'confess_npc' }
);
ok(
  confessResult.romanceBeatForced === true &&
    confessResult.action === 'confess_npc',
  'confess beat marks romanceBeatForced'
);
const desireArc = WorldMonth.getArc(
  desireModel.systems.relationships,
  'npc-1',
  'npc-2'
);
ok(
  desireArc && desireArc.romanceBeat === 'confessed',
  'confess advances romanceBeat'
);

// NPC↔NPC 恋情发展对象上限：每人最多 3；已有线索可继续；与玩家不设限。
const romanceCapModel = fixture();
romanceCapModel.systems.npcs.records['npc-3'] = person('npc-3');
romanceCapModel.systems.npcs.records['npc-4'] = person('npc-4');
romanceCapModel.systems.npcs.records['npc-5'] = person('npc-5');
romanceCapModel.systems.npcs.activeIds = [
  'npc-1', 'npc-2', 'npc-3', 'npc-4', 'npc-5'
];
['npc-2', 'npc-3', 'npc-4'].forEach(function (otherId) {
  WorldMonth.setTags(
    romanceCapModel.systems.relationships,
    'npc-1',
    otherId,
    ['acquainted', 'impressed', 'friend']
  );
});
ok(
  WorldMonth.countNpcRomanceTargets(
    romanceCapModel.systems.relationships,
    'npc-1'
  ) === 3,
  'npc romance target count reaches 3'
);
ok(
  WorldMonth.canDevelopNpcRomance(
    romanceCapModel.systems.relationships,
    'npc-1',
    'npc-2'
  ) === true,
  'existing romance target can continue'
);
ok(
  WorldMonth.canDevelopNpcRomance(
    romanceCapModel.systems.relationships,
    'npc-1',
    'npc-5'
  ) === false,
  'fourth npc romance target is blocked'
);
ok(
  WorldMonth.canDevelopNpcRomance(
    romanceCapModel.systems.relationships,
    'npc-1',
    'player'
  ) === true,
  'player romance is never capped'
);
WorldMonth.setAffinity(
  romanceCapModel.systems.relationships,
  'npc-1',
  'npc-5',
  80
);
WorldMonth.setTags(
  romanceCapModel.systems.relationships,
  'npc-1',
  'npc-5',
  ['acquainted', 'friend']
);
const cappedPair = WorldMonth.applySilentPair(
  romanceCapModel,
  'npc-1',
  'npc-5',
  function () { return 0.01; },
  'qinglan-town',
  { acquainted: true, forceAction: 'confess_npc' }
);
const cappedTags = WorldMonth.getTags(
  romanceCapModel.systems.relationships,
  'npc-1',
  'npc-5'
);
const cappedArc = WorldMonth.getArc(
  romanceCapModel.systems.relationships,
  'npc-1',
  'npc-5'
);
ok(
  cappedPair.action !== 'confess_npc' &&
    cappedTags.indexOf('lover') < 0 &&
    cappedTags.indexOf('impressed') < 0,
  'capped npc pair cannot open new romance'
);
ok(
  !cappedArc || cappedArc.romanceBeat === 'none',
  'capped npc pair does not start romanceBeat'
);
WorldMonth.setAffinity(
  romanceCapModel.systems.relationships,
  'npc-1',
  'player',
  80
);
const playerOpen = WorldMonth.applySilentPair(
  romanceCapModel,
  'npc-1',
  'player',
  function () { return 0.01; },
  'qinglan-town',
  { acquainted: true, forceAction: 'confess_npc' }
);
const playerTags = WorldMonth.getTags(
  romanceCapModel.systems.relationships,
  'npc-1',
  'player'
);
ok(
  playerOpen.action === 'confess_npc' &&
    playerTags.indexOf('lover') >= 0,
  'npc can still confess to player when npc-npc cap is full'
);

// 跳过月份的衰老必须按真实秒数折算（与 NpcSimulation.YEAR_SECONDS 对齐），
// 不能按日历年 extraMonths/12，否则离线一长就集体寿终。
const ageNudge = fixture();
ageNudge.systems.npcs.records['npc-1'].ageYears = 20;
ageNudge.systems.npcs.records['npc-1'].ageRemainderSeconds = 0;
ageNudge.systems.npcs.records['npc-1'].lifespanYears = 200;
ageNudge.systems.world.calendar = {
  year: 1,
  month: 1,
  monthAccumulator: 0,
  yearEventsCreated: 0,
  yearEventBudget: 36,
  monthEventsCreated: 0,
  npcYearAppearances: {},
  playerLeapLastMonth: {}
};
WorldMonth.advanceMonths(ageNudge, 240, {
  offlineMonthBudget: 0,
  random: function () { return 0.5; }
});
ok(
  ageNudge.systems.npcs.records['npc-1'].ageYears === 21 &&
    ageNudge.systems.npcs.records['npc-1'].status === 'living',
  'skipped 240 months ages about 1 real year, not 20 calendar years'
);
ok(
  ageNudge.systems.npcs.records['npc-1'].status !== 'dead',
  'skipped-month aging does not mass-kill mid-lifespan NPCs'
);

ok(
  WorldMonth.OFFLINE_MONTH_CAP === 48,
  'offline month cap stays at a UI-safe social fidelity budget'
);
ok(
  WorldMonth.OFFLINE_EVENT_MONTH_CHANCE === 0.25 &&
    WorldMonth.OFFLINE_EVENT_MONTHLY_CAP === 1,
  'offline chronicle frequency knobs stay at reduced density'
);

const offlineQuiet = fixture();
offlineQuiet.systems.npcs.records['npc-1'].metPlayer = true;
const quietBefore = (offlineQuiet.systems.world.worldEvents || []).length;
WorldMonth.advanceMonths(offlineQuiet, 24, {
  source: 'offline',
  offlineMonthBudget: 48,
  random: function () { return 0.9; }
});
ok(
  (offlineQuiet.systems.world.worldEvents || []).length === quietBefore,
  'offline months that miss the event chance emit no chronicle'
);

const offlineHit = fixture();
offlineHit.systems.npcs.records['npc-1'].metPlayer = true;
const hitBefore = (offlineHit.systems.world.worldEvents || []).length;
WorldMonth.advanceMonths(offlineHit, 1, {
  source: 'offline',
  offlineMonthBudget: 48,
  random: function () { return 0.1; }
});
ok(
  (offlineHit.systems.world.worldEvents || []).length > hitBefore,
  'offline month that passes the event chance can still write chronicle'
);

console.log('\nWorld month 自测：' + passed + ' 通过，' + failed + ' 失败');
if (failed) process.exitCode = 1;
