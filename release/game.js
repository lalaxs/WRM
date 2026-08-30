'use strict';

const runtimeRoot = typeof globalThis !== 'undefined' ? globalThis : this;


// ============================================================
// 云隐小师妹 · 角色创建流程 + 主界面骨架（TapTap H5 小游戏 · 原生 JS + Canvas2D）
// 设计目标：验证「选部件 → 离屏合成 → 缓存位图 → 每帧只 blit」链路
//            在浏览器 / TapTap H5 容器里都能跑，且帧率、内存可控。
// 资源：NIE/ 占位素材（男 b_ / 女 g_），由 nie-manifest.js 提供清单。
// 桥接层：所有平台能力走 Platform.*（platform.js，标准 Web API），禁止 tap.* / 沙箱 API。
// ============================================================

// 0. 资源清单（UMD：真机走 require，浏览器垫片走全局 NIE_MANIFEST）
const NIE = (typeof require !== 'undefined')
  ? require('./nie-manifest.js')
  : (typeof NIE_MANIFEST !== 'undefined' ? NIE_MANIFEST : null);

// 资源基址：真机为 ''（包内根目录）；浏览器垫片由 index.html 设为 '../'
const ASSET_BASE = (typeof window !== 'undefined' && window.NIE_ASSET_BASE)
  ? window.NIE_ASSET_BASE : '';

// 部件类别 + 合成 z 序（从底到顶，决定叠图先后）
const CATS = ['body', 'cloth', 'nose', 'mouth', 'eyes', 'eyebrush', 'hair'];
const CAT_LABEL = {
  body: '身体', cloth: '衣服', nose: '鼻子', mouth: '嘴',
  eyes: '眼睛', eyebrush: '眉眼', hair: '头发'
};

function normalizeParts(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw
    : {};
  const normalized = {};
  for (const cat of CATS) {
    const list = NIE && NIE.g && Array.isArray(NIE.g[cat]) ? NIE.g[cat] : [];
    const numeric = Number(source[cat]);
    const index = Number.isFinite(numeric) ? Math.floor(numeric) : 0;
    normalized[cat] = index >= 0 && index < list.length ? index : 0;
  }
  return normalized;
}

// 0.5 主题配色（浅紫 · 少女心 · 浅色调，写死 HEX，全游戏引用）
// 改色只需动这里一处。详见《云隐小师妹_美术UI规范.md》。
// 背景天空渐变 —— 单一真相取自 styles.css 的 --sky-top / --sky-bottom，
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

// Stage 2 production composition is all-or-none. The old VM harness loads
// none of these extensions and intentionally keeps the Stage 1B fallback.
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
const stage2ExtensionNames = [
  'Stage2State',
  'Stage2Rules',
  'Gathering',
  'Production',
  'Farm',
  'Formations',
  'SpiritBeasts',
  'GatheringContent',
  'ItemContent',
  'LifeSkillContent',
  'RecipeContent',
  'HomesteadContent',
  'Inventory',
  'SkillProgression'
];
const useStage2Runtime = stage2ExtensionNames.some(function (name) {
  return stage2Bootstrap[name] !== null;
});
const requiredBootstrapNames = useStage2Runtime
  ? Object.keys(stage2Bootstrap)
  : ['GameRules', 'GameRandom'];
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
const useEquipmentRuntime = !!(
  equipmentBootstrap.EquipmentContent &&
  equipmentBootstrap.Equipment &&
  stage2Bootstrap.Inventory &&
  stage3Bootstrap.CombatLoadouts
);
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
const useStage3Runtime = stage3ContentNames.some(function (name) {
  return stage3Bootstrap[name] !== null;
});
const missingStage3Content = useStage3Runtime
  ? stage3ContentNames.filter(function (name) {
    return stage3Bootstrap[name] === null;
  })
  : [];
if (missingStage3Content.length > 0) {
  throw new Error(
    'Incomplete Stage 3 bootstrap: missing ' +
    missingStage3Content.join(', ')
  );
}
let useStage3CombatRuntime = false;

// Stage 4 character-world composition is all-or-none. Older VM harnesses load
// none of these globals; the browser loads the complete topology from index.
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
const useStage4Runtime = stage4ExtensionNames.some(function (name) {
  return stage4Bootstrap[name] !== null;
});
const missingStage4Globals = useStage4Runtime
  ? stage4ExtensionNames.filter(function (name) {
    return stage4Bootstrap[name] === null;
  })
  : [];
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
const useStage5Runtime = stage5ExtensionNames.some(function (name) {
  return stage5Bootstrap[name] !== null;
});
const missingStage5Globals = useStage5Runtime
  ? stage5ExtensionNames.filter(function (name) {
    return stage5Bootstrap[name] === null;
  })
  : [];
if (missingStage5Globals.length > 0) {
  throw new Error(
    'Incomplete Stage 5 bootstrap: missing ' +
    missingStage5Globals.join(', ')
  );
}

