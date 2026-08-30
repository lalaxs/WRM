'use strict';

/**
 * 生成 content/world-event-narratives/*.json（按 type）+ index.json
 * 薄聚合器 content/world-event-narratives.js 若缺失则写入 stub。
 * 手札风只读见闻：白描行为，少写心理；覆盖性格/职位/散修/关系门控。
 */

const fs = require('fs');
const path = require('path');

const PERSONALITIES = [
  'chicheng', 'qingleng', 'rechen', 'shuaituo',
  'zhizhuo', 'renhou', 'jiaojin', 'wenya'
];

const PERSONALITY_NAME = {
  chicheng: '赤诚',
  qingleng: '清冷',
  rechen: '热忱',
  shuaituo: '洒脱',
  zhizhuo: '执着',
  renhou: '仁厚',
  jiaojin: '骄矜',
  wenya: '温雅'
};

const OFFICE_RANKS = [
  'leader', 'honor', 'hall', 'elder',
  'trueDisciple', 'steward', 'inner', 'outer'
];

const ROGUE_TITLES = [
  'mortal-aspirant', 'wandering-rogue', 'market-cultivator',
  'herb-wanderer', 'street-alchemist', 'wandering-sword',
  'forge-guest', 'beast-keeper', 'talisman-guest',
  'jianghu-xia', 'cloud-daoist', 'lone-hermit'
];

const TAGS = [
  'friend', 'close-friend', 'lover', 'partner',
  'mentor', 'blood', 'enemy', 'dao-companion'
];

const SECTS = [
  'taixuan-sword', 'baicao-valley', 'tiangong-pavilion',
  'spirit-beast-mountain', 'qingyin-palace'
];

const rows = [];
let seq = 0;

function add(entry) {
  seq += 1;
  const id = entry.id || (entry.type + '-' + String(seq).padStart(4, '0'));
  rows.push(Object.assign({ id: id, weight: 10 }, entry));
}

function forEachPersonality(fn) {
  PERSONALITIES.forEach(fn);
}

function forEachOfficeRank(fn) {
  OFFICE_RANKS.forEach(fn);
}

// ——— 日常：初遇 / 闲谈 / 赠礼 / 论道 / 切磋 ———

const MEET_GENERIC = [
  '{a}与{b}在{loc}不期而遇，彼此点头致意。',
  '{a}路过{loc}，与{b}擦肩后停下寒暄。',
  '{a}在{loc}寻人，恰遇见{b}，二人略叙近况。',
  '雨歇之后，{a}与{b}在{loc}廊下相遇。',
  '{a}于{loc}市集角落与{b}撞个正着。'
];

const TALK_BY_PERSONALITY = {
  chicheng: [
    '{a}在{loc}与{b}直言近况，谈得畅快。',
    '{a}拉着{b}在{loc}说起近日琐事，毫不遮掩。'
  ],
  qingleng: [
    '{a}在{loc}与{b}对坐片刻，言语不多，却也安然。',
    '{a}与{b}在{loc}静默同行一程，偶有一两句。'
  ],
  rechen: [
    '{a}在{loc}热情招呼{b}，二人谈笑片刻。',
    '{a}替{b}在{loc}张罗座位，闲话家常。'
  ],
  shuaituo: [
    '{a}在{loc}与{b}随口闲聊，说到别处见闻便起身要走。',
    '{a}靠在{loc}栏边，与{b}东拉西扯半晌。'
  ],
  zhizhuo: [
    '{a}在{loc}与{b}细问修行进度，不肯放过一处含糊。',
    '{a}同{b}在{loc}把旧事一件件核对清楚。'
  ],
  renhou: [
    '{a}在{loc}关心起{b}的起居，语气温和。',
    '{a}与{b}在{loc}闲坐，劝对方多歇口气。'
  ],
  jiaojin: [
    '{a}在{loc}与{b}寒暄，举止端整，不多话。',
    '{a}于{loc}见{b}，微微颔首，说了几句场面话。'
  ],
  wenya: [
    '{a}在{loc}与{b}谈起诗文与符意，氛围清雅。',
    '{a}同{b}在{loc}品茶闲叙，言辞有礼。'
  ]
};

const GIFT_BY_PERSONALITY = {
  chicheng: [
    '{a}在{loc}把一包干粮直接塞给{b}，说路上用得着。',
    '{a}在{loc}向{b}递过一柄常用飞剑保养油，笑说别见外。'
  ],
  qingleng: [
    '{a}在{loc}默默将一枚安神符放在{b}案前，转身便走。',
    '{a}于{loc}留给{b}一小瓶清心露，未多解释。'
  ],
  rechen: [
    '{a}在{loc}捧着热乎乎的灵食找到{b}，硬要对方收下。',
    '{a}在{loc}给{b}送来新采的灵果，连声说刚摘的。'
  ],
  shuaituo: [
    '{a}在{loc}随手把游历带回的小玩意丢给{b}，说好玩就留下。',
    '{a}路过{loc}，把半卷残图塞给{b}便继续赶路。'
  ],
  zhizhuo: [
    '{a}在{loc}郑重将一册注解交给{b}，嘱咐按页细读。',
    '{a}于{loc}送给{b}一枚自己打磨多日的护心佩。'
  ],
  renhou: [
    '{a}在{loc}给{b}送上伤药与绷带，叮嘱莫要硬撑。',
    '{a}在{loc}把一篮新药草分给{b}，说家里还有。'
  ],
  jiaojin: [
    '{a}在{loc}命人呈上一份精致礼盒给{b}，仪态从容。',
    '{a}于{loc}赠{b}一枚有宗纹的玉简，称是薄礼。'
  ],
  wenya: [
    '{a}在{loc}向{b}赠一笺手抄清心曲谱，字迹端正。',
    '{a}与{b}在{loc}茶叙后，留下一壶好茶权当薄赠。'
  ]
};

const DEBATE_LINES = [
  '{a}与{b}在{loc}论道，就吐纳次序各执一词。',
  '{a}在{loc}与{b}辩剑意与符意孰先，末了彼此一笑。',
  '{a}同{b}在{loc}推演阵基，石桌上画满粉笔印。',
  '{a}与{b}在{loc}争论丹火文武，引来旁人驻足。',
  '{a}在{loc}向{b}请教一处关窍，二人反复比划。'
];

