'use strict';

const fs = require('node:fs');
const EventContent = require('../content/event-templates.js');
const SectContent = require('../content/sects.js');

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

const templates = EventContent.TEMPLATES;
ok(Array.isArray(templates) && templates.length >= 12,
  '基础事件库至少包含十二个完整模板');
ok(Object.isFrozen(templates) &&
  templates.every(function (template) {
    return Object.isFrozen(template) &&
      Object.isFrozen(template.options);
  }), '事件模板为冻结的纯数据');
ok(new Set(templates.map(function (entry) {
  return entry.id;
})).size === templates.length, '事件模板 ID 全部唯一');
ok(templates.every(function (entry) {
  return Number.isInteger(entry.revision) &&
    entry.revision >= 1 &&
    entry.title.length > 0 &&
    entry.body.length > 0 &&
    entry.cooldownSeconds >= 0 &&
    entry.options.length > 0 &&
    entry.options.every(function (option) {
      return option.id && option.label &&
        Array.isArray(option.effects);
    });
}), '每个模板都有版本、冷却、完整正文和可选项');

const stages = new Set();
templates.forEach(function (template) {
  template.options.forEach(function (option) {
    option.effects.forEach(function (effect) {
      if (effect.type === 'setBondStage') stages.add(effect.stage);
    });
  });
});
ok(['friend', 'lover', 'partner', 'separated'].every(function (stage) {
  return stages.has(stage);
}), '事件可分别建立好友、恋人、伴侣与分开阶段');

const labels = templates.flatMap(function (template) {
  return template.options.map(function (option) { return option.label; });
}).join('|');
ok(['解释', '补偿', '协商', '退出'].every(function (word) {
  return labels.includes(word);
}), '冲突事件提供解释、补偿、协商和退出选项');

const sectChoice = templates.find(function (entry) {
  return entry.id === 'sect-first-choice';
});
const sectIds = new Set();
if (sectChoice) {
  sectChoice.options.forEach(function (option) {
    option.effects.forEach(function (effect) {
      if (effect.type === 'setSect' && effect.sectId) {
        sectIds.add(effect.sectId);
      }
    });
  });
}
ok(sectChoice &&
  SectContent.SECTS.every(function (sect) {
    return sectIds.has(sect.id);
  }) &&
  sectChoice.options.some(function (option) {
    return option.effects.some(function (effect) {
      return effect.type === 'setSect' && effect.sectId === null;
    });
  }), '首次宗门事件包含五宗门与继续散修的选择');

ok(templates.some(function (template) {
  return template.options.some(function (option) {
    return option.effects.some(function (effect) {
      return effect.type === 'startSocialJob' &&
        effect.followupTemplateId &&
        /互寄书信|寻找礼物|准备赴约|论道之日|打听/.test(effect.label);
    });
  });
}), '事件包含具名并行进度与后续模板');
ok(templates.some(function (entry) {
  return entry.category === 'region';
}) && templates.some(function (entry) {
  return entry.scope === 'world';
}), '事件库覆盖地区摘要与世界演变');

const text = fs.readFileSync(
  'content/event-templates.js',
  'utf8'
);
ok(!/TODO|TBD|lorem ipsum/i.test(text),
  '基础事件内容没有占位文本');
ok(!/NPC响应|等待NPC|系统等待|双修|大地图/.test(text),
  '事件文案没有生硬等待、审核敏感词或大地图表述');
function containsExecutable(value) {
  if (typeof value === 'function') return true;
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some(function (key) {
    return containsExecutable(value[key]);
  });
}
ok(!containsExecutable(templates),
  '模板记录本身不包含可执行回调');

console.log('\nStage 4 基础事件内容自测：' + passed + ' 通过，' +
  failed + ' 失败');
if (failed) process.exitCode = 1;