// 2. 游戏状态
const state = {
  gender: 'g',                       // 玩家恒为女；'b' 男性仅供 NPC 自动生成
  parts: { body: 0, cloth: 0, eyebrush: 0, eyes: 0, hair: 0, mouth: 0, nose: 0 },
  navIndex: 0,                       // 左侧导航选中项（0 = 洞府）
  phase: 'create',                   // 'create' 创建角色 | 'game' 主游戏 | 'edit' 编辑形象 | 'lunhui' 轮回结算
  created: false,                    // 是否已完成首次创建（写入 cloud_save_v1 快照）
  player: null,                      // 轻量角色档案（创建后生成：名/境界/修为/灵石）
  dirty: true,                       // 需要重新离屏合成
  cache: null,                       // 合成后的缓存位图（离屏画布）
  current: null,                     // 当前动作（梅尔沃式·一次只做一件事）：{key,count,done,elapsed}
  showOffline: false,                // 是否弹出离线收益面板
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
const GATHER_SKILLS = ['mining', 'woodcutting', 'fishing', 'herb'];
const GATHER_SKILL_KEY = { mining: 'caiju', woodcutting: 'famu', fishing: 'diaoyu', herb: 'caiyao' };
const GATHER_TITLE = { mining: '采矿', woodcutting: '伐木', fishing: '钓鱼', herb: '采药' };
const GATHER_ICON = { mining: '矿', woodcutting: '木', fishing: '鱼', herb: '药' };
const GATHER_DESC = {
  mining: '探索灵矿脉，采集灵矿与宝石',
  woodcutting: '探索灵木林地，采集灵木与副产物',
  fishing: '选取灵泽钓点，垂钓灵鱼、杂物与特殊掉落',
  herb: '探索野外药田，采集灵草与药材'
};

// ── 采集系全局常量（数值写死，对齐《采集系设计文档（定稿）》）──
const FISH_MAX = 30;            // 钓鱼：每个钓点满库存 = 30 次
const FISH_RECOVER_SEC = 60;    // 钓鱼：库存每 60 秒回复 1 次（离线也回）
const MOOD_MAX = 100;           // 心情：满值 100
const MOOD_REGEN_PER_SEC = 1 / 30; // 心情：每 30 秒自然恢复 1 点（社交事件未来会使其下降）

// 物品中文名（采集系产出）
const ITEM_NAMES = {
  // 矿石（低阶功能直名；高阶后缀统一为「矿」）
  copperOre: '铜矿石', tinOre: '锡矿石', ironOre: '铁矿石', silverOre: '银矿石',
  goldOre: '金矿石', mithrilOre: '秘银矿', adamantOre: '精金矿', jadeShard: '灵玉矿',
  darkIronOre: '玄铁矿', crystalOre: '玄晶矿',
  // 宝石（短名：宝 / 玉 / 钻 / 晶）
  topaz: '黄玉', sapphire: '蓝宝', ruby: '红宝', emerald: '翠玉', diamond: '金钻', darkCrystal: '暗晶',
  // 木材
  willowWood: '杨柳木', pineWood: '松木', peachWood: '桃木', nanmuWood: '楠木',
  phoenixWood: '梧桐木', spiritWood: '灵木', thunderWood: '雷击木', bloodSandalwood: '血檀',
  ancientWood: '古木', millenniumVine: '千年藤',
  // 灵植副产物
  resin: '树脂', birdNest: '鸟巢', spiritPeach: '灵桃', spiritFruit: '灵果',
  spiritEgg: '灵禽蛋', spiritWormSilk: '灵虫丝', beastHide: '兽皮', thunderHerb: '雷灵草', bloodHerb: '血灵草',
  // 鱼类
  spiritCarp: '灵鲤', spiritShrimp: '灵虾', silverTrout: '银鳟', greenBass: '青鲈',
  darkCatfish: '玄鲶', sunsetSalmon: '霞鲑', thunderEel: '雷鳗', spiritLobster: '灵龙虾',
  swordfish: '剑鱼', dragonFish: '龙鱼',
  // 药草
  lingzhi: '灵芝', spiritMushroom: '灵菇', skySilk: '天蚕丝', ironhideGrass: '铁皮草',
  dragonSalivaGrass: '龙涎草', moonSpiritGrass: '月灵草', starGrass: '星辰草', bloodSpiritGrass: '血灵草',
  thunderSpiritGrass: '雷灵草', goldenLingzhi: '金芝', qiGatheringGrass: '聚气草', heartClearGrass: '清心草',
  // 食材 / 果实
  spiritHoney: '灵蜜', spiritRice: '灵米', bloodGinsengFruit: '血参果', oldGinseng: '老山参',
  // 种子（采药 / 伐木交叉副产物，按产地阶分层：凡 / 上品 / 极品灵种）
  commonSeed: '凡灵种', fineSeed: '上品灵种', rareSeed: '极品灵种',
  // 通用
  lingshi: '灵石', fishBox: '鱼宝箱'
};

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
function fishingSpeciesIds() {
  const set = new Set();
  for (const e of GATHERING_DATA.fishing.entries) {
    for (const d of e.drops) { if (d.item !== 'fishBox') set.add(d.item); }
  }
  return [...set];
}

// 生成默认精通结构（每个条目 lv=1 xp=0 + 精通池 pool=0）
function defaultMastery() {
  const m = {};
  for (const sk of GATHER_SKILLS) {
    m[sk] = { pool: 0, entries: {} };
    const ids = (sk === 'fishing') ? fishingSpeciesIds() : GATHERING_DATA[sk].entries.map(e => e.id);
    for (const id of ids) m[sk].entries[id] = { lv: 1, xp: 0 };
  }
  return m;
}

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
function navIndexOfAction(key) {
  const a = ACTIONS[key]; if (!a) return 0;
  for (const n of NAV) { const sp = SKILL_PAGES[n]; if (sp && sp.skill === a.skill) return NAV.indexOf(n); }
  return 0;
}
// 行为卡图标底色（按技艺主题浅彩，弱对比不抢文字）
const ICON_TINT = {
  caiyao: '#CDEBD7', caiju: '#CFE6F6', famu: '#FBEFC4', diaoyu: '#CFE6F6',
  liandan: '#F7D6E4', lianqi: '#E7E0F7', fulu: '#F7D6E4'
};

// 3. 图片懒加载缓存（按需加载，不一次解码全部 153 张 → 守 iOS 内存红线）
const imgCache = {};
function assetRel(g, c, i) {
  const list = NIE[g][c];
  const name = list[i] || list[0];
  if (c === 'body') return 'NIE/' + name;            // 身体在根目录：NIE/b_body.png
  return 'NIE/' + g + '_' + c + '/' + name;        // 其余在子目录：NIE/b_cloth/b_cloth_1.png
}
function assetPath(g, c, i) { return ASSET_BASE + assetRel(g, c, i); }
function loadImg(g, c, i) {
  const key = g + '/' + c + '/' + i;
  if (imgCache[key]) return imgCache[key];
  const img = Platform.createImage();
  img._ready = false;
  img.onload = () => {
    img._ready = true;
    state.dirty = true;          // ← 任何图片加载完成 → 自动重复合成预览
  };
  img.onerror = () => { console.warn('[捏脸] 加载失败:', assetPath(g, c, i)); };
  img.src = assetPath(g, c, i);
  imgCache[key] = img;
  return img;
}

// 4. 离屏合成（仅在 dirty 时执行一次；合成结果存进缓存位图）
let off = null, offCtx = null;
function ensureOff() {
  if (offCtx) return;
  off = Platform.createCanvas();  // 离屏画布（合成用，不挂 DOM）
  off.width = 300; off.height = 300;
  offCtx = off.getContext('2d');
}
function composite() {
  ensureOff();
  offCtx.clearRect(0, 0, 300, 300);
  for (const c of CATS) {
    const i = state.parts[c];
    const img = loadImg(state.gender, c, i);
    if (img && (img._ready || img.complete)) {
      offCtx.drawImage(img, 0, 0, 300, 300);
    }
  }
  state.cache = off;            // 缓存整张合成结果
  state.dirty = false;
}
// 供 ui.js 取合成缓存位图（DOM 预览用）；dirty 时先重合成一次
function getCharCache() { if (state.dirty) composite(); return state.cache; }

function hashSeed(text) {
  const source = String(text || '');
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nieGenderForPerson(genderId) {
  return genderId === 'male' ? 'b' : 'g';
}

function randomNieParts(seedText, genderId) {
  const gender = nieGenderForPerson(genderId);
  const catalog = NIE && NIE[gender] ? NIE[gender] : null;
  const parts = {};
  let cursor = hashSeed(seedText + ':' + gender);
  CATS.forEach(function (cat) {
    const list = catalog && Array.isArray(catalog[cat]) ? catalog[cat] : [];
    const count = Math.max(1, list.length || 1);
    cursor = (Math.imul(cursor, 1664525) + 1013904223) >>> 0;
    parts[cat] = cursor % count;
  });
  return { gender: gender, parts: parts };
}

const NIE_PORTRAIT_CACHE_LIMIT = 160;
const niePortraitCache = Object.create(null);
const niePortraitCacheOrder = [];

function niePortraitCacheKey(appearance) {
  if (!appearance || !appearance.parts) return '';
  const gender = appearance.gender === 'b' ? 'b' : 'g';
  const parts = appearance.parts;
  let key = gender;
  for (let index = 0; index < CATS.length; index++) {
    const cat = CATS[index];
    key += ':' + (Number.isFinite(parts[cat]) ? parts[cat] : 0);
  }
  return key;
}

function rememberNiePortrait(key, canvas) {
  if (!key || !canvas) return;
  if (!Object.prototype.hasOwnProperty.call(niePortraitCache, key)) {
    niePortraitCacheOrder.push(key);
    while (niePortraitCacheOrder.length > NIE_PORTRAIT_CACHE_LIMIT) {
      const oldest = niePortraitCacheOrder.shift();
      delete niePortraitCache[oldest];
    }
  }
  niePortraitCache[key] = canvas;
}

function drawCharacterAppearance(targetCanvas, appearance, options) {
  if (!targetCanvas || typeof targetCanvas.getContext !== 'function') {
    return false;
  }
  if (!appearance || !appearance.parts) return false;
  const gender = appearance.gender === 'b' ? 'b' : 'g';
  const parts = appearance.parts;
  const cacheKey = niePortraitCacheKey(appearance);
  let scratch = cacheKey ? niePortraitCache[cacheKey] : null;
  let complete = !!scratch;
  if (!scratch) {
    scratch = Platform.createCanvas();
    scratch.width = 300;
    scratch.height = 300;
    const scratchCtx = scratch.getContext('2d');
    if (!scratchCtx) return false;
    scratchCtx.clearRect(0, 0, 300, 300);
    let painted = 0;
    for (let index = 0; index < CATS.length; index++) {
      const cat = CATS[index];
      const partIndex = Number.isFinite(parts[cat]) ? parts[cat] : 0;
      const img = loadImg(gender, cat, partIndex);
      if (img && (img._ready || img.complete)) {
        scratchCtx.drawImage(img, 0, 0, 300, 300);
        painted++;
      }
    }
    if (!painted) return false;
    complete = painted === CATS.length;
    if (complete) rememberNiePortrait(cacheKey, scratch);
  }
  const target = targetCanvas.getContext('2d');
  if (!target) return false;
  const targetDpr = typeof window !== 'undefined' &&
    Number.isFinite(Number(window.devicePixelRatio))
    ? Math.max(1, Number(window.devicePixelRatio))
    : 1;
  const hintedWidth = options && Number(options.cssWidth);
  const hintedHeight = options && Number(options.cssHeight);
  const cssWidth = Math.max(
    1,
    (Number.isFinite(hintedWidth) && hintedWidth > 0
      ? hintedWidth
      : 0) ||
      Number(targetCanvas.clientWidth) ||
      Number(targetCanvas.width) / targetDpr ||
      1
  );
  const cssHeight = Math.max(
    1,
    (Number.isFinite(hintedHeight) && hintedHeight > 0
      ? hintedHeight
      : 0) ||
      Number(targetCanvas.clientHeight) ||
      Number(targetCanvas.height) / targetDpr ||
      1
  );
  const physicalWidth = Math.max(1, Math.round(cssWidth * targetDpr));
  const physicalHeight = Math.max(1, Math.round(cssHeight * targetDpr));
  if (targetCanvas.width !== physicalWidth) targetCanvas.width = physicalWidth;
  if (targetCanvas.height !== physicalHeight) {
    targetCanvas.height = physicalHeight;
  }
  if (typeof target.setTransform === 'function') {
    target.setTransform(targetDpr, 0, 0, targetDpr, 0, 0);
  }
  if (typeof target.clearRect === 'function') {
    target.clearRect(0, 0, cssWidth, cssHeight);
  }
  const size = Math.min(cssWidth, cssHeight);
  target.drawImage(
    scratch,
    (cssWidth - size) / 2,
    (cssHeight - size) / 2,
    size,
    size
  );
  return complete ? true : 'partial';
}

function drawCharacter(targetCanvas) {
  if (!targetCanvas || typeof targetCanvas.getContext !== 'function') {
    return false;
  }
  const source = getCharCache();
  if (!source) return false;
  const target = targetCanvas.getContext('2d');
  if (!target) return false;
  const targetDpr = typeof window !== 'undefined' &&
    Number.isFinite(Number(window.devicePixelRatio))
    ? Math.max(1, Number(window.devicePixelRatio))
    : 1;
  const cssWidth = Math.max(
    1,
    Number(targetCanvas.clientWidth) ||
      Number(targetCanvas.width) / targetDpr ||
      1
  );
  const cssHeight = Math.max(
    1,
    Number(targetCanvas.clientHeight) ||
      Number(targetCanvas.height) / targetDpr ||
      1
  );
  const physicalWidth = Math.max(1, Math.round(cssWidth * targetDpr));
  const physicalHeight = Math.max(1, Math.round(cssHeight * targetDpr));
  if (targetCanvas.width !== physicalWidth) targetCanvas.width = physicalWidth;
  if (targetCanvas.height !== physicalHeight) targetCanvas.height = physicalHeight;
  if (typeof target.setTransform === 'function') {
    target.setTransform(targetDpr, 0, 0, targetDpr, 0, 0);
  }
  if (typeof target.clearRect === 'function') {
    target.clearRect(0, 0, cssWidth, cssHeight);
  }
  const size = Math.min(cssWidth, cssHeight);
  target.drawImage(
    source,
    (cssWidth - size) / 2,
    (cssHeight - size) / 2,
    size,
    size
  );
  return true;
}

// 5. 绘制工具
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function hit(name, x, y, w, h) { regions.push({ name, x, y, w, h }); }
// 竖直渐变（上浅下略深），用于按钮，弱化现代扁平感、添几分温润
function vGrad(x, y, w, h, top, bottom) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  return g;
}

// 6. 左侧导航（可拖动滚动列表：标签多时上下拖拽查看）
// 古风浅紫少女风精修：竖向渐变侧栏 + 选中渐变 + 左选中条 + 右指向三角 + 仙珠装饰
const NAV = [
  '洞府', '背包', '装备', '商城', '事件', '战斗', '宗门', '天下',
  '关系', '设置', '采药', '采矿', '伐木', '钓鱼', '炼丹', '炼器', '烹饪',
  '符箓'
];
const NAV_HOME = NAV.indexOf('洞府');   // 洞府为默认首页（不再依赖固定索引 0）
let navScroll = 0;                    // 导航列表垂直偏移（设计坐标 px）
// ── 内容区滚动（技艺页 / 背包等长列表）──
let contentScroll = 0;                // 右侧内容区当前垂直偏移（设计坐标 px）
let contentMaxScroll = 0;             // 当前页可滚动最大值（0 = 一屏装得下）
let contentArea = { top: 0, bottom: 0, x: 0, w: 0 };  // 当前可滚动裁剪区（触摸命中判定用）
let contentDragStart = null;          // 内容区拖动起点
let inScrollRegion = false;           // 当前是否处于可滚动裁剪区内（交互命中用）


// 小菱形装饰（仙珠 / 少女心点缀）


// 资源图标（矢量小图标，少女风柔和色；kind: mood/jingqi/lingshi/shengwang）


// 轻量角色档案默认值（§10① 资源：心情/精气/灵石/声望；§5 修为可突破阈值；§5 寿元）
function defaultPlayer() {
  return {
    name: '云隐弟子', realmStage: 0,
    realm: REALM_TABLE[0].name, title: '练气',
    spiritualRootId: 'single',
    xiwei: 0, breakNeed: REALM_TABLE[0].need,
    mood: MOOD_MAX, moodAnchorMs: null, moodBase: null,
    jingqi: 100, lingshi: 100, shengwang: 0, lingyu: 0,  // 心情=社交属性；灵玉=付费货币（仅商城，数据预留）
    inventory: {
      stacks: {
        yaocai: 0, lingkuang: 0, muliao: 0, shicai: 0,
        faqi: 0, hujia: 0, shanshi: 0, fu: 0, caiqing: 0,
        tupo: 0, heal: 0, jindan: 0, yuanying: 0, huashen: 0,
        lianxu: 0, heti: 0, dasheng: 0
      }
    },
    skills: { caiyao: { lv: 1, xp: 0 }, caiju: { lv: 1, xp: 0 }, famu: { lv: 1, xp: 0 }, diaoyu: { lv: 1, xp: 0 }, liandan: { lv: 1, xp: 0 }, lianqi: { lv: 1, xp: 0 }, chuyi: { lv: 1, xp: 0 }, fulu: { lv: 1, xp: 0 }, qinqishuhua: { lv: 1, xp: 0 }, tuna: { lv: 1, xp: 0 }, jianjue: { lv: 1, xp: 0 }, quanjiao: { lv: 1, xp: 0 }, shenfa: { lv: 1, xp: 0 } },
    mastery: defaultMastery(), // 采集系精通（条目级 + 精通池）
    shouyuan: REALM_TABLE[0].shou, shouMax: REALM_TABLE[0].shou,
    // 寿元消耗采用可持久化的绝对时间锚点，保证帧分割和存读档不改变结果。
    lifespanAnchorMs: null, lifespanBaseYears: null
  };
}

// 防御性合并：用默认值填补存档中缺失的字段（避免 undefined 显示）
function ensurePlayer(p) {
  const d = defaultPlayer();
  if (!p || typeof p !== 'object') return d;
  const r = Object.assign({}, d, p);  // 保留 Stage 2 扩展字段，再补旧 UI 默认值
  for (const k of Object.keys(d)) {   // 再用存档值覆盖存在的字段
    if (p[k] !== undefined) {
      if (k === 'skills') {
        r[k] = Object.assign({}, d[k], p[k]);   // 子对象浅合并，缺失字段补默认
      } else if (k === 'inventory') {
        const incoming = p.inventory &&
          p.inventory.stacks &&
          typeof p.inventory.stacks === 'object'
          ? p.inventory.stacks
          : {};
        r.inventory = Object.assign({}, p.inventory, {
          stacks: Object.assign({}, d.inventory.stacks, incoming)
        });
      } else r[k] = p[k];
    }
  }
  // 旧 UI 读取 pool/lv；在规范 poolXp/level 上补视图字段，不丢生产等其他精通。
  const masteryDefaults = defaultMastery();
  r.mastery = p.mastery && typeof p.mastery === 'object'
    ? cloneRuntimeState(p.mastery)
    : {};
  for (const sk of GATHER_SKILLS) {
    const source = p.mastery &&
      p.mastery[sk] &&
      typeof p.mastery[sk] === 'object'
      ? p.mastery[sk]
      : {};
    const sourceEntries = source.entries &&
      typeof source.entries === 'object'
      ? source.entries
      : {};
    const canonicalEntryIds = Object.keys(source).filter(
      function (entryId) {
        return entryId !== 'pool' &&
          entryId !== 'poolXp' &&
          entryId !== 'entries' &&
          Object.prototype.hasOwnProperty.call(
            masteryDefaults[sk].entries,
            entryId
          ) &&
          source[entryId] &&
          typeof source[entryId] === 'object';
      }
    );
    const bucket = canonicalEntryIds.length > 0
      ? Object.assign({}, source)
      : Object.assign({}, masteryDefaults[sk], source);
    bucket.pool = typeof source.pool === 'number'
      ? source.pool
      : (typeof source.poolXp === 'number' ? source.poolXp : 0);
    bucket.entries = canonicalEntryIds.length > 0
      ? {}
      : Object.assign({}, masteryDefaults[sk].entries);
    const viewEntries = canonicalEntryIds.length > 0
      ? canonicalEntryIds.reduce(function (entries, entryId) {
          entries[entryId] = source[entryId];
          return entries;
        }, {})
      : sourceEntries;
    Object.keys(viewEntries).forEach(function (entryId) {
      const entry = Object.assign(
        {},
        bucket.entries[entryId] || {},
        viewEntries[entryId]
      );
      if (typeof entry.lv !== 'number' &&
          typeof entry.level === 'number') {
        entry.lv = entry.level;
      }
      bucket.entries[entryId] = entry;
    });
    r.mastery[sk] = bucket;
  }
  Object.keys(masteryDefaults).forEach(function (skillId) {
    if (!r.mastery[skillId]) {
      r.mastery[skillId] = masteryDefaults[skillId];
    }
  });
  // 由 realmStage 推导 realm / breakNeed / shouMax（单一数据源，避免不同步）
  const st = r.realmStage || 0;
  const realm = REALM_TABLE[st] || REALM_TABLE[0];
  r.realm = realm.name;
  r.breakNeed = realm.need;
  r.shouMax = realm.shou;
  // null 表示飞升后寿元无尽；有限境界继续使用数值寿元。
  if (realm.shou == null) {
    r.shouyuan = null;
  } else if (typeof r.shouyuan !== 'number' || !isFinite(r.shouyuan)) {
    r.shouyuan = realm.shou;
  }
  return r;
}

// ── M1 放置内核：队列 / 产出 / 突破 / 离线 ──
function skillXpNeed(lv) { return Math.round(50 * Math.pow(lv, 1.8)); }
function addSkillXp(p, skill, amount) {
  const s = p.skills[skill]; if (!s) return;
  s.xp += amount;
  while (s.xp >= skillXpNeed(s.lv) && s.lv < 99) {
    s.xp -= skillXpNeed(s.lv); s.lv++;
  }
}

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
  if (useStage5Runtime) {
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
  if (useStage4Runtime) {
    return stage4Bootstrap.Stage4Rules.create(Object.assign(
      {
        SocialInteractionContent:
          stage4Bootstrap.SocialInteractionContent
      },
      combatDeps,
      stage2RuntimeDeps
    ));
  }
  if (useStage3CombatRuntime) {
    return stage3Bootstrap.Stage3Rules.create(Object.assign(
      {},
      combatDeps,
      stage2RuntimeDeps
    ));
  }
  if (useStage3Runtime || useStage2Runtime) {
    return stage2Bootstrap.Stage2Rules.create(stage2RuntimeDeps);
  }
  return stage2Bootstrap.GameRules.create(baseGameRulesConfig);
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

const stage2ProductionQuery = useStage2Runtime
  ? stage2Bootstrap.Production.create({
      RecipeContent: stage2Bootstrap.RecipeContent,
      Inventory: stage2Bootstrap.Inventory,
      SkillProgression: stage2Bootstrap.SkillProgression,
      GameRandom: stage2Bootstrap.GameRandom,
      Equipment: equipmentBootstrap.Equipment
    })
  : null;

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

function repeatAction(key) {
  return {
    key,
    mode: 'repeat',
    count: 0,
    done: 0,
    elapsed: 0,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null,
    stalled: false
  };
}

function finiteAction(key, count) {
  return {
    key,
    mode: 'finite',
    count: Math.max(1, count | 0),
    done: 0,
    elapsed: 0,
    elapsedAnchorMs: null,
    elapsedBaseSeconds: null,
    stalled: false
  };
}

function actionHasRemaining(current) {
  return !!current && (current.mode === 'repeat' || current.done < current.count);
}

// 设为当前动作（梅尔沃式·一次只做一件事）：替换旧动作，不后台排队
function setCurrent(key, count) {
  const result = commandStartAction({ key });
  if (!result.ok && result.message) {
    toast(
      result.code === 'save_failed' &&
      key.indexOf('gather:explore:') === 0
        ? '探索开始保存失败，请重试'
        : result.message
    );
  }
  return result.ok;
}

function simulateModel(model, fromMs, toMs, source, mainActionLimitSeconds) {
  const elapsedSeconds = Math.max(0, (toMs - fromMs) / 1000);
  const monthCap = stage4Bootstrap &&
    stage4Bootstrap.WorldMonth &&
    Number.isFinite(stage4Bootstrap.WorldMonth.OFFLINE_MONTH_CAP)
    ? stage4Bootstrap.WorldMonth.OFFLINE_MONTH_CAP
    : 500;
  const result = Simulation.advance(model, elapsedSeconds, {
    source,
    fromMs,
    mainActionLimitSeconds,
    offlineMonthCap: source === 'offline' ? monthCap : null,
    rules: simulationRuntime.rules,
    lanes: simulationRuntime.lanes
  });
  result.state.processedThroughMs = toMs;
  return result;
}

function advanceRuntime(fromMs, toMs, source, mainActionLimitSeconds) {
  if (!Number.isFinite(fromMs) ||
      !Number.isFinite(toMs)) {
    return null;
  }
  const prevStatus = state.player && state.player.lifecycle
    ? state.player.lifecycle.status
    : null;
  // 在线热路径：queryView 免去每帧 normalize+snapshot；Simulation.advance 入口会再隔离拷贝。
  // 离线/重载仍走 fromRuntime，保证落盘边界干净。
  const model = source === 'online' &&
    typeof StateModel.queryView === 'function'
    ? StateModel.queryView(state /* runtime */, fromMs)
    : StateModel.fromRuntime(state /* runtime */, fromMs);
  const result = simulateModel(
    model,
    fromMs,
    toMs,
    source,
    mainActionLimitSeconds
  );
  StateModel.applyToRuntime(state /* runtime */, result.state);
  state._lastSimulationReport = result.report;
  // 边缘触发：生命周期状态「进入安全缓冲」时弹一次提示（不每帧弹）
  const newStatus = state.player && state.player.lifecycle
    ? state.player.lifecycle.status
    : null;
  if (prevStatus !== 'safety_buffer' &&
      newStatus === 'safety_buffer' &&
      !state.showLifespanBuffer) {
    state.showLifespanBuffer = true;
  }
  return result.report;
}

function getLastSimulationReport() {
  return state._lastSimulationReport;
}

function advanceGameplay(fromMs, toMs, source, mainActionLimitSeconds) {
  if (isPersistenceLocked()) return null;
  const now = Number.isFinite(toMs) ? toMs : Date.now();
  const rawHighWater = Number.isFinite(state.processedThroughMs)
    ? state.processedThroughMs
    : fromMs;
  // 在线帧推进同样消毒坏水位线，避免 _last 正常但 processedThroughMs=0 时被 max 拉回纪元初。
  const highWater = sanitizeTimeCursorMs(rawHighWater, now, now);
  if (rawHighWater !== highWater) {
    state.processedThroughMs = highWater;
  }
  const effectiveFrom = Math.max(
    sanitizeTimeCursorMs(fromMs, now, highWater),
    highWater
  );
  if (toMs <= effectiveFrom) return null;
  const exploring = !!(
    state.current &&
    state.current.key.indexOf('gather:explore:') === 0
  );
  const pendingExplore = exploring
    ? cloneRuntimeState(state.current)
    : null;
  const report = advanceRuntime(
    effectiveFrom,
    toMs,
    source,
    mainActionLimitSeconds
  );
  if (exploring &&
      report &&
      report.action.completed > 0 &&
      !persistSafely(toMs)) {
    if (state.current === null && pendingExplore) {
      pendingExplore.done = Math.max(
        1,
        Number(pendingExplore.done) || 0,
        Number(pendingExplore.count) || 1
      );
      pendingExplore.count = Math.max(
        1,
        Number(pendingExplore.count) || pendingExplore.done
      );
      pendingExplore.elapsed = 0;
      pendingExplore.stalled = true;
      state.current = pendingExplore;
    } else if (state.current) {
      state.current.stalled = true;
    }
    setPersistenceIssue({
      kind: 'explore',
      message: '探索结果保存失败，请重试',
      successMessage: '探索结果已保存'
    });
  }
  if (report) publishGainTipsFromReport(report);
  return report;
}
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
function applyRealm(p) {
  const st = p.realmStage || 0;
  const cur = REALM_TABLE[st] || REALM_TABLE[0];
  p.realm = cur.name;
  p.breakNeed = (REALM_TABLE[st + 1] || cur).need;
  p.shouMax = cur.shou;
  p.shouyuan = cur.shou;
  p.lifespanAnchorMs = null;
  p.lifespanBaseYears = null;
}
// 境界突破（§5 新规则）
// 生产走 useStage3Runtime 分支 → commandAttemptBreakthrough → core/breakthrough.js（权威路径，已合规）。
// 以下 else 分支为「未加载 stage3 脚本」时的兼容/测试占位（旧概率判定），请勿在生产依赖。
function tryBreakthrough() {
  if (isPersistenceLocked()) return false;
  if (useStage3Runtime) {
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
  const p = state.player; if (!p) return;
  const st = p.realmStage || 0; const cur = REALM_TABLE[st];
  if (st >= REALM_TABLE.length - 1) { toast('已是最高境界'); return; }
  if (p.xiwei < cur.need) { toast('修为不足，需 ' + cur.need); return; }
  const playerCheckpoint = cloneRuntimeState(p);
  const rngCheckpoint = state.rngState;
  let resultMessage = '';
  // 小阶：达标即自动突破，无风险
  if (cur.tier === 'minor') {
    p.xiwei = 0; p.realmStage = st + 1; applyRealm(p);
    p.jingqi = Math.min(200, p.jingqi + 30);
    resultMessage = '突破成功 → ' + REALM_TABLE[st + 1].name + '！';
    if (!persistSafely()) {
      state.player = playerCheckpoint;
      state.rngState = rngCheckpoint;
      setPersistenceIssue({ kind: 'save', message: '突破结果保存失败，请重试' });
      return false;
    }
    toast(resultMessage);
    return true;
  }
  // 大境界（兼容/测试占位路径）：生产已由 core/breakthrough.js 以「战斗进度门槛 + 概率」形式接管
  // （门槛=击败首领/通关秘境，达成后 roll 概率）。该分支仅在未加载 stage3 脚本时生效。
  if (cur.dan && (p.inventory.stacks[cur.dan] || 0) < 1) { toast('需' + (DAN_NAME[cur.dan] || '突破丹') + '×1'); return; }
  const rate = breakthroughRate(p, st);
  const ok = gameRandom() < rate;
  // 注：生产路径的「渡劫」已通过 core/breakthrough.js 实现——先由战斗进度达成突破门槛(gate)，
  // 再 roll 概率，胜=突破、败=修为散尽（门槛保留）。此处的 TODO 仅针对旧兼容分支，权威路径无须此占位。
  if (ok) {
    p.xiwei = 0;
    if (cur.dan) p.inventory.stacks[cur.dan] -= 1;
    p.realmStage = st + 1; applyRealm(p);
    p.jingqi = Math.min(200, p.jingqi + 30);
    resultMessage = '渡劫成功 → ' + REALM_TABLE[st + 1].name + '！';
  } else {
    p.xiwei = 0;   // 失败清空全部修为（丹不消耗，可再攒）
    resultMessage = '渡劫失败，修为散尽';
  }
  if (!persistSafely()) {
    state.player = playerCheckpoint;
    state.rngState = rngCheckpoint;
    setPersistenceIssue({ kind: 'save', message: '突破结果保存失败，请重试' });
    return false;
  }
  toast(resultMessage);
  return true;
}

function isPersistenceLocked() {
  return !!state._persistenceIssue;
}

function getPersistenceStatus() {
  const issue = state._persistenceIssue;
  if (!issue) {
    return {
      locked: false,
      kind: null,
      message: '',
      error: null,
      canRetry: false
    };
  }
  return {
    locked: true,
    kind: issue.kind,
    message: issue.message,
    error: issue.error || 'storage-write-failed',
    canRetry: issue.canRetry !== false,
    savedAt: issue.savedAt,
    now: issue.now
  };
}

function setPersistenceIssue(issue) {
  persistenceRecovery.updateIssue(issue);
  toast(state._persistenceIssue.message);
}

function clearPersistenceIssue() {
  state._persistenceIssue = null;
}

function runtimeModelAt() {
  return StateModel.fromRuntime(
    state /* runtime */,
    Number.isFinite(state.processedThroughMs)
      ? state.processedThroughMs
      : Date.now()
  );
}

const persistenceRecovery = (function () {
  let held = null;

  function summarizeCandidate(model) {
    if (!model) return null;
    return {
      processedThroughMs: model.processedThroughMs,
      rngState: model.rngState,
      pendingReportCount: Array.isArray(model.pendingOfflineReports)
        ? model.pendingOfflineReports.length
        : 0
    };
  }

  function publicIssue(descriptor) {
    return {
      kind: descriptor.kind || 'save',
      message: descriptor.message || '保存失败，请重试',
      error: descriptor.error || 'storage-write-failed',
      savedAt: descriptor.savedAt,
      now: descriptor.now,
      successMessage: descriptor.successMessage || '',
      onSuccess: descriptor.onSuccess || ''
    };
  }

  function hold(descriptor) {
    if (held) return false;
    held = {
      kind: descriptor.kind || 'save',
      message: descriptor.message || '保存失败，请重试',
      error: descriptor.error || 'storage-write-failed',
      savedAt: descriptor.savedAt,
      now: descriptor.now,
      fromMs: descriptor.fromMs,
      toMs: descriptor.toMs,
      source: descriptor.source || null,
      mainActionLimitSeconds: descriptor.mainActionLimitSeconds,
      candidate: descriptor.candidate
        ? StateModel.toSnapshotInput(descriptor.candidate)
        : null,
      baseModel: descriptor.baseModel
        ? StateModel.toSnapshotInput(descriptor.baseModel)
        : null,
      candidateSummary: descriptor.candidateSummary
        ? cloneRuntimeState(descriptor.candidateSummary)
        : summarizeCandidate(descriptor.candidate),
      successMessage: descriptor.successMessage || '',
      onSuccess: descriptor.onSuccess || '',
      resumeStartupAt: descriptor.resumeStartupAt
    };
    state._persistenceIssue = publicIssue(held);
    return true;
  }

  function updateIssue(issue) {
    if (!held) {
      hold(Object.assign({
        candidate: runtimeModelAt(),
        now: state.processedThroughMs
      }, issue || {}));
      return;
    }
    const next = issue || {};
    [
      'kind',
      'message',
      'error',
      'savedAt',
      'now',
      'successMessage',
      'onSuccess'
    ].forEach(function (key) {
      if (next[key] !== undefined) held[key] = next[key];
    });
    state._persistenceIssue = publicIssue(held);
  }

  function offlineCandidate(descriptor) {
    const base = StateModel.normalize(
      descriptor.baseModel,
      descriptor.fromMs
    );
    const result = simulateModel(
      base,
      descriptor.fromMs,
      descriptor.toMs,
      'offline',
      descriptor.mainActionLimitSeconds
    );
    result.state.pendingOfflineReports = SimulationReport.addPending(
      base.pendingOfflineReports,
      result.report
    );
    return {
      model: result.state /* simulated */,
      report: result.report
    };
  }

  function retry() {
    if (!held) return true;
    const descriptor = held;
    let candidate = descriptor.candidate
      ? StateModel.normalize(descriptor.candidate, descriptor.now)
      : null;
    let report = null;
    if (descriptor.kind === 'offline' && descriptor.baseModel) {
      const replay = offlineCandidate(descriptor);
      candidate = replay.model;
      report = replay.report;
    }
    if (!candidate) return false;
    const saveAt = descriptor.kind === 'repair' &&
      Number.isFinite(descriptor.savedAt)
      ? descriptor.savedAt
      : Number.isFinite(descriptor.now)
        ? descriptor.now
      : candidate.processedThroughMs;
    if (!persistModel(candidate, saveAt)) return false;

    held = null;
    clearPersistenceIssue();
    applyModelToRuntime(candidate);
    state._lastSimulationReport = report || state._lastSimulationReport;
    state._last = Date.now();
    state._hiddenAt = null;

    if (descriptor.onSuccess === 'appearance') {
      state.phase = 'game';
      state.navIndex = NAV_HOME;
      state.dirty = true;
    }
    if (descriptor.kind === 'repair' &&
        Number.isFinite(descriptor.resumeStartupAt)) {
      const repairedSnapshot = SaveSystem.load(
        Platform,
        descriptor.resumeStartupAt
      ).snapshot;
      return settleStartupOffline(
        repairedSnapshot,
        descriptor.resumeStartupAt
      ).ok;
    }
    if (descriptor.successMessage) toast(descriptor.successMessage);
    return true;
  }

  function testSnapshot() {
    if (!held) return null;
    return StateModel.readonly({
      kind: held.kind,
      message: held.message,
      error: held.error,
      savedAt: held.savedAt,
      now: held.now,
      fromMs: held.fromMs,
      toMs: held.toMs,
      source: held.source,
      candidateSummary: held.candidateSummary
    });
  }

  function isLocked() {
    return !!held || !!state._persistenceIssue;
  }

  function message() {
    return state._persistenceIssue && state._persistenceIssue.message
      ? state._persistenceIssue.message
      : '存档失败，请重试';
  }

  return Object.freeze({
    hold,
    updateIssue,
    retry,
    testSnapshot,
    isLocked,
    message
  });
})();

function persistCurrentModel(now) {
  if (isPersistenceLocked()) return false;
  const watermark = now == null
    ? Date.now()
    : Math.max(0, Math.floor(Number(now) || 0));
  const candidate = runtimeModelAt();
  candidate.processedThroughMs = watermark; // 修复离线结算：保存时把结算水位线对齐到当前真实时间，避免刷新/关闭后把在线时段误算成离线
  const saved = persistModel(candidate, watermark);
  if (saved) {
    applyModelToRuntime(candidate);
    return true;
  }
  persistenceRecovery.hold({
    kind: 'save',
    message: '保存失败，请重试',
    now: watermark,
    candidate
  });
  return false;
}

function persist(now) {
  return persistCurrentModel(now);
}

function cloneRuntimeState(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function offlineDisplayResult(reports) {
  const summary = SimulationReport.summarize(reports);
  const result = {};
  Object.keys(summary.action.byKey).forEach(function (key) {
    result[key] = summary.action.byKey[key];
  });
  return Object.keys(result).length > 0 ? result : null;
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
  // Combat loadout queries require a full cloneable model. queryView is a
  // hot-path projection that can omit/reshape fields CombatLoadouts rejects
  // while a session is active — prefer fromRuntime in that window.
  const combatSessionActive = !!(state.systems &&
    state.systems.combat &&
    state.systems.combat.session);
  const model = (!combatSessionActive &&
      typeof StateModel.queryView === 'function')
    ? StateModel.queryView(state, state.processedThroughMs)
    : StateModel.fromRuntime(state, state.processedThroughMs);
  queryModelFrameCache = model;
  queryModelFrameId = queryModelRenderFrame;
  queryModelTTLCache = model;
  queryModelTTLAt = now;
  return model;
}

function applyModelToRuntime(model) {
  invalidateQueryModelCache();
  StateModel.applyToRuntime(state /* runtime */, model);
  state.parts = normalizeParts(
    model.appearance && model.appearance.parts
  );
  state.player = state.player ? ensurePlayer(state.player) : null;
  state.offlineResult = null;
  state.showOffline = state.pendingOfflineReports.length > 0;
}

function persistModel(model, nowMs) {
  return SaveSystem.save(
    Platform,
    StateModel.toSnapshotInput(model),
    nowMs
  ) === true;
}

function normalizeStartupModel(snapshot, now) {
  const model = StateModel.normalize(snapshot, now);
  if (!model.player) return model;
  const player = cloneRuntimeState(model.player);
  const rawPlayer = snapshot && snapshot.player;
  if (rawPlayer &&
      !Object.prototype.hasOwnProperty.call(rawPlayer, 'shouyuan')) {
    delete player.shouyuan;
  }
  if (rawPlayer &&
      !Object.prototype.hasOwnProperty.call(rawPlayer, 'shouMax')) {
    delete player.shouMax;
  }
  model.player = ensurePlayer(player);
  return model;
}

// 离线结算最短间隔门槛：离线时长不足该值时，启动时不弹「离线结算」弹窗，
// 避免用户快速刷新网页（只离开几秒/几十秒）也误弹一次收益弹窗。
// 语义为「至少 1 分钟」：offlineSeconds >= 60 才结算，60 秒整也算触发。
const MIN_OFFLINE_SETTLE_MS = 60000;
// 离线寿元/被动结算允许的最大回看窗口：与离线收益上限同级（默认 48 小时），
// 防止水位线损坏（如历史默认 0）时从纪元初一口气把寿元耗尽。
const MAX_OFFLINE_LOOKBACK_MS = 172800 * 1000;
function sanitizeTimeCursorMs(rawFromMs, nowMs, fallbackMs) {
  const now = Math.max(0, Math.floor(Number(nowMs) || 0));
  const fallback = Number.isFinite(fallbackMs) && fallbackMs > 0
    ? fallbackMs
    : now;
  let from = Number.isFinite(rawFromMs) ? rawFromMs : fallback;
  // 0 / 负数视为未初始化水位线，绝不能当「从 1970 年起算」去扣寿元。
  if (!Number.isFinite(from) || from <= 0) {
    from = fallback > 0 ? fallback : now;
  }
  from = Math.min(from, now);
  const earliest = Math.max(0, now - MAX_OFFLINE_LOOKBACK_MS);
  if (from < earliest) from = earliest;
  return from;
}
function sanitizeOfflineFromMs(model, now) {
  const savedAt = Number.isFinite(model && model.savedAt)
    ? model.savedAt
    : now;
  return sanitizeTimeCursorMs(
    model && model.processedThroughMs,
    now,
    savedAt
  );
}
function kickEnsureCombatRuntime() {
  if (typeof LazyContent !== 'undefined' &&
      LazyContent &&
      typeof LazyContent.ensureCombatRuntime === 'function') {
    return LazyContent.ensureCombatRuntime();
  }
  if (typeof refreshStage3CombatRuntime === 'function') {
    refreshStage3CombatRuntime();
  }
  return Promise.resolve(useStage3CombatRuntime);
}

function modelNeedsCombatRuntime(model) {
  if (!model || typeof model !== 'object') return false;
  const key = model.current && typeof model.current.key === 'string'
    ? model.current.key
    : '';
  if (key.indexOf('combat:') === 0) return true;
  const combat = model.systems && model.systems.combat;
  if (!combat || typeof combat !== 'object') return false;
  if (combat.session) return true;
  if (combat.injury) return true;
  const pending = combat.pendingRewards;
  if (pending && typeof pending === 'object') {
    if (Array.isArray(pending) && pending.length > 0) return true;
    if (!Array.isArray(pending) && Object.keys(pending).length > 0) return true;
  }
  return false;
}

function snapshotNeedsCombatRuntime(snapshot) {
  return modelNeedsCombatRuntime(snapshot);
}

function settleStartupOffline(snapshot, nowMs) {
  const now = Math.max(0, Math.floor(Number(nowMs) || 0));
  const model = normalizeStartupModel(snapshot, now);
  if (isPersistenceLocked()) {
    return {
      ok: false,
      snapshot: cloneRuntimeState(snapshot),
      state: model,
      report: null,
      newReports: []
    };
  }
  const rawThrough = Number.isFinite(model.processedThroughMs)
    ? model.processedThroughMs
    : 0;
  const clockRollback = rawThrough > now;
  const from = sanitizeOfflineFromMs(model, now);
  // 水位线曾损坏时写回合理值，避免下次启动再次从 0 结算
  if (!clockRollback && rawThrough !== from) {
    model.processedThroughMs = from;
  }
  const newReports = [];
  let candidate = model;
  let report = null;
  let didPersist = false;

  if (clockRollback) {
    report = SimulationReport.create({
      source: 'offline',
      fromMs: now,
      toMs: now,
      requestedSeconds: 0,
      actionKey: model.current ? model.current.key : null,
      seedBefore: model.rngState
    });
    report.warnings.push('clock_rollback');
    candidate = StateModel.normalize(model, now);
    candidate.processedThroughMs = model.processedThroughMs;
    candidate.pendingOfflineReports = SimulationReport.addPending(
      model.pendingOfflineReports,
      report
    );
    newReports.push(report);
    if (!persistModel(candidate, now)) {
      applyModelToRuntime(model);
      persistenceRecovery.hold({
        kind: 'offline',
        message: '离线收益保存失败，请重试',
        savedAt: now,
        now,
        fromMs: now,
        toMs: now,
        source: 'clock_rollback',
        candidate
      });
      toast('离线收益保存失败，请重试');
      return {
        ok: false,
        snapshot: cloneRuntimeState(snapshot),
        state: model,
        report,
        newReports: []
      };
    }
    didPersist = true;
  } else if (now - from >= MIN_OFFLINE_SETTLE_MS) {
    const limit = model.systems &&
      Number.isFinite(model.systems.offlineLimitSeconds)
      ? model.systems.offlineLimitSeconds
      : (model.offlineLimitSeconds || 43200);
    const result = simulateModel(model, from, now, 'offline', limit);
    report = result.report;
    result.state.pendingOfflineReports = SimulationReport.addPending(
      model.pendingOfflineReports,
      report
    );
    candidate = result.state;
    newReports.push(report);
    if (!persistModel(candidate, now)) {
      applyModelToRuntime(model);
      persistenceRecovery.hold({
        kind: 'offline',
        message: '离线收益保存失败，请重试',
        savedAt: from,
        now,
        fromMs: from,
        toMs: now,
        source: 'offline',
        mainActionLimitSeconds: limit,
        baseModel: model,
        candidateSummary: {
          processedThroughMs: result.state.processedThroughMs,
          rngState: result.state.rngState,
          pendingReportCount: result.state.pendingOfflineReports.length
        }
      });
      toast('离线收益保存失败，请重试');
      return {
        ok: false,
        snapshot: cloneRuntimeState(snapshot),
        state: model,
        report,
        newReports: []
      };
    }
    didPersist = true;
  }

  applyModelToRuntime(candidate);
  state._lastSimulationReport = report;
  state._offlineSec = Math.max(0, (now - from) / 1000);
  const savedSnapshot = didPersist
    ? SaveSystem.load(Platform, now).snapshot
    : SaveSystem.createSnapshot(
      StateModel.toSnapshotInput(candidate),
      now
    );
  return {
    ok: true,
    snapshot: savedSnapshot,
    state: StateModel.normalize(savedSnapshot, now),
    report,
    newReports
  };
}

function persistSafely(now) {
  try {
    return persistCurrentModel(now) === true;
  } catch (error) {
    return false;
  }
}

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

function commitModel(mutator, nowMs, recovery, options) {
  if (persistenceRecovery.isLocked()) {
    return commandResult(
      false,
      'persistence_locked',
      false,
      persistenceRecovery.message(),
      null
    );
  }
  const now = Number.isFinite(Number(nowMs))
    ? Math.max(0, Math.floor(Number(nowMs)))
    : Date.now();
  const rawThrough = Number.isFinite(state.processedThroughMs)
    ? state.processedThroughMs
    : now;
  // 与离线启动同一套消毒：水位线 0/损坏/过旧时，禁止在线 settle 从纪元初扣光寿元。
  const settleFrom = sanitizeTimeCursorMs(rawThrough, now, now);
  if (rawThrough !== settleFrom) {
    state.processedThroughMs = settleFrom;
  }
  const base = StateModel.fromRuntime(state /* runtime */, settleFrom);
  base.processedThroughMs = settleFrom;
  let candidate = base;
  let settledToTimestamp = false;
  if (options &&
      options.settleToTimestamp === true &&
      now > settleFrom) {
    candidate = simulateModel(
      base,
      settleFrom,
      now,
      'online',
      null
    ).state;
    settledToTimestamp = true;
  }
  const result = typeof mutator === 'function'
    ? mutator(candidate)
    : null;
  // 未发生补算时，失败命令直接返回；若已 settle，必须落盘补算结果，不能丢弃时间推进。
  if (result &&
      result.ok === false &&
      result.changed === false &&
      !settledToTimestamp) {
    return result;
  }
  if (result && result.changed === false && !settledToTimestamp) {
    return result;
  }

  let saved = false;
  try {
    saved = persistModel(candidate, now);
  } catch (error) {
    saved = false;
  }
  if (!saved) {
    const descriptor = recovery || {};
    persistenceRecovery.hold({
      kind: descriptor.kind || 'save',
      message: descriptor.message || '存档失败，请重试',
      successMessage: descriptor.successMessage || '',
      onSuccess: descriptor.onSuccess || '',
      candidate,
      now,
      success: result && result.data || null
    });
    return commandResult(false, 'save_failed', false, '存档失败，请重试', {
      retryable: true
    });
  }
  applyModelToRuntime(candidate);
  const newStatus = candidate.player && candidate.player.lifecycle
    ? candidate.player.lifecycle.status
    : null;
  if (settledToTimestamp &&
      newStatus === 'safety_buffer' &&
      !state.showLifespanBuffer) {
    state.showLifespanBuffer = true;
  }
  if (result && result.ok === false) return result;
  if (result && result.changed === false) return result;
  return commandResult(
    true,
    'ok',
    true,
    result && result.message || null,
    result && result.data || null
  );
}

function acknowledgeOffline(reportIds) {
  if (isPersistenceLocked()) {
    return commandResult(false, 'persistence_locked', false, null, null);
  }
  const model = StateModel.fromRuntime(
    state /* runtime */,
    state.processedThroughMs
  );
  const ids = new Set(reportIds || []);
  const selected = model.pendingOfflineReports.filter(function (report) {
    return ids.has(report.id);
  });
  if (!selected.length) {
    return commandResult(true, 'no_change', false, null, null);
  }

  const candidate = StateModel.normalize(model, model.processedThroughMs);
  candidate.reportArchive = SimulationReport.archive(
    model.reportArchive,
    selected,
    50
  );
  candidate.pendingOfflineReports = model.pendingOfflineReports.filter(
    function (report) {
      return !ids.has(report.id);
    }
  );
  const saveAt = candidate.processedThroughMs;
  if (!persistModel(candidate, saveAt)) {
    persistenceRecovery.hold({
      kind: 'closeOffline',
      message: '保存失败，离线收益仍待领取',
      successMessage: '离线收益已领取',
      now: saveAt,
      candidate
    });
    return commandResult(false, 'save_failed', false, null, null);
  }
  applyModelToRuntime(candidate);
  return commandResult(true, 'acknowledged', true, null, {
    reportIds: selected.map(function (report) { return report.id; })
  });
}

function closeOffline() {
  const model = StateModel.fromRuntime(
    state /* runtime */,
    state.processedThroughMs
  );
  return acknowledgeOffline(
    model.pendingOfflineReports.map(function (report) { return report.id; })
  ).ok;
}

function retryPersistence() {
  if (state._persistenceIssue &&
      state._persistenceIssue.kind === 'future') {
    return false;
  }
  return persistenceRecovery.retry();
}

// 常驻顶部状态栏 — 全屏顶层栏（§10 ① 三段式之一）
// 横跨整个屏幕宽度（x=0, w=W），在左侧导航之上绘制，属于最高层 UI
// 标准手游 HUD：[独立头像列] ‖ [上行:名字+资源] / [下行:境界标签+经验条+突破]
// HUD 内容区固定高度（与 safeTop 无关），整体下移 safeTop 避让刘海
const HUD_H = 72;
const HUD_CONTENT_Y = () => safeTop;



// 7. 游戏主界面内容区（洞府首页 / 其他占位）


// 洞府首页：境界信息 + 快捷入口（§5 / §10⑤）
// 动作进度条已移到对应技艺页的行为卡上（梅尔沃式），洞府不再显示
// 立绘已移入顶栏左侧小头像，主内容区不再显示大图


// 突破内容（§5 界面）：境界 + 寿元条 + 修为条 + 突破条件/概率清单 + 大突破按钮
// bottomLimit：内容底限 Y（弹窗模式下传面板底边，避免按钮溢出）


// 突破弹窗（替代独立『突破』页签）：点顶栏突破按钮弹出，半透明遮罩 + 居中面板


// 轮回结算页（寿元耗尽）：全屏覆盖，点「入轮回」重开（保留外观）


// 入轮回：重置角色档案（修为/境界/资源/寿元回初始），保留外观
function enterLunhui() {
  if (isPersistenceLocked()) return false;
  const checkpoint = {
    player: cloneRuntimeState(state.player),
    current: cloneRuntimeState(state.current),
    showLunhui: state.showLunhui,
    navIndex: state.navIndex,
    world: cloneRuntimeState(
      state.systems && state.systems.world ? state.systems.world : null
    )
  };
  state.player = defaultPlayer();
  state.current = null;
  state.showLunhui = false;
  state.navIndex = NAV_HOME;
  if (stage5Bootstrap && stage5Bootstrap.LegacyTransition &&
      typeof stage5Bootstrap.LegacyTransition.clearPreviousLifeChronicle ===
        'function') {
    stage5Bootstrap.LegacyTransition.clearPreviousLifeChronicle(state);
  } else if (state.systems && state.systems.world) {
    state.systems.world.worldEvents = [];
    state.systems.world.nextWorldEventId = 1;
  }
  if (!persistSafely()) {
    state.player = checkpoint.player;
    state.current = checkpoint.current;
    state.showLunhui = checkpoint.showLunhui;
    state.navIndex = checkpoint.navIndex;
    if (checkpoint.world && state.systems) {
      state.systems.world = checkpoint.world;
    }
    setPersistenceIssue({ kind: 'save', message: '轮回结果保存失败，请重试' });
    return false;
  }
  toast('入轮回，重生于练气一层');
  return true;
}

// 技艺页（梅尔沃式：标题 + 等级 + XP 条 + 描述 + 动作卡片网格）
// 梅尔沃式行为卡：图标 + 名称 + 等级/耗时/经验 + 产出消耗 + 进行中进度条




// 采集系竖向卡片（探索 / 资源点 / 钓点），与截图 UI 排版保持一致


// ── 内容区滚动辅助 ──
// 进入可滚动区块：裁剪到可视区、夹取偏移，返回当前偏移量（设计坐标 px）。
// 调用方用 drawY = baseY - offset 摆放卡片并注册点击区，使点击坐标与视觉一致。
function beginScroll(x, top, w, bottom, contentH) {
  const visH = bottom - top;
  contentMaxScroll = Math.max(0, contentH - visH);
  if (contentScroll < 0) contentScroll = 0;
  if (contentScroll > contentMaxScroll) contentScroll = contentMaxScroll;
  contentArea = { top: top, bottom: bottom, x: x, w: w };
  inScrollRegion = true;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, top, w, visH); ctx.clip();
  return contentScroll;
}
function endScroll() { inScrollRegion = false; ctx.restore(); }
// 上/下「还有更多」淡紫提示箭头


// 采集系技艺页（采矿/伐木/钓鱼/采药）：竖向卡片网格


// 储物袋页（资源网格）


// 离线收益结算面板（全屏覆盖）
function fmtDur(sec) {
  sec = Math.floor(sec); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h > 0) return h + ' 小时 ' + m + ' 分';
  return m + ' 分 ' + (sec % 60) + ' 秒';
}

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


function onlineAdvanceMinMs() {
  // 在线推进每次都会 fromRuntime + Simulation 深拷贝整份世界。
  // 不必跟 rAF 60Hz 对齐；战斗稍密，其余约 12Hz 足够。
  const key = state.current && state.current.key;
  if (typeof key === 'string' && key.indexOf('combat:') === 0) return 33;
  return 80;
}

function advanceVisibleTo(nowMs) {
  if (isPersistenceLocked() || state._hiddenAt != null) return false;
  const now = Math.max(0, Math.floor(Number(nowMs) || 0));
  if (state._last == null) state._last = now;
  if (now < state._last) {
    state._last = now;
    return true;
  }
  if (now - state._last < onlineAdvanceMinMs()) return true;
  advanceGameplay(state._last, now, 'online', null);
  state._last = now;
  return true;
}

function runRuntimeFrame(nowMs) {
  const now = Math.max(0, Math.floor(Number(nowMs) || 0));
  if (!advanceVisibleTo(now)) return false;
  if (now >= state._nextAutosaveAt) {
    state._nextAutosaveAt = now + 30000;
    if (!persistCurrentModel(now)) return false;
  }
  return true;
}

// 后台定时器句柄：标签页最小化 / App 切后台时，浏览器会暂停 requestAnimationFrame，
// 主循环不再推进 → 游戏时钟冻结 → 重伤恢复倒计时等「实时减益 / 冷却」会卡住不动。
// 这里挂一个粗粒度（1s）后台定时器，按真实墙钟时间持续推进游戏时钟，
// 让重伤恢复等实时状态在最小化期间照常生效。
// 离线收益弹窗仍只在「完全重新加载页面」时触发（settleStartupOffline），
// 后台期间推进的 processedThroughMs 会随自动存档落盘，重载时离线区间自然变小，不会重复结算。
let hiddenTicker = null;
function startHiddenTicker() {
  if (hiddenTicker != null) return;
  if (typeof setInterval !== 'function') return;
  hiddenTicker = setInterval(function () { advanceHidden(Date.now()); }, 1000);
}
function stopHiddenTicker() {
  if (hiddenTicker != null) {
    if (typeof clearInterval === 'function') clearInterval(hiddenTicker);
    hiddenTicker = null;
  }
}
// 后台持续推动游戏时钟：跳过 _hiddenAt 守卫，直接走 advanceGameplay，
// 让模拟管线（含 injuryRecoveryLane）按真实经过时间推进。
function advanceHidden(nowMs) {
  if (isPersistenceLocked() || state._hiddenAt == null) return;
  const now = Math.max(0, Math.floor(Number(nowMs) || 0));
  if (state._last == null) state._last = now;
  if (now > state._last) {
    advanceGameplay(state._last, now, 'online', null);
    state._last = now;
  }
  if (now >= state._nextAutosaveAt) {
    state._nextAutosaveAt = now + 30000;
    persistCurrentModel(now);
  }
}

function handleVisibilityChange(hidden, nowMs) {
  const now = Math.max(0, Math.floor(Number(nowMs) || 0));
  if (isPersistenceLocked()) return false;
  if (hidden) {
    if (state._hiddenAt != null) return true;
    if (!advanceVisibleTo(now)) return false;
    state._hiddenAt = now;
    state._last = now;
    if (!persistCurrentModel(now)) return false;
    startHiddenTicker();
    return true;
  }

  // 由后台回到前台：停止后台定时器；若后台定时器被系统杀掉，补算隐藏期间，
  // 再把运行交还给 rAF 主循环（用同一套水位线消毒，避免一次扣光寿元）。
  stopHiddenTicker();
  state._hiddenAt = null;
  const through = Number.isFinite(state.processedThroughMs)
    ? state.processedThroughMs
    : now;
  if (now > through) {
    advanceGameplay(through, now, 'online', null);
  }
  state._last = now;
  state._nextAutosaveAt = now + 30000;
  return true;
}

function flushLifecycle(nowMs) {
  if (isPersistenceLocked()) return false;
  if (state._hiddenAt != null) return true;
  const now = Math.max(0, Math.floor(Number(nowMs) || 0));
  if (!advanceVisibleTo(now)) return false;
  return persistCurrentModel(now);
}

// 9. 主循环（rAF，无死循环）
let fps = 0, frames = 0, fpsT = 0;
function render() {
  // 帧率统计
  const now = Date.now(); frames++;
  if (now - fpsT > 1000) { fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now; }

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
    regions = [];
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
      window.UI.renderGame();
    }
  } catch (err) {
    console.error('[render] UI.renderGame error:', err && err.stack ? err.stack : err);
  }

  requestAnimationFrame(render);
}