const SPAR_LINES = [
  '{a}与{b}在{loc}切磋数合，衣袂猎猎。',
  '{a}在{loc}请{b}试剑，两人点到为止。',
  '{a}同{b}于{loc}比拼身法，尘土微起。',
  '{a}与{b}在{loc}对掌三回，各自退开整衣。',
  '{a}在{loc}与{b}以木剑较技，胜负未分。'
];

MEET_GENERIC.forEach(function (template) {
  add({ type: 'meet', actors: 'pair', template: template, weight: 12 });
});

forEachPersonality(function (pid) {
  (TALK_BY_PERSONALITY[pid] || []).forEach(function (template, index) {
    add({
      type: 'talk',
      actors: 'pair',
      personalityAny: [pid],
      template: template,
      weight: 11,
      id: 'talk-' + pid + '-' + (index + 1)
    });
  });
  (GIFT_BY_PERSONALITY[pid] || []).forEach(function (template, index) {
    add({
      type: 'gift',
      actors: 'pair',
      personalityAny: [pid],
      affinityMin: 10,
      template: template,
      weight: 11,
      id: 'gift-' + pid + '-' + (index + 1)
    });
  });
});

DEBATE_LINES.forEach(function (template) {
  add({ type: 'debate', actors: 'pair', affinityMin: -10, template: template });
});
SPAR_LINES.forEach(function (template) {
  add({ type: 'spar', actors: 'pair', affinityMin: -20, template: template });
});

// 关系标签特化：好友/知己/恋人/道侣/师徒/血亲/仇敌
const RELATION_MEET = {
  friend: [
    '{a}在{loc}见到故友{b}，二人执手片刻。',
    '{a}与好友{b}相约在{loc}喝茶，聊到月上。'
  ],
  'close-friend': [
    '{a}与{b}在{loc}并肩而坐，无需多言也觉安心。',
    '{a}把一桩心事只说与{b}听，二人在{loc}低语。'
  ],
  lover: [
    '{a}在{loc}与{b}并肩缓行，指尖偶尔相触。',
    '{a}为{b}在{loc}整理被风吹乱的发丝，神色温柔。'
  ],
  partner: [
    '{a}与道侣{b}在{loc}一同检点行装，彼此照应。',
    '{a}同{b}在{loc}对坐调息，呼吸渐渐同频。'
  ],
  'dao-companion': [
    '{a}与道侣{b}在{loc}合炼一枚护符，火光映面。',
    '{a}在{loc}与{b}分食同一枚丹药，以测药性。'
  ],
  mentor: [
    '{a}在{loc}指点{b}一处关窍，后者连连称是。',
    '{a}命{b}在{loc}重演招式，亲自校正步位。'
  ],
  blood: [
    '{a}与族中亲人{b}在{loc}相逢，询问家中近况。',
    '{a}在{loc}把一封家书交给{b}，嘱托带回。'
  ],
  enemy: [
    '{a}与{b}在{loc}狭路相逢，各自按住兵器。',
    '{a}在{loc}瞥见仇隙未解的{b}，冷冷掠过。'
  ]
};

Object.keys(RELATION_MEET).forEach(function (tag) {
  RELATION_MEET[tag].forEach(function (template, index) {
    add({
      type: tag === 'enemy' ? 'rival' : 'talk',
      actors: 'pair',
      tagAny: [tag],
      template: template,
      weight: 14,
      id: 'rel-' + tag + '-' + (index + 1)
    });
  });
});

const FRIEND_GIFT = [
  '{a}在{loc}把搜罗多日的灵材分一半给好友{b}。',
  '{a}于{loc}为{b}贺突破，送上一壶陈年灵酒。'
];
FRIEND_GIFT.forEach(function (template, index) {
  add({
    type: 'gift',
    actors: 'pair',
    tagAny: ['friend', 'close-friend'],
    affinityMin: 30,
    template: template,
    weight: 13,
    id: 'gift-friend-' + (index + 1)
  });
});

const LOVER_LINES = [
  '{a}与{b}在{loc}小坐，分享同一盏茶。',
  '{a}在{loc}为{b}簪上一支新折的灵花。',
  '{a}同{b}在{loc}看夜市灯火，归时已近子时。'
];
LOVER_LINES.forEach(function (template, index) {
  add({
    type: 'date',
    actors: 'pair',
    tagAny: ['lover', 'partner', 'dao-companion'],
    affinityMin: 40,
    template: template,
    weight: 12,
    id: 'date-lover-' + (index + 1)
  });
});

// ——— 冲突 ———
const QUARREL_LINES = [
  '{a}在{loc}与{b}言语不合，拂袖而去。',
  '{a}同{b}在{loc}为机缘归属争执起来，不欢而散。',
  '{a}在{loc}当众驳回{b}的说法，气氛陡然发僵。',
  '{a}与{b}在{loc}因门规解释不同而起口角。'
];
QUARREL_LINES.forEach(function (template) {
  add({
    type: 'quarrel',
    actors: 'pair',
    affinityMax: 30,
    template: template,
    weight: 11
  });
});

forEachPersonality(function (pid) {
  if (pid === 'jiaojin' || pid === 'zhizhuo' || pid === 'chicheng') {
    add({
      type: 'quarrel',
      actors: 'pair',
      personalityAny: [pid],
      affinityMax: 40,
      template: '{a}性子' + PERSONALITY_NAME[pid] +
        '，在{loc}与{b}谁也不肯退让，终至不欢。',
      weight: 9,
      id: 'quarrel-' + pid + '-1'
    });
  }
});

const RIVAL_LINES = [
  '{a}与{b}在{loc}争抢一缕灵雾，最终各自退让半分。',
  '{a}同{b}在{loc}比试谁先破阵，互不相让。',
  '{a}与{b}于{loc}同求一物，约定三日后再见真章。'
];
RIVAL_LINES.forEach(function (template) {
  add({ type: 'rival', actors: 'pair', template: template, weight: 10 });
});

