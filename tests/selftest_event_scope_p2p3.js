'use strict';
/*
 * selftest_event_scope_p2p3.js —— P1/P2/P3 对齐自测
 *
 * 验证「对标原版」的三件事：
 *   - 刷新范围（P1）：只刷「玩家关系网 ∩ 当日配额」的一小撮人，圈子外的 NPC 不刷。
 *   - 每日离散 Pass + randomlevel（P2）：doevent 逐条执行；每月(=每天) randomlevel 补 1～2。
 *   - 事件分类（P3）：每个 world event 带规范 category + tags（对标原版 List<string[]> 描述符）。
 *
 * 本文件专测 Dns.useRelationshipScope 对齐后的行为。
 */

const WorldMonth = require('../core/world-month.js');
const Stage4State = require('../core/stage4-state.js');
const Dns = require('../core/dns.js');
const EventCore = require('../core/event-core.js');
const PersonGraph = require('../core/person-graph.js');
const OriginalEventBindings = require('../content/original-event-bindings.js');
const OriginalEventTexts = require('../content/original-event-texts.js');

// 对齐行为由 dns.js 默认开启（useRelationshipScope=true）。
// root.mday 是月天数表，不是固定事件日程。
// 本文件即专测"对标后"模型。

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

// ——————————————————————————————————————————————
// P3 单元测试：classifyEvent 映射
// ——————————————————————————————————————————————
ok(
  EventCore.classifyEvent({ romance: true }).category ===
    EventCore.EVENT_CATEGORIES.ROMANCE,
  'P3 classify: romance 标志 → 恋爱类'
);
ok(
  EventCore.classifyEvent({ conflict: true }).category ===
    EventCore.EVENT_CATEGORIES.CONFLICT,
  'P3 classify: conflict 标志 → 冲突类'
);
ok(
  EventCore.classifyEvent({ leap: true }).category ===
    EventCore.EVENT_CATEGORIES.LEAP,
  'P3 classify: leap 标志 → 奇遇类'
);
ok(
  EventCore.classifyEvent({ stranger: true }).category ===
    EventCore.EVENT_CATEGORIES.STRANGER,
  'P3 classify: stranger 标志 → 随机奇遇类'
);
ok(
  EventCore.classifyEvent({ characterBeat: true }).category ===
    EventCore.EVENT_CATEGORIES.CULTIVATION,
  'P3 classify: characterBeat 标志 → 修炼类'
);
ok(
  EventCore.classifyEvent({ action: 'character_beat' }).category ===
    EventCore.EVENT_CATEGORIES.CULTIVATION,
  'P3 classify: action=character_beat → 修炼类'
);
ok(
  EventCore.classifyEvent({}).category === EventCore.EVENT_CATEGORIES.SOCIAL,
  'P3 classify: 无标志 → 默认人际类'
);
const fixedCls = EventCore.classifyEvent({
  fixed: true,
  tags: ['fixed', 'cultivation']
});
ok(
  fixedCls.category === EventCore.EVENT_CATEGORIES.FIXED &&
    fixedCls.tags.indexOf('fixed') >= 0 &&
    fixedCls.tags.indexOf('cultivation') >= 0,
  'P3 classify: fixed 标志 → 固定日程类，且保留附加 tags'
);
ok(
  EventCore.classifyEvent({ fixed: true, romance: true }).category ===
    EventCore.EVENT_CATEGORIES.FIXED,
  'P3 classify: 优先级 fixed > romance'
);
const relCls = EventCore.classifyEvent({ romance: true, tags: ['lover'] });
ok(
  relCls.category === EventCore.EVENT_CATEGORIES.ROMANCE &&
    relCls.tags.indexOf('lover') >= 0,
  'P3 classify: 关系标签(lover)原样保留进 tags'
);

// ——————————————————————————————————————————————
// P1 刷新范围：只刷玩家关系网内的人
// ——————————————————————————————————————————————
const scopeModel = fixture();
    // 只把 npc-1 放进玩家 getpe（frs）；npc-2 仍在世界但不在圈子里。
scopeModel.player.kin = {
  fa: null, mo: null, par: null, frs: ['npc-1'], ens: []
};
scopeModel.systems.npcs.records['npc-1'].kin = {
  fa: null, mo: null, par: null, frs: ['player'], ens: []
};
scopeModel.systems.npcs.records['npc-1'].metPlayer = true;
scopeModel.systems.world.calendar.month = 2; // 下次推进→月3
WorldMonth.advanceOneMonth(scopeModel, helpers([
  0.99, 0.99, 0.99, 0.99, 0.99, 0.05, 0.05, 0.05, 0.05, 0.05
]));

