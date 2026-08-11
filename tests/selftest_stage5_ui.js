'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ui = fs.readFileSync(path.join(__dirname, '..', 'ui.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const all = fs.readFileSync(path.join(__dirname, 'selftest_all.js'), 'utf8');
const status = fs.readFileSync(
  path.join(__dirname, '..', 'docs', 'BASELINE_IMPLEMENTATION_STATUS.md'),
  'utf8'
);

let passed = 0;
function ok(condition, label) {
  assert.ok(condition, label);
  passed++;
}

ok(
  /queries\.inheritanceHall\(\{\s*section:/.test(ui) &&
    /概览/.test(ui) &&
    /传承方案/.test(ui) &&
    /后代/.test(ui) &&
    /历代/.test(ui),
  '传承殿使用四个基础区块查询并显示生命周期内容'
);
ok(
  /lifespan-card/.test(ui) &&
    /buffer-warning/.test(ui) &&
    /剩余/.test(ui) &&
    /寿元/.test(ui),
  '传承殿显示年龄、剩余寿元和安全缓冲'
);
ok(
  /setInheritancePlan/.test(ui) &&
    /fullMasteryIds/.test(ui) &&
    /techniqueIds/.test(ui) &&
    /equipmentItemIds/.test(ui) &&
    /resourceItemIds/.test(ui),
  '传承方案可保存四类一级传承配置'
);
ok(
  /descendant-card/.test(ui) &&
    /heirEligible/.test(ui) &&
    /lifeStage/.test(ui),
  '后代卡显示年龄阶段与可继承状态'
);
ok(
  /proposeLineageRitual/.test(ui) &&
    /partnerNpcId:\s*detail\.npcId/.test(ui) &&
    /共议传承仪式/.test(ui),
  '正式伴侣详情可发起传承仪式'
);
ok(
  /beginLegacyTransition/.test(ui) &&
    /chooseLegacyRoute/.test(ui) &&
    /updateNewIdentityDraft/.test(ui) &&
    /confirmLegacyTransition/.test(ui) &&
    /cancelLegacyTransition/.test(ui),
  '人生转换面板接通开始、路线、草稿、确认与取消命令'
);
ok(
  /十二项生活技能等级与经验保留；修为与本世临时状态重置/.test(ui) &&
    /pending\.cause === 'voluntary'/.test(ui),
  '人生转换明确保留规则且只有主动流程可取消'
);
[
  '.lifespan-card',
  '.buffer-warning',
  '.inheritance-tabs',
  '.descendant-card',
  '.legacy-route',
  '.legacy-preview'
].forEach(function (selector) {
  ok(styles.includes(selector), selector + ' 样式已提供');
});
ok(
  !/NPC响应|等待NPC|双修/.test(ui),
  'Stage 5 UI 不出现禁用的并行进度措辞'
);
ok(
  all.includes("'selftest_stage5_ui.js'"),
  '全量自测已纳入 Stage 5 UI 静态测试'
);
ok(
  /Stage 5 基础.*已实现/.test(status) &&
    /NPC 死亡、转世与飞升/.test(status) &&
    /传承殿 2–5 级/.test(status) &&
    /浏览器验收/.test(status),
  '状态文档记录 Stage 5 基础完成项与延期项'
);

console.log('Stage 5 UI static self-test passed:', passed);