// 10. 交互逻辑
let regions = [];
let touchStartPt = null, touchMoved = false;
let navDragStart = null;          // 导航拖动起点（在导航区按下时记录）

Platform.onTouchStart((res) => {
  const t = res.touches[0]; if (!t) return;
  console.log('[touchStart]', t.clientX, t.clientY, 'touches=', res.touches.length);
  const v = Platform.view;
  const lx = (t.clientX - v.offsetX) / v.scale, ly = (t.clientY - v.offsetY) / v.scale; // 原始屏坐标 → 设计坐标(420×820)
  touchStartPt = { x: lx, y: ly };
  touchMoved = false;
  // 按在左侧导航区（x<78 且 y>70）→ 准备拖动导航
  if (lx < 78 && ly > 70) { navDragStart = { y: ly, scroll: navScroll }; }
  // 按在右侧内容区且当前页可滚动 → 准备拖动内容列表
  else if (contentMaxScroll > 0 && lx >= contentArea.x && lx <= contentArea.x + contentArea.w
           && ly > contentArea.top && ly < contentArea.bottom) {
    contentDragStart = { y: ly, scroll: contentScroll };
  }
});

Platform.onTouchMove((res) => {
  const t = res.touches[0]; if (!t || !touchStartPt) return;
  const v = Platform.view;
  const ly = (t.clientY - v.offsetY) / v.scale;                       // 设计坐标
  if (Math.abs(ly - touchStartPt.y) > 6) touchMoved = true;
  // 导航拖动：上下拖 → 列表跟着滚
  if (navDragStart) {
    navScroll = navDragStart.scroll + (navDragStart.y - ly);
  }
  // 内容区拖动：上下拖 → 卡片列表跟着滚
  else if (contentDragStart) {
    contentScroll = contentDragStart.scroll + (contentDragStart.y - ly);
  }
});

