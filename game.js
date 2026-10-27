'use strict';

const runtimeRoot = typeof globalThis !== 'undefined' ? globalThis : this;

// ============================================================
// 云隐小师妹 · 角色创建流程 + 主界面骨架（TapTap H5 小游戏 · 原生 JS + Canvas2D）
// 设计目标：验证「选部件 → 离屏合成 → 缓存位图 → 每帧只 blit」链路
//            在浏览器 / TapTap H5 容器里都能跑，且帧率、内存可控。
// 资源：NIE/boy、NIE/girl 捏脸素材，由 nie-manifest.js 提供清单。
// 桥接层：所有平台能力走 Platform.*（platform.js，标准 Web API），禁止 tap.* / 沙箱 API。
// ============================================================

// 0. 资源清单（UMD：真机走 require，浏览器垫片走全局 NIE_MANIFEST）
const NIE = (typeof require !== 'undefined')
  ? require('./nie-manifest.js')
  : (typeof NIE_MANIFEST !== 'undefined' ? NIE_MANIFEST : null);

const HairRules = (typeof require !== 'undefined')
  ? require('./nie-hair-rules.js')
  : (typeof NieHairRules !== 'undefined' ? NieHairRules : null);

// 资源基址：真机为 ''（包内根目录）；浏览器垫片由 index.html 设为 '../'
const ASSET_BASE = (typeof window !== 'undefined' && window.NIE_ASSET_BASE)
  ? window.NIE_ASSET_BASE : '';

// 部件类别 + 合成 z 序（从底到顶，决定叠图先后）
const CATS = [
  'hair_hou', 'cloth', 'body', 'mouth', 'nose', 'eyes', 'hair_qian', 'deco'
];

// 0.5 主题配色
// 改色只需动这里一处。详见《云隐小师妹_美术UI规范.md》。
// 背景天空渐变 —— 单一真相取自 styles-shell.css 的 --sky-top / --sky-bottom，
// 与 DOM UI 的 :root 调色板同源，避免"双调色板"色差。
function readSkyColors() {
  try {
    const cs = getComputedStyle(document.documentElement);
    return {
      top: (cs.getPropertyValue('--sky-top') || '').trim() || '#FBF9FF',
      bottom: (cs.getPropertyValue('--sky-bottom') || '').trim() || '#E3D6F7'
    };
  } catch (e) { return { top: '#FBF9FF', bottom: '#E3D6F7' }; }
}

// 1. 上屏画布 + 画笔（由 index.html 的 <canvas id="game"> 提供，platform.js 管理尺寸）
const canvas = Platform.canvas;
const ctx = Platform.ctx;

// 适配变量（真机从系统信息拿，浏览器垫片给真值）
let W = 420, H = 820, dpr = 1, scale = 1, safeTop = 20, S = 1;
let bgGrad = null, bgGradH = 0;   // 背景渐变缓存（尺寸变化时重建）

// Production and tests share the complete topology in RuntimeModules.
const stage2Bootstrap = {
  Stage2State: typeof Stage2State === 'undefined' ? null : Stage2State,
  Stage2Rules: typeof Stage2Rules === 'undefined' ? null : Stage2Rules,
  GameRules: typeof GameRules === 'undefined' ? null : GameRules,
  Gathering: typeof Gathering === 'undefined' ? null : Gathering,
  Production: typeof Production === 'undefined' ? null : Production,
  Farm: typeof Farm === 'undefined' ? null : Farm,
  Formations: typeof Formations === 'undefined' ? null : Formations,
  SpiritBeasts: typeof SpiritBeasts === 'undefined' ? null : SpiritBeasts,
  GatheringContent: typeof GatheringContent === 'undefined'
    ? null
    : GatheringContent,
  ItemContent: typeof ItemContent === 'undefined' ? null : ItemContent,
  LifeSkillContent: typeof LifeSkillContent === 'undefined'
    ? null
    : LifeSkillContent,
  RecipeContent: typeof RecipeContent === 'undefined' ? null : RecipeContent,
  HomesteadContent: typeof HomesteadContent === 'undefined'
    ? null
    : HomesteadContent,
  Inventory: typeof Inventory === 'undefined' ? null : Inventory,
  SkillProgression: typeof SkillProgression === 'undefined'
    ? null
    : SkillProgression,
  GameRandom: typeof GameRandom === 'undefined' ? null : GameRandom
};

const useStage2Runtime = true;
const requiredBootstrapNames = Object.keys(stage2Bootstrap);
const missingBootstrapGlobals = requiredBootstrapNames.filter(
  function (name) {
    return stage2Bootstrap[name] === null;
  }
);
if (missingBootstrapGlobals.length > 0) {
  throw new Error(
    'Incomplete Stage 2 bootstrap: missing ' +
    missingBootstrapGlobals.join(', ')
  );
}

// Stage 3 content half is all-or-none at parse time. Combat *engines* load
 // later via LazyContent.ensureCombatRuntime() → refreshStage3CombatRuntime().
const stage3Bootstrap = {
  Stage3State: typeof Stage3State === 'undefined' ? null : Stage3State,
  Stage3Rules: typeof Stage3Rules === 'undefined' ? null : Stage3Rules,
  CombatContent: typeof CombatContent === 'undefined' ? null : CombatContent,
  TechniqueContent: typeof TechniqueContent === 'undefined'
    ? null
    : TechniqueContent,
  RealmContent: typeof RealmContent === 'undefined' ? null : RealmContent,
  CombatLoadouts: typeof CombatLoadouts === 'undefined'
    ? null
    : CombatLoadouts,
  Techniques: typeof Techniques === 'undefined' ? null : Techniques,
  CombatStats: typeof CombatStats === 'undefined' ? null : CombatStats,
  CombatEngine: typeof CombatEngine === 'undefined' ? null : CombatEngine,
  CombatRewards: typeof CombatRewards === 'undefined' ? null : CombatRewards,
  CombatProgress: typeof CombatProgress === 'undefined'
    ? null
    : CombatProgress,
  Breakthrough: typeof Breakthrough === 'undefined' ? null : Breakthrough
};
// 具名普攻为展示层内容表，不参与 Stage3 全量依赖校验。
const basicAttackContentApi = typeof BasicAttackContent === 'undefined'
  ? null
  : BasicAttackContent;
const teamCombatBootstrap = {
  TeamCombatEngine: typeof TeamCombatEngine === 'undefined'
    ? null
    : TeamCombatEngine,
  TeamCombatSnapshot: typeof TeamCombatSnapshot === 'undefined'
    ? null
    : TeamCombatSnapshot,
  TeamCombatConsequences: typeof TeamCombatConsequences === 'undefined'
    ? null
    : TeamCombatConsequences
};
const equipmentBootstrap = {
  EquipmentContent: typeof EquipmentContent === 'undefined'
    ? null
    : EquipmentContent,
  Equipment: typeof Equipment === 'undefined' ? null : Equipment
};

const stage3ContentNames = Object.freeze([
  'Stage3State',
  'CombatContent',
  'TechniqueContent',
  'RealmContent',
  'CombatLoadouts',
  'Techniques',
  'Breakthrough'
]);
const stage3CombatRuntimeNames = Object.freeze([
  'Stage3Rules',
  'CombatStats',
  'CombatEngine',
  'CombatRewards',
  'CombatProgress'
]);

const missingStage3Content = stage3ContentNames.filter(function (name) {
    return stage3Bootstrap[name] === null;
  });
if (missingStage3Content.length > 0) {
  throw new Error(
    'Incomplete Stage 3 bootstrap: missing ' +
    missingStage3Content.join(', ')
  );
}
let useStage3CombatRuntime = false;

// Character-world modules are required at boot.
const stage4Bootstrap = {
  Stage4State: typeof Stage4State === 'undefined' ? null : Stage4State,
  Stage4Rules: typeof Stage4Rules === 'undefined' ? null : Stage4Rules,
  RegionContent: typeof RegionContent === 'undefined' ? null : RegionContent,
  SectContent: typeof SectContent === 'undefined' ? null : SectContent,
  SectOfficeContent: typeof SectOfficeContent === 'undefined'
    ? null
    : SectOfficeContent,
  SectOffices: typeof SectOffices === 'undefined' ? null : SectOffices,
  SectMissionContent: typeof SectMissionContent === 'undefined'
    ? null
    : SectMissionContent,
  SectMissions: typeof SectMissions === 'undefined' ? null : SectMissions,
  SectPavilionContent: typeof SectPavilionContent === 'undefined'
    ? null
    : SectPavilionContent,
  SectPavilion: typeof SectPavilion === 'undefined' ? null : SectPavilion,
  NpcGenerationContent: typeof NpcGenerationContent === 'undefined'
    ? null
    : NpcGenerationContent,
  SocialInteractionContent:
    typeof SocialInteractionContent === 'undefined'
      ? null
      : SocialInteractionContent,
  NpcRoster: typeof NpcRoster === 'undefined' ? null : NpcRoster,
  Relationships: typeof Relationships === 'undefined'
    ? null
    : Relationships,
  NpcCombatConfig: typeof NpcCombatConfig === 'undefined'
    ? null
    : NpcCombatConfig,
  CombatParty: typeof CombatParty === 'undefined' ? null : CombatParty,
  Social: typeof Social === 'undefined' ? null : Social,
  NpcSimulation: typeof NpcSimulation === 'undefined'
    ? null
    : NpcSimulation,
  SectSimulation: typeof SectSimulation === 'undefined'
    ? null
    : SectSimulation,
  WorldMonth: typeof WorldMonth === 'undefined' ? null : WorldMonth
};
const stage4ExtensionNames = Object.keys(stage4Bootstrap);

const missingStage4Globals = stage4ExtensionNames.filter(function (name) {
    return stage4Bootstrap[name] === null;
  });
if (missingStage4Globals.length > 0) {
  throw new Error(
    'Incomplete Stage 4 bootstrap: missing ' +
    missingStage4Globals.join(', ')
  );
}

const stage5Bootstrap = {
  LifecycleContent: typeof LifecycleContent === 'undefined'
    ? null
    : LifecycleContent,
  Lineage: typeof Lineage === 'undefined' ? null : Lineage,
  InheritanceHall: typeof InheritanceHall === 'undefined'
    ? null
    : InheritanceHall,
  LegacyTransition: typeof LegacyTransition === 'undefined'
    ? null
    : LegacyTransition,
  Stage5Rules: typeof Stage5Rules === 'undefined' ? null : Stage5Rules
};
const stage5ExtensionNames = Object.keys(stage5Bootstrap);

const missingStage5Globals = stage5ExtensionNames.filter(function (name) {
    return stage5Bootstrap[name] === null;
  });
if (missingStage5Globals.length > 0) {
  throw new Error(
    'Incomplete Stage 5 bootstrap: missing ' +
    missingStage5Globals.join(', ')
  );
}

// 2. 游戏状态
const state = {
  gender: 'g',                       // 玩家恒为女；'b' 男性仅供 NPC 自动生成
  parts: {
    hair_hou: 0, cloth: 0, body: 0, mouth: 0,
    nose: 0, eyes: 0, hair_qian: 0, deco: 0
  },
  navIndex: 0,                       // 左侧导航选中项（0 = 洞府）
  phase: 'create',                   // 'create' 创建角色 | 'game' 主游戏 | 'edit' 编辑形象 | 'lunhui' 轮回结算
  created: false,                    // 是否已完成首次创建（写入 cloud_save_v1 快照）
  player: null,                      // 轻量角色档案（创建后生成：名/境界/修为/灵石）
  dirty: true,                       // 需要重新离屏合成
  cache: null,                       // 合成后的缓存位图（离屏画布）
  current: null,                     // 当前动作（梅尔沃式·一次只做一件事）：{key,count,done,elapsed}
  showOffline: false,                // 是否弹出离线收益面板
  settlingOffline: false,            // 启动离线结算进行中（先出壳再结算）
  _offlineSettleProgress: null,      // { fromMs, currentMs, toMs } 结算进度（仅运行时）
  offlineResult: null,              // 离线收益结算结果
  pendingOfflineReports: [],        // v2 完整待领取报告；Task 6 接管展示前不得丢失
  offlineLimitSeconds: 43200,
  systems: {
    gathering: {
      spots: {},
      fishStocks: {},
      fishRecoverAcc: 0,
      fishRecoverAnchorMs: null,
      fishRecoverBaseSeconds: null
    },
    homestead: {
      farm: { plots: [] },
      formations: { slots: [], owned: [] },
      beasts: { roster: [], activeIds: [] }
    },
    parallel: { jobs: [] },
    world: {
      tickAccumulator: 0,
      tickAnchorMs: null,
      tickBaseSeconds: null
    }
  },
  reportArchive: [],
  processedThroughMs: 0,
  lastActionStop: null,
  showLunhui: false,                 // 是否弹出轮回（寿元耗尽）结算页
  showLifespanBuffer: false,         // 是否弹出「寿元安全缓冲」提示（进入缓冲时弹一次，可手动关闭）
  showBreak: false,                  // 是否弹出突破弹窗（顶栏突破按钮触发，替代独立突破页签）
  _offlineSec: 0,                    // 离线时长（秒）
  _persistenceIssue: null,           // 未提交写入；存在时冻结一切会改变进度的操作
  _lastSimulationReport: null,       // 最近一次统一模拟报告（仅运行时，不入存档）
  _last: null,                       // 上次 tick 时间戳（算 dt）
  _hiddenAt: null,                   // 页面进入后台的 wall-clock 起点
  _nextAutosaveAt: 0,                // 纯运行时自动保存期限
  rngState: GameRandom.fromEntropy(Date.now(), 0x584955)
};

// ── M1 放置内核数据表 ──
// 境界阶梯：
//   tier: 'minor' 小阶(练气1~9)，修为够即自动突破、无风险；
//         'major' 大境界(筑基+)，走「概率突破 + 渡劫」，失败清空修为；
//         'ascend' 飞升(终点)。
//   need: 突破到下一级所需修为；dan: 需要的突破丹字段名；baseRate: 基础突破率；
//   shou: 该境界寿元上限（游戏年，设计目标值，数值待调）。
const REALM_TABLE = [
  { name: '练气一层', need: 100,    tier: 'minor',  shou: 120 },
  { name: '练气二层', need: 250,    tier: 'minor',  shou: 120 },
  { name: '练气三层', need: 450,    tier: 'minor',  shou: 120 },
  { name: '练气四层', need: 700,    tier: 'minor',  shou: 120 },
  { name: '练气五层', need: 1000,   tier: 'minor',  shou: 120 },
  { name: '练气六层', need: 1400,   tier: 'minor',  shou: 120 },
  { name: '练气七层', need: 1900,   tier: 'minor',  shou: 120 },
  { name: '练气八层', need: 2500,   tier: 'minor',  shou: 120 },
  { name: '练气九层', need: 3000,   tier: 'minor',  shou: 120 },
  { name: '筑基',   need: 6000,   tier: 'major',  shou: 300,  dan: 'tupo',     baseRate: 0.60 },
  { name: '金丹',   need: 15000,  tier: 'major',  shou: 800,  dan: 'jindan',   baseRate: 0.50 },
  { name: '元婴',   need: 40000,  tier: 'major',  shou: 2000, dan: 'yuanying', baseRate: 0.40 },
  { name: '化神',   need: 100000, tier: 'major',  shou: 5000, dan: 'huashen',  baseRate: 0.30 },
  { name: '炼虚',   need: 250000, tier: 'major',  shou: 12000, dan: 'lianxu',   baseRate: 0.25 },
  { name: '合体',   need: 600000, tier: 'major',  shou: 30000, dan: 'heti',     baseRate: 0.20 },
  { name: '大乘',   need: 1500000,tier: 'major',  shou: 80000, dan: 'dasheng',  baseRate: 0.15 },
  { name: '飞升',   need: 0,      tier: 'ascend', shou: null }
];