const worldEvents = (scopeModel.systems.world.worldEvents || []).filter(
  function (event) { return event && event.source === 'world'; }
);
ok(worldEvents.length > 0, 'P1/P2：关系网内的人会刷出世界事件');
ok(
  !worldEvents.some(function (event) {
    return Array.isArray(event.participants) &&
      event.participants.indexOf('npc-2') >= 0;
  }),
  'P1：圈子外的 npc-2 不出现在任何世界事件里'
);
ok(
  worldEvents.some(function (event) {
    return Array.isArray(event.participants) &&
      event.participants.indexOf('npc-1') >= 0;
  }),
  'P1：圈子内的 npc-1 出现在世界事件里'
);

// ——————————————————————————————————————————————
// P3 数据对齐：每个世界事件带 category + tags
// ——————————————————————————————————————————————
const catValues = {};
Object.keys(EventCore.EVENT_CATEGORIES).forEach(function (k) {
  catValues[EventCore.EVENT_CATEGORIES[k]] = true;
});
ok(
  worldEvents.every(function (event) {
    return typeof event.category === 'string' &&
      catValues[event.category] === true &&
      Array.isArray(event.tags) &&
      event.tags.indexOf(event.category) >= 0;
  }),
  'P3：每个世界事件都带规范 category + 含该类的 tags'
);

// ——————————————————————————————————————————————
// P2/3C：有绑定池的动作可挂原版 eventId；见闻仍可走 npclog
// ——————————————————————————————————————————————
const beatEvents = worldEvents.filter(function (event) {
  return event && event.type === 'character_beat';
});
ok(
  beatEvents.length === 0 ||
    beatEvents.some(function (event) {
      return Number.isFinite(event.eventId);
    }) ||
    worldEvents.some(function (event) {
      return Number.isFinite(event.eventId);
    }),
  'P2/3C：事件可挂原版 eventId（绑定池或 npclog）'
);
ok(
  Array.isArray(Dns.mday) && Dns.mday.length === 13 && Dns.mday[1] === 31,
  'P2：root.mday 为月天数表 [0,31,28…]，不是事件日程'
);
const hist = scopeModel.systems.npcs.records['npc-1'].history;
ok(
  Array.isArray(hist) && hist.length > 0,
  'P2：参与事件的 NPC 写入 person.history 履历'
);

// ——————————————————————————————————————————————
// P2 离散执行 + 配额：事件真正发生才扣 act1day
// ——————————————————————————————————————————————
ok(
  (scopeModel.systems.npcs.records['npc-1'].act1day || 0) > 0,
  'P2：被刷过事件的 npc-1 当日配额 act1day 已自增'
);
// 跨月必须 resetDaily：人为抬高上月计数，推进后应回到「本月新计数」而非累加。
scopeModel.systems.npcs.records['npc-1'].act1day = 25;
scopeModel.systems.world.calendar.month = 5; // 下次推进→月6
WorldMonth.advanceOneMonth(scopeModel, helpers([
  0.99, 0.99, 0.99, 0.99, 0.99, 0.05, 0.05, 0.05, 0.05, 0.05
]));
const afterReset = scopeModel.systems.npcs.records['npc-1'].act1day || 0;
ok(
  afterReset < 25,
  'P2/P1：每月 resetDaily 清零配额，npc-1 act1day 不跨月累加'
);

// ——————————————————————————————————————————————
// P1 边界：完全无关系网时，世界事件（关系圈来源）应为空
// ——————————————————————————————————————————————
const emptyModel = fixture(); // 无任何 edge / metPlayer
emptyModel.systems.world.calendar.month = 2;
WorldMonth.advanceOneMonth(emptyModel, helpers([
  0.99, 0.99, 0.99, 0.99, 0.99, 0.05, 0.05, 0.05, 0.05, 0.05
]));
const emptyWorld = (emptyModel.systems.world.worldEvents || []).filter(
  function (event) { return event && event.source === 'world'; }
);
ok(
  emptyWorld.length === 0,
  'P1：无认识圈时，关系圈来源的世界事件为空（只刷一小撮 → 此情形下为零）'
);