Platform.onTouchEnd((res) => {
  const t = res.changedTouches[0] || res.touches[0];
  if (!t || !touchStartPt) return;
  console.log('[touchEnd]', t.clientX, t.clientY, 'moved=', touchMoved);
  const v = Platform.view;
  const lx = (t.clientX - v.offsetX) / v.scale, ly = (t.clientY - v.offsetY) / v.scale;   // 设计坐标
  if (!touchMoved) handleTap(lx, ly);
  touchStartPt = null;
  navDragStart = null;
  contentDragStart = null;
});

function handleTap(px, py) {
  console.log('[handleTap]', px, py, 'regions=', regions.length);
  for (const r of regions) {
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
      console.log('[HIT]', r.name, 'rect=', r);
      onHit(r.name); return;
    }
  }
  console.log('[MISS] no region matched at', px, py);
}

function onHit(name) {
  if (name === 'btn_break') { state.showBreak = true; return; }                 // 顶栏突破按钮 → 弹出突破弹窗（替代独立页签）
  if (name === 'btn_break_close') { state.showBreak = false; return; }          // 弹窗关闭（×）
  if (name === 'btn_break_confirm') { if (tryBreakthrough()) state.showBreak = false; return; }  // 执行突破并关闭弹窗
  if (name === 'btn_lunhui') { enterLunhui(); return; }                         // 轮回页 → 重开
  if (name.indexOf('res_') === 0) { const k = name.slice(4); const p = ensurePlayer(state.player); toast(k + '：' + (p[k] || 0)); return; }
  if (name.indexOf('act_') === 0) { setCurrent(name.slice(4)); return; }
  // 采集系：探索按钮
  if (name.indexOf('gather_explore_') === 0) {
    const skill = name.slice('gather_explore_'.length);
    setCurrent('gather:explore:' + skill);
    return;
  }
  // 采集系：条目卡片（gather_<skill>_<entryId>）
  if (name.indexOf('gather_') === 0) {
    const rest = name.slice('gather_'.length);
    const skill = rest.split('_')[0];
    const entryId = rest.slice(skill.length + 1);
    setCurrent('gather:' + skill + ':' + entryId);
    return;
  }
  if (name === 'close_offline') { closeOffline(); return; }
  if (name === 'rand') { randomize(); return; }
  if (name === 'confirm_create') { confirmCreate(); return; }
  if (name === 'save_back') { commitAppearanceEdit(); return; }
  if (name.indexOf('sel_prev_') === 0) { stepPart(name.slice(9), -1); return; }
  if (name.indexOf('sel_next_') === 0) { stepPart(name.slice(9), 1); return; }
  if (name.indexOf('nav_') === 0) {
    const i = parseInt(name.slice(4), 10);
    if (NAV[i] === '设置') { state.phase = 'edit'; state.dirty = true; }  // 设置页 → 编辑形象
    else { state.navIndex = i; contentScroll = 0; }                       // 切页重置内容滚动偏移
    return;
  }
}

