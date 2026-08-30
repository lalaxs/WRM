'use strict';

const SectMissionContent = require('../content/sect-missions.js');
const SectMissions = require('../core/sect-missions.js');
const CombatContent = require('../content/combat.js');

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

function baseModel(realmStage) {
  return {
    player: {
      realmStage: realmStage,
      lingshi: 0,
      inventory: { stacks: {} }
    },
    systems: {
      combat: { progress: { enemyKills: {} } },
      sects: {
        player: {
          sectId: 'baicao-valley',
          contribution: { 'baicao-valley': 0 },
          reputation: { 'baicao-valley': 0 },
          mission: SectMissions.emptyMission()
        }
      }
    }
  };
}

const deps = {
  missions: SectMissionContent,
  combat: CombatContent
};

ok(SectMissionContent.getDeliverFamily('herb').items[0].id === 'garumHerb',
  '药材族包含嘉露草');

ok(SectMissions.scaleAmount(4, 0) === 4, '练气初阶上交量不放大');
ok(SectMissions.scaleAmount(4, 3) === 6, '境界提升后上交量放大');
ok(SectMissions.scaleRewards({ contribution: 10, reputation: 10, lingshi: 10 }, 3)
  .contribution === 14, '奖励随境界放大');

const low = SectMissions.resolveDefinition(
  SectMissionContent.get('baicao-herb-1'),
  SectMissionContent,
  CombatContent,
  0,
  'test:low'
);
ok(low.steps[0].kind === 'deliver' &&
  low.steps[0].acceptIds.indexOf('garumHerb') >= 0 &&
  low.steps[0].acceptIds.indexOf('yaocai') >= 0,
  '药圃任务接受真实药材与旧别名');
ok(low.steps[0].amount === 4, '低境界上交数量为基础值');

const highCombat = SectMissions.resolveDefinition(
  SectMissionContent.get('baicao-hare-1'),
  SectMissionContent,
  CombatContent,
  9,
  'test:high'
);
ok(highCombat.steps[0].kind === 'combat' &&
  highCombat.steps[0].regionId === 'redSandValley',
  '高境界战斗目标切到已解锁区域');

const model = baseModel(0);
model.player.inventory.stacks.garumHerb = 4;
const accepted = SectMissions.acceptMission(
  model,
  'baicao-herb-1',
  { nowSeconds: function () { return 10; } },
  deps
);
ok(accepted.ok, '可接取药圃任务');

const view = SectMissions.buildMissionView(
  accepted.state,
  'baicao-valley',
  deps,
  { nowSeconds: function () { return 10; } }
);
const active = view.active;
ok(active && active.steps[0].have === 4 && active.steps[0].need === 4,
  '持有真实药材计入进度');
ok(active.steps[0].hint.indexOf('采药') >= 0, '任务提示采药来源');

const claimed = SectMissions.claimMission(
  accepted.state,
  { nowSeconds: function () { return 10; } },
  deps
);
ok(claimed.ok && claimed.code === 'mission_complete', '可用嘉露草交付任务');
ok((claimed.state.player.inventory.stacks.garumHerb || 0) === 0,
  '交付后扣除药材');
ok(claimed.state.player.lingshi > 0, '发放灵石奖励');

const filtered = SectMissions.buildMissionView(
  baseModel(0),
  'baicao-valley',
  deps,
  { nowSeconds: function () { return 100; } }
);
ok(filtered.offers.every(function (row) {
  const def = SectMissionContent.get(row.id);
  return def.minRealm <= 0;
}), '低境界看板不出高门槛任务');

const midRewards = SectMissions.resolveDefinition(
  SectMissionContent.get('baicao-herb-1'),
  SectMissionContent,
  CombatContent,
  6,
  'test:mid'
).rewards;
const baseRewards = SectMissionContent.get('baicao-herb-1').rewards;
ok(midRewards.lingshi > baseRewards.lingshi, '中阶境界奖励高于基础');

console.log('passed=' + passed + ' failed=' + failed);
process.exit(failed ? 1 : 0);