// ——————————————————————————————————————————————
// 3C：动作绑定池 → 原文案 + 轻量效果
// ——————————————————————————————————————————————
ok(
  OriginalEventBindings.poolFor('gift') &&
    OriginalEventBindings.poolFor('gift').length > 0,
  '3C：gift 有绑定池'
);
const effectModel = fixture();
effectModel.systems.npcs.records['npc-1'].metPlayer = true;
WorldMonth.setAffinity(
  effectModel.systems.relationships,
  'npc-1',
  'npc-2',
  40
);
WorldMonth.waittime0(effectModel, 0, 'doevent', {
  kind: 'pair',
  aId: 'npc-1',
  bId: 'npc-2',
  action: 'gift',
  regionId: 'qinglan-town',
  known: true,
  eventId: 38,
  useOriginalText: true
});
WorldMonth.flushWaitQueue(effectModel, function () { return 0.1; });
const giftEvents = (effectModel.systems.world.worldEvents || []).filter(
  function (event) {
    return event && event.type === 'gift' && event.eventId === 38;
  }
);
ok(giftEvents.length === 1, '3C：doevent 可落地 gift+eventId');
ok(
  giftEvents[0] &&
    typeof giftEvents[0].narrative === 'string' &&
    giftEvents[0].narrative.indexOf(
      OriginalEventTexts.getParts(38)[0]
    ) >= 0,
  '3C：gift 叙事使用原版 eventt 片段'
);

const injureModel = fixture();
injureModel.systems.npcs.records['npc-1'].metPlayer = true;
WorldMonth.waittime0(injureModel, 0, 'doevent', {
  kind: 'pair',
  aId: 'npc-1',
  bId: 'npc-2',
  action: 'rival',
  conflict: true,
  regionId: 'qinglan-town',
  known: true,
  eventId: 558,
  useOriginalText: true
});
WorldMonth.flushWaitQueue(injureModel, function () { return 0.1; });
ok(
  injureModel.systems.npcs.records['npc-1'].activityStatus === 'injured',
  '3C：重伤类 eventId 落地 activityStatus=injured'
);

const daoModel = fixture();
daoModel.systems.npcs.records['npc-1'].metPlayer = true;
WorldMonth.waittime0(daoModel, 0, 'doevent', {
  kind: 'pair',
  aId: 'npc-1',
  bId: 'npc-2',
  action: 'partner_npc',
  regionId: 'qinglan-town',
  known: true,
  eventId: 461,
  useOriginalText: true
});
WorldMonth.flushWaitQueue(daoModel, function () { return 0.1; });
const daoTags = WorldMonth.getTags(
  daoModel.systems.relationships,
  'npc-1',
  'npc-2'
);
ok(
  daoTags.indexOf('dao-companion') >= 0,
  '3C：道侣类 eventId 写入 dao-companion 标签'
);

const feelModel = fixture();
feelModel.systems.npcs.records['npc-1'].metPlayer = true;
WorldMonth.waittime0(feelModel, 0, 'doevent', {
  kind: 'pair',
  aId: 'npc-1',
  bId: 'npc-2',
  action: 'gift',
  regionId: 'qinglan-town',
  known: true,
  eventId: 367,
  useOriginalText: true
});
WorldMonth.flushWaitQueue(feelModel, function () { return 0.1; });
ok(
  WorldMonth.getAffinity(
    feelModel.systems.relationships,
    'npc-1',
    'npc-2'
  ) >= 4,
  '3C+：好感类事件抬升 affinity/feel'
);
const feelEdgeNpc = feelModel.systems.relationships.edges['npc-1>npc-2'];
ok(
  !feelEdgeNpc,
  '关系分层：NPC↔NPC 好感事件不写 8 维 edge'
);
ok(
  (feelModel.systems.relationships.npcAffinities['npc-1>npc-2'] | 0) >= 4,
  '关系分层：NPC↔NPC 只写入 npcAffinities'
);

const playerFeel = fixture();
playerFeel.systems.npcs.records['npc-1'].metPlayer = true;
playerFeel.player.id = 'player';
playerFeel.player.status = 'living';
WorldMonth.waittime0(playerFeel, 0, 'doevent', {
  kind: 'pair',
  aId: 'npc-1',
  bId: 'player',
  action: 'gift',
  regionId: 'qinglan-town',
  known: true,
  eventId: 367,
  useOriginalText: true
});
WorldMonth.flushWaitQueue(playerFeel, function () { return 0.1; });
const playerEdge = playerFeel.systems.relationships.edges['npc-1>player'];
ok(
  playerEdge && playerEdge.affection >= 4,
  '关系分层：玩家↔NPC 好感写入 8 维 affection'
);
ok(
  !playerFeel.systems.relationships.npcAffinities['npc-1>player'],
  '关系分层：玩家↔NPC 不占 npcAffinities'
);

const dropModel = fixture();
dropModel.systems.npcs.records['npc-1'].metPlayer = true;
dropModel.systems.npcs.records['npc-1'].realmStage = 5;
WorldMonth.waittime0(dropModel, 0, 'doevent', {
  kind: 'solo',
  aId: 'npc-1',
  bId: null,
  action: 'character_beat',
  regionId: 'qinglan-town',
  known: true,
  eventId: 59,
  useOriginalText: true,
  characterBeat: true
});
WorldMonth.flushWaitQueue(dropModel, function () { return 0.1; });
ok(
  dropModel.systems.npcs.records['npc-1'].realmStage === 4,
  '3C+：跌小境界事件降低 realmStage'
);

