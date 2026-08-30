/* P0+P1 自测：验证关系网展开(getpe) + 资格闸门(cans) + 配额 + world-month 可加载 */
const base = 'D:/ZM/修炼手札/xiuxian-idle-h5/core/';
const Dns = require(base + 'dns.js');
const PersonGraph = require(base + 'person-graph.js');

function makeState() {
  return {
    player: { id: 'player', status: 'living', act1day: 0 },
    systems: {
      relationships: {
        edges: {
          'a>player': { affection: 30, trust: 10, romanticAttachment: 5, closeness: 8, dependence: 0, loyalty: 0, jealousy: 0, desire: 0, lastChangedAt: 0 },
          'player>b': { affection: 25, trust: 5, romanticAttachment: 0, closeness: 4, dependence: 0, loyalty: 0, jealousy: 0, desire: 0, lastChangedAt: 0 }
        },
        bonds: { 'c|player': { stage: 'friend', changedByEventId: null, changedAt: 0 } },
        restrictions: {}
      },
      npcs: {
        records: {
          a: { id: 'a', status: 'living', sectId: 'sect-x', metPlayer: false, act1day: 0 },
          b: { id: 'b', status: 'living', sectId: 'sect-y', metPlayer: false, act1day: 0 },
          c: { id: 'c', status: 'living', sectId: 'sect-z', metPlayer: false, act1day: 0 },
          d: { id: 'd', status: 'living', sectId: 'sect-w', metPlayer: false, act1day: 0 }, // 无关
          e: { id: 'e', status: 'dead', sectId: 'sect-w', metPlayer: false, act1day: 0 },   // 死亡
          f: { id: 'f', status: 'living', sectId: 'sect-w', metPlayer: true, act1day: 0 }   // 仅被结识
        }
      }
    }
  };
}

let pass = 0, fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name); }
}

const s = makeState();
const net = PersonGraph.relatedToPlayer(s);
console.log('relatedToPlayer =', [...net].sort());
assert('含 a(边 a>player)', net.has('a'));
assert('含 b(边 player>b)', net.has('b'));
assert('含 c(bond c|player)', net.has('c'));
assert('含 f(metPlayer)', net.has('f'));
assert('不含无关 d', !net.has('d'));
assert('不含死亡 e', !net.has('e'));

assert('cans(a) 有关系且在配额=true', PersonGraph.cans(s, 'a') === true);
assert('cans(d) 无关=false', PersonGraph.cans(s, 'd') === false);
assert('cans(e) 死亡=false', PersonGraph.cans(s, 'e') === false);

PersonGraph.markActed(s, 'a');
assert('markActed 后 a.act1day=1', s.systems.npcs.records.a.act1day === 1);
assert('cans(a) 配额30未用尽(1<30)', PersonGraph.cans(s, 'a') === true);
s.systems.npcs.records.a.act1day = 30;
assert('cans(a) 达默认配额30(30<30=false)', PersonGraph.cans(s, 'a') === false);

PersonGraph.resetDaily(s);
assert('resetDaily 后 a.act1day=0', s.systems.npcs.records.a.act1day === 0);
assert('resetDaily 后 player.act1day=0', s.player.act1day === 0);
assert('resetDaily 后 cans(a) 恢复', PersonGraph.cans(s, 'a') === true);

for (let i = 0; i < 30; i++) PersonGraph.markActed(s, 'player');
assert('玩家 act4day=30 达上限 cans=false', PersonGraph.cans(s, 'player') === false);

console.log('\nDns.useRelationshipScope =', Dns.useRelationshipScope,
  '| act4day =', Dns.act4day, '| famiAct1dayDefault =', Dns.famiAct1dayDefault);

try {
  require(base + 'world-month.js');
  console.log('PASS world-month.js 注入后加载无语法/依赖错误');
  pass++;
} catch (e) {
  console.log('FAIL world-month.js 加载出错:', e.message);
  fail++;
}

console.log('\n结果: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
