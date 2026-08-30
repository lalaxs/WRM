'use strict';

const assert = require('assert');
const Stage4State = require('../core/stage4-state.js');
const PersonFactory = require('../core/person-factory.js');
const PersonGraph = require('../core/person-graph.js');
const LifeSkillContent = require('../content/life-skills.js');

let passed = 0;
function ok(condition, label) {
  assert.ok(condition, label);
  passed++;
  console.log('✓ ' + label);
}

function skills() {
  const out = {};
  Object.keys(LifeSkillContent.SKILLS).forEach(function (id) {
    out[id] = { level: 1, xp: 0 };
  });
  return out;
}

ok(typeof PersonFactory.seedOpeningWorld === 'function',
  'PersonFactory.seedOpeningWorld 存在');
ok(typeof PersonFactory.createFriend === 'function' &&
  typeof PersonFactory.createMother === 'function' &&
  typeof PersonFactory.createFamilyMember === 'function',
  'PersonFactory 导出 creatperson* 风格入口');

const famiProbe = Stage4State.normalize({
  schemaVersion: 5,
  created: true,
  player: {
    name: '测',
    realmStage: 0,
    cultivation: 0,
    shouyuan: 120,
    shouMax: 120,
    skills: skills(),
    regionId: 'qinglan-town'
  },
  appearance: { parts: { body: 1 } },
  rngState: 99,
  systems: {
    npcs: {
      nextId: 1,
      activeTarget: 40,
      records: {},
      activeIds: [],
      backgroundIds: [],
      backgroundCursor: 0
    }
  }
});
const famMember = PersonFactory.createFamilyMember(famiProbe, 0, 2, 0, true);
ok(famMember && famMember.fami === 0 && famMember.sectId === 'taixuan-sword',
  'creatpersonf：按 fami=0 造人并映射太玄宗');
ok(famMember.realmStage >= 2, 'creatpersonf：levelmin 落到 realmStage');

let model = Stage4State.normalize({
  schemaVersion: 5,
  created: true,
  player: {
    name: '测',
    realmStage: 0,
    cultivation: 0,
    shouyuan: 120,
    shouMax: 120,
    skills: skills(),
    regionId: 'qinglan-town'
  },
  appearance: { parts: { body: 1 } },
  rngState: 42,
  systems: {}
});
model = Stage4State.normalize(Stage4State.ensureWorldPopulation(model));

const records = model.systems.npcs.records;
const count = Object.keys(records).length;
ok(count >= 3 && count <= 12, '开局按关系造人，人数为小圈子而非 120');
ok(model.player.kin &&
  !model.player.kin.mo &&
  !model.player.kin.fa &&
  (!model.player.parentIds || model.player.parentIds.length === 0),
  '玩家开局无父母');
ok(Array.isArray(model.player.kin.frs) && model.player.kin.frs.length >= 2,
  '玩家 kin.frs 有友人');

const HIGH_OFFICES = {
  leader: true,
  honor: true,
  elder: true,
  true: true,
  steward: true
};
model.player.kin.frs.forEach(function (id) {
  const person = records[id];
  ok(person && person.realmStage <= 1, '开局友人境界压在炼气');
  ok(!person.officeSlotId ||
    person.officeSlotId === 'outer' ||
    person.officeSlotId === 'inner',
    '开局友人不当真传/长老/堂主');
  ok(!person.officeSlotId || !HIGH_OFFICES[person.officeSlotId],
    '开局友人不占高职席');
});
const identities = model.player.kin.frs.map(function (id) {
  const person = records[id];
  if (!person.sectId) return 'rogue';
  return person.officeSlotId || 'sect';
});
ok(identities.length >= 2, '开局友人身份可抽样');

const circle = PersonGraph.relatedToPlayer(model);
ok(circle.size >= model.player.kin.frs.length &&
  model.player.kin.frs.every(function (id) { return circle.has(id); }),
  'getpe 圈子覆盖玩家友人');
model.player.kin.frs.forEach(function (id) {
  ok(circle.has(id), '友人在 getpe 圈子内');
});
ok(count >= model.player.kin.frs.length,
  '开局人物含友人；门派高境宗主可不在关系圈');
Object.keys(records).forEach(function (id) {
  const person = records[id];
  if (person && person.officeSlotId === 'leader' && !person.metPlayer) {
    ok(!circle.has(id) || model.player.kin.frs.indexOf(id) >= 0,
      '未结识宗主默认不进玩家关系圈');
  }
});

const friendA = records[model.player.kin.frs[0]];
const friendB = records[model.player.kin.frs[1]];
ok(friendA && friendB &&
  Array.isArray(friendA.kin.frs) &&
  friendA.kin.frs.indexOf(friendB.id) < 0 &&
  Array.isArray(friendB.kin.frs) &&
  friendB.kin.frs.indexOf(friendA.id) < 0,
  '开局友人互不认识，只与玩家为友');
ok(
  friendA.kin.frs.indexOf('player') >= 0 &&
  friendB.kin.frs.indexOf('player') >= 0,
  '开局友人各自把玩家写进 frs'
);

const meetEvents = (model.systems.world.worldEvents || []).filter(function (ev) {
  return ev && Array.isArray(ev.tags) && ev.tags.indexOf('opening_meet') >= 0;
});
ok(meetEvents.length === model.player.kin.frs.length,
  '开局每位友人各有一条结识见闻');