add({
  type: 'duel',
  actors: 'pair',
  tagAny: ['enemy'],
  affinityMax: -30,
  template: '{a}在{loc}向{b}下了战书，约在演武场一决高下。',
  weight: 8
});
add({
  type: 'duel',
  actors: 'pair',
  tagAny: ['enemy'],
  affinityMax: -40,
  template: '{a}与{b}在{loc}拔剑相向，招招不留情面。',
  weight: 7
});
add({
  type: 'duel',
  actors: 'pair',
  sameSect: true,
  officeRankAny: ['trueDisciple', 'inner'],
  template: '{a}与同门{b}在{loc}因真传名额暗自较劲，终至明面问剑。',
  weight: 8
});

// ——— 援助 ———
const AID_LINES = [
  '{a}在{loc}替{b}出头，化解一场无端纠缠。',
  '{a}见{b}在{loc}受困，上前援手，片刻解开。',
  '{a}把伤药塞给{b}，在{loc}守到对方能走为止。',
  '{a}在{loc}为{b}作证，令旁人不再刁难。'
];
AID_LINES.forEach(function (template) {
  add({
    type: 'aid',
    actors: 'pair',
    affinityMin: 0,
    template: template,
    weight: 11
  });
});

['renhou', 'rechen', 'chicheng'].forEach(function (pid) {
  add({
    type: 'aid',
    actors: 'pair',
    personalityA: [pid],
    template: '{a}路见不平，在{loc}拉了{b}一把，事后也不求回报。',
    weight: 12,
    id: 'aid-' + pid + '-1'
  });
});

add({
  type: 'rescue',
  actors: 'pair',
  statusB: ['injured'],
  template: '{a}在{loc}发现重伤的{b}，就地施针喂药，守至天亮。',
  weight: 9
});
add({
  type: 'rescue',
  actors: 'pair',
  officeRankA: ['hall', 'elder', 'honor'],
  sectAny: ['baicao-valley'],
  statusB: ['injured'],
  template: '{a}以百草谷医术，在{loc}稳住了{b}的伤势。',
  weight: 10
});

// ——— 情爱 ———
add({
  type: 'date',
  actors: 'pair',
  affinityMin: 50,
  tagNone: ['enemy'],
  template: '{a}与{b}相约在{loc}散步，直到坊市打烊。',
  weight: 10
});
add({
  type: 'date',
  actors: 'pair',
  personalityAny: ['rechen', 'wenya'],
  affinityMin: 45,
  template: '{a}在{loc}备了两份点心，专等{b}一起来。',
  weight: 9
});
add({
  type: 'confess_npc',
  actors: 'pair',
  affinityMin: 60,
  tagNone: ['partner', 'enemy'],
  template: '{a}在{loc}向{b}道明心意，语声发紧，却未退避。',
  weight: 7
});
add({
  type: 'confess_npc',
  actors: 'pair',
  personalityA: ['chicheng'],
  affinityMin: 55,
  template: '{a}在{loc}当着{b}的面把话说破，成败听天。',
  weight: 7
});
add({
  type: 'confess_npc',
  actors: 'pair',
  personalityA: ['qingleng'],
  affinityMin: 65,
  template: '{a}在{loc}只留下一句「你知道的」，便把玉佩推到{b}面前。',
  weight: 6
});
add({
  type: 'partner_npc',
  actors: 'pair',
  tagAny: ['lover'],
  affinityMin: 70,
  template: '{a}与{b}在{loc}结下道侣之契，对天立誓同心。',
  weight: 5
});
add({
  type: 'jealousy',
  actors: 'pair',
  tagAny: ['lover', 'partner'],
  personalityAny: ['zhizhuo', 'jiaojin'],
  template: '{a}在{loc}见{b}与旁人说笑过密，当场沉了脸。',
  weight: 7
});
add({
  type: 'breakup',
  actors: 'pair',
  tagAny: ['lover'],
  affinityMax: 35,
  template: '{a}与{b}在{loc}说开了，决定各自修行，不再纠葛。',
  weight: 6
});

// ——— 修炼异变（独角）———
const SECLUSION_ENTER = [
  '{a}在{loc}落下一道禁制，正式闭关。',
  '{a}向左右交代事务后，于{loc}闭门不见客。',
  '{a}在{loc}洞府前贴上「谢客」二字，人影消失。'
];
SECLUSION_ENTER.forEach(function (template) {
  add({
    type: 'seclusion_enter',
    actors: 'solo',
    statusAny: ['seclusion'],
    template: template,
    weight: 10
  });
});

const SECLUSION_EXIT = [
  '{a}于{loc}破关而出，周身气息凝实几分。',
  '{a}推开{loc}洞府石门，闭关告一段落。',
  '{a}在{loc}出关，先去井边洗把脸，神色沉静。'
];
SECLUSION_EXIT.forEach(function (template) {
  add({
    type: 'seclusion_exit',
    actors: 'solo',
    template: template,
    weight: 10
  });
});

add({
  type: 'tribulation',
  actors: 'solo',
  officeRankAny: ['leader', 'honor', 'elder', 'trueDisciple'],
  template: '{a}在{loc}上空引动雷云，开始渡劫。',
  weight: 6
});
add({
  type: 'tribulation',
  actors: 'solo',
  template: '{a}于{loc}荒原独自布阵，迎接下一次天劫。',
  weight: 5
});
add({
  type: 'injured',
  actors: 'solo',
  statusAny: ['injured'],
  template: '{a}自{loc}狼狈归来，衣袍染血，显然遭遇不测。',
  weight: 8
});
add({
  type: 'breakthrough',
  actors: 'solo',
  template: '{a}在{loc}突破成功，周遭灵气为之一空。',
  weight: 8
});
add({
  type: 'breakthrough',
  actors: 'solo',
  officeRankAny: ['trueDisciple', 'hall', 'elder'],
  template: '门中传讯：{a}于{loc}更进一步，同门纷纷道贺。',
  weight: 9
});

// ——— 游历探险 ———
const TRAVEL_START = [
  '{a}打点行装，离开{loc}，踏上游历之路。',
  '{a}在{loc}辞别故人，说要去远方走走。'
];
TRAVEL_START.forEach(function (template) {
  add({
    type: 'travel_start',
    actors: 'solo',
    statusAny: ['travel'],
    personalityAny: ['shuaituo', 'rechen', 'chicheng'],
    template: template,
    weight: 9
  });
});
add({
  type: 'travel_start',
  actors: 'solo',
  statusAny: ['travel'],
  template: '{a}自{loc}启程，背上青布包袱远去。',
  weight: 10
});