// 突破丹字段名 → 中文名（用于缺丹提示 / 条件清单）
const DAN_NAME = {
  tupo: '筑基丹', jindan: '金丹丹', yuanying: '元婴丹', huashen: '化神丹',
  lianxu: '炼虚丹', heti: '合体丹', dasheng: '大乘丹'
};

// 寿元流逝速率（占位设计目标值）：1 游戏年 = 1800 真实秒（30 分钟）。
// 在线与离线统一推进，但会在剩余 1 年时停止主行动并钳制，绝不静默死亡。
// 一个世界年等于现实 12 小时。玩家与人物世界共用这一换算。
const YEAR_SECONDS = 12 * 60 * 60;

// 动作定义：time=单次耗时(s)；cost=消耗资源；
// effects=可序列化产出；needLv=技艺等级解锁门槛（未达灰显不可设）
const ACTIONS = {
  // ── 生活技艺：采集 / 转化 ──
  caiyao:        { skill: 'caiyao', name: '采灵草', icon: '药', time: 3, xp: 8,
                   out: '药材 ×2',
                   effects: { stacks: { yaocai: 2 }, cultivation: 0, jingqi: 0 } },
  caiyao2:       { skill: 'caiyao', name: '采灵芝', icon: '药', time: 6, xp: 16, needLv: 20,
                   out: '药材 ×5',
                   effects: { stacks: { yaocai: 5 }, cultivation: 0, jingqi: 0 } },
  caijing:       { skill: 'caiju', name: '采灵矿', icon: '矿', time: 3, xp: 8,
                   out: '灵矿 ×2',
                   effects: { stacks: { lingkuang: 2 }, cultivation: 0, jingqi: 0 } },
  caijing2:      { skill: 'caiju', name: '采精金', icon: '矿', time: 6, xp: 16, needLv: 20,
                   out: '灵矿 ×5',
                   effects: { stacks: { lingkuang: 5 }, cultivation: 0, jingqi: 0 } },
  famu:          { skill: 'famu', name: '伐灵木', icon: '木', time: 3, xp: 8,
                   out: '木料 ×2',
                   effects: { stacks: { muliao: 2 }, cultivation: 0, jingqi: 0 } },
  diaoyu:        { skill: 'diaoyu', name: '垂钓', icon: '鱼', time: 4, xp: 8,
                   out: '食材 ×2',
                   effects: { stacks: { shicai: 2 }, cultivation: 0, jingqi: 0 } },
  liandan_tupo:   { skill: 'liandan', name: '炼筑基丹', icon: '丹', time: 8, xp: 14, cost: { yaocai: 5 },
                   out: '药材×5 → 筑基丹×1',
                   effects: { stacks: { tupo: 1 }, cultivation: 0, jingqi: 0 } },
  liandan_heal:   { skill: 'liandan', name: '炼疗伤丹', icon: '丹', time: 6, xp: 10, cost: { yaocai: 3 },
                   out: '药材×3 → 疗伤丹×1',
                   effects: { stacks: { heal: 1 }, cultivation: 0, jingqi: 0 } },
  liandan_jindan: { skill: 'liandan', name: '炼金丹', icon: '丹', time: 12, xp: 24, needLv: 40, cost: { yaocai: 10, lingkuang: 5 },
                   out: '药材×10 灵矿×5 → 金丹丹×1',
                   effects: { stacks: { jindan: 1 }, cultivation: 0, jingqi: 0 } },
  liandan_yuanying: { skill: 'liandan', name: '炼元婴丹', icon: '丹', time: 18, xp: 36, needLv: 60, cost: { yaocai: 20, lingkuang: 10 },
                   out: '药材×20 灵矿×10 → 元婴丹×1',
                   effects: { stacks: { yuanying: 1 }, cultivation: 0, jingqi: 0 } },
  liandan_huashen: { skill: 'liandan', name: '炼化神丹', icon: '丹', time: 26, xp: 50, needLv: 80, cost: { yaocai: 40, lingkuang: 20 },
                   out: '药材×40 灵矿×20 → 化神丹×1',
                   effects: { stacks: { huashen: 1 }, cultivation: 0, jingqi: 0 } },
  lianqi_jian:   { skill: 'lianqi', name: '锻造法器', icon: '器', time: 10, xp: 16, cost: { lingkuang: 5 },
                   out: '灵矿×5 → 法器×1',
                   effects: { stacks: { faqi: 1 }, cultivation: 0, jingqi: 0 } },
  lianqi_jia:    { skill: 'lianqi', name: '锻造护甲', icon: '甲', time: 10, xp: 16, cost: { lingkuang: 5 },
                   out: '灵矿×5 → 护甲×1',
                   effects: { stacks: { hujia: 1 }, cultivation: 0, jingqi: 0 } },
  chuyi:         { skill: 'chuyi', name: '烹饪膳食', icon: '食', time: 8, xp: 12, cost: { shicai: 3 },
                   out: '食材×3 → 膳食×1',
                   effects: { stacks: { shanshi: 1 }, cultivation: 0, jingqi: 0 } },
  fulu:          { skill: 'fulu', name: '绘制符箓', icon: '符', time: 7, xp: 12, cost: { yaocai: 2 },
                   out: '药材×2 → 符箓×1',
                   effects: { stacks: { fu: 1 }, cultivation: 0, jingqi: 0 } },
  qinqin:        { skill: 'qinqishuhua', name: '抚琴抒怀', icon: '琴', time: 6, xp: 10,
                   out: '才情 ×2',
                   effects: { stacks: { caiqing: 2 }, cultivation: 0, jingqi: 0 } },
  // ── 修行技艺：涨修为 / 精气 ──
  tuna:          { skill: 'tuna', name: '打坐修炼', icon: '气', time: 5, xp: 6,
                   out: '修为 +5 · 精气 -2',
                   effects: { stacks: {}, cultivation: 5, jingqi: -2 } },
  jianjue:       { skill: 'jianjue', name: '参悟剑诀', icon: '剑', time: 6, xp: 10,
                   out: '修为 +3',
                   effects: { stacks: {}, cultivation: 3, jingqi: 0 } },
  quanjiao:      { skill: 'quanjiao', name: '锤炼拳脚', icon: '拳', time: 6, xp: 10,
                   out: '修为 +3',
                   effects: { stacks: {}, cultivation: 3, jingqi: 0 } },
  shenfa:        { skill: 'shenfa', name: '修习身法', icon: '身', time: 6, xp: 10,
                   out: '精气 +3',
                   effects: { stacks: {}, cultivation: 0, jingqi: 3 } },
  // ── 高阶产物卡：让每个技艺页都有「多个对应不同产物的行动卡片」（对标梅尔沃）──
  famu2:         { skill: 'famu', name: '伐灵古木', icon: '木', time: 6, xp: 16, needLv: 20,
                   out: '木料 ×5', effects: { stacks: { muliao: 5 }, cultivation: 0, jingqi: 0 } },
  diaoyu2:       { skill: 'diaoyu', name: '钓灵鱼', icon: '鱼', time: 8, xp: 16, needLv: 20,
                   out: '食材 ×5', effects: { stacks: { shicai: 5 }, cultivation: 0, jingqi: 0 } },
  chuyi2:        { skill: 'chuyi', name: '烹饪灵膳', icon: '食', time: 14, xp: 24, needLv: 30, cost: { shicai: 5 },
                   out: '食材×5 → 膳食×1', effects: { stacks: { shanshi: 1 }, cultivation: 0, jingqi: 0 } },
  fulu2:         { skill: 'fulu', name: '绘制高阶符', icon: '符', time: 14, xp: 24, needLv: 30, cost: { yaocai: 5 },
                   out: '药材×5 → 符箓×1', effects: { stacks: { fu: 1 }, cultivation: 0, jingqi: 0 } },
  qinqi2:        { skill: 'qinqishuhua', name: '对弈悟道', icon: '琴', time: 12, xp: 20, needLv: 20,
                   out: '才情 ×5', effects: { stacks: { caiqing: 5 }, cultivation: 0, jingqi: 0 } },
  tuna2:         { skill: 'tuna', name: '灵气吐纳', icon: '气', time: 9, xp: 14, needLv: 20,
                   out: '修为 +12 · 精气 -4', effects: { stacks: {}, cultivation: 12, jingqi: -4 } },
  jianjue2:      { skill: 'jianjue', name: '剑意凝练', icon: '剑', time: 12, xp: 20, needLv: 20,
                   out: '修为 +8', effects: { stacks: {}, cultivation: 8, jingqi: 0 } },
  quanjiao2:     { skill: 'quanjiao', name: '淬体锤炼', icon: '拳', time: 12, xp: 20, needLv: 20,
                   out: '修为 +8', effects: { stacks: {}, cultivation: 8, jingqi: 0 } },
  shenfa2:       { skill: 'shenfa', name: '踏风疾行', icon: '身', time: 12, xp: 20, needLv: 20,
                   out: '精气 +8', effects: { stacks: {}, cultivation: 0, jingqi: 8 } }
};

// ── M2 采集系数据表（采矿 / 伐木 / 钓鱼 / 采药）──
// 设计来源：《云隐小师妹_采集系设计案.md》；每个条目独立精通（上限 99）。

const GATHER_SKILL_KEY = { mining: 'caiju', woodcutting: 'famu', fishing: 'diaoyu', herb: 'caiyao' };

// ── 采集系全局常量（数值写死，对齐《采集系设计文档（定稿）》）──
const FISH_MAX = 30;            // 钓鱼：每个钓点满库存 = 30 次
const FISH_RECOVER_SEC = 60;    // 钓鱼：库存每 60 秒回复 1 次（离线也回）
const MOOD_MAX = 100;           // 心情：满值 100
const MOOD_REGEN_PER_SEC = 1 / 30; // 心情：每 30 秒自然恢复 1 点（社交事件未来会使其下降）

// 物品中文名（采集系产出）