const parts3 = OriginalEventTexts.getParts(496);
ok(Array.isArray(parts3) && parts3.length >= 3,
  '3C+：三人以上多段文案样本可用（event 496）');

ok(
  WorldMonth.fillOriginalEventNarrative(
    301,
    '云星予',
    '林华辰',
    null,
    null,
    function () { return 0; }
  ) === '云星予告诉林华辰自己的发情期到了，想要和她一起修炼',
  '配方：双人两段式带上第二人名'
);
ok(
  WorldMonth.fillOriginalEventNarrative(
    9,
    '云星予',
    '林华辰',
    null,
    null,
    function () { return 0; }
  ) === '云星予结识了同门林华辰，他热情的邀请云星予一起修炼',
  '非玩家见闻：邀请你 → 主语 NPC 名，不留第二人称'
);
ok(
  WorldMonth.fillOriginalEventNarrative(
    146,
    '云星予',
    '林华辰',
    null,
    null,
    function () { return 0; }
  ) === '云星予向林华辰提出结为道侣的请求，是否同意？林华辰结为了道侣',
  '非玩家见闻：向你提出 → 对方 NPC 名'
);
ok(
  WorldMonth.fillOriginalEventNarrative(
    82,
    '楚云晚',
    null,
    null,
    null,
    function () { return 0; },
    null,
    null,
    '路广'
  ) === '楚云晚向路广请求，若是路广未能飞升与天同寿，便请在死前毁掉他，不要让他一个人度过剩下的没有止境的时间',
  '非玩家见闻：单人向你请求 → 玩家名，禁止同人回退'
);
ok(
  WorldMonth.fillOriginalEventNarrative(
    82,
    '楚云晚',
    null,
    null,
    null,
    function () { return 0; }
  ) === null,
  '非玩家见闻：单人向你请求缺玩家名时不硬拼同人句'
);
(function () {
  const Bind = require('../content/original-event-bindings.js');
  const banned = [82, 85, 86, 89, 90, 91];
  const acts = Object.keys(Bind.pools || {});
  let leaked = null;
  for (let i = 0; i < acts.length && !leaked; i++) {
    const pool = Bind.pools[acts[i]] || [];
    for (let j = 0; j < banned.length; j++) {
      if (pool.indexOf(banned[j]) >= 0) {
        leaked = acts[i] + ':' + banned[j];
        break;
      }
    }
  }
  ok(!leaked, '玩家灵宠专属 ID 不进任何随机池' + (leaked ? '（漏：' + leaked + '）' : ''));
  ok(
    (Bind.pools.partner_npc || []).indexOf(147) >= 0,
    '147 拒道侣仍留在 partner_npc 池'
  );
  ok(
    (Bind.pools.breakthrough || []).indexOf(147) < 0,
    '147 不进 breakthrough 池'
  );
})();
ok(
  (function () {
    const forced = fixture();
    forced.systems.npcs.records['npc-1'].metPlayer = true;
    forced.player.name = '路广';
    WorldMonth.waittime0(forced, 0, 'doevent', {
      kind: 'solo',
      aId: 'npc-1',
      bId: null,
      action: 'character_beat',
      regionId: 'qinglan-town',
      known: true,
      eventId: 82,
      useOriginalText: true,
      characterBeat: true
    });
    WorldMonth.flushWaitQueue(forced, function () { return 0.1; });
    const events = (forced.systems.world.worldEvents || []);
    for (let i = 0; i < events.length; i++) {
      if (events[i] && events[i].eventId === 82) return false;
    }
    return true;
  })(),
  '强制 82：资格拒绝，不得落地契约兽见闻'
);
ok(
  (WorldMonth.fillOriginalEventNarrative(
    9, '云星予', '林华辰', null, null, function () { return 0; }
  ) || '').indexOf('你') < 0,
  '非玩家见闻：成品不含「你」'
);
ok(
  WorldMonth.fillOriginalEventNarrative(
    301,
    '云星予',
    null,
    null,
    null,
    function () { return 0; }
  ) === null,
  '配方：缺第二人时双人文案回退（不硬拼缺名句）'
);
ok(
  WorldMonth.fillOriginalEventNarrative(
    353,
    '云星予',
    '林华辰',
    null,
    null,
    function () { return 0; }
  ) === '云星予与林华辰一起游历，发现了一些有趣的灵植',
  '配方：一起…单段补「与B」'
);
ok(
  WorldMonth.fillOriginalEventNarrative(
    53,
    '林华辰',
    '云渊昭',
    null,
    null,
    function () { return 0; }
  ) === '林华辰遇险，为云渊昭在游历时所救',
  '配方：救援多地点变体只抽一段，不连环拼接'
);

