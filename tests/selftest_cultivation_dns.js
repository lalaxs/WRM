'use strict';

const Dns = require('../core/dns.js');
const NpcSimulation = require('../core/npc-simulation.js');

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

ok(typeof Dns.cultivationNeed === 'function', 'Dns.cultivationNeed 存在');
ok(typeof Dns.majorLevel === 'function', 'Dns.majorLevel 存在');
ok(Dns.cultivationNeed(0) === 100, 'Dns 炼气一层需求=100（与玩家同量级）');
ok(Dns.cultivationNeed(8) === 3000, 'Dns 炼气九层需求=3000');
ok(NpcSimulation.realmCultivationNeed(0) === Dns.cultivationNeed(0),
  'NpcSimulation 与 Dns 需求同源');
ok(NpcSimulation.majorLevel(9) === Dns.majorLevel(9),
  'majorLevel 同源');

const person = { realmStage: 2, cultivation: 40 };
Dns.syncLevelAliases(person);
ok(person.level_l === 2 && person.exp1 === 40, 'syncLevelAliases 双写');

const player = {};
Dns.syncPlayerLevelAliases(player, 3, 700);
ok(player.realmStage === 3 && player.level_l === 3 && player.exp1 === 700,
  'syncPlayerLevelAliases 写玩家别名');

ok(Dns.act4day === 30, '玩家 act4day=30');

console.log('\n修炼 Dns 统一自测：' + passed + ' 通过，' + failed + ' 失败');
if (failed) process.exitCode = 1;