// 序号步进：按传入部件类别，±1 调整序号（到头循环）
function stepPart(cat, d) {
  if (isPersistenceLocked()) return false;
  const list = NIE[state.gender][cat];
  const n = list.length;
  if (n <= 0) return;
  let i = state.parts[cat] + d;
  if (i < 0) i = n - 1;          // 循环到末尾
  if (i >= n) i = 0;              // 循环到开头
  state.parts[cat] = i;
  state.dirty = true;
  return true;
}
function randomize() {
  if (isPersistenceLocked()) return false;
  for (const c of CATS) {
    const n = NIE[state.gender][c].length;
    state.parts[c] = n > 0 ? Math.floor(gameRandom() * n) : 0;
  }
  state.dirty = true;
  return true;
}
function save() {
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
}

function commitAppearanceEdit() {
  if (isPersistenceLocked()) return false;
  if (!persistSafely()) {
    setPersistenceIssue({
      kind: 'save',
      message: '形象保存失败，请重试',
      successMessage: '形象已更新',
      onSuccess: 'appearance'
    });
    return false;
  }
  state.phase = 'game';
  state.navIndex = NAV_HOME;
  state.dirty = true;
  toast('形象已更新');
  return true;
}

// 首次创建角色：落档外观 + 创建标记 + 角色档案，然后进入主游戏
function confirmCreate() {
  if (isPersistenceLocked()) return false;
  const player = defaultPlayer();
  state.player = player;
  state.created = true;
  state.phase = 'game';
  state.navIndex = NAV_HOME;
  state.dirty = true;
  if (typeof LazyContent !== 'undefined' && LazyContent) {
    if (typeof LazyContent.ensureUiPages === 'function') {
      LazyContent.ensureUiPages().catch(function () { /* ignore */ });
    }
    if (typeof LazyContent.ensureGameStyles === 'function') {
      LazyContent.ensureGameStyles().catch(function () { /* ignore */ });
    }
  }
  if (!persistSafely()) {
    setPersistenceIssue({
      kind: 'save',
      message: '角色创建保存失败，请重试',
      successMessage: '角色创建成功，开始修行'
    });
    return false;
  }
  toast('角色创建成功，开始修行');
  return true;
}