const TRAVEL_RETURN = [
  '{a}游历归来，途经{loc}，风尘未洗。',
  '{a}回到{loc}，把见闻三言两语说与留守之人。',
  '{a}自远方返回{loc}，袖中多了一枚陌生令牌。'
];
TRAVEL_RETURN.forEach(function (template) {
  add({
    type: 'travel_return',
    actors: 'solo',
    template: template,
    weight: 11
  });
});

add({
  type: 'travel_return',
  actors: 'pair',
  template: '{a}结束游历，在{loc}遇见{b}，把半路上的奇遇说与对方听。',
  weight: 10
});

add({
  type: 'explore',
  actors: 'solo',
  statusAny: ['exploring'],
  template: '{a}深入{loc}险地，身影很快被雾气吞没。',
  weight: 8
});
add({
  type: 'explore',
  actors: 'pair',
  statusAny: ['exploring'],
  template: '{a}与{b}结伴探入{loc}，约定以符火为号。',
  weight: 8
});
add({
  type: 'missing',
  actors: 'solo',
  statusAny: ['missing'],
  template: '{a}自{loc}一别后再无音讯，有人疑其失踪。',
  weight: 6
});
add({
  type: 'found',
  actors: 'pair',
  template: '{a}在{loc}寻回失联多日的{b}，两人相对无言。',
  weight: 6
});

// ——— 门派职位 ———
const OFFICE_RANK_TITLE_HINT = {
  leader: '掌门位相关事务',
  honor: '名号位的风评',
  hall: '堂主司主职司',
  elder: '长老议事',
  trueDisciple: '真传弟子课业',
  steward: '执事杂务',
  inner: '内门修习',
  outer: '外门勤务'
};

forEachOfficeRank(function (rank) {
  add({
    type: 'office_duty',
    actors: 'solo',
    officeRankAny: [rank],
    sameSect: true,
    template: '{a}在{loc}处理' + OFFICE_RANK_TITLE_HINT[rank] + '，直至夜深。',
    weight: 8,
    id: 'office-duty-' + rank
  });
});

add({
  type: 'office_appoint',
  actors: 'pair',
  officeRankA: ['leader', 'elder'],
  officeRankB: ['inner', 'outer', 'trueDisciple', 'steward'],
  sameSect: true,
  template: '{a}在{loc}当众宣布，擢升{b}担当新职，门人称贺。',
  weight: 7
});
add({
  type: 'office_appoint',
  actors: 'solo',
  officeRankAny: ['steward', 'trueDisciple', 'hall'],
  template: '{a}于{loc}受命新职，接过令牌与名册。',
  weight: 7
});
add({
  type: 'office_promote',
  actors: 'solo',
  officeRankAny: ['inner', 'trueDisciple', 'steward'],
  template: '{a}因功在{loc}得晋升，门墙之上多了一道新名。',
  weight: 7
});
add({
  type: 'office_challenge',
  actors: 'pair',
  sameSect: true,
  officeRankAny: ['trueDisciple', 'hall', 'steward'],
  template: '{a}在{loc}向{b}所任之职发起挑战，依门规比试。',
  weight: 6
});
add(    {
      type: 'office_challenge',
      actors: 'pair',
      sameSect: true,
      sectAny: ['taixuan-sword'],
      template: '{a}于{loc}太玄演武场向{b}问剑争席，剑光如雪。',
      weight: 7
    });
add({
  type: 'office_vacancy',
  actors: 'solo',
  officeRankAny: ['honor', 'hall', 'elder'],
  template: '门中传开：{loc}一侧要职暂无人选，{a}亦被提及。',
  weight: 5
});
add({
  type: 'office_abdicate',
  actors: 'pair',
  officeRankA: ['leader', 'hall', 'elder'],
  template: '{a}在{loc}当众卸任，将印信交到{b}手中。',
  weight: 5
});
add({
  type: 'sect_join',
  actors: 'pair',
  eitherRogueA: true,
  officeRankB: ['elder', 'leader', 'steward', 'trueDisciple'],
  template: '{a}在{loc}拜入门墙，由{b}指引去外门报备。',
  weight: 7
});
add({
  type: 'sect_leave',
  actors: 'solo',
  template: '{a}在{loc}交出令牌，请辞出门，从此云游。',
  weight: 5
});
add({
  type: 'sect_leave',
  actors: 'pair',
  sameSect: true,
  template: '{a}向{b}说明去意，在{loc}办完出宗手续。',
  weight: 5
});

// 五宗风味
const SECT_FLAVOR = {
  'taixuan-sword': [
    {
      type: 'spar',
      template: '{a}与{b}在{loc}以剑论交，剑意激荡。',
      weight: 12
    },
    {
      type: 'office_duty',
      actors: 'solo',
      officeSlotAny: ['hall-yanwu'],
      template: '{a}于演武堂主持剑试，{loc}人声鼎沸。',
      weight: 9
    },
    {
      type: 'talk',
      officeSlotAny: ['honor'],
      template: '有人见剑仙{a}在{loc}与{b}短暂交谈，语气淡然。',
      weight: 6
    }
  ],
  'baicao-valley': [
    {
      type: 'gift',
      template: '{a}在{loc}把新采灵草分给{b}，嘱咐阴干用法。',
      weight: 12
    },
    {
      type: 'aid',
      template: '{a}在{loc}替{b}诊脉开方，药香弥漫。',
      weight: 11
    },
    {
      type: 'office_duty',
      actors: 'solo',
      officeSlotAny: ['hall-dan'],
      template: '{a}坐镇丹堂，在{loc}盯着炉火一夜未眠。',
      weight: 9
    }
  ],
  'tiangong-pavilion': [
    {
      type: 'debate',
      template: '{a}与{b}在{loc}对着阵盘争论节点排布。',
      weight: 12
    },
    {
      type: 'gift',
      template: '{a}在{loc}把打磨好的器胚交给{b}试手。',
      weight: 11
    },
    {
      type: 'office_duty',
      actors: 'solo',
      officeSlotAny: ['hall-forge'],
      template: '{a}在炼器堂开炉，锤声响彻{loc}。',
      weight: 9
    }
  ],
  'spirit-beast-mountain': [
    {
      type: 'talk',
      template: '{a}与{b}在{loc}一边饲灵一边闲聊兽性。',
      weight: 12
    },
    {
      type: 'aid',
      template: '{a}在{loc}帮{b}安抚暴走的灵兽，好一番手脚。',
      weight: 11
    },
    {
      type: 'office_duty',
      actors: 'solo',
      officeSlotAny: ['hall-beast'],
      template: '{a}巡视兽园，在{loc}清点幼兽数目。',
      weight: 9
    }
  ],
  'qingyin-palace': [
    {
      type: 'talk',
      template: '{a}与{b}在{loc}抚琴清谈，弦音疏朗。',
      weight: 12
    },
    {
      type: 'gift',
      template: '{a}在{loc}赠{b}一沓新裁符纸，香气清淡。',
      weight: 11
    },
    {
      type: 'office_duty',
      actors: 'solo',
      officeSlotAny: ['hall-talisman'],
      template: '{a}于符堂校对名册，{loc}烛火通明。',
      weight: 9
    }
  ]
};