ok(
  /获得了.+/.test(WorldMonth.fillOriginalEventNarrative(
    341, '陆和珩', '苏清衡', null, null, function () { return 0.1; }
  ) || ''),
  '配方：秘境获得类补全物品，不截断在「获得了」'
);
ok(
  WorldMonth.fillOriginalEventNarrative(
    230, '苏清衡', '陆和珩', '九棱玄晶', null, function () { return 0; }
  ) === '弟子陆和珩将九棱玄晶作为生日礼物献给师尊',
  '配方：生日献礼三件套用礼物槽，不用人名冒充礼物'
);
ok(
  WorldMonth.fillOriginalEventNarrative(
    349, '林月宁', '云青雪', null, null, function () { return 0; }
  ) === '林月宁与云青雪在游历时遇到了城镇过节的日子，两人一起快乐的过了节',
  '配方：「两人」过节补上第二人名'
);
ok(
  WorldMonth.fillOriginalEventNarrative(
    349, '林月宁', null, null, null, function () { return 0; }
  ) === null,
  '配方：「两人」文案缺第二人时回退'
);

ok(
  /化形为(龙君|龙女|凤君|凤女)$/.test(
    WorldMonth.fillOriginalEventNarrative(
      83, '陆和珩', null, null, null, function () { return 0; }
    ) || ''
  ),
  '配方：灵宠化形补形态名，不截断在「化形为」'
);
ok(
  /孵化出了一只(幼龙|雏凤)。/.test(
    WorldMonth.fillOriginalEventNarrative(
      81, '陆和珩', null, null, null, function () { return 0; }
    ) || ''
  ),
  '配方：孵化灵宠补幼体名'
);
ok(
  /在游历时救了一只(幼龙|雏凤)$/.test(
    WorldMonth.fillOriginalEventNarrative(
      563, '姜岑星', null, null, null, function () { return 0; }
    ) || ''
  ),
  '配方：563 救了一只补幼体名，不截断'
);
ok(
  typeof require('../content/event-templates.js').has === 'function' &&
    require('../content/event-templates.js').has(417) &&
    /顿悟/.test(
      (require('../content/event-templates.js').pickTemplate(417) || '')
    ),
  '模板：417 含顿悟文案'
);
ok(
  WorldMonth.fillOriginalEventNarrative(
    417, '江渊青', null, null, null, function () { return 0; }
  ) === '江渊青在修炼时产生了顿悟，突破成功率增加5%',
  '配方：417 在修炼补顿悟后缀，不截断'
);
ok(
  WorldMonth.fillOriginalEventNarrative(
    412, '江渊青', null, null, null, function () { return 0; }
  ) === '江渊青在弹琴时产生了顿悟，突破成功率增加5%',
  '配方：412 在弹琴补顿悟后缀'
);
ok(
  /捡到了.+/.test(
    WorldMonth.fillOriginalEventNarrative(
      410, '江渊青', null, null, null, function () { return 0; }
    ) || ''
  ),
  '配方：410 捡到了补物品名'
);
ok(
  OriginalEventBindings.effectFor(417) &&
    Math.abs(OriginalEventBindings.effectFor(417).breakthrough_delta - 0.05) < 1e-9,
  'P0：417 顿悟类带 breakthrough_delta +0.05'
);
ok(
  /^在尚是一只(幼龙|雏凤)时为姜岑星所救$/.test(
    WorldMonth.fillOriginalEventNarrative(
      565, '姜岑星', null, null, null, function () { return 0; }
    ) || ''
  ),
  '配方：565 尚是一只…所救补幼体与恩人'
);
ok(
  /^(龙君|龙女|凤君|凤女)满怀激动的找到了姜岑星，/.test(
    WorldMonth.fillOriginalEventNarrative(
      564, '姜岑星', null, null, null, function () { return 0; }
    ) || ''
  ),
  '配方：564 报恩找到恩人补形态名'
);
ok(
  (WorldMonth.fillOriginalEventNarrative(
    561, '秦安真', '陆和珩', null, null, function () { return 0; }
  ) || '').indexOf('找到陆和珩倾诉') >= 0,
  '配方：561 恢复记忆后「找到」补上第二人'
);
ok(
  (WorldMonth.fillOriginalEventNarrative(
    582, '秦安真', '陆和珩', null, null, function () { return 0; }
  ) || '').indexOf('见到陆和珩向她诉说') >= 0,
  '配方：582 恢复记忆后「见到」补上第二人'
);
ok(
  /成为了.+灵根$/.test(
    WorldMonth.fillOriginalEventNarrative(
      384, '陆和珩', null, null, null, function () { return 0.2; }
    ) || ''
  ),
  '配方：洗髓丹补灵根名'
);
ok(
  /接替.+成为.+/.test(
    WorldMonth.fillOriginalEventNarrative(
      212, '陆和珩', '苏清衡', null, null, function () { return 0; }
    ) || ''
  ),
  '配方：接替成为补职位名'
);
ok(
  /起名为.+/.test(
    WorldMonth.fillOriginalEventNarrative(
      459, '林月宁', null, null, null, function () { return 0; }
    ) || ''
  ),
  '配方：产子起名补婴儿名'
);