// 各技能条目、容量、产出权重
// 有限发现制（mining/woodcutting/herb）带 capMin/capMax；钓鱼（fishing）无容量。
const GATHERING_DATA = {
  mining: {
    tint: '#CFE6F6',
    explore: { name: '探寻灵矿', label: '探索' },
    entries: [
      // ── 低阶（铜/锡/铁/银/金，Lv1–20）：黄玉为主，金矿小概率出蓝宝 ──
      { id: 'copper', name: '铜矿脉', unlockLv: 1,  time: 4,  xp: 12,  capMin: 15, capMax: 30,
        drops: [{item:'copperOre',w:100,q:1},{item:'topaz',w:8,q:1},{item:'lingshi',w:8,q:1}] },
      { id: 'tin',    name: '锡矿脉', unlockLv: 1,  time: 4,  xp: 12,  capMin: 15, capMax: 30,
        drops: [{item:'tinOre',w:100,q:1},{item:'topaz',w:8,q:1},{item:'lingshi',w:8,q:1}] },
      { id: 'iron',   name: '铁矿脉', unlockLv: 1,  time: 4,  xp: 12,  capMin: 15, capMax: 30,
        drops: [{item:'ironOre',w:100,q:1},{item:'topaz',w:8,q:1},{item:'lingshi',w:9,q:1}] },
      { id: 'silver', name: '银矿脉', unlockLv: 12, time: 6,  xp: 25,  capMin: 12, capMax: 25,
        drops: [{item:'silverOre',w:100,q:1},{item:'topaz',w:8,q:1},{item:'lingshi',w:10,q:1}] },
      { id: 'gold',   name: '金矿脉', unlockLv: 20, time: 8,  xp: 40,  capMin: 10, capMax: 22,
        drops: [{item:'goldOre',w:100,q:1},{item:'topaz',w:6,q:1},{item:'sapphire',w:3,q:1},{item:'lingshi',w:12,q:1}] },
      // ── 中阶（秘银/灵玉，Lv25–30）：蓝宝为主，小概率红宝 ──
      { id: 'mithril',name: '秘银矿脉', unlockLv: 25, time: 9,  xp: 50,  capMin: 9,  capMax: 20,
        drops: [{item:'mithrilOre',w:100,q:1},{item:'sapphire',w:8,q:1},{item:'ruby',w:3,q:1},{item:'lingshi',w:12,q:1}] },
      { id: 'jade',   name: '灵玉矿脉', unlockLv: 30, time: 10, xp: 60,  capMin: 8,  capMax: 18,
        drops: [{item:'jadeShard',w:100,q:1},{item:'sapphire',w:8,q:1},{item:'ruby',w:3,q:1},{item:'lingshi',w:13,q:1}] },
      // ── 高阶（精金/玄铁/玄晶，Lv35–45）：红宝/翠玉为主，金钻小，极小暗晶 ──
      { id: 'adamant',name: '精金矿脉', unlockLv: 35, time: 11, xp: 70,  capMin: 7,  capMax: 15,
        drops: [{item:'adamantOre',w:100,q:1},{item:'ruby',w:7,q:1},{item:'emerald',w:6,q:1},{item:'diamond',w:2,q:1},{item:'lingshi',w:14,q:1}] },
      { id: 'darkiron',name: '玄铁矿脉', unlockLv: 40, time: 12, xp: 85,  capMin: 6,  capMax: 12,
        drops: [{item:'darkIronOre',w:100,q:1},{item:'ruby',w:6,q:1},{item:'emerald',w:6,q:1},{item:'diamond',w:3,q:1},{item:'darkCrystal',w:1,q:1},{item:'lingshi',w:15,q:1}] },
      { id: 'crystal',name: '玄晶矿脉', unlockLv: 45, time: 14, xp: 100, capMin: 5,  capMax: 10,
        drops: [{item:'crystalOre',w:100,q:1},{item:'ruby',w:6,q:1},{item:'emerald',w:6,q:1},{item:'diamond',w:3,q:1},{item:'darkCrystal',w:2,q:1},{item:'lingshi',w:17,q:1}] }
    ]
  },
  woodcutting: {
    tint: '#FBEFC4',
    explore: { name: '探寻灵林', label: '探索' },
    entries: [
      // ── 低阶林地（Lv1–20）：灵桃 / 普通种子 / 鸟巢 ──
      { id: 'willow',  name: '河畔柳林', unlockLv: 1,  time: 4,  xp: 10, capMin: 15, capMax: 30,
        drops: [{item:'willowWood',w:70,q:1},{item:'pineWood',w:15,q:1},{item:'spiritPeach',w:8,q:1},{item:'lingshi',w:10,q:1},{item:'birdNest',w:5,q:1},{item:'commonSeed',w:6,q:1}] },
      { id: 'pine',    name: '青松岭',   unlockLv: 5,  time: 5,  xp: 15, capMin: 12, capMax: 25,
        drops: [{item:'pineWood',w:65,q:1},{item:'willowWood',w:15,q:1},{item:'spiritPeach',w:8,q:1},{item:'lingshi',w:10,q:1},{item:'birdNest',w:3,q:1},{item:'commonSeed',w:6,q:1}] },
      { id: 'peach',   name: '桃花谷',   unlockLv: 12, time: 6,  xp: 22, capMin: 10, capMax: 22,
        drops: [{item:'peachWood',w:60,q:1},{item:'pineWood',w:15,q:1},{item:'spiritPeach',w:8,q:1},{item:'lingshi',w:10,q:1},{item:'birdNest',w:3,q:1},{item:'commonSeed',w:6,q:1}] },
      { id: 'nanmu',   name: '楠木深林', unlockLv: 20, time: 8,  xp: 35, capMin: 8,  capMax: 18,
        drops: [{item:'nanmuWood',w:55,q:1},{item:'peachWood',w:15,q:1},{item:'spiritPeach',w:8,q:1},{item:'lingshi',w:12,q:1},{item:'resin',w:10,q:1},{item:'birdNest',w:8,q:1},{item:'commonSeed',w:6,q:1}] },
      // ── 中阶林地（Lv28–35）：低阶全部 + 树脂 / 灵禽蛋 / 灵虫丝 / 上品种子 ──
      { id: 'phoenix', name: '梧桐灵谷', unlockLv: 28, time: 10, xp: 48, capMin: 7,  capMax: 15,
        drops: [{item:'phoenixWood',w:50,q:1},{item:'nanmuWood',w:18,q:1},{item:'spiritPeach',w:6,q:1},{item:'lingshi',w:12,q:1},{item:'spiritEgg',w:10,q:1},{item:'resin',w:10,q:1},{item:'birdNest',w:6,q:1},{item:'fineSeed',w:5,q:1}] },
      { id: 'spirit',  name: '灵木幽林', unlockLv: 35, time: 11, xp: 60, capMin: 6,  capMax: 14,
        drops: [{item:'spiritWood',w:50,q:1},{item:'phoenixWood',w:15,q:1},{item:'spiritPeach',w:6,q:1},{item:'lingshi',w:12,q:1},{item:'spiritWormSilk',w:10,q:1},{item:'resin',w:8,q:1},{item:'birdNest',w:5,q:1},{item:'fineSeed',w:5,q:1}] },
      // ── 高阶林地（Lv42–62）：中阶全部 + 兽皮 / 血灵草·雷灵草 / 灵果 / 极品种子 ──
      { id: 'thunder', name: '雷劈枯林', unlockLv: 42, time: 13, xp: 78, capMin: 5,  capMax: 12,
        drops: [{item:'thunderWood',w:45,q:1},{item:'spiritWood',w:18,q:1},{item:'spiritPeach',w:6,q:1},{item:'lingshi',w:15,q:1},{item:'thunderHerb',w:10,q:1},{item:'resin',w:7,q:1},{item:'birdNest',w:5,q:1},{item:'beastHide',w:6,q:1},{item:'spiritFruit',w:5,q:1},{item:'rareSeed',w:5,q:1}] },
      { id: 'blood',   name: '血檀秘境', unlockLv: 48, time: 14, xp: 90, capMin: 4,  capMax: 10,
        drops: [{item:'bloodSandalwood',w:45,q:1},{item:'thunderWood',w:15,q:1},{item:'spiritPeach',w:6,q:1},{item:'lingshi',w:15,q:1},{item:'beastHide',w:10,q:1},{item:'bloodHerb',w:8,q:1},{item:'resin',w:7,q:1},{item:'birdNest',w:5,q:1},{item:'spiritFruit',w:5,q:1},{item:'rareSeed',w:5,q:1}] },
      { id: 'ancient', name: '万年古林', unlockLv: 55, time: 16, xp: 110,capMin: 3,  capMax: 8,
        drops: [{item:'ancientWood',w:40,q:1},{item:'bloodSandalwood',w:15,q:1},{item:'spiritWood',w:12,q:1},{item:'lingshi',w:15,q:1},{item:'millenniumVine',w:8,q:1},{item:'spiritFruit',w:5,q:1},{item:'birdNest',w:5,q:1},{item:'beastHide',w:6,q:1},{item:'rareSeed',w:5,q:1}] },
      { id: 'vine',    name: '仙藤圣林', unlockLv: 62, time: 18, xp: 140,capMin: 3,  capMax: 7,
        drops: [{item:'millenniumVine',w:35,q:1},{item:'ancientWood',w:18,q:1},{item:'spiritWood',w:12,q:1},{item:'lingshi',w:15,q:1},{item:'spiritFruit',w:8,q:1},{item:'resin',w:7,q:1},{item:'birdNest',w:5,q:1},{item:'beastHide',w:6,q:1},{item:'rareSeed',w:5,q:1}] }
    ]
  },
  fishing: {
    tint: '#CFE6F6',
    explore: null, // 钓鱼不走探索，直接选钓点
    entries: [
      { id: 'pond',    name: '村口池塘', unlockLv: 1,  time: 4.0, xp: 10,
        drops: [{item:'spiritCarp',w:70,q:1},{item:'spiritShrimp',w:30,q:1}] },
      { id: 'shallow', name: '灵溪浅滩', unlockLv: 5,  time: 3.5, xp: 15,
        drops: [{item:'spiritShrimp',w:60,q:1},{item:'spiritCarp',w:25,q:1},{item:'silverTrout',w:15,q:1}] },
      { id: 'moon',    name: '银月溪谷', unlockLv: 10, time: 5.0, xp: 22,
        drops: [{item:'silverTrout',w:55,q:1},{item:'spiritCarp',w:25,q:1},{item:'greenBass',w:15,q:1},{item:'spiritShrimp',w:5,q:1}] },
      { id: 'deep',    name: '翠玉深潭', unlockLv: 18, time: 6.0, xp: 32,
        drops: [{item:'greenBass',w:50,q:1},{item:'silverTrout',w:25,q:1},{item:'darkCatfish',w:15,q:1},{item:'spiritCarp',w:10,q:1}] },
      { id: 'dark',    name: '幽冥暗河', unlockLv: 25, time: 7.0, xp: 42,
        drops: [{item:'darkCatfish',w:50,q:1},{item:'greenBass',w:25,q:1},{item:'sunsetSalmon',w:15,q:1},{item:'thunderEel',w:10,q:1}] },
      { id: 'waterfall',name:'落霞瀑布', unlockLv: 32, time: 8.0, xp: 55,
        drops: [{item:'sunsetSalmon',w:50,q:1},{item:'darkCatfish',w:20,q:1},{item:'thunderEel',w:18,q:1},{item:'greenBass',w:12,q:1}] },
      { id: 'thunderPond',name:'雷泽沼地', unlockLv: 40, time: 9.0, xp: 68,
        drops: [{item:'thunderEel',w:50,q:1},{item:'sunsetSalmon',w:22,q:1},{item:'spiritLobster',w:15,q:1},{item:'darkCatfish',w:13,q:1}] },
      { id: 'ocean',   name: '沧澜深海', unlockLv: 50, time: 10.0,xp: 85,
        drops: [{item:'spiritLobster',w:45,q:1},{item:'thunderEel',w:25,q:1},{item:'swordfish',w:18,q:1},{item:'sunsetSalmon',w:12,q:1}] },
      { id: 'trench',  name: '剑渊海沟', unlockLv: 60, time: 12.0,xp: 105,
        drops: [{item:'swordfish',w:45,q:1},{item:'spiritLobster',w:25,q:1},{item:'dragonFish',w:12,q:1},{item:'thunderEel',w:18,q:1}] },
      { id: 'dragon',  name: '龙渊秘境', unlockLv: 70, time: 15.0,xp: 130,
        drops: [{item:'dragonFish',w:40,q:1},{item:'swordfish',w:25,q:1},{item:'spiritLobster',w:20,q:1},{item:'thunderEel',w:15,q:1}] }
    ]
  },
  herb: {
    tint: '#CDEBD7',
    explore: { name: '探寻药田', label: '探索' },
    entries: [
      // ── 低阶产地（Lv1–10）：灵蜜（食材）+ 凡灵种，不产木材/鱼（木材只归伐木）──
      { id: 'lingzhiGrove',name: '灵芝草丛', unlockLv: 1,  time: 5.0, xp: 12, capMin: 12, capMax: 25,
        drops: [{item:'lingzhi',w:60,q:1},{item:'spiritHoney',w:18,q:1},{item:'commonSeed',w:12,q:1},{item:'lingshi',w:12,q:1}] },
      { id: 'mushroomWood',name: '灵菇林地', unlockLv: 3,  time: 5.0, xp: 14, capMin: 10, capMax: 22,
        drops: [{item:'spiritMushroom',w:60,q:1},{item:'spiritHoney',w:18,q:1},{item:'commonSeed',w:12,q:1},{item:'lingshi',w:12,q:1}] },
      { id: 'silkForest',name: '天蚕丝林', unlockLv: 8,  time: 7.0, xp: 22, capMin: 10, capMax: 20,
        drops: [{item:'skySilk',w:60,q:1},{item:'spiritHoney',w:18,q:1},{item:'commonSeed',w:12,q:1},{item:'lingshi',w:12,q:1}] },
      { id: 'riverbank',name: '灵溪河岸', unlockLv: 10, time: 7.0, xp: 25, capMin: 8,  capMax: 18,
        drops: [{item:'ironhideGrass',w:55,q:1},{item:'spiritHoney',w:18,q:1},{item:'commonSeed',w:12,q:1},{item:'lingshi',w:12,q:1}] },
      // ── 中阶产地（Lv20–30）：+ 灵米（食材）+ 上品灵种 ──
      { id: 'dragonValley',name: '龙涎草谷', unlockLv: 20, time: 10.0,xp: 45, capMin: 6,  capMax: 15,
        drops: [{item:'dragonSalivaGrass',w:50,q:1},{item:'spiritHoney',w:12,q:1},{item:'spiritRice',w:12,q:1},{item:'fineSeed',w:10,q:1},{item:'lingshi',w:12,q:1}] },
      { id: 'moonMeadow',name: '月华草甸', unlockLv: 22, time: 10.0,xp: 50, capMin: 5,  capMax: 14,
        drops: [{item:'moonSpiritGrass',w:50,q:1},{item:'spiritHoney',w:12,q:1},{item:'spiritRice',w:12,q:1},{item:'fineSeed',w:10,q:1},{item:'lingshi',w:12,q:1}] },
      { id: 'secretGarden',name: '灵药秘圃', unlockLv: 30, time: 12.0,xp: 60, capMin: 4,  capMax: 10,
        drops: [{item:'starGrass',w:45,q:1},{item:'spiritHoney',w:12,q:1},{item:'spiritRice',w:12,q:1},{item:'fineSeed',w:10,q:1},{item:'lingshi',w:12,q:1}] },
      // ── 高阶产地（Lv35–50）：+ 老山参/血参果（高阶食材）+ 极品灵种 ──
      { id: 'bloodSwamp',name: '血灵沼泽', unlockLv: 35, time: 13.0,xp: 70, capMin: 4,  capMax: 10,
        drops: [{item:'bloodSpiritGrass',w:45,q:1},{item:'oldGinseng',w:10,q:1},{item:'bloodGinsengFruit',w:10,q:1},{item:'rareSeed',w:8,q:1},{item:'lingshi',w:12,q:1}] },
      { id: 'thunderPeak',name: '雷霆峰顶', unlockLv: 40, time: 14.0,xp: 80, capMin: 3,  capMax: 8,
        drops: [{item:'thunderSpiritGrass',w:50,q:1},{item:'oldGinseng',w:10,q:1},{item:'bloodGinsengFruit',w:10,q:1},{item:'rareSeed',w:8,q:1},{item:'lingshi',w:12,q:1}] },
      { id: 'goldenRealm',name: '金芝圣境', unlockLv: 45, time: 15.0,xp: 100,capMin: 3,  capMax: 7,
        drops: [{item:'goldenLingzhi',w:35,q:1},{item:'oldGinseng',w:10,q:1},{item:'bloodGinsengFruit',w:10,q:1},{item:'rareSeed',w:8,q:1},{item:'lingshi',w:12,q:1}] },
      { id: 'myriadHerb',name: '万药灵境', unlockLv: 50, time: 16.0,xp: 120,capMin: 3,  capMax: 6,
        drops: [{item:'goldenLingzhi',w:20,q:1},{item:'thunderSpiritGrass',w:15,q:1},{item:'starGrass',w:15,q:1},{item:'oldGinseng',w:10,q:1},{item:'bloodGinsengFruit',w:10,q:1},{item:'rareSeed',w:8,q:1},{item:'lingshi',w:12,q:1}] }
    ]
  }
};

// 钓鱼精通按「鱼种」追踪（同种鱼在多钓点钓到累加同一精通）；其余技能按条目（产地/矿脉/林地）

// 生成默认精通结构（每个条目 lv=1 xp=0 + 精通池 pool=0）

// 根据技能等级返回可发现的条目（按解锁等级加权随机）
function discoverableEntries(skill, lv) {
  return GATHERING_DATA[skill].entries.filter(e => e.unlockLv <= lv);
}

// 左侧导航 → 技艺页映射（按导航名查，顺序无关）
const SKILL_PAGES = {
  // 采集系：走 DOM 技艺页（有限发现制 + 竖向卡片）
  '采药':     { type: 'gather', skill: 'herb',         title: '采药',     desc: '探索野外药田，采集灵草与药材' },
  '采矿':     { type: 'gather', skill: 'mining',       title: '采矿',     desc: '探索灵矿脉，采集灵矿与宝石' },
  '伐木':     { type: 'gather', skill: 'woodcutting',  title: '伐木',     desc: '探索灵木林地，采集灵木与副产物' },
  '钓鱼':     { type: 'gather', skill: 'fishing',      title: '钓鱼',     desc: '选取灵泽钓点，垂钓灵鱼、杂物与特殊掉落' },
  // 制造 / 修行系：走 DOM 技艺页（动作卡片网格）
  '炼丹':     { type: 'skill', skill: 'liandan',      title: '炼丹',     desc: '以药材炼制丹药，突破丹为突破必需', actions: ['liandan_tupo', 'liandan_heal', 'liandan_jindan', 'liandan_yuanying', 'liandan_huashen'] },
  '炼器':     { type: 'skill', skill: 'lianqi',       title: '炼器',     desc: '以灵矿锻造法器与护甲',       actions: ['lianqi_jian', 'lianqi_jia'] },
  '符箓':     { type: 'skill', skill: 'fulu',         title: '符箓',     desc: '绘制符箓，战斗争斗与奇遇所用', actions: ['fulu', 'fulu2'] },
};
// 技能 key → 中文名（用于解锁提示）
const SKILL_TITLE = {};
for (const k in SKILL_PAGES) SKILL_TITLE[SKILL_PAGES[k].skill] = SKILL_PAGES[k].title;
// 动作 key → 其所属技艺页在 NAV 中的索引（点首页快捷操作后跳到对应技艺页看进度条）

