/*
 * dns.js —— 配置总表（对标原版 dns 静态类）
 *
 * 数值来自 global-metadata FieldRVA（见 tools/il2cpp_output/dns-tables-extract.md）。
 * 时间单位例外：H5 用「月≈天」推进，其余 NPC 相关尽量表驱动对标。
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory()
    : factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Dns = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const Dns = {
    daySeconds: 180,

    // —— 配额（dns.init）——
    act4day: 30,
    // fami_act1day[_fami]，metadata 0x48A8B8
    famiAct1day: Object.freeze([
      30, 30, 30, 20, 30, 30, 100, 30, 30,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30
    ]),
    famiAct1dayDefault: 30,

    // jobmax[fami]，metadata 0x48ACE8：限制该家族 job==2（峰主）席位数；0=不走峰主编制。
    // 钉死：fami1→5, fami4→7, fami7→12, fami20→13。
    jobmax: Object.freeze([
      0, 5, 0, 0, 7, 0, 0, 12,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13
    ]),

    // —— 家族 / 条目 ——
    famiYang: Object.freeze([
      2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
    ]),
    fitem: Object.freeze([0, 1, 2, 4, 8, 16, 24, 40, 80]),
    // level_yang / level_feel 共用同一初始化块
    levelYang: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 9]),
    levelFeel: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 9]),

    // —— 修炼节奏（dns.init，反汇编钉死）——
    // level_speed：仅双修 get_exp1s 使用；单人日结 Δ 不乘此表。
    levelSpeed: Object.freeze([
      1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.6
    ]),
    // lg_exp[_lg]，meta 0x48B180：getexps 基数
    lgExp: Object.freeze([180, 150, 130, 100, 90, 80, 70, 60]),
    // dns.exp[level_l]，meta 0x48AB00：突破进度门槛（对 _exp，不是 exp1 条）
    exp: Object.freeze([
      1000, 2180, 8100, 12600, 25200, 64800, 100400, 432000, 2000000, 2000000
    ]),
    // level_exp1max[level_l]：exp1 条上限夹逼，不是突破门槛
    levelExp1max: Object.freeze([
      10, 21, 81, 126, 252, 648, 1004, 4320, 14400, 14400
    ]),
    // H5 细档突破门槛（与 content/realms / REALM_TABLE 同量级；NPC 与玩家共用）
    realmCultivationNeedH5: Object.freeze([
      100, 250, 450, 700, 1000, 1400, 1900, 2500, 3000,
      6000, 15000, 40000, 100000, 250000, 600000, 1500000, 0
    ]),
    // H5 细档突破成功率（与 content/realms TRANSITIONS.baseChance 对齐）
    realmBreakthroughRateH5: Object.freeze([
      1, 1, 1, 1, 1, 1, 1, 1, 0.6,
      0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1
    ]),
    // H5 灵根 id → 原版 _lg（与 content/npc-generation SPIRITUAL_ROOTS 1:1）
    rootLgIndex: Object.freeze({
      'mutant-heaven': 0,
      heaven: 1,
      mutant: 2,
      single: 3,
      dual: 4,
      triple: 5,
      quad: 6,
      mixed: 7,
      // 旧档别名
      metal: 3,
      wood: 3,
      water: 3,
      fire: 3,
      earth: 4,
      'mutant-ice': 2,
      'mutant-thunder': 2,
      waste: 7
    }),
    // waittime / lgr
    waittime: Object.freeze([0.25, 0.5, 1.0, 2.0]),
    lgr: Object.freeze([0.05, 0.1, 0.1, 0.1, 0.1, 0.15, 0.2, 0.2]),
    savetime: Object.freeze([365, 730, 1725, 3650]),

    // npclog 事件 ID 池（metadata 0x48AEA0，170 项）—— doevent 接线用
    npclog: Object.freeze([
      229, 230, 496, 497, 498, 499, 172, 216, 428, 217, 218, 219, 220, 212, 205,
      199, 200, 201, 39, 38, 40, 41, 43, 44, 45, 46, 57, 59, 58, 158, 383, 384,
      198, 287, 385, 387, 388, 389, 390, 391, 398, 399, 400, 401, 402, 403, 394,
      396, 397, 404, 405, 421, 422, 420, 406, 509, 407, 408, 409, 410, 411, 412,
      413, 414, 415, 416, 417, 418, 419, 433, 423, 424, 427, 425, 426, 429, 430,
      431, 432, 434, 435, 436, 437, 438, 439, 440, 441, 443, 444, 445, 446, 447,
      448, 449, 450, 451, 457, 459, 473, 474, 475, 476, 477, 460, 467, 468, 469,
      470, 471, 472, 478, 479, 480, 481, 482, 483, 484, 485, 486, 461, 462, 463,
      465, 466, 464, 498, 499, 469, 497, 500, 501, 503, 502, 504, 493, 494, 495,
      505, 506, 507, 508, 487, 488, 489, 490, 491, 492, 493, 453, 454, 455, 456,
      458, 449, 452, 367, 368, 369, 370, 371, 372, 373, 374, 375, 568, 567, 566,
      558, 559, 560
    ]),

    // H5 五大宗门 → 原版 _fami 下标（开局常用前几族）
    sectFami: Object.freeze({
      'taixuan-sword': 0,
      'baicao-valley': 1,
      'tiangong-pavilion': 2,
      'spirit-beast-mountain': 3,
      'qingyin-palace': 4
    }),
    rogueFami: 20,

    // 原版 _job：0弟子 1长老 2峰主 3掌门 4荣誉。
    // officeSlotId → job；含旧档外门/内门/真传/堂主别名。
    officeJob: Object.freeze({
      disciple: 0,
      elder: 1,
      peak: 2,
      leader: 3,
      honor: 4,
      // 旧 H5 多层席 → 原版 job（读档兼容）
      outer: 0,
      inner: 0,
      true: 0,
      steward: 0,
      hall: 2
    }),
    jobSlot: Object.freeze({
      0: 'disciple',
      1: 'elder',
      2: 'peak',
      3: 'leader',
      4: 'honor'
    }),
    // retjob 峰主编制 fami；掌门型 fami；荣誉 fami（反汇编钉死）
    retjobPeakFami: Object.freeze({ 1: 1, 4: 1, 7: 1, 20: 1 }),
    retjobLeaderFami: Object.freeze({ 2: 1, 3: 1, 5: 1, 6: 1 }),
    retjobHonorFami: Object.freeze({ 4: 1, 6: 1 }),

    // root.mday：月天数表（signuppost1 写入 this+0x148，meta 0x48AA48）。
    // 下标 1..12 = 月；[0] 占位。不是事件 ID 日程——旧文档写错了。
    mday: Object.freeze([
      0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31
    ]),
    // 已废弃：曾误把 mday 当固定事件表。保留开关默认关，防旧测试误开。
    useFixedSchedule: false,

    // dayevent 随机补事件数（对标 randomlevel ≈ 1～2）
    randomlevelMin: 1,
    randomlevelMax: 2,

    useYearBudget: false,
    useMonthlySoftCap: false,
    useNpcYearCap: false,

    // dns.lvup 主行候选（百分比→小数）：按 level_l 0..9
    lvupRate: Object.freeze([
      1.00, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.65
    ]),

    MONTH_REAL_SECONDS: 180,
    MONTHS_PER_YEAR: 12,
    WORLD_EVENT_PER_GAME_YEAR: 36,
    WORLD_EVENT_MONTHLY_SOFT_CAP: 5,
    KNOWN_CIRCLE_RATIO: 0.75,
    SAME_NPC_YEAR_CAP: 3,

    myurl: '',
    offlinePosts: Object.freeze([]),

    // npclog 语言包缺文案的 ID（af 无 eventt；无配方可拼，抽池时应跳过）
    npclogMissingText: Object.freeze([218, 219, 220, 566, 567, 568]),

    pickNpclogId: function (random) {
      const missing = {};
      (Dns.npclogMissingText || []).forEach(function (id) {
        missing[id | 0] = true;
      });
      const pool = (Dns.npclog || []).filter(function (id) {
        return !missing[id | 0];
      });
      if (!pool.length) return null;
      const roll = typeof random === 'function' ? random() : Math.random();
      return pool[Math.floor(roll * pool.length) % pool.length];
    },

    // 对标 root.randomaddlove(person, min, max)：抬爱意，并可能小幅抬独占欲。
    // H5 返回关系增量，由调用方写入 romanticAttachment / jealousy。
    randomAddLove: function (min, max, random) {
      const lo = Number.isFinite(min) ? Math.floor(min) : 1;
      const hi = Number.isFinite(max) ? Math.floor(max) : lo;
      const low = Math.min(lo, hi);
      const high = Math.max(lo, hi);
      const roll = typeof random === 'function' ? random() : Math.random();
      const love = low + Math.floor(roll * (high - low + 1));
      const lustRoll = typeof random === 'function' ? random() : Math.random();
      const lust = lustRoll < 0.35 ? Math.max(1, Math.floor(love / 3)) : 0;
      return Object.freeze({
        romanticAttachment: Math.max(0, love),
        jealousy: lust,
        affection: Math.max(1, Math.floor(love / 2))
      });
    },

    // 对标 root.retjob(tlevel, tfami) → _job。
    // ctx: { peakCount, leaderTaken, honorTaken, random }
    retjob: function (tlevel, tfami, ctx) {
      const level = Math.max(0, Math.floor(Number(tlevel) || 0));
      const fami = Math.max(0, Math.floor(Number(tfami) || 0));
      const opt = ctx || {};
      // 默认：level_l<=5→弟子，>5→长老
      let job = level > 5 ? 1 : 0;

      if (Dns.retjobPeakFami[fami] && level >= 7) {
        const max = (Dns.jobmax[fami] | 0);
        const peakCount = Math.max(0, Math.floor(Number(opt.peakCount) || 0));
        if (max > 0 && peakCount < max) job = 2;
      }

      if (level === 8 && Dns.retjobLeaderFami[fami] && opt.leaderTaken !== true) {
        job = 3;
      }

      if (level === 8 && Dns.retjobHonorFami[fami] && opt.honorTaken !== true) {
        const roll = typeof opt.random === 'function' ? opt.random() : 1;
        // 原版有随机/空位检查；概率未钉死，取保守 25%。
        if (roll < 0.25) job = 4;
      }

      return job;
    },

    slotIdForJob: function (job) {
      const key = String(Math.max(0, Math.floor(Number(job) || 0)));
      return Dns.jobSlot[key] || 'disciple';
    },

    jobForSlotId: function (slotId) {
      if (!slotId || typeof slotId !== 'string') return 0;
      let key = slotId;
      if (key.indexOf('hall') === 0) key = 'hall';
      const job = Dns.officeJob[key];
      return typeof job === 'number' ? job : 0;
    },

    // —— 修炼结算 helper（NPC / 造人共用；玩家需求仍走 content/realms）——
    majorLevel: function (realmStage) {
      const stage = Math.max(0, Math.floor(Number(realmStage) || 0));
      if (stage <= 8) return Math.min(8, stage);
      return Math.min(9, 8 + Math.ceil((stage - 8) / 2));
    },
    // H5：细档门槛与玩家一致；原版 dns.exp 仅作对照保留。
    cultivationNeed: function (realmStage) {
      const table = Dns.realmCultivationNeedH5;
      const stage = Math.max(0, Math.floor(Number(realmStage) || 0));
      const need = table[Math.min(table.length - 1, stage)] | 0;
      return need > 0 ? need : 0;
    },
    // exp1 条上限（展示夹逼；非突破门槛）
    exp1Max: function (realmStage) {
      const table = Dns.levelExp1max;
      const major = Dns.majorLevel(realmStage);
      return table[Math.min(table.length - 1, major)] | 0;
    },
    resolveLgIndex: function (person) {
      if (!person || typeof person !== 'object') return 3;
      if (Number.isFinite(person.lg)) {
        return Math.max(0, Math.min(7, Math.floor(person.lg)));
      }
      if (Number.isFinite(person.linggen)) {
        return Math.max(0, Math.min(7, Math.floor(person.linggen)));
      }
      const rootId = person.spiritualRootId;
      const map = Dns.rootLgIndex;
      if (rootId && map && typeof map[rootId] === 'number') {
        return map[rootId];
      }
      return 3;
    },
    hasPersonTag: function (person, tagId) {
      const tags = person && person.tags;
      if (!tags) return false;
      if (Array.isArray(tags)) return tags.indexOf(tagId) >= 0;
      if (typeof tags.has === 'function') return tags.has(tagId);
      return !!tags[tagId];
    },
    // 对标 person.getexps（原版日 Δ；H5 月≈天 → 每月修为增量；不乘 level_speed）
    getexps: function (person) {
      if (!person || typeof person !== 'object') return 1;
      const expsx = Number.isFinite(person.expsx) ? person.expsx : 1.15;
      const lg = Dns.resolveLgIndex(person);
      const lgVal = Dns.lgExp[lg] || 100;
      let base = expsx * lgVal / 100;
      let m = 1;
      if (Dns.hasPersonTag(person, 2)) m = 1.05;
      if (Dns.hasPersonTag(person, 7)) m += 1;
      if (Dns.hasPersonTag(person, 16)) m += 1;
      if (Dns.hasPersonTag(person, 22)) m += 0.5;
      if (Dns.hasPersonTag(person, 23)) m += 0.5;
      if (Dns.hasPersonTag(person, 25)) m += 0.2;
      let rate = base * m;
      if (Dns.hasPersonTag(person, 15)) rate *= 2;
      const level = Number.isFinite(person.level_l)
        ? person.level_l
        : Dns.majorLevel(person.realmStage);
      rate *= (1 + 0.2 * Math.max(0, level));
      return rate;
    },
    // 每月修为增量（游戏内时间单位是月）
    cultivationPerMonth: function (personOrStage, rootMult, variance) {
      if (personOrStage && typeof personOrStage === 'object') {
        return Dns.getexps(personOrStage);
      }
      const stub = {
        realmStage: personOrStage,
        level_l: Dns.majorLevel(personOrStage),
        expsx: 0.85 + (Number.isFinite(variance) ? variance : 0.5) * 0.55,
        lg: 3
      };
      if (Number.isFinite(rootMult) && rootMult > 0) {
        // 粗映射：efficiencyMult → 邻近 lg 档
        if (rootMult >= 1.5) stub.lg = 0;
        else if (rootMult >= 1.3) stub.lg = 1;
        else if (rootMult >= 1.1) stub.lg = 2;
        else if (rootMult < 0.8) stub.lg = 7;
        else if (rootMult < 0.95) stub.lg = 4;
      }
      return Dns.getexps(stub);
    },
    // 兼容旧调用：每秒 ≈ 每月 getexps / 月秒数
    cultivationPerSecond: function (personOrStage, rootMult, variance) {
      const monthSec = Math.max(30, Number(Dns.MONTH_REAL_SECONDS) || 180);
      return Dns.cultivationPerMonth(personOrStage, rootMult, variance) /
        monthSec;
    },
    breakthroughRate: function (realmStage) {
      const table = Dns.realmBreakthroughRateH5;
      const stage = Math.max(0, Math.floor(Number(realmStage) || 0));
      const rate = table[Math.min(table.length - 1, stage)];
      return Number.isFinite(rate) ? rate : 0.6;
    },
    levelSpeedMult: function (realmStage) {
      const table = Dns.levelSpeed;
      const major = Dns.majorLevel(realmStage);
      const mult = table[Math.min(table.length - 1, major)];
      return Number.isFinite(mult) ? mult : 1;
    },
    syncLevelAliases: function (person) {
      if (!person || typeof person !== 'object') return person;
      const stage = Math.max(0, Math.floor(Number(person.realmStage) || 0));
      person.level_l = Dns.majorLevel(stage);
      person.level_s = stage <= 8 ? stage : ((stage - 9) % 3);
      // H5 cultivation 对齐原版 _exp（突破进度）；exp1 另作别名缓存
      const cult = Number(person.cultivation);
      person.exp = Number.isFinite(cult) ? cult : 0;
      const exps = Dns.getexps(person);
      person.exps = exps;
      // exp1 条：原版日结也会 +=exps 再夹逼；此处同步展示用
      const exp1max = Dns.exp1Max(stage);
      let exp1 = Number(person.exp1);
      if (!Number.isFinite(exp1)) exp1 = Math.min(exp1max, cult || 0);
      person.exp1 = Math.max(0, Math.min(exp1max, exp1));
      return person;
    },
    // 玩家：用 realms 细档 index 双写别名（玩家需求仍走 content/realms）。
    syncPlayerLevelAliases: function (player, realmIndex, cultivation) {
      if (!player || typeof player !== 'object') return player;
      const stage = Math.max(0, Math.floor(Number(realmIndex) || 0));
      player.realmStage = stage;
      player.level_l = Dns.majorLevel(stage);
      player.level_s = stage <= 8 ? stage : ((stage - 9) % 3);
      const cult = Number(cultivation);
      if (Number.isFinite(cult)) {
        player.exp1 = cult;
        player.cultivation = cult;
      }
      return player;
    }
  };

  return Object.freeze(Dns);
});