Object.keys(SECT_FLAVOR).forEach(function (sectId) {
  SECT_FLAVOR[sectId].forEach(function (row, index) {
    add(Object.assign({
      actors: row.actors || 'pair',
      sectAny: [sectId],
      sameSect: row.actors === 'solo' ? null : true,
      id: 'sect-' + sectId + '-' + (index + 1)
    }, row));
  });
});

// ——— 散修身份 ———
const ROGUE_FLAVOR = {
  'wandering-sword': [
    '{a}在{loc}以剑换酒，与{b}对酌论招。',
    '{a}于{loc}路遇{b}，拔剑替其解围后便要离开。'
  ],
  'street-alchemist': [
    '{a}在{loc}支起小炉，给{b}炼了一炉救急散。',
    '{a}在{loc}把走方带来的丹样分给{b}试服，嘱咐忌口。'
  ],
  'herb-wanderer': [
    '{a}自山中归来，在{loc}把药草晒开，{b}帮忙翻晒。',
    '{a}教{b}辨认{loc}路边一株易混的毒草。'
  ],
  'forge-guest': [
    '{a}在{loc}坊市接了小活，替{b}修了剑鞘卡扣。',
    '{a}与{b}在{loc}围着残器讨论淬火，火星轻迸。'
  ],
  'beast-keeper': [
    '{a}带着灵兽路过{loc}，与{b}交换饲育心得。',
    '{a}请{b}帮忙看管幼兽片刻，自己去{loc}买粮。'
  ],
  'talisman-guest': [
    '{a}在{loc}案上画符，{b}在一旁研墨。',
    '{a}在{loc}送{b}一张安行符，说山路湿滑用得着。'
  ],
  'jianghu-xia': [
    '{a}在{loc}听说不平事，拉上{b}便要去看一眼。',
    '{a}与{b}在{loc}酒肆听人说书，听到兴处击案。'
  ],
  'cloud-daoist': [
    '{a}在{loc}与{b}谈起云游见闻，语气散淡。',
    '{a}在{loc}赠{b}一枚无名玉简，说是路边捡的机缘。'
  ],
  'lone-hermit': [
    '{a}极少现身，却在{loc}与{b}短暂照面，点头即别。',
    '{a}于{loc}留下半卷残篇给{b}，人已不见。'
  ],
  'wandering-rogue': [
    '{a}与{b}在{loc}交换路引消息，各自赶路。',
    '{a}在{loc}租了个通铺，夜里与{b}闲聊修行难处。'
  ],
  'market-cultivator': [
    '{a}在{loc}摆摊，{b}来议价，两人最终各让一步。',
    '{a}托{b}在{loc}照看摊位，自己去进货。'
  ],
  'mortal-aspirant': [
    '{a}在{loc}向{b}请教最基础的吐纳，听得认真。',
    '{a}买了本入门册，在{loc}拉着{b}问生字。'
  ]
};

Object.keys(ROGUE_FLAVOR).forEach(function (titleId) {
  ROGUE_FLAVOR[titleId].forEach(function (template, index) {
    add({
      type: index === 0 ? 'talk' : 'meet',
      actors: 'pair',
      rogueTitleAny: [titleId],
      template: template,
      weight: 10,
      id: 'rogue-' + titleId + '-' + (index + 1)
    });
  });
});

// ——— 资源争锋 ———
add({
  type: 'treasure',
  actors: 'pair',
  template: '{a}与{b}在{loc}同时发现一缕灵光，互不相让。',
  weight: 8
});
add({
  type: 'treasure',
  actors: 'pair',
  affinityMin: 20,
  template: '{a}在{loc}得一物，分一半给同行的{b}。',
  weight: 8
});
add({
  type: 'market',
  actors: 'pair',
  template: '{a}与{b}在{loc}琳琅摊前议价，最终拍板成交。',
  weight: 9
});
add({
  type: 'market',
  actors: 'solo',
  template: '{a}在{loc}采购一批符纸与矿粉，账房记了一笔。',
  weight: 8
});
add({
  type: 'rare_gift',
  actors: 'pair',
  affinityMin: 55,
  tagAny: ['friend', 'close-friend', 'lover', 'mentor'],
  template: '{a}在{loc}将一件压箱之物赠予{b}，称机缘到了。',
  weight: 6
});

// ——— 生死/生辰 ———
add({
  type: 'imprison',
  actors: 'solo',
  statusAny: ['imprisoned'],
  template: '{a}因触犯门规，被暂押于{loc}侧院思过。',
  weight: 5
});
add({
  type: 'birthday',
  actors: 'pair',
  affinityMin: 25,
  tagAny: ['friend', 'close-friend', 'lover', 'blood', 'mentor'],
  template: '{a}记着生辰，在{loc}为{b}备了一席薄酒。',
  weight: 7
});
add({
  type: 'birthday',
  actors: 'solo',
  template: '有人提及今日是{a}生辰，{loc}一带多了几句贺词。',
  weight: 5
});