// 11. 启动（屏幕适配由 platform.js 统一管理：宽度优先 + 动态高度）
//    Platform.view.scale / logicalH / offsetX / offsetY 由 resize() 自动计算。
//    此处只读 Platform.view 拿参数，并执行读档/状态初始化。
const DW = 420, DH = 820;
Platform.getSystemInfoAsync({
  success(res) {
    var v = Platform.view;
    dpr = v.dpr || res.pixelRatio || 1;
    safeTop = v.safeTop || (res.safeArea ? res.safeArea.top : 0);
    S = v.scale || 1;                        // 等比缩放（platform.js 已算好）
    W = DW; H = v.logicalH || DH;            // 逻辑宽度固定 420，高度随屏幕动态
    scale = 1;                               // 字体由 transform 缩放，不双重缩放

    function beginStartupAfterContent() {
      // VM harnesses drive models themselves; applying an empty save would wipe them.
      if (runtimeRoot && runtimeRoot.__GAME_TEST_HARNESS_REQUEST__ === true) {
        return;
      }
      try {
        const now = Date.now();
        const loaded = SaveSystem.load(Platform, now);
        const save = loaded.snapshot;
        const combatWarm = snapshotNeedsCombatRuntime(save) &&
          typeof LazyContent !== 'undefined' &&
          LazyContent &&
          typeof LazyContent.ensureCombatRuntime === 'function'
          ? LazyContent.ensureCombatRuntime()
          : Promise.resolve();
        combatWarm.then(function () {
          finishStartupWithSave(loaded, now);
        }, function () {
          finishStartupWithSave(loaded, now);
        });
      } catch (error) {
        // Harnesses without full Stage4/Save topology still boot game.js.
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[startup] skipped:', error && error.message);
        }
        requestAnimationFrame(render);
      }
    }

    function finishStartupWithSave(loaded, now) {
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
          settleStartupOffline(
            SaveSystem.load(Platform, now).snapshot,
            now
          );
        }
      } else {
        settleStartupOffline(save, now);
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
      requestAnimationFrame(render);
    }

    const herbloreReady = (typeof LazyContent !== 'undefined' &&
      LazyContent && typeof LazyContent.ensureHerblore === 'function')
      ? LazyContent.ensureHerblore()
      : Promise.resolve();
    herbloreReady.then(beginStartupAfterContent, beginStartupAfterContent);
  }
});

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
  if (useStage4Runtime && stage4Bootstrap && stage4Bootstrap.WorldMonth &&
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
      if (useStage2Runtime) {
        duration = stage2RuntimeActionDuration(stage2QueryModel(), cur.key);
      }
      if (!duration &&
          typeof ACTIONS !== 'undefined' && ACTIONS[cur.key] && ACTIONS[cur.key].time) {
        duration = ACTIONS[cur.key].time;
      }
      const elapsed = useStage2Runtime ? stage2Elapsed(cur) : (cur.elapsed || 0);
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
            useStage2Runtime ? stage2QueryModel : null
          ),
          stalled: !!cur.stalled,
          progress: progress,
          combat: isCombatView
        }
      : null
  };
}