// 行为卡图标底色（按技艺主题浅彩，弱对比不抢文字）

// 3. 图片懒加载缓存（按需加载，不一次解码全部 153 张 → 守 iOS 内存红线）

// 4. 离屏合成（仅在 dirty 时执行一次；合成结果存进缓存位图）

// 供 ui.js 取合成缓存位图（DOM 预览用）；dirty 时先重合成一次

// 5. 绘制工具

// 竖直渐变（上浅下略深），用于按钮，弱化现代扁平感、添几分温润

// 6. 左侧导航（可拖动滚动列表：标签多时上下拖拽查看）
// 古风浅紫少女风精修：竖向渐变侧栏 + 选中渐变 + 左选中条 + 右指向三角 + 仙珠装饰
const NAV = [
  '洞府', '背包', '装备', '商城', '事件', '战斗', '宗门', '天下',
  '关系', '设置', '采药', '采矿', '伐木', '钓鱼', '炼丹', '炼器', '烹饪',
  '符箓'
];
const NAV_HOME = NAV.indexOf('洞府');   // 洞府为默认首页（不再依赖固定索引 0）
                    // 导航列表垂直偏移（设计坐标 px）
// ── 内容区滚动（技艺页 / 背包等长列表）──
                // 右侧内容区当前垂直偏移（设计坐标 px）
             // 当前页可滚动最大值（0 = 一屏装得下）
  // 当前可滚动裁剪区（触摸命中判定用）
          // 内容区拖动起点
           // 当前是否处于可滚动裁剪区内（交互命中用）

// 小菱形装饰（仙珠 / 少女心点缀）

// 资源图标（矢量小图标，少女风柔和色；kind: mood/jingqi/lingshi/shengwang）

// 轻量角色档案默认值（§10① 资源：心情/精气/灵石/声望；§5 修为可突破阈值；§5 寿元）
function defaultPlayer() {
  const player = Object.assign(stage2Bootstrap.Stage2State.createDefaults().player, {
    name: '云隐弟子', realmStage: 0, realm: REALM_TABLE[0].name, title: '练气',
    spiritualRootId: 'single', xiwei: 0, breakNeed: REALM_TABLE[0].need,
    mood: MOOD_MAX, jingqi: 100, lingshi: 100, shengwang: 0, lingyu: 0,
    shouyuan: REALM_TABLE[0].shou, shouMax: REALM_TABLE[0].shou
  });
  return stage3Bootstrap.Stage3State.normalize({ player }).player;
}

// 防御性合并：用默认值填补存档中缺失的字段（避免 undefined 显示）
function ensurePlayer(player) { return player || defaultPlayer(); }

// ── M1 放置内核：队列 / 产出 / 突破 / 离线 ──
function skillXpNeed(lv) { return Math.round(50 * Math.pow(lv, 1.8)); }

function gameRandom() {
  const result = GameRandom.next(state.rngState);
  state.rngState = result.seed;
  return result.value;
}

// ── M2 采集系纯数值辅助；实际结算统一在 GameRules 中执行 ──
function masteryXpNeed(lv) { return Math.round(50 * Math.pow(1.12, Math.max(0, lv - 1))); }

// ── 采集精通效果（对齐定稿 §2.3）──
// 有效采集耗时：精通 Lv50 / Lv90 各 −0.5s（钓鱼按主产鱼种的精通）
function primarySpecies(entry) { return (entry.drops && entry.drops[0]) ? entry.drops[0].item : null; }
function effGatherTime(skill, entryId, p) {
  const data = GATHERING_DATA[skill]; if (!data) return 5;
  const e = data.entries.find(x => x.id === entryId); if (!e) return 5;
  let masterId = entryId;
  if (skill === 'fishing') masterId = primarySpecies(e);   // 钓鱼精通按鱼种
  const m = p.mastery[skill];
  const mlv = (m && m.entries[masterId]) ? m.entries[masterId].lv : 1;
  let t = e.time || 5;
  if (mlv >= 50) t -= 0.5;
  if (mlv >= 90) t -= 0.5;
  return Math.max(1, t);
}
// 精通池检查点（10/25/50/95）各 +3% 双倍产出（用「该技能平均精通等级/99」近似池进度）
function poolCheckpointBonus(skill, p) {
  const m = p.mastery[skill]; if (!m) return 0;
  let sum = 0, n = 0;
  for (const k in m.entries) { sum += m.entries[k].lv; n++; }
  if (!n) return 0;
  const pct = (sum / n) / 99;
  let b = 0;
  if (pct >= 0.10) b += 3;
  if (pct >= 0.25) b += 3;
  if (pct >= 0.50) b += 3;
  if (pct >= 0.95) b += 3;
  return b;
}
// 双倍产出概率：精通等级阶梯（Lv10~80 各+1%、Lv90 +1%、Lv99 +5%）+ 精通池检查点加成
function masteryDoubleChance(skill, id, p) {
  const m = p.mastery[skill]; if (!m || !m.entries[id]) return 0;
  const lv = m.entries[id].lv;
  let c = 0;
  for (const t of [10, 20, 30, 40, 50, 60, 70, 80]) if (lv >= t) c += 1;
  if (lv >= 90) c += 1;
  if (lv >= 99) c += 5;
  c += poolCheckpointBonus(skill, p);
  return Math.min(0.5, c / 100);   // 封顶 50%
}

const baseGameRulesConfig = {
  actions: ACTIONS,
  gatheringData: GATHERING_DATA,
  gatherSkillKey: GATHER_SKILL_KEY,
  discoverableEntries,
  skillXpNeed,
  masteryXpNeed,
  masteryDoubleChance,
  effectiveGatherTime: effGatherTime,
  constants: {
    fishMax: FISH_MAX,
    fishRecoverSeconds: FISH_RECOVER_SEC,
    moodMax: MOOD_MAX,
    moodRegenPerSecond: MOOD_REGEN_PER_SEC,
    yearSeconds: YEAR_SECONDS,
    lifespanBufferYears: 1,
    worldTickSeconds: 300
  }
};

const stage2RuntimeDeps = {
  GameRules: stage2Bootstrap.GameRules,
  gameRulesConfig: baseGameRulesConfig,
  Gathering: stage2Bootstrap.Gathering,
  Production: stage2Bootstrap.Production,
  Farm: stage2Bootstrap.Farm,
  Formations: stage2Bootstrap.Formations,
  SpiritBeasts: stage2Bootstrap.SpiritBeasts,
  GatheringContent: stage2Bootstrap.GatheringContent,
  RecipeContent: stage2Bootstrap.RecipeContent,
  HomesteadContent: stage2Bootstrap.HomesteadContent,
  Inventory: stage2Bootstrap.Inventory,
  Equipment: equipmentBootstrap.Equipment,
  SkillProgression: stage2Bootstrap.SkillProgression,
  GameRandom: stage2Bootstrap.GameRandom
};

function readGlobalApi(name) {
  if (!runtimeRoot) return null;
  const value = runtimeRoot[name];
  return value == null ? null : value;
}

function syncStage3CombatBootstrapFromGlobals() {
  stage3Bootstrap.Stage3Rules = readGlobalApi('Stage3Rules');
  stage3Bootstrap.CombatStats = readGlobalApi('CombatStats');
  stage3Bootstrap.CombatEngine = readGlobalApi('CombatEngine');
  stage3Bootstrap.CombatRewards = readGlobalApi('CombatRewards');
  stage3Bootstrap.CombatProgress = readGlobalApi('CombatProgress');
  teamCombatBootstrap.TeamCombatEngine = readGlobalApi('TeamCombatEngine');
  teamCombatBootstrap.TeamCombatSnapshot = readGlobalApi('TeamCombatSnapshot');
  teamCombatBootstrap.TeamCombatConsequences =
    readGlobalApi('TeamCombatConsequences');
}

function stage3CombatRuntimeReadyFromBootstrap() {
  for (let i = 0; i < stage3CombatRuntimeNames.length; i++) {
    if (stage3Bootstrap[stage3CombatRuntimeNames[i]] === null) return false;
  }
  // Team combat modules are optional enrichment for Stage3Rules.
  return true;
}

function buildSimulationRuntime() {
  // Until combat engines load, Stage4/5 wrap Stage2Rules as a Stage3 stand-in
  // so world/social lanes still run; refresh rebuilds with real Stage3Rules.
  const stage3RulesApi = useStage3CombatRuntime
    ? stage3Bootstrap.Stage3Rules
    : stage2Bootstrap.Stage2Rules;
  const combatDeps = {
    Stage3Rules: stage3RulesApi,
    Stage2Rules: stage2Bootstrap.Stage2Rules,
    CombatEngine: stage3Bootstrap.CombatEngine,
    TeamCombatEngine: teamCombatBootstrap.TeamCombatEngine,
    TeamCombatSnapshot: teamCombatBootstrap.TeamCombatSnapshot,
    TeamCombatConsequences: teamCombatBootstrap.TeamCombatConsequences,
    CombatProgress: stage3Bootstrap.CombatProgress,
    Techniques: stage3Bootstrap.Techniques
  };
  {
    return stage5Bootstrap.Stage5Rules.create(Object.assign(
      {
        Stage4Rules: stage4Bootstrap.Stage4Rules,
        SocialInteractionContent:
          stage4Bootstrap.SocialInteractionContent
      },
      combatDeps,
      stage2RuntimeDeps
    ));
  }

}

function refreshStage3CombatRuntime() {
  syncStage3CombatBootstrapFromGlobals();
  useStage3CombatRuntime = stage3CombatRuntimeReadyFromBootstrap();
  activeSimulationRuntime = buildSimulationRuntime();
  return useStage3CombatRuntime;
}

let activeSimulationRuntime = null;
refreshStage3CombatRuntime();
const simulationRuntime = Object.freeze({
  get rules() { return activeSimulationRuntime.rules; },
  get lanes() { return activeSimulationRuntime.lanes; }
});
if (runtimeRoot) {
  runtimeRoot.refreshStage3CombatRuntime = refreshStage3CombatRuntime;
}

const stage2ProductionQuery = stage2Bootstrap.Production.create({
      RecipeContent: stage2Bootstrap.RecipeContent,
      Inventory: stage2Bootstrap.Inventory,
      SkillProgression: stage2Bootstrap.SkillProgression,
      GameRandom: stage2Bootstrap.GameRandom,
      Equipment: equipmentBootstrap.Equipment
    });

function resName(k) {
  return ({ yaocai: '药材', lingkuang: '灵矿', muliao: '木料', shicai: '食材', faqi: '法器', hujia: '护甲', shanshi: '膳食', fu: '符箓', caiqing: '才情',
            tupo: '筑基丹', heal: '疗伤丹', jindan: '金丹丹', yuanying: '元婴丹', huashen: '化神丹', lianxu: '炼虚丹', heti: '合体丹', dasheng: '大乘丹' })[k] || k;
}
// 解析采集系动作 key：
//   探索：gather:explore:<skill>  → {mode:'explore', skill}
//   采集：gather:<skill>:<entryId> → {mode:'gather', skill, entryId}
function parseGatherKey(key) {
  const parts = key.split(':');           // ['gather', A, B]
  const a = parts[1], b = parts[2];
  if (a === 'explore') return { mode: 'explore', skill: b, entryId: null };
  return { mode: 'gather', skill: a, entryId: b };
}

// 设为当前动作（梅尔沃式·一次只做一件事）：替换旧动作，不后台排队

// 性能采样：URL 带 ?perf=1 时每 5s 打一次 advance/ui/frame 均值。

// 突破率：基础概率 + 持有突破丹加成（每颗 +20%，封顶 95%）
// 兼容性/测试占位：仅在「未加载 stage3 脚本」(useStage3Runtime=false) 时由 tryBreakthrough 旧分支使用。
// 生产环境 useStage3Runtime=true，突破概率与门槛由权威模块 core/breakthrough.js 处理
// （概率严格只来自：境界基础 baseChance + 突破丹每颗+20% + 事件增益；禁用来源零参与；
//  且强制校验突破任务门槛 completedGates，失败仅散尽修为、门槛永久保留）。
function breakthroughRate(p, st) {
  const cur = REALM_TABLE[st];
  const danBonus = cur.dan
    ? (p.inventory.stacks[cur.dan] || 0) * 0.20
    : 0;
  return Math.min(0.95, (cur.baseRate || 0) + danBonus);
}
// 突破成功后：刷新 realm/breakNeed/shouMax，并按新境界上限刷新寿元（续命）

// 境界突破（§5 新规则）
// 生产走 useStage3Runtime 分支 → commandAttemptBreakthrough → core/breakthrough.js（权威路径，已合规）。
// 以下 else 分支为「未加载 stage3 脚本」时的兼容/测试占位（旧概率判定），请勿在生产依赖。
const tryBreakthrough = function tryBreakthrough() {
  if (isPersistenceLocked()) return false;
  {
    const authoritative = commandAttemptBreakthrough({
      pillItemId: null,
      quantity: 0
    });
    return !!(
      authoritative &&
      authoritative.ok &&
      authoritative.changed &&
      authoritative.data &&
      authoritative.data.result === 'success'
    );
  }

};