ok(meetEvents.every(function (ev) {
  return Array.isArray(ev.participants) &&
    ev.participants.indexOf('player') >= 0 &&
    /自幼|结伴|帮工|避雨/.test(ev.narrative || '');
}), '结识见闻写明玩家与友人如何相识');
const prologue = (model.systems.world.worldEvents || []).find(function (ev) {
  return ev && Array.isArray(ev.tags) &&
    ev.tags.indexOf('prologue') >= 0 &&
    /踏入修仙旅途/.test(ev.narrative || '');
});
ok(prologue && prologue.type === 'character_beat',
  '开局写入踏入修仙旅途见闻');
ok(prologue.participants &&
  prologue.participants.indexOf('player') >= 0 &&
  prologue.participants.every(function (id) { return id === 'player'; }) &&
  !/与.+等故人/.test(prologue.narrative || ''),
  '踏入旅途见闻不再点名其他 NPC');

const again = Stage4State.ensureWorldPopulation(model);
ok(Object.keys(again.systems.npcs.records).length === count,
  '已有人口时 ensureWorldPopulation 不重掷');
ok((again.systems.world.worldEvents || []).filter(function (ev) {
  return ev && Array.isArray(ev.tags) && ev.tags.indexOf('opening_meet') >= 0;
}).length === model.player.kin.frs.length,
  '已有人口时仍保留开局结识见闻');

// 模拟旧档：友人还在，但大事记只剩一条踏入旅途，且玩家 kin.frs 被清掉。
const stale = Stage4State.normalize(JSON.parse(JSON.stringify(model)));
stale.player.kin.frs = [];
stale.systems.world.worldEvents = (stale.systems.world.worldEvents || [])
  .filter(function (ev) {
    return ev && Array.isArray(ev.tags) &&
      ev.tags.indexOf('opening') >= 0 &&
      ev.tags.indexOf('opening_meet') < 0;
  });
const repaired = Stage4State.ensureWorldPopulation(stale);
ok(repaired.player.kin.frs.length >= 2, '旧档可从 NPC 侧恢复玩家友人');
ok((repaired.systems.world.worldEvents || []).filter(function (ev) {
  return ev && Array.isArray(ev.tags) && ev.tags.indexOf('opening_meet') >= 0;
}).length >= repaired.player.kin.frs.length,
  '旧档会补写每位友人的结识见闻');

const StateModel = require('../core/state-model.js');
const SaveSystem = require('../core/save-system.js');
const persistRound = StateModel.normalize(model);
ok(persistRound.player.kin.frs.length >= 2,
  'StateModel.normalize 不丢 player.kin.frs');
const store = {};
const adapter = {
  read(k) {
    return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
  },
  write(k, v) {
    store[k] = typeof v === 'string' ? v : JSON.stringify(v);
    return true;
  },
  load(k) {
    const v = this.read(k);
    if (v == null) return null;
    return typeof v === 'string' ? JSON.parse(v) : v;
  },
  save(k, v) {
    return this.write(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
};
SaveSystem.save(adapter, StateModel.toSnapshotInput(model), 2000);
const reloaded = SaveSystem.load(adapter, 2001);
ok(
  reloaded.source === 'snapshot' &&
    reloaded.snapshot.player.kin.frs.length >= 2 &&
    (reloaded.snapshot.systems.world.worldEvents || []).filter(function (ev) {
      return ev && Array.isArray(ev.tags) &&
        ev.tags.indexOf('opening_meet') >= 0;
    }).length >= 2,
  '存档往返保留友人圈与结识见闻'
);

const empty = Stage4State.normalize({
  schemaVersion: 5,
  created: true,
  player: {
    name: '空',
    realmStage: 0,
    cultivation: 0,
    shouyuan: 120,
    shouMax: 120,
    skills: skills()
  },
  appearance: { parts: { body: 1 } },
  rngState: 7,
  systems: {
    npcs: {
      nextId: 1,
      activeTarget: 40,
      records: {},
      activeIds: [],
      backgroundIds: [],
      backgroundCursor: 0
    }
  }
});
const seeded = PersonFactory.seedOpeningWorld(empty);
ok(Object.keys(seeded.systems.npcs.records).length >= 3,
  'seedOpeningWorld 可直接种植关系包');
ok(!seeded.player.kin.mo && !seeded.player.kin.fa,
  '直接种植也不给玩家父母');

const beforeExpand = Object.keys(model.systems.npcs.records).length;
const expanded = PersonFactory.expandForPlayerMeeting(model, {
  regionId: 'qinglan-town',
  random: function () { return 0.1; }
});
ok(expanded && expanded.npcId &&
  model.systems.npcs.records[expanded.npcId] &&
  model.systems.npcs.records[expanded.npcId].metPlayer !== true,
  'expandForPlayerMeeting 产出尚未结识的候选人');
ok(Object.keys(model.systems.npcs.records).length >= beforeExpand,
  '扩圈候选人可复用已有人或按关系新造');
ok(expanded.introducedBy == null ||
  !!model.systems.npcs.records[expanded.introducedBy],
  '引见人若存在则落在已有人物上');

console.log('PersonFactory 开局关系自测：' + passed + ' 通过 / 0 失败');