// 同门日常补量
const SAME_SECT_EXTRA = [
  '{a}与同门{b}在{loc}一起打扫演武场，边扫边聊。',
  '{a}在{loc}替{b}代值巡夜，换来对方一声道谢。',
  '{a}同{b}在{loc}抄写门规，写到腕酸才歇。',
  '{a}与{b}在{loc}食堂抢到最后一笼灵食，相视大笑。',
  '{a}在{loc}听{b}抱怨课业，只劝对方再撑一旬。'
];
SAME_SECT_EXTRA.forEach(function (template, index) {
  add({
    type: 'talk',
    actors: 'pair',
    sameSect: true,
    template: template,
    weight: 12,
    id: 'same-sect-' + (index + 1)
  });
});

// 性格对撞
const PERSONALITY_PAIR = [
  {
    a: 'qingleng',
    b: 'rechen',
    type: 'talk',
    template: '{a}话少，{b}话多，两人在{loc}竟也聊完了一整壶茶。'
  },
  {
    a: 'jiaojin',
    b: 'chicheng',
    type: 'quarrel',
    template: '{a}讲究体面，{b}口无遮拦，二人在{loc}当众争执起来。'
  },
  {
    a: 'shuaituo',
    b: 'zhizhuo',
    type: 'debate',
    template: '{a}说随缘，{b}说必须有定数，两人在{loc}辩到日落。'
  },
  {
    a: 'renhou',
    b: 'jiaojin',
    type: 'aid',
    template: '{a}在{loc}替{b}解了围，后者嘴上不谢，却把礼金留下。'
  },
  {
    a: 'wenya',
    b: 'chicheng',
    type: 'gift',
    template: '{a}在{loc}送{b}一册诗集，{b}回赠一柄开了刃的小刀，场面微妙。'
  }
];
PERSONALITY_PAIR.forEach(function (row, index) {
  add({
    type: row.type,
    actors: 'pair',
    personalityA: [row.a],
    personalityB: [row.b],
    template: row.template,
    weight: 10,
    id: 'pair-persona-' + (index + 1)
  });
});

// 职位高低互动
add({
  type: 'talk',
  actors: 'pair',
  officeRankA: ['leader', 'elder'],
  officeRankB: ['outer', 'inner'],
  sameSect: true,
  template: '{a}在{loc}巡视时停下，向{b}问了几句功课。',
  weight: 9
});
add({
  type: 'mentor',
  actors: 'pair',
  officeRankA: ['elder', 'hall', 'trueDisciple'],
  officeRankB: ['outer', 'inner'],
  sameSect: true,
  template: '{a}在{loc}收下{b}一拜，约定三日一课。',
  weight: 8
});
add({
  type: 'gift',
  actors: 'pair',
  officeRankA: ['leader', 'honor'],
  sameSect: true,
  template: '{a}在{loc}赏下薄礼，勉励{b}莫负门中栽培。',
  weight: 8
});

// 补大量通用变体，保证池子厚
const GENERIC_POOL = {
  meet: [
    '{a}与{b}在{loc}桥上相遇，侧身让过后又退回来说话。',
    '{a}寻声走到{loc}，发现是{b}在唤灵兽。',
    '{a}在{loc}迷路，向{b}问了方向。',
    '晨雾里，{a}与{b}同时抵达{loc}山门。',
    '{a}从{loc}驿站出来，正撞上{b}投宿。'
  ],
  talk: [
    '{a}与{b}在{loc}聊起天气与灵潮，无甚深意。',
    '{a}在{loc}听{b}讲了一则旧年传闻。',
    '{a}同{b}坐在{loc}台阶上，把鞋底的泥磕掉。',
    '{a}与{b}约在{loc}交换功法笔记中的批注。',
    '{a}在{loc}向{b}打听某位故人下落。'
  ],
  gift: [
    '{a}在{loc}把多余的乾粮分给{b}。',
    '{a}在{loc}送给{b}一枚不起眼的护身符，说是路上买的。',
    '{a}在{loc}塞给{b}两张传送阵余票。',
    '{a}在{loc}把新缝的剑穗送给{b}，颜色朴素。',
    '{a}于{loc}请{b}喝茶，算作薄礼。'
  ],
  debate: [
    '{a}与{b}在{loc}争论「先固本还是先破境」。',
    '{a}在{loc}画地为图，与{b}推演败局三种解法。',
    '{a}同{b}就一本残卷真伪在{loc}辩了半个时辰。'
  ],
  spar: [
    '{a}与{b}在{loc}以竹枝代剑，点到为止。',
    '{a}请{b}在{loc}喂招，专门练防守。',
    '{a}同{b}比拼轻身术，绕着{loc}跑了三圈。'
  ],
  quarrel: [
    '{a}与{b}为谁先入洞府在{loc}吵了起来。',
    '{a}认为{b}坏了规矩，在{loc}当众指责。',
    '{a}同{b}在{loc}因借贷未还会面，言语间刀锋相对。'
  ],
  aid: [
    '{a}替{b}扛回散落的灵材，一路送到{loc}。',
    '{a}在{loc}帮{b}驱散纠缠的低阶妖物。',
    '{a}为{b}作证签名，事情在{loc}衙门口了结。'
  ],
  rival: [
    '{a}与{b}同时盯上{loc}一处灵眼，约定公平竞争。',
    '{a}在榜上见到{b}的名字压过自己，于{loc}沉默不语。'
  ]
};

Object.keys(GENERIC_POOL).forEach(function (type) {
  GENERIC_POOL[type].forEach(function (template, index) {
    add({
      type: type,
      actors: 'pair',
      template: template,
      weight: 8,
      id: 'generic-' + type + '-' + (index + 1)
    });
  });
});

// 独角状态补量
[
  ['seclusion_enter', '{a}在{loc}闭关前烧掉杂书，只留核心几卷。'],
  ['seclusion_enter', '{a}嘱托管事：闭关期间，{loc}一应事务勿扰。'],
  ['seclusion_exit', '{a}出关后先在{loc}吃了一碗热面，才去见人。'],
  ['seclusion_exit', '{a}推门见到{loc}已换了季节，恍如隔世。'],
  ['travel_start', '{a}买好船票，自{loc}码头离去。'],
  ['travel_start', '{a}把钥匙交给邻舍，离开{loc}云游。'],
  ['travel_return', '{a}风尘仆仆回到{loc}，先去报了平安。'],
  ['travel_return', '{a}带回一筐外域果子，在{loc}分给熟识之人。'],
  ['explore', '{a}点起夜明符，独自踏入{loc}深处。'],
  ['injured', '{a}扶墙走在{loc}，每一步都留下血痕。'],
  ['breakthrough', '{a}在{loc}周天圆满，远处有人察觉气机波动。'],
  ['missing', '一连数日，{loc}再不见{a}的踪迹。'],
  ['imprison', '{a}被关在{loc}石室，每日只见一次送饭人。'],
  ['birthday', '{a}生辰无人记得，只在{loc}自己买了碗面。'],
  ['office_duty', '{a}核对完名册，在{loc}盖上今日的印。'],
  ['office_duty', '{a}处理完投诉，于{loc}长长舒了口气。']
].forEach(function (pair, index) {
  add({
    type: pair[0],
    actors: 'solo',
    template: pair[1],
    weight: 8,
    id: 'solo-extra-' + (index + 1)
  });
});