function cloneRuntimeState(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

// 查询模型缓存必须在 applyModelToRuntime 之前初始化（启动读档会立刻调用）。
let queryModelFrameId = -1;
let queryModelFrameCache = null;
let queryModelRenderFrame = 0;
let queryModelTTLCache = null;
let queryModelTTLAt = 0;
const QUERY_MODEL_TTL_MS = 500;

function beginQueryModelFrame() {
  queryModelRenderFrame++;
  queryModelFrameCache = null;
  queryModelFrameId = queryModelRenderFrame;
}

function invalidateQueryModelCache() {
  queryModelFrameCache = null;
  queryModelTTLCache = null;
  queryModelTTLAt = 0;
}

function stage2QueryModel() {
  if (queryModelFrameCache &&
      queryModelFrameId === queryModelRenderFrame) {
    return queryModelFrameCache;
  }
  const now = Date.now();
  if (queryModelTTLCache &&
      (now - queryModelTTLAt) < QUERY_MODEL_TTL_MS) {
    queryModelFrameCache = queryModelTTLCache;
    queryModelFrameId = queryModelRenderFrame;
    return queryModelTTLCache;
  }
  // Combat loadouts 严检若拒收 queryView，由 queryCombatLoadouts 单次回退 fromRuntime；
  // 战斗热路径禁止每帧全量 normalize。
  const model = typeof StateModel.queryView === 'function'
    ? StateModel.queryView(state, state.processedThroughMs)
    : StateModel.fromRuntime(state, state.processedThroughMs);
  queryModelFrameCache = model;
  queryModelFrameId = queryModelRenderFrame;
  queryModelTTLCache = model;
  queryModelTTLAt = now;
  return model;
}

const applyModelToRuntime = function applyModelToRuntime(model, options) {
  invalidateQueryModelCache();
  StateModel.applyToRuntime(state /* runtime */, model, options || null);
  state.parts = normalizeParts(
    model.appearance && model.appearance.parts,
    state.gender
  );
  state.player = state.player ? ensurePlayer(state.player) : null;
  state.offlineResult = null;
  state.showOffline = typeof SimulationReport !== 'undefined' &&
    SimulationReport &&
    typeof SimulationReport.isMeaningfulOfflineReports === 'function'
    ? SimulationReport.isMeaningfulOfflineReports(state.pendingOfflineReports)
    : state.pendingOfflineReports.length > 0;
};

// 离线结算最短间隔门槛：离线时长不足该值时，启动时不弹「离线结算」弹窗，
// 避免用户快速刷新网页（只离开几秒/几十秒）也误弹一次收益弹窗。
// 语义为「至少 1 分钟」：offlineSeconds >= 60 才结算，60 秒整也算触发。

// 离线寿元/被动结算允许的最大回看窗口：与离线收益上限同级（默认 48 小时），
// 防止水位线损坏（如历史默认 0）时从纪元初一口气把寿元耗尽。

// 长离线结算可能数百毫秒～数十秒：先出游戏壳与「结算中」提示，再分帧追算，
// 避免启动期长时间白屏。短间隔（<1 分钟）仍同步走完，无感知。

function commandResult(ok, code, changed, message, data) {
  return Object.freeze({
    ok: !!ok,
    code: String(code),
    changed: !!changed,
    message: message == null ? null : String(message),
    data: data == null ? null : StateModel.readonly(data)
  });
}

function replaceCandidateModel(candidate, nextModel) {
  Object.keys(candidate).forEach(function (field) {
    delete candidate[field];
  });
  Object.keys(nextModel).forEach(function (field) {
    candidate[field] = nextModel[field];
  });
}

function copyReportMap(target, source) {
  if (!source || typeof source !== 'object') return;
  Object.keys(source).forEach(function (key) {
    const value = source[key];
    if (Number.isFinite(value) && value !== 0) {
      target[key] = value;
    }
  });
}

function archiveImmediateReport(
  candidate,
  commandKey,
  gains,
  costs,
  seedBefore,
  now
) {
  const existingIds = new Set(
    candidate.reportArchive.map(function (report) {
      return report.id;
    })
  );
  let sequence = 1;
  let report;
  do {
    const actionKey = 'command:' + commandKey +
      (sequence === 1 ? '' : '#' + sequence);
    report = SimulationReport.create({
      source: 'command',
      fromMs: now,
      toMs: now,
      requestedSeconds: 0,
      actionKey,
      seedBefore
    });
    sequence++;
  } while (existingIds.has(report.id));
  report.action.completed = 1;
  const gainSource = gains || {};
  const costSource = costs || {};
  copyReportMap(report.gains.items, gainSource.items);
  copyReportMap(report.gains.skillXp, gainSource.skillXp);
  copyReportMap(report.gains.masteryXp, gainSource.masteryXp);
  copyReportMap(report.techniques.xp, gainSource.techniqueXp);
  if (Number.isFinite(gainSource.cultivation)) {
    report.gains.cultivation = gainSource.cultivation;
  }
  copyReportMap(report.costs.items, costSource.items);
  copyReportMap(report.costs.supplies, costSource.supplies);
  candidate.reportArchive = SimulationReport.archive(
    candidate.reportArchive,
    [report],
    50
  );
  return candidate.reportArchive[candidate.reportArchive.length - 1];
}

const STAGE2_FAILURE_MESSAGES = Object.freeze({
  inventory: Object.freeze({
    unknown_item: '未知物品',
    invalid_quantity: '数量无效',
    unsaleable_item: '该物品不可出售',
    insufficient_items: '物品数量不足',
    item_bound: '物品已绑定，无法出售',
    invalid_inventory: '背包状态异常'
  }),
  farm: Object.freeze({
    invalid_model: '灵田状态异常',
    plot_not_found: '未找到该灵田',
    plot_locked: '该灵田尚未解锁',
    invalid_crop: '未知作物',
    plot_occupied: '该灵田已有作物',
    skill_locked: '种植等级不足',
    insufficient_seed: '种子不足',
    crop_not_ready: '作物尚未成熟',
    inventory_full: '背包已满',
    invalid_inventory: '背包状态异常',
    invalid_rng: '采收随机状态异常',
    invalid_progression: '种植进度异常'
  }),
  formation: Object.freeze({
    invalid_slot: '阵位参数无效',
    invalid_formation: '未知阵法',
    invalid_state: '阵法状态异常',
    slot_locked: '该阵位尚未解锁',
    already_equipped: '该阵法已装备',
    item_unavailable: '阵法物品不足',
    slot_empty: '该阵位为空',
    inventory_check_failed: '背包状态异常',
    inventory_bind_failed: '阵法绑定失败',
    inventory_unbind_failed: '阵法解绑失败'
  }),
  beast: Object.freeze({
    invalid_model: '灵兽状态异常',
    invalid_beast: '灵兽参数无效',
    beast_not_found: '未找到该灵兽'
  })
});

function stage2Failure(domain, code, fallback, changed) {
  const table = STAGE2_FAILURE_MESSAGES[domain] || {};
  return commandResult(
    false,
    code || 'domain_failure',
    changed === true,
    table[code] || fallback,
    null
  );
}

function stage3Failure(code, fallback) {
  const messages = {
    invalid_state: '战斗数据异常',
    invalid_name: '方案名称无效',
    duplicate_name: '方案名称重复',
    loadout_limit: '最多保存五套战斗方案',
    loadout_not_found: '未找到战斗方案',
    last_loadout: '至少保留一套战斗方案',
    combat_active: '战斗中无法编辑当前方案',
    invalid_equipment_slot: '装备槽位无效',
    equipment_type_mismatch: '装备类型不匹配',
    invalid_supply_slot: '补给槽位无效',
    supply_type_mismatch: '补给类型不匹配',
    invalid_supply_config: '补给设置无效',
    invalid_slot_index: '功法槽位无效',
    technique_type_mismatch: '功法类型不匹配',
    technique_not_learned: '尚未学会该功法',
    duplicate_technique: '同一方案不能重复配置该功法',
    invalid_condition: '功法条件无效',
    item_unavailable: '物品数量不足',
    invalid_technique_book: '未知功法书',
    realm_requirement: '境界尚未达到功法要求',
    no_pending_loot: '没有待领取战利品',
    inventory_full: '背包空间不足',
    no_injury: '当前没有重伤',
    insufficient_items: '物品数量不足',
    item_bound: '物品已绑定',
    insufficient_cultivation: '修为不足',
    gate_incomplete: '永久突破门槛尚未完成',
    highest_realm: '已是最高境界',
    pill_mismatch: '突破丹与当前境界不匹配',
    invalid_pills: '突破丹选择无效',
    invalid_rng_seam: '随机状态异常'
  };
  return commandResult(
    false,
    code || 'domain_failure',
    false,
    messages[code] || fallback || '操作失败',
    null
  );
}

const STAGE4_MESSAGES = Object.freeze({
  person_not_found: '未找到这位修士',
  interaction_locked: '当前尚未解锁这项互动',
  gift_unavailable: '没有可赠送的物品',
  social_progress_busy: '与对方的事情尚未结束',
  event_not_found: '这件事已经不在待处理列表中',
  option_not_found: '未找到这个选择',
  pending_removed: '待决策已移除，请在宗门页直接加入或离开',
  pending_capacity: '待处理事件已满',
  event_effect_invalid: '事件内容暂时无法结算',
  sect_requirement_failed: '尚未满足宗门要求',
  choice_locked: '暂时无法选择宗门',
  action_required: '暂时无法选择宗门',
  cooldown: '暂时无法选择宗门',
  unknown_sect: '未找到这座宗门',
  already_joined: '你已有宗门身份',
  lifespan_buffer: '寿元不足，请先完成传承或开启新身份',
  not_in_sect: '你尚未加入宗门',
  unknown_mission: '未找到这项宗门任务',
  mission_busy: '已有进行中的宗门任务',
  mission_done: '这项宗门任务已经完成',
  materials_short: '上交物资不足',
  combat_incomplete: '尚未完成对应战斗挑战',
  no_active_mission: '当前没有进行中的宗门任务',
  not_combat_step: '当前步骤不是战斗挑战',
  unknown_offer: '藏宝阁中没有这项功法',
  already_learned: '你已学会该功法',
  rank_locked: '宗门地位不足，无法兑换',
  contribution_short: '宗门贡献不足',
  promotion_locked: '尚未达到晋升条件',
  realm_requirement: '修为境界不足'
});

function stage4Code(code) {
  const aliases = {
    unknown_person: 'person_not_found',
    person_unavailable: 'person_not_found',
    person_busy: 'social_progress_busy',
    gift_required: 'gift_unavailable',
    unknown_event: 'event_not_found',
    unknown_option: 'option_not_found',
    invalid_effect: 'event_effect_invalid',
    unknown_effect: 'event_effect_invalid',
    sect_requirement: 'sect_requirement_failed'
  };
  return aliases[code] || code || 'event_effect_invalid';
}

function stage4Failure(code, fallback) {
  const publicCode = stage4Code(code);
  return commandResult(
    false,
    publicCode,
    false,
    STAGE4_MESSAGES[publicCode] || fallback || '操作未完成',
    null
  );
}

function safeInputData(value, ancestors) {
  if (value === null ||
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      typeof value === 'undefined') {
    return true;
  }
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  ancestors = ancestors || new Set();
  if (ancestors.has(value)) return false;
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  let keys;
  try {
    keys = Reflect.ownKeys(value);
  } catch (error) {
    return false;
  }
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    if (typeof key !== 'string') return false;
    if (Array.isArray(value) && key === 'length') continue;
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch (error) {
      return false;
    }
    if (!descriptor ||
        descriptor.enumerable !== true ||
        !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
        !safeInputData(descriptor.value, nextAncestors)) {
      return false;
    }
  }
  return true;
}

function safeInputFields(input, fields) {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return null;
    }
    if (!safeInputData(input) ||
        !runtimeRoot ||
        typeof runtimeRoot.structuredClone !== 'function') {
      return null;
    }
    runtimeRoot.structuredClone(input);
    const keys = Reflect.ownKeys(input);
    if (keys.some(function (key) {
      return typeof key !== 'string' || fields.indexOf(key) < 0;
    })) {
      return null;
    }
    const result = {};
    for (let index = 0; index < fields.length; index++) {
      const key = fields[index];
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !Object.prototype.hasOwnProperty.call(
        descriptor,
        'value'
      )) {
        return null;
      }
      result[key] = descriptor.value;
    }
    return result;
  } catch (error) {
    return null;
  }
}

// 常驻顶部状态栏 — 全屏顶层栏（§10 ① 三段式之一）
// 横跨整个屏幕宽度（x=0, w=W），在左侧导航之上绘制，属于最高层 UI
// 标准手游 HUD：[独立头像列] ‖ [上行:名字+资源] / [下行:境界标签+经验条+突破]
// HUD 内容区固定高度（与 safeTop 无关），整体下移 safeTop 避让刘海

// 7. 游戏主界面内容区（洞府首页 / 其他占位）

// 洞府首页：境界信息 + 快捷入口（§5 / §10⑤）
// 动作进度条已移到对应技艺页的行为卡上（梅尔沃式），洞府不再显示
// 立绘已移入顶栏左侧小头像，主内容区不再显示大图

// 突破内容（§5 界面）：境界 + 寿元条 + 修为条 + 突破条件/概率清单 + 大突破按钮
// bottomLimit：内容底限 Y（弹窗模式下传面板底边，避免按钮溢出）

// 突破弹窗（替代独立『突破』页签）：点顶栏突破按钮弹出，半透明遮罩 + 居中面板

// 轮回结算页（寿元耗尽）：全屏覆盖，点「入轮回」重开（保留外观）

// 入轮回：重置角色档案（修为/境界/资源/寿元回初始），保留外观

// 技艺页（梅尔沃式：标题 + 等级 + XP 条 + 描述 + 动作卡片网格）
// 梅尔沃式行为卡：图标 + 名称 + 等级/耗时/经验 + 产出消耗 + 进行中进度条

// 采集系竖向卡片（探索 / 资源点 / 钓点），与截图 UI 排版保持一致

// ── 内容区滚动辅助 ──
// 进入可滚动区块：裁剪到可视区、夹取偏移，返回当前偏移量（设计坐标 px）。
// 调用方用 drawY = baseY - offset 摆放卡片并注册点击区，使点击坐标与视觉一致。

// 上/下「还有更多」淡紫提示箭头

// 采集系技艺页（采矿/伐木/钓鱼/采药）：竖向卡片网格

// 储物袋页（资源网格）

// 离线收益结算面板（全屏覆盖）

// 创建 / 编辑角色界面（全屏，无左侧导航；所有部位选择器同页铺开）

// 用 Canvas 直接画实心三角箭头（不依赖字体字形 → 真机不会乱码）
// dir: 'left' 尖朝左 / 'right' 尖朝右；half=垂直半高

// 全部部位选择器同页铺开：左侧类型名 + 左右三角箭头切换（整体水平居中，手机触摸友好）

// 通用占位页：标题卡（对齐洞府境界卡）+ 居中空状态提示（事件/商城等先用）

// 8. 轻量 toast + 右下角收益飘字
let toastMsg = '', toastUntil = 0;
function toast(m) { toastMsg = m; toastUntil = Date.now() + 1800; if (window.UI && window.UI.showToast) window.UI.showToast(m); }

const GAIN_TIP_SKILL_LABELS = Object.freeze({
  herb: '采药',
  mining: '采矿',
  woodcutting: '伐木',
  fishing: '钓鱼',
  alchemy: '炼丹',
  forging: '炼器',
  cooking: '烹饪',
  talisman: '符箓',
  liandan: '炼丹',
  lianqi: '炼器',
  fulu: '符箓',
  chuyi: '烹饪',
  caiyao: '采药',
  caiju: '采矿',
  famu: '伐木',
  diaoyu: '钓鱼',
  charm: '魅力',
  beastTaming: '御兽'
});

function gainTipSkillLabel(skillId) {
  const id = String(skillId || '');
  if (GAIN_TIP_SKILL_LABELS[id]) return GAIN_TIP_SKILL_LABELS[id];
  if (SKILL_TITLE[id]) return SKILL_TITLE[id];
  return id || '技能';
}