// 储物袋：固定资源 + 采集系细粒度物品（数量>0 才显示）
function getInventoryList() {
  const p = getPlayer();
  const stacks = p.inventory.stacks;
  const list = [
    { k: 'xiwei', n: '修为', v: p.xiwei }, { k: 'jingqi', n: '精气', v: p.jingqi },
    { k: 'lingshi', n: '灵石', v: p.lingshi }, { k: 'shengwang', n: '声望', v: p.shengwang },
    { k: 'yaocai', n: '药材', v: stacks.yaocai || 0 }, { k: 'lingkuang', n: '灵矿', v: stacks.lingkuang || 0 },
    { k: 'muliao', n: '木料', v: stacks.muliao || 0 }, { k: 'shicai', n: '食材', v: stacks.shicai || 0 },
    { k: 'caiqing', n: '才情', v: stacks.caiqing || 0 }, { k: 'faqi', n: '法器', v: stacks.faqi || 0 },
    { k: 'hujia', n: '护甲', v: stacks.hujia || 0 }, { k: 'shanshi', n: '膳食', v: stacks.shanshi || 0 },
    { k: 'fu', n: '符箓', v: stacks.fu || 0 }, { k: 'tupo', n: '筑基丹', v: stacks.tupo || 0 },
    { k: 'heal', n: '疗伤丹', v: stacks.heal || 0 }, { k: 'jindan', n: '金丹丹', v: stacks.jindan || 0 },
    { k: 'yuanying', n: '元婴丹', v: stacks.yuanying || 0 }, { k: 'huashen', n: '化神丹', v: stacks.huashen || 0 }
  ];
  const fixed = new Set(list.map(entry => entry.k));
  for (const item in stacks) {
    if (!fixed.has(item) && stacks[item] > 0) {
      list.push({ k: item, n: ITEM_NAMES[item] || item, v: stacks[item] });
    }
  }
  return list;
}

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
function getActionCardInfo(key) {
  const a = ACTIONS[key]; if (!a) return null;
  const p = getPlayer();
  const sk = p.skills[a.skill] || { lv: 1, xp: 0 };
  const lv = sk.lv;
  const locked = a.needLv && lv < a.needLv;
  const active = !!state.current && state.current.key === key;
  let progress = 0;
  if (active && state.current) progress = Math.min(1, state.current.elapsed / (a.time || 1));
  return { key, name: a.name, icon: a.icon || '·', skill: a.skill, lv, needLv: a.needLv || 0, time: a.time, xp: a.xp, out: a.out || '', locked, active, stalled: active && !!state.current.stalled, progress };
}

