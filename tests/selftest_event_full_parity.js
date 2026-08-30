'use strict';
/*
 * 事件完全还原自测（保留时间推进；暂不做是否同意）
 */

const OriginalEventTexts = require('../content/original-event-texts.js');
const OriginalEventBindings = require('../content/original-event-bindings.js');
const Dns = require('../core/dns.js');
const WorldMonth = require('../core/world-month.js');

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

ok(Dns.useMonthlySoftCap === false, '月软帽关闭（密度对标 randomlevel）');
ok(Dns.useYearBudget === false, '年预算关闭');

ok(OriginalEventBindings.resolveConsentEventId(32) === 33, '求道侣提问→拒绝 33');
ok(OriginalEventBindings.resolveConsentEventId(146) === 147, '求道侣提问→拒绝 147');
ok(OriginalEventBindings.resolveConsentEventId(210) === 211, '双修提问→拒绝 211');
ok(OriginalEventBindings.resolveConsentEventId(237) === 238, '双修提问→拒绝 238');
ok(OriginalEventBindings.resolveConsentEventId(60) == null, '收徒提问跳过');

let partnerBad = 0;
for (let i = 0; i < 80; i++) {
  const id = OriginalEventBindings.pickEventId('partner_npc', Math.random);
  if (id === 32 || id === 146 || OriginalEventBindings.isConsentQuestion(id)) {
    partnerBad += 1;
  }
}
ok(partnerBad === 0, 'partner_npc 池不落地提问 ID');

const eff33 = OriginalEventBindings.effectFor(32);
ok(eff33 && eff33.buff === 'breakthrough_down' && !eff33.tag,
  '提问 32 效果按拒绝 33：降突破、不挂道侣');
ok(!OriginalEventBindings.effectFor(147) ||
  !OriginalEventBindings.effectFor(147).tag,
  '拒绝 147 不挂道侣');

ok(!!OriginalEventBindings.poolFor('spar'), 'spar 经别名有原版池');
ok(!!OriginalEventBindings.poolFor('debate'), 'debate 经别名有原版池');
ok(!!OriginalEventBindings.poolFor('duel'), 'duel 经别名有原版池');
ok(!!OriginalEventBindings.poolFor('market'), 'market 有原版池');

const narr = WorldMonth.fillOriginalEventNarrative(
  33, '甲', '乙', null, null, Math.random
);
ok(typeof narr === 'string' && narr.indexOf('拒绝') >= 0,
  '拒绝文案可插名播报');

const giftId = OriginalEventBindings.pickEventId('gift', function () { return 0; });
ok(Number.isFinite(giftId) && !!OriginalEventTexts.get(giftId),
  'gift 抽出的 ID 有原文案');

console.log('\n事件完全还原自测：' + passed + ' 通过，' + failed + ' 失败');
if (failed) process.exitCode = 1;