function appendGainTipMap(entries, map, type, keyPrefix, labelForKey) {
  if (!map || typeof map !== 'object') return;
  Object.keys(map).forEach(function (id) {
    const amount = Number(map[id]);
    if (!Number.isFinite(amount) || amount === 0) return;
    const tip = {
      key: keyPrefix + id,
      type: type,
      amount: amount,
      label: labelForKey ? labelForKey(id) : id
    };
    if (type === 'item') tip.itemId = id;
    entries.push(tip);
  });
}

function publishGainTipsFromReport(report) {
  if (!report || report.source !== 'online') return;
  if (!window.UI || typeof window.UI.pushGainTips !== 'function') return;
  const entries = [];
  const gains = report.gains || {};
  const gainItems = gains.items && typeof gains.items === 'object'
    ? gains.items
    : {};
  appendGainTipMap(
    entries,
    gainItems,
    'item',
    'item:',
    function (itemId) {
      return stage3ItemDisplayName(itemId);
    }
  );
  appendGainTipMap(
    entries,
    gains.skillXp,
    'skillXp',
    'skillXp:',
    gainTipSkillLabel
  );
  const cultivation = Number(gains.cultivation);
  if (Number.isFinite(cultivation) && cultivation > 0) {
    entries.push({
      key: 'cultivation',
      type: 'cultivation',
      amount: cultivation,
      label: '修为'
    });
  }
  const techniques = report.techniques && report.techniques.xp;
  appendGainTipMap(
    entries,
    techniques,
    'techniqueXp',
    'techniqueXp:',
    stage3TechniqueDisplayName
  );
  const combat = report.combat || {};
  appendGainTipMap(
    entries,
    combat.enemiesDefeated,
    'kill',
    'kill:',
    combatEnemyDisplayName
  );
  if (combat.loot && typeof combat.loot === 'object') {
    Object.keys(combat.loot).forEach(function (itemId) {
      if (Object.prototype.hasOwnProperty.call(gainItems, itemId)) return;
      const amount = Number(combat.loot[itemId]);
      if (!Number.isFinite(amount) || amount === 0) return;
      entries.push({
        key: 'item:' + itemId,
        type: 'item',
        amount: amount,
        label: stage3ItemDisplayName(itemId),
        itemId: itemId
      });
    });
  }
  if (entries.length) window.UI.pushGainTips(entries);
  const socialCompleted = report.social &&
    Array.isArray(report.social.completed)
    ? report.social.completed
    : [];
  if (socialCompleted.length && typeof toast === 'function') {
    socialCompleted.forEach(function (entry) {
      if (!entry) return;
      const text = entry.narrative || entry.label;
      if (!text) return;
      toast(text + '（可在人物「经历」查看）');
    });
  }
}

// 后台定时器句柄：标签页最小化 / App 切后台时，浏览器会暂停 requestAnimationFrame，
// 主循环不再推进 → 游戏时钟冻结 → 重伤恢复倒计时等「实时减益 / 冷却」会卡住不动。
// 这里挂一个粗粒度（1s）后台定时器，按真实墙钟时间持续推进游戏时钟，
// 让重伤恢复等实时状态在最小化期间照常生效。
// 离线收益弹窗仍只在「完全重新加载页面」时触发（settleStartupOffline），
// 后台期间推进的 processedThroughMs 会随自动存档落盘，重载时离线区间自然变小，不会重复结算。

// 后台持续推动游戏时钟：跳过 _hiddenAt 守卫，直接走 advanceGameplay，
// 让模拟管线（含 injuryRecoveryLane）按真实经过时间推进。

// 9. 主循环（rAF，无死循环）
function render() {
  const now = Date.now();
  const frameStarted = PerfStats.enabled ? now : 0;

  // 主循环防护：任何一帧（引擎/合成/UI）抛异常都绝不允许中断 requestAnimationFrame，
  // 否则单帧错误会令整个游戏卡死（敌人刷出后双方不再出手 = 僵持）。
  // 每个子系统独立 try/catch，出错只记录堆栈、不向上抛，保证循环永远续帧。
  try {
    // 所有 wall-clock 推进都通过唯一 runtime adapter。
    runRuntimeFrame(now);
  } catch (err) {
    console.error('[render] runtime frame error:', err && err.stack ? err.stack : err);
  }

  // 仅开新查询帧；不要每帧清 TTL——否则 stage2QueryModel 跨帧缓存形同虚设。
  // 写路径（applyModelToRuntime / persist）会自行 invalidate。
  beginQueryModelFrame();

  const uiDriven = !!(window.UI && window.UI.renderGame);
  const gamePhase = state.phase === 'game';

  try {
    if (state.dirty) composite();        // 仅变化时合成一次
    // 游戏态 UI 已全屏盖住主 canvas（立绘在头像小画布），跳过每帧清屏填天空。
    if (!(uiDriven && gamePhase)) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ph = canvas.height / dpr;
      if (!bgGrad || bgGradH !== ph) {
        bgGrad = ctx.createLinearGradient(0, 0, 0, ph);
        const sky = readSkyColors();
        bgGrad.addColorStop(0, sky.top);
        bgGrad.addColorStop(1, sky.bottom);
        bgGradH = ph;
      }
      ctx.clearRect(0, 0, canvas.width / dpr, ph);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width / dpr, ph);
      var v = Platform.view;
      ctx.setTransform(dpr * v.scale, 0, 0, dpr * v.scale, v.offsetX * dpr, v.offsetY * dpr);
    }
  } catch (err) {
    console.error('[render] canvas compose error:', err && err.stack ? err.stack : err);
  }

  // === UI 渲染分派 ===
  // 架构定稿：UI（顶栏/导航/内容/弹窗/toast）全部由 DOM 浮层 ui.js 负责；
  // Canvas 只画「游戏世界」（此处角色立绘已在头像小画布内渲染）。
  try {
    if (uiDriven) {
      const uiStarted = PerfStats.enabled ? Date.now() : 0;
      window.UI.renderGame();
      if (PerfStats.enabled) {
        PerfStats.sample('ui', Date.now() - uiStarted);
      }
    }
  } catch (err) {
    console.error('[render] UI.renderGame error:', err && err.stack ? err.stack : err);
  }

  if (PerfStats.enabled) {
    PerfStats.sample('frame', Date.now() - frameStarted);
  }
  requestAnimationFrame(render);
}

// 10. 交互逻辑

const save = function save() {
  if (isPersistenceLocked()) return false;
  if (!persistSafely()) {
    setPersistenceIssue({
      kind: 'save',
      message: '保存失败，请重试',
      successMessage: '已保存'
    });
    return false;
  }
  toast('已保存');
  return true;
};

// 首次创建角色：落档外观 + 创建标记 + 角色档案，然后进入主游戏

// 11. 启动（屏幕适配由 platform.js 统一管理：宽度优先 + 动态高度）
//    Platform.view.scale / logicalH / offsetX / offsetY 由 resize() 自动计算。
//    此处只读 Platform.view 拿参数，并执行读档/状态初始化。
const DW = 420, DH = 820;
const bootGame = function bootGame() {
  Platform.getSystemInfoAsync({
    success(res) {
      var v = Platform.view;
      dpr = v.dpr || res.pixelRatio || 1;
      safeTop = v.safeTop || (res.safeArea ? res.safeArea.top : 0);
      S = v.scale || 1;                        // 等比缩放（platform.js 已算好）
      W = DW; H = v.logicalH || DH;            // 逻辑宽度固定 420，高度随屏幕动态
      scale = 1;                               // 字体由 transform 缩放，不双重缩放

      let startupRenderStarted = false;
      function startStartupRender() {
        if (startupRenderStarted) return;
        startupRenderStarted = true;
        requestAnimationFrame(render);
      }
      function holdStartupContent(error) {
        state._persistenceIssue = {
          kind: 'content', message: '游戏数据加载失败，请检查网络后重试',
          error: String(error && error.message || error), canRetry: true
        };
        state._startupRetry = beginStartupContent;
        startStartupRender();
      }
      function beginStartupAfterContent() {
        try {
          refreshStage3CombatRuntime();
          const now = Date.now();
          const loaded = SaveSystem.load(Platform, now);
          if (snapshotNeedsCombatRuntime(loaded.snapshot) &&
              typeof LazyContent !== 'undefined' && LazyContent &&
              typeof LazyContent.ensureCombatRuntime === 'function') {
            LazyContent.ensureCombatRuntime().then(function () {
              finishStartupWithSave(loaded, now);
            }, holdStartupContent);
          } else {
            finishStartupWithSave(loaded, now);
          }
        } catch (error) {
          holdStartupContent(error);
        }
      }
      function beginStartupContent() {
        // Only the explicit Node harness drives its own model and clock.
        if (runtimeRoot && runtimeRoot.window !== runtimeRoot &&
            runtimeRoot.__GAME_TEST_HARNESS_REQUEST__ === true) return;
        state._persistenceIssue = {
          kind: 'content', message: '正在加载游戏数据…', canRetry: false
        };
        state._startupRetry = null;
        const ready = typeof LazyContent !== 'undefined' && LazyContent &&
          typeof LazyContent.ensureHerblore === 'function'
          ? LazyContent.ensureHerblore() : null;
        if (ready) ready.then(beginStartupAfterContent, holdStartupContent);
        else beginStartupAfterContent();
      }

      function finishStartupWithSave(loaded, now) {
        state._startupRetry = null;
        if (state._persistenceIssue && state._persistenceIssue.kind === 'content') {
          state._persistenceIssue = null;
        }
        const save = loaded.snapshot;
        const model = normalizeStartupModel(save, now);
        applyModelToRuntime(model);
        const playerModel = model.player
          ? cloneRuntimeState(model.player)
          : null;
        if (playerModel &&
            save.player &&
            !Object.prototype.hasOwnProperty.call(save.player, 'shouyuan')) {
          delete playerModel.shouyuan;
        }
        if (playerModel &&
            save.player &&
            !Object.prototype.hasOwnProperty.call(save.player, 'shouMax')) {
          delete playerModel.shouMax;
        }
        state.player = playerModel ? ensurePlayer(playerModel) : null;
        state.phase = state.created && state.player ? 'game' : 'create';
        state.navIndex = NAV_HOME;
        state.gender = 'g';   // 玩家角色恒为女性；男性仅供 NPC 自动生成

        if (loaded.writeProtected) {
          state._persistenceIssue = {
            kind: 'future',
            message: '存档版本高于当前游戏，已进入只读保护',
            error: 'future-schema',
            canRetry: false
          };
        } else if (loaded.needsRepair) {
          if (!persistModel(model, save.savedAt)) {
            persistenceRecovery.hold({
              kind: 'repair',
              message: '存档修复保存失败，请重试',
              savedAt: save.savedAt,
              now,
              candidate: model,
              resumeStartupAt: now
            });
          } else {
            scheduleStartupOfflineSettle(
              SaveSystem.load(Platform, now).snapshot,
              now
            );
          }
        } else {
          scheduleStartupOfflineSettle(save, now);
        }

        state._last = now;
        state._hiddenAt = null;
        state._nextAutosaveAt = now + 30000;
        window.addEventListener('pagehide', () => flushLifecycle(Date.now()));
        window.addEventListener('beforeunload', () => flushLifecycle(Date.now()));
        document.addEventListener('visibilitychange', () => {
          handleVisibilityChange(!!document.hidden, Date.now());
        });
        state.dirty = true;
        // 折中态：仅预创建广告对象（mock 环境下为本地假广告），不展示、不发奖。
        // 任何环节缺失都不报错，绝不影响主流程。
        if (window.AdManager && window.AdManager.init) {
          try { window.AdManager.init(); } catch (e) { /* 广告桥接异常不阻塞游戏 */ }
        }
        // 已有存档进游戏：后台预取导航页 UI / 游戏样式，与首帧并行。
        if (state.phase === 'game' &&
            typeof LazyContent !== 'undefined' && LazyContent) {
          if (typeof LazyContent.ensureUiPages === 'function') {
            LazyContent.ensureUiPages().catch(function () { /* 页模块失败不阻塞启动 */ });
          }
          if (typeof LazyContent.ensureGameStyles === 'function') {
            LazyContent.ensureGameStyles().catch(function () { /* 样式失败不阻塞启动 */ });
          }
        }
        startStartupRender();
      }

      beginStartupContent();
    }
  });
};

// ── 暴露给 ui.js（DOM 界面控制器）的接口 ──
// 集中一处，避免 UI 层散写游戏内部变量。UI 只通过 GameAPI 调游戏逻辑。
// 渲染所需的「数据 + 计算」也在此集中（单一数据源，避免 UI 重抄游戏规则）。

function getPlayer() { return ensurePlayer(state.player); }

// 顶栏信息（名字 / 4 资源药丸 / 境界 / 经验条 / 突破可否）
function getTopInfo() {
  const p = getPlayer();
  const st = p.realmStage || 0;
  const cur = REALM_TABLE[st] || REALM_TABLE[0];
  let calendarLabel = '';
  if (stage4Bootstrap && stage4Bootstrap.WorldMonth &&
      typeof stage4Bootstrap.WorldMonth.calendarLabel === 'function' &&
      typeof stage4Bootstrap.WorldMonth.ensureCalendar === 'function') {
    try {
      const model = stage2QueryModel();
      if (model && model.systems && model.systems.world) {
        const cal = stage4Bootstrap.WorldMonth.ensureCalendar(
          model.systems.world
        );
        calendarLabel = stage4Bootstrap.WorldMonth.calendarLabel(cal) || '';
      }
    } catch (error) {
      calendarLabel = '';
    }
  }
  return {
    name: p.name, realm: p.realm, xiwei: p.xiwei, need: cur.need,
    shouyuan: p.shouyuan, shouMax: p.shouMax,
    pills: { mood: p.mood, jingqi: p.jingqi, lingshi: p.lingshi, shengwang: p.shengwang },
    lingyu: p.lingyu,   // 付费货币（仅商城展示，数据预留）
    calendarLabel: calendarLabel,
    canBreak: p.xiwei >= cur.need && (cur.dan ? (p.inventory.stacks[cur.dan] || 0) >= 1 : true)
  };
}

// 战斗中顶栏进度缓存：过场/间歇帧（enemy 为 null）复用上一帧，避免 100%↔0% 瞬跳闪烁。
let lastCombatHomeProgress = 0;

// 战斗中顶栏进度：以「当前敌人被削血比例」反映即时打击进度（稳定、不抽搐）。
// 区域战斗（无限刷）与秘境战斗（多波次）统一用此即时值；
// 单只击败后的过场/间歇帧（enemy 为 null）复用上一帧，避免进度条回弹闪烁。
function combatHomeProgress(session) {
  if (!session || typeof session !== 'object') return 0;
  const enemy = session.enemy;
  let p;
  if (enemy && Number.isFinite(enemy.maxHp) && enemy.maxHp > 0 &&
      Number.isFinite(enemy.hp)) {
    p = 1 - Math.max(0, enemy.hp) / enemy.maxHp;
  } else {
    p = lastCombatHomeProgress;
  }
  p = Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
  lastCombatHomeProgress = p;
  return p;
}