function getSkillPageInfo(navName) {
  const sp = SKILL_PAGES[navName]; if (!sp || sp.type !== 'skill') return null;
  const p = getPlayer();
  const s = p.skills[sp.skill] || { lv: 1, xp: 0 };
  const need = skillXpNeed(s.lv);
  return { title: sp.title, skill: sp.skill, desc: sp.desc, lv: s.lv, xp: s.xp, xpNeed: need, actions: sp.actions.map(getActionCardInfo) };
}

// 采集系条目卡（探索卡 / 资源点卡）信息
function gatherEntryCard(skill, e, p) {
  const active = !!state.current && state.current.key === 'gather:' + skill + ':' + e.id;
  let progress = 0;
  if (active && state.current) {
    const eff = effGatherTime(skill, e.id, p);   // 进度条用有效耗时（精通减时）
    progress = Math.min(1, state.current.elapsed / eff);
  }
  let left = 0, cap = 0;
  if (skill === 'fishing') {
    const stocks = state.systems.gathering.fishStocks;
    left = Object.prototype.hasOwnProperty.call(stocks, e.id)
      ? stocks[e.id]
      : FISH_MAX;
    cap = FISH_MAX;                    // 库存上限
  } else {
    const spot = state.systems.gathering.spots[skill];
    left = (spot && spot.id === e.id) ? spot.left : 0;
    cap = (spot && spot.id === e.id) ? spot.cap : 0;
  }
  const drops = (e.drops || []).map(d => ({ item: d.item, q: d.q || 1 }));
  return { type: 'entry', id: e.id, name: e.name, unlockLv: e.unlockLv, time: e.time, xp: e.xp, drops, left, cap, active, progress, stalled: active && !!state.current.stalled };
}

function getGatherPageInfo(navName) {
  const sp = SKILL_PAGES[navName]; if (!sp || sp.type !== 'gather') return null;
  const skill = sp.skill;
  const p = getPlayer();
  const s = p.skills[GATHER_SKILL_KEY[skill]] || { lv: 1, xp: 0 };
  const need = skillXpNeed(s.lv);
  const data = GATHERING_DATA[skill];
  const cards = [];
  if (data.explore) cards.push({ type: 'explore', id: 'explore', name: data.explore.name, active: !!state.current && state.current.key === 'gather:explore:' + skill, progress: 0 });
  if (skill === 'fishing') {
    for (const e of data.entries) cards.push(gatherEntryCard(skill, e, p));
  } else {
    const spot = state.systems.gathering.spots[skill];
    if (spot) { const e = data.entries.find(x => x.id === spot.id); if (e) cards.push(gatherEntryCard(skill, e, p)); }
  }
  return { title: sp.title, skill, desc: sp.desc, lv: s.lv, xp: s.xp, xpNeed: need, cards, noSpotHint: (skill !== 'fishing' && !state.systems.gathering.spots[skill]) };
}

function readonlyQuery(viewModel) {
  // UI 查询热路径：各 query* 应返回当帧临时 view。
  // 不再 deepFreeze(cloneJson(...))——那会在每帧/切页时拖垮主线程。
  // 需要真正隔离快照时用 StateModel.readonly。
  return viewModel;
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
  if (useStage4Runtime && key.indexOf('social:') === 0) {
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
  if (useStage3Runtime && key.indexOf('combat:') === 0) {
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
  if (useStage2Runtime && key.indexOf('produce:') === 0) {
    const recipe = stage2Bootstrap.RecipeContent.get(key.slice(8));
    return recipe ? recipe.name : '制作';
  }
  if (useStage2Runtime && key.indexOf('fish:') === 0) {
    const spot =
      stage2Bootstrap.GatheringContent.getFishingSpot(key.slice(5));
    return spot ? spot.name : '钓鱼';
  }
  if (useStage2Runtime && key.indexOf('beast:') === 0) {
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
    if (useStage2Runtime && stage2Parts[1] === 'collect') {
      const stage2Entry =
        stage2Bootstrap.GatheringContent.getEntry(
          stage2Parts[2],
          stage2Parts.slice(3).join(':')
        );
      return stage2Entry ? stage2Entry.name : '采集';
    }
    if (useStage2Runtime && stage2Parts[1] === 'explore') {
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
