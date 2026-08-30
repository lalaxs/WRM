'use strict';

const fs = require('fs');

const ui = require('./ui_scripts').readUiSource();
const css = fs.readFileSync('styles.css', 'utf8');
const game = ['game.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-api.js']
  .map((file) => fs.readFileSync(file, 'utf8')).join('\n');
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
  ['事件统一大事记', /大事记/],
  ['宗门直接选择', /chooseSect/],
  ['关系搜索', /relationship-search/],
  ['关系排序', /relationship-sort/],
  ['魅力技能栏', /skillId:\s*'charm'/],
  ['人物双列卡片', /person-card-grid/],
  ['人物弹窗页签', /信息[\s\S]*经历/],
  ['人物弹窗挂载', /personDetail/],
  ['关系爱心颜色', /heart-affection/],
  ['关系胶囊色系', /rel-affection/],
  ['关系胶囊随数值加深', /relationTagClass\(metricId\) \+ ' ' \+ tones\[tier\]/],
  ['列表最高关系爱心', /topRelationId/],
  ['人物卡片爱心数值', /person-card-heart-value/],
  ['卡片关系括号', /personCardNameText/],
  ['单向关系标签', /relation-tag-list/],
  ['关系层级文案', /形同陌路/],
  ['关系标签色阶', /tone-0/],
  ['弹窗关系无爱心', /relation-tag ' \+ relationTagTone/],
  ['默契评级文案', /毫无默契/],
  ['默契巅峰文案', /默契无间/],
  ['八维中文标签', /romanticAttachment:\s*'心动'/],
  ['社交按钮排版', /social-action-buttons/],
  ['社交按钮耗时', /social-action-btn-time/],
  ['社交详情弹窗', /openSocialDetailModal/],
  ['社交入队命令', /startSocial/],
  ['社交后台队列文案', /后台社交队列/],
  ['社交进度百分比', /还需 ' \+ fmtDur\(progress\.remainingSeconds\) \+ ' · ' \+ pct \+ '%'/],
  ['社交进度条样式', /social-progress-bar/],
  ['开始后关闭人物弹窗', /closePersonDetailModal/],
  ['具名并行进度', /named-progress/],
  ['突破进度条', /person-break-bar/],
  ['名字后胶囊标签', /person-meta-pill/],
  ['好感倾向文案', /倾向：/],
  ['宗门选择卡片', /sect-pick-card/],
  ['宗门加入要求弹窗', /openSectJoinModal/],
  ['宗门退宗按钮', /sect-leave-mini/],
  ['宗门任务三卡', /sect-mission-card-row/],
  ['宗门任务弹窗', /openSectMissionModal/],
  ['宗门任务药材提示', /可交：/],
  ['宗门查询瘦身', /藏宝阁\/成员架构仅弹窗按需查询/],
  ['宗门签名廉价', /禁止对整页 view 深拷贝/],
  ['宗门live禁刷看板', /禁止在 live 循环里调用 refreshSectMissionBoard/],
  ['宗门藏宝阁入口', /openSectPavilionModal/],
  ['宗门藏宝阁兑换', /exchangeSectTechnique/],
  ['宗门退宗确认', /openSectLeaveModal/],
  ['宗门冷却文案', /choiceCooldownLabel/],
  ['宗门藏宝阁网格', /sect-pavilion-grid/],
  ['宗门藏宝阁详情', /openSectPavilionDetailModal/],
  ['宗门架构弹窗保留', /openSectOfficesModal/],
  ['宗门架构下划线名', /sect-office-name-link/],
  ['宗门架构紧凑行', /sect-office-row/],
  ['天下地区卡片', /world-region-card/],
  ['天下地区双列网格', /region-list/],
  ['天下当前位置标识', /world-region-here-badge/],
  ['天下旅行确认弹窗', /travelConfirm/],
  ['天下人物沿用关系卡', /person-card-grid world-people/],
  ['安全共同修炼文案由内容提供', /action\.label/]
].forEach((entry) => ok(entry[1].test(ui), entry[0]));

ok(!/查看宗主、长老、堂主与内外门弟子/.test(ui),
  '宗门名册入口已隐藏');

ok(!/待决策/.test(ui), '界面不再出现待决策');
ok(!/离线摘要/.test(ui), '界面不再出现离线摘要分区');
ok(!/身边动态/.test(ui) && !/天下传闻/.test(ui),
  '界面不再区分身边动态与天下传闻');
ok(/灵枢历/.test(ui) && /event-calendar/.test(ui),
  '大事记以灵枢历年月为锚点');
ok(!/event-offline-reports/.test(ui),
  '事件页不再渲染离线结算列表');
ok(!/chooseEvent/.test(ui) && /chooseSect/.test(game),
  '界面不再调用 chooseEvent，宗门改走 chooseSect');
ok(!/event-option-button/.test(ui), '事件页不再渲染选项按钮');
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