// 洞府首页：当前行动
function getHomeInfo() {
  const p = getPlayer();
  const cur = state.current;
  let progress = 0;
  let isCombatView = false;
  if (cur) {
    const key = cur.key;
    const isCombat = typeof key === 'string' && key.indexOf('combat:') === 0;
    if (isCombat) {
      // 战斗中：进度来自 stage3 战斗会话，而非「动作时长」模型。
      isCombatView = true;
      const sess = state.systems &&
        state.systems.combat &&
        state.systems.combat.session;
      if (sess) progress = combatHomeProgress(sess);
      // session 尚未建立的首帧：进度保持 0，下一帧起正常推进
    } else {
      // 非战斗：stage2 模式走运行时实时取时长；非 stage2 回退旧 ACTIONS 表。
      let duration = 0;
      {
        duration = stage2RuntimeActionDuration(stage2QueryModel(), cur.key);
      }
      if (!duration &&
          typeof ACTIONS !== 'undefined' && ACTIONS[cur.key] && ACTIONS[cur.key].time) {
        duration = ACTIONS[cur.key].time;
      }
      const elapsed = stage2Elapsed(cur);
      if (duration > 0) progress = Math.min(1, elapsed / duration);
    }
  }
  // 离开战斗：重置缓存，避免下次战斗承接旧进度
  if (!cur || !cur.key || cur.key.indexOf('combat:') !== 0) {
    lastCombatHomeProgress = 0;
  }
  return {
    realm: p.realm,
    current: cur
      ? {
          name: actionDisplayName(
            cur.key,
            null,
            null,
            stage2QueryModel
          ),
          stalled: !!cur.stalled,
          progress: progress,
          combat: isCombatView
        }
      : null
  };
}

// 储物袋：固定资源 + 采集系细粒度物品（数量>0 才显示）

// 突破弹窗：罗列条件 + 概率 + 可否突破（等价逻辑见 getBreakInfo）
function getBreakInfo() {
  const p = getPlayer();
  const st = p.realmStage || 0;
  const cur = REALM_TABLE[st]; if (!cur) return null;
  const canMinor = cur.tier === 'minor';
  const haveDan = cur.dan ? (p.inventory.stacks[cur.dan] || 0) >= 1 : true;
  const rate = breakthroughRate(p, st);
  const lines = [];
  lines.push({ ok: p.xiwei >= cur.need, text: '修为≥' + cur.need });
  if (cur.dan) lines.push({ ok: haveDan, text: '持' + (DAN_NAME[cur.dan] || '突破丹') + '×1（突破率+' + Math.round((p.inventory.stacks[cur.dan] || 0) * 20) + '%）' });
  if (!canMinor) {
    lines.push({ ok: true, text: '渡劫成功（概率 ' + Math.round(rate * 100) + '%）' });
    lines.push({ ok: false, text: '失败清空全部修为（丹不消耗）' });
  } else {
    lines.push({ ok: true, text: '小阶·达标即自动突破（无风险）' });
  }
  const canBreak = p.xiwei >= cur.need && (cur.dan ? haveDan : true);
  return {
    realmName: cur.name, shouyuan: p.shouyuan, shouMax: p.shouMax,
    xiwei: p.xiwei, need: cur.need, canMinor, haveDan, rate, lines, canBreak
  };
}

// 技艺页动作卡信息（含实时进度）

// 采集系条目卡（探索卡 / 资源点卡）信息

function readonlyQuery(viewModel) {
  // Detach only this DTO, never the full simulation model. Queries may contain
  // selected nested fields; none may expose writable runtime references.
  if (viewModel == null) return viewModel;
  const view = JSON.parse(JSON.stringify(viewModel));
  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze(value[key]); });
    return Object.freeze(value);
  }
  return freeze(view);
}

function stage2Progress(player, skillId) {
  const skills = player && player.skills;
  const progress = skills && skills[skillId];
  return progress &&
    Number.isFinite(progress.level) &&
    Number.isFinite(progress.xp)
    ? progress
    : { level: 1, xp: 0 };
}

function stage2Mastery(player, skillId, masteryId) {
  const group = player && player.mastery && player.mastery[skillId];
  if (!group || typeof masteryId !== 'string') {
    return { level: 1, xp: 0 };
  }
  const prefix = skillId + ':';
  const storageId = masteryId.indexOf(prefix) === 0
    ? masteryId.slice(prefix.length)
    : masteryId;
  const progress = group[storageId] || group[masteryId];
  return progress &&
    Number.isFinite(progress.level) &&
    Number.isFinite(progress.xp)
    ? progress
    : { level: 1, xp: 0 };
}

function stage2Elapsed(current) {
  if (!current) return 0;
  if (Number.isFinite(current.elapsedAnchorMs) &&
      Number.isFinite(current.elapsedBaseSeconds)) {
    return Math.max(
      0,
      current.elapsedBaseSeconds +
        Math.max(0, Date.now() - current.elapsedAnchorMs) / 1000
    );
  }
  return Number.isFinite(current.elapsed)
    ? Math.max(0, current.elapsed)
    : 0;
}

function stage2ActionView(model, key, duration) {
  const current = model && model.current;
  const active = !!current && current.key === key;
  const cleanDuration = Number.isFinite(duration) && duration > 0
    ? duration
    : 0;
  return {
    active,
    stalled: active && !!current.stalled,
    progress: active && cleanDuration > 0
      ? Math.min(1, stage2Elapsed(current) / cleanDuration)
      : 0
  };
}

function stage2RuntimeActionDuration(model, key) {
  if (!model ||
      typeof key !== 'string' ||
      !simulationRuntime ||
      !simulationRuntime.rules ||
      typeof simulationRuntime.rules.getAction !== 'function') {
    return 0;
  }
  try {
    const descriptor = simulationRuntime.rules.getAction({
      player: model.player,
      systems: model.systems,
      current: { key }
    });
    return descriptor &&
      Number.isFinite(descriptor.duration) &&
      descriptor.duration > 0
      ? descriptor.duration
      : 0;
  } catch (error) {
    return 0;
  }
}

function stage2ScopedBeastEffects(model, domain, skillId) {
  const all = stage2Bootstrap.SpiritBeasts.effects(model);
  const selected = all && all[domain];
  const result = {};
  if (!selected || typeof selected !== 'object') return result;
  if (selected.global && typeof selected.global === 'object') {
    Object.keys(selected.global).forEach(function (key) {
      const value = selected.global[key];
      result[key] = Number.isFinite(value) ? value : 0;
    });
  }
  const local = selected.bySkill && selected.bySkill[skillId];
  if (local && typeof local === 'object') {
    Object.keys(local).forEach(function (key) {
      const value = local[key];
      result[key] = (Number.isFinite(result[key]) ? result[key] : 0) +
        (Number.isFinite(value) ? value : 0);
    });
  }
  return result;
}

function stage2ItemRow(itemId, required, inventory) {
  const item = stage2Bootstrap.ItemContent.get(itemId);
  const owned = stage2Bootstrap.Inventory.availableQuantity(
    inventory,
    itemId
  );
  return {
    itemId,
    name: item ? item.name : itemId,
    required,
    owned: Number.isSafeInteger(owned) ? owned : 0,
    available: Number.isSafeInteger(owned) && owned >= required
  };
}

const STAGE2_PRODUCTION_PAGES = Object.freeze({
  '炼丹': {
    skillId: 'alchemy',
    title: '炼丹',
    desc: '以灵材炼制丹药'
  },
  '炼器': {
    skillId: 'forging',
    title: '炼器',
    desc: '以矿材与灵木锻造器物'
  },
  '烹饪': {
    skillId: 'cooking',
    title: '烹饪',
    desc: '以灵鱼灵植烹制膳食'
  },
  '符箓': {
    skillId: 'talisman',
    title: '符箓',
    desc: '绘制修行与御兽所需符箓'
  }
});

const STAGE2_GATHER_PAGES = Object.freeze({
  '采药': 'herb',
  '采矿': 'mining',
  '伐木': 'woodcutting',
  '钓鱼': 'fishing'
});

function stage2ProductionBonuses(model, skillId) {
  const formations = stage2Bootstrap.Formations.effects(model);
  const beast = stage2ScopedBeastEffects(
    model,
    'production',
    skillId
  );
  const progress = stage2Progress(model.player, skillId);
  return {
    skillSpeedBonus:
      stage2Bootstrap.SkillProgression.skillSpeedBonus(progress.level),
    craftingDurationReduction: Math.min(
      0.95,
      (Number.isFinite(formations.craftingDurationReduction)
        ? formations.craftingDurationReduction
        : 0) +
      (Number.isFinite(beast.craftingDurationReduction)
        ? beast.craftingDurationReduction
        : 0)
    ),
    materialRetentionChance:
      Number.isFinite(beast.materialRetentionChance)
        ? beast.materialRetentionChance
        : 0
  };
}

function stage2RecipeCards(model, page, bonuses) {
  const player = model.player;
  const inventory = player.inventory;
  const progress = stage2Progress(player, page.skillId);
  return stage2Bootstrap.RecipeContent.list(page.skillId).map(
    function (recipe) {
      const mastery = stage2Mastery(
        player,
        page.skillId,
        recipe.masteryId
      );
      const unlocked = progress.level >= recipe.unlockLevel;
      const duration = unlocked
        ? stage2ProductionQuery.getDuration(
            player,
            recipe.id,
            bonuses
          )
        : recipe.baseSeconds;
      const costs = Object.keys(recipe.ingredients).map(
        function (itemId) {
          return stage2ItemRow(
            itemId,
            recipe.ingredients[itemId],
            inventory
          );
        }
      );
      const choiceCosts = (recipe.ingredientChoices || []).map(
        function (choice) {
          const options = choice.itemIds.map(function (itemId) {
            return stage2ItemRow(itemId, choice.quantity, inventory);
          });
          return {
            required: choice.quantity,
            options,
            available: options.some(function (row) {
              return row.available;
            })
          };
        }
      );
      const actionKey = 'produce:' + recipe.id;
      const action = stage2ActionView(model, actionKey, duration);
      return {
        recipeId: recipe.id,
        actionKey,
        name: recipe.name,
        unlockLevel: recipe.unlockLevel,
        unlocked,
        durationSeconds: duration,
        costs,
        choiceCosts,
        costAvailable: costs.every(function (row) {
          return row.available;
        }) && choiceCosts.every(function (choice) {
          return choice.available;
        }),
        output: {
          itemId: recipe.output.itemId,
          name: stage2Bootstrap.ItemContent.get(recipe.output.itemId).name,
          quantity: recipe.output.quantity
        },
        skillXp: recipe.skillXp,
        masteryXp: recipe.masteryXp,
        cultivation: recipe.cultivation,
        mastery: {
          level: mastery.level,
          xp: mastery.xp,
          nextXp: stage2Bootstrap.SkillProgression.masteryXpNeed(
            mastery.level
          ),
          speedBonus:
            stage2Bootstrap.SkillProgression.masterySpeedBonus(
              mastery.level
            ),
          yieldOrRetentionChance:
            stage2Bootstrap.SkillProgression
              .masteryYieldOrRetentionChance(mastery.level)
        },
        active: action.active,
        stalled: action.stalled,
        progress: action.progress
      };
    }
  );
}

function stage2DropRows(drops) {
  return (drops || []).map(function (drop) {
    const item = stage2Bootstrap.ItemContent.get(drop.itemId);
    return {
      itemId: drop.itemId,
      name: item ? item.name : drop.itemId,
      weight: drop.w,
      quantity: drop.q
    };
  });
}

function stage2GatherDuration(model, skillId, masteryId, baseSeconds) {
  const progress = stage2Progress(model.player, skillId);
  const mastery = stage2Mastery(model.player, skillId, masteryId);
  const beast = stage2ScopedBeastEffects(
    model,
    'gathering',
    skillId
  );
  const base = stage2Bootstrap.SkillProgression.effectiveDuration(
    baseSeconds,
    progress.level,
    mastery.level
  );
  const reduction = Number.isFinite(beast.gatheringDurationReduction)
    ? beast.gatheringDurationReduction
    : 0;
  return Math.max(
    0.5,
    Math.round(base * (1 - Math.min(0.95, reduction)) * 1000) /
      1000
  );
}