// 大批量补写：地点场景 × 行为骨架
const LOCS_HINT = ['山门', '厢房', '坊市', '林间', '渡口', '丹房外', '剑冢前', '灵田边'];
const ACTIONS_EXTRA = {
  meet: [
    '{a}与{b}在{loc}的{hint}外相遇，彼此一愣。',
    '{a}绕到{loc}{hint}，正看见{b}从另一侧走来。'
  ],
  talk: [
    '{a}拉着{b}到{loc}{hint}避风，说了几句私话。',
    '{a}与{b}倚在{loc}{hint}栏杆上，把近况慢慢道来。'
  ],
  gift: [
    '{a}在{loc}{hint}把一包物件塞给{b}，让对方别推辞。',
    '{a}路过{loc}{hint}，把刚买的糕点分给{b}一半。'
  ],
  spar: [
    '{a}约{b}在{loc}{hint}空地过两招，点到即止。',
    '{a}与{b}在{loc}{hint}比试步法，尘土轻扬。'
  ],
  quarrel: [
    '{a}与{b}在{loc}{hint}争得面红耳赤，旁人不敢劝。',
    '{a}在{loc}{hint}甩袖离去，留下{b}独自站着。'
  ],
  aid: [
    '{a}在{loc}{hint}扶起绊倒的{b}，帮着收拾散落之物。',
    '{a}替{b}挡住来人纠缠，两人从{loc}{hint}脱身。'
  ]
};

Object.keys(ACTIONS_EXTRA).forEach(function (type) {
  ACTIONS_EXTRA[type].forEach(function (skeleton, skIndex) {
    LOCS_HINT.forEach(function (hint, hintIndex) {
      add({
        type: type,
        actors: 'pair',
        template: skeleton.replace(/\{hint\}/g, hint),
        weight: 6,
        id: 'scene-' + type + '-' + skIndex + '-' + hintIndex
      });
    });
  });
});

// 八性格 × 四关系标签的短句扩写
const TAG_SAMPLE = ['friend', 'lover', 'mentor', 'enemy'];
const PERSONA_TAG_LINE = {
  chicheng: {
    friend: '{a}在{loc}拍着{b}肩膀，说有事尽管开口。',
    lover: '{a}在{loc}直白说想多见{b}几面。',
    mentor: '{a}在{loc}把心得和盘托出，教{b}少走弯路。',
    enemy: '{a}在{loc}对着{b}明说：今日的账，今日清。'
  },
  qingleng: {
    friend: '{a}在{loc}只留给{b}一封短信，字迹清淡。',
    lover: '{a}在{loc}静静站在{b}身侧，未说爱字。',
    mentor: '{a}在{loc}点到为止，余下让{b}自己悟。',
    enemy: '{a}在{loc}看了{b}一眼，便别过脸去。'
  },
  rechen: {
    friend: '{a}在{loc}给{b}带了两份热食，生怕对方饿着。',
    lover: '{a}在{loc}拉着{b}的手不肯松，笑意明亮。',
    mentor: '{a}在{loc}手把手改了{b}的姿势，连声鼓励。',
    enemy: '{a}在{loc}仍想劝{b}罢手，话到嘴边又硬了。'
  },
  shuaituo: {
    friend: '{a}在{loc}随口答应帮{b}一个忙，转身就去办。',
    lover: '{a}在{loc}把一朵路边花插到{b}耳后，笑着跑开。',
    mentor: '{a}在{loc}丢给{b}一句「多走走就懂了」。',
    enemy: '{a}在{loc}对{b}摊手：打也行，不打我走。'
  },
  zhizhuo: {
    friend: '{a}在{loc}把答应{b}的事一件件核对完。',
    lover: '{a}在{loc}问{b}可否成约，神色一丝不苟。',
    mentor: '{a}在{loc}要求{b}反复演练，直到不犯错。',
    enemy: '{a}在{loc}记下{b}的话，说他日必有回应。'
  },
  renhou: {
    friend: '{a}在{loc}替{b}挡了闲话，劝对方别放心上。',
    lover: '{a}在{loc}给{b}披上外袍，叮嘱夜里凉。',
    mentor: '{a}在{loc}宽慰受挫的{b}，又补了一课基础。',
    enemy: '{a}在{loc}仍劝{b}和解，被拒绝后轻轻叹气。'
  },
  jiaojin: {
    friend: '{a}在{loc}以礼相待{b}，分寸拿捏得极准。',
    lover: '{a}在{loc}送{b}一枚有署名的玉佩，神情倨傲却认真。',
    mentor: '{a}在{loc}挑剔{b}的仪态，改完才准离开。',
    enemy: '{a}在{loc}对{b}只留一句：「你不配。」'
  },
  wenya: {
    friend: '{a}在{loc}与{b}抚琴共坐，曲终才闲叙。',
    lover: '{a}在{loc}写下一笺短诗，悄悄塞给{b}。',
    mentor: '{a}在{loc}以譬喻讲法，{b}听得入神。',
    enemy: '{a}在{loc}对{b}仍保持礼数，只是话里带刺。'
  }
};

PERSONALITIES.forEach(function (pid) {
  TAG_SAMPLE.forEach(function (tag) {
    const line = PERSONA_TAG_LINE[pid] && PERSONA_TAG_LINE[pid][tag];
    if (!line) return;
    add({
      type: tag === 'enemy' ? 'quarrel' : (tag === 'lover' ? 'date' : 'talk'),
      actors: 'pair',
      personalityAny: [pid],
      tagAny: [tag],
      template: line,
      weight: 11,
      id: 'persona-tag-' + pid + '-' + tag
    });
  });
});