// P0：事件真实生效 —— 突破百分比 / 洗髓升灵根
ok(
  OriginalEventBindings.effectFor(419) &&
    Math.abs(OriginalEventBindings.effectFor(419).breakthrough_delta - 0.15) < 1e-9,
  'P0：神果文案解析为 breakthrough_delta +0.15'
);
ok(
  OriginalEventBindings.effectFor(571) &&
    Math.abs(OriginalEventBindings.effectFor(571).breakthrough_delta + 0.1) < 1e-9,
  'P0：化形打击解析为 breakthrough_delta -0.10'
);
ok(
  OriginalEventBindings.effectFor(384) &&
    OriginalEventBindings.effectFor(384).wash_root === true,
  'P0：洗髓事件带 wash_root'
);

(function () {
  const btModel = fixture();
  btModel.systems.npcs.records['npc-1'].metPlayer = true;
  btModel.systems.npcs.records['npc-1'].breakthroughBias = 0;
  WorldMonth.waittime0(btModel, 0, 'doevent', {
    kind: 'pair',
    aId: 'npc-1',
    bId: 'npc-2',
    action: 'character_beat',
    regionId: 'qinglan-town',
    known: true,
    eventId: 419,
    useOriginalText: true
  });
  WorldMonth.flushWaitQueue(btModel, function () { return 0.1; });
  ok(
    Math.abs(
      (btModel.systems.npcs.records['npc-1'].breakthroughBias || 0) - 0.15
    ) < 1e-9,
    'P0：偶食神果真实写入 breakthroughBias +0.15'
  );
})();

(function () {
  const washModel = fixture();
  washModel.systems.npcs.records['npc-1'].metPlayer = true;
  washModel.systems.npcs.records['npc-1'].spiritualRootId = 'dual';
  WorldMonth.waittime0(washModel, 0, 'doevent', {
    kind: 'solo',
    aId: 'npc-1',
    action: 'character_beat',
    characterBeat: true,
    regionId: 'qinglan-town',
    known: true,
    eventId: 384,
    useOriginalText: true
  });
  WorldMonth.flushWaitQueue(washModel, function () { return 0.1; });
ok(
  washModel.systems.npcs.records['npc-1'].spiritualRootId === 'single',
  'P0：洗髓丹真实升一档灵根 dual→single'
);
})();

// 结构性事件：升职 / 产子 / 灵宠（获物仅表现、NPC 无背包）
(function () {
  const petModel = fixture();
  petModel.systems.npcs.records['npc-1'].metPlayer = true;
  WorldMonth.waittime0(petModel, 0, 'doevent', {
    kind: 'solo',
    aId: 'npc-1',
    action: 'character_beat',
    characterBeat: true,
    regionId: 'qinglan-town',
    known: true,
    eventId: 81,
    useOriginalText: true
  });
  WorldMonth.flushWaitQueue(petModel, function () { return 0.1; });
  const pet1 = petModel.systems.npcs.records['npc-1'].spiritPet;
  ok(pet1 && pet1.stage === 'young' && pet1.youngName,
    '结构：81 孵化写入 spiritPet.young');
  WorldMonth.waittime0(petModel, 0, 'doevent', {
    kind: 'solo',
    aId: 'npc-1',
    action: 'character_beat',
    characterBeat: true,
    regionId: 'qinglan-town',
    known: true,
    eventId: 83,
    useOriginalText: true
  });
  WorldMonth.flushWaitQueue(petModel, function () { return 0.1; });
  const pet2 = petModel.systems.npcs.records['npc-1'].spiritPet;
  ok(pet2 && pet2.stage === 'formed' && pet2.formName,
    '结构：83 化形写入 spiritPet.form');
  const formedName = pet2.formName;
  WorldMonth.waittime0(petModel, 0, 'doevent', {
    kind: 'solo',
    aId: 'npc-1',
    action: 'character_beat',
    characterBeat: true,
    regionId: 'qinglan-town',
    known: true,
    eventId: 83,
    useOriginalText: true
  });
  WorldMonth.flushWaitQueue(petModel, function () { return 0.1; });
  const pet3 = petModel.systems.npcs.records['npc-1'].spiritPet;
  ok(pet3 && pet3.stage === 'formed' && pet3.formName === formedName,
    '结构：已化形后再次 83 不会改形态');
  const dupEvents = (petModel.systems.world.worldEvents || []).filter(function (ev) {
    return ev && ev.eventId === 83;
  });
  ok(dupEvents.length === 1,
    '结构：已化形后再次抽 83 会改抽，不重复化形见闻');
})();