function actionDisplayName(key, model, report, getModel) {
  if (!key) return '无行动';
  if (ACTIONS[key]) return ACTIONS[key].name;
  if (key.indexOf('command:') === 0) {
    const commandKey = key.slice('command:'.length).replace(/#[1-9][0-9]*$/, '');
    const commandNames = {
      sellItem: '出售物品',
      plant: '种植作物',
      plantAll: '批量播种',
      harvest: '收获作物',
      equipFormation: '布置阵法',
      unequipFormation: '撤下阵法',
      consumeTechniqueBook: '研读功法书',
      createCombatLoadout: '新建战斗方案',
      renameCombatLoadout: '重命名战斗方案',
      deleteCombatLoadout: '删除战斗方案',
      setActiveCombatLoadout: '启用战斗方案',
      setEquipment: '调整战斗装备',
      equipEquipment: '穿戴装备',
      unequipEquipment: '卸下装备',
      enhanceEquipment: '强化装备',
      reforgeEquipment: '重铸装备',
      setEquipmentFavorite: '收藏装备',
      sellEquipment: '出售装备',
      salvageEquipment: '分解装备',
      setSupply: '调整战斗补给',
      setActiveTechnique: '调整主动功法',
      setPassiveTechnique: '调整被动功法',
      claimCombatLoot: '领取战利品',
      treatInjury: '治疗重伤',
      attemptBreakthrough: '尝试突破'
    };
    return commandNames[commandKey] || '即时操作';
  }
  if (key.indexOf('social:') === 0) {
    const socialAction = stage4Bootstrap.Social.parseActionKey(key);
    const socialModel = model;
    const person = socialAction && socialModel &&
      socialModel.systems && socialModel.systems.npcs &&
      socialModel.systems.npcs.records[socialAction.npcId];
    const interaction = socialAction &&
      stage4Bootstrap.SocialInteractionContent.get(
        socialAction.interactionId
      );
    if (!interaction) return '社交互动';
    return interaction.label.replace(
      '某人',
      person && person.identity ? person.identity.name : '对方'
    );
  }
  if (key.indexOf('combat:') === 0) {
    const parts = key.split(':');
    if (parts[1] === 'region' && parts.length === 4) {
      const region = stage3Bootstrap.CombatContent.getRegion(parts[2]);
      const enemy = stage3Bootstrap.CombatContent.getEnemy(parts[3]);
      if (region && enemy) return region.name + ' · ' + enemy.name;
      if (region) return region.name + ' · 区域战斗';
      if (enemy) return enemy.name;
      return '区域战斗';
    }
    if (parts[1] === 'dungeon' && parts.length === 3) {
      const dungeon = stage3Bootstrap.CombatContent.getDungeon(parts[2]);
      return dungeon ? dungeon.name : '秘境战斗';
    }
    return '战斗';
  }
  if (key.indexOf('produce:') === 0) {
    const recipe = stage2Bootstrap.RecipeContent.get(key.slice(8));
    return recipe ? recipe.name : '制作';
  }
  if (key.indexOf('fish:') === 0) {
    const spot =
      stage2Bootstrap.GatheringContent.getFishingSpot(key.slice(5));
    return spot ? spot.name : '钓鱼';
  }
  if (key.indexOf('beast:') === 0) {
    if (!model && typeof getModel === 'function') model = getModel();
    const parts = key.split(':');
    const mode = parts[1];
    const id = parts.slice(2).join(':');
    const beasts = model && model.systems &&
      model.systems.homestead &&
      model.systems.homestead.beasts;
    const rows = mode === 'tame'
      ? beasts && beasts.encounters
      : beasts && beasts.roster;
    const row = Array.isArray(rows)
      ? rows.find(function (entry) { return entry.id === id; })
      : null;
    let speciesId = row ? row.speciesId : null;
    if (!speciesId && report && report.gains &&
        report.gains.masteryXp) {
      const masteryKey = Object.keys(report.gains.masteryXp).find(
        function (name) {
          return name.indexOf('beastTaming:') === 0;
        }
      );
      if (masteryKey) speciesId = masteryKey.slice('beastTaming:'.length);
    }
    const definition = speciesId
      ? stage2Bootstrap.HomesteadContent.getBeast(speciesId)
      : null;
    if (mode === 'tame') {
      return definition ? '驯服·' + definition.name : '驯服灵兽';
    }
    if (mode === 'train') {
      return definition ? '训练·' + definition.name : '训练灵兽';
    }
  }
  if (key.indexOf('gather:') === 0) {
    const stage2Parts = key.split(':');
    if (stage2Parts[1] === 'collect') {
      const stage2Entry =
        stage2Bootstrap.GatheringContent.getEntry(
          stage2Parts[2],
          stage2Parts.slice(3).join(':')
        );
      return stage2Entry ? stage2Entry.name : '采集';
    }
    if (stage2Parts[1] === 'explore') {
      const family =
        stage2Bootstrap.GatheringContent.GATHERING[stage2Parts[2]];
      return family && family.explore ? family.explore.name : '探索';
    }
    const parsed = parseGatherKey(key);
    const data = GATHERING_DATA[parsed.skill];
    if (parsed.mode === 'explore') {
      return data && data.explore
        ? data.explore.name
        : '探索';
    }
    const entry = data && data.entries.find(function (item) {
      return item.id === parsed.entryId;
    });
    return entry ? entry.name : key;
  }
  return key;
}

function stage3ItemDisplayName(itemId) {
  try {
    const item = stage2Bootstrap.ItemContent.get(itemId);
    return item && typeof item.name === 'string' ? item.name : '未知物品';
  } catch (error) {
    return '未知物品';
  }
}

function stage3TechniqueDisplayName(techniqueId) {
  try {
    const technique = stage3Bootstrap.TechniqueContent.get(techniqueId);
    return technique && typeof technique.name === 'string'
      ? technique.name
      : '未知功法';
  } catch (error) {
    return '未知功法';
  }
}

function combatEnemyDisplayName(enemyId) {
  try {
    const enemy = stage3Bootstrap.CombatContent.getEnemy(enemyId);
    return enemy && typeof enemy.name === 'string' ? enemy.name : '未知敌人';
  } catch (error) {
    return '未知敌人';
  }
}

function combatDungeonDisplayName(dungeonId) {
  try {
    const dungeon = stage3Bootstrap.CombatContent.getDungeon(dungeonId);
    return dungeon && typeof dungeon.name === 'string'
      ? dungeon.name
      : '未知秘境';
  } catch (error) {
    return '未知秘境';
  }
}

function displayCountRows(counts, nameForId) {
  return Object.keys(counts || {}).map(function (id) {
    return {
      id,
      name: nameForId(id),
      count: counts[id]
    };
  });
}

function retreatDisplayName(reason) {
  const names = {
    player_defeated: '重伤撤退',
    supply_exhausted: '补给耗尽撤退',
    inventory_full: '背包已满，战利品待领取'
  };
  return reason ? (names[reason] || '战斗已结束') : null;
}

function stopReasonDisplayName(reason) {
  const names = {
    manual: '主动停止',
    switched: '切换行动',
    completed: '行动完成',
    resource_depleted: '资源耗尽',
    materials_exhausted: '材料耗尽',
    supply_exhausted: '补给耗尽撤退',
    defeated: '战斗失利',
    injured: '重伤撤退',
    lifespan_buffer: '寿元不足',
    invalid_action: '行动无效',
    requirements_invalid: '条件不满足',
    simulation_guard: '结算保护停止'
  };
  return reason ? (names[reason] || '行动已停止') : null;
}

function combatTelemetryDisplay(combat, techniques) {
  return {
    enemiesDefeated: displayCountRows(
      combat.enemiesDefeated,
      combatEnemyDisplayName
    ),
    dungeonClears: displayCountRows(
      combat.dungeonClears,
      combatDungeonDisplayName
    ),
    suppliesUsed: displayCountRows(
      combat.suppliesUsed,
      stage3ItemDisplayName
    ),
    loot: displayCountRows(combat.loot, stage3ItemDisplayName),
    pendingLoot: combat.pendingLootId !== null,
    retreat: retreatDisplayName(combat.retreatReason),
    techniqueXp: displayCountRows(
      techniques.xp,
      stage3TechniqueDisplayName
    )
  };
}

function reportView(report, model) {
  const clean = SimulationReport.normalize(report);
  if (!clean) return null;
  const immediate = clean.source === 'command';
  const offline = clean.source === 'offline';
  return {
    id: clean.id,
    source: clean.source,
    title: immediate ? '操作记录' : (offline ? '离线结算' : '在线结算'),
    durationSeconds: clean.requestedSeconds,
    immediate,
    durationLabel: immediate
      ? '即时完成'
      : (offline ? '离线时长' : '在线时长'),
    action: {
      key: clean.action.key,
      label: actionDisplayName(clean.action.key, model, clean),
      completed: clean.action.completed,
      stopReason: clean.action.stopReason,
      stopLabel: stopReasonDisplayName(clean.action.stopReason)
    },
    combat: {
      ticks: clean.combat.ticks,
      enemiesDefeated: Object.assign({}, clean.combat.enemiesDefeated),
      dungeonClears: Object.assign({}, clean.combat.dungeonClears),
      damageDealt: clean.combat.damageDealt,
      damageTaken: clean.combat.damageTaken,
      suppliesUsed: Object.assign({}, clean.combat.suppliesUsed),
      loot: Object.assign({}, clean.combat.loot),
      pendingLootId: clean.combat.pendingLootId,
      retreatReason: clean.combat.retreatReason
    },
    techniques: {
      xp: Object.assign({}, clean.techniques.xp)
    },
    display: combatTelemetryDisplay(clean.combat, clean.techniques)
  };
}

function offlineSummaryView(reports, model) {
  const summary = SimulationReport.summarize(reports);
  const cleanReports = reports.map(SimulationReport.normalize).filter(Boolean);
  return {
    durationSeconds: summary.requestedSeconds,
    actions: Object.keys(summary.action.byKey).map(function (key) {
      return {
        key,
        label: actionDisplayName(
          key,
          model,
          cleanReports.find(function (report) {
            return report.action.key === key;
          })
        ),
        completed: summary.action.byKey[key]
      };
    }),
    stops: summary.action.stops.map(function (stop) {
      return {
        key: stop.key,
        label: actionDisplayName(
          stop.key,
          model,
          cleanReports.find(function (report) {
            return report.action.key === stop.key;
          })
        ),
        reason: stop.reason,
        reasonLabel: stopReasonDisplayName(stop.reason)
      };
    }),
    combat: {
      ticks: summary.combat.ticks,
      enemiesDefeated: Object.assign({}, summary.combat.enemiesDefeated),
      dungeonClears: Object.assign({}, summary.combat.dungeonClears),
      damageDealt: summary.combat.damageDealt,
      damageTaken: summary.combat.damageTaken,
      suppliesUsed: Object.assign({}, summary.combat.suppliesUsed),
      loot: Object.assign({}, summary.combat.loot),
      pendingLootId: summary.combat.pendingLootId,
      retreatReason: summary.combat.retreatReason
    },
    techniques: {
      xp: Object.assign({}, summary.techniques.xp)
    },
    display: combatTelemetryDisplay(summary.combat, summary.techniques)
  };
}

// Module wiring is deferred until every script has registered its factory.
let normalizeParts, appearanceIndices, appearanceCounts, composite, randomNieParts, drawCharacterAppearance, drawCharacter;
let isPersistenceLocked, getPersistenceStatus, setPersistenceIssue, persistenceRecovery, persistCurrentModel, persist, persistModel, persistSafely, commitModel, acknowledgeOffline, closeOffline, retryPersistence;
let simulateModel, PerfStats, advanceRuntime, getLastSimulationReport, advanceGameplay, normalizeStartupModel, sanitizeTimeCursorMs, kickEnsureCombatRuntime, snapshotNeedsCombatRuntime, settleStartupOffline, formatOfflineSettleProgress, scheduleStartupOfflineSettle, runRuntimeFrame, stepCatchup, advanceHidden, handleVisibilityChange, flushLifecycle;
const initializeGameServices = function initializeGameServices() {
  ({ normalizeParts, appearanceIndices, appearanceCounts, composite, randomNieParts, drawCharacterAppearance, drawCharacter } = GameAppearance.create({
    get ASSET_BASE() { return typeof ASSET_BASE === 'undefined' ? undefined : ASSET_BASE; },
    get CATS() { return typeof CATS === 'undefined' ? undefined : CATS; },
    get HairRules() { return typeof HairRules === 'undefined' ? undefined : HairRules; },
    get NIE() { return typeof NIE === 'undefined' ? undefined : NIE; },
    get Platform() { return typeof Platform === 'undefined' ? undefined : Platform; },
    get XiuxianUi() { return typeof XiuxianUi === 'undefined' ? undefined : XiuxianUi; },
    get encodeURIComponent() { return typeof encodeURIComponent === 'undefined' ? undefined : encodeURIComponent; },
    get state() { return typeof state === 'undefined' ? undefined : state; }
  }));
  ({ isPersistenceLocked, getPersistenceStatus, setPersistenceIssue, persistenceRecovery, persistCurrentModel, persist, persistModel, persistSafely, commitModel, acknowledgeOffline, closeOffline, retryPersistence } = GamePersist.create({
    get NAV_HOME() { return typeof NAV_HOME === 'undefined' ? undefined : NAV_HOME; },
    get Platform() { return typeof Platform === 'undefined' ? undefined : Platform; },
    get SaveSystem() { return typeof SaveSystem === 'undefined' ? undefined : SaveSystem; },
    get SimulationReport() { return typeof SimulationReport === 'undefined' ? undefined : SimulationReport; },
    get StateModel() { return typeof StateModel === 'undefined' ? undefined : StateModel; },
    get applyModelToRuntime() { return typeof applyModelToRuntime === 'undefined' ? undefined : applyModelToRuntime; },
    get cloneRuntimeState() { return typeof cloneRuntimeState === 'undefined' ? undefined : cloneRuntimeState; },
    get commandResult() { return typeof commandResult === 'undefined' ? undefined : commandResult; },
    get sanitizeTimeCursorMs() { return typeof sanitizeTimeCursorMs === 'undefined' ? undefined : sanitizeTimeCursorMs; },
    get settleStartupOffline() { return typeof settleStartupOffline === 'undefined' ? undefined : settleStartupOffline; },
    get simulateModel() { return typeof simulateModel === 'undefined' ? undefined : simulateModel; },
    get state() { return typeof state === 'undefined' ? undefined : state; },
    get toast() { return typeof toast === 'undefined' ? undefined : toast; }
  }));
  ({ simulateModel, PerfStats, advanceRuntime, getLastSimulationReport, advanceGameplay, normalizeStartupModel, sanitizeTimeCursorMs, kickEnsureCombatRuntime, snapshotNeedsCombatRuntime, settleStartupOffline, formatOfflineSettleProgress, scheduleStartupOfflineSettle, runRuntimeFrame, stepCatchup, advanceHidden, handleVisibilityChange, flushLifecycle } = GameRuntime.create({
    get LazyContent() { return typeof LazyContent === 'undefined' ? undefined : LazyContent; },
    get Platform() { return typeof Platform === 'undefined' ? undefined : Platform; },
    get SaveSystem() { return typeof SaveSystem === 'undefined' ? undefined : SaveSystem; },
    get Simulation() { return typeof Simulation === 'undefined' ? undefined : Simulation; },
    get SimulationReport() { return typeof SimulationReport === 'undefined' ? undefined : SimulationReport; },
    get StateModel() { return typeof StateModel === 'undefined' ? undefined : StateModel; },
    get applyModelToRuntime() { return typeof applyModelToRuntime === 'undefined' ? undefined : applyModelToRuntime; },
    get cloneRuntimeState() { return typeof cloneRuntimeState === 'undefined' ? undefined : cloneRuntimeState; },
    get ensurePlayer() { return typeof ensurePlayer === 'undefined' ? undefined : ensurePlayer; },
    get invalidateQueryModelCache() { return typeof invalidateQueryModelCache === 'undefined' ? undefined : invalidateQueryModelCache; },
    get isPersistenceLocked() { return typeof isPersistenceLocked === 'undefined' ? undefined : isPersistenceLocked; },
    get persistCurrentModel() { return typeof persistCurrentModel === 'undefined' ? undefined : persistCurrentModel; },
    get persistModel() { return typeof persistModel === 'undefined' ? undefined : persistModel; },
    get persistSafely() { return typeof persistSafely === 'undefined' ? undefined : persistSafely; },
    get persistenceRecovery() { return typeof persistenceRecovery === 'undefined' ? undefined : persistenceRecovery; },
    get publishGainTipsFromReport() { return typeof publishGainTipsFromReport === 'undefined' ? undefined : publishGainTipsFromReport; },
    get refreshStage3CombatRuntime() { return typeof refreshStage3CombatRuntime === 'undefined' ? undefined : refreshStage3CombatRuntime; },
    get runtimeRoot() { return typeof runtimeRoot === 'undefined' ? undefined : runtimeRoot; },
    get setPersistenceIssue() { return typeof setPersistenceIssue === 'undefined' ? undefined : setPersistenceIssue; },
    get simulationRuntime() { return typeof simulationRuntime === 'undefined' ? undefined : simulationRuntime; },
    get stage4Bootstrap() { return typeof stage4Bootstrap === 'undefined' ? undefined : stage4Bootstrap; },
    get state() { return typeof state === 'undefined' ? undefined : state; },
    get toast() { return typeof toast === 'undefined' ? undefined : toast; },
    get useStage3CombatRuntime() { return typeof useStage3CombatRuntime === 'undefined' ? undefined : useStage3CombatRuntime; }
  }));
};