// 职位专属短讯扩写
const OFFICE_LINES = {
  leader: [
    '{a}在{loc}主持小会，敲定本月勤务。',
    '{a}于{loc}签发一纸令，门中传阅。'
  ],
  honor: [
    '{a}现身{loc}片刻，便引来窃窃私语。',
    '有人遥见{a}在{loc}独立，不敢上前打扰。'
  ],
  hall: [
    '{a}在{loc}清点本堂物资，责令补缺。',
    '{a}于{loc}训示属下，言简意赅。'
  ],
  elder: [
    '{a}在{loc}与几位同辈长老议事，直至更鼓。',
    '{a}于{loc}翻阅弟子功过册，朱笔圈点。'
  ],
  trueDisciple: [
    '{a}在{loc}加练不辍，引来外门侧目。',
    '{a}于{loc}代师传话，语气已经老练。'
  ],
  steward: [
    '{a}在{loc}来回奔走，把杂务一件件勾掉。',
    '{a}于{loc}调解两起口角，嗓子都哑了。'
  ],
  inner: [
    '{a}在{loc}完成内门课业，交上功课石。',
    '{a}于{loc}与同侪讨论即将到来的考核。'
  ],
  outer: [
    '{a}在{loc}值守到丑时，换班时揉了揉眼。',
    '{a}于{loc}搬运灵谷，背上湿了一片。'
  ]
};

Object.keys(OFFICE_LINES).forEach(function (rank) {
  OFFICE_LINES[rank].forEach(function (template, index) {
    add({
      type: 'office_duty',
      actors: 'solo',
      officeRankAny: [rank],
      template: template,
      weight: 9,
      id: 'office-line-' + rank + '-' + (index + 1)
    });
  });
});

// 五宗 × 性格 各一条
const SECT_PERSONA = {
  'taixuan-sword': {
    chicheng: '{a}在{loc}把剑穗一抛，约{b}立刻开练。',
    qingleng: '{a}在{loc}独坐剑石，{b}靠近也不多话。'
  },
  'baicao-valley': {
    renhou: '{a}在{loc}熬了一锅公汤，硬拉{b}喝一碗。',
    wenya: '{a}在{loc}与{b}辨药香，说得细密。'
  },
  'tiangong-pavilion': {
    zhizhuo: '{a}在{loc}盯着失败的胚件，拉{b}一起找问题。',
    jiaojin: '{a}在{loc}展示新器，神色矜持地等{b}评价。'
  },
  'spirit-beast-mountain': {
    rechen: '{a}在{loc}把幼兽塞进{b}怀里，笑说你先抱着。',
    shuaituo: '{a}骑着灵兽路过{loc}，朝{b}扬手就走。'
  },
  'qingyin-palace': {
    wenya: '{a}在{loc}教{b}一小节清心曲，指法极稳。',
    qingleng: '{a}在{loc}写符，{b}在侧研墨，两人无话。'
  }
};

Object.keys(SECT_PERSONA).forEach(function (sectId) {
  Object.keys(SECT_PERSONA[sectId]).forEach(function (pid) {
    add({
      type: 'talk',
      actors: 'pair',
      sectAny: [sectId],
      personalityAny: [pid],
      template: SECT_PERSONA[sectId][pid],
      weight: 10,
      id: 'sect-persona-' + sectId + '-' + pid
    });
  });
});

// 输出：按 type 拆 JSON + 薄聚合器（手写薄 js 已存在则只写 JSON）
const outDir = path.join(__dirname, '..', 'content', 'world-event-narratives');
const thinJsPath = path.join(__dirname, '..', 'content', 'world-event-narratives.js');
fs.mkdirSync(outDir, { recursive: true });

const byType = Object.create(null);
rows.forEach(function (row) {
  if (!byType[row.type]) byType[row.type] = [];
  byType[row.type].push(row);
});
const types = Object.keys(byType).sort();
types.forEach(function (type) {
  fs.writeFileSync(
    path.join(outDir, type + '.json'),
    JSON.stringify(byType[type], null, 2),
    'utf8'
  );
});
fs.writeFileSync(
  path.join(outDir, 'index.json'),
  JSON.stringify(types, null, 2),
  'utf8'
);

if (!fs.existsSync(thinJsPath)) {
  const thinStub = `(function (root, factory) {
  'use strict';
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(
    isNode ? require('fs') : null,
    isNode ? require('path') : null,
    isNode ? __dirname : null
  );
  if (isNode) module.exports = api;
  else if (root) root.WorldEventNarrativeContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (fs, pathModule, moduleDir) {
  'use strict';
  // Regenerated stub — prefer the maintained thin loader in repo.
  const BY_TYPE = Object.create(null);
  let NARRATIVES = Object.freeze([]);
  function loadAll() {
    if (!fs || !pathModule || !moduleDir) return;
    const dir = pathModule.join(moduleDir, 'world-event-narratives');
    const index = JSON.parse(fs.readFileSync(pathModule.join(dir, 'index.json'), 'utf8'));
    const merged = [];
    index.forEach(function (type) {
      const rows = JSON.parse(fs.readFileSync(pathModule.join(dir, type + '.json'), 'utf8'));
      BY_TYPE[type] = Object.freeze(rows);
      rows.forEach(function (row) { merged.push(row); });
    });
    NARRATIVES = Object.freeze(merged);
  }
  loadAll();
  return Object.freeze({
    list: function () { return NARRATIVES; },
    listByType: function (type) { return BY_TYPE[type] || []; },
    stats: function () {
      const byType = {};
      Object.keys(BY_TYPE).forEach(function (k) { byType[k] = BY_TYPE[k].length; });
      return { total: NARRATIVES.length, types: Object.keys(BY_TYPE).length, byType: byType };
    }
  });
});
`;
  fs.writeFileSync(thinJsPath, thinStub, 'utf8');
}

const stats = {};
rows.forEach(function (row) {
  stats[row.type] = (stats[row.type] || 0) + 1;
});
console.log('Wrote', rows.length, 'narratives across', types.length, 'types to', outDir);
console.log(JSON.stringify(stats, null, 2));
