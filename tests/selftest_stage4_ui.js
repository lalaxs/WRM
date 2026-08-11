'use strict';

const fs = require('fs');

const ui = fs.readFileSync('ui.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const game = fs.readFileSync('game.js', 'utf8');
let pass = 0;
let fail = 0;

function ok(value, message) {
  if (value) {
    pass++;
  } else {
    fail++;
    console.error('  ✗ ' + message);
  }
}

[
  ['事件三页签', /事件摘要[\s\S]*待决策[\s\S]*世界演变/],
  ['事件选项按钮', /event-option-button/],
  ['事件选择命令', /chooseEvent/],
  ['关系搜索', /relationship-search/],
  ['关系排序', /relationship-sort/],
  ['人物列表', /person-list-item/],
  ['双向关系表', /relation-direction/],
  ['八维中文标签', /romanticAttachment:\s*'心动'/],
  ['社交主行动', /startSocial/],
  ['具名并行进度', /named-progress/],
  ['宗门状态', /当前身份：散修/],
  ['五宗门卡片', /sect-card/],
  ['宗门通过事件处理', /加入、离开或更换宗门都通过事件/],
  ['天下地区卡片', /region-card/],
  ['天下人物卡片', /world-person-card/],
  ['天下家族卡片', /family-card/],
  ['天下动态', /world-feed/],
  ['安全共同修炼文案由内容提供', /action\.label/]
].forEach((entry) => ok(entry[1].test(ui), entry[0]));

ok(/min-height:\s*44px/.test(css), '主要页内按钮至少 44px');
ok(/@media \(max-width: 520px\)/.test(css) &&
   /\.relationship-layout[\s\S]*grid-template-columns:\s*1fr/.test(css),
  '窄屏关系页单列堆叠');
ok(/overflow-x:\s*hidden/.test(css), '页面不产生横向滚动');
ok(!/(canvas-map|svg-map|map-coordinate|pan-zoom)/.test(ui),
  '天下页不包含地图交互');
ok(!/(NPC响应|等待NPC|系统等待|双修|大地图)/.test(ui),
  '玩家可见界面没有禁用文案');
ok(!/GameAPI\.(state|data|persist)/.test(ui),
  '界面只使用冻结查询和命令');
ok(/queries:\s*Object\.freeze/.test(game) &&
   /commands:\s*Object\.freeze/.test(game),
  '公开接口边界保持冻结');

console.log(
  '\nStage 4 基础 UI 自测：' + pass + ' 通过 / ' + fail + ' 失败'
);
if (fail) process.exitCode = 1;