(function () {
  const noPet = fixture();
  noPet.systems.npcs.records['npc-1'].metPlayer = true;
  noPet.systems.npcs.records['npc-1'].spiritPet = null;
  WorldMonth.waittime0(noPet, 0, 'doevent', {
    kind: 'solo',
    aId: 'npc-1',
    action: 'character_beat',
    characterBeat: true,
    regionId: 'qinglan-town',
    known: true,
    eventId: 83,
    useOriginalText: true
  });
  WorldMonth.flushWaitQueue(noPet, function () { return 0.1; });
  const world = noPet.systems.world.worldEvents || [];
  const fakeForm = world.some(function (ev) {
    return ev && ev.eventId === 83;
  });
  ok(!fakeForm && !noPet.systems.npcs.records['npc-1'].spiritPet,
    '结构：无幼宠时 83 不会凭空化形见闻');
})();

(function () {
  const jobModel = fixture();
  const a = jobModel.systems.npcs.records['npc-1'];
  const b = jobModel.systems.npcs.records['npc-2'];
  a.metPlayer = true;
  b.metPlayer = true;
  a.sectId = 'taixuan-sword';
  b.sectId = 'taixuan-sword';
  a.regionId = 'qinglan-town';
  b.regionId = 'qinglan-town';
  b.officeSlotId = 'elder';
  b.job = 1;
  a.officeSlotId = 'disciple';
  a.job = 0;
  a.realmStage = 6;
  b.realmStage = 6;
  WorldMonth.waittime0(jobModel, 0, 'doevent', {
    kind: 'pair',
    aId: 'npc-1',
    bId: 'npc-2',
    action: 'character_beat',
    regionId: 'qinglan-town',
    known: true,
    eventId: 212,
    useOriginalText: true
  });
  WorldMonth.flushWaitQueue(jobModel, function () { return 0.1; });
  ok(
    jobModel.systems.npcs.records['npc-1'].officeSlotId === 'elder' ||
      jobModel.systems.npcs.records['npc-1'].job >= 1,
    '结构：212 接替后继任者升职'
  );
})();

(function () {
  const birthModel = fixture();
  const a = birthModel.systems.npcs.records['npc-1'];
  const b = birthModel.systems.npcs.records['npc-2'];
  a.metPlayer = true;
  b.metPlayer = true;
  a.identity.gender = 'female';
  b.identity.gender = 'male';
  const before = Object.keys(birthModel.systems.npcs.records).length;
  WorldMonth.waittime0(birthModel, 0, 'doevent', {
    kind: 'pair',
    aId: 'npc-1',
    bId: 'npc-2',
    action: 'character_beat',
    regionId: 'qinglan-town',
    known: true,
    eventId: 459,
    useOriginalText: true
  });
  WorldMonth.flushWaitQueue(birthModel, function () { return 0.1; });
  const afterIds = Object.keys(birthModel.systems.npcs.records);
  const childId = afterIds.find(function (id) {
    const p = birthModel.systems.npcs.records[id];
    return p && p.lifeStage === 'child';
  });
  ok(afterIds.length === before + 1 && childId,
    '结构：459 产子真实造出 child');
  const child = birthModel.systems.npcs.records[childId];
  ok(
    child &&
      ((child.kin && (child.kin.fa || child.kin.mo)) ||
        (child.parentIds && child.parentIds.length)),
    '结构：459 孩子挂上父母亲缘'
  );
  ok(
    !birthModel.systems.npcs.records['npc-1'].inventory ||
      !birthModel.systems.npcs.records['npc-1'].inventory.stacks,
    '结构：NPC 仍无背包 stacks（获物只表现）'
  );
})();

