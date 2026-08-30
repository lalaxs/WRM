// ============================================================
// ui-core.js — XiuxianUi page module (classic script, no bundler)
// ============================================================
(function () {
  var Ui = window.XiuxianUi = window.XiuxianUi || {};
  if (!Ui.__pages) Ui.__pages = Object.create(null);
  Ui.registerPage = function registerPage(key, spec) {
    if (!key || !spec) return;
    Ui.__pages[key] = spec;
  };
  Ui.getPage = function getPage(key) {
    return Ui.__pages[key] || null;
  };
  Ui.CATS = ['body', 'cloth', 'nose', 'mouth', 'eyes', 'eyebrush', 'hair'];
  Ui.CAT_LABEL = {
    body: '身体', cloth: '衣服', nose: '鼻子', mouth: '嘴',
    eyes: '眼睛', eyebrush: '眉眼', hair: '头发'
  };
  Ui.root = null;
  Ui.shell = { built: false };
  Ui.navState = { lastIndex: -1 };
  Ui.contentState = { key: null, refs: {}, pages: Object.create(null) };
  Ui.contentLiveAt = Object.create(null);
  Ui.shellHud = {
    topSignature: '',
    actionSignature: '',
    actionAt: 0,
    modalSignature: '',
    legacyPending: false
  };
  Ui.inventoryUiState = { category: 'all', sortMode: 'category' };
  Ui.cropSelections = {};
  Ui.farmUiState = { selectedPlotId: null, quickCropId: '' };
  Ui.combatUiState = {
    tab: 'regions',
    selectedRegionId: null,
    selectedEnemyId: null,
    selectedDungeonId: null
  };
  Ui.loadoutUiState = {
    selectedId: null,
    // food | pill | talisman
    subTab: 'food',
    // equipment | supply — 下方内容区：装备列表 or 补给配置
    bodyMode: 'supply',
    selectedEquipmentSlot: null,
    selectedSupplySlot: 'food',
    selectedSupplySlotIndexes: { food: 0, pill: 0, talisman: 0 },
    selectedTechniqueKind: 'active',
    selectedTechniqueIndex: 0,
    techniqueLibraryOpen: false,
    selectedLibraryTechniqueId: null
  };
  Ui.eventUiState = { section: 'world' };
  Ui.relationshipUiState = {
    search: '',
    sort: 'recent',
    selectedId: null,
    modalTab: 'info',
    selectedInteractionId: null
  };
  Ui.inheritanceUiState = { section: 'overview' };
  Ui.worldUiState = { view: 'list', regionId: null };
  Ui.modalRoot = null;
  Ui.modals = {
    break: { built: false },
    offline: { built: false },
    settlingOffline: { built: false },
    lunhui: { built: false },
    legacy: { built: false },
    lifespanBuffer: { built: false },
    itemDetail: { built: false },
    expand: { built: false },
    farmPlot: { built: false },
    regionDetail: { built: false },
    enemyDetail: { built: false },
    dungeonDetail: { built: false },
    skillAction: { built: false, payload: null },
    skillMasteryUnlocks: { built: false, skillId: null, title: '' },
    personDetail: { built: false, npcId: null, tab: 'info', signature: null },
    socialDetail: {
      built: false,
      npcId: null,
      interactionId: null,
      signature: null
    },
    travelConfirm: { built: false, regionId: null },
    sectLeave: { built: false },
    sectJoin: { built: false, sectId: null },
    sectOffices: { built: false, sectId: null },
    sectMission: { built: false, missionId: null },
    sectPavilion: { built: false },
    sectPavilionDetail: { built: false, techniqueId: null }
  };
  Ui.itemTip = { built: false, root: null, refs: null, open: false };
  Ui.relationTip = { built: false, root: null, list: null, open: false };
  Ui.equipmentTip = {
    built: false,
    root: null,
    refs: null,
    open: false
  };
  Ui.skillActionEffectsTip = {
    built: false,
    root: null,
    refs: null,
    open: false
  };
  Ui.toastStack = null;
  Ui.lastToastText = '';
  Ui.lastToastAt = 0;
  Ui.TOAST_DEDUPE_MS = 400;
  Ui.gainTipStack = null;
  Ui.GAIN_TIP_MAX = 5;
  Ui.GAIN_TIP_LIFE_MS = 2000;
  Ui.GAIN_TIP_MERGE_MS = 800;
  Ui.GAIN_TIP_STAGGER_MS = 100;
  Ui.GAIN_TIP_OUT_MS = 350;
  Ui.gainTipEntries = Object.create(null);
  Ui.gainTipStaggerSlot = 0;
  Ui.persistenceUi = null;
  Ui.created = false;
  Ui.card = null;
  Ui.titleEl = null;
  Ui.confirmBtn = null;
  Ui.previewCanvas = null;
  Ui.previewCtx = null;
  Ui.selIndexEls = {};
  Ui.isCreateMode = true;
  Ui.creatorProgressControls = [];
  Ui.GATHER_NAV = ['采药', '采矿', '伐木', '钓鱼'];
  Ui.PRODUCTION_NAV = ['炼丹', '炼器', '烹饪', '符箓'];
  Ui.CAVE_TABS = [
    ['farm', '灵田'],
    ['formations', '阵法'],
    ['beasts', '灵兽'],
    ['meetingHall', '会客厅'],
    ['inheritance', '传承殿']
  ];
  Ui.CATEGORY_LABELS = {
    all: '全部',
    material: '材料',
    equipment: '装备',
    consumable: '消耗品',
    technique: '功法',
    quest: '任务物品'
  };
  Ui.QUALITY_LABELS = {
    white: '普通',
    green: '精良',
    blue: '稀有',
    purple: '史诗',
    orange: '传说',
    red: '神话',
    common: '普通',
    fine: '精良',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说',
    mythic: '神话'
  };
  Ui.QUALITY_TIER = {
    white: 1,
    green: 2,
    blue: 3,
    purple: 4,
    orange: 5,
    red: 6,
    common: 1,
    fine: 2,
    rare: 3,
    epic: 4,
    legendary: 5,
    mythic: 6
  };
  Ui.RESOURCE_QUALITY_LABELS = {};
  Ui.RESOURCE_QUALITY_BADGE = {};
  Ui.SKILL_TILE_GLYPHS = {
    herb: '药',
    mining: '矿',
    woodcutting: '木',
    fishing: '鱼',
    alchemy: '丹',
    forging: '器',
    cooking: '食',
    talisman: '符',
    charm: '魅'
  };
  Ui.INV_CATEGORY_ORDER = {
    material: 0, equipment: 1, consumable: 2, technique: 3, quest: 4
  };
  Ui.COMBAT_TABS = [
    ['regions', '区域'],
    ['dungeons', '秘境']
  ];
  Ui.EQUIPMENT_LABELS = {
    weapon: '武器',
    head: '头冠',
    robe: '法袍',
    bracer: '护腕',
    belt: '腰带',
    boots: '靴履',
    accessory: '饰品',
    artifact: '法宝',
    armor: '护甲'
  };
  Ui.EQUIPMENT_SLOTS = [
    'weapon',
    'head',
    'robe',
    'bracer',
    'belt',
    'boots',
    'accessory',
    'artifact'
  ];
  Ui.TECHNIQUE_TAG_TONES = {
    sword: 'sword',
    fist: 'fist',
    spirit: 'spirit',
    healing: 'heal',
    qi: 'qi',
    thunder: 'thunder',
    talisman: 'talisman',
    beast: 'beast',
    array: 'array',
    body: 'body',
    movement: 'move',
    pill: 'heal',
    active: 'active',
    passive: 'passive'
  };
  Ui.COMBAT_STAT_LABELS = {
    maxHp: '最大气血',
    maxQi: '最大真气',
    attack: '攻击',
    defense: '防御',
    accuracy: '命中',
    evasion: '闪避',
    critChance: '暴击率',
    critDamage: '暴击伤害',
    actionIntervalTicks: '行动间隔缩减',
    cooldownReduction: '冷却减缩',
    damageReduction: '伤害减免',
    healingPower: '治疗强度',
    healingTaken: '受治疗',
    shieldPower: '护盾强度',
    qiRegen: '真气恢复',
    controlAccuracy: '控制命中',
    controlResistance: '控制抗性',
    ailmentPower: '异常强度',
    ailmentResistance: '异常抗性',
    cleansePower: '净化强度',
    threatGain: '仇恨获取',
    protectionWeight: '保护权重'
  };
  Ui.SUPPLY_LABELS = {
    food: '食物',
    pill: '丹药',
    talisman: '符箓'
  };
  Ui.CONDITION_TYPES = [
    ['always', '始终'],
    ['selfHpBelow', '自身气血低于'],
    ['selfQiBelow', '自身真气低于'],
    ['enemyHpBelow', '敌方气血低于'],
    ['selfQiAbove', '自身真气高于'],
    ['enemyHasStatus', '敌方具有状态'],
    ['enemyMissingStatus', '敌方缺少状态'],
    ['selfMissingBuff', '自身缺少增益'],
    ['selfMissingShield', '自身缺少护盾']
  ];
  Ui.PRODUCTION_NAV_SKILLS = [
    'alchemy', 'forging', 'cooking', 'talisman'
  ];
  Ui.FISHING_JUNK_IMMUNITY_MASTERY = 65;
  Ui.INHERITANCE_SECTIONS = [
    ['overview', '概览'],
    ['plan', '传承方案'],
    ['descendants', '后代'],
    ['lives', '历代']
  ];
  Ui.LIFE_STAGE_LABELS = {
    child: '幼年',
    adult: '成年',
    elder: '晚年'
  };
  Ui.RELATION_LABELS = {
    affection: '好感',
    trust: '信任',
    romanticAttachment: '心动',
    closeness: '亲近',
    dependence: '依赖',
    loyalty: '忠诚',
    jealousy: '吃醋',
    desire: '渴望'
  };
  Ui.RELATION_HEART_CLASS = {
    affection: 'heart-affection',
    trust: 'heart-trust',
    romanticAttachment: 'heart-romantic',
    closeness: 'heart-closeness',
    dependence: 'heart-dependence',
    loyalty: 'heart-loyalty',
    jealousy: 'heart-jealousy',
    desire: 'heart-desire'
  };
  Ui.RELATION_TAG_CLASS = {
    affection: 'rel-affection',
    trust: 'rel-trust',
    romanticAttachment: 'rel-romantic',
    closeness: 'rel-closeness',
    dependence: 'rel-dependence',
    loyalty: 'rel-loyalty',
    jealousy: 'rel-jealousy',
    desire: 'rel-desire'
  };
  Ui.personTextTip = { built: false, open: false };
  Ui.RELATION_TIER_TEXTS = {
    affection: [
      [0, '形同陌路'],
      [19, '略有印象'],
      [39, '点头之交'],
      [59, '渐生好感'],
      [79, '心生亲近'],
      [99, '情意渐深'],
      [100, '倾心相许']
    ],
    trust: [
      [0, '全然生疏'],
      [19, '半信半疑'],
      [39, '稍可托付'],
      [59, '彼此信任'],
      [79, '深信不疑'],
      [99, '生死相托'],
      [100, '肝胆相照']
    ],
    romanticAttachment: [
      [0, '无意于情'],
      [19, '微有留意'],
      [39, '心绪微动'],
      [59, '暗生情愫'],
      [79, '情思缠绵'],
      [99, '念念不忘'],
      [100, '情根深种']
    ],
    closeness: [
      [0, '素未谋面'],
      [19, '略有印象'],
      [39, '点头之交'],
      [59, '渐生亲近'],
      [79, '时常想念'],
      [99, '情意渐深'],
      [100, '如胶似漆']
    ],
    dependence: [
      [0, '独立自持'],
      [19, '略有依靠'],
      [39, '时常求助'],
      [59, '颇为依赖'],
      [79, '离不开你'],
      [99, '寄望甚深'],
      [100, '唯你是依']
    ],
    loyalty: [
      [0, '并无羁绊'],
      [19, '偶有照应'],
      [39, '愿为援手'],
      [59, '守望相助'],
      [79, '忠心不二'],
      [99, '誓不相负'],
      [100, '至死不渝']
    ],
    jealousy: [
      [0, '心如止水'],
      [19, '偶有介怀'],
      [39, '略生醋意'],
      [59, '颇为吃味'],
      [79, '妒意难掩'],
      [99, '醋海翻波'],
      [100, '独占之心']
    ],
    desire: [
      [0, '清心寡欲'],
      [19, '偶有念头'],
      [39, '隐隐渴求'],
      [59, '心向往之'],
      [79, '情难自禁'],
      [99, '意难平抑'],
      [100, '炽烈难抑']
    ]
  };
  Ui.BOND_LABELS = {
    stranger: '陌生',
    acquaintance: '相识',
    friend: '好友',
    lover: '恋人',
    partner: '正式伴侣',
    separated: '已分开'
  };
  Ui.BOND_TIP_TEXTS = {
    stranger: '尚未真正结识，彼此不过点头之交。',
    acquaintance: '已有一面之缘，可以正常往来。',
    friend: '彼此认可，愿互为援手。',
    lover: '心意相通，情愫已定。',
    partner: '已结为正式伴侣，同修同渡。',
    separated: '缘分暂歇，彼此已分开。'
  };
  Ui.PRESENCE_VIGNETTES = {
    chicheng: [
      '你看见{pronoun}正爽朗地和旁人闲聊，神色坦荡。',
      '你望过去，{pronoun}正整理行囊，动作利落。'
    ],
    qingleng: [
      '你看见{pronoun}独自静坐一旁，神色淡然。',
      '你远远望去，{pronoun}正低头打坐，旁若无人。'
    ],
    rechen: [
      '你看见{pronoun}正热心地帮人传话跑腿。',
      '你望过去，{pronoun}正笑着招呼路过的熟人。'
    ],
    shuaituo: [
      '你看见{pronoun}倚在栏边观景，神情自在。',
      '你望过去，{pronoun}正随手拨弄一把木剑，像在闲逛。'
    ],
    zhizhuo: [
      '你看见{pronoun}正反复演练同一招式，毫不懈怠。',
      '你望过去，{pronoun}正凝神翻阅一册功法。'
    ],
    renhou: [
      '你看见{pronoun}正温和地安抚一名后辈。',
      '你望过去，{pronoun}正静静听人诉说，偶一点头。'
    ],
    jiaojin: [
      '你看见{pronoun}仪态端正地立于一处，目光扫过四周。',
      '你望过去，{pronoun}正挑剔地打量一件器物。'
    ],
    wenya: [
      '你看见{pronoun}正温声与人交谈，举止从容。',
      '你望过去，{pronoun}正轻声翻书，神色安然。'
    ],
    _default: [
      '你看见{pronoun}正在附近停留，神态如常。',
      '你望过去，{pronoun}正做着自己的事。'
    ]
  };
  Ui.BATTLE_STATUS_LABELS = { shock: '震慑', slow: '迟缓', haste: '疾速' };
  Ui.BATTLE_TICK_SECONDS = 0.25;
  Ui.BATTLE_LOG_LIMIT = 40;
  Ui.WORLD_REGION_TYPE_LABELS = {
    town: '城镇',
    market: '坊市',
    sectBase: '宗域',
    wilderness: '野外',
    specialRealm: '秘境'
  };
    'use strict';


  // ── 角色创建页用的部件类别 ──

  function api() { return window.GameAPI; }
  function el(tag, cls, parent, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmtDur(sec) {
    sec = Math.floor(sec || 0);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (h > 0) return h + ' 小时 ' + m + ' 分';
    return m + ' 分 ' + (sec % 60) + ' 秒';
  }

  // ── 模块状态 ──

  // 角色创建页

  // 采集点资源品质已移除；保留常量以免旧 UI 分支报错

  // ============================================================
  // 外壳（顶栏 + 左导航 + 内容区）+ 弹窗容器 + toast
  // ============================================================
  function buildShell() {
    if (Ui.shell.built) return;
    const a = api(); if (!a) return;
    Ui.root = document.getElementById('ui');

    const sh = el('div', 'shell', Ui.root); Ui.shell.root = sh; sh.style.display = 'none';

    // ── 顶栏 ──
    const tb = el('div', 'topbar', sh);
    const av = el('canvas', 'avatar', tb); Ui.shell.avatar = av; Ui.shell.avatarCtx = av.getContext('2d');
    const main = el('div', 'topbar-main', tb);

    const row1 = el('div', 'topbar-row1', main);
    const nameEl = el('div', 'topbar-name', row1, '');
    const pills = el('div', 'pills', row1);
    const resourceDefs = [
      ['lingshi', '灵石'],
      ['jingqi', '精气'],
      ['mood', '心情'],
      ['shengwang', '声望'],
      ['shouyuan', '寿元']
    ];
    const pillRefs = {};
    for (const [key, label] of resourceDefs) {
      const pill = el('div', 'pill resource-pill', pills);
      const icon = el('img', 'resource-icon', pill);
      icon.src = 'assets/resource-icons/50/' + key + '.png';
      icon.alt = '';
      const value = el('span', 'pill-val', pill, '0');
      pillRefs[key] = value;
      pill.title = label;
    }
    const row2 = el('div', 'topbar-row2', main);
    const calendarEl = el('div', 'topbar-calendar', row2, '');
    calendarEl.title = '灵枢历';
    const realmEl = el('div', 'realm-label', row2, '');
    const breakGroup = el('div', 'topbar-break-group', row2);
    const expBar = el('div', 'exp-bar', breakGroup);
    const expFill = el('div', 'exp-fill', expBar);
    const expText = el('div', 'exp-text', expBar, '');
    const breakBtn = el('button', 'btn-break', breakGroup, '突破');
    breakBtn.addEventListener('click', () => a.commands.openBreak());

    Ui.shell.topbar = {
      nameEl,
      calendarEl,
      pills: pillRefs,
      realmEl,
      expFill,
      expText,
      breakBtn
    };

    // ── 行动状态拓展栏（顶部资源栏下方，全局显示当前行动）──
    const actionBarRoot = el('div', 'action-bar', sh);
    const actionBarName = el('div', 'action-bar-name', actionBarRoot, '空闲');
    const actionBarTrack = el('div', 'action-bar-track', actionBarRoot);
    const actionBarFill = el('div', 'action-bar-fill', actionBarTrack);
    Ui.shell.actionBar = { root: actionBarRoot, nameEl: actionBarName, fillEl: actionBarFill };

    // ── 身体：导航 + 内容 ──
    const body = el('div', 'body', sh);
    const nav = el('div', 'nav', body); Ui.shell.nav = { listEl: nav, items: [] };
    const navList = a.queries.navigation().items;
    for (let i = 0; i < navList.length; i++) {
      const it = el('div', 'nav-item', nav, navList[i].label);
      // 走 invokeCommand：立刻 renderGame，避免等下一帧 rAF 才切页。
      it.addEventListener('click', function () {
        Ui.invokeCommand('switchNav', { index: i });
      });
      Ui.shell.nav.items.push(it);
    }
    const content = el('div', 'content', body); Ui.shell.content = content;

    // ── 弹窗容器 + toast ──
    Ui.modalRoot = el('div', 'modal-root', Ui.root);
    Ui.modalRoot.style.pointerEvents = 'none';
    for (const name of [
      'break', 'offline', 'settlingOffline', 'lunhui', 'legacy', 'lifespanBuffer',
      'itemDetail',
      'expand', 'farmPlot', 'regionDetail', 'enemyDetail', 'dungeonDetail',
      'skillAction', 'skillMasteryUnlocks', 'personDetail', 'socialDetail',
      'travelConfirm', 'sectLeave', 'sectJoin', 'sectOffices', 'sectMission',
      'sectPavilion', 'sectPavilionDetail'
    ]) {
      Ui.modals[name].root = el('div', 'modal-mask', Ui.modalRoot);
      if (name === 'farmPlot') {
        Ui.modals[name].root.className = 'modal-mask farm-plot-mask';
      }
      if (name === 'enemyDetail') {
        Ui.modals[name].root.className = 'modal-mask enemy-detail-mask';
      }
      if (name === 'skillAction') {
        Ui.modals[name].root.className = 'modal-mask skill-action-mask';
      }
      if (name === 'skillMasteryUnlocks') {
        Ui.modals[name].root.className = 'modal-mask skill-mastery-mask';
      }
      if (name === 'socialDetail') {
        Ui.modals[name].root.className = 'modal-mask social-detail-mask';
      }
      Ui.modals[name].root.style.display = 'none';
    }
    Ui.toastStack = el('div', 'toast-stack', Ui.root);
    Ui.toastStack.style.pointerEvents = 'none';
    Ui.gainTipStack = el('div', 'gain-tip-stack', Ui.root);
    Ui.gainTipStack.style.pointerEvents = 'none';

    const persistenceRoot = el('div', 'persistence-error', Ui.root);
    persistenceRoot.style.display = 'none';
    const persistenceMessage = el('div', 'persistence-message', persistenceRoot, '保存失败，请重试');
    const persistenceRetry = el('button', 'persistence-retry', persistenceRoot, '重试');
    persistenceRetry.addEventListener('click', () => {
      a.commands.retryPersistence();
      Ui.renderGame();
    });
    Ui.persistenceUi = {
      root: persistenceRoot,
      message: persistenceMessage,
      retry: persistenceRetry
    };

    Ui.shell.built = true;
  }

  function showShell() { if (Ui.shell.root) Ui.shell.root.style.display = 'flex'; }
  function hideShell() { if (Ui.shell.root) Ui.shell.root.style.display = 'none'; }

  function refreshAvatar() {
    const a = api(); if (!a || !Ui.shell.avatar) return;
    const now = Date.now();
    // 立绘很少变；每帧重绘会额外占用主线程。
    if (Ui.shell._avatarAt && (now - Ui.shell._avatarAt) < 1000 &&
        !Ui.shell._avatarDirty) {
      return;
    }
    Ui.shell._avatarAt = now;
    Ui.shell._avatarDirty = false;
    a.render.drawCharacter(Ui.shell.avatar);
  }

  function updatePersistenceStatus() {
    const a = api();
    if (!a || !Ui.persistenceUi) return;
    const status = a.queries.persistence();
    const locked = !!status.locked;
    // 离线结算中走专用弹窗，不复用「存档失败」红条。
    const bannerLocked = locked && status.kind !== 'settle';
    const message = status.message || '保存失败，请重试';
    if (Ui.persistenceUi._locked === bannerLocked &&
        Ui.persistenceUi._message === message &&
        Ui.persistenceUi._controlsLocked === locked &&
        Ui.persistenceUi._wired === true) {
      return;
    }
    Ui.persistenceUi._locked = bannerLocked;
    Ui.persistenceUi._message = message;
    Ui.persistenceUi._controlsLocked = locked;
    Ui.persistenceUi._wired = true;
    Ui.persistenceUi.root.style.display = bannerLocked ? 'flex' : 'none';
    Ui.persistenceUi.message.textContent = message;
    Ui.persistenceUi.retry.disabled = !status.canRetry;
    Ui.persistenceUi.retry.style.display = status.canRetry ? '' : 'none';
    if (Ui.shell.topbar && Ui.shell.topbar.breakBtn) {
      Ui.shell.topbar.breakBtn.disabled = locked;
    }
    if (Ui.confirmBtn) Ui.confirmBtn.disabled = locked;
    for (const control of Ui.creatorProgressControls) {
      control.disabled = locked;
    }
    if (Ui.modals.break.built && Ui.modals.break.refs.btn) {
      const breakDisabled = locked || !Ui.modals.break.breakReady;
      Ui.modals.break.refs.btn.disabled = breakDisabled;
      Ui.modals.break.refs.btn.classList.toggle('disabled', breakDisabled);
    }
    if (Ui.modals.offline.built && Ui.modals.offline.refs.btn) {
      Ui.modals.offline.refs.btn.disabled = locked;
    }
    if (Ui.modals.lunhui.built && Ui.modals.lunhui.refs &&
        Ui.modals.lunhui.refs.btn) {
      Ui.modals.lunhui.refs.btn.disabled = locked;
    }
    if (Ui.shell.content && Ui.shell.content.querySelectorAll) {
      const controls = Ui.shell.content.querySelectorAll('.action-card');
      for (let i = 0; i < controls.length; i++) {
        controls[i].classList.toggle('disabled', locked);
      }
    }
  }

  function updateTopbar() {
    const a = api(); const info = a.queries.top(); const t = Ui.shell.topbar;
    const shouyuanText = info.shouyuan == null
      ? '∞'
      : String(Math.max(0, Math.floor(info.shouyuan)));
    const mood = Math.floor(info.pills.mood || 0);
    const signature = [
      info.name,
      info.calendarLabel || '',
      info.pills.lingshi,
      info.pills.jingqi,
      mood,
      info.pills.shengwang,
      shouyuanText,
      info.realm,
      info.xiwei,
      info.need || 0,
      info.canBreak ? 1 : 0
    ].join('|');
    if (signature === Ui.shellHud.topSignature) return;
    Ui.shellHud.topSignature = signature;
    t.nameEl.textContent = info.name;
    if (t.calendarEl) {
      t.calendarEl.textContent = info.calendarLabel || '';
      t.calendarEl.style.display = info.calendarLabel ? '' : 'none';
    }
    t.pills.lingshi.textContent = String(info.pills.lingshi);
    t.pills.jingqi.textContent = String(info.pills.jingqi);
    t.pills.mood.textContent = String(mood);
    t.pills.shengwang.textContent = String(info.pills.shengwang);
    t.pills.shouyuan.textContent = shouyuanText;
    t.realmEl.textContent = info.realm;
    const ratio = Math.min(1, info.xiwei / (info.need || 1));
    t.expFill.style.width = (ratio * 100) + '%';
    t.expText.textContent = info.xiwei + '/' + (info.need || 0);
    t.breakBtn.classList.toggle('disabled', !info.canBreak);
  }

  function updateActionBar() {
    const a = api(); if (!a || !Ui.shell.actionBar) return;
    const info = a.queries.home();
    const bar = Ui.shell.actionBar;
    const name = info.current ? info.current.name : '空闲';
    // 进度按整数百分比签名，避免每帧写 DOM。
    const pct = info.current
      ? Math.floor(Math.max(0, Math.min(1, info.current.progress || 0)) * 100)
      : 0;
    const combat = !!(info.current && info.current.combat);
    const signature = name + '|' + pct + '|' + (combat ? 1 : 0) +
      '|' + (info.current ? 1 : 0);
    if (signature === Ui.shellHud.actionSignature) return;
    Ui.shellHud.actionSignature = signature;
    if (info.current) {
      bar.nameEl.textContent = name;
      bar.fillEl.style.width = pct + '%';
      bar.root.classList.add('active');
      bar.root.classList.toggle('combat', combat);
    } else {
      bar.nameEl.textContent = '空闲';
      bar.fillEl.style.width = '0%';
      bar.root.classList.remove('active');
      bar.root.classList.remove('combat');
    }
  }

  function updateNavActive() {
    const a = api(); const idx = a.queries.navigation().activeIndex;
    if (idx === Ui.navState.lastIndex) return;
    Ui.navState.lastIndex = idx;
    for (let i = 0; i < Ui.shell.nav.items.length; i++) {
      Ui.shell.nav.items[i].classList.toggle('active', i === idx);
    }
    // 切页由 updateContent 切换已缓存 DOM，不再强制整页重建。
  }

  // ── 内容区：按页签构建一次，之后只更新查询返回的实时字段 ──
  function percent(value) {
    return Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);
  }

  function percentText(value) {
    return Math.round((Number(value) || 0) * 100) + '%';
  }

  function invokeCommand(name, input) {
    const a = api();
    let result = null;
    try {
      if (!a || !a.commands || typeof a.commands[name] !== 'function') {
        Ui.showToast('当前操作暂不可用');
        return null;
      }
      result = input === undefined
        ? a.commands[name]()
        : a.commands[name](input);
      // 成功且已变更的命令在 game.js 里已 toast(result.message)；
      // 这里再弹一次会重复。仅补弹失败 / 无变更等未自行 toast 的 message。
      if (result && result.message &&
          !(result.ok && result.changed)) {
        Ui.showToast(result.message);
      }
      if (typeof name === 'string' &&
          (name.indexOf('Sect') >= 0 || name.indexOf('sect') >= 0 ||
            name === 'chooseSect')) {
        if (Ui.contentState && Ui.contentState.refs) {
          Ui.contentState.refs.sectForceRefresh = true;
          Ui.contentState.refs.sectSignature = '';
        }
      }
    } catch (error) {
      Ui.showToast('操作未完成，请稍后重试');
    }
    Ui.renderGame();
    return result;
  }

  function safeQuery(name, input, fallback) {
    const a = api();
    try {
      if (!a || !a.queries || typeof a.queries[name] !== 'function') {
        return fallback;
      }
      const value = input === undefined
        ? a.queries[name]()
        : a.queries[name](input);
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function buildSkillHead(c, info, pageClass) {
    c.classList.add(pageClass, 'skill-page');
    const refs = Ui.contentState.refs;
    const head = el('div', 'skill-head', c);
    const row = el('div', 'skill-head-row', head);
    refs.skillIcon = el('div', 'skill-head-icon', row);
    const main = el('div', 'skill-head-main', row);
    const titleRow = el('div', 'skill-head-title-row', main);
    refs.skillTitle = el('div', 'skill-head-title', titleRow);
    refs.skillLevel = el('div', 'skill-head-lv', titleRow);
    refs.skillMasteryBtn = el(
      'button',
      'skill-head-mastery-btn',
      titleRow,
      '精通'
    );
    refs.skillMasteryBtn.type = 'button';
    refs.skillMasteryBtn.title = '查看精通等级解锁';
    refs.skillMasteryBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      Ui.openSkillMasteryUnlocksModal(
        Ui.contentState.refs.skillId || info.skillId || '',
        Ui.contentState.refs.skillTitle
          ? Ui.contentState.refs.skillTitle.textContent
          : (info.title || '')
      );
    });
    const xpBar = el('div', 'xp-bar skill-xp-bar', main);
    refs.skillXpFill = el('div', 'xp-fill', xpBar);
    refs.skillXpText = el('div', 'xp-text', xpBar);
    refs.skillDesc = el('div', 'desc', head);
    refs.skillBonus = el('div', 'bonus-line skill-bonus is-hidden', head, '');
    Ui.updateSkillHead(info);
  }

  function updateSkillHead(info) {
    const refs = Ui.contentState.refs;
    if (!refs.skillTitle) return;
    const level = info.level == null ? info.lv : info.level;
    const nextXp = info.nextXp == null ? info.xpNeed : info.nextXp;
    const skillId = info.skillId || '';
    const ratio = nextXp ? info.xp / nextXp : 0;
    refs.skillTitle.textContent = info.title || '';
    if (refs.skillLevel) refs.skillLevel.textContent = 'Lv.' + level;
    refs.skillXpFill.style.width = percent(ratio) + '%';
    refs.skillXpText.textContent = Math.floor(ratio * 100) + '%';
    if (refs.skillDesc) {
      refs.skillDesc.textContent = info.description || info.desc || '';
    }
    if (refs.skillIcon) {
      refs.skillIcon.textContent =
        Ui.SKILL_TILE_GLYPHS[skillId] ||
        (info.title ? String(info.title).charAt(0) : '技');
    }
    if (refs.skillMasteryBtn) {
      refs.skillMasteryBtn.hidden = !skillId || skillId === 'charm';
    }
  }


  function skillMasteryUnlockKind(skillId) {
    if (skillId === 'fishing') return 'fishing';
    if (Ui.PRODUCTION_NAV_SKILLS.indexOf(skillId) >= 0) return 'production';
    return 'gather';
  }

  function skillMasteryUnlockRows(skillId) {
    const kind = skillMasteryUnlockKind(skillId);
    const yieldLabel = kind === 'production'
      ? '材料留存几率'
      : (kind === 'fishing' ? '双倍鱼几率' : '双倍产出几率');
    const speedLabel = kind === 'fishing' ? '垂钓耗时' : '行动耗时';
    const junkAt = 65;
    const levels = [10, 20, 30, 40, 50, 60, 70, 80, 90, 99];
    if (kind === 'fishing') levels.splice(6, 0, junkAt);
    return levels.map(function (level) {
      const speed = Math.min(0.18, Math.floor(level / 10) * 0.02);
      const yieldChance = Math.min(0.19, Math.floor(level / 5) * 0.01);
      const parts = [];
      if (speed > 0) {
        parts.push(speedLabel + ' -' + Math.round(speed * 100) + '%');
      }
      if (yieldChance > 0) {
        parts.push(yieldLabel + ' +' + Math.round(yieldChance * 100) + '%');
      }
      if (kind === 'fishing' && level >= junkAt) {
        parts.push('本钓点不再出现杂物');
      }
      return {
        level: level,
        text: parts.length ? parts.join('；') : '—'
      };
    });
  }

  function closeSkillMasteryUnlocksModal() {
    const m = Ui.modals.skillMasteryUnlocks;
    if (!m || !m.root) return;
    m.root.style.display = 'none';
    m.skillId = null;
    m.title = '';
  }

  function buildSkillMasteryUnlocksModal(m) {
    const root = m.root;
    root.innerHTML = '';
    root.addEventListener('click', function (event) {
      if (event.target === root) closeSkillMasteryUnlocksModal();
    });
    const panel = el('div', 'skill-mastery-sheet', root);
    const head = el('div', 'skill-mastery-head', panel);
    const titleWrap = el('div', 'skill-mastery-title-wrap', head);
    el('span', 'skill-mastery-trophy', titleWrap, '🏆');
    const title = el('div', 'skill-mastery-title', titleWrap);
    const close = el('button', 'skill-mastery-close', head, '×');
    close.type = 'button';
    close.addEventListener('click', closeSkillMasteryUnlocksModal);
    const cols = el('div', 'skill-mastery-cols', panel);
    el('div', 'skill-mastery-col', cols, '精通');
    el('div', 'skill-mastery-col', cols, '解锁');
    const list = el('div', 'skill-mastery-list', panel);
    const tip = el('div', 'skill-mastery-tip', panel);
    m.refs = {
      panel: panel,
      title: title,
      list: list,
      tip: tip
    };
  }

  function openSkillMasteryUnlocksModal(skillId, title) {
    const m = Ui.modals.skillMasteryUnlocks;
    if (!m || !m.root) return;
    if (!m.built) {
      buildSkillMasteryUnlocksModal(m);
      m.built = true;
    }
    m.skillId = skillId || '';
    m.title = title || '';
    m.root.style.display = 'flex';
    Ui.updateSkillMasteryUnlocksModal();
  }

  function updateSkillMasteryUnlocksModal() {
    const m = Ui.modals.skillMasteryUnlocks;
    if (!m || !m.built || !m.refs || m.root.style.display === 'none') return;
    const skillId = m.skillId || '';
    const kind = skillMasteryUnlockKind(skillId);
    m.refs.title.textContent = m.title || '精通解锁';
    m.refs.list.innerHTML = '';
    skillMasteryUnlockRows(skillId).forEach(function (row) {
      const line = el('div', 'skill-mastery-row', m.refs.list);
      el('div', 'skill-mastery-level', line, String(row.level));
      el('div', 'skill-mastery-text', line, row.text);
    });
    if (kind === 'fishing') {
      m.refs.tip.textContent =
        '以上效果作用于每个钓点的精通等级；同技能下各钓点通用这套解锁规则。';
    } else if (kind === 'production') {
      m.refs.tip.textContent =
        '以上效果作用于每个配方的精通等级；同技能下各配方通用这套解锁规则。';
    } else {
      m.refs.tip.textContent =
        '以上效果作用于每个采集点的精通等级；同技能下各条目通用这套解锁规则。';
    }
  }

  function addProgress(card, action) {
    const progress = el('div', 'action-progress', card);
    const fill = el('div', 'fill', progress);
    const stalled = el('div', 'action-stalled', progress);
    const timeEl = el('div', 'tile-progress-time', progress);
    const foot = el('div', 'tile-foot-num', progress);
    const refs = {
      cardEl: card,
      fillEl: fill,
      stalledEl: stalled,
      timeEl: timeEl,
      footEl: foot
    };
    Ui.updateProgress(refs, action);
    return refs;
  }

  function updateProgress(refs, action) {
    if (refs.cardEl) refs.cardEl.classList.toggle('active', !!action.active);
    const fillRatio = action.fillRatio != null
      ? action.fillRatio
      : (action.progress || 0);
    refs.fillEl.style.width = percent(fillRatio) + '%';
    if (refs.stalledEl) {
      refs.stalledEl.textContent = action.stalled ? '停滞' : '';
    }
    if (refs.timeEl) {
      refs.timeEl.textContent = action.timeText != null
        ? String(action.timeText)
        : '';
    }
    if (refs.footEl) {
      refs.footEl.textContent = action.footText != null
        ? String(action.footText)
        : '';
    }
  }

  function updateActionControl(holder, action, disabled) {
    const mode = action.active ? 'stop' : 'start';
    const isDisabled = !action.active && !!disabled;
    const startLabel = action.startLabel || '开始';
    const stopLabel = action.stopLabel || '停止';
    holder._action = action;
    if (holder._mode === mode && holder._button) {
      holder._disabled = isDisabled;
      holder._button.disabled = isDisabled;
      holder._button.textContent = action.active ? stopLabel : startLabel;
      return;
    }
    holder._mode = mode;
    holder._disabled = isDisabled;
    holder.innerHTML = '';
    const button = el(
      'button',
      'card-action ' + (action.active ? 'action-stop' : 'action-start'),
      holder,
      action.active ? stopLabel : startLabel
    );
    button.disabled = isDisabled;
    holder._button = button;
    button.addEventListener('click', function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      const current = holder._action;
      if (current.active) {
        invokeCommand('stopAction');
        if (typeof holder._onStop === 'function') holder._onStop();
      } else {
        invokeCommand('startAction', { key: current.actionKey });
        if (typeof holder._onStart === 'function') holder._onStart();
      }
    });
  }

  function setTileIcon(iconEl, itemLike, fallback) {
    if (!iconEl) return;
    if (itemLike && (itemLike.itemId || itemLike.iconSrc50 || itemLike.icon)) {
      Ui.renderItemIcon(iconEl, Ui.resolveItemTipData(itemLike), {
        large: true,
        fallback: fallback || '·'
      });
      return;
    }
    iconEl.innerHTML = '';
    iconEl.classList.remove('has-image-icon');
    iconEl.textContent = fallback || '·';
  }

  function formatSkillSeconds(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    if (Math.abs(n - Math.round(n)) < 0.001) return Math.round(n) + '秒';
    const rounded = Math.round(n * 100) / 100;
    return String(rounded) + '秒';
  }

  function weightedChanceText(weight, totalWeight) {
    if (!(totalWeight > 0) || !(weight > 0)) return '0%';
    return Math.max(1, Math.round((weight / totalWeight) * 100)) + '%';
  }

  function dropsWithChance(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const total = list.reduce(function (sum, row) {
      return sum + (Number(row.weight) || 0);
    }, 0);
    return list.map(function (row) {
      return Object.assign({}, row, {
        chanceText: weightedChanceText(Number(row.weight) || 0, total)
      });
    });
  }

  function createMinimalSkillTile(parent, className) {
    const card = el(
      'div',
      'action-card skill-tile skill-tile-min ' + (className || ''),
      parent
    );
    const badgeEl = el('div', 'tile-badge', card);
    const iconEl = el('div', 'tile-icon', card);
    const titleEl = el('div', 'tile-name', card);
    const progress = addProgress(card, { progress: 0, active: false });
    return {
      cardEl: card,
      badgeEl: badgeEl,
      iconEl: iconEl,
      titleEl: titleEl,
      progress: progress
    };
  }

  function createSkillActionTile(parent, className) {
    const card = el(
      'div',
      'action-card skill-tile skill-action-card ' + (className || ''),
      parent
    );
    const lockLabel = el('div', 'fishing-lock-label', card, '锁定');
    const badgeEl = el('div', 'tile-badge', card);
    const iconEl = el('div', 'tile-icon fishing-spot-icon', card);
    const titleEl = el('div', 'tile-name', card);
    const metaEl = el('div', 'skill-action-tile-meta', card);
    const rewardRow = el('div', 'fishing-reward-icons', card);
    const skillReward = el('div', 'fishing-xp-tile fishing-xp-skill', rewardRow);
    el('span', 'fishing-xp-mark', skillReward, 'XP');
    const skillVal = el('span', 'fishing-xp-badge', skillReward);
    const masteryReward = el(
      'div',
      'fishing-xp-tile fishing-xp-mastery',
      rewardRow
    );
    el('span', 'fishing-xp-mark fishing-xp-trophy', masteryReward, '🏆');
    const masteryVal = el('span', 'fishing-xp-badge', masteryReward);
    const levelPill = el('div', 'fishing-level-pill', card);
    const countBadge = el('div', 'tile-count-badge', card);
    countBadge.hidden = true;
    const progress = addProgress(card, { progress: 0, active: false });
    return {
      cardEl: card,
      lockLabelEl: lockLabel,
      badgeEl: badgeEl,
      iconEl: iconEl,
      titleEl: titleEl,
      metaEl: metaEl,
      rewardRow: rewardRow,
      skillRewardEl: skillReward,
      skillValEl: skillVal,
      masteryRewardEl: masteryReward,
      masteryValEl: masteryVal,
      levelPillEl: levelPill,
      countBadgeEl: countBadge,
      progress: progress
    };
  }

  function createFishingSpotTile(parent, className) {
    return createSkillActionTile(
      parent,
      'fishing-card fishing-spot-card ' + (className || '')
    );
  }


  function fishingExpectedMasteryXp(skillXp) {
    const xp = Number(skillXp);
    if (!Number.isFinite(xp) || xp <= 0) return 0;
    return Math.max(1, Math.round(xp * 0.5));
  }

  function formatBonusPercent(ratio) {
    const n = Number(ratio);
    if (!Number.isFinite(n) || n <= 0) return '0%';
    const pct = Math.round(n * 1000) / 10;
    return (Math.abs(pct - Math.round(pct)) < 0.05
      ? Math.round(pct)
      : pct) + '%';
  }

  function fishingMasterySummary(mastery) {
    const src = mastery && typeof mastery === 'object' ? mastery : {};
    const level = Number(src.level);
    const safeLevel = Number.isFinite(level) && level > 0
      ? Math.floor(level)
      : 1;
    const xp = Number(src.xp);
    const nextXp = Number(src.nextXp);
    const safeXp = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
    const safeNext = Number.isFinite(nextXp) && nextXp > 0
      ? Math.floor(nextXp)
      : 0;
    const speedBonus = Number(src.speedBonus);
    const yieldChance = Number(src.extraYieldChance);
    const safeSpeed = Number.isFinite(speedBonus) && speedBonus > 0
      ? speedBonus
      : 0;
    const safeYield = Number.isFinite(yieldChance) && yieldChance > 0
      ? yieldChance
      : 0;
    const junkImmune = safeLevel >= Ui.FISHING_JUNK_IMMUNITY_MASTERY;
    const bits = [];
    bits.push('耗时 -' + formatBonusPercent(safeSpeed));
    bits.push('双倍 +' + formatBonusPercent(safeYield));
    bits.push(
      junkImmune
        ? '已免疫杂物'
        : 'Lv.' + Ui.FISHING_JUNK_IMMUNITY_MASTERY + ' 免疫杂物'
    );
    return {
      level: safeLevel,
      xp: safeXp,
      nextXp: safeNext,
      ratio: safeNext > 0 ? Math.min(1, safeXp / safeNext) : 1,
      speedBonus: safeSpeed,
      yieldChance: safeYield,
      junkImmune: junkImmune,
      effectText: bits.join(' · ')
    };
  }

  function updateSkillActionTileMeta(ref, text) {
    if (!ref || !ref.metaEl) return;
    const value = text != null ? String(text) : '';
    ref.metaEl.textContent = value;
    ref.metaEl.hidden = !value;
  }

  function updateSkillActionTileCountBadge(ref, count) {
    if (!ref || !ref.countBadgeEl) return;
    if (count == null || count === '') {
      ref.countBadgeEl.hidden = true;
      ref.countBadgeEl.textContent = '';
      return;
    }
    const n = Number(count);
    const show = Number.isFinite(n) && n >= 0;
    ref.countBadgeEl.hidden = !show;
    if (show) ref.countBadgeEl.textContent = String(Math.floor(n));
  }

  function updateSkillActionTileRewards(ref, opts) {
    const options = opts || {};
    const skillXp = Number(options.skillXp) || 0;
    const masteryXp = Number(options.masteryXp) || 0;
    const locked = !!options.locked;
    const unlockLevel = options.unlockLevel != null
      ? options.unlockLevel
      : 1;
    ref.cardEl.classList.toggle('is-locked', locked);
    if (ref.lockLabelEl) ref.lockLabelEl.hidden = !locked;
    if (ref.badgeEl) ref.badgeEl.hidden = locked;
    if (ref.titleEl) ref.titleEl.hidden = locked;
    if (ref.metaEl) ref.metaEl.hidden = locked || !ref.metaEl.textContent;
    if (ref.countBadgeEl && locked) ref.countBadgeEl.hidden = true;
    if (ref.rewardRow) ref.rewardRow.hidden = locked;
    if (ref.levelPillEl) {
      ref.levelPillEl.hidden = !locked;
      ref.levelPillEl.textContent = locked
        ? '等级 ' + unlockLevel
        : '';
    }
    if (locked) return;
    if (ref.skillValEl) ref.skillValEl.textContent = String(skillXp);
    if (ref.masteryValEl) ref.masteryValEl.textContent = String(masteryXp);
    if (ref.masteryRewardEl) {
      ref.masteryRewardEl.style.display = masteryXp > 0 ? '' : 'none';
    }
    if (ref.skillRewardEl) {
      ref.skillRewardEl.title = options.skillTitle ||
        ('技能经验 +' + skillXp);
    }
    if (ref.masteryRewardEl) {
      ref.masteryRewardEl.title = options.masteryTitle ||
        ('精通经验 +' + masteryXp);
    }
  }

  function updateSkillActionTileProgress(ref, opts) {
    const options = opts || {};
    const unlocked = options.unlocked !== false;
    const active = !!options.active;
    const progress = Number(options.progress) || 0;
    updateProgress(ref.progress, {
      active: active,
      stalled: options.stalled,
      fillRatio: active ? progress : 0,
      timeText: unlocked
        ? formatSkillSeconds(options.durationSeconds)
        : '',
      footText: active ? Math.round(progress * 100) + '%' : ''
    });
  }

  function updateFishingRewardIcons(ref, spot) {
    const skillXp = Number(spot.skillXp) || 0;
    const masteryXp = fishingExpectedMasteryXp(skillXp);
    updateSkillActionTileRewards(ref, {
      skillXp: skillXp,
      masteryXp: masteryXp,
      locked: !spot.unlocked,
      unlockLevel: spot.unlockLevel,
      skillTitle: '钓鱼经验 +' + skillXp,
      masteryTitle: '钓点精通经验 +' + masteryXp
    });
  }

  function wireSkillTileOpen(card, openFn) {
    if (card._tileWired) return;
    card._tileWired = true;
    card.addEventListener('click', function () {
      openFn();
    });
  }

  function skillActionStartLabel(kind) {
    if (kind === 'explore') return '开始探索';
    if (kind === 'recipe') return '开始制作';
    if (kind === 'fishing') return '开始垂钓';
    return '开始采集';
  }

  function skillActionStopLabel(kind) {
    if (kind === 'explore') return '停止探索';
    if (kind === 'recipe') return '停止制作';
    if (kind === 'fishing') return '停止垂钓';
    return '停止采集';
  }

  function buildSkillActionModal(m) {
    const root = m.root;
    root.innerHTML = '';
    root.addEventListener('click', function (event) {
      if (event.target === root) Ui.closeSkillActionModal();
    });
    const panel = el('div', 'skill-action-sheet', root);
    const close = el('button', 'skill-action-close', panel, '×');
    close.type = 'button';
    close.addEventListener('click', Ui.closeSkillActionModal);
    const head = el('div', 'skill-action-head', panel);
    const icon = el('div', 'skill-action-icon', head);
    const main = el('div', 'skill-action-main', head);
    const titleRow = el('div', 'skill-action-title-row', main);
    const masteryLv = el('span', 'skill-action-mastery-lv', titleRow);
    const badge = el('span', 'skill-action-badge', titleRow);
    const title = el('div', 'skill-action-title', titleRow);
    const rewardRow = el('div', 'skill-action-reward-row', main);
    const masteryXpWrap = el('div', 'skill-action-mastery-xp', rewardRow);
    const masteryXpLabel = el(
      'div',
      'skill-action-mastery-xp-label',
      masteryXpWrap,
      '精通经验'
    );
    const masteryBar = el('div', 'skill-action-mastery-bar', masteryXpWrap);
    const masteryFill = el('div', 'skill-action-mastery-fill', masteryBar);
    const masteryXpText = el('div', 'skill-action-mastery-xp-text', masteryXpWrap);
    const rewardIcons = el('div', 'skill-action-reward-icons', rewardRow);
    const skillReward = el(
      'div',
      'fishing-xp-tile fishing-xp-skill',
      rewardIcons
    );
    el('span', 'fishing-xp-mark', skillReward, 'XP');
    const skillVal = el('span', 'fishing-xp-badge', skillReward);
    const masteryReward = el(
      'div',
      'fishing-xp-tile fishing-xp-mastery',
      rewardIcons
    );
    el('span', 'fishing-xp-mark fishing-xp-trophy', masteryReward, '🏆');
    const masteryVal = el('span', 'fishing-xp-badge', masteryReward);
    const effectsBlock = el('div', 'skill-action-effects', panel);
    const effectsBtn = el(
      'button',
      'skill-action-effects-btn',
      effectsBlock,
      '已激活精通效果'
    );
    effectsBtn.type = 'button';
    effectsBtn.setAttribute('data-skill-effects-trigger', '1');
    effectsBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      Ui.toggleSkillActionEffectsTip(effectsBtn);
    });
    const sectionLabel = el('div', 'skill-action-section', panel, '可能产出');
    const list = el('div', 'skill-action-list', panel);
    const foot = el('div', 'skill-action-foot', panel);
    const remaining = el('div', 'skill-action-remaining', foot);
    const bar = el('div', 'skill-action-bar', foot);
    const barFill = el('div', 'skill-action-bar-fill', bar);
    const stall = el('div', 'skill-action-stall', foot);
    const timeRow = el('div', 'skill-action-time-row', panel);
    el('span', 'skill-action-time-label', timeRow, '消耗时间');
    const timeChip = el('span', 'skill-action-time', timeRow);
    const actionHost = el('div', 'skill-action-btn-wrap', panel);
    m.refs = {
      panel: panel,
      icon: icon,
      masteryLv: masteryLv,
      badge: badge,
      title: title,
      masteryXpWrap: masteryXpWrap,
      masteryXpLabel: masteryXpLabel,
      masteryFill: masteryFill,
      masteryXpText: masteryXpText,
      rewardIcons: rewardIcons,
      skillRewardEl: skillReward,
      skillValEl: skillVal,
      masteryRewardEl: masteryReward,
      masteryValEl: masteryVal,
      effectsBlock: effectsBlock,
      effectsBtn: effectsBtn,
      _activeEffects: [],
      sectionLabel: sectionLabel,
      list: list,
      remaining: remaining,
      bar: bar,
      barFill: barFill,
      stall: stall,
      timeRow: timeRow,
      timeChip: timeChip,
      actionHost: actionHost
    };
  }

  function closeSkillActionModal() {
    const m = Ui.modals.skillAction;
    if (!m || !m.root) return;
    Ui.hideSkillActionEffectsTip();
    m.root.style.display = 'none';
    m.payload = null;
    if (m.built && m.refs && m.refs.actionHost) {
      m.refs.actionHost.innerHTML = '';
      m.refs.actionHost._mode = null;
      m.refs.actionHost._button = null;
      m.refs.actionHost._action = null;
    }
  }

  function openSkillActionModal(payload) {
    const m = Ui.modals.skillAction;
    // 每次打开重建面板，避免迭代改版时沿用旧 DOM/旧列表布局
    buildSkillActionModal(m);
    m.built = true;
    m.payload = payload;
    m.root.style.display = 'flex';
    Ui.updateSkillActionModal();
  }

  function actionMasterySummary(mastery, kind) {
    const src = mastery && typeof mastery === 'object' ? mastery : {};
    const level = Number(src.level);
    const safeLevel = Number.isFinite(level) && level > 0
      ? Math.floor(level)
      : 1;
    const xp = Number(src.xp);
    const nextXp = Number(src.nextXp);
    const safeXp = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
    const safeNext = Number.isFinite(nextXp) && nextXp > 0
      ? Math.floor(nextXp)
      : 0;
    const speedBonus = Number(src.speedBonus);
    const yieldRaw = src.extraYieldChance != null
      ? src.extraYieldChance
      : src.yieldOrRetentionChance;
    const yieldChance = Number(yieldRaw);
    const safeSpeed = Number.isFinite(speedBonus) && speedBonus > 0
      ? speedBonus
      : 0;
    const safeYield = Number.isFinite(yieldChance) && yieldChance > 0
      ? yieldChance
      : 0;
    const junkImmune = kind === 'fishing' &&
      safeLevel >= Ui.FISHING_JUNK_IMMUNITY_MASTERY;
    const activeEffects = [];
    if (safeSpeed > 0) {
      activeEffects.push({
        label: kind === 'fishing' ? '垂钓加速' : '行动加速',
        value: '-' + formatBonusPercent(safeSpeed)
      });
    }
    if (safeYield > 0 && kind !== 'explore') {
      activeEffects.push({
        label: kind === 'recipe'
          ? '材料留存'
          : (kind === 'fishing' ? '双倍鱼' : '双倍产出'),
        value: '+' + formatBonusPercent(safeYield)
      });
    }
    if (junkImmune) {
      activeEffects.push({
        label: '杂物免疫',
        value: '已生效'
      });
    }
    return {
      level: safeLevel,
      xp: safeXp,
      nextXp: safeNext,
      ratio: safeNext > 0 ? Math.min(1, safeXp / safeNext) : 1,
      speedBonus: safeSpeed,
      yieldChance: safeYield,
      junkImmune: junkImmune,
      activeEffects: activeEffects
    };
  }

  function renderSkillActionEffects(host, effects) {
    if (!host) return;
    host.innerHTML = '';
    if (!effects || !effects.length) {
      el('div', 'skill-action-effects-empty', host, '当前暂无已激活效果');
      return;
    }
    effects.forEach(function (effect) {
      const row = el('div', 'skill-action-effect-row', host);
      el('div', 'skill-action-effect-label', row, effect.label || '');
      el('div', 'skill-action-effect-value', row, effect.value || '');
    });
  }

  function ensureSkillActionEffectsTip() {
    if (Ui.skillActionEffectsTip.built) return Ui.skillActionEffectsTip;
    const host = Ui.root || document.body || null;
    const rootEl = el('div', 'item-tip skill-action-effects-tip', host);
    rootEl.style.display = 'none';
    const title = el(
      'div',
      'skill-action-effects-tip-title',
      rootEl,
      '已激活精通效果'
    );
    const list = el('div', 'skill-action-effects-list', rootEl);
    Ui.skillActionEffectsTip = {
      built: true,
      root: rootEl,
      refs: { title: title, list: list },
      open: false
    };
    document.addEventListener('click', function (event) {
      if (!Ui.skillActionEffectsTip.open) return;
      const target = event.target;
      if (Ui.skillActionEffectsTip.root &&
          Ui.skillActionEffectsTip.root.contains &&
          Ui.skillActionEffectsTip.root.contains(target)) {
        return;
      }
      if (target && target.closest &&
          target.closest('[data-skill-effects-trigger="1"]')) {
        return;
      }
      Ui.hideSkillActionEffectsTip();
    });
    return Ui.skillActionEffectsTip;
  }

  function showSkillActionEffectsTip(effects, anchorElement) {
    const tip = ensureSkillActionEffectsTip();
    renderSkillActionEffects(tip.refs.list, effects || []);
    tip.root.style.display = 'block';
    tip.open = true;
    Ui.positionItemTip(tip.root, anchorElement);
  }

  function hideSkillActionEffectsTip() {
    if (!Ui.skillActionEffectsTip || !Ui.skillActionEffectsTip.root) return;
    Ui.skillActionEffectsTip.root.style.display = 'none';
    Ui.skillActionEffectsTip.open = false;
  }

  function toggleSkillActionEffectsTip(anchorElement) {
    if (Ui.skillActionEffectsTip.open) {
      hideSkillActionEffectsTip();
      return;
    }
    const m = Ui.modals.skillAction;
    const effects = m && m.refs && m.refs._activeEffects
      ? m.refs._activeEffects
      : [];
    showSkillActionEffectsTip(effects, anchorElement);
  }

  function renderSkillActionList(host, rows, emptyText, layout) {
    host.innerHTML = '';
    const isGrid = layout === 'grid';
    host.className = isGrid
      ? 'skill-action-list skill-action-discover-grid'
      : 'skill-action-list';
    if (!rows || !rows.length) {
      el('div', 'skill-action-empty', host, emptyText || '暂无');
      return;
    }
    if (isGrid) {
      rows.forEach(function (row) {
        const unlocked = row.unlocked !== false;
        const cell = el(
          'div',
          'skill-action-discover-cell' + (unlocked ? '' : ' is-locked'),
          host
        );
        const icon = el('div', 'skill-action-discover-icon', cell);
        setTileIcon(
          icon,
          row.iconItem || row,
          (row.name || '·').charAt(0)
        );
        const level = Number(row.unlockLevel);
        const levelText = Number.isFinite(level) && level > 0
          ? ('Lv.' + Math.floor(level))
          : '';
        el('div', 'skill-action-discover-lv', cell, levelText);
        const tipSource = row.iconItem || {
          itemId: row.itemId,
          name: row.name
        };
        if (tipSource && (tipSource.itemId || tipSource.name)) {
          Ui.attachItemTipTrigger(cell, tipSource);
        }
        cell.title = (row.name || row.itemId || '条目') +
          (levelText ? (' · ' + levelText) : '') +
          (unlocked ? '' : ' · 未解锁');
      });
      return;
    }
    rows.forEach(function (row) {
      const line = el('div', 'skill-action-row', host);
      const icon = el('div', 'skill-action-row-icon', line);
      setTileIcon(
        icon,
        row.iconItem || row,
        (row.name || '·').charAt(0)
      );
      el(
        'div',
        'skill-action-row-text',
        line,
        (row.name || row.itemId || '物品') +
          (row.quantity != null ? (' ×' + row.quantity) : '')
      );
      el(
        'div',
        'skill-action-row-chance',
        line,
        row.chanceText
          ? '(' + row.chanceText + ')'
          : (row.stockText ? '(' + row.stockText + ')' : '')
      );
    });
  }

  function skillActionPayloadFromGather(info, kind, id) {
    if (kind === 'explore' && info.explore) {
      const discoverable = Array.isArray(info.explore.discoverable)
        ? info.explore.discoverable
        : [];
      const listRows = discoverable.map(function (row) {
        return {
          itemId: row.itemId,
          name: row.name,
          quantity: 1,
          unlocked: !!row.unlocked,
          unlockLevel: row.unlockLevel,
          chanceText: row.unlocked
            ? ('可发现 · Lv.' + row.unlockLevel)
            : ('需 Lv.' + row.unlockLevel),
          iconItem: row.iconItem || null
        };
      });
      const maxCapacity = Number(info.explore.maxCapacity) || 0;
      return {
        kind: 'explore',
        id: 'explore',
        nav: info.title,
        skillId: info.skillId,
        actionKey: info.explore.actionKey,
        name: info.explore.name,
        badge: '探索',
        badgeClass: 'badge-explore',
        durationSeconds: info.explore.durationSeconds,
        skillXp: info.explore.skillXp,
        masteryXp: info.explore.masteryXp || 0,
        mastery: info.explore.mastery || null,
        active: info.explore.active,
        stalled: info.explore.stalled,
        progress: info.explore.progress,
        iconItem: null,
        iconFallback: Ui.SKILL_TILE_GLYPHS[info.skillId] || '探',
        listTitle: '可能发现',
        listLayout: 'grid',
        listRows: listRows,
        remainingText: maxCapacity > 0
          ? ('单点储量上限 ' + maxCapacity)
          : '',
        remainingRatio: 0,
        locked: false,
        startLabel: skillActionStartLabel('explore'),
        stopLabel: skillActionStopLabel('explore')
      };
    }
    if (kind === 'resource') {
      const list = Array.isArray(info.resources) && info.resources.length
        ? info.resources
        : (info.resource ? [info.resource] : []);
      const resource = list.find(function (row) {
        return row.instanceId === id ||
          row.entryId === id ||
          (row.entryId || row.instanceId) === id;
      }) || null;
      if (!resource) return null;
      const drop0 = resource.drops && resource.drops[0];
      const ratio = resource.capacity > 0
        ? resource.remaining / resource.capacity
        : 0;
      const depleted = !(Number(resource.remaining) > 0);
      return {
        kind: 'resource',
        id: resource.instanceId || resource.entryId,
        nav: info.title,
        skillId: info.skillId,
        actionKey: resource.actionKey,
        name: resource.name,
        badge: '采',
        badgeClass: 'badge-gather',
        durationSeconds: resource.durationSeconds,
        skillXp: resource.skillXp,
        masteryXp: fishingExpectedMasteryXp(resource.skillXp),
        mastery: resource.mastery || null,
        active: resource.active,
        stalled: resource.stalled,
        progress: resource.progress,
        iconItem: drop0,
        iconFallback: (resource.name || '材').charAt(0),
        listTitle: '可能产出',
        listRows: dropsWithChance(resource.drops),
        remainingText: depleted
          ? ('已采尽 · 剩余 0 / ' + resource.capacity +
            '（可再次探索补充）')
          : ('剩余 ' + resource.remaining + ' / ' + resource.capacity),
        remainingRatio: ratio,
        locked: depleted,
        startLabel: skillActionStartLabel('resource'),
        stopLabel: skillActionStopLabel('resource')
      };
    }
    if (kind === 'fishing') {
      const spot = (info.spots || []).find(function (row) {
        return row.spotId === id;
      });
      if (!spot) return null;
      const first = spot.species && spot.species[0];
      const totalStock = (spot.species || []).reduce(function (sum, s) {
        return sum + (Number(s.stock) || 0);
      }, 0);
      const totalMax = (spot.species || []).reduce(function (sum, s) {
        return sum + (Number(s.maxStock) || 0);
      }, 0);
      const speciesRows = (spot.species || []).map(function (s) {
        return {
          itemId: s.speciesId,
          name: s.name,
          weight: s.weight,
          quantity: s.quantity,
          stockText: s.stock + '/' + s.maxStock,
          chanceText: s.stock + '/' + s.maxStock
        };
      });
      return {
        kind: 'fishing',
        id: spot.spotId,
        nav: info.title,
        skillId: info.skillId,
        actionKey: spot.actionKey,
        name: spot.name,
        badge: spot.unlocked ? '钓' : '锁',
        badgeClass: spot.unlocked ? 'badge-fish' : 'badge-lock',
        durationSeconds: spot.durationSeconds,
        skillXp: spot.skillXp,
        masteryXp: fishingExpectedMasteryXp(spot.skillXp),
        mastery: spot.mastery || null,
        active: spot.active,
        stalled: spot.stalled,
        progress: spot.progress,
        iconItem: first
          ? { itemId: first.speciesId, name: first.name }
          : null,
        iconFallback: (spot.name || '鱼').charAt(0),
        listTitle: '鱼群存栏',
        listRows: speciesRows,
        remainingText: spot.unlocked
          ? '存栏 ' + totalStock + ' / ' + totalMax
          : '需 Lv.' + spot.unlockLevel + ' 解锁',
        remainingRatio: totalMax > 0 ? totalStock / totalMax : 0,
        locked: !spot.unlocked,
        startLabel: skillActionStartLabel('fishing'),
        stopLabel: skillActionStopLabel('fishing')
      };
    }
    return null;
  }

  function skillActionPayloadFromProduction(info, recipeId) {
    const recipe = (info.recipes || []).find(function (row) {
      return row.recipeId === recipeId;
    });
    if (!recipe) return null;
    const costRows = [];
    (recipe.costs || []).forEach(function (cost) {
      costRows.push({
        itemId: cost.itemId,
        name: cost.name,
        quantity: cost.required,
        chanceText: cost.owned + '/' + cost.required
      });
    });
    (recipe.choiceCosts || []).forEach(function (choice) {
      (choice.options || []).forEach(function (cost) {
        costRows.push({
          itemId: cost.itemId,
          name: cost.name,
          quantity: cost.required,
          chanceText: cost.owned + '/' + cost.required
        });
      });
    });
    if (recipe.output) {
      costRows.push({
        itemId: recipe.output.itemId,
        name: '产出 ' + recipe.output.name,
        quantity: recipe.output.quantity,
        chanceText: ''
      });
    }
    return {
      kind: 'recipe',
      id: recipe.recipeId,
      nav: info.title,
      skillId: info.skillId,
      actionKey: recipe.actionKey,
      name: recipe.name,
      badge: recipe.unlocked ? '制' : '锁',
      badgeClass: recipe.unlocked ? 'badge-craft' : 'badge-lock',
      durationSeconds: recipe.durationSeconds,
      skillXp: recipe.skillXp,
      masteryXp: recipe.masteryXp || 0,
      mastery: recipe.mastery || null,
      active: recipe.active,
      stalled: recipe.stalled,
      progress: recipe.progress,
      iconItem: recipe.output,
      iconFallback: (recipe.name || '丹').charAt(0),
      listTitle: '材料与产出',
      listRows: costRows,
      remainingText: recipe.unlocked
        ? (Ui.recipeNeedsMaterials(recipe) ? '材料不足' : '')
        : '需 Lv.' + recipe.unlockLevel + ' 解锁',
      remainingRatio: recipe.active ? recipe.progress : 0,
      locked: !recipe.unlocked,
      startLabel: skillActionStartLabel('recipe'),
      stopLabel: skillActionStopLabel('recipe')
    };
  }

  function updateSkillActionModal() {
    const m = Ui.modals.skillAction;
    if (!m || !m.built || !m.payload || m.root.style.display === 'none') {
      return;
    }
    const payload = m.payload;
    const nav = payload.nav;
    let next = null;
    if (payload.kind === 'recipe') {
      const info = api().queries.skillPage(nav);
      if (info) next = skillActionPayloadFromProduction(info, payload.id);
    } else {
      const info = api().queries.gatherPage(nav);
      if (info) {
        next = skillActionPayloadFromGather(info, payload.kind, payload.id);
      }
    }
    if (!next) {
      closeSkillActionModal();
      return;
    }
    m.payload = next;
    const r = m.refs;
    const summary = actionMasterySummary(next.mastery, next.kind);
    const hasMastery = !!next.mastery;
    setTileIcon(r.icon, next.iconItem, next.iconFallback);
    if (r.masteryLv) {
      if (hasMastery) {
        r.masteryLv.hidden = false;
        r.masteryLv.textContent = '精通 Lv.' + summary.level;
      } else {
        r.masteryLv.hidden = true;
        r.masteryLv.textContent = '';
      }
    }
    r.badge.textContent = next.badge;
    r.badge.className = 'skill-action-badge ' + (next.badgeClass || '');
    r.title.textContent = next.name;
    if (r.masteryXpWrap) {
      if (hasMastery) {
        r.masteryXpWrap.hidden = false;
        if (r.masteryFill) {
          r.masteryFill.style.width = percent(summary.ratio) + '%';
        }
        if (r.masteryXpText) {
          r.masteryXpText.textContent = summary.nextXp > 0
            ? summary.xp + ' / ' + summary.nextXp
            : '已满级';
        }
      } else {
        r.masteryXpWrap.hidden = true;
      }
    }
    if (r.rewardIcons) r.rewardIcons.hidden = false;
    const skillXp = Number(next.skillXp) || 0;
    const masteryXp = Number(next.masteryXp) || 0;
    if (r.skillValEl) r.skillValEl.textContent = String(skillXp);
    if (r.masteryValEl) {
      r.masteryValEl.textContent = String(masteryXp);
      if (r.masteryRewardEl) {
        r.masteryRewardEl.style.display = masteryXp > 0 ? '' : 'none';
      }
    }
    if (r.skillRewardEl) r.skillRewardEl.title = '技能经验 +' + skillXp;
    if (r.masteryRewardEl) {
      r.masteryRewardEl.title = '精通经验 +' + masteryXp;
    }
    if (r.effectsBlock) {
      r._activeEffects = hasMastery ? summary.activeEffects.slice() : [];
      if (hasMastery) {
        r.effectsBlock.hidden = false;
        if (Ui.skillActionEffectsTip.open && r.effectsBtn) {
          showSkillActionEffectsTip(r._activeEffects, r.effectsBtn);
        }
      } else {
        r.effectsBlock.hidden = true;
        hideSkillActionEffectsTip();
      }
    }
    if (next.listTitle) {
      r.sectionLabel.style.display = '';
      r.sectionLabel.textContent = next.listTitle;
      r.list.style.display = '';
      renderSkillActionList(
        r.list,
        next.listRows,
        '暂无条目',
        next.kind === 'explore' || next.listLayout === 'grid'
          ? 'grid'
          : next.listLayout
      );
    } else {
      r.sectionLabel.style.display = 'none';
      r.list.style.display = 'none';
      r.list.innerHTML = '';
    }
    if (next.remainingText) {
      r.remaining.style.display = '';
      r.remaining.textContent = next.remainingText;
    } else {
      r.remaining.style.display = 'none';
      r.remaining.textContent = '';
    }
    r.barFill.style.width = percent(next.remainingRatio || 0) + '%';
    r.stall.textContent = next.stalled ? '行动停滞' : '';
    if (r.timeChip) {
      r.timeChip.textContent = formatSkillSeconds(next.durationSeconds);
    }
    r.actionHost._onStart = function () {
      closeSkillActionModal();
    };
    r.actionHost._onStop = null;
    updateActionControl(r.actionHost, {
      actionKey: next.actionKey,
      active: next.active,
      startLabel: next.startLabel,
      stopLabel: next.stopLabel
    }, next.locked);
    if (r.actionHost._button) {
      r.actionHost._button.className =
        'skill-action-btn card-action ' +
        (next.active ? 'action-stop' : 'action-start');
    }
  }

  function contentKeyForNav(navName) {
    if (navName === '洞府') return 'home';
    if (navName === '背包') return 'inventory';
    if (navName === '事件') return 'events';
    if (navName === '关系') return 'relationship';
    if (navName === '宗门') return 'sects';
    if (navName === '天下') return 'world';
    if (navName === '战斗') return 'combat';
    if (navName === '装备') return 'equipment';
    if (Ui.GATHER_NAV.indexOf(navName) >= 0) return 'gather:' + navName;
    if (Ui.PRODUCTION_NAV.indexOf(navName) >= 0) return 'production:' + navName;
    return 'placeholder:' + navName;
  }

  function discardContentPage(key) {
    if (!key || !Ui.contentState.pages) return;
    const page = Ui.contentState.pages[key];
    if (!page) return;
    const host = page.host;
    const parent = host && (host.parentNode || host.parent);
    if (host && parent && typeof parent.removeChild === 'function') {
      parent.removeChild(host);
    }
    delete Ui.contentState.pages[key];
    delete Ui.contentLiveAt[key];
    if (Ui.contentState.key === key) {
      Ui.contentState.key = null;
      Ui.contentState.refs = {};
    }
  }

  function syncContentShellClass(key) {
    if (!Ui.shell.content) return;
    Ui.shell.content.className = key === 'inventory'
      ? 'content inventory-page'
      : 'content';
  }

  function liveThrottleMs(key) {
    if (key === 'combat') {
      // 进行中战斗要跟手；列表页不必每帧重查 loadouts。
      const battle = Ui.contentState.refs && Ui.contentState.refs.battle;
      return battle ? 0 : 120;
    }
    if (key === 'home') return 100;
    if (key === 'sects') return 0; // liveSects 内部已节流
    if (key === 'inventory' || key === 'equipment') return 700;
    if (key === 'events' || key === 'world' || key === 'relationship') {
      return 200;
    }
    if (key.indexOf('production:') === 0 || key.indexOf('gather:') === 0) {
      return 120;
    }
    return 150;
  }

  function updateContent() {
    const a = api(); if (!a) return;
    const navigation = a.queries.navigation();
    const active = navigation.items[navigation.activeIndex];
    const navName = active ? active.label : '洞府';
    const key = contentKeyForNav(navName);
    if ((key === 'combat' || key === 'equipment') &&
        typeof LazyContent !== 'undefined' &&
        LazyContent &&
        typeof LazyContent.ensureCombatRuntime === 'function' &&
        !Ui.__combatRuntimeReady) {
      if (!Ui.__combatRuntimeLoading) {
        Ui.__combatRuntimeLoading = true;
        LazyContent.ensureCombatRuntime().then(function () {
          Ui.__combatRuntimeReady = true;
          Ui.__combatRuntimeLoading = false;
          Ui.contentLiveAt[key] = 0;
        }, function () {
          Ui.__combatRuntimeLoading = false;
        });
      }
    }
    const switched = key !== Ui.contentState.key;
    if (switched) {
      Ui.ensureContentPage(navName, key, false);
    }
    const throttle = liveThrottleMs(key);
    const now = Date.now();
    if (!switched && throttle > 0 &&
        Ui.contentLiveAt[key] && (now - Ui.contentLiveAt[key]) < throttle) {
      return;
    }
    Ui.contentLiveAt[key] = now;
    var page = Ui.getPage(key);
    if (page && typeof page.live === 'function') {
      page.live(navName);
      return;
    }
    if (key.indexOf('production:') === 0 && Ui.liveProduction) Ui.liveProduction(navName);
    else if (key.indexOf('gather:') === 0 && Ui.liveGather) Ui.liveGather(navName);
  }

  function snapshotSkillActionModal() {
    const m = Ui.modals.skillAction;
    if (!m || !m.root || m.root.style.display === 'none' || !m.payload) {
      return null;
    }
    return {
      kind: m.payload.kind,
      id: m.payload.id,
      nav: m.payload.nav
    };
  }

  function restoreSkillActionModal(snapshot) {
    if (!snapshot) return;
    openSkillActionModal(snapshot);
    const m = Ui.modals.skillAction;
    if (m && m.root && m.root.style.display !== 'none') return;
    if (snapshot.kind !== 'resource') return;
    if (Ui.GATHER_NAV.indexOf(snapshot.nav) < 0) return;
    const info = api().queries.gatherPage(snapshot.nav);
    if (!info || !info.resource) return;
    openSkillActionModal({
      kind: 'resource',
      id: info.resource.instanceId || info.resource.entryId,
      nav: snapshot.nav
    });
  }

  function buildContentInto(navName, host) {
    var key = contentKeyForNav(navName);
    var page = Ui.getPage(key);
    if (page && typeof page.build === 'function') {
      page.build(navName, host);
      return;
    }
    if (Ui.GATHER_NAV.indexOf(navName) >= 0 && Ui.buildGather) {
      Ui.buildGather(navName, host);
      return;
    }
    if (Ui.PRODUCTION_NAV.indexOf(navName) >= 0 && Ui.buildProduction) {
      Ui.buildProduction(navName, host);
      return;
    }
    if (Ui.buildPlaceholder) Ui.buildPlaceholder(navName, host);
    else el('div', 'placeholder', host, '（该功能暂未开放）');
  }

  function ensureContentPage(navName, key, forceRebuild) {
    Ui.hideItemTip();
    Ui.hideEquipmentTip();
    hideSkillActionEffectsTip();
    const skillActionSnapshot = snapshotSkillActionModal();
    const keepSkillAction = !!(
      skillActionSnapshot &&
      skillActionSnapshot.nav === navName
    );
    closeSkillActionModal();
    closeSkillMasteryUnlocksModal();
    if (navName !== '战斗') {
      Ui.closeEnemyDetailModal();
      Ui.closeRegionDetailModal();
      Ui.closeDungeonDetailModal();
    }
    if (forceRebuild) discardContentPage(key);
    const pages = Ui.contentState.pages;
    Object.keys(pages).forEach(function (pageKey) {
      const page = pages[pageKey];
      if (page && page.host) page.host.style.display = 'none';
    });
    let page = pages[key];
    if (!page) {
      const host = el('div', 'content-page', Ui.shell.content);
      Ui.contentState.refs = {};
      buildContentInto(navName, host);
      page = { host: host, refs: Ui.contentState.refs };
      pages[key] = page;
    } else {
      Ui.contentState.refs = page.refs;
    }
    page.host.style.display = '';
    syncContentShellClass(key);
    Ui.contentState.key = key;
    delete Ui.contentLiveAt[key];
    if (keepSkillAction) restoreSkillActionModal(skillActionSnapshot);
  }

  function rebuildContent(navName) {
    const key = contentKeyForNav(navName);
    ensureContentPage(navName, key, true);
  }


  Ui.api = api;
  Ui.el = el;
  Ui.fmtDur = fmtDur;
  Ui.buildShell = buildShell;
  Ui.showShell = showShell;
  Ui.hideShell = hideShell;
  Ui.refreshAvatar = refreshAvatar;
  Ui.updatePersistenceStatus = updatePersistenceStatus;
  Ui.updateTopbar = updateTopbar;
  Ui.updateActionBar = updateActionBar;
  Ui.updateNavActive = updateNavActive;
  Ui.percent = percent;
  Ui.percentText = percentText;
  Ui.invokeCommand = invokeCommand;
  Ui.safeQuery = safeQuery;
  Ui.buildSkillHead = buildSkillHead;
  Ui.updateSkillHead = updateSkillHead;
  Ui.skillMasteryUnlockKind = skillMasteryUnlockKind;
  Ui.skillMasteryUnlockRows = skillMasteryUnlockRows;
  Ui.closeSkillMasteryUnlocksModal = closeSkillMasteryUnlocksModal;
  Ui.buildSkillMasteryUnlocksModal = buildSkillMasteryUnlocksModal;
  Ui.openSkillMasteryUnlocksModal = openSkillMasteryUnlocksModal;
  Ui.updateSkillMasteryUnlocksModal = updateSkillMasteryUnlocksModal;
  Ui.addProgress = addProgress;
  Ui.updateProgress = updateProgress;
  Ui.updateActionControl = updateActionControl;
  Ui.setTileIcon = setTileIcon;
  Ui.formatSkillSeconds = formatSkillSeconds;
  Ui.weightedChanceText = weightedChanceText;
  Ui.dropsWithChance = dropsWithChance;
  Ui.createMinimalSkillTile = createMinimalSkillTile;
  Ui.createSkillActionTile = createSkillActionTile;
  Ui.createFishingSpotTile = createFishingSpotTile;
  Ui.fishingExpectedMasteryXp = fishingExpectedMasteryXp;
  Ui.formatBonusPercent = formatBonusPercent;
  Ui.fishingMasterySummary = fishingMasterySummary;
  Ui.updateSkillActionTileMeta = updateSkillActionTileMeta;
  Ui.updateSkillActionTileCountBadge = updateSkillActionTileCountBadge;
  Ui.updateSkillActionTileRewards = updateSkillActionTileRewards;
  Ui.updateSkillActionTileProgress = updateSkillActionTileProgress;
  Ui.updateFishingRewardIcons = updateFishingRewardIcons;
  Ui.wireSkillTileOpen = wireSkillTileOpen;
  Ui.skillActionStartLabel = skillActionStartLabel;
  Ui.skillActionStopLabel = skillActionStopLabel;
  Ui.buildSkillActionModal = buildSkillActionModal;
  Ui.closeSkillActionModal = closeSkillActionModal;
  Ui.openSkillActionModal = openSkillActionModal;
  Ui.actionMasterySummary = actionMasterySummary;
  Ui.renderSkillActionEffects = renderSkillActionEffects;
  Ui.ensureSkillActionEffectsTip = ensureSkillActionEffectsTip;
  Ui.showSkillActionEffectsTip = showSkillActionEffectsTip;
  Ui.hideSkillActionEffectsTip = hideSkillActionEffectsTip;
  Ui.toggleSkillActionEffectsTip = toggleSkillActionEffectsTip;
  Ui.renderSkillActionList = renderSkillActionList;
  Ui.skillActionPayloadFromGather = skillActionPayloadFromGather;
  Ui.skillActionPayloadFromProduction = skillActionPayloadFromProduction;
  Ui.updateSkillActionModal = updateSkillActionModal;
  Ui.contentKeyForNav = contentKeyForNav;
  Ui.discardContentPage = discardContentPage;
  Ui.syncContentShellClass = syncContentShellClass;
  Ui.liveThrottleMs = liveThrottleMs;
  Ui.updateContent = updateContent;
  Ui.snapshotSkillActionModal = snapshotSkillActionModal;
  Ui.restoreSkillActionModal = restoreSkillActionModal;
  Ui.buildContentInto = buildContentInto;
  Ui.ensureContentPage = ensureContentPage;
  Ui.rebuildContent = rebuildContent;
})();
