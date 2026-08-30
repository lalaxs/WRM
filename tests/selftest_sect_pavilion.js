'use strict';

const TechniqueContent = require('../content/techniques.js');
const SectPavilionContent = require('../content/sect-pavilion.js');
const SectPavilion = require('../core/sect-pavilion.js');

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

ok(TechniqueContent.get('cloudPiercingSword').sectId === 'taixuan-sword',
  '太玄功法带 sectId');
ok(TechniqueContent.get('stopBleedArt').sectId === 'baicao-valley',
  '百草功法带 sectId');
ok(TechniqueContent.get('stoneBreakingFist').sectId == null,
  '无门派功法无 sectId');
ok(TechniqueContent.listBySect('baicao-valley').length >= 3,
  '可按宗门列出功法');

function model(opts) {
  opts = opts || {};
  return {
    player: {
      realmStage: opts.realmStage == null ? 6 : opts.realmStage,
      techniques: { known: opts.known || {} },
      inventory: { stacks: {} }
    },
    systems: {
      sects: {
        player: {
          sectId: opts.sectId || 'baicao-valley',
          contribution: {
            'baicao-valley': opts.contribution == null ? 80 : opts.contribution
          },
          reputation: { 'baicao-valley': 10 },
          discipleRank: opts.rank || 'disciple',
          lifetimeContribution: opts.lifetime == null ? 80 : opts.lifetime,
          mission: {
            completedMissionIds: opts.missions || ['a', 'b']
          }
        },
        records: {}
      }
    }
  };
}

const deps = {
  pavilion: SectPavilionContent,
  techniques: TechniqueContent
};

const viewOuter = SectPavilion.buildPavilionView(model({ rank: 'disciple' }), deps);
ok(viewOuter.available && viewOuter.rank.id === 'disciple', '弟子可看藏宝阁');
ok(viewOuter.offers.some(function (row) {
  return row.techniqueId === 'stopBleedArt' && row.canBuy;
}), '弟子可兑换止血回元术');
ok(viewOuter.offers.some(function (row) {
  return row.techniqueId === 'medicalMind' && !row.canBuy;
}), '长老功法对弟子锁定');

const bought = SectPavilion.exchangeTechnique(
  model({ rank: 'disciple', contribution: 80 }),
  'stopBleedArt',
  deps
);
ok(bought.ok && bought.learned, '贡献兑换学会功法');
ok(bought.state.systems.sects.player.contribution['baicao-valley'] === 50,
  '扣除贡献');
ok(bought.state.player.techniques.known.stopBleedArt.level === 1,
  '写入已学功法');

const locked = SectPavilion.exchangeTechnique(
  model({ rank: 'disciple', contribution: 200 }),
  'medicalMind',
  deps
);
ok(!locked.ok && locked.code === 'rank_locked', '地位不足不可兑换');

const promoteFail = SectPavilion.promoteDisciple(
  model({
    rank: 'disciple',
    contribution: 10,
    lifetime: 10,
    missions: ['a'],
    realmStage: 0
  }),
  deps
);
ok(!promoteFail.ok && promoteFail.code === 'promotion_locked',
  '条件不足不可晋升');

const promoteOk = SectPavilion.promoteDisciple(
  model({
    rank: 'disciple',
    contribution: 50,
    lifetime: 50,
    missions: ['a', 'b'],
    realmStage: 6
  }),
  deps
);
ok(promoteOk.ok && promoteOk.rankId === 'elder' &&
  promoteOk.state.systems.sects.player.job === 1,
  '满足条件可晋升长老（与 NPC 同职阶）');

const nextGate = SectPavilionContent.nextRank('elder', 'baicao-valley');
ok(nextGate && nextGate.id === 'peak', '百草谷长老下一阶为峰主');

const migrate = SectPavilion.buildPavilionView(
  model({ rank: 'outer', realmStage: 2 }),
  deps
);
ok(migrate.rank.id === 'disciple', '旧档 outer 映射为弟子');

console.log('passed=' + passed + ' failed=' + failed);
process.exit(failed ? 1 : 0);
