'use strict';
/*
 * 原版 af 对照自测：职位/家族名为参考数据，不覆盖 H5 展示。
 * 事件文案仍供 world-month 叙事使用。
 */

const OriginalJobs = require('../content/original-jobs.js');
const OriginalEventTexts = require('../content/original-event-texts.js');
const OriginalEventBindings = require('../content/original-event-bindings.js');
const Dns = require('../core/dns.js');
const SectOfficeContent = require('../content/sect-offices.js');
const SectContent = require('../content/sects.js');

let passed = 0;
let failed = 0;
function ok(cond, label) {
  if (cond) {
    passed++;
    console.log('✓ ' + label);
  } else {
    failed++;
    console.error('✗ ' + label);
  }
}

ok(OriginalJobs.rejob(1, 3) === '掌门', '对照表 rejob(1,3)=掌门（参考）');
ok(OriginalJobs.famiName(4) === '万剑山', '对照表 famiName(4)=万剑山（参考）');

const h5Sect = SectContent.get('taixuan-sword');
ok(h5Sect && h5Sect.name === '太玄剑宗',
  'H5 门派中文名保留自有文案（太玄剑宗）');
ok(h5Sect.name !== OriginalJobs.famiName(0),
  'H5 门派名不强制换成原版 fami 名');
const h5Leader = SectOfficeContent.getSlot('taixuan-sword', 'leader');
ok(h5Leader && typeof h5Leader.title === 'string' && h5Leader.title.length > 0,
  'H5 职位名来自 sect-offices');

ok(OriginalEventTexts.count >= 500, 'eventt 文案条数充足');
ok(typeof OriginalEventTexts.get(229) === 'string' &&
  OriginalEventTexts.get(229).length > 0,
  'npclog 229 有原版文案可供叙事');

const covered = Dns.npclog.filter(function (id) {
  return !!OriginalEventTexts.get(id);
}).length;
ok(covered >= 150, 'npclog 文案覆盖可用（实际 ' + covered + '）');

ok(OriginalEventBindings.poolFor('gift') &&
  OriginalEventBindings.poolFor('gift').length >= 10,
  '3C：gift 动作有原版 eventId 池');
ok(OriginalEventBindings.poolFor('date') &&
  OriginalEventBindings.poolFor('date').length >= 5,
  '3C：date 动作有原版 eventId 池');
const giftId = OriginalEventBindings.pickEventId('gift', function () {
  return 0;
});
ok(Number.isFinite(giftId) && !!OriginalEventTexts.get(giftId),
  '3C：绑定池抽出的 eventId 有原文案');
ok(OriginalEventBindings.effectFor(558) &&
  OriginalEventBindings.effectFor(558).status === 'injured',
  '3C：轻量效果表含重伤类');
ok(OriginalEventBindings.effectFor(367) &&
  OriginalEventBindings.effectFor(367).feel >= 4,
  '3C+：好感类文案写入 feel 账本增量');
ok(OriginalEventBindings.effectFor(59) &&
  OriginalEventBindings.effectFor(59).sublevel >= 1,
  '3C+：跌境界文案写入 sublevel');
ok(Dns.npclogMissingText.indexOf(218) >= 0,
  '缺文案 ID 已登记（语言包无正文）');
ok(Dns.pickNpclogId(function () { return 0; }) !== 218,
  'pickNpclogId 跳过缺文案 ID');
const loveBump = Dns.randomAddLove(2, 2, function () { return 0; });
ok(loveBump.romanticAttachment === 2 && loveBump.affection >= 1,
  'randomAddLove 对标增进感情');
ok(OriginalEventBindings.resolveConsentEventId(32) === 33,
  '同意暂不做：求道侣提问改拒绝 ID');
ok(OriginalEventBindings.resolveConsentEventId(60) == null,
  '同意暂不做：收徒提问跳过');
ok(!!OriginalEventBindings.poolFor('spar'),
  '完全还原：无独立文案动作走别名池');

console.log('\n原版 af 对照自测：' + passed + ' 通过，' + failed + ' 失败');
if (failed) process.exitCode = 1;
