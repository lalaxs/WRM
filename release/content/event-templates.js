/*
 * event-templates.js —— 统一事件文案模板（运行时只填占位符）
 * 由 tools/_build_event_templates.js 生成。
 *   - 原版：从 original-event-texts + original-event-slots 编译
 *   - 自研：编辑 content/h5-event-templates.json 后重新生成
 *
 * 占位符：{a}{b}{c}{gift}{young_pet}{pet_form}{linggen}{office}{baby}{sword}{craft}{loc}
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports ? factory() : factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.EventTemplates = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const byId = Object.freeze({
  "0": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在宗门里认识了负责教导自己的师兄{b}。请点击师兄的名字进入他的个人信息页面，在个人信息页面的最上边选择关注他，就可以在主界面看到对他进行行动的人物列表按钮了。"
  },
  "1": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在宗门内接受了教导{b}的任务"
  },
  "2": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在秘境深处捡到了一枚花纹神秘的蛋"
  },
  "3": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}执行宗门任务时和同行的{b}建立了不错的关系"
  },
  "5": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在宗门大课上结识了{b}"
  },
  "7": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在宗门藏书阁里偶然结识了{b}"
  },
  "9": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}结识了同门{b}，他热情的邀请你一起修炼"
  },
  "10": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在宗门内结识了{b}，对其产生了极大的兴趣"
  },
  "11": {
    "source": "original",
    "needs": [
      "a",
      "gift"
    ],
    "template": "{a}在秘境中获得了{gift}"
  },
  "13": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在游历时结识了{b}"
  },
  "14": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}游历时与之结识{b}"
  },
  "15": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在秘境探索时结识了{b}"
  },
  "16": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}于秘境探索时与之结识{b}"
  },
  "17": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在执行宗门任务时结识了{b}"
  },
  "18": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}执行宗门任务时与之结识{b}"
  },
  "19": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在地下拍卖会上结识了{b}"
  },
  "22": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在游历中偶遇强敌，损耗了不少灵气才得以脱身"
  },
  "23": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在与强敌战斗后顿悟，突破几率上升5%"
  },
  "24": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在游历时救了{b}"
  },
  "25": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}被正在游历的{b}救起"
  },
  "26": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在秘境探索时救了{b}"
  },
  "27": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}被正在探索秘境的{b}所救"
  },
  "28": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在执行宗门任务时救了{b}"
  },
  "29": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}被正在执行宗门任务的{b}所救"
  },
  "30": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在地下拍卖场救了{b}"
  },
  "31": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在地下拍卖场陷入危险，被"
  },
  "32": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在游历中被{b}一见钟情，请求结为道侣，是否同意？一见钟情，在他的百般请求下，与之结为了道侣。极为高兴，突破几率增加10%"
  },
  "33": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}一见钟情，纵然他的百般请求，{b}依然毫不犹豫的拒绝了他结为道侣的提议。受到拒绝，心情沮丧，突破率下降5%"
  },
  "34": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}同意了和{b}解除道侣契约。解除契约让两人的灵气都损耗颇多"
  },
  "35": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}虽然同意和{b}解除道侣契约，但看着毫不犹豫离开的背影，内心依然涌起一阵酸涩之情。解除契约让两人的灵气都损耗颇多"
  },
  "36": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}纵然百般不舍，但为了让{b}开心，依然满足了她解除道侣契约的愿望。解除契约让两人的灵气都损耗颇多"
  },
  "37": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}一口拒绝了{b}解除道侣契约的提议，自己的妻子竟然想要离开他这件事让他整个人都变得阴沉了很多"
  },
  "38": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}作为师尊赠与{b}作为道侣大典的礼物。"
  },
  "39": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}其心中苦痛，将礼物放入{b}手中时颤抖的手指与其一触即分，而后却难以抑制的久久回味着那一瞬间肌肤相触的温暖"
  },
  "40": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "gift"
    ],
    "template": "{a}作为父亲赠与{b}{gift}"
  },
  "41": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "gift"
    ],
    "template": "{a}作为母亲赠与{b}{gift}"
  },
  "42": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "gift"
    ],
    "template": "{a}作为友人赠与{b}{gift}"
  },
  "43": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}有人看到{b}在远远的地方望着盛大的道侣大典，久久没有离去"
  },
  "44": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}作为弟子参加了师尊{b}的道侣大典，其掩盖住自己发红的双眼，默默看着大典上觥筹交错的喧闹，只觉得自己已经不在人间"
  },
  "45": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}并没有出席{b}的道侣大典，只派傀儡遥遥送去了祝福的语句"
  },
  "46": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}出席了{b}的道侣大典，其一个人坐在角落，静静的饮酒，静静的醉去"
  },
  "47": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "gift"
    ],
    "template": "{a}作为弟子赠与{b}{gift}"
  },
  "48": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}。其心中酸涩，提前背好的祝福之语哽在喉中许久终未能吐出一字"
  },
  "50": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}虽然心中酸涩，但还是作为友人赠予了"
  },
  "53": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "templates": [
      "{a}遇险，为{b}在游历时所救",
      "{a}遇险，为{b}在秘境探索时所救",
      "{a}遇险，为{b}在执行宗门任务时所救",
      "{a}遇险，为{b}在地下拍卖场所救"
    ]
  },
  "54": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}救了遇险的{b}"
  },
  "55": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}不慎中了情毒，被恰好路过的{b}所救"
  },
  "56": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}舍身救了身中情毒的{b}"
  },
  "57": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}从和{b}一起修炼中获得了点阳气"
  },
  "58": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}和{b}一起修炼而失去了自己的元阳。"
  },
  "59": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}功体被破，元气大伤，跌落一个小境界"
  },
  "60": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在异兽肆虐的村庄救下了一名叫做{b}的孤儿，其欲拜你为师，是否同意？的孤儿，将之收为了弟子"
  },
  "61": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}的孤儿，其欲拜你为师，但你拒绝了"
  },
  "62": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}岁，村庄被异兽摧毁，被{b}救下后拜其为师"
  },
  "63": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}救下后投入"
  },
  "64": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在秘境探索时遇到{b}，他身中情毒失去理智，你为了自身安全只好勉为其难的帮他解了毒"
  },
  "65": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在秘境深处身中情毒失去理智，{b}为了自身安全勉为其难的为其解了毒"
  },
  "66": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "c"
    ],
    "template": "{a}在游历时偶然撞破{b}对{c}下了情毒意图不轨的现场，赶走{c}后{b}依然神志不清，{a}只好勉为其难的为其解了毒"
  },
  "67": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}，他身中情毒奄奄一息，拼着最后一丝清明要求你速速离开，是否帮他解毒？{b}，他身中情毒奄奄一息，拼着最后一丝清明要求你速速离开，你最终决定舍身救他"
  },
  "68": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，他身中情毒奄奄一息，拼着最后一丝清明要求你速速离开，你犹豫后选择了离开"
  },
  "69": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在秘境深处身中情毒，为{b}所救"
  },
  "70": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在秘境深处身中情毒，筋脉尽断而亡"
  },
  "71": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在秘境深处身中情毒，被偶然路过的{b}所救，两人在离开秘境后结为了道侣"
  },
  "72": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}发现了秘境深处身中情毒的{b}于是舍身相救，两人离开秘境后结为了道侣"
  },
  "73": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}结为了道侣"
  },
  "74": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在秘境深处身中情毒，靠着毅力反复运行心法逼出了毒素，平安度过了此劫"
  },
  "75": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}，他身中情毒奄奄一息，是否帮他解毒？{b}，他身中情毒奄奄一息，你最终决定舍身救他"
  },
  "76": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，他身中情毒奄奄一息，你犹豫后选择了离开"
  },
  "77": {
    "source": "original",
    "needs": [
      "a",
      "sword"
    ],
    "template": "{a}本命剑蕴养出了{sword}"
  },
  "78": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在秘境中不慎中了情毒，被"
  },
  "80": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}拜入宗门"
  },
  "81": {
    "source": "original",
    "needs": [
      "a",
      "young_pet"
    ],
    "template": "{a}温养许久的蛋里竟然孵化出了一只{young_pet}。它对你颇为依恋，主动签订了主仆契约。不过这么小，看这样子，还要等很多年才能化形吧……"
  },
  "82": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}向你请求，若是你未能飞升与天同寿，便请在死前毁掉他，不要让他一个人度过剩下的没有止境的时间"
  },
  "83": {
    "source": "original",
    "needs": [
      "a",
      "pet_form"
    ],
    "template": "{a}的灵宠成功化形为{pet_form}"
  },
  "84": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}温养本命剑的时候和{b}产生了心灵的共鸣，突破几率上升5%"
  },
  "85": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}拔下自己的逆鳞作为礼物，许下和你生生世世的诺言"
  },
  "86": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}为你寻到了万年灵髓，突破率增加5%"
  },
  "88": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}铸造本命剑的材料已经集齐，你当机立断立刻闭关铸造炼化了本命神剑"
  },
  "89": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}请求你炼化了他的凤火，这样不管度过多少轮回，他都能找到你的位置"
  },
  "90": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}用自己的龙气温养了你的身体，令你的武力值全部恢复了"
  },
  "91": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}用他绚丽的凤舞取悦于你，这凝结天地灵气的舞姿令你精神一振，突破几率增加5%"
  },
  "92": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}虽然是早已不会在意生日的修仙者，但{b}看到为其庆生的行动时，神情还是有了一丝触动"
  },
  "93": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}为{b}庆生的举动，令{b}整个人都暖洋洋的"
  },
  "94": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}对于自己破壳的纪念日能够和主人在一起感到极为幸福"
  },
  "96": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}对于能够与主人一起度过自己产生灵智的纪念日非常开心"
  },
  "97": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}试着和{b}增进感情，但对方不为所动"
  },
  "98": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}为自己做了午饭{b}支使弟子"
  },
  "99": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}为自己打扫了院子"
  },
  "100": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}为自己整理了珍藏画册"
  },
  "101": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}为自己酿酒"
  },
  "102": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}剑法{b}教导了弟子，但效果不佳，颇有成效，但其好像根本没有在听，颇有成效，令其灵气增加了少许"
  },
  "103": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}传授了心法"
  },
  "104": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}传授了身法"
  },
  "105": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}告知了如何前往地下拍卖场"
  },
  "106": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}告知了如何获得异性的好感"
  },
  "107": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}告知了秘境的灵植分布"
  },
  "108": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}告知了如何大手大脚的花钱"
  },
  "109": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}注意到弟子{b}似乎不太开心，对其进行了开导"
  },
  "110": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在弟子{b}询问师尊是否永远不会离开他的时候随意的回答了是"
  },
  "111": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}考核了弟子{b}，很是让人满意，进展差强人意"
  },
  "112": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}告诉{b}他可能已经无法和除了以外的人一起修炼了"
  },
  "113": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}告诉{b}他很乐于和{b}一起修炼"
  },
  "114": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}从长久的沉眠中醒来，发现自己的道侣{b}已经另觅他人，一番伤心之后决定放手，去寻找属于自己的人生"
  },
  "115": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}已经另觅他人，而道侣契约也已消散，他内心醋海翻腾，心中决定绝不放手"
  },
  "116": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}向你介绍了身中奇诡情毒的{b}，希望你能用你特别的心法为其解毒，是否帮忙？，你用你独特的心法为其解了毒，赠与你表示感激"
  },
  "117": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，希望你能用你特别的心法为其解毒，你拒绝了这个请求"
  },
  "118": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}共度了一段时光，但并不觉得发生了什么值得记忆的事情"
  },
  "119": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对师尊{b}的爱意无法抑制，小心翼翼的询问是否永远不会离开他，听到『是』的回答后欣喜若狂，夙夜难寐"
  },
  "120": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}做了午饭{b}被师尊支使着"
  },
  "121": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}打扫了院子"
  },
  "122": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}整理了师尊的珍藏画册，画册上的内容令人害羞不已"
  },
  "123": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}酿了酒，师尊的酿酒配方里真的有很多奇怪的东西"
  },
  "124": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}挖出院子里埋的酒，两人一起喝了通宵"
  },
  "125": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}挖出了院子里埋的酒，然后被灌了一大坛酒，醒来后完全记不清发生了什么"
  },
  "126": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}剑法{b}被师尊教导了"
  },
  "127": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}传授了身法"
  },
  "128": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}传授了心法"
  },
  "129": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}告知了如何大手大脚的花钱，不太明白为什么要学习这个"
  },
  "130": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}告知了如何前往地下拍卖场"
  },
  "131": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}告知了如何获得异性的好感，觉得自己并不需要学这个"
  },
  "132": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}告知了秘境的灵植分布"
  },
  "133": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}经历了师尊的考核，{b}被师尊夸奖了被师尊责骂了"
  },
  "134": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在心情不好的时候被师尊{b}开导了，再次感受到了师尊的温柔"
  },
  "135": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}装作心情不好的样子，果然师尊{b}就会来关怀自己，如果师尊能一直只对自己一个人温柔就好了"
  },
  "136": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对自己竟然想要一辈子都和{b}这一个人一起修炼而感到惊讶，试着用语言试探了,内心由于没有得到想要的答复而变得难以平静"
  },
  "137": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}认为{b}是一个不错的一起修炼的对象，于是向她发出了邀请"
  },
  "138": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}被仇家下了奇诡情毒，必须由合欢宗的独特心法才能解毒，经{b}介绍认识了在为自己解毒后赠予作为谢礼"
  },
  "139": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}被仇家下了奇诡情毒，经脉寸断而死"
  },
  "140": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}被仇家下了奇诡情毒，独自运行{b}口授的合欢宗心法，勉强将毒素逼了出去，身心受损颇重，跌落一个小境界"
  },
  "141": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}教会了{b}一些很有趣的东西"
  },
  "142": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}借给了{b}一本很有趣的画册"
  },
  "143": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}给{b}看了一些很有趣的投影石"
  },
  "144": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}带{b}去了一些很有趣的地方"
  },
  "145": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}想要和{b}做一些颇为微妙的事情，被拒绝了"
  },
  "146": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}向你提出结为道侣的请求，是否同意？{b}结为了道侣"
  },
  "147": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}向你提出结为道侣的请求，你拒绝了他"
  },
  "148": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}念及结为道侣后对修炼的帮助，觉得和{b}结为道侣也没什么坏处，于是向她提出了结为道侣的请求，没想到却被拒绝了"
  },
  "149": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}结为道侣也没什么坏处，于是向她提出了结为道侣的请求，意料之中的被接受了"
  },
  "150": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}想要和{b}更加长久的温存，想要成为对{b}更加特殊的人，于是迫不及待的提出了结为道侣的请求，但却被拒绝了"
  },
  "151": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}更加特殊的人，于是迫不及待的提出了结为道侣的请求，终于如愿以偿的获得了能够堂堂正正站在{b}身边的身份"
  },
  "152": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}心中的感情已经无法抑制，迫切的希望获得对于{b}来说独一无二的那个身份，装作平静的提出结为道侣的请求，收到了拒绝的答复之后，埋藏在心底的黑暗感情变得更加汹涌不定"
  },
  "153": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}来说独一无二的那个身份，装作平静的提出结为道侣的请求，得到了回应的那一刻，甜蜜的渴望和独占的欲念混杂在一起令他全身战栗"
  },
  "154": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}他深深的相信着自己和{b}的感情，他笃信着一定也和自己一样想要拥有彼此一生一世，于是微笑着提出了结为道侣的请求，然而却得到了拒绝的答复。『将她锁在自己身边的话就不会再拒绝我了』他的内心深处传来了心魔的低语"
  },
  "155": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}一定也和自己一样想要拥有彼此一生一世，于是微笑着提出了结为道侣的请求，获得肯定的答复后他内心欣喜若狂，表面上却只是不动声色的牵起了{b}的手"
  },
  "156": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}看着{b}对着不是自己的人笑靥如花，无法控制自己的心魔，竟仗着自己的武力高于，将她抓回自己的洞府囚禁了起来"
  },
  "157": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}试图解救{b}却被重伤"
  },
  "158": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}服用了还春丹治疗自己的伤势"
  },
  "159": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}将{b}从的囚禁中解救了出来"
  },
  "160": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "c"
    ],
    "template": "{a}见到{b}与{c}同入同出琴瑟和鸣，心魔横生，竟然对{c}痛下了杀手"
  },
  "161": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}同入同出琴瑟和鸣，心怀妒忌重伤了他"
  },
  "162": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访了{b}，送给{b}一些新的玩具"
  },
  "163": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，说了些最近见到的趣事，"
  },
  "164": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}，顺便为{b}检查了经脉"
  },
  "165": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}，为{b}抚琴一首后飘然而去"
  },
  "166": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}，两人顺便练了一会儿剑"
  },
  "167": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}，顺便给{b}占了一卦，建议其最近不要出门"
  },
  "168": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，进门喝了一盏茶后就匆匆忙忙的离开了"
  },
  "169": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，送了些山中的灵果"
  },
  "170": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，谈了一会时事"
  },
  "171": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}，带了一坛上好的灵酒，两人畅饮了一夜"
  },
  "172": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}寿元已尽，进入沉眠"
  },
  "173": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，被打成重伤"
  },
  "174": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}拒之门外"
  },
  "175": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，带来了新出的灵茶"
  },
  "176": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，带来了特产的点心"
  },
  "177": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}，两人清谈了一日"
  },
  "178": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，讨论了一些功法的理解"
  },
  "179": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}，顺便为{b}治了伤"
  },
  "180": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，将赠与了"
  },
  "181": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}前来拜访，恰好在{b}身边遇到了，三人相谈甚欢"
  },
  "182": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对{b}产生了些许心动"
  },
  "183": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}前来拜访，在{b}身边遇到了，对其极为不满，两人打了一场，各受了些伤"
  },
  "184": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}纸鸢传信给{b}，满纸都写着思念二字"
  },
  "185": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}寄给了{b}一本新出的秘藏图册"
  },
  "186": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，上边写了最近的见闻"
  },
  "187": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，信上还附了一枚压干的小花，说是此花的香味可以助人安眠"
  },
  "188": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}一枚留影球，记录了其最近偶然看到的美景"
  },
  "189": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，上边写了一些剑法的心得"
  },
  "190": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}，上边写的东西{b}完全没看懂"
  },
  "191": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}，随信附了一本陈旧的经卷，附言说读了可以清心静意，{b}用它垫了桌角"
  },
  "192": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，信中还附了一些美丽的羽毛"
  },
  "193": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a},上边写了其搜集来的想要和{b}一起去的地方"
  },
  "194": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，随信附了一些异兽的肉干，味道还挺不错"
  },
  "195": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}似乎是太久没有联系过{b}，对方对你的印象已经开始变淡了，有空去拜访一下吧"
  },
  "196": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}为{b}寄去了一枚美丽的首饰"
  },
  "197": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}寄去了几个做工精巧的摆件"
  },
  "198": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}炼化了本命剑"
  },
  "199": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}因{b}陨落，心境动摇，突破几率减少10%"
  },
  "200": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}陨落，心境动摇，修为掉落一个小境界"
  },
  "201": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}陨落，伤心至极后大彻大悟，突破成功率增加30%"
  },
  "205": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}不知所踪，心境动摇，突破几率减少10%"
  },
  "207": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}被{b}袭击，重伤不治而亡"
  },
  "208": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}对于主人长时间不理自己感到伤心不已"
  },
  "209": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对主人在{b}身上投注过多的注意力而妒火中烧，因而受了伤"
  },
  "210": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}弟子{b}满心期待的询问是否可以和师尊一起修炼，是否同意？一起修炼，得到了肯定的答复"
  },
  "211": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}一起修炼，得到了冷酷的拒绝"
  },
  "212": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "office"
    ],
    "template": "{a}接替{b}成为{office}"
  },
  "213": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}成功飞升到了上界"
  },
  "214": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}成功突破到更高境界"
  },
  "215": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}突破{b}失败"
  },
  "216": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}渡劫失败，险些身死，幸好提前做足了准备，重伤保命"
  },
  "217": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}渡劫失败，不幸陨落"
  },
  "221": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}前来拜访{b}，却正好撞见正在修炼，开心的表示下次修炼的时候可以找他羞窘的离开了勃然大怒，愤而离去"
  },
  "222": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}重伤了{b}逃了出来"
  },
  "223": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}虚与委蛇许久，终于找到{b}松懈的机会逃了出来"
  },
  "224": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}试图从{b}的囚禁中逃跑可是失败了"
  },
  "225": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}给{b}喂了软筋散"
  },
  "226": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}将{b}要喂给自己的软筋散糊弄过去了，身体渐渐恢复了一点力气"
  },
  "227": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}强迫{b}陪他过了生日"
  },
  "228": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}虽然{b}没有回应他，但依然很开心的给过了生日"
  },
  "229": {
    "source": "original",
    "needs": [
      "a",
      "gift",
      "b"
    ],
    "template": "{a}将{gift}作为生日礼物赠与{b}"
  },
  "230": {
    "source": "original",
    "needs": [
      "b",
      "gift"
    ],
    "template": "弟子{b}将{gift}作为生日礼物献给师尊"
  },
  "231": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}玩得很开心"
  },
  "232": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}给{b}买了些点心，这孩子就变得粘人了起来"
  },
  "233": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}偷偷将{b}绊倒，在哭起来之前又立刻抱起来，傻孩子似乎觉得是个温柔的好人"
  },
  "234": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}带着{b}摘了很多野花"
  },
  "235": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}给{b}做了点心，尝了一口就哭了出来"
  },
  "236": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}给{b}穿上了漂亮的小裙子带去逛了街"
  },
  "237": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}表示久闻{b}的大名，很想尝试一下和{b}一起修炼的感觉，是否同意？"
  },
  "238": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拒绝了他的请求{b}"
  },
  "239": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}无法控制自己的心魔，竟下了奇药迷晕"
  },
  "240": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}试了奇怪的药，吃完之后皮肤似乎变好了{b}被"
  },
  "241": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}试了奇怪的药，吃完之后头发好像变多了"
  },
  "242": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}试了奇怪的药，吃完之后全身酸软无力，始作俑者却毫无善后的意思，转身去继续研究新药了"
  },
  "243": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}试了奇怪的药，吃完之后灵气竟然上升了一点"
  },
  "244": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}试了奇怪的药，吃完之后身体变得虚弱了……"
  },
  "245": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}试了奇怪的药，吃完之后失去了嗅觉三天……"
  },
  "246": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}试了奇怪的药，吃完之后突然能够突破别人的禁制听到里边的声音了，持有这种能力待在合欢宗里真的很煎熬……好在一天之后药效就消失了"
  },
  "247": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}试了奇怪的药，吃完之后突然长出了胡子！好不容易让药效消失之后{b}将狠狠揍了一顿"
  },
  "248": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}试了奇怪的药，吃完之后一段时间的嗓音变得柔美动听，{b}想要再来一把却被无情的拒绝"
  },
  "249": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}发现{b}受了伤，顺手为她治疗了一下"
  },
  "250": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}细致的为她全身治疗了一遍"
  },
  "251": {
    "source": "original",
    "needs": [
      "a",
      "gift",
      "b"
    ],
    "template": "{a}炼制了{gift}送给{b}"
  },
  "252": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}一瓶会让皮肤变好的丹药{b}赠送了"
  },
  "253": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}一瓶会让头发变多的丹药"
  },
  "254": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}一瓶会让声音变得动听的丹药"
  },
  "255": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}一瓶些许增加灵气的丹药"
  },
  "256": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对着{b}弹奏了下里巴人"
  },
  "257": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}手把手的教{b}弹了一支曲子"
  },
  "258": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在月下为{b}弹奏了一支曲子"
  },
  "259": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}为{b}弹奏凤求凰的时候，满山的禽鸟都集聚了过来"
  },
  "260": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}听着{b}为自己弹奏的曲子，突然心有所得，突破率增加1%"
  },
  "261": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}被{b}拉着练剑，受了一点轻伤"
  },
  "262": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}探讨剑法，颇被鄙视了一番"
  },
  "263": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}让{b}用了一会他的本命剑"
  },
  "264": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}送了{b}一道自己的剑气用于防身"
  },
  "265": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对于{b}反复来拜会自己的行为并没有阻止"
  },
  "266": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对于{b}这个总是出现在自己面前的女性，意识到她的命轨和自己的有所纠缠，于是决定好好的观察她"
  },
  "267": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}同意了{b}一起外出的邀请"
  },
  "268": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}今日占卜的结果是吉，恰好{b}来邀请一起外出，虽然并不觉得外出有什么意义，但依然同意了这个邀约"
  },
  "269": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拒绝了{b}一起外出的邀请"
  },
  "270": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}今日占卜的结果是大吉，很适合闭关做研究，于是拒绝了一切邀约"
  },
  "271": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}接受了{b}陪她去做宗门任务的请求，但这次任务险象环生，两人都受了轻伤"
  },
  "272": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}今日占卜的结果是凶，不适合用来做自己的事情，姑且就陪{b}出门吧"
  },
  "273": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}接受了{b}陪她去地下拍卖场的请求，但钱没有带够，未能买到想要的东西"
  },
  "274": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}今日占卜的结果是平，所以在{b}差一点钱没有买到想要的东西的时候，并不应该借钱给她"
  },
  "275": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}今日占卜的结果是大吉，和{b}一起出门，应该会有增进感情的作用吧"
  },
  "276": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}今日占卜的结果是小凶，还是不要让{b}待在自己身边为好"
  },
  "277": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}接受了{b}陪她去做宗门任务的请求，虽然这次任务险象环生，但由于的指引，总算是有惊无险"
  },
  "278": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}给{b}占卜的结果是大凶，最终决定自己亲自陪她去应付接下来的风险"
  },
  "279": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}接受了{b}陪她去地下拍卖场的请求，今日的运气似乎特别好，想买的东西全都买到了"
  },
  "280": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}给{b}占卜今日外出的结果是小凶，只好在背地里将可能会妨碍她的人都打了一顿……"
  },
  "281": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}赠送了{b}自己写的辟雷符"
  },
  "282": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}多次拜会{b}，但他每次都只是坐在那里默默诵经"
  },
  "283": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}使用仙灵延寿丹增加了寿元"
  },
  "284": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}使用九转还魂丹复活"
  },
  "287": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}终于决定放下已逝的道侣{b}，重新开始自己的生活"
  },
  "288": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}前往拜会{b}，却被避而不见"
  },
  "289": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}赠送了{b}一些灵果，却被原封不动的送了回来"
  },
  "290": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}渡劫失败，险些不支，关键时刻{b}挡在了前边，用自己的一身功德为挡下了雷劫"
  },
  "291": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}送了{b}一个清心符，将它扔掉了"
  },
  "292": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}如今整颗心都已经被{b}吸引，完全断了对其他人的心思"
  },
  "293": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对{b}的感情已经到了罔顾生死的境界，他本该就此证道，却无论如何都无法放下对{b}的爱意，道心破碎，下跌一个大境界"
  },
  "294": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}摸尾巴的请求{b}拒绝了"
  },
  "295": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}摸耳朵的请求{b}"
  },
  "296": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}摸自己鳞片的请求{b}"
  },
  "297": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对于{b}总是会想要摸自己身体异于人族的部分的行为感到困惑，觉得人族真是奇怪"
  },
  "298": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在寒冷的夜里，{b}化身原型，将团在其柔软温暖的腹部"
  },
  "299": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在阳光很好的下午，{b}化身原型，盘绕在身周，为她带来清爽的凉意"
  },
  "300": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}大概是换毛季到了，{b}蹭得一身都是毛"
  },
  "301": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}告诉{b}自己的发情期到了，想要和她一起修炼"
  },
  "302": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}半夜将{b}从床上拖起来去看了日出"
  },
  "303": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}凌晨将{b}叫出来锻炼身体"
  },
  "304": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}陪{b}一起去剿除魔修，两人都受了伤"
  },
  "305": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}将自己做任务换来的{b}送给主角"
  },
  "306": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}送给了{b}一箱首饰"
  },
  "307": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}去百宝阁买了很多流仙裙{b}带着"
  },
  "308": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}赏玩了多处美景"
  },
  "309": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}品尝了各地有名的灵食"
  },
  "310": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在巨大的画舫上游玩"
  },
  "311": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}将名贵的花卉送给了{b}"
  },
  "312": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在花前月下耳鬓厮磨之下倾诉了想要和{b}一起修炼的愿望"
  },
  "313": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}除魔卫道之时不慎中了魔修的陷阱，情毒发作意识不清之时，{b}赶到救了他"
  },
  "314": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}将他带到附近的灵泉之中抑制住了毒性"
  },
  "315": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}告诉{b}自己修炼的无情道需要先体会到极致的感情再抛下所有感情，希望可以协助自己证道"
  },
  "316": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}一起游历，却被{b}陷害中了情毒，不得已和{b}一起修炼运行本宗心法解了毒"
  },
  "317": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}午夜梦回之时，{b}静静的抱着落下了眼泪"
  },
  "318": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}无法压抑自己的感情，吐露了对{b}的爱意"
  },
  "319": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}赠送了{b}自己新炼制的"
  },
  "320": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}一起去秘境探索，捡到了一个花纹神秘的蛋"
  },
  "321": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "gift"
    ],
    "template": "{a}与{b}一起去秘境探索，竟然误入了上古大能洞府，获得了{gift}"
  },
  "322": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "gift"
    ],
    "template": "{a}与{b}一起去秘境探索，被异兽攻击掉下了悬崖，悬崖下竟然生长着千年灵草，获得{gift}"
  },
  "323": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "gift"
    ],
    "template": "{a}与{b}一起去地下拍卖场，竟然用很低的价格买到了{gift}"
  },
  "324": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}一起去逛海镇街市，{b}随手买的貌不惊人的小物件竟然是天阶法宝"
  },
  "325": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}闲适的度过了这段时间"
  },
  "326": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "gift"
    ],
    "template": "{a}与{b}一起去拍卖场，{b}买下了{gift}赠与{a}"
  },
  "327": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}一起的时候见到了"
  },
  "328": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}听{b}谈起了"
  },
  "329": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "c"
    ],
    "template": "{a}通过{b}的介绍，{a}结识了{c}"
  },
  "330": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}赠与了{b}"
  },
  "331": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}试图接近{b}，却没能找到什么机会"
  },
  "332": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在和{b}一起修炼的最后，咬破的嘴唇用血在自己的元神上刻下了即使轮回也能找到她的魂契"
  },
  "333": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}欣喜若狂的出现在{b}面前，看到{b}陌生的目光，他收敛了神色，克制的表达了对{b}的心悦之情"
  },
  "334": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在一起时遇到了前来阻止他屠城的{b}，佛子看到今日并没有杀气，合十一礼后转身离去"
  },
  "335": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "gift"
    ],
    "template": "{a}与{b}在一起时看到了{gift}"
  },
  "336": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "gift"
    ],
    "template": "{a}与{b}在一起时遇到了{gift}"
  },
  "337": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在秘境探索时和{b}同时陷入一处幻境，在幻境中两人相互携手度过了一生，幻境破灭的那一刹，仿若大梦一场，身边人再次成为了陌生人"
  },
  "338": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在秘境追随在{b}身后时不慎和{b}同时陷入一处幻境，在幻境中两人相互携手度过了一生，幻境破灭的那一刹，仿若大梦一场，她依然是合欢宗的小妖女，而他已不再是俗世的男人"
  },
  "339": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在不知第多少次被{b}想尽办法的纠缠碰触之后，终于无法抑制内心的爱意，将眼前巧笑倩焉的妖女揽入了怀中"
  },
  "340": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}带着{b}在十天内跨越了半个大陆去观摩剑圣遗址，还嘲笑走得慢"
  },
  "341": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "gift"
    ],
    "template": "{a}与{b}一起去秘境探索，获得了{gift}"
  },
  "342": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}一起去秘境探索，但没有什么收获"
  },
  "343": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}一起养育灵兽，增进了感情"
  },
  "344": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}一起去地下拍卖场，但没看到什么值得一买的东西"
  },
  "345": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}花前月下，赏诗饮酒，增进了感情"
  },
  "346": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}以及{b}一起去秘境探索，在相互配合间增进了感情"
  },
  "347": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}陪{b}执行宗门任务时，身中陷阱中了情毒，不得已帮他解了毒"
  },
  "348": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}陪{b}执行宗门任务，增进了感情"
  },
  "349": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}在游历时遇到了城镇过节的日子，两人一起快乐的过了节"
  },
  "350": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "gift"
    ],
    "template": "{a}与{b}一起去秘境探索，{b}将得到的{gift}作为礼物送给了{a}"
  },
  "351": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}陪{b}执行宗门任务时救下了一个名叫的孩子，将孩子带回了自己宗门"
  },
  "352": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}一起游历，意外看到了壮美的奇景"
  },
  "353": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}一起游历，发现了一些有趣的灵植"
  },
  "354": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}一起游历，在地图上都找不到的小镇里吃到了令人惊异的美食"
  },
  "355": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}一起游历，发现了一处尚未开启的秘境"
  },
  "356": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}一起游历，拯救了一个险些被异兽灭村的小村庄"
  },
  "357": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}前往拜访了{b}，可惜没有找到人"
  },
  "358": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}一起拜访了{b}，大家相谈甚欢，看着的目光似有意动"
  },
  "359": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}前往拜访{b}，双方甫一见面便拔剑相向，受了重伤"
  },
  "360": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}两人都受了重伤"
  },
  "361": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，大家相谈甚欢"
  },
  "362": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}，两人颇不对板，度过了尴尬的一天"
  },
  "363": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}，发现{b}正处于危机之中，于是帮了"
  },
  "364": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}，没想到甫一见面{b}就拔出了剑来，只能制住其行动然后离开"
  },
  "365": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}受了重伤狼狈离去"
  },
  "366": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，度过了愉快的一天"
  },
  "367": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}用还春丹治愈了{b}，其心中感激，好感增加"
  },
  "368": {
    "source": "original",
    "needs": [
      "a",
      "gift",
      "b"
    ],
    "template": "{a}将{gift}赠与{b}，其渡劫死亡率下降，好感增加"
  },
  "369": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}令之突破率提升，其心中感激，好感大幅增加"
  },
  "370": {
    "source": "original",
    "needs": [
      "a",
      "linggen"
    ],
    "template": "{a}洗髓丹令之成为了{linggen}，其心中感激，好感大幅增加"
  },
  "371": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，其好感些微上升"
  },
  "372": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，其灵气和精气获得了恢复，好感增加"
  },
  "373": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，其灵气和精气获得了恢复，好感些微增加"
  },
  "374": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，正是其铸造本命剑所需材料，其心中感激，好感增加"
  },
  "375": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拜访{b}，其好感上升"
  },
  "376": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}被{b}袭击，身受重伤"
  },
  "377": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}每次试着靠近{b}都会被其拔剑相向，只能无功而返"
  },
  "378": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}偷袭{b}，千钧一发之际救下了"
  },
  "379": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}思考良久，决定放下对{b}的仇恨"
  },
  "380": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}放下了对{b}的仇恨"
  },
  "381": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}依然没有放下和{b}的恩怨"
  },
  "382": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}将{b}赠送的礼物拒之门外"
  },
  "383": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}服用了{b}增加了突破成功率"
  },
  "384": {
    "source": "original",
    "needs": [
      "a",
      "linggen"
    ],
    "template": "{a}服用了洗髓丹成为了{linggen}"
  },
  "385": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}终于决定忘记已逝的{b}，放下这段只属于过去的感情"
  },
  "386": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}前来拜访，却看到{b}一起修炼的场面，其怒火中烧，愤而离去"
  },
  "387": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对于{b}身为剑尊却没有领悟破天剑意颇为不满"
  },
  "388": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}身为魔皇却没有身怀真魔血脉感到不满"
  },
  "389": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}质疑{b}身为佛子却不是圣莲化身，不配此位"
  },
  "390": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在剿除魔修时和魔修{b}结下了仇怨"
  },
  "391": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}发生冲突，两人结下了仇怨"
  },
  "392": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}偷袭{b}，令{b}受了伤"
  },
  "393": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}被{b}设计陷害身受重伤，{a}用其保留的证据与{b}交涉获得了赔偿"
  },
  "394": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}被{b}设计陷害身受重伤，{a}用其保留的证据与{b}交涉获得了赔偿"
  },
  "395": {
    "source": "original",
    "needs": [
      "b",
      "c",
      "a"
    ],
    "template": "{b}设计陷害，好在{c}恰在{a}身边救了{a}"
  },
  "396": {
    "source": "original",
    "needs": [
      "b",
      "c",
      "a"
    ],
    "template": "{b}设计陷害，关键时刻{c}及时赶到救了{a}"
  },
  "397": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}设计陷害，身受重伤"
  },
  "398": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}听说了魔修{b}竟然飞升的消息，仰天怒泣『天道不公！』道心动摇，修为跌落一个小境界"
  },
  "399": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}听说了魔修{b}已死的消息，那一日，有人见到其在峰顶酩酊大醉，又哭又笑，仿若将一生压抑的情感都释放了出来"
  },
  "400": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}伏击魔修{b}未能成功身受重伤从此不良于行"
  },
  "401": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}未能成功受了伤"
  },
  "402": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}筹谋良久，终是手刃了魔修{b}，割下头颅的那一刹那，胸中块垒尽消，识海一片清明，突破率增加100%"
  },
  "403": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}筹谋良久，伏击了魔修{b}令其受了伤"
  },
  "404": {
    "source": "original",
    "needs": [
      "a",
      "craft"
    ],
    "template": "{a}炼制出了一炉{craft}"
  },
  "405": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}成功画出了辟雷符"
  },
  "406": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在游历时意外遇到家族后人遭遇危险，救助亲人后，心中少了一些对尘缘的牵挂，突破率增加10%"
  },
  "407": {
    "source": "original",
    "needs": [
      "a",
      "gift"
    ],
    "template": "{a}在秘境探索得到了{gift}"
  },
  "408": {
    "source": "original",
    "needs": [
      "a",
      "gift"
    ],
    "template": "{a}偶入上古大能洞府得到了{gift}"
  },
  "409": {
    "source": "original",
    "needs": [
      "a",
      "gift"
    ],
    "template": "{a}在地下拍卖场买到了{gift}"
  },
  "410": {
    "source": "original",
    "needs": [
      "a",
      "gift"
    ],
    "template": "{a}捡到了{gift}"
  },
  "411": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在炼丹时产生了顿悟，突破成功率增加5%"
  },
  "412": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在弹琴时产生了顿悟，突破成功率增加5%"
  },
  "413": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在练剑时产生了顿悟，突破成功率增加5%"
  },
  "414": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在观星时产生了顿悟，突破成功率增加5%"
  },
  "415": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在超度亡魂时产生了顿悟，突破成功率增加5%"
  },
  "416": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在对月修炼时产生了顿悟，突破成功率增加5%"
  },
  "417": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在修炼时产生了顿悟，突破成功率增加5%"
  },
  "418": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在游历时偶遇强敌，奋力破敌后顿悟，突破成功率+10%"
  },
  "419": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在游历时偶食神果，突破几率+15%"
  },
  "420": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}偶入秘境深处，在生死关头觉醒了上古血脉，由杂灵根变为变异天灵根"
  },
  "421": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}偶入秘境深处，在生死关头觉醒了上古血脉，由杂灵根成为单灵根，并获得了无垢灵体"
  },
  "422": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}偶入秘境深处，在生死关头觉醒了上古血脉，由杂灵根成了为单灵根，并驯服了秘境异火"
  },
  "423": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}无法突破心魔，堕为魔修，正气盟发布了对此人的悬赏令"
  },
  "424": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}无法突破心魔，堕为魔修，走火入魔之时，杀死了他的{b}，正气盟发布了对此人的悬赏令"
  },
  "425": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}杀死了{b}获得了战利品"
  },
  "426": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}获得了战利品和正气盟的悬赏金"
  },
  "427": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}险些被{b}杀死，关键时刻救下了他"
  },
  "428": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}渡劫失败，险些身死，幸好{b}提前为其准备的法宝发生效力躲过了此劫"
  },
  "429": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}被正道修士围捕受伤，从此不良于行"
  },
  "430": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在剿除魔修时不慎受伤，从此不良于行"
  },
  "431": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}被正道修士围捕身受重伤"
  },
  "432": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在剿除魔修时身受重伤"
  },
  "433": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}无法突破心魔，走火入魔之际，{b}携清心咒将其险险救了回来"
  },
  "434": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在秘境偶然发现了颜色奇异的温泉，浸泡后身上沉疾尽消，四肢恢复如初"
  },
  "435": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在游历时偶尔了得到一个陈旧吊坠，虽然不知道有什么用，但却有种并不想扔掉的奇异感觉"
  },
  "436": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}之前得到的吊坠内突然发出了人声，自称自己是上古大能的一缕神识，被{b}拾取即是有缘，愿助其在修仙之途上一臂之力，心疑有诈，伸手捏碎了吊坠，那缕神识发出一声咒骂逃逸而去"
  },
  "437": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}拾取即是有缘，愿在修仙之途上助其一臂之力"
  },
  "438": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在吊坠内神识的指引之下寻到了上古灵草，突破率增加5%"
  },
  "439": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}吊坠内的神识竟意图夺舍{b}，所幸为的师尊识破，千钧一发之际劈碎了吊坠，捏灭了这缕邪异的神识"
  },
  "440": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}之前得到的吊坠突有一日自己裂开了，那缕神识也不知所踪"
  },
  "441": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}吊坠内的神识竟意图夺舍{b}，拼命抵抗，千钧一发之际反杀了那缕邪魂，虽然身受重伤，但侥幸逃出一劫"
  },
  "442": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对于生日收到{b}的礼物这件事感到非常高兴"
  },
  "443": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}拼命抵抗却输在毫无准备，终被夺舍"
  },
  "444": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拼命抵抗却没能逃脱，同门赶到时，{b}已经不知所踪"
  },
  "445": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}百年不得突破，原本家族之间联姻的婚约被对方取消。其心境动摇，突破成功率-10%"
  },
  "446": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}百年不得突破，原本家族之间联姻的婚约被对方取消。其心境动摇，怒言三十年河东三十年河西莫欺少年穷，灵气爆发突破成功率增加100%"
  },
  "447": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}百年不得突破，心魔横生，竟意图{b}，在杀死了自己的道侣后，强行突破了一个境界"
  },
  "448": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}神志渐回，举目而望，万念俱灰，自断心脉而死"
  },
  "449": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}为其寻回了治疗身体残缺的灵药"
  },
  "450": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}为了给其寻找治疗身体残缺的灵药身入险地，下落不明"
  },
  "451": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}为了给其寻找治疗身体残缺的灵药被魔修设计，身受重伤"
  },
  "452": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}回来了，却没有寻到灵药"
  },
  "453": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}失踪多年之后，突然又回到了宗门。无人知道其这些年经历了什么。"
  },
  "454": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在外游历时竟遇到了宗门失踪已久的{b}并将之带回"
  },
  "455": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}失踪多年之后，突然回到了宗门并产下一子"
  },
  "456": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}从{b}闭关的石室内发现了失踪已久的，没想到竟是因为求而不得将囚禁了起来。觉察到事情败露后逃入魔域，堕为魔修"
  },
  "457": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在{b}出生"
  },
  "458": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}囚禁了起来"
  },
  "459": {
    "source": "original",
    "needs": [
      "a",
      "baby"
    ],
    "template": "{a}产下一子，起名为{baby}"
  },
  "460": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}心悦于{b}，赠送了"
  },
  "461": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}两情相悦，结为道侣"
  },
  "462": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}以为自己和{b}两情相悦，当可水到渠成的结为一生一世一双人，却被告知其并没有和任何人结为道侣的打算，心中大为受挫，怒而决定断掉这份感情"
  },
  "463": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}告知其并没有和任何人结为道侣的打算，心中大为受挫，突破几率降低5%"
  },
  "464": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}与{b}两情相悦，奈何正邪不两立，这天下间并无能容得下一个正道修士和魔修在一起的地方，两人只有私下偷偷见面，执手相泣"
  },
  "465": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}和师尊{b}日夜相对，渐生情愫，但碍于师徒身份无法相爱，突破几率减少10%"
  },
  "466": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}和弟子{b}"
  },
  "467": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}本对{b}心怀爱慕，一日在山下见到魔修残害无辜，杀遍这些魔修之后，当年拜入宗门时定要一生铲除妖邪的誓言仿若洪钟大吕在耳边响起，立时迷途知返，放下了这本不该存在的感情，胸中豁然，突破几率增加30%"
  },
  "468": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对{b}心怀爱慕，奈何正邪有别，心中黯然，突破几率减少5%"
  },
  "469": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}一厢情愿的爱上了自己的师尊{b}，这般禁忌感情却无法宣之于口，内心苦痛，突破几率减少10%"
  },
  "470": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}一厢情愿的爱上了自己的徒弟"
  },
  "471": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在{b}和别人结为道侣后，辗转反侧，日夜煎熬，终成心魔。竟突有一日掳走了，遁入魔域，成为魔修"
  },
  "472": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在{b}和别人结为道侣后，辗转反侧，日夜煎熬，突破率减少5%"
  },
  "473": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}长期冷落道侣{b}，提出了解除道侣契约"
  },
  "474": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}提出了解除道侣契约，{b}看着毫不犹豫的离开自己的背影，心中隐隐涌出后悔的酸楚"
  },
  "475": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}看着{b}温柔教导自己的身影，不禁心如鹿撞"
  },
  "476": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在长时间照顾{b}的过程中被的性格所深深吸引"
  },
  "477": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对师尊说了{b}私下违反戒律的事情，被师尊惩罚，受了轻伤"
  },
  "478": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}带着{b}在凡人界玩耍了一天"
  },
  "479": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}修习了一天的法诀"
  },
  "480": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}为{b}治疗了身上的旧伤"
  },
  "481": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}将{b}约至奇景之处，两人相处甚谐，在阵阵琴音之中，感受到了些许境界动摇，突破成功率增加1%"
  },
  "482": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}约至问剑台畅快的练了一天的剑"
  },
  "483": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}赠与了{b}一张自己写的符篆，据说可挡天雷一击"
  },
  "484": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}到众山深处品尝了外边难得一见的灵果"
  },
  "485": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}一箱华美的衣袍"
  },
  "486": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在凡人界的皇城大大的胡闹了一场"
  },
  "487": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}发现{b}有着一双和亡夫一模一样的眼睛，心中不禁升起了一丝隐隐的渴望"
  },
  "488": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}有着一双和亡妻"
  },
  "489": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对{b}体贴入微关怀备至，赠送了"
  },
  "490": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}被{b}的温柔所打动，心中升起了与之一生一世的想法，却意外得知对方竟只是将自己作为亡夫的替身，怒火中烧，只愿与之一刀两断"
  },
  "491": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}的温柔所打动，心中升起了与之一生一世的想法，却意外得知对方竟只是将自己作为亡妻的替身，怒火中烧，只愿与之一刀两断"
  },
  "492": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}的温柔所打动，心中升起了与之一生一世的想法，于是答应了{b}结为道侣的请求"
  },
  "493": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}将{b}赠与友人"
  },
  "494": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}之间原本颇有些龃龉，但长期宗门内的接触让他们化开了过去的仇怨"
  },
  "495": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在游历时偶尔结队而行，共同和魔修死战的经历令他们冰释前嫌化敌为友"
  },
  "496": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "c"
    ],
    "template": "{a}打上{b}，诬告{c}对其始乱终弃并拿出了证据，为了维护和{b}的关系，{a}对{c}进行了赔偿"
  },
  "497": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}强令{b}结为了道侣"
  },
  "498": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}突然携人打上{b}，声称为其道侣，要求将之交还于。拦住了这些人，魔修们悻悻而退"
  },
  "499": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}未能拦住这些人，{b}为其掳走"
  },
  "500": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "c"
    ],
    "template": "{a}心中爱慕{b}，奈何{b}却对{c}关注有加，其心中嫉恨，本想暗设陷阱令{c}受伤，却在下手的前一刹幡然醒悟，{a}羞愧的看着自己因妒忌而丑陋的姿态，决定放下这段感情"
  },
  "501": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}关注有加，其心中嫉恨，暗设陷阱令{b}受了伤"
  },
  "502": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在外游历时不知所踪，宗门内魂灯未灭，想来至少尚在人间。"
  },
  "503": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在外游历时不知所踪，祖祠内魂灯未灭，想来至少尚在人间。"
  },
  "504": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对{b}一往情深，奈何落花有意流水无情，的心境不稳，突破率降低5%"
  },
  "505": {
    "source": "original",
    "needs": [
      "a",
      "b",
      "gift"
    ],
    "template": "{a}在游历时遇险，被{b}所救，{a}将{gift}作为答谢赠与{b}"
  },
  "506": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}被{b}所救"
  },
  "507": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在和{b}多次接触下深深的为其人格所吸引"
  },
  "508": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对偶尔遇到的{b}一见钟情"
  },
  "509": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在游历途中偶尔救了一个陌生人，对方赠其{b}作为报答"
  },
  "510": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}得到{b}的阳气点"
  },
  "511": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在游历时被异兽追击受了伤"
  },
  "512": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}救助了被异兽肆虐的村庄，在听到村民们的感激之声时突然心有所得，突破成功率增加5%"
  },
  "513": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对道侣{b}竟然囚禁自己的事情不能接受，强行和他解除了道侣契约"
  },
  "514": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}觉得认真的给自己过生日的{b}真的是天底下最好的人"
  },
  "515": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}在秘境探索时和{b}一起跌落深崖，两人相互帮助才得以返回，{a}对{b}的看法比之前好了很多"
  },
  "516": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}得证海王大道，原地飞升"
  },
  "517": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}发生了一些分歧，{b}担心生自己的气，主动用尾巴缠住的腰任她随意抚摸"
  },
  "518": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}跟着{b}，目睹了其的杀人现场"
  },
  "519": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}跟着{b}，看到了其为了一点不悦就杀掉其他魔修吞噬魔气的样子"
  },
  "520": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}看到了{b}养育的魔魇兽，真的很臭……"
  },
  "521": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}带着{b}偷吃了凌霄宗的灵兽"
  },
  "522": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}带着{b}偷薅了药王谷的药草"
  },
  "523": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}带着{b}去看了魔域一望无际的毒花之海"
  },
  "524": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}带着{b}悄悄的去修仙世家家的私库转了一圈"
  },
  "525": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}看着{b}随着接引金光飞升的身影，用只有自己一个人能听到的声音轻声说出『等我』随着接引金光飞升的身影，不知此生是否还能再见，只默默的握紧了拳头随着接引金光飞升的身影，自知此生天人永别，眼眶渐渐红了"
  },
  "526": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}试图给{b}讲经，被扑倒了"
  },
  "527": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}带{b}去看了山巅的桃花林"
  },
  "528": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}为{b}做了晚餐，但是全是素的……"
  },
  "529": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}带{b}去泡了禁地的温泉"
  },
  "530": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}无奈的纵容着{b}各种亲近的行为，心中却绝望的意识到，她这甜美的样子并不可能只对自己一人展现，而自己却连光明正大的站在她身边都不可能"
  },
  "531": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}带{b}去了冥渊河畔，河边寂静无声，唯有迷魂化作的腐萤在空中点点飞舞"
  },
  "532": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}暗示自己为{b}推掉了一桩和通家世族的相亲并向索要更加亲密的奖励"
  },
  "533": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}跟{b}牢骚了一些家的阴私"
  },
  "534": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}和{b}讲了些八大世家间的勾连和龃龉"
  },
  "535": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}从雨中执伞而来，约{b}一起不使用灵气御体，静静的在细雨中散步来感受天地之间的灵气运行"
  },
  "536": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}将手指凑到{b}眼前一晃变出了一朵小花送给{b}，{b}挥手就重复了他的法术，他哭笑不得，依然温柔的将手中的花别到了{b}鬓边"
  },
  "537": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}约{b}在月圆之夜到他的洞府赏月共酌"
  },
  "538": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}带{b}去看了凌霄山上今年的绽放的第一支桃花"
  },
  "539": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}变出一场雪景，陪{b}堆了好几个雪人"
  },
  "540": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}载着{b}御剑而行，看尽一路风景"
  },
  "541": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}探讨剑法，对方虽然表情冷淡，但可以感受到对你剑法的尊敬"
  },
  "542": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}很想看一眼{b}的本命剑，被拒绝了"
  },
  "543": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}指正了{b}对心法的理解，并帮她梳理了经脉中的灵气"
  },
  "544": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}睁开眼睛看到了{b}，他还以为自己尚在梦中，怕她再次从面前消失，伸手将紧紧抱入怀中"
  },
  "545": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}对于素昧平生的{b}花费如此珍贵的丹药救了自己一事极为感激"
  },
  "546": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}说要暂时离开去和十万大山的小兔妖玩耍，{b}微笑着关上门将丢回了床上"
  },
  "548": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}小心翼翼的出现在{b}面前，一边为不记得上一世的自己而又喜又悲，一边又为自己真实的样貌是否还为所喜而忐忑不安"
  },
  "549": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在继任剑尊的仪式上觉醒了破天剑意"
  },
  "550": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在继任佛子的仪式上觉醒了圣莲化身"
  },
  "551": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在继任魔皇的仪式上觉醒了真魔之血"
  },
  "552": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}交流了推汉子的一些心得"
  },
  "553": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}讨论了衣服和妆容的搭配"
  },
  "554": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}议论了一番当前修仙界美男榜的排位"
  },
  "555": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}讨论了胭脂的手作心得"
  },
  "556": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}牢骚了大自在殿的秃驴心如铁石"
  },
  "557": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}向{b}认真的阐述了单身才是最好的理由"
  },
  "558": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}被正道修士围捕身受重伤，醒来后发现自己失去了记忆，虽然被魔域的人找到明白了自己的身份，但过往发生过什么其已经无从追溯"
  },
  "559": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}在剿除魔修时身受重伤，醒来后发现自己失去了记忆，虽然被同伴找到明白了自己的身份，但过往发生过什么其已经无从追溯"
  },
  "560": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}被{b}设计陷害，身受重伤，醒来后发现自己失去了记忆，虽然被同伴找到明白了自己的身份，但过往发生过什么他已经无从追溯"
  },
  "561": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}一日忽然恢复了记忆，回忆起失忆这些日子对{b}的冷待和对他失望的目光，他心如刀绞追悔莫及，迫不及待的找到{b}倾诉了自己如潮水般随着记忆恢复的爱意"
  },
  "562": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}虽然已经不记得自己和{b}的关系，但每次看到她的脸，听到她的声音，都会有一种温暖的感觉沁入心中"
  },
  "563": {
    "source": "original",
    "needs": [
      "a",
      "young_pet"
    ],
    "template": "{a}在游历时救了一只{young_pet}"
  },
  "564": {
    "source": "original",
    "needs": [
      "pet_form",
      "a"
    ],
    "template": "{pet_form}满怀激动的找到了{a}，说要报答当年的救命之恩"
  },
  "565": {
    "source": "original",
    "needs": [
      "young_pet",
      "a"
    ],
    "template": "在尚是一只{young_pet}时为{a}所救"
  },
  "569": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}虽然{b}为他过了生日，但心中并没有任何感觉"
  },
  "570": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}失去了元阳"
  },
  "571": {
    "source": "original",
    "needs": [
      "pet_form",
      "a"
    ],
    "template": "{pet_form}终于化形，想要报答当年的救命恩人{a}，然而{a}却已不在人世，{pet_form}大受打击，心境动摇，突破几率下降10%"
  },
  "572": {
    "source": "original",
    "needs": [
      "a"
    ],
    "template": "{a}却杳无踪迹，无人知道下落，"
  },
  "573": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}本已可以飞升，但贪恋和{b}在一起的时间，强行压制境界留在了下界"
  },
  "574": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}虽然对{b}万般不舍，但已无法压制自己的境界，对{b}反复叮咛后，终是飞升上界"
  },
  "575": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}为{b}治疗了伤势"
  },
  "576": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}探望{b}，送来了"
  },
  "577": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}探望了{b}"
  },
  "578": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}专程前来为{b}治愈了伤势"
  },
  "579": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}从{b}的囚禁中逃脱了出来"
  },
  "580": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}拒绝了{b}外出的邀约"
  },
  "582": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}一日忽然恢复了记忆，庆幸于即使是失去记忆他也会再次爱上{b}，他迫不及待的想要见到{b}向她诉说自己的心情"
  },
  "583": {
    "source": "original",
    "needs": [
      "a",
      "b"
    ],
    "template": "{a}听闻{b}陨落一事，心中并无波澜"
  },
  "h5_demo_confess": {
    "source": "h5",
    "needs": [
      "a",
      "b",
      "loc"
    ],
    "template": "{a}在{loc}对{b}把心意说了出口，话未说尽，却已无法收回"
  }
});

  function entryFor(eventId) {
    if (eventId == null || eventId === '') return null;
    const row = byId[String(eventId)];
    return row && typeof row === 'object' ? row : null;
  }

  function templatesFor(eventId) {
    const row = entryFor(eventId);
    if (!row) return null;
    if (Array.isArray(row.templates) && row.templates.length) {
      return row.templates.slice();
    }
    if (typeof row.template === 'string' && row.template) {
      return [row.template];
    }
    return null;
  }

  function pickTemplate(eventId, random) {
    const list = templatesFor(eventId);
    if (!list || !list.length) return null;
    if (list.length === 1) return list[0];
    const roll = typeof random === 'function' ? random() : Math.random();
    return list[Math.floor(roll * list.length) % list.length];
  }

  function needsPeer(eventId) {
    const row = entryFor(eventId);
    if (!row || !Array.isArray(row.needs)) return false;
    return row.needs.indexOf('b') >= 0 || row.needs.indexOf('c') >= 0;
  }

  function needsGift(eventId) {
    const row = entryFor(eventId);
    if (!row || !Array.isArray(row.needs)) return false;
    return row.needs.indexOf('gift') >= 0;
  }

  function fillTemplate(template, values) {
    if (typeof template !== 'string' || !template) return null;
    const v = values && typeof values === 'object' ? values : {};
    let out = template;
    const re = /{([a-z_]+)}/g;
    let missing = false;
    out = out.replace(re, function (_m, key) {
      const val = v[key];
      if (val == null || val === '') {
        missing = true;
        return '';
      }
      return String(val);
    });
    return missing ? null : out;
  }

  function has(eventId) {
    return !!entryFor(eventId);
  }

  return Object.freeze({
    byId: byId,
    entryFor: entryFor,
    templatesFor: templatesFor,
    pickTemplate: pickTemplate,
    needsPeer: needsPeer,
    needsGift: needsGift,
    fillTemplate: fillTemplate,
    has: has
  });
});