(function () {
  const lowModel = fixture();
  lowModel.systems.npcs.records['npc-1'].metPlayer = true;
  lowModel.systems.npcs.records['npc-1'].realmStage = 0;
  WorldMonth.waittime0(lowModel, 0, 'doevent', {
    kind: 'solo',
    aId: 'npc-1',
    action: 'character_beat',
    characterBeat: true,
    regionId: 'qinglan-town',
    known: true,
    eventId: 213,
    useOriginalText: true
  });
  WorldMonth.flushWaitQueue(lowModel, function () { return 0.1; });
  const low = lowModel.systems.npcs.records['npc-1'];
  ok(low && low.status === 'living',
    '飞升门槛：练气境抽到 213 不得 status=ascended');
  const lowEvents = (lowModel.systems.world.worldEvents || []).filter(
    function (e) { return e && e.participants && e.participants.indexOf('npc-1') >= 0; }
  );
  ok(
    lowEvents.every(function (e) { return e.eventId !== 213; }),
    '飞升门槛：练气境不得保留「成功飞升」eventId=213 叙事'
  );
})();

(function () {
  const ascendModel = fixture();
  ascendModel.systems.npcs.records['npc-1'].metPlayer = true;
  ascendModel.systems.npcs.records['npc-1'].realmStage = 16;
  WorldMonth.waittime0(ascendModel, 0, 'doevent', {
    kind: 'solo',
    aId: 'npc-1',
    action: 'character_beat',
    characterBeat: true,
    regionId: 'qinglan-town',
    known: true,
    eventId: 213,
    useOriginalText: true
  });
  WorldMonth.flushWaitQueue(ascendModel, function () { return 0.1; });
  const p = ascendModel.systems.npcs.records['npc-1'];
  ok(p && p.status === 'ascended',
    '飞升：达飞升境(16)后 213 才 status=ascended');
  ok(
    (ascendModel.systems.npcs.activeIds || []).indexOf('npc-1') < 0,
    '飞升：离开日常人物池 activeIds'
  );
})();

// 圈外扩：熟人会结识圈子外的人（写入 frs，可进大事记）。
(function () {
  const PersonFactory = require('../core/person-factory.js');
  const expandModel = fixture();
  expandModel.systems.npcs.records['npc-1'].metPlayer = true;
  expandModel.systems.npcs.records['npc-1'].kin = {
    fa: null, mo: null, par: null, frs: ['player'], ens: []
  };
  expandModel.player.kin = {
    fa: null, mo: null, par: null, frs: ['npc-1'], ens: []
  };
  expandModel.systems.relationships.edges['npc-1>player'] = {
    affection: 30, trust: 10, romanticAttachment: 0, closeness: 8,
    dependence: 0, loyalty: 0, jealousy: 0, desire: 0, lastChangedAt: 0
  };
  expandModel.systems.relationships.edges['player>npc-1'] = {
    affection: 28, trust: 10, romanticAttachment: 0, closeness: 8,
    dependence: 0, loyalty: 0, jealousy: 0, desire: 0, lastChangedAt: 0
  };
  const outsider = PersonFactory.createPerson(expandModel, {
    regionId: 'qinglan-town',
    metPlayer: false
  });
  outsider.metPlayer = false;
  // 只留 npc-1 在玩家圈内，避免熟人双人互动占满每月 1～2 额度。
  delete expandModel.systems.npcs.records['npc-2'];
  expandModel.systems.npcs.activeIds = ['npc-1', outsider.id];
  for (let month = 0; month < 36; month++) {
    WorldMonth.advanceOneMonth(expandModel, helpers([
      0.05, 0.08, 0.12, 0.18, 0.22, 0.28, 0.33, 0.37, 0.41, 0.2
    ]));
  }
  const hostFrs = expandModel.systems.npcs.records['npc-1'].kin.frs || [];
  ok(
    hostFrs.indexOf(outsider.id) >= 0 ||
      hostFrs.some(function (id) {
        return id !== 'player' && id !== 'npc-2';
      }) ||
      (expandModel.systems.world.worldEvents || []).some(function (event) {
        return event && event.type === 'meet' &&
          Array.isArray(event.participants) &&
          event.participants.indexOf('npc-1') >= 0;
      }),
    '圈外扩：熟人可结识圈外新人（见闻落地或 frs）'
  );
  const outerMeetStory = (expandModel.systems.world.worldEvents || []).filter(
    function (event) {
      return event &&
        event.type === 'meet' &&
        Array.isArray(event.participants) &&
        event.participants.indexOf('npc-1') >= 0 &&
        event.participants.some(function (id) {
          return id !== 'npc-1' && id !== 'player' && id !== 'npc-2';
        });
    }
  );
  ok(
    outerMeetStory.every(function (event) {
      return WorldMonth.isChronicleEvent(event) === true;
    }),
    '圈外结识若落地则进大事记（讲了才算）'
  );
})();

console.log('\n事件对齐 P1/P2/P3 自测：' + passed + ' 通过，' + failed + ' 失败');
if (failed) process.exitCode = 1;
